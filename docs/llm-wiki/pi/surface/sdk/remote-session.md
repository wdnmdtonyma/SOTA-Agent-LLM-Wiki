---
id: surface.sdk.remote-session
title: RemoteSession 远程会话客户端
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/package.json
  - packages/coding-agent/src/client/index.ts
  - packages/coding-agent/src/client/remote-session.ts
  - packages/coding-agent/src/client/transcript.ts
symbols:
  - RemoteSession
  - RemoteSessionState
  - RemoteSessionLifecycle
  - applyTranscriptSnapshot
  - applyTranscriptProgress
  - selectTranscript
related:
  - surface.sdk.embedding
  - surface.modes.rpc
  - subsys.server.message-protocol
evidence: explicit
status: verified
updated: a8ee03b815
---

> `surface.sdk.remote-session` 描述 `@earendil-works/pi-coding-agent/client` 的 public client facade：它在 `PiClient`/protocol lease 上封装单个远程 session 的 attach、input、model/thinking control、reconnect、transcript reduction 与 disposal。

## 能回答的问题

- coding-agent 的远程 session SDK 从哪个 package subpath 导入？
- `RemoteSession` 能 open/create/submit/abort 哪些操作，何时拒绝并发或非 idle mutation？
- snapshot 与 streaming progress 如何合并成调用方可直接渲染的 transcript？
- reconnect、session removal 与 dispose 如何改变 lifecycle 和 attachment？

## Public export 与状态面

package manifest 把 `./client` 映射到 `dist/client/index.js` 与对应 declaration，并显式依赖 `pi-client`、`pi-protocol`;这与主包 `.` 和 `./rpc-entry` 是并列 public subpath [E: packages/coding-agent/package.json:14] [E: packages/coding-agent/package.json:19] [E: packages/coding-agent/package.json:22] [E: packages/coding-agent/package.json:23] [E: packages/coding-agent/package.json:24] [E: packages/coding-agent/package.json:48] [E: packages/coding-agent/package.json:49]。client index 导出 `RemoteSession`、options/state/lifecycle types 和 transcript reducer helpers [E: packages/coding-agent/src/client/index.ts:1] [E: packages/coding-agent/src/client/index.ts:8] [E: packages/coding-agent/src/client/index.ts:9] [E: packages/coding-agent/src/client/index.ts:15]。

`RemoteSessionLifecycle` 有 `unbound`、`ready`、携带 operation 的 `busy`、`disposed` 四态；operation union 是 `open/create/submit/abort/setModel/setThinking/reconnect` [E: packages/coding-agent/src/client/remote-session.ts:26] [E: packages/coding-agent/src/client/remote-session.ts:28] [E: packages/coding-agent/src/client/remote-session.ts:32]。public state 同时暴露 lifecycle、optional snapshot 和 reduced transcript；另外 getters 可直接读取 id、phase、current operation、server models/sessions 与 connection state [E: packages/coding-agent/src/client/remote-session.ts:34] [E: packages/coding-agent/src/client/remote-session.ts:37] [E: packages/coding-agent/src/client/remote-session.ts:88] [E: packages/coding-agent/src/client/remote-session.ts:104] [E: packages/coding-agent/src/client/remote-session.ts:108] [E: packages/coding-agent/src/client/remote-session.ts:112] [E: packages/coding-agent/src/client/remote-session.ts:116] [E: packages/coding-agent/src/client/remote-session.ts:120]。

`subscribe()` 会先注册 listener 并立即用 current state 回调；listener error 交给 optional `onListenerError`,而 diagnostics callback 自己的异常也不会影响 session/transport state [E: packages/coding-agent/src/client/remote-session.ts:128] [E: packages/coding-agent/src/client/remote-session.ts:131] [E: packages/coding-agent/src/client/remote-session.ts:371] [E: packages/coding-agent/src/client/remote-session.ts:375] [E: packages/coding-agent/src/client/remote-session.ts:379] [E: packages/coding-agent/src/client/remote-session.ts:382]。

## Attachment 与命令语义

