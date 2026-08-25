package com.penny.dto;

import com.penny.domain.EntryType;
import java.time.Instant;

/**
 * One posting against an account.
 *
 * <p>{@code runningBalanceMinorUnits} is the account's balance immediately after
 * this entry, accumulated over the account's full history rather than the
 * current page -- see {@link com.penny.repository.LedgerEntrySearchRepository}.
 *
 * <p>It is <b>null</b> when the entries were not requested as a single account's
 * sequence -- for instance the two legs of one transaction, which sit on
 * different accounts and therefore share no meaningful running total. Returning
 * zero there would read as "balance is nil" rather than "not applicable".
 */
public record LedgerEntryResponse(
        Long id,
        Long transactionId,
        Long accountId,
        EntryType entryType,
        long amountMinorUnits,
        Long runningBalanceMinorUnits,
        Instant createdAt
) {
}
