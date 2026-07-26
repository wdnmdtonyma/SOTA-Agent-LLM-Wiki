---
id: ref.package-index
title: monorepo 包索引与工具链
kind: reference
tier: T3
pkg: cross
source:
  - package.json
  - README.md
  - biome.json
  - tsconfig.base.json
  - packages/ai/package.json
  - packages/ai/src/index.ts
  - packages/agent/package.json
  - packages/agent/src/index.ts
  - packages/coding-agent/package.json
  - packages/coding-agent/src/index.ts
  - packages/tui/package.json
  - packages/tui/src/index.ts
  - packages/server/package.json
  - packages/server/README.md
  - packages/server/src/index.ts
  - packages/server/src/config.ts
  - packages/server/src/handler.ts
  - packages/server/src/rpc-process.ts
  - packages/server/src/serve.ts
  - packages/server/src/supervisor.ts
  - packages/server/src/types.ts
  - packages/storage/sqlite-node/package.json
  - packages/storage/sqlite-node/src/index.ts
  - packages/evals/package.json
  - packages/evals/README.md
  - packages/evals/src/pi-harness.ts
  - scripts/publish.mjs
symbols:
  - pi-ai
  - pi-agent-core
  - pi-coding-agent
  - pi-tui
  - pi-server
  - pi-storage-sqlite-node
  - pi-evals
related:
  - spine.layered-architecture
  - spine.overview
evidence: explicit
status: verified
updated: cee5ff7520
---

> `ref.package-index` 是 Pi monorepo 的核心 package catalog：它展开七个核心 package、五个 extension-example workspace、entrypoint/build-test scripts 与实际 publish pipeline，并把根工具链与分层节点对齐。

## 能回答的问题

- Pi monorepo 的七个核心 package 分别负责什么，根 publish pipeline 实际发布哪些？
- 哪些包是 README 明确列出的包，哪个包是源码/README 明确标注的 experimental package？
- 根 workspace、build、check、test、release 和 supply-chain hardening 脚本在哪里？
- 各包 public entrypoint 大致导出哪些 API surface？
- `spine.layered-architecture` 与 `spine.overview` 应怎样使用本包索引？

## 包 catalog

