---
id: ref.key-types
title: Codex key types 跨 crate 索引
kind: reference
tier: T3
source: [codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/core/src/codex_thread.rs, codex-rs/core/src/client.rs, codex-rs/core/src/thread_manager.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/config/mod.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_payload.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/permissions.rs, codex-rs/features/src/lib.rs, codex-rs/model-provider/src/provider.rs, codex-rs/login/src/auth/manager.rs]
symbols: [ModelClient, ModelClientSession, Config, ConfigBuilder, FileSystemSandboxPolicy]
related: [ref.data-model, ref.session-tasks, ref.feature-flags, subsys.core.tool-system, subsys.config-auth.config-loading]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> `key-types` 是 Codex Rust workspace 的跨 crate 类型速查，覆盖 session/turn、client/thread manager、tool router/runtime、config/permissions/features、provider/auth 等 agent 读源码时最常遇到的 struct/enum/trait。[I]

## Core session / turn / client

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `SessionIo` | struct | queue/lifecycle endpoints: `tx_sub`, `rx_event`, agent-status receiver, shared session-loop termination future；runtime state 不再混在 queue handle 中。[E: codex-rs/core/src/session/mod.rs:382][E: codex-rs/core/src/session/mod.rs:383][E: codex-rs/core/src/session/mod.rs:384][E: codex-rs/core/src/session/mod.rs:386][E: codex-rs/core/src/session/mod.rs:389] | `core/src/session/mod.rs` |
| `Session` / `SessionSpawnArgs` | struct | `Session::spawn(args)` 返回 `(Arc<Session>, SessionIo)`；spawn args 汇集 config、history、provider/services 与 thread-store inputs。[E: codex-rs/core/src/session/mod.rs:409][E: codex-rs/core/src/session/mod.rs:481] | `core/src/session/mod.rs` |
| `CodexThread` | struct | public thread conduit，组合 `Arc<Session>` 与 `SessionIo`；submit/next_event 代理到 `io`，thread-specific reads/control 代理到 session。[E: codex-rs/core/src/codex_thread.rs:206][E: codex-rs/core/src/codex_thread.rs:207][E: codex-rs/core/src/codex_thread.rs:208][E: codex-rs/core/src/codex_thread.rs:232] | `core/src/codex_thread.rs` |
| `TurnContext` | struct | single-turn context: sub/trace id、realtime/code-mode state、config/auth/model/provider/telemetry、session source/history/parent thread、environment/cwd、instructions、collaboration/personality、permission/network/sandbox、dynamic tools、metadata/extension/timing state。[E: codex-rs/core/src/session/turn_context.rs:194][E: codex-rs/core/src/session/turn_context.rs:195][E: codex-rs/core/src/session/turn_context.rs:197][E: codex-rs/core/src/session/turn_context.rs:198][E: codex-rs/core/src/session/turn_context.rs:201][E: codex-rs/core/src/session/turn_context.rs:206][E: codex-rs/core/src/session/turn_context.rs:214][E: codex-rs/core/src/session/turn_context.rs:216][E: codex-rs/core/src/session/turn_context.rs:219][E: codex-rs/core/src/session/turn_context.rs:237][E: codex-rs/core/src/session/turn_context.rs:239][E: codex-rs/core/src/session/turn_context.rs:240] | `core/src/session/turn_context.rs` |
| `ModelClient` | struct | session-scoped API client; comments say it shares auth/provider/thread id/transport fallback across turns while turn-scoped settings are passed explicitly。[E: codex-rs/core/src/client.rs:293] | `core/src/client.rs` |
| `ModelClientSession` | struct | turn-scoped streaming session; comment says create a fresh session for each Codex turn to avoid replaying sticky-routing token across turns。[E: codex-rs/core/src/client.rs:315] | `core/src/client.rs` |
| `ThreadManager` | struct | `state: Arc<ThreadManagerState>` plus test guard; `StartThreadOptions` carries config, initial history, source, dynamic tools, metrics and parent trace inputs。[E: codex-rs/core/src/thread_manager.rs:224][E: codex-rs/core/src/thread_manager.rs:225][E: codex-rs/core/src/thread_manager.rs:229][E: codex-rs/core/src/thread_manager.rs:230][E: codex-rs/core/src/thread_manager.rs:232][E: codex-rs/core/src/thread_manager.rs:236][E: codex-rs/core/src/thread_manager.rs:237][E: codex-rs/core/src/thread_manager.rs:238] | `core/src/thread_manager.rs` |

