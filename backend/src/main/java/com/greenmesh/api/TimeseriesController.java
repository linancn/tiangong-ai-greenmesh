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
@RequestMapping("/api/timeseries")
public class TimeseriesController {

    private final JdbcTemplate jdbcTemplate;

    public TimeseriesController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostMapping("/raw/batch")
    public Map<String, Object> ingestRawBatch(@RequestBody List<RawPointValue> payload) {
        if (payload == null || payload.isEmpty()) {
            return Map.of("inserted", 0);
        }
        String sql = "INSERT INTO RAW_TIMESERIES (POINT_ID, TS, VALUE, QUALITY_FLAG, SOURCE_SYSTEM) VALUES (?,?,?,?,?)";
        int[] res = jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                RawPointValue item = payload.get(i);
                ps.setLong(1, item.pointId());
                ps.setTimestamp(2, Timestamp.from(Instant.parse(item.ts())));
                if (item.value() != null) {
                    ps.setBigDecimal(3, item.value());
                } else {
                    ps.setNull(3, java.sql.Types.DECIMAL);
                }
                ps.setString(4, item.qualityFlag());
                ps.setString(5, item.sourceSystem());
            }

            @Override
            public int getBatchSize() {
                return payload.size();
            }
        });
        int inserted = Arrays.stream(res).sum();
        return Map.of("inserted", inserted);
    }

    @GetMapping("/measurements")
    public List<Measurement> queryMeasurements(@RequestParam long pointId,
                                               @RequestParam String start,
                                               @RequestParam String end,
                                               @RequestParam(defaultValue = "5000") int limit) {
        String sql = """
                SELECT POINT_ID, TS, VALUE, QUALITY_FLAG, AGG_LEVEL
                FROM TS_MEASUREMENT
                WHERE POINT_ID = ?
                  AND TS BETWEEN ? AND ?
                ORDER BY TS
                """;
        Instant startTs = Instant.parse(start);
        Instant endTs = Instant.parse(end);
        RowMapper<Measurement> mapper = new MeasurementMapper();
        return jdbcTemplate.query(con -> {
            PreparedStatement ps = con.prepareStatement(sql);
            ps.setLong(1, pointId);
            ps.setTimestamp(2, Timestamp.from(startTs));
            ps.setTimestamp(3, Timestamp.from(endTs));
            ps.setMaxRows(limit);
            return ps;
        }, mapper);
    }

    @GetMapping("/latest")
    public List<Measurement> queryLatest(@RequestParam String pointIds) {
        List<Long> ids = Arrays.stream(pointIds.split(","))
                .filter(StringUtils::hasText)
                .map(String::trim)
                .map(Long::valueOf)
                .toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        String inClause = ids.stream().map(id -> "?").collect(Collectors.joining(","));
        String sql = """
                SELECT t.POINT_ID, t.TS, t.VALUE, t.QUALITY_FLAG, t.AGG_LEVEL
                FROM TS_MEASUREMENT t
                JOIN (
                    SELECT POINT_ID, MAX(TS) AS MAX_TS
                    FROM TS_MEASUREMENT
                    WHERE POINT_ID IN (%s)
                    GROUP BY POINT_ID
                ) latest ON t.POINT_ID = latest.POINT_ID AND t.TS = latest.MAX_TS
                ORDER BY t.POINT_ID
                """.formatted(inClause);
        return jdbcTemplate.query(sql, ids.toArray(), new MeasurementMapper());
    }

    record RawPointValue(long pointId, String ts, BigDecimal value, String qualityFlag, String sourceSystem) {}

    record Measurement(long pointId, Instant ts, BigDecimal value, String qualityFlag, String aggLevel) {}

    static class MeasurementMapper implements RowMapper<Measurement> {
        @Override
        public Measurement mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new Measurement(
                    rs.getLong("POINT_ID"),
                    rs.getTimestamp("TS").toInstant(),
                    rs.getBigDecimal("VALUE"),
                    rs.getString("QUALITY_FLAG"),
                    rs.getString("AGG_LEVEL"));
        }
    }
}
