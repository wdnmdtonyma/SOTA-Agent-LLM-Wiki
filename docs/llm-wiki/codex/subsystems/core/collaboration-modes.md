---
id: subsys.core.collaboration-modes
title: Collaboration modes 状态机
kind: subsystem
tier: T2
source: [codex-rs/collaboration-mode-templates/src/lib.rs, codex-rs/collaboration-mode-templates/templates/default.md, codex-rs/collaboration-mode-templates/templates/plan.md, codex-rs/collaboration-mode-templates/templates/execute.md, codex-rs/collaboration-mode-templates/templates/pair_programming.md, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/context/world_state/collaboration_mode.rs, codex-rs/core/src/context/world_state/multi_agent_mode.rs, codex-rs/core/src/session/world_state.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/protocol.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/tools/handlers/plan.rs, codex-rs/core/src/tools/handlers/request_user_input.rs, codex-rs/tools/src/tool_config.rs]
symbols: [ModeKind, CollaborationMode, Settings, CollaborationModeMask, CollaborationModeState, MultiAgentModeState, CollaborationModeInstructions, ThreadSettingsOverrides]
related: [tool.request-user-input, tool.update-plan, config.ui-tui, subsys.core.context-manager]
evidence: explicit
status: verified
updated: 7750465934
---

> Collaboration modes 是 Codex 把工作姿态、model、reasoning effort 和 mode-specific developer instructions 作为 session/thread settings 传递的机制。当前 runtime 只把 `Default` 和 `Plan` 暴露给 TUI；`PairProgramming` 和 `Execute` 仍在 enum 中但被隐藏。[E: codex-rs/protocol/src/config_types.rs:630][E: codex-rs/protocol/src/config_types.rs:640][E: codex-rs/protocol/src/config_types.rs:644][E: codex-rs/protocol/src/config_types.rs:652][E: codex-rs/protocol/src/config_types.rs:676]

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
| `codex-rs/protocol/src/config_types.rs` | `ModeKind`、visible modes、mode capability、`CollaborationMode`、settings/mask。[E: codex-rs/protocol/src/config_types.rs:630][E: codex-rs/protocol/src/config_types.rs:652][E: codex-rs/protocol/src/config_types.rs:668][E: codex-rs/protocol/src/config_types.rs:676] |
| `codex-rs/protocol/src/protocol.rs` | collaboration mode prompt tags 与 `ThreadSettingsOverrides.collaboration_mode`。[E: codex-rs/protocol/src/protocol.rs:116][E: codex-rs/protocol/src/protocol.rs:117][E: codex-rs/protocol/src/protocol.rs:460] |
| `codex-rs/core/src/context/world_state/collaboration_mode.rs` | `CollaborationModeState` 保存 mode snapshot 与非空 instructions，并实现 full/diff fragment rendering。[E: codex-rs/core/src/context/world_state/collaboration_mode.rs:53][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:80] |
| `codex-rs/core/src/context/world_state/multi_agent_mode.rs` | 独立保存 sub-agent delegation policy；它不是 `ModeKind`，也不改变 Plan/Default collaboration mode。[E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:14][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:15][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:33] |
| `codex-rs/core/src/session/world_state.rs` | 每 step 从当前 turn context 构造 typed world state，并按 feature gate 加入 collaboration section。[E: codex-rs/core/src/session/world_state.rs:60][E: codex-rs/core/src/session/world_state.rs:139][E: codex-rs/core/src/session/world_state.rs:140] |
| `codex-rs/core/src/session/mod.rs` | session 默认 collaboration mode 与 initial context 注入。[E: codex-rs/core/src/session/mod.rs:665][E: codex-rs/core/src/session/mod.rs:3393] |
| `codex-rs/core/src/session/handlers.rs` | thread settings update 中 collaboration mode 的 precedence 和 model/effort fallback 更新。[E: codex-rs/core/src/session/handlers.rs:130][E: codex-rs/core/src/session/handlers.rs:147][E: codex-rs/core/src/session/handlers.rs:150][E: codex-rs/core/src/session/handlers.rs:153] |
| `codex-rs/core/src/tools/handlers/plan.rs` | `update_plan` 在 Plan mode 下硬拒绝。[E: codex-rs/core/src/tools/handlers/plan.rs:84][E: codex-rs/core/src/tools/handlers/plan.rs:85] |
| `codex-rs/core/src/tools/handlers/request_user_input.rs` | `request_user_input` 只允许 root thread，并按当前 collaboration mode 做 availability gate；Plan mode 将请求标成 blocking。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:60][E: codex-rs/core/src/tools/handlers/request_user_input.rs:66][E: codex-rs/core/src/tools/handlers/request_user_input.rs:67][E: codex-rs/core/src/tools/handlers/request_user_input.rs:74][E: codex-rs/core/src/tools/handlers/request_user_input.rs:76] |
| `codex-rs/tools/src/tool_config.rs` | 计算 `request_user_input` 可用 modes：Plan 来自 `allows_request_user_input()`，Default 可由 `DefaultModeRequestUserInput` feature 加入。[E: codex-rs/tools/src/tool_config.rs:38][E: codex-rs/tools/src/tool_config.rs:41][E: codex-rs/tools/src/tool_config.rs:42][E: codex-rs/tools/src/tool_config.rs:43][E: codex-rs/tools/src/tool_config.rs:44] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `ModeKind` | 变体为 `Plan`、default `Default`、hidden `PairProgramming`、hidden `Execute`；`Default` 兼容旧 alias `code`、`pair_programming`、`execute`、`custom`。[E: codex-rs/protocol/src/config_types.rs:630][E: codex-rs/protocol/src/config_types.rs:631][E: codex-rs/protocol/src/config_types.rs:633][E: codex-rs/protocol/src/config_types.rs:634][E: codex-rs/protocol/src/config_types.rs:635][E: codex-rs/protocol/src/config_types.rs:636][E: codex-rs/protocol/src/config_types.rs:637][E: codex-rs/protocol/src/config_types.rs:644][E: codex-rs/protocol/src/config_types.rs:649] |
| TUI visibility | `TUI_VISIBLE_COLLABORATION_MODES` 只包含 `Default` 和 `Plan`；`ModeKind::is_tui_visible` 同样只匹配这两者。[E: codex-rs/protocol/src/config_types.rs:652][E: codex-rs/protocol/src/config_types.rs:664][E: codex-rs/protocol/src/config_types.rs:665] |
| `CollaborationMode` | 字段是 `mode` 和 `settings`。[E: codex-rs/protocol/src/config_types.rs:676][E: codex-rs/protocol/src/config_types.rs:677][E: codex-rs/protocol/src/config_types.rs:678] |
| `Settings` | 包含 `model`、可选 `reasoning_effort`、可选 `developer_instructions`。[E: codex-rs/protocol/src/config_types.rs:748][E: codex-rs/protocol/src/config_types.rs:749][E: codex-rs/protocol/src/config_types.rs:750][E: codex-rs/protocol/src/config_types.rs:751] |
| `CollaborationModeMask` | 可选覆盖 mode/model/reasoning/developer instructions；`name` 是 metadata，不参与 `apply_mask` 的 runtime output。[E: codex-rs/protocol/src/config_types.rs:757][E: codex-rs/protocol/src/config_types.rs:758][E: codex-rs/protocol/src/config_types.rs:759][E: codex-rs/protocol/src/config_types.rs:760][E: codex-rs/protocol/src/config_types.rs:761][E: codex-rs/protocol/src/config_types.rs:762][E: codex-rs/protocol/src/config_types.rs:727] |

