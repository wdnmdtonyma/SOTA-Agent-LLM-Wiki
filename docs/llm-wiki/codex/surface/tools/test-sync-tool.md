---
id: tool.test-sync-tool
title: test_sync_tool 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/utility_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_config.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/test_sync.rs, codex-rs/protocol/src/openai_models.rs]
symbols: [create_test_sync_tool, ToolHandlerKind::TestSync, TestSyncHandler, wait_on_barrier]
related: [spine.tool-call-anatomy, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `test_sync_tool` 是 Codex integration tests 使用的内部同步工具；它可以在工具调用前后 sleep，或者让多个并发工具调用在同一个 barrier 上 rendezvous。[E: codex-rs/tools/src/utility_tool.rs:89][E: codex-rs/core/src/tools/handlers/test_sync.rs:77][E: codex-rs/core/src/tools/handlers/test_sync.rs:83][E: codex-rs/core/src/tools/handlers/test_sync.rs:87]

## 能回答的问题

- `test_sync_tool` 为什么存在，正常用户任务是否应依赖它？
- `test_sync_tool` 的 barrier 输入字段和 runtime 校验是什么？
- `test_sync_tool` 如何用全局 barrier 状态同步并发工具调用？
- `test_sync_tool` 的注册 gate 是 feature flag 还是 model metadata？
- `test_sync_tool` 为什么被标成 parallel-safe？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `test_sync_tool` | `ResponsesApiTool.name` 固定为 `test_sync_tool`。[E: codex-rs/tools/src/utility_tool.rs:88] |
| aliases | 未看到独立 alias。 | registry 注册 `"test_sync_tool"`。[E: codex-rs/tools/src/tool_registry_plan.rs:358][I] |
| ToolSpec 类型 | `ToolSpec::Function(ResponsesApiTool)` | `create_test_sync_tool` 返回 `ToolSpec::Function`。[E: codex-rs/tools/src/utility_tool.rs:87] |
| ToolHandlerKind | `ToolHandlerKind::TestSync` | registry 注册 `ToolHandlerKind::TestSync`。[E: codex-rs/tools/src/tool_registry_plan.rs:358] |
| core handler | `TestSyncHandler` | `core/src/tools/spec.rs` 把 `ToolHandlerKind::TestSync` 注册为 `Arc::new(TestSyncHandler)`。[E: codex-rs/core/src/tools/spec.rs:263][E: codex-rs/core/src/tools/spec.rs:264] |
| 所属 crate | spec 在 `codex-tools`，执行在 `codex-core`。 | `utility_tool.rs` 创建 spec，`test_sync.rs` 实现 handler。[E: codex-rs/tools/src/utility_tool.rs:42][E: codex-rs/core/src/tools/handlers/test_sync.rs:19] |

## 2 用途定位

工具描述直接标注 `Internal synchronization helper used by Codex integration tests`，因此它是测试辅助 surface，不是面向用户工作流的常规能力。[E: codex-rs/tools/src/utility_tool.rs:89][I]  
handler 支持三种动作：可选 `sleep_before_ms`、可选 `barrier`、可选 `sleep_after_ms`，并按这个顺序执行。[E: codex-rs/core/src/tools/handlers/test_sync.rs:77][E: codex-rs/core/src/tools/handlers/test_sync.rs:83][E: codex-rs/core/src/tools/handlers/test_sync.rs:87]  
成功输出固定为文本 `ok`，success 为 true。[E: codex-rs/core/src/tools/handlers/test_sync.rs:93]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `sleep_before_ms` | number | 否 | 无 | 在其他动作前等待的毫秒数。 | handler 仅在 `Some(delay)` 且 `delay > 0` 时 sleep。[E: codex-rs/tools/src/utility_tool.rs:66][E: codex-rs/core/src/tools/handlers/test_sync.rs:77][E: codex-rs/core/src/tools/handlers/test_sync.rs:78][E: codex-rs/core/src/tools/handlers/test_sync.rs:80] |
| `sleep_after_ms` | number | 否 | 无 | barrier 完成后等待的毫秒数。 | handler 仅在 `Some(delay)` 且 `delay > 0` 时 sleep。[E: codex-rs/tools/src/utility_tool.rs:72][E: codex-rs/core/src/tools/handlers/test_sync.rs:87][E: codex-rs/core/src/tools/handlers/test_sync.rs:88][E: codex-rs/core/src/tools/handlers/test_sync.rs:90] |
| `barrier` | object | 否 | 无 | 让多个 concurrent calls 在同一 barrier rendezvous。 | `barrier` 对象 required 包含 `id` 与 `participants`。[E: codex-rs/tools/src/utility_tool.rs:78][E: codex-rs/tools/src/utility_tool.rs:81] |
| `barrier.id` | string | 是 | 无 | barrier identifier。 | handler 用 id 作为全局 map key。[E: codex-rs/tools/src/utility_tool.rs:45][E: codex-rs/core/src/tools/handlers/test_sync.rs:110][E: codex-rs/core/src/tools/handlers/test_sync.rs:113] |
| `barrier.participants` | number | 是 | 无 | barrier 打开前需要到达的 tool calls 数量。 | handler 拒绝 `participants == 0`。[E: codex-rs/tools/src/utility_tool.rs:51][E: codex-rs/core/src/tools/handlers/test_sync.rs:98] |
| `barrier.timeout_ms` | number | 否 | `1000` | 在 barrier 上最多等待的毫秒数。 | `BarrierArgs.timeout_ms` serde default 是 `default_timeout_ms`，常量为 `1_000`；handler 拒绝 `timeout_ms == 0`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:21][E: codex-rs/core/src/tools/handlers/test_sync.rs:34][E: codex-rs/core/src/tools/handlers/test_sync.rs:104] |

