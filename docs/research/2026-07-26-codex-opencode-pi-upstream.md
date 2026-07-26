# Codex / OpenCode / Pi 上游更新核验（2026-07-26）

> 观察时刻：**2026-07-26T15:42:37Z**。  
> 范围：只核对官方 GitHub 仓库、commit、compare、release/tag、仓内 changelog / 文档；未采用二手报道。  
> 目的：回答三个 submodule 是否有新代码、最新可复现钉点是什么、LLM Wiki 应优先更新什么。默认分支会继续移动，执行更新时应再次读取远端 HEAD，并把最终 full SHA 写入调度记录。

## 结论

三个项目都有比 Wiki 当前钉点更新的代码，而且三个目标 HEAD 都是现有钉点的后代，可以按默认分支做 fast-forward 式 submodule 更新：

| 项目 | 官方项目 / 默认分支 | Wiki 当前钉点 | 观察到的上游 HEAD | 相对 Wiki | 最新稳定版 |
|---|---|---|---|---:|---|
| Codex | [`openai/codex`](https://github.com/openai/codex) / `main` | `4d7a5c7c7394b687ebcb67e634528b2b8c5578d9` | [`61a44880a85d2fd0d8770908dea5733495e571c8`](https://github.com/openai/codex/commit/61a44880a85d2fd0d8770908dea5733495e571c8) | +275 commits | [`rust-v0.145.0`](https://github.com/openai/codex/releases/tag/rust-v0.145.0) |
| OpenCode | [`anomalyco/opencode`](https://github.com/anomalyco/opencode) / `dev` | `67caf894e0843ee370e72839e8265e483233479b` | [`7534d23551f665e65080809975b4ca5c7d63807b`](https://github.com/anomalyco/opencode/commit/7534d23551f665e65080809975b4ca5c7d63807b) | +101 commits | [`v1.18.5`](https://github.com/anomalyco/opencode/releases/tag/v1.18.5) |
| Pi | [`earendil-works/pi`](https://github.com/earendil-works/pi) / `main` | `3da591ab74ab9ab407e72ed882600b2c851fae21` | [`5bc1c2c0a6f07e00e8c240304182f213ab8d311f`](https://github.com/earendil-works/pi/commit/5bc1c2c0a6f07e00e8c240304182f213ab8d311f) | +123 commits | [`v0.82.1`](https://github.com/earendil-works/pi/releases/tag/v0.82.1) |

官方 compare：

- [Codex `4d7a5c7c…61a44880`](https://github.com/openai/codex/compare/4d7a5c7c7394b687ebcb67e634528b2b8c5578d9...61a44880a85d2fd0d8770908dea5733495e571c8)：1,344 files，78,779 insertions，29,945 deletions。
- [OpenCode `67caf894…7534d235`](https://github.com/anomalyco/opencode/compare/67caf894e0843ee370e72839e8265e483233479b...7534d23551f665e65080809975b4ca5c7d63807b)：269 files，15,539 insertions，4,516 deletions。
- [Pi `3da591ab…5bc1c2c0`](https://github.com/earendil-works/pi/compare/3da591ab74ab9ab407e72ed882600b2c851fae21...5bc1c2c0a6f07e00e8c240304182f213ab8d311f)：390 files，17,262 insertions，7,352 deletions。

## 本地 Wiki 影响扫描

扫描方法：把各 `index.json` 的 `nodes[].source[]` 与官方 compare 的文件集合做精确路径匹配；“结构性失效”表示该 source 路径在目标 commit 已不存在。它只能找出已登记 source 的变化，不能代替新增目录/接口扫描。

| Wiki | 节点数 | 至少一个 source 改动 | 目标 HEAD 不存在的 source 所影响节点 |
|---|---:|---:|---:|
| [Codex index](../llm-wiki/codex/index.json) | 172 | 156 | 3 |
| [OpenCode index](../llm-wiki/opencode/index.json) | 186 | 27 | 0 |
| [Pi index](../llm-wiki/pi/index.json) | 180 | 124 | 12 |

这说明 OpenCode 主要是局部 app/provider 增量；Codex 与 Pi 都需要结构性复核，不能只批量改 `updated` 和证据行号。

## Codex

### 身份、版本与钉点

- 官方仓库是 [`openai/codex`](https://github.com/openai/codex)，默认分支 `main`；观察到的 HEAD 是 [`61a44880a8`](https://github.com/openai/codex/commit/61a44880a85d2fd0d8770908dea5733495e571c8)，committer 时间 `2026-07-26T01:23:38Z`。
- 最新稳定版是 [`0.145.0`](https://github.com/openai/codex/releases/tag/rust-v0.145.0)，发布于 `2026-07-21T18:21:04Z`，tag commit `25af12f7e61572b0bc18ddb1008be543b91519b0`。
- 最新有 GitHub release 记录的 prerelease 是 [`0.146.0-alpha.10.1`](https://github.com/openai/codex/releases/tag/rust-v0.146.0-alpha.10.1)，发布于 `2026-07-25T20:29:03Z`，tag commit `222cbe4fb883dc35bd0c699ae8e9063b5a0ee94b`；不能把它写成稳定版。仓库另有更高编号的 `rust-v0.146.0-alpha.11` tag，但观察时没有对应 GitHub Release 记录。
- 当前 HEAD 单笔提交只把 MCP server Rust recursion limit 提到 256，并补一个 thread-fork fixture 字段；版本主题应取整个 compare / release notes，不应由 HEAD 标题代替。[来源](https://github.com/openai/codex/commit/61a44880a85d2fd0d8770908dea5733495e571c8)

### 上游新增主题

`0.145.0` 官方 release notes 已归纳出本轮最重要的产品/架构变化：

- experimental paginated thread history：高效 resume/search、持久化名称、sub-agent 与 memories；
- `/import` 扩展到 Cursor / Claude Code 的设置、MCP、plugins、sessions、commands 与 project memories；
- Amazon Bedrock login、自定义 endpoint/auth 与默认模型变化；
- audio input/tool output、realtime V3；
- multi-agent V2 标为 stable，并支持 sub-agent model / reasoning / concurrency / roles；
- TUI inline visualization link；
- prompt edit / safety retry 改为保留上下文的 conversation branch；
- MCP startup/auth/cache、Windows exec-server sandbox、approval/safety 与 TUI streaming 性能大改。

这些都是 [官方 `0.145.0` release notes](https://github.com/openai/codex/releases/tag/rust-v0.145.0) 的明确声明。

稳定版之后，默认分支还继续加入了：

- route-aware / policy-aware HTTP client pool：[route-aware pool commit](https://github.com/openai/codex/commit/9078e3237165a5378cfbf7637223222774a22a30)、[policy-aware builder commit](https://github.com/openai/codex/commit/adb143a2919ae77eaba55c2150685e489168be38)；
- MCP connection 生命周期集中到 `McpRuntime`：[commit](https://github.com/openai/codex/commit/e497325a6a1743cfadeee41a6b5f05ebf7fd0221)；
- paginated thread fork、pinning、single-writer 与增量 replay：[fork](https://github.com/openai/codex/commit/05f000263b2b2528cc9ca2a100270da9c6bf2fed)、[pinning](https://github.com/openai/codex/commit/400ee190c30d5e4a88549c070a2335311f0baa91)、[single-writer](https://github.com/openai/codex/commit/5c94796dc9be7c17cb78fbef0a42eb609d50df1c)、[incremental replay](https://github.com/openai/codex/commit/b834702b273948c5a0767eddfd64f893b9c0b3d2)；
- remote code-mode WebSocket host：[commit](https://github.com/openai/codex/commit/f61b51ddd924643514b33234816a8a2772b1aec7)；
- Agent Plugins manifest：[commit](https://github.com/openai/codex/commit/a28374e0dbb4119659fb68f8c73de48e01838a5e)；
- exec-server network-policy callback：[commit](https://github.com/openai/codex/commit/32f4687b8c43fb4062405106e761f85983aa96cc)。

### Wiki 结构性断点与建议

1. **先移除/标记 retired 的两个 CSV agent-job 工具节点。** `spawn_agents_on_csv` 与 `report_agent_job_result` 连同 handler/state 已删除；官方删除提交是 [`687f05cb`](https://github.com/openai/codex/commit/687f05cb946d10c96f90dd7ce82e11465c6e20a7)。受影响节点：
   - `tool.spawn-agents-on-csv`
   - `tool.report-agent-job-result`
2. **修 `subsys.providers.http-client` 的 source。** `codex-rs/http-client/src/default_client.rs` 已改为 `codex-rs/http-client/src/client.rs`，同时新增 client builder 与 route-aware pool；不能只机械改行号。[目标树](https://github.com/openai/codex/tree/61a44880a85d2fd0d8770908dea5733495e571c8/codex-rs/http-client)
3. **更新 crate index / README 数字。** `codex-rs` workspace members 从 124 变为 **126**，新增 `ext/git-attribution` 与 `exec-server/tests/support`。[目标 `Cargo.toml`](https://github.com/openai/codex/blob/61a44880a85d2fd0d8770908dea5733495e571c8/codex-rs/Cargo.toml)
4. **按高风险主题重读而非只改锚点。** 优先覆盖：
   - `subsys.core.thread-store`、`subsys.core.rollout-persistence`、`rpc.thread-methods`；
   - `surface.cli.external-agent-import`；
   - `subsys.core.realtime-conversation`、`ref.data-model`、`tool.dynamic-tools`；
   - multi-agent / collaboration / agent tools；
   - `subsys.mcp.*`、`spine.trace-mcp-call`；
   - `subsys.providers.http-client`、`subsys.platform.network-proxy`；
   - code-mode、plugins/extensions、Windows sandbox、TUI streaming/visualization。
5. **刷新所有协议生成物相关 catalog。** app-server v2 schema、thread/turn notifications、audio/item metadata 和 pin/archive/fork 语义都有变化；不能把旧 JSON-RPC 表只做行号更新。[完整 compare](https://github.com/openai/codex/compare/4d7a5c7c7394b687ebcb67e634528b2b8c5578d9...61a44880a85d2fd0d8770908dea5733495e571c8)

## OpenCode

### 身份、版本与钉点

- 官方仓库是 [`anomalyco/opencode`](https://github.com/anomalyco/opencode)，默认分支 `dev`；观察到的 HEAD 是 [`7534d23551`](https://github.com/anomalyco/opencode/commit/7534d23551f665e65080809975b4ca5c7d63807b)，commit 时间 `2026-07-25T08:21:12Z`。
- 最新稳定版是 [`v1.18.5`](https://github.com/anomalyco/opencode/releases/tag/v1.18.5)，发布于 `2026-07-24T22:18:16Z`，tag commit `e5cc278dec9294a627a7b05f47ce6a564408c1a2`。
- 当前 HEAD 单笔提交只是更新 Nix `node_modules` hashes；核心变化位于此前 100 个提交中。[HEAD](https://github.com/anomalyco/opencode/commit/7534d23551f665e65080809975b4ca5c7d63807b)

### 上游新增主题

- [`v1.18.4`](https://github.com/anomalyco/opencode/releases/tag/v1.18.4)：Kimi adaptive thinking、provider reasoning/timeout/Azure 修复，以及 desktop prompt input、review panel、terminal theme。
- [`v1.18.5`](https://github.com/anomalyco/opencode/releases/tag/v1.18.5)：Claude adaptive thinking、OpenAI Responses phase、Mistral reasoning history/cache、SDK-specific cache keys、MiniMax M3 variant；desktop/app 增加 current-server terminal/review/discovery/session/timeline/event transport，并同时识别 legacy/current server。
- 稳定版之后还有 V1 provider auth 与 MCP state refresh：[provider refresh](https://github.com/anomalyco/opencode/commit/9e8b2171a5ed52651d98f45cda022bdefa71b724)、[MCP refresh](https://github.com/anomalyco/opencode/commit/2b2b69d668ed05836ea6d3fa7f42d416bdb61806)。
- 新的 app migration checklist 明确写出 app 当前是 hybrid，并逐项列出 legacy unprefixed API 到 current `/api/*` 的迁移状态；“legacy/current server”不能未经源码核验直接等同 Wiki 现有的“V1/V2 core”。[官方 migration checklist](https://github.com/anomalyco/opencode/blob/7534d23551f665e65080809975b4ca5c7d63807b/packages/app/V1_API_MIGRATION.md)

### Wiki 建议

1. **没有已登记 source 的结构性失效**，但 27 个节点命中改动；最重的是 `clients.app`，其次是 provider transforms/reasoning 表。
2. **重写 app/desktop 的双协议叙述。** 以 `packages/app/V1_API_MIGRATION.md`、`server-compat.ts`、`server-session.ts`、`server-session-v2-reducer.ts` 为新证据源；更新 `clients.app`、`clients.desktop`、session timeline、event transport、PTY/review 与 `spine.v1-v2-relationship`。[目标 app tree](https://github.com/anomalyco/opencode/tree/7534d23551f665e65080809975b4ca5c7d63807b/packages/app)
3. **复核 provider 变换与 reasoning catalog。** 更新 Claude/Kimi adaptive thinking、Mistral reasoning/cache、MiniMax variants、OpenAI Responses phase 与 SDK cache key 规则；对应 `provider.resolution`、`model-layer.provider-transforms`、`model-layer.copilot`、`ref.reasoning-variant-tables`。[`v1.18.5` notes](https://github.com/anomalyco/opencode/releases/tag/v1.18.5)
4. **更新 `tool.grep` 的 symlink 路径语义**，并复核 auth 后 provider refresh、MCP refresh 的 app 状态投影。[grep fix](https://github.com/anomalyco/opencode/commit/f51665191a8bbeb5edeb3bc7152d34617fb7422f)
5. Workspace package 集合仍是 36 个，没有本轮新增/删除 package；包索引只需核内容与 SHA，不需要改总数。[目标 root `package.json`](https://github.com/anomalyco/opencode/blob/7534d23551f665e65080809975b4ca5c7d63807b/package.json)

## Pi

### 身份、版本与钉点

- 官方仓库是 [`earendil-works/pi`](https://github.com/earendil-works/pi)，官方 README 称项目为 **Pi Agent Harness**，默认分支 `main`。[README](https://github.com/earendil-works/pi/blob/5bc1c2c0a6f07e00e8c240304182f213ab8d311f/README.md)
- 观察到的 HEAD 是 [`5bc1c2c0a6`](https://github.com/earendil-works/pi/commit/5bc1c2c0a6f07e00e8c240304182f213ab8d311f)，时间 `2026-07-25T12:37:15Z`。
- 最新稳定版是 [`v0.82.1`](https://github.com/earendil-works/pi/releases/tag/v0.82.1)，发布于 `2026-07-25T12:47:23Z`，tag commit `b4f293684bba718d59cc1157679bcf6157b3a7f5`。HEAD 只比该 tag 多一个“为下一轮新增 `[Unreleased]` 段”的提交，目前没有比 `0.82.1` 更新的已发布功能版。

### 上游新增主题

- [`v0.81.0`](https://github.com/earendil-works/pi/releases/tag/v0.81.0)：完整 provider extensions、Qwen Token Plan、usage accounting、thinking-level RPC；llama.cpp 本轮后续又增加下载/上下文/持久化修复。
- [`v0.81.1`](https://github.com/earendil-works/pi/releases/tag/v0.81.1)：可验证 release source archive、compaction / branch-summary retry lifecycle。
- [`v0.82.0`](https://github.com/earendil-works/pi/releases/tag/v0.82.0)：strict JSON Schema / Lark / regex constrained tool sampling、OpenRouter/Kimi OAuth、bash session metadata、RPC bash streaming events。
- [`v0.82.1`](https://github.com/earendil-works/pi/releases/tag/v0.82.1)：Claude Opus 5、Anthropic bearer auth、ETag model catalog、llama catalog persistence、custom renderer `outputPad`。

比 release 摘要更重要的源码结构变化：

- `packages/orchestrator` 改名为 `packages/server`，npm package 变为 `@earendil-works/pi-server`；这是官方 [`8495f9d0` rename commit](https://github.com/earendil-works/pi/commit/8495f9d0d6407d4ec94e16a685df70740335dd29)。
- 新增可发布的 `@earendil-works/pi-storage-sqlite-node`，为 agent-core session 提供 `node:sqlite` adapter、migration、session repo 与 materialized view；见 [SQLite commit](https://github.com/earendil-works/pi/commit/9e7582aa03e54f410fa9688197a3b64514e93400) 和 [package README](https://github.com/earendil-works/pi/blob/5bc1c2c0a6f07e00e8c240304182f213ab8d311f/packages/storage/sqlite-node/README.md)。
- 新增 private `@earendil-works/pi-evals` Vitest eval harness；见 [eval commit](https://github.com/earendil-works/pi/commit/eafe11fb94fe7fcb89487da621a578278a6a67f1) 和 [README](https://github.com/earendil-works/pi/blob/5bc1c2c0a6f07e00e8c240304182f213ab8d311f/packages/evals/README.md)。
- AgentHarness 增加 execution tools；见 [commit](https://github.com/earendil-works/pi/commit/37eb243d2644976e97f69fd6ec4726b7dbef89b4)。

目标 `package.json` 的 workspace globs 现在展开为 **7 个 package**：6 个非 private package（`ai`、`agent`、`coding-agent`、`tui`、`server`、`storage/sqlite-node`）加 1 个 private `evals`。因此 Wiki 当前“5-package monorepo”已失效；同时官方 root README 的 “All Packages” 只列四个核心产品包，Wiki 应明确“workspace package”与“README 主推 package”的口径差异。[目标 root `package.json`](https://github.com/earendil-works/pi/blob/5bc1c2c0a6f07e00e8c240304182f213ab8d311f/package.json)

### Wiki 结构性断点与建议

1. **先处理 `orchestrator` → `server`。** 11 个节点仍引用已不存在的 `packages/orchestrator/**`：
   - `ref.orchestrator.instance-status`
   - `ref.orchestrator.ipc-messages`
   - `ref.package-index`
   - `subsys.orchestrator.config`
   - `subsys.orchestrator.ipc-transport`
   - `subsys.orchestrator.message-protocol`
   - `subsys.orchestrator.radius`
   - `subsys.orchestrator.request-handler`
   - `subsys.orchestrator.rpc-spawner`
   - `subsys.orchestrator.storage`
   - `subsys.orchestrator.supervisor`

   source 基本可机械迁到 `packages/server/**`，但节点 title/id、frontmatter `pkg` 枚举、`conventions.md`、`index.json.packages` 和 README 架构图都应重新决定是否同步改名；不能只改路径。
2. **修 `subsys.agent-core.session-tree`。** `packages/agent/src/harness/session/uuid.ts` 被删除，UUIDv7 实现移动并共享为 `packages/ai/src/utils/uuid.ts`；见 [`d2f8dafb`](https://github.com/earendil-works/pi/commit/d2f8dafb0f07409758797c880fbc3d526fa7c5c6)。
3. **新增 SQLite storage 覆盖。** 建议建立独立 package/subsystem 节点，或至少扩展 `subsys.agent-core.session-storage`、`session-tree`、`compaction`、`ref.session-entry-types` 与 package index；SQLite schema、migration、branch entries、sequences、materialized session 都是新 ground truth。[目标 storage tree](https://github.com/earendil-works/pi/tree/5bc1c2c0a6f07e00e8c240304182f213ab8d311f/packages/storage/sqlite-node)
4. **决定是否收录 private eval harness。** 若 Wiki 维持“全 monorepo 同深度”，`packages/evals` 需要新节点；若只覆盖 runtime，应在更新记录明确排除。
5. **重读 API/catalog 节点。** 优先更新 constrained tool sampling/capability flags、OpenRouter/Kimi OAuth、Anthropic bearer auth、Claude Opus 5、provider retry、model catalog ETag/persistence、RPC bash events、bash session env、compaction retry lifecycle、usage accounting 与 renderer `outputPad`。[`0.82.0`](https://github.com/earendil-works/pi/releases/tag/v0.82.0)、[`0.82.1`](https://github.com/earendil-works/pi/releases/tag/v0.82.1)
6. **更新项目画像。** README、`spine.overview`、`spine.layered-architecture`、`ref.package-index` 目前的 5-package / orchestrator 叙述必须改为新的 package topology；再对 124 个 source 命中节点重落证据行号。[完整 compare](https://github.com/earendil-works/pi/compare/3da591ab74ab9ab407e72ed882600b2c851fae21...5bc1c2c0a6f07e00e8c240304182f213ab8d311f)

## 建议执行顺序

1. 再次读取三个默认分支 HEAD；若仍与本记录一致，钉住上表 full SHA，并更新三个 submodule gitlink。
2. Pi：先做 package topology / rename / SQLite / evals，再更新 API 与 catalog 节点。
3. Codex：先删退役工具、修 HTTP client source 与 crate index，再按 thread-store、MCP、multi-agent、protocol、code-mode、plugins、sandbox/TUI 分批。
4. OpenCode：先以 `V1_API_MIGRATION.md` 重写 app 双协议边界，再更新 provider transforms 与少量工具/infra 漂移。
5. 每个 Wiki 单独 reconcile + lint；最终把 `index.json.updated`、所有已复核节点 `updated` 与 submodule full SHA 对齐。

