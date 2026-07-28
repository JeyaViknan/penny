package com.ledgerlite.service;

import com.ledgerlite.audit.Audited;
import com.ledgerlite.domain.Account;
import com.ledgerlite.dto.CreateAccountRequest;
import com.ledgerlite.exception.ResourceNotFoundException;
import com.ledgerlite.ledger.AccountNumberGenerator;
import com.ledgerlite.repository.AccountRepository;
import java.util.List;
import java.util.stream.StreamSupport;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final AccountNumberGenerator accountNumberGenerator;
    private final UserService userService;

    public AccountService(AccountRepository accountRepository,
                           AccountNumberGenerator accountNumberGenerator,
                           UserService userService) {
        this.accountRepository = accountRepository;
        this.accountNumberGenerator = accountNumberGenerator;
        this.userService = userService;
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

    public Account getById(Long id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No account with id: " + id));
    }

    public List<Account> listAll() {
        return StreamSupport.stream(accountRepository.findAll().spliterator(), false).toList();
    }

    public List<Account> listForOwner(Long ownerUserId) {
        return accountRepository.findByOwnerUserId(ownerUserId);
    }
}
