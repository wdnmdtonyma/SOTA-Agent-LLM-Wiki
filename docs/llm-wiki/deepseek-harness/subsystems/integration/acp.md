---
id: subsys.integration.acp
title: ACP codec / server
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/acp/acp/src/index.ts
  - packages/acp/acp/src/codec.ts
  - packages/acp/acp/package.json
  - packages/acp/acp/tests/turns.spec.ts
  - packages/acp/acp/tests/codec.spec.ts
  - packages/acp/acp/tests/bridge.spec.ts
  - packages/acp/acp/tests/approval.spec.ts
  - packages/acp/acp/tests/dispose.spec.ts
  - packages/examples/acp-demo/src/index.ts
  - examples/acp-agent/cordis.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/subagent/subagent-acp/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - apply
  - name
  - inject
  - acpPromptToText
  - turnEndToStopReason
related:
  - spine.overview
  - surface.acp.server
  - subsys.orchestration.subagent-acp
  - subsys.core.agent
  - subsys.integration.sdk-server
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-acp` 是 **automation-only** 的 ACP JSON-RPC stdio server：插件名 `acp`，`inject = ['agents']`。它只实现 `initialize` / `authenticate` / `newSession` / `prompt` / `cancel`，每次 `newSession` 用 `agents.create` 拿 **fresh** `SessionId(randomUUID())`。它不进 shipped bundle，也不是 `dsh-subagent-acp` 那条进程外 subagent Provider。

## 能回答的问题

- `@deepseek-ai/dsh-acp` 实现哪些 ACP 方法？有没有 `loadSession` / resume / fork？
- codec 收哪些 prompt block？`initialize` 怎样广告 image / audio / embeddedContext？
- `session/new` 怎样铸造 session？`cwd` / `mcpServers` / `additionalDirectories` 哪些会拒？
- permission 只暴露哪两个 option？waterfall 不 `next()` 会怎样？
- 本包进不进 `dsh-base` / shipped preset？example 树挂的插件 id 为什么是 `acp-demo` 而不是 `acp`？
- 本页和 [`subsys.orchestration.subagent-acp`](../orchestration/subagent-acp.md) 谁是 server、谁是 spawn 孩子的 Client？

## 职责边界

本包拥有 **ACP Agent 侧** 的 JSON-RPC 桥：named export `name` / `inject` / `Config` / `apply`，加上纯函数 codec。`apply` 在 load 时立刻捕获 `ctx.agents`，再用 `@agentclientprotocol/sdk` 的 `AgentSideConnection` + `ndJsonStream` 占住 stdout / stdin。[E: packages/acp/acp/src/index.ts:42] [E: packages/acp/acp/src/index.ts:44] [E: packages/acp/acp/src/index.ts:105] [E: packages/acp/acp/package.json:2]

`makeAgent` 返回的 handler 对象**只有**五门：`initialize` / `authenticate` / `newSession` / `prompt` / `cancel`。[E: packages/acp/acp/src/index.ts:234] [E: packages/acp/acp/src/index.ts:247] [E: packages/acp/acp/src/index.ts:251] [E: packages/acp/acp/src/index.ts:277] [E: packages/acp/acp/src/index.ts:338] 源里没有 `loadSession`、没有 resume、没有 fork。`newSession` 一律 `SessionId(randomUUID())` 再 `agents.create`。[E: packages/acp/acp/src/index.ts:254] [E: packages/acp/acp/src/index.ts:259]

它**不**拥有：

- `ctx.agents` Definition、`create` / `followup` / `cancel` / `whenIdle` 合同 — [`subsys.core.agent`](../core/agent.md)（`subsys.core.agent`）。本包是 Consumer：`inject = ['agents']`。[E: packages/acp/acp/src/index.ts:44]
- 进程外 subagent Provider（父进程 `ctx.subprocess.spawn` 一个讲 ACP 的孩子）— [`subsys.orchestration.subagent-acp`](../orchestration/subagent-acp.md)（`subsys.orchestration.subagent-acp`）。那包插件名是 `subagent-acp`，`inject = ['subagents', 'subprocess']`，和本包不是同一个 id。[E: packages/subagent/subagent-acp/src/index.ts:23] [E: packages/subagent/subagent-acp/src/index.ts:24]
- 另一条 automation JSON-RPC（`initialize` / `session/prompt` / `shutdown`，方法表不同）— [`subsys.integration.sdk-server`](sdk-server.md)（`subsys.integration.sdk-server`）。不要把 ACP 方法抄到 SDK 页。
- example 组合 app `@deepseek-ai/dsh-acp-demo`（插件名 `acp-demo`）。example 树挂的是这一行，不是本包的 `id: acp`。[E: packages/examples/acp-demo/src/index.ts:28] [E: examples/acp-agent/cordis.yml:51] [E: examples/acp-agent/cordis.yml:52]
- shipped 默认产品树。`dsh-base` patch 在 agent 栈之后只 insert `subagent` + in-process `spawn` / `fork`，没有 `acp` / `acp-demo` 行。[E: packages/bundle/base/cordis.patch.yml:292] [E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/cordis.patch.yml:300] `dsh-base` 的 `dependencies` 同样只有这三家 subagent 包，没有 `@deepseek-ai/dsh-acp`。[E: packages/bundle/base/package.json:87] [E: packages/bundle/base/package.json:88] [E: packages/bundle/base/package.json:89] `dsh-web-app` / `dsh-headless` 的 manifest 与四个 shipped preset 的 `agent.cordis.yml` 同样没有本包行。[I] 默认安装路径仍是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI。

**host 面 vs agent-preset 面。** 本桥跑在自己的进程里，把 model-facing 行留在 **host 面** 全局层：`agents.create` 只传 `sessionId` / `meta.cwd` / `agentOptions`，不 join preset、不 `isolate`。[E: packages/acp/acp/src/index.ts:259] [E: packages/acp/acp/src/index.ts:261] [E: packages/acp/acp/src/index.ts:262] example 的 tools / sandbox 和 `acp-demo` 写在同一份 `examples/acp-agent/cordis.yml`，不是 per-session remount。

**waterfall 只有一条。** `approval/request` 是 waterfall：本桥拥有该 agent 且带 `callId` 时自己答完，**不**调用 `next()`；否则 `return next()`。[E: packages/acp/acp/src/index.ts:215] [E: packages/acp/acp/src/index.ts:217] Cordis 全局规则：`next()` 才会 `cbs.shift()`；不调用就停在本层，内层（含内置行为）不跑。[E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:239] `session/event` / `agent/inbox/claimed` / `agent/error` 是普通 `ctx.on`，不是 waterfall。连接寿命是可逆 `ctx.effect(() => quiesce, 'acp.connection')`。[E: packages/acp/acp/src/index.ts:414]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/acp/acp/src/index.ts` | named export 插件：`name` / `inject` / `Config` / `apply`；`AcpAgent` 五门；approval waterfall；stdio 接线 |
| `packages/acp/acp/src/codec.ts` | `acpPromptToText` / `promptHasUnsupportedContent` / `turnEndToStopReason` |
| `packages/acp/acp/package.json` | 包名 `@deepseek-ai/dsh-acp` |
| `packages/examples/acp-demo/src/index.ts` | example app：插件名 `acp-demo`，内部 `ctx.plugin(acp, { provider, model })` |
| `examples/acp-agent/cordis.yml` | 真实挂载：`id: acp-agent` / `name: '@deepseek-ai/dsh-acp-demo'` |
| `packages/acp/acp/tests/bridge.spec.ts` | 广告面、fresh session、cwd / MCP 拒、text + `resource_link` |
| `packages/acp/acp/tests/codec.spec.ts` | `turnEndToStopReason` 表；`acpPromptToText` 丢掉非 baseline block |
| `packages/acp/acp/tests/turns.spec.ts` | 单槽 prompt、`max-tokens`→`end_turn`、hook abort、cancel |
| `packages/acp/acp/tests/approval.spec.ts` | `allow-once` / `reject-once`；未知 option 不升格为长期授权 |
| `packages/bundle/base/cordis.patch.yml` | shipped 核树：没有本包 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` / `inject` | `'acp'`；`['agents']`。handlers 跑在 injection 作用域外，所以 `apply` 里先把 `ctx.agents` 抓进闭包。[E: packages/acp/acp/src/index.ts:42] [E: packages/acp/acp/src/index.ts:44] [E: packages/acp/acp/src/index.ts:108] |
| `Config` / `AcpConfig` | Schema 只有可选 `provider` / `model`。接口另有运行时 `stream?`，生产走 stdio，测试注入 transport；Schema **不**声明 `stream`。[E: packages/acp/acp/src/index.ts:80] [E: packages/acp/acp/src/index.ts:81] |
| `SessionRecord` | 每条 ACP session：`agent`、`dispose`、至多一个 `inflight`（`messageId` / `turn` / `endReason`）。 |
| `agentInfo` | wire 上钉 `name: 'deepseek-harness-acp'`、`version: '0.0.1'`——和 `package.json` 的 `0.1.0-rc.5` 不是同一个数。[E: packages/acp/acp/src/index.ts:239] [E: packages/acp/acp/package.json:4] |
| `agentCapabilities` | 只广告 `promptCapabilities: { image: false, audio: false, embeddedContext: false }`。没有 session persistence 字段。[E: packages/acp/acp/src/index.ts:241] |
| `authMethods` | `[]`。`authenticate` 仍是 no-op 成功。[E: packages/acp/acp/src/index.ts:243] [E: packages/acp/acp/src/index.ts:248] |
| `acpPromptToText` | `text` 原样拼接；`resource_link` 收成 `\n[resource_link name=… uri=…]\n`；其余 type 在 flatten 时丢掉。[E: packages/acp/acp/src/codec.ts:47] [E: packages/acp/acp/src/codec.ts:49] |
| `promptHasUnsupportedContent` | 任一 block 既不是 `text` 也不是 `resource_link` 则为 true——拒，而不是静默丢掉。[E: packages/acp/acp/src/codec.ts:65] |
| `turnEndToStopReason` | `completed`→`end_turn`；`max-tokens`→`max_tokens`；`aborted` / `blocked` / `error`→`end_turn`；`interrupted`→`cancelled`。[E: packages/acp/acp/src/codec.ts:17] [E: packages/acp/acp/src/codec.ts:19] [E: packages/acp/acp/src/codec.ts:24] [E: packages/acp/acp/src/codec.ts:26] [E: packages/acp/acp/src/codec.ts:29] |
| permission options | 只发 `{ optionId: 'allow-once', kind: 'allow_once' }` 与 `{ optionId: 'reject-once', kind: 'reject_once' }`。没有 `allow_always`。[E: packages/acp/acp/src/index.ts:222] [E: packages/acp/acp/src/index.ts:223] |

`newSession` 校验：`cwd` 必须绝对路径；`additionalDirectories` 非空拒；`mcpServers.length > 0` 拒。[E: packages/acp/acp/src/index.ts:431] [E: packages/acp/acp/src/index.ts:433] [E: packages/acp/acp/src/index.ts:435] 空数组的 `additionalDirectories` 可以通过。[E: packages/acp/acp/tests/bridge.spec.ts:107]

## 控制流

1. Loader 取 named export。`export const name = 'acp'`、`export const inject = ['agents']`、`export function apply`。[E: packages/acp/acp/src/index.ts:42] [E: packages/acp/acp/src/index.ts:44] [E: packages/acp/acp/src/index.ts:105] 包名是 `@deepseek-ai/dsh-acp`。[E: packages/acp/acp/package.json:2]

2. `apply@packages/acp/acp/src/index.ts` 先抓 `const agents = ctx.agents`，再建 `sessions` Map。[E: packages/acp/acp/src/index.ts:108] [E: packages/acp/acp/src/index.ts:110] 生产 transport 是 `ndJsonStream(process.stdout, process.stdin)`；测试走 `config.stream`。[E: packages/acp/acp/src/index.ts:349] 然后 `new AgentSideConnection(makeAgent, stream)`，并用 `ctx.effect(() => quiesce, 'acp.connection')` 把拆卸挂到 fiber。[E: packages/acp/acp/src/index.ts:353] [E: packages/acp/acp/src/index.ts:414]

3. 客户端 `initialize`：回 `PROTOCOL_VERSION`、`agentInfo`、`promptCapabilities` 全 `false`、`authMethods: []`。测试钉死这个对象，没有 load / resume / list / fork 广告。[E: packages/acp/acp/src/index.ts:238] [E: packages/acp/acp/src/index.ts:241] [E: packages/acp/acp/tests/bridge.spec.ts:21] `authenticate` 直接 `Promise.resolve()`。[E: packages/acp/acp/src/index.ts:248]

4. `newSession@packages/acp/acp/src/index.ts`：`validateSessionParams` 之后 `const sessionId = SessionId(randomUUID())`，再 `agents.create({ sessionId, meta: { cwd: params.cwd }, agentOptions })`。[E: packages/acp/acp/src/index.ts:254] [E: packages/acp/acp/src/index.ts:259] 成功才 `sessions.set` 并 `return { sessionId }`。[E: packages/acp/acp/src/index.ts:269] [E: packages/acp/acp/src/index.ts:274] 省略的 `provider` / `model` 不会写成 `undefined` 字段，agent `options` 是 `{}`。[E: packages/acp/acp/src/index.ts:424] [E: packages/acp/acp/tests/bridge.spec.ts:62]

5. `prompt@packages/acp/acp/src/index.ts`：未知 `sessionId` → `invalidParams`；已有 `inflight` → `a prompt is already in flight`；`promptHasUnsupportedContent` → `only text and resource_link`；trim 后空串 → `empty prompt`。[E: packages/acp/acp/src/index.ts:126] [E: packages/acp/acp/src/index.ts:281] [E: packages/acp/acp/src/index.ts:284] [E: packages/acp/acp/src/index.ts:287] 若 `ctx.agents.get(record.agent.id) !== record.agent`（loop 被拆、桥记录还在），拒 `prompt was not queued`，避免往已 dispose 的机器静默投递。[E: packages/acp/acp/src/index.ts:293] [E: packages/acp/acp/src/index.ts:294]

6. 通过校验后 `createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })`，先武装 `inflight` 再 `record.agent.followup(message)`。[E: packages/acp/acp/src/index.ts:296] [E: packages/acp/acp/src/index.ts:305] [E: packages/acp/acp/src/index.ts:307] 文本由 `acpPromptToText` 拼出：多块 `text` 直接相连，`resource_link` 变成括号引用，**不**把 ACP framing 交给模型。[E: packages/acp/acp/src/codec.ts:43] [E: packages/acp/acp/tests/bridge.spec.ts:77] [E: packages/acp/acp/tests/bridge.spec.ts:137]

7. 回程只转 **已提交** 的 `assistant/message`：`text` 变 `agent_message_chunk`；`image` 变 `[image attachment <id>]` 占位。raw chunk / reasoning / tool / plan / title 不上 automation wire。[E: packages/acp/acp/src/index.ts:159] [E: packages/acp/acp/src/index.ts:165] [E: packages/acp/acp/src/index.ts:176]

8. 结算等 `agent.whenIdle()`，不是单看 `turn/end`。相关 `turn/end` 若 `reason.kind === 'error'`，立刻 `rejectFromError`（prompt RPC 失败）；其它 kind 写入 `inflight.endReason`。[E: packages/acp/acp/src/index.ts:186] [E: packages/acp/acp/src/index.ts:192] idle 时若没有 `endReason`（admission 丢掉 prompt）→ `cancelled`；若 `end.kind === 'max-tokens'` → 强制 `'end_turn'`，**覆盖** codec 的 `max_tokens`；其余走 `turnEndToStopReason`。[E: packages/acp/acp/src/index.ts:327] [E: packages/acp/acp/src/index.ts:331] 测试钉 token-limit 的 `stopReason` 是 `end_turn` 且已提交文本仍发出。[E: packages/acp/acp/tests/turns.spec.ts:40] hook / 其它 owner 的 `agent.cancel` 走到 `aborted`，codec 映射成 `end_turn`，不是客户端 `session/cancel`。[E: packages/acp/acp/src/codec.ts:24] [E: packages/acp/acp/tests/turns.spec.ts:219]

9. `cancel@packages/acp/acp/src/index.ts`：未知 session 直接成功返回；已知则 `record.agent.cancel({ kind: 'user' })` 并 `settlePrompt(record, 'cancelled')`。[E: packages/acp/acp/src/index.ts:340] [E: packages/acp/acp/src/index.ts:341] [E: packages/acp/acp/src/index.ts:342] 同一 session 同时只能一个 prompt。[E: packages/acp/acp/tests/turns.spec.ts:192]

10. `approval/request` waterfall：`ownedRecord` 失败或没有 `callId` 就 `return next()`，把决定交给链上后人。[E: packages/acp/acp/src/index.ts:217] 否则 `conn.requestPermission` 只带 `allow-once` / `reject-once`。[E: packages/acp/acp/src/index.ts:218] [E: packages/acp/acp/src/index.ts:222] 客户端 `cancelled` → `'cancelled'`；`optionId === 'allow-once'` → `'allowed-once'`；其它（含未知 id）→ `'rejected'`，不推断长期授权。[E: packages/acp/acp/src/index.ts:226] [E: packages/acp/acp/src/index.ts:227] 测试：未知 `optionId` 是 `rejected`；客户端抛错组合结果是 `unavailable`。[E: packages/acp/acp/tests/approval.spec.ts:50] [E: packages/acp/acp/tests/approval.spec.ts:57] 不调用 `next()` 时，`Events.waterfall` 不会 `shift` 到下一层。[E: vendor/cordis/src/events.ts:238]

11. 拆卸 `quiesce`：`closed = true`，先对每条 record `cancel({ kind: 'user' })` + `settlePrompt(..., 'cancelled')`，再（若 `ctx.get('subagents')` 有该方法）`drainContinuableDescendants`，最后 `handle.dispose()`。[E: packages/acp/acp/src/index.ts:358] [E: packages/acp/acp/src/index.ts:365] [E: packages/acp/acp/src/index.ts:379] 测试：`acpFiber.dispose()` 后 in-flight prompt 的 `stopReason` 是 `cancelled`，registry 里不再有该 agent。[E: packages/acp/acp/tests/dispose.spec.ts:24] [E: packages/acp/acp/tests/dispose.spec.ts:26]

12. **不进 shipped 树。** `dsh-base` 只 insert `subagent` + in-process `spawn` / `fork`，没有 `acp` 行。[E: packages/bundle/base/cordis.patch.yml:292] [E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/cordis.patch.yml:300] 真实组合是 example：`id: acp-agent` 加载 `@deepseek-ai/dsh-acp-demo`，后者再 `ctx.plugin(acp, { provider, model })`。[E: examples/acp-agent/cordis.yml:51] [E: examples/acp-agent/cordis.yml:52] [E: packages/examples/acp-demo/src/index.ts:137] 同进程 stdout 被 `ndJsonStream` 占成协议帧。[E: packages/acp/acp/src/index.ts:350]

## 设计动机

这是给受信任程序（IDE、脚本、`dsh-subagent-acp` 拉起的孩子）用的窄桥，不是第二套 Web / TUI。所以 wire 上只留 prompt 文本、已提交 assistant 文本、取消、一次性 permission。presentation（thinking、tool 进度、plan、title）留在 harness 自己的 UI 模块。

fresh-session only：ACP session 字符串由本桥铸造，对应一次 `agents.create`。没有 `loadSession`，capabilities 也不广告 persistence，避免客户端以为能 resume / fork 同一条 harness log。

codec 对非 baseline block **fail-loud**。规范要求每个 agent 接受 `text` 与 `resource_link`；image / audio / embedded resource 是可选能力，本桥在 `initialize` 标 `false`，prompt 里再出现就 `invalidParams`，而不是 flatten 时默默丢掉（`acpPromptToText` 的 `default: []` 只用于已经通过检查的调用）。

`max-tokens` 在 codec 里仍映射 `max_tokens`，但 prompt RPC 在 whole-agent idle 时改报 `end_turn`：token-limit 不是这条 automation 合同的 prompt 级 stop reason，客户端应把已提交文本当普通收工。客户端 `session/cancel` 才报 `cancelled`；hook 取消走 `aborted`→`end_turn`，避免「别人停了 turn」被当成 ACP cancel。

permission 只有 once：自动化客户端（包括 `dsh-subagent-acp`）没有人机「永远允许」面；未知 `optionId` 当 `rejected`，防止把陌生回复升格成 durable grant。

`inject` 只有 `agents`。continuable 子树的拆卸通过 `ctx.get('subagents')` 结构读取 `drainContinuableDescendants`，本包不 depend 整条 subagent seam——没有挂 `subagents` 时当「没有 continuable 孩子」。

## Gotcha

- **不是 `dsh web` 默认树。** 仓库有 `@deepseek-ai/dsh-acp` ≠ `dsh-base` 装了它。默认产品仍是本地 Web GUI。
- **example 插件 id 是 `acp-demo`，不是 `acp`。** `examples/acp-agent/cordis.yml` 的 `id: acp-agent` / `name: '@deepseek-ai/dsh-acp-demo'` 是包装 app；它再 `ctx.plugin` 本包。不要把两行写成同一个插件。[E: examples/acp-agent/cordis.yml:52] [E: packages/examples/acp-demo/src/index.ts:137]
- **不要和 `subagent-acp` 混页。** `dsh-subagent-acp` 是父进程里的 `AcpProvider`，`inject` 含 `subprocess`，去 spawn 一个讲 ACP 的孩子。本包是孩子进程里的 **server**。[E: packages/subagent/subagent-acp/src/index.ts:23]
- **没有 `loadSession`。** handler 对象只有五门；`initialize` 不广告 session persistence。客户端发 load / resume / fork 不是本桥合同。
- **image / audio / embeddedContext 在 prompt 里会被拒。** 只收 `text` 与 `resource_link`。助手侧若产出 image block，会改写成 attachment 占位文本，不会变成 ACP image 块。[E: packages/acp/acp/src/index.ts:284] [E: packages/acp/acp/src/index.ts:176]
- **`turnEndToStopReason('max-tokens')` 是 `max_tokens`，但 `prompt` 结算报 `end_turn`。** 读 codec 表不够，要看 `whenIdle` 那条三元。[E: packages/acp/acp/src/codec.ts:19] [E: packages/acp/acp/src/index.ts:331]
- **单槽。** 第二个 `prompt` 在第一个 idle / cancel 之前是 `already in flight`。同步 `followup` 失败必须清掉 `inflight`，否则后面每次都报 in flight。
- **`cwd` 必须绝对；不接 MCP server；不接额外 directory。** 相对路径、`mcpServers: [{…}]`、非空 `additionalDirectories` 都在 `newSession` 失败，不会 `create`。[E: packages/acp/acp/src/index.ts:431] [E: packages/acp/acp/src/index.ts:435]
- **stdout 是协议帧。** 同进程不能挂 stdout logger。`agentInfo.version`（`0.0.1`）也不是 npm 包版本。
- **waterfall 必须 `next()`。** 本桥不认领的 approval 一定要 `next()`，否则内置策略永远走不到。认领之后不要再 `next()`，否则会双答。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition（DSH）** | `@deepseek-ai/dsh-agent` 的 `AgentRegistry` | `ctx.agents`。**host**：`dsh-base` 挂 agent + agent-loop。本包不 `provide` 这个键 |
| **Definition（wire）** | `@agentclientprotocol/sdk` 的 `Agent` 方法面 | 不是 DSH ctx 键。本包只实现五门，不实现 `loadSession` |
| **Provider（本页）** | `@deepseek-ai/dsh-acp` 的 `apply` / `AgentSideConnection` | 插件名 `acp`，`inject = ['agents']`。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / 任一 shipped preset |
| **Provider（example 包装）** | `@deepseek-ai/dsh-acp-demo` | 插件名 `acp-demo`。example：`id: acp-agent` / `name: '@deepseek-ai/dsh-acp-demo'`，内部 `ctx.plugin(acp, …)` |
| **Consumer（DSH 内）** | 本包 `newSession` → `agents.create`；`prompt` → `followup` / `whenIdle` | 无 preset `isolate`；`meta.cwd` 来自 ACP `cwd` |
| **Consumer（wire）** | 外部 ACP 客户端。进程外委托是 `dsh-subagent-acp` 的 `AcpProvider` | 那是父进程 Client，**不是**本页。fixture 挂 `id: subagent-acp` |

换这条 automation 面 = overlay example / 自组 `dsh-acp`（或 `dsh-acp-demo`），不是改 `dsh-base`。本包不往 `ctx.subagents` 注册任何 Provider。

## Sources

- packages/acp/acp/src/index.ts
- packages/acp/acp/src/codec.ts
- packages/acp/acp/package.json
- packages/acp/acp/tests/turns.spec.ts
- packages/acp/acp/tests/codec.spec.ts
- packages/acp/acp/tests/bridge.spec.ts
- packages/acp/acp/tests/approval.spec.ts
- packages/acp/acp/tests/dispose.spec.ts
- packages/examples/acp-demo/src/index.ts
- examples/acp-agent/cordis.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/subagent/subagent-acp/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。本包不进默认 profile。
- [surface.acp.server](../../surface/acp/server.md)（`surface.acp.server`）：ACP 对外可见面（方法表、stdio 入口）的短页。
- [subsys.orchestration.subagent-acp](../orchestration/subagent-acp.md)（`subsys.orchestration.subagent-acp`）：父进程 `AcpProvider`，spawn 讲 ACP 的孩子；不是本 server。
- [subsys.core.agent](../core/agent.md)（`subsys.core.agent`）：`ctx.agents` Definition；本包 `create` / `followup` / `cancel` 的合同。
- [subsys.integration.sdk-server](sdk-server.md)（`subsys.integration.sdk-server`）：另一条 automation JSON-RPC（`session/prompt` / `shutdown`），方法表不是 ACP。
