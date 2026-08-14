---
id: subsys.interaction.feedback
title: message feedback
kind: subsystem
tier: T2
pkg: interaction
source:
  - packages/feedback/command-feedback/src/index.ts
  - packages/feedback/command-feedback/tests/command-feedback.spec.ts
  - packages/feedback/command-feedback/tests/loader-composition.spec.ts
  - packages/feedback/message-feedback/src/index.ts
  - packages/feedback/message-feedback/src/types.ts
  - packages/feedback/message-feedback/src/spec.ts
  - packages/feedback/message-feedback/tests/message-feedback.spec.ts
  - packages/feedback/message-feedback/tests/loader-composition.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/package.json
  - packages/interaction/commands/src/index.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/surface.ts
  - packages/core/session/src/known-event-types.ts
  - packages/session/session-telemetry/src/index.ts
  - packages/identity/anonymous-user-id/src/index.ts
symbols:
  - ctx.messageFeedback
  - MessageFeedbackService
  - recordFeedback
  - /feedback
related:
  - spine.overview
  - subsys.interaction.commands
  - subsys.persistence.telemetry
  - subsys.core.session
  - subsys.persistence.storage
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
  - spine.session-log
evidence: explicit
status: verified
updated: 47f943859b
---

> DSH 的反馈是**两套互不共享的 host 面合同**，不是同一个服务，也不共用 `ctx` 键。`@deepseek-ai/dsh-command-feedback` 挂在 `dsh-base`：`inject = ['commands']`，注册人命令 `/feedback`，用导出函数 `recordFeedback` 向 Session log 追加一条 log-only `feedback/record`，不 publish `ctx.*`。`@deepseek-ai/dsh-message-feedback` 只挂在 `dsh-web-app`：`id: message-feedback`，publish `ctx.messageFeedback`（`MessageFeedbackService`），把对 finalized append-origin assistant message 的 rating / note 写成 storage-domain sidecar，经 Typert Remote 暴露 `list` / `put` / `delete`。默认产品路径是 `dsh web`（本地 Web GUI），没有 shipped TUI。

## 能回答的问题

- `command-feedback` 和 `message-feedback` 各挂在哪一层 bundle？会不会合成一个 `ctx` 服务？`dsh-headless` 有没有 sidecar？
- `/feedback <text>` 怎样进 Session log？为什么不进 `deriveMessages()`？success ack 保证落盘吗？`recordInput: false` 让 `command/run` 带不带原文？
- `recordFeedback` 能否不经 slash 命令调用？空串 / 已 abort 各留下什么？
- `ctx.messageFeedback.put` 的 target 是哪一类 `assistant/message`？user / 空 content / replace 副本行不行？
- `maxNoteBytes` 在哪强制为正整数？`dsh-web-app` 写成多少？note 空白与超长何时碰 persistence？
- sidecar 的 `ifVersion`、session id 复用篱笆、live `flush` 失败，各归一成哪条业务失败或抛错？

## 职责边界

本页拥有两包的**服务合同与事件**，以及它们在 shipped bundle 上的挂载差：

| 包 | 拥有 |
|---|---|
| `@deepseek-ai/dsh-command-feedback` | `SessionEventMap['feedback/record']`、导出 `recordFeedback`、全局命令 `name: 'feedback'`（`/feedback`） |
| `@deepseek-ai/dsh-message-feedback` | `ctx.messageFeedback`、`MessageFeedbackService`、`messageFeedbackDomainSpec`、`list` / `put` / `delete` 的业务失败词 |

本页**不**拥有：

- `ctx.commands` 注册表、`command/run` / `command/done` 信封、slash 解析（[subsys.interaction.commands](./commands.md)）。`/feedback` 只是该表上的一条 Consumer。
- telemetry backend、`FEEDBACK_ONLY` 回放、脱敏、exporter（[subsys.persistence.telemetry](../persistence/telemetry.md)）。`/feedback` 只 `ctx.get('sessionTelemetry')` 读 `sharing` 拼 ack 句子；`message-feedback` **不**读 telemetry，也 **不** 写 `feedback/record`。
- storage hub / `storage-domain` 写路径（[subsys.persistence.storage](../persistence/storage.md)）。sidecar 是消费者：`open(messageFeedbackDomainSpec)`。
- `Session.append` / `deriveMessages()` / `session/flush` 实现（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）。
- client 星标 UI。`dsh-web-app` 另有组合行 `id: ui-message-feedback`（`@deepseek-ai/dsh-client-ui-message-feedback`），本页不展开组件。 [E: packages/bundle/web-app/cordis.patch.yml:246] [E: packages/bundle/web-app/cordis.patch.yml:247]

