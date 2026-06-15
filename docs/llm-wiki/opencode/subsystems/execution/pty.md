---
id: execution.pty
title: PTY 子系统(V2)
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/pty/
  - packages/core/src/pty.ts
  - packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts
  - packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts
  - packages/opencode/src/pty-preparation.ts
  - packages/opencode/src/server/shared/pty-ticket.ts
symbols:
  - Pty.Service
  - PtyTicket.Service
  - Pty.Info
  - handlePtyInput
  - PtyApi
  - PtyConnectApi
related:
  - server-api.v1-routes
  - tui.run-scrollback
evidence: explicit
status: verified
updated: 92c70c9c3
---

> PTY 子系统是 V2 Location-scoped pseudo-terminal service：core 用 `#pty` 适配 bun-pty/node-pty，维护进程内 session/buffer/subscribers；V1 Effect HttpApi instance routes 暴露 `/pty/*` JSON endpoint 和 `/pty/:ptyID/connect` WebSocket，并用短期 connect ticket 保护 browser WS 连接。

## 能回答的问题

- PTY 为什么标 V2，但 HTTP route 在 `packages/opencode/src/server`？
- bun 与 node runtime 分别用哪个 pty backend？
- connect ticket 的 TTL、scope、consume 语义是什么？
- WebSocket cursor、buffer、metadata frame 如何工作？
- PTY create 的 shell/env/cwd 是在哪里准备的？

## 职责边界

`Pty.Service` 的 service tag 是 `@opencode/v2/Pty`，并作为 `locationLayer` 提供 [E: packages/core/src/pty.ts:117] [E: packages/core/src/pty.ts:309]。它的内存状态是 `sessions = new Map<PtyID, Active>()`，Active 包含 `process`、`buffer`、`cursor`、`subscribers`、`listeners` [E: packages/core/src/pty.ts:25] [E: packages/core/src/pty.ts:26] [E: packages/core/src/pty.ts:28] [E: packages/core/src/pty.ts:29] [E: packages/core/src/pty.ts:30] [E: packages/core/src/pty.ts:126]。`LocationServiceMap` 会把 `Pty.locationLayer` 放入 Location-scoped layer set [E: packages/core/src/location-layer.ts:68]。

HTTP API 在 V1 server tree 下，但仍是 Effect HttpApi，不是 Hono。`PtyApi` 与 `PtyConnectApi` 都由 `HttpApi.make(...)` 创建，并挂上 `HttpApiGroup` [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:40] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:42] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:139] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:140]。

## 数据模型

| 实体 | 字段 | 说明 | 证据 |
|---|---|---|---|
| `Pty.Info` | `id`, `title`, `command`, `args`, `cwd`, `status`, `pid` | 对外 PTY session snapshot | [E: packages/core/src/pty.ts:46] [E: packages/core/src/pty.ts:47] [E: packages/core/src/pty.ts:48] [E: packages/core/src/pty.ts:49] [E: packages/core/src/pty.ts:50] [E: packages/core/src/pty.ts:51] [E: packages/core/src/pty.ts:53] |
| `Pty.CreateInput` | `command?`, `args?`, `cwd?`, `title?`, `env?` | HTTP create payload；handler 会 prepare 成 `PreparedCreate` | [E: packages/core/src/pty.ts:59] [E: packages/core/src/pty.ts:60] [E: packages/core/src/pty.ts:61] [E: packages/core/src/pty.ts:62] [E: packages/core/src/pty.ts:63] |
| `Pty.UpdateInput` | `title?`, `size?{rows,cols}` | 更新 title 或 resize | [E: packages/core/src/pty.ts:77] [E: packages/core/src/pty.ts:78] [E: packages/core/src/pty.ts:80] [E: packages/core/src/pty.ts:81] |
| `PtyTicket.ConnectToken` | `ticket`, `expires_in` | WebSocket connect token payload | [E: packages/core/src/pty/ticket.ts:13] [E: packages/core/src/pty/ticket.ts:14] |
| `PtyID` | startsWith `"pty"` | PTY id brand，`ascending()` 生成 | [E: packages/core/src/pty/schema.ts:5] |

## Runtime adapter

