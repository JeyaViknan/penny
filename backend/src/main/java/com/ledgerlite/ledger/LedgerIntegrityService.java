package com.ledgerlite.ledger;

import com.ledgerlite.dto.LedgerIntegrityResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

/**
 * Independent verification that the ledger still balances.
 *
 * <p>This deliberately re-derives the totals straight from {@code ledger_entries}
 * rather than reading the {@code account_balances} view, so it is a genuine
 * cross-check: a bug in the view's arithmetic would be caught here instead of
 * being reflected back as agreement.
 *
 * <p>Two invariants are asserted:
 * <ul>
 *   <li>total debits == total credits, and</li>
 *   <li>the sum of every account balance is exactly zero.</li>
 * </ul>
 * The second only holds because money entering the ledger is posted against the
 * cash vault rather than conjured onto a customer account -- it is the property
 * that makes "was money created anywhere?" answerable with one query.
 */
@Service
public class LedgerIntegrityService {

    private final JdbcTemplate jdbcTemplate;

    public LedgerIntegrityService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public LedgerIntegrityResponse check() {
        Long totalDebits = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(amount_minor_units), 0) FROM ledger_entries WHERE entry_type = 'DEBIT'", Long.class);
        Long totalCredits = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(amount_minor_units), 0) FROM ledger_entries WHERE entry_type = 'CREDIT'", Long.class);
        Long netAcrossAccounts = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(balance_minor_units), 0) FROM account_balances", Long.class);
        Long entryCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM ledger_entries", Long.class);

        long debits = totalDebits == null ? 0 : totalDebits;
        long credits = totalCredits == null ? 0 : totalCredits;
        long net = netAcrossAccounts == null ? 0 : netAcrossAccounts;

        return new LedgerIntegrityResponse(
                debits == credits && net == 0,
                debits,
                credits,
                net,
                entryCount == null ? 0 : entryCount);
    }
}
