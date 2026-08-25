package com.ledgerlite.dto;

import com.ledgerlite.domain.TransactionType;
import java.time.Instant;

public record CashResponse(
        Long transactionId,
        TransactionType transactionType,
        Long accountId,
        long amountMinorUnits,
        long resultingBalanceMinorUnits,
        String reference,
        Instant createdAt
) {
}
