---
id: ref.data-model
title: 核心共享数据模型
kind: reference
tier: T3
v: shared
source:
  - packages/core/src/session/message.ts
  - packages/core/src/session/schema.ts
  - packages/core/src/session/message-id.ts
  - packages/opencode/src/session/message-v2.ts
status: verified
symbols:
  - SessionMessage.Message
  - SessionMessage.AssistantContent
  - SessionMessage.ToolState
  - SessionSchema.Info
  - MessageV2.toModelMessagesEffect
evidence: explicit
updated: 92c70c9c3
---

> 这份节点记录 session/message 的核心共享数据模型；V2 是 `packages/core/src/session/*` 的 typed schema，V1 是 `packages/opencode/src/session/message-v2.ts` 的 AI SDK 转换层。

## 能回答的问题

- V2 `SessionMessage.Message` union 有哪些 tag？
- assistant content 与 tool state 的字段是什么？
- `SessionSchema.Info` 是怎样的 session metadata shape？
- 为什么 `message-v2.ts` 不代表 V2 session core？

## V2

### Session ID 与 Session Info

V2 `SessionSchema.ID` 要求字符串以 `ses` 开头，`create()` 返回 `"ses_" + Identifier.descending()`。[E: packages/core/src/session/schema.ts:12][E: packages/core/src/session/schema.ts:15] `SessionMessageID.ID` 要求以 `msg_` 开头，`create()` 返回 `"msg_" + Identifier.ascending()`。[E: packages/core/src/session/message-id.ts:7][E: packages/core/src/session/message-id.ts:10]

`SessionSchema.Info` 字段是 `id`、可选 `parentID`、`projectID`、可选 `agent`、可选 `model`、`cost`、`tokens`、`time`、`title`、`location`、可选 `subpath`。[E: packages/core/src/session/schema.ts:26][E: packages/core/src/session/schema.ts:27][E: packages/core/src/session/schema.ts:28][E: packages/core/src/session/schema.ts:29][E: packages/core/src/session/schema.ts:30][E: packages/core/src/session/schema.ts:31][E: packages/core/src/session/schema.ts:32][E: packages/core/src/session/schema.ts:41][E: packages/core/src/session/schema.ts:46][E: packages/core/src/session/schema.ts:47][E: packages/core/src/session/schema.ts:48]

| Field | Type/shape | Evidence |
|---|---|---|
| `id` | `SessionSchema.ID` | [E: packages/core/src/session/schema.ts:26] |
| `parentID` | optional `SessionSchema.ID` | [E: packages/core/src/session/schema.ts:27] |
| `projectID` | `ProjectV2.ID` | [E: packages/core/src/session/schema.ts:28] |
| `agent` | optional `AgentV2.ID` | [E: packages/core/src/session/schema.ts:29] |
| `model` | optional `ModelV2.Ref` | [E: packages/core/src/session/schema.ts:30] |
| `cost` | finite number | [E: packages/core/src/session/schema.ts:31] |
| `tokens` | input/output/reasoning/cache read+write | [E: packages/core/src/session/schema.ts:32][E: packages/core/src/session/schema.ts:38] |
| `time` | created/updated/optional archived | [E: packages/core/src/session/schema.ts:41][E: packages/core/src/session/schema.ts:44] |
| `title` | string | [E: packages/core/src/session/schema.ts:46] |
| `location` | `Location.Ref` | [E: packages/core/src/session/schema.ts:47] |
| `subpath` | optional relative path | [E: packages/core/src/session/schema.ts:48] |

### SessionMessage base

The shared V2 message `Base` contains `id`, optional `metadata`, and `time.created`; concrete message classes spread `...Base` where they need the shared fields.[E: packages/core/src/session/message.ts:15][E: packages/core/src/session/message.ts:16][E: packages/core/src/session/message.ts:18][E: packages/core/src/session/message.ts:23] `SessionMessage.ID` is the message ID schema imported from `message-id.ts`.[E: packages/core/src/session/message.ts:11]

### SessionMessage union catalog

