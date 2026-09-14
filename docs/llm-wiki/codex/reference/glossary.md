---
id: ref.glossary
title: Codex 术语表
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/turn_input.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/items.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/request_permissions.rs, codex-rs/protocol/src/request_user_input.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/permissions.rs, codex-rs/protocol/src/approvals.rs, codex-rs/ext/items/src/lib.rs, codex-rs/history/src/lib.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/step_context.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/sandboxing/mod.rs, codex-rs/codex-mcp/src/runtime.rs, codex-rs/codex-mcp/src/binding.rs, codex-rs/core-plugins/src/manifest.rs, codex-rs/core-plugins/src/agent_plugin_manifest.rs, codex-rs/http-client/src/outbound_proxy.rs, codex-rs/http-client/src/route_aware_client_pool.rs, codex-rs/utils/path-uri/src/lib.rs, codex-rs/rollout/src/writer_lock.rs, codex-rs/thread-store/src/local/live_writer.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs, codex-rs/state/src/lib.rs, codex-rs/app-server/src/code_mode_host.rs, codex-rs/sandboxing/src/lib.rs, codex-rs/linux-sandbox/README.md, codex-rs/features/src/lib.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_payload.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/rollout/src/recorder.rs, codex-rs/rollout/src/policy.rs, codex-rs/exec-server/src/environment.rs, codex-rs/exec-server/src/environment_provider.rs, codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/network-proxy/src/proxy.rs, codex-rs/Cargo.toml, codex-rs/app-server/src/main.rs, codex-rs/tui/src/session_log.rs, codex-rs/tui/src/slash_command.rs, codex-rs/config/src/config_toml.rs, codex-rs/models-manager/models.json]
symbols: []
related: [spine.overview, spine.sq-eq-architecture, ref.protocol-op, ref.protocol-event-lifecycle, ref.data-model, ref.key-types]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> 本术语表面向检索型 AI agent：源码中有明确定义的术语用 `[E]` 标注，wiki 组织层面的简称或跨文件归纳用 `[I]` 标注。

## Architecture / protocol

