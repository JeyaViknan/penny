-- A transaction is the logical unit of a money movement (e.g. one transfer).
-- It never carries a balance or amount itself -- that lives entirely in its
-- ledger entries -- so the header can't drift out of sync with the postings.
CREATE TABLE transactions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reference           VARCHAR(140) NOT NULL,
    initiated_by_user_id BIGINT      NOT NULL REFERENCES users (id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Every transaction must post at least a debit and a credit; entries are
-- append-only (enforced below with triggers, not just application code,
-- since a banking ledger must be tamper-evident even against a bug or a
-- direct SQL console session).
CREATE TABLE ledger_entries (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id      BIGINT       NOT NULL REFERENCES transactions (id),
    account_id          BIGINT       NOT NULL REFERENCES accounts (id),
    entry_type          VARCHAR(6)   NOT NULL,
    amount_minor_units  BIGINT       NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT ck_ledger_entries_type CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    CONSTRAINT ck_ledger_entries_amount_positive CHECK (amount_minor_units > 0)
);

CREATE INDEX idx_ledger_entries_transaction_id ON ledger_entries (transaction_id);
CREATE INDEX idx_ledger_entries_account_id ON ledger_entries (account_id);

-- Balance is always derived, never stored: SUM(CREDIT) - SUM(DEBIT). This view
-- is the single source of truth for "what is this account's balance" so the
-- application can never accidentally read a stale, independently-mutated column.
CREATE VIEW account_balances AS
SELECT
    a.id AS account_id,
    a.account_number,
    COALESCE(SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount_minor_units ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount_minor_units ELSE 0 END), 0)
        AS balance_minor_units
FROM accounts a
LEFT JOIN ledger_entries le ON le.account_id = a.id
GROUP BY a.id, a.account_number;

-- Enforce append-only at the database level: no UPDATE or DELETE on ledger
-- entries, regardless of caller (application code, migrations, or a human
-- with psql access). This is what makes the ledger tamper-evident.
CREATE OR REPLACE FUNCTION reject_ledger_entry_mutation() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ledger_entries is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_entries_no_update
    BEFORE UPDATE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION reject_ledger_entry_mutation();

CREATE TRIGGER trg_ledger_entries_no_delete
    BEFORE DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION reject_ledger_entry_mutation();
