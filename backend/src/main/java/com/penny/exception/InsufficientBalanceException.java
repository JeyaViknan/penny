package com.penny.exception;

import org.springframework.http.HttpStatus;

public class InsufficientBalanceException extends PennyException {

    public InsufficientBalanceException(Long accountId) {
        super("Account " + accountId + " has insufficient balance for this transfer");
    }

    @Override
    public HttpStatus status() {
        return HttpStatus.UNPROCESSABLE_ENTITY;
    }
}
