package com.penny.controller;

import com.penny.domain.Account;
import com.penny.domain.Role;
import com.penny.domain.User;
import com.penny.dto.AccountResponse;
import com.penny.dto.CashRequest;
import com.penny.dto.CashResponse;
import com.penny.dto.ChangeAccountStatusRequest;
import com.penny.dto.CreateAccountRequest;
import com.penny.ledger.CashService;
import com.penny.ledger.LedgerService;
import com.penny.mapper.AccountMapper;
import com.penny.security.UserPrincipal;
import com.penny.service.AccountService;
import com.penny.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/accounts")
@Tag(name = "Accounts")
public class AccountController {

    private final AccountService accountService;
    private final LedgerService ledgerService;
    private final CashService cashService;
    private final UserService userService;
    private final AccountMapper accountMapper;

    public AccountController(AccountService accountService,
                              LedgerService ledgerService,
                              CashService cashService,
                              UserService userService,
                              AccountMapper accountMapper) {
        this.accountService = accountService;
        this.ledgerService = ledgerService;
        this.cashService = cashService;
        this.userService = userService;
        this.accountMapper = accountMapper;
    }

    @PostMapping
    @Operation(summary = "Open a new account for a customer")
    public ResponseEntity<AccountResponse> createAccount(@Valid @RequestBody CreateAccountRequest request) {
        Account account = accountService.createAccount(request);
        return ResponseEntity.created(URI.create("/accounts/" + account.id())).body(toResponse(account));
    }

    @GetMapping
    @Operation(summary = "List accounts; a CUSTOMER sees only their own")
    public ResponseEntity<List<AccountResponse>> listAccounts(@AuthenticationPrincipal UserPrincipal principal) {
        List<Account> accounts = principal.getUser().role() == Role.CUSTOMER
                ? accountService.listForOwner(principal.getId())
                : accountService.listAll();

        // Owners and balances are each resolved in one query rather than one per
        // account -- the balance lookup used to be an N+1, issuing a separate
        // aggregate against account_balances for every row on the page.
        Map<Long, String> usernames = usernamesFor(accounts);
        Map<Long, Long> balances = ledgerService.getBalances(accounts.stream().map(Account::id).toList());

        List<AccountResponse> response = accounts.stream()
                .map(a -> accountMapper.toResponse(
                        a, balances.getOrDefault(a.id(), 0L), usernames.get(a.ownerUserId())))
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'TELLER') or @accountAccessGuard.isOwner(#id, authentication)")
    public ResponseEntity<AccountResponse> getAccount(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(accountService.getById(id)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Freeze, reactivate, or close an account (ADMIN only)")
    public ResponseEntity<AccountResponse> changeStatus(@PathVariable Long id,
                                                          @Valid @RequestBody ChangeAccountStatusRequest request) {
        return ResponseEntity.ok(toResponse(accountService.changeStatus(id, request.status())));
    }

    @PostMapping("/{id}/deposit")
    @Operation(summary = "Deposit cash into an account (debits the cash vault)")
    public ResponseEntity<CashResponse> deposit(@PathVariable Long id,
                                                  @Valid @RequestBody CashRequest request,
                                                  @AuthenticationPrincipal UserPrincipal principal,
                                                  @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ResponseEntity.ok(cashService.deposit(id, request, principal.getId(), idempotencyKey));
    }

    @PostMapping("/{id}/withdraw")
    @Operation(summary = "Withdraw cash from an account (credits the cash vault)")
    public ResponseEntity<CashResponse> withdraw(@PathVariable Long id,
                                                   @Valid @RequestBody CashRequest request,
                                                   @AuthenticationPrincipal UserPrincipal principal,
                                                   @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ResponseEntity.ok(cashService.withdraw(id, request, principal.getId(), idempotencyKey));
    }

    private AccountResponse toResponse(Account account) {
        String ownerUsername = account.ownerUserId() == null
                ? null
                : userService.getById(account.ownerUserId()).username();
        return accountMapper.toResponse(account, ledgerService.getBalance(account.id()), ownerUsername);
    }

    private Map<Long, String> usernamesFor(List<Account> accounts) {
        List<Long> ownerIds = accounts.stream().map(Account::ownerUserId).filter(java.util.Objects::nonNull).distinct().toList();
        if (ownerIds.isEmpty()) {
            return Map.of();
        }
        return userService.getAllByIds(ownerIds).stream()
                .collect(Collectors.toMap(User::id, User::username, (a, b) -> a));
    }
}