`packages/core/src/pty/pty.ts` 定义统一 `Proc` 接口：`pid`、`onData`、`onExit`、`write`、`resize`、`kill` [E: packages/core/src/pty/pty.ts:19] [E: packages/core/src/pty/pty.ts:20] [E: packages/core/src/pty/pty.ts:21] [E: packages/core/src/pty/pty.ts:22] [E: packages/core/src/pty/pty.ts:23] [E: packages/core/src/pty/pty.ts:24]。Bun runtime adapter 从 `bun-pty` import `spawn`，Node adapter 从 `@lydell/node-pty` import `spawn`，两者都包装成同一个 `Proc` 形状 [E: packages/core/src/pty/pty.bun.ts:1] [E: packages/core/src/pty/pty.bun.ts:6] [E: packages/core/src/pty/pty.bun.ts:9] [E: packages/core/src/pty/pty.bun.ts:10] [E: packages/core/src/pty/pty.bun.ts:13] [E: packages/core/src/pty/pty.bun.ts:16] [E: packages/core/src/pty/pty.bun.ts:19] [E: packages/core/src/pty/pty.bun.ts:22] [E: packages/core/src/pty/pty.node.ts:1] [E: packages/core/src/pty/pty.node.ts:6] [E: packages/core/src/pty/pty.node.ts:9] [E: packages/core/src/pty/pty.node.ts:10] [E: packages/core/src/pty/pty.node.ts:13] [E: packages/core/src/pty/pty.node.ts:16] [E: packages/core/src/pty/pty.node.ts:19] [E: packages/core/src/pty/pty.node.ts:22]。

## Core 控制流

1. `create(input)` 生成 `PtyID.ascending()`，动态 import `#pty` adapter，并调用 `spawn(input.command, input.args, { name: "xterm-256color", cwd, env })` [E: packages/core/src/pty.ts:179] [E: packages/core/src/pty.ts:181] [E: packages/core/src/pty.ts:183] [E: packages/core/src/pty.ts:184] [E: packages/core/src/pty.ts:185] [E: packages/core/src/pty.ts:186]。
2. session info 初始 status 是 `"running"`，pid 来自 proc.pid；Windows ConPTY 可能在 spawn 时 pid 为 0，schema 允许 NonNegativeInt [E: packages/core/src/pty.ts:53] [E: packages/core/src/pty.ts:195] [E: packages/core/src/pty.ts:196]。
3. `proc.onData` 对每个 chunk 增加 cursor，发送给所有 readyState 1 的 subscriber，并追加到 buffer；buffer 超过 2MiB 时从头裁掉 excess 并增加 `bufferCursor` [E: packages/core/src/pty.ts:210] [E: packages/core/src/pty.ts:217] [E: packages/core/src/pty.ts:222] [E: packages/core/src/pty.ts:223] [E: packages/core/src/pty.ts:224] [E: packages/core/src/pty.ts:225] [E: packages/core/src/pty.ts:226]。
4. `proc.onExit` 把 status 设为 `"exited"`，publish `pty.exited`，然后 `removeSession(id)`，后者会 teardown、kill、close subscribers、publish `pty.deleted` [E: packages/core/src/pty.ts:228] [E: packages/core/src/pty.ts:233] [E: packages/core/src/pty.ts:234] [E: packages/core/src/pty.ts:235] [E: packages/core/src/pty.ts:132] [E: packages/core/src/pty.ts:134] [E: packages/core/src/pty.ts:136] [E: packages/core/src/pty.ts:139] [E: packages/core/src/pty.ts:160] [E: packages/core/src/pty.ts:161]。
5. `update` 可修改 title 和 resize；`resize` 和 `write` 只在 session running 时作用于 process [E: packages/core/src/pty.ts:244] [E: packages/core/src/pty.ts:246] [E: packages/core/src/pty.ts:247] [E: packages/core/src/pty.ts:254] [E: packages/core/src/pty.ts:259]。
6. `connect(id, ws, cursor?)` 注册 subscriber，按 cursor 回放 buffer 片段，再发送一个 control frame `0x00 + JSON.stringify({ cursor: end })` [E: packages/core/src/pty.ts:267] [E: packages/core/src/pty.ts:271] [E: packages/core/src/pty.ts:272] [E: packages/core/src/pty.ts:281] [E: packages/core/src/pty.ts:289]。

## HTTP API 与 WebSocket

`PtyApi` 暴露 `GET /pty/shells`、`GET /pty`、`POST /pty`、`GET /pty/:ptyID`、`PUT /pty/:ptyID`、`DELETE /pty/:ptyID`、`POST /pty/:ptyID/connect-token` [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:44] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:54] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:64] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:76] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:88] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:101] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:113]。这些 endpoint 使用 `InstanceContextMiddleware`、`WorkspaceRoutingMiddleware`、`Authorization` [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:127] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:128] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:129]。

