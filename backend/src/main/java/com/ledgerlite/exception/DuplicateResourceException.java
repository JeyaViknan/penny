package com.ledgerlite.exception;

import org.springframework.http.HttpStatus;

public class DuplicateResourceException extends LedgerLiteException {

    public DuplicateResourceException(String message) {
        super(message);
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.CONFLICT;
    }
}
