---
id: subsys.client.ui-conversation
title: ui-conversation
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/ui-conversation/src/index.ts
  - packages/client/ui-conversation/src/submission-settings.ts
  - packages/client/ui-conversation/src/client/index.ts
  - packages/client/ui-conversation/src/client/apply.ts
  - packages/client/ui-conversation/src/client/service.ts
  - packages/client/ui-conversation/src/client/input/hub.ts
  - packages/client/ui-conversation/src/client/input/facade.ts
  - packages/client/ui-conversation/src/client/input/machine.ts
  - packages/client/ui-conversation/src/client/input/submission-policy.ts
  - packages/client/ui-conversation/src/client/skeleton/InputBar.tsx
  - packages/client/ui-conversation/src/client/skeleton/ConversationRoot.tsx
  - packages/client/ui-conversation/src/client/skeleton/DetailsPanel.tsx
  - packages/client/ui-conversation/src/client/skeleton/PermissionSelect.tsx
  - packages/client/ui-conversation/src/client/stores.ts
  - packages/client/ui-conversation/src/client/conversation-nodes/register.ts
  - packages/client/ui-conversation/src/client/conversation-nodes/message.ts
  - packages/client/ui-conversation/src/client/conversation-nodes/chat-snapshot-builder.ts
  - packages/client/ui-conversation/src/client/chat/register-node-renderers.ts
  - packages/client/ui-conversation/package.json
  - packages/client/ui-conversation/tests/host.client.spec.ts
  - packages/client/ui-conversation/tests/apply-inject.client.spec.tsx
  - packages/client/ui-conversation/tests/chat-apply.client.spec.tsx
  - packages/client/ui-conversation/tests/submission-policy.client.spec.ts
  - packages/client/ui-conversation/tests/input-machine.client.spec.ts
  - packages/client/ui-conversation/tests/service-orchestration.client.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/client/ui-layout/src/client/index.ts
  - packages/client/runtime/src/client/sessions/session.ts
  - packages/client/runtime/src/client/conversation/event-registry.ts
  - packages/client/ui-commands/src/client/service.ts
  - packages/host/apiproxy/src/api-proxy.ts
