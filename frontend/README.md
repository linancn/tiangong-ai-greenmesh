零碳园区前端（Vite + React + MUI）
===================================

已初始化的内容
- 技术栈：Vite 7 + React 19 + TypeScript + MUI 7；状态管理 TanStack Query（数据）+ React Router；样式使用 MUI 主题 + 基础全局样式。
- 业务骨架：总览、调度、碳核算、审计 4 个路由，配合 mock 数据（`src/api/mockClient.ts`）；全局布局在 `src/app/layout/AppLayout.tsx`。
- 可视化：MUI X Charts 用于趋势/曲线，MUI 组件用于卡片/表格/Chip。
- 质量：ESLint（含 prettier 兼容）、Vitest + Testing Library，`src/setupTests.ts` 已注册 jest-dom。

主要目录
- `src/app`：主题、路由、布局。
- `src/features/*`：功能页面（overview/dispatch/carbon/audit）。
- `src/api/mockClient.ts`：用于演示的 mock 数据，可逐步替换为真实 API。
- `src/components`：通用组件（如 `StatusCard`）。
- `src/index.css`：全局基础样式。

常用命令
- 安装依赖：`npm install`
- 开发：`npm run dev`
- 构建：`npm run build`
- 代码检查：`npm run lint`
- 测试：`npm run test`
- 格式检查：`npm run format`

替换为真实后端的提示
- 将 `src/api/mockClient.ts` 替换为 `axios`/`fetch` 请求，配合 TanStack Query 的 `queryFn`。
- 若需要 WebSocket/SSE 推送，可在 `AppLayout` 上层增加通道 provider，并用 Zustand 存放实时 UI 状态。
- 主题可在 `src/app/theme.ts` 调整品牌色、组件圆角与 typography。
