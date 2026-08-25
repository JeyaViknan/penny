package com.penny.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("idempotency_keys")
public record IdempotencyKeyRecord(
        @Id Long id,
        String idempotencyKey,
        Long userId,
        String requestHash,
        Integer responseStatus,
        String responseBody,
        Instant createdAt,
        Instant completedAt
) {

    public static IdempotencyKeyRecord pending(String idempotencyKey, Long userId, String requestHash) {
        return new IdempotencyKeyRecord(null, idempotencyKey, userId, requestHash, null, null, Instant.now(), null);
    }

    public IdempotencyKeyRecord withId(Long id) {
        return new IdempotencyKeyRecord(id, idempotencyKey, userId, requestHash, responseStatus, responseBody, createdAt, completedAt);
    }

    public IdempotencyKeyRecord withResponse(int status, String body) {
        return new IdempotencyKeyRecord(id, idempotencyKey, userId, requestHash, status, body, createdAt, Instant.now());
    }

    public boolean isCompleted() {
        return responseStatus != null;
    }
}
