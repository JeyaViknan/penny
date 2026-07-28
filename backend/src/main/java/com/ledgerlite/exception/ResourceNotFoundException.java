package com.ledgerlite.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends LedgerLiteException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.NOT_FOUND;
    }
}
