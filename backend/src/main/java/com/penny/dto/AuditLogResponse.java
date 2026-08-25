package com.penny.dto;

import java.time.Instant;

/**
 * One recorded action.
 *
 * <p>{@code actorUserId} and {@code actorUsername} are both null for
 * system-initiated events. The username is resolved by the service rather than
 * stored on the row, so a later rename is reflected everywhere the actor appears.
 */
public record AuditLogResponse(
        Long id,
        Long actorUserId,
        String actorUsername,
        String action,
        String entityType,
        String entityId,
        String requestId,
        String ipAddress,
        String details,
        Instant createdAt
) {
}
