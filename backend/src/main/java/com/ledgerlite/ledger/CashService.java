package com.ledgerlite.ledger;

import com.ledgerlite.domain.Account;
import com.ledgerlite.domain.TransactionType;
import com.ledgerlite.dto.CashRequest;
import com.ledgerlite.dto.CashResponse;
import com.ledgerlite.exception.ResourceNotFoundException;
import com.ledgerlite.exception.SystemAccountException;
import com.ledgerlite.repository.AccountRepository;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Money entering and leaving the ledger.
 *
 * <p>Neither operation is a one-sided balance edit: a deposit debits the cash
 * vault and credits the customer, a withdrawal does the reverse. Both legs are
 * posted through {@link LedgerPostingService} exactly like a transfer, so the
 * "debits equal credits" invariant is never suspended for cash operations --
 * which is precisely why the vault account exists.
 *
 * <p>Only staff may move cash. A customer cannot credit their own account.
 */
@Service
public class CashService {

    private final AccountRepository accountRepository;
    private final PostingGuard postingGuard;
    private final LedgerPostingService ledgerPostingService;
    private final IdempotencyService idempotencyService;
    private final LedgerService ledgerService;
    private final String vaultAccountNumber;

    public CashService(AccountRepository accountRepository,
                        PostingGuard postingGuard,
                        LedgerPostingService ledgerPostingService,
                        IdempotencyService idempotencyService,
                        LedgerService ledgerService,
                        @Value("${ledgerlite.vault-account-number}") String vaultAccountNumber) {
        this.accountRepository = accountRepository;
        this.postingGuard = postingGuard;
        this.ledgerPostingService = ledgerPostingService;
        this.idempotencyService = idempotencyService;
        this.ledgerService = ledgerService;
        this.vaultAccountNumber = vaultAccountNumber;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER')")
    public CashResponse deposit(Long accountId, CashRequest request, Long initiatedByUserId, String idempotencyKey) {
        return idempotencyService.executeOnce(initiatedByUserId, idempotencyKey, keyPayload("D", accountId, request),
                CashResponse.class, () -> post(accountId, request, initiatedByUserId, TransactionType.DEPOSIT));
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER')")
    public CashResponse withdraw(Long accountId, CashRequest request, Long initiatedByUserId, String idempotencyKey) {
        return idempotencyService.executeOnce(initiatedByUserId, idempotencyKey, keyPayload("W", accountId, request),
                CashResponse.class, () -> post(accountId, request, initiatedByUserId, TransactionType.WITHDRAWAL));
    }

    private CashResponse post(Long accountId, CashRequest request, Long initiatedByUserId, TransactionType type) {
        Account vault = vault();
        Map<Long, Account> locked = postingGuard.lockAll(accountId, vault.id());
        Account account = locked.get(accountId);

        if (account.isSystemAccount()) {
            throw new SystemAccountException(accountId);
        }
        postingGuard.requireActive(account);

        long amount = request.amountMinorUnits();
        PostingResult posting;
        if (type == TransactionType.DEPOSIT) {
            // The vault is exempt from the funds check by design; asserting it
            // anyway keeps the call symmetric with the withdrawal branch.
            postingGuard.requireSufficientFunds(locked.get(vault.id()), amount);
            posting = ledgerPostingService.postDeposit(vault.id(), account.id(), amount, request.reference(), initiatedByUserId);
        } else {
            postingGuard.requireSufficientFunds(account, amount);
            posting = ledgerPostingService.postWithdrawal(account.id(), vault.id(), amount, request.reference(), initiatedByUserId);
        }

        return new CashResponse(posting.transactionId(), type, account.id(), amount,
                ledgerService.getBalance(account.id()), posting.reference(), posting.createdAt());
    }

    private Account vault() {
        return accountRepository.findByAccountNumber(vaultAccountNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cash vault account " + vaultAccountNumber + " is missing; check migration V6"));
    }

    /**
     * The idempotency request hash must distinguish a deposit from a withdrawal
     * of the same amount on the same account, otherwise replaying a deposit key
     * against the withdrawal endpoint would silently return the deposit's
     * stored response instead of moving money the other way.
     */
    private String keyPayload(String opCode, Long accountId, CashRequest request) {
        return opCode + "|" + accountId + "|" + request;
    }
}
