---
id: subsys.core.approval-guardian
title: Guardian 自动审批审查
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/approvals.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/guardian/mod.rs, codex-rs/core/src/guardian/approval_request.rs, codex-rs/core/src/guardian/review.rs, codex-rs/core/src/guardian/prompt.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/core/src/codex_delegate.rs, codex-rs/protocol/src/approvals.rs, codex-rs/ext/guardian-v2/src/lib.rs]
symbols: [GuardianApprovalRequest, GuardianAssessment, GuardianAssessmentEvent, GuardianRejectionCircuitBreaker, routes_approval_to_guardian, review_approval_request, build_guardian_prompt_items_with_parent_turn, GuardianReviewSessionManager, GuardianReviewSessionOutcome]
related: [subsys.core.approval-policy, subsys.core.approval-guardian-v2, subsys.core.review-mode, subsys.core.instruction-assembly, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> Guardian V1 是 automatic approval reviewer：在 `OnRequest` 或 `Granular(_)` 且 `approvals_reviewer == AutoReview` 时，它把具体 approval request 交给名为 `guardian` 的子 Codex 审查；timeout、session failure、parse failure 都按 fail-closed 处理，不把动作静默放行。Luna 风险打分与低风险短路径属于独立 crate `ext/guardian-v2` 的 `async_scorer`，见 [approval-guardian-v2](approval-guardian-v2.md)。[E: codex-rs/core/src/guardian/mod.rs:66][E: codex-rs/core/src/guardian/mod.rs:64][E: codex-rs/core/src/guardian/review.rs:232][E: codex-rs/core/src/guardian/review.rs:344][E: codex-rs/core/src/codex_delegate.rs:83]

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
| `codex-rs/core/src/guardian/mod.rs` | timeout、reviewer name、circuit-breaker 阈值、`GuardianAssessment`。[E: codex-rs/core/src/guardian/mod.rs:63][E: codex-rs/core/src/guardian/mod.rs:64][E: codex-rs/core/src/guardian/mod.rs:69][E: codex-rs/core/src/guardian/mod.rs:180] |
| `codex-rs/core/src/guardian/approval_request.rs` | `GuardianApprovalRequest` enum、action JSON 序列化。[E: codex-rs/core/src/guardian/approval_request.rs:23] |
| `codex-rs/core/src/guardian/prompt.rs` | transcript 收集、full/delta prompt、denied-read context、action JSON 注入。[E: codex-rs/core/src/guardian/prompt.rs:102][E: codex-rs/core/src/guardian/prompt.rs:145] |
| `codex-rs/core/src/guardian/review.rs` | routing gate、fast-decision-before-Guardian、events、fail-closed、circuit breaker。[E: codex-rs/core/src/guardian/review.rs:232][E: codex-rs/core/src/guardian/review.rs:394] |
| `codex-rs/core/src/guardian/review_session.rs` | reusable trunk/ephemeral sessions、read-only snapshot、禁用 `Feature::GuardianV2`。[E: codex-rs/core/src/guardian/review_session.rs:570][E: codex-rs/core/src/guardian/review_session.rs:1661] |
| `codex-rs/core/src/tools/approvals.rs` | central policy stage：hooks 优先，再按 reviewer 选 Guardian 或用户；`RequestPermissions` 走同一 `request_guardian_approval`。[E: codex-rs/core/src/tools/approvals.rs:508] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `GuardianApprovalRequest` | 变体覆盖 `ExecCommand`、`WriteStdin`、Unix `Execve`、`ApplyPatch`、`NetworkAccess`、`McpToolCall`、`RequestPermissions`。不再有独立 `Shell` 变体。[E: codex-rs/core/src/guardian/approval_request.rs:23][E: codex-rs/core/src/guardian/approval_request.rs:36][E: codex-rs/core/src/guardian/approval_request.rs:48][E: codex-rs/core/src/guardian/approval_request.rs:56][E: codex-rs/core/src/guardian/approval_request.rs:62][E: codex-rs/core/src/guardian/approval_request.rs:71][E: codex-rs/core/src/guardian/approval_request.rs:84] |
| Action JSON | request 先序列化为 tool-specific JSON，长字符串按 `GUARDIAN_MAX_ACTION_STRING_TOKENS`（16_000）截断。[E: codex-rs/core/src/guardian/mod.rs:79] |
| `GuardianAssessment` | parsed reviewer output 包含 `risk_level`、`user_authorization`、`outcome`、`rationale`。[E: codex-rs/core/src/guardian/mod.rs:180] |
| `GuardianAssessmentEvent` | protocol event 记录 id、target item、plugin attribution、turn id、start/end time、status、risk、authorization、rationale、decision source、action。[E: codex-rs/protocol/src/approvals.rs:206][E: codex-rs/protocol/src/approvals.rs:212][E: codex-rs/protocol/src/approvals.rs:224][E: codex-rs/protocol/src/approvals.rs:231][E: codex-rs/protocol/src/approvals.rs:249] |
| Circuit breaker | 每 turn 记 consecutive denials 与最近 50 次 review 的 denial 窗口；标准阈值 3 consecutive / 10 recent，cyber model 1 / 1，达到后 interrupt turn。[E: codex-rs/core/src/guardian/mod.rs:68][E: codex-rs/core/src/guardian/mod.rs:66][E: codex-rs/core/src/guardian/mod.rs:68][E: codex-rs/core/src/guardian/mod.rs:69] |

## 控制流

1. tool runtime 进入 `Session::request_approval()`。注释写明优先级：hooks →（`StrictAutoReview` 或 Guardian enabled 则）Guardian，否则 user。hook 的 allow/deny 先于 reviewer。[E: codex-rs/core/src/tools/approvals.rs:508]
2. `routes_approval_policy_to_guardian` 只在 approval policy 是 `OnRequest` 或 `Granular(_)`，且 reviewer 是 `ApprovalsReviewer::AutoReview` 时返回 true。[E: codex-rs/core/src/guardian/review.rs:232][E: codex-rs/core/src/guardian/review.rs:239]
3. `run_guardian_review` 先问 installed extensions 的 `fast_approval_decision`。retries、escalated `exec_command` 和 `require_synchronous_review` 跳过这条短路径。若模型被 `auto_review_required_for_model` 强制审查，只有 `Feature::GuardianV2` 开启时才仍允许 extension fast path。[E: codex-rs/core/src/guardian/review.rs:367][E: codex-rs/core/src/guardian/review.rs:379][E: codex-rs/core/src/guardian/review.rs:394]
4. 未被 claim 时计算 target item、assessment turn id、action summary，发送 `GuardianAssessmentStatus::InProgress` event。[E: codex-rs/core/src/guardian/review.rs:528]
5. 如果 external cancel 已触发，发送 `Aborted` assessment event，记录非 denial，返回 `ReviewDecision::Abort`。[E: codex-rs/core/src/guardian/review.rs:549][E: codex-rs/core/src/guardian/review.rs:716]
6. 正常路径调用 retry wrapper 跑 guardian review session；completed assessment 的 `outcome` 映射为 approved 或 denied。[E: codex-rs/core/src/guardian/review.rs:1192]
7. Timeout 发 warning 和 terminal `TimedOut` assessment event，返回 `ReviewDecision::TimedOut`；prompt build / session / parse failure 构造 high-risk、unknown-authorization、deny assessment。[E: codex-rs/core/src/guardian/review.rs:681][E: codex-rs/core/src/guardian/review.rs:706][E: codex-rs/core/src/guardian/review.rs:716]
8. Terminal allow/deny 发送 user-visible warning 和 terminal `GuardianAssessment` event。explicit denial 进 circuit breaker；allow、timeout、abort 记 non-denial。[E: codex-rs/core/src/guardian/review.rs:190]

## Prompt 与 session

1. `build_guardian_prompt_items_with_parent_turn` clone parent history、收集 transcript entries、保存 cursor、把 planned action pretty JSON 放入 prompt item。Full/Delta 都声明 transcript、tool arguments/results、retry reason、planned action 是 untrusted evidence。[E: codex-rs/core/src/guardian/prompt.rs:119][E: codex-rs/core/src/guardian/prompt.rs:141][E: codex-rs/core/src/guardian/prompt.rs:145]
2. transcript rendering 保留 user entries，最近非 user 上限 `GUARDIAN_RECENT_ENTRY_LIMIT`（40）。[E: codex-rs/core/src/guardian/prompt.rs:481][E: codex-rs/core/src/guardian/mod.rs:80]
3. `GuardianReviewSessionManager::run_review` 用 reuse key 管理 trunk；必要时走 ephemeral review。[E: codex-rs/core/src/guardian/review_session.rs:570]
4. Guardian 子 Codex 通过 `run_codex_thread_interactive` spawn，source 是 `SubAgentSource::Other("guardian")`。guardian reviewer source 使用 `empty_extension_registry()`，不继承 parent 的 V2/MCP/skills extensions。[E: codex-rs/core/src/guardian/review_session.rs:952][E: codex-rs/core/src/codex_delegate.rs:83][E: codex-rs/core/src/codex_delegate.rs:85]
5. `build_guardian_review_session_config` 强制 `approval_policy: Never`，把 permission profile 收成 read-only intersection，并 disable `Feature::GuardianV2`（以及 Collab、MultiAgentV2、Apps、Plugins、hooks、web search）。[E: codex-rs/core/src/guardian/review_session.rs:1627][E: codex-rs/core/src/guardian/review_session.rs:1661]
6. review turn submit 使用 concrete permission snapshot、`AskForApproval::Never`、collaboration mode `Default`。[E: codex-rs/core/src/guardian/review_session.rs:1288][E: codex-rs/core/src/guardian/review_session.rs:1293]

Guardian reviewer 的 model tool surface 也被 planner 单独收紧：`add_core_tool_sources` 识别 guardian source 后，只在全部 environment 都是 `PermissionProfile::Managed` 时注册 `exec_command` / `write_stdin`（需 `Feature::ShellTool` + `Feature::UnifiedExec`）以及 `Feature::ViewImage` 开启时的 `view_image`；随后 `return`。guardian turn 还可以挂只读 `history.*` extension tools。[E: codex-rs/core/src/tools/spec_plan.rs:978][E: codex-rs/core/src/tools/spec_plan.rs:994][E: codex-rs/core/src/tools/spec_plan.rs:1016][E: codex-rs/core/src/tools/spec_plan.rs:1029]

`is_basic_session_source` 同时匹配 `SubAgent(Other("guardian"))` 与 `Internal(InternalSessionSource::Guardian)`。[E: codex-rs/core/src/guardian/review.rs:242]

## 设计动机与权衡

- Guardian V1 使用独立 child Codex 而不是 parent turn 内自评，是为了把审查运行在单独 prompt、read-only permission snapshot 和 `AskForApproval::Never` 下，并切断 parent extensions。[E: codex-rs/core/src/codex_delegate.rs:85][E: codex-rs/core/src/guardian/review_session.rs:1288][E: codex-rs/core/src/guardian/review_session.rs:1627][I]
- extension-before-Guardian 让 V2 这类 contributor 能在开 child session 前 claim 低风险动作；强制 auto-review 的模型在未开 V2 时仍跳过这条短路径。[E: codex-rs/core/src/guardian/review.rs:394][E: codex-rs/core/src/guardian/review.rs:379][I]
- fail-closed 策略让审查失败不会自动放行；timeout 单独返回 `TimedOut`，保留与 explicit deny 的语义差异。[E: codex-rs/core/src/guardian/review.rs:344][E: codex-rs/core/src/guardian/review.rs:716][I]

## Gotcha

- 当前 routing gate 使用 `ApprovalsReviewer::AutoReview`，不是旧名称 `GuardianSubagent`。[E: codex-rs/core/src/guardian/review.rs:239]
- Guardian transcript 不等于完整 parent rollout；它会按预算和 entry kind 过滤、截断。[E: codex-rs/core/src/guardian/prompt.rs:481]
- deny rationale 编进 `ReviewDecision::denied(...)` 返回给模型，并可附加 catalog `rejection_instructions`。[E: codex-rs/core/src/guardian/review.rs:875]
- V1 reviewer 明确 disable `Feature::GuardianV2`，避免 reviewer turn 再套一层 Luna 分类。[E: codex-rs/core/src/guardian/review_session.rs:1661]
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
- `codex-rs/ext/guardian-v2/src/lib.rs`

## 相关

- [Approval policy](approval-policy.md)
- [Guardian V2 风险分类与预审](approval-guardian-v2.md)
- [Review mode](review-mode.md)
- [指令/prompt 装配](instruction-assembly.md)
- [Tool router](tool-router.md)
