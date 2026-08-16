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
updated: 9ded177ce7
---

> `key-types` 是 Codex Rust workspace 的跨 crate 类型速查，覆盖 session/turn、client/thread manager、tool router/runtime、config/permissions/features、provider/auth 等 agent 读源码时最常遇到的 struct/enum/trait。[I]

## Core session / turn / client

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `SessionIo` | struct | queue/lifecycle endpoints: `tx_sub`, `rx_event`, agent-status receiver, shared session-loop termination future；runtime state 不再混在 queue handle 中。[E: codex-rs/core/src/session/mod.rs:392][E: codex-rs/core/src/session/mod.rs:399] | `core/src/session/mod.rs` |
| `Session` / `SessionSpawnArgs` | struct | `Session::spawn(args)` 返回 `(Arc<Session>, SessionIo)`；`Session` 持 state/services，spawn args 汇集 config、history、provider/services 与 thread-store inputs。[E: codex-rs/core/src/session/mod.rs:419][E: codex-rs/core/src/session/mod.rs:488][E: codex-rs/core/src/session/mod.rs:490][E: codex-rs/core/src/session/mod.rs:514] | `core/src/session/mod.rs` |
| `CodexThread` | struct | public thread conduit，组合 `Arc<Session>` 与 `SessionIo`；submit/next_event 代理到 `io`，thread-specific reads/control 代理到 session。[E: codex-rs/core/src/codex_thread.rs:183][E: codex-rs/core/src/codex_thread.rs:184][E: codex-rs/core/src/codex_thread.rs:185][E: codex-rs/core/src/codex_thread.rs:226][E: codex-rs/core/src/codex_thread.rs:476] | `core/src/codex_thread.rs` |
| `TurnContext` | struct | single-turn context: sub/trace id、realtime/code-mode state、config/auth/model/provider/telemetry、session source/history/parent thread、environment/cwd、instructions、collaboration/personality、permission/network/sandbox、dynamic tools、metadata/extension/timing state。[E: codex-rs/core/src/session/turn_context.rs:99][E: codex-rs/core/src/session/turn_context.rs:100][E: codex-rs/core/src/session/turn_context.rs:103][E: codex-rs/core/src/session/turn_context.rs:104][E: codex-rs/core/src/session/turn_context.rs:111][E: codex-rs/core/src/session/turn_context.rs:111][E: codex-rs/core/src/session/turn_context.rs:115][E: codex-rs/core/src/session/turn_context.rs:124][E: codex-rs/core/src/session/turn_context.rs:127][E: codex-rs/core/src/session/turn_context.rs:130][E: codex-rs/core/src/session/turn_context.rs:130][E: codex-rs/core/src/session/turn_context.rs:136][E: codex-rs/core/src/session/turn_context.rs:137][E: codex-rs/core/src/session/turn_context.rs:138][E: codex-rs/core/src/session/turn_context.rs:139] | `core/src/session/turn_context.rs` |
| `ModelClient` | struct | session-scoped API client; comments say it shares auth/provider/thread id/transport fallback across turns while turn-scoped settings are passed explicitly。[E: codex-rs/core/src/client.rs:253][E: codex-rs/core/src/client.rs:255] | `core/src/client.rs` [I] |
| `ModelClientSession` | struct | turn-scoped streaming session; comment says create a fresh session for each Codex turn to avoid replaying sticky-routing token across turns。[E: codex-rs/core/src/client.rs:274][E: codex-rs/core/src/client.rs:274] | `core/src/client.rs` [I] |
| `ThreadManager` | struct | `state: Arc<ThreadManagerState>` plus test guard; `StartThreadOptions` carries config, initial history, source, dynamic tools, metrics and parent trace inputs。[E: codex-rs/core/src/thread_manager.rs:196][E: codex-rs/core/src/thread_manager.rs:197][E: codex-rs/core/src/thread_manager.rs:201][E: codex-rs/core/src/thread_manager.rs:204][E: codex-rs/core/src/thread_manager.rs:205][E: codex-rs/core/src/thread_manager.rs:205][E: codex-rs/core/src/thread_manager.rs:209][E: codex-rs/core/src/thread_manager.rs:210][E: codex-rs/core/src/thread_manager.rs:211] | `core/src/thread_manager.rs` |

