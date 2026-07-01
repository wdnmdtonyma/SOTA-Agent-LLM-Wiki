---
id: session-v1.store
title: Session/message/part 存储与转换(V1)
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/session/session.ts, packages/opencode/src/session/message-v2.ts, packages/opencode/src/session/revert.ts, packages/opencode/src/session/schema.ts, packages/opencode/src/session/prompt.ts, packages/opencode/src/session/processor.ts, packages/core/src/session/sql.ts, packages/opencode/src/event-v2-bridge.ts, packages/opencode/src/bus/global.ts]
symbols: [Session, Session.create, Session.messages, Session.updateMessage, Session.updatePart, Session.updatePartDelta, MessageV2.toModelMessagesEffect, MessageV2.filterCompacted, SessionRevert.revert, SessionRevert.cleanup]
related: [persistence.database, execution.snapshots]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V1 store 层是 event-fronted SQLite read model: `Session` service 提供 session/message/part API,写操作发布 V1/EventV2 events,读操作从 core SQLite `SessionTable`/`MessageTable`/`PartTable` hydrate;`message-v2.ts` 负责 V1 history 到 AI SDK `ModelMessage` 的转换。

## 能回答的问题
- `@opencode/Session` 的 session/message/part API 覆盖哪些操作?
- V1 message/part 写入为什么看起来是 publish event 而不是直接 SQL insert?
- `message-v2.ts` 为什么不是 V2 session core?
- `MessageV2.filterCompacted` 怎样把 V1 compaction 历史变成 active provider history?
- `SessionRevert` 怎样回滚 snapshot 并清理 message/part?

## 职责边界

`Session.Interface` 覆盖 session list/listGlobal/create/fork/touch/get/setTitle/setArchived/setMetadata/setAgentModel/setPermission/setRevert/clearRevert/setSummary/setShare/setWorkspace/diff/messages/children/remove/updateMessage/removeMessage/removePart/getPart/updatePart/updatePartDelta/findMessage。[E: packages/opencode/src/session/session.ts:415][E: packages/opencode/src/session/session.ts:416][E: packages/opencode/src/session/session.ts:417][E: packages/opencode/src/session/session.ts:418][E: packages/opencode/src/session/session.ts:427][E: packages/opencode/src/session/session.ts:428][E: packages/opencode/src/session/session.ts:430][E: packages/opencode/src/session/session.ts:433][E: packages/opencode/src/session/session.ts:439][E: packages/opencode/src/session/session.ts:450][E: packages/opencode/src/session/session.ts:453][E: packages/opencode/src/session/session.ts:461][E: packages/opencode/src/session/session.ts:462][E: packages/opencode/src/session/session.ts:470]

`Session.Service` 名称是 `@opencode/Session`,仍属于 `packages/opencode/src` 的 V1 compatibility service;当前 `session.ts` 只从 core session 包导入 `SessionV2` 用于 ID/schema interop,没有在本文件提供 V2 runner layer。[E: packages/opencode/src/session/session.ts:13][E: packages/opencode/src/session/session.ts:476][I]

`SessionID` 复用 core `SessionV2.ID`,但 `MessageID` 和 `PartID` 仍是 `msg*` / `prt*` ascending IDs;这是 store 层的迁移边界,不是说 V1 messages 已经变成 V2 session messages。[E: packages/opencode/src/session/schema.ts:4][E: packages/opencode/src/session/schema.ts:7][E: packages/opencode/src/session/schema.ts:10][E: packages/opencode/src/session/schema.ts:13][E: packages/opencode/src/session/schema.ts:19][E: packages/opencode/src/session/schema.ts:22]

## SQLite read model

