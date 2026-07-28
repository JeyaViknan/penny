package com.ledgerlite.repository;

import com.ledgerlite.domain.RefreshToken;
import java.util.Optional;
import org.springframework.data.repository.CrudRepository;

public interface RefreshTokenRepository extends CrudRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);
}
