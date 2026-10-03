# uncertainty-update-4c6fb7cfe8-sessions-management

batch: 4c6fb7cfe8 refresh session-manager / session-format / sessions.management
nodes: surface.sessions.management
updated: 4c6fb7cfe8
status: verified-with-u

本轮 `subsys.coding-agent.session-manager` 与 `ref.coding-agent.session-format` 未新增 `[U]`。`surface.sessions.management` 下列点不能升成 `[E]`，因为不在该节点 index source 内。

## [U] CLI path/id 解析与参数互斥

- 节点: `surface.sessions.management`
- `--session <path|id>` 的 path/id 解析、全局匹配后是否 fork 到当前 cwd、以及参数互斥校验在 `packages/coding-agent/src/main.ts` / `cli/args.ts`，不在本节点 source。

## [U] `/fork` `/clone` dispatch

- 节点: `surface.sessions.management`
- interactive/RPC 如何把 `/fork`、`/clone` 映射到 `SessionManager.createBranchedSession()` 在 `agent-session-runtime.ts` 等文件，不在本节点 source。本页只保留用户文档语义和 `createBranchedSession()` / `forkFrom()` 的文件级能力。

## [U] `/export` HTML vs JSONL dispatch

- 节点: `surface.sessions.management`
- 用户文档写 `/export` 可写 HTML 或 JSONL。路径是否以 `.jsonl` 结尾的分流在 `interactive-mode.ts`，不在本节点 source。`exportSessionToJsonl()` helper 本身可核。

## [U] SessionSelectorComponent 内部

- 节点: `surface.sessions.management`
- picker 的 threaded/recent/fuzzy 排序、active-session 删除拦截、rename UI 和 `trash` CLI 细节在 `session-selector.ts`，不在本节点 source。`selectSession()` 只证明 startup TUI 封装。
