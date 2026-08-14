---
id: surface.mcp.client
title: MCP 客户端
kind: surface
tier: T1
pkg: integration
source:
  - packages/mcp/mcp-client/src/index.ts
  - packages/mcp/mcp-client/src/tools.ts
  - packages/mcp/mcp-client/src/transport.ts
  - packages/mcp/mcp-client/src/connection.ts
  - packages/mcp/mcp-client/package.json
  - packages/mcp/mcp-client/tests/mcp-client.spec.ts
  - packages/mcp/mcp-client/tests/apply.spec.ts
  - packages/mcp/mcp-client/tests/load-path.spec.ts
  - packages/mcp/mcp-client/tests/reconnect.spec.ts
  - packages/mcp/mcp-client/tests/mcp-client.e2e.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - apps/cli/package.json
  - apps/cli/tests/memory-mcp-configs.spec.ts
  - examples/mcp-memory/mcp-reference-memory.cordis.yml
  - examples/mcp-memory/engram.cordis.yml
  - examples/mcp-memory/memorix.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - packages/core/tools/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/subprocess/subprocess/src/index.ts
symbols:
  - apply
  - name
  - inject
  - Config
  - publicToolName
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-mcp-client` 是 **host 面 opt-in** 的 MCP 工具桥：每个插件实例连一台外部 MCP server，只把 `tools/list` 登记进 `ctx.tools`。模型看见的名字是 `mcp__<serverName>__<rawName>`（`publicToolName`）。默认 `dsh web` 产品树零 MCP server——`dsh-base` / `dsh-web-app` / `dsh-headless` / 四个 shipped preset 都没有这行；`apps/cli` 把包装进 `dependencies` 只为 overlay / example 能解析到包。

## 能回答的问题

- 默认 `dsh web` 的模型工具表里有没有 `mcp__*`？`apps/cli` 声明了 `@deepseek-ai/dsh-mcp-client` 等于产品自带 MCP server 吗？
- 模型看见的名字怎么拼？`tools/call` 线上发 public name 还是 raw name？超长 / 非法字符会不会把两个 MCP 工具塌成一个？
- 本包桥 resources / prompts 吗？Native `schemas()` 里能看见 output schema 吗？
- 一个插件实例连几台 server？stdio 与 streamable-http 各要哪些 Config 字段？
- 同名冲突、`failOnStartupError`、fiber dispose 之后，模型还看不看得到这些工具？

## 是什么

DSH 是 Cordis **组合运行时**（`profile → bundle → agent preset`），不是「内置了一堆 MCP server 的 coding agent」。本包是 host 面的一份 named 插件：`name = 'mcp-client'`，`inject = ['tools']`，入口 `export async function apply`。[E: packages/mcp/mcp-client/src/index.ts:28] [E: packages/mcp/mcp-client/src/index.ts:31] [E: packages/mcp/mcp-client/src/index.ts:140] 包名 `@deepseek-ai/dsh-mcp-client`。[E: packages/mcp/mcp-client/package.json:2] named export，没有 `default`——Loader 的 `unwrapExports` 先取 `.default`，写成 default 会丢掉 `inject`，`ctx.tools` 等不到。[E: packages/mcp/mcp-client/tests/load-path.spec.ts:19] [E: packages/mcp/mcp-client/tests/load-path.spec.ts:25]

**每个实例连一台 server。** 多 server = 多行 `insert`，各写自己的 `id` + `serverName`。它不 `provide` `ctx.mcp`，也不重挂 `dsh-tools`。

**只暴露 tools。** 发现走未缓存的 `tools/list`，登记走 `ctx.tools.register`；调用走 `tools/call`。[E: packages/mcp/mcp-client/src/tools.ts:59] [E: packages/mcp/mcp-client/src/tools.ts:162] [E: packages/mcp/mcp-client/src/tools.ts:73] 源码没有 `resources/list` / `prompts/list` / `listResources` / `listPrompts`。连上时 `Client` 的 capabilities 是空对象，不广告 resources / prompts / sampling。[E: packages/mcp/mcp-client/src/connection.ts:240]

模型白名单是 `ctx.tools.schemas(scope)`：只投影 `name` / `description` / `parameters`。[E: packages/core/tools/src/index.ts:1234] [E: packages/core/tools/src/index.ts:1263] Native 请求里看不到 MCP `outputSchema`。`code` 呈现下 **wire** 再收成只剩 `run_code`。[E: packages/core/tools/src/index.ts:996] Code Mode **SDK** 投影走 `sdkSchemas`：从 visible 里去掉 `run_code` 自己，其余（含 MCP public name）仍带 `output`。[E: packages/core/tools/src/index.ts:1239] [E: packages/core/tools/src/index.ts:1241]

三套不要混的名字：

| 名字 | 谁用 | 例子（`examples/mcp-memory/mcp-reference-memory.cordis.yml`） |
|---|---|---|
| insert `id` | Cordis fiber | `memory-mcp-reference` [E: examples/mcp-memory/mcp-reference-memory.cordis.yml:4] |
| insert `name` | Loader 解析包 | `@deepseek-ai/dsh-mcp-client` [E: examples/mcp-memory/mcp-reference-memory.cordis.yml:5] |
| `config.serverName` | public 工具命名空间 | `reference_memory` [E: examples/mcp-memory/mcp-reference-memory.cordis.yml:7] |
| 模型看见的 tool `name` | `publicToolName` | `mcp__reference_memory__<rawName>` |

`serverName` 不是 MCP 协议里的 server 身份，只是本机给 public name 用的本地命名空间。

## 入口

用户要让模型看见 MCP 工具，必须在 **host overlay** 里 insert 本包并给 `command` 或 `url`。默认产品路径仍是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI。

| 入口 | 模型能不能看见 `mcp__*` |
|---|---|
| 默认 `dsh web` / `--profile web` | 不能。`dsh-base` 只挂注册表 `id: tools` / `name: '@deepseek-ai/dsh-tools'`，没有 `id: mcp-client`。[E: packages/bundle/base/cordis.patch.yml:424] [E: packages/bundle/base/cordis.patch.yml:425] `dsh-web-app` / `dsh-headless` 的 patch 与 `package.json` 也没有本包。 |
| shipped `minimal` / `standard` / `code` / `cordis` | 不能。四个 `apps/cli/config/agent-presets/*/agent.cordis.yml` 都没有 `mcp-client` 行。 |
| `apps/cli` 的 `dependencies` | 不能单独让模型看见。`@deepseek-ai/dsh-mcp-client` 在 CLI 依赖里，只为 overlay / example 解析。[E: apps/cli/package.json:43] 包在 dependencies ≠ 产品默认装。 |
| `--patch` / `$DSH_HOME/profiles/<name>/cordis.patch.yml` insert | 能（连上且 `tools/list` 成功之后）。真实样例是 `examples/mcp-memory/*.cordis.yml`。 |
| 测试里直接 `apply(ctx, config)` | 能。e2e 在 `ctx.tools.schemas()` 里断言 `mcp__fixture__add` 等，raw `add` 不在表里。[E: packages/mcp/mcp-client/tests/mcp-client.e2e.ts:94] [E: packages/mcp/mcp-client/tests/mcp-client.e2e.ts:99] |

本包 `package.json` 没有 `dsh.bundle.patch`，所以 `dsh plugin add @deepseek-ai/dsh-mcp-client` 不会自动插一行 server。还要自己写 insert，并在本机装好 `command` 指向的可执行文件（DSH 不替用户跑包管理器）。[E: examples/mcp-memory/mcp-reference-memory.cordis.yml:9]

CLI 测试把三份 example overlay 都钉在 `name: '@deepseek-ai/dsh-mcp-client'`，并用 fixture 换成 `mcp__<serverName>__greet` 证明 Loader 能发现工具。[E: apps/cli/tests/memory-mcp-configs.spec.ts:90] [E: apps/cli/tests/memory-mcp-configs.spec.ts:130]

`apply` **await** 首次 connect + `tools/list`，所以 fiber 激活时，成功路径上 `ctx.tools` 已经有这一代工具。[E: packages/mcp/mcp-client/src/index.ts:177]

## 关键字段

`Config` 是 `z.union` 两支，用 `transport` 判别。[E: packages/mcp/mcp-client/src/index.ts:107]

### 两支共用

| 字段 | 默认 | 模型侧含义 |
|---|---|---|
| `serverName` | 必填，`^[A-Za-z0-9_-]{1,32}$` | public name 的中间段。非法 / 超过 32 字符 schema 拒载。[E: packages/mcp/mcp-client/src/index.ts:37] [E: packages/mcp/mcp-client/src/index.ts:110] |
| `toolCallTimeoutMs` | `60_000` | 单次 MCP `tools/call` 的 SDK `timeout`，不是 `ToolDefinition.timeoutMs`。[E: packages/mcp/mcp-client/src/index.ts:34] [E: packages/mcp/mcp-client/src/index.ts:115] [E: packages/mcp/mcp-client/src/tools.ts:77] |
| `failOnStartupError` | `false` | `false`：首次连不上 / 同步失败仍激活，这一代零工具，supervisor 进 reconnect。`true`：`apply` 抛，fiber 回滚，模型看不到这台 server。[E: packages/mcp/mcp-client/src/index.ts:116] [E: packages/mcp/mcp-client/src/index.ts:178] |
| `reconnect` | `enabled: true`，`initialDelayMs: 500`，`maxDelayMs: 30_000`，`maxAttempts: 10` | 管工具表会不会在断线后暂时留下或最终卸掉。省略走 schema 默认。[E: packages/mcp/mcp-client/tests/apply.spec.ts:134] |

### `transport: 'stdio'`

必填 `command`。`args` 默认 `[]`（不经 shell 插值），`env` 默认 `{}`，`cwd` 默认 `''`。[E: packages/mcp/mcp-client/src/index.ts:111] [E: packages/mcp/mcp-client/src/index.ts:112]

孩子由 MCP SDK `StdioClientTransport` 拉起，**不**走 `ctx.subprocess.spawn`。`inject` 只有 `['tools']`。[E: packages/mcp/mcp-client/src/index.ts:31] [E: packages/mcp/mcp-client/src/transport.ts:34] 环境是 `{ ...scrubbedParentEnv(), ...config.env }`：先丢掉 credential 形名字和 `DSH_*`，再叠显式 `env`（可以把孩子自己的密钥写回来）。[E: packages/mcp/mcp-client/src/transport.ts:22] [E: packages/subprocess/subprocess/src/index.ts:60]

example overlay：`command: mcp-server-memory` / `engram` / `memorix`，`cwd: !!js process.cwd()`。[E: examples/mcp-memory/mcp-reference-memory.cordis.yml:9] [E: examples/mcp-memory/mcp-reference-memory.cordis.yml:10] [E: examples/mcp-memory/engram.cordis.yml:9] [E: examples/mcp-memory/memorix.cordis.yml:9]

### `transport: 'streamable-http'`

必填 `url`。`headers` 默认 `{}`，进 `StreamableHTTPClientTransport` 的 `requestInit`。[E: packages/mcp/mcp-client/src/index.ts:122] [E: packages/mcp/mcp-client/src/index.ts:123] [E: packages/mcp/mcp-client/src/transport.ts:45] 测试用 `serverName: 'web'` 时登记成 `mcp__web__remote`。[E: packages/mcp/mcp-client/tests/apply.spec.ts:401]

### 模型看见的名字：`publicToolName`

干净情况（字符合法且总长 ≤ 64）就是 `mcp__<serverName>__<rawName>` 原文。[E: packages/mcp/mcp-client/src/tools.ts:97] [E: packages/mcp/mcp-client/src/tools.ts:99] 测试：`publicToolName('github', 'create_issue') === 'mcp__github__create_issue'`。[E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:76]

否则：非法字符先换成 `_`；再把名字截到 64，并追加 `_` + 12 hex 的 SHA-256（输入 `${serverName}\0${rawName}`）。[E: packages/mcp/mcp-client/src/tools.ts:48] [E: packages/mcp/mcp-client/src/tools.ts:100] `admin.reset` 变成 `mcp__srv__admin_reset_<12hex>`；`admin.reset` 与 `admin_reset` 不会塌成同一个 public name。[E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:82] [E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:99]

raw name **不**进注册表。同一 raw `search` 可以同时是 native `search`、`mcp__github__search`、`mcp__web__search`。[E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:122] [E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:133] [E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:150]

### 模型调用时线上发什么

`createExecutor` 闭包持有 raw name。`tools/call` 的 params 是 `{ name: rawName, arguments }`，从不回解析 public name。[E: packages/mcp/mcp-client/src/tools.ts:73] 测试：模型侧 `name: 'mcp__srv__echo'`，mock 收到 `{ name: 'echo', arguments: { msg: 'hi' } }`；规范化后的 `admin.reset` 同样发 raw `admin.reset`。[E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:330] [E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:348]

非 object 的 arguments（模型乱写 string / null）会被收成 `{}` 再发给 server。[E: packages/mcp/mcp-client/src/tools.ts:242]

登记时的 `ToolDefinition`：`name` 是 public name，`description` 缺省变 `''`，`parameters` 是 MCP `inputSchema`，没有 `timeoutMs` / `isConcurrencySafe`。[E: packages/mcp/mcp-client/src/tools.ts:147] [E: packages/mcp/mcp-client/src/tools.ts:148] [E: packages/mcp/mcp-client/src/tools.ts:149] 因此：

- `dsh-tool-call-timeout-policy` 读不到 `timeoutMs` 会直接 `next()`；真正的时限是 SDK `timeout: toolCallTimeoutMs`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59] [E: packages/mcp/mcp-client/src/tools.ts:77]
- 未声明 `isConcurrencySafe` → `executionMode` 是 `exclusive`。[E: packages/core/tools/src/index.ts:1278]
- 本包不挂 `tools/pre-execute` listener；默认 gate 是 `allow`。[E: packages/core/tools/src/index.ts:1477]

`taskSupport === 'required'` 的工具仍会登记，但一调用就抛，不发 RPC。[E: packages/mcp/mcp-client/src/tools.ts:236]

### 模型下一轮看见的结果

executor 返回 `{ content, structuredContent? }`（`McpResult`）。Native `render` 把 MCP content 折成一段 text：text 块用 `\n` 拼接；image / audio / resource / `resource_link` 变成占位符（「content discarded」）。[E: packages/mcp/mcp-client/src/tools.ts:302] [E: packages/mcp/mcp-client/src/tools.ts:305] [E: packages/mcp/mcp-client/src/tools.ts:309] MCP `isError: true` 再抛，让 `ToolRuntime` 走出 isError 结果。[E: packages/mcp/mcp-client/src/tools.ts:268] e2e：`mcp__fixture__image` 的 Native 文本含 `[image: image/png, content discarded]`。[E: packages/mcp/mcp-client/tests/mcp-client.e2e.ts:152]

## 装配与门控

**默认产品树零 server。** 成员资格只认 shipped `cordis.patch.yml` / `agent.cordis.yml` 的行，不认「仓库里有这个 package」。`dsh-base` 的 dependencies 有 `@deepseek-ai/dsh-tools`，没有 `@deepseek-ai/dsh-mcp-client`。[E: packages/bundle/base/package.json:110]

**一实例一台 server。** 同一 `ctx.root` 上第二个相同 `serverName` 在 load 抛 `serverName "…" is already in use`，先挂上的实例和它的工具不动。[E: packages/mcp/mcp-client/src/index.ts:155] [E: packages/mcp/mcp-client/tests/apply.spec.ts:207] 预留按 `ctx.root` 分桶；不同 app root 可以重名。[E: packages/mcp/mcp-client/src/index.ts:149]

**冲突不静默覆盖。**

- 一份 `tools/list` 里同一个 raw name 出现两次 → fetch 阶段抛，上一世代仍注册。[E: packages/mcp/mcp-client/src/tools.ts:143]
- 外源已经占了 `mcp__<serverName>__*`：本代已挂上的名字全部回滚，模型看到的是「这台 server 零工具」，不是残缺子集。[E: packages/mcp/mcp-client/tests/mcp-client.spec.ts:196]
- `failOnStartupError: true` 时，启动同步的登记冲突会传到 `apply` 拒绝激活。[E: packages/mcp/mcp-client/tests/apply.spec.ts:288]

**fiber dispose 卸工具。** `mcp-client.connection` effect 的 disposer 调 `connection.dispose`：停 reconnect、关 client、再跑剩余 `ctx.tools` disposer。[E: packages/mcp/mcp-client/src/index.ts:169] [E: packages/mcp/mcp-client/src/connection.ts:347] 测试：插件 fiber dispose 后当前世代 `mcp__srv__updated` 从注册表消失；`serverName` 预留一并释放。[E: packages/mcp/mcp-client/tests/apply.spec.ts:370] [E: packages/mcp/mcp-client/src/index.ts:160]

**断线时模型还看不看得到：**

- `reconnect.enabled: false` 且曾经连上：工具留在表里，再调用会打到已死的 generation，直到卸插件 / 重载。[E: packages/mcp/mcp-client/tests/reconnect.spec.ts:334]
- reconnect 耗尽 `maxAttempts`：supervisor 卸光这台 server 的工具。[E: packages/mcp/mcp-client/tests/reconnect.spec.ts:190]
- 默认 `failOnStartupError: false` 且首次 connect 失败：fiber 仍激活，零工具。[E: packages/mcp/mcp-client/tests/apply.spec.ts:247]

**`tools/list` 变更。** 连上之前就挂 `ToolListChanged` handler。通知到来会整代 swap：旧 public name 消失，新名字出现。fetch 失败则保留上一世代。[E: packages/mcp/mcp-client/tests/apply.spec.ts:335] [E: packages/mcp/mcp-client/tests/apply.spec.ts:347]

本包不 `provide` 新服务，example overlay 也没有 `isolate`。它不是 preset remount。

## 跨包关系

- `subsys.core.tools` — `ctx.tools` 注册表与 `schemas()` / `register` / `tools/pre-execute`。本页只写 MCP 工具怎样进这张表、模型看见什么名字。
- `spine.tool-call-anatomy` — 模型写出 `mcp__*` 之后的 `pre-execute → execute → post-execute` 管线。MCP 工具走同一条 host 管线，没有单独的 MCP 审批开关。
- `subsys.integration.mcp-client` — 连接 supervisor、reconnect 预算、generation swap 的 T2 控制流。本页是 T1 可见面，不复述 backoff 公式。
- `subsys.execution.subprocess` — `scrubbedParentEnv` 的定义。stdio 孩子**不**进 `ctx.subprocess` 树；Host teardown 靠本 fiber 的 `connection.dispose` → SDK `client.close()`。
- shipped preset / `dsh-base` — 都不插本包。要让 `dsh web` 的模型看见 MCP 工具，写 host overlay，不要改四个 `agent.cordis.yml`。

`surface.tools.skill` 与本包无登记关系：`skill` 是另一条 `ctx.tools` 行，不消费 MCP。

## Sources

- packages/mcp/mcp-client/src/index.ts
- packages/mcp/mcp-client/src/tools.ts
- packages/mcp/mcp-client/src/transport.ts
- packages/mcp/mcp-client/src/connection.ts
- packages/mcp/mcp-client/package.json
- packages/mcp/mcp-client/tests/mcp-client.spec.ts
- packages/mcp/mcp-client/tests/apply.spec.ts
- packages/mcp/mcp-client/tests/load-path.spec.ts
- packages/mcp/mcp-client/tests/reconnect.spec.ts
- packages/mcp/mcp-client/tests/mcp-client.e2e.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- apps/cli/package.json
- apps/cli/tests/memory-mcp-configs.spec.ts
- examples/mcp-memory/mcp-reference-memory.cordis.yml
- examples/mcp-memory/engram.cordis.yml
- examples/mcp-memory/memorix.cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- packages/core/tools/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/subprocess/subprocess/src/index.ts

## 相关

无 index related。邻居节点：

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：模型 `tool-call` 进 `ctx.tools` 管线。
- [subsys.integration.mcp-client](../../subsystems/integration/mcp-client.md)（`subsys.integration.mcp-client`）：桥的控制流与 reconnect。
- [subsys.core.tools](../../subsystems/core/tools.md)（`subsys.core.tools`）：`schemas()` / `register` / 默认 `allow`。
