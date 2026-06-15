---
id: subsys.core.realtime-conversation
title: Realtime conversation 状态机
kind: subsystem
tier: T2
source: [codex-rs/core/src/realtime_conversation.rs, codex-rs/core/src/realtime_context.rs, codex-rs/core/src/realtime_prompt.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/session/handlers.rs, codex-rs/protocol/src/protocol.rs]
symbols: [RealtimeConversationManager, ConversationState, RealtimeStart, RealtimeSessionKind, RealtimeHandoffState, RealtimeResponseCreateQueue, prepare_realtime_start, build_realtime_session_config, handle_realtime_server_event, handle_handoff_output, build_realtime_startup_context]
related: [subsys.platform.realtime, rpc.notifications-system, ref.protocol-op, ref.protocol-event-streaming, subsys.core.context-manager]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Realtime conversation 是 Codex core 的语音/文本 sideband 状态机：`Op::RealtimeConversationStart` 建立 websocket 或 WebRTC sideband，`ConversationState` 管理 user audio/text、backend handoff、fanout task 和 close event。[E: codex-rs/core/src/session/handlers.rs:1025][E: codex-rs/core/src/realtime_conversation.rs:261][E: codex-rs/core/src/realtime_conversation.rs:287][E: codex-rs/core/src/realtime_conversation.rs:211][I]

## 能回答的问题

- realtime conversation 什么时候 start、close、transport closed 或 error？
- V1/V2 realtime session 的行为差异在哪里？
- 用户音频、用户文本、backend handoff output 分别走哪个 channel？
- `RealtimeConversationStarted`、`RealtimeConversationRealtime`、`RealtimeConversationClosed` 事件何时发出？
- realtime startup context 如何从当前 thread、recent work 和 workspace 构建？

## 职责边界

- `codex-rs/core/src/realtime_conversation.rs` 拥有 manager 状态、transport 启动、input task、fanout task、handoff 和 error/closed event。[E: codex-rs/core/src/realtime_conversation.rs:89][E: codex-rs/core/src/realtime_conversation.rs:555][E: codex-rs/core/src/realtime_conversation.rs:1400]
- `codex-rs/core/src/realtime_context.rs` 构建模型 startup context；网络连接由 `realtime_conversation.rs` 的 transport start path 负责。[E: codex-rs/core/src/realtime_context.rs:59][E: codex-rs/core/src/realtime_context.rs:128][E: codex-rs/core/src/realtime_conversation.rs:287][I]
- `codex-rs/core/src/realtime_prompt.rs` 决定 backend prompt 的 request/config/default 优先级。[E: codex-rs/core/src/realtime_prompt.rs:5][E: codex-rs/core/src/realtime_prompt.rs:15]
- protocol 层定义 realtime params、transport、op 和 event 数据形状；dispatch 在 session handlers，active 状态机在 manager。[E: codex-rs/protocol/src/protocol.rs:152][E: codex-rs/protocol/src/protocol.rs:171][E: codex-rs/protocol/src/protocol.rs:412][E: codex-rs/core/src/session/handlers.rs:1006][E: codex-rs/core/src/realtime_conversation.rs:89]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `codex-rs/protocol/src/protocol.rs` | `ConversationStartParams`、`ConversationStartTransport`、`RealtimeOutputModality`、realtime `Op` 与 `EventMsg`。[E: codex-rs/protocol/src/protocol.rs:152][E: codex-rs/protocol/src/protocol.rs:171][E: codex-rs/protocol/src/protocol.rs:179][E: codex-rs/protocol/src/protocol.rs:412][E: codex-rs/protocol/src/protocol.rs:1440] |
| `codex-rs/core/src/session/handlers.rs` | submission loop 把 realtime ops 分发到 start/audio/text/close/list voices handler。[E: codex-rs/core/src/session/handlers.rs:1006][E: codex-rs/core/src/session/handlers.rs:1014][E: codex-rs/core/src/session/handlers.rs:1046] |
| `codex-rs/core/src/realtime_conversation.rs` | transport、state、queues、handoff、input/fanout loops、closed/error event。[E: codex-rs/core/src/realtime_conversation.rs:261][E: codex-rs/core/src/realtime_conversation.rs:807][E: codex-rs/core/src/realtime_conversation.rs:1003] |
| `codex-rs/core/src/realtime_context.rs` | 当前 thread/recent work/workspace startup context。[E: codex-rs/core/src/realtime_context.rs:59][E: codex-rs/core/src/realtime_context.rs:152] |
| `codex-rs/core/src/context_manager/updates.rs` | realtime_active prompt update fragment 的 start/end 注入。[E: codex-rs/core/src/context_manager/updates.rs:89][E: codex-rs/core/src/context_manager/updates.rs:100] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `RealtimeConversationManager` | `state: Mutex<Option<ConversationState>>` | manager 同时只持有一个 active conversation state；新的 start 会拿走旧 state 并 abort。[E: codex-rs/core/src/realtime_conversation.rs:89][E: codex-rs/core/src/realtime_conversation.rs:261] |
| `ConversationState` | audio/text sender、session_kind、writer、handoff、input/fanout tasks、realtime_active | 这是 runtime 内部 active 状态；`realtime_active` 是共享 atomic guard。[E: codex-rs/core/src/realtime_conversation.rs:210][E: codex-rs/core/src/realtime_conversation.rs:218] |
| `RealtimeSessionKind` | `V1`、`V2` | session kind 从 config 的 event parser 派生。[E: codex-rs/core/src/realtime_conversation.rs:93][E: codex-rs/core/src/realtime_conversation.rs:273] |
| `RealtimeHandoffState` | `active_handoff_id`、`last_output` | V2 handoff 记录当前 handoff 和最近 backend output，用于 final update。[E: codex-rs/core/src/realtime_conversation.rs:99][E: codex-rs/core/src/realtime_conversation.rs:474] |
| `RealtimeResponseCreateQueue` | `active_default_response`、`pending_create` | V2 response.create race control：active response 期间 request 会标为 pending，done/cancelled 后如果 `pending_create` 为 true 再发起下一次 create。[E: codex-rs/core/src/realtime_conversation.rs:125][E: codex-rs/core/src/realtime_conversation.rs:127][E: codex-rs/core/src/realtime_conversation.rs:128][E: codex-rs/core/src/realtime_conversation.rs:138][E: codex-rs/core/src/realtime_conversation.rs:149][E: codex-rs/core/src/realtime_conversation.rs:156][E: codex-rs/core/src/realtime_conversation.rs:160] |
| `ConversationStartParams` | `output_modality`、`prompt`、`session_id`、`transport`、`voice` | request prompt 是 `Option<Option<String>>`，可表达未提供、显式 default/empty、显式自定义。[E: codex-rs/protocol/src/protocol.rs:152][E: codex-rs/protocol/src/protocol.rs:161] |

