package com.ledgerlite.mapper;

import com.ledgerlite.domain.Account;
import com.ledgerlite.dto.AccountResponse;
import org.springframework.stereotype.Component;

@Component
public class AccountMapper {

    /**
     * {@code ownerUsername} is passed in rather than looked up here so callers
     * rendering a list can resolve every owner in one query instead of issuing
     * one per account.
     */
    public AccountResponse toResponse(Account account, long balanceMinorUnits, String ownerUsername) {
        return new AccountResponse(
                account.id(),
                account.accountNumber(),
                account.ownerUserId(),
                ownerUsername,
                account.accountType(),
                account.status(),
                account.currency(),
                balanceMinorUnits,
                account.createdAt());
    }
}
