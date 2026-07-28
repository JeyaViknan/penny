package com.ledgerlite.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

/**
 * Immutable aggregate root. Spring Data JDBC persists records by looking
 * for a {@code withId} method to produce a copy carrying the
 * database-generated identifier -- this keeps the domain model immutable
 * end to end instead of exposing mutable setters purely to satisfy the
 * persistence framework.
 */
@Table("users")
public record User(
        @Id Long id,
        String username,
        String email,
        String passwordHash,
        Role role,
        boolean enabled,
        Instant createdAt
) {

    public static User newUser(String username, String email, String passwordHash, Role role) {
        return new User(null, username, email, passwordHash, role, true, Instant.now());
    }

    public User withId(Long id) {
        return new User(id, username, email, passwordHash, role, enabled, createdAt);
    }
}
