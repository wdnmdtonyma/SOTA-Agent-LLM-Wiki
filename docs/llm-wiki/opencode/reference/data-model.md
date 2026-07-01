---
id: ref.data-model
title: 核心共享数据模型
kind: reference
tier: T3
v: shared
source:
  - packages/core/src/session/message.ts
  - packages/core/src/session/schema.ts
  - packages/schema/src/session.ts
  - packages/schema/src/session-id.ts
  - packages/schema/src/session-message.ts
  - packages/opencode/src/session/schema.ts
  - packages/opencode/src/session/message-v2.ts
status: verified
symbols:
  - SessionMessage.Message
  - SessionMessage.AssistantContent
  - SessionMessage.ToolState
  - SessionSchema.Info
  - MessageV2.toModelMessagesEffect
evidence: explicit
updated: 8b68dc0d7
---

> 这份节点记录 session/message 的核心共享数据模型；V2 是 `packages/core/src/session/*` 的 typed schema，V1 是 `packages/opencode/src/session/message-v2.ts` 的 AI SDK 转换层。

## 能回答的问题

- V2 `SessionMessage.Message` union 有哪些 tag？
- assistant content 与 tool state 的字段是什么？
- `SessionSchema.Info` 是怎样的 session metadata shape？
- 为什么 `message-v2.ts` 不代表 V2 session core？

## V2

### Session ID 与 Session Info

V2 `SessionSchema.ID` 在 core 层 re-export schema package 的 `Session.ID`。[E: packages/core/src/session/schema.ts:3][E: packages/core/src/session/schema.ts:5] `SessionID` 要求字符串以 `ses` 开头，`create()` 返回 `"ses_" + descending()`。[E: packages/schema/src/session-id.ts:5][E: packages/schema/src/session-id.ts:8] `SessionMessage.ID` 要求字符串以 `msg_` 开头，`create()` 返回 `"msg_" + ascending()`。[E: packages/schema/src/session-message.ts:12][E: packages/schema/src/session-message.ts:14]

`SessionSchema.Info` 在 core 层 re-export schema package 的 `Session.Info`。[E: packages/core/src/session/schema.ts:3][E: packages/core/src/session/schema.ts:8] `Session.Info` 字段是 `id`、可选 `parentID`、`projectID`、可选 `agent`、可选 `model`、`cost`、`tokens`、`time`、`title`、`location`、可选 `subpath`、可选 `revert`。[E: packages/schema/src/session.ts:19][E: packages/schema/src/session.ts:20][E: packages/schema/src/session.ts:21][E: packages/schema/src/session.ts:22][E: packages/schema/src/session.ts:23][E: packages/schema/src/session.ts:24][E: packages/schema/src/session.ts:25][E: packages/schema/src/session.ts:26][E: packages/schema/src/session.ts:35][E: packages/schema/src/session.ts:40][E: packages/schema/src/session.ts:41][E: packages/schema/src/session.ts:42][E: packages/schema/src/session.ts:43]

| Field | Type/shape | Evidence |
|---|---|---|
| `id` | `Session.ID` | [E: packages/schema/src/session.ts:20] |
| `parentID` | optional `Session.ID` | [E: packages/schema/src/session.ts:21] |
| `projectID` | `Project.ID` | [E: packages/schema/src/session.ts:22] |
| `agent` | optional `Agent.ID` | [E: packages/schema/src/session.ts:23] |
| `model` | optional `Model.Ref` | [E: packages/schema/src/session.ts:24] |
| `cost` | finite number | [E: packages/schema/src/session.ts:25] |
| `tokens` | input/output/reasoning/cache read+write | [E: packages/schema/src/session.ts:26][E: packages/schema/src/session.ts:27][E: packages/schema/src/session.ts:28][E: packages/schema/src/session.ts:29][E: packages/schema/src/session.ts:30][E: packages/schema/src/session.ts:31][E: packages/schema/src/session.ts:32] |
| `time` | created/updated/optional archived | [E: packages/schema/src/session.ts:35][E: packages/schema/src/session.ts:38] |
| `title` | string | [E: packages/schema/src/session.ts:40] |
| `location` | `Location.Ref` | [E: packages/schema/src/session.ts:41] |
| `subpath` | optional relative path | [E: packages/schema/src/session.ts:42] |
| `revert` | optional `Revert.State` | [E: packages/schema/src/session.ts:43] |

### SessionMessage base