## 控制流

1. session start 时构造 `ModeKind::Default` 的 `CollaborationMode`，settings 取当前 model、config reasoning effort，developer instructions 为 None。[E: codex-rs/core/src/session/mod.rs:665][E: codex-rs/core/src/session/mod.rs:666][E: codex-rs/core/src/session/mod.rs:667][E: codex-rs/core/src/session/mod.rs:668][E: codex-rs/core/src/session/mod.rs:669][E: codex-rs/core/src/session/mod.rs:670]
2. `Session::collaboration_mode()` 从 session state 返回当前 mode clone，tools handler 通过 turn context 读取实时 mode。[E: codex-rs/core/src/session/mod.rs:3300][E: codex-rs/core/src/session/mod.rs:3301][E: codex-rs/core/src/session/mod.rs:3302][E: codex-rs/core/src/tools/handlers/request_user_input.rs:66]
3. `ThreadSettingsOverrides.collaboration_mode` 的注释说明该字段优先于 model、effort 和 developer instructions。[E: codex-rs/protocol/src/protocol.rs:507]
4. thread settings update 如果带 `collaboration_mode` 就直接使用；否则在当前 collaboration mode 上调用 `with_updates(model, effort, None)`，保留当前 mode 和 developer instructions，只刷新 model/effort。[E: codex-rs/core/src/session/handlers.rs:134][E: codex-rs/core/src/session/handlers.rs:147][E: codex-rs/core/src/session/handlers.rs:150][E: codex-rs/core/src/session/handlers.rs:153][E: codex-rs/core/src/session/handlers.rs:158][E: codex-rs/core/src/session/handlers.rs:159][E: codex-rs/protocol/src/config_types.rs:702][E: codex-rs/protocol/src/config_types.rs:709][E: codex-rs/protocol/src/config_types.rs:712]
5. `build_world_state_for_step` 在 collaboration instructions gate 开启时加入 `CollaborationModeState`，section constructor 再根据 effective mode 与 model messages 生成 snapshot。[E: codex-rs/core/src/session/world_state.rs:139][E: codex-rs/core/src/session/world_state.rs:140][E: codex-rs/core/src/session/world_state.rs:142][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:17][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:32]
6. 该 section 渲染 developer-role fragment，markers 仍是 protocol 中的 collaboration tags；full context 由 world-state renderer 注入，steady-state 则与 context manager 保存的 baseline 比较。[E: codex-rs/core/src/context/world_state/collaboration_mode.rs:105][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:110][E: codex-rs/core/src/context_manager/history.rs:98]
7. diff 在 previous known snapshot 的 `(mode, model)` 任一变化时生成；previous absent 且当前有 instructions 也会生成。previous unknown、known `(mode, model)` 完全相同，或 previous absent 且无 instructions 时不重放。legacy/retained fragment matchers 让旧 history 中的 collaboration block 仍能被识别。[E: codex-rs/core/src/context/world_state/collaboration_mode.rs:68][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:72][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:80][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:84][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:88][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:89][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:94]

