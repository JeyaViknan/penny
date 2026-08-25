package com.penny.exception;

import org.springframework.http.HttpStatus;

/** Base for all domain exceptions so the global handler can map them to HTTP status generically. */
public abstract class PennyException extends RuntimeException {

    protected PennyException(String message) {
        super(message);
    }

    public abstract HttpStatus status();
}
