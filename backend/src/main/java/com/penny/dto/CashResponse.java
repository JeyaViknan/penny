package com.penny.dto;

import com.penny.domain.TransactionType;
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
