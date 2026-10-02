package com.penny.controller;

import com.penny.domain.Role;
import com.penny.dto.DemoAccountsResponse;
import com.penny.dto.DemoAccountsResponse.DemoAccount;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Publishes the demo logins so a visitor can see what the roles actually do.
 *
 * <p>Access control is the most interesting thing about this system and the
 * least visible: a customer, a teller, an auditor and an administrator are
 * shown materially different products by the same code. Behind a single login
 * form none of that is discoverable, and a reviewer has to take the README's
 * word for it. Handing out all four logins turns a claim into something that
 * can be checked in a minute.
 *
 * <p><b>Why publishing passwords is defensible here, and only here.</b> This
 * responds with credentials only when {@code penny.bootstrap.seed-demo} is on,
 * which is an explicit deployment decision, and only ever for the generated
 * demo password shared by the seeded accounts. The bootstrapped administrator
 * -- the one real credential, which an operator uses to run the instance -- is
 * never included and its password is never read by this class. An instance that
 * was not seeded returns {@code enabled: false} and nothing else, so the same
 * build deployed for real advertises no way in.
 *
 * <p>What a visitor can do with these is bounded by the same RBAC they are here
 * to inspect: the money is fictional, the vault cannot be transferred from, and
 * the ledger's append-only constraints hold against a demo administrator
 * exactly as they do against anyone else.
 */
@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication")
public class DemoController {

    /**
     * Mirrors the roles seeded by {@code BootstrapRunner}. The summaries are
     * descriptions of the enforced rules, not marketing: each one corresponds to
     * a {@code @PreAuthorize} somewhere in the service layer, and the fastest way
     * to check that is to sign in and watch the navigation change.
     */
    private static final List<DemoAccount> ACCOUNTS = List.of(
            new DemoAccount("jane_customer", Role.CUSTOMER,
                    "Sees only her own accounts and the transactions touching them.",
                    List.of("Read her own accounts", "Send money from her own accounts",
                            "Cannot see other customers, staff pages, or the audit trail")),
            new DemoAccount("tom_teller", Role.TELLER,
                    "Front-desk staff: opens accounts and moves money for customers.",
                    List.of("Open accounts", "Record deposits and withdrawals", "Post transfers",
                            "Read every account", "Cannot freeze or close an account")),
            new DemoAccount("amy_auditor", Role.AUDITOR,
                    "Reads everything and changes nothing.",
                    List.of("Read every account and transaction", "Read the audit trail",
                            "Verify the books balance", "Cannot move money at all")),
            new DemoAccount("dana_admin", Role.ADMIN,
                    "Full access, including the account lifecycle.",
                    List.of("Everything a teller can do", "Freeze, reactivate and close accounts",
                            "Add people", "Read the audit trail")));

    @Value("${penny.bootstrap.seed-demo:false}")
    private boolean seedDemo;

    @Value("${penny.bootstrap.demo-password:}")
    private String demoPassword;

    @GetMapping("/demo")
    @Operation(summary = "Demo logins, one per role. Empty unless this instance was seeded as a demo")
    public ResponseEntity<DemoAccountsResponse> demoAccounts() {
        if (!seedDemo || demoPassword == null || demoPassword.isBlank()) {
            return ResponseEntity.ok(DemoAccountsResponse.disabled());
        }
        return ResponseEntity.ok(new DemoAccountsResponse(true, demoPassword, ACCOUNTS));
    }
}