两条都是 **host 面**。agent-preset 面不重挂。`command-feedback` 跟 `commands` 坐在 `dsh-base` 根 realm；`message-feedback` 跟 `storage` / `storage-domain` 一起只出现在 web overlay。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/feedback/command-feedback/src/index.ts` | `name` / `inject`；`recordFeedback`；`/feedback` handler；merge `feedback/record` |
| `packages/feedback/command-feedback/tests/command-feedback.spec.ts` | 注册、`recordInput: false`、log-only、sharing 三句、空输入、abort |
| `packages/feedback/command-feedback/tests/loader-composition.spec.ts` | 真 Loader 组合：`deriveMessages()` 仍空 |
| `packages/feedback/message-feedback/src/index.ts` | `MessageFeedbackService`；`Config.maxNoteBytes`；`list` / `put` / `delete` |
| `packages/feedback/message-feedback/src/types.ts` | rating、item、request、失败码；给 Remote 客户端单独导出 |
| `packages/feedback/message-feedback/src/spec.ts` | domain `message_feedback` v0、table `sessions` |
| `packages/feedback/message-feedback/tests/message-feedback.spec.ts` | target 门、CAS、note 限额、live flush 序、dispose 拒收 |
| `packages/feedback/message-feedback/tests/loader-composition.spec.ts` | 冷重启后 sidecar 仍在；Remote 名 `list`/`put`/`delete` |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: command-feedback` |
| `packages/bundle/web-app/cordis.patch.yml` | host 行 `id: message-feedback`，`maxNoteBytes: 8192` |
| `packages/interaction/commands/src/index.ts` | `execute` 不经模型；`recordInput === false` 时 `command/run` 省略 `args` |
| `packages/core/session/src/surface.ts` | `isAppendSurfaceEvent`；空 content assistant 不投影 |
| `packages/core/session/src/known-event-types.ts` | 词表含 `feedback/record` |
| `packages/session/session-telemetry/src/index.ts` | `sharing` ∈ `full` / `feedback-only` / `disabled` |
| `packages/identity/anonymous-user-id/src/index.ts` | ack 里的匿名 user id |

## 数据模型

### command-feedback（Session 事件，不是 `ctx` 服务）

| 符号 | 要点 |
|---|---|
| `name` / `inject` | 插件名 `'command-feedback'`。`inject = ['commands']`。没有 `default` 导出，不 `provide` 服务键。 [E: packages/feedback/command-feedback/src/index.ts:15] [E: packages/feedback/command-feedback/src/index.ts:16] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:105] |
| `feedback/record` | merge 进 `SessionEventMap`：`{ text: string }`。log-only：不带 `surfaceOp`。词表收进 `KNOWN_SESSION_EVENT_TYPES`。 [E: packages/feedback/command-feedback/src/index.ts:62] [E: packages/core/session/src/known-event-types.ts:33] |
| `recordFeedback(session, text)` | `text.trim()`；空串抛 `TypeError('feedback text must not be empty')`；否则 `session.append('feedback/record', { text: normalized })`。不 `flush`。 [E: packages/feedback/command-feedback/src/index.ts:73] [E: packages/feedback/command-feedback/src/index.ts:74] [E: packages/feedback/command-feedback/src/index.ts:75] |
| `/feedback` | `ctx.commands.register({ name: 'feedback', input: { hint: '<text>' }, recordInput: false, ... })`。人命令，不经模型 turn。 [E: packages/feedback/command-feedback/src/index.ts:102] [E: packages/feedback/command-feedback/src/index.ts:105] |
| sharing 句 | 无 `sessionTelemetry`：`'Session sharing is not configured.'`。有服务则按 `sharing`：`full` / `feedback-only` / `disabled` 三句。词表在 telemetry 缝：`'full' \| 'feedback-only' \| 'disabled'`。 [E: packages/feedback/command-feedback/src/index.ts:50] [E: packages/feedback/command-feedback/src/index.ts:51] [E: packages/session/session-telemetry/src/index.ts:140] |

