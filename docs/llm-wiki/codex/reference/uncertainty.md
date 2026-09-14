---
id: ref.uncertainty
path: reference/uncertainty.md
title: 不确定项日志
kind: reference
tier: T3
source: []
status: verified
updated: 3abbf9fe2c
evidence: unknown
---

> 全仓 `[U]`(待查/待证实)汇总,由各填充任务的 _staging/uncertainty-*.md 合并而来;每次 reconcile 重新生成。

## uncertainty-7750465934

- [U] Remote Code Mode 的 process-owned host transport 支持 `ws://`/`wss://`，但目标树不足以证明部署层另有统一认证或 TLS 强制策略；不能从 transport 能力推出生产部署安全保证。
- [U] Paginated thread 的 multi-segment lineage 当前不支持 incremental item replay；跨该边界的未来兼容策略尚未由目标源码定义。
- [U] exec-server network callback 返回 `Ask` 不保证一定出现 UI；最终结果还受 approval policy、permission profile、client callback 和连接存活状态约束。
- [U] `respect_system_proxy` 仍是 under-development/default-off；PAC 只选择一个解析后的 route，当前实现没有候选间 failover，不能视为完整浏览器代理语义。
- [U] Windows TCP process attribution 当前只覆盖 IPv4；IPv6 连接的 attribution 行为不能从现有实现外推。
- [U] dynamic skill selector 仍是 shadow-selection path，不能写成已成为稳定的用户可见选择协议。
- [U] remote plugin disk cache 的源码注释把它描述为迁移期机制；其长期持久化格式不是稳定契约。

## uncertainty-broken-skills

- [U] `ext/skills` 的 dynamic skill selector 仍是 shadow-selection path，不能写成已成为稳定的用户可见选择协议。
- [U] `SkillPolicy` 源码仍有 TODO，说 product gating 只 parse/store、尚未在 selection/injection 全路径 enforce；host merge 已按 product 过滤，但 selection/injection 是否另有漏网路径未完全证明。

## uncertainty-catalogs

- [U] `network/policyRequest` 的 `Ask` 是协议与 policy engine 的第三种决定，但仅凭 exec-server 层不能断言一定弹出 UI；是否提示、自动批准或拒绝由上层 controller 的 decider、approval policy、permission profile 与连接存活状态共同决定。
- [U] `a9519cbcdd` 上 `FEATURES` 以 `codex-rs/features/src/lib.rs` 为准共 **133** 条；旧 brief 的 114/116 已过期，不要再当当前计数。
- [U] pending environment attachment / per-environment permission profile snapshot 的完整协议与 session 状态机未在本批逐字段走完；exec-server 测试与 `CodexThread` 有 pending environment API，但不能从本批摘录推出稳定的跨 thread 环境绑定契约。
- [U] `surface/config/*`、多数 `subsystems/core/*`（tool-system/tool-router/turn-engine/turn-metadata/compaction/memory/trace-bundle）与部分 exec-sandbox 页在本轮主要做了 SHA 对齐与已知失效 claim 修补；大量历史 `[E:]` 行号 仍在文件行数范围内，但不保证每条都仍落在原断言符号上。

## uncertainty-guardian

# Uncertainty — guardian batch (`9ded177ce7`)

## Remaining [U]

- [U] 非 app-server host（直接 spawn `Session` 的 TUI/CLI/test）是否会间接走到 `thread_extensions()`：源码里 `codex_guardian_v2::install` 只有 app-server 一处调用；若某 host 不经过该装配，V2 classifier / 短路径不会出现。未把每个 host 的 extension wiring 逐一走完。
- [U] 生产 `ApprovalReviewContributor` 列表是否永远只有 V2：非 test 实现目前只看到 `GuardianV2Extension`，但不能排除未来/动态注册的其他 contributor 插在它前面。

## Not [U] after verification

- V2 不 spawn child Codex；高风险是不 claim 而不是 V2 deny。
- V1 reviewer 用 `empty_extension_registry()` 且 disable `Feature::GuardianV2`。
- `request_permissions` 走共享 `ApprovalAction::RequestPermissions` → `request_guardian_approval`。
- `Feature::UnifiedExec` `default_enabled: true`，无 Windows 例外。

## uncertainty-l2-spine-tui-auth

# L2 verify spine-tui-auth (02a8f038b8)

