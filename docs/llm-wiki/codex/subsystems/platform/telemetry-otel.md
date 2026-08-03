---
id: subsys.platform.telemetry-otel
title: 遥测 / OTEL
kind: subsystem
tier: T2
source: [codex-rs/otel/src/lib.rs, codex-rs/otel/src/config.rs, codex-rs/otel/src/provider.rs, codex-rs/otel/src/otlp.rs, codex-rs/otel/src/trace_context.rs, codex-rs/otel/src/metrics/config.rs, codex-rs/otel/src/metrics/client.rs, codex-rs/otel/src/metrics/names.rs, codex-rs/otel/src/events/session_telemetry.rs, codex-rs/ext/extension-api/src/capabilities/metrics.rs, codex-rs/core/src/session/extension_metrics.rs]
symbols: [OtelSettings, OtelExporter, OtelProvider, TelemetryAuthMode, MetricsConfig, MetricsClient, resolve_exporter, build_header_map, resolve_otlp_timeout, validate_tracestate_entries, validate_tracestate_member]
related: [subsys.platform.analytics, spine.extension-system, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 7750465934
---

> `codex_otel` 是 Codex 的 OpenTelemetry provider crate：它导出 OTEL settings/exporter types、trace-context validators 和 `OtelProvider`，把 Statsig exporter 解析成 OTLP HTTP JSON 或在 debug build 中禁用，并按 settings 构造 logs/traces/metrics exporters。[E: codex-rs/otel/src/lib.rs:15][E: codex-rs/otel/src/lib.rs:17][E: codex-rs/otel/src/lib.rs:28][E: codex-rs/otel/src/lib.rs:37][E: codex-rs/otel/src/config.rs:13][E: codex-rs/otel/src/config.rs:20][E: codex-rs/otel/src/config.rs:24][E: codex-rs/otel/src/provider.rs:84][E: codex-rs/otel/src/provider.rs:107][E: codex-rs/otel/src/provider.rs:124][E: codex-rs/otel/src/provider.rs:128]

## 能回答的问题

- `OtelSettings` 与 `OtelExporter` 的真实字段是什么？
- Statsig exporter 在 debug/release 下怎样解析？
- `OtelProvider::from` 什么时候返回 `None`，什么时候安装 global metrics/tracer provider？
- logs/traces 的 gRPC/HTTP/TLS/client 构造分别走哪些 helper？
- header parse、timeout parse、TLS 文件读取的失败语义是什么？

## 数据模型

`OtelSettings` 字段是 environment、service_name、service_version、codex_home、exporter、trace_exporter、metrics_exporter、runtime_metrics、span_attributes 和 tracestate。[E: codex-rs/otel/src/config.rs:51][E: codex-rs/otel/src/config.rs:52][E: codex-rs/otel/src/config.rs:53][E: codex-rs/otel/src/config.rs:54][E: codex-rs/otel/src/config.rs:55][E: codex-rs/otel/src/config.rs:56][E: codex-rs/otel/src/config.rs:57][E: codex-rs/otel/src/config.rs:58][E: codex-rs/otel/src/config.rs:59][E: codex-rs/otel/src/config.rs:60][E: codex-rs/otel/src/config.rs:61] protocol、headers 和 TLS 不在 `OtelSettings` 顶层，而是在 `OtelExporter::OtlpGrpc` / `OtelExporter::OtlpHttp` variants 中。[E: codex-rs/otel/src/config.rs:88][E: codex-rs/otel/src/config.rs:94][E: codex-rs/otel/src/config.rs:95][E: codex-rs/otel/src/config.rs:96][E: codex-rs/otel/src/config.rs:97][E: codex-rs/otel/src/config.rs:99][E: codex-rs/otel/src/config.rs:100][E: codex-rs/otel/src/config.rs:101][E: codex-rs/otel/src/config.rs:102][E: codex-rs/otel/src/config.rs:103]

`OtelExporter` variants 是 `None`、`Statsig`、`OtlpGrpc` 和 `OtlpHttp`；`OtelHttpProtocol` variants 是 `Binary` 和 `Json`；`OtelTlsConfig` 支持 CA certificate、client certificate 和 client private key paths。[E: codex-rs/otel/src/config.rs:73][E: codex-rs/otel/src/config.rs:75][E: codex-rs/otel/src/config.rs:77][E: codex-rs/otel/src/config.rs:81][E: codex-rs/otel/src/config.rs:82][E: codex-rs/otel/src/config.rs:83][E: codex-rs/otel/src/config.rs:84][E: codex-rs/otel/src/config.rs:88][E: codex-rs/otel/src/config.rs:89][E: codex-rs/otel/src/config.rs:93][E: codex-rs/otel/src/config.rs:94][E: codex-rs/otel/src/config.rs:99]

`TelemetryAuthMode` 只有 `ApiKey` 与 `Chatgpt`；`AuthMode::ApiKey` 和 `BedrockApiKey` 映射成 `TelemetryAuthMode::ApiKey`，`Chatgpt`、`ChatgptAuthTokens`、`Headers`、`AgentIdentity` 和 `PersonalAccessToken` 映射成 `TelemetryAuthMode::Chatgpt`。[E: codex-rs/otel/src/lib.rs:51][E: codex-rs/otel/src/lib.rs:52][E: codex-rs/otel/src/lib.rs:53][E: codex-rs/otel/src/lib.rs:56][E: codex-rs/otel/src/lib.rs:59][E: codex-rs/otel/src/lib.rs:60][E: codex-rs/otel/src/lib.rs:61][E: codex-rs/otel/src/lib.rs:62][E: codex-rs/otel/src/lib.rs:63][E: codex-rs/otel/src/lib.rs:64]

## Exporter resolution

`resolve_exporter` 遇到 `OtelExporter::Statsig` 时，在 debug build 直接返回 `OtelExporter::None`；非 debug path 会构造 `OtelExporter::OtlpHttp`，endpoint 是 Statsig OTLP HTTP endpoint，headers 包含 Statsig API key，protocol 是 JSON，TLS 为 None。[E: codex-rs/otel/src/config.rs:10][E: codex-rs/otel/src/config.rs:20][E: codex-rs/otel/src/config.rs:21][E: codex-rs/otel/src/config.rs:24][E: codex-rs/otel/src/config.rs:25][E: codex-rs/otel/src/config.rs:27][E: codex-rs/otel/src/config.rs:28][E: codex-rs/otel/src/config.rs:30][E: codex-rs/otel/src/config.rs:31] 非 Statsig exporter 会 clone 原 exporter 返回。[E: codex-rs/otel/src/config.rs:34]

## Provider 初始化

`OtelProvider` 字段是 logger、tracer_provider、tracer、metrics 和 `shutdown_started: AtomicBool`；首次 `shutdown()` 才依次关闭 tracer/metrics/logger，之后显式调用或 `Drop` 都是 no-op，因此总计最多执行一次。[E: codex-rs/otel/src/provider.rs:58][E: codex-rs/otel/src/provider.rs:63][E: codex-rs/otel/src/provider.rs:66][E: codex-rs/otel/src/provider.rs:69][E: codex-rs/otel/src/provider.rs:73][E: codex-rs/otel/src/provider.rs:80][E: codex-rs/otel/src/provider.rs:205][E: codex-rs/otel/src/provider.rs:207]

`OtelProvider::from` 根据 log exporter、trace exporter 和 resolved metrics exporter 判断是否启用；三者都不存在时清空 process-global tracestate 并返回 `Ok(None)`。[E: codex-rs/otel/src/provider.rs:84][E: codex-rs/otel/src/provider.rs:85][E: codex-rs/otel/src/provider.rs:86][E: codex-rs/otel/src/provider.rs:87][E: codex-rs/otel/src/provider.rs:88][E: codex-rs/otel/src/provider.rs:90][E: codex-rs/otel/src/provider.rs:93][E: codex-rs/otel/src/provider.rs:95] metrics exporter 存在时创建 `MetricsClient`，runtime_metrics 为 true 时启用 runtime reader，并把 metrics client install 为 global。[E: codex-rs/otel/src/provider.rs:107][E: codex-rs/otel/src/provider.rs:110][E: codex-rs/otel/src/provider.rs:116][E: codex-rs/otel/src/provider.rs:117][E: codex-rs/otel/src/provider.rs:119][E: codex-rs/otel/src/provider.rs:147][E: codex-rs/otel/src/provider.rs:148]

Statsig metrics config 把 `codex.tool.call` 与 `codex.tool.call.duration_ms` 标为 runtime-only：调用仍先校验并构造 attributes，但在创建 OTEL counter/duration instrument 前返回；显式 OTLP exporter 的排除列表为空，不能概括成全局禁用 tool metrics。[E: codex-rs/otel/src/metrics/config.rs:11][E: codex-rs/otel/src/metrics/config.rs:38][E: codex-rs/otel/src/metrics/config.rs:41][E: codex-rs/otel/src/metrics/client.rs:128][E: codex-rs/otel/src/metrics/client.rs:130][E: codex-rs/otel/src/metrics/client.rs:227][E: codex-rs/otel/src/metrics/client.rs:229]

Extension API 新增 host-provided `ExtensionMetrics` histogram capability；core adapter 委托 `SessionTelemetry`。Session telemetry 先接收 extension tags，再追加 host metadata tags，使同名 session attribution 由 host 值覆盖；底层 metrics client 的 caller tags 又覆盖 exporter default tags，这两个 merge 层级不可混写。[E: codex-rs/ext/extension-api/src/capabilities/metrics.rs:5][E: codex-rs/ext/extension-api/src/capabilities/metrics.rs:7][E: codex-rs/core/src/session/extension_metrics.rs:6][E: codex-rs/core/src/session/extension_metrics.rs:10][E: codex-rs/otel/src/events/session_telemetry.rs:372][E: codex-rs/otel/src/events/session_telemetry.rs:376][E: codex-rs/otel/src/events/session_telemetry.rs:377][E: codex-rs/otel/src/metrics/client.rs:263][E: codex-rs/otel/src/metrics/client.rs:267]

logs 和 traces 各自构造 Resource；Resource attributes 包含 service version 和 env，logs resource 在 host name 可用时额外加入 `host.name`。[E: codex-rs/otel/src/provider.rs:122][E: codex-rs/otel/src/provider.rs:123][E: codex-rs/otel/src/provider.rs:211][E: codex-rs/otel/src/provider.rs:222][E: codex-rs/otel/src/provider.rs:227][E: codex-rs/otel/src/provider.rs:229][E: codex-rs/otel/src/provider.rs:232][E: codex-rs/otel/src/provider.rs:234][E: codex-rs/otel/src/provider.rs:237] trace exporter 启用时会先验证 span attributes，所有启用 path 都验证 tracestate；trace provider build 会挂 `SpanAttributesProcessor`，并把 configured tracestate 写入 global trace context。[E: codex-rs/otel/src/provider.rs:102][E: codex-rs/otel/src/provider.rs:103][E: codex-rs/otel/src/provider.rs:105][E: codex-rs/otel/src/provider.rs:130][E: codex-rs/otel/src/provider.rs:133][E: codex-rs/otel/src/provider.rs:142][E: codex-rs/otel/src/provider.rs:252][E: codex-rs/otel/src/provider.rs:260][E: codex-rs/otel/src/trace_context.rs:84][E: codex-rs/otel/src/trace_context.rs:87]

## OTLP helpers

`build_header_map` 会尝试把 string headers 转成 HTTP headers；无效 header name/value 不会返回 error，而是因为 `if let Ok(...)` 条件不满足而被跳过。[E: codex-rs/otel/src/otlp.rs:22][E: codex-rs/otel/src/otlp.rs:25][E: codex-rs/otel/src/otlp.rs:26][E: codex-rs/otel/src/otlp.rs:28][E: codex-rs/otel/src/otlp.rs:31]

gRPC TLS helper 解析 endpoint host、可读 CA certificate，并要求 client_certificate 与 client_private_key 同时存在。[E: codex-rs/otel/src/otlp.rs:39][E: codex-rs/otel/src/otlp.rs:40][E: codex-rs/otel/src/otlp.rs:48][E: codex-rs/otel/src/otlp.rs:49][E: codex-rs/otel/src/otlp.rs:53][E: codex-rs/otel/src/otlp.rs:55][E: codex-rs/otel/src/otlp.rs:56][E: codex-rs/otel/src/otlp.rs:60] HTTP client helpers 使用 `resolve_otlp_timeout`；timeout env 解析失败或为负数时返回 `None` 并继续 fallback 到 generic/default timeout。[E: codex-rs/otel/src/otlp.rs:106][E: codex-rs/otel/src/otlp.rs:152][E: codex-rs/otel/src/otlp.rs:196][E: codex-rs/otel/src/otlp.rs:197][E: codex-rs/otel/src/otlp.rs:200][E: codex-rs/otel/src/otlp.rs:203][E: codex-rs/otel/src/otlp.rs:206][E: codex-rs/otel/src/otlp.rs:208][E: codex-rs/otel/src/otlp.rs:210][E: codex-rs/otel/src/otlp.rs:212]

trace HTTP exporter 检测当前 Tokio runtime 是否 multi-thread；multi-thread 时使用 async reqwest client 和 Tokio batch span processor；非 multi-thread 分支先构造 HTTP span exporter，只有 `tls` 存在时才调用 blocking HTTP client helper，否则直接 build exporter。[E: codex-rs/otel/src/provider.rs:395][E: codex-rs/otel/src/provider.rs:403][E: codex-rs/otel/src/provider.rs:409][E: codex-rs/otel/src/provider.rs:415][E: codex-rs/otel/src/provider.rs:419][E: codex-rs/otel/src/provider.rs:421][E: codex-rs/otel/src/provider.rs:422][E: codex-rs/otel/src/provider.rs:425][E: codex-rs/otel/src/provider.rs:430][E: codex-rs/otel/src/provider.rs:435][E: codex-rs/otel/src/provider.rs:441][E: codex-rs/otel/src/provider.rs:443][E: codex-rs/otel/src/provider.rs:447][E: codex-rs/otel/src/provider.rs:451][E: codex-rs/otel/src/provider.rs:453][E: codex-rs/otel/src/provider.rs:454] runtime 检测由 `current_tokio_runtime_is_multi_thread()` 读取当前 handle 的 runtime flavor 完成。[E: codex-rs/otel/src/otlp.rs:94][E: codex-rs/otel/src/otlp.rs:96][E: codex-rs/otel/src/otlp.rs:97]

## 设计动机与权衡

`OtelProvider` 用一个 object 持有 logger/tracer/metrics handles，并用 atomic gate 把显式 shutdown 与 Drop 绑定成一次性 teardown，减少 batch telemetry 丢失和重复关闭 exporter 的风险。[I][E: codex-rs/otel/src/provider.rs:58][E: codex-rs/otel/src/provider.rs:63][E: codex-rs/otel/src/provider.rs:68][E: codex-rs/otel/src/provider.rs:69][E: codex-rs/otel/src/provider.rs:205]

Statsig 被解析成 OTLP HTTP JSON，而不是独立 transport，说明 Codex 复用 OTEL exporter 管道上报 Statsig 后端。[I] 该结论由 `resolve_exporter` 的 Statsig branch 支撑。[E: codex-rs/otel/src/config.rs:21][E: codex-rs/otel/src/config.rs:27]

## Gotchas

- debug build 默认禁用 Statsig exporter；本地开发看到 no exporter 不代表 release 行为一致。[E: codex-rs/otel/src/config.rs:15][E: codex-rs/otel/src/config.rs:20][E: codex-rs/otel/src/config.rs:21][E: codex-rs/otel/src/config.rs:24]
- header parse 不会返回 config error；invalid header 会被 `build_header_map` 跳过。[E: codex-rs/otel/src/otlp.rs:25][E: codex-rs/otel/src/otlp.rs:26][E: codex-rs/otel/src/otlp.rs:28]
- `start_global_timer` 依赖已经安装的 global metrics client；没有 global metrics 时返回 `MetricsError::ExporterDisabled`。[E: codex-rs/otel/src/lib.rs:70][E: codex-rs/otel/src/lib.rs:71][E: codex-rs/otel/src/lib.rs:72][E: codex-rs/otel/src/lib.rs:74]

## Sources

- `codex-rs/otel/src/lib.rs`
- `codex-rs/otel/src/config.rs`
- `codex-rs/otel/src/provider.rs`
- `codex-rs/otel/src/otlp.rs`
- `codex-rs/otel/src/trace_context.rs`
- `codex-rs/otel/src/metrics/config.rs`
- `codex-rs/otel/src/metrics/client.rs`
- `codex-rs/otel/src/metrics/names.rs`
- `codex-rs/otel/src/events/session_telemetry.rs`
- `codex-rs/ext/extension-api/src/capabilities/metrics.rs`
- `codex-rs/core/src/session/extension_metrics.rs`

## 相关

- `subsys.platform.analytics`: analytics events 与 OTEL 指标/日志是不同管道。
- `config.storage-telemetry-misc`: OTEL config keys 的用户配置入口。
