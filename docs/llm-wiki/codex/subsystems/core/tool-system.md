---
id: subsys.core.tool-system
title: 工具系统机制
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/handlers/wait_for_environment.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/state/migrations/0042_drop_agent_jobs.sql]
symbols: [add_core_tool_sources, add_core_utility_tools, add_shell_tools, CoreToolRuntime, ToolExposure]
related: [spine.tool-call-anatomy, subsys.core.tool-router, subsys.core.unified-exec, tool.exec-command, tool.wait-for-environment, tool.current-time, tool.tool-search, tool.web-search, tool.image-generation]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> 当前工具系统以可变 `ToolRegistry` 为 runtime 装配中心；hosted specs 作为独立列表传入 `finalize_tool_router`，再与 registry 生成的 direct、deferred search 与 code-mode surfaces 汇合。旧的 `PlannedTools` 中间容器已经移除。[E: codex-rs/core/src/tools/spec_plan.rs:114][E: codex-rs/core/src/tools/spec_plan.rs:138][E: codex-rs/core/src/tools/spec_plan.rs:157][E: codex-rs/core/src/tools/spec_plan.rs:161][E: codex-rs/core/src/tools/spec_plan.rs:163][E: codex-rs/core/src/tools/spec_plan.rs:236]

## 核心对象

| 对象 | 当前职责 |
|---|---|
| `ToolSpec` | Responses API 的 schema union：Function、Namespace、ToolSearch、WebSearch、Freeform。[E: codex-rs/tools/src/tool_spec.rs:20][E: codex-rs/tools/src/tool_spec.rs:52] |
| `CoreToolRuntime` | core 执行 contract；除 `ToolExecutor` 的 spec/exposure/parallel/handle 外，还提供 readiness、payload、cancellation、hooks 与 telemetry。[E: codex-rs/tools/src/tool_executor.rs:56][E: codex-rs/core/src/tools/registry.rs:53][E: codex-rs/core/src/tools/registry.rs:55] |
| `RegisteredTool` | 一个 runtime 加上最终 exposure 等 registry 元数据；model surface 使用其 effective exposure。[E: codex-rs/core/src/tools/registry.rs:245][E: codex-rs/core/src/tools/registry.rs:248] |
| `ToolRegistry` | 用 `IndexMap` 保序保存 runtime registrations 与 effective exposure，并处理可信/外部名字冲突；它不保存 hosted specs。[E: codex-rs/core/src/tools/registry.rs:245][E: codex-rs/core/src/tools/registry.rs:245][E: codex-rs/core/src/tools/registry.rs:248][E: codex-rs/core/src/tools/registry.rs:254][E: codex-rs/core/src/tools/registry.rs:254][E: codex-rs/core/src/tools/registry.rs:289] |
| `ToolRouter` | 冻结后的 registry + model-visible specs；归一 model output 并执行 dispatch。[E: codex-rs/core/src/tools/router.rs:68][E: codex-rs/core/src/tools/router.rs:70][E: codex-rs/core/src/tools/router.rs:99] |

## 装配阶段

1. `build_tool_router` 创建 registry，调用 `add_core_tool_sources`，再注册 MCP、extension、dynamic runtimes；hosted specs 单独由 `hosted_model_tool_specs` 返回。[E: codex-rs/core/src/tools/spec_plan.rs:114][E: codex-rs/core/src/tools/spec_plan.rs:138][E: codex-rs/core/src/tools/spec_plan.rs:139][E: codex-rs/core/src/tools/spec_plan.rs:145][E: codex-rs/core/src/tools/spec_plan.rs:152][E: codex-rs/core/src/tools/spec_plan.rs:157][E: codex-rs/core/src/tools/spec_plan.rs:157]
2. `finalize_tool_router` 应用 namespace exposure overrides，按需替换 plain code-mode executors，只在 deferred searchable runtime 存在时注册 `tool_search`，再安装 code-mode executors。[E: codex-rs/core/src/tools/spec_plan.rs:236][E: codex-rs/core/src/tools/spec_plan.rs:242][E: codex-rs/core/src/tools/spec_plan.rs:243][E: codex-rs/core/src/tools/spec_plan.rs:251][E: codex-rs/core/src/tools/spec_plan.rs:263]
3. `build_model_visible_specs` 从最终 registry exposure 生成 prompt surface，并追加 hosted specs；router 用同一 registry 执行隐藏与可见 runtime。[E: codex-rs/core/src/tools/spec_plan.rs:265][E: codex-rs/core/src/tools/spec_plan.rs:294][E: codex-rs/core/src/tools/spec_plan.rs:316][E: codex-rs/core/src/tools/spec_plan.rs:323]

