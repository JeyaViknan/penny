package com.ledgerlite.repository;

import com.ledgerlite.domain.Account;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

public interface AccountRepository extends CrudRepository<Account, Long> {

    Optional<Account> findByAccountNumber(String accountNumber);

    boolean existsByAccountNumber(String accountNumber);

    List<Account> findByOwnerUserId(Long ownerUserId);

    /**
     * Pessimistic lock used by {@code TransferService} to serialize concurrent
     * transfers touching the same account. Callers must always lock accounts
     * in ascending id order across a transfer's two accounts to avoid
     * deadlocking against a concurrent transfer in the opposite direction.
     */
    @Query("SELECT * FROM accounts WHERE id = :id FOR UPDATE")
    Optional<Account> lockById(@Param("id") Long id);
}
