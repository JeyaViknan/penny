package com.penny.ledger;

import com.penny.repository.AccountRepository;
import java.security.SecureRandom;
import org.springframework.stereotype.Component;

/**
 * Generates externally-facing account numbers, distinct from the internal
 * surrogate id. A 12-digit random number collides rarely enough that a
 * short bounded retry loop against the uniqueness constraint is simpler
 * and just as correct as a dedicated sequence/checksum scheme.
 */
@Component
public class AccountNumberGenerator {

    private static final int LENGTH = 12;
    private static final int MAX_ATTEMPTS = 10;
    private final SecureRandom random = new SecureRandom();
    private final AccountRepository accountRepository;

    public AccountNumberGenerator(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public String generate() {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String candidate = randomDigits();
            if (!accountRepository.existsByAccountNumber(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Failed to generate a unique account number after " + MAX_ATTEMPTS + " attempts");
    }

    private String randomDigits() {
        StringBuilder sb = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}
