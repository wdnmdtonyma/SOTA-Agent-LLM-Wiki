# Pi wiki 增量刷新令（853a80d26c → 9767ba275f）

给 filler 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径重映射、架构事实和文件纪律。

本轮 **不跑逐节点独立 L2**。filler 自己核 `[E:]`（每页至少抽 3 条 `read_file` 对行），写完将 `status: verified`。过宽结论宁可降 `[I]/[U]`。

## 冻结点

- **base**（上一轮 verified）: `853a80d26c`（`v0.84.4` 周期末）
- **target**（必须对照的源码 HEAD）: `9767ba275f`（全 SHA `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`；官方 `origin/main`；覆盖 **v0.85.0 / v0.85.1** + 若干 Unreleased）
- 源码根: `pi/`（相对本 wiki `../../../pi/`）
- 节点 `updated:` 一律写成 `9767ba275f`
- 未安装上游 `node_modules`，不要宣称 runtime tests 通过。

## 路径重映射（frontmatter `source:` 与 `[E:]` 必须改到右边）

| 旧路径 | 新路径 / 处理 |
|---|---|
| `packages/ai/src/api/cloudflare-gateway-binding.ts` | `packages/ai/src/api/cloudflare-ai-binding.ts`。符号 `createGatewayBindingFetch` → **`createAiBindingFetch`**。节点 id 仍是 `subsys.ai.cloudflare-gateway-binding`，就地改写，不要改文件名 |
| `packages/ai/test/cloudflare-gateway-binding.test.ts` | `packages/ai/test/cloudflare-ai-binding.test.ts` |
| `packages/agent/src/harness/session/jsonl.ts` | `packages/agent/src/harness/session/jsonl/index.ts`（再加 `jsonl/repo.ts` / `jsonl/types.ts` / `jsonl/codec.ts`） |
| `packages/agent/src/harness/session/jsonl/errors.ts` | **已删除**。错误类型改读 `session.ts` / `jsonl/repo.ts` / `result.ts` |
| `packages/agent/src/harness/session/state.ts` | **已删除**。会话值改读 `packages/agent/src/harness/session/values.ts`；内存态改读 `in-memory-storage-state.ts` |
| `packages/agent/src/harness/reducer.ts` | `packages/agent/src/harness/runtime/reducer.ts`（导出 `reduceLaneSnapshot`） |
| `packages/agent/src/search/scanning.ts` | **已删除**。只剩 `packages/agent/src/search/index.ts` 的 `SessionSearchService` 接口 |
| `packages/agent/docs/search.md` | **已删除** |
| `packages/agent/test/harness/session/search.test.ts` | **已删除**。改读仍存在的 harness 测试 |
| `packages/session-backends/sqlite-node/src/sqlite/search-backend.ts` | **已删除** |
| `packages/session-backends/sqlite-node/src/sqlite/storage/*.ts` | 重写成 `packages/session-backends/sqlite-node/src/sqlite/storage.ts` + `sqlite/session.ts` + `sqlite/session/*` |
| `packages/coding-agent/src/server/create-harness.ts` | **已删除**。不要再引 |
| `packages/coding-agent/test/experimental-tool-strict-mode.test.ts` | `packages/coding-agent/test/builtin-tool-strict-mode.test.ts` |
| `packages/coding-agent/src/client/remote-session.ts` | **已删除**。`packages/coding-agent/src/client/index.ts` 现为 `export * from "@earendil-works/pi-client"` |
| `packages/coding-agent/src/client/transcript.ts` | **已删除** |
| `packages/client/src/session-handle.ts` | **已删除** |
| `packages/client/src/state.ts` | **已删除** |
| `packages/client/test/{connection,disposal,requests,sessions,state}.test.ts` | **已删除**。改读 `packages/client/src/{client,connection,types}.ts` |
| `packages/coding-agent/src/cli/experimental/auth.ts` | **已删除** |
| `packages/coding-agent/src/cli/experimental/transport-address.ts` | **已删除** |
| `packages/coding-agent/src/cli/experimental/commands/pi.ts` | **已删除**。experimental CLI 只剩 `server` / `client` |
| `packages/protocol/src/schemas.ts` | `packages/protocol/src/protocol.ts` |
| `packages/server/src/protocol.ts` | **已删除**。协议类型在 `packages/protocol/src/protocol.ts` |
| `packages/server/src/sessions.ts` / `snapshots.ts` | **已删除**。改读 `packages/server/src/session-router.ts` + `server.ts` |
| `packages/server/src/testing/service.ts` | `packages/server/src/testing/host.ts`（或 `testing/server.ts` / `testing/index.ts`） |

