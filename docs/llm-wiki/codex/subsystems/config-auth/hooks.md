---
id: subsys.config-auth.hooks
title: Hooks 系统
kind: subsystem
tier: T2
source: [codex-rs/config/src/hook_config.rs, codex-rs/hooks/src/types.rs, codex-rs/hooks/src/engine/discovery.rs, codex-rs/hooks/src/engine/dispatcher.rs, codex-rs/hooks/src/engine/mod.rs, codex-rs/hooks/src/engine/command_runner.rs, codex-rs/hooks/src/engine/mcp_runner.rs, codex-rs/hooks/src/events/session_end.rs, codex-rs/core-plugins/src/manager.rs, codex-rs/core-plugins/src/loader.rs, codex-rs/core/src/hook_runtime.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/thread_manager.rs, codex-rs/app-server/src/effective_plugin_change.rs]
symbols: [HooksFile, HookEventsToml, HookHandlerConfig, ClaudeHooksEngine, discover_handlers, PluginsManager::plugin_hooks_for_layer_stack, TargetCuratedMarketplace, run_pre_tool_use_hooks, run_post_tool_use_hooks, run_permission_request_hooks, run_session_end_hooks, run_turn_interrupt_hooks, inspect_pending_input, run_mcp_tool, ThreadManager::refresh_hook_runtimes]
related: [subsys.config-auth.config-loading, subsys.core.tool-system, subsys.core.tool-router, subsys.platform.analytics]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> Codex hooks 系统现在把 hook schema 放在 `codex_config::hook_config`，由 `codex_hooks::engine` 从 config layers、managed requirements 和 plugin hook sources 发现 command 与 MCP tool handlers，再由 core session/tool runtime 发起 preview/start/completed flow。plugin 生效后 app-server 会 `refresh_hook_runtimes()`。[E: codex-rs/config/src/hook_config.rs:16][E: codex-rs/config/src/hook_config.rs:36][E: codex-rs/hooks/src/engine/discovery.rs:94][E: codex-rs/hooks/src/engine/mod.rs:229][E: codex-rs/hooks/src/engine/mcp_runner.rs:28][E: codex-rs/core/src/hook_runtime.rs:184][E: codex-rs/core/src/tools/registry.rs:567][E: codex-rs/core/src/thread_manager.rs:728]

## 能回答的问题

- hooks JSON/TOML 支持哪些 event key 和 handler 类型？
- discovery 如何从 config layer、managed requirements 和 plugin hook sources 收集 hooks？
- hook trust、managed-only policy、disabled states 如何影响 runnable handlers？
- `PreToolUse`、`UserPromptSubmit`、`PermissionRequest`、`PostToolUse`、compact、session/subagent stop、`Interrupt` hooks 在 core 哪里触发？
- command hook 怎样设置 stdin、cwd、shell、timeout 和 env？

## 职责边界

本节点覆盖 hooks config/discovery/dispatch/runtime integration。`codex-rs/hooks/src/types.rs` 中的 `Hook`/`HookPayload`/`HookEvent::AfterAgent` 是 legacy after-agent hook contract；Claude-style lifecycle hooks 的 schema 来自 `codex-rs/config/src/hook_config.rs`。[E: codex-rs/hooks/src/types.rs:39][E: codex-rs/hooks/src/types.rs:64][E: codex-rs/hooks/src/types.rs:92][E: codex-rs/config/src/hook_config.rs:36]

工具 plan/spec 门控不在本节点展开；当前工具 ground truth 是 `codex-rs/core/src/tools/spec_plan.rs`，handler dispatch 在 `codex-rs/core/src/tools/registry.rs`。[E: codex-rs/core/src/tools/registry.rs:495]

## 数据模型

`HooksFile` 顶层字段为 optional `description` 和 `hooks: HookEventsToml`；`HooksToml` 则把 hook events flatten 到 TOML 并额外保存 `state` map，用于 per-hook enable/trust state。[E: codex-rs/config/src/hook_config.rs:12][E: codex-rs/config/src/hook_config.rs:14][E: codex-rs/config/src/hook_config.rs:16][E: codex-rs/config/src/hook_config.rs:20][E: codex-rs/config/src/hook_config.rs:22][E: codex-rs/config/src/hook_config.rs:24]

`HookEventsToml` 当前支持 **12** 个 event keys：`PreToolUse`、`PermissionRequest`、`PostToolUse`、`PreCompact`、`PostCompact`、`SessionStart`、`SessionEnd`、`UserPromptSubmit`、`SubagentStart`、`SubagentStop`、`Stop` 和新增的 `Interrupt`。`matcher_groups_mut()` 也返回这 12 对。[E: codex-rs/config/src/hook_config.rs:36][E: codex-rs/config/src/hook_config.rs:49][E: codex-rs/config/src/hook_config.rs:59][E: codex-rs/config/src/hook_config.rs:133]

