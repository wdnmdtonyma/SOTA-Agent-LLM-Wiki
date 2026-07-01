---
id: session-v2.inbox
title: Session inbox(durable admission & promotion)
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/session/input.ts
  - packages/core/src/session.ts
  - packages/core/src/session/sql.ts
  - packages/core/src/session/runner/llm.ts
  - packages/core/src/session/projector.ts
  - packages/core/src/session/run-coordinator.ts
  - packages/schema/src/session-input.ts
  - packages/schema/src/session-delivery.ts
  - packages/schema/src/session-event.ts
  - specs/v2/session.md
symbols:
  - SessionInput.Admitted
  - SessionInput.admit
  - SessionInput.promoteSteers
  - SessionInput.promoteNextQueued
  - SessionInput.projectAdmitted
  - SessionInput.projectPrompted
related:
  - spine.v2-admission
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 Session inbox 是 `session_input` durable admission 表和 `PromptAdmitted` / `Prompted` event pair:`SessionV2.prompt(...)` 先 admit prompt,runner 只在 safe provider-turn boundary promote,projector 再把 promoted input 变成 `session_message` user row。

## 能回答的问题

- `SessionV2.prompt(...)` 为什么先返回 `SessionInput.Admitted` 而不是直接写 user message?
- `delivery: "steer"` 和 `delivery: "queue"` 的持久化字段、默认值、promotion 顺序分别是什么?
- exact retry 如何用同一个 message id 幂等返回,冲突复用如何被拒绝?
- V1 shadow bridge 的 `Prompted` event 如何兼容新的 `session_input` inbox?
- `session_input` 与 `session_message` 的唯一约束分别保护什么?

## 职责边界

Session inbox 的职责是把 prompt admission 和 model-visible transcript projection 拆成两个 durable steps:`SessionInput.admit` 发布 `SessionEvent.PromptAdmitted`,该事件投影到 `SessionInputTable`;`SessionInput.promoteSteers` 或 `SessionInput.promoteNextQueued` 选择 pending rows 后发布 `SessionEvent.Prompted`;projector 在 `Prompted` projection 中标记 inbox row promoted 并插入 `SessionMessage.User`。[E: packages/core/src/session/input.ts:54][E: packages/schema/src/session-event.ts:94][E: packages/core/src/session/projector.ts:364][E: packages/core/src/session/input.ts:245][E: packages/core/src/session/input.ts:268][E: packages/core/src/session/input.ts:224][E: packages/core/src/session/projector.ts:350][E: packages/core/src/session/projector.ts:353][E: packages/core/src/session/projector.ts:361]

Session inbox 不执行 provider turn,也不拥有 process-local drain coordination。`SessionV2.prompt(...)` 的 advisory wake 调用 `execution.wake(admitted.sessionID)`,而 process-local coalescing lives in `SessionRunCoordinator.wake`。[E: packages/core/src/session.ts:360][E: packages/core/src/session.ts:382][E: packages/core/src/session/run-coordinator.ts:81][I] V2 spec 定义 `wake` 只在能 promote eligible input 时调用 provider,显式 `run` 才 forced drain。[E: specs/v2/session.md:160][E: specs/v2/session.md:162][E: specs/v2/session.md:163]

## 关键文件

| 文件 | 作用 |
|---|---|
| `packages/core/src/session/input.ts` | `SessionInput.Admitted` row conversion、admit/find/project/promote helpers、message id reservation guard。 |
| `packages/core/src/session.ts` | `SessionV2.prompt(...)` public service method,默认 delivery,exact retry conflict wrapping,advisory wake。 |
| `packages/core/src/session/sql.ts` | `SessionInputTable` 和 `SessionMessageTable` 的 SQLite schema/indexes。 |
| `packages/core/src/session/runner/llm.ts` | safe boundary promotion: steer batch、queue FIFO opener、post-turn continuation loop。 |

## 数据模型

