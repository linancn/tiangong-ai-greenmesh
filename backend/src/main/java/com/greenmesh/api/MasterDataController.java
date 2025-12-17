package com.greenmesh.api;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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
@RequestMapping("/api")
public class MasterDataController {

    private final JdbcTemplate jdbcTemplate;

    public MasterDataController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/parks")
    public List<Park> listParks() {
        String sql = """
                SELECT PARK_ID, NAME, REGION, TIMEZONE, BOUNDARY_GEOJSON
                FROM DIM_PARK
                ORDER BY PARK_ID
                """;
        return jdbcTemplate.query(sql, new ParkMapper());
    }

    @PostMapping("/parks")
    public Park createPark(@RequestBody ParkCreateRequest req) {
        jdbcTemplate.update(
                "INSERT INTO DIM_PARK (NAME, REGION, TIMEZONE, BOUNDARY_GEOJSON) VALUES (?,?,?,?)",
                req.name(), req.region(), Optional.ofNullable(req.timezone()).orElse("Asia/Shanghai"), req.boundaryGeojson());
        // return the last inserted by sorting desc; acceptable for dev bootstrap
        return jdbcTemplate.queryForObject(
                "SELECT PARK_ID, NAME, REGION, TIMEZONE, BOUNDARY_GEOJSON FROM DIM_PARK ORDER BY PARK_ID DESC FETCH FIRST 1 ROWS ONLY",
                new ParkMapper());
    }

    @GetMapping("/enterprises")
    public List<Enterprise> listEnterprises(@RequestParam(required = false) Long parkId) {
        StringBuilder sql = new StringBuilder("""
                SELECT ENT_ID, PARK_ID, NAME, INDUSTRY, IS_KEY_USER, CONTACT
                FROM DIM_ENTERPRISE
                """);
        List<Object> args = new ArrayList<>();
        if (parkId != null) {
            sql.append(" WHERE PARK_ID = ?");
            args.add(parkId);
        }
        sql.append(" ORDER BY ENT_ID");
        return jdbcTemplate.query(sql.toString(), args.toArray(), new EnterpriseMapper());
    }

    @GetMapping("/assets")
    public List<Asset> listAssets(@RequestParam(required = false) Long parkId,
                                  @RequestParam(required = false) Long entId,
                                  @RequestParam(required = false) String assetType) {
        StringBuilder sql = new StringBuilder("""
                SELECT ASSET_ID, PARK_ID, ENT_ID, ASSET_TYPE, NAME, VENDOR, MODEL_NO, RATED_CAPACITY, STATUS
                FROM DIM_ASSET
                """);
        List<Object> args = new ArrayList<>();
        List<String> conditions = new ArrayList<>();
        if (parkId != null) {
            conditions.add("PARK_ID = ?");
            args.add(parkId);
        }
        if (entId != null) {
            conditions.add("ENT_ID = ?");
            args.add(entId);
        }
        if (StringUtils.hasText(assetType)) {
            conditions.add("ASSET_TYPE = ?");
            args.add(assetType);
        }
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        sql.append(" ORDER BY ASSET_ID");
        return jdbcTemplate.query(sql.toString(), args.toArray(), new AssetMapper());
    }

    @GetMapping("/meter-points")
    public List<MeterPoint> listMeterPoints(@RequestParam(required = false) Long parkId,
                                            @RequestParam(required = false) Long assetId,
                                            @RequestParam(required = false) Long entId,
                                            @RequestParam(required = false) String energyType) {
        StringBuilder sql = new StringBuilder("""
                SELECT POINT_ID, PARK_ID, ENT_ID, ASSET_ID, ENERGY_TYPE, MEAS_TYPE, UNIT,
                       SAMPLING_INTERVAL_S, PROTOCOL, TAG_ADDRESS, IS_CRITICAL
                FROM DIM_METER_POINT
                """);
        List<Object> args = new ArrayList<>();
        List<String> conditions = new ArrayList<>();
        if (parkId != null) {
            conditions.add("PARK_ID = ?");
            args.add(parkId);
        }
        if (assetId != null) {
            conditions.add("ASSET_ID = ?");
            args.add(assetId);
        }
        if (entId != null) {
            conditions.add("ENT_ID = ?");
            args.add(entId);
        }
        if (StringUtils.hasText(energyType)) {
            conditions.add("ENERGY_TYPE = ?");
            args.add(energyType);
        }
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        sql.append(" ORDER BY POINT_ID");
        return jdbcTemplate.query(sql.toString(), args.toArray(), new MeterPointMapper());
    }

    @GetMapping("/price-zones")
    public List<PriceZone> listPriceZones(@RequestParam(required = false) Long parkId) {
        StringBuilder sql = new StringBuilder("""
                SELECT ZONE_ID, PARK_ID, GRID_COMPANY, TARIFF_RULE_VERSION
                FROM DIM_PRICE_ZONE
                """);
        List<Object> args = new ArrayList<>();
        if (parkId != null) {
            sql.append(" WHERE PARK_ID = ?");
            args.add(parkId);
        }
        sql.append(" ORDER BY ZONE_ID");
        return jdbcTemplate.query(sql.toString(), args.toArray(), new PriceZoneMapper());
    }

