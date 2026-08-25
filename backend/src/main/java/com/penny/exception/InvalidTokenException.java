package com.penny.exception;

import org.springframework.http.HttpStatus;

public class InvalidTokenException extends PennyException {

    public InvalidTokenException(String message) {
        super(message);
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.UNAUTHORIZED;
    }
}
