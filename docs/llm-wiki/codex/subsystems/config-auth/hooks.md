---
id: subsys.config-auth.hooks
title: Hooks 系统
kind: subsystem
tier: T2
source: [codex-rs/config/src/hook_config.rs, codex-rs/hooks/src/types.rs, codex-rs/hooks/src/engine/discovery.rs, codex-rs/hooks/src/engine/dispatcher.rs, codex-rs/hooks/src/engine/mod.rs, codex-rs/hooks/src/engine/command_runner.rs, codex-rs/core/src/hook_runtime.rs, codex-rs/core/src/tools/registry.rs]
symbols: [HooksFile, HookEventsToml, HookHandlerConfig, ClaudeHooksEngine, discover_handlers, run_pre_tool_use_hooks, run_post_tool_use_hooks, run_permission_request_hooks, run_session_end_hooks, inspect_pending_input]
related: [subsys.config-auth.config-loading, subsys.core.tool-system, subsys.core.tool-router, subsys.platform.analytics]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> Codex hooks 系统现在把 hook schema 放在 `codex_config::hook_config`，由 `codex_hooks::engine` 从 config layers、managed requirements 和 plugin hook sources 发现 handlers，再由 core session/tool runtime 发起 preview/start/completed flow。[E: codex-rs/config/src/hook_config.rs:12][E: codex-rs/config/src/hook_config.rs:36][E: codex-rs/hooks/src/engine/discovery.rs:65][E: codex-rs/hooks/src/engine/mod.rs:110][E: codex-rs/core/src/hook_runtime.rs:163][E: codex-rs/core/src/tools/registry.rs:489]

## 能回答的问题

- hooks JSON/TOML 支持哪些 event key 和 handler 类型？
- discovery 如何从 config layer、managed requirements 和 plugin hook sources 收集 hooks？
- hook trust、managed-only policy、disabled states 如何影响 runnable handlers？
- `PreToolUse`、`UserPromptSubmit`、`PermissionRequest`、`PostToolUse`、compact、session/subagent stop hooks 在 core 哪里触发？
- command hook 怎样设置 stdin、cwd、shell、timeout 和 env？

## 职责边界

本节点覆盖 hooks config/discovery/dispatch/runtime integration。`codex-rs/hooks/src/types.rs` 中的 `Hook`/`HookPayload`/`HookEvent::AfterAgent` 是 legacy after-agent hook contract；Claude-style lifecycle hooks 的 schema 来自 `codex-rs/config/src/hook_config.rs`。[E: codex-rs/hooks/src/types.rs:39][E: codex-rs/hooks/src/types.rs:64][E: codex-rs/hooks/src/types.rs:92][E: codex-rs/config/src/hook_config.rs:36]

工具 plan/spec 门控不在本节点展开；当前工具 ground truth 是 `codex-rs/core/src/tools/spec_plan.rs`，handler dispatch 在 `codex-rs/core/src/tools/registry.rs`。[E: codex-rs/core/src/tools/registry.rs:325][E: codex-rs/core/src/tools/registry.rs:399]

## 数据模型

`HooksFile` 顶层字段为 `hooks: HookEventsToml`；`HooksToml` 则把 hook events flatten 到 TOML 并额外保存 `state` map，用于 per-hook enable/trust state。[E: codex-rs/config/src/hook_config.rs:10][E: codex-rs/config/src/hook_config.rs:12][E: codex-rs/config/src/hook_config.rs:20][E: codex-rs/config/src/hook_config.rs:22][E: codex-rs/config/src/hook_config.rs:24]

`HookEventsToml` 当前支持 11 个 event keys：`PreToolUse`、`PermissionRequest`、`PostToolUse`、`PreCompact`、`PostCompact`、`SessionStart`、新增的 `SessionEnd`、`UserPromptSubmit`、`SubagentStart`、`SubagentStop` 和 `Stop`。[E: codex-rs/config/src/hook_config.rs:36][E: codex-rs/config/src/hook_config.rs:43][E: codex-rs/config/src/hook_config.rs:47][E: codex-rs/config/src/hook_config.rs:49][E: codex-rs/config/src/hook_config.rs:51][E: codex-rs/config/src/hook_config.rs:58][E: codex-rs/config/src/hook_config.rs:122]

