---
id: ref.package-index
title: monorepo 包索引与工具链
kind: reference
tier: T3
pkg: cross
source:
  - package.json
  - README.md
  - scripts/publish.mjs
  - scripts/release-packages.mjs
  - scripts/package-workspaces.mjs
  - packages/ai/package.json
  - packages/agent/package.json
  - packages/protocol/package.json
  - packages/protocol/src/index.ts
  - packages/client/package.json
  - packages/client/src/index.ts
  - packages/coding-agent/package.json
  - packages/coding-agent/src/client/index.ts
  - packages/tui/package.json
  - packages/tui/src/index.ts
  - packages/server/package.json
  - packages/server/src/index.ts
  - packages/session-backends/sqlite-node/package.json
  - packages/telemetry/package.json
  - packages/telemetry/src/index.ts
  - packages/evals/package.json
  - packages/coding-agent/examples/extensions/with-deps/package.json
  - packages/coding-agent/examples/extensions/custom-provider-anthropic/package.json
  - packages/coding-agent/examples/extensions/custom-provider-gitlab-duo/package.json
  - packages/coding-agent/examples/extensions/sandbox/package.json
  - packages/coding-agent/examples/extensions/gondolin/package.json
  - packages/coding-agent/install-lock/package.json
symbols:
  - pi-ai
  - pi-agent-core
  - pi-protocol
  - pi-client
  - pi-coding-agent
  - pi-tui
  - pi-server
  - pi-session-backend-sqlite-node
  - pi-telemetry
  - pi-evals
related:
  - spine.layered-architecture
  - spine.overview
  - subsys.session-backends.sqlite-node
  - subsys.telemetry.contracts
  - subsys.server.session-server
evidence: explicit
status: verified
updated: 086c32e745
---

> `ref.package-index` 枚举 Pi monorepo 当前 workspace、公开 npm 包名、build / publish 边界。源码 workspace 是 `packages/*` + `packages/session-backends/*` + 五个 extension examples；`packages/storage/*` 已不存在。

## 能回答的问题

- Pi 当前有多少个源码 package workspace，哪些进入正式 publish pipeline？
- 根 `build` 顺序为什么包含 `telemetry` 与 `session-backends/sqlite-node`？
- `pi-protocol`、`pi-client`、`pi-server` 与 `pi-coding-agent` 如何形成远程会话栈？
- 哪个 package 是 private eval consumer？`pi-server` 还剩什么 surface？
- npm 包名 `@earendil-works/pi-session-backend-sqlite-node` 和 `@earendil-works/pi-telemetry` 分别对应哪个目录？

## Workspace 与发布边界

根 workspace 使用 `packages/*`、`packages/session-backends/*`，并显式纳入五个 coding-agent extension examples。[E: package.json:5] [E: package.json:6] [E: package.json:7] [E: package.json:8] [E: package.json:9] [E: package.json:10] [E: package.json:11] [E: package.json:12]

`packages/*` 下一层是十个源码目录中的九个（`ai`、`agent`、`protocol`、`client`、`coding-agent`、`tui`、`server`、`telemetry`、`evals`）；第十个源码包是 `packages/session-backends/sqlite-node`。五个 example workspace 只出现在显式 workspace 列表里，不是 `packages/*` 的一阶子目录。

根 `build` / `build:offline` 顺序是 TUI → telemetry → AI → agent-core → `session-backends/sqlite-node` → protocol → client → server → coding-agent。`evals` 不在根 build 链中。[E: package.json:16]

`scripts/publish.mjs` 不再硬编码包清单，而是调用 `getPublicWorkspacePackages()`：递归扫描 `packages/` 下所有含 `package.json` 的目录，过滤 `private !== true` 后按目录排序发布。[E: scripts/publish.mjs:6] [E: scripts/release-packages.mjs:5] [E: scripts/release-packages.mjs:11] [E: scripts/package-workspaces.mjs:6]

