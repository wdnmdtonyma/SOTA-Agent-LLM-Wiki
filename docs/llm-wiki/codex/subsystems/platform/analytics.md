---
id: subsys.platform.analytics
title: Analytics
kind: subsystem
tier: T2
source: [codex-rs/analytics/src/lib.rs, codex-rs/analytics/src/events.rs, codex-rs/analytics/src/client.rs, codex-rs/analytics/src/facts.rs, codex-rs/analytics/src/reducer.rs, codex-rs/core/src/tools/code_mode/telemetry.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/image_preparation.rs, codex-rs/app-server/src/outgoing_message.rs, codex-rs/ext/image-generation/src/backend.rs, codex-rs/ext/image-generation/src/tool.rs, codex-rs/features/src/lib.rs, codex-rs/tui/src/analytics.rs]
symbols: [AnalyticsEventsClient, AnalyticsEventsQueue, AnalyticsFact, CodeModeToolCallFact, CodeModeToolCallStatus, ImagePreparationFact, ImagePreparationMetadata, TrackEventRequest, AnalyticsReducer, CodeModeToolCallGuard, build_track_events_context]
related: [subsys.platform.telemetry-otel, subsys.config-auth.auth-flows, subsys.core.code-mode-runtime, tool.code-mode-exec, tool.code-mode-wait, tool.image-generation, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `codex_analytics` 是 Codex 的 product analytics 管道：runtime 记录 `AnalyticsFact`，`AnalyticsReducer` 把 facts 转成 `TrackEventRequest`，queue 在后台消费并发送 events；Codex-backend auth 可发送正常事件，API-key auth 只保留带 plugin identity 的 plugin/skill/MCP 子集，再用 auth provider headers POST 到 configured analytics URL。[E: codex-rs/analytics/src/facts.rs:513][E: codex-rs/analytics/src/reducer.rs:171][E: codex-rs/analytics/src/client.rs:152][E: codex-rs/analytics/src/client.rs:155][E: codex-rs/analytics/src/client.rs:860][E: codex-rs/analytics/src/client.rs:873][E: codex-rs/analytics/src/client.rs:874][E: codex-rs/analytics/src/events.rs:166][E: codex-rs/analytics/src/events.rs:168][E: codex-rs/analytics/src/events.rs:173][E: codex-rs/analytics/src/client.rs:927][E: codex-rs/analytics/src/client.rs:949]

## 能回答的问题

- analytics fact 和 track event request 的区别是什么？
- queue 怎样做 app/plugin used 去重与满队列丢弃？
- subagent thread started 怎样复用 thread initialized event？
- reducer 怎样保存 connection/thread/request/turn state？
- analytics request 什么时候会因为 auth、backend capability 或 config 被跳过？
- hooks、skills、plugins、turn config/tokens 怎样进入 analytics？

## Public exports 与数据模型

`lib.rs` re-export `AnalyticsEventsClient`、guardian/app/hook/skill/plugin/turn 相关 public input types、`TrackEventsContext` 和 `build_track_events_context`。[E: codex-rs/analytics/src/lib.rs:16][E: codex-rs/analytics/src/lib.rs:19][E: codex-rs/analytics/src/lib.rs:22][E: codex-rs/analytics/src/lib.rs:31][E: codex-rs/analytics/src/lib.rs:36][E: codex-rs/analytics/src/lib.rs:50][E: codex-rs/analytics/src/lib.rs:61][E: codex-rs/analytics/src/lib.rs:64][E: codex-rs/analytics/src/lib.rs:66][E: codex-rs/analytics/src/lib.rs:75]

`TrackEventRequest` 是 untagged enum：除 skill/thread/guardian/app/hook/compaction/goal/turn 外，还包括 artifact、command/file/MCP/dynamic/control/collab tool、web/image、accepted-line、review、plugin used/install/state/failure，以及 external-agent import completed/failure。`TrackEventsRequest` 是批量发送 wrapper，字段是 `events: Vec<TrackEventRequest>`。[E: codex-rs/analytics/src/events.rs:64][E: codex-rs/analytics/src/events.rs:70][E: codex-rs/analytics/src/events.rs:84][E: codex-rs/analytics/src/events.rs:88][E: codex-rs/analytics/src/events.rs:89][E: codex-rs/analytics/src/events.rs:90][E: codex-rs/analytics/src/events.rs:91][E: codex-rs/analytics/src/events.rs:96][E: codex-rs/analytics/src/events.rs:97][E: codex-rs/analytics/src/events.rs:103][E: codex-rs/analytics/src/events.rs:104][E: codex-rs/analytics/src/events.rs:105]

`TrackEventsContext` 包含 model_slug、thread_id、turn_id 和 product_client_id；builder 按入参构造这四个字段。[E: codex-rs/analytics/src/facts.rs:46][E: codex-rs/analytics/src/facts.rs:46][E: codex-rs/analytics/src/facts.rs:50][E: codex-rs/analytics/src/facts.rs:51][E: codex-rs/analytics/src/facts.rs:52][E: codex-rs/analytics/src/facts.rs:100][E: codex-rs/analytics/src/facts.rs:101][E: codex-rs/analytics/src/facts.rs:102][E: codex-rs/analytics/src/facts.rs:103][E: codex-rs/analytics/src/facts.rs:104][E: codex-rs/analytics/src/facts.rs:105][E: codex-rs/analytics/src/facts.rs:105][E: codex-rs/analytics/src/facts.rs:105][E: codex-rs/analytics/src/facts.rs:109][E: codex-rs/analytics/src/facts.rs:110]

`AnalyticsFact` 是内部 fact enum，顶层覆盖 Initialize、ClientRequest、ClientResponse、ErrorResponse、ServerRequest、ServerResponse、EffectivePermissionsApprovalResponse、ServerRequestAborted、Notification 和 Custom；Custom facts 覆盖 subagent、compaction、goal、guardian、turn config/token/profile/error、skill/app/hook/plugin、plugin install failure 和 external-agent import events。[E: codex-rs/analytics/src/facts.rs:513][E: codex-rs/analytics/src/facts.rs:514][E: codex-rs/analytics/src/facts.rs:521][E: codex-rs/analytics/src/facts.rs:532][E: codex-rs/analytics/src/facts.rs:537][E: codex-rs/analytics/src/facts.rs:544][E: codex-rs/analytics/src/facts.rs:547][E: codex-rs/analytics/src/facts.rs:552][E: codex-rs/analytics/src/facts.rs:557][E: codex-rs/analytics/src/facts.rs:561][E: codex-rs/analytics/src/facts.rs:564][E: codex-rs/analytics/src/facts.rs:567][E: codex-rs/analytics/src/facts.rs:569][E: codex-rs/analytics/src/facts.rs:570][E: codex-rs/analytics/src/facts.rs:574][E: codex-rs/analytics/src/facts.rs:576][E: codex-rs/analytics/src/facts.rs:585][E: codex-rs/analytics/src/facts.rs:586][E: codex-rs/analytics/src/facts.rs:587]

## Queue 与 client

queue 常量包括 256 的 channel size、10 秒 HTTP request timeout 和 4096 的 dedupe key 上限；10 秒 timeout 用在 HTTP POST，不是 `try_send` timeout。[E: codex-rs/analytics/src/client.rs:75][E: codex-rs/analytics/src/client.rs:76][E: codex-rs/analytics/src/client.rs:79][E: codex-rs/analytics/src/client.rs:155][E: codex-rs/analytics/src/client.rs:181][E: codex-rs/analytics/src/client.rs:892] `AnalyticsEventsQueue::new` 创建 mpsc channel，spawn background task，task 从 receiver 取 fact、交给 reducer、然后调用 `send_track_events`。[E: codex-rs/analytics/src/client.rs:152][E: codex-rs/analytics/src/client.rs:155][E: codex-rs/analytics/src/client.rs:156][E: codex-rs/analytics/src/client.rs:156][E: codex-rs/analytics/src/client.rs:170][E: codex-rs/analytics/src/client.rs:171]

`try_send` 在 queue 满时 drop fact 并记录 warning；不会阻塞 caller。[E: codex-rs/analytics/src/client.rs:188][E: codex-rs/analytics/src/client.rs:190][E: codex-rs/analytics/src/client.rs:194] app used 去重 key 是 `(turn_id, connector_id)`，plugin used 去重 key 优先使用 `(turn_id, plugin_id.as_key())`，否则使用 `(turn_id, remote_plugin_id)`；dedupe set 达到上限会 clear。[E: codex-rs/analytics/src/client.rs:198][E: codex-rs/analytics/src/client.rs:204][E: codex-rs/analytics/src/client.rs:207][E: codex-rs/analytics/src/client.rs:210][E: codex-rs/analytics/src/client.rs:219][E: codex-rs/analytics/src/client.rs:222][E: codex-rs/analytics/src/client.rs:223][E: codex-rs/analytics/src/client.rs:224][E: codex-rs/analytics/src/client.rs:225][E: codex-rs/analytics/src/client.rs:226][E: codex-rs/analytics/src/client.rs:230]

`AnalyticsEventsClient` 提供 track_* methods，把输入包装成对应 `AnalyticsFact`；`record_fact` 只有在 queue 存在时调用 queue `try_send`，而 queue 会在 `analytics_enabled == Some(false)` 时不创建。[E: codex-rs/analytics/src/client.rs:234][E: codex-rs/analytics/src/client.rs:242][E: codex-rs/analytics/src/client.rs:276][E: codex-rs/analytics/src/client.rs:284][E: codex-rs/analytics/src/client.rs:296][E: codex-rs/analytics/src/client.rs:591][E: codex-rs/analytics/src/client.rs:591][E: codex-rs/analytics/src/client.rs:591]

## HTTP 发送

`send_track_events` 对空 events 或缺少 auth 直接返回；API-key auth 通过 `TrackEventRequest::can_send_with_api_key_auth` 过滤事件（allowlist：`PluginUsed` / `SkillInvocation` / `McpToolCall` / `ArtifactOperation` / `PluginMeasurement`），非 API-key 且非 Codex-backend auth 则整体跳过，过滤后的 events 再按 isolated request 规则拆 batch。[E: codex-rs/analytics/src/client.rs:860][E: codex-rs/analytics/src/client.rs:865][E: codex-rs/analytics/src/client.rs:873][E: codex-rs/analytics/src/client.rs:874][E: codex-rs/analytics/src/client.rs:875][E: codex-rs/analytics/src/client.rs:882][E: codex-rs/analytics/src/events.rs:166][E: codex-rs/analytics/src/events.rs:168][E: codex-rs/analytics/src/events.rs:173] request URL 来自 `AnalyticsEventsDestination::Http { url }`，POST 携带 `auth_provider_from_auth(auth).to_auth_headers()`、JSON content type 和 `TrackEventsRequest` payload。[E: codex-rs/analytics/src/client.rs:927][E: codex-rs/analytics/src/client.rs:947][E: codex-rs/analytics/src/client.rs:949][E: codex-rs/analytics/src/client.rs:950][E: codex-rs/analytics/src/client.rs:951]

## Reducer

`AnalyticsReducer` state 保存 requests、turns、connections、threads、tool_items_started_at_ms、pending_reviews 和 item_review_summaries；`ingest` dispatcher 按 fact kind 调用 initialize/client/server/error/notification/custom handlers。[E: codex-rs/analytics/src/reducer.rs:171][E: codex-rs/analytics/src/reducer.rs:172][E: codex-rs/analytics/src/reducer.rs:173][E: codex-rs/analytics/src/reducer.rs:174][E: codex-rs/analytics/src/reducer.rs:175][E: codex-rs/analytics/src/reducer.rs:176][E: codex-rs/analytics/src/reducer.rs:179][E: codex-rs/analytics/src/reducer.rs:180][E: codex-rs/analytics/src/reducer.rs:479][E: codex-rs/analytics/src/reducer.rs:480][E: codex-rs/analytics/src/reducer.rs:481][E: codex-rs/analytics/src/reducer.rs:505][E: codex-rs/analytics/src/reducer.rs:527][E: codex-rs/analytics/src/reducer.rs:538][E: codex-rs/analytics/src/reducer.rs:546][E: codex-rs/analytics/src/reducer.rs:548][E: codex-rs/analytics/src/reducer.rs:555][E: codex-rs/analytics/src/reducer.rs:579]

`ingest_initialize` 把 connection metadata 存入 `connections`；普通 thread start/resume/fork response 通过 `emit_thread_initialized` 写入 thread->connection 和 thread metadata，并 emit `ThreadInitialized` event。[E: codex-rs/analytics/src/reducer.rs:1104][E: codex-rs/analytics/src/reducer.rs:1113][E: codex-rs/analytics/src/reducer.rs:1116][E: codex-rs/analytics/src/reducer.rs:1125][E: codex-rs/analytics/src/reducer.rs:1487][E: codex-rs/analytics/src/reducer.rs:1488][E: codex-rs/analytics/src/reducer.rs:1497][E: codex-rs/analytics/src/reducer.rs:1508][E: codex-rs/analytics/src/reducer.rs:2019][E: codex-rs/analytics/src/reducer.rs:2029][E: codex-rs/analytics/src/reducer.rs:1952][E: codex-rs/analytics/src/reducer.rs:2045][E: codex-rs/analytics/src/reducer.rs:2046][E: codex-rs/analytics/src/reducer.rs:2048][E: codex-rs/analytics/src/reducer.rs:2050]

subagent thread started 没有独立 `TrackEventRequest` variant；reducer 把 `CustomAnalyticsFact::SubAgentThreadStarted` 转成 `TrackEventRequest::ThreadInitialized`，其 event params 设置 `thread_source: Some("subagent")`。[E: codex-rs/analytics/src/reducer.rs:1129][E: codex-rs/analytics/src/reducer.rs:1148][E: codex-rs/analytics/src/reducer.rs:1154][E: codex-rs/analytics/src/reducer.rs:1154][E: codex-rs/analytics/src/events.rs:1411][E: codex-rs/analytics/src/events.rs:1427]

request facts 保存 pending turn start/turn steer state；turn resolved config 和 token usage 更新 turn state 后调用 `maybe_emit_turn_event`。[E: codex-rs/analytics/src/reducer.rs:1191][E: codex-rs/analytics/src/reducer.rs:1192][E: codex-rs/analytics/src/reducer.rs:1194][E: codex-rs/analytics/src/reducer.rs:1200][E: codex-rs/analytics/src/reducer.rs:1201][E: codex-rs/analytics/src/reducer.rs:1203][E: codex-rs/analytics/src/reducer.rs:1219][E: codex-rs/analytics/src/reducer.rs:1224][E: codex-rs/analytics/src/reducer.rs:1227][E: codex-rs/analytics/src/reducer.rs:1230][E: codex-rs/analytics/src/reducer.rs:1231][E: codex-rs/analytics/src/reducer.rs:1234][E: codex-rs/analytics/src/reducer.rs:1234][E: codex-rs/analytics/src/reducer.rs:1242][E: codex-rs/analytics/src/reducer.rs:1243]

skill invocation reducer 会尝试从 skill path 推导 git repo root/repo URL，并构造 `skill_invocation` event；app/hook/plugin reducers 分别构造 codex_app、codex_hook、codex_plugin event request。[E: codex-rs/analytics/src/reducer.rs:1281][E: codex-rs/analytics/src/reducer.rs:1295][E: codex-rs/analytics/src/reducer.rs:1297][E: codex-rs/analytics/src/reducer.rs:1309][E: codex-rs/analytics/src/reducer.rs:1311][E: codex-rs/analytics/src/reducer.rs:1328][E: codex-rs/analytics/src/reducer.rs:1334][E: codex-rs/analytics/src/reducer.rs:1350][E: codex-rs/analytics/src/reducer.rs:1352][E: codex-rs/analytics/src/reducer.rs:1358][E: codex-rs/analytics/src/reducer.rs:1360][E: codex-rs/analytics/src/reducer.rs:1391][E: codex-rs/analytics/src/reducer.rs:1394][E: codex-rs/analytics/src/reducer.rs:1406][E: codex-rs/analytics/src/reducer.rs:1414]

## Code Mode 与 response correlation

`CodeModeToolCallFact` 给 reducer 提供 cell started/child started/cell closed/sampling response completed/tool completed 五类 lifecycle facts；terminal status 明确区分 completed、failed、interrupted。[E: codex-rs/analytics/src/facts.rs:53][E: codex-rs/analytics/src/facts.rs:68][E: codex-rs/analytics/src/facts.rs:74][E: codex-rs/analytics/src/facts.rs:80][E: codex-rs/analytics/src/facts.rs:92]

Code Mode runtime 使用 RAII guard：默认 terminal status 为 interrupted，正常返回时显式改成 completed/failed，Drop 必然发出 completed fact；sampling `response.completed` 再把 response id 与该轮 tool call ids 关联。[E: codex-rs/core/src/tools/code_mode/telemetry.rs:26][E: codex-rs/core/src/tools/code_mode/telemetry.rs:44][E: codex-rs/core/src/tools/code_mode/telemetry.rs:50][E: codex-rs/core/src/tools/code_mode/telemetry.rs:92][E: codex-rs/core/src/session/turn.rs:2915][E: codex-rs/core/src/session/turn.rs:2923][E: codex-rs/core/src/session/turn.rs:2927]

Reducer 维护 call→response、child call→cell 与 cell→parent/response state，把 `cell_id`、`parent_call_id`、originating/subsequent response ids 补到 tool events。每类 correlation map/pending queue 上限 256；pending 满时先 flush oldest，避免无界等待下一次 sampling response。[E: codex-rs/analytics/src/events.rs:578][E: codex-rs/analytics/src/events.rs:587][E: codex-rs/analytics/src/events.rs:590][E: codex-rs/analytics/src/reducer.rs:168][E: codex-rs/analytics/src/reducer.rs:177][E: codex-rs/analytics/src/reducer.rs:419][E: codex-rs/analytics/src/reducer.rs:918][E: codex-rs/analytics/src/reducer.rs:966][E: codex-rs/analytics/src/reducer.rs:1067]

## Image preparation 与 interrupt attribution

每个成功 decode 的 image preparation 会记录 message role 或 tool item id、effective detail、source/prepared dimensions；session 在 durable history boundary 调用 `prepare_image_response_items`，再逐项 `track_image_preparation`，然后才 persist rollout 与发送 raw items。[E: codex-rs/analytics/src/facts.rs:145][E: codex-rs/analytics/src/facts.rs:146][E: codex-rs/analytics/src/facts.rs:148][E: codex-rs/analytics/src/facts.rs:157][E: codex-rs/core/src/session/mod.rs:3434][E: codex-rs/core/src/session/mod.rs:3651][E: codex-rs/core/src/session/mod.rs:3654]

Turn event 因此携带 `image_preparations` 和首个成功 explicit interrupt 请求时间；app-server 在 notification fan-out 前按引用交给 analytics，而 analytics client 只 clone 其关心的 notification variants。[E: codex-rs/analytics/src/events.rs:993][E: codex-rs/analytics/src/events.rs:1001][E: codex-rs/analytics/src/client.rs:341][E: codex-rs/analytics/src/client.rs:347][E: codex-rs/app-server/src/outgoing_message.rs:191][E: codex-rs/app-server/src/outgoing_message.rs:194][E: codex-rs/analytics/src/client.rs:701]

Image generation backend 另以 `x-codex-image-turn-id` 携带 tool call 的 turn id；它是 request correlation header，不等同于上面的 image-preparation analytics fact。[E: codex-rs/ext/image-generation/src/backend.rs:15][E: codex-rs/ext/image-generation/src/backend.rs:61][E: codex-rs/ext/image-generation/src/backend.rs:82][E: codex-rs/ext/image-generation/src/backend.rs:100][E: codex-rs/ext/image-generation/src/tool.rs:163]

## 设计动机与权衡

analytics 使用 fact reducer，而不是每个调用点直接 POST event，是为了让 thread/request/turn context 可以在 reducer 中统一补齐，并允许 queue 层做去重与 backpressure drop。[I] 该设计由 `AnalyticsFact`、`AnalyticsReducer` state 和 `AnalyticsEventsQueue` 共同体现。[E: codex-rs/analytics/src/facts.rs:513][E: codex-rs/analytics/src/facts.rs:561][E: codex-rs/analytics/src/reducer.rs:171][E: codex-rs/analytics/src/client.rs:152][E: codex-rs/analytics/src/client.rs:188][E: codex-rs/analytics/src/client.rs:194][E: codex-rs/analytics/src/client.rs:210]

analytics sender 对 API-key auth 采用 event-level allowlist，而对其它非 Codex-backend auth 采用整体拒绝；这让 plugin-attributed usage 可以在 API-key 模式发送，又不把全部 product analytics 开放给任意 auth mode。[I] 该结论由 auth 分支和 allowlist variants 支撑。[E: codex-rs/analytics/src/client.rs:873][E: codex-rs/analytics/src/client.rs:875][E: codex-rs/analytics/src/events.rs:166][E: codex-rs/analytics/src/events.rs:168][E: codex-rs/analytics/src/events.rs:173]

## Gotchas

- analytics disabled config 会阻止 queue 创建；之后 `record_fact` 没有 queue 可发送，所以不是仅发送层丢弃。[E: codex-rs/analytics/src/client.rs:234][E: codex-rs/analytics/src/client.rs:242][E: codex-rs/analytics/src/client.rs:591][E: codex-rs/analytics/src/client.rs:591]
- plugin install failure 现在同时记录 `PluginInstallSource`（manual 或 external-agent migration）与 optional sub-error type。[E: codex-rs/analytics/src/facts.rs:663][E: codex-rs/analytics/src/facts.rs:665][E: codex-rs/analytics/src/facts.rs:671][E: codex-rs/analytics/src/facts.rs:671][E: codex-rs/analytics/src/facts.rs:675][E: codex-rs/analytics/src/client.rs:530][E: codex-rs/analytics/src/client.rs:532][E: codex-rs/analytics/src/client.rs:532]
- 如果没有 thread connection context，guardian 等事件可能被 reducer drop。[E: codex-rs/analytics/src/reducer.rs:322][E: codex-rs/analytics/src/reducer.rs:327]
- hook event/source mapping 使用固定字符串；hook status 只把 unexpected `Running` 归一化为 `Failed`，不是字符串 mapping。[E: codex-rs/analytics/src/events.rs:1353][E: codex-rs/analytics/src/events.rs:1362][E: codex-rs/analytics/src/events.rs:1363][E: codex-rs/analytics/src/events.rs:1364][E: codex-rs/analytics/src/events.rs:1365][E: codex-rs/analytics/src/events.rs:1384][E: codex-rs/analytics/src/events.rs:1392][E: codex-rs/analytics/src/events.rs:1393][E: codex-rs/analytics/src/events.rs:1444][E: codex-rs/analytics/src/events.rs:1446]
- `Feature::AnalyticsPlanHistory`（key `analytics_plan_history`，Experimental，默认关）只打开 TUI `/analytics` 的 allowance history；它不创建或关闭本 crate 的 `AnalyticsEventsQueue`。[E: codex-rs/features/src/lib.rs:935][E: codex-rs/tui/src/analytics.rs:156]

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
- `codex-rs/features/src/lib.rs`
- `codex-rs/tui/src/analytics.rs`

## 相关

- `subsys.platform.telemetry-otel`: metrics/tracing/logging exporter 管道。
- `subsys.config-auth.auth-flows`: analytics 发送依赖 ChatGPT auth。
- `config.storage-telemetry-misc`: analytics 开关配置入口。
