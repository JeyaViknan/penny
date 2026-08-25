package com.penny.ledger;

import com.penny.domain.IdempotencyKeyRecord;
import com.penny.repository.IdempotencyKeyRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Savepoint-scoped writes for idempotency claims.
 *
 * <p>This lives in its own bean for a load-bearing reason: {@link Propagation#NESTED}
 * is applied by Spring's transaction proxy, and a proxy is only involved when the
 * call arrives from outside the bean. If {@code tryClaim} sat on
 * {@link IdempotencyService} and were invoked as {@code this.tryClaim(...)}, the
 * self-invocation would bypass the proxy entirely -- no savepoint would be taken,
 * and the duplicate-key violation that the caller relies on catching would instead
 * poison the whole surrounding transaction.
 */
@Service
public class IdempotencyClaimStore {

    private final IdempotencyKeyRepository repository;

    public IdempotencyClaimStore(IdempotencyKeyRepository repository) {
        this.repository = repository;
    }

    /**
     * Inserts a pending claim on a savepoint. A unique-constraint violation
     * rolls back only to the savepoint, leaving the caller's transaction alive
     * and able to read the winning row.
     */
    @Transactional(propagation = Propagation.NESTED)
    public Long tryClaim(Long userId, String idempotencyKey, String requestHash) {
        return repository.save(IdempotencyKeyRecord.pending(idempotencyKey, userId, requestHash)).id();
    }

    public Optional<IdempotencyKeyRecord> find(Long userId, String idempotencyKey) {
        return repository.findByUserIdAndIdempotencyKey(userId, idempotencyKey);
    }

    public void complete(Long claimId, int status, String responseBody) {
        IdempotencyKeyRecord record = repository.findById(claimId)
                .orElseThrow(() -> new IllegalStateException("Idempotency claim vanished: " + claimId));
        repository.save(record.withResponse(status, responseBody));
    }
}
