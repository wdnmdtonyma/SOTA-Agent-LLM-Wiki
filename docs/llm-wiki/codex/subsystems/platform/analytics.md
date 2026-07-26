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
updated: 61a44880a8
---

> `codex_analytics` 是 Codex 的 product analytics 管道：runtime 记录 `AnalyticsFact`，`AnalyticsReducer` 把 facts 转成 `TrackEventRequest`，queue 在后台消费并发送 events；Codex-backend auth 可发送正常事件，API-key auth 只保留带 plugin identity 的 plugin/skill/MCP 子集，再用 auth provider headers POST 到 configured analytics URL。[E: codex-rs/analytics/src/facts.rs:364][E: codex-rs/analytics/src/reducer.rs:150][E: codex-rs/analytics/src/client.rs:133][E: codex-rs/analytics/src/client.rs:135][E: codex-rs/analytics/src/client.rs:599][E: codex-rs/analytics/src/client.rs:608][E: codex-rs/analytics/src/client.rs:611][E: codex-rs/analytics/src/client.rs:612][E: codex-rs/analytics/src/events.rs:99][E: codex-rs/analytics/src/events.rs:101][E: codex-rs/analytics/src/events.rs:103][E: codex-rs/analytics/src/client.rs:669][E: codex-rs/analytics/src/client.rs:672]

## 能回答的问题

- analytics fact 和 track event request 的区别是什么？
- queue 怎样做 app/plugin used 去重与满队列丢弃？
- subagent thread started 怎样复用 thread initialized event？
- reducer 怎样保存 connection/thread/request/turn state？
- analytics request 什么时候会因为 auth、backend capability 或 config 被跳过？
- hooks、skills、plugins、turn config/tokens 怎样进入 analytics？

## Public exports 与数据模型

`lib.rs` re-export `AnalyticsEventsClient`、guardian/app/hook/skill/plugin/turn 相关 public input types、`TrackEventsContext` 和 `build_track_events_context`。[E: codex-rs/analytics/src/lib.rs:14][E: codex-rs/analytics/src/lib.rs:16][E: codex-rs/analytics/src/lib.rs:19][E: codex-rs/analytics/src/lib.rs:28][E: codex-rs/analytics/src/lib.rs:31][E: codex-rs/analytics/src/lib.rs:42][E: codex-rs/analytics/src/lib.rs:49][E: codex-rs/analytics/src/lib.rs:52][E: codex-rs/analytics/src/lib.rs:54][E: codex-rs/analytics/src/lib.rs:62]

`TrackEventRequest` variants 覆盖 skill/thread/guardian/app mentioned/app used/hook/compaction/goal/turn、command/file/tool/web/image/accepted-line/review、plugin used/install-requested/state/install failure，以及 external-agent import completed/failure events；`TrackEventsRequest` 是批量发送 wrapper，字段是 `events: Vec<TrackEventRequest>`。[E: codex-rs/analytics/src/events.rs:56][E: codex-rs/analytics/src/events.rs:57][E: codex-rs/analytics/src/events.rs:62][E: codex-rs/analytics/src/events.rs:63][E: codex-rs/analytics/src/events.rs:64][E: codex-rs/analytics/src/events.rs:65][E: codex-rs/analytics/src/events.rs:66][E: codex-rs/analytics/src/events.rs:67][E: codex-rs/analytics/src/events.rs:68][E: codex-rs/analytics/src/events.rs:69][E: codex-rs/analytics/src/events.rs:70][E: codex-rs/analytics/src/events.rs:71][E: codex-rs/analytics/src/events.rs:72][E: codex-rs/analytics/src/events.rs:73][E: codex-rs/analytics/src/events.rs:74][E: codex-rs/analytics/src/events.rs:75][E: codex-rs/analytics/src/events.rs:76][E: codex-rs/analytics/src/events.rs:77][E: codex-rs/analytics/src/events.rs:78][E: codex-rs/analytics/src/events.rs:79][E: codex-rs/analytics/src/events.rs:80][E: codex-rs/analytics/src/events.rs:82][E: codex-rs/analytics/src/events.rs:83][E: codex-rs/analytics/src/events.rs:84][E: codex-rs/analytics/src/events.rs:85][E: codex-rs/analytics/src/events.rs:86][E: codex-rs/analytics/src/events.rs:87][E: codex-rs/analytics/src/events.rs:88][E: codex-rs/analytics/src/events.rs:89][E: codex-rs/analytics/src/events.rs:90][E: codex-rs/analytics/src/events.rs:91]

