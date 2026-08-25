package com.ledgerlite.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Request body for a deposit or withdrawal against a single account. */
public record CashRequest(
        @NotNull(message = "amountMinorUnits is required")
        @Positive(message = "amountMinorUnits must be positive")
        Long amountMinorUnits,

        @NotBlank(message = "reference is required")
        @Size(max = 140, message = "reference must be at most 140 characters")
        String reference
) {
}
