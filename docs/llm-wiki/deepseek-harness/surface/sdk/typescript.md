---
id: surface.sdk.typescript
title: TypeScript JSON-RPC SDK
kind: surface
tier: T1
pkg: integration
source:
  - packages/sdk/client/src/index.ts
  - packages/sdk/client/src/client.ts
  - packages/sdk/client/src/api.ts
  - packages/sdk/client/src/dispose.ts
  - packages/sdk/client/src/launch.ts
  - packages/sdk/client/src/types.ts
  - packages/sdk/client/package.json
  - packages/sdk/client/tests/dispose.spec.ts
  - packages/sdk/protocol/src/index.ts
  - packages/sdk/protocol/src/types.ts
  - packages/sdk/protocol/src/transport.ts
  - packages/sdk/protocol/package.json
  - packages/sdk/server/src/index.ts
  - packages/sdk/server/src/server.ts
  - packages/sdk/server/package.json
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/sdk-app/src/index.ts
  - packages/bundle/sdk-app/package.json
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/sdk-minimal/package.json
  - packages/boot/app-boot/src/profile.ts
  - packages/bundle/base/package.json
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/tests/shipped-root.spec.ts
  - python/sdk/src/deepseek_harness/client.py
  - packages/acp/acp/src/index.ts
  - apps/cli/src/args.ts
symbols:
  - HarnessClient
  - DeepSeekHarness
  - JsonRpcLineTransport
  - resolveDshLaunch
related:
  - surface.sdk.python
  - surface.acp.server
  - subsys.integration.sdk-client
  - subsys.integration.sdk-protocol
  - subsys.integration.sdk-server
evidence: explicit
status: verified
updated: d347e70390
---

> `@deepseek-ai/dsh-sdk-client` 是 **进程外** TypeScript JSON-RPC 客户端：`HarnessClient` 用 `node:child_process.spawn` 拉一份同版本 `dsh --profile sdk`（或调用方指定的 profile），在孩子 stdio 上讲 `@deepseek-ai/dsh-sdk-protocol`。它不是 `dsh web` 的 GUI 面，也不进 `dsh-base` / shipped agent preset。

## 能回答的问题

- 外部 TS 程序怎么连 DSH？`new DeepSeekHarness` 要不要自己准备 runtime 可执行文件？
- 这条面是不是 `dsh web`？`dsh-base` / shipped preset 会不会挂 `sdk-jsonrpc-server`？`dsh --profile sdk|sdk-minimal` 呢？
- 客户端发哪三个请求？服务端推哪四个通知？有没有 ACP 的 `session/new` / `session/cancel`？
- `close()` 的拆卸阶梯是什么？Windows 少哪一档？
- 和 [`surface.sdk.python`](python.md) 是不是同一份 protocol？实现共享吗？

## 是什么

DSH 主线是 `profile → bundle → agent preset`。`PROFILE_TEMPLATES` 有五个 shipped 名：`acp`、`web`（唯一 `live`）、`headless`、`sdk`（`dsh-base` + `dsh-sdk-app`）、`sdk-minimal`（只叠 `@deepseek-ai/dsh-sdk-minimal`）。没有 shipped TUI 模板。[E: packages/boot/app-boot/src/profile.ts:137] [E: packages/boot/app-boot/src/profile.ts:150] [E: packages/boot/app-boot/src/profile.ts:154] 启动器只有 `dsh web` 这一个硬编码 profile 别名；`sdk` / `sdk-minimal` / `acp` / `headless` 走 `dsh --profile <name>`。[E: apps/cli/src/args.ts:156] [E: apps/cli/src/args.ts:168] [E: apps/cli/src/args.ts:140]

本面是 **automation stdio** 缝。调用方 import `@deepseek-ai/dsh-sdk-client`，默认 spawn 同版本 `@deepseek-ai/dsh` 的 CLI，孩子 boot 后挂 `@deepseek-ai/dsh-sdk-jsonrpc-server`，两边用 NDJSON JSON-RPC 说话。[E: packages/sdk/client/package.json:2] [E: packages/sdk/server/package.json:2] [E: packages/sdk/protocol/package.json:2] [E: packages/sdk/client/src/launch.ts:132]

