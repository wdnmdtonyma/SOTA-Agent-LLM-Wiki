---
id: subsys.core.approval-guardian
title: Guardian 自动审批审查
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/approvals.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/guardian/mod.rs, codex-rs/core/src/guardian/approval_request.rs, codex-rs/core/src/guardian/coverage.rs, codex-rs/core/src/guardian/decision.rs, codex-rs/core/src/guardian/review.rs, codex-rs/core/src/guardian/review_request.rs, codex-rs/core/src/guardian/prompt.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/core/src/guardian/review_session_setup.rs, codex-rs/core/src/guardian/reviewer_config.rs, codex-rs/core/src/guardian/input_budget.rs, codex-rs/core/src/guardian/request_budget.rs, codex-rs/core/src/guardian/tests.rs, codex-rs/core/src/codex_delegate.rs, codex-rs/protocol/src/approvals.rs, codex-rs/ext/guardian-v2/src/lib.rs, codex-rs/guardian-context/src/composition.rs, codex-rs/ext/guardian-reviewer/src/completion.rs]
symbols: [GuardianApprovalRequest, GuardianAssessmentEvent, routes_approval_to_guardian, decide_approval, spawn_approval_decision, GuardianReviewContext, build_guardian_prompt_items_with_parent_turn, GuardianReviewSessionManager, GuardianReviewSessionOutcome]
related: [subsys.core.approval-policy, subsys.core.approval-guardian-v2, subsys.core.review-mode, subsys.core.instruction-assembly, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> Guardian V1 是 automatic approval reviewer：host 把具体 approval request 交给名为 `guardian` 的子 Codex 审查。routing 由 `codex_guardian_reviewer::routes_approval_policy_to_guardian` 再 export。timeout、session failure、parse failure 都按 fail-closed 处理。同步 review policy / retry / parsed assessment 在 `ext/guardian-reviewer`；child session 工厂码在 `review_session.rs` + `review_session_setup.rs`（已删除 `review_session_factory.rs`）。Luna 短路径见 [approval-guardian-v2](approval-guardian-v2.md)。[E: codex-rs/core/src/guardian/mod.rs:67][E: codex-rs/core/src/guardian/review.rs:100][E: codex-rs/core/src/guardian/decision.rs:45][E: codex-rs/core/src/guardian/review_session.rs:9][E: codex-rs/core/src/guardian/review_session.rs:122][E: codex-rs/core/src/guardian/review_session_setup.rs:206][E: codex-rs/core/src/codex_delegate.rs:79]

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
| `codex-rs/core/src/guardian/mod.rs` | reviewer name、timeout re-export、`GuardianReviewContext`。[E: codex-rs/core/src/guardian/mod.rs:66][E: codex-rs/core/src/guardian/mod.rs:67][E: codex-rs/core/src/guardian/mod.rs:83] |
| `codex-rs/core/src/guardian/approval_request.rs` | `GuardianApprovalRequest` enum、action JSON 序列化。[E: codex-rs/core/src/guardian/approval_request.rs:18] |
| `codex-rs/core/src/guardian/coverage.rs` | request / `ApprovalAction` → `GuardianScope`。[E: codex-rs/core/src/guardian/coverage.rs:8] |
| `codex-rs/core/src/guardian/decision.rs` | `full_access` 短路、extension `decide_approval`、`require_synchronous_review` 强制同步审查。[E: codex-rs/core/src/guardian/decision.rs:45][E: codex-rs/core/src/guardian/decision.rs:72][E: codex-rs/core/src/guardian/decision.rs:76][E: codex-rs/core/src/guardian/decision.rs:107][E: codex-rs/core/src/guardian/decision.rs:125] |
| `codex-rs/core/src/guardian/prompt.rs` | transcript 收集、full/delta prompt、planned action JSON。[E: codex-rs/core/src/guardian/prompt.rs:82][E: codex-rs/core/src/guardian/prompt.rs:118] |
| `codex-rs/core/src/guardian/review.rs` | `is_basic_session_source`、session config、retry 入口；policy routing 再 export reviewer crate。[E: codex-rs/core/src/guardian/review.rs:100][E: codex-rs/core/src/guardian/review.rs:102][E: codex-rs/core/src/guardian/review.rs:241] |
| `codex-rs/core/src/guardian/review_request.rs` | host `ReviewHost`：assessment event、cancel abort、complete。[E: codex-rs/core/src/guardian/review_request.rs:26] |
| `codex-rs/core/src/guardian/review_session.rs` | `GuardianReviewSessionManager` 别名 `ReviewerPool`；`run_guardian_review_session` 经 `#[path = "review_session_setup.rs"]` 再 export。[E: codex-rs/core/src/guardian/review_session.rs:5][E: codex-rs/core/src/guardian/review_session.rs:9][E: codex-rs/core/src/guardian/review_session.rs:122] |
| `codex-rs/core/src/guardian/review_session_setup.rs` | reuse key、fork snapshot、`run_guardian_review_session`。[E: codex-rs/core/src/guardian/review_session_setup.rs:206] |
| `codex-rs/core/src/guardian/reviewer_config.rs` | 把 extracted reviewer overrides 落到 host `Config`（含 `approval_policy` 与 disabled features）。[E: codex-rs/core/src/guardian/reviewer_config.rs:16] |
| `codex-rs/core/src/guardian/input_budget.rs` / `request_budget.rs` | pending review input 可行性 (`check_pending`) 与 assembled request (`prepare_prompt`) 的 token 预算。[E: codex-rs/core/src/guardian/input_budget.rs:38][E: codex-rs/core/src/guardian/request_budget.rs:67] |
| `codex-rs/core/src/tools/approvals.rs` | central policy stage：hooks 优先，再按 reviewer 选 Guardian 或用户；`RequestPermissions` 走同一 `request_guardian_approval`。[E: codex-rs/core/src/tools/approvals.rs:508][E: codex-rs/core/src/tools/approvals.rs:572] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `GuardianApprovalRequest` | 变体覆盖 `ExecCommand`、`WriteStdin`、Unix `Execve`、`ApplyPatch`、`NetworkAccess`、`McpToolCall`、`RequestPermissions`。不再有独立 `Shell` 变体。[E: codex-rs/core/src/guardian/approval_request.rs:18][E: codex-rs/core/src/guardian/approval_request.rs:32][E: codex-rs/core/src/guardian/approval_request.rs:43][E: codex-rs/core/src/guardian/approval_request.rs:52][E: codex-rs/core/src/guardian/approval_request.rs:59][E: codex-rs/core/src/guardian/approval_request.rs:69][E: codex-rs/core/src/guardian/approval_request.rs:82] |
| Action JSON | request 序列化为 tool-specific JSON（`guardian_approval_request_to_json` / `format_guardian_action_pretty`）。[E: codex-rs/core/src/guardian/approval_request.rs:266][E: codex-rs/core/src/guardian/approval_request.rs:563] |
| `GuardianAssessmentEvent` | protocol event 记录 id、target item、plugin attribution、turn id、start/end time、status、risk、authorization、rationale、decision source、action。[E: codex-rs/protocol/src/approvals.rs:206][E: codex-rs/protocol/src/approvals.rs:220][E: codex-rs/protocol/src/approvals.rs:232][E: codex-rs/protocol/src/approvals.rs:239][E: codex-rs/protocol/src/approvals.rs:257] |
| Denial interrupt | extracted reviewer `ReviewDenials` / circuit breaker 记 consecutive/recent denials，达阈值后 abort 当前 turn。[E: codex-rs/ext/guardian-reviewer/src/review.rs:141][E: codex-rs/ext/guardian-reviewer/src/review.rs:143][E: codex-rs/ext/guardian-reviewer/src/reporting.rs:146][E: codex-rs/ext/guardian-reviewer/src/circuit_breaker.rs:53] |

## 控制流

1. tool runtime 进入 `Session::request_approval()`。优先级是 hooks →（`StrictAutoReview` 或 Guardian enabled 则）Guardian，否则 user。hook 的 allow/deny 先于 reviewer。[E: codex-rs/core/src/tools/approvals.rs:508][E: codex-rs/core/src/tools/approvals.rs:524]
2. `routes_approval_policy_to_guardian` 由 `codex_guardian_reviewer` 拥有，core 只 `pub(crate) use`。[E: codex-rs/core/src/guardian/review.rs:100]
3. `request_guardian_approval` 把 `ApprovalAction` 收成 `ReviewAction`，再 `decide_approval`。注释写明 `None` 走既有用户流，不是隐式 allow。[E: codex-rs/core/src/guardian/decision.rs:45][E: codex-rs/core/src/guardian/decision.rs:45]
4. `decide_approval` 组装 `codex_guardian_reviewer::ReviewRequest`（含 `full_access`、`model_requires_review`、`require_synchronous_review`、`async_enabled=Feature::GuardianV2`、`retried`、`escalated_exec`），再 `.decide(&session.services.extensions)`。history reset / cancel 之后强制 `Abort`。[E: codex-rs/core/src/guardian/decision.rs:64][E: codex-rs/core/src/guardian/decision.rs:72][E: codex-rs/core/src/guardian/decision.rs:76][E: codex-rs/core/src/guardian/decision.rs:107][E: codex-rs/core/src/guardian/decision.rs:111][E: codex-rs/core/src/guardian/decision.rs:125][E: codex-rs/core/src/guardian/decision.rs:129]
5. 未被 claim 时 host `ReviewHost::prepare` 计算 target item、assessment turn id、action summary，发送 `GuardianAssessment` started event。[E: codex-rs/core/src/guardian/review_request.rs:75][E: codex-rs/core/src/guardian/review_request.rs:108]
6. 如果 external cancel 已触发，发送 terminal assessment event，记录非 denial，返回 `ReviewDecision::Abort`。[E: codex-rs/core/src/guardian/review_request.rs:111][E: codex-rs/core/src/guardian/review_request.rs:133]
7. 正常路径跑 locked-down guardian review session。completed assessment 的 `outcome` 映射为 approved 或 denied；timeout → `TimedOut`，cancel → `Abort`，session/parse/prompt-build failure → `denied`；`InputBudgetExceeded` 且未 `require_guardian` 时 `complete` 返回 `None`（改走用户审批，不是 Approved）。[E: codex-rs/core/src/guardian/review.rs:189][E: codex-rs/core/src/guardian/review_request.rs:266][E: codex-rs/ext/guardian-reviewer/src/completion.rs:70][E: codex-rs/ext/guardian-reviewer/src/completion.rs:85][E: codex-rs/ext/guardian-reviewer/src/completion.rs:99][E: codex-rs/ext/guardian-reviewer/src/completion.rs:132]
8. Terminal allow/deny 发送 user-visible warning（如有）和 terminal `GuardianAssessment` event。explicit denial 进 denial recorder；allow、timeout、abort 记 non-denial。[E: codex-rs/core/src/guardian/review_request.rs:241][E: codex-rs/core/src/guardian/review_request.rs:261]

## Prompt 与 session

1. `build_guardian_prompt_items_with_parent_turn` 收集 parent history、planned action pretty JSON，再经 `ContextProfile::synchronous()` compose。Full/Delta 文案把 transcript、tool arguments/results、retry reason、planned action 标成 untrusted evidence。[E: codex-rs/core/src/guardian/prompt.rs:82][E: codex-rs/core/src/guardian/prompt.rs:118][E: codex-rs/core/src/guardian/prompt.rs:208][E: codex-rs/guardian-context/src/composition.rs:88][E: codex-rs/guardian-context/src/composition.rs:97]
2. transcript 过滤与 per-entry 截断走 `codex-guardian-context` sync profile，不再用固定 `GUARDIAN_RECENT_ENTRY_LIMIT`。[E: codex-rs/core/src/guardian/prompt.rs:255][E: codex-rs/core/src/guardian/prompt.rs:264]
3. `GuardianReviewSessionManager` 是 `ReviewerPool<GuardianReviewSession>` 别名；`run_guardian_review_session` 在 `review_session.rs` re-export，实现在 `review_session_setup.rs`。[E: codex-rs/core/src/guardian/review_session.rs:9][E: codex-rs/core/src/guardian/review_session.rs:122][E: codex-rs/core/src/guardian/review_session_setup.rs:206]
4. Isolated delegate 使用 `empty_extension_registry()`，不继承 parent 的 V2/MCP/skills extensions。`is_guardian_reviewer` 用 `is_basic_session_source`。[E: codex-rs/core/src/codex_delegate.rs:78][E: codex-rs/core/src/codex_delegate.rs:79][E: codex-rs/core/src/codex_delegate.rs:80]
5. `build_guardian_review_session_config` 收紧 reviewer Config；测试 disable 列表含 `Feature::GuardianV2`（及 Apps / Plugins），循环断言 reviewer 上这些 feature 为关。[E: codex-rs/core/src/guardian/tests.rs:4005][E: codex-rs/core/src/guardian/tests.rs:4037][E: codex-rs/core/src/guardian/tests.rs:4039]
6. review turn 带 concrete permission snapshot 与 parent environments；submit 走 host `ReviewerRuntime::submit_turn`。[E: codex-rs/core/src/guardian/review_session.rs:665][E: codex-rs/core/src/guardian/review_session.rs:671][E: codex-rs/core/src/guardian/review_session.rs:861]

Guardian reviewer 在 `guardian-reviewer` `reviewer_tool_policy()` 里设 `require_managed_sandbox: true`（以及 `require_unified_exec` 与 allowed-tools 白名单）。planner `add_core_tool_sources` 只认该 flag：turn 或任一 environment 不是 `PermissionProfile::Managed` 时 early-return，**跳过全部 core tools**；flag 通过后继续 `add_shell_tools` 等，不是 guardian-only 白名单后 return。MCP 仍在 `add_core_tool_sources` 之后 `append_mcp_tools`。Guardian 工具面另由 reviewer allowed-tools / empty MCP config / `prepare_guardian_prompt` 收紧。[E: codex-rs/ext/guardian-reviewer/src/settings.rs:39][E: codex-rs/core/src/tools/spec_plan.rs:1018][E: codex-rs/core/src/tools/spec_plan.rs:151][E: codex-rs/core/src/tools/spec_plan.rs:153]

`is_basic_session_source` 同时匹配 `SubAgent(Other("guardian"))` 与 `Internal(InternalSessionSource::Guardian)`。[E: codex-rs/core/src/guardian/review.rs:102]

Pending review input 在 submit 前写入 `PendingReviewContext`；`input_budget::check_pending` 做可行性检查，`request_budget::prepare_prompt` 检查 assembled request（`finalize` 在 `input_budget.rs:79`）。[E: codex-rs/core/src/guardian/review_session.rs:662][E: codex-rs/core/src/guardian/input_budget.rs:38][E: codex-rs/core/src/guardian/input_budget.rs:79][E: codex-rs/core/src/guardian/request_budget.rs:67]

## 设计动机与权衡

- Guardian V1 使用独立 child Codex 而不是 parent turn 内自评，是为了把审查运行在单独 prompt、read-only permission snapshot 和 `AskForApproval::Never` 下，并切断 parent extensions。[E: codex-rs/core/src/codex_delegate.rs:80][E: codex-rs/core/src/guardian/reviewer_config.rs:60][I]
- `full_access` 短路在 extension claim 之前：已是 full-access 的环境不会再问 V2 / child reviewer。[E: codex-rs/core/src/guardian/decision.rs:72][E: codex-rs/core/src/guardian/decision.rs:125][I]
- extension-before-Guardian 让 V2 这类 contributor 能在开 child session 前 claim 低风险动作；强制 auto-review 的模型在未开 V2 时仍跳过这条 Allow 短路径。host 侧用 `require_synchronous_review`（不是 `full_access` 行）标记强制同步审查。[E: codex-rs/core/src/guardian/decision.rs:76][E: codex-rs/core/src/guardian/decision.rs:107][E: codex-rs/core/src/guardian/decision.rs:131][I]
- fail-closed 策略让审查失败不会自动放行：`decide_approval` 的 `None` 只表示改走用户流；timeout / cancel / session-parse failure 由 extracted reviewer `complete_review` 映射，不把动作静默放行。[E: codex-rs/core/src/guardian/decision.rs:131][E: codex-rs/core/src/guardian/review_request.rs:133][E: codex-rs/ext/guardian-reviewer/src/completion.rs:132][I]

## Gotcha

- routing 实现不在 `review.rs` 函数体，只 re-export `codex_guardian_reviewer::routes_approval_policy_to_guardian`。[E: codex-rs/core/src/guardian/review.rs:100]
- 不要引用已删除的 `guardian/review_session_factory.rs`。
- Guardian transcript 不等于完整 parent rollout；它会按 context profile 和 entry kind 过滤、截断。[E: codex-rs/core/src/guardian/prompt.rs:255]
- deny 决策由 extracted reviewer 编成 `ReviewDecision::denied(...)` 返回给模型；host `complete` 原样交出 `completed.decision`。[E: codex-rs/core/src/guardian/review_request.rs:266]
- `InputBudgetExceeded` 且未 `require_guardian` 时，`complete_review` 返回 `decision: None`（用户流），不是 Approved；`require_guardian` 时同一错误仍 fail-closed deny。[E: codex-rs/ext/guardian-reviewer/src/completion.rs:70]
- V1 reviewer 明确 disable `Feature::GuardianV2`，避免 reviewer turn 再套一层 Luna 分类。[E: codex-rs/core/src/guardian/tests.rs:4005][E: codex-rs/core/src/guardian/tests.rs:4037][E: codex-rs/core/src/guardian/tests.rs:4039]
- 旧独立 crate `ext/guardian` 已删除；fork-source thread context 现在由 `codex-guardian-v2` crate 根上的 `GuardianExtension` 写入。[E: codex-rs/ext/guardian-v2/src/lib.rs:21]

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
- `codex-rs/core/src/guardian/review_session_setup.rs`
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
