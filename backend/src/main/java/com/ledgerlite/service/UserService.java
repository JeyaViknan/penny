package com.ledgerlite.service;

import com.ledgerlite.audit.Audited;
import com.ledgerlite.domain.User;
import com.ledgerlite.dto.CreateUserRequest;
import com.ledgerlite.exception.DuplicateResourceException;
import com.ledgerlite.exception.ResourceNotFoundException;
import com.ledgerlite.repository.UserRepository;
import java.util.List;
import java.util.stream.StreamSupport;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER')")
    @Audited(action = "CREATE_USER", entityType = "User")
    public User createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new DuplicateResourceException("Username already taken: " + request.username());
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email already registered: " + request.email());
        }

        User user = User.newUser(
                request.username(),
                request.email(),
                passwordEncoder.encode(request.password()),
                request.role());
        return userRepository.save(user);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public List<User> listUsers() {
        return StreamSupport.stream(userRepository.findAll().spliterator(), false).toList();
    }

    /**
     * Batch lookup used when rendering lists, so a list of N accounts costs one
     * query for owners rather than N. Unrestricted for the same reason as
     * {@link #getById} -- it only ever supplies display names for records the
     * caller has already been authorized to see.
     */
    public List<User> getAllByIds(List<Long> ids) {
        return StreamSupport.stream(userRepository.findAllById(ids).spliterator(), false).toList();
    }

    /** Unrestricted: used internally (e.g. token refresh, FK existence checks) where there is no end-user request to authorize. */
    public User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No user with id: " + id));
    }

    /** Authorization boundary for "view a user's profile" -- ADMIN/AUDITOR/TELLER can view anyone, a CUSTOMER only themselves. */
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'TELLER') or #id == authentication.principal.id")
    public User getProfile(Long id) {
        return getById(id);
    }

    public User getByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("No user with username: " + username));
    }
}
