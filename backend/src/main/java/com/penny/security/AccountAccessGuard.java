package com.penny.security;

import com.penny.repository.AccountRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Backs the {@code @accountAccessGuard.isOwner(...)} SpEL expression used on
 * account/ledger endpoints so a CUSTOMER can reach their own account without
 * the broader ADMIN/TELLER/AUDITOR grant. Kept as its own bean rather than
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
        return isOwnerOf(accountId, principal.getId());
    }

    /** Same rule, callable from Java where there is a user id but no Authentication in hand. */
    public boolean isOwnerOf(Long accountId, Long userId) {
        return accountRepository.findById(accountId)
                .map(account -> userId.equals(account.ownerUserId()))
                .orElse(false);
    }
}
