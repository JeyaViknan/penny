package com.ledgerlite.dto;

import com.ledgerlite.domain.AccountType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CreateAccountRequest(
        @NotNull(message = "ownerUserId is required")
        Long ownerUserId,

        @NotNull(message = "accountType is required")
        AccountType accountType,

        @Pattern(regexp = "^[A-Z]{3}$", message = "currency must be a 3-letter ISO 4217 code")
        String currency
) {

    public CreateAccountRequest {
        if (currency == null || currency.isBlank()) {
            currency = "USD";
        }
    }
}
