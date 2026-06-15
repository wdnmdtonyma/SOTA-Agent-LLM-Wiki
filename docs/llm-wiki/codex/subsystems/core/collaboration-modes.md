---
id: subsys.core.collaboration-modes
title: Collaboration modes 状态机
kind: subsystem
tier: T2
source: [codex-rs/collaboration-mode-templates/src/lib.rs, codex-rs/collaboration-mode-templates/templates/default.md, codex-rs/collaboration-mode-templates/templates/plan.md, codex-rs/collaboration-mode-templates/templates/execute.md, codex-rs/collaboration-mode-templates/templates/pair_programming.md, codex-rs/core/src/context/collaboration_mode_instructions.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/protocol.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/tools/handlers/plan.rs, codex-rs/core/src/tools/handlers/request_user_input.rs]
symbols: [ModeKind, CollaborationMode, Settings, CollaborationModeMask, CollaborationModeInstructions, build_collaboration_mode_update_item, handle_update_plan, RequestUserInputHandler]
related: [tool.request-user-input, tool.update-plan, config.ui-tui, subsys.core.context-manager]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Collaboration modes 是 Codex 通过 `CollaborationMode` 在 session/turn context 中传递的工作姿态：该对象携带 mode、model、reasoning effort 和 developer instructions；context manager 把非空 developer instructions 渲染为 developer-role contextual fragment。[E: codex-rs/protocol/src/config_types.rs:433][E: codex-rs/protocol/src/config_types.rs:437][E: codex-rs/protocol/src/config_types.rs:438][E: codex-rs/protocol/src/config_types.rs:505][E: codex-rs/core/src/session/mod.rs:591][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:12][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:24][I]

## 能回答的问题

- Codex 现有哪些 `ModeKind`，哪些 mode 在 TUI 可见？
- collaboration mode 如何覆盖 `model`、`reasoning_effort` 和 developer instructions？
- Default/Plan/Execute/Pair Programming 模板分别给模型什么行为约束？
- `request_user_input` 和 `update_plan` 为什么会受 collaboration mode 影响？
- mode update 什么时候注入 prompt history，什么时候不注入？

## 职责边界

