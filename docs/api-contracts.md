# GreenMesh API 合同（阶段 0 基础域 / 前端接入）

目标：在当前后端单体（Spring Boot 3）上定义最小可用的 REST 契约，覆盖基础主数据、时序数据、预测、告警、调度视图、DR/储能态等，为前端替换 `mockClient` 提供接口形态。认证沿用现有 `/api/auth/login` 返回的 token（开发占位）。

## 通用
- Base path: `/api`
- Auth: Bearer token（dev 占位，可复用 admin/admin123），后续切换 IAM/OIDC。
- 时间字段：ISO8601 带时区（示例 `2024-11-20T10:00:00Z`）。
- 分页：如未特别说明，使用 `?page=0&size=50`，默认按时间倒序。

## 1) 主数据
- `GET /api/parks` → `[ {id, name, region, timezone, boundaryGeojson} ]`
- `POST /api/parks` → 创建（用于种子数据/测试）；body `{name, region?, timezone?, boundaryGeojson?}`
- `GET /api/enterprises?parkId` → `[ {id, parkId, name, industry, isKeyUser, contact} ]`
- `GET /api/assets?parkId&entId&assetType` → `[ {id, parkId, entId, assetType, name, vendor, modelNo, ratedCapacity, status} ]`
- `GET /api/meter-points?parkId&assetId&entId&energyType` → `[ {id, parkId, entId, assetId, energyType, measType, unit, samplingIntervalSec, protocol, tagAddress, isCritical} ]`
- `GET /api/price-zones?parkId` → `[ {id, parkId, gridCompany, tariffRuleVersion} ]`
- `GET /api/carbon-factors?region&energyType&activeOn` → `[ {id, region, energyType, factorValue, unit, effectiveFrom, effectiveTo, source, isDefault} ]`

## 2) 时序数据
- `POST /api/timeseries/raw/batch` → 批量写入原始时序 `[{pointId, ts, value, qualityFlag?, sourceSystem?}]`；返回 `{inserted, skipped}`
- `GET /api/timeseries/measurements?pointId=...&start=...&end=...&limit=5000` → 清洗后时序 `[{pointId, ts, value, qualityFlag, aggLevel}]`
- `GET /api/timeseries/latest?pointIds=1,2,3` → 返回每个测点最新一条清洗值。

## 3) 源侧预测（风/光）
- `POST /api/forecast/gen/batch` → 写入出力预测 `[{assetId, forecastIssueTs, ts, pKwPred, p10?, p90?, modelVersion?, scenario?}]`
- `GET /api/forecast/gen?assetId&start=...&end=...&issueTs?` → `[{assetId, ts, pKwPred, p10, p90, modelVersion, scenario}]`
- `POST /api/weather/forecast/batch` → 写入天气预测 `[{stationId, forecastIssueTs, ts, temperaturePred?, windSpeedPred?, ghiPred?, dniPred?, cloudCoverPred?, modelName?}]`
- `GET /api/weather/forecast?stationId&start&end&issueTs?` → 返回天气预测
- `GET /api/weather/stations?parkId` → `[ {id, parkId, name, lat, lon, elevation, provider, status} ]`
- `POST /api/forecast/eval/batch` → 写入预测评估 `[{assetId, forecastIssueTs, horizonMin, mae?, mape?, bias?}]`

## 4) 网侧（微电网拓扑/运行/指令）
- `GET /api/mg/topology?parkId` → `{buses:[...], lines:[...], transformers:[...], switches:[...], pccs:[...]}`
- `GET /api/mg/state/latest?parkId` → 最新运行态 `{ts, mode, islandFlag, pTotalKw, qTotalKvar, freqHz, spinningReserveKw}`
- `POST /api/mg/commands` → 下发指令（占位，记录入库）`{parkId, targetAssetId?, cmdType, payloadJson}`
- `GET /api/mg/commands?parkId&status&since` → 指令列表，含执行结果拼接。

## 5) 调度/约束（THE BRAIN 接口占位）
- `GET /api/dispatch/plans?parkId&status` → `[ {id, parkId, horizonStart, horizonEnd, intervalMin, strategyProfileId, status} ]`
- `GET /api/dispatch/plans/{id}` → `{plan, details:[ {ts, assetId, pSetKw, qSetKvar, heatSetMw, socTarget} ] }`
- `POST /api/dispatch/plans` → 占位创建，body 含计划与明细（便于前端演示/回放）
- `GET /api/dispatch/constraints?parkId` → 列出配置的约束 `{id, name, category, enabled}`
- `GET /api/strategy/profiles?parkId` → 策略档案列表；`GET /api/strategy/profiles/{id}` 详情。

## 6) 荷侧预测与 DR/VPP
- `POST /api/forecast/load/batch` → 写入负荷预测 `[{entId, forecastIssueTs, ts, pKwPred, p10?, p90?, modelVersion?}]`
- `GET /api/forecast/load?entId&start&end&issueTs?` → 返回负荷预测
- `GET /api/dr/events?parkId&status` → `[ {id, parkId, eventType, startTs, endTs, targetKw, priceSignal, status, issuedBy, issuedTs} ]`
- `GET /api/dr/events/{id}` → 事件详情 + participation/performance/settlement
- `POST /api/dr/events` → 占位创建/导入
- `GET /api/dr/resources?entId` → 可调资源池

## 7) 储能态与策略
- `GET /api/storage/assets?parkId` → 储能扩展属性 `[ {assetId, energyKwh, powerKw, socMin, socMax, chargeEff, dischargeEff, vendor} ]`
- `GET /api/storage/state/latest?assetIds=...` → 每个储能的最新状态 `{assetId, ts, socPercent, sohPercent, pKw, tempC, availableChargeKw, availableDischargeKw}`
- `GET /api/storage/policies?parkId` → `[ {id, parkId, name, mode, socTargetMin, socTargetMax, reserveForBlackstartKw, participateInFreqReg, enabled} ]`

## 8) 告警
- `GET /api/alarm-rules?parkId&enabled` → `[ {id, parkId, name, category, expression, threshold, severity, enabled} ]`
- `POST /api/alarm-rules` → 占位创建/导入
- `GET /api/alarms?parkId&assetId&status&since&limit=200` → `[ {id, parkId, entId, assetId, level, category, objectType, objectId, startTs, endTs, status, ruleId, message, ackBy, ackTs} ]`
- `POST /api/alarms/{id}/ack` → `{ackBy}` → 更新 ACK。

## 9) 价格/碳强度与核算
- `GET /api/price/slots?zoneId&start&end` → 分时电价
- `GET /api/carbon/intensity?region&start&end` → 碳强度时序
- `GET /api/carbon/accounting?parkId&start&end` → 核算快照列表
- `GET /api/carbon/accounting/{id}` → 详情（含 detail 行）

## 10) 合规与敏感信息
- 不接受明文密钥；DM8 驱动仍在 `backend/libs/`，`.env` 未入库。
- 运行仍遵循 AGENTS.md 规制：如改动架构/依赖/运行方式需同步更新；提交前跑 `./run-checks.sh`。