| Symbol | package / directory | 类型与职责 | Public surface / binary | 主要脚本 | 依赖关系 |
|---|---|---|---|---|---|
| `pi-ai` | `@earendil-works/pi-ai` / `packages/ai`；根 README 把它描述为 unified multi-provider LLM API。[E: README.md:30] | `package.json` 说明它提供 automatic model discovery 和 provider configuration 的 unified LLM API。[E: packages/ai/package.json:2] [E: packages/ai/package.json:4] | 默认 export 是 `dist/index.js` / `dist/index.d.ts`，并额外导出 `./compat`、`./providers/*`、`./api/*`、`./oauth`、`./bedrock-provider`、`./bun-oauth`；包还提供 `pi-ai` bin。[E: packages/ai/package.json:6] [E: packages/ai/package.json:7] [E: packages/ai/package.json:18] [E: packages/ai/package.json:22] [E: packages/ai/package.json:26] [E: packages/ai/package.json:30] [E: packages/ai/package.json:34] [E: packages/ai/package.json:38] [E: packages/ai/package.json:44] | `build` 先运行 `generate-models` 刷新 generated model data，再由 `build:offline` 校验 model data、运行 `tsgo` 并复制 provider data；`test` 是 `vitest --run`。[E: packages/ai/package.json:52] [E: packages/ai/package.json:57] [E: packages/ai/package.json:58] [E: packages/ai/package.json:59] | LLM/provider API 包；根 README 的 All Packages 表把它列为 unified multi-provider LLM API。[E: README.md:30] |
| `pi-agent-core` | `@earendil-works/pi-agent-core` / `packages/agent`；根 README 把它描述为 agent runtime with tool calling and state management。[E: README.md:31] [E: README.md:31] | `package.json` 说明它是带 transport abstraction、state management、attachment support 的 general-purpose agent。[E: packages/agent/package.json:2] [E: packages/agent/package.json:4] | 默认 export 是 `dist/index.js` / `dist/index.d.ts`，并导出 `./node` 和 `./package.json`。[E: packages/agent/package.json:6] [E: packages/agent/package.json:7] [E: packages/agent/package.json:13] [E: packages/agent/package.json:17] | `build` 是 `tsgo -p tsconfig.build.json`；测试包括默认 `vitest --run`、harness 专用 vitest config、harness coverage。[E: packages/agent/package.json:25] [E: packages/agent/package.json:26] [E: packages/agent/package.json:27] [E: packages/agent/package.json:28] | 依赖 `@earendil-works/pi-ai`、`diff`、`ignore`、`typebox`、`yaml`。[E: packages/agent/package.json:32] [E: packages/agent/package.json:33] [E: packages/agent/package.json:34] [E: packages/agent/package.json:35] [E: packages/agent/package.json:36] |
| `pi-coding-agent` | `@earendil-works/pi-coding-agent` / `packages/coding-agent`；根 README 把它描述为 interactive coding agent CLI。[E: README.md:32] [E: README.md:32] | `package.json` 说明它是带 read、bash、edit、write tools 和 session management 的 coding agent CLI，并声明项目级 config dir 是 `.pi`。[E: packages/coding-agent/package.json:2] [E: packages/coding-agent/package.json:4] [E: packages/coding-agent/package.json:6] [E: packages/coding-agent/package.json:7] | `pi` bin 指向 `dist/cli.js`；默认 export 是 `dist/index.js` / `dist/index.d.ts`，另有 `./rpc-entry`。[E: packages/coding-agent/package.json:9] [E: packages/coding-agent/package.json:10] [E: packages/coding-agent/package.json:12] [E: packages/coding-agent/package.json:13] [E: packages/coding-agent/package.json:19] | `build` 运行 `tsgo` 后 chmod CLI/RPC entry 并复制 assets；`build:binary` 先构建 TUI/AI/Agent，再用 Bun compile；`test` 是 `vitest --run`；`shrinkwrap` 生成 coding-agent npm shrinkwrap。[E: packages/coding-agent/package.json:33] [E: packages/coding-agent/package.json:34] [E: packages/coding-agent/package.json:37] [E: packages/coding-agent/package.json:38] | 依赖 `pi-agent-core`、`pi-ai`、`pi-tui`，所以它是把 runtime、provider 和 terminal UI 组合成产品 CLI 的 package。[E: packages/coding-agent/package.json:41] [E: packages/coding-agent/package.json:42] [E: packages/coding-agent/package.json:43] [E: packages/coding-agent/package.json:44] [I] |
| `pi-tui` | `@earendil-works/pi-tui` / `packages/tui`；根 README 把它描述为 terminal UI library with differential rendering。[E: README.md:33] | `package.json` 说明它是面向 efficient text-based applications 的 Terminal User Interface library with differential rendering。[E: packages/tui/package.json:2] [E: packages/tui/package.json:4] | 默认 `main` 是 `dist/index.js`，类型是 `dist/index.d.ts`；发布文件包括 `dist/**/*`、darwin/win32 native prebuilds 和 README。[E: packages/tui/package.json:6] [E: packages/tui/package.json:14] [E: packages/tui/package.json:15] [E: packages/tui/package.json:16] [E: packages/tui/package.json:17] [E: packages/tui/package.json:38] | `build` 是 `tsgo -p tsconfig.build.json`；`test` 使用 Node 内置 test runner 跑 `test/*.test.ts`。[E: packages/tui/package.json:9] [E: packages/tui/package.json:10] | 依赖 `get-east-asian-width` 与 `marked`，对应 terminal width 和 Markdown rendering 这类 TUI 基础能力。[E: packages/tui/package.json:40] [E: packages/tui/package.json:41] [I] |
| `pi-server` | `@earendil-works/pi-server` / `packages/server`；根 workspace 会纳入 `packages/*`，所以该包属于 monorepo workspace。[E: package.json:5] [E: package.json:6] | `package.json` 描述是 “experimental server package for pi”，README 也明确写着 package experimental、active development、CLI/API/behavior not stable。[E: packages/server/package.json:2] [E: packages/server/package.json:4] [E: packages/server/README.md:1] [E: packages/server/README.md:3] | 默认 export 是 `dist/index.js` / `dist/index.d.ts`；源码 entrypoint 导出 config、handler、IPC client/server/protocol、rpc-process、serve、storage、supervisor、types。[E: packages/server/package.json:6] [E: packages/server/package.json:7] [E: packages/server/package.json:9] [E: packages/server/package.json:10] [E: packages/server/package.json:11] [E: packages/server/src/index.ts:1] [E: packages/server/src/index.ts:2] [E: packages/server/src/index.ts:3] [E: packages/server/src/index.ts:4] [E: packages/server/src/index.ts:5] [E: packages/server/src/index.ts:6] [E: packages/server/src/index.ts:7] [E: packages/server/src/index.ts:8] [E: packages/server/src/index.ts:9] [E: packages/server/src/index.ts:10] | `build` 是 `tsgo -p tsconfig.build.json` 后 chmod `dist/cli.js`；`dev` 是 watch build；scripts block 另外只有 `clean` / `prepublishOnly`，没有 package-level `test` script。[E: packages/server/package.json:23] [E: packages/server/package.json:24] [E: packages/server/package.json:25] [E: packages/server/package.json:26] | 依赖 `@earendil-works/pi-coding-agent`，且 supervisor/rpc-process 直接 import coding-agent RPC 和 session event types，用 child process 启动 coding-agent RPC entry。[E: packages/server/package.json:42] [E: packages/server/package.json:43] [E: packages/server/src/supervisor.ts:2] [E: packages/server/src/supervisor.ts:9] [E: packages/server/src/rpc-process.ts:5] [E: packages/server/src/rpc-process.ts:11] [E: packages/server/src/rpc-process.ts:57] [E: packages/server/src/rpc-process.ts:59] |
| `pi-storage-sqlite-node` | `@earendil-works/pi-storage-sqlite-node` / `packages/storage/sqlite-node`；root 通过 `packages/storage/*` 纳入 workspace。[E: package.json:5] [E: package.json:8] | Node `node:sqlite` backend for agent-core sessions。[E: packages/storage/sqlite-node/package.json:2] [E: packages/storage/sqlite-node/package.json:4] | 根 export 提供 `DatabaseSync` adapter、`SqliteSessionRepo`、storage、migrations 与 types。[E: packages/storage/sqlite-node/package.json:8] [E: packages/storage/sqlite-node/src/index.ts:84] [E: packages/storage/sqlite-node/src/index.ts:88] [E: packages/storage/sqlite-node/src/index.ts:97] | build 会编译并复制 SQLite migrations；要求 Node >=22.19。[E: packages/storage/sqlite-node/package.json:21] [E: packages/storage/sqlite-node/package.json:31] [E: packages/storage/sqlite-node/package.json:32] | 依赖 pi-ai 与 pi-agent-core，不是 coding-agent 默认 storage 的硬依赖。[E: packages/storage/sqlite-node/package.json:35] [E: packages/storage/sqlite-node/package.json:36] [I] |
| `pi-evals` | `@earendil-works/pi-evals` / `packages/evals`。[E: packages/evals/package.json:2] | private behavioral-evaluation workspace。[E: packages/evals/package.json:4] [E: packages/evals/README.md:3] | 不声明 package export；`piCodingAgentHarness` 只在 repo eval source 中使用。[E: packages/evals/src/pi-harness.ts:163] | `eval` 运行自有 runner；根 `npm run eval` 委派到这个 workspace。[E: packages/evals/package.json:8] [E: package.json:29] | dev dependency 指向 coding-agent 与 vitest-evals，驱动真实 session。[E: packages/evals/package.json:11] [E: packages/evals/package.json:15] [E: packages/evals/src/pi-harness.ts:5] [E: packages/evals/src/pi-harness.ts:11] |

