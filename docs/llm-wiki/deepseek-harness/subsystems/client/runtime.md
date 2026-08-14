---
id: subsys.client.runtime
title: client runtime
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/runtime/src/index.ts
  - packages/client/runtime/src/client/index.ts
  - packages/client/runtime/src/client/slots.ts
  - packages/client/runtime/src/client/sessions/service.ts
  - packages/client/runtime/src/client/sessions/manager.ts
  - packages/client/runtime/src/client/sessions/session.ts
  - packages/client/runtime/src/client/workspaces/service.ts
  - packages/client/runtime/src/client/workspaces/manager.ts
  - packages/client/runtime/src/client/conversation/event-registry.ts
  - packages/client/runtime/src/client/conversation/view-registry.ts
  - packages/client/runtime/src/client/contract/sessions.ts
  - packages/client/runtime/src/client/contract/sessions-port.ts
  - packages/client/runtime/src/client/contract/workspaces.ts
  - packages/client/runtime/src/client/contract/session.ts
  - packages/client/runtime/src/client/sessions/conversation.ts
  - packages/client/runtime/src/client/agents/scope.ts
  - packages/client/runtime/package.json
  - packages/client/runtime/tests/node-half.client.spec.ts
  - packages/client/runtime/tests/client-apply.client.spec.ts
  - packages/client/runtime/tests/session.client.spec.ts
  - packages/client/runtime/tests/workspaces-service.client.spec.ts
  - packages/client/runtime/tests/slots-service.client.spec.ts
  - packages/client/runtime/tests/manager.client.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/client/ui-slots/src/index.ts
