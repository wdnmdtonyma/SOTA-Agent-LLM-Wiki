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
  - packages/client/ui-conversation/src/client/skeleton/PermissionSelect.tsx
  - packages/client/ui-conversation/src/client/stores.ts
  - packages/client/ui-conversation/src/client/conversation/assembly.ts
  - packages/client/ui-conversation/src/client/conversation/event-registry.ts
  - packages/client/ui-conversation/src/client/contract/composer-submission.ts
  - packages/client/ui-conversation/package.json
  - packages/client/ui-conversation/tests/host.client.spec.ts
  - packages/client/ui-conversation/tests/apply-inject.client.spec.tsx
  - packages/client/ui-conversation/tests/service-orchestration.client.spec.ts
  - packages/client/ui-conversation/tests/submit-machine.client.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/client/ui-layout/src/client/index.ts
  - packages/api/session-controller/src/client/sessions/session.ts
  - packages/api/session-controller/src/commands.ts
  - packages/client/ui-commands/src/client/service.ts
  - packages/bundle/web-app/src/startup.ts
symbols:
  - ConversationController
  - UiConversation
  - InputHub
  - SessionInputShell
  - SubmitMachine
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
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-client-ui-conversation` 是 Web 工作台的 **会话装配点**：node 半边在存在 `settings` 时登记 `CONVERSATION_SETTINGS_NAMESPACE`；浏览器半边占住 `conversation` 槽，把未被 `/` command claim 的草稿经 `InputHub.sink` → `ConversationController.sendSession` → `Session.prompt` 交给 Session Controller。client 不执行模型 turn。Chat 节点渲染与 `details` 栏已迁到 `@deepseek-ai/dsh-client-ui-chat`。导航态在 `ctx.sessions` / `ctx.uiWorkspace`。

## 能回答的问题

- `id: ui-conversation` 出现在哪一层 bundle？`dsh-base` / `dsh-headless` / `sdk` / `sdk-minimal` / `acp` 有没有这条行？
- host `apply` 和 client `apply` 各登记什么？client `inject` 的服务名是哪些？
- 谁占 `conversation` 与 `details`？内部 composer / session body 子座怎样声明？
- 主按钮 `inputActions.submit()` 与 Enter 的 `resolveSubmitMode` 分别产出哪个 `InputSubmitMode`？第一次空闲提问为什么是 `queue`？
- 以 `/` 开头的草稿怎样被 `SubmitMachine` 裁成 slash 命令、为何不调用 `session.prompt`？
- `ctx.conversation` 与 `ctx.uiConversation`、Session Controller 的 `ctx.sessions` 各守哪一面？换 Workspace 的草稿搬运走哪条 inject？

## 职责边界

本包装的是 **会话面装配与提交编排**，不是第二个 agent-loop，也不是 HTTP 传输。DSH 是 Cordis 组合运行时：`profile → bundle → preset`。五个 shipped profile 是 `web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）；本仓没有 shipped TUI。`dsh web` 是唯一硬编码的 profile 子命令；其余用 `dsh --profile sdk|sdk-minimal|acp|headless`。Launcher 在 `provide` webStartup 之前拒绝 `--host 0.0.0.0`，所以默认 composition 不会把 Session Remote（含 `session.prompt`）绑到 all-interfaces。 [E: packages/bundle/web-app/src/startup.ts:74]

**拥有**

- node 半边：有 `settings` 时登记 durable 段 `ui-conversation`（`busyEnter`）。
- 浏览器半边：`ConversationController`（`ctx.conversation`）、`UiConversation`（`ctx.uiConversation` 事件/视图 registry）、`InputHub` / `SessionInputShell` / `SubmitMachine`、`ComposerSubmissionPolicy`、`ConversationRoot` 占中栏。
- 一次 `register` 声明的内部子座（composer chain、session body、view ring、input dock）。
- Queue / Todo dock 插件挂 `conversation.input.dock`。

**不拥有**

