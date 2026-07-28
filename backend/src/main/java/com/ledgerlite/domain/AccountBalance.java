package com.ledgerlite.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

/**
 * Read-only projection over the {@code account_balances} database view.
 * There is deliberately no repository save method wired for this type --
 * it is derived data and must never be written directly.
 */
@Table("account_balances")
public record AccountBalance(
        @Id Long accountId,
        String accountNumber,
        long balanceMinorUnits
) {
}
