---
id: ref.glossary
title: Codex 术语表
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/request_permissions.rs, codex-rs/protocol/src/request_user_input.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/tasks/ghost_snapshot.rs, codex-rs/core/src/tasks/undo.rs, codex-rs/core/src/sandboxing/mod.rs, codex-rs/sandboxing/src/lib.rs, codex-rs/linux-sandbox/README.md, codex-rs/features/src/lib.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/protocol/src/approvals.rs, codex-rs/protocol/src/items.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/permissions.rs, codex-rs/core/src/tools/js_repl/mod.rs, codex-rs/exec-server/src/environment.rs, codex-rs/network-proxy/src/proxy.rs, codex-rs/Cargo.toml, codex-rs/app-server/src/main.rs, codex-rs/tui/src/session_log.rs, codex-rs/README.md]
symbols: [Submission, Event, Op, EventMsg, RolloutItem, RolloutLine, SessionTask, TurnContext, GhostSnapshotTask, Feature, ToolSpec, ToolHandlerKind, GuardianAssessmentEvent, SandboxMode, NetworkSandboxPolicy]
related: [spine.overview, spine.sq-eq-architecture, ref.protocol-op, ref.protocol-event-lifecycle, ref.data-model, ref.key-types]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 本术语表面向检索型 AI agent：源码中有明确定义的术语用 `[E]` 标注，wiki 组织层面的架构简称或跨文件归纳用 `[I]` 标注。

## 能回答的问题

- SQ/EQ、Op、EventMsg、Submission、Event 分别是什么意思?
- rollout、RolloutItem、ghost snapshot、ghost commit、undo 在 Codex 里如何关联?
- seatbelt、bubblewrap、Landlock、network proxy、guardian 这些安全术语对应哪些源码概念?
- code mode、JS REPL、dynamic tool、MCP tool、tool_search、parallel tool calls 的边界是什么?
- collaboration/multi-agent、review mode、compaction、request_permissions、request_user_input 的常用术语如何解释?

## Architecture / protocol

