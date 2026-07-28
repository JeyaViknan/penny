package com.ledgerlite.exception;

import org.springframework.http.HttpStatus;

public class IdempotencyKeyConflictException extends LedgerLiteException {

    public IdempotencyKeyConflictException(String message) {
        super(message);
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.CONFLICT;
    }
}