## Turn state / tasks

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `ActiveTurn` | struct | `task: Option<RunningTask>`, `turn_state`; current active turn has one task slot plus shared mutable state。[E: codex-rs/core/src/state/turn.rs:33][E: codex-rs/core/src/state/turn.rs:34][E: codex-rs/core/src/state/turn.rs:35] | `core/src/state/turn.rs` |
| `TaskKind` | enum | `Regular`, `Review`, `Compact`。[E: codex-rs/core/src/state/turn.rs:69][E: codex-rs/core/src/state/turn.rs:70][E: codex-rs/core/src/state/turn.rs:71][E: codex-rs/core/src/state/turn.rs:72] | `core/src/state/turn.rs` |
| `RunningTask` | struct | `done`, `kind`, erased task, cancellation token, abort-on-drop handle, turn context, agent execution guard 与 turn-duration timer。[E: codex-rs/core/src/state/turn.rs:75][E: codex-rs/core/src/state/turn.rs:76][E: codex-rs/core/src/state/turn.rs:77][E: codex-rs/core/src/state/turn.rs:78][E: codex-rs/core/src/state/turn.rs:79][E: codex-rs/core/src/state/turn.rs:80][E: codex-rs/core/src/state/turn.rs:81][E: codex-rs/core/src/state/turn.rs:82][E: codex-rs/core/src/state/turn.rs:85] | `core/src/state/turn.rs` |
| `TurnState` | struct | pending approval/request/user-input/elicitation/dynamic-tool responders, pending input, mailbox phase, permissions, strict review state, tool calls, memory citation flag and token usage snapshot。[E: codex-rs/core/src/state/turn.rs:90][E: codex-rs/core/src/state/turn.rs:91][E: codex-rs/core/src/state/turn.rs:92][E: codex-rs/core/src/state/turn.rs:93][E: codex-rs/core/src/state/turn.rs:94][E: codex-rs/core/src/state/turn.rs:96][E: codex-rs/core/src/state/turn.rs:97][E: codex-rs/core/src/state/turn.rs:98][E: codex-rs/core/src/state/turn.rs:99][E: codex-rs/core/src/state/turn.rs:100][E: codex-rs/core/src/state/turn.rs:101][E: codex-rs/core/src/state/turn.rs:102][E: codex-rs/core/src/state/turn.rs:103] | `core/src/state/turn.rs` |

## Tool system types

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `ToolSpec` | enum | Responses API tool spec union: `Function`, `Namespace`, `ToolSearch`, `WebSearch`, `Freeform`；hosted image generation 已不在该 enum。[E: codex-rs/tools/src/tool_spec.rs:22][E: codex-rs/tools/src/tool_spec.rs:24][E: codex-rs/tools/src/tool_spec.rs:26][E: codex-rs/tools/src/tool_spec.rs:28][E: codex-rs/tools/src/tool_spec.rs:40][E: codex-rs/tools/src/tool_spec.rs:55] | `tools/src/tool_spec.rs` |
| `ToolPayload` | enum | canonical runtime payloads: `Function`, `ToolSearch`, `Custom`。[E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:8][E: codex-rs/tools/src/tool_payload.rs:9][E: codex-rs/tools/src/tool_payload.rs:10] | `tools/src/tool_payload.rs` |
| `ToolExposure` | enum | `Direct`, `Deferred`, `DeferredModelOnly`, `DirectModelOnly`, `CodeModeOnly`, `Hidden`。[E: codex-rs/tools/src/tool_executor.rs:51][E: codex-rs/tools/src/tool_executor.rs:56][E: codex-rs/tools/src/tool_executor.rs:62][E: codex-rs/tools/src/tool_executor.rs:66][E: codex-rs/tools/src/tool_executor.rs:72][E: codex-rs/tools/src/tool_executor.rs:76][E: codex-rs/tools/src/tool_executor.rs:79] | `tools/src/tool_executor.rs` |
| `ToolExecutor` | trait | runtime contract binding `tool_name`, `spec`, `exposure`, `search_info`, `supports_parallel_tool_calls`, `handle`。[E: codex-rs/tools/src/tool_executor.rs:106][E: codex-rs/tools/src/tool_executor.rs:108][E: codex-rs/tools/src/tool_executor.rs:110][E: codex-rs/tools/src/tool_executor.rs:113][E: codex-rs/tools/src/tool_executor.rs:117][E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:127] | `tools/src/tool_executor.rs` |
| `CoreToolRuntime` | trait | core extension over `ToolExecutor<ToolInvocation>`：新增 exact-tool readiness wait，并继续承载 kind matching、runtime cancellation、同步 telemetry tags、hook payload/input rewrite 与 diff consumer。[E: codex-rs/core/src/tools/registry.rs:57][E: codex-rs/core/src/tools/registry.rs:74] | `core/src/tools/registry.rs` |
| `ToolCall` | struct | routed call identity/payload 由 `tool_name`、`call_id`、`payload` 与 optional `encrypted_function_args` 组成；encrypted args 还用于识别 collaboration plaintext-message path。[E: codex-rs/core/src/tools/router.rs:37][E: codex-rs/core/src/tools/router.rs:38][E: codex-rs/core/src/tools/router.rs:39][E: codex-rs/core/src/tools/router.rs:40][E: codex-rs/core/src/tools/router.rs:41][E: codex-rs/core/src/tools/router.rs:46] | `core/src/tools/router.rs` |
| `ToolRouter` | struct | 组合 ordered runtime registry 与 `model_visible_specs`；production path 由 `spec_plan::build_tool_router`/`finalize_tool_router` 构造。[E: codex-rs/core/src/tools/router.rs:74][E: codex-rs/core/src/tools/router.rs:75][E: codex-rs/core/src/tools/router.rs:76][E: codex-rs/core/src/tools/spec_plan.rs:124][E: codex-rs/core/src/tools/spec_plan.rs:363] | `core/src/tools/router.rs` |
| `RegisteredTool` / `ToolRegistry` | struct | registry 现在用 `IndexMap<ToolName, RegisteredTool>` 同时保存 runtime 与 step-effective exposure，保留插入顺序；trusted duplicate 会 error/panic。[E: codex-rs/core/src/tools/registry.rs:279][E: codex-rs/core/src/tools/registry.rs:285][E: codex-rs/core/src/tools/registry.rs:286][E: codex-rs/core/src/tools/registry.rs:322][E: codex-rs/core/src/tools/registry.rs:333] | `core/src/tools/registry.rs` |

