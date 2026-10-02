package com.penny.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.penny.domain.Role;
import com.penny.domain.User;
import com.penny.ledger.CashService;
import com.penny.ledger.TransferService;
import com.penny.repository.UserRepository;
import com.penny.service.AccountService;
import com.penny.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * The bootstrap decides whether a deployment starts out with a usable account
 * or with a backdoor, so its guard conditions are worth pinning precisely.
 *
 * <p>These are unit tests rather than integration tests on purpose: the whole
 * point is the branch taken *before* any database work happens, and asserting
 * "nothing was called" is a stronger statement about a backdoor than asserting
 * on rows that were or were not written.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BootstrapRunnerTest {

    @Mock private UserRepository userRepository;
    @Mock private UserService userService;
    @Mock private AccountService accountService;
    @Mock private CashService cashService;
    @Mock private TransferService transferService;
    @Mock private PasswordEncoder passwordEncoder;

    private BootstrapRunner runner;

    @BeforeEach
    void setUp() {
        runner = new BootstrapRunner(
                userRepository, userService, accountService, cashService, transferService, passwordEncoder);
        set("adminEmail", "admin@penny.local");
        set("seedDemo", false);
        set("demoPassword", "");
        when(passwordEncoder.encode(any())).thenReturn("hashed");
    }

    @Test
    void doesNothingWhenNoBootstrapPasswordIsConfigured() {
        set("adminPassword", "");

        runner.run(null);

        // Not even a count query: with nothing configured there is no reason to
        // touch the database at all.
        verifyNoInteractions(userRepository);
    }

    @Test
    void createsTheFirstAdminWhenTheDatabaseIsEmpty() {
        set("adminPassword", "a-generated-password");
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        runner.run(null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().username()).isEqualTo("admin");
        assertThat(saved.getValue().role()).isEqualTo(Role.ADMIN);
        // The password is stored hashed, never in the clear.
        assertThat(saved.getValue().passwordHash()).isEqualTo("hashed");
        assertThat(saved.getValue().passwordHash()).isNotEqualTo("a-generated-password");
    }

    /**
     * The guard that stops this being a permanent backdoor.
     *
     * <p>If a redeploy re-applied the configured password, then the generated
     * value in the deployment's environment would stay valid forever -- changing
     * the admin password through the UI would be undone by the next push, and
     * anyone who ever saw that variable would retain access. A non-empty users
     * table has to mean "leave everything alone".
     */
    @Test
    void neverTouchesAnExistingInstallEvenWithAPasswordConfigured() {
        set("adminPassword", "a-generated-password");
        set("seedDemo", true);
        set("demoPassword", "demo-password");
        when(userRepository.count()).thenReturn(1L);

        runner.run(null);

        verify(userRepository, never()).save(any());
        verifyNoInteractions(userService, accountService, cashService, transferService);
    }

    @Test
    void skipsDemoDataWhenItIsNotRequested() {
        set("adminPassword", "a-generated-password");
        set("seedDemo", false);
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        runner.run(null);

        verify(userRepository).save(any());
        verifyNoInteractions(userService, accountService, cashService, transferService);
    }

    @Test
    void skipsDemoDataWhenRequestedWithoutAPassword() {
        set("adminPassword", "a-generated-password");
        set("seedDemo", true);
        set("demoPassword", "");
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        runner.run(null);

        // The admin still gets created -- the instance must be usable even when
        // the optional part of the setup is misconfigured.
        verify(userRepository).save(any());
        verifyNoInteractions(userService);
    }

    /**
     * A failed seed must not take the application down. The admin account is
     * what makes the instance reachable; demo rows are a convenience, and an
     * instance nobody can sign in to is a strictly worse outcome than one with
     * an empty ledger.
     */
    @Test
    void survivesAFailureWhileSeedingDemoData() {
        set("adminPassword", "a-generated-password");
        set("seedDemo", true);
        set("demoPassword", "demo-password");
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(userService.createUser(any())).thenThrow(new IllegalStateException("seed exploded"));

        runner.run(null);

        verify(userRepository).save(any());
    }

    private void set(String field, Object value) {
        ReflectionTestUtils.setField(runner, field, value);
    }
}