- auth-flows 仍保留既有 [U]：pending environment attachment / per-environment permission profile snapshot 未在本节点逐字段核完。
- `Subcommand::App` 受 `cfg(macos|windows)` 门控；源码文本仍是 29 个变体（含该臂），Linux 编译后为 28。wiki 按源码文本计 29。
- `rpc.thread-methods` 也提到 `memory/status`；本批次只确认权威方法表在 `rpc.mcp-skills-plugin-methods`，未改其它 catalog 页。

## uncertainty-l2

# Uncertainty — L2 falsifier (`9ded177ce7`)

Pages: `approval-guardian-v2`, `thread-queue`, `rollout-migration`, `diagnostics`, `crate-index`, `feature-flags`, `rpc.overview`, `spine.overview`.

## Remaining [U]

- [U] `thread/queue/*` 对 ephemeral 的拒绝只发生在 `require_thread` 的 **已加载** 分支（读 `config_snapshot.ephemeral`）。unloaded 路径走 `read_thread`，`thread-store` 没有 ephemeral 字段。`Config::ephemeral` 注释写 session 不落盘，但源码没有“unloaded ephemeral 也拒绝”的对称检查；若某条 ephemeral thread 被持久化，add/list 不会看到该 flag。
- [U] TUI `AppServerTarget::LocalDaemon` / `Remote` 连上的是外部 daemon 进程。本机只核过 embedded `start_app_server` 与 app-server `thread_extensions`；未逐步打开 daemon 启动路径证明它一定走同一个 `MessageProcessor`。若外部 daemon 是旧二进制，TUI 不会凭空带上 V2。

## Not [U] after verification

- `codex_guardian_v2::install` 生产调用只有 `app-server/src/extensions.rs`；TUI/exec 经 app-server 继承，不是 empty registry。
- V2 `contribute` 仅在 `action_risk < review_threshold` 时返回 `Approved`；高风险 / 缺分返回 `None`，V1 继续。
- Luna model id 是 `gpt-5.6-luna`。
- V1 reviewer 用 `empty_extension_registry()` 且 `features.disable(Feature::GuardianV2)`。
- 6 个 `thread/queue/*` RPC 都标 `#[experimental]`；`MAX_QUEUE_ITEMS == 100`；`ThreadQueueChanged` / `ThreadQueueChangedNotification` 都只有 `thread_id`。
- loaded ephemeral 与 loaded multi-agent v2 / unloaded `SubAgent::ThreadSpawn` 不能 add/update/start。
- `Feature::BackgroundPaginatedRolloutMigration` 默认关；`codex migrate-rollouts` 无 `--apply` 时是 `DryRun`；源码没有“migration 已完成”断言。
- `server/diagnostics` 标 experimental；doctor 确实跑 disk / endpoint security / state(storage) / Windows Dev Drive。
- workspace members 134；相对 `7750465934` 新增 `build-info` / `diagnostics` / `history` / `ext/guardian-v2` / `ext/queue` / `workload-identity` / `utils/audio`，移除 `core-skills`。
- `FEATURES` 114 条；macOS/Linux/Windows 上 Stable 36 / UnderDevelopment 40 / Experimental 2 / Deprecated 3 / Removed 33。`UnifiedExec` `default_enabled: true`，无 Windows 例外。
- `ClientRequest` 144、`ServerNotification` 74（73 个 `=>` + `AccountLoginCompleted`）、`ServerRequest` 11（9 个 v2 wire + 2 个 legacy approval）。
- `Op` 27 个变体，`EventMsg` 81 个变体。

## uncertainty-mcp-platform

# Uncertainty — mcp-platform @ 9ded177ce7

- [U] MCP prewarm 是 bounded best-effort 启动优化；step path 的 refresh/capture 才是正确性屏障，不能把 prewarm 完成当成 binding 已冻结。(`subsys.mcp.client`)
- [U] system proxy 支持受 feature/platform 与 application-resolved policy 控制；存在代码路径不代表所有构建默认启用。(`subsys.providers.http-client`)

## uncertainty-rpc-sdk-cli

# uncertainty — rpc-sdk-cli (`9ded177ce7`)

本批 assigned 节点正文没有留下 `[U]`。

已核清但不写入节点的边界：