- `ctx.slots` 的 Provider：`@deepseek-ai/dsh-client-ui-renderer` + store。yml 里没有 `id: ui-slots`。
- HTTP / WS mux、信任篱笆：[`subsys.client.connection`](connection.md)。
- 会话列表、`current`、`sessions.create` / `open` / `fork`、`promptAttempted`：[`subsys.client.runtime`](runtime.md)（现为 `packages/client/store` + `packages/api/session-controller/src/client/`）。
- 三栏骨架与 `sidebar` / `shell.overlay`：[`subsys.client.ui-layout`](ui-layout.md)。
- **`details` 栏与 Chat 节点渲染器**：`@deepseek-ai/dsh-client-ui-chat`（web-app 下一行 `id: ui-chat`）。 [E: packages/bundle/web-app/cordis.patch.yml:208]
- slash 目录与 `remote.commands.execute`：`ui-commands`。
- 模型 turn / inbox `followup|steer`：host Session Controller + Agent loop。client 只发 Remote。

`package.json` 的 `dsh.client` 把本包标成 `platform: "web"`，模块图依赖 session-controller / locale / layout / renderer / ui-session / ui-settings / ui-workspace——**没有** ui-slots 包名（槽核经 renderer 提供）。 [E: packages/client/ui-conversation/package.json:43] [E: packages/client/ui-conversation/package.json:34]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/ui-conversation/src/index.ts` | node 半边 `apply`：有 `settings` 才 `register` |
| `packages/client/ui-conversation/src/submission-settings.ts` | `CONVERSATION_SETTINGS_NAMESPACE = 'ui-conversation'`、`busyEnter` schema |
| `packages/client/ui-conversation/src/client/apply.ts` | 浏览器 `inject` + 槽装配 + `ctx.plugin(ConversationController)` |
| `packages/client/ui-conversation/src/client/service.ts` | `ConversationController`：`send` / `sendSession` / `cancel` / `updateQueue` |
| `packages/client/ui-conversation/src/client/conversation/assembly.ts` | `UiConversation`：每会话 assembler + `events` / `views` registry |
| `packages/client/ui-conversation/src/client/input/hub.ts` | `InputHub`：每会话 `SessionInputShell`、`sink` → `sendSession` |
| `packages/client/ui-conversation/src/client/input/facade.ts` | `SessionInputShell`：`inputActions.submit` 固定 `'queue'`；adjudicate / claim.submit |
| `packages/client/ui-conversation/src/client/input/machine.ts` | 纯机：`/` 走 `adjudicate`，否则 `default-sink` |
| `packages/client/ui-conversation/src/client/input/submission-policy.ts` | 空闲一律 `queue`；busy + 可 steer 才读 `busyEnter` |
| `packages/client/ui-conversation/src/client/skeleton/InputBar.tsx` | 主按钮 `inputActions.submit()`；Enter `resolveSubmitMode` |
| `packages/client/ui-conversation/src/client/skeleton/ConversationRoot.tsx` | 驻留中栏：Hero / composer chain / session body |
| `packages/bundle/web-app/cordis.patch.yml` | 唯一 shipped insert：`id: ui-conversation` |
| `packages/client/ui-layout/src/client/index.ts` | 声明 `'conversation'` / `'details'` 座位 |
| `packages/api/session-controller/src/client/sessions/session.ts` | `Session.prompt` / `Session.command` |
| `packages/api/session-controller/src/commands.ts` | host：`queue` → `followup`，`steer` → `steer` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `CONVERSATION_SETTINGS_NAMESPACE` | 字面量 `'ui-conversation'`。字段 `busyEnter`: `'queue' \| 'steer'`，默认 `'queue'`。 [E: packages/client/ui-conversation/src/submission-settings.ts:6] [E: packages/client/ui-conversation/src/submission-settings.ts:18] |
| `IConversation` | `ctx.conversation` 对外合同：`input`、`blocks`、`send`、`updateQueue`、`cancel`、`loadOlder`。必须经 `sessions.scope(id)` 寻址；根 context 调用 fail-loud。 [E: packages/client/ui-conversation/src/client/service.ts:34] |
| `ConversationController` | 实现 `IConversation`；额外提供 `sendSession` / 草稿图 registry。服务名 `'conversation'`。 [E: packages/client/ui-conversation/src/client/service.ts:162] |
| `UiConversation` | 服务名 `'uiConversation'`；`events` / `views` registry + 每会话 `binding(snapshot)`。 [E: packages/client/ui-conversation/src/client/conversation/assembly.ts:153] |
| `InputSubmitMode` | 与 `BusyEnterBehavior` 同形：`'queue' \| 'steer'`。 [E: packages/client/ui-conversation/src/client/contract/composer-submission.ts:8] |
| `ComposerSubmitGesture` | `'enter' \| 'accelerated'`（Cmd/Ctrl-Enter）。 [E: packages/client/ui-conversation/src/client/contract/composer-submission.ts:11] |
| `InputHub` | `SessionInputResolver`：一会话一个 `SessionInputShell`，生命周期绑在 session scope fiber。 |
| `createConversationStore` | 每会话 `{ draft, view, viewRequest }`；session / header **共享同一 handle**。persist 键 `dsh.conversation`。 [E: packages/client/ui-conversation/src/client/stores.ts:20] |

## 控制流

1. **只有 web-app 把本包插进 Loader 表。** `PROFILE_TEMPLATES.web` 叠 `dsh-base` 再叠 `dsh-web-app`。web patch insert 含 `id: ui-conversation` / `name: '@deepseek-ai/dsh-client-ui-conversation'`，无额外 `config`。`dsh-base` 的 insert 从 `timer` / `hmr` / `llm` 起，没有浏览器 roster。`dsh-headless` 的 insert 是 `code-runtime` + `headless-startup` + `headless-runner`，同样没有本行。sdk / sdk-minimal / acp overlay 也不插入本包。本仓没有 shipped TUI 包。 [E: packages/bundle/web-app/cordis.patch.yml:202] [E: packages/bundle/web-app/cordis.patch.yml:203] [E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/headless/cordis.patch.yml:19]

2. **node 半边 `apply` 只碰 settings。** host 入口 `apply@packages/client/ui-conversation/src/index.ts` 用 `ctx.inject(['settings'], …)`：没有 `settings` 服务则整段不跑；有则 `settings.register(CONVERSATION_SETTINGS_NAMESPACE, ConversationSettingsSchema)`。测试钉死默认 `{ busyEnter: 'queue' }`，非法值拒绝，fiber dispose 后段消失。 [E: packages/client/ui-conversation/src/index.ts:17] [E: packages/client/ui-conversation/src/index.ts:18] [E: packages/client/ui-conversation/tests/host.client.spec.ts:23]

3. **浏览器半边 `inject` 是六条服务名，不是 yml 行。** `export const inject@packages/client/ui-conversation/src/client/apply.ts` = `slots` / `sessions` / `uiSession` / `uiWorkspace` / `locale` / `settingsScope`。`sessions` 来自 Session Controller client；`slots` 来自 ui-renderer；`uiSession` / `uiWorkspace` 来自对应 ui-* 包。缺任一条，本插件 fiber 保持 pending。 [E: packages/client/ui-conversation/src/client/apply.ts:44] [E: packages/client/ui-conversation/src/client/apply.ts:45]

4. **`apply@client/apply.ts` 先建 registry 与政策，再占座位。** `new UiConversation(ctx, sessions)` 提供 `ctx.uiConversation`。登记 locale、`createConversationStore()`、用 `settingsScope.bind({ namespace: CONVERSATION_SETTINGS_NAMESPACE })` 构造 `ComposerSubmissionPolicy`，并往 `settings.general.item` 挂 `id: 'composer-enter'`。Chat 业务 Definition（user / assistant 等）由 **ui-chat** 写入 `uiConversation.events` / `views`，不在本包 `apply`。 [E: packages/client/ui-conversation/src/client/apply.ts:100] [E: packages/client/ui-conversation/src/client/apply.ts:109] [E: packages/client/ui-conversation/src/client/apply.ts:111]

5. **ui-layout 先声明座位；本包只占 `conversation`。** `AppFrame` 占 `'root'` 时声明 `'conversation': { kind: 'single', scope: 'session-maybe' }` 与 `'details': { kind: 'single', scope: 'session' }`。本包 `slots.register({ name: 'conversation', children: {…} }, ConversationRoot)` 占中栏。`details` 由 ui-chat 占用。在 `'conversation'` 上再 `register` 会阴影整棵中栏子树（加法面是内部 list / `shell.overlay`）。 [E: packages/client/ui-layout/src/client/index.ts:128] [E: packages/client/ui-layout/src/client/index.ts:129] [E: packages/client/ui-conversation/src/client/apply.ts:173] [E: packages/client/ui-conversation/src/client/apply.ts:326]

   | 槽 | kind / scope | occupant | 装配意图 |
   |---|---|---|---|
   | `conversation` | single / session-maybe（layout 声明） | `ConversationRoot` | 驻留 Hero + composer；无 current 也不卸栏 |
   | `conversation.session` | single / session | `ConversationSession` | 声明 `conversation.view` ring |
   | `conversation.session.header` | single / session | `ConversationSessionHeader` | 标题 / tab；加法座 `*.actions` / `*.utilities` |
   | `conversation.composer` | chain / session | 其它包可 `inject` | fallback 是 Root 里的 bar 栈 |
   | `conversation.composer.bar` | single / session-maybe | `InputBar` | 声明 `conversation.input.plan` / `.model` / attachments |
   | `conversation.view` | list / session | ui-chat 等挂 `id` | 本包只声明座位并刷新 `conversationViews` |
   | `conversation.input.dock` | list / session | todo `id: todo` / queue `id: queue` | `todoDockEntry` / `queueDockEntry` |
   | `details` | single / session（layout 声明） | **ui-chat** `DetailsPanel` | 本包不再占用 |
   | `settings.general.item` `id: composer-enter` | list / root | `EnterBehaviorRow` | 写 `busyEnter` |

6. **`InputHub` 经 `uiSession.provide` 物化，然后才 `plugin` 服务。** `new InputHub(ctx, t)` 与 `ComposerBlockRegistry` 在 apply 内构造。`ctx.uiSession.provide({ hooks: ['conversation', 'input'], props: ['inputActions'], resolve })` 在 scope 物化时 `inputHub.shellFor(binding)`——这是创建触发器。随后 `ctx.plugin(ConversationController, { input: inputHub, blocks: composerBlocks })` 把同一实例暴露成 `ctx.conversation.input` / `.blocks`。Context merge 只导出 `IConversation` 与 `UiConversation`。 [E: packages/client/ui-conversation/src/client/apply.ts:157] [E: packages/client/ui-conversation/src/client/apply.ts:333] [E: packages/client/ui-conversation/src/client/index.ts:70]

7. **主按钮固定 `queue`；Enter 才问政策。** `InputBar` 主按钮在非 Stop 时调用 `inputActions.submit()`。`SessionInputShell.actions.submit` 写死 `this.submit('queue')`。Enter（非空稿加速手势走 queue dock）走 `keyboard.submit(resolveSubmitMode(running, accelerated ? 'accelerated' : 'enter', subagent === null))`。`ComposerSubmissionPolicy.resolve`：未 running 或 `steeringAvailable === false`（含 continuable subagent）一律 `'queue'`；空闲第一次提问因此是 `queue`，与 settings 里把 busy-Enter 改成 `steer` 无关。 [E: packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:325] [E: packages/client/ui-conversation/src/client/input/facade.ts:141] [E: packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:275] [E: packages/client/ui-conversation/src/client/input/submission-policy.ts:54]

8. **`SessionInputShell.submit` 进纯机，再分 slash / 普通稿。** 纯空白（无图）`enter` 被机丢掉。仅有图、draft trim 为空时，facade 在 `plain` 直接 `defaultSink('', imageIds, mode)`，不经 `enter`。否则 `dispatch({ type: 'enter', mode })`：`claimed` → `begin-submit`（`claim.submit`）；trim 以 `/` 开头 → `adjudicating` + `adjudicate`；其余 → `default-sink`。无 `inputTriggers` 时 `adjudicate` 立刻 miss，落到 `default-sink`，把整行当普通消息。 [E: packages/client/ui-conversation/src/client/input/facade.ts:361] [E: packages/client/ui-conversation/src/client/input/machine.ts:148] [E: packages/client/ui-conversation/src/client/input/machine.ts:150] [E: packages/client/ui-conversation/tests/submit-machine.client.spec.ts:75]

9. **slash 走 `ui-commands` / `remote.commands.execute`，不开模型 turn。** `beginSubmit` 调 `claim.submit(args, actx, images)`。`ui-commands` 的 leading claim 把 token `/${name} ` 接到 `this.execute` → `this.ctx.remote.commands.execute(sessionId, line, images)`。`Session.command` 是同一条 Remote，给 `PermissionSelect` 的 `/permission <id>` 用，同样不调 `session.prompt`。host 把命令生命周期记成 `command/run` / `command/done`，client 只等 admission。 [E: packages/client/ui-conversation/src/client/input/facade.ts:870] [E: packages/client/ui-commands/src/client/service.ts:385] [E: packages/api/session-controller/src/client/sessions/session.ts:332] [E: packages/client/ui-conversation/src/client/skeleton/PermissionSelect.tsx:121]

10. **未被 claim 的草稿：`InputHub.sink` → `sendSession`。** `sink` 空文本且无图直接 `{ kind: 'success' }`。否则 `conversation.sendSession(session, text, imageIds, mode, signal)`。facade 在发送前 `commitSend`（清草稿且切断 undo）。失败路径还原图片；飞行中新键入不被覆盖。 [E: packages/client/ui-conversation/src/client/input/hub.ts:182] [E: packages/client/ui-conversation/src/client/input/hub.ts:183] [E: packages/client/ui-conversation/src/client/input/facade.ts:324]

11. **`sendSession` 把图编成 base64 parts，再 `session.prompt`。** 缺草稿图 id 抛错。`content` = 图像 parts +（非空文本才追加 text part）。普通会话可走 `beginSubmission` 乐观 echo；subagent 会话跳过 echo 直接 `prompt`。`IConversation.send(text)` 是跨插件捷径：固定 `[{ type: 'text', text }]` + `'queue'`。二者都不跑 loop。 [E: packages/client/ui-conversation/src/client/service.ts:208] [E: packages/client/ui-conversation/src/client/service.ts:181] [E: packages/client/ui-conversation/tests/service-orchestration.client.spec.ts:46]

12. **`Session.prompt` 在第一个 await 前同步置 `promptAttempted`，然后调 Remote `session.prompt`。** 普通会话（无 subagent `address`）走 `remote.session.prompt({ sessionId, mode, content, clientTimeZone, requestId })`。blank → engaging 必须出现在当帧；这是 Session Controller 对象层，不是本包伪造的「本地已发送」。 [E: packages/api/session-controller/src/client/sessions/session.ts:218] [E: packages/api/session-controller/src/client/sessions/session.ts:224]

13. **host 把 `queue` 写成 `followup`，`steer` 写成 `steer`。** Session Controller `prompt` 命令在选到 adapter 之后 `createUserMessage`，然后 `request.mode === 'steer' ? agent.steer(message) : agent.followup(message)`。第一次空闲提问是 `queue` → `followup`。GUI 历史来自 log 投影 + `uiConversation.events` Definition（Chat 包登记），不是 composer 本地数组。 [E: packages/api/session-controller/src/commands.ts:324] [E: packages/api/session-controller/src/commands.ts:325]

14. **换 Workspace 走 ui-workspace，本包只搬运草稿。** `ConversationRoot` inject 的 `selectWorkspace` 调 `uiWorkspace.connectWorkspace(workspaceId)`；若得到另一 `sessionId`，把当前 shell 的 draft / imageIds 搬到目标 shell，再 `sessions.open(nextId)`。`ctx.conversation` 没有 `open` / `create`。Stop 调 `scopedConversation(…).cancel()`；失败吞掉，展示走 `snapshot.promptError`。 [E: packages/client/ui-conversation/src/client/apply.ts:194] [E: packages/client/ui-conversation/src/client/apply.ts:210] [E: packages/client/ui-conversation/src/client/apply.ts:307]

## 设计动机

- **装配点而不是组件树百科。** layout 只声明中栏 / 右栏座位；本包占中栏并再声明内部洞。`ui-chat` / `ui-tool` / `ui-model-selection` 往已声明的 list / keyed / single 洞里加，而不是再占 `'conversation'`。
- **人命令与模型 turn 分缝。** `/` claim 走 `remote.commands.execute`；只有普通（及带图）草稿进 inbox。model-visible ⟺ logged：GUI 不本地伪造 user/assistant 历史。
- **`ctx.conversation` 是动作面，导航在 Session Controller。** 其它插件经 `sessions.scope(id).conversation.send` 发一条文本，不必 import InputBar。current / blank / fork 仍是 `ctx.sessions`。
- **busy-Enter 是偏好，不是第一次提问语义。** 默认 `queue` 保持「空闲 Enter = 下一轮」。`steer` 只在 running 且非 subagent 时由手势翻转。
- **scope-addressed Service。** Cordis tracker 把 `this.ctx` 绑到调用方；`#private` 字段会绕过 rebinding，所以可变状态放在普通字段 + 单例 map。

