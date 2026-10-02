package com.penny.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.penny.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The demo endpoint with seeding on, which is how the deployed instance runs.
 *
 * <p>A separate top-level class rather than a nested one inside
 * {@link DemoControllerIT}: Failsafe selects by file name, so a nested class
 * compiles to {@code DemoControllerIT$WhenSeeded} and is never run. It passed
 * by not existing -- the suite reported green while these four assertions sat
 * unexecuted, which is the failure mode that makes a test worse than no test.
 */
@TestPropertySource(properties = {
        "penny.bootstrap.seed-demo=true",
        "penny.bootstrap.demo-password=a-generated-demo-password"
})
class DemoControllerSeededIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publishesOneLoginPerRole() throws Exception {
        mockMvc.perform(get("/auth/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.password").value("a-generated-demo-password"))
                .andExpect(jsonPath("$.accounts.length()").value(4))
                .andExpect(jsonPath("$.accounts[?(@.role == 'CUSTOMER')]").isNotEmpty())
                .andExpect(jsonPath("$.accounts[?(@.role == 'TELLER')]").isNotEmpty())
                .andExpect(jsonPath("$.accounts[?(@.role == 'AUDITOR')]").isNotEmpty())
                .andExpect(jsonPath("$.accounts[?(@.role == 'ADMIN')]").isNotEmpty());
    }

    /**
     * The bootstrapped administrator is the one real credential on the instance
     * -- the operator's own way in. Publishing a demo admin is deliberate;
     * publishing that one would hand over the keys.
     */
    @Test
    void neverPublishesTheBootstrappedAdministrator() throws Exception {
        mockMvc.perform(get("/auth/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accounts[?(@.username == 'admin')]").isEmpty());
    }

    @Test
    void everyPublishedAccountExplainsWhatTheRolePermits() throws Exception {
        // A list of logins with no explanation would be a convenience; the point
        // is showing that the roles differ, and where the edges are.
        mockMvc.perform(get("/auth/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accounts[0].summary").isNotEmpty())
                .andExpect(jsonPath("$.accounts[0].permissions").isNotEmpty());
    }
}