## 与 multi-agent mode 的边界

collaboration mode 决定 Plan/Default 等工作姿态、model/effort 和 mode instructions；multi-agent mode 则单独决定是否只在明确请求时或可主动 delegation。后者用 `multi_agent_mode` typed section，每 step 从 effective mode 构造，并在所有 extension-contributed world-state sections 之后加入。[E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:14][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:33][E: codex-rs/core/src/session/world_state.rs:208][E: codex-rs/core/src/session/world_state.rs:228]

custom multi-agent hint 上限是 400 tokens；mode 未变化时不重发。从 `Proactive` 撤销配置会显式发回 `ExplicitRequestOnly`，未知初始状态也采用该安全默认；其它已知 mode 变为无配置则不发 diff。[E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:11][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:22][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:57][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:64][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:70]

## 模板语义

| 模板 | 关键语义 |
|---|---|
| Default | active mode 只由新的 developer `<collaboration_mode>` instruction 改变；user request 或 tool description 不改变 mode；Default 下应尽量合理假设并执行。[E: codex-rs/collaboration-mode-templates/templates/default.md:1][E: codex-rs/collaboration-mode-templates/templates/default.md:5][E: codex-rs/collaboration-mode-templates/templates/default.md:11] |
| Plan | Plan mode 是 conversational，直到 developer message 明确结束；用户要求执行也应解释为继续规划。[E: codex-rs/collaboration-mode-templates/templates/plan.md:1][E: codex-rs/collaboration-mode-templates/templates/plan.md:7][E: codex-rs/collaboration-mode-templates/templates/plan.md:9] |
| Plan | Plan mode 可以执行 non-mutating exploration，但禁止编辑文件、运行会重写文件的 formatter/linter、patch/migration/codegen 等 mutating work。[E: codex-rs/collaboration-mode-templates/templates/plan.md:17][E: codex-rs/collaboration-mode-templates/templates/plan.md:19][E: codex-rs/collaboration-mode-templates/templates/plan.md:30] |
| Execute | 独立执行明确任务，少问问题，用合理假设推进并在最终消息说明假设。[E: codex-rs/collaboration-mode-templates/templates/execute.md:1][E: codex-rs/collaboration-mode-templates/templates/execute.md:4][E: codex-rs/collaboration-mode-templates/templates/execute.md:8][E: codex-rs/collaboration-mode-templates/templates/execute.md:11] |
| Pair Programming | 强调与用户边做边对齐；复杂工作更常使用 planning tool。[E: codex-rs/collaboration-mode-templates/templates/pair_programming.md:1][E: codex-rs/collaboration-mode-templates/templates/pair_programming.md:3][E: codex-rs/collaboration-mode-templates/templates/pair_programming.md:4] |

## Tool gate

