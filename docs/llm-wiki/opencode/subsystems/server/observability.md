---
id: server.observability
title: Observability
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/observability/logging.ts
  - packages/core/src/observability/otlp.ts
symbols:
  - Observability.layer
  - Logging.loggers
  - Otlp.loggers
  - Otlp.tracingLayer
related:
  - ref.env-vars
evidence: explicit
status: verified
updated: 355a0bcf5
---

`server.observability` 描述 core observability layer。实现位于 `packages/core/src/observability*.ts`，包含 structured text logging、OTLP logs、OTLP traces；已读 observability files 中没有 metrics exporter。[I]

## Logging

`formatter(id = runID)` 使用 `Logger.map(Logger.formatStructured, ...)`，输出是空格分隔的 `key=value` 文本，不是 JSON object line。[E: packages/core/src/observability/logging.ts:7][E: packages/core/src/observability/logging.ts:18][E: packages/core/src/observability/logging.ts:19] formatter 加入 timestamp、level、run，并展开 messages、cause、spans、annotations。[E: packages/core/src/observability/logging.ts:10][E: packages/core/src/observability/logging.ts:11][E: packages/core/src/observability/logging.ts:12][E: packages/core/src/observability/logging.ts:13][E: packages/core/src/observability/logging.ts:14][E: packages/core/src/observability/logging.ts:15][E: packages/core/src/observability/logging.ts:16]

`runID` 是 `crypto.randomUUID().slice(0, 8)`。[E: packages/core/src/observability/shared.ts:1] `flatten()` 只递归 plain object；`plain()` 显式排除 null、非 object 和 array，并只接受 Object prototype 或 null prototype。[E: packages/core/src/observability/logging.ts:34][E: packages/core/src/observability/logging.ts:39][E: packages/core/src/observability/logging.ts:41]

`fileLogger()` 默认写到 `path.join(Global.Path.log, "opencode.log")`，并用 append flag。[E: packages/core/src/observability/logging.ts:49][E: packages/core/src/observability/logging.ts:51] `stderrLogger` 用 `process.stderr.write(formatter().log(options) + "\n")`。[E: packages/core/src/observability/logging.ts:54]

`minimumLogLevel()` 读取 `process.env.OPENCODE_LOG_LEVEL?.toUpperCase()`，支持 DEBUG、INFO、WARN、ERROR，未命中时默认 INFO。[E: packages/core/src/observability/logging.ts:57][E: packages/core/src/observability/logging.ts:58][E: packages/core/src/observability/logging.ts:62][E: packages/core/src/observability/logging.ts:64] 因为用了 `.toUpperCase()`，小写 env value 会先转大写再匹配。[E: packages/core/src/observability/logging.ts:57]

`Logging.loggers()` 在 `OPENCODE_PRINT_LOGS === "1"` 时返回 file logger + stderr logger，否则只返回 file logger。[E: packages/core/src/observability/logging.ts:68]

## OTLP

`Otlp.endpoint` 来自 `Flag.OTEL_EXPORTER_OTLP_ENDPOINT`。[E: packages/core/src/observability/otlp.ts:7] `headers` 来自 `Flag.OTEL_EXPORTER_OTLP_HEADERS`；parser 按 comma 分 entry，再按 `=` 分 key/value，value 用 `join("=")`，没有 URL decode。[E: packages/core/src/observability/otlp.ts:9][E: packages/core/src/observability/otlp.ts:10][E: packages/core/src/observability/otlp.ts:12][E: packages/core/src/observability/otlp.ts:13]

`resourceAttributes()` 读取 `process.env.OTEL_RESOURCE_ATTRIBUTES`；每个 entry 用第一个 `=` 分 key/value，并对 key/value 使用 `decodeURIComponent`，parse 失败返回 `{}`。[E: packages/core/src/observability/otlp.ts:21][E: packages/core/src/observability/otlp.ts:26][E: packages/core/src/observability/otlp.ts:28][E: packages/core/src/observability/otlp.ts:32]