- 研究笔记写 `client_request_definitions` wire 名 153；目标 `common.rs` 宏实例实数是 **144**。以源码宏实例为准，不把 153 标成不确定。
- `account/usage/read` 只有这一条 usage client request。`GetAccountTokenUsageParams.thread_id` 让同一方法覆盖 account-wide 与 thread estimated usage，不是第二条 wire。
- `client-libs.md` 里 test-client / remote handshake 后半控制流部分行号只做了局部重核；未再逐条重走 `app-server-test-client` 全部 login/approval 路径。当前节点未对那些旧细节标 `[U]`。

## uncertainty-spine

# Uncertainty — spine (`9ded177ce7`)

Assigned pages have no remaining `[U]`. The items below are `[I]` inferences that still hold after the rewrite, plus one catalog-policy detail that is not fully closed by spine-level sources.

## Remaining `[I]`

- `spine.overview` / `spine.turn-end-to-end`: `executed_tool_calls.attach_pending_to_prompt` 只附加 warehouse metadata 并做 request bound，不改变 model-visible tool list。这是从 attach/bound 调用点推断的；warehouse recorder 的完整语义在 tool-system 节点。
- `spine.sq-eq-architecture`: `ThreadQueueChanged` 来自 `ext/queue` 的 durable per-thread 队列，不是 `Submission.op` payload 本身。spine 只核到 `EventMsg` 变体与 host 安装点，队列 mutation RPC 细节留给 thread-queue 节点。
- `spine.process-lifecycle`: process → turn 的边界是 `Session`/`SessionIo` 已就绪；一次 user turn 的细节属于 `spine.turn-end-to-end`。这是分层约定，不是单一函数返回值。
- `spine.context-and-compaction`: remote compact 把当前 model-visible tool specs 放进 prompt，local compact 用 `Prompt { ..Default::default() }` 因此不带 tool specs。local 路径没有显式 `tools:` 字段，但是否永远为空依赖 `Prompt` 的 Default。
- `spine.trace-mcp-call`: call-time `prepare_mcp_call` 权威、revision guard 只覆盖 prepare→send 窗口、MCP approval 不走 `ToolOrchestrator`、resource list 对缺失 captured client 会回退 live connection set。这些是从调用结构推断的产品语义，不是单独的 policy 文档。

## Not marked `[U]`, but do not over-read

- Guardian V2 的 risk classification / high-risk auto-review 细节属于独立 crate `ext/guardian-v2`，spine 只记录 reviewer 工具面与 host 安装点。
- Thread queue 的 6 个 RPC 与持久化模型属于 `ext/queue` + app-server methods，spine 只记录 `ThreadQueueChanged` 事件与 host install。
- `apply_patch_preserve_line_endings` 仍是 UnderDevelopment / default-off；不要写成稳定默认行为。

## uncertainty-thread

# Thread batch uncertainty — `9ded177ce7`

- [U] Paginated thread 的 multi-segment lineage 当前不支持 incremental item replay；跨该边界的未来兼容策略尚未由目标源码定义。
- [U] 第一方 app-server / TUI 生产路径没有调用 `ThreadManager::reserve_thread_id` + `stage_pending_thread_metadata`。可见用法只在 core 集成测试；不能从 trait 存在推出 UI 已经在 start 前预留 thread id。
- [U] `background_paginated_rollout_migration` 是 UnderDevelopment / default-off。源码没有“本地 Legacy rollout 已全部迁完”的断言；`Eligible` / `SkippedBusy` / `.pending` journal 仍是正式状态。
- [U] migration canonicalizer 的 contextual-fragment matcher 是冻结副本，与 core 运行时动态 fragment registry 可能分叉；不能把 migration 重放边界等同于 live `Op::ThreadRollback` 边界。

## uncertainty-tools-collab

# [U] tools-collab — `9ded177ce7`