`open()` 通过 `PiClient.acquireSession(sessionId, { mode: "exclusive" })` 获取 lease；`create()` 则把 cwd、optional model/thinking level 交给 `PiClient.createSession()` [E: packages/coding-agent/src/client/remote-session.ts:140] [E: packages/coding-agent/src/client/remote-session.ts:151] [E: packages/coding-agent/src/client/remote-session.ts:153] [E: packages/coding-agent/src/client/remote-session.ts:156] [E: packages/coding-agent/src/client/remote-session.ts:171] [E: packages/coding-agent/src/client/remote-session.ts:172]。替换 attachment 前要求当前 session idle；新 lease 必须先有 snapshot，旧 lease detach 失败时会清理新 lease，成功后才 bind 新 handle [E: packages/coding-agent/src/client/remote-session.ts:246] [E: packages/coding-agent/src/client/remote-session.ts:248] [E: packages/coding-agent/src/client/remote-session.ts:266] [E: packages/coding-agent/src/client/remote-session.ts:270] [E: packages/coding-agent/src/client/remote-session.ts:275] [E: packages/coding-agent/src/client/remote-session.ts:279] [E: packages/coding-agent/src/client/remote-session.ts:292]。

`submit(text)` trim 后忽略空输入，只允许 server phase 为 `idle` 或 `turn`;idle 用 `prompt()`,turn 用 `steer()` [E: packages/coding-agent/src/client/remote-session.ts:175] [E: packages/coding-agent/src/client/remote-session.ts:177] [E: packages/coding-agent/src/client/remote-session.ts:180] [E: packages/coding-agent/src/client/remote-session.ts:183] [E: packages/coding-agent/src/client/remote-session.ts:184]。`abort()` 是唯一可 preempt 正在进行的 submit 的 operation；idle 且没有 submit 时是 no-op [E: packages/coding-agent/src/client/remote-session.ts:188] [E: packages/coding-agent/src/client/remote-session.ts:190] [E: packages/coding-agent/src/client/remote-session.ts:193] [E: packages/coding-agent/src/client/remote-session.ts:194]。`setModel()` 与 `setThinking()` 只在 phase idle 时允许 [E: packages/coding-agent/src/client/remote-session.ts:197] [E: packages/coding-agent/src/client/remote-session.ts:205] [E: packages/coding-agent/src/client/remote-session.ts:295] [E: packages/coding-agent/src/client/remote-session.ts:302] [E: packages/coding-agent/src/client/remote-session.ts:305]。

同一时间普通 operation 必须独占 busy state；`#runOperation()` 用 dispose signal 与实际 operation 竞速，结束时只在当前 busy marker 仍有效且未 disposed 时恢复 `ready`/`unbound` [E: packages/coding-agent/src/client/remote-session.ts:308] [E: packages/coding-agent/src/client/remote-session.ts:310] [E: packages/coding-agent/src/client/remote-session.ts:312] [E: packages/coding-agent/src/client/remote-session.ts:318] [E: packages/coding-agent/src/client/remote-session.ts:320] [E: packages/coding-agent/src/client/remote-session.ts:326] [E: packages/coding-agent/src/client/remote-session.ts:333]。

## Transcript reducer

`TranscriptState` 保存 latest snapshot、progress item map/order 和每个 tool call content part 的 JSON fragment buffer [E: packages/coding-agent/src/client/transcript.ts:3] [E: packages/coding-agent/src/client/transcript.ts:7]。同一 session 的旧 revision snapshot 会被忽略，接受新 snapshot 时会清空 progress overlay [E: packages/coding-agent/src/client/transcript.ts:37] [E: packages/coding-agent/src/client/transcript.ts:39]。

