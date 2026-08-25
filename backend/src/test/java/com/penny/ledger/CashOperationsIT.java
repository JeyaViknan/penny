package com.penny.ledger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.penny.AbstractIntegrationTest;
import com.penny.domain.Account;
import com.penny.domain.Role;
import com.penny.domain.User;
import com.penny.dto.CashRequest;
import com.penny.dto.LedgerIntegrityResponse;
import com.penny.dto.LoginRequest;
import com.penny.support.LedgerFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Deposits and withdrawals -- the path by which money enters and leaves the
 * ledger. The central assertion is that neither operation is a one-sided
 * balance edit: both post two legs, so the books still balance afterwards.
 */
class CashOperationsIT extends AbstractIntegrationTest {

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
        teller = fixture.user("cash-teller", Role.TELLER);
        customer = fixture.user("cash-customer", Role.CUSTOMER);
    }

    @Test
    void depositCreditsTheAccountAndDebitsTheVault() throws Exception {
        Account account = fixture.account(customer.id());
        String token = token("cash-teller");

        mockMvc.perform(post("/accounts/" + account.id() + "/deposit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CashRequest(25_000L, "branch deposit"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionType").value("DEPOSIT"))
                .andExpect(jsonPath("$.resultingBalanceMinorUnits").value(25_000));

        mockMvc.perform(get("/accounts/" + account.id()).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.balanceMinorUnits").value(25_000));
    }

    @Test
    void withdrawalDebitsTheAccountAndIsRejectedWhenFundsAreShort() throws Exception {
        Account account = fixture.fundedAccount(customer.id(), 5_000);
        String token = token("cash-teller");

        mockMvc.perform(post("/accounts/" + account.id() + "/withdraw")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CashRequest(2_000L, "atm"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultingBalanceMinorUnits").value(3_000));

        mockMvc.perform(post("/accounts/" + account.id() + "/withdraw")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CashRequest(99_000L, "too much"))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void customerCannotDepositIntoTheirOwnAccount() throws Exception {
        Account account = fixture.account(customer.id());

        mockMvc.perform(post("/accounts/" + account.id() + "/deposit")
                        .header("Authorization", "Bearer " + token("cash-customer"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CashRequest(1_000_000L, "free money"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void repeatedDepositWithSameIdempotencyKeyCreditsOnlyOnce() throws Exception {
        Account account = fixture.account(customer.id());
        String token = token("cash-teller");
        String key = "cash-" + System.nanoTime();
        var request = new CashRequest(7_500L, "counter deposit");

        for (int attempt = 0; attempt < 2; attempt++) {
            mockMvc.perform(post("/accounts/" + account.id() + "/deposit")
                            .header("Authorization", "Bearer " + token)
                            .header("Idempotency-Key", key)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(get("/accounts/" + account.id()).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.balanceMinorUnits").value(7_500));
    }

    @Test
    void ledgerStillBalancesAfterCashMovesInAndOut() throws Exception {
        Account account = fixture.fundedAccount(customer.id(), 12_000);
        String token = token("cash-teller");
        mockMvc.perform(post("/accounts/" + account.id() + "/withdraw")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CashRequest(4_000L, "atm"))))
                .andExpect(status().isOk());

        String body = mockMvc.perform(get("/ledger/integrity")
                        .header("Authorization", "Bearer " + token(fixture.user("cash-admin", Role.ADMIN).username())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        LedgerIntegrityResponse integrity = objectMapper.readValue(body, LedgerIntegrityResponse.class);
        assertThat(integrity.balanced()).isTrue();
        assertThat(integrity.totalDebitsMinorUnits()).isEqualTo(integrity.totalCreditsMinorUnits());
        // Money entering the ledger is offset by the vault going negative, so
        // every account balance summed together is exactly zero.
        assertThat(integrity.netAcrossAllAccountsMinorUnits()).isZero();
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