`recordInput: false` 让 registry 写 `command/run` 时省略 `args`。反馈原文只出现在 `feedback/record.data.text`，不在 `command/run` 里再抄一份。 [E: packages/interaction/commands/src/index.ts:311] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:115]

### message-feedback（`ctx.messageFeedback` sidecar）

| 符号 | 要点 |
|---|---|
| `ctx.messageFeedback` | Cordis 键。`MessageFeedbackService` 构造 `super(ctx, 'messageFeedback')`。Typert `serviceKey` 与 namespace 同为 `'messageFeedback'`。 [E: packages/feedback/message-feedback/src/index.ts:56] [E: packages/feedback/message-feedback/src/index.ts:168] [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:47] [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:48] |
| `Config.maxNoteBytes` | 必填。Loader schema：`s.number().step(1).min(1).required()`。构造再跑 `resolveMaxNoteBytes`：必须正 `Number.isSafeInteger`，否则 `TypeError`。包内**没有**默认值。 [E: packages/feedback/message-feedback/src/index.ts:155] [E: packages/feedback/message-feedback/src/index.ts:65] [E: packages/feedback/message-feedback/src/index.ts:169] |
| web-app 部署值 | `dsh-web-app` 行 `config.maxNoteBytes: 8192`。 [E: packages/bundle/web-app/cordis.patch.yml:67] |
| `MessageFeedbackRating` | `'positive' \| 'negative'`。没有第三档，缺 item 表示未评。 [E: packages/feedback/message-feedback/src/types.ts:16] |
| `MessageFeedbackItem` | `messageId` / `rating` / 可选 `note` / `version`（UUID brand）/ `createdAt` / `updatedAt`。出服务边界一律 freeze。 |
| `MessageFeedbackPutRequest.ifVersion` | 当前 item 的 version，或 `null` 要求「尚无 item」。 [E: packages/feedback/message-feedback/src/types.ts:57] |
| 失败码 | `session-not-found` / `target-not-found` / `version-conflict` / `note-blank` / `note-too-large`。`list` 只收第一种；`delete` 收 session-not-found 与 version-conflict。 |
| `messageFeedbackDomainSpec` | `name: 'message_feedback'`，`version: 0`，一张表 `sessions`：`SessionId → { session: { createdAt, cwd? }, items[] }`。行内禁止重复 `messageId` 或重复 `version`。 [E: packages/feedback/message-feedback/src/spec.ts:85] [E: packages/feedback/message-feedback/src/spec.ts:86] [E: packages/feedback/message-feedback/src/spec.ts:88] |
| 生命周期篱笆 | 行上的 `session.createdAt` + `session.cwd` 必须等于当前 `SessionHeader` 同名字段。id 复用而 header 变了：旧行对 `list` **不可见**。 [E: packages/feedback/message-feedback/src/index.ts:110] |

`MessageFeedbackService.inject = ['storageDomain', 'sessionPersistence', 'sessions']`。它 inspect / flush 已有 Session，**不** `create` / `resume` Agent 或 Session。 [E: packages/feedback/message-feedback/src/index.ts:151]

## 控制流

1. **两包两行，不要合成一个服务。** `dsh-base` insert `id: command-feedback` / `name: '@deepseek-ai/dsh-command-feedback'`，dependencies 也声明该包。`dsh-web-app` 另 insert `id: message-feedback` / `name: '@deepseek-ai/dsh-message-feedback'`，`maxNoteBytes: 8192`；web-app dependencies 声明 message-feedback，base **没有**。headless overlay 的 package 不声明任一 feedback 包；它继承 base 的 `/feedback`，**不**挂 `ctx.messageFeedback`。 [E: packages/bundle/base/cordis.patch.yml:253] [E: packages/bundle/base/cordis.patch.yml:254] [E: packages/bundle/base/package.json:51] [E: packages/bundle/web-app/cordis.patch.yml:64] [E: packages/bundle/web-app/cordis.patch.yml:65] [E: packages/bundle/web-app/package.json:96]

