package com.ledgerlite.controller;

import com.ledgerlite.dto.CreateUserRequest;
import com.ledgerlite.dto.UserResponse;
import com.ledgerlite.mapper.UserMapper;
import com.ledgerlite.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
@Tag(name = "Users")
public class UserController {

    private final UserService userService;
    private final UserMapper userMapper;

    public UserController(UserService userService, UserMapper userMapper) {
        this.userService = userService;
        this.userMapper = userMapper;
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        var user = userService.createUser(request);
        var response = userMapper.toResponse(user);
        return ResponseEntity.created(URI.create("/users/" + user.id())).body(response);
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> listUsers() {
        var response = userService.listUsers().stream().map(userMapper::toResponse).toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userMapper.toResponse(userService.getProfile(id)));
    }
}
