package com.ledgerlite;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for tests that need a real PostgreSQL instance. Every
 * integration/repository test extends this instead of using H2, so
 * Flyway migrations, PostgreSQL-specific SQL (FOR UPDATE, IDENTITY
 * columns, CHECK constraints) and locking behavior are all exercised
 * against the real database engine. Requests go through MockMvc rather
 * than a raw HTTP client so the full filter chain (JWT, CORS, exception
 * handling) runs without the flakiness of managing real sockets in tests.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("ledgerlite_test")
            .withUsername("ledgerlite")
            .withPassword("ledgerlite");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
