# Codex `121f91fd5d..02a8f038b8` 源码差分研究

> 研究日期：2026-09-11
> Wiki verified base：`121f91fd5d9dc66017866ce9bdc49f1e182721df`
> 目标源码：官方 `openai/codex` `origin/main` = `02a8f038b87ad34d4a1dc5058eda26972ed7aa6c`（短 SHA `02a8f038b8`）
> HEAD 提交：Check folder consent before creating or resuming TUI tasks (#44755)
> 本文不是 Wiki 节点，不进 `index.json` / `llms.txt`。

## 1. 跨度

- 284 commits，1610 files，`+134034 / -33193`；492 added / 42 deleted / 6 renamed。
- base 是 target 祖先。
- submodule 已 detached checkout 到 target。

复现：

```bash
git -C codex fetch origin main
git -C codex rev-list --count 121f91fd5d9dc66017866ce9bdc49f1e182721df..02a8f038b87ad34d4a1dc5058eda26972ed7aa6c
git -C codex diff --shortstat 121f91fd5d9dc66017866ce9bdc49f1e182721df..02a8f038b87ad34d4a1dc5058eda26972ed7aa6c
```

## 2. 机械分级（185 基线节点）

目录型 `source:` 不算缺失。真正文件缺失的 A-BROKEN 是 5：

| 分级 | 数量 | 说明 |
|---|---:|---|
| A-BROKEN | 5 | compact_remote v1 删除、writer_lock 迁到 rollout、guardian-v2 sync_reviewer 配置/prompt 删除 |
| B-HEAVY | 5 | shell-parsing / approval-guardian / SDK python / request-permissions，直接 source churn ≥ 2000 |
| C-DRIFT | 153 | 至少一个直接 source 改动 |
| D-CLEAN | 22 | 已登记 source 未改；仍 bump SHA |

A-BROKEN：

1. `spine.context-and-compaction` / `subsys.core.compaction`：`compact_remote.rs`、`compact_remote_request.rs` 删除。活路径是 `compact.rs`（本地）+ `compact_remote_v2.rs` + `compact_remote_history.rs`。
2. `subsys.core.thread-store` / `ref.glossary`：`thread-store/src/local/writer_lock.rs` → `rollout/src/writer_lock.rs`。
3. `subsys.core.approval-guardian-v2`：`sync_reviewer/reviewer_config.rs` 与 `prompt.rs` 删除。同步 reviewer 策略/执行下沉 `ext/guardian-reviewer`；v2 `sync_reviewer/mod.rs` 只剩 lifecycle `install`。

## 3. Inventory 变化

### Workspace crates：旧 wiki 145 → 现 **147**

`Cargo.toml` `members` 第 3–149 行共 **147** 条（含 `exec-server/tests/support`）。新增：`ext/guardian-reviewer`、`user-verification`。无 member 删除。不要为这两 crate 另建节点。旧 wiki 的 145 漏计了 `exec-server/tests/support`。

### Features：140 → 142

新增 key，无删除：`api_key_model_discovery`、`codex_apps_mcp_2026_07_28`（均为 `UnderDevelopment`，默认关）。

### 工具集

`build_tool_router` / `add_core_tool_sources` 仍是 ground truth。本轮 **没有** 新增/删除/改名模型可见 core tool。工具节点保持 **39**，wiki 节点保持 **185**。

### App-Server

- client requests：**167**（旧 162）。新增 `userVerification/cancel`、`thread/attachment/{add,list,remove}`、`memory/status`。
- server notifications：**84**（83 个 `=> "wire"` + `AccountLoginCompleted`；新增 `thread/attachment/updated`）。
- server requests：v2 wire **9** + 同宏 legacy v1 `ApplyPatchApproval` / `ExecCommandApproval` = **11**。

### Protocol / CLI / config / slash

- `Op` **29** / `EventMsg` **83** 不变。
- `ConfigToml` 顶层 pub 字段 **101** 不变。
- CLI `Subcommand` **29** 不变。
- `SlashCommand` **60**：删 `SandboxReadRoot`（`/sandbox-add-read-dir`），加 `Voice`（`/voice`，含 `/voice settings`）。

## 4. 必须按新架构重读的主题

1. **Remote compact v1 删除**：禁止再引用 `compact_remote.rs` / `compact_remote_request.rs` / `codex-api` `endpoint/compact.rs`。
2. **Guardian reviewer crate**：同步评审配置、pool、retry、reporting 在 `ext/guardian-reviewer`；v2 sync_reviewer 只装 lifecycle。
3. **writer_lock** 属于 `rollout` crate。
4. **user-verification** crate：本地凭证/签名，独立于 RPC 路由；RPC 仍走 `userVerification/*`，本轮加 `cancel`。
5. **Thread attachments**：app-server + thread-store 存附件，通知 `thread/attachment/updated`。
6. **`memory/status`**：experimental client RPC。
7. **TUI folder consent**：创建/恢复 task 前 `check_directory_trust`；HEAD 提交。
8. **`/voice`** 与 **`api_key_model_discovery`**。

## 5. 新增 / 退役节点判定

退役：无独立 Wiki 节点删除。

新增：**0**。新 crate / 新 RPC / `/voice` 全部 fold 进现有节点。

最终目标：**185 verified nodes**。