| Term | 中文解释 | Evidence |
|---|---|---|
| SQ / Submission Queue | wiki 对 core 输入队列的简称[I]；源码 `Submission` struct 的字段是 correlation `id`、`op`、optional W3C `trace`、optional core-generated `parent_turn_id` 与 `root_turn_id`。`client_user_message_id` 已从 `Submission` 移除，用户消息 id 现在挂在 `TurnInput::UserInput.client_id`。 | [E: codex-rs/protocol/src/protocol.rs:192][E: codex-rs/protocol/src/protocol.rs:194][E: codex-rs/protocol/src/protocol.rs:196][E: codex-rs/protocol/src/protocol.rs:198][E: codex-rs/protocol/src/turn_input.rs:33][E: codex-rs/protocol/src/turn_input.rs:35] |
| `parent_turn_id` / `root_turn_id` | core 内部 submission provenance：`parent_turn_id` 标识直接发起该 submission 的 parent turn，`root_turn_id` 标识因果根 turn。[I] | [E: codex-rs/protocol/src/protocol.rs:202][E: codex-rs/protocol/src/protocol.rs:204] |
| EQ / Event Queue | wiki 对 core 输出队列的简称[I]；源码 `Event` 注释为 "Event Queue Entry - events from agent"，字段是 correlated submission id 与 `EventMsg` payload。 | [E: codex-rs/protocol/src/protocol.rs:1339][E: codex-rs/protocol/src/protocol.rs:1341][E: codex-rs/protocol/src/protocol.rs:1343] |
| `Op` | 客户端提交给 core 的 `#[non_exhaustive]` operation enum，当前 28 个变体（`Interrupt` … `RunUserShellCommand`）；turn 输入走 `TurnInput` / `RecoverTurn`，不再有 `Op::UserInput` 或 `Op::ThreadRollback`。 | [E: codex-rs/protocol/src/protocol.rs:600][E: codex-rs/protocol/src/protocol.rs:603][E: codex-rs/protocol/src/protocol.rs:760] |
| `EventMsg` | agent 发给客户端的 response event tagged enum，当前 83 个变体；serde 与 strum 使用 snake_case，TS 只声明 `tag = "type"`。ServerNotification 另有 84 个变体（83 个 `=> "wire"` + `AccountLoginCompleted`），不是同一份 enum。 | [E: codex-rs/protocol/src/protocol.rs:1354][E: codex-rs/protocol/src/protocol.rs:1356][E: codex-rs/protocol/src/protocol.rs:1357][E: codex-rs/app-server-protocol/src/protocol/common.rs:1902][E: codex-rs/app-server-protocol/src/protocol/common.rs:2020] |
| Turn | wiki 对一次模型/工具工作单元的简称[I]；源码 `TurnContext` 是 single-turn context，`SessionTask` 是驱动 session turn 的 async trait。 | [E: codex-rs/core/src/session/turn_context.rs:282][E: codex-rs/core/src/tasks/mod.rs:178] |
| `TurnContext` | 单轮上下文，聚合 sub/trace id、realtime/code-mode state、config/auth/model/provider/telemetry、environment、instructions、permission/network/sandbox、dynamic tools 和 extension/timing state。`personality()` 从 `initial_settings` 读取，不是 `TurnContext` 字段。 | [E: codex-rs/core/src/session/turn_context.rs:282][E: codex-rs/core/src/session/turn_context.rs:289][E: codex-rs/core/src/session/turn_context.rs:297][E: codex-rs/core/src/session/turn_context.rs:375] |
| `SessionTask` | core 内部驱动 turn/workflow 的 async trait，要求 `kind`、`span_name`、`run`，并提供 optional `abort`。 | [E: codex-rs/core/src/tasks/mod.rs:178][E: codex-rs/core/src/tasks/mod.rs:181][E: codex-rs/core/src/tasks/mod.rs:184][E: codex-rs/core/src/tasks/mod.rs:196][E: codex-rs/core/src/tasks/mod.rs:209] |
| `Session` / `SessionIo` | `Session` 拥有运行时状态；`SessionIo` 单独持有 submission sender、event receiver、agent-status watch 与 session-loop completion future。`Session::spawn` 返回二者，外层 `CodexThread` 再把它们组合成客户端句柄。 | [E: codex-rs/core/src/session/mod.rs:399][E: codex-rs/core/src/session/mod.rs:502][E: codex-rs/core/src/codex_thread.rs:180] |
| `McpRuntime` | thread-owned MCP publication owner；用 `ArcSwap` 原子替换包含 connection set、config 和 auth context 的 published runtime。 | [E: codex-rs/codex-mcp/src/runtime.rs:96][E: codex-rs/codex-mcp/src/runtime.rs:97] |
| `McpBinding` | 单次 model sampling request 捕获的不可变 MCP catalog/authority；包含 exact connection set、clients、config、tools 与 prepared calls。 | [E: codex-rs/codex-mcp/src/binding.rs:31][E: codex-rs/codex-mcp/src/binding.rs:32][E: codex-rs/codex-mcp/src/binding.rs:36][E: codex-rs/core/src/session/step_context.rs:32] |

## Persistence / history

