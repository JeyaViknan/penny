package com.penny.mapper;

import com.penny.domain.AuditLogEntry;
import com.penny.dto.AuditLogResponse;
import org.springframework.stereotype.Component;

@Component
public class AuditLogMapper {

    public AuditLogResponse toResponse(AuditLogEntry entry) {
        return new AuditLogResponse(entry.id(), entry.actorUserId(), entry.action(), entry.entityType(),
                entry.entityId(), entry.requestId(), entry.ipAddress(), entry.details(), entry.createdAt());
    }
}
