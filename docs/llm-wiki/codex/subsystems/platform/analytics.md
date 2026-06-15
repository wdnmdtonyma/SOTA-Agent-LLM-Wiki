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
updated: 37aadeaa13
---

> `codex_analytics` 是 Codex 的 product analytics 管道：runtime 记录 `AnalyticsFact`，`AnalyticsReducer` 把 facts 转成 `TrackEventRequest`，queue 在后台消费并发送 events，HTTP sender 只在 ChatGPT auth、token 和 account id 都可用时 POST 到 `/codex/analytics-events/events`。[E: codex-rs/analytics/src/facts.rs:266][E: codex-rs/analytics/src/reducer.rs:157][E: codex-rs/analytics/src/client.rs:57][E: codex-rs/analytics/src/client.rs:61][E: codex-rs/analytics/src/client.rs:64][E: codex-rs/analytics/src/client.rs:312][E: codex-rs/analytics/src/client.rs:315][E: codex-rs/analytics/src/client.rs:318][E: codex-rs/analytics/src/client.rs:322][E: codex-rs/analytics/src/client.rs:327]

## 能回答的问题

- analytics fact 和 track event request 的区别是什么？
- queue 怎样做 app/plugin used 去重与满队列丢弃？
- subagent thread started 怎样复用 thread initialized event？
- reducer 怎样保存 connection/thread/request/turn state？
- analytics request 什么时候会因为 auth 或 config 被跳过？
- hooks、skills、plugins、turn config/tokens 怎样进入 analytics？

## Public exports 与数据模型

`lib.rs` re-export `AnalyticsEventsClient`、guardian/app/hook/skill/plugin/turn 相关 public input types、`TrackEventsContext` 和 `build_track_events_context`。[E: codex-rs/analytics/src/lib.rs:9][E: codex-rs/analytics/src/lib.rs:10][E: codex-rs/analytics/src/lib.rs:30][E: codex-rs/analytics/src/lib.rs:33][E: codex-rs/analytics/src/lib.rs:34][E: codex-rs/analytics/src/lib.rs:36][E: codex-rs/analytics/src/lib.rs:37][E: codex-rs/analytics/src/lib.rs:42][E: codex-rs/analytics/src/lib.rs:43]

`TrackEventRequest` variants 包括 SkillInvocation、ThreadInitialized、GuardianReview、AppMentioned、AppUsed、HookRun、Compaction、TurnEvent、TurnSteer、PluginUsed 和 plugin state changes。[E: codex-rs/analytics/src/events.rs:54][E: codex-rs/analytics/src/events.rs:55][E: codex-rs/analytics/src/events.rs:56][E: codex-rs/analytics/src/events.rs:57][E: codex-rs/analytics/src/events.rs:58][E: codex-rs/analytics/src/events.rs:59][E: codex-rs/analytics/src/events.rs:60][E: codex-rs/analytics/src/events.rs:61][E: codex-rs/analytics/src/events.rs:62][E: codex-rs/analytics/src/events.rs:63][E: codex-rs/analytics/src/events.rs:64][E: codex-rs/analytics/src/events.rs:65][E: codex-rs/analytics/src/events.rs:66][E: codex-rs/analytics/src/events.rs:67][E: codex-rs/analytics/src/events.rs:68] `TrackEventsRequest` 是批量发送 wrapper，字段是 `events: Vec<TrackEventRequest>`。[E: codex-rs/analytics/src/events.rs:48][E: codex-rs/analytics/src/events.rs:49]

`TrackEventsContext` 只包含 model_slug、thread_id 和 turn_id；builder 按入参构造这三个字段。[E: codex-rs/analytics/src/facts.rs:30][E: codex-rs/analytics/src/facts.rs:31][E: codex-rs/analytics/src/facts.rs:32][E: codex-rs/analytics/src/facts.rs:33][E: codex-rs/analytics/src/facts.rs:36][E: codex-rs/analytics/src/facts.rs:41][E: codex-rs/analytics/src/facts.rs:42][E: codex-rs/analytics/src/facts.rs:43][E: codex-rs/analytics/src/facts.rs:44]

