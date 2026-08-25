package com.penny.repository.query;

/**
 * Sort direction, as an enum rather than a string.
 *
 * <p>Sort order reaches SQL as an {@code ORDER BY} fragment, which cannot be
 * parameter-bound. Restricting the caller to an enum means the only values that
 * can ever be concatenated are the two constants below -- there is no path for
 * user input to reach the statement.
 */
public enum SortDirection {
    ASC("ASC"),
    DESC("DESC");

    private final String sql;

    SortDirection(String sql) {
        this.sql = sql;
    }

    public String sql() {
        return sql;
    }
}
