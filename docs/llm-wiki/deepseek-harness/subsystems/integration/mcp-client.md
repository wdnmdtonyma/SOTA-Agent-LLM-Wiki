---
id: subsys.integration.mcp-client
title: mcp-client 实现
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/mcp/mcp-client/src/index.ts
  - packages/mcp/mcp-client/src/connection.ts
  - packages/mcp/mcp-client/src/tools.ts
  - packages/mcp/mcp-client/src/transport.ts
  - packages/mcp/mcp-client/package.json
  - packages/mcp/mcp-client/tests/mcp-client.spec.ts
  - packages/mcp/mcp-client/tests/apply.spec.ts
  - packages/mcp/mcp-client/tests/load-path.spec.ts
  - packages/mcp/mcp-client/tests/reconnect.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - apps/cli/package.json
  - apps/cli/tests/memory-mcp-configs.spec.ts
  - examples/mcp-memory/mcp-reference-memory.cordis.yml
  - examples/mcp-memory/engram.cordis.yml
  - examples/mcp-memory/memorix.cordis.yml
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/fiber.ts
  - vendor/cordis/src/reflect.ts
  - vendor/loader/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/subprocess/subprocess/src/index.ts
symbols:
  - apply
  - name
  - inject
  - Config
  - publicToolName
  - startConnection