`TrackEventsContext` 包含 model_slug、thread_id、turn_id 和 product_client_id；builder 按入参构造这四个字段。[E: codex-rs/analytics/src/facts.rs:41][E: codex-rs/analytics/src/facts.rs:42][E: codex-rs/analytics/src/facts.rs:43][E: codex-rs/analytics/src/facts.rs:44][E: codex-rs/analytics/src/facts.rs:45][E: codex-rs/analytics/src/facts.rs:48][E: codex-rs/analytics/src/facts.rs:49][E: codex-rs/analytics/src/facts.rs:50][E: codex-rs/analytics/src/facts.rs:51][E: codex-rs/analytics/src/facts.rs:52][E: codex-rs/analytics/src/facts.rs:54][E: codex-rs/analytics/src/facts.rs:55][E: codex-rs/analytics/src/facts.rs:56][E: codex-rs/analytics/src/facts.rs:57][E: codex-rs/analytics/src/facts.rs:58]

`AnalyticsFact` 是内部 fact enum，顶层覆盖 Initialize、ClientRequest、ClientResponse、ErrorResponse、ServerRequest、ServerResponse、EffectivePermissionsApprovalResponse、ServerRequestAborted、Notification 和 Custom；Custom facts 覆盖 subagent、compaction、goal、guardian、turn config/token/profile/error、skill/app/hook/plugin、plugin install failure 和 external-agent import events。[E: codex-rs/analytics/src/facts.rs:364][E: codex-rs/analytics/src/facts.rs:365][E: codex-rs/analytics/src/facts.rs:372][E: codex-rs/analytics/src/facts.rs:377][E: codex-rs/analytics/src/facts.rs:383][E: codex-rs/analytics/src/facts.rs:389][E: codex-rs/analytics/src/facts.rs:393][E: codex-rs/analytics/src/facts.rs:397][E: codex-rs/analytics/src/facts.rs:402][E: codex-rs/analytics/src/facts.rs:406][E: codex-rs/analytics/src/facts.rs:409][E: codex-rs/analytics/src/facts.rs:412][E: codex-rs/analytics/src/facts.rs:413][E: codex-rs/analytics/src/facts.rs:415][E: codex-rs/analytics/src/facts.rs:419][E: codex-rs/analytics/src/facts.rs:420][E: codex-rs/analytics/src/facts.rs:428][E: codex-rs/analytics/src/facts.rs:429][E: codex-rs/analytics/src/facts.rs:430]

## Queue 与 client

queue 常量包括 256 的 channel size、10 秒 HTTP request timeout 和 4096 的 dedupe key 上限；10 秒 timeout 用在 HTTP POST，不是 `try_send` timeout。[E: codex-rs/analytics/src/client.rs:55][E: codex-rs/analytics/src/client.rs:56][E: codex-rs/analytics/src/client.rs:59][E: codex-rs/analytics/src/client.rs:135][E: codex-rs/analytics/src/client.rs:158][E: codex-rs/analytics/src/client.rs:671] `AnalyticsEventsQueue::new` 创建 mpsc channel，spawn background task，task 从 receiver 取 fact、交给 reducer、然后调用 `send_track_events`。[E: codex-rs/analytics/src/client.rs:133][E: codex-rs/analytics/src/client.rs:135][E: codex-rs/analytics/src/client.rs:136][E: codex-rs/analytics/src/client.rs:138][E: codex-rs/analytics/src/client.rs:147][E: codex-rs/analytics/src/client.rs:148]