The shared V2 message namespace in core re-exports `@opencode-ai/schema/session-message`。[E: packages/core/src/session/message.ts:2] The schema package `Base` contains `id`, optional `metadata`, and `time.created`; concrete message classes spread `...Base` where they need the shared fields。[E: packages/schema/src/session-message.ts:24][E: packages/schema/src/session-message.ts:25][E: packages/schema/src/session-message.ts:26][E: packages/schema/src/session-message.ts:27][E: packages/schema/src/session-message.ts:32]

### SessionMessage union catalog

`SessionMessage.Message` is a tagged union over 8 message classes: `AgentSwitched`、`ModelSwitched`、`User`、`Synthetic`、`System`、`Shell`、`Assistant`、`Compaction`。[E: packages/schema/src/session-message.ts:200][E: packages/schema/src/session-message.ts:201][E: packages/schema/src/session-message.ts:202][E: packages/schema/src/session-message.ts:203][E: packages/schema/src/session-message.ts:204][E: packages/schema/src/session-message.ts:205][E: packages/schema/src/session-message.ts:206][E: packages/schema/src/session-message.ts:207][E: packages/schema/src/session-message.ts:208][E: packages/schema/src/session-message.ts:210]

| Tag | Class | Key fields | Evidence |
|---|---|---|---|
| `agent-switched` | `AgentSwitched` | `agent` string | [E: packages/schema/src/session-message.ts:33][E: packages/schema/src/session-message.ts:34] |
| `model-switched` | `ModelSwitched` | `model: Model.Ref` | [E: packages/schema/src/session-message.ts:40][E: packages/schema/src/session-message.ts:41] |
| `user` | `User` | `text`, `files`, `agents` from prompt schema | [E: packages/schema/src/session-message.ts:47][E: packages/schema/src/session-message.ts:48][E: packages/schema/src/session-message.ts:49][E: packages/schema/src/session-message.ts:50] |
| `synthetic` | `Synthetic` | `sessionID`, `text` | [E: packages/schema/src/session-message.ts:56][E: packages/schema/src/session-message.ts:57][E: packages/schema/src/session-message.ts:58] |
| `system` | `System` | `text` | [E: packages/schema/src/session-message.ts:64][E: packages/schema/src/session-message.ts:65] |
| `shell` | `Shell` | `callID`, `command`, `output`, `time.completed?` | [E: packages/schema/src/session-message.ts:71][E: packages/schema/src/session-message.ts:72][E: packages/schema/src/session-message.ts:73][E: packages/schema/src/session-message.ts:74][E: packages/schema/src/session-message.ts:77] |
| `assistant` | `Assistant` | `agent`, `model`, `content`, optional `snapshot/finish/cost/tokens/error`, created/completed time | [E: packages/schema/src/session-message.ts:167][E: packages/schema/src/session-message.ts:168][E: packages/schema/src/session-message.ts:169][E: packages/schema/src/session-message.ts:170][E: packages/schema/src/session-message.ts:171][E: packages/schema/src/session-message.ts:176][E: packages/schema/src/session-message.ts:177][E: packages/schema/src/session-message.ts:178][E: packages/schema/src/session-message.ts:184][E: packages/schema/src/session-message.ts:185][E: packages/schema/src/session-message.ts:187] |
| `compaction` | `Compaction` | `reason`, `summary`, `recent` | [E: packages/schema/src/session-message.ts:193][E: packages/schema/src/session-message.ts:194][E: packages/schema/src/session-message.ts:195][E: packages/schema/src/session-message.ts:196] |

### Assistant content and tool state

Assistant content is a tagged union of `text`、`reasoning`、`tool` parts。[E: packages/schema/src/session-message.ts:159][E: packages/schema/src/session-message.ts:160] `AssistantText` has `id` and `text`; `AssistantReasoning` has `id`、`text`、optional provider metadata、optional created/completed time。[E: packages/schema/src/session-message.ts:141][E: packages/schema/src/session-message.ts:143][E: packages/schema/src/session-message.ts:144][E: packages/schema/src/session-message.ts:148][E: packages/schema/src/session-message.ts:150][E: packages/schema/src/session-message.ts:151][E: packages/schema/src/session-message.ts:152][E: packages/schema/src/session-message.ts:153][E: packages/schema/src/session-message.ts:156]