| Term | 中文解释 | Evidence |
|---|---|---|
| SQ / Submission Queue | wiki 对 core 输入队列的简称[I]；源码类型 `Submission` 被注释为 "Submission Queue Entry - requests from user"，包含 `id`、`op` 和 optional W3C trace carrier。[E: codex-rs/protocol/src/protocol.rs:123][E: codex-rs/protocol/src/protocol.rs:125][E: codex-rs/protocol/src/protocol.rs:127][E: codex-rs/protocol/src/protocol.rs:129][E: codex-rs/protocol/src/protocol.rs:130][E: codex-rs/protocol/src/protocol.rs:132] |
| EQ / Event Queue | wiki 对 core 输出队列的简称[I]；源码类型 `Event` 被注释为 "Event Queue Entry - events from agent"，包含 correlation `id` 和 payload `msg`。[E: codex-rs/protocol/src/protocol.rs:1417][E: codex-rs/protocol/src/protocol.rs:1419][E: codex-rs/protocol/src/protocol.rs:1421][E: codex-rs/protocol/src/protocol.rs:1423] |
| `Op` | 客户端提交给 Codex core 的 tagged enum payload，使用 `serde(tag = "type", rename_all = "snake_case")` 并声明 `#[non_exhaustive]`。[E: codex-rs/protocol/src/protocol.rs:400][E: codex-rs/protocol/src/protocol.rs:402][E: codex-rs/protocol/src/protocol.rs:403] |
| `EventMsg` | agent 发给客户端的 response event tagged enum，使用 `serde(tag = "type", rename_all = "snake_case")`、TS tag、strum snake_case。[E: codex-rs/protocol/src/protocol.rs:1428][E: codex-rs/protocol/src/protocol.rs:1429][E: codex-rs/protocol/src/protocol.rs:1430][E: codex-rs/protocol/src/protocol.rs:1431][E: codex-rs/protocol/src/protocol.rs:1432] |
| `Submission.id` / `Event.id` | 输入 submission 与输出 event 的 correlation id；`Submission.id` 注释为 unique id for correlation，`Event.id` 注释为 correlated submission id。[E: codex-rs/protocol/src/protocol.rs:126][E: codex-rs/protocol/src/protocol.rs:127][E: codex-rs/protocol/src/protocol.rs:1420][E: codex-rs/protocol/src/protocol.rs:1421] |
| Turn | Codex 一次模型/工具工作单元[I]；`TurnStartedEvent` 和 `TurnCompleteEvent` 都带 `turn_id`，`TurnContext` 被定义为 single turn of the thread 的 context。[E: codex-rs/protocol/src/protocol.rs:2118][E: codex-rs/protocol/src/protocol.rs:2119][E: codex-rs/protocol/src/protocol.rs:2104][E: codex-rs/protocol/src/protocol.rs:2105][E: codex-rs/core/src/session/turn_context.rs:37] |
| `TurnContext` | 单轮 thread 执行上下文，聚合 config/auth/model/provider/telemetry/cwd/instructions/collaboration/personality/approval/sandbox/network/tools/features 等字段。[E: codex-rs/core/src/session/turn_context.rs:39][E: codex-rs/core/src/session/turn_context.rs:43][E: codex-rs/core/src/session/turn_context.rs:44][E: codex-rs/core/src/session/turn_context.rs:45][E: codex-rs/core/src/session/turn_context.rs:46][E: codex-rs/core/src/session/turn_context.rs:47][E: codex-rs/core/src/session/turn_context.rs:56][E: codex-rs/core/src/session/turn_context.rs:60][E: codex-rs/core/src/session/turn_context.rs:62][E: codex-rs/core/src/session/turn_context.rs:63][E: codex-rs/core/src/session/turn_context.rs:64][E: codex-rs/core/src/session/turn_context.rs:65][E: codex-rs/core/src/session/turn_context.rs:66][E: codex-rs/core/src/session/turn_context.rs:68][E: codex-rs/core/src/session/turn_context.rs:69][E: codex-rs/core/src/session/turn_context.rs:72][E: codex-rs/core/src/session/turn_context.rs:73] |
| `SessionTask` | core 内部驱动 turn/workflow 的 async trait，要求 `kind`、`span_name`、`run`，并提供 optional `abort`。[E: codex-rs/core/src/tasks/mod.rs:144][E: codex-rs/core/src/tasks/mod.rs:147][E: codex-rs/core/src/tasks/mod.rs:150][E: codex-rs/core/src/tasks/mod.rs:160][E: codex-rs/core/src/tasks/mod.rs:173] |
| `Codex` | high-level Codex interface；源码注释说明它作为 queue pair 发送 submissions 并接收 events。[E: codex-rs/core/src/session/mod.rs:359][E: codex-rs/core/src/session/mod.rs:361][E: codex-rs/core/src/session/mod.rs:362][E: codex-rs/core/src/session/mod.rs:363] |

## Persistence / history / undo

