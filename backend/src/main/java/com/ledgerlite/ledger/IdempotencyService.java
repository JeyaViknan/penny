package com.ledgerlite.ledger;

import com.ledgerlite.domain.IdempotencyKeyRecord;
import com.ledgerlite.repository.IdempotencyKeyRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Claiming an idempotency key happens on a database SAVEPOINT
 * ({@link Propagation#NESTED}), not a separate top-level transaction. That
 * is what makes idempotency genuinely transactional with the transfer it
 * guards: the claim and the ledger postings that follow live in the same
 * outer transaction, so they commit or roll back together. A REQUIRES_NEW
 * claim would commit independently of the transfer and could leave a
 * "completed" idempotency record referencing a transfer that never
 * actually committed.
 *
 * <p>A unique-constraint violation on the claim only aborts the savepoint,
 * not the whole transaction, so the caller can safely read the
 * already-claimed row afterward in the same transaction.
 */
@Service
public class IdempotencyService {

    private final IdempotencyKeyRepository repository;

    public IdempotencyService(IdempotencyKeyRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.NESTED)
    public Long tryClaim(Long userId, String idempotencyKey, String requestHash) {
        return repository.save(IdempotencyKeyRecord.pending(idempotencyKey, userId, requestHash)).id();
    }

    public IdempotencyKeyRecord requireExisting(Long userId, String idempotencyKey) {
        return repository.findByUserIdAndIdempotencyKey(userId, idempotencyKey)
                .orElseThrow(() -> new IllegalStateException(
                        "Idempotency key claim conflicted but no existing row was found: " + idempotencyKey));
    }

    public void completeClaim(Long claimId, int status, String responseBody) {
        IdempotencyKeyRecord record = repository.findById(claimId)
                .orElseThrow(() -> new IllegalStateException("Idempotency claim vanished: " + claimId));
        repository.save(record.withResponse(status, responseBody));
    }

    public String hashRequest(Object canonicalRequest) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(canonicalRequest.toString().getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
