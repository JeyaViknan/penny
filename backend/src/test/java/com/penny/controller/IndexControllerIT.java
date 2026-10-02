package com.penny.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.penny.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

/** The service index, and the guarantee that opening it did not open anything else. */
class IndexControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void rootDescribesTheServiceWithoutAToken() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.service").value("Penny"))
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.links.documentation").value("/swagger-ui.html"))
                .andExpect(jsonPath("$.links.health").value("/actuator/health"));
    }

    /**
     * The reason this test exists.
     *
     * <p>Adding {@code "/"} to the public list is only safe because Spring
     * Security matches it as an exact path rather than a prefix. If that were
     * ever wrong -- or if someone "tidied" it into {@code "/**"} -- the entire
     * API would become anonymous, and every other test in the suite would still
     * pass, because they all authenticate. Nothing else would notice.
     */
    @Test
    void makingTheRootPublicDidNotMakeAnythingElsePublic() throws Exception {
        for (String guarded : new String[] {
                "/accounts", "/users", "/transfers", "/audit", "/ledger/1", "/ledger/integrity" }) {
            mockMvc.perform(get(guarded)).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void healthStaysPublicForThePlatformHealthCheck() throws Exception {
        // Render polls this to decide whether the service is live; if it ever
        // required a token the deploy would hang as permanently unhealthy.
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
