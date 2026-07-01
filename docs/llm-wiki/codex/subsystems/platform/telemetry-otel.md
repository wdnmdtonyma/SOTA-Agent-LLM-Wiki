---
id: subsys.platform.telemetry-otel
title: 遥测 / OTEL
kind: subsystem
tier: T2
source: [codex-rs/otel/src/lib.rs, codex-rs/otel/src/config.rs, codex-rs/otel/src/provider.rs, codex-rs/otel/src/otlp.rs, codex-rs/otel/src/trace_context.rs]
symbols: [OtelSettings, OtelExporter, OtelProvider, TelemetryAuthMode, resolve_exporter, build_header_map, resolve_otlp_timeout, validate_tracestate_entries, validate_tracestate_member]
related: [subsys.platform.analytics, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: db887d03e1
---

> `codex_otel` 是 Codex 的 OpenTelemetry provider crate：它导出 OTEL settings/exporter types、trace-context validators 和 `OtelProvider`，把 Statsig exporter 解析成 OTLP HTTP JSON 或在 debug build 中禁用，并按 settings 构造 logs/traces/metrics exporters。[E: codex-rs/otel/src/lib.rs:15][E: codex-rs/otel/src/lib.rs:17][E: codex-rs/otel/src/lib.rs:28][E: codex-rs/otel/src/lib.rs:37][E: codex-rs/otel/src/config.rs:13][E: codex-rs/otel/src/config.rs:20][E: codex-rs/otel/src/config.rs:24][E: codex-rs/otel/src/provider.rs:77][E: codex-rs/otel/src/provider.rs:100][E: codex-rs/otel/src/provider.rs:117][E: codex-rs/otel/src/provider.rs:121]

## 能回答的问题

- `OtelSettings` 与 `OtelExporter` 的真实字段是什么？
- Statsig exporter 在 debug/release 下怎样解析？
- `OtelProvider::from` 什么时候返回 `None`，什么时候安装 global metrics/tracer provider？
- logs/traces 的 gRPC/HTTP/TLS/client 构造分别走哪些 helper？
- header parse、timeout parse、TLS 文件读取的失败语义是什么？

## 数据模型

`OtelSettings` 字段是 environment、service_name、service_version、codex_home、exporter、trace_exporter、metrics_exporter、runtime_metrics、span_attributes 和 tracestate。[E: codex-rs/otel/src/config.rs:51][E: codex-rs/otel/src/config.rs:52][E: codex-rs/otel/src/config.rs:53][E: codex-rs/otel/src/config.rs:54][E: codex-rs/otel/src/config.rs:55][E: codex-rs/otel/src/config.rs:56][E: codex-rs/otel/src/config.rs:57][E: codex-rs/otel/src/config.rs:58][E: codex-rs/otel/src/config.rs:59][E: codex-rs/otel/src/config.rs:60][E: codex-rs/otel/src/config.rs:61] protocol、headers 和 TLS 不在 `OtelSettings` 顶层，而是在 `OtelExporter::OtlpGrpc` / `OtelExporter::OtlpHttp` variants 中。[E: codex-rs/otel/src/config.rs:88][E: codex-rs/otel/src/config.rs:94][E: codex-rs/otel/src/config.rs:95][E: codex-rs/otel/src/config.rs:96][E: codex-rs/otel/src/config.rs:97][E: codex-rs/otel/src/config.rs:99][E: codex-rs/otel/src/config.rs:100][E: codex-rs/otel/src/config.rs:101][E: codex-rs/otel/src/config.rs:102][E: codex-rs/otel/src/config.rs:103]

`OtelExporter` variants 是 `None`、`Statsig`、`OtlpGrpc` 和 `OtlpHttp`；`OtelHttpProtocol` variants 是 `Binary` 和 `Json`；`OtelTlsConfig` 支持 CA certificate、client certificate 和 client private key paths。[E: codex-rs/otel/src/config.rs:73][E: codex-rs/otel/src/config.rs:75][E: codex-rs/otel/src/config.rs:77][E: codex-rs/otel/src/config.rs:81][E: codex-rs/otel/src/config.rs:82][E: codex-rs/otel/src/config.rs:83][E: codex-rs/otel/src/config.rs:84][E: codex-rs/otel/src/config.rs:88][E: codex-rs/otel/src/config.rs:89][E: codex-rs/otel/src/config.rs:93][E: codex-rs/otel/src/config.rs:94][E: codex-rs/otel/src/config.rs:99]

`TelemetryAuthMode` 只有 `ApiKey` 与 `Chatgpt`；`AuthMode::ApiKey` 和 `BedrockApiKey` 映射成 `TelemetryAuthMode::ApiKey`，`Chatgpt`、`ChatgptAuthTokens`、`AgentIdentity` 和 `PersonalAccessToken` 映射成 `TelemetryAuthMode::Chatgpt`。[E: codex-rs/otel/src/lib.rs:51][E: codex-rs/otel/src/lib.rs:52][E: codex-rs/otel/src/lib.rs:53][E: codex-rs/otel/src/lib.rs:56][E: codex-rs/otel/src/lib.rs:59][E: codex-rs/otel/src/lib.rs:60][E: codex-rs/otel/src/lib.rs:61][E: codex-rs/otel/src/lib.rs:62][E: codex-rs/otel/src/lib.rs:63]

## Exporter resolution

`resolve_exporter` 遇到 `OtelExporter::Statsig` 时，在 debug build 直接返回 `OtelExporter::None`；非 debug path 会构造 `OtelExporter::OtlpHttp`，endpoint 是 Statsig OTLP HTTP endpoint，headers 包含 Statsig API key，protocol 是 JSON，TLS 为 None。[E: codex-rs/otel/src/config.rs:10][E: codex-rs/otel/src/config.rs:20][E: codex-rs/otel/src/config.rs:21][E: codex-rs/otel/src/config.rs:24][E: codex-rs/otel/src/config.rs:25][E: codex-rs/otel/src/config.rs:27][E: codex-rs/otel/src/config.rs:28][E: codex-rs/otel/src/config.rs:30][E: codex-rs/otel/src/config.rs:31] 非 Statsig exporter 会 clone 原 exporter 返回。[E: codex-rs/otel/src/config.rs:34]

## Provider 初始化

`OtelProvider` 字段是 logger、tracer_provider、tracer 和 metrics；`shutdown()` 与 `Drop` 都会对已存在的 tracer provider、metrics client 和 logger provider 执行 flush/shutdown。[E: codex-rs/otel/src/provider.rs:56][E: codex-rs/otel/src/provider.rs:57][E: codex-rs/otel/src/provider.rs:58][E: codex-rs/otel/src/provider.rs:59][E: codex-rs/otel/src/provider.rs:60][E: codex-rs/otel/src/provider.rs:64][E: codex-rs/otel/src/provider.rs:66][E: codex-rs/otel/src/provider.rs:67][E: codex-rs/otel/src/provider.rs:69][E: codex-rs/otel/src/provider.rs:70][E: codex-rs/otel/src/provider.rs:72][E: codex-rs/otel/src/provider.rs:73][E: codex-rs/otel/src/provider.rs:197][E: codex-rs/otel/src/provider.rs:200][E: codex-rs/otel/src/provider.rs:204][E: codex-rs/otel/src/provider.rs:207]

`OtelProvider::from` 根据 log exporter、trace exporter 和 resolved metrics exporter 判断是否启用；三者都不存在时清空 process-global tracestate 并返回 `Ok(None)`。[E: codex-rs/otel/src/provider.rs:77][E: codex-rs/otel/src/provider.rs:78][E: codex-rs/otel/src/provider.rs:79][E: codex-rs/otel/src/provider.rs:80][E: codex-rs/otel/src/provider.rs:81][E: codex-rs/otel/src/provider.rs:83][E: codex-rs/otel/src/provider.rs:86][E: codex-rs/otel/src/provider.rs:88] metrics exporter 存在时创建 `MetricsClient`，runtime_metrics 为 true 时启用 runtime reader，并把 metrics client install 为 global。[E: codex-rs/otel/src/provider.rs:100][E: codex-rs/otel/src/provider.rs:103][E: codex-rs/otel/src/provider.rs:109][E: codex-rs/otel/src/provider.rs:110][E: codex-rs/otel/src/provider.rs:112][E: codex-rs/otel/src/provider.rs:140][E: codex-rs/otel/src/provider.rs:141]

logs 和 traces 各自构造 Resource；Resource attributes 包含 service version 和 env，logs resource 在 host name 可用时额外加入 `host.name`。[E: codex-rs/otel/src/provider.rs:115][E: codex-rs/otel/src/provider.rs:116][E: codex-rs/otel/src/provider.rs:212][E: codex-rs/otel/src/provider.rs:223][E: codex-rs/otel/src/provider.rs:228][E: codex-rs/otel/src/provider.rs:230][E: codex-rs/otel/src/provider.rs:233][E: codex-rs/otel/src/provider.rs:235][E: codex-rs/otel/src/provider.rs:238] trace exporter 启用时会先验证 span attributes，所有启用 path 都验证 tracestate；trace provider build 会挂 `SpanAttributesProcessor`，并把 configured tracestate 写入 global trace context。[E: codex-rs/otel/src/provider.rs:95][E: codex-rs/otel/src/provider.rs:96][E: codex-rs/otel/src/provider.rs:98][E: codex-rs/otel/src/provider.rs:123][E: codex-rs/otel/src/provider.rs:126][E: codex-rs/otel/src/provider.rs:135][E: codex-rs/otel/src/provider.rs:253][E: codex-rs/otel/src/provider.rs:261][E: codex-rs/otel/src/trace_context.rs:84][E: codex-rs/otel/src/trace_context.rs:87]

## OTLP helpers

`build_header_map` 会尝试把 string headers 转成 HTTP headers；无效 header name/value 不会返回 error，而是因为 `if let Ok(...)` 条件不满足而被跳过。[E: codex-rs/otel/src/otlp.rs:22][E: codex-rs/otel/src/otlp.rs:25][E: codex-rs/otel/src/otlp.rs:26][E: codex-rs/otel/src/otlp.rs:28][E: codex-rs/otel/src/otlp.rs:31]

gRPC TLS helper 解析 endpoint host、可读 CA certificate，并要求 client_certificate 与 client_private_key 同时存在。[E: codex-rs/otel/src/otlp.rs:39][E: codex-rs/otel/src/otlp.rs:40][E: codex-rs/otel/src/otlp.rs:48][E: codex-rs/otel/src/otlp.rs:49][E: codex-rs/otel/src/otlp.rs:53][E: codex-rs/otel/src/otlp.rs:55][E: codex-rs/otel/src/otlp.rs:56][E: codex-rs/otel/src/otlp.rs:60] HTTP client helpers 使用 `resolve_otlp_timeout`；timeout env 解析失败或为负数时返回 `None` 并继续 fallback 到 generic/default timeout。[E: codex-rs/otel/src/otlp.rs:106][E: codex-rs/otel/src/otlp.rs:152][E: codex-rs/otel/src/otlp.rs:196][E: codex-rs/otel/src/otlp.rs:197][E: codex-rs/otel/src/otlp.rs:200][E: codex-rs/otel/src/otlp.rs:203][E: codex-rs/otel/src/otlp.rs:206][E: codex-rs/otel/src/otlp.rs:208][E: codex-rs/otel/src/otlp.rs:210][E: codex-rs/otel/src/otlp.rs:212]

trace HTTP exporter 检测当前 Tokio runtime 是否 multi-thread；multi-thread 时使用 async reqwest client 和 Tokio batch span processor；非 multi-thread 分支先构造 HTTP span exporter，只有 `tls` 存在时才调用 blocking HTTP client helper，否则直接 build exporter。[E: codex-rs/otel/src/provider.rs:396][E: codex-rs/otel/src/provider.rs:404][E: codex-rs/otel/src/provider.rs:410][E: codex-rs/otel/src/provider.rs:416][E: codex-rs/otel/src/provider.rs:420][E: codex-rs/otel/src/provider.rs:422][E: codex-rs/otel/src/provider.rs:423][E: codex-rs/otel/src/provider.rs:426][E: codex-rs/otel/src/provider.rs:431][E: codex-rs/otel/src/provider.rs:436][E: codex-rs/otel/src/provider.rs:442][E: codex-rs/otel/src/provider.rs:444][E: codex-rs/otel/src/provider.rs:448][E: codex-rs/otel/src/provider.rs:452][E: codex-rs/otel/src/provider.rs:454][E: codex-rs/otel/src/provider.rs:455] runtime 检测由 `current_tokio_runtime_is_multi_thread()` 读取当前 handle 的 runtime flavor 完成。[E: codex-rs/otel/src/otlp.rs:94][E: codex-rs/otel/src/otlp.rs:96][E: codex-rs/otel/src/otlp.rs:97]

## 设计动机与权衡

`OtelProvider` 用一个 object 持有 logger/tracer/metrics handles，是为了把 provider lifetime 和 shutdown/Drop 绑定，减少进程退出前丢失 batch telemetry 的机会。[I] 该设计由 struct fields、`shutdown()` 和 `Drop` implementation 共同体现。[E: codex-rs/otel/src/provider.rs:56][E: codex-rs/otel/src/provider.rs:57][E: codex-rs/otel/src/provider.rs:58][E: codex-rs/otel/src/provider.rs:60][E: codex-rs/otel/src/provider.rs:64][E: codex-rs/otel/src/provider.rs:65][E: codex-rs/otel/src/provider.rs:70][E: codex-rs/otel/src/provider.rs:73][E: codex-rs/otel/src/provider.rs:197][E: codex-rs/otel/src/provider.rs:200][E: codex-rs/otel/src/provider.rs:204][E: codex-rs/otel/src/provider.rs:207]

Statsig 被解析成 OTLP HTTP JSON，而不是独立 transport，说明 Codex 复用 OTEL exporter 管道上报 Statsig 后端。[I] 该结论由 `resolve_exporter` 的 Statsig branch 支撑。[E: codex-rs/otel/src/config.rs:21][E: codex-rs/otel/src/config.rs:27]

## Gotchas

- debug build 默认禁用 Statsig exporter；本地开发看到 no exporter 不代表 release 行为一致。[E: codex-rs/otel/src/config.rs:15][E: codex-rs/otel/src/config.rs:20][E: codex-rs/otel/src/config.rs:21][E: codex-rs/otel/src/config.rs:24]
- header parse 不会返回 config error；invalid header 会被 `build_header_map` 跳过。[E: codex-rs/otel/src/otlp.rs:25][E: codex-rs/otel/src/otlp.rs:26][E: codex-rs/otel/src/otlp.rs:28]
- `start_global_timer` 依赖已经安装的 global metrics client；没有 global metrics 时返回 `MetricsError::ExporterDisabled`。[E: codex-rs/otel/src/lib.rs:69][E: codex-rs/otel/src/lib.rs:70][E: codex-rs/otel/src/lib.rs:71][E: codex-rs/otel/src/lib.rs:73]

## Sources

- `codex-rs/otel/src/lib.rs`
- `codex-rs/otel/src/config.rs`
- `codex-rs/otel/src/provider.rs`
- `codex-rs/otel/src/otlp.rs`
- `codex-rs/otel/src/trace_context.rs`

## 相关

- `subsys.platform.analytics`: analytics events 与 OTEL 指标/日志是不同管道。
- `config.storage-telemetry-misc`: OTEL config keys 的用户配置入口。
