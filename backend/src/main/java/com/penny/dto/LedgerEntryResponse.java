package com.penny.dto;

import com.penny.domain.EntryType;
import java.time.Instant;

public record LedgerEntryResponse(
        Long id,
        Long transactionId,
        Long accountId,
        EntryType entryType,
        long amountMinorUnits,
        Instant createdAt
) {
}
