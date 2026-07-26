---
id: ref.glossary
title: Codex 术语表
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/items.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/request_permissions.rs, codex-rs/protocol/src/request_user_input.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/permissions.rs, codex-rs/protocol/src/approvals.rs, codex-rs/ext/items/src/lib.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/step_context.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/sandboxing/mod.rs, codex-rs/codex-mcp/src/runtime.rs, codex-rs/codex-mcp/src/binding.rs, codex-rs/core-plugins/src/manifest.rs, codex-rs/core-plugins/src/agent_plugin_manifest.rs, codex-rs/http-client/src/outbound_proxy.rs, codex-rs/http-client/src/route_aware_client_pool.rs, codex-rs/utils/path-uri/src/lib.rs, codex-rs/thread-store/src/local/writer_lock.rs, codex-rs/app-server/src/code_mode_host.rs, codex-rs/sandboxing/src/lib.rs, codex-rs/linux-sandbox/README.md, codex-rs/features/src/lib.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_payload.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/rollout/src/recorder.rs, codex-rs/rollout/src/policy.rs, codex-rs/exec-server/src/environment.rs, codex-rs/network-proxy/src/proxy.rs, codex-rs/Cargo.toml, codex-rs/app-server/src/main.rs, codex-rs/tui/src/session_log.rs]
symbols: []
related: [spine.overview, spine.sq-eq-architecture, ref.protocol-op, ref.protocol-event-lifecycle, ref.data-model, ref.key-types]
evidence: explicit
status: verified
updated: 61a44880a8
---

> 本术语表面向检索型 AI agent：源码中有明确定义的术语用 `[E]` 标注，wiki 组织层面的简称或跨文件归纳用 `[I]` 标注。

## Architecture / protocol

