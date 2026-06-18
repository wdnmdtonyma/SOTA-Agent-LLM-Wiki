---
id: session-v2.history-selection
title: 投影历史选择(compaction+epoch cutoff)
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/session/history.ts, packages/core/src/session/sql.ts, packages/core/src/session/store.ts, packages/core/src/session/runner/llm.ts, packages/core/src/session/runner/to-llm-message.ts, packages/core/src/session/projector.ts, packages/core/src/session/compaction.ts, packages/core/src/session/message.ts, packages/core/src/session/message-updater.ts, packages/core/src/session/context-epoch.ts, packages/core/src/session.ts, CONTEXT.md, specs/v2/session.md]
symbols: [SessionHistory.load, SessionHistory.loadForRunner, SessionHistory.entriesForRunner, latestCompaction, messageRows]
related: [session-v2.projector, session-v2.compaction]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V2 history selection 是从 `session_message` read model 中选出当前有效 chronological Session History 的查询层:它同时应用最新 compaction boundary 与 Context Epoch baseline cutoff。

## 能回答的问题
- `sessions.messages(...)` 与 runner provider turn 读的是同一套历史吗?
- 最新 compaction 会隐藏哪些旧消息?
- Context Epoch 的 `baseline_seq` 为什么会过滤旧 system messages?
- runner 为何要用 `{ seq, message }` entries 而不是只拿 message?
- `compaction` message 在 history 中怎样成为 provider checkpoint?

## 职责边界

`SessionHistory` 不投影 event,不 lower provider messages,也不估算 token;它只读取 `SessionMessageTable`,按 compaction boundary 与 epoch baseline seq 筛选 rows,再用 `SessionMessage.Message` schema decode。[E: packages/core/src/session/history.ts:30][E: packages/core/src/session/history.ts:32][E: packages/core/src/session/history.ts:34][E: packages/core/src/session/history.ts:38][E: packages/core/src/session/history.ts:46][E: packages/core/src/session/history.ts:56][I] Projection 由 `SessionProjector` 负责,provider lowering 由 `toLLMMessages` 负责,auto/overflow compaction 由 `SessionCompaction` 负责。[E: packages/core/src/session/projector.ts:199][E: packages/core/src/session/projector.ts:204][E: packages/core/src/session/runner/to-llm-message.ts:149][E: packages/core/src/session/compaction.ts:220][E: packages/core/src/session/compaction.ts:240]

`CONTEXT.md` 把 Session History 定义为 projected chronological conversation,并明确它是在 active compaction 与 Context Epoch cutoffs 后给 provider turn 使用的历史。[E: CONTEXT.md:12]

## 数据模型

| 表/字段 | 用法 |
|---|---|
| `session_message.seq` | durable aggregate sequence;history query 以该字段排序并作为 compaction/baseline boundary。[E: packages/core/src/session/sql.ts:127][E: packages/core/src/session/history.ts:38][E: packages/core/src/session/history.ts:46][E: packages/core/src/session/history.ts:49][E: specs/v2/session.md:169] |
| `session_message.type` | 查找最新 `type = "compaction"` row,并筛选旧 system rows。[E: packages/core/src/session/history.ts:17][E: packages/core/src/session/history.ts:41][E: packages/core/src/session/history.ts:46] |
| `session_context_epoch.baseline_seq` | current epoch 的 baseline cutoff;旧 system messages 不再参与当前 provider request。[E: packages/core/src/session/sql.ts:175][E: packages/core/src/session/history.ts:46][E: packages/core/src/session/history.ts:70][E: packages/core/src/session/runner/llm.ts:225] |
| `SessionMessage.Message` | decode read-model row 的 discriminated union,解码失败包装为 `MessageDecodeError`。[E: packages/core/src/session/message.ts:188][E: packages/core/src/session/history.ts:56][E: packages/core/src/session/history.ts:59] |

`SessionMessageTable` 对 `(session_id, seq)` 建 unique index,并对 `(session_id, type, seq)` 建 index,支持按 session/type/sequence 选择历史边界。[E: packages/core/src/session/sql.ts:132][E: packages/core/src/session/sql.ts:133]

## 控制流