## Public entrypoint 摘要

`pi-ai` 的 public entrypoint 导出 lazy API、auth、image models、models、provider facade、session resources、types、diagnostics、event stream、overflow、retry、validation 等基础能力；generated catalogs、provider factories、API registry、OAuth implementations 与 compat 不由这个 core surface 重导出。[E: packages/ai/src/index.ts:15] [E: packages/ai/src/index.ts:21] [E: packages/ai/src/index.ts:33] [E: packages/ai/src/index.ts:34] [E: packages/ai/src/index.ts:36] [E: packages/ai/src/index.ts:37] [E: packages/ai/src/index.ts:38] [E: packages/ai/src/index.ts:39] [E: packages/ai/src/index.ts:40] [E: packages/ai/src/index.ts:42] [E: packages/ai/src/index.ts:43] [E: packages/ai/src/index.ts:47] [I]

`pi-agent-core` 的 public entrypoint 导出 `Agent`、loop functions、`AgentHarness`、compaction、messages、prompt templates、JSONL/memory session repos、skills、system prompt、harness types、shell/truncate utilities、proxy 和 shared types；这可支撑 `spine.layered-architecture` 中 reusable runtime API 面的归纳。[E: packages/agent/src/index.ts:3] [E: packages/agent/src/index.ts:3] [E: packages/agent/src/index.ts:5] [E: packages/agent/src/index.ts:5] [E: packages/agent/src/index.ts:6] [E: packages/agent/src/index.ts:15] [E: packages/agent/src/index.ts:30] [E: packages/agent/src/index.ts:31] [E: packages/agent/src/index.ts:32] [E: packages/agent/src/index.ts:34] [E: packages/agent/src/index.ts:38] [E: packages/agent/src/index.ts:39] [E: packages/agent/src/index.ts:42] [E: packages/agent/src/index.ts:43] [E: packages/agent/src/index.ts:44] [E: packages/agent/src/index.ts:46] [E: packages/agent/src/index.ts:50] [I]

