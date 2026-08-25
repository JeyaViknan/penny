package com.penny.dto;

import com.penny.domain.TransactionType;
import java.time.Instant;

/**
 * A transaction as it appears in history: both legs flattened into one row.
 *
 * <p>Direction is deliberately not baked in, because it is only meaningful
 * relative to a particular account -- the same transfer is money out for the
 * debit side and money in for the credit side. Callers viewing a single account
 * derive it by comparing that account's id to {@code debitAccountId}.
 *
 * <p>Owner and initiator usernames are resolved by the service in one batched
 * lookup. The underlying view carries only their ids, and a ledger row that says
 * "user #4" instead of a name is not usable by an operator.
 */
public record TransactionSummaryResponse(
        Long transactionId,
        TransactionType transactionType,
        String reference,
        long amountMinorUnits,
        Long debitAccountId,
        String debitAccountNumber,
        String debitOwnerUsername,
        Long creditAccountId,
        String creditAccountNumber,
        String creditOwnerUsername,
        Long initiatedByUserId,
        String initiatedByUsername,
        Instant createdAt
) {
}
