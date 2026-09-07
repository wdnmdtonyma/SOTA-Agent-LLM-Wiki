---
id: subsys.core.collaboration-modes
title: Collaboration modes 状态机
kind: subsystem
tier: T2
source: [codex-rs/collaboration-mode-templates/src/lib.rs, codex-rs/collaboration-mode-templates/templates/default.md, codex-rs/collaboration-mode-templates/templates/plan.md, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/context/world_state/collaboration_mode.rs, codex-rs/core/src/context/world_state/multi_agent_mode.rs, codex-rs/core/src/session/world_state.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/protocol.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/thread_settings.rs, codex-rs/core/src/session/step_settings.rs, codex-rs/core/src/tools/handlers/plan.rs, codex-rs/core/src/tools/handlers/request_user_input.rs, codex-rs/tools/src/tool_config.rs, codex-rs/agent-roles/src/lib.rs, codex-rs/agent-roles/src/loader.rs, codex-rs/agent-roles/src/discovery.rs, codex-rs/agent-roles/src/agent_role_config.rs, codex-rs/core/src/agent/role.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs]
symbols: [ModeKind, CollaborationMode, Settings, CollaborationModeMask, CollaborationModeState, MultiAgentModeState, AgentRoleConfig, load_agent_roles, apply_role_to_config]
related: [tool.request-user-input, tool.update-plan, tool.spawn-agent-v2, config.ui-tui, subsys.core.context-manager]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> Collaboration modes 是 Codex 把工作姿态、model、reasoning effort 和 mode-specific developer instructions 作为 session/thread settings 传递的机制。`ModeKind` 现在只有 `Plan` 与 `Default`；TUI visible list 也只暴露这两项。旧名 `pair_programming` / `execute` / `code` / `custom` 仍是 `Default` 的 serde alias，不再是独立 enum 变体或独立模板。子 agent 的角色文件由独立 crate `codex-rs/agent-roles` 发现/加载，再经 `apply_role_to_config` 收紧 parent config。[E: codex-rs/protocol/src/config_types.rs:673][E: codex-rs/protocol/src/config_types.rs:685][E: codex-rs/agent-roles/src/loader.rs:23][E: codex-rs/core/src/agent/role.rs:51]

## 能回答的问题

