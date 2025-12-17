package com.greenmesh.api;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/forecast")
public class ForecastController {

    private final JdbcTemplate jdbcTemplate;

    public ForecastController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostMapping("/gen/batch")
    public Map<String, Object> saveGenerationForecast(@RequestBody List<GenForecastWrite> payload) {
        if (payload == null || payload.isEmpty()) {
            return Map.of("inserted", 0);
        }
        String sql = """
                INSERT INTO GEN_FORECAST (ASSET_ID, FORECAST_ISSUE_TS, TS, P_KW_PRED, P10, P90, MODEL_VERSION, SCENARIO)
                VALUES (?,?,?,?,?,?,?,?)
                """;
        int[] res = jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                GenForecastWrite item = payload.get(i);
                ps.setLong(1, item.assetId());
                ps.setTimestamp(2, Timestamp.from(Instant.parse(item.forecastIssueTs())));
                ps.setTimestamp(3, Timestamp.from(Instant.parse(item.ts())));
                setBigDecimal(ps, 4, item.pKwPred());
                setBigDecimal(ps, 5, item.p10());
                setBigDecimal(ps, 6, item.p90());
                ps.setString(7, item.modelVersion());
                ps.setString(8, item.scenario());
            }

            @Override
            public int getBatchSize() {
                return payload.size();
            }
        });
        int inserted = Arrays.stream(res).sum();
        return Map.of("inserted", inserted);
    }

    @GetMapping("/gen")
    public List<GenForecastView> getGenerationForecast(@RequestParam long assetId,
                                                       @RequestParam String start,
                                                       @RequestParam String end,
                                                       @RequestParam(required = false) String issueTs) {
        StringBuilder sql = new StringBuilder("""
                SELECT ASSET_ID, FORECAST_ISSUE_TS, TS, P_KW_PRED, P10, P90, MODEL_VERSION, SCENARIO
                FROM GEN_FORECAST
                WHERE ASSET_ID = ?
                  AND TS BETWEEN ? AND ?
                """);
        List<Object> args = new java.util.ArrayList<>();
        args.add(assetId);
        args.add(Timestamp.from(Instant.parse(start)));
        args.add(Timestamp.from(Instant.parse(end)));
        if (StringUtils.hasText(issueTs)) {
            sql.append(" AND FORECAST_ISSUE_TS = ?");
            args.add(Timestamp.from(Instant.parse(issueTs)));
        }
        sql.append(" ORDER BY TS");
        return jdbcTemplate.query(sql.toString(), args.toArray(), new GenForecastMapper());
    }

    private void setBigDecimal(PreparedStatement ps, int idx, BigDecimal val) throws SQLException {
        if (val == null) {
            ps.setNull(idx, java.sql.Types.DECIMAL);
        } else {
            ps.setBigDecimal(idx, val);
        }
    }

    record GenForecastWrite(long assetId, String forecastIssueTs, String ts, BigDecimal pKwPred,
                            BigDecimal p10, BigDecimal p90, String modelVersion, String scenario) {}

    record GenForecastView(long assetId, Instant forecastIssueTs, Instant ts, BigDecimal pKwPred,
                           BigDecimal p10, BigDecimal p90, String modelVersion, String scenario) {}

    static class GenForecastMapper implements RowMapper<GenForecastView> {
        @Override
        public GenForecastView mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new GenForecastView(
                    rs.getLong("ASSET_ID"),
                    rs.getTimestamp("FORECAST_ISSUE_TS").toInstant(),
                    rs.getTimestamp("TS").toInstant(),
                    rs.getBigDecimal("P_KW_PRED"),
                    rs.getBigDecimal("P10"),
                    rs.getBigDecimal("P90"),
                    rs.getString("MODEL_VERSION"),
                    rs.getString("SCENARIO"));
        }
    }
}
