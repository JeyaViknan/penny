package com.ledgerlite.repository;

import com.ledgerlite.domain.Account;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.CrudRepository;

public interface AccountRepository extends CrudRepository<Account, Long> {

    Optional<Account> findByAccountNumber(String accountNumber);

    boolean existsByAccountNumber(String accountNumber);

    List<Account> findByOwnerUserId(Long ownerUserId);
}
