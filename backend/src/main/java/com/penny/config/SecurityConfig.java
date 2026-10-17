package com.penny.config;

import com.penny.security.JwtAuthenticationFilter;
import com.penny.security.RestAuthenticationEntryPoint;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {
            // Exactly the root, not a prefix: "/" matches only "/" in Spring
            // Security, so this opens the service index and nothing beneath it.
            "/",
            "/auth/login",
            "/auth/refresh",
            "/actuator/health",
            "/swagger-ui/**",
            "/v3/api-docs/**"
    };

    /**
     * Browser origins permitted to call this API.
     *
     * <p>Configured rather than compiled in. The previous value was the literal
     * list {@code http://localhost:*, https://*.netlify.app}, which meant
     * deploying the frontend anywhere else produced a failure that looks like
     * nothing in particular: the browser blocks the response before any
     * application code runs, so there is no log line, no status code worth
     * reading, and the UI just shows "Network Error" on sign-in. Making it an
     * environment variable turns a rebuild into a configuration change.
     *
     * <p>The default covers local development only. Deployments set
     * {@code CORS_ALLOWED_ORIGINS} to their own frontend origin -- the Render
     * blueprint wires it from the static site's URL, so the two cannot drift
     * apart by hand.
     */
    @Value("${penny.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(UserDetailsService userDetailsService,
                                                              PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter,
                                            RestAuthenticationEntryPoint restAuthenticationEntryPoint)
            throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(restAuthenticationEntryPoint))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Patterns, not plain origins: allowCredentials(true) forbids the "*"
        // wildcard, and a port-wildcarded localhost is still needed for dev.
        configuration.setAllowedOriginPatterns(normalise(allowedOrigins));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Accepts a bare hostname and assumes https.
     *
     * <p>An {@code Origin} header always carries a scheme, so a configured value
     * of {@code penny-web.onrender.com} would silently match nothing and every
     * browser request would be rejected -- with no server-side log line, because
     * CORS failures are enforced in the browser. Render's blueprint format can
     * only expose another service's address as a scheme-less host, so without
     * this the allowlist would have to be pasted in by hand after the first
     * deploy and corrected again on every rename. Anything that already has a
     * scheme, including {@code http://localhost:*}, is left exactly as written.
     */
    private static List<String> normalise(List<String> origins) {
        return origins.stream()
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .map(origin -> origin.startsWith("http://") || origin.startsWith("https://")
                        ? origin
                        : "https://" + origin)
                .toList();
    }
}