2. **`command-feedback` 只向 `ctx.commands` 注册。** `apply` 调 `ctx.commands.register`：全局名 `feedback`，`description: 'record feedback about this session'`，`recordInput: false`，handler 闭包住插件 `ctx`（用来 `ctx.get('sessionTelemetry')`）。卸 fiber 即从注册表消失。 [E: packages/feedback/command-feedback/src/index.ts:101] [E: packages/feedback/command-feedback/src/index.ts:105] [E: packages/feedback/command-feedback/src/index.ts:106]

3. **`/feedback` 走人命令 `execute`，不进模型 turn。** `CommandRuntime.execute` 解析 slash 行、查表；`signal.aborted` 在写 `command/run` **之前**抛错，session 仍空。过了准入才 `append` `command/run`（本命令无 `args`），再跑 handler，最后 `command/done`。handler 不调用 `agent.send` / `followup` / `steer`。 [E: packages/interaction/commands/src/index.ts:297] [E: packages/interaction/commands/src/index.ts:306] [E: packages/interaction/commands/src/index.ts:311] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:243]

4. **空输入 fail-closed，不写 `feedback/record`。** `rawInput.trim().length === 0`（含裸 `/feedback` 与纯空白）返回 `{ kind: 'error', text: 'Feedback text is required. Usage: /feedback <text>' }`，不调用 `recordFeedback`，也不碰匿名 user id。log 只剩 `command/run` + `command/done { kind: 'error' }`。 [E: packages/feedback/command-feedback/src/index.ts:88] [E: packages/feedback/command-feedback/src/index.ts:89] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:229]

5. **`recordFeedback` 只 append，ack 不保证落盘。** 非空路径：`recordFeedback(invocation.agent.session, invocation.rawInput)` → trim → `session.append('feedback/record', { text })`。`Session.append` 校验后 `log.push`，再 fire-and-forget `session/event`；热路径不写盘。handler **没有** `sessions.flush`。随后 `ctx.get('sessionTelemetry')` 拼 sharing 句，`getOrCreateAnonymousUserId()` 读/铸 `$DSH_HOME/.anonymous-user-id`，返回 `kind: 'success'` 文案。事件序是 `command/run` → `feedback/record` → `command/done`。也可不经命令直接调 `recordFeedback`，那时 log 里只有 `feedback/record`。 [E: packages/feedback/command-feedback/src/index.ts:91] [E: packages/feedback/command-feedback/src/index.ts:75] [E: packages/core/session/src/index.ts:643] [E: packages/identity/anonymous-user-id/src/index.ts:69] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:149]

6. **`feedback/record` 不进 `deriveMessages()`。** 该 type 不是 `user/message` / `assistant/message` / `tool/result`，`deriveEventMessage` 走 default 返回 `null`。测试：每条事件都没有 `surfaceOp`，`surface.nodes` 与 `deriveMessages()` 皆 `[]`。并发两次 `/feedback` 按 dispatch 序各追加一条，不替换旧条。 [E: packages/core/session/src/surface.ts:112] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:217] [E: packages/feedback/command-feedback/tests/loader-composition.spec.ts:114]

7. **ack 里的 sharing 只读，不负责上传。** 无 telemetry 服务 → 「not configured」。有服务则 `sharingSentence(telemetry.sharing)`：`full` → enabled；`feedback-only` → feedback-gated（录反馈才释放前缀）；`disabled` → disabled。`FEEDBACK_ONLY` 何时 capture、DISABLED 何时只 warn，归 [subsys.persistence.telemetry](../persistence/telemetry.md)。 [E: packages/feedback/command-feedback/src/index.ts:92] [E: packages/feedback/command-feedback/src/index.ts:29] [E: packages/feedback/command-feedback/src/index.ts:31] [E: packages/feedback/command-feedback/src/index.ts:33]

