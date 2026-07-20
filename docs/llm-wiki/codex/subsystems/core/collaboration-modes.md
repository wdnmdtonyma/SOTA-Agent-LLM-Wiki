---
id: subsys.core.collaboration-modes
title: Collaboration modes 状态机
kind: subsystem
tier: T2
source: [codex-rs/collaboration-mode-templates/src/lib.rs, codex-rs/collaboration-mode-templates/templates/default.md, codex-rs/collaboration-mode-templates/templates/plan.md, codex-rs/collaboration-mode-templates/templates/execute.md, codex-rs/collaboration-mode-templates/templates/pair_programming.md, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/context/world_state/collaboration_mode.rs, codex-rs/core/src/session/world_state.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/protocol.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/tools/handlers/plan.rs, codex-rs/core/src/tools/handlers/request_user_input.rs, codex-rs/tools/src/tool_config.rs]
symbols: [ModeKind, CollaborationMode, Settings, CollaborationModeMask, CollaborationModeState, CollaborationModeInstructions, ThreadSettingsOverrides]
related: [tool.request-user-input, tool.update-plan, config.ui-tui, subsys.core.context-manager]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> Collaboration modes 是 Codex 把工作姿态、model、reasoning effort 和 mode-specific developer instructions 作为 session/thread settings 传递的机制。当前 runtime 只把 `Default` 和 `Plan` 暴露给 TUI；`PairProgramming` 和 `Execute` 仍在 enum 中但被隐藏。[E: codex-rs/protocol/src/config_types.rs:610][E: codex-rs/protocol/src/config_types.rs:620][E: codex-rs/protocol/src/config_types.rs:624][E: codex-rs/protocol/src/config_types.rs:632][E: codex-rs/protocol/src/config_types.rs:656]

## 能回答的问题

