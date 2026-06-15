---
id: subsys.core.approval-policy
title: Approval policy 与权限状态机
kind: subsystem
tier: T2
source: [codex-rs/utils/approval-presets/src/lib.rs, codex-rs/protocol/src/approvals.rs, codex-rs/core/src/guardian/policy_template.md, codex-rs/core/src/exec_policy.rs, codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/permissions.rs]
symbols: [ApprovalPreset, AskForApproval, SandboxPolicy, GranularApprovalConfig, ExecApprovalRequestEvent, GuardianAssessmentEvent, create_exec_approval_requirement_for_command, prompt_is_rejected_by_policy, load_exec_policy, render_decision_for_unmatched_command]
related: [subsys.core.approval-guardian, subsys.exec-sandbox.execpolicy-dsl, config.approval-sandbox, ref.protocol-items]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Approval policy 是 Codex 把用户选择的审批模式、sandbox policy、exec policy DSL 和 sandbox escalation prompt 约束成 `Skip`、`NeedsApproval`、`Forbidden` 的命令决策状态机；Guardian assessment 和 approval request 是 protocol 事件模型中的相邻权限流，而不是 `create_exec_approval_requirement_for_command` 的直接输入。[E: codex-rs/core/src/exec_policy.rs:234][E: codex-rs/core/src/exec_policy.rs:280][E: codex-rs/protocol/src/approvals.rs:179][E: codex-rs/protocol/src/approvals.rs:212][I]

## 能回答的问题

- `read-only`、`auto`、`full-access` preset 分别映射到哪个 `AskForApproval` 和 `SandboxPolicy`？
- `AskForApproval::Never`、`OnRequest`、`UnlessTrusted`、`Granular` 在命令审批中如何影响 prompt/forbid/allow？
- `Decision::Prompt` 什么时候被降级成 forbidden，而不是发审批事件给用户？
- exec policy rule、network rule、additional permissions 怎样进入 protocol event？
- Guardian policy template 的 risk/outcome 判定和 runtime approval event 是什么关系？

## 职责边界