8. **`message-feedback` 启动：打开 sidecar domain。** `Service.init`：`storageDomain.open(messageFeedbackDomainSpec)`，记下 `table('sessions')`，并 `ctx.effect` 在卸店时先把 `mutationAdmissionOpen = false`、等完 `operationTails`、再 `domain.close()`。Remote 方法名恰好 `list` / `put` / `delete`。 [E: packages/feedback/message-feedback/src/index.ts:174] [E: packages/feedback/message-feedback/src/index.ts:176] [E: packages/feedback/message-feedback/src/index.ts:190] [E: packages/feedback/message-feedback/src/index.ts:206] [E: packages/feedback/message-feedback/src/index.ts:271] [E: packages/feedback/message-feedback/tests/loader-composition.spec.ts:86]

9. **`list`：先确认 Session 存在，再按生命周期过滤行。** 非 live 则 `sessionPersistence.listSnapshots()`；目录与 live 都没有该 id → `{ ok: false, error: { code: 'session-not-found' } }`。目录有、`inspect` 抛错（校验和损坏等）**原样抛**，不猜成 session-not-found。读到行但 `createdAt`/`cwd` 对不上当前 header：当作无 item，返回空列表。 [E: packages/feedback/message-feedback/src/index.ts:304] [E: packages/feedback/message-feedback/src/index.ts:308] [E: packages/feedback/message-feedback/src/index.ts:311] [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:61]

10. **`put`：note 先本地校验，再串行化、对 target、先耐久、再 CAS。** `resolveNote`：`undefined` 合法；`trim().length === 0` → `note-blank`；`Buffer.byteLength(note, 'utf8') > maxNoteBytes` → `note-too-large`。这两种在 `enqueue` / `inspect` **之前**返回，测试里 `inspectCalls` 不变。过了才按 `sessionId` 串行。`hasFeedbackTarget` 要求 log 里存在 `type === 'assistant/message'` **且** `isAppendSurfaceEvent` **且** `deriveEventMessage(event)?.role === 'assistant'` 且 `message.id` 相等。因此 user 消息、空 content assistant（投影为 `null`）、`surfaceOp: replace` 的副本，一律 `target-not-found`。 [E: packages/feedback/message-feedback/src/index.ts:208] [E: packages/feedback/message-feedback/src/index.ts:344] [E: packages/feedback/message-feedback/src/index.ts:347] [E: packages/feedback/message-feedback/src/index.ts:317] [E: packages/feedback/message-feedback/src/index.ts:319] [E: packages/core/session/src/surface.ts:54] [E: packages/core/session/src/surface.ts:103] [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:196]

11. **live target 必须先 `flush` 再写 sidecar。** `ensureTargetDurable`：live 且 header 身份未变 → `sessions.flush(live)`；返回 `false`（没有 durability listener）抛 `message-feedback: no durability listener participated for live session '…'`；成功后再 `sessionPersistence.readFrom(id, 0)`。冷会话直接 `readFrom`。物理前缀里找不到该 assistant 投影 → 仍 `target-not-found`，sidecar 不写。测试序：`session:durable` → `session:verified` → `sidecar:durable`。flush listener 抛错则 `put` reject，`list` 仍空。 [E: packages/feedback/message-feedback/src/index.ts:331] [E: packages/feedback/message-feedback/src/index.ts:336] [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:567] [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:599]

12. **CAS：`ifVersion` 必须等于现项 version，或在创建时为 `null`。** 不匹配 → `version-conflict`，`current` 为现项或 `null`。rating 与 note 都没变：返回已存 item，**不**换 version。有实质变化：新 UUID version；`createdAt` 保留；`updatedAt = max(now, existing.updatedAt)`（时钟回拨也不会倒退）。新 item `push` 到 `items` 尾，故 `list` 按首次创建序。整行 `table.put`。ABA：中间改过再改回，旧 version 仍 conflict。 [E: packages/feedback/message-feedback/src/index.ts:236] [E: packages/feedback/message-feedback/src/index.ts:242] [E: packages/feedback/message-feedback/src/index.ts:252]

