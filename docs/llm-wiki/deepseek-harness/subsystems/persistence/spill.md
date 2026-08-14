---
id: subsys.persistence.spill
title: spill 大输出
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/spill/spill/src/index.ts
  - packages/spill/spill/src/types.ts
  - packages/spill/spill/tests/service.spec.ts
  - packages/spill/spill-local/src/index.ts
  - packages/spill/spill-local/src/store.ts
  - packages/spill/spill-local/tests/spill-local.spec.ts
  - packages/spill/spill-policy/src/index.ts
  - packages/spill/spill-policy/src/types.ts
  - packages/spill/spill-policy/tests/spill-policy.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/code-mode.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/service.ts
symbols:
  - SpillStore
  - LocalSpillStore
  - spill-policy
related:
  - spine.tool-call-anatomy
  - subsys.core.tools
  - subsys.core.code-mode
  - spine.session-log
  - spine.overview
  - subsys.core.session
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.spillStore` 是 **host 面** spill 存储缝：Definition 只声明 `saveText`；shipped Provider 是 `LocalSpillStore`（默认 `mkdtemp` 私有根）；`spill-policy` 是挂在 `tools/post-execute` 与 `tools/code-dispatch-log` 上的 Consumer，先 `next()` 再把超 `maxInlineBytes` 的纯文本换成 preview + locator。fail-open：没 store / `saveText` 抛 / replacement 超 cap 都保留原文，绝不把成功 tool 改成 `isError`。这是 Cordis 组合运行时（`profile → bundle → agent preset`）把 oversized 输出卸出模型上下文的一层，不是 bash / pwsh 自己的 `spillPath`。

## 能回答的问题

- `ctx.spillStore` 的 Definition / Provider / Consumer 各是哪个包？`spill-policy` 为什么只 `inject: ['tools']`，用 `ctx.get('spillStore')` 而不是硬依赖？
- `dsh-base` 挂哪两行、`maxInlineBytes` 默认多少？`dsh-web-app` / `dsh-headless` 还重挂吗？省略 cap 会怎样？
- `tools/post-execute` 为什么必须先 `next()`？哪些结果跳过（nested / `read` / 带 `value` / 非纯文本）？
- `tools/code-dispatch-log` 裁的是程序值还是 `tool/code-dispatch` 日志副本？`read` 子调用会不会 spill？
- fail-open 有哪些出口？replacement 自己比 cap 还大时怎么办？会不会把成功 tool 改成 `isError`？
- local 盘怎么写：`mkdtemp` 根、`session-<hash>`、`wx` + `0600`、locator 是什么？有没有 GC / 检索 API？

## 职责边界

本子系统拥有三条可拆的东西：

- **Definition** `@deepseek-ai/dsh-spill`：抽象类 `SpillStore` 占住 `ctx.spillStore`，合同只有 `saveText(SaveTextSpill) → SpillRef`。 [E: packages/spill/spill/src/index.ts:47] [E: packages/spill/spill/src/index.ts:55]
- **Provider** `@deepseek-ai/dsh-spill-local`：`LocalSpillStore.saveText` 调 `saveTextFile` 把全文写到会话私有文件，locator 是 `saved.path`（`root` 经 `resolve` / `privateRoot`，绝对路径）。 [E: packages/spill/spill-local/src/index.ts:47] [E: packages/spill/spill-local/src/index.ts:51] [E: packages/spill/spill-local/src/index.ts:58]
- **Consumer** `@deepseek-ai/dsh-spill-policy`（导出 `name = 'spill-policy'`）：不 `provide` 任何 `ctx` 键，只 `inject = ['tools']`，在两条 waterfall 上决定何时 `saveText`、怎样拼 preview + notice。 [E: packages/spill/spill-policy/src/index.ts:70] [E: packages/spill/spill-policy/src/index.ts:73]

本子系统**不**拥有：

- `tools/pre-execute → execute → post-execute` 管线本身、`PostToolDecision` 的 accept / block 合同（[subsys.core.tools](../core/tools.md)）。
- `run_code` 子调度、`parent` token、`shapeDispatchLog` 何时 `append('tool/code-dispatch')`（[subsys.core.code-mode](../core/code-mode.md)、[spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)）。
- append-only `Session` / `deriveMessages()` / `surfaceOp`（只有 `append` 与 `{ op: 'replace', start, end }`，**没有 delete**）（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）。
- compaction / `tool-result-pruner`：那是另一次 `surfaceOp: replace`，不是本缝的 `saveText`。
- bash / pwsh 执行器自己的流式 `spillPath`（`maxOutputBytes` / `maxSpillBytes`）。那是 shell 截断文件，**不**走 `ctx.spillStore`，本页不展开。
- 个别工具（`grep` / `glob`）用 `ctx.get('spillStore')` 写的 formatted 结果页脚。那是 T1 工具自己的 post-execute，不是 `spill-policy`。
- 图片字节附件（`ctx.attachmentStore`）与 session JSONL / SQLite 盘。

这是 **host 面** 进程级服务。agent-preset 面贡献 tools / persona / isolate，不 remount `spillStore`。默认产品路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI 包。浏览器 client 不实现 `SpillStore`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/spill/spill/src/index.ts` | Definition：`SpillStore` 登记为 `ctx.spillStore` |
| `packages/spill/spill/src/types.ts` | `SaveTextSpill` / `SpillRef` / `SpillLocator` / `SpillOwner` |
| `packages/spill/spill/tests/service.spec.ts` | 同 realm 第二个实现抛错；dispose 后键变 `undefined` |
| `packages/spill/spill-local/src/index.ts` | Provider：`LocalSpillStore`；省略 `root` 走 `privateRoot()` |
| `packages/spill/spill-local/src/store.ts` | `mkdtemp` 根、`encodeSegment`、`sessionDir`、`open(..., 'wx', 0o600)` |
| `packages/spill/spill-local/tests/spill-local.spec.ts` | 配置根 / 默认根、遍历名被收成单段、`0700`/`0600` |
| `packages/spill/spill-policy/src/index.ts` | `apply`：省略 cap 不注册；两条 waterfall；`spillReplacement` |
| `packages/spill/spill-policy/src/types.ts` | `SpillPolicyExec`：只读 `agent.session.header.id` |
| `packages/spill/spill-policy/tests/spill-policy.spec.ts` | 模型臂 / 日志臂 / fail-open / `value` 互斥 / HMR dispose |
| `packages/core/tools/src/index.ts` | `tools/post-execute` 与 `tools/code-dispatch-log` 的 waterfall 声明；`shapeDispatchLog` |
| `packages/core/tools/src/code-mode.ts` | 子调用 `settle` 先把完整 `value` 还给程序，再异步塑日志 |
| `packages/bundle/base/cordis.patch.yml` | shipped 行 `spill-local`（无 config）+ `spill-policy` `maxInlineBytes: 50000` |
| `packages/boot/app-boot/src/profile.ts` | `PROFILE_TEMPLATES`：`web` / `headless` 都先叠 `dsh-base` |
| `packages/core/session/src/index.ts` | `session/flush` 签名没有 `next`（parallel，不是本缝） |
| `vendor/cordis/src/events.ts` | waterfall 必须调用传入的 `next()` 才会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SpillStore` | Cordis `Service`，键名 `'spillStore'`。抽象面只有 `saveText`。 [E: packages/spill/spill/src/index.ts:47] [E: packages/spill/spill/src/index.ts:55] 本地 `saveTextFile` 把 `content` 原文 `writeFile`。 [E: packages/spill/spill-local/src/store.ts:115] 存储失败让 Promise reject；policy `catch` 后 `return undefined`，调用臂留原文。 [E: packages/spill/spill-local/tests/spill-local.spec.ts:143] [E: packages/spill/spill-policy/src/index.ts:156] [E: packages/spill/spill-policy/src/index.ts:160] 没有 list / read / delete。 |
| `SaveTextSpill` | `owner` + `source{toolName,callId,label}` + `suggestedName` + 全文 `content`。`suggestedName` 进盘前被 `encodeSegment` 收成单段，不是路径。 [E: packages/spill/spill/src/types.ts:57] [E: packages/spill/spill/src/types.ts:58] [E: packages/spill/spill/src/types.ts:63] [E: packages/spill/spill/src/types.ts:65] [E: packages/spill/spill-local/src/store.ts:110] |
| `SpillRef` | `locator` + `bytes` + `retrievalHint`。 [E: packages/spill/spill/src/types.ts:70] [E: packages/spill/spill/src/types.ts:71] [E: packages/spill/spill/src/types.ts:72] 本地后端把 `saved.path` 品牌成 locator（`root` 经 `resolve` / `privateRoot`，绝对）。 [E: packages/spill/spill-local/src/index.ts:47] [E: packages/spill/spill-local/src/index.ts:58] [E: packages/spill/spill-local/tests/spill-local.spec.ts:110] policy 只把 locator 插进 notice 字符串，没有 parse。 [E: packages/spill/spill-policy/src/index.ts:107] |
| `SpillOwner` | 只有 `sessionId`。 [E: packages/spill/spill/src/types.ts:37] [E: packages/spill/spill/src/types.ts:38] policy 从 `exec.agent.session.header.id` 取；没有 agent 的直调视为无主。 [E: packages/spill/spill-policy/src/index.ts:91] |
| `LocalSpillStore.Config` | 可选 `root`。省略则 `privateRoot()`：进程内懒创建一次的 `tmpdir()/dsh-spill-*`。 [E: packages/spill/spill-local/src/index.ts:47] [E: packages/spill/spill-local/src/store.ts:28] |
| `spill-policy` `Config` | 可选 `maxInlineBytes`（UTF-8 字节）。省略 = 插件是真 no-op，连 listener 都不挂。 [E: packages/spill/spill-policy/src/index.ts:113] |
| `label` | 模型臂传 `'result'`，日志臂传 `'dispatch'`；`suggestedName` 固定为 `` `${toolName}.txt` ``。 [E: packages/spill/spill-policy/src/index.ts:205] [E: packages/spill/spill-policy/src/index.ts:228] [E: packages/spill/spill-policy/src/index.ts:150] |

`SpillStore` 同一 realm 只能有一个实现：再 `plugin` 一次会抛；fiber `dispose` 后 `ctx.spillStore` 变 `undefined`。 [E: packages/spill/spill/tests/service.spec.ts:50] [E: packages/spill/spill/tests/service.spec.ts:58]

## 控制流

1. **host 面挂 Provider + policy，preset 不重挂。** `dsh-base` 插入 `id: spill-local` / `name: '@deepseek-ai/dsh-spill-local'`（**没有** `config`，因此走 `privateRoot()`），再插 `id: spill-policy` / `name: '@deepseek-ai/dsh-spill-policy'`，`maxInlineBytes: 50000`。 [E: packages/bundle/base/cordis.patch.yml:346] [E: packages/bundle/base/cordis.patch.yml:347] [E: packages/bundle/base/cordis.patch.yml:349] [E: packages/bundle/base/cordis.patch.yml:350] [E: packages/bundle/base/cordis.patch.yml:352] `dsh-base` 的 `package.json` 依赖这两包。 [E: packages/bundle/base/package.json:85] [E: packages/bundle/base/package.json:86] `PROFILE_TEMPLATES` 的 `web` / `headless` 都先叠 `@deepseek-ai/dsh-base`。 [E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116] `dsh-headless` 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`；`dsh-web-app` 另插 `storage` / `workspace` / `session-projection-cache` 等，两边都**不再**写 `spill-local` / `spill-policy`。[I] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76]