## Gotcha

- `inputActions.submit()` **永远** `'queue'`。指针主按钮不会读 `busyEnter`。要 steer 必须走 Enter 政策或 Queue dock。 [E: packages/client/ui-conversation/src/client/input/facade.ts:141]
- 空闲会话 `resolve(..., running=false, …)` 恒为 `'queue'`。把 settings 改成 `steer` 不会改变第一问。 [E: packages/client/ui-conversation/src/client/input/submission-policy.ts:54]
- 以 `/` 开头但 **没有** `inputTriggers`、或 adjudication miss，会当普通 `session.prompt` 发出去。slash 短路只发生在 claim 命中之后。
- 仅图片、draft 为空白：facade 绕过 `enter`，空文本加图仍会 `sendSession`。 [E: packages/client/ui-conversation/src/client/input/facade.ts:361]
- `commitSend` 切断 undo。命令成功路径的 `submit-settled` 同样清 log。Ctrl/Z 不得复活已提交内容。 [E: packages/client/ui-conversation/src/client/input/facade.ts:324]
- `updateQueue` 的 `session/steer-unavailable` / `session/queue-item-not-found` 被当成收敛，不抛。空草稿加速 Enter 对整列 Queue 做同样的静默收敛。 [E: packages/client/ui-conversation/src/client/input/hub.ts:204]
- 在 `'conversation'` 上第二次 `register`（`single` 覆盖）拆掉 Hero / composer / session 整树。加法用内部 list 或 layout 的 `shell.overlay`。
- client **不** 执行 Agent loop。Web boot 是 `packages/client/web/src/boot.ts` 的 `AppWebEntry`，loader 静默后 `uiRenderer.mount`。
- `--host 0.0.0.0` 在 web-startup provide 之前被拒。含义是默认产品不会把 composer 的 Session Remote 暴露到局域网。 [E: packages/bundle/web-app/src/startup.ts:75]

