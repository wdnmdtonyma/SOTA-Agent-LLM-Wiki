---
id: tui.runtime-hosting
title: V1 TUI Runtime Hosting
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/cli/cmd/tui.ts, packages/opencode/src/cli/tui/worker.ts, packages/opencode/src/plugin/tui/runtime.ts, packages/cli/package.json]
symbols: [TuiThreadCommand, createWorkerFetch, createEventSource, rpc, createLegacyTuiPluginHost]
related: [tui.architecture, tui.feature-plugins, tui.sync-store]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V1 runtime hosting 是 `packages/opencode/src/cli/cmd/tui.ts` 的 `$0 [project]` command：它 spawn worker 托管 in-process V1 server，通过 RPC fetch/event bridge 给 `@opencode-ai/tui`，并注入 legacy plugin host。

## 能回答的问题

- V1 yargs CLI 如何启动新的 `@opencode-ai/tui` package？
- worker 内的 server 是如何通过 RPC fetch 暴露给 TUI SDK client？
- external network mode 与 internal `opencode.internal` mode 如何切换？
- legacy TUI plugin runtime 如何被 host 注入？
- 为什么这不是 V2 core server，也不是 Hono？

## 命名与版本边界

`TuiThreadCommand` 的 command 是 `$0 [project]`，describe 为 “start opencode tui”，这是 V1 `packages/opencode/src/cli` yargs host 的默认 TUI command。[E: packages/opencode/src/cli/cmd/tui.ts:71] [E: packages/opencode/src/cli/cmd/tui.ts:72] [E: packages/opencode/src/cli/cmd/tui.ts:73] 它导入 `@opencode-ai/tui` 的 run wrapper 时通过 `../tui/layer`，该 wrapper 给 TUI `run(input)` 提供 `Global.defaultLayer`。[E: packages/opencode/src/cli/cmd/tui.ts:188] [E: packages/opencode/src/cli/tui/layer.ts:1] [E: packages/opencode/src/cli/tui/layer.ts:6]

这一节点 `v: v1`：host 在 `packages/opencode` 中，worker 使用 V1 server/runtime/config/plugin modules；`@opencode-ai/tui` package 在这里由 V1 host 调用并作为 UI/presentation package 运行。[E: packages/opencode/src/cli/tui/worker.ts:1] [E: packages/opencode/src/cli/tui/worker.ts:2] [E: packages/opencode/src/plugin/tui/runtime.ts:16] [E: packages/opencode/src/plugin/tui/runtime.ts:28] [E: packages/opencode/src/cli/cmd/tui.ts:188] [I]

## CLI command 输入

Builder 支持 positional `project`，以及 `--model/-m`、`--continue/-c`、`--session/-s`、`--fork`、`--prompt`、`--agent`；network options 由 `withNetworkOptions(yargs)` 注入。[E: packages/opencode/src/cli/cmd/tui.ts:75] [E: packages/opencode/src/cli/cmd/tui.ts:76] [E: packages/opencode/src/cli/cmd/tui.ts:80] [E: packages/opencode/src/cli/cmd/tui.ts:82] [E: packages/opencode/src/cli/cmd/tui.ts:85] [E: packages/opencode/src/cli/cmd/tui.ts:86] [E: packages/opencode/src/cli/cmd/tui.ts:90] [E: packages/opencode/src/cli/cmd/tui.ts:91] [E: packages/opencode/src/cli/cmd/tui.ts:95] [E: packages/opencode/src/cli/cmd/tui.ts:99] [E: packages/opencode/src/cli/cmd/tui.ts:103]

`--fork` 必须与 `--continue` 或 `--session` 同用，否则打印 error 并设置 exitCode。[E: packages/opencode/src/cli/cmd/tui.ts:111] [E: packages/opencode/src/cli/cmd/tui.ts:112] [E: packages/opencode/src/cli/cmd/tui.ts:113] prompt input 会合并 piped stdin 和 `--prompt`：stdin 非 TTY 时读取 Bun.stdin.text，二者都存在时用换行拼接。[E: packages/opencode/src/cli/cmd/tui.ts:58] [E: packages/opencode/src/cli/cmd/tui.ts:59] [E: packages/opencode/src/cli/cmd/tui.ts:62] [E: packages/opencode/src/cli/cmd/tui.ts:145]