2. **Definition 不是 shipped 行。** `SpillStore` 构造 `super(ctx, 'spillStore')`，由 `Service` 去 `reflect.provide`。`@deepseek-ai/dsh-spill` 本身不出现在任何 bundle `insert`。`LocalSpillStore` 继承后 `super(ctx)`，再按 config 钉死 `this.root`。 [E: packages/spill/spill/src/index.ts:47] [E: packages/spill/spill-local/src/index.ts:46] [E: vendor/cordis/src/service.ts:57]

3. **policy 在 load 时决定听不听。** `apply(ctx, config)`：`maxInlineBytes === undefined` 立刻 `return`，**零** listener。非负整数才继续；`!Number.isInteger` 或 `< 0` 时 load 抛 `spill-policy: maxInlineBytes must be a non-negative integer`，避免坏 cap 进 `TextRetainer` 把每次 oversized 调用打成 `isError`。 [E: packages/spill/spill-policy/src/index.ts:113] [E: packages/spill/spill-policy/src/index.ts:117] [E: packages/spill/spill-policy/src/index.ts:118] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:98] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:118] Loader 路径：模块**没有** `default` export；`unwrapExports` 仍看见 `name` / `inject` / `Config` / `apply`。 [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:104] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:107] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:109] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:110] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:111] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:112]

