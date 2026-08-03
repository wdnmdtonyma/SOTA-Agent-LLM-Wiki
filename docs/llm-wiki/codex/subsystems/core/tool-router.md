---
id: subsys.core.tool-router
title: Tool router 与并行执行
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/parallel.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/session/step_context.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_payload.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [ToolRouter, ToolCall, ToolCallRuntime, ToolRegistry, RegisteredTool, build_tool_router, finalize_tool_router, build_model_visible_specs, register_code_mode_executors]
related: [spine.tool-call-anatomy, spine.extension-system, subsys.core.tool-system, subsys.core.turn-engine, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 7750465934
---

> 当前 `build_tool_router` 先把 core、MCP、extension、dynamic runtimes 装进 `ToolRegistry`，同时单独收集 hosted specs；`finalize_tool_router` 再做最终 exposure 覆盖、`tool_search` 与 code-mode 注册，并把 hosted specs 追加到 model-visible surface。最终 router 挂在请求级 `StepContext` 上，执行期不会另存一份 router。[E: codex-rs/core/src/tools/spec_plan.rs:114][E: codex-rs/core/src/tools/spec_plan.rs:138][E: codex-rs/core/src/tools/spec_plan.rs:145][E: codex-rs/core/src/tools/spec_plan.rs:158][E: codex-rs/core/src/tools/spec_plan.rs:161][E: codex-rs/core/src/tools/spec_plan.rs:164][E: codex-rs/core/src/tools/spec_plan.rs:316][E: codex-rs/core/src/session/step_context.rs:12][E: codex-rs/core/src/session/step_context.rs:22][E: codex-rs/core/src/tools/parallel.rs:41]

## 能回答的问题

- 工具 runtime、hosted spec 与 model-visible spec 如何汇合？
- direct、deferred、direct-model-only、hidden exposure 在哪里兑现？
- model output 如何归一为 `ToolCall`？
- readiness、parallel gate 与 dispatch 的顺序是什么？

## 装配与 finalize

`build_tool_router` 直接创建 `ToolRegistry`，先调用 `add_core_tool_sources`，然后依次注册 MCP、extension、dynamic runtimes；`hosted_model_tool_specs` 的返回值保留为独立 `Vec<ToolSpec>`，最后与 registry 一起传给 `finalize_tool_router`。旧的 `PlannedTools`、`build_tool_specs_and_registry`、`add_tool_sources` 已不在当前实现中。[E: codex-rs/core/src/tools/spec_plan.rs:114][E: codex-rs/core/src/tools/spec_plan.rs:138][E: codex-rs/core/src/tools/spec_plan.rs:139][E: codex-rs/core/src/tools/spec_plan.rs:145][E: codex-rs/core/src/tools/spec_plan.rs:152][E: codex-rs/core/src/tools/spec_plan.rs:157][E: codex-rs/core/src/tools/spec_plan.rs:158][E: codex-rs/core/src/tools/spec_plan.rs:161][E: codex-rs/core/src/tools/spec_plan.rs:164]

`finalize_tool_router` 的顺序具有语义：先应用 direct-model-only namespace override；若要安装 code mode，先移除旧的 plain `exec`/`wait`；只有 registry 中确有带 `search_info()` 的 deferred runtime 才注册 `tool_search`；随后注册 code-mode executors，再从最终 registry 构造 model-visible specs。[E: codex-rs/core/src/tools/spec_plan.rs:236][E: codex-rs/core/src/tools/spec_plan.rs:242][E: codex-rs/core/src/tools/spec_plan.rs:243][E: codex-rs/core/src/tools/spec_plan.rs:251][E: codex-rs/core/src/tools/spec_plan.rs:260][E: codex-rs/core/src/tools/spec_plan.rs:263][E: codex-rs/core/src/tools/spec_plan.rs:265]

`build_model_visible_specs` 读取每个 `RegisteredTool` 的有效 exposure：direct 工具可见；被 code-mode-only 隐藏的 direct 工具不进入 prompt；hosted specs 在末尾追加。registry 因而可以包含模型不可见但仍可 dispatch 的 runtime。[E: codex-rs/core/src/tools/spec_plan.rs:294][E: codex-rs/core/src/tools/spec_plan.rs:301][E: codex-rs/core/src/tools/spec_plan.rs:306][E: codex-rs/core/src/tools/spec_plan.rs:316][E: codex-rs/core/src/tools/registry.rs:246]

code-mode 注册遍历已经 finalize 到此阶段的 registry，把可嵌套 runtime 规范化为 JS 名称；名字碰撞会告警并跳过后者。最后把 code-mode `wait`、`exec` 依次 prepend，保证两者成为直接模型工具，而被包裹工具只在 cell 内可调用。[E: codex-rs/core/src/tools/spec_plan.rs:507][E: codex-rs/core/src/tools/spec_plan.rs:521][E: codex-rs/core/src/tools/spec_plan.rs:538][E: codex-rs/core/src/tools/spec_plan.rs:551][E: codex-rs/core/src/tools/spec_plan.rs:582][E: codex-rs/core/src/tools/spec_plan.rs:593]

## Registry 与名字规则

`ToolRegistry` 用保序 `IndexMap<ToolName, RegisteredTool>` 保存 runtime、effective exposure 等注册信息。trusted/core 重名是错误；外部 plain tool 若占用保留 shell 名或与现有 tool 重名则被跳过，避免 extension/MCP 覆盖 core 行为。[E: codex-rs/core/src/tools/registry.rs:251][E: codex-rs/core/src/tools/registry.rs:253][E: codex-rs/core/src/tools/registry.rs:289][E: codex-rs/core/src/tools/registry.rs:300][E: codex-rs/core/src/tools/registry.rs:327][E: codex-rs/core/src/tools/registry.rs:341]

`ToolExecutor` 默认 exposure 是 `Direct`，默认不支持 parallel；`CoreToolRuntime` 在此 contract 上增加 readiness、payload kind、cancellation、telemetry、hooks 与 streamed argument diff 能力。[E: codex-rs/tools/src/tool_executor.rs:15][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:73][E: codex-rs/core/src/tools/registry.rs:53][E: codex-rs/core/src/tools/registry.rs:55]

## 输出归一与执行

`ToolRouter::build_tool_call` 把 function call 转为 canonical `ToolName` + `ToolPayload::Function`，把 client-side tool-search call 转为 plain `tool_search` + `ToolPayload::ToolSearch`，把 custom call 转为 plain name + `ToolPayload::Custom`；server-side tool-search 及无关 response item 不生成本地调用。[E: codex-rs/core/src/tools/router.rs:153][E: codex-rs/core/src/tools/router.rs:155][E: codex-rs/core/src/tools/router.rs:167][E: codex-rs/core/src/tools/router.rs:171][E: codex-rs/core/src/tools/router.rs:183][E: codex-rs/core/src/tools/router.rs:190][E: codex-rs/core/src/tools/router.rs:197]

function call 还可携带 `encrypted_content`；router 仅对 V2 `spawn_agent`、`send_message`、`followup_task` 标记 direct plaintext source，其他 function arguments 仍按普通来源处理。[E: codex-rs/core/src/tools/router.rs:31][E: codex-rs/core/src/tools/router.rs:36][E: codex-rs/core/src/tools/router.rs:39][E: codex-rs/core/src/tools/router.rs:51]

`ToolCallRuntime` 只保存 session、`StepContext`、diff tracker 与一个 `RwLock<()>`；它从 `step_context.tool_router` 查询 runtime、parallel/cancellation 策略，先等待 runtime readiness，再让 parallel-safe 调用取 read lock、其余调用取 write lock，最后经同一个 router dispatch。[E: codex-rs/core/src/tools/parallel.rs:41][E: codex-rs/core/src/tools/parallel.rs:46][E: codex-rs/core/src/tools/parallel.rs:112][E: codex-rs/core/src/tools/parallel.rs:115][E: codex-rs/core/src/tools/parallel.rs:147][E: codex-rs/core/src/tools/parallel.rs:150][E: codex-rs/core/src/tools/parallel.rs:153][E: codex-rs/core/src/tools/parallel.rs:170]

hidden runtime 在 registry 查询中强制报告不支持 parallel；cancellation policy 则继续委托底层 runtime。[E: codex-rs/core/src/tools/registry.rs:423][E: codex-rs/core/src/tools/registry.rs:425][E: codex-rs/core/src/tools/registry.rs:428]

## Tool source gates

`add_core_tool_sources` 对 Guardian reviewer 使用受限分支：有 environment 时只注册 `exec_command`、`write_stdin`、`view_image`，随后立即返回。普通 turn 才加入 shell、MCP resource、core utility 与 collaboration families。[E: codex-rs/core/src/tools/spec_plan.rs:669][E: codex-rs/core/src/tools/spec_plan.rs:672][E: codex-rs/core/src/tools/spec_plan.rs:694][E: codex-rs/core/src/tools/spec_plan.rs:697][E: codex-rs/core/src/tools/spec_plan.rs:700]

shell family 首先要求 environment；`shell_command` 还要求恰好一个 local environment。UnifiedExec 注册 `exec_command`/`write_stdin`，并仅在 local 环境存在时保留 hidden legacy shell dispatch；Default/Local/ShellCommand 模式也只有 single-local 环境才注册 `shell_command`。[E: codex-rs/core/src/tools/spec_plan.rs:719][E: codex-rs/core/src/tools/spec_plan.rs:723][E: codex-rs/core/src/tools/spec_plan.rs:730][E: codex-rs/core/src/tools/spec_plan.rs:737][E: codex-rs/core/src/tools/spec_plan.rs:750][E: codex-rs/core/src/tools/spec_plan.rs:759][E: codex-rs/core/src/tools/spec_plan.rs:764]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/parallel.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/session/step_context.rs`
- `codex-rs/tools/src/tool_executor.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [工具系统机制](tool-system.md)
- [Turn 引擎](turn-engine.md)