`pi-coding-agent` 的 public entrypoint 导出 CLI args/config paths、`AgentSession`、auth storage、compaction bridge、event bus、extension API/types, `convertToLlm`、`ModelRegistry`、package/resource loading、SDK factories 和 tool factory helpers；把这些视为产品层(product assembly) API 面是基于 entrypoint 与 package description 的归纳。[E: packages/coding-agent/src/index.ts:3] [E: packages/coding-agent/src/index.ts:6] [E: packages/coding-agent/src/index.ts:15] [E: packages/coding-agent/src/index.ts:28] [E: packages/coding-agent/src/index.ts:28] [E: packages/coding-agent/src/index.ts:51] [E: packages/coding-agent/src/index.ts:53] [E: packages/coding-agent/src/index.ts:149] [E: packages/coding-agent/src/index.ts:167] [E: packages/coding-agent/src/index.ts:168] [E: packages/coding-agent/src/index.ts:177] [E: packages/coding-agent/src/index.ts:184] [E: packages/coding-agent/src/index.ts:186] [E: packages/coding-agent/src/index.ts:197] [E: packages/coding-agent/src/index.ts:201] [E: packages/coding-agent/src/index.ts:210] [I]

`pi-tui` 的 public entrypoint 导出 UI components、autocomplete、fuzzy matching、keybindings、keyboard parsing、stdin buffer、terminal abstraction、terminal colors/images、`TUI` container primitives 和 text utilities。[E: packages/tui/src/index.ts:4] [E: packages/tui/src/index.ts:12] [E: packages/tui/src/index.ts:14] [E: packages/tui/src/index.ts:18] [E: packages/tui/src/index.ts:33] [E: packages/tui/src/index.ts:35] [E: packages/tui/src/index.ts:48] [E: packages/tui/src/index.ts:61] [E: packages/tui/src/index.ts:63] [E: packages/tui/src/index.ts:65] [E: packages/tui/src/index.ts:72] [E: packages/tui/src/index.ts:99] [E: packages/tui/src/index.ts:114]

`pi-server` 的 runtime model 可归纳为 experimental instance orchestration：`serve()` creates an IPC server, recovers supervisor state, optionally starts Radius presence, logs the socket path, and shuts down supervisor/Radius/socket on signals; `ServerSupervisor` tracks live instances, opens RPC streams, spawns/stops instances, refreshes session metadata, and persists/removes instance records.[E: packages/server/README.md:3] [E: packages/server/src/serve.ts:9] [E: packages/server/src/serve.ts:12] [E: packages/server/src/serve.ts:19] [E: packages/server/src/serve.ts:20] [E: packages/server/src/serve.ts:21] [E: packages/server/src/serve.ts:37] [E: packages/server/src/serve.ts:47] [E: packages/server/src/serve.ts:48] [E: packages/server/src/serve.ts:49] [E: packages/server/src/serve.ts:59] [E: packages/server/src/serve.ts:62] [E: packages/server/src/supervisor.ts:63] [E: packages/server/src/supervisor.ts:64] [E: packages/server/src/supervisor.ts:72] [E: packages/server/src/supervisor.ts:87] [E: packages/server/src/supervisor.ts:197] [E: packages/server/src/supervisor.ts:270] [E: packages/server/src/supervisor.ts:300] [E: packages/server/src/supervisor.ts:316] [E: packages/server/src/supervisor.ts:321] [E: packages/server/src/supervisor.ts:328] [E: packages/server/src/supervisor.ts:329] [E: packages/server/src/supervisor.ts:330] [I]

