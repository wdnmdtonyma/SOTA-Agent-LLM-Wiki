---
id: subsys.integration.acp
title: ACP codec / server
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/acp/acp/src/index.ts
  - packages/acp/acp/src/codec.ts
  - packages/acp/acp/src/session.ts
  - packages/acp/acp/src/content.ts
  - packages/acp/acp/src/mcp.ts
  - packages/acp/acp/src/updates.ts
  - packages/acp/acp/package.json
  - packages/acp/acp/tests/turns.spec.ts
  - packages/acp/acp/tests/bridge.spec.ts
  - packages/acp/acp/tests/approval.spec.ts
  - packages/acp/acp/tests/dispose.spec.ts
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/bundle/acp-app/src/index.ts
  - packages/bundle/acp-app/package.json
  - packages/boot/app-boot/src/profile.ts
  - packages/subagent/subagent-acp/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - apply
  - name
  - inject
  - AcpSession
  - admitAcpPrompt
  - turnEndToStopReason
  - mountAcpMcpServers
related:
  - spine.overview
  - surface.acp.server
  - subsys.orchestration.subagent-acp
  - subsys.core.agent
  - subsys.integration.sdk-server
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-acp` 是 **automation-only** 的 ACP JSON-RPC stdio server：插件名 `acp`，源码 `inject = ['agents', 'llm', 'sessionPersistence', 'sessions']`。[E: packages/acp/acp/src/index.ts:60] [E: packages/acp/acp/src/index.ts:62] 它实现 `initialize` / `authenticate` / `session/new` / `session/list` / `session/resume` / `session/close` / `session/setConfigOption` / `session/prompt` / `session/cancel`。[E: packages/acp/acp/src/index.ts:378] [E: packages/acp/acp/src/index.ts:389] shipped profile `acp` 叠 `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-acp-app`；`dsh-acp-app` overlay 再 insert `acp` 行。[E: packages/boot/app-boot/src/profile.ts:105] [E: packages/bundle/acp-app/cordis.patch.yml:16] 它不是 `dsh-subagent-acp` 那条进程外 subagent Provider。

## 能回答的问题

- `@deepseek-ai/dsh-acp` 实现哪些 ACP 方法？有没有 `session/list` / `resume` / `close`？
- codec 还剩什么？prompt 收哪些 block？`initialize` 怎样广告 image / MCP / sessionCapabilities？
- `session/new` 怎样铸造 session？`cwd` / `mcpServers` / `additionalDirectories` 哪些会拒？
- permission 只暴露哪两个 option？waterfall 不 `next()` 会怎样？
- 本包怎样进 shipped `acp` profile？和 `dsh-acp-app` 谁 parse CLI、谁占 stdio？
- 本页和 [`subsys.orchestration.subagent-acp`](../orchestration/subagent-acp.md) 谁是 server、谁是 spawn 孩子的 Client？

## 职责边界

本包拥有 **ACP Agent 侧** 的 JSON-RPC 桥：named export `name` / `inject` / `Config` / `apply`，加上 `AcpSession`、content 准入、MCP 挂载、updates 投影、纯函数 `turnEndToStopReason`。`apply` 在 load 时立刻捕获 persistence / logger，再用 `@agentclientprotocol/sdk` 的 `agent()` app + `ndJsonStream` 占住 stdout / stdin。[E: packages/acp/acp/src/index.ts:60] [E: packages/acp/acp/src/index.ts:97] [E: packages/acp/acp/src/index.ts:374] [E: packages/acp/acp/package.json:2]

`implementation` 对象覆盖九门：`initialize`、`authenticate`、`newSession`、`resumeSession`、`listSessions`、`setSessionConfigOption`、`closeSession`、`prompt`、`cancel`。[E: packages/acp/acp/src/index.ts:176] [E: packages/acp/acp/src/index.ts:196] [E: packages/acp/acp/src/index.ts:239] [E: packages/acp/acp/src/index.ts:292] [E: packages/acp/acp/src/index.ts:333] [E: packages/acp/acp/src/index.ts:347] [E: packages/acp/acp/src/index.ts:361] [E: packages/acp/acp/src/index.ts:367] `newSession` 一律 `SessionId(randomUUID())` 再 `AcpSession.create` → `agents.create`。[E: packages/acp/acp/src/index.ts:199] [E: packages/acp/acp/src/session.ts:128]

它**不**拥有：

- `ctx.agents` Definition、`create` / `resume` / `followup` / `cancel` / `whenIdle` 合同 — [`subsys.core.agent`](../core/agent.md)。本包是 Consumer：`inject` 含 `'agents'`。[E: packages/acp/acp/src/index.ts:62]
- 进程外 subagent Provider（父进程 spawn 一个讲 ACP 的孩子）— [`subsys.orchestration.subagent-acp`](../orchestration/subagent-acp.md)。那包插件名是 `subagent-acp`，`inject = ['subagents', 'subprocess']`，和本包不是同一个 id。[E: packages/subagent/subagent-acp/src/index.ts:23] [E: packages/subagent/subagent-acp/src/index.ts:24]
- 另一条 automation JSON-RPC（`initialize` / `session/prompt` / `shutdown`，方法表不同）— [`subsys.integration.sdk-server`](sdk-server.md)。
- CLI 解析与 stdin EOF 寿命。那是 `@deepseek-ai/dsh-acp-app`（插件名 `acp-app-startup`），help 名 `dsh --profile acp`，成功后 `provide('acpAppStartup')`。[E: packages/bundle/acp-app/src/index.ts:13] [E: packages/bundle/acp-app/src/index.ts:27] [E: packages/bundle/acp-app/src/index.ts:45]
- `dsh-base` 核树。`dsh-acp` **不**出现在 `dsh-base` 的 `package.json` dependencies；进产品靠 `PROFILE_TEMPLATES.acp` 与 `dsh-acp-app` overlay。[E: packages/boot/app-boot/src/profile.ts:107] [E: packages/bundle/acp-app/package.json:42] [E: packages/bundle/acp-app/cordis.patch.yml:17]

**host 面 vs agent-preset 面。** 注释写明 ACP bundle 把 model-facing 行留在 **host 面** 全局层：`agents.create` 只传 `sessionId` / `meta.cwd` / `agentOptions`，不 join preset、不 `isolate`。[E: packages/acp/acp/src/index.ts:199] [E: packages/acp/acp/src/session.ts:128] [E: packages/acp/acp/src/session.ts:130] MCP 客户端在 unpublished Agent 的 `setup` 里 `agentCtx.plugin(McpClient, config)`。[E: packages/acp/acp/src/session.ts:135] [E: packages/acp/acp/src/mcp.ts:32]

**waterfall 只有一条。** `approval/request` 是 waterfall：本桥拥有该 agent 且带 `callId` 时自己答完，**不**调用 `next()`；否则 `return next()`。[E: packages/acp/acp/src/index.ts:157] Cordis 全局规则：`next()` 才会 `cbs.shift()`；不调用就停在本层。[E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:239] `session/event` / `agent/inbox/claimed` / `agent/error` / `llm/adapters-updated` 是普通 `ctx.on`。连接寿命是可逆 `ctx.effect(() => quiesce, 'acp.connection')`。[E: packages/acp/acp/src/index.ts:436]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/acp/acp/src/index.ts` | named export 插件；方法表接线；approval waterfall；stdio；list/resume/close |
| `packages/acp/acp/src/session.ts` | `AcpSession`：create / resume、单槽 prompt、updates、teardown |
| `packages/acp/acp/src/content.ts` | `admitAcpPrompt` / `supportsAcpImagePrompts` / `assistantBlockToAcp` |
| `packages/acp/acp/src/codec.ts` | 仅 `turnEndToStopReason` |
| `packages/acp/acp/src/mcp.ts` | `mountAcpMcpServers`：stdio 绝对路径 + HTTP |
| `packages/acp/acp/src/updates.ts` | `assistantUpdates` / `toolCallUpdate` / `toolResultUpdate` |
| `packages/bundle/acp-app/` | shipped overlay + `acp-app-startup` CLI |
| `packages/acp/acp/tests/bridge.spec.ts` | 广告面、cwd / additionalDirectories、empty prompt |
| `packages/acp/acp/tests/turns.spec.ts` | `max_tokens`、hook abort → `end_turn` |
| `packages/acp/acp/tests/approval.spec.ts` | `allow-once` / `reject-once` / 未知 option / client 抛错 `unavailable` |
| `packages/boot/app-boot/src/profile.ts` | `PROFILE_TEMPLATES.acp` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` / `inject` | `'acp'`；`['agents', 'llm', 'sessionPersistence', 'sessions']`。handlers 跑在 injection 作用域外，`apply` 里先抓服务。[E: packages/acp/acp/src/index.ts:60] [E: packages/acp/acp/src/index.ts:62] [E: packages/acp/acp/src/index.ts:100] `dsh-acp-app` patch 另把 `inject` 写成 `[acpAppStartup]`，让桥等 CLI `provide` 之后再占 stdio。[E: packages/bundle/acp-app/cordis.patch.yml:18] [E: packages/bundle/acp-app/src/index.ts:45] |
| `Config` / `AcpConfig` | Schema：`provider` / `model` / `sessionListPageSize`（默认 100）。接口另有运行时 `stream?`，生产走 stdio，测试注入 transport；Schema **不**声明 `stream`。[E: packages/acp/acp/src/index.ts:86] [E: packages/acp/acp/src/index.ts:89] [E: packages/acp/acp/src/index.ts:83] |
| `AcpSession` | 每条 ACP session：`agent`、`inflight` 单槽、`outputTail`、`AcpModelControl`、`close()`。[E: packages/acp/acp/src/session.ts:98] |
| `agentInfo` | wire 钉 `name: 'deepseek-harness-acp'`、`version: '0.0.1'`——和 `package.json` 的 `0.1.2-alpha.2` 不是同一个数。[E: packages/acp/acp/src/index.ts:182] [E: packages/acp/acp/package.json:4] |
| `agentCapabilities` | `mcpCapabilities: { http: true }`；`promptCapabilities.image` 由 `supportsAcpImagePrompts` 决定，`audio` / `embeddedContext` 恒 `false`；`sessionCapabilities: { close, list, resume }`。[E: packages/acp/acp/src/index.ts:184] [E: packages/acp/acp/src/index.ts:185] [E: packages/acp/acp/src/index.ts:186] 测试默认 harness 钉 `image: false`。[E: packages/acp/acp/tests/bridge.spec.ts:46] |
| `authMethods` | `[]`。`authenticate` 仍是 no-op 成功。[E: packages/acp/acp/src/index.ts:188] [E: packages/acp/acp/src/index.ts:193] |
| `admitAcpPrompt` | `text` 相连；`resource_link` 收成 `\n[resource_link name=… uri=…]\n`；`image` 仅当 `imageEnabled`；`audio` / `resource` fail-loud。[E: packages/acp/acp/src/content.ts:108] [E: packages/acp/acp/src/content.ts:137] [E: packages/acp/acp/src/content.ts:141] 全空（无图且 trim 后无文本）→ `empty prompt`。[E: packages/acp/acp/src/content.ts:201] |
| `turnEndToStopReason` | `completed`→`end_turn`；`max-tokens`→`max_tokens`；`aborted` / `blocked` / `error`→`end_turn`；`interrupted`→`cancelled`。[E: packages/acp/acp/src/codec.ts:17] [E: packages/acp/acp/src/codec.ts:19] [E: packages/acp/acp/src/codec.ts:24] [E: packages/acp/acp/src/codec.ts:26] [E: packages/acp/acp/src/codec.ts:29] |
| permission options | 只发 `{ optionId: 'allow-once', kind: 'allow_once' }` 与 `{ optionId: 'reject-once', kind: 'reject_once' }`。没有 `allow_always`。[E: packages/acp/acp/src/index.ts:164] [E: packages/acp/acp/src/index.ts:165] |

`validateWorkspaceParams`：`cwd` 必须绝对路径；`additionalDirectories` 非空拒。**不再**因 `mcpServers` 非空而拒。[E: packages/acp/acp/src/index.ts:516] [E: packages/acp/acp/src/index.ts:522] 空数组的 `additionalDirectories` 可以通过。[E: packages/acp/acp/tests/bridge.spec.ts:941]

## 控制流

1. Loader 取 named export。`export const name = 'acp'`、`export const inject = ['agents', 'llm', 'sessionPersistence', 'sessions']`、`export function apply`。[E: packages/acp/acp/src/index.ts:60] [E: packages/acp/acp/src/index.ts:62] [E: packages/acp/acp/src/index.ts:97] 包名是 `@deepseek-ai/dsh-acp`。[E: packages/acp/acp/package.json:2]

2. `apply@packages/acp/acp/src/index.ts` 抓 `ctx.sessionPersistence`、建 `sessions` Map。[E: packages/acp/acp/src/index.ts:100] [E: packages/acp/acp/src/index.ts:103] 生产 transport 是 `ndJsonStream(process.stdout, process.stdin)`；测试走 `config.stream`。[E: packages/acp/acp/src/index.ts:374] 然后 `createAcpAgentApp(...).connect(stream)`，并用 `ctx.effect(() => quiesce, 'acp.connection')` 把拆卸挂到 fiber。[E: packages/acp/acp/src/index.ts:378] [E: packages/acp/acp/src/index.ts:390] [E: packages/acp/acp/src/index.ts:436]

3. 客户端 `initialize`：回 `PROTOCOL_VERSION`、`agentInfo`、`mcpCapabilities.http: true`、`sessionCapabilities` close/list/resume、`authMethods: []`；`promptCapabilities.image` 经 `supportsAcpImagePrompts`。[E: packages/acp/acp/src/index.ts:179] [E: packages/acp/acp/src/index.ts:184] 测试钉默认对象（image false）。[E: packages/acp/acp/tests/bridge.spec.ts:42] `authenticate` 直接 `Promise.resolve()`。[E: packages/acp/acp/src/index.ts:193]

4. `newSession@packages/acp/acp/src/index.ts`：`validateWorkspaceParams` 之后 `const sessionId = brandString<SessionId>(randomUUID())`，再 `AcpSession.create`（内部 `agents.create`）。[E: packages/acp/acp/src/index.ts:198] [E: packages/acp/acp/src/index.ts:199] [E: packages/acp/acp/src/index.ts:206] MCP 声明错误变成 `invalidParams`。[E: packages/acp/acp/src/index.ts:216] 成功才 `sessions.set`，`persistence.ensureMaterialized`，返回 `{ sessionId, configOptions }`。[E: packages/acp/acp/src/index.ts:224] [E: packages/acp/acp/src/index.ts:229] [E: packages/acp/acp/src/index.ts:230] 省略的 `provider` / `model` 不会写成 `undefined` 字段。[E: packages/acp/acp/src/index.ts:444]

5. `resumeSession`：cwd 必须匹配 persisted header；已在 `sessions` / `activating` / `ctx.sessions` 里、`origin === 'subagent'`、有 `parentSession` 都不可 resume。[E: packages/acp/acp/src/index.ts:242] [E: packages/acp/acp/src/index.ts:248] `listSessions` 只列未激活、非 subagent、非 child、绝对 cwd 的 persisted header，newest-first，page size 默认 100。[E: packages/acp/acp/src/index.ts:305] [E: packages/acp/acp/src/index.ts:320] [E: packages/acp/acp/src/index.ts:324]

6. `prompt` 委托 `record.prompt`。未知 session → `unknown session`；已有 `inflight` → `a prompt is already in flight`；`admitAcpPrompt` 失败按 `AcpContentError.kind` 变 `invalidParams` / `internalError`。[E: packages/acp/acp/src/index.ts:120] [E: packages/acp/acp/src/session.ts:252] [E: packages/acp/acp/src/session.ts:320] 若 `ctx.agents.get(this.agent.id) !== this.agent`，拒 `prompt was not queued`。[E: packages/acp/acp/src/session.ts:280] [E: packages/acp/acp/src/session.ts:281]

7. 通过校验后 `createUserMessage({ content, source: { kind: 'user' } })`，先武装 `inflight` 再 `this.agent.followup(message)`。[E: packages/acp/acp/src/session.ts:295] [E: packages/acp/acp/src/session.ts:302] 同步 `followup` 失败会清 `messageQueued` 并删 pending selection。[E: packages/acp/acp/src/session.ts:305]

8. 回程投影已提交 `assistant/message`：`reasoning` → `agent_thought_chunk`；其它经 `assistantBlockToAcp` 变 `agent_message_chunk`；助手 image 读附件后发 ACP `image` base64，不是占位文本。[E: packages/acp/acp/src/updates.ts:23] [E: packages/acp/acp/src/updates.ts:36] [E: packages/acp/acp/src/content.ts:232] `tool/call` / `tool/result` 发 generic `tool_call` / `tool_call_update`。[E: packages/acp/acp/src/session.ts:363] [E: packages/acp/acp/src/session.ts:372]

9. 结算等 `agent.whenIdle()` + `outputTail`，不是单看 `turn/end`。[E: packages/acp/acp/src/session.ts:493] 无 `endReason`（admission 丢掉 prompt）→ `cancelled`；`end.kind === 'error'` → prompt RPC `reject`；其余走 `turnEndToStopReason`（含 `max-tokens`→`max_tokens`）。[E: packages/acp/acp/src/session.ts:511] [E: packages/acp/acp/src/session.ts:513] [E: packages/acp/acp/src/session.ts:517] 测试钉 token-limit 的 `stopReason` 是 `max_tokens` 且已提交文本仍发出。[E: packages/acp/acp/tests/turns.spec.ts:38] hook / 其它 owner 的 `agent.cancel` 走到 `aborted`，codec 映射成 `end_turn`，不是客户端 `session/cancel`。[E: packages/acp/acp/src/codec.ts:24] [E: packages/acp/acp/tests/turns.spec.ts:459]

10. `cancel`：未知 session 直接成功返回（`?.cancel()`）；已知则 `AcpSession.cancel` → `cancelPrompt` + 必要时 `agent.cancel({ kind: 'user' })`，结算 `'cancelled'`。[E: packages/acp/acp/src/index.ts:367] [E: packages/acp/acp/src/session.ts:337] [E: packages/acp/acp/src/session.ts:499] 同一 session 同时只能一个 prompt。[E: packages/acp/acp/src/session.ts:252]

11. `approval/request` waterfall：`ownedRecord` 失败或没有 `callId` 就 `return next()`。[E: packages/acp/acp/src/index.ts:157] 否则 `conn.request(...requestPermission)` 只带 `allow-once` / `reject-once`。[E: packages/acp/acp/src/index.ts:168] [E: packages/acp/acp/src/index.ts:164] 客户端 `cancelled` → `'cancelled'`；`optionId === 'allow-once'` → `'allowed-once'`；其它（含未知 id）→ `'rejected'`。[E: packages/acp/acp/src/index.ts:170] [E: packages/acp/acp/src/index.ts:171] 测试：未知 `optionId` 是 `rejected`；客户端抛错组合结果是 `unavailable`。[E: packages/acp/acp/tests/approval.spec.ts:58] [E: packages/acp/acp/tests/approval.spec.ts:65] 不调用 `next()` 时，`Events.waterfall` 不会 `shift` 到下一层。[E: vendor/cordis/src/events.ts:239]

12. 拆卸 `quiesce`：`closed = true`，对每条 `AcpSession.close`（cancel、`whenIdle`、`drainContinuableDescendants` 若 `ctx.get('subagents')` 有该方法、`sessions.flush`、`handle.dispose()`）。[E: packages/acp/acp/src/index.ts:396] [E: packages/acp/acp/src/index.ts:401] [E: packages/acp/acp/src/session.ts:447] [E: packages/acp/acp/src/session.ts:454] 测试：`acpFiber.dispose()` 后 in-flight prompt 的 `stopReason` 是 `cancelled`，registry 里不再有该 agent。[E: packages/acp/acp/tests/dispose.spec.ts:26] [E: packages/acp/acp/tests/dispose.spec.ts:28]

13. **shipped 入口是 `dsh --profile acp`。** `PROFILE_TEMPLATES.acp.bundles` = `dsh-base` + `dsh-acp-app`，`patchReload: 'startup'`。[E: packages/boot/app-boot/src/profile.ts:107] [E: packages/boot/app-boot/src/profile.ts:108] overlay insert `acp-app-startup` 与 `acp`（`provider: deepseek-official` / `model: deepseek-v4-flash`）。[E: packages/bundle/acp-app/cordis.patch.yml:13] [E: packages/bundle/acp-app/cordis.patch.yml:20] [E: packages/bundle/acp-app/cordis.patch.yml:21] 同进程 stdout 被 `ndJsonStream` 占成协议帧。[E: packages/acp/acp/src/index.ts:374] 五个 shipped profile 还有 `web` / `headless` / `sdk` / `sdk-minimal`；没有 `dsh acp` 子命令，只有 `dsh --profile acp`。[E: packages/boot/app-boot/src/profile.ts:105] [E: packages/bundle/acp-app/src/index.ts:27]

## 设计动机

这是给受信任程序（IDE、脚本、`dsh-subagent-acp` 拉起的孩子）用的窄桥，不是第二套 Web / TUI。wire 上现在除 prompt 文本、已提交 assistant 文本、取消、一次性 permission 外，还带 MCP 挂载、session list/resume/close、model config option、tool 生命周期和（能力允许时）inline image。

fresh `session/new` 仍由本桥铸造 UUID 再 `agents.create`。`session/resume` 只恢复 **persisted 顶层** session（非 subagent、无 parent），且 cwd 必须物理同一目录，避免客户端把孩子 log 当 ACP session。

content 对非 baseline / 未广告的 image **fail-loud**。`audio` / embedded `resource` 永远拒。`initialize` 的 `image` 位必须先经 `supportsAcpImagePrompts`（attachments + 部署 route 声明 `inputModalities` 含 `'image'`），prompt 里再出现未广告的 image 是 `invalidParams`。

`max-tokens` 在 codec 与 prompt RPC 都报 `max_tokens`。客户端 `session/cancel` 与 bridge dispose 才报 `cancelled`；hook 取消走 `aborted`→`end_turn`，避免「别人停了 turn」被当成 ACP cancel。

permission 只有 once：自动化客户端没有人机「永远允许」面；未知 `optionId` 当 `rejected`。

`inject` 不包含 `subagents`。continuable 子树的拆卸通过 `ctx.get('subagents')` 结构读取 `drainContinuableDescendants`——没有挂 `subagents` 时当「没有 continuable 孩子」。

## Gotcha

- **默认 Web GUI 不装本包。** `dsh web` 叠 `dsh-web-app`，不是 `dsh-acp-app`。ACP 产品入口是 `dsh --profile acp`。[E: packages/boot/app-boot/src/profile.ts:110] [E: packages/boot/app-boot/src/profile.ts:105]
- **`dsh-acp-app` 不是 `acp`。** overlay 两行：`id: acp-app-startup` / `@deepseek-ai/dsh-acp-app` 与 `id: acp` / `@deepseek-ai/dsh-acp`。前者只 parse CLI 并 `provide acpAppStartup`。[E: packages/bundle/acp-app/cordis.patch.yml:13] [E: packages/bundle/acp-app/cordis.patch.yml:16]
- **不要和 `subagent-acp` 混页。** `dsh-subagent-acp` 是父进程里的 Provider，`inject` 含 `subprocess`。本包是孩子进程里的 **server**。[E: packages/subagent/subagent-acp/src/index.ts:23]
- **有 `resume` / `list` / `close`。** 旧版「只有五门、不广告 persistence」已过时。handler 接线含 `session.resume` / `session.list` / `session.close`。[E: packages/acp/acp/src/index.ts:384] [E: packages/acp/acp/src/index.ts:385] [E: packages/acp/acp/src/index.ts:386]
- **MCP 已支持。** `mcpServers` 不再一律拒；stdio 的 `command` 必须绝对路径；`type: 'http'` 走 streamable-http；其它 `type` 拒。[E: packages/acp/acp/src/mcp.ts:45] [E: packages/acp/acp/src/mcp.ts:60] [E: packages/acp/acp/src/mcp.ts:72]
- **image 能力是动态的。** 默认测试 harness `image: false`；一旦 initialize 广告了 image，prompt 才准入 inline 图。助手侧 image 会发真 ACP image 块。[E: packages/acp/acp/tests/bridge.spec.ts:46] [E: packages/acp/acp/src/content.ts:137] [E: packages/acp/acp/src/content.ts:232]
- **`turnEndToStopReason('max-tokens')` 与 prompt 结算都是 `max_tokens`。** 旧桥曾在 idle 时改报 `end_turn`，现已去掉。[E: packages/acp/acp/src/codec.ts:19] [E: packages/acp/acp/src/session.ts:517] [E: packages/acp/acp/tests/turns.spec.ts:38]
- **单槽。** 第二个 `prompt` 在第一个 idle / cancel 之前是 `already in flight`。同步 `followup` 失败必须清掉 `inflight`。
- **`cwd` 必须绝对；不接额外 directory。** 相对路径、非空 `additionalDirectories` 在 `newSession`/`resumeSession` 失败。[E: packages/acp/acp/src/index.ts:516] [E: packages/acp/acp/src/index.ts:522]
- **stdout 是协议帧。** 同进程不能挂 stdout logger。`agentInfo.version`（`0.0.1`）也不是 npm 包版本。
- **waterfall 必须 `next()`。** 本桥不认领的 approval 一定要 `next()`，否则内置策略永远走不到。认领之后不要再 `next()`，否则会双答。
- **旧 example 树已删除。** 不要再 cite `packages/examples/acp-demo` 或 `examples/acp-agent/cordis.yml`；组合改看 `packages/bundle/acp-app` 与 `apps/cli` ACP profile 测试夹具。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition（DSH）** | `@deepseek-ai/dsh-agent` 的 `AgentRegistry` | `ctx.agents`。**host**：`dsh-base` 挂 agent + agent-loop。本包不 `provide` 这个键 |
| **Definition（wire）** | `@agentclientprotocol/sdk` 的 Agent 方法面 | 不是 DSH ctx 键。本包实现 initialize/auth + session new/list/resume/close/setConfigOption/prompt/cancel |
| **Provider（本页）** | `@deepseek-ai/dsh-acp` 的 `apply` / SDK `agent().connect` | 插件名 `acp`。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / 任一 shipped **preset**；**在** shipped **profile** `acp` 经 `dsh-acp-app` insert |
| **Provider（CLI 包装）** | `@deepseek-ai/dsh-acp-app` | 插件名 `acp-app-startup`。`dsh --profile acp`；`provide acpAppStartup` |
| **Consumer（DSH 内）** | 本包 `newSession` → `agents.create`；`resumeSession` → `agents.resume`；`prompt` → `followup` / `whenIdle` | 无 preset `isolate`；`meta.cwd` 来自 ACP `cwd` |
| **Consumer（wire）** | 外部 ACP 客户端。进程外委托是 `dsh-subagent-acp` 的 Provider | 那是父进程 Client，**不是**本页 |

换这条 automation 面 = 换 `acp` profile overlay / 自组 `dsh-acp`，不是改 `dsh-base` 核 insert。本包不往 `ctx.subagents` 注册任何 Provider。四个 shipped preset 仍是 `minimal` / `standard` / `ptc` / `cordis`，与 ACP profile 正交。

## Sources

- packages/acp/acp/src/index.ts
- packages/acp/acp/src/codec.ts
- packages/acp/acp/src/session.ts
- packages/acp/acp/src/content.ts
- packages/acp/acp/src/mcp.ts
- packages/acp/acp/src/updates.ts
- packages/acp/acp/package.json
- packages/acp/acp/tests/turns.spec.ts
- packages/acp/acp/tests/bridge.spec.ts
- packages/acp/acp/tests/approval.spec.ts
- packages/acp/acp/tests/dispose.spec.ts
- packages/bundle/acp-app/cordis.patch.yml
- packages/bundle/acp-app/src/index.ts
- packages/bundle/acp-app/package.json
- packages/boot/app-boot/src/profile.ts
- packages/subagent/subagent-acp/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。本包进 shipped profile `acp`，不进 shipped preset。
- [surface.acp.server](../../surface/acp/server.md)（`surface.acp.server`）：ACP 对外可见面（方法表、stdio 入口）的短页。
- [subsys.orchestration.subagent-acp](../orchestration/subagent-acp.md)（`subsys.orchestration.subagent-acp`）：父进程 ACP Provider，spawn 讲 ACP 的孩子；不是本 server。
- [subsys.core.agent](../core/agent.md)（`subsys.core.agent`）：`ctx.agents` Definition；本包 `create` / `resume` / `followup` / `cancel` 的合同。
- [subsys.integration.sdk-server](sdk-server.md)（`subsys.integration.sdk-server`）：另一条 automation JSON-RPC（`session/prompt` / `shutdown`），方法表不是 ACP。