`AnalyticsFact` 是内部 fact enum，顶层覆盖 Initialize、Request、Response、ErrorResponse、Notification 和 Custom；Custom facts 覆盖 SubAgentThreadStarted、Compaction、GuardianReview、TurnResolvedConfig、TurnTokenUsage、SkillInvoked、AppMentioned、AppUsed、HookRun、PluginUsed 和 PluginStateChanged。[E: codex-rs/analytics/src/facts.rs:266][E: codex-rs/analytics/src/facts.rs:267][E: codex-rs/analytics/src/facts.rs:274][E: codex-rs/analytics/src/facts.rs:279][E: codex-rs/analytics/src/facts.rs:283][E: codex-rs/analytics/src/facts.rs:289][E: codex-rs/analytics/src/facts.rs:292][E: codex-rs/analytics/src/facts.rs:295][E: codex-rs/analytics/src/facts.rs:296][E: codex-rs/analytics/src/facts.rs:297][E: codex-rs/analytics/src/facts.rs:298][E: codex-rs/analytics/src/facts.rs:299][E: codex-rs/analytics/src/facts.rs:300][E: codex-rs/analytics/src/facts.rs:301][E: codex-rs/analytics/src/facts.rs:302][E: codex-rs/analytics/src/facts.rs:303][E: codex-rs/analytics/src/facts.rs:304][E: codex-rs/analytics/src/facts.rs:305][E: codex-rs/analytics/src/facts.rs:306]

## Queue 与 client

queue 常量包括 256 的 channel size、10 秒 HTTP request timeout 和 4096 的 dedupe key 上限；10 秒 timeout 用在 HTTP POST，不是 `try_send` timeout。[E: codex-rs/analytics/src/client.rs:39][E: codex-rs/analytics/src/client.rs:40][E: codex-rs/analytics/src/client.rs:41][E: codex-rs/analytics/src/client.rs:58][E: codex-rs/analytics/src/client.rs:74][E: codex-rs/analytics/src/client.rs:332] `AnalyticsEventsQueue::new` 创建 mpsc channel，spawn background task，task 从 receiver 取 fact、交给 reducer、然后调用 `send_track_events`。[E: codex-rs/analytics/src/client.rs:57][E: codex-rs/analytics/src/client.rs:58][E: codex-rs/analytics/src/client.rs:59][E: codex-rs/analytics/src/client.rs:60][E: codex-rs/analytics/src/client.rs:61][E: codex-rs/analytics/src/client.rs:63][E: codex-rs/analytics/src/client.rs:64]

`try_send` 在 queue 满时 drop fact 并记录 warning；不会阻塞 caller。[E: codex-rs/analytics/src/client.rs:74][E: codex-rs/analytics/src/client.rs:75][E: codex-rs/analytics/src/client.rs:77] app used 去重 key 是 `(turn_id, connector_id)`，plugin used 去重 key 是 `(turn_id, plugin_id.as_key())`；dedupe set 达到上限会 clear。[E: codex-rs/analytics/src/client.rs:81][E: codex-rs/analytics/src/client.rs:86][E: codex-rs/analytics/src/client.rs:93][E: codex-rs/analytics/src/client.rs:94][E: codex-rs/analytics/src/client.rs:96][E: codex-rs/analytics/src/client.rs:99][E: codex-rs/analytics/src/client.rs:108][E: codex-rs/analytics/src/client.rs:109][E: codex-rs/analytics/src/client.rs:111]

`AnalyticsEventsClient` 提供 track_* methods，把输入包装成对应 `AnalyticsFact`；`record_fact` 在 `analytics_enabled == Some(false)` 时直接返回，否则调用 queue `try_send`。[E: codex-rs/analytics/src/client.rs:127][E: codex-rs/analytics/src/client.rs:143][E: codex-rs/analytics/src/client.rs:159][E: codex-rs/analytics/src/client.rs:201][E: codex-rs/analytics/src/client.rs:207][E: codex-rs/analytics/src/client.rs:222][E: codex-rs/analytics/src/client.rs:270][E: codex-rs/analytics/src/client.rs:271][E: codex-rs/analytics/src/client.rs:274]

