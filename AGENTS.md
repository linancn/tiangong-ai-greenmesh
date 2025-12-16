面向协作 AI 的项目说明与操作规制
==============================

项目概览
- 目标：零碳园区 / 绿电直连 / 新能源调度的规则优先、可解释、可追溯的平台。前端 Vite+React+MUI，后端 Java 21 + Spring Boot 3，数据库达梦 DM8（联调栈含 Kafka/Redis/Flink/Grafana）。
- 目录：`frontend/`（Vite React）、`backend/`（Spring Boot）、`docker-compose.yml`（在 backend 下）、`jdbc/`（驱动与方言包，勿入库）、根目录 `.env`（本地口令，已 gitignore）。
- 运行：前端 `npm run dev`；后端 dev(H2) `./gradlew bootRun`；后端 DM8 `SPRING_PROFILES_ACTIVE=dm8 ... ./gradlew bootRun`；联调栈 `cd backend && docker compose up -d ...`。
- 登录（开发占位）：后端 `/api/auth/login` 简易校验账号 `admin/admin123` 返回 token；前端提供 `/login` 页面并用保护路由，未登录会跳转登录。上线前必须替换为真实认证/鉴权。

安全与敏感信息
- `.env`（根目录）含口令占位，已被忽略；切勿提交真实密码/令牌。
- `backend/libs/` 存放 DM8 JDBC 驱动（已 gitignore），不应入库。
- docker-compose 默认口令通过 `.env` 注入（`DM8_SYSDBA_PWD`、`GRAFANA_USER/PASSWORD`），发布前务必更改。

达梦（DM8）要点
- 镜像：`cnxc/dm8:20250423-kylin`（可替换）。初始化口令需符合复杂度。
- 运行后端时需提供：`DM8_HOST`、`DM8_PORT`、`DM8_USER`、`DM8_PASSWORD`。当前 Flyway 默认禁用（官方未内置 DM 方言），如启用需自备方言/脚本。
- Spring Data JDBC 未启用（dm8 profile 下关闭 jdbc repositories），后续如需使用达梦方言需手动配置。

前端要点
- 技术栈：Vite 7、React 19、TypeScript、MUI、TanStack Query、React Router、ECharts。`src/api/mockClient.ts` 为示例数据，真实接口接入后替换。
- 命令：`npm run dev` / `build` / `lint` / `test` / `format`。
- 测试：React Testing Library + Vitest，示例 `src/features/auth/LoginPage.test.tsx`。

后端要点
- 依赖：web/validation/actuator、data-redis、spring-kafka、H2(dev)、DM8 JDBC(外部)。
- 探活接口：`GET /api/status`。
- `application.yml`：profiles `dev`(H2) / `dm8`(达梦)；Flyway disabled in dm8；Redis/Kafka 通过 env 覆盖。DM8 URL 形如 `jdbc:dm://host:5236?schema=SYSDBA`（默认 schema=SYSDBA），需提供 `DM8_USER/DM8_PASSWORD`。
- CORS：`app.cors.allowed-origins` 支持配置（默认 http://localhost:5173）。
- 认证与数据：`/api/auth/login` 现读取数据库表 `USERS`（JdbcTemplate，启动时自动建表并插入默认账号 admin/admin123，仅限开发），需上线前接入 IAM/OIDC 并移除默认账号。
- 测试：`./gradlew test`（包含 AuthController 登录流程测试，使用 dev profile/H2）。
- 快速联调脚本：`run-dev.sh`（根目录），从 `.env` 读取口令，启动 docker compose（dm8/kafka/redis/flink/grafana），并并行启动后端 dm8 profile 与前端 dev（VITE_API_BASE 默认 http://localhost:8080）。修改 `.env` 后再运行。
- 统一检查脚本：`run-checks.sh`（根目录）依次运行前端 lint/test 与后端 test。

CI/CD 与环境
- 当前未配置 CI。若添加，请确保 `.env`、`libs/`、任何密钥均不入库，并用 Secret 管理。

规制（每次更新代码后的必做事项）
1) 如对架构/依赖/运行方式有变动，必须同步更新本文件 AGENTS.md，保持信息最新。
2) 不得提交任何真实口令、令牌、证书或私有驱动；敏感文件需在 `.gitignore` 中确保忽略。
3) 新增服务或配置时，明确默认值是否需通过环境变量覆盖，并在此文件记录。
4) 变更联调栈（docker-compose）或运行命令时，更新对应说明。
5) 提交前务必跑 `./run-checks.sh`（前端 lint/test + 后端 test）。