| Term | 中文解释 | Evidence |
|---|---|---|
| rollout | Codex 会话 JSONL transcript / replay persistence 的 wiki 术语[I]；recorder 把记录序列化为逐行 JSON，policy 会按 `ThreadHistoryMode` 决定持久化 canonical `ItemCompleted` 还是 legacy event。 | [E: codex-rs/rollout/src/recorder.rs:2069][E: codex-rs/rollout/src/policy.rs:10][E: codex-rs/rollout/src/policy.rs:16][E: codex-rs/rollout/src/policy.rs:94][E: codex-rs/rollout/src/policy.rs:96][E: codex-rs/rollout/src/policy.rs:123] |
| `RolloutItem` | rollout item tagged union，现定义在 `history` crate：`SessionMeta`、`ResponseItem`、inter-agent communication、inter-agent communication metadata、compacted item、turn context item、world state item、`SecurityRiskScore`、event msg 和 `RealtimeItem`。 | [E: codex-rs/history/src/lib.rs:122][E: codex-rs/history/src/lib.rs:123][E: codex-rs/history/src/lib.rs:124][E: codex-rs/history/src/lib.rs:125][E: codex-rs/history/src/lib.rs:126][E: codex-rs/history/src/lib.rs:129][E: codex-rs/history/src/lib.rs:130][E: codex-rs/history/src/lib.rs:132][E: codex-rs/history/src/lib.rs:133][E: codex-rs/history/src/lib.rs:135][E: codex-rs/history/src/lib.rs:137] |
| `RolloutLine` | single JSONL line schema：timestamp、paginated history 使用的 optional ordinal，以及 flattened rollout item。 | [E: codex-rs/history/src/lib.rs:262][E: codex-rs/history/src/lib.rs:263][E: codex-rs/history/src/lib.rs:265][E: codex-rs/history/src/lib.rs:267] |
| `SessionMeta` | session-level rollout metadata；除 base instructions 外，还记录 `history_mode`、可继承的 `history_base`、subagent 自有投影起点和 initial context-window identity。 | [E: codex-rs/protocol/src/protocol.rs:3062][E: codex-rs/protocol/src/protocol.rs:3116][E: codex-rs/protocol/src/protocol.rs:3119][E: codex-rs/protocol/src/protocol.rs:3125] |
| `ThreadHistoryMode` | thread history 的兼容模式：默认 `Legacy`，或使用 ordinal/SQLite 投影的 `Paginated`。 | [E: codex-rs/protocol/src/protocol.rs:778][E: codex-rs/protocol/src/protocol.rs:780][E: codex-rs/protocol/src/protocol.rs:781] |
| single writer | live thread 的 append/fork 写入约束，不区分 `Legacy` / `Paginated` history mode：thread store 对同一 thread 获取进程内 lifecycle lock，并用 `rollout` crate 的 writer lock file 排除另一个进程的 live writer。[I] | [E: codex-rs/thread-store/src/local/live_writer.rs:30][E: codex-rs/thread-store/src/local/live_writer.rs:33][E: codex-rs/thread-store/src/local/live_writer.rs:44][E: codex-rs/thread-store/src/local/live_writer.rs:46][E: codex-rs/rollout/src/writer_lock.rs:21][E: codex-rs/rollout/src/writer_lock.rs:43][E: codex-rs/rollout/src/writer_lock.rs:65] |
| pinned thread | thread 被移动到内置 `Pinned` section 的状态；当前模型以 `ThreadSection` membership 表达，RPC 用 `threadSection/move` 设置或清除 `section_id`，不再持久化独立 `is_pinned` 布尔值。[I] | [E: codex-rs/state/src/lib.rs:118][E: codex-rs/state/src/lib.rs:121][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1062][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1072] |
| `ResponseItem` | model/history response item 的 18-variant union；`FunctionCall` 可带 encrypted function args，可携 metadata 的 variants 复用 internal passthrough，其中 attempted-tool calls 是 warehouse-only，不进入 public schema/TS。 | [E: codex-rs/protocol/src/models.rs:1001][E: codex-rs/protocol/src/models.rs:1063][E: codex-rs/protocol/src/models.rs:1077][E: codex-rs/protocol/src/models.rs:949][E: codex-rs/protocol/src/models.rs:975] |
| compaction | `ContextCompactedEvent` is an empty event struct; `CompactedItem` stores summary message, optional replacement history and optional context-window identity fields。 | [E: codex-rs/protocol/src/protocol.rs:2141][E: codex-rs/history/src/lib.rs:190][E: codex-rs/history/src/lib.rs:191][E: codex-rs/history/src/lib.rs:192] |

## Tools / model interaction

