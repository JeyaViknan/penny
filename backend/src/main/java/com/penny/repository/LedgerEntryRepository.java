package com.penny.repository;

import com.penny.domain.LedgerEntry;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface LedgerEntryRepository extends CrudRepository<LedgerEntry, Long> {

    List<LedgerEntry> findByAccountIdOrderByCreatedAtDesc(Long accountId);

    List<LedgerEntry> findByTransactionId(Long transactionId);
}