`resolveThreadDirectory(project)` 从 env PWD/cwd 解析 project，handler 会 `process.chdir(next)`，随后把 real cwd 作为 `directory` 传给 worker transport 与 TUI run；这使 thread 与 worker 共享 directory key 是基于这组调用面的推断。[E: packages/opencode/src/cli/cmd/tui.ts:65] [E: packages/opencode/src/cli/cmd/tui.ts:67] [E: packages/opencode/src/cli/cmd/tui.ts:119] [E: packages/opencode/src/cli/cmd/tui.ts:122] [E: packages/opencode/src/cli/cmd/tui.ts:127] [E: packages/opencode/src/cli/cmd/tui.ts:149] [E: packages/opencode/src/cli/cmd/tui.ts:200] [I]

## Worker 与 transport

handler 解析 worker target：优先 `OPENCODE_WORKER_PATH`，然后 dist `./cli/tui/worker.js`，最后 TS source `../tui/worker.ts`。[E: packages/opencode/src/cli/cmd/tui.ts:52] [E: packages/opencode/src/cli/cmd/tui.ts:53] [E: packages/opencode/src/cli/cmd/tui.ts:55] 它 new Worker(file)，用 `Rpc.client(worker)` 建 RPC client，并在 SIGUSR2 时调用 worker `reload`。[E: packages/opencode/src/cli/cmd/tui.ts:129] [E: packages/opencode/src/cli/cmd/tui.ts:130] [E: packages/opencode/src/cli/cmd/tui.ts:132] [E: packages/opencode/src/cli/cmd/tui.ts:134]

internal transport 使用 URL `http://opencode.internal`，fetch 是 `createWorkerFetch(client)`，events 是 `createEventSource(client)`；external transport 在传了 port/hostname/mdns 或 network 非默认时调用 worker `server(network)` 并返回真实 URL。[E: packages/opencode/src/cli/cmd/tui.ts:149] [E: packages/opencode/src/cli/cmd/tui.ts:150] [E: packages/opencode/src/cli/cmd/tui.ts:151] [E: packages/opencode/src/cli/cmd/tui.ts:152] [E: packages/opencode/src/cli/cmd/tui.ts:153] [E: packages/opencode/src/cli/cmd/tui.ts:154] [E: packages/opencode/src/cli/cmd/tui.ts:155] [E: packages/opencode/src/cli/cmd/tui.ts:159] [E: packages/opencode/src/cli/cmd/tui.ts:164] [E: packages/opencode/src/cli/cmd/tui.ts:165] [E: packages/opencode/src/cli/cmd/tui.ts:166]

`createWorkerFetch()` 把 fetch Request 转成 RPC `client.call("fetch", { url, method, headers, body })`，再把 RPC result 包装回 Response。[E: packages/opencode/src/cli/cmd/tui.ts:25] [E: packages/opencode/src/cli/cmd/tui.ts:27] [E: packages/opencode/src/cli/cmd/tui.ts:28] [E: packages/opencode/src/cli/cmd/tui.ts:29] [E: packages/opencode/src/cli/cmd/tui.ts:30] [E: packages/opencode/src/cli/cmd/tui.ts:31] [E: packages/opencode/src/cli/cmd/tui.ts:33] `createEventSource()` 把 worker `global.event` RPC event 转成 TUI `EventSource.subscribe(handler)`。[E: packages/opencode/src/cli/cmd/tui.ts:43] [E: packages/opencode/src/cli/cmd/tui.ts:44] [E: packages/opencode/src/cli/cmd/tui.ts:45]

Worker 侧用 `GlobalBus.on("event")` 把 global events `Rpc.emit("global.event", event)`；`rpc.fetch()` 补 Authorization header 后调用 `Server.Default().app.fetch(request)`，这条路径说明这里是 server app 的 fetch surface；“不是 Hono app”是基于本节点 source 未出现 Hono 调用的源码审计结论。[E: packages/opencode/src/cli/tui/worker.ts:17] [E: packages/opencode/src/cli/tui/worker.ts:18] [E: packages/opencode/src/cli/tui/worker.ts:24] [E: packages/opencode/src/cli/tui/worker.ts:27] [E: packages/opencode/src/cli/tui/worker.ts:28] [E: packages/opencode/src/cli/tui/worker.ts:35] [I]