| Term | 中文解释 | Evidence |
|---|---|---|
| `ToolSpec` | Responses API model-visible tool spec union：function、namespace、tool_search、web_search、custom/freeform。Image generation 不再是这个 enum 的 variant。 | [E: codex-rs/tools/src/tool_spec.rs:22][E: codex-rs/tools/src/tool_spec.rs:24][E: codex-rs/tools/src/tool_spec.rs:26][E: codex-rs/tools/src/tool_spec.rs:28][E: codex-rs/tools/src/tool_spec.rs:40][E: codex-rs/tools/src/tool_spec.rs:55] |
| `ToolPayload` | runtime 接收的 canonical payload union：function arguments、tool_search args、custom/freeform input。 | [E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:8][E: codex-rs/tools/src/tool_payload.rs:9][E: codex-rs/tools/src/tool_payload.rs:10] |
| `ToolExecutor` | executable runtime contract：tool name, spec, exposure, search info, parallel support, handle。 | [E: codex-rs/tools/src/tool_executor.rs:106][E: codex-rs/tools/src/tool_executor.rs:108][E: codex-rs/tools/src/tool_executor.rs:110][E: codex-rs/tools/src/tool_executor.rs:113][E: codex-rs/tools/src/tool_executor.rs:117][E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:127] |
| `ToolExposure` | tool runtime exposure mode：direct、deferred、deferred-model-only、direct-model-only、code-mode-only、hidden。 | [E: codex-rs/tools/src/tool_executor.rs:51][E: codex-rs/tools/src/tool_executor.rs:56][E: codex-rs/tools/src/tool_executor.rs:62][E: codex-rs/tools/src/tool_executor.rs:66][E: codex-rs/tools/src/tool_executor.rs:72][E: codex-rs/tools/src/tool_executor.rs:76][E: codex-rs/tools/src/tool_executor.rs:79] |
| dynamic tool | runtime-provided tool spec; `DynamicToolSpec` can be `Function` or `Namespace`, with function name/description/input schema/defer-loading fields and namespace name/description/tools fields。 | [E: codex-rs/protocol/src/dynamic_tools.rs:10][E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/dynamic_tools.rs:14][E: codex-rs/protocol/src/dynamic_tools.rs:15][E: codex-rs/protocol/src/dynamic_tools.rs:21][E: codex-rs/protocol/src/dynamic_tools.rs:22][E: codex-rs/protocol/src/dynamic_tools.rs:23][E: codex-rs/protocol/src/dynamic_tools.rs:24][E: codex-rs/protocol/src/dynamic_tools.rs:26][E: codex-rs/protocol/src/dynamic_tools.rs:32][E: codex-rs/protocol/src/dynamic_tools.rs:33][E: codex-rs/protocol/src/dynamic_tools.rs:35] |
| request permissions | `RequestPermissionsArgs` carries optional environment id, optional reason, and requested permission profile。 | [E: codex-rs/protocol/src/request_permissions.rs:49][E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_permissions.rs:58][E: codex-rs/protocol/src/request_permissions.rs:60][E: codex-rs/protocol/src/request_permissions.rs:61] |
| request user input | `RequestUserInputArgs` 是 questions + explicit `isBlocking` + deprecated optional auto-resolution timeout；event 侧也携带同一个 blocking bit，旧 wire payload 缺失时兼容为 `true`。 | [E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/request_user_input.rs:33][E: codex-rs/protocol/src/request_user_input.rs:34][E: codex-rs/protocol/src/request_user_input.rs:37][E: codex-rs/protocol/src/request_user_input.rs:39][E: codex-rs/protocol/src/request_user_input.rs:41][E: codex-rs/protocol/src/request_user_input.rs:55][E: codex-rs/protocol/src/request_user_input.rs:66][E: codex-rs/protocol/src/request_user_input.rs:95] |
| `TurnItem` | normalized turn-item stream 的 19-variant tagged union[I]；本轮新增 `FunctionCallOutput`。standalone image generation / sleep / web search 走 `Extension(ExtensionItem)`，hosted web/image 仍有 core-owned variant。 | [E: codex-rs/protocol/src/items.rs:45][E: codex-rs/protocol/src/items.rs:47][E: codex-rs/protocol/src/items.rs:60][E: codex-rs/protocol/src/items.rs:66][E: codex-rs/protocol/src/items.rs:71] |
| `ExtensionItem` | extension-owned display item envelope；`kind` 使用 namespaced 值，当前是 `image_gen.generation`、`clock.sleep`、`web.search`。 | [E: codex-rs/ext/items/src/lib.rs:35][E: codex-rs/ext/items/src/lib.rs:36][E: codex-rs/ext/items/src/lib.rs:39][E: codex-rs/ext/items/src/lib.rs:42] |
| Agent Plugin | root `plugin.json` 采用 Agent Plugins schema 的 installable manifest dialect；Codex 将其 allow-listed metadata 与默认 `./skills`、`./mcp.json` 资源投影到现有 plugin model。 | [E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:129][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:138][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:166][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:167] |

