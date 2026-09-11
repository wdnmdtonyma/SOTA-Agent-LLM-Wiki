# UPDATE SCOPE — Pi Wiki（9767ba275f → bbb61e34aa）

> 完成日期：2026-09-10
>
> **base**（上一轮 verified / 父仓旧 gitlink）：`9767ba275f3e9a5ee0f5c5342249b629ab1b2282`（v0.85.1 周期末）
>
> **target**（官方 `earendil-works/pi` `origin/main`）：`bbb61e34aaf231639fdaaad1adbd757947034eac`（产品版本仍 **0.85.1**，本轮全在 `[Unreleased]`）
>
> 最终 submodule checkout：detached `bbb61e34aa`
>
> 方法约束仍以 `RUN.md` 和 `conventions.md` 为准。本轮执行：影响分级 → 5 个并行 filler（rewrite/refresh）→ 其余节点 SHA bump + `--safe-only` 证据 rebase → 高价值节点独立 L2 证伪 → **独立 L3 fixer**（核对 L2 就地修改 + 修 nit）→ `llms.txt` / README / index 登记 → reconcile ×2 → lint。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/earendil-works/pi`，默认分支 `main`，base 是 target 的祖先。

```text
42 commits
134 files changed
13970 insertions(+)
3098 deletions(-)
```

复现：

```bash
git -C pi rev-list --count 9767ba275f3e9a5ee0f5c5342249b629ab1b2282..bbb61e34aaf231639fdaaad1adbd757947034eac
git -C pi diff --shortstat 9767ba275f3e9a5ee0f5c5342249b629ab1b2282..bbb61e34aaf231639fdaaad1adbd757947034eac
```

无新 release tag。最新 commit：`fix(ai): send OpenRouter session affinity headers by default`（2026-09-10）。`git diff --name-status` **无删除文件**。

## 2. 200 个基线节点的影响分级

分级把基线 `index.json` 的 `source[]` 与 target diff 交叉（见 `_staging/impact-bbb61e34aa.json`）。机械分级会把共享引用 `agent-session.ts` 的工具页抬成 B-HEAVY；执行时按主题收束：

| 分级 | 机械数量 | 实际处理 |
|---|---:|---|
| A-BROKEN | 0 | 无 source 删除 |
| B-HEAVY | 54 | 主题 rewrite：JSONL/memory fork、compaction/settings、extension/TUI/RPC、AI protocol |
| C-DRIFT | 53 | 主题 refresh + 其余 SHA bump / exact `[E:]` rebase |
| D-CLEAN | 93 | 只 bump SHA |

最大语义变化：

- JSONL fork 从 snapshot 改为两趟流式 `runJsonlFork`；打开的 legacy v3 拒绝 fork，未打开的 v3 可以
- Memory fork 改为 `MemoryStorage.fork` / `InMemoryStorageState.createFork`
- `compaction.modelOverrides` + `retry.maxAgentDelayMs`（config-keys **84 → 86**）
- RPC `steer`/`follow_up` 走 extension `input` handlers
- `registerTool` 必须 object schema；`ModelRegistry.stream` / `streamSimple`
- TUI status spinner 嵌 editor 边框；compaction 期间 `navigateTree` throw
- OpenCode `x-opencode-session`；OpenRouter 默认 `x-session-id`（`cacheRetention === "none"` 不发）
- Codex Off 仍发 reasoning；Mistral Medium 改 `reasoning_effort`；Copilot 全部 `gpt-*` → Responses
- EventStream 双栈 `FifoQueue`；nodejs `TextLineReader`

## 3. Inventory 变化

无退役、无新增节点。最终仍 **200**（T0 12 / T1 35 / T2 120 / T3 33）。源码包仍 10 + 5 extension-example。

**不要**把 `packages/agent/docs/pico*/**` 当 shipped 源或新节点。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| 流式 JSONL / memory fork | `subsys.agent-core.jsonl-storage` / `memory-storage` / `session-storage` / `spine.session-state-model` |
| 按模型 compaction 预算 | `ref.coding-agent.config-keys`、`surface.config.settings`、`subsys.coding-agent.settings-manager` / `agent-session`、`spine.compaction-flow` |
| Agent retry cap | `subsys.ai.provider-retry`、settings / config-keys |
| Extension schema + stream | `subsys.coding-agent.extension-loader` / `model-registry`、`surface.extensions.api` |
| RPC input handlers | `spine.trace-rpc-prompt`、`ref.coding-agent.rpc-methods`、`surface.modes.rpc*` |
| Tree nav during compaction | `subsys.agent-core.tree-navigation`、`surface.modes.interactive` |
| TUI editor-border status | `surface.modes.interactive`、`subsys.coding-agent.interactive-orchestration`、`ref.interactive.components` |
| OpenCode / OpenRouter headers | `ref.ai.provider-catalog`、`subsys.ai.anthropic-messages` / `openai-completions` / `prompt-caching` |
| Codex / Mistral / Copilot / Fireworks | `subsys.ai.openai-codex-responses` / `mistral-conversations` / `model-discovery` |
| EventStream FifoQueue | `subsys.ai.event-stream`、`spine.provider-stream` |
| TextLineReader | `subsys.agent-core.exec-env` |
| Docs evals | `subsys.evals.pi-harness`（`docs.eval.ts`，不新建节点） |

### Catalog 重数（以源码为准）

tools **8** · providers **40** · model buckets **39** · slash **23** · RPC **33** · extension events **36** · config keys **86** · env **103** · CLI **63** · keybindings **90** · interactive components **43** · TUI components **16**。

`createCodingToolDefinitions` / `createReadOnlyToolDefinitions` **仍不含** powershell。

## 5. 证伪策略

5 个 filler 覆盖主题 rewrite/refresh（filler 自核 ≥3 条 `[E:]`）。随后按 `RUN.md`：

- **L2**：5 个独立 verifier 覆盖全部重写/刷新节点，找出并（当时）就地改了 error。
- **L3**：另起 4 个独立 fixer。先对照源码确认 L2 的 error 修改成立；再按 L2 留下的 nit 重落 `[E:]`、补漏写的门控（Codex `cacheRetention==="none"`、docs.eval `status==="ok"`、Completions `null→stop`）。session-exec 批确认 L2 已对齐，未再改。
- 报告：`_research/update-9767ba275f-bbb61e34aa-l2.md`。

L3 之后高价值页的已知 nit 已清。历史 `_staging/uncertainty-*.md` 仍可能提到已删符号。

## 6. 不确定项

`reference/uncertainty.md` 由 reconcile 从 `_staging/uncertainty-*.md` 重生。本轮 filler 写下的 `uncertainty-update-bbb61e34aa-*` 已并进去。

## 7. 元数据与引用收敛

- 全部 verified node frontmatter：`updated: bbb61e34aa`
- `index.json.updated` 与所有 `index.nodes[].updated`：`bbb61e34aa`
- `README.md`、`llms.txt`、`index.json` 的节点计数一致（200）
- `index.groups` config-keys **86**
- 临时脚本 `_staging/_tmp-impact.mjs` 已删除
- 未安装上游 `node_modules`，不宣称 runtime tests 通过

## 8. 最终验证

```bash
git -C pi rev-parse --short=10 HEAD   # bbb61e34aa
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/reconcile.mjs   # 第二次：0 节点更新
node docs/llm-wiki/pi/tools/lint.mjs
node docs/llm-wiki/pi/tools/lint.mjs        # 0 error(s)
```

完成条件：200 verified / 0 planned；`lint` 0 error；二次 reconcile 幂等。父仓 `pi` gitlink 工作树指向 `bbb61e34aaf231639fdaaad1adbd757947034eac`（尚未与 wiki 一起提交）。
