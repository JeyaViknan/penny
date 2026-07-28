package com.ledgerlite.mapper;

import com.ledgerlite.domain.LedgerEntry;
import com.ledgerlite.dto.LedgerEntryResponse;
import org.springframework.stereotype.Component;

@Component
public class LedgerMapper {

    public LedgerEntryResponse toResponse(LedgerEntry entry) {
        return new LedgerEntryResponse(
                entry.id(), entry.transactionId(), entry.accountId(), entry.entryType(),
                entry.amountMinorUnits(), entry.createdAt());
    }
}
