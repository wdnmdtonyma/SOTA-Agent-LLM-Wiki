---
id: cli.opencode-yargs
title: opencode yargs CLI
status: verified
owner: surface-config-cli
v: v1
kind: surface
tier: T1
schema: grouped-catalog
source:
  - packages/opencode/src/index.ts
  - packages/opencode/src/cli/cmd/
updated: 8b68dc0d7
evidence: explicit
---

> `cli.opencode-yargs` 描述 V1 npm/terminal host：`packages/opencode/src/index.ts` 使用 yargs 注册 root commands 和一批 nested commands。它与 V2 preview host `packages/cli` 并存，不是同一个 CLI framework。

## 能回答的问题

- `opencode` root command 注册了哪些子命令。
- `debug`、`mcp`、`providers`、`console`、`session` 等 command 的 nested catalog 在哪里。
- V1 CLI 启动时设置了哪些 env flags。
- 哪些 command 直接进入 TUI，哪些 command 操作 server/session/provider。

## Entry 与全局 Middleware

V1 CLI entry 使用 `yargs`，`scriptName("opencode")`，并启用 help 和 version。[E: packages/opencode/src/index.ts:45] 全局 options 包括 `--print-logs`、`--log-level` 和 `--pure`。[E: packages/opencode/src/index.ts:53] [E: packages/opencode/src/index.ts:57] [E: packages/opencode/src/index.ts:62] middleware 会把这些 option 写入 `OPENCODE_PRINT_LOGS`、`OPENCODE_LOG_LEVEL`、`OPENCODE_PURE`，并设置 `AGENT=1`、`OPENCODE=1`、`OPENCODE_PID`。[E: packages/opencode/src/index.ts:66]

root yargs 链在注册 commands 后安装 `.fail(...)` handler 并启用 `.strict()`。[E: packages/opencode/src/index.ts:104] [E: packages/opencode/src/index.ts:116] 顶层 catch 会调用 `FormatError(e)`；有 formatted message 时走 `UI.error(formatted)`，否则打印 `Unexpected error` 和原始 error message，并把 `process.exitCode` 设为 1。[E: packages/opencode/src/index.ts:128]

## Root Command Catalog

| command | 文件 | describe/作用 | nested |
| --- | --- | --- | --- |
| `completion` | `packages/opencode/src/index.ts` | yargs completion command。[E: packages/opencode/src/index.ts:80] | none |
| `acp` | `packages/opencode/src/cli/cmd/acp.ts` | starts an ACP server。[E: packages/opencode/src/cli/cmd/acp.ts:10] | none |
| `mcp` | `packages/opencode/src/cli/cmd/mcp.ts` | MCP server management root。[E: packages/opencode/src/cli/cmd/mcp.ts:96] | `list`、`auth`、`logout`、`add`、`debug` |
| `$0 [project]` | `packages/opencode/src/cli/cmd/tui.ts` | default TUI command。[E: packages/opencode/src/cli/cmd/tui.ts:73] | none |
| `attach <url>` | `packages/opencode/src/cli/cmd/attach.ts` | attach to an existing server URL。[E: packages/opencode/src/cli/cmd/attach.ts:8] | none |
| `run [message..]` | `packages/opencode/src/cli/cmd/run.ts` | run prompt in terminal modes。[E: packages/opencode/src/cli/cmd/run.ts:127] | none; modes are flags |
| `generate` | `packages/opencode/src/cli/cmd/generate.ts` | generation helpers command。[E: packages/opencode/src/cli/cmd/generate.ts:6] | none |
| `debug` | `packages/opencode/src/cli/cmd/debug/index.ts` | debug utilities root。[E: packages/opencode/src/cli/cmd/debug/index.ts:20] | `config`、`lsp`、`rg`、`file`、`scrap`、`skill`、`snapshot`、`startup`、`agent`、`v2`、`info`、`paths`、`wait` |
| `console` | `packages/opencode/src/cli/cmd/account.ts` | opencode Console account root。[E: packages/opencode/src/cli/cmd/account.ts:238] | `login`、`logout`、`switch`、`orgs`、`open` |
| `providers` | `packages/opencode/src/cli/cmd/providers.ts` | manage provider authentication/config。[E: packages/opencode/src/cli/cmd/providers.ts:240] | `list`、`login`、`logout` |
| `agent` | `packages/opencode/src/cli/cmd/agent.ts` | agent management root。[E: packages/opencode/src/cli/cmd/agent.ts:255] | `create`、`list` |
| `upgrade [target]` | `packages/opencode/src/cli/cmd/upgrade.ts` | upgrade opencode。[E: packages/opencode/src/cli/cmd/upgrade.ts:8] | none |
| `uninstall` | `packages/opencode/src/cli/cmd/uninstall.ts` | uninstall opencode。[E: packages/opencode/src/cli/cmd/uninstall.ts:26] | none |
| `serve` | `packages/opencode/src/cli/cmd/serve.ts` | start HTTP server。[E: packages/opencode/src/cli/cmd/serve.ts:7] | none |
| `web` | `packages/opencode/src/cli/cmd/web.ts` | launch web UI/server flow。[E: packages/opencode/src/cli/cmd/web.ts:32] | none |
| `models [provider]` | `packages/opencode/src/cli/cmd/models.ts` | list models。[E: packages/opencode/src/cli/cmd/models.ts:9] | none |
| `stats` | `packages/opencode/src/cli/cmd/stats.ts` | display usage stats。[E: packages/opencode/src/cli/cmd/stats.ts:50] | none |
| `export [sessionID]` | `packages/opencode/src/cli/cmd/export.ts` | export session data。[E: packages/opencode/src/cli/cmd/export.ts:223] | none |
| `import <file>` | `packages/opencode/src/cli/cmd/import.ts` | import session data。[E: packages/opencode/src/cli/cmd/import.ts:84] | none |
| `github` | `packages/opencode/src/cli/cmd/github.ts` | GitHub integration root。[E: packages/opencode/src/cli/cmd/github.ts:38] | `install`、`run` |
| `pr <number>` | `packages/opencode/src/cli/cmd/pr.ts` | pull request helper command。[E: packages/opencode/src/cli/cmd/pr.ts:9] | none |
| `session` | `packages/opencode/src/cli/cmd/session.ts` | session management root。[E: packages/opencode/src/cli/cmd/session.ts:45] | `delete`、`list` |
| `plugin <module>` | `packages/opencode/src/cli/cmd/plug.ts` | run/load plugin module command。[E: packages/opencode/src/cli/cmd/plug.ts:179] | none |
| `db` | `packages/opencode/src/cli/cmd/db.ts` | database helper root。[E: packages/opencode/src/cli/cmd/db.ts:55] | `$0 [query]`、`path` |

