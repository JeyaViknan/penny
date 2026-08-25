package com.ledgerlite.exception;

import org.springframework.http.HttpStatus;

public class InvalidStatusTransitionException extends LedgerLiteException {

    public InvalidStatusTransitionException(String message) {
        super(message);
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.CONFLICT;
    }
}
