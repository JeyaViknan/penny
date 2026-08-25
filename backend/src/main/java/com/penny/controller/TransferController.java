package com.penny.controller;

import com.penny.domain.TransactionType;
import com.penny.dto.PageResponse;
import com.penny.dto.TransactionSummaryResponse;
import com.penny.dto.TransferRequest;
import com.penny.dto.TransferResponse;
import com.penny.ledger.TransactionHistoryService;
import com.penny.ledger.TransferService;
import com.penny.repository.query.SortDirection;
import com.penny.repository.query.TransactionQuery;
import com.penny.repository.query.TransactionSort;
import com.penny.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Instant;
import java.util.Set;
import org.springframework.format.annotation.DateTimeFormat;
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
    @Operation(summary = "Filtered, sorted, paged transaction history; a CUSTOMER sees only transactions touching their accounts")
    public ResponseEntity<PageResponse<TransactionSummaryResponse>> history(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Set<TransactionType> type,
            // ISO-8601 instants, e.g. 2026-08-01T00:00:00Z
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) Long minAmount,
            @RequestParam(required = false) Long maxAmount,
            @RequestParam(required = false) TransactionSort sort,
            @RequestParam(required = false) SortDirection direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {

        var query = new TransactionQuery(null, accountId, q, type, from, to,
                minAmount, maxAmount, sort, direction, page, size);
        return ResponseEntity.ok(transactionHistoryService.history(principal, query));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransferResponse> getTransfer(@PathVariable Long id) {
        return ResponseEntity.ok(transferService.getTransfer(id));
    }
}
