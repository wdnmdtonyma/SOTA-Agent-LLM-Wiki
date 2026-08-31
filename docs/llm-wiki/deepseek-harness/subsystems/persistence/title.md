---
id: subsys.persistence.title
title: 会话标题
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session/session-title/src/index.ts
  - packages/session/session-title/src/normalize.ts
  - packages/session/session-title/src/types.ts
  - packages/session/session-title/src/invariant.ts
  - packages/session/session-title/tests/session-title.spec.ts
  - packages/session/session-title/tests/provider.spec.ts
  - packages/session/session-title/tests/rename.spec.ts
  - packages/session/session-title/tests/projection.spec.ts
  - packages/session/session-title-llm/src/index.ts
  - packages/session/session-title-llm/tests/llm.spec.ts
  - packages/session/session-title-first-prompt-llm/src/index.ts
  - packages/session/session-title-first-prompt-llm/tests/loader-composition.spec.ts
  - packages/session/session-title-first-prompt-llm/tests/provider.spec.ts
  - packages/session/session-title-all-prompts-llm/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/core/session/src/types.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/surface.ts
  - packages/core/agent-loop/src/invariant.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-persistence-sqlite/src/schema.ts
  - packages/settings/settings/src/index.ts
  - packages/llm/llm/src/types.ts
  - packages/llm/llm/src/call-config.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/llm/llm-deepseek/src/serialize.ts
  - packages/api/session-controller/src/commands.ts
  - packages/api/session-controller/src/index.ts
  - packages/session-query/session-query/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - SessionTitleService
  - foldSessionTitle
  - registerSessionTitleLlmProvider
  - session-title-first-prompt-llm
related:
  - spine.session-log
  - subsys.persistence.projection
  - subsys.core.session
  - spine.overview
  - spine.capability-seams
  - subsys.persistence.session-query
  - subsys.persistence.checkpoint
  - subsys.persistence.jsonl
  - subsys.persistence.storage
  - subsys.host.apiproxy
evidence: explicit
status: verified
updated: 0a53fb55be
---

> `ctx.sessionTitle` 是 **host 面** 的 log-only 标题服务：真相只有 append-only 日志里最新一条 `session/title`，由 `foldSessionTitle()` 折叠；它**不进** `deriveMessages()`。`dsh-base` 挂确定性 fallback（5 words / 40 bytes，`maxTitleBytes: 80`）和一行 `id: session-title-llm`，但该行的 `name` 是 `@deepseek-ai/dsh-session-title-first-prompt-llm`。全局 **一个** provider 槽。这是 Cordis 组合运行时（`profile → bundle → agent preset`）的 capability seam（Definition / Provider / Consumer），不是又一份可就地改写的 chat 数组。

## 能回答的问题

- 会话标题写在哪？为什么 `session/title` 不进 `deriveMessages()`？和 compaction 的 `surfaceOp: replace` 是不是一回事？
- `dsh-base` 的 `id: session-title-llm` 实际加载哪个包？`session-title-all-prompts-llm` 为什么不能叠上去？
- `first-prompt` 在什么条件下才调度？`source.kind === 'user'` 的 pin 怎样停掉自动路径？`refresh` 怎样 unpin？
- 辅助 LLM 调用的 `purpose` 是什么？为什么必须先 `append('session/title-llm-request')` 再 `ctx.llm.stream`？这条 waterfall 谁必须 `next()`？
- projection key `'title'` 什么时候注册？web-app / headless / sdk / acp 有没有再挂一行？

## 职责边界

本包拥有：`SessionTitleService`（`ctx.sessionTitle`）对 `session/title` 的写出与折叠、确定性 fallback、单一 `SessionTitleProvider` 槽、`rename` / `refresh` 的 pin-unpin、以及 projection unit `key: 'title'`（另有 `titleInput`）。`@deepseek-ai/dsh-session-title-llm` 拥有共享辅助调用（`purpose: 'session-title'`、`session/title-llm-request`、route / timeout / framing）。`@deepseek-ai/dsh-session-title-first-prompt-llm` 是 shipped 的唯一 cadence 插件（`automatic: 'first-prompt'`）。

