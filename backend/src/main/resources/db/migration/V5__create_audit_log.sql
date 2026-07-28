-- actor_user_id is nullable to allow logging unauthenticated or
-- system-initiated events (e.g. a failed login attempt) without an FK
-- that would force those rows to reference a real user.
CREATE TABLE audit_log (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id   BIGINT,
    action          VARCHAR(64)   NOT NULL,
    entity_type     VARCHAR(64)   NOT NULL,
    entity_id       VARCHAR(64),
    request_id      VARCHAR(64)   NOT NULL,
    ip_address      VARCHAR(45)   NOT NULL,
    details         TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_actor_user_id ON audit_log (actor_user_id);
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);

-- Same tamper-evidence guarantee as ledger_entries: an audit trail that can
-- be edited or deleted after the fact is not an audit trail.
CREATE TRIGGER trg_audit_log_no_update
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION reject_ledger_entry_mutation();

CREATE TRIGGER trg_audit_log_no_delete
    BEFORE DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION reject_ledger_entry_mutation();
