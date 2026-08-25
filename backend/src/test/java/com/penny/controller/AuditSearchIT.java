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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Filtering and paging the audit trail.
 *
 * <p>{@code GET /audit} previously returned the entire table on every call. The
 * table is append-only and never shrinks, so these tests pin the two properties
 * that replaced that: the response is a bounded page, and the filters narrow the
 * total rather than only the visible slice.
 *
 * <p>The suite shares one database and every test class writes audit rows, so
 * assertions are scoped by actor or by entity rather than asserting global
 * counts, which would be coupled to unrelated tests.
 */
class AuditSearchIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private LedgerFixture fixture;
    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Audit rows are never deleted and this class does not roll back between
     * tests, so a shared actor would accumulate rows from every test that ran
     * before. Giving each test its own teller is what lets the counts below be
     * exact numbers instead of "greater than".
     */
    private static final java.util.concurrent.atomic.AtomicLong UNIQUE = new java.util.concurrent.atomic.AtomicLong();

    private User teller;
    private String tellerUsername;
    private String auditorToken;
    private long transactionId;

    @BeforeEach
    void seed() throws Exception {
        tellerUsername = "auditsearch-teller-" + UNIQUE.incrementAndGet();
        teller = fixture.user(tellerUsername, Role.TELLER);
        fixture.user("auditsearch-auditor", Role.AUDITOR);
        User customer = fixture.user("auditsearch-customer", Role.CUSTOMER);

        Account source = fixture.fundedAccount(customer.id(), 20_000);
        Account destination = fixture.account(customer.id());

        String tellerToken = token(tellerUsername);
        String body = null;
        for (int i = 0; i < 3; i++) {
            body = mockMvc.perform(post("/transfers")
                            .header("Authorization", "Bearer " + tellerToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    new TransferRequest(source.id(), destination.id(), 100L, "audited-" + i))))
                    .andExpect(status().isCreated())
                    .andReturn().getResponse().getContentAsString();
        }
        transactionId = objectMapper.readTree(body).get("transactionId").asLong();
        auditorToken = token("auditsearch-auditor");
    }

    @Test
    void auditTrailIsPagedRatherThanReturnedWhole() throws Exception {
        mockMvc.perform(audit("size=2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalItems").isNumber());
    }

    @Test
    void oversizedPageRequestIsClamped() throws Exception {
        mockMvc.perform(audit("size=100000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(200));
    }

    @Test
    void filteringByActorReturnsOnlyThatPersonsActions() throws Exception {
        mockMvc.perform(audit("actorUserId=" + teller.id(), "size=200"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.actorUserId != " + teller.id() + ")]").isEmpty())
                .andExpect(jsonPath("$.items[0].actorUsername").value(tellerUsername));
    }

    @Test
    void filteringByActionSelectsOneKindOfEvent() throws Exception {
        mockMvc.perform(audit("actorUserId=" + teller.id(), "action=TRANSFER", "size=200"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.items[?(@.action != 'TRANSFER')]").isEmpty());
    }

    /** Reaches the entity-history lookup that had no route before. */
    @Test
    void filteringByEntityTracesOneRecordsHistory() throws Exception {
        mockMvc.perform(audit("entityType=Transaction", "entityId=" + transactionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].action").value("TRANSFER"))
                .andExpect(jsonPath("$.items[0].entityId").value(String.valueOf(transactionId)));
    }

    @Test
    void filtersNarrowTheTotalAndNotOnlyThePage() throws Exception {
        mockMvc.perform(audit("actorUserId=" + teller.id(), "action=TRANSFER", "size=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.totalPages").value(3));
    }

    @Test
    void pagingWalksThroughDistinctRowsNewestFirst() throws Exception {
        String first = mockMvc.perform(audit("actorUserId=" + teller.id(), "action=TRANSFER", "size=1", "page=0"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String second = mockMvc.perform(audit("actorUserId=" + teller.id(), "action=TRANSFER", "size=1", "page=1"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long firstId = objectMapper.readTree(first).get("items").get(0).get("id").asLong();
        long secondId = objectMapper.readTree(second).get("items").get(0).get("id").asLong();
        org.assertj.core.api.Assertions.assertThat(firstId).isGreaterThan(secondId);
    }

    @Test
    void dateWindowInThePastExcludesEverything() throws Exception {
        mockMvc.perform(audit("to=2000-01-01T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0))
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void anUnmatchedFilterReturnsAnEmptyPageRatherThanEverything() throws Exception {
        mockMvc.perform(audit("action=NO_SUCH_ACTION"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void filtersRemainClosedToNonAuditors() throws Exception {
        mockMvc.perform(get("/audit").param("actorUserId", String.valueOf(teller.id()))
                        .header("Authorization", "Bearer " + token("auditsearch-customer")))
                .andExpect(status().isForbidden());
    }

    private MockHttpServletRequestBuilder audit(String... params) {
        var request = get("/audit");
        for (String param : params) {
            int split = param.indexOf('=');
            request = request.param(param.substring(0, split), param.substring(split + 1));
        }
        return request.header("Authorization", "Bearer " + auditorToken);
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