每个 `MatcherGroup` 有 optional matcher 和 handler list；`HookHandlerConfig` 当前可反序列化 `command`、`prompt`、`agent` 三类，但 discovery 只把 command handler 加入 runnable handler set，prompt/agent handler 会产生 unsupported warning。[E: codex-rs/config/src/hook_config.rs:140][E: codex-rs/config/src/hook_config.rs:140][E: codex-rs/config/src/hook_config.rs:144][E: codex-rs/config/src/hook_config.rs:149][E: codex-rs/config/src/hook_config.rs:151][E: codex-rs/config/src/hook_config.rs:163][E: codex-rs/config/src/hook_config.rs:165][E: codex-rs/hooks/src/engine/discovery.rs:562]

## Discovery

1. `ClaudeHooksEngine::new` 在 hooks disabled 时返回空 handler set；enabled 时加载 generated schemas 并调用 `discover_handlers`。[E: codex-rs/hooks/src/engine/mod.rs:110][E: codex-rs/hooks/src/engine/mod.rs:119][E: codex-rs/hooks/src/engine/mod.rs:128][E: codex-rs/hooks/src/engine/mod.rs:129]
2. `discover_handlers` 先从 `ConfigLayerStack::requirements().managed_hooks` append managed requirement hooks，再遍历 enabled config layers，最后 append plugin hook sources。[E: codex-rs/hooks/src/engine/discovery.rs:65][E: codex-rs/hooks/src/engine/discovery.rs:88][E: codex-rs/hooks/src/engine/discovery.rs:99][E: codex-rs/hooks/src/engine/discovery.rs:161]
3. Config layer traversal 使用 `LowestPrecedenceFirst` 且 `include_disabled=false`；每个 layer 可同时加载 `hooks.json` 和 TOML `[hooks]`，两者同时非空时会记录 warning。[E: codex-rs/hooks/src/engine/discovery.rs:99][E: codex-rs/hooks/src/engine/discovery.rs:100][E: codex-rs/hooks/src/engine/discovery.rs:118][E: codex-rs/hooks/src/engine/discovery.rs:124][E: codex-rs/hooks/src/engine/discovery.rs:126]
4. `allow_managed_hooks_only` 来自 requirements；policy 不允许的 source 会被跳过，managed hooks 仍可运行。[E: codex-rs/hooks/src/engine/discovery.rs:77][E: codex-rs/hooks/src/engine/discovery.rs:78][E: codex-rs/hooks/src/engine/discovery.rs:59][E: codex-rs/hooks/src/engine/discovery.rs:60][E: codex-rs/hooks/src/engine/discovery.rs:115]
5. Plugin hook sources 会注入 `PLUGIN_ROOT`/`PLUGIN_DATA` 以及 Claude 兼容 env，然后以 `HookSource::Plugin` append。[E: codex-rs/hooks/src/engine/discovery.rs:220][E: codex-rs/hooks/src/engine/discovery.rs:232][E: codex-rs/hooks/src/engine/discovery.rs:235][E: codex-rs/hooks/src/engine/discovery.rs:250][E: codex-rs/hooks/src/engine/discovery.rs:257]

## Handler 校验与 trust

`load_hooks_json` 只读取存在的 `hooks.json`，parse 失败记录 warning 并返回 None；`load_toml_hooks_from_layer` 从 layer config 的 `hooks` 字段反序列化 `HookEventsToml`，空 hooks 不产生 source。[E: codex-rs/hooks/src/engine/discovery.rs:305][E: codex-rs/hooks/src/engine/discovery.rs:309][E: codex-rs/hooks/src/engine/discovery.rs:325][E: codex-rs/hooks/src/engine/discovery.rs:328][E: codex-rs/hooks/src/engine/discovery.rs:348][E: codex-rs/hooks/src/engine/discovery.rs:353][E: codex-rs/hooks/src/engine/discovery.rs:365]

