package com.penny.dto;

import com.penny.domain.TransactionType;
import java.time.Instant;

/**
 * Carries account numbers alongside the internal ids: the id is what the API
 * links by, but the number is the only identifier a customer recognises, and a
 * receipt showing "Account #4" is meaningless to the person holding it.
 */
public record TransferResponse(
        Long transactionId,
        TransactionType transactionType,
        Long sourceAccountId,
        String sourceAccountNumber,
        Long destinationAccountId,
        String destinationAccountNumber,
        long amountMinorUnits,
        String reference,
        Instant createdAt
) {
}
