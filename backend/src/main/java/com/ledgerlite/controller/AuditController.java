package com.ledgerlite.controller;

import com.ledgerlite.audit.AuditService;
import com.ledgerlite.dto.AuditLogResponse;
import com.ledgerlite.mapper.AuditLogMapper;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/audit")
@Tag(name = "Audit")
public class AuditController {

    private final AuditService auditService;
    private final AuditLogMapper auditLogMapper;

    public AuditController(AuditService auditService, AuditLogMapper auditLogMapper) {
        this.auditService = auditService;
        this.auditLogMapper = auditLogMapper;
    }

    @GetMapping
    public ResponseEntity<List<AuditLogResponse>> listAudit() {
        var response = auditService.listAll().stream().map(auditLogMapper::toResponse).toList();
        return ResponseEntity.ok(response);
    }
}