symbols:
  - SlotRegistry
  - SessionRuntime
  - WorkspaceRuntime
  - ctx.slots
  - ctx.sessions
  - ctx.workspaces
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.client.modules
  - subsys.client.connection
  - subsys.client.ui-slots
  - subsys.client.ui-conversation
  - subsys.host.apiproxy
  - surface.profiles.web
  - subsys.composition.bundle-web-app
  - subsys.composition.bundle-headless
  - subsys.client.web
  - subsys.client.ui-layout
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-client-runtime` 是浏览器半边的 **对象层**：node 半边 `apply` 是空函数；浏览器半边提供 `ctx.slots` / `ctx.sessions` / `ctx.workspaces` 以及 conversation event / view registry，并把 mux `session/event` 折进 `Session` 窗口。它不执行模型 turn，也不实现 `ctx.fs` / agent-loop。

## 能回答的问题

- host `apply` 为什么是空函数？行为全在哪一半？web-app 的 `id: client-runtime` 行出现在哪份 bundle？
- `ctx.slots` / `ctx.sessions` / `ctx.workspaces` 谁 `provide`？`SlotRegistry` 和 ui-slots `SlotCore` 怎么分？
- `workspaces.startInitialSelection` 何时不动、何时 `connectWorkspace`？没有 Workspace 会不会凭空 `session.create`？
- `SessionManager.create` 发哪条 RPC？`Session.prompt` 为何必须在第一个 await 之前置 `promptAttempted`？
- mux `session/event` 怎样进 `acceptLiveEvent`？未实例化的 `Session` 会丢掉哪些帧？
- `dsh-base` / `dsh-web-app` / `dsh-headless` 各自有没有这条 client 对象层？host 面的 `ctx.sessions` 和浏览器的 `ctx.sessions` 是不是同一个服务？

## 职责边界

DSH 是 **Cordis 组合运行时**（主线 `profile → bundle → agent preset`），不是「又一个 coding agent」。capability seam = Definition / Provider / Consumer。进入模型请求的内容必须能从 append-only session log 重建（`model-visible ⟺ logged`）。默认安装路径是本地 Web GUI（`dsh web` / `--profile web`）；本仓没有 shipped TUI。launcher 在 `provide('webStartup')` **之前**拒绝 `--host 0.0.0.0`（旗标解析在 [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md)，不是本包）。

本包是 `dsh.client` 双面插件的 **对象层**：

- **拥有（browser half）**：`SlotRegistry`（`ctx.slots`，内建 `'root'` 槽的 Service 层）、`SessionRuntime` / `SessionManager` / `Session`、`WorkspaceRuntime`、`ConversationEventRegistry` / `ConversationViewRegistry`、连接代次上的 mux / host 帧分发、Agent scope 树（`createScope`，agent id === session id）。
- **拥有（node half）**：空 `apply`，只为 Loader 治理与 `dsh.client` 发现占位。[E: packages/client/runtime/src/index.ts:4]
- **不拥有**：HTTP `/api` 与信任篱笆（[`subsys.client.connection`](connection.md)）；slot 纯核声明语义（[`subsys.client.ui-slots`](ui-slots.md) 的 `SlotCore`）；composer / `InputHub`（[`subsys.client.ui-conversation`](ui-conversation.md)）；壳 `AppWebEntry`（[`subsys.client.web`](web.md)）；host 面 BFF `session.create` / `session.prompt` 实现（[`subsys.host.apiproxy`](../host/apiproxy.md)）；模型 turn（`ReactLoopAgent`）。

client **不**执行模型 turn：`Session.prompt` 只发 unary RPC，事件窗口是 log 投影。浏览器会话一律由 Host 创建；client 不持有实体化之前的中间会话。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/runtime/src/index.ts` | node 半边：空 `apply` |
| `packages/client/runtime/src/client/index.ts` | browser `apply`：挂 slots / sessions / workspaces / conversation registry，启动 connection stream |
| `packages/client/runtime/src/client/slots.ts` | `SlotRegistry`：`SlotCore` 的 Service 层；`slots/changed`、fiber `ctx.effect` 卸载、renderer、store 实例轴 |
| `packages/client/runtime/src/client/sessions/service.ts` | `SessionRuntime`：list store、current、scope 树、`create` / `open` / `binding` |
| `packages/client/runtime/src/client/sessions/manager.ts` | `SessionManager`：实例簇、`session.create` / list / mux·host 分发 |
| `packages/client/runtime/src/client/sessions/session.ts` | `Session`：`prompt`、history 窗口、`acceptLiveEvent`、`composerPhase` |
| `packages/client/runtime/src/client/workspaces/service.ts` | `WorkspaceRuntime`：`startInitialSelection` / `connectWorkspace` / `startSession` |
| `packages/client/runtime/src/client/conversation/event-registry.ts` | `ctx.conversationEvents` |
| `packages/client/runtime/src/client/conversation/view-registry.ts` | `ctx.conversationViews` |
| `packages/client/runtime/src/client/contract/sessions.ts` | 外向面 `ISessions`（**没有** `create`） |
| `packages/client/runtime/src/client/contract/sessions-port.ts` | 跨域面 `SessionsPort.create`（workspaces 用） |
| `packages/client/runtime/package.json` | `dsh.client`：`platform: web`、`immediately: true` |
| `packages/bundle/web-app/cordis.patch.yml` | 唯一 shipped insert：`id: client-runtime` |
| `packages/client/runtime/tests/node-half.client.spec.ts` | 钉死 host `apply` 是 no-op |
| `packages/client/runtime/tests/client-apply.client.spec.ts` | 钉死 browser mount、初始选 Workspace、registry rebuild |
| `packages/client/runtime/tests/workspaces-service.client.spec.ts` | 钉死 reuse / 无 Workspace 不 create / current 已在则不动 |
| `packages/client/runtime/tests/session.client.spec.ts` | 钉死 `blank → engaging` 同步发生在 RPC settle 之前 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SlotRegistry` | Cordis `Service`，名 `'slots'`。内层 `SlotCore` 在构造时播种 `'root'`（`kind: 'single'` / `scope: 'root'`）。本包 `SlotMap` 合并同一行，并写明第二次 `register` 会阴影整框。 |
| `ISessions` / `ctx.sessions` | 外向面：`list`、`open` / `clear` / `fork` / `provide` / `binding` / `scope`。`create` **不**在此接口上。[E: packages/client/runtime/src/client/contract/sessions.ts:26] |
| `SessionsPort` | workspaces 跨域合同：`list` + `create({ workspaceId })` + `open` + `clear`。[E: packages/client/runtime/src/client/contract/sessions-port.ts:39] |
| `SessionRuntime` | 实现 `ISessions`，额外持有 `create` / 帧入口 / scope 生命周期。选择持久化在 `dsh.sessions.current`。[E: packages/client/runtime/src/client/sessions/service.ts:229] [E: packages/client/runtime/src/client/sessions/service.ts:286] |
| `SessionListState` | `ids` / `byId` / `current` / `phase`（`pending`→`ready`，单调）/ `subagentsByParent` / `jobsBySession` / `currentAddress`。 |
| `SessionSummary.blank` | Host 空日志位的 client 镜像，list merge 只降不升（`existing.blank && mutation.summary.blank`）。列表 UI 可隐藏 blank 行；store 保留全部行，供 `connectWorkspace` 复用。[E: packages/client/runtime/src/client/sessions/manager.ts:1089] |
| `Session` / `SessionFace` | 窗口 + `ConversationSnapshot`。`promptAttempted` 粘性：字段只写成 `true`，没有复位写回。[E: packages/client/runtime/src/client/sessions/session.ts:96] [E: packages/client/runtime/src/client/sessions/session.ts:196] `composerPhase` = `blank` \| `engaging` \| `active`（`ComposerPhase` 类型本身不含该字段）。[E: packages/client/runtime/src/client/sessions/conversation.ts:355] |
| `IWorkspaces` / `ctx.workspaces` | `connectWorkspace` / `startSession` / 目录与归档动作。`startInitialSelection` 留在具体类上，不是 feature 动词。 |
| `WorkspaceListState` | `baselinesReady` = workspace `phase==='ready'` **且** session `phase==='ready'`。`recentWorkspaceId` 只在两条基线都 ready 后派生。 |
| `ConversationEventRegistry` / `ConversationViewRegistry` | Service 名 `'conversationEvents'` / `'conversationViews'`。本页不枚举各 `kind`。 |

host 面另有一个也叫 `ctx.sessions` 的 `SessionStore`（[`subsys.core.session`](../core/session.md)）。那是进程里的 append-only log；浏览器这个 `ctx.sessions` 是 list + 对象层 + 导航态。两边不同 realm、不同类型。

## 控制流

1. **web overlay 才插入本行。** `PROFILE_TEMPLATES.web` 叠 `dsh-base` 再叠 `dsh-web-app`。web-app 第一段 `insert` 含 `id: client-runtime` / `name: '@deepseek-ai/dsh-client-runtime'`，与 `modules` / `connection` / `ui-layout` / `ui-conversation` 同表。`dsh-base` 与 `dsh-headless` 的 patch **没有**这一行：headless 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`。[E: packages/bundle/web-app/cordis.patch.yml:168] [E: packages/bundle/web-app/cordis.patch.yml:169] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

