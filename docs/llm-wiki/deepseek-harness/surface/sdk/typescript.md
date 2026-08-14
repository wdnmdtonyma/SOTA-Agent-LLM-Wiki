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
  - packages/sdk/client/src/types.ts
  - packages/sdk/client/package.json
  - packages/sdk/client/tests/sdk-client.spec.ts
  - packages/sdk/client/tests/dispose.spec.ts
  - packages/sdk/protocol/src/index.ts
  - packages/sdk/protocol/src/types.ts
  - packages/sdk/protocol/src/transport.ts
  - packages/sdk/protocol/package.json
  - packages/sdk/server/src/index.ts
  - packages/sdk/server/src/server.ts
  - packages/sdk/server/package.json
  - packages/examples/jsonrpc-demo/package.json
  - packages/examples/jsonrpc-demo/src/runner.ts
  - examples/jsonrpc-agent/cordis.yml
  - examples/jsonrpc-agent/tests/sdk.snapshot.ts
  - python/sdk/src/deepseek_harness/client.py
  - python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml
  - packages/acp/acp/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/bundle/base/package.json
symbols:
  - HarnessClient
  - DeepSeekHarness
  - JsonRpcLineTransport
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-sdk-client` 是 **进程外** TypeScript JSON-RPC 客户端：`HarnessClient` 自己 `child_process.spawn` 一份 runtime（仓库里的 bin 是 `dsh-jsonrpc-agent`），在孩子 stdio 上讲 `@deepseek-ai/dsh-sdk-protocol`。它不是 `dsh web` 的默认面，不进 `dsh-base` / shipped preset。

## 能回答的问题

- 外部 TS 程序怎么连 DSH？`new DeepSeekHarness` 要不要自己准备 runtime 可执行文件？
- 这条面是不是 `dsh web`？`dsh-base` / shipped preset 会不会挂 `sdk-jsonrpc-server`？
- 客户端发哪三个请求？服务端推哪四个通知？有没有 ACP 的 `newSession` / `loadSession` / `cancel`？
- `close()` 的拆卸阶梯是什么？Windows 少哪一档？
- 和 [`surface.sdk.python`](python.md) 是不是同一份 protocol？实现共享吗？

## 是什么

DSH 主线是 `profile → bundle → agent preset`；默认产品路径是本地 Web GUI（`dsh web`）。`PROFILE_TEMPLATES` 只有 `web`（`dsh-base` + `dsh-web-app`）和 `headless`（`dsh-base` + `dsh-headless`），没有 shipped TUI。[E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116]

本面是另一条 **automation stdio** 缝。调用方进程 import `@deepseek-ai/dsh-sdk-client`，spawn 一个已经 boot 好、挂了 `@deepseek-ai/dsh-sdk-jsonrpc-server` 的孩子，两边用 NDJSON JSON-RPC 说话。[E: packages/sdk/client/package.json:2] [E: packages/sdk/server/package.json:2] [E: packages/sdk/protocol/package.json:2]

三件套各管一层：

| 包 | 角色 |
|---|---|
| `@deepseek-ai/dsh-sdk-client` | 进程外库。主入口再导出 `DeepSeekHarness` / `HarnessSession`、`HarnessClient` 与三类错误，以及协议包的 `JsonRpcResponseError`。[E: packages/sdk/client/src/index.ts:12] [E: packages/sdk/client/src/index.ts:15] [E: packages/sdk/client/src/index.ts:21] **没有** `apply` / `inject`，不登记任何 `ctx.*`。 |
| `@deepseek-ai/dsh-sdk-protocol` | wire 形状 + `JsonRpcLineTransport`。主入口只 re-export transport 与 `HarnessSdkRequestMap` 一系类型。[E: packages/sdk/protocol/src/index.ts:11] [E: packages/sdk/protocol/src/index.ts:14] |
| `@deepseek-ai/dsh-sdk-jsonrpc-server` | **孩子进程里** 的 named 插件：`name = 'sdk-jsonrpc-server'`，`inject = ['agents']`。[E: packages/sdk/server/src/index.ts:20] [E: packages/sdk/server/src/index.ts:22] |

`HarnessClient` 用 `node:child_process.spawn` 拉孩子，stdio 三根都是 `pipe`，**不**走 `ctx.subprocess`。[E: packages/sdk/client/src/client.ts:206] [E: packages/sdk/client/src/client.ts:209] 高层包装是 `DeepSeekHarness`：记一份 launch spec，懒 `start` + 一次 `initialize`；`HarnessSession.run` 等到本 session 的 inbox 回执后再等到 `session.status === 'idle'`。[E: packages/sdk/client/src/api.ts:65] [E: packages/sdk/client/src/api.ts:66] [E: packages/sdk/client/src/api.ts:169] [E: packages/sdk/client/src/api.ts:182]

它**不是**：

| 容易混的实体 | 实际是什么 |
|---|---|
| `dsh web` / `dsh --profile web` | 默认产品。本库不在那条 shipped 树上。 |
| ACP stdio server | 另一套 JSON-RPC（`authenticate` / `newSession` / `prompt` / `cancel`）。见 [`surface.acp.server`](../acp/server.md)。 |
| Python `HarnessClient` | 同一份方法表，**实现不共享**。见 [`surface.sdk.python`](python.md)。 |
| `dsh-subagent-dsh-sdk` | 父 harness 里的 overlay Provider，内部 `new DeepSeekHarness`。本页写外部调用方。 |

## 入口

外部程序碰到这条面的方式：

| 入口 | 行为 |
|---|---|
| `new DeepSeekHarness({ launch, cwd?, provider?, model?, maxTokens? })` | 高层 API。构造期还不 spawn；第一次 `start` / `run` 才拉孩子并握手。[E: packages/sdk/client/src/api.ts:33] [E: packages/sdk/client/src/api.ts:62] |
| `harness.run(input)` / `harness.session(id?).run(input)` | 发 `session/prompt`，丢掉 inbox 回执之前的通知，收到本 session `session.status === 'idle'` 后返回 `RunResult`。[E: packages/sdk/client/src/api.ts:173] [E: packages/sdk/client/src/api.ts:176] [E: packages/sdk/client/src/api.ts:180] |
| `new HarnessClient({ command, args?, … })` | 低层。构造只收 `options`；`start()` 才 `spawn`。[E: packages/sdk/client/src/client.ts:197] [E: packages/sdk/client/src/client.ts:203] [E: packages/sdk/client/src/client.ts:206] |
| 孩子可执行文件 | `HarnessClientOptions.command` **必填**，本库不内置默认 runtime。[E: packages/sdk/client/src/types.ts:25] 仓库里的 stdio bin 是 `@deepseek-ai/dsh-sdk-jsonrpc-demo` 的 `dsh-jsonrpc-agent`。[E: packages/examples/jsonrpc-demo/package.json:17] |
| 孩子组合 | `dsh-jsonrpc-agent` **没有**内置 fallback：必须 argv 或 `DSH_CORDIS_CONFIG` 给一份存在的 `cordis.yml`。[E: packages/examples/jsonrpc-demo/src/runner.ts:25] [E: packages/examples/jsonrpc-demo/src/runner.ts:33] 真实挂 `id: sdk-jsonrpc-server` 的树：`examples/jsonrpc-agent/cordis.yml` 与 `python/sdk-runtime/.../cordis.yml`。[E: examples/jsonrpc-agent/cordis.yml:4] [E: examples/jsonrpc-agent/cordis.yml:5] [E: python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml:6] [E: python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml:7] |
| example 测试路径 | `examples/jsonrpc-agent/tests/sdk.snapshot.ts` 的 `runtimeBin` 指向 `jsonrpc-demo` 的 `bin.ts`；`DSH_CORDIS_CONFIG` 在 recording 时选 live/replay yml。[E: examples/jsonrpc-agent/tests/sdk.snapshot.ts:38] [E: examples/jsonrpc-agent/tests/sdk.snapshot.ts:282] [E: examples/jsonrpc-agent/tests/sdk.snapshot.ts:283] |

`dsh web` / `dsh --profile web` / `dsh --profile headless` **不会**挂本面。`@deepseek-ai/dsh-base` 的 `dependencies` 有 in-process subagent 三家，没有 `@deepseek-ai/dsh-sdk-client` / `@deepseek-ai/dsh-sdk-jsonrpc-server`。[E: packages/bundle/base/package.json:2] [E: packages/bundle/base/package.json:87] [E: packages/bundle/base/package.json:88] [E: packages/bundle/base/package.json:89] 四个 shipped `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml` 同样没有 `sdk-jsonrpc-server` / `dsh-sdk-client` 行。[I]

孩子 stdout 专给协议帧。`JsonRpcLineTransport` 一行一个 JSON-RPC 2.0 对象，写出时末尾 `\n`。[E: packages/sdk/protocol/src/transport.ts:261] 同树再挂 stdout logger 会把日志和 NDJSON 搅在一起。

## 关键字段

### 调用方怎么启动

| 字段 | 要点 |
|---|---|
| `HarnessClientOptions.command` | 必填。孩子可执行文件。[E: packages/sdk/client/src/types.ts:25] |
| `args` | 默认 `[]`。`spawn(command, args ?? [], …)`。[E: packages/sdk/client/src/client.ts:206] |
| `cwd` | 孩子进程自己的 cwd。`DeepSeekHarness` 另把 **workspace** cwd 在本进程先 `resolve`，避免相对路径在父子两边各解析一次。[E: packages/sdk/client/src/api.ts:39] |
| `env` | 省略则 `process.env` 原样继承；传入对象则**整表替换**（本库不 scrub）。[E: packages/sdk/client/src/client.ts:208] |
| `requestTimeoutMs` | `timeout === undefined` 时直接 `transport.request`，本侧无限等。超时只 abort 本侧 pending，**不是** wire cancel。[E: packages/sdk/client/src/client.ts:314] [E: packages/sdk/protocol/src/transport.ts:132] |
| `shutdownTimeoutMs` / `disposeEofGraceMs` / `disposeGraceMs` | `close` 用。默认 `1000` / `6000` / `3000`。[E: packages/sdk/client/src/client.ts:389] [E: packages/sdk/client/src/client.ts:396] [E: packages/sdk/client/src/client.ts:397] |
| `DeepSeekHarness` 的 `provider` / `model` | 省略回落 `'deepseek-official'` / `'deepseek-v4-flash'`。[E: packages/sdk/client/src/api.ts:40] [E: packages/sdk/client/src/api.ts:41] |

`DeepSeekHarness.session(id?)` 只铸本地字符串（默认 `session-${uuid-without-dashes}`），第一次 `prompt` 才上线。[E: packages/sdk/client/src/api.ts:89]

### 协议身份（不是方法目录）

wire 合同在 `HarnessSdkRequestMap` / `HarnessSdkNotificationMap`。客户端→服务器恰好三个请求：`initialize` / `session/prompt` / `shutdown`。[E: packages/sdk/protocol/src/types.ts:102] [E: packages/sdk/protocol/src/types.ts:103] [E: packages/sdk/protocol/src/types.ts:104] 服务器→客户端恰好四个通知：`session.event` / `session.status` / `subagent.started` / `subagent.finished`。[E: packages/sdk/protocol/src/types.ts:94] [E: packages/sdk/protocol/src/types.ts:95] [E: packages/sdk/protocol/src/types.ts:96] [E: packages/sdk/protocol/src/types.ts:97]

`handleRequest` 的 `switch` 只认这三支；未知方法抛 `unknown DeepSeek Harness SDK runtime method: …`。[E: packages/sdk/server/src/server.ts:192] [E: packages/sdk/server/src/server.ts:199] 源里没有 `newSession` / `loadSession` / `authenticate` / `session/cancel`。

门控级语义（完整字段表在 [`ref.sdk-methods`](../../reference/sdk-methods.md) / [`subsys.integration.sdk-protocol`](../../subsystems/integration/sdk-protocol.md)）：

- `initialize`：记下此后 **新创建** session 的 `cwd` / `provider` / `model` / 可选 `maxTokens`。server 回 `{ serverInfo: { name: 'deepseek-harness-sdk-runtime', version: '0.0.1' } }`。[E: packages/sdk/server/src/server.ts:124] 本客户端只检查 `name` / `version` 是 string，不钉死字面量。[E: packages/sdk/client/src/client.ts:271]
- `session/prompt`：调用方自带 `sessionId`；未知 id 由 server `agents.create` 懒创建，立刻回 `{ messageId }`，不等 turn。[E: packages/sdk/server/src/server.ts:142] [E: packages/sdk/server/src/server.ts:223]
- `shutdown`：协议停机。handler 回包之后 `setImmediate` 跑 `disposeAndExit`：`transport.flush` → `rootFiber.dispose()` → `exit(0)`。[E: packages/sdk/server/src/index.ts:69] [E: packages/sdk/server/src/index.ts:70] [E: packages/sdk/server/src/index.ts:71] [E: packages/sdk/server/src/index.ts:78]
- 完成态看后续 `session.status === 'idle'`，内容看 `session.event`。`messageId` 只是入队回执。

### 错误

| 类 | 何时 |
|---|---|
| `TransportClosedError` | 进程没了 / 已 `close` / spawn 失败。文案可带 exit code 与最多 400 行 stderr tail。[E: packages/sdk/client/src/client.ts:38] [E: packages/sdk/client/src/client.ts:28] |
| `RequestTimeoutError` | 本侧放弃等待。[E: packages/sdk/client/src/client.ts:47] |
| `SdkProtocolError` | `initialize` 回包缺 `serverInfo` 身份、`session/prompt` 缺 `messageId`，或 `session.event` 畸形。[E: packages/sdk/client/src/client.ts:271] [E: packages/sdk/client/src/client.ts:287] [E: packages/sdk/client/src/api.ts:209] |
| `JsonRpcResponseError` | 对端 error 帧（从 protocol 转出）。[E: packages/sdk/client/src/index.ts:21] |

## 装配与门控

**不进 shipped 树。** 换这条 automation 面 = 外部脚本 `new DeepSeekHarness({ launch })`，并给孩子一份含 `id: sdk-jsonrpc-server` 的 `cordis.yml`。不要改 `dsh-base`，也不要在 shipped preset 里找这行。

调用方会直接撞上的门：

1. **必须自备 runtime。** `command` 没有默认值。[E: packages/sdk/client/src/types.ts:25] Python 客户端默认走 bundled `dsh-jsonrpc-agent-pkg-<plat>-<arch>`，并在 bundled 路径下注入 `DSH_CORDIS_CONFIG`；本库不做这件事。[E: python/sdk/src/deepseek_harness/client.py:436] [E: python/sdk/src/deepseek_harness/client.py:454]
2. **孩子必须挂 `sdk-jsonrpc-server`。** `dsh-jsonrpc-agent` 缺配置路径直接 `process.exit(1)`。[E: packages/examples/jsonrpc-demo/src/runner.ts:35]
3. **没有 ACP 会话 RPC。** 不要发 `newSession` / `loadSession` / `cancel`。session 身份是调用方字符串；放弃一轮的方式是 `close()` 整棵孩子。
4. **超时不是 cancel。** `RequestTimeoutError` 只让 `JsonRpcLineTransport.request` `pending.delete(id)`；server 侧那次 `session/prompt` 仍跑到 runtime 被拆。[E: packages/sdk/protocol/src/transport.ts:132] [E: packages/sdk/client/src/client.ts:320]
5. **`close` 拆卸阶梯。** 先尽力发协议 `shutdown`（失败只记诊断），再 `disposeRuntimeProcess`：`stdin.end()`（EOF）→ POSIX `SIGTERM` → `SIGKILL`。必须等到孩子真的 `exit`。[E: packages/sdk/client/src/client.ts:389] [E: packages/sdk/client/src/dispose.ts:90] [E: packages/sdk/client/src/dispose.ts:94] [E: packages/sdk/client/src/dispose.ts:98] `platform !== 'win32'` 才发 SIGTERM；Windows 上 Node 把 SIGTERM/SIGKILL 都映射成 `TerminateProcess`，单测 `platform: 'win32'` 时 `kills === ['SIGKILL']`。[E: packages/sdk/client/src/dispose.ts:93] [E: packages/sdk/client/tests/dispose.spec.ts:163]
6. **`HarnessClient.close` 永久。** 同一实例不能再 `start()`。[E: packages/sdk/client/src/client.ts:204] 握手失败时 `DeepSeekHarness` 会换成新的 `HarnessClient`（仅当 harness 自己还没 `close`）。[E: packages/sdk/client/src/api.ts:75] `await using DeepSeekHarness` 等于 `close()`。[E: packages/sdk/client/src/api.ts:116]
7. **`env: undefined` 会把父进程密钥原样带进孩子。** 隔离启动必须自己传表。
8. **stdout 独占。** 插件默认 `output` 是 `process.stdout`（与 NDJSON 共用这一根写出流）。[E: packages/sdk/server/src/index.ts:55] 孩子树再往 stdout 打 logger 会搅乱帧。[I]

## 跨包关系

- [`subsys.integration.sdk-protocol`](../../subsystems/integration/sdk-protocol.md)（`subsys.integration.sdk-protocol`）：三请求 / 四通知与 `JsonRpcLineTransport`。本页只写外部程序怎么连，不写分帧细节。
- [`subsys.integration.sdk-client`](../../subsystems/integration/sdk-client.md)（`subsys.integration.sdk-client`）：同一客户端的 T2 控制流 / 错误路径 / session 树裁剪。
- [`subsys.integration.sdk-server`](../../subsystems/integration/sdk-server.md)（`subsys.integration.sdk-server`）：孩子进程里的 `sdk-jsonrpc-server`；懒创建 session；`shutdown` 后 `exit(0)`。
- [`surface.sdk.python`](python.md)（`surface.sdk.python`）：Python `HarnessClient` 发同一组 `initialize` / `session/prompt` / `shutdown`，用 `subprocess.Popen` + 自写 NDJSON，**不** import `JsonRpcLineTransport`。[E: python/sdk/src/deepseek_harness/client.py:73] [E: python/sdk/src/deepseek_harness/client.py:133] [E: python/sdk/src/deepseek_harness/client.py:148] [E: python/sdk/src/deepseek_harness/client.py:92] [E: python/sdk/src/deepseek_harness/client.py:303] 拆卸是 `stdin.close` → `terminate` → `kill`，不是本库那份 `disposeRuntimeProcess`。[E: python/sdk/src/deepseek_harness/client.py:97] [E: python/sdk/src/deepseek_harness/client.py:102] [E: python/sdk/src/deepseek_harness/client.py:108] Python runtime 默认组合同样挂 `id: sdk-jsonrpc-server`。[E: python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml:6]
- [`surface.acp.server`](../acp/server.md)（`surface.acp.server`）：ACP Agent 侧。handler 是 `initialize` / `authenticate` / `newSession` / `prompt` / `cancel`；`newSession` 铸造 `SessionId(randomUUID())`；有 `cancel`，没有 `loadSession`。[E: packages/acp/acp/src/index.ts:247] [E: packages/acp/acp/src/index.ts:251] [E: packages/acp/acp/src/index.ts:254] [E: packages/acp/acp/src/index.ts:277] [E: packages/acp/acp/src/index.ts:338] 不要和本面的 `session/prompt` + 懒创建混成一张方法表。

## Sources

- packages/sdk/client/src/index.ts
- packages/sdk/client/src/client.ts
- packages/sdk/client/src/api.ts
- packages/sdk/client/src/dispose.ts
- packages/sdk/client/src/types.ts
- packages/sdk/client/package.json
- packages/sdk/client/tests/sdk-client.spec.ts
- packages/sdk/client/tests/dispose.spec.ts
- packages/sdk/protocol/src/index.ts
- packages/sdk/protocol/src/types.ts
- packages/sdk/protocol/src/transport.ts
- packages/sdk/protocol/package.json
- packages/sdk/server/src/index.ts
- packages/sdk/server/src/server.ts
- packages/sdk/server/package.json
- packages/examples/jsonrpc-demo/package.json
- packages/examples/jsonrpc-demo/src/runner.ts
- examples/jsonrpc-agent/cordis.yml
- examples/jsonrpc-agent/tests/sdk.snapshot.ts
- python/sdk/src/deepseek_harness/client.py
- python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml
- packages/acp/acp/src/index.ts
- packages/boot/app-boot/src/profile.ts
- packages/bundle/base/package.json

## 相关

- [surface.sdk.python](python.md)（`surface.sdk.python`）：同一 protocol 的 Python 客户端；实现不共享。
- [surface.acp.server](../acp/server.md)（`surface.acp.server`）：另一条 automation JSON-RPC（fresh-session ACP）。
- [subsys.integration.sdk-client](../../subsystems/integration/sdk-client.md)（`subsys.integration.sdk-client`）：TS 客户端 T2。
- [subsys.integration.sdk-protocol](../../subsystems/integration/sdk-protocol.md)（`subsys.integration.sdk-protocol`）：wire 合同 T2。
- [subsys.integration.sdk-server](../../subsystems/integration/sdk-server.md)（`subsys.integration.sdk-server`）：孩子进程 server 插件 T2。