| Term | 中文解释 | Evidence |
|---|---|---|
| SQ / Submission Queue | wiki 对 core 输入队列的简称[I]；源码 `Submission` 注释为 "Submission Queue Entry - requests from user"，字段是 correlation `id`、`op`、client user message id 和 W3C trace carrier。 | [E: codex-rs/protocol/src/protocol.rs:175][E: codex-rs/protocol/src/protocol.rs:178] |
| EQ / Event Queue | wiki 对 core 输出队列的简称[I]；源码 `Event` 注释为 "Event Queue Entry - events from agent"，字段是 correlated submission id 与 `EventMsg` payload。 | [E: codex-rs/protocol/src/protocol.rs:1260][E: codex-rs/protocol/src/protocol.rs:1263] |
| `Op` | 客户端提交给 core 的 operation enum；current variants start with interrupt/background-terminal/realtime/user-input families and are documented under `Submission.op`。 | [E: codex-rs/protocol/src/protocol.rs:521] |
| `EventMsg` | agent 发给客户端的 response event tagged enum；serde/TS/strum tag 都使用 snake_case。 | [E: codex-rs/protocol/src/protocol.rs:1276][E: codex-rs/protocol/src/protocol.rs:1277][E: codex-rs/protocol/src/protocol.rs:1278][E: codex-rs/protocol/src/protocol.rs:1279] |
| Turn | wiki 对一次模型/工具工作单元的简称[I]；源码 `TurnContext` 注释为 single turn context，`SessionTask` 注释为驱动 session turn 的 async task。 | [E: codex-rs/core/src/session/turn_context.rs:114][E: codex-rs/core/src/tasks/mod.rs:214] |
| `TurnContext` | 单轮上下文，聚合 sub id、trace id、realtime flag、config/auth/model/provider/telemetry、environment、instructions、collaboration/personality、approval/permission/network/sandbox、dynamic tools 和 extension/timing state。 | [E: codex-rs/core/src/session/turn_context.rs:114][E: codex-rs/core/src/session/turn_context.rs:115][E: codex-rs/core/src/session/turn_context.rs:117][E: codex-rs/core/src/session/turn_context.rs:118][E: codex-rs/core/src/session/turn_context.rs:119][E: codex-rs/core/src/session/turn_context.rs:122][E: codex-rs/core/src/session/turn_context.rs:128][E: codex-rs/core/src/session/turn_context.rs:139][E: codex-rs/core/src/session/turn_context.rs:143][E: codex-rs/core/src/session/turn_context.rs:144][E: codex-rs/core/src/session/turn_context.rs:145][E: codex-rs/core/src/session/turn_context.rs:150][E: codex-rs/core/src/session/turn_context.rs:152][E: codex-rs/core/src/session/turn_context.rs:154] |
| `SessionTask` | core 内部驱动 turn/workflow 的 async trait，要求 `kind`、`span_name`、`run`，并提供 optional `abort`。 | [E: codex-rs/core/src/tasks/mod.rs:214][E: codex-rs/core/src/tasks/mod.rs:217][E: codex-rs/core/src/tasks/mod.rs:220][E: codex-rs/core/src/tasks/mod.rs:232][E: codex-rs/core/src/tasks/mod.rs:245] |
| `Session` / `SessionIo` | `Session` 拥有运行时状态；`SessionIo` 单独持有 submission sender、event receiver、agent-status watch 与 session-loop completion future。`Session::spawn` 返回二者，外层 `CodexThread` 再把它们组合成客户端句柄。 | [E: codex-rs/core/src/session/mod.rs:400][E: codex-rs/core/src/session/mod.rs:495][E: codex-rs/core/src/session/mod.rs:521] |
| `McpRuntime` | thread-owned MCP publication owner；用 `ArcSwap` 原子替换包含 connection set、config 和 auth context 的 published runtime。 | [E: codex-rs/codex-mcp/src/runtime.rs:66][E: codex-rs/codex-mcp/src/runtime.rs:85] |
| `McpBinding` | 单次 model sampling request 捕获的不可变 MCP catalog/authority；包含 exact connection set、clients、config、tools 与 prepared calls。 | [E: codex-rs/codex-mcp/src/binding.rs:30][E: codex-rs/codex-mcp/src/binding.rs:30][E: codex-rs/codex-mcp/src/binding.rs:36][E: codex-rs/core/src/session/step_context.rs:21] |

## Persistence / history

