package com.ledgerlite.ledger;

import static org.assertj.core.api.Assertions.assertThat;

import com.ledgerlite.AbstractIntegrationTest;
import com.ledgerlite.domain.Account;
import com.ledgerlite.domain.AccountType;
import com.ledgerlite.domain.LedgerEntry;
import com.ledgerlite.domain.Role;
import com.ledgerlite.domain.Transaction;
import com.ledgerlite.domain.User;
import com.ledgerlite.dto.TransferRequest;
import com.ledgerlite.exception.InsufficientBalanceException;
import com.ledgerlite.repository.AccountRepository;
import com.ledgerlite.repository.LedgerEntryRepository;
import com.ledgerlite.repository.TransactionRepository;
import com.ledgerlite.repository.UserRepository;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Mandatory proof that pessimistic locking closes the double-spend race:
 * fire 50 concurrent transfers of 100 minor units each out of an account
 * that can only afford 10 of them, and assert exactly 10 succeed, the
 * rest are rejected with insufficient balance, and the final balance is
 * never negative (and matches exactly what should remain).
 */
class ConcurrentTransferIT extends AbstractIntegrationTest {

    private static final int CONCURRENT_REQUESTS = 50;
    private static final long TRANSFER_AMOUNT = 100L;
    private static final long OPENING_BALANCE = 1_000L; // affords exactly 10 transfers

    @Autowired
    private TransferService transferService;
    @Autowired
    private LedgerService ledgerService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Test
    void fiftyConcurrentTransfersNeverDriveBalanceNegative() throws Exception {
        User teller = userRepository.findByUsername("concurrency-teller")
                .orElseGet(() -> userRepository.save(User.newUser(
                        "concurrency-teller", "concurrency-teller@ledgerlite.local", "unused-hash", Role.TELLER)));
        User owner = userRepository.findByUsername("concurrency-owner")
                .orElseGet(() -> userRepository.save(User.newUser(
                        "concurrency-owner", "concurrency-owner@ledgerlite.local", "unused-hash", Role.CUSTOMER)));

        Account source = openAccount(owner.id(), "CC" + System.nanoTime());
        Transaction seedTx = transactionRepository.save(Transaction.newTransaction("opening balance", teller.id()));
        ledgerEntryRepository.save(LedgerEntry.credit(seedTx.id(), source.id(), OPENING_BALANCE));

        Account destination = openAccount(owner.id(), "CD" + System.nanoTime());

        ExecutorService pool = Executors.newFixedThreadPool(CONCURRENT_REQUESTS);
        CountDownLatch startLine = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejectedForInsufficientBalance = new AtomicInteger();

        List<Callable<Void>> tasks = IntStream.range(0, CONCURRENT_REQUESTS)
                .<Callable<Void>>mapToObj(i -> () -> {
                    startLine.await();
                    runAsTeller(teller.id(), () -> {
                        try {
                            transferService.transfer(
                                    new TransferRequest(source.id(), destination.id(), TRANSFER_AMOUNT, "concurrent-" + i),
                                    teller.id(), null);
                            succeeded.incrementAndGet();
                        } catch (InsufficientBalanceException expected) {
                            rejectedForInsufficientBalance.incrementAndGet();
                        }
                        return null;
                    });
                    return null;
                })
                .toList();

        List<Future<Void>> futures = tasks.stream().map(pool::submit).toList();
        startLine.countDown();
        for (Future<Void> future : futures) {
            future.get(30, TimeUnit.SECONDS);
        }
        pool.shutdown();

        assertThat(succeeded.get()).isEqualTo(10);
        assertThat(rejectedForInsufficientBalance.get()).isEqualTo(CONCURRENT_REQUESTS - 10);
        assertThat(ledgerService.getBalance(source.id())).isZero();
        assertThat(ledgerService.getBalance(destination.id())).isEqualTo(10 * TRANSFER_AMOUNT);
    }

    private Account openAccount(Long ownerId, String accountNumber) {
        return accountRepository.save(Account.newAccount(accountNumber.substring(0, 12), ownerId, AccountType.CHECKING, "USD"));
    }

    /**
     * Each worker thread needs its own authenticated SecurityContext for
     * @PreAuthorize on TransferService.transfer to pass, since Spring
     * Security context is thread-local and not inherited by the executor's
     * threads automatically.
     */
    private <T> T runAsTeller(Long userId, Callable<T> action) throws Exception {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(tellerAuthentication());
        SecurityContextHolder.setContext(context);
        try {
            return action.call();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private Authentication tellerAuthentication() {
        return new org.springframework.security.authentication.TestingAuthenticationToken(
                "concurrency-teller", "n/a", "ROLE_TELLER");
    }
}
