---
id: tui.session-screen
title: Session(聊天)屏
kind: subsystem
tier: T2
v: na
source: [packages/tui/src/routes/session/index.tsx, packages/tui/src/context/data.tsx]
symbols: [Session, UserMessage, AssistantMessage]
related: [tui.sync-store, tui.prompt]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Session screen 是 `session` route 的聊天界面：它从 `SyncProvider` 读取 session/message/part/status/permission/question，渲染 scrollbox transcript、sidebar、permission/question prompts、subagent footer 和可被 plugin replace 的 prompt slot。

## 能回答的问题

- Session screen 进入时如何 hydrate session 和 messages？
- transcript 如何区分 user/assistant/reverted/queued messages？
- 哪些 session commands 在这里注册，哪些走 SDK？
- permission/question/subagent footer 如何与 prompt 互斥？
- sidebar 什么时候自动显示，移动端样式如何变化？

## 职责边界

`Session()` 使用 `useRouteData("session")` 读取当前 `sessionID`，用 `sync.session.get(route.sessionID)` 得到 session info，用 `sync.data.message[sessionID]` 和 `sync.data.part[message.id]` 渲染 transcript。[E: packages/tui/src/routes/session/index.tsx:184] [E: packages/tui/src/routes/session/index.tsx:194] [E: packages/tui/src/routes/session/index.tsx:207] [E: packages/tui/src/routes/session/index.tsx:1270]

这个 screen 是 V1 SDK-shaped transcript 的主消费方：`Session()` 使用 `useSync()`，并从 `sync.data.message`/`sync.data.part` 读取当前 transcript；`DataProvider` 的 V2 `SessionMessage[]` mirror 是独立 store，不在本组件的 transcript render path 中出现。[E: packages/tui/src/routes/session/index.tsx:186] [E: packages/tui/src/routes/session/index.tsx:207] [E: packages/tui/src/routes/session/index.tsx:1270] [E: packages/tui/src/context/data.tsx:37] [I]

## 数据模型

Session screen 的 local derived state 包括：

| 名称 | 来源 | 用途 |
|---|---|---|
| `children()` | `sync.data.session` filtered by `parentID` | parent/child session navigation 和 subagent tree。[E: packages/tui/src/routes/session/index.tsx:203] [E: packages/tui/src/routes/session/index.tsx:204] [E: packages/tui/src/routes/session/index.tsx:205] |
| `messages()` | `sync.data.message[route.sessionID] ?? []` | transcript 主数组。[E: packages/tui/src/routes/session/index.tsx:207] |
| `foregroundTasks()` | message parts 中 running `task` 且 `metadata.background !== true` | 决定 `session.background` command 是否 enabled。[E: packages/tui/src/routes/session/index.tsx:208] [E: packages/tui/src/routes/session/index.tsx:215] |
| `permissions()`/`questions()` | parent session 汇总 children 的 request arrays | permission/question prompt 阻塞输入。[E: packages/tui/src/routes/session/index.tsx:229] [E: packages/tui/src/routes/session/index.tsx:235] |
| `visible()`/`disabled()` | permissions/questions presence | prompt slot 显隐和 disabled 状态。[E: packages/tui/src/routes/session/index.tsx:237] [E: packages/tui/src/routes/session/index.tsx:238] |
| `sidebarVisible()` | parent/child、manual open、wide terminal、KV setting | 控制 sidebar inline 或 overlay。[E: packages/tui/src/routes/session/index.tsx:251] [E: packages/tui/src/routes/session/index.tsx:265] [E: packages/tui/src/routes/session/index.tsx:267] [E: packages/tui/src/routes/session/index.tsx:268] [E: packages/tui/src/routes/session/index.tsx:269] |

`context.Provider` 传给子 message renderers 的字段包括 width、sessionID、conceal/thinking/timestamp/tool-detail/generic-output toggles、userMessageIDs、diffWrapMode、provider index、sync 和 tui config。[E: packages/tui/src/routes/session/index.tsx:1149] [E: packages/tui/src/routes/session/index.tsx:1165]

## 进入 session 的控制流

