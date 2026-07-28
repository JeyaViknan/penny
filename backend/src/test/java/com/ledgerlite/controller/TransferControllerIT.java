package com.ledgerlite.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerlite.AbstractIntegrationTest;
import com.ledgerlite.domain.Account;
import com.ledgerlite.domain.AccountStatus;
import com.ledgerlite.domain.AccountType;
import com.ledgerlite.domain.EntryType;
import com.ledgerlite.domain.LedgerEntry;
import com.ledgerlite.domain.Role;
import com.ledgerlite.domain.Transaction;
import com.ledgerlite.domain.User;
import com.ledgerlite.dto.LoginRequest;
import com.ledgerlite.dto.TransferRequest;
import com.ledgerlite.repository.AccountRepository;
import com.ledgerlite.repository.LedgerEntryRepository;
import com.ledgerlite.repository.TransactionRepository;
import com.ledgerlite.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

class TransferControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private ObjectMapper objectMapper;

    private User teller;
    private User owner;

    @BeforeEach
    void seed() {
        teller = userRepository.findByUsername("xfer-teller")
                .orElseGet(() -> userRepository.save(User.newUser(
                        "xfer-teller", "xfer-teller@ledgerlite.local", passwordEncoder.encode("Password123!"), Role.TELLER)));
        owner = userRepository.findByUsername("xfer-owner")
                .orElseGet(() -> userRepository.save(User.newUser(
                        "xfer-owner", "xfer-owner@ledgerlite.local", passwordEncoder.encode("Password123!"), Role.CUSTOMER)));
    }

    @Test
    void transferPostsBalancedDebitAndCreditAndUpdatesDerivedBalances() throws Exception {
        Account source = fundedAccount(20_000);
        Account destination = openAccount(0);
        String token = accessTokenFor("xfer-teller", "Password123!");

        var request = new TransferRequest(source.id(), destination.id(), 5_000L, "rent");

        var result = mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amountMinorUnits").value(5_000))
                .andReturn();

        long transactionId = objectMapper.readTree(result.getResponse().getContentAsString()).get("transactionId").asLong();
        var entries = ledgerEntryRepository.findByTransactionId(transactionId);
        assertThat(entries).hasSize(2);
        long totalDebits = entries.stream().filter(e -> e.entryType() == EntryType.DEBIT).mapToLong(LedgerEntry::amountMinorUnits).sum();
        long totalCredits = entries.stream().filter(e -> e.entryType() == EntryType.CREDIT).mapToLong(LedgerEntry::amountMinorUnits).sum();
        assertThat(totalDebits).isEqualTo(totalCredits).isEqualTo(5_000);

        mockMvc.perform(get("/accounts/" + source.id()).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.balanceMinorUnits").value(15_000));
        mockMvc.perform(get("/accounts/" + destination.id()).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.balanceMinorUnits").value(5_000));
    }

    @Test
    void transferWithInsufficientBalanceIsRejected() throws Exception {
        Account source = fundedAccount(1_000);
        Account destination = openAccount(0);
        String token = accessTokenFor("xfer-teller", "Password123!");

        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TransferRequest(source.id(), destination.id(), 5_000L, "too much"))))
                .andExpect(status().isUnprocessableEntity());

        assertThat(ledgerEntryRepository.findByAccountIdOrderByCreatedAtDesc(destination.id())).isEmpty();
    }

    @Test
    void transferToSameAccountIsRejected() throws Exception {
        Account account = fundedAccount(10_000);
        String token = accessTokenFor("xfer-teller", "Password123!");

        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TransferRequest(account.id(), account.id(), 100L, "self"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void transferInvolvingInactiveAccountIsRejected() throws Exception {
        Account source = fundedAccount(10_000);
        Account destination = accountRepository.save(new Account(null, "999900009999", owner.id(),
                AccountType.CHECKING, AccountStatus.CLOSED, "USD", java.time.Instant.now()));
        String token = accessTokenFor("xfer-teller", "Password123!");

        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TransferRequest(source.id(), destination.id(), 100L, "closed dest"))))
                .andExpect(status().isConflict());
    }

    @Test
    void negativeAmountFailsValidationBeforeReachingTheService() throws Exception {
        Account source = fundedAccount(10_000);
        Account destination = openAccount(0);
        String token = accessTokenFor("xfer-teller", "Password123!");

        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TransferRequest(source.id(), destination.id(), -100L, "negative"))))
                .andExpect(status().isBadRequest());
    }

    private Account fundedAccount(long openingBalanceMinorUnits) {
        Account account = openAccount(0);
        if (openingBalanceMinorUnits > 0) {
            Transaction seedTx = transactionRepository.save(Transaction.newTransaction("opening balance", teller.id()));
            ledgerEntryRepository.save(LedgerEntry.credit(seedTx.id(), account.id(), openingBalanceMinorUnits));
        }
        return account;
    }

    private Account openAccount(long unusedOpeningBalance) {
        String accountNumber = "TX" + System.nanoTime();
        return accountRepository.save(Account.newAccount(accountNumber.substring(0, 12), owner.id(), AccountType.CHECKING, "USD"));
    }

    private String accessTokenFor(String username, String password) throws Exception {
        var result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(username, password))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }
}
