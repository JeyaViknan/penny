package com.ledgerlite.dto;

import com.ledgerlite.domain.TransactionType;
import java.time.Instant;

/**
 * A transaction as it appears in history: both legs flattened into one row.
 *
 * <p>Direction is deliberately not baked in, because it is only meaningful
 * relative to a particular account -- the same transfer is money out for the
 * debit side and money in for the credit side. Callers viewing a single
 * account derive it by comparing that account's id to {@code debitAccountId}.
 */
public record TransactionSummaryResponse(
        Long transactionId,
        TransactionType transactionType,
        String reference,
        long amountMinorUnits,
        Long debitAccountId,
        String debitAccountNumber,
        Long creditAccountId,
        String creditAccountNumber,
        Instant createdAt
) {
}