13. **`delete`：缺项即成功。** 找不到该 `messageId`（或整行因身份篱笆不可见）→ `{ ok: true, value: { absent: true } }`，**不管**传入的 `ifVersion`。现项必须 version 精确相等才 `table.put` 滤掉该项；否则 `version-conflict`。删后再 `put` 新 item 会拿到新 version，拿旧 version 再 delete 会 conflict。 [E: packages/feedback/message-feedback/src/index.ts:282] [E: packages/feedback/message-feedback/src/index.ts:283] [E: packages/feedback/message-feedback/src/index.ts:285]

14. **卸店拒收新 mutation。** `mutationAdmissionOpen === false` 时 `enqueue` 立刻 `reject(new Error('message-feedback: service is disposing'))`。已经入队的 put 会跑完（测试里两条 put 都成功、`domain/changed` 两次）再 `domain.close()`。 [E: packages/feedback/message-feedback/src/index.ts:362] [E: packages/feedback/message-feedback/src/index.ts:363] [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:504]

## 设计动机

DSH 把「人对**整段会话**说的一句话」和「人对**某一条已经画出来的 assistant 气泡**点赞/踩」拆开，因为存储寿命、可变性、以及谁消费它们都不同。

`feedback/record` 是 append-only 事实：进 Session log 才能让 telemetry 在 `FEEDBACK_ONLY` 下把「到这条为止的前缀」当成同意分享的游标；它必须 log-only，否则用户对产品的抱怨会在下一轮被模型读到。`recordInput: false` 避免 `command/run.args` 与 domain 事件各存一份原文。ack 不 `flush`，是因为人命令的结算语义是「registry 已经记下」，落盘仍走普通 `session/event` 排空；把 ack 说成「已上盘」会撒谎。

`message-feedback` 是可编辑 sidecar：人会改 rating、补 note、再删掉。这类变更若写成 Session 事件，会逼 compaction / replay 去理解「最新一条赢」，并污染 **model-visible ⟺ logged**。所以它走 `storage-domain`，用 header 的 `createdAt`+`cwd` 篱笆挡住 session id 复用，用 UUID `version` 挡住 ABA，用 `flush` 再写 sidecar 挡住「内存里看见、盘上还没有」的气泡。`maxNoteBytes` 没有包内默认，逼部署在 Loader 边界选一个正整数（web-app 选 8192）。

两包因此不能合成 `ctx.feedback`：一个只依赖 `commands`、出现在 base / headless；一个依赖 `storageDomain`，只出现在 web-app。

## Gotcha

