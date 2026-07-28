package com.ledgerlite.exception;

import org.springframework.http.HttpStatus;

public class InsufficientBalanceException extends LedgerLiteException {

    public InsufficientBalanceException(Long accountId) {
        super("Account " + accountId + " has insufficient balance for this transfer");
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.UNPROCESSABLE_ENTITY;
    }
}
