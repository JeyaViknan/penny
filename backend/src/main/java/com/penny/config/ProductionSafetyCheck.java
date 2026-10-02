package com.penny.config;

import com.penny.security.JwtProperties;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Refuses to serve traffic with a signing key that cannot protect it.
 *
 * <p>{@code penny.jwt.secret} previously fell back to a placeholder written into
 * {@code application.yml} and committed to a public repository. An app that
 * boots on that default signs real session tokens with a key anyone can read,
 * and it does so silently -- the only symptom is that forging an admin token is
 * a five-line script. A missing secret has to be a startup failure, not a
 * warning somebody scrolls past.
 *
 * <p><b>Why this is gated on the {@code prod} profile.</b> The check cannot
 * simply reject the default everywhere: local development and the test suite
 * both need to boot without anyone exporting a secret first, and making every
 * contributor generate one before {@code mvn spring-boot:run} works is the kind
 * of friction that gets worked around by committing a shared secret -- which is
 * the problem this exists to prevent. So the rule is: development may use a
 * weak key, production may not, and deployment turns the profile on. The
 * Render blueprint sets both {@code SPRING_PROFILES_ACTIVE=prod} and a
 * generated secret, so a real deployment is covered by construction rather than
 * by remembering.
 *
 * <p>This runs as {@code @PostConstruct}, during bean initialisation, rather
 * than on {@code ApplicationReadyEvent}. The first version used the ready
 * event so the error would be the last line in the log, and testing it against
 * a real boot showed what that costs: Tomcat logged "started on port 8080" 50ms
 * before the check threw. A safety check that runs after the port opens leaves
 * a window, however short, where the service accepts requests and signs tokens
 * with the key it is about to reject. Bean initialisation completes before the
 * web server begins accepting connections, so failing here means the port never
 * opens at all.
 */
@Component
@Profile("prod")
public class ProductionSafetyCheck {

    private static final Logger log = LoggerFactory.getLogger(ProductionSafetyCheck.class);

    /** HS256 derives a 256-bit key, so anything shorter is padded and weaker than it looks. */
    private static final int MIN_SECRET_BYTES = 32;

    private final JwtProperties jwtProperties;

    public ProductionSafetyCheck(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    @PostConstruct
    void verify() {
        String secret = jwtProperties.secret();

        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET is not set. The prod profile is active, so there is no safe default to "
                            + "fall back to -- set JWT_SECRET to at least " + MIN_SECRET_BYTES
                            + " random bytes and restart.");
        }
        if (secret.contains("CHANGE_ME") || secret.contains("not-for-production")) {
            throw new IllegalStateException(
                    "JWT_SECRET is still a placeholder value. It is committed to the repository, so "
                            + "every token signed with it is forgeable. Set a real secret and restart.");
        }
        int length = secret.getBytes(StandardCharsets.UTF_8).length;
        if (length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET is " + length + " bytes; HS256 needs at least " + MIN_SECRET_BYTES
                            + ". A short key is padded to length, which makes it weaker than its "
                            + "apparent size suggests.");
        }

        log.info("Production safety check passed: signing key is {} bytes.", length);
    }
}