| Term | 中文解释 | Evidence |
|---|---|---|
| rollout | Codex 会话 transcript / replay persistence 的 wiki 术语[I]；recorder 注释说明 rollouts are recorded as JSONL，persistence policy 对 `RolloutItem` 决定哪些 item 写入 rollout 文件。[E: codex-rs/rollout/src/recorder.rs:68][E: codex-rs/rollout/src/recorder.rs:71][E: codex-rs/rollout/src/policy.rs:12][E: codex-rs/rollout/src/policy.rs:14][E: codex-rs/rollout/src/policy.rs:16][E: codex-rs/rollout/src/policy.rs:17][E: codex-rs/rollout/src/policy.rs:19] |
| `RolloutLine` | 单条 rollout JSONL line 的结构，包含 `timestamp` 和 flattened `RolloutItem`；recorder 写入 serialized JSON 并追加 newline。[E: codex-rs/protocol/src/protocol.rs:2992][E: codex-rs/protocol/src/protocol.rs:2993][E: codex-rs/protocol/src/protocol.rs:2995][E: codex-rs/rollout/src/recorder.rs:1461][E: codex-rs/rollout/src/recorder.rs:1463][E: codex-rs/rollout/src/recorder.rs:1465][E: codex-rs/rollout/src/recorder.rs:1483][E: codex-rs/rollout/src/recorder.rs:1484][E: codex-rs/rollout/src/recorder.rs:1485][E: codex-rs/rollout/src/recorder.rs:1486] |
| `SessionMeta` | rollout 中的 session metadata；源码注释说明它是 session-level data，`RolloutItem::SessionMeta` 包装 `SessionMetaLine`，字段包含 `ThreadId`、cwd、originator、cli_version、source、subagent metadata、model_provider、base_instructions、dynamic_tools、memory_mode。[E: codex-rs/protocol/src/protocol.rs:2796][E: codex-rs/protocol/src/protocol.rs:2802][E: codex-rs/protocol/src/protocol.rs:2803][E: codex-rs/protocol/src/protocol.rs:2807][E: codex-rs/protocol/src/protocol.rs:2808][E: codex-rs/protocol/src/protocol.rs:2809][E: codex-rs/protocol/src/protocol.rs:2811][E: codex-rs/protocol/src/protocol.rs:2814][E: codex-rs/protocol/src/protocol.rs:2817][E: codex-rs/protocol/src/protocol.rs:2820][E: codex-rs/protocol/src/protocol.rs:2821][E: codex-rs/protocol/src/protocol.rs:2825][E: codex-rs/protocol/src/protocol.rs:2827][E: codex-rs/protocol/src/protocol.rs:2829][E: codex-rs/protocol/src/protocol.rs:2854][E: codex-rs/protocol/src/protocol.rs:2856][E: codex-rs/protocol/src/protocol.rs:2863][E: codex-rs/protocol/src/protocol.rs:2864] |
| `ResponseItem` | `ResponseItem` tagged enum；包含 message、reasoning、shell/function/custom tool calls、web/image calls、ghost snapshot、compaction、other 等。[E: codex-rs/protocol/src/models.rs:439][E: codex-rs/protocol/src/models.rs:440][E: codex-rs/protocol/src/models.rs:441][E: codex-rs/protocol/src/models.rs:458][E: codex-rs/protocol/src/models.rs:469][E: codex-rs/protocol/src/models.rs:479][E: codex-rs/protocol/src/models.rs:516][E: codex-rs/protocol/src/models.rs:555][E: codex-rs/protocol/src/models.rs:575][E: codex-rs/protocol/src/models.rs:584][E: codex-rs/protocol/src/models.rs:588][E: codex-rs/protocol/src/models.rs:592] |
| ghost snapshot | `ResponseItem::GhostSnapshot` 是 harness-generated but considered model response 的 item，payload 是 `ghost_commit`。[E: codex-rs/protocol/src/models.rs:583][E: codex-rs/protocol/src/models.rs:584][E: codex-rs/protocol/src/models.rs:585] |
| ghost commit | `GhostSnapshotTask` 在 blocking task 中调用 `create_ghost_commit_with_report()`，成功后记录 `ResponseItem::GhostSnapshot { ghost_commit }`，日志文本为 `ghost commit captured`。[E: codex-rs/core/src/tasks/ghost_snapshot.rs:85][E: codex-rs/core/src/tasks/ghost_snapshot.rs:88][E: codex-rs/core/src/tasks/ghost_snapshot.rs:111][E: codex-rs/core/src/tasks/ghost_snapshot.rs:115] |
| undo | `UndoTask` 发送 `UndoStarted`，从 history 倒序找 `ResponseItem::GhostSnapshot`，再调用 `restore_ghost_commit_with_options()` restore。[E: codex-rs/core/src/tasks/undo.rs:49][E: codex-rs/core/src/tasks/undo.rs:76][E: codex-rs/core/src/tasks/undo.rs:80][E: codex-rs/core/src/tasks/undo.rs:82][E: codex-rs/core/src/tasks/undo.rs:99] |
| compaction | `ContextCompactedEvent` 是空 struct；`CompactedItem` 存储 summary message 和 optional replacement history。[E: codex-rs/protocol/src/protocol.rs:2101][E: codex-rs/protocol/src/protocol.rs:2872][E: codex-rs/protocol/src/protocol.rs:2873][E: codex-rs/protocol/src/protocol.rs:2875] |

## Tools / model interaction

