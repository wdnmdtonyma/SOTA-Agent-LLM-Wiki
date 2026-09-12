---
id: subsys.interaction.feedback
title: message feedback
kind: subsystem
tier: T2
pkg: interaction
source:
  - packages/feedback/command-feedback/src/index.ts
  - packages/feedback/command-feedback/src/types.ts
  - packages/feedback/command-feedback/tests/command-feedback.spec.ts
  - packages/feedback/command-feedback/tests/loader-composition.spec.ts
  - packages/feedback/message-feedback/src/index.ts
  - packages/feedback/message-feedback/src/types.ts
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
  - packages/identity/anonymous-user-id/src/index.ts
symbols:
  - ctx.sessionFeedback
  - SessionFeedbackService
  - recordFeedback
  - /feedback
  - ctx.messageFeedback
  - MessageFeedbackService
  - feedback/record
  - feedback/message-put
  - feedback/message-delete
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
updated: c291e7961a
---

> DSH 的反馈是**两套互不共享的 host 面合同**，不是同一个服务，也不共用 `ctx` 键。`@deepseek-ai/dsh-command-feedback` 挂在 `dsh-base`：注册人命令 `/feedback`，导出 `recordFeedback`，并 publish `ctx.sessionFeedback`（`SessionFeedbackService`，Remote `record`）。三者都向 Session log 追加 log-only `feedback/record`。`@deepseek-ai/dsh-message-feedback` 只挂在 `dsh-web-app`：publish `ctx.messageFeedback`，对 finalized append-origin assistant message 的 rating / note / category 写成 Session log 事件 `feedback/message-put` / `feedback/message-delete`。**不再**有 `src/spec.ts`，也**不再**走 `storage-domain` sidecar。`command-feedback` 随 base 出现在叠 `dsh-base` 的 profile（`web` / `headless` / `sdk` / `acp`）；`sdk-minimal` 不叠 base，因此不自动带 `/feedback`。逐条评分只出现在 web overlay。

## 能回答的问题

- `command-feedback` 和 `message-feedback` 各挂在哪一层 bundle？会不会合成一个 `ctx` 服务？`dsh-headless` / `sdk` / `acp` 有没有 `ctx.messageFeedback`？
- `/feedback <text>` 怎样进 Session log？为什么不进 `deriveMessages()`？success ack 保证落盘吗？`recordInput: false` 让 `command/run` 带不带原文？
- `recordFeedback` 与 `ctx.sessionFeedback.record` 能否不经 slash 命令调用？空串 / 已 abort 各留下什么？
- `ctx.messageFeedback.put` 的 target 是哪一类 `assistant/message`？user / 空 content assistant 行不行？
- `maxNoteBytes` 在哪强制为正整数？`dsh-web-app` 写成多少？note 空白与超长何时碰 persistence？
- `ifVersion`、live `flush` 失败、卸店拒收，各归一成哪条业务失败或抛错？当前 item 从哪份 log 折出来？

## 职责边界

本页拥有两包的**服务合同与事件**，以及它们在 shipped bundle 上的挂载差：

| 包 | 拥有 |
|---|---|
| `@deepseek-ai/dsh-command-feedback` | `SessionEventMap['feedback/record']`、导出 `recordFeedback`、`ctx.sessionFeedback`、全局命令 `name: 'feedback'`（`/feedback`）、`FEEDBACK_CATEGORIES` |
| `@deepseek-ai/dsh-message-feedback` | `ctx.messageFeedback`、`MessageFeedbackService`、`SessionEventMap['feedback/message-put' \| 'feedback/message-delete']`、`list` / `put` / `delete` 的业务失败词 |

本页**不**拥有：

- `ctx.commands` 注册表、`command/run` / `command/done` 信封、slash 解析（[subsys.interaction.commands](./commands.md)）。`/feedback` 只是该表上的一条 Consumer。
- telemetry backend、`FEEDBACK_ONLY` 回放、脱敏、exporter（[subsys.persistence.telemetry](../persistence/telemetry.md)）。`/feedback` ack **不再**读 `sharing` 拼句子；`message-feedback` **不**写 `feedback/record`。
- storage hub / `storage-domain`（[subsys.persistence.storage](../persistence/storage.md)）。message-feedback **不再** `open` 任何 domain；它只 `inject` `sessionPersistence` + `sessions`。
- `Session.append` / `deriveMessages()` / `session/flush` 实现（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）。
- client 星标 UI。`dsh-web-app` 另有组合行 `id: ui-message-feedback`（`@deepseek-ai/dsh-client-ui-message-feedback`），本页不展开组件。 [E: packages/bundle/web-app/cordis.patch.yml:321] [E: packages/bundle/web-app/cordis.patch.yml:322]