`create_test_sync_tool` 顶层 `parameters` 没有 required 字段，且 `additionalProperties` 为 false。[E: codex-rs/tools/src/utility_tool.rs:92]  
runtime 参数结构 `TestSyncArgs` 对三个字段都使用 serde default；当三个字段都缺省时，handler 会跳过 sleep/barrier 并返回 `ok`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:40][E: codex-rs/core/src/tools/handlers/test_sync.rs:42][E: codex-rs/core/src/tools/handlers/test_sync.rs:44][E: codex-rs/core/src/tools/handlers/test_sync.rs:93][I]

## 4 输出 schema & 截断

`test_sync_tool` 的 `ResponsesApiTool.output_schema` 为 `None`。[E: codex-rs/tools/src/utility_tool.rs:93]  
handler 成功输出固定文本 `ok`；源码中没有看到专用截断逻辑。[E: codex-rs/core/src/tools/handlers/test_sync.rs:93][I]  
失败路径会返回给模型可读错误，例如 participants 为 0、timeout 为 0、或 barrier wait timed out。[E: codex-rs/core/src/tools/handlers/test_sync.rs:100][E: codex-rs/core/src/tools/handlers/test_sync.rs:106][E: codex-rs/core/src/tools/handlers/test_sync.rs:139]

## 5 ToolSpec 类型

`test_sync_tool` 是普通 Function ToolSpec；core handler 接收 Function payload 后本地执行 sleep/barrier 逻辑。[E: codex-rs/tools/src/utility_tool.rs:87][E: codex-rs/core/src/tools/handlers/test_sync.rs:66][E: codex-rs/core/src/tools/handlers/test_sync.rs:80][E: codex-rs/core/src/tools/handlers/test_sync.rs:84][I]  
`TestSyncHandler.kind()` 返回 `ToolKind::Function`，只接受 `ToolPayload::Function`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:59][E: codex-rs/core/src/tools/handlers/test_sync.rs:66]

## 6 注册与门控

`build_tool_registry_plan` 只有当 `config.experimental_supported_tools` 包含字符串 `"test_sync_tool"` 时才 push spec 并注册 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:348][E: codex-rs/tools/src/tool_registry_plan.rs:351][E: codex-rs/tools/src/tool_registry_plan.rs:358]  
该 gate 来自 model metadata 的 `experimental_supported_tools`，`ToolsConfig::new` 会把 `model_info.experimental_supported_tools.clone()` 写入 config。[E: codex-rs/protocol/src/openai_models.rs:292][E: codex-rs/tools/src/tool_config.rs:232]  
这意味着 `test_sync_tool` 不是由常规 user config feature key 单独开启，而是模型 metadata/测试配置注入的 supported tool。[I]