## HTTP 发送

`send_track_events` 对空 events 直接返回；缺少 auth、非 ChatGPT auth、token 获取失败或缺少 account id 都会跳过发送。[E: codex-rs/analytics/src/client.rs:309][E: codex-rs/analytics/src/client.rs:310][E: codex-rs/analytics/src/client.rs:312][E: codex-rs/analytics/src/client.rs:313][E: codex-rs/analytics/src/client.rs:315][E: codex-rs/analytics/src/client.rs:316][E: codex-rs/analytics/src/client.rs:318][E: codex-rs/analytics/src/client.rs:320][E: codex-rs/analytics/src/client.rs:322][E: codex-rs/analytics/src/client.rs:323] request URL 是 `${base_url}/codex/analytics-events/events`，POST 携带 bearer token、`chatgpt-account-id` header、JSON content type 和 `TrackEventsRequest` payload。[E: codex-rs/analytics/src/client.rs:326][E: codex-rs/analytics/src/client.rs:327][E: codex-rs/analytics/src/client.rs:328][E: codex-rs/analytics/src/client.rs:330][E: codex-rs/analytics/src/client.rs:331][E: codex-rs/analytics/src/client.rs:332][E: codex-rs/analytics/src/client.rs:333][E: codex-rs/analytics/src/client.rs:334][E: codex-rs/analytics/src/client.rs:335][E: codex-rs/analytics/src/client.rs:336][E: codex-rs/analytics/src/client.rs:337]

## Reducer

`AnalyticsReducer` state 保存 requests、turns、connections、thread_connections 和 thread_metadata；`ingest` dispatcher 按 fact kind 调用 initialize/request/response/error/notification/custom handlers。[E: codex-rs/analytics/src/reducer.rs:73][E: codex-rs/analytics/src/reducer.rs:74][E: codex-rs/analytics/src/reducer.rs:75][E: codex-rs/analytics/src/reducer.rs:76][E: codex-rs/analytics/src/reducer.rs:77][E: codex-rs/analytics/src/reducer.rs:78][E: codex-rs/analytics/src/reducer.rs:157][E: codex-rs/analytics/src/reducer.rs:158][E: codex-rs/analytics/src/reducer.rs:166][E: codex-rs/analytics/src/reducer.rs:179][E: codex-rs/analytics/src/reducer.rs:185][E: codex-rs/analytics/src/reducer.rs:193][E: codex-rs/analytics/src/reducer.rs:196][E: codex-rs/analytics/src/reducer.rs:198]

`ingest_initialize` 把 connection metadata 存入 `connections`；普通 thread start/resume/fork response 通过 `emit_thread_initialized` 写入 thread->connection 和 thread metadata，并 emit `ThreadInitialized` event。[E: codex-rs/analytics/src/reducer.rs:236][E: codex-rs/analytics/src/reducer.rs:244][E: codex-rs/analytics/src/reducer.rs:247][E: codex-rs/analytics/src/reducer.rs:256][E: codex-rs/analytics/src/reducer.rs:492][E: codex-rs/analytics/src/reducer.rs:501][E: codex-rs/analytics/src/reducer.rs:510][E: codex-rs/analytics/src/reducer.rs:663][E: codex-rs/analytics/src/reducer.rs:673][E: codex-rs/analytics/src/reducer.rs:676][E: codex-rs/analytics/src/reducer.rs:678][E: codex-rs/analytics/src/reducer.rs:680][E: codex-rs/analytics/src/reducer.rs:682][E: codex-rs/analytics/src/reducer.rs:684]

subagent thread started 没有独立 `TrackEventRequest` variant；reducer 把 `CustomAnalyticsFact::SubAgentThreadStarted` 转成 `TrackEventRequest::ThreadInitialized`，其 event params 设置 `thread_source: Some("subagent")`。[E: codex-rs/analytics/src/reducer.rs:199][E: codex-rs/analytics/src/reducer.rs:261][E: codex-rs/analytics/src/reducer.rs:266][E: codex-rs/analytics/src/reducer.rs:267][E: codex-rs/analytics/src/events.rs:703][E: codex-rs/analytics/src/events.rs:718][E: codex-rs/analytics/src/events.rs:727]