## 控制流：start 与 transport

1. submission loop 收到 `Op::RealtimeConversationStart` 调用 `handle_realtime_conversation_start`；audio/text/close/list voices 也在同一 loop 中分发。[E: codex-rs/core/src/session/handlers.rs:1016][E: codex-rs/core/src/session/handlers.rs:1025][E: codex-rs/core/src/session/handlers.rs:1027][E: codex-rs/core/src/session/handlers.rs:1040][E: codex-rs/core/src/session/handlers.rs:1044][E: codex-rs/core/src/session/handlers.rs:1048][E: codex-rs/core/src/session/handlers.rs:1052]
2. `handle_start` 先调用 `prepare_realtime_start`；prepare 或 start 失败时发送 realtime error payload，但 handler 自身返回 `Ok(())`。[E: codex-rs/core/src/realtime_conversation.rs:555][E: codex-rs/core/src/realtime_conversation.rs:564][E: codex-rs/core/src/realtime_conversation.rs:581]
3. `prepare_realtime_start` 解析 provider/auth/config，默认 transport 是 websocket；websocket header 带 API key，WebRTC sideband header 不带 API key。[E: codex-rs/core/src/realtime_conversation.rs:599][E: codex-rs/core/src/realtime_conversation.rs:611][E: codex-rs/core/src/realtime_conversation.rs:613][E: codex-rs/core/src/realtime_conversation.rs:628][E: codex-rs/core/src/realtime_conversation.rs:630][E: codex-rs/core/src/realtime_conversation.rs:637]
4. `build_realtime_session_config` 选择 backend prompt、startup context、model、event parser、session mode、voice；当 session kind 是 V1 且 output modality 是 text 时直接 invalid request。[E: codex-rs/core/src/realtime_conversation.rs:650][E: codex-rs/core/src/realtime_conversation.rs:662][E: codex-rs/core/src/realtime_conversation.rs:674][E: codex-rs/core/src/realtime_conversation.rs:692]
5. manager `start` 会先 take 旧 state 并用 `RealtimeFanoutTaskStop::Abort` 停掉旧 conversation，然后进入 `start_inner`。[E: codex-rs/core/src/realtime_conversation.rs:261][E: codex-rs/core/src/realtime_conversation.rs:265]
6. `start_inner` 按 transport 创建 websocket 或 WebRTC sideband connection，创建 bounded audio/text/handoff/server-event channels，并 spawn input task。[E: codex-rs/core/src/realtime_conversation.rs:287][E: codex-rs/core/src/realtime_conversation.rs:300][E: codex-rs/core/src/realtime_conversation.rs:318][E: codex-rs/core/src/realtime_conversation.rs:342]
7. `handle_start_inner` 成功后发送 `RealtimeConversationStarted { session_id, version }`；WebRTC transport 还会发送 `RealtimeConversationSdp`。[E: codex-rs/core/src/realtime_conversation.rs:756][E: codex-rs/core/src/realtime_conversation.rs:785][E: codex-rs/core/src/realtime_conversation.rs:794]
8. fanout task 遍历 realtime event stream：普通事件转成 `RealtimeConversationRealtime`，Error 设置 end reason 为 Error；event stream 结束后如果 still active，会 finish state 并发 closed event。[E: codex-rs/core/src/realtime_conversation.rs:815][E: codex-rs/core/src/realtime_conversation.rs:827][E: codex-rs/core/src/realtime_conversation.rs:849][E: codex-rs/core/src/realtime_conversation.rs:864]