## Turn state / tasks

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `ActiveTurn` | struct | `task: Option<RunningTask>`, `turn_state`; current active turn has one task slot plus shared mutable state。[E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:33] | `core/src/state/turn.rs` |
| `TaskKind` | enum | `Regular`, `Review`, `Compact`。[E: codex-rs/core/src/state/turn.rs:67][E: codex-rs/core/src/state/turn.rs:67][E: codex-rs/core/src/state/turn.rs:68][E: codex-rs/core/src/state/turn.rs:69][E: codex-rs/core/src/state/turn.rs:70] | `core/src/state/turn.rs` |
| `RunningTask` | struct | `done`, `kind`, erased task, cancellation token, abort-on-drop handle, turn context, agent execution guard 与 turn-duration timer。[E: codex-rs/core/src/state/turn.rs:71][E: codex-rs/core/src/state/turn.rs:74][E: codex-rs/core/src/state/turn.rs:75][E: codex-rs/core/src/state/turn.rs:76][E: codex-rs/core/src/state/turn.rs:77][E: codex-rs/core/src/state/turn.rs:78][E: codex-rs/core/src/state/turn.rs:79][E: codex-rs/core/src/state/turn.rs:80][E: codex-rs/core/src/state/turn.rs:82] | `core/src/state/turn.rs` |
| `TurnState` | struct | pending approval/request/user-input/elicitation/dynamic-tool responders, pending input, mailbox phase, permissions, strict review state, tool calls, memory citation flag and token usage snapshot。[E: codex-rs/core/src/state/turn.rs:88][E: codex-rs/core/src/state/turn.rs:88][E: codex-rs/core/src/state/turn.rs:88][E: codex-rs/core/src/state/turn.rs:89][E: codex-rs/core/src/state/turn.rs:90][E: codex-rs/core/src/state/turn.rs:91][E: codex-rs/core/src/state/turn.rs:93][E: codex-rs/core/src/state/turn.rs:94][E: codex-rs/core/src/state/turn.rs:95][E: codex-rs/core/src/state/turn.rs:96][E: codex-rs/core/src/state/turn.rs:97][E: codex-rs/core/src/state/turn.rs:98][E: codex-rs/core/src/state/turn.rs:99][E: codex-rs/core/src/state/turn.rs:100] | `core/src/state/turn.rs` |

