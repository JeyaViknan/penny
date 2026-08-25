package com.penny.dto;

import com.penny.domain.AccountStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeAccountStatusRequest(@NotNull(message = "status is required") AccountStatus status) {
}
