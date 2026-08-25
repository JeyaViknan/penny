package com.penny.exception;

import org.springframework.http.HttpStatus;

public class IdempotencyKeyConflictException extends PennyException {

    public IdempotencyKeyConflictException(String message) {
        super(message);
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.CONFLICT;
    }
}