`AssistantTool` has `id`、`name`、optional provider execution metadata、`state`、and time fields `created/ran?/completed?/pruned?`。[E: packages/schema/src/session-message.ts:122][E: packages/schema/src/session-message.ts:124][E: packages/schema/src/session-message.ts:125][E: packages/schema/src/session-message.ts:127][E: packages/schema/src/session-message.ts:131][E: packages/schema/src/session-message.ts:133][E: packages/schema/src/session-message.ts:134][E: packages/schema/src/session-message.ts:135][E: packages/schema/src/session-message.ts:136] Tool state is a tagged union by `status` with `pending`、`running`、`completed`、`error`。[E: packages/schema/src/session-message.ts:116][E: packages/schema/src/session-message.ts:117]

| Tool state | Fields | Evidence |
|---|---|---|
| `pending` | raw `input` string | [E: packages/schema/src/session-message.ts:82][E: packages/schema/src/session-message.ts:83][E: packages/schema/src/session-message.ts:84] |
| `running` | structured `input`, `structured`, `content` | [E: packages/schema/src/session-message.ts:88][E: packages/schema/src/session-message.ts:89][E: packages/schema/src/session-message.ts:90][E: packages/schema/src/session-message.ts:91][E: packages/schema/src/session-message.ts:92] |
| `completed` | `input`, optional `attachments`, `content`, `outputPaths`, `structured`, `result` | [E: packages/schema/src/session-message.ts:96][E: packages/schema/src/session-message.ts:97][E: packages/schema/src/session-message.ts:98][E: packages/schema/src/session-message.ts:99][E: packages/schema/src/session-message.ts:100][E: packages/schema/src/session-message.ts:101][E: packages/schema/src/session-message.ts:102][E: packages/schema/src/session-message.ts:103] |
| `error` | `input`, `content`, `structured`, `error`, `result` | [E: packages/schema/src/session-message.ts:107][E: packages/schema/src/session-message.ts:108][E: packages/schema/src/session-message.ts:109][E: packages/schema/src/session-message.ts:110][E: packages/schema/src/session-message.ts:111][E: packages/schema/src/session-message.ts:112][E: packages/schema/src/session-message.ts:113] |

### Relationship to events

Current V2 message schemas are standalone schema package definitions; `session-message.ts` imports shared scalar/content schemas and `SessionID`, while the event-to-message projection relationship is handled outside this catalog node。[E: packages/schema/src/session-message.ts:3][E: packages/schema/src/session-message.ts:5][E: packages/schema/src/session-message.ts:8][E: packages/schema/src/session-message.ts:9][I]

## V1

`packages/opencode/src/session/message-v2.ts` is the V1-to-AI-SDK message conversion layer, not the V2 Session Core. It imports local `SessionID`/`MessageID` compatibility types from `./schema`; that local `SessionID` aliases `SessionV2.ID`, while local `MessageID` is the legacy `msg`-prefixed monotonic ID helper used by the V1 storage path。[E: packages/opencode/src/session/message-v2.ts:1][E: packages/opencode/src/session/schema.ts:4][E: packages/opencode/src/session/schema.ts:7][E: packages/opencode/src/session/schema.ts:10][E: packages/opencode/src/session/schema.ts:13] The same file imports V1 session types such as `Assistant`、`Part`、`WithParts`, and AI SDK `convertToModelMessages` / `UIMessage` / `ModelMessage`。[E: packages/opencode/src/session/message-v2.ts:7][E: packages/opencode/src/session/message-v2.ts:13][E: packages/opencode/src/session/message-v2.ts:16][E: packages/opencode/src/session/message-v2.ts:20]

V1 message-v2 exports legacy message events by aliasing `SessionV1.Event.MessageUpdated`、`MessageRemoved`、`PartUpdated`、`PartDelta`、`PartRemoved`。[E: packages/opencode/src/session/message-v2.ts:55][E: packages/opencode/src/session/message-v2.ts:56][E: packages/opencode/src/session/message-v2.ts:57][E: packages/opencode/src/session/message-v2.ts:58][E: packages/opencode/src/session/message-v2.ts:59][E: packages/opencode/src/session/message-v2.ts:60]

### V1 conversion responsibilities