worker `server(input)` 会停止已有 server 后调用 `Server.listen(input)` 并返回 server.url；`reload()` invalidate Config 并 dispose all instances emitting global disposed；`shutdown()` dispose instances 并 stop server。[E: packages/opencode/src/cli/tui/worker.ts:48] [E: packages/opencode/src/cli/tui/worker.ts:49] [E: packages/opencode/src/cli/tui/worker.ts:50] [E: packages/opencode/src/cli/tui/worker.ts:56] [E: packages/opencode/src/cli/tui/worker.ts:60] [E: packages/opencode/src/cli/tui/worker.ts:61] [E: packages/opencode/src/cli/tui/worker.ts:66] [E: packages/opencode/src/cli/tui/worker.ts:67]

## Session validation 与 TUI run

如果传入 `--session`，host 会在启动 TUI 前调用 `validateSession({ url, sessionID, directory, fetch })`；validateSession 先用 V1 `SessionID` schema decode，再用 generated SDK `session.get(..., { throwOnError: true })` 验证存在性。[E: packages/opencode/src/cli/cmd/tui.ts:170] [E: packages/opencode/src/cli/cmd/tui.ts:171] [E: packages/opencode/src/cli/cmd/tui.ts:172] [E: packages/opencode/src/cli/cmd/tui.ts:173] [E: packages/opencode/src/cli/cmd/tui.ts:174] [E: packages/opencode/src/cli/tui/validate-session.ts:1] [E: packages/opencode/src/cli/tui/validate-session.ts:2] [E: packages/opencode/src/cli/tui/validate-session.ts:5] [E: packages/opencode/src/cli/tui/validate-session.ts:14] [E: packages/opencode/src/cli/tui/validate-session.ts:18] [E: packages/opencode/src/cli/tui/validate-session.ts:23] [E: packages/opencode/src/cli/tui/validate-session.ts:28]

最终 host 调 `run({ url, onSnapshot, config, pluginHost, directory, fetch, events, args })`；args 把 continue/sessionID/agent/model/prompt/fork 透传给 TUI package。[E: packages/opencode/src/cli/cmd/tui.ts:190] [E: packages/opencode/src/cli/cmd/tui.ts:191] [E: packages/opencode/src/cli/cmd/tui.ts:192] [E: packages/opencode/src/cli/cmd/tui.ts:198] [E: packages/opencode/src/cli/cmd/tui.ts:199] [E: packages/opencode/src/cli/cmd/tui.ts:200] [E: packages/opencode/src/cli/cmd/tui.ts:201] [E: packages/opencode/src/cli/cmd/tui.ts:202] [E: packages/opencode/src/cli/cmd/tui.ts:203] [E: packages/opencode/src/cli/cmd/tui.ts:204] [E: packages/opencode/src/cli/cmd/tui.ts:205] [E: packages/opencode/src/cli/cmd/tui.ts:206] [E: packages/opencode/src/cli/cmd/tui.ts:207] [E: packages/opencode/src/cli/cmd/tui.ts:208] [E: packages/opencode/src/cli/cmd/tui.ts:209] finally 总是 stop worker，最后 unguard Windows ctrl-c guard 并 `process.exit(0)`。[E: packages/opencode/src/cli/cmd/tui.ts:214] [E: packages/opencode/src/cli/cmd/tui.ts:218] [E: packages/opencode/src/cli/cmd/tui.ts:221]

## Legacy plugin host

Host 注入 `createLegacyTuiPluginHost()`，其 `start` 是 plugin runtime `init`，`dispose` 是 runtime `dispose`。[E: packages/opencode/src/cli/cmd/tui.ts:189] [E: packages/opencode/src/cli/cmd/tui.ts:199] [E: packages/opencode/src/plugin/tui/runtime.ts:1125] [E: packages/opencode/src/plugin/tui/runtime.ts:1126]