两条都是 **host 面**。agent-preset 面（`minimal` / `standard` / `ptc` / `cordis`）不重挂。`command-feedback` 跟 `commands` 坐在 `dsh-base` 根 realm；`message-feedback` 只出现在 web overlay。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/feedback/command-feedback/src/index.ts` | `name` / `inject`；`recordFeedback`；`SessionFeedbackService`；`/feedback` handler；merge `feedback/record` |
| `packages/feedback/command-feedback/src/types.ts` | `FeedbackRecord` / `FeedbackCategory`；Remote 请求结果 |
| `packages/feedback/command-feedback/tests/command-feedback.spec.ts` | 注册、`recordInput: false`、log-only、空输入、Remote `record`、空 `{}` 仍记一条 |
| `packages/feedback/command-feedback/tests/loader-composition.spec.ts` | 真 Loader 组合：`deriveMessages()` 仍空 |
| `packages/feedback/message-feedback/src/index.ts` | `MessageFeedbackService`；`Config.maxNoteBytes`；`list` / `put` / `delete`；从 log fold 出当前 items |
| `packages/feedback/message-feedback/src/types.ts` | rating、item、`feedback/message-put` / `feedback/message-delete`、失败码 |
| `packages/feedback/message-feedback/tests/message-feedback.spec.ts` | target 门、CAS、note 限额、live flush |
| `packages/feedback/message-feedback/tests/loader-composition.spec.ts` | 冷重启后 log 事件仍在；Remote 名 `list`/`put`/`delete` |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: command-feedback` |
| `packages/bundle/web-app/cordis.patch.yml` | host 行 `id: message-feedback`，`maxNoteBytes: 8192` |
| `packages/interaction/commands/src/index.ts` | `execute` 不经模型；`recordInput === false` 时 `command/run` 省略 `args` |
| `packages/core/session/src/surface.ts` | `isAppendSurfaceEvent`；空 content assistant 不投影 |
| `packages/core/session/src/known-event-types.ts` | 词表含 `feedback/record` / `feedback/message-put` / `feedback/message-delete` |
| `packages/identity/anonymous-user-id/src/index.ts` | `/feedback` ack 里的匿名 user id |

## 数据模型

### command-feedback（Session 事件 + `ctx.sessionFeedback`）

| 符号 | 要点 |
|---|---|
| `name` / `inject` | 插件名 `'command-feedback'`。`inject = ['commands']`。`apply` 再 `ctx.plugin(SessionFeedbackService)`。 [E: packages/feedback/command-feedback/src/index.ts:40] [E: packages/feedback/command-feedback/src/index.ts:41] [E: packages/feedback/command-feedback/src/index.ts:118] |
| `feedback/record` | merge 进 `SessionEventMap`：`FeedbackRecord`（`text?` / `category?`）。log-only：不带 `surfaceOp`。词表收进 `KNOWN_SESSION_EVENT_TYPES`。 [E: packages/feedback/command-feedback/src/types.ts:40] [E: packages/core/session/src/known-event-types.ts:39] |
| `FEEDBACK_CATEGORIES` | 固定七档，展示序：`task-result` / `instruction-following` / `product-interaction` / `service-stability` / `resource-cost` / `security-privacy-permission` / `other`。 [E: packages/feedback/command-feedback/src/index.ts:30] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:181] |
| `recordFeedback(session, entry)` | `text` trim；空串当作缺席（不抛）。既无 text 也无 category 仍 `append('feedback/record', {})`。不 `flush`。 [E: packages/feedback/command-feedback/src/index.ts:58] [E: packages/feedback/command-feedback/src/index.ts:60] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:169] |
| `ctx.sessionFeedback` | `SessionFeedbackService`，`inject = ['sessions']`，Remote 方法只有 `record`。只认 **live** `sessions.get`；冷盘 id 返回 `session-not-found`。 [E: packages/feedback/command-feedback/src/index.ts:86] [E: packages/feedback/command-feedback/src/index.ts:101] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:114] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:140] |
| `/feedback` | `ctx.commands.register({ name: 'feedback', input: { hint: '<text>' }, recordInput: false, ... })`。人命令，不经模型 turn。空输入仍 fail-closed。 [E: packages/feedback/command-feedback/src/index.ts:119] [E: packages/feedback/command-feedback/src/index.ts:124] [E: packages/feedback/command-feedback/src/index.ts:74] |

