package com.ledgerlite.ledger;

import com.ledgerlite.domain.TransactionType;
import java.time.Instant;

/**
 * Neutral result of a ledger posting, in debit/credit terms rather than
 * "source/destination". Transfers, deposits and withdrawals are all the same
 * operation at this level -- only which side the customer account sits on
 * differs -- so the posting layer stays free of transfer-specific vocabulary
 * and each caller maps this into its own response DTO.
 */
public record PostingResult(
        Long transactionId,
        Long debitAccountId,
        Long creditAccountId,
        long amountMinorUnits,
        String reference,
        TransactionType transactionType,
        Instant createdAt
) {
}