1. `latestCompaction@packages/core/src/session/history.ts:13` 查询当前 session 最后一条 `type = "compaction"` 的 `session_message`,按 `seq desc` 排序并 `limit(1)`。[E: packages/core/src/session/history.ts:17][E: packages/core/src/session/history.ts:18][E: packages/core/src/session/history.ts:19]

2. `messageRows@packages/core/src/session/history.ts:24` 是核心 query builder;它读取同 session rows,按 `seq asc` 输出 chronological order。[E: packages/core/src/session/history.ts:30][E: packages/core/src/session/history.ts:32][E: packages/core/src/session/history.ts:35][E: packages/core/src/session/history.ts:49]

3. 当存在 latest compaction 且没有 `baselineSeq` 时,`messageRows` 保留 `seq >= compaction.seq` 的 rows;当同时有 `baselineSeq` 时,non-system rows 仍必须 `seq >= compaction.seq`,而 system rows 可以通过 `type = "system" && seq > baselineSeq` 分支保留。[E: packages/core/src/session/history.ts:36][E: packages/core/src/session/history.ts:38][E: packages/core/src/session/history.ts:39][E: packages/core/src/session/history.ts:40][E: packages/core/src/session/history.ts:41][E: packages/core/src/session/history.ts:46]

4. 当 caller 提供 `baselineSeq` 时,`messageRows` 还要求 rows 满足 `type != "system" || seq > baselineSeq`;这会移除 `seq <= baselineSeq` 的 old chronological system messages。[E: packages/core/src/session/history.ts:44][E: packages/core/src/session/history.ts:46]

5. `SessionHistory.load@packages/core/src/session/history.ts:66` 并发读取 current epoch `baselineSeq` 与 latest compaction,再把它们交给 `messageRows`。[E: packages/core/src/session/history.ts:67][E: packages/core/src/session/history.ts:70][E: packages/core/src/session/history.ts:75][E: packages/core/src/session/history.ts:77][E: packages/core/src/session/history.ts:79]

6. `SessionStore.context@packages/core/src/session/store.ts:38` 直接调用 `SessionHistory.load`;因此 public `SessionV2.context` 和 runner 的 interrupted tool scan 都会拿到已应用 compaction/epoch cutoff 的 context view。[E: packages/core/src/session/store.ts:39][E: packages/core/src/session.ts:336][E: packages/core/src/session/runner/llm.ts:113][E: packages/core/src/session/runner/llm.ts:118]

7. `SessionHistory.loadForRunner@packages/core/src/session/history.ts:82` 接收 caller 提供的 `baselineSeq`,内部调用 `entriesForRunner` 后只返回 message array。[E: packages/core/src/session/history.ts:87]

8. `SessionHistory.entriesForRunner@packages/core/src/session/history.ts:90` 用 latest compaction 与传入 `baselineSeq` 读取 rows,再返回 `{ seq, message }` entries; downstream compaction receives these entries as its selection input。[E: packages/core/src/session/history.ts:95][E: packages/core/src/session/history.ts:97][E: packages/core/src/session/compaction.ts:181]

9. `SessionRunner.runTurnAttempt@packages/core/src/session/runner/llm.ts:215` 在 Context Epoch prepare 后调用 `SessionHistory.entriesForRunner(db, session.id, system.baselineSeq)`,再把 entries map 成 messages 交给 `toLLMMessages`。[E: packages/core/src/session/runner/llm.ts:203][E: packages/core/src/session/runner/llm.ts:215][E: packages/core/src/session/runner/llm.ts:216][E: packages/core/src/session/runner/llm.ts:225]

10. `toLLMMessage@packages/core/src/session/runner/to-llm-message.ts:125` 把 `SessionMessage.Compaction` lowering 成 user role `<conversation-checkpoint>` message,其中包含 summary 与 recent-context。[E: packages/core/src/session/runner/to-llm-message.ts:129][E: packages/core/src/session/runner/to-llm-message.ts:130][E: packages/core/src/session/runner/to-llm-message.ts:134][E: packages/core/src/session/runner/to-llm-message.ts:138]

## compaction boundary

Completed compaction 是 read-model boundary,不是删除历史。`SessionMessageUpdater` 只在 `session.next.compaction.ended` 时 append `SessionMessage.Compaction`,其中包含 `summary` 和 `recent`;`history.latestCompaction` 随后把这条 compaction message 作为 active lower bound。[E: packages/core/src/session/message-updater.ts:373][E: packages/core/src/session/message-updater.ts:374][E: packages/core/src/session/message-updater.ts:379][E: packages/core/src/session/message-updater.ts:380][E: packages/core/src/session/history.ts:17][E: packages/core/src/session/history.ts:38]

