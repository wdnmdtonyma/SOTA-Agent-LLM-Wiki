---
id: subsys.coding-agent.experimental-cli
title: Experimental CLI 与 source-only 远程树
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/cli/experimental/cli.ts
  - packages/coding-agent/src/cli/experimental/command.ts
  - packages/coding-agent/src/cli/experimental/command-options.ts
  - packages/coding-agent/src/cli/experimental/commands/server.ts
  - packages/coding-agent/src/cli/experimental/commands/client.ts
  - packages/coding-agent/src/experimental/cli.ts
  - packages/coding-agent/src/experimental/commands.ts
  - packages/coding-agent/src/cli.ts
  - packages/coding-agent/package.json
  - pi-test.sh
symbols:
  - cli
  - Command
  - serverCommand
  - clientCommand
  - runExperimentalCommand
related:
  - surface.cli.overview
  - ref.coding-agent.cli-flags
  - surface.sdk.remote-session
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `subsys.coding-agent.experimental-cli` 描述 source-only 的 experimental 命令面：parser 只组合 `server` / `client`，由 `pi-test.sh` → `src/experimental/cli.ts` 在 `PI_EXPERIMENTAL=1` 时 dispatch。`auth.ts` / `transport-address.ts` / `commands/pi.ts` 已删除；发布 CLI 不接线这些命令。

## 能回答的问题

- experimental parser 现在有哪些 subcommand？还存在 root `pi` 命令吗？
- `--connect` 接受哪些 transport address？auth / session 选择规则是什么？
- 发布 `pi` bin 与 `pi-test.sh` 的入口差在哪？
- experimental server/client/plugin/session-worker 为什么不是 shipped npm API？

## 命令组合与 parser

`cli` 的 root 是名为 `experimental` 的 `Command`，只注册 `serverCommand` 与 `clientCommand`。空 argv 的 builder 返回 “Expected experimental command: server or client” [E: packages/coding-agent/src/cli/experimental/cli.ts:11] [E: packages/coding-agent/src/cli/experimental/cli.ts:13] [E: packages/coding-agent/src/cli/experimental/cli.ts:16] [E: packages/coding-agent/test/experimental-cli-resolution.test.ts:5]。不存在 `commands/pi.ts` / `piCommand`。

generic `Command` 保存 name、option map、subcommand map、builder 与 action；重复 option 或 subcommand registration 立即抛错 [E: packages/coding-agent/src/cli/experimental/command.ts:73] [E: packages/coding-agent/src/cli/experimental/command.ts:89] [E: packages/coding-agent/src/cli/experimental/command.ts:113]。parse/execute 先用 argv[0] 选已注册 subcommand，否则解析 root [E: packages/coding-agent/src/cli/experimental/command.ts:125] [E: packages/coding-agent/src/cli/experimental/command.ts:144]。

option scanner 支持 `--name=value` 或 `--name value`；`--` 自身和其后的 argv 都进入 `remainingArgs`。未注册 token 停止 option parsing。flag 不得带 `=` 值；缺值/空值报错；同一 option 重复出现且 `repeatable !== true` 报错 [E: packages/coding-agent/src/cli/experimental/command.ts:174] [E: packages/coding-agent/src/cli/experimental/command.ts:188] [E: packages/coding-agent/src/cli/experimental/command.ts:203] [E: packages/coding-agent/src/cli/experimental/command.ts:211]。

## server / client invocation

`server` 注册 `--server-id`（lowercase UUIDv4）、`--session-dir`、`--provider`、`--model`、可重复 `-e`、以及 `--auth-token` / `--auth-token-file`。`--provider` 必须搭配 `--model`。剩余 legacy argv 走 `unsupportedOptions("server")` [E: packages/coding-agent/src/cli/experimental/commands/server.ts:35] [E: packages/coding-agent/src/cli/experimental/commands/server.ts:50] [E: packages/coding-agent/src/cli/experimental/commands/server.ts:51] [E: packages/coding-agent/src/cli/experimental/command-options.ts:103]。成功后 `context.runServer(command)` [E: packages/coding-agent/src/cli/experimental/commands/server.ts:66]。

