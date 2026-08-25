package com.ledgerlite.service;

import com.ledgerlite.audit.Audited;
import com.ledgerlite.domain.Account;
import com.ledgerlite.domain.AccountStatus;
import com.ledgerlite.dto.CreateAccountRequest;
import com.ledgerlite.exception.InvalidStatusTransitionException;
import com.ledgerlite.exception.ResourceNotFoundException;
import com.ledgerlite.exception.SystemAccountException;
import com.ledgerlite.ledger.AccountNumberGenerator;
import com.ledgerlite.ledger.LedgerService;
import com.ledgerlite.repository.AccountRepository;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final AccountNumberGenerator accountNumberGenerator;
    private final UserService userService;
    private final LedgerService ledgerService;

    public AccountService(AccountRepository accountRepository,
                           AccountNumberGenerator accountNumberGenerator,
                           UserService userService,
                           LedgerService ledgerService) {
        this.accountRepository = accountRepository;
        this.accountNumberGenerator = accountNumberGenerator;
        this.userService = userService;
        this.ledgerService = ledgerService;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER')")
    @Audited(action = "CREATE_ACCOUNT", entityType = "Account")
    public Account createAccount(CreateAccountRequest request) {
        // Fail fast with a clear 404 rather than letting the FK constraint
        // surface a raw SQL error to the caller.
        userService.getById(request.ownerUserId());

        String accountNumber = accountNumberGenerator.generate();
        Account account = Account.newAccount(accountNumber, request.ownerUserId(), request.accountType(), request.currency());
        return accountRepository.save(account);
    }

    /**
     * Freezes, reactivates, or closes an account. Only ADMIN may do this --
     * a teller can move money but cannot change an account's standing.
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "CHANGE_ACCOUNT_STATUS", entityType = "Account")
    public Account changeStatus(Long accountId, AccountStatus target) {
        Account account = getById(accountId);

        if (account.isSystemAccount()) {
            throw new SystemAccountException(accountId);
        }
        if (account.status() == target) {
            return account;
        }
        if (!account.status().canTransitionTo(target)) {
            throw new InvalidStatusTransitionException(
                    "Cannot change account " + accountId + " from " + account.status() + " to " + target);
        }
        // Closing an account that still holds money would strand it: the
        // balance stays on the books but becomes unreachable, since a CLOSED
        // account can neither transact nor reopen.
        if (target == AccountStatus.CLOSED && ledgerService.getBalance(accountId) != 0) {
            throw new InvalidStatusTransitionException(
                    "Account " + accountId + " still holds a balance and cannot be closed; withdraw or transfer the funds first");
        }

        return accountRepository.save(account.withStatus(target));
    }

    public Account getById(Long id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No account with id: " + id));
    }

    /** Customer-facing accounts only; the cash vault is never listed. */
    public List<Account> listAll() {
        return accountRepository.findAllCustomerAccounts();
    }

    public List<Account> listForOwner(Long ownerUserId) {
        return accountRepository.findByOwnerUserId(ownerUserId);
    }
}