## Safety / sandbox / approval

| Term | 中文解释 | Evidence |
|---|---|---|
| sandbox mode | config-facing `SandboxMode`: `read-only`, `workspace-write`, `danger-full-access`; default variant is `ReadOnly`。 | [E: codex-rs/protocol/src/config_types.rs:104][E: codex-rs/protocol/src/config_types.rs:107][E: codex-rs/protocol/src/config_types.rs:110][E: codex-rs/protocol/src/config_types.rs:113] |
| network sandbox | `NetworkSandboxPolicy` has `Restricted` and `Enabled`; `is_enabled()` checks the enabled variant。 | [E: codex-rs/protocol/src/permissions.rs:80][E: codex-rs/protocol/src/permissions.rs:82][E: codex-rs/protocol/src/permissions.rs:83][E: codex-rs/protocol/src/permissions.rs:87][E: codex-rs/protocol/src/permissions.rs:88] |
| auto review / guardian assessment | approval-review events use `GuardianAssessmentEvent`, with id, target item, turn id, timestamps, status, risk level, user authorization and rationale fields。 | [E: codex-rs/protocol/src/approvals.rs:206][E: codex-rs/protocol/src/approvals.rs:212][E: codex-rs/protocol/src/approvals.rs:228][E: codex-rs/protocol/src/approvals.rs:235][E: codex-rs/protocol/src/approvals.rs:239][E: codex-rs/protocol/src/approvals.rs:243][E: codex-rs/protocol/src/approvals.rs:247] |
| seatbelt | macOS sandbox marker sets `CODEX_SANDBOX=seatbelt`; non-macOS seatbelt transform errors with "seatbelt sandbox is only available on macOS"。 | [E: codex-rs/core/src/sandboxing/mod.rs:182][E: codex-rs/sandboxing/src/lib.rs:90] |
| bubblewrap / bwrap | Linux sandbox preferred path; README states Codex prefers first `bwrap` on PATH outside cwd and falls back to bundled `codex-resources/bwrap` when missing。 | [E: codex-rs/linux-sandbox/README.md:10][E: codex-rs/linux-sandbox/README.md:11][E: codex-rs/linux-sandbox/README.md:14][E: codex-rs/linux-sandbox/README.md:15] |
| Landlock | legacy Linux fallback; README says legacy Landlock + mount protections remain available and can be forced via `features.use_legacy_landlock = true`。 | [E: codex-rs/linux-sandbox/README.md:40][E: codex-rs/linux-sandbox/README.md:41][E: codex-rs/linux-sandbox/README.md:42][E: codex-rs/linux-sandbox/README.md:43] |
| managed network proxy | proxy code lists URL env keys and applies managed HTTP/WS/no-proxy overrides plus `CODEX_NETWORK_PROXY_ACTIVE` and local-binding marker。 | [E: codex-rs/network-proxy/src/proxy.rs:565][E: codex-rs/network-proxy/src/proxy.rs:585][E: codex-rs/network-proxy/src/proxy.rs:586][E: codex-rs/network-proxy/src/proxy.rs:738][E: codex-rs/network-proxy/src/proxy.rs:740] |
| exec-server environment | `CODEX_EXEC_SERVER_URL` is the legacy environment selector; `none` disables default environment access, and `Environment::create_inner()` normalizes the raw value before choosing remote/local environment。 | [E: codex-rs/exec-server/src/environment.rs:56][E: codex-rs/exec-server/src/environment_provider.rs:64] |
| `PathUri` | 以 `url::Url` 为内核的 host-neutral absolute path URI；跨 executor/host 的协议与 approval identity 用它代替平台原生 path serialization。 | [E: codex-rs/utils/path-uri/src/lib.rs:65] |
| `HttpClientFactory` / `RouteAwareClientPool` | factory 按目标 URL 解析 direct/system/managed outbound route；pool 为请求及每次 redirect 重新选路并缓存 bounded route-specific clients。 | [E: codex-rs/http-client/src/outbound_proxy.rs:166][E: codex-rs/http-client/src/route_aware_client_pool.rs:59] |

## Feature / collaboration / UI shorthand

