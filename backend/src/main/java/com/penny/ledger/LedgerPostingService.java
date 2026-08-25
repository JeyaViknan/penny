package com.penny.ledger;

import com.penny.audit.Audited;
import com.penny.domain.LedgerEntry;
import com.penny.domain.Transaction;
import com.penny.domain.TransactionType;
import com.penny.repository.LedgerEntryRepository;
import com.penny.repository.TransactionRepository;
import org.springframework.stereotype.Service;

/**
 * The only class in the system that writes {@link LedgerEntry} rows. Every
 * posting writes exactly one debit and one credit of equal amount inside one
 * transaction, so "total debits == total credits" holds by construction.
 *
 * <p>Isolated from its callers specifically so {@link Audited} sits on a method
 * that runs once per actual money movement. AOP only intercepts calls that go
 * through the Spring proxy -- if this logic were a private method of
 * {@code TransferService}, an idempotent replay would self-invoke it and either
 * miss the audit row or write a misleading duplicate.
 *
 * <p>The three public entry points exist so each money movement gets its own
 * audit action; they all delegate to the same posting routine, which is what
 * keeps the double-entry rule in exactly one place.
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
    public PostingResult postTransfer(Long sourceAccountId, Long destinationAccountId, long amount,
                                       String reference, Long initiatedByUserId) {
        return post(sourceAccountId, destinationAccountId, amount, reference, TransactionType.TRANSFER, initiatedByUserId);
    }

    /** Money entering the ledger: the vault is debited, the customer credited. */
    @Audited(action = "DEPOSIT", entityType = "Transaction")
    public PostingResult postDeposit(Long vaultAccountId, Long customerAccountId, long amount,
                                      String reference, Long initiatedByUserId) {
        return post(vaultAccountId, customerAccountId, amount, reference, TransactionType.DEPOSIT, initiatedByUserId);
    }

    /** Money leaving the ledger: the customer is debited, the vault credited. */
    @Audited(action = "WITHDRAWAL", entityType = "Transaction")
    public PostingResult postWithdrawal(Long customerAccountId, Long vaultAccountId, long amount,
                                         String reference, Long initiatedByUserId) {
        return post(customerAccountId, vaultAccountId, amount, reference, TransactionType.WITHDRAWAL, initiatedByUserId);
    }

    private PostingResult post(Long debitAccountId, Long creditAccountId, long amount, String reference,
                                TransactionType type, Long initiatedByUserId) {
        Transaction transaction = transactionRepository.save(
                Transaction.newTransaction(reference, type, initiatedByUserId));

        ledgerEntryRepository.save(LedgerEntry.debit(transaction.id(), debitAccountId, amount));
        ledgerEntryRepository.save(LedgerEntry.credit(transaction.id(), creditAccountId, amount));

        return new PostingResult(transaction.id(), debitAccountId, creditAccountId, amount,
                transaction.reference(), type, transaction.createdAt());
    }
}
