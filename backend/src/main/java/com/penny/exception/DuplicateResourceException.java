package com.penny.exception;

import org.springframework.http.HttpStatus;

public class DuplicateResourceException extends PennyException {

    public DuplicateResourceException(String message) {
        super(message);
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.CONFLICT;
    }
}
