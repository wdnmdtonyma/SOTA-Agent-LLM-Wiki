---
id: subsys.config-auth.hooks
title: Hooks 系统
kind: subsystem
tier: T2
source: [codex-rs/hooks/src/types.rs, codex-rs/hooks/src/engine/config.rs, codex-rs/hooks/src/engine/discovery.rs, codex-rs/hooks/src/engine/dispatcher.rs, codex-rs/hooks/src/engine/mod.rs, codex-rs/hooks/src/engine/command_runner.rs, codex-rs/core/src/hook_runtime.rs, codex-rs/core/src/tools/registry.rs]
symbols: [Hook, HookPayload, HookEvent, HookToolInput, HookEvents, ClaudeHooksEngine, discover_handlers, run_pre_tool_use_hooks, run_post_tool_use_hooks]
related: [subsys.config-auth.config-loading, subsys.core.tool-system, subsys.core.tool-router, subsys.platform.analytics]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Codex hooks 系统从配置 layer 对应目录发现 `hooks.json`，把 `PreToolUse`、`PermissionRequest`、`PostToolUse`、`SessionStart`、`UserPromptSubmit`、`Stop` 等事件映射到 command handlers，并在 core tool/session runtime 中发起 preview、run、completed event、metrics 与 analytics。[E: codex-rs/hooks/src/engine/config.rs:9][E: codex-rs/hooks/src/engine/discovery.rs:32][E: codex-rs/core/src/hook_runtime.rs:136][E: codex-rs/core/src/tools/registry.rs:342][E: codex-rs/core/src/hook_runtime.rs:384][E: codex-rs/core/src/hook_runtime.rs:397][E: codex-rs/core/src/hook_runtime.rs:413]

## 能回答的问题

- `hooks.json` 支持哪些 event key 和 handler 类型？
- hook discovery 怎样按 config layer 扫描 system/user/project 目录？
- `PreToolUse`、`PermissionRequest`、`PostToolUse`、`SessionStart`、`UserPromptSubmit` 分别在 core 哪些位置触发？
- hook payload 中 tool input 为什么使用独立 wire-facing 类型？
- command hook 怎样设置 stdin、cwd、timeout，并怎样把结果转成 started/completed events？

## 职责边界

hooks 节点覆盖 hooks config/discovery/dispatch/runtime integration。`codex-rs/hooks/src/types.rs` 中的 legacy `Hook`/`HookEvent::AfterToolUse` 是旧 hook contract；engine config 使用 Claude-style event names `PreToolUse`、`PermissionRequest`、`PostToolUse`、`SessionStart`、`UserPromptSubmit`、`Stop`。[E: codex-rs/hooks/src/types.rs:39][E: codex-rs/hooks/src/types.rs:147][E: codex-rs/hooks/src/engine/config.rs:9]

## 数据模型

legacy `Hook` 包含 `name` 和 `func`；`HookResult` 可以是 `Success`、`FailedContinue` 或 `FailedAbort`。[E: codex-rs/hooks/src/types.rs:15][E: codex-rs/hooks/src/types.rs:18][E: codex-rs/hooks/src/types.rs:21][E: codex-rs/hooks/src/types.rs:24][E: codex-rs/hooks/src/types.rs:39][E: codex-rs/hooks/src/types.rs:42] legacy `HookPayload` 包含 session_id、cwd、optional client、triggered_at 和 hook_event。[E: codex-rs/hooks/src/types.rs:63][E: codex-rs/hooks/src/types.rs:66][E: codex-rs/hooks/src/types.rs:69][E: codex-rs/hooks/src/types.rs:71][E: codex-rs/hooks/src/types.rs:72]

