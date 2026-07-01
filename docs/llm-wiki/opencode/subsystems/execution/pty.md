---
id: execution.pty
title: PTY 子系统(V2)
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/pty/
  - packages/core/src/pty.ts
  - packages/core/src/pty/protocol.ts
  - packages/core/src/location-services.ts
  - packages/schema/src/pty.ts
  - packages/schema/src/pty-ticket.ts
  - packages/core/src/shell.ts
  - packages/protocol/src/groups/pty.ts
  - packages/protocol/src/api.ts
  - packages/server/src/handlers/pty.ts
  - packages/server/src/pty-environment.ts
  - packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts
  - packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts
  - packages/opencode/src/plugin/pty-environment.ts
  - packages/opencode/src/server/shared/pty-ticket.ts
symbols:
  - Pty.Service
  - PtyProtocol.decodeInput
  - PtyProtocol.metaFrame
  - PtyTicket.Service
  - Pty.Info
  - PtyGroup
  - PtyHandler
  - PtyEnvironment.Service
  - PtyApi
  - PtyConnectApi
related:
  - server-api.v2-routes
  - server-api.v1-routes
  - tui.run-scrollback
  - execution.core-shell-v2
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> PTY 子系统是 V2 Location-scoped pseudo-terminal service：core 用 `#pty` 适配 bun-pty/node-pty，维护进程内 session/buffer/subscribers；canonical server package 暴露 `/api/pty/*` JSON endpoint 和 `/api/pty/:ptyID/connect` WebSocket，legacy instance server tree 仍暴露 `/pty/*` compatibility surface。两条 surface 都使用短期 connect ticket 保护 browser WS 连接。

## 能回答的问题

- PTY 为什么同时有 `packages/server/src` `/api/pty` surface 和 legacy `packages/opencode/src/server` `/pty` surface？
- WebSocket protocol 的 replay chunk 和 cursor metadata frame 如何编码？
- PTY create 的 shell/env/cwd 在哪里准备？
- legacy instance PTY API 为什么隐藏 exited sessions，而 server-package `/api/pty` 会暴露 retained exited sessions？
- connect ticket 的 TTL、scope、consume 语义是什么？

## 职责边界

`Pty.Service` 的 service tag 是 `@opencode/v2/Pty`，并作为 `locationLayer` 提供；`locationServices` 把 `Pty.node` 放进每个 location 的 service graph，`buildLocationServiceMap` 再按 `Location.Ref` 编译 location layer。[E: packages/core/src/pty.ts:90][E: packages/core/src/pty.ts:316][E: packages/core/src/location-services.ts:42][E: packages/core/src/location-services.ts:59][E: packages/core/src/location-services.ts:84][E: packages/core/src/location-services.ts:91]

core PTY state 是进程内 `sessions = new Map<PtyID, Active>()`；`Active` 包含 `info/process/buffer/bufferCursor/cursor/subscribers/listeners`。[E: packages/core/src/pty.ts:29][E: packages/core/src/pty.ts:30][E: packages/core/src/pty.ts:31][E: packages/core/src/pty.ts:32][E: packages/core/src/pty.ts:33][E: packages/core/src/pty.ts:34][E: packages/core/src/pty.ts:35][E: packages/core/src/pty.ts:36][E: packages/core/src/pty.ts:100]

Canonical HTTP API 的 schema 在 protocol package 下：`PtyGroup` 使用 group name `server.pty`，被加入 V2 `Api`，`PtyHandler` 也按同一 group name 注册 handler。legacy instance tree 仍保留 `PtyApi` 与 `PtyConnectApi` 两个 Effect HttpApi compatibility surface。[E: packages/protocol/src/groups/pty.ts:21][E: packages/protocol/src/api.ts:16][E: packages/protocol/src/api.ts:52][E: packages/server/src/handlers/pty.ts:25][E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:40][E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:42][E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:139][E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:140]

## 数据模型

