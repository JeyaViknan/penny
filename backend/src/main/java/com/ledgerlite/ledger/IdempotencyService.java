package com.ledgerlite.ledger;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerlite.domain.IdempotencyKeyRecord;
import com.ledgerlite.exception.IdempotencyKeyConflictException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.function.Supplier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.relational.core.conversion.DbActionExecutionException;
import org.springframework.stereotype.Service;

/**
 * Replay-safety for money-moving endpoints.
 *
 * <p>The claim is written on a database savepoint by {@link IdempotencyClaimStore},
 * inside this call's own transaction rather than a separate one. That is what makes
 * idempotency genuinely transactional with the operation it guards: the claim and the
 * ledger postings commit or roll back together. A claim committed independently could
 * leave a "completed" record pointing at a posting that never committed.
 */
@Service
public class IdempotencyService {

    private static final int STORED_RESPONSE_STATUS = 201;

    private final IdempotencyClaimStore claimStore;
    private final ObjectMapper objectMapper;

    public IdempotencyService(IdempotencyClaimStore claimStore, ObjectMapper objectMapper) {
        this.claimStore = claimStore;
        this.objectMapper = objectMapper;
    }

    /**
     * Runs {@code action} at most once per (user, key) pair.
     *
     * <p>A replay with the same key and an identical request payload returns the
     * stored response without re-running the action. The same key with a different
     * payload is a client bug, not a retry, and is rejected. A key whose action
     * failed is rolled back with it, so a legitimate retry still works.
     *
     * <p>Kept generic so every money-moving endpoint shares one implementation of
     * this control flow rather than each re-deriving it.
     */
    public <T> T executeOnce(Long userId, String idempotencyKey, Object requestPayload,
                              Class<T> responseType, Supplier<T> action) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return action.get();
        }

        String requestHash = hashRequest(requestPayload);
        Long claimId;
        try {
            claimId = claimStore.tryClaim(userId, idempotencyKey, requestHash);
        } catch (DbActionExecutionException | DataIntegrityViolationException conflict) {
            // Spring Data JDBC wraps the translated DataIntegrityViolationException,
            // so accept either shape but rethrow anything that is not a duplicate key.
            if (conflict instanceof DbActionExecutionException wrapped
                    && !(wrapped.getCause() instanceof DataIntegrityViolationException)) {
                throw wrapped;
            }
            return replay(userId, idempotencyKey, requestHash, responseType);
        }

        T response = action.get();
        claimStore.complete(claimId, STORED_RESPONSE_STATUS, encode(response));
        return response;
    }

    private <T> T replay(Long userId, String idempotencyKey, String requestHash, Class<T> responseType) {
        IdempotencyKeyRecord existing = claimStore.find(userId, idempotencyKey)
                .orElseThrow(() -> new IllegalStateException(
                        "Idempotency key claim conflicted but no existing row was found: " + idempotencyKey));

        if (!existing.requestHash().equals(requestHash)) {
            throw new IdempotencyKeyConflictException(
                    "Idempotency-Key " + idempotencyKey + " was already used with a different request payload");
        }
        if (!existing.isCompleted()) {
            throw new IdempotencyKeyConflictException(
                    "Idempotency-Key " + idempotencyKey + " is already being processed");
        }
        return decode(existing.responseBody(), responseType);
    }

    String hashRequest(Object canonicalRequest) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(canonicalRequest.toString().getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String encode(Object response) {
        try {
            return objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize response for idempotency storage", e);
        }
    }

    private <T> T decode(String json, Class<T> responseType) {
        try {
            return objectMapper.readValue(json, responseType);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize stored idempotent response", e);
        }
    }
}