## Config / permissions / features

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `Config` | struct | merged runtime config: provenance/warnings/model/service/review/context/auto-compact/provider/personality/permissions and many more fields beyond the initial block。[E: codex-rs/core/src/config/mod.rs:606] | `core/src/config/mod.rs` |
| `ConfigBuilder` | struct | `codex_home`, CLI/harness/loader overrides, strict mode, cloud config bundle, thread config loader and fallback cwd。[E: codex-rs/core/src/config/mod.rs:1359][E: codex-rs/core/src/config/mod.rs:1360][E: codex-rs/core/src/config/mod.rs:1361][E: codex-rs/core/src/config/mod.rs:1362][E: codex-rs/core/src/config/mod.rs:1363][E: codex-rs/core/src/config/mod.rs:1364][E: codex-rs/core/src/config/mod.rs:1365][E: codex-rs/core/src/config/mod.rs:1366][E: codex-rs/core/src/config/mod.rs:1367] | `core/src/config/mod.rs` |
| `SandboxMode` | enum | `read-only`, `workspace-write`, `danger-full-access`; default is `ReadOnly`。[E: codex-rs/protocol/src/config_types.rs:104][E: codex-rs/protocol/src/config_types.rs:107][E: codex-rs/protocol/src/config_types.rs:110][E: codex-rs/protocol/src/config_types.rs:113] | `protocol/src/config_types.rs` |
| `ApprovalsReviewer` | enum | `User` or `AutoReview`; serde accepts `auto_review` and aliases `guardian_subagent` to `AutoReview`。[E: codex-rs/protocol/src/config_types.rs:183][E: codex-rs/protocol/src/config_types.rs:186][E: codex-rs/protocol/src/config_types.rs:187][E: codex-rs/protocol/src/config_types.rs:189] | `protocol/src/config_types.rs` |
| `NetworkSandboxPolicy` | enum | `Restricted` or `Enabled`; `is_enabled()` matches `Enabled`。[E: codex-rs/protocol/src/permissions.rs:71][E: codex-rs/protocol/src/permissions.rs:73][E: codex-rs/protocol/src/permissions.rs:74][E: codex-rs/protocol/src/permissions.rs:78][E: codex-rs/protocol/src/permissions.rs:79] | `protocol/src/permissions.rs` |
| `FileSystemAccessMode` | enum | `Read`, `Write`, `Deny`; `none` remains a legacy alias for `Deny`。[E: codex-rs/protocol/src/permissions.rs:105][E: codex-rs/protocol/src/permissions.rs:106][E: codex-rs/protocol/src/permissions.rs:107][E: codex-rs/protocol/src/permissions.rs:109][E: codex-rs/protocol/src/permissions.rs:110] | `protocol/src/permissions.rs` |
| `FileSystemSandboxPolicy` | struct | `kind`, optional `glob_scan_max_depth`, and `entries`。[E: codex-rs/protocol/src/permissions.rs:226][E: codex-rs/protocol/src/permissions.rs:227][E: codex-rs/protocol/src/permissions.rs:228][E: codex-rs/protocol/src/permissions.rs:229] | `protocol/src/permissions.rs` |
| `Feature` / `FEATURES` | enum/registry | feature enum includes active flags plus removed compatibility flags；当前 registry 共 133 条 `FeatureSpec`，`UnifiedExec` 默认全平台 `true`。[E: codex-rs/features/src/lib.rs:92][E: codex-rs/features/src/lib.rs:869][E: codex-rs/features/src/lib.rs:908][E: codex-rs/features/src/lib.rs:911] | `features/src/lib.rs` |

