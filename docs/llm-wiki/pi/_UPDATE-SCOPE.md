# UPDATE SCOPE — Pi Wiki（ff72faba28 → 6f7551516b）

> 完成日期：2026-09-28
>
> **base**（上一轮 verified / 父仓 origin/main gitlink）：`ff72faba28d10c86611863d0aaa5d3122f2d8cb0`
>
> **target**（官方 `earendil-works/pi` `origin/main`）：`6f7551516b84278eb9da1c340c8e7bc66be1a6ba`（产品仍 **0.87.1**，本轮全在 `[Unreleased]`）
>
> 冻结时 submodule checkout：detached `6f7551516b`
>
> 方法约束仍以 `RUN.md` 和 `conventions.md` 为准。本轮执行：影响分级 → 机械 SHA bump + `--safe-only` 证据 rebase → 3 个并行 filler（theme rewrite / durable rewrite / ai refresh）→ 独立 L2 证伪 → 独立 L3（两轮）→ lead 行号补修 → `llms.txt` / README / index 登记 → reconcile ×2 → lint。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/earendil-works/pi`，默认分支 `main`，base 是 target 的祖先。

```text
7 commits
80 files changed
4096 insertions(+)
2219 deletions(-)
```

复现：

```bash
git -C pi rev-list --count ff72faba28d10c86611863d0aaa5d3122f2d8cb0..6f7551516b84278eb9da1c340c8e7bc66be1a6ba
git -C pi diff --shortstat ff72faba28d10c86611863d0aaa5d3122f2d8cb0..6f7551516b84278eb9da1c340c8e7bc66be1a6ba
```

无新 release tag。最新 commit：`fix(ai,coding-agent): update Fireworks tests and default for removed models`（2026-09-28）。`git diff --name-status` **无删除文件**（5 A / 0 D / 75 M）。

## 2. 204 个基线节点的影响分级

分级把基线 `index.json` 的 `source[]` 与 target diff 交叉（见 `_staging/impact-6f7551516b.json`）。`interactive-mode.ts` 会把一串 C-DRIFT 抬起来；执行时按主题收束：

| 分级 | 机械数量 | 实际处理 |
|---|---:|---|
| A-BROKEN | 0 | 无 source 删除 |
| B-HEAVY | 0 | 无单节点 churn ≥ 2000 |
| C-DRIFT | 53 | 主题 rewrite：theme + durable；refresh：Fireworks 默认 / OpenAI Fast；其余 SHA bump / exact `[E:]` rebase |
| D-CLEAN | 151 | 只 bump SHA |

机械 A-BROKEN（source 被删）：

- 内置生成主题 `system`（`SYSTEM_THEME_NAME`），启动灰度直到 terminal color query
- 启动 banner 去掉 `[Themes]`
- Fireworks `defaultModelPerProvider` 改为 `accounts/fireworks/models/kimi-k3`
- OpenAI `service_tier: "fast"` 与 `"priority"` 同倍率
- openai SDK `7.19.0`
- Durable erased `Id`/`Seq` + `ConversationOwnership` + `createConversation`/`forkConversation` 拆分
- 新组件 `pi-logo.ts`、`themed-text.ts`

## 3. Inventory 变化

无退役、无新增节点。最终仍 **204**（T0 12 / T1 35 / T2 124 / T3 33）。

interactive components catalog 按目录 `.ts` 文件重数为 **45**（+`pi-logo.ts` +`themed-text.ts`）。

**不要**把 `packages/durable/docs/pico*/**` 当 shipped 源或新节点。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| System theme | `subsys.coding-agent.theme-controller`、`subsys.coding-agent.interactive-orchestration`、`surface.modes.interactive`、`subsys.tui.terminal-colors` |
| 启动 banner 无 `[Themes]` | `subsys.coding-agent.interactive-orchestration` |
| `pi-logo` / `ThemedText` | `ref.interactive.components` |
| Fireworks 默认 `kimi-k3` | `ref.ai.provider-catalog`、`subsys.coding-agent.model-resolver`、`surface.providers.overview` |
| OpenAI Fast 计价 | `subsys.ai.openai-responses` |
| openai SDK 7.19.0 | `subsys.ai.openai-completions`（typed `stream_options` / `max_tokens`） |
| Durable typed IDs / ownership | `subsys.durable.runtime`、`subsys.durable.storage` |

### Catalog 重数（以源码为准，本轮除 components 外不变）

tools **8** · providers **42** · model buckets **42** · slash **24** · RPC **33** · extension `on()` **40** · config keys **88** · env **105** · CLI **63** · keybindings **90** · interactive components **45** · TUI components **16**。

config keys / env / CLI / keybindings 由对应 catalog filler 按 ground truth 重数，不要沿用 86 / 103 / 63 / 90。

## 5. 证伪策略

Fillers 自核 ≥3 条 `[E:]`。随后按 `RUN.md`：

- **L2**：3 个独立 verifier。theme 5 条 citation；durable 2 条过宽/错行；ai 5 条 citation / Partial record。
- **L3 + L2b + L3b**：L2b 仍报 9 条行号；L3b 已把 generator / MemoryStorage / `types.ts:208` / `getAvailable` 等锚点改到代码行。lead 再删 `theme.ts:497` 纯括号 cite，并给 `dark`/`light` JSON 补 `:452`。
- 报告：`_research/update-ff72faba28-6f7551516b-l2.md`。

机械 SHA 页未逐页 L2。

## 6. 不确定项

`reference/uncertainty.md` 由 reconcile 从 `_staging/uncertainty-*.md` 重生。本轮 filler 写下的 `uncertainty-update-*` 会并进去。

## 7. 元数据与引用收敛

- 全部 verified node frontmatter：`updated: 6f7551516b`
- `index.json.updated` 与所有 `index.nodes[].updated`：`6f7551516b`
- `README.md`、`llms.txt`、`index.json` 的节点计数一致（204）
- 未安装上游 `node_modules`，不宣称 runtime tests 通过

## 8. 最终验证

```bash
git -C pi rev-parse --short=10 HEAD   # 6f7551516b
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/reconcile.mjs   # 第二次：0 节点更新
node docs/llm-wiki/pi/tools/lint.mjs
```

完成条件：204 verified / 0 planned；`lint` 0 error；二次 reconcile 幂等。父仓 `pi` gitlink 工作树指向 `6f7551516b84278eb9da1c340c8e7bc66be1a6ba`。