engine `HooksFile` 顶层字段是 `hooks: HookEvents`；`HookEvents` 的 serde rename 把 Rust 字段映射到 JSON keys `PreToolUse`、`PermissionRequest`、`PostToolUse`、`SessionStart`、`UserPromptSubmit`、`Stop`。[E: codex-rs/hooks/src/engine/config.rs:3][E: codex-rs/hooks/src/engine/config.rs:9][E: codex-rs/hooks/src/engine/config.rs:13][E: codex-rs/hooks/src/engine/config.rs:21] 每个 `MatcherGroup` 有可选 matcher 和 handler list；`HookHandlerConfig` 当前支持 `command`、`timeout`、`type`、`prompt`、`agent` 字段。[E: codex-rs/hooks/src/engine/config.rs:25][E: codex-rs/hooks/src/engine/config.rs:33]

`HookToolInput` 是 hook-facing tool input，区分 `Function`、`Custom`、`LocalShell`、`Mcp`；`LocalShell` 会暴露 command、workdir、timeout_ms、sandbox_permissions、prefix_rule 和 justification。[E: codex-rs/hooks/src/types.rs:104][E: codex-rs/hooks/src/types.rs:113][E: codex-rs/hooks/src/types.rs:93]

## 控制流

1. `ClaudeHooksEngine::new(enabled, stack, shell)` 在 hooks disabled 时返回空 handler set；enabled 时加载 schema 并调用 discovery。[E: codex-rs/hooks/src/engine/mod.rs:73][E: codex-rs/hooks/src/engine/mod.rs:80][E: codex-rs/hooks/src/engine/mod.rs:87]
2. discovery 遍历 `ConfigLayerStack` 的 `LowestPrecedenceFirst` layers，并通过 `ConfigLayerEntry::config_folder()` 找到每个 layer 对应目录。[E: codex-rs/hooks/src/engine/discovery.rs:20][E: codex-rs/hooks/src/engine/discovery.rs:32][E: codex-rs/hooks/src/engine/discovery.rs:36]
3. discovery 读取每个目录下的 `hooks.json`，parse 失败会记录 warning，parse 成功后把各 event 的 matcher groups append 到 `DiscoveryResult.handlers` 共享 vector。[E: codex-rs/hooks/src/engine/discovery.rs:15][E: codex-rs/hooks/src/engine/discovery.rs:39][E: codex-rs/hooks/src/engine/discovery.rs:55][E: codex-rs/hooks/src/engine/discovery.rs:98][E: codex-rs/hooks/src/engine/discovery.rs:157]
4. handler validation 要求 command handler 不是 async handler，command 字符串非空，并把 timeout 默认值设为 600 秒且最小 1 秒。[E: codex-rs/hooks/src/engine/discovery.rs:142][E: codex-rs/hooks/src/engine/discovery.rs:149][E: codex-rs/hooks/src/engine/discovery.rs:156]
5. dispatcher 按 event type 选 handler list，并按 matcher 规则过滤；源码注释说明同一个 configured handler 只检查一次，因此多个 compatibility aliases 匹配同一 regex 时不会重复运行同一个 hook。[E: codex-rs/hooks/src/engine/dispatcher.rs:25][E: codex-rs/hooks/src/engine/dispatcher.rs:39][E: codex-rs/hooks/src/engine/dispatcher.rs:45][E: codex-rs/hooks/src/engine/dispatcher.rs:53]
6. command runner 用 configured shell 启动 command，设置 current_dir、stdin、stdout/stderr pipe 和 kill_on_drop，并对 timeout 做错误映射。[E: codex-rs/hooks/src/engine/command_runner.rs:24][E: codex-rs/hooks/src/engine/command_runner.rs:34][E: codex-rs/hooks/src/engine/command_runner.rs:91]

## Core runtime 触发点

`run_pending_session_start_hooks` 构造 `SessionStartRequest`，包含 session_id、cwd、transcript_path、model、permission_mode 和 source。[E: codex-rs/core/src/hook_runtime.rs:102][E: codex-rs/core/src/hook_runtime.rs:110][E: codex-rs/core/src/hook_runtime.rs:116] `run_user_prompt_submit_hooks` 构造 `UserPromptSubmitRequest`；context-injecting hook outcome 会携带 `should_stop` 与 additional contexts。[E: codex-rs/core/src/hook_runtime.rs:40][E: codex-rs/core/src/hook_runtime.rs:84][E: codex-rs/core/src/hook_runtime.rs:94][E: codex-rs/core/src/hook_runtime.rs:239][E: codex-rs/core/src/hook_runtime.rs:244]

