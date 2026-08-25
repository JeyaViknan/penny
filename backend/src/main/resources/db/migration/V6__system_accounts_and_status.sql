-- Deposits and withdrawals were previously impossible: money could only be
-- moved between two existing customer accounts, so a balance could only be
-- created by inserting ledger rows by hand. That is not fixable by "just
-- crediting" an account -- double-entry forbids a posting with only one leg.
--
-- The accounting-correct fix is a bank-owned counterparty. A cash deposit is
-- really two facts: the customer's claim on the bank goes up, and the bank's
-- cash position goes down by the same amount. So:
--
--   deposit  : DEBIT vault, CREDIT customer
--   withdraw : DEBIT customer, CREDIT vault
--
-- The vault legitimately runs negative -- it represents value entering the
-- ledger from outside it -- so accounts gain an explicit opt-in for that
-- rather than special-casing "is this the vault?" in the balance check.
--
-- With this in place the ledger gains a much stronger global invariant than
-- "every transaction balances": the sum of *every* account balance is always
-- exactly zero. See LedgerIntegrityService.

ALTER TABLE accounts
    ADD COLUMN allow_negative_balance BOOLEAN NOT NULL DEFAULT FALSE;

-- System accounts are owned by the institution, not by a user.
ALTER TABLE accounts
    ALTER COLUMN owner_user_id DROP NOT NULL;

ALTER TABLE accounts
    DROP CONSTRAINT ck_accounts_type;

ALTER TABLE accounts
    ADD CONSTRAINT ck_accounts_type CHECK (account_type IN ('CHECKING', 'SAVINGS', 'SYSTEM'));

-- A SYSTEM account has no owner; every customer-facing account must have one.
ALTER TABLE accounts
    ADD CONSTRAINT ck_accounts_owner_matches_type CHECK (
        (account_type = 'SYSTEM' AND owner_user_id IS NULL)
        OR (account_type <> 'SYSTEM' AND owner_user_id IS NOT NULL)
    );

-- Only system accounts may carry a negative balance.
ALTER TABLE accounts
    ADD CONSTRAINT ck_accounts_negative_only_system CHECK (
        allow_negative_balance = FALSE OR account_type = 'SYSTEM'
    );

-- The cash vault. Reserved account number, seeded once here so the deposit
-- path has a counterparty on a fresh database with no manual setup step.
INSERT INTO accounts (account_number, owner_user_id, account_type, status, currency, allow_negative_balance)
VALUES ('000000000001', NULL, 'SYSTEM', 'ACTIVE', 'USD', TRUE);

-- Transactions gain a type so the history view can distinguish a transfer
-- from a deposit without inferring it from which accounts were involved.
ALTER TABLE transactions
    ADD COLUMN transaction_type VARCHAR(16) NOT NULL DEFAULT 'TRANSFER';

ALTER TABLE transactions
    ADD CONSTRAINT ck_transactions_type CHECK (transaction_type IN ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL'));

CREATE INDEX idx_transactions_created_at ON transactions (created_at DESC);
CREATE INDEX idx_ledger_entries_account_created ON ledger_entries (account_id, created_at DESC);

-- Read model for transaction history: flattens each transaction's debit and
-- credit legs back into a single from/to/amount row. Defined as a view rather
-- than repeated in query methods so the join lives in exactly one place.
--
-- The 1:1 join is only sound because every transaction has exactly one debit
-- and one credit -- guaranteed by LedgerPostingService being the sole writer.
CREATE VIEW transaction_summaries AS
SELECT t.id                   AS transaction_id,
       t.transaction_type     AS transaction_type,
       t.reference            AS reference,
       d.amount_minor_units   AS amount_minor_units,
       d.account_id           AS debit_account_id,
       da.account_number      AS debit_account_number,
       da.owner_user_id       AS debit_owner_user_id,
       c.account_id           AS credit_account_id,
       ca.account_number      AS credit_account_number,
       ca.owner_user_id       AS credit_owner_user_id,
       t.initiated_by_user_id AS initiated_by_user_id,
       t.created_at           AS created_at
FROM transactions t
JOIN ledger_entries d ON d.transaction_id = t.id AND d.entry_type = 'DEBIT'
JOIN ledger_entries c ON c.transaction_id = t.id AND c.entry_type = 'CREDIT'
JOIN accounts da ON da.id = d.account_id
JOIN accounts ca ON ca.id = c.account_id;
