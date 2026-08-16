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
updated: 3fd77ae980
---

> Session screen 是 `session` route 的聊天界面：它从 `SyncProvider` 读取 session/message/part/status/permission/question，渲染 scrollbox transcript、sidebar、permission/question prompts、subagent footer 和可被 plugin replace 的 prompt slot。

## 能回答的问题

- Session screen 进入时如何 hydrate session 和 messages？
- transcript 如何区分 user/assistant/reverted/queued messages？
- 哪些 session commands 在这里注册，哪些走 SDK？
- permission/question/subagent footer 如何与 prompt 互斥？
- sidebar 什么时候自动显示，移动端样式如何变化？

## 职责边界

`Session()` 使用 `useRouteData("session")` 读取当前 `sessionID`，用 `sync.session.get(route.sessionID)` 得到 session info，用 `sync.data.message[sessionID]` 和 `sync.data.part[message.id]` 渲染 transcript。[E: packages/tui/src/routes/session/index.tsx:186] [E: packages/tui/src/routes/session/index.tsx:196] [E: packages/tui/src/routes/session/index.tsx:213] [E: packages/tui/src/routes/session/index.tsx:1282]

这个 screen 是 V1 SDK-shaped transcript 的主消费方：`Session()` 使用 `useSync()`，并从 `sync.data.message`/`sync.data.part` 读取当前 transcript；`DataProvider` 的 V2 `SessionMessage[]` mirror 是独立 store，不在本组件的 transcript render path 中出现。[E: packages/tui/src/routes/session/index.tsx:188] [E: packages/tui/src/routes/session/index.tsx:213] [E: packages/tui/src/routes/session/index.tsx:1282] [E: packages/tui/src/context/data.tsx:37] [I]

## 数据模型

Session screen 的 local derived state 包括：

| 名称 | 来源 | 用途 |
|---|---|---|
| `children()` | `sync.data.session` filtered by `parentID` | parent/child session navigation 和 subagent tree。[E: packages/tui/src/routes/session/index.tsx:209] [E: packages/tui/src/routes/session/index.tsx:210] [E: packages/tui/src/routes/session/index.tsx:211] |
| `messages()` | `sync.data.message[route.sessionID] ?? []` | transcript 主数组。session screen 不再本地重排；顺序由 `SyncProvider` 按 `time.created`（并列比 id）维护。[E: packages/tui/src/routes/session/index.tsx:213] [E: packages/tui/src/context/sync.tsx:54] [E: packages/tui/src/context/sync.tsx:58] |
| `foregroundTasks()` | message parts 中 running `task` 且 `metadata.background !== true` | 决定 `session.background` command 是否 enabled。[E: packages/tui/src/routes/session/index.tsx:220] [E: packages/tui/src/routes/session/index.tsx:227] |
| `permissions()`/`questions()` | parent session 汇总 children 的 request arrays | permission/question prompt 阻塞输入。[E: packages/tui/src/routes/session/index.tsx:233] [E: packages/tui/src/routes/session/index.tsx:239] |
| `visible()`/`disabled()` | permissions/questions presence | prompt slot 显隐和 disabled 状态。[E: packages/tui/src/routes/session/index.tsx:241] [E: packages/tui/src/routes/session/index.tsx:242] |
| `sidebarVisible()` | parent/child、manual open、wide terminal、KV setting | 控制 sidebar inline 或 overlay。[E: packages/tui/src/routes/session/index.tsx:257] [E: packages/tui/src/routes/session/index.tsx:271] [E: packages/tui/src/routes/session/index.tsx:273] [E: packages/tui/src/routes/session/index.tsx:274] [E: packages/tui/src/routes/session/index.tsx:275] |

`context.Provider` 传给子 message renderers 的字段包括 width、sessionID、conceal/thinking/timestamp/tool-detail/generic-output toggles、userMessageIDs、diffWrapMode、provider index、sync 和 tui config。[E: packages/tui/src/routes/session/index.tsx:1160] [E: packages/tui/src/routes/session/index.tsx:1175]

## 进入 session 的控制流

