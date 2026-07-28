package com.ledgerlite.repository;

import com.ledgerlite.domain.AuditLogEntry;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface AuditLogRepository extends CrudRepository<AuditLogEntry, Long> {

    List<AuditLogEntry> findAllByOrderByCreatedAtDesc();

    List<AuditLogEntry> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, String entityId);
}