`pi-storage-sqlite-node` 是 agent-core session interfaces 的可选 Node backend；`pi-evals` 是不发布的行为评测消费者。它们分别由独立 T2 节点展开。[E: packages/storage/sqlite-node/package.json:4] [E: packages/evals/package.json:4] [I]

根 workspace glob 除七个核心 package 外，还显式列出五个 coding-agent extension examples；这些 example package 都是仓内示例，不属于本表的核心运行时目录。[E: package.json:5] [E: package.json:8] [E: package.json:9] [E: package.json:10] [E: package.json:11] [E: package.json:12]

根 `scripts/publish.mjs` 的发布清单只有 `pi-ai`、`pi-agent-core`、`pi-storage-sqlite-node`、`pi-tui` 与 `pi-coding-agent` 五包；`pi-server` 的 manifest 没有 `private` flag，但当前不在该 pipeline [I]，`pi-evals` 则明确是 private。[E: scripts/publish.mjs:7] [E: scripts/publish.mjs:8] [E: scripts/publish.mjs:9] [E: scripts/publish.mjs:10] [E: scripts/publish.mjs:11] [E: scripts/publish.mjs:12] [E: packages/server/package.json:2] [E: packages/evals/package.json:4]

## Monorepo 工具链

根 `package.json` 是 npm workspace monorepo：workspace 包括 `packages/*`、`packages/storage/*` 和若干 coding-agent extension examples。[E: package.json:5] [E: package.json:7] [E: package.json:9] [E: package.json:12]

根 build script 依序构建 TUI、AI、Agent、SQLite storage、coding-agent、server；private evals 不在这条根 build 链上。[E: package.json:16] [E: packages/evals/package.json:4] [I]

根 check script 会运行 Biome 写入式检查、pinned deps 检查、TypeScript import 检查、shrinkwrap 检查、coding-agent install lock 检查、`tsgo --noEmit` 和 browser smoke check。[E: package.json:18] 单独脚本名显示 pinned deps、shrinkwrap、coding-agent install lock、relative import 和 browser smoke 都有独立 checker。[E: package.json:19] [E: package.json:20] [E: package.json:21] [E: package.json:22] [E: package.json:23]

根 test script 先运行 `test:scripts`，再运行 `npm run test --workspaces --if-present`；README 的 development section 还把 `./test.sh` 说明为运行测试、在没有 API keys 时跳过 LLM-dependent tests。[E: package.json:33] [E: package.json:34] [E: README.md:58]

根 release/publish 脚本包括 workspace version bump、`sync-versions.js`、lockfile-only install、`prepublishOnly`、publish dry-run/local release 和 release notes fix；这些脚本都位于根 `package.json`。[E: package.json:29] [E: package.json:36] [E: package.json:37] [E: package.json:38] [E: package.json:39] [E: package.json:40] [E: package.json:41] [E: package.json:42] [E: package.json:45] [E: package.json:46] [E: package.json:47] [E: package.json:48]

根 dev toolchain 固定在 Node `>=22.19.0`，devDependencies 包括 Biome、TypeScript native preview `tsgo`、TypeScript、esbuild、tsx、jiti、shx 和 Husky。[E: package.json:53] [E: package.json:55] [E: package.json:56] [E: package.json:57] [E: package.json:58] [E: package.json:59] [E: package.json:60] [E: package.json:61] [E: package.json:64]

