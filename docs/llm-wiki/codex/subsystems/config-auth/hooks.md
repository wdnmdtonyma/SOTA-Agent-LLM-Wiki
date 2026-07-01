---
id: subsys.config-auth.hooks
title: Hooks 系统
kind: subsystem
tier: T2
source: [codex-rs/config/src/hook_config.rs, codex-rs/hooks/src/types.rs, codex-rs/hooks/src/engine/discovery.rs, codex-rs/hooks/src/engine/dispatcher.rs, codex-rs/hooks/src/engine/mod.rs, codex-rs/hooks/src/engine/command_runner.rs, codex-rs/core/src/hook_runtime.rs, codex-rs/core/src/tools/registry.rs]
symbols: [HooksFile, HookEventsToml, HookHandlerConfig, ClaudeHooksEngine, discover_handlers, run_pre_tool_use_hooks, run_post_tool_use_hooks, run_permission_request_hooks, inspect_pending_input]
related: [subsys.config-auth.config-loading, subsys.core.tool-system, subsys.core.tool-router, subsys.platform.analytics]
evidence: explicit
status: verified
updated: db887d03e1
---

> Codex hooks 系统现在把 hook schema 放在 `codex_config::hook_config`，由 `codex_hooks::engine` 从 config layers、managed requirements 和 plugin hook sources 发现 handlers，再由 core session/tool runtime 发起 preview/start/completed flow。[E: codex-rs/config/src/hook_config.rs:12][E: codex-rs/config/src/hook_config.rs:36][E: codex-rs/hooks/src/engine/discovery.rs:63][E: codex-rs/hooks/src/engine/mod.rs:107][E: codex-rs/core/src/hook_runtime.rs:163][E: codex-rs/core/src/tools/registry.rs:495]

## 能回答的问题

- hooks JSON/TOML 支持哪些 event key 和 handler 类型？
- discovery 如何从 config layer、managed requirements 和 plugin hook sources 收集 hooks？
- hook trust、managed-only policy、disabled states 如何影响 runnable handlers？
- `PreToolUse`、`UserPromptSubmit`、`PermissionRequest`、`PostToolUse`、compact、session/subagent stop hooks 在 core 哪里触发？
- command hook 怎样设置 stdin、cwd、shell、timeout 和 env？

## 职责边界

本节点覆盖 hooks config/discovery/dispatch/runtime integration。`codex-rs/hooks/src/types.rs` 中的 `Hook`/`HookPayload`/`HookEvent::AfterAgent` 是 legacy after-agent hook contract；Claude-style lifecycle hooks 的 schema 来自 `codex-rs/config/src/hook_config.rs`。[E: codex-rs/hooks/src/types.rs:39][E: codex-rs/hooks/src/types.rs:64][E: codex-rs/hooks/src/types.rs:92][E: codex-rs/config/src/hook_config.rs:36]

工具 plan/spec 门控不在本节点展开；当前工具 ground truth 是 `codex-rs/core/src/tools/spec_plan.rs`，handler dispatch 在 `codex-rs/core/src/tools/registry.rs`。[E: codex-rs/core/src/tools/registry.rs:322][E: codex-rs/core/src/tools/registry.rs:405]

## 数据模型

`HooksFile` 顶层字段为 `hooks: HookEventsToml`；`HooksToml` 则把 hook events flatten 到 TOML 并额外保存 `state` map，用于 per-hook enable/trust state。[E: codex-rs/config/src/hook_config.rs:10][E: codex-rs/config/src/hook_config.rs:12][E: codex-rs/config/src/hook_config.rs:20][E: codex-rs/config/src/hook_config.rs:22][E: codex-rs/config/src/hook_config.rs:24]

