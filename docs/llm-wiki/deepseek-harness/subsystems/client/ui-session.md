---
id: subsys.client.ui-session
title: ui-session 会话列表
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/ui-session/src/index.ts
  - packages/client/ui-session/src/client/index.ts
  - packages/client/ui-session/src/client/session-provider.tsx
  - packages/client/ui-session/src/invariant.ts
  - packages/client/ui-session/package.json
  - packages/client/ui-session/tests/ui-session.client.spec.ts
  - packages/api/session-controller/src/client/index.ts
  - packages/api/session-controller/src/client/contract/sessions.ts
  - packages/api/session-controller/src/client/sessions/service.ts
  - packages/api/session-controller/src/client/sessions/manager.ts
  - packages/api/session-controller/src/list.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
symbols:
  - UiSession
  - ctx.uiSession
  - renderSessionArea
  - UseSessions
  - UseSession
  - SessionPendingInteraction
  - registerPendingInteraction
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.client.runtime
  - subsys.client.ui-slots
  - subsys.client.ui-layout
  - subsys.client.ui-conversation
  - subsys.client.connection
  - subsys.host.apiproxy
  - surface.web.workbench
  - surface.profiles.web
  - subsys.composition.bundle-web-app
evidence: explicit
status: verified
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-client-ui-session` 是浏览器里的 **Session 根源适配器**：host `apply` 为空；client 把 `ctx.sessions.list` 接到全局 `useSessions`，把 `session` / `session-maybe` 槽接到 `UiSession.adapter`，并把 `ctx.uiSession` 交给会话面装配。它不画侧栏列表、不发 list RPC、不执行模型 turn。列表行与 `current` 的权威在 Session Controller 客户端（[`subsys.client.runtime`](runtime.md)）；host 冷列表投影在 `ApiSessionList`（[`subsys.host.apiproxy`](../host/apiproxy.md)）。

## 能回答的问题

- `id: ui-session` 出现在哪一层 bundle？`dsh-base` / `dsh-headless` / `sdk` / `sdk-minimal` / `acp` 有没有这行？
- host `apply` 与 client `inject` 各吃什么？`ctx.uiSession` 和 `ctx.sessions` 谁管导航、谁管槽绑定？
- `useSessions` / `useSession` / `useProjection` / `useSessionPendingInteraction` 分别绑到哪份 snapshot？
- `UiSession.provide` 怎样扩展 session-scope 标准 props？undeclared / missing / duplicate 怎样 fail-loud？
- `registerPendingInteraction` 的 precedence 与 fiber dispose 顺序是什么？
- 侧栏会话列表 UI 是否在本包？若不在，本页只写哪条 seam？

## 职责边界

本包装的是 **Slot 标准源 + Session 作用域适配**，不是第二个 `ISessions`，也不是 sidebar 组件树。五个 shipped profile 是 `web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）；本仓没有 shipped TUI。`dsh web` 是唯一硬编码的 profile 子命令；其余用 `dsh --profile sdk|sdk-minimal|acp|headless`。

**拥有**

- node 半边：空 `apply()`（Loader 仍需要 host 入口）。
- 浏览器半边：`UiSession`（服务名 `'uiSession'`）、`renderSessionArea`、pending-interaction 聚合、`slots.provideRoot` 的 `sessions` / `sessionPendingInteraction` hooks、`slots.installScope('session', adapter)`。
- invariant companion：`client-ui-session-invariant`，`install` 为空（一致性由 materialize 路径强制）。

**不拥有**

- `ctx.sessions` / `ISessions` / `ClientSessions` / `Session` / `SessionListState` 写入：[`subsys.client.runtime`](runtime.md)。本页只消费 `list` 与 `binding(id)`。
- HTTP / WS mux、`session.list` Remote、host `ApiSessionList`：[`subsys.host.apiproxy`](../host/apiproxy.md)。
- `ctx.slots` Provider：[`subsys.client.ui-slots`](ui-slots.md) + ui-renderer。
- 三栏壳与 `sidebar` 座位：[`subsys.client.ui-layout`](ui-layout.md)。**侧栏会话列表像素**在 `@deepseek-ai/dsh-client-ui-sidebar`（web-app 下一行 `id: ui-sidebar`），本 wiki **不另开 ui-* 页**；侧栏是 `useSessions` 的 Consumer。 [E: packages/bundle/web-app/cordis.patch.yml:187]
- composer / `sendSession`：[`subsys.client.ui-conversation`](ui-conversation.md)（client `inject` 含 `uiSession`）。