2. **node 半边是空 `apply`。** Loader 仍扫 `package.json` 的 `dsh.client`（`inject` 三个包名、`platform: web`、`immediately: true`），把浏览器入口编进 `window.__DSH_BOOT__`。host 进程里本插件不提供服务、不挂路由。测试把「调用 `apply(undefined)` 不抛」当成合同。[E: packages/client/runtime/src/index.ts:4] [E: packages/client/runtime/package.json:39] [E: packages/client/runtime/package.json:40] [E: packages/client/runtime/tests/node-half.client.spec.ts:7]

3. **浏览器 `apply` 先等 wire 服务。** client 半边 `inject = ['connection', 'typert', 'remote', 'remote.commands']`（这是 Cordis **服务名**，不是 `package.json` 里的包名）。[E: packages/client/runtime/src/client/index.ts:183]

4. **一次 mount 放下四块对象层。** `apply@packages/client/runtime/src/client/index.ts`：`ctx.plugin(SlotRegistry)`；`new ConversationEventRegistry(ctx)` / `new ConversationViewRegistry(ctx)`（`super` 服务名 `'conversationEvents'` / `'conversationViews'`）；`new SessionRuntime(ctx, connection.api, ctx.remote, conversation)`；`new WorkspaceRuntime(ctx, connection.api, sessions)`。`SessionRuntime` 用 `reflect.provide('sessions', this)`；`WorkspaceRuntime` 用 `reflect.provide('workspaces', this)`。Typert client 把 `'agent'` identity 接到 `sessions.scopeOf`。[E: packages/client/runtime/src/client/index.ts:189] [E: packages/client/runtime/src/client/index.ts:195] [E: packages/client/runtime/src/client/index.ts:199] [E: packages/client/runtime/src/client/conversation/event-registry.ts:11] [E: packages/client/runtime/src/client/conversation/view-registry.ts:10] [E: packages/client/runtime/src/client/sessions/service.ts:348] [E: packages/client/runtime/src/client/workspaces/service.ts:74]