`SessionMessage.Message` is a tagged union over 8 message classes: `AgentSwitched`、`ModelSwitched`、`User`、`Synthetic`、`System`、`Shell`、`Assistant`、`Compaction`。[E: packages/core/src/session/message.ts:178][E: packages/core/src/session/message.ts:179][E: packages/core/src/session/message.ts:180][E: packages/core/src/session/message.ts:181][E: packages/core/src/session/message.ts:182][E: packages/core/src/session/message.ts:183][E: packages/core/src/session/message.ts:184][E: packages/core/src/session/message.ts:185][E: packages/core/src/session/message.ts:186][E: packages/core/src/session/message.ts:188]

| Tag | Class | Key fields | Evidence |
|---|---|---|---|
| `agent-switched` | `AgentSwitched` | `agent` from `SessionEvent.AgentSwitched` | [E: packages/core/src/session/message.ts:24][E: packages/core/src/session/message.ts:25] |
| `model-switched` | `ModelSwitched` | `model: ModelV2.Ref` | [E: packages/core/src/session/message.ts:30][E: packages/core/src/session/message.ts:31] |
| `user` | `User` | `text`, `files`, `agents` from prompt | [E: packages/core/src/session/message.ts:36][E: packages/core/src/session/message.ts:37][E: packages/core/src/session/message.ts:38][E: packages/core/src/session/message.ts:39] |
| `synthetic` | `Synthetic` | `sessionID`, `text` | [E: packages/core/src/session/message.ts:47][E: packages/core/src/session/message.ts:48][E: packages/core/src/session/message.ts:49] |
| `system` | `System` | `text` from context update | [E: packages/core/src/session/message.ts:54][E: packages/core/src/session/message.ts:55] |
| `shell` | `Shell` | `callID`, `command`, `output`, `time.completed?` | [E: packages/core/src/session/message.ts:60][E: packages/core/src/session/message.ts:61][E: packages/core/src/session/message.ts:62][E: packages/core/src/session/message.ts:63][E: packages/core/src/session/message.ts:66] |
| `assistant` | `Assistant` | `agent`, `model`, `content`, optional `snapshot/finish/cost/tokens/error`, created/completed time | [E: packages/core/src/session/message.ts:144][E: packages/core/src/session/message.ts:145][E: packages/core/src/session/message.ts:146][E: packages/core/src/session/message.ts:147][E: packages/core/src/session/message.ts:148][E: packages/core/src/session/message.ts:152][E: packages/core/src/session/message.ts:153][E: packages/core/src/session/message.ts:154][E: packages/core/src/session/message.ts:163][E: packages/core/src/session/message.ts:165][E: packages/core/src/session/message.ts:166] |
| `compaction` | `Compaction` | `reason`, `summary`, `recent` | [E: packages/core/src/session/message.ts:171][E: packages/core/src/session/message.ts:172][E: packages/core/src/session/message.ts:173][E: packages/core/src/session/message.ts:174] |

### Assistant content and tool state

Assistant content is a tagged union of `text`、`reasoning`、`tool` parts.[E: packages/core/src/session/message.ts:137][E: packages/core/src/session/message.ts:138] `AssistantText` has `id` and `text`; `AssistantReasoning` has `id`、`text`、optional provider metadata。[E: packages/core/src/session/message.ts:126][E: packages/core/src/session/message.ts:127][E: packages/core/src/session/message.ts:132][E: packages/core/src/session/message.ts:133][E: packages/core/src/session/message.ts:134]

`AssistantTool` has `id`、`name`、optional provider execution metadata、`state`、and time fields `created/ran?/completed?/pruned?`。[E: packages/core/src/session/message.ts:108][E: packages/core/src/session/message.ts:109][E: packages/core/src/session/message.ts:110][E: packages/core/src/session/message.ts:115][E: packages/core/src/session/message.ts:117][E: packages/core/src/session/message.ts:118][E: packages/core/src/session/message.ts:119][E: packages/core/src/session/message.ts:120] Tool state is a tagged union by `status` with `pending`、`running`、`completed`、`error`。[E: packages/core/src/session/message.ts:101][E: packages/core/src/session/message.ts:102]