## Source families

| family | gate 与行为 |
|---|---|
| shell | 无 environment 不注册。`shell_command` 还要求 single local environment；UnifiedExec 注册 `exec_command`、`write_stdin`，只有 local 时才保留 hidden shell dispatch。[E: codex-rs/core/src/tools/spec_plan.rs:719][E: codex-rs/core/src/tools/spec_plan.rs:723][E: codex-rs/core/src/tools/spec_plan.rs:730][E: codex-rs/core/src/tools/spec_plan.rs:737][E: codex-rs/core/src/tools/spec_plan.rs:749] |
| core utility | `update_plan_enabled`、DeferredExecutor、model/config/features 分别 gate plan、`wait_for_environment`、request tools、token helpers、clock、plugin、apply_patch、test 与 image tools。[E: codex-rs/core/src/tools/spec_plan.rs:792][E: codex-rs/core/src/tools/spec_plan.rs:797][E: codex-rs/core/src/tools/spec_plan.rs:801][E: codex-rs/core/src/tools/spec_plan.rs:812][E: codex-rs/core/src/tools/spec_plan.rs:858][E: codex-rs/core/src/tools/spec_plan.rs:874] |
| collaboration | MultiAgent V2 注册 spawn/send/followup/wait/interrupt/list；否则注册 legacy V1 family。[E: codex-rs/core/src/tools/spec_plan.rs:885][E: codex-rs/core/src/tools/spec_plan.rs:969] |
| MCP / extension / dynamic | runtime 直接注册进 registry；deferred MCP 保留 Deferred exposure，extension/dynamic 仍受名字冲突与 exposure 规则约束。[E: codex-rs/core/src/tools/spec_plan.rs:145][E: codex-rs/core/src/tools/spec_plan.rs:152][E: codex-rs/core/src/tools/spec_plan.rs:157] |
| hosted | `web_search` 等 hosted specs 进入 model surface，但没有本地 runtime dispatch。[E: codex-rs/core/src/tools/spec_plan.rs:157][E: codex-rs/core/src/tools/spec_plan.rs:316] |

Guardian reviewer 使用独立受限 source：仅在有 environment 时加入 `exec_command`、`write_stdin`、`view_image`，不继承普通 turn 的完整 core/MCP/collaboration surface。[E: codex-rs/core/src/tools/spec_plan.rs:672][E: codex-rs/core/src/tools/spec_plan.rs:694]

## `wait_for_environment`

`Feature::DeferredExecutor` 打开时注册 `WaitForEnvironmentHandler`；宿主可从 extension data 提供描述，否则使用默认配置。tool 接收 `environment_id`，若该环境已 ready 立即成功；若仍 starting 则等待；既不 ready 也不 starting、或等待失败，返回 model error。[E: codex-rs/core/src/tools/spec_plan.rs:801][E: codex-rs/core/src/tools/spec_plan.rs:805][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:38][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:123][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:133][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:139]

宿主描述与序列化后的 spec 都有字节上限；超限配置会告警并整体回退默认文案。成功输出是 JSON `{"environment_id": ..., "status": "ready"}`。详见 [wait_for_environment 工具](../../surface/tools/wait-for-environment.md)。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:50][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:56][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:67][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:146]

## 本轮集合变化

- CSV agent-job 的 `spawn_agents_on_csv` / `report_agent_job_result` 已从工具组装移除；迁移 0042 删除对应 state tables。[E: codex-rs/state/migrations/0042_drop_agent_jobs.sql:1][E: codex-rs/state/migrations/0042_drop_agent_jobs.sql:2]
- code-mode local V8 实现已拆到独立 `code-mode-runtime` crate；tool planning 仍由 core finalize 阶段决定其 direct/nested surface。[E: codex-rs/core/src/tools/spec_plan.rs:263][E: codex-rs/code-mode-runtime/src/lib.rs:1][E: codex-rs/code-mode-runtime/src/lib.rs:10]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/handlers/wait_for_environment.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/state/migrations/0042_drop_agent_jobs.sql`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [Tool router 与并行执行](tool-router.md)
- [Unified Exec](unified-exec.md)