`HookEventsToml` 当前支持 10 个 event keys：`PreToolUse`、`PermissionRequest`、`PostToolUse`、`PreCompact`、`PostCompact`、`SessionStart`、`UserPromptSubmit`、`SubagentStart`、`SubagentStop` 和 `Stop`。[E: codex-rs/config/src/hook_config.rs:36][E: codex-rs/config/src/hook_config.rs:38][E: codex-rs/config/src/hook_config.rs:40][E: codex-rs/config/src/hook_config.rs:42][E: codex-rs/config/src/hook_config.rs:44][E: codex-rs/config/src/hook_config.rs:48][E: codex-rs/config/src/hook_config.rs:50][E: codex-rs/config/src/hook_config.rs:52][E: codex-rs/config/src/hook_config.rs:54][E: codex-rs/config/src/hook_config.rs:56]

每个 `MatcherGroup` 有 optional matcher 和 handler list；`HookHandlerConfig` 当前可反序列化 `command`、`prompt`、`agent` 三类，但 discovery 只把 command handler 加入 runnable handler set，prompt/agent handler 会产生 unsupported warning。[E: codex-rs/config/src/hook_config.rs:133][E: codex-rs/config/src/hook_config.rs:133][E: codex-rs/config/src/hook_config.rs:137][E: codex-rs/config/src/hook_config.rs:142][E: codex-rs/config/src/hook_config.rs:144][E: codex-rs/config/src/hook_config.rs:156][E: codex-rs/config/src/hook_config.rs:158][E: codex-rs/hooks/src/engine/discovery.rs:548]

## Discovery

1. `ClaudeHooksEngine::new` 在 hooks disabled 时返回空 handler set；enabled 时加载 generated schemas 并调用 `discover_handlers`。[E: codex-rs/hooks/src/engine/mod.rs:107][E: codex-rs/hooks/src/engine/mod.rs:116][E: codex-rs/hooks/src/engine/mod.rs:125][E: codex-rs/hooks/src/engine/mod.rs:126]
2. `discover_handlers` 先从 `ConfigLayerStack::requirements().managed_hooks` append managed requirement hooks，再遍历 enabled config layers，最后 append plugin hook sources。[E: codex-rs/hooks/src/engine/discovery.rs:63][E: codex-rs/hooks/src/engine/discovery.rs:86][E: codex-rs/hooks/src/engine/discovery.rs:97][E: codex-rs/hooks/src/engine/discovery.rs:159]
3. Config layer traversal 使用 `LowestPrecedenceFirst` 且 `include_disabled=false`；每个 layer 可同时加载 `hooks.json` 和 TOML `[hooks]`，两者同时非空时会记录 warning。[E: codex-rs/hooks/src/engine/discovery.rs:97][E: codex-rs/hooks/src/engine/discovery.rs:98][E: codex-rs/hooks/src/engine/discovery.rs:99][E: codex-rs/hooks/src/engine/discovery.rs:116][E: codex-rs/hooks/src/engine/discovery.rs:122][E: codex-rs/hooks/src/engine/discovery.rs:124]
4. `allow_managed_hooks_only` 来自 requirements；policy 不允许的 source 会被跳过，managed hooks 仍可运行。[E: codex-rs/hooks/src/engine/discovery.rs:75][E: codex-rs/hooks/src/engine/discovery.rs:76][E: codex-rs/hooks/src/engine/discovery.rs:57][E: codex-rs/hooks/src/engine/discovery.rs:58][E: codex-rs/hooks/src/engine/discovery.rs:113]
5. Plugin hook sources 会注入 `PLUGIN_ROOT`/`PLUGIN_DATA` 以及 Claude 兼容 env，然后以 `HookSource::Plugin` append。[E: codex-rs/hooks/src/engine/discovery.rs:218][E: codex-rs/hooks/src/engine/discovery.rs:230][E: codex-rs/hooks/src/engine/discovery.rs:233][E: codex-rs/hooks/src/engine/discovery.rs:248][E: codex-rs/hooks/src/engine/discovery.rs:255]

## Handler 校验与 trust

`load_hooks_json` 只读取存在的 `hooks.json`，parse 失败记录 warning 并返回 None；`load_toml_hooks_from_layer` 从 layer config 的 `hooks` 字段反序列化 `HookEventsToml`，空 hooks 不产生 source。[E: codex-rs/hooks/src/engine/discovery.rs:303][E: codex-rs/hooks/src/engine/discovery.rs:307][E: codex-rs/hooks/src/engine/discovery.rs:323][E: codex-rs/hooks/src/engine/discovery.rs:326][E: codex-rs/hooks/src/engine/discovery.rs:346][E: codex-rs/hooks/src/engine/discovery.rs:351][E: codex-rs/hooks/src/engine/discovery.rs:363]

