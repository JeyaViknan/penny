package com.penny.exception;

import org.springframework.http.HttpStatus;

public class SameAccountTransferException extends PennyException {

    public SameAccountTransferException() {
        super("Source and destination accounts must be different");
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.BAD_REQUEST;
    }
}
