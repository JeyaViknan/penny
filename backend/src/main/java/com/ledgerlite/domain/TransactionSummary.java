package com.ledgerlite.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

/**
 * Read-only projection over the {@code transaction_summaries} view: one row per
 * transaction, flattening its debit and credit legs into a single
 * "from / to / amount" shape for history views.
 *
 * <p>The owner ids are carried so authorization can be filtered in SQL rather
 * than after paging. There is deliberately no repository {@code save} for this
 * type -- it is derived data.
 */
@Table("transaction_summaries")
public record TransactionSummary(
        @Id Long transactionId,
        TransactionType transactionType,
        String reference,
        long amountMinorUnits,
        Long debitAccountId,
        String debitAccountNumber,
        Long debitOwnerUserId,
        Long creditAccountId,
        String creditAccountNumber,
        Long creditOwnerUserId,
        Long initiatedByUserId,
        Instant createdAt
) {
}