Discovery 会按 event 计算 matcher pattern、validate matcher、拒绝 async command、拒绝空 command，并把缺省 timeout 设为 600 秒且最小 1 秒。[E: codex-rs/hooks/src/engine/discovery.rs:428][E: codex-rs/hooks/src/engine/discovery.rs:451][E: codex-rs/hooks/src/engine/discovery.rs:453][E: codex-rs/hooks/src/engine/discovery.rs:475][E: codex-rs/hooks/src/engine/discovery.rs:482][E: codex-rs/hooks/src/engine/discovery.rs:489]

每个 command handler 都会生成 `HookListEntry`；只有 enabled 且 trust status 是 Managed/Trusted，或 source 启用了 bypass hook trust，才会 push 到 runnable `ConfiguredHandler` list。[E: codex-rs/hooks/src/engine/discovery.rs:497][E: codex-rs/hooks/src/engine/discovery.rs:506][E: codex-rs/hooks/src/engine/discovery.rs:508][E: codex-rs/hooks/src/engine/discovery.rs:510][E: codex-rs/hooks/src/engine/discovery.rs:527][E: codex-rs/hooks/src/engine/discovery.rs:534]

## Core runtime 触发点

`run_pending_session_start_hooks` 将 root session startup 映射为 `SessionStart`，将 thread-spawn child startup 映射为 `SubagentStart`；其他 synthetic/internal subagents 不运行 start hooks。[E: codex-rs/core/src/hook_runtime.rs:103][E: codex-rs/core/src/hook_runtime.rs:111][E: codex-rs/core/src/hook_runtime.rs:119][E: codex-rs/core/src/hook_runtime.rs:125][E: codex-rs/core/src/hook_runtime.rs:126]

`run_pre_tool_use_hooks` 构造 stable `PreToolUseRequest`，发出 started/completed events，记录 additional contexts；如果 outcome 要 block，则返回面向模型的 blocked message。[E: codex-rs/core/src/hook_runtime.rs:163][E: codex-rs/core/src/hook_runtime.rs:170][E: codex-rs/core/src/hook_runtime.rs:185][E: codex-rs/core/src/hook_runtime.rs:188][E: codex-rs/core/src/hook_runtime.rs:195][E: codex-rs/core/src/hook_runtime.rs:198]

`inspect_pending_input` 只对 `TurnInput::UserInput` 构造 `UserPromptSubmitRequest`，先 preview 再运行 `run_user_prompt_submit`，并复用 context-injecting outcome；非用户输入不会触发该 hook。[E: codex-rs/core/src/hook_runtime.rs:500][E: codex-rs/core/src/hook_runtime.rs:505][E: codex-rs/core/src/hook_runtime.rs:506][E: codex-rs/core/src/hook_runtime.rs:507][E: codex-rs/core/src/hook_runtime.rs:519][E: codex-rs/core/src/hook_runtime.rs:524][E: codex-rs/core/src/hook_runtime.rs:528]

`ToolRegistry::dispatch_any_with_terminal_outcome` 在 handler 提供 pre payload 时调用 pre hook；如果被 block，会终止该 tool call 并通知 lifecycle outcome 为 blocked。[E: codex-rs/core/src/tools/registry.rs:405][E: codex-rs/core/src/tools/registry.rs:495][E: codex-rs/core/src/tools/registry.rs:505][E: codex-rs/core/src/tools/registry.rs:508][E: codex-rs/core/src/tools/registry.rs:511]

`PostToolUse` 只在 tool handler 成功且产生 post payload 时运行；它拿到 handler 已适配过的 stable tool input/response，而不是内部 raw payload。[E: codex-rs/core/src/tools/registry.rs:575][E: codex-rs/core/src/tools/registry.rs:583][E: codex-rs/core/src/hook_runtime.rs:258][E: codex-rs/core/src/hook_runtime.rs:260][E: codex-rs/core/src/hook_runtime.rs:264][E: codex-rs/core/src/hook_runtime.rs:273]