5. **`SlotRegistry` 是 `SlotCore` 的 Service 层。** 构造 `super(ctx, 'slots')`，并把 core `onMutate` 桥成 `ctx.emit('slots/changed', key)`。`register` 必须活在 prototype 上（经 `ctx.effect(..., 'slots.register()')`）：cordis service proxy 在调用时把 `this.ctx` 绑到**调用方** fiber，卸载即 cascade。箭头属性会冻在 service 自己的 root ctx，静默弄丢 per-plugin 处置。`SlotMap['root']` 在本包合并；`SlotCore` 构造时已播种同一孔（`declaredBy: '(built-in)'`）。store 实例按 handle × scope key 缓存；session scope 死亡时 `pruneStoreScope` 清持久化。`install` / `installLocale` boot-once。`renderSlot` 只接受 `'root'`。[E: packages/client/runtime/src/client/slots.ts:105] [E: packages/client/runtime/src/client/slots.ts:106] [E: packages/client/runtime/src/client/slots.ts:41] [E: packages/client/runtime/src/client/slots.ts:470] [E: packages/client/ui-slots/src/index.ts:702] [E: packages/client/runtime/tests/client-apply.client.spec.ts:63]

6. **启动 connection stream，帧只分发、不跑 loop。** `connection.start`：`onMuxEnvelope` → `sessions.handleMuxEnvelope`；`onHostEnvelope` → sessions + workspaces，且 `host/remote-event` 交给 `ctx.remote.$dispatch`；`onConnected` → 两边 `handleConnected` 再 `ctx.emit('connection/reset')`；`onStateChange === 'reconnecting'` 才 `sessions.handleDisconnected`（必须在下一代回放帧到达之前丢掉代次内 pending）。fiber 卸载 `loop.stop()`。[E: packages/client/runtime/src/client/index.ts:206] [E: packages/client/runtime/src/client/index.ts:221] [E: packages/client/runtime/src/client/index.ts:228]

7. **`startInitialSelection` 只跑一次。** `apply` 用 `ctx.effect(() => workspaces.startInitialSelection(), …)` 挂上。已调用第二次抛 `already started`。reconcile：两条基线尚未 `baselinesReady` 则等待；`sessions.list.current` 已有 **或** `recentWorkspaceId` 缺失（没有 Workspace）则 `state='done'`，**不** `session.create`；否则 `connectWorkspace(target)`，回来时若 current 仍空才 `sessions.open`。之后用户 `clear()` 保持空，不再自动重连。失败回到 `waiting`，下一次 list 投影可重试。[E: packages/client/runtime/src/client/index.ts:201] [E: packages/client/runtime/src/client/workspaces/service.ts:139] [E: packages/client/runtime/src/client/workspaces/service.ts:144] [E: packages/client/runtime/tests/workspaces-service.client.spec.ts:547] [E: packages/client/runtime/tests/workspaces-service.client.spec.ts:563] [E: packages/client/runtime/tests/workspaces-service.client.spec.ts:572]

