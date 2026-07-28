package com.ledgerlite.exception;

import org.springframework.http.HttpStatus;

public class InvalidTokenException extends LedgerLiteException {

    public InvalidTokenException(String message) {
        super(message);
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.UNAUTHORIZED;
    }
}
