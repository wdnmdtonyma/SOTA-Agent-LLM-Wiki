---
id: clients.app-compatibility
title: App Legacy/Current Server 兼容层
kind: subsystem
tier: T2
v: na
source:
  - packages/app/V1_API_MIGRATION.md
  - packages/app/src/utils/server.ts
  - packages/app/src/utils/server-protocol.ts
  - packages/app/src/utils/server-protocol.test.ts
  - packages/app/src/utils/server-compat.ts
  - packages/app/src/context/server-sdk.tsx
  - packages/app/src/context/server-sync.tsx
  - packages/app/src/context/server-session.ts
  - packages/app/src/context/server-session-v2-reducer.ts
  - packages/app/src/utils/session-message.ts
  - packages/app/src/pages/session/timeline/message-timeline.tsx
  - packages/app/src/pages/session/timeline/projection.ts
  - packages/app/src/pages/session/timeline/rows.ts
  - packages/app/src/pages/session/timeline/rows-current.test.ts
  - packages/app/src/context/terminal.tsx
  - packages/app/src/components/terminal.tsx
  - packages/app/src/utils/terminal-websocket-url.ts
  - packages/app/src/utils/terminal-websocket-url.test.ts
  - packages/app/src/components/dialog-select-server.tsx
  - packages/app/src/app.tsx
  - packages/app/e2e/regression/session-timeline-transport.spec.ts
symbols:
  - ServerProtocol
  - detectServerProtocol
  - createCompatibleApi
  - adaptServerEvent
  - createV2SessionReducer
  - normalizeSessionMessages
  - createTimelineProjection
  - terminalWebSocketURL
related:
  - clients.app
  - server-api.overview
  - session-v2.projector
  - execution.pty
evidence: explicit
status: verified
updated: 7534d23551
---

> App 兼容层让同一套 UI 连接 legacy unprefixed API 或 current `/api/*` server。这里的 “V1” 特指 legacy server API，即使它由名为 `@opencode-ai/sdk/v2` 的生成客户端承载；“V2” 指 current API。[E: packages/app/V1_API_MIGRATION.md:3]

## 能回答的问题

- App 怎样区分 legacy/current server。
- 同一个调用面怎样映射到两套 API。
- current SSE event 怎样进入既有 UI store。
- current session messages 怎样投影成 legacy `Message`/`Part`，再组成 timeline rows。
- 哪些迁移边界仍未完成。

## 协议探测与 API 选择

`ServerProtocol` 只有 `"v1" | "v2"`。每个 probe 都要求成功的 JSON object，并有 5 秒超时。探测先请求 `/global/health`，得到 `{ healthy: true }` 就选 V1；否则请求 `/api/health`，numeric `pid` 选 V2，而 `{ healthy: true }` 仍按 V1 处理；两个 probe 都无法识别时默认 V2。两代 health 同时存在时，V1 probe 的优先级由测试固定。[E: packages/app/src/utils/server-protocol.ts:4][E: packages/app/src/utils/server-protocol.ts:13][E: packages/app/src/utils/server-protocol.ts:20][E: packages/app/src/utils/server-protocol.ts:24][E: packages/app/src/utils/server-protocol.ts:28][E: packages/app/src/utils/server-protocol.ts:31][E: packages/app/src/utils/server-protocol.ts:34][E: packages/app/src/utils/server-protocol.test.ts:10][E: packages/app/src/utils/server-protocol.test.ts:38]

每个 server SDK context 创建一次 protocol promise，并把解析后的状态暴露给 UI；它不是每个请求动态回退，也不是同时向两台 server 双写。[E: packages/app/src/context/server-sdk.tsx:208][E: packages/app/src/context/server-sdk.tsx:209][E: packages/app/src/context/server-sdk.tsx:349][I]