## Seam 三角

换一行的 Provider 会带走对应 Consumer；Definition（服务名 / 槽名 / RPC 方法）保持不变。

| 缝 | Definition | Provider | Consumer · base / web-app / headless |
|---|---|---|---|
| Loader 行 `id: ui-conversation` | npm `@deepseek-ai/dsh-client-ui-conversation`；`dsh.client.platform = web` | **web-app** insert 该 id | **web-app**：浏览器半边。**base / headless / sdk / acp / sdk-minimal**：无此行，无 composer，无 `ctx.conversation` |
| node `apply` / settings | `CONVERSATION_SETTINGS_NAMESPACE` + `ConversationSettingsSchema` | host `apply` 在 `ctx.settings` 存在时 `register` | 浏览器 `ComposerSubmissionPolicy` 经 `settingsScope.bind`。无 settings 的 composition：政策停在进程内默认 `queue` |
| `ctx.conversation` | `IConversation`（`send` / `cancel` / `updateQueue` / `loadOlder` + `input` / `blocks`） | 浏览器 `ConversationController` `super(ctx, 'conversation')` | 其它 `ui-*` 经 `sessions.scope(id).conversation`；`InputHub.sink` 调具体类的 `sendSession`。**headless** 用人命令 / runner 直接 `followup`，不经此缝 |
| `ctx.uiConversation` | `events.register` / `views.register` | `UiConversation` | **ui-chat** 等登记 kind；session 投影把 log 铸成节点。本包 apply 不登记 Chat kind |
| 槽 `conversation` / `details` | ui-slots `SlotMap` 名；layout 声明 kind/scope | **声明**：ui-layout `AppFrame` children。**占用**：本包 `ConversationRoot`；`details` 由 ui-chat。**核**：ui-slots 库。**运行时表**：renderer `ctx.slots` | `AppFrame` `renderSlot`。**base / headless** 无 `ctx.slots` |
| 普通提问 | `SessionFace.prompt(content, mode)` → Remote `session.prompt` | Session Controller client + host commands | `ConversationController.sendSession`。host：`queue` → `followup`，`steer` → `steer`。client 不执行 turn |
| slash / 人命令 | Remote `commands.execute(sessionId, line, images)` | `ui-commands` + `remote` | `claim.submit` 与 `Session.command`（含 `/permission`）。**不**经 `session.prompt` |

