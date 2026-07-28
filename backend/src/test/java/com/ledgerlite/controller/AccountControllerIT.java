package com.ledgerlite.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerlite.AbstractIntegrationTest;
import com.ledgerlite.domain.Account;
import com.ledgerlite.domain.AccountType;
import com.ledgerlite.domain.LedgerEntry;
import com.ledgerlite.domain.Role;
import com.ledgerlite.domain.Transaction;
import com.ledgerlite.domain.User;
import com.ledgerlite.dto.CreateAccountRequest;
import com.ledgerlite.dto.LoginRequest;
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

class AccountControllerIT extends AbstractIntegrationTest {

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
    private User customer;

    @BeforeEach
    void seed() {
        teller = userRepository.findByUsername("teller1")
                .orElseGet(() -> userRepository.save(User.newUser(
                        "teller1", "teller1@ledgerlite.local", passwordEncoder.encode("Password123!"), Role.TELLER)));
        customer = userRepository.findByUsername("customer1")
                .orElseGet(() -> userRepository.save(User.newUser(
                        "customer1", "customer1@ledgerlite.local", passwordEncoder.encode("Password123!"), Role.CUSTOMER)));
    }

    @Test
    void tellerCanCreateAccountAndBalanceStartsAtZero() throws Exception {
        String token = accessTokenFor("teller1", "Password123!");

        mockMvc.perform(post("/accounts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CreateAccountRequest(customer.id(), AccountType.CHECKING, "USD"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accountNumber").isNotEmpty())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.balanceMinorUnits").value(0));
    }

    @Test
    void customerCannotCreateAccount() throws Exception {
        String token = accessTokenFor("customer1", "Password123!");

        mockMvc.perform(post("/accounts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CreateAccountRequest(customer.id(), AccountType.CHECKING, "USD"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void balanceIsDerivedFromLedgerEntriesNotStored() throws Exception {
        Account account = accountRepository.save(
                Account.newAccount("999900001111", customer.id(), AccountType.CHECKING, "USD"));
        Transaction transaction = transactionRepository.save(Transaction.newTransaction("seed", teller.id()));
        ledgerEntryRepository.save(LedgerEntry.credit(transaction.id(), account.id(), 10_000));
        ledgerEntryRepository.save(LedgerEntry.debit(transaction.id(), account.id(), 2_500));

        String token = accessTokenFor("teller1", "Password123!");

        mockMvc.perform(get("/accounts/" + account.id()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balanceMinorUnits").value(7_500));

        mockMvc.perform(get("/ledger/" + account.id()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void customerCanReadOwnAccountButNotOthers() throws Exception {
        Account own = accountRepository.save(
                Account.newAccount("999900002222", customer.id(), AccountType.SAVINGS, "USD"));
        Account other = accountRepository.save(
                Account.newAccount("999900003333", teller.id(), AccountType.SAVINGS, "USD"));

        String token = accessTokenFor("customer1", "Password123!");

        mockMvc.perform(get("/accounts/" + own.id()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/accounts/" + other.id()).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
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