| Term | 中文解释 | Evidence |
|---|---|---|
| feature flag | `Feature` 是 config-toggled identity enum；`FEATURES` 把 144 个 ids 映射到 keys/stages/defaults，removed compatibility flags 仍留在 registry。`UnifiedExec` 默认全平台 `true`。`Feature::Personality` 仍是 Stable 默认开。 | [E: codex-rs/features/src/lib.rs:93][E: codex-rs/features/src/lib.rs:346][E: codex-rs/features/src/lib.rs:418][E: codex-rs/features/src/lib.rs:909][E: codex-rs/features/src/lib.rs:947][E: codex-rs/features/src/lib.rs:950][E: codex-rs/features/src/lib.rs:1678][E: codex-rs/features/src/lib.rs:1680] |
| personality | 模型沟通风格偏好。`Personality` 变体 `None` / `Friendly` / `Pragmatic`。TUI 已无 `SlashCommand::Personality` / `/personality`；`ConfigToml.personality` 与 `Feature::Personality` 仍在。bundled GPT-5.4/5.5 可把 friendly 文本写进 catalog `# Personality` 段，那不是 TUI picker。 | [E: codex-rs/protocol/src/config_types.rs:332][E: codex-rs/config/src/config_toml.rs:387][E: codex-rs/features/src/lib.rs:346][E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:82][E: codex-rs/models-manager/models.json:782][E: codex-rs/models-manager/models.json:842] |
| code mode | feature `CodeMode` 开启 JavaScript Code Mode；app-server 进程默认选择 local host transport，也可用 `--code-mode-host ws://...`/`wss://...` 共享远端 host。 | [E: codex-rs/features/src/lib.rs:116][E: codex-rs/app-server/src/code_mode_host.rs:9][E: codex-rs/app-server/src/code_mode_host.rs:13][E: codex-rs/app-server/src/code_mode_host.rs:17][E: codex-rs/app-server/src/code_mode_host.rs:21][E: codex-rs/app-server/src/code_mode_host.rs:25] |
| review mode | `ReviewTask` 是 `SessionTask` with `TaskKind::Review`，span 为 `session_task.review`；它启动 sub-codex review conversation，并在未取消时退出 review mode。 | [E: codex-rs/core/src/tasks/review.rs:37][E: codex-rs/core/src/tasks/review.rs:47][E: codex-rs/core/src/tasks/review.rs:51][E: codex-rs/core/src/tasks/review.rs:77][E: codex-rs/core/src/tasks/review.rs:88] |
| app-server | workspace includes `app-server` and adjacent app-server crates，包括 no-op protocol derive macro crate；app-server CLI accepts a transport endpoint URL via `--listen`。 | [E: codex-rs/Cargo.toml:14][E: codex-rs/Cargo.toml:15][E: codex-rs/Cargo.toml:16][E: codex-rs/Cargo.toml:17][E: codex-rs/Cargo.toml:18][E: codex-rs/Cargo.toml:19][E: codex-rs/app-server/src/main.rs:32][E: codex-rs/app-server/src/main.rs:42] |
| TUI | workspace includes `tui`; TUI session logging is enabled through `CODEX_TUI_RECORD_SESSION` truthy values。 | [E: codex-rs/Cargo.toml:104][E: codex-rs/tui/src/session_log.rs:85][E: codex-rs/tui/src/session_log.rs:86] |

## Sources

- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/turn_input.rs`
- `codex-rs/history/src/lib.rs`
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
- `codex-rs/core/src/session/handlers.rs`
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
- `codex-rs/rollout/src/writer_lock.rs`
- `codex-rs/thread-store/src/local/live_writer.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`
- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/state/src/lib.rs`
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
- `codex-rs/exec-server/src/environment_provider.rs`
- `codex-rs/network-proxy/src/proxy.rs`
- `codex-rs/Cargo.toml`
- `codex-rs/app-server/src/main.rs`
- `codex-rs/tui/src/session_log.rs`
- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/config/src/config_toml.rs`
- `codex-rs/models-manager/models.json`

## 相关

- [spine.overview](../spine/overview.md)
- [spine.sq-eq-architecture](../spine/sq-eq-architecture.md)
- [ref.protocol-op](protocol-op.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
- [ref.data-model](data-model.md)
- [ref.key-types](key-types.md)