本包**不**拥有：append-only log / `deriveMessages()` / `SurfaceOp`（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）；projection registry 与 cache（[subsys.persistence.projection](projection.md)）；`session/flush` 写窗（[subsys.persistence.checkpoint](checkpoint.md)）；shipped JSONL 盘（[subsys.persistence.jsonl](jsonl.md)）；KV `storage` 三件套（现挂在 **base**；[subsys.persistence.storage](storage.md)）；FTS / `readTitle` 的 corpus 梯子（shipped `openAt: never`；[subsys.persistence.session-query](session-query.md)）；`session.rename` Host Remote 的 wire 帧（[subsys.host.apiproxy](../host/apiproxy.md)，实现在 `dsh-api-session-controller`）。

`SessionTitleService` 是 **host 面**进程级服务。`static inject = ['sessions', 'sessionProjections']`：没有这两项服务则插件挂起。agent-preset 面不另造一份 `sessionTitle`；preset 只决定这一会话的 tools / persona / isolate。shipped profile 是 `web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）；默认 Web 入口是 `dsh --profile web`（`dsh web`），也可用 `dsh --profile sdk|sdk-minimal|acp`。本仓没有 shipped TUI 包。Client 半边只消费折叠后的字符串（projection 或 query），不拥有 title store。

正交、写错会污染邻页的事实（本页只点名）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `0`）。 [E: packages/core/session/src/types.ts:51]
- SQLite **session 盘** `SCHEMA_VERSION = 20`：`user_version` 非 0 且不等于 20 → 拒开，原地不迁。该 backend **不**在任何 shipped bundle。 [E: packages/session/session-persistence-sqlite/src/schema.ts:19] [E: packages/session/session-persistence-sqlite/src/schema.ts:125]
- checkpoint 在 `llm/stream` 进 adapter **之前**（live `sessionId` 则 `sessions.flush` 再 `yield* next()`）、以及 top-level `tools/execute` 进 tool body **之前** `sessions.flush`。嵌套 `exec.parent` 不再刷。`agent/pre-step` 另有一条耐久刷盘。辅助标题请求带 live `sessionId`，会走同一条 `llm/stream` flush。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:67] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:80]
- compaction 只有 `surfaceOp: { op: 'replace', start, end }`，没有 delete。`session/title` 不是 surface 类型，compaction 不阴影它。 [E: packages/core/session/src/types.ts:359] [E: packages/core/session/src/types.ts:330]
- settings 分层：schema defaults → composition `base` → 用户文档 section。`SettingsScope.get()` 按这个顺序解析。 [E: packages/settings/settings/src/index.ts:117]
- 组合 / adapter Config 里可放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。 [E: packages/llm/llm-deepseek/src/index.ts:178]
- shipped 默认 session 盘挂在 base：`id: session-persistence-jsonl` / `name: '@deepseek-ai/dsh-session-persistence-jsonl'`，`root: dshHomePath('sessions')`。web-app / headless **继承**这一行，自己不重挂。 [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:111] [E: packages/bundle/base/cordis.patch.yml:113]
- `storage` + `storage-json`（`root: dshHomePath('storages')`）+ `storage-domain`（`backend: json`）以及 `session-projection-cache` 现挂在 **base**（不再是只 web-app）。web-app 另 insert `workspace` / `session-log-export` / `session-stats` 等。 [E: packages/bundle/base/cordis.patch.yml:145] [E: packages/bundle/base/cordis.patch.yml:148] [E: packages/bundle/base/cordis.patch.yml:153] [E: packages/bundle/base/cordis.patch.yml:162] [E: packages/bundle/web-app/cordis.patch.yml:59] [E: packages/bundle/web-app/cordis.patch.yml:61] [E: packages/bundle/web-app/cordis.patch.yml:72]
- shipped `session-query-sqlite` 写在 base：`path: ':memory:'`、`openAt: never`。 [E: packages/bundle/base/cordis.patch.yml:129] [E: packages/bundle/base/cordis.patch.yml:132] [E: packages/bundle/base/cordis.patch.yml:133]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-title/src/index.ts` | `SessionTitleService`、`foldSessionTitle`、`collectSessionTitleMessages`、`rename` / `refresh` / `register`、`title` / `titleInput` projection |
| `packages/session/session-title/src/normalize.ts` | `normalizeSessionTitle` / `fallbackSessionTitle` / `truncateTitleUtf8` |
| `packages/session/session-title/src/types.ts` | projection 表 merge：`title: string \| null`、`titleInput` |
| `packages/session/session-title-llm/src/index.ts` | `registerSessionTitleLlmProvider`、`generateSessionTitleWithLlm`、`session/title-llm-request` |
| `packages/session/session-title-first-prompt-llm/src/index.ts` | shipped cadence：`name = 'session-title-first-prompt-llm'`，`automatic: 'first-prompt'` |
| `packages/session/session-title-all-prompts-llm/src/index.ts` | 仓库有、**未 shipped** 的 `automatic: 'all-prompts'` 插件 |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: session-title` 与 `id: session-title-llm`；同层 jsonl / query / storage 三件套 / projection cache |
| `packages/bundle/web-app/cordis.patch.yml` | **不**重挂 title / jsonl；insert session-controller（Host `rename`） |
| `packages/bundle/headless/cordis.patch.yml` | `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`；继承 base 的 title / jsonl |
| `packages/api/session-controller/src/commands.ts` | Host Remote `rename`：`ctx.get('sessionTitle')`，无服务则 `renaming is unavailable` |
| `packages/session/session-title/tests/session-title.spec.ts` | fallback 落地；`deriveMessages()` 长度不变 |
| `packages/session/session-title/tests/provider.spec.ts` | 单槽、fork 跳过 first-prompt |
| `packages/session/session-title/tests/rename.spec.ts` | `source.kind === 'user'` pin |
| `packages/session/session-title-first-prompt-llm/tests/loader-composition.spec.ts` | Loader 真树把 first-prompt 登记成 provider id |

## 数据模型

| 符号 | 要点 |
|---|---|
| `session/title` | log-only 事件。payload：`title`、`messageSeqs`、`source`。latest-wins。禁止带 `surfaceOp`。 [E: packages/session/session-title/src/index.ts:76] |
| `SessionTitleSource` | `'fallback'` / `'provider'`（带 `provider` id 与可选 `model`）/ `'user'`。`'user'` 钉死自动路径。 [E: packages/session/session-title/src/types.ts:27] |
| `SessionTitleSnapshot` | `foldSessionTitle` 的结果：payload + `eventSeq` + `updatedAt`。 [E: packages/session/session-title/src/index.ts:281] |
| `session/title-llm-request` | 辅助模型调用的预派遣记录：`titleProvider`、`messageSeqs`、`route`、`system`、`messages`、`maxTokens`。同样 log-only。 [E: packages/session/session-title-llm/src/index.ts:44] |
| `SessionTitleAutomaticMode` | `'first-prompt'` \| `'all-prompts'`。shipped 只有前者。 [E: packages/session/session-title/src/index.ts:91] |
| `SessionTitleUserMessage` | 合格人类文本：`source.kind === 'user'`，且规范化后非空。 [E: packages/session/session-title/src/index.ts:131] |
| `Config`（title 服务） | `fallbackMaxWords` / `fallbackMaxBytes` / `maxTitleBytes`。包内无默认；base 写成 `5` / `40` / `80`。 [E: packages/bundle/base/cordis.patch.yml:51] |
| `SessionTitleLlmConfig` | `targetWords` / `targetCjkCharacters` / `maxInputBytes` / `maxOutputTokens` / `timeoutMs`，可选成对 `provider`+`model`。包内无默认。 [E: packages/session/session-title-llm/src/index.ts:52] |
| projection `title` | `string \| null`。`init = null`；`apply` 只在 `session/title` 上换成 `event.data.title`。另有 `titleInput`（first / count / lastSeq）。 [E: packages/session/session-title/src/index.ts:267] [E: packages/session/session-title/src/types.ts:81] |
| `GenerateOptions.purpose` | `'compaction' \| 'session-title'`。普通对话请求不设。 [E: packages/llm/llm/src/types.ts:428] |

`SurfaceEventType` 只有 `user/message` / `assistant/message` / `tool/result`。`session/title` 与 `session/title-llm-request` 走 `deriveEventMessage` 的 `default` 分支，投影为 `null`。 [E: packages/core/session/src/types.ts:330] [E: packages/core/session/src/surface.ts:112]

## 控制流

1. **host 面挂两行，preset 不重挂。** `dsh-base` 插入 `id: session-title` / `name: '@deepseek-ai/dsh-session-title'`，config 为 `fallbackMaxWords: 5`、`fallbackMaxBytes: 40`、`maxTitleBytes: 80`；紧挨着插入 `id: session-title-llm`，但 `name` 是 `@deepseek-ai/dsh-session-title-first-prompt-llm`，config 为 `targetWords: 5`、`targetCjkCharacters: 10`、`maxInputBytes: 4096`、`maxOutputTokens: 64`、`timeoutMs: 60000`（**没有**成对 `provider`/`model`，因此走当时 logged 的主请求 route）。同层还挂 shipped 默认盘 `id: session-persistence-jsonl`，以及 `id: session-query-sqlite`（`path: ':memory:'`、`openAt: never`）。`dsh-web-app` **不**重挂 title / jsonl；它 insert `session-controller`（Host `rename`）以及 workspace / stats / export 等。`dsh-headless` 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`，继承 base 的 title / jsonl 行。叠 `dsh-base` 的 `sdk` / `acp` 同样继承这两行；`sdk-minimal` 不叠 base，默认没有 title 服务。 [E: packages/bundle/base/cordis.patch.yml:48] [E: packages/bundle/base/cordis.patch.yml:55] [E: packages/bundle/base/cordis.patch.yml:56] [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:133] [E: packages/bundle/web-app/cordis.patch.yml:86] [E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/headless/cordis.patch.yml:22] [E: packages/bundle/headless/cordis.patch.yml:26]

