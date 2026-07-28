package com.ledgerlite.security;

import com.ledgerlite.repository.AccountRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Backs the {@code @accountAccessGuard.isOwner(...)} SpEL expression used
 * on account/ledger endpoints so a CUSTOMER can reach their own account
 * without ADMIN/TELLER/AUDITOR breadth. Kept as its own bean rather than
 * inline SpEL logic so the ownership rule has exactly one implementation.
 */
@Component("accountAccessGuard")
public class AccountAccessGuard {

    private final AccountRepository accountRepository;

    public AccountAccessGuard(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public boolean isOwner(Long accountId, Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            return false;
        }
        return accountRepository.findById(accountId)
                .map(account -> account.ownerUserId().equals(principal.getId()))
                .orElse(false);
    }
}
