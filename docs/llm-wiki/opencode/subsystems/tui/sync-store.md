---
id: tui.sync-store
title: TUI 服务端状态 Sync store
kind: subsystem
tier: T2
v: na
source: [packages/tui/src/context/sync.tsx, packages/tui/src/context/sdk.tsx, packages/tui/src/context/data.tsx]
symbols: [SDKProvider, EventSource, SyncProvider, useSync, DataProvider, useData]
related: [tui.architecture, sdk.overview]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> TUI Sync store 是 server state 的 reactive mirror：`SDKProvider` 把 HTTP/SSE 或 host event source 合成 `sdk.event`，`SyncProvider` 维护 V1 SDK-shaped state，`DataProvider` 维护 V2 `session.next.*`/location state。

## 能回答的问题

- TUI 如何创建 `@opencode-ai/sdk/v2` client？
- SDK global event stream 如何 16ms batching，避免 streaming 事件每条都 render？
- `SyncProvider` 的 central store 有哪些 top-level 字段？
- Bootstrap 分 blocking/non-blocking 两阶段的原因是什么？
- V1-style `SyncProvider` 和 V2-style `DataProvider` 如何并存？

## 职责边界

`SDKProvider` 创建 `createOpencodeClient`，传入 `baseUrl`、abort signal、directory、custom fetch 和 headers。[E: packages/tui/src/context/sdk.tsx:24] [E: packages/tui/src/context/sdk.tsx:25] [E: packages/tui/src/context/sdk.tsx:26] [E: packages/tui/src/context/sdk.tsx:27] [E: packages/tui/src/context/sdk.tsx:28] [E: packages/tui/src/context/sdk.tsx:29] 它对外暴露 `client` getter、`directory`、`event` emitter、effective `fetch` 和 `url`。[E: packages/tui/src/context/sdk.tsx:142] [E: packages/tui/src/context/sdk.tsx:145] [E: packages/tui/src/context/sdk.tsx:146] [E: packages/tui/src/context/sdk.tsx:147] [E: packages/tui/src/context/sdk.tsx:148]

`SyncProvider` 的 store 是 legacy/current TUI 消费面，字段包含 provider/default/auth、console_state、agent、command、permission、question、config、session、session_status、session_diff、todo、message、part、lsp、mcp、mcp_resource、formatter、vcs 等。[E: packages/tui/src/context/sync.tsx:62] [E: packages/tui/src/context/sync.tsx:106] `DataProvider` 是 V2 mirror，字段分成 `session.info/message/permission/question`、`project.permission`、`location` caches。[E: packages/tui/src/context/data.tsx:37] [E: packages/tui/src/context/data.tsx:47]

## SDK event stream

`SDKProvider` 接受可选 host `EventSource`，其 contract 是 `subscribe(handler) => Promise<unsubscribe>`。[E: packages/tui/src/context/sdk.tsx:8] 如果 host 没提供 event source，`SDKProvider` 在 `onMount` 的 fallback 分支启动自己的 SSE loop，调用 `sdk.global.event({ signal, sseMaxRetryAttempts: 0 })` 并读取 `events.stream`。[E: packages/tui/src/context/sdk.tsx:119] [E: packages/tui/src/context/sdk.tsx:130] [E: packages/tui/src/context/sdk.tsx:91] [E: packages/tui/src/context/sdk.tsx:102] 如果 `Flag.OPENCODE_EXPERIMENTAL_WORKSPACES` 开启，SSE/host event subscription 建立后会调用 `sdk.sync.start()` 启动 workspace sync。[E: packages/tui/src/context/sdk.tsx:96] [E: packages/tui/src/context/sdk.tsx:99] [E: packages/tui/src/context/sdk.tsx:124] [E: packages/tui/src/context/sdk.tsx:127]

事件不会立即逐条 emit：`handleEvent` 先 push 到 `queue`，如果距离上次 flush 小于 16ms，就 `setTimeout(flush, 16)`；`flush` 用 Solid `batch()` emit 队列里的所有 events，使多个 store 更新合成一次 render。[E: packages/tui/src/context/sdk.tsx:69] [E: packages/tui/src/context/sdk.tsx:70] [E: packages/tui/src/context/sdk.tsx:75] [E: packages/tui/src/context/sdk.tsx:76] [E: packages/tui/src/context/sdk.tsx:61] [E: packages/tui/src/context/sdk.tsx:63]

`context/event.ts` 会过滤 `payload.type === "sync"` 的 global event，只把普通 `Event` 交给 handler，并附带 `directory`/`workspace` metadata。[E: packages/tui/src/context/event.ts:12] [E: packages/tui/src/context/event.ts:14] [E: packages/tui/src/context/event.ts:18]

## SyncProvider 数据模型

`SyncProvider` 初始化状态为 `status: "loading"`；bootstrap 成功后先变 `partial`，non-blocking resources 完成后变 `complete`。[E: packages/tui/src/context/sync.tsx:118] [E: packages/tui/src/context/sync.tsx:501] [E: packages/tui/src/context/sync.tsx:520]