`createCompatibleApi()` 预先构造 legacy adapter，再用 lazy `Proxy` 等待 protocol：V1 选择 adapter，V2 直接选择 current API。Proxy 只把 current API 当作运行时 shape，并在第一次访问嵌套 namespace 时缓存代理；实际 method 调用仍等待协议结果。[E: packages/app/src/utils/server-compat.ts:86][E: packages/app/src/utils/server-compat.ts:87][E: packages/app/src/utils/server-compat.ts:88][E: packages/app/src/utils/server-compat.ts:89][E: packages/app/src/utils/server-compat.ts:94][E: packages/app/src/utils/server-compat.ts:100][E: packages/app/src/utils/server-compat.ts:109][E: packages/app/src/utils/server-compat.ts:119]

legacy adapter 先展开 current API，再只覆盖需要 legacy translation 的方法；所以它是 current-shaped hybrid façade，不是完整的 endpoint 等价层。覆盖包括 session list/create/get、abort、prompt、command、shell、compact、revert，以及 project/VCS/file/integration/PTY 等 namespace；未覆盖的方法在 V1 分支仍可能调用 server 已支持的 current endpoint。[E: packages/app/src/utils/server-compat.ts:136][E: packages/app/src/utils/server-compat.ts:137][E: packages/app/src/utils/server-compat.ts:139][E: packages/app/src/utils/server-compat.ts:140][E: packages/app/src/utils/server-compat.ts:163][E: packages/app/src/utils/server-compat.ts:197][E: packages/app/src/utils/server-compat.ts:241][E: packages/app/src/utils/server-compat.ts:267][E: packages/app/src/utils/server-compat.ts:301][E: packages/app/src/utils/server-compat.ts:333][E: packages/app/src/utils/server-compat.ts:360][E: packages/app/src/utils/server-compat.ts:378][E: packages/app/src/utils/server-compat.ts:452]

## Current event transport

V1 transport 订阅 `global.event()`，V2 transport 订阅 current `event.subscribe()`；两者被归一为 `{ directory, payload }` 并进入同一帧队列。current event 额外保留在 `ServerEvent.current`，permission/question event 同时适配成 legacy UI event shape。[E: packages/app/src/context/server-sdk.tsx:21][E: packages/app/src/context/server-sdk.tsx:28][E: packages/app/src/context/server-sdk.tsx:45][E: packages/app/src/context/server-sdk.tsx:48][E: packages/app/src/context/server-sdk.tsx:50][E: packages/app/src/context/server-sdk.tsx:56][E: packages/app/src/context/server-sdk.tsx:275][E: packages/app/src/context/server-sdk.tsx:277][E: packages/app/src/context/server-sdk.tsx:279][E: packages/app/src/context/server-sdk.tsx:283][E: packages/app/src/context/server-sdk.tsx:285][E: packages/app/src/context/server-sdk.tsx:286]

队列按约 16ms frame 批处理；相邻 current text/reasoning/tool-input/compaction delta 会按 session、assistant、ordinal/call ID 合并，legacy part delta 也有独立合并键。[E: packages/app/src/context/server-sdk.tsx:79][E: packages/app/src/context/server-sdk.tsx:82][E: packages/app/src/context/server-sdk.tsx:90][E: packages/app/src/context/server-sdk.tsx:94][E: packages/app/src/context/server-sdk.tsx:110][E: packages/app/src/context/server-sdk.tsx:118][E: packages/app/src/context/server-sdk.tsx:151][E: packages/app/src/context/server-sdk.tsx:218][E: packages/app/src/context/server-sdk.tsx:239][E: packages/app/src/context/server-sdk.tsx:241]

stream clean close或失败后会重连；current transport 被测试为 volatile，重连不会发送 `Last-Event-ID`，所以不能把这个客户端队列描述成 durable replay 或无损恢复。[E: packages/app/src/context/server-sdk.tsx:293][E: packages/app/src/context/server-sdk.tsx:307][E: packages/app/src/context/server-sdk.tsx:308][E: packages/app/e2e/regression/session-timeline-transport.spec.ts:66][E: packages/app/e2e/regression/session-timeline-transport.spec.ts:79][E: packages/app/e2e/regression/session-timeline-transport.spec.ts:92][E: packages/app/e2e/regression/session-timeline-transport.spec.ts:103]

## Session projection