## Tool system types

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `ToolSpec` | enum | Responses API tool spec union: `Function`, `Namespace`, `ToolSearch`, `WebSearch`, `Freeform`；hosted image generation 已不在该 enum。[E: codex-rs/tools/src/tool_spec.rs:20][E: codex-rs/tools/src/tool_spec.rs:21][E: codex-rs/tools/src/tool_spec.rs:23][E: codex-rs/tools/src/tool_spec.rs:25][E: codex-rs/tools/src/tool_spec.rs:39][E: codex-rs/tools/src/tool_spec.rs:52] | `tools/src/tool_spec.rs` |
| `ToolPayload` | enum | canonical runtime payloads: `Function`, `ToolSearch`, `Custom`。[E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:8][E: codex-rs/tools/src/tool_payload.rs:9][E: codex-rs/tools/src/tool_payload.rs:10] | `tools/src/tool_payload.rs` |
| `ToolExposure` | enum | `Direct`, `Deferred`, `DirectModelOnly`, `Hidden`; controls whether a runtime is initially model-visible, discoverable, model-only, or dispatch-only。[E: codex-rs/tools/src/tool_executor.rs:16][E: codex-rs/tools/src/tool_executor.rs:16][E: codex-rs/tools/src/tool_executor.rs:21][E: codex-rs/tools/src/tool_executor.rs:27][E: codex-rs/tools/src/tool_executor.rs:32][E: codex-rs/tools/src/tool_executor.rs:35] | `tools/src/tool_executor.rs` |
| `ToolExecutor` | trait | runtime contract binding `tool_name`, `spec`, `exposure`, `search_info`, `supports_parallel_tool_calls`, `handle`。[E: codex-rs/tools/src/tool_executor.rs:56][E: codex-rs/tools/src/tool_executor.rs:56][E: codex-rs/tools/src/tool_executor.rs:62][E: codex-rs/tools/src/tool_executor.rs:62][E: codex-rs/tools/src/tool_executor.rs:66][E: codex-rs/tools/src/tool_executor.rs:72][E: codex-rs/tools/src/tool_executor.rs:72][E: codex-rs/tools/src/tool_executor.rs:76] | `tools/src/tool_executor.rs` |
| `CoreToolRuntime` | trait | core extension over `ToolExecutor<ToolInvocation>`：新增 exact-tool readiness wait，并继续承载 kind matching、runtime cancellation、同步 telemetry tags、hook payload/input rewrite 与 diff consumer。[E: codex-rs/core/src/tools/registry.rs:53][E: codex-rs/core/src/tools/registry.rs:55][E: codex-rs/core/src/tools/registry.rs:60][E: codex-rs/core/src/tools/registry.rs:66][E: codex-rs/core/src/tools/registry.rs:71][E: codex-rs/core/src/tools/registry.rs:76][E: codex-rs/core/src/tools/registry.rs:110][E: codex-rs/core/src/tools/registry.rs:124][E: codex-rs/core/src/tools/registry.rs:149] | `core/src/tools/registry.rs` |
| `ToolCall` | struct | routed call identity/payload 由 `tool_name`、`call_id`、`payload` 与 optional `encrypted_function_args` 组成；encrypted args 还用于识别 collaboration plaintext-message path。[E: codex-rs/core/src/tools/router.rs:31][E: codex-rs/core/src/tools/router.rs:33][E: codex-rs/core/src/tools/router.rs:36][E: codex-rs/core/src/tools/router.rs:40][E: codex-rs/core/src/tools/router.rs:49][E: codex-rs/core/src/tools/router.rs:51] | `core/src/tools/router.rs` |
| `ToolRouter` | struct | 组合 ordered runtime registry 与 `model_visible_specs`；production path 由 `spec_plan::build_tool_router`/`finalize_tool_router` 构造，`build_tool_call()` 把 model response item（包括 encrypted function args）映射成 `ToolCall`。[E: codex-rs/core/src/tools/router.rs:68][E: codex-rs/core/src/tools/router.rs:69][E: codex-rs/core/src/tools/router.rs:70][E: codex-rs/core/src/tools/router.rs:99][E: codex-rs/core/src/tools/router.rs:140][E: codex-rs/core/src/tools/router.rs:153][E: codex-rs/core/src/tools/router.rs:159][E: codex-rs/core/src/tools/router.rs:168][E: codex-rs/core/src/tools/spec_plan.rs:114][E: codex-rs/core/src/tools/spec_plan.rs:161][E: codex-rs/core/src/tools/spec_plan.rs:236] | `core/src/tools/router.rs` |
| `RegisteredTool` / `ToolRegistry` | struct | registry 现在用 `IndexMap<ToolName, RegisteredTool>` 同时保存 runtime 与 step-effective exposure，保留插入顺序；trusted duplicate 会 error/panic，external reserved/duplicate name 则 fail closed 并返回 `false`。[E: codex-rs/core/src/tools/registry.rs:245][E: codex-rs/core/src/tools/registry.rs:245][E: codex-rs/core/src/tools/registry.rs:248][E: codex-rs/core/src/tools/registry.rs:254][E: codex-rs/core/src/tools/registry.rs:254][E: codex-rs/core/src/tools/registry.rs:289][E: codex-rs/core/src/tools/registry.rs:294][E: codex-rs/core/src/tools/registry.rs:298][E: codex-rs/core/src/tools/registry.rs:318][E: codex-rs/core/src/tools/registry.rs:327][E: codex-rs/core/src/tools/registry.rs:332][E: codex-rs/core/src/tools/registry.rs:343] | `core/src/tools/registry.rs` |