symbols:
  - ConversationController
  - InputHub
  - ConversationRoot
  - sendSession
  - apply
  - inject
  - IConversation
  - CONVERSATION_SETTINGS_NAMESPACE
  - ComposerSubmissionPolicy
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.client.runtime
  - subsys.client.ui-slots
  - subsys.client.ui-layout
  - subsys.client.connection
  - surface.web.workbench
  - surface.profiles.web
  - subsys.composition.bundle-web-app
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-client-ui-conversation` 是 Web 工作台的 **会话装配点**：node 半边只在存在 `settings` 时登记 `CONVERSATION_SETTINGS_NAMESPACE`；浏览器半边占住 `conversation` / `details` 槽，把未被 `/` command claim 的草稿经 `InputHub.sink` → `ConversationController.sendSession` → `Session.prompt` 送进 `/api`。client 不执行模型 turn；导航态在 runtime `sessions` / `workspaces`。

## 能回答的问题

- `id: ui-conversation` 出现在哪一层 bundle？`dsh-base` / `dsh-headless` 有没有这条行？
- host `apply` 和 client `apply` 各登记什么？client `inject` 的十个服务名是哪些？
- 谁占 `conversation` 与 `details`？内部 composer / session body / tool-details 子座怎样声明，而不是每个 skeleton 组件自成子系统？
- 主按钮 `inputActions.submit()` 与 Enter 的 `resolveSubmitMode` 分别产出哪个 `InputSubmitMode`？第一次空闲提问为什么是 `queue`？
- 以 `/` 开头的草稿怎样被 `InputMachine` 裁成 slash 命令、为何不调用 `session.prompt`？
- `ctx.conversation` 与 runtime `ctx.sessions` 各守哪一面？换 Workspace 的草稿搬运走哪条 inject？

## 职责边界

本包装的是 **会话面装配与提交编排**，不是第二个 agent-loop，也不是 HTTP 传输。DSH 是 Cordis 组合运行时：`profile → bundle → preset`。Web 是默认安装路径；本仓没有 shipped TUI。Launcher 在 `provide('webStartup')` 之前拒绝 `--host 0.0.0.0`，所以默认 composition 不会把 `/api`（含 `session.prompt`）绑到 all-interfaces。

**拥有**

- node 半边：有 `settings` 时登记 durable 段 `ui-conversation`（`busyEnter`）。
- 浏览器半边：`ConversationController`（`ctx.conversation`）、`InputHub` / `SessionInputShell` / `InputMachine`、`ComposerSubmissionPolicy`、`ConversationRoot` 占中栏、`DetailsPanel` 占右栏。
- 一次 `register` 声明的内部子座（composer chain、session body、view ring、keyed chat node、tool-details 洞）。
- Chat 业务 Definition 登记到 runtime `conversationEvents` / `conversationViews`，以及本包自带的 keyed 渲染器（user / assistant / command 等）。

**不拥有**

- `ctx.slots` 的 Provider：runtime `SlotRegistry`。ui-slots 是纯核库，**不是** web-app Loader 行，yml 里没有 `id: ui-slots`。
- HTTP `/api`、WS mux、信任篱笆：[`subsys.client.connection`](connection.md)。`session.create` / `session.prompt` **不在** `PRIVILEGED_METHODS`。
- 会话列表、`current`、`sessions.create` / `open` / `fork`、`promptAttempted` 当帧语义：[`subsys.client.runtime`](runtime.md)。
- 三栏骨架与 `sidebar` / `shell.overlay`：[`subsys.client.ui-layout`](ui-layout.md)。
- slash 目录与 `remote.commands.execute` 实现：`ui-commands`（本页只点名，不写 commands 子系统）。
- 模型 turn / inbox `followup|steer`：host `api-gateway` + `ReactLoopAgent`。client 只发 RPC。

`package.json` 的 `dsh.client` 把本包标成 `platform: "web"`，并把模块图依赖写成 connection / locale / runtime / settings / remotes / layout——**没有** ui-slots 包名，因为槽核经 runtime 提供。 [E: packages/client/ui-conversation/package.json:42] [E: packages/client/ui-conversation/package.json:34]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/ui-conversation/src/index.ts` | node 半边 `apply`：有 `settings` 才 `register` |
| `packages/client/ui-conversation/src/submission-settings.ts` | `CONVERSATION_SETTINGS_NAMESPACE = 'ui-conversation'`、`busyEnter` schema |
| `packages/client/ui-conversation/src/client/apply.ts` | 浏览器 `inject` + 槽装配 + `ctx.plugin(ConversationController)` |
| `packages/client/ui-conversation/src/client/service.ts` | `ConversationController`：`send` / `sendSession` / `cancel` / `updateQueue` |
| `packages/client/ui-conversation/src/client/input/hub.ts` | `InputHub`：每会话 `SessionInputShell`、`sink` → `sendSession` |
| `packages/client/ui-conversation/src/client/input/facade.ts` | `SessionInputShell`：`inputActions.submit` 固定 `'queue'`；adjudicate / claim.submit |
| `packages/client/ui-conversation/src/client/input/machine.ts` | 纯机：`/` 走 `adjudicate`，否则 `default-sink` |
| `packages/client/ui-conversation/src/client/input/submission-policy.ts` | 空闲一律 `queue`；busy + 可 steer 才读 `busyEnter` |
| `packages/client/ui-conversation/src/client/skeleton/InputBar.tsx` | 主按钮 `inputActions.submit()`；Enter `resolveSubmitMode` |
| `packages/client/ui-conversation/src/client/skeleton/ConversationRoot.tsx` | 驻留中栏：Hero / composer chain / session body |
| `packages/bundle/web-app/cordis.patch.yml` | 唯一 shipped insert：`id: ui-conversation` |
| `packages/client/ui-layout/src/client/index.ts` | 声明 `'conversation'` / `'details'` 座位（本包去占） |
| `packages/client/runtime/src/client/sessions/session.ts` | `Session.prompt` / `Session.command` |
| `packages/client/ui-conversation/tests/apply-inject.client.spec.tsx` | provide-channel 提交：trim、乐观清空、失败还原 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `CONVERSATION_SETTINGS_NAMESPACE` | 字面量 `'ui-conversation'`。字段 `busyEnter`: `'queue' \| 'steer'`，默认 `'queue'`。 [E: packages/client/ui-conversation/src/submission-settings.ts:6] [E: packages/client/ui-conversation/src/submission-settings.ts:18] |
| `IConversation` | `ctx.conversation` 对外合同：`input`、`blocks`、`send`、`updateQueue`、`cancel`、`loadOlder`。必须经 `ctx.sessions.scope(id)` 寻址；根 context 调用 fail-loud。 |
| `ConversationController` | 实现 `IConversation`；额外提供 composer 用的 `sendSession` / 草稿图 registry / 历史图 URL。服务名 `'conversation'`。 [E: packages/client/ui-conversation/src/client/service.ts:110] |
| `InputSubmitMode` | 与 `BusyEnterBehavior` 同形：`'queue' \| 'steer'`。host 才把 `queue` 映射成 `followup`、`steer` 映射成 `steer`。 |
| `ComposerSubmitGesture` | `'enter' \| 'accelerated'`（Cmd/Ctrl-Enter）。 |
| `InputHub` | `SessionInputResolver`：一会话一个 `SessionInputShell`，生命周期绑在 session scope fiber。 |
| `createChatStore` | 每会话 `{ selection, draft, view, inspect }`；`conversation.session` / header / `conversation.view` / `details` **共享同一 handle**。persist 键 `dsh.conversation.chat`。 |

