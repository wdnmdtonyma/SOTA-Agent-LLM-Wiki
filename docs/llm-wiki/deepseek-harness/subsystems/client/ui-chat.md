---
id: subsys.client.ui-chat
title: ui-chat ConversationNode
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/ui-chat/src/index.ts
  - packages/client/ui-chat/src/chat-settings.ts
  - packages/client/ui-chat/src/client/index.ts
  - packages/client/ui-chat/src/client/apply.ts
  - packages/client/ui-chat/src/client/stores.ts
  - packages/client/ui-chat/src/client/transcript-view.ts
  - packages/client/ui-chat/src/client/conversation-nodes/register.ts
  - packages/client/ui-chat/src/client/conversation-nodes/common.ts
  - packages/client/ui-chat/src/client/conversation-nodes/inbox.ts
  - packages/client/ui-chat/src/client/conversation-nodes/message.ts
  - packages/client/ui-chat/src/client/conversation-nodes/request-prompt.ts
  - packages/client/ui-chat/src/client/conversation-nodes/assistant.ts
  - packages/client/ui-chat/src/client/conversation-nodes/turn-process.ts
  - packages/client/ui-chat/src/client/conversation-nodes/tool.ts
  - packages/client/ui-chat/src/client/conversation-nodes/command.ts
  - packages/client/ui-chat/src/client/conversation-nodes/compaction.ts
  - packages/client/ui-chat/src/client/conversation-nodes/retry.ts
  - packages/client/ui-chat/src/client/conversation-nodes/turn-error.ts
  - packages/client/ui-chat/src/client/conversation-nodes/turn-max-tokens.ts
  - packages/client/ui-chat/src/client/conversation-nodes/turn-tail.ts
  - packages/client/ui-chat/src/client/conversation-nodes/fallback.ts
  - packages/client/ui-chat/src/client/conversation-nodes/chat-snapshot-builder.ts
  - packages/client/ui-chat/src/client/chat/register-node-renderers.ts
  - packages/client/ui-chat/src/client/chat/ChatView.tsx
  - packages/client/ui-chat/src/client/details/DetailsPanel.tsx
  - packages/client/ui-chat/src/client/contract/chat-nodes.ts
  - packages/client/ui-chat/src/client/contract/snapshot.ts
  - packages/client/ui-chat/package.json
  - packages/client/ui-chat/tests/conversation-node-definitions.client.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/client/ui-layout/src/client/index.ts
  - packages/client/ui-conversation/src/client/apply.ts
  - packages/client/ui-conversation/src/client/contract/conversation.ts
  - packages/client/ui-conversation/src/client/conversation/event-registry.ts
  - packages/client/ui-conversation/src/client/conversation/assembly.ts
symbols:
  - registerConversationNodes
  - registerChatNodeRenderers
  - CHAT_SETTINGS_NAMESPACE
  - ChatSettingsSchema
  - TranscriptViewPolicy
  - createChatStore
  - chatViewDefinition
  - ChatSnapshotBuilder
  - chatNode
  - ChatView
  - DetailsPanel
  - EMPTY_CHAT_SNAPSHOT
  - ChatNodeDataMap
  - messageDefinition
  - assistantDefinition
  - toolDefinition
  - commandDefinition
  - unknownFallbackDefinition
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.client.ui-conversation
  - subsys.client.runtime
  - subsys.client.ui-slots
  - subsys.client.ui-layout
  - surface.web.workbench
  - surface.profiles.web
  - subsys.composition.bundle-web-app
evidence: explicit
status: verified
updated: d347e70390
---

> `@deepseek-ai/dsh-client-ui-chat` 是 Web 工作台的 **Chat 业务面**：把 session log 铸成 `target: 'chat'` 的视图节点、占 `conversation.view`（`id: chat`）与 `details` 栏、并登记 keyed 渲染器。装配引擎（`UiConversation` / `ConversationNodeAssembler` / `ConversationNodeDefinition` **类型**）权威在 [`subsys.client.ui-conversation`](ui-conversation.md)；本包贡献的是 Chat 的 **Definition 实例**、snapshot builder 与 React 行。client 不执行模型 turn。