三件套各管一层：

| 包 | 角色 |
|---|---|
| `@deepseek-ai/dsh-sdk-client` | 进程外库。主入口再导出 `DeepSeekHarness` / `HarnessSession`、`HarnessClient` 与三类错误，以及协议包的 `JsonRpcResponseError`。[E: packages/sdk/client/src/index.ts:12] [E: packages/sdk/client/src/index.ts:15] [E: packages/sdk/client/src/index.ts:21] **没有** `apply` / `inject`，不登记任何 `ctx.*`。 |
| `@deepseek-ai/dsh-sdk-protocol` | wire 形状 + `JsonRpcLineTransport`。主入口只 re-export transport 与 `HarnessSdkRequestMap` 一系类型。[E: packages/sdk/protocol/src/index.ts:11] [E: packages/sdk/protocol/src/index.ts:14] |
| `@deepseek-ai/dsh-sdk-jsonrpc-server` | **孩子进程里** 的 named 插件：`name = 'sdk-jsonrpc-server'`，`inject = ['agents']`。[E: packages/sdk/server/src/index.ts:20] [E: packages/sdk/server/src/index.ts:22] |

`HarnessClient` 用 `node:child_process.spawn` 拉孩子，stdio 三根都是 `pipe`，**不**走 `ctx.subprocess`。[E: packages/sdk/client/src/client.ts:214] [E: packages/sdk/client/src/client.ts:217] 高层包装是 `DeepSeekHarness`：记一份 launch spec，懒 `start` + 一次 `initialize`；`HarnessSession.run` 等到本 session 的 inbox 回执后再等到 `session.status === 'idle'`。[E: packages/sdk/client/src/api.ts:69] [E: packages/sdk/client/src/api.ts:73] [E: packages/sdk/client/src/api.ts:207] [E: packages/sdk/client/src/api.ts:212]

它**不是**：

| 容易混的实体 | 实际是什么 |
|---|---|
| `dsh web` / `dsh --profile web` | 默认 GUI 产品。本库不在 `dsh-web-app` 树里。 |
| `dsh --profile sdk` / `sdk-minimal` | 孩子侧 **stdio 宿主**。客户端 spawn 的就是这条 profile。 |
| ACP stdio server | 另一套 JSON-RPC（`authenticate` / `session/new` / `session/prompt` / `session/resume`）。见 [`surface.acp.server`](../acp/server.md)。 |
| Python `HarnessClient` | 同一份方法表，**实现不共享**。见 [`surface.sdk.python`](python.md)。 |
| `dsh-subagent-dsh-sdk` | 父 harness 里的 overlay Provider，内部 `new DeepSeekHarness`。本页写外部调用方。 |

## 入口

外部程序碰到这条面的方式：

