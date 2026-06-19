---
id: ref.key-types
title: Codex key types 跨 crate 索引
kind: reference
tier: T3
source: [codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/core/src/client.rs, codex-rs/core/src/thread_manager.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/config/mod.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_payload.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/permissions.rs, codex-rs/features/src/lib.rs, codex-rs/model-provider/src/provider.rs, codex-rs/login/src/auth/manager.rs]
symbols: [Codex, CodexSpawnOk, TurnContext, ModelClient, ModelClientSession, ThreadManager, ActiveTurn, RunningTask, TurnState, ToolRouter, ToolRegistry, CoreToolRuntime, ToolExecutor, ToolExposure, ToolSpec, ToolPayload, Config, ConfigBuilder, SandboxMode, ApprovalsReviewer, NetworkSandboxPolicy, FileSystemSandboxPolicy, Feature, Features, ModelProvider, CodexAuth, AuthManager]
related: [ref.data-model, ref.session-tasks, ref.feature-flags, subsys.core.tool-system, subsys.config-auth.config-loading]
evidence: explicit
status: verified
updated: 5670360009
---

> `key-types` 是 Codex Rust workspace 的跨 crate 类型速查，覆盖 session/turn、client/thread manager、tool router/runtime、config/permissions/features、provider/auth 等 agent 读源码时最常遇到的 struct/enum/trait。[I]

## Core session / turn / client

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `Codex` | struct | `tx_sub`, `rx_event`, `agent_status`, `session`, `session_loop_termination`；这是 submission/event queue pair 的 high-level handle。[E: codex-rs/core/src/session/mod.rs:385][E: codex-rs/core/src/session/mod.rs:386][E: codex-rs/core/src/session/mod.rs:387][E: codex-rs/core/src/session/mod.rs:389][E: codex-rs/core/src/session/mod.rs:390][E: codex-rs/core/src/session/mod.rs:393] | `core/src/session/mod.rs` |
| `CodexSpawnOk` | struct | `codex`, `thread_id`; comment says it wraps spawned Codex and unique session id。[E: codex-rs/core/src/session/mod.rs:398][E: codex-rs/core/src/session/mod.rs:400][E: codex-rs/core/src/session/mod.rs:401][E: codex-rs/core/src/session/mod.rs:402] | `core/src/session/mod.rs` |
| `TurnContext` | struct | single-turn context: sub id, trace id, realtime flag, config/auth/model/provider/telemetry, session source, environments, deprecated cwd, instructions, collaboration/personality, approval/profile/network/sandbox, models, unified exec, dynamic tools, metadata/extension/skills/timing state。[E: codex-rs/core/src/session/turn_context.rs:103][E: codex-rs/core/src/session/turn_context.rs:103][E: codex-rs/core/src/session/turn_context.rs:104][E: codex-rs/core/src/session/turn_context.rs:106][E: codex-rs/core/src/session/turn_context.rs:107][E: codex-rs/core/src/session/turn_context.rs:108][E: codex-rs/core/src/session/turn_context.rs:109][E: codex-rs/core/src/session/turn_context.rs:111][E: codex-rs/core/src/session/turn_context.rs:114][E: codex-rs/core/src/session/turn_context.rs:116][E: codex-rs/core/src/session/turn_context.rs:117][E: codex-rs/core/src/session/turn_context.rs:125][E: codex-rs/core/src/session/turn_context.rs:127][E: codex-rs/core/src/session/turn_context.rs:129][E: codex-rs/core/src/session/turn_context.rs:130][E: codex-rs/core/src/session/turn_context.rs:131][E: codex-rs/core/src/session/turn_context.rs:132][E: codex-rs/core/src/session/turn_context.rs:133][E: codex-rs/core/src/session/turn_context.rs:134][E: codex-rs/core/src/session/turn_context.rs:135][E: codex-rs/core/src/session/turn_context.rs:137][E: codex-rs/core/src/session/turn_context.rs:138][E: codex-rs/core/src/session/turn_context.rs:139][E: codex-rs/core/src/session/turn_context.rs:140][E: codex-rs/core/src/session/turn_context.rs:141] | `core/src/session/turn_context.rs` |
| `ModelClient` | struct | session-scoped API client; comments say it shares auth/provider/thread id/transport fallback across turns while turn-scoped settings are passed explicitly。[E: codex-rs/core/src/client.rs:208][E: codex-rs/core/src/client.rs:210][E: codex-rs/core/src/client.rs:213][E: codex-rs/core/src/client.rs:216][E: codex-rs/core/src/client.rs:220][E: codex-rs/core/src/client.rs:221] | `core/src/client.rs` |
| `ModelClientSession` | struct | turn-scoped streaming session; comment says create a fresh session for each Codex turn to avoid replaying sticky-routing token across turns。[E: codex-rs/core/src/client.rs:225][E: codex-rs/core/src/client.rs:227][E: codex-rs/core/src/client.rs:232][E: codex-rs/core/src/client.rs:235][E: codex-rs/core/src/client.rs:238][E: codex-rs/core/src/client.rs:239][E: codex-rs/core/src/client.rs:240][E: codex-rs/core/src/client.rs:251] | `core/src/client.rs` |
| `ThreadManager` | struct | `state: Arc<ThreadManagerState>` plus test guard; `StartThreadOptions` carries config, initial history, source, dynamic tools, metrics and parent trace inputs。[E: codex-rs/core/src/thread_manager.rs:174][E: codex-rs/core/src/thread_manager.rs:175][E: codex-rs/core/src/thread_manager.rs:176][E: codex-rs/core/src/thread_manager.rs:179][E: codex-rs/core/src/thread_manager.rs:180][E: codex-rs/core/src/thread_manager.rs:181][E: codex-rs/core/src/thread_manager.rs:182][E: codex-rs/core/src/thread_manager.rs:184][E: codex-rs/core/src/thread_manager.rs:185][E: codex-rs/core/src/thread_manager.rs:186] | `core/src/thread_manager.rs` |