`ServerSyncProvider` 为 session helper 同时传入 legacy client、compatible session/message API 和 protocol。收到 event 时，带 `current` 的 event 先走 `applyV2()`，随后仍走 legacy-shaped `apply()`，让 current reducer 与既有 UI store 共存。[E: packages/app/src/context/server-sync.tsx:227][E: packages/app/src/context/server-sync.tsx:228][E: packages/app/src/context/server-sync.tsx:527][E: packages/app/src/context/server-sync.tsx:534][E: packages/app/src/context/server-sync.tsx:535]

current server 的消息列表使用 cursor pagination；结果先保留为 `SessionMessageInfo[]` source，再由 `normalizeSessionMessages()` 投影成 legacy `Message[]` 与按 message ID 分组的 `Part[]`。V1 server 则继续使用 legacy `session.messages()` response。[E: packages/app/src/context/server-session.ts:540][E: packages/app/src/context/server-session.ts:541][E: packages/app/src/context/server-session.ts:545][E: packages/app/src/context/server-session.ts:549][E: packages/app/src/context/server-session.ts:555][E: packages/app/src/context/server-session.ts:556][E: packages/app/src/context/server-session.ts:562][E: packages/app/src/context/server-session.ts:569][E: packages/app/src/context/server-session.ts:571]

`createV2SessionReducer()` 把 granular current events归约为 `SessionMessageInfo[]`：覆盖 input admitted/promoted、agent/model switch、step、text/reasoning、tool、retry、execution 和 compaction 生命周期；缺失 promoted input 时返回 `missing`，上层再按 message ID 补水。[E: packages/app/src/context/server-session-v2-reducer.ts:14][E: packages/app/src/context/server-session-v2-reducer.ts:17][E: packages/app/src/context/server-session-v2-reducer.ts:28][E: packages/app/src/context/server-session-v2-reducer.ts:35][E: packages/app/src/context/server-session-v2-reducer.ts:118][E: packages/app/src/context/server-session-v2-reducer.ts:190][E: packages/app/src/context/server-session-v2-reducer.ts:241][E: packages/app/src/context/server-session-v2-reducer.ts:323][E: packages/app/src/context/server-session-v2-reducer.ts:335]

`projectV2()` 保存 current source，只重新投影 touched messages/parts，并通过 legacy `message.updated` / `message.part.updated` 形状喂给原 store；`applyV2()` 同时维护 session rename/move/usage 和 execution status。只有 reducer 报告缺失 promoted input 时，上层才按 message ID 做一次 hydrate，而且失败被静默忽略；这不是通用 event-gap recovery。[E: packages/app/src/context/server-session.ts:884][E: packages/app/src/context/server-session.ts:902][E: packages/app/src/context/server-session.ts:912][E: packages/app/src/context/server-session.ts:925][E: packages/app/src/context/server-session.ts:937][E: packages/app/src/context/server-session.ts:940][E: packages/app/src/context/server-session.ts:942][E: packages/app/src/context/server-session.ts:947][E: packages/app/src/context/server-session.ts:958][E: packages/app/src/context/server-session.ts:964]

## Timeline

`normalizeSessionMessages()` 维护当前 agent/model/parent 上下文，把 user、synthetic、shell、assistant 和 compaction source 转成 legacy messages/parts。[E: packages/app/src/utils/session-message.ts:40][E: packages/app/src/utils/session-message.ts:47][E: packages/app/src/utils/session-message.ts:56][E: packages/app/src/utils/session-message.ts:62][E: packages/app/src/utils/session-message.ts:75][E: packages/app/src/utils/session-message.ts:82][E: packages/app/src/utils/session-message.ts:99][E: packages/app/src/utils/session-message.ts:112]

