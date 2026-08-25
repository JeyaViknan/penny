package com.penny.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.penny.AbstractIntegrationTest;
import com.penny.domain.Account;
import com.penny.domain.AccountStatus;
import com.penny.domain.EntryType;
import com.penny.domain.LedgerEntry;
import com.penny.domain.Role;
import com.penny.domain.User;
import com.penny.dto.LoginRequest;
import com.penny.dto.TransferRequest;
import com.penny.support.LedgerFixture;
import com.penny.repository.AccountRepository;
import com.penny.repository.LedgerEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

class TransferControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private LedgerFixture fixture;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;
    @Autowired
    private ObjectMapper objectMapper;

    private User teller;
    private User owner;

    @BeforeEach
    void seed() {
        teller = fixture.user("xfer-teller", Role.TELLER);
        owner = fixture.user("xfer-owner", Role.CUSTOMER);
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
        Account destination = accountRepository.save(
                fixture.account(owner.id()).withStatus(AccountStatus.CLOSED));
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
        return fixture.fundedAccount(owner.id(), openingBalanceMinorUnits);
    }

    private Account openAccount(long unusedOpeningBalance) {
        return fixture.account(owner.id());
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