2. **服务占住 `ctx.sessionTitle`。** `SessionTitleService` `static inject = ['sessions', 'sessionProjections']`，构造里 `super(ctx, 'sessionTitle')`。没有这两项时插件挂起。这是进程级 service，不是 preset isolate 里的私有实例。 [E: packages/session/session-title/src/index.ts:295] [E: packages/session/session-title/src/index.ts:310]

3. **projection unit 必挂。** 构造里直接 `ctx.sessionProjections.register(titleProjectionDefinition)`：`key: 'title'`，`apply` 在 `event.type === 'session/title'` 时换成 `event.data.title`，否则原样返回。同时注册 `titleInput`（eligible 人类消息的 first/count/lastSeq）。卸掉 title 服务会丢掉这两个 key。 [E: packages/session/session-title/src/index.ts:337] [E: packages/session/session-title/src/index.ts:339] [E: packages/session/session-title/src/index.ts:267] [E: packages/session/session-title/tests/projection.spec.ts:27]

4. **`session/event` 是 emit，没有 `next()`。** 签名是 `(session, event): void`，`@mode emit`。title 服务在这条 emit 上分流：`user/message` → `onUserMessage`；`request/header` → `onRequestHeader`。observer 失败不能回滚已提交事件。 [E: packages/core/session/src/index.ts:74] [E: packages/session/session-title/src/index.ts:355]