## Config / permissions / features

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `Config` | struct | merged runtime config: provenance/warnings/model/service/review/context/auto-compact/provider/personality/permissions and many more fields beyond the initial block。[E: codex-rs/core/src/config/mod.rs:609] | `core/src/config/mod.rs` |
| `ConfigBuilder` | struct | `codex_home`, CLI/harness/loader overrides, strict mode, cloud config bundle, thread config loader and fallback cwd。[E: codex-rs/core/src/config/mod.rs:1338][E: codex-rs/core/src/config/mod.rs:1338][E: codex-rs/core/src/config/mod.rs:1338][E: codex-rs/core/src/config/mod.rs:1341][E: codex-rs/core/src/config/mod.rs:1342][E: codex-rs/core/src/config/mod.rs:1343][E: codex-rs/core/src/config/mod.rs:1343][E: codex-rs/core/src/config/mod.rs:1343][E: codex-rs/core/src/config/mod.rs:1346] | `core/src/config/mod.rs` |
| `SandboxMode` | enum | `read-only`, `workspace-write`, `danger-full-access`; default is `ReadOnly`。[E: codex-rs/protocol/src/config_types.rs:86][E: codex-rs/protocol/src/config_types.rs:87][E: codex-rs/protocol/src/config_types.rs:88][E: codex-rs/protocol/src/config_types.rs:91][E: codex-rs/protocol/src/config_types.rs:94] | `protocol/src/config_types.rs` |
| `ApprovalsReviewer` | enum | `User` or `AutoReview`; serde accepts `auto_review` and aliases `guardian_subagent` to `AutoReview`。[E: codex-rs/protocol/src/config_types.rs:165][E: codex-rs/protocol/src/config_types.rs:166][E: codex-rs/protocol/src/config_types.rs:168][E: codex-rs/protocol/src/config_types.rs:169][E: codex-rs/protocol/src/config_types.rs:171] | `protocol/src/config_types.rs` |
| `NetworkSandboxPolicy` | enum | `Restricted` or `Enabled`; `is_enabled()` matches `Enabled`。[E: codex-rs/protocol/src/permissions.rs:78][E: codex-rs/protocol/src/permissions.rs:80][E: codex-rs/protocol/src/permissions.rs:81][E: codex-rs/protocol/src/permissions.rs:84][E: codex-rs/protocol/src/permissions.rs:85] | `protocol/src/permissions.rs` |
| `FileSystemAccessMode` | enum | `Read`, `Write`, `Deny`; `none` remains a legacy alias for `Deny`。[E: codex-rs/protocol/src/permissions.rs:112][E: codex-rs/protocol/src/permissions.rs:113][E: codex-rs/protocol/src/permissions.rs:114][E: codex-rs/protocol/src/permissions.rs:117] | `protocol/src/permissions.rs` |
| `FileSystemSandboxPolicy` | struct | `kind`, optional `glob_scan_max_depth`, and `entries`。[E: codex-rs/protocol/src/permissions.rs:223][E: codex-rs/protocol/src/permissions.rs:224][E: codex-rs/protocol/src/permissions.rs:227][E: codex-rs/protocol/src/permissions.rs:229] | `protocol/src/permissions.rs` |
| `Feature` / `FEATURES` | enum/registry | feature enum includes active flags plus removed compatibility flags；当前 registry 共 114 条 `FeatureSpec`，`UnifiedExec` 默认全平台 `true`。[E: codex-rs/features/src/lib.rs:89][E: codex-rs/features/src/lib.rs:811][E: codex-rs/features/src/lib.rs:838][E: codex-rs/features/src/lib.rs:841][E: codex-rs/features/src/lib.rs:1510][I] | `features/src/lib.rs` |