`init()` 要求同一 process cwd 不变，否则重复 init 会抛 “different working directory”；它调用 `load({ ...input, runtime: input.runtime ?? createPluginRuntime() })`。[E: packages/opencode/src/plugin/tui/runtime.ts:987] [E: packages/opencode/src/plugin/tui/runtime.ts:994] [E: packages/opencode/src/plugin/tui/runtime.ts:996] [E: packages/opencode/src/plugin/tui/runtime.ts:997] [E: packages/opencode/src/plugin/tui/runtime.ts:1003] `load()` 先 `runtime.setupSlots(api)`，再把 activate/deactivate/add/install commands 和 status 写入 TUI runtime view。[E: packages/opencode/src/plugin/tui/runtime.ts:1059] [E: packages/opencode/src/plugin/tui/runtime.ts:1072] [E: packages/opencode/src/plugin/tui/runtime.ts:1075] [E: packages/opencode/src/plugin/tui/runtime.ts:1076] [E: packages/opencode/src/plugin/tui/runtime.ts:1077] [E: packages/opencode/src/plugin/tui/runtime.ts:1079]

Plugin loading 顺序是 internal plugins、external plugins、apply enabled state、逐个 sequential activate；顺序稳定性与 precedence 后果来自 sequential activate loop 与 command/route/hook 注册语境的推断。[E: packages/opencode/src/plugin/tui/runtime.ts:1092] [E: packages/opencode/src/plugin/tui/runtime.ts:1105] [E: packages/opencode/src/plugin/tui/runtime.ts:1106] [E: packages/opencode/src/plugin/tui/runtime.ts:1108] [E: packages/opencode/src/plugin/tui/runtime.ts:1109] [E: packages/opencode/src/plugin/tui/runtime.ts:1115] [I]

## 设计动机与权衡

`specs/tui-package.md` 的 Section 8/9/10 要求 canonical app root 在 `@opencode-ai/tui`，legacy CLI 只保留 command/worker/config/plugin-loader/process/editor/audio/event adapters；当前 host 正是把 server startup、transport、config、plugin runtime 留在 `packages/opencode`，把 UI 交给 `@opencode-ai/tui` run。[E: specs/tui-package.md:432] [E: specs/tui-package.md:435] [E: specs/tui-package.md:436] [E: specs/tui-package.md:487] [E: specs/tui-package.md:488] [E: specs/tui-package.md:529] [E: specs/tui-package.md:530] [E: packages/opencode/src/cli/cmd/tui.ts:188] [E: packages/opencode/src/cli/cmd/tui.ts:190] [E: packages/opencode/src/cli/cmd/tui.ts:199] [E: packages/opencode/src/cli/cmd/tui.ts:200] [E: packages/opencode/src/cli/cmd/tui.ts:201] [E: packages/opencode/src/cli/cmd/tui.ts:202] [I]

## Gotcha

- 两个 HTTP server 命名陷阱：本节点 worker fetch 使用 `Server.Default().app.fetch`，external mode 使用 `Server.listen`；不要把它写成 Hono。[E: packages/opencode/src/cli/tui/worker.ts:35] [E: packages/opencode/src/cli/tui/worker.ts:49] [I]
- 这条 TUI host 路径的 event bridge 使用 `GlobalBus.on("event")` 转发 event；不要把它写成旧 V1 Bus service。[E: packages/opencode/src/cli/tui/worker.ts:6] [E: packages/opencode/src/cli/tui/worker.ts:17] [I]
- `packages/cli` 的 lildax 新 CLI host 与这里的 `packages/opencode/src/cli` yargs host 并存；本节点正文主要覆盖 V1 yargs host。[E: packages/cli/package.json:3] [E: packages/cli/package.json:8] [E: packages/cli/package.json:23] [E: packages/opencode/src/cli/cmd/tui.ts:71] [I]

## Sources

- `packages/opencode/src/cli/cmd/tui.ts`
- `packages/opencode/src/cli/tui/worker.ts`
- `packages/opencode/src/cli/tui/layer.ts`
- `packages/opencode/src/cli/tui/validate-session.ts`
- `packages/opencode/src/plugin/tui/runtime.ts`
- `packages/cli/package.json`
- `specs/tui-package.md`

## 相关

- `tui.architecture`：`@opencode-ai/tui` package root 和 provider stack。
- `tui.feature-plugins`：TUI-side plugin presentation runtime。
- `tui.sync-store`：TUI SDKProvider 如何消费 fetch/events。