5. **合格人类文本才点火。** `sessionTitleUserMessageOf` / `collectSessionTitleMessages` 只收 `type === 'user/message'` 且 `source.kind === 'user'` 的事件，把 text block 拼起来；规范化后长度为 0 的跳过。plugin-sourced / 纯 reasoning / 空白文本都不算 eligible。`onUserMessage` 对不合格事件直接 return。 [E: packages/session/session-title/src/index.ts:131] [E: packages/session/session-title/src/index.ts:499] [E: packages/session/session-title/tests/session-title.spec.ts:114]

6. **`source.kind === 'user'` 是 pin。** 最新折叠标题若是用户改名，`onUserMessage` 立刻 return：不调度 provider，也不再自动覆盖。`rename` 把规范化后的非空字符串 `append('session/title', { messageSeqs: [], source: { kind: 'user' } })`，并 `supersede` 正在飞的自动生成。规范化为空抛 `SessionTitleInvalidError`。 [E: packages/session/session-title/src/index.ts:501] [E: packages/session/session-title/src/index.ts:405] [E: packages/session/session-title/src/index.ts:410] [E: packages/session/session-title/src/index.ts:413] [E: packages/session/session-title/tests/rename.spec.ts:71]

7. **first-prompt 只在三个条件同时成立时把工作放进 `pending`。** `automatic === 'all-prompts'` 则每条合格人类消息都调度；否则必须 `header.parentSession === undefined` **且** `titleInput.count === 1` **且** `get(session) === undefined`（尚无任何 `session/title`）。fork 子会话带着 `parentSession` 和继承下来的 title 事件，first-prompt 的 `generate` 一次都不会被叫。eligible 计数来自 `titleInput` projection，不再每次扫整条 log。 [E: packages/session/session-title/src/index.ts:505] [E: packages/session/session-title/src/index.ts:506] [E: packages/session/session-title/tests/provider.spec.ts:89]

