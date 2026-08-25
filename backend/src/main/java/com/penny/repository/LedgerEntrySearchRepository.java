package com.penny.repository;

import com.penny.domain.EntryType;
import com.penny.dto.LedgerEntryResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * An account's ledger, with a running balance per entry.
 *
 * <p>A running balance is what makes a ledger a ledger rather than a list of
 * amounts: it lets a reader verify the arithmetic line by line and see the
 * account's position at any point in its history.
 *
 * <p><b>The window must see the whole account history.</b> The balance is
 * accumulated in a subquery ordered oldest-first with no LIMIT, and only the
 * outer query pages. Applying LIMIT/OFFSET before the window -- the obvious
 * implementation -- restarts the accumulation at the top of each page. That
 * produces correct values on page 1 and silently wrong ones from page 2 onward:
 * on this database it returned -107,500 for a row whose true balance is 372,500.
 */
@Repository
public class LedgerEntrySearchRepository {

    private static final String PAGE_SQL = """
            WITH ordered AS (
                SELECT le.id,
                       le.transaction_id,
                       le.account_id,
                       le.entry_type,
                       le.amount_minor_units,
                       le.created_at,
                       SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount_minor_units
                                ELSE -le.amount_minor_units END)
                         OVER (ORDER BY le.created_at, le.id
                               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
                FROM ledger_entries le
                WHERE le.account_id = :accountId
            )
            SELECT * FROM ordered
            ORDER BY created_at DESC, id DESC
            LIMIT :limit OFFSET :offset
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public LedgerEntrySearchRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<LedgerEntryResponse> findPage(Long accountId, int size, long offset) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("accountId", accountId)
                .addValue("limit", size)
                .addValue("offset", offset);
        return jdbc.query(PAGE_SQL, params, ROW_MAPPER);
    }

    public long count(Long accountId) {
        Long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM ledger_entries WHERE account_id = :accountId",
                new MapSqlParameterSource("accountId", accountId), Long.class);
        return total == null ? 0 : total;
    }

    private static final RowMapper<LedgerEntryResponse> ROW_MAPPER = (rs, rowNum) -> new LedgerEntryResponse(
            rs.getLong("id"),
            rs.getLong("transaction_id"),
            rs.getLong("account_id"),
            EntryType.valueOf(rs.getString("entry_type")),
            rs.getLong("amount_minor_units"),
            rs.getLong("running_balance"),
            instant(rs, "created_at"));

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }
}