request facts 保存 pending turn start/turn steer state；turn resolved config 和 token usage 更新 turn state 后调用 `maybe_emit_turn_event`。[E: codex-rs/analytics/src/reducer.rs:307][E: codex-rs/analytics/src/reducer.rs:315][E: codex-rs/analytics/src/reducer.rs:317][E: codex-rs/analytics/src/reducer.rs:323][E: codex-rs/analytics/src/reducer.rs:326][E: codex-rs/analytics/src/reducer.rs:338][E: codex-rs/analytics/src/reducer.rs:356][E: codex-rs/analytics/src/reducer.rs:358][E: codex-rs/analytics/src/reducer.rs:359][E: codex-rs/analytics/src/reducer.rs:362][E: codex-rs/analytics/src/reducer.rs:378][E: codex-rs/analytics/src/reducer.rs:379][E: codex-rs/analytics/src/reducer.rs:380]

skill invocation reducer 会尝试从 skill path 推导 git repo root/repo URL，并构造 `skill_invocation` event；app/hook/plugin reducers 分别构造 codex_app、codex_hook、codex_plugin event request。[E: codex-rs/analytics/src/reducer.rs:383][E: codex-rs/analytics/src/reducer.rs:399][E: codex-rs/analytics/src/reducer.rs:401][E: codex-rs/analytics/src/reducer.rs:413][E: codex-rs/analytics/src/reducer.rs:415][E: codex-rs/analytics/src/reducer.rs:431][E: codex-rs/analytics/src/reducer.rs:445][E: codex-rs/analytics/src/reducer.rs:453][E: codex-rs/analytics/src/reducer.rs:459][E: codex-rs/analytics/src/reducer.rs:467][E: codex-rs/analytics/src/reducer.rs:477]

## 设计动机与权衡

analytics 使用 fact reducer，而不是每个调用点直接 POST event，是为了让 thread/request/turn context 可以在 reducer 中统一补齐，并允许 queue 层做去重与 backpressure drop。[I] 该设计由 `AnalyticsFact`、`AnalyticsReducer` state 和 `AnalyticsEventsQueue` 共同体现。[E: codex-rs/analytics/src/facts.rs:266][E: codex-rs/analytics/src/reducer.rs:73][E: codex-rs/analytics/src/client.rs:57][E: codex-rs/analytics/src/client.rs:74]

analytics sender 要求 ChatGPT account context，说明 product analytics 与用户/account session 绑定，而不是通用 OTEL-style exporter。[I] 该结论由 `send_track_events` 的 ChatGPT auth、token 和 account id checks 支撑。[E: codex-rs/analytics/src/client.rs:312][E: codex-rs/analytics/src/client.rs:315][E: codex-rs/analytics/src/client.rs:318][E: codex-rs/analytics/src/client.rs:322]

## Gotchas

- analytics disabled config 会在 `record_fact` 层跳过 fact，不只是发送层丢弃。[E: codex-rs/analytics/src/client.rs:270][E: codex-rs/analytics/src/client.rs:271]
- 如果没有 thread connection context，guardian 等事件可能被 reducer drop。[E: codex-rs/analytics/src/reducer.rs:276][E: codex-rs/analytics/src/reducer.rs:285]
- hook event/source mapping 使用固定字符串；hook status 只把 unexpected `Running` 归一化为 `Failed`，不是字符串 mapping。[E: codex-rs/analytics/src/events.rs:669][E: codex-rs/analytics/src/events.rs:671][E: codex-rs/analytics/src/events.rs:680][E: codex-rs/analytics/src/events.rs:682][E: codex-rs/analytics/src/events.rs:751][E: codex-rs/analytics/src/events.rs:754][E: codex-rs/analytics/src/events.rs:755]

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
