package com.ledgerlite.mapper;

import com.ledgerlite.domain.AuditLogEntry;
import com.ledgerlite.dto.AuditLogResponse;
import org.springframework.stereotype.Component;

@Component
public class AuditLogMapper {

    public AuditLogResponse toResponse(AuditLogEntry entry) {
        return new AuditLogResponse(entry.id(), entry.actorUserId(), entry.action(), entry.entityType(),
                entry.entityId(), entry.requestId(), entry.ipAddress(), entry.details(), entry.createdAt());
    }
}