| Term | 中文解释 | Evidence |
|---|---|---|
| rollout | Codex 会话 JSONL transcript / replay persistence 的 wiki 术语[I]；recorder 把记录写成 JSONL，policy 会按 `ThreadHistoryMode` 决定持久化 canonical `ItemCompleted` 还是 legacy event。 | [E: codex-rs/rollout/src/policy.rs:6] |
| `RolloutItem` | rollout item tagged union，包含 `SessionMeta`、`ResponseItem`、inter-agent communication、inter-agent communication metadata、compacted item、turn context item、world state item 和 event msg。 | [E: codex-rs/protocol/src/protocol.rs:3186][E: codex-rs/protocol/src/protocol.rs:3187][E: codex-rs/protocol/src/protocol.rs:3188][E: codex-rs/protocol/src/protocol.rs:3190][E: codex-rs/protocol/src/protocol.rs:3192][E: codex-rs/protocol/src/protocol.rs:3195][E: codex-rs/protocol/src/protocol.rs:3196][E: codex-rs/protocol/src/protocol.rs:3197][E: codex-rs/protocol/src/protocol.rs:3198] |
| `RolloutLine` | single JSONL line schema：timestamp、paginated history 使用的 optional ordinal，以及 flattened rollout item。 | [E: codex-rs/protocol/src/protocol.rs:3381][E: codex-rs/protocol/src/protocol.rs:3384][E: codex-rs/protocol/src/protocol.rs:3385] |
| `SessionMeta` | session-level rollout metadata；除 base instructions 外，还记录 `history_mode`、可继承的 `history_base`、subagent 自有投影起点和 initial context-window identity。 | [E: codex-rs/protocol/src/protocol.rs:3099][E: codex-rs/protocol/src/protocol.rs:3117] |
| `ThreadHistoryMode` | thread history 的兼容模式：默认 `Legacy`，或使用 ordinal/SQLite 投影的 `Paginated`。 | [E: codex-rs/protocol/src/protocol.rs:688][E: codex-rs/protocol/src/protocol.rs:691][E: codex-rs/protocol/src/protocol.rs:694][E: codex-rs/protocol/src/protocol.rs:697] |
| single writer | paginated thread 的 append/fork 写入约束：thread store 对同一 thread 获取进程内 lifecycle lock，并用 writer lock file 排除另一个进程的 live writer。[I] | [E: codex-rs/thread-store/src/local/writer_lock.rs:17][E: codex-rs/thread-store/src/local/writer_lock.rs:39][E: codex-rs/thread-store/src/local/writer_lock.rs:54] |
| pinned thread | persisted thread metadata 的 `is_pinned` 状态；RPC 可 patch pin，list 可按 pin 过滤，read/list projection 返回该值。[I] | [E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:869][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1125] |
| `ResponseItem` | model/history response item union covering additional tool declarations, messages, agent messages, reasoning, local shell legacy calls, function/tool-search/custom calls and outputs, web/image calls, compaction/context-compaction, and fallback `Other`。 | [E: codex-rs/protocol/src/models.rs:799][E: codex-rs/protocol/src/models.rs:802][E: codex-rs/protocol/src/models.rs:808][E: codex-rs/protocol/src/models.rs:824][E: codex-rs/protocol/src/models.rs:835][E: codex-rs/protocol/src/models.rs:848][E: codex-rs/protocol/src/models.rs:861][E: codex-rs/protocol/src/models.rs:878][E: codex-rs/protocol/src/models.rs:910][E: codex-rs/protocol/src/models.rs:967][E: codex-rs/protocol/src/models.rs:990][E: codex-rs/protocol/src/models.rs:1004][E: codex-rs/protocol/src/models.rs:1015][E: codex-rs/protocol/src/models.rs:1027] |
| compaction | `ContextCompactedEvent` is an empty event struct; `CompactedItem` stores summary message, optional replacement history and optional context-window identity fields。 | [E: codex-rs/protocol/src/protocol.rs:1983][E: codex-rs/protocol/src/protocol.rs:3220][E: codex-rs/protocol/src/protocol.rs:3221][E: codex-rs/protocol/src/protocol.rs:3223][E: codex-rs/protocol/src/protocol.rs:3226][E: codex-rs/protocol/src/protocol.rs:3229][E: codex-rs/protocol/src/protocol.rs:3232][E: codex-rs/protocol/src/protocol.rs:3235] |

## Tools / model interaction

