package com.ledgerlite.domain;

import java.util.EnumSet;
import java.util.Set;

public enum AccountStatus {
    ACTIVE,
    /** Temporarily frozen: no postings, but the account can be reactivated. */
    INACTIVE,
    /** Terminal state. A closed account can never transact or reopen. */
    CLOSED;

    public boolean canTransact() {
        return this == ACTIVE;
    }

    /**
     * Legal next states. CLOSED is deliberately terminal -- reopening a closed
     * account would make the ledger's history ambiguous about which account a
     * number referred to at a given time.
     */
    public Set<AccountStatus> allowedTransitions() {
        return switch (this) {
            case ACTIVE -> EnumSet.of(INACTIVE, CLOSED);
            case INACTIVE -> EnumSet.of(ACTIVE, CLOSED);
            case CLOSED -> EnumSet.noneOf(AccountStatus.class);
        };
    }

    public boolean canTransitionTo(AccountStatus target) {
        return allowedTransitions().contains(target);
    }
}
