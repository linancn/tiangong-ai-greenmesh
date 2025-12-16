package com.greenmesh.auth;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final JdbcTemplate jdbcTemplate;

    public AuthService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public AuthUser login(String username, String password) {
        try {
            return jdbcTemplate.queryForObject(
                    "select username, password, role from USERS where username = ?",
                    (rs, rowNum) -> new AuthUser(rs.getString("username"), rs.getString("password"), rs.getString("role")),
                    username);
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }
}
