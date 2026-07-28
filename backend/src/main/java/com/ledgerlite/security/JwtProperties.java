package com.ledgerlite.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ledgerlite.jwt")
public record JwtProperties(String secret, long accessTokenTtlMinutes, long refreshTokenTtlDays) {
}