1. route 变化后，effect 调 `sdk.client.session.get({ sessionID })`；如果 session 不存在则 toast error 并 `navigate({ type: "home" })`。[E: packages/tui/src/routes/session/index.tsx:281] [E: packages/tui/src/routes/session/index.tsx:285] [E: packages/tui/src/routes/session/index.tsx:287] [E: packages/tui/src/routes/session/index.tsx:292]
2. 如果 session 的 `workspaceID` 与当前 project workspace 不同，screen 设置 workspace 并调用 `sync.bootstrap({ fatal: false })`；session 可能显示但部分交互不可用是从 non-fatal bootstrap 行为推断出的 UI 后果。[E: packages/tui/src/routes/session/index.tsx:296] [E: packages/tui/src/routes/session/index.tsx:297] [E: packages/tui/src/routes/session/index.tsx:304] [I]
3. editor context 会 reconnect 到 session directory，然后 `sync.session.sync(sessionID)` hydrate session/messages/todo/diff；如果 route 仍指向该 session，就 scroll to bottom。[E: packages/tui/src/routes/session/index.tsx:307] [E: packages/tui/src/routes/session/index.tsx:308] [E: packages/tui/src/context/sync.tsx:584] [E: packages/tui/src/context/sync.tsx:586] [E: packages/tui/src/context/sync.tsx:587] [E: packages/tui/src/context/sync.tsx:588] [E: packages/tui/src/routes/session/index.tsx:309]
4. `message.part.updated` 事件中的 completed `plan_exit` 会把 local agent 切到 `build`，completed `plan_enter` 会切到 `plan`；`lastSwitch` 避免同一 part 重复切换。[E: packages/tui/src/routes/session/index.tsx:321] [E: packages/tui/src/routes/session/index.tsx:327] [E: packages/tui/src/routes/session/index.tsx:329] [E: packages/tui/src/routes/session/index.tsx:330] [E: packages/tui/src/routes/session/index.tsx:332] [E: packages/tui/src/routes/session/index.tsx:333]

## Transcript 渲染

Session screen 用 `<scrollbox stickyScroll stickyStart="bottom">` 承载 transcript，开启 scroll acceleration，scrollbar 是否可见来自 KV signal。[E: packages/tui/src/routes/session/index.tsx:260] [E: packages/tui/src/routes/session/index.tsx:1171] [E: packages/tui/src/routes/session/index.tsx:1178] [E: packages/tui/src/routes/session/index.tsx:1184] [E: packages/tui/src/routes/session/index.tsx:1185] [E: packages/tui/src/routes/session/index.tsx:1187] 每条 message 进入 `Switch`：revert boundary 显示“message reverted” block，reverted 之后的 messages 被隐藏，user message 渲染 `UserMessage`，assistant message 渲染 `AssistantMessage`。[E: packages/tui/src/routes/session/index.tsx:1192] [E: packages/tui/src/routes/session/index.tsx:1193] [E: packages/tui/src/routes/session/index.tsx:1227] [E: packages/tui/src/routes/session/index.tsx:1253] [E: packages/tui/src/routes/session/index.tsx:1256] [E: packages/tui/src/routes/session/index.tsx:1274]

`UserMessage` 从 parts 里只拼接 non-synthetic text parts，并把 file parts 以 MIME badge 展示；queued user message 会显示 `QUEUED`，普通 message 可按 timestamp toggle 显示时间。[E: packages/tui/src/routes/session/index.tsx:1373] [E: packages/tui/src/routes/session/index.tsx:1381] [E: packages/tui/src/routes/session/index.tsx:1383] [E: packages/tui/src/routes/session/index.tsx:1428] [E: packages/tui/src/routes/session/index.tsx:1449]

## Commands 与 SDK actions

Session screen 注册 `sessionCommandList()` 后映射成 keymap command entries，命名空间是 `palette`，slash name/alias 从 command shape 传入。[E: packages/tui/src/routes/session/index.tsx:460] [E: packages/tui/src/routes/session/index.tsx:1087] [E: packages/tui/src/routes/session/index.tsx:1090] [E: packages/tui/src/routes/session/index.tsx:1091] [E: packages/tui/src/routes/session/index.tsx:1096] [E: packages/tui/src/routes/session/index.tsx:1097]

代表性 SDK actions：

| Command | SDK/API | 说明 |
|---|---|---|
| `session.share` | `sdk.client.session.share` | 无 share URL 时先问 consent，再复制 URL。[E: packages/tui/src/routes/session/index.tsx:471] [E: packages/tui/src/routes/session/index.tsx:482] [E: packages/tui/src/routes/session/index.tsx:487] [E: packages/tui/src/routes/session/index.tsx:491] |
| `session.compact` | `sdk.client.session.summarize` | 需要当前 selected model，否则 toast warning。[E: packages/tui/src/routes/session/index.tsx:565] [E: packages/tui/src/routes/session/index.tsx:567] [E: packages/tui/src/routes/session/index.tsx:569] [E: packages/tui/src/routes/session/index.tsx:574] |
| `session.undo` | `sdk.client.session.abort` + `sdk.client.session.revert` | 非 idle 先 abort，再找最近 user message revert，并把 message parts 回填 prompt。[E: packages/tui/src/routes/session/index.tsx:613] [E: packages/tui/src/routes/session/index.tsx:614] [E: packages/tui/src/routes/session/index.tsx:616] [E: packages/tui/src/routes/session/index.tsx:618] [E: packages/tui/src/routes/session/index.tsx:627] |
| `session.redo` | `sdk.client.session.unrevert` 或 `sdk.client.session.revert` | 根据 `session.revert.messageID` 恢复或推进 redo。[E: packages/tui/src/routes/session/index.tsx:652] [E: packages/tui/src/routes/session/index.tsx:656] [E: packages/tui/src/routes/session/index.tsx:662] |
| `session.background` | `sdk.client.experimental.session.background` | 只在 foreground task 存在时启用。[E: packages/tui/src/routes/session/index.tsx:1021] [E: packages/tui/src/routes/session/index.tsx:1025] [E: packages/tui/src/routes/session/index.tsx:1027] |

