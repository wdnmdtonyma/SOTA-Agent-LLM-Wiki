# Pi wiki 增量刷新令（ff72faba28 → 6f7551516b）

给 filler 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径、架构事实和文件纪律。

本轮 **不跑逐节点独立 L2**（lead 填完后再统一证伪）。filler 自己核 `[E:]`（每页至少抽 3 条 `read_file` 对行），写完将 `status: verified`。过宽结论宁可降 `[I]/[U]`。

## 冻结点

- **base**（上一轮 verified / 父仓 origin/main gitlink）：`ff72faba28`（`ff72faba28d10c86611863d0aaa5d3122f2d8cb0`）
- **target**（必须对照的源码 HEAD）：`6f7551516b`（全 SHA `6f7551516b84278eb9da1c340c8e7bc66be1a6ba`；官方 `origin/main`；产品仍 **0.87.1**，本轮全在 `[Unreleased]`）
- 源码根: `pi/`（相对本 wiki `../../../pi/`）
- 节点 `updated:` 一律写成 `6f7551516b`
- 未安装上游 `node_modules`，不要宣称 runtime tests 通过。
- **不要**把 `packages/durable/docs/pico*` 当 shipped 源。durable **源码** `packages/durable/src/**` 是 shipped。
- **不要新建 wiki 节点。** System theme、typed IDs、Fireworks 默认模型全部写进现有页。

## 路径增补（frontmatter `source:` 与 `[E:]`）

本轮 **没有** 删除 shipped 源文件。必须**新增**的 source：

| 节点 | 必须加入 `source:` |
|---|---|
| `subsys.coding-agent.theme-controller` | `packages/coding-agent/src/modes/interactive/theme/system-theme.ts`；可选 `packages/tui/src/oklab.ts` |
| `subsys.coding-agent.interactive-orchestration` | `packages/coding-agent/src/cli/startup-ui.ts`（若尚未列入） |
| `subsys.tui.terminal-colors` | `packages/tui/src/colors.ts`、`packages/tui/src/oklab.ts` |
| `subsys.durable.runtime` | `packages/durable/src/ids.ts` |
| `ref.interactive.components` | `packages/coding-agent/src/modes/interactive/components/pi-logo.ts`、`themed-text.ts` |

禁止把 `[E:]` 指到已删除的 Fireworks 默认 id `accounts/fireworks/models/kimi-k2p6`。`getServiceTierCostMultiplier` 必须把 `fast` 与 `priority` 写成同一档。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **产品版本仍 `0.87.1`**，wiki target SHA `6f7551516b`。changelog 全在 Unreleased。
2. **System theme**：内置生成主题名 `system`（`SYSTEM_THEME_NAME`）。默认主题是 `system`，不再只有 `dark`/`light` 两个 built-in JSON。启动时 `markTerminalColorsPending()`，system theme 先灰度，等 `requestTerminalColors` / `queryTerminalColors`（timeout 100ms，late reply 仍应用）后 `setTerminalColors` 再生成。三级：background+palette / background only / nothing（ANSI 索引）。颜色在 OKHSL，hue 来自终端 palette slot。
3. **`parseAutoThemeSetting` 仍在**：`light/dark` slash 配对仍可解析；fallback 无效 theme 名静默落到 `system`。
4. **启动 banner 去掉 `[Themes]` 段**。Custom themes 仍在 `/settings`；冲突仍会报。
5. **新组件**：`pi-logo.ts`、`themed-text.ts`。interactive components catalog 必须列出。
6. **Fireworks 默认模型**：`defaultModelPerProvider.fireworks` = `accounts/fireworks/models/kimi-k3`（替换已下架的 `kimi-k2p6`）。
7. **OpenAI Fast mode 计价**：`getServiceTierCostMultiplier` 把 `service_tier: "fast"` 与 `"priority"` 同一档（`gpt-5.5` → 2.5，其它 → 2）。GPT-6 会报告 `fast`。
8. **openai SDK `7.19.0`**：`packages/ai/package.json` dependencies。Completions 里 `stream_options` / `max_tokens` 用 typed assertion，不再 `(params as any)`。
9. **Durable typed IDs**：`Id<Kind, Type>` erased brand；`ConversationId` / `EntryId` / `TaskId<R>` / `SubmissionId` / `DocumentId`；`Seq` 单独 brand。`idFromNumber` / `seqFromNumber` 只在 trusted allocation/decode 边界用。`ROOT_CONVERSATION_ID = 1 as ConversationId`。
10. **Durable ownership**：`ConversationOwnership` = `{ kind: "ownerless" } | { kind: "task"; taskId }`。`Tx.createConversation` 与 `Tx.forkConversation` 拆开，必须显式 ownership。任务所属 conversation 创建后不可变。
11. **Catalog 未变**：runtime providers **42**；`.models.ts` buckets **42**；slash **24**；RPC **33**；extension `on()` **40**；tools **8**。不要重数成别的数。
12. **不要**把 pico 手稿写成 shipped 运行时。

## 本轮新节点

4 个，见 `_UPDATE-SCOPE.md` §3。套 `conventions.md` 子系统模板。`pkg: durable` 或 `ai` 或 `coding-agent`。`related` 必须指向已有 id（spine.layered-architecture / ref.package-index / 相邻节点）。

## 不要退役的节点

全部保留。

## filler 纪律

只写两类文件：

1. 自己批次里的节点 `docs/llm-wiki/pi/<path>`
2. 可选 `_staging/uncertainty-update-6f7551516b-<slug>.md`

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、别人批次的节点、`pi/` 源码。

步骤：

1. 读本文件 + `conventions.md` 对应模板 + `_staging/update-facts-6f7551516b.md`。
2. 读现有节点 `.md`（remap 不要写成空模板；rewrite 保留仍成立的问题列表）。
3. 用 `read_file` / `grep` 读 **target** 源码。`source:` 先按上表增补/删除。
4. 每个 load-bearing 论断的 `[E: path:line]` 必须落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. `status: verified`（自己核过至少 3 条 `[E:]`）或 `draft`（核不完），`updated: 6f7551516b`，`evidence: explicit`。
6. 跑 lint 时只处理带自己 `node:<path>` 的报错。

### 按批次深度

- **create**：新节点，套模板从源码写满。
- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留。
- **refresh**：对照变更过的 source 修假话、重落行号、补新行为，不扩写无关段。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 或 pico 手稿当 `[E]`；冲突时跟代码。