## Provider / auth

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `ModelProvider` | trait | provider metadata/capabilities/preferred review+memory models/attestation/auth manager/auth/account state/API provider/runtime URL/API auth。[E: codex-rs/model-provider/src/provider.rs:148][E: codex-rs/model-provider/src/provider.rs:150][E: codex-rs/model-provider/src/provider.rs:153][E: codex-rs/model-provider/src/provider.rs:160][E: codex-rs/model-provider/src/provider.rs:167][E: codex-rs/model-provider/src/provider.rs:179] | `model-provider/src/provider.rs` |
| `CodexAuth` | enum | `ApiKey`, `Chatgpt`, `ChatgptAuthTokens`, `Headers`, `AgentIdentity`, `PersonalAccessToken`, `BedrockApiKey`, `BedrockAccessKeys`。[E: codex-rs/login/src/auth/manager.rs:77][E: codex-rs/login/src/auth/manager.rs:78][E: codex-rs/login/src/auth/manager.rs:79][E: codex-rs/login/src/auth/manager.rs:80][E: codex-rs/login/src/auth/manager.rs:81][E: codex-rs/login/src/auth/manager.rs:82][E: codex-rs/login/src/auth/manager.rs:83][E: codex-rs/login/src/auth/manager.rs:84][E: codex-rs/login/src/auth/manager.rs:85] | `login/src/auth/manager.rs` |
| `AuthManager` | struct | auth home, cached auth lock, change notifier, env API key flag, credential store mode, keyring backend kind, forced workspace id, ChatGPT base URL, refresh lock, agent-identity lock。[E: codex-rs/login/src/auth/manager.rs:2033][E: codex-rs/login/src/auth/manager.rs:2034][E: codex-rs/login/src/auth/manager.rs:2035][E: codex-rs/login/src/auth/manager.rs:2036][E: codex-rs/login/src/auth/manager.rs:2037][E: codex-rs/login/src/auth/manager.rs:2038][E: codex-rs/login/src/auth/manager.rs:2039][E: codex-rs/login/src/auth/manager.rs:2041][E: codex-rs/login/src/auth/manager.rs:2043][E: codex-rs/login/src/auth/manager.rs:2045] | `login/src/auth/manager.rs` |

## Gotchas

- The deleted registry-plan structs and old handler-kind enum are not current key types for core routing；runtime registration 现在以 `ToolExecutor` / `CoreToolRuntime` / ordered `ToolRegistry` 为中心，由 `core/src/tools/spec_plan.rs` 组装并 finalize 成 `ToolRouter`。[E: codex-rs/tools/src/tool_executor.rs:106][E: codex-rs/core/src/tools/registry.rs:57][E: codex-rs/core/src/tools/registry.rs:285][E: codex-rs/core/src/tools/spec_plan.rs:124][E: codex-rs/core/src/tools/spec_plan.rs:363]
- `ApprovalsReviewer`'s current non-user variant is `AutoReview`; `guardian_subagent` is a serde alias, not the variant name.[E: codex-rs/protocol/src/config_types.rs:187][E: codex-rs/protocol/src/config_types.rs:189]
- Removed compatibility feature flags such as `GhostCommit`/`JsRepl` may still parse old config keys, but their registry stage is `Removed`.[E: codex-rs/features/src/lib.rs:878][E: codex-rs/features/src/lib.rs:880][E: codex-rs/features/src/lib.rs:956]

## Sources

- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/turn_context.rs`
- `codex-rs/core/src/codex_thread.rs`
- `codex-rs/core/src/client.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/core/src/state/turn.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_payload.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/permissions.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/model-provider/src/provider.rs`
- `codex-rs/login/src/auth/manager.rs`

## 相关

- [ref.data-model](data-model.md)
- [ref.session-tasks](session-tasks.md)
- [ref.feature-flags](feature-flags.md)
- [subsys.core.tool-system](../subsystems/core/tool-system.md)
- [subsys.config-auth.config-loading](../subsystems/config-auth/config-loading.md)
