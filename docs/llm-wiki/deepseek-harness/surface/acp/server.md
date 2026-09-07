---
id: surface.acp.server
title: ACP server
kind: surface
tier: T1
pkg: integration
source:
  - packages/acp/acp/src/index.ts
  - packages/acp/acp/src/codec.ts
  - packages/acp/acp/src/content.ts
  - packages/acp/acp/src/session.ts
  - packages/acp/acp/src/mcp.ts
  - packages/acp/acp/src/updates.ts
  - packages/acp/acp/package.json
  - packages/acp/acp/tests/bridge.spec.ts
  - packages/acp/acp/tests/turns.spec.ts
  - packages/acp/acp/tests/codec.spec.ts
  - packages/acp/acp/tests/approval.spec.ts
  - packages/acp/acp/tests/dispose.spec.ts
  - packages/acp/acp/tests/edges.spec.ts
  - packages/acp/acp/tests/multi-session.spec.ts
  - packages/bundle/acp-app/src/index.ts
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/bundle/acp-app/package.json
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/package.json
  - packages/boot/app-boot/src/profile.ts
  - packages/subagent/subagent-acp/src/index.ts
symbols:
  - apply
  - name
  - inject
  - Config
  - admitAcpPrompt
  - turnEndToStopReason
  - AcpSession
related:
  - spine.overview
  - subsys.integration.acp
  - subsys.orchestration.subagent-acp
  - surface.sdk.typescript
evidence: explicit
status: verified
updated: d347e70390
---

> `@deepseek-ai/dsh-acp` 是 **automation-only** 的 Agent Client Protocol JSON-RPC stdio server：插件名 `acp`，`inject = ['agents', 'llm', 'sessionPersistence', 'sessions']`。它实现 `initialize` / `authenticate` / `session/new` / `session/list` / `session/resume` / `session/close` / `session/setConfigOption` / `session/prompt` / `session/cancel`。产品入口是 shipped profile `acp`（`dsh --profile acp`）叠 `dsh-base` + `dsh-acp-app`。它不是 `dsh-subagent-acp` 那条进程外 Provider。

## 能回答的问题

- 本包实现哪些 ACP 方法？有没有 `loadSession` / resume / list / close？
- 用户怎么启动这条 stdio 面？`dsh web` 会不会挂它？`dsh --profile acp` 会吗？
- `session/new` 对 `cwd` / `mcpServers` / `additionalDirectories` 怎么处理？prompt 收哪些 block？
- `initialize` 广告哪些 `promptCapabilities` / `sessionCapabilities`？permission 只暴露哪两个 option？
- 本面和 [`subsys.orchestration.subagent-acp`](../../subsystems/orchestration/subagent-acp.md) / [`surface.sdk.typescript`](../sdk/typescript.md) 谁是 server、谁是另一条 JSON-RPC？

## 是什么