`try_send` 在 queue 满时 drop fact 并记录 warning；不会阻塞 caller。[E: codex-rs/analytics/src/client.rs:158][E: codex-rs/analytics/src/client.rs:143][E: codex-rs/analytics/src/client.rs:165] app used 去重 key 是 `(turn_id, connector_id)`，plugin used 去重 key 优先使用 `(turn_id, plugin_id.as_key())`，否则使用 `(turn_id, remote_plugin_id)`；dedupe set 达到上限会 clear。[E: codex-rs/analytics/src/client.rs:169][E: codex-rs/analytics/src/client.rs:174][E: codex-rs/analytics/src/client.rs:181][E: codex-rs/analytics/src/client.rs:182][E: codex-rs/analytics/src/client.rs:184][E: codex-rs/analytics/src/client.rs:187][E: codex-rs/analytics/src/client.rs:196][E: codex-rs/analytics/src/client.rs:199][E: codex-rs/analytics/src/client.rs:200][E: codex-rs/analytics/src/client.rs:201][E: codex-rs/analytics/src/client.rs:202][E: codex-rs/analytics/src/client.rs:203][E: codex-rs/analytics/src/client.rs:207]

`AnalyticsEventsClient` 提供 track_* methods，把输入包装成对应 `AnalyticsFact`；`record_fact` 只有在 queue 存在时调用 queue `try_send`，而 queue 会在 `analytics_enabled == Some(false)` 时不创建。[E: codex-rs/analytics/src/client.rs:211][E: codex-rs/analytics/src/client.rs:219][E: codex-rs/analytics/src/client.rs:255][E: codex-rs/analytics/src/client.rs:261][E: codex-rs/analytics/src/client.rs:276][E: codex-rs/analytics/src/client.rs:478][E: codex-rs/analytics/src/client.rs:479][E: codex-rs/analytics/src/client.rs:480]

## HTTP 发送

`send_track_events` 对空 events 或缺少 auth 直接返回；API-key auth 通过 `TrackEventRequest::can_send_with_api_key_auth` 过滤事件，非 API-key 且非 Codex-backend auth 则整体跳过，过滤后的 events 再按 isolated request 规则拆 batch。[E: codex-rs/analytics/src/client.rs:599][E: codex-rs/analytics/src/client.rs:604][E: codex-rs/analytics/src/client.rs:608][E: codex-rs/analytics/src/client.rs:611][E: codex-rs/analytics/src/client.rs:612][E: codex-rs/analytics/src/client.rs:613][E: codex-rs/analytics/src/client.rs:616][E: codex-rs/analytics/src/client.rs:620][E: codex-rs/analytics/src/events.rs:99][E: codex-rs/analytics/src/events.rs:101][E: codex-rs/analytics/src/events.rs:104] request URL 来自 `AnalyticsEventsDestination::Http { url }`，POST 携带 `auth_provider_from_auth(auth).to_auth_headers()`、JSON content type 和 `TrackEventsRequest` payload。[E: codex-rs/analytics/src/client.rs:648][E: codex-rs/analytics/src/client.rs:657][E: codex-rs/analytics/src/client.rs:664][E: codex-rs/analytics/src/client.rs:665][E: codex-rs/analytics/src/client.rs:669][E: codex-rs/analytics/src/client.rs:670][E: codex-rs/analytics/src/client.rs:671][E: codex-rs/analytics/src/client.rs:672][E: codex-rs/analytics/src/client.rs:673][E: codex-rs/analytics/src/client.rs:674]

## Reducer

`AnalyticsReducer` state 保存 requests、turns、connections、threads、tool_items_started_at_ms、pending_reviews 和 item_review_summaries；`ingest` dispatcher 按 fact kind 调用 initialize/client/server/error/notification/custom handlers。[E: codex-rs/analytics/src/reducer.rs:150][E: codex-rs/analytics/src/reducer.rs:151][E: codex-rs/analytics/src/reducer.rs:152][E: codex-rs/analytics/src/reducer.rs:153][E: codex-rs/analytics/src/reducer.rs:154][E: codex-rs/analytics/src/reducer.rs:155][E: codex-rs/analytics/src/reducer.rs:156][E: codex-rs/analytics/src/reducer.rs:157][E: codex-rs/analytics/src/reducer.rs:424][E: codex-rs/analytics/src/reducer.rs:425][E: codex-rs/analytics/src/reducer.rs:426][E: codex-rs/analytics/src/reducer.rs:441][E: codex-rs/analytics/src/reducer.rs:448][E: codex-rs/analytics/src/reducer.rs:459][E: codex-rs/analytics/src/reducer.rs:467][E: codex-rs/analytics/src/reducer.rs:470][E: codex-rs/analytics/src/reducer.rs:476][E: codex-rs/analytics/src/reducer.rs:500]

