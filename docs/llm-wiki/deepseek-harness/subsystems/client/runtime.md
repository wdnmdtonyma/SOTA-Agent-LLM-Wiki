---
id: subsys.client.runtime
title: client 对象层（store · Session/Workspace 客户端 · ui-renderer · web boot）
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/store/package.json
  - packages/client/store/src/index.ts
  - packages/client/store/src/contract.ts
  - packages/client/ui-slots/src/index.ts
  - packages/client/ui-renderer/package.json
  - packages/client/ui-renderer/src/index.ts
  - packages/client/ui-renderer/src/client/index.ts
  - packages/client/ui-renderer/src/client/app.tsx
  - packages/client/ui-renderer/src/client/registry.ts
  - packages/client/web/src/boot.ts
  - packages/api/session-controller/package.json
  - packages/api/session-controller/src/client/index.ts
  - packages/api/session-controller/src/client/contract/sessions.ts
  - packages/api/session-controller/src/client/sessions/service.ts
  - packages/api/session-controller/src/client/sessions/manager.ts
  - packages/api/session-controller/src/client/sessions/session.ts
  - packages/api/session-controller/src/client/scope.ts
  - packages/api/session-controller/src/client/transport.ts
  - packages/api/session-controller/src/remote-events.ts
  - packages/api/workspace-controller/package.json
  - packages/api/workspace-controller/src/client/index.ts
  - packages/api/workspace-controller/src/client/service.ts
  - packages/client/ui-workspace/src/client/navigation.ts
  - packages/client/ui-conversation/src/client/conversation/assembly.ts
  - packages/client/ui-conversation/src/client/contract/snapshot.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/bundle/web-app/src/startup.ts
symbols:
  - defineStore
  - StoreInstance
  - SlotRegistry
  - UiRendererService
  - AppWebEntry
  - ClientSessions
  - ISessions
  - Session
  - WorkspaceController
  - IWorkspaces
  - ctx.slots
  - ctx.sessions
  - ctx.workspaces
  - ctx.uiRenderer
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
updated: c291e7961a
---

> 已删除的 `@deepseek-ai/dsh-client-runtime` 不再是浏览器对象层。当前切分：`@deepseek-ai/dsh-client-store` 是无 React 的 snapshot 引擎；`@deepseek-ai/dsh-client-ui-renderer` 的 **client** 半边提供 `ctx.slots` / `ctx.uiRenderer.mount`；Session / Agent scope / control stream 在 `packages/api/session-controller/src/client/`（`ctx.sessions`）；Workspace 对象层在 `packages/api/workspace-controller/src/client/`（`ctx.workspaces`）；壳启动是 `packages/client/web/src/boot.ts` 的 `AppWebEntry`。节点 id `subsys.client.runtime` 保持稳定别名。client 不执行模型 turn，也不实现 `ctx.fs` / agent-loop。

## 能回答的问题

- 旧包 `packages/client/runtime` 拆到哪些 live 路径？host 半边的 ui-renderer `apply` 为什么是空函数？
- `ctx.slots` / `ctx.sessions` / `ctx.workspaces` / `ctx.uiRenderer` 谁 `provide`？`SlotRegistry` 和 ui-slots `SlotCore` 怎么分？
- web-app 插入哪些 client 相关行？`dsh-headless` / `sdk` / `sdk-minimal` / `acp` 有没有浏览器对象层？
- `ISessions.create` 发哪条 Remote？`Session.prompt` 为何必须在第一个 await 之前置 `promptAttempted`？
- 初始 Workspace 选择与 blank 复用现在在哪个包（`ctx.uiWorkspace`）？
- 浏览器 `ctx.sessions` 和 host `SessionStore` 是不是同一个服务？

## 职责边界

