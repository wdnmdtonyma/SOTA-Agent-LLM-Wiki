---
id: subsys.core.instruction-assembly
title: 指令/prompt 装配
kind: subsystem
tier: T2
source: [codex-rs/context-fragments/src/fragment.rs, codex-rs/core/src/context/mod.rs, codex-rs/core/src/context/environment_context.rs, codex-rs/core/src/context/environments_instructions.rs, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/context/world_state/environment.rs, codex-rs/core/src/context/world_state/environments_instructions.rs, codex-rs/core/src/context/world_state/permissions.rs, codex-rs/core/src/context/world_state/collaboration_mode.rs, codex-rs/core/src/context/world_state/realtime.rs, codex-rs/core/src/context/world_state/apps_instructions.rs, codex-rs/core/src/context/world_state/plugins_instructions.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/context/apps_instructions.rs, codex-rs/ext/skills/src/fragments.rs, codex-rs/ext/skills/src/extension.rs, codex-rs/core-skills/src/skill_instructions.rs, codex-rs/core/src/context/available_plugins_instructions.rs, codex-rs/core/src/context/plugin_instructions.rs, codex-rs/core/src/context/recommended_plugins_instructions.rs, codex-rs/core/src/context/user_instructions.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/agents_md.rs]
symbols: [ContextualUserFragment, WorldState, WorldStateSection, EnvironmentsState, EnvironmentsInstructionsState, PermissionsState, AppsInstructionsState, PluginsInstructionsState, UserInstructions, Session::build_initial_context_with_world_state, Session::build_world_state_for_step, LoadedAgentsMd]
related: [subsys.core.context-manager, subsys.core.turn-engine, subsys.core.memory, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: 7750465934
---

> 指令/prompt 装配是 Codex 把模型切换说明、权限、developer instructions、apps/skills/plugins、extension prompt fragments、AGENTS.md/world-state user context、token budget 和 environment context 聚合成 model-visible `ResponseItem::Message` 的过程；当前 `ContextualUserFragment` trait 位于 `codex-rs/context-fragments/src/fragment.rs`，并由 `core/src/context/mod.rs` re-export。[E: codex-rs/core/src/session/mod.rs:3393][E: codex-rs/core/src/session/mod.rs:3398][E: codex-rs/core/src/session/mod.rs:3399][E: codex-rs/core/src/session/mod.rs:3450][E: codex-rs/core/src/session/mod.rs:3529][E: codex-rs/context-fragments/src/fragment.rs:14][E: codex-rs/core/src/context/mod.rs:42]

## 能回答的问题

- `ContextualUserFragment` 如何渲染 role、marker 和 `ResponseItem::Message`？
- `Session::build_initial_context_with_world_state` 当前按什么顺序构造 developer/contextual user/separate developer messages？
- steady-state settings diff 覆盖哪些 fragment，哪些仍只在 initial context 路径出现？
- AGENTS.md / configured user instructions 为什么是 user-role contextual fragment？
- apps、skills、plugins、recommended plugins 与 extension prompt contributors 分别进入哪个 prompt slot？

## 职责边界

`codex-rs/context-fragments` 定义通用 fragment trait；`codex-rs/core/src/context/` 提供 Codex 内置 fragment 类型和 re-export；skills catalog 已迁到 `codex-rs/ext/skills`；`Session::build_initial_context_with_world_state` 决定 full-context 注入顺序，而 steady-state world-state diff 由 session 通过 `ContextManager::update_world_state` 合并。[E: codex-rs/core/src/session/mod.rs:3393][E: codex-rs/ext/skills/src/fragments.rs:10][E: codex-rs/core/src/session/mod.rs:3714][E: codex-rs/core/src/session/mod.rs:3716] 具体 model sampling 和 tool dispatch 属于 turn engine，不属于本节点。[I]

## 关键 crate/文件

- `codex-rs/context-fragments/src/fragment.rs`: `ContextualUserFragment` 规定 `role()`、`markers()`、`body()`、`type_markers()`、`render()` 和 `into()`；有 marker 时 `render()` 拼接 start/body/end，无 marker 时只返回 body。[E: codex-rs/context-fragments/src/fragment.rs:14][E: codex-rs/context-fragments/src/fragment.rs:15][E: codex-rs/context-fragments/src/fragment.rs:22][E: codex-rs/context-fragments/src/fragment.rs:24][E: codex-rs/context-fragments/src/fragment.rs:26][E: codex-rs/context-fragments/src/fragment.rs:38][E: codex-rs/context-fragments/src/fragment.rs:41][E: codex-rs/context-fragments/src/fragment.rs:45][E: codex-rs/context-fragments/src/fragment.rs:48]
- `codex-rs/core/src/context/mod.rs`: 内置 context fragments 的 module/re-export 表；这里把 `ContextualUserFragment` 从 `codex_context_fragments` 暴露给 core，并列出 apps、skills、plugins、environment helper、world-state、token budget、user instructions 等类型。[E: codex-rs/core/src/context/mod.rs:3][E: codex-rs/core/src/context/mod.rs:8][E: codex-rs/core/src/context/mod.rs:35][E: codex-rs/core/src/context/mod.rs:42][E: codex-rs/core/src/context/mod.rs:43][E: codex-rs/core/src/context/mod.rs:62][E: codex-rs/core/src/context/mod.rs:70][E: codex-rs/core/src/context/mod.rs:75][E: codex-rs/core/src/context/mod.rs:79]
- `codex-rs/core/src/session/mod.rs`: `build_initial_context_with_world_state` 汇总 developer/contextual user/separate developer sections，并在末尾构造 `ResponseItem` 列表。[E: codex-rs/core/src/session/mod.rs:3393][E: codex-rs/core/src/session/mod.rs:3398][E: codex-rs/core/src/session/mod.rs:3399][E: codex-rs/core/src/session/mod.rs:3400][E: codex-rs/core/src/session/mod.rs:3549][E: codex-rs/core/src/session/mod.rs:3550][E: codex-rs/core/src/session/mod.rs:3573]
- `codex-rs/core/src/context_manager/updates.rs`: 只负责把字符串 sections 组装成 developer/user messages，以及按 fragment role 合并 world-state/extension fragments。[E: codex-rs/core/src/context_manager/updates.rs:11][E: codex-rs/core/src/context_manager/updates.rs:19][E: codex-rs/core/src/context_manager/updates.rs:28][E: codex-rs/core/src/context_manager/updates.rs:48]
- `codex-rs/ext/skills/src/fragments.rs` 与 `extension.rs`: executor/host skills catalog 的 developer fragment、预算与 catalog rendering；旧的 `core/src/context/available_skills_instructions.rs` 已不存在。[E: codex-rs/ext/skills/src/fragments.rs:10][E: codex-rs/ext/skills/src/fragments.rs:37][E: codex-rs/ext/skills/src/extension.rs:283][E: codex-rs/ext/skills/src/extension.rs:319][E: codex-rs/ext/skills/src/extension.rs:357]
- `codex-rs/core-skills/src/skill_instructions.rs`: host-side explicit skill injection 的 user-role `<skill>` fragment。[E: codex-rs/core-skills/src/skill_instructions.rs:6][E: codex-rs/core-skills/src/skill_instructions.rs:22][E: codex-rs/core-skills/src/skill_instructions.rs:32]
- `codex-rs/core/src/session/world_state.rs`: permissions、collaboration、realtime、environment 等会变的 model-visible context 已移到 typed world-state builder。[E: codex-rs/core/src/session/world_state.rs:26][E: codex-rs/core/src/session/world_state.rs:100][E: codex-rs/core/src/session/world_state.rs:114][E: codex-rs/core/src/session/world_state.rs:72][E: codex-rs/core/src/session/world_state.rs:149]
- `codex-rs/core/src/agents_md.rs`: AGENTS.md discovery 从 project root 到 cwd 收集候选文件，`LoadedAgentsMd::legacy_text` 在 user/internal instructions 到 project instructions 的边界插入 `AGENTS_MD_SEPARATOR`。[E: codex-rs/core/src/agents_md.rs:155][E: codex-rs/core/src/agents_md.rs:188][E: codex-rs/core/src/agents_md.rs:225][E: codex-rs/core/src/agents_md.rs:234][E: codex-rs/core/src/agents_md.rs:319][E: codex-rs/core/src/agents_md.rs:333]

## 数据模型

`ContextualUserFragment::into` 生成 `ResponseItem::Message`，role 来自 concrete fragment 的 `role()`，content 是单个 `ContentItem::InputText { text: self.render() }`；`into_response_input_item` 同样把 fragment 变成 `ResponseInputItem::Message`。[E: codex-rs/context-fragments/src/fragment.rs:48][E: codex-rs/context-fragments/src/fragment.rs:52][E: codex-rs/context-fragments/src/fragment.rs:54][E: codex-rs/context-fragments/src/fragment.rs:55][E: codex-rs/context-fragments/src/fragment.rs:56][E: codex-rs/context-fragments/src/fragment.rs:75][E: codex-rs/context-fragments/src/fragment.rs:79]

`EnvironmentsState` 当前可以表达 multiple environments、date/timezone、network、filesystem permission profile 和 subagents；`from_turn_context_with_environments` 从 `TurnContext` 和 `TurnEnvironmentSnapshot` 构造环境，再附加 workspace roots / permission profile 文件系统上下文，session world-state builder 负责附加 subagents。[E: codex-rs/core/src/context/world_state/environment.rs:17][E: codex-rs/core/src/context/world_state/environment.rs:27][E: codex-rs/core/src/context/world_state/environment.rs:37][E: codex-rs/core/src/session/world_state.rs:52][E: codex-rs/core/src/session/world_state.rs:165]

Deferred executor 开启时，`EnvironmentsInstructionsState` 额外注入 generic execution-environment guidance，说明 starting environment 尚不可用且只应在任务确实依赖它时等待。Apps/plugins availability 也已变成 typed world-state sections，状态从 unavailable → available 时可通过 deterministic diff 补发，而不是只在首轮 hard-code。[E: codex-rs/core/src/context/environments_instructions.rs:24][E: codex-rs/core/src/context/world_state/environments_instructions.rs:18][E: codex-rs/core/src/session/world_state.rs:168][E: codex-rs/core/src/session/world_state.rs:186][E: codex-rs/core/src/session/world_state.rs:187]

AGENTS.md/configured instructions 使用 `UserInstructions` fragment，role 固定是 `user`，marker 是 `# AGENTS.md instructions` / `</INSTRUCTIONS>`；`body()` 把可选 directory 和 `<INSTRUCTIONS>` 包进正文。[E: codex-rs/core/src/context/user_instructions.rs:9][E: codex-rs/core/src/context/user_instructions.rs:10][E: codex-rs/core/src/context/user_instructions.rs:18][E: codex-rs/core/src/context/user_instructions.rs:22]

## Initial context 控制流

1. `build_initial_context_with_world_state` 先创建 `developer_sections`、`contextual_user_sections` 和 `separate_developer_sections`；它从 session state 只读取 `session_source` 与 auto-compact window ids，其余 initial context 来自传入的 `TurnContext`、`WorldState` 和 extension contributors。[E: codex-rs/core/src/session/mod.rs:3393][E: codex-rs/core/src/session/mod.rs:3395][E: codex-rs/core/src/session/mod.rs:3396][E: codex-rs/core/src/session/mod.rs:3398][E: codex-rs/core/src/session/mod.rs:3399][E: codex-rs/core/src/session/mod.rs:3400][E: codex-rs/core/src/session/mod.rs:3401][E: codex-rs/core/src/session/mod.rs:3404][E: codex-rs/core/src/session/mod.rs:3405]
2. model switch、personality、context-window guidance 和 permissions 都在 world state 中构造；`render_full()` 遇到 model-switch fragment 时会把它插到 developer bundle 最前面。[E: codex-rs/core/src/session/world_state.rs:61][E: codex-rs/core/src/session/world_state.rs:75][E: codex-rs/core/src/session/world_state.rs:97][E: codex-rs/core/src/session/world_state.rs:118][E: codex-rs/core/src/session/mod.rs:3529][E: codex-rs/core/src/session/mod.rs:3535]
3. 普通 developer instructions 进入聚合 developer bundle；guardian reviewer source 会跳过这个聚合分支，并在函数末尾把 developer instructions 作为单独 developer item 追加。[E: codex-rs/core/src/session/mod.rs:3408][E: codex-rs/core/src/session/mod.rs:3412][E: codex-rs/core/src/session/mod.rs:3413][E: codex-rs/core/src/session/mod.rs:3416][E: codex-rs/core/src/session/mod.rs:3580][E: codex-rs/core/src/session/mod.rs:3584]
4. Skills catalog 由 skills extension 的 context/world-state contributor 提供；personality、collaboration、realtime、execution-environment guidance、apps/plugin availability 等 typed state 来自 `world_state.render_full()` 或 extension context contributors。[E: codex-rs/ext/skills/src/extension.rs:283][E: codex-rs/ext/skills/src/extension.rs:319][E: codex-rs/core/src/session/world_state.rs:75][E: codex-rs/core/src/session/world_state.rs:100][E: codex-rs/core/src/session/world_state.rs:168][E: codex-rs/core/src/session/world_state.rs:186][E: codex-rs/core/src/session/mod.rs:3529]
5. recommended plugins 是 contextual user section；available plugins 是 developer section。[E: codex-rs/core/src/session/mod.rs:3435][E: codex-rs/core/src/session/mod.rs:3444][E: codex-rs/core/src/session/mod.rs:3448][E: codex-rs/core/src/session/mod.rs:3457][E: codex-rs/core/src/session/mod.rs:3460]
6. Extension prompt contributors 可返回三类 slot：`DeveloperPolicy`/`DeveloperCapabilities` 进入 developer sections，`ContextualUser` 进入 contextual user sections，`SeparateDeveloper` 进入 separate developer sections。[E: codex-rs/core/src/session/mod.rs:3450][E: codex-rs/core/src/session/mod.rs:3452][E: codex-rs/core/src/session/mod.rs:3459][E: codex-rs/core/src/session/mod.rs:953][E: codex-rs/core/src/session/mod.rs:953][E: codex-rs/core/src/session/mod.rs:953]
7. token budget 是 full-context developer metadata；`world_state.render_full()` 生成的 developer fragments 进入 developer sections，user fragments 进入 contextual user sections。[E: codex-rs/core/src/session/mod.rs:3488][E: codex-rs/core/src/session/mod.rs:3516][E: codex-rs/core/src/session/mod.rs:3529][E: codex-rs/core/src/session/mod.rs:3530][E: codex-rs/core/src/session/mod.rs:3540][E: codex-rs/core/src/session/mod.rs:3541]
8. 最后先构造聚合 developer message，再构造每个 separate developer message、multi-agent usage hint developer message、initial multi-agent-mode item、聚合 contextual user message，最后追加 guardian separate developer message。[E: codex-rs/core/src/session/mod.rs:3549][E: codex-rs/core/src/session/mod.rs:3550][E: codex-rs/core/src/session/mod.rs:3555][E: codex-rs/core/src/session/mod.rs:3562][E: codex-rs/core/src/session/mod.rs:3570][E: codex-rs/core/src/session/mod.rs:3571][E: codex-rs/core/src/session/mod.rs:3573][E: codex-rs/core/src/session/mod.rs:3580]

## Steady-state update 控制流

Model、personality、environment、permissions、collaboration、realtime、tools、extension sections 与 multi-agent policy 都统一由各自 `WorldStateSection::render_diff` 和 `ContextManager::update_world_state` 生成；session 再按 fragment role 合并，并在 model-visible items 之后持久化 world-state merge patch。[E: codex-rs/core/src/context/world_state/mod.rs:205][E: codex-rs/core/src/context/world_state/mod.rs:230][E: codex-rs/core/src/session/world_state.rs:60][E: codex-rs/core/src/session/world_state.rs:228][E: codex-rs/core/src/session/mod.rs:3714][E: codex-rs/core/src/session/mod.rs:3716][E: codex-rs/core/src/session/mod.rs:3738]

当 `TurnContextItem` 变化时，session 另外调用 extension `contribute_turn_context`，再用 `updates.rs` 的 helpers 生成 developer/separate-developer/contextual-user messages；这条路径不是旧式 core settings builder。[E: codex-rs/core/src/session/mod.rs:3341][E: codex-rs/core/src/session/mod.rs:3351][E: codex-rs/core/src/session/mod.rs:3373][E: codex-rs/core/src/session/mod.rs:3385][E: codex-rs/core/src/session/mod.rs:3722][E: codex-rs/core/src/session/mod.rs:3724]

## 设计动机与权衡

初始装配把 developer sections 和 contextual user sections 分开聚合，说明 Codex 有意把 policy/capability/tooling 类指令与 workspace/user-context 类 scaffold 分 role 发送；separate developer slot 又让 guardian policy、extension policy 或 multi-agent hint 能成为独立 top-level developer item。[E: codex-rs/core/src/session/mod.rs:3398][E: codex-rs/core/src/session/mod.rs:3399][E: codex-rs/core/src/session/mod.rs:3400][E: codex-rs/core/src/session/mod.rs:3550][E: codex-rs/core/src/session/mod.rs:3555][E: codex-rs/core/src/session/mod.rs:3562][I]

marker-based matching 只对有 start/end marker 的 fragment 生效；空 marker fragment 不会匹配任意 text，这降低了 context filtering 误删普通正文的风险。[E: codex-rs/context-fragments/src/fragment.rs:30][E: codex-rs/context-fragments/src/fragment.rs:34][E: codex-rs/context-fragments/src/fragment.rs:89][E: codex-rs/context-fragments/src/fragment.rs:90][E: codex-rs/context-fragments/src/fragment.rs:94][I]

## gotcha

- Memory developer instructions 不再由 `Session::build_initial_context_with_world_state` 里的硬编码 memory 分支读取；当前 full-context 路径通过 extension prompt contributors 注入，`push_prompt_fragment` 只按 `PromptSlot` 接收 extension fragments。[E: codex-rs/core/src/session/mod.rs:3450][E: codex-rs/core/src/session/mod.rs:3459][E: codex-rs/core/src/session/mod.rs:953][E: codex-rs/core/src/session/mod.rs:960][E: codex-rs/core/src/session/mod.rs:963][E: codex-rs/core/src/session/mod.rs:966]
- Available skills catalog 由 `codex-rs/ext/skills` 渲染成 developer fragment；host explicit skill injection 则由 `codex_core_skills::SkillInstructions` 渲染成 user-role `<skill>` fragment。二者角色与生命周期不同。[E: codex-rs/ext/skills/src/fragments.rs:37][E: codex-rs/ext/skills/src/fragments.rs:47][E: codex-rs/core-skills/src/skill_instructions.rs:22][E: codex-rs/core-skills/src/skill_instructions.rs:32]
- steady-state path 没有 `build_settings_update_items`；core state 统一走 world-state diff，只有 extension turn-context contributors 在 `TurnContextItem` 变化时额外运行。[E: codex-rs/core/src/session/mod.rs:3714][E: codex-rs/core/src/session/mod.rs:3722][E: codex-rs/core/src/session/mod.rs:3724]

## Sources

- `codex-rs/context-fragments/src/fragment.rs`
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
- `codex-rs/core-skills/src/skill_instructions.rs`
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