| Term | 中文解释 | Evidence |
|---|---|---|
| `ToolSpec` | Responses API model-visible tool spec union，包含 function、namespace、tool_search、local_shell、image_generation、web_search。[E: codex-rs/tools/src/tool_spec.rs:22][E: codex-rs/tools/src/tool_spec.rs:24][E: codex-rs/tools/src/tool_spec.rs:26][E: codex-rs/tools/src/tool_spec.rs:28][E: codex-rs/tools/src/tool_spec.rs:34][E: codex-rs/tools/src/tool_spec.rs:36][E: codex-rs/tools/src/tool_spec.rs:44] |
| `ToolHandlerKind` | tool runtime handler kind enum，覆盖 apply_patch、MCP、dynamic tool、plan、request tools、shell/unified exec、multi-agent、JS REPL 等 dispatch categories。[E: codex-rs/tools/src/tool_registry_plan_types.rs:12][E: codex-rs/tools/src/tool_registry_plan_types.rs:13][E: codex-rs/tools/src/tool_registry_plan_types.rs:14][E: codex-rs/tools/src/tool_registry_plan_types.rs:19][E: codex-rs/tools/src/tool_registry_plan_types.rs:21][E: codex-rs/tools/src/tool_registry_plan_types.rs:25][E: codex-rs/tools/src/tool_registry_plan_types.rs:27][E: codex-rs/tools/src/tool_registry_plan_types.rs:28][E: codex-rs/tools/src/tool_registry_plan_types.rs:29][E: codex-rs/tools/src/tool_registry_plan_types.rs:30][E: codex-rs/tools/src/tool_registry_plan_types.rs:31][E: codex-rs/tools/src/tool_registry_plan_types.rs:32][E: codex-rs/tools/src/tool_registry_plan_types.rs:33][E: codex-rs/tools/src/tool_registry_plan_types.rs:35][E: codex-rs/tools/src/tool_registry_plan_types.rs:36][E: codex-rs/tools/src/tool_registry_plan_types.rs:40] |
| dynamic tool | `DynamicToolSpec` 描述 runtime-provided tool；`DynamicToolCallRequest` 带 `call_id`、`turn_id`、namespace/tool/arguments；`DynamicToolResponse` 带 content items 和 success。[E: codex-rs/protocol/src/dynamic_tools.rs:10][E: codex-rs/protocol/src/dynamic_tools.rs:22][E: codex-rs/protocol/src/dynamic_tools.rs:23][E: codex-rs/protocol/src/dynamic_tools.rs:24][E: codex-rs/protocol/src/dynamic_tools.rs:26][E: codex-rs/protocol/src/dynamic_tools.rs:27][E: codex-rs/protocol/src/dynamic_tools.rs:28][E: codex-rs/protocol/src/dynamic_tools.rs:33][E: codex-rs/protocol/src/dynamic_tools.rs:34][E: codex-rs/protocol/src/dynamic_tools.rs:35] |
| MCP tool | `McpInvocation` 由 server、tool、arguments 构成；MCP begin/end event 用同一 `call_id` pair。[E: codex-rs/protocol/src/protocol.rs:2419][E: codex-rs/protocol/src/protocol.rs:2421][E: codex-rs/protocol/src/protocol.rs:2423][E: codex-rs/protocol/src/protocol.rs:2425][E: codex-rs/protocol/src/protocol.rs:2431][E: codex-rs/protocol/src/protocol.rs:2441] |
| code mode | feature flag `CodeMode` 启用 minimal JavaScript mode，`CodeModeOnly` 限制 model-visible tools 到 code mode entrypoints。[E: codex-rs/features/src/lib.rs:82][E: codex-rs/features/src/lib.rs:83][E: codex-rs/features/src/lib.rs:84][E: codex-rs/features/src/lib.rs:85] |
| JS REPL | feature flag `JsRepl` 启用 persistent Node-backed JavaScript REPL；JS REPL child env 注入 `CODEX_JS_TMP_DIR` 和 optional `CODEX_JS_REPL_NODE_MODULE_DIRS`。[E: codex-rs/features/src/lib.rs:80][E: codex-rs/features/src/lib.rs:81][E: codex-rs/features/src/lib.rs:636][E: codex-rs/core/src/tools/js_repl/mod.rs:1038][E: codex-rs/core/src/tools/js_repl/mod.rs:1039][E: codex-rs/core/src/tools/js_repl/mod.rs:1040][E: codex-rs/core/src/tools/js_repl/mod.rs:1042][E: codex-rs/core/src/tools/js_repl/mod.rs:1044][E: codex-rs/core/src/tools/js_repl/mod.rs:1046][E: codex-rs/core/src/tools/js_repl/mod.rs:1048] |
| request permissions | `RequestPermissionsArgs` 由 optional reason 与 requested permission profile 构成；response 带 permissions 和 grant scope。[E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_permissions.rs:52][E: codex-rs/protocol/src/request_permissions.rs:53][E: codex-rs/protocol/src/request_permissions.rs:57][E: codex-rs/protocol/src/request_permissions.rs:58][E: codex-rs/protocol/src/request_permissions.rs:60] |
| request user input | `RequestUserInputArgs` 包含 questions；question 有 id/header/question/isOther/isSecret/options，Rust 字段 `is_other` / `is_secret` 在 serde/schemars/TS 上重命名为 `isOther` / `isSecret`。[E: codex-rs/protocol/src/request_user_input.rs:15][E: codex-rs/protocol/src/request_user_input.rs:16][E: codex-rs/protocol/src/request_user_input.rs:17][E: codex-rs/protocol/src/request_user_input.rs:18][E: codex-rs/protocol/src/request_user_input.rs:19][E: codex-rs/protocol/src/request_user_input.rs:20][E: codex-rs/protocol/src/request_user_input.rs:21][E: codex-rs/protocol/src/request_user_input.rs:22][E: codex-rs/protocol/src/request_user_input.rs:23][E: codex-rs/protocol/src/request_user_input.rs:24][E: codex-rs/protocol/src/request_user_input.rs:25][E: codex-rs/protocol/src/request_user_input.rs:26][E: codex-rs/protocol/src/request_user_input.rs:28][E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/request_user_input.rs:33] |
| `TurnItem` | normalized turn-item stream tagged union[I]；源码 `TurnItem` tagged union 覆盖 user message、hook prompt、agent message、plan、reasoning、web search、image generation、context compaction。[E: codex-rs/protocol/src/items.rs:28][E: codex-rs/protocol/src/items.rs:29][E: codex-rs/protocol/src/items.rs:30][E: codex-rs/protocol/src/items.rs:31][E: codex-rs/protocol/src/items.rs:32][E: codex-rs/protocol/src/items.rs:33][E: codex-rs/protocol/src/items.rs:34][E: codex-rs/protocol/src/items.rs:35][E: codex-rs/protocol/src/items.rs:36] |

