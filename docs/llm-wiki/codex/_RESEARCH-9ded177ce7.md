# Codex `7750465934..9ded177ce7` 源码差分研究

> 研究日期：2026-08-16
> Wiki verified base：`7750465934d97dd3cbcb3b1655d2f622744010d3`
> 目标源码：官方 `openai/codex` `origin/main` = `9ded177ce7c1c0bd2047f902936c177612ab3434`（短 SHA `9ded177ce7`）
> 最新稳定版：`rust-v0.147.0`（2026-08-07）。最新 prerelease tag：`rust-v0.148.0-alpha.20`。目标 HEAD 在稳定版之后，版本主题取整个 compare，不由 HEAD 单笔提交代替。
> 本文不是 Wiki 节点，不进 `index.json` / `llms.txt`。

## 1. 跨度

- 519 commits，1729 files，`+180960 / -38952`；374 added / 30 deleted / 1310 modified / 15 renamed。
- base 是 target 祖先。
- submodule 已 detached checkout 到 target；源码工作树 clean。

## 2. 机械分级（177 基线节点）

| 分级 | 数量 |
|---|---:|
| A-BROKEN | 6 |
| B-HEAVY | 15 |
| C-DRIFT | 146 |
| D-CLEAN | 10 |

A-BROKEN（source 必须重定位，不是概念退役）：

1. `subsys.core.context-manager`：`core/src/audio_preparation.rs` → `utils/audio/src/lib.rs`
2. `subsys.core.instruction-assembly`：`core-skills/src/skill_instructions.rs` 删除，技能指令下沉 `ext/skills` / `skills`
3. `subsys.core.collaboration-modes`：删除 `execute.md` / `pair_programming.md` 模板（#36990）
4. `subsys.config-auth.skills`：`core-skills` crate 退役；discovery/namespace 迁到 `ext/skills`，invocation/selection 迁到 `skills`
5. `subsys.config-auth.plugins`：仍引用已删 `core-skills/src/loader.rs`
6. `subsys.cloud.cloud-config`：`cli/src/mcp_cmd/cloud_config.rs` → `cli/src/cloud_config.rs`

## 3. Inventory 变化

### Workspace crates：128 → 134

新增：`build-info`、`diagnostics`、`history`、`ext/guardian-v2`、`ext/queue`、`workload-identity`、`utils/audio`  
移除：`core-skills`

### Features：102 → 116 FeatureSpec（解析到 112 条带 key 的 registry 行）

本轮新 key 至少包括：`view_image`、`code_mode_interrupt`、`background_paginated_rollout_migration`、`apply_patch_preserve_line_endings`、`unbounded_connection_retries`、`psp`、`image_resize_notice`、`unified_image_budget`、`guardian_reuse_parent_compaction`、`guardian_enhanced_node_repl_transcripts`、`guardian_node_repl_transcript_images`、`retain_client_developer_messages`。  
`UnifiedExec` 默认改为全平台 `true`（含 Windows）。  
wiki 旧表里的 `network_proxy` / `prevent_idle_sleep` 行需要对着 target registry 复核，不要机械删除。

### 工具集

`build_tool_router` / `add_core_tool_sources` 仍是 ground truth。无新 core tool 节点。Guardian reviewer turn 仍只暴露 `exec_command` / `write_stdin` / `view_image`。Windows 上 unified exec 现默认开启。

### App-Server client methods

目标 `client_request_definitions` wire 名 **153**（旧 wiki 记 136 client requests）。新增面包括：

- `server/diagnostics`
- `thread/queue/{add,list,update,delete,reorder,start}`
- `thread/settings/update`
- `thread/rollback`、`thread/revert`
- `thread/approveGuardianDeniedAction`
- `account/usage/read` 等 usage 方法

### Protocol

- `Op` 27（旧 26）：新增 `ThreadSettings`、`ThreadRollback`、`ApproveGuardianDeniedAction`
- `EventMsg` 81（旧 80）：新增 `ThreadRolledBack`、`ThreadSettingsApplied`、`ThreadQueueChanged`

## 4. 必须按新架构重读的主题

1. **Guardian V2**：新 crate `ext/guardian-v2`（config/sampler/transcript/risk classification）；core `guardian` 仍在。权限请求走 shared Guardian；v2 可配置 risk classification、high-risk 强制 auto-review、extension 可先于 Guardian 解析。新建 `subsys.core.approval-guardian-v2`。
2. **Thread queue**：`ext/queue` + `thread_queue_processor` + durable per-thread user submission queue + `ThreadQueueChanged`。新建 `subsys.core.thread-queue`。
3. **Rollout migration**：`thread-store/src/local/rollout_migration/**` + `Feature::BackgroundPaginatedRolloutMigration` + `codex` migrate CLI。新建 `subsys.core.rollout-migration`。
4. **Thread revert/rollback** + pending reserved thread IDs + thread usage：写入既有 `thread-store` / `rpc.thread-methods` / `token-budget`，不另建节点。
5. **Skills 下沉**：`core-skills` 删除；host loader/catalog 在 `ext/skills`，invocation/selection/mentions 在 `skills`。
6. **Code Mode gRPC**：`code-mode-host/src/grpc*` + `code-mode-protocol` proto + dual transport。写入 `subsys.core.code-mode-runtime` 与 code-mode tools。
7. **Diagnostics**：新 `diagnostics` crate + `codex doctor` disk/security/storage/endpoint + `server/diagnostics`。新建 `subsys.platform.diagnostics`。
8. **Workload identity**：新 crate + login/token exchange/exec-server auth。写入 `subsys.config-auth.auth-flows`，不另建节点。
9. **TUI startup**：composer/onboarding/startup orchestration、paginated history、keymap sharing、transcript export。
10. **MCP hooks**：hooks engine 增加 MCP tool handler；plugin 变更后 refresh hook runtime。
11. **Environment/permissions**：pending environment attachment、per-environment permission profiles、`PermissionProfile` snapshot 进 protocol。
12. **Audio crate**：`utils/audio`；context-manager 重定位。

## 5. 新增 / 退役节点判定

退役：无独立 Wiki 节点退役。

新增 4 个：

| id | path | 理由 |
|---|---|---|
| `subsys.core.approval-guardian-v2` | `subsystems/core/approval-guardian-v2.md` | 独立 crate + 独立 risk/sampler 模型 |
| `subsys.core.thread-queue` | `subsystems/core/thread-queue.md` | 独立 extension + 6 RPC + event |
| `subsys.core.rollout-migration` | `subsystems/core/rollout-migration.md` | 独立 migration runtime / rollback |
| `subsys.platform.diagnostics` | `subsystems/platform/diagnostics.md` | 独立 crate + doctor + RPC |

最终目标：**181 verified nodes**（177 + 4）。

## 6. 写节点纪律（给并行会话）

- target SHA：`9ded177ce7`
- 只写分配到的节点 `.md` 和 `_staging/uncertainty-<batch>.md`
- 禁止改 `index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`
- 禁止改 `codex/` 源码
- `[E: path:line]` 必须落在被断言的代码行，不是注释
- 失效 source 必须改到 target 仍存在的路径
- 不要把旧 SHA `7750465934` 留在 frontmatter
- 不要引用尚未存在的 related id（四个新节点除外，由对应批次创建）
