---
id: subsys.core.instruction-assembly
title: 指令/prompt 装配
kind: subsystem
tier: T2
source: [codex-rs/core/src/context/mod.rs, codex-rs/core/src/context/fragment.rs, codex-rs/core/src/context/environment_context.rs, codex-rs/core/src/context/permissions_instructions.rs, codex-rs/core/src/context/approved_command_prefix_saved.rs, codex-rs/core/src/context/apps_instructions.rs, codex-rs/core/src/context/available_plugins_instructions.rs, codex-rs/core/src/context/available_skills_instructions.rs, codex-rs/core/src/context/collaboration_mode_instructions.rs, codex-rs/core/src/context/model_switch_instructions.rs, codex-rs/core/src/context/personality_spec_instructions.rs, codex-rs/core/src/context/realtime_start_instructions.rs, codex-rs/core/src/context/realtime_end_instructions.rs, codex-rs/core/src/context/realtime_start_with_instructions.rs, codex-rs/core/src/context/skill_instructions.rs, codex-rs/core/src/context/spawn_agent_instructions.rs, codex-rs/core/src/context/subagent_notification.rs, codex-rs/core/src/context/turn_aborted.rs, codex-rs/core/src/context/user_instructions.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/agents_md.rs, AGENTS.md, docs/agents_md.md]
symbols: [ContextualUserFragment, Session::build_initial_context, build_settings_update_items, EnvironmentContext, PermissionsInstructions, AgentsMdManager]
related: [subsys.core.context-manager, subsys.core.turn-engine, subsys.core.memory, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 指令/prompt 装配是 Codex 把 developer instructions、permissions、memory、skills/plugins/apps、AGENTS.md user instructions、environment context 等 fragment 组合成 model-visible `ResponseItem::Message` 的过程。[E: codex-rs/core/src/session/mod.rs:2374][E: codex-rs/core/src/session/mod.rs:2378][E: codex-rs/core/src/session/mod.rs:2379][E: codex-rs/core/src/session/mod.rs:2551][E: codex-rs/core/src/context/fragment.rs:74]

## 能回答的问题

- `ContextualUserFragment` 如何把 fragment 渲染成 developer/user message？
- `Session::build_initial_context` 的 developer sections 和 contextual user sections 顺序是什么？
- `core/src/context/` 中哪些 fragment 是 developer role，哪些是 user role？
- AGENTS.md 与 `Config::user_instructions` 如何合并？
- steady-state settings update 与 initial context 装配有什么差异？
- memory、apps、skills、plugins 何时进入 developer instructions？

## 职责边界

`core/src/context/` 定义可注入的 fragment 类型和 marker/role；`core/src/session/mod.rs::build_initial_context` 决定 thread/start 或 baseline missing 时的初始注入顺序；`core/src/context_manager/updates.rs` 决定 steady-state context diff。[E: codex-rs/core/src/context/mod.rs:3][E: codex-rs/core/src/context/fragment.rs:40][E: codex-rs/core/src/session/mod.rs:2374][E: codex-rs/core/src/context_manager/updates.rs:205] 具体 model sampling 由 turn engine 消费这些 history items。[I]

## 关键 crate/文件

- `codex-rs/core/src/context/fragment.rs`: `ContextualUserFragment` trait 定义 `ROLE`、start/end marker、`body()`、`render()` 和 `into()`。[E: codex-rs/core/src/context/fragment.rs:40][E: codex-rs/core/src/context/fragment.rs:41][E: codex-rs/core/src/context/fragment.rs:42][E: codex-rs/core/src/context/fragment.rs:43][E: codex-rs/core/src/context/fragment.rs:45][E: codex-rs/core/src/context/fragment.rs:66][E: codex-rs/core/src/context/fragment.rs:74]
- `codex-rs/core/src/context/mod.rs`: re-export 已知 fragment 类型，包括 `EnvironmentContext`、`PermissionsInstructions`、`AvailableSkillsInstructions`、`AvailablePluginsInstructions`、`UserInstructions`、`SkillInstructions`、`TurnAborted` 等。[E: codex-rs/core/src/context/mod.rs:37][E: codex-rs/core/src/context/mod.rs:46][E: codex-rs/core/src/context/mod.rs:32][E: codex-rs/core/src/context/mod.rs:31][E: codex-rs/core/src/context/mod.rs:56][E: codex-rs/core/src/context/mod.rs:52][E: codex-rs/core/src/context/mod.rs:55]
- `codex-rs/core/src/session/mod.rs`: `build_initial_context` 聚合 developer sections 和 contextual user sections，最后最多通过三个 `items.push` 分支生成 initial context items。[E: codex-rs/core/src/session/mod.rs:2378][E: codex-rs/core/src/session/mod.rs:2379][E: codex-rs/core/src/session/mod.rs:2555][E: codex-rs/core/src/session/mod.rs:2560][E: codex-rs/core/src/session/mod.rs:2572]
- `codex-rs/core/src/agents_md.rs`: `AgentsMdManager` 发现并合并 AGENTS.md / fallback docs / configured user instructions / JS REPL instructions / child agent guidance。[E: codex-rs/core/src/agents_md.rs:117][E: codex-rs/core/src/agents_md.rs:129][E: codex-rs/core/src/agents_md.rs:133][E: codex-rs/core/src/agents_md.rs:150][E: codex-rs/core/src/agents_md.rs:157]

## 数据模型

`ContextualUserFragment::into` 生成 `ResponseItem::Message`，message role 来自 concrete fragment 的 `ROLE`，content 是一个 `ContentItem::InputText { text: self.render() }`。[E: codex-rs/core/src/context/fragment.rs:78][E: codex-rs/core/src/context/fragment.rs:80][E: codex-rs/core/src/context/fragment.rs:81][E: codex-rs/core/src/context/fragment.rs:82] `render()` 对有 marker 的 fragment 拼接 `START_MARKER + body + END_MARKER`，无 marker fragment只返回 body。[E: codex-rs/core/src/context/fragment.rs:67][E: codex-rs/core/src/context/fragment.rs:68][E: codex-rs/core/src/context/fragment.rs:71]

`EnvironmentContext` 保存 cwd、shell、current_date、timezone、network 和 subagents；`body()` 渲染 XML-like 行，包括 `<cwd>`、`<shell>`、可选 date/timezone/network/subagents。[E: codex-rs/core/src/context/environment_context.rs:10][E: codex-rs/core/src/context/environment_context.rs:11][E: codex-rs/core/src/context/environment_context.rs:12][E: codex-rs/core/src/context/environment_context.rs:13][E: codex-rs/core/src/context/environment_context.rs:14][E: codex-rs/core/src/context/environment_context.rs:15][E: codex-rs/core/src/context/environment_context.rs:16][E: codex-rs/core/src/context/environment_context.rs:169][E: codex-rs/core/src/context/environment_context.rs:171][E: codex-rs/core/src/context/environment_context.rs:175][E: codex-rs/core/src/context/environment_context.rs:177][E: codex-rs/core/src/context/environment_context.rs:180][E: codex-rs/core/src/context/environment_context.rs:184][E: codex-rs/core/src/context/environment_context.rs:198]

`PermissionsInstructions::from_policy` 从 `SandboxPolicy`、approval policy、approvals reviewer、exec policy、cwd 和 feature flags 构建 developer instructions；`PermissionsInstructions` 的 fragment role 是 developer。[E: codex-rs/core/src/context/permissions_instructions.rs:61][E: codex-rs/core/src/context/permissions_instructions.rs:62][E: codex-rs/core/src/context/permissions_instructions.rs:63][E: codex-rs/core/src/context/permissions_instructions.rs:64][E: codex-rs/core/src/context/permissions_instructions.rs:65][E: codex-rs/core/src/context/permissions_instructions.rs:66][E: codex-rs/core/src/context/permissions_instructions.rs:67][E: codex-rs/core/src/context/permissions_instructions.rs:68][E: codex-rs/core/src/context/permissions_instructions.rs:129]

## Fragment catalog

| Fragment | ROLE | Marker/触发 | 主要用途 |
|---|---|---|---|
| `ApprovedCommandPrefixSaved` | `developer` | 无 marker | 渲染已保存的命令前缀。[E: codex-rs/core/src/context/approved_command_prefix_saved.rs:17][E: codex-rs/core/src/context/approved_command_prefix_saved.rs:18][E: codex-rs/core/src/context/approved_command_prefix_saved.rs:19][E: codex-rs/core/src/context/approved_command_prefix_saved.rs:22] |
| `AppsInstructions` | `developer` | apps tags | 当存在 accessible 且 enabled connector 时渲染 apps 使用规则。[E: codex-rs/core/src/context/apps_instructions.rs:15][E: codex-rs/core/src/context/apps_instructions.rs:21][E: codex-rs/core/src/context/apps_instructions.rs:22][E: codex-rs/core/src/context/apps_instructions.rs:23] |
| `AvailablePluginsInstructions` | `developer` | plugins tags | 非空 plugin capability summaries 会渲染 plugin 列表和使用规则。[E: codex-rs/core/src/context/available_plugins_instructions.rs:13][E: codex-rs/core/src/context/available_plugins_instructions.rs:25][E: codex-rs/core/src/context/available_plugins_instructions.rs:26][E: codex-rs/core/src/context/available_plugins_instructions.rs:27][E: codex-rs/core/src/context/available_plugins_instructions.rs:30] |
| `AvailableSkillsInstructions` | `developer` | skills tags | 把 `AvailableSkills.skill_lines` 和 skill 使用规则渲染到 prompt catalog。[E: codex-rs/core/src/context/available_skills_instructions.rs:14][E: codex-rs/core/src/context/available_skills_instructions.rs:21][E: codex-rs/core/src/context/available_skills_instructions.rs:22][E: codex-rs/core/src/context/available_skills_instructions.rs:23][E: codex-rs/core/src/context/available_skills_instructions.rs:30] |
| `CollaborationModeInstructions` | `developer` | collaboration tags | 当 collaboration mode settings 有 developer instructions 时渲染该段说明。[E: codex-rs/core/src/context/collaboration_mode_instructions.rs:12][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:25][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:26][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:27][E: codex-rs/core/src/context/collaboration_mode_instructions.rs:30] |
| `EnvironmentContext` | `user` | environment context tags | 渲染 cwd/shell/date/timezone/network/subagents。[E: codex-rs/core/src/context/environment_context.rs:165][E: codex-rs/core/src/context/environment_context.rs:166][E: codex-rs/core/src/context/environment_context.rs:167][E: codex-rs/core/src/context/environment_context.rs:169] |
| `ModelSwitchInstructions` | `developer` | `<model_switch>` | model switch 时携带 model-specific instructions。[E: codex-rs/core/src/context/model_switch_instructions.rs:17][E: codex-rs/core/src/context/model_switch_instructions.rs:18][E: codex-rs/core/src/context/model_switch_instructions.rs:19][E: codex-rs/core/src/context/model_switch_instructions.rs:22] |
| `PersonalitySpecInstructions` | `developer` | `<personality_spec>` | personality feature 开启且没有 baked personality 时渲染风格要求。[E: codex-rs/core/src/context/personality_spec_instructions.rs:15][E: codex-rs/core/src/context/personality_spec_instructions.rs:16][E: codex-rs/core/src/context/personality_spec_instructions.rs:17][E: codex-rs/core/src/context/personality_spec_instructions.rs:20][E: codex-rs/core/src/session/mod.rs:2454][E: codex-rs/core/src/session/mod.rs:2460][E: codex-rs/core/src/session/mod.rs:2467] |
| `RealtimeStartInstructions` / `RealtimeEndInstructions` / `RealtimeStartWithInstructions` | `developer` | realtime tags | 实时对话开始/结束/带自定义说明的 developer instructions。[E: codex-rs/core/src/context/realtime_start_instructions.rs:11][E: codex-rs/core/src/context/realtime_start_instructions.rs:12][E: codex-rs/core/src/context/realtime_start_instructions.rs:13][E: codex-rs/core/src/context/realtime_end_instructions.rs:21][E: codex-rs/core/src/context/realtime_end_instructions.rs:22][E: codex-rs/core/src/context/realtime_end_instructions.rs:23][E: codex-rs/core/src/context/realtime_start_with_instructions.rs:19][E: codex-rs/core/src/context/realtime_start_with_instructions.rs:20][E: codex-rs/core/src/context/realtime_start_with_instructions.rs:21] |
| `SkillInstructions` | `user` | `<skill>` | 把 `SkillInjection` 的 name/path/contents 渲染为 user role fragment；`run_turn` 在 `skill_items` 非空时把这些 items 写入 turn history。[E: codex-rs/core/src/context/skill_instructions.rs:14][E: codex-rs/core/src/context/skill_instructions.rs:23][E: codex-rs/core/src/context/skill_instructions.rs:24][E: codex-rs/core/src/context/skill_instructions.rs:25][E: codex-rs/core/src/context/skill_instructions.rs:28][E: codex-rs/core/src/session/turn.rs:348][E: codex-rs/core/src/session/turn.rs:349] |
| `SpawnAgentInstructions` | `developer` | spawned agent tags | 子 agent 初始上下文说明。[E: codex-rs/core/src/context/spawn_agent_instructions.rs:7][E: codex-rs/core/src/context/spawn_agent_instructions.rs:8][E: codex-rs/core/src/context/spawn_agent_instructions.rs:9][E: codex-rs/core/src/context/spawn_agent_instructions.rs:12] |
| `SubagentNotification` | `user` | subagent notification tags | 以 JSON 形式渲染 subagent status。[E: codex-rs/core/src/context/subagent_notification.rs:21][E: codex-rs/core/src/context/subagent_notification.rs:22][E: codex-rs/core/src/context/subagent_notification.rs:23][E: codex-rs/core/src/context/subagent_notification.rs:28] |
| `TurnAborted` | `user` | turn aborted tags | 用户中断后给模型的运行中命令/部分执行提示。[E: codex-rs/core/src/context/turn_aborted.rs:9][E: codex-rs/core/src/context/turn_aborted.rs:19][E: codex-rs/core/src/context/turn_aborted.rs:20][E: codex-rs/core/src/context/turn_aborted.rs:21][E: codex-rs/core/src/context/turn_aborted.rs:24] |
| `UserInstructions` | `user` | `# AGENTS.md instructions for ` + `</INSTRUCTIONS>` | 把 AGENTS.md / configured user instructions 包装成 contextual user message。[E: codex-rs/core/src/context/user_instructions.rs:10][E: codex-rs/core/src/context/user_instructions.rs:11][E: codex-rs/core/src/context/user_instructions.rs:12][E: codex-rs/core/src/context/user_instructions.rs:15] |

## Initial context 控制流

1. `build_initial_context` 创建 `developer_sections` 和 `contextual_user_sections` 两个 vector。[E: codex-rs/core/src/session/mod.rs:2378][E: codex-rs/core/src/session/mod.rs:2379]
2. model switch update 最先进入 developer sections。[E: codex-rs/core/src/session/mod.rs:2397][E: codex-rs/core/src/session/mod.rs:2403]
3. permission instructions 在 `include_permissions_instructions` 为 true 时进入 developer sections。[E: codex-rs/core/src/session/mod.rs:2405][E: codex-rs/core/src/session/mod.rs:2406][E: codex-rs/core/src/session/mod.rs:2407][E: codex-rs/core/src/session/mod.rs:2420]
4. non-guardian session 的 `developer_instructions` 进入聚合 developer bundle；guardian reviewer source 会把 guardian policy 留到单独 developer item。[E: codex-rs/core/src/session/mod.rs:2423][E: codex-rs/core/src/session/mod.rs:2427][E: codex-rs/core/src/session/mod.rs:2431][E: codex-rs/core/src/session/mod.rs:2564][E: codex-rs/core/src/session/mod.rs:2572]
5. memory developer instructions 只在 `Feature::MemoryTool` 开启且 `config.memories.use_memories` 为 true，并且 `build_memory_tool_developer_instructions` 返回 Some 时进入 developer sections。[E: codex-rs/core/src/session/mod.rs:2434][E: codex-rs/core/src/session/mod.rs:2435][E: codex-rs/core/src/session/mod.rs:2437][E: codex-rs/core/src/session/mod.rs:2439]
6. collaboration mode、realtime、personality、apps、skills、plugins 和 commit attribution 按源码顺序追加到 developer sections。[E: codex-rs/core/src/session/mod.rs:2445][E: codex-rs/core/src/session/mod.rs:2452][E: codex-rs/core/src/session/mod.rs:2467][E: codex-rs/core/src/session/mod.rs:2468][E: codex-rs/core/src/session/mod.rs:2482][E: codex-rs/core/src/session/mod.rs:2509][E: codex-rs/core/src/session/mod.rs:2520][E: codex-rs/core/src/session/mod.rs:2527]
7. `turn_context.user_instructions` 作为 `UserInstructions` 进入 contextual user sections，`EnvironmentContext` 在 `include_environment_context` 为 true 时进入 contextual user sections。[E: codex-rs/core/src/session/mod.rs:2529][E: codex-rs/core/src/session/mod.rs:2531][E: codex-rs/core/src/session/mod.rs:2538][E: codex-rs/core/src/session/mod.rs:2545]
8. `build_developer_update_item` 把 developer sections 合并成一个 developer message，`build_contextual_user_message` 把 contextual user sections 合并成一个 user message。[E: codex-rs/core/src/session/mod.rs:2551][E: codex-rs/core/src/session/mod.rs:2553][E: codex-rs/core/src/session/mod.rs:2558]

## Steady-state update 控制流

`build_settings_update_items` 由 `record_context_updates_and_set_reference_context_item` 的 steady-state diff path 调用；该 builder 按 model switch、permissions、collaboration、realtime、personality 顺序构造 developer sections，再可能追加 environment contextual user message。[E: codex-rs/core/src/session/mod.rs:2624][E: codex-rs/core/src/session/mod.rs:2625][E: codex-rs/core/src/context_manager/updates.rs:205][E: codex-rs/core/src/context_manager/updates.rs:217][E: codex-rs/core/src/context_manager/updates.rs:221][E: codex-rs/core/src/context_manager/updates.rs:222][E: codex-rs/core/src/context_manager/updates.rs:223][E: codex-rs/core/src/context_manager/updates.rs:224][E: codex-rs/core/src/context_manager/updates.rs:225][E: codex-rs/core/src/context_manager/updates.rs:235][E: codex-rs/core/src/context_manager/updates.rs:236]

`build_environment_update_item` 要求 `include_environment_context` 为 true 且存在 previous baseline，并且当前环境与 baseline 除 shell 外不同，才返回 environment diff。[E: codex-rs/core/src/context_manager/updates.rs:26][E: codex-rs/core/src/context_manager/updates.rs:30][E: codex-rs/core/src/context_manager/updates.rs:31][E: codex-rs/core/src/context_manager/updates.rs:32][E: codex-rs/core/src/context_manager/updates.rs:33][E: codex-rs/core/src/context_manager/updates.rs:37]

`build_permissions_update_item` 要求 `include_permissions_instructions` 为 true 且存在 previous baseline；sandbox 与 approval policy 都不变时返回 None。[E: codex-rs/core/src/context_manager/updates.rs:47][E: codex-rs/core/src/context_manager/updates.rs:51][E: codex-rs/core/src/context_manager/updates.rs:52][E: codex-rs/core/src/context_manager/updates.rs:53][E: codex-rs/core/src/context_manager/updates.rs:55]

## AGENTS.md assembly

`AgentsMdManager::user_instructions_with_fs` 会调用 `read_agents_md`，但输出文本先放入 `config.user_instructions`，若 AGENTS.md docs 存在，再用 `AGENTS_MD_SEPARATOR` 分隔并追加 docs。[E: codex-rs/core/src/agents_md.rs:129][E: codex-rs/core/src/agents_md.rs:133][E: codex-rs/core/src/agents_md.rs:134][E: codex-rs/core/src/agents_md.rs:139][E: codex-rs/core/src/agents_md.rs:140][E: codex-rs/core/src/agents_md.rs:142] `read_agents_md` 按 `agents_md_paths` 得到的路径顺序读文件，并受 `project_doc_max_bytes` 限制。[E: codex-rs/core/src/agents_md.rs:191][E: codex-rs/core/src/agents_md.rs:198][E: codex-rs/core/src/agents_md.rs:203][E: codex-rs/core/src/agents_md.rs:206][E: codex-rs/core/src/agents_md.rs:218][E: codex-rs/core/src/agents_md.rs:223][E: codex-rs/core/src/agents_md.rs:225][E: codex-rs/core/src/agents_md.rs:239]

`agents_md_paths` 从 current working directory 向上找 project root marker，随后从 project root 到 cwd 收集 `AGENTS.override.md`、`AGENTS.md` 或 fallback filenames，且不越过 project root。[E: codex-rs/core/src/agents_md.rs:263][E: codex-rs/core/src/agents_md.rs:278][E: codex-rs/core/src/agents_md.rs:288][E: codex-rs/core/src/agents_md.rs:298][E: codex-rs/core/src/agents_md.rs:308][E: codex-rs/core/src/agents_md.rs:313][E: codex-rs/core/src/agents_md.rs:321][E: codex-rs/core/src/agents_md.rs:328][E: codex-rs/core/src/agents_md.rs:334][E: codex-rs/core/src/agents_md.rs:350][E: codex-rs/core/src/agents_md.rs:351][E: codex-rs/core/src/agents_md.rs:352][E: codex-rs/core/src/agents_md.rs:357][E: codex-rs/core/src/agents_md.rs:358]

`docs/agents_md.md` 说明 `child_agents_md` feature flag 开启时，Codex 会在 user instructions message 中追加 AGENTS.md scope/precedence guidance，即使没有 AGENTS.md 也会发送 message。[E: docs/agents_md.md:7] Codex 源仓自身的 `AGENTS.md` 是可被该机制读取的项目指导文件示例，里面要求 docs update 与避免 `codex-core` 成为 catch-all crate。[E: AGENTS.md:23][E: AGENTS.md:60][E: AGENTS.md:62]

## 设计动机与权衡

developer sections 与 contextual user sections 分开聚合，说明 Codex 有意把 policy/tool/skills 等系统性指令和 AGENTS.md/environment 等 contextual user scaffolding 分为两个 role。[E: codex-rs/core/src/session/mod.rs:2378][E: codex-rs/core/src/session/mod.rs:2379][E: codex-rs/core/src/session/mod.rs:2553][E: codex-rs/core/src/session/mod.rs:2558][I]

marker-based `ContextualUserFragment::matches_text` 让实现了 start/end marker 的 fragment 能用边界标签识别 injected text，而不是匹配任意正文片段。[E: codex-rs/core/src/context/fragment.rs:47][E: codex-rs/core/src/context/fragment.rs:51][E: codex-rs/core/src/context/fragment.rs:56][E: codex-rs/core/src/context/fragment.rs:60][E: codex-rs/core/src/context/fragment.rs:63][I]

guardian reviewer source 把 developer instructions 单独放进一个 developer item，是为了让 guardian policy prompt 成为独立 top-level developer block；代码以 `is_guardian_reviewer_source` 分支实现。[E: codex-rs/core/src/session/mod.rs:2423][E: codex-rs/core/src/session/mod.rs:2564][E: codex-rs/core/src/session/mod.rs:2568][I]

## gotcha

- `SkillInstructions` 是 user role fragment，而 available skills catalog 是 developer role fragment；前者由 `run_turn` 在 `skill_items` 非空时写入 turn history，后者由 initial context 的 skills catalog 分支进入 developer sections。[E: codex-rs/core/src/context/skill_instructions.rs:23][E: codex-rs/core/src/context/available_skills_instructions.rs:21][E: codex-rs/core/src/session/turn.rs:348][E: codex-rs/core/src/session/turn.rs:349][E: codex-rs/core/src/session/mod.rs:2485][E: codex-rs/core/src/session/mod.rs:2509]
- AGENTS.md 内容不直接作为 developer message；`UserInstructions` 的 role 是 user。[E: codex-rs/core/src/context/user_instructions.rs:10][E: codex-rs/core/src/session/mod.rs:2531]
- steady-state settings update 不覆盖所有 initial context fragment；`updates.rs` 里有 TODO 表示 initial context items 尚未全部进入 diff path。[E: codex-rs/core/src/context_manager/updates.rs:213]

## Sources

- `codex-rs/core/src/context/mod.rs`
- `codex-rs/core/src/context/fragment.rs`
- `codex-rs/core/src/context/environment_context.rs`
- `codex-rs/core/src/context/permissions_instructions.rs`
- `codex-rs/core/src/context/approved_command_prefix_saved.rs`
- `codex-rs/core/src/context/apps_instructions.rs`
- `codex-rs/core/src/context/available_plugins_instructions.rs`
- `codex-rs/core/src/context/available_skills_instructions.rs`
- `codex-rs/core/src/context/collaboration_mode_instructions.rs`
- `codex-rs/core/src/context/model_switch_instructions.rs`
- `codex-rs/core/src/context/personality_spec_instructions.rs`
- `codex-rs/core/src/context/realtime_start_instructions.rs`
- `codex-rs/core/src/context/realtime_end_instructions.rs`
- `codex-rs/core/src/context/realtime_start_with_instructions.rs`
- `codex-rs/core/src/context/skill_instructions.rs`
- `codex-rs/core/src/context/spawn_agent_instructions.rs`
- `codex-rs/core/src/context/subagent_notification.rs`
- `codex-rs/core/src/context/turn_aborted.rs`
- `codex-rs/core/src/context/user_instructions.rs`
- `codex-rs/core/src/context_manager/updates.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/agents_md.rs`
- `AGENTS.md`
- `docs/agents_md.md`

## 相关

- [Context manager](context-manager.md) — `reference_context_item` 与 settings diff baseline。
- [Turn 引擎](turn-engine.md) — initial context 何时进入 turn history。
- [长期 Memory](memory.md) — `memory_summary.md` 如何变成 developer instructions。
- [Guardian 审批流](approval-guardian.md) — guardian policy prompt 的特殊隔离路径。