| 表 | 关键列 | V1 store 用途 |
|---|---|---|
| `SessionTable` | `id`, `project_id`, `workspace_id`, `parent_id`, `slug`, `directory`, `path`, `title`, `model`, `permission`, `revert`, timestamps | `Session.fromRow`/`toRow` 在 V1 service 的 local `Session.Info` 与 SQLite row 之间转换。[E: packages/core/src/session/sql.ts:22][E: packages/core/src/session/sql.ts:25][E: packages/core/src/session/sql.ts:26][E: packages/core/src/session/sql.ts:30][E: packages/core/src/session/sql.ts:31][E: packages/core/src/session/sql.ts:32][E: packages/core/src/session/sql.ts:33][E: packages/core/src/session/sql.ts:35][E: packages/core/src/session/sql.ts:49][E: packages/core/src/session/sql.ts:50][E: packages/core/src/session/sql.ts:52][E: packages/core/src/session/sql.ts:57][E: packages/opencode/src/session/session.ts:59][E: packages/opencode/src/session/session.ts:78][E: packages/opencode/src/session/session.ts:120] |
| `MessageTable` | `id`, `session_id`, timestamps, JSON `data` | 存 V1 `SessionV1.Info` 去掉 id/sessionID 后的 JSON data;`MessageV2.page/get` 从这里 hydrate message info。[E: packages/core/src/session/sql.ts:18][E: packages/core/src/session/sql.ts:68][E: packages/core/src/session/sql.ts:71][E: packages/core/src/session/sql.ts:72][E: packages/core/src/session/sql.ts:77][E: packages/opencode/src/session/message-v2.ts:80][E: packages/opencode/src/session/message-v2.ts:83][E: packages/opencode/src/session/message-v2.ts:435][E: packages/opencode/src/session/message-v2.ts:459][E: packages/opencode/src/session/message-v2.ts:506][E: packages/opencode/src/session/message-v2.ts:516] |
| `PartTable` | `id`, `message_id`, `session_id`, timestamps, JSON `data` | 存 V1 `SessionV1.Part` 去掉 id/sessionID/messageID 后的 JSON data;`hydrate` 按 message id 批量读取并恢复 part IDs。[E: packages/core/src/session/sql.ts:20][E: packages/core/src/session/sql.ts:82][E: packages/core/src/session/sql.ts:85][E: packages/core/src/session/sql.ts:86][E: packages/core/src/session/sql.ts:90][E: packages/core/src/session/sql.ts:92][E: packages/opencode/src/session/message-v2.ts:98][E: packages/opencode/src/session/message-v2.ts:103][E: packages/opencode/src/session/message-v2.ts:107][E: packages/opencode/src/session/message-v2.ts:111][E: packages/opencode/src/session/message-v2.ts:118] |

`Session.get`、`list`、`listGlobal`、`children`、`getPart` 是直接 SQLite read 或 thin query wrapper;`Session.messages` 和 `findMessage` 则通过 `MessageV2.page` 分页读取并 hydrate parts。[E: packages/opencode/src/session/session.ts:542][E: packages/opencode/src/session/session.ts:548][E: packages/opencode/src/session/session.ts:557][E: packages/opencode/src/session/session.ts:647][E: packages/opencode/src/session/session.ts:830][E: packages/opencode/src/session/session.ts:841][E: packages/opencode/src/session/session.ts:890][E: packages/opencode/src/session/session.ts:894]

## 写路径与事件桥

`Session.createNext` 构造 V1 `Info` 后发布 `SessionV1.Event.Created`;`patch` 发布 `SessionV1.Event.Updated`,`updateMessage` 发布 `SessionV1.Event.MessageUpdated`,`updatePart` 发布 `SessionV1.Event.PartUpdated`,remove path 发布 deleted/remove events。[E: packages/opencode/src/session/session.ts:501][E: packages/opencode/src/session/session.ts:514][E: packages/opencode/src/session/session.ts:537][E: packages/opencode/src/session/session.ts:736][E: packages/opencode/src/session/session.ts:748][E: packages/opencode/src/session/session.ts:631][E: packages/opencode/src/session/session.ts:633][E: packages/opencode/src/session/session.ts:637][E: packages/opencode/src/session/session.ts:639][E: packages/opencode/src/session/session.ts:624][E: packages/opencode/src/session/session.ts:859][E: packages/opencode/src/session/session.ts:871]