`ingest_initialize` 把 connection metadata 存入 `connections`；普通 thread start/resume/fork response 通过 `emit_thread_initialized` 写入 thread->connection 和 thread metadata，并 emit `ThreadInitialized` event。[E: codex-rs/analytics/src/reducer.rs:559][E: codex-rs/analytics/src/reducer.rs:567][E: codex-rs/analytics/src/reducer.rs:570][E: codex-rs/analytics/src/reducer.rs:579][E: codex-rs/analytics/src/reducer.rs:912][E: codex-rs/analytics/src/reducer.rs:913][E: codex-rs/analytics/src/reducer.rs:922][E: codex-rs/analytics/src/reducer.rs:933][E: codex-rs/analytics/src/reducer.rs:1349][E: codex-rs/analytics/src/reducer.rs:1363][E: codex-rs/analytics/src/reducer.rs:1373][E: codex-rs/analytics/src/reducer.rs:1377][E: codex-rs/analytics/src/reducer.rs:1378][E: codex-rs/analytics/src/reducer.rs:1380][E: codex-rs/analytics/src/reducer.rs:1382]

subagent thread started 没有独立 `TrackEventRequest` variant；reducer 把 `CustomAnalyticsFact::SubAgentThreadStarted` 转成 `TrackEventRequest::ThreadInitialized`，其 event params 设置 `thread_source: Some("subagent")`。[E: codex-rs/analytics/src/reducer.rs:584][E: codex-rs/analytics/src/reducer.rs:602][E: codex-rs/analytics/src/reducer.rs:610][E: codex-rs/analytics/src/reducer.rs:611][E: codex-rs/analytics/src/events.rs:1298][E: codex-rs/analytics/src/events.rs:1314]

request facts 保存 pending turn start/turn steer state；turn resolved config 和 token usage 更新 turn state 后调用 `maybe_emit_turn_event`。[E: codex-rs/analytics/src/reducer.rs:645][E: codex-rs/analytics/src/reducer.rs:646][E: codex-rs/analytics/src/reducer.rs:648][E: codex-rs/analytics/src/reducer.rs:654][E: codex-rs/analytics/src/reducer.rs:655][E: codex-rs/analytics/src/reducer.rs:657][E: codex-rs/analytics/src/reducer.rs:669][E: codex-rs/analytics/src/reducer.rs:674][E: codex-rs/analytics/src/reducer.rs:677][E: codex-rs/analytics/src/reducer.rs:680][E: codex-rs/analytics/src/reducer.rs:681][E: codex-rs/analytics/src/reducer.rs:684][E: codex-rs/analytics/src/reducer.rs:689][E: codex-rs/analytics/src/reducer.rs:692][E: codex-rs/analytics/src/reducer.rs:693]

skill invocation reducer 会尝试从 skill path 推导 git repo root/repo URL，并构造 `skill_invocation` event；app/hook/plugin reducers 分别构造 codex_app、codex_hook、codex_plugin event request。[E: codex-rs/analytics/src/reducer.rs:726][E: codex-rs/analytics/src/reducer.rs:734][E: codex-rs/analytics/src/reducer.rs:736][E: codex-rs/analytics/src/reducer.rs:748][E: codex-rs/analytics/src/reducer.rs:750][E: codex-rs/analytics/src/reducer.rs:769][E: codex-rs/analytics/src/reducer.rs:773][E: codex-rs/analytics/src/reducer.rs:789][E: codex-rs/analytics/src/reducer.rs:791][E: codex-rs/analytics/src/reducer.rs:797][E: codex-rs/analytics/src/reducer.rs:799][E: codex-rs/analytics/src/reducer.rs:830][E: codex-rs/analytics/src/reducer.rs:833][E: codex-rs/analytics/src/reducer.rs:848][E: codex-rs/analytics/src/reducer.rs:850]

