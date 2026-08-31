---
id: subsys.core.approval-guardian-v2
title: Guardian V2 风险分类与预审
kind: subsystem
tier: T2
source: [codex-rs/ext/guardian-v2/src/lib.rs, codex-rs/ext/guardian-v2/src/async_scorer/mod.rs, codex-rs/ext/guardian-v2/src/async_scorer/config.rs, codex-rs/ext/guardian-v2/src/async_scorer/extension.rs, codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs, codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs, codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs, codex-rs/ext/guardian-v2/src/sync_reviewer/reviewer_config.rs, codex-rs/ext/guardian-v2/src/sync_reviewer/prompt.rs, codex-rs/guardian-context/src/lib.rs, codex-rs/guardian-context/src/transcript.rs, codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/app-server/src/extensions.rs, codex-rs/protocol/src/security_risk.rs, codex-rs/core/src/guardian/review.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/core/src/codex_delegate.rs, codex-rs/ext/extension-api/src/registry.rs, codex-rs/ext/extension-api/src/contributors.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/mcp-server/src/message_processor.rs]
symbols: [codex_guardian_v2::install, GuardianV2Extension, GuardianV2Config, LunaSampler, LunaSamplingRequest, StrictReviewReason, GuardianReviewerExtension, SectionRegistry, ContextTarget]
related: [subsys.core.approval-guardian, subsys.core.approval-policy, tool.request-permissions, subsys.core.tool-router]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> Guardian V2 crate `codex-guardian-v2` 拆成 `async_scorer`（Luna 异步风险分类）和 `sync_reviewer`（同步 reviewer 接线）。`install` 先注册 crate 根上的 thread-lifecycle `GuardianExtension`（写入 fork source thread id），再装 scorer 与 reviewer。共享 transcript/truncation 的目标 crate 是 `codex-guardian-context`；当前 scorer/reviewer 仍各自渲染 transcript，guardian-context 尚未被这两个模块 `use`。[E: codex-rs/ext/guardian-v2/src/lib.rs:15][E: codex-rs/ext/guardian-v2/src/lib.rs:92][E: codex-rs/ext/guardian-v2/src/lib.rs:93][E: codex-rs/guardian-context/src/lib.rs:34][E: codex-rs/guardian-context/src/lib.rs:146]

V1 自动审批审查（child Codex、`GuardianAssessment`、circuit breaker）仍在 [approval-guardian](approval-guardian.md)。本节点覆盖 V2 crate 拆分、Luna 短路径，以及它如何挂进 app-server / V1 `fast_approval_decision`。

## 能回答的问题

- `async_scorer` 和 `sync_reviewer` 各自做什么，谁先谁后？
- `features.guardianv2` 哪些字段可配置，默认阈值和 transcript 来源是什么？
- Luna 如何采样、分数如何落成 `SecurityRiskScore`，`fast_decision` 何时 `Approved`？
- 共享 transcript 现在在哪个 crate，Guardian reviewer turn 暴露哪些工具？
- app-server 如何 install V2，V1 reviewer session 为什么看不到它？

## 职责边界

| 层 | 职责 | 不是 |
|---|---|---|
| `async_scorer` | Luna 异步打分、`ApprovalReviewContributor::fast_decision` 低风险短路径、把 `action_risk` 写入 `SecurityRiskScore` | 不 spawn child Codex，不产出 `GuardianAssessment` |
| `sync_reviewer` | 注册 reviewer thread context，准备 `StartThreadOptions` / review prompt | `build_review_prompt` 在非 test 构建标 `dead_code`，完整同步审查仍由 V1 `core/src/guardian` 执行 [E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:85] |
| `guardian-context` | 声明 Sync/Async 共享的 `SectionRegistry`、`collect_transcript`、truncation | 当前 `guardian-v2` Cargo.toml 未依赖该 crate [E: codex-rs/guardian-context/src/lib.rs:146] |
| `core/src/guardian` | V1 auto-reviewer：child session、JSON assessment、fail-closed | 不实现 Luna classifier |
| crate 根 `GuardianExtension` | thread start 时写入 `GuardianThreadContext`（fork source） | 不是旧独立 crate `ext/guardian`（已删除） |
| app-server `thread_extensions` | 只调一次 `codex_guardian_v2::install` | 不再单独 `codex_guardian::install` |