## 能回答的问题

- `id: ui-chat` 出现在哪一层 bundle？headless / sdk / acp 有没有这条行？
- Chat `apply` 的 `inject` 服务名是哪些？谁占 `details` 与 `conversation.view` `id: chat`？
- `ConversationNodeDefinition` 类型在哪、Chat 登记了哪些 `kind`？fallback 走 `register` 还是 `registerFallback`？
- 渲染器 `conversation.chat.node` 的 `key` 与 Definition `kind` 如何对应？`system-prompt` 从哪条 Definition 产出？
- `transcriptView` 默认值是什么？compact / normal 存在哪段 settings？
- `uiConversation.binding(…).target('chat')` 空快照是什么常量？

## 职责边界

本包装的是 **Chat 节点定义 + 渲染 + details**，不是 composer / `session.prompt`，也不是槽核。五个 shipped profile：`web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。只有 `dsh-web-app` 插入本包。 [E: packages/bundle/web-app/cordis.patch.yml:209]

**拥有**

- node 半边：有 `settings` 时登记 durable 段 `ui-chat`（`transcriptView`）。 [E: packages/client/ui-chat/src/index.ts:15] [E: packages/client/ui-chat/src/chat-settings.ts:6]
- 浏览器半边：`registerConversationNodes` → `ctx.uiConversation.events` / `views`；`registerChatNodeRenderers` → keyed `conversation.chat.node`；`ChatView` / `DetailsPanel` / `StatsLine` / `ApprovalCommand` / `TranscriptViewRow`。
- `ChatSnapshot` / `ChatNodeDataMap` / `createChatStore`（selection + turn process 开合）。

**不拥有**

- `ConversationNodeDefinition` / `ConversationViewDefinition` **接口**、`ConversationEventRegistry.register`、`UiConversation`、`ConversationNodeAssembler`：[`subsys.client.ui-conversation`](ui-conversation.md)。 [E: packages/client/ui-conversation/src/client/contract/conversation.ts:168] [E: packages/client/ui-conversation/src/client/conversation/event-registry.ts:13]
- 中栏骨架、`InputHub`、`sendSession`：ui-conversation 占 `'conversation'`。 [E: packages/client/ui-conversation/src/client/apply.ts:174] [E: packages/client/ui-conversation/src/client/apply.ts:152]
- `ctx.slots` Provider：ui-renderer + store。
- 会话导航 `sessions.fork` / `open` / `loadOlder`：Session Controller client（本包只调用）。
- Tool 业务视图（generic fallback 以外的 tool UI）：`id: ui-tool` 挂 `conversation.details.tool`。

`package.json` `dsh.client.platform` 为 `"web"`；模块图依赖 session-controller / conversation / layout / renderer / session / settings / workspace。 [E: packages/client/ui-chat/package.json:45]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/ui-chat/src/index.ts` | host `apply`：有 `settings` 才 `register` |
| `packages/client/ui-chat/src/chat-settings.ts` | `CHAT_SETTINGS_NAMESPACE = 'ui-chat'`、`transcriptView` |
| `packages/client/ui-chat/src/client/apply.ts` | 浏览器 `inject` + 槽占用 + `registerConversationNodes` |
| `packages/client/ui-chat/src/client/conversation-nodes/register.ts` | 一次登记全部 Chat Definition + view |
| `packages/client/ui-chat/src/client/conversation-nodes/common.ts` | `chatNode()`：`target: 'chat'` |
| `packages/client/ui-chat/src/client/conversation-nodes/chat-snapshot-builder.ts` | `ChatSnapshotBuilder` + `chatViewDefinition` |
| `packages/client/ui-chat/src/client/chat/register-node-renderers.ts` | keyed 渲染器 |
| `packages/client/ui-chat/src/client/chat/ChatView.tsx` | transcript 列表 |
| `packages/client/ui-chat/src/client/details/DetailsPanel.tsx` | 右栏；工具详情 fallback |
| `packages/client/ui-chat/src/client/stores.ts` | `createChatStore` |
| `packages/bundle/web-app/cordis.patch.yml` | 唯一 shipped `id: ui-chat` |
| `packages/client/ui-conversation/src/client/contract/conversation.ts` | Definition **类型**权威 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `CHAT_SETTINGS_NAMESPACE` | 字面量 `'ui-chat'`。字段 `transcriptView`: `'normal' \| 'compact'`，默认 `'compact'`。 [E: packages/client/ui-chat/src/chat-settings.ts:6] [E: packages/client/ui-chat/src/chat-settings.ts:18] |
| `ChatNode` | `target: 'chat'` + `kind` + `data`；`kind` 来自 merge 的 `ChatNodeDataMap`。 [E: packages/client/ui-chat/src/client/contract/chat-nodes.ts:22] |
| `EMPTY_CHAT_SNAPSHOT` | builder 尚未产出时的空 `order` / 空 lookup。 [E: packages/client/ui-chat/src/client/contract/snapshot.ts:79] |
| `createChatStore` | `{ selection, turnProcesses }`；`select` / `setTurnProcessOpen`。ChatView 与 Details 共享同一 handle。 [E: packages/client/ui-chat/src/client/stores.ts:33] |
| `chatViewDefinition` | `target: 'chat'`，`create: () => new ChatSnapshotBuilder()`。`isActive`：order 里存在非 `command` 节点才算有 Chat 内容。 [E: packages/client/ui-chat/src/client/conversation-nodes/chat-snapshot-builder.ts:723] |
| `TranscriptViewPolicy` | 读 Host `ui-chat` 段；未到达前默认 compact。 [E: packages/client/ui-chat/src/client/transcript-view.ts:13] |

