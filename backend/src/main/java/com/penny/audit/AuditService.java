package com.penny.audit;

import com.penny.domain.AuditLogEntry;
import com.penny.repository.AuditLogRepository;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

/** Read side of the audit trail. Writes only ever happen via {@link AuditAspect}. */
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public List<AuditLogEntry> listAll() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public List<AuditLogEntry> listForEntity(String entityType, String entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId);
    }
}
