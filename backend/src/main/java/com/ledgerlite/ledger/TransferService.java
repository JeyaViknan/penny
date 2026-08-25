package com.ledgerlite.ledger;

import com.ledgerlite.domain.Account;
import com.ledgerlite.domain.TransactionSummary;
import com.ledgerlite.dto.TransferRequest;
import com.ledgerlite.dto.TransferResponse;
import com.ledgerlite.exception.ResourceNotFoundException;
import com.ledgerlite.exception.SameAccountTransferException;
import com.ledgerlite.exception.SystemAccountException;
import com.ledgerlite.repository.TransactionRepository;
import java.util.Map;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Customer-to-customer money movement. Validation and locking live here; the
 * actual double-entry write is delegated to {@link LedgerPostingService}, and
 * the shared preconditions to {@link PostingGuard}.
 */
@Service
public class TransferService {

    private final PostingGuard postingGuard;
    private final LedgerPostingService ledgerPostingService;
    private final IdempotencyService idempotencyService;
    private final TransactionRepository transactionRepository;

    public TransferService(PostingGuard postingGuard,
                            LedgerPostingService ledgerPostingService,
                            IdempotencyService idempotencyService,
                            TransactionRepository transactionRepository) {
        this.postingGuard = postingGuard;
        this.ledgerPostingService = ledgerPostingService;
        this.idempotencyService = idempotencyService;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER') or @accountAccessGuard.isOwner(#request.sourceAccountId, authentication)")
    public TransferResponse transfer(TransferRequest request, Long initiatedByUserId, String idempotencyKey) {
        if (request.sourceAccountId().equals(request.destinationAccountId())) {
            throw new SameAccountTransferException();
        }
        return idempotencyService.executeOnce(initiatedByUserId, idempotencyKey, request, TransferResponse.class,
                () -> postTransfer(request, initiatedByUserId));
    }

    private TransferResponse postTransfer(TransferRequest request, Long initiatedByUserId) {
        Map<Long, Account> locked = postingGuard.lockAll(request.sourceAccountId(), request.destinationAccountId());
        Account source = locked.get(request.sourceAccountId());
        Account destination = locked.get(request.destinationAccountId());

        // The cash vault is reachable by id, so it must be explicitly excluded
        // here -- otherwise a customer could "transfer" against the bank's own
        // account and mint balance, since the vault may run negative.
        requireCustomerAccount(source);
        requireCustomerAccount(destination);

        postingGuard.requireActive(source);
        postingGuard.requireActive(destination);
        postingGuard.requireSufficientFunds(source, request.amountMinorUnits());

        PostingResult posting = ledgerPostingService.postTransfer(
                source.id(), destination.id(), request.amountMinorUnits(), request.reference(), initiatedByUserId);

        return new TransferResponse(posting.transactionId(), posting.transactionType(),
                source.id(), source.accountNumber(), destination.id(), destination.accountNumber(),
                posting.amountMinorUnits(), posting.reference(), posting.createdAt());
    }

    @PostAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'TELLER') "
            + "or @accountAccessGuard.isOwner(returnObject.sourceAccountId(), authentication) "
            + "or @accountAccessGuard.isOwner(returnObject.destinationAccountId(), authentication)")
    public TransferResponse getTransfer(Long transactionId) {
        TransactionSummary summary = transactionRepository.findSummaryById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("No transfer with id: " + transactionId));

        return new TransferResponse(summary.transactionId(), summary.transactionType(),
                summary.debitAccountId(), summary.debitAccountNumber(),
                summary.creditAccountId(), summary.creditAccountNumber(),
                summary.amountMinorUnits(), summary.reference(), summary.createdAt());
    }

    private void requireCustomerAccount(Account account) {
        if (account.isSystemAccount()) {
            throw new SystemAccountException(account.id());
        }
    }

}