| 实体/字段 | 含义 | 证据 |
|---|---|---|
| `Delivery` | 只允许 `"steer"` 或 `"queue"`。 | [E: packages/schema/src/session-delivery.ts:5] |
| `SessionInput.Admitted.admittedSeq` | admission event 的 aggregate sequence,用于 promotion ordering 与 visible admission receipt。 | [E: packages/schema/src/session-input.ts:15][E: packages/schema/src/session-input.ts:16][E: packages/core/src/session/input.ts:68] |
| `SessionInput.Admitted.promotedSeq` | 可选 promoted event sequence;未 promoted 时为空。 | [E: packages/schema/src/session-input.ts:22][E: packages/core/src/session/input.ts:29] |
| `session_input.id` | inbox row primary key,类型是 `SessionMessage.ID`,即 prompt message id。 | [E: packages/core/src/session/sql.ts:143][E: packages/core/src/session/input.ts:104] |
| `session_input.prompt` | encoded `Prompt` JSON。 | [E: packages/core/src/session/sql.ts:148][E: packages/core/src/session/input.ts:107] |
| `session_input.delivery` | persisted steer/queue delivery mode。 | [E: packages/core/src/session/sql.ts:149][E: packages/core/src/session/input.ts:108] |
| `session_input.admitted_seq` | admission sequence,per session unique。 | [E: packages/core/src/session/sql.ts:150][E: packages/core/src/session/sql.ts:163] |
| `session_input.promoted_seq` | promotion sequence,per session unique when non-null。 | [E: packages/core/src/session/sql.ts:151][E: packages/core/src/session/sql.ts:164] |
| pending index | pending rows are indexed by session, promoted state, delivery, admitted sequence。 | [E: packages/core/src/session/sql.ts:157][E: packages/core/src/session/sql.ts:158][E: packages/core/src/session/sql.ts:159][E: packages/core/src/session/sql.ts:160][E: packages/core/src/session/sql.ts:161] |
| `session_message.seq` | projected message chronology follows synchronized event aggregate sequence。 | [E: packages/core/src/session/sql.ts:128][E: packages/core/src/session/projector.ts:203][E: specs/v2/session.md:175] |

## 控制流

1. `SessionV2.prompt@packages/core/src/session.ts:360` loads the session, resolves prompt attachments, creates a message id when missing, and defaults missing delivery to `"steer"`。[E: packages/core/src/session.ts:363][E: packages/core/src/session.ts:364][E: packages/core/src/session.ts:365][E: packages/core/src/session.ts:366]

2. `SessionV2.prompt` calls `SessionInput.admit(db, events, { id, sessionID, prompt, delivery })`, maps `SessionInput.LifecycleConflict` into `PromptConflictError`, verifies returned admission equivalence, and wakes execution unless `resume === false`。[E: packages/core/src/session.ts:368][E: packages/core/src/session.ts:374][E: packages/core/src/session.ts:380][E: packages/core/src/session.ts:382][E: packages/core/src/session/input.ts:191]

3. `SessionInput.admit@packages/core/src/session/input.ts:41` first calls `find` by message id and returns the existing admission if present, so exact retry can be idempotent before any new event publish。[E: packages/core/src/session/input.ts:51][E: packages/core/src/session/input.ts:52]

4. For a new input, `SessionInput.admit` publishes `SessionEvent.PromptAdmitted` with `messageID/sessionID/timestamp/prompt/delivery`, then returns an `Admitted` object whose `admittedSeq` is the synchronized event sequence。[E: packages/core/src/session/input.ts:54][E: packages/core/src/session/input.ts:55][E: packages/core/src/session/input.ts:56][E: packages/core/src/session/input.ts:57][E: packages/core/src/session/input.ts:58][E: packages/core/src/session/input.ts:59][E: packages/core/src/session/input.ts:60][E: packages/core/src/session/input.ts:68]

5. Projector registers `events.project(SessionEvent.PromptAdmitted, ...)` and calls `SessionInput.projectAdmitted`, which refuses to reserve an id already present in `SessionMessageTable` and inserts into `SessionInputTable` with `onConflictDoNothing`。[E: packages/core/src/session/projector.ts:364][E: packages/core/src/session/input.ts:94][E: packages/core/src/session/input.ts:100][E: packages/core/src/session/input.ts:101][E: packages/core/src/session/input.ts:111]

6. In runner, when `promotion === "steer"`, a cutoff is captured from `EventV2.latestSequence`, then `promoteSteers` promotes all pending steers admitted at or before that cutoff in admitted order。[E: packages/core/src/session/runner/llm.ts:182][E: packages/core/src/session/runner/llm.ts:183][E: packages/core/src/session/runner/llm.ts:185][E: packages/core/src/session/input.ts:245][E: packages/core/src/session/input.ts:259][E: packages/core/src/session/input.ts:262]

