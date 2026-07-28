package com.ledgerlite.repository;

import com.ledgerlite.domain.AccountBalance;
import org.springframework.data.repository.CrudRepository;

/** Read-only: {@code account_balances} is a database view, never written to directly. */
public interface AccountBalanceRepository extends CrudRepository<AccountBalance, Long> {
}
