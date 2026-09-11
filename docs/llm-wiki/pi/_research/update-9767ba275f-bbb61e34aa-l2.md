# L2 verification — 9767ba275f → bbb61e34aa

## Scope facts

- official default branch: `origin/main`
- base: `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`
- target: `bbb61e34aaf231639fdaaad1adbd757947034eac`
- upstream span: 42 commits; 134 files; +13,970 / -3,098
- result: 200 verified nodes; +0 / -0; 0 planned
- upstream tags: none（产品仍 0.85.1，变更在 Unreleased）

## Independent verifier matrix

| Area | Result | Notes |
|---|---|---|
| JSONL / memory fork / exec-env / error-codes | PASS after L2+L3 | L2 改 2 error；L3 独立核对通过，未再改 |
| settings / compaction / retry | PASS after L2+L3 | L2 改 compact() 签名；L3 重落 config-keys / settings `[E:]` |
| extension / TUI / RPC / tree-nav | PASS after L2+L3 | L2 改键位/selector/thinking 常量；L3 重落 bash/queue/refresh/projector `[E:]` |
| AI protocol / catalogs / evals | PASS after L2+L3 | L2 改 evals/core-types/Completions；L3 补门控并重落 FifoQueue 等 `[E:]` |
| spine meta / env / session-format / package-index | PASS after L3 nits | L2 无 error；L3 改 `InteractiveMode.run` / env / package.json / embedding client 行号 |

## Catalog audit

对照 `bbb61e34aa` 源码重数：

- runtime providers: 40
- static model buckets: 39
- config keys **86**（+`compaction.modelOverrides` +`retry.maxAgentDelayMs`）
- slash 23、RPC 33、extension events 36、CLI 63、keybindings 90、env 103
- interactive components 43、TUI components 16
- built-in tools: 8；coding/read-only 仍不含 powershell

## Confirmed errors that L2 found (L3 re-checked against source)

- `subsys.agent-core.session-storage`：`createBranch` 的 `at === null` 是合法建根，不是 `SessionUnknownTargetError`
- `subsys.agent-core.exec-env`：无 exit code 时缺 signal 号得到 `128`，`1` 只用于既无 code 也无 signal
- `ref.agent.compaction-config` / `spine.compaction-flow`：harness `compact()` 签名；`CompactResult` / `Entry[]`；AgentSession 调 `packages/coding-agent/src/core/compaction/`
- `subsys.coding-agent.interactive-orchestration`：`/model` `/thinking` save 走 `app.models.save` / `app.thinking.save`，不是硬编码 `ctrl+s`
- `ref.interactive.components`：Enter 只 `onSelect(persist:false)`；写 default 走 `onSelectAsDefault`
- `ref.coding-agent.rpc-methods`：无 model 时返回 `THINKING_LEVEL_OPTIONS`，不是 `THINKING_LEVELS`
- `subsys.evals.pi-harness`：`stopReason` 接受 `stop|toolUse`；只有 `stop` 强制非空文本
- `ref.ai.core-types`：补 `providerThinkingLevel`、`supportsMaxOutputTokens`；`StreamFunction` 可在缺 auth 时同步 throw
- `subsys.ai.openai-completions`：缺 `finish_reason` 仅在默认 `supportsFinishReason` 时抛错

## L3（独立 fixer，与 L2 分开）

第一轮把 L2 的就地修改误标成了 L3。补做 4 个独立 L3 fixer：

- 对照源码确认上表 L2 error 修改全部成立（session-exec 批 0 文件改动）。
- 按 L2 留下的 nit 重落 `[E:]`：config-keys Settings 表、branchSummary、settings-manager/surface retry 误引、compaction-config 证据列、interactive bash/queue、model-registry refresh、tree-navigation projector、EventStream FifoQueue、overview `main.ts:965`、env Azure/Bedrock、package-index chord/protocol、embedding `./client`。
- 补漏写门控：Codex `cacheRetention==="none"`、docs.eval `status==="ok"`、Completions `mapStopReason` `null→stop`。

## Remaining nits

- 未列入 L2 清单的次要 catalog 行号（例如 config-keys 个别 nested leaf、thinking-selector 默认键文案）未整表重写。
- 历史 `_staging/uncertainty-*.md` 可能仍提到已删符号；reconcile 会原样并进 `reference/uncertainty.md`。

## Validation

Wiki validation is serial after fillers, L2, and L3: reconcile, lint, reconcile again, lint again. Final: 0 error / 0 warning · 200 nodes。

Upstream runtime tests were not executed: detached Pi checkout has no `node_modules`.
