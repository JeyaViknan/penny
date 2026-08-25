package com.penny.service;

import com.penny.domain.RefreshToken;
import com.penny.domain.User;
import com.penny.dto.AuthResponse;
import com.penny.dto.LoginRequest;
import com.penny.exception.InvalidTokenException;
import com.penny.repository.RefreshTokenRepository;
import com.penny.security.JwtService;
import com.penny.security.RefreshTokenGenerator;
import java.time.Instant;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final JwtService jwtService;
    private final RefreshTokenGenerator refreshTokenGenerator;
    private final RefreshTokenRepository refreshTokenRepository;

    public AuthService(AuthenticationManager authenticationManager,
                        UserService userService,
                        JwtService jwtService,
                        RefreshTokenGenerator refreshTokenGenerator,
                        RefreshTokenRepository refreshTokenRepository) {
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        this.jwtService = jwtService;
        this.refreshTokenGenerator = refreshTokenGenerator;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        User user = userService.getByUsername(request.username());
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        String hash = refreshTokenGenerator.hash(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new InvalidTokenException("Unknown refresh token"));

        if (!stored.isActive(Instant.now())) {
            throw new InvalidTokenException("Refresh token is expired or revoked");
        }

        // Rotate: revoke the presented token and issue a brand new pair. This bounds
        // the blast radius if a refresh token is ever replayed by an attacker -- the
        // legitimate client's next refresh will fail, signalling the compromise.
        refreshTokenRepository.save(revoke(stored));

        User user = userService.getById(stored.userId());
        return issueTokens(user);
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user.id(), user.username(), user.role().name());

        String rawRefreshToken = refreshTokenGenerator.generate();
        String hash = refreshTokenGenerator.hash(rawRefreshToken);
        RefreshToken refreshToken = RefreshToken.issue(user.id(), hash, jwtService.refreshTokenExpiry());
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.of(accessToken, rawRefreshToken, jwtService.accessTokenTtlSeconds());
    }

    private RefreshToken revoke(RefreshToken token) {
        return new RefreshToken(token.id(), token.userId(), token.tokenHash(), token.expiresAt(),
                Instant.now(), token.createdAt());
    }
}