## 控制流

1. **只有 web-app 把本包插进 Loader 表。** `PROFILE_TEMPLATES.web` 叠 `dsh-base` 再叠 `dsh-web-app`。web patch 第一段 insert 含 `id: ui-conversation` / `name: '@deepseek-ai/dsh-client-ui-conversation'`，无额外 `config`。`dsh-base` 的 insert 从 `timer` / `hmr` / `llm` 起，没有浏览器 roster。`dsh-headless` 的 insert 是 `code-runtime` + `headless-startup` + `headless-runner`，同样没有本行。本仓没有 shipped TUI 包。 [E: packages/bundle/web-app/cordis.patch.yml:198] [E: packages/bundle/web-app/cordis.patch.yml:199] [E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/headless/cordis.patch.yml:31]

2. **node 半边 `apply` 只碰 settings。** host 入口 `apply@packages/client/ui-conversation/src/index.ts` 用 `ctx.inject(['settings'], …)`：没有 `settings` 服务则整段不跑；有则 `settings.register(settingsNamespace('ui-conversation'), ConversationSettingsSchema)`。测试钉死默认 `{ busyEnter: 'queue' }`，非法值拒绝，fiber dispose 后段消失。 [E: packages/client/ui-conversation/src/index.ts:17] [E: packages/client/ui-conversation/src/index.ts:18] [E: packages/client/ui-conversation/tests/host.client.spec.ts:23]

3. **浏览器半边 `inject` 是十条服务名，不是 yml 行。** `export const inject@packages/client/ui-conversation/src/client/apply.ts` = `slots` / `layout` / `sessions` / `workspaces` / `locale` / `connection` / `remote` / `settingsScope` / `conversationEvents` / `conversationViews`。`slots` / `sessions` / `workspaces` / 两个 conversation registry 来自 [`subsys.client.runtime`](runtime.md)；`layout` 来自 [`subsys.client.ui-layout`](ui-layout.md)。缺任一条，本插件 fiber 保持 pending。 [E: packages/client/ui-conversation/src/client/apply.ts:52] [E: packages/client/ui-conversation/src/client/apply.ts:53]