- [U] MCP tool catalog cache 可以把 `ToolInfo`（含 `namespace_description`）在 exact ready client 之前发布给后续 thread；但 model-visible tool advertisement 与 resource all-server list 是否永远排除 “cached-only / no ready client” 的 server，现有 `tool_catalog.rs` / `binding.rs` 分叉还不足以写成单一稳定契约。
- [U] `McpToolCatalogCache` 在 HTTP headers helper 或 remote-sourced environment variables 时会被 bypass；这些 bypass 路径是否仍保证 namespace description 字节级不变，不能从 cache happy path 外推。
- [U] V2 leaf worker（子 agent 且 `model_info.multi_agent_version != Some(V2)`）不会注册 collaboration tools，但目标模型 catalog 若漏标 `multi_agent_version`，实际会不会被误判成 leaf，取决于 catalog 数据而不是 core 默认。
- [U] catalog 来源的 `<multi_agent_role>` / world-state `multi_agent_usage_hint` 在 paginated history、remote compact 与 rollback 之后是否总能只出现一次、且不把父角色说明泄漏给 child，当前只证明了 full-history fork 会 filter/remove，不能外推所有 history mode。
- [U] imagegen 返回的 `FunctionCallOutput` `input_image` 会进入 session `prepare_response_items`；`unified_image_budget` / `image_resize_notice` 对 generated image 的最终尺寸、notice 文案和 Responses Lite 表现，还受模型 original-detail 能力与 provider 路径约束，不能从 imagegen handler 单独推出。
- [U] `request_plugin_install` 发出的 `PluginInstallRequested` / `record_plugin_install_suggestion` 与 `core-plugins` 的 `PluginMetricsSidecar` 是两条独立度量面；sidecar 何时绑定到某次 install 请求，当前工具路径没有给出闭合证据。

## uncertainty-tools-exec

# tools-exec batch uncertainty — `9ded177ce7`

## Remaining [U]

- [U] 本轮 brief 写 “no open-session/tool-description limits that were removed”。目标树可以证明 framed/gRPC `open_session` 不再按并发 session 数或 tool-description 大小拒绝请求，但仍保留 request/active-cell/control/delegate semaphore。无法从当前 checkout 单独证明上一 SHA 里具体是哪条 open-session / tool-description 配额被删掉的。
- [U] Windows 上 UnifiedExec 默认开启还取决于 `conpty_supported()`。feature registry 全平台 `default_enabled: true`，但若某 Windows 构建的 ConPTY 探测失败，`shell_type_for_model_and_features` 仍会回落到 `ShellCommand`。本批未在目标树里核到 ConPTY 探测对所有 Windows 发行版恒为 true。
- [U] `wait_for_environment` 的 `StartingTurnEnvironment::wait_until_ready()` 失败后，handler 把任意 error 都映射成 “failed to start and is unavailable”。不同 environment 后端的失败原因是否会丢失，本批未逐个环境实现核对。

## Notes (not [U])

- Guardian reviewer 只暴露 `exec_command` / `write_stdin` / 可选 `view_image`，这是 `add_core_tool_sources` 的显式 early-return，不是推断。
- `Feature::ViewImage` 是 Stable 且默认 true；`Feature::UnifiedImageBudget` 与 `Feature::ApplyPatchPreserveLineEndings` 都是 under-development、默认 false。
- 本批未发现新的 core tool 名字。

## uncertainty-tui

# TUI batch uncertainty — `9ded177ce7`

本批次 assigned TUI 节点没有留下未核证的 `[U]`。

## Remaining `[I]`

- `config.ui-tui`: `ConfigToml` 顶层 `pub` 字段从 96 变成 97；本节点只覆盖其中 12 个 key。其它 config catalog 节点是否已覆盖第 97 个字段，本批次未核。
- `subsys.tui.streaming-pipeline`: chunking policy 的 non-responsibilities（不看 source identity / 不 mutate UI）是从代码边界推断，不是单独的 policy contract 类型。
- `subsys.tui.event-system`: stale history/usage response 按 request/log identity 丢弃，是跨多个 async 完成路径的共性，不是单一 helper。
- `subsys.tui.rendering-theming`: `set_theme_override` 二次调用不改 OnceLock 值，但已初始化 theme 仍会 live-update。

## Verified, not `[U]`

- TUI 仍没有 thread-section CRUD UI。resume picker / named lookup / agent picker 都发 `section_id: None`；`ThreadSortKey::SectionPosition` 只当 Updated 处理。
- `/export` 已存在，不是未实现面。
- first-login 会 delay composer；非 first-login 的 startup composer 可编辑但不可提交。

## uncertainty-update-02a8f038b8-catalogs

# Catalog recount notes — 02a8f038b8

Filler 对照源码重数后，与 UPDATE-INSTRUCTIONS / research 备忘录的两处 expected 不一致。正文已按源码写，不把备忘录当 [E]。

## workspace members：源码 147，不是 148

`codex-rs/Cargo.toml` `members` 第 3–149 行是 147 个 path，第 150 行是闭合 `]`，`resolver` 在 151。

