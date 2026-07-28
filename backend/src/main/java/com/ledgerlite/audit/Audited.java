package com.ledgerlite.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a service method as a state-changing action that must produce an
 * audit_log row. Kept declarative rather than scattering
 * {@code auditService.record(...)} calls through every service method --
 * one aspect (see {@link AuditAspect}) owns how audit rows get written.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Audited {

    String action();

    String entityType();
}