- `codex-rs/collaboration-mode-templates` 只内嵌 Markdown 模板文本。[E: codex-rs/collaboration-mode-templates/src/lib.rs:1][E: codex-rs/collaboration-mode-templates/src/lib.rs:4]
- `codex-rs/protocol/src/config_types.rs` 定义 `ModeKind`、`CollaborationMode`、settings/mask 和 mode 能力。[E: codex-rs/protocol/src/config_types.rs:385][E: codex-rs/protocol/src/config_types.rs:433]
- `codex-rs/core/src/context/collaboration_mode_instructions.rs` 把 mode settings 中的 developer instructions 包成 contextual user fragment；空 instructions 不会生成 fragment。[E: codex-rs/core/src/context/collaboration_mode_instructions.rs:11][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:20]
- tools handler 读取当前 mode 做 gate 或错误提示；mode 切换由 `Op::UserTurn`/`Op::OverrideTurnContext` 等 session paths 更新 turn context。[E: codex-rs/core/src/tools/handlers/plan.rs:86][E: codex-rs/core/src/tools/handlers/request_user_input.rs:49][E: codex-rs/core/src/session/handlers.rs:144][E: codex-rs/core/src/session/handlers.rs:1069][I]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `codex-rs/protocol/src/config_types.rs` | `ModeKind` enum、visible modes、`allows_request_user_input`、`CollaborationMode` mutation methods。[E: codex-rs/protocol/src/config_types.rs:385][E: codex-rs/protocol/src/config_types.rs:412][E: codex-rs/protocol/src/config_types.rs:429][E: codex-rs/protocol/src/config_types.rs:447] |
| `codex-rs/protocol/src/protocol.rs` | collaboration mode tags，`Op::UserTurn` 和 `Op::OverrideTurnContext` 的 precedence 注释。[E: codex-rs/protocol/src/protocol.rs:100][E: codex-rs/protocol/src/protocol.rs:492][E: codex-rs/protocol/src/protocol.rs:562] |
| `codex-rs/core/src/session/handlers.rs` | user turn / override turn context 如何生成或更新 `CollaborationMode`。[E: codex-rs/core/src/session/handlers.rs:128][E: codex-rs/core/src/session/handlers.rs:1066] |
| `codex-rs/core/src/session/mod.rs` | 初始 session collaboration mode 以及 initial context fragment 注入。[E: codex-rs/core/src/session/mod.rs:589][E: codex-rs/core/src/session/mod.rs:2441] |
| `codex-rs/core/src/context_manager/updates.rs` | turn-to-turn mode change fragment 注入逻辑。[E: codex-rs/core/src/context_manager/updates.rs:72][E: codex-rs/core/src/context_manager/updates.rs:78] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `ModeKind` | `Plan`、`Default`、hidden `PairProgramming`、hidden `Execute` | `Default` 还有 alias `code`、`pair_programming`、`execute`、`custom`；TUI visible list 只含 Default 和 Plan。[E: codex-rs/protocol/src/config_types.rs:385][E: codex-rs/protocol/src/config_types.rs:396][E: codex-rs/protocol/src/config_types.rs:412] |
| `CollaborationMode` | `mode`、`settings` | mode 和 settings 分离，settings 可携带 model/reasoning/developer instructions。[E: codex-rs/protocol/src/config_types.rs:433][E: codex-rs/protocol/src/config_types.rs:503] |
| `Settings` | `model`、`reasoning_effort`、`developer_instructions` | developer instructions 是真正渲染进 prompt 的文本。[E: codex-rs/protocol/src/config_types.rs:503][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:11] |
| `CollaborationModeMask` | `name`、`mode`、`model`、`reasoning_effort`、`developer_instructions` | `apply_mask` 会应用可选字段，但忽略 mask name。[E: codex-rs/protocol/src/config_types.rs:515][E: codex-rs/protocol/src/config_types.rs:516][E: codex-rs/protocol/src/config_types.rs:517][E: codex-rs/protocol/src/config_types.rs:518][E: codex-rs/protocol/src/config_types.rs:519][E: codex-rs/protocol/src/config_types.rs:486][E: codex-rs/protocol/src/config_types.rs:487] |
| `CollaborationModeInstructions` | `instructions` | fragment role 是 developer，markers 是 protocol 中的 collaboration tags。[E: codex-rs/core/src/context/collaboration_mode_instructions.rs:7][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:8][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:24][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:25][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:26][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:27] |

## 控制流：进入与更新 mode

