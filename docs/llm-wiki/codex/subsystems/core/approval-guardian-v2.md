---
id: subsys.core.approval-guardian-v2
title: Guardian V2 风险分类与预审
kind: subsystem
tier: T2
source: [codex-rs/ext/guardian-v2/src/lib.rs, codex-rs/ext/guardian-v2/Cargo.toml, codex-rs/ext/guardian-v2/src/async_scorer/mod.rs, codex-rs/ext/guardian-v2/src/async_scorer/config.rs, codex-rs/ext/guardian-v2/src/async_scorer/extension.rs, codex-rs/ext/guardian-v2/src/async_scorer/approval.rs, codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs, codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs, codex-rs/ext/guardian-v2/src/async_scorer/coverage.rs, codex-rs/ext/guardian-v2/src/async_scorer/parent_compaction.rs, codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs, codex-rs/ext/guardian-reviewer/src/lib.rs, codex-rs/ext/guardian-reviewer/src/review.rs, codex-rs/ext/guardian-reviewer/src/settings.rs, codex-rs/guardian-context/src/lib.rs, codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/app-server/src/extensions.rs, codex-rs/protocol/src/security_risk.rs, codex-rs/core/src/guardian/decision.rs, codex-rs/core/src/guardian/review.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/core/src/guardian/review_session_context.rs, codex-rs/core/src/guardian/reviewer_config.rs, codex-rs/core/src/codex_delegate.rs, codex-rs/ext/extension-api/src/registry.rs, codex-rs/core/src/tools/spec_plan.rs]
symbols: [codex_guardian_v2::install, GuardianV2Extension, GuardianV2Config, LunaSampler, LunaSamplingRequest, GuardianReviewerExtension, GuardianApprovalReviewer, GuardianPolicy, SectionRegistry, ContextTarget]
related: [subsys.core.approval-guardian, subsys.core.approval-policy, tool.request-permissions, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> Guardian V2 crate `codex-guardian-v2` 拆成 `async_scorer`（Luna 异步风险分类）和 `sync_reviewer`（install-only lifecycle）。`install` 先注册 crate 根上的 thread-lifecycle `GuardianExtension`（写入 fork source thread id），再装 scorer 与 reviewer。`sync_reviewer::install` 只注册 `ThreadLifecycleContributor`：在非 internal session 上 `get_or_init(GuardianReviewSessionHost)`，`on_thread_ready` 调 `mark_ready`。同步 review policy 下沉 `ext/guardian-reviewer`（crate 自述 owns synchronous review policy；host 提供 attempt 与执行决策）。`sync_reviewer/reviewer_config.rs` 与 `prompt.rs` 已删除。共享 transcript/truncation crate 是 `codex-guardian-context`：`codex-guardian-v2` 已依赖它，async scorer transcript 通过 `default_registry` 收集。[E: codex-rs/ext/guardian-v2/src/lib.rs:80][E: codex-rs/ext/guardian-v2/src/lib.rs:89][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:55][E: codex-rs/ext/guardian-reviewer/src/lib.rs:4][E: codex-rs/ext/guardian-v2/Cargo.toml:21][E: codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs:22][E: codex-rs/guardian-context/src/lib.rs:245]

V1 自动审批审查（child Codex、`GuardianAssessment`、circuit breaker）仍在 [approval-guardian](approval-guardian.md)。本节点覆盖 V2 crate 拆分、Luna 短路径，以及它如何挂进 app-server / host `decide_approval`。

## 能回答的问题

- `async_scorer` 和 `sync_reviewer` 各自做什么，谁先谁后？
- `features.guardianv2` 哪些字段可配置，默认阈值和 transcript 来源是什么？
- Luna 如何采样、分数如何落成 `SecurityRiskScore`，fast path 何时 `Allow`？
- 共享 transcript 现在在哪个 crate，Guardian reviewer turn 暴露哪些工具？
- app-server 如何 install V2，V1 reviewer session 为什么看不到它？

## 职责边界

| 层 | 职责 | 不是 |
|---|---|---|
| `async_scorer` | Luna 异步打分、`ApprovalReviewContributor::decide` 低风险短路径、把 `action_risk` 写入 `SecurityRiskScore` | 不 spawn child Codex，不产出 `GuardianAssessment` |
| `sync_reviewer` | install-only：注册 `GuardianExtension`，把 `GuardianReviewSessionHost` 放进 thread store 并 `mark_ready` | 不再持有 reviewer config / prompt；policy 在 `guardian-reviewer` [E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:28] |
| `guardian-reviewer` | owns synchronous Guardian review policy：`SynchronousReview`、`ReviewHost`、`ReviewerPool`、`ReviewerConfigOverrides`、`GuardianAssessment`、`MAX_REVIEW_ATTEMPTS=3`、`REVIEW_TIMEOUT=90s` | 不拥有 host session runtime；attempt / 执行决策由 host 提供 [E: codex-rs/ext/guardian-reviewer/src/lib.rs:35][E: codex-rs/ext/guardian-reviewer/src/lib.rs:46][E: codex-rs/ext/guardian-reviewer/src/lib.rs:47] |
| `guardian-context` | 声明 Sync/Async 共享的 `SectionRegistry`、`collect_transcript`、truncation | 不是独立 runtime；`codex-guardian-v2` 已声明依赖并由 async scorer transcript 调用 [E: codex-rs/ext/guardian-v2/Cargo.toml:21][E: codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs:22] |
| `core/src/guardian` | host：`decide_approval`、child session、fail-closed；配置覆写走 `reviewer_config.rs` → `reviewer_config_overrides` | 不实现 Luna classifier |
| crate 根 `GuardianExtension` | thread start 时写入 `GuardianThreadContext`（fork source） | 不是旧独立 crate `ext/guardian`（已删除） |
| app-server `thread_extensions` | 只调一次 `codex_guardian_v2::install` | 不再单独 `codex_guardian::install` |

`Feature::GuardianV2` key 是 `guardianv2`，stage `UnderDevelopment`，默认关闭；`Feature::GuardianApproval` key 是 `guardian_approval`，默认开启。async scorer `on_thread_start` 要求 `GuardianApproval`；`GuardianV2` 关闭时 `scoring_disabled`。[E: codex-rs/features/src/lib.rs:1593][E: codex-rs/features/src/lib.rs:1563][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:109][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:74]

## 关键 crate / 文件

| 文件 | 角色 |
|---|---|
| `codex-rs/ext/guardian-v2/src/lib.rs` | 公开 `install`：thread-lifecycle `GuardianExtension` + `async_scorer::install` + `sync_reviewer::install`。[E: codex-rs/ext/guardian-v2/src/lib.rs:80] |
| `codex-rs/ext/guardian-v2/src/async_scorer/config.rs` | 从 `features.guardianv2` 解析 `GuardianV2Config`：阈值、lag、transcript、legacy review scope。[E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:48] |
| `codex-rs/ext/guardian-v2/src/async_scorer/extension.rs` | thread start、`on_tool_start` → `score_tool`、异步分类。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:104][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:216][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:246] |
| `codex-rs/ext/guardian-v2/src/async_scorer/approval.rs` | `GuardianApprovalReviewer`：读 `action_risk`，低风险返回 `ApprovalDecision::Allow`。[E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:34][E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:247] |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs` | Luna WebSocket 连接池、tool-less sample。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:39] |
| `codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs` | install-only lifecycle：`GuardianReviewSessionHost` + `mark_ready`。[E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:55] |
| `codex-rs/ext/guardian-reviewer/src/lib.rs` | 同步 review policy crate 入口与常量。[E: codex-rs/ext/guardian-reviewer/src/lib.rs:35] |
| `codex-rs/guardian-context/src/lib.rs` | `ContextTarget::{Sync,Async}`、`SectionRegistry`、`default_registry()`。[E: codex-rs/guardian-context/src/lib.rs:100][E: codex-rs/guardian-context/src/lib.rs:236][E: codex-rs/guardian-context/src/lib.rs:245] |
| `codex-rs/features/src/feature_configs.rs` | `GuardianV2ConfigToml` / transcript / review-scope 用户配置 schema。[E: codex-rs/features/src/feature_configs.rs:127] |
| `codex-rs/app-server/src/extensions.rs` | 生产路径 `codex_guardian_v2::install`。[E: codex-rs/app-server/src/extensions.rs:104] |
| `codex-rs/protocol/src/security_risk.rs` | `SecurityRiskScore` rollout/thread snapshot。[E: codex-rs/protocol/src/security_risk.rs:13] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `GuardianV2ConfigToml` | `enabled`、`free_guardian`、`thread_context`、`persist_scores`、`classifier_instructions`、`review_threshold` (0.0–1.0)、`max_tool_call_lag`、`reasoning_effort`、token 上限、`transcript`、`review_scope`。[E: codex-rs/features/src/feature_configs.rs:127][E: codex-rs/features/src/feature_configs.rs:144] |
| `GuardianV2TranscriptSource` | `tool_calls` / `tool_outputs` / `reasoning`。[E: codex-rs/features/src/feature_configs.rs:80] |
| `GuardianV2Config` | runtime 解析结果。无自定义 classifier 时默认 `review_threshold=0.5`；有自定义 instructions 且未写阈值则用 legacy `0.8`。`reasoning_effort=Low`，action token 默认 10_000（夹在 100–100_000），`max_tool_call_lag` 默认 2，`persist_scores` 默认 false，`reuse_parent_compaction` 默认 true，transcript 默认 sources=`[ToolCalls, ToolOutputs]`，`include_images` 默认 true。[E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:18][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:20][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:21][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:22][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:177][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:255] |
| `GuardianPolicy` | 由 `review_scope` legacy 字段构造。默认 `computer_use_only=true`：非 CUA 类别走 `Synchronous`（不打分），CUA 走 `Adaptive`。[E: codex-rs/ext/guardian-v2/src/async_scorer/coverage.rs:34] |
| `LunaSamplerConfig` | provider、HTTP factory、agent-identity policy、session/thread id、originator、`free_guardian`、service tier、`luna_compaction_hash`。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:51] |
| `LunaSamplingRequest` | trusted instructions / review evidence / skill paths、untrusted `input`、optional images 与 parent compaction、`reasoning_effort`、parent/root turn id。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:79] |
| `SecurityRiskScore` | `BTreeMap<String, f64>` + optional `call_id` / `action` / `sampled_at`。doc comment 要求它不进 model-visible context。[E: codex-rs/protocol/src/security_risk.rs:13][I] |
| `ReviewerConfigOverrides` | `guardian-reviewer` 导出的 reviewer 配置政策：关 Collab/MultiAgentV2/GuardianV2/hooks/apps/plugins/web search 等。[E: codex-rs/ext/guardian-reviewer/src/settings.rs:26][E: codex-rs/ext/guardian-reviewer/src/settings.rs:64] |

## 控制流

1. app-server `thread_extensions()` 调用 `codex_guardian_v2::install(...)`。crate 根 `install` 注册 fork-source thread lifecycle，然后 `async_scorer::install`（thread/approval-review/skill-invocation/tool-lifecycle）和 `sync_reviewer::install`（reviewer thread lifecycle）。[E: codex-rs/app-server/src/extensions.rs:104][E: codex-rs/ext/guardian-v2/src/lib.rs:88][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:806]
2. async scorer `on_thread_start` 要求 `Feature::GuardianApproval`；`Feature::GuardianV2` 关闭时 `scoring_disabled`。配置非法只 emit warning 并返回；成功后 thread store 放入 `LunaSampler`、`GuardianV2Config`、可选 `GuardianV2Enabled`，并在 AutoReview 且非 full access 时 `prewarm`。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:109][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:74][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:166][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:172]
3. sampler 模型固定 `gpt-5.6-luna`。非 test 初始打开 8 条 Responses WebSocket，池上限 16，输出上限 8KiB。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:39][E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:42][E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:43][E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:44]
4. `on_tool_start` 调用 `score_tool`：按 policy 决定是否分类，然后 `tokio::spawn` 异步采样，不阻塞 tool 执行。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:216][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:530]
5. Luna 输出必须是整段 `"high"` 或 `"low"`，映射为 `action_risk` `1.0` / `0.0`。`insert_if` 只接受更新的 `sampled_at`；`persist_scores` 且非 ephemeral 才 `append_rollout_items`。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:689][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:715][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:743]
6. Host `decide_approval` 构造 `ApprovalDecisionInput`（含 `require_fresh_review`），再调 `extensions.decide_approval(...)`。registry 按安装顺序取第一个 `Some(ApprovalDecision)`。[E: codex-rs/core/src/guardian/decision.rs:151][E: codex-rs/ext/extension-api/src/registry.rs:216]
7. V2 `GuardianApprovalReviewer` 读 `SecurityRiskScore.scores["action_risk"]`。仅当 `score < review_threshold` 且 authorization 未变、tool-call lag 未超限时返回 `Allow`。缺分、分数 ≥ 阈值、stale score、scoring failure 走 deferred reason，交给 `synchronous_reviewer`。默认 `computer_use_only` 时非 Adaptive 类别记 `out_of_scope`。[E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:229][E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:247][E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:93]

`auto_review_required_for_model` 为真且未开 `Feature::GuardianV2` 时，host 把 `require_fresh_review` 设真，强制同步审查。retries、escalated `exec_command` 和 `require_synchronous_review` 同样强制 fresh review。[E: codex-rs/core/src/guardian/decision.rs:64][E: codex-rs/core/src/guardian/decision.rs:72]

`sync_reviewer::install` 在非 internal session 的 `on_thread_start` 里 `get_or_init(GuardianReviewSessionHost::with_thread_manager)`，`on_thread_ready` 调 `mark_ready`。[E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:34][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:48][E: codex-rs/core/src/guardian/review_session.rs:138]

## Luna 采样与 compaction

`select_parent_compaction` 按 `GuardianContextMode` 选 checkpoint。分类失败写 fail-closed `action_risk=1.0`。[E: codex-rs/ext/guardian-v2/src/async_scorer/parent_compaction.rs:25][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:444]

被 supersede 的请求返回 `LunaSamplerError::Superseded`，不覆盖已有分数。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:681]

V1 reviewer 另有 `Feature::GuardianReuseParentCompaction`（默认关），那是 child Codex session 的 compaction 复用，不是 Luna hash 比较。[E: codex-rs/features/src/lib.rs:1575][E: codex-rs/core/src/guardian/review_session_context.rs:25]

## 与 V1 reviewer 的隔离

Isolated delegate 使用 `empty_extension_registry()`，不继承 parent 上的 V2 / MCP / skills 等 extensions。[E: codex-rs/core/src/codex_delegate.rs:79]

`is_basic_session_source` 同时识别 `SubAgent(Other("guardian"))` 与 `Internal(InternalSessionSource::Guardian)`。[E: codex-rs/core/src/guardian/review.rs:131]

`build_guardian_review_session_config` 通过 `codex_guardian_reviewer::reviewer_config_overrides` 拿到 `disabled_features`（含 `GuardianV2`、Collab、MultiAgentV2、Apps、Plugins、hooks、web search）再逐个 `features.disable`。[E: codex-rs/core/src/guardian/reviewer_config.rs:29][E: codex-rs/core/src/guardian/reviewer_config.rs:92][E: codex-rs/ext/guardian-reviewer/src/settings.rs:64]

Guardian reviewer 的 model tool surface 由 `add_core_tool_sources` 单独收紧：`is_basic_session_source` 时，只在全部 environment 都是 `PermissionProfile::Managed`、且 `Feature::ShellTool` + `Feature::UnifiedExec` 开启、shell 不是 `Disabled` 时注册 `exec_command` / `write_stdin`，以及 `Feature::ViewImage` 开启时的 `view_image`；随后 `return`。planner 对 guardian turn 整段跳过 MCP / extension / hosted / dynamic，因此不会挂 `history.*`。[E: codex-rs/core/src/tools/spec_plan.rs:156][E: codex-rs/core/src/tools/spec_plan.rs:978][E: codex-rs/core/src/tools/spec_plan.rs:994][E: codex-rs/core/src/tools/spec_plan.rs:1029]

## 设计动机与权衡

- V2 把“便宜的 Luna 打分”和“贵的 child Codex 审查”拆开：低风险动作可以跳过 V1 session，高风险仍走 fail-closed 的 V1 assessment。[E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:247][E: codex-rs/core/src/guardian/decision.rs:151][I]
- 分类在 `on_tool_start` 异步进行，是为了不把 Luna 延迟加到每条 tool 的关键路径；代价是 approval 可能先于分数到达，此时 V2 不 claim Allow。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:530][I]
- 默认 `computer_use_only` 把 Adaptive 打分收窄到 browser/computer-use，避免普通 shell 被低阈值自动放行。[E: codex-rs/ext/guardian-v2/src/async_scorer/coverage.rs:35][I]
- `guardian-reviewer` 把同步审查政策从 host runtime 拆出，v2 `sync_reviewer` 只负责把 host 放进 thread store。[E: codex-rs/ext/guardian-reviewer/src/lib.rs:46][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:55][I]
- `guardian-context` 把 Sync/Async 的 section 收集做成可复用 registry，避免两套 truncation 继续分叉；async scorer transcript 已接入 `default_registry`。[E: codex-rs/guardian-context/src/lib.rs:245][E: codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs:22][I]

## Gotcha

- 生产 `codex_guardian_v2::install` 只有 app-server `thread_extensions`。TUI/exec 经 embedded/remote app-server 继承这份 registry，仍受 `guardianv2` + `guardian_approval` 双 feature 门控；`empty_extension_registry()` host（isolated delegate，含 V1 reviewer）不会自己 install V2。`codex-rs/mcp-server` 已删除，不再有 MCP-server host 安装路径。[E: codex-rs/app-server/src/extensions.rs:104][E: codex-rs/core/src/codex_delegate.rs:79]
- V2 短路径只返回 `ApprovalDecision::Allow`。高风险是 deferred / 交给 synchronous reviewer，不是 V2 deny。[E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:247][E: codex-rs/core/src/guardian/decision.rs:153]
- Luna 输出不再是 structured `{ scores: { action_risk } }`，而是第一个 token `high` / `low`。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:689][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:26]
- 默认 transcript 含 tool calls/outputs，并可带 images；要加 reasoning 必须配置 `features.guardianv2.transcript.sources`。[E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:272]
- Luna 输出超过 8KiB 或缺少 assistant text 会失败；失败写 fail-closed 高分或 warning，后续 approval 走 V1。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:42][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:761]
- 旧路径 `ext/guardian-v2/src/sync_reviewer/reviewer_config.rs` / `prompt.rs` 已不存在；同步政策改读 `ext/guardian-reviewer`。
- `core/src/guardian/{coverage,decision,input_budget,request_budget,review_request,review_session_*}.rs` 仍属 host / V1 节点，不要另建 wiki 文件。

## Sources

- `codex-rs/ext/guardian-v2/src/lib.rs`
- `codex-rs/ext/guardian-v2/Cargo.toml`
- `codex-rs/ext/guardian-v2/src/async_scorer/mod.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/config.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/extension.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/approval.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/coverage.rs`
- `codex-rs/ext/guardian-v2/src/async_scorer/parent_compaction.rs`
- `codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs`
- `codex-rs/ext/guardian-reviewer/src/lib.rs`
- `codex-rs/ext/guardian-reviewer/src/review.rs`
- `codex-rs/ext/guardian-reviewer/src/settings.rs`
- `codex-rs/guardian-context/src/lib.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/app-server/src/extensions.rs`
- `codex-rs/protocol/src/security_risk.rs`
- `codex-rs/core/src/guardian/decision.rs`
- `codex-rs/core/src/guardian/review.rs`
- `codex-rs/core/src/guardian/review_session.rs`
- `codex-rs/core/src/guardian/review_session_context.rs`
- `codex-rs/core/src/guardian/reviewer_config.rs`
- `codex-rs/core/src/codex_delegate.rs`
- `codex-rs/ext/extension-api/src/registry.rs`
- `codex-rs/core/src/tools/spec_plan.rs`

## 相关

- [Guardian V1 自动审批审查](approval-guardian.md)
- [Approval policy](approval-policy.md)
- [request_permissions 工具](../../surface/tools/request-permissions.md)
- [Tool router](tool-router.md)