- `codex-rs/utils/approval-presets` 只定义 UI/配置层可选 preset；真实命令决策不在 preset crate 执行。[E: codex-rs/utils/approval-presets/src/lib.rs:20][E: codex-rs/utils/approval-presets/src/lib.rs:23]
- `codex-rs/protocol/src/approvals.rs` 定义跨进程/跨 UI 的审批请求、guardian assessment、network approval 和 permissions 数据结构，不执行本地命令。[E: codex-rs/protocol/src/approvals.rs:19][E: codex-rs/protocol/src/approvals.rs:212]
- `codex-rs/core/src/exec_policy.rs` 是命令级 allow/prompt/forbid 的 runtime 决策位置；它读取 policy、解析 command prefix、处理 sandbox override、生成 `ExecApprovalRequirement`。[E: codex-rs/core/src/exec_policy.rs:204][E: codex-rs/core/src/exec_policy.rs:234]
- `codex-rs/core/src/guardian/policy_template.md` 是 Guardian reviewer/authorization 的 prompt policy 模板；它不是 Rust runtime 的 enum 定义。[E: codex-rs/core/src/guardian/policy_template.md:1][E: codex-rs/core/src/guardian/policy_template.md:47]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `codex-rs/utils/approval-presets/src/lib.rs` | 内置 preset：`read-only`、`auto`、`full-access`。[E: codex-rs/utils/approval-presets/src/lib.rs:24][E: codex-rs/utils/approval-presets/src/lib.rs:31][E: codex-rs/utils/approval-presets/src/lib.rs:38] |
| `codex-rs/protocol/src/protocol.rs` | `AskForApproval`、`GranularApprovalConfig`、`SandboxPolicy` 的协议枚举与默认 sandbox constructors。[E: codex-rs/protocol/src/protocol.rs:830][E: codex-rs/protocol/src/protocol.rs:881][E: codex-rs/protocol/src/protocol.rs:1008] |
| `codex-rs/protocol/src/approvals.rs` | `Permissions`、`ExecPolicyAmendment`、`GuardianAssessmentEvent`、`ExecApprovalRequestEvent`。[E: codex-rs/protocol/src/approvals.rs:19][E: codex-rs/protocol/src/approvals.rs:33][E: codex-rs/protocol/src/approvals.rs:179][E: codex-rs/protocol/src/approvals.rs:212] |
| `codex-rs/core/src/exec_policy.rs` | 命令决策、policy 加载、rule amendment 持久化、unmatched command fallback。[E: codex-rs/core/src/exec_policy.rs:521][E: codex-rs/core/src/exec_policy.rs:580] |
| `codex-rs/core/src/guardian/policy_template.md` | Guardian risk/user authorization/outcome 的 LLM policy 文本。[E: codex-rs/core/src/guardian/policy_template.md:41][E: codex-rs/core/src/guardian/policy_template.md:47] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `ApprovalPreset` | `id`、`label`、`description`、`approval`、`sandbox` | preset 同时携带审批模式和 sandbox policy，不只是 UI label。[E: codex-rs/utils/approval-presets/src/lib.rs:4][E: codex-rs/utils/approval-presets/src/lib.rs:13][E: codex-rs/utils/approval-presets/src/lib.rs:16] |
| `AskForApproval` | `UnlessTrusted`、`OnFailure`、`OnRequest`、`Granular`、`Never` | `OnRequest` 是 default；`OnFailure` 标记 deprecated；`Granular` 使用 `GranularApprovalConfig`。[E: codex-rs/protocol/src/protocol.rs:849][E: codex-rs/protocol/src/protocol.rs:856][E: codex-rs/protocol/src/protocol.rs:864][E: codex-rs/protocol/src/protocol.rs:868][E: codex-rs/protocol/src/protocol.rs:876] |
| `GranularApprovalConfig` | `sandbox_approval`、`rules`、`skill_approval`、`request_permissions`、`mcp_elicitations` | granular approval 分别控制 shell/sandbox approval、execpolicy prompt rule、skill approval、`request_permissions` tool 和 MCP elicitation prompt 是否能显示给用户。[E: codex-rs/protocol/src/protocol.rs:881][E: codex-rs/protocol/src/protocol.rs:885][E: codex-rs/protocol/src/protocol.rs:887][E: codex-rs/protocol/src/protocol.rs:890][E: codex-rs/protocol/src/protocol.rs:893][E: codex-rs/protocol/src/protocol.rs:895] |
| `SandboxPolicy` | `DangerFullAccess`、`ReadOnly`、`ExternalSandbox`、`WorkspaceWrite` | sandbox policy 同时表达 filesystem access 和 network access；`new_read_only_policy` 默认 full read 且 `network_access: false`，`new_workspace_write_policy` 默认 workspace-write 且 `network_access: false`。[E: codex-rs/protocol/src/protocol.rs:1010][E: codex-rs/protocol/src/protocol.rs:1012][E: codex-rs/protocol/src/protocol.rs:1017][E: codex-rs/protocol/src/protocol.rs:1023][E: codex-rs/protocol/src/protocol.rs:1131][E: codex-rs/protocol/src/protocol.rs:1140] |
| `Permissions` | `sandbox_policy`、`file_system_sandbox_policy`、`network_sandbox_policy` | approval protocol 可以传递统一 sandbox policy 以及拆分后的 filesystem/network sandbox policy。[E: codex-rs/protocol/src/approvals.rs:19][E: codex-rs/protocol/src/approvals.rs:21][E: codex-rs/protocol/src/approvals.rs:22][E: codex-rs/protocol/src/approvals.rs:23] |
| `GuardianAssessmentEvent` | `id`、`target_item_id`、`turn_id`、`status`、`risk_level`、`user_authorization`、`rationale`、`decision_source`、`action` | Guardian assessment 是事件流的一部分，携带风险等级、授权和被评估 action。[E: codex-rs/protocol/src/approvals.rs:179][E: codex-rs/protocol/src/approvals.rs:195][E: codex-rs/protocol/src/approvals.rs:199][E: codex-rs/protocol/src/approvals.rs:209] |
| `ExecApprovalRequestEvent` | `command`、`cwd`、`reason`、`network_approval_context`、`proposed_execpolicy_amendment`、`proposed_network_policy_amendments`、`additional_permissions`、`available_decisions`、`parsed_cmd` | UI 收到的 exec approval request 可以展示命令、cwd、网络上下文、建议 rule、额外权限和可选决定。[E: codex-rs/protocol/src/approvals.rs:212][E: codex-rs/protocol/src/approvals.rs:228][E: codex-rs/protocol/src/approvals.rs:230][E: codex-rs/protocol/src/approvals.rs:233][E: codex-rs/protocol/src/approvals.rs:237][E: codex-rs/protocol/src/approvals.rs:241][E: codex-rs/protocol/src/approvals.rs:245][E: codex-rs/protocol/src/approvals.rs:249][E: codex-rs/protocol/src/approvals.rs:256][E: codex-rs/protocol/src/approvals.rs:257] |

