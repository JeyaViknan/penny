package com.ledgerlite.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(LedgerLiteException.class)
    public ResponseEntity<ErrorResponse> handleDomain(LedgerLiteException ex, HttpServletRequest request) {
        HttpStatus status = ex.status();
        return ResponseEntity.status(status)
                .body(ErrorResponse.of(status.value(), status.getReasonPhrase(), ex.getMessage(), request.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ErrorResponse.FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new ErrorResponse.FieldError(fe.getField(), fe.getDefaultMessage()))
                .toList();
        return ResponseEntity.badRequest().body(ErrorResponse.ofFieldErrors(
                HttpStatus.BAD_REQUEST.value(), "Bad Request", "Validation failed", request.getRequestURI(), fieldErrors));
    }

    @ExceptionHandler({BadCredentialsException.class, DisabledException.class})
    public ResponseEntity<ErrorResponse> handleAuth(RuntimeException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ErrorResponse.of(
                HttpStatus.UNAUTHORIZED.value(), "Unauthorized", "Invalid credentials", request.getRequestURI()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ErrorResponse.of(
                HttpStatus.FORBIDDEN.value(), "Forbidden", "You do not have permission to perform this action",
                request.getRequestURI()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        return ResponseEntity.badRequest().body(ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(), "Bad Request", ex.getMessage(), request.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        return ResponseEntity.internalServerError().body(ErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(), "Internal Server Error",
                "An unexpected error occurred", request.getRequestURI()));
    }
}
