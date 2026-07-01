---
id: peripheral.function
title: Cloud Function(CF Worker 分享后端)
kind: subsystem
tier: T2
v: na
source:
  - packages/function/src/api.ts
  - packages/function/package.json
  - infra/app.ts
symbols: [SyncServer]
related: [server.sharing]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> `@opencode-ai/function` 是公共 Cloudflare Worker 后端：它承载 legacy share sync、WebSocket poll、GitHub App token exchange，以及 Feishu 到 Discord 的桥接。

## 能回答的问题

- 公共分享后端如何用 Durable Object 和 R2 保存 session 数据？
- `/share_create`、`/share_sync`、`/share_poll`、`/share_data` 分别做什么？
- GitHub Actions OIDC 如何交换 GitHub App installation token？
- Feishu webhook 为什么会调用 Discord API？
- 这个 Hono Worker 和 opencode V1/V2 Effect HttpApi server 的边界在哪里？

## 职责边界

`packages/function/src/api.ts` 是一个 Hono Cloudflare Worker，而不是 opencode V1/V2 进程内 server；源码直接 `import { Hono } from "hono"`，并以 `export default new Hono<{ Bindings: Env }>()` 挂载 routes，SST infra 的 Worker handler 也指向这个 `api.handler` [E: packages/function/src/api.ts:1] [E: packages/function/src/api.ts:116] [E: infra/app.ts:13] [E: infra/app.ts:15]。这不违反“opencode 两个 HTTP server 都是 Effect HttpApi”的硬约定，因为本节点覆盖的是公共外围 Worker，不是 `packages/opencode/src/server` 或 `packages/server/src` [I]。

Worker 的 binding 类型包含 `SYNC_SERVER` Durable Object namespace、`Bucket` R2 bucket 和 `WEB_DOMAIN` 环境变量 [E: packages/function/src/api.ts:9] [E: packages/function/src/api.ts:10] [E: packages/function/src/api.ts:11] [E: packages/function/src/api.ts:12]。`infra/app.ts` 把 handler 指到 `packages/function/src/api.ts`，把 domain 配成 `api.${domain}`，并把 `WEB_DOMAIN` 注入为当前 stage domain [E: infra/app.ts:13] [E: infra/app.ts:14] [E: infra/app.ts:15] [E: infra/app.ts:17]。同一个 infra file 创建 Cloudflare bucket 并 link GitHub、admin、Discord、Feishu secrets [E: infra/app.ts:11] [E: infra/app.ts:20] [E: infra/app.ts:22] [E: infra/app.ts:23] [E: infra/app.ts:24] [E: infra/app.ts:25] [E: infra/app.ts:26] [E: infra/app.ts:27] [E: infra/app.ts:28]。

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/function/src/api.ts` | Hono routes、`SyncServer` Durable Object、R2 writes、GitHub token exchange、Feishu bridge。 |
| `packages/function/package.json` | 声明 Worker 所需的 `hono`、`jose`、`@octokit/auth-app`、`@octokit/rest` 依赖 [E: packages/function/package.json:15] [E: packages/function/package.json:16] [E: packages/function/package.json:17] [E: packages/function/package.json:18]。 |
| `infra/app.ts` | Cloudflare Worker、Bucket、Durable Object binding 和 secrets 的 SST 装配。 |

## 数据模型

`SyncServer` 继承 `DurableObject<Env>`；routes 通过 `shortName(sessionID)` 和 `SYNC_SERVER.idFromName(short)` 为每个 share short name 定位 Durable Object instance [E: packages/function/src/api.ts:15] [E: packages/function/src/api.ts:111] [E: packages/function/src/api.ts:112] [E: packages/function/src/api.ts:121] [E: packages/function/src/api.ts:122]。`share(sessionID)` 会生成并持久化 `secret` 与 `sessionID`；如果 secret 已存在，则复用已有 secret [E: packages/function/src/api.ts:68] [E: packages/function/src/api.ts:70] [E: packages/function/src/api.ts:71] [E: packages/function/src/api.ts:73] [E: packages/function/src/api.ts:74]。

`publish(key, content)` 只接受当前 session 的 `session/info/{sessionID}`、`session/message/{sessionID}/...`、`session/part/{sessionID}/...` 三类 key，否则返回 400 [E: packages/function/src/api.ts:47] [E: packages/function/src/api.ts:48] [E: packages/function/src/api.ts:49] [E: packages/function/src/api.ts:50] [E: packages/function/src/api.ts:52]。接受的 content 同时写入 R2 `share/${key}.json` 和 Durable Object storage，再广播给当前 DO 的 WebSocket clients [E: packages/function/src/api.ts:55] [E: packages/function/src/api.ts:60] [E: packages/function/src/api.ts:61] [E: packages/function/src/api.ts:64]。

`SyncServer.shortName(id)` 取 session id 末 8 字符作为 share id，因此公共 share URL 是 `https://${WEB_DOMAIN}/s/${short}` [E: packages/function/src/api.ts:111] [E: packages/function/src/api.ts:112] [E: packages/function/src/api.ts:127]。

