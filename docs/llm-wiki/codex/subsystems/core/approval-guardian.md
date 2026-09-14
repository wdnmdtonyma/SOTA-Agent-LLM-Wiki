---
id: subsys.core.approval-guardian
title: Guardian 自动审批审查
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/approvals.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/guardian/mod.rs, codex-rs/core/src/guardian/approval_request.rs, codex-rs/core/src/guardian/coverage.rs, codex-rs/core/src/guardian/decision.rs, codex-rs/core/src/guardian/review.rs, codex-rs/core/src/guardian/review_request.rs, codex-rs/core/src/guardian/prompt.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/core/src/guardian/review_session_factory.rs, codex-rs/core/src/guardian/reviewer_config.rs, codex-rs/core/src/guardian/input_budget.rs, codex-rs/core/src/guardian/request_budget.rs, codex-rs/core/src/guardian/tests.rs, codex-rs/core/src/codex_delegate.rs, codex-rs/protocol/src/approvals.rs, codex-rs/ext/guardian-v2/src/lib.rs, codex-rs/guardian-context/src/composition.rs, codex-rs/ext/guardian-reviewer/src/completion.rs]
symbols: [GuardianApprovalRequest, GuardianAssessmentEvent, routes_approval_to_guardian, decide_approval, spawn_approval_decision, GuardianReviewContext, build_guardian_prompt_items_with_parent_turn, GuardianReviewSessionManager, GuardianReviewSessionOutcome]
related: [subsys.core.approval-policy, subsys.core.approval-guardian-v2, subsys.core.review-mode, subsys.core.instruction-assembly, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> Guardian V1 是 automatic approval reviewer：在 `OnRequest` 或 `Granular(_)` 且 `approvals_reviewer == AutoReview` 时，host 把具体 approval request 交给名为 `guardian` 的子 Codex 审查。timeout、session failure、parse failure 都按 fail-closed 处理，不把动作静默放行。同步 review policy / retry / parsed assessment 已下沉 `ext/guardian-reviewer`；v2 install 仍以 [approval-guardian-v2](approval-guardian-v2.md) 为权威页。Luna 风险打分与低风险短路径属于独立 crate `ext/guardian-v2` 的 `async_scorer`。[E: codex-rs/core/src/guardian/mod.rs:63][E: codex-rs/core/src/guardian/mod.rs:64][E: codex-rs/core/src/guardian/review.rs:122][E: codex-rs/core/src/guardian/decision.rs:51][E: codex-rs/core/src/codex_delegate.rs:79]

## 能回答的问题

- 哪些 approval mode 会路由到 Guardian V1，哪些不会？
- Guardian request enum 覆盖哪些 action 类型？
- extension `decide_approval` 如何在 V1 child session 之前短路？
- Guardian prompt 如何从 parent history、retry reason 和 planned action JSON 构造？
- Guardian trunk session 何时复用，何时 fork ephemeral review？
- V1 reviewer session 如何与 parent extensions（含 Guardian V2）隔离？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/core/src/guardian/mod.rs` | reviewer name、timeout re-export、`GuardianReviewContext`。[E: codex-rs/core/src/guardian/mod.rs:63][E: codex-rs/core/src/guardian/mod.rs:64][E: codex-rs/core/src/guardian/mod.rs:80] |
| `codex-rs/core/src/guardian/approval_request.rs` | `GuardianApprovalRequest` enum、action JSON 序列化。[E: codex-rs/core/src/guardian/approval_request.rs:18] |
| `codex-rs/core/src/guardian/coverage.rs` | request / `ApprovalAction` → `GuardianScope`。[E: codex-rs/core/src/guardian/coverage.rs:8] |
| `codex-rs/core/src/guardian/decision.rs` | `full_access` 短路、extension `decide_approval`、fast allow、fresh-review 强制同步审查。[E: codex-rs/core/src/guardian/decision.rs:51][E: codex-rs/core/src/guardian/decision.rs:89] |
| `codex-rs/core/src/guardian/prompt.rs` | transcript 收集、full/delta prompt、planned action JSON。[E: codex-rs/core/src/guardian/prompt.rs:90][E: codex-rs/core/src/guardian/prompt.rs:120] |
| `codex-rs/core/src/guardian/review.rs` | routing gate、denial 记录、session config、child review 入口。[E: codex-rs/core/src/guardian/review.rs:122][E: codex-rs/core/src/guardian/review.rs:327] |
| `codex-rs/core/src/guardian/review_request.rs` | host `ReviewHost`：assessment event、cancel abort、complete。[E: codex-rs/core/src/guardian/review_request.rs:23] |
| `codex-rs/core/src/guardian/review_session.rs` | reusable trunk/ephemeral sessions、read-only snapshot。[E: codex-rs/core/src/guardian/review_session.rs:151][E: codex-rs/core/src/guardian/review_session.rs:339] |
| `codex-rs/core/src/guardian/reviewer_config.rs` | 把 extracted reviewer overrides 落到 host `Config`（含 `approval_policy` 与 disabled features）。[E: codex-rs/core/src/guardian/reviewer_config.rs:19] |
| `codex-rs/core/src/guardian/input_budget.rs` / `request_budget.rs` | pending review input 与 assembled request 的 token 预算。[E: codex-rs/core/src/guardian/input_budget.rs:32][E: codex-rs/core/src/guardian/request_budget.rs:59] |
| `codex-rs/core/src/tools/approvals.rs` | central policy stage：hooks 优先，再按 reviewer 选 Guardian 或用户；`RequestPermissions` 走同一 `request_guardian_approval`。[E: codex-rs/core/src/tools/approvals.rs:496][E: codex-rs/core/src/tools/approvals.rs:560] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `GuardianApprovalRequest` | 变体覆盖 `ExecCommand`、`WriteStdin`、Unix `Execve`、`ApplyPatch`、`NetworkAccess`、`McpToolCall`、`RequestPermissions`。不再有独立 `Shell` 变体。[E: codex-rs/core/src/guardian/approval_request.rs:18][E: codex-rs/core/src/guardian/approval_request.rs:32][E: codex-rs/core/src/guardian/approval_request.rs:43][E: codex-rs/core/src/guardian/approval_request.rs:51][E: codex-rs/core/src/guardian/approval_request.rs:57][E: codex-rs/core/src/guardian/approval_request.rs:66][E: codex-rs/core/src/guardian/approval_request.rs:79] |
| Action JSON | request 序列化为 tool-specific JSON（`guardian_approval_request_to_json` / `format_guardian_action_pretty`）。[E: codex-rs/core/src/guardian/approval_request.rs:247][E: codex-rs/core/src/guardian/approval_request.rs:537] |
| `GuardianAssessmentEvent` | protocol event 记录 id、target item、plugin attribution、turn id、start/end time、status、risk、authorization、rationale、decision source、action。[E: codex-rs/protocol/src/approvals.rs:206][E: codex-rs/protocol/src/approvals.rs:216][E: codex-rs/protocol/src/approvals.rs:228][E: codex-rs/protocol/src/approvals.rs:235][E: codex-rs/protocol/src/approvals.rs:253] |
| Denial interrupt | host 把 consecutive/recent denials 记到 extracted reviewer crate，达阈值后 abort 当前 turn。[E: codex-rs/core/src/guardian/review.rs:145][E: codex-rs/core/src/guardian/review.rs:183] |

## 控制流

1. tool runtime 进入 `Session::request_approval()`。优先级是 hooks →（`StrictAutoReview` 或 Guardian enabled 则）Guardian，否则 user。hook 的 allow/deny 先于 reviewer。[E: codex-rs/core/src/tools/approvals.rs:496][E: codex-rs/core/src/tools/approvals.rs:512]
2. `routes_approval_policy_to_guardian` 只在 approval policy 是 `OnRequest` 或 `Granular(_)`，且 reviewer 是 `ApprovalsReviewer::AutoReview` 时返回 true。[E: codex-rs/core/src/guardian/review.rs:122][E: codex-rs/core/src/guardian/review.rs:128]
3. `request_guardian_approval` 把 `ApprovalAction` 收成 `ReviewAction`，再 `decide_approval`（有 cancel token 时 `spawn_approval_decision`）。`None` 回到用户审批，不是隐式 allow。[E: codex-rs/core/src/tools/approvals.rs:560][E: codex-rs/core/src/tools/approvals.rs:601][E: codex-rs/core/src/guardian/decision.rs:51][E: codex-rs/core/src/guardian/decision.rs:184]
4. `decide_approval` **先**对 `full_access` 环境短路（validate 失败返回该 decision，已 cancel 则 `Abort`，否则 `Approved`），**然后**才问 installed extensions 的 `decide_approval`。`require_fresh_review` 在 `require_synchronous_review`、`auto_review_required_for_model` 且未开 `Feature::GuardianV2`、external cancel 已触发、retries、或 escalated `exec_command` 时为真，此时跳过 Allow 短路径。[E: codex-rs/core/src/guardian/decision.rs:72][E: codex-rs/core/src/guardian/decision.rs:85][E: codex-rs/core/src/guardian/decision.rs:89][E: codex-rs/core/src/guardian/decision.rs:151][E: codex-rs/core/src/guardian/decision.rs:153]
5. 未被 claim 时 host `ReviewHost::prepare` 计算 target item、assessment turn id、action summary，发送 `GuardianAssessment` started event。[E: codex-rs/core/src/guardian/review_request.rs:55][E: codex-rs/core/src/guardian/review_request.rs:108]
6. 如果 external cancel 已触发，发送 terminal assessment event，记录非 denial，返回 `ReviewDecision::Abort`。[E: codex-rs/core/src/guardian/review_request.rs:111][E: codex-rs/core/src/guardian/review_request.rs:133]
7. 正常路径跑 locked-down guardian review session。completed assessment 的 `outcome` 映射为 approved 或 denied；timeout → `TimedOut`，cancel → `Abort`，session/parse/prompt-build failure → `denied`；`InputBudgetExceeded` 且未 `require_guardian` 时 `complete` 返回 `None`（改走用户审批，不是 Approved）。[E: codex-rs/core/src/guardian/review.rs:327][E: codex-rs/core/src/guardian/review_request.rs:266][E: codex-rs/ext/guardian-reviewer/src/completion.rs:90][E: codex-rs/ext/guardian-reviewer/src/completion.rs:105][E: codex-rs/ext/guardian-reviewer/src/completion.rs:119][E: codex-rs/ext/guardian-reviewer/src/completion.rs:131]
8. Terminal allow/deny 发送 user-visible warning（如有）和 terminal `GuardianAssessment` event。explicit denial 进 denial recorder；allow、timeout、abort 记 non-denial。[E: codex-rs/core/src/guardian/review_request.rs:239][E: codex-rs/core/src/guardian/review_request.rs:261]

## Prompt 与 session

1. `build_guardian_prompt_items_with_parent_turn` 收集 parent history、planned action pretty JSON，再经 `ContextProfile::synchronous()` compose。Full/Delta 文案把 transcript、tool arguments/results、retry reason、planned action 标成 untrusted evidence。[E: codex-rs/core/src/guardian/prompt.rs:90][E: codex-rs/core/src/guardian/prompt.rs:120][E: codex-rs/core/src/guardian/prompt.rs:224][E: codex-rs/guardian-context/src/composition.rs:83][E: codex-rs/guardian-context/src/composition.rs:92]
2. transcript 过滤与 per-entry 截断走 `codex-guardian-context` sync profile，不再用固定 `GUARDIAN_RECENT_ENTRY_LIMIT`。[E: codex-rs/core/src/guardian/prompt.rs:297][E: codex-rs/core/src/guardian/prompt.rs:306]
3. `GuardianReviewSessionManager` 是 extracted reviewer pool 的 host alias；`run_guardian_review_session` 用 reuse key 管理 trunk，必要时走 ephemeral fork。[E: codex-rs/core/src/guardian/review_session.rs:151][E: codex-rs/core/src/guardian/review_session_factory.rs:203]
4. Guardian 子 Codex 通过 `run_codex_thread_interactive` spawn（或 managed `ThreadManager`），source 是 `SubAgentSource::Other("guardian")` / `Internal(Guardian)`。Isolated session 使用 `empty_extension_registry()`，不继承 parent 的 V2/MCP/skills extensions。[E: codex-rs/core/src/guardian/review_session_factory.rs:120][E: codex-rs/core/src/codex_delegate.rs:78][E: codex-rs/core/src/codex_delegate.rs:80]
5. `build_guardian_review_session_config` 把 reviewer overrides 写进 host config：`approval_policy` 收成 `Never`，permission profile 收成 read-only intersection，并 disable `Feature::GuardianV2`（以及 Apps、Plugins 等）。[E: codex-rs/core/src/guardian/reviewer_config.rs:60][E: codex-rs/core/src/guardian/reviewer_config.rs:92][E: codex-rs/core/src/guardian/tests.rs:4046]
6. review turn 带 concrete permission snapshot 与 parent environments；submit 走 host `ReviewerRuntime::submit_turn`。[E: codex-rs/core/src/guardian/review_session.rs:655][E: codex-rs/core/src/guardian/review_session.rs:661][E: codex-rs/core/src/guardian/review_session.rs:857]

Guardian reviewer 的 model tool surface 也被 planner 单独收紧：`add_core_tool_sources` 识别 guardian source 后，只在 **turn 自身与全部 environment** 都是 `PermissionProfile::Managed` 时注册 `exec_command` / `write_stdin`（需 `Feature::ShellTool` + `Feature::UnifiedExec`）以及 `Feature::ViewImage` 开启时的 `view_image`；随后 `return`。[E: codex-rs/core/src/tools/spec_plan.rs:978][E: codex-rs/core/src/tools/spec_plan.rs:980][E: codex-rs/core/src/tools/spec_plan.rs:994][E: codex-rs/core/src/tools/spec_plan.rs:1016][E: codex-rs/core/src/tools/spec_plan.rs:1029]

`is_basic_session_source` 同时匹配 `SubAgent(Other("guardian"))` 与 `Internal(InternalSessionSource::Guardian)`。[E: codex-rs/core/src/guardian/review.rs:131]

Pending review input 在 submit 前写入 `PendingReviewContext`，由 `input_budget` / `request_budget` 做可行性与 assembled-request 检查。[E: codex-rs/core/src/guardian/review_session.rs:652][E: codex-rs/core/src/guardian/input_budget.rs:68][E: codex-rs/core/src/guardian/request_budget.rs:59]

## 设计动机与权衡

- Guardian V1 使用独立 child Codex 而不是 parent turn 内自评，是为了把审查运行在单独 prompt、read-only permission snapshot 和 `AskForApproval::Never` 下，并切断 parent extensions。[E: codex-rs/core/src/codex_delegate.rs:80][E: codex-rs/core/src/guardian/reviewer_config.rs:60][I]
- `full_access` 短路在 extension claim 之前：已是 full-access 的环境不会再问 V2 / child reviewer。[E: codex-rs/core/src/guardian/decision.rs:89][I]
- extension-before-Guardian 让 V2 这类 contributor 能在开 child session 前 claim 低风险动作；强制 auto-review 的模型在未开 V2 时仍跳过这条 Allow 短路径。[E: codex-rs/core/src/guardian/decision.rs:72][E: codex-rs/core/src/guardian/decision.rs:153][I]
- fail-closed 策略让审查失败不会自动放行：`decide_approval` 的 `None` 只表示改走用户流；timeout / cancel / session-parse failure 由 extracted reviewer `complete_review` 映射，不把动作静默放行。[E: codex-rs/core/src/guardian/decision.rs:184][E: codex-rs/core/src/guardian/review_request.rs:133][E: codex-rs/ext/guardian-reviewer/src/completion.rs:131][I]

## Gotcha

- 当前 routing gate 使用 `ApprovalsReviewer::AutoReview`，不是旧名称 `GuardianSubagent`。[E: codex-rs/core/src/guardian/review.rs:128]
- Guardian transcript 不等于完整 parent rollout；它会按 context profile 和 entry kind 过滤、截断。[E: codex-rs/core/src/guardian/prompt.rs:297]
- deny 决策由 extracted reviewer 编成 `ReviewDecision::denied(...)` 返回给模型；host `complete` 原样交出 `completed.decision`。[E: codex-rs/core/src/guardian/review_request.rs:266]
- `InputBudgetExceeded` 且未 `require_guardian` 时，`complete_review` 返回 `decision: None`（用户流），不是 Approved；`require_guardian` 时同一错误仍 fail-closed deny。[E: codex-rs/ext/guardian-reviewer/src/completion.rs:90]
- V1 reviewer 明确 disable `Feature::GuardianV2`，避免 reviewer turn 再套一层 Luna 分类。[E: codex-rs/core/src/guardian/tests.rs:4046]
- 旧独立 crate `ext/guardian` 已删除；fork-source thread context 现在由 `codex-guardian-v2` crate 根上的 `GuardianExtension` 写入。[E: codex-rs/ext/guardian-v2/src/lib.rs:59]

## Sources

- `codex-rs/core/src/tools/approvals.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/guardian/mod.rs`
- `codex-rs/core/src/guardian/approval_request.rs`
- `codex-rs/core/src/guardian/coverage.rs`
- `codex-rs/core/src/guardian/decision.rs`
- `codex-rs/core/src/guardian/review.rs`
- `codex-rs/core/src/guardian/review_request.rs`
- `codex-rs/core/src/guardian/prompt.rs`
- `codex-rs/core/src/guardian/review_session.rs`
- `codex-rs/core/src/guardian/review_session_factory.rs`
- `codex-rs/core/src/guardian/reviewer_config.rs`
- `codex-rs/core/src/guardian/input_budget.rs`
- `codex-rs/core/src/guardian/request_budget.rs`
- `codex-rs/core/src/guardian/tests.rs`
- `codex-rs/core/src/codex_delegate.rs`
- `codex-rs/protocol/src/approvals.rs`
- `codex-rs/ext/guardian-v2/src/lib.rs`
- `codex-rs/guardian-context/src/composition.rs`
- `codex-rs/ext/guardian-reviewer/src/completion.rs`

## 相关

- [Approval policy](approval-policy.md)
- [Guardian V2 风险分类与预审](approval-guardian-v2.md)
- [Review mode](review-mode.md)
- [指令/prompt 装配](instruction-assembly.md)
- [Tool router](tool-router.md)