| Tool state | Fields | Evidence |
|---|---|---|
| `pending` | raw `input` string | [E: packages/core/src/session/message.ts:71][E: packages/core/src/session/message.ts:72] |
| `running` | structured `input`, `structured`, `content` | [E: packages/core/src/session/message.ts:76][E: packages/core/src/session/message.ts:77][E: packages/core/src/session/message.ts:78][E: packages/core/src/session/message.ts:79] |
| `completed` | `input`, optional `attachments`, `content`, `outputPaths`, `structured`, `result` | [E: packages/core/src/session/message.ts:83][E: packages/core/src/session/message.ts:84][E: packages/core/src/session/message.ts:85][E: packages/core/src/session/message.ts:86][E: packages/core/src/session/message.ts:87][E: packages/core/src/session/message.ts:88][E: packages/core/src/session/message.ts:89] |
| `error` | `input`, `content`, `structured`, `error`, `result` | [E: packages/core/src/session/message.ts:93][E: packages/core/src/session/message.ts:94][E: packages/core/src/session/message.ts:95][E: packages/core/src/session/message.ts:96][E: packages/core/src/session/message.ts:97][E: packages/core/src/session/message.ts:98] |

### Relationship to events

Several V2 message schemas intentionally reuse selected fields from `SessionEvent`: shell messages reuse started `callID/command`, assistant messages reuse step `model` and failed `error`, completed/error tool states reuse selected success/failed result fields。[E: packages/core/src/session/message.ts:61][E: packages/core/src/session/message.ts:62][E: packages/core/src/session/message.ts:146][E: packages/core/src/session/message.ts:163][E: packages/core/src/session/message.ts:87][E: packages/core/src/session/message.ts:89][E: packages/core/src/session/message.ts:98] This makes the message projection shape traceable back to event-sourced session events.[I]

## V1

`packages/opencode/src/session/message-v2.ts` is the V1-to-AI-SDK message conversion layer, not the V2 Session Core. It imports V1 `SessionID`/`MessageID`/`PartID`, V1 session types such as `Assistant`、`Part`、`WithParts`, and AI SDK `convertToModelMessages` / `UIMessage` / `ModelMessage`。[E: packages/opencode/src/session/message-v2.ts:2][E: packages/opencode/src/session/message-v2.ts:3][E: packages/opencode/src/session/message-v2.ts:8][E: packages/opencode/src/session/message-v2.ts:14][E: packages/opencode/src/session/message-v2.ts:18][E: packages/opencode/src/session/message-v2.ts:23]

V1 message-v2 exports legacy message events by aliasing `SessionV1.Event.MessageUpdated`、`MessageRemoved`、`PartUpdated`、`PartRemoved` and defining live `message.part.delta` with V1 `sessionID/messageID/partID` fields。[E: packages/opencode/src/session/message-v2.ts:58][E: packages/opencode/src/session/message-v2.ts:59][E: packages/opencode/src/session/message-v2.ts:60][E: packages/opencode/src/session/message-v2.ts:61][E: packages/opencode/src/session/message-v2.ts:64][E: packages/opencode/src/session/message-v2.ts:65][E: packages/opencode/src/session/message-v2.ts:66][E: packages/opencode/src/session/message-v2.ts:71]

### V1 conversion responsibilities

