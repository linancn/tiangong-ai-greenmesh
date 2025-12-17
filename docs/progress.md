# 项目实施进度（滚动同步）

更新时间：2025-12-17

## 后端
- 基础 DDL：`backend/src/main/resources/db/base-schema.sql` 覆盖主数据、时序、告警、风光预测、微电网/调度、负荷预测、DR/VPP、储能、分时电价/碳强度、策略与碳核算；DM8 已执行并验证表。
- 配置：`application.yml` dev(H2)/dm8 profiles，`app.seed.demo-enabled=true` 默认开启。
- Demo 数据播种（dev/dm8）：`DevDataSeeder` 自动插入示例园区/资产/测点、测点时序、发电预测、调度计划，便于前端演示。
- 新增 REST 控制器（JdbcTemplate）：
  - `MasterDataController`：/api/parks, /enterprises, /assets, /meter-points, /price-zones, /carbon-factors。
  - `TimeseriesController`：/api/timeseries/raw/batch 写 raw；/measurements 区间；/latest 最新清洗值。
  - `ForecastController`：/api/forecast/gen (写/查)。
  - `DispatchController`：/api/dispatch/plans 列表、详情，POST 创建计划+明细。
- 检查：`cd backend && ./gradlew test` 通过（dev/H2）。

## 前端
- API 客户端：`src/api/client.ts` 支持 parks/assets/meter-points/latest timeseries/gen forecast/dispatch plans/plan details，带 token 拦截。
- 类型：`src/types/common.ts`（StatusLevel）、`src/api/types.ts`（park/asset/forecast/dispatch）。
- 页面接入：
  - OverviewPage：改为真实接口驱动（园区/资产选择、测点最新值、发电预测、调度计划列表）；可输入点位 ID 列表。
  - DispatchPage：调度计划列表 + 明细，园区/状态筛选，调用后端 `/api/dispatch/plans`/`{id}`。
- UI 组件：StatusCard 使用通用 StatusLevel 类型。

## 运行说明（当前状态）
- Dev：`./run-dev.sh` 或直接 `cd backend && ./gradlew bootRun`（H2 自动建表 + demo 数据）；前端 `cd frontend && npm run dev`（默认 VITE_API_BASE=http://localhost:8080）。
- DM8：`cd backend && docker compose up -d dm8`，手动执行 base-schema（示例命令在 AGENTS.md），后端 `SPRING_PROFILES_ACTIVE=dm8 ./gradlew bootRun`，可开启 `app.seed.demo-enabled=true` 播种示例数据。

## 待办/风险
- 前端其余页面仍使用 mock（审计/碳等），需继续替换到真实接口或占位 API。
- 缺少请求/响应校验、错误处理与分页；未接入认证守卫（当前仅 token 透传）。
- 需为新接口补充 WebMvc 测试与简单入参验证。
- DM8 场景未跑自动化验证（依赖手工执行 DDL/驱动）。
