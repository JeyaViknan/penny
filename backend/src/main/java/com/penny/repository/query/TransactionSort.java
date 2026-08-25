package com.penny.repository.query;

/**
 * Sortable columns for transaction history.
 *
 * <p>Each constant carries the literal SQL it maps to. Callers choose a
 * constant, never a column name, so the {@code ORDER BY} clause is built
 * entirely from values defined here.
 *
 * <p>Every sort is tie-broken by {@code transaction_id} so paging is stable:
 * without it, rows sharing a timestamp could reappear or vanish between pages.
 */
public enum TransactionSort {
    DATE("created_at"),
    AMOUNT("amount_minor_units");

    private final String column;

    TransactionSort(String column) {
        this.column = column;
    }

    public String orderBy(SortDirection direction) {
        return column + " " + direction.sql() + ", transaction_id " + direction.sql();
    }
}