`Session.updatePartDelta` 发布的是 `MessageV2.Event.PartDelta`,该 event schema 包含 `sessionID/messageID/partID/field/delta`;processor 的 text/reasoning delta caller 用这个 generic delta event 做 chunk update。[E: packages/opencode/src/session/session.ts:879][E: packages/opencode/src/session/session.ts:886][E: packages/opencode/src/session/message-v2.ts:55][E: packages/opencode/src/session/message-v2.ts:59][E: packages/opencode/src/session/processor.ts:297][E: packages/opencode/src/session/processor.ts:301][E: packages/opencode/src/session/processor.ts:501][E: packages/opencode/src/session/processor.ts:505]

`EventV2Bridge` 包装 core `EventV2.Service.publish`,在没有显式 location 时从 `InstanceRef`/`WorkspaceRef` 补 directory/project/workspace location,并监听所有 EventV2 event 转发到 `GlobalBus.emit("event", ...)`;当 event registry 提供 sync metadata 时,bridge 还发一条 payload type 为 `"sync"` 的 GlobalBus event。[E: packages/opencode/src/event-v2-bridge.ts:19][E: packages/opencode/src/event-v2-bridge.ts:21][E: packages/opencode/src/event-v2-bridge.ts:22][E: packages/opencode/src/event-v2-bridge.ts:25][E: packages/opencode/src/event-v2-bridge.ts:27][E: packages/opencode/src/event-v2-bridge.ts:30][E: packages/opencode/src/event-v2-bridge.ts:35][E: packages/opencode/src/event-v2-bridge.ts:39][E: packages/opencode/src/event-v2-bridge.ts:43][E: packages/opencode/src/event-v2-bridge.ts:45][E: packages/opencode/src/event-v2-bridge.ts:51][E: packages/opencode/src/event-v2-bridge.ts:54]

`packages/opencode/src/bus/global.ts` 定义 `GlobalBus` emitter;它在缺 payload id 时补一个 ascending `evt` id。用户提示中的“V1 Bus 服务已不存在,只剩 GlobalBus + event-v2-bridge”应理解为当前这两个源码落点,不是一个可由单文件证明的全仓 absence claim。[E: packages/opencode/src/bus/global.ts:11][E: packages/opencode/src/bus/global.ts:14][E: packages/opencode/src/bus/global.ts:15][E: packages/opencode/src/bus/global.ts:16][E: packages/opencode/src/bus/global.ts:22][I]

## MessageV2 转换层

`message-v2.ts` 是命名陷阱:该文件导入 `@opencode-ai/core/v1/session` 的 `SessionV1` 类型,并导入 AI SDK 的 `convertToModelMessages` 和 `ModelMessage`;`toModelMessagesEffect` 最终调用 `convertToModelMessages(...)`。[E: packages/opencode/src/session/message-v2.ts:2][E: packages/opencode/src/session/message-v2.ts:20][E: packages/opencode/src/session/message-v2.ts:406][E: packages/opencode/src/session/message-v2.ts:407] 因此它是 V1 history 到 AI SDK message 的转换层,不是 V2 `packages/core/src/session` runtime。

`toModelMessagesEffect` 的 user branch 把非 ignored text part 变成 text,把非 text/plain/目录 file part 变成 file 或在 `stripMedia` 时变成 `[Attached mime: filename]`,把 compaction/subtask part 变成 synthetic text prompt。[E: packages/opencode/src/session/message-v2.ts:204][E: packages/opencode/src/session/message-v2.ts:206][E: packages/opencode/src/session/message-v2.ts:212][E: packages/opencode/src/session/message-v2.ts:214][E: packages/opencode/src/session/message-v2.ts:219][E: packages/opencode/src/session/message-v2.ts:228][E: packages/opencode/src/session/message-v2.ts:234]