Navigation commands 直接操控 scrollbox：page/line/half-page、first/last、last user message、next/previous visible message 都在本 screen 内完成。[E: packages/tui/src/routes/session/index.tsx:748] [E: packages/tui/src/routes/session/index.tsx:753] [E: packages/tui/src/routes/session/index.tsx:808] [E: packages/tui/src/routes/session/index.tsx:823] [E: packages/tui/src/routes/session/index.tsx:828] [E: packages/tui/src/routes/session/index.tsx:849] [E: packages/tui/src/routes/session/index.tsx:859] [E: packages/tui/src/routes/session/index.tsx:863]

## Prompt、permission、question、subagent footer

Footer area 先显示第一条 pending permission，再显示第一条 pending question；如果当前 session 是 child session，则显示 `SubagentFooter`；只有 `visible()` 为 true 时才渲染 `session_prompt` slot 和默认 `Prompt`。[E: packages/tui/src/routes/session/index.tsx:1285] [E: packages/tui/src/routes/session/index.tsx:1292] [E: packages/tui/src/routes/session/index.tsx:1298] [E: packages/tui/src/routes/session/index.tsx:1301]

Prompt 被 plugin slot 包裹，slot name 是 `session_prompt`，mode 是 `replace`，传入 `session_id`、`visible`、`disabled`、`on_submit` 和 `ref`；默认 child 是 `<Prompt sessionID={route.sessionID} right={<Slot name="session_prompt_right" ... />} />`。[E: packages/tui/src/routes/session/index.tsx:1302] [E: packages/tui/src/routes/session/index.tsx:1311] [E: packages/tui/src/routes/session/index.tsx:1319]

## Sidebar

`sidebarVisible()` 在 child session 时强制 false；在 user 手动 open 时 true；在 `sidebar === "auto"` 且 terminal width `> 120` 时 true。[E: packages/tui/src/routes/session/index.tsx:267] [E: packages/tui/src/routes/session/index.tsx:268] [E: packages/tui/src/routes/session/index.tsx:269] 宽屏直接渲染 `<Sidebar sessionID={route.sessionID} />`，窄屏以 absolute overlay 放在右侧并加半透明背景。[E: packages/tui/src/routes/session/index.tsx:1329] [E: packages/tui/src/routes/session/index.tsx:1330] [E: packages/tui/src/routes/session/index.tsx:1332] [E: packages/tui/src/routes/session/index.tsx:1333] [E: packages/tui/src/routes/session/index.tsx:1340] [E: packages/tui/src/routes/session/index.tsx:1342]

## 设计动机与权衡

Session screen 把 transcript scrollbox、blocking prompt footer、session commands、sidebar 都放在一个 route component 内，这让 message scrolling、prompt seeding、permission/question blocking 和 command side effects 可以共享同一批 local derived state。[I] 对 TUI 而言，message/part/state 来自 `SyncProvider` mirror；server/domain mutation 的代表性 command handlers 通过 SDK methods 发起，本地 UI 状态则通过 KV、project/local setters 修改。[E: packages/tui/src/routes/session/index.tsx:186] [E: packages/tui/src/routes/session/index.tsx:251] [E: packages/tui/src/routes/session/index.tsx:278] [E: packages/tui/src/routes/session/index.tsx:297] [E: packages/tui/src/routes/session/index.tsx:330] [E: specs/tui-package.md:370]

## Gotcha

- `visible()` 只在 parent/root session 且没有 pending permission/question 时为 true；因此“prompt disabled”和“prompt hidden”是两个不同状态，plugin `session_prompt` 也会收到这两个 props。[E: packages/tui/src/routes/session/index.tsx:237] [E: packages/tui/src/routes/session/index.tsx:238] [E: packages/tui/src/routes/session/index.tsx:1306] [E: packages/tui/src/routes/session/index.tsx:1307]
- `Session` route 进入时的 workspace bootstrap 是 non-fatal；这意味着 session 可以显示但相关 SDK actions 可能因 workspace unavailable 而被 prompt/dialog 拦截。[E: packages/tui/src/routes/session/index.tsx:304] [E: packages/tui/src/component/prompt/index.tsx:971] [I]

## Sources

- `packages/tui/src/routes/session/index.tsx`
- `packages/tui/src/context/sync.tsx`
- `packages/tui/src/context/data.tsx`
- `packages/tui/src/component/prompt/index.tsx`
- `specs/tui-package.md`

## 相关

- `tui.sync-store`：session/message/part mirror 和 hydration 细节。
- `tui.prompt`：默认 `Prompt` 组件的输入、autocomplete、history、submit 细节。
