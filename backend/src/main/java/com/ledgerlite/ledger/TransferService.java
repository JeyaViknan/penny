package com.ledgerlite.ledger;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerlite.domain.Account;
import com.ledgerlite.domain.EntryType;
import com.ledgerlite.domain.IdempotencyKeyRecord;
import com.ledgerlite.domain.LedgerEntry;
import com.ledgerlite.domain.Transaction;
import com.ledgerlite.dto.TransferRequest;
import com.ledgerlite.dto.TransferResponse;
import com.ledgerlite.exception.IdempotencyKeyConflictException;
import com.ledgerlite.exception.InactiveAccountException;
import com.ledgerlite.exception.InsufficientBalanceException;
import com.ledgerlite.exception.ResourceNotFoundException;
import com.ledgerlite.exception.SameAccountTransferException;
import com.ledgerlite.repository.AccountRepository;
import com.ledgerlite.repository.LedgerEntryRepository;
import com.ledgerlite.repository.TransactionRepository;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.relational.core.conversion.DbActionExecutionException;
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
 * <p>Both accounts are locked with {@code SELECT ... FOR UPDATE} (see
 * {@link AccountRepository#lockById}) before the balance is read, always
 * in ascending account-id order so two transfers in opposite directions
 * between the same pair of accounts can't deadlock each other. The
 * balance re-read after acquiring the lock is what makes the check race
 * free: under Postgres READ COMMITTED, a fresh statement issued after a
 * lock wait sees whatever the previous lock holder committed.
 */
@Service
public class TransferService {

    private final AccountRepository accountRepository;
    private final LedgerService ledgerService;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    public TransferService(AccountRepository accountRepository,
                            LedgerService ledgerService,
                            TransactionRepository transactionRepository,
                            LedgerEntryRepository ledgerEntryRepository,
                            IdempotencyService idempotencyService,
                            ObjectMapper objectMapper) {
        this.accountRepository = accountRepository;
        this.ledgerService = ledgerService;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.idempotencyService = idempotencyService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER') or @accountAccessGuard.isOwner(#request.sourceAccountId, authentication)")
    public TransferResponse transfer(TransferRequest request, Long initiatedByUserId, String idempotencyKey) {
        if (request.sourceAccountId().equals(request.destinationAccountId())) {
            throw new SameAccountTransferException();
        }

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return postTransfer(request, initiatedByUserId);
        }
        return transferIdempotently(request, initiatedByUserId, idempotencyKey);
    }

    private TransferResponse transferIdempotently(TransferRequest request, Long initiatedByUserId, String idempotencyKey) {
        String requestHash = idempotencyService.hashRequest(request);

        Long claimId;
        try {
            // Runs on a SAVEPOINT: a unique-constraint conflict here only
            // rolls back to the savepoint, not the whole transfer transaction.
            // Spring Data JDBC wraps the translated DataIntegrityViolationException
            // in a DbActionExecutionException, so unwrap before deciding whether
            // this is really a duplicate key (and not some other failure).
            claimId = idempotencyService.tryClaim(initiatedByUserId, idempotencyKey, requestHash);
        } catch (DbActionExecutionException wrapped) {
            if (!(wrapped.getCause() instanceof DataIntegrityViolationException)) {
                throw wrapped;
            }
            IdempotencyKeyRecord existing = idempotencyService.requireExisting(initiatedByUserId, idempotencyKey);
            if (!existing.requestHash().equals(requestHash)) {
                throw new IdempotencyKeyConflictException(
                        "Idempotency-Key " + idempotencyKey + " was already used with a different request payload");
            }
            if (!existing.isCompleted()) {
                throw new IdempotencyKeyConflictException(
                        "Idempotency-Key " + idempotencyKey + " is already being processed");
            }
            return decode(existing.responseBody());
        }

        TransferResponse response = postTransfer(request, initiatedByUserId);
        idempotencyService.completeClaim(claimId, 201, encode(response));
        return response;
    }

    private TransferResponse postTransfer(TransferRequest request, Long initiatedByUserId) {
        long firstId = Math.min(request.sourceAccountId(), request.destinationAccountId());
        long secondId = Math.max(request.sourceAccountId(), request.destinationAccountId());

        Account firstLocked = lockAccount(firstId);
        Account secondLocked = lockAccount(secondId);

        Account source = request.sourceAccountId() == firstId ? firstLocked : secondLocked;
        Account destination = request.destinationAccountId() == firstId ? firstLocked : secondLocked;

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

    private Account lockAccount(long id) {
        return accountRepository.lockById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No account with id: " + id));
    }

    private void requireActive(Account account) {
        if (!account.status().canTransact()) {
            throw new InactiveAccountException(account.id());
        }
    }

    private String encode(TransferResponse response) {
        try {
            return objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize transfer response for idempotency storage", e);
        }
    }

    private TransferResponse decode(String json) {
        try {
            return objectMapper.readValue(json, TransferResponse.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize stored idempotent transfer response", e);
        }
    }
}