## 控制流

1. 内置 preset 先把人类选择折叠为 `(AskForApproval, SandboxPolicy)`：`read-only` 是 `OnRequest + ReadOnly`，`auto` 是 `OnRequest + WorkspaceWrite`，`full-access` 是 `Never + DangerFullAccess`。[E: codex-rs/utils/approval-presets/src/lib.rs:24][E: codex-rs/utils/approval-presets/src/lib.rs:28][E: codex-rs/utils/approval-presets/src/lib.rs:29][E: codex-rs/utils/approval-presets/src/lib.rs:35][E: codex-rs/utils/approval-presets/src/lib.rs:36][E: codex-rs/utils/approval-presets/src/lib.rs:42][E: codex-rs/utils/approval-presets/src/lib.rs:43]
2. `load_exec_policy` 按配置 layer 读取 exec policy，能够跳过 user/project rules，并把 `rules/*.rules` 文件解析进 parser；它还会把 `permissions.exec_policy` overlay merge 到已构建 policy 上。[E: codex-rs/core/src/exec_policy.rs:521][E: codex-rs/core/src/exec_policy.rs:532][E: codex-rs/core/src/exec_policy.rs:554][E: codex-rs/core/src/exec_policy.rs:562][E: codex-rs/core/src/exec_policy.rs:577]
3. 命令进入 `create_exec_approval_requirement_for_command` 后，`commands_for_exec_policy` 会把 `bash -lc` 脚本拆成多个 command prefix；无法安全拆分时会回退到原始 command。[E: codex-rs/core/src/exec_policy.rs:246][E: codex-rs/core/src/exec_policy.rs:677][E: codex-rs/core/src/exec_policy.rs:682][E: codex-rs/core/src/exec_policy.rs:688]
4. `exec_policy.check_multiple_with_options` 先尝试匹配 DSL rule；`Decision::Forbidden` 直接返回 `ExecApprovalRequirement::Forbidden`，不会进入用户 prompt。[E: codex-rs/core/src/exec_policy.rs:258][E: codex-rs/core/src/exec_policy.rs:280][E: codex-rs/core/src/exec_policy.rs:282]
5. `Decision::Prompt` 会先经过 `prompt_is_rejected_by_policy`：`AskForApproval::Never` 永远拒绝 prompt；`OnFailure`、`OnRequest`、`UnlessTrusted` 允许 prompt；`Granular` 只有对应 granular allowlist 或 sandbox approval flag 允许时才 prompt。[E: codex-rs/core/src/exec_policy.rs:138][E: codex-rs/core/src/exec_policy.rs:141][E: codex-rs/core/src/exec_policy.rs:145][E: codex-rs/core/src/exec_policy.rs:153]
6. 如果 prompt 未被 policy 拒绝，runtime 返回 `ExecApprovalRequirement::NeedsApproval`，字段只有 prompt reason 和可选的 `proposed_execpolicy_amendment`；该 amendment 来自 requested prefix rule 或自动推导的 prompt rule amendment。[E: codex-rs/core/src/exec_policy.rs:292][E: codex-rs/core/src/exec_policy.rs:293][E: codex-rs/core/src/exec_policy.rs:294][E: codex-rs/core/src/exec_policy.rs:296]
7. `Decision::Allow` 返回 `Skip`；只有当每个 command segment 都显式匹配 allow policy 时，`bypass_sandbox` 才会为 true。[E: codex-rs/core/src/exec_policy.rs:306][E: codex-rs/core/src/exec_policy.rs:309][E: codex-rs/core/src/exec_policy.rs:317]
8. unmatched command 进入 `render_decision_for_unmatched_command`：known-safe command 且不是 complex parsing 时 allow；在 `OnRequest` 下，unrestricted/external sandbox allow，restricted sandbox 只有显式 sandbox override 时 prompt，否则 allow。[E: codex-rs/core/src/exec_policy.rs:580][E: codex-rs/core/src/exec_policy.rs:589][E: codex-rs/core/src/exec_policy.rs:636][E: codex-rs/core/src/exec_policy.rs:649]
9. `append_amendment_and_update` 和 `append_network_rule_and_update` 把用户接受的 exec/network rule 写入默认 rules file 并更新内存 policy，所以一次审批可以改变后续命令状态。[E: codex-rs/core/src/exec_policy.rs:330][E: codex-rs/core/src/exec_policy.rs:358][E: codex-rs/core/src/exec_policy.rs:380][E: codex-rs/core/src/exec_policy.rs:408]
10. Guardian policy template 要求先分配 `risk_level` 和 `user_authorization` 再推导 `outcome`；默认阈值允许 low/medium，high 只有在授权至少 medium、范围窄且没有 tenant deny rule 时才 allow，critical 默认 deny。[E: codex-rs/core/src/guardian/policy_template.md:48][E: codex-rs/core/src/guardian/policy_template.md:51][E: codex-rs/core/src/guardian/policy_template.md:52][E: codex-rs/core/src/guardian/policy_template.md:53][E: codex-rs/core/src/guardian/policy_template.md:54]