progress 的 started/updated/finished 事件更新 overlay；finished 同时清理该 item 的 tool buffers。delta 只应用到已存在的 assistant item，text/thinking 直接 append，tool-call input 则累积字符串，形成合法 JSON 后转成 JSON value，否则保留 raw prefix [E: packages/coding-agent/src/client/transcript.ts:42] [E: packages/coding-agent/src/client/transcript.ts:46] [E: packages/coding-agent/src/client/transcript.ts:49] [E: packages/coding-agent/src/client/transcript.ts:54] [E: packages/coding-agent/src/client/transcript.ts:57] [E: packages/coding-agent/src/client/transcript.ts:61] [E: packages/coding-agent/src/client/transcript.ts:65] [E: packages/coding-agent/src/client/transcript.ts:70] [E: packages/coding-agent/src/client/transcript.ts:18] [E: packages/coding-agent/src/client/transcript.ts:25]。

`selectTranscript()` 先用 progress item 覆盖 snapshot 同 id item，再按首次 progress order 追加新 item，最后追加尚未出现的 `queuedSteer`;id set 防止重复 [E: packages/coding-agent/src/client/transcript.ts:77] [E: packages/coding-agent/src/client/transcript.ts:80] [E: packages/coding-agent/src/client/transcript.ts:88] [E: packages/coding-agent/src/client/transcript.ts:88] [E: packages/coding-agent/src/client/transcript.ts:93]。

## Reconnect、移除与清理

`reconnect()` 先让底层 client reconnect，再以 exclusive mode 重新获取同一 session id 并 bind 新 lease [E: packages/coding-agent/src/client/remote-session.ts:213] [E: packages/coding-agent/src/client/remote-session.ts:218] [E: packages/coding-agent/src/client/remote-session.ts:219] [E: packages/coding-agent/src/client/remote-session.ts:221]。bind 同时订阅 snapshot 和 server event；`session_progress` 进入 transcript reducer，而 `session_removed` 会清空 subscriptions、handle、transcript 并回到 `unbound` [E: packages/coding-agent/src/client/remote-session.ts:338] [E: packages/coding-agent/src/client/remote-session.ts:344] [E: packages/coding-agent/src/client/remote-session.ts:349] [E: packages/coding-agent/src/client/remote-session.ts:352] [E: packages/coding-agent/src/client/remote-session.ts:357] [E: packages/coding-agent/src/client/remote-session.ts:361] [E: packages/coding-agent/src/client/remote-session.ts:363]。

`dispose()` 幂等缓存 promise，先同步标记 disposed、触发 dispose signal、清 subscription/state，再等待 pending attachment operations 与 lease dispose；多个 cleanup error 会聚合为 `AggregateError` [E: packages/coding-agent/src/client/remote-session.ts:226] [E: packages/coding-agent/src/client/remote-session.ts:229] [E: packages/coding-agent/src/client/remote-session.ts:230] [E: packages/coding-agent/src/client/remote-session.ts:231] [E: packages/coding-agent/src/client/remote-session.ts:234] [E: packages/coding-agent/src/client/remote-session.ts:236] [E: packages/coding-agent/src/client/remote-session.ts:57] [E: packages/coding-agent/src/client/remote-session.ts:63]。

## Gotcha

- `RemoteSession` 是基于 `PiClient`/server protocol 的 remote facade，不等同于主入口导出的 local `AgentSession`;前者通过 `./client` subpath 导入并持有 exclusive lease [E: packages/coding-agent/package.json:22] [E: packages/coding-agent/src/client/remote-session.ts:66] [E: packages/coding-agent/src/client/remote-session.ts:153] [I]。
- transcript reducer 是 server snapshot/progress 的 client-side view；它不写 coding-agent JSONL session file，也不自行执行 model/provider 请求 [I]。

## Sources

- packages/coding-agent/package.json
- packages/coding-agent/src/client/index.ts
- packages/coding-agent/src/client/remote-session.ts
- packages/coding-agent/src/client/transcript.ts

## 相关

- [surface.sdk.embedding](embedding.md): local `AgentSession` embedding API 与 runtime factory。
- [surface.modes.rpc](../modes/rpc.md): coding-agent stdin/stdout RPC mode。
- [subsys.server.message-protocol](../../subsystems/server/message-protocol.md): server snapshot、progress 与 command protocol。
