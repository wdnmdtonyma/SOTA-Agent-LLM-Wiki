---
id: subsys.core.approval-guardian
title: Guardian 自动审批审查
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/approvals.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/guardian/mod.rs, codex-rs/core/src/guardian/approval_request.rs, codex-rs/core/src/guardian/review.rs, codex-rs/core/src/guardian/prompt.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/protocol/src/approvals.rs]
symbols: [GuardianApprovalRequest, GuardianAssessment, GuardianAssessmentEvent, GuardianRejectionCircuitBreaker, routes_approval_to_guardian, review_approval_request, build_guardian_prompt_items_with_parent_turn, GuardianReviewSessionManager, GuardianReviewSessionOutcome]
related: [subsys.core.approval-policy, subsys.core.review-mode, subsys.core.instruction-assembly, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 7750465934
---

> Guardian 是 automatic approval reviewer：在 `OnRequest` 或 `Granular(_)` 且 `approvals_reviewer == AutoReview` 时，它把具体 approval request 交给名为 `guardian` 的子 Codex 审查；timeout、session failure、parse failure 都按 fail-closed 处理，不把动作静默放行。[E: codex-rs/core/src/guardian/mod.rs:47][E: codex-rs/core/src/guardian/review.rs:173][E: codex-rs/core/src/guardian/review.rs:190][E: codex-rs/core/src/guardian/review.rs:192][E: codex-rs/core/src/guardian/review.rs:293][E: codex-rs/core/src/guardian/review_session.rs:667][E: codex-rs/core/src/guardian/review_session.rs:681]

## 能回答的问题

- 哪些 approval mode 会路由到 Guardian，哪些不会？
- Guardian request enum 覆盖哪些 action 类型？
- Guardian prompt 如何从 parent history、retry reason 和 planned action JSON 构造？
- Guardian trunk session 何时复用，何时 fork ephemeral review？
- Guardian 的 allow、deny、timeout、cancel、parse failure 如何映射到 `ReviewDecision` 和 event？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/core/src/guardian/mod.rs` | 子系统说明、公开 re-export、timeout、reviewer name、circuit-breaker 阈值、`GuardianAssessment`。[E: codex-rs/core/src/guardian/mod.rs:26][E: codex-rs/core/src/guardian/mod.rs:46][E: codex-rs/core/src/guardian/mod.rs:47][E: codex-rs/core/src/guardian/mod.rs:48][E: codex-rs/core/src/guardian/mod.rs:63] |
| `codex-rs/core/src/guardian/approval_request.rs` | `GuardianApprovalRequest` enum、action JSON 序列化、protocol assessment action 映射。[E: codex-rs/core/src/guardian/approval_request.rs:17][E: codex-rs/core/src/guardian/approval_request.rs:262][E: codex-rs/core/src/guardian/approval_request.rs:380] |
| `codex-rs/core/src/guardian/prompt.rs` | transcript 收集、full/delta prompt、denied-read context、action JSON 注入、truncation。[E: codex-rs/core/src/guardian/prompt.rs:32][E: codex-rs/core/src/guardian/prompt.rs:78][E: codex-rs/core/src/guardian/prompt.rs:108][E: codex-rs/core/src/guardian/prompt.rs:244][E: codex-rs/core/src/guardian/prompt.rs:523] |
| `codex-rs/core/src/guardian/review.rs` | routing gate、review state machine、events、analytics、deny rationale storage、circuit breaker callout。[E: codex-rs/core/src/guardian/review.rs:173][E: codex-rs/core/src/guardian/review.rs:326][E: codex-rs/core/src/guardian/review.rs:558][E: codex-rs/core/src/guardian/review.rs:606] |
| `codex-rs/core/src/guardian/review_session.rs` | reusable trunk/ephemeral sessions、review lock、subagent spawn、prompt submit、read-only review turn settings。[E: codex-rs/core/src/guardian/review_session.rs:98][E: codex-rs/core/src/guardian/review_session.rs:301][E: codex-rs/core/src/guardian/review_session.rs:658][E: codex-rs/core/src/guardian/review_session.rs:702][E: codex-rs/core/src/guardian/review_session.rs:799] |
| `codex-rs/core/src/tools/approvals.rs` | tool approval 的 central policy stage；permission hooks 优先，随后才按 routing gate 选择 Guardian 或用户，并统一拒绝/timeout 文案和 telemetry。[E: codex-rs/core/src/tools/approvals.rs:135][E: codex-rs/core/src/tools/approvals.rs:161][E: codex-rs/core/src/tools/approvals.rs:169] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `GuardianApprovalRequest` | 变体覆盖 `Shell`、`ExecCommand`、Unix `Execve`、`ApplyPatch`、`NetworkAccess`、`McpToolCall`、`RequestPermissions`。[E: codex-rs/core/src/guardian/approval_request.rs:17][E: codex-rs/core/src/guardian/approval_request.rs:18][E: codex-rs/core/src/guardian/approval_request.rs:26][E: codex-rs/core/src/guardian/approval_request.rs:36][E: codex-rs/core/src/guardian/approval_request.rs:44][E: codex-rs/core/src/guardian/approval_request.rs:50][E: codex-rs/core/src/guardian/approval_request.rs:59][E: codex-rs/core/src/guardian/approval_request.rs:72] |
| Action JSON | request 先序列化为 tool-specific JSON，长字符串会按 `GUARDIAN_MAX_ACTION_STRING_TOKENS` 截断。[E: codex-rs/core/src/guardian/approval_request.rs:219][E: codex-rs/core/src/guardian/approval_request.rs:262][E: codex-rs/core/src/guardian/approval_request.rs:273][E: codex-rs/core/src/guardian/approval_request.rs:290][E: codex-rs/core/src/guardian/approval_request.rs:319][E: codex-rs/core/src/guardian/approval_request.rs:333][E: codex-rs/core/src/guardian/approval_request.rs:353][E: codex-rs/core/src/guardian/approval_request.rs:371] |
| `GuardianAssessment` | parsed reviewer output 包含 `risk_level`、`user_authorization`、`outcome`、`rationale`。[E: codex-rs/core/src/guardian/mod.rs:63][E: codex-rs/core/src/guardian/mod.rs:64][E: codex-rs/core/src/guardian/mod.rs:65][E: codex-rs/core/src/guardian/mod.rs:66][E: codex-rs/core/src/guardian/mod.rs:67] |
| `GuardianAssessmentEvent` | protocol event 记录 id、target item、turn id、start/end time、status、risk、authorization、rationale、decision source、action。[E: codex-rs/protocol/src/approvals.rs:179][E: codex-rs/protocol/src/approvals.rs:181][E: codex-rs/protocol/src/approvals.rs:185][E: codex-rs/protocol/src/approvals.rs:197][E: codex-rs/protocol/src/approvals.rs:200][E: codex-rs/protocol/src/approvals.rs:203][E: codex-rs/protocol/src/approvals.rs:208][E: codex-rs/protocol/src/approvals.rs:212][E: codex-rs/protocol/src/approvals.rs:216][E: codex-rs/protocol/src/approvals.rs:222] |
| Circuit breaker | 每 turn 记录 consecutive denials 和最近 50 次 auto-review denial，达到阈值后触发 turn interrupt。[E: codex-rs/core/src/guardian/mod.rs:48][E: codex-rs/core/src/guardian/mod.rs:49][E: codex-rs/core/src/guardian/mod.rs:50][E: codex-rs/core/src/guardian/mod.rs:96][E: codex-rs/core/src/guardian/mod.rs:101][E: codex-rs/core/src/guardian/mod.rs:106] |

## 控制流

1. tool runtime 先进入 `resolve_tool_apporval()`；permission-request hook 可直接 allow/deny，只有 hook 未决才选择 reviewer。`routes_approval_to_guardian_with_reviewer` 只在 approval policy 是 `OnRequest` 或 `Granular(_)`，且 reviewer 是 `ApprovalsReviewer::AutoReview` 时返回 true。[E: codex-rs/core/src/tools/approvals.rs:135][E: codex-rs/core/src/tools/approvals.rs:161][E: codex-rs/core/src/guardian/review.rs:178][E: codex-rs/core/src/guardian/review.rs:190][E: codex-rs/core/src/guardian/review.rs:193]
2. `run_guardian_review` 先计算 target item、assessment turn id、action summary、analytics context，然后发送 `GuardianAssessmentStatus::InProgress` event。[E: codex-rs/core/src/guardian/review.rs:306][E: codex-rs/core/src/guardian/review.rs:307][E: codex-rs/core/src/guardian/review.rs:314][E: codex-rs/core/src/guardian/review.rs:316][E: codex-rs/core/src/guardian/review.rs:326][E: codex-rs/core/src/guardian/review.rs:337]
3. 如果 external cancel 已触发，Guardian 发送 `Aborted` assessment event，记录非 denial，然后返回 `ReviewDecision::Abort`。[E: codex-rs/core/src/guardian/review.rs:347][E: codex-rs/core/src/guardian/review.rs:351][E: codex-rs/core/src/guardian/review.rs:368][E: codex-rs/core/src/guardian/review.rs:376][E: codex-rs/core/src/guardian/review.rs:385][E: codex-rs/core/src/guardian/review.rs:386]
4. 正常路径调用 retry wrapper 跑 guardian review session；completed assessment 的 `outcome` 映射为 approved 或 denied analytics/result。[E: codex-rs/core/src/guardian/review.rs:389][E: codex-rs/core/src/guardian/review.rs:391][E: codex-rs/core/src/guardian/review.rs:398][E: codex-rs/core/src/guardian/review.rs:403][E: codex-rs/core/src/guardian/review.rs:405][E: codex-rs/core/src/guardian/review.rs:430]
5. Timeout 会发 warning 和 terminal `TimedOut` assessment event，并返回 `ReviewDecision::TimedOut`；prompt build/session/parse failure 会构造 high-risk、unknown-authorization、deny assessment。[E: codex-rs/core/src/guardian/review.rs:434][E: codex-rs/core/src/guardian/review.rs:452][E: codex-rs/core/src/guardian/review.rs:463][E: codex-rs/core/src/guardian/review.rs:471][E: codex-rs/core/src/guardian/review.rs:481][E: codex-rs/core/src/guardian/review.rs:520][E: codex-rs/core/src/guardian/review.rs:546][E: codex-rs/core/src/guardian/review.rs:549]
6. Terminal allow/deny 都会发送 user-visible warning 和 terminal `GuardianAssessment` event；deny rationale 存入 `session.services.guardian_rejections`，allow 会移除同 id 的旧 rejection。[E: codex-rs/core/src/guardian/review.rs:569][E: codex-rs/core/src/guardian/review.rs:574][E: codex-rs/core/src/guardian/review.rs:350][E: codex-rs/core/src/guardian/review.rs:612][E: codex-rs/core/src/guardian/review.rs:582][E: codex-rs/core/src/guardian/review.rs:585][E: codex-rs/core/src/guardian/review.rs:596]
7. explicit denial 会进入 circuit breaker；allow、timeout、abort 等非 counted denial 会记录 non-denial。[E: codex-rs/core/src/guardian/review.rs:606][E: codex-rs/core/src/guardian/review.rs:607][E: codex-rs/core/src/guardian/review.rs:609]

## Prompt 与 session

1. `build_guardian_prompt_items_with_parent_turn` clone parent history、收集 transcript entries、保存 cursor、把 planned action pretty JSON 放入 prompt item。[E: codex-rs/core/src/guardian/prompt.rs:108][E: codex-rs/core/src/guardian/prompt.rs:115][E: codex-rs/core/src/guardian/prompt.rs:116][E: codex-rs/core/src/guardian/prompt.rs:117][E: codex-rs/core/src/guardian/prompt.rs:121]
2. Full prompt 与 Delta prompt 都声明 transcript、tool arguments/results、retry reason、planned action 是 untrusted evidence；Delta 只发送 cursor 之后的新 retained entries。[E: codex-rs/core/src/guardian/prompt.rs:137][E: codex-rs/core/src/guardian/prompt.rs:145][E: codex-rs/core/src/guardian/prompt.rs:152][E: codex-rs/core/src/guardian/prompt.rs:155][E: codex-rs/core/src/guardian/prompt.rs:165]
3. transcript rendering 保留首个和最后一个 user turn，优先从新到旧补 user entries，再按预算保留最近非 user entries；tool 与 message budget 分开。[E: codex-rs/core/src/guardian/prompt.rs:340][E: codex-rs/core/src/guardian/prompt.rs:346][E: codex-rs/core/src/guardian/prompt.rs:351][E: codex-rs/core/src/guardian/prompt.rs:374][E: codex-rs/core/src/guardian/prompt.rs:382]
4. transcript collection 跳过 contextual user messages，但保留真实 user、developer auto-review marker、assistant、agent message、shell call、function/custom calls 和 tool outputs。[E: codex-rs/core/src/guardian/prompt.rs:432][E: codex-rs/core/src/guardian/prompt.rs:435][E: codex-rs/core/src/guardian/prompt.rs:441][E: codex-rs/core/src/guardian/prompt.rs:453][E: codex-rs/core/src/guardian/prompt.rs:456][E: codex-rs/core/src/guardian/prompt.rs:462][E: codex-rs/core/src/guardian/prompt.rs:466][E: codex-rs/core/src/guardian/prompt.rs:496]
5. `GuardianReviewSessionManager::run_review` 用 reuse key 管理 trunk；key mismatch 且 trunk 空闲时替换 trunk，key mismatch 或 trunk busy 时走 ephemeral review。[E: codex-rs/core/src/guardian/review_session.rs:371][E: codex-rs/core/src/guardian/review_session.rs:376][E: codex-rs/core/src/guardian/review_session.rs:390][E: codex-rs/core/src/guardian/review_session.rs:397][E: codex-rs/core/src/guardian/review_session.rs:449][E: codex-rs/core/src/guardian/review_session.rs:459][E: codex-rs/core/src/guardian/review_session.rs:462]
6. Guardian 子 Codex 通过 `run_codex_thread_interactive` spawn，source 是 `SubAgentSource::Other("guardian")`；review turn submit 时强制 `approval_policy: Never`、`permission_profile: read_only()`、collaboration mode `Default`。[E: codex-rs/core/src/guardian/review_session.rs:667][E: codex-rs/core/src/guardian/review_session.rs:681][E: codex-rs/core/src/guardian/review_session.rs:799][E: codex-rs/core/src/guardian/review_session.rs:811][E: codex-rs/core/src/guardian/review_session.rs:821][E: codex-rs/core/src/guardian/review_session.rs:823][E: codex-rs/core/src/guardian/review_session.rs:826][E: codex-rs/core/src/guardian/review_session.rs:827]
7. review prompt 构建前会把 parent session 已批准 hosts 同步到 guardian session 的 network approval service。[E: codex-rs/core/src/guardian/review_session.rs:756][E: codex-rs/core/src/guardian/review_session.rs:761][E: codex-rs/core/src/guardian/review_session.rs:763]

Guardian reviewer 的 model tool surface 也被 planner 单独收紧：`add_core_tool_sources` 识别 guardian source 后，只在 environment 存在时注册 `exec_command`、`write_stdin` 与 `view_image`，随后立即返回；普通 core utilities、MCP 与 collaboration tools 不会继续加入该 review turn。[E: codex-rs/core/src/tools/spec_plan.rs:669][E: codex-rs/core/src/tools/spec_plan.rs:672][E: codex-rs/core/src/tools/spec_plan.rs:694][E: codex-rs/core/src/tools/spec_plan.rs:697]

## 设计动机与权衡

- Guardian 使用独立 child Codex 而不是 parent turn 内直接自评，是为了把审查运行在单独 prompt、read-only permission profile 和 `AskForApproval::Never` 下。[E: codex-rs/core/src/guardian/review_session.rs:667][E: codex-rs/core/src/guardian/review_session.rs:799][E: codex-rs/core/src/guardian/review_session.rs:821][E: codex-rs/core/src/guardian/review_session.rs:823][I]
- reusable trunk 降低重复 reviewer 启动成本；ephemeral review 在 key mismatch 或 trunk lock 竞争时避免串行阻塞。[E: codex-rs/core/src/guardian/review_session.rs:390][E: codex-rs/core/src/guardian/review_session.rs:449][E: codex-rs/core/src/guardian/review_session.rs:459][I]
- fail-closed 策略让审查失败不会自动放行动作；timeout 被单独返回为 `TimedOut`，保留与 explicit deny 的语义差异。[E: codex-rs/core/src/guardian/review.rs:293][E: codex-rs/core/src/guardian/review.rs:434][E: codex-rs/core/src/guardian/review.rs:481][E: codex-rs/core/src/guardian/review.rs:546][I]

## Gotcha

- 当前 routing gate 使用 `ApprovalsReviewer::AutoReview`，不是旧文档里的 `GuardianSubagent` 名称。[E: codex-rs/core/src/guardian/review.rs:190][E: codex-rs/core/src/guardian/review.rs:193]
- Guardian transcript 不等于完整 parent rollout；它会按预算和 entry kind 过滤、截断、保留首尾 user anchors。[E: codex-rs/core/src/guardian/prompt.rs:346][E: codex-rs/core/src/guardian/prompt.rs:374][E: codex-rs/core/src/guardian/prompt.rs:523]
- `guardian_rejection_message` 读取 rationale 时会 remove 对应 review id；同 id 后续读取可能回退默认 rationale。[E: codex-rs/core/src/guardian/review.rs:71][E: codex-rs/core/src/guardian/review.rs:77][E: codex-rs/core/src/guardian/review.rs:79]

## Sources

- `codex-rs/core/src/tools/approvals.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/guardian/mod.rs`
- `codex-rs/core/src/guardian/approval_request.rs`
- `codex-rs/core/src/guardian/review.rs`
- `codex-rs/core/src/guardian/prompt.rs`
- `codex-rs/core/src/guardian/review_session.rs`
- `codex-rs/protocol/src/approvals.rs`

## 相关

- [Approval policy](approval-policy.md)
- [Review mode](review-mode.md)
- [指令/prompt 装配](instruction-assembly.md)
- [Tool router](tool-router.md)