## Safety / sandbox / approval

| Term | 中文解释 | Evidence |
|---|---|---|
| sandbox mode | `SandboxMode` config-facing enum 有 `read-only`、`workspace-write`、`danger-full-access` 三种，default 是 `ReadOnly`。[E: codex-rs/protocol/src/config_types.rs:60][E: codex-rs/protocol/src/config_types.rs:61][E: codex-rs/protocol/src/config_types.rs:62][E: codex-rs/protocol/src/config_types.rs:63][E: codex-rs/protocol/src/config_types.rs:65][E: codex-rs/protocol/src/config_types.rs:66][E: codex-rs/protocol/src/config_types.rs:68][E: codex-rs/protocol/src/config_types.rs:69] |
| approval reviewer | `ApprovalsReviewer` 可为 `User` 或 `GuardianSubagent`，default 是 `User`。[E: codex-rs/protocol/src/config_types.rs:77][E: codex-rs/protocol/src/config_types.rs:82][E: codex-rs/protocol/src/config_types.rs:83][E: codex-rs/protocol/src/config_types.rs:84][E: codex-rs/protocol/src/config_types.rs:85] |
| guardian | guardian 是 approval review path 的源码术语；`ApprovalsReviewer` 注释说明 approval requests 可 routed to guardian subagent，`GuardianAssessmentEvent` 带 review `id`、turn_id、status、risk_level、user_authorization、rationale、decision_source、action。[E: codex-rs/protocol/src/config_types.rs:77][E: codex-rs/protocol/src/config_types.rs:79][E: codex-rs/protocol/src/config_types.rs:80][E: codex-rs/protocol/src/approvals.rs:180][E: codex-rs/protocol/src/approvals.rs:182][E: codex-rs/protocol/src/approvals.rs:190][E: codex-rs/protocol/src/approvals.rs:191][E: codex-rs/protocol/src/approvals.rs:195][E: codex-rs/protocol/src/approvals.rs:199][E: codex-rs/protocol/src/approvals.rs:203][E: codex-rs/protocol/src/approvals.rs:207][E: codex-rs/protocol/src/approvals.rs:209] |
| seatbelt | macOS sandbox implementation name；non-macOS seatbelt transform returns "seatbelt sandbox is only available on macOS"，macOS sandbox env marker sets `CODEX_SANDBOX=seatbelt`。[E: codex-rs/sandboxing/src/lib.rs:42][E: codex-rs/sandboxing/src/lib.rs:43][E: codex-rs/core/src/sandboxing/mod.rs:128][E: codex-rs/core/src/sandboxing/mod.rs:130] |
| Landlock | Linux legacy sandbox fallback terminology；linux-sandbox README says legacy Landlock + mount protections remain available as explicit fallback and `features.use_legacy_landlock = true` forces it。[E: codex-rs/linux-sandbox/README.md:40][E: codex-rs/linux-sandbox/README.md:42][E: codex-rs/linux-sandbox/README.md:43] |
| bubblewrap / bwrap | Linux sandbox preferred path; linux-sandbox README states Codex prefers first `bwrap` on PATH outside cwd and falls back to vendored bubblewrap if missing。[E: codex-rs/linux-sandbox/README.md:10][E: codex-rs/linux-sandbox/README.md:11][E: codex-rs/linux-sandbox/README.md:14][E: codex-rs/linux-sandbox/README.md:15] |
| network sandbox | `NetworkSandboxPolicy` enum has `Restricted` and `Enabled`; `is_enabled()` matches only `Enabled`。[E: codex-rs/protocol/src/permissions.rs:28][E: codex-rs/protocol/src/permissions.rs:30][E: codex-rs/protocol/src/permissions.rs:31][E: codex-rs/protocol/src/permissions.rs:36] |
| managed network proxy | network proxy sets proxy URL env vars and markers like `CODEX_NETWORK_PROXY_ACTIVE` / `CODEX_NETWORK_ALLOW_LOCAL_BINDING`。[E: codex-rs/network-proxy/src/proxy.rs:346][E: codex-rs/network-proxy/src/proxy.rs:366][E: codex-rs/network-proxy/src/proxy.rs:367][E: codex-rs/network-proxy/src/proxy.rs:480][E: codex-rs/network-proxy/src/proxy.rs:482][E: codex-rs/network-proxy/src/proxy.rs:483][E: codex-rs/network-proxy/src/proxy.rs:484][E: codex-rs/network-proxy/src/proxy.rs:493][E: codex-rs/network-proxy/src/proxy.rs:514][E: codex-rs/network-proxy/src/proxy.rs:518][E: codex-rs/network-proxy/src/proxy.rs:533][E: codex-rs/network-proxy/src/proxy.rs:534][E: codex-rs/network-proxy/src/proxy.rs:537] |
| exec-server environment | `CODEX_EXEC_SERVER_URL` websocket URL creates remote environment and makes it default; `none` disables default environment access。[E: codex-rs/exec-server/src/environment.rs:14][E: codex-rs/exec-server/src/environment.rs:20][E: codex-rs/exec-server/src/environment.rs:21][E: codex-rs/exec-server/src/environment.rs:24][E: codex-rs/exec-server/src/environment.rs:25][E: codex-rs/exec-server/src/environment.rs:88][E: codex-rs/exec-server/src/environment.rs:89][E: codex-rs/exec-server/src/environment.rs:93][E: codex-rs/exec-server/src/environment.rs:95][E: codex-rs/exec-server/src/environment.rs:97][E: codex-rs/exec-server/src/environment.rs:254] |

