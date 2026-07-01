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
updated: db887d03e1
---

> `codex_analytics` 是 Codex 的 product analytics 管道：runtime 记录 `AnalyticsFact`，`AnalyticsReducer` 把 facts 转成 `TrackEventRequest`，queue 在后台消费并发送 events，HTTP sender 只在 `auth.uses_codex_backend()` 为 true 时用 auth provider headers POST 到 configured analytics URL。[E: codex-rs/analytics/src/facts.rs:450][E: codex-rs/analytics/src/reducer.rs:149][E: codex-rs/analytics/src/client.rs:124][E: codex-rs/analytics/src/client.rs:126][E: codex-rs/analytics/src/client.rs:129][E: codex-rs/analytics/src/client.rs:131][E: codex-rs/analytics/src/client.rs:132][E: codex-rs/analytics/src/client.rs:548][E: codex-rs/analytics/src/client.rs:557][E: codex-rs/analytics/src/client.rs:560][E: codex-rs/analytics/src/client.rs:613][E: codex-rs/analytics/src/client.rs:616]

## 能回答的问题

- analytics fact 和 track event request 的区别是什么？
- queue 怎样做 app/plugin used 去重与满队列丢弃？
- subagent thread started 怎样复用 thread initialized event？
- reducer 怎样保存 connection/thread/request/turn state？
- analytics request 什么时候会因为 auth、backend capability 或 config 被跳过？
- hooks、skills、plugins、turn config/tokens 怎样进入 analytics？

## Public exports 与数据模型

`lib.rs` re-export `AnalyticsEventsClient`、guardian/app/hook/skill/plugin/turn 相关 public input types、`TrackEventsContext` 和 `build_track_events_context`。[E: codex-rs/analytics/src/lib.rs:14][E: codex-rs/analytics/src/lib.rs:16][E: codex-rs/analytics/src/lib.rs:19][E: codex-rs/analytics/src/lib.rs:28][E: codex-rs/analytics/src/lib.rs:31][E: codex-rs/analytics/src/lib.rs:42][E: codex-rs/analytics/src/lib.rs:48][E: codex-rs/analytics/src/lib.rs:51][E: codex-rs/analytics/src/lib.rs:53][E: codex-rs/analytics/src/lib.rs:61]

`TrackEventRequest` variants 覆盖 skill/thread/guardian/app mentioned/app used/hook/compaction/goal/turn、command/file/tool/web/image/accepted-line/review、plugin used/install-requested/state/install failure，以及 external-agent import completed/failure events；`TrackEventsRequest` 是批量发送 wrapper，字段是 `events: Vec<TrackEventRequest>`。[E: codex-rs/analytics/src/events.rs:56][E: codex-rs/analytics/src/events.rs:57][E: codex-rs/analytics/src/events.rs:62][E: codex-rs/analytics/src/events.rs:63][E: codex-rs/analytics/src/events.rs:64][E: codex-rs/analytics/src/events.rs:65][E: codex-rs/analytics/src/events.rs:66][E: codex-rs/analytics/src/events.rs:67][E: codex-rs/analytics/src/events.rs:68][E: codex-rs/analytics/src/events.rs:69][E: codex-rs/analytics/src/events.rs:70][E: codex-rs/analytics/src/events.rs:71][E: codex-rs/analytics/src/events.rs:72][E: codex-rs/analytics/src/events.rs:73][E: codex-rs/analytics/src/events.rs:74][E: codex-rs/analytics/src/events.rs:75][E: codex-rs/analytics/src/events.rs:76][E: codex-rs/analytics/src/events.rs:77][E: codex-rs/analytics/src/events.rs:78][E: codex-rs/analytics/src/events.rs:79][E: codex-rs/analytics/src/events.rs:80][E: codex-rs/analytics/src/events.rs:82][E: codex-rs/analytics/src/events.rs:83][E: codex-rs/analytics/src/events.rs:84][E: codex-rs/analytics/src/events.rs:85][E: codex-rs/analytics/src/events.rs:86][E: codex-rs/analytics/src/events.rs:87][E: codex-rs/analytics/src/events.rs:88][E: codex-rs/analytics/src/events.rs:89][E: codex-rs/analytics/src/events.rs:90][E: codex-rs/analytics/src/events.rs:91]

`TrackEventsContext` 包含 model_slug、thread_id、turn_id 和 product_client_id；builder 按入参构造这四个字段。[E: codex-rs/analytics/src/facts.rs:40][E: codex-rs/analytics/src/facts.rs:41][E: codex-rs/analytics/src/facts.rs:42][E: codex-rs/analytics/src/facts.rs:43][E: codex-rs/analytics/src/facts.rs:44][E: codex-rs/analytics/src/facts.rs:47][E: codex-rs/analytics/src/facts.rs:48][E: codex-rs/analytics/src/facts.rs:49][E: codex-rs/analytics/src/facts.rs:50][E: codex-rs/analytics/src/facts.rs:51][E: codex-rs/analytics/src/facts.rs:53][E: codex-rs/analytics/src/facts.rs:54][E: codex-rs/analytics/src/facts.rs:55][E: codex-rs/analytics/src/facts.rs:56][E: codex-rs/analytics/src/facts.rs:57]

