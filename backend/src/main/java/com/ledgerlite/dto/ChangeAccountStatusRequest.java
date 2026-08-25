package com.ledgerlite.dto;

import com.ledgerlite.domain.AccountStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeAccountStatusRequest(@NotNull(message = "status is required") AccountStatus status) {
}