4. **`apply@client/apply.ts` 先登记 Definition，再占座位。** `registerConversationNodes` 调用各 `register*ConversationNode`：例如 `registerMessageConversationNode` 把 user / steering / context 写入 `ctx.conversationEvents`，`registerChatConversationView` 把 Chat target `'chat'` 写入 `ctx.conversationViews`。`registerChatNodeRenderers` 再往 keyed 座 `conversation.chat.node` 挂本包默认视图。随后登记 locale、建 `createChatStore()`、用 `settingsScope.bind({ namespace: CONVERSATION_SETTINGS_NAMESPACE })` 构造 `ComposerSubmissionPolicy`，并往 `settings.general.item` 挂 `id: 'composer-enter'`。 [E: packages/client/ui-conversation/src/client/conversation-nodes/message.ts:83] [E: packages/client/ui-conversation/src/client/conversation-nodes/chat-snapshot-builder.ts:459] [E: packages/client/ui-conversation/src/client/apply.ts:137]

5. **ui-layout 先声明座位，本包去占。** `AppFrame` 占 `'root'` 时声明 `'conversation': { kind: 'single', scope: 'session-maybe' }` 与 `'details': { kind: 'single', scope: 'session' }`。本包 `slots.register({ name: 'conversation', children: {…} }, ConversationRoot)` 占中栏，并在内部声明 composer / session body / input 区域。`slots.register({ name: 'details', children: { 'conversation.details.tool': { kind: 'single', scope: 'session' } } }, DetailsPanel)` 占右栏。在 `'conversation'` 上再 `register` 会阴影整棵中栏子树（加法面是内部 list / `shell.overlay`）。 [E: packages/client/ui-layout/src/client/index.ts:124] [E: packages/client/ui-layout/src/client/index.ts:125] [E: packages/client/ui-conversation/src/client/apply.ts:197] [E: packages/client/ui-conversation/src/client/apply.ts:445]

   | 槽 | kind / scope | 本包occupant | 装配意图 |
   |---|---|---|---|
   | `conversation` | single / session-maybe（layout 声明） | `ConversationRoot` | 驻留 Hero + composer；无 current 也不卸栏 |
   | `conversation.session` | single / session | `ConversationSession` | 声明 `conversation.view` ring |
   | `conversation.session.header` | single / session | `ConversationSessionHeader` | 标题 / tab；加法座 `*.actions` / `*.utilities` |
   | `conversation.composer` | chain / session | `ApprovalPanel`（`select` + `priority: 1`） | fallback 是 Root 里的 bar 栈 |
   | `conversation.composer.bar` | single / session-maybe | `InputBar` | 声明 `conversation.input.plan` / `.model` |
   | `conversation.view` `id: chat` | list / session | `ChatView` | 声明 keyed `conversation.chat.node` |
   | `conversation.composer.dock` `id: stats` | list / session | `StatsLine` | 统计条，不进 ChatView |
   | `conversation.input.dock` | list / session | todo / queue 以 `ctx.plugin` 再挂 | 计划条、只读 Queue |
   | `details` | single / session（layout 声明） | `DetailsPanel` | 声明 `conversation.details.tool`；实现留给 `ui-tool` |
   | `settings.general.item` `id: composer-enter` | list / root | `EnterBehaviorRow` | 写 `busyEnter` |

   装配验收：`conversation` inject 存在；session / header / view / details **共用** chat store；`conversation.view` 的 id 环默认只有 `'chat'`。 [E: packages/client/ui-conversation/tests/chat-apply.client.spec.tsx:63] [E: packages/client/ui-conversation/tests/chat-apply.client.spec.tsx:88]

