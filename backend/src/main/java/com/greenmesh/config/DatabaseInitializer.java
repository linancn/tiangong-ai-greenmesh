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
        jdbcTemplate.update("""
                MERGE INTO USERS (ID, USERNAME, PASSWORD, ROLE)
                KEY(USERNAME)
                VALUES (1, 'admin', 'admin123', 'admin')
                """);
        log.info("Default admin user (admin/admin123) ensured for dev only.");
    }
}