- base `121f91fd5d`：145 members（3–147），`]` 在 148。旧 wiki 已计入 `exec-server/tests/support`。
- target：只新增 `ext/guardian-reviewer`、`user-verification`。145 + 2 = 147。
- 备忘录写「148（第 3–150 行）」是把闭合括号行算进 members。

## server notifications：宏内 84 variants，不是 83

`server_notification_definitions!`（`common.rs:1907`）：

- 83 个 `Variant => "wire" (Type)`，含新增 `ThreadAttachmentUpdated => "thread/attachment/updated"`
- 1 个 `AccountLoginCompleted` 用 serde/TS/strum rename 固定 `account/login/completed`

合计 **84**。旧 wiki 的 83 = 82 `=>` + AccountLoginCompleted；本轮 +1 attachment notification。

client RPC 167、server requests 11（9 v2 `=> "path"` + legacy `ApplyPatchApproval` / `ExecCommandApproval`）与备忘录一致。

## uncertainty-update-guardian

# guardian-tools 批次残留 uncertainty

对照 target `a9519cbcdd`。下列事实已在节点正文写明，但整条链路尚未完全落地，故标为残留 `[U]` / 未接线：

1. **`codex-guardian-context` 尚未被 V2 消费。** crate 已在 workspace（`codex-rs/guardian-context/`），声明 `ContextTarget::{Sync,Async}`、`SectionRegistry`、`collect_transcript`。`ext/guardian-v2` Cargo.toml 未依赖该 crate；`async_scorer` 仍用自己的 `transcript.rs`。wiki 按现状写，不假装已 `use`。

2. **`sync_reviewer::build_review_prompt` 在非 test 构建标 `dead_code`（“wired by a subsequent PR”）。** 完整同步审查仍走 V1 `core/src/guardian`。V2 reviewer 目前只注册 thread context / `prepare_reviewer_options`。

3. **TUI / exec 经 app-server 继承 registry 的具体调用行号本轮未重核。** 生产 `codex_guardian_v2::install` 只在 app-server `thread_extensions`；MCP server 与 `empty_extension_registry()`（含 V1 reviewer）不自己 install V2。TUI/exec 是否仍经 embedded/remote app-server 拿同一份 registry，未在本轮逐行核对。

## uncertainty-update-shell-exec

# uncertainty-update · shell-exec

本批次未改 `reference/uncertainty.md`。下列 `[U]` 只记在本 staging 文件。

## 残留 [U]

1. **`Ask` 是否弹 UI** — `subsys.exec-sandbox.exec-server`
   - `ExecServerNetworkPolicyDecision::Ask` 是协议第三种决定。
   - exec-server 层不能断言 controller decider 一定会弹出 UI；也可能自动批准或拒绝。
   - 证据缺口：需要对照 controller-side `NetworkPolicyDecider` 实现，不在本节点权威范围。

## uncertainty-update-spine-core

# uncertainty-update · spine-core

target: `a9519cbcdd`

这些 `[U]` 仍留在本批次节点里，不要写进 `reference/uncertainty.md`（本轮禁止改该文件）。

## thread-store

- 多 segment lineage 的 page/materialization 仍有严格边界：不能把“可分页读取继承 history”推广成任意 incremental item replay 都受支持。节点：`subsystems/core/thread-store.md`
- 第一方 app-server / TUI 路径当前没有调用 `reserve_thread_id` + `stage_pending_thread_metadata`；可见用法在 core 集成测试。节点：`subsystems/core/thread-store.md`

本批次其它节点未新增 `[U]`。

## uncertainty-update-spine-tui-auth

# uncertainty-update spine-tui-auth (02a8f038b8)

- workspace member count: L2 recount of live `codex-rs/Cargo.toml` at 02a8f038b8 is **147** (members 第 3–149 行). Not 145/148. Net +2 vs 145: `ext/guardian-reviewer`, `user-verification`.
- auth-flows still carries the pre-existing [U] on pending environment attachment / per-environment permission profile snapshot (not re-audited this batch).
- workload-identity selection marker: L2 refuted “context marker 也选中”. `has_marker()` is federation rule OR assertion file only. Fixed in `subsys.config-auth.auth-flows`.

## uncertainty-update-tui-mcp-sdk

# Uncertainty — tui-mcp-sdk @ a9519cbcdd

本批次更新已有节点，不写 `reference/uncertainty.md`。

## 残留 `[U]`

