package com.ledgerlite.security;

import com.ledgerlite.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * Spring Security's default entry point returns a bare 403 for missing/invalid
 * credentials, which is indistinguishable from "authenticated but forbidden".
 * This returns 401 with the same {@link ErrorResponse} shape every other
 * endpoint uses, so API consumers get one consistent error contract.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                          AuthenticationException authException) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponse body = ErrorResponse.of(HttpStatus.UNAUTHORIZED.value(), "Unauthorized",
                "Authentication is required to access this resource", request.getRequestURI());
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