assistant branch 会跳过大多数 error assistant,保留 text/step-start/reasoning/tool output;如果历史 assistant model 与当前 continuation model 不同,provider metadata 和 signed reasoning metadata 会被省略或降级为 text。[E: packages/opencode/src/session/message-v2.ts:244][E: packages/opencode/src/session/message-v2.ts:249][E: packages/opencode/src/session/message-v2.ts:257][E: packages/opencode/src/session/message-v2.ts:278][E: packages/opencode/src/session/message-v2.ts:283][E: packages/opencode/src/session/message-v2.ts:286][E: packages/opencode/src/session/message-v2.ts:363][E: packages/opencode/src/session/message-v2.ts:371]

completed tool part 会转成 AI SDK `tool-*` output part;如果 `part.state.time.compacted` 为 true,output 文本变成 `[Old tool result content cleared]`;如果 tool result attachment media 当前 provider 不支持在 tool result 中携带,会额外注入一条 user message `Attached media from tool result:`。[E: packages/opencode/src/session/message-v2.ts:292][E: packages/opencode/src/session/message-v2.ts:293][E: packages/opencode/src/session/message-v2.ts:295][E: packages/opencode/src/session/message-v2.ts:315][E: packages/opencode/src/session/message-v2.ts:326][E: packages/opencode/src/session/message-v2.ts:378][E: packages/opencode/src/session/message-v2.ts:383][E: packages/opencode/src/session/message-v2.ts:389]

`filterCompacted` 根据 completed compaction summary 和 `tail_start_id` 重排 active history;`filterCompactedEffect(sessionID)` 从 message stream 读取后应用该过滤。[E: packages/opencode/src/session/message-v2.ts:521][E: packages/opencode/src/session/message-v2.ts:532][E: packages/opencode/src/session/message-v2.ts:535][E: packages/opencode/src/session/message-v2.ts:545][E: packages/opencode/src/session/message-v2.ts:552][E: packages/opencode/src/session/message-v2.ts:563][E: packages/opencode/src/session/message-v2.ts:574][E: packages/opencode/src/session/message-v2.ts:575]

`MessageV2.fromError` 把 DOM abort、AI SDK auth error、ECONNRESET、decompression failure、provider header timeout、stream error、APICallError 和 provider stream parsed error 映射成 V1 assistant error union;context overflow 被映射为 `ContextOverflowError`,非 overflow parsed stream errors 被映射为 `APIError`,processor 再据此触发 compaction 或 retry/error path。[E: packages/opencode/src/session/message-v2.ts:617][E: packages/opencode/src/session/message-v2.ts:625][E: packages/opencode/src/session/message-v2.ts:638][E: packages/opencode/src/session/message-v2.ts:653][E: packages/opencode/src/session/message-v2.ts:665][E: packages/opencode/src/session/message-v2.ts:676][E: packages/opencode/src/session/message-v2.ts:681][E: packages/opencode/src/session/message-v2.ts:691][E: packages/opencode/src/session/message-v2.ts:708][E: packages/opencode/src/session/message-v2.ts:717][E: packages/opencode/src/session/processor.ts:605][E: packages/opencode/src/session/processor.ts:613][E: packages/opencode/src/session/processor.ts:658][E: packages/opencode/src/session/processor.ts:677]

## SessionRevert

`SessionRevert.revert` 先 `state.assertNotBusy(sessionID)`,再读取全量 messages 并找到目标 message/part 之后的 patch parts;首次 revert 会 `snap.track()`,已有 revert 则恢复旧 snapshot,随后 `snap.revert(patches)`。[E: packages/opencode/src/session/revert.ts:38][E: packages/opencode/src/session/revert.ts:39][E: packages/opencode/src/session/revert.ts:40][E: packages/opencode/src/session/revert.ts:46][E: packages/opencode/src/session/revert.ts:51][E: packages/opencode/src/session/revert.ts:56][E: packages/opencode/src/session/revert.ts:70][E: packages/opencode/src/session/revert.ts:71][E: packages/opencode/src/session/revert.ts:72]

