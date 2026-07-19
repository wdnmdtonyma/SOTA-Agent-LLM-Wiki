---
id: sdk.ts-events-items
title: TypeScript events/items
kind: sdk
tier: T1
source: [sdk/typescript/src/events.ts, sdk/typescript/src/items.ts, sdk/typescript/src/thread.ts]
symbols: [ThreadEvent, ThreadStartedEvent, TurnCompletedEvent, ItemCompletedEvent, ThreadItem, AgentMessageItem, CommandExecutionItem, FileChangeItem, McpToolCallItem, TodoListItem]
related: [sdk.ts-overview, sdk.ts-structured-output]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> TypeScript SDK events/items 是 codex exec JSONL 的 public TypeScript surface：events 描述 stream 顶层 envelope，items 描述 agent/thread 中的具体 artifact。[E: sdk/typescript/src/events.ts:76][E: sdk/typescript/src/items.ts:120]

## 能回答的问题

- `ThreadEvent` union 包含哪些 event type？
- `ThreadItem` union 包含哪些 item type？
- command/file/MCP/tool/message/reasoning/todo item 字段分别是什么？
- `Thread.run()` 如何从 events/items 中提取 final response 和 usage？

## Event union

`events.ts` 明确说明 event types 基于 `codex-rs/exec/src/exec_events.rs`；`ThreadEvent` union 包含 thread started、turn started/completed/failed、item started/updated/completed 和 stream-level error。[E: sdk/typescript/src/events.ts:1][E: sdk/typescript/src/events.ts:75][E: sdk/typescript/src/events.ts:76][E: sdk/typescript/src/events.ts:77][E: sdk/typescript/src/events.ts:78][E: sdk/typescript/src/events.ts:79][E: sdk/typescript/src/events.ts:80][E: sdk/typescript/src/events.ts:81][E: sdk/typescript/src/events.ts:82][E: sdk/typescript/src/events.ts:83]

| Event type | Payload | 说明 | Evidence |
|---|---|---|---|
| `thread.started` | `thread_id` | 新 thread 首个事件；SDK 用它填充 `Thread.id`。 | [E: sdk/typescript/src/events.ts:6][E: sdk/typescript/src/events.ts:7][E: sdk/typescript/src/events.ts:9][E: sdk/typescript/src/thread.ts:105] |
| `turn.started` | none | 新 prompt 对应 turn 开始。 | [E: sdk/typescript/src/events.ts:16][E: sdk/typescript/src/events.ts:17] |
| `turn.completed` | `usage` | turn completed；usage 是 input、cached-input、cache-write-input、output 和 reasoning-output tokens。 | [E: sdk/typescript/src/events.ts:21][E: sdk/typescript/src/events.ts:23][E: sdk/typescript/src/events.ts:25][E: sdk/typescript/src/events.ts:26][E: sdk/typescript/src/events.ts:27][E: sdk/typescript/src/events.ts:29][E: sdk/typescript/src/events.ts:31][E: sdk/typescript/src/events.ts:35][E: sdk/typescript/src/events.ts:37] |
| `turn.failed` | `error` | turn failed，error 有 message。 | [E: sdk/typescript/src/events.ts:40][E: sdk/typescript/src/events.ts:41][E: sdk/typescript/src/events.ts:43][E: sdk/typescript/src/events.ts:65][E: sdk/typescript/src/events.ts:66] |
| `item.started` | `item` | item 被加入 thread，通常处于 in progress。 | [E: sdk/typescript/src/events.ts:47][E: sdk/typescript/src/events.ts:48][E: sdk/typescript/src/events.ts:49] |
| `item.updated` | `item` | item update。 | [E: sdk/typescript/src/events.ts:52][E: sdk/typescript/src/events.ts:53] |
| `item.completed` | `item` | item terminal state。 | [E: sdk/typescript/src/events.ts:59][E: sdk/typescript/src/events.ts:60][E: sdk/typescript/src/events.ts:61] |
| `error` | `message` | stream-level unrecoverable error。 | [E: sdk/typescript/src/events.ts:65][E: sdk/typescript/src/events.ts:66][E: sdk/typescript/src/events.ts:70][E: sdk/typescript/src/events.ts:71][E: sdk/typescript/src/events.ts:72] |

## Item union

`items.ts` 明确说明 item types 基于 `codex-rs/exec/src/exec_events.rs`；`ThreadItem` union 包含 agent message、reasoning、command execution、file change、MCP tool call、web search、todo list 和 error。[E: sdk/typescript/src/items.ts:1][E: sdk/typescript/src/items.ts:96][E: sdk/typescript/src/items.ts:97][E: sdk/typescript/src/items.ts:99][E: sdk/typescript/src/items.ts:119][E: sdk/typescript/src/items.ts:120][E: sdk/typescript/src/items.ts:121][E: sdk/typescript/src/items.ts:122][E: sdk/typescript/src/items.ts:123][E: sdk/typescript/src/items.ts:124][E: sdk/typescript/src/items.ts:125][E: sdk/typescript/src/items.ts:126][E: sdk/typescript/src/items.ts:127][E: sdk/typescript/src/items.ts:128]