## Turn state / tasks

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `ActiveTurn` | struct | `task: Option<RunningTask>`, `turn_state`; current active turn has one task slot plus shared mutable state。[E: codex-rs/core/src/state/turn.rs:30][E: codex-rs/core/src/state/turn.rs:31][E: codex-rs/core/src/state/turn.rs:32] | `core/src/state/turn.rs` |
| `TaskKind` | enum | `Regular`, `Review`, `Compact`。[E: codex-rs/core/src/state/turn.rs:66][E: codex-rs/core/src/state/turn.rs:66][E: codex-rs/core/src/state/turn.rs:67][E: codex-rs/core/src/state/turn.rs:68][E: codex-rs/core/src/state/turn.rs:69] | `core/src/state/turn.rs` |
| `RunningTask` | struct | `done`, `kind`, erased task, cancellation token, handle, turn context, extension data, agent execution guard, timer。[E: codex-rs/core/src/state/turn.rs:72][E: codex-rs/core/src/state/turn.rs:73][E: codex-rs/core/src/state/turn.rs:74][E: codex-rs/core/src/state/turn.rs:75][E: codex-rs/core/src/state/turn.rs:76][E: codex-rs/core/src/state/turn.rs:77][E: codex-rs/core/src/state/turn.rs:78][E: codex-rs/core/src/state/turn.rs:79][E: codex-rs/core/src/state/turn.rs:80][E: codex-rs/core/src/state/turn.rs:82] | `core/src/state/turn.rs` |
| `TurnState` | struct | pending approval/request/user-input/elicitation/dynamic-tool responders, pending input, mailbox phase, permissions, strict review state, tool calls, memory citation flag and token usage snapshot。[E: codex-rs/core/src/state/turn.rs:87][E: codex-rs/core/src/state/turn.rs:87][E: codex-rs/core/src/state/turn.rs:88][E: codex-rs/core/src/state/turn.rs:89][E: codex-rs/core/src/state/turn.rs:90][E: codex-rs/core/src/state/turn.rs:91][E: codex-rs/core/src/state/turn.rs:92][E: codex-rs/core/src/state/turn.rs:93][E: codex-rs/core/src/state/turn.rs:94][E: codex-rs/core/src/state/turn.rs:95][E: codex-rs/core/src/state/turn.rs:96][E: codex-rs/core/src/state/turn.rs:97][E: codex-rs/core/src/state/turn.rs:98][E: codex-rs/core/src/state/turn.rs:99] | `core/src/state/turn.rs` |

