# Pi wiki 增量刷新令（ff72faba28 → 4c6fb7cfe8）

给 filler 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径、架构事实和文件纪律。

本轮 **不跑逐节点独立 L2**（lead 填完后再统一证伪）。filler 自己核 `[E:]`（每页至少抽 3 条 `read_file` 对行），写完将 `status: verified`。过宽结论宁可降 `[I]/[U]`。

## 冻结点

- **base**（上一轮 verified）: `ff72faba28`（`ff72faba28d10c86611863d0aaa5d3122f2d8cb0`）
- **target**（必须对照的源码 HEAD）: `4c6fb7cfe8`（全 SHA `4c6fb7cfe8c538a668726f6f8b3554098c39faee`；官方 `origin/main`；产品 **1.0.1** + `[Unreleased]`）
- 源码根: `pi/`（相对本 wiki `../../../pi/`）
- 节点 `updated:` 一律写成 `4c6fb7cfe8`
- 未安装上游 `node_modules`，不要宣称 runtime tests 通过。
- **不要**把 `packages/durable/docs/pico*`、`packages/agent/docs/pico*`、`packages/agent/docs/work-packages/**` 当 shipped 源。
- **禁止 cite**（文件已删）:
  - `packages/agent/src/harness/**`
  - `packages/session-backends/**`
  - `packages/coding-agent/src/modes/interactive/components/daxnuts.ts`
  - 任何 `shouldStopAfterTurn`、`ImagesModels`、`deferred-tools.ts`、`AgentHarness` 作为现行 API

## 退役节点（filler 不要重写这些文件；lead 已删）

见 `_UPDATE-SCOPE.md` §3 的 17 个 id。正文/related 里若仍指向它们，改成替代 id。

## 必须新增的 source / 节点

create 批次写 8 个新节点，套 `conventions.md` 对应模板。`pkg` 用 `mcp` / `codemode` / `coding-agent` / `durable`。`related` 必须指向**仍然存在**的 id。

| 节点 | 必须加入 `source:` |
|---|---|
| `subsys.mcp.client` | `packages/mcp/src/index.ts`、`client.ts`、`transports/*`、`oauth/*`、`package.json`、`README.md` |
| `subsys.codemode.runtime` | `packages/codemode/src/index.ts`、`runtime/host.ts`、`runtime/worker.ts`、`source.ts`、`types.ts`、`package.json`、`README.md` |
| `surface.mcp.overview` | `packages/coding-agent/src/extensions/mcp/index.ts`、`cli.ts`、`config.ts`、`packages/coding-agent/docs/mcp.md`（若存在） |
| `surface.codemode.overview` | `packages/coding-agent/src/extensions/codemode/`、`packages/coding-agent/docs/codemode.md`（若存在）、`settings-manager.ts` 的 `CodemodeSettings` |
| `subsys.coding-agent.mcp` | `packages/coding-agent/src/core/mcp-servers.ts`、`extensions/mcp/**`、`extensions/index.ts` |
| `subsys.coding-agent.codemode` | `packages/coding-agent/src/extensions/codemode/**`、`extensions/tool-search/**`、`extensions/index.ts` |
| `subsys.coding-agent.virtual-models` | `packages/coding-agent/src/core/virtual-models.ts`、model-registry / model-runtime 中的装配 |
| `subsys.durable.harness` | `packages/durable/src/harness/*.ts`、`packages/durable/src/tools/index.ts`、`packages/durable/src/tasks.ts`、`packages/durable/src/index.ts` |
| `spine.layered-architecture` / `ref.package-index` | 补 `packages/codemode/package.json`、`packages/mcp/package.json`；去掉 sqlite-node |
| `subsys.agent-core.compaction` | `packages/coding-agent/src/core/compaction/*`（不要 agent harness） |
| `ref.agent.agent-events` | 只留 `packages/agent/src/types.ts` 的 `AgentEvent` 10 variant |
| `ref.interactive.components` | 去掉 `daxnuts.ts` |
| `subsys.durable.runtime` | 去掉已删的 `session/publications.ts`；按现有 `packages/durable/src/**` 重列 |

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. 产品 **1.0.1**，wiki target SHA `4c6fb7cfe8`。changelog 含 0.99.0–1.0.1 与 Unreleased。
2. **13** 个 `packages/*`。build 链插入 **codemode、mcp**，删除 sqlite-node。
3. agent-core 不再是 session/harness 包。spine 必须把「可复用 harness」写成 **pi-durable**，产品会话仍是 coding-agent `SessionManager` JSONL。
4. MCP：独立 `pi-mcp` 包 + coding-agent 内置扩展。项目 `.pi/mcp.json` 可覆盖 user-level server 的 `enabled` / `exposure`。OAuth 可 `cimd` / `clientName` / `authServerMetadataUrl` / provider bearer。
5. Codemode：独立 `pi-codemode` 包 + 内置工具。默认 MCP exposure 是 `codemode`；`codemode-deferred` 是别名。`tool_search` 是另一个 replaceable 内置扩展。
6. Virtual models 从未到达 provider。
7. TUI 默认 fullscreen。
8. Extension `on()` **41**，含 `mcp_servers_change`。
9. Classifier API **3** 个。
10. tools 仍 8；`createCodingToolDefinitions` / `createReadOnlyToolDefinitions` **仍不含** powershell。
11. 不要把 experimental durable TUI 写成默认 `pi` CLI。

## filler 纪律

只写两类文件：

1. 自己批次里的节点 `docs/llm-wiki/pi/<path>`
2. 可选 `_staging/uncertainty-update-4c6fb7cfe8-<slug>.md`

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、别人批次的节点、`pi/` 源码。

步骤：

1. 读本文件 + `conventions.md` 对应模板 + `_staging/update-facts-4c6fb7cfe8.md`。
2. 读现有节点 `.md`（remap 不要写成空模板；rewrite 保留仍成立的问题列表）。
3. 用 `read_file` / `grep` 读 **target** 源码。`source:` 先按上表增补/删除。
4. 每个 load-bearing 论断的 `[E: path:line]` 必须落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. `status: verified`（自己核过至少 3 条 `[E:]`）或 `draft`（核不完），`updated: 4c6fb7cfe8`，`evidence: explicit`。
6. 跑 lint 时只处理带自己 `node:<path>` 的报错。

### 按批次深度

- **create**：新节点，套模板从源码写满。
- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留。
- **refresh**：对照变更过的 source 修假话、重落行号、补新行为，不扩写无关段。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 或 pico 手稿当 `[E]`；冲突时跟代码。
