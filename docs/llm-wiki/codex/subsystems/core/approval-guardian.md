---
id: subsys.core.approval-guardian
title: Guardian 自动审批审查
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/approvals.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/guardian/mod.rs, codex-rs/core/src/guardian/approval_request.rs, codex-rs/core/src/guardian/review.rs, codex-rs/core/src/guardian/prompt.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/core/src/codex_delegate.rs, codex-rs/protocol/src/approvals.rs, codex-rs/features/src/lib.rs]
symbols: [GuardianApprovalRequest, GuardianAssessment, GuardianAssessmentEvent, GuardianRejectionCircuitBreaker, routes_approval_to_guardian, review_approval_request, build_guardian_prompt_items_with_parent_turn, GuardianReviewSessionManager, GuardianReviewSessionOutcome]
related: [subsys.core.approval-policy, subsys.core.approval-guardian-v2, subsys.core.review-mode, subsys.core.instruction-assembly, subsys.core.tool-router]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> Guardian V1 是 automatic approval reviewer：在 `OnRequest` 或 `Granular(_)` 且 `approvals_reviewer == AutoReview` 时，它把具体 approval request 交给名为 `guardian` 的子 Codex 审查；timeout、session failure、parse failure 都按 fail-closed 处理，不把动作静默放行。Luna 风险打分与低风险短路径属于独立 crate `ext/guardian-v2` 的 `async_scorer`，见 [approval-guardian-v2](approval-guardian-v2.md)。[E: codex-rs/core/src/guardian/mod.rs:60][E: codex-rs/core/src/guardian/mod.rs:61][E: codex-rs/core/src/guardian/review.rs:204][E: codex-rs/core/src/guardian/review.rs:316][E: codex-rs/core/src/codex_delegate.rs:110]

## 能回答的问题

