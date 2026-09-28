---
id: subsys.core.approval-guardian-v2
title: Guardian V2 风险分类与预审
kind: subsystem
tier: T2
source: [codex-rs/ext/guardian-v2/src/lib.rs, codex-rs/ext/guardian-v2/Cargo.toml, codex-rs/ext/guardian-v2/src/async_scorer/mod.rs, codex-rs/ext/guardian-v2/src/async_scorer/config.rs, codex-rs/ext/guardian-v2/src/async_scorer/extension.rs, codex-rs/ext/guardian-v2/src/async_scorer/approval.rs, codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs, codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs, codex-rs/ext/guardian-v2/src/async_scorer/coverage.rs, codex-rs/ext/guardian-v2/src/async_scorer/parent_compaction.rs, codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs, codex-rs/ext/guardian-v2/src/sync_reviewer/reviewer_config.rs, codex-rs/ext/guardian-reviewer/src/lib.rs, codex-rs/ext/guardian-reviewer/src/review.rs, codex-rs/ext/guardian-reviewer/src/settings.rs, codex-rs/guardian-context/src/lib.rs, codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/app-server/src/extensions.rs, codex-rs/protocol/src/security_risk.rs, codex-rs/core/src/guardian/decision.rs, codex-rs/core/src/guardian/review.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/core/src/guardian/review_session_context.rs, codex-rs/core/src/guardian/reviewer_config.rs, codex-rs/core/src/codex_delegate.rs, codex-rs/ext/extension-api/src/registry.rs, codex-rs/core/src/tools/spec_plan.rs]
symbols: [codex_guardian_v2::install, GuardianV2Extension, GuardianV2Config, LunaSampler, LunaSamplingRequest, GuardianReviewerExtension, GuardianApprovalReviewer, GuardianPolicy, SectionRegistry, ContextTarget]
related: [subsys.core.approval-guardian, subsys.core.approval-policy, tool.request-permissions, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> Guardian V2 crate `codex-guardian-v2` 拆成 `async_scorer`（Luna 异步风险分类）和 `sync_reviewer`。crate 根 `install` **先** `async_scorer::install`，再 `install_reviewer`（`sync_reviewer::install`）。`GuardianExtension` 定义在 `sync_reviewer/mod.rs`：非 internal session 的 `on_thread_start` 把 `ReviewerConfig` 与 `ReviewerPool<GuardianReviewSession>` 放进 thread store。同步 review policy 在 `ext/guardian-reviewer`。`sync_reviewer/reviewer_config.rs` 仍存在（给 reviewer spawn 收紧 config，例如把 `model_post_turn_compact_threshold_percent` 置 0）。共享 transcript crate 是 `codex-guardian-context`。[E: codex-rs/ext/guardian-v2/src/lib.rs:15][E: codex-rs/ext/guardian-v2/src/lib.rs:20][E: codex-rs/ext/guardian-v2/src/lib.rs:21][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:39][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:49][E: codex-rs/ext/guardian-reviewer/src/lib.rs:40]

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
| `async_scorer` | Luna 异步打分、低风险 `ApprovalDecision::Allow`、把 `action_risk` 写入 `SecurityRiskScore` | 不 spawn child Codex，不产出 `GuardianAssessment` |
| `sync_reviewer` | `GuardianExtension` + `ReviewerPool` 生命周期；`reviewer_config.rs` 收紧 child Config | 同步评估政策在 `guardian-reviewer` [E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:39] |
| `guardian-reviewer` | owns synchronous Guardian review policy：`SynchronousReview`、`ReviewHost`、`ReviewerPool`、`ReviewerConfigOverrides`、`GuardianAssessment`、`MAX_REVIEW_ATTEMPTS=3`、`REVIEW_TIMEOUT=90s` | 不拥有 host session runtime；attempt / 执行决策由 host 提供 [E: codex-rs/ext/guardian-reviewer/src/lib.rs:40][E: codex-rs/ext/guardian-reviewer/src/lib.rs:51][E: codex-rs/ext/guardian-reviewer/src/lib.rs:47] |
| `guardian-context` | 声明 Sync/Async 共享的 `SectionRegistry`、`collect_transcript`、truncation | 不是独立 runtime；`codex-guardian-v2` 已声明依赖并由 async scorer transcript 调用 [E: codex-rs/ext/guardian-v2/Cargo.toml:24][E: codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs:22] |
| `core/src/guardian` | host：`decide_approval`、child session、fail-closed；配置覆写走 `reviewer_config.rs` → `reviewer_config_overrides` | 不实现 Luna classifier |
| `sync_reviewer::GuardianExtension` | 在 parent thread store 安装 reviewer pool / config builder | 不是旧独立 crate `ext/guardian`（已删除） |
| app-server `thread_extensions` | 只调一次 `codex_guardian_v2::install` | 不再单独 `codex_guardian::install` |

`Feature::GuardianV2` key 是 `guardianv2`，stage `UnderDevelopment`，默认关闭；`Feature::GuardianApproval` key 是 `guardian_approval`，默认开启。async scorer `on_thread_start` 在 `GuardianApproval` 关闭时直接 return；`GuardianV2` 被拷进 `FeatureToml.enabled`。scoring 开启时才 `insert(GuardianV2Enabled)`（无 `scoring_disabled` 标识符）。[E: codex-rs/features/src/lib.rs:1675][E: codex-rs/features/src/lib.rs:1645][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:47][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:74][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:102]

## 关键 crate / 文件

| 文件 | 角色 |
|---|---|
| `codex-rs/ext/guardian-v2/src/lib.rs` | 公开 `install`：`async_scorer::install` 然后 `install_reviewer`。[E: codex-rs/ext/guardian-v2/src/lib.rs:20][E: codex-rs/ext/guardian-v2/src/lib.rs:21] |
| `codex-rs/ext/guardian-v2/src/async_scorer/config.rs` | 从 `features.guardianv2` 解析 `GuardianV2Config`：阈值、lag、transcript、legacy review scope。[E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:51] |
| `codex-rs/ext/guardian-v2/src/async_scorer/extension.rs` | thread start、`on_tool_start` → `score_tool`、异步分类。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:42][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:151] |
| `codex-rs/ext/guardian-v2/src/async_scorer/approval.rs` | `GuardianApprovalReviewer`：读 `action_risk`，低风险返回 `ApprovalDecision::Allow`。[E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:32][E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:235] |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs` | Luna WebSocket 连接池、tool-less sample。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:34] |
| `codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs` | `GuardianExtension`：`insert(ReviewerConfig)` 再 `ReviewerPool::<GuardianReviewSession>::new`。[E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:39][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:52][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:54][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:60] |
| `codex-rs/ext/guardian-reviewer/src/lib.rs` | 同步 review policy crate 入口与常量。[E: codex-rs/ext/guardian-reviewer/src/lib.rs:40] |
| `codex-rs/guardian-context/src/lib.rs` | `ContextTarget::{Sync,Async}`、`SectionRegistry`、`default_registry()`。[E: codex-rs/guardian-context/src/lib.rs:109][E: codex-rs/guardian-context/src/lib.rs:264][E: codex-rs/guardian-context/src/lib.rs:273] |
| `codex-rs/features/src/feature_configs.rs` | `GuardianV2ConfigToml` / transcript / review-scope 用户配置 schema。[E: codex-rs/features/src/feature_configs.rs:137] |
| `codex-rs/app-server/src/extensions.rs` | 生产路径 `codex_guardian_v2::install`。[E: codex-rs/app-server/src/extensions.rs:96] |
| `codex-rs/protocol/src/security_risk.rs` | `SecurityRiskScore` rollout/thread snapshot。[E: codex-rs/protocol/src/security_risk.rs:13] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `GuardianV2ConfigToml` | `enabled`、`free_guardian`、`thread_context`、`persist_scores`、`classifier_instructions`、`review_threshold` (0.0–1.0)、`max_tool_call_lag`、`reasoning_effort`、token 上限、`transcript`、`review_scope`。[E: codex-rs/features/src/feature_configs.rs:137][E: codex-rs/features/src/feature_configs.rs:153] |
| `GuardianV2TranscriptSource` | `tool_calls` / `tool_outputs` / `reasoning`。[E: codex-rs/features/src/feature_configs.rs:90] |
| `GuardianV2Config` | runtime 解析结果。无自定义 classifier 时默认 `review_threshold=0.5`；有自定义 instructions 且未写阈值则用 legacy `0.8`。`reasoning_effort=Low`，action token 默认 10_000（夹在 100–100_000），`max_tool_call_lag` 默认 2，`persist_scores` 默认 false，`reuse_parent_compaction` 默认 true，transcript 默认 sources=`[ToolCalls, ToolOutputs]`，`include_images` 默认 true。[E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:24][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:26][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:27][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:28][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:172][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:256] |
| `GuardianPolicy` | 由 `review_scope` legacy 字段构造。默认 `computer_use_only=true`：非 CUA 类别走 `Synchronous`（不打分），CUA 走 `Adaptive`。[E: codex-rs/ext/guardian-v2/src/async_scorer/coverage.rs:27] |
| `LunaSamplerConfig` | provider、HTTP factory、agent-identity policy、session/thread id、originator、`free_guardian`、service tier、`luna_compaction_hash`。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:42] |
| `LunaSamplingRequest` | trusted instructions / review evidence / skill paths、untrusted `input`、optional images 与 parent compaction、`reasoning_effort`、parent/root turn id。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:70] |
| `SecurityRiskScore` | `BTreeMap<String, f64>` + optional `call_id` / `action` / `sampled_at`。doc comment 要求它不进 model-visible context。[E: codex-rs/protocol/src/security_risk.rs:13][I] |
| `ReviewerConfigOverrides` | `guardian-reviewer` 导出的 reviewer 配置政策：关 Collab/MultiAgentV2/GuardianV2/hooks/apps/plugins/web search 等。[E: codex-rs/ext/guardian-reviewer/src/settings.rs:28][E: codex-rs/ext/guardian-reviewer/src/settings.rs:64] |

## 控制流

1. app-server `thread_extensions()` 调用 `codex_guardian_v2::install(...)`：`async_scorer::install` 然后 `install_reviewer`。[E: codex-rs/app-server/src/extensions.rs:96][E: codex-rs/ext/guardian-v2/src/lib.rs:20][E: codex-rs/ext/guardian-v2/src/lib.rs:21]
2. async scorer `on_thread_start` 在 `Feature::GuardianApproval` 关闭时 early-return。`Feature::GuardianV2` 写入 `FeatureToml.enabled`；`policy.scoring_enabled()` 为真时才 `insert(GuardianV2Enabled)`。配置非法只 emit warning 并返回；成功后 thread store 放入 `LunaSampler`、`GuardianV2Config`，并在 AutoReview 且非 full access 时 `prewarm`。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:47][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:74][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:102][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:107]
3. sampler 模型固定 `gpt-5.6-luna`。非 test 初始打开 8 条 Responses WebSocket，池上限 16，输出上限 8KiB。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:34][E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:37][E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:38][E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:39]
4. `on_tool_start` 调用 `score_tool`：按 policy 决定是否分类，然后 `tokio::spawn` 异步采样，不阻塞 tool 执行。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:151][E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:118]
5. Luna 输出必须是整段 `"high"` 或 `"low"`，映射为 `action_risk` `1.0` / `0.0`。`publish` 只接受更新的 `sampled_at`；`persist_scores` 且非 ephemeral 才 `append_rollout_items`。[E: codex-rs/ext/guardian-v2/src/async_scorer/classification.rs:300][E: codex-rs/ext/guardian-v2/src/async_scorer/score.rs:101][E: codex-rs/ext/guardian-v2/src/async_scorer/classification.rs:337]
6. Host `decide_approval` 把 `ReviewRequest` 交给 `.decide(&session.services.extensions)`；cancel 后强制 `Abort`。[E: codex-rs/core/src/guardian/decision.rs:125][E: codex-rs/core/src/guardian/decision.rs:129]
7. V2 `GuardianApprovalReviewer` 读 `SecurityRiskScore.scores["action_risk"]`。仅当 `score < review_threshold` 且 authorization 未变、tool-call lag 未超限时返回 `Allow`。缺分、分数 ≥ 阈值、stale score、scoring failure 走 deferred reason，交给 `synchronous_reviewer`。默认 `computer_use_only` 时非 Adaptive 类别记 `out_of_scope`。[E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:229][E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:235][E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:95]

`auto_review_required_for_model` 为真且未开 `Feature::GuardianV2` 时，host `ReviewRequest` 带 `require_synchronous_review`；extracted reviewer routing 把它（以及 `model_requires_review && !async_enabled`、cancel、retry、escalated exec）映射为 `require_fresh_review`。[E: codex-rs/core/src/guardian/decision.rs:64][E: codex-rs/core/src/guardian/decision.rs:76][E: codex-rs/core/src/guardian/decision.rs:107][E: codex-rs/ext/guardian-reviewer/src/routing.rs:104]

`sync_reviewer::GuardianExtension::on_thread_start` 对 internal session 直接 return；non-internal 才 `insert(ReviewerConfig)`（`build_reviewer_config`）并 `get_or_init(ReviewerPool::<GuardianReviewSession>::new)`。[E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:49][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:52][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:54][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:59][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:60]

## Luna 采样与 compaction

`select_parent_compaction` 按 `GuardianContextMode` 选 checkpoint。分类失败写 fail-closed `action_risk=1.0`。[E: codex-rs/ext/guardian-v2/src/async_scorer/parent_compaction.rs:25][E: codex-rs/ext/guardian-v2/src/async_scorer/score.rs:123][E: codex-rs/ext/guardian-v2/src/async_scorer/classification.rs:355]

被 supersede 的请求返回 `LunaSamplerError::Superseded`，不覆盖已有分数。[E: codex-rs/ext/guardian-v2/src/async_scorer/classification.rs:291]

V1 reviewer 另有 `Feature::GuardianReuseParentCompaction`（Stable，默认开），那是 child Codex session 的 compaction 复用，不是 Luna hash 比较。[E: codex-rs/features/src/lib.rs:1657][E: codex-rs/features/src/lib.rs:1659][E: codex-rs/features/src/lib.rs:1660]

## 与 V1 reviewer 的隔离

Isolated delegate 使用 `empty_extension_registry()`，不继承 parent 上的 V2 / MCP / skills 等 extensions。[E: codex-rs/core/src/codex_delegate.rs:79]

`is_basic_session_source` 同时识别 `SubAgent(Other("guardian"))` 与 `Internal(InternalSessionSource::Guardian)`。[E: codex-rs/core/src/guardian/review.rs:102]

`sync_reviewer::build_reviewer_config` 把 `model_post_turn_compact_threshold_percent` 置 0、approval `Never`，并 disable Collab / MultiAgentV2 / GuardianV2 / Apps / Plugins / hooks 等。[E: codex-rs/ext/guardian-v2/src/sync_reviewer/reviewer_config.rs:17][E: codex-rs/ext/guardian-v2/src/sync_reviewer/reviewer_config.rs:26][E: codex-rs/ext/guardian-v2/src/sync_reviewer/reviewer_config.rs:39]

Guardian reviewer 工具面由 `reviewer_tool_policy()` 设 `require_managed_sandbox: true`；planner `add_core_tool_sources` 只认该 flag，失败则跳过全部 core tools，成功则继续 `add_shell_tools` 等。MCP 仍在其后 `append_mcp_tools`，不是识别 guardian source 后只注册 exec/write_stdin/view_image 并 return。[E: codex-rs/ext/guardian-reviewer/src/settings.rs:39][E: codex-rs/core/src/tools/spec_plan.rs:1018][E: codex-rs/core/src/tools/spec_plan.rs:151][E: codex-rs/core/src/tools/spec_plan.rs:153]

## 设计动机与权衡

- V2 把“便宜的 Luna 打分”和“贵的 child Codex 审查”拆开：低风险动作可以跳过 V1 session，高风险仍走 fail-closed 的 V1 assessment。[E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:235][E: codex-rs/core/src/guardian/decision.rs:131][I]
- 分类在 `on_tool_start` 异步进行，是为了不把 Luna 延迟加到每条 tool 的关键路径；代价是 approval 可能先于分数到达，此时 V2 不 claim Allow。[E: codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:118][I]
- 默认 `computer_use_only` 把 Adaptive 打分收窄到 browser/computer-use，避免普通 shell 被低阈值自动放行。[E: codex-rs/ext/guardian-v2/src/async_scorer/coverage.rs:27][I]
- `guardian-reviewer` 把同步审查政策从 host runtime 拆出，v2 `sync_reviewer` 只负责把 host 放进 thread store。[E: codex-rs/ext/guardian-reviewer/src/lib.rs:51][E: codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs:217][I]
- `guardian-context` 把 Sync/Async 的 section 收集做成可复用 registry，避免两套 truncation 继续分叉；async scorer transcript 已接入 `default_registry`。[E: codex-rs/guardian-context/src/lib.rs:273][E: codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs:22][I]

## Gotcha

- 生产 `codex_guardian_v2::install` 只有 app-server `thread_extensions`。`empty_extension_registry()` isolated delegate 不会 install V2。`codex-rs/mcp-server` 已删除。[E: codex-rs/app-server/src/extensions.rs:96][E: codex-rs/core/src/codex_delegate.rs:79]
- V2 短路径只返回 `ApprovalDecision::Allow`。高风险是 deferred / 交给 synchronous reviewer，不是 V2 deny。[E: codex-rs/ext/guardian-v2/src/async_scorer/approval.rs:235][E: codex-rs/core/src/guardian/decision.rs:131]
- Luna 输出不再是 structured `{ scores: { action_risk } }`，而是第一个 token `high` / `low`。[E: codex-rs/ext/guardian-v2/src/async_scorer/classification.rs:300][E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:31]
- 默认 transcript 含 tool calls/outputs，并可带 images；要加 reasoning 必须配置 `features.guardianv2.transcript.sources`。[E: codex-rs/ext/guardian-v2/src/async_scorer/config.rs:273]
- Luna 输出超过 8KiB 或缺少 assistant text 会失败；失败写 fail-closed 高分或 warning，后续 approval 走 V1。[E: codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs:37][E: codex-rs/ext/guardian-v2/src/async_scorer/score.rs:123]
- `sync_reviewer/reviewer_config.rs` 仍负责 child Config 覆写；同步评估政策在 `ext/guardian-reviewer`。`prompt.rs` 不在 v2 crate。
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
- `codex-rs/ext/guardian-v2/src/sync_reviewer/reviewer_config.rs`
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