- **不是同一个服务。** `/feedback` 不会写 `ctx.messageFeedback`。`put` / `delete` 不会 append `feedback/record`，也不会触发 `FEEDBACK_ONLY` 释放。不要在 headless 上找 `ctx.messageFeedback`。
- **不要把 `id: ui-message-feedback` 当成这个子系统。** 那是 client 组件行，消费 Remote；本页合同停在 `MessageFeedbackService`。 [E: packages/bundle/web-app/cordis.patch.yml:246]
- **`/feedback` 空输入仍有 command 信封。** 失败是 `command/done.kind === 'error'`，不是「什么都没写」。已 abort 的 `execute` 连信封都没有。 [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:231]
- **trim 策略两边不一样。** `recordFeedback` 存的是 trim 后文本。message `note` 只要含非空白就**原样**保存（测试里 `'  exact prose  '` 的两侧空格还在），只在「全空白」时 `note-blank`。 [E: packages/feedback/command-feedback/src/index.ts:73] [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:144]
- **ack ≠ 落盘。** `recordFeedback` 与 `/feedback` handler 都不 `flush`。`Session.append` 只推进内存 log。
- **target 是人看过的 append-origin，不是 replace 副本。** 被 `surfaceOp: { op: 'replace' }` 换掉的那条原文仍可评（它还在 log 里且 `surfaceOp === 'append'`）；替换事件自己的 `message.id` 是 `target-not-found`。空 content 的 assistant 壳（只挂 usage）投影为 `null`，同样拒。 [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:236]
- **`maxNoteBytes: 0` 在构造期就炸**，不是业务失败码。未 `init` 就 `list` 抛 `durable domain is not initialized`。 [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:252]
- **live 无 flush 参与者是抛错，不是 `target-not-found`。** sidecar 保持空。冷逻辑 log 有、物理前缀没有：才是 `target-not-found`。 [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:599]
- **复用同一 `SessionId` 不会读到旧评分。** `list` 变空；对旧 version 的 `delete` 因「现项不存在」而成功；新生命周期用 `ifVersion: null` 另写。 [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:446]
- **`note-blank` / `note-too-large` 按 UTF-8 字节。** `'ééé'` 在 `maxNoteBytes: 4` 下是 `actualBytes: 6`；`'😀'`（4 字节）可通过。这两种失败不 `inspect`。 [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:205]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition（会话评语） | `@deepseek-ai/dsh-command-feedback` 对 `SessionEventMap` 的 merge + 导出 `recordFeedback` | **无** `ctx.*`。事件 `feedback/record { text }` | `dsh-base` `id: command-feedback`。preset **不**重挂 |
| Provider（`/feedback`） | 同一包的 `apply` | `ctx.commands.register`；`inject = ['commands']` | 同上。headless / web 继承 base 行 |
| Consumer（评语） | `dsh-commands` 记信封；可选 `dsh-session-telemetry-otel` 听 `feedback/record`；`/feedback` ack 读 `sharing` | `ctx.get('sessionTelemetry')` 机会主义 | telemetry 行可被 `DSH_TELEMETRY_DISABLED` 卸掉 |
| Definition（逐条评分） | `@deepseek-ai/dsh-message-feedback` 的 types + `messageFeedbackDomainSpec` | `MessageFeedbackItem` / 五类失败码 / domain `message_feedback` v0 | 无 preset 行；`./types` 给 Remote 客户端 |
| Provider（逐条评分） | `MessageFeedbackService` | `ctx.messageFeedback`；Remote `list`/`put`/`delete`；`inject = ['storageDomain','sessionPersistence','sessions']` | **仅** `dsh-web-app` `id: message-feedback`，`maxNoteBytes: 8192` |
| Consumer（逐条评分） | web-app 的 `id: ui-message-feedback`（本页不展开） | Typert Remote，不经 Session log | `dsh-headless` **无** 此行 |

换 telemetry backend 只换 `sharing` 的披露值和 `feedback/record` 的上传策略，不能改 `recordFeedback` 的 log-only 合同。换 storage backend 只换 sidecar 介质，不能改 target / CAS / flush-before-write。preset 不要 publish `messageFeedback`：它跟 `storage` 一样是 process-global host 服务。

## Sources

- packages/feedback/command-feedback/src/index.ts
- packages/feedback/command-feedback/tests/command-feedback.spec.ts
- packages/feedback/command-feedback/tests/loader-composition.spec.ts
- packages/feedback/message-feedback/src/index.ts
- packages/feedback/message-feedback/src/types.ts
- packages/feedback/message-feedback/src/spec.ts
- packages/feedback/message-feedback/tests/message-feedback.spec.ts
- packages/feedback/message-feedback/tests/loader-composition.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/package.json
- packages/interaction/commands/src/index.ts
- packages/core/session/src/index.ts
- packages/core/session/src/surface.ts
- packages/core/session/src/known-event-types.ts
- packages/session/session-telemetry/src/index.ts
- packages/identity/anonymous-user-id/src/index.ts

## 相关

- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面；`dsh web` 不是 TUI。
- [subsys.interaction.commands](./commands.md)：`ctx.commands`；人命令不经模型 turn；`recordInput` 默认 true，本页的 `/feedback` 显式 false。
- [subsys.persistence.telemetry](../persistence/telemetry.md)：`sharing` 三档；`FEEDBACK_ONLY` 只在已提交的 `feedback/record` 上回放前缀。
- [subsys.core.session](../core/session.md)：`Session.append`、`deriveMessages()`、三类 surface。
- [spine.session-log](../../spine/session-log.md)：log-only 事件与模型历史的边界。
- [subsys.persistence.storage](../persistence/storage.md)：`storage-domain`；消费者 domain `message_feedback` v0。
- [subsys.composition.bundle-base](../composition/bundle-base.md)：host 行 `id: command-feedback`。
- [subsys.composition.bundle-web-app](../composition/bundle-web-app.md)：叠在 base 上的 `id: message-feedback`。