`ui-slots` 库 vs renderer Provider vs 本包 Consumer：类型与 `register` 语义在 [`subsys.client.ui-slots`](ui-slots.md)；`ctx.slots` 实例在 [`subsys.client.runtime`](runtime.md)；本包是占 `'conversation'` 并声明子座的那个 Consumer。

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
- packages/client/ui-conversation/src/client/skeleton/PermissionSelect.tsx
- packages/client/ui-conversation/src/client/stores.ts
- packages/client/ui-conversation/src/client/conversation/assembly.ts
- packages/client/ui-conversation/src/client/conversation/event-registry.ts
- packages/client/ui-conversation/src/client/contract/composer-submission.ts
- packages/client/ui-conversation/package.json
- packages/client/ui-conversation/tests/host.client.spec.ts
- packages/client/ui-conversation/tests/apply-inject.client.spec.tsx
- packages/client/ui-conversation/tests/service-orchestration.client.spec.ts
- packages/client/ui-conversation/tests/submit-machine.client.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/client/ui-layout/src/client/index.ts
- packages/api/session-controller/src/client/sessions/session.ts
- packages/api/session-controller/src/commands.ts
- packages/client/ui-commands/src/client/service.ts
- packages/bundle/web-app/src/startup.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从 `dsh web` 到第一轮 `followup`；本页是其中 composer 段。
- [`subsys.client.runtime`](runtime.md) — `ctx.slots` / `ctx.sessions` / `promptAttempted`；本页消费它们。
- [`subsys.client.ui-slots`](ui-slots.md) — `SlotKind` / `register` 覆盖语义；本页是 Consumer。
- [`subsys.client.ui-layout`](ui-layout.md) — `AppFrame` 声明四槽；本包占 `conversation`。
- [`subsys.client.connection`](connection.md) — HTTP / mux；Session Remote 的传输。
- [`surface.web.workbench`](../../surface/web/workbench.md) — 工作台可见面（槽位与 chrome）。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 与浏览器 roster 全表。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 插入本行的那一层 bundle。
