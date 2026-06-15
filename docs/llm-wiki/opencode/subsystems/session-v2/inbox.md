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
  - specs/v2/session.md
symbols:
  - SessionInput.Admitted
  - SessionInput.admit
  - SessionInput.promoteSteers
  - SessionInput.promoteNextQueued
  - SessionInput.projectAdmitted
  - SessionInput.projectPromoted
related:
  - spine.v2-admission
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V2 Session inbox 是 `session_input` durable admission 表和 `PromptLifecycle.*` event pair: `SessionV2.prompt(...)` 先 admit prompt, runner 只在 safe provider-turn boundary promote, projector 再把 promoted input 变成 `session_message` user row。

## 能回答的问题

- `SessionV2.prompt(...)` 为什么先返回 `SessionInput.Admitted` 而不是直接写 user message?
- `delivery: "steer"` 和 `delivery: "queue"` 的持久化字段、默认值、promotion 顺序分别是什么?
- exact retry 如何用同一个 message id 幂等返回,冲突复用如何被拒绝?
- V1 shadow bridge 的 `Prompted` event 如何兼容新的 `session_input` inbox?
- `session_input` 与 `session_message` 的唯一约束分别保护什么?

## 职责边界

Session inbox 的职责是把 prompt admission 和 model-visible transcript projection 拆成两个 durable steps: `SessionInput.admit` 发布 `SessionEvent.PromptLifecycle.Admitted`,该事件投影到 `SessionInputTable`; `SessionInput.promoteSteers` 或 `SessionInput.promoteNextQueued` 发布 `SessionEvent.PromptLifecycle.Promoted`; projector 在 promoted event 的 projection 中标记 inbox row promoted 并插入 `SessionMessage.User`。[E: packages/core/src/session/input.ts:68][E: packages/core/src/session/input.ts:128][E: packages/core/src/session/input.ts:280][E: packages/core/src/session/input.ts:156][E: packages/core/src/session/input.ts:161][E: packages/core/src/session/projector.ts:401][E: packages/core/src/session/projector.ts:404]

Session inbox 不执行 provider turn,也不拥有 process-local drain coordination。`SessionV2.prompt(...)` 的 advisory wake 最终调用 `execution.wake(admitted.sessionID, admitted.admittedSeq)`;V2 spec 定义 `wake` 只在能 promote eligible input 时调用 provider,显式 `run` 才至少尝试一次 provider attempt。[E: packages/core/src/session.ts:177][E: specs/v2/session.md:158][E: specs/v2/session.md:159][I]

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `packages/core/src/session/input.ts` | `SessionInput.Admitted` schema、admit/find/project/promote helpers、reserved message id guard。 |
| `packages/core/src/session.ts` | `SessionV2.prompt(...)` public service method,默认 delivery,exact retry conflict wrapping,advisory wake。 |
| `packages/core/src/session/sql.ts` | `SessionInputTable` 和 `SessionMessageTable` 的 SQLite schema/indexes。 |
| `packages/core/src/session/runner/llm.ts` | safe boundary promotion: steer batch、queue FIFO opener、post-turn queue activity loop。 |

## 数据模型

| 实体/字段 | 含义 | 证据 |
| --- | --- | --- |
| `Delivery` | 只允许 `"steer"` 或 `"queue"`。 | [E: packages/core/src/session/input.ts:18] |
| `SessionInput.Admitted.admittedSeq` | admission event 的 aggregate sequence,用于 promotion ordering 与 wake seq。 | [E: packages/core/src/session/input.ts:22][E: packages/core/src/session/input.ts:81][E: packages/core/src/session/input.ts:317][E: packages/core/src/session.ts:177] |
| `SessionInput.Admitted.promotedSeq` | 可选 promoted event sequence;未 promoted 时为空。 | [E: packages/core/src/session/input.ts:28][E: packages/core/src/session/input.ts:42] |
| `session_input.id` | inbox row primary key,类型是 `SessionMessage.ID`,即 prompt message id。 | [E: packages/core/src/session/sql.ts:142][E: packages/core/src/session/input.ts:130][E: packages/core/src/session/projector.ts:389] |
| `session_input.prompt` | encoded `Prompt` JSON。 | [E: packages/core/src/session/sql.ts:147][E: packages/core/src/session/input.ts:133] |
| `session_input.delivery` | persisted steer/queue delivery mode。 | [E: packages/core/src/session/sql.ts:148][E: packages/core/src/session/input.ts:134] |
| `session_input.admitted_seq` | admission sequence,per session unique。 | [E: packages/core/src/session/sql.ts:149][E: packages/core/src/session/sql.ts:162] |
| `session_input.promoted_seq` | promotion sequence,per session unique when non-null。 | [E: packages/core/src/session/sql.ts:150][E: packages/core/src/session/sql.ts:163] |
| pending index | pending rows are indexed by session, promoted state, delivery, admitted sequence。 | [E: packages/core/src/session/sql.ts:156][E: packages/core/src/session/sql.ts:157][E: packages/core/src/session/sql.ts:158][E: packages/core/src/session/sql.ts:159][E: packages/core/src/session/sql.ts:160] |
| `session_message.seq` | projected message chronology follows synchronized event aggregate sequence。 | [E: packages/core/src/session/sql.ts:127][E: packages/core/src/session/projector.ts:204][E: specs/v2/session.md:169] |

