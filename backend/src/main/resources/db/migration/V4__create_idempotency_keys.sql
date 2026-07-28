-- Scoped per-user: the same raw key string from two different users must
-- not collide. request_hash detects a key being replayed with a different
-- payload, which is a client bug (or an attack) rather than a legitimate
-- retry and must be rejected, not silently served from cache.
CREATE TABLE idempotency_keys (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idempotency_key     VARCHAR(128) NOT NULL,
    user_id             BIGINT       NOT NULL REFERENCES users (id),
    request_hash        VARCHAR(64)  NOT NULL,
    response_status     INT,
    response_body       TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,

    CONSTRAINT uq_idempotency_keys_user_key UNIQUE (user_id, idempotency_key)
);
