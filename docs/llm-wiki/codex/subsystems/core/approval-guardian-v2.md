---
id: subsys.core.approval-guardian-v2
title: Guardian V2 风险分类与预审
kind: subsystem
tier: T2
source: [codex-rs/ext/guardian-v2/src/lib.rs, codex-rs/ext/guardian-v2/src/config.rs, codex-rs/ext/guardian-v2/src/extension.rs, codex-rs/ext/guardian-v2/src/sampler.rs, codex-rs/ext/guardian-v2/src/transcript.rs, codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/app-server/src/extensions.rs, codex-rs/protocol/src/security_risk.rs, codex-rs/core/src/guardian/review.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/core/src/codex_delegate.rs, codex-rs/core/src/config/mod.rs, codex-rs/ext/extension-api/src/registry.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/tui/src/lib.rs, codex-rs/exec/src/lib.rs, codex-rs/mcp-server/src/message_processor.rs]
symbols: [install, GuardianV2Extension, GuardianV2Config, LunaSampler, LunaSamplerConfig, LunaSamplingRequest, SecurityRiskScore, ApprovalReviewContributor]
related: [subsys.core.approval-guardian, subsys.core.approval-policy, tool.request-permissions, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Guardian V2 是独立 crate `codex-guardian-v2`：它在 tool start 时用 Luna (`gpt-5.6-luna`) 给当前 tool action 打 `action_risk` 分，把 `SecurityRiskScore` 快照写入 thread store / rollout；随后作为 `ApprovalReviewContributor`，只对低于可配置 `review_threshold` 的低风险动作直接 `Approved`。高风险、缺分、或模型要求强制 auto-review 时一律不 claim，交给 V1 `core/src/guardian` child Codex reviewer。[E: codex-rs/ext/guardian-v2/src/lib.rs:6][E: codex-rs/ext/guardian-v2/src/sampler.rs:40][E: codex-rs/ext/guardian-v2/src/extension.rs:262][E: codex-rs/ext/guardian-v2/src/extension.rs:273][E: codex-rs/core/src/guardian/review.rs:326][E: codex-rs/protocol/src/security_risk.rs:13]

V1 自动审批审查（child Codex、`GuardianAssessment`、circuit breaker）仍在 [approval-guardian](approval-guardian.md)。本节点只覆盖 `ext/guardian-v2` 与它如何挂进 app-server / V1 review gate。

## 能回答的问题

- Guardian V2 和 `core/src/guardian` V1 reviewer 各自做什么，谁先谁后？
- `features.guardianv2` 哪些字段可配置，默认阈值和 transcript 来源是什么？
- Luna 如何采样、何时复用 parent compaction、分数如何落成 `SecurityRiskScore`？
- 高风险动作为什么仍会进入 V1 Guardian 自动审查？
- app-server 如何 install V2，V1 reviewer session 为什么看不到它？

## 职责边界

| 层 | 职责 | 不是 |
|---|---|---|
| `ext/guardian-v2` | 异步风险分类、低风险短路径 allow、把分数存成 snapshot | 不 spawn child Codex，不产出 `GuardianAssessment` |
| `core/src/guardian` | V1 auto-reviewer：child session、JSON assessment、fail-closed deny/timeout | 不实现 Luna classifier |
| `ext/guardian` | 给 thread store 放 `GuardianThreadContext`，供 host spawn V1 subagent | 不是 V2 classifier |
| app-server `thread_extensions` | 同时 `codex_guardian::install` 与 `codex_guardian_v2::install` | 不给 MCP server / 测试 / V1 reviewer 等绕开 `thread_extensions` 的 host 装 V2 |

`Feature::GuardianV2` key 是 `guardianv2`，stage `UnderDevelopment`，默认关闭；`Feature::GuardianApproval` key 是 `guardian_approval`，默认开启。V2 只在两个 feature 都开时激活。[E: codex-rs/features/src/lib.rs:258][E: codex-rs/features/src/lib.rs:266][E: codex-rs/features/src/lib.rs:1340][E: codex-rs/features/src/lib.rs:1364][E: codex-rs/ext/guardian-v2/src/extension.rs:196]

## 关键 crate / 文件

| 文件 | 角色 |
|---|---|
| `codex-rs/ext/guardian-v2/src/lib.rs` | 公开 `install` 与 Luna sampler 类型。[E: codex-rs/ext/guardian-v2/src/lib.rs:6] |
| `codex-rs/ext/guardian-v2/src/config.rs` | 从 `features.guardianv2` 解析 `GuardianV2Config`：阈值、token 上限、transcript、classifier 文案。[E: codex-rs/ext/guardian-v2/src/config.rs:35] |
| `codex-rs/ext/guardian-v2/src/extension.rs` | thread start 接线、tool-start 分类、approval-review 短路径、action JSON 截断。[E: codex-rs/ext/guardian-v2/src/extension.rs:190][E: codex-rs/ext/guardian-v2/src/extension.rs:262][E: codex-rs/ext/guardian-v2/src/extension.rs:282] |
| `codex-rs/ext/guardian-v2/src/sampler.rs` | Luna WebSocket 连接池、tool-less structured sample、compatible compaction 复用。[E: codex-rs/ext/guardian-v2/src/sampler.rs:138][E: codex-rs/ext/guardian-v2/src/sampler.rs:279] |
| `codex-rs/ext/guardian-v2/src/transcript.rs` | 分类器用的压缩 transcript，默认只保留 tool calls/outputs。[E: codex-rs/ext/guardian-v2/src/transcript.rs:45] |
| `codex-rs/features/src/feature_configs.rs` | `GuardianV2ConfigToml` / transcript source enum 的用户配置 schema。[E: codex-rs/features/src/feature_configs.rs:79][E: codex-rs/features/src/feature_configs.rs:111] |
| `codex-rs/app-server/src/extensions.rs` | 生产路径唯一 `codex_guardian_v2::install` 调用点。[E: codex-rs/app-server/src/extensions.rs:98] |
| `codex-rs/protocol/src/security_risk.rs` | `SecurityRiskScore` rollout/thread snapshot。[E: codex-rs/protocol/src/security_risk.rs:13] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `GuardianV2ConfigToml` | `enabled`、`classifier_instructions`、`review_threshold` (0.0–1.0)、`reasoning_effort`、`max_action_tokens`、`max_classifier_instruction_tokens`、`transcript`。[E: codex-rs/features/src/feature_configs.rs:111][E: codex-rs/features/src/feature_configs.rs:118] |
| `GuardianV2TranscriptSource` | `tool_calls` / `tool_outputs` / `reasoning`。[E: codex-rs/features/src/feature_configs.rs:79] |
| `GuardianV2Config` | runtime 解析结果。默认 `review_threshold=0.8`、`reasoning_effort=Low`、action/instruction token 默认 10_000（夹在 100–100_000）、transcript 默认 sources=`[ToolCalls, ToolOutputs]`。[E: codex-rs/ext/guardian-v2/src/config.rs:18][E: codex-rs/ext/guardian-v2/src/config.rs:121][E: codex-rs/ext/guardian-v2/src/config.rs:130][E: codex-rs/ext/guardian-v2/src/config.rs:136] |
| `LunaSamplerConfig` | provider、HTTP factory、agent-identity policy、session/thread id、originator、service tier、`luna_compaction_hash`。[E: codex-rs/ext/guardian-v2/src/sampler.rs:50] |
| `LunaSamplingRequest` | trusted `instructions`、untrusted `input`、optional parent compaction + hash、strict `output_schema`、`reasoning_effort`、`turn_id`。[E: codex-rs/ext/guardian-v2/src/sampler.rs:72] |
| `SecurityRiskScore` | `BTreeMap<String, f64>` + optional `sampled_at`。注释与 rollout 处理都要求它不进 model-visible context。[E: codex-rs/protocol/src/security_risk.rs:13][E: codex-rs/protocol/src/security_risk.rs:18] |
| `GuardianAction` | `tool_name` + `ToolPayload`；序列化前按 `max_action_tokens` 截断，必要时丢字段并写 `_guardian_omitted_fields`。[E: codex-rs/ext/guardian-v2/src/extension.rs:42][E: codex-rs/ext/guardian-v2/src/extension.rs:69][E: codex-rs/ext/guardian-v2/src/extension.rs:80] |

## 控制流

1. app-server `thread_extensions()` 先 `codex_guardian::install`（V1 thread context），再 `codex_guardian_v2::install`。后者注册 thread-lifecycle、approval-review、tool-lifecycle 三个 contributor。[E: codex-rs/app-server/src/extensions.rs:97][E: codex-rs/app-server/src/extensions.rs:98][E: codex-rs/ext/guardian-v2/src/extension.rs:499]
2. `on_thread_start` 要求 `Feature::GuardianV2` 且 `Feature::GuardianApproval`。配置非法只 emit warning 并返回；Luna `connect` 失败同样 warning，不插入 `GuardianV2Enabled`。[E: codex-rs/ext/guardian-v2/src/extension.rs:196][E: codex-rs/ext/guardian-v2/src/extension.rs:205][E: codex-rs/ext/guardian-v2/src/extension.rs:247]
3. 成功后 thread store 放入 `LunaSampler`、`GuardianV2Config`、`GuardianV2Enabled`。sampler 模型固定 `gpt-5.6-luna`，初始打开 2 条 Responses WebSocket，池上限 16，连接年龄 55 分钟。[E: codex-rs/ext/guardian-v2/src/extension.rs:248][E: codex-rs/ext/guardian-v2/src/sampler.rs:40][E: codex-rs/ext/guardian-v2/src/sampler.rs:154][E: codex-rs/ext/guardian-v2/src/sampler.rs:42]
4. `on_tool_start` 立刻 `tokio::spawn` 异步分类，不阻塞 tool 执行。它先 `GuardianAction::render(max_action_tokens)` 再拼 transcript + planned action JSON；序列化失败只 warning。[E: codex-rs/ext/guardian-v2/src/extension.rs:308][E: codex-rs/ext/guardian-v2/src/extension.rs:314][E: codex-rs/ext/guardian-v2/src/extension.rs:457]
5. classifier instructions = 截断后的 `classifier_instructions` + `# Security Policy` + `Config::resolve_guardian_policy`。若 thread 没有 `guardian_policy_config`，会先取 review-model catalog 的 `model_messages`（或 fallback 到 parent `model_messages`），再 resolve：显式 config → catalog `auto_review.policy` → `BUNDLED_GUARDIAN_POLICY`。[E: codex-rs/ext/guardian-v2/src/extension.rs:346][E: codex-rs/ext/guardian-v2/src/extension.rs:369][E: codex-rs/core/src/config/mod.rs:1454][E: codex-rs/core/src/config/mod.rs:1458]
6. Luna 请求 `tool_choice: "none"`、strict schema `{ scores: { action_risk: 0.0..=1.0 } }`。分数校验后写入 `SecurityRiskScore { scores, sampled_at }`；`insert_if` 只接受更新的 `sampled_at`；非 ephemeral thread 再 `append_rollout_items(&[RolloutItem::SecurityRiskScore])`。[E: codex-rs/ext/guardian-v2/src/sampler.rs:329][E: codex-rs/ext/guardian-v2/src/extension.rs:383][E: codex-rs/ext/guardian-v2/src/extension.rs:427][E: codex-rs/ext/guardian-v2/src/extension.rs:441]
7. V1 `run_guardian_review` 在发 InProgress event / 开 child session 之前调用 `extensions.approval_review(...)`。registry 按安装顺序取第一个 `Some(ReviewDecision)`。[E: codex-rs/core/src/guardian/review.rs:326][E: codex-rs/ext/extension-api/src/registry.rs:192]
8. V2 `contribute` 先要求 `GuardianV2Enabled` 与 config；再读 `SecurityRiskScore.scores["action_risk"]`。仅当 `score < review_threshold` 时返回 `Approved`。缺分、分数 ≥ 阈值、或 `auto_review_required_for_model` 为真时不 claim，V1 child reviewer 继续跑。[E: codex-rs/ext/guardian-v2/src/extension.rs:270][E: codex-rs/ext/guardian-v2/src/extension.rs:276][E: codex-rs/core/src/guardian/review.rs:319]

## Luna 采样与 compaction

`LunaSampler::sample` 只在 parent compaction hash 非空且等于 Luna 自己的 `luna_compaction_hash` 时，把 encrypted parent compaction 塞进 input。否则只发送 developer instructions + user classification payload。[E: codex-rs/ext/guardian-v2/src/sampler.rs:302][E: codex-rs/ext/guardian-v2/src/extension.rs:461]

`encrypted_parent_compaction` 取 history 里最后一个 `Compaction` / `ContextCompaction`，且必须带 id 和非空 encrypted content。[E: codex-rs/ext/guardian-v2/src/extension.rs:464]

池满时优先 supersede 已 scored 的最老请求；被 supersede 且还没产出完整 JSON 的请求返回 `LunaSamplerError::Superseded`，extension 把它当成成功 no-op，不覆盖已有分数。[E: codex-rs/ext/guardian-v2/src/sampler.rs:357][E: codex-rs/ext/guardian-v2/src/extension.rs:408]

V1 reviewer 另有 `Feature::GuardianReuseParentCompaction`（默认关），那是 child Codex session 的 compaction 复用，不是 Luna hash 比较。[E: codex-rs/features/src/lib.rs:1346][E: codex-rs/core/src/guardian/review_session.rs:502]

## 与 V1 reviewer 的隔离

V1 reviewer 通过 `run_codex_thread_interactive(..., SubAgentSource::Other("guardian"))` spawn。`is_guardian_reviewer_source` 为真时，delegate 使用 `empty_extension_registry()`，不继承 parent 上的 V2 / MCP / skills 等 extensions。[E: codex-rs/core/src/codex_delegate.rs:83][E: codex-rs/core/src/guardian/review_session.rs:843]

`build_guardian_review_session_config` 还会 `features.disable(Feature::GuardianV2)`（以及 Collab、MultiAgentV2、Apps、Plugins、hooks、web search）。即使有人把 registry 传进去，reviewer turn 也不会再开一层 V2 classifier。[E: codex-rs/core/src/guardian/review_session.rs:1367]

Guardian reviewer 的 model tool surface 由 `add_core_tool_sources` 单独收紧：只在 `PermissionProfile::Managed` 且 environment 存在时注册 `exec_command`、`write_stdin`，以及 `Feature::ViewImage` 开启时的 `view_image`；随后 `return`，不走 `add_shell_tools`，也不加入 MCP / extension / hosted tools。这条 reviewer surface 硬编码 unified exec，不读 `Feature::UnifiedExec`。该 feature 本身现在全平台默认 `true`（含 Windows）。[E: codex-rs/core/src/tools/spec_plan.rs:896][E: codex-rs/core/src/tools/spec_plan.rs:905][E: codex-rs/core/src/tools/spec_plan.rs:930][E: codex-rs/core/src/tools/spec_plan.rs:933][E: codex-rs/features/src/lib.rs:838]

## 设计动机与权衡

- V2 把“便宜的结构化打分”和“贵的 child Codex 审查”拆开：低风险动作可以跳过 V1 session，高风险仍走 fail-closed 的 V1 assessment。[E: codex-rs/ext/guardian-v2/src/extension.rs:276][E: codex-rs/core/src/guardian/review.rs:326][I]
- 分类在 `on_tool_start` 异步进行，是为了不把 Luna 延迟加到每条 tool 的关键路径；代价是 approval 可能先于分数到达，此时 V2 不 claim。[E: codex-rs/ext/guardian-v2/src/extension.rs:308][E: codex-rs/ext/guardian-v2/src/extension.rs:273][I]
- action JSON 先截断再分类，避免超长 patch/command 撑爆 Luna context，也避免把未裁剪 payload 当分类输入。[E: codex-rs/ext/guardian-v2/src/extension.rs:69][E: codex-rs/ext/guardian-v2/src/extension.rs:314][I]
- compaction 复用要求 hash 完全一致，避免把不兼容的 parent encrypted summary 喂给 Luna。[E: codex-rs/ext/guardian-v2/src/sampler.rs:302][I]

## Gotcha

- 生产 `codex_guardian_v2::install` 只有 app-server `thread_extensions`。TUI/exec 经 embedded/remote app-server 继承这份 registry，仍受 `guardianv2` + `guardian_approval` 双 feature 门控；MCP server 与 `empty_extension_registry()` host（含 V1 reviewer）不会自己 install V2。[E: codex-rs/app-server/src/extensions.rs:98][E: codex-rs/tui/src/lib.rs:1017][E: codex-rs/exec/src/lib.rs:807][E: codex-rs/mcp-server/src/message_processor.rs:98]
- V2 短路径只返回 `Approved`。它从不在 `contribute` 里 deny；高风险是“不 claim”，不是 V2 deny。[E: codex-rs/ext/guardian-v2/src/extension.rs:276]
- `auto_review_required_for_model` 为真时，即使已有低风险分数，V1 也会跳过 extension short-circuit。[E: codex-rs/core/src/guardian/review.rs:319]
- 默认 transcript 不含 user/assistant 文本，只含 tool calls/outputs；要加 reasoning 必须配置 `features.guardianv2.transcript.sources`。[E: codex-rs/ext/guardian-v2/src/config.rs:136][E: codex-rs/ext/guardian-v2/src/transcript.rs:45]
- Luna 输出超过 8KiB 或缺少 assistant text 会失败；失败只 warning，不写分数，后续 approval 走 V1。[E: codex-rs/ext/guardian-v2/src/sampler.rs:102][E: codex-rs/ext/guardian-v2/src/extension.rs:448]

## Sources

- `codex-rs/ext/guardian-v2/src/lib.rs`
- `codex-rs/ext/guardian-v2/src/config.rs`
- `codex-rs/ext/guardian-v2/src/extension.rs`
- `codex-rs/ext/guardian-v2/src/sampler.rs`
- `codex-rs/ext/guardian-v2/src/transcript.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/app-server/src/extensions.rs`
- `codex-rs/protocol/src/security_risk.rs`
- `codex-rs/core/src/guardian/review.rs`
- `codex-rs/core/src/guardian/review_session.rs`
- `codex-rs/core/src/codex_delegate.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/ext/extension-api/src/registry.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/tui/src/lib.rs`
- `codex-rs/exec/src/lib.rs`
- `codex-rs/mcp-server/src/message_processor.rs`

## 相关

- [Guardian V1 自动审批审查](approval-guardian.md)
- [Approval policy](approval-policy.md)
- [request_permissions 工具](../../surface/tools/request-permissions.md)
- [Tool router](tool-router.md)
