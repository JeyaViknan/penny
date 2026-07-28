package com.ledgerlite.controller;

import com.ledgerlite.dto.LedgerEntryResponse;
import com.ledgerlite.ledger.LedgerService;
import com.ledgerlite.mapper.LedgerMapper;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ledger")
@Tag(name = "Ledger")
public class LedgerController {

    private final LedgerService ledgerService;
    private final LedgerMapper ledgerMapper;

    public LedgerController(LedgerService ledgerService, LedgerMapper ledgerMapper) {
        this.ledgerService = ledgerService;
        this.ledgerMapper = ledgerMapper;
    }

    @GetMapping("/{accountId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'TELLER') or @accountAccessGuard.isOwner(#accountId, authentication)")
    public ResponseEntity<List<LedgerEntryResponse>> getLedgerForAccount(@PathVariable Long accountId) {
        var entries = ledgerService.getEntriesForAccount(accountId).stream()
                .map(ledgerMapper::toResponse)
                .toList();
        return ResponseEntity.ok(entries);
    }
}