## Tool system types

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `ToolSpec` | enum | Responses API tool spec union: `Function`, `Namespace`, `ToolSearch`, `ImageGeneration`, `WebSearch`, `Freeform`。[E: codex-rs/tools/src/tool_spec.rs:17][E: codex-rs/tools/src/tool_spec.rs:17][E: codex-rs/tools/src/tool_spec.rs:18][E: codex-rs/tools/src/tool_spec.rs:20][E: codex-rs/tools/src/tool_spec.rs:22][E: codex-rs/tools/src/tool_spec.rs:28][E: codex-rs/tools/src/tool_spec.rs:36][E: codex-rs/tools/src/tool_spec.rs:49] | `tools/src/tool_spec.rs` |
| `ToolPayload` | enum | canonical runtime payloads: `Function`, `ToolSearch`, `Custom`。[E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:8][E: codex-rs/tools/src/tool_payload.rs:9][E: codex-rs/tools/src/tool_payload.rs:10] | `tools/src/tool_payload.rs` |
| `ToolExposure` | enum | `Direct`, `Deferred`, `DirectModelOnly`, `Hidden`; controls whether a runtime is initially model-visible, discoverable, model-only, or dispatch-only。[E: codex-rs/tools/src/tool_executor.rs:15][E: codex-rs/tools/src/tool_executor.rs:15][E: codex-rs/tools/src/tool_executor.rs:20][E: codex-rs/tools/src/tool_executor.rs:26][E: codex-rs/tools/src/tool_executor.rs:32][E: codex-rs/tools/src/tool_executor.rs:35] | `tools/src/tool_executor.rs` |
| `ToolExecutor` | trait | runtime contract binding `tool_name`, `spec`, `exposure`, `search_info`, `supports_parallel_tool_calls`, `handle`。[E: codex-rs/tools/src/tool_executor.rs:49][E: codex-rs/tools/src/tool_executor.rs:49][E: codex-rs/tools/src/tool_executor.rs:51][E: codex-rs/tools/src/tool_executor.rs:53][E: codex-rs/tools/src/tool_executor.rs:55][E: codex-rs/tools/src/tool_executor.rs:59][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:68] | `tools/src/tool_executor.rs` |
| `CoreToolRuntime` | trait | core extension over `ToolExecutor<ToolInvocation>`: kind matching, runtime cancellation, telemetry, hook payloads, hook input rewrite, diff consumer。[E: codex-rs/core/src/tools/registry.rs:48][E: codex-rs/core/src/tools/registry.rs:48][E: codex-rs/core/src/tools/registry.rs:49][E: codex-rs/core/src/tools/registry.rs:58][E: codex-rs/core/src/tools/registry.rs:62][E: codex-rs/core/src/tools/registry.rs:69][E: codex-rs/core/src/tools/registry.rs:103][E: codex-rs/core/src/tools/registry.rs:118][E: codex-rs/core/src/tools/registry.rs:142] | `core/src/tools/registry.rs` |
| `ToolRouter` | struct | `registry`, `model_visible_specs`; `from_turn_context()` delegates to `build_tool_router()`, `build_tool_call()` maps model response items into `ToolCall`。[E: codex-rs/core/src/tools/router.rs:35][E: codex-rs/core/src/tools/router.rs:36][E: codex-rs/core/src/tools/router.rs:37][E: codex-rs/core/src/tools/router.rs:60][E: codex-rs/core/src/tools/router.rs:66][E: codex-rs/core/src/tools/router.rs:76][E: codex-rs/core/src/tools/router.rs:113] | `core/src/tools/router.rs` |
| `ToolRegistry` | struct | map from `ToolName` to `Arc<dyn CoreToolRuntime>`; exposes diff consumer, parallel support and runtime-cancellation queries。[E: codex-rs/core/src/tools/registry.rs:322][E: codex-rs/core/src/tools/registry.rs:323][E: codex-rs/core/src/tools/registry.rs:332][E: codex-rs/core/src/tools/registry.rs:375][E: codex-rs/core/src/tools/registry.rs:382][E: codex-rs/core/src/tools/registry.rs:387] | `core/src/tools/registry.rs` |