因此当前会进入 publish 清单的公开包是：`pi-ai`、`pi-agent-core`、`pi-client`、`pi-coding-agent`、`pi-protocol`、`pi-server`、`pi-session-backend-sqlite-node`、`pi-telemetry`、`pi-tui`。`pi-evals`、五个 extension examples 以及 `packages/coding-agent/install-lock` 都标了 `private: true`，被过滤掉。[E: packages/evals/package.json:4]

## Package catalog

| pkg | package / directory | 角色与公开面 | 关键依赖或发布事实 |
|---|---|---|---|
| `ai` | `@earendil-works/pi-ai` / `packages/ai` | 统一 LLM API；默认入口外还导出 `./compat`、`./providers/*`、`./api/*`、`./oauth`、`./bedrock-provider`、`./bun-oauth`，并提供 `pi-ai` binary。[E: packages/ai/package.json:2] [E: packages/ai/package.json:13] [E: packages/ai/package.json:44] | 依赖 `pi-telemetry`；`build` 会在线生成 model data，`build:offline` 先校验本地 model data 再编译。[E: packages/ai/package.json:57] [E: packages/ai/package.json:58] [E: packages/ai/package.json:65] |
| `agent` | `@earendil-works/pi-agent-core` / `packages/agent` | 可复用 agent runtime、`AgentHarness`、v4 session（`Session` / `SessionRepo` / `JsonlSessionRepo`）与 Node execution environment；公开 `.`、`./node`、`./session/testing`。[E: packages/agent/package.json:2] [E: packages/agent/package.json:9] [E: packages/agent/package.json:13] [E: packages/agent/package.json:17] | 依赖 `pi-ai` 与 `pi-telemetry`，不依赖 coding-agent 产品层。[E: packages/agent/package.json:38] [E: packages/agent/package.json:39] |
| `protocol` | `@earendil-works/pi-protocol` / `packages/protocol` | transport-neutral remote-session protocol；入口公开 CBOR codec、framing 与 TypeBox schemas。[E: packages/protocol/package.json:2] [E: packages/protocol/package.json:4] [E: packages/protocol/src/index.ts:1] [E: packages/protocol/src/index.ts:4] | 运行依赖只有 `typebox`。[E: packages/protocol/package.json:42] |
| `client` | `@earendil-works/pi-client` / `packages/client` | transport-neutral `PiClient` 与 session lease / handle；另导出 `./unix` transport。[E: packages/client/package.json:2] [E: packages/client/package.json:4] [E: packages/client/package.json:13] [E: packages/client/src/index.ts:1] | 只依赖 `pi-protocol`，不反向依赖 coding-agent 或 server 实现。[E: packages/client/package.json:50] |
| `coding-agent` | `@earendil-works/pi-coding-agent` / `packages/coding-agent` | `pi` CLI、SDK / extension surface、RPC entry，并导出 `./client` remote-session adapter。[E: packages/coding-agent/package.json:2] [E: packages/coding-agent/package.json:10] [E: packages/coding-agent/package.json:19] [E: packages/coding-agent/package.json:22] [E: packages/coding-agent/src/client/index.ts:3] | 产品装配依赖 agent-core、AI、client、protocol 与 TUI；不直接依赖 telemetry 或 session-backends。[E: packages/coding-agent/package.json:46] |
| `tui` | `@earendil-works/pi-tui` / `packages/tui` | 差分终端 UI；入口导出 type-only `TUI` interface 与 `TuiAltScreen`、`TuiMainScreen` 两种实现。[E: packages/tui/package.json:2] [E: packages/tui/src/index.ts:130] [E: packages/tui/src/index.ts:137] [E: packages/tui/src/index.ts:138] | 依赖 east-asian-width 与 Markdown 库。[E: packages/tui/package.json:48] [E: packages/tui/package.json:49] |
| `server` | `@earendil-works/pi-server` / `packages/server` | experimental composable protocol server；exports 只有 `.`、`./testing`、`./unix`。根入口 re-export listener / protocol / `PiServer` / types。[E: packages/server/package.json:2] [E: packages/server/package.json:4] [E: packages/server/package.json:8] [E: packages/server/src/index.ts:1] [E: packages/server/src/index.ts:4] | 无 `server` binary，无 `./legacy`。运行依赖只有 `pi-ai` 与 `pi-protocol`。[E: packages/server/package.json:50] [E: packages/server/package.json:51] 因为包未标 `private`，会被 `getPublicWorkspacePackages()` 纳入 publish 清单。[E: scripts/release-packages.mjs:11] |
| `session-backends` | `@earendil-works/pi-session-backend-sqlite-node` / `packages/session-backends/sqlite-node` | Node `node:sqlite` session backend，实现 agent-core 的 `SessionRepo` seam。[E: packages/session-backends/sqlite-node/package.json:2] [E: packages/session-backends/sqlite-node/package.json:4] | 依赖 AI 与 agent-core；`build` 会复制 sqlite migrations。[E: packages/session-backends/sqlite-node/package.json:21] [E: packages/session-backends/sqlite-node/package.json:37] |
| `telemetry` | `@earendil-works/pi-telemetry` / `packages/telemetry` | vendor-neutral telemetry contracts、typed schema helpers、`NOOP_TELEMETRY_CONTEXT` 与 `InMemoryTelemetryContext`；另导出 `./testing` conformance。[E: packages/telemetry/package.json:2] [E: packages/telemetry/package.json:4] [E: packages/telemetry/package.json:13] [E: packages/telemetry/src/index.ts:14] [E: packages/telemetry/src/index.ts:24] | 无运行时依赖；被 `pi-ai` 与 `pi-agent-core` 消费。[E: packages/ai/package.json:65] [E: packages/agent/package.json:39] |
| `evals` | `@earendil-works/pi-evals` / `packages/evals` | private behavioral-eval consumer，用真实 `AgentSession` 适配 `vitest-evals`。[E: packages/evals/package.json:2] [E: packages/evals/package.json:4] | 通过 devDependencies 消费 AI、coding-agent 与 `vitest-evals`，不发布。[E: packages/evals/package.json:12] [E: packages/evals/package.json:17] |

