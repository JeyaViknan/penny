package com.ledgerlite.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

/**
 * Refresh tokens are stored hashed (never the raw token) so a database
 * leak doesn't hand out valid session tokens. Revocation is a timestamp,
 * not a delete, keeping the row available for audit/forensics.
 */
@Table("refresh_tokens")
public record RefreshToken(
        @Id Long id,
        Long userId,
        String tokenHash,
        Instant expiresAt,
        Instant revokedAt,
        Instant createdAt
) {

    public static RefreshToken issue(Long userId, String tokenHash, Instant expiresAt) {
        return new RefreshToken(null, userId, tokenHash, expiresAt, null, Instant.now());
    }

    public RefreshToken withId(Long id) {
        return new RefreshToken(id, userId, tokenHash, expiresAt, revokedAt, createdAt);
    }

    public boolean isActive(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }
}
