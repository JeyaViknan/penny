package com.penny.ledger;

import static org.assertj.core.api.Assertions.assertThat;

import com.penny.AbstractIntegrationTest;
import com.penny.domain.Account;
import com.penny.domain.Role;
import com.penny.domain.User;
import com.penny.dto.TransferRequest;
import com.penny.exception.InsufficientBalanceException;
import com.penny.support.LedgerFixture;
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
    private LedgerFixture fixture;

    @Test
    void fiftyConcurrentTransfersNeverDriveBalanceNegative() throws Exception {
        User teller = fixture.user("concurrency-teller", Role.TELLER);
        User owner = fixture.user("concurrency-owner", Role.CUSTOMER);

        Account source = fixture.fundedAccount(owner.id(), OPENING_BALANCE);
        Account destination = fixture.account(owner.id());

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
