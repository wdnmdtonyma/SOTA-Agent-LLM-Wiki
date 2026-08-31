---
id: subsys.integration.webhook
title: webhook 运行时
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/webhook/webhook/src/index.ts
  - packages/webhook/webhook/src/session.ts
  - packages/webhook/webhook/src/types.ts
  - packages/webhook/webhook/src/brand.ts
  - packages/webhook/webhook/src/invariant.ts
  - packages/webhook/webhook/package.json
  - packages/webhook/webhook/tests/runtime.spec.ts
  - packages/webhook/webhook/tests/session.spec.ts
  - packages/webhook/webhook-github/src/index.ts
  - packages/webhook/webhook-github/src/handler.ts
  - packages/webhook/webhook-github/src/body.ts
  - packages/webhook/webhook-github/src/types.ts
  - packages/webhook/webhook-github/package.json
  - packages/webhook/README.md
  - apps/cli/config/examples/github-review/cordis.yml
  - apps/cli/package.json
symbols:
  - WebhookRuntime
  - ctx.webhookRuntime
  - createWebhookSession
  - VerifiedWebhookDelivery
  - WebhookRule
  - WebhookSessionRequest
  - createGitHubWebhookHandler
related:
  - spine.capability-seams
  - subsys.host.webserver
  - subsys.persistence.workspace
  - subsys.core.agent
  - subsys.core.agent-default-model
  - subsys.composition.agent-presets
  - subsys.interaction.permission-presets
  - subsys.persistence.credentials
  - subsys.persistence.title
