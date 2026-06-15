---
id: subsys.platform.telemetry-otel
title: 遥测 / OTEL
kind: subsystem
tier: T2
source: [codex-rs/otel/src/lib.rs, codex-rs/otel/src/config.rs, codex-rs/otel/src/provider.rs, codex-rs/otel/src/otlp.rs]
symbols: [OtelSettings, OtelExporter, OtelProvider, resolve_exporter, build_header_map, default_otlp_timeout]
related: [subsys.platform.analytics, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `codex_otel` 是 Codex 的 OpenTelemetry provider crate：它导出 OTEL settings/exporter types 和 `OtelProvider`，把 Statsig exporter 解析成 OTLP HTTP JSON 或在 debug build 中禁用，并按 settings 构造 logs/traces/metrics exporters。[E: codex-rs/otel/src/lib.rs:14][E: codex-rs/otel/src/lib.rs:16][E: codex-rs/otel/src/lib.rs:25][E: codex-rs/otel/src/config.rs:17][E: codex-rs/otel/src/config.rs:21][E: codex-rs/otel/src/provider.rs:67]

## 能回答的问题

- `OtelSettings` 与 `OtelExporter` 的真实字段是什么？
- Statsig exporter 在 debug/release 下怎样解析？
- `OtelProvider::from` 什么时候返回 `None`，什么时候安装 global metrics/tracer provider？
- logs/traces 的 gRPC/HTTP/TLS/client 构造分别走哪些 helper？
- header parse、timeout parse、TLS 文件读取的失败语义是什么？

## 数据模型

`OtelSettings` 字段是 environment、service_name、service_version、codex_home、exporter、trace_exporter、metrics_exporter 和 runtime_metrics。[E: codex-rs/otel/src/config.rs:36][E: codex-rs/otel/src/config.rs:37][E: codex-rs/otel/src/config.rs:38][E: codex-rs/otel/src/config.rs:39][E: codex-rs/otel/src/config.rs:40][E: codex-rs/otel/src/config.rs:41][E: codex-rs/otel/src/config.rs:42][E: codex-rs/otel/src/config.rs:43][E: codex-rs/otel/src/config.rs:44] protocol、headers 和 TLS 不在 `OtelSettings` 顶层，而是在 `OtelExporter::OtlpGrpc` / `OtelExporter::OtlpHttp` variants 中。[E: codex-rs/otel/src/config.rs:69][E: codex-rs/otel/src/config.rs:71][E: codex-rs/otel/src/config.rs:72][E: codex-rs/otel/src/config.rs:74][E: codex-rs/otel/src/config.rs:76][E: codex-rs/otel/src/config.rs:77][E: codex-rs/otel/src/config.rs:78]

`OtelExporter` variants 是 `None`、`Statsig`、`OtlpGrpc` 和 `OtlpHttp`；`OtelHttpProtocol` variants 是 `Binary` 和 `Json`；`OtelTlsConfig` 支持 CA certificate、client certificate 和 client private key paths。[E: codex-rs/otel/src/config.rs:63][E: codex-rs/otel/src/config.rs:64][E: codex-rs/otel/src/config.rs:68][E: codex-rs/otel/src/config.rs:69][E: codex-rs/otel/src/config.rs:74][E: codex-rs/otel/src/config.rs:48][E: codex-rs/otel/src/config.rs:50][E: codex-rs/otel/src/config.rs:52][E: codex-rs/otel/src/config.rs:56][E: codex-rs/otel/src/config.rs:57][E: codex-rs/otel/src/config.rs:58][E: codex-rs/otel/src/config.rs:59]

`TelemetryAuthMode` 只有 `ApiKey` 与 `Chatgpt`；`AuthMode::Chatgpt`、`ChatgptAuthTokens` 和 `AgentIdentity` 都映射成 `TelemetryAuthMode::Chatgpt`。[E: codex-rs/otel/src/lib.rs:45][E: codex-rs/otel/src/lib.rs:46][E: codex-rs/otel/src/lib.rs:47][E: codex-rs/otel/src/lib.rs:53][E: codex-rs/otel/src/lib.rs:54][E: codex-rs/otel/src/lib.rs:55][E: codex-rs/otel/src/lib.rs:56]

## Exporter resolution

`resolve_exporter` 遇到 `OtelExporter::Statsig` 时，在 debug build 直接返回 `OtelExporter::None`；非 debug path 会构造 `OtelExporter::OtlpHttp`，endpoint 是 Statsig OTLP HTTP endpoint，headers 包含 Statsig API key，protocol 是 JSON，TLS 为 None。[E: codex-rs/otel/src/config.rs:10][E: codex-rs/otel/src/config.rs:12][E: codex-rs/otel/src/config.rs:17][E: codex-rs/otel/src/config.rs:18][E: codex-rs/otel/src/config.rs:21][E: codex-rs/otel/src/config.rs:22][E: codex-rs/otel/src/config.rs:23][E: codex-rs/otel/src/config.rs:27][E: codex-rs/otel/src/config.rs:28] 非 Statsig exporter 会 clone 原 exporter 返回。[E: codex-rs/otel/src/config.rs:31]

## Provider 初始化

`OtelProvider` 字段是 logger、tracer_provider、tracer 和 metrics；`shutdown()` 与 `Drop` 都会对已存在的 tracer provider、metrics client 和 logger provider 执行 flush/shutdown。[E: codex-rs/otel/src/provider.rs:46][E: codex-rs/otel/src/provider.rs:47][E: codex-rs/otel/src/provider.rs:48][E: codex-rs/otel/src/provider.rs:49][E: codex-rs/otel/src/provider.rs:50][E: codex-rs/otel/src/provider.rs:54][E: codex-rs/otel/src/provider.rs:56][E: codex-rs/otel/src/provider.rs:57][E: codex-rs/otel/src/provider.rs:60][E: codex-rs/otel/src/provider.rs:63][E: codex-rs/otel/src/provider.rs:166][E: codex-rs/otel/src/provider.rs:167][E: codex-rs/otel/src/provider.rs:170][E: codex-rs/otel/src/provider.rs:173]

`OtelProvider::from` 根据 log exporter、trace exporter 和 resolved metrics exporter 判断是否启用；三者都不存在时返回 `Ok(None)`。[E: codex-rs/otel/src/provider.rs:68][E: codex-rs/otel/src/provider.rs:69][E: codex-rs/otel/src/provider.rs:71][E: codex-rs/otel/src/provider.rs:72][E: codex-rs/otel/src/provider.rs:91][E: codex-rs/otel/src/provider.rs:93] metrics exporter 存在时创建 `MetricsClient`，runtime_metrics 为 true 时启用 runtime reader，并把 metrics client install 为 global。[E: codex-rs/otel/src/provider.rs:75][E: codex-rs/otel/src/provider.rs:81][E: codex-rs/otel/src/provider.rs:82][E: codex-rs/otel/src/provider.rs:84][E: codex-rs/otel/src/provider.rs:87][E: codex-rs/otel/src/provider.rs:88]

logs 和 traces 各自构造 Resource；Resource attributes 包含 service version 和 env，logs resource 在 host name 可用时额外加入 `host.name`。[E: codex-rs/otel/src/provider.rs:96][E: codex-rs/otel/src/provider.rs:97][E: codex-rs/otel/src/provider.rs:178][E: codex-rs/otel/src/provider.rs:180][E: codex-rs/otel/src/provider.rs:194][E: codex-rs/otel/src/provider.rs:196][E: codex-rs/otel/src/provider.rs:199][E: codex-rs/otel/src/provider.rs:201][E: codex-rs/otel/src/provider.rs:204] global tracer provider 和 text map propagator 只在 tracer provider 存在时安装。[E: codex-rs/otel/src/provider.rs:110][E: codex-rs/otel/src/provider.rs:111][E: codex-rs/otel/src/provider.rs:112]

## OTLP helpers

`build_header_map` 会尝试把 string headers 转成 HTTP headers；无效 header name/value 不会返回 error，而是因为 `if let Ok(...)` 条件不满足而被跳过。[E: codex-rs/otel/src/otlp.rs:22][E: codex-rs/otel/src/otlp.rs:25][E: codex-rs/otel/src/otlp.rs:26][E: codex-rs/otel/src/otlp.rs:28][E: codex-rs/otel/src/otlp.rs:31]

gRPC TLS helper 解析 endpoint host、可读 CA certificate，并要求 client_certificate 与 client_private_key 同时存在。[E: codex-rs/otel/src/otlp.rs:39][E: codex-rs/otel/src/otlp.rs:40][E: codex-rs/otel/src/otlp.rs:48][E: codex-rs/otel/src/otlp.rs:49][E: codex-rs/otel/src/otlp.rs:53][E: codex-rs/otel/src/otlp.rs:55][E: codex-rs/otel/src/otlp.rs:56][E: codex-rs/otel/src/otlp.rs:60] HTTP client helpers 使用 `resolve_otlp_timeout`；timeout env 解析失败或为负数时返回 `None` 并继续 fallback 到 generic/default timeout。[E: codex-rs/otel/src/otlp.rs:106][E: codex-rs/otel/src/otlp.rs:152][E: codex-rs/otel/src/otlp.rs:196][E: codex-rs/otel/src/otlp.rs:197][E: codex-rs/otel/src/otlp.rs:200][E: codex-rs/otel/src/otlp.rs:203][E: codex-rs/otel/src/otlp.rs:206][E: codex-rs/otel/src/otlp.rs:208][E: codex-rs/otel/src/otlp.rs:210][E: codex-rs/otel/src/otlp.rs:212]

trace HTTP exporter 检测当前 Tokio runtime 是否 multi-thread；multi-thread 时使用 async reqwest client 和 Tokio batch span processor；非 multi-thread 分支先构造 HTTP span exporter，只有 `tls` 存在时才调用 blocking HTTP client helper，否则直接 build exporter。[E: codex-rs/otel/src/provider.rs:328][E: codex-rs/otel/src/provider.rs:340][E: codex-rs/otel/src/provider.rs:346][E: codex-rs/otel/src/provider.rs:347][E: codex-rs/otel/src/provider.rs:361][E: codex-rs/otel/src/provider.rs:367][E: codex-rs/otel/src/provider.rs:369][E: codex-rs/otel/src/provider.rs:373] runtime 检测由 `current_tokio_runtime_is_multi_thread()` 读取当前 handle 的 runtime flavor 完成。[E: codex-rs/otel/src/otlp.rs:94][E: codex-rs/otel/src/otlp.rs:96][E: codex-rs/otel/src/otlp.rs:97]

## 设计动机与权衡

`OtelProvider` 用一个 object 持有 logger/tracer/metrics handles，是为了把 provider lifetime 和 shutdown/Drop 绑定，减少进程退出前丢失 batch telemetry 的机会。[I] 该设计由 struct fields、`shutdown()` 和 `Drop` implementation 共同体现。[E: codex-rs/otel/src/provider.rs:46][E: codex-rs/otel/src/provider.rs:54][E: codex-rs/otel/src/provider.rs:163]

Statsig 被解析成 OTLP HTTP JSON，而不是独立 transport，说明 Codex 复用 OTEL exporter 管道上报 Statsig 后端。[I] 该结论由 `resolve_exporter` 的 Statsig branch 支撑。[E: codex-rs/otel/src/config.rs:21][E: codex-rs/otel/src/config.rs:27]

## Gotchas

- debug build 默认禁用 Statsig exporter；本地开发看到 no exporter 不代表 release 行为一致。[E: codex-rs/otel/src/config.rs:17][E: codex-rs/otel/src/config.rs:18]
- header parse 不会返回 config error；invalid header 会被 `build_header_map` 跳过。[E: codex-rs/otel/src/otlp.rs:25][E: codex-rs/otel/src/otlp.rs:26][E: codex-rs/otel/src/otlp.rs:28]
- `start_global_timer` 依赖已经安装的 global metrics client；没有 global metrics 时返回 `MetricsError::ExporterDisabled`。[E: codex-rs/otel/src/lib.rs:62][E: codex-rs/otel/src/lib.rs:63][E: codex-rs/otel/src/lib.rs:64][E: codex-rs/otel/src/lib.rs:66]

## Sources

- `codex-rs/otel/src/lib.rs`
- `codex-rs/otel/src/config.rs`
- `codex-rs/otel/src/provider.rs`
- `codex-rs/otel/src/otlp.rs`

## 相关

- `subsys.platform.analytics`: analytics events 与 OTEL 指标/日志是不同管道。
- `config.storage-telemetry-misc`: OTEL config keys 的用户配置入口。
