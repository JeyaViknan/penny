package com.ledgerlite.exception;

import org.springframework.http.HttpStatus;

/** Raised when a caller targets an institution-owned account as if it were a customer account. */
public class SystemAccountException extends LedgerLiteException {

    public SystemAccountException(Long accountId) {
        super("Account " + accountId + " is a system account and cannot be used for this operation");
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.BAD_REQUEST;
    }
}
