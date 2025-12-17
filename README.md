面向“零碳园区 / 绿电直连 / 新能源调度”的 IT 系统架构与技术栈设计（规则先行，可解释、可追溯，随后再优化/智能化）
================================================================================================

详细领域设计与数据流整理见 `docs/platform-design.md`。

1) 设计目标与约束
- 实时态势 + 可控调度：源-网-荷-储-充状态秒级感知，调度分钟级闭环，异常可回退。
- 碳约束可解释：核算边界/因子/口径统一，计算链路可追溯。
- 可追溯/可审计：全链路日志、审计事件、调度令牌存档，支持验收、追责、复盘。
- 可扩展：多园区/多站点/多厂家协议适配；业务/设备扩展可插拔。
- 技术栈约束：前端 Vite + React + MUI；后端 Java 21 + Spring Boot 3（最新 LTS）；数据库达梦 DM8；前后端均在当前目录管理。

2) 总体分层架构（以规则优先，渐进智能）
- 采集层：IoT 网关（MQTT/IEC104/Modbus/OPC-UA/GB/T 27930 充电桩），边缘侧先做协议标准化与校验。
- 接入层：Device Adapter Service（Spring Boot 微服务）+ Kafka（事件总线）+ WebSocket/SSE 通道；写入 DM8 实时分区表和 Redis 缓存。
- 平台基础层：身份与权限（IAM/OAuth2/OIDC）、多租户、组织/园区/站点主数据、字典/因子库管理。
- 业务域服务：
  - 监测态势：设备/回路/馈线状态，源-网-荷-储-充拓扑视图，电量/功率/SoC 时序。
  - 碳核算：核算边界、排放因子、口径配置；采集数据 → 标准化 → 碳数据集 → 账单/报表。
  - 调度与策略：策略库（规则优先，Drools/Easy Rules + 配置化 DSL），调度引擎（计划→校验→下发→反馈），风险控制（阈值、速率、互斥/联动）。
  - 计量结算：分时电价、分布式结算、绿证/绿电匹配记录。
  - 审计追溯：调度令牌、变更记录、签名与哈希留痕，操作回放。
- 分析与优化（后期）：负荷预测、储能优化、光伏出力预测；Flink 流式特征，模型服务化（可灰度/可回退）。
- 展示层：Vite + React + MUI，ECharts/AntV 作图，地图（MapboxGL/高德 WebGL）；SSE/WebSocket 实时更新。

3) 前端架构（/frontend）
- 架构：Vite + React 18 + TypeScript + MUI 5；状态管理 TanStack Query（数据同步）+ Zustand（局部 UI 状态）。
- 通信：REST（配置/查询）、WebSocket/SSE（实时态势、调度回执）；统一 API 客户端 + 错误托管。
- 关键页面：总览大屏、源-网-荷-储-充拓扑、调度台、碳核算/报表、审计留痕、策略配置、设备视图。
- 组件：实时指标卡、时序曲线（功率/电量/SoC/碳）、调度面板（计划→模拟→下发）、事件时间轴（审计）。
- 测试与质量：Vitest + React Testing Library；ESLint + Prettier；i18n（zh/ en）；暗/亮主题切换。

4) 后端架构（/backend）
- 语言/框架：Java 21，Spring Boot 3.x LTS，Gradle 或 Maven（推荐 Gradle Kotlin DSL）。
- 子模块建议（单体可起步，预留拆分）：
  - gateway：Spring Cloud Gateway/Netty，鉴权、流控、灰度、协议升级（HTTP ↔ WebSocket）。
  - iam: OAuth2/OIDC、RBAC/ABAC、多租户隔离、审计。
  - masterdata: 园区/站点/馈线/设备/计量点/因子库/字典。
  - telemetry: 设备数据接入、数据标准化、质量校验、异常数据隔离；写 Kafka → DM8。
  - carbon: 核算边界定义、因子管理、口径版本管理、碳账本生成、报表。
  - dispatch: 策略库（规则配置），调度编排（校验→模拟→执行→回执），互斥/联动/安全阈值控制。
  - settlement: 分时电价、用能计费、绿证匹配记录。
  - audit: 审计事件、指令留痕、签名/哈希，回放 API。
- 技术栈选型：
  - Web/接口：Spring MVC + WebFlux（实时通道），Spring Validation，OpenAPI 3。
  - 数据访问：达梦 DM8 JDBC + MyBatis-Plus（手控 SQL/分片/分区）；Flyway 做 schema 版本管理（配合 DM8 SQL 方言）。
  - 消息与流处理：Kafka（事件总线），Flink（实时指标聚合、异常检测、滚动窗口）。
  - 缓存/会话：Redis（Cluster/Sentinel）；Redisson 分布式锁用于调度幂等。
  - 规则引擎：Easy Rules/Drools（规则先行）；策略版本化、灰度发布、回滚。
  - 观测：Micrometer + Prometheus + Grafana；ELK/Opensearch 日志；OpenTelemetry Trace。
  - 测试：JUnit 5 + Testcontainers（本地可用 DM8 镜像/或容器映射）、WireMock。