1. session 初始化时构造 `ModeKind::Default` 的 `CollaborationMode`，settings 使用 config 的 model 和 reasoning effort，developer instructions 为 None。[E: codex-rs/core/src/session/mod.rs:589][E: codex-rs/core/src/session/mod.rs:594][E: codex-rs/core/src/session/mod.rs:597]
2. `SessionConfiguration` 持有初始 `collaboration_mode`，`Session::collaboration_mode()` 从 state 返回 clone。[E: codex-rs/core/src/session/mod.rs:599][E: codex-rs/core/src/session/mod.rs:601][E: codex-rs/core/src/session/mod.rs:2355][E: codex-rs/core/src/session/mod.rs:2357]
3. `Op::UserTurn` 中 `collaboration_mode` 的 protocol 注释说明它优先于同一 op 上的 model、reasoning effort、developer instructions。[E: codex-rs/protocol/src/protocol.rs:492][E: codex-rs/protocol/src/protocol.rs:495]
4. user turn 如果没有提供 `collaboration_mode`，handler 用 op 的 model/effort 构造 Default mode，并把 developer instructions 置 None。[E: codex-rs/core/src/session/handlers.rs:128][E: codex-rs/core/src/session/handlers.rs:148][E: codex-rs/core/src/session/handlers.rs:151]
5. `Op::OverrideTurnContext` 如果没有提供 `collaboration_mode`，handler 在当前 mode 上调用 `with_updates(model, effort, None)`，保留当前 mode 和 developer instructions，只替换 model/effort。[E: codex-rs/core/src/session/handlers.rs:1069][E: codex-rs/core/src/session/handlers.rs:1073][E: codex-rs/core/src/session/handlers.rs:1074][E: codex-rs/core/src/session/handlers.rs:1075][E: codex-rs/core/src/session/handlers.rs:1076][E: codex-rs/protocol/src/config_types.rs:468][E: codex-rs/protocol/src/config_types.rs:470][E: codex-rs/protocol/src/config_types.rs:471][E: codex-rs/protocol/src/config_types.rs:472]
6. `build_initial_context` 读取当前 collaboration mode；如果 `CollaborationModeInstructions::from_collaboration_mode` 返回 Some，就把 fragment 加入 initial context。[E: codex-rs/core/src/session/mod.rs:2381][E: codex-rs/core/src/session/mod.rs:2441][E: codex-rs/core/src/session/mod.rs:2446]
7. context manager 在 previous 与 next collaboration mode 不等时尝试渲染 update item；如果 next mode 没有非空 developer instructions，则返回 None，注释说明 prior collaboration instructions 会留在 prompt history。[E: codex-rs/core/src/context_manager/updates.rs:72][E: codex-rs/core/src/context_manager/updates.rs:78][E: codex-rs/core/src/context_manager/updates.rs:84]

## 模板语义

| 模板 | 核心约束 |
|---|---|
| Default | active mode 只会被 developer message 中新的 `<collaboration_mode>` 改变；用户请求或工具描述不会改变 active mode。[E: codex-rs/collaboration-mode-templates/templates/default.md:1][E: codex-rs/collaboration-mode-templates/templates/default.md:5] |
| Plan | Plan mode 是 conversational；直到 developer message 明确结束 Plan mode 前都保持 Plan；用户在 Plan mode 请求执行时，仍解释为继续规划而不是执行。[E: codex-rs/collaboration-mode-templates/templates/plan.md:1][E: codex-rs/collaboration-mode-templates/templates/plan.md:7][E: codex-rs/collaboration-mode-templates/templates/plan.md:9] |
| Plan | Plan mode 允许只读/非 mutating 命令，禁止实现计划或改变 repo-tracked state 的 mutating actions，例如编辑文件、会重写文件的 formatter/linter、patch/migration/codegen。[E: codex-rs/collaboration-mode-templates/templates/plan.md:17][E: codex-rs/collaboration-mode-templates/templates/plan.md:19][E: codex-rs/collaboration-mode-templates/templates/plan.md:32][E: codex-rs/collaboration-mode-templates/templates/plan.md:34][E: codex-rs/collaboration-mode-templates/templates/plan.md:35][E: codex-rs/collaboration-mode-templates/templates/plan.md:36] |
| Execute | Execute mode 鼓励独立执行、合理假设和进度报告。[E: codex-rs/collaboration-mode-templates/templates/execute.md:1][E: codex-rs/collaboration-mode-templates/templates/execute.md:2][E: codex-rs/collaboration-mode-templates/templates/execute.md:5] |
| PairProgramming | Pair Programming mode 要求更协作、更常对齐；复杂工作使用 planning tool。[E: codex-rs/collaboration-mode-templates/templates/pair_programming.md:1][E: codex-rs/collaboration-mode-templates/templates/pair_programming.md:4] |

## Tool gate 与 mode 能力

