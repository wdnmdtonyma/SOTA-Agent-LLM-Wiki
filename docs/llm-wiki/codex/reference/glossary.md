---
id: ref.glossary
title: Codex 术语表
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/items.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/request_permissions.rs, codex-rs/protocol/src/request_user_input.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/permissions.rs, codex-rs/protocol/src/approvals.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/sandboxing/mod.rs, codex-rs/sandboxing/src/lib.rs, codex-rs/linux-sandbox/README.md, codex-rs/features/src/lib.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_payload.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/rollout/src/recorder.rs, codex-rs/rollout/src/policy.rs, codex-rs/exec-server/src/environment.rs, codex-rs/network-proxy/src/proxy.rs, codex-rs/Cargo.toml, codex-rs/app-server/src/main.rs, codex-rs/tui/src/session_log.rs]
symbols: [Submission, Event, Op, EventMsg, RolloutItem, RolloutLine, SessionTask, TurnContext, ToolSpec, ToolPayload, ToolExecutor, ToolExposure, DynamicToolSpec, GuardianAssessmentEvent, SandboxMode, NetworkSandboxPolicy]
related: [spine.overview, spine.sq-eq-architecture, ref.protocol-op, ref.protocol-event-lifecycle, ref.data-model, ref.key-types]
evidence: explicit
status: verified
updated: 5670360009
---

> 本术语表面向检索型 AI agent：源码中有明确定义的术语用 `[E]` 标注，wiki 组织层面的简称或跨文件归纳用 `[I]` 标注。

## Architecture / protocol

| Term | 中文解释 | Evidence |
|---|---|---|
| SQ / Submission Queue | wiki 对 core 输入队列的简称[I]；源码 `Submission` 注释为 "Submission Queue Entry - requests from user"，字段是 correlation `id`、`op`、client user message id 和 W3C trace carrier。 | [E: codex-rs/protocol/src/protocol.rs:148][E: codex-rs/protocol/src/protocol.rs:150][E: codex-rs/protocol/src/protocol.rs:151][E: codex-rs/protocol/src/protocol.rs:152][E: codex-rs/protocol/src/protocol.rs:154][E: codex-rs/protocol/src/protocol.rs:156][E: codex-rs/protocol/src/protocol.rs:158] |
| EQ / Event Queue | wiki 对 core 输出队列的简称[I]；源码 `Event` 注释为 "Event Queue Entry - events from agent"，字段是 correlated submission id 与 `EventMsg` payload。 | [E: codex-rs/protocol/src/protocol.rs:1203][E: codex-rs/protocol/src/protocol.rs:1205][E: codex-rs/protocol/src/protocol.rs:1206][E: codex-rs/protocol/src/protocol.rs:1207][E: codex-rs/protocol/src/protocol.rs:1209] |
| `Op` | 客户端提交给 core 的 operation enum；current variants start with interrupt/background-terminal/realtime/user-input families and are documented under `Submission.op`。 | [E: codex-rs/protocol/src/protocol.rs:154][E: codex-rs/protocol/src/protocol.rs:506][E: codex-rs/protocol/src/protocol.rs:509][E: codex-rs/protocol/src/protocol.rs:513][E: codex-rs/protocol/src/protocol.rs:516][E: codex-rs/protocol/src/protocol.rs:534] |
| `EventMsg` | agent 发给客户端的 response event tagged enum；serde/TS/strum tag 都使用 snake_case。 | [E: codex-rs/protocol/src/protocol.rs:1212][E: codex-rs/protocol/src/protocol.rs:1214][E: codex-rs/protocol/src/protocol.rs:1215][E: codex-rs/protocol/src/protocol.rs:1216][E: codex-rs/protocol/src/protocol.rs:1217][E: codex-rs/protocol/src/protocol.rs:1218] |
| Turn | wiki 对一次模型/工具工作单元的简称[I]；源码 `TurnContext` 注释为 single turn context，`SessionTask` 注释为驱动 session turn 的 async task。 | [E: codex-rs/core/src/session/turn_context.rs:101][E: codex-rs/core/src/session/turn_context.rs:103][E: codex-rs/core/src/tasks/mod.rs:202][E: codex-rs/core/src/tasks/mod.rs:210] |
| `TurnContext` | 单轮上下文，聚合 sub id、trace id、realtime flag、config/auth/model/provider/telemetry、environment、instructions、collaboration/personality、approval/permission/network/sandbox、dynamic tools 和 extension/timing state。 | [E: codex-rs/core/src/session/turn_context.rs:103][E: codex-rs/core/src/session/turn_context.rs:104][E: codex-rs/core/src/session/turn_context.rs:106][E: codex-rs/core/src/session/turn_context.rs:107][E: codex-rs/core/src/session/turn_context.rs:108][E: codex-rs/core/src/session/turn_context.rs:111][E: codex-rs/core/src/session/turn_context.rs:116][E: codex-rs/core/src/session/turn_context.rs:125][E: codex-rs/core/src/session/turn_context.rs:127][E: codex-rs/core/src/session/turn_context.rs:130][E: codex-rs/core/src/session/turn_context.rs:131][E: codex-rs/core/src/session/turn_context.rs:132][E: codex-rs/core/src/session/turn_context.rs:137][E: codex-rs/core/src/session/turn_context.rs:139][E: codex-rs/core/src/session/turn_context.rs:141] |
| `SessionTask` | core 内部驱动 turn/workflow 的 async trait，要求 `kind`、`span_name`、`run`，并提供 optional `abort`。 | [E: codex-rs/core/src/tasks/mod.rs:202][E: codex-rs/core/src/tasks/mod.rs:210][E: codex-rs/core/src/tasks/mod.rs:213][E: codex-rs/core/src/tasks/mod.rs:216][E: codex-rs/core/src/tasks/mod.rs:226][E: codex-rs/core/src/tasks/mod.rs:239] |

