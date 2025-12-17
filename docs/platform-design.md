# GreenMesh 平台设计说明（结合现有架构）

本说明书在现有仓库架构（前端 Vite 7 + React 19 + MUI，后端 Spring Boot 3 + Java 21，数据库达梦 DM8，联调栈含 Kafka/Redis/Flink/Grafana）基础上，细化平台域划分、关键数据流与核心数据模型，供后续 PRD、研发与数据库设计对齐。

## 1. 架构基线
- 运行基线：前端 `npm run dev`；后端 dev(H2) `./gradlew bootRun`；后端达梦 `SPRING_PROFILES_ACTIVE=dm8 ./gradlew bootRun`；联调栈 `cd backend && docker compose up -d`（读取根目录 `.env`）。
- 技术栈：Vite + React + TypeScript + MUI + TanStack Query + React Router + MUI X Charts；Spring Boot 3（web/validation/actuator、data-redis、spring-kafka）、Kafka/Redis/Flink 可选、DM8 为主库（dev 用 H2）。
- 认证现状：`/api/auth/login` 简易校验（admin/admin123，仅开发占位），上线需切换 IAM/OIDC。
- 观测与质量：Micrometer/Prometheus/Grafana 预留；`run-checks.sh` 统一前端 lint/test + 后端 test。

## 2. 全平台基础域（0.x）
- 设备与资产主数据：园区/企业/设备/计量点/能源类型/地理位置等统一主数据，支撑各业务域的维度关联和权限边界。
- 数据接入网关：协议适配（OPC UA/Modbus/IEC104/HTTP API/文件上传），负责采集、初步校验与标准化，入口写入 Kafka → DM8 `raw_timeseries`。
- 时序数据存储：DM8 分区表承载原始/清洗后数据（推荐按天/月分区，索引 point_id + ts），Redis 用于热点/实时面板缓存。
- 数据质量与对时：缺失/跳变/重复值治理、时区统一、时间对齐，形成标准表 `ts_measurement` 供预测/调度/报表调用。
- 统一指标/口径服务：碳排放因子、碳能比公式、KPI 统一计算口径，提供版本化配置和复算能力。
- 权限与多租户：按园区/企业/角色隔离数据与功能；当前后端为单租户占位，需要对接 IAM 后支持租户作用域过滤。
- 事件与告警中心：规则配置、实时检测、分级通知、闭环处理（告警→派单/处置→关闭），与调度、安全策略联动。

### 2.1 全局数据流（0.2）
现场/三方 → 数据接入网关 → `raw_timeseries` → 数据质量与对时 → `ts_measurement` → 业务模型（预测/调度/核算） → 事件与告警中心 / 可视化 / 报表层。

### 2.2 核心基础表（0.3）
- 主数据类（维度）
  - `dim_park`(park_id, name, region, timezone, boundary_geojson, created_at)：园区主数据。
  - `dim_enterprise`(ent_id, park_id, name, industry, is_key_user, contact, created_at)：企业主数据。
  - `dim_asset`(asset_id, park_id, ent_id, asset_type, name, vendor, model, rated_capacity, location_geojson, status, commission_date)：资产（风机/光伏/储能/变压器/开关等）。
  - `dim_meter_point`(point_id, asset_id, ent_id, park_id, energy_type, meas_type, unit, sampling_interval_s, protocol, tag_address, is_critical)：计量点/遥测点。
  - `dim_energy_type`(energy_type_code, name, category)：能源类型字典。
  - `dim_price_zone`(zone_id, park_id, grid_company, tariff_rule_version)：电价区。
  - `dim_carbon_factor`(factor_id, region, energy_type, factor_value, unit, effective_from, effective_to, source, is_default)：碳因子。
- 时序类（事实）
  - `raw_timeseries`(id, point_id, ts, value, quality_flag, source_system, ingest_time)：原始时序数据。
  - `ts_measurement`(id, point_id, ts, value, quality_flag, agg_level, created_at)：清洗后时序数据；建议 (point_id, ts) 复合主键/索引，按天/月分区。