    @GetMapping("/carbon-factors")
    public List<CarbonFactor> listCarbonFactors(@RequestParam(required = false) String region,
                                                @RequestParam(required = false) String energyType,
                                                @RequestParam(required = false) String activeOn) {
        StringBuilder sql = new StringBuilder("""
                SELECT FACTOR_ID, REGION, ENERGY_TYPE, FACTOR_VALUE, UNIT, EFFECTIVE_FROM, EFFECTIVE_TO, SOURCE, IS_DEFAULT
                FROM DIM_CARBON_FACTOR
                """);
        List<Object> args = new ArrayList<>();
        List<String> conditions = new ArrayList<>();
        if (StringUtils.hasText(region)) {
            conditions.add("REGION = ?");
            args.add(region);
        }
        if (StringUtils.hasText(energyType)) {
            conditions.add("ENERGY_TYPE = ?");
            args.add(energyType);
        }
        if (StringUtils.hasText(activeOn)) {
            LocalDate date = LocalDate.parse(activeOn);
            conditions.add("(EFFECTIVE_FROM <= ? AND (EFFECTIVE_TO IS NULL OR EFFECTIVE_TO >= ?))");
            args.add(java.sql.Date.valueOf(date));
            args.add(java.sql.Date.valueOf(date));
        }
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        sql.append(" ORDER BY FACTOR_ID");
        return jdbcTemplate.query(sql.toString(), args.toArray(), new CarbonFactorMapper());
    }

    record Park(Long id, String name, String region, String timezone, String boundaryGeojson) {}

    record ParkCreateRequest(String name, String region, String timezone, String boundaryGeojson) {}

    record Enterprise(Long id, Long parkId, String name, String industry, boolean isKeyUser, String contact) {}

    record Asset(Long id, Long parkId, Long entId, String assetType, String name, String vendor, String modelNo,
                 Double ratedCapacity, String status) {}

    record MeterPoint(Long id, Long parkId, Long entId, Long assetId, String energyType, String measType, String unit,
                      Integer samplingIntervalSec, String protocol, String tagAddress, boolean isCritical) {}

    record PriceZone(Long id, Long parkId, String gridCompany, String tariffRuleVersion) {}

    record CarbonFactor(Long id, String region, String energyType, Double factorValue, String unit,
                        java.sql.Date effectiveFrom, java.sql.Date effectiveTo, String source, boolean isDefault) {}

    static class ParkMapper implements RowMapper<Park> {
        @Override
        public Park mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new Park(
                    rs.getLong("PARK_ID"),
                    rs.getString("NAME"),
                    rs.getString("REGION"),
                    rs.getString("TIMEZONE"),
                    rs.getString("BOUNDARY_GEOJSON"));
        }
    }

    static class EnterpriseMapper implements RowMapper<Enterprise> {
        @Override
        public Enterprise mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new Enterprise(
                    rs.getLong("ENT_ID"),
                    rs.getLong("PARK_ID"),
                    rs.getString("NAME"),
                    rs.getString("INDUSTRY"),
                    "Y".equalsIgnoreCase(rs.getString("IS_KEY_USER")),
                    rs.getString("CONTACT"));
        }
    }

    static class AssetMapper implements RowMapper<Asset> {
        @Override
        public Asset mapRow(ResultSet rs, int rowNum) throws SQLException {
            Double rated = rs.getObject("RATED_CAPACITY") != null ? rs.getDouble("RATED_CAPACITY") : null;
            return new Asset(
                    rs.getLong("ASSET_ID"),
                    rs.getLong("PARK_ID"),
                    rs.getObject("ENT_ID") != null ? rs.getLong("ENT_ID") : null,
                    rs.getString("ASSET_TYPE"),
                    rs.getString("NAME"),
                    rs.getString("VENDOR"),
                    rs.getString("MODEL_NO"),
                    rated,
                    rs.getString("STATUS"));
        }
    }

    static class MeterPointMapper implements RowMapper<MeterPoint> {
        @Override
        public MeterPoint mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new MeterPoint(
                    rs.getLong("POINT_ID"),
                    rs.getLong("PARK_ID"),
                    rs.getObject("ENT_ID") != null ? rs.getLong("ENT_ID") : null,
                    rs.getObject("ASSET_ID") != null ? rs.getLong("ASSET_ID") : null,
                    rs.getString("ENERGY_TYPE"),
                    rs.getString("MEAS_TYPE"),
                    rs.getString("UNIT"),
                    rs.getObject("SAMPLING_INTERVAL_S") != null ? rs.getInt("SAMPLING_INTERVAL_S") : null,
                    rs.getString("PROTOCOL"),
                    rs.getString("TAG_ADDRESS"),
                    "Y".equalsIgnoreCase(rs.getString("IS_CRITICAL")));
        }
    }

    static class PriceZoneMapper implements RowMapper<PriceZone> {
        @Override
        public PriceZone mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new PriceZone(
                    rs.getLong("ZONE_ID"),
                    rs.getLong("PARK_ID"),
                    rs.getString("GRID_COMPANY"),
                    rs.getString("TARIFF_RULE_VERSION"));
        }
    }

    static class CarbonFactorMapper implements RowMapper<CarbonFactor> {
        @Override
        public CarbonFactor mapRow(ResultSet rs, int rowNum) throws SQLException {
            Double factorValue = rs.getObject("FACTOR_VALUE") != null ? rs.getDouble("FACTOR_VALUE") : null;
            return new CarbonFactor(
                    rs.getLong("FACTOR_ID"),
                    rs.getString("REGION"),
                    rs.getString("ENERGY_TYPE"),
                    factorValue,
                    rs.getString("UNIT"),
                    rs.getDate("EFFECTIVE_FROM"),
                    rs.getDate("EFFECTIVE_TO"),
                    rs.getString("SOURCE"),
                    "Y".equalsIgnoreCase(rs.getString("IS_DEFAULT")));
        }
    }
}
