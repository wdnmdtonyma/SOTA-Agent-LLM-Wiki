---
id: subsys.telemetry-flags
path: subsystems/telemetry-flags.md
title: 遥测与 feature flag
kind: subsystem
tier: T2
source: [services/analytics/, utils/telemetry/]
symbols: [logEvent, initializeAnalytics, getGrowthBookClient, initializeTelemetry]
related: [ref.feature-flags]
status: verified
evidence: explicit
updated: 2026-06-14
---

> 遥测与 feature flag 子系统由 analytics sink、GrowthBook feature evaluation、OpenTelemetry instrumentation 和 privacy-aware event builders 组成。[E: services/analytics/index.ts:81][E: services/analytics/growthbook.ts:490][E: utils/telemetry/instrumentation.ts:421][E: utils/telemetry/events.ts:17][E: utils/telemetry/events.ts:18]

## 能回答的问题

- `logEvent` 在 sink 初始化前后如何处理事件?
- Datadog、first-party event logging、OpenTelemetry 和 BigQuery 分别在哪里接入?
- GrowthBook feature flag 如何初始化、缓存、remote eval 和记录 exposure?
- 哪些环境变量或 settings 会关闭 analytics/telemetry?

## 职责边界

`services/analytics/` 负责 product analytics 和 feature flag: `logEvent` 依赖 `AnalyticsSink`, sink 未初始化时排入 queue, sink attach 后 drain queued events。[E: services/analytics/index.ts:81][E: services/analytics/index.ts:95][E: services/analytics/index.ts:99][E: services/analytics/index.ts:102][E: services/analytics/index.ts:113][E: services/analytics/index.ts:139][E: services/analytics/index.ts:140] `utils/telemetry/` 负责 OpenTelemetry metrics/logs/traces、session tracing、BigQuery exporter 和 plugin/skill event shaping。[E: utils/telemetry/instrumentation.ts:421][E: utils/telemetry/sessionTracing.ts:176][E: utils/telemetry/bigqueryExporter.ts:63][E: utils/telemetry/pluginTelemetry.ts:191]

analytics disabled 与 telemetry enabled 是两套门: analytics 会在 test、Bedrock、Vertex、Foundry 或 privacy disabled 时关闭; OTel telemetry 由 `CLAUDE_CODE_ENABLE_TELEMETRY` 控制。[E: services/analytics/config.ts:21][E: services/analytics/config.ts:22][E: services/analytics/config.ts:23][E: services/analytics/config.ts:24][E: services/analytics/config.ts:25][E: utils/telemetry/instrumentation.ts:325]

## 关键文件

- `services/analytics/index.ts`: sink attach、event queue、sync/async logging facade。[E: services/analytics/index.ts:81][E: services/analytics/index.ts:95][E: services/analytics/index.ts:133][E: services/analytics/index.ts:154]
- `services/analytics/sink.ts`: 根据 GrowthBook gate 决定 Datadog tracking, 并把事件分发到 Datadog 与 first-party sink。[E: services/analytics/sink.ts:20][E: services/analytics/sink.ts:29][E: services/analytics/sink.ts:63][E: services/analytics/sink.ts:71]
- `services/analytics/growthbook.ts`: user attributes、remote eval、env overrides、cache、exposure dedupe 和 client initialization。[E: services/analytics/growthbook.ts:32][E: services/analytics/growthbook.ts:81][E: services/analytics/growthbook.ts:173][E: services/analytics/growthbook.ts:296][E: services/analytics/growthbook.ts:407][E: services/analytics/growthbook.ts:526][E: services/analytics/growthbook.ts:530]
- `services/analytics/firstPartyEventLogger.ts`: 1P event sampling、batch config、enable gate 和 async exporter path。[E: services/analytics/firstPartyEventLogger.ts:57][E: services/analytics/firstPartyEventLogger.ts:84][E: services/analytics/firstPartyEventLogger.ts:97][E: services/analytics/firstPartyEventLogger.ts:143][E: services/analytics/firstPartyEventLogger.ts:229]
- `utils/telemetry/instrumentation.ts`: OTel exporter parsing、meter/log/tracer providers、resource attributes、shutdown hooks 和 flush。[E: utils/telemetry/instrumentation.ts:121][E: utils/telemetry/instrumentation.ts:421][E: utils/telemetry/instrumentation.ts:486][E: utils/telemetry/instrumentation.ts:566][E: utils/telemetry/instrumentation.ts:583][E: utils/telemetry/instrumentation.ts:612][E: utils/telemetry/instrumentation.ts:707]

## 数据模型

analytics event 是 name + metadata payload; `stripProtoFields` 会移除 proto-internal fields, Datadog path 使用 stripped payload, first-party path 使用 full payload。[E: services/analytics/index.ts:45][E: services/analytics/sink.ts:63][E: services/analytics/sink.ts:71] first-party event logger 有 per-event sampling config 和 batch config feature values, 并在 `logEventTo1P` 中先检查 enabled gate 与 sink kill switch。[E: services/analytics/firstPartyEventLogger.ts:57][E: services/analytics/firstPartyEventLogger.ts:97][E: services/analytics/firstPartyEventLogger.ts:220][E: services/analytics/firstPartyEventLogger.ts:224]