- 事件/告警类
  - `evt_alarm`(alarm_id, park_id, ent_id, asset_id, level, category, object_type, object_id, start_ts, end_ts, status, rule_id, message, ack_by, ack_ts)：告警事件。
  - `cfg_alarm_rule`(rule_id, park_id, name, category, expression, threshold, severity, notification_group, enabled)：告警规则。
  - `def_key_monitor_point`(id, park_id, point_id, point_name, category)：关键监控点定义（仪表盘白名单）。
  - `evt_action_reco`(reco_id, alarm_id, reco_type, command_template, priority, created_ts, status)：处置建议记录。

## 3. 源侧管理（1.x）
### 3.1 风/光出力预测（功能 A）
- 模块：气象数据接入 → 资源-机组映射 → 预测引擎（物理功率曲线/ARIMA/ML/LSTM/LightGBM 可插拔） → 预测评估与回测 → 预测发布 API（供调度/可视化使用）。
- 数据流：第三方 API/气象站 → `weather_obs` / `weather_forecast` → 预测引擎读取 `ts_measurement` + `map_asset_weather` → 输出 `gen_forecast` → 策略/调度层消费。
- 表：
  - `weather_station`(station_id, park_id, name, lat, lon, elevation, provider, status)
  - `weather_obs`(id, station_id, ts, temperature, wind_speed, wind_dir, ghi, dni, dhi, humidity, pressure, quality_flag)
  - `weather_forecast`(id, station_id, forecast_issue_ts, ts, temperature_pred, wind_speed_pred, ghi_pred, dni_pred, cloud_cover_pred, model_name)
  - `map_asset_weather`(asset_id, station_id, weight, effective_from, effective_to)
  - `gen_forecast`(id, asset_id, forecast_issue_ts, ts, p_kw_pred, p10, p90, model_version, scenario)
  - `log_forecast_eval`(eval_id, asset_id, forecast_issue_ts, horizon_min, mae, mape, bias, created_at)

### 3.2 实时电量/频率监控与安全预警（功能 B）
- 模块：SCADA 仪表盘（关键测点实时展示） → 安全运行规则引擎（基于 `cfg_alarm_rule`）→ 预警与处置建议 → 告警闭环管理。
- 数据流：`ts_measurement`（频率/功率/温度/流量）→ 规则引擎 → 触发 `evt_alarm`，可选生成 `evt_action_reco` → 前端/通知。
- 表：复用 `ts_measurement`、`evt_alarm`、`cfg_alarm_rule`、`def_key_monitor_point`、`evt_action_reco`。

## 4. 网侧智能化（工业微电网，2.x）
### 4.1 微电网拓扑与控制（功能 A）
- 模块：电气拓扑建模 → 状态估计/拓扑分析 → 控制指令编排与下发接口 → 运行模式管理（并网/孤岛/限电等）。
- 数据流：`mg_topology_*` + `ts_measurement`（开关状态/潮流）→ 拓扑分析 → 生成 `mg_runtime_state` → 调度层读取 → 输出 `mg_control_command` → 下发至边缘 EMS/控制器 → 回执写 `mg_command_result`。
- 表（拓扑）：`mg_bus`(bus_id, park_id, name, voltage_level_kv, type)、`mg_line`(line_id, park_id, from_bus_id, to_bus_id, r_ohm, x_ohm, capacity_a)、`mg_transformer`(tf_id, park_id, hv_bus_id, lv_bus_id, rated_kva, impedance_percent)、`mg_switch`(sw_id, park_id, from_bus_id, to_bus_id, point_id_status, normal_state)、`mg_connection_point`(pcc_id, park_id, bus_id, point_id_p, point_id_q, point_id_freq, contract_capacity_kw)。
- 表（运行/控制）：`mg_runtime_state`(id, park_id, ts, mode, island_flag, p_total_kw, q_total_kvar, freq_hz, spinning_reserve_kw)、`mg_control_command`(cmd_id, park_id, ts_issue, target_asset_id, cmd_type, payload_json, status, issued_by)、`mg_command_result`(result_id, cmd_id, ts_feedback, is_success, message, telemetry_snapshot_json)。