8. **fallback 与 provider 解耦，fallback 先落地。** `onUserMessage` 无论是否调度 provider，都 `defer(ensureFallback)`。`ensureFallback` 若已经有任何 title 就原样返回；否则用 `titleInput.first` 跑 `fallbackSessionTitle(text, fallbackMaxWords, fallbackMaxBytes)`，再 `append('session/title', { source: { kind: 'fallback' }, messageSeqs: [first.seq] })`。空结果（字节帽吃不下）不写事件。测试：第一条合格 prompt 之后 `deriveMessages()` 长度仍是 1，`surface.nodes` 只有那条 `user/message`。 [E: packages/session/session-title/src/index.ts:513] [E: packages/session/session-title/src/index.ts:797] [E: packages/session/session-title/src/index.ts:800] [E: packages/session/session-title/src/normalize.ts:70] [E: packages/session/session-title/tests/session-title.spec.ts:73]

9. **自动 LLM 工作等主请求 route 钉死。** `onRequestHeader` 只在 `pending.throughSeq < header.seq` 时用 header 里的 `config.provider` / `config.model` 调用 `startPending`。同一 route 不再写新 `request/header` 时，靠 `llm/stream` 上的 `onMainRequest`：必须 `isAgentLoopRequest(options)`、live session、当前边界是 `step/start` 且 seq 晚于 `throughSeq`、folded header 的 provider/model 与这次 options 一致，才 `startPending`。辅助标题请求**不会**走进这条臂。 [E: packages/session/session-title/src/index.ts:528] [E: packages/session/session-title/src/index.ts:538] [E: packages/llm/llm/src/call-config.ts:77]

10. **`llm/stream` 是 waterfall，本层必须 `next()`。** Cordis `Events.waterfall` 把最后一个参数当 innermost `next`；listener 不调用传入的 `next()` 就不会 `shift` 到下一层。title 服务以 `{ global: true, prepend: true }` 挂上：先 `onMainRequest(options)`，再 **`return next()`**。漏掉 `next()` = 主对话和辅助标题都到不了 adapter。 [E: vendor/cordis/src/events.ts:237] [E: packages/session/session-title/src/index.ts:367] [E: packages/session/session-title/src/index.ts:369]

11. **同链上的另两个 listener。** `dsh-agent-loop` invariant 也 prepend：`!isAgentLoopRequest(options)` 时直接 `return next()`，所以 `purpose: 'session-title'` 的辅助请求不会被拿去跟 `deriveMessages()` 对账。`session-checkpoint-policy` 看见 live `sessionId` 就 `await ctx.sessions.flush(session)` **再** `yield* next()`；title 辅助请求带 `sessionId`，因此 `session/title-llm-request` 会在进 adapter 之前刷进 persistence。`session/flush` 本身是 **parallel**（没有 `next`），不是 waterfall。 [E: packages/core/agent-loop/src/invariant.ts:22] [E: packages/session/session-checkpoint-policy/src/index.ts:67] [E: packages/core/session/src/index.ts:83]

12. **单一 provider 槽。** `register` 在已有 `this.registration` 时抛 `already registered`。disposal 先 abort 再 `drain`，然后才允许下一个。`session-title-all-prompts-llm` 的 `apply` 同样调用 `registerSessionTitleLlmProvider(..., 'all-prompts', messages => messages)`；叠到 shipped first-prompt 上会在第二行 load 时互斥失败。该包**不**出现在任何 shipped bundle。 [E: packages/session/session-title/src/index.ts:472] [E: packages/session/session-title/tests/provider.spec.ts:260] [E: packages/session/session-title-all-prompts-llm/src/index.ts:35]

13. **first-prompt 插件只把第一条消息交给共享 LLM helper。** `export const name = 'session-title-first-prompt-llm'`，`inject = ['sessionTitle', 'llm', 'sessions']`。`apply` 调 `registerSessionTitleLlmProvider(ctx, config, name, 'first-prompt', selector)`；selector 在 `messages[0]` 缺失时抛 `requires one human message`，否则返回 `[first]`。显式 `refresh` 也只框第一条，后到的人类文本进不了 framing。Loader 组合测试把 provider id 记成 `'session-title-first-prompt-llm'`。 [E: packages/session/session-title-first-prompt-llm/src/index.ts:11] [E: packages/session/session-title-first-prompt-llm/src/index.ts:12] [E: packages/session/session-title-first-prompt-llm/src/index.ts:35] [E: packages/session/session-title-first-prompt-llm/src/index.ts:37] [E: packages/session/session-title-llm/src/index.ts:163] [E: packages/session/session-title-first-prompt-llm/tests/loader-composition.spec.ts:117]