- 哪些 approval mode 会路由到 Guardian V1，哪些不会？
- Guardian request enum 覆盖哪些 action 类型？
- extension `fast_approval_decision` 如何在 V1 child session 之前短路？
- Guardian prompt 如何从 parent history、retry reason 和 planned action JSON 构造？
- Guardian trunk session 何时复用，何时 fork ephemeral review？
- V1 reviewer session 如何与 parent extensions（含 Guardian V2）隔离？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/core/src/guardian/mod.rs` | timeout、reviewer name、circuit-breaker 阈值、`GuardianAssessment`。[E: codex-rs/core/src/guardian/mod.rs:60][E: codex-rs/core/src/guardian/mod.rs:61][E: codex-rs/core/src/guardian/mod.rs:63][E: codex-rs/core/src/guardian/mod.rs:161] |
| `codex-rs/core/src/guardian/approval_request.rs` | `GuardianApprovalRequest` enum、action JSON 序列化。[E: codex-rs/core/src/guardian/approval_request.rs:19] |
| `codex-rs/core/src/guardian/prompt.rs` | transcript 收集、full/delta prompt、denied-read context、action JSON 注入。[E: codex-rs/core/src/guardian/prompt.rs:126][E: codex-rs/core/src/guardian/prompt.rs:192] |
| `codex-rs/core/src/guardian/review.rs` | routing gate、fast-decision-before-Guardian、events、fail-closed、circuit breaker。[E: codex-rs/core/src/guardian/review.rs:204][E: codex-rs/core/src/guardian/review.rs:352] |
| `codex-rs/core/src/guardian/review_session.rs` | reusable trunk/ephemeral sessions、read-only snapshot、禁用 `Feature::GuardianV2`。[E: codex-rs/core/src/guardian/review_session.rs:510][E: codex-rs/core/src/guardian/review_session.rs:1563] |
| `codex-rs/core/src/tools/approvals.rs` | central policy stage：hooks 优先，再按 reviewer 选 Guardian 或用户；`RequestPermissions` 走同一 `request_guardian_approval`。[E: codex-rs/core/src/tools/approvals.rs:524][E: codex-rs/core/src/tools/approvals.rs:602] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `GuardianApprovalRequest` | 变体覆盖 `ExecCommand`、`WriteStdin`、Unix `Execve`、`ApplyPatch`、`NetworkAccess`、`McpToolCall`、`RequestPermissions`。不再有独立 `Shell` 变体。[E: codex-rs/core/src/guardian/approval_request.rs:19][E: codex-rs/core/src/guardian/approval_request.rs:29][E: codex-rs/core/src/guardian/approval_request.rs:41][E: codex-rs/core/src/guardian/approval_request.rs:49][E: codex-rs/core/src/guardian/approval_request.rs:55][E: codex-rs/core/src/guardian/approval_request.rs:64][E: codex-rs/core/src/guardian/approval_request.rs:77] |
| Action JSON | request 先序列化为 tool-specific JSON，长字符串按 `GUARDIAN_MAX_ACTION_STRING_TOKENS`（16_000）截断。[E: codex-rs/core/src/guardian/mod.rs:74] |
| `GuardianAssessment` | parsed reviewer output 包含 `risk_level`、`user_authorization`、`outcome`、`rationale`。[E: codex-rs/core/src/guardian/mod.rs:161] |
| `GuardianAssessmentEvent` | protocol event 记录 id、target item、plugin attribution、turn id、start/end time、status、risk、authorization、rationale、decision source、action。[E: codex-rs/protocol/src/approvals.rs:189][E: codex-rs/protocol/src/approvals.rs:195][E: codex-rs/protocol/src/approvals.rs:207][E: codex-rs/protocol/src/approvals.rs:214][E: codex-rs/protocol/src/approvals.rs:218] |
| Circuit breaker | 每 turn 记 consecutive denials 与最近 50 次 review 的 denial 窗口；标准阈值 3 consecutive / 10 recent，cyber model 1 / 1，达到后 interrupt turn。[E: codex-rs/core/src/guardian/mod.rs:62][E: codex-rs/core/src/guardian/mod.rs:65][E: codex-rs/core/src/guardian/mod.rs:66][E: codex-rs/core/src/guardian/review.rs:252] |

## 控制流

1. tool runtime 进入 `Session::request_approval()`。注释写明优先级：hooks →（`StrictAutoReview` 或 Guardian enabled 则）Guardian，否则 user。hook 的 allow/deny 先于 reviewer。[E: codex-rs/core/src/tools/approvals.rs:524]
2. `routes_approval_policy_to_guardian` 只在 approval policy 是 `OnRequest` 或 `Granular(_)`，且 reviewer 是 `ApprovalsReviewer::AutoReview` 时返回 true。[E: codex-rs/core/src/guardian/review.rs:204][E: codex-rs/core/src/guardian/review.rs:211]
3. `run_guardian_review` 先问 installed extensions 的 `fast_approval_decision`。retries、escalated `exec_command` 和 `require_synchronous_review` 跳过这条短路径。若模型被 `auto_review_required_for_model` 强制审查，只有 `Feature::GuardianV2` 开启时才仍允许 extension fast path。[E: codex-rs/core/src/guardian/review.rs:325][E: codex-rs/core/src/guardian/review.rs:337][E: codex-rs/core/src/guardian/review.rs:352]
4. 未被 claim 时计算 target item、assessment turn id、action summary，发送 `GuardianAssessmentStatus::InProgress` event。[E: codex-rs/core/src/guardian/review.rs:375][E: codex-rs/core/src/guardian/review.rs:398]
5. 如果 external cancel 已触发，发送 `Aborted` assessment event，记录非 denial，返回 `ReviewDecision::Abort`。[E: codex-rs/core/src/guardian/review.rs:416][E: codex-rs/core/src/guardian/review.rs:445][E: codex-rs/core/src/guardian/review.rs:455]
6. 正常路径调用 retry wrapper 跑 guardian review session；completed assessment 的 `outcome` 映射为 approved 或 denied。[E: codex-rs/core/src/guardian/review.rs:486][E: codex-rs/core/src/guardian/review.rs:500]
7. Timeout 发 warning 和 terminal `TimedOut` assessment event，返回 `ReviewDecision::TimedOut`；prompt build / session / parse failure 构造 high-risk、unknown-authorization、deny assessment。[E: codex-rs/core/src/guardian/review.rs:531][E: codex-rs/core/src/guardian/review.rs:567][E: codex-rs/core/src/guardian/review.rs:577][E: codex-rs/core/src/guardian/review.rs:642]
8. Terminal allow/deny 发送 user-visible warning 和 terminal `GuardianAssessment` event。explicit denial 进 circuit breaker；allow、timeout、abort 记 non-denial。[E: codex-rs/core/src/guardian/review.rs:670][E: codex-rs/core/src/guardian/review.rs:710][E: codex-rs/core/src/guardian/review.rs:714]

## Prompt 与 session

1. `build_guardian_prompt_items_with_parent_turn` clone parent history、收集 transcript entries、保存 cursor、把 planned action pretty JSON 放入 prompt item。Full/Delta 都声明 transcript、tool arguments/results、retry reason、planned action 是 untrusted evidence。[E: codex-rs/core/src/guardian/prompt.rs:143][E: codex-rs/core/src/guardian/prompt.rs:163][E: codex-rs/core/src/guardian/prompt.rs:192]
2. transcript rendering 保留 user entries，最近非 user 上限 `GUARDIAN_RECENT_ENTRY_LIMIT`（40）。[E: codex-rs/core/src/guardian/prompt.rs:484][E: codex-rs/core/src/guardian/mod.rs:75]
3. `GuardianReviewSessionManager::run_review` 用 reuse key 管理 trunk；必要时走 ephemeral review。[E: codex-rs/core/src/guardian/review_session.rs:510]
4. Guardian 子 Codex 通过 `run_codex_thread_interactive` spawn，source 是 `SubAgentSource::Other("guardian")`。guardian reviewer source 使用 `empty_extension_registry()`，不继承 parent 的 V2/MCP/skills extensions。[E: codex-rs/core/src/guardian/review_session.rs:856][E: codex-rs/core/src/guardian/review_session.rs:864][E: codex-rs/core/src/codex_delegate.rs:110]
5. `build_guardian_review_session_config` 强制 `approval_policy: Never`，把 permission profile 收成 read-only intersection，并 disable `Feature::GuardianV2`（以及 Collab、MultiAgentV2、Apps、Plugins、hooks、web search）。[E: codex-rs/core/src/guardian/review_session.rs:1529][E: codex-rs/core/src/guardian/review_session.rs:1560]
6. review turn submit 使用 concrete permission snapshot、`AskForApproval::Never`、collaboration mode `Default`。[E: codex-rs/core/src/guardian/review_session.rs:1200][E: codex-rs/core/src/guardian/review_session.rs:1205]

Guardian reviewer 的 model tool surface 也被 planner 单独收紧：`add_core_tool_sources` 识别 guardian source 后，只在全部 environment 都是 `PermissionProfile::Managed` 时注册 `exec_command` / `write_stdin`（需 `Feature::ShellTool` + `Feature::UnifiedExec`）以及 `Feature::ViewImage` 开启时的 `view_image`；随后 `return`。guardian turn 还可以挂只读 `history.*` extension tools。[E: codex-rs/core/src/tools/spec_plan.rs:989][E: codex-rs/core/src/tools/spec_plan.rs:1009][E: codex-rs/core/src/tools/spec_plan.rs:1036][E: codex-rs/core/src/tools/spec_plan.rs:155][E: codex-rs/features/src/lib.rs:908]

`is_basic_session_source` 同时匹配 `SubAgent(Other("guardian"))` 与 `Internal(InternalSessionSource::Guardian)`。[E: codex-rs/core/src/guardian/review.rs:214]

## 设计动机与权衡

- Guardian V1 使用独立 child Codex 而不是 parent turn 内自评，是为了把审查运行在单独 prompt、read-only permission snapshot 和 `AskForApproval::Never` 下，并切断 parent extensions。[E: codex-rs/core/src/codex_delegate.rs:110][E: codex-rs/core/src/guardian/review_session.rs:1200][E: codex-rs/core/src/guardian/review_session.rs:1529][I]
- extension-before-Guardian 让 V2 这类 contributor 能在开 child session 前 claim 低风险动作；强制 auto-review 的模型在未开 V2 时仍跳过这条短路径。[E: codex-rs/core/src/guardian/review.rs:352][E: codex-rs/core/src/guardian/review.rs:337][I]
- fail-closed 策略让审查失败不会自动放行；timeout 单独返回 `TimedOut`，保留与 explicit deny 的语义差异。[E: codex-rs/core/src/guardian/review.rs:577][E: codex-rs/core/src/guardian/review.rs:531][E: codex-rs/core/src/guardian/review.rs:642][I]

## Gotcha

- 当前 routing gate 使用 `ApprovalsReviewer::AutoReview`，不是旧名称 `GuardianSubagent`。[E: codex-rs/core/src/guardian/review.rs:211]
- Guardian transcript 不等于完整 parent rollout；它会按预算和 entry kind 过滤、截断。[E: codex-rs/core/src/guardian/prompt.rs:484]
- deny rationale 编进 `ReviewDecision::denied(...)` 返回给模型，并可附加 catalog `rejection_instructions`。[E: codex-rs/core/src/guardian/review.rs:735]
- V1 reviewer 明确 disable `Feature::GuardianV2`，避免 reviewer turn 再套一层 Luna 分类。[E: codex-rs/core/src/guardian/review_session.rs:1563]
- 旧独立 crate `ext/guardian` 已删除；fork-source thread context 现在由 `codex-guardian-v2` crate 根上的 `GuardianExtension` 写入。[E: codex-rs/ext/guardian-v2/src/lib.rs:61]

## Sources

- `codex-rs/core/src/tools/approvals.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/guardian/mod.rs`
- `codex-rs/core/src/guardian/approval_request.rs`
- `codex-rs/core/src/guardian/review.rs`
- `codex-rs/core/src/guardian/prompt.rs`
- `codex-rs/core/src/guardian/review_session.rs`
- `codex-rs/core/src/codex_delegate.rs`
- `codex-rs/protocol/src/approvals.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [Approval policy](approval-policy.md)
- [Guardian V2 风险分类与预审](approval-guardian-v2.md)
- [Review mode](review-mode.md)
- [指令/prompt 装配](instruction-assembly.md)
- [Tool router](tool-router.md)