OTLP resource 的 `serviceName` 固定为 `opencode`，`serviceVersion` 来自 `InstallationVersion`；attributes 先 spread `resourceAttributes()`，再写固定字段 `deployment.environment.name`、`opencode.client`、`opencode.run`、`service.instance.id`。[E: packages/core/src/observability/otlp.ts:38][E: packages/core/src/observability/otlp.ts:39][E: packages/core/src/observability/otlp.ts:41][E: packages/core/src/observability/otlp.ts:42][E: packages/core/src/observability/otlp.ts:43][E: packages/core/src/observability/otlp.ts:44][E: packages/core/src/observability/otlp.ts:45] 固定字段覆盖同名 resource attribute 是 JS object spread ordering 的结果。[I]

`Otlp.loggers()` 没有 endpoint 时返回空数组；有 endpoint 时返回 `OtlpLogger.make({ url: \`${endpoint}/v1/logs\`, resource, headers })`。[E: packages/core/src/observability/otlp.ts:51][E: packages/core/src/observability/otlp.ts:52]

`tracingLayer()` 没有 endpoint 时返回 `Layer.empty`；有 endpoint 时动态 import Node SDK、OTLP trace exporter、BatchSpanProcessor、AsyncLocalStorageContextManager 和 OpenTelemetry context。[E: packages/core/src/observability/otlp.ts:56][E: packages/core/src/observability/otlp.ts:57][E: packages/core/src/observability/otlp.ts:58][E: packages/core/src/observability/otlp.ts:59][E: packages/core/src/observability/otlp.ts:60][E: packages/core/src/observability/otlp.ts:61] 它设置 global AsyncLocalStorage context manager，并返回 `NodeSdk.layer`，trace exporter URL 是 `${endpoint}/v1/traces`。[E: packages/core/src/observability/otlp.ts:64][E: packages/core/src/observability/otlp.ts:66][E: packages/core/src/observability/otlp.ts:68][E: packages/core/src/observability/otlp.ts:72]

## Layer composition

`Observability.layer` 合并 `Logging.loggers()` 与 `Otlp.loggers()`，用 `Logger.layer(..., { mergeWithExisting: false })` 安装 loggers，并提供 Node filesystem、OTLP JSON serialization、FetchHttpClient 和 `References.MinimumLogLevel`。[E: packages/core/src/observability.ts:12][E: packages/core/src/observability.ts:13][E: packages/core/src/observability.ts:14][E: packages/core/src/observability.ts:15][E: packages/core/src/observability.ts:17] 最终 layer 是 logs layer 与 `Otlp.tracingLayer` 的 merge。[E: packages/core/src/observability.ts:19]

## V1 host usage

虽然 implementation 在 core，`packages/opencode` runtime 文件也提供 `Observability.layer`: app runtime、bootstrap runtime、generic `makeRuntime`、HTTP route layer 都引用它。[E: packages/opencode/src/effect/app-runtime.ts:105][E: packages/opencode/src/effect/bootstrap-runtime.ts:21][E: packages/opencode/src/effect/run-service.ts:35][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:263] 因此本节点 frontmatter 标 `v: v2` 表示源码归属 core/V2；实际 runtime 影响跨 V1 host 和 V2 core。[I]

## Boundary

已读 `packages/core/src/observability/logging.ts`、`otlp.ts`、`observability.ts` 只定义 logging 和 tracing layer，没有 metrics exporter symbol；“无 metrics”是基于该 source set 的缺席结论。[I]

## Sources

- `packages/core/src/observability/logging.ts`
- `packages/core/src/observability/otlp.ts`
- `packages/core/src/observability/shared.ts`
- `packages/core/src/observability.ts`
- `packages/opencode/src/effect/app-runtime.ts`
- `packages/opencode/src/effect/bootstrap-runtime.ts`
- `packages/opencode/src/effect/run-service.ts`
- `packages/opencode/src/server/routes/instance/httpapi/server.ts`

## Related

- [ref.env-vars](../../reference/env-vars.md)
