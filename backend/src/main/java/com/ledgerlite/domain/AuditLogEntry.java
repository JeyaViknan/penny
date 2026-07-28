package com.ledgerlite.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

/**
 * Append-only; the database rejects UPDATE/DELETE on this table (see
 * V5__create_audit_log.sql) so this type has no mutation methods beyond
 * initial insert.
 */
@Table("audit_log")
public record AuditLogEntry(
        @Id Long id,
        Long actorUserId,
        String action,
        String entityType,
        String entityId,
        String requestId,
        String ipAddress,
        String details,
        Instant createdAt
) {

    public static AuditLogEntry of(Long actorUserId, String action, String entityType, String entityId,
                                    String requestId, String ipAddress, String details) {
        return new AuditLogEntry(null, actorUserId, action, entityType, entityId, requestId, ipAddress, details, Instant.now());
    }

    public AuditLogEntry withId(Long id) {
        return new AuditLogEntry(id, actorUserId, action, entityType, entityId, requestId, ipAddress, details, createdAt);
    }
}
