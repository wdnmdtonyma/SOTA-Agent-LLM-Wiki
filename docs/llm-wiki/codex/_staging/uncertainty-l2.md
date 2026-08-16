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