## Provider / auth

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `ModelProvider` | trait | provider metadata/capabilities/preferred review+memory models/attestation/auth manager/auth/account state/API provider/runtime URL/API auth。[E: codex-rs/model-provider/src/provider.rs:103][E: codex-rs/model-provider/src/provider.rs:103][E: codex-rs/model-provider/src/provider.rs:105][E: codex-rs/model-provider/src/provider.rs:113][E: codex-rs/model-provider/src/provider.rs:120][E: codex-rs/model-provider/src/provider.rs:126][E: codex-rs/model-provider/src/provider.rs:132][E: codex-rs/model-provider/src/provider.rs:140][E: codex-rs/model-provider/src/provider.rs:146][E: codex-rs/model-provider/src/provider.rs:147][E: codex-rs/model-provider/src/provider.rs:161][E: codex-rs/model-provider/src/provider.rs:167][E: codex-rs/model-provider/src/provider.rs:171] | `model-provider/src/provider.rs` |
| `CodexAuth` | enum | `ApiKey`, `Chatgpt`, `ChatgptAuthTokens`, `Headers`, `AgentIdentity`, `PersonalAccessToken`, `BedrockApiKey`。[E: codex-rs/login/src/auth/manager.rs:75][E: codex-rs/login/src/auth/manager.rs:75][E: codex-rs/login/src/auth/manager.rs:76][E: codex-rs/login/src/auth/manager.rs:77][E: codex-rs/login/src/auth/manager.rs:78][E: codex-rs/login/src/auth/manager.rs:79][E: codex-rs/login/src/auth/manager.rs:80] | `login/src/auth/manager.rs` |
| `AuthManager` | struct | auth home, cached auth lock, change notifier, env API key flag, credential store mode, keyring backend kind, forced workspace id, ChatGPT base URL, refresh lock, external auth。[E: codex-rs/login/src/auth/manager.rs:1768][E: codex-rs/login/src/auth/manager.rs:1770][E: codex-rs/login/src/auth/manager.rs:1770][E: codex-rs/login/src/auth/manager.rs:1770][E: codex-rs/login/src/auth/manager.rs:1770][E: codex-rs/login/src/auth/manager.rs:1774][E: codex-rs/login/src/auth/manager.rs:1775][E: codex-rs/login/src/auth/manager.rs:1776][E: codex-rs/login/src/auth/manager.rs:1778][E: codex-rs/login/src/auth/manager.rs:1783] | `login/src/auth/manager.rs` |

## Gotchas

- The deleted registry-plan structs and old handler-kind enum are not current key types for core routing；runtime registration 现在以 `ToolExecutor` / `CoreToolRuntime` / ordered `ToolRegistry` 为中心，由 `core/src/tools/spec_plan.rs` 组装并 finalize 成 `ToolRouter`。[E: codex-rs/tools/src/tool_executor.rs:56][E: codex-rs/core/src/tools/registry.rs:53][E: codex-rs/core/src/tools/registry.rs:254][E: codex-rs/core/src/tools/spec_plan.rs:114][E: codex-rs/core/src/tools/spec_plan.rs:161][E: codex-rs/core/src/tools/spec_plan.rs:236]
- `ApprovalsReviewer`'s current non-user variant is `AutoReview`; `guardian_subagent` is a serde alias, not the variant name.[E: codex-rs/protocol/src/config_types.rs:169][E: codex-rs/protocol/src/config_types.rs:171]
- Removed compatibility feature flags such as `GhostCommit`/`JsRepl` may still parse old config keys, but their registry stage is `Removed`.[E: codex-rs/features/src/lib.rs:816][E: codex-rs/features/src/lib.rs:869]

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
