package com.ledgerlite.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

/**
 * A single append-only posting. The database enforces immutability with
 * triggers that reject UPDATE/DELETE (see V3__create_ledger.sql) -- this
 * class has no setters and no {@code withId}-driven mutation path beyond
 * initial insert, matching that guarantee in the application layer too.
 */
@Table("ledger_entries")
public record LedgerEntry(
        @Id Long id,
        Long transactionId,
        Long accountId,
        EntryType entryType,
        long amountMinorUnits,
        Instant createdAt
) {

    public static LedgerEntry debit(Long transactionId, Long accountId, long amountMinorUnits) {
        return new LedgerEntry(null, transactionId, accountId, EntryType.DEBIT, amountMinorUnits, Instant.now());
    }

    public static LedgerEntry credit(Long transactionId, Long accountId, long amountMinorUnits) {
        return new LedgerEntry(null, transactionId, accountId, EntryType.CREDIT, amountMinorUnits, Instant.now());
    }

    public LedgerEntry withId(Long id) {
        return new LedgerEntry(id, transactionId, accountId, entryType, amountMinorUnits, createdAt);
    }
}