Permission request、Stop/SubagentStop、PreCompact/PostCompact hooks 分别有独立 request builders；PermissionRequest 返回 optional decision，compact hooks 可返回 stopped/continue，Stop 会按 root/subagent source 选择 target。[E: codex-rs/core/src/hook_runtime.rs:222][E: codex-rs/core/src/hook_runtime.rs:225][E: codex-rs/core/src/hook_runtime.rs:298][E: codex-rs/core/src/hook_runtime.rs:304][E: codex-rs/core/src/hook_runtime.rs:368][E: codex-rs/core/src/hook_runtime.rs:405]

## Command 执行

Dispatcher 按 event name 和 matcher input 筛选 handlers；源码注释说明同一个 configured handler 只检查一次，避免 compatibility aliases 对同一 tool call 重复运行同一 hook。[E: codex-rs/hooks/src/engine/dispatcher.rs:27][E: codex-rs/hooks/src/engine/dispatcher.rs:41][E: codex-rs/hooks/src/engine/dispatcher.rs:44][E: codex-rs/hooks/src/engine/dispatcher.rs:47]

Command runner 使用 configured shell 或默认 shell，设置 cwd、stdin、stdout/stderr pipe、kill_on_drop，并将 hook request JSON 写入 stdin；timeout 会被映射成 `"hook timed out after ..."` error。[E: codex-rs/hooks/src/engine/command_runner.rs:24][E: codex-rs/hooks/src/engine/command_runner.rs:33][E: codex-rs/hooks/src/engine/command_runner.rs:35][E: codex-rs/hooks/src/engine/command_runner.rs:56][E: codex-rs/hooks/src/engine/command_runner.rs:71][E: codex-rs/hooks/src/engine/command_runner.rs:91]

## Gotchas

- `include_disabled=false` 意味着 disabled project layers 不会贡献 layer-local hooks；managed requirements 和 plugin sources 走单独路径。[E: codex-rs/hooks/src/engine/discovery.rs:97][E: codex-rs/hooks/src/engine/discovery.rs:99][E: codex-rs/hooks/src/engine/discovery.rs:86][E: codex-rs/hooks/src/engine/discovery.rs:159]
- `HookHandlerConfig::Prompt` 和 `HookHandlerConfig::Agent` 是 schema 可读类型，但当前 discovery 会跳过并 warning；不能把它们当作 runnable handlers。[E: codex-rs/config/src/hook_config.rs:156][E: codex-rs/config/src/hook_config.rs:158][E: codex-rs/hooks/src/engine/discovery.rs:548][E: codex-rs/hooks/src/engine/discovery.rs:552]
- legacy `AfterAgent` hook contract 仍在 `types.rs` 和 `run_legacy_after_agent_hook` 中存在，和 Claude-style lifecycle hook engine 是两条不同路径。[E: codex-rs/hooks/src/types.rs:92][E: codex-rs/hooks/src/types.rs:93][E: codex-rs/core/src/hook_runtime.rs:433][E: codex-rs/core/src/hook_runtime.rs:449]

## Sources

- `codex-rs/config/src/hook_config.rs`
- `codex-rs/hooks/src/types.rs`
- `codex-rs/hooks/src/engine/discovery.rs`
- `codex-rs/hooks/src/engine/dispatcher.rs`
- `codex-rs/hooks/src/engine/mod.rs`
- `codex-rs/hooks/src/engine/command_runner.rs`
- `codex-rs/core/src/hook_runtime.rs`
- `codex-rs/core/src/tools/registry.rs`

## 相关

- `subsys.config-auth.config-loading`: hooks discovery 依赖 config layer folder 和 disabled layer 语义。
- `subsys.core.tool-system`: tool handler 如何提供 pre/post hook payload。
- `subsys.platform.analytics`: hook runs 产生 events/metrics。