## Extension-example workspaces

| workspace 目录 | package name | 发布 |
|---|---|---|
| `packages/coding-agent/examples/extensions/with-deps` | `pi-extension-with-deps` | `private: true` [E: packages/coding-agent/examples/extensions/with-deps/package.json:2] [E: packages/coding-agent/examples/extensions/with-deps/package.json:3] |
| `packages/coding-agent/examples/extensions/custom-provider-anthropic` | `pi-extension-custom-provider-anthropic` | `private: true` [E: packages/coding-agent/examples/extensions/custom-provider-anthropic/package.json:2] [E: packages/coding-agent/examples/extensions/custom-provider-anthropic/package.json:3] |
| `packages/coding-agent/examples/extensions/custom-provider-gitlab-duo` | `pi-extension-custom-provider-gitlab-duo` | `private: true` [E: packages/coding-agent/examples/extensions/custom-provider-gitlab-duo/package.json:2] [E: packages/coding-agent/examples/extensions/custom-provider-gitlab-duo/package.json:3] |
| `packages/coding-agent/examples/extensions/sandbox` | `pi-extension-sandbox` | `private: true` [E: packages/coding-agent/examples/extensions/sandbox/package.json:2] [E: packages/coding-agent/examples/extensions/sandbox/package.json:3] |
| `packages/coding-agent/examples/extensions/gondolin` | `pi-extension-gondolin` | `private: true` [E: packages/coding-agent/examples/extensions/gondolin/package.json:2] [E: packages/coding-agent/examples/extensions/gondolin/package.json:3] |