## Nested Command Catalog

| group | command | source | note |
| --- | --- | --- | --- |
| `mcp` | `list` | [E: packages/opencode/src/cli/cmd/mcp.ts:110] | list configured MCP servers. |
| `mcp` | `auth [name]` | [E: packages/opencode/src/cli/cmd/mcp.ts:171] | start MCP OAuth/auth flow. |
| `mcp auth` | `list` | [E: packages/opencode/src/cli/cmd/mcp.ts:307] | list MCP auth state. |
| `mcp` | `logout [name]` | [E: packages/opencode/src/cli/cmd/mcp.ts:337] | remove MCP auth. |
| `mcp` | `add [name]` | [E: packages/opencode/src/cli/cmd/mcp.ts:430] | add MCP config. |
| `mcp` | `debug <name>` | [E: packages/opencode/src/cli/cmd/mcp.ts:660] | debug one MCP server. |
| `debug` | `config` | [E: packages/opencode/src/cli/cmd/debug/config.ts:6] | print resolved config/debug data. |
| `debug` | `lsp` | [E: packages/opencode/src/cli/cmd/debug/lsp.ts:8] | LSP root. |
| `debug lsp` | `diagnostics <file>` | [E: packages/opencode/src/cli/cmd/debug/lsp.ts:16] | diagnostics for file. |
| `debug lsp` | `symbols <query>` | [E: packages/opencode/src/cli/cmd/debug/lsp.ts:31] | workspace symbols. |
| `debug lsp` | `document-symbols <uri>` | [E: packages/opencode/src/cli/cmd/debug/lsp.ts:42] | document symbols. |
| `debug` | `rg` | [E: packages/opencode/src/cli/cmd/debug/ripgrep.ts:9] | ripgrep root. |
| `debug rg` | `files` | [E: packages/opencode/src/cli/cmd/debug/ripgrep.ts:16] | list ripgrep files. |
| `debug rg` | `search <pattern>` | [E: packages/opencode/src/cli/cmd/debug/ripgrep.ts:48] | search pattern. |
| `debug` | `file` | [E: packages/opencode/src/cli/cmd/debug/file.ts:68] | file helper root. |
| `debug file` | `search <query>` | [E: packages/opencode/src/cli/cmd/debug/file.ts:17] | file search. |
| `debug file` | `read <path>` | [E: packages/opencode/src/cli/cmd/debug/file.ts:32] | read file. |
| `debug file` | `list <path>` | [E: packages/opencode/src/cli/cmd/debug/file.ts:53] | list path. |
| `debug` | `scrap` | [E: packages/opencode/src/cli/cmd/debug/scrap.ts:5] | scratch debug command. |
| `debug` | `skill` | [E: packages/opencode/src/cli/cmd/debug/skill.ts:7] | skill debug command. |
| `debug` | `snapshot` | [E: packages/opencode/src/cli/cmd/debug/snapshot.ts:7] | snapshot root. |
| `debug snapshot` | `track` | [E: packages/opencode/src/cli/cmd/debug/snapshot.ts:14] | track snapshot. |
| `debug snapshot` | `patch <hash>` | [E: packages/opencode/src/cli/cmd/debug/snapshot.ts:23] | patch by hash. |
| `debug snapshot` | `diff <hash>` | [E: packages/opencode/src/cli/cmd/debug/snapshot.ts:38] | diff by hash. |
| `debug` | `startup` | [E: packages/opencode/src/cli/cmd/debug/startup.ts:5] | startup debug. |
| `debug` | `agent <name>` | [E: packages/opencode/src/cli/cmd/debug/agent.ts:5] | agent debug. |
| `debug` | `v2` | [E: packages/opencode/src/cli/cmd/debug/v2.ts:10] | V2 debug command from V1 CLI host. |
| `debug` | `wait` | [E: packages/opencode/src/cli/cmd/debug/index.ts:42] | wait helper. |
| `debug` | `info` | [E: packages/opencode/src/cli/cmd/debug/index.ts:50] | info helper. |
| `debug` | `paths` | [E: packages/opencode/src/cli/cmd/debug/index.ts:80] | path helper. |
| `console` | `login [url]` | [E: packages/opencode/src/cli/cmd/account.ts:178] | Console login. |
| `console` | `logout [email]` | [E: packages/opencode/src/cli/cmd/account.ts:193] | Console logout. |
| `console` | `switch` | [E: packages/opencode/src/cli/cmd/account.ts:208] | switch Console account. |
| `console` | `orgs` | [E: packages/opencode/src/cli/cmd/account.ts:218] | list orgs. |
| `console` | `open` | [E: packages/opencode/src/cli/cmd/account.ts:228] | open Console. |
| `providers` | `list` | [E: packages/opencode/src/cli/cmd/providers.ts:249] | list provider auth/config. |
| `providers` | `login [url]` | [E: packages/opencode/src/cli/cmd/providers.ts:300] | provider login. |
| `providers` | `logout [provider]` | [E: packages/opencode/src/cli/cmd/providers.ts:492] | provider logout. |
| `agent` | `create` | [E: packages/opencode/src/cli/cmd/agent.ts:34] | create agent via generation flow. |
| `agent` | `list` | [E: packages/opencode/src/cli/cmd/agent.ts:235] | list agents. |
| `github` | `install` | [E: packages/opencode/src/cli/cmd/github.ts:8] | install GitHub integration. |
| `github` | `run` | [E: packages/opencode/src/cli/cmd/github.ts:18] | run GitHub integration. |
| `session` | `delete <sessionID>` | [E: packages/opencode/src/cli/cmd/session.ts:52] | delete session. |
| `session` | `list` | [E: packages/opencode/src/cli/cmd/session.ts:71] | list sessions. |
| `db` | `$0 [query]` | [E: packages/opencode/src/cli/cmd/db.ts:9] | execute DB query/root behavior. |
| `db` | `path` | [E: packages/opencode/src/cli/cmd/db.ts:46] | print DB path. |

