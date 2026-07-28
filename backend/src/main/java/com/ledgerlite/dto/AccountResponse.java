package com.ledgerlite.dto;

import com.ledgerlite.domain.AccountStatus;
import com.ledgerlite.domain.AccountType;
import java.time.Instant;

public record AccountResponse(
        Long id,
        String accountNumber,
        Long ownerUserId,
        AccountType accountType,
        AccountStatus status,
        String currency,
        long balanceMinorUnits,
        Instant createdAt
) {
}
