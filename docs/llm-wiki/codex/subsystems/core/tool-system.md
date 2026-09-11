---
id: subsys.core.tool-system
title: 工具系统机制
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/handlers/wait_for_environment.rs, codex-rs/core/src/tools/handlers/send_message_to_user_async.rs, codex-rs/core/src/tools/handlers/request_user_input_async.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/state/migrations/0042_drop_agent_jobs.sql, codex-rs/code-mode-runtime/src/lib.rs]
symbols: [add_core_tool_sources, add_core_utility_tools, CoreToolRuntime, ToolExposure]
related: [spine.tool-call-anatomy, subsys.core.tool-router, subsys.core.unified-exec, tool.exec-command, tool.wait-for-environment, tool.current-time, tool.tool-search, tool.web-search, tool.image-generation, tool.send-user-message-async, tool.request-user-input-async]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> 当前工具系统以可变 `ToolRegistry` 为 runtime 装配中心；hosted specs 作为独立列表传入 `finalize_tool_router`，再与 registry 生成的 direct、deferred search 与 code-mode surfaces 汇合。旧的 `PlannedTools` 中间容器已经移除。[E: codex-rs/core/src/tools/spec_plan.rs:125][E: codex-rs/core/src/tools/spec_plan.rs:154][E: codex-rs/core/src/tools/spec_plan.rs:181][E: codex-rs/core/src/tools/spec_plan.rs:188][E: codex-rs/core/src/tools/spec_plan.rs:352]

## 核心对象

| 对象 | 当前职责 |
|---|---|
| `ToolSpec` | Responses API 的 schema union：Function、Namespace、ToolSearch、WebSearch、Freeform。[E: codex-rs/tools/src/tool_spec.rs:22][E: codex-rs/tools/src/tool_spec.rs:55] |
| `CoreToolRuntime` | core 执行 contract；除 `ToolExecutor` 的 spec/exposure/parallel/handle 外，还提供 readiness、payload、cancellation、hooks 与 telemetry。[E: codex-rs/tools/src/tool_executor.rs:106][E: codex-rs/core/src/tools/registry.rs:55] |
| `RegisteredTool` | 一个 runtime 加上最终 exposure 等 registry 元数据；model surface 使用其 effective exposure。[E: codex-rs/core/src/tools/registry.rs:281] |
| `ToolRegistry` | 用 `IndexMap` 保序保存 runtime registrations 与 effective exposure，并处理可信/外部名字冲突；它不保存 hosted specs。[E: codex-rs/core/src/tools/registry.rs:287][E: codex-rs/core/src/tools/registry.rs:364] |
| `ToolRouter` | 冻结后的 registry + model-visible specs；归一 model output 并执行 dispatch。[E: codex-rs/core/src/tools/router.rs:74][E: codex-rs/core/src/tools/router.rs:137][E: codex-rs/core/src/tools/router.rs:244] |

## 装配阶段

1. `build_tool_router` 创建 registry，调用 `add_core_tool_sources`，再注册 MCP、extension、dynamic runtimes；hosted specs 单独由 `hosted_model_tool_specs` 返回。[E: codex-rs/core/src/tools/spec_plan.rs:153][E: codex-rs/core/src/tools/spec_plan.rs:154][E: codex-rs/core/src/tools/spec_plan.rs:159][E: codex-rs/core/src/tools/spec_plan.rs:174][E: codex-rs/core/src/tools/spec_plan.rs:181]
2. `finalize_tool_router` 应用 namespace exposure overrides，按需替换 plain code-mode executors，只在 deferred searchable runtime 存在时注册 `tool_search`，再安装 code-mode executors。[E: codex-rs/core/src/tools/spec_plan.rs:359][E: codex-rs/core/src/tools/spec_plan.rs:362][E: codex-rs/core/src/tools/spec_plan.rs:362][E: codex-rs/core/src/tools/spec_plan.rs:406][E: codex-rs/core/src/tools/spec_plan.rs:410]
3. `build_model_visible_specs` 从最终 registry exposure 生成 prompt surface，并追加 hosted specs；router 用同一 registry 执行隐藏与可见 runtime。[E: codex-rs/core/src/tools/spec_plan.rs:531][E: codex-rs/core/src/tools/spec_plan.rs:541][E: codex-rs/core/src/tools/spec_plan.rs:560]

## Source families

