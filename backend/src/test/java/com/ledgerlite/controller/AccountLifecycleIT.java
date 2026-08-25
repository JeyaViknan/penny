package com.ledgerlite.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerlite.AbstractIntegrationTest;
import com.ledgerlite.domain.Account;
import com.ledgerlite.domain.AccountStatus;
import com.ledgerlite.domain.Role;
import com.ledgerlite.dto.ChangeAccountStatusRequest;
import com.ledgerlite.dto.LoginRequest;
import com.ledgerlite.dto.TransferRequest;
import com.ledgerlite.support.LedgerFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Account status transitions -- previously unreachable, so the enum had dead states. */
class AccountLifecycleIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private LedgerFixture fixture;
    @Autowired
    private ObjectMapper objectMapper;

    private Long customerId;

    @BeforeEach
    void seed() {
        fixture.user("life-admin", Role.ADMIN);
        fixture.user("life-teller", Role.TELLER);
        customerId = fixture.user("life-customer", Role.CUSTOMER).id();
    }

    @Test
    void adminCanFreezeAndReactivateAnAccount() throws Exception {
        Account account = fixture.account(customerId);
        String admin = token("life-admin");

        changeStatus(account.id(), AccountStatus.INACTIVE, admin).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"));
        changeStatus(account.id(), AccountStatus.ACTIVE, admin).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void frozenAccountCannotReceiveATransfer() throws Exception {
        Account source = fixture.fundedAccount(customerId, 10_000);
        Account destination = fixture.account(customerId);
        changeStatus(destination.id(), AccountStatus.INACTIVE, token("life-admin")).andExpect(status().isOk());

        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token("life-teller"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TransferRequest(source.id(), destination.id(), 100L, "to frozen"))))
                .andExpect(status().isConflict());
    }

    @Test
    void tellerCannotChangeAccountStatus() throws Exception {
        Account account = fixture.account(customerId);
        changeStatus(account.id(), AccountStatus.INACTIVE, token("life-teller")).andExpect(status().isForbidden());
    }

    @Test
    void accountHoldingMoneyCannotBeClosed() throws Exception {
        Account account = fixture.fundedAccount(customerId, 500);
        changeStatus(account.id(), AccountStatus.CLOSED, token("life-admin")).andExpect(status().isConflict());
    }

    @Test
    void closedAccountCannotBeReopened() throws Exception {
        Account account = fixture.account(customerId);
        String admin = token("life-admin");
        changeStatus(account.id(), AccountStatus.CLOSED, admin).andExpect(status().isOk());
        changeStatus(account.id(), AccountStatus.ACTIVE, admin).andExpect(status().isConflict());
    }

    private org.springframework.test.web.servlet.ResultActions changeStatus(Long accountId, AccountStatus status, String token)
            throws Exception {
        return mockMvc.perform(patch("/accounts/" + accountId + "/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ChangeAccountStatusRequest(status))));
    }

    private String token(String username) throws Exception {
        var result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(username, LedgerFixture.PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }
}
