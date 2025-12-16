package com.greenmesh.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer {
    private static final Logger log = LoggerFactory.getLogger(DatabaseInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void init() {
        ensureUsersTable();
        ensureDefaultUser();
    }

    private void ensureUsersTable() {
        try {
            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS USERS (
                      ID BIGINT PRIMARY KEY,
                      USERNAME VARCHAR(64) UNIQUE NOT NULL,
                      PASSWORD VARCHAR(128) NOT NULL,
                      ROLE VARCHAR(32) NOT NULL
                    )
                    """);
            log.info("USERS table ensured.");
        } catch (DataAccessException ex) {
            log.warn("Failed to ensure USERS table", ex);
            throw ex;
        }
    }

    private void ensureDefaultUser() {
        // DM8 does not support the H2-style MERGE ... KEY syntax, so do update-then-insert.
        int updated = jdbcTemplate.update(
                "UPDATE USERS SET PASSWORD = ?, ROLE = ? WHERE USERNAME = ?",
                "admin123", "admin", "admin");
        if (updated == 0) {
            try {
                jdbcTemplate.update(
                        "INSERT INTO USERS (ID, USERNAME, PASSWORD, ROLE) VALUES (?, ?, ?, ?)",
                        1L, "admin", "admin123", "admin");
            } catch (DataAccessException ex) {
                log.warn("Default admin user insert failed (maybe already exists); continuing.", ex);
            }
        }
        log.info("Default admin user (admin/admin123) ensured for dev only.");
    }
}
