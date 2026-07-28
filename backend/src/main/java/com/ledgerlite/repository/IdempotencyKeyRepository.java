package com.ledgerlite.repository;

import com.ledgerlite.domain.IdempotencyKeyRecord;
import java.util.Optional;
import org.springframework.data.repository.CrudRepository;

public interface IdempotencyKeyRepository extends CrudRepository<IdempotencyKeyRecord, Long> {

    Optional<IdempotencyKeyRecord> findByUserIdAndIdempotencyKey(Long userId, String idempotencyKey);
}