## Config / permissions / features

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `Config` | struct | merged runtime config: provenance/warnings/model/service/review/context/auto-compact/provider/personality/permissions and many more fields beyond the initial block。[E: codex-rs/core/src/config/mod.rs:603][E: codex-rs/core/src/config/mod.rs:604][E: codex-rs/core/src/config/mod.rs:608][E: codex-rs/core/src/config/mod.rs:611][E: codex-rs/core/src/config/mod.rs:614][E: codex-rs/core/src/config/mod.rs:618][E: codex-rs/core/src/config/mod.rs:621][E: codex-rs/core/src/config/mod.rs:624][E: codex-rs/core/src/config/mod.rs:631][E: codex-rs/core/src/config/mod.rs:634][E: codex-rs/core/src/config/mod.rs:637][E: codex-rs/core/src/config/mod.rs:640] | `core/src/config/mod.rs` |
| `ConfigBuilder` | struct | `codex_home`, CLI/harness/loader overrides, strict mode, cloud config bundle, thread config loader and fallback cwd。[E: codex-rs/core/src/config/mod.rs:1164][E: codex-rs/core/src/config/mod.rs:1164][E: codex-rs/core/src/config/mod.rs:1165][E: codex-rs/core/src/config/mod.rs:1166][E: codex-rs/core/src/config/mod.rs:1167][E: codex-rs/core/src/config/mod.rs:1168][E: codex-rs/core/src/config/mod.rs:1169][E: codex-rs/core/src/config/mod.rs:1170][E: codex-rs/core/src/config/mod.rs:1171][E: codex-rs/core/src/config/mod.rs:1172] | `core/src/config/mod.rs` |
| `SandboxMode` | enum | `read-only`, `workspace-write`, `danger-full-access`; default is `ReadOnly`。[E: codex-rs/protocol/src/config_types.rs:86][E: codex-rs/protocol/src/config_types.rs:87][E: codex-rs/protocol/src/config_types.rs:88][E: codex-rs/protocol/src/config_types.rs:91][E: codex-rs/protocol/src/config_types.rs:94] | `protocol/src/config_types.rs` |
| `ApprovalsReviewer` | enum | `User` or `AutoReview`; serde accepts `auto_review` and aliases `guardian_subagent` to `AutoReview`。[E: codex-rs/protocol/src/config_types.rs:165][E: codex-rs/protocol/src/config_types.rs:166][E: codex-rs/protocol/src/config_types.rs:168][E: codex-rs/protocol/src/config_types.rs:169][E: codex-rs/protocol/src/config_types.rs:171] | `protocol/src/config_types.rs` |
| `NetworkSandboxPolicy` | enum | `Restricted` or `Enabled`; `is_enabled()` matches `Enabled`。[E: codex-rs/protocol/src/permissions.rs:84][E: codex-rs/protocol/src/permissions.rs:86][E: codex-rs/protocol/src/permissions.rs:87][E: codex-rs/protocol/src/permissions.rs:90][E: codex-rs/protocol/src/permissions.rs:91] | `protocol/src/permissions.rs` |
| `FileSystemAccessMode` | enum | `Read`, `Write`, `Deny`; `none` remains a legacy alias for `Deny`。[E: codex-rs/protocol/src/permissions.rs:118][E: codex-rs/protocol/src/permissions.rs:119][E: codex-rs/protocol/src/permissions.rs:120][E: codex-rs/protocol/src/permissions.rs:121][E: codex-rs/protocol/src/permissions.rs:123] | `protocol/src/permissions.rs` |
| `FileSystemSandboxPolicy` | struct | `kind`, optional `glob_scan_max_depth`, and `entries`。[E: codex-rs/protocol/src/permissions.rs:218][E: codex-rs/protocol/src/permissions.rs:219][E: codex-rs/protocol/src/permissions.rs:222][E: codex-rs/protocol/src/permissions.rs:224] | `protocol/src/permissions.rs` |
| `Feature` / `FEATURES` | enum/registry | feature enum includes active feature flags plus removed compatibility flags; `FEATURES` maps ids to keys, stages and defaults。[E: codex-rs/features/src/lib.rs:79][E: codex-rs/features/src/lib.rs:79][E: codex-rs/features/src/lib.rs:81][E: codex-rs/features/src/lib.rs:89][E: codex-rs/features/src/lib.rs:221][E: codex-rs/features/src/lib.rs:227][E: codex-rs/features/src/lib.rs:230][E: codex-rs/features/src/lib.rs:233][E: codex-rs/features/src/lib.rs:235][E: codex-rs/features/src/lib.rs:237][E: codex-rs/features/src/lib.rs:757][E: codex-rs/features/src/lib.rs:760][E: codex-rs/features/src/lib.rs:762][E: codex-rs/features/src/lib.rs:802][E: codex-rs/features/src/lib.rs:804] | `features/src/lib.rs` |

