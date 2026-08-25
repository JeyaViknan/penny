package com.ledgerlite.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

/**
 * The header for a money movement. Deliberately carries no amount or
 * account fields -- those live only in its {@link LedgerEntry} rows, so
 * the invariant "total debits == total credits" is the only place amounts
 * are asserted, not duplicated here.
 */
@Table("transactions")
public record Transaction(
        @Id Long id,
        String reference,
        TransactionType transactionType,
        Long initiatedByUserId,
        Instant createdAt
) {

    public static Transaction newTransaction(String reference, TransactionType type, Long initiatedByUserId) {
        return new Transaction(null, reference, type, initiatedByUserId, Instant.now());
    }

    public Transaction withId(Long id) {
        return new Transaction(id, reference, transactionType, initiatedByUserId, createdAt);
    }
}