每个 `MatcherGroup` 有 optional matcher 和 handler list；`HookHandlerConfig` 当前可反序列化 `command`、`mcp_tool`、`prompt`、`agent` 四类。discovery 把 command 与 MCP tool 加入 runnable set；prompt/agent handler 会产生 unsupported warning。MCP tool 还要求非空 `server`/`tool`，且不能用于 `SessionEnd`。[E: codex-rs/config/src/hook_config.rs:154][E: codex-rs/config/src/hook_config.rs:163][E: codex-rs/config/src/hook_config.rs:187][E: codex-rs/config/src/hook_config.rs:198][E: codex-rs/config/src/hook_config.rs:200][E: codex-rs/hooks/src/engine/discovery.rs:589][E: codex-rs/hooks/src/engine/discovery.rs:600][E: codex-rs/hooks/src/engine/discovery.rs:635]

## Discovery

1. `ClaudeHooksEngine::new` 在 hooks disabled 时返回空 handler set；enabled 时加载 generated schemas 并调用 `discover_handlers`。构造函数现在**始终**接收 `mcp_executor`，不再在 `new()` 里因缺少 executor 丢掉 MCP handlers。[E: codex-rs/hooks/src/engine/mod.rs:229][E: codex-rs/hooks/src/engine/mod.rs:236][E: codex-rs/hooks/src/engine/mod.rs:255][E: codex-rs/hooks/src/engine/mod.rs:244]
2. `discover_handlers` 先从 `ConfigLayerStack::requirements().managed_hooks` append managed requirement hooks，再遍历 config layers，最后 append plugin hook sources。[E: codex-rs/hooks/src/engine/discovery.rs:94][E: codex-rs/hooks/src/engine/discovery.rs:119][E: codex-rs/hooks/src/engine/discovery.rs:129][E: codex-rs/hooks/src/engine/discovery.rs:190]
3. Config layer traversal 使用 `layers_low_to_high()`；每个 layer 可同时加载 `hooks.json` 和 TOML `[hooks]`，两者同时非空时会记录 warning。[E: codex-rs/hooks/src/engine/discovery.rs:129][E: codex-rs/hooks/src/engine/discovery.rs:146][E: codex-rs/hooks/src/engine/discovery.rs:152][E: codex-rs/hooks/src/engine/discovery.rs:159]
4. `allow_managed_hooks_only` 来自 requirements；policy 不允许的 source 会被跳过，managed hooks 仍可运行。[E: codex-rs/hooks/src/engine/discovery.rs:84][E: codex-rs/hooks/src/engine/discovery.rs:89][E: codex-rs/hooks/src/engine/discovery.rs:108][E: codex-rs/hooks/src/engine/discovery.rs:143]
5. Plugin hook sources 会注入 `PLUGIN_ROOT`/`PLUGIN_DATA` 以及 Claude 兼容 env，然后以 plugin source append。[E: codex-rs/hooks/src/engine/discovery.rs:244][E: codex-rs/hooks/src/engine/discovery.rs:265][E: codex-rs/hooks/src/engine/discovery.rs:267]

Plugin hook discovery 在进入 hooks engine 前还经过 auth-aware marketplace 路由：`PluginsManager::plugin_hooks_for_layer_stack` 根据 auth mode 选择 curated target，再以 hooks-only scope 载入并过滤 plugin。`uses_codex_backend` 选 `OpenAiWithRemote`（排除 API curated）；否则选 `OpenAiApi`（排除 OpenAI curated 与 remote global）。`OpenAi` 变体仍排除 API curated 与 remote global。[E: codex-rs/core-plugins/src/manager.rs:624][E: codex-rs/core-plugins/src/manager.rs:964][E: codex-rs/core-plugins/src/loader.rs:84][E: codex-rs/core-plugins/src/loader.rs:208][E: codex-rs/core-plugins/src/loader.rs:295][E: codex-rs/core-plugins/src/loader.rs:303]

## Handler 校验与 trust

`load_hooks_json` 只读取存在的 `hooks.json`，parse 失败记录 warning 并返回 None；`load_toml_hooks_from_layer` 从 layer config 的 `hooks` 字段反序列化 `HookEventsToml`，空 hooks 不产生 source。[E: codex-rs/hooks/src/engine/discovery.rs:340][E: codex-rs/hooks/src/engine/discovery.rs:344][E: codex-rs/hooks/src/engine/discovery.rs:379][E: codex-rs/hooks/src/engine/discovery.rs:382][E: codex-rs/hooks/src/engine/discovery.rs:388]