Discovery 会按 event 计算 matcher pattern、validate matcher 并拒绝空 command。普通 event 仍拒绝 async、timeout 缺省 600 秒且最小 1 秒；`SessionEnd` 可接受 async 配置但当前会 warning 后同步运行，timeout 缺省 1 秒并强制 cap 为 3 秒。[E: codex-rs/hooks/src/engine/discovery.rs:453][E: codex-rs/hooks/src/engine/discovery.rs:455][E: codex-rs/hooks/src/engine/discovery.rs:477][E: codex-rs/hooks/src/engine/discovery.rs:498][E: codex-rs/hooks/src/engine/discovery.rs:583][E: codex-rs/hooks/src/engine/discovery.rs:587]

每个 command handler 都会生成 `HookListEntry`；只有 enabled 且 trust status 是 Managed/Trusted，或 source 启用了 bypass hook trust，才会 push 到 runnable `ConfiguredHandler` list。[E: codex-rs/hooks/src/engine/discovery.rs:511][E: codex-rs/hooks/src/engine/discovery.rs:520][E: codex-rs/hooks/src/engine/discovery.rs:522][E: codex-rs/hooks/src/engine/discovery.rs:524][E: codex-rs/hooks/src/engine/discovery.rs:541][E: codex-rs/hooks/src/engine/discovery.rs:548]

## Core runtime 触发点

`run_pending_session_start_hooks` 将 root session startup 映射为 `SessionStart`，将 thread-spawn child startup 映射为 `SubagentStart`；其他 synthetic/internal subagents 不运行 start hooks。[E: codex-rs/core/src/hook_runtime.rs:103][E: codex-rs/core/src/hook_runtime.rs:111][E: codex-rs/core/src/hook_runtime.rs:119][E: codex-rs/core/src/hook_runtime.rs:125][E: codex-rs/core/src/hook_runtime.rs:126]

`run_pre_tool_use_hooks` 构造 stable `PreToolUseRequest`，发出 started/completed events，记录 additional contexts；如果 outcome 要 block，则返回面向模型的 blocked message。[E: codex-rs/core/src/hook_runtime.rs:163][E: codex-rs/core/src/hook_runtime.rs:170][E: codex-rs/core/src/hook_runtime.rs:185][E: codex-rs/core/src/hook_runtime.rs:188][E: codex-rs/core/src/hook_runtime.rs:195][E: codex-rs/core/src/hook_runtime.rs:198]

`inspect_pending_input` 只对 `TurnInput::UserInput` 构造 `UserPromptSubmitRequest`，先 preview 再运行 `run_user_prompt_submit`，并复用 context-injecting outcome；非用户输入不会触发该 hook。[E: codex-rs/core/src/hook_runtime.rs:532][E: codex-rs/core/src/hook_runtime.rs:537][E: codex-rs/core/src/hook_runtime.rs:538][E: codex-rs/core/src/hook_runtime.rs:539][E: codex-rs/core/src/hook_runtime.rs:551][E: codex-rs/core/src/hook_runtime.rs:556][E: codex-rs/core/src/hook_runtime.rs:560]

`ToolRegistry::dispatch_any_with_terminal_outcome` 在 handler 提供 pre payload 时调用 pre hook；如果被 block，会终止该 tool call 并通知 lifecycle outcome 为 blocked。[E: codex-rs/core/src/tools/registry.rs:399][E: codex-rs/core/src/tools/registry.rs:489][E: codex-rs/core/src/tools/registry.rs:499][E: codex-rs/core/src/tools/registry.rs:502][E: codex-rs/core/src/tools/registry.rs:505]