7. When `promotion === "queue"`, runner promotes exactly one oldest queued row first, then promotes eligible steers up to the same cutoff;the V2 spec describes queued inputs as FIFO future activities and steer inputs as next-boundary work。[E: packages/core/src/session/runner/llm.ts:186][E: packages/core/src/session/runner/llm.ts:187][E: packages/core/src/session/runner/llm.ts:188][E: packages/core/src/session/input.ts:268][E: packages/core/src/session/input.ts:280][E: packages/core/src/session/input.ts:283][E: specs/v2/session.md:155][E: specs/v2/session.md:157][E: specs/v2/session.md:158]

8. `SessionInput.publish` emits `SessionEvent.Prompted` for each selected row; duplicate lifecycle conflicts are tolerated only when the stored row is already promoted。[E: packages/core/src/session/input.ts:216][E: packages/core/src/session/input.ts:224][E: packages/core/src/session/input.ts:225][E: packages/core/src/session/input.ts:233][E: packages/core/src/session/input.ts:236]

9. Projector handles `Prompted` by calling `SessionInput.projectPrompted`, then `run(db,event)` projects the visible `SessionMessage.User` through message updater and `insertMessage`。[E: packages/core/src/session/projector.ts:350][E: packages/core/src/session/projector.ts:353][E: packages/core/src/session/projector.ts:361][E: packages/core/src/session/projector.ts:193][E: packages/core/src/session/projector.ts:198]

10. `projectPrompted` updates `promoted_seq` only if it is currently null; if no admitted row exists, it inserts an already-promoted row for the legacy prompt path。[E: packages/core/src/session/input.ts:129][E: packages/core/src/session/input.ts:136][E: packages/core/src/session/input.ts:155][E: packages/core/src/session/input.ts:163]

## 设计动机与权衡

- The V2 spec states that `session_input` is the durable admission inbox and admitted inputs stay outside model-visible history until serialized runner promotion; code follows the same split by projecting `PromptAdmitted` to `SessionInputTable` and `Prompted` to `session_message` user rows。[E: specs/v2/session.md:35][E: packages/core/src/session/input.ts:101][E: packages/core/src/session/projector.ts:350][E: packages/core/src/session/projector.ts:361]
- The V2 spec records the reason for explicit delivery modes: steer inputs promote at the next safe provider-turn boundary, while queue inputs form a FIFO of future activities and only one queued input opens the next activity when the current one settles。[E: specs/v2/session.md:155][E: specs/v2/session.md:157][E: specs/v2/session.md:158]
- `SessionV2.prompt(...)` scheduling is advisory: exact reuse returns the same admitted lifecycle receipt; `resume: false` suppresses wake according to the public prompt contract, while the source wake path uses only `sessionID` in current HEAD。[E: specs/v2/session.md:16][E: specs/v2/session.md:18][E: specs/v2/session.md:19][E: packages/core/src/session.ts:382][I]
- Post-crash activity recovery is intentionally not inferred from `wake`; explicit `run` may continue from durable projected history, while advisory wake only drains eligible inbox work。[E: specs/v2/session.md:163][E: specs/v2/session.md:165]

## Gotcha

- `packages/opencode/src/session/message-v2.ts` is not this V2 inbox; it is the V1 to AI SDK message conversion layer by file location and naming convention from the wiki mainline prompt. For V2 inbox facts, use `packages/core/src/session/input.ts` and `packages/schema/src/session-event.ts` as source of truth。[I]
- The current promotion event is `SessionEvent.Prompted`, not a separate `PromptLifecycle.Promoted` event. `Prompted` both marks `promoted_seq` and produces the visible user message through projector/update code。[E: packages/core/src/session/input.ts:224][E: packages/core/src/session/projector.ts:350][E: packages/core/src/session/projector.ts:353][E: packages/core/src/session/projector.ts:361]

## Sources

- packages/core/src/session/input.ts
- packages/core/src/session.ts
- packages/core/src/session/sql.ts
- packages/core/src/session/runner/llm.ts
- packages/core/src/session/projector.ts
- packages/core/src/session/run-coordinator.ts
- packages/schema/src/session-input.ts
- packages/schema/src/session-delivery.ts
- packages/schema/src/session-event.ts
- specs/v2/session.md

## 相关

- [V2 prompt admission](../../spine/v2-admission.md)
