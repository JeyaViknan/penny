-- Users are the identity backing JWT authentication. Roles are a fixed,
-- small enumeration (see Role.java) so we store them as a constrained
-- varchar rather than a separate roles/user_roles join table -- a user in
-- this domain has exactly one role, and normalizing it would add joins
-- with no corresponding flexibility gain.
CREATE TABLE users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username        VARCHAR(64)  NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(16)  NOT NULL,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('CUSTOMER', 'TELLER', 'AUDITOR', 'ADMIN'))
);

CREATE INDEX idx_users_role ON users (role);

-- Refresh tokens are persisted (hashed) so they can be individually revoked
-- and so a stolen refresh token can be invalidated without rotating every
-- user's signing key. Access tokens remain stateless JWTs.
CREATE TABLE refresh_tokens (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users (id),
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ  NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