revert 完成后,service 计算 diff,写 `Storage` key `["session_diff", sessionID]`,发布 `Session.Event.Diff`,并通过 `sessions.setRevert` 把 revert pointer 与 summary totals 写回 session。[E: packages/opencode/src/session/revert.ts:73][E: packages/opencode/src/session/revert.ts:75][E: packages/opencode/src/session/revert.ts:76][E: packages/opencode/src/session/revert.ts:77][E: packages/opencode/src/session/revert.ts:78][E: packages/opencode/src/session/revert.ts:81][E: packages/opencode/src/session/revert.ts:82][E: packages/opencode/src/session/revert.ts:83]

`SessionRevert.unrevert` 同样要求 session 不 busy,若 session 有 revert snapshot 就 restore,然后 `sessions.clearRevert(sessionID)`。[E: packages/opencode/src/session/revert.ts:90][E: packages/opencode/src/session/revert.ts:92][E: packages/opencode/src/session/revert.ts:94][E: packages/opencode/src/session/revert.ts:95][E: packages/opencode/src/session/revert.ts:96]

`SessionRevert.cleanup` 清理 session revert pointer 指向的历史:如果 revert 指向整条 message,它删除该 message 及之后的 messages;如果指向 part,它删除目标 part 及之后 parts,最后清除 session revert pointer。`SessionPrompt.prompt` 在新 prompt 前调用该 cleanup。[E: packages/opencode/src/session/revert.ts:100][E: packages/opencode/src/session/revert.ts:103][E: packages/opencode/src/session/revert.ts:107][E: packages/opencode/src/session/revert.ts:109][E: packages/opencode/src/session/revert.ts:117][E: packages/opencode/src/session/revert.ts:119][E: packages/opencode/src/session/revert.ts:120][E: packages/opencode/src/session/revert.ts:122][E: packages/opencode/src/session/revert.ts:126][E: packages/opencode/src/session/revert.ts:129][E: packages/opencode/src/session/revert.ts:133][E: packages/opencode/src/session/prompt.ts:1056]

## gotcha

- `Session.remove` 递归删除 child session 并发布 `SessionV1.Event.Deleted`,还调用 `events.remove(sessionID)`;它包在 try/catch 中记录 cleanup error,因此破损 session 也尽量可删除。[E: packages/opencode/src/session/session.ts:620][E: packages/opencode/src/session/session.ts:621][E: packages/opencode/src/session/session.ts:624][E: packages/opencode/src/session/session.ts:625][E: packages/opencode/src/session/session.ts:626][E: packages/opencode/src/session/session.ts:627]
- `Session.diff` 当前返回空数组;实际 revert/diff summary 由 `SessionSummary` 与 `SessionRevert` 维护。[E: packages/opencode/src/session/session.ts:825][E: packages/opencode/src/session/session.ts:827][E: packages/opencode/src/session/revert.ts:75]
- `MessageV2.page` 按 `time_created,id` 倒序取 `limit+1`,hydrate 后再 reverse 返回 chronological page;`Session.messages` 为取全量会循环 page 并最终 `result.reverse()`。[E: packages/opencode/src/session/message-v2.ts:435][E: packages/opencode/src/session/message-v2.ts:439][E: packages/opencode/src/session/message-v2.ts:440][E: packages/opencode/src/session/message-v2.ts:459][E: packages/opencode/src/session/message-v2.ts:460][E: packages/opencode/src/session/session.ts:841][E: packages/opencode/src/session/session.ts:845][E: packages/opencode/src/session/session.ts:849][E: packages/opencode/src/session/session.ts:852]

## Sources
- packages/opencode/src/session/session.ts
- packages/opencode/src/session/message-v2.ts
- packages/opencode/src/session/revert.ts
- packages/opencode/src/session/schema.ts
- packages/opencode/src/session/prompt.ts
- packages/opencode/src/session/processor.ts
- packages/core/src/session/sql.ts
- packages/opencode/src/event-v2-bridge.ts
- packages/opencode/src/bus/global.ts

## 相关
- [persistence.database](../persistence/database.md)
- [execution.snapshots](../execution/snapshots.md)
