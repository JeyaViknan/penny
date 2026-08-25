package com.ledgerlite.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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

/** Paged transaction history, including the SQL-level access-control filter. */
class TransactionHistoryIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private LedgerFixture fixture;
    @Autowired
    private ObjectMapper objectMapper;

    private User alice;
    private User bob;
    private Account aliceAccount;
    private Account bobAccount;

    @BeforeEach
    void seed() throws Exception {
        fixture.user("hist-teller", Role.TELLER);
        alice = fixture.user("hist-alice", Role.CUSTOMER);
        bob = fixture.user("hist-bob", Role.CUSTOMER);
        aliceAccount = fixture.fundedAccount(alice.id(), 50_000);
        bobAccount = fixture.fundedAccount(bob.id(), 50_000);

        String teller = token("hist-teller");
        for (int i = 0; i < 3; i++) {
            transfer(teller, aliceAccount.id(), bobAccount.id(), 100L + i, "alice-to-bob-" + i);
        }
    }

    @Test
    void historyIsPagedAndReportsTotals() throws Exception {
        mockMvc.perform(get("/transfers?page=0&size=2").header("Authorization", "Bearer " + token("hist-teller")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalPages").isNumber());
    }

    @Test
    void depositsAndTransfersBothAppearWithTheirType() throws Exception {
        mockMvc.perform(get("/transfers?size=100").header("Authorization", "Bearer " + token("hist-teller")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.transactionType == 'TRANSFER')]").isNotEmpty())
                .andExpect(jsonPath("$.items[?(@.transactionType == 'DEPOSIT')]").isNotEmpty());
    }

    @Test
    void customerSeesOnlyTransactionsTouchingTheirOwnAccounts() throws Exception {
        // Carol has no transactions at all, so an unfiltered query would leak
        // Alice's and Bob's activity to her.
        User carol = fixture.user("hist-carol", Role.CUSTOMER);
        fixture.account(carol.id());

        mockMvc.perform(get("/transfers?size=100").header("Authorization", "Bearer " + token("hist-carol")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void customerCannotFilterHistoryByAnotherCustomersAccount() throws Exception {
        mockMvc.perform(get("/transfers?accountId=" + bobAccount.id())
                        .header("Authorization", "Bearer " + token("hist-alice")))
                .andExpect(status().isForbidden());
    }

    @Test
    void oversizedPageRequestIsClampedRatherThanHonoured() throws Exception {
        mockMvc.perform(get("/transfers?size=100000").header("Authorization", "Bearer " + token("hist-teller")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(100));
    }

    private void transfer(String token, Long from, Long to, long amount, String reference) throws Exception {
        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TransferRequest(from, to, amount, reference))))
                .andExpect(status().isCreated());
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