## Persistence / history

| Term | 中文解释 | Evidence |
|---|---|---|
| rollout | Codex 会话 JSONL transcript / replay persistence 的 wiki 术语[I]；recorder 注释说 rollouts are recorded as JSONL，policy 决定哪些 `RolloutItem` 持久化。 | [E: codex-rs/rollout/src/recorder.rs:68][E: codex-rs/rollout/src/policy.rs:10][E: codex-rs/rollout/src/policy.rs:12][E: codex-rs/rollout/src/policy.rs:19] |
| `RolloutItem` | rollout item tagged union，包含 `SessionMeta`、`ResponseItem`、inter-agent communication、compacted item、turn context item 和 event msg。 | [E: codex-rs/protocol/src/protocol.rs:2952][E: codex-rs/protocol/src/protocol.rs:2953][E: codex-rs/protocol/src/protocol.rs:2954][E: codex-rs/protocol/src/protocol.rs:2956][E: codex-rs/protocol/src/protocol.rs:2957][E: codex-rs/protocol/src/protocol.rs:2958][E: codex-rs/protocol/src/protocol.rs:2959] |
| `RolloutLine` | single JSONL line schema: timestamp plus flattened rollout item。 | [E: codex-rs/protocol/src/protocol.rs:3108][E: codex-rs/protocol/src/protocol.rs:3109][E: codex-rs/protocol/src/protocol.rs:3110][E: codex-rs/protocol/src/protocol.rs:3111] |
| `SessionMeta` | session-level rollout metadata；comment notes it does not correspond to a specific turn and includes base instructions rather than old `instructions` field。 | [E: codex-rs/protocol/src/protocol.rs:2871][E: codex-rs/protocol/src/protocol.rs:2873][E: codex-rs/protocol/src/protocol.rs:2877][E: codex-rs/protocol/src/protocol.rs:2878][E: codex-rs/protocol/src/protocol.rs:2884][E: codex-rs/protocol/src/protocol.rs:2885][E: codex-rs/protocol/src/protocol.rs:2888] |
| `ResponseItem` | model/history response item union covering messages, agent messages, reasoning, local shell legacy calls, function/tool-search/custom calls and outputs, web/image calls, compaction/context-compaction, and fallback `Other`。 | [E: codex-rs/protocol/src/models.rs:919][E: codex-rs/protocol/src/models.rs:920][E: codex-rs/protocol/src/models.rs:937][E: codex-rs/protocol/src/models.rs:949][E: codex-rs/protocol/src/models.rs:963][E: codex-rs/protocol/src/models.rs:977][E: codex-rs/protocol/src/models.rs:995][E: codex-rs/protocol/src/models.rs:1029][E: codex-rs/protocol/src/models.rs:1086][E: codex-rs/protocol/src/models.rs:1110][E: codex-rs/protocol/src/models.rs:1125][E: codex-rs/protocol/src/models.rs:1144][E: codex-rs/protocol/src/models.rs:1157] |
| compaction | `ContextCompactedEvent` is an empty event struct; `CompactedItem` stores summary message, optional replacement history and optional window id。 | [E: codex-rs/protocol/src/protocol.rs:1937][E: codex-rs/protocol/src/protocol.rs:1938][E: codex-rs/protocol/src/protocol.rs:2963][E: codex-rs/protocol/src/protocol.rs:2964][E: codex-rs/protocol/src/protocol.rs:2966][E: codex-rs/protocol/src/protocol.rs:2968] |

