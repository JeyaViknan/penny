package com.penny.controller;

import com.penny.dto.LedgerEntryResponse;
import com.penny.dto.LedgerIntegrityResponse;
import com.penny.dto.PageResponse;
import com.penny.ledger.LedgerIntegrityService;
import com.penny.ledger.LedgerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ledger")
@Tag(name = "Ledger")
public class LedgerController {

    private final LedgerService ledgerService;
    private final LedgerIntegrityService ledgerIntegrityService;

    public LedgerController(LedgerService ledgerService, LedgerIntegrityService ledgerIntegrityService) {
        this.ledgerService = ledgerService;
        this.ledgerIntegrityService = ledgerIntegrityService;
    }

    @GetMapping("/integrity")
    @Operation(summary = "Re-derive ledger totals from raw entries and assert the books balance")
    public ResponseEntity<LedgerIntegrityResponse> integrity() {
        return ResponseEntity.ok(ledgerIntegrityService.check());
    }

    @GetMapping("/transaction/{transactionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'TELLER')")
    @Operation(summary = "Both legs of one transaction — the debit and the credit side")
    public ResponseEntity<List<LedgerEntryResponse>> getEntriesForTransaction(@PathVariable Long transactionId) {
        return ResponseEntity.ok(ledgerService.getEntriesForTransaction(transactionId));
    }

    @GetMapping("/{accountId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'TELLER') or @accountAccessGuard.isOwner(#accountId, authentication)")
    @Operation(summary = "Paged account ledger; each entry carries the running balance after it")
    public ResponseEntity<PageResponse<LedgerEntryResponse>> getLedgerForAccount(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ledgerService.getEntriesForAccount(accountId, page, size));
    }
}
