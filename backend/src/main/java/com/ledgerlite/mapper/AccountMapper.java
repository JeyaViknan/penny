package com.ledgerlite.mapper;

import com.ledgerlite.domain.Account;
import com.ledgerlite.dto.AccountResponse;
import org.springframework.stereotype.Component;

@Component
public class AccountMapper {

    public AccountResponse toResponse(Account account, long balanceMinorUnits) {
        return new AccountResponse(
                account.id(),
                account.accountNumber(),
                account.ownerUserId(),
                account.accountType(),
                account.status(),
                account.currency(),
                balanceMinorUnits,
                account.createdAt());
    }
}