## Tools / model interaction

| Term | 中文解释 | Evidence |
|---|---|---|
| `ToolSpec` | Responses API model-visible tool spec union：function、namespace、tool_search、image_generation、web_search、custom/freeform。 | [E: codex-rs/tools/src/tool_spec.rs:13][E: codex-rs/tools/src/tool_spec.rs:17][E: codex-rs/tools/src/tool_spec.rs:19][E: codex-rs/tools/src/tool_spec.rs:21][E: codex-rs/tools/src/tool_spec.rs:23][E: codex-rs/tools/src/tool_spec.rs:29][E: codex-rs/tools/src/tool_spec.rs:37][E: codex-rs/tools/src/tool_spec.rs:50] |
| `ToolPayload` | runtime 接收的 canonical payload union：function arguments、tool_search args、custom/freeform input。 | [E: codex-rs/tools/src/tool_payload.rs:5][E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:8][E: codex-rs/tools/src/tool_payload.rs:9][E: codex-rs/tools/src/tool_payload.rs:10] |
| `ToolExecutor` | executable runtime contract：tool name, spec, exposure, search info, parallel support, handle。 | [E: codex-rs/tools/src/tool_executor.rs:44][E: codex-rs/tools/src/tool_executor.rs:49][E: codex-rs/tools/src/tool_executor.rs:51][E: codex-rs/tools/src/tool_executor.rs:53][E: codex-rs/tools/src/tool_executor.rs:55][E: codex-rs/tools/src/tool_executor.rs:59][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:68] |
| `ToolExposure` | tool runtime exposure mode：direct、deferred、direct-model-only、hidden。 | [E: codex-rs/tools/src/tool_executor.rs:13][E: codex-rs/tools/src/tool_executor.rs:15][E: codex-rs/tools/src/tool_executor.rs:20][E: codex-rs/tools/src/tool_executor.rs:26][E: codex-rs/tools/src/tool_executor.rs:32][E: codex-rs/tools/src/tool_executor.rs:35] |
| dynamic tool | runtime-provided tool spec; `DynamicToolSpec` can be `Function` or `Namespace`, with function name/description/input schema/defer-loading fields and namespace name/description/tools fields。 | [E: codex-rs/protocol/src/dynamic_tools.rs:10][E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/dynamic_tools.rs:14][E: codex-rs/protocol/src/dynamic_tools.rs:15][E: codex-rs/protocol/src/dynamic_tools.rs:21][E: codex-rs/protocol/src/dynamic_tools.rs:22][E: codex-rs/protocol/src/dynamic_tools.rs:23][E: codex-rs/protocol/src/dynamic_tools.rs:24][E: codex-rs/protocol/src/dynamic_tools.rs:26][E: codex-rs/protocol/src/dynamic_tools.rs:32][E: codex-rs/protocol/src/dynamic_tools.rs:33][E: codex-rs/protocol/src/dynamic_tools.rs:35] |
| request permissions | `RequestPermissionsArgs` carries optional environment id, optional reason, and requested permission profile。 | [E: codex-rs/protocol/src/request_permissions.rs:49][E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_permissions.rs:58][E: codex-rs/protocol/src/request_permissions.rs:60][E: codex-rs/protocol/src/request_permissions.rs:61] |
| request user input | `RequestUserInputArgs` is a list of questions plus optional auto-resolution timeout; questions carry id/header/question/isOther/isSecret/options。 | [E: codex-rs/protocol/src/request_user_input.rs:15][E: codex-rs/protocol/src/request_user_input.rs:16][E: codex-rs/protocol/src/request_user_input.rs:17][E: codex-rs/protocol/src/request_user_input.rs:18][E: codex-rs/protocol/src/request_user_input.rs:22][E: codex-rs/protocol/src/request_user_input.rs:26][E: codex-rs/protocol/src/request_user_input.rs:28][E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/request_user_input.rs:33][E: codex-rs/protocol/src/request_user_input.rs:36] |
| `TurnItem` | normalized turn-item stream tagged union[I]；current variants include user/hook/agent messages, plan, reasoning, web search, image view/generation, sleep, file change, MCP tool call and context compaction。 | [E: codex-rs/protocol/src/items.rs:42][E: codex-rs/protocol/src/items.rs:43][E: codex-rs/protocol/src/items.rs:44][E: codex-rs/protocol/src/items.rs:45][E: codex-rs/protocol/src/items.rs:46][E: codex-rs/protocol/src/items.rs:47][E: codex-rs/protocol/src/items.rs:48][E: codex-rs/protocol/src/items.rs:49][E: codex-rs/protocol/src/items.rs:50][E: codex-rs/protocol/src/items.rs:51][E: codex-rs/protocol/src/items.rs:52][E: codex-rs/protocol/src/items.rs:53][E: codex-rs/protocol/src/items.rs:54] |