`Feature::GuardianV2` key 是 `guardianv2`，stage `UnderDevelopment`，默认关闭；`Feature::GuardianApproval` key 是 `guardian_approval`，默认开启。async scorer 只在两个 feature 都开时激活。[E: codex-rs/features/src/lib.rs:1488][E: codex-rs/features/src/lib.rs:1512][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:138]

## 关键 crate / 文件

| 文件 | 角色 |
|---|---|
| `codex-rs/ext/guardian-v2/src/lib.rs` | 公开 `install`：thread-lifecycle `GuardianExtension` + `async_scorer::install` + `sync_reviewer::install`。[E: codex-rs/ext/guardian-v2/src/lib.rs:82] |
| `codex-rs/ext/guardian-v2/src/async_scorer/config.rs` | 从 `features.guardianv2` 解析 `GuardianV2Config`：阈值、lag、transcript、review scope。[E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:51] |
| `codex-rs/ext/guardian-v2/src/async_scorer/extension.rs` | thread start、tool-start 分类、`fast_decision` 短路径。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:241][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:387] |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs` | Luna WebSocket 连接池、tool-less sample。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:52] |
| `codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs` | reviewer extension：`on_thread_ready` 写入 parent thread id，暴露 `prepare_reviewer_options`。[E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:150] |
| `codex-rs/guardian-context/src/lib.rs` | `ContextTarget::{Sync,Async}`、`SectionRegistry`、`default_registry()`。[E: codex-rs/guardian-context/src/lib.rs:34] |
| `codex-rs/features/src/feature_configs.rs` | `GuardianV2ConfigToml` / transcript / review-scope 用户配置 schema。[E: codex-rs/features/src/feature_configs.rs:126] |
| `codex-rs/app-server/src/extensions.rs` | 生产路径 `codex_guardian_v2::install`。[E: codex-rs/app-server/src/extensions.rs:100] |
| `codex-rs/protocol/src/security_risk.rs` | `SecurityRiskScore` rollout/thread snapshot。[E: codex-rs/protocol/src/security_risk.rs:13] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `GuardianV2ConfigToml` | `enabled`、`free_guardian`、`persist_scores`、`classifier_instructions`、`review_threshold` (0.0–1.0)、`max_tool_call_lag`、`reasoning_effort`、token 上限、`transcript`、`review_scope`。[E: codex-rs/features/src/feature_configs.rs:126][E: codex-rs/features/src/feature_configs.rs:139] |
| `GuardianV2TranscriptSource` | `tool_calls` / `tool_outputs` / `reasoning`。[E: codex-rs/features/src/feature_configs.rs:79] |
| `GuardianV2Config` | runtime 解析结果。无自定义 classifier 时默认 `review_threshold=0.5`；有自定义 instructions 且未写阈值则用 legacy `0.8`。`reasoning_effort=Low`，action token 默认 10_000（夹在 100–100_000），`max_tool_call_lag` 默认 2，`persist_scores` 默认 false，`reuse_parent_compaction` 默认 true，transcript 默认 sources=`[ToolCalls, ToolOutputs]`，`include_images` 默认 true。[E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:21][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:156][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:233][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:244] |
| `GuardianV2ReviewScope` | 默认 `ComputerUseOnly`（`computer_use_only` 缺省 true）；否则 `Standard { sandboxed_exec_commands }`。[E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:246] |
| `LunaSamplerConfig` | provider、HTTP factory、agent-identity policy、session/thread id、originator、`free_guardian`、service tier、`luna_compaction_hash`。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:66] |
| `LunaSamplingRequest` | trusted instructions / review evidence / skill paths、untrusted `input`、optional images 与 parent compaction、`reasoning_effort`、parent/root turn id。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:92] |
| `SecurityRiskScore` | `BTreeMap<String, f64>` + optional `call_id` / `action` / `sampled_at`。doc comment 要求它不进 model-visible context。[E: codex-rs/protocol/src/security_risk.rs:13][I] |
| `StrictReviewReason` | `ElevatedRisk` 或 `StaleScore`，写入 thread store 解释为何不能走 fast path。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:101] |

## 控制流

1. app-server `thread_extensions()` 调用 `codex_guardian_v2::install(...)`。crate 根 `install` 注册 fork-source thread lifecycle，然后 `async_scorer::install`（thread/approval-review/skill-invocation/tool-lifecycle）和 `sync_reviewer::install`（reviewer thread lifecycle）。[E: codex-rs/app-server/src/extensions.rs:100][E: codex-rs/ext/guardian-v2/src/lib.rs:92][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:875]
2. async scorer `on_thread_start` 要求 `Feature::GuardianV2` 且 `Feature::GuardianApproval`。配置非法只 emit warning 并返回；成功后 thread store 放入 `LunaSampler`、`GuardianV2Config`、`GuardianV2Enabled`，并 `prewarm`。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:138][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:208]
3. sampler 模型固定 `gpt-5.6-luna`。非 test 初始打开 8 条 Responses WebSocket，池上限 16，连接年龄 55 分钟。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:52][E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:56]
4. `on_tool_start` 调用 `score_tool`：按 `review_scope` 决定是否分类，然后 `tokio::spawn` 异步采样，不阻塞 tool 执行。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:387][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:566]
5. Luna 输出必须是整段 `"high"` 或 `"low"`，映射为 `action_risk` `1.0` / `0.0`。`insert_if` 只接受更新的 `sampled_at`；`persist_scores` 且非 ephemeral 才 `append_rollout_items`。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:726][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:778]
6. V1 `run_guardian_review` 在开 child session 之前调用 `extensions.fast_approval_decision(...)`。registry 按安装顺序取第一个 `Some(ReviewDecision)`。[E: codex-rs/core/src/guardian/review.rs:352][E: codex-rs/ext/extension-api/src/registry.rs:220]
7. V2 `fast_decision` 读 `SecurityRiskScore.scores["action_risk"]`。仅当 `score < review_threshold` 且 authorization 未变、tool-call lag 未超限时返回 `Approved`。缺分、分数 ≥ 阈值、stale score、scoring failure 不 claim。默认 `ComputerUseOnly` 时，非 node-repl MCP 调用直接 deferred。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:363][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:252]

`auto_review_required_for_model` 为真时，V1 仍允许走 extension fast path **只要** `Feature::GuardianV2` 开启；未开 V2 时 mandatory-model 会跳过短路径。retries、escalated `exec_command` 和 `require_synchronous_review` 一律不走 fast path。[E: codex-rs/core/src/guardian/review.rs:337][E: codex-rs/core/src/guardian/review.rs:325]

## Luna 采样与 compaction

`LunaSampler` 只在 parent compaction hash 与 Luna 自己的 `luna_compaction_hash` 兼容时复用 encrypted parent compaction。分类失败写 fail-closed `action_risk=1.0`。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:394][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:518]

被 supersede 的请求返回 `LunaSamplerError::Superseded`，不覆盖已有分数。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:721]

V1 reviewer 另有 `Feature::GuardianReuseParentCompaction`（默认关），那是 child Codex session 的 compaction 复用，不是 Luna hash 比较。[E: codex-rs/features/src/lib.rs:1494][E: codex-rs/core/src/guardian/review_session.rs:519]

## 与 V1 reviewer 的隔离

V1 reviewer 通过 `run_codex_thread_interactive(..., SubAgentSource::Other("guardian"))` spawn。guardian reviewer source 使用 `empty_extension_registry()`，不继承 parent 上的 V2 / MCP / skills 等 extensions。[E: codex-rs/core/src/guardian/review_session.rs:856][E: codex-rs/core/src/codex_delegate.rs:110]

`is_basic_session_source` 同时识别 `SubAgent(Other("guardian"))` 与 `Internal(InternalSessionSource::Guardian)`。[E: codex-rs/core/src/guardian/review.rs:214]

`build_guardian_review_session_config` 会 `features.disable(Feature::GuardianV2)`（以及 Collab、MultiAgentV2、Apps、Plugins、hooks、web search）。[E: codex-rs/core/src/guardian/review_session.rs:1560]

Guardian reviewer 的 model tool surface 由 `add_core_tool_sources` 单独收紧：只在全部 environment 都是 `PermissionProfile::Managed`、且 `Feature::ShellTool` + `Feature::UnifiedExec` 开启时注册 `exec_command` / `write_stdin`，以及 `Feature::ViewImage` 开启时的 `view_image`；随后 `return`。guardian turn 还可以挂只读 `history.*` extension tools，但不走 MCP / hosted / 普通 utility。[E: codex-rs/core/src/tools/spec_plan.rs:989][E: codex-rs/core/src/tools/spec_plan.rs:1009][E: codex-rs/core/src/tools/spec_plan.rs:155]

## 设计动机与权衡

- V2 把“便宜的 Luna 打分”和“贵的 child Codex 审查”拆开：低风险动作可以跳过 V1 session，高风险仍走 fail-closed 的 V1 assessment。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:373][E: codex-rs/core/src/guardian/review.rs:352][I]
- 分类在 `on_tool_start` 异步进行，是为了不把 Luna 延迟加到每条 tool 的关键路径；代价是 approval 可能先于分数到达，此时 V2 不 claim。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:566][I]
- 默认 `ComputerUseOnly` 把 fast path 收窄到 browser/computer-use，避免普通 shell 被低阈值自动放行。[E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:246][I]
- `guardian-context` 把 Sync/Async 的 section 收集做成可复用 registry，避免两套 truncation 继续分叉；接线尚未完成，且 `codex-guardian-v2` 未声明对该 crate 的依赖。[E: codex-rs/guardian-context/src/lib.rs:146][I]

## Gotcha

- 生产 `codex_guardian_v2::install` 只有 app-server `thread_extensions`。TUI/exec 经 embedded/remote app-server 继承这份 registry，仍受 `guardianv2` + `guardian_approval` 双 feature 门控；MCP server 与 `empty_extension_registry()` host（含 V1 reviewer）不会自己 install V2。[E: codex-rs/app-server/src/extensions.rs:100][E: codex-rs/mcp-server/src/message_processor.rs:69][E: codex-rs/core/src/codex_delegate.rs:110]
- V2 短路径只返回 `Approved`。它从不在 `fast_decision` 里 deny；高风险是“不 claim”，不是 V2 deny。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:374]
- Luna 输出不再是 structured `{ scores: { action_risk } }`，而是第一个 token `high` / `low`。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:726][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:25]
- 默认 transcript 含 tool calls/outputs，并可带 images；要加 reasoning 必须配置 `features.guardianv2.transcript.sources`。[E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:263]
- Luna 输出超过 8KiB 或缺少 assistant text 会失败；失败写 fail-closed 高分或 warning，后续 approval 走 V1。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:55][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:796]
- 旧路径 `ext/guardian-v2/src/config.rs` / `extension.rs` / `sampler.rs` / `transcript.rs` 已不存在，必须改读 `async_scorer/` 与 `sync_reviewer/`。

## Sources

- `codex-rs/ext/guardian-v2/src/lib.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/mod.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/config.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/extension.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs`
- `codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs`
- `codex-rs/ext/guardian-v2/src/sync_reviewer/reviewer_config.rs`
- `codex-rs/ext/guardian-v2/src/sync_reviewer/prompt.rs`
- `codex-rs/guardian-context/src/lib.rs`
- `codex-rs/guardian-context/src/transcript.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/app-server/src/extensions.rs`
- `codex-rs/protocol/src/security_risk.rs`
- `codex-rs/core/src/guardian/review.rs`
- `codex-rs/core/src/guardian/review_session.rs`
- `codex-rs/core/src/codex_delegate.rs`
- `codex-rs/ext/extension-api/src/registry.rs`
- `codex-rs/ext/extension-api/src/contributors.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/mcp-server/src/message_processor.rs`

## 相关

- [Guardian V1 自动审批审查](approval-guardian.md)
- [Approval policy](approval-policy.md)
- [request_permissions 工具](../../surface/tools/request-permissions.md)
- [Tool router](tool-router.md)
