---
id: subsys.core.instruction-assembly
title: 指令/prompt 装配
kind: subsystem
tier: T2
source: [codex-rs/context-fragments/src/fragment.rs, codex-rs/core/src/context/mod.rs, codex-rs/core/src/context/environment_context.rs, codex-rs/core/src/context/world_state/environment.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/context/apps_instructions.rs, codex-rs/core/src/context/available_skills_instructions.rs, codex-rs/core/src/context/available_plugins_instructions.rs, codex-rs/core/src/context/plugin_instructions.rs, codex-rs/core/src/context/recommended_plugins_instructions.rs, codex-rs/core/src/context/user_instructions.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/agents_md.rs]
symbols: [ContextualUserFragment, EnvironmentsState, UserInstructions, Session::build_initial_context_with_world_state, build_settings_update_items, LoadedAgentsMd]
related: [subsys.core.context-manager, subsys.core.turn-engine, subsys.core.memory, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: db887d03e1
---

> 指令/prompt 装配是 Codex 把模型切换说明、权限、developer instructions、apps/skills/plugins、extension prompt fragments、AGENTS.md/world-state user context、token budget 和 environment context 聚合成 model-visible `ResponseItem::Message` 的过程；当前 `ContextualUserFragment` trait 位于 `codex-rs/context-fragments/src/fragment.rs`，并由 `core/src/context/mod.rs` re-export。[E: codex-rs/core/src/session/mod.rs:3132][E: codex-rs/core/src/session/mod.rs:3148][E: codex-rs/core/src/session/mod.rs:3149][E: codex-rs/core/src/session/mod.rs:3311][E: codex-rs/core/src/session/mod.rs:3397][E: codex-rs/context-fragments/src/fragment.rs:46][E: codex-rs/core/src/context/mod.rs:43]

## 能回答的问题

- `ContextualUserFragment` 如何渲染 role、marker 和 `ResponseItem::Message`？
- `Session::build_initial_context_with_world_state` 当前按什么顺序构造 developer/contextual user/separate developer messages？
- steady-state settings diff 覆盖哪些 fragment，哪些仍只在 initial context 路径出现？
- AGENTS.md / configured user instructions 为什么是 user-role contextual fragment？
- apps、skills、plugins、recommended plugins 与 extension prompt contributors 分别进入哪个 prompt slot？

## 职责边界

`codex-rs/context-fragments` 定义通用 fragment trait；`codex-rs/core/src/context/` 提供 Codex 内置 fragment 类型和 re-export；`Session::build_initial_context_with_world_state` 决定 full-context 注入顺序；`context_manager/updates.rs` 只处理 steady-state settings diff，world-state diff 由 session 通过 `ContextManager::update_world_state` 合并。[E: codex-rs/context-fragments/src/fragment.rs:37][E: codex-rs/core/src/context/mod.rs:1][E: codex-rs/core/src/session/mod.rs:3132][E: codex-rs/core/src/context_manager/updates.rs:235][E: codex-rs/core/src/session/mod.rs:3593][E: codex-rs/core/src/session/mod.rs:3595] 具体 model sampling 和 tool dispatch 属于 turn engine，不属于本节点。[I]

## 关键 crate/文件

- `codex-rs/context-fragments/src/fragment.rs`: `ContextualUserFragment` 规定 `role()`、`markers()`、`body()`、`type_markers()`、`render()` 和 `into()`；有 marker 时 `render()` 拼接 start/body/end，无 marker 时只返回 body。[E: codex-rs/context-fragments/src/fragment.rs:46][E: codex-rs/context-fragments/src/fragment.rs:47][E: codex-rs/context-fragments/src/fragment.rs:49][E: codex-rs/context-fragments/src/fragment.rs:51][E: codex-rs/context-fragments/src/fragment.rs:53][E: codex-rs/context-fragments/src/fragment.rs:65][E: codex-rs/context-fragments/src/fragment.rs:68][E: codex-rs/context-fragments/src/fragment.rs:72][E: codex-rs/context-fragments/src/fragment.rs:75]
- `codex-rs/core/src/context/mod.rs`: 内置 context fragments 的 module/re-export 表；这里把 `ContextualUserFragment` 从 `codex_context_fragments` 暴露给 core，并列出 apps、skills、plugins、environment helper、world-state、token budget、user instructions 等类型。[E: codex-rs/core/src/context/mod.rs:3][E: codex-rs/core/src/context/mod.rs:10][E: codex-rs/core/src/context/mod.rs:35][E: codex-rs/core/src/context/mod.rs:43][E: codex-rs/core/src/context/mod.rs:46][E: codex-rs/core/src/context/mod.rs:65][E: codex-rs/core/src/context/mod.rs:71][E: codex-rs/core/src/context/mod.rs:75][E: codex-rs/core/src/context/mod.rs:79]
- `codex-rs/core/src/session/mod.rs`: `build_initial_context_with_world_state_and_mcp` 汇总 developer/contextual user/separate developer sections，并在末尾构造 `ResponseItem` 列表。[E: codex-rs/core/src/session/mod.rs:3142][E: codex-rs/core/src/session/mod.rs:3148][E: codex-rs/core/src/session/mod.rs:3149][E: codex-rs/core/src/session/mod.rs:3150][E: codex-rs/core/src/session/mod.rs:3408][E: codex-rs/core/src/session/mod.rs:3409][E: codex-rs/core/src/session/mod.rs:3440]
- `codex-rs/core/src/context_manager/updates.rs`: steady-state update builder 只覆盖 model switch、permissions、collaboration mode、multi-agent mode、realtime 和 personality，并显式 TODO 尚未覆盖 initial context 的所有 model-visible input。[E: codex-rs/core/src/context_manager/updates.rs:242][E: codex-rs/core/src/context_manager/updates.rs:246][E: codex-rs/core/src/context_manager/updates.rs:249][E: codex-rs/core/src/context_manager/updates.rs:250][E: codex-rs/core/src/context_manager/updates.rs:251][E: codex-rs/core/src/context_manager/updates.rs:252][E: codex-rs/core/src/context_manager/updates.rs:253][E: codex-rs/core/src/context_manager/updates.rs:254]
- `codex-rs/core/src/agents_md.rs`: AGENTS.md discovery 从 project root 到 cwd 收集候选文件，`LoadedAgentsMd::legacy_text` 在 user/internal instructions 到 project instructions 的边界插入 `AGENTS_MD_SEPARATOR`。[E: codex-rs/core/src/agents_md.rs:149][E: codex-rs/core/src/agents_md.rs:182][E: codex-rs/core/src/agents_md.rs:201][E: codex-rs/core/src/agents_md.rs:222][E: codex-rs/core/src/agents_md.rs:307][E: codex-rs/core/src/agents_md.rs:321]

## 数据模型

`ContextualUserFragment::into` 生成 `ResponseItem::Message`，role 来自 concrete fragment 的 `role()`，content 是单个 `ContentItem::InputText { text: self.render() }`；`into_response_input_item` 同样把 fragment 变成 `ResponseInputItem::Message`。[E: codex-rs/context-fragments/src/fragment.rs:75][E: codex-rs/context-fragments/src/fragment.rs:79][E: codex-rs/context-fragments/src/fragment.rs:81][E: codex-rs/context-fragments/src/fragment.rs:82][E: codex-rs/context-fragments/src/fragment.rs:83][E: codex-rs/context-fragments/src/fragment.rs:102][E: codex-rs/context-fragments/src/fragment.rs:106]

`EnvironmentsState` 当前可以表达 multiple environments、date/timezone、network、filesystem permission profile 和 subagents；`from_turn_context_with_environments` 从 `TurnContext` 和 `TurnEnvironmentSnapshot` 构造环境，再附加 workspace roots / permission profile 文件系统上下文，session world-state builder 负责附加 subagents。[E: codex-rs/core/src/context/world_state/environment.rs:16][E: codex-rs/core/src/context/world_state/environment.rs:17][E: codex-rs/core/src/context/world_state/environment.rs:18][E: codex-rs/core/src/context/world_state/environment.rs:19][E: codex-rs/core/src/context/world_state/environment.rs:20][E: codex-rs/core/src/context/world_state/environment.rs:21][E: codex-rs/core/src/context/world_state/environment.rs:22][E: codex-rs/core/src/context/world_state/environment.rs:26][E: codex-rs/core/src/context/world_state/environment.rs:31][E: codex-rs/core/src/context/world_state/environment.rs:35][E: codex-rs/core/src/session/world_state.rs:18][E: codex-rs/core/src/session/world_state.rs:35]

AGENTS.md/configured instructions 使用 `UserInstructions` fragment，role 固定是 `user`，marker 是 `# AGENTS.md instructions` / `</INSTRUCTIONS>`；`body()` 把可选 directory 和 `<INSTRUCTIONS>` 包进正文。[E: codex-rs/core/src/context/user_instructions.rs:9][E: codex-rs/core/src/context/user_instructions.rs:10][E: codex-rs/core/src/context/user_instructions.rs:18][E: codex-rs/core/src/context/user_instructions.rs:22]

## Initial context 控制流

1. `build_initial_context_with_world_state_and_mcp` 先创建 `developer_sections`、`contextual_user_sections` 和 `separate_developer_sections`，并从 session state 取 `reference_context_item`、previous settings、collaboration mode、base instructions、session source 和 auto-compact window ids。[E: codex-rs/core/src/session/mod.rs:3142][E: codex-rs/core/src/session/mod.rs:3148][E: codex-rs/core/src/session/mod.rs:3149][E: codex-rs/core/src/session/mod.rs:3150][E: codex-rs/core/src/session/mod.rs:3151][E: codex-rs/core/src/session/mod.rs:3161][E: codex-rs/core/src/session/mod.rs:3166]
2. model switch instructions 最先加入 developer sections；permissions instructions 在 `include_permissions_instructions` 为 true 时加入 developer sections。[E: codex-rs/core/src/session/mod.rs:3169][E: codex-rs/core/src/session/mod.rs:3175][E: codex-rs/core/src/session/mod.rs:3177][E: codex-rs/core/src/session/mod.rs:3178][E: codex-rs/core/src/session/mod.rs:3195]
3. 普通 developer instructions 进入聚合 developer bundle；guardian reviewer source 会跳过这个聚合分支，并在函数末尾把 developer instructions 作为单独 developer item 追加。[E: codex-rs/core/src/session/mod.rs:3198][E: codex-rs/core/src/session/mod.rs:3202][E: codex-rs/core/src/session/mod.rs:3203][E: codex-rs/core/src/session/mod.rs:3206][E: codex-rs/core/src/session/mod.rs:3447][E: codex-rs/core/src/session/mod.rs:3451]
4. collaboration mode、initial realtime、personality、apps 和 available skills 按源码顺序加入 developer sections。[E: codex-rs/core/src/session/mod.rs:3209][E: codex-rs/core/src/session/mod.rs:3215][E: codex-rs/core/src/session/mod.rs:3222][E: codex-rs/core/src/session/mod.rs:3239][E: codex-rs/core/src/session/mod.rs:3252][E: codex-rs/core/src/session/mod.rs:3275]
5. recommended plugins 是 contextual user section；available plugins 是 developer section。[E: codex-rs/core/src/session/mod.rs:3283][E: codex-rs/core/src/session/mod.rs:3300][E: codex-rs/core/src/session/mod.rs:3304][E: codex-rs/core/src/session/mod.rs:3306][E: codex-rs/core/src/session/mod.rs:3309]
6. Extension prompt contributors 可返回三类 slot：`DeveloperPolicy`/`DeveloperCapabilities` 进入 developer sections，`ContextualUser` 进入 contextual user sections，`SeparateDeveloper` 进入 separate developer sections。[E: codex-rs/core/src/session/mod.rs:3311][E: codex-rs/core/src/session/mod.rs:3313][E: codex-rs/core/src/session/mod.rs:3320][E: codex-rs/core/src/session/mod.rs:963][E: codex-rs/core/src/session/mod.rs:963][E: codex-rs/core/src/session/mod.rs:963]
7. token budget 是 full-context developer metadata；`world_state.render_full()` 生成的 developer fragments 进入 developer sections，user fragments 进入 contextual user sections。[E: codex-rs/core/src/session/mod.rs:3348][E: codex-rs/core/src/session/mod.rs:3349][E: codex-rs/core/src/session/mod.rs:3376][E: codex-rs/core/src/session/mod.rs:3397][E: codex-rs/core/src/session/mod.rs:3398][E: codex-rs/core/src/session/mod.rs:3399][E: codex-rs/core/src/session/mod.rs:3400]
8. 最后先构造聚合 developer message，再构造每个 separate developer message、multi-agent usage hint developer message、聚合 contextual user message，最后追加 guardian separate developer message。[E: codex-rs/core/src/session/mod.rs:3408][E: codex-rs/core/src/session/mod.rs:3409][E: codex-rs/core/src/session/mod.rs:3414][E: codex-rs/core/src/session/mod.rs:3421][E: codex-rs/core/src/session/mod.rs:3440][E: codex-rs/core/src/session/mod.rs:3447]

## Steady-state update 控制流

`build_settings_update_items` 按 model switch、permissions、collaboration、multi-agent、realtime、personality 顺序收集 developer update sections；有 developer sections 时生成一个 developer message。[E: codex-rs/core/src/context_manager/updates.rs:235][E: codex-rs/core/src/context_manager/updates.rs:246][E: codex-rs/core/src/context_manager/updates.rs:249][E: codex-rs/core/src/context_manager/updates.rs:250][E: codex-rs/core/src/context_manager/updates.rs:251][E: codex-rs/core/src/context_manager/updates.rs:252][E: codex-rs/core/src/context_manager/updates.rs:253][E: codex-rs/core/src/context_manager/updates.rs:254][E: codex-rs/core/src/context_manager/updates.rs:260]

Environment diff 现在由 `EnvironmentsState::render_diff` 和 `ContextManager::update_world_state` 生成：环境快照比较 current date、timezone、network、filesystem 和 environment map，session 将 diff fragments merge 成 contextual messages；permissions diff 仍由 `build_permissions_update_item` 在 permission profile 或 approval policy 改变时生成。[E: codex-rs/core/src/context/world_state/environment.rs:97][E: codex-rs/core/src/context/world_state/environment.rs:101][E: codex-rs/core/src/context/world_state/environment.rs:107][E: codex-rs/core/src/context/world_state/environment.rs:111][E: codex-rs/core/src/context/world_state/environment.rs:134][E: codex-rs/core/src/session/mod.rs:3593][E: codex-rs/core/src/session/mod.rs:3595][E: codex-rs/core/src/context_manager/updates.rs:21][E: codex-rs/core/src/context_manager/updates.rs:26][E: codex-rs/core/src/context_manager/updates.rs:31]

## 设计动机与权衡

初始装配把 developer sections 和 contextual user sections 分开聚合，说明 Codex 有意把 policy/capability/tooling 类指令与 workspace/user-context 类 scaffold 分 role 发送；separate developer slot 又让 guardian policy、extension policy 或 multi-agent hint 能成为独立 top-level developer item。[E: codex-rs/core/src/session/mod.rs:3148][E: codex-rs/core/src/session/mod.rs:3149][E: codex-rs/core/src/session/mod.rs:3150][E: codex-rs/core/src/session/mod.rs:3409][E: codex-rs/core/src/session/mod.rs:3414][E: codex-rs/core/src/session/mod.rs:3421][I]

marker-based matching 只对有 start/end marker 的 fragment 生效；空 marker fragment 不会匹配任意 text，这降低了 context filtering 误删普通正文的风险。[E: codex-rs/context-fragments/src/fragment.rs:57][E: codex-rs/context-fragments/src/fragment.rs:61][E: codex-rs/context-fragments/src/fragment.rs:116][E: codex-rs/context-fragments/src/fragment.rs:117][E: codex-rs/context-fragments/src/fragment.rs:121][I]

## gotcha

- Memory developer instructions 不再由 `Session::build_initial_context_with_world_state_and_mcp` 里的硬编码 memory 分支读取；当前 full-context 路径通过 extension prompt contributors 注入，`push_prompt_fragment` 只按 `PromptSlot` 接收 extension fragments。[E: codex-rs/core/src/session/mod.rs:3311][E: codex-rs/core/src/session/mod.rs:3320][E: codex-rs/core/src/session/mod.rs:963][E: codex-rs/core/src/session/mod.rs:970][E: codex-rs/core/src/session/mod.rs:973][E: codex-rs/core/src/session/mod.rs:976]
- `SkillInstructions` 来自 `codex_core_skills` re-export；available skills catalog 是 developer fragment，而 per-turn skill contents 的注入属于 turn engine 的 skill/plugin build path，不要把两者混为一个 initial-context catalog。[E: codex-rs/core/src/context/mod.rs:46][E: codex-rs/core/src/context/available_skills_instructions.rs:47][E: codex-rs/core/src/context/available_skills_instructions.rs:48][E: codex-rs/core/src/session/turn.rs:175]
- steady-state settings diff 明确不是 full replay；`updates.rs` 的 TODO 仍提示 initial context 的部分 model-visible input 还没有 deterministic diff/replay 覆盖。[E: codex-rs/core/src/context_manager/updates.rs:242]

## Sources

- `codex-rs/context-fragments/src/fragment.rs`
- `codex-rs/core/src/context/mod.rs`
- `codex-rs/core/src/context/environment_context.rs`
- `codex-rs/core/src/context/world_state/environment.rs`
- `codex-rs/core/src/session/world_state.rs`
- `codex-rs/core/src/context/apps_instructions.rs`
- `codex-rs/core/src/context/available_skills_instructions.rs`
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