4. **两条臂都是 waterfall，都 `prepend: true`，都先 `await next()`。** Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：listener 不调用传入的 `next()` 就不会 `shift` 到下一层，内建行为也被 veto。`prepend` 用 `unshift` 把自己放在链外侧。policy 的写法是：先让内侧（后注册的 tool-owned 投影、hook）settle，再裁已经 accept 的文本。省略 `next()` = 工具自己的 post-execute / 默认 `{ kind: 'accept' }` / 默认「原样返回 `dispatch.content`」都不跑。 [E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:255] [E: packages/spill/spill-policy/src/index.ts:194] [E: packages/spill/spill-policy/src/index.ts:209] [E: packages/spill/spill-policy/src/index.ts:218] [E: packages/spill/spill-policy/src/index.ts:231]

5. **模型臂挂在 `tools/post-execute`。** registry 的 innermost 是 `() => Promise.resolve({ kind: 'accept' })`。policy 拿到 `decision` 之后立刻过滤：不是 `accept`、带 `value`、`exec.parent !== undefined`、或 `exec.name === 'read'` → `return decision`。`value` 与 `content` 互斥（registry 两边都给会抛），所以带 `value` 的 accept 交给 registry 再渲染，policy 不二次改 content。`read` 跳过是为了避免「模型看见 locator → 再 `read` 全文 → 又 spill → 再 read」。嵌套 Code Mode 子调用带着 `parent`，模型看不见这条 result（外层 `run_code` 才进 `deriveMessages()`），模型臂也不裁。 [E: packages/core/tools/src/index.ts:1745] [E: packages/spill/spill-policy/src/index.ts:196] [E: packages/spill/spill-policy/src/index.ts:197] [E: packages/core/tools/src/index.ts:1758] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:232] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:471]