- [U] MCP prewarm 是 bounded best-effort 启动优化；step path 的 refresh/capture 才是正确性屏障，不能把 prewarm 完成当成 binding 已冻结。(`subsys.mcp.client`)
- [U] system proxy 支持受 feature/platform 与 application-resolved policy 控制；存在代码路径不代表所有构建默认启用。(`subsys.providers.http-client`)
- [U] dynamic skill selector 仍是 shadow-selection path，不能写成已成为稳定的用户可见选择协议。(`subsys.config-auth.skills`)
- [U] pending environment attachment 与 per-environment permission profile snapshot 的完整跨 thread 契约未在本节点逐字段核完。(`subsys.config-auth.auth-flows`)

`subsys.exec-sandbox.exec-server` 的 Ask/UI `[U]` 不在本批次（shell-exec）。

## 专项已核、不是 `[U]`

- MCP server 名 charset 已放宽为 `^[a-zA-Z0-9_:@/.-]+$`（package-style）；tool 名仍走 `sanitize_responses_api_tool_name`。
- `omit_app_server_notification_media` 只剥 `ItemStarted` / `ItemCompleted` / `RawResponseItemCompleted` 的 inline media；`LocalImage`/`LocalAudio` 保留。
- TUI keymap 12 contexts（含 `vim_search` / `agents`）；rate-limit 75/90/95 + backend banner 分层；model picker `on_models_loaded` in-place refresh。
- Windows private desktop / deny-read walker 在 sandbox crate；PowerShell 版本探测在 `environment.rs`，不在 sandbox crate。

## uncertainty-verify-auth-flows

# Uncertainty — L2 verify `subsys.config-auth.auth-flows`

- [U] pending environment attachment 与 per-environment permission profile snapshot 的完整跨 thread 契约未在本节点逐字段核完。本轮只核到 `CodexAuth` variants（含 `BedrockAccessKeys`）、restriction allow-list 和 refresh/external-auth 路径。

## uncertainty-verify-catalogs

# Uncertainty — L2 verify catalogs (`a9519cbcdd`)

Recounted from source at this SHA. These numbers supersede older staging notes that still say 134 crates / 114 features / 27 Op / 81 EventMsg / 144 client RPC / 74 notifications.

- workspace members **138**
- `FEATURES` **133**
- `Op` **29**
- `EventMsg` **83**
- `ClientRequest` **157**
- `ServerNotification` **83** (82 `=> "wire"` plus `AccountLoginCompleted`)
- `ServerRequest` **11** (9 v2 wire + 2 legacy v1)
- `SlashCommand` **59**
- wiki nodes **184**, tool nodes **38**

## uncertainty-verify-core-drift

# L2 verify: core-drift (02a8f038b8)

Out of batch (not edited): `subsys.core.approval-guardian-v2` still says guardian turns can attach read-only `history.*` extension tools. Source `spec_plan.rs` skips `append_extension_tool_executors` for `is_basic_session_source`, and `internal_guardian_sessions_exclude_optional_core_tools` asserts only `exec_command` / `write_stdin` / `view_image`. Fixed in `spine.extension-system` this batch.

No remaining [U] inside the eight core-drift nodes after in-place [E] retargets.

## uncertainty-verify-coreb

# Uncertainty — L2 verifier CoreB (`a9519cbcdd`)

Pages: `ghost-undo`, `rollout-persistence`, `state-db`, `thread-store`, `trace-bundle`, `code-mode-runtime`, `rollout-budget`, `token-budget`, `turn-metadata`, `approval-guardian-v2`, `rollout-migration`, `thread-queue`, `history-notes`.

## Remaining [U]

- [U] `subsys.core.thread-store`: multi-segment lineage page/materialization still has a strict boundary; the source does not prove that arbitrary incremental item replay of inherited history is supported.
- [U] `subsys.core.thread-store`: first-party app-server / TUI paths currently have no production call to `reserve_thread_id` + `stage_pending_thread_metadata`; visible usage is in core integration tests.

## Not [U] after verification

- Ghost/undo runtime is retired: `Feature::GhostCommit` key `undo` is `Stage::Removed`; legacy `ghost_snapshot` items deserialize as `ResponseItem::Other`; `Op::ThreadRollback` is deleted. Paginated disk-safe revert is app-server `thread/revert` and does not revert workspace file edits.
- Guardian V2 source lives under `async_scorer/*` + `sync_reviewer/*` + `guardian-context`; crate-root `config.rs` is gone. `codex-guardian-v2` does not depend on `codex-guardian-context`.
- History notes expose 9 namespace tools (`history.*` 4 + `notes.*` 5), `ToolExposure::DirectModelOnly`, notes file contract ≤ 1,000,000 UTF-8 bytes.
- Code Mode is a standalone host/runtime (`code-mode-runtime` / process-owned host). Core installs `ProcessOwnedCodeModeSessionProvider` or `DisabledCodeModeSessionProvider`; there is no in-process V8 fallback and no fallback to shell.