`AnalyticsFact` 是内部 fact enum，顶层覆盖 Initialize、ClientRequest、ClientResponse、ErrorResponse、ServerRequest、ServerResponse、EffectivePermissionsApprovalResponse、ServerRequestAborted、Notification 和 Custom；Custom facts 覆盖 subagent、compaction、goal、guardian、turn config/token/profile/error、skill/app/hook/plugin、plugin install failure 和 external-agent import events。[E: codex-rs/analytics/src/facts.rs:450][E: codex-rs/analytics/src/facts.rs:451][E: codex-rs/analytics/src/facts.rs:458][E: codex-rs/analytics/src/facts.rs:463][E: codex-rs/analytics/src/facts.rs:469][E: codex-rs/analytics/src/facts.rs:475][E: codex-rs/analytics/src/facts.rs:479][E: codex-rs/analytics/src/facts.rs:483][E: codex-rs/analytics/src/facts.rs:488][E: codex-rs/analytics/src/facts.rs:492][E: codex-rs/analytics/src/facts.rs:495][E: codex-rs/analytics/src/facts.rs:498][E: codex-rs/analytics/src/facts.rs:499][E: codex-rs/analytics/src/facts.rs:501][E: codex-rs/analytics/src/facts.rs:505][E: codex-rs/analytics/src/facts.rs:506][E: codex-rs/analytics/src/facts.rs:514][E: codex-rs/analytics/src/facts.rs:515][E: codex-rs/analytics/src/facts.rs:516]

## Queue 与 client

queue 常量包括 256 的 channel size、10 秒 HTTP request timeout 和 4096 的 dedupe key 上限；10 秒 timeout 用在 HTTP POST，不是 `try_send` timeout。[E: codex-rs/analytics/src/client.rs:53][E: codex-rs/analytics/src/client.rs:54][E: codex-rs/analytics/src/client.rs:55][E: codex-rs/analytics/src/client.rs:126][E: codex-rs/analytics/src/client.rs:142][E: codex-rs/analytics/src/client.rs:615] `AnalyticsEventsQueue::new` 创建 mpsc channel，spawn background task，task 从 receiver 取 fact、交给 reducer、然后调用 `send_track_events`。[E: codex-rs/analytics/src/client.rs:124][E: codex-rs/analytics/src/client.rs:126][E: codex-rs/analytics/src/client.rs:127][E: codex-rs/analytics/src/client.rs:129][E: codex-rs/analytics/src/client.rs:131][E: codex-rs/analytics/src/client.rs:132]

`try_send` 在 queue 满时 drop fact 并记录 warning；不会阻塞 caller。[E: codex-rs/analytics/src/client.rs:142][E: codex-rs/analytics/src/client.rs:143][E: codex-rs/analytics/src/client.rs:145] app used 去重 key 是 `(turn_id, connector_id)`，plugin used 去重 key 优先使用 `(turn_id, plugin_id.as_key())`，否则使用 `(turn_id, remote_plugin_id)`；dedupe set 达到上限会 clear。[E: codex-rs/analytics/src/client.rs:149][E: codex-rs/analytics/src/client.rs:154][E: codex-rs/analytics/src/client.rs:161][E: codex-rs/analytics/src/client.rs:162][E: codex-rs/analytics/src/client.rs:164][E: codex-rs/analytics/src/client.rs:167][E: codex-rs/analytics/src/client.rs:176][E: codex-rs/analytics/src/client.rs:179][E: codex-rs/analytics/src/client.rs:180][E: codex-rs/analytics/src/client.rs:181][E: codex-rs/analytics/src/client.rs:182][E: codex-rs/analytics/src/client.rs:183][E: codex-rs/analytics/src/client.rs:187]

`AnalyticsEventsClient` 提供 track_* methods，把输入包装成对应 `AnalyticsFact`；`record_fact` 只有在 queue 存在时调用 queue `try_send`，而 queue 会在 `analytics_enabled == Some(false)` 时不创建。[E: codex-rs/analytics/src/client.rs:191][E: codex-rs/analytics/src/client.rs:199][E: codex-rs/analytics/src/client.rs:212][E: codex-rs/analytics/src/client.rs:218][E: codex-rs/analytics/src/client.rs:233][E: codex-rs/analytics/src/client.rs:427][E: codex-rs/analytics/src/client.rs:428][E: codex-rs/analytics/src/client.rs:429]