GrowthBook remote eval payload 会写入 in-memory feature map 并同步到 disk cache; pending exposures 在 successful init 后被逐个记录并清空, exposure logging 用 `loggedExposures` 去重。[E: services/analytics/growthbook.ts:382][E: services/analytics/growthbook.ts:390][E: services/analytics/growthbook.ts:407][E: services/analytics/growthbook.ts:581][E: services/analytics/growthbook.ts:584][E: services/analytics/growthbook.ts:585][E: services/analytics/growthbook.ts:296] plugin telemetry 会 hash plugin id, 并按 privacy-aware 字段构建 session plugin events。[E: utils/telemetry/pluginTelemetry.ts:48][E: utils/telemetry/pluginTelemetry.ts:150][E: utils/telemetry/pluginTelemetry.ts:156][E: utils/telemetry/pluginTelemetry.ts:159][E: utils/telemetry/pluginTelemetry.ts:161]

## 控制流

1. analytics 初始化包含 gates 初始化与 sink attach 两个动作; 上层启动顺序应保证 attach 后会 drain 初始化前积压的 queue。[E: services/analytics/sink.ts:97][E: services/analytics/sink.ts:110][E: services/analytics/index.ts:99][E: services/analytics/index.ts:113][I]
2. 调用 `logEvent` 时, 如果 sink 尚未 attach, 事件进入 queue; 如果已 attach, 直接调用 sink。[E: services/analytics/index.ts:133][E: services/analytics/index.ts:141]
3. sink 内先按 Datadog gate 和 sampling 判断是否发 Datadog, 再调用 first-party event logger。[E: services/analytics/sink.ts:48][E: services/analytics/sink.ts:63][E: services/analytics/sink.ts:71]
4. OTel `initializeTelemetry` 会按 env 解析 console/OTLP/BigQuery exporters, 构造 resource attributes, 初始化 meter/log/tracer provider, 并注册 shutdown cleanup。[E: utils/telemetry/instrumentation.ts:462][E: utils/telemetry/instrumentation.ts:467][E: utils/telemetry/instrumentation.ts:486][E: utils/telemetry/instrumentation.ts:566][E: utils/telemetry/instrumentation.ts:583][E: utils/telemetry/instrumentation.ts:612][E: utils/telemetry/instrumentation.ts:619][E: utils/telemetry/instrumentation.ts:629]
5. session tracing 会先启动 interaction span 入口, OTel span 只有在 enhanced telemetry 或 beta tracing 任一开启时继续; Perfetto tracing 有独立 gate。[E: utils/telemetry/sessionTracing.ts:148][E: utils/telemetry/sessionTracing.ts:176][E: utils/telemetry/sessionTracing.ts:180][E: utils/telemetry/sessionTracing.ts:184]

## 设计动机与权衡

analytics 与 OTel 分层是为了区分 product analytics、feature exposure 与 customer-controlled telemetry。[I] 源码层面可以看到 analytics disabled 不等于 OTel disabled, 前者依赖 privacy/vendor context, 后者依赖专门 env gate。[E: services/analytics/config.ts:21][E: services/analytics/config.ts:25][E: utils/telemetry/instrumentation.ts:325]

GrowthBook 同时支持 remote eval、env override 和 disk cache; stale/offline 使用的语义来自 cached feature fallback, fresh refresh 由 client initialization 和 callbacks 推动。[E: services/analytics/growthbook.ts:227][E: services/analytics/growthbook.ts:231][E: services/analytics/growthbook.ts:407][E: services/analytics/growthbook.ts:554][E: services/analytics/growthbook.ts:573][I]

## Gotcha

- `CLAUDE_INTERNAL_FC_OVERRIDES` 只在 Anthropic 内部用户路径生效, 不是通用用户 feature override。[E: services/analytics/growthbook.ts:173][E: services/analytics/growthbook.ts:174][E: services/analytics/growthbook.ts:175]
- first-party sink 有 kill switch; 单看 `is1PEventLoggingEnabled` 不足以证明事件一定会发出。[E: services/analytics/firstPartyEventLogger.ts:220][E: services/analytics/firstPartyEventLogger.ts:224][E: services/analytics/sinkKillswitch.ts:24]
- OTel user prompt 默认会被 redaction; 只有 `OTEL_LOG_USER_PROMPTS` 打开时才记录原 prompt 字段。[E: utils/telemetry/events.ts:14][E: utils/telemetry/events.ts:17][E: utils/telemetry/events.ts:18]
- BigQuery exporter 会检查 trust dialog accepted 和 opt-out 状态, 不是简单 HTTP POST。[E: utils/telemetry/bigqueryExporter.ts:94][E: utils/telemetry/bigqueryExporter.ts:96][E: utils/telemetry/bigqueryExporter.ts:105][E: utils/telemetry/bigqueryExporter.ts:106]

## Sources

- `services/analytics/`
- `utils/telemetry/`
- `services/analytics/index.ts`
- `services/analytics/config.ts`
- `services/analytics/sink.ts`
- `services/analytics/growthbook.ts`
- `services/analytics/firstPartyEventLogger.ts`
- `services/analytics/sinkKillswitch.ts`
- `utils/telemetry/instrumentation.ts`
- `utils/telemetry/events.ts`
- `utils/telemetry/sessionTracing.ts`
- `utils/telemetry/bigqueryExporter.ts`
- `utils/telemetry/pluginTelemetry.ts`

## 相关

- ref.feature-flags