## Safety / sandbox / approval

| Term | 中文解释 | Evidence |
|---|---|---|
| sandbox mode | config-facing `SandboxMode`: `read-only`, `workspace-write`, `danger-full-access`; default variant is `ReadOnly`。 | [E: codex-rs/protocol/src/config_types.rs:86][E: codex-rs/protocol/src/config_types.rs:89][E: codex-rs/protocol/src/config_types.rs:88][E: codex-rs/protocol/src/config_types.rs:92][E: codex-rs/protocol/src/config_types.rs:95] |
| network sandbox | `NetworkSandboxPolicy` has `Restricted` and `Enabled`; `is_enabled()` checks the enabled variant。 | [E: codex-rs/protocol/src/permissions.rs:84][E: codex-rs/protocol/src/permissions.rs:86][E: codex-rs/protocol/src/permissions.rs:87][E: codex-rs/protocol/src/permissions.rs:90][E: codex-rs/protocol/src/permissions.rs:91] |
| auto review / guardian assessment | approval-review events use `GuardianAssessmentEvent`, with id, target item, turn id, timestamps, status, risk level, user authorization and rationale fields。 | [E: codex-rs/protocol/src/approvals.rs:180][E: codex-rs/protocol/src/approvals.rs:181][E: codex-rs/protocol/src/approvals.rs:185][E: codex-rs/protocol/src/approvals.rs:189][E: codex-rs/protocol/src/approvals.rs:192][E: codex-rs/protocol/src/approvals.rs:196][E: codex-rs/protocol/src/approvals.rs:200][E: codex-rs/protocol/src/approvals.rs:204][E: codex-rs/protocol/src/approvals.rs:208] |
| seatbelt | macOS sandbox marker sets `CODEX_SANDBOX=seatbelt`; non-macOS seatbelt transform errors with "seatbelt sandbox is only available on macOS"。 | [E: codex-rs/core/src/sandboxing/mod.rs:138][E: codex-rs/core/src/sandboxing/mod.rs:139][E: codex-rs/core/src/sandboxing/mod.rs:140][E: codex-rs/sandboxing/src/lib.rs:57] |
| bubblewrap / bwrap | Linux sandbox preferred path; README states Codex prefers first `bwrap` on PATH outside cwd and falls back to bundled `codex-resources/bwrap` when missing。 | [E: codex-rs/linux-sandbox/README.md:10][E: codex-rs/linux-sandbox/README.md:11][E: codex-rs/linux-sandbox/README.md:14][E: codex-rs/linux-sandbox/README.md:15] |
| Landlock | legacy Linux fallback; README says legacy Landlock + mount protections remain available and can be forced via `features.use_legacy_landlock = true`。 | [E: codex-rs/linux-sandbox/README.md:40][E: codex-rs/linux-sandbox/README.md:41][E: codex-rs/linux-sandbox/README.md:42][E: codex-rs/linux-sandbox/README.md:43] |
| managed network proxy | proxy code lists URL env keys and applies managed HTTP/WS/no-proxy overrides plus `CODEX_NETWORK_PROXY_ACTIVE` and local-binding marker。 | [E: codex-rs/network-proxy/src/proxy.rs:358][E: codex-rs/network-proxy/src/proxy.rs:359][E: codex-rs/network-proxy/src/proxy.rs:360][E: codex-rs/network-proxy/src/proxy.rs:496][E: codex-rs/network-proxy/src/proxy.rs:497][E: codex-rs/network-proxy/src/proxy.rs:507][E: codex-rs/network-proxy/src/proxy.rs:532][E: codex-rs/network-proxy/src/proxy.rs:537] |
| exec-server environment | `CODEX_EXEC_SERVER_URL` is the legacy environment selector; `none` disables default environment access, and `Environment::create_inner()` normalizes the raw value before choosing remote/local environment。 | [E: codex-rs/exec-server/src/environment.rs:33][E: codex-rs/exec-server/src/environment.rs:45][E: codex-rs/exec-server/src/environment.rs:48][E: codex-rs/exec-server/src/environment.rs:481][E: codex-rs/exec-server/src/environment.rs:485][E: codex-rs/exec-server/src/environment.rs:486][E: codex-rs/exec-server/src/environment.rs:492][E: codex-rs/exec-server/src/environment.rs:493][E: codex-rs/exec-server/src/environment.rs:494] |

