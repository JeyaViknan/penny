-- account_number is the externally-facing identifier (what a customer reads
-- off a statement); id remains the internal surrogate key used by foreign keys.
CREATE TABLE accounts (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_number  VARCHAR(20)  NOT NULL,
    owner_user_id   BIGINT       NOT NULL REFERENCES users (id),
    account_type    VARCHAR(16)  NOT NULL,
    status          VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    currency        VARCHAR(3)   NOT NULL DEFAULT 'USD',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_accounts_account_number UNIQUE (account_number),
    CONSTRAINT ck_accounts_type CHECK (account_type IN ('CHECKING', 'SAVINGS')),
    CONSTRAINT ck_accounts_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'CLOSED'))
);

CREATE INDEX idx_accounts_owner_user_id ON accounts (owner_user_id);
CREATE INDEX idx_accounts_status ON accounts (status);
