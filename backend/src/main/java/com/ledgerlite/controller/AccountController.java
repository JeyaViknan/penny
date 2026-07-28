package com.ledgerlite.controller;

import com.ledgerlite.dto.AccountResponse;
import com.ledgerlite.dto.CreateAccountRequest;
import com.ledgerlite.ledger.LedgerService;
import com.ledgerlite.mapper.AccountMapper;
import com.ledgerlite.service.AccountService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/accounts")
@Tag(name = "Accounts")
public class AccountController {

    private final AccountService accountService;
    private final LedgerService ledgerService;
    private final AccountMapper accountMapper;

    public AccountController(AccountService accountService, LedgerService ledgerService, AccountMapper accountMapper) {
        this.accountService = accountService;
        this.ledgerService = ledgerService;
        this.accountMapper = accountMapper;
    }

    @PostMapping
    public ResponseEntity<AccountResponse> createAccount(@Valid @RequestBody CreateAccountRequest request) {
        var account = accountService.createAccount(request);
        var response = accountMapper.toResponse(account, ledgerService.getBalance(account.id()));
        return ResponseEntity.created(URI.create("/accounts/" + account.id())).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'TELLER')")
    public ResponseEntity<List<AccountResponse>> listAccounts() {
        var response = accountService.listAll().stream()
                .map(a -> accountMapper.toResponse(a, ledgerService.getBalance(a.id())))
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'TELLER') or @accountAccessGuard.isOwner(#id, authentication)")
    public ResponseEntity<AccountResponse> getAccount(@PathVariable Long id) {
        var account = accountService.getById(id);
        var response = accountMapper.toResponse(account, ledgerService.getBalance(account.id()));
        return ResponseEntity.ok(response);
    }
}
