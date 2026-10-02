package com.penny.config;

import com.penny.domain.Account;
import com.penny.domain.AccountType;
import com.penny.domain.Role;
import com.penny.domain.User;
import com.penny.dto.CashRequest;
import com.penny.dto.CreateAccountRequest;
import com.penny.dto.CreateUserRequest;
import com.penny.dto.TransferRequest;
import com.penny.ledger.CashService;
import com.penny.ledger.TransferService;
import com.penny.repository.UserRepository;
import com.penny.service.AccountService;
import com.penny.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Gets a freshly deployed instance to the point where somebody can sign in.
 *
 * <p>There is a genuine chicken-and-egg problem here: creating a user requires
 * being an admin, and a new database has no admin. Nothing is seeded by the
 * migrations on purpose -- shipping a schema that contains a known password
 * would mean every deployment of this project starts out compromised -- so the
 * first account has to come from somewhere outside the normal flow.
 *
 * <p>Two rules keep that from becoming its own hole:
 *
 * <ol>
 *   <li><b>The password is never in the repository.</b> It comes from
 *       {@code PENNY_BOOTSTRAP_ADMIN_PASSWORD}, which the Render blueprint
 *       generates. If the variable is unset this runner does nothing at all
 *       rather than inventing a default.
 *   <li><b>It only ever runs into an empty users table.</b> Not "upsert", not
 *       "reset the password if it changed" -- if anyone exists, this is a
 *       redeploy and the runner returns immediately. A redeploy silently
 *       restoring a known admin password would be a backdoor that survives
 *       every attempt to remove it.
 * </ol>
 *
 * <p>The demo data is separate and opt-in via {@code PENNY_SEED_DEMO}. It is
 * posted through the real services -- the same deposit and transfer endpoints a
 * teller uses -- rather than inserted as rows. Seeding balances with a lone
 * CREDIT is exactly the mistake that creates money from nothing, and it would
 * leave {@code GET /ledger/integrity} correctly reporting that the books do not
 * balance on a brand-new deployment.
 */
