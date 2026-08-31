# UPDATE SCOPE — Pi Wiki（086c32e745 → 853a80d26c）

> 本文件记录 2026-08-31 的 Pi-only 增量更新。
> **旧父仓 gitlink / Wiki 基线**：`086c32e74530564922d011ade23ff582c9d63116`
> **最终点时快照 target**：`853a80d26c90a14c1886f0ebb8ffaae133ca2185`
> **冻结时间**：2026-08-31；冻结时已确认 target 是官方 `origin/main`
> **跨度**：141 commits · 268 files changed · +10,448 / -2,519

复现：

```bash
git -C pi fetch origin main
git -C pi rev-list --count 086c32e74530564922d011ade23ff582c9d63116..853a80d26c90a14c1886f0ebb8ffaae133ca2185
git -C pi diff --shortstat 086c32e74530564922d011ade23ff582c9d63116..853a80d26c90a14c1886f0ebb8ffaae133ca2185
```

上游覆盖 v0.84.3 / v0.84.4。

## 1. 影响分类

以基线 197 个节点为总体，按 source 存在性 + 真实 diff 求交：

| 分类 | 节点数 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | 无 index source 被删除；仅 `highlight-js-lib-index.d.ts` 改名为 `highlight-js.d.ts`，且不在任何节点 source |
| B-HEAVY | 见下 | PowerShell 新工具、prepareNextTurn 时序、catalog 成员、TUI capability/copy、Radius share、compaction 产品行为 |
| C-DRIFT | 145 | source 命中，多数可 evidence rebase + 局部语义更新 |
| D-CLEAN | 52 | 无 source 命中；仍统一把 `updated` 推到 target SHA |
| 退役 | 0 | |
| 新增 | 1 | `surface.tools.powershell` |

新增源文件不单独建节点、并入既有面：

| 新源文件 | 并入节点 |
|---|---|
| `core/session-export.ts`、`modes/interactive/session-share.ts` | `surface.sessions.management`、`subsys.coding-agent.session-manager`、`subsys.coding-agent.interactive-orchestration`、`subsys.coding-agent.html-export` |
| `core/settings-diagnostics.ts` | `subsys.coding-agent.settings-manager`、`surface.config.settings` |
| `modes/interactive/components/settings-submenu.ts` | `ref.interactive.components` |
| `packages/tui/src/native-module-path.ts` | `subsys.tui.native-modifiers` |
| `packages/ai/scripts/openrouter-reasoning-options.ts` | `subsys.ai.model-discovery` |
| `scripts/build-coding-agent-bundle.mjs` | `ref.package-index` |

## 2. 必须重写 / 逐实例重核的面

### 内置工具 7 → 8

- `ToolName` / `allToolNames` / `createAllToolDefinitions` 增加可选 Windows `powershell`。
- `createCodingToolDefinitions` / `createReadOnlyToolDefinitions` **仍不含** powershell。
- `bash.ts` 抽出 `createShellToolDefinition` / `createLocalShellOperations`，powershell 复用同一 shell 工厂。
- 新节点：`surface.tools.powershell`。
- 所有“七个内置工具”断言必须改准：spine、tools-catalog、tool-wrapper、security、各 tool 节点、README / llms.txt。

### Agent loop：`prepareNextTurn` 时序

- `prepareNextTurn` / `prepareNextTurnWithContext` 只在 `shouldStopAfterTurn` 与 queued-message 检查决定**还会再开一轮 assistant turn** 之后运行；终局/terminating turn 不再调用。
- 受影响：`spine.agent-loop`、`subsys.agent-core.turn-control`、`subsys.agent-core.hooks`、`subsys.agent-core.agent-harness-lifecycle`。
- 产品侧：tool 执行与下一轮模型请求之间可插入 compaction（`#6879`）。

### Catalog / 产品增量（必须逐实例重核）

- slash：新增 `/thinking` → **23**。
- RPC：新增 `clear_queue` → **33**。
- extension events：`session_compact_failed`、`ui_prompt_start`、`ui_prompt_end` → 按 `ExtensionAPI.on` overload 重数。
- config：`fullscreenCopyOnSelect`、terminal capability overrides、`defaultTools` 可含 `powershell`。
- env：terminal hyperlink / image / truecolor 覆盖变量。
- keybindings：Windows/WSL 默认避让、Ctrl+S persist model、fullscreen copy。
- CLI：`--` end-of-options。
- JSON/RPC：`toolcall_start` 带 tool call id/name。
- interactive components：`settings-submenu`。
- provider：runtime 仍为 **40**；xAI 改走 Responses + Grok 4.6 默认。
- models：重跑 `tools/generate-model-catalog.mjs`。

## 3. 执行与验收

- 只改 `docs/llm-wiki/pi/**` 与父仓 `pi` gitlink。
- 填充后 `node tools/reconcile.mjs` 两次 + `node tools/lint.mjs` 两次，须 0 error / 0 warning。
- 全部节点 `updated: 853a80d26c`；index / 文件树 / `llms.txt` 同一集合。
- 未安装上游 `node_modules`，不宣称 runtime tests 通过。

## 7. 最终结果

- 节点：**198 verified / 0 planned**（+1 `surface.tools.powershell`）；全部 `updated: 853a80d26c`。
- Catalog：tools 8 · slash 23 · RPC 33 · extension events 36 · config 84 · keybindings 89 · env 98 · CLI 63 · interactive components 43 · providers 40 · model buckets 39。
- `tools/generate-model-catalog.mjs` 已改为 `flattenModelCatalog` bucket + generator allowlist，不再找旧的逐模型 `Model<"api">` shard。
- L1：`reconcile` + `lint` 各两轮，**0 error / 0 warning**。
- L2：见 `_research/update-086c32e745-853a80d26c-l2.md`。
- 父仓 `pi` gitlink 工作树指向 `853a80d26c90a14c1886f0ebb8ffaae133ca2185`（尚未 commit）。
- 未跑上游 runtime tests（detached checkout 无 `node_modules`）。
