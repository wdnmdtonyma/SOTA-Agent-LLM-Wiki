# Codex `a9519cbcdd..121f91fd5d` 源码差分研究

> 研究日期：2026-09-07
> Wiki verified base：`a9519cbcdd2d664530edb2469224ee03c1056799`
> 目标源码：官方 `openai/codex` `origin/main` = `121f91fd5d9dc66017866ce9bdc49f1e182721df`（短 SHA `121f91fd5d`）
> HEAD 提交：Enable remote named permission profile selection in the TUI (#43340)
> 本文不是 Wiki 节点，不进 `index.json` / `llms.txt`。

## 1. 跨度

- 323 commits，1756 files，`+120702 / -23962`；552 added / 44 deleted / 4 renamed。
- base 是 target 祖先。
- submodule 已 detached checkout 到 target。

复现：

```bash
git -C codex fetch origin main
git -C codex rev-list --count a9519cbcdd2d664530edb2469224ee03c1056799..121f91fd5d9dc66017866ce9bdc49f1e182721df
git -C codex diff --shortstat a9519cbcdd2d664530edb2469224ee03c1056799..121f91fd5d9dc66017866ce9bdc49f1e182721df
```

## 2. 机械分级（184 基线节点）

目录型 `source:` 不算缺失。真正文件缺失的 A-BROKEN 是 5：

| 分级 | 数量 | 说明 |
|---|---:|---|
| A-BROKEN | 5 | mcp-server 删除、send_user_message_async 改名、trace_transport.rs 删除 |
| B-HEAVY | 4 | TUI overlays/architecture/chatwidget/keymap，直接 source churn ≥ 2000 |
| C-DRIFT | ~163 | 至少一个直接 source 改动 |
| D-CLEAN | 12 | 已登记 source 未改；仍 bump SHA |

A-BROKEN：

1. `subsys.mcp.server`：`codex-rs/mcp-server` crate 删除。
2. `tool.send-user-message-async`：handler 文件改名为 `send_message_to_user_async.rs`，测试 suite 删除。
3. `spine.extension-system` / `subsys.core.approval-guardian-v2`：仍引用 mcp-server 源文件。
4. `subsys.core.code-mode-runtime`：`code-mode-host/src/trace_transport.rs` 删除。

## 3. Inventory 变化

### Workspace crates：138 → 145

新增：`attachment-store`、`config-schema`、`mxc-sandbox`、`otel-trace-websocket`、`realtime-webrtc`、`utils/git-discovery`、`voice-host`、`windows-sandbox-service`  
移除：`mcp-server`

### Features：133 → 140

新增 7 key，无删除。见 `update-facts-121f91fd5d.md`。

### 工具集

- `send_user_message_async` 不再是 `SendMessageToUserAsyncHandler` 的 wire name。
- 新活工具 `send_message_to_user_async`（message 形）与 `request_user_input_async`（questions 形）。
- 旧 catalog 名 `send_user_message_async` 现在把 `RequestUserInputAsyncHandler` 注册进去。

### 其它 catalog

- Op 29 / EventMsg 83 不变。
- SlashCommand 59 → 60（+ `Worktree`）。
- ConfigToml 99 → 101。
- CLI Subcommand 30 → 29（− `McpServer`）。
- client RPC 157 → 162。

## 4. 新增 / 退役节点判定

退役：无独立 Wiki 节点删除。`subsys.mcp.server` **保留 id**，正文改成退役。

新增 1 个：

| id | path | 理由 |
|---|---|---|
| `tool.request-user-input-async` | `surface/tools/request-user-input-async.md` | 独立 core handler + 独立 schema + 旧名 catalog 别名 |

`tool.send-user-message-async` 保留 id，改写为 `send_message_to_user_async`。

最终目标：**185 verified nodes**（184 + 1）。

新 crate 全部 fold 进现有节点，不另建。