14. **辅助调用先记账再派流。** `generateSessionTitleWithLlm`：检查 `selectedMessages` 非空、framed JSON 不超过 `maxInputBytes`；`resolveRoute` 优先成对 config，否则用 `request.route`（来自 `request/header`），两者都缺就抛。然后 `deepFreeze` 一份 `GenerateOptions`：`purpose: 'session-title'`、`sessionId: request.session.id`、`maxTokens: config.maxOutputTokens`、`isAgentLoopRequest === false`。**先** `session.append('session/title-llm-request', …)`，**再** `ctx.llm.stream(options)`。DeepSeek 官方 adapter 看见该 purpose 强制 `thinking: 'disabled'`。finish 不是 `stop`（`max-tokens` / `tool-calls` / `error` / `aborted`）或输出规范化为空 → throw，不写 `session/title`。 [E: packages/session/session-title-llm/src/index.ts:260] [E: packages/session/session-title-llm/src/index.ts:263] [E: packages/session/session-title-llm/tests/llm.spec.ts:158] [E: packages/llm/llm-deepseek/src/serialize.ts:84]

15. **provider 结果过服务门才进 log。** `runProvider` 先 `ensureFallback`，再 `generate`，再 `validateResult`（title 规范化后非空；`messageSeqs` 必须是本次 snapshot 里唯一、升序的 seq），最后 `append('session/title', { source: { kind: 'provider', provider, model? } })`。revision / signal 过期则 `assertCurrent` 丢弃，晚到的结果盖不掉 pin。 [E: packages/session/session-title/src/index.ts:593] [E: packages/session/session-title/src/index.ts:603] [E: packages/session/session-title/src/index.ts:604]

16. **`refresh` 是唯一自动 unpin。** 有活着的 provider 时 `supersede` 旧工作并强制跑一轮。没有 provider 但当前是 `source.kind === 'user'` 且能推出 fallback 时，同步 `appendFallback` 盖住 pin。推导不出非空 fallback 则 pin 留下。 [E: packages/session/session-title/src/index.ts:442] [E: packages/session/session-title/src/index.ts:443] [E: packages/session/session-title/tests/rename.spec.ts:103]

17. **读路径不碰可变 metadata。** `get(session)` = `foldSessionTitle(session.events)`：`findLast(type === 'session/title')`，再深冻一份 snapshot。`Session.deriveMessages()` 只扫 `surface.nodes`；`session/title` 从未进入 nodes。session-query 的 `readTitleSnapshots` 对 live-优先 corpus 调同一个 `foldSessionTitle`。Host Session Controller 的 `rename` 取 `ctx.get('sessionTitle')`，没有服务就 `renaming is unavailable`；`SessionTitleInvalidError` 映射为 `session/title-invalid`。 [E: packages/session/session-title/src/index.ts:385] [E: packages/core/session/src/index.ts:724] [E: packages/session-query/session-query/src/index.ts:230] [E: packages/api/session-controller/src/commands.ts:163] [E: packages/api/session-controller/src/commands.ts:165] [E: packages/api/session-controller/src/commands.ts:172] [E: packages/api/session-controller/src/index.ts:300]

## 设计动机

DSH 是组合运行时，合同是 **model-visible ⟺ logged**。标题是给人读列表 / rename 对话框用的，不是给下一轮模型看的，所以它必须是 log-only：写进同一条 append-only 日志（resume / fork / query 都能 `findLast`），但绝不能进 `deriveMessages()`。Peer harness 常见的「会话对象上挂一个可变 `title` 字段、磁盘另存一份」在这里会让 fork 丢标题、让 crash reload 对不上、让 client 列表和 log 各说各话。

fallback 与 LLM 拆开，是为了列表行在辅助模型还没回来（或根本没挂 provider）时就有可读字符串。provider 成功后再 append 一条 `session/title` 盖住 fallback；失败则留下 fallback。全局单槽是为了避免 first-prompt 与 all-prompts 同时改同一条 latest-wins 记录。`automatic: 'first-prompt'` 拒绝 fork / 子会话 / 已有 title，避免把 parent 的标题或第二条 follow-up 再烧一次 token。