## 控制流：输入、handoff、关闭

1. `audio_in` 要求已有 state；audio channel 满时 drop frame，channel closed 时返回 invalid request。[E: codex-rs/core/src/realtime_conversation.rs:396][E: codex-rs/core/src/realtime_conversation.rs:405][E: codex-rs/core/src/realtime_conversation.rs:412]
2. `text_in` 要求已有 state；V2 用户文本会加前缀后进入 user text sender。[E: codex-rs/core/src/realtime_conversation.rs:420][E: codex-rs/core/src/realtime_conversation.rs:431][E: codex-rs/core/src/realtime_conversation.rs:720]
3. `spawn_realtime_input_task` 用 `tokio::select!` 同时处理 user text、handoff output、realtime server event 和 user audio；任一路径返回 error 会 break。[E: codex-rs/core/src/realtime_conversation.rs:1003][E: codex-rs/core/src/realtime_conversation.rs:1011][E: codex-rs/core/src/realtime_conversation.rs:1065]
4. 用户文本会发送 realtime conversation item create；用户 audio 会发送 audio frame。[E: codex-rs/core/src/realtime_conversation.rs:1069][E: codex-rs/core/src/realtime_conversation.rs:1078][E: codex-rs/core/src/realtime_conversation.rs:1339][E: codex-rs/core/src/realtime_conversation.rs:1347]
5. `handoff_out` 在 V2 下给 backend text 加前缀，记录 `last_output_text`，再向 handoff output channel 发送 progress。[E: codex-rs/core/src/realtime_conversation.rs:442][E: codex-rs/core/src/realtime_conversation.rs:457][E: codex-rs/core/src/realtime_conversation.rs:462][E: codex-rs/core/src/realtime_conversation.rs:464]
6. `handoff_complete` 对无 state 和 V1 都是 no-op；V2 有 active handoff 且有 last output 时发送 FinalUpdate。[E: codex-rs/core/src/realtime_conversation.rs:474][E: codex-rs/core/src/realtime_conversation.rs:479][E: codex-rs/core/src/realtime_conversation.rs:483][E: codex-rs/core/src/realtime_conversation.rs:487][E: codex-rs/core/src/realtime_conversation.rs:490][E: codex-rs/core/src/realtime_conversation.rs:494]
7. `handle_handoff_output` 在 V1 下发送 function_call_output；V2 progress 会在 active handoff match 时创建 conversation item，V2 final 会发送 acknowledgement 并 request `response.create`。[E: codex-rs/core/src/realtime_conversation.rs:1087][E: codex-rs/core/src/realtime_conversation.rs:1093][E: codex-rs/core/src/realtime_conversation.rs:1114][E: codex-rs/core/src/realtime_conversation.rs:1145]
8. `handle_realtime_server_event` 处理 stream end/error、audio truncation、response created/done/cancelled、handoff requested、noop requested、session updated 等状态；`HandoffRequested` 会设置 active handoff 或发 steering ack。[E: codex-rs/core/src/realtime_conversation.rs:1158][E: codex-rs/core/src/realtime_conversation.rs:1224][E: codex-rs/core/src/realtime_conversation.rs:1283]
9. `handle_close` 调用 `end_realtime_conversation`，reason 为 Requested；closed event 的 reason 会编码为 `requested`、`transport_closed` 或 `error`。[E: codex-rs/core/src/realtime_conversation.rs:999][E: codex-rs/core/src/realtime_conversation.rs:1421][E: codex-rs/core/src/realtime_conversation.rs:1430][E: codex-rs/core/src/realtime_conversation.rs:1438]
10. `shutdown` take 当前 state 并 abort input/fanout；`finish_if_active` 只有 active pointer 相同才 detach fanout，避免旧 task 关闭新 session。[E: codex-rs/core/src/realtime_conversation.rs:523][E: codex-rs/core/src/realtime_conversation.rs:382][E: codex-rs/core/src/realtime_conversation.rs:536]

