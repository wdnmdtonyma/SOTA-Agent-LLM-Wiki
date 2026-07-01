---
id: tool.test-sync-tool
title: test_sync_tool 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/test_sync_spec.rs, codex-rs/core/src/tools/handlers/test_sync.rs, codex-rs/protocol/src/openai_models.rs]
symbols: [TestSyncHandler, create_test_sync_tool, wait_on_barrier, TestSyncArgs, BarrierArgs]
related: [spine.tool-call-anatomy, subsys.core.tool-system]
evidence: explicit
status: verified
updated: db887d03e1
---

> `test_sync_tool` 是 Codex integration tests 使用的内部 Function 工具；当前 spec 与 handler 都在 `codex-rs/core/src/tools/handlers/` 下，只有模型 metadata 的 `experimental_supported_tools` 包含 `"test_sync_tool"` 时才注册。[E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:51][E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:53][E: codex-rs/core/src/tools/spec_plan.rs:771][E: codex-rs/core/src/tools/spec_plan.rs:777]

## 能回答的问题

- `test_sync_tool` 的 spec 和 handler 现在在哪里？
- 它如何通过 model metadata 门控？
- `sleep_before_ms`、`sleep_after_ms`、`barrier` 的 schema 与 runtime 行为是什么？
- barrier 状态如何共享、校验和清理？
- 为什么它支持 parallel tool calls？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `test_sync_tool` | `ResponsesApiTool.name` 固定为 `test_sync_tool`，handler 的 `tool_name()` 也返回同名 plain tool。[E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:52][E: codex-rs/core/src/tools/handlers/test_sync.rs:60][E: codex-rs/core/src/tools/handlers/test_sync.rs:62] |
| ToolSpec 类型 | `ToolSpec::Function(ResponsesApiTool)` | `create_test_sync_tool` 返回 `ToolSpec::Function`。[E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:51] |
| handler | `TestSyncHandler` | handler 实现 `ToolExecutor<ToolInvocation>`，`spec()` 返回 `create_test_sync_tool()`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:23][E: codex-rs/core/src/tools/handlers/test_sync.rs:60][E: codex-rs/core/src/tools/handlers/test_sync.rs:66] |
| parallel-safe | true | `supports_parallel_tool_calls()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:69][E: codex-rs/core/src/tools/handlers/test_sync.rs:70] |
| 用途 | integration-test 同步辅助 | tool description 写明 “Internal synchronization helper used by Codex integration tests.”[E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:51][E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:54] |

## 2 注册与门控

`add_core_utility_tools` 只有在 `turn_context.model_info.experimental_supported_tools` 中找到 `"test_sync_tool"` 时，才把 `TestSyncHandler` 加入 planned tools。[E: codex-rs/core/src/tools/spec_plan.rs:771][E: codex-rs/core/src/tools/spec_plan.rs:775][E: codex-rs/core/src/tools/spec_plan.rs:777]
这个 gate 来自 model metadata 字段 `experimental_supported_tools: Vec<String>`，不是普通 feature flag。[E: codex-rs/protocol/src/openai_models.rs:407]

## 3 输入 schema

| 字段 | 类型 | 必填 | 默认 | 行为 |
|---|---|---:|---|---|
| `sleep_before_ms` | number | 否 | 无 | schema 描述为动作前 delay；handler 仅在值存在且大于 0 时 sleep。[E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:30][E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:32][E: codex-rs/core/src/tools/handlers/test_sync.rs:96][E: codex-rs/core/src/tools/handlers/test_sync.rs:99] |
| `sleep_after_ms` | number | 否 | 无 | schema 描述为 barrier 后 delay；handler 仅在值存在且大于 0 时 sleep。[E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:36][E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:38][E: codex-rs/core/src/tools/handlers/test_sync.rs:106][E: codex-rs/core/src/tools/handlers/test_sync.rs:109] |
| `barrier` | object | 否 | 无 | 对象 schema 的 required 字段是 `id` 与 `participants`，`additionalProperties` 为 false。[E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:42][E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:45][E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:46] |
| `barrier.id` | string | 是 | 无 | 多个调用共享的 rendezvous identifier。[E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:9][E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:11] |
| `barrier.participants` | number | 是 | 无 | barrier 打开前需要到达的调用数；runtime 拒绝 0。[E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:15][E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:17][E: codex-rs/core/src/tools/handlers/test_sync.rs:121][E: codex-rs/core/src/tools/handlers/test_sync.rs:122] |
| `barrier.timeout_ms` | number | 否 | `1000` | schema 描述默认 1000；serde default 指向 `DEFAULT_TIMEOUT_MS = 1_000`，runtime 拒绝 0。[E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:21][E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:23][E: codex-rs/core/src/tools/handlers/test_sync.rs:25][E: codex-rs/core/src/tools/handlers/test_sync.rs:38][E: codex-rs/core/src/tools/handlers/test_sync.rs:128][E: codex-rs/core/src/tools/handlers/test_sync.rs:129] |

顶层 schema 没有 required 字段，`additionalProperties` 为 false；`strict` 为 false，`output_schema` 为 `None`。[E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:54][E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:56][E: codex-rs/core/src/tools/handlers/test_sync_spec.rs:57]

## 4 Handler 走读

handler 只接受 Function payload；若收到其他 payload，会返回给模型的错误文本 `test_sync_tool handler received unsupported payload`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:83][E: codex-rs/core/src/tools/handlers/test_sync.rs:86][E: codex-rs/core/src/tools/handlers/test_sync.rs:89]
参数通过 `parse_arguments` 解析为 `TestSyncArgs`，字段顺序是：先 `sleep_before_ms`，再等待可选 barrier，最后 `sleep_after_ms`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:94][E: codex-rs/core/src/tools/handlers/test_sync.rs:96][E: codex-rs/core/src/tools/handlers/test_sync.rs:102][E: codex-rs/core/src/tools/handlers/test_sync.rs:106]

成功输出固定为文本 `ok`，并标记 success 为 true。[E: codex-rs/core/src/tools/handlers/test_sync.rs:112][E: codex-rs/core/src/tools/handlers/test_sync.rs:113][E: codex-rs/core/src/tools/handlers/test_sync.rs:114]

## 5 Barrier 行为

barrier 状态保存在进程级 `OnceLock<Mutex<HashMap<String, BarrierState>>>` 中，`BarrierState` 保存共享 `tokio::sync::Barrier` 和 participants 数。[E: codex-rs/core/src/tools/handlers/test_sync.rs:27][E: codex-rs/core/src/tools/handlers/test_sync.rs:29][E: codex-rs/core/src/tools/handlers/test_sync.rs:30][E: codex-rs/core/src/tools/handlers/test_sync.rs:31]
`wait_on_barrier` 用 barrier id 查找或创建共享 barrier；如果同 id 已存在但 participants 不同，会返回 `already registered with ... participants` 错误。[E: codex-rs/core/src/tools/handlers/test_sync.rs:134][E: codex-rs/core/src/tools/handlers/test_sync.rs:137][E: codex-rs/core/src/tools/handlers/test_sync.rs:140][E: codex-rs/core/src/tools/handlers/test_sync.rs:142][E: codex-rs/core/src/tools/handlers/test_sync.rs:149]

实际等待由 `tokio::time::timeout(timeout, barrier.wait())` 包住；超时返回 `test_sync_tool barrier wait timed out`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:159][E: codex-rs/core/src/tools/handlers/test_sync.rs:160][E: codex-rs/core/src/tools/handlers/test_sync.rs:163]
只有正常通过 barrier 的 leader 会在 map 中移除对应 id，避免后续调用复用已完成 barrier。[E: codex-rs/core/src/tools/handlers/test_sync.rs:166][E: codex-rs/core/src/tools/handlers/test_sync.rs:171]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/test_sync_spec.rs`
- `codex-rs/core/src/tools/handlers/test_sync.rs`
- `codex-rs/protocol/src/openai_models.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