## HTTP 发送

`send_track_events` 对空 events 直接返回；缺少 auth 或 `auth.uses_codex_backend()` 为 false 时跳过发送；其余 events 会按 isolated request 规则拆 batch 后发送。[E: codex-rs/analytics/src/client.rs:548][E: codex-rs/analytics/src/client.rs:553][E: codex-rs/analytics/src/client.rs:557][E: codex-rs/analytics/src/client.rs:560][E: codex-rs/analytics/src/client.rs:564][E: codex-rs/analytics/src/client.rs:569][E: codex-rs/analytics/src/client.rs:574][E: codex-rs/analytics/src/client.rs:579][E: codex-rs/analytics/src/client.rs:585] request URL 来自 `AnalyticsEventsDestination::Http { url }`，POST 携带 `auth_provider_from_auth(auth).to_auth_headers()`、JSON content type 和 `TrackEventsRequest` payload。[E: codex-rs/analytics/src/client.rs:592][E: codex-rs/analytics/src/client.rs:601][E: codex-rs/analytics/src/client.rs:608][E: codex-rs/analytics/src/client.rs:609][E: codex-rs/analytics/src/client.rs:613][E: codex-rs/analytics/src/client.rs:614][E: codex-rs/analytics/src/client.rs:615][E: codex-rs/analytics/src/client.rs:616][E: codex-rs/analytics/src/client.rs:617][E: codex-rs/analytics/src/client.rs:618]

## Reducer

`AnalyticsReducer` state 保存 requests、turns、connections、threads、tool_items_started_at_ms、pending_reviews 和 item_review_summaries；`ingest` dispatcher 按 fact kind 调用 initialize/client/server/error/notification/custom handlers。[E: codex-rs/analytics/src/reducer.rs:149][E: codex-rs/analytics/src/reducer.rs:150][E: codex-rs/analytics/src/reducer.rs:151][E: codex-rs/analytics/src/reducer.rs:152][E: codex-rs/analytics/src/reducer.rs:153][E: codex-rs/analytics/src/reducer.rs:154][E: codex-rs/analytics/src/reducer.rs:155][E: codex-rs/analytics/src/reducer.rs:156][E: codex-rs/analytics/src/reducer.rs:423][E: codex-rs/analytics/src/reducer.rs:424][E: codex-rs/analytics/src/reducer.rs:425][E: codex-rs/analytics/src/reducer.rs:440][E: codex-rs/analytics/src/reducer.rs:447][E: codex-rs/analytics/src/reducer.rs:458][E: codex-rs/analytics/src/reducer.rs:466][E: codex-rs/analytics/src/reducer.rs:469][E: codex-rs/analytics/src/reducer.rs:475][E: codex-rs/analytics/src/reducer.rs:499]

`ingest_initialize` 把 connection metadata 存入 `connections`；普通 thread start/resume/fork response 通过 `emit_thread_initialized` 写入 thread->connection 和 thread metadata，并 emit `ThreadInitialized` event。[E: codex-rs/analytics/src/reducer.rs:558][E: codex-rs/analytics/src/reducer.rs:566][E: codex-rs/analytics/src/reducer.rs:569][E: codex-rs/analytics/src/reducer.rs:578][E: codex-rs/analytics/src/reducer.rs:900][E: codex-rs/analytics/src/reducer.rs:901][E: codex-rs/analytics/src/reducer.rs:910][E: codex-rs/analytics/src/reducer.rs:921][E: codex-rs/analytics/src/reducer.rs:1337][E: codex-rs/analytics/src/reducer.rs:1351][E: codex-rs/analytics/src/reducer.rs:1361][E: codex-rs/analytics/src/reducer.rs:1365][E: codex-rs/analytics/src/reducer.rs:1366][E: codex-rs/analytics/src/reducer.rs:1368][E: codex-rs/analytics/src/reducer.rs:1370]

subagent thread started 没有独立 `TrackEventRequest` variant；reducer 把 `CustomAnalyticsFact::SubAgentThreadStarted` 转成 `TrackEventRequest::ThreadInitialized`，其 event params 设置 `thread_source: Some("subagent")`。[E: codex-rs/analytics/src/reducer.rs:583][E: codex-rs/analytics/src/reducer.rs:601][E: codex-rs/analytics/src/reducer.rs:609][E: codex-rs/analytics/src/reducer.rs:610][E: codex-rs/analytics/src/events.rs:1268][E: codex-rs/analytics/src/events.rs:1284]