6. **过了门才量字节。** `content = decision.content ?? result.content`。`flattenPlainText` 遇到任何非 `text` 块就放弃（整份结果不动）。UTF-8 `totalBytes <= maxInlineBytes` 也不动。超限才调用共享的 `spillReplacement(..., label: 'result')`。成功裁剪则返回 `{ kind: 'accept', content: [{ type:'text', text: replacedText }] }`，并原样带上 `additionalContexts`。 [E: packages/spill/spill-policy/src/index.ts:199] [E: packages/spill/spill-policy/src/index.ts:83] [E: packages/spill/spill-policy/src/index.ts:203] [E: packages/spill/spill-policy/src/index.ts:205] [E: packages/spill/spill-policy/src/index.ts:208] `block` / 带 `value` / nested / `read` 走 `return decision`：`next()` 给的 `block` 原样交回，policy 自己不构造 `block`，也不改 `isError`。 [E: packages/spill/spill-policy/src/index.ts:197] registry 用 `...result` 再盖 `content`，原来的成功 / 失败旗还在。测试：`run_code` 的 output-limit 诊断仍是 `isError: true`，同时模型文本带 locator。 [E: packages/core/tools/src/index.ts:1777] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:216] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:222]

7. **`spillReplacement` 是 fail-open。** 无 `sessionId`、`ctx.get('spillStore')` 为空、`saveText` throw、或拼出来的 replacement 字节仍 `> cap` → `undefined`，调用臂保留原文。notice 的最坏字节数（按 `totalBytes` 的精确省略文案 + locator + hint + `\n\n`）从 cap 里先扣掉，剩下的才给 `TextRetainer({ kind: 'headTail' })`。notice 自己已经大于 cap（极小 cap 或极长路径）时，宁可不换，也不发出超过广告 cap 的「裁剪结果」。已经写下的 spill 文件变成孤儿；`SpillStore` 没有 delete。 [E: packages/spill/spill-policy/src/index.ts:138] [E: packages/spill/spill-policy/src/index.ts:142] [E: packages/spill/spill-policy/src/index.ts:160] [E: packages/spill/spill-policy/src/index.ts:183] [E: packages/spill/spill-policy/src/index.ts:98] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:483] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:493] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:502]