| Term | 中文解释 | Evidence |
|---|---|---|
| `ToolSpec` | Responses API model-visible tool spec union：function、namespace、tool_search、web_search、custom/freeform。Image generation 不再是这个 enum 的 variant。 | [E: codex-rs/tools/src/tool_spec.rs:19][E: codex-rs/tools/src/tool_spec.rs:21][E: codex-rs/tools/src/tool_spec.rs:23][E: codex-rs/tools/src/tool_spec.rs:25][E: codex-rs/tools/src/tool_spec.rs:37] |
| `ToolPayload` | runtime 接收的 canonical payload union：function arguments、tool_search args、custom/freeform input。 | [E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:8][E: codex-rs/tools/src/tool_payload.rs:9][E: codex-rs/tools/src/tool_payload.rs:10] |
| `ToolExecutor` | executable runtime contract：tool name, spec, exposure, search info, parallel support, handle。 | [E: codex-rs/tools/src/tool_executor.rs:49][E: codex-rs/tools/src/tool_executor.rs:51][E: codex-rs/tools/src/tool_executor.rs:53][E: codex-rs/tools/src/tool_executor.rs:55][E: codex-rs/tools/src/tool_executor.rs:59][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:68] |
| `ToolExposure` | tool runtime exposure mode：direct、deferred、direct-model-only、hidden。 | [E: codex-rs/tools/src/tool_executor.rs:15][E: codex-rs/tools/src/tool_executor.rs:20][E: codex-rs/tools/src/tool_executor.rs:26][E: codex-rs/tools/src/tool_executor.rs:32][E: codex-rs/tools/src/tool_executor.rs:35] |
| dynamic tool | runtime-provided tool spec; `DynamicToolSpec` can be `Function` or `Namespace`, with function name/description/input schema/defer-loading fields and namespace name/description/tools fields。 | [E: codex-rs/protocol/src/dynamic_tools.rs:10][E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/dynamic_tools.rs:14][E: codex-rs/protocol/src/dynamic_tools.rs:15][E: codex-rs/protocol/src/dynamic_tools.rs:21][E: codex-rs/protocol/src/dynamic_tools.rs:22][E: codex-rs/protocol/src/dynamic_tools.rs:23][E: codex-rs/protocol/src/dynamic_tools.rs:24][E: codex-rs/protocol/src/dynamic_tools.rs:26][E: codex-rs/protocol/src/dynamic_tools.rs:32][E: codex-rs/protocol/src/dynamic_tools.rs:33][E: codex-rs/protocol/src/dynamic_tools.rs:35] |
| request permissions | `RequestPermissionsArgs` carries optional environment id, optional reason, and requested permission profile。 | [E: codex-rs/protocol/src/request_permissions.rs:49][E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_permissions.rs:58][E: codex-rs/protocol/src/request_permissions.rs:60][E: codex-rs/protocol/src/request_permissions.rs:61] |
| request user input | `RequestUserInputArgs` is a list of questions plus optional auto-resolution timeout; questions carry id/header/question/isOther/isSecret/options。 | [E: codex-rs/protocol/src/request_user_input.rs:15][E: codex-rs/protocol/src/request_user_input.rs:16][E: codex-rs/protocol/src/request_user_input.rs:17][E: codex-rs/protocol/src/request_user_input.rs:18][E: codex-rs/protocol/src/request_user_input.rs:22][E: codex-rs/protocol/src/request_user_input.rs:26][E: codex-rs/protocol/src/request_user_input.rs:28][E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/request_user_input.rs:33][E: codex-rs/protocol/src/request_user_input.rs:36] |
| `TurnItem` | normalized turn-item stream 的 18-variant tagged union[I]；standalone image generation / sleep / web search 走 `Extension(ExtensionItem)`，hosted web/image 仍有 core-owned variant，并新增 entered/exited review mode item。 | [E: codex-rs/protocol/src/items.rs:45][E: codex-rs/protocol/src/items.rs:58][E: codex-rs/protocol/src/items.rs:64][E: codex-rs/protocol/src/items.rs:69][E: codex-rs/protocol/src/items.rs:72] |
| `ExtensionItem` | extension-owned display item envelope；`kind` 使用 namespaced 值，当前是 `image_gen.generation`、`clock.sleep`、`web.search`。 | [E: codex-rs/ext/items/src/lib.rs:33][E: codex-rs/ext/items/src/lib.rs:36][E: codex-rs/ext/items/src/lib.rs:39] |
| Agent Plugin | root `plugin.json` 采用 Agent Plugins 1.0 schema 的 installable manifest dialect；Codex 将其 allow-listed metadata 与默认 `./skills`、`./mcp.json` 资源投影到现有 plugin model。 | [E: codex-rs/core-plugins/src/manifest.rs:242][E: codex-rs/core-plugins/src/manifest.rs:245][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:129][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:158][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:166] |

## Safety / sandbox / approval