### 4.2 多电源切换与多能互补（功能 B）
- 模块：电源能力管理 → 多能协同模型（电/热/冷/气转换效率）→ 运行约束库 → 调度求解器 → 指令下发。
- 数据流：`gen_forecast` + `load_forecast` + `storage_state` + `mg_runtime_state` + `dim_price_zone` + `dim_carbon_factor` → 运行约束库/策略选择 → 求解器输出 `dispatch_plan` / `dispatch_plan_detail` → 转为 `dispatch_instruction` → 下发。
- 表：`asset_dynamic_capability`(id, asset_id, ts, available_kw, ramp_up_kw_per_min, ramp_down_kw_per_min, status)、`cfg_multi_energy_model`(model_id, park_id, from_energy, to_energy, asset_id, efficiency_formula)、`cfg_dispatch_constraint`(constraint_id, park_id, name, expression, category, enabled)、`dispatch_plan`(plan_id, park_id, horizon_start, horizon_end, interval_min, strategy_profile_id, status, created_ts)、`dispatch_plan_detail`(id, plan_id, ts, asset_id, p_set_kw, q_set_kvar, heat_set_mw, soc_target)、`dispatch_instruction`(ins_id, plan_id, ts_issue, asset_id, cmd_type, set_value, unit, status, ack_ts)。

## 5. 荷侧用能优化（3.x）
### 5.1 园区/企业负荷预测（功能 A）
- 模块：负荷采集与分解 → 生产计划接口 → 负荷预测引擎（含日历/天气特征）→ 预测偏差监控。
- 数据流：`ts_measurement`（企业负荷） + `production_plan` + `dim_calendar` + `weather_forecast` → 负荷预测引擎 → 输出 `load_forecast` → 供策略/调度层调用。
- 表：`production_plan`(plan_id, ent_id, plan_date, shift_info_json, maintenance_assets_json, status, submitted_ts)、`dim_calendar`(date, day_of_week, is_holiday, is_workday)、`load_forecast`(id, ent_id, forecast_issue_ts, ts, p_kw_pred, p10, p90, model_version)、`log_load_anomaly`(id, ent_id, ts, anomaly_type, score, message, created_ts)。

### 5.2 需求侧响应与虚拟电厂（功能 B）
- 模块：可调负荷资源池 → DR 事件生命周期管理 → VPP 聚合与对外接口（OpenADR 等）→ 结算。
- 数据流：电网/园区发布事件 → `dr_event` → 推送邀约 → 企业确认（`dr_participation`）→ 执行期监控 `ts_measurement` → 计算效果 `dr_performance` → 结算 `dr_settlement`。
- 表：`dr_resource`(res_id, ent_id, asset_id, res_type, capacity_kw, response_time_s, min_duration_min, availability_schedule, baseline_method, enabled)、`dr_event`(event_id, park_id, event_type, start_ts, end_ts, target_kw, price_signal, status, issued_by, issued_ts)、`dr_participation`(id, event_id, res_id, committed_kw, confirmed_flag, confirm_ts, status)、`dr_performance`(id, event_id, res_id, ts, actual_kw, baseline_kw, delivered_kw)、`dr_settlement`(settle_id, event_id, res_id, delivered_kwh, settlement_amount, currency, status)、`vpp_aggregator`(agg_id, park_id, name, capacity_up_kw, capacity_down_kw, status)、`vpp_interface_log`(log_id, direction, payload_json, ts, status)。

## 6. 储侧协同调控（4.x）
### 6.1 储能模型与策略配置（功能 A）
- 模块：储能资产模型（物理/经济参数）→ BMS 状态监视 → 策略参数化配置（削峰填谷/调频/备用）。
- 数据流：`ts_measurement`（BMS 数据）→ 更新 `storage_state` → 策略/调度层读取 `storage_state` + `cfg_storage_policy` → 生成 `dispatch_plan_detail` 含充放电计划 → 下发。
- 表：`storage_asset_ext`(asset_id, energy_kwh, power_kw, soc_min, soc_max, charge_eff, discharge_eff, cycle_degrade_cost_per_kwh, vendor)、`storage_state`(id, asset_id, ts, soc_percent, soh_percent, p_kw, temp_c, health_status, available_charge_kw, available_discharge_kw)、`cfg_storage_policy`(policy_id, park_id, name, mode, soc_target_min, soc_target_max, reserve_for_blackstart_kw, participate_in_freq_reg, enabled)。

