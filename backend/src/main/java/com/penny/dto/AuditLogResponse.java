package com.penny.dto;

import java.time.Instant;

public record AuditLogResponse(
        Long id,
        Long actorUserId,
        String action,
        String entityType,
        String entityId,
        String requestId,
        String ipAddress,
        String details,
        Instant createdAt
) {
}