`recordInput: false` 让 registry 写 `command/run` 时省略 `args`。反馈原文只出现在 `feedback/record.data.text`（若有）。 [E: packages/interaction/commands/src/index.ts:376] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:103]

### message-feedback（`ctx.messageFeedback`，Session log 事件）

| 符号 | 要点 |
|---|---|
| `ctx.messageFeedback` | Cordis 键。`MessageFeedbackService` 构造 `super(ctx, 'messageFeedback')`。Typert Remote 方法 `list` / `put` / `delete`。 [E: packages/feedback/message-feedback/src/index.ts:47] [E: packages/feedback/message-feedback/src/index.ts:135] [E: packages/feedback/message-feedback/src/index.ts:154] |
| `inject` | `['sessionPersistence', 'sessions']`。**没有** `storageDomain`。 [E: packages/feedback/message-feedback/src/index.ts:119] |
| `Config.maxNoteBytes` | 必填。Loader schema：`s.number().step(1).min(1).required()`。构造再跑正 `Number.isSafeInteger`，否则 `TypeError`。包内**没有**默认值。 [E: packages/feedback/message-feedback/src/index.ts:122] [E: packages/feedback/message-feedback/src/index.ts:136] |
| web-app 部署值 | `dsh-web-app` 行 `config.maxNoteBytes: 8192`。 [E: packages/bundle/web-app/cordis.patch.yml:56] |
| `MessageFeedbackRating` | `'positive' \| 'negative'`。 [E: packages/feedback/message-feedback/src/types.ts:17] |
| `MessageFeedbackItem` | `messageId` / `rating` / 可选 `note` / 可选 `category` / `version`（UUID brand）/ `createdAt` / `updatedAt`。出服务边界 freeze。 [E: packages/feedback/message-feedback/src/types.ts:20] |
| `feedback/message-put` / `feedback/message-delete` | merge 进 `SessionEventMap`。log-only，不进模型历史。词表两行都在。 [E: packages/feedback/message-feedback/src/types.ts:56] [E: packages/feedback/message-feedback/src/types.ts:58] [E: packages/core/session/src/known-event-types.ts:37] [E: packages/core/session/src/known-event-types.ts:38] |
| 当前 items | `currentItems` 按 log 序 fold：同 `sessionId` 的 put 覆盖该 `messageId`，delete 删掉。 [E: packages/feedback/message-feedback/src/index.ts:97] [E: packages/feedback/message-feedback/src/index.ts:101] [E: packages/feedback/message-feedback/src/index.ts:107] |
| `MessageFeedbackPutRequest.ifVersion` | 当前 item 的 version，或 `null` 要求「尚无 item」。 [E: packages/feedback/message-feedback/src/types.ts:87] |
| 失败码 | `session-not-found` / `target-not-found` / `version-conflict` / `note-blank` / `note-too-large`。`list` 只收第一种；`delete` 收 session-not-found 与 version-conflict。 |

没有 `messageFeedbackDomainSpec`，没有 domain `message_feedback` v0。

## 控制流

1. **两包两行，不要合成一个服务。** `dsh-base` insert `id: command-feedback` / `name: '@deepseek-ai/dsh-command-feedback'`，dependencies 也声明该包。`dsh-web-app` 另 insert `id: message-feedback` / `name: '@deepseek-ai/dsh-message-feedback'`，`maxNoteBytes: 8192`；web-app dependencies 声明 message-feedback，base **没有**。headless / sdk / acp overlay 不声明 message-feedback；它们叠 base 因而继承 `/feedback` 与 `ctx.sessionFeedback`，**不**挂 `ctx.messageFeedback`。`sdk-minimal` 不叠 `dsh-base`，不带 command-feedback 行。 [E: packages/bundle/base/cordis.patch.yml:289] [E: packages/bundle/base/cordis.patch.yml:290] [E: packages/bundle/base/package.json:46] [E: packages/bundle/web-app/cordis.patch.yml:53] [E: packages/bundle/web-app/cordis.patch.yml:54] [E: packages/bundle/web-app/package.json:110]

