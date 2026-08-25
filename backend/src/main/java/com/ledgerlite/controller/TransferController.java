package com.ledgerlite.controller;

import com.ledgerlite.dto.PageResponse;
import com.ledgerlite.dto.TransactionSummaryResponse;
import com.ledgerlite.dto.TransferRequest;
import com.ledgerlite.dto.TransferResponse;
import com.ledgerlite.ledger.TransactionHistoryService;
import com.ledgerlite.ledger.TransferService;
import com.ledgerlite.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/transfers")
@Tag(name = "Transfers")
public class TransferController {

    private final TransferService transferService;
    private final TransactionHistoryService transactionHistoryService;

    public TransferController(TransferService transferService, TransactionHistoryService transactionHistoryService) {
        this.transferService = transferService;
        this.transactionHistoryService = transactionHistoryService;
    }

    @PostMapping
    @Operation(summary = "Move money between two accounts; pass Idempotency-Key to make retries safe")
    public ResponseEntity<TransferResponse> createTransfer(
            @Valid @RequestBody TransferRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        var response = transferService.transfer(request, principal.getId(), idempotencyKey);
        return ResponseEntity.created(URI.create("/transfers/" + response.transactionId())).body(response);
    }

    @GetMapping
    @Operation(summary = "Paged transaction history; a CUSTOMER sees only transactions touching their accounts")
    public ResponseEntity<PageResponse<TransactionSummaryResponse>> history(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Long accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(transactionHistoryService.history(principal, accountId, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransferResponse> getTransfer(@PathVariable Long id) {
        return ResponseEntity.ok(transferService.getTransfer(id));
    }
}