| Store 字段 | 说明 |
|---|---|
| `provider`, `provider_default`, `provider_next`, `provider_auth` | provider config/list/auth 方法。[E: packages/tui/src/context/sync.tsx:64] [E: packages/tui/src/context/sync.tsx:71] |
| `agent`, `command`, `config` | app agents、slash/server commands、server config。[E: packages/tui/src/context/sync.tsx:72] [E: packages/tui/src/context/sync.tsx:80] |
| `permission`, `question` | 以 `sessionID` 分组的 pending permission/question requests。[E: packages/tui/src/context/sync.tsx:74] [E: packages/tui/src/context/sync.tsx:78] |
| `session`, `message`, `part`, `todo`, `session_diff`, `session_status` | transcript/session screen 主数据。[E: packages/tui/src/context/sync.tsx:81] [E: packages/tui/src/context/sync.tsx:82] [E: packages/tui/src/context/sync.tsx:85] [E: packages/tui/src/context/sync.tsx:88] [E: packages/tui/src/context/sync.tsx:91] [E: packages/tui/src/context/sync.tsx:94] |
| `lsp`, `mcp`, `mcp_resource`, `formatter`, `vcs` | sidebar/status/feature plugin 数据源。[E: packages/tui/src/context/sync.tsx:97] [E: packages/tui/src/context/sync.tsx:105] |

`sessionListQuery()` 会在 session directory filter disabled 时只传 `{ scope: "project" }`；如果有 worktree+directory，则传相对 worktree 的 `path`，用于按当前 subdirectory 过滤 session list。[E: packages/tui/src/context/sync.tsx:153] [E: packages/tui/src/context/sync.tsx:154] [E: packages/tui/src/context/sync.tsx:156] [E: packages/tui/src/context/sync.tsx:157] [E: packages/tui/src/context/sync.tsx:158]

## SyncProvider event reducers

1. `server.instance.disposed` 会重新 `bootstrap()`，用于 worker/server reload 后刷新全局 mirror。[E: packages/tui/src/context/sync.tsx:168] [E: packages/tui/src/context/sync.tsx:171]
2. `permission.asked`/`permission.replied` 和 `question.asked`/`question.replied`/`question.rejected` 维护 per-session sorted-ish request arrays，使用 binary `search()` 按 request id 插入/替换/删除。[E: packages/tui/src/context/sync.tsx:40] [E: packages/tui/src/context/sync.tsx:188] [E: packages/tui/src/context/sync.tsx:210]
3. `todo.updated`、`session.diff`、`session.status` 直接更新对应 session map。[E: packages/tui/src/context/sync.tsx:249] [E: packages/tui/src/context/sync.tsx:253] [E: packages/tui/src/context/sync.tsx:300]
4. `session.updated` 按 session id 查找并 reconcile 或插入 `store.session`。[E: packages/tui/src/context/sync.tsx:269] [E: packages/tui/src/context/sync.tsx:271] [E: packages/tui/src/context/sync.tsx:277]
5. `message.updated` 会 touch hydrating tracker、insert/reconcile message，并把每个 session 的 visible messages 限制为最近 100 条；被 shift 掉的 oldest message 会删除对应 `part`。[E: packages/tui/src/context/sync.tsx:304] [E: packages/tui/src/context/sync.tsx:324] [E: packages/tui/src/context/sync.tsx:337]
6. `message.part.delta` 把 delta append 到目标 part 的动态 field；`message.part.updated`/`removed` 分别 reconcile/删除 part。[E: packages/tui/src/context/sync.tsx:381] [E: packages/tui/src/context/sync.tsx:394] [E: packages/tui/src/context/sync.tsx:359] [E: packages/tui/src/context/sync.tsx:368] [E: packages/tui/src/context/sync.tsx:400] [E: packages/tui/src/context/sync.tsx:409]
7. `lsp.updated` 触发 `sdk.client.lsp.status()` refresh；`vcs.branch.updated` 只在 event workspace 等于 current workspace 时更新 branch。[E: packages/tui/src/context/sync.tsx:416] [E: packages/tui/src/context/sync.tsx:422]

## Bootstrap 两阶段

`bootstrap()` 先同步 project path/current project，然后发起 session list promise。[E: packages/tui/src/context/sync.tsx:437] [E: packages/tui/src/context/sync.tsx:438] blocking phase 等 provider config、provider list、agents、config、project，以及 `--continue` 情况下的 session list；这些成功后 batch 写入 provider/agent/config/session 等关键数据。[E: packages/tui/src/context/sync.tsx:441] [E: packages/tui/src/context/sync.tsx:460] [E: packages/tui/src/context/sync.tsx:488] [E: packages/tui/src/context/sync.tsx:496]

blocking 成功后如果尚未 complete 就设为 `partial`，再并发加载 session list、console state、command、lsp、mcp、resource、formatter、session.status、provider.auth、vcs、workspace，全部完成后设 `complete`。[E: packages/tui/src/context/sync.tsx:500] [E: packages/tui/src/context/sync.tsx:503] [E: packages/tui/src/context/sync.tsx:520]