6. **`InputHub` 经 `sessions.provide` 物化，然后才 `plugin` 服务。** `new InputHub(ctx, t)` 与 `ComposerBlockRegistry` 在 apply 内构造。`sessions.provide({ hooks: ['input'], props: ['inputActions'], resolve })` 在 scope 物化时 `inputHub.shellFor(binding)`——这是创建触发器。随后 `ctx.plugin(ConversationController, { input: inputHub, blocks: composerBlocks })` 把同一实例暴露成 `ctx.conversation.input` / `.blocks`。Context merge 只导出 `IConversation`，具体类留在包内。 [E: packages/client/ui-conversation/src/client/apply.ts:182] [E: packages/client/ui-conversation/src/client/apply.ts:435] [E: packages/client/ui-conversation/src/client/index.ts:43]

7. **主按钮固定 `queue`；Enter 才问政策。** `InputBar` 主按钮在非 Stop 时调用 `inputActions.submit()`。`SessionInputShell.actions.submit` 写死 `this.submit('queue')`。Enter（非 Shift、非 IME、菜单 arbitration 为 `pass`）走 `keyboard.submit(resolveSubmitMode(running, accelerated ? 'accelerated' : 'enter', subagent === null))`。`ComposerSubmissionPolicy.resolve`：未 running 或 `steeringAvailable === false`（含 continuable subagent）一律 `'queue'`；空闲第一次提问因此是 `queue`，与 settings 里把 busy-Enter 改成 `steer` 无关。 [E: packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:554] [E: packages/client/ui-conversation/src/client/input/facade.ts:80] [E: packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:335] [E: packages/client/ui-conversation/src/client/input/submission-policy.ts:53]

8. **`SessionInputShell.submit` 进纯机，再分 slash / 普通稿。** 纯空白（无图）`enter` 被机丢掉。仅有图、draft trim 为空时，facade 在 `plain` 直接 `defaultSink('', imageIds, mode)`，不经 `enter`。否则 `dispatch({ type: 'enter', mode })`：`claimed` → `begin-submit`（`claim.submit`）；trim 以 `/` 开头 → `adjudicating` + `adjudicate`；其余 → `default-sink`。无 `inputTriggers` 时 `adjudicate` 立刻 `outcome: undefined`，miss 会落到 `default-sink`，把整行当普通消息。 [E: packages/client/ui-conversation/src/client/input/facade.ts:203] [E: packages/client/ui-conversation/src/client/input/machine.ts:471] [E: packages/client/ui-conversation/src/client/input/machine.ts:476] [E: packages/client/ui-conversation/tests/input-machine.client.spec.ts:76]

9. **slash 走 `ui-commands` / `remote.commands.execute`，不开模型 turn。** `beginSubmit` 调 `claim.submit(args, actx)`。`ui-commands` 的 leading claim 把 token `/${name} ` 接到 `this.execute` → `this.ctx.remote.commands.execute(sessionId, line)`。`Session.command` 是同一条 Remote，给 `PermissionSelect` 的 `/permission <id>` 用，同样不调 `session.prompt`。host 把命令生命周期记成 `command/run` / `command/done`，client 只等 admission。 [E: packages/client/ui-conversation/src/client/input/facade.ts:475] [E: packages/client/ui-commands/src/client/service.ts:374] [E: packages/client/runtime/src/client/sessions/session.ts:359] [E: packages/client/ui-conversation/src/client/skeleton/PermissionSelect.tsx:100]

10. **未被 claim 的草稿：`InputHub.sink` → `sendSession`。** `sink` 空文本且无图直接 return。否则 `commitSend`（清草稿且切断 undo，避免 Ctrl/Z 复活已发送内容），再 `conversation.sendSession(session, text, imageIds, mode)`。失败且 shell 仍是同一实例：还原图片；仅当当前 draft 仍是 `''` 才 `setDraft(text)`——飞行中新键入不会被覆盖。 [E: packages/client/ui-conversation/src/client/input/hub.ts:155] [E: packages/client/ui-conversation/src/client/input/hub.ts:158] [E: packages/client/ui-conversation/src/client/input/hub.ts:159] [E: packages/client/ui-conversation/src/client/input/hub.ts:162]