8. **`connectWorkspace`：复用成员 blank，否则 `sessions.create`。** 未知 `workspaceId` 立即抛。复用条件是四者同时成立：`summary.blank`、`summary.cwd === workspace.path`、`workspace.sessionIds` 含该 id、且不在 `archivedSessionIds`。只匹配 cwd、未入账的 stray blank（CLI / 其它进程在 host cwd 生出的会话）不能劫持。并发 connect 按 workspace 单飞，避免 create 回声尚无 cwd 时再 mint 一个隐藏 blank。命中则同步返回已有 id（`binding` 立即可用）；未命中走 `SessionsPort.create({ workspaceId })`。[E: packages/client/runtime/src/client/workspaces/service.ts:110] [E: packages/client/runtime/src/client/workspaces/service.ts:112] [E: packages/client/runtime/tests/workspaces-service.client.spec.ts:250]

9. **`SessionRuntime.create` → `SessionManager.create` 发 `session.create`。** manager 组 payload（`workspaceId` 优先，否则可选 `cwd` + 预分配 `sessionId`），`await this.api.sessions.create(payload)`。成功立刻 `upsert` 本地 summary：`running: false`、`blank: true`（实体出生先于第一条消息），不等下一轮 `session.list`。`SessionRuntime.create` 在 promise resolve 之前再同步 `projectList()`，所以调用方（含 `connectWorkspace` / New Session draft）可以立刻 `binding(id)`。失败包成 `SessionCreateError`。host 侧分配 `session-<uuid>`、在 unpublished `setup` 里 `presets.mount` 的细节在 [`subsys.host.apiproxy`](../host/apiproxy.md)。[E: packages/client/runtime/src/client/sessions/manager.ts:544] [E: packages/client/runtime/src/client/sessions/manager.ts:547] [E: packages/client/runtime/src/client/sessions/service.ts:488] [E: packages/client/runtime/tests/manager.client.spec.ts:190]

10. **staging 打开 history 窗口。** `list.current` 变化时 `followCurrent` mint scope（`createScope` + `session.bindScope`），再 `session.open()` 拉尾页。`open` 幂等。eligibility = 在 host list 或当前被 address 的 subagent；离开 list 且不在 stage 上则 `dropScope`：dispose fiber、`unbindScope`、`slots.pruneStoreScope`、`manager.drop`。Host log 仍是耐久真相，下次 `get` + `open` 会重建。[E: packages/client/runtime/src/client/sessions/service.ts:606] [E: packages/client/runtime/src/client/sessions/service.ts:635] [E: packages/client/runtime/src/client/sessions/service.ts:639] [E: packages/client/runtime/src/client/sessions/service.ts:620] [E: packages/client/runtime/src/client/sessions/service.ts:764]

11. **`Session.prompt` 在第一个 await 前同步置 `promptAttempted`。** 清 `promptError` / `lastAgentError`，`promptAttempted = true`；若仍 `blankBit` 则 `firstPromptPendingTurn = true`，立刻 `markDirty()`。`derivePhase`：尚无权威内容时，`promptAttempted` 则 `'engaging'`，否则 `'blank'`。这保证 first-send 导航当帧就能从 hero 切到 composer，而不是等 RPC。随后普通会话 `api.sessions.prompt({ sessionId, mode, content, clientTimeZone })`（时区每次现场采样 `Intl`，不进 create/fork 状态）。`blankBit` 只在 **RPC 接受** 后翻 false，并经 `onEngaged` 发 list `kind: 'engaged'`（本地解除 summary.blank）。[E: packages/client/runtime/src/client/sessions/session.ts:255] [E: packages/client/runtime/src/client/sessions/manager.ts:318] `!result.ok` 早退，不碰 `blankBit`，同一会话仍可被 `connectWorkspace` 复用。[E: packages/client/runtime/src/client/sessions/session.ts:241] [E: packages/client/runtime/tests/workspaces-service.client.spec.ts:294] [E: packages/client/runtime/tests/workspaces-service.client.spec.ts:295] 测试钉死：调用当下 `composerPhase === 'engaging'`，settle 成功也不独自把 phase 推到 `active`——要等 `running` 或可见非 command 内容。[E: packages/client/runtime/src/client/sessions/session.ts:196] [E: packages/client/runtime/src/client/sessions/session.ts:202] [E: packages/client/runtime/src/client/sessions/session.ts:804] [E: packages/client/runtime/tests/session.client.spec.ts:529] [E: packages/client/runtime/tests/session.client.spec.ts:533]

