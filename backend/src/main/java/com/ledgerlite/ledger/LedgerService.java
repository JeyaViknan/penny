package com.ledgerlite.ledger;

import com.ledgerlite.domain.LedgerEntry;
import com.ledgerlite.repository.AccountBalanceRepository;
import com.ledgerlite.repository.LedgerEntryRepository;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Read side of the ledger: balances and entry history. The write side
 * (posting entries for a transfer) lives in {@code TransferService},
 * introduced alongside the Transfer API so the invariant checks and the
 * act of posting stay in one transactional boundary.
 */
@Service
public class LedgerService {

    private final LedgerEntryRepository ledgerEntryRepository;
    private final AccountBalanceRepository accountBalanceRepository;

    public LedgerService(LedgerEntryRepository ledgerEntryRepository, AccountBalanceRepository accountBalanceRepository) {
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.accountBalanceRepository = accountBalanceRepository;
    }

    public long getBalance(Long accountId) {
        return accountBalanceRepository.findById(accountId)
                .map(com.ledgerlite.domain.AccountBalance::balanceMinorUnits)
                .orElse(0L);
    }

    public List<LedgerEntry> getEntriesForAccount(Long accountId) {
        return ledgerEntryRepository.findByAccountIdOrderByCreatedAtDesc(accountId);
    }
}
