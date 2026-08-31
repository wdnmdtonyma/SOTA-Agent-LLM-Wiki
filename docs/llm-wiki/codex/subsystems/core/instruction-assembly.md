---
id: subsys.core.instruction-assembly
title: 指令/prompt 装配
kind: subsystem
tier: T2
source: [codex-rs/context-fragments/src/fragment.rs, codex-rs/ext/extension-api/src/contributors/prompt.rs, codex-rs/core/src/context/mod.rs, codex-rs/core/src/context/environment_context.rs, codex-rs/core/src/context/environments_instructions.rs, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/context/world_state/environment.rs, codex-rs/core/src/context/world_state/environments_instructions.rs, codex-rs/core/src/context/world_state/permissions.rs, codex-rs/core/src/context/world_state/collaboration_mode.rs, codex-rs/core/src/context/world_state/realtime.rs, codex-rs/core/src/context/world_state/apps_instructions.rs, codex-rs/core/src/context/world_state/plugins_instructions.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/context/apps_instructions.rs, codex-rs/ext/skills/src/fragments.rs, codex-rs/ext/skills/src/extension.rs, codex-rs/ext/skills/src/host_prompt.rs, codex-rs/core/src/context/available_plugins_instructions.rs, codex-rs/core/src/context/plugin_instructions.rs, codex-rs/core/src/context/recommended_plugins_instructions.rs, codex-rs/core/src/context/user_instructions.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/agents_md.rs]
symbols: [ContextualUserFragment, RenderedFragment, PromptSlot, WorldState, WorldStateSection, EnvironmentsState, EnvironmentsInstructionsState, PermissionsState, AppsInstructionsState, PluginsInstructionsState, UserInstructions, Session::build_initial_context_with_world_state, Session::build_world_state_for_step, LoadedAgentsMd, SkillInstructions, AvailableSkillsInstructions]
related: [subsys.core.context-manager, subsys.core.turn-engine, subsys.core.memory, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> 指令/prompt 装配是 Codex 把模型切换说明、权限、developer instructions、apps/skills/plugins、extension prompt fragments、AGENTS.md/world-state user context、token budget 和 environment context 聚合成 model-visible `ResponseItem::Message` 的过程；当前 `ContextualUserFragment` trait 位于 `codex-rs/context-fragments/src/fragment.rs`，并由 `core/src/context/mod.rs` re-export。skills 的 catalog/explicit injection fragment 都在 `ext/skills`，旧 `core-skills` crate 已删除。[E: codex-rs/core/src/session/mod.rs:3782][E: codex-rs/context-fragments/src/fragment.rs:64][E: codex-rs/core/src/context/mod.rs:57][E: codex-rs/ext/skills/src/fragments.rs:11]

## 能回答的问题

- `ContextualUserFragment` 如何渲染 role、marker 和 `ResponseItem::Message`？
- `Session::build_initial_context_with_world_state` 当前按什么顺序构造 developer/contextual user/separate developer messages？
- steady-state settings diff 覆盖哪些 fragment，哪些仍只在 initial context 路径出现？
- AGENTS.md / configured user instructions 为什么是 user-role contextual fragment？
- apps、skills、plugins、recommended plugins 与 extension prompt contributors 分别进入哪个 prompt slot？

## 职责边界

`codex-rs/context-fragments` 定义通用 fragment trait；`codex-rs/core/src/context/` 提供 Codex 内置 fragment 类型和 re-export；skills catalog 与 explicit `<skill>` injection 都在 `codex-rs/ext/skills`；`Session::build_initial_context_with_world_state` 决定 full-context 注入顺序，而 steady-state world-state diff 由 session 通过 `ContextManager::update_world_state` 合并。[E: codex-rs/core/src/session/mod.rs:3782][E: codex-rs/ext/skills/src/fragments.rs:11][E: codex-rs/core/src/session/mod.rs:4169] 具体 model sampling 和 tool dispatch 属于 turn engine，不属于本节点。[I]

## 关键 crate/文件

- `codex-rs/context-fragments/src/fragment.rs`: `RenderedFragment` 保存 role 与 annotated content；`ContextualUserFragment` 规定 `role()`、`content_kind()`、`markers()`、`body()`、`type_markers()`、`render()` 和 `into()`；有 marker 时 `render()` 拼接 start/body/end，无 marker 时只返回 body。[E: codex-rs/context-fragments/src/fragment.rs:8][E: codex-rs/context-fragments/src/fragment.rs:64][E: codex-rs/context-fragments/src/fragment.rs:75][E: codex-rs/context-fragments/src/fragment.rs:91][E: codex-rs/context-fragments/src/fragment.rs:109]
- `codex-rs/ext/extension-api/src/contributors/prompt.rs`: `PromptSlot` 现为 `DeveloperPolicy`、`DeveloperCapabilities`、`ContextWindow`。旧的 ContextualUser / SeparateDeveloper slot 已删除。[E: codex-rs/ext/extension-api/src/contributors/prompt.rs:8]
- `codex-rs/core/src/context/mod.rs`: 内置 context fragments 的 module/re-export 表；这里把 `ContextualUserFragment` 从 `codex_context_fragments` 暴露给 core。[E: codex-rs/core/src/context/mod.rs:3][E: codex-rs/core/src/context/mod.rs:11][E: codex-rs/core/src/context/mod.rs:57]
- `codex-rs/core/src/session/mod.rs`: `build_initial_context_with_world_state` 汇总 developer/contextual user/separate developer sections，并在末尾构造 `ResponseItem` 列表。[E: codex-rs/core/src/session/mod.rs:3782][E: codex-rs/core/src/session/mod.rs:3787][E: codex-rs/core/src/session/mod.rs:3964]
- `codex-rs/core/src/context_manager/updates.rs`: 只负责把 `RenderedFragment` 组装成 developer/user messages，以及按 fragment role 合并 world-state/extension fragments。[E: codex-rs/core/src/context_manager/updates.rs:12][E: codex-rs/core/src/context_manager/updates.rs:32]
- `codex-rs/ext/skills/src/fragments.rs` 与 `extension.rs` / `host_prompt.rs`: available-skills developer fragment、host/executor catalog rendering，以及 explicit skill injection 的 user-role `<skill>` fragment。旧的 `core-skills/src/skill_instructions.rs` 已不存在。[E: codex-rs/ext/skills/src/fragments.rs:11][E: codex-rs/ext/skills/src/fragments.rs:39][E: codex-rs/ext/skills/src/fragments.rs:76][E: codex-rs/ext/skills/src/host_prompt.rs:90]
- `codex-rs/core/src/session/world_state.rs`: permissions、collaboration、realtime、environment 等会变的 model-visible context 已移到 typed world-state builder。[E: codex-rs/core/src/session/world_state.rs:35][E: codex-rs/core/src/session/world_state.rs:91][E: codex-rs/core/src/session/world_state.rs:173][E: codex-rs/core/src/session/world_state.rs:196]
- `codex-rs/core/src/agents_md.rs`: AGENTS.md discovery 从 project root 到 cwd 收集候选文件，`LoadedAgentsMd::legacy_text` 在 user/internal instructions 到 project instructions 的边界插入 `AGENTS_MD_SEPARATOR`。[E: codex-rs/core/src/agents_md.rs:187][E: codex-rs/core/src/agents_md.rs:210][E: codex-rs/core/src/agents_md.rs:221][E: codex-rs/core/src/agents_md.rs:352][E: codex-rs/core/src/agents_md.rs:367]

## 数据模型

`ContextualUserFragment::into` 经 `render_fragment()` 生成 `RenderedFragment`，再 `From` 成 `ResponseItem::Message`：role 来自 concrete fragment 的 `role()`，content 是 annotated input text。旧的 `into_response_input_item` 已删除。[E: codex-rs/context-fragments/src/fragment.rs:102][E: codex-rs/context-fragments/src/fragment.rs:109][E: codex-rs/context-fragments/src/fragment.rs:35]

`EnvironmentsState` 当前可以表达 multiple environments、date/timezone、network、filesystem permission profile 和 subagents；`from_turn_context_with_environments` 从 `TurnContext` 和 `TurnEnvironmentSnapshot` 构造环境，再附加 workspace roots / permission profile 文件系统上下文，session world-state builder 负责附加 subagents。[E: codex-rs/core/src/context/world_state/environment.rs:29][E: codex-rs/core/src/context/world_state/environment.rs:40][E: codex-rs/core/src/context/world_state/environment.rs:73][E: codex-rs/core/src/session/world_state.rs:237]

Deferred executor 开启时，`EnvironmentsInstructionsState` 额外注入 generic execution-environment guidance，说明 starting environment 尚不可用且只应在任务确实依赖它时等待。Apps/plugins availability 也已变成 typed world-state sections，状态从 unavailable → available 时可通过 deterministic diff 补发，而不是只在首轮 hard-code。[E: codex-rs/core/src/context/environments_instructions.rs:29][E: codex-rs/core/src/context/world_state/environments_instructions.rs:8][E: codex-rs/core/src/session/world_state.rs:247][E: codex-rs/core/src/session/world_state.rs:267][E: codex-rs/core/src/session/world_state.rs:272]

AGENTS.md/configured instructions 使用 `UserInstructions` fragment，role 固定是 `user`，marker 是 `# AGENTS.md instructions` / `</INSTRUCTIONS>`；`body()` 把可选 directory 和 `<INSTRUCTIONS>` 包进正文。[E: codex-rs/core/src/context/user_instructions.rs:10][E: codex-rs/core/src/context/user_instructions.rs:15][E: codex-rs/core/src/context/user_instructions.rs:23][E: codex-rs/core/src/context/user_instructions.rs:27]

## Initial context 控制流

1. `build_initial_context_with_world_state` 先创建 `developer_sections`、`contextual_user_sections`、`separate_developer_sections` 和 `context_window_hints`；它从 session state 只读取 `session_source` 与 auto-compact window ids，其余 initial context 来自传入的 `TurnContext`、`WorldState` 和 extension contributors。[E: codex-rs/core/src/session/mod.rs:3782][E: codex-rs/core/src/session/mod.rs:3787][E: codex-rs/core/src/session/mod.rs:3791]
2. model switch、personality、context-window guidance 和 permissions 都在 world state 中构造；`render_full()` 遇到 model-switch fragment 时会把它插到 developer bundle 最前面。[E: codex-rs/core/src/session/world_state.rs:91][E: codex-rs/core/src/session/world_state.rs:105][E: codex-rs/core/src/session/world_state.rs:173][E: codex-rs/core/src/session/mod.rs:3932][E: codex-rs/core/src/session/mod.rs:3938]
3. 普通 developer instructions 进入聚合 developer bundle；guardian reviewer source 会跳过这个聚合分支，并在函数末尾把 developer instructions 作为单独 developer item 追加。[E: codex-rs/core/src/session/mod.rs:3798][E: codex-rs/core/src/session/mod.rs:3802][E: codex-rs/core/src/session/mod.rs:3991]
4. Skills catalog 由 skills extension 的 world-state contributor 提供；personality、collaboration、realtime、execution-environment guidance、apps/plugin availability 等 typed state 来自 `world_state.render_full()` 或 extension context contributors。[E: codex-rs/ext/skills/src/extension.rs:249][E: codex-rs/core/src/session/world_state.rs:105][E: codex-rs/core/src/session/world_state.rs:196][E: codex-rs/core/src/session/world_state.rs:247][E: codex-rs/core/src/session/mod.rs:3932]
5. recommended plugins 是 contextual user section；available plugins 是 world-state developer section（`PluginsInstructionsState` / `AvailablePluginsInstructions`）。[E: codex-rs/core/src/session/mod.rs:3834][E: codex-rs/core/src/session/world_state.rs:272][E: codex-rs/core/src/context/available_plugins_instructions.rs:15]
6. Extension `contribute_thread_context` 按 `PromptSlot` 分流：`ContextWindow` 进入 token-budget hints，`DeveloperPolicy` / `DeveloperCapabilities` 进入 developer sections。`contribute_turn_context` 的返回值全部进入 developer sections。旧的 `push_prompt_fragment` 已删除。[E: codex-rs/core/src/session/mod.rs:3849][E: codex-rs/core/src/session/mod.rs:3850][E: codex-rs/core/src/session/mod.rs:3853][E: codex-rs/core/src/session/mod.rs:3871]
7. token budget 是 full-context developer metadata，被放进 separate developer sections（可附带 context-window hints）；`world_state.render_full()` 生成的 developer fragments 进入 developer sections，user fragments 进入 contextual user sections。[E: codex-rs/core/src/session/mod.rs:3875][E: codex-rs/core/src/session/mod.rs:3916][E: codex-rs/core/src/session/mod.rs:3932][E: codex-rs/core/src/session/mod.rs:3958][E: codex-rs/core/src/session/mod.rs:3959]
8. 最后先构造聚合 developer message，再构造每个 separate developer message、initial multi-agent-mode item、聚合 contextual user message，最后追加 guardian separate developer message 与 managed developer instructions。[E: codex-rs/core/src/session/mod.rs:3964][E: codex-rs/core/src/session/mod.rs:3970][E: codex-rs/core/src/session/mod.rs:3977][E: codex-rs/core/src/session/mod.rs:3984][E: codex-rs/core/src/session/mod.rs:3991][E: codex-rs/core/src/session/mod.rs:4001]

## Steady-state update 控制流

Model、personality、environment、permissions、collaboration、realtime、tools、extension sections 与 multi-agent policy 都统一由各自 `WorldStateSection::render_diff` 和 `ContextManager::update_world_state` 生成；session 再按 fragment role 合并，并在 model-visible items 之后持久化 world-state merge patch。[E: codex-rs/core/src/context/world_state/mod.rs:400][E: codex-rs/core/src/context/world_state/mod.rs:405][E: codex-rs/core/src/session/world_state.rs:91][E: codex-rs/core/src/session/world_state.rs:323][E: codex-rs/core/src/session/mod.rs:4169]

当 `TurnContextItem` 变化时，session 另外调用 `build_turn_context_contribution_items`（内部走 extension `contribute_turn_context`），再用 `updates.rs` 的 helpers 生成 developer messages；这条路径不是旧式 core settings builder。[E: codex-rs/core/src/session/mod.rs:3753][E: codex-rs/core/src/session/mod.rs:3763][E: codex-rs/core/src/session/mod.rs:4177]

## 设计动机与权衡

初始装配把 developer sections 和 contextual user sections 分开聚合，说明 Codex 有意把 policy/capability/tooling 类指令与 workspace/user-context 类 scaffold 分 role 发送；separate developer slot 又让 guardian policy、token-budget metadata 或 multi-agent hint 能成为独立 top-level developer item。[E: codex-rs/core/src/session/mod.rs:3787][E: codex-rs/core/src/session/mod.rs:3964][E: codex-rs/core/src/session/mod.rs:3970][I]

marker-based matching 只对有 start/end marker 的 fragment 生效；空 marker fragment 不会匹配任意 text，这降低了 context filtering 误删普通正文的风险。[E: codex-rs/context-fragments/src/fragment.rs:121][E: codex-rs/context-fragments/src/fragment.rs:122][I]

## gotcha

- Memory developer instructions 不再由 `Session::build_initial_context_with_world_state` 里的硬编码 memory 分支读取；当前 full-context 路径通过 extension `contribute_thread_context` 注入。`PromptSlot::ContextWindow` 进入 token-budget hints，policy/capability 进入 developer sections。[E: codex-rs/core/src/session/mod.rs:3849][E: codex-rs/core/src/session/mod.rs:3850][E: codex-rs/core/src/session/mod.rs:3853]
- Available skills catalog 由 `codex-rs/ext/skills` 渲染成 developer fragment；host explicit skill injection 也由同 crate 的 `SkillInstructions` 渲染成 user-role `<skill>` fragment，不再经过已删除的 `codex_core_skills`。[E: codex-rs/ext/skills/src/fragments.rs:39][E: codex-rs/ext/skills/src/fragments.rs:76][E: codex-rs/ext/skills/src/fragments.rs:90][E: codex-rs/ext/skills/src/host_prompt.rs:90]
- `host_skills` world-state section 被 core 特殊插到 permissions section 之前，避免权限说明先打断 skills context。[E: codex-rs/core/src/context/world_state/mod.rs:376][E: codex-rs/core/src/context/world_state/mod.rs:379]
- steady-state path 没有 `build_settings_update_items`；core state 统一走 world-state diff，只有 extension turn-context contributors 在 `TurnContextItem` 变化时额外运行。[E: codex-rs/core/src/session/mod.rs:4169][E: codex-rs/core/src/session/mod.rs:4177]

## Sources

- `codex-rs/context-fragments/src/fragment.rs`
- `codex-rs/ext/extension-api/src/contributors/prompt.rs`
- `codex-rs/core/src/context/mod.rs`
- `codex-rs/core/src/context/environment_context.rs`
- `codex-rs/core/src/context/environments_instructions.rs`
- `codex-rs/core/src/context/world_state/mod.rs`
- `codex-rs/core/src/context/world_state/environment.rs`
- `codex-rs/core/src/context/world_state/environments_instructions.rs`
- `codex-rs/core/src/context/world_state/permissions.rs`
- `codex-rs/core/src/context/world_state/collaboration_mode.rs`
- `codex-rs/core/src/context/world_state/realtime.rs`
- `codex-rs/core/src/context/world_state/apps_instructions.rs`
- `codex-rs/core/src/context/world_state/plugins_instructions.rs`
- `codex-rs/core/src/session/world_state.rs`
- `codex-rs/core/src/context/apps_instructions.rs`
- `codex-rs/ext/skills/src/fragments.rs`
- `codex-rs/ext/skills/src/extension.rs`
- `codex-rs/ext/skills/src/host_prompt.rs`
- `codex-rs/core/src/context/available_plugins_instructions.rs`
- `codex-rs/core/src/context/plugin_instructions.rs`
- `codex-rs/core/src/context/recommended_plugins_instructions.rs`
- `codex-rs/core/src/context/user_instructions.rs`
- `codex-rs/core/src/context_manager/updates.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/agents_md.rs`

## 相关

- [Context manager](context-manager.md) — `reference_context_item` 与 settings diff baseline。
- [Turn 引擎](turn-engine.md) — initial context、skills/plugins 和 user input 何时进入 turn history。
- [长期 Memory](memory.md) — memory prompt contributor 和 memory tools 如何接入 extension surface。
- [Guardian 审批流](approval-guardian.md) — guardian policy prompt 的 separate developer item。