| Term | 中文解释 | Evidence |
|---|---|---|
| sandbox mode | config-facing `SandboxMode`: `read-only`, `workspace-write`, `danger-full-access`; default variant is `ReadOnly`。 | [E: codex-rs/protocol/src/config_types.rs:86][E: codex-rs/protocol/src/config_types.rs:89][E: codex-rs/protocol/src/config_types.rs:88][E: codex-rs/protocol/src/config_types.rs:92][E: codex-rs/protocol/src/config_types.rs:95] |
| network sandbox | `NetworkSandboxPolicy` has `Restricted` and `Enabled`; `is_enabled()` checks the enabled variant。 | [E: codex-rs/protocol/src/permissions.rs:78][E: codex-rs/protocol/src/permissions.rs:80][E: codex-rs/protocol/src/permissions.rs:81][E: codex-rs/protocol/src/permissions.rs:84][E: codex-rs/protocol/src/permissions.rs:85] |
| auto review / guardian assessment | approval-review events use `GuardianAssessmentEvent`, with id, target item, turn id, timestamps, status, risk level, user authorization and rationale fields。 | [E: codex-rs/protocol/src/approvals.rs:181][E: codex-rs/protocol/src/approvals.rs:185][E: codex-rs/protocol/src/approvals.rs:197][E: codex-rs/protocol/src/approvals.rs:200][E: codex-rs/protocol/src/approvals.rs:204][E: codex-rs/protocol/src/approvals.rs:208][E: codex-rs/protocol/src/approvals.rs:212][E: codex-rs/protocol/src/approvals.rs:216] |
| seatbelt | macOS sandbox marker sets `CODEX_SANDBOX=seatbelt`; non-macOS seatbelt transform errors with "seatbelt sandbox is only available on macOS"。 | [E: codex-rs/core/src/sandboxing/mod.rs:150][E: codex-rs/core/src/sandboxing/mod.rs:151] |
| bubblewrap / bwrap | Linux sandbox preferred path; README states Codex prefers first `bwrap` on PATH outside cwd and falls back to bundled `codex-resources/bwrap` when missing。 | [E: codex-rs/linux-sandbox/README.md:10][E: codex-rs/linux-sandbox/README.md:11][E: codex-rs/linux-sandbox/README.md:14][E: codex-rs/linux-sandbox/README.md:15] |
| Landlock | legacy Linux fallback; README says legacy Landlock + mount protections remain available and can be forced via `features.use_legacy_landlock = true`。 | [E: codex-rs/linux-sandbox/README.md:40][E: codex-rs/linux-sandbox/README.md:41][E: codex-rs/linux-sandbox/README.md:42][E: codex-rs/linux-sandbox/README.md:43] |
| managed network proxy | proxy code lists URL env keys and applies managed HTTP/WS/no-proxy overrides plus `CODEX_NETWORK_PROXY_ACTIVE` and local-binding marker。 | [E: codex-rs/network-proxy/src/proxy.rs:498][E: codex-rs/network-proxy/src/proxy.rs:499][E: codex-rs/network-proxy/src/proxy.rs:518][E: codex-rs/network-proxy/src/proxy.rs:519][E: codex-rs/network-proxy/src/proxy.rs:668][E: codex-rs/network-proxy/src/proxy.rs:670][E: codex-rs/network-proxy/src/proxy.rs:679][E: codex-rs/network-proxy/src/proxy.rs:700][E: codex-rs/network-proxy/src/proxy.rs:704][E: codex-rs/network-proxy/src/proxy.rs:577] |
| exec-server environment | `CODEX_EXEC_SERVER_URL` is the legacy environment selector; `none` disables default environment access, and `Environment::create_inner()` normalizes the raw value before choosing remote/local environment。 | [E: codex-rs/exec-server/src/environment.rs:45][E: codex-rs/exec-server/src/environment.rs:674][E: codex-rs/exec-server/src/environment.rs:679][E: codex-rs/exec-server/src/environment.rs:680][E: codex-rs/exec-server/src/environment.rs:686][E: codex-rs/exec-server/src/environment.rs:627][E: codex-rs/exec-server/src/environment.rs:695] |
| `PathUri` | 以 `url::Url` 为内核的 host-neutral absolute path URI；跨 executor/host 的协议与 approval identity 用它代替平台原生 path serialization。 | [E: codex-rs/utils/path-uri/src/lib.rs:58] |
| `HttpClientFactory` / `RouteAwareClientPool` | factory 按目标 URL 解析 direct/system/managed outbound route；pool 为请求及每次 redirect 重新选路并缓存 bounded route-specific clients。 | [E: codex-rs/http-client/src/outbound_proxy.rs:142][E: codex-rs/http-client/src/route_aware_client_pool.rs:41][E: codex-rs/http-client/src/route_aware_client_pool.rs:219] |