## 7 parallel-safe

`test_sync_tool` 的 `supports_parallel_tool_calls` 实际值是 `true`。[E: codex-rs/tools/src/tool_registry_plan.rs:355]  
这个值与工具用途一致：barrier 必须允许多个 concurrent tool calls 同时到达，否则无法测试并发调度。[E: codex-rs/core/src/tools/handlers/test_sync.rs:83][I]  
handler 使用 `OnceLock<Mutex<HashMap<String, BarrierState>>>` 保存全局 barrier 状态，多个调用按 `id` 查找或创建同一个 `tokio::sync::Barrier`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:23][E: codex-rs/core/src/tools/handlers/test_sync.rs:113][E: codex-rs/core/src/tools/handlers/test_sync.rs:122][E: codex-rs/core/src/tools/handlers/test_sync.rs:125]

## 8 handler 走读

1. `ToolHandlerKind::TestSync` 在 `core/src/tools/spec.rs` 注册为 `TestSyncHandler`。[E: codex-rs/core/src/tools/spec.rs:264]
2. handler 拒绝非 Function payload。[E: codex-rs/core/src/tools/handlers/test_sync.rs:66][E: codex-rs/core/src/tools/handlers/test_sync.rs:70]
3. handler 解析 `TestSyncArgs`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:75]
4. 如果 `sleep_before_ms` 大于 0，则 `tokio::time::sleep(Duration::from_millis(delay)).await`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:77][E: codex-rs/core/src/tools/handlers/test_sync.rs:80]
5. 如果存在 `barrier`，调用 `wait_on_barrier`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:84]
6. `wait_on_barrier` 校验 participants 和 timeout 都大于 0。[E: codex-rs/core/src/tools/handlers/test_sync.rs:98][E: codex-rs/core/src/tools/handlers/test_sync.rs:104]
7. 若同 id barrier 已存在，handler 要求 participants 一致；否则返回 `already registered with ... participants`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:114][E: codex-rs/core/src/tools/handlers/test_sync.rs:118]
8. 若 id 未注册，handler 创建 `Barrier::new(args.participants)` 并写入 map。[E: codex-rs/core/src/tools/handlers/test_sync.rs:125][E: codex-rs/core/src/tools/handlers/test_sync.rs:126]
9. `tokio::time::timeout(timeout, barrier.wait())` 超时时返回 `test_sync_tool barrier wait timed out`；只有正常 wait 完成后，leader 才会清理 map 中对应 barrier。[E: codex-rs/core/src/tools/handlers/test_sync.rs:136][E: codex-rs/core/src/tools/handlers/test_sync.rs:139][E: codex-rs/core/src/tools/handlers/test_sync.rs:142][E: codex-rs/core/src/tools/handlers/test_sync.rs:147]
10. 如果 `sleep_after_ms` 大于 0，则最后再 sleep，并返回 `ok`。[E: codex-rs/core/src/tools/handlers/test_sync.rs:87][E: codex-rs/core/src/tools/handlers/test_sync.rs:90][E: codex-rs/core/src/tools/handlers/test_sync.rs:93]

## 9 设计动机·edge·历史

`test_sync_tool` 的存在是为了测试 tool scheduler 的同步、超时与并发行为，而不是为最终用户提供业务工具。[E: codex-rs/tools/src/utility_tool.rs:89][I]  
同一 barrier id 重复使用时，只有正常通过 barrier 的 leader 会移除 map entry；如果 timeout 发生，当前调用会在 cleanup 前返回错误。[E: codex-rs/core/src/tools/handlers/test_sync.rs:136][E: codex-rs/core/src/tools/handlers/test_sync.rs:139][E: codex-rs/core/src/tools/handlers/test_sync.rs:142][I]  
因为 barrier state 是 process-global static，测试之间若复用 id 且未完成 barrier，可能互相影响；测试应使用唯一 id。[E: codex-rs/core/src/tools/handlers/test_sync.rs:23][I]

## Sources

- `codex-rs/tools/src/utility_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/test_sync.rs`
- `codex-rs/protocol/src/openai_models.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