| Function/object | Role | Evidence |
|---|---|---|
| `toModelMessagesEffect` | Converts `WithParts[]` into AI SDK model messages and tracks model-specific media/tool-result handling. | [E: packages/opencode/src/session/message-v2.ts:131][E: packages/opencode/src/session/message-v2.ts:132][E: packages/opencode/src/session/message-v2.ts:147][E: packages/opencode/src/session/message-v2.ts:406][E: packages/opencode/src/session/message-v2.ts:407] |
| `supportsMediaInToolResult` | Encodes provider-specific media support checks for tool results. | [E: packages/opencode/src/session/message-v2.ts:147][E: packages/opencode/src/session/message-v2.ts:148][E: packages/opencode/src/session/message-v2.ts:158] |
| user branch | Builds AI SDK user messages from text/file/compaction/subtask parts. | [E: packages/opencode/src/session/message-v2.ts:198][E: packages/opencode/src/session/message-v2.ts:207][E: packages/opencode/src/session/message-v2.ts:212][E: packages/opencode/src/session/message-v2.ts:228][E: packages/opencode/src/session/message-v2.ts:234] |
| `page` | Reads legacy `MessageTable` rows for a session with cursor pagination. | [E: packages/opencode/src/session/message-v2.ts:425][E: packages/opencode/src/session/message-v2.ts:435][E: packages/opencode/src/session/message-v2.ts:439][E: packages/opencode/src/session/message-v2.ts:465] |
| `stream` | Pages through all legacy messages for a session. | [E: packages/opencode/src/session/message-v2.ts:469][E: packages/opencode/src/session/message-v2.ts:475][E: packages/opencode/src/session/message-v2.ts:485][E: packages/opencode/src/session/message-v2.ts:488] |
| `parts` | Reads `PartTable` rows for one message. | [E: packages/opencode/src/session/message-v2.ts:492][E: packages/opencode/src/session/message-v2.ts:497][E: packages/opencode/src/session/message-v2.ts:498][E: packages/opencode/src/session/message-v2.ts:502] |
| `filterCompacted` | Reorders retained compaction tail for model consumption. | [E: packages/opencode/src/session/message-v2.ts:521][E: packages/opencode/src/session/message-v2.ts:563][E: packages/opencode/src/session/message-v2.ts:565][E: packages/opencode/src/session/message-v2.ts:568] |
| `latest` | Derives latest user/assistant/finished/task bindings by max message ID. | [E: packages/opencode/src/session/message-v2.ts:585][E: packages/opencode/src/session/message-v2.ts:591][E: packages/opencode/src/session/message-v2.ts:592][E: packages/opencode/src/session/message-v2.ts:593][E: packages/opencode/src/session/message-v2.ts:595] |
| `fromError` | Maps thrown provider/runtime errors to assistant error shape. | [E: packages/opencode/src/session/message-v2.ts:603][E: packages/opencode/src/session/message-v2.ts:615][E: packages/opencode/src/session/message-v2.ts:617] |

## V1/V2 差异速查

| 维度 | V1 | V2 |
|---|---|---|
| Message storage | Legacy `MessageTable` + `PartTable` read path in `message-v2.ts`。[E: packages/opencode/src/session/message-v2.ts:30][E: packages/opencode/src/session/message-v2.ts:435][E: packages/opencode/src/session/message-v2.ts:497] | `SessionMessage.Message` typed union in schema package and re-exported by core。[E: packages/schema/src/session-message.ts:200][E: packages/schema/src/session-message.ts:212][E: packages/core/src/session/message.ts:2] |
| Model boundary | Converts to AI SDK `UIMessage`/`ModelMessage`。[E: packages/opencode/src/session/message-v2.ts:20][E: packages/opencode/src/session/message-v2.ts:406][E: packages/opencode/src/session/message-v2.ts:417] | Message schema is Effect/Schema data model and uses shared `ProviderMetadata`/`ToolContent` content types。[E: packages/schema/src/session-message.ts:3][E: packages/schema/src/session-message.ts:5][E: packages/schema/src/session-message.ts:126][E: packages/schema/src/session-message.ts:131] |
| Event relation | Defines V1 event aliases on `Event`。[E: packages/opencode/src/session/message-v2.ts:55][E: packages/opencode/src/session/message-v2.ts:60] | V2 message schemas are standalone session-message definitions; event projection is outside this reference catalog。[E: packages/schema/src/session-message.ts:1][E: packages/schema/src/session-message.ts:200][I] |
| Naming trap | File name contains `message-v2`, but imports V1 session types。 | Namespace path is `packages/core/src/session/*` and used by V2 core。 |

## Sources

- `packages/core/src/session/message.ts`
- `packages/core/src/session/schema.ts`
- `packages/schema/src/session.ts`
- `packages/schema/src/session-id.ts`
- `packages/schema/src/session-message.ts`
- `packages/opencode/src/session/schema.ts`
- `packages/opencode/src/session/message-v2.ts`

## 相关

- `session-v2.projector`
- `session-v1.store`
- `ref.events`
- `ref.db-schema`
