package com.ledgerlite.repository;

import com.ledgerlite.domain.Transaction;
import com.ledgerlite.domain.TransactionSummary;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository extends CrudRepository<Transaction, Long> {

    /**
     * Transaction history, newest first, read from the {@code transaction_summaries}
     * view.
     *
     * <p>{@code ownerUserId} is the access-control filter: pass a user id to
     * restrict results to transactions touching that user's accounts, or null
     * for staff roles that may see everything. Filtering in SQL rather than
     * post-filtering in Java keeps LIMIT meaningful -- a Java filter would page
     * over rows the caller cannot see and return short pages.
     */
    @Query("""
            SELECT * FROM transaction_summaries
            WHERE (:ownerUserId IS NULL
                   OR debit_owner_user_id = :ownerUserId
                   OR credit_owner_user_id = :ownerUserId)
              AND (:accountId IS NULL
                   OR debit_account_id = :accountId
                   OR credit_account_id = :accountId)
            ORDER BY created_at DESC, transaction_id DESC
            LIMIT :limit OFFSET :offset
            """)
    List<TransactionSummary> findSummaries(@Param("ownerUserId") Long ownerUserId,
                                            @Param("accountId") Long accountId,
                                            @Param("limit") int limit,
                                            @Param("offset") long offset);

    @Query("""
            SELECT COUNT(*) FROM transaction_summaries
            WHERE (:ownerUserId IS NULL
                   OR debit_owner_user_id = :ownerUserId
                   OR credit_owner_user_id = :ownerUserId)
              AND (:accountId IS NULL
                   OR debit_account_id = :accountId
                   OR credit_account_id = :accountId)
            """)
    long countSummaries(@Param("ownerUserId") Long ownerUserId, @Param("accountId") Long accountId);

    @Query("SELECT * FROM transaction_summaries WHERE transaction_id = :id")
    Optional<TransactionSummary> findSummaryById(@Param("id") Long id);
}