`MessageTimeline` 同时读取 legacy message store 与 current `session_message` source。timeline projection 以 current source 的输入顺序建立 turns，再用 projected legacy messages/parts 渲染；shell 生成成对 user/assistant turn，孤立 assistant 会按 parent 查回 user，最后再附加尚未进入 current source 的 optimistic user messages。rows 本身不按 timestamp 或 durable sequence 重新排序。[E: packages/app/src/pages/session/timeline/message-timeline.tsx:279][E: packages/app/src/pages/session/timeline/message-timeline.tsx:291][E: packages/app/src/pages/session/timeline/projection.ts:32][E: packages/app/src/pages/session/timeline/projection.ts:40][E: packages/app/src/pages/session/timeline/rows.ts:35][E: packages/app/src/pages/session/timeline/rows.ts:44][E: packages/app/src/pages/session/timeline/rows.ts:62][E: packages/app/src/pages/session/timeline/rows.ts:75][E: packages/app/src/pages/session/timeline/rows-current.test.ts:17][E: packages/app/src/pages/session/timeline/rows-current.test.ts:162]

## Layout 边界

旧 layout 会拒绝新增或编辑 V2 server，server picker 也会过滤 V2；若当前正连 V2 且有 non-V2 替代，切回旧 layout 时会导航并切换 server。没有替代 server 时，代码不会强制断开当前 connection，因此这不是“旧 layout 绝不可能保持 V2 connection”的绝对保证。[E: packages/app/src/components/dialog-select-server.tsx:247][E: packages/app/src/components/dialog-select-server.tsx:268][E: packages/app/src/components/dialog-select-server.tsx:346][E: packages/app/src/components/dialog-select-server.tsx:365][E: packages/app/src/app.tsx:240][E: packages/app/src/app.tsx:256][E: packages/app/src/app.tsx:258]

## PTY transport

terminal workspace 的 create/update/remove 已按 detected protocol 显式分流：V1 直调 legacy `sdk.client.pty`；current 使用 `sdk.api.pty` 并携带 `location`。`sdk.api` 本身由 `createCompatibleApi()` 构造，在 current protocol 下解析到 current API；clone/new/update/remove 都采用这一外层分支。[E: packages/app/src/context/server-sdk.tsx:430][E: packages/app/src/context/server-sdk.tsx:432][E: packages/app/src/utils/server-compat.ts:89][E: packages/app/src/context/terminal.tsx:251][E: packages/app/src/context/terminal.tsx:252][E: packages/app/src/context/terminal.tsx:258][E: packages/app/src/context/terminal.tsx:260][E: packages/app/src/context/terminal.tsx:280][E: packages/app/src/context/terminal.tsx:281][E: packages/app/src/context/terminal.tsx:284][E: packages/app/src/context/terminal.tsx:285][E: packages/app/src/context/terminal.tsx:329][E: packages/app/src/context/terminal.tsx:330][E: packages/app/src/context/terminal.tsx:332][E: packages/app/src/context/terminal.tsx:437][E: packages/app/src/context/terminal.tsx:438][E: packages/app/src/context/terminal.tsx:439]

Terminal component 的 resize 同样分流：V1 调 legacy update，current 调 `api.pty.update` 并传 `location.directory`。[E: packages/app/src/components/terminal.tsx:244][E: packages/app/src/components/terminal.tsx:246][E: packages/app/src/components/terminal.tsx:255][E: packages/app/src/components/terminal.tsx:257] `gone()` 不是持续 liveness probe，而是 abnormal-close retry 前的检查：V1 以 get 的 404 判 gone；current 以 `status === "exited"` 或 `PtyNotFoundError` 判 gone。[E: packages/app/src/components/terminal.tsx:535][E: packages/app/src/components/terminal.tsx:538][E: packages/app/src/components/terminal.tsx:539][E: packages/app/src/components/terminal.tsx:545][E: packages/app/src/components/terminal.tsx:546][E: packages/app/src/components/terminal.tsx:547][E: packages/app/src/components/terminal.tsx:549][E: packages/app/src/components/terminal.tsx:585][E: packages/app/src/components/terminal.tsx:593][E: packages/app/src/components/terminal.tsx:683][E: packages/app/src/components/terminal.tsx:692]