`package.json` 的 `dsh.client` 把本包标成 `platform: "web"`，inject `@deepseek-ai/dsh-api-session-controller` 与 `@deepseek-ai/dsh-client-ui-renderer`。 [E: packages/client/ui-session/package.json:34] [E: packages/client/ui-session/package.json:38]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/ui-session/src/index.ts` | host `apply`：空函数 |
| `packages/client/ui-session/src/client/index.ts` | `UiSession`、`inject`、`apply`、pending domain |
| `packages/client/ui-session/src/client/session-provider.tsx` | `renderSessionArea`：无 key → empty；有 key → `Fragment key={sessionId}` |
| `packages/client/ui-session/src/invariant.ts` | `ctx.invariants.register('@deepseek-ai/dsh-client-ui-session', noop)` |
| `packages/client/ui-session/tests/ui-session.client.spec.ts` | 绑定缓存、provide fail-loud、pending precedence、apply 安装 |
| `packages/api/session-controller/src/client/contract/sessions.ts` | `ISessions` 合同（权威在 runtime 节点） |
| `packages/api/session-controller/src/client/sessions/service.ts` | `SessionListState` / `SessionSummary` / `ClientSessions` |
| `packages/api/session-controller/src/client/sessions/manager.ts` | `SessionManager`：list phase、completed 提醒 |
| `packages/api/session-controller/src/list.ts` | host `ApiSessionList`：冷 `sessionListMetadata` |
| `packages/bundle/web-app/cordis.patch.yml` | 唯一 shipped insert：`id: ui-session` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `UseSessions` | `SnapshotSelectorHook<SessionListState>`；根 hook 名 `useSessions`。 [E: packages/client/ui-session/src/client/index.ts:28] |
| `UseSession` | `SnapshotSelectorHook<SessionSnapshot>`；session-scope hook 名 `useSession`。 [E: packages/client/ui-session/src/client/index.ts:32] |
| `SessionListState` | `ids` / `byId` / `current` / `phase` / `subagentsByParent` / `jobsBySession` / `currentAddress`。`current` 与列表同行，sidebar 高亮与中栏共享一源。权威类型在 session-controller。 [E: packages/api/session-controller/src/client/sessions/service.ts:69] |
| `SessionSummary` | 行：`id`、`displayTitle`、`running`、`blank`、`updatedAt`，可选 `title` / `cwd` / `parentId` / `origin` / `completed`。 [E: packages/api/session-controller/src/client/sessions/service.ts:39] |
| `SessionBinding` | `sessionId` + `session`（`SessionFace`）+ `eventSource` + Agent-scoped `ctx`。`adapter.resolve` 走 `sessions.binding`。 [E: packages/api/session-controller/src/client/sessions/service.ts:128] |
| `ISessions` | `list` 是只读 feed；`create` / `open` / `clear` / `fork` / `search` / `binding` 在对象层。 [E: packages/api/session-controller/src/client/contract/sessions.ts:21] |
| `BUILTIN_SOURCE` | hooks `session`、keyed `projection`、prop `sessionId`。 [E: packages/client/ui-session/src/client/index.ts:197] |
| `SessionPendingInteractionBase` | `key` + `kind` + `sessionId`；同 key 二次 `publish` 抛错。 [E: packages/client/ui-session/src/client/index.ts:35] |

## 控制流

1. **只有 web-app 把本包插进 Loader 表。** `PROFILE_TEMPLATES.web` 叠 `dsh-base` 再叠 `dsh-web-app`。web patch insert 含 `id: ui-session` / `name: '@deepseek-ai/dsh-client-ui-session'`。`dsh-base` insert 从 `timer` / `hmr` / `llm` 起，没有浏览器 roster。`dsh-headless` insert 是 `code-runtime` + `headless-startup` + `headless-runner`。sdk / sdk-minimal / acp overlay 也不插入本包。 [E: packages/bundle/web-app/cordis.patch.yml:184] [E: packages/bundle/web-app/cordis.patch.yml:185] [E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/headless/cordis.patch.yml:19]

2. **host `apply` 是空函数。** Loader 仍加载 `packages/client/ui-session/src/index.ts`，但 node 半边不登记 settings、不碰 `ctx.sessions`。测试钉死 `nodeApply()` 不抛。 [E: packages/client/ui-session/src/index.ts:4] [E: packages/client/ui-session/tests/ui-session.client.spec.ts:552]

3. **client `inject` 是两条服务名。** `export const inject` = `'sessions'` / `'slots'`。缺任一条，插件 fiber 保持 pending。 [E: packages/client/ui-session/src/client/index.ts:499]

4. **`apply` 提供 `ctx.uiSession`，再把根源与 scope adapter 交给 slots。** `new UiSession(ctx, ctx.sessions)`（服务名 `'uiSession'`）。`slots.provideRoot({ hooks: { sessions: ctx.sessions.list, sessionPendingInteraction: service.pendingInteractions } })`。`slots.installScope('session', service.adapter)`。测试断言这两次调用与 `ctx.uiSession` 类型。 [E: packages/client/ui-session/src/client/index.ts:506] [E: packages/client/ui-session/src/client/index.ts:507] [E: packages/client/ui-session/src/client/index.ts:513] [E: packages/client/ui-session/tests/ui-session.client.spec.ts:541]

5. **current 绑定跟着 `sessions.list`。** `UiSession` 构造里 `sessions.list.subscribe` → `publishCurrent()`。`resolveCurrent` 读 `list.getSnapshot().current`；无 current 或 `binding` 缺失则用 absent 绑定（hooks/props 全 `undefined`）。缓存命中条件是同一 `SessionBinding` 对象。fiber dispose 时清掉所有 materialized binding。 [E: packages/client/ui-session/src/client/index.ts:259] [E: packages/client/ui-session/src/client/index.ts:355]

6. **`materialize` 把 descriptor 合成 `ScopedStandardSourceBinding` 并 `slots.bindStoreScope`。** 内建：`hooks.session = binding.session`，`keyedHooks.projection(key) = binding.session.projections.faceOf(key)`，`props.sessionId`。`provide()` 在 fiber 上 push descriptor 并 `rebuildBindings()`；undeclared / missing / duplicate（含 hook 名撞到 `useX`）抛 `uiSession.provide: …`，失败时回滚 descriptors。 [E: packages/client/ui-session/src/client/index.ts:424] [E: packages/client/ui-session/src/client/index.ts:458] [E: packages/client/ui-session/src/client/index.ts:493]

7. **`renderSessionArea` 是 scope 的 React 座位语义。** `binding.key === undefined` → `empty?.() ?? null`；否则 `<Fragment key={sessionId}>{children}</Fragment>`。测试钉死 empty 只在无会话时调用。 [E: packages/client/ui-session/src/client/session-provider.tsx:18] [E: packages/client/ui-session/src/client/session-provider.tsx:19]

8. **pending interaction 独立于 Controller snapshot。** `registerPendingInteraction(precedence)` 返回 publisher；同 session 取 precedence 最大（相等则后写覆盖）。domain fiber dispose：**先** `release()` 清空可见 map、**再** `Promise.allSettled` 等 owner delegate。duplicate key 抛 `ui-session: duplicate pending interaction key`。 [E: packages/client/ui-session/src/client/index.ts:304] [E: packages/client/ui-session/src/client/index.ts:314] [E: packages/client/ui-session/src/client/index.ts:83]

9. **对象层刷新列表，适配器只订阅。** `ClientSessions` 持有 `list` store；`open` / `clear` 写 selection。host 半边 `ApiSessionList` 登记 `sessionListMetadata`（`blank` + `lastPromptAt`）。ui-session 不调用 `refresh()` / `search()`。 [E: packages/api/session-controller/src/client/sessions/service.ts:191] [E: packages/api/session-controller/src/list.ts:81] [E: packages/api/session-controller/src/list.ts:90]

10. **session-controller client `apply` 先于 ui-session。** 它 `new ClientSessions`、订 `api-session/*`、开 control stream。模块 `inject` 是 typert / remote 族，不是 React。 [E: packages/api/session-controller/src/client/index.ts:88] [E: packages/api/session-controller/src/client/index.ts:90]

## 设计动机

- **一份 list + current。** 侧栏高亮与 `session` / `session-maybe` 槽共用 `sessions.list`，避免第二份 selection store。
- **适配器薄、对象层厚。** React hook 名与 Slot scope 属于 ui-session；RPC、scope 生命周期、`prompt` 属于 session-controller client（runtime 节点）。
- **扩展走 `provide` 静态 roster。** 特征包装 session-scope 标准 props 时必须声明 hooks / keyedHooks / props，防止静默撞名。
- **pending 与 snapshot 解耦。** approval / user-questions 等交互可以在不改 `SessionSnapshot` 的情况下争同一 session 的可见席。

## Gotcha

- 本包 **没有** 会话列表 JSX。找「左侧会话列表怎么画」去 ui-sidebar 源码，不要在本页发明组件树。
- `ctx.uiSession` 不能代替 `ctx.sessions.open` / `create`：适配器只投影 binding。
- `installScope('session', …)` 同时服务 `session` 与 `session-maybe`（absent 绑定的 `key` 为 `undefined`）。
- `ISessions.open` 对未知 id fail-loud；adapter `resolve` 对 missing 返回 `undefined`，current 回落到 absent。
- `completed` 在 `SessionSummary` 上是 manager 的「未选中完成」提醒，不是 turn 成功码。 [E: packages/api/session-controller/src/client/sessions/manager.ts:96]
- 工作树里已删除的 `packages/client/runtime` 不是本包的前身；对象层现址是 `packages/api/session-controller/src/client/`。

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | `ISessions.list: ObservableSnapshot<SessionListState>`、`SessionBinding`、Slot `GlobalStandardProps.useSessions` / `SessionStandardProps.useSession`。合同在 session-controller client + ui-session 的 module augmentation。 |
| **Provider** | 对象层：`ClientSessions` `provide` `ctx.sessions`（session-controller client `apply`）。适配层：`UiSession` `provide` `ctx.uiSession`，`slots.provideRoot` / `installScope('session')`。host 列表投影：`ApiSessionList`。 |
| **Consumer** | ui-sidebar（列表像素，本 wiki 不拆页）；ui-conversation（`inject` 含 `uiSession`）；任何 `session` / `session-maybe` 槽 occupant；pending-interaction 域（approval / questions 等通过 `registerPendingInteraction`）。 |

换掉 Session Controller client 会同时拿走 `list` 形状与 `binding()`；换掉 ui-session 会让 `useSessions` / session scope 标准 props 消失，但 Remote 仍可被非 React 消费者调用。

## Sources

- `packages/client/ui-session/src/index.ts`
- `packages/client/ui-session/src/client/index.ts`
- `packages/client/ui-session/src/client/session-provider.tsx`
- `packages/client/ui-session/src/invariant.ts`
- `packages/client/ui-session/package.json`
- `packages/client/ui-session/tests/ui-session.client.spec.ts`
- `packages/api/session-controller/src/client/index.ts`
- `packages/api/session-controller/src/client/contract/sessions.ts`
- `packages/api/session-controller/src/client/sessions/service.ts`
- `packages/api/session-controller/src/client/sessions/manager.ts`
- `packages/api/session-controller/src/list.ts`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/headless/cordis.patch.yml`

## 相关

- [`subsys.client.runtime`](runtime.md) — `ctx.sessions` / `ClientSessions` / store；本页不重写 `Session.prompt`。
- [`subsys.client.ui-slots`](ui-slots.md) — `provideRoot` / `installScope` / 标准 props 命名。
- [`subsys.client.ui-layout`](ui-layout.md) — `sidebar` 座位声明。
- [`subsys.client.ui-conversation`](ui-conversation.md) — 消费 `uiSession` 的中栏装配。
- [`subsys.client.connection`](connection.md) — HTTP / WS 信任篱笆。
- [`subsys.host.apiproxy`](../host/apiproxy.md) — host Session HTTP API 与 `ApiSessionList`。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从壳到 `session.prompt` 的走读。
- [`surface.web.workbench`](../../surface/web/workbench.md) — 工作台可见面。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile roster。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 插入 `id: ui-session` 的 bundle。