## Chat ConversationNodeDefinition 实例

类型 `ConversationNodeDefinition` 在 ui-conversation。下列 **kind** 由本包 `events.register`（fallback 除外）。测试把同一批 Definition 交给 `ConversationNodeAssembler` 跑投影。 [E: packages/client/ui-chat/tests/conversation-node-definitions.client.spec.ts:39]

| Definition `kind` | 文件导出 | 主要 match 事件 | `buildViewNode` 的渲染 `key` |
|---|---|---|---|
| `inbox-next-turn` | `nextTurnInboxDefinition` | `agent/inbox/spliced` target `next-turn` | 无（`publication: 'none'`） |
| `inbox-next-step` | `nextStepInboxDefinition` | 同上 `next-step`；给 steering 分类 | 无 |
| `input-message` | `messageDefinition` | append `user/message`（排除 compact checkpoint） | `user` / `steering` / `context` |
| `request-prompt` | `requestPromptDefinition(inspect)` | `request/header` | `system-prompt`（空 system 则 null） |
| `assistant-step` | `assistantDefinition` | `step/start` + chunk / message | `assistant-step` |
| `turn-process` | `turnProcessDefinition` | `turn/start` 及同 turn 过程事件 | `turn-process` |
| `tool-call` | `toolDefinition` | `tool/call` / result / code-dispatch | 工具行（`ChatNodeDataMap` tool 载荷） |
| `command` | `commandDefinition` | `command/run` 等 | `command` 或 `manual-compaction` |
| `compaction` | `compactionDefinition` | 自动 compact checkpoint | `compaction` |
| `model-retry` | `retryDefinition` | `llm/retry` | `model-retry` |
| `turn-error` | `turnErrorDefinition` | `turn/end` reason `error` | `turn-error` |
| `turn-max-tokens` | `turnMaxTokensDefinition` | `turn/end` reason `max-tokens` | `turn-max-tokens` |
| `turn-tail` | `turnTailDefinition` | `turn/start` / `turn/end` | `turn-tail` |
| `unknown-surface` | `unknownFallbackDefinition` | 无其它 Definition 命中的 append 面 | `unknown`（`registerFallback`） |