V2 session spec 明确 compaction 保留 full transcript durable,但 active model representation 被替换为 hidden checkpoint with structured rolling summary and token-bounded serialized recent context。[E: specs/v2/session.md:111] `SessionHistory` 对 non-system rows 使用 `seq >= compaction.seq`,同时 baselineSeq 分支会单独保留 later system context rows。[E: packages/core/src/session/history.ts:38][E: packages/core/src/session/history.ts:41][E: packages/core/src/session/history.ts:46]

## Context Epoch cutoff

Baseline System Context 与 chronological system messages 是两个通道。`CONTEXT.md` 说明 active Baseline System Context remains separate provider-request state,Mid-Conversation System Messages 进入 Session History。[E: CONTEXT.md:61] 因此 `baselineSeq` 之前的 `system` messages 会被过滤;“避免 current epoch baseline 已经涵盖的 context update 再次作为 chronological system message replay”是该过滤与 Context Epoch 关系的设计推断。[E: packages/core/src/session/history.ts:46][I]

`SessionContextEpochTable.baseline_seq` 由 context epoch insert/replace 写入;history selection 只读取该值,不决定 epoch lifecycle。[E: packages/core/src/session/sql.ts:175][E: packages/core/src/session/context-epoch.ts:224][E: packages/core/src/session/context-epoch.ts:260][E: packages/core/src/session/history.ts:70][I]

## 设计动机与权衡

- `session_message` 是 projector 生成的 read model;history selection 不回放 raw EventV2 log,provider request 的 messages/history portion 来自 canonical projected messages,同时 request 还包含 baseline system context 和 materialized tools。[E: packages/core/src/session/projector.ts:199][E: packages/core/src/session/projector.ts:204][E: packages/core/src/session/runner/llm.ts:215][E: packages/core/src/session/runner/llm.ts:222][E: packages/core/src/session/runner/llm.ts:225][E: packages/core/src/session/runner/llm.ts:226][I]
- compaction boundary 使用 latest compaction message 的 seq,让 repeated compactions 自动只保留最新 checkpoint 之后的 active context。[E: packages/core/src/session/history.ts:18][E: packages/core/src/session/history.ts:19][E: packages/core/src/session/history.ts:20][E: packages/core/src/session/history.ts:38]
- runner entries 保留 seq,并把 entries 传给 compaction input;V2 spec 也要求 projected Session messages retain source aggregate sequence so pagination follows durable event order。[E: packages/core/src/session/history.ts:97][E: packages/core/src/session/runner/llm.ts:228][E: specs/v2/session.md:169]

## gotcha

- `SessionHistory.load` 与 `SessionV2.messages` 不完全一样:public `messages` 在 `session.ts` 直接分页读取 `SessionMessageTable`,不调用 `SessionHistory.load`;`context` 和 runner context 才应用 compaction/epoch cutoff。[E: packages/core/src/session.ts:322][E: packages/core/src/session.ts:336][E: packages/core/src/session/store.ts:39]
- compaction message 本身会被保留,因为 lower bound 是 `gte(SessionMessageTable.seq, compaction.seq)`,不是 `gt`。[E: packages/core/src/session/history.ts:38]
- old non-system messages before compaction boundary 不进入 active model history,但 full transcript remains durable;history selection 只是 query filter。[E: packages/core/src/session/history.ts:38][E: specs/v2/session.md:111]

## Sources
- packages/core/src/session/history.ts
- packages/core/src/session/sql.ts
- packages/core/src/session/store.ts
- packages/core/src/session/runner/llm.ts
- packages/core/src/session/runner/to-llm-message.ts
- packages/core/src/session/projector.ts
- packages/core/src/session/compaction.ts
- packages/core/src/session/message.ts
- packages/core/src/session/message-updater.ts
- packages/core/src/session/context-epoch.ts
- packages/core/src/session.ts
- CONTEXT.md
- specs/v2/session.md

## 相关
- [session-v2.projector](projector.md)
- [session-v2.compaction](compaction.md)