2. **`command-feedback` 注册命令并挂 Remote。** `apply`：`ctx.plugin(SessionFeedbackService)`，再 `ctx.commands.register`：全局名 `feedback`，`description: 'Record feedback about this session'`，`recordInput: false`。卸 fiber 即从注册表与 `ctx.sessionFeedback` 消失。 [E: packages/feedback/command-feedback/src/index.ts:117] [E: packages/feedback/command-feedback/src/index.ts:121] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:106] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:147]

3. **`/feedback` 走人命令 `execute`，不进模型 turn。** `CommandRuntime.execute` 解析 slash 行、查表；`signal.aborted` 在写 `command/run` **之前**抛错，session 仍空。过了准入才 `append` `command/run`（本命令无 `args`），再跑 handler，最后 `command/done`。handler 不调用 `agent.send` / `followup` / `steer`。 [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:252] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:258] [E: packages/interaction/commands/src/index.ts:376]

4. **空输入 fail-closed，不写 `feedback/record`。** `rawInput.trim().length === 0`（含裸 `/feedback` 与纯空白）返回 `{ kind: 'error', text: 'Feedback text is required. Usage: /feedback <text>' }`，不调用 `recordFeedback`，也不碰匿名 user id。log 只剩 `command/run` + `command/done { kind: 'error' }`。 [E: packages/feedback/command-feedback/src/index.ts:74] [E: packages/feedback/command-feedback/src/index.ts:75] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:241]

5. **`recordFeedback` 只 append，ack 不保证落盘。** 非空命令路径：`recordFeedback(invocation.agent.session, { text: invocation.rawInput })` → trim → `session.append('feedback/record', { text })`。handler **没有** `sessions.flush`。随后 `getOrCreateAnonymousUserId()` 读/铸 `$DSH_HOME/.anonymous-user-id`，返回 `kind: 'success'` 文案（不再拼 sharing 句）。事件序是 `command/run` → `feedback/record` → `command/done`。也可不经命令直接调 `recordFeedback` 或 `sessionFeedback.record`。 [E: packages/feedback/command-feedback/src/index.ts:77] [E: packages/feedback/command-feedback/src/index.ts:80] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:155] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:191]

6. **`feedback/record` 不进 `deriveMessages()`。** 该 type 不是 surface 事件，每条都没有 `surfaceOp`，`deriveEventMessage` 返回 `null`，`surface.nodes` 与 `deriveMessages()` 皆 `[]`。并发两次 `/feedback` 按 dispatch 序各追加一条，不替换旧条。 [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:227] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:232] [E: packages/core/session/src/surface.ts:92]

7. **`message-feedback` 启动：只挂 Remote，不打开 storage domain。** `Service.init` 登记 dispose：先把 `mutationAdmissionOpen = false`、等完 `operationTails`。没有 `domain.close()`。 [E: packages/feedback/message-feedback/src/index.ts:142] [E: packages/feedback/message-feedback/src/index.ts:144]

8. **`list`：确认 Session 存在，再 fold 当前 items。** live 与盘上都没有该 id → `{ ok: false, error: { code: 'session-not-found' } }`。有则 `currentItems(sessionId, events)`。 [E: packages/feedback/message-feedback/src/index.ts:226] [E: packages/feedback/message-feedback/src/index.ts:229] [E: packages/feedback/message-feedback/src/index.ts:157]

9. **`put`：note 先本地校验，再串行化、对 target、CAS、再 append。** `resolveNote`：`undefined` 合法；`trim().length === 0` → `note-blank`；`Buffer.byteLength(note, 'utf8') > maxNoteBytes` → `note-too-large`。这两种在碰 persistence **之前**返回。过了才按 `sessionId` 串行。target 要求 log 里存在 `type === 'assistant/message'` **且** `isAppendSurfaceEvent` **且** `deriveEventMessage(event)?.id === request.messageId`。因此 user 消息、空 content assistant，一律 `target-not-found`。 [E: packages/feedback/message-feedback/src/index.ts:168] [E: packages/feedback/message-feedback/src/index.ts:172] [E: packages/feedback/message-feedback/src/index.ts:286] [E: packages/core/session/src/surface.ts:60] [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:292]

10. **live target 必须先 append 再 `flush`，再核对盘前缀。** live 路径：`live.append` 后 `sessions.flush(live)`；返回 `false` 抛 `message-feedback: no durability listener participated for live session '…'`；成功后再 `sessionPersistence.open(..., 'read')` 核对 header 身份与最后一条事件。冷会话走 write handle `append` + `flush`，并 `parallel('feedback/committed', …)`。 [E: packages/feedback/message-feedback/src/index.ts:236] [E: packages/feedback/message-feedback/src/index.ts:240] [E: packages/feedback/message-feedback/src/index.ts:267] [E: packages/feedback/message-feedback/src/index.ts:271]