`biome.json` 启用 recommended linter，显式调整 `noNonNullAssertion`、`useConst`、`useNodejsImportProtocol`、`noExplicitAny`、`noControlCharactersInRegex`、`noEmptyInterface`；formatter 使用 tabs、indent width 3、line width 120。[E: biome.json:4] [E: biome.json:6] [E: biome.json:8] [E: biome.json:9] [E: biome.json:10] [E: biome.json:13] [E: biome.json:14] [E: biome.json:15] [E: biome.json:22] [E: biome.json:23] [E: biome.json:24]

Biome file includes 覆盖 `packages/*/src/**/*.ts`、`packages/*/test/**/*.ts` 和 coding-agent examples，同时排除 `node_modules`、`test-sessions.ts`、generated model files 和 `packages/mom/data`。[E: biome.json:28] [E: biome.json:29] [E: biome.json:32] [E: biome.json:33] [E: biome.json:34] [E: biome.json:35] [E: biome.json:36] [E: biome.json:37]

`tsconfig.base.json` 统一 TypeScript baseline：target/lib 是 ES2022，module/moduleResolution 是 Node16，strict 开启，生成 declarations/declarationMap/sourceMap/inlineSources，并启用 `erasableSyntaxOnly`、`allowImportingTsExtensions`、`rewriteRelativeImportExtensions`、decorator metadata 和 Node types。[E: tsconfig.base.json:3] [E: tsconfig.base.json:4] [E: tsconfig.base.json:5] [E: tsconfig.base.json:6] [E: tsconfig.base.json:7] [E: tsconfig.base.json:11] [E: tsconfig.base.json:12] [E: tsconfig.base.json:13] [E: tsconfig.base.json:14] [E: tsconfig.base.json:16] [E: tsconfig.base.json:18] [E: tsconfig.base.json:19] [E: tsconfig.base.json:20] [E: tsconfig.base.json:21] [E: tsconfig.base.json:23]

README 的 supply-chain hardening section 明确把 npm dependency changes 当作 reviewed code changes，并列出 exact direct dependencies、`.npmrc` min-release-age、`package-lock.json` as dependency ground truth、`npm run check` 验证项、published CLI shrinkwrap、release smoke tests、`--ignore-scripts` 和 npm audit/signature workflow 等策略。[E: README.md:75] [E: README.md:77] [E: README.md:79] [E: README.md:80] [E: README.md:81] [E: README.md:82] [E: README.md:83] [E: README.md:84] [E: README.md:85] [E: README.md:86] [E: README.md:87]

## 跨包关系

`spine.layered-architecture` 应使用本 catalog 的 package metadata 来解释依赖方向：AI → agent-core → optional SQLite backend/product coding-agent；TUI 服务交互产品，server 依赖 coding-agent，evals 是 private test consumer。[I]

`spine.overview` 应使用本 catalog 的 package metadata 来放置端到端主路径：CLI 产品入口和 sessions/tools 属于 `pi-coding-agent`，agent loop 属于 `pi-agent-core`，provider streaming 属于 `pi-ai`，interactive rendering 借 `pi-tui`，server 则在包索引层标注为实验性外壳而不是主 README package table 的一员。[E: README.md:26] [E: README.md:30] [E: README.md:31] [E: README.md:32] [E: README.md:33] [E: packages/server/package.json:4] [I]

## Sources

- package.json
- README.md
- biome.json
- tsconfig.base.json
- packages/ai/package.json
- packages/ai/src/index.ts
- packages/agent/package.json
- packages/agent/src/index.ts
- packages/coding-agent/package.json
- packages/coding-agent/src/index.ts
- packages/tui/package.json
- packages/tui/src/index.ts
- packages/server/package.json
- packages/server/README.md
- packages/server/src/index.ts
- packages/server/src/config.ts
- packages/server/src/handler.ts
- packages/server/src/rpc-process.ts
- packages/server/src/serve.ts
- packages/server/src/supervisor.ts
- packages/server/src/types.ts
- packages/storage/sqlite-node/package.json
- packages/storage/sqlite-node/src/index.ts
- packages/evals/package.json
- packages/evals/src/pi-harness.ts

## 相关

- [spine.layered-architecture](../spine/layered-architecture.md) - 分层架构与 package boundary。
- [spine.overview](../spine/overview.md) - 从 CLI 到 runtime/provider 的端到端主路径。