5) 数据与存储（DM8 为主）
- 基础域 DDL：`backend/src/main/resources/db/base-schema.sql`（主数据/时序/告警）；dev(H2) 通过 `spring.sql.init` 自动加载，DM8 环境请手工执行后再启动服务。
- 模型分层：主数据（园区/设备/计量点/因子）、业务数据（核算记录/调度令牌/事件）、时序数据（功率/电量/SoC/电价/碳因子）。
- DM8 设计：时序表使用分区（按天/月），索引覆盖 device_id + ts；冷热分离（近期热数据，历史归档分区只读）；写入采用批量/异步。
- 典型表（示例）：device, meter_point, factor, carbon_boundary, carbon_record, dispatch_plan, dispatch_command, dispatch_feedback, audit_event, time_series_energy, time_series_power, price_slot。
- 审计留痕：关键表加签名字段（hash_of_payload），记录操作人/时间/来源/工单；调度令牌与命令一一对应。

6) 实时态势与调度链路（源-网-荷-储-充）
- 采集 → 校验 → 标准化（单位/量纲/精度）→ Kafka topic（telemetry.raw → telemetry.normalized）。
- Flink 窗口聚合实时生成：功率/电量/SoC/告警/预测输入 → 写 Redis 缓存 → 前端 SSE/WebSocket 推送。
- 调度流程：策略选择/编排 → 规则引擎校验（安全阈值、互斥/联动、速率限制）→ 模拟（数字孪生/稳态校验）→ 生成命令（带令牌）→ 下发（MQTT/104/Modbus/充电桩协议）→ 回执/结果收集 → 审计存档。
- 风险控制：双通道下发（主/备）、命令 TTL、幂等令牌、回滚策略（紧急停机/恢复默认功率）、关键动作需人机共审或电子签名。

7) 碳核算与可解释性
- 边界/口径配置：支持园区/设备/回路级别，版本化管理；因子来源（国家/行业/定制）留档。
- 计算链路：采集数据 → 量纲统一 → 乘以因子 → 汇总 → 报表；每步产生计算节点日志（输入/公式/输出/版本号/操作者），可回放。
- 口径一致性：统一字典/公式服务；在调度/预测时同样使用同一套因子/口径，确保数据闭环。
- 审计：每份报表有签名、版本、生成时间、数据快照引用；支持复算与差异比对。

8) 可扩展性与多厂家适配
- Device Adapter 插件化：协议适配器 SPI；新厂家/设备通过配置 + 适配器 jar 方式接入。
- 园区多租户：基于租户/组织隔离数据表或租户列（带租户约束），Redis 缓存分租户前缀，Kafka topic 分租户/分站点。
- API 向上开放：REST + WebSocket + 订阅事件（Kafka/AMQP）+ 报表导出。

9) 安全、合规、可观测
- 安全：IAM + RBAC/ABAC，细粒度权限；命令双人复核；敏感操作 MFA；数据加密（传输 TLS，存储按需加密）。
- 可观测：指标/日志/追踪统一接入；调度链路 Trace 采样；关键指标（延迟、成功率、告警率、预测误差）。
- 容错：服务多实例 + 熔断/限流（Resilience4j），Kafka 多副本，Redis Sentinel/Cluster，DM8 主从或集群。

10) 部署与环境（能迅速上线）
- Dev: docker-compose（DM8、Kafka、Redis、Flink、Grafana）；前端 Vite Dev Server；后端本地 Spring Boot。
- Prod: Kubernetes（Helm/Kustomize），分层命名空间（edge/infra/app）；CI/CD（GitHub Actions/Jenkins）→ 镜像扫描 → 灰度。
- 配置中心：Spring Cloud Config/Nacos；密钥管理：KMS/密钥管控。
- 灰度/回滚：Gateway 路由灰度 + 规则版本灰度；镜像分阶段发布；数据库迁移用 Flyway，可回滚分区或热备切换。

11) 目录建议（当前仓库）
- /frontend: Vite + React + MUI 前端工程（后续执行 `npm create vite@latest` 初始化）。
- /backend: Spring Boot 3 + Java 21 后端工程（Gradle/Maven）；模块按上节命名。
- /docs: 架构/数据字典/接口契约；本文件可放 /docs/architecture.md。

12) 渐进式智能化路线（在规则稳定后）
- 阶段 1：规则/阈值/静态策略 + 预测占位接口，所有计算可解释可回放。
- 阶段 2：引入预测模型（负荷/光伏/电价）+ 储能优化，保留规则兜底与人工兜底。
- 阶段 3：闭环自适应调度，带 A/B/灰度与强制回退开关，持续校验碳口径一致性。
