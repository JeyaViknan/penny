package com.ledgerlite.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerlite.AbstractIntegrationTest;
import com.ledgerlite.domain.Account;
import com.ledgerlite.domain.Role;
import com.ledgerlite.domain.User;
import com.ledgerlite.dto.LoginRequest;
import com.ledgerlite.dto.TransferRequest;
import com.ledgerlite.support.LedgerFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

class AuditControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private LedgerFixture fixture;
    @Autowired
    private ObjectMapper objectMapper;

    private User teller;
    private User auditor;
    private User customer;

    @BeforeEach
    void seed() {
        teller = fixture.user("audit-teller", Role.TELLER);
        auditor = fixture.user("audit-auditor", Role.AUDITOR);
        customer = fixture.user("audit-customer", Role.CUSTOMER);
    }

    @Test
    void transferCreatesAnImmutableAuditRecordVisibleToAuditor() throws Exception {
        Account source = fundedAccount(10_000);
        Account destination = openAccount();
        String tellerToken = accessTokenFor("audit-teller", "Password123!");

        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + tellerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TransferRequest(source.id(), destination.id(), 500L, "audited"))))
                .andExpect(status().isCreated());

        String auditorToken = accessTokenFor("audit-auditor", "Password123!");
        String body = mockMvc.perform(get("/audit").header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("\"action\":\"TRANSFER\"");
        assertThat(body).contains("\"entityType\":\"Transaction\"");
    }

    @Test
    void customerCannotReadAuditLog() throws Exception {
        String customerToken = accessTokenFor("audit-customer", "Password123!");
        mockMvc.perform(get("/audit").header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void tellerCannotReadAuditLog() throws Exception {
        String tellerToken = accessTokenFor("audit-teller", "Password123!");
        mockMvc.perform(get("/audit").header("Authorization", "Bearer " + tellerToken))
                .andExpect(status().isForbidden());
    }

    private Account fundedAccount(long openingBalanceMinorUnits) {
        return fixture.fundedAccount(customer.id(), openingBalanceMinorUnits);
    }

    private Account openAccount() {
        return fixture.account(customer.id());
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
