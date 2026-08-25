package com.penny.repository.query;

import com.penny.domain.TransactionType;
import java.time.Instant;
import java.util.Set;

/**
 * Every filter the transaction ledger supports, in one object.
 *
 * <p>A record rather than a long parameter list: the search and count queries
 * must apply an identical WHERE clause, and passing one value guarantees they
 * cannot drift apart as filters are added.
 *
 * <p>{@code ownerUserId} is not a user-supplied filter -- it is the
 * access-control narrowing applied to CUSTOMER callers, set by the service and
 * never by the request. Keeping it in the same object means authorization is
 * applied in SQL alongside the filters, so LIMIT still counts only rows the
 * caller may see.
 */
public record TransactionQuery(
        Long ownerUserId,
        Long accountId,
        String text,
        Set<TransactionType> types,
        Instant from,
        Instant to,
        Long minAmountMinorUnits,
        Long maxAmountMinorUnits,
        TransactionSort sort,
        SortDirection direction,
        int page,
        int size
) {

    public static final int MAX_PAGE_SIZE = 100;

    /** Normalises paging and applies defaults so callers cannot produce an invalid query. */
    public TransactionQuery {
        page = Math.max(page, 0);
        size = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        sort = sort == null ? TransactionSort.DATE : sort;
        direction = direction == null ? SortDirection.DESC : direction;
        text = (text == null || text.isBlank()) ? null : text.trim();
        types = (types == null || types.isEmpty()) ? null : Set.copyOf(types);
    }

    public long offset() {
        return (long) page * size;
    }

    public TransactionQuery withOwnerUserId(Long owner) {
        return new TransactionQuery(owner, accountId, text, types, from, to,
                minAmountMinorUnits, maxAmountMinorUnits, sort, direction, page, size);
    }
}
