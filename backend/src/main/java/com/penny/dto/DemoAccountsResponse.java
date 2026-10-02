package com.penny.dto;

import com.penny.domain.Role;
import java.util.List;

/**
 * The demo logins, for an instance that is meant to be tried rather than used.
 *
 * <p>{@code enabled} is false and {@code accounts} empty on any instance that
 * was not seeded with demo data, so a real deployment advertises nothing.
 */
public record DemoAccountsResponse(
        boolean enabled,
        String password,
        List<DemoAccount> accounts
) {

    /** One signing-in option, with what the role is actually allowed to do. */
    public record DemoAccount(String username, Role role, String summary, List<String> permissions) {
    }

    public static DemoAccountsResponse disabled() {
        return new DemoAccountsResponse(false, null, List.of());
    }
}
