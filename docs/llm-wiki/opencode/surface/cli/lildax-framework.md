---
id: cli.lildax-framework
title: lildax CLI Framework
status: verified
owner: surface-config-cli
v: v2
kind: surface
tier: T1
schema: node
source:
  - packages/cli/src/framework/runtime.ts
  - packages/cli/src/framework/spec.ts
  - packages/cli/src/services/daemon.ts
  - packages/cli/src/commands/commands.ts
  - packages/cli/src/commands/handlers/
  - packages/cli/src/index.ts
  - packages/cli/src/tui.ts
updated: 92c70c9c3
evidence: explicit
---

> `cli.lildax-framework` 描述 `packages/cli` 的 V2 preview CLI host。它使用 Effect CLI specs、lazy handlers 和 daemon service，不是 V1 `packages/opencode/src/index.ts` 的 yargs host。

## 能回答的问题

- `packages/cli` 如何声明 command tree 和 lazy handlers。
- daemon 如何生成 password、启动 `serve --register`、检查 health。
- V2 preview CLI 的 root commands 与 V1 yargs root commands 有什么关系。
- TUI package 如何被新的 CLI host 调用。

## Command Spec

`Spec.make(name, options)` 把 command name、description、args、options、children 包装成 Effect `Command`，并把 children array 转成 `commands` map。[E: packages/cli/src/framework/spec.ts:27] [E: packages/cli/src/framework/spec.ts:32] 这意味着 lildax 的 command tree 是声明式数据，不是 yargs 的链式 `.command(...)` 注册。[I]

`packages/cli/src/commands/commands.ts` 把 root command name 设为 `OPENCODE_CLI_NAME` 或默认 `opencode`，description 是 `OpenCode 2.0 preview command line interface`。[E: packages/cli/src/commands/commands.ts:6]

| V2 preview command | 声明位置 | handler |
| --- | --- | --- |
| default root `$` | root command | `commands/handlers/default.ts` 运行 TUI。[E: packages/cli/src/index.ts:10] |
| `debug agents` | `Commands.debug` child | `commands/handlers/debug/agents.ts`。[E: packages/cli/src/index.ts:13] |
| `migrate` | root child | `commands/handlers/migrate.ts`。[E: packages/cli/src/index.ts:15] |
| `service start` | `service` child | `commands/handlers/service/start.ts`。[E: packages/cli/src/index.ts:17] |
| `service restart` | `service` child | `commands/handlers/service/restart.ts`。[E: packages/cli/src/index.ts:18] |
| `service status` | `service` child | `commands/handlers/service/status.ts`。[E: packages/cli/src/index.ts:19] |
| `service stop` | `service` child | `commands/handlers/service/stop.ts`。[E: packages/cli/src/index.ts:20] |
| `service password [password]` | `service` child | `commands/handlers/service/password.ts`。[E: packages/cli/src/index.ts:21] |
| `serve` | root child | `commands/handlers/serve.ts`。[E: packages/cli/src/index.ts:23] |

## Runtime

`Runtime.handlers(spec)` 返回一个递归 typed handlers object，节点可以有 `$` handler，也可以有 child handler。[E: packages/cli/src/framework/runtime.ts:42] `Runtime.provide` 会对每个 command 调用 `Command.withHandler`，执行时 lazy-import 对应 module，然后调用 module default export。[E: packages/cli/src/framework/runtime.ts:62] `Runtime.run` 用 Effect CLI 的 `Command.run` 加 version 运行整个 command graph。[E: packages/cli/src/framework/runtime.ts:58]

`packages/cli/src/index.ts` 把 `Commands.default` 和 handlers 传给 `Runtime.run`，并提供 `Daemon.Default` 与 `NodeRuntime.NodeServices` layer 后 `runMain`。[E: packages/cli/src/index.ts:26]

## Daemon Service

daemon service interface 暴露 `client`、`transport`、`start`、`status`、`stop`、`password`、`register`。[E: packages/cli/src/services/daemon.ts:11] password 文件路径来自 `Global.Path.state/server.json` 和 `Global.Path.state/password`。[E: packages/cli/src/services/daemon.ts:39] `password()` 会读取已有密码；没有密码时生成 32 bytes random base64url，写入临时文件再 rename，文件权限为 `0o600`。[E: packages/cli/src/services/daemon.ts:44] [E: packages/cli/src/services/daemon.ts:50] [E: packages/cli/src/services/daemon.ts:53]

daemon client 通过 `createOpencodeClient` 创建，header 使用 `ServerAuth.headers({ password })`。[E: packages/cli/src/services/daemon.ts:62] `healthy()` 读取 registration 后调用 `client.v2.health.get`，并要求 response `healthy === true`。[E: packages/cli/src/services/daemon.ts:66] `compatible()` 额外比较 registration version 与 `InstallationVersion`。[E: packages/cli/src/services/daemon.ts:74]

`start()` 只有在已有 healthy registration 版本等于 `InstallationVersion` 且 CLI 不是直接用 `bun` 运行时，才直接返回 existing URL。[E: packages/cli/src/services/daemon.ts:111] [E: packages/cli/src/services/daemon.ts:114] 否则它会 stop 旧进程，然后 detached spawn 当前 `process.execPath`，参数是 optional entrypoint 加 `serve --register`，再轮询 compatible registration。[E: packages/cli/src/services/daemon.ts:115] [E: packages/cli/src/services/daemon.ts:122] [E: packages/cli/src/services/daemon.ts:130] `register()` 把 daemon metadata 写进 `server.json`，权限同样是 `0o600`，并设置 finalizer 清理 registration。[E: packages/cli/src/services/daemon.ts:164]

## Serve 与 TUI Host

`serve` handler 调用 `listen`，如果带 `--register` 就执行 daemon registration，然后记录 listening URL 并 `Effect.never` 保持进程。[E: packages/cli/src/commands/handlers/serve.ts:18] [E: packages/cli/src/commands/handlers/serve.ts:19] [E: packages/cli/src/commands/handlers/serve.ts:21] `listen` 默认先尝试端口 `4096`，失败后用端口 `0` 自动分配。[E: packages/cli/src/commands/handlers/serve.ts:27] HTTP app 使用 Effect `HttpRouter.serve(createRoutes(password))` 加 Node HTTP server layer，不是 Hono。[E: packages/cli/src/commands/handlers/serve.ts:34]

default handler 获取 daemon transport 后动态导入 `../../tui` 并调用 `runTui(transport)`。[E: packages/cli/src/commands/handlers/default.ts:9] [E: packages/cli/src/commands/handlers/default.ts:10] [E: packages/cli/src/commands/handlers/default.ts:11] `runTui` 使用 `@opencode-ai/tui` 的 `run`，传入 `gracefulFetch`、empty plugin host 和 `Global.defaultLayer`。[E: packages/cli/src/tui.ts:8] [E: packages/cli/src/tui.ts:12] [E: packages/cli/src/tui.ts:13] [E: packages/cli/src/tui.ts:17]

## V1 关系

这个节点是 `v: v2`。V1 CLI host 仍由 `packages/opencode/src/index.ts` 的 yargs command tree 提供；V2 lildax host 是独立 preview host，当前 command set 显著更小。[I]

## Sources

- `packages/cli/src/framework/spec.ts`
- `packages/cli/src/framework/runtime.ts`
- `packages/cli/src/commands/commands.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/services/daemon.ts`
- `packages/cli/src/commands/handlers/default.ts`
- `packages/cli/src/commands/handlers/serve.ts`
- `packages/cli/src/tui.ts`

## 相关

- `cli.opencode-yargs`
- `config.tui`
- `surface-server.httpapi`
