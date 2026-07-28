package com.ledgerlite.exception;

import org.springframework.http.HttpStatus;

public class SameAccountTransferException extends LedgerLiteException {

    public SameAccountTransferException() {
        super("Source and destination accounts must be different");
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.BAD_REQUEST;
    }
}
