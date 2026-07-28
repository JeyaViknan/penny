package com.ledgerlite.dto;

import com.ledgerlite.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank(message = "username is required")
        @Size(min = 3, max = 64, message = "username must be between 3 and 64 characters")
        String username,

        @NotBlank(message = "email is required")
        @Email(message = "email must be a valid email address")
        String email,

        @NotBlank(message = "password is required")
        @Size(min = 8, message = "password must be at least 8 characters")
        String password,

        @NotNull(message = "role is required")
        Role role
) {
}