| 入口 | 行为 |
|---|---|
| `new DeepSeekHarness({ cwd?, provider?, model?, profile?, dshBin?, patches?, … })` | 高层 API。构造期还不 spawn；第一次 `start` / `run` 才拉孩子并握手。[E: packages/sdk/client/src/api.ts:34] [E: packages/sdk/client/src/api.ts:69] |
| `harness.run(input)` / `harness.session(id?).run(input)` | 发 `session/prompt`，丢掉 inbox 回执之前的通知，收到本 session `session.status === 'idle'` 后返回 `RunResult`。[E: packages/sdk/client/src/api.ts:199] [E: packages/sdk/client/src/api.ts:207] [E: packages/sdk/client/src/api.ts:212] |
| `new HarnessClient(options?)` | 低层。构造只收 options 并 `resolveDshLaunch`；`start()` 才 `spawn`。[E: packages/sdk/client/src/client.ts:201] [E: packages/sdk/client/src/client.ts:204] [E: packages/sdk/client/src/client.ts:211] |
| 孩子可执行文件 | 默认 `command = process.execPath`，argv 是同版本 `dsh` bin（或源码 `src/bin.ts` + tsx）+ `--profile` + 可选 `--patch`。[E: packages/sdk/client/src/launch.ts:142] [E: packages/sdk/client/src/launch.ts:143] `dshBin` 省略则 `installedDshNodeLaunch()`，并核对 `@deepseek-ai/dsh` 与本包 **version 相同**。[E: packages/sdk/client/src/launch.ts:133] [E: packages/sdk/client/src/launch.ts:58] |
| 孩子组合 | 默认 profile 名 `'sdk'`。[E: packages/sdk/client/src/launch.ts:132] shipped `sdk` 叠 `dsh-base` + `dsh-sdk-app`；`sdk-minimal` 只叠 `dsh-sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:151] [E: packages/boot/app-boot/src/profile.ts:155] 两份 bundle 都 `insert` `id: sdk-jsonrpc-server`。[E: packages/bundle/sdk-app/cordis.patch.yml:17] [E: packages/bundle/sdk-minimal/cordis.patch.yml:11] `dsh-sdk-app` 的 CLI 帮助名是 `dsh --profile ${profile}`，零额外旗标，解析成功后 `ctx.provide(SDK_APP_STARTUP_SERVICE, …)`（常量 `'sdkAppStartup'`）。[E: packages/bundle/sdk-app/src/index.ts:20] [E: packages/bundle/sdk-app/src/index.ts:40] [E: packages/bundle/sdk-app/src/index.ts:59] |

`dsh web` / `dsh --profile web` / `dsh --profile headless` / `dsh --profile acp` **不会**作为本客户端的默认孩子。`@deepseek-ai/dsh-base` 包名是 `@deepseek-ai/dsh-base`，其 `package.json` **没有** `@deepseek-ai/dsh-sdk-client` / `@deepseek-ai/dsh-sdk-jsonrpc-server` 依赖。[E: packages/bundle/base/package.json:2] 四个 shipped preset 目录名是 `minimal` / `standard` / `ptc` / `cordis`：`SHIPPED_PRESET_ROOT` 指向包内 `presets/`；测试枚举 tool-bearing 三件为 `cordis` / `ptc` / `standard`（另加 `minimal` 目录）。preset 树里没有 `sdk-jsonrpc-server` 行。[E: packages/preset/agent-presets/src/discovery.ts:60] [E: packages/preset/agent-presets/tests/shipped-root.spec.ts:100]

孩子 stdout 专给协议帧。`JsonRpcLineTransport` 写出时末尾 `\n`。[E: packages/sdk/protocol/src/transport.ts:261] 同树再挂 stdout logger 会把日志和 NDJSON 搅在一起。

## 关键字段

### 调用方怎么启动

| 字段 | 要点 |
|---|---|
| `HarnessClientOptions.dshBin` | 可选。省略则解析本包依赖的同版本 `dsh`。[E: packages/sdk/client/src/types.ts:26] [E: packages/sdk/client/src/launch.ts:133] |
| `profile` | 默认 `'sdk'`。写进孩子 argv 的 `--profile`。[E: packages/sdk/client/src/types.ts:28] [E: packages/sdk/client/src/launch.ts:132] |
| `patches` | 相对路径在 spawn 前 `resolve`；插在内部 source-compat patch 之后，每个变成 `--patch`。[E: packages/sdk/client/src/launch.ts:136] [E: packages/sdk/client/src/launch.ts:143] |
| `dshHome` / `processCwd` | 孩子 `DSH_HOME` 与进程 cwd；相对路径先按调用方 cwd 解析。[E: packages/sdk/client/src/launch.ts:140] [E: packages/sdk/client/src/launch.ts:144] |
| `env` | `undefined` 则 `start()` 时读父 `process.env`；传入对象则**整表替换**（本库不 scrub），再叠 source-launch 的 `TSX_TSCONFIG_PATH` 与可选 `DSH_HOME`。[E: packages/sdk/client/src/client.ts:216] [E: packages/sdk/client/src/launch.ts:145] |
| `initializeTimeoutMs` | 握手专用；默认 `10000`。[E: packages/sdk/client/src/launch.ts:12] [E: packages/sdk/client/src/launch.ts:151] |
| `requestTimeoutMs` | `timeout === undefined` 时直接 `transport.request`，本侧无限等。超时只 abort 本侧 pending，**不是** wire cancel。[E: packages/sdk/client/src/client.ts:322] [E: packages/sdk/protocol/src/transport.ts:132] |
| `shutdownTimeoutMs` / `disposeEofGraceMs` / `disposeGraceMs` | `close` 用。默认 `1000` / `6000` / `3000`。[E: packages/sdk/client/src/client.ts:398] [E: packages/sdk/client/src/client.ts:405] [E: packages/sdk/client/src/client.ts:406] |
| `DeepSeekHarness` 的 `provider` / `model` | 省略回落 `'deepseek-official'` / `'deepseek-v4-flash'`。[E: packages/sdk/client/src/api.ts:42] [E: packages/sdk/client/src/api.ts:43] |

`DeepSeekHarness.session(id?)` 只铸本地字符串（默认 `session-${uuid-without-dashes}`），第一次 `prompt` 才上线。[E: packages/sdk/client/src/api.ts:104]

### 协议身份（不是方法目录）

wire 合同在 `HarnessSdkRequestMap` / `HarnessSdkNotificationMap`。客户端→服务器恰好三个请求：`initialize` / `session/prompt` / `shutdown`。[E: packages/sdk/protocol/src/types.ts:116] [E: packages/sdk/protocol/src/types.ts:117] [E: packages/sdk/protocol/src/types.ts:118] 服务器→客户端恰好四个通知：`session.event` / `session.status` / `subagent.started` / `subagent.finished`。[E: packages/sdk/protocol/src/types.ts:108] [E: packages/sdk/protocol/src/types.ts:109] [E: packages/sdk/protocol/src/types.ts:110] [E: packages/sdk/protocol/src/types.ts:111]

`handleRequest` 的 `switch` 只认这三支；未知方法抛 `unknown DeepSeek Harness SDK runtime method: …`。[E: packages/sdk/server/src/server.ts:247] [E: packages/sdk/server/src/server.ts:255] 源里没有 `session/new` / `session/resume` / `authenticate` / `session/cancel`。

门控级语义（完整字段表在 [`ref.sdk-methods`](../../reference/sdk-methods.md) / [`subsys.integration.sdk-protocol`](../../subsystems/integration/sdk-protocol.md)）：

- `initialize`：记下此后 **新创建** session 的 `cwd` / `provider` / `model` / 可选 `maxTokens`。server 回 `{ serverInfo: { name: 'deepseek-harness-sdk-runtime', version: '0.0.1' } }`。[E: packages/sdk/server/src/server.ts:168] 本客户端只检查 `name` / `version` 是 string，不钉死字面量。[E: packages/sdk/client/src/client.ts:279]
- `session/prompt`：调用方自带 `sessionId`；未知 id 由 server `agents.create` 懒创建，立刻回 `{ messageId }`，不等 turn。[E: packages/sdk/server/src/server.ts:178] [E: packages/sdk/server/src/server.ts:192] [E: packages/sdk/server/src/server.ts:279]
- `shutdown`：协议停机。handler 回包之后 `setImmediate` 跑 `disposeAndExit`：`transport.flush` → `rootFiber.dispose()` → `exit(0)`。[E: packages/sdk/server/src/index.ts:69] [E: packages/sdk/server/src/index.ts:70] [E: packages/sdk/server/src/index.ts:71] [E: packages/sdk/server/src/index.ts:90]
- 完成态看后续 `session.status === 'idle'`，内容看 `session.event`。`messageId` 只是入队回执。

### 错误

| 类 | 何时 |
|---|---|
| `TransportClosedError` | 进程没了 / 已 `close` / spawn 失败。文案可带 exit code 与最多 400 行 stderr tail。[E: packages/sdk/client/src/client.ts:39] [E: packages/sdk/client/src/client.ts:29] |
| `RequestTimeoutError` | 本侧放弃等待。[E: packages/sdk/client/src/client.ts:48] |
| `SdkProtocolError` | `initialize` 回包缺 `serverInfo` 身份、`session/prompt` 缺 `messageId`，或 `session.event` 畸形。[E: packages/sdk/client/src/client.ts:280] [E: packages/sdk/client/src/client.ts:295] [E: packages/sdk/client/src/api.ts:189] |
| `JsonRpcResponseError` | 对端 error 帧（从 protocol 转出）。[E: packages/sdk/client/src/index.ts:21] |

## 装配与门控

**不进 `dsh-base` / shipped agent preset。** 换这条 automation 面 = 外部脚本 `new DeepSeekHarness()`（或显式 `profile: 'sdk-minimal'`），孩子由 shipped SDK bundle 挂 `id: sdk-jsonrpc-server`。不要在 `minimal` / `standard` / `ptc` / `cordis` 的 `agent.cordis.yml` 里找这行。

调用方会直接撞上的门：

1. **默认自带同版本 `dsh`，不是任意 command。** `dshBin` 省略时核对 workspace 版本并拼 `--profile`。[E: packages/sdk/client/src/launch.ts:58] [E: packages/sdk/client/src/launch.ts:132] Python 客户端同样默认 `profile: "sdk"` 并拼 `--profile`；bundled 路径走 `deepseek_harness_runtime.resolve_bundled_launch_args`，且 **必须**显式 `dsh_home` 或非空 `DSH_HOME`。[E: python/sdk/src/deepseek_harness/client.py:29] [E: python/sdk/src/deepseek_harness/client.py:461] [E: python/sdk/src/deepseek_harness/client.py:476] [E: python/sdk/src/deepseek_harness/client.py:486]
2. **孩子必须挂 `sdk-jsonrpc-server`。** `dsh-sdk-app` 与 `dsh-sdk-minimal` 都 insert 该行，且 `inject: [sdkAppStartup, loader]`。[E: packages/bundle/sdk-app/cordis.patch.yml:17] [E: packages/bundle/sdk-app/cordis.patch.yml:19] [E: packages/bundle/sdk-minimal/cordis.patch.yml:11] [E: packages/bundle/sdk-minimal/cordis.patch.yml:13]
3. **没有 ACP 会话 RPC。** 不要发 `session/new` / `session/resume` / `session/cancel`。session 身份是调用方字符串；放弃一轮的方式是 `close()` 整棵孩子。
4. **超时不是 cancel。** `RequestTimeoutError` 只让 `JsonRpcLineTransport.request` `pending.delete(id)`；server 侧那次 `session/prompt` 仍跑到 runtime 被拆。[E: packages/sdk/protocol/src/transport.ts:132] [E: packages/sdk/client/src/client.ts:329]
5. **`close` 拆卸阶梯。** 先尽力发协议 `shutdown`（失败只记诊断），再 `disposeRuntimeProcess`：`stdin.end()`（EOF）→ POSIX `SIGTERM` → `SIGKILL`。必须等到孩子真的 `exit`。[E: packages/sdk/client/src/client.ts:398] [E: packages/sdk/client/src/dispose.ts:90] [E: packages/sdk/client/src/dispose.ts:94] [E: packages/sdk/client/src/dispose.ts:98] `platform !== 'win32'` 才发 SIGTERM；Windows 上 Node 把 SIGTERM/SIGKILL 都映射成 `TerminateProcess`，单测 `platform: 'win32'` 时 `kills === ['SIGKILL']`。[E: packages/sdk/client/src/dispose.ts:93] [E: packages/sdk/client/tests/dispose.spec.ts:163]
6. **`HarnessClient.close` 永久。** 同一实例不能再 `start()`。[E: packages/sdk/client/src/client.ts:212] 握手失败时 `DeepSeekHarness` 会换成新的 `HarnessClient`（仅当 harness 自己还没 `close`）。[E: packages/sdk/client/src/api.ts:90] `await using DeepSeekHarness` 等于 `close()`。[E: packages/sdk/client/src/api.ts:131]
7. **`env: undefined` 会把父进程密钥原样带进孩子。** 隔离启动必须自己传表。
8. **stdout 独占。** 插件默认 `output` 是 `process.stdout`（与 NDJSON 共用这一根写出流）。[E: packages/sdk/server/src/index.ts:55] 孩子树再往 stdout 打 logger 会搅乱帧。[I]

## 跨包关系

- [`subsys.integration.sdk-protocol`](../../subsystems/integration/sdk-protocol.md)（`subsys.integration.sdk-protocol`）：三请求 / 四通知与 `JsonRpcLineTransport`。本页只写外部程序怎么连，不写分帧细节。
- [`subsys.integration.sdk-client`](../../subsystems/integration/sdk-client.md)（`subsys.integration.sdk-client`）：同一客户端的 T2 控制流 / 错误路径 / session 树裁剪。
- [`subsys.integration.sdk-server`](../../subsystems/integration/sdk-server.md)（`subsys.integration.sdk-server`）：孩子进程里的 `sdk-jsonrpc-server`；懒创建 session；`shutdown` 后 `exit(0)`。
- [`surface.sdk.python`](python.md)（`surface.sdk.python`）：Python `HarnessClient` 发同一组 `initialize` / `session/prompt` / `shutdown`，用 `subprocess.Popen` + 自写 NDJSON（`json.dumps(...) + "\\n"`），**不** import `JsonRpcLineTransport`。[E: python/sdk/src/deepseek_harness/client.py:80] [E: python/sdk/src/deepseek_harness/client.py:153] [E: python/sdk/src/deepseek_harness/client.py:182] [E: python/sdk/src/deepseek_harness/client.py:337] 拆卸是 stdin close → `terminate` → `kill`，不是本库那份 `disposeRuntimeProcess`。[E: python/sdk/src/deepseek_harness/client.py:107] [E: python/sdk/src/deepseek_harness/client.py:117] [E: python/sdk/src/deepseek_harness/client.py:124]
- [`surface.acp.server`](../acp/server.md)（`surface.acp.server`）：ACP Agent 侧。handler 含 `initialize` / `authenticate` / `session/new` / `session/prompt` / `session/resume`；`newSession` 铸造 `SessionId(randomUUID())`。[E: packages/acp/acp/src/index.ts:192] [E: packages/acp/acp/src/index.ts:196] [E: packages/acp/acp/src/index.ts:199] [E: packages/acp/acp/src/index.ts:378] [E: packages/acp/acp/src/index.ts:384] [E: packages/acp/acp/src/index.ts:388] 不要和本面的 `session/prompt` + 懒创建混成一张方法表。

## Sources

- packages/sdk/client/src/index.ts
- packages/sdk/client/src/client.ts
- packages/sdk/client/src/api.ts
- packages/sdk/client/src/dispose.ts
- packages/sdk/client/src/launch.ts
- packages/sdk/client/src/types.ts
- packages/sdk/client/package.json
- packages/sdk/client/tests/dispose.spec.ts
- packages/sdk/protocol/src/index.ts
- packages/sdk/protocol/src/types.ts
- packages/sdk/protocol/src/transport.ts
- packages/sdk/protocol/package.json
- packages/sdk/server/src/index.ts
- packages/sdk/server/src/server.ts
- packages/sdk/server/package.json
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/sdk-app/src/index.ts
- packages/bundle/sdk-app/package.json
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/bundle/sdk-minimal/package.json
- packages/boot/app-boot/src/profile.ts
- packages/bundle/base/package.json
- packages/preset/agent-presets/src/discovery.ts
- packages/preset/agent-presets/tests/shipped-root.spec.ts
- python/sdk/src/deepseek_harness/client.py
- packages/acp/acp/src/index.ts
- apps/cli/src/args.ts

## 相关

- [surface.sdk.python](python.md)（`surface.sdk.python`）：同一 protocol 的 Python 客户端；实现不共享。
- [surface.acp.server](../acp/server.md)（`surface.acp.server`）：另一条 automation JSON-RPC（ACP）。
- [subsys.integration.sdk-client](../../subsystems/integration/sdk-client.md)（`subsys.integration.sdk-client`）：TS 客户端 T2。
- [subsys.integration.sdk-protocol](../../subsystems/integration/sdk-protocol.md)（`subsys.integration.sdk-protocol`）：wire 合同 T2。
- [subsys.integration.sdk-server](../../subsystems/integration/sdk-server.md)（`subsys.integration.sdk-server`）：孩子进程 server 插件 T2。