related:
  - spine.overview
  - spine.capability-seams
  - surface.mcp.client
  - subsys.core.tools
  - subsys.composition.bundle-base
  - subsys.execution.subprocess
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-mcp-client` 是 **opt-in** 的 MCP 工具桥：每个插件实例连一台外部 MCP server，只把 `tools/list` 登记进 `ctx.tools`，模型看见的名字是 `mcp__<serverName>__<rawName>`。它不进 `dsh-base` / `dsh-web-app` / `dsh-headless` / 任一 shipped preset；`apps/cli` 把包装进 `dependencies` 只是给 overlay / example 解析。默认产品树零 MCP server。

## 能回答的问题

- `dsh-base` / shipped preset 里有没有 `mcp-client` 行？`apps/cli` 声明了 `@deepseek-ai/dsh-mcp-client` 等于产品默认装了吗？
- 一个插件实例连几台 MCP server？stdio 与 streamable-http 两套 Config 各要哪些字段？
- 模型看见的名字怎么来？超长或非法字符怎么规范化？同名冲突会不会静默覆盖？
- 本包桥 resources / prompts 吗？`tools/call` 发的是 public name 还是 raw name？
- fiber dispose 之后连接、已注册工具、`serverName` 预留各怎样？
- stdio 子进程走 `ctx.subprocess.spawn` 吗？凭什么只 `inject = ['tools']`？

## 职责边界

本包拥有 **host 面** 的一份 named 插件：`name = 'mcp-client'`，`inject = ['tools']`，`export async function apply` 校验 Config、预留 `serverName`、拉起 `startConnection`。[E: packages/mcp/mcp-client/src/index.ts:28] [E: packages/mcp/mcp-client/src/index.ts:31] [E: packages/mcp/mcp-client/src/index.ts:140] 包名 `@deepseek-ai/dsh-mcp-client`。[E: packages/mcp/mcp-client/package.json:2] **每个实例连一台 MCP server**；多 server = 多行 insert。它不 `provide` 新的 `ctx.mcp` 键。

它**不**拥有：

- `ctx.tools` Definition、`register` / `execute` / `tools/pre-execute` 管线 — [`subsys.core.tools`](../core/tools.md)（`subsys.core.tools`）。本页只写怎样把 MCP 工具 `register` 进去。
- 模型可见 MCP 目录的 T1 走读 — [`surface.mcp.client`](../../surface/mcp/client.md)（`surface.mcp.client`）。本页写桥的控制流与命名合同。
- `dsh-base` 的 insert 清单 — [`subsys.composition.bundle-base`](../composition/bundle-base.md)（`subsys.composition.bundle-base`）。核树里**没有**本包。
- `ctx.subprocess` 的 spawn / 树级 teardown — [`subsys.execution.subprocess`](../execution/subprocess.md)（`subsys.execution.subprocess`）。stdio 孩子由 MCP SDK `StdioClientTransport` 拉起；本包只复用 `scrubbedParentEnv`，**不** `inject` `subprocess`。[E: packages/mcp/mcp-client/src/transport.ts:22] [E: packages/mcp/mcp-client/src/transport.ts:34]
- 任何具体 MCP server 实现。example overlay 写的是 `command: mcp-server-memory` / `engram` / `memorix`，可执行文件是部署事实，DSH 不替用户装。[E: examples/mcp-memory/mcp-reference-memory.cordis.yml:9]

**默认产品树零 server。** `dsh-base` 的 patch 只挂注册表 `id: tools` / `name: '@deepseek-ai/dsh-tools'`，没有 `id: mcp-client`。[E: packages/bundle/base/cordis.patch.yml:424] [E: packages/bundle/base/cordis.patch.yml:425] `dsh-base` 的 `dependencies` 也没有 `@deepseek-ai/dsh-mcp-client`（对照注册表包在同一份清单里）。[E: packages/bundle/base/package.json:110] `dsh-web-app` / `dsh-headless` 的 patch 与 manifest 同样没有本包。四个 shipped preset（`minimal` / `standard` / `code` / `cordis`）没有 `mcp-client` 行。`apps/cli` 把包装进 CLI 的 `dependencies`，给 overlay / example 解析，**不等于** shipped 行。[E: apps/cli/package.json:43] 真实挂载在 `examples/mcp-memory/*.cordis.yml`：`name: '@deepseek-ai/dsh-mcp-client'`，例如 `id: memory-mcp-reference` / `serverName: reference_memory`。[E: examples/mcp-memory/mcp-reference-memory.cordis.yml:4] [E: examples/mcp-memory/mcp-reference-memory.cordis.yml:5] [E: examples/mcp-memory/mcp-reference-memory.cordis.yml:7] 同目录还有 `id: memory-engram`、`id: memory-memorix`；CLI 测试把三份 overlay 都钉在这个包名上。[E: examples/mcp-memory/engram.cordis.yml:4] [E: examples/mcp-memory/memorix.cordis.yml:4] [E: apps/cli/tests/memory-mcp-configs.spec.ts:90]

**host 面 vs agent-preset 面。** 本包一旦加载就在当前 fiber（通常是 profile overlay 的 host 根）上连 server、往进程级 `ctx.tools` `register`。它不是 preset `isolate` remount，也不是 `dsh web` 的默认能力。默认产品路径仍是本地 Web GUI；本仓没有 shipped TUI。不要写成「DSH 内置了一堆 MCP server」。

**没有 waterfall，没有 isolate。** 本包不往 `Events.waterfall` 挂 listener。组合失败是 `inject` 等到 `tools`、`serverName` 冲突拒载、reconnect 校验失败、`failOnStartupError` 拒激活。Cordis 全局规则仍是：waterfall 必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层。[E: vendor/cordis/src/events.ts:238] 模型调用已注册 MCP 工具时，走 `ToolRuntime` 的 `tools/pre-execute`（默认 `next` 是 `allow`）——那是 Consumer / 注册表管线，不在本包。[E: packages/core/tools/src/index.ts:1475] [E: packages/core/tools/src/index.ts:1477]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/mcp/mcp-client/src/index.ts` | named export：`name` / `inject` / `Config` / `apply`；`serverName` 预留 |
| `packages/mcp/mcp-client/src/connection.ts` | `startConnection`：generation、reconnect、`ready` / `dispose` |
| `packages/mcp/mcp-client/src/tools.ts` | `publicToolName`、`syncTools`（`tools/list`）、executor（`tools/call`） |
| `packages/mcp/mcp-client/src/transport.ts` | `createTransport`：stdio / streamable-http；stdio 叠 `scrubbedParentEnv` |
| `packages/mcp/mcp-client/package.json` | `@deepseek-ai/dsh-mcp-client`；peer 含 `dsh-tools` / `dsh-subprocess` |
| `packages/mcp/mcp-client/tests/load-path.spec.ts` | named export：`'default' in` 为 false，`unwrapExports` 保住 `inject` |
| `packages/mcp/mcp-client/tests/apply.spec.ts` | 激活、重复 `serverName`、notification 再同步、streamable-http |
| `packages/mcp/mcp-client/tests/mcp-client.spec.ts` | 命名、sync 冲突、raw `tools/call`、transport |
| `packages/mcp/mcp-client/tests/reconnect.spec.ts` | backoff、give-up 卸工具、disabled 保留旧代 |
| `examples/mcp-memory/mcp-reference-memory.cordis.yml` | 真实 overlay：`id: memory-mcp-reference` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` / `inject` | 插件名 `'mcp-client'`。只注入 `tools`。named export，无 `default`。[E: packages/mcp/mcp-client/src/index.ts:28] [E: packages/mcp/mcp-client/src/index.ts:31] |
| `Config` | `z.union` 两支：`transport: 'stdio'` 必填 `serverName` + `command`；`transport: 'streamable-http'` 必填 `serverName` + `url`。[E: packages/mcp/mcp-client/src/index.ts:107] [E: packages/mcp/mcp-client/src/index.ts:111] [E: packages/mcp/mcp-client/src/index.ts:122] |
| `serverName` | `[A-Za-z0-9_-]{1,32}`。按 `ctx.root` 预留，重复 fail-loud。是 public 名的本地命名空间，不是 MCP 协议里的 server 身份。[E: packages/mcp/mcp-client/src/index.ts:37] [E: packages/mcp/mcp-client/src/index.ts:155] |
| `publicToolName` | 干净情况就是 `mcp__<serverName>__<rawName>`。非法字符换成 `_`，或总长超过 64，就截断并追加 12 hex 的 SHA-256（输入 `${serverName}\0${rawName}`）。[E: packages/mcp/mcp-client/src/tools.ts:97] [E: packages/mcp/mcp-client/src/tools.ts:100] |
| `toolCallTimeoutMs` | 单次 `tools/call` 超时，默认 `60_000`。[E: packages/mcp/mcp-client/src/index.ts:34] [E: packages/mcp/mcp-client/src/index.ts:115] |
| `failOnStartupError` | 默认 `false`：首次连不上只记日志，fiber 仍激活，supervisor 进 reconnect。`true` 则 `apply` 抛，Cordis 卸掉本 fiber。[E: packages/mcp/mcp-client/src/index.ts:116] [E: packages/mcp/mcp-client/src/index.ts:178] |
| `ReconnectConfig` | 默认 `enabled: true`、`initialDelayMs: 500`、`maxDelayMs: 30_000`、`maxAttempts: 10`。`maxDelayMs` 同时是稳定窗口：连上超过这个时间再断，attempt 预算清零。[E: packages/mcp/mcp-client/src/connection.ts:41] [E: packages/mcp/mcp-client/src/connection.ts:203] |
| `ConnectionHandle` | `ready`：第一次 connect+sync 结束（成败都 settle）。`dispose`：停 reconnect、关当前 generation、等 sync 队列、注销仍持有的工具。 |
| `ToolBridgeOptions.registrationFailure` | 启动同步在 `failOnStartupError` 时为 `'throw'`；之后的 re-sync / reconnect 恒为 `'contain'`（冲突记日志、本代登记空集）。[E: packages/mcp/mcp-client/src/connection.ts:126] [E: packages/mcp/mcp-client/src/connection.ts:134] |
| `McpResult` | executor 返回 `{ content, structuredContent? }`。Native `render` 把 content 折成一段 text；image / audio / resource 变占位符。 |

stdio 另有 `args` 默认 `[]`、`env` 默认 `{}`（scrub 之后合并，可显式回填孩子自己的密钥）、`cwd` 默认 `''`。streamable-http 另有 `headers` 默认 `{}`。example overlay 把 `cwd` 写成 `!!js process.cwd()`。[E: examples/mcp-memory/mcp-reference-memory.cordis.yml:10]

## 控制流

1. Loader 用 named export 加载本包。`unwrapExports` 取 `exports.default ?? exports`；若写成 `export default { apply }`，`name` / `inject` 会丢，`tools` 等不到。[E: vendor/loader/src/index.ts:194] 测试钉死 `'default' in mcpClient` 为 false，且 `inject` 等于 `['tools']`。[E: packages/mcp/mcp-client/tests/load-path.spec.ts:19] [E: packages/mcp/mcp-client/tests/load-path.spec.ts:25]

2. `apply@packages/mcp/mcp-client/src/index.ts` 先 `resolveReconnectPolicy`：未知键、非正 delay、`initialDelayMs > maxDelayMs`、`maxAttempts < 1` 都在**任何 effect 登记之前**抛，本实例拒载。[E: packages/mcp/mcp-client/src/index.ts:144]

3. 下一个 `ctx.effect`（label `mcp-client.serverName`）按 `ctx.root` 预留 `serverName`。已占用则抛 `serverName "…" is already in use`，先挂上的实例不动；disposer 只 `delete` 自己的名字。[E: packages/mcp/mcp-client/src/index.ts:148] [E: packages/mcp/mcp-client/src/index.ts:156] [E: packages/mcp/mcp-client/src/index.ts:160] 测试：第二次 `apply` 拒，第一次的 `mcp__srv__remote` 仍在。[E: packages/mcp/mcp-client/tests/apply.spec.ts:207]

4. `startConnection@packages/mcp/mcp-client/src/connection.ts` 立刻开第一代 `connectGeneration(true)`。另一个 `ctx.effect`（label `mcp-client.connection`）的 disposer 调 `connection.dispose`。[E: packages/mcp/mcp-client/src/connection.ts:123] [E: packages/mcp/mcp-client/src/index.ts:166] [E: packages/mcp/mcp-client/src/index.ts:169] `ctx.effect` 是 `fiber.effect` 的 mixin；fiber unload 按反序跑 disposer。[E: vendor/cordis/src/reflect.ts:220] [E: vendor/cordis/src/fiber.ts:431]

5. `apply` **await** `connection.ready`，所以 Loader 看到的激活发生在首次 connect+`tools/list` 之后。`failOnStartupError` 且 `outcome.error` 有值则抛，fiber 回滚（预留与连接 effect 一起卸）。[E: packages/mcp/mcp-client/src/index.ts:177] [E: packages/mcp/mcp-client/src/index.ts:179] 默认 `false` 时首次失败也激活：零工具，supervisor 已在排 retry。

6. `connectGeneration` 建 `@modelcontextprotocol/sdk` 的 `Client({ name: 'dsh-mcp-client', version: '0.0.1' }, { capabilities: {} })`——客户端不广告 fs / sampling / resources。[E: packages/mcp/mcp-client/src/connection.ts:239] [E: packages/mcp/mcp-client/src/connection.ts:240] `createTransport(config)` 后 `generation.connect`。[E: packages/mcp/mcp-client/src/connection.ts:272] stdio：`StdioClientTransport({ command, args, env: { ...scrubbedParentEnv(), ...extra }, cwd })`。[E: packages/mcp/mcp-client/src/transport.ts:21] [E: packages/mcp/mcp-client/src/transport.ts:34] streamable-http：`StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } })`。[E: packages/mcp/mcp-client/src/transport.ts:45] `scrubbedParentEnv` 丢掉 credential 形名字和 `DSH_*`；显式 `env` 后写，可把密钥再塞回去。[E: packages/subprocess/subprocess/src/index.ts:60] 本包**不**调用 `ctx.subprocess.spawn`。

7. 连上之后 `enqueueSync` 串行跑 `syncTools`（两代 swap 不能交错）。[E: packages/mcp/mcp-client/src/connection.ts:162] Phase 1：分页 `tools/list`（`listToolsUncached`，不碰 SDK 的 per-page output 缓存），按 `publicToolName(serverName, tool.name)` 建 `ToolDefinition`。[E: packages/mcp/mcp-client/src/tools.ts:59] [E: packages/mcp/mcp-client/src/tools.ts:140] 同一 raw name 在一份 list 里出现两次 → 抛，**上一世代仍注册**。[E: packages/mcp/mcp-client/src/tools.ts:143] Phase 2：先 dispose 上一世代，再 `ctx.tools.register`。[E: packages/mcp/mcp-client/src/tools.ts:158] [E: packages/mcp/mcp-client/src/tools.ts:162] 同层重名 `NamedEntries` 抛 `already registered`；本包回滚本代已挂上的名字，`'throw'` 时把冲突送回 startup，`'contain'` 返回空 Map。[E: packages/core/tools/src/index.ts:727] [E: packages/mcp/mcp-client/src/tools.ts:168] [E: packages/mcp/mcp-client/src/tools.ts:170] 源码里没有 `listResources` / `listPrompts` / `resources/list` / `prompts/list`——只桥 tools。

8. 在 `connect` 之前就挂 `ToolListChangedNotificationSchema`。通知到来且 generation 仍是 current，就 `enqueueSync`（contain）。fetch 失败保留上一世代。[E: packages/mcp/mcp-client/src/connection.ts:257] [E: packages/mcp/mcp-client/src/connection.ts:263] 测试：`remote` 换成 `updated`；list 抛错时 `mcp__srv__remote` 仍在。[E: packages/mcp/mcp-client/tests/apply.spec.ts:335] [E: packages/mcp/mcp-client/tests/apply.spec.ts:347]

9. 模型侧 Consumer 调 `ctx.tools.execute({ name: 'mcp__srv__echo', … })`。定义层 `execute` 是 `createExecutor` 闭包：`taskSupport === 'required'` 直接抛，不发 RPC；否则 `callToolUncached` 的 wire 是 `{ method: 'tools/call', params: { name: rawName, arguments } }`，**从不回解析 public name**。[E: packages/mcp/mcp-client/src/tools.ts:236] [E: packages/mcp/mcp-client/src/tools.ts:73] 测试钉死 mock 收到 `{ name: 'echo', … }`，不是 `mcp__srv__echo`。[E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:330] `isError: true` 再抛，让 `ToolRuntime` 走 isError 结果。[E: packages/mcp/mcp-client/src/tools.ts:268]

10. `onclose` 且 generation 仍是 current → `scheduleReconnect`。`enabled: false` 只打 error，**已登记工具不卸**。[E: packages/mcp/mcp-client/src/connection.ts:194] [E: packages/mcp/mcp-client/tests/reconnect.spec.ts:334] 否则 `failedAttempts += 1`，超过 `maxAttempts` 就在 sync 队列尾部卸光工具并停。[E: packages/mcp/mcp-client/src/connection.ts:206] [E: packages/mcp/mcp-client/src/connection.ts:213] delay 是 `min(maxDelayMs, initialDelayMs * 2^(failedAttempts-1))`。[E: packages/mcp/mcp-client/src/connection.ts:216] 失败 generation 必须先 close（或 `GENERATION_CLOSE_TIMEOUT_MS = 5_000`）；超时则停 reconnect，避免两份 stdio 孩子重叠。[E: packages/mcp/mcp-client/src/connection.ts:50] [E: packages/mcp/mcp-client/src/connection.ts:291]

11. `dispose`：`disposed = true`、清 timer、`client.close()`、等 `settling` 与 `syncChain`、再跑剩余 disposer。[E: packages/mcp/mcp-client/src/connection.ts:328] [E: packages/mcp/mcp-client/src/connection.ts:347] fiber 卸掉后 `serverName` 预留释放，同 root 可以再挂同名。[E: packages/mcp/mcp-client/src/index.ts:160]

## 设计动机

产品默认不挂 MCP server，是因为 `command` / `url` 是部署事实（本机已装的 `mcp-server-memory`、远端 HTTP endpoint），`dsh-base` 不能替用户选定。CLI 依赖只解决「overlay 能 `import` 到这个包」，不是「`dsh web` 自带 server」。

只桥 tools：模型可见面是 `ctx.tools`；resources / prompts 没有对应的 harness 注册表，本包也不假装有。`Client` 的 `capabilities: {}` 与源码里只有 `tools/list` + `tools/call` 一致。

`mcp__<serverName>__<rawName>` 让两台 server 的同名 raw tool、以及 native `search` 与 `mcp__srv__search` 并存。[E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:133] [E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:150] 冲突 fail-loud（重复 `serverName`、list 内重复 raw name、外源抢 `mcp__<serverName>__*`），避免静默覆盖。规范化带 identity hash，是为了 `admin.reset` 与 `admin_reset` 不会塌成同一个 public name。[E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:99]

executor 闭包持有 raw name，是因为 public name 在超长 / 非法字符时不可逆。`tools/call` 从不把模型看见的字符串拆回去。[E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:348]

stdio 不走 `ctx.subprocess`：MCP SDK 把 Protocol 绑死在自己的 transport 生命周期上。本包只共享 `scrubbedParentEnv` 这份 scrub 定义，避免孩子继承 `DEEPSEEK_API_KEY` / `DSH_*`；要给孩子密钥必须写在 Config `env` 里。这是和 ACP subagent（`inject` 含 `subprocess`）相反的 documented exception。

reconnect 用「稳定窗口 = `maxDelayMs`」切 outage：连上够久再断算新一轮；连上立刻又崩仍消耗同一预算，避免 crash-loop 永续重启。耗尽之后只有 HMR / 重载插件能回来。

`apply` 保持 `async` 并 await `ready`，是为了 fiber 激活时 `ctx.tools` 已经有第一代工具（或已经明确失败）。默认 `failOnStartupError: false` 让偶发的 MCP 进程不影响整个 Host 起来。

## Gotcha

- **包在 `apps/cli` ≠ 进了 `dsh-base`。** `dsh web` 默认零 MCP 工具。只 overlay 本包、不给 `command`/`url`，Config schema 会拒载。只改 example 的 `serverName` 而不装对应可执行文件，stdio 会连失败。
- **default export 会丢掉 `inject`。** `unwrapExports` 先取 `.default`。[E: vendor/loader/src/index.ts:194] 必须 `export const name` / `export const inject` / `export const Config` / `export async function apply`。
- **一实例一台 server。** 两台 server 写两行 `id:`，各一个 `serverName`。同一 `serverName` 再 `apply` 立刻抛，不会合并 list。
- **冲突不覆盖。** 外源已经登记 `mcp__srv__taken` 时，本代 `free`+`taken` 全部回滚，模型看到的是「这台 server 零工具」，不是残缺子集。[E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:196]
- **public name 不可逆。** `admin.reset` 的模型名带 hash；RPC 仍发 `admin.reset`。[E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:348]
- **stdio 孩子不进 `ctx.subprocess` 树。** Host dispose 靠本 fiber 的 `connection.dispose` → SDK `client.close()`。不要按 ACP / bash 的 subprocess 清单去找 MCP 孩子。
- **reconnect 关掉之后，断线工具仍在表里。** 再调用会打到已死的 generation，直到 HMR / 卸插件。[E: packages/mcp/mcp-client/tests/reconnect.spec.ts:334] give-up 才会卸工具。
- **默认启动失败不拒载。** `failOnStartupError: false` 时 Host 带着零 MCP 工具继续跑；只有显式打开才会让缺 server 变成 fiber 失败。
- **`taskSupport: 'required'` 的 MCP 工具会登记但一调用就错**，bridge 不做 task 会话。[E: packages/mcp/mcp-client/src/tools.ts:236]
- **只传 / 只折 text。** image / audio / resource 块留在 `McpResult.content` 给 Code Mode，Native 渲染是占位符。不要指望 MCP 资源接口。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-tools` 的 `ToolRuntime` | `ctx.tools`。**host**：`dsh-base` `id: tools`。本包不占新键 |
| **Provider（本页）** | `@deepseek-ai/dsh-mcp-client` 的每个实例 | `inject = ['tools']`，`ctx.tools.register`。默认名空间 `serverName`。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / shipped preset。example：`id: memory-mcp-reference` / `memory-engram` / `memory-memorix` |
| **Consumer** | agent-loop / 模型 / `ctx.tools.execute` | 看见 `mcp__<serverName>__<rawName>`。走注册表 `tools/pre-execute` → body。T1 可见面是 [`surface.mcp.client`](../../surface/mcp/client.md) |

换 MCP server = overlay 再插一行本包并给它自己的 `serverName` + `command`/`url`，不是改 `dsh-base`。同 `serverName` 再注册会在 load 失败。同层抢同一个 public name 会 `already registered`。

## Sources

- packages/mcp/mcp-client/src/index.ts
- packages/mcp/mcp-client/src/connection.ts
- packages/mcp/mcp-client/src/tools.ts
- packages/mcp/mcp-client/src/transport.ts
- packages/mcp/mcp-client/package.json
- packages/mcp/mcp-client/tests/mcp-client.spec.ts
- packages/mcp/mcp-client/tests/apply.spec.ts
- packages/mcp/mcp-client/tests/load-path.spec.ts
- packages/mcp/mcp-client/tests/reconnect.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- apps/cli/package.json
- apps/cli/tests/memory-mcp-configs.spec.ts
- examples/mcp-memory/mcp-reference-memory.cordis.yml
- examples/mcp-memory/engram.cordis.yml
- examples/mcp-memory/memorix.cordis.yml
- vendor/cordis/src/events.ts
- vendor/cordis/src/fiber.ts
- vendor/cordis/src/reflect.ts
- vendor/loader/src/index.ts
- packages/core/tools/src/index.ts
- packages/subprocess/subprocess/src/index.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer；本包是 `ctx.tools` 上的工具 Provider，不是一条新的 `ctx.mcp` 缝。
- [surface.mcp.client](../../surface/mcp/client.md)（`surface.mcp.client`）：模型看见的 MCP 客户端面。
- [subsys.core.tools](../core/tools.md)（`subsys.core.tools`）：`ctx.tools` 注册表与 `tools/pre-execute` 管线。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：shipped host 第一层；没有本包。
- [subsys.execution.subprocess](../execution/subprocess.md)（`subsys.execution.subprocess`）：`scrubbedParentEnv` 与 `ctx.subprocess.spawn`；本包只用前者。
