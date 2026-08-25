package com.penny.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.penny.AbstractIntegrationTest;
import com.penny.domain.Account;
import com.penny.domain.Role;
import com.penny.domain.User;
import com.penny.dto.LoginRequest;
import com.penny.dto.TransferRequest;
import com.penny.support.LedgerFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The account ledger: paging, the running balance column, and the two legs of a
 * single transaction.
 *
 * <p>The running balance is the reason this class exists. It is accumulated by a
 * window function, and the obvious implementation -- paginate, then accumulate --
 * is wrong in a way that only shows up from page two onward, because page one
 * happens to start at the beginning of history either way. See
 * {@link #runningBalanceOnPageTwoAccumulatesFromTheStartOfHistory()}.
 */
class AccountLedgerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private LedgerFixture fixture;
    @Autowired
    private ObjectMapper objectMapper;

    private User customer;
    private Account account;
    private String staffToken;

    /**
     * Five deposits, ascending in time: 1000, 2000, 3000, 4000, 5000.
     * Running balances in chronological order are therefore
     * 1000, 3000, 6000, 10000, 15000.
     */
    @BeforeEach
    void seed() throws Exception {
        fixture.user("ledger-teller", Role.TELLER);
        customer = fixture.user("ledger-customer", Role.CUSTOMER);
        account = fixture.account(customer.id());
        for (int i = 1; i <= 5; i++) {
            fixture.fund(account.id(), i * 1_000L);
        }
        staffToken = token("ledger-teller");
    }

    @Test
    void newestEntryCarriesTheAccountsWholeBalance() throws Exception {
        mockMvc.perform(get("/ledger/" + account.id() + "?page=0&size=2")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.totalItems").value(5))
                .andExpect(jsonPath("$.totalPages").value(3))
                // Newest first: the 5000 deposit, then the 4000 one.
                .andExpect(jsonPath("$.items[0].amountMinorUnits").value(5_000))
                .andExpect(jsonPath("$.items[0].runningBalanceMinorUnits").value(15_000))
                .andExpect(jsonPath("$.items[1].amountMinorUnits").value(4_000))
                .andExpect(jsonPath("$.items[1].runningBalanceMinorUnits").value(10_000));
    }

    /**
     * The regression this whole design exists to prevent.
     *
     * <p>Page two holds the 3000 and 2000 deposits. Their true running balances
     * are 6000 and 3000, because the two older deposits before them count. An
     * implementation that applies LIMIT/OFFSET before the window sees only these
     * two rows and reports 5000 and 2000 -- self-consistent, plausible, and
     * wrong. Page one agrees under both implementations, so only an assertion
     * past the first page catches it.
     */
    @Test
    void runningBalanceOnPageTwoAccumulatesFromTheStartOfHistory() throws Exception {
        mockMvc.perform(get("/ledger/" + account.id() + "?page=1&size=2")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].amountMinorUnits").value(3_000))
                .andExpect(jsonPath("$.items[0].runningBalanceMinorUnits").value(6_000))
                .andExpect(jsonPath("$.items[1].amountMinorUnits").value(2_000))
                .andExpect(jsonPath("$.items[1].runningBalanceMinorUnits").value(3_000));
    }

    @Test
    void oldestEntryOnTheLastPageStartsTheRunningTotal() throws Exception {
        mockMvc.perform(get("/ledger/" + account.id() + "?page=2&size=2")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].amountMinorUnits").value(1_000))
                .andExpect(jsonPath("$.items[0].runningBalanceMinorUnits").value(1_000));
    }

    @Test
    void debitsDrawTheRunningBalanceDown() throws Exception {
        Account destination = fixture.account(customer.id());
        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TransferRequest(account.id(), destination.id(), 4_000L, "drawdown"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/ledger/" + account.id() + "?page=0&size=1")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].entryType").value("DEBIT"))
                .andExpect(jsonPath("$.items[0].runningBalanceMinorUnits").value(11_000));
    }

    @Test
    void customerCanReadTheirOwnLedgerButNotAnotherAccounts() throws Exception {
        User other = fixture.user("ledger-other", Role.CUSTOMER);
        Account otherAccount = fixture.fundedAccount(other.id(), 1_000);

        String customerToken = token("ledger-customer");
        mockMvc.perform(get("/ledger/" + account.id()).header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/ledger/" + otherAccount.id()).header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    /**
     * Both legs of one transaction. Running balance is deliberately absent here:
     * the legs sit on two different accounts, so there is no single sequence for
     * a running total to accumulate over.
     */
    @Test
    void transactionLegsAreEqualAndOppositeWithNoRunningBalance() throws Exception {
        Account destination = fixture.account(customer.id());
        String body = mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TransferRequest(account.id(), destination.id(), 750L, "two-legs"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long transactionId = objectMapper.readTree(body).get("transactionId").asLong();

        mockMvc.perform(get("/ledger/transaction/" + transactionId)
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].amountMinorUnits").value(750))
                .andExpect(jsonPath("$[1].amountMinorUnits").value(750))
                .andExpect(jsonPath("$[?(@.entryType == 'DEBIT')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.entryType == 'CREDIT')]").isNotEmpty())
                // Null, not zero: two legs on two accounts share no running total.
                .andExpect(jsonPath("$[0].runningBalanceMinorUnits").isEmpty())
                .andExpect(jsonPath("$[1].runningBalanceMinorUnits").isEmpty());
    }

    @Test
    void customerCannotReadRawTransactionLegs() throws Exception {
        mockMvc.perform(get("/ledger/transaction/1")
                        .header("Authorization", "Bearer " + token("ledger-customer")))
                .andExpect(status().isForbidden());
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