11. **`sendSession` 把图编成 base64 `PromptContentPart`，再 `session.prompt`。** 缺草稿图 id 抛错。`content` = 图像 parts +（非空文本才追加 text part）。`IConversation.send(text)` 是跨插件捷径：固定 `[{ type: 'text', text }]` + `'queue'`。二者都不跑 loop。 [E: packages/client/ui-conversation/src/client/service.ts:154] [E: packages/client/ui-conversation/src/client/service.ts:131] [E: packages/client/ui-conversation/tests/apply-inject.client.spec.tsx:167] [E: packages/client/ui-conversation/tests/service-orchestration.client.spec.ts:47]

12. **`Session.prompt` 在第一个 await 前同步置 `promptAttempted`，然后 POST `/api/session.prompt`。** 普通会话（无 subagent `address`）走 `api.sessions.prompt({ sessionId, mode, content, clientTimeZone })`。blank → engaging 必须出现在当帧；这是 runtime 的对象层，不是本包伪造的「本地已发送」。连接面把 unary 打到 `/api/<method>`；`session.prompt` 不在特权集合，信任篱笆只防 DNS-rebinding，不是认证。 [E: packages/client/runtime/src/client/sessions/session.ts:196] [E: packages/client/runtime/src/client/sessions/session.ts:202]

13. **host 把 `queue` 写成 `followup`，`steer` 写成 `steer`。** `createApiProxy` 的 `sessions.prompt` 在选到 adapter 之后 `createUserMessage`，然后 `mode === 'steer' ? agent.steer(message) : agent.followup(message)`。第一次空闲提问是 `queue` → `followup` → `ReactLoopAgent` 开 turn。事件经 `events.mux` 的 `session/event` 回到 `Session.acceptLiveEvent`；GUI 历史来自 log 投影 + `conversationEvents` Definition，不是 composer 本地数组。 [E: packages/host/apiproxy/src/api-proxy.ts:2498] [E: packages/host/apiproxy/src/api-proxy.ts:2499]

14. **换 Workspace 走 runtime，本包只搬运草稿。** `ConversationRoot` inject 的 `selectWorkspace` 调 `workspaces.connectWorkspace(workspaceId)`；若得到另一 `sessionId`，把当前 shell 的 draft / imageIds 搬到目标 shell，再 `sessions.open(nextId)`。`ctx.conversation` 没有 `open` / `create`。Stop 调 `scopedConversation(…).cancel()`；失败吞掉，展示走 `snapshot.promptError`。 [E: packages/client/ui-conversation/src/client/apply.ts:215] [E: packages/client/ui-conversation/src/client/apply.ts:231] [E: packages/client/ui-conversation/src/client/apply.ts:344]

## 设计动机

- **装配点而不是组件树百科。** layout 只声明中栏 / 右栏座位；本包一次占住并再声明内部洞。`ui-tool` / `ui-trajectory` / `ui-model-selection` 往已声明的 list / keyed / single 洞里加，而不是再占 `'conversation'`。
- **人命令与模型 turn 分缝。** `/` claim 走 `ctx.commands` / Remote `commands.execute`；只有普通（及带图）草稿进 inbox。model-visible ⟺ logged：GUI 不本地伪造 user/assistant 历史。
- **`ctx.conversation` 是动作面，导航在 runtime。** 其它插件经 `sessions.scope(id).conversation.send` 发一条文本，不必 import InputBar。current / blank / fork 仍是 `ctx.sessions`。
- **busy-Enter 是偏好，不是第一次提问语义。** 默认 `queue` 保持「空闲 Enter = 下一轮」。`steer` 只在 running 且非 subagent 时由手势翻转。
- **scope-addressed Service。** Cordis tracker 把 `this.ctx` 绑到调用方；`#private` 字段会绕过 rebinding，所以可变状态放在普通字段 + 单例 map。

## Gotcha

