package com.penny.ledger;

import com.penny.dto.LedgerEntryResponse;
import com.penny.dto.PageResponse;
import com.penny.repository.AccountBalanceRepository;
import com.penny.repository.LedgerEntryRepository;
import com.penny.repository.LedgerEntrySearchRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.springframework.stereotype.Service;

/**
 * Read side of the ledger: balances and entry history. The write side lives in
 * {@link LedgerPostingService}, so posting and its invariant checks stay in one
 * transactional boundary.
 */
@Service
public class LedgerService {

    private static final int MAX_PAGE_SIZE = 200;

    private final LedgerEntryRepository ledgerEntryRepository;
    private final LedgerEntrySearchRepository ledgerEntrySearchRepository;
    private final AccountBalanceRepository accountBalanceRepository;

    public LedgerService(LedgerEntryRepository ledgerEntryRepository,
                          LedgerEntrySearchRepository ledgerEntrySearchRepository,
                          AccountBalanceRepository accountBalanceRepository) {
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.ledgerEntrySearchRepository = ledgerEntrySearchRepository;
        this.accountBalanceRepository = accountBalanceRepository;
    }

    public long getBalance(Long accountId) {
        return accountBalanceRepository.findById(accountId)
                .map(com.penny.domain.AccountBalance::balanceMinorUnits)
                .orElse(0L);
    }

    /**
     * Balances for many accounts in one query.
     *
     * <p>Replaces a per-row {@link #getBalance} call when rendering a list --
     * that was an N+1, issuing one aggregate query per account on every request
     * to {@code GET /accounts}.
     */
    public Map<Long, Long> getBalances(List<Long> accountIds) {
        if (accountIds.isEmpty()) {
            return Map.of();
        }
        return StreamSupport.stream(accountBalanceRepository.findAllById(accountIds).spliterator(), false)
                .collect(Collectors.toMap(
                        com.penny.domain.AccountBalance::accountId,
                        com.penny.domain.AccountBalance::balanceMinorUnits));
    }

    /** Paged account ledger, each entry carrying the running balance after it. */
    public PageResponse<LedgerEntryResponse> getEntriesForAccount(Long accountId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);

        long total = ledgerEntrySearchRepository.count(accountId);
        List<LedgerEntryResponse> items =
                ledgerEntrySearchRepository.findPage(accountId, safeSize, (long) safePage * safeSize);

        return PageResponse.of(items, safePage, safeSize, total);
    }

    /**
     * Both legs of one transaction. Seeing the debit and the credit side by side
     * is what makes the double-entry concrete rather than asserted.
     */
    public List<LedgerEntryResponse> getEntriesForTransaction(Long transactionId) {
        return ledgerEntryRepository.findByTransactionId(transactionId).stream()
                // Running balance is null, not zero: these two legs sit on
                // different accounts, so they share no meaningful running total.
                .map(e -> new LedgerEntryResponse(
                        e.id(), e.transactionId(), e.accountId(), e.entryType(),
                        e.amountMinorUnits(), null, e.createdAt()))
                .toList();
    }
}