| family | gate 与行为 |
|---|---|
| shell | 无 environment / `Feature::ShellTool` 关 / 模型 `shell_type=Disabled` 则不注册。`shell_command` **不再注册**。`Feature::UnifiedExec` 开则 `ExecCommandHandler` + `WriteStdinHandler`；关则 `ExecCommandHandler::one_shot`。`shell_command` 仍是 reserved name。[E: codex-rs/core/src/tools/spec_plan.rs:1079][E: codex-rs/core/src/tools/spec_plan.rs:1104][E: codex-rs/core/src/tools/spec_plan.rs:1111][E: codex-rs/core/src/tools/registry.rs:364] |
| core utility | `update_plan_enabled` opt-in 注册 `PlanHandler`；`request_user_input` 要 `experimental_request_user_input_enabled`；`request_user_input_async` 要 root agent + catalog 含 `"request_user_input_async"` 或 `"send_user_message_async"`；`send_message_to_user_async` 要 root agent + catalog 含该新名。DeferredExecutor、token helpers、clock/sleep、plugin、apply_patch、test 与 image tools 各自有独立 gate。[E: codex-rs/core/src/tools/spec_plan.rs:1142][E: codex-rs/core/src/tools/spec_plan.rs:1146][E: codex-rs/core/src/tools/spec_plan.rs:1158][E: codex-rs/core/src/tools/spec_plan.rs:1176][E: codex-rs/core/src/tools/spec_plan.rs:1197][E: codex-rs/core/src/tools/spec_plan.rs:1217] |
| collaboration | MultiAgent V2 注册 spawn/send/followup/wait/interrupt/list；否则注册 legacy V1 family。[E: codex-rs/core/src/tools/spec_plan.rs:1285][E: codex-rs/core/src/tools/spec_plan.rs:1287] |
| MCP / extension / dynamic | runtime 直接注册进 registry；deferred MCP 保留 Deferred exposure，extension/dynamic 仍受名字冲突与 exposure 规则约束。[E: codex-rs/core/src/tools/spec_plan.rs:159][E: codex-rs/core/src/tools/spec_plan.rs:174][E: codex-rs/core/src/tools/spec_plan.rs:180] |
| hosted | `web_search` 等 hosted specs 进入 model surface，但没有本地 runtime dispatch。[E: codex-rs/core/src/tools/spec_plan.rs:181][E: codex-rs/core/src/tools/spec_plan.rs:560] |

Guardian reviewer 使用独立受限 source：仅在 Managed permission profile 且有 environment 时加入 `exec_command`/`write_stdin`/`view_image`，不继承普通 turn 的完整 core/MCP/collaboration surface。[E: codex-rs/core/src/tools/spec_plan.rs:978][E: codex-rs/core/src/tools/spec_plan.rs:998][E: codex-rs/core/src/tools/spec_plan.rs:1029]

## 两个 async user 工具

`send_message_to_user_async` 的 handler 文件是 `send_message_to_user_async.rs`，`TOOL_NAME = "send_message_to_user_async"`，args 是非空 `message: String`，立即返回，不结束 turn。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:21][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:28][E: codex-rs/core/src/tools/spec_plan.rs:1199]

`request_user_input_async` 的 `TOOL_NAME = "request_user_input_async"`，args 是 `questions: Vec<AsyncUserInputQuestion>`（`title` 必填，`options` 可选）。旧 catalog 名 `send_user_message_async` 只把 **这个** handler 注册进去，不是 message-shaped 工具的 live wire name。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:22][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:31][E: codex-rs/core/src/tools/spec_plan.rs:1173][E: codex-rs/core/src/tools/spec_plan.rs:1180]

## `wait_for_environment`

`Feature::DeferredExecutor` 打开时注册 `WaitForEnvironmentHandler`；宿主可从 extension data 提供描述，否则使用默认配置。tool 接收 `environment_id`，若该环境已 ready 立即成功；若仍 starting 则等待；既不 ready 也不 starting、或等待失败，返回 model error。[E: codex-rs/core/src/tools/spec_plan.rs:1146][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:42][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:127][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:154]

宿主描述与序列化后的 spec 都有字节上限；超限配置会告警并整体回退默认文案。成功输出是 JSON `{"environment_id": ..., "status": "ready"}`。详见 [wait_for_environment 工具](../../surface/tools/wait-for-environment.md)。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:51][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:165]

## 本轮集合变化

- `shell_command` 不再是可注册 core handler；命令执行只走 `ExecCommandHandler`（unified 或 one-shot）。[E: codex-rs/core/src/tools/spec_plan.rs:1104][E: codex-rs/core/src/tools/spec_plan.rs:1111]
- `update_plan` 改为 `update_plan_enabled` opt-in，不再默认始终开启。[E: codex-rs/core/src/tools/spec_plan.rs:1142]
- 拆分 async user tools：`send_message_to_user_async` 与 `request_user_input_async`；后者接受旧 catalog 名 `send_user_message_async`。[E: codex-rs/core/src/tools/spec_plan.rs:1176][E: codex-rs/core/src/tools/spec_plan.rs:1197]
- CSV agent-job 的 `spawn_agents_on_csv` / `report_agent_job_result` 已从工具组装移除；迁移 0042 删除对应 state tables。[E: codex-rs/state/migrations/0042_drop_agent_jobs.sql:1]
- code-mode local V8 实现已拆到独立 `code-mode-runtime` crate；tool planning 仍由 core finalize 阶段决定其 direct/nested surface。[E: codex-rs/core/src/tools/spec_plan.rs:410][E: codex-rs/code-mode-runtime/src/lib.rs:1]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/handlers/wait_for_environment.rs`
- `codex-rs/core/src/tools/handlers/send_message_to_user_async.rs`
- `codex-rs/core/src/tools/handlers/request_user_input_async.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/state/migrations/0042_drop_agent_jobs.sql`
- `codex-rs/code-mode-runtime/src/lib.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [Tool router 与并行执行](tool-router.md)
- [Unified Exec](unified-exec.md)
