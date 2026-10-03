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
  - packages/coding-agent/src/experimental/server.ts
  - packages/coding-agent/src/experimental/client.ts
  - packages/coding-agent/src/experimental/client-runtime.ts
  - packages/coding-agent/src/experimental/client-tui.ts
  - packages/coding-agent/src/experimental/session-worker.ts
  - packages/coding-agent/src/experimental/session-worker-manager.ts
  - packages/coding-agent/src/experimental/coordinator.ts
  - packages/coding-agent/src/experimental/plugin.ts
  - packages/coding-agent/src/experimental/durable/main.ts
  - packages/coding-agent/src/experimental/durable/runtime.ts
  - packages/coding-agent/src/experimental/durable/sessions.ts
  - packages/coding-agent/src/experimental/durable/tui.ts
  - packages/coding-agent/src/experimental/durable/harness-setup.ts
  - packages/coding-agent/src/experimental/vacation/main.ts
  - packages/coding-agent/src/experimental/vacation/runtime.ts
  - packages/coding-agent/src/experimental/vacation/sessions.ts
  - packages/coding-agent/src/experimental/vacation/vacation.ts
  - packages/coding-agent/src/experimental/vacation/harness-setup.ts
  - packages/coding-agent/src/core/experimental.ts
  - packages/coding-agent/src/cli.ts
  - packages/coding-agent/package.json
  - packages/coding-agent/tsconfig.build.json
  - packages/coding-agent/test/experimental-cli-command.test.ts
  - packages/coding-agent/test/experimental-cli-entry.test.ts
  - packages/coding-agent/test/experimental-cli-resolution.test.ts
  - packages/coding-agent/test/package-distribution.test.ts
  - pi-test.sh
symbols:
  - cli
  - Command
  - serverCommand
  - clientCommand
  - runExperimentalCommand
  - startForegroundServer
  - openDurable
  - runDurableTui
  - createCodingAgentHarness
