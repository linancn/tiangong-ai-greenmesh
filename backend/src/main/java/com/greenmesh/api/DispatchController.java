package com.greenmesh.api;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dispatch")
public class DispatchController {

    private final JdbcTemplate jdbcTemplate;

    public DispatchController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/plans")
    public List<DispatchPlan> listPlans(@RequestParam(required = false) Long parkId,
                                        @RequestParam(required = false) String status) {
        StringBuilder sql = new StringBuilder("""
                SELECT PLAN_ID, PARK_ID, HORIZON_START, HORIZON_END, INTERVAL_MIN, STRATEGY_PROFILE_ID, STATUS, CREATED_TS
                FROM DISPATCH_PLAN
                """);
        List<Object> args = new ArrayList<>();
        List<String> conditions = new ArrayList<>();
        if (parkId != null) {
            conditions.add("PARK_ID = ?");
            args.add(parkId);
        }
        if (StringUtils.hasText(status)) {
            conditions.add("STATUS = ?");
            args.add(status);
        }
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        sql.append(" ORDER BY CREATED_TS DESC");
        return jdbcTemplate.query(sql.toString(), args.toArray(), new DispatchPlanMapper());
    }

    @GetMapping("/plans/{id}")
    public Map<String, Object> getPlan(@PathVariable long id) {
        DispatchPlan plan = jdbcTemplate.queryForObject(
                """
                        SELECT PLAN_ID, PARK_ID, HORIZON_START, HORIZON_END, INTERVAL_MIN, STRATEGY_PROFILE_ID, STATUS, CREATED_TS
                        FROM DISPATCH_PLAN WHERE PLAN_ID = ?
                        """,
                new DispatchPlanMapper(), id);
        List<DispatchPlanDetail> details = jdbcTemplate.query(
                """
                        SELECT ID, PLAN_ID, TS, ASSET_ID, P_SET_KW, Q_SET_KVAR, HEAT_SET_MW, SOC_TARGET
                        FROM DISPATCH_PLAN_DETAIL
                        WHERE PLAN_ID = ?
                        ORDER BY TS, ASSET_ID
                        """,
                new DispatchPlanDetailMapper(), id);
        Map<String, Object> result = new HashMap<>();
        result.put("plan", plan);
        result.put("details", details);
        return result;
    }

    @PostMapping("/plans")
    @Transactional
    public Map<String, Object> createPlan(@RequestBody DispatchPlanCreateRequest req) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    """
                            INSERT INTO DISPATCH_PLAN
                            (PARK_ID, HORIZON_START, HORIZON_END, INTERVAL_MIN, STRATEGY_PROFILE_ID, STATUS, CREATED_TS)
                            VALUES (?,?,?,?,?,?, CURRENT_TIMESTAMP)
                            """,
                    new String[]{"PLAN_ID"});
            ps.setLong(1, req.parkId());
            ps.setTimestamp(2, Timestamp.from(Instant.parse(req.horizonStart())));
            ps.setTimestamp(3, Timestamp.from(Instant.parse(req.horizonEnd())));
            ps.setObject(4, req.intervalMin());
            ps.setObject(5, req.strategyProfileId());
            ps.setString(6, StringUtils.hasText(req.status()) ? req.status() : "DRAFT");
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        long planId = key != null ? key.longValue() : fetchLatestPlanId();

        if (req.details() != null && !req.details().isEmpty()) {
            jdbcTemplate.batchUpdate(
                    """
                            INSERT INTO DISPATCH_PLAN_DETAIL
                            (PLAN_ID, TS, ASSET_ID, P_SET_KW, Q_SET_KVAR, HEAT_SET_MW, SOC_TARGET)
                            VALUES (?,?,?,?,?,?,?)
                            """,
                    req.details(),
                    req.details().size(),
                    (ps, detail) -> {
                        ps.setLong(1, planId);
                        ps.setTimestamp(2, Timestamp.from(Instant.parse(detail.ts())));
                        ps.setLong(3, detail.assetId());
                        ps.setObject(4, detail.pSetKw());
                        ps.setObject(5, detail.qSetKvar());
                        ps.setObject(6, detail.heatSetMw());
                        ps.setObject(7, detail.socTarget());
                    });
        }
        return getPlan(planId);
    }

    private long fetchLatestPlanId() {
        Long id = jdbcTemplate.queryForObject(
                "SELECT PLAN_ID FROM DISPATCH_PLAN ORDER BY PLAN_ID DESC FETCH FIRST 1 ROWS ONLY",
                Long.class);
        if (id == null) {
            throw new IllegalStateException("Failed to retrieve plan id");
        }
        return id;
    }

    record DispatchPlan(Long id, Long parkId, Instant horizonStart, Instant horizonEnd,
                        Integer intervalMin, Long strategyProfileId, String status, Instant createdTs) {}

    record DispatchPlanDetail(Long id, Long planId, Instant ts, Long assetId,
                              Double pSetKw, Double qSetKvar, Double heatSetMw, Double socTarget) {}

    record DispatchPlanCreateRequest(Long parkId, String horizonStart, String horizonEnd,
                                     Integer intervalMin, Long strategyProfileId, String status,
                                     List<DispatchPlanDetailRequest> details) {}

    record DispatchPlanDetailRequest(String ts, Long assetId, Double pSetKw, Double qSetKvar,
                                     Double heatSetMw, Double socTarget) {}

    static class DispatchPlanMapper implements RowMapper<DispatchPlan> {
        @Override
        public DispatchPlan mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new DispatchPlan(
                    rs.getLong("PLAN_ID"),
                    rs.getLong("PARK_ID"),
                    rs.getTimestamp("HORIZON_START").toInstant(),
                    rs.getTimestamp("HORIZON_END").toInstant(),
                    rs.getObject("INTERVAL_MIN") != null ? rs.getInt("INTERVAL_MIN") : null,
                    rs.getObject("STRATEGY_PROFILE_ID") != null ? rs.getLong("STRATEGY_PROFILE_ID") : null,
                    rs.getString("STATUS"),
                    rs.getTimestamp("CREATED_TS").toInstant());
        }
    }

    static class DispatchPlanDetailMapper implements RowMapper<DispatchPlanDetail> {
        @Override
        public DispatchPlanDetail mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new DispatchPlanDetail(
                    rs.getLong("ID"),
                    rs.getLong("PLAN_ID"),
                    rs.getTimestamp("TS").toInstant(),
                    rs.getLong("ASSET_ID"),
                    rs.getObject("P_SET_KW") != null ? rs.getDouble("P_SET_KW") : null,
                    rs.getObject("Q_SET_KVAR") != null ? rs.getDouble("Q_SET_KVAR") : null,
                    rs.getObject("HEAT_SET_MW") != null ? rs.getDouble("HEAT_SET_MW") : null,
                    rs.getObject("SOC_TARGET") != null ? rs.getDouble("SOC_TARGET") : null);
        }
    }
}
