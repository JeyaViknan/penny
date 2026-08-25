package com.penny.exception;

import org.springframework.http.HttpStatus;

public class InvalidStatusTransitionException extends PennyException {

    public InvalidStatusTransitionException(String message) {
        super(message);
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.CONFLICT;
    }
}
