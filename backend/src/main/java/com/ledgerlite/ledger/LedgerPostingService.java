package com.ledgerlite.ledger;

import com.ledgerlite.audit.Audited;
import com.ledgerlite.domain.LedgerEntry;
import com.ledgerlite.domain.Transaction;
import com.ledgerlite.dto.TransferResponse;
import com.ledgerlite.repository.LedgerEntryRepository;
import com.ledgerlite.repository.TransactionRepository;
import org.springframework.stereotype.Service;

/**
 * Isolated from {@link TransferService} specifically so {@link Audited} can
 * be placed on a method that only ever runs once per actual money
 * movement. AOP method interception only applies to calls that go
 * through the Spring proxy -- if this logic lived as a private method
 * called from within TransferService, an idempotent replay would still
 * self-invoke it and produce a misleading second audit row for a transfer
 * that didn't actually happen again.
 */
@Service
public class LedgerPostingService {

    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    public LedgerPostingService(TransactionRepository transactionRepository, LedgerEntryRepository ledgerEntryRepository) {
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
    }

    @Audited(action = "TRANSFER", entityType = "Transaction")
    public TransferResponse post(Long sourceAccountId, Long destinationAccountId, long amount,
                                  String reference, Long initiatedByUserId) {
        Transaction transaction = transactionRepository.save(Transaction.newTransaction(reference, initiatedByUserId));

        ledgerEntryRepository.save(LedgerEntry.debit(transaction.id(), sourceAccountId, amount));
        ledgerEntryRepository.save(LedgerEntry.credit(transaction.id(), destinationAccountId, amount));

        return new TransferResponse(transaction.id(), sourceAccountId, destinationAccountId, amount,
                transaction.reference(), transaction.createdAt());
    }
}