## Feature / collaboration / UI shorthand

| Term | 中文解释 | Evidence |
|---|---|---|
| feature flag | `Feature` 是 unique features toggled via configuration；`FEATURES` registry 绑定 id、key、stage、default_enabled。[E: codex-rs/features/src/lib.rs:70][E: codex-rs/features/src/lib.rs:72][E: codex-rs/features/src/lib.rs:593][E: codex-rs/features/src/lib.rs:594][E: codex-rs/features/src/lib.rs:595][E: codex-rs/features/src/lib.rs:596][E: codex-rs/features/src/lib.rs:597][E: codex-rs/features/src/lib.rs:600] |
| rollout feature | 与 rollout/持久化体验相关的 feature key 归类[I]；`GhostCommit` key 是 `undo`，`ShellTool` key 是 `shell_tool`，`WorkspaceDependencies` key 是 `workspace_dependencies`；这些是 `FeatureSpec.key` 字符串。[E: codex-rs/features/src/lib.rs:595][E: codex-rs/features/src/lib.rs:603][E: codex-rs/features/src/lib.rs:604][E: codex-rs/features/src/lib.rs:609][E: codex-rs/features/src/lib.rs:610][E: codex-rs/features/src/lib.rs:998][E: codex-rs/features/src/lib.rs:999] |
| collaboration / multi-agent | feature `Collab` key 是 `multi_agent` 且 default true；`MultiAgentV2` key 是 `multi_agent_v2` 且 default false。[E: codex-rs/features/src/lib.rs:798][E: codex-rs/features/src/lib.rs:799][E: codex-rs/features/src/lib.rs:801][E: codex-rs/features/src/lib.rs:804][E: codex-rs/features/src/lib.rs:805][E: codex-rs/features/src/lib.rs:807] |
| review mode | `ReviewTask` 的 `TaskKind` 是 `Review`，span name 是 `session_task.review`，它启动 sub-codex review conversation 并最终退出 review mode。[E: codex-rs/core/src/tasks/review.rs:52][E: codex-rs/core/src/tasks/review.rs:56][E: codex-rs/core/src/tasks/review.rs:73][E: codex-rs/core/src/tasks/review.rs:85] |
| `/experimental` feature menu | `Stage::Experimental` carries name/menu_description/announcement; `Stage` methods expose menu name/description/announcement。[E: codex-rs/features/src/lib.rs:29][E: codex-rs/features/src/lib.rs:30][E: codex-rs/features/src/lib.rs:31][E: codex-rs/features/src/lib.rs:32][E: codex-rs/features/src/lib.rs:45][E: codex-rs/features/src/lib.rs:52][E: codex-rs/features/src/lib.rs:53][E: codex-rs/features/src/lib.rs:54][E: codex-rs/features/src/lib.rs:64] |
| app-server | workspace member `app-server` exists; app-server CLI accepts transport endpoint URL and session source options。[E: codex-rs/Cargo.toml:9][E: codex-rs/app-server/src/main.rs:19][E: codex-rs/app-server/src/main.rs:30] |
| TUI | workspace member `tui` exists; TUI session log can be enabled by `CODEX_TUI_RECORD_SESSION`。[E: codex-rs/Cargo.toml:64][E: codex-rs/tui/src/session_log.rs:81] |
| local shell / unified exec | `ToolSpec` includes `LocalShell`, and `ToolHandlerKind` includes `Shell` and `UnifiedExec`; feature `UnifiedExec` key is `unified_exec`。[E: codex-rs/tools/src/tool_spec.rs:34][E: codex-rs/tools/src/tool_registry_plan_types.rs:33][E: codex-rs/tools/src/tool_registry_plan_types.rs:40][E: codex-rs/features/src/lib.rs:616] |
| image generation | `ToolSpec::ImageGeneration` serializes type `image_generation`; feature `ImageGeneration` key is `image_generation` and default true。[E: codex-rs/tools/src/tool_spec.rs:35][E: codex-rs/tools/src/tool_spec.rs:36][E: codex-rs/features/src/lib.rs:868][E: codex-rs/features/src/lib.rs:869][E: codex-rs/features/src/lib.rs:871] |