| 实体 | 字段 | 说明 | 证据 |
|---|---|---|---|
| `Pty.Info` | `id`, `title`, `command`, `args`, `cwd`, `status`, `pid`, `exitCode?` | 对外 PTY session snapshot | [E: packages/schema/src/pty.ts:22][E: packages/schema/src/pty.ts:23][E: packages/schema/src/pty.ts:24][E: packages/schema/src/pty.ts:25][E: packages/schema/src/pty.ts:26][E: packages/schema/src/pty.ts:27][E: packages/schema/src/pty.ts:28][E: packages/schema/src/pty.ts:29][E: packages/schema/src/pty.ts:30] |
| `Pty.CreateInput` | `command?`, `args?`, `cwd?`, `title?`, `env?` | HTTP create payload；core handles default shell/env normalization | [E: packages/schema/src/pty.ts:40][E: packages/schema/src/pty.ts:41][E: packages/schema/src/pty.ts:42][E: packages/schema/src/pty.ts:43][E: packages/schema/src/pty.ts:44][E: packages/schema/src/pty.ts:45] |
| `Pty.UpdateInput` | `title?`, `size?{rows,cols}` | 更新 title 或 resize | [E: packages/schema/src/pty.ts:49][E: packages/schema/src/pty.ts:50][E: packages/schema/src/pty.ts:51][E: packages/schema/src/pty.ts:53][E: packages/schema/src/pty.ts:54] |
| `Pty.AttachInput` | `cursor?`, `onData`, `onEnd` | transport-free attach API，server route adapts it to WebSocket | [E: packages/core/src/pty.ts:52][E: packages/core/src/pty.ts:54][E: packages/core/src/pty.ts:56][E: packages/core/src/pty.ts:58] |
| `PtyTicket.ConnectToken` | `ticket`, `expires_in` | WebSocket connect token payload | [E: packages/schema/src/pty-ticket.ts:6][E: packages/schema/src/pty-ticket.ts:7][E: packages/schema/src/pty-ticket.ts:8] |

## Runtime Adapter

`packages/core/src/pty/pty.ts` 定义统一 `Proc` 接口：`pid`、`onData`、`onExit`、`write`、`resize`、`kill`。[E: packages/core/src/pty/pty.ts:19][E: packages/core/src/pty/pty.ts:20][E: packages/core/src/pty/pty.ts:21][E: packages/core/src/pty/pty.ts:22][E: packages/core/src/pty/pty.ts:23][E: packages/core/src/pty/pty.ts:24]

Bun runtime adapter 从 `bun-pty` import `spawn`，Node adapter 从 `@lydell/node-pty` import `spawn`，两者都包装成同一个 `Proc` 形状。[E: packages/core/src/pty/pty.bun.ts:1][E: packages/core/src/pty/pty.bun.ts:6][E: packages/core/src/pty/pty.bun.ts:9][E: packages/core/src/pty/pty.node.ts:1][E: packages/core/src/pty/pty.node.ts:6][E: packages/core/src/pty/pty.node.ts:9]

## Core 控制流

1. `create(input)` 生成 `PtyID.ascending()`，选择 command：payload command 优先，否则 `Shell.preferred(Config.latest(config.entries(), "shell"))`；login shell 会追加 `-l`，cwd 默认当前 location directory。[E: packages/core/src/pty.ts:165][E: packages/core/src/pty.ts:166][E: packages/core/src/pty.ts:167][E: packages/core/src/pty.ts:168][E: packages/core/src/pty.ts:169]
2. core env overlay order 是 `process.env`、`input.env`、`TERM=xterm-256color`、`OPENCODE_TERMINAL=1`；Windows 还设置 `LC_ALL/LC_CTYPE/LANG=C.UTF-8`。[E: packages/core/src/pty.ts:170][E: packages/core/src/pty.ts:171][E: packages/core/src/pty.ts:174][E: packages/core/src/pty.ts:176][E: packages/core/src/pty.ts:179]
3. core 动态 import `#pty` adapter，调用 `spawn(command, args, { name: "xterm-256color", cwd, env })`，并把 initial info status 设为 `"running"`。[E: packages/core/src/pty.ts:182][E: packages/core/src/pty.ts:183][E: packages/core/src/pty.ts:184][E: packages/core/src/pty.ts:190]
4. `proc.onData` 增加 absolute cursor，给 active subscribers 发送 chunk；inactive subscribers 先积累 pending；retained buffer 超过 `2 * 1024 * 1024` 个 JavaScript string length 单位时从头裁掉并推进 `bufferCursor`。[E: packages/core/src/pty.ts:14][E: packages/core/src/pty.ts:204][E: packages/core/src/pty.ts:205][E: packages/core/src/pty.ts:207][E: packages/core/src/pty.ts:212][E: packages/core/src/pty.ts:217][E: packages/core/src/pty.ts:218][E: packages/core/src/pty.ts:221]
5. `proc.onExit` 把 session 设为 `"exited"`、保存 exitCode、通知 subscribers、发布 `pty.exited`，并用 `EXITED_LIMIT=25` 限制 retained exited sessions。[E: packages/core/src/pty.ts:17][E: packages/core/src/pty.ts:223][E: packages/core/src/pty.ts:225][E: packages/core/src/pty.ts:226][E: packages/core/src/pty.ts:227][E: packages/core/src/pty.ts:232][E: packages/core/src/pty.ts:233]
6. `attach(id, { cursor })` 在 running session 上注册 subscriber；`cursor=-1` 从当前 end tail，safe integer cursor 从 absolute cursor 回放，未传 cursor 回放 retained buffer 起点；返回 replay、cursor、write、activate、detach。[E: packages/core/src/pty.ts:259][E: packages/core/src/pty.ts:261][E: packages/core/src/pty.ts:271][E: packages/core/src/pty.ts:275][E: packages/core/src/pty.ts:277][E: packages/core/src/pty.ts:279][E: packages/core/src/pty.ts:286][E: packages/core/src/pty.ts:288][E: packages/core/src/pty.ts:289][E: packages/core/src/pty.ts:292][E: packages/core/src/pty.ts:303]

