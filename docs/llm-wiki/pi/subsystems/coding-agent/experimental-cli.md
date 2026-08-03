---
id: subsys.coding-agent.experimental-cli
title: Experimental CLI 命令解析器
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/cli/experimental/cli.ts
  - packages/coding-agent/src/cli/experimental/command.ts
  - packages/coding-agent/src/cli/experimental/command-options.ts
  - packages/coding-agent/src/cli/experimental/auth.ts
  - packages/coding-agent/src/cli/experimental/transport-address.ts
  - packages/coding-agent/src/cli/experimental/commands/pi.ts
  - packages/coding-agent/src/cli/experimental/commands/server.ts
  - packages/coding-agent/src/cli/experimental/commands/client.ts
symbols:
  - experimentalCli
  - Command
  - parseTransportAddress
  - parseAuthInput
  - piCommand
  - serverCommand
  - clientCommand
related:
  - surface.cli.overview
  - ref.coding-agent.cli-flags
  - surface.sdk.remote-session
evidence: explicit
status: verified
updated: a8ee03b815
---

> `subsys.coding-agent.experimental-cli` 描述源码中独立的 experimental command parser：它为未来的 `pi` / `server` / `client` transport 形态组合 subcommand、auth 与 Unix socket address，但当前 target checkout 没有把 `experimentalCli` 接到发布 CLI entrypoint。

## 能回答的问题

- experimental parser 如何组合 root `pi`、`server` 与 `client` 命令？
- registered options、legacy options、duplicate values 和 `--` 的解析规则是什么？
- `--listen` / `--connect` 当前接受什么 transport address？
- 为什么这些 flags 不应计入当前 active CLI catalog？

## 命令组合与 parser 模型

`experimentalCli` 以 `piCommand` 为 root，再注册 `serverCommand` 与 `clientCommand` 两个 subcommand；执行 context 是三个 command context 的交集 [E: packages/coding-agent/src/cli/experimental/cli.ts:1] [E: packages/coding-agent/src/cli/experimental/cli.ts:5] [E: packages/coding-agent/src/cli/experimental/cli.ts:7]。generic `Command` 保存 command name、registered option map、subcommand map、builder 和 action；重复 option 或 subcommand registration 会立即抛错 [E: packages/coding-agent/src/cli/experimental/command.ts:63] [E: packages/coding-agent/src/cli/experimental/command.ts:68] [E: packages/coding-agent/src/cli/experimental/command.ts:72] [E: packages/coding-agent/src/cli/experimental/command.ts:78] [E: packages/coding-agent/src/cli/experimental/command.ts:80] [E: packages/coding-agent/src/cli/experimental/command.ts:96] [E: packages/coding-agent/src/cli/experimental/command.ts:103]。

parse/execute 都先用 argv 首项选择已注册 subcommand；否则解析 root command。execute 在 parse 成功后调用 command action，并把 typed invocation 原样放进 success result [E: packages/coding-agent/src/cli/experimental/command.ts:115] [E: packages/coding-agent/src/cli/experimental/command.ts:118] [E: packages/coding-agent/src/cli/experimental/command.ts:121] [E: packages/coding-agent/src/cli/experimental/command.ts:129] [E: packages/coding-agent/src/cli/experimental/command.ts:130] [E: packages/coding-agent/src/cli/experimental/command.ts:134] [E: packages/coding-agent/src/cli/experimental/command.ts:138]。

option scanner 支持 `--name=value` 或 `--name value`;`--` 自身和其后的 argv 都进入 `remainingArgs`，遇到第一个未注册 token 也停止 option parsing 并保留剩余 argv。缺值、空值或同一 option 重复出现都会产生 error [E: packages/coding-agent/src/cli/experimental/command.ts:156] [E: packages/coding-agent/src/cli/experimental/command.ts:164] [E: packages/coding-agent/src/cli/experimental/command.ts:165] [E: packages/coding-agent/src/cli/experimental/command.ts:169] [E: packages/coding-agent/src/cli/experimental/command.ts:173] [E: packages/coding-agent/src/cli/experimental/command.ts:177] [E: packages/coding-agent/src/cli/experimental/command.ts:180] [E: packages/coding-agent/src/cli/experimental/command.ts:185] [E: packages/coding-agent/src/cli/experimental/command.ts:190] [E: packages/coding-agent/src/cli/experimental/command.ts:192]。

## 三种 invocation

root `pi` 注册 `--listen`、`--auth-token`、`--auth-token-file`,再把未消费 argv 委托给现有 `parseArgs()`；因此它可以同时产生 experimental transport/auth 与 legacy `Args` [E: packages/coding-agent/src/cli/experimental/commands/pi.ts:13] [E: packages/coding-agent/src/cli/experimental/commands/pi.ts:17] [E: packages/coding-agent/src/cli/experimental/commands/pi.ts:24] [E: packages/coding-agent/src/cli/experimental/commands/pi.ts:26] [E: packages/coding-agent/src/cli/experimental/commands/pi.ts:33] [E: packages/coding-agent/src/cli/experimental/command-options.ts:25] [E: packages/coding-agent/src/cli/experimental/command-options.ts:31]。如果 legacy parser 把 `--connect` 收进 unknown flags，root command 会给出“只对 client mode 有效”的 error [E: packages/coding-agent/src/cli/experimental/commands/pi.ts:35]。

