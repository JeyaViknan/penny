package com.ledgerlite.ledger;

import com.ledgerlite.domain.Role;
import com.ledgerlite.dto.PageResponse;
import com.ledgerlite.dto.TransactionSummaryResponse;
import com.ledgerlite.repository.TransactionRepository;
import com.ledgerlite.security.AccountAccessGuard;
import com.ledgerlite.security.UserPrincipal;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Paged transaction history.
 *
 * <p>Authorization is applied as a SQL filter rather than by discarding rows
 * after the query: a CUSTOMER's request is narrowed to transactions touching
 * their own accounts before LIMIT is applied, so pages stay full and a customer
 * cannot learn how many transactions exist that they cannot see.
 */
@Service
public class TransactionHistoryService {

    private static final int MAX_PAGE_SIZE = 100;

    private final TransactionRepository transactionRepository;
    private final AccountAccessGuard accountAccessGuard;

    public TransactionHistoryService(TransactionRepository transactionRepository, AccountAccessGuard accountAccessGuard) {
        this.transactionRepository = transactionRepository;
        this.accountAccessGuard = accountAccessGuard;
    }

    public PageResponse<TransactionSummaryResponse> history(UserPrincipal principal, Long accountId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);

        Long ownerFilter = principal.getUser().role() == Role.CUSTOMER ? principal.getId() : null;

        // A customer asking for a specific account must own it; otherwise the
        // owner filter alone would silently return an empty page and read as
        // "no transactions" rather than "not yours".
        if (accountId != null && ownerFilter != null && !accountAccessGuard.isOwnerOf(accountId, principal.getId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You do not have access to account " + accountId);
        }

        long total = transactionRepository.countSummaries(ownerFilter, accountId);
        List<TransactionSummaryResponse> items = transactionRepository
                .findSummaries(ownerFilter, accountId, safeSize, (long) safePage * safeSize)
                .stream()
                .map(s -> new TransactionSummaryResponse(
                        s.transactionId(), s.transactionType(), s.reference(), s.amountMinorUnits(),
                        s.debitAccountId(), s.debitAccountNumber(),
                        s.creditAccountId(), s.creditAccountNumber(), s.createdAt()))
                .toList();

        return PageResponse.of(items, safePage, safeSize, total);
    }
}