## WebSocket Protocol

`PtyProtocol` 是 PTY WebSocket wire protocol helper。Replay chunk 上限是 `64 * 1024` 个 JavaScript string length 单位；`chunks(data)` 按这个上限切 string；`metaFrame(cursor)` 发送首字节 `0` 加 JSON `{"cursor": <absolute cursor>}` 的 Uint8Array。[E: packages/core/src/pty/protocol.ts:13][E: packages/core/src/pty/protocol.ts:15][E: packages/core/src/pty/protocol.ts:16][E: packages/core/src/pty/protocol.ts:18][E: packages/core/src/pty/protocol.ts:19][E: packages/core/src/pty/protocol.ts:23][E: packages/core/src/pty/protocol.ts:25]

Inbound `decodeInput(message)` 对 string 原样返回，对 ArrayBuffer/Uint8Array 用 fatal UTF-8 decoder；decode 失败返回 undefined，server-package 和 legacy handlers 都只把 defined input 写入 attachment。[E: packages/core/src/pty/protocol.ts:30][E: packages/core/src/pty/protocol.ts:31][E: packages/core/src/pty/protocol.ts:33][E: packages/core/src/pty/protocol.ts:35][E: packages/server/src/handlers/pty.ts:210][E: packages/server/src/handlers/pty.ts:211][E: packages/server/src/handlers/pty.ts:212][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:260][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:261][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:262]

connect handler 升级 WebSocket 后，用一个 queue 顺序发送 replay chunks、meta frame、live output 和 close frame；`attachment.activate()` 在 replay/meta 入队后才启动 live delivery。server-package handler 和 legacy handler 都遵循这条 ordering。[E: packages/server/src/handlers/pty.ts:179][E: packages/server/src/handlers/pty.ts:196][E: packages/server/src/handlers/pty.ts:197][E: packages/server/src/handlers/pty.ts:198][E: packages/server/src/handlers/pty.ts:202][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:225][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:244][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:245][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:246][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:250]

## HTTP API 与 Plugin Env

`PtyGroup` 暴露 canonical `GET /api/pty`、`POST /api/pty`、`GET/PUT/DELETE /api/pty/:ptyID`、`POST /api/pty/:ptyID/connect-token` 和 `GET /api/pty/:ptyID/connect`。[E: packages/protocol/src/groups/pty.ts:23][E: packages/protocol/src/groups/pty.ts:37][E: packages/protocol/src/groups/pty.ts:52][E: packages/protocol/src/groups/pty.ts:68][E: packages/protocol/src/groups/pty.ts:85][E: packages/protocol/src/groups/pty.ts:101][E: packages/protocol/src/groups/pty.ts:119]

server-package list/get 直接返回 `Pty.Service.list()` / `Pty.Service.get()`,所以它包含 retained exited sessions 和 exit code；这和 group OpenAPI description 一致。[E: packages/protocol/src/groups/pty.ts:32][E: packages/protocol/src/groups/pty.ts:63][E: packages/server/src/handlers/pty.ts:33][E: packages/server/src/handlers/pty.ts:35][E: packages/server/src/handlers/pty.ts:58][E: packages/server/src/handlers/pty.ts:62]

legacy `PtyApi` 暴露 `GET /pty/shells`、`GET /pty`、`POST /pty`、`GET /pty/:ptyID`、`PUT /pty/:ptyID`、`DELETE /pty/:ptyID`、`POST /pty/:ptyID/connect-token`。[E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:44][E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:54][E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:64][E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:76][E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:88][E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:101][E: packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts:113]

legacy instance API intentionally hides exited sessions: list filters status `"running"` and get maps non-running status to `PtyNotFoundError`, while core still retains exited sessions up to `EXITED_LIMIT`。[E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:64][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:66][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:94][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:95][E: packages/core/src/pty.ts:17]

server-package create handler calculates cwd from payload or location directory, merges payload env with `PtyEnvironment.Service.get({ directory, cwd })`, then calls core `Pty.create()`；core then overlays process env and terminal vars。[E: packages/server/src/handlers/pty.ts:40][E: packages/server/src/handlers/pty.ts:43][E: packages/server/src/handlers/pty.ts:45][E: packages/server/src/handlers/pty.ts:51][E: packages/server/src/pty-environment.ts:6][E: packages/server/src/pty-environment.ts:7][E: packages/core/src/pty.ts:170]