## 控制流

1. `SessionV2.prompt@packages/core/src/session.ts:348` loads the session, creates a message id when missing, and defaults missing delivery to `"steer"`。[E: packages/core/src/session.ts:351][E: packages/core/src/session.ts:356][E: packages/core/src/session.ts:357]
2. `SessionV2.prompt` calls `SessionInput.admit(db, events, { id, sessionID, prompt, delivery })`, maps `SessionInput.LifecycleConflict` into `PromptConflictError`, and verifies the returned admission is equivalent to the expected admission data。[E: packages/core/src/session.ts:359][E: packages/core/src/session.ts:360][E: packages/core/src/session.ts:361][E: packages/core/src/session.ts:362][E: packages/core/src/session.ts:363][E: packages/core/src/session.ts:366][E: packages/core/src/session.ts:367][E: packages/core/src/session.ts:371][E: packages/core/src/session/input.ts:205][E: packages/core/src/session/input.ts:208][E: packages/core/src/session/input.ts:209]
3. `SessionInput.admit@packages/core/src/session/input.ts:54` first calls `find` by message id and returns the existing admission if present, so exact retry can be idempotent before any new event publish。[E: packages/core/src/session/input.ts:46][E: packages/core/src/session/input.ts:64][E: packages/core/src/session/input.ts:65]
4. For a new input, `SessionInput.admit` publishes `SessionEvent.PromptLifecycle.Admitted` with `messageID/sessionID/timestamp/prompt/delivery`, then returns an `Admitted` object whose `admittedSeq` is the synchronized event sequence。[E: packages/core/src/session/input.ts:68][E: packages/core/src/session/input.ts:69][E: packages/core/src/session/input.ts:70][E: packages/core/src/session/input.ts:71][E: packages/core/src/session/input.ts:72][E: packages/core/src/session/input.ts:73][E: packages/core/src/session/input.ts:81]
5. Projector registers `events.project(SessionEvent.PromptLifecycle.Admitted, ...)` and calls `SessionInput.projectAdmitted`, which refuses to reserve an id already present in `SessionMessageTable` and inserts into `SessionInputTable` with `onConflictDoNothing`。[E: packages/core/src/session/projector.ts:387][E: packages/core/src/session/input.ts:121][E: packages/core/src/session/input.ts:126][E: packages/core/src/session/input.ts:128][E: packages/core/src/session/input.ts:137]
6. `SessionInput.guardReservedID` runs before event commit through `events.beforeCommit`, skips prompt lifecycle events, looks up reserved ids in `session_input`, and dies if a non-lifecycle event tries to use a message id already reserved there。[E: packages/core/src/session/projector.ts:216][E: packages/core/src/session/input.ts:216][E: packages/core/src/session/input.ts:217][E: packages/core/src/session/input.ts:220][E: packages/core/src/session/input.ts:222][E: packages/core/src/session/input.ts:226][E: packages/core/src/session/input.ts:229]
7. In runner, when promotion is `"steer"`, a cutoff is captured from `SessionInput.latestSeq`, then `promoteSteers` promotes all pending steers admitted at or before that cutoff in admitted order。[E: packages/core/src/session/runner/llm.ts:195][E: packages/core/src/session/input.ts:311][E: packages/core/src/session/input.ts:312][E: packages/core/src/session/input.ts:313][E: packages/core/src/session/input.ts:314][E: packages/core/src/session/input.ts:317]
8. When promotion is `"queue"`, runner promotes exactly one oldest queued row first, then promotes eligible steers up to the same cutoff;the V2 spec describes queued inputs as FIFO future activities and steer inputs as next-boundary work。[E: packages/core/src/session/runner/llm.ts:196][E: packages/core/src/session/runner/llm.ts:197][E: packages/core/src/session/runner/llm.ts:198][E: packages/core/src/session/input.ts:333][E: packages/core/src/session/input.ts:334][E: packages/core/src/session/input.ts:335][E: packages/core/src/session/input.ts:338][E: packages/core/src/session/input.ts:339][E: packages/core/src/session/input.ts:342][E: specs/v2/session.md:153][E: specs/v2/session.md:154]
9. `SessionInput.publish` emits `SessionEvent.PromptLifecycle.Promoted` for each selected row; duplicate lifecycle conflicts are tolerated only when the stored row is already promoted。[E: packages/core/src/session/input.ts:280][E: packages/core/src/session/input.ts:289][E: packages/core/src/session/input.ts:291]
10. Projector handles `PromptLifecycle.Promoted` by calling `SessionInput.projectPromoted`, which updates `promoted_seq`, then `insertMessage` with the resulting `SessionMessage.User`。[E: packages/core/src/session/projector.ts:397][E: packages/core/src/session/projector.ts:404][E: packages/core/src/session/input.ts:154][E: packages/core/src/session/input.ts:156][E: packages/core/src/session/projector.ts:401]
11. `projectPromoted` updates `promoted_seq` only if it is currently null, checks stored prompt/time equality, and returns `toMessage(stored)`。[E: packages/core/src/session/input.ts:156][E: packages/core/src/session/input.ts:161][E: packages/core/src/session/input.ts:170][E: packages/core/src/session/input.ts:171][E: packages/core/src/session/input.ts:174]
12. `toMessage` constructs a `SessionMessage.User` payload typed as user, with text, files, agents, and created time from the admitted prompt。[E: packages/core/src/session/input.ts:348][E: packages/core/src/session/input.ts:349][E: packages/core/src/session/input.ts:350][E: packages/core/src/session/input.ts:351][E: packages/core/src/session/input.ts:352]

