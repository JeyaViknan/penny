package com.penny.repository.query;

import java.time.Instant;

/**
 * Filters for the audit trail.
 *
 * <p>Unlike {@link TransactionQuery} there is no access-control narrowing here:
 * the whole endpoint is already restricted to ADMIN and AUDITOR, and an auditor
 * who could only see part of the trail would not be an auditor.
 */
public record AuditQuery(
        String action,
        String entityType,
        String entityId,
        Long actorUserId,
        Instant from,
        Instant to,
        int page,
        int size
) {

    public static final int MAX_PAGE_SIZE = 200;

    public AuditQuery {
        page = Math.max(page, 0);
        size = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        action = blankToNull(action);
        entityType = blankToNull(entityType);
        entityId = blankToNull(entityId);
    }

    public long offset() {
        return (long) page * size;
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
