package com.ledgerlite.ledger;

import com.ledgerlite.domain.Account;
import com.ledgerlite.exception.InactiveAccountException;
import com.ledgerlite.exception.InsufficientBalanceException;
import com.ledgerlite.exception.ResourceNotFoundException;
import com.ledgerlite.repository.AccountRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.LongStream;
import org.springframework.stereotype.Service;

/**
 * The preconditions every ledger posting must satisfy, in one place so
 * transfers, deposits and withdrawals cannot drift apart on the rules that
 * actually protect the money.
 */
@Service
public class PostingGuard {

    private final AccountRepository accountRepository;
    private final LedgerService ledgerService;

    public PostingGuard(AccountRepository accountRepository, LedgerService ledgerService) {
        this.accountRepository = accountRepository;
        this.ledgerService = ledgerService;
    }

    /**
     * Takes a {@code SELECT ... FOR UPDATE} row lock on each account, always in
     * ascending id order regardless of the order the caller passed them.
     *
     * <p>The ordering is the deadlock guard: two concurrent transfers moving
     * money in opposite directions between the same pair of accounts would
     * otherwise grab the two locks in opposite orders and deadlock. Sorting
     * first means every transaction in the system acquires account locks in the
     * same global order, which makes that cycle impossible.
     */
    public Map<Long, Account> lockAll(long... accountIds) {
        Map<Long, Account> locked = new LinkedHashMap<>();
        LongStream.of(accountIds).distinct().sorted().forEach(id ->
                locked.put(id, accountRepository.lockById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("No account with id: " + id))));
        return locked;
    }

    public void requireActive(Account account) {
        if (!account.status().canTransact()) {
            throw new InactiveAccountException(account.id());
        }
    }

    /**
     * Must be called only after {@link #lockAll} has locked the account. The
     * balance is read fresh inside the lock: under Postgres READ COMMITTED a
     * statement issued after a lock wait sees whatever the previous holder
     * committed, which is what makes the check race-free.
     *
     * <p>System accounts opt out -- the cash vault necessarily runs negative,
     * because it represents value that entered the ledger from outside it.
     */
    public void requireSufficientFunds(Account account, long amountMinorUnits) {
        if (account.allowNegativeBalance()) {
            return;
        }
        if (ledgerService.getBalance(account.id()) < amountMinorUnits) {
            throw new InsufficientBalanceException(account.id());
        }
    }
}