## 设计动机与权衡

- preset 把常见安全姿态做成三档，但 runtime 仍保留 `GranularApprovalConfig`、exec policy DSL、network rule 和 permissions event，说明 Codex 需要同时支持简单 UI 和细粒度企业/项目 policy。[E: codex-rs/utils/approval-presets/src/lib.rs:20][E: codex-rs/protocol/src/protocol.rs:881][E: codex-rs/protocol/src/approvals.rs:33][I]
- `prompt_is_rejected_by_policy` 把 “prompt 是否可发出” 从 “DSL rule 想要 prompt” 中拆开，避免 `Never` 或不允许 granular approval 的配置被 rule 绕过。[E: codex-rs/core/src/exec_policy.rs:138][E: codex-rs/core/src/exec_policy.rs:284][I]
- `Decision::Allow` 的 `bypass_sandbox` 需要每段 command 都显式允许，说明 allow rule 不等同于自动退出 sandbox；sandbox bypass 是更严格的派生状态。[E: codex-rs/core/src/exec_policy.rs:309][E: codex-rs/core/src/exec_policy.rs:317][I]
- `SandboxPolicy` 到 filesystem/network permissions 的转换在 protocol 层有显式函数，表明 approval UI 可以基于统一权限对象展示而不是解析 enum 文本。[E: codex-rs/protocol/src/permissions.rs:935][E: codex-rs/protocol/src/permissions.rs:945][I]

## Gotcha

- `full-access` preset 的审批模式是 `Never`，这表示不询问用户；它同时给 `DangerFullAccess`，所以这不是“安全自动批准”，而是“完全不拦截”的组合。[E: codex-rs/utils/approval-presets/src/lib.rs:38][E: codex-rs/utils/approval-presets/src/lib.rs:42][E: codex-rs/utils/approval-presets/src/lib.rs:43]
- `OnFailure` 仍在 enum 中但注释标记 deprecated；新逻辑不应把它当成首选新模式。[E: codex-rs/protocol/src/protocol.rs:856][E: codex-rs/protocol/src/protocol.rs:862]
- `Granular` 对 prompt 的允许逻辑和 unmatched command fallback 是两层逻辑；unmatched command 中 `Granular` mirrors `OnRequest`，但 prompt/reject 仍由 `prompt_is_rejected_by_policy` 决定。[E: codex-rs/core/src/exec_policy.rs:656][E: codex-rs/core/src/exec_policy.rs:664][E: codex-rs/core/src/exec_policy.rs:141]

## Sources

- `codex-rs/utils/approval-presets/src/lib.rs`
- `codex-rs/protocol/src/approvals.rs`
- `codex-rs/core/src/guardian/policy_template.md`
- `codex-rs/core/src/exec_policy.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/permissions.rs`

## 相关

- [Approval Guardian](approval-guardian.md)
- [execpolicy DSL](../exec-sandbox/execpolicy-dsl.md)
- [approval/sandbox 配置](../../config/approval-sandbox.md)
- 索引 id：`ref.protocol-items`