DSH 是 **Cordis 组合运行时**（主线 `profile → bundle → agent preset`）。capability seam = Definition / Provider / Consumer。进入模型请求的内容必须能从 append-only session log 重建（`model-visible ⟺ logged`）。五个 shipped profile：`web`（`patchReload: live`）与 `headless` / `sdk` / `sdk-minimal` / `acp`（`startup`）。[E: packages/boot/app-boot/src/profile.ts:105] [E: packages/boot/app-boot/src/profile.ts:110] [E: packages/boot/app-boot/src/profile.ts:112] [E: packages/boot/app-boot/src/profile.ts:116] 默认 GUI 入口是 `dsh web` / `dsh --profile web`；stdio 面还有 `dsh --profile sdk|sdk-minimal|acp`。本仓没有 shipped TUI。launcher 在 `provide('webStartup')` **之前**拒绝 `--host 0.0.0.0`（[`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md)）。[E: packages/bundle/web-app/src/startup.ts:74]

本节点覆盖的 **浏览器对象层**：

- **拥有**：`defineStore` / `StoreInstance`（store 引擎）；`SlotRegistry`（`ctx.slots`）与 `UiRendererService`（`ctx.uiRenderer`）；`ClientSessions` / `SessionManager` / `Session` / `createScope`；`WorkspaceController`（client）；`AppWebEntry.mountApp`。
- **不拥有**：HTTP 信任篱笆（[`subsys.client.connection`](connection.md)）；slot 纯核（[`subsys.client.ui-slots`](ui-slots.md) 的 `SlotCore`）；composer / `InputHub` 与 `ConversationEventRegistry`（现住 [`subsys.client.ui-conversation`](ui-conversation.md)）；Host Session Remote 实现（[`subsys.host.apiproxy`](../host/apiproxy.md) 现为三个 `packages/api/*-controller`）；模型 turn（`ReactLoopAgent`）。

client **不**执行模型 turn：`Session.prompt` 只发 unary Remote。浏览器会话一律由 Host 创建。

不要把 `@deepseek-ai/dsh-client-test-runtime`（`packages/test-support/client-runtime`）当成已删除的 `dsh-client-runtime`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/store/src/index.ts` | zustand vanilla + immer；`defineStore`；组件看不见 engine store |
| `packages/client/store/src/contract.ts` | `StoreInstance`：snapshot + baked actions，无 React hook |
| `packages/client/ui-slots/src/index.ts` | `SlotMap` / `SlotCore` 纯核；从 `dsh-client-store` 进口 store 类型 |
| `packages/client/ui-renderer/src/index.ts` | **host** `apply`：空函数 |
| `packages/client/ui-renderer/src/client/index.ts` | **browser** `apply`：`SlotRegistry` + `provide('uiRenderer')` |
| `packages/client/ui-renderer/src/client/app.tsx` | 组装树 = `ctx.slots.renderSlot('root', {})` |
| `packages/client/ui-renderer/src/client/registry.ts` | `SlotRegistry`：`'slots/changed'`、fiber `register`、store 实例轴 |
| `packages/client/web/src/boot.ts` | `AppWebEntry`；loader 静止后 `inject(['uiRenderer'], … mount)` |
| `packages/api/session-controller/src/client/index.ts` | 安装 `ctx.sessions`、Remote Event、`createSessionControlStream` |
| `packages/api/session-controller/src/client/sessions/service.ts` | `ClientSessions`：list store、`create` / `open` / scope |
| `packages/api/session-controller/src/client/sessions/session.ts` | `Session.prompt` / `open` / snapshot |
| `packages/api/workspace-controller/src/client/index.ts` | follow stream + `WorkspaceController` |
| `packages/api/workspace-controller/src/client/service.ts` | `IWorkspaces`：create / rename / delete / archive / order |
| `packages/client/ui-workspace/src/client/navigation.ts` | `ctx.uiWorkspace.connectWorkspace` / `startSession` / 初始选择 |
| `packages/bundle/web-app/cordis.patch.yml` | 插入 `session-controller` / `workspace-controller` / `ui-renderer` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `StoreInstance` | snapshot 源 + baked `actions`。engine store 是框架/测试 API，组件不直接看见。[E: packages/client/store/src/contract.ts:70] [E: packages/client/store/src/index.ts:179] |
| `defineStore` | 声明 init / persist / actions，返回带 `create(scopeKey?)` 的 handle。[E: packages/client/store/src/index.ts:217] |
| `SlotRegistry` | Cordis `Service`，名 `'slots'`。[E: packages/client/ui-renderer/src/client/registry.ts:134] 内层 `SlotCore` 构造时播种 `'root'`（`kind: 'single'` / `scope: 'root'`，`declaredBy: '(built-in)'`）。[E: packages/client/ui-slots/src/index.ts:698] [E: packages/client/ui-slots/src/index.ts:698] [E: packages/client/ui-slots/src/index.ts:717] |
| `ISessions` / `ctx.sessions` | 外向面含 `list`、`create`、`open` / `clear` / `fork` / `search` / `binding` / `scope`。[E: packages/api/session-controller/src/client/contract/sessions.ts:21] [E: packages/api/session-controller/src/client/contract/sessions.ts:35] 相对旧 runtime，`create` **在**此接口上。 |
| `ClientSessions` | 实现 `ISessions`；选择持久化键 `dsh.sessions.current`；`reflect.provide('sessions', this)`。[E: packages/api/session-controller/src/client/sessions/service.ts:227] [E: packages/api/session-controller/src/client/sessions/service.ts:263] |
| `SessionListState` | `ids` / `byId` / `current` / `phase` / `subagentsByParent` / `jobsBySession` / `currentAddress`。[E: packages/api/session-controller/src/client/sessions/service.ts:69] |
| `SessionSummary.blank` | Host 空日志位镜像；store 保留全部行，供 `connectWorkspace` 复用。[E: packages/api/session-controller/src/client/sessions/service.ts:58] |
| `Session` | `promptAttempted` 粘性：写成 `true` 后不复位。[E: packages/api/session-controller/src/client/sessions/session.ts:91] [E: packages/api/session-controller/src/client/sessions/session.ts:219] |
| `ConversationPhase` | `'blank' \| 'engaging' \| 'active'`，由 **ui-conversation** `conversationPhase(session, conversation)` 派生，不在 Session snapshot 上。[E: packages/client/ui-conversation/src/client/contract/snapshot.ts:18] [E: packages/client/ui-conversation/src/client/contract/snapshot.ts:26] |
| `IWorkspaces` / `ctx.workspaces` | Workspace 行、顺序、归档与命令；**没有** `connectWorkspace` / `startSession`。[E: packages/api/workspace-controller/src/client/service.ts:33] |
| `UiWorkspace` | 导航策略：blank 复用 + `sessions.create`。[E: packages/client/ui-workspace/src/client/navigation.ts:40] |

host 面另有 `ctx.sessions`（core `SessionStore`，[`subsys.core.session`](../core/session.md)）：进程内 append-only log。浏览器 `ctx.sessions` 是 list + 对象层 + 导航态。两边不同 realm、不同类型。Host HTTP 面是 `ctx.sessionController` / `ctx.workspaceController`，不是已删除的 `ctx.apiProxy`。[E: packages/api/session-controller/src/index.ts:120] [E: packages/api/workspace-controller/src/index.ts:29]

## 控制流

1. **web overlay 才插入浏览器对象层。** `PROFILE_TEMPLATES.web` 叠 `dsh-base` 再叠 `dsh-web-app`。[E: packages/boot/app-boot/src/profile.ts:110] web-app 插入 host `id: session-controller` / `workspace-controller`，以及 client `id: ui-renderer`（`@deepseek-ai/dsh-client-ui-renderer`）。[E: packages/bundle/web-app/cordis.patch.yml:101] [E: packages/bundle/web-app/cordis.patch.yml:115] [E: packages/bundle/web-app/cordis.patch.yml:201] [E: packages/bundle/web-app/cordis.patch.yml:201] `dsh-headless` 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`，没有 ui-renderer。[E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/headless/cordis.patch.yml:27] `sdk` / `sdk-minimal` / `acp` 同样不是浏览器对象层。

2. **ui-renderer host 半边是空 `apply`。** 组合仍扫 `package.json` 的 `dsh.client`（`platform: web`、`immediately: true`）。[E: packages/client/ui-renderer/package.json:34] [E: packages/client/ui-renderer/package.json:35] host 进程不提供 slots。[E: packages/client/ui-renderer/src/index.ts:4]

3. **浏览器 ui-renderer `apply` 放下 slots + mount 面。** `export const inject: string[] = []`。[E: packages/client/ui-renderer/src/client/index.ts:51] `new SlotRegistry(ctx)`，`slots.install(createSlotRenderer())`，`provide('uiRenderer', { mount })`。[E: packages/client/ui-renderer/src/client/index.ts:88] [E: packages/client/ui-renderer/src/client/index.ts:91] 组装工厂 `buildRenderApp` 返回 `() => ctx.slots.renderSlot('root', {})`。[E: packages/client/ui-renderer/src/client/app.tsx:21]

4. **`AppWebEntry` 等 loader 静止后才 mount。** `run()` 建 Cordis `Context`、跑 Loader，然后 `ctx.inject(['uiRenderer'], (scope) => scope.effect(() => scope.uiRenderer.mount(container), …))`。[E: packages/client/web/src/boot.ts:46] [E: packages/client/web/src/mount.ts:20] [E: packages/client/web/src/mount.ts:21]

5. **Session 客户端 `apply` 等 Remote。** `inject = ['typert', 'remote', 'remote.commands', 'remote.session', 'remote.subagents']`（服务名，不是 npm 包名）。[E: packages/api/session-controller/src/client/index.ts:77] `new ClientSessions` 后订阅 `api-session/added|removed|status|activity|error`，再 `createSessionControlStream` 并 `start()`。[E: packages/api/session-controller/src/client/index.ts:88] [E: packages/api/session-controller/src/client/index.ts:91] [E: packages/api/session-controller/src/client/index.ts:103] [E: packages/api/session-controller/src/client/index.ts:107] Typert `'agent'` identity 接到 `sessions.scopeOf`。[E: packages/api/session-controller/src/client/index.ts:110] Remote Event 选择在 `remote-events.ts`。[E: packages/api/session-controller/src/remote-events.ts:2] control 流走 `remote.session.control`。[E: packages/api/session-controller/src/client/transport.ts:120]

6. **Workspace 客户端 `apply`。** `inject = ['remote', 'remote.workspace']`。[E: packages/api/workspace-controller/src/client/index.ts:38] `new WorkspaceController(ctx, model)` 服务名 `'workspaces'`，并启动 `follow` snapshot stream。[E: packages/api/workspace-controller/src/client/index.ts:46] [E: packages/api/workspace-controller/src/client/service.ts:88] [E: packages/api/workspace-controller/src/client/index.ts:81]

7. **`SlotRegistry.register` 必须在 prototype 上。** 经 `ctx.effect(..., 'slots.register()')`：cordis proxy 把 `this.ctx` 绑到**调用方** fiber。[E: packages/client/ui-renderer/src/client/registry.ts:612] 箭头属性会冻在 renderer 自己的 root ctx。`'root'` 再 `register` 会阴影整框（注释合同写在 SlotMap 合并处）。[E: packages/client/ui-renderer/src/client/registry.ts:28]

8. **初始选择与 New Session 在 `ui-workspace`，不在 WorkspaceController。** `watchNavigation`：两条 list `phase !== 'ready'` 则等；已有 `sessions.current` 或没有 recent workspace 则 `initial='done'`，**不** `create`；否则 `connectWorkspace(target)`，回来若 current 仍空才 `sessions.open`。[E: packages/client/ui-workspace/src/client/navigation.ts:206] [E: packages/client/ui-workspace/src/client/navigation.ts:211] [E: packages/client/ui-workspace/src/client/navigation.ts:216] `connectWorkspace`：未知 id 抛；复用条件是 `summary.blank`、`cwd === workspace.path`、成员 `sessionIds`、且不在 `archivedSessionIds`；否则 `sessions.create({ workspaceId })`，同 workspace 单飞。[E: packages/client/ui-workspace/src/client/navigation.ts:114] [E: packages/client/ui-workspace/src/client/navigation.ts:123] [E: packages/client/ui-workspace/src/client/navigation.ts:128] `startSession`：显式 workspace → 当前 session 所属 → recent；一个都没有则 `sessions.clear()`，仍不凭空 create。[E: packages/client/ui-workspace/src/client/navigation.ts:164] [E: packages/client/ui-workspace/src/client/navigation.ts:166]

9. **`ClientSessions.create` → `SessionManager.create` 发 `remote.session.create`。** payload：`workspaceId` 优先，否则可选 `cwd` + 预分配 `sessionId`。[E: packages/api/session-controller/src/client/sessions/manager.ts:557] [E: packages/api/session-controller/src/client/sessions/manager.ts:560] 成功立刻 upsert：`running: false`、`blank: true`。[E: packages/api/session-controller/src/client/sessions/manager.ts:563] `ClientSessions.create` 在 resolve 前同步 `projectList()`。[E: packages/api/session-controller/src/client/sessions/service.ts:409] 失败包成 `SessionCreateError`。[E: packages/api/session-controller/src/client/sessions/service.ts:408]

10. **staging 打开 history 窗口。** `list.current` 变化时 `followCurrent` 调 `resolve`（`createScope` + `bindScope`），再 `session.open()`（幂等）。[E: packages/api/session-controller/src/client/sessions/service.ts:520] [E: packages/api/session-controller/src/client/sessions/service.ts:529] [E: packages/api/session-controller/src/client/sessions/service.ts:534] [E: packages/api/session-controller/src/client/sessions/session.ts:340] eligibility = 当前 staged 或在 host `ids`。[E: packages/api/session-controller/src/client/sessions/service.ts:571]

11. **`Session.prompt` 在第一个 await 前同步置 `promptAttempted`。** 清 `promptError` / `lastAgentError`；若仍 `blankBit` 则 `firstPromptPendingTurn = true`，立刻 `markDirty()`。[E: packages/api/session-controller/src/client/sessions/session.ts:219] [E: packages/api/session-controller/src/client/sessions/session.ts:219] 普通会话 `remote.session.prompt({ requestId, sessionId, mode, content, clientTimeZone })`（时区现场采样）。[E: packages/api/session-controller/src/client/sessions/session.ts:221] `!result.ok` 早退，不碰 `blankBit`。[E: packages/api/session-controller/src/client/sessions/session.ts:243] 接受后才 `blankBit = false` 并 `onEngaged`。[E: packages/api/session-controller/src/client/sessions/session.ts:256] `conversationPhase`：尚无权威内容时 `promptAttempted` → `'engaging'`，否则 `'blank'`。[E: packages/client/ui-conversation/src/client/contract/snapshot.ts:33]

12. **live 事件走 control + journal stream，不再走旧 mux `session/event`。** `createSessionControlStream` 把 Host-wide control 帧交给 `sessions.handleControlFrame`。[E: packages/api/session-controller/src/client/index.ts:104] 打开的 `Session` 用 journal `follow` 填窗口（`SessionEventStream`）。未打开的 session 不懒建对象；list 行靠 Remote Event 更新。

13. **composer 提交链停在本层的 Remote 边界。** UI `InputBar` → `InputHub` → `session.prompt`（[`subsys.client.ui-conversation`](ui-conversation.md)）。slash 走 `remote.commands.execute`；`Session.command` 只做 admission。[E: packages/api/session-controller/src/client/sessions/session.ts:334] client 从不 `kick()` loop。

14. **Conversation registry 不在本切分层。** `UiConversation` 构造 `ConversationEventRegistry` / `ConversationViewRegistry`。[E: packages/client/ui-conversation/src/client/conversation/assembly.ts:157] [E: packages/client/ui-conversation/src/client/conversation/assembly.ts:157]

## 设计动机

- **对象层按进程切开。** store 与 Session/Workspace 客户端无 React；ui-renderer 才绑 hook 与 `createRoot`。换渲染器不必重写窗口与 Remote。
- **双面空 host（ui-renderer）。** Loader 要 `dsh.client` 元数据编进 `__DSH_BOOT__`；slots 只该活在浏览器。
- **导航策略不进 Workspace Remote。** `IWorkspaces` 只镜像 Host workspace 命令；blank 复用与「无 Workspace 不 create」在 `ctx.uiWorkspace`。
- **`promptAttempted` 与 `blank` 分轴。** 当帧 UI 需要 engaging；Host 空日志位必须等受理。
- **model-visible ⟺ logged 停在 host log。** client snapshot 是投影。

## Gotcha

- 没有 `packages/client/runtime`。wiki id 仍叫 `subsys.client.runtime`。
- ui-renderer host `apply` 为空不等于「没装」。web-app 仍 insert `ui-renderer`。[E: packages/client/ui-renderer/src/index.ts:4] [E: packages/bundle/web-app/cordis.patch.yml:201]
- session-controller 的 `dsh.client.inject` 是包名；browser `export const inject` 是服务名。两套表不要对一行。[E: packages/api/session-controller/package.json:56] [E: packages/api/session-controller/src/client/index.ts:77]
- 浏览器 `ctx.sessions` ≠ host `SessionStore`。同名、不同包、不同进程。
- `ISessions` **现在有** `create`。feature 仍应走 `uiWorkspace.connectWorkspace` 才能复用 blank。[E: packages/api/session-controller/src/client/contract/sessions.ts:35]
- 初始选择见到已有 `current` 或没有 recent workspace 就结束；用户后来 `clear()` 不会被启动策略再次填上。[E: packages/client/ui-workspace/src/client/navigation.ts:206]
- 第一句被拒：`conversationPhase` 停在 `engaging`；`blankBit` 仍 true。[E: packages/api/session-controller/src/client/sessions/session.ts:243] [E: packages/client/ui-conversation/src/client/contract/snapshot.ts:33]
- `'root'` 是 `single`。加法面用 `shell.overlay`。[E: packages/client/ui-renderer/src/client/registry.ts:28]
- `register` 必须是 prototype 方法。[E: packages/client/ui-renderer/src/client/registry.ts:612]
- `--host 0.0.0.0` 的拒绝发生在 `web-startup`，与本层无关。[E: packages/bundle/web-app/src/startup.ts:74]
- 没有 Loader 行 `id: ui-slots`。`ctx.slots` 由 ui-renderer `SlotRegistry` 提供。

## Seam 三角

换一行的 Provider（删掉 `ui-renderer`、或把 blank 复用从 `uiWorkspace` 挪走）会带走对应 Consumer。Definition（服务名与 Remote 合同）保持不变。

| 缝 | Definition | Provider | Consumer | `dsh-base` | `dsh-web-app` | `dsh-headless` |
|---|---|---|---|---|---|---|
| 组合行 `ui-renderer` | npm `@deepseek-ai/dsh-client-ui-renderer` + `dsh.client` | web-app `insert` `id: ui-renderer` | `AppWebEntry` `inject(['uiRenderer'])` | 无此行 | 有 | 无 |
| `ctx.slots` | `SlotMap` + `SlotCore.register`（ui-slots） | **browser** `SlotRegistry` | `ui-layout` 占 `'root'`；各 `ui-*` `register` | 无 | 有 | 无 |
| `ctx.uiRenderer` | `UiRendererService.mount` | **browser** ui-renderer `apply` | `AppWebEntry.mountApp` | 无 | 有 | 无 |
| `ctx.sessions`（client） | `ISessions` / `SessionFace` | **browser** `ClientSessions.reflect.provide('sessions')` | conversation / sidebar；导航态在此 | 无 | 有（client 半边） | 无。headless 用 host `SessionStore` |
| `ctx.workspaces` | `IWorkspaces` | **browser** `WorkspaceController` | `uiWorkspace`、workspace picker | 无 | 有 | 无 |
| `ctx.uiWorkspace` | `connectWorkspace` / `startSession` | ui-workspace 插件 | New Session、初始选择 | 无 | 有 | 无 |
| `session.create` / `session.prompt` Remote | Host session-controller 合同 | **host** `ctx.sessionController` | `SessionManager.create` / `Session.prompt` | 无浏览器 | web 有 gateway | 无 client；runner 直接 `agents.create` |
| host `ctx.sessions` | core `Session` / `SessionStore` | **host** `dsh-session` | agent-loop / persistence | 有 | 有 | 有 |

## Sources

- packages/client/store/package.json
- packages/client/store/src/index.ts
- packages/client/store/src/contract.ts
- packages/client/ui-slots/src/index.ts
- packages/client/ui-renderer/package.json
- packages/client/ui-renderer/src/index.ts
- packages/client/ui-renderer/src/client/index.ts
- packages/client/ui-renderer/src/client/app.tsx
- packages/client/ui-renderer/src/client/registry.ts
- packages/client/web/src/boot.ts
- packages/api/session-controller/package.json
- packages/api/session-controller/src/client/index.ts
- packages/api/session-controller/src/client/contract/sessions.ts
- packages/api/session-controller/src/client/sessions/service.ts
- packages/api/session-controller/src/client/sessions/manager.ts
- packages/api/session-controller/src/client/sessions/session.ts
- packages/api/session-controller/src/client/scope.ts
- packages/api/session-controller/src/client/transport.ts
- packages/api/session-controller/src/remote-events.ts
- packages/api/workspace-controller/package.json
- packages/api/workspace-controller/src/client/index.ts
- packages/api/workspace-controller/src/client/service.ts
- packages/client/ui-workspace/src/client/navigation.ts
- packages/client/ui-conversation/src/client/conversation/assembly.ts
- packages/client/ui-conversation/src/client/contract/snapshot.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/bundle/web-app/src/startup.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一句 `session.prompt`；本页是 client 对象层那一段。
- [`subsys.client.modules`](modules.md) — node 半边扫 `dsh.client` 编 `__DSH_BOOT__`。
- [`subsys.client.connection`](connection.md) — gateway / mux；Session 客户端 `inject: remote.*`。
- [`subsys.client.ui-slots`](ui-slots.md) — `SlotCore` 纯核；ui-renderer `SlotRegistry` 是 Provider。
- [`subsys.client.ui-conversation`](ui-conversation.md) — composer、`conversationPhase`、event/view registry。
- [`subsys.host.apiproxy`](../host/apiproxy.md) — Host HTTP API（三个 controller）；`session.create` / `session.prompt` 的 host 实现。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web 模板与插入 id。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 插入本层的 overlay；`--host 0.0.0.0` / `--no-open`。
- [`subsys.composition.bundle-headless`](../composition/bundle-headless.md) — 对照：无浏览器对象层。
- [`subsys.client.web`](web.md) — 壳 `AppWebEntry`。
- [`subsys.client.ui-layout`](ui-layout.md) — 占 `'root'` 并声明 sidebar / conversation / details / `shell.overlay`。