`client` 注册 `--connect`、`--session-id`、`--continue`/`-c`、`--resume`/`-r`、provider/model/`-e`、auth。`--session-id` / `--continue` / `--resume` 互斥。`--` 后或单个非 `-` 剩余 token 可作为 one-shot `prompt`；其它 leftover 仍报 “does not support existing CLI options yet” [E: packages/coding-agent/src/cli/experimental/commands/client.ts:38] [E: packages/coding-agent/src/cli/experimental/commands/client.ts:67] [E: packages/coding-agent/src/cli/experimental/commands/client.ts:60] [E: packages/coding-agent/src/cli/experimental/commands/client.ts:72]。

`AuthInput` 是 `{ type: "token", token }` 或 `{ type: "file", path }`，两者互斥；parser 不读文件、不验证 token 内容 [E: packages/coding-agent/src/cli/experimental/command-options.ts:5] [E: packages/coding-agent/src/cli/experimental/command-options.ts:28] [E: packages/coding-agent/src/cli/experimental/command-options.ts:96]。`TransportAddress` 现为 unix 或 radius：`unix:///` 绝对 POSIX path（无 authority / query / fragment / 四斜线）；`radius://<lowercase-UUIDv4>` 无 userinfo/port/query/hash [E: packages/coding-agent/src/cli/experimental/command-options.ts:19] [E: packages/coding-agent/src/cli/experimental/command-options.ts:47] [E: packages/coding-agent/src/cli/experimental/command-options.ts:65]。测试覆盖 `unix:///tmp/pi.sock` 与 radius UUID [E: packages/coding-agent/test/experimental-cli-command.test.ts:44]。

## Dispatch 与 source-only 边界

发布 entry `src/cli.ts` 只 `main(process.argv.slice(2))`，即使 `PI_EXPERIMENTAL=1` 也不 dispatch `server`/`client` [E: packages/coding-agent/src/cli.ts:6] [E: packages/coding-agent/test/experimental-cli-entry.test.ts:47]。开发 entry `src/experimental/cli.ts` 先 `runExperimentalCommand(args)`，失败再回落 `main(args)` [E: packages/coding-agent/src/experimental/cli.ts:8] [E: packages/coding-agent/src/experimental/cli.ts:11]。

`runExperimentalCommand` 要求 `areExperimentalFeaturesEnabled()`（`PI_EXPERIMENTAL === "1"`）且 `args[0]` 是 `server` 或 `client`，然后 `cli.execute` [E: packages/coding-agent/src/core/experimental.ts:2] [E: packages/coding-agent/src/experimental/commands.ts:94] [E: packages/coding-agent/src/experimental/commands.ts:96]。根目录 `pi-test.sh` 用 tsx 跑 `packages/coding-agent/src/experimental/cli.ts` [E: pi-test.sh:57]。

`tsconfig.build.json` 排除 `src/client`、`src/experimental`、`src/cli/experimental` [E: packages/coding-agent/tsconfig.build.json:19]。package `exports["./client"]` 与 `exports["./experimental/plugin"]` 只有 `source` 字段；`files` 排除对应 dist 目录 [E: packages/coding-agent/package.json:22] [E: packages/coding-agent/package.json:25] [E: packages/coding-agent/package.json:31] [E: packages/coding-agent/test/package-distribution.test.ts:28]。因此 0.85.1 的 experimental client / plugin / server-client 命令是 source-only，不是 shipped npm 公共 API。

## Experimental 树（写在本节点，不另建页）