8. **日志臂挂在 `tools/code-dispatch-log`。** `ToolRuntime.shapeDispatchLog` 的 innermost 是 `() => Promise.resolve(dispatch.content)`；listener 抛错被 contain，回退原始 `content`，**不会**让子调用失败。policy 先 `await next()`，再对纯文本超 cap 的副本 `spillReplacement(..., dispatch.subCallId, 'dispatch')`。这一臂**不**跳过 `read`：日志副本不是模型上下文，「read → spill → read」回环不会发生，而 `read` 正是会写出超大 log 的工具。程序侧：`createRunCodeTool` 的 `settle` **先** `resolve` 完整 `value` / error message，再把 `shapeDispatchLog` + `append('tool/code-dispatch')` 丢进 `logWork`。慢 `saveText` 不挡后续子调用绑定；测试钉死程序拿到 `length === 2000`，盘上 / 事件里才是 preview + locator。 [E: packages/core/tools/src/index.ts:1300] [E: packages/core/tools/src/index.ts:1304] [E: packages/spill/spill-policy/src/index.ts:217] [E: packages/spill/spill-policy/src/index.ts:228] [E: packages/core/tools/src/code-mode.ts:494] [E: packages/core/tools/src/code-mode.ts:503] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:272]

9. **local 写盘：私有根 + 排他创建。** `saveTextFile`：`sessionDir = <root>/session-<sha256(sessionId)[0:12]>`，`mkdir(..., 0o700)`，文件名 `<12 hex>-<encodeSegment(suggestedName)>`，`open(path, 'wx', 0o600)` 再 `writeFile` 全文。`'wx'` 遇已存在路径（含预埋 symlink）失败，所以 `saveText` reject，policy 走 fail-open。`encodeSegment` 把分隔符 / `../` 收成单段：空串 → `'~'`，整段 `.` → `'~002E'`，整段 `..` → `'~002E~002E'`。省略 config 时 `privateRoot()` 是 `mkdtempSync(join(tmpdir(), 'dsh-spill-'))` 的进程单例。retrievalHint 固定为 `Use read with offset/limit, or grep this path to search within it.` [E: packages/spill/spill-local/src/store.ts:74] [E: packages/spill/spill-local/src/store.ts:75] [E: packages/spill/spill-local/src/store.ts:109] [E: packages/spill/spill-local/src/store.ts:111] [E: packages/spill/spill-local/src/store.ts:113] [E: packages/spill/spill-local/src/store.ts:115] [E: packages/spill/spill-local/src/store.ts:49] [E: packages/spill/spill-local/src/store.ts:50] [E: packages/spill/spill-local/src/store.ts:51] [E: packages/spill/spill-local/src/store.ts:28] [E: packages/spill/spill-local/src/index.ts:60]

10. **HMR / dispose。** listener 登记走 `fiber.effect`；卸掉 `spill-policy` fiber 后 oversized 结果原样通过，不再多一次 `saveText`。 [E: vendor/cordis/src/events.ts:256] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:601]

这些事件**不是** `session/flush`（那是 **parallel**，没有 `next()`），也不是 emit。`tools/result` 才是 post-execute 之后的 emit，policy 不听它。 [E: packages/core/session/src/index.ts:85] [E: packages/core/tools/src/index.ts:197]

## 设计动机