inbox 两条故意 **没有** `target: 'chat'`：只累积 pending/claimed，供 `input-message` 把 claimed 用户稿标成 `steering`。 [E: packages/client/ui-chat/src/client/conversation-nodes/inbox.ts:40] [E: packages/client/ui-chat/src/client/conversation-nodes/message.ts:61]

## 渲染器 `conversation.chat.node` key

每个 key 必须在某行出现。登记函数把 React 视图挂到 ui-conversation 声明的 keyed 洞。 [E: packages/client/ui-chat/src/client/chat/register-node-renderers.ts:17]

| slot `key` | 组件 |
|---|---|
| `user` | `UserMessageNodeView` |
| `steering` | `UserMessageNodeView`（同一组件） |
| `context` | `ContextMessageNodeView` |
| `system-prompt` | `SystemPromptNodeView` |
| `assistant-step` | `AssistantNodeView` |
| `command` | `CommandNodeView`（子座 `conversation.chat.commandview` keyed） |
| `manual-compaction` | `ManualCompactionNodeView` |
| `compaction` | `CompactionNodeView` |
| `model-retry` | `RetryNodeView` |
| `turn-error` | `TurnErrorNodeView` |
| `turn-max-tokens` | `TurnMaxTokensNodeView` |
| `turn-process` | `TurnProcessNodeView` |
| `turn-tail` | `TurnTailNodeView`（子座 `conversation.chat.turnTail` chain、`conversation.chat.assistant-actions` list） |
| `unknown` | `UnknownNodeView` |

## 控制流

1. **只有 web-app 插入 Loader 行。** `id: ui-chat` / `name: '@deepseek-ai/dsh-client-ui-chat'` 紧跟 `ui-conversation` 与 `ui-approval`。`dsh-base` insert 从 `timer` / `hmr` 起，没有浏览器 roster。headless / sdk / sdk-minimal / acp 不插本包。 [E: packages/bundle/web-app/cordis.patch.yml:209] [E: packages/bundle/base/cordis.patch.yml:16]

2. **node `apply` 只碰 settings。** `ctx.inject(['settings'], …)` 后 `settings.register(CHAT_SETTINGS_NAMESPACE, ChatSettingsSchema)`。无 settings 则整段不跑。 [E: packages/client/ui-chat/src/index.ts:14] [E: packages/client/ui-chat/src/index.ts:16]

3. **浏览器 `inject` 九条服务名。** `slots` / `sessions` / `uiSession` / `uiConversation` / `layout` / `locale` / `settingsScope` / `remote` / `remote.session`。缺任一条 fiber pending。 [E: packages/client/ui-chat/src/client/apply.ts:47]

4. **先登记 Definition，再挂会话 hook。** `registerConversationNodes(ctx)` 再 `registerChatNodeRenderers(ctx)`。`uiSession.provide({ hooks: ['chat'], … })` 把 `uiConversation.binding(binding).target('chat')` 包成 `useChat`；缺 snapshot 用 `EMPTY_CHAT_SNAPSHOT`。 [E: packages/client/ui-chat/src/client/apply.ts:72] [E: packages/client/ui-chat/src/client/apply.ts:66] [E: packages/client/ui-chat/src/client/conversation-nodes/register.ts:21]

5. **占 `conversation.view` `id: chat`。** 声明子座 `conversation.chat.node`（keyed）与 `conversation.message.images`。`openDetails` → store `select` + `layout.openDetails()`。`forkAt` 调 `sessions.fork` 再 `open`；失败吞掉。`loadOlder` 调 session。图片 URL 走 `uiConversation.imageUrl`。 [E: packages/client/ui-chat/src/client/apply.ts:99] [E: packages/client/ui-chat/src/client/apply.ts:101] [E: packages/client/ui-chat/src/client/apply.ts:140]