## Feature / collaboration / UI shorthand

| Term | 中文解释 | Evidence |
|---|---|---|
| feature flag | `Feature` is the enum of config-toggled features; `FEATURES` maps feature ids to keys/stages/defaults, while removed compatibility flags like `GhostCommit` and `JsRepl` remain parseable as removed flags。 | [E: codex-rs/features/src/lib.rs:84][E: codex-rs/features/src/lib.rs:834][E: codex-rs/features/src/lib.rs:836][E: codex-rs/features/src/lib.rs:882][E: codex-rs/features/src/lib.rs:884] |
| code mode | feature `CodeMode` 描述 JavaScript Code Mode；app-server 进程可拥有默认 local host，也可用 `--code-mode-host ws://...`/`wss://...` 共享远端 host，而 V8 执行仍位于 host 侧。 | [E: codex-rs/features/src/lib.rs:96][E: codex-rs/features/src/lib.rs:267][E: codex-rs/app-server/src/code_mode_host.rs:5][E: codex-rs/app-server/src/code_mode_host.rs:17] |
| review mode | `ReviewTask` is a `SessionTask` with `TaskKind::Review`, span `session_task.review`, and starts a sub-codex review conversation before exiting review mode unless cancelled。 | [E: codex-rs/core/src/tasks/review.rs:45][E: codex-rs/core/src/tasks/review.rs:46][E: codex-rs/core/src/tasks/review.rs:50][E: codex-rs/core/src/tasks/review.rs:86][E: codex-rs/core/src/tasks/review.rs:92] |
| app-server | workspace includes `app-server` and adjacent app-server crates; app-server CLI accepts a transport endpoint URL via `--listen`。 | [E: codex-rs/Cargo.toml:11][E: codex-rs/Cargo.toml:12][E: codex-rs/Cargo.toml:13][E: codex-rs/Cargo.toml:14][E: codex-rs/app-server/src/main.rs:22][E: codex-rs/app-server/src/main.rs:32] |
| TUI | workspace includes `tui`; TUI session logging is enabled through `CODEX_TUI_RECORD_SESSION` truthy values。 | [E: codex-rs/Cargo.toml:90][E: codex-rs/tui/src/session_log.rs:84][E: codex-rs/tui/src/session_log.rs:85][E: codex-rs/tui/src/session_log.rs:86] |

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
- `codex-rs/ext/items/src/lib.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/step_context.rs`
- `codex-rs/core/src/session/turn_context.rs`
- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/tasks/review.rs`
- `codex-rs/core/src/sandboxing/mod.rs`
- `codex-rs/codex-mcp/src/runtime.rs`
- `codex-rs/codex-mcp/src/binding.rs`
- `codex-rs/core-plugins/src/manifest.rs`
- `codex-rs/core-plugins/src/agent_plugin_manifest.rs`
- `codex-rs/http-client/src/outbound_proxy.rs`
- `codex-rs/http-client/src/route_aware_client_pool.rs`
- `codex-rs/utils/path-uri/src/lib.rs`
- `codex-rs/thread-store/src/local/writer_lock.rs`
- `codex-rs/app-server/src/code_mode_host.rs`
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