12. **mux `session/event` 进 `acceptLiveEvent`。** `SessionManager.handleMuxEnvelope` 对 `user/message`（`source.kind === 'user'`）先推 list `updatedAt`；已实例化则 `session.handleMuxEnvelope`。`case 'session/event'` 调 `acceptLiveEvent`：loading / stitching 进 `liveBuffer`；cold/error 丢弃（open 会整窗回填）；seq 出现空洞则 buffer + `repairGap`；否则 `appendLive`（窗口保持一段连续 raw range，好让 Conversation Definition 对齐 compaction 引用）。未实例化的 session：**不**懒建对象；`session/event` 丢掉（history 回填），只缓冲 `approval/requested` / `question/requested` / `session/queue`。[E: packages/client/runtime/src/client/sessions/manager.ts:688] [E: packages/client/runtime/src/client/sessions/session.ts:470] [E: packages/client/runtime/src/client/sessions/session.ts:684] [E: packages/client/runtime/src/client/sessions/manager.ts:752] [E: packages/client/runtime/src/client/sessions/manager.ts:759] [E: packages/client/runtime/src/client/sessions/manager.ts:784]

13. **composer 提交链停在本层的 RPC 边界。** UI 侧 `InputBar` → `InputHub.sink` → `ConversationController.sendSession` → `session.prompt`（见 [`subsys.client.ui-conversation`](ui-conversation.md) 与 [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md)）。slash 命令走 `remote.commands.execute`，不经 `session.prompt`，本层 `Session.command` 只做 admission。host `session.prompt` 再 `followup` / `steer`；client 从不 `kick()` loop。

14. **`startSession` 是人点的 New Session，不是启动策略。** 显式 workspace → 当前 session 所属 workspace → `recentWorkspaceId`；一个都没有则 `sessions.clear()` 进空态，仍然不凭空 create。

## 设计动机

- **双面空 host。** 组合层要一份 `dsh.client` 元数据才能扫进 `__DSH_BOOT__`；对象层却只该活在浏览器。空 `apply` 让 Loader 把包当 client 行插入，而不在 node 进程里再提供一套 `ctx.sessions`。
- **对象层与 React 切开。** `Session` / list / slots store 是 uSES 数据源。web-react 只绑 hook；换渲染器不必重写窗口与 mux。
- **New Session 收口在 workspaces。** `ISessions` 故意没有 `create`：feature 插件走 `workspaces.startSession` / `connectWorkspace`，避免绕过 blank 复用与「无 Workspace 不 create」门。`SessionsPort.create` 只给兄弟域。
- **`promptAttempted` 与 `blank` 分轴。** 当帧 UI 需要 engaging；Host 空日志位必须等受理，否则失败的第一句会永远占住列表并丢掉 reuse。
- **窗口连续、Definition 可组合。** live 事件按 seq 拼接；registry 低频变动才 `rebuildConversationRegistry`。各 `ui-*` 注册自己的 kind，runtime 不内置 30 种节点。
- **model-visible ⟺ logged 停在 host log。** client snapshot 是投影，不是第二份可 splice 的 chat 数组。换 preset / 工具集以 host 事件为准。

## Gotcha

