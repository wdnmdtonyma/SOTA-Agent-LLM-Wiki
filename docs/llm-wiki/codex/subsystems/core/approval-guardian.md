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
updated: 9ded177ce7
---

> Guardian V1 是 automatic approval reviewer：在 `OnRequest` 或 `Granular(_)` 且 `approvals_reviewer == AutoReview` 时，它把具体 approval request 交给名为 `guardian` 的子 Codex 审查；timeout、session failure、parse failure 都按 fail-closed 处理，不把动作静默放行。Luna 风险打分与低风险短路径属于独立 crate `ext/guardian-v2`，见 [approval-guardian-v2](approval-guardian-v2.md)。[E: codex-rs/core/src/guardian/mod.rs:53][E: codex-rs/core/src/guardian/mod.rs:54][E: codex-rs/core/src/guardian/review.rs:196][E: codex-rs/core/src/guardian/review.rs:326][E: codex-rs/core/src/guardian/review_session.rs:843]

## 能回答的问题

- 哪些 approval mode 会路由到 Guardian V1，哪些不会？
- Guardian request enum 覆盖哪些 action 类型？
- extension `approval_review` 如何在 V1 child session 之前短路？
- Guardian prompt 如何从 parent history、retry reason 和 planned action JSON 构造？
- Guardian trunk session 何时复用，何时 fork ephemeral review？
- V1 reviewer session 如何与 parent extensions（含 Guardian V2）隔离？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/core/src/guardian/mod.rs` | timeout、reviewer name、circuit-breaker 阈值、`GuardianAssessment`。[E: codex-rs/core/src/guardian/mod.rs:53][E: codex-rs/core/src/guardian/mod.rs:54][E: codex-rs/core/src/guardian/mod.rs:55][E: codex-rs/core/src/guardian/mod.rs:118] |
| `codex-rs/core/src/guardian/approval_request.rs` | `GuardianApprovalRequest` enum、action JSON 序列化。[E: codex-rs/core/src/guardian/approval_request.rs:17][E: codex-rs/core/src/guardian/approval_request.rs:262] |
| `codex-rs/core/src/guardian/prompt.rs` | transcript 收集、full/delta prompt、denied-read context、action JSON 注入。[E: codex-rs/core/src/guardian/prompt.rs:124][E: codex-rs/core/src/guardian/prompt.rs:176] |
| `codex-rs/core/src/guardian/review.rs` | routing gate、extension-before-Guardian、events、fail-closed、circuit breaker。[E: codex-rs/core/src/guardian/review.rs:192][E: codex-rs/core/src/guardian/review.rs:326] |
| `codex-rs/core/src/guardian/review_session.rs` | reusable trunk/ephemeral sessions、read-only snapshot、禁用 `Feature::GuardianV2`。[E: codex-rs/core/src/guardian/review_session.rs:496][E: codex-rs/core/src/guardian/review_session.rs:1367] |
| `codex-rs/core/src/tools/approvals.rs` | central policy stage：hooks 优先，再按 reviewer 选 Guardian 或用户；`RequestPermissions` 走同一 `request_guardian_approval`。[E: codex-rs/core/src/tools/approvals.rs:502][E: codex-rs/core/src/tools/approvals.rs:580][E: codex-rs/core/src/tools/approvals.rs:384] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `GuardianApprovalRequest` | 变体覆盖 `Shell`、`ExecCommand`、Unix `Execve`、`ApplyPatch`、`NetworkAccess`、`McpToolCall`、`RequestPermissions`。[E: codex-rs/core/src/guardian/approval_request.rs:17][E: codex-rs/core/src/guardian/approval_request.rs:26][E: codex-rs/core/src/guardian/approval_request.rs:36][E: codex-rs/core/src/guardian/approval_request.rs:44][E: codex-rs/core/src/guardian/approval_request.rs:50][E: codex-rs/core/src/guardian/approval_request.rs:59][E: codex-rs/core/src/guardian/approval_request.rs:72] |
| Action JSON | request 先序列化为 tool-specific JSON，长字符串按 `GUARDIAN_MAX_ACTION_STRING_TOKENS`（16_000）截断。[E: codex-rs/core/src/guardian/mod.rs:67][E: codex-rs/core/src/guardian/approval_request.rs:222][E: codex-rs/core/src/guardian/approval_request.rs:262] |
| `GuardianAssessment` | parsed reviewer output 包含 `risk_level`、`user_authorization`、`outcome`、`rationale`。[E: codex-rs/core/src/guardian/mod.rs:118] |
| `GuardianAssessmentEvent` | protocol event 记录 id、target item、plugin attribution、turn id、start/end time、status、risk、authorization、rationale、decision source、action。[E: codex-rs/protocol/src/approvals.rs:179][E: codex-rs/protocol/src/approvals.rs:185][E: codex-rs/protocol/src/approvals.rs:197][E: codex-rs/protocol/src/approvals.rs:204][E: codex-rs/protocol/src/approvals.rs:208][E: codex-rs/protocol/src/approvals.rs:220] |
| Circuit breaker | 每 turn 记 consecutive denials 与最近 50 次 review 的 denial 窗口；标准阈值 3 consecutive / 10 recent，cyber model 1 / 1，达到后 interrupt turn。[E: codex-rs/core/src/guardian/mod.rs:55][E: codex-rs/core/src/guardian/mod.rs:59][E: codex-rs/core/src/guardian/mod.rs:166][E: codex-rs/core/src/guardian/review.rs:243] |

## 控制流

1. tool runtime 进入 `Session::request_approval()`。注释写明优先级：hooks →（`StrictAutoReview` 或 Guardian enabled 则）Guardian，否则 user。hook 的 allow/deny 先于 reviewer。[E: codex-rs/core/src/tools/approvals.rs:502][E: codex-rs/core/src/tools/approvals.rs:502][E: codex-rs/core/src/tools/approvals.rs:518]
2. `routes_approval_policy_to_guardian` 只在 approval policy 是 `OnRequest` 或 `Granular(_)`，且 reviewer 是 `ApprovalsReviewer::AutoReview` 时返回 true。[E: codex-rs/core/src/guardian/review.rs:192][E: codex-rs/core/src/guardian/review.rs:196]
3. `run_guardian_review` 先问 installed extensions 的 `approval_review`。若模型未被 `auto_review_required_for_model` 强制审查，且 contributor 返回 `Some(decision)`，V1 直接采用该 decision（V2 低风险短路径走这里）。[E: codex-rs/core/src/guardian/review.rs:319][E: codex-rs/core/src/guardian/review.rs:326][E: codex-rs/core/src/guardian/review.rs:340]
4. 未被 claim 时计算 target item、assessment turn id、action summary，发送 `GuardianAssessmentStatus::InProgress` event。[E: codex-rs/core/src/guardian/review.rs:348][E: codex-rs/core/src/guardian/review.rs:368][E: codex-rs/core/src/guardian/review.rs:379]
5. 如果 external cancel 已触发，发送 `Aborted` assessment event，记录非 denial，返回 `ReviewDecision::Abort`。[E: codex-rs/core/src/guardian/review.rs:389][E: codex-rs/core/src/guardian/review.rs:418][E: codex-rs/core/src/guardian/review.rs:428]
6. 正常路径调用 retry wrapper 跑 guardian review session；completed assessment 的 `outcome` 映射为 approved 或 denied。[E: codex-rs/core/src/guardian/review.rs:433][E: codex-rs/core/src/guardian/review.rs:446][E: codex-rs/core/src/guardian/review.rs:447]
7. Timeout 发 warning 和 terminal `TimedOut` assessment event，返回 `ReviewDecision::TimedOut`；prompt build / session / parse failure 构造 high-risk、unknown-authorization、deny assessment。[E: codex-rs/core/src/guardian/review.rs:477][E: codex-rs/core/src/guardian/review.rs:513][E: codex-rs/core/src/guardian/review.rs:523][E: codex-rs/core/src/guardian/review.rs:588]
8. Terminal allow/deny 发送 user-visible warning 和 terminal `GuardianAssessment` event。explicit denial 进 circuit breaker；allow、timeout、abort 记 non-denial。[E: codex-rs/core/src/guardian/review.rs:616][E: codex-rs/core/src/guardian/review.rs:630][E: codex-rs/core/src/guardian/review.rs:649]

## Prompt 与 session

1. `build_guardian_prompt_items_with_parent_turn` clone parent history、收集 transcript entries、保存 cursor、把 planned action pretty JSON 放入 prompt item。Full/Delta 都声明 transcript、tool arguments/results、retry reason、planned action 是 untrusted evidence。[E: codex-rs/core/src/guardian/prompt.rs:141][E: codex-rs/core/src/guardian/prompt.rs:147][E: codex-rs/core/src/guardian/prompt.rs:176]
2. transcript rendering 保留首个和最后一个 user turn，优先从新到旧补 user entries，再按预算保留最近非 user entries；tool 与 message budget 分开，最近非 user 上限 `GUARDIAN_RECENT_ENTRY_LIMIT`（40）。[E: codex-rs/core/src/guardian/prompt.rs:463][E: codex-rs/core/src/guardian/prompt.rs:468][E: codex-rs/core/src/guardian/prompt.rs:494][E: codex-rs/core/src/guardian/mod.rs:68]
3. transcript collection 跳过 contextual user messages，但保留真实 user、developer auto-review marker、assistant、agent message、shell call、function/custom calls 和 tool outputs。[E: codex-rs/core/src/guardian/prompt.rs:551][E: codex-rs/core/src/guardian/prompt.rs:558][E: codex-rs/core/src/guardian/prompt.rs:570][E: codex-rs/core/src/guardian/prompt.rs:573][E: codex-rs/core/src/guardian/prompt.rs:579][E: codex-rs/core/src/guardian/prompt.rs:583]
4. `GuardianReviewSessionManager::run_review` 用 reuse key 管理 trunk；key mismatch 且 trunk 空闲时替换 trunk，key mismatch 或 trunk busy 时走 ephemeral review。[E: codex-rs/core/src/guardian/review_session.rs:530][E: codex-rs/core/src/guardian/review_session.rs:587]
5. Guardian 子 Codex 通过 `run_codex_thread_interactive` spawn，source 是 `SubAgentSource::Other("guardian")`。guardian reviewer source 使用 `empty_extension_registry()`，不继承 parent 的 V2/MCP/skills extensions。[E: codex-rs/core/src/guardian/review_session.rs:835][E: codex-rs/core/src/guardian/review_session.rs:843][E: codex-rs/core/src/codex_delegate.rs:83]
6. `build_guardian_review_session_config` 强制 `approval_policy: Never`，把 permission profile 收成 read-only intersection，并 disable `Feature::GuardianV2`（以及 Collab、MultiAgentV2、Apps、Plugins、hooks、web search）。[E: codex-rs/core/src/guardian/review_session.rs:1336][E: codex-rs/core/src/guardian/review_session.rs:1299][E: codex-rs/core/src/guardian/review_session.rs:1367]
7. review turn submit 使用 `PermissionProfileSnapshot` 里的 concrete profile、`AskForApproval::Never`、collaboration mode `Default`。[E: codex-rs/core/src/guardian/review_session.rs:1055][E: codex-rs/core/src/guardian/review_session.rs:1093][E: codex-rs/core/src/guardian/review_session.rs:1095][E: codex-rs/core/src/guardian/review_session.rs:1098]

Guardian reviewer 的 model tool surface 也被 planner 单独收紧：`add_core_tool_sources` 识别 guardian source 后，只在 `PermissionProfile::Managed` 且 environment 存在时注册 `exec_command`、`write_stdin`，以及 `Feature::ViewImage` 开启时的 `view_image`；随后 `return`。`Feature::UnifiedExec` 全平台默认 `true`（含 Windows），所以这条 surface 默认就是 unified exec。[E: codex-rs/core/src/tools/spec_plan.rs:896][E: codex-rs/core/src/tools/spec_plan.rs:905][E: codex-rs/core/src/tools/spec_plan.rs:917][E: codex-rs/core/src/tools/spec_plan.rs:930][E: codex-rs/features/src/lib.rs:838]

## 设计动机与权衡

- Guardian V1 使用独立 child Codex 而不是 parent turn 内自评，是为了把审查运行在单独 prompt、read-only permission snapshot 和 `AskForApproval::Never` 下，并切断 parent extensions。[E: codex-rs/core/src/codex_delegate.rs:83][E: codex-rs/core/src/guardian/review_session.rs:1093][E: codex-rs/core/src/guardian/review_session.rs:1336][I]
- extension-before-Guardian 让 V2 这类 contributor 能在开 child session 前 claim 低风险动作；强制 auto-review 的模型仍跳过这条短路径。[E: codex-rs/core/src/guardian/review.rs:326][E: codex-rs/core/src/guardian/review.rs:319][I]
- fail-closed 策略让审查失败不会自动放行；timeout 单独返回 `TimedOut`，保留与 explicit deny 的语义差异。[E: codex-rs/core/src/guardian/review.rs:523][E: codex-rs/core/src/guardian/review.rs:477][E: codex-rs/core/src/guardian/review.rs:588][I]

## Gotcha

- 当前 routing gate 使用 `ApprovalsReviewer::AutoReview`，不是旧名称 `GuardianSubagent`。[E: codex-rs/core/src/guardian/review.rs:199]
- Guardian transcript 不等于完整 parent rollout；它会按预算和 entry kind 过滤、截断、保留首尾 user anchors。[E: codex-rs/core/src/guardian/prompt.rs:463][E: codex-rs/core/src/guardian/prompt.rs:524]
- deny rationale 现在直接编进 `ReviewDecision::denied(...)` 返回给模型，不再经由 `guardian_rejection_message` 按 review id 取出后删除。[E: codex-rs/core/src/guardian/review.rs:657]
- V1 reviewer 明确 disable `Feature::GuardianV2`，避免 reviewer turn 再套一层 Luna 分类。[E: codex-rs/core/src/guardian/review_session.rs:1370]

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
