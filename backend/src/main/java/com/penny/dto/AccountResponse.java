package com.penny.dto;

import com.penny.domain.AccountStatus;
import com.penny.domain.AccountType;
import java.time.Instant;

public record AccountResponse(
        Long id,
        String accountNumber,
        Long ownerUserId,
        String ownerUsername,
        AccountType accountType,
        AccountStatus status,
        String currency,
        long balanceMinorUnits,
        Instant createdAt
) {
}
