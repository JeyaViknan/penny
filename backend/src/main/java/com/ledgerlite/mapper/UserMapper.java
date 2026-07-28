package com.ledgerlite.mapper;

import com.ledgerlite.domain.User;
import com.ledgerlite.dto.UserResponse;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toResponse(User user) {
        return new UserResponse(user.id(), user.username(), user.email(), user.role(), user.enabled(), user.createdAt());
    }
}
