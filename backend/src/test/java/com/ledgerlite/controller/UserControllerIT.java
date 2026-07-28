package com.ledgerlite.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerlite.AbstractIntegrationTest;
import com.ledgerlite.domain.Role;
import com.ledgerlite.domain.User;
import com.ledgerlite.dto.LoginRequest;
import com.ledgerlite.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

class UserControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private ObjectMapper objectMapper;

    private User customerA;
    private User customerB;

    @BeforeEach
    void seed() {
        customerA = userRepository.findByUsername("profile-a")
                .orElseGet(() -> userRepository.save(User.newUser(
                        "profile-a", "profile-a@ledgerlite.local", passwordEncoder.encode("Password123!"), Role.CUSTOMER)));
        customerB = userRepository.findByUsername("profile-b")
                .orElseGet(() -> userRepository.save(User.newUser(
                        "profile-b", "profile-b@ledgerlite.local", passwordEncoder.encode("Password123!"), Role.CUSTOMER)));
    }

    @Test
    void customerCanViewOwnProfile() throws Exception {
        String token = accessTokenFor("profile-a", "Password123!");
        mockMvc.perform(get("/users/" + customerA.id()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void customerCannotViewAnotherCustomersProfile() throws Exception {
        String token = accessTokenFor("profile-a", "Password123!");
        mockMvc.perform(get("/users/" + customerB.id()).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
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