Discovery 会按 event 计算 matcher pattern、validate matcher 并拒绝空 command。普通 event timeout 缺省 600 秒且最小 1 秒；`SessionEnd` 与 `Interrupt` 默认 1 秒、上限 3 秒。`SessionEnd` 可接受 async 配置但当前会 warning 后同步运行；`Interrupt` 不在这条强制同步名单里，配置 `async` 时可以异步跑。[E: codex-rs/hooks/src/engine/discovery.rs:518][E: codex-rs/hooks/src/engine/discovery.rs:531][E: codex-rs/hooks/src/engine/discovery.rs:749][E: codex-rs/hooks/src/engine/discovery.rs:762][E: codex-rs/hooks/src/events/session_end.rs:20][E: codex-rs/hooks/src/events/session_end.rs:23]

每个 command 或 MCP tool handler 都会生成 `HookListEntry`；只有 enabled 且 trust status 是 Managed/Trusted，或 source 启用了 bypass hook trust，才会 push 到 runnable `ConfiguredHandler` list。[E: codex-rs/hooks/src/engine/discovery.rs:695][E: codex-rs/hooks/src/engine/discovery.rs:713]

## Core runtime 触发点

`run_pending_session_start_hooks` 将 root session startup 映射为 `SessionStart`，将 thread-spawn child startup 映射为 `SubagentStart`；其他 synthetic/internal subagents 不运行 start hooks。[E: codex-rs/core/src/hook_runtime.rs:124][E: codex-rs/core/src/hook_runtime.rs:133][E: codex-rs/core/src/hook_runtime.rs:146][E: codex-rs/core/src/hook_runtime.rs:147]

`run_pre_tool_use_hooks` 构造 stable `PreToolUseRequest`，发出 started/completed events，记录 additional contexts；如果 outcome 要 block，则返回面向模型的 blocked message。[E: codex-rs/core/src/hook_runtime.rs:184][E: codex-rs/core/src/hook_runtime.rs:191][E: codex-rs/core/src/hook_runtime.rs:206][E: codex-rs/core/src/hook_runtime.rs:209]

`inspect_pending_input` 只对 `TurnInput::UserInput` 构造 `UserPromptSubmitRequest`，先 preview 再运行 `run_user_prompt_submit`，并复用 context-injecting outcome；非用户输入不会触发该 hook。[E: codex-rs/core/src/hook_runtime.rs:661][E: codex-rs/core/src/hook_runtime.rs:667][E: codex-rs/core/src/hook_runtime.rs:680][E: codex-rs/core/src/hook_runtime.rs:685]

`ToolRegistry::dispatch_any_with_terminal_outcome` 在 handler 提供 pre payload 时调用 pre hook；如果被 block，会终止该 tool call 并通知 lifecycle outcome 为 blocked。[E: codex-rs/core/src/tools/registry.rs:495][E: codex-rs/core/src/tools/registry.rs:567][E: codex-rs/core/src/tools/registry.rs:577]

`PostToolUse` 只在 tool handler 成功且产生 post payload 时运行；它拿到 handler 已适配过的 stable tool input/response，而不是内部 raw payload。[E: codex-rs/core/src/tools/registry.rs:682][E: codex-rs/core/src/hook_runtime.rs:285]

Permission request、Stop/SubagentStop、PreCompact/PostCompact hooks 分别有独立 request builders；PermissionRequest 返回 optional decision，compact hooks 可返回 stopped/continue，Stop 会按 root/subagent source 选择 target。[E: codex-rs/core/src/hook_runtime.rs:246][E: codex-rs/core/src/hook_runtime.rs:376][E: codex-rs/core/src/hook_runtime.rs:385][E: codex-rs/core/src/hook_runtime.rs:528][E: codex-rs/core/src/hook_runtime.rs:565]

`run_session_end_hooks` 只运行 root session 的 `SessionEnd`。Thread-spawn 子会话仍由 SubagentStart/SubagentStop 覆盖。[E: codex-rs/core/src/hook_runtime.rs:455][E: codex-rs/core/src/hook_runtime.rs:466]

`run_turn_interrupt_hooks` 同样是 root-only：subagent 直接 return。它在 active turn 已 detach 后复用 last executing step 的 executor hook sources，flush rollout，再跑 `Interrupt`。[E: codex-rs/core/src/hook_runtime.rs:486][E: codex-rs/core/src/hook_runtime.rs:491][E: codex-rs/core/src/hook_runtime.rs:503][E: codex-rs/core/src/hook_runtime.rs:524]