## uncertainty-verify-exec-server

# uncertainty-verify-exec-server

Node: `subsys.exec-sandbox.exec-server`

`Ask` is a third `ExecServerNetworkPolicyDecision` variant in `codex-rs/exec-server-protocol/src/network_policy.rs`. Whether that decision surfaces a UI prompt, auto-approves, or auto-denies is owned by the controller-side decider, not exec-server. The wiki keeps this as `[U]`.

## uncertainty-verify-extension-system

# L2 verify: spine.extension-system

- claim: `codex-rs/ext/guardian-v2` does not depend on `codex-guardian-context`; scorer still uses `async_scorer/transcript.rs`.
- why [I]: absence of a Cargo dependency is not a single asserted source line. `ext/guardian-v2/Cargo.toml` `[dependencies]` (lines 16–33) lists `codex-api` … `uuid` and does not name `codex-guardian-context`; confirming the scorer still uses crate-local `async_scorer/transcript.rs` requires that module, not the workspace `guardian-context` crate.
- node: `spine.extension-system`

## uncertainty-verify-leftover-high-value

# L2 verify: leftover-high-value (02a8f038b8)

Mechanical SHA bump hid stale `[E]` and a few false claims. Fixed in place.

Confirmed against source:

- No live `mcp-server` crate/subcommand. Workspace members = 147 (`Cargo.toml` L3–L149). `rmcp-client` is `:97`.
- Guardian turns do not attach `history.*` tools: `add_core_tool_sources` returns early; `append_extension_tool_executors` is in the non-guardian branch.
- These eight nodes do not retain 145 crates / 140 features / 162 client RPC / notifications 83 / shipped `SandboxReadRoot` / live `compact_remote.rs`. `CompactTask` calls `compact_remote_v2`.

Refuted and rewritten:

- `subsys.core.turn-metadata`: attach path moved to `executed_tool_calls/request_metadata.rs`; sampling attach is `turn.rs:1579–1582`, not skill-item helper `:1457`. Type is `ExecutedToolCalls`.
- `subsys.platform.network-proxy`: `NetworkMode` is `:363+`; blocked observer is `network_approval.rs:1065`; ring buffer is `runtime.rs:721`; builder/public/`remote_policy_decider`/`GIT_SSH` cites were pointing at other functions.
- `sdk.py-inputs-errors`: omitted public `ExternalMessage` and `RunInput = Input | str | ExternalMessage`.
- `ref.session-tasks`: `TurnStarted` emit is `regular.rs:49`; `TurnState` was missing MCP-approval / per-model usage / last step; `spawn_task` abort is `:276`.
- `subsys.tui.event-system`: lede `:1028` was worktree error, not the select arms; `ExitMode` comment is `:581`.
- `spine.tool-call-anatomy`: dispatch cite `:165` was timing, not `dispatch_tool_call_with_terminal_outcome`.

No remaining [U] inside this batch after retargets.

## uncertainty-verify-request-permissions

# uncertainty-verify-request-permissions

- node: `tool.request-permissions`
- claim: Guardian V2 `fast_decision` can approve a `request_permissions` action before the V1 child reviewer runs
- why unprovable here: `Session::request_permissions_for_environment` only shows `ApprovalAction::RequestPermissions` → `request_guardian_approval` → `spawn_approval_request_review` → `run_guardian_review` (`codex-rs/core/src/guardian/review.rs:810`). Whether Guardian V2 `fast_decision` intercepts that review is in the V2 extension, not this handler.
- marked: `[I]` in `surface/tools/request-permissions.md`

## uncertainty-verify-skills

# Uncertainty — L2 verify `subsys.config-auth.skills`

- [U] dynamic skill selector 仍是 shadow-selection experiment。实现已迁到 `codex-rs/ext/skills/src/shadow_selection_experiment/mod.rs`，文件头注释写明 evaluation 后应删除；selector 集合与 metrics 存在，但没有稳定的用户可见选择协议。