DSH 是 **Cordis 组合运行时**，主线是 `profile → bundle → agent preset`。capability seam 是 Definition / Provider / Consumer。**host 面**是进程级插件树（bundle `cordis.patch.yml` 里的行）；**agent-preset 面**是每会话 `mountPreset` 的 tools / persona / isolate。`PROFILE_TEMPLATES` 有五个 shipped 名：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`，没有 TUI。[E: packages/boot/app-boot/src/profile.ts:137] `acp` 模板 bundles 是 `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-acp-app`，`patchReload: 'startup'`。[E: packages/boot/app-boot/src/profile.ts:138] [E: packages/boot/app-boot/src/profile.ts:139]

`@deepseek-ai/dsh-acp` 是 ACP **Agent 侧**桥：named export `name` / `inject` / `Config` / `apply`。[E: packages/acp/acp/package.json:2] [E: packages/acp/acp/src/index.ts:60] [E: packages/acp/acp/src/index.ts:62] [E: packages/acp/acp/src/index.ts:86] [E: packages/acp/acp/src/index.ts:97] `apply` 在 load 时抓 `ctx.sessionPersistence`，再用 `createAcpAgentApp` + `ndJsonStream` 占住 stdout / stdin。[E: packages/acp/acp/src/index.ts:100] [E: packages/acp/acp/src/index.ts:378] [E: packages/acp/acp/src/index.ts:374]

`implementation` 注册的 handler：`initialize` / `authenticate` / `newSession` / `resumeSession` / `listSessions` / `setSessionConfigOption` / `closeSession` / `prompt` / `cancel`。[E: packages/acp/acp/src/index.ts:176] [E: packages/acp/acp/src/index.ts:192] [E: packages/acp/acp/src/index.ts:196] [E: packages/acp/acp/src/index.ts:239] [E: packages/acp/acp/src/index.ts:292] [E: packages/acp/acp/src/index.ts:333] [E: packages/acp/acp/src/index.ts:347] [E: packages/acp/acp/src/index.ts:361] [E: packages/acp/acp/src/index.ts:367] wire 上对应 `methods.agent.session.{new,list,resume,close,setConfigOption,prompt}` 与 `session.cancel`。[E: packages/acp/acp/src/index.ts:384] [E: packages/acp/acp/src/index.ts:389] 源里没有 `loadSession`、没有 fork。`newSession` 一律 `SessionId(randomUUID())` 再 `AcpSession.create` → `agents.create`。[E: packages/acp/acp/src/index.ts:199] [E: packages/acp/acp/src/index.ts:206] [E: packages/acp/acp/src/session.ts:128]

它**不是**：

| 容易混的实体 | 实际是什么 |
|---|---|
| `@deepseek-ai/dsh-acp-app` | ACP profile overlay bundle：插件名 `acp-app-startup`，解析 `dsh --profile acp` 后再 `provide('acpAppStartup')`。[E: packages/bundle/acp-app/package.json:2] [E: packages/bundle/acp-app/src/index.ts:13] [E: packages/bundle/acp-app/src/index.ts:45] |
| `cordis.patch.yml` 的 `id: acp` | `dsh-acp-app` 在 host 面 insert 的本包行，`inject: [acpAppStartup]`，默认 `provider: deepseek-official` / `model: deepseek-v4-flash`。[E: packages/bundle/acp-app/cordis.patch.yml:15] [E: packages/bundle/acp-app/cordis.patch.yml:17] [E: packages/bundle/acp-app/cordis.patch.yml:19] |
| `@deepseek-ai/dsh-subagent-acp` | 父进程里的进程外 subagent Provider，插件名 `subagent-acp`，`inject = ['subagents', 'subprocess']`。[E: packages/subagent/subagent-acp/src/index.ts:23] [E: packages/subagent/subagent-acp/src/index.ts:24] |
| TypeScript JSON-RPC SDK | 另一条 automation JSON-RPC，方法表不是 ACP。见 [`surface.sdk.typescript`](../sdk/typescript.md) |

**host 面 vs agent-preset 面。** 本桥跑在 ACP profile 进程里。`agents.create` 传 `sessionId` / `meta.cwd` / `agentOptions` / `setup`（MCP + 模型控制），不 join preset、不 `isolate`。[E: packages/acp/acp/src/session.ts:128] [E: packages/acp/acp/src/session.ts:130] [E: packages/acp/acp/src/session.ts:131] 注释写明模型可见行留在 **host 面** 全局层。[E: packages/acp/acp/src/index.ts:199]

## 入口

| 入口 | 行为 |
|---|---|
| `dsh --profile acp` | `PROFILE_TEMPLATES.acp` 叠 `dsh-base` + `dsh-acp-app`。[E: packages/boot/app-boot/src/profile.ts:138] commander 程序名是 `dsh --profile acp`。[E: packages/bundle/acp-app/src/index.ts:27] |
| `acp-app-startup.apply` | 解析成功后 `exitOnStdinEnd` + `ctx.provide('acpAppStartup', { accepted: true })`；help 不 claim stdio。[E: packages/bundle/acp-app/src/index.ts:44] [E: packages/bundle/acp-app/src/index.ts:45] |
| overlay `id: acp` | 等 `acpAppStartup` 再 load `@deepseek-ai/dsh-acp`。[E: packages/bundle/acp-app/cordis.patch.yml:15] [E: packages/bundle/acp-app/cordis.patch.yml:17] |
| 生产 transport | `config.stream` 缺省时 `ndJsonStream(process.stdout, process.stdin)`。[E: packages/acp/acp/src/index.ts:374] |
| 测试 transport | 运行时字段 `AcpConfig.stream?`；`Config` Schema 只声明 `provider` / `model` / `sessionListPageSize`。[E: packages/acp/acp/src/index.ts:83] [E: packages/acp/acp/src/index.ts:86] [E: packages/acp/acp/src/index.ts:89] |

`dsh web` / `dsh --profile web` / `dsh --profile headless` / `sdk` / `sdk-minimal` **不会**叠 `dsh-acp-app`。`web` 是 `dsh-base` + `dsh-web-app`；`headless` 是 `dsh-base` + `dsh-headless`。[E: packages/boot/app-boot/src/profile.ts:142] [E: packages/boot/app-boot/src/profile.ts:146] `@deepseek-ai/dsh-web-app` / `@deepseek-ai/dsh-headless` 各自声明 `dsh.bundle.patch`。[E: packages/bundle/web-app/package.json:2] [E: packages/bundle/web-app/package.json:43] [E: packages/bundle/headless/package.json:2] [E: packages/bundle/headless/package.json:43]

stdout 是协议帧。连接寿命挂在 `ctx.effect(() => quiesce, 'acp.connection')`；拆 fiber 会 `AcpSession.close` 并把 in-flight prompt 结成 `cancelled`。[E: packages/acp/acp/src/index.ts:436] [E: packages/acp/acp/src/index.ts:401]

## 关键字段

### 插件身份

| 符号 | 值 | 含义 |
|---|---|---|
| npm 包 | `@deepseek-ai/dsh-acp` | 不是 `@deepseek-ai/dsh-acp-app`，也不是 `@deepseek-ai/dsh-subagent-acp`。[E: packages/acp/acp/package.json:2] |
| `name` | `'acp'` | Cordis 插件 id。[E: packages/acp/acp/src/index.ts:60] |
| `inject` | `['agents', 'llm', 'sessionPersistence', 'sessions']` | handlers 跑在 injection 作用域外，所以 `apply` 先把 persistence 抓进闭包。[E: packages/acp/acp/src/index.ts:62] [E: packages/acp/acp/src/index.ts:100] overlay 再加 `acpAppStartup`。[E: packages/bundle/acp-app/cordis.patch.yml:17] |
| `Config` / `AcpConfig` | Schema：可选 `provider` / `model`，`sessionListPageSize` 默认 `100` | 接口另有运行时 `stream?`；省略的 provider/model **不会**写成 `undefined` 字段。[E: packages/acp/acp/src/index.ts:83] [E: packages/acp/acp/src/index.ts:89] [E: packages/acp/acp/src/index.ts:445] |
| `agentInfo` | `name: 'deepseek-harness-acp'`，`version: '0.0.1'` | 钉在 wire 上，和 npm `0.1.2-alpha.2` 不是同一个数。[E: packages/acp/acp/src/index.ts:182] [E: packages/acp/acp/package.json:4] |

### ACP 方法表

| 方法 | 行为 |
|---|---|
| `initialize` | 回 `PROTOCOL_VERSION`、`agentInfo`、`mcpCapabilities.http: true`、`promptCapabilities`（`image` 由 `supportsAcpImagePrompts` 决定，`audio`/`embeddedContext` 为 `false`）、`sessionCapabilities: { close, list, resume }`、`authMethods: []`。[E: packages/acp/acp/src/index.ts:184] [E: packages/acp/acp/src/index.ts:185] [E: packages/acp/acp/src/index.ts:186] [E: packages/acp/acp/tests/bridge.spec.ts:42] |
| `authenticate` | no-op：`Promise.resolve()`。[E: packages/acp/acp/src/index.ts:193] |
| `newSession` | `validateWorkspaceParams` → `SessionId(randomUUID())` → `AcpSession.create` → `sessions.set` → `{ sessionId, configOptions }`。[E: packages/acp/acp/src/index.ts:198] [E: packages/acp/acp/src/index.ts:230] |
| `resumeSession` | 已 live / 正在 activating / `ctx.sessions` 已有则拒；只 resume 非 `subagent`、无 `parentSession` 的持久 header，且 cwd 物理相同。[E: packages/acp/acp/src/index.ts:242] [E: packages/acp/acp/src/index.ts:248] [E: packages/acp/acp/src/index.ts:252] |
| `listSessions` | 从 persistence 列出可 resume 的根会话；按 `createdAt` 降序分页，默认页大小 `100`。[E: packages/acp/acp/src/index.ts:303] [E: packages/acp/acp/src/index.ts:320] [E: packages/acp/acp/src/index.ts:324] |
| `setSessionConfigOption` | 转给 `AcpSession.setConfig`；`AcpModelConfigError` 变 `invalidParams`。[E: packages/acp/acp/src/index.ts:339] [E: packages/acp/acp/src/index.ts:341] |
| `closeSession` | `record.close` 后从 registry 删掉。[E: packages/acp/acp/src/index.ts:351] [E: packages/acp/acp/src/index.ts:355] |
| `prompt` | 单槽。未知 session 拒。通过后 `admitAcpPrompt` + `followup`。[E: packages/acp/acp/src/index.ts:362] [E: packages/acp/acp/src/session.ts:252] [E: packages/acp/acp/src/session.ts:302] |
| `cancel` | 未知 session 直接成功（optional chaining）；已知则 `cancel()`。[E: packages/acp/acp/src/index.ts:367] |

`newSession` 校验：`cwd` 必须绝对路径；非空 `additionalDirectories` 拒。[E: packages/acp/acp/src/index.ts:516] [E: packages/acp/acp/src/index.ts:522] 空数组的 `additionalDirectories` 可以通过。[E: packages/acp/acp/tests/bridge.spec.ts:941] **非空 `mcpServers` 现已支持**：stdio（无 `type`，`command` 必须绝对路径）与 `type: 'http'`；其它 transport 抛 `AcpMcpConfigError`。[E: packages/acp/acp/src/mcp.ts:45] [E: packages/acp/acp/src/mcp.ts:60] [E: packages/acp/acp/src/mcp.ts:72]

同一 session 同时只能一个 prompt；第二个在第一个 idle / cancel 之前报 `already in flight`。[E: packages/acp/acp/src/session.ts:252] [E: packages/acp/acp/tests/turns.spec.ts:261] 不同 session 可以同时 `prompt`，更新按 `sessionId` 分路。[E: packages/acp/acp/tests/multi-session.spec.ts:31] 若 `ctx.agents.get(this.agent.id) !== this.agent`，拒 `prompt was not queued`。[E: packages/acp/acp/src/session.ts:281]

### codec 与回程

`admitAcpPrompt`：`text` 原样拼接；`resource_link` 收成 `\n[resource_link name=… uri=…]\n`；`image` 仅当 `initialize` 广告了 image 才 decode + `attachments.saveImages`；`audio` / `resource` 立刻 invalid。[E: packages/acp/acp/src/content.ts:108] [E: packages/acp/acp/src/content.ts:137] [E: packages/acp/acp/src/content.ts:141] [E: packages/acp/acp/src/content.ts:143] 多块 `text` 直接相连进同一 pending 缓冲。[E: packages/acp/acp/src/content.ts:178] trim 后既无 text 也无 image 则 `empty prompt`。[E: packages/acp/acp/src/content.ts:201]

回程由 `assistantUpdates`：`reasoning` 变 `agent_thought_chunk`；其它可转换 block 变 `agent_message_chunk`；可跟 `usage_update`。tool 生命周期走 `tool_call` / `tool_call_update`。[E: packages/acp/acp/src/updates.ts:26] [E: packages/acp/acp/src/updates.ts:36] [E: packages/acp/acp/src/updates.ts:52] [E: packages/acp/acp/src/updates.ts:80] 测试钉 committed reasoning + tool + usage + 最终 text 的顺序。[E: packages/acp/acp/tests/edges.spec.ts:42]

`turnEndToStopReason`：`completed`→`end_turn`；`max-tokens`→`max_tokens`；`aborted` / `blocked` / `error`→`end_turn`；`interrupted`→`cancelled`。[E: packages/acp/acp/src/codec.ts:17] [E: packages/acp/acp/src/codec.ts:19] [E: packages/acp/acp/src/codec.ts:24] [E: packages/acp/acp/src/codec.ts:26] [E: packages/acp/acp/src/codec.ts:29] [E: packages/acp/acp/tests/codec.spec.ts:8]

prompt RPC 在 whole-agent idle 后结算：`end.kind === 'error'` 变 internal reject；其它走 codec（含 `max_tokens`）。[E: packages/acp/acp/src/session.ts:513] [E: packages/acp/acp/src/session.ts:516] 测试钉 token-limit 的 `stopReason` 是 `max_tokens` 且已提交文本仍发出。[E: packages/acp/acp/tests/turns.spec.ts:38] 客户端 `session/cancel` 报 `cancelled`。[E: packages/acp/acp/tests/turns.spec.ts:263]

### permission

`approval/request` 是 waterfall：本桥拥有该 agent 且带 `callId` 时自己答完；否则 `return next()`。[E: packages/acp/acp/src/index.ts:157] 只发两个 option：`allow-once` / `reject-once`。没有 `allow_always`。[E: packages/acp/acp/src/index.ts:164] [E: packages/acp/acp/src/index.ts:165] 客户端 `cancelled` → `'cancelled'`；`optionId === 'allow-once'` → `'allowed-once'`；其它（含未知 id）→ `'rejected'`，不推断长期授权。[E: packages/acp/acp/src/index.ts:170] [E: packages/acp/acp/src/index.ts:171] [E: packages/acp/acp/tests/approval.spec.ts:58]

## 装配与门控

**进 shipped `acp` profile，不进 web / headless / sdk。** `@deepseek-ai/dsh-acp-app` 声明 `dsh.bundle.patch` 并依赖 `@deepseek-ai/dsh-acp`。[E: packages/bundle/acp-app/package.json:38] [E: packages/bundle/acp-app/package.json:42] 四个 shipped preset 目录仍是 `minimal` / `standard` / `ptc` / `cordis`，本桥不靠 per-session preset 挂载。[I]

门控（客户端会直接撞上）：

1. `cwd` 非绝对、非空 `additionalDirectories` → `newSession` 失败，不会 `create`。[E: packages/acp/acp/src/index.ts:516] [E: packages/acp/acp/src/index.ts:522]
2. image / audio / embedded resource：`initialize` 里 audio/embedded 标 `false`；未广告的 inline image 或 audio/resource prompt 在 admission 拒。[E: packages/acp/acp/src/index.ts:185] [E: packages/acp/acp/src/content.ts:137]
3. 单槽 prompt；空串（含只空白且无 image）拒 `empty prompt`。[E: packages/acp/acp/src/session.ts:252] [E: packages/acp/acp/src/content.ts:201]
4. 本桥拆卸之后，新的 `newSession` 报 disposed，registry 为空，不会留下 orphan agent。[E: packages/acp/acp/tests/dispose.spec.ts:197] [E: packages/acp/acp/tests/dispose.spec.ts:198]
5. permission 只有 once；未知 `optionId` 当 `rejected`。[E: packages/acp/acp/tests/approval.spec.ts:58]

源 `inject` 不含 `subagents`。[E: packages/acp/acp/src/index.ts:62] continuable 子树拆卸通过 `ctx.get('subagents')` 结构读取 `drainContinuableDescendants`；该键缺失时跳过 drain。[E: packages/acp/acp/src/session.ts:445] [E: packages/acp/acp/src/session.ts:447] 本包 `apply` 不 `provide('subagents')`。[I]

## 跨包关系

- [`spine.overview`](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。本包进 `acp` profile，不进 `web` / `headless`。
- [`subsys.integration.acp`](../../subsystems/integration/acp.md)（`subsys.integration.acp`）：同一桥的 T2 控制流 / codec 表 / 拆卸顺序。本页只写产品可见面。
- [`subsys.orchestration.subagent-acp`](../../subsystems/orchestration/subagent-acp.md)（`subsys.orchestration.subagent-acp`）：父进程 `AcpProvider`，`ctx.subprocess.spawn` 一个讲 ACP 的孩子；那是 Client，不是本 server。[E: packages/subagent/subagent-acp/src/index.ts:146] [E: packages/subagent/subagent-acp/src/index.ts:179]
- [`surface.sdk.typescript`](../sdk/typescript.md)（`surface.sdk.typescript`）：另一条 automation JSON-RPC（方法表不是 ACP 的 `newSession` / `prompt` / `cancel`）。

## Sources

- packages/acp/acp/src/index.ts
- packages/acp/acp/src/codec.ts
- packages/acp/acp/src/content.ts
- packages/acp/acp/src/session.ts
- packages/acp/acp/src/mcp.ts
- packages/acp/acp/src/updates.ts
- packages/acp/acp/package.json
- packages/acp/acp/tests/bridge.spec.ts
- packages/acp/acp/tests/turns.spec.ts
- packages/acp/acp/tests/codec.spec.ts
- packages/acp/acp/tests/approval.spec.ts
- packages/acp/acp/tests/dispose.spec.ts
- packages/acp/acp/tests/edges.spec.ts
- packages/acp/acp/tests/multi-session.spec.ts
- packages/bundle/acp-app/src/index.ts
- packages/bundle/acp-app/cordis.patch.yml
- packages/bundle/acp-app/package.json
- packages/bundle/web-app/package.json
- packages/bundle/headless/package.json
- packages/boot/app-boot/src/profile.ts
- packages/subagent/subagent-acp/src/index.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：组合主线与 host / preset 切面。
- [subsys.integration.acp](../../subsystems/integration/acp.md)（`subsys.integration.acp`）：ACP 桥 T2。
- [subsys.orchestration.subagent-acp](../../subsystems/orchestration/subagent-acp.md)（`subsys.orchestration.subagent-acp`）：进程外 ACP Client / Provider。
- [surface.sdk.typescript](../sdk/typescript.md)（`surface.sdk.typescript`）：另一条 JSON-RPC 可见面。