11. **CAS：`ifVersion` 必须等于现项 version，或在创建时为 `null`。** 不匹配 → `version-conflict`。rating / note / category 都没变：返回已存 item，**不**换 version，`append()` 空操作只为走 live flush 门。有实质变化：新 UUID version；`createdAt` 保留；`updatedAt = max(now, existing.updatedAt)`。 [E: packages/feedback/message-feedback/src/index.ts:178] [E: packages/feedback/message-feedback/src/index.ts:181] [E: packages/feedback/message-feedback/src/index.ts:196]

12. **`delete`：缺项即成功。** 找不到该 `messageId` → `{ ok: true, value: { absent: true } }`，**不管**传入的 `ifVersion`，只跑空 `append()`。现项必须 version 精确相等才 `append('feedback/message-delete', …)`；否则 `version-conflict`。 [E: packages/feedback/message-feedback/src/index.ts:209] [E: packages/feedback/message-feedback/src/index.ts:211] [E: packages/feedback/message-feedback/src/index.ts:214]

13. **卸店拒收新 mutation。** `mutationAdmissionOpen === false` 时 `enqueue` 立刻 `reject(new Error('message-feedback: service is disposing'))`。已经入队的 put 会跑完。 [E: packages/feedback/message-feedback/src/index.ts:302]

## 设计动机

DSH 把「人对**整段会话**说的一句话」和「人对**某一条已经画出来的 assistant 气泡**点赞/踩」拆开，因为触发面、可变性、以及谁消费它们都不同。两者现在都进 **同一份 Session log**，都是 log-only，都不进 `deriveMessages()`。

`feedback/record` 是 append-only 事实：进 Session log 才能让 telemetry 在 `FEEDBACK_ONLY` 下把「到这条为止的前缀」当成同意分享的游标。`recordInput: false` 避免 `command/run.args` 与 domain 事件各存一份原文。ack 不 `flush`，是因为人命令的结算语义是「registry 已经记下」，落盘仍走普通 `session/event` 排空。`recordFeedback` 允许空 `{}`，是因为「人点了要评审」本身就授权回放，不必逼一句正文。

`message-feedback` 曾经是 `storage-domain` sidecar（`message_feedback` v0）。现改成 `feedback/message-put` / `feedback/message-delete`：当前值由 log fold 得出，fork 继承的是父事件前缀，新生命周期用自己的 `sessionId` 过滤。CAS 仍用 UUID `version`。live 路径仍要求 flush 后再核对盘前缀，挡住「内存里看见、盘上还没有」的气泡。`maxNoteBytes` 没有包内默认，逼部署在 Loader 边界选一个正整数（web-app 选 8192）。

两包因此不能合成 `ctx.feedback`：一个出现在叠 `dsh-base` 的 host（`web` / `headless` / `sdk` / `acp`）；一个只出现在 web-app。

## Gotcha

