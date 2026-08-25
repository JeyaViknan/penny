package com.penny.ledger;

import com.penny.domain.Role;
import com.penny.domain.TransactionSummary;
import com.penny.domain.User;
import com.penny.dto.PageResponse;
import com.penny.dto.TransactionSummaryResponse;
import com.penny.repository.TransactionSearchRepository;
import com.penny.repository.query.TransactionQuery;
import com.penny.security.AccountAccessGuard;
import com.penny.security.UserPrincipal;
import com.penny.service.UserService;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/**
 * Filtered, paged transaction history.
 *
 * <p>Authorization is applied as a SQL filter rather than by discarding rows
 * after the query: a CUSTOMER's request is narrowed to transactions touching
 * their own accounts before LIMIT is applied, so pages stay full and a customer
 * cannot infer how many transactions exist that they cannot see.
 */
@Service
public class TransactionHistoryService {

    private final TransactionSearchRepository searchRepository;
    private final AccountAccessGuard accountAccessGuard;
    private final UserService userService;

    public TransactionHistoryService(TransactionSearchRepository searchRepository,
                                      AccountAccessGuard accountAccessGuard,
                                      UserService userService) {
        this.searchRepository = searchRepository;
        this.accountAccessGuard = accountAccessGuard;
        this.userService = userService;
    }

    public PageResponse<TransactionSummaryResponse> history(UserPrincipal principal, TransactionQuery request) {
        Long ownerFilter = principal.getUser().role() == Role.CUSTOMER ? principal.getId() : null;

        // A customer asking for a specific account must own it. Relying on the
        // owner filter alone would return an empty page, which reads as "no
        // transactions" rather than "not yours".
        if (request.accountId() != null && ownerFilter != null
                && !accountAccessGuard.isOwnerOf(request.accountId(), principal.getId())) {
            throw new AccessDeniedException("You do not have access to account " + request.accountId());
        }

        TransactionQuery query = request.withOwnerUserId(ownerFilter);

        long total = searchRepository.count(query);
        List<TransactionSummary> rows = searchRepository.search(query);
        Map<Long, String> usernames = usernamesFor(rows);

        List<TransactionSummaryResponse> items = rows.stream()
                .map(s -> new TransactionSummaryResponse(
                        s.transactionId(), s.transactionType(), s.reference(), s.amountMinorUnits(),
                        s.debitAccountId(), s.debitAccountNumber(), usernames.get(s.debitOwnerUserId()),
                        s.creditAccountId(), s.creditAccountNumber(), usernames.get(s.creditOwnerUserId()),
                        s.initiatedByUserId(), usernames.get(s.initiatedByUserId()),
                        s.createdAt()))
                .toList();

        return PageResponse.of(items, query.page(), query.size(), total);
    }

    /**
     * Resolves every user id on the page in a single query rather than one per
     * row -- a 100-row page references at most a handful of distinct people.
     */
    private Map<Long, String> usernamesFor(List<TransactionSummary> rows) {
        List<Long> ids = rows.stream()
                .flatMap(s -> Stream.of(s.debitOwnerUserId(), s.creditOwnerUserId(), s.initiatedByUserId()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return userService.getAllByIds(ids).stream()
                .collect(Collectors.toMap(User::id, User::username, (a, b) -> a));
    }
}