这五条路径写在根 `workspaces` 数组里，用于 npm workspace 解析 example 依赖，不进入 `getPublicWorkspacePackages()` 发布清单。[E: package.json:8] [E: scripts/release-packages.mjs:11] `packages/coding-agent/install-lock` 也是 `private: true`，会被 publish 扫描发现但被过滤。[E: packages/coding-agent/install-lock/package.json:2] [E: packages/coding-agent/install-lock/package.json:4]

## 远程会话依赖链

```mermaid
flowchart LR
  P["pi-protocol: schemas + CBOR framing"] --> C["pi-client: PiClient + leases"]
  P --> S["pi-server: composable PiServer"]
  C --> CA["pi-coding-agent ./client adapter"]
  S --> B["application PiServerService"]
```

`pi-protocol` 与 `pi-client` 是公开包；coding-agent 把 client / protocol 引入产品层的 `./client` adapter。`pi-server` 只依赖 protocol 与 `pi-ai`，由应用提供 `PiServerService`；它不再封装 coding-agent RPC 子进程，也不再提供 legacy JSONL IPC / supervisor / Radius。[E: packages/coding-agent/package.json:48] [E: packages/coding-agent/package.json:49] [E: packages/server/package.json:50] [E: packages/server/package.json:51] [E: packages/server/src/index.ts:4] 本地 RPC mode 仍在 `pi-coding-agent` 进程内，不等于这条 remote 栈。[I]

## 根工具链

- 模型目录有 `generate:models`、`hydrate:model-data`、`check:model-data`、`generate:model-catalog` 与 catalog diff / check 命令。[E: package.json:24] [E: package.json:27]
- 根 `test` 先跑 scripts tests，再对所有有 test script 的 workspace 执行测试。[E: package.json:33] [E: package.json:34]
- check pipeline 覆盖 Biome、依赖固定、TypeScript import、shrinkwrap、install lock、`tsgo` 与 browser smoke。[E: package.json:18]
- 根 monorepo 与各公开 package 的 `engines.node` 都是 `>=22.19.0`；`pi-evals` 与五个 extension examples 未写 `engines`。根工具链使用 TypeScript native preview (`tsgo`)。[E: package.json:64] [E: package.json:55]
- README 的公开产品表列出 telemetry、ai、agent-core、coding-agent、tui；protocol / client / server / session-backends / evals 不在该短表里。[E: README.md:30] [E: README.md:31] [E: README.md:32] [E: README.md:33] [E: README.md:34]

## Sources

- package.json
- README.md
- scripts/publish.mjs
- scripts/release-packages.mjs
- scripts/package-workspaces.mjs
- packages/ai/package.json
- packages/agent/package.json
- packages/protocol/package.json
- packages/protocol/src/index.ts
- packages/client/package.json
- packages/client/src/index.ts
- packages/coding-agent/package.json
- packages/coding-agent/src/client/index.ts
- packages/tui/package.json
- packages/tui/src/index.ts
- packages/server/package.json
- packages/server/src/index.ts
- packages/session-backends/sqlite-node/package.json
- packages/telemetry/package.json
- packages/telemetry/src/index.ts
- packages/evals/package.json
- packages/coding-agent/examples/extensions/with-deps/package.json
- packages/coding-agent/examples/extensions/custom-provider-anthropic/package.json
- packages/coding-agent/examples/extensions/custom-provider-gitlab-duo/package.json
- packages/coding-agent/examples/extensions/sandbox/package.json
- packages/coding-agent/examples/extensions/gondolin/package.json
- packages/coding-agent/install-lock/package.json

## 相关

- [spine.layered-architecture](../spine/layered-architecture.md) - 远程会话层与本地 agent 主路径的边界。
- [spine.overview](../spine/overview.md) - CLI、agent loop、provider、TUI 和 remote 栈总览。
- [subsys.session-backends.sqlite-node](../subsystems/session-backends/sqlite-node.md) - SQLite `SessionRepo` backend。
- [subsys.telemetry.contracts](../subsystems/telemetry/contracts.md) - vendor-neutral telemetry contracts。
- [subsys.server.session-server](../subsystems/server/session-server.md) - composable `PiServer`。