6. **占 `details`。** layout 声明 `'details': { kind: 'single', scope: 'session' }`。本包 `slots.register({ name: 'details', children: { 'conversation.details.tool': … } }, DetailsPanel)`。ui-conversation **不再**占右栏。 [E: packages/client/ui-layout/src/client/index.ts:129] [E: packages/client/ui-chat/src/client/apply.ts:160]

7. **其它洞。** `conversation.composer.dock` `id: stats` → `StatsLine`。`conversation.approval.detail` → `ApprovalCommand`。`settings.general.item` `id: transcript-view` → `TranscriptViewRow`。 [E: packages/client/ui-chat/src/client/apply.ts:152] [E: packages/client/ui-chat/src/client/apply.ts:157] [E: packages/client/ui-chat/src/client/apply.ts:89]

8. **投影在 assembler，不在 React。** 每条 log 事件由已登记 Definition `match` → `start`/`update` → `buildViewNode`；`ChatSnapshotBuilder` 增量写入 `order` / `nodes`。GUI 历史来自 log + 这些 Definition，不是 composer 本地数组。

9. **details 打开工具。** `DetailsPanel` 用 snapshot 找 `ToolCallBlock`；有 `conversation.details.tool` occupant 时渲染业务视图，否则 JSON pretty 的 fallback。 [E: packages/client/ui-chat/src/client/details/DetailsPanel.tsx:26]

## 设计动机

- **引擎与业务拆包。** ui-conversation 提供 registry / assembler / composer；Chat kind 与渲染器可独立演进，其它 target（若出现）可并列 `views.register`。
- **kind ≠ 渲染 key。** 一条 Definition 可产出多种 `ChatNode.kind`（`input-message` → user/steering/context；`command` → command/manual-compaction）。inbox 是无视图状态机。
- **右栏跟 selection store，不跟第二份 log。** ChatView `select` 与 Details 同 `createChatStore`。
- **默认 compact 过程披露。** `DEFAULT_TRANSCRIPT_VIEW_MODE = 'compact'`，不是 normal。

## Gotcha

- `ConversationNodeDefinition` **不要**写进本节点 `symbols:`；改链 ui-conversation。本包只权威 **实例** 与 `ChatNodeDataMap` merge。
- fallback 必须 `registerFallback`；普通 `register('unknown-surface')` 会与「仅未匹配时」语义冲突。 [E: packages/client/ui-chat/src/client/conversation-nodes/fallback.ts:40]
- `isActive` 把纯 command 时间线当成 Chat 未激活。 [E: packages/client/ui-chat/src/client/conversation-nodes/chat-snapshot-builder.ts:725]
- `forkAt` 失败静默；视图停在源会话。 [E: packages/client/ui-chat/src/client/apply.ts:142]
- 在 `'details'` 上第二次 `register`（single 覆盖）拆掉 DetailsPanel 与 `conversation.details.tool` 子树。加法用内部 single 或 ui-tool。
- client **不**跑 agent-loop。提问入口仍是 ui-conversation `sendSession`。

## Seam 三角

换一行的 Provider 会带走对应 Consumer；Definition（服务名 / 槽名 / RPC）保持不变。

