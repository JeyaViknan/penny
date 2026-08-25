package com.penny.dto;

public record LedgerIntegrityResponse(
        boolean balanced,
        long totalDebitsMinorUnits,
        long totalCreditsMinorUnits,
        long netAcrossAllAccountsMinorUnits,
        long ledgerEntryCount
) {
}