## 控制流

1. `/share_create` 读取 `{ sessionID }` JSON body，取 short name，拿到 `SYNC_SERVER.idFromName(short)` 的 stub，调用 `stub.share(sessionID)`，返回 `{ secret, url }` [E: packages/function/src/api.ts:118] [E: packages/function/src/api.ts:119] [E: packages/function/src/api.ts:121] [E: packages/function/src/api.ts:122] [E: packages/function/src/api.ts:123] [E: packages/function/src/api.ts:126] [E: packages/function/src/api.ts:127]。
2. `/share_sync` 读取 `{ sessionID, secret, key, content }`，按 `sessionID` 定位 DO，先 `assertSecret`，再 `publish` 数据 [E: packages/function/src/api.ts:150] [E: packages/function/src/api.ts:151] [E: packages/function/src/api.ts:160] [E: packages/function/src/api.ts:161]。
3. `/share_poll` 要求 `Upgrade: websocket`，缺少 upgrade 返回 426；成功时用 query `id` 定位 DO 并调用 `stub.fetch(c.req.raw)` 建立 WebSocket [E: packages/function/src/api.ts:164] [E: packages/function/src/api.ts:166] [E: packages/function/src/api.ts:167] [E: packages/function/src/api.ts:172] [E: packages/function/src/api.ts:173]。
4. `SyncServer.fetch()` 创建 `WebSocketPair`，`acceptWebSocket(server)` 后把 storage 中所有 `session/` key 先发送给新 client，再返回 101 [E: packages/function/src/api.ts:23] [E: packages/function/src/api.ts:26] [E: packages/function/src/api.ts:28] [E: packages/function/src/api.ts:30] [E: packages/function/src/api.ts:31] [E: packages/function/src/api.ts:34]。
5. `/share_data` 从 DO storage 读取所有 session 数据，把 `session/info` 放到 `info`，把 `session/message` 聚合到 `messages[id]`，再把 `session/part` push 到对应 message 的 `parts` [E: packages/function/src/api.ts:79] [E: packages/function/src/api.ts:80] [E: packages/function/src/api.ts:175] [E: packages/function/src/api.ts:180] [E: packages/function/src/api.ts:188] [E: packages/function/src/api.ts:192] [E: packages/function/src/api.ts:198]。
6. `/share_delete` 要求 `{ sessionID, secret }`，校验 secret 后调用 `clear()`；`clear()` 删除 R2 中 session message prefix、session info key，并清空 DO storage [E: packages/function/src/api.ts:131] [E: packages/function/src/api.ts:136] [E: packages/function/src/api.ts:137] [E: packages/function/src/api.ts:101] [E: packages/function/src/api.ts:104] [E: packages/function/src/api.ts:105] [E: packages/function/src/api.ts:107]。
7. `/share_delete_admin` 用 `Resource.ADMIN_SECRET.value` 比对 body 中的 `adminSecret`，成功后按 `sessionShortName` 清除 share [E: packages/function/src/api.ts:140] [E: packages/function/src/api.ts:144] [E: packages/function/src/api.ts:145] [E: packages/function/src/api.ts:147]。

## GitHub App token exchange

`/exchange_github_app_token` 面向 GitHub Actions OIDC：它要求 `Authorization: Bearer ...`，用 GitHub Actions issuer 的 JWKS 验证 token，且 audience 固定为 `opencode-github-action` [E: packages/function/src/api.ts:261] [E: packages/function/src/api.ts:262] [E: packages/function/src/api.ts:263] [E: packages/function/src/api.ts:267] [E: packages/function/src/api.ts:268] [E: packages/function/src/api.ts:274] [E: packages/function/src/api.ts:276]。通过的 token 从 `payload.sub` 中解析 `owner/repo`，随后用 GitHub App id/private key 创建 app auth，查询 repo installation，再创建 installation token 返回 [E: packages/function/src/api.ts:279] [E: packages/function/src/api.ts:281] [E: packages/function/src/api.ts:289] [E: packages/function/src/api.ts:290] [E: packages/function/src/api.ts:296] [E: packages/function/src/api.ts:303] [E: packages/function/src/api.ts:304] [E: packages/function/src/api.ts:307]。

