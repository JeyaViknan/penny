package com.ledgerlite.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerlite.AbstractIntegrationTest;
import com.ledgerlite.domain.Account;
import com.ledgerlite.domain.AccountType;
import com.ledgerlite.domain.Role;
import com.ledgerlite.domain.User;
import com.ledgerlite.dto.CashRequest;
import com.ledgerlite.dto.CreateAccountRequest;
import com.ledgerlite.dto.LoginRequest;
import com.ledgerlite.support.LedgerFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

class AccountControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private LedgerFixture fixture;
    @Autowired
    private ObjectMapper objectMapper;

    private User teller;
    private User customer;

    @BeforeEach
    void seed() {
        teller = fixture.user("teller1", Role.TELLER);
        customer = fixture.user("customer1", Role.CUSTOMER);
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
        // A deposit then a withdrawal leaves two entries on the account and a
        // balance that exists only as their difference -- there is no stored
        // balance column that could disagree.
        Account account = fixture.fundedAccount(customer.id(), 10_000);
        String token = accessTokenFor("teller1", "Password123!");
        mockMvc.perform(post("/accounts/" + account.id() + "/withdraw")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CashRequest(2_500L, "atm"))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/accounts/" + account.id()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balanceMinorUnits").value(7_500));

        mockMvc.perform(get("/ledger/" + account.id()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void customerCanReadOwnAccountButNotOthers() throws Exception {
        Account own = fixture.account(customer.id(), AccountType.SAVINGS);
        Account other = fixture.account(teller.id(), AccountType.SAVINGS);

        String token = accessTokenFor("customer1", "Password123!");

        mockMvc.perform(get("/accounts/" + own.id()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/accounts/" + other.id()).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerListingAccountsSeesOnlyOwnAccounts() throws Exception {
        fixture.account(customer.id(), AccountType.CHECKING);
        fixture.account(teller.id(), AccountType.CHECKING);

        String token = accessTokenFor("customer1", "Password123!");

        mockMvc.perform(get("/accounts").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].ownerUserId", org.hamcrest.Matchers.everyItem(
                        org.hamcrest.Matchers.equalTo(customer.id().intValue()))));
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