## Feature / collaboration / UI shorthand

| Term | 中文解释 | Evidence |
|---|---|---|
| feature flag | `Feature` is the enum of config-toggled features; `FEATURES` maps feature ids to keys/stages/defaults, while removed compatibility flags like `GhostCommit` and `JsRepl` remain parseable as removed flags。 | [E: codex-rs/features/src/lib.rs:77][E: codex-rs/features/src/lib.rs:79][E: codex-rs/features/src/lib.rs:230][E: codex-rs/features/src/lib.rs:233][E: codex-rs/features/src/lib.rs:235][E: codex-rs/features/src/lib.rs:237][E: codex-rs/features/src/lib.rs:757][E: codex-rs/features/src/lib.rs:760][E: codex-rs/features/src/lib.rs:762][E: codex-rs/features/src/lib.rs:802][E: codex-rs/features/src/lib.rs:804] |
| code mode | feature `CodeMode` currently describes JavaScript code mode backed by in-process V8 runtime, distinct from the removed JS REPL compatibility flag。 | [E: codex-rs/features/src/lib.rs:89][E: codex-rs/features/src/lib.rs:90][E: codex-rs/features/src/lib.rs:234][E: codex-rs/features/src/lib.rs:235] |
| review mode | `ReviewTask` is a `SessionTask` with `TaskKind::Review`, span `session_task.review`, and starts a sub-codex review conversation before exiting review mode unless cancelled。 | [E: codex-rs/core/src/tasks/review.rs:42][E: codex-rs/core/src/tasks/review.rs:43][E: codex-rs/core/src/tasks/review.rs:47][E: codex-rs/core/src/tasks/review.rs:72][E: codex-rs/core/src/tasks/review.rs:84][E: codex-rs/core/src/tasks/review.rs:90] |
| app-server | workspace includes `app-server` and adjacent app-server crates; app-server CLI accepts a transport endpoint URL via `--listen`。 | [E: codex-rs/Cargo.toml:11][E: codex-rs/Cargo.toml:12][E: codex-rs/Cargo.toml:13][E: codex-rs/Cargo.toml:14][E: codex-rs/app-server/src/main.rs:21][E: codex-rs/app-server/src/main.rs:25][E: codex-rs/app-server/src/main.rs:28] |
| TUI | workspace includes `tui`; TUI session logging is enabled through `CODEX_TUI_RECORD_SESSION` truthy values。 | [E: codex-rs/Cargo.toml:60][E: codex-rs/tui/src/session_log.rs:84][E: codex-rs/tui/src/session_log.rs:85][E: codex-rs/tui/src/session_log.rs:86] |

## Sources

- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/items.rs`
- `codex-rs/protocol/src/dynamic_tools.rs`
- `codex-rs/protocol/src/request_permissions.rs`
- `codex-rs/protocol/src/request_user_input.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/permissions.rs`
- `codex-rs/protocol/src/approvals.rs`
- `codex-rs/core/src/session/turn_context.rs`
- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/tasks/review.rs`
- `codex-rs/core/src/sandboxing/mod.rs`
- `codex-rs/sandboxing/src/lib.rs`
- `codex-rs/linux-sandbox/README.md`
- `codex-rs/features/src/lib.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_payload.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/rollout/src/recorder.rs`
- `codex-rs/rollout/src/policy.rs`
- `codex-rs/exec-server/src/environment.rs`
- `codex-rs/network-proxy/src/proxy.rs`
- `codex-rs/Cargo.toml`
- `codex-rs/app-server/src/main.rs`
- `codex-rs/tui/src/session_log.rs`

## 相关

- [spine.overview](../spine/overview.md)
- [spine.sq-eq-architecture](../spine/sq-eq-architecture.md)
- [ref.protocol-op](protocol-op.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
- [ref.data-model](data-model.md)
- [ref.key-types](key-types.md)
