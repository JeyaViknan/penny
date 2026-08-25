package com.penny.support;

import com.penny.domain.Account;
import com.penny.domain.AccountType;
import com.penny.domain.Role;
import com.penny.domain.User;
import com.penny.dto.CashRequest;
import com.penny.ledger.CashService;
import com.penny.repository.AccountRepository;
import com.penny.repository.UserRepository;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Shared test setup for users, accounts and opening balances.
 *
 * <p>Funding deliberately goes through the real {@link CashService} rather than
 * inserting a ledger row directly. An earlier version of these tests seeded
 * balances with a lone CREDIT entry, which creates money from nothing and
 * violates the very invariant the ledger exists to hold -- so the tests were
 * asserting against a state the production code could never actually produce.
 */
@Component
public class LedgerFixture {

    private static final AtomicLong UNIQUE = new AtomicLong();

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final CashService cashService;
    private final PasswordEncoder passwordEncoder;

    public LedgerFixture(UserRepository userRepository,
                          AccountRepository accountRepository,
                          CashService cashService,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.cashService = cashService;
        this.passwordEncoder = passwordEncoder;
    }

    public static final String PASSWORD = "Password123!";

    public User user(String username, Role role) {
        return userRepository.findByUsername(username).orElseGet(() -> userRepository.save(
                User.newUser(username, username + "@penny.test", passwordEncoder.encode(PASSWORD), role)));
    }

    public Account account(Long ownerUserId) {
        return account(ownerUserId, AccountType.CHECKING);
    }

    public Account account(Long ownerUserId, AccountType type) {
        String number = String.format("%012d", 900_000_000_000L + UNIQUE.incrementAndGet()).substring(0, 12);
        return accountRepository.save(Account.newAccount(number, ownerUserId, type, "USD"));
    }

    /** Opens an account and funds it through the real deposit path. */
    public Account fundedAccount(Long ownerUserId, long openingBalanceMinorUnits) {
        Account account = account(ownerUserId);
        if (openingBalanceMinorUnits > 0) {
            fund(account.id(), openingBalanceMinorUnits);
        }
        return account;
    }

    /**
     * Deposits into an existing account. Runs as an ADMIN because deposits are
     * staff-only; the surrounding test's own authentication is restored after.
     */
    public void fund(Long accountId, long amountMinorUnits) {
        User admin = user("fixture-admin", Role.ADMIN);
        var previous = SecurityContextHolder.getContext().getAuthentication();
        try {
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(new TestingAuthenticationToken(admin.username(), "n/a", "ROLE_ADMIN"));
            SecurityContextHolder.setContext(context);
            cashService.deposit(accountId, new CashRequest(amountMinorUnits, "opening balance"), admin.id(), null);
        } finally {
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(previous);
            SecurityContextHolder.setContext(context);
        }
    }
}