evidence: explicit
status: verified
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-webhook` 在 Host 上提供 `ctx.webhookRuntime`：可信规则 `register` / 已认证 delivery `dispatch`，唯一内建动作是在 Web Workspace 里创建普通根 Session。GitHub 是 shipped provider：`@deepseek-ai/dsh-webhook-github` 在 `ctx.webServer` 上挂精确 POST 路由，验签后 `dispatch` 并立刻 `202`。两个包都不进六个 shipped bundle 的 patch；`apps/cli` 的 dependency 只给 overlay 解析。

## 能回答的问题

- `ctx.webhookRuntime` 的 Definition / Provider / Consumer 各在哪？GitHub adapter 是 provider 还是 consumer？
- `dispatch` 是同步返回还是等规则 / Session？`run` 返回 `null` 会发生什么？
- Session 创建失败会不会让 HTTP 变 5xx？runtime 记不记 delivery 去重？
- `dsh-base` / `dsh-web-app` / shipped preset 默认装 webhook 吗？example overlay 怎么隔离第二台 `webServer`？
- GitHub handler 要哪些头、哪些 HTTP 状态码、secret 走哪条凭据？

## 职责边界

**本页权威**：`WebhookRuntime`（Cordis Service 名 `'webhookRuntime'`）、`register` / `dispatch`、`createWebhookSession`、GitHub `apply` + `createGitHubWebhookHandler`。[E: packages/webhook/webhook/src/index.ts:15] [E: packages/webhook/webhook/src/index.ts:73] [E: packages/webhook/webhook-github/src/index.ts:12] 包名 `@deepseek-ai/dsh-webhook` / `@deepseek-ai/dsh-webhook-github`。[E: packages/webhook/webhook/package.json:2] [E: packages/webhook/webhook-github/package.json:2]

它**不**拥有：

- `ctx.webServer` 路由表与 HTTP listen — [`subsys.host.webserver`](../host/webserver.md)（`subsys.host.webserver`）。GitHub 只 `register` 一条 `kind: 'exact'` 路由。[E: packages/webhook/webhook-github/src/index.ts:50]
- Workspace 登记 / attach — [`subsys.persistence.workspace`](../persistence/workspace.md)（`subsys.persistence.workspace`）。本包只 `create` + `attachSession`。[E: packages/webhook/webhook/src/session.ts:133]
- Agent 生命周期 — [`subsys.core.agent`](../core/agent.md)（`subsys.core.agent`）。prompt 用 `handle.agent.followup`；失败路径才 `handle.dispose`。[E: packages/webhook/webhook/src/session.ts:155] [E: packages/webhook/webhook/src/session.ts:176]
- 默认模型 / preset / permission / title / credentials — 对应 [`subsys.core.agent-default-model`](../core/agent-default-model.md)、[`subsys.composition.agent-presets`](../composition/agent-presets.md)、[`subsys.interaction.permission-presets`](../interaction/permission-presets.md)、[`subsys.persistence.title`](../persistence/title.md)、[`subsys.persistence.credentials`](../persistence/credentials.md)。

**默认产品树零 webhook。** `packages/bundle/**` 的 patch / manifest 没有 `dsh-webhook` 行。`apps/cli` 把两包装进 `dependencies`。[E: apps/cli/package.json:94] [E: apps/cli/package.json:95] 真实 overlay：`apps/cli/config/examples/github-review/cordis.yml` 插入 `id: webhook-runtime` 与隔离 `webServer` 的 `github-webhook-ingress` group。[E: apps/cli/config/examples/github-review/cordis.yml:5] [E: apps/cli/config/examples/github-review/cordis.yml:20] 四个 shipped preset（`minimal` / `standard` / `ptc` / `cordis`）没有 webhook 行。五个 shipped profile（`web` / `headless` / `sdk` / `sdk-minimal` / `acp`）默认不挂本包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/webhook/webhook/src/index.ts` | `WebhookRuntime`：`register` / `dispatch` / lifecycle |
| `packages/webhook/webhook/src/session.ts` | `createWebhookSession`：Workspace + Agent + prompt |
| `packages/webhook/webhook/src/types.ts` | `VerifiedWebhookDelivery` / `WebhookRule` / `WebhookSessionRequest`；`MessageSourceMap.webhook` |
| `packages/webhook/webhook/src/brand.ts` | `WebhookRuleId` / `WebhookSourceId` / `WebhookDeliveryId` |
| `packages/webhook/webhook/src/invariant.ts` | 入箱 webhook 消息必须恰好挂在 cwd Workspace 上 |
| `packages/webhook/webhook-github/src/index.ts` | function plugin `name: 'webhook-github'`；`Config` + `apply` |
| `packages/webhook/webhook-github/src/handler.ts` | 验签、投影 `kind: 'github'`、`dispatch`、`202` |
| `packages/webhook/webhook-github/src/body.ts` | `WebhookHttpError` + `readBoundedUtf8Body` |
| `packages/webhook/webhook-github/src/types.ts` | `WebhookEventMap.github` |
| `apps/cli/config/examples/github-review/cordis.yml` | opt-in overlay：第二台 `127.0.0.1:3081` + `/github` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `VerifiedWebhookDelivery` | `kind` / `source` / `deliveryId` / `event` / `receivedAt`。`dispatch` 先 `snapshotJsonValue` + `deepFreeze`；缺字段或非无损 JSON 同步抛。[E: packages/webhook/webhook/src/types.ts:14] [E: packages/webhook/webhook/src/index.ts:52] |
| `WebhookRule` | `id` + `kind` + `run(delivery, signal)`。`run` 返回 `WebhookSessionRequest` 或 `null`。[E: packages/webhook/webhook/src/types.ts:54] |
| `WebhookSessionRequest` | 必填 `workspacePath`（绝对路径）、`title`、`prompt`、`agentPreset`、`permissionPreset`；可选 `model.{provider,model,maxTokens}`。省略 `model` 时用 `ctx.agentDefaultModel.currentSelection()`。[E: packages/webhook/webhook/src/types.ts:38] [E: packages/webhook/webhook/src/session.ts:64] |
| `MessageSourceMap.webhook` | 入箱 `source.kind: 'webhook'`，带 `provider` / `source` / `deliveryId` / `ruleId` / `form: 'notice'`。[E: packages/webhook/webhook/src/types.ts:74] [E: packages/webhook/webhook/src/session.ts:157] |
| GitHub `Config` | 必填 `source`、`path`（绝对非根、无尾斜杠 / query / fragment）、`secretEnv`（`credential-ref`）、`maxBodyBytes` ≥ 1。[E: packages/webhook/webhook-github/src/index.ts:28] [E: packages/webhook/webhook-github/src/index.ts:40] |
| `GitHubWebhookEvent` | `{ name, payload }`：`name` 来自 `X-GitHub-Event`；`payload` 是验签后的 JSON object。[E: packages/webhook/webhook-github/src/types.ts:9] [E: packages/webhook/webhook-github/src/handler.ts:107] |

`deliveryId` 只作 provenance；runtime **不做** 去重。[E: packages/webhook/webhook/src/brand.ts:12]

## 控制流

1. Host overlay 加载 `@deepseek-ai/dsh-webhook`（`export default WebhookRuntime`）。构造函数 `super(ctx, 'webhookRuntime')`，并登记 lifecycle effect：unload 时 `closing = true`，drain 全部 registration。[E: packages/webhook/webhook/src/index.ts:73] [E: packages/webhook/webhook/src/index.ts:76] [E: packages/webhook/webhook/src/index.ts:178]

2. 可信规则插件 `inject: ['webhookRuntime']`，调用 `register(rule)`。重复 `id`、空 `kind`、缺 `run`、runtime 正在关闭：同步抛。成功则 `ctx.effect` 把规则放进 `Map`。[E: packages/webhook/webhook/src/index.ts:89] [E: packages/webhook/webhook/src/index.ts:108]

3. GitHub `apply`：`assertConfig` 后 `ctx.webServer.register({ kind: 'exact', path, handler })`。[E: packages/webhook/webhook-github/src/index.ts:47] [E: packages/webhook/webhook-github/src/index.ts:59]

4. HTTP：仅 `POST` + `application/json`；读 bounded UTF-8 body；要求单值头 `x-hub-signature-256` / `x-github-delivery` / `x-github-event`；`ctx.credentials.resolve(secretEnv)`；`@octokit/webhooks` `verify`；失败分别 `405` / `415` / `400` / `503`（无 secret）/ `401`。[E: packages/webhook/webhook-github/src/handler.ts:84] [E: packages/webhook/webhook-github/src/handler.ts:105] Body 超限 `413`。[E: packages/webhook/webhook-github/src/body.ts:43]

5. 投影 `VerifiedWebhookDelivery<'github'>` 后 `ctx.webhookRuntime.dispatch(delivery)`。`dispatch` **同步返回**（规则在 `Promise.resolve().then` 里跑）。handler 立刻 `202`，不等 `run` / Session。[E: packages/webhook/webhook-github/src/handler.ts:115] [E: packages/webhook/webhook-github/src/handler.ts:120] [E: packages/webhook/webhook/src/index.ts:126] dispatch 抛则 HTTP `503` `webhook runtime is unavailable`。[E: packages/webhook/webhook-github/src/handler.ts:118]

6. `dispatch` 按 `rule.kind === snapshot.kind` 扇出；每条 `startInvocation`。`run` 返回非 `null` 才 `createWebhookSession`。失败只 `logger.warn`，不回写 HTTP。[E: packages/webhook/webhook/src/index.ts:130] [E: packages/webhook/webhook/src/index.ts:142] [E: packages/webhook/webhook/src/index.ts:156]

7. `createWebhookSession`：校验 request → `permissionPresets.resolve` → `agentPresets.resolve` → `workspaceRegistry.create` → `agents.create`（`sessionId` 形如 `webhook-${uuid}`，`meta.cwd` = workspace.path）→ `attachSession` → `permissionPresets.set` → `sessionTitle.rename` → `followup` 一条 webhook-source 用户消息。attach 之后失败会 `detachSession` + `handle.dispose`。[E: packages/webhook/webhook/src/session.ts:127] [E: packages/webhook/webhook/src/session.ts:136] [E: packages/webhook/webhook/src/session.ts:150] [E: packages/webhook/webhook/src/session.ts:168]

8. 规则 dispose：从 map 删除、abort controller、`allSettled` drain active invocations。[E: packages/webhook/webhook/src/index.ts:167]

## Seam 三角

| 角色 | 位置 |
|---|---|
| **Definition** | `declare module '@deepseek-ai/cordis' { interface Context { webhookRuntime: WebhookRuntime } }` @ `packages/webhook/webhook/src/index.ts`。[E: packages/webhook/webhook/src/index.ts:15] 官方 capability 表把此 seam 标在 core 列，实现包仍是 `packages/webhook/webhook`。 |
| **Provider** | 同一文件 `export default WebhookRuntime` / `super(ctx, 'webhookRuntime')`。Host overlay 必须显式 insert；shipped bundle 不提供。 |
| **Consumer** | (1) 用户规则插件：`inject: ['webhookRuntime']` + `register`。(2) shipped GitHub adapter：`inject = ['webServer', 'webhookRuntime', 'credentials']`，在 handler 里 `dispatch`。[E: packages/webhook/webhook-github/src/index.ts:14] [E: packages/webhook/webhook-github/src/handler.ts:115] (3) `createWebhookSession` 再消费 `agents` / `agentDefaultModel` / `agentPresets` / `permissionPresets` / `sessionTitle` / `workspaceRegistry`（runtime `static inject`）。[E: packages/webhook/webhook/src/index.ts:59] |

没有 waterfall。没有 isolate 在 runtime 包上。GitHub **ingress** 建议 `isolate: webServer: true` 另起一台 listen，避免把 UI API 暴露到 webhook 端口。[E: apps/cli/config/examples/github-review/cordis.yml:20]

## 设计动机

Fire-and-forget：HTTP 成功只表示「已认证并已入内存队列」。规则可以调任意 trusted 代码（含外部 API），runtime 不存 delivery 日志、不重试、不把完成态回推 GitHub。Session 一旦 `followup` 成功，就是普通 Workspace 根会话。

## Gotcha

- 同一 `kind` 的多条规则会**全部**启动；匹配只比 `kind` 字符串，不比 `source`。过滤 `source` / repo / event name 是规则自己的事。
- `run` 抛错只 warn；HTTP 已经 `202`。
- GitHub `source` 是 adapter 实例名（example 用 `primary-github`），不是 GitHub org。
- invariant companion：`agent/inbox/spliced` 里 webhook 消息要求 Session 恰好属于一个 Workspace 且 path == `header.cwd`。[E: packages/webhook/webhook/src/invariant.ts:30] GitHub invariant 是空 installer。[E: packages/webhook/webhook-github/src/invariant.ts:17]

## Sources

- `packages/webhook/webhook/src/index.ts`
- `packages/webhook/webhook/src/session.ts`
- `packages/webhook/webhook/src/types.ts`
- `packages/webhook/webhook/src/brand.ts`
- `packages/webhook/webhook/src/invariant.ts`
- `packages/webhook/webhook/package.json`
- `packages/webhook/webhook/tests/runtime.spec.ts`
- `packages/webhook/webhook/tests/session.spec.ts`
- `packages/webhook/webhook-github/src/index.ts`
- `packages/webhook/webhook-github/src/handler.ts`
- `packages/webhook/webhook-github/src/body.ts`
- `packages/webhook/webhook-github/src/types.ts`
- `packages/webhook/webhook-github/package.json`
- `packages/webhook/README.md`
- `apps/cli/config/examples/github-review/cordis.yml`
- `apps/cli/package.json`

## 相关

- [`spine.capability-seams`](../../spine/capability-seams.md) — `ctx.webhookRuntime` 在 seam 表里
- [`subsys.host.webserver`](../host/webserver.md) — GitHub exact route
- [`subsys.persistence.workspace`](../persistence/workspace.md) — `create` / `attachSession`
- [`subsys.core.agent`](../core/agent.md) — `agents.create` / `followup`
- [`subsys.core.agent-default-model`](../core/agent-default-model.md) — 省略 `model` 时的选择
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — `resolve` / `mount`
- [`subsys.interaction.permission-presets`](../interaction/permission-presets.md) — `resolve` / `set`
- [`subsys.persistence.credentials`](../persistence/credentials.md) — GitHub secret
- [`subsys.persistence.title`](../persistence/title.md) — `sessionTitle.rename`