1. route 变化后，effect 调 `sdk.client.session.get({ sessionID })`；如果 session 不存在则 toast error 并 `navigate({ type: "home" })`。[E: packages/tui/src/routes/session/index.tsx:287] [E: packages/tui/src/routes/session/index.tsx:291] [E: packages/tui/src/routes/session/index.tsx:293] [E: packages/tui/src/routes/session/index.tsx:298]
2. 如果 session 的 `workspaceID` 与当前 project workspace 不同，screen 设置 workspace 并调用 `sync.bootstrap({ fatal: false })`；session 可能显示但部分交互不可用是从 non-fatal bootstrap 行为推断出的 UI 后果。[E: packages/tui/src/routes/session/index.tsx:302] [E: packages/tui/src/routes/session/index.tsx:303] [E: packages/tui/src/routes/session/index.tsx:310] [I]
3. editor context 会 reconnect 到 session directory，然后 `sync.session.sync(sessionID)` hydrate session/messages/todo/diff；如果 route 仍指向该 session，就 scroll to bottom。[E: packages/tui/src/routes/session/index.tsx:313] [E: packages/tui/src/routes/session/index.tsx:314] [E: packages/tui/src/context/sync.tsx:601] [E: packages/tui/src/context/sync.tsx:603] [E: packages/tui/src/context/sync.tsx:604] [E: packages/tui/src/context/sync.tsx:605] [E: packages/tui/src/routes/session/index.tsx:315]
4. `message.part.updated` 事件中的 completed `plan_exit` 会把 local agent 切到 `build`，completed `plan_enter` 会切到 `plan`；`lastSwitch` 避免同一 part 重复切换。[E: packages/tui/src/routes/session/index.tsx:327] [E: packages/tui/src/routes/session/index.tsx:333] [E: packages/tui/src/routes/session/index.tsx:335] [E: packages/tui/src/routes/session/index.tsx:336] [E: packages/tui/src/routes/session/index.tsx:338] [E: packages/tui/src/routes/session/index.tsx:339]

## Transcript 渲染

Session screen 用 `<scrollbox stickyScroll stickyStart="bottom">` 承载 transcript，开启 scroll acceleration，scrollbar 是否可见来自 KV signal。[E: packages/tui/src/routes/session/index.tsx:266] [E: packages/tui/src/routes/session/index.tsx:1181] [E: packages/tui/src/routes/session/index.tsx:1188] [E: packages/tui/src/routes/session/index.tsx:1194] [E: packages/tui/src/routes/session/index.tsx:1195] [E: packages/tui/src/routes/session/index.tsx:1197] 每条 message 进入 `Switch`：revert boundary 显示“message reverted” block，reverted 之后的 messages 被隐藏，user message 渲染 `UserMessage`，assistant message 渲染 `AssistantMessage`。[E: packages/tui/src/routes/session/index.tsx:1202] [E: packages/tui/src/routes/session/index.tsx:1203] [E: packages/tui/src/routes/session/index.tsx:1237] [E: packages/tui/src/routes/session/index.tsx:1263] [E: packages/tui/src/routes/session/index.tsx:1268] [E: packages/tui/src/routes/session/index.tsx:1286]

`UserMessage` 从 parts 里只拼接 non-synthetic text parts，并把 file parts 以 MIME badge 展示；queued user message 会显示 `QUEUED`，普通 message 可按 timestamp toggle 显示时间。[E: packages/tui/src/routes/session/index.tsx:1375] [E: packages/tui/src/routes/session/index.tsx:1383] [E: packages/tui/src/routes/session/index.tsx:1385] [E: packages/tui/src/routes/session/index.tsx:1427] [E: packages/tui/src/routes/session/index.tsx:1450]

## Commands 与 SDK actions

Session screen 注册 `sessionCommandList()` 后映射成 keymap command entries，命名空间是 `palette`，slash name/alias 从 command shape 传入。[E: packages/tui/src/routes/session/index.tsx:466] [E: packages/tui/src/routes/session/index.tsx:1089] [E: packages/tui/src/routes/session/index.tsx:1092] [E: packages/tui/src/routes/session/index.tsx:1093] [E: packages/tui/src/routes/session/index.tsx:1098] [E: packages/tui/src/routes/session/index.tsx:1099]

代表性 SDK actions：

| Command | SDK/API | 说明 |
|---|---|---|
| `session.share` | `sdk.client.session.share` | 无 share URL 时先问 consent，再复制 URL。[E: packages/tui/src/routes/session/index.tsx:477] [E: packages/tui/src/routes/session/index.tsx:488] [E: packages/tui/src/routes/session/index.tsx:493] [E: packages/tui/src/routes/session/index.tsx:497] |
| `session.compact` | `sdk.client.session.summarize` | 需要当前 selected model，否则 toast warning。[E: packages/tui/src/routes/session/index.tsx:571] [E: packages/tui/src/routes/session/index.tsx:573] [E: packages/tui/src/routes/session/index.tsx:575] [E: packages/tui/src/routes/session/index.tsx:580] |
| `session.undo` | `sdk.client.session.abort` + `sdk.client.session.revert` | 非 idle 先 abort，再找最近 user message revert，并把 message parts 回填 prompt。[E: packages/tui/src/routes/session/index.tsx:612] [E: packages/tui/src/routes/session/index.tsx:618] [E: packages/tui/src/routes/session/index.tsx:620] [E: packages/tui/src/routes/session/index.tsx:621] [E: packages/tui/src/routes/session/index.tsx:624] |
| `session.redo` | `sdk.client.session.unrevert` 或 `sdk.client.session.revert` | 根据 `session.revert.messageID` 恢复或推进 redo。[E: packages/tui/src/routes/session/index.tsx:657] [E: packages/tui/src/routes/session/index.tsx:661] [E: packages/tui/src/routes/session/index.tsx:667] |
| `session.background` | `sdk.client.experimental.session.background` | 只在 foreground task 存在时启用。[E: packages/tui/src/routes/session/index.tsx:1023] [E: packages/tui/src/routes/session/index.tsx:1027] [E: packages/tui/src/routes/session/index.tsx:1029] |