1. `ModeKind::allows_request_user_input` 只有 Plan 返回 true。[E: codex-rs/protocol/src/config_types.rs:429]
2. `RequestUserInputHandler` 读取当前 collaboration mode，调用 unavailable message gate；subagent thread 直接被拒绝。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:43][E: codex-rs/core/src/tools/handlers/request_user_input.rs:49][E: codex-rs/core/src/tools/handlers/request_user_input.rs:51]
3. `handle_update_plan` 在 Plan mode 下返回错误，要求不要在 Plan mode 使用 checklist/progress/TODO tool；非 Plan mode 才发送 `PlanUpdate` event。[E: codex-rs/core/src/tools/handlers/plan.rs:86][E: codex-rs/core/src/tools/handlers/plan.rs:87][E: codex-rs/core/src/tools/handlers/plan.rs:88][E: codex-rs/core/src/tools/handlers/plan.rs:91][E: codex-rs/core/src/tools/handlers/plan.rs:93]
4. Plan template 也把 Plan mode 与 `update_plan` 区分开：Plan mode 可以请求用户输入并最终发 `<proposed_plan>`，`update_plan` 不进入/退出 Plan mode，且在 Plan mode 使用会报错。[E: codex-rs/collaboration-mode-templates/templates/plan.md:11][E: codex-rs/collaboration-mode-templates/templates/plan.md:13][E: codex-rs/collaboration-mode-templates/templates/plan.md:15]

## 设计动机与权衡

- mode 作为 `CollaborationMode` 随 turn context 进入 protocol，而不是只存在于 UI 文本，说明 model/reasoning/developer instructions 需要在 app-server、TUI、subagent 等入口之间统一传递。[E: codex-rs/protocol/src/protocol.rs:2922][E: codex-rs/core/src/session/handlers.rs:154][I]
- `with_updates` 保留 mode 和 developer instructions，只改 model/effort；这让调用方在只更新模型/effort 时不会意外清掉 collaboration behavior。[E: codex-rs/protocol/src/config_types.rs:468][E: codex-rs/protocol/src/config_types.rs:470][E: codex-rs/protocol/src/config_types.rs:471][E: codex-rs/protocol/src/config_types.rs:472][E: codex-rs/core/src/session/handlers.rs:1073][I]
- `build_collaboration_mode_update_item` 对空 developer instructions 返回 None，这避免把“模式无说明文本”渲染成无意义 prompt item，但也让历史里的旧 instructions 继续存在。[E: codex-rs/core/src/context_manager/updates.rs:78][E: codex-rs/core/src/context_manager/updates.rs:84][I]

## Gotcha

- `ModeKind` 的 hidden `PairProgramming` 和 `Execute` 仍在 protocol enum 中，但 TUI visible list 只有 Default 与 Plan。[E: codex-rs/protocol/src/config_types.rs:407][E: codex-rs/protocol/src/config_types.rs:412]
- `CollaborationModeMask.name` 被 `apply_mask` 忽略；不要把 name 当成 runtime mode source。[E: codex-rs/protocol/src/config_types.rs:486][E: codex-rs/protocol/src/config_types.rs:487][I]
- Plan mode 模板禁止文件修改，但 Rust runtime 的 hard gate 主要体现在 tool/handler 行为和 prompt instructions；普通 shell/file edit 的所有禁止项不是都由 `ModeKind` enum 本身强制。[E: codex-rs/collaboration-mode-templates/templates/plan.md:34][E: codex-rs/protocol/src/config_types.rs:390][I]

## Sources

- `codex-rs/collaboration-mode-templates/src/lib.rs`
- `codex-rs/collaboration-mode-templates/templates/default.md`
- `codex-rs/collaboration-mode-templates/templates/plan.md`
- `codex-rs/collaboration-mode-templates/templates/execute.md`
- `codex-rs/collaboration-mode-templates/templates/pair_programming.md`
- `codex-rs/core/src/context/collaboration_mode_instructions.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/context_manager/updates.rs`
- `codex-rs/core/src/tools/handlers/plan.rs`
- `codex-rs/core/src/tools/handlers/request_user_input.rs`

## 相关

- [request_user_input 工具](../../surface/tools/request-user-input.md)
- [update_plan 工具](../../surface/tools/update-plan.md)
- 索引 id：`config.ui-tui`
- [Context manager](context-manager.md)
