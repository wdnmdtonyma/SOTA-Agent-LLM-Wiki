# uncertainty-update-4c6fb7cfe8-durable-harness

来源节点：`subsys.durable.harness`（`subsystems/durable/harness.md`）

## [U] 默认 `pi` CLI 会不会切到 durable Harness

当前产品会话仍是 coding-agent `SessionManager` JSONL（`CURRENT_SESSION_VERSION = 3`）。`Harness.open()` 只出现在 `packages/coding-agent/src/experimental/**`（session worker / vacation planner），published `files` 排除 `dist/experimental`，`pi` bin 仍是 `dist/bundle/cli.js`。是否会把默认 CLI 会话运行时换成 `pi-durable` Harness 未知。

## [U] coding-agent 会不会声明 `@earendil-works/pi-durable` 依赖

experimental session-worker 已 `import { Harness } from "@earendil-works/pi-durable"`，但 `packages/coding-agent/package.json` `dependencies` 未列出 `pi-durable`（有 `pi-agent-core` / `pi-ai`）。这与 experimental 被排除出 npm `files` 一致；若 experimental 进入 shipped 包，依赖是否补上未知。