- `ModeKind` 当前有哪些变体，哪些对 TUI 可见？
- collaboration mode 如何携带 model、reasoning effort、developer instructions？
- mode developer instructions 如何进入 prompt history？
- `update_plan` 和 `request_user_input` 如何受 Plan mode 影响？
- thread settings 不带 `collaboration_mode` 时如何更新当前 mode 的 model/effort？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/collaboration-mode-templates/src/lib.rs` | 内嵌四份模板：plan/default/execute/pair programming。[E: codex-rs/collaboration-mode-templates/src/lib.rs:1][E: codex-rs/collaboration-mode-templates/src/lib.rs:4] |
| `codex-rs/protocol/src/config_types.rs` | `ModeKind`、visible modes、mode capability、`CollaborationMode`、settings/mask。[E: codex-rs/protocol/src/config_types.rs:610][E: codex-rs/protocol/src/config_types.rs:632][E: codex-rs/protocol/src/config_types.rs:648][E: codex-rs/protocol/src/config_types.rs:656] |
| `codex-rs/protocol/src/protocol.rs` | collaboration mode prompt tags 与 `ThreadSettingsOverrides.collaboration_mode`。[E: codex-rs/protocol/src/protocol.rs:114][E: codex-rs/protocol/src/protocol.rs:115][E: codex-rs/protocol/src/protocol.rs:457] |
| `codex-rs/core/src/context/world_state/collaboration_mode.rs` | `CollaborationModeState` 保存 mode snapshot 与非空 instructions，并实现 full/diff fragment rendering。[E: codex-rs/core/src/context/world_state/collaboration_mode.rs:30][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:50] |
| `codex-rs/core/src/session/world_state.rs` | 每 step 从当前 turn context 构造 typed world state，并按 feature gate 加入 collaboration section。[E: codex-rs/core/src/session/world_state.rs:17][E: codex-rs/core/src/session/world_state.rs:36][E: codex-rs/core/src/session/world_state.rs:70] |
| `codex-rs/core/src/session/mod.rs` | session 默认 collaboration mode 与 initial context 注入。[E: codex-rs/core/src/session/mod.rs:622][E: codex-rs/core/src/session/mod.rs:3176] |
| `codex-rs/core/src/session/handlers.rs` | thread settings update 中 collaboration mode 的 precedence 和 model/effort fallback 更新。[E: codex-rs/core/src/session/handlers.rs:119][E: codex-rs/core/src/session/handlers.rs:136][E: codex-rs/core/src/session/handlers.rs:139][E: codex-rs/core/src/session/handlers.rs:142] |
| `codex-rs/core/src/tools/handlers/plan.rs` | `update_plan` 在 Plan mode 下硬拒绝。[E: codex-rs/core/src/tools/handlers/plan.rs:84][E: codex-rs/core/src/tools/handlers/plan.rs:85] |
| `codex-rs/core/src/tools/handlers/request_user_input.rs` | `request_user_input` 只允许 root thread，并按当前 collaboration mode 做 availability gate。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:59][E: codex-rs/core/src/tools/handlers/request_user_input.rs:65] |
| `codex-rs/tools/src/tool_config.rs` | 计算 `request_user_input` 可用 modes：Plan 来自 `allows_request_user_input()`，Default 可由 `DefaultModeRequestUserInput` feature 加入。[E: codex-rs/tools/src/tool_config.rs:38][E: codex-rs/tools/src/tool_config.rs:41][E: codex-rs/tools/src/tool_config.rs:42][E: codex-rs/tools/src/tool_config.rs:43][E: codex-rs/tools/src/tool_config.rs:44] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `ModeKind` | 变体为 `Plan`、default `Default`、hidden `PairProgramming`、hidden `Execute`；`Default` 兼容旧 alias `code`、`pair_programming`、`execute`、`custom`。[E: codex-rs/protocol/src/config_types.rs:610][E: codex-rs/protocol/src/config_types.rs:611][E: codex-rs/protocol/src/config_types.rs:613][E: codex-rs/protocol/src/config_types.rs:614][E: codex-rs/protocol/src/config_types.rs:615][E: codex-rs/protocol/src/config_types.rs:616][E: codex-rs/protocol/src/config_types.rs:617][E: codex-rs/protocol/src/config_types.rs:624][E: codex-rs/protocol/src/config_types.rs:629] |
| TUI visibility | `TUI_VISIBLE_COLLABORATION_MODES` 只包含 `Default` 和 `Plan`；`ModeKind::is_tui_visible` 同样只匹配这两者。[E: codex-rs/protocol/src/config_types.rs:632][E: codex-rs/protocol/src/config_types.rs:644][E: codex-rs/protocol/src/config_types.rs:645] |
| `CollaborationMode` | 字段是 `mode` 和 `settings`。[E: codex-rs/protocol/src/config_types.rs:656][E: codex-rs/protocol/src/config_types.rs:657][E: codex-rs/protocol/src/config_types.rs:658] |
| `Settings` | 包含 `model`、可选 `reasoning_effort`、可选 `developer_instructions`。[E: codex-rs/protocol/src/config_types.rs:728][E: codex-rs/protocol/src/config_types.rs:729][E: codex-rs/protocol/src/config_types.rs:730][E: codex-rs/protocol/src/config_types.rs:731] |
| `CollaborationModeMask` | 可选覆盖 mode/model/reasoning/developer instructions；`name` 是 metadata，不参与 `apply_mask` 的 runtime output。[E: codex-rs/protocol/src/config_types.rs:737][E: codex-rs/protocol/src/config_types.rs:738][E: codex-rs/protocol/src/config_types.rs:739][E: codex-rs/protocol/src/config_types.rs:740][E: codex-rs/protocol/src/config_types.rs:741][E: codex-rs/protocol/src/config_types.rs:742][E: codex-rs/protocol/src/config_types.rs:707] |

## 控制流

1. session start 时构造 `ModeKind::Default` 的 `CollaborationMode`，settings 取当前 model、config reasoning effort，developer instructions 为 None。[E: codex-rs/core/src/session/mod.rs:622][E: codex-rs/core/src/session/mod.rs:623][E: codex-rs/core/src/session/mod.rs:624][E: codex-rs/core/src/session/mod.rs:625][E: codex-rs/core/src/session/mod.rs:626][E: codex-rs/core/src/session/mod.rs:627]
2. `Session::collaboration_mode()` 从 session state 返回当前 mode clone，tools handler 通过它读取实时 mode。[E: codex-rs/core/src/session/mod.rs:3084][E: codex-rs/core/src/session/mod.rs:3085][E: codex-rs/core/src/session/mod.rs:3086][E: codex-rs/core/src/tools/handlers/request_user_input.rs:65]
3. `ThreadSettingsOverrides.collaboration_mode` 的注释说明该字段优先于 model、effort 和 developer instructions。[E: codex-rs/protocol/src/protocol.rs:504]
4. thread settings update 如果带 `collaboration_mode` 就直接使用；否则在当前 collaboration mode 上调用 `with_updates(model, effort, None)`，保留当前 mode 和 developer instructions，只刷新 model/effort。[E: codex-rs/core/src/session/handlers.rs:123][E: codex-rs/core/src/session/handlers.rs:136][E: codex-rs/core/src/session/handlers.rs:139][E: codex-rs/core/src/session/handlers.rs:142][E: codex-rs/core/src/session/handlers.rs:147][E: codex-rs/core/src/session/handlers.rs:148][E: codex-rs/protocol/src/config_types.rs:682][E: codex-rs/protocol/src/config_types.rs:689][E: codex-rs/protocol/src/config_types.rs:692]
5. `build_world_state_for_step` 仅在 collaboration instructions gate 开启且 developer instructions 非空时加入 `CollaborationModeState`；section snapshot 是 `ModeKind`。[E: codex-rs/core/src/session/world_state.rs:70][E: codex-rs/core/src/session/world_state.rs:72][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:17][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:32]
6. 该 section 渲染 developer-role fragment，markers 仍是 protocol 中的 collaboration tags；full context 由 world-state renderer 注入，steady-state 则与 context manager 保存的 baseline 比较。[E: codex-rs/core/src/context/world_state/collaboration_mode.rs:71][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:76][E: codex-rs/core/src/context_manager/history.rs:94]
7. diff 只在 previous snapshot 已知且 mode 真正变化时生成；previous unknown 或相同 mode 都不重放。legacy/retained fragment matchers 让旧 history 中的 collaboration block 仍能被识别。[E: codex-rs/core/src/context/world_state/collaboration_mode.rs:38][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:42][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:50][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:57]

## 模板语义

| 模板 | 关键语义 |
|---|---|
| Default | active mode 只由新的 developer `<collaboration_mode>` instruction 改变；user request 或 tool description 不改变 mode；Default 下应尽量合理假设并执行。[E: codex-rs/collaboration-mode-templates/templates/default.md:1][E: codex-rs/collaboration-mode-templates/templates/default.md:5][E: codex-rs/collaboration-mode-templates/templates/default.md:11] |
| Plan | Plan mode 是 conversational，直到 developer message 明确结束；用户要求执行也应解释为继续规划。[E: codex-rs/collaboration-mode-templates/templates/plan.md:1][E: codex-rs/collaboration-mode-templates/templates/plan.md:7][E: codex-rs/collaboration-mode-templates/templates/plan.md:9] |
| Plan | Plan mode 可以执行 non-mutating exploration，但禁止编辑文件、运行会重写文件的 formatter/linter、patch/migration/codegen 等 mutating work。[E: codex-rs/collaboration-mode-templates/templates/plan.md:17][E: codex-rs/collaboration-mode-templates/templates/plan.md:19][E: codex-rs/collaboration-mode-templates/templates/plan.md:30] |
| Execute | 独立执行明确任务，少问问题，用合理假设推进并在最终消息说明假设。[E: codex-rs/collaboration-mode-templates/templates/execute.md:1][E: codex-rs/collaboration-mode-templates/templates/execute.md:4][E: codex-rs/collaboration-mode-templates/templates/execute.md:8][E: codex-rs/collaboration-mode-templates/templates/execute.md:11] |
| Pair Programming | 强调与用户边做边对齐；复杂工作更常使用 planning tool。[E: codex-rs/collaboration-mode-templates/templates/pair_programming.md:1][E: codex-rs/collaboration-mode-templates/templates/pair_programming.md:3][E: codex-rs/collaboration-mode-templates/templates/pair_programming.md:4] |

## Tool gate

1. `ModeKind::allows_request_user_input` 只有 `Plan` 返回 true。[E: codex-rs/protocol/src/config_types.rs:648][E: codex-rs/protocol/src/config_types.rs:649]
2. runtime 的 `request_user_input_available_modes` 从 TUI visible modes 过滤可用项：Plan 通过 `allows_request_user_input()` 进入；当 `Feature::DefaultModeRequestUserInput` 开启时，Default 也会进入。[E: codex-rs/tools/src/tool_config.rs:38][E: codex-rs/tools/src/tool_config.rs:39][E: codex-rs/tools/src/tool_config.rs:41][E: codex-rs/tools/src/tool_config.rs:42][E: codex-rs/tools/src/tool_config.rs:43][E: codex-rs/tools/src/tool_config.rs:44]
3. `RequestUserInputHandler` 先拒绝非 root agent，再按当前 session collaboration mode 调用 unavailable-message gate。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:59][E: codex-rs/core/src/tools/handlers/request_user_input.rs:60][E: codex-rs/core/src/tools/handlers/request_user_input.rs:65][E: codex-rs/core/src/tools/handlers/request_user_input.rs:66]
4. `PlanHandler` 在 Plan mode 下直接返回错误，非 Plan mode 才 parse args 并发送 `EventMsg::PlanUpdate`。[E: codex-rs/core/src/tools/handlers/plan.rs:84][E: codex-rs/core/src/tools/handlers/plan.rs:85][E: codex-rs/core/src/tools/handlers/plan.rs:90][E: codex-rs/core/src/tools/handlers/plan.rs:91][E: codex-rs/core/src/tools/handlers/plan.rs:92]
5. Plan template 也明确区分 Plan mode 与 `update_plan` checklist tool，说明 `update_plan` 不进入或退出 Plan mode，且在 Plan mode 会报错。[E: codex-rs/collaboration-mode-templates/templates/plan.md:11][E: codex-rs/collaboration-mode-templates/templates/plan.md:13][E: codex-rs/collaboration-mode-templates/templates/plan.md:15]

## 设计动机与权衡

- model 和 reasoning effort 暂时存放在 `CollaborationMode.settings`，session start 处还有 TODO 说明未来可能整合 config.model/config.model_reasoning_effort 与 collaboration mode。[E: codex-rs/protocol/src/config_types.rs:667][E: codex-rs/protocol/src/config_types.rs:671][I]
- thread settings fallback 使用 `with_updates(model, effort, None)`，避免只改 model/effort 时意外清掉 active mode 或 developer instructions。[E: codex-rs/core/src/session/handlers.rs:142][E: codex-rs/core/src/session/handlers.rs:148][E: codex-rs/protocol/src/config_types.rs:692][I]
- runtime hard gate 主要体现在 tool handlers 和 prompt instructions；Plan template 禁止 mutating work，但 `ModeKind` enum 本身并不是全局 filesystem write lock。[E: codex-rs/core/src/tools/handlers/plan.rs:84][E: codex-rs/core/src/tools/handlers/request_user_input.rs:65][E: codex-rs/protocol/src/config_types.rs:648][I]

## Gotcha

- `PairProgramming` 和 `Execute` 仍有模板和 enum 变体，但 serde/schema/TS 标记让它们 hidden，TUI visible list 不包含它们。[E: codex-rs/protocol/src/config_types.rs:620][E: codex-rs/protocol/src/config_types.rs:624][E: codex-rs/protocol/src/config_types.rs:632][E: codex-rs/collaboration-mode-templates/src/lib.rs:3][E: codex-rs/collaboration-mode-templates/src/lib.rs:4]
- mode update 已不再由 `context_manager/updates.rs` 的专用 builder 负责；typed world state 以 snapshot 去重，并保留 legacy/retained fragment matcher。没有非空 developer instructions 时该 section 根本不加入 world state。[E: codex-rs/core/src/session/world_state.rs:70][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:17][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:38][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:42]
- Default 模板规定用户请求或工具描述不能改变 active mode；只有 developer instructions 中的新 collaboration-mode block 才能改变。[E: codex-rs/collaboration-mode-templates/templates/default.md:5]

## Sources

- `codex-rs/collaboration-mode-templates/src/lib.rs`
- `codex-rs/collaboration-mode-templates/templates/default.md`
- `codex-rs/collaboration-mode-templates/templates/plan.md`
- `codex-rs/collaboration-mode-templates/templates/execute.md`
- `codex-rs/collaboration-mode-templates/templates/pair_programming.md`
- `codex-rs/core/src/context/world_state/collaboration_mode.rs`
- `codex-rs/core/src/context/world_state/mod.rs`
- `codex-rs/core/src/session/world_state.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/tools/handlers/plan.rs`
- `codex-rs/core/src/tools/handlers/request_user_input.rs`
- `codex-rs/tools/src/tool_config.rs`

## 相关

- [request_user_input 工具](../../surface/tools/request-user-input.md)
- [update_plan 工具](../../surface/tools/update-plan.md)
- 索引 id：`config.ui-tui`
- [Context manager](context-manager.md)
