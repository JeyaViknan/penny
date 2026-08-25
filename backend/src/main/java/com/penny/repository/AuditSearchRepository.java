package com.penny.repository;

import com.penny.domain.AuditLogEntry;
import com.penny.repository.query.AuditQuery;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Filtered, paged reads over {@code audit_log}.
 *
 * <p>The previous implementation returned the entire table on every request. The
 * table is append-only and grows with every user creation, account opening,
 * status change, transfer, deposit and withdrawal, so it never shrinks --
 * unbounded was only survivable because the dataset was small.
 *
 * <p>Ordering is fixed newest-first and tie-broken by id: an audit trail is read
 * chronologically, and a stable order is what lets a reader page through it
 * without rows shifting underneath them.
 */
@Repository
public class AuditSearchRepository {

    private static final String SELECT = """
            SELECT id, actor_user_id, action, entity_type, entity_id,
                   request_id, ip_address, details, created_at
            FROM audit_log
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public AuditSearchRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<AuditLogEntry> search(AuditQuery query) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        String sql = SELECT + where(query, params)
                + " ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset";
        params.addValue("limit", query.size());
        params.addValue("offset", query.offset());
        return jdbc.query(sql, params, ROW_MAPPER);
    }

    public long count(AuditQuery query) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        Long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_log" + where(query, params), params, Long.class);
        return total == null ? 0 : total;
    }

    /** Shared by the page and count queries so a filter cannot apply to only one. */
    private String where(AuditQuery query, MapSqlParameterSource params) {
        List<String> clauses = new ArrayList<>();

        if (query.action() != null) {
            clauses.add("action = :action");
            params.addValue("action", query.action());
        }
        if (query.entityType() != null) {
            clauses.add("entity_type = :entityType");
            params.addValue("entityType", query.entityType());
        }
        if (query.entityId() != null) {
            clauses.add("entity_id = :entityId");
            params.addValue("entityId", query.entityId());
        }
        if (query.actorUserId() != null) {
            clauses.add("actor_user_id = :actorUserId");
            params.addValue("actorUserId", query.actorUserId());
        }
        if (query.from() != null) {
            clauses.add("created_at >= :from");
            params.addValue("from", OffsetDateTime.ofInstant(query.from(), ZoneOffset.UTC));
        }
        if (query.to() != null) {
            clauses.add("created_at <= :to");
            params.addValue("to", OffsetDateTime.ofInstant(query.to(), ZoneOffset.UTC));
        }

        return clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses);
    }

    private static final RowMapper<AuditLogEntry> ROW_MAPPER = (rs, rowNum) -> new AuditLogEntry(
            rs.getLong("id"),
            nullableLong(rs, "actor_user_id"),
            rs.getString("action"),
            rs.getString("entity_type"),
            rs.getString("entity_id"),
            rs.getString("request_id"),
            rs.getString("ip_address"),
            rs.getString("details"),
            instant(rs, "created_at"));

    /** Actor is null for system-initiated events, not zero. */
    private static Long nullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }
}
