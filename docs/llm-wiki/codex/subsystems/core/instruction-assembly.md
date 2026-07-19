---
id: subsys.core.instruction-assembly
title: 指令/prompt 装配
kind: subsystem
tier: T2
source: [codex-rs/context-fragments/src/fragment.rs, codex-rs/core/src/context/mod.rs, codex-rs/core/src/context/environment_context.rs, codex-rs/core/src/context/environments_instructions.rs, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/context/world_state/environment.rs, codex-rs/core/src/context/world_state/environments_instructions.rs, codex-rs/core/src/context/world_state/permissions.rs, codex-rs/core/src/context/world_state/collaboration_mode.rs, codex-rs/core/src/context/world_state/realtime.rs, codex-rs/core/src/context/world_state/apps_instructions.rs, codex-rs/core/src/context/world_state/plugins_instructions.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/context/apps_instructions.rs, codex-rs/core/src/context/available_skills_instructions.rs, codex-rs/core/src/context/available_plugins_instructions.rs, codex-rs/core/src/context/plugin_instructions.rs, codex-rs/core/src/context/recommended_plugins_instructions.rs, codex-rs/core/src/context/user_instructions.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/agents_md.rs]
symbols: [ContextualUserFragment, WorldState, WorldStateSection, EnvironmentsState, EnvironmentsInstructionsState, PermissionsState, CollaborationModeState, RealtimeState, AppsInstructionsState, PluginsInstructionsState, UserInstructions, Session::build_initial_context_with_world_state, Session::build_world_state_for_step, build_settings_update_items, LoadedAgentsMd]
related: [subsys.core.context-manager, subsys.core.turn-engine, subsys.core.memory, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> 指令/prompt 装配是 Codex 把模型切换说明、权限、developer instructions、apps/skills/plugins、extension prompt fragments、AGENTS.md/world-state user context、token budget 和 environment context 聚合成 model-visible `ResponseItem::Message` 的过程；当前 `ContextualUserFragment` trait 位于 `codex-rs/context-fragments/src/fragment.rs`，并由 `core/src/context/mod.rs` re-export。[E: codex-rs/core/src/session/mod.rs:3176][E: codex-rs/core/src/session/mod.rs:3192][E: codex-rs/core/src/session/mod.rs:3193][E: codex-rs/core/src/session/mod.rs:3299][E: codex-rs/core/src/session/mod.rs:3385][E: codex-rs/context-fragments/src/fragment.rs:46][E: codex-rs/core/src/context/mod.rs:44]

## 能回答的问题

- `ContextualUserFragment` 如何渲染 role、marker 和 `ResponseItem::Message`？
- `Session::build_initial_context_with_world_state` 当前按什么顺序构造 developer/contextual user/separate developer messages？
- steady-state settings diff 覆盖哪些 fragment，哪些仍只在 initial context 路径出现？
- AGENTS.md / configured user instructions 为什么是 user-role contextual fragment？
- apps、skills、plugins、recommended plugins 与 extension prompt contributors 分别进入哪个 prompt slot？

## 职责边界

`codex-rs/context-fragments` 定义通用 fragment trait；`codex-rs/core/src/context/` 提供 Codex 内置 fragment 类型和 re-export；`Session::build_initial_context_with_world_state` 决定 full-context 注入顺序；`context_manager/updates.rs` 只处理 steady-state settings diff，world-state diff 由 session 通过 `ContextManager::update_world_state` 合并。[E: codex-rs/context-fragments/src/fragment.rs:37][E: codex-rs/core/src/context/mod.rs:1][E: codex-rs/core/src/session/mod.rs:3176][E: codex-rs/core/src/context_manager/updates.rs:134][E: codex-rs/core/src/session/mod.rs:3575][E: codex-rs/core/src/session/mod.rs:3577] 具体 model sampling 和 tool dispatch 属于 turn engine，不属于本节点。[I]

## 关键 crate/文件

- `codex-rs/context-fragments/src/fragment.rs`: `ContextualUserFragment` 规定 `role()`、`markers()`、`body()`、`type_markers()`、`render()` 和 `into()`；有 marker 时 `render()` 拼接 start/body/end，无 marker 时只返回 body。[E: codex-rs/context-fragments/src/fragment.rs:46][E: codex-rs/context-fragments/src/fragment.rs:47][E: codex-rs/context-fragments/src/fragment.rs:49][E: codex-rs/context-fragments/src/fragment.rs:51][E: codex-rs/context-fragments/src/fragment.rs:53][E: codex-rs/context-fragments/src/fragment.rs:65][E: codex-rs/context-fragments/src/fragment.rs:68][E: codex-rs/context-fragments/src/fragment.rs:72][E: codex-rs/context-fragments/src/fragment.rs:75]
- `codex-rs/core/src/context/mod.rs`: 内置 context fragments 的 module/re-export 表；这里把 `ContextualUserFragment` 从 `codex_context_fragments` 暴露给 core，并列出 apps、skills、plugins、environment helper、world-state、token budget、user instructions 等类型。[E: codex-rs/core/src/context/mod.rs:3][E: codex-rs/core/src/context/mod.rs:9][E: codex-rs/core/src/context/mod.rs:36][E: codex-rs/core/src/context/mod.rs:44][E: codex-rs/core/src/context/mod.rs:47][E: codex-rs/core/src/context/mod.rs:66][E: codex-rs/core/src/context/mod.rs:74][E: codex-rs/core/src/context/mod.rs:79][E: codex-rs/core/src/context/mod.rs:83]
- `codex-rs/core/src/session/mod.rs`: `build_initial_context_with_world_state_and_mcp` 汇总 developer/contextual user/separate developer sections，并在末尾构造 `ResponseItem` 列表。[E: codex-rs/core/src/session/mod.rs:3186][E: codex-rs/core/src/session/mod.rs:3192][E: codex-rs/core/src/session/mod.rs:3193][E: codex-rs/core/src/session/mod.rs:3194][E: codex-rs/core/src/session/mod.rs:3396][E: codex-rs/core/src/session/mod.rs:3397][E: codex-rs/core/src/session/mod.rs:3422]
- `codex-rs/core/src/context_manager/updates.rs`: steady-state non-world-state builder 只覆盖 model switch、multi-agent mode、personality，并显式 TODO 尚未覆盖 initial context 的所有 model-visible input。[E: codex-rs/core/src/context_manager/updates.rs:134][E: codex-rs/core/src/context_manager/updates.rs:140][E: codex-rs/core/src/context_manager/updates.rs:147][E: codex-rs/core/src/context_manager/updates.rs:149]
- `codex-rs/core/src/session/world_state.rs`: permissions、collaboration、realtime、environment 等会变的 model-visible context 已移到 typed world-state builder。[E: codex-rs/core/src/session/world_state.rs:17][E: codex-rs/core/src/session/world_state.rs:37][E: codex-rs/core/src/session/world_state.rs:45][E: codex-rs/core/src/session/world_state.rs:70][E: codex-rs/core/src/session/world_state.rs:76]
- `codex-rs/core/src/agents_md.rs`: AGENTS.md discovery 从 project root 到 cwd 收集候选文件，`LoadedAgentsMd::legacy_text` 在 user/internal instructions 到 project instructions 的边界插入 `AGENTS_MD_SEPARATOR`。[E: codex-rs/core/src/agents_md.rs:155][E: codex-rs/core/src/agents_md.rs:188][E: codex-rs/core/src/agents_md.rs:225][E: codex-rs/core/src/agents_md.rs:234][E: codex-rs/core/src/agents_md.rs:319][E: codex-rs/core/src/agents_md.rs:333]

## 数据模型

`ContextualUserFragment::into` 生成 `ResponseItem::Message`，role 来自 concrete fragment 的 `role()`，content 是单个 `ContentItem::InputText { text: self.render() }`；`into_response_input_item` 同样把 fragment 变成 `ResponseInputItem::Message`。[E: codex-rs/context-fragments/src/fragment.rs:75][E: codex-rs/context-fragments/src/fragment.rs:79][E: codex-rs/context-fragments/src/fragment.rs:81][E: codex-rs/context-fragments/src/fragment.rs:82][E: codex-rs/context-fragments/src/fragment.rs:83][E: codex-rs/context-fragments/src/fragment.rs:102][E: codex-rs/context-fragments/src/fragment.rs:106]

`EnvironmentsState` 当前可以表达 multiple environments、date/timezone、network、filesystem permission profile 和 subagents；`from_turn_context_with_environments` 从 `TurnContext` 和 `TurnEnvironmentSnapshot` 构造环境，再附加 workspace roots / permission profile 文件系统上下文，session world-state builder 负责附加 subagents。[E: codex-rs/core/src/context/world_state/environment.rs:17][E: codex-rs/core/src/context/world_state/environment.rs:27][E: codex-rs/core/src/context/world_state/environment.rs:36][E: codex-rs/core/src/session/world_state.rs:28][E: codex-rs/core/src/session/world_state.rs:82]

Deferred executor 开启时，`EnvironmentsInstructionsState` 额外注入 generic execution-environment guidance，说明 starting environment 尚不可用且只应在任务确实依赖它时等待。Apps/plugins availability 也已变成 typed world-state sections，状态从 unavailable → available 时可通过 deterministic diff 补发，而不是只在首轮 hard-code。[E: codex-rs/core/src/context/environments_instructions.rs:24][E: codex-rs/core/src/context/environments_instructions.rs:22][E: codex-rs/core/src/context/world_state/environments_instructions.rs:18][E: codex-rs/core/src/session/world_state.rs:85][E: codex-rs/core/src/session/world_state.rs:104][E: codex-rs/core/src/session/world_state.rs:105]

AGENTS.md/configured instructions 使用 `UserInstructions` fragment，role 固定是 `user`，marker 是 `# AGENTS.md instructions` / `</INSTRUCTIONS>`；`body()` 把可选 directory 和 `<INSTRUCTIONS>` 包进正文。[E: codex-rs/core/src/context/user_instructions.rs:9][E: codex-rs/core/src/context/user_instructions.rs:10][E: codex-rs/core/src/context/user_instructions.rs:18][E: codex-rs/core/src/context/user_instructions.rs:22]

## Initial context 控制流

1. `build_initial_context_with_world_state_and_mcp` 先创建 `developer_sections`、`contextual_user_sections` 和 `separate_developer_sections`，并从 session state 取 `reference_context_item`、previous settings、collaboration mode、base instructions、session source 和 auto-compact window ids。[E: codex-rs/core/src/session/mod.rs:3186][E: codex-rs/core/src/session/mod.rs:3192][E: codex-rs/core/src/session/mod.rs:3193][E: codex-rs/core/src/session/mod.rs:3194][E: codex-rs/core/src/session/mod.rs:3151][E: codex-rs/core/src/session/mod.rs:3161][E: codex-rs/core/src/session/mod.rs:3201]
2. model switch instructions 最先加入 developer sections；permissions 不再由这段函数单独 push，而是在 world state 中构造后由 `render_full()` 按 developer role 合并。[E: codex-rs/core/src/session/mod.rs:3204][E: codex-rs/core/src/session/mod.rs:3210][E: codex-rs/core/src/session/world_state.rs:45][E: codex-rs/core/src/session/world_state.rs:68][E: codex-rs/core/src/session/mod.rs:3385]
3. 普通 developer instructions 进入聚合 developer bundle；guardian reviewer source 会跳过这个聚合分支，并在函数末尾把 developer instructions 作为单独 developer item 追加。[E: codex-rs/core/src/session/mod.rs:3212][E: codex-rs/core/src/session/mod.rs:3216][E: codex-rs/core/src/session/mod.rs:3217][E: codex-rs/core/src/session/mod.rs:3220][E: codex-rs/core/src/session/mod.rs:3429][E: codex-rs/core/src/session/mod.rs:3433]
4. personality 与 available skills 仍在 initial-context assembler；collaboration、realtime、execution-environment guidance、apps/plugin availability 等 typed state 来自 `world_state.render_full()` 或 extension context contributors。[E: codex-rs/core/src/session/mod.rs:3222][E: codex-rs/core/src/session/mod.rs:3239][E: codex-rs/core/src/session/world_state.rs:37][E: codex-rs/core/src/session/world_state.rs:85][E: codex-rs/core/src/session/world_state.rs:104][E: codex-rs/core/src/session/mod.rs:3385]
5. recommended plugins 是 contextual user section；available plugins 是 developer section。[E: codex-rs/core/src/session/mod.rs:3276][E: codex-rs/core/src/session/mod.rs:3293][E: codex-rs/core/src/session/mod.rs:3297][E: codex-rs/core/src/session/mod.rs:3306][E: codex-rs/core/src/session/mod.rs:3309]
6. Extension prompt contributors 可返回三类 slot：`DeveloperPolicy`/`DeveloperCapabilities` 进入 developer sections，`ContextualUser` 进入 contextual user sections，`SeparateDeveloper` 进入 separate developer sections。[E: codex-rs/core/src/session/mod.rs:3299][E: codex-rs/core/src/session/mod.rs:3301][E: codex-rs/core/src/session/mod.rs:3308][E: codex-rs/core/src/session/mod.rs:903][E: codex-rs/core/src/session/mod.rs:903][E: codex-rs/core/src/session/mod.rs:903]
7. token budget 是 full-context developer metadata；`world_state.render_full()` 生成的 developer fragments 进入 developer sections，user fragments 进入 contextual user sections。[E: codex-rs/core/src/session/mod.rs:3336][E: codex-rs/core/src/session/mod.rs:3337][E: codex-rs/core/src/session/mod.rs:3364][E: codex-rs/core/src/session/mod.rs:3385][E: codex-rs/core/src/session/mod.rs:3386][E: codex-rs/core/src/session/mod.rs:3387][E: codex-rs/core/src/session/mod.rs:3388]
8. 最后先构造聚合 developer message，再构造每个 separate developer message、multi-agent usage hint developer message、聚合 contextual user message，最后追加 guardian separate developer message。[E: codex-rs/core/src/session/mod.rs:3396][E: codex-rs/core/src/session/mod.rs:3397][E: codex-rs/core/src/session/mod.rs:3402][E: codex-rs/core/src/session/mod.rs:3409][E: codex-rs/core/src/session/mod.rs:3422][E: codex-rs/core/src/session/mod.rs:3429]

## Steady-state update 控制流

`build_settings_update_items` 按 model switch、multi-agent、personality 顺序收集 developer update sections；有内容时生成一个 developer message。[E: codex-rs/core/src/context_manager/updates.rs:134][E: codex-rs/core/src/context_manager/updates.rs:144][E: codex-rs/core/src/context_manager/updates.rs:147][E: codex-rs/core/src/context_manager/updates.rs:149][E: codex-rs/core/src/context_manager/updates.rs:155]

Environment、permissions、collaboration 与 realtime diff 统一由各自 `WorldStateSection::render_diff` 和 `ContextManager::update_world_state` 生成；session 再按 fragment role 合并成 contextual messages，并持久化 world-state merge patch。[E: codex-rs/core/src/context/world_state/mod.rs:192][E: codex-rs/core/src/context/world_state/mod.rs:212][E: codex-rs/core/src/session/world_state.rs:36][E: codex-rs/core/src/session/mod.rs:3572][E: codex-rs/core/src/session/mod.rs:3577][E: codex-rs/core/src/session/mod.rs:3600]

## 设计动机与权衡

初始装配把 developer sections 和 contextual user sections 分开聚合，说明 Codex 有意把 policy/capability/tooling 类指令与 workspace/user-context 类 scaffold 分 role 发送；separate developer slot 又让 guardian policy、extension policy 或 multi-agent hint 能成为独立 top-level developer item。[E: codex-rs/core/src/session/mod.rs:3192][E: codex-rs/core/src/session/mod.rs:3193][E: codex-rs/core/src/session/mod.rs:3194][E: codex-rs/core/src/session/mod.rs:3397][E: codex-rs/core/src/session/mod.rs:3402][E: codex-rs/core/src/session/mod.rs:3409][I]

marker-based matching 只对有 start/end marker 的 fragment 生效；空 marker fragment 不会匹配任意 text，这降低了 context filtering 误删普通正文的风险。[E: codex-rs/context-fragments/src/fragment.rs:57][E: codex-rs/context-fragments/src/fragment.rs:61][E: codex-rs/context-fragments/src/fragment.rs:116][E: codex-rs/context-fragments/src/fragment.rs:117][E: codex-rs/context-fragments/src/fragment.rs:121][I]

## gotcha

- Memory developer instructions 不再由 `Session::build_initial_context_with_world_state_and_mcp` 里的硬编码 memory 分支读取；当前 full-context 路径通过 extension prompt contributors 注入，`push_prompt_fragment` 只按 `PromptSlot` 接收 extension fragments。[E: codex-rs/core/src/session/mod.rs:3299][E: codex-rs/core/src/session/mod.rs:3308][E: codex-rs/core/src/session/mod.rs:903][E: codex-rs/core/src/session/mod.rs:910][E: codex-rs/core/src/session/mod.rs:913][E: codex-rs/core/src/session/mod.rs:916]
- `SkillInstructions` 来自 `codex_core_skills` re-export；available skills catalog 是 developer fragment，而 per-turn skill contents 的注入属于 turn engine 的 skill/plugin build path，不要把两者混为一个 initial-context catalog。[E: codex-rs/core/src/context/mod.rs:47][E: codex-rs/core/src/context/available_skills_instructions.rs:47][E: codex-rs/core/src/context/available_skills_instructions.rs:48][E: codex-rs/core/src/session/turn.rs:177]
- steady-state settings diff 明确不是 full replay；`updates.rs` 的 TODO 仍提示 initial context 的部分 model-visible input 还没有 deterministic diff/replay 覆盖。[E: codex-rs/core/src/context_manager/updates.rs:140]

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
