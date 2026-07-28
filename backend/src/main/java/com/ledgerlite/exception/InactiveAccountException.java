package com.ledgerlite.exception;

import org.springframework.http.HttpStatus;

public class InactiveAccountException extends LedgerLiteException {

    public InactiveAccountException(Long accountId) {
        super("Account " + accountId + " is not active");
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.CONFLICT;
    }
}
