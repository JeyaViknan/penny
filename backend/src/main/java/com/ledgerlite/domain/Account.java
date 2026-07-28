package com.ledgerlite.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

/**
 * The account row itself never carries a balance -- see {@link AccountBalance},
 * which is backed by the {@code account_balances} database view computed from
 * {@link LedgerEntry} rows. This type only carries identity and status.
 */
@Table("accounts")
public record Account(
        @Id Long id,
        String accountNumber,
        Long ownerUserId,
        AccountType accountType,
        AccountStatus status,
        String currency,
        Instant createdAt
) {

    public static Account newAccount(String accountNumber, Long ownerUserId, AccountType accountType, String currency) {
        return new Account(null, accountNumber, ownerUserId, accountType, AccountStatus.ACTIVE, currency, Instant.now());
    }

    public Account withId(Long id) {
        return new Account(id, accountNumber, ownerUserId, accountType, status, currency, createdAt);
    }
}
