package com.penny.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.penny.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The demo endpoint publishes passwords, so the condition under which it stays
 * quiet is the part worth testing.
 *
 * <p>The test profile does not enable demo seeding, which makes this the
 * default-configuration case: a deployment that did not opt in must advertise
 * no way to sign in.
 */
class DemoControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publishesNothingWhenTheInstanceWasNotSeededAsADemo() throws Exception {
        mockMvc.perform(get("/auth/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.password").isEmpty())
                .andExpect(jsonPath("$.accounts").isEmpty());
    }

    @Test
    void isReachableWithoutAToken() throws Exception {
        // It has to be: the whole point is reading it from the sign-in screen,
        // before anyone has a way to authenticate.
        mockMvc.perform(get("/auth/demo")).andExpect(status().isOk());
    }
}