1. `ModeKind::allows_request_user_input` 只有 `Plan` 返回 true。[E: codex-rs/protocol/src/config_types.rs:668][E: codex-rs/protocol/src/config_types.rs:669]
2. runtime 的 `request_user_input_available_modes` 从 TUI visible modes 过滤可用项：Plan 通过 `allows_request_user_input()` 进入；当 `Feature::DefaultModeRequestUserInput` 开启时，Default 也会进入。[E: codex-rs/tools/src/tool_config.rs:38][E: codex-rs/tools/src/tool_config.rs:39][E: codex-rs/tools/src/tool_config.rs:41][E: codex-rs/tools/src/tool_config.rs:42][E: codex-rs/tools/src/tool_config.rs:43][E: codex-rs/tools/src/tool_config.rs:44]
3. `RequestUserInputHandler` 先拒绝非 root agent，再按当前 turn collaboration mode 调用 unavailable-message gate；通过后仅 Plan mode 设置 `is_blocking=true`。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:60][E: codex-rs/core/src/tools/handlers/request_user_input.rs:61][E: codex-rs/core/src/tools/handlers/request_user_input.rs:66][E: codex-rs/core/src/tools/handlers/request_user_input.rs:67][E: codex-rs/core/src/tools/handlers/request_user_input.rs:74][E: codex-rs/core/src/tools/handlers/request_user_input.rs:76]
4. `PlanHandler` 在 Plan mode 下直接返回错误，非 Plan mode 才 parse args 并发送 `EventMsg::PlanUpdate`。[E: codex-rs/core/src/tools/handlers/plan.rs:84][E: codex-rs/core/src/tools/handlers/plan.rs:85][E: codex-rs/core/src/tools/handlers/plan.rs:90][E: codex-rs/core/src/tools/handlers/plan.rs:91][E: codex-rs/core/src/tools/handlers/plan.rs:92]
5. Plan template 也明确区分 Plan mode 与 `update_plan` checklist tool，说明 `update_plan` 不进入或退出 Plan mode，且在 Plan mode 会报错。[E: codex-rs/collaboration-mode-templates/templates/plan.md:11][E: codex-rs/collaboration-mode-templates/templates/plan.md:13][E: codex-rs/collaboration-mode-templates/templates/plan.md:15]

## 设计动机与权衡

- model 和 reasoning effort 暂时存放在 `CollaborationMode.settings`，session start 处还有 TODO 说明未来可能整合 config.model/config.model_reasoning_effort 与 collaboration mode。[E: codex-rs/protocol/src/config_types.rs:687][E: codex-rs/protocol/src/config_types.rs:691][I]
- thread settings fallback 使用 `with_updates(model, effort, None)`，避免只改 model/effort 时意外清掉 active mode 或 developer instructions。[E: codex-rs/core/src/session/handlers.rs:153][E: codex-rs/core/src/session/handlers.rs:159][E: codex-rs/protocol/src/config_types.rs:712][I]
- runtime hard gate 主要体现在 tool handlers 和 prompt instructions；Plan template 禁止 mutating work，但 `ModeKind` enum 本身并不是全局 filesystem write lock。[E: codex-rs/core/src/tools/handlers/plan.rs:84][E: codex-rs/core/src/tools/handlers/request_user_input.rs:66][E: codex-rs/protocol/src/config_types.rs:668][I]

## Gotcha

- `PairProgramming` 和 `Execute` 仍有模板和 enum 变体，但 serde/schema/TS 标记让它们 hidden，TUI visible list 不包含它们。[E: codex-rs/protocol/src/config_types.rs:640][E: codex-rs/protocol/src/config_types.rs:644][E: codex-rs/protocol/src/config_types.rs:652][E: codex-rs/collaboration-mode-templates/src/lib.rs:3][E: codex-rs/collaboration-mode-templates/src/lib.rs:4]
- mode update 已不再由 `context_manager/updates.rs` 的专用 builder 负责；typed world state 以 snapshot 去重，并保留 legacy/retained fragment matcher。world-state builder 是否加入该 section 由 `include_collaboration_mode_instructions` 控制。[E: codex-rs/core/src/session/world_state.rs:139][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:17][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:68][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:72]
- Default 模板规定用户请求或工具描述不能改变 active mode；只有 developer instructions 中的新 collaboration-mode block 才能改变。[E: codex-rs/collaboration-mode-templates/templates/default.md:5]

## Sources

- `codex-rs/collaboration-mode-templates/src/lib.rs`
- `codex-rs/collaboration-mode-templates/templates/default.md`
- `codex-rs/collaboration-mode-templates/templates/plan.md`
- `codex-rs/collaboration-mode-templates/templates/execute.md`
- `codex-rs/collaboration-mode-templates/templates/pair_programming.md`
- `codex-rs/core/src/context/world_state/collaboration_mode.rs`
- `codex-rs/core/src/context/world_state/multi_agent_mode.rs`
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
