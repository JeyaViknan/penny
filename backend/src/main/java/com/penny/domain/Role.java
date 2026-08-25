package com.penny.domain;

/**
 * CUSTOMER sees only their own accounts/transfers. TELLER can initiate
 * transfers and open accounts on behalf of customers. AUDITOR has
 * read-only access to everything, including the audit log. ADMIN has
 * full access. Enforced via method security in the service layer, not
 * the controller layer, so authorization can't be bypassed by a new
 * controller forgetting to check.
 */
public enum Role {
    CUSTOMER,
    TELLER,
    AUDITOR,
    ADMIN
}
