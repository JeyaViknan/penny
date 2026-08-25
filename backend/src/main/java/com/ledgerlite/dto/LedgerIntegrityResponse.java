package com.ledgerlite.dto;

public record LedgerIntegrityResponse(
        boolean balanced,
        long totalDebitsMinorUnits,
        long totalCreditsMinorUnits,
        long netAcrossAllAccountsMinorUnits,
        long ledgerEntryCount
) {
}