## 设计动机与权衡

analytics 使用 fact reducer，而不是每个调用点直接 POST event，是为了让 thread/request/turn context 可以在 reducer 中统一补齐，并允许 queue 层做去重与 backpressure drop。[I] 该设计由 `AnalyticsFact`、`AnalyticsReducer` state 和 `AnalyticsEventsQueue` 共同体现。[E: codex-rs/analytics/src/facts.rs:364][E: codex-rs/analytics/src/facts.rs:406][E: codex-rs/analytics/src/facts.rs:409][E: codex-rs/analytics/src/reducer.rs:150][E: codex-rs/analytics/src/reducer.rs:157][E: codex-rs/analytics/src/client.rs:67][E: codex-rs/analytics/src/client.rs:69][E: codex-rs/analytics/src/client.rs:70][E: codex-rs/analytics/src/client.rs:133][E: codex-rs/analytics/src/client.rs:135][E: codex-rs/analytics/src/client.rs:137][E: codex-rs/analytics/src/client.rs:147][E: codex-rs/analytics/src/client.rs:158][E: codex-rs/analytics/src/client.rs:143][E: codex-rs/analytics/src/client.rs:169][E: codex-rs/analytics/src/client.rs:187]

analytics sender 对 API-key auth 采用 event-level allowlist，而对其它非 Codex-backend auth 采用整体拒绝；这让 plugin-attributed usage 可以在 API-key 模式发送，又不把全部 product analytics 开放给任意 auth mode。[I] 该结论由 auth 分支和三种允许的 event variants 支撑。[E: codex-rs/analytics/src/client.rs:608][E: codex-rs/analytics/src/client.rs:611][E: codex-rs/analytics/src/client.rs:613][E: codex-rs/analytics/src/events.rs:99][E: codex-rs/analytics/src/events.rs:101][E: codex-rs/analytics/src/events.rs:103]

## Gotchas

- analytics disabled config 会阻止 queue 创建；之后 `record_fact` 没有 queue 可发送，所以不是仅发送层丢弃。[E: codex-rs/analytics/src/client.rs:211][E: codex-rs/analytics/src/client.rs:219][E: codex-rs/analytics/src/client.rs:478][E: codex-rs/analytics/src/client.rs:479]
- plugin install failure 现在同时记录 `PluginInstallSource`（manual 或 external-agent migration）与 optional sub-error type。[E: codex-rs/analytics/src/facts.rs:496][E: codex-rs/analytics/src/facts.rs:498][E: codex-rs/analytics/src/facts.rs:503][E: codex-rs/analytics/src/facts.rs:505][E: codex-rs/analytics/src/facts.rs:507][E: codex-rs/analytics/src/client.rs:416][E: codex-rs/analytics/src/client.rs:419][E: codex-rs/analytics/src/client.rs:421]
- 如果没有 thread connection context，guardian 等事件可能被 reducer drop。[E: codex-rs/analytics/src/reducer.rs:294][E: codex-rs/analytics/src/reducer.rs:303]
- hook event/source mapping 使用固定字符串；hook status 只把 unexpected `Running` 归一化为 `Failed`，不是字符串 mapping。[E: codex-rs/analytics/src/events.rs:1241][E: codex-rs/analytics/src/events.rs:1250][E: codex-rs/analytics/src/events.rs:1251][E: codex-rs/analytics/src/events.rs:1252][E: codex-rs/analytics/src/events.rs:1256][E: codex-rs/analytics/src/events.rs:1272][E: codex-rs/analytics/src/events.rs:1280][E: codex-rs/analytics/src/events.rs:1281][E: codex-rs/analytics/src/events.rs:1331][E: codex-rs/analytics/src/events.rs:1334]

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