- **不是同一个服务。** `/feedback` 与 `sessionFeedback.record` 写 `feedback/record`。`put` / `delete` 写 `feedback/message-put` / `feedback/message-delete`，不触发 `FEEDBACK_ONLY` 游标。不要在 headless / sdk / acp 上找 `ctx.messageFeedback`。
- **不要把 `id: ui-message-feedback` 当成这个子系统。** 那是 client 组件行，消费 Remote；本页合同停在两个 Host 服务。 [E: packages/bundle/web-app/cordis.patch.yml:321]
- **`/feedback` 空输入仍有 command 信封。** 失败是 `command/done.kind === 'error'`。已 abort 的 `execute` 连信封都没有。`recordFeedback({})` 与 `sessionFeedback.record({ sessionId })` 相反：会留下一条空 `feedback/record`。 [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:235] [E: packages/feedback/command-feedback/tests/command-feedback.spec.ts:128]
- **trim 策略两边不一样。** `recordFeedback` 存的是 trim 后文本（全空白则省略 `text`）。message `note` 只要含非空白就**原样**保存，只在「全空白」时 `note-blank`。
- **ack ≠ 落盘。** `recordFeedback` 与 `/feedback` handler 都不 `flush`。message-feedback 的 live `put` **会** `flush`。
- **target 是 append-origin assistant 投影。** 空 content 的 assistant 壳投影为 `null`，`target-not-found`。 [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:275]
- **`maxNoteBytes: 0` 在构造期就炸**，不是业务失败码。 [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:309]
- **live 无 flush 参与者是抛错，不是 `target-not-found`。** [E: packages/feedback/message-feedback/src/index.ts:242]
- **`note-blank` / `note-too-large` 按 UTF-8 字节。** `'ééé'` 在 `maxNoteBytes: 4` 下是 `actualBytes: 6`；`'😀'`（4 字节）可通过。这两种失败不碰 persistence。 [E: packages/feedback/message-feedback/tests/message-feedback.spec.ts:261]
- **没有 sidecar 文件。** 不要再在 `$DSH_HOME/storages/` 下找 `message_feedback.json`。当前评分在 JSONL 事件里。
- **live 读仍走 `snapshotEvents()`。** 源码标了 deprecated；wiki 不把它写成推荐同步读 API。新生产代码应走 session 的现行读合同。 [I]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition（会话评语） | `@deepseek-ai/dsh-command-feedback` 对 `SessionEventMap` 的 merge + 导出 `recordFeedback` | 事件 `feedback/record`；另有 `ctx.sessionFeedback` | `dsh-base` `id: command-feedback`。preset **不**重挂 |
| Provider（`/feedback` + Remote） | 同一包的 `apply` | `ctx.commands.register`；`inject = ['commands']`；`SessionFeedbackService.inject = ['sessions']` | 同上。叠 base 的 `web` / `headless` / `sdk` / `acp` 继承该行 |
| Consumer（评语） | `dsh-commands` 记信封；可选 telemetry backend 听 `feedback/record` | 不经 `ctx.messageFeedback` | telemetry 行可被 `DSH_TELEMETRY_DISABLED` 卸掉 |
| Definition（逐条评分） | `@deepseek-ai/dsh-message-feedback` 的 types + 两条 Session 事件 | `MessageFeedbackItem` / 五类失败码 / `feedback/message-put` / `feedback/message-delete` | 无 preset 行；`./types` 给 Remote 客户端 |
| Provider（逐条评分） | `MessageFeedbackService` | `ctx.messageFeedback`；Remote `list`/`put`/`delete`；`inject = ['sessionPersistence','sessions']` | **仅** `dsh-web-app` `id: message-feedback`，`maxNoteBytes: 8192` |
| Consumer（逐条评分） | web-app 的 `id: ui-message-feedback`（本页不展开） | Typert Remote，经 Session log | `dsh-headless` / `sdk` / `acp` / `sdk-minimal` **无** 此行 |

换 telemetry backend 只换 `feedback/record` 的上传策略，不能改 `recordFeedback` 的 log-only 合同。换 storage backend **不再**影响逐条评分：它已经不走 `storage-domain`。preset 不要 publish `messageFeedback` 或 `sessionFeedback`：它们是 process-global host 服务。

## Sources

- packages/feedback/command-feedback/src/index.ts
- packages/feedback/command-feedback/src/types.ts
- packages/feedback/command-feedback/tests/command-feedback.spec.ts
- packages/feedback/command-feedback/tests/loader-composition.spec.ts
- packages/feedback/message-feedback/src/index.ts
- packages/feedback/message-feedback/src/types.ts
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
- packages/identity/anonymous-user-id/src/index.ts

## 相关

- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面；入口是 `dsh web` 以及 `dsh --profile headless|sdk|sdk-minimal|acp`。
- [subsys.interaction.commands](./commands.md)：`ctx.commands`；人命令不经模型 turn；`recordInput` 默认 true，本页的 `/feedback` 显式 false。
- [subsys.persistence.telemetry](../persistence/telemetry.md)：`sharing` 三档；`FEEDBACK_ONLY` 只在已提交的 `feedback/record` 上回放前缀。
- [subsys.core.session](../core/session.md)：`Session.append`、`deriveMessages()`、四类 surface（含 `system/message`）。
- [spine.session-log](../../spine/session-log.md)：log-only 事件与模型历史的边界。
- [subsys.persistence.storage](../persistence/storage.md)：`storage-domain` hub。message-feedback **不再**是它的消费者。
- [subsys.composition.bundle-base](../composition/bundle-base.md)：host 行 `id: command-feedback`。
- [subsys.composition.bundle-web-app](../composition/bundle-web-app.md)：叠在 base 上的 `id: message-feedback`。
