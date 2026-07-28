package com.ledgerlite.ledger;

import com.ledgerlite.domain.Account;
import com.ledgerlite.domain.EntryType;
import com.ledgerlite.domain.LedgerEntry;
import com.ledgerlite.domain.Transaction;
import com.ledgerlite.dto.TransferRequest;
import com.ledgerlite.dto.TransferResponse;
import com.ledgerlite.exception.InactiveAccountException;
import com.ledgerlite.exception.InsufficientBalanceException;
import com.ledgerlite.exception.ResourceNotFoundException;
import com.ledgerlite.exception.SameAccountTransferException;
import com.ledgerlite.repository.LedgerEntryRepository;
import com.ledgerlite.repository.TransactionRepository;
import com.ledgerlite.service.AccountService;
import java.util.List;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The only code path that is allowed to write {@link LedgerEntry} rows.
 * Every transfer posts exactly one debit and one credit of equal amount
 * in a single transaction, so "total debits == total credits" holds by
 * construction rather than by a reconciliation job.
 *
 * <p>Balance checks here read through {@link LedgerService#getBalance}
 * without a row lock -- correct for a single writer, but racy under
 * concurrent transfers against the same account. Phase 4 adds pessimistic
 * locking on the source account to close that race without changing this
 * method's contract.
 */
@Service
public class TransferService {

    private final AccountService accountService;
    private final LedgerService ledgerService;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    public TransferService(AccountService accountService,
                            LedgerService ledgerService,
                            TransactionRepository transactionRepository,
                            LedgerEntryRepository ledgerEntryRepository) {
        this.accountService = accountService;
        this.ledgerService = ledgerService;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER') or @accountAccessGuard.isOwner(#request.sourceAccountId, authentication)")
    public TransferResponse transfer(TransferRequest request, Long initiatedByUserId) {
        if (request.sourceAccountId().equals(request.destinationAccountId())) {
            throw new SameAccountTransferException();
        }

        Account source = accountService.getById(request.sourceAccountId());
        Account destination = accountService.getById(request.destinationAccountId());

        requireActive(source);
        requireActive(destination);

        long amount = request.amountMinorUnits();
        if (ledgerService.getBalance(source.id()) < amount) {
            throw new InsufficientBalanceException(source.id());
        }

        Transaction transaction = transactionRepository.save(
                Transaction.newTransaction(request.reference(), initiatedByUserId));

        ledgerEntryRepository.save(LedgerEntry.debit(transaction.id(), source.id(), amount));
        ledgerEntryRepository.save(LedgerEntry.credit(transaction.id(), destination.id(), amount));

        return new TransferResponse(transaction.id(), source.id(), destination.id(), amount,
                transaction.reference(), transaction.createdAt());
    }

    @PostAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'TELLER') "
            + "or @accountAccessGuard.isOwner(returnObject.sourceAccountId(), authentication) "
            + "or @accountAccessGuard.isOwner(returnObject.destinationAccountId(), authentication)")
    public TransferResponse getTransfer(Long transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("No transfer with id: " + transactionId));

        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionId(transactionId);
        LedgerEntry debit = entries.stream().filter(e -> e.entryType() == EntryType.DEBIT).findFirst()
                .orElseThrow(() -> new IllegalStateException("Transaction " + transactionId + " is missing its debit entry"));
        LedgerEntry credit = entries.stream().filter(e -> e.entryType() == EntryType.CREDIT).findFirst()
                .orElseThrow(() -> new IllegalStateException("Transaction " + transactionId + " is missing its credit entry"));

        return new TransferResponse(transaction.id(), debit.accountId(), credit.accountId(),
                debit.amountMinorUnits(), transaction.reference(), transaction.createdAt());
    }

    private void requireActive(Account account) {
        if (!account.status().canTransact()) {
            throw new InactiveAccountException(account.id());
        }
    }
}
