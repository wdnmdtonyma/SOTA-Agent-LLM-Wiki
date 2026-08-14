---
id: surface.acp.server
title: ACP server
kind: surface
tier: T1
pkg: integration
source:
  - packages/acp/acp/src/index.ts
  - packages/acp/acp/src/codec.ts
  - packages/acp/acp/package.json
  - packages/acp/acp/tests/bridge.spec.ts
  - packages/acp/acp/tests/turns.spec.ts
  - packages/acp/acp/tests/codec.spec.ts
  - packages/acp/acp/tests/approval.spec.ts
  - packages/acp/acp/tests/dispose.spec.ts
  - packages/acp/acp/tests/edges.spec.ts
  - packages/acp/acp/tests/multi-session.spec.ts
  - packages/examples/acp-demo/src/index.ts
  - packages/examples/acp-demo/src/bin.ts
  - packages/examples/acp-demo/package.json
  - examples/acp-agent/cordis.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/package.json
  - packages/boot/app-boot/src/profile.ts
  - packages/subagent/subagent-acp/src/index.ts
symbols:
  - apply
  - name
  - inject
  - Config
  - acpPromptToText
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-acp` 是 **automation-only** 的 Agent Client Protocol JSON-RPC stdio server：插件名 `acp`，`inject = ['agents']`。它只实现 `initialize` / `authenticate` / `newSession` / `prompt` / `cancel`；每次 `newSession` 铸造 `SessionId(randomUUID())` 再 `agents.create`。它不进 shipped bundle / preset，也不是 `dsh-subagent-acp` 那条进程外 Provider。

## 能回答的问题

- 本包实现哪些 ACP 方法？有没有 `loadSession` / resume / fork？
- 用户怎么启动这条 stdio 面？`dsh web` 会不会挂它？
- example 树挂的插件 id 为什么是 `acp-demo` / `acp-agent`，而不是 `acp`？
- `session/new` 对 `cwd` / `mcpServers` / `additionalDirectories` 怎么拒？prompt 收哪些 block？
- `initialize` 广告哪些 `promptCapabilities`？permission 只暴露哪两个 option？
- 本面和 [`subsys.orchestration.subagent-acp`](../../subsystems/orchestration/subagent-acp.md) / [`surface.sdk.typescript`](../sdk/typescript.md) 谁是 server、谁是另一条 JSON-RPC？

## 是什么

DSH 是 **Cordis 组合运行时**，主线是 `profile → bundle → agent preset`。capability seam 是 Definition / Provider / Consumer。**host 面**是进程级插件树（bundle / example `cordis.yml` 里的行）；**agent-preset 面**是每会话 `mountPreset` 的 tools / persona / isolate。默认产品路径是本地 Web GUI：`PROFILE_TEMPLATES` 只有 `web`（`dsh-base` + `dsh-web-app`）和 `headless`（`dsh-base` + `dsh-headless`），没有 shipped TUI。[E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116]

`@deepseek-ai/dsh-acp` 是 ACP **Agent 侧**桥：named export `name` / `inject` / `Config` / `apply`。[E: packages/acp/acp/package.json:2] [E: packages/acp/acp/src/index.ts:42] [E: packages/acp/acp/src/index.ts:44] [E: packages/acp/acp/src/index.ts:79] [E: packages/acp/acp/src/index.ts:105] `apply` 在 load 时立刻抓 `ctx.agents`，再用 `@agentclientprotocol/sdk` 的 `AgentSideConnection` + `ndJsonStream` 占住 stdout / stdin。[E: packages/acp/acp/src/index.ts:108] [E: packages/acp/acp/src/index.ts:353] [E: packages/acp/acp/src/index.ts:350]

`makeAgent` 返回的 handler **只有五门**：`initialize` / `authenticate` / `newSession` / `prompt` / `cancel`。[E: packages/acp/acp/src/index.ts:234] [E: packages/acp/acp/src/index.ts:247] [E: packages/acp/acp/src/index.ts:251] [E: packages/acp/acp/src/index.ts:277] [E: packages/acp/acp/src/index.ts:338] 源里没有 `loadSession`、没有 resume、没有 fork。`newSession` 一律 `SessionId(randomUUID())` 再 `agents.create`。[E: packages/acp/acp/src/index.ts:254] [E: packages/acp/acp/src/index.ts:259]

它**不是**：

| 容易混的实体 | 实际是什么 |
|---|---|
| `@deepseek-ai/dsh-acp-demo` | example 包装 app，插件名 `acp-demo`，内部 `ctx.plugin(acp, { provider, model })`。[E: packages/examples/acp-demo/src/index.ts:28] [E: packages/examples/acp-demo/src/index.ts:137] |
| `examples/acp-agent/cordis.yml` 的 `id: acp-agent` | 那份树里的 **行 id**；`name` 是 `@deepseek-ai/dsh-acp-demo`，不是 `id: acp`。[E: examples/acp-agent/cordis.yml:51] [E: examples/acp-agent/cordis.yml:52] |
| `@deepseek-ai/dsh-subagent-acp` | 父进程里的进程外 subagent Provider，插件名 `subagent-acp`，`inject = ['subagents', 'subprocess']`。[E: packages/subagent/subagent-acp/src/index.ts:23] [E: packages/subagent/subagent-acp/src/index.ts:24] |
| TypeScript JSON-RPC SDK | 另一条 automation JSON-RPC，方法表不是 ACP。见 [`surface.sdk.typescript`](../sdk/typescript.md) |

**host 面 vs agent-preset 面。** 本桥跑在自己的进程里。`agents.create` 只传 `sessionId` / `meta.cwd` / `agentOptions`，不 join preset、不 `isolate`。[E: packages/acp/acp/src/index.ts:260] [E: packages/acp/acp/src/index.ts:261] [E: packages/acp/acp/src/index.ts:262] example 的 sandbox / tools / `acp-demo` 写在同一份 `examples/acp-agent/cordis.yml`，模型可见行留在 **host 面** 全局层，不是 per-session remount。

## 入口

用户碰到这条面的方式：

| 入口 | 行为 |
|---|---|
| `dsh-acp-demo [--config path]` | `@deepseek-ai/dsh-acp-demo` 的 bin，默认 `./cordis.yml`。[E: packages/examples/acp-demo/package.json:17] [E: packages/examples/acp-demo/src/bin.ts:29] |
| `examples/acp-agent/cordis.yml` | 真实组合：`id: acp-agent` → `@deepseek-ai/dsh-acp-demo`。[E: examples/acp-agent/cordis.yml:51] [E: examples/acp-agent/cordis.yml:52] |
| `ctx.plugin(acp, { provider, model })` | `acp-demo.apply` 在 spine / JSONL / checkpoint / sqlite query 之后挂本包。[E: packages/examples/acp-demo/src/index.ts:137] |
| 生产 transport | `config.stream` 缺省时 `ndJsonStream(process.stdout, process.stdin)`。[E: packages/acp/acp/src/index.ts:349] [E: packages/acp/acp/src/index.ts:350] |
| 测试 transport | 注入运行时字段 `AcpConfig.stream?`；`Config` Schema 只声明可选 `provider` / `model`，没有 `stream` 键。[E: packages/acp/acp/src/index.ts:76] [E: packages/acp/acp/src/index.ts:79] [E: packages/acp/acp/src/index.ts:81] |

`dsh web` / `dsh --profile web` / `dsh --profile headless` **不会**挂本包。`dsh-base` 在 agent 栈之后 insert 的是 in-process `subagent` / `spawn` / `fork`，没有 `acp` / `acp-demo` 行。[E: packages/bundle/base/cordis.patch.yml:292] [E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/cordis.patch.yml:300] `dsh-base` 的 `dependencies` 同样是这三家 subagent 包，没有 `@deepseek-ai/dsh-acp`。[E: packages/bundle/base/package.json:87] [E: packages/bundle/base/package.json:88] [E: packages/bundle/base/package.json:89]

stdout 是协议帧。同进程不能挂 stdout logger。连接寿命挂在 `ctx.effect(() => quiesce, 'acp.connection')`；拆 fiber 会把 in-flight prompt 结成 `cancelled`，registry 里不再有该 agent。[E: packages/acp/acp/src/index.ts:414] [E: packages/acp/acp/tests/dispose.spec.ts:24] [E: packages/acp/acp/tests/dispose.spec.ts:26]

## 关键字段

### 插件身份

| 符号 | 值 | 含义 |
|---|---|---|
| npm 包 | `@deepseek-ai/dsh-acp` | 不是 `@deepseek-ai/dsh-acp-demo`，也不是 `@deepseek-ai/dsh-subagent-acp`。[E: packages/acp/acp/package.json:2] |
| `name` | `'acp'` | Cordis 插件 id。[E: packages/acp/acp/src/index.ts:42] |
| `inject` | `['agents']` | 只注入 `ctx.agents`。handlers 跑在 injection 作用域外，所以 `apply` 先把 `ctx.agents` 抓进闭包。[E: packages/acp/acp/src/index.ts:44] [E: packages/acp/acp/src/index.ts:108] |
| `Config` / `AcpConfig` | Schema：可选 `provider` / `model` | 接口另有运行时 `stream?`；省略的 provider/model **不会**写成 `undefined` 字段，agent `options` 是 `{}`。[E: packages/acp/acp/src/index.ts:80] [E: packages/acp/acp/src/index.ts:81] [E: packages/acp/acp/src/index.ts:424] [E: packages/acp/acp/tests/bridge.spec.ts:62] |
| `agentInfo` | `name: 'deepseek-harness-acp'`，`version: '0.0.1'` | 钉在 wire 上，和 npm `0.1.0-rc.5` 不是同一个数。[E: packages/acp/acp/src/index.ts:239] [E: packages/acp/acp/package.json:4] |

`acp-demo` 的 `Config` 则把 `provider` / `model` 标成 required，再转交给本包。[E: packages/examples/acp-demo/src/index.ts:80] [E: packages/examples/acp-demo/src/index.ts:81] [E: packages/examples/acp-demo/src/index.ts:137]

### ACP 方法表

| 方法 | 行为 |
|---|---|
| `initialize` | 回 `PROTOCOL_VERSION`、`agentInfo`、`promptCapabilities` 全 `false`、`authMethods: []`。测试钉死这个对象，没有 load / resume / list / fork 广告。[E: packages/acp/acp/src/index.ts:241] [E: packages/acp/acp/src/index.ts:243] [E: packages/acp/acp/tests/bridge.spec.ts:21] |
| `authenticate` | no-op：`Promise.resolve()`。[E: packages/acp/acp/src/index.ts:248] |
| `newSession` | `validateSessionParams` → `SessionId(randomUUID())` → `agents.create` → `sessions.set` → `{ sessionId }`。[E: packages/acp/acp/src/index.ts:254] [E: packages/acp/acp/src/index.ts:274] |
| `prompt` | 单槽。未知 session / 已有 `inflight` / 非 baseline block / trim 后空串都会拒。通过后 `acpPromptToText` 拼成一条 user text，再 `followup`。[E: packages/acp/acp/src/index.ts:281] [E: packages/acp/acp/src/index.ts:284] [E: packages/acp/acp/src/index.ts:287] [E: packages/acp/acp/src/index.ts:307] |
| `cancel` | 未知 session 直接成功；已知则 `agent.cancel({ kind: 'user' })` 并把 prompt 结成 `cancelled`。[E: packages/acp/acp/src/index.ts:340] [E: packages/acp/acp/src/index.ts:341] [E: packages/acp/acp/src/index.ts:342] |

`newSession` 校验：`cwd` 必须绝对路径；`additionalDirectories` 非空拒；`mcpServers.length > 0` 拒。[E: packages/acp/acp/src/index.ts:431] [E: packages/acp/acp/src/index.ts:433] [E: packages/acp/acp/src/index.ts:435] 空数组的 `additionalDirectories` 可以通过。[E: packages/acp/acp/tests/bridge.spec.ts:107]

同一 session 同时只能一个 prompt；第二个在第一个 idle / cancel 之前报 `already in flight`。[E: packages/acp/acp/tests/turns.spec.ts:192] 不同 session 可以同时 `prompt`，更新按 `sessionId` 分路。[E: packages/acp/acp/tests/multi-session.spec.ts:31] 若 `ctx.agents.get(record.agent.id) !== record.agent`（loop 被拆、桥记录还在），拒 `prompt was not queued`。[E: packages/acp/acp/src/index.ts:293]

### codec 与回程

`acpPromptToText`：`text` 原样拼接；`resource_link` 收成 `\n[resource_link name=… uri=…]\n`；其余 type 在 flatten 时丢掉。[E: packages/acp/acp/src/codec.ts:47] [E: packages/acp/acp/src/codec.ts:49] 多块 `text` 直接相连（测试期望 `'first second'`），**不**把 ACP framing 交给模型。[E: packages/acp/acp/tests/bridge.spec.ts:77]

`promptHasUnsupportedContent`：任一 block 既不是 `text` 也不是 `resource_link` 则为 true——`prompt` 会 `invalidParams`，而不是静默丢掉。[E: packages/acp/acp/src/codec.ts:65] [E: packages/acp/acp/src/index.ts:284]

回程只转 **已提交** 的 `assistant/message`：`text` 变 `agent_message_chunk`；`image` 变 `[image attachment <id>]` 占位。tool / plan / title / reasoning 不上 automation wire。[E: packages/acp/acp/src/index.ts:165] [E: packages/acp/acp/src/index.ts:176] [E: packages/acp/acp/tests/edges.spec.ts:38]

`turnEndToStopReason`：`completed`→`end_turn`；`max-tokens`→`max_tokens`；`aborted` / `blocked` / `error`→`end_turn`；`interrupted`→`cancelled`。[E: packages/acp/acp/src/codec.ts:17] [E: packages/acp/acp/src/codec.ts:19] [E: packages/acp/acp/src/codec.ts:24] [E: packages/acp/acp/src/codec.ts:26] [E: packages/acp/acp/tests/codec.spec.ts:8]

prompt RPC 在 whole-agent idle 时结算：若 `end.kind === 'max-tokens'` 强制 `'end_turn'`，**覆盖** codec 的 `max_tokens`。[E: packages/acp/acp/src/index.ts:331] 测试钉 token-limit 的 `stopReason` 是 `end_turn` 且已提交文本仍发出。[E: packages/acp/acp/tests/turns.spec.ts:40] 客户端 `session/cancel` 才报 `cancelled`；hook / 其它 owner 的 `agent.cancel` 走到 `aborted`，codec 映射成 `end_turn`。[E: packages/acp/acp/tests/turns.spec.ts:219]

### permission

`approval/request` 是 waterfall：本桥拥有该 agent 且带 `callId` 时自己答完；否则 `return next()`。[E: packages/acp/acp/src/index.ts:215] [E: packages/acp/acp/src/index.ts:217] 只发两个 option：`allow-once` / `reject-once`。没有 `allow_always`。[E: packages/acp/acp/src/index.ts:222] [E: packages/acp/acp/src/index.ts:223] 客户端 `cancelled` → `'cancelled'`；`optionId === 'allow-once'` → `'allowed-once'`；其它（含未知 id）→ `'rejected'`，不推断长期授权。[E: packages/acp/acp/src/index.ts:226] [E: packages/acp/acp/src/index.ts:227] [E: packages/acp/acp/tests/approval.spec.ts:50]

## 装配与门控

**不进 shipped 树。** `PROFILE_TEMPLATES` 只有 `web` / `headless`。[E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116] `@deepseek-ai/dsh-web-app` / `@deepseek-ai/dsh-headless` 是那两份 overlay bundle 的包名，各自声明 `dsh.bundle.patch`。[E: packages/bundle/web-app/package.json:2] [E: packages/bundle/web-app/package.json:43] [E: packages/bundle/headless/package.json:2] [E: packages/bundle/headless/package.json:43] 这两份 manifest 与四个 shipped `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml` 都没有 `@deepseek-ai/dsh-acp` / `id: acp` 行。[I]

真实组合是 example：`dsh-acp-demo` boot `cordis.yml`，叶子再 `ctx.plugin` 本包。[E: packages/examples/acp-demo/src/bin.ts:29] [E: packages/examples/acp-demo/src/index.ts:137] 换这条 automation 面 = overlay example / 自组 `dsh-acp`（或 `dsh-acp-demo`），不是改 `dsh-base`。

门控（客户端会直接撞上）：

1. `cwd` 非绝对、非空 `additionalDirectories`、非空 `mcpServers` → `newSession` 失败，不会 `create`。[E: packages/acp/acp/src/index.ts:431] [E: packages/acp/acp/src/index.ts:435]
2. image / audio / embedded resource 在 `initialize` 标 `false`；prompt 里再出现就 `only text and resource_link`。[E: packages/acp/acp/src/index.ts:241] [E: packages/acp/acp/src/index.ts:284]
3. 单槽 prompt；空串（含只空白）拒。[E: packages/acp/acp/src/index.ts:281] [E: packages/acp/acp/src/index.ts:287]
4. 本桥拆卸之后，新的 `newSession` 报 disposed，registry 为空，不会留下 orphan agent。[E: packages/acp/acp/tests/dispose.spec.ts:165] [E: packages/acp/acp/tests/dispose.spec.ts:166]
5. permission 只有 once；未知 `optionId` 当 `rejected`。[E: packages/acp/acp/tests/approval.spec.ts:50]

`inject` 只有 `agents`。[E: packages/acp/acp/src/index.ts:44] continuable 子树拆卸通过 `ctx.get('subagents')` 结构读取 `drainContinuableDescendants`；该键缺失时跳过 drain。[E: packages/acp/acp/src/index.ts:376] [E: packages/acp/acp/src/index.ts:377] [E: packages/acp/acp/src/index.ts:379] 本包 `apply` 不 `provide('subagents')`。[I]

## 跨包关系

- [`spine.overview`](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。本包不进默认 profile。
- [`subsys.integration.acp`](../../subsystems/integration/acp.md)（`subsys.integration.acp`）：同一桥的 T2 控制流 / codec 表 / 拆卸顺序。本页只写产品可见面。
- [`subsys.orchestration.subagent-acp`](../../subsystems/orchestration/subagent-acp.md)（`subsys.orchestration.subagent-acp`）：父进程 `AcpProvider`，`ctx.subprocess.spawn` 一个讲 ACP 的孩子；那是 Client，不是本 server。[E: packages/subagent/subagent-acp/src/index.ts:146] [E: packages/subagent/subagent-acp/src/index.ts:162]
- [`surface.sdk.typescript`](../sdk/typescript.md)（`surface.sdk.typescript`）：另一条 automation JSON-RPC（方法表不是 ACP 的 `newSession` / `prompt` / `cancel`）。

## Sources

- packages/acp/acp/src/index.ts
- packages/acp/acp/src/codec.ts
- packages/acp/acp/package.json
- packages/acp/acp/tests/bridge.spec.ts
- packages/acp/acp/tests/turns.spec.ts
- packages/acp/acp/tests/codec.spec.ts
- packages/acp/acp/tests/approval.spec.ts
- packages/acp/acp/tests/dispose.spec.ts
- packages/acp/acp/tests/edges.spec.ts
- packages/acp/acp/tests/multi-session.spec.ts
- packages/examples/acp-demo/src/index.ts
- packages/examples/acp-demo/src/bin.ts
- packages/examples/acp-demo/package.json
- examples/acp-agent/cordis.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/package.json
- packages/bundle/headless/package.json
- packages/boot/app-boot/src/profile.ts
- packages/subagent/subagent-acp/src/index.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：组合主线与 host / preset 切面。
- [subsys.integration.acp](../../subsystems/integration/acp.md)（`subsys.integration.acp`）：ACP 桥 T2。
- [subsys.orchestration.subagent-acp](../../subsystems/orchestration/subagent-acp.md)（`subsys.orchestration.subagent-acp`）：进程外 ACP Client / Provider。
- [surface.sdk.typescript](../sdk/typescript.md)（`surface.sdk.typescript`）：另一条 JSON-RPC 可见面。