## 设计动机与权衡

- The V2 spec states that `session_input` is the durable admission inbox and admitted inputs stay outside model-visible history until serialized runner promotion; code follows the same split by projecting admitted events to `SessionInputTable` and promoted events to `SessionMessage.User`。[E: specs/v2/session.md:30][E: packages/core/src/session/input.ts:128][E: packages/core/src/session/projector.ts:404][E: packages/core/src/session/projector.ts:401]
- The V2 spec records the reason for explicit delivery modes: steer inputs promote at the next safe provider-turn boundary, while queue inputs form a FIFO of future activities and only one queued input opens the next activity when the current one settles。[E: specs/v2/session.md:151][E: specs/v2/session.md:153][E: specs/v2/session.md:154]
- `SessionV2.prompt(...)` scheduling is advisory: exact reuse returns the same admitted lifecycle receipt; `resume: false` suppresses wake according to the V2 spec, while the source wake path uses the admitted sequence as its execution cursor。[E: specs/v2/session.md:16][E: specs/v2/session.md:18][E: specs/v2/session.md:19][E: specs/v2/session.md:159][E: packages/core/src/session.ts:177][I]
- Post-crash activity recovery is intentionally not inferred from `wake`; explicit `run` may continue from durable projected history, while advisory wake only drains eligible inbox work。[E: specs/v2/session.md:159][E: specs/v2/session.md:161]

## Gotcha

- `packages/opencode/src/session/message-v2.ts` is not this V2 inbox; it is the V1 to AI SDK message conversion layer by file location and naming convention from the wiki mainline prompt. For V2 inbox facts, use `packages/core/src/session/input.ts` and `packages/core/src/session/event.ts` as source of truth。[I]
- `SessionEvent.Prompted` compatibility path first projects the already-visible prompt, then synthesizes an already-promoted inbox row through `projectLegacyPrompted` instead of going through new admission。[E: specs/v2/session.md:30][E: packages/core/src/session/projector.ts:370][E: packages/core/src/session/projector.ts:373][E: packages/core/src/session/input.ts:258][E: packages/core/src/session/input.ts:261][I]

## Sources

- `packages/core/src/session/input.ts`
- `packages/core/src/session.ts`
- `packages/core/src/session/sql.ts`
- `packages/core/src/session/runner/llm.ts`
- `packages/core/src/session/projector.ts`
- `specs/v2/session.md`

## 相关

- [V2 prompt admission](../../spine/v2-admission.md)