找不到替换文件就从 `source:` 删掉该条。禁止把 `[E:]` 指到已删除路径。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **产品版本 `0.85.1`**，wiki target SHA `9767ba275f`。changelog 还覆盖 v0.85.0 与一小段 Unreleased。
2. **新 workspace 包 `@earendil-works/chord`**：application-composition runtime（facets / services / replicated state / delta / remote service boundary）。**不依赖任何其它 Pi workspace 包**。根 `package.json` 的 `build` 顺序现在是 **chord → tui → telemetry → ai → agent → sqlite-node → protocol → client → server → coding-agent**。
3. **`pi-client` 不再是 `PiClient` / `PiSessionHandle` session lease API**。现行公开面是 Chord 风格的 `Client` + `createClientServiceTransport`（`packages/client/src/client.ts` / `index.ts`）。`session-handle.ts` / `state.ts` 已删除。
4. **`pi-coding-agent/client` 只 re-export `@earendil-works/pi-client`**。旧 `RemoteSession` / transcript 实现已删除。`surface.sdk.remote-session` **保留 id**，改写成退役 + 指向 `subsys.client.remote-session-client`。
5. **experimental CLI 只剩 `server` / `client`**（`packages/coding-agent/src/cli/experimental/cli.ts`）。`pi` / `auth` / `transport-address` 子命令已删。0.85.1 起 experimental `client` / `experimental/plugin` 与 server/client 命令是 **source-only**（走 `pi-test.sh`），不要写成 shipped npm 公共 API。
6. **`createAiBindingFetch(binding)` 是 plain binding fetch**：请求原样过 `env.AI.fetch()`，不再把 HTTPS gateway URL 翻译成 `gateway().run(...)`。sentinel 仍叫 `CLOUDFLARE_GATEWAY_BINDING_AUTH_SENTINEL`。
7. **内置 `read` / `bash` / `powershell` / `edit` / `write` 默认 `constrainedSampling: { type: "json_schema", strict: "prefer" }`**，**不再**要求 `PI_EXPERIMENTAL`。`getExperimentalToolSampling()` 已不存在；`experimental.ts` 只剩 `areExperimentalFeaturesEnabled()`。扩展可 `constrainedSampling: false`。测试锁在 `builtin-tool-strict-mode.test.ts`。
8. **`InMemorySessionRepo` 现名 `MemorySessionRepo`**（`packages/agent/src/harness/session/memory.ts`）。`JsonlSessionRepo` 仍在 `jsonl/`。`state.ts` 不存在。
9. **`AgentHarness` 仍从 `harness/agent-harness.ts` 导出 `{ create }`**，运行时实现在 `harness/runtime/harness.ts` + `runtime/drive/*` + `runtime/lane.ts`。旧顶层 `harness/reducer.ts` 不存在。
10. **会话搜索实现已抽空**：`SessionSearchService` 接口还在 `packages/agent/src/search/index.ts`，scanning 实现、`docs/search.md`、sqlite `search-backend` 都删了。`subsys.agent-core.session-search` **保留 id**，改写成接口 + 退役实现。
11. **sqlite-node 物理布局重写**：读 `sqlite/storage.ts` + `sqlite/session.ts` + `sqlite/session/*`，不要再引 `sqlite/storage/entries.ts` 那套旧文件。
12. **内置工具仍是 8 个**：`read, bash, powershell, edit, write, grep, find, ls`。`createCodingToolDefinitions` / `createReadOnlyToolDefinitions` **仍不含** powershell。
13. **slash 仍 23**（`BUILTIN_SLASH_COMMANDS`，含 `/thinking`）。**RPC 仍 33**（含 `clear_queue`）。**runtime providers 仍 40**；**`.models.ts` bucket 仍 39**。catalog 页必须从源码重数，不要抄旧标题里的数字。
14. **`ExtensionAPI.on` 具名 overload 是 36**（以 `packages/coding-agent/src/core/extensions/types.ts` 为准重数；含多行 overload `session_before_switch` / `session_before_compact` / `before_provider_request`。不要数成 33）。
15. **Radius**：登录后等 catalog discovery 再选模型；默认 `balanced`，没有则退到第一个可用 Radius 模型。
16. **GPT-6 Astra** 进入 OpenAI / OpenAI Codex catalog。**Grok Build 0.1** 已从内置 xAI catalog 删除。
17. **TUI**：`packages/tui` 不再读 coding-agent 环境变量默认；`PI_DEBUG_REDRAW` → `PI_TUI_DEBUG_REDRAW`。新增 `native-platform.ts`（剪贴板等），`native-modifiers.ts` 仍在。fullscreen 有 jump-to-end / Alt-wheel。
18. **不要**把 `packages/agent/docs/mobile-handoff/**` 或 work-package 手稿当 shipped 源。那是内部 handoff，最多 `[I]`。