- `ModeKind` 当前有哪些变体，哪些对 TUI 可见？
- collaboration mode 如何携带 model、reasoning effort、developer instructions？
- mode developer instructions 如何进入 prompt history？
- `update_plan` 和 `request_user_input` 如何受 Plan mode 影响？
- thread settings 不带 `collaboration_mode` 时如何更新当前 mode 的 model/effort？
- `agent-roles` crate 如何发现、合并角色，并在 spawn 时收紧 child config？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/collaboration-mode-templates/src/lib.rs` | 内嵌两份模板：plan/default。`execute.md` 与 `pair_programming.md` 已删除。[E: codex-rs/collaboration-mode-templates/src/lib.rs:1] |
| `codex-rs/protocol/src/config_types.rs` | `ModeKind`、visible modes、mode capability、`CollaborationMode`、settings/mask。[E: codex-rs/protocol/src/config_types.rs:673][E: codex-rs/protocol/src/config_types.rs:685][E: codex-rs/protocol/src/config_types.rs:707] |
| `codex-rs/protocol/src/protocol.rs` | collaboration mode prompt tags 与 `ThreadSettingsOverrides.collaboration_mode`。[E: codex-rs/protocol/src/protocol.rs:131][E: codex-rs/protocol/src/protocol.rs:568] |
| `codex-rs/core/src/context/world_state/collaboration_mode.rs` | `CollaborationModeState` 保存 mode snapshot 与非空 instructions，并实现 full/diff fragment rendering。[E: codex-rs/core/src/context/world_state/collaboration_mode.rs:18] |
| `codex-rs/core/src/context/world_state/multi_agent_mode.rs` | 独立保存 sub-agent delegation policy；它不是 `ModeKind`，也不改变 Plan/Default collaboration mode。[E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:17] |
| `codex-rs/core/src/session/world_state.rs` | 每 step 从当前 turn context 构造 typed world state，并按 feature gate 加入 collaboration section。[E: codex-rs/core/src/session/world_state.rs:195] |
| `codex-rs/core/src/session/mod.rs` | session 默认 collaboration mode 与 current mode 读取。[E: codex-rs/core/src/session/mod.rs:728][E: codex-rs/core/src/session/mod.rs:3860] |
| `codex-rs/core/src/session/thread_settings.rs` | 把 protocol overrides 映到 `StepSettingsUpdate`。[E: codex-rs/core/src/session/thread_settings.rs:41] |
| `codex-rs/core/src/session/step_settings.rs` | 无 `collaboration_mode` 时调用 `with_updates`，保留 mode/instructions，只刷 model/effort。[E: codex-rs/core/src/session/step_settings.rs:261] |
| `codex-rs/core/src/tools/handlers/plan.rs` | `update_plan` 在 Plan mode 下硬拒绝。[E: codex-rs/core/src/tools/handlers/plan.rs:89] |
| `codex-rs/core/src/tools/handlers/request_user_input.rs` | 只允许 root thread，并按当前 collaboration mode 做 availability gate；Plan mode 将请求标成 blocking。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:68][E: codex-rs/core/src/tools/handlers/request_user_input.rs:84] |
| `codex-rs/tools/src/tool_config.rs` | 计算 `request_user_input` 可用 modes：Plan 来自 `allows_request_user_input()`，Default 可由 `DefaultModeRequestUserInput` feature 加入。[E: codex-rs/tools/src/tool_config.rs:17] |
| `codex-rs/agent-roles/src/*` | 角色文件 discovery/loader；`AgentRoleConfig` 含 description / config_file / nickname_candidates。[E: codex-rs/agent-roles/src/agent_role_config.rs:10] |
| `codex-rs/core/src/agent/role.rs` | `apply_role_to_config`：角色只能收紧 parent，不能替换 parent 权威。[E: codex-rs/core/src/agent/role.rs:51] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `ModeKind` | 变体只有 `Plan` 与 default `Default`。`Default` 兼容旧 alias `code`、`pair_programming`、`execute`、`custom`。`PairProgramming` / `Execute` 变体已从 enum 删除。[E: codex-rs/protocol/src/config_types.rs:673] |
| TUI visibility | `TUI_VISIBLE_COLLABORATION_MODES` 只包含 `Default` 和 `Plan`；`ModeKind::is_tui_visible` 同样只匹配这两者。[E: codex-rs/protocol/src/config_types.rs:685][E: codex-rs/protocol/src/config_types.rs:695] |
| `CollaborationMode` | 字段是 `mode` 和 `settings`。[E: codex-rs/protocol/src/config_types.rs:707] |
| `Settings` | 包含 `model`、可选 `reasoning_effort`、可选 `developer_instructions`。[E: codex-rs/protocol/src/config_types.rs:779] |
| `CollaborationModeMask` | 可选覆盖 mode/model/reasoning/developer instructions；`name` 是 metadata，不参与 `apply_mask` 的 runtime output。[E: codex-rs/protocol/src/config_types.rs:788] |
| `AgentRoleConfig` | `description`、`config_file`、`nickname_candidates`。[E: codex-rs/agent-roles/src/agent_role_config.rs:10] |

## 控制流

1. session start 时构造 `ModeKind::Default` 的 `CollaborationMode`，settings 取当前 model、config reasoning effort，developer instructions 为 None。[E: codex-rs/core/src/session/mod.rs:728]
2. `Session::collaboration_mode()` 从 session state 的 `step_settings.collaboration_mode` 返回 clone；tools handler 通过 turn context 读取实时 mode。[E: codex-rs/core/src/session/mod.rs:3860]
3. `ThreadSettingsOverrides.collaboration_mode` 的注释说明该字段优先于 model、effort 和 developer instructions。[E: codex-rs/protocol/src/protocol.rs:568]
4. `thread_settings::prepare_update` 只是把 overrides 映到 `StepSettingsUpdate`。真正 fallback 在 `StepSettings::apply`：没有 `collaboration_mode` 时调用 `with_updates(model, effort, None)`，保留当前 mode 和 developer instructions，只刷新 model/effort。[E: codex-rs/core/src/session/thread_settings.rs:41][E: codex-rs/core/src/session/step_settings.rs:261]
5. `build_world_state_for_step` 在 collaboration instructions gate 开启时加入 `CollaborationModeState`，section constructor 再根据 effective mode 与 model messages 生成 snapshot。[E: codex-rs/core/src/session/world_state.rs:195][E: codex-rs/core/src/context/world_state/collaboration_mode.rs:24]
6. 该 section 渲染 developer-role fragment，markers 仍是 protocol 中的 collaboration tags；full context 由 world-state renderer 注入，steady-state 则与 context manager 保存的 baseline 比较。[E: codex-rs/protocol/src/protocol.rs:131]

## Agent roles

`codex-rs/agent-roles` 只做 discovery/loader，不另建 wiki 节点。`load_agent_roles` 按 config layer 低→高合并；同层可声明 `agents.roles`，再扫描 `{config_folder}/agents/**/*.toml`。声明过的 `config_file` 不再被目录发现重复加载。[E: codex-rs/agent-roles/src/loader.rs:29][E: codex-rs/agent-roles/src/loader.rs:75][E: codex-rs/agent-roles/src/loader.rs:299][E: codex-rs/agent-roles/src/discovery.rs:7]

校验：

- 用户角色必须有 description。[E: codex-rs/agent-roles/src/loader.rs:237]
- 角色文件无 `role_name_hint` 时必须有 `developer_instructions`。[E: codex-rs/agent-roles/src/agent_role_config.rs:67]
- nickname 非空、去重、仅 ASCII 字母数字 / 空格 / `-` / `_`。[E: codex-rs/agent-roles/src/agent_role_config.rs:193]

`apply_role_to_config` 把角色 layer 投到 parent-derived config：可以关 `ShellTool` / `Apps` / `Personality` / `Plugins` / `MemoryTool` / `RequestPermissionsTool`，也可以禁 skill；不能替换 parent 权威。[E: codex-rs/core/src/agent/role.rs:51][E: codex-rs/core/src/agent/role.rs:91]

spawn schema 的 `agent_type` 仅在 `!agent_roles.is_empty()` 时暴露。[E: codex-rs/core/src/tools/spec_plan.rs:1306]

## 与 multi-agent mode 的边界

collaboration mode 决定 Plan/Default 等工作姿态、model/effort 和 mode instructions；multi-agent mode 则单独决定是否只在明确请求时或可主动 delegation。后者用 `multi_agent_mode` typed section，每 step 从 effective mode 构造，并在所有 extension-contributed world-state sections 之后加入。[E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:17][E: codex-rs/core/src/session/world_state.rs:313]

custom multi-agent hint 上限是 400 tokens；mode 未变化时不重发。从 `Proactive` 撤销配置会显式发回 `ExplicitRequestOnly`。[E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:13][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:76]

## 模板语义

| 模板 | 关键语义 |
|---|---|
| Default | active mode 只由新的 developer `<collaboration_mode>` instruction 改变；user request 或 tool description 不改变 mode；Default 下应尽量合理假设并执行。[E: codex-rs/collaboration-mode-templates/templates/default.md:1] |
| Plan | Plan mode 是 conversational，直到 developer message 明确结束；用户要求执行也应解释为继续规划。[E: codex-rs/collaboration-mode-templates/templates/plan.md:1] |
| Plan | Plan mode 可以执行 non-mutating exploration，但禁止编辑文件、运行会重写文件的 formatter/linter、patch/migration/codegen 等 mutating work。[E: codex-rs/collaboration-mode-templates/templates/plan.md:17] |

## Tool gate

1. `ModeKind::allows_request_user_input` 只有 `Plan` 返回 true。[E: codex-rs/protocol/src/config_types.rs:699]
2. runtime 的 `request_user_input_available_modes` 从 TUI visible modes 过滤可用项：Plan 通过 `allows_request_user_input()` 进入；当 `Feature::DefaultModeRequestUserInput` 开启时，Default 也会进入。[E: codex-rs/tools/src/tool_config.rs:17]
3. `RequestUserInputHandler` 先拒绝非 root agent，再按当前 turn collaboration mode 调用 unavailable-message gate；通过后仅 Plan mode 设置 `is_blocking=true`。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:68][E: codex-rs/core/src/tools/handlers/request_user_input.rs:84]
4. `PlanHandler` 在 Plan mode 下直接返回错误，非 Plan mode 才 parse args 并发送 `EventMsg::PlanUpdate`。[E: codex-rs/core/src/tools/handlers/plan.rs:89]
5. Plan template 也明确区分 Plan mode 与 `update_plan` checklist tool，说明 `update_plan` 不进入或退出 Plan mode，且在 Plan mode 会报错。[E: codex-rs/collaboration-mode-templates/templates/plan.md:11]

## 设计动机与权衡

- model 和 reasoning effort 暂时存放在 `CollaborationMode.settings`，session start 处还有 TODO 说明未来可能整合 config.model/config.model_reasoning_effort 与 collaboration mode。[E: codex-rs/core/src/session/mod.rs:727][I]
- thread settings fallback 使用 `with_updates(model, effort, None)`，避免只改 model/effort 时意外清掉 active mode 或 developer instructions。[E: codex-rs/core/src/session/step_settings.rs:268][I]
- agent-roles 做成独立 crate，是为了让 config layer 扫描与 spawn 时的 bounded override 共用同一套 discovery/validate，而不是在 core 里再写一份 TOML 解析。[E: codex-rs/agent-roles/src/lib.rs:8][I]
- runtime hard gate 主要体现在 tool handlers 和 prompt instructions；Plan template 禁止 mutating work，但 `ModeKind` enum 本身并不是全局 filesystem write lock。[E: codex-rs/core/src/tools/handlers/plan.rs:89][I]

## Gotcha

- `PairProgramming` 和 `Execute` 不再是 `ModeKind` 变体，也不再有独立模板。旧 wire/config 名通过 serde alias 落到 `Default`。[E: codex-rs/protocol/src/config_types.rs:677]
- mode update 的 fallback 已从 `session/thread_settings.rs` 迁到 `session/step_settings.rs`；`thread_settings.rs` 只做 overrides → `StepSettingsUpdate` 映射。[E: codex-rs/core/src/session/thread_settings.rs:41][E: codex-rs/core/src/session/step_settings.rs:261]
- Default 模板规定用户请求或工具描述不能改变 active mode；只有 developer instructions 中的新 collaboration-mode block 才能改变。[E: codex-rs/collaboration-mode-templates/templates/default.md:5]
- spawn 时 full-history fork 默认不套 role；只有显式 `agent_type` 才会 `apply_spawn_agent_role`，并在 child 还没有 developer instructions 时回填 parent。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:137]

## Sources

- `codex-rs/collaboration-mode-templates/src/lib.rs`
- `codex-rs/collaboration-mode-templates/templates/default.md`
- `codex-rs/collaboration-mode-templates/templates/plan.md`
- `codex-rs/core/src/context/world_state/collaboration_mode.rs`
- `codex-rs/core/src/context/world_state/multi_agent_mode.rs`
- `codex-rs/core/src/context/world_state/mod.rs`
- `codex-rs/core/src/session/world_state.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/thread_settings.rs`
- `codex-rs/core/src/session/step_settings.rs`
- `codex-rs/core/src/tools/handlers/plan.rs`
- `codex-rs/core/src/tools/handlers/request_user_input.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/agent-roles/src/lib.rs`
- `codex-rs/agent-roles/src/loader.rs`
- `codex-rs/agent-roles/src/discovery.rs`
- `codex-rs/agent-roles/src/agent_role_config.rs`
- `codex-rs/core/src/agent/role.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs`

## 相关

- [request_user_input 工具](../../surface/tools/request-user-input.md)
- [update_plan 工具](../../surface/tools/update-plan.md)
- [spawn_agent V2](../../surface/tools/spawn-agent-v2.md)
- 索引 id：`config.ui-tui`
- [Context manager](context-manager.md)