`PtyConnectApi` 暴露 raw `GET /pty/:ptyID/connect` WebSocket route，并使用 `PtyConnectAuthorization` [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:144] [E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:171]。handler 先检查 PTY session 存在，不存在返回空 404；再 decode cursor query，schema decode 失败才返回 400，非法 numeric cursor 会被转成 `undefined` 后按默认回放处理 [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:182] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:186] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:188] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:189] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:197] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:201]。如果 query 带 `ticket`，handler 还校验 origin 并 `tickets.consume(...)`，无效返回 403 [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:190] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:193] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:195]。

connect 成功后，handler `ctx.request.upgrade`，注册 `WebSocketTracker`，构造 adapter，把 core `Pty.connect` 返回的 handler 交给 `socket.runRaw((message) => handlePtyInput(handler, message))` [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:202] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:212] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:236] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:247]。`handlePtyInput` 对 string 直接转发，对 binary 用 fatal UTF-8 decoder，decode 失败静默忽略 [E: packages/core/src/pty/input.ts:9] [E: packages/core/src/pty/input.ts:10] [E: packages/core/src/pty/input.ts:13] [E: packages/core/src/pty/input.ts:17] [E: packages/core/src/pty/input.ts:20]。

## Connect ticket

`PtyTicket` 默认 TTL 是 60 秒，capacity 是 10,000 [E: packages/core/src/pty/ticket.ts:9] [E: packages/core/src/pty/ticket.ts:10]。ticket scope 包含 `ptyID`、可选 `directory`、可选 `workspaceID`，`matches` 要求三者都相等 [E: packages/core/src/pty/ticket.ts:17] [E: packages/core/src/pty/ticket.ts:18] [E: packages/core/src/pty/ticket.ts:19] [E: packages/core/src/pty/ticket.ts:20] [E: packages/core/src/pty/ticket.ts:30] [E: packages/core/src/pty/ticket.ts:32]。`issue` 用 `crypto.randomUUID()` 生成 ticket并 `Cache.set`；`consume` 用 `Cache.invalidateWhen` 原子匹配并删除 ticket [E: packages/core/src/pty/ticket.ts:47] [E: packages/core/src/pty/ticket.ts:48] [E: packages/core/src/pty/ticket.ts:52]。

token endpoint 还要求请求 header `x-opencode-ticket: 1` 且 origin 合法，否则返回 `PtyForbiddenError` [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:132] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:133]。共享常量定义了 query name `"ticket"` 和 header name/value [E: packages/opencode/src/server/shared/pty-ticket.ts:1] [E: packages/opencode/src/server/shared/pty-ticket.ts:2] [E: packages/opencode/src/server/shared/pty-ticket.ts:3]。

## Create preparation

HTTP create handler 不直接把 `Pty.CreateInput` 传给 core；它先调用 `PtyPreparation.prepareCreate`，该 helper 选择 config shell 或 preferred shell，login shell 会追加 `-l`，cwd 默认 instance directory，并触发 plugin `"shell.env"` 后合并 env，最后设置 `TERM=xterm-256color` 与 `OPENCODE_TERMINAL=1` [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:69] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:74] [E: packages/opencode/src/pty-preparation.ts:13] [E: packages/opencode/src/pty-preparation.ts:14] [E: packages/opencode/src/pty-preparation.ts:15] [E: packages/opencode/src/pty-preparation.ts:16] [E: packages/opencode/src/pty-preparation.ts:18] [E: packages/opencode/src/pty-preparation.ts:19] [E: packages/opencode/src/pty-preparation.ts:20] [E: packages/opencode/src/pty-preparation.ts:21] [E: packages/opencode/src/pty-preparation.ts:22]。

## Gotcha

- PTY session state 是进程内 Map，不是 durable session/event-sourced history。
- `/pty/:ptyID/connect` 的 Basic Auth skip 条件来自 `hasPtyConnectTicketURL(url)`，raw handler 再取 query ticket 并调用 `tickets.consume` 校验 [E: packages/opencode/src/server/routes/instance/httpapi/middleware/authorization.ts:143] [E: packages/opencode/src/server/shared/pty-ticket.ts:14] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:190] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:193]。
- `cursor=-1` 表示从当前 end 开始，不回放 buffer；其它 safe integer cursor 会尝试从 buffer 中回放 [E: packages/core/src/pty.ts:272]。
- 这个 HTTP surface 位于 V1 server tree，但它接入的是 core V2 `Pty.Service`。

## Sources

- packages/core/src/pty/
- packages/core/src/pty.ts
- packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts
- packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts
- packages/opencode/src/pty-preparation.ts
- packages/opencode/src/server/shared/pty-ticket.ts

## 相关

- [V1 路由 catalog](../../surface/server-api/v1-routes.md)
- [opencode run scrollback runtime](../tui/run-scrollback.md)