### 6.2 分时电价驱动的充放电优化（功能 B）
- 模块：分时电价解析 → 充放电计划生成（成本/碳双目标）→ 执行与偏差修正。
- 数据流：`price_timeslot` + `load_forecast` + `gen_forecast` + `carbon_intensity_timeslot` + `storage_state` → 策略/调度层 → `dispatch_plan_detail`（储能段）→ `dispatch_instruction`。
- 表：`price_timeslot`(id, zone_id, start_ts, end_ts, price_per_kwh, price_type)、`carbon_intensity_timeslot`(id, region, ts, grid_carbon_factor_g_per_kwh, source)。

## 7. 多目标策略选择与调度“大脑”（5.x）
- 模块：策略配置中心（成本/低碳/安全权重或优先级）→ 约束集管理（红线规则）→ 优化求解器（可先规则/启发式，预留 Gurobi/CBC/SCIP）→ 调度方案评估与回放。
- 数据流：输入 `gen_forecast`、`load_forecast`、`storage_state`、`price_timeslot`、`dim_carbon_factor`、`mg_runtime_state`、`strategy_profile`、`cfg_constraint_set` → 求解 → 输出 `dispatch_plan` / `dispatch_plan_detail`，以及评估结果 `kpi_simulation_result`。
- 表：`strategy_profile`(profile_id, park_id, name, mode, objective_weights_json, priority_order_json, enabled)、`cfg_constraint_set`(set_id, park_id, name, constraints_json, enabled)、`kpi_simulation_result`(id, plan_id, profile_id, simulated_cost, simulated_carbon, simulated_risk_score, pass_flag)、`fact_carbon_accounting`(id, park_id, period_start, period_end, total_energy_kwh, total_carbon_kg, carbon_energy_ratio, method_version, status)、`fact_carbon_accounting_detail`(id, accounting_id, ent_id, energy_type, energy_amount, factor_used, carbon_amount, source_description)。

## 8. 模块间数据流通总结（6.x）
1) 采集域：计量点/SCADA/BMS → `raw_timeseries` → `ts_measurement`（质量/对时后）。  
2) 预测域：`weather_forecast` + `ts_measurement` → `gen_forecast`；`production_plan` + `ts_measurement` → `load_forecast`。  
3) 策略/调度域：输入（`gen_forecast`、`load_forecast`、`storage_state`、`price_timeslot`、`dim_carbon_factor`、`mg_runtime_state`、`strategy_profile`、`cfg_constraint_set`）→ 输出 `dispatch_plan` / `dispatch_plan_detail`。  
4) 执行域：`dispatch_plan_detail` → `dispatch_instruction` → `mg_control_command` → 边缘 EMS/控制器 → 回执更新 `ts_measurement` / `mg_command_result`。  
5) 监视/告警域：`ts_measurement` + `cfg_alarm_rule` → `evt_alarm` → （可选）`evt_action_reco`。  
6) 核算/分析域：`ts_measurement` + `dim_carbon_factor` + `dispatch_plan` → `fact_carbon_accounting`、`kpi_simulation_result`、报表/审计。

## 9. 与现有代码框架的衔接建议
- 后端：保持 Spring Boot 单体，按照上文表格/域拆分包结构（masterdata/telemetry/forecast/dispatch/alarm/carbon等），使用 DM8 方言或 H2 dev；Kafka/Flink/Redis 根据 `run-dev.sh` 启停；规则引擎可先用配置 + Java 表达式，占位后替换 Drools/Easy Rules。
- 前端：继续使用 TanStack Query 统一数据获取；关键页面优先实现仪表盘（关键测点实时值）、告警列表/规则配置、预测曲线、调度计划视图、审计/追溯。`src/api/mockClient.ts` 可逐步替换为真实 API。
- 数据建模：基础表优先落地到 DM8，时序表按天/月分区，point_id+ts 索引；敏感口令仍在 `.env`，DM8 驱动放 `backend/libs/`（gitignore）。
- 测试与验收：`./run-checks.sh` 作为最小交付前置；新增模块应带领域层单测（规则/公式/策略选择）、REST 集成测试、前端页面/Hook 测试。
