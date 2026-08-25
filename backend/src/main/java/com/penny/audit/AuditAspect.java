package com.penny.audit;

import com.penny.domain.AuditLogEntry;
import com.penny.repository.AuditLogRepository;
import com.penny.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Writes one audit_log row per successful {@link Audited} method
 * invocation, in the same database transaction as the change itself
 * (default AOP advice ordering runs this inside the @Transactional
 * service method's transaction) -- so a rolled-back action never leaves
 * behind an audit row claiming it happened.
 */
@Aspect
@Component
public class AuditAspect {

    private final AuditLogRepository auditLogRepository;

    public AuditAspect(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Around("@annotation(audited)")
    public Object logAudit(ProceedingJoinPoint joinPoint, Audited audited) throws Throwable {
        Object result = joinPoint.proceed();

        AuditLogEntry entry = AuditLogEntry.of(
                currentActorId(),
                audited.action(),
                audited.entityType(),
                extractEntityId(result),
                currentRequestId(),
                currentIpAddress(),
                describeInvocation(joinPoint));
        auditLogRepository.save(entry);

        return result;
    }

    private Long currentActorId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getId();
        }
        return null;
    }

    private String currentRequestId() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return "n/a";
        }
        Object requestId = request.getAttribute(RequestIdFilter.ATTRIBUTE_NAME);
        return requestId != null ? requestId.toString() : "n/a";
    }

    private String currentIpAddress() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return "n/a";
        }
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return attrs.getRequest();
        }
        return null;
    }

    private String extractEntityId(Object result) {
        for (String accessor : new String[]{"id", "transactionId"}) {
            try {
                Method method = result.getClass().getMethod(accessor);
                Object value = method.invoke(result);
                if (value != null) {
                    return value.toString();
                }
            } catch (ReflectiveOperationException ignored) {
                // try the next candidate accessor
            }
        }
        return null;
    }

    /**
     * Deliberately does not dump method arguments: several @Audited methods
     * take DTOs carrying secrets (e.g. CreateUserRequest.password), and an
     * audit trail is exactly the wrong place for those to leak. This only
     * records which operation ran; the entityId field carries what changed.
     */
    private String describeInvocation(ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        return signature.getDeclaringType().getSimpleName() + "." + signature.getName();
    }
}
