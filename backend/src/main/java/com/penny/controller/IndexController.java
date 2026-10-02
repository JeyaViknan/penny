package com.penny.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * What the API says when you open it in a browser.
 *
 * <p>Without this, {@code GET /} returns {@code 401 Authentication is required},
 * because the root is not a public endpoint and every unmatched path falls
 * through to the authenticated branch. That is technically correct and
 * practically terrible: the first thing anyone does with a deployed API URL is
 * paste it into a browser, and a 401 at the root reads as "this service is
 * broken" rather than "you are at the API, and the parts you can reach without
 * a token are over here".
 *
 * <p>It deliberately exposes nothing an unauthenticated caller could not
 * already find. The paths below are public by configuration anyway, and naming
 * them is what makes the service self-describing instead of requiring the
 * README to be open alongside it.
 */
@RestController
@Tag(name = "Index")
public class IndexController {

    @GetMapping("/")
    @Operation(summary = "Service index: what this is and where the public entry points are")
    public ResponseEntity<Map<String, Object>> index() {
        return ResponseEntity.ok(Map.of(
                "service", "Penny",
                "description", "Double-entry transaction ledger. Balances are derived from immutable "
                        + "ledger entries, never stored.",
                "status", "ok",
                "links", Map.of(
                        "documentation", "/swagger-ui.html",
                        "openapi", "/v3/api-docs",
                        "health", "/actuator/health",
                        "authenticate", "POST /auth/login"),
                "note", "Every other endpoint requires a bearer token. This is the API, not the "
                        + "web interface."));
    }
}