| Function/object | Role | Evidence |
|---|---|---|
| `toModelMessagesEffect` | Converts `WithParts[]` into AI SDK model messages and tracks model-specific media/tool-result handling. | [E: packages/opencode/src/session/message-v2.ts:143][E: packages/opencode/src/session/message-v2.ts:147][E: packages/opencode/src/session/message-v2.ts:417][E: packages/opencode/src/session/message-v2.ts:418] |
| `supportsMediaInToolResult` | Encodes provider-specific media support checks for tool results. | [E: packages/opencode/src/session/message-v2.ts:158][E: packages/opencode/src/session/message-v2.ts:169] |
| user branch | Builds AI SDK user messages from text/file parts. | [E: packages/opencode/src/session/message-v2.ts:209][E: packages/opencode/src/session/message-v2.ts:217][E: packages/opencode/src/session/message-v2.ts:230][E: packages/opencode/src/session/message-v2.ts:234] |
| `page` | Reads legacy `MessageTable` rows for a session with cursor pagination. | [E: packages/opencode/src/session/message-v2.ts:442][E: packages/opencode/src/session/message-v2.ts:446][E: packages/opencode/src/session/message-v2.ts:448][E: packages/opencode/src/session/message-v2.ts:451] |
| `stream` | Pages through all legacy messages for a session. | [E: packages/opencode/src/session/message-v2.ts:485][E: packages/opencode/src/session/message-v2.ts:486][E: packages/opencode/src/session/message-v2.ts:497][E: packages/opencode/src/session/message-v2.ts:499] |
| `parts` | Reads `PartTable` rows for one message. | [E: packages/opencode/src/session/message-v2.ts:506][E: packages/opencode/src/session/message-v2.ts:508][E: packages/opencode/src/session/message-v2.ts:509][E: packages/opencode/src/session/message-v2.ts:513] |
| `filterCompacted` | Reorders retained compaction tail for model consumption. | [E: packages/opencode/src/session/message-v2.ts:575][E: packages/opencode/src/session/message-v2.ts:576][E: packages/opencode/src/session/message-v2.ts:579] |
| `latest` | Derives latest user/assistant/finished/task bindings by max message ID. | [E: packages/opencode/src/session/message-v2.ts:602][E: packages/opencode/src/session/message-v2.ts:603][E: packages/opencode/src/session/message-v2.ts:604][E: packages/opencode/src/session/message-v2.ts:606][E: packages/opencode/src/session/message-v2.ts:609] |
| `fromError` | Maps thrown provider/runtime errors to assistant error shape. | [E: packages/opencode/src/session/message-v2.ts:614][E: packages/opencode/src/session/message-v2.ts:617] |

## V1/V2 差异速查

| 维度 | V1 | V2 |
|---|---|---|
| Message storage | Legacy `MessageTable` + `PartTable` read path in `message-v2.ts`。[E: packages/opencode/src/session/message-v2.ts:32][E: packages/opencode/src/session/message-v2.ts:446][E: packages/opencode/src/session/message-v2.ts:508] | `SessionMessage.Message` typed union in core schema。[E: packages/core/src/session/message.ts:178][E: packages/core/src/session/message.ts:188] |
| Model boundary | Converts to AI SDK `UIMessage`/`ModelMessage`。[E: packages/opencode/src/session/message-v2.ts:23][E: packages/opencode/src/session/message-v2.ts:417] | Message schema is Effect/Schema data model and uses `@opencode-ai/llm` metadata/content types。[E: packages/core/src/session/message.ts:3][E: packages/core/src/session/message.ts:4][E: packages/core/src/session/message.ts:22][E: packages/core/src/session/message.ts:106] |
| Event relation | Defines legacy `message.part.delta` and V1 event aliases。[E: packages/opencode/src/session/message-v2.ts:58][E: packages/opencode/src/session/message-v2.ts:61] | Message fields reuse selected `SessionEvent` definitions。[E: packages/core/src/session/message.ts:25][E: packages/core/src/session/message.ts:47][E: packages/core/src/session/message.ts:55][E: packages/core/src/session/message.ts:61][E: packages/core/src/session/message.ts:146][E: packages/core/src/session/message.ts:163][E: packages/core/src/session/message.ts:172] |
| Naming trap | File name contains `message-v2`, but imports V1 session types。 | Namespace path is `packages/core/src/session/*` and used by V2 core。 |

## Sources

- `packages/core/src/session/message.ts`
- `packages/core/src/session/schema.ts`
- `packages/core/src/session/message-id.ts`
- `packages/core/src/session/event.ts`
- `packages/opencode/src/session/message-v2.ts`
- `packages/core/src/session/sql.ts`

## 相关

- `session-v2.projector`
- `session-v1.store`
- `ref.events`
- `ref.db-schema`