`runServer` → `startForegroundServer()`：在 `PI_SERVER_DIR` / `~/.pi/server` 上锁 logical `serverId`，经 coordinator 启动可替换的 `Server` + `SessionWorkerManager`，并可选 Radius relay [E: packages/coding-agent/src/experimental/commands.ts:28] [E: packages/coding-agent/src/experimental/server.ts:710] [E: packages/coding-agent/src/experimental/server.ts:521]。默认 session 目录是 `join(getAgentDir(), "experimental", "sessions")` [E: packages/coding-agent/src/experimental/server.ts:70]。

`runClient`：TTY 无 prompt 走 `runClientTui`；否则 `runClient()` 经 `openClientRuntime` 发现 server、list/create/attach Session，再可选 prompt [E: packages/coding-agent/src/experimental/commands.ts:68] [E: packages/coding-agent/src/experimental/client.ts:25] [E: packages/coding-agent/src/experimental/client-runtime.ts:53]。未给 `--connect` 时用 `discoverUnixServers()` [E: packages/coding-agent/src/experimental/client-runtime.ts:79]。auth 只允许 experimental Radius [E: packages/coding-agent/src/experimental/client-runtime.ts:57]。

`SessionWorkerManager` 是 server 进程里的 session/process bookkeeping（`workerPids` / `#workersBySession`），不是 worker Harness 宿主 [E: packages/coding-agent/src/experimental/session-worker-manager.ts:98] [E: packages/coding-agent/src/experimental/session-worker-manager.ts:99] [E: packages/coding-agent/src/experimental/session-worker-manager.ts:107]。Harness 宿主是 `experimental/session-worker.ts` 的 `createCodingAgentHarness` / `AgentHarness.create` [E: packages/coding-agent/src/experimental/session-worker.ts:805] [E: packages/coding-agent/src/experimental/session-worker.ts:834]。`CoordinatorConnection` 的 `COORDINATOR_PROTOCOL_VERSION = 3` 是私有 lifecycle 协议，不是 `pi-protocol` version 8 [E: packages/coding-agent/src/experimental/coordinator.ts:14]。`./experimental/plugin` 只 re-export `AgentController` / `PresentationUI` / `SlashCommands` 供 workspace 插件源码使用 [E: packages/coding-agent/src/experimental/plugin.ts:3] [E: packages/coding-agent/src/experimental/plugin.ts:10] [E: packages/coding-agent/src/experimental/plugin.ts:15]。

这些模块不得计入 `ref.coding-agent.cli-flags` 的 active `parseArgs()` catalog。

## Sources

- packages/coding-agent/src/cli/experimental/cli.ts
- packages/coding-agent/src/cli/experimental/command.ts
- packages/coding-agent/src/cli/experimental/command-options.ts
- packages/coding-agent/src/cli/experimental/commands/server.ts
- packages/coding-agent/src/cli/experimental/commands/client.ts
- packages/coding-agent/src/experimental/cli.ts
- packages/coding-agent/src/experimental/commands.ts
- packages/coding-agent/src/experimental/server.ts
- packages/coding-agent/src/experimental/client.ts
- packages/coding-agent/src/experimental/client-runtime.ts
- packages/coding-agent/src/experimental/plugin.ts
- packages/coding-agent/src/experimental/coordinator.ts
- packages/coding-agent/src/experimental/session-worker-manager.ts
- packages/coding-agent/src/core/experimental.ts
- packages/coding-agent/src/cli.ts
- packages/coding-agent/package.json
- packages/coding-agent/tsconfig.build.json
- packages/coding-agent/test/experimental-cli-command.test.ts
- packages/coding-agent/test/experimental-cli-entry.test.ts
- packages/coding-agent/test/experimental-cli-resolution.test.ts
- packages/coding-agent/test/package-distribution.test.ts
- pi-test.sh

## 相关

- [surface.cli.overview](../../surface/cli/overview.md): 当前已接线的发布 CLI 与 `parseArgs()` surface。
- [ref.coding-agent.cli-flags](../../reference/cli-flags.md): 当前 active global parser token catalog。
- [surface.sdk.remote-session](../../surface/sdk/remote-session.md): coding-agent `./client` 已退役为 source-only re-export。