| Item type | TypeScript type | 核心字段 | Evidence |
|---|---|---|---|
| `agent_message` | `AgentMessageItem` | `id`、`text`；structured output 请求时 text 可为 JSON string。 | [E: sdk/typescript/src/items.ts:75][E: sdk/typescript/src/items.ts:76][E: sdk/typescript/src/items.ts:77][E: sdk/typescript/src/items.ts:79] |
| `reasoning` | `ReasoningItem` | `id`、`text`。 | [E: sdk/typescript/src/items.ts:82][E: sdk/typescript/src/items.ts:83][E: sdk/typescript/src/items.ts:84][E: sdk/typescript/src/items.ts:85] |
| `command_execution` | `CommandExecutionItem` | command、aggregated output、optional exit code、status。 | [E: sdk/typescript/src/items.ts:9][E: sdk/typescript/src/items.ts:11][E: sdk/typescript/src/items.ts:13][E: sdk/typescript/src/items.ts:15][E: sdk/typescript/src/items.ts:17][E: sdk/typescript/src/items.ts:19] |
| `file_change` | `FileChangeItem` | changes list 和 completed/failed status。 | [E: sdk/typescript/src/items.ts:32][E: sdk/typescript/src/items.ts:35][E: sdk/typescript/src/items.ts:37][E: sdk/typescript/src/items.ts:39][E: sdk/typescript/src/items.ts:41] |
| `mcp_tool_call` | `McpToolCallItem` | server、tool、arguments、optional result/error、status。 | [E: sdk/typescript/src/items.ts:51][E: sdk/typescript/src/items.ts:53][E: sdk/typescript/src/items.ts:55][E: sdk/typescript/src/items.ts:57][E: sdk/typescript/src/items.ts:59][E: sdk/typescript/src/items.ts:61][E: sdk/typescript/src/items.ts:67][E: sdk/typescript/src/items.ts:71] |
| `web_search` | `WebSearchItem` | query。 | [E: sdk/typescript/src/items.ts:90][E: sdk/typescript/src/items.ts:91][E: sdk/typescript/src/items.ts:92] |
| `todo_list` | `TodoListItem` | items，每个 item 有 text/completed。 | [E: sdk/typescript/src/items.ts:103][E: sdk/typescript/src/items.ts:104][E: sdk/typescript/src/items.ts:105][E: sdk/typescript/src/items.ts:113][E: sdk/typescript/src/items.ts:114][E: sdk/typescript/src/items.ts:115] |
| `error` | `ErrorItem` | message。 | [E: sdk/typescript/src/items.ts:97][E: sdk/typescript/src/items.ts:98][E: sdk/typescript/src/items.ts:99] |

## Run extraction

`Thread.run()` 只把 `item.completed` 推入 returned `items`；如果 completed item 是 `agent_message`，则用该 item 的 `text` 更新 `finalResponse`，所以最后一个 completed agent message 会成为 final response。[E: sdk/typescript/src/thread.ts:123][E: sdk/typescript/src/thread.ts:124][E: sdk/typescript/src/thread.ts:125][E: sdk/typescript/src/thread.ts:126][E: sdk/typescript/src/thread.ts:128][E: sdk/typescript/src/thread.ts:139]

`Thread.run()` 在 `turn.completed` 时记录 usage，在 `turn.failed` 时保存 error 并在循环后 throw；streamed parser 会把旧 CLI 省略的 `cache_write_input_tokens` 补成 `0`，再把 event yield 给调用者。[E: sdk/typescript/src/thread.ts:106][E: sdk/typescript/src/thread.ts:107][E: sdk/typescript/src/thread.ts:109][E: sdk/typescript/src/thread.ts:129][E: sdk/typescript/src/thread.ts:130][E: sdk/typescript/src/thread.ts:131][E: sdk/typescript/src/thread.ts:132][E: sdk/typescript/src/thread.ts:137]

## 设计动机

TS events/items 把 public API 保持为一个窄 union，而不是暴露 app-server v2 的完整 notification/request catalog；这与 TS SDK 复用 `codex exec` 事件流的实现相匹配。[I] `ThreadItem` 选择 agent-visible artifact 类型而不是 RPC envelope 类型，使 application code 可以按 item type 渲染 UI，而不必理解 JSON-RPC method catalog。[I]

## Sources

- `sdk/typescript/src/events.ts`
- `sdk/typescript/src/items.ts`
- `sdk/typescript/src/thread.ts`

## 相关

- `sdk.ts-overview` -> [TypeScript SDK 总览](ts-overview.md)
- `sdk.ts-structured-output` -> [TypeScript structured output](ts-structured-output.md)
