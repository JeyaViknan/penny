package com.ledgerlite.dto;

import java.time.Instant;

public record TransferResponse(
        Long transactionId,
        Long sourceAccountId,
        Long destinationAccountId,
        long amountMinorUnits,
        String reference,
        Instant createdAt
) {
}