## V2 关系

这个节点是 `v: v1`。V2 preview CLI host 在 `packages/cli/src` 使用 Effect CLI framework 和 daemon service；它不是 `packages/opencode/src/index.ts` 这条 yargs command tree。[I]

## Sources

- `packages/opencode/src/index.ts`
- `packages/opencode/src/cli/cmd/acp.ts`
- `packages/opencode/src/cli/cmd/account.ts`
- `packages/opencode/src/cli/cmd/agent.ts`
- `packages/opencode/src/cli/cmd/attach.ts`
- `packages/opencode/src/cli/cmd/db.ts`
- `packages/opencode/src/cli/cmd/debug/agent.ts`
- `packages/opencode/src/cli/cmd/debug/config.ts`
- `packages/opencode/src/cli/cmd/debug/file.ts`
- `packages/opencode/src/cli/cmd/debug/index.ts`
- `packages/opencode/src/cli/cmd/debug/lsp.ts`
- `packages/opencode/src/cli/cmd/debug/ripgrep.ts`
- `packages/opencode/src/cli/cmd/debug/scrap.ts`
- `packages/opencode/src/cli/cmd/debug/skill.ts`
- `packages/opencode/src/cli/cmd/debug/snapshot.ts`
- `packages/opencode/src/cli/cmd/debug/startup.ts`
- `packages/opencode/src/cli/cmd/debug/v2.ts`
- `packages/opencode/src/cli/cmd/export.ts`
- `packages/opencode/src/cli/cmd/generate.ts`
- `packages/opencode/src/cli/cmd/github.ts`
- `packages/opencode/src/cli/cmd/import.ts`
- `packages/opencode/src/cli/cmd/mcp.ts`
- `packages/opencode/src/cli/cmd/models.ts`
- `packages/opencode/src/cli/cmd/plug.ts`
- `packages/opencode/src/cli/cmd/pr.ts`
- `packages/opencode/src/cli/cmd/providers.ts`
- `packages/opencode/src/cli/cmd/run.ts`
- `packages/opencode/src/cli/cmd/serve.ts`
- `packages/opencode/src/cli/cmd/session.ts`
- `packages/opencode/src/cli/cmd/stats.ts`
- `packages/opencode/src/cli/cmd/tui.ts`
- `packages/opencode/src/cli/cmd/uninstall.ts`
- `packages/opencode/src/cli/cmd/upgrade.ts`
- `packages/opencode/src/cli/cmd/web.ts`

## 相关

- `cli.run`
- `cli.lildax-framework`
