package com.penny.repository;

import com.penny.domain.TransactionSummary;
import com.penny.domain.TransactionType;
import com.penny.repository.query.TransactionQuery;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Filtered, sorted, paged reads over the {@code transaction_summaries} view.
 *
 * <p>This is deliberately not a Spring Data {@code @Query} method. Two of the
 * required capabilities cannot be expressed there: a multi-select type filter
 * (an empty {@code IN ()} list is invalid SQL) and a caller-chosen sort column
 * (an {@code ORDER BY} cannot be parameter-bound). Assembling the statement here
 * handles both, and matches the existing precedent of {@code LedgerIntegrityService}
 * using JdbcTemplate directly.
 *
 * <p>Safety: every value reaches the database as a bound parameter. The only
 * concatenated text is the {@code ORDER BY}, which is built from
 * {@link com.penny.repository.query.TransactionSort} and
 * {@link com.penny.repository.query.SortDirection} constants -- user input never
 * reaches it.
 */
@Repository
public class TransactionSearchRepository {

    private static final String SELECT = """
            SELECT transaction_id, transaction_type, reference, amount_minor_units,
                   debit_account_id, debit_account_number, debit_owner_user_id,
                   credit_account_id, credit_account_number, credit_owner_user_id,
                   initiated_by_user_id, created_at
            FROM transaction_summaries
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public TransactionSearchRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<TransactionSummary> search(TransactionQuery query) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        String sql = SELECT + where(query, params)
                + " ORDER BY " + query.sort().orderBy(query.direction())
                + " LIMIT :limit OFFSET :offset";
        params.addValue("limit", query.size());
        params.addValue("offset", query.offset());
        return jdbc.query(sql, params, ROW_MAPPER);
    }

    public long count(TransactionQuery query) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        String sql = "SELECT COUNT(*) FROM transaction_summaries" + where(query, params);
        Long total = jdbc.queryForObject(sql, params, Long.class);
        return total == null ? 0 : total;
    }

    /**
     * Builds the shared WHERE clause. Both the page query and the count query call
     * this, so a filter can never apply to one and not the other -- which would
     * show a page of results alongside a total that disagrees with it.
     */
    private String where(TransactionQuery query, MapSqlParameterSource params) {
        List<String> clauses = new ArrayList<>();

        if (query.ownerUserId() != null) {
            clauses.add("(debit_owner_user_id = :ownerUserId OR credit_owner_user_id = :ownerUserId)");
            params.addValue("ownerUserId", query.ownerUserId());
        }
        if (query.accountId() != null) {
            clauses.add("(debit_account_id = :accountId OR credit_account_id = :accountId)");
            params.addValue("accountId", query.accountId());
        }
        if (query.text() != null) {
            // Case-insensitive contains. Wildcards in the user's own text are escaped
            // so a literal '%' searches for a percent sign rather than matching everything.
            clauses.add("reference ILIKE :text ESCAPE '\\'");
            params.addValue("text", "%" + escapeLike(query.text()) + "%");
        }
        if (query.types() != null) {
            clauses.add("transaction_type IN (:types)");
            params.addValue("types", query.types().stream().map(TransactionType::name).toList());
        }
        if (query.from() != null) {
            clauses.add("created_at >= :from");
            params.addValue("from", OffsetDateTime.ofInstant(query.from(), java.time.ZoneOffset.UTC));
        }
        if (query.to() != null) {
            clauses.add("created_at <= :to");
            params.addValue("to", OffsetDateTime.ofInstant(query.to(), java.time.ZoneOffset.UTC));
        }
        if (query.minAmountMinorUnits() != null) {
            clauses.add("amount_minor_units >= :minAmount");
            params.addValue("minAmount", query.minAmountMinorUnits());
        }
        if (query.maxAmountMinorUnits() != null) {
            clauses.add("amount_minor_units <= :maxAmount");
            params.addValue("maxAmount", query.maxAmountMinorUnits());
        }

        return clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses);
    }

    /** Neutralises LIKE metacharacters so they are matched literally. */
    private static String escapeLike(String input) {
        return input.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static final RowMapper<TransactionSummary> ROW_MAPPER = (rs, rowNum) -> new TransactionSummary(
            rs.getLong("transaction_id"),
            TransactionType.valueOf(rs.getString("transaction_type")),
            rs.getString("reference"),
            rs.getLong("amount_minor_units"),
            rs.getLong("debit_account_id"),
            rs.getString("debit_account_number"),
            nullableLong(rs, "debit_owner_user_id"),
            rs.getLong("credit_account_id"),
            rs.getString("credit_account_number"),
            nullableLong(rs, "credit_owner_user_id"),
            nullableLong(rs, "initiated_by_user_id"),
            instant(rs, "created_at"));

    /** The vault has no owner, so owner columns are genuinely null rather than 0. */
    private static Long nullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }
}