`server` 只注册 `--listen` 与 auth options；`client` 只注册 `--connect` 与 auth options。两者目前只要还有 legacy argv 就返回“不支持 existing CLI options yet”，所以它们还不是普通 `parseArgs()` surface 的别名 [E: packages/coding-agent/src/cli/experimental/commands/server.ts:13] [E: packages/coding-agent/src/cli/experimental/commands/server.ts:25] [E: packages/coding-agent/src/cli/experimental/commands/server.ts:33] [E: packages/coding-agent/src/cli/experimental/commands/client.ts:13] [E: packages/coding-agent/src/cli/experimental/commands/client.ts:25] [E: packages/coding-agent/src/cli/experimental/commands/client.ts:33] [E: packages/coding-agent/src/cli/experimental/command-options.ts:35] [E: packages/coding-agent/src/cli/experimental/command-options.ts:37]。

auth 可以来自 literal token 或 token file path，两者互斥；parser 不读取文件，也不验证 token 内容，只产出 tagged `AuthInput` [E: packages/coding-agent/src/cli/experimental/auth.ts:1] [E: packages/coding-agent/src/cli/experimental/auth.ts:3] [E: packages/coding-agent/src/cli/experimental/auth.ts:10] [E: packages/coding-agent/src/cli/experimental/auth.ts:12] [E: packages/coding-agent/src/cli/experimental/auth.ts:14] [E: packages/coding-agent/src/cli/experimental/auth.ts:18]。

## Transport address 约束

当前 `TransportAddress` union 只有 `{ transport: "unix", path }` [E: packages/coding-agent/src/cli/experimental/transport-address.ts:3] [E: packages/coding-agent/src/cli/experimental/transport-address.ts:8]。`parseTransportAddress()` 要求 `unix:` protocol、无 authority、canonical `unix:///` 开头、不能是四斜线、不能含 query/fragment，并要求 percent-decoded path 无 NUL 且为 POSIX absolute path [E: packages/coding-agent/src/cli/experimental/transport-address.ts:10] [E: packages/coding-agent/src/cli/experimental/transport-address.ts:20] [E: packages/coding-agent/src/cli/experimental/transport-address.ts:23] [E: packages/coding-agent/src/cli/experimental/transport-address.ts:27] [E: packages/coding-agent/src/cli/experimental/transport-address.ts:31] [E: packages/coding-agent/src/cli/experimental/transport-address.ts:35] [E: packages/coding-agent/src/cli/experimental/transport-address.ts:41] [E: packages/coding-agent/src/cli/experimental/transport-address.ts:44] [E: packages/coding-agent/src/cli/experimental/transport-address.ts:47]。

类型上 root/server 的 `listen` 是 array,但 generic parser 当前拒绝同一 option 重复，因此一次 invocation 实际最多接受一个 `--listen` [E: packages/coding-agent/src/cli/experimental/commands/pi.ts:17] [E: packages/coding-agent/src/cli/experimental/commands/server.ts:16] [E: packages/coding-agent/src/cli/experimental/command.ts:190] [E: packages/coding-agent/src/cli/experimental/command.ts:192] [I]。

## 当前 reachability 边界

发布 CLI entrypoint 直接调用 `main(process.argv.slice(2))`,而 package exports 只有主入口、`./rpc-entry` 与 `./client`;experimental module 没有 public export [E: packages/coding-agent/src/cli.ts:10] [E: packages/coding-agent/src/cli.ts:21] [E: packages/coding-agent/package.json:14] [E: packages/coding-agent/package.json:19] [E: packages/coding-agent/package.json:22] [I]。因此 `--listen`、`--connect`、`--auth-token`、`--auth-token-file` 和 `server/client` 在本 target 上是 structural experimental surface，不应计入 `ref.coding-agent.cli-flags` 的 active `parseArgs()` catalog；实际接线计划与稳定性尚未由源码声明 [U]。

## Sources

- packages/coding-agent/src/cli/experimental/cli.ts
- packages/coding-agent/src/cli/experimental/command.ts
- packages/coding-agent/src/cli/experimental/command-options.ts
- packages/coding-agent/src/cli/experimental/auth.ts
- packages/coding-agent/src/cli/experimental/transport-address.ts
- packages/coding-agent/src/cli/experimental/commands/pi.ts
- packages/coding-agent/src/cli/experimental/commands/server.ts
- packages/coding-agent/src/cli/experimental/commands/client.ts

## 相关

- [surface.cli.overview](../../surface/cli/overview.md): 当前已接线的发布 CLI 与 `parseArgs()` surface。
- [ref.coding-agent.cli-flags](../../reference/cli-flags.md): 当前 active global parser token catalog。
- [surface.sdk.remote-session](../../surface/sdk/remote-session.md): 已发布的 remote session client facade。