| 缝 | Definition | Provider | Consumer · base / web-app / headless |
|---|---|---|---|
| Loader 行 `id: ui-chat` | npm `@deepseek-ai/dsh-client-ui-chat`；`dsh.client.platform = web` | **web-app** insert | **web-app**：浏览器半边。**base / headless / sdk / acp / sdk-minimal**：无此行，无 Chat 节点、无 details occupant |
| node settings | `CHAT_SETTINGS_NAMESPACE` + `ChatSettingsSchema` | host `apply` 在 `ctx.settings` 存在时 `register` | 浏览器 `TranscriptViewPolicy`。无 settings：进程内默认 `compact` |
| `ctx.uiConversation.events` / `views` | 接口在 ui-conversation；Chat **实例**在本包 | `registerConversationNodes` | assembler 铸 `ChatSnapshot`。**headless** 无 GUI 投影 |
| 槽 `conversation.view` `id: chat` | ui-conversation 声明 list `conversation.view` | 本包 `ChatView` | `AppFrame` 中栏 session body。**base/headless** 无 `ctx.slots` |
| 槽 `conversation.chat.node` | keyed，本包声明 | `registerChatNodeRenderers` + 其它插件可加 key | ChatView 按 `node.kind` 选座 |
| 槽 `details` | layout 声明 single/session | **占用**：本包 `DetailsPanel` | `layout.openDetails`。子座 `conversation.details.tool` 给 ui-tool |
| `target('chat')` | `ConversationViewSnapshotMap['chat']` | `ChatSnapshotBuilder` | `useChat` / Details。空 = `EMPTY_CHAT_SNAPSHOT` |

## Sources

- packages/client/ui-chat/src/index.ts
- packages/client/ui-chat/src/chat-settings.ts
- packages/client/ui-chat/src/client/index.ts
- packages/client/ui-chat/src/client/apply.ts
- packages/client/ui-chat/src/client/stores.ts
- packages/client/ui-chat/src/client/transcript-view.ts
- packages/client/ui-chat/src/client/conversation-nodes/register.ts
- packages/client/ui-chat/src/client/conversation-nodes/common.ts
- packages/client/ui-chat/src/client/conversation-nodes/inbox.ts
- packages/client/ui-chat/src/client/conversation-nodes/message.ts
- packages/client/ui-chat/src/client/conversation-nodes/request-prompt.ts
- packages/client/ui-chat/src/client/conversation-nodes/assistant.ts
- packages/client/ui-chat/src/client/conversation-nodes/turn-process.ts
- packages/client/ui-chat/src/client/conversation-nodes/tool.ts
- packages/client/ui-chat/src/client/conversation-nodes/command.ts
- packages/client/ui-chat/src/client/conversation-nodes/compaction.ts
- packages/client/ui-chat/src/client/conversation-nodes/retry.ts
- packages/client/ui-chat/src/client/conversation-nodes/turn-error.ts
- packages/client/ui-chat/src/client/conversation-nodes/turn-max-tokens.ts
- packages/client/ui-chat/src/client/conversation-nodes/turn-tail.ts
- packages/client/ui-chat/src/client/conversation-nodes/fallback.ts
- packages/client/ui-chat/src/client/conversation-nodes/chat-snapshot-builder.ts
- packages/client/ui-chat/src/client/chat/register-node-renderers.ts
- packages/client/ui-chat/src/client/chat/ChatView.tsx
- packages/client/ui-chat/src/client/details/DetailsPanel.tsx
- packages/client/ui-chat/src/client/contract/chat-nodes.ts
- packages/client/ui-chat/src/client/contract/snapshot.ts
- packages/client/ui-chat/package.json
- packages/client/ui-chat/tests/conversation-node-definitions.client.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/client/ui-layout/src/client/index.ts
- packages/client/ui-conversation/src/client/apply.ts
- packages/client/ui-conversation/src/client/contract/conversation.ts
- packages/client/ui-conversation/src/client/conversation/event-registry.ts
- packages/client/ui-conversation/src/client/conversation/assembly.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 第一轮 `followup` 之后 GUI 投影进本页节点。
- [`subsys.client.ui-conversation`](ui-conversation.md) — assembler、composer、`ConversationNodeDefinition` 类型；本页是 Chat Consumer。
- [`subsys.client.runtime`](runtime.md) — `ctx.slots` / `ctx.sessions`。
- [`subsys.client.ui-slots`](ui-slots.md) — `register` 覆盖语义。
- [`subsys.client.ui-layout`](ui-layout.md) — 声明 `details`；本包占用。
- [`surface.web.workbench`](../../surface/web/workbench.md) — 工作台可见面。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web roster。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 插入 `id: ui-chat` 的 bundle。
