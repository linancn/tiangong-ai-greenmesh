package com.greenmesh.auth;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        if (!StringUtils.hasText(request.username()) || !StringUtils.hasText(request.password())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "用户名或密码为空"));
        }

        AuthUser user = authService.login(request.username(), request.password());
        if (user != null && user.password().equals(request.password())) {
            var token = UUID.randomUUID().toString();
            return ResponseEntity.ok(
                    Map.of(
                            "token", token,
                            "user", Map.of("username", user.username(), "role", user.role()),
                            "issuedAt", Instant.now().toString()));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "用户名或密码错误"));
    }
}