`run_pre_tool_use_hooks` 在工具执行前构造 `PreToolUseRequest`，如果 outcome `should_block` 为 true，就返回 block reason。[E: codex-rs/core/src/hook_runtime.rs:136][E: codex-rs/core/src/hook_runtime.rs:144][E: codex-rs/core/src/hook_runtime.rs:159][E: codex-rs/core/src/hook_runtime.rs:166] `ToolRegistry::dispatch_any` 在 handler 提供 pre payload 时调用它；如果被 block，会把 “Command blocked by PreToolUse hook” 返回给模型。[E: codex-rs/core/src/tools/registry.rs:342][E: codex-rs/core/src/tools/registry.rs:353]

`run_post_tool_use_hooks` 只在工具成功且 handler 能生成 post payload 时触发；outcome 的 additional contexts 会被记录，feedback message 或 stop reason 能替换 tool response text。[E: codex-rs/core/src/tools/registry.rs:401][E: codex-rs/core/src/tools/registry.rs:413][E: codex-rs/core/src/tools/registry.rs:444][E: codex-rs/core/src/tools/registry.rs:452]

`run_permission_request_hooks` 与 Pre/Post 工具 hook 使用相同 preview/start/completed event flow，但返回 optional `PermissionRequestDecision`。[E: codex-rs/core/src/hook_runtime.rs:169][E: codex-rs/core/src/hook_runtime.rs:172][E: codex-rs/core/src/hook_runtime.rs:194]

## 设计动机与权衡

core registry 把 `ToolPayload` 转成 `HookToolInput`，源码注释说明这是为了让 hook payload JSON 稳定，并与 core 内部 tool runtime representation 解耦。[E: codex-rs/core/src/tools/registry.rs:566][E: codex-rs/core/src/tools/registry.rs:568] 因此 hook contract 追求外部稳定性，即使内部工具 payload 结构变化也可以保持 hook-facing JSON 不变。[I]

hooks 通过 config layer discovery 遍历多个 layer 并把每个有效 command handler push 到共享 handler vector，允许 system/user/project hooks 组合运行，而不是只取最高优先级 layer。[I] 这个行为由 discovery 的 layer loop、`handlers.push` 和 `display_order` 递增共同体现。[E: codex-rs/hooks/src/engine/discovery.rs:32][E: codex-rs/hooks/src/engine/discovery.rs:157][E: codex-rs/hooks/src/engine/discovery.rs:167]

## Gotchas

- discovery 使用 `include_disabled=false` 的 layer iterator，因此 disabled project config layer 不会贡献 hooks。[E: codex-rs/hooks/src/engine/discovery.rs:32]
- prompt/agent handler config 目前会记录 unsupported warning；可执行 handler 是 command handler。[E: codex-rs/hooks/src/engine/discovery.rs:169][E: codex-rs/hooks/src/engine/discovery.rs:173]
- hook metrics tag 把 event name/source/status 转成固定字符串，source 包含 system、user、project、mdm、session_flags、legacy managed variants 和 unknown。[E: codex-rs/core/src/hook_runtime.rs:447][E: codex-rs/core/src/hook_runtime.rs:456][E: codex-rs/core/src/hook_runtime.rs:466]

## Sources

- `codex-rs/hooks/src/types.rs`
- `codex-rs/hooks/src/engine/config.rs`
- `codex-rs/hooks/src/engine/discovery.rs`
- `codex-rs/hooks/src/engine/dispatcher.rs`
- `codex-rs/hooks/src/engine/mod.rs`
- `codex-rs/hooks/src/engine/command_runner.rs`
- `codex-rs/core/src/hook_runtime.rs`
- `codex-rs/core/src/tools/registry.rs`

## 相关

- `subsys.config-auth.config-loading`: hooks discovery 依赖 config layer folder。
- `subsys.core.tool-system`: tool handler 提供 hook payload 的机制。
- `subsys.platform.analytics`: hook completion 会记录 analytics fact。