- `inputActions.submit()` **永远** `'queue'`。指针主按钮不会读 `busyEnter`。要 steer 必须走 Enter 政策或 Queue dock。 [E: packages/client/ui-conversation/src/client/input/facade.ts:80]
- 空闲会话 `resolve(..., running=false, …)` 恒为 `'queue'`。把 settings 改成 `steer` 不会改变第一问。 [E: packages/client/ui-conversation/src/client/input/submission-policy.ts:53]
- 以 `/` 开头但 **没有** `ui-input-trigger`、或 adjudication miss，会当普通 `session.prompt` 发出去。slash 短路只发生在 claim 命中之后。
- 仅图片、draft 为空白：facade 绕过 `enter`，空文本加图仍会 `sendSession`。 [E: packages/client/ui-conversation/src/client/input/facade.ts:200]
- `commitSend` 切断 undo。命令成功路径的 `submit-settled` 同样清 log。Ctrl/Z 不得复活已提交内容。
- `sendSession` 失败只在 draft 仍为空时还原文本。飞行中继续打字会赢。 [E: packages/client/ui-conversation/src/client/input/hub.ts:162]
- `updateQueue` 的 `steer-unavailable` / `queue-item-not-found` 被当成收敛，不抛。空草稿加速 Enter 对整列 Queue 做同样的静默收敛。
- `ApprovalPanel` `priority: 1`：与问题接管同时 pending 时问题（默认 0）先赢；问题结束 approval 再选举。
- 在 `'conversation'` 上第二次 `register`（`single` 覆盖）拆掉 Hero / composer / session 整树。加法用内部 list 或 layout 的 `shell.overlay`。
- client **不** `new ReactLoopAgent`。`apps/web` 只找 `#root` 再 `AppWebEntry.run()`；没有 `window.__DSH_BOOT__` 的 Vite 壳不是可独立跑的应用。
- `--host 0.0.0.0` 在 `web-startup` provide 之前被拒。本页不重写那条旗标链；含义是默认产品不会把 composer 的 `/api/session.prompt` 暴露到局域网。

## Seam 三角

换一行的 Provider 会带走对应 Consumer；Definition（服务名 / 槽名 / RPC 方法）保持不变。

| 缝 | Definition | Provider | Consumer · base / web-app / headless |
|---|---|---|---|
| Loader 行 `id: ui-conversation` | npm `@deepseek-ai/dsh-client-ui-conversation`；`dsh.client.platform = web` | **web-app** insert 该 id | **web-app**：modules 扫进 `window.__DSH_BOOT__`，壳 create 浏览器半边。**base / headless**：无此行，无 composer，无 `ctx.conversation` |
| node `apply` / settings | `CONVERSATION_SETTINGS_NAMESPACE` + `ConversationSettingsSchema` | host `apply` 在 `ctx.settings` 存在时 `register` | 浏览器 `ComposerSubmissionPolicy` 经 `settingsScope.bind`。无 settings 的 composition：政策停在进程内默认 `queue` |
| `ctx.conversation` | `IConversation`（`send` / `cancel` / `updateQueue` / `loadOlder` + `input` / `blocks`） | 浏览器 `ConversationController` `super(ctx, 'conversation')` | 其它 `ui-*` 经 `sessions.scope(id).conversation`；`InputHub.sink` 调具体类的 `sendSession`。**headless** 用人命令 / runner 直接 `followup`，不经此缝 |
| 槽 `conversation` / `details` | ui-slots `SlotMap` 名；layout 声明 kind/scope | **声明**：ui-layout `AppFrame` children。**占用**：本包 `ConversationRoot` / `DetailsPanel`。**核**：ui-slots 库。**运行时表**：runtime `SlotRegistry`（`ctx.slots`） | `AppFrame` `renderSlot`；内部子座的 Consumer 是 `ui-tool` / `ui-commands` / `ui-model-selection` 等。**base / headless** 无 `ctx.slots` |
| `conversationEvents` / `conversationViews` | runtime registry API：`register(definition)` | runtime 两个 Service | 本包 `registerConversationNodes` / `registerChatConversationView`；runtime session 投影用它们把 log 铸成 Chat 节点。其它包可再挂 kind，不必改本包 |
| 普通提问 | `SessionFace.prompt(content, mode)` → POST `/api/session.prompt` | connection `WebApiClient` + host `api.sessions.prompt` | `ConversationController.sendSession`。host：`queue` → `followup`，`steer` → `steer`。client 不执行 turn |
| slash / 人命令 | Remote `commands.execute(sessionId, line)` | `ui-commands` + `remote` | `claim.submit` 与 `Session.command`（含 `/permission`）。**不**经 `session.prompt`。headless 另有 `ctx.commands`，无本包 InputMachine |

