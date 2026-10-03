# L2 verification — ff72faba28 → 4c6fb7cfe8

## Scope facts

- official default branch: `origin/main`
- base: `ff72faba28d10c86611863d0aaa5d3122f2d8cb0`
- target: `4c6fb7cfe8c538a668726f6f8b3554098c39faee`
- upstream span: 166 commits; 959 files; +78,918 / -118,215
- result: 195 verified nodes; −17 / +8; 0 planned
- upstream releases: v0.99.0 / v0.99.1 / v0.99.2 / v1.0.0 / v1.0.1（产品 **1.0.1** + Unreleased）

## Independent verifier matrix

| Area | Result | Notes |
|---|---|---|
| layered / overview / package-index | PASS after L3 | Architecture 13 packages / build order / loop-only agent-core 全部核到。L3 14/14 `l2_fixes_hold=true`（CHANGELOG 标题、createSession/CodemodeSandbox/transport 导出行、`pi-tui` types） |
| durable runtime/storage/harness | PASS after L3 | storage 专项 PASS。L3 收紧 `documentState` 归属、`subscribeClose` 无 Context、`Harness.open` 也用于 experimental durable TUI |
| MCP / codemode（6 新节点） | PASS | `/mcp` 不在 24 builtin slash；replaceable mcp/codemode/tool-search；16 Mi 输出上限；默认 exposure `codemode`；首 prompt 不等非 direct MCP |
| catalogs | PASS | 见下表。L2 抽查 50 条 `[E:]` 可解析 |
| agent-loop / session persist / compaction / virtual / fullscreen / classifiers | PASS | `finishTurn`；首条 user/assistant 落盘；`ContextEditEntry`；`pi-virtual` 不进 provider；`tuiMode` 默认 fullscreen；classifier API 3；`AgentEvent` 10 |

## Catalog audit

对照 `4c6fb7cfe8` 源码重数：

- runtime providers: **42**
- static model buckets: **42**
- KnownApi (chat): 10
- KnownImageApi: 1（`openrouter-images`）
- KnownClassifierApi: **3**（+`llama-cpp-classify`）
- config keys: **93**
- slash builtin: **24**（`/mcp` 为扩展贡献）
- RPC: 33
- extension `on()`: **41**（+`mcp_servers_change`）
- CLI flags: **62**
- keybindings: 90
- env: **110**（+5 Anthropic federation）
- interactive components: **48**（`daxnuts.ts` 已删）
- built-in tools: 8；coding/read-only 仍不含 powershell

## Confirmed errors that L2 found (L3 re-checked against source)

- overview `CHANGELOG.md:9` 是 Nix flake 条目，不是 `[Unreleased]`/`[1.0.1]` 标题
- layered `createSession` / `CodemodeSandbox` / MCP transport 导出行偏一行
- package-index `check` 脚本在 `package.json:20`；`pi-tui` `types` 是 `./dist/index.d.ts`
- durable `documentState` 在 `Session` 上；`subscribeClose` 不接 `Context`
- `Harness.open(openNodeSqliteStorage)` 也出现在 experimental durable TUI / vacation，不是 session-worker 独有

## Remaining nits

- 机械 SHA 页未逐页 L2。
- 未安装上游 `node_modules`，未跑 durable/mcp/codemode runtime tests。
- `packages/durable/docs/pico*` 未进节点。

## Validation

Wiki validation is serial after fillers, L2, and L3: reconcile, lint, reconcile again, lint again. Final: 195 verified / 0 planned.

Upstream runtime tests were not executed: detached Pi checkout has no `node_modules`.