## Provider / auth

| Symbol | Kind | 当前字段/方法/变体 | 定义处 |
|---|---|---|---|
| `ModelProvider` | trait | provider metadata/capabilities/preferred review+memory models/attestation/auth manager/auth/account state/API provider/runtime URL/API auth。[E: codex-rs/model-provider/src/provider.rs:99][E: codex-rs/model-provider/src/provider.rs:101][E: codex-rs/model-provider/src/provider.rs:104][E: codex-rs/model-provider/src/provider.rs:111][E: codex-rs/model-provider/src/provider.rs:118][E: codex-rs/model-provider/src/provider.rs:125][E: codex-rs/model-provider/src/provider.rs:130][E: codex-rs/model-provider/src/provider.rs:140][E: codex-rs/model-provider/src/provider.rs:143][E: codex-rs/model-provider/src/provider.rs:146][E: codex-rs/model-provider/src/provider.rs:149][E: codex-rs/model-provider/src/provider.rs:158][E: codex-rs/model-provider/src/provider.rs:165] | `model-provider/src/provider.rs` |
| `CodexAuth` | enum | `ApiKey`, `Chatgpt`, `ChatgptAuthTokens`, `AgentIdentity`, `PersonalAccessToken`, `BedrockApiKey`。[E: codex-rs/login/src/auth/manager.rs:59][E: codex-rs/login/src/auth/manager.rs:60][E: codex-rs/login/src/auth/manager.rs:61][E: codex-rs/login/src/auth/manager.rs:62][E: codex-rs/login/src/auth/manager.rs:63][E: codex-rs/login/src/auth/manager.rs:64][E: codex-rs/login/src/auth/manager.rs:65] | `login/src/auth/manager.rs` |
| `AuthManager` | struct | auth home, cached auth lock, change notifier, env API key flag, credential store mode, keyring backend kind, forced workspace id, ChatGPT base URL, refresh lock, external auth。[E: codex-rs/login/src/auth/manager.rs:1518][E: codex-rs/login/src/auth/manager.rs:1519][E: codex-rs/login/src/auth/manager.rs:1520][E: codex-rs/login/src/auth/manager.rs:1521][E: codex-rs/login/src/auth/manager.rs:1522][E: codex-rs/login/src/auth/manager.rs:1523][E: codex-rs/login/src/auth/manager.rs:1524][E: codex-rs/login/src/auth/manager.rs:1525][E: codex-rs/login/src/auth/manager.rs:1526][E: codex-rs/login/src/auth/manager.rs:1527][E: codex-rs/login/src/auth/manager.rs:1528] | `login/src/auth/manager.rs` |

## Gotchas

- The deleted registry-plan structs and old handler-kind enum are not current key types for core routing; runtime registration is now centered on `ToolExecutor` / `CoreToolRuntime` and built from `core/src/tools/spec_plan.rs`.[E: codex-rs/tools/src/tool_executor.rs:49][E: codex-rs/core/src/tools/registry.rs:48][E: codex-rs/core/src/tools/router.rs:66]
- `ApprovalsReviewer`'s current non-user variant is `AutoReview`; `guardian_subagent` is a serde alias, not the variant name.[E: codex-rs/protocol/src/config_types.rs:169][E: codex-rs/protocol/src/config_types.rs:171]
- Removed compatibility feature flags such as `GhostCommit`/`JsRepl` may still parse old config keys, but their registry stage is `Removed`.[E: codex-rs/features/src/lib.rs:233][E: codex-rs/features/src/lib.rs:235][E: codex-rs/features/src/lib.rs:762][E: codex-rs/features/src/lib.rs:804]

## Sources

- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/turn_context.rs`
- `codex-rs/core/src/client.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/core/src/state/turn.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/registry.rs`
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