## 本轮新节点（2）

| 节点 | 路径 | 判定 |
|---|---|---|
| `subsys.chord.runtime` | `subsystems/chord/runtime.md` | facets / services / host / loader；`pkg: chord` |
| `subsys.chord.delta` | `subsystems/chord/delta.md` | replicated state + delta tracking；`pkg: chord` |

不要为 experimental session-worker / chat-viewport / 单个 drive 文件另建节点。experimental worker 写进 `subsys.coding-agent.experimental-cli`。chat-viewport / tui-renderer 写进 `subsys.coding-agent.interactive-orchestration`。

## 不要退役的节点（就地改 source / 标题）

- `surface.sdk.remote-session` → 退役 `RemoteSession`，指向 `pi-client`
- `subsys.agent-core.session-search` → 接口还在，实现已删
- `subsys.ai.cloudflare-gateway-binding` → 改 `createAiBindingFetch`，保留 id
- `subsys.coding-agent.experimental-cli` → 只剩 server/client + source-only experimental 树
- `subsys.client.remote-session-client` / `session-leases` → 改 Chord `Client` 语义；leases 页不要再写 `PiSessionHandle`

## filler 纪律

只写两类文件：

1. 自己批次里的节点 `docs/llm-wiki/pi/<path>`
2. 可选 `_staging/uncertainty-update-9767ba275f-<slug>.md`

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、别人批次的节点、`pi/` 源码。

步骤：

1. 读本文件 + `conventions.md` 对应模板。
2. 读现有节点 `.md`（remap 不要写成空模板；rewrite 保留仍成立的问题列表）。
3. 用 `read_file` / `grep` 读 **target** 源码。`source:` 失效路径先按上表重映射，再 `test -f`。
4. 每个 load-bearing 论断的 `[E: path:line]` 必须落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. `status: verified`（自己核过至少 3 条 `[E:]`）或 `draft`（核不完），`updated: 9767ba275f`，`evidence: explicit`。
6. 跑 lint 时只处理带自己 `node:<path>` 的报错。`pkg: chord` 已加入 lint 白名单。

### 按批次深度

- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留。
- **remap**：禁止从零重写。删缺失 source、改 `[E:]`、改过时一句；其余不动。
- **refresh**：对照变更过的 source 修假话、重落行号，不扩写。
- **create**：按 conventions 模板从零写新文件。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 或 `packages/agent/docs/mobile-handoff/**` 当 `[E]`；冲突时跟代码。
