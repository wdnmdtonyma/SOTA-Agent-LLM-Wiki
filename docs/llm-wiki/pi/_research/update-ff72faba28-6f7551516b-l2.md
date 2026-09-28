# L2 verification — ff72faba28 → 6f7551516b

## Scope facts

- official default branch: `origin/main`
- base: `ff72faba28d10c86611863d0aaa5d3122f2d8cb0`
- target: `6f7551516b84278eb9da1c340c8e7bc66be1a6ba`
- upstream span: 7 commits; 80 files; +4,096 / -2,219
- result: 204 verified nodes; +0 / -0; 0 planned
- upstream tags: none（产品仍 0.87.1，变更在 Unreleased）

## Independent verifier matrix

| Area | Result | Notes |
|---|---|---|
| System theme / startup grayscale / banner | PASS after L2+L3 | L2 5 条 citation；L2b 3 条；L3b 把 `generateSystemThemeColors` 落到 `:462`，`path: undefined` 落到 `:480`，pending 落到 `startup-ui.ts:89` |
| Durable typed IDs / ownership | PASS after L2+L3 | L2：`Tx.doc` 错锚 `mintId`；`mintId` 无 `Context`。L2b：JSONL `MemoryStorage` 与 `createStorageConformance` 行号。L3b 改到 `:245` / `:16` |
| Fireworks default / OpenAI Fast / SDK | PASS after L2+L3 | L2：`Partial<Record>` 被写成 exhaustive；`findInitialModel` 行号；`supportsAdditionalTools` 锚到 strict；Fireworks `:10` 是 name；`convertTools` `strict` 在 `:1505`。L2b：stream 返回点与 `samplingParams` 注释行。L3b 改到代码行 |

## Catalog audit

对照 `6f7551516b` 源码重数：

- runtime providers: 42
- static model buckets: 42
- config keys 88
- slash 24、RPC 33、extension `on()` 40、CLI 63、keybindings 90、env 105
- interactive components **45**（+`pi-logo.ts` +`themed-text.ts`）
- TUI components 16
- built-in tools: 8；coding/read-only 仍不含 powershell

本轮 catalog 语义：

- Fireworks 默认 = `accounts/fireworks/models/kimi-k3`
- OpenAI `getServiceTierCostMultiplier`：`fast` 与 `priority` 同档
- `@earendil-works/pi-ai` 依赖 `openai` 7.19.0

## Confirmed errors that L2 found (L3 re-checked against source)

- `subsys.coding-agent.theme-controller`：system theme 三级分支、`detectTerminalTheme`、OKHSL 注释行、`colors.ts` 未进 `source[]`
- `subsys.tui.terminal-colors`：sRGB gamut 注释行
- `subsys.durable.runtime`：`Tx.doc` 的 `resolveAddress`；`Storage.mintId` 无 Context
- `subsys.coding-agent.model-resolver`：default table 是 `Partial`；`findInitialModel` 文档行
- `ref.ai.provider-catalog`：Fireworks base/key 行号
- `subsys.ai.openai-responses` / `openai-completions`：compat 字段与 `strict` 展开行、`samplingParams` 注释行

## L3（独立 fixer，与 L2 分开）

- 第一轮 L3 修完 L2 的 12 条语义/行号。
- L2b 仍报 9 条行号（多数是 L3 改完后 verifier 仍盯旧句，或新句里并列 `[E:]` 被读成“函数定义在 :32”）。
- 第二轮 L3b 把仍错的锚点改到代码行。lead 抽查：`kimi-k3`、`case "fast"`、`SYSTEM_THEME_NAME`、`idFromNumber`、`colors.ts` 在 theme-controller `source[]` 均成立。lead 另删 `theme.ts:497` 纯括号 cite。

## Remaining nits

- 机械 SHA 页未逐页 L2。`interactive-mode.ts` 机械命中的 slash/skills/html-export 等页只 bump SHA。
- `group.interactive-components.instance_count` 需从 43 改到 45（与 catalog 正文一致）。

## Validation

Wiki validation is serial after fillers, L2, and L3: reconcile, lint, reconcile again, lint again. Final: 204 verified / 0 planned.

Upstream runtime tests were not executed: detached Pi checkout has no `node_modules`.