- host `apply` 为空不等于「没装 client-runtime」。web-app 仍 insert 该行；行为全在 `./client`。[E: packages/client/runtime/src/index.ts:4] [E: packages/bundle/web-app/cordis.patch.yml:168]
- `package.json` `dsh.client.inject` 是包名；browser `export const inject` 是服务名 `connection` / `typert` / `remote` / `remote.commands`。两套表不要对一行。[E: packages/client/runtime/package.json:34] [E: packages/client/runtime/src/client/index.ts:183]
- 浏览器 `ctx.sessions` ≠ host `SessionStore`。同名、不同包、不同进程。
- `ISessions` 没有 `create`。直接对 `ctx.sessions.create` 做类型检查会失败；运行时对象虽是 `SessionRuntime`，合同面不承诺该动词。[E: packages/client/runtime/src/client/contract/sessions.ts:26]
- `startInitialSelection` 见到已有 `current` 或没有 `recentWorkspaceId` 就结束。用户后来 `clear()` 不会被启动策略再次填上。[E: packages/client/runtime/src/client/workspaces/service.ts:139]
- 复用 blank 看成员规则，不看裸 cwd。归档 blank 也不复用。[E: packages/client/runtime/src/client/workspaces/service.ts:110]
- 第一句被拒：`composerPhase` 停在 `engaging`（phase 机不再回到 `'blank'`；该测试只读 phase，不读 `snapshot.blank`）。[E: packages/client/runtime/tests/session.client.spec.ts:554] `blankBit` 仍 true：`prompt` 在 `!result.ok` 早退，不执行 `blankBit = false`。[E: packages/client/runtime/src/client/sessions/session.ts:241] 同一会话继续给 `connectWorkspace` 复用，且不发 `session.create`。[E: packages/client/runtime/tests/workspaces-service.client.spec.ts:294] [E: packages/client/runtime/tests/workspaces-service.client.spec.ts:295]
- 未实例化 session 的 `session/event` 被丢（`default: return`）。只靠打开时 history 回填；sidebar 的 approval 点灯走 manager 自有的 pending map。[E: packages/client/runtime/src/client/sessions/manager.ts:752] [E: packages/client/runtime/src/client/sessions/manager.ts:784]
- `'root'` 是 `single`。再 `register` 会阴影 `AppFrame` 整棵子座（动态条目优先级更低反而赢）。加法面用 `shell.overlay`。[E: packages/client/runtime/src/client/slots.ts:41]
- `register` 必须是 prototype 方法。箭头实现会把 effect 装进 runtime 自己的 fiber，插件卸载卸不掉槽位。[E: packages/client/runtime/src/client/slots.ts:470]
- `renderSlot` 只渲染 `'root'`；子槽走组件 props 的 `renderSlot` face。renderer / locale 未 install、或 `'root'` 尚无登记，全部 fail-loud。
- `id: client-runtime` 只出现在 `dsh-web-app`。`dsh-headless` 在 root realm `agents.create`，没有浏览器对象层。
- `--host 0.0.0.0` 的拒绝发生在 `web-startup` `provide` 之前，与本包无关。
- web overlay 里 `disabled: true` 的共享 `hmr`（`@deepseek-ai/cordis-plugin-hmr`）不是 `client-hmr`，更不是本 runtime。
- 没有 Loader 行 `id: ui-slots`。`ctx.slots` 由本包 `SlotRegistry` 提供；ui-slots 是零运行时依赖的纯核库。

## Seam 三角

换一行的 Provider（删掉 `client-runtime`、或把 `create` 暴露进 `ISessions`）会带走对应 Consumer：壳找不到 `ctx.slots`，New Session 绕过 blank 复用，或 headless 误去找浏览器服务。Definition（服务名与 RPC 合同）保持不变。

