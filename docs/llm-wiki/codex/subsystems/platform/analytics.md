---
id: subsys.platform.analytics
title: Analytics
kind: subsystem
tier: T2
source: [codex-rs/analytics/src/lib.rs, codex-rs/analytics/src/events.rs, codex-rs/analytics/src/client.rs, codex-rs/analytics/src/facts.rs, codex-rs/analytics/src/reducer.rs]
symbols: [AnalyticsEventsClient, AnalyticsEventsQueue, AnalyticsFact, TrackEventRequest, AnalyticsReducer, build_track_events_context]
related: [subsys.platform.telemetry-otel, subsys.config-auth.auth-flows, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 5670360009
---

> `codex_analytics` 是 Codex 的 product analytics 管道：runtime 记录 `AnalyticsFact`，`AnalyticsReducer` 把 facts 转成 `TrackEventRequest`，queue 在后台消费并发送 events，HTTP sender 只在 `auth.uses_codex_backend()` 为 true 时用 auth provider headers POST 到 configured analytics URL。[E: codex-rs/analytics/src/facts.rs:445][E: codex-rs/analytics/src/reducer.rs:146][E: codex-rs/analytics/src/client.rs:121][E: codex-rs/analytics/src/client.rs:123][E: codex-rs/analytics/src/client.rs:126][E: codex-rs/analytics/src/client.rs:128][E: codex-rs/analytics/src/client.rs:129][E: codex-rs/analytics/src/client.rs:498][E: codex-rs/analytics/src/client.rs:507][E: codex-rs/analytics/src/client.rs:510][E: codex-rs/analytics/src/client.rs:563][E: codex-rs/analytics/src/client.rs:566]

## 能回答的问题

- analytics fact 和 track event request 的区别是什么？
- queue 怎样做 app/plugin used 去重与满队列丢弃？
- subagent thread started 怎样复用 thread initialized event？
- reducer 怎样保存 connection/thread/request/turn state？
- analytics request 什么时候会因为 auth、backend capability 或 config 被跳过？
- hooks、skills、plugins、turn config/tokens 怎样进入 analytics？

## Public exports 与数据模型

`lib.rs` re-export `AnalyticsEventsClient`、guardian/app/hook/skill/plugin/turn 相关 public input types、`TrackEventsContext` 和 `build_track_events_context`。[E: codex-rs/analytics/src/lib.rs:14][E: codex-rs/analytics/src/lib.rs:16][E: codex-rs/analytics/src/lib.rs:19][E: codex-rs/analytics/src/lib.rs:28][E: codex-rs/analytics/src/lib.rs:31][E: codex-rs/analytics/src/lib.rs:42][E: codex-rs/analytics/src/lib.rs:45][E: codex-rs/analytics/src/lib.rs:48][E: codex-rs/analytics/src/lib.rs:50][E: codex-rs/analytics/src/lib.rs:58]

`TrackEventRequest` variants 覆盖 skill/thread/guardian/app/hook/compaction/goal/turn、command/file/tool/web/image/accepted-line/review、plugin used/state/install failure，以及 external-agent import completed/failure events；`TrackEventsRequest` 是批量发送 wrapper，字段是 `events: Vec<TrackEventRequest>`。[E: codex-rs/analytics/src/events.rs:54][E: codex-rs/analytics/src/events.rs:60][E: codex-rs/analytics/src/events.rs:61][E: codex-rs/analytics/src/events.rs:68][E: codex-rs/analytics/src/events.rs:71][E: codex-rs/analytics/src/events.rs:72][E: codex-rs/analytics/src/events.rs:73][E: codex-rs/analytics/src/events.rs:74][E: codex-rs/analytics/src/events.rs:75][E: codex-rs/analytics/src/events.rs:76][E: codex-rs/analytics/src/events.rs:77][E: codex-rs/analytics/src/events.rs:78][E: codex-rs/analytics/src/events.rs:81][E: codex-rs/analytics/src/events.rs:86][E: codex-rs/analytics/src/events.rs:87][E: codex-rs/analytics/src/events.rs:88][E: codex-rs/analytics/src/events.rs:54][E: codex-rs/analytics/src/events.rs:55]

`TrackEventsContext` 只包含 model_slug、thread_id 和 turn_id；builder 按入参构造这三个字段。[E: codex-rs/analytics/src/facts.rs:39][E: codex-rs/analytics/src/facts.rs:40][E: codex-rs/analytics/src/facts.rs:41][E: codex-rs/analytics/src/facts.rs:42][E: codex-rs/analytics/src/facts.rs:43][E: codex-rs/analytics/src/facts.rs:46][E: codex-rs/analytics/src/facts.rs:50][E: codex-rs/analytics/src/facts.rs:51][E: codex-rs/analytics/src/facts.rs:52][E: codex-rs/analytics/src/facts.rs:53][E: codex-rs/analytics/src/facts.rs:54]

`AnalyticsFact` 是内部 fact enum，顶层覆盖 Initialize、ClientRequest、ClientResponse、ErrorResponse、ServerRequest、ServerResponse、EffectivePermissionsApprovalResponse、ServerRequestAborted、Notification 和 Custom；Custom facts 覆盖 subagent、compaction、goal、guardian、turn config/token/profile/error、skill/app/hook/plugin、plugin install failure 和 external-agent import events。[E: codex-rs/analytics/src/facts.rs:445][E: codex-rs/analytics/src/facts.rs:446][E: codex-rs/analytics/src/facts.rs:453][E: codex-rs/analytics/src/facts.rs:458][E: codex-rs/analytics/src/facts.rs:463][E: codex-rs/analytics/src/facts.rs:469][E: codex-rs/analytics/src/facts.rs:473][E: codex-rs/analytics/src/facts.rs:477][E: codex-rs/analytics/src/facts.rs:482][E: codex-rs/analytics/src/facts.rs:486][E: codex-rs/analytics/src/facts.rs:489][E: codex-rs/analytics/src/facts.rs:492][E: codex-rs/analytics/src/facts.rs:493][E: codex-rs/analytics/src/facts.rs:495][E: codex-rs/analytics/src/facts.rs:499][E: codex-rs/analytics/src/facts.rs:500][E: codex-rs/analytics/src/facts.rs:507][E: codex-rs/analytics/src/facts.rs:508][E: codex-rs/analytics/src/facts.rs:509]

## Queue 与 client

queue 常量包括 256 的 channel size、10 秒 HTTP request timeout 和 4096 的 dedupe key 上限；10 秒 timeout 用在 HTTP POST，不是 `try_send` timeout。[E: codex-rs/analytics/src/client.rs:50][E: codex-rs/analytics/src/client.rs:51][E: codex-rs/analytics/src/client.rs:52][E: codex-rs/analytics/src/client.rs:123][E: codex-rs/analytics/src/client.rs:139][E: codex-rs/analytics/src/client.rs:565] `AnalyticsEventsQueue::new` 创建 mpsc channel，spawn background task，task 从 receiver 取 fact、交给 reducer、然后调用 `send_track_events`。[E: codex-rs/analytics/src/client.rs:121][E: codex-rs/analytics/src/client.rs:123][E: codex-rs/analytics/src/client.rs:124][E: codex-rs/analytics/src/client.rs:126][E: codex-rs/analytics/src/client.rs:128][E: codex-rs/analytics/src/client.rs:129]

`try_send` 在 queue 满时 drop fact 并记录 warning；不会阻塞 caller。[E: codex-rs/analytics/src/client.rs:139][E: codex-rs/analytics/src/client.rs:140][E: codex-rs/analytics/src/client.rs:142] app used 去重 key 是 `(turn_id, connector_id)`，plugin used 去重 key 是 `(turn_id, plugin_id.as_key())`；dedupe set 达到上限会 clear。[E: codex-rs/analytics/src/client.rs:146][E: codex-rs/analytics/src/client.rs:151][E: codex-rs/analytics/src/client.rs:158][E: codex-rs/analytics/src/client.rs:159][E: codex-rs/analytics/src/client.rs:161][E: codex-rs/analytics/src/client.rs:164][E: codex-rs/analytics/src/client.rs:173][E: codex-rs/analytics/src/client.rs:176]

`AnalyticsEventsClient` 提供 track_* methods，把输入包装成对应 `AnalyticsFact`；`record_fact` 只有在 queue 存在时调用 queue `try_send`，而 queue 会在 `analytics_enabled == Some(false)` 时不创建。[E: codex-rs/analytics/src/client.rs:180][E: codex-rs/analytics/src/client.rs:188][E: codex-rs/analytics/src/client.rs:201][E: codex-rs/analytics/src/client.rs:207][E: codex-rs/analytics/src/client.rs:222][E: codex-rs/analytics/src/client.rs:403][E: codex-rs/analytics/src/client.rs:404][E: codex-rs/analytics/src/client.rs:405]

## HTTP 发送

`send_track_events` 对空 events 直接返回；缺少 auth 或 `auth.uses_codex_backend()` 为 false 时跳过发送；其余 events 会按 isolated request 规则拆 batch 后发送。[E: codex-rs/analytics/src/client.rs:498][E: codex-rs/analytics/src/client.rs:503][E: codex-rs/analytics/src/client.rs:507][E: codex-rs/analytics/src/client.rs:510][E: codex-rs/analytics/src/client.rs:514][E: codex-rs/analytics/src/client.rs:519][E: codex-rs/analytics/src/client.rs:524][E: codex-rs/analytics/src/client.rs:529][E: codex-rs/analytics/src/client.rs:535] request URL 来自 `AnalyticsEventsDestination::Http { url }`，POST 携带 `auth_provider_from_auth(auth).to_auth_headers()`、JSON content type 和 `TrackEventsRequest` payload。[E: codex-rs/analytics/src/client.rs:542][E: codex-rs/analytics/src/client.rs:551][E: codex-rs/analytics/src/client.rs:558][E: codex-rs/analytics/src/client.rs:559][E: codex-rs/analytics/src/client.rs:563][E: codex-rs/analytics/src/client.rs:564][E: codex-rs/analytics/src/client.rs:565][E: codex-rs/analytics/src/client.rs:566][E: codex-rs/analytics/src/client.rs:567][E: codex-rs/analytics/src/client.rs:568]

## Reducer

`AnalyticsReducer` state 保存 requests、turns、connections、threads、tool_items_started_at_ms、pending_reviews 和 item_review_summaries；`ingest` dispatcher 按 fact kind 调用 initialize/client/server/error/notification/custom handlers。[E: codex-rs/analytics/src/reducer.rs:145][E: codex-rs/analytics/src/reducer.rs:146][E: codex-rs/analytics/src/reducer.rs:147][E: codex-rs/analytics/src/reducer.rs:148][E: codex-rs/analytics/src/reducer.rs:149][E: codex-rs/analytics/src/reducer.rs:150][E: codex-rs/analytics/src/reducer.rs:151][E: codex-rs/analytics/src/reducer.rs:152][E: codex-rs/analytics/src/reducer.rs:153][E: codex-rs/analytics/src/reducer.rs:406][E: codex-rs/analytics/src/reducer.rs:407][E: codex-rs/analytics/src/reducer.rs:408][E: codex-rs/analytics/src/reducer.rs:423][E: codex-rs/analytics/src/reducer.rs:430][E: codex-rs/analytics/src/reducer.rs:439][E: codex-rs/analytics/src/reducer.rs:447][E: codex-rs/analytics/src/reducer.rs:450][E: codex-rs/analytics/src/reducer.rs:456][E: codex-rs/analytics/src/reducer.rs:480]

`ingest_initialize` 把 connection metadata 存入 `connections`；普通 thread start/resume/fork response 通过 `emit_thread_initialized` 写入 thread->connection 和 thread metadata，并 emit `ThreadInitialized` event。[E: codex-rs/analytics/src/reducer.rs:536][E: codex-rs/analytics/src/reducer.rs:544][E: codex-rs/analytics/src/reducer.rs:547][E: codex-rs/analytics/src/reducer.rs:556][E: codex-rs/analytics/src/reducer.rs:860][E: codex-rs/analytics/src/reducer.rs:861][E: codex-rs/analytics/src/reducer.rs:869][E: codex-rs/analytics/src/reducer.rs:879][E: codex-rs/analytics/src/reducer.rs:1293][E: codex-rs/analytics/src/reducer.rs:1306][E: codex-rs/analytics/src/reducer.rs:1316][E: codex-rs/analytics/src/reducer.rs:1319][E: codex-rs/analytics/src/reducer.rs:1320][E: codex-rs/analytics/src/reducer.rs:1323][E: codex-rs/analytics/src/reducer.rs:1325]

subagent thread started 没有独立 `TrackEventRequest` variant；reducer 把 `CustomAnalyticsFact::SubAgentThreadStarted` 转成 `TrackEventRequest::ThreadInitialized`，其 event params 设置 `thread_source: Some("subagent")`。[E: codex-rs/analytics/src/reducer.rs:561][E: codex-rs/analytics/src/reducer.rs:576][E: codex-rs/analytics/src/reducer.rs:584][E: codex-rs/analytics/src/reducer.rs:585][E: codex-rs/analytics/src/events.rs:1201][E: codex-rs/analytics/src/events.rs:1217]

request facts 保存 pending turn start/turn steer state；turn resolved config 和 token usage 更新 turn state 后调用 `maybe_emit_turn_event`。[E: codex-rs/analytics/src/reducer.rs:619][E: codex-rs/analytics/src/reducer.rs:620][E: codex-rs/analytics/src/reducer.rs:622][E: codex-rs/analytics/src/reducer.rs:628][E: codex-rs/analytics/src/reducer.rs:629][E: codex-rs/analytics/src/reducer.rs:631][E: codex-rs/analytics/src/reducer.rs:643][E: codex-rs/analytics/src/reducer.rs:648][E: codex-rs/analytics/src/reducer.rs:651][E: codex-rs/analytics/src/reducer.rs:654][E: codex-rs/analytics/src/reducer.rs:655][E: codex-rs/analytics/src/reducer.rs:658][E: codex-rs/analytics/src/reducer.rs:663][E: codex-rs/analytics/src/reducer.rs:666][E: codex-rs/analytics/src/reducer.rs:667]

skill invocation reducer 会尝试从 skill path 推导 git repo root/repo URL，并构造 `skill_invocation` event；app/hook/plugin reducers 分别构造 codex_app、codex_hook、codex_plugin event request。[E: codex-rs/analytics/src/reducer.rs:700][E: codex-rs/analytics/src/reducer.rs:708][E: codex-rs/analytics/src/reducer.rs:710][E: codex-rs/analytics/src/reducer.rs:722][E: codex-rs/analytics/src/reducer.rs:724][E: codex-rs/analytics/src/reducer.rs:742][E: codex-rs/analytics/src/reducer.rs:746][E: codex-rs/analytics/src/reducer.rs:762][E: codex-rs/analytics/src/reducer.rs:764][E: codex-rs/analytics/src/reducer.rs:770][E: codex-rs/analytics/src/reducer.rs:772][E: codex-rs/analytics/src/reducer.rs:789][E: codex-rs/analytics/src/reducer.rs:792][E: codex-rs/analytics/src/reducer.rs:802][E: codex-rs/analytics/src/reducer.rs:804]

## 设计动机与权衡

analytics 使用 fact reducer，而不是每个调用点直接 POST event，是为了让 thread/request/turn context 可以在 reducer 中统一补齐，并允许 queue 层做去重与 backpressure drop。[I] 该设计由 `AnalyticsFact`、`AnalyticsReducer` state 和 `AnalyticsEventsQueue` 共同体现。[E: codex-rs/analytics/src/facts.rs:445][E: codex-rs/analytics/src/facts.rs:486][E: codex-rs/analytics/src/facts.rs:489][E: codex-rs/analytics/src/reducer.rs:145][E: codex-rs/analytics/src/reducer.rs:146][E: codex-rs/analytics/src/reducer.rs:153][E: codex-rs/analytics/src/client.rs:55][E: codex-rs/analytics/src/client.rs:57][E: codex-rs/analytics/src/client.rs:58][E: codex-rs/analytics/src/client.rs:121][E: codex-rs/analytics/src/client.rs:123][E: codex-rs/analytics/src/client.rs:125][E: codex-rs/analytics/src/client.rs:128][E: codex-rs/analytics/src/client.rs:139][E: codex-rs/analytics/src/client.rs:140][E: codex-rs/analytics/src/client.rs:146][E: codex-rs/analytics/src/client.rs:164]

analytics sender 要求 auth mode 使用 Codex backend，说明 product analytics 与 Codex backend-capable auth context 绑定，而不是通用 OTEL-style exporter。[I] 该结论由 `send_track_events` 的 auth lookup、`uses_codex_backend()` gate 和 auth-provider header construction 支撑。[E: codex-rs/analytics/src/client.rs:507][E: codex-rs/analytics/src/client.rs:510][E: codex-rs/analytics/src/client.rs:566]

## Gotchas

- analytics disabled config 会阻止 queue 创建；之后 `record_fact` 没有 queue 可发送，所以不是仅发送层丢弃。[E: codex-rs/analytics/src/client.rs:180][E: codex-rs/analytics/src/client.rs:188][E: codex-rs/analytics/src/client.rs:403][E: codex-rs/analytics/src/client.rs:404]
- 如果没有 thread connection context，guardian 等事件可能被 reducer drop。[E: codex-rs/analytics/src/reducer.rs:276][E: codex-rs/analytics/src/reducer.rs:285]
- hook event/source mapping 使用固定字符串；hook status 只把 unexpected `Running` 归一化为 `Failed`，不是字符串 mapping。[E: codex-rs/analytics/src/events.rs:1146][E: codex-rs/analytics/src/events.rs:1154][E: codex-rs/analytics/src/events.rs:1155][E: codex-rs/analytics/src/events.rs:1156][E: codex-rs/analytics/src/events.rs:1160][E: codex-rs/analytics/src/events.rs:1175][E: codex-rs/analytics/src/events.rs:1183][E: codex-rs/analytics/src/events.rs:1184][E: codex-rs/analytics/src/events.rs:1234][E: codex-rs/analytics/src/events.rs:1237]

## Sources

- `codex-rs/analytics/src/lib.rs`
- `codex-rs/analytics/src/events.rs`
- `codex-rs/analytics/src/client.rs`
- `codex-rs/analytics/src/facts.rs`
- `codex-rs/analytics/src/reducer.rs`

## 相关

- `subsys.platform.telemetry-otel`: metrics/tracing/logging exporter 管道。
- `subsys.config-auth.auth-flows`: analytics 发送依赖 ChatGPT auth。
- `config.storage-telemetry-misc`: analytics 开关配置入口。