request facts 保存 pending turn start/turn steer state；turn resolved config 和 token usage 更新 turn state 后调用 `maybe_emit_turn_event`。[E: codex-rs/analytics/src/reducer.rs:644][E: codex-rs/analytics/src/reducer.rs:645][E: codex-rs/analytics/src/reducer.rs:647][E: codex-rs/analytics/src/reducer.rs:653][E: codex-rs/analytics/src/reducer.rs:654][E: codex-rs/analytics/src/reducer.rs:656][E: codex-rs/analytics/src/reducer.rs:668][E: codex-rs/analytics/src/reducer.rs:673][E: codex-rs/analytics/src/reducer.rs:676][E: codex-rs/analytics/src/reducer.rs:679][E: codex-rs/analytics/src/reducer.rs:680][E: codex-rs/analytics/src/reducer.rs:683][E: codex-rs/analytics/src/reducer.rs:688][E: codex-rs/analytics/src/reducer.rs:691][E: codex-rs/analytics/src/reducer.rs:692]

skill invocation reducer 会尝试从 skill path 推导 git repo root/repo URL，并构造 `skill_invocation` event；app/hook/plugin reducers 分别构造 codex_app、codex_hook、codex_plugin event request。[E: codex-rs/analytics/src/reducer.rs:725][E: codex-rs/analytics/src/reducer.rs:733][E: codex-rs/analytics/src/reducer.rs:735][E: codex-rs/analytics/src/reducer.rs:747][E: codex-rs/analytics/src/reducer.rs:749][E: codex-rs/analytics/src/reducer.rs:767][E: codex-rs/analytics/src/reducer.rs:771][E: codex-rs/analytics/src/reducer.rs:787][E: codex-rs/analytics/src/reducer.rs:789][E: codex-rs/analytics/src/reducer.rs:795][E: codex-rs/analytics/src/reducer.rs:797][E: codex-rs/analytics/src/reducer.rs:828][E: codex-rs/analytics/src/reducer.rs:831][E: codex-rs/analytics/src/reducer.rs:841][E: codex-rs/analytics/src/reducer.rs:843]

## 设计动机与权衡

analytics 使用 fact reducer，而不是每个调用点直接 POST event，是为了让 thread/request/turn context 可以在 reducer 中统一补齐，并允许 queue 层做去重与 backpressure drop。[I] 该设计由 `AnalyticsFact`、`AnalyticsReducer` state 和 `AnalyticsEventsQueue` 共同体现。[E: codex-rs/analytics/src/facts.rs:450][E: codex-rs/analytics/src/facts.rs:492][E: codex-rs/analytics/src/facts.rs:495][E: codex-rs/analytics/src/reducer.rs:149][E: codex-rs/analytics/src/reducer.rs:156][E: codex-rs/analytics/src/client.rs:58][E: codex-rs/analytics/src/client.rs:60][E: codex-rs/analytics/src/client.rs:61][E: codex-rs/analytics/src/client.rs:124][E: codex-rs/analytics/src/client.rs:126][E: codex-rs/analytics/src/client.rs:128][E: codex-rs/analytics/src/client.rs:131][E: codex-rs/analytics/src/client.rs:142][E: codex-rs/analytics/src/client.rs:143][E: codex-rs/analytics/src/client.rs:149][E: codex-rs/analytics/src/client.rs:167]

analytics sender 要求 auth mode 使用 Codex backend，说明 product analytics 与 Codex backend-capable auth context 绑定，而不是通用 OTEL-style exporter。[I] 该结论由 `send_track_events` 的 auth lookup、`uses_codex_backend()` gate 和 auth-provider header construction 支撑。[E: codex-rs/analytics/src/client.rs:557][E: codex-rs/analytics/src/client.rs:560][E: codex-rs/analytics/src/client.rs:616]

## Gotchas

- analytics disabled config 会阻止 queue 创建；之后 `record_fact` 没有 queue 可发送，所以不是仅发送层丢弃。[E: codex-rs/analytics/src/client.rs:191][E: codex-rs/analytics/src/client.rs:199][E: codex-rs/analytics/src/client.rs:427][E: codex-rs/analytics/src/client.rs:428]
- 如果没有 thread connection context，guardian 等事件可能被 reducer drop。[E: codex-rs/analytics/src/reducer.rs:293][E: codex-rs/analytics/src/reducer.rs:302]
- hook event/source mapping 使用固定字符串；hook status 只把 unexpected `Running` 归一化为 `Failed`，不是字符串 mapping。[E: codex-rs/analytics/src/events.rs:1212][E: codex-rs/analytics/src/events.rs:1221][E: codex-rs/analytics/src/events.rs:1222][E: codex-rs/analytics/src/events.rs:1223][E: codex-rs/analytics/src/events.rs:1227][E: codex-rs/analytics/src/events.rs:1242][E: codex-rs/analytics/src/events.rs:1250][E: codex-rs/analytics/src/events.rs:1251][E: codex-rs/analytics/src/events.rs:1301][E: codex-rs/analytics/src/events.rs:1304]

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