`purpose: 'session-title'` 把辅助调用从 loop invariant 里摘出去：请求消息是 JSON-framed 的人类文本，不是 `deriveMessages()`。同时它仍带 `sessionId`，所以 checkpoint 仍会在 adapter 之前把 `session/title-llm-request` 刷盘——辅助花费与主对话共享同一条耐久屏障。

## Gotcha

- **`session/title` 不是 surface。** 给它带 `surfaceOp` 会被 `Session.append` 拒。它也不参与 compaction 的 `replace` 阴影。 [E: packages/core/session/src/types.ts:330]
- **没有 delete，标题靠 latest-wins。** 改名、fallback、provider 修订都是再 append 一条；`this.log` 只增不减。 [E: packages/session/session-title/src/index.ts:282]
- **first-prompt 看的是调度瞬间的 `get() === undefined`。** fallback 的 `defer` 与 `pending` 写入是同一次 `onUserMessage` 里先后发生的：pending 先记下，fallback 随后落地，provider 仍会在 header / loop stream 之后跑并把 fallback 盖掉。已经有 title 的会话（含 fork 继承）不会再调度 first-prompt。 [E: packages/session/session-title/src/index.ts:506]
- **pin 不是写保护整条 log。** `rename` 只阻止**自动**路径。`refresh` 会有意盖掉 `source.kind === 'user'`。 [E: packages/session/session-title/src/index.ts:442]
- **`llm/stream` 漏 `next()` 等于停整条链。** title 服务、loop invariant、checkpoint 都挂在这条 waterfall 上。`session/flush` 没有 `next()`，不要拿 parallel 当 veto。 [E: packages/session/session-title/src/index.ts:369] [E: packages/core/session/src/index.ts:83]
- **辅助请求仍会 `flush`。** `purpose: 'session-title'` 跳过 loop invariant，**不**跳过 checkpoint。 [E: packages/session/session-checkpoint-policy/src/index.ts:67] [E: packages/llm/llm/src/types.ts:428]
- **两个 LLM 标题包互斥。** `register` 只留一个槽；把 `session-title-all-prompts-llm` 叠到 base 的 first-prompt 行上会在 load 时炸。要换 cadence，先 disable / 卸掉 `id: session-title-llm`。 [E: packages/session/session-title/src/index.ts:472]
- **shipped first-prompt 默认跟主模型走。** base 行 config 只有 `targetWords` / `targetCjkCharacters` / `maxInputBytes` / `maxOutputTokens` / `timeoutMs`，没有成对 `provider`/`model`；未 logged route 且也没配这对字段时，`resolveRoute` 抛错，fallback 留下。 [E: packages/bundle/base/cordis.patch.yml:57] [E: packages/session/session-title-llm/src/index.ts:180]
- **规范化会吃掉标题。** OSC/CSI/控制符/方向符会被剥掉；UTF-8 字节帽按 code point 截断。`😀😀` 在 3-byte fallback 帽下推不出 fallback，pin 会留下。 [E: packages/session/session-title/src/normalize.ts:59] [E: packages/session/session-title/tests/rename.spec.ts:178]
- **`messageSeqs` 合同。** 自动标题必须引用至少一条人类 seq；用户改名必须是 `[]`。`session-title-invariant` 在 `internal/dispatch` 上当 `(messageSeqs.length === 0) !== (source.kind === 'user')` 时 `fail`。 [E: packages/session/session-title/src/index.ts:412] [E: packages/session/session-title/src/invariant.ts:34]
- **title 服务硬依赖 projection registry。** `inject` 含 `sessionProjections`；base 同时挂 `id: session-projection`。没有 registry 的组合不再能单独挂 title。 [E: packages/session/session-title/src/index.ts:295] [E: packages/bundle/base/cordis.patch.yml:138]

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 / 合同 | base | web-app | headless / sdk / acp |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session-title` 的 `SessionTitleService`、`SessionTitleProvider`、`foldSessionTitle`；事件键 `session/title` | `ctx.sessionTitle`（`get` / `rename` / `refresh` / `register`） | `id: session-title`，fallback `5/40/80` | **继承**，不重挂 | **继承**（叠 base 的 profile）；`sdk-minimal` **无** |
| Provider（cadence） | `@deepseek-ai/dsh-session-title-first-prompt-llm` 经 `registerSessionTitleLlmProvider`；共享实现在 `@deepseek-ai/dsh-session-title-llm` | 唯一 `SessionTitleProvider` 槽；`automatic: 'first-prompt'`；`purpose: 'session-title'` | 行 id 是 `session-title-llm`，`name` 是 first-prompt 包；无显式 route | **继承** | **继承**（叠 base） |
| Provider（未 shipped） | `@deepseek-ai/dsh-session-title-all-prompts-llm` | 同一 `register()` 槽，`automatic: 'all-prompts'` | **无** | **无** | **无** |
| Consumer（unit） | 同包 `register({ key: 'title' })` + `titleInput` | `ctx.sessionProjections` 的 `title: string \| null` | registry 在 base（`id: session-projection`）；cache 也在 base | 另加 workspace / session-controller / stats / export；**不是**第二份 title | 无 Host HTTP；title unit 仍随服务注册 |
| Consumer（读/写 UI） | `dsh-api-session-controller` `rename`；`dsh-session-query` `readTitle` / `foldSessionTitle` | Remote / query，不 `provide` | query 在 base（`openAt: never`） | 另加 rename Remote、列表投影 | 无 HTTP rename；fold 仍可用 |

换 cadence Provider（卸 first-prompt、挂 all-prompts）只改何时 `generate`、框哪些 `messageSeqs`；不能改 `session/title` 的 log-only 合同，也不能让标题进 `deriveMessages()`。preset 若再 `provide` 一份 `sessionTitle` 且不 `isolate`，按 host 面服务泄漏处理。shipped session 盘是 base 行 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`；web-app / headless 继承，不重挂。 [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:113] KV `storage` 三件套现挂在 **base**。 [E: packages/bundle/base/cordis.patch.yml:145] [E: packages/bundle/base/cordis.patch.yml:148] [E: packages/bundle/base/cordis.patch.yml:153]