`terminalWebSocketURL()` 对 V1 生成 `/pty/:id/connect?directory=...`，对 current 生成 `/api/pty/:id/connect?location[directory]=...`；两者都加 cursor，把 HTTP(S) 转成 WS(S)，ticket 存在时放进 query。测试分别固定 current ticketed route 与 V1 auth/query behavior。[E: packages/app/src/utils/terminal-websocket-url.ts:15][E: packages/app/src/utils/terminal-websocket-url.ts:16][E: packages/app/src/utils/terminal-websocket-url.ts:18][E: packages/app/src/utils/terminal-websocket-url.ts:20][E: packages/app/src/utils/terminal-websocket-url.ts:22][E: packages/app/src/utils/terminal-websocket-url.ts:23][E: packages/app/src/utils/terminal-websocket-url.ts:24][E: packages/app/src/utils/terminal-websocket-url.ts:25][E: packages/app/src/utils/terminal-websocket-url.test.ts:17][E: packages/app/src/utils/terminal-websocket-url.test.ts:18][E: packages/app/src/utils/terminal-websocket-url.test.ts:20][E: packages/app/src/utils/terminal-websocket-url.test.ts:39][E: packages/app/src/utils/terminal-websocket-url.test.ts:40][E: packages/app/src/utils/terminal-websocket-url.test.ts:41]

connect-token wiring 仍有迁移张力：active `connectToken()` 只在 protocol 为 V1 时调用 legacy endpoint；current path 会得到 `undefined` ticket。[E: packages/app/src/components/terminal.tsx:556][E: packages/app/src/components/terminal.tsx:558][I] `open()` 随后解析 protocol 并继续创建 WebSocket，把 optional ticket 传给 URL builder，没有 active no-ticket barrier。[E: packages/app/src/components/terminal.tsx:608][E: packages/app/src/components/terminal.tsx:612][E: packages/app/src/components/terminal.tsx:617][E: packages/app/src/components/terminal.tsx:624][I] 迁移 checklist 虽把 current connect-token 标为完成，但 App 源码不能证明 ticketless current handshake 能成功，也不能证明其预期 authorization contract；因此不能把 current ticket acquisition 写成 live behavior。[E: packages/app/V1_API_MIGRATION.md:193][U]

## 未完成边界

兼容层仍是迁移态，不应描述成 current API 已完全替换 legacy API。当前 checklist 明确保留 legacy session events/message events、sharing、file reads/list、部分 worktree 操作、global/directory config、credentials、LSP/reference events，以及 legacy message/type adapters。[E: packages/app/V1_API_MIGRATION.md:12][E: packages/app/V1_API_MIGRATION.md:17][E: packages/app/V1_API_MIGRATION.md:30][E: packages/app/V1_API_MIGRATION.md:70][E: packages/app/V1_API_MIGRATION.md:88][E: packages/app/V1_API_MIGRATION.md:105][E: packages/app/V1_API_MIGRATION.md:111][E: packages/app/V1_API_MIGRATION.md:129][E: packages/app/V1_API_MIGRATION.md:139][E: packages/app/V1_API_MIGRATION.md:174][E: packages/app/V1_API_MIGRATION.md:198]

## Sources

- packages/app/V1_API_MIGRATION.md
- packages/app/src/utils/server.ts
- packages/app/src/utils/server-protocol.ts
- packages/app/src/utils/server-protocol.test.ts
- packages/app/src/utils/server-compat.ts
- packages/app/src/context/server-sdk.tsx
- packages/app/src/context/server-sync.tsx
- packages/app/src/context/server-session.ts
- packages/app/src/context/server-session-v2-reducer.ts
- packages/app/src/utils/session-message.ts
- packages/app/src/pages/session/timeline/message-timeline.tsx
- packages/app/src/pages/session/timeline/projection.ts
- packages/app/src/pages/session/timeline/rows.ts
- packages/app/src/pages/session/timeline/rows-current.test.ts
- packages/app/src/context/terminal.tsx
- packages/app/src/components/terminal.tsx
- packages/app/src/utils/terminal-websocket-url.ts
- packages/app/src/utils/terminal-websocket-url.test.ts
- packages/app/src/components/dialog-select-server.tsx
- packages/app/src/app.tsx
- packages/app/e2e/regression/session-timeline-transport.spec.ts

## 相关

- [App UI shell](app.md)
- [Server API 总览](../../surface/server-api/overview.md)
- [Session projector](../session-v2/projector.md)
- [PTY subsystem](../execution/pty.md)