related:
  - surface.cli.overview
  - ref.coding-agent.cli-flags
  - surface.sdk.remote-session
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.coding-agent.experimental-cli` 描述 1.0.1 的 source-only experimental 面：`PI_EXPERIMENTAL=1` 下的 `server`/`client` parser 仍在 `src/cli/experimental/`，运行时、durable TUI、vacation planner 与 Session worker 都在 `src/experimental/**`，会话引擎是 `@earendil-works/pi-durable` 的 `Harness` + Node SQLite，不是发布 CLI。

## 能回答的问题

- experimental parser 现在有哪些 subcommand？还存在 root `pi` 命令吗？
- `--connect` 接受哪些 transport address？auth / session 选择规则是什么？
- 发布 `pi` bin 与 `pi-test.sh` 的入口差在哪？
- experimental server/client 的 Session worker 用的是哪一层 session runtime？
- `experimental/durable` 与 `experimental/vacation` 怎样在本地跑一个 pi-durable TUI？
- experimental server/client/plugin 为什么不是 shipped npm API？

## 命令组合与 parser

`cli` 的 root 是名为 `experimental` 的 `Command`，只注册 `serverCommand` 与 `clientCommand`。空 argv 的 builder 返回 “Expected experimental command: server or client” [E: packages/coding-agent/src/cli/experimental/cli.ts:11] [E: packages/coding-agent/src/cli/experimental/cli.ts:13] [E: packages/coding-agent/src/cli/experimental/cli.ts:16] [E: packages/coding-agent/test/experimental-cli-resolution.test.ts:5]。不存在 `commands/pi.ts` / `piCommand`。

generic `Command` 保存 name、option map、subcommand map、builder 与 action；重复 option 或 subcommand registration 立即抛错 [E: packages/coding-agent/src/cli/experimental/command.ts:78] [E: packages/coding-agent/src/cli/experimental/command.ts:89] [E: packages/coding-agent/src/cli/experimental/command.ts:113]。parse/execute 先用 argv[0] 选已注册 subcommand，否则解析 root [E: packages/coding-agent/src/cli/experimental/command.ts:125] [E: packages/coding-agent/src/cli/experimental/command.ts:144]。

option scanner 支持 `--name=value` 或 `--name value`；`--` 自身和其后的 argv 都进入 `remainingArgs`。未注册 token 停止 option parsing。flag 不得带 `=` 值；缺值/空值报错；同一 option 重复出现且 `repeatable !== true` 报错 [E: packages/coding-agent/src/cli/experimental/command.ts:174] [E: packages/coding-agent/src/cli/experimental/command.ts:188] [E: packages/coding-agent/src/cli/experimental/command.ts:203] [E: packages/coding-agent/src/cli/experimental/command.ts:211]。

1.0.1 里 parser 文件仍在 `packages/coding-agent/src/cli/experimental/`；dispatch、server/client runtime、durable TUI 与 vacation planner 都迁到 `packages/coding-agent/src/experimental/**`。两棵树都排除出 `tsconfig.build.json` 与 npm `files` [E: packages/coding-agent/tsconfig.build.json:19] [E: packages/coding-agent/package.json:31]。

## server / client invocation

`server` 注册 `--server-id`（lowercase UUIDv4）、`--session-dir`、`--provider`、`--model`、可重复 `-e`、以及 `--auth-token` / `--auth-token-file`。`--provider` 必须搭配 `--model`。剩余 legacy argv 走 `unsupportedOptions("server")` [E: packages/coding-agent/src/cli/experimental/commands/server.ts:35] [E: packages/coding-agent/src/cli/experimental/commands/server.ts:50] [E: packages/coding-agent/src/cli/experimental/commands/server.ts:51]。成功后 `context.runServer(command)` [E: packages/coding-agent/src/cli/experimental/commands/server.ts:66]。

`client` 注册 `--connect`、`--session-id`、`--continue`/`-c`、`--resume`/`-r`、provider/model/`-e`、auth。`--session-id` / `--continue` / `--resume` 互斥。`--` 后或单个非 `-` 剩余 token 可作为 one-shot `prompt`；其它 leftover 仍报 “does not support existing CLI options yet” [E: packages/coding-agent/src/cli/experimental/commands/client.ts:38] [E: packages/coding-agent/src/cli/experimental/commands/client.ts:67] [E: packages/coding-agent/src/cli/experimental/commands/client.ts:60] [E: packages/coding-agent/src/cli/experimental/commands/client.ts:72]。

`AuthInput` 是 `{ type: "token", token }` 或 `{ type: "file", path }`，两者互斥；parser 不读文件、不验证 token 内容 [E: packages/coding-agent/src/cli/experimental/command-options.ts:5] [E: packages/coding-agent/src/cli/experimental/command-options.ts:28] [E: packages/coding-agent/src/cli/experimental/command-options.ts:96]。`TransportAddress` 现为 unix 或 radius：`unix:///` 绝对 POSIX path（无 authority / query / fragment / 四斜线）；`radius://<lowercase-UUIDv4>` 无 userinfo/port/query/hash [E: packages/coding-agent/src/cli/experimental/command-options.ts:19] [E: packages/coding-agent/src/cli/experimental/command-options.ts:47] [E: packages/coding-agent/src/cli/experimental/command-options.ts:65]。测试覆盖 `unix:///tmp/pi.sock` 与 radius UUID [E: packages/coding-agent/test/experimental-cli-command.test.ts:44]。

## Dispatch 与 source-only 边界

发布 entry `src/cli.ts` 只 `main(process.argv.slice(2))`，即使 `PI_EXPERIMENTAL=1` 也不 dispatch `server`/`client` [E: packages/coding-agent/src/cli.ts:6] [E: packages/coding-agent/test/experimental-cli-entry.test.ts:49]。开发 entry `src/experimental/cli.ts` 先 `runExperimentalCommand(args)`，失败再回落 `main(args)` [E: packages/coding-agent/src/experimental/cli.ts:8] [E: packages/coding-agent/src/experimental/cli.ts:11]。client 成功后用 `process.exit(process.exitCode ?? 0)` 结束，避免 TUI 留下挂起 handle [E: packages/coding-agent/src/experimental/cli.ts:9]。

`runExperimentalCommand` 要求 `areExperimentalFeaturesEnabled()`（`PI_EXPERIMENTAL === "1"`）且 `args[0]` 是 `server` 或 `client`，然后 `cli.execute` [E: packages/coding-agent/src/core/experimental.ts:2] [E: packages/coding-agent/src/experimental/commands.ts:86] [E: packages/coding-agent/src/experimental/commands.ts:88]。根目录 `pi-test.sh` 用 Node type stripping 加 source-resolver 跑 `packages/coding-agent/src/experimental/cli.ts` [E: pi-test.sh:58] [E: pi-test.sh:59]。

`tsconfig.build.json` 排除 `src/client`、`src/experimental`、`src/cli/experimental` [E: packages/coding-agent/tsconfig.build.json:19]。package `exports["./client"]` 与 `exports["./experimental/plugin"]` 只有 `source` 字段；`files` 排除对应 dist 目录 [E: packages/coding-agent/package.json:22] [E: packages/coding-agent/package.json:25] [E: packages/coding-agent/package.json:31] [E: packages/coding-agent/test/package-distribution.test.ts:28]。因此 1.0.1 的 experimental client / plugin / server-client 命令是 source-only，不是 shipped npm 公共 API。

这些模块不得计入 `ref.coding-agent.cli-flags` 的 active `parseArgs()` catalog。

## Client/server on pi-durable

`runServer` → `startForegroundServer()`：在 `PI_SERVER_DIR` / `~/.pi/server` 上锁 logical `serverId`，经 coordinator 启动可替换的 `Server` + `SessionWorkerManager`，并可选 Radius relay [E: packages/coding-agent/src/experimental/commands.ts:28] [E: packages/coding-agent/src/experimental/server.ts:682] [E: packages/coding-agent/src/experimental/server.ts:493]。默认 session 目录是 `join(getAgentDir(), "experimental", "sessions")` [E: packages/coding-agent/src/experimental/server.ts:70]。

`runClient`：TTY 无 prompt 走 `runClientTui`；否则 `runClient()` 经 `openClientRuntime` 发现 server、list/create/attach Session，再可选 prompt [E: packages/coding-agent/src/experimental/commands.ts:68] [E: packages/coding-agent/src/experimental/client.ts:21] [E: packages/coding-agent/src/experimental/client-runtime.ts:53]。未给 `--connect` 时用 `discoverUnixServers()` [E: packages/coding-agent/src/experimental/client-runtime.ts:79]。auth 只允许 experimental Radius [E: packages/coding-agent/src/experimental/client-runtime.ts:57]。交互式 client TUI 固定 `createInteractiveTui({ tuiMode: "fullscreen", ... })`，不读用户 `tuiMode` setting [E: packages/coding-agent/src/experimental/client-tui.ts:747] [E: packages/coding-agent/src/experimental/client-tui.ts:748]。

`SessionWorkerManager` 是 server 进程里的 session/process bookkeeping（`workerPids` / `#workersBySession`），不是 conversation 宿主 [E: packages/coding-agent/src/experimental/session-worker-manager.ts:95] [E: packages/coding-agent/src/experimental/session-worker-manager.ts:96] [E: packages/coding-agent/src/experimental/session-worker-manager.ts:103]。每个 Session worker 打开 `session.sqlite`，用 `@earendil-works/pi-durable` 的 `Harness.open(openNodeSqliteStorage(...))` 建 runtime；`createCodingAgentHarness` 是这个工厂名，不是已删除的 agent-core harness [E: packages/coding-agent/src/experimental/session-worker.ts:15] [E: packages/coding-agent/src/experimental/session-worker.ts:16] [E: packages/coding-agent/src/experimental/session-worker.ts:773] [E: packages/coding-agent/src/experimental/session-worker.ts:784]。已有 root conversation 时保留 durable model；只有新建 conversation 才用 `findInitialAgentModel` 写入初始 model/thinking [E: packages/coding-agent/src/experimental/session-worker.ts:796] [E: packages/coding-agent/src/experimental/session-worker.ts:804]。

`CoordinatorConnection` 的 `COORDINATOR_PROTOCOL_VERSION = 3` 是私有 lifecycle 协议，不是 `pi-protocol` version 8 [E: packages/coding-agent/src/experimental/coordinator.ts:14]。`./experimental/plugin` 只 re-export `AgentController` / `PresentationUI` / `SlashCommands` 供 workspace 插件源码使用 [E: packages/coding-agent/src/experimental/plugin.ts:3] [E: packages/coding-agent/src/experimental/plugin.ts:10] [E: packages/coding-agent/src/experimental/plugin.ts:15]。

## Durable TUI prototype

`packages/coding-agent/src/experimental/durable/` 是单进程 local coding agent：一个 process 同时持有 `ModelRuntime`、pi-durable `Harness`、Node SQLite 与 TUI。入口 `main.ts` 只认 `--continue`/`-c`，然后 `openDurable()` + `runDurableTui()` [E: packages/coding-agent/src/experimental/durable/main.ts:6] [E: packages/coding-agent/src/experimental/durable/main.ts:15] [E: packages/coding-agent/src/experimental/durable/main.ts:17]。

`selectSession()` 把会话放在 `~/.pi/agent/experimental/durable-sessions/<cwd-sha256-24>/<timestamp-uuid>/session.sqlite`；`--continue` 打开该 cwd 最新目录。crash 留下的 lock 10s 后 stale [E: packages/coding-agent/src/experimental/durable/sessions.ts:20] [E: packages/coding-agent/src/experimental/durable/sessions.ts:23] [E: packages/coding-agent/src/experimental/durable/sessions.ts:48]。

`openDurable()` 调 `Harness.open(await openNodeSqliteStorage(location.database), { models, registry, settings, env, onReport }, context)`，registry 安装 durable `CodingTools` 与 `Subagent`；TUI 只渲染 `DurableView`（`Conversation.viewState()` 的 structural mount），不持有 `Harness` 对象 [E: packages/coding-agent/src/experimental/durable/runtime.ts:16] [E: packages/coding-agent/src/experimental/durable/runtime.ts:52] [E: packages/coding-agent/src/experimental/durable/runtime.ts:138] [E: packages/coding-agent/src/experimental/durable/harness-setup.ts:11]。compaction / retry / steering / follow-up 经 `createHarnessSettings()` 每次从 pi `SettingsManager` 现读 [E: packages/coding-agent/src/experimental/durable/harness-setup.ts:25] [E: packages/coding-agent/src/experimental/durable/harness-setup.ts:36]。

`runDurableTui()` 复用 interactive 的 `CustomEditor`、message/tool 组件和 theme controller；它不是发布 `InteractiveMode`，也不走 `tuiMode` setting [E: packages/coding-agent/src/experimental/durable/tui.ts:563] [E: packages/coding-agent/src/experimental/durable/tui.ts:568]。凭证与 `settings.json` 与正式 `pi` 共用。

## Vacation planner

`packages/coding-agent/src/experimental/vacation/` 是 durable TUI 的拷贝，把 coding tools / coding prompt 换成 vacation planner。入口同样是 `openDurable()` + `runDurableTui()`，只认 `--continue`/`-c` [E: packages/coding-agent/src/experimental/vacation/main.ts:6] [E: packages/coding-agent/src/experimental/vacation/main.ts:15]。会话目录换成 `experimental/vacation-sessions/<cwd-hash>/.../session.sqlite` [E: packages/coding-agent/src/experimental/vacation/sessions.ts:20] [E: packages/coding-agent/src/experimental/vacation/sessions.ts:23]。

`vacation.ts` 用 pi-durable 的 `defineTool` / `defineTask` / `defineExtension` 注册 canned `search`（weather/museums/trains，可并行、可 rerun）和 background `research` 子 agent [E: packages/coding-agent/src/experimental/vacation/vacation.ts:7] [E: packages/coding-agent/src/experimental/vacation/vacation.ts:35] [E: packages/coding-agent/src/experimental/vacation/harness-setup.ts:2] [E: packages/coding-agent/src/experimental/vacation/harness-setup.ts:7]。TUI 仍看起来像 coding agent，只因为复用了 interactive 组件；agent 本身是 durable `Harness`。

durable 与 vacation 都不是 `PI_EXPERIMENTAL=1 ./pi-test.sh` 的 subcommand：它们是独立 `node .../experimental/durable/main.ts` / `.../vacation/main.ts` 入口，通常配合 `source-resolver.ts` 从 workspace `src` 加载包。

## Gotcha

- 发布 `pi` bin 即使设了 `PI_EXPERIMENTAL=1` 也不会变成 server/client；只有 `pi-test.sh` / `src/experimental/cli.ts` 会 [E: packages/coding-agent/src/cli.ts:6] [E: packages/coding-agent/test/experimental-cli-entry.test.ts:49]。
- Session worker 与 durable/vacation prototype 都打开 `session.sqlite` 并调用 `Harness.open`；这是 `@earendil-works/pi-durable` 的 Node SQLite storage，不是已删除的独立 sqlite session-backend 包 [E: packages/coding-agent/src/experimental/session-worker.ts:15] [E: packages/coding-agent/src/experimental/durable/runtime.ts:16]。
- experimental client TUI 强制 fullscreen；用户 `settings.json` 的 `tuiMode: "regular"` 不影响这条路径 [E: packages/coding-agent/src/experimental/client-tui.ts:748]。

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
- packages/coding-agent/src/experimental/client-tui.ts
- packages/coding-agent/src/experimental/session-worker.ts
- packages/coding-agent/src/experimental/session-worker-manager.ts
- packages/coding-agent/src/experimental/coordinator.ts
- packages/coding-agent/src/experimental/plugin.ts
- packages/coding-agent/src/experimental/durable/main.ts
- packages/coding-agent/src/experimental/durable/runtime.ts
- packages/coding-agent/src/experimental/durable/sessions.ts
- packages/coding-agent/src/experimental/durable/tui.ts
- packages/coding-agent/src/experimental/durable/harness-setup.ts
- packages/coding-agent/src/experimental/vacation/main.ts
- packages/coding-agent/src/experimental/vacation/runtime.ts
- packages/coding-agent/src/experimental/vacation/sessions.ts
- packages/coding-agent/src/experimental/vacation/vacation.ts
- packages/coding-agent/src/experimental/vacation/harness-setup.ts
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
