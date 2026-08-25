package com.ledgerlite.domain;

public enum AccountType {
    CHECKING,
    SAVINGS,

    /**
     * Institution-owned account with no user owner, used as the counterparty
     * for money entering or leaving the ledger (see the cash vault seeded in
     * V6). Never exposed as a transferable account to customers.
     */
    SYSTEM;

    public boolean isCustomerFacing() {
        return this != SYSTEM;
    }
}