legacy HTTP create handler calculates cwd from payload or instance directory, triggers V1 plugin hook `"shell.env"` with `{ cwd }`, then passes payload env plus plugin env into core `Pty.create()`。[E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:69][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:70][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:71][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:74][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:78]

`PluginPtyEnvironment.layer` also implements server package `PtyEnvironment.Service.get` by entering the instance for `input.directory` and triggering `"shell.env"` with `{ cwd: input.cwd }`。[E: packages/opencode/src/plugin/pty-environment.ts:8][E: packages/opencode/src/plugin/pty-environment.ts:9][E: packages/opencode/src/plugin/pty-environment.ts:14][E: packages/opencode/src/plugin/pty-environment.ts:15][E: packages/opencode/src/plugin/pty-environment.ts:18][E: packages/opencode/src/plugin/pty-environment.ts:19]

## Connect Ticket

`PtyTicket` 默认 TTL 是 60 秒，capacity 是 10,000。ticket scope 包含 `ptyID`、可选 `directory`、可选 `workspaceID`，consume 时要求三者匹配。[E: packages/core/src/pty/ticket.ts:9][E: packages/core/src/pty/ticket.ts:10][E: packages/core/src/pty/ticket.ts:15][E: packages/core/src/pty/ticket.ts:17][E: packages/core/src/pty/ticket.ts:27][E: packages/core/src/pty/ticket.ts:29]

token endpoint 要求请求 header `x-opencode-ticket: 1` 且 origin 合法；shared constants 定义 query name `"ticket"` 和 header name/value。canonical server-package endpoint 和 legacy instance endpoint 都执行这个 header/origin gate。[E: packages/server/src/handlers/pty.ts:118][E: packages/server/src/handlers/pty.ts:122][E: packages/server/src/handlers/pty.ts:123][E: packages/protocol/src/groups/pty.ts:9][E: packages/protocol/src/groups/pty.ts:10][E: packages/protocol/src/groups/pty.ts:11][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:144][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:146][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:149][E: packages/opencode/src/server/shared/pty-ticket.ts:1][E: packages/opencode/src/server/shared/pty-ticket.ts:2][E: packages/opencode/src/server/shared/pty-ticket.ts:3]

## Gotcha

- PTY session state 是进程内 Map，不是 durable session/event-sourced history。[E: packages/core/src/pty.ts:100]
- `/api/pty/:ptyID/connect` 的 auth skip 条件来自 protocol `hasPtyConnectTicketURL(url)`；legacy `/pty/:ptyID/connect` 也有独立的 ticket URL helper。ticket query 存在时，两条 raw handler 会取 query ticket 并调用 `tickets.consume` 校验；没有 ticket query 时不走这段 consume 分支。[E: packages/protocol/src/groups/pty.ts:13][E: packages/protocol/src/groups/pty.ts:17][E: packages/protocol/src/groups/pty.ts:18][E: packages/server/src/handlers/pty.ts:150][E: packages/server/src/handlers/pty.ts:152][E: packages/server/src/handlers/pty.ts:154][E: packages/opencode/src/server/shared/pty-ticket.ts:13][E: packages/opencode/src/server/shared/pty-ticket.ts:14][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:195][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:196][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:198]
- `cursor=-1` 表示从当前 end 开始，不回放 buffer；其它 safe integer cursor 会尝试从 retained buffer 中回放。[E: packages/core/src/pty.ts:275][E: packages/core/src/pty.ts:277]
- canonical HTTP surface 位于 `packages/server/src` `/api/pty`；legacy `/pty` surface 位于 V1 instance server tree。两者接入的都是 core V2 `Pty.Service`。

## Sources

- packages/core/src/pty/
- packages/core/src/pty.ts
- packages/core/src/pty/protocol.ts
- packages/core/src/location-services.ts
- packages/schema/src/pty.ts
- packages/schema/src/pty-ticket.ts
- packages/core/src/shell.ts
- packages/protocol/src/groups/pty.ts
- packages/protocol/src/api.ts
- packages/server/src/handlers/pty.ts
- packages/server/src/pty-environment.ts
- packages/opencode/src/server/routes/instance/httpapi/groups/pty.ts
- packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts
- packages/opencode/src/plugin/pty-environment.ts
- packages/opencode/src/server/shared/pty-ticket.ts

## 相关

- [V2 路由 catalog](../../surface/server-api/v2-routes.md)
- [V1 路由 catalog](../../surface/server-api/v1-routes.md)
- [opencode run scrollback runtime](../tui/run-scrollback.md)
- [V2 Core Shell Helper](core-shell-v2.md)
