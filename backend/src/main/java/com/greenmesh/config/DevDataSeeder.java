package com.greenmesh.config;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.beans.factory.annotation.Value;

@Component
@Profile({"dev", "dm8"})
public class DevDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);
    private final JdbcTemplate jdbcTemplate;
    private final boolean enabled;

    public DevDataSeeder(JdbcTemplate jdbcTemplate,
                         @Value("${app.seed.demo-enabled:true}") boolean enabled) {
        this.jdbcTemplate = jdbcTemplate;
        this.enabled = enabled;
    }

    @PostConstruct
    public void seed() {
        if (!enabled) {
            log.info("Demo data seeding disabled via app.seed.demo-enabled=false");
            return;
        }
        log.info("Seeding demo data for dashboards (parks/assets/points/timeseries/forecast/dispatch) ...");
        ensureEnergyTypes();
        long parkId = ensurePark();
        long pvAssetId = ensureAsset(parkId, "PV", "光伏逆变 1#", 2800.0, "RUNNING");
        long bessAssetId = ensureAsset(parkId, "BESS", "储能组 1#", 5000.0, "RUNNING");

        long pvPointId = ensureMeterPoint(pvAssetId, parkId, "ACTIVE_POWER", "kW");
        long bessPointId = ensureMeterPoint(bessAssetId, parkId, "SOC", "%");

        ensureMeasurements(pvPointId, 1250);
        ensureMeasurements(bessPointId, 68);

        ensureGenerationForecast(pvAssetId, 1850);
        ensureDispatchPlan(parkId, pvAssetId, bessAssetId);
    }

    private void ensureEnergyTypes() {
        Long existing = queryForLong("SELECT COUNT(*) FROM DIM_ENERGY_TYPE WHERE ENERGY_TYPE_CODE = ?", "ELEC");
        if (existing != null && existing > 0) {
            return;
        }
        jdbcTemplate.update(
                "INSERT INTO DIM_ENERGY_TYPE (ENERGY_TYPE_CODE, NAME, CATEGORY) VALUES (?,?,?)",
                "ELEC", "电力", "power");
    }

    private long ensurePark() {
        Long existing = queryForLong("SELECT PARK_ID FROM DIM_PARK WHERE NAME = ?", "示例园区");
        if (existing != null) {
            return existing;
        }
        jdbcTemplate.update(
                "INSERT INTO DIM_PARK (NAME, REGION, TIMEZONE, BOUNDARY_GEOJSON) VALUES (?,?,?,?)",
                "示例园区", "华东", "Asia/Shanghai", null);
        Long created = queryForLong("SELECT PARK_ID FROM DIM_PARK WHERE NAME = ?", "示例园区");
        return created != null ? created : 1L;
    }

    private long ensureAsset(long parkId, String assetType, String name, Double ratedCapacity, String status) {
        Long existing = queryForLong("SELECT ASSET_ID FROM DIM_ASSET WHERE NAME = ?", name);
        if (existing != null) {
            return existing;
        }
        jdbcTemplate.update(
                "INSERT INTO DIM_ASSET (PARK_ID, ASSET_TYPE, NAME, RATED_CAPACITY, STATUS) VALUES (?,?,?,?,?)",
                parkId, assetType, name, ratedCapacity, status);
        Long created = queryForLong("SELECT ASSET_ID FROM DIM_ASSET WHERE NAME = ?", name);
        return created != null ? created : parkId;
    }

    private long ensureMeterPoint(long assetId, long parkId, String measType, String unit) {
        Long existing = queryForLong(
                "SELECT POINT_ID FROM DIM_METER_POINT WHERE ASSET_ID = ? AND MEAS_TYPE = ?",
                assetId, measType);
        if (existing != null) {
            return existing;
        }
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(conn -> {
            PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO DIM_METER_POINT (ASSET_ID, PARK_ID, ENERGY_TYPE, MEAS_TYPE, UNIT, SAMPLING_INTERVAL_S, PROTOCOL, TAG_ADDRESS, IS_CRITICAL) VALUES (?,?,?,?,?,?,?,?,?)",
                    new String[]{"POINT_ID"});
            ps.setLong(1, assetId);
            ps.setLong(2, parkId);
            ps.setString(3, "ELEC");
            ps.setString(4, measType);
            ps.setString(5, unit);
            ps.setInt(6, 60);
            ps.setString(7, "IEC104");
            ps.setString(8, "P" + assetId);
            ps.setString(9, "N");
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        Long resolved = key != null ? key.longValue() : queryForLong(
                "SELECT POINT_ID FROM DIM_METER_POINT WHERE ASSET_ID = ? AND MEAS_TYPE = ?",
                assetId, measType);
        return resolved != null ? resolved : assetId;
    }

    private void ensureMeasurements(long pointId, double baseValue) {
        Long existing = queryForLong("SELECT COUNT(*) FROM TS_MEASUREMENT WHERE POINT_ID = ?", pointId);
        if (existing != null && existing > 0) {
            return;
        }
        Instant now = Instant.now();
        for (int i = -2; i <= 6; i++) {
            Instant ts = now.plus(Duration.ofMinutes(10L * i));
            double value = baseValue + (i * 5);
            jdbcTemplate.update(
                    "INSERT INTO TS_MEASUREMENT (POINT_ID, TS, VALUE, QUALITY_FLAG, AGG_LEVEL) VALUES (?,?,?,?,?)",
                    pointId, Timestamp.from(ts), value, "GOOD", "raw");
        }
    }

    private void ensureGenerationForecast(long assetId, double baseValue) {
        Long existing = queryForLong("SELECT COUNT(*) FROM GEN_FORECAST WHERE ASSET_ID = ?", assetId);
        if (existing != null && existing > 0) {
            return;
        }
        Instant issue = Instant.now();
        for (int i = -4; i <= 8; i++) {
            Instant ts = issue.plus(Duration.ofMinutes(15L * i));
            double value = baseValue + (i * 30);
            jdbcTemplate.update(
                    "INSERT INTO GEN_FORECAST (ASSET_ID, FORECAST_ISSUE_TS, TS, P_KW_PRED, P10, P90, MODEL_VERSION, SCENARIO) VALUES (?,?,?,?,?,?,?,?)",
                    assetId, Timestamp.from(issue), Timestamp.from(ts), value, value * 0.9, value * 1.1, "demo-0.1", "base");
        }
    }

    private void ensureDispatchPlan(long parkId, long pvAssetId, long bessAssetId) {
        Long existing = queryForLong("SELECT PLAN_ID FROM DISPATCH_PLAN FETCH FIRST 1 ROWS ONLY");
        if (existing != null) {
            return;
        }
        Instant now = Instant.now();
        Instant horizonStart = now.plus(Duration.ofMinutes(15));
        Instant horizonEnd = horizonStart.plus(Duration.ofHours(1));

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(conn -> {
            PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO DISPATCH_PLAN (PARK_ID, HORIZON_START, HORIZON_END, INTERVAL_MIN, STRATEGY_PROFILE_ID, STATUS, CREATED_TS) VALUES (?,?,?,?,?,?,?)",
                    new String[]{"PLAN_ID"});
            ps.setLong(1, parkId);
            ps.setTimestamp(2, Timestamp.from(horizonStart));
            ps.setTimestamp(3, Timestamp.from(horizonEnd));
            ps.setInt(4, 15);
            ps.setObject(5, null);
            ps.setString(6, "RUNNING");
            ps.setTimestamp(7, Timestamp.from(now));
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        Long resolved = key != null ? key.longValue() : queryForLong(
                "SELECT PLAN_ID FROM DISPATCH_PLAN ORDER BY PLAN_ID DESC FETCH FIRST 1 ROWS ONLY");
        long planId = resolved != null ? resolved : 1L;

        Instant detailTs = horizonStart;
        for (int i = 0; i < 4; i++) {
            jdbcTemplate.update(
                    "INSERT INTO DISPATCH_PLAN_DETAIL (PLAN_ID, TS, ASSET_ID, P_SET_KW, Q_SET_KVAR, HEAT_SET_MW, SOC_TARGET) VALUES (?,?,?,?,?,?,?)",
                    planId, Timestamp.from(detailTs), pvAssetId, 1600 + i * 50, null, null, null);
            jdbcTemplate.update(
                    "INSERT INTO DISPATCH_PLAN_DETAIL (PLAN_ID, TS, ASSET_ID, P_SET_KW, Q_SET_KVAR, HEAT_SET_MW, SOC_TARGET) VALUES (?,?,?,?,?,?,?)",
                    planId, Timestamp.from(detailTs), bessAssetId, -500 + i * 20, null, null, 70 + (i * 2));
            detailTs = detailTs.plus(Duration.ofMinutes(15));
        }
    }

    private Long queryForLong(String sql, Object... args) {
        List<Long> result = jdbcTemplate.query(sql, args, (rs, rowNum) -> rs.getLong(1));
        return CollectionUtils.isEmpty(result) ? null : result.get(0);
    }
}