`sync.session.sync(sessionID)` 有 full-sync guard 和 in-flight promise map；它一次加载 session info、最近 100 条 messages、todo、diff，再用 hydrating tracker 避免 SSE 已到的新 message/part 被 hydration 旧数据覆盖。[E: packages/tui/src/context/sync.tsx:578] [E: packages/tui/src/context/sync.tsx:580] [E: packages/tui/src/context/sync.tsx:584] [E: packages/tui/src/context/sync.tsx:586] [E: packages/tui/src/context/sync.tsx:597] [E: packages/tui/src/context/sync.tsx:618] [E: packages/tui/src/context/sync.tsx:642]

## DataProvider(V2 mirror)

`DataProvider` 用 `LocationRef` 作为 location cache key，`locationKey(location)` 是 `JSON.stringify([directory, workspaceID])`。[E: packages/tui/src/context/data.tsx:50] [E: packages/tui/src/context/data.tsx:51] 它订阅 `session.next.*` events，把 agent/model switches、prompt promoted、context updated、synthetic、shell started/ended、step started/ended/failed、text/reasoning/tool streaming events 转成 `SessionMessage[]` mutable store。[E: packages/tui/src/context/data.tsx:124] [E: packages/tui/src/context/data.tsx:152] [E: packages/tui/src/context/data.tsx:167] [E: packages/tui/src/context/data.tsx:179] [E: packages/tui/src/context/data.tsx:189] [E: packages/tui/src/context/data.tsx:200] [E: packages/tui/src/context/data.tsx:212] [E: packages/tui/src/context/data.tsx:220] [E: packages/tui/src/context/data.tsx:236] [E: packages/tui/src/context/data.tsx:248] [E: packages/tui/src/context/data.tsx:257] [E: packages/tui/src/context/data.tsx:284] [E: packages/tui/src/context/data.tsx:336] [E: packages/tui/src/context/data.tsx:381]

V2 location data refreshers 走 generated SDK 的 `v2.*` namespaces：`v2.agent.list`、`v2.command.list`、`v2.integration.list`、`v2.model.list`、`v2.provider.list`、`v2.reference.list`、`v2.skill.list`。[E: packages/tui/src/context/data.tsx:506] [E: packages/tui/src/context/data.tsx:516] [E: packages/tui/src/context/data.tsx:521] [E: packages/tui/src/context/data.tsx:526] [E: packages/tui/src/context/data.tsx:539] [E: packages/tui/src/context/data.tsx:549] [E: packages/tui/src/context/data.tsx:559] [E: packages/tui/src/context/data.tsx:569] `onMount` 会 `Promise.allSettled` refresh default location 的这些 lists，并把 failures 只写 console。[E: packages/tui/src/context/data.tsx:577] [E: packages/tui/src/context/data.tsx:581]

## 设计动机与权衡

`specs/tui-package.md` 要求 SDK state/event synchronization 和 route/prompt/session views 迁入 `packages/tui`，并把 SDK 设为 domain boundary。[E: specs/tui-package.md:352] [E: specs/tui-package.md:353] [E: specs/tui-package.md:348] 当前实现把 HTTP/SSE/event-source transport 抽象进 `SDKProvider`，把 V1 和 V2 read models 都留在 TUI-local Solid stores；这符合“local-only UI state stays in TUI package”的迁移原则。[I] [E: packages/tui/src/context/sdk.tsx:11] [E: packages/tui/src/context/sync.tsx:53] [E: packages/tui/src/context/data.tsx:58] [E: specs/tui-package.md:363]

## Gotcha

- `SyncProvider` 与 `DataProvider` 不是互斥两代内核；当前 root 同时挂载二者，Session route 主要读 `SyncProvider`，autocomplete/V2 surfaces 可读 `DataProvider`。[E: packages/tui/src/app.tsx:296] [E: packages/tui/src/app.tsx:297] [E: packages/tui/src/routes/session/index.tsx:186] [E: packages/tui/src/component/prompt/autocomplete.tsx:88]
- `SDKProvider` 的 retry loop 自己做 exponential backoff，上限 30000ms；`sdk.global.event` 传 `sseMaxRetryAttempts: 0` 表示 provider-level retry 关闭，由 TUI loop 接管。[E: packages/tui/src/context/sdk.tsx:52] [E: packages/tui/src/context/sdk.tsx:93] [E: packages/tui/src/context/sdk.tsx:113]

## Sources

- `packages/tui/src/context/sdk.tsx`
- `packages/tui/src/context/event.ts`
- `packages/tui/src/context/sync.tsx`
- `packages/tui/src/context/data.tsx`
- `packages/tui/src/app.tsx`
- `packages/tui/src/routes/session/index.tsx`
- `packages/tui/src/component/prompt/autocomplete.tsx`
- `specs/tui-package.md`

## 相关

- `tui.architecture`：root provider stack 和 SDK boundary。
- `sdk.overview`：generated SDK/client 的更大上下文。