`PostToolUse` 只在 tool handler 成功且产生 post payload 时运行；它拿到 handler 已适配过的 stable tool input/response，而不是内部 raw payload。[E: codex-rs/core/src/tools/registry.rs:585][E: codex-rs/core/src/tools/registry.rs:593][E: codex-rs/core/src/hook_runtime.rs:264][E: codex-rs/core/src/hook_runtime.rs:273]

Permission request、Stop/SubagentStop、PreCompact/PostCompact hooks 分别有独立 request builders；PermissionRequest 返回 optional decision，compact hooks 可返回 stopped/continue，Stop 会按 root/subagent source 选择 target。[E: codex-rs/core/src/hook_runtime.rs:225][E: codex-rs/core/src/hook_runtime.rs:298][E: codex-rs/core/src/hook_runtime.rs:400][E: codex-rs/core/src/hook_runtime.rs:437]

`run_session_end_hooks` 只运行 root session 的 `SessionEnd`：先创建 default turn context 并跳过 `SessionSource::SubAgent`，构造带 transcript path 的 request，flush rollout 后发 started/completed events。Thread-spawn 子会话仍由 SubagentStart/SubagentStop 覆盖。[E: codex-rs/core/src/hook_runtime.rs:369][E: codex-rs/core/src/hook_runtime.rs:376][E: codex-rs/core/src/hook_runtime.rs:384][E: codex-rs/core/src/hook_runtime.rs:391][E: codex-rs/core/src/hook_runtime.rs:394][E: codex-rs/core/src/hook_runtime.rs:397]

## Command 执行

Dispatcher 按 event name 和 matcher input 筛选 handlers；源码注释说明同一个 configured handler 只检查一次，避免 compatibility aliases 对同一 tool call 重复运行同一 hook。[E: codex-rs/hooks/src/engine/dispatcher.rs:27][E: codex-rs/hooks/src/engine/dispatcher.rs:44][E: codex-rs/hooks/src/engine/dispatcher.rs:47][I]

Command runner 使用 configured shell 或默认 shell，设置 cwd、stdin、stdout/stderr pipe、kill_on_drop，并将 hook request JSON 写入 stdin；timeout 会被映射成 `"hook timed out after ..."` error。[E: codex-rs/hooks/src/engine/command_runner.rs:49][E: codex-rs/hooks/src/engine/command_runner.rs:59][E: codex-rs/hooks/src/engine/command_runner.rs:61][E: codex-rs/hooks/src/engine/command_runner.rs:84][E: codex-rs/hooks/src/engine/command_runner.rs:101][E: codex-rs/hooks/src/engine/command_runner.rs:91]

## Gotchas

- `include_disabled=false` 意味着 disabled project layers 不会贡献 layer-local hooks；managed requirements 和 plugin sources 走单独路径。[E: codex-rs/hooks/src/engine/discovery.rs:99][E: codex-rs/hooks/src/engine/discovery.rs:88][E: codex-rs/hooks/src/engine/discovery.rs:161]
- `HookHandlerConfig::Prompt` 和 `HookHandlerConfig::Agent` 是 schema 可读类型，但当前 discovery 会跳过并 warning；不能把它们当作 runnable handlers。[E: codex-rs/config/src/hook_config.rs:163][E: codex-rs/config/src/hook_config.rs:165][E: codex-rs/hooks/src/engine/discovery.rs:562][E: codex-rs/hooks/src/engine/discovery.rs:566]
- legacy `AfterAgent` hook contract 仍在 `types.rs` 和 `run_legacy_after_agent_hook` 中存在，和 Claude-style lifecycle hook engine 是两条不同路径。[E: codex-rs/hooks/src/types.rs:92][E: codex-rs/hooks/src/types.rs:93][E: codex-rs/core/src/hook_runtime.rs:465][E: codex-rs/core/src/hook_runtime.rs:481]
- 配置里把 `SessionEnd` 标成 async 不会让进程 fire-and-forget；当前实现明确同步等待，只有超时预算被压到 1–3 秒。[E: codex-rs/hooks/src/engine/discovery.rs:498]

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