plugin / marketplace / user-config 变更后，app-server 会 `clear_cache` 并 `refresh_hook_runtimes()`；session 用当前 config 重建 `ClaudeHooksEngine`，若 refresh 期间 config 已被更新则丢弃过期结果。[E: codex-rs/app-server/src/effective_plugin_change.rs:31][E: codex-rs/app-server/src/effective_plugin_change.rs:37][E: codex-rs/core/src/thread_manager.rs:728][E: codex-rs/core/src/session/mod.rs:1928][E: codex-rs/core/src/session/mod.rs:1940]

## Command 执行

Dispatcher 按 event name 和 matcher input 筛选 handlers；同一个 configured handler 只检查一次，避免 compatibility aliases 对同一 tool call 重复运行同一 hook。command handler 走 `run_command`，MCP tool handler 走 `run_mcp_tool` 并把 `${field.path}` 模板展开成 hook event JSON。[E: codex-rs/hooks/src/engine/dispatcher.rs:32][E: codex-rs/hooks/src/engine/dispatcher.rs:49][E: codex-rs/hooks/src/engine/dispatcher.rs:199][E: codex-rs/hooks/src/engine/dispatcher.rs:214][E: codex-rs/hooks/src/engine/mcp_runner.rs:28][E: codex-rs/hooks/src/engine/mcp_runner.rs:41]

Command runner 使用 configured shell 或默认 shell，设置 cwd、stdin、stdout/stderr pipe、kill_on_drop，并将 hook request JSON 写入 stdin；timeout 会被映射成 `"hook timed out after ..."` error。[E: codex-rs/hooks/src/engine/command_runner.rs:217][E: codex-rs/hooks/src/engine/command_runner.rs:222][E: codex-rs/hooks/src/engine/command_runner.rs:324]

## Gotchas

- `allow_managed_hooks_only` 意味着非 managed source 不会贡献 layer-local hooks；managed requirements 和 plugin sources 走单独路径。[E: codex-rs/hooks/src/engine/discovery.rs:89][E: codex-rs/hooks/src/engine/discovery.rs:119][E: codex-rs/hooks/src/engine/discovery.rs:244]
- `HookHandlerConfig::Prompt` 和 `HookHandlerConfig::Agent` 是 schema 可读类型，但当前 discovery 会跳过并 warning；不能把它们当作 runnable handlers。[E: codex-rs/config/src/hook_config.rs:198][E: codex-rs/config/src/hook_config.rs:200][E: codex-rs/hooks/src/engine/discovery.rs:635][E: codex-rs/hooks/src/engine/discovery.rs:645]
- `HookHandlerConfig::McpTool` 是 runnable，但 `SessionEnd` 以及缺少非空 `server`/`tool` 时会被跳过。managed-required source 上的这些失败会记入 `required_load_errors`，足以拒绝 startup。[E: codex-rs/hooks/src/engine/discovery.rs:589][E: codex-rs/hooks/src/engine/discovery.rs:600][E: codex-rs/hooks/src/engine/discovery.rs:67]
- legacy `AfterAgent` hook contract 仍在 `types.rs` 和 `run_legacy_after_agent_hook` 中存在，和 Claude-style lifecycle hook engine 是两条不同路径。[E: codex-rs/hooks/src/types.rs:92][E: codex-rs/hooks/src/types.rs:93][E: codex-rs/core/src/hook_runtime.rs:593]
- 配置里把 `SessionEnd` 标成 async 不会让进程 fire-and-forget；当前实现会 warning 后同步等待。`Interrupt` 不走这条强制同步。[E: codex-rs/hooks/src/engine/discovery.rs:531][E: codex-rs/hooks/src/engine/discovery.rs:749]

## Sources

- `codex-rs/config/src/hook_config.rs`
- `codex-rs/hooks/src/types.rs`
- `codex-rs/hooks/src/engine/discovery.rs`
- `codex-rs/hooks/src/engine/dispatcher.rs`
- `codex-rs/hooks/src/engine/mod.rs`
- `codex-rs/hooks/src/engine/command_runner.rs`
- `codex-rs/hooks/src/engine/mcp_runner.rs`
- `codex-rs/hooks/src/events/session_end.rs`
- `codex-rs/core-plugins/src/manager.rs`
- `codex-rs/core-plugins/src/loader.rs`
- `codex-rs/core/src/hook_runtime.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/app-server/src/effective_plugin_change.rs`

## 相关

- `subsys.config-auth.config-loading`: hooks discovery 依赖 config layer folder 和 disabled layer 语义。
- `subsys.core.tool-system`: tool handler 如何提供 pre/post hook payload。
- `subsys.platform.analytics`: hook runs 产生 events/metrics。