## Startup context 与 prompt

- `prepare_realtime_backend_prompt` 的优先级是非空 config override、request prompt、default prompt；request prompt 的 `Some(None)` 会生成空 prompt。[E: codex-rs/core/src/realtime_prompt.rs:5][E: codex-rs/core/src/realtime_prompt.rs:9][E: codex-rs/core/src/realtime_prompt.rs:15][E: codex-rs/core/src/realtime_prompt.rs:21]
- `build_realtime_startup_context` 构建 current thread、recent work、workspace 三类 section；三类都不存在时返回 None。[E: codex-rs/core/src/realtime_context.rs:59][E: codex-rs/core/src/realtime_context.rs:100][E: codex-rs/core/src/realtime_context.rs:116]
- recent work 查询 thread store，默认 page size 40、按 updated desc、排除 archived；失败时 warn 并返回空列表。[E: codex-rs/core/src/realtime_context.rs:128][E: codex-rs/core/src/realtime_context.rs:137][E: codex-rs/core/src/realtime_context.rs:145]
- current thread section 会遍历 history，跳过 contextual user messages，并按 token budget 收集最近 turns。[E: codex-rs/core/src/realtime_context.rs:206][E: codex-rs/core/src/realtime_context.rs:235][E: codex-rs/core/src/realtime_context.rs:256]
- context manager 在 `realtime_active` 从 false/None 变 true 时注入 realtime start instructions，从 true 变 false 时注入 inactive 结束文本。[E: codex-rs/core/src/context_manager/updates.rs:89][E: codex-rs/core/src/context_manager/updates.rs:100][E: codex-rs/core/src/context_manager/updates.rs:108]

## 设计动机与权衡

- manager start 会主动 abort 旧 conversation，说明 Codex 选择单 active realtime session，避免多个 sideband 同时抢占 audio/text/handoff queues。[E: codex-rs/core/src/realtime_conversation.rs:261][E: codex-rs/core/src/realtime_conversation.rs:265][I]
- V2 使用 `RealtimeResponseCreateQueue` 防止 active response 期间重复发 `response.create`；pending state 只保留一个布尔值，表示 active response 完成后需要再发送一次 generic create。[E: codex-rs/core/src/realtime_conversation.rs:127][E: codex-rs/core/src/realtime_conversation.rs:138][E: codex-rs/core/src/realtime_conversation.rs:139][E: codex-rs/core/src/realtime_conversation.rs:156][E: codex-rs/core/src/realtime_conversation.rs:159][E: codex-rs/core/src/realtime_conversation.rs:160][I]
- startup context 被限制为固定 token budget，且 recent work 只取最多 8 个分组，说明 realtime prompt 需要快速启动而不是完整重放所有历史。[E: codex-rs/core/src/realtime_context.rs:37][E: codex-rs/core/src/realtime_context.rs:66][E: codex-rs/core/src/realtime_context.rs:203][I]

## Gotcha

- `handle_start` 失败时会发送 realtime error event，但 Rust function 返回 `Ok(())`；调用方不能只看 handler result 判断 UI 是否需要显示错误。[E: codex-rs/core/src/realtime_conversation.rs:564][E: codex-rs/core/src/realtime_conversation.rs:581]
- V1 不支持 text output modality；`build_realtime_session_config` 会直接返回 invalid request。[E: codex-rs/core/src/realtime_conversation.rs:690][E: codex-rs/core/src/realtime_conversation.rs:692]
- `text_in` 和 `handoff_out` 都会在 V2 下加 prefix，但 `prefix_realtime_text` 会避免重复加同一个 prefix。[E: codex-rs/core/src/realtime_conversation.rs:431][E: codex-rs/core/src/realtime_conversation.rs:456][E: codex-rs/core/src/realtime_conversation.rs:724]

## Sources

- `codex-rs/core/src/realtime_conversation.rs`
- `codex-rs/core/src/realtime_context.rs`
- `codex-rs/core/src/realtime_prompt.rs`
- `codex-rs/core/src/context_manager/updates.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- 索引 id：`subsys.platform.realtime`
- 索引 id：`rpc.notifications-system`
- 索引 id：`ref.protocol-op`
- 索引 id：`ref.protocol-event-streaming`
- [Context manager](context-manager.md)
