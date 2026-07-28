package com.ledgerlite.domain;

public enum AccountStatus {
    ACTIVE,
    INACTIVE,
    CLOSED;

    public boolean canTransact() {
        return this == ACTIVE;
    }
}
