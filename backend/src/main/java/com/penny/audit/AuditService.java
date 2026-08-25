package com.penny.audit;

import com.penny.domain.AuditLogEntry;
import com.penny.domain.User;
import com.penny.dto.AuditLogResponse;
import com.penny.dto.PageResponse;
import com.penny.repository.AuditSearchRepository;
import com.penny.repository.query.AuditQuery;
import com.penny.service.UserService;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

/** Read side of the audit trail. Writes only ever happen via {@link AuditAspect}. */
@Service
public class AuditService {

    private final AuditSearchRepository auditSearchRepository;
    private final UserService userService;

    public AuditService(AuditSearchRepository auditSearchRepository, UserService userService) {
        this.auditSearchRepository = auditSearchRepository;
        this.userService = userService;
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public PageResponse<AuditLogResponse> search(AuditQuery query) {
        long total = auditSearchRepository.count(query);
        List<AuditLogEntry> rows = auditSearchRepository.search(query);

        // One lookup for every actor on the page. An audit row that reads
        // "user #4" instead of a name forces the reader to go and resolve it.
        List<Long> actorIds = rows.stream()
                .map(AuditLogEntry::actorUserId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, String> usernames = actorIds.isEmpty()
                ? Map.of()
                : userService.getAllByIds(actorIds).stream()
                        .collect(Collectors.toMap(User::id, User::username, (a, b) -> a));

        List<AuditLogResponse> items = rows.stream()
                .map(e -> new AuditLogResponse(
                        e.id(), e.actorUserId(), usernames.get(e.actorUserId()), e.action(),
                        e.entityType(), e.entityId(), e.requestId(), e.ipAddress(),
                        e.details(), e.createdAt()))
                .toList();

        return PageResponse.of(items, query.page(), query.size(), total);
    }
}