## Sources

- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/dynamic_tools.rs`
- `codex-rs/protocol/src/request_permissions.rs`
- `codex-rs/protocol/src/request_user_input.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/turn_context.rs`
- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/tasks/review.rs`
- `codex-rs/core/src/tasks/ghost_snapshot.rs`
- `codex-rs/core/src/tasks/undo.rs`
- `codex-rs/core/src/sandboxing/mod.rs`
- `codex-rs/sandboxing/src/lib.rs`
- `codex-rs/linux-sandbox/README.md`
- `codex-rs/features/src/lib.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/protocol/src/approvals.rs`
- `codex-rs/protocol/src/items.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/permissions.rs`
- `codex-rs/core/src/tools/js_repl/mod.rs`
- `codex-rs/exec-server/src/environment.rs`
- `codex-rs/network-proxy/src/proxy.rs`
- `codex-rs/Cargo.toml`
- `codex-rs/app-server/src/main.rs`
- `codex-rs/tui/src/session_log.rs`
- `codex-rs/README.md`

## 相关

- [spine.overview](../spine/overview.md)
- [spine.sq-eq-architecture](../spine/sq-eq-architecture.md)
- [ref.protocol-op](protocol-op.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
- [ref.data-model](data-model.md)
- [ref.key-types](key-types.md)
