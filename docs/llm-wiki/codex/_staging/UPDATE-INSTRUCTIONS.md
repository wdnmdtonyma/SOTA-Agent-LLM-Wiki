# Codex wiki 增量刷新令（a9519cbcdd → 121f91fd5d）

给 filler 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径重映射、架构事实和文件纪律。

本轮 **不跑逐节点独立 L2**。filler 自己核 `[E:]`（每页至少抽 3 条 `read_file` 对行），写完将 `status: verified`。过宽结论宁可降 `[I]/[U]`。

## 冻结点

- **base**(上一轮 verified): `a9519cbcdd` (`a9519cbcdd2d664530edb2469224ee03c1056799`)
- **target**(必须对照的源码 HEAD): `121f91fd5d` (`121f91fd5d9dc66017866ce9bdc49f1e182721df`)
- 源码根: 仓库 `codex/`（相对本 wiki `../../../codex/`）
- 节点 `updated:` 一律写成 `121f91fd5d`
- 源码已 detached checkout 到 target。判断路径是否存在：`test -f` / `test -d` 或看 git 跟踪文件。

## 路径重映射（frontmatter `source:` 与 `[E:]` 必须改到右边）

| 旧路径 | 新路径 / 处理 |
|---|---|
| `codex-rs/mcp-server/**` | **crate 已删除**（`codex mcp-server` 子命令一并移除）。`subsys.mcp.server` **保留 id**，改写成退役页。其它节点删掉对该 crate 的 `source:` / `[E:]` |
| `codex-rs/core/src/tools/handlers/send_user_message_async.rs` | `codex-rs/core/src/tools/handlers/send_message_to_user_async.rs` |
| `codex-rs/core/tests/suite/send_user_message_async.rs` | **已删除**。改读 handler 文件 + `spec_plan.rs` |
| `codex-rs/code-mode-host/src/trace_transport.rs` | **已删除**。改读 `code-mode-host/src/{lib,transport,grpc_transport}.rs` |
| `codex-rs/core/src/bin/config_schema.rs` | `codex-rs/config-schema/src/main.rs`（若有节点引用） |
| `codex-rs/app-server/src/realtime_history.rs` | `codex-rs/core/src/realtime_history.rs` |

找不到替换文件就从 `source:` 删掉该条。禁止把 `[E:]` 指到已删除路径。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **`codex-rs/mcp-server` 已删除**。`Subcommand` 不再有 `McpServer`。节点 `subsys.mcp.server` 保留 id，改成退役映射：外部 MCP client 调 Codex 的 stdio server 已下线；MCP **client**（连外部 server）仍在。退役页的 `source:` 只能引用仍存在的文件（`codex-rs/cli/src/main.rs`、`codex-rs/Cargo.toml`）。
2. **工具改名 + 拆分**：
   - 新 wire name `send_message_to_user_async`：`SendMessageToUserAsyncHandler`，schema 仍是 `{message: string}`，立即返回、不结束 turn。门控：root agent + 模型 `experimental_supported_tools` 含 `"send_message_to_user_async"`。节点 id 仍是 `tool.send-user-message-async`，标题改成新名字。
   - 新工具 `request_user_input_async`：`RequestUserInputAsyncHandler`，schema 是 `{questions: [{title, options?}]}`，同样立即返回。门控：root agent + 模型 catalog 含 `"request_user_input_async"` **或旧名** `"send_user_message_async"`（注释写明 existing catalogs still advertise the previous name）。**另建节点** `tool.request-user-input-async`。
   - 阻塞版 `request_user_input` 仍在，门控 `experimental_request_user_input_enabled`。
3. **不要写** `send_user_message_async` 仍是 `SendUserMessageAsyncHandler` 的 wire name。旧名现在把 `RequestUserInputAsyncHandler` 注册进去。
4. **workspace crates 145**（138 − `mcp-server` + 8）：新增 `attachment-store`、`config-schema`、`mxc-sandbox`、`otel-trace-websocket`、`realtime-webrtc`、`utils/git-discovery`、`voice-host`、`windows-sandbox-service`。不要为这些 crate 另建 wiki 节点：分别写入 thread-store / crate-index / sandbox-windows / telemetry / realtime / git-utils。
5. **Features 140**（+7 key，无删除）：`unified_exec_tty`、`windows_sandbox_service`、`worktrees`、`mcp_oauth_refresh_coordination`、`guardianv2.thread_context`、`context_management`、`reasoning_effort_override`。
6. **SlashCommand 60**（+ `Worktree`）。写进 `command.session-thread`。
7. **ConfigToml 顶层 pub 字段 101**（+ `allow_symlinked_codex_home`、`thread_unload_delay_secs`）。
8. **CLI `Subcommand` 29**（删除 `McpServer`）。group.cli 的 30 top-level 要改。
9. **App-Server client requests 162**（+ `userVerification/{status,enroll,delete,verify}`、`plugin/reconcile`）。Op **29**、EventMsg **83** 未变。server notifications / server requests **必须从 `common.rs` 宏调用重数**，不要照抄旧 wiki 的 83/11。
10. 工具节点数 **39**（+ `request_user_input_async`），总节点 **185**。
11. HEAD 提交是 TUI 远程 named permission profile 选择。`tool.request-permissions` / `config.approval-sandbox` / TUI 相关页不要假装权限面没变。
12. 正文凡写「138 crates / 133 features / 157 client RPC / 38 tools / 184 节点 / `codex mcp-server` 仍 shipped / `send_user_message_async` 仍是现活 wire name」——全部改掉。

## 本轮新节点（1）

| 节点 | 路径 | 判定 |
|---|---|---|
| `tool.request-user-input-async` | `surface/tools/request-user-input-async.md` | 独立 handler + 独立 schema（questions）+ 旧名 catalog 别名 |

不要为 attachment-store / voice-host / mxc-sandbox / config-schema / git-discovery / otel-trace-websocket / windows-sandbox-service / realtime-webrtc 另建节点。

## 不要退役的节点（就地改 source / 标题）

- `subsys.mcp.server` → 退役映射，不要删文件
- `tool.send-user-message-async` → 标题改 `send_message_to_user_async`；id/path 保留
- `subsys.core.code-mode-runtime` → 删 `trace_transport.rs`
- `spine.extension-system` / `subsys.core.approval-guardian-v2` → 去掉 mcp-server 引用

## filler 纪律

只写两类文件：

1. 自己批次里的节点 `docs/llm-wiki/codex/<path>`
2. 可选 `_staging/uncertainty-update-<slug>.md`

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、别人批次的节点、`codex/` 源码。

步骤：

1. 读本文件 + `../_staging/update-facts-121f91fd5d.md` + `conventions.md` 对应模板。
2. 读现有节点 `.md`（remap 批次不要写成空模板；rewrite 批次保留仍成立的问题列表）。
3. 用 `read_file` / `grep` 读 **target** 源码。`source:` 失效路径先按上表重映射，再核对文件确实存在。
4. 每个 load-bearing 论断的 `[E: path:line]` 必须落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. `status: verified`（自己核过至少 3 条 `[E:]`）或 `draft`（核不完），`updated: 121f91fd5d`，`evidence: explicit`。
6. 跑 lint 时只处理带自己 `node:<path>` 的报错。

### 按批次深度

- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留。
- **remap**：禁止从零重写。删缺失 source、改 `[E:]`、改过时一句；其余不动。
- **refresh**：对照变更过的 source 修假话、重落行号，不扩写。
- **create**：按 conventions 模板从零写新文件。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 当 `[E]`；冲突时跟代码。
