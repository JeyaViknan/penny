package com.ledgerlite.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
    @Autowired
    private com.ledgerlite.support.LedgerFixture fixture;

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

    @Test
    void adminCanCreateUsersAndListThem() throws Exception {
        String admin = tokenFor(fixture.user("users-admin", com.ledgerlite.domain.Role.ADMIN).username());
        String username = "created-" + System.nanoTime();

        mockMvc.perform(post("/users")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new com.ledgerlite.dto.CreateUserRequest(
                                username, username + "@ledgerlite.test", "Password123!", com.ledgerlite.domain.Role.CUSTOMER))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.role").value("CUSTOMER"));

        mockMvc.perform(get("/users").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.username == '" + username + "')]").isNotEmpty());
    }

    @Test
    void duplicateUsernameIsRejected() throws Exception {
        String admin = tokenFor(fixture.user("users-admin", com.ledgerlite.domain.Role.ADMIN).username());
        String username = "dupe-" + System.nanoTime();
        var body = new com.ledgerlite.dto.CreateUserRequest(
                username, username + "@ledgerlite.test", "Password123!", com.ledgerlite.domain.Role.CUSTOMER);

        mockMvc.perform(post("/users").header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))).andExpect(status().isCreated());

        mockMvc.perform(post("/users").header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))).andExpect(status().isConflict());
    }

    @Test
    void invalidUserPayloadReportsFieldErrors() throws Exception {
        String admin = tokenFor(fixture.user("users-admin", com.ledgerlite.domain.Role.ADMIN).username());

        mockMvc.perform(post("/users").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"x\",\"email\":\"not-an-email\",\"password\":\"short\",\"role\":\"CUSTOMER\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.length()").value(3));
    }

    private String tokenFor(String username) throws Exception {
        return accessTokenFor(username, com.ledgerlite.support.LedgerFixture.PASSWORD);
    }
}
