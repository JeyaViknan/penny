package com.penny.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.penny.AbstractIntegrationTest;
import com.penny.domain.Account;
import com.penny.domain.Role;
import com.penny.domain.User;
import com.penny.dto.LoginRequest;
import com.penny.support.LedgerFixture;
import com.penny.dto.TransferRequest;
import com.penny.repository.LedgerEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Proves the Idempotency-Key contract: replaying the same key + payload
 * returns the original response without moving money twice; reusing the
 * key with a different payload is rejected outright.
 */
class IdempotencyIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private LedgerFixture fixture;
    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;
    @Autowired
    private ObjectMapper objectMapper;

    private User teller;
    private User owner;

    @BeforeEach
    void seed() {
        teller = fixture.user("idem-teller", Role.TELLER);
        owner = fixture.user("idem-owner", Role.CUSTOMER);
    }

    @Test
    void repeatingSameKeyAndPayloadReplaysOriginalResponseWithoutMovingMoneyTwice() throws Exception {
        Account source = fundedAccount(10_000);
        Account destination = openAccount();
        String token = accessTokenFor("idem-teller", "Password123!");
        var request = new TransferRequest(source.id(), destination.id(), 2_000L, "rent");
        String key = "idem-key-" + System.nanoTime();

        String firstBody = mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String secondBody = mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        assertThat(secondBody).isEqualTo(firstBody);

        long transactionId = objectMapper.readTree(firstBody).get("transactionId").asLong();
        assertThat(ledgerEntryRepository.findByTransactionId(transactionId)).hasSize(2);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/accounts/" + destination.id())
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.balanceMinorUnits").value(2_000)); // not 4_000 -- posted once, not twice
    }

    @Test
    void reusingKeyWithDifferentPayloadIsRejected() throws Exception {
        Account source = fundedAccount(10_000);
        Account destination = openAccount();
        String token = accessTokenFor("idem-teller", "Password123!");
        String key = "idem-conflict-" + System.nanoTime();

        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TransferRequest(source.id(), destination.id(), 1_000L, "first"))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TransferRequest(source.id(), destination.id(), 9_999L, "different payload"))))
                .andExpect(status().isConflict());
    }

    @Test
    void failedTransferReleasesTheKeyForRetry() throws Exception {
        Account source = fundedAccount(500); // too little for the requested amount
        Account destination = openAccount();
        String token = accessTokenFor("idem-teller", "Password123!");
        String key = "idem-retry-" + System.nanoTime();
        var tooMuch = new TransferRequest(source.id(), destination.id(), 5_000L, "overdraw");

        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooMuch)))
                .andExpect(status().isUnprocessableEntity());

        // Fund the account, then retry with the SAME key -- since the first
        // attempt never moved money, the key must not be permanently burned.
        fixture.fund(source.id(), 10_000);

        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooMuch)))
                .andExpect(status().isCreated());
    }

    private Account fundedAccount(long openingBalanceMinorUnits) {
        return fixture.fundedAccount(owner.id(), openingBalanceMinorUnits);
    }

    private Account openAccount() {
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