DSH 是组合运行时，不是「内存 messages + 事后整包截断」的 coding agent。模型下一轮看见的 `messages` 必须能从 append-only log 的 `surfaceOp` 重建（**model-visible ⟺ logged**）。oversized 工具输出如果整段留在 `tool/result` 里，下一步请求会把它再喂回模型；若在 tool body 里偷偷丢掉，log 与请求会对不上。spill 把「全文」卸到 session 私有工件，把「preview + locator」写进将要 `append` 的 content：投影变短，合同仍成立。

把存储收成 `saveText` 一条缝，是为了换 backend 不必改 policy：本地路径、远程 URI 都只是 locator + `retrievalHint`。policy 不 `inject` `spillStore`，用 `ctx.get`，这样没挂 Provider 的测试树 / 精简 profile 仍能跑工具，只是不裁。

两条臂分开：模型臂裁的是下一轮 `deriveMessages()` 会看见的顶层 result；日志臂裁的是 `run_code` 子调用写进 `tool/code-dispatch` 的副本。程序已经拿走完整 `value`，不能为了写盘把 SDK 绑定挂住。`read` 在模型臂跳过、在日志臂裁，是同一条回环理由的两面。

fail-open 是产品门：磁盘满、没挂 store、notice 比 cap 还长，都比「成功的 `web_fetch` 突然变 `isError`」便宜。坏 cap 必须在 load 失败，不能在第一次 oversized 调用时爆炸。

`prepend` + 先 `next()`，是为了让 tool-owned 投影（例如搜索工具自己的 formatted 页脚）先跑完，再套一层通用字节帽。后挂的 hook 若替换了 content，同样被帽住；它若改的是 `value` 或 `block`，policy 放手。

local 默认不写 `$DSH_HOME`：`mkdtemp` + `0700`/`0600` + 随机前缀 + `'wx'`，避免把 tool 输出丢到世界可读路径，也避免共享根上的 symlink 劫持。这跟 JSONL 的 `dshHomePath('sessions')` 不是同一棵树。

## Gotcha