`/exchange_github_app_token_with_pat` 是本地测试路径：它读取 body 中 `owner`/`repo`，用 caller PAT 读 repo，并要求 `admin`、`push` 或 `maintain` 权限之一，之后同样查 GitHub App installation token [E: packages/function/src/api.ts:319] [E: packages/function/src/api.ts:320] [E: packages/function/src/api.ts:324] [E: packages/function/src/api.ts:325] [E: packages/function/src/api.ts:330] [E: packages/function/src/api.ts:331] [E: packages/function/src/api.ts:338] [E: packages/function/src/api.ts:344] [E: packages/function/src/api.ts:349]。

`/get_github_app_installation` 供 CLI 检查 GitHub App 是否安装：它用 query `owner`/`repo` 查 installation，Not Found 被吞掉并返回 `{ installation }`，其他错误继续抛出 [E: packages/function/src/api.ts:362] [E: packages/function/src/api.ts:363] [E: packages/function/src/api.ts:364] [E: packages/function/src/api.ts:376] [E: packages/function/src/api.ts:379] [E: packages/function/src/api.ts:382] [E: packages/function/src/api.ts:386]。

## Feishu 到 Discord 桥

`/feishu` 先处理 Feishu challenge handshake，有 `challenge` 就直接返回 `{ challenge }` [E: packages/function/src/api.ts:204] [E: packages/function/src/api.ts:218] [E: packages/function/src/api.ts:219]。普通事件从 `body.event.message.content` 中取 text，剥离 Feishu user mention，把以 `aiden` 开头的消息改写成 Discord mention `<@759257817772851260>`，并把 Feishu thread id 附到消息尾部 [E: packages/function/src/api.ts:221] [E: packages/function/src/api.ts:230] [E: packages/function/src/api.ts:231] [E: packages/function/src/api.ts:234] [E: packages/function/src/api.ts:235]。最终它 POST 到 Discord channel messages API，Authorization 使用 `Resource.DISCORD_SUPPORT_BOT_TOKEN.value` [E: packages/function/src/api.ts:237] [E: packages/function/src/api.ts:238] [E: packages/function/src/api.ts:243]。

## 设计动机与权衡

公共 share 后端保留了 legacy key layout：`session/info`、`session/message`、`session/part` 这些 key 被 DO 直接校验和聚合 [E: packages/function/src/api.ts:48] [E: packages/function/src/api.ts:49] [E: packages/function/src/api.ts:50]。它把 DO storage 用作新 WebSocket client 的 backfill 数据源，当前 subscribers 则来自 `ctx.getWebSockets()`，R2 保存 JSON object 副本 [E: packages/function/src/api.ts:28] [E: packages/function/src/api.ts:30] [E: packages/function/src/api.ts:55] [E: packages/function/src/api.ts:60] [E: packages/function/src/api.ts:61]。Enterprise share 后端已采用 SolidStart + S3/R2 snapshot API；公共 Worker 仍保留 WebSocket polling 和 legacy `/share_*` routes [I]。

## Gotcha

- `/share_data` 只从 Durable Object storage 组装响应，不从 R2 bucket 读 backfill；如果 DO storage 被清空但 R2 仍有对象，`/share_data` 不会自动恢复 [E: packages/function/src/api.ts:79] [E: packages/function/src/api.ts:80] [I]。
- R2 cleanup 中 `clear()` 的 list prefix 是 `session/message/${sessionID}/`，而 publish 写入 R2 时 prefix 是 `share/${key}.json`；这两个 prefix 不一致，是否遗留对象需要单独审查 [E: packages/function/src/api.ts:55] [E: packages/function/src/api.ts:101] [I]。
- `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 被 infra link 到 Worker，但当前 `/feishu` route 没有校验 Feishu 签名或 token [E: infra/app.ts:27] [E: infra/app.ts:28] [E: packages/function/src/api.ts:204] [I]。

## Sources

- `packages/function/src/api.ts`
- `packages/function/package.json`
- `infra/app.ts`

## 相关

- `server.sharing`：opencode share client/server 面与此公共 Worker share 后端交互；本节点覆盖 Worker 的外围实现。