## Sources

- packages/session/session-title/src/index.ts
- packages/session/session-title/src/normalize.ts
- packages/session/session-title/src/types.ts
- packages/session/session-title/src/invariant.ts
- packages/session/session-title/tests/session-title.spec.ts
- packages/session/session-title/tests/provider.spec.ts
- packages/session/session-title/tests/rename.spec.ts
- packages/session/session-title/tests/projection.spec.ts
- packages/session/session-title-llm/src/index.ts
- packages/session/session-title-llm/tests/llm.spec.ts
- packages/session/session-title-first-prompt-llm/src/index.ts
- packages/session/session-title-first-prompt-llm/tests/loader-composition.spec.ts
- packages/session/session-title-first-prompt-llm/tests/provider.spec.ts
- packages/session/session-title-all-prompts-llm/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/core/session/src/types.ts
- packages/core/session/src/index.ts
- packages/core/session/src/surface.ts
- packages/core/agent-loop/src/invariant.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-persistence-sqlite/src/schema.ts
- packages/settings/settings/src/index.ts
- packages/llm/llm/src/types.ts
- packages/llm/llm/src/call-config.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/llm/llm-deepseek/src/serialize.ts
- packages/api/session-controller/src/commands.ts
- packages/api/session-controller/src/index.ts
- packages/session-query/session-query/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：append-only `SessionEvent`、`deriveMessages` 只走 surface、`surfaceOp` 只有 replace 没有 delete。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`session/event` emit、`session/flush` parallel。
- [subsys.persistence.projection](projection.md)：`ctx.sessionProjections` registry；本页的 `'title'` unit 挂在那张表上。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer 三角。
- [subsys.persistence.session-query](session-query.md)：`readTitle` / `readTitleSnapshots` 调 `foldSessionTitle`；默认 `openAt: never`。
- [subsys.persistence.checkpoint](checkpoint.md)：`llm/stream` 进 adapter 之前 `sessions.flush`；辅助标题请求也走这条门。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 backend；base 行 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`。
- [subsys.persistence.storage](storage.md)：非会话 KV 现挂在 **base**（`storage` + `storage-json` + `storage-domain`）。
- [subsys.host.apiproxy](../host/apiproxy.md)：Host HTTP API；`session.rename` 由 `dsh-api-session-controller` 调 `ctx.sessionTitle.rename`。