| 缝 | Definition | Provider | Consumer | `dsh-base` | `dsh-web-app` | `dsh-headless` |
|---|---|---|---|---|---|---|
| 组合行 `client-runtime` | npm `@deepseek-ai/dsh-client-runtime` + `dsh.client` | web-app `insert` `id: client-runtime` | 浏览器 Loader / `__DSH_BOOT__` 图里的壳模块 | 无此行 | 有 | 无此行（insert 止于 `headless-runner`） |
| `ctx.slots` | `SlotMap` + `SlotCore.register`（ui-slots）；runtime 合并 `'root'` | **browser** `SlotRegistry`（`ctx.plugin`） | `ui-layout` 占 `'root'`；各 `ui-*` `register` | 无 | 有（本行提供） | 无 |
| `ctx.sessions`（client） | `ISessions` / `SessionFace` | **browser** `SessionRuntime.reflect.provide('sessions')` | `ui-conversation` / sidebar / `SessionProvider`；导航态在此 | 无 | 有 | 无。headless 用 host `SessionStore` |
| `SessionsPort.create` | `create({ workspaceId })` | 同一 `SessionRuntime`（接口外方法） | **仅** `WorkspaceRuntime.connectWorkspace` | 无 | 有 | 无 |
| `ctx.workspaces` | `IWorkspaces` | **browser** `WorkspaceRuntime` | New Session、workspace picker、`startInitialSelection`（apply 自调用） | 无 | 有 | 无 |
| `conversationEvents` / `conversationViews` | `ConversationNodeDefinition` / `ConversationViewDefinition` | apply 里 `new …Registry(ctx)` | `ui-conversation` 等注册 kind；`Session` assembler 消费 | 无 | 有 | 无 |
| `session.create` / `session.prompt` RPC | host `ApiProxy` 合同 | **host** `createApiProxy`（[`subsys.host.apiproxy`](../host/apiproxy.md)）；client 只当 Consumer | `SessionManager.create` / `Session.prompt` via `connection.api` | 无 `/api` | connection 绑 `/api` | 无 client；runner 直接 `agents.create` |
| host `ctx.sessions` | core `Session` / `SessionStore` | **host** `dsh-session` | agent-loop / persistence | 有 | 有（host 面留下） | 有 |

## Sources

- packages/client/runtime/src/index.ts
- packages/client/runtime/src/client/index.ts
- packages/client/runtime/src/client/slots.ts
- packages/client/runtime/src/client/sessions/service.ts
- packages/client/runtime/src/client/sessions/manager.ts
- packages/client/runtime/src/client/sessions/session.ts
- packages/client/runtime/src/client/workspaces/service.ts
- packages/client/runtime/src/client/workspaces/manager.ts
- packages/client/runtime/src/client/conversation/event-registry.ts
- packages/client/runtime/src/client/conversation/view-registry.ts
- packages/client/runtime/src/client/contract/sessions.ts
- packages/client/runtime/src/client/contract/sessions-port.ts
- packages/client/runtime/src/client/contract/workspaces.ts
- packages/client/runtime/src/client/contract/session.ts
- packages/client/runtime/src/client/sessions/conversation.ts
- packages/client/runtime/src/client/agents/scope.ts
- packages/client/runtime/package.json
- packages/client/runtime/tests/node-half.client.spec.ts
- packages/client/runtime/tests/client-apply.client.spec.ts
- packages/client/runtime/tests/session.client.spec.ts
- packages/client/runtime/tests/workspaces-service.client.spec.ts
- packages/client/runtime/tests/slots-service.client.spec.ts
- packages/client/runtime/tests/manager.client.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/client/ui-slots/src/index.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一句 `session.prompt`；本页是 client 对象层那一段。
- [`subsys.client.modules`](modules.md) — node 半边扫 `dsh.client` 编 `__DSH_BOOT__`；本包是图上的 `immediately` 行之一。
- [`subsys.client.connection`](connection.md) — `/api` 与 mux WS；本包 `inject: connection` 并 `connection.start`。
- [`subsys.client.ui-slots`](ui-slots.md) — `SlotCore` 纯核；本包 `SlotRegistry` 是它的 Provider。
- [`subsys.client.ui-conversation`](ui-conversation.md) — composer 提交链与 `conversation` 槽；导航态仍在本页 `ctx.sessions`。
- [`subsys.host.apiproxy`](../host/apiproxy.md) — `session.create` / `session.prompt` 的 host 实现与 preset `setup`。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web 模板与 host 插入 id 全表（含 `client-runtime`）。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 插入本行的 overlay；`--host 0.0.0.0` 拒在 `webStartup` 之前。
- [`subsys.composition.bundle-headless`](../composition/bundle-headless.md) — 对照：无本行、无 webserver、工具留 host。
- [`subsys.client.web`](web.md) — 壳 `AppWebEntry` 按图 create 本插件。
- [`subsys.client.ui-layout`](ui-layout.md) — 占 `'root'` 并声明 sidebar / conversation / details / `shell.overlay`。
