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
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Filtering, searching and sorting the transaction history.
 *
 * <p>Each filter is asserted both ways -- that it keeps what it should and drops
 * what it should. A filter that silently matches everything still returns a
 * plausible-looking list, so "the response was 200 and had rows" proves nothing.
 *
 * <p>Every test scopes its query to {@code accountId}, because the suite shares
 * one database and other classes' transactions are also present. That is the
 * same reason totals are asserted relative to this account rather than globally.
 */
class TransactionSearchIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private LedgerFixture fixture;
    @Autowired
    private ObjectMapper objectMapper;

    private Account source;
    private Account destination;
    private String staffToken;

    /**
     * One opening deposit of 100000, then three transfers of 2500, 7500 and
     * 500 with distinct references.
     */
    @BeforeEach
    void seed() throws Exception {
        fixture.user("search-teller", Role.TELLER);
        User customer = fixture.user("search-customer", Role.CUSTOMER);
        source = fixture.fundedAccount(customer.id(), 100_000);
        destination = fixture.account(customer.id());
        staffToken = token("search-teller");

        transfer(2_500L, "Coffee run");
        transfer(7_500L, "Rent share");
        transfer(500L, "coffee beans");
    }

    @Test
    void searchMatchesReferenceCaseInsensitivelyAndExcludesNonMatches() throws Exception {
        mockMvc.perform(history("q=coffee"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items[?(@.reference == 'Coffee run')]").isNotEmpty())
                .andExpect(jsonPath("$.items[?(@.reference == 'coffee beans')]").isNotEmpty())
                .andExpect(jsonPath("$.items[?(@.reference == 'Rent share')]").isEmpty());
    }

    /**
     * {@code %} and {@code _} are LIKE wildcards. If they reach the pattern
     * unescaped, searching for "%" matches every row instead of none, which
     * looks like a working search right up until someone searches for a literal
     * percent sign.
     */
    @Test
    void searchTreatsLikeWildcardsAsLiteralCharacters() throws Exception {
        mockMvc.perform(history("q=%"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0));

        mockMvc.perform(history("q=_"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void typeFilterSelectsOneKindOfTransaction() throws Exception {
        mockMvc.perform(history("type=TRANSFER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.items[?(@.transactionType == 'DEPOSIT')]").isEmpty());

        mockMvc.perform(history("type=DEPOSIT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1));
    }

    /** The multi-select case that a {@code (:x IS NULL OR col = :x)} query cannot express. */
    @Test
    void typeFilterAcceptsSeveralTypesAtOnce() throws Exception {
        mockMvc.perform(history("type=TRANSFER", "type=DEPOSIT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(4));

        mockMvc.perform(history("type=WITHDRAWAL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void amountRangeFiltersFromBothEnds() throws Exception {
        mockMvc.perform(history("minAmount=1000", "maxAmount=10000"))
                .andExpect(status().isOk())
                // 2500 and 7500 only -- 500 is below the floor, 100000 above the ceiling.
                .andExpect(jsonPath("$.totalItems").value(2));

        mockMvc.perform(history("minAmount=7500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2)); // 7500 and the 100000 deposit

        mockMvc.perform(history("maxAmount=500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1));
    }

    /** Bounds are inclusive at both ends, so an exact-amount lookup works. */
    @Test
    void amountBoundsAreInclusive() throws Exception {
        mockMvc.perform(history("minAmount=2500", "maxAmount=2500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].amountMinorUnits").value(2_500));
    }

    @Test
    void dateRangeExcludesTransactionsOutsideTheWindow() throws Exception {
        mockMvc.perform(history("from=2000-01-01T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(4));

        mockMvc.perform(history("to=2000-01-01T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0));

        mockMvc.perform(history("from=2000-01-01T00:00:00Z", "to=2001-01-01T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void sortingByAmountWorksInBothDirections() throws Exception {
        mockMvc.perform(history("sort=AMOUNT", "direction=ASC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].amountMinorUnits").value(500))
                .andExpect(jsonPath("$.items[1].amountMinorUnits").value(2_500))
                .andExpect(jsonPath("$.items[2].amountMinorUnits").value(7_500))
                .andExpect(jsonPath("$.items[3].amountMinorUnits").value(100_000));

        mockMvc.perform(history("sort=AMOUNT", "direction=DESC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].amountMinorUnits").value(100_000))
                .andExpect(jsonPath("$.items[3].amountMinorUnits").value(500));
    }

    @Test
    void sortingByDateDefaultsToNewestFirstAndCanBeReversed() throws Exception {
        mockMvc.perform(history())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].reference").value("coffee beans"))
                .andExpect(jsonPath("$.items[3].reference").value("opening balance"));

        mockMvc.perform(history("sort=DATE", "direction=ASC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].reference").value("opening balance"))
                .andExpect(jsonPath("$.items[3].reference").value("coffee beans"));
    }

    /**
     * A sort column arriving as a raw string is the classic ORDER BY injection
     * vector. Binding to an enum means an unknown value is rejected at the edge
     * and never reaches the SQL builder at all.
     */
    @Test
    void unknownSortColumnIsRejectedRatherThanInterpreted() throws Exception {
        mockMvc.perform(history("sort=amount_minor_units;DROP TABLE users"))
                .andExpect(status().isBadRequest());
    }

    /** Filters must narrow the total, not just the visible page. */
    @Test
    void filtersApplyToTheTotalCountAndNotOnlyThePage() throws Exception {
        mockMvc.perform(history("q=coffee", "size=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void filtersCombineAsConjunctions() throws Exception {
        mockMvc.perform(history("q=coffee", "minAmount=1000", "type=TRANSFER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].reference").value("Coffee run"));
    }

    /** Counterparty names are resolved so the UI never has to render "user #4". */
    @Test
    void summariesCarryResolvedUsernamesForBothLegsAndTheInitiator() throws Exception {
        mockMvc.perform(history("q=Rent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].debitOwnerUsername").value("search-customer"))
                .andExpect(jsonPath("$.items[0].creditOwnerUsername").value("search-customer"))
                .andExpect(jsonPath("$.items[0].initiatedByUsername").value("search-teller"))
                .andExpect(jsonPath("$.items[0].debitAccountNumber").value(source.accountNumber()))
                .andExpect(jsonPath("$.items[0].creditAccountNumber").value(destination.accountNumber()));
    }

    /**
     * The cash vault is bank-owned and has no holder, so its username is null
     * rather than absent -- the UI renders "Cash vault" for it.
     */
    @Test
    void depositsShowTheVaultLegWithNoOwner() throws Exception {
        mockMvc.perform(history("type=DEPOSIT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].debitOwnerUsername").isEmpty())
                .andExpect(jsonPath("$.items[0].creditOwnerUsername").value("search-customer"));
    }

    /**
     * Builds a history request already scoped to this test's account and
     * authenticated as staff. Parameters are added individually rather than
     * concatenated into a query string so that values containing URL-significant
     * characters -- notably the bare "%" the wildcard test needs -- reach the
     * controller intact instead of being mangled during URI parsing. Repeating a
     * name (type=...) appends rather than overwrites, which is how the
     * multi-select filter is exercised.
     */
    private MockHttpServletRequestBuilder history(String... params) {
        MultiValueMap<String, String> values = new LinkedMultiValueMap<>();
        values.set("accountId", String.valueOf(source.id()));
        values.set("size", "25");
        for (String param : params) {
            int split = param.indexOf('=');
            String name = param.substring(0, split);
            String value = param.substring(split + 1);
            // "type" is the one repeatable filter; everything else replaces the
            // default so a test can override size without ending up with two.
            if ("type".equals(name)) {
                values.add(name, value);
            } else {
                values.set(name, value);
            }
        }
        return get("/transfers").params(values).header("Authorization", "Bearer " + staffToken);
    }

    private void transfer(long amount, String reference) throws Exception {
        mockMvc.perform(post("/transfers")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TransferRequest(source.id(), destination.id(), amount, reference))))
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