- **省略 `maxInlineBytes` = 完全没 listener。** 不是「无限大 cap」。测试：1000 字节正文原样回来，`saves.length === 0`。 [E: packages/spill/spill-policy/src/index.ts:113] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:98]
- **`read` 只在模型臂跳过。** 日志臂会 spill `read` 子调用。不要写成「spill 从不碰 `read`」。 [E: packages/spill/spill-policy/src/index.ts:197] [E: packages/spill/spill-policy/src/index.ts:228]
- **`exec.parent` 只挡模型臂。** 子调用的模型面 result 保持完整（程序也拿完整 `value`）；要裁的是 `tools/code-dispatch-log`。 [E: packages/spill/spill-policy/src/index.ts:197] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:471]
- **带 `value` 的 accept 不裁。** 那是「请 registry 按 output schema 再 render」的通道，与「我已经换好 content」互斥。 [E: packages/spill/spill-policy/src/index.ts:196] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:567]
- **非纯文本不动。** 夹一个 `reasoning` 块就整份放过，即使文本部分已经超 cap。 [E: packages/spill/spill-policy/src/index.ts:83] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:184]
- **replacement 自己超 cap → 留原文。** 极小 cap 或极长 locator 时，notice 单独就放不进预算。此时可能已经写下孤儿文件。 [E: packages/spill/spill-policy/src/index.ts:183] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:161]
- **没 store / `saveText` 抛 / 无 session owner → 留原文，`isError` 仍是 false（成功路径）。** 警告打在 `ctx.logger.warn`。 [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:484] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:493] [E: packages/spill/spill-policy/tests/spill-policy.spec.ts:494]
- **waterfall 漏 `next()` 等于停整条链。** policy 若先裁再决定要不要 `next()`，tool-owned 投影与默认 accept 都到不了。 [E: vendor/cordis/src/events.ts:238]
- **bash / pwsh 的 `spillPath` 不是本缝。** 那是执行器按 `maxOutputBytes` 切流时自己写的文件。`spill-policy` 看到的是已经 render 完的纯文本 result。
- **没有 GC，没有检索 API。** `SpillStore` 只有 `saveText`。owner 永远是当前 `exec` 的 `header.id`；fork 之后新写入落在子会话目录。seed 日志里已经写出的 locator 字符串不会被本缝改写。[I]
- **`privateRoot()` 是进程单例。** 两次调用共用同一 `mkdtemp` 目录；省略 `root` 的 `LocalSpillStore` 钉到这份根。要可预测路径必须显式配 `root`。 [E: packages/spill/spill-local/src/store.ts:28] [E: packages/spill/spill-local/tests/spill-local.spec.ts:111] [E: packages/spill/spill-local/tests/spill-local.spec.ts:135]
- **compaction 不靠本缝删 log。** 模型历史要再缩短，走 `surfaceOp: { op: 'replace', start, end }`（`SurfaceOp` 只有 `'append'` 与该 replace 变体，没有 delete）。`Session` 的 `this.log` 只 `push`。 [E: packages/core/session/src/types.ts:373] [E: packages/core/session/src/types.ts:374] [E: packages/core/session/src/index.ts:426] [E: packages/core/session/src/index.ts:643]

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 / 合同 | base | web-app | headless |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-spill` 的 `SpillStore` / `SaveTextSpill` / `SpillRef` | `ctx.spillStore`；唯一方法 `saveText`。同 realm 第二份实现抛错 | **无**独立 Cordis 行 | 无 | 无 |
| Provider | `@deepseek-ai/dsh-spill-local` 的 `LocalSpillStore` | 同一 `ctx.spillStore`。默认 `privateRoot()`（`mkdtemp`）；可选 `root` | `id: spill-local`，**无** `config` | **继承** base，不重挂 | **继承** base，不重挂 |
| Consumer | `@deepseek-ai/dsh-spill-policy` 的 `apply` / `spillReplacement` | `inject: ['tools']`；`ctx.get('spillStore')` 机会读取。`tools/post-execute` 与 `tools/code-dispatch-log` 都是 **waterfall**，必须先 `next()` | `id: spill-policy`，`maxInlineBytes: 50000` | **继承** 同一 cap | **继承** 同一 cap |

换 Provider（另一套 locator / hint）只换 `saveText` 的落点；不能改 `PostToolDecision` 合同，也不能让失败存储把成功 tool 打成 `isError`。preset 若再 `provide` 一份 `spillStore` 且不 `isolate`，会撞上 host 面服务泄漏检查（`leakedServices`），与其它 process-global 缝相同。[I] policy 不是 Provider：它登记的是可逆 `ctx.on` listener。个别工具可以另外 `ctx.get('spillStore')` 写自己的 formatted 工件，那是另一组 Consumer，不经过本页的两条臂。

## Sources

- packages/spill/spill/src/index.ts
- packages/spill/spill/src/types.ts
- packages/spill/spill/tests/service.spec.ts
- packages/spill/spill-local/src/index.ts
- packages/spill/spill-local/src/store.ts
- packages/spill/spill-local/tests/spill-local.spec.ts
- packages/spill/spill-policy/src/index.ts
- packages/spill/spill-policy/src/types.ts
- packages/spill/spill-policy/tests/spill-policy.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/core/tools/src/index.ts
- packages/core/tools/src/code-mode.ts
- packages/core/session/src/types.ts
- packages/core/session/src/index.ts
- packages/boot/app-boot/src/profile.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/service.ts

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)：`tools/pre-execute → execute → post-execute`；`parent` token 如何重入同一管线。
- [subsys.core.tools](../core/tools.md)：`ToolRuntime`、`PostToolDecision`、`shapeDispatchLog` 的 contain 回退。
- [subsys.core.code-mode](../core/code-mode.md)：`run_code` 子调度；`tools/code-dispatch-log` 必须 `next()`；程序值与 durable 副本分家。
- [spine.session-log](../../spine/session-log.md)：`deriveMessages()`；`surfaceOp` 只有 append / replace，没有 delete；checkpoint 落点不在本缝。
- [spine.overview](../../spine/overview.md)：`profile → bundle → agent preset`；host 面 vs agent-preset 面。
- [subsys.core.session](../core/session.md)：`Session.append` / `SessionStore`；`session/flush` 是 parallel。