@Component
public class BootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapRunner.class);

    private static final String ADMIN_USERNAME = "admin";
    private static final String DEMO_PASSWORD_PROPERTY = "penny.bootstrap.demo-password";

    private final UserRepository userRepository;
    private final UserService userService;
    private final AccountService accountService;
    private final CashService cashService;
    private final TransferService transferService;
    private final PasswordEncoder passwordEncoder;

    @Value("${penny.bootstrap.admin-password:}")
    private String adminPassword;

    @Value("${penny.bootstrap.admin-email:admin@penny.local}")
    private String adminEmail;

    @Value("${penny.bootstrap.seed-demo:false}")
    private boolean seedDemo;

    @Value("${" + DEMO_PASSWORD_PROPERTY + ":}")
    private String demoPassword;

    public BootstrapRunner(UserRepository userRepository,
                            UserService userService,
                            AccountService accountService,
                            CashService cashService,
                            TransferService transferService,
                            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.accountService = accountService;
        this.cashService = cashService;
        this.transferService = transferService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (adminPassword == null || adminPassword.isBlank()) {
            log.debug("No bootstrap admin password configured; skipping bootstrap.");
            return;
        }
        if (userRepository.count() > 0) {
            log.info("Users already exist; skipping bootstrap (this is a redeploy, not a fresh install).");
            return;
        }

        User admin = userRepository.save(User.newUser(
                ADMIN_USERNAME, adminEmail, passwordEncoder.encode(adminPassword), Role.ADMIN));
        log.info("Bootstrapped the first administrator '{}'. Sign in and change this password.", ADMIN_USERNAME);

        if (!seedDemo) {
            return;
        }
        if (demoPassword == null || demoPassword.isBlank()) {
            log.warn("penny.bootstrap.seed-demo is on but no demo password is set; skipping demo data.");
            return;
        }

        try {
            runAs(admin, () -> seedDemoData(admin));
            log.info("Seeded demo staff, customers, accounts and transactions.");
        } catch (RuntimeException e) {
            // A failed seed must not take the application down with it. The
            // admin account above is what makes the instance usable; demo rows
            // are a convenience, and losing them is worth strictly less than
            // losing the ability to start at all.
            log.error("Demo seeding failed; the instance is still usable via the admin account.", e);
        }
    }

    /**
     * Seeds a small but complete picture: staff in each role, two customers
     * with accounts, opening balances deposited from the vault, and a handful of
     * transfers so the ledger has history to read.
     */
    private void seedDemoData(User admin) {
        // A demo administrator, separate from the bootstrapped one. Visitors need
        // an ADMIN login to see what the role actually permits -- freezing and
        // closing accounts is most of what distinguishes it from a teller -- and
        // handing out the real admin password to do that would mean publishing
        // the one credential that is supposed to stay with the operator.
        userService.createUser(new CreateUserRequest(
                "dana_admin", "dana_admin@penny.local", demoPassword, Role.ADMIN));
        User teller = userService.createUser(new CreateUserRequest(
                "tom_teller", "tom_teller@penny.local", demoPassword, Role.TELLER));
        userService.createUser(new CreateUserRequest(
                "amy_auditor", "amy_auditor@penny.local", demoPassword, Role.AUDITOR));
        User jane = userService.createUser(new CreateUserRequest(
                "jane_customer", "jane_customer@penny.local", demoPassword, Role.CUSTOMER));
        User ravi = userService.createUser(new CreateUserRequest(
                "ravi_customer", "ravi_customer@penny.local", demoPassword, Role.CUSTOMER));

        Account janeChecking = accountService.createAccount(
                new CreateAccountRequest(jane.id(), AccountType.CHECKING, "USD"));
        Account janeSavings = accountService.createAccount(
                new CreateAccountRequest(jane.id(), AccountType.SAVINGS, "USD"));
        Account raviChecking = accountService.createAccount(
                new CreateAccountRequest(ravi.id(), AccountType.CHECKING, "USD"));

        // Money enters against the cash vault, so the books still sum to zero.
        // transactions.initiated_by_user_id is NOT NULL -- every movement is
        // attributable to somebody, which is the point of an audit trail -- so
        // these are recorded against the admin that posted them, not as the
        // work of nobody.
        deposit(admin, janeChecking, 4_800_00L, "Opening deposit");
        deposit(admin, janeSavings, 12_500_00L, "Opening deposit");
        deposit(admin, raviChecking, 2_150_00L, "Opening deposit");

        transfer(teller, janeChecking, janeSavings, 750_00L, "Monthly savings");
        transfer(teller, janeChecking, raviChecking, 325_00L, "Dinner split");
        transfer(teller, raviChecking, janeChecking, 120_00L, "Cab share");
        transfer(teller, janeSavings, raviChecking, 42_50L, "Coffee run");
        cashService.withdraw(
                janeChecking.id(), new CashRequest(200_00L, "ATM withdrawal"), admin.id(), null);
    }

    private void deposit(User actor, Account account, long minorUnits, String reference) {
        cashService.deposit(account.id(), new CashRequest(minorUnits, reference), actor.id(), null);
    }

    private void transfer(User initiator, Account from, Account to, long minorUnits, String reference) {
        transferService.transfer(
                new TransferRequest(from.id(), to.id(), minorUnits, reference), initiator.id(), null);
    }

    /**
     * Runs the seed as the bootstrapped admin.
     *
     * <p>The services are guarded by {@code @PreAuthorize}, and correctly so --
     * opening an account and moving money are staff actions. Rather than adding
     * a back door to those checks for seeding, this authenticates properly and
     * lets every guard run exactly as it would for a real request, so the seed
     * exercises the same path it is demonstrating. The previous context is
     * restored afterwards so nothing leaks into request handling.
     */
    private void runAs(User actor, Runnable work) {
        var previous = SecurityContextHolder.getContext().getAuthentication();
        try {
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(new UsernamePasswordAuthenticationToken(
                    actor.username(), "n/a", java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
            SecurityContextHolder.setContext(context);
            work.run();
        } finally {
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(previous);
            SecurityContextHolder.setContext(context);
        }
    }
}