`ui-slots` 库 vs runtime Provider vs 本包 Consumer：类型与 `register` 语义在 [`subsys.client.ui-slots`](ui-slots.md)；`ctx.slots` 实例与内建 `'root'` 在 [`subsys.client.runtime`](runtime.md)；本包是占 `'conversation'` / `'details'` 并声明子座的那个 Consumer。

## Sources

- packages/client/ui-conversation/src/index.ts
- packages/client/ui-conversation/src/submission-settings.ts
- packages/client/ui-conversation/src/client/index.ts
- packages/client/ui-conversation/src/client/apply.ts
- packages/client/ui-conversation/src/client/service.ts
- packages/client/ui-conversation/src/client/input/hub.ts
- packages/client/ui-conversation/src/client/input/facade.ts
- packages/client/ui-conversation/src/client/input/machine.ts
- packages/client/ui-conversation/src/client/input/submission-policy.ts
- packages/client/ui-conversation/src/client/skeleton/InputBar.tsx
- packages/client/ui-conversation/src/client/skeleton/ConversationRoot.tsx
- packages/client/ui-conversation/src/client/skeleton/DetailsPanel.tsx
- packages/client/ui-conversation/src/client/skeleton/PermissionSelect.tsx
- packages/client/ui-conversation/src/client/stores.ts
- packages/client/ui-conversation/src/client/conversation-nodes/register.ts
- packages/client/ui-conversation/src/client/conversation-nodes/message.ts
- packages/client/ui-conversation/src/client/conversation-nodes/chat-snapshot-builder.ts
- packages/client/ui-conversation/src/client/chat/register-node-renderers.ts
- packages/client/ui-conversation/package.json
- packages/client/ui-conversation/tests/host.client.spec.ts
- packages/client/ui-conversation/tests/apply-inject.client.spec.tsx
- packages/client/ui-conversation/tests/chat-apply.client.spec.tsx
- packages/client/ui-conversation/tests/submission-policy.client.spec.ts
- packages/client/ui-conversation/tests/input-machine.client.spec.ts
- packages/client/ui-conversation/tests/service-orchestration.client.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/client/ui-layout/src/client/index.ts
- packages/client/runtime/src/client/sessions/session.ts
- packages/client/runtime/src/client/conversation/event-registry.ts
- packages/client/ui-commands/src/client/service.ts
- packages/host/apiproxy/src/api-proxy.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从 `dsh web` 到第一轮 `followup`；本页是其中 composer 段。
- [`subsys.client.runtime`](runtime.md) — `ctx.slots` / `ctx.sessions` / `promptAttempted`；本页消费它们。
- [`subsys.client.ui-slots`](ui-slots.md) — `SlotKind` / `register` 覆盖语义；本页是 Consumer。
- [`subsys.client.ui-layout`](ui-layout.md) — `AppFrame` 声明四槽；本包占 `conversation` + `details`。
- [`subsys.client.connection`](connection.md) — `/api` 与 mux；`session.prompt` 的传输。
- [`surface.web.workbench`](../../surface/web/workbench.md) — 工作台可见面（槽位与 chrome）。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 与浏览器 roster 全表。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 插入本行的那一层 bundle。
