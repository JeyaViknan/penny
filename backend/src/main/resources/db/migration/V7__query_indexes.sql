-- Indexes supporting the query capabilities added alongside the operator UI.
--
-- The existing index on ledger_entries is (account_id, created_at DESC), which
-- serves reading an account's history newest-first. The running-balance window
-- accumulates in the opposite direction -- ORDER BY created_at, id ascending --
-- so it needs a matching ascending index, with id included because that is the
-- window's tie-breaker.
CREATE INDEX idx_ledger_entries_account_created_asc
    ON ledger_entries (account_id, created_at, id);

-- Transaction history is filtered by amount range and sorted by amount. The
-- amount lives on the entries, and the transaction_summaries view reads it from
-- the debit leg, so the useful index is on the entries themselves.
CREATE INDEX idx_ledger_entries_amount
    ON ledger_entries (amount_minor_units);

-- The audit trail is now filtered by actor and by action, and always ordered
-- newest-first. actor_user_id and created_at already have single-column indexes
-- from V5; this composite serves the common "what did this person do recently"
-- query without a sort step.
CREATE INDEX idx_audit_log_actor_created
    ON audit_log (actor_user_id, created_at DESC);

-- Deliberately NOT indexed:
--   transactions.transaction_type and audit_log.action are three- and six-value
--   columns. A btree index on that cardinality is not selective enough to beat
--   a scan, and would only add write cost to an append-only table.
--
--   transactions.reference is searched with ILIKE '%term%', which no btree can
--   serve. Making that fast needs pg_trgm plus a GIN index; it is deliberately
--   deferred until the data volume justifies the extension dependency, since
--   the search is already correct without it.