Navigation commands 直接操控 scrollbox：page/line/half-page、first/last、last user message、next/previous visible message 都在本 screen 内完成。[E: packages/tui/src/routes/session/index.tsx:753] [E: packages/tui/src/routes/session/index.tsx:758] [E: packages/tui/src/routes/session/index.tsx:813] [E: packages/tui/src/routes/session/index.tsx:828] [E: packages/tui/src/routes/session/index.tsx:833] [E: packages/tui/src/routes/session/index.tsx:854] [E: packages/tui/src/routes/session/index.tsx:864] [E: packages/tui/src/routes/session/index.tsx:868]

## Prompt、permission、question、subagent footer

Footer area 先显示第一条 pending permission，再显示第一条 pending question；如果当前 session 是 child session，则显示 `SubagentFooter`；只有 `visible()` 为 true 时才渲染 `session_prompt` slot 和默认 `Prompt`。[E: packages/tui/src/routes/session/index.tsx:1297] [E: packages/tui/src/routes/session/index.tsx:1304] [E: packages/tui/src/routes/session/index.tsx:1310] [E: packages/tui/src/routes/session/index.tsx:1313]

Prompt 被 plugin slot 包裹，slot name 是 `session_prompt`，mode 是 `replace`，传入 `session_id`、`visible`、`disabled`、`on_submit` 和 `ref`；默认 child 是 `<Prompt sessionID={route.sessionID} right={<Slot name="session_prompt_right" ... />} />`。[E: packages/tui/src/routes/session/index.tsx:1314] [E: packages/tui/src/routes/session/index.tsx:1323] [E: packages/tui/src/routes/session/index.tsx:1331]

## Sidebar

`sidebarVisible()` 在 child session 时强制 false；在 user 手动 open 时 true；在 `sidebar === "auto"` 且 terminal width `> 120` 时 true。[E: packages/tui/src/routes/session/index.tsx:273] [E: packages/tui/src/routes/session/index.tsx:274] [E: packages/tui/src/routes/session/index.tsx:275] 宽屏直接渲染 `<Sidebar sessionID={route.sessionID} />`，窄屏以 absolute overlay 放在右侧并加半透明背景。[E: packages/tui/src/routes/session/index.tsx:1341] [E: packages/tui/src/routes/session/index.tsx:1342] [E: packages/tui/src/routes/session/index.tsx:1344] [E: packages/tui/src/routes/session/index.tsx:1345] [E: packages/tui/src/routes/session/index.tsx:1352] [E: packages/tui/src/routes/session/index.tsx:1354]

## 设计动机与权衡

Session screen 把 transcript scrollbox、blocking prompt footer、session commands、sidebar 都放在一个 route component 内，这让 message scrolling、prompt seeding、permission/question blocking 和 command side effects 可以共享同一批 local derived state。[I] 对 TUI 而言，message/part/state 来自 `SyncProvider` mirror；server/domain mutation 的代表性 command handlers 通过 SDK methods 发起，本地 UI 状态则通过 KV、project/local setters 修改。[E: packages/tui/src/routes/session/index.tsx:188] [E: packages/tui/src/routes/session/index.tsx:257] [E: packages/tui/src/routes/session/index.tsx:284] [E: packages/tui/src/routes/session/index.tsx:303] [E: packages/tui/src/routes/session/index.tsx:336] [E: specs/tui-package.md:370]

## Gotcha

- `visible()` 只在 parent/root session 且没有 pending permission/question 时为 true；因此“prompt disabled”和“prompt hidden”是两个不同状态，plugin `session_prompt` 也会收到这两个 props。[E: packages/tui/src/routes/session/index.tsx:241] [E: packages/tui/src/routes/session/index.tsx:242] [E: packages/tui/src/routes/session/index.tsx:1318] [E: packages/tui/src/routes/session/index.tsx:1319]
- `Session` route 进入时的 workspace bootstrap 是 non-fatal；这意味着 session 可以显示但相关 SDK actions 可能因 workspace unavailable 而被 prompt/dialog 拦截。[E: packages/tui/src/routes/session/index.tsx:310] [E: packages/tui/src/component/prompt/index.tsx:977] [I]

## Sources

- `packages/tui/src/routes/session/index.tsx`
- `packages/tui/src/context/sync.tsx`
- `packages/tui/src/context/data.tsx`
- `packages/tui/src/component/prompt/index.tsx`
- `specs/tui-package.md`

## 相关

- `tui.sync-store`：session/message/part mirror 和 hydration 细节。
- `tui.prompt`：默认 `Prompt` 组件的输入、autocomplete、history、submit 细节。
