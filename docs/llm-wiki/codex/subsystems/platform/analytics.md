---
id: subsys.platform.analytics
title: Analytics
kind: subsystem
tier: T2
source: [codex-rs/analytics/src/lib.rs, codex-rs/analytics/src/events.rs, codex-rs/analytics/src/client.rs, codex-rs/analytics/src/facts.rs, codex-rs/analytics/src/reducer.rs, codex-rs/core/src/tools/code_mode/telemetry.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/image_preparation.rs, codex-rs/app-server/src/outgoing_message.rs, codex-rs/ext/image-generation/src/backend.rs, codex-rs/ext/image-generation/src/tool.rs]
symbols: [AnalyticsEventsClient, AnalyticsEventsQueue, AnalyticsFact, CodeModeToolCallFact, CodeModeToolCallStatus, ImagePreparationFact, ImagePreparationMetadata, TrackEventRequest, AnalyticsReducer, CodeModeToolCallGuard, build_track_events_context]
related: [subsys.platform.telemetry-otel, subsys.config-auth.auth-flows, subsys.core.code-mode-runtime, tool.code-mode-exec, tool.code-mode-wait, tool.image-generation, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> `codex_analytics` 是 Codex 的 product analytics 管道：runtime 记录 `AnalyticsFact`，`AnalyticsReducer` 把 facts 转成 `TrackEventRequest`，queue 在后台消费并发送 events；Codex-backend auth 可发送正常事件，API-key auth 只保留带 plugin identity 的 plugin/skill/MCP 子集，再用 auth provider headers POST 到 configured analytics URL。[E: codex-rs/analytics/src/facts.rs:474][E: codex-rs/analytics/src/reducer.rs:163][E: codex-rs/analytics/src/client.rs:150][E: codex-rs/analytics/src/client.rs:153][E: codex-rs/analytics/src/client.rs:690][E: codex-rs/analytics/src/client.rs:699][E: codex-rs/analytics/src/client.rs:699][E: codex-rs/analytics/src/client.rs:703][E: codex-rs/analytics/src/events.rs:103][E: codex-rs/analytics/src/events.rs:105][E: codex-rs/analytics/src/events.rs:107][E: codex-rs/analytics/src/client.rs:847][E: codex-rs/analytics/src/client.rs:851]

## 能回答的问题

- analytics fact 和 track event request 的区别是什么？
- queue 怎样做 app/plugin used 去重与满队列丢弃？
- subagent thread started 怎样复用 thread initialized event？
- reducer 怎样保存 connection/thread/request/turn state？
- analytics request 什么时候会因为 auth、backend capability 或 config 被跳过？
- hooks、skills、plugins、turn config/tokens 怎样进入 analytics？

## Public exports 与数据模型

`lib.rs` re-export `AnalyticsEventsClient`、guardian/app/hook/skill/plugin/turn 相关 public input types、`TrackEventsContext` 和 `build_track_events_context`。[E: codex-rs/analytics/src/lib.rs:14][E: codex-rs/analytics/src/lib.rs:16][E: codex-rs/analytics/src/lib.rs:19][E: codex-rs/analytics/src/lib.rs:28][E: codex-rs/analytics/src/lib.rs:33][E: codex-rs/analytics/src/lib.rs:46][E: codex-rs/analytics/src/lib.rs:56][E: codex-rs/analytics/src/lib.rs:59][E: codex-rs/analytics/src/lib.rs:61][E: codex-rs/analytics/src/lib.rs:70]

`TrackEventRequest` variants 覆盖 skill/thread/guardian/app mentioned/app used/hook/compaction/goal/turn、command/file/tool/web/image/accepted-line/review、plugin used/install-requested/state/install failure，以及 external-agent import completed/failure events；`TrackEventsRequest` 是批量发送 wrapper，字段是 `events: Vec<TrackEventRequest>`。[E: codex-rs/analytics/src/events.rs:57][E: codex-rs/analytics/src/events.rs:60][E: codex-rs/analytics/src/events.rs:65][E: codex-rs/analytics/src/events.rs:66][E: codex-rs/analytics/src/events.rs:67][E: codex-rs/analytics/src/events.rs:68][E: codex-rs/analytics/src/events.rs:69][E: codex-rs/analytics/src/events.rs:70][E: codex-rs/analytics/src/events.rs:71][E: codex-rs/analytics/src/events.rs:72][E: codex-rs/analytics/src/events.rs:73][E: codex-rs/analytics/src/events.rs:74][E: codex-rs/analytics/src/events.rs:75][E: codex-rs/analytics/src/events.rs:76][E: codex-rs/analytics/src/events.rs:77][E: codex-rs/analytics/src/events.rs:78][E: codex-rs/analytics/src/events.rs:79][E: codex-rs/analytics/src/events.rs:80][E: codex-rs/analytics/src/events.rs:81][E: codex-rs/analytics/src/events.rs:82][E: codex-rs/analytics/src/events.rs:83][E: codex-rs/analytics/src/events.rs:86][E: codex-rs/analytics/src/events.rs:87][E: codex-rs/analytics/src/events.rs:88][E: codex-rs/analytics/src/events.rs:89][E: codex-rs/analytics/src/events.rs:90][E: codex-rs/analytics/src/events.rs:91][E: codex-rs/analytics/src/events.rs:92][E: codex-rs/analytics/src/events.rs:93][E: codex-rs/analytics/src/events.rs:94][E: codex-rs/analytics/src/events.rs:95]

`TrackEventsContext` 包含 model_slug、thread_id、turn_id 和 product_client_id；builder 按入参构造这四个字段。[E: codex-rs/analytics/src/facts.rs:44][E: codex-rs/analytics/src/facts.rs:44][E: codex-rs/analytics/src/facts.rs:47][E: codex-rs/analytics/src/facts.rs:48][E: codex-rs/analytics/src/facts.rs:49][E: codex-rs/analytics/src/facts.rs:97][E: codex-rs/analytics/src/facts.rs:98][E: codex-rs/analytics/src/facts.rs:99][E: codex-rs/analytics/src/facts.rs:100][E: codex-rs/analytics/src/facts.rs:101][E: codex-rs/analytics/src/facts.rs:102][E: codex-rs/analytics/src/facts.rs:102][E: codex-rs/analytics/src/facts.rs:102][E: codex-rs/analytics/src/facts.rs:106][E: codex-rs/analytics/src/facts.rs:107]

`AnalyticsFact` 是内部 fact enum，顶层覆盖 Initialize、ClientRequest、ClientResponse、ErrorResponse、ServerRequest、ServerResponse、EffectivePermissionsApprovalResponse、ServerRequestAborted、Notification 和 Custom；Custom facts 覆盖 subagent、compaction、goal、guardian、turn config/token/profile/error、skill/app/hook/plugin、plugin install failure 和 external-agent import events。[E: codex-rs/analytics/src/facts.rs:474][E: codex-rs/analytics/src/facts.rs:475][E: codex-rs/analytics/src/facts.rs:482][E: codex-rs/analytics/src/facts.rs:493][E: codex-rs/analytics/src/facts.rs:498][E: codex-rs/analytics/src/facts.rs:505][E: codex-rs/analytics/src/facts.rs:508][E: codex-rs/analytics/src/facts.rs:513][E: codex-rs/analytics/src/facts.rs:518][E: codex-rs/analytics/src/facts.rs:522][E: codex-rs/analytics/src/facts.rs:525][E: codex-rs/analytics/src/facts.rs:528][E: codex-rs/analytics/src/facts.rs:530][E: codex-rs/analytics/src/facts.rs:531][E: codex-rs/analytics/src/facts.rs:535][E: codex-rs/analytics/src/facts.rs:537][E: codex-rs/analytics/src/facts.rs:546][E: codex-rs/analytics/src/facts.rs:547][E: codex-rs/analytics/src/facts.rs:548]

## Queue 与 client

queue 常量包括 256 的 channel size、10 秒 HTTP request timeout 和 4096 的 dedupe key 上限；10 秒 timeout 用在 HTTP POST，不是 `try_send` timeout。[E: codex-rs/analytics/src/client.rs:73][E: codex-rs/analytics/src/client.rs:74][E: codex-rs/analytics/src/client.rs:77][E: codex-rs/analytics/src/client.rs:153][E: codex-rs/analytics/src/client.rs:179][E: codex-rs/analytics/src/client.rs:850] `AnalyticsEventsQueue::new` 创建 mpsc channel，spawn background task，task 从 receiver 取 fact、交给 reducer、然后调用 `send_track_events`。[E: codex-rs/analytics/src/client.rs:150][E: codex-rs/analytics/src/client.rs:153][E: codex-rs/analytics/src/client.rs:154][E: codex-rs/analytics/src/client.rs:154][E: codex-rs/analytics/src/client.rs:168][E: codex-rs/analytics/src/client.rs:169]

`try_send` 在 queue 满时 drop fact 并记录 warning；不会阻塞 caller。[E: codex-rs/analytics/src/client.rs:179][E: codex-rs/analytics/src/client.rs:164][E: codex-rs/analytics/src/client.rs:186] app used 去重 key 是 `(turn_id, connector_id)`，plugin used 去重 key 优先使用 `(turn_id, plugin_id.as_key())`，否则使用 `(turn_id, remote_plugin_id)`；dedupe set 达到上限会 clear。[E: codex-rs/analytics/src/client.rs:190][E: codex-rs/analytics/src/client.rs:192][E: codex-rs/analytics/src/client.rs:202][E: codex-rs/analytics/src/client.rs:202][E: codex-rs/analytics/src/client.rs:205][E: codex-rs/analytics/src/client.rs:208][E: codex-rs/analytics/src/client.rs:217][E: codex-rs/analytics/src/client.rs:220][E: codex-rs/analytics/src/client.rs:221][E: codex-rs/analytics/src/client.rs:222][E: codex-rs/analytics/src/client.rs:223][E: codex-rs/analytics/src/client.rs:224][E: codex-rs/analytics/src/client.rs:228]

`AnalyticsEventsClient` 提供 track_* methods，把输入包装成对应 `AnalyticsFact`；`record_fact` 只有在 queue 存在时调用 queue `try_send`，而 queue 会在 `analytics_enabled == Some(false)` 时不创建。[E: codex-rs/analytics/src/client.rs:232][E: codex-rs/analytics/src/client.rs:240][E: codex-rs/analytics/src/client.rs:274][E: codex-rs/analytics/src/client.rs:282][E: codex-rs/analytics/src/client.rs:294][E: codex-rs/analytics/src/client.rs:562][E: codex-rs/analytics/src/client.rs:562][E: codex-rs/analytics/src/client.rs:562]

## HTTP 发送

`send_track_events` 对空 events 或缺少 auth 直接返回；API-key auth 通过 `TrackEventRequest::can_send_with_api_key_auth` 过滤事件，非 API-key 且非 Codex-backend auth 则整体跳过，过滤后的 events 再按 isolated request 规则拆 batch。[E: codex-rs/analytics/src/client.rs:690][E: codex-rs/analytics/src/client.rs:695][E: codex-rs/analytics/src/client.rs:699][E: codex-rs/analytics/src/client.rs:699][E: codex-rs/analytics/src/client.rs:703][E: codex-rs/analytics/src/client.rs:704][E: codex-rs/analytics/src/client.rs:706][E: codex-rs/analytics/src/client.rs:711][E: codex-rs/analytics/src/events.rs:103][E: codex-rs/analytics/src/events.rs:105][E: codex-rs/analytics/src/events.rs:108] request URL 来自 `AnalyticsEventsDestination::Http { url }`，POST 携带 `auth_provider_from_auth(auth).to_auth_headers()`、JSON content type 和 `TrackEventsRequest` payload。[E: codex-rs/analytics/src/client.rs:825][E: codex-rs/analytics/src/client.rs:836][E: codex-rs/analytics/src/client.rs:841][E: codex-rs/analytics/src/client.rs:841][E: codex-rs/analytics/src/client.rs:847][E: codex-rs/analytics/src/client.rs:849][E: codex-rs/analytics/src/client.rs:850][E: codex-rs/analytics/src/client.rs:851][E: codex-rs/analytics/src/client.rs:852][E: codex-rs/analytics/src/client.rs:853]

## Reducer

`AnalyticsReducer` state 保存 requests、turns、connections、threads、tool_items_started_at_ms、pending_reviews 和 item_review_summaries；`ingest` dispatcher 按 fact kind 调用 initialize/client/server/error/notification/custom handlers。[E: codex-rs/analytics/src/reducer.rs:163][E: codex-rs/analytics/src/reducer.rs:164][E: codex-rs/analytics/src/reducer.rs:165][E: codex-rs/analytics/src/reducer.rs:166][E: codex-rs/analytics/src/reducer.rs:167][E: codex-rs/analytics/src/reducer.rs:168][E: codex-rs/analytics/src/reducer.rs:171][E: codex-rs/analytics/src/reducer.rs:172][E: codex-rs/analytics/src/reducer.rs:465][E: codex-rs/analytics/src/reducer.rs:466][E: codex-rs/analytics/src/reducer.rs:467][E: codex-rs/analytics/src/reducer.rs:491][E: codex-rs/analytics/src/reducer.rs:513][E: codex-rs/analytics/src/reducer.rs:524][E: codex-rs/analytics/src/reducer.rs:532][E: codex-rs/analytics/src/reducer.rs:534][E: codex-rs/analytics/src/reducer.rs:541][E: codex-rs/analytics/src/reducer.rs:565]

`ingest_initialize` 把 connection metadata 存入 `connections`；普通 thread start/resume/fork response 通过 `emit_thread_initialized` 写入 thread->connection 和 thread metadata，并 emit `ThreadInitialized` event。[E: codex-rs/analytics/src/reducer.rs:990][E: codex-rs/analytics/src/reducer.rs:999][E: codex-rs/analytics/src/reducer.rs:1002][E: codex-rs/analytics/src/reducer.rs:1011][E: codex-rs/analytics/src/reducer.rs:1353][E: codex-rs/analytics/src/reducer.rs:1354][E: codex-rs/analytics/src/reducer.rs:1363][E: codex-rs/analytics/src/reducer.rs:1374][E: codex-rs/analytics/src/reducer.rs:1864][E: codex-rs/analytics/src/reducer.rs:1877][E: codex-rs/analytics/src/reducer.rs:1888][E: codex-rs/analytics/src/reducer.rs:1892][E: codex-rs/analytics/src/reducer.rs:1893][E: codex-rs/analytics/src/reducer.rs:1895][E: codex-rs/analytics/src/reducer.rs:1897]

subagent thread started 没有独立 `TrackEventRequest` variant；reducer 把 `CustomAnalyticsFact::SubAgentThreadStarted` 转成 `TrackEventRequest::ThreadInitialized`，其 event params 设置 `thread_source: Some("subagent")`。[E: codex-rs/analytics/src/reducer.rs:1015][E: codex-rs/analytics/src/reducer.rs:1034][E: codex-rs/analytics/src/reducer.rs:1040][E: codex-rs/analytics/src/reducer.rs:1040][E: codex-rs/analytics/src/events.rs:1341][E: codex-rs/analytics/src/events.rs:1357]

request facts 保存 pending turn start/turn steer state；turn resolved config 和 token usage 更新 turn state 后调用 `maybe_emit_turn_event`。[E: codex-rs/analytics/src/reducer.rs:1077][E: codex-rs/analytics/src/reducer.rs:1078][E: codex-rs/analytics/src/reducer.rs:1080][E: codex-rs/analytics/src/reducer.rs:1086][E: codex-rs/analytics/src/reducer.rs:1087][E: codex-rs/analytics/src/reducer.rs:1089][E: codex-rs/analytics/src/reducer.rs:1105][E: codex-rs/analytics/src/reducer.rs:1110][E: codex-rs/analytics/src/reducer.rs:1113][E: codex-rs/analytics/src/reducer.rs:1116][E: codex-rs/analytics/src/reducer.rs:1117][E: codex-rs/analytics/src/reducer.rs:1120][E: codex-rs/analytics/src/reducer.rs:1120][E: codex-rs/analytics/src/reducer.rs:1128][E: codex-rs/analytics/src/reducer.rs:1129]

skill invocation reducer 会尝试从 skill path 推导 git repo root/repo URL，并构造 `skill_invocation` event；app/hook/plugin reducers 分别构造 codex_app、codex_hook、codex_plugin event request。[E: codex-rs/analytics/src/reducer.rs:1167][E: codex-rs/analytics/src/reducer.rs:1175][E: codex-rs/analytics/src/reducer.rs:1177][E: codex-rs/analytics/src/reducer.rs:1189][E: codex-rs/analytics/src/reducer.rs:1191][E: codex-rs/analytics/src/reducer.rs:1208][E: codex-rs/analytics/src/reducer.rs:1214][E: codex-rs/analytics/src/reducer.rs:1230][E: codex-rs/analytics/src/reducer.rs:1232][E: codex-rs/analytics/src/reducer.rs:1238][E: codex-rs/analytics/src/reducer.rs:1240][E: codex-rs/analytics/src/reducer.rs:1271][E: codex-rs/analytics/src/reducer.rs:1274][E: codex-rs/analytics/src/reducer.rs:1283][E: codex-rs/analytics/src/reducer.rs:1291]

## Code Mode 与 response correlation

`CodeModeToolCallFact` 给 reducer 提供 cell started/child started/cell closed/sampling response completed/tool completed 五类 lifecycle facts；terminal status 明确区分 completed、failed、interrupted。[E: codex-rs/analytics/src/facts.rs:50][E: codex-rs/analytics/src/facts.rs:65][E: codex-rs/analytics/src/facts.rs:71][E: codex-rs/analytics/src/facts.rs:77][E: codex-rs/analytics/src/facts.rs:89]

Code Mode runtime 使用 RAII guard：默认 terminal status 为 interrupted，正常返回时显式改成 completed/failed，Drop 必然发出 completed fact；sampling `response.completed` 再把 response id 与该轮 tool call ids 关联。[E: codex-rs/core/src/tools/code_mode/telemetry.rs:20][E: codex-rs/core/src/tools/code_mode/telemetry.rs:38][E: codex-rs/core/src/tools/code_mode/telemetry.rs:42][E: codex-rs/core/src/tools/code_mode/telemetry.rs:72][E: codex-rs/core/src/session/turn.rs:2574][E: codex-rs/core/src/session/turn.rs:2582][E: codex-rs/core/src/session/turn.rs:2586]

Reducer 维护 call→response、child call→cell 与 cell→parent/response state，把 `cell_id`、`parent_call_id`、originating/subsequent response ids 补到 tool events。每类 correlation map/pending queue 上限 256；pending 满时先 flush oldest，避免无界等待下一次 sampling response。[E: codex-rs/analytics/src/events.rs:547][E: codex-rs/analytics/src/events.rs:556][E: codex-rs/analytics/src/events.rs:559][E: codex-rs/analytics/src/reducer.rs:160][E: codex-rs/analytics/src/reducer.rs:169][E: codex-rs/analytics/src/reducer.rs:406][E: codex-rs/analytics/src/reducer.rs:804][E: codex-rs/analytics/src/reducer.rs:852][E: codex-rs/analytics/src/reducer.rs:953]

## Image preparation 与 interrupt attribution

每个成功 decode 的 image preparation 会记录 message role 或 tool item id、effective detail、source/prepared dimensions；session 在 durable history boundary 完成 copy-on-write preparation，逐项记 analytics，然后才 persist rollout 与发送 raw items。[E: codex-rs/analytics/src/facts.rs:141][E: codex-rs/analytics/src/facts.rs:142][E: codex-rs/analytics/src/facts.rs:144][E: codex-rs/analytics/src/facts.rs:152][E: codex-rs/core/src/session/mod.rs:3100][E: codex-rs/core/src/session/mod.rs:3104][E: codex-rs/core/src/session/mod.rs:3163][E: codex-rs/core/src/session/mod.rs:3174][E: codex-rs/core/src/session/mod.rs:3182]

Turn event 因此携带 `image_preparations` 和首个成功 explicit interrupt 请求时间；app-server 在 notification fan-out 前按引用交给 analytics，而 analytics client 只 clone 其关心的 notification variants。[E: codex-rs/analytics/src/events.rs:933][E: codex-rs/analytics/src/events.rs:941][E: codex-rs/analytics/src/client.rs:339][E: codex-rs/analytics/src/client.rs:345][E: codex-rs/app-server/src/outgoing_message.rs:161][E: codex-rs/app-server/src/outgoing_message.rs:164][E: codex-rs/analytics/src/client.rs:672]

Image generation backend 另以 `x-codex-image-turn-id` 携带 tool call 的 turn id；它是 request correlation header，不等同于上面的 image-preparation analytics fact。[E: codex-rs/ext/image-generation/src/backend.rs:12][E: codex-rs/ext/image-generation/src/backend.rs:49][E: codex-rs/ext/image-generation/src/backend.rs:65][E: codex-rs/ext/image-generation/src/backend.rs:81][E: codex-rs/ext/image-generation/src/tool.rs:160]

## 设计动机与权衡

analytics 使用 fact reducer，而不是每个调用点直接 POST event，是为了让 thread/request/turn context 可以在 reducer 中统一补齐，并允许 queue 层做去重与 backpressure drop。[I] 该设计由 `AnalyticsFact`、`AnalyticsReducer` state 和 `AnalyticsEventsQueue` 共同体现。[E: codex-rs/analytics/src/facts.rs:474][E: codex-rs/analytics/src/facts.rs:522][E: codex-rs/analytics/src/facts.rs:525][E: codex-rs/analytics/src/reducer.rs:163][E: codex-rs/analytics/src/reducer.rs:172][E: codex-rs/analytics/src/client.rs:85][E: codex-rs/analytics/src/client.rs:87][E: codex-rs/analytics/src/client.rs:87][E: codex-rs/analytics/src/client.rs:150][E: codex-rs/analytics/src/client.rs:153][E: codex-rs/analytics/src/client.rs:154][E: codex-rs/analytics/src/client.rs:168][E: codex-rs/analytics/src/client.rs:179][E: codex-rs/analytics/src/client.rs:164][E: codex-rs/analytics/src/client.rs:190][E: codex-rs/analytics/src/client.rs:208]

analytics sender 对 API-key auth 采用 event-level allowlist，而对其它非 Codex-backend auth 采用整体拒绝；这让 plugin-attributed usage 可以在 API-key 模式发送，又不把全部 product analytics 开放给任意 auth mode。[I] 该结论由 auth 分支和三种允许的 event variants 支撑。[E: codex-rs/analytics/src/client.rs:699][E: codex-rs/analytics/src/client.rs:699][E: codex-rs/analytics/src/client.rs:704][E: codex-rs/analytics/src/events.rs:103][E: codex-rs/analytics/src/events.rs:105][E: codex-rs/analytics/src/events.rs:107]

## Gotchas

- analytics disabled config 会阻止 queue 创建；之后 `record_fact` 没有 queue 可发送，所以不是仅发送层丢弃。[E: codex-rs/analytics/src/client.rs:232][E: codex-rs/analytics/src/client.rs:240][E: codex-rs/analytics/src/client.rs:562][E: codex-rs/analytics/src/client.rs:562]
- plugin install failure 现在同时记录 `PluginInstallSource`（manual 或 external-agent migration）与 optional sub-error type。[E: codex-rs/analytics/src/facts.rs:615][E: codex-rs/analytics/src/facts.rs:617][E: codex-rs/analytics/src/facts.rs:622][E: codex-rs/analytics/src/facts.rs:622][E: codex-rs/analytics/src/facts.rs:626][E: codex-rs/analytics/src/client.rs:501][E: codex-rs/analytics/src/client.rs:503][E: codex-rs/analytics/src/client.rs:503]
- 如果没有 thread connection context，guardian 等事件可能被 reducer drop。[E: codex-rs/analytics/src/reducer.rs:309][E: codex-rs/analytics/src/reducer.rs:314]
- hook event/source mapping 使用固定字符串；hook status 只把 unexpected `Running` 归一化为 `Failed`，不是字符串 mapping。[E: codex-rs/analytics/src/events.rs:1284][E: codex-rs/analytics/src/events.rs:1293][E: codex-rs/analytics/src/events.rs:1294][E: codex-rs/analytics/src/events.rs:1295][E: codex-rs/analytics/src/events.rs:1296][E: codex-rs/analytics/src/events.rs:1315][E: codex-rs/analytics/src/events.rs:1323][E: codex-rs/analytics/src/events.rs:1324][E: codex-rs/analytics/src/events.rs:1374][E: codex-rs/analytics/src/events.rs:1376]

## Sources

- `codex-rs/analytics/src/lib.rs`
- `codex-rs/analytics/src/events.rs`
- `codex-rs/analytics/src/client.rs`
- `codex-rs/analytics/src/facts.rs`
- `codex-rs/analytics/src/reducer.rs`
- `codex-rs/core/src/tools/code_mode/telemetry.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/image_preparation.rs`
- `codex-rs/app-server/src/outgoing_message.rs`
- `codex-rs/ext/image-generation/src/backend.rs`
- `codex-rs/ext/image-generation/src/tool.rs`

## 相关

- `subsys.platform.telemetry-otel`: metrics/tracing/logging exporter 管道。
- `subsys.config-auth.auth-flows`: analytics 发送依赖 ChatGPT auth。
- `config.storage-telemetry-misc`: analytics 开关配置入口。
