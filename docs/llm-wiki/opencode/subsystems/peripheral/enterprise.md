---
id: peripheral.enterprise
title: Enterprise / 自托管
kind: subsystem
tier: T2
v: na
source:
  - packages/enterprise/src/core/share.ts
  - packages/enterprise/src/routes/api/[...path].ts
  - packages/enterprise/src/core/storage.ts
  - packages/enterprise/src/routes/share/[shareID].tsx
  - packages/enterprise/package.json
  - infra/enterprise.ts
symbols: [Share, Storage]
related: [server.sharing]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> `@opencode-ai/enterprise` 是 SolidStart 自托管 share 后端：它用 S3/R2-compatible object storage 保存 share snapshot，并提供 REST API 与 viewer page。

## 能回答的问题

- Enterprise share 后端和公共 Cloudflare Worker share 后端有什么区别？
- `Share.Data` 支持哪些 session 数据类型？
- share snapshot 如何 merge、删除和迁移 legacy event？
- 自托管 storage adapter 需要哪些环境变量？
- viewer page 如何把 share 数据恢复成 UI 所需的 session/message/part/model maps？

## 职责边界

Enterprise package 是一个 SolidStart app，而不是 opencode CLI server。`package.json` 的 scripts 是 `vite dev`、`vite build`、`vite start`，并提供 `build:cloudflare` 给 Cloudflare deployment [E: packages/enterprise/package.json:7] [E: packages/enterprise/package.json:9] [E: packages/enterprise/package.json:10] [E: packages/enterprise/package.json:11] [E: packages/enterprise/package.json:12]。它依赖 `@solidjs/start`、`@opencode-ai/ui`、`@opencode-ai/session-ui`、`hono`、`hono-openapi` 和 `aws4fetch`；API route、object storage adapter 和 share viewer UI 的职责分别由下方 route/storage/viewer source 验证 [E: packages/enterprise/package.json:17] [E: packages/enterprise/package.json:18] [E: packages/enterprise/package.json:19] [E: packages/enterprise/package.json:22] [E: packages/enterprise/package.json:25] [E: packages/enterprise/package.json:26] [I]。

`infra/enterprise.ts` 把 Enterprise 部署成 `sst.cloudflare.x.SolidStart("Teams")`，path 指向 `packages/enterprise`，build command 是 `bun run build:cloudflare` [E: infra/enterprise.ts:6] [E: infra/enterprise.ts:8] [E: infra/enterprise.ts:9]。同一个 infra file 创建 `EnterpriseStorage` Cloudflare bucket，并通过 `OPENCODE_STORAGE_*` 环境变量把 adapter 配成 R2 [E: infra/enterprise.ts:4] [E: infra/enterprise.ts:11] [E: infra/enterprise.ts:16]。

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/enterprise/src/core/share.ts` | Share schema、snapshot merge、create/remove/sync/data、legacy event migration。 |
| `packages/enterprise/src/core/storage.ts` | S3/R2-compatible object storage adapter，负责 JSON read/write/list/remove。 |
| `packages/enterprise/src/routes/api/` 的 catch-all route | Hono REST API，提供 `/api/share`、`/api/share/:shareID/sync`、`/api/share/:shareID/data`、`DELETE /api/share/:shareID` [I]。 |
| `packages/enterprise/src/routes/share/` 的 dynamic route | SolidStart viewer page，把 share data 转成 `DataProvider` 所需结构 [I]。 |
| `packages/enterprise/test/core/share.test.ts` | 覆盖 create、admin remove、sync、duplicate overwrite、legacy migration、invalid secret 等行为 [E: packages/enterprise/test/core/share.test.ts:7] [E: packages/enterprise/test/core/share.test.ts:17] [E: packages/enterprise/test/core/share.test.ts:25] [E: packages/enterprise/test/core/share.test.ts:156] [E: packages/enterprise/test/core/share.test.ts:205] [E: packages/enterprise/test/core/share.test.ts:227]。 |

## 数据模型

`Share.Info` 是 `{ id, secret, sessionID }`，三者都是 string [E: packages/enterprise/src/core/share.ts:11] [E: packages/enterprise/src/core/share.ts:12] [E: packages/enterprise/src/core/share.ts:13] [E: packages/enterprise/src/core/share.ts:14]。`Share.Data` 是按 `type` discriminated union，覆盖 `session`、`message`、`part`、`session_diff`、`model` 五种数据；其中数据类型来自 `@opencode-ai/sdk/v2` 的 `Session`、`Message`、`Part`、`SnapshotFileDiff`、`Model` [E: packages/enterprise/src/core/share.ts:1] [E: packages/enterprise/src/core/share.ts:18] [E: packages/enterprise/src/core/share.ts:20] [E: packages/enterprise/src/core/share.ts:21] [E: packages/enterprise/src/core/share.ts:24] [E: packages/enterprise/src/core/share.ts:25] [E: packages/enterprise/src/core/share.ts:28] [E: packages/enterprise/src/core/share.ts:29] [E: packages/enterprise/src/core/share.ts:32] [E: packages/enterprise/src/core/share.ts:33] [E: packages/enterprise/src/core/share.ts:36] [E: packages/enterprise/src/core/share.ts:37]。

`key(item)` 把 union item 映射成稳定 key：session 固定为 `session`，message 按 message id，part 按 `messageID/id`，session diff 固定为 `session_diff`，model 固定为 `model` [E: packages/enterprise/src/core/share.ts:51] [E: packages/enterprise/src/core/share.ts:54] [E: packages/enterprise/src/core/share.ts:56] [E: packages/enterprise/src/core/share.ts:58] [E: packages/enterprise/src/core/share.ts:60] [E: packages/enterprise/src/core/share.ts:62]。`merge(...items)` 用 `Map` 按这个 key 去重，后来的 item 覆盖先来的 item，然后按 key 排序输出 [E: packages/enterprise/src/core/share.ts:66] [E: packages/enterprise/src/core/share.ts:70] [E: packages/enterprise/src/core/share.ts:73] [E: packages/enterprise/src/core/share.ts:74]。

## Storage adapter

`Storage.Adapter` 是最小 object-store interface：`read(path)`、`write(path,value)`、`remove(path)`、`list(options)` [E: packages/enterprise/src/core/storage.ts:6] [E: packages/enterprise/src/core/storage.ts:7] [E: packages/enterprise/src/core/storage.ts:8] [E: packages/enterprise/src/core/storage.ts:9]。`createAdapter` 用 `AwsClient.fetch` 直接对 `${endpoint}/${bucket}/${path}` 做 GET、PUT、DELETE，PUT 时写 `Content-Type: application/json` [E: packages/enterprise/src/core/storage.ts:12] [E: packages/enterprise/src/core/storage.ts:16] [E: packages/enterprise/src/core/storage.ts:23] [E: packages/enterprise/src/core/storage.ts:24] [E: packages/enterprise/src/core/storage.ts:27] [E: packages/enterprise/src/core/storage.ts:34] [E: packages/enterprise/src/core/storage.ts:35]。

`s3()` 从 `OPENCODE_STORAGE_BUCKET`、`OPENCODE_STORAGE_REGION`、`OPENCODE_STORAGE_ACCESS_KEY_ID`、`OPENCODE_STORAGE_SECRET_ACCESS_KEY` 生成 AWS S3 endpoint [E: packages/enterprise/src/core/storage.ts:66] [E: packages/enterprise/src/core/storage.ts:67] [E: packages/enterprise/src/core/storage.ts:68] [E: packages/enterprise/src/core/storage.ts:71] [E: packages/enterprise/src/core/storage.ts:72] [E: packages/enterprise/src/core/storage.ts:74]。`r2()` 从 `OPENCODE_STORAGE_ACCOUNT_ID` 和同一组 access key 生成 Cloudflare R2 endpoint [E: packages/enterprise/src/core/storage.ts:77] [E: packages/enterprise/src/core/storage.ts:78] [E: packages/enterprise/src/core/storage.ts:80] [E: packages/enterprise/src/core/storage.ts:81] [E: packages/enterprise/src/core/storage.ts:83]。`adapter` 只接受 `OPENCODE_STORAGE_ADAPTER === "r2"` 或 `"s3"`，否则抛 `No storage adapter configured` [E: packages/enterprise/src/core/storage.ts:86] [E: packages/enterprise/src/core/storage.ts:88] [E: packages/enterprise/src/core/storage.ts:89] [E: packages/enterprise/src/core/storage.ts:90]。

## 控制流

1. `Share.create({ sessionID })` 在 test 或 `sessionID` 以 `test_` 开头时生成 `test_` 前缀 id，否则用 session id 末 8 位；它同时生成 random UUID secret [E: packages/enterprise/src/core/share.ts:117] [E: packages/enterprise/src/core/share.ts:118] [E: packages/enterprise/src/core/share.ts:120] [E: packages/enterprise/src/core/share.ts:122]。
2. `Share.create` 先 `get(info.id)` 检查重复，重复时抛 `Errors.AlreadyExists`，成功时写 `share/{id}` 和空 `share_snapshot/{id}` [E: packages/enterprise/src/core/share.ts:124] [E: packages/enterprise/src/core/share.ts:125] [E: packages/enterprise/src/core/share.ts:126]。
3. `Share.sync` 校验 share 存在和 secret 匹配，再读取 snapshot；snapshot 不存在时回退 `legacy(shareID)`，最后写入 `merge(data, input.data)` 的新 snapshot [E: packages/enterprise/src/core/share.ts:156] [E: packages/enterprise/src/core/share.ts:162] [E: packages/enterprise/src/core/share.ts:163] [E: packages/enterprise/src/core/share.ts:164] [E: packages/enterprise/src/core/share.ts:165] [E: packages/enterprise/src/core/share.ts:166]。
4. `Share.data(shareID)` 同样优先读 snapshot，缺失时执行 legacy migration path [E: packages/enterprise/src/core/share.ts:170] [E: packages/enterprise/src/core/share.ts:171]。
5. `legacy(shareID)` 读取 `share_compaction/{shareID}`，再 list `share_event/{shareID}` 且只取 `before: compaction.event` 的 events；如果 events 为空但 compaction 有数据，会写入 snapshot [E: packages/enterprise/src/core/share.ts:86] [E: packages/enterprise/src/core/share.ts:87] [E: packages/enterprise/src/core/share.ts:91] [E: packages/enterprise/src/core/share.ts:92] [E: packages/enterprise/src/core/share.ts:93] [E: packages/enterprise/src/core/share.ts:95] [E: packages/enterprise/src/core/share.ts:96]。
6. legacy path 有 events 时，把 compaction data 与所有 event data merge，随后同时写 `share_compaction` 和 `share_snapshot` [E: packages/enterprise/src/core/share.ts:100] [E: packages/enterprise/src/core/share.ts:101] [E: packages/enterprise/src/core/share.ts:102] [E: packages/enterprise/src/core/share.ts:107] [E: packages/enterprise/src/core/share.ts:108] [E: packages/enterprise/src/core/share.ts:112]。
7. `Share.remove` 校验 secret 后删除 `share/{id}`，并列出 `share_snapshot`、`share_compaction`、`share_event`、`share_data` 四组 prefix 逐项删除 [E: packages/enterprise/src/core/share.ts:134] [E: packages/enterprise/src/core/share.ts:137] [E: packages/enterprise/src/core/share.ts:138] [E: packages/enterprise/src/core/share.ts:140] [E: packages/enterprise/src/core/share.ts:141] [E: packages/enterprise/src/core/share.ts:142] [E: packages/enterprise/src/core/share.ts:143] [E: packages/enterprise/src/core/share.ts:146]。
8. `Share.removeAdmin` 只接收 share id，读取 share 后用存储中的 secret 复用 `Share.remove` 清理所有 share 数据 [E: packages/enterprise/src/core/share.ts:150] [E: packages/enterprise/src/core/share.ts:151] [E: packages/enterprise/src/core/share.ts:153]。

## API 与 viewer

API route 使用 Hono，挂在 `/api` base path，并开启 CORS 与 OpenAPI doc endpoint [I]。`POST /api/share` 返回 `{ id, secret, url }`，URL 根据 forwarded protocol/host 拼成 `/share/{share.id}` [I]。`POST /api/share/:shareID/sync` 接收 `{ secret, data }` 并调用 `Share.sync`；`GET /api/share/:shareID/data` 设置 `Cache-Control: public, max-age=30, s-maxage=300, stale-while-revalidate=86400` 后返回 `Share.data`；`DELETE /api/share/:shareID` 调用 `Share.remove`；`DELETE /api/support/actions/remove-share` 用 bearer support API key 做 timing-safe 校验后调用 `Share.removeAdmin` [I]。这些事实来自 SolidStart catch-all route source；当前 wiki lint 的 path parser 无法安全处理 bracket route filename，所以这里标为 [I]。

viewer route 的 server query 先 `Share.get(shareID)`，再 `Share.data(shareID)`，把 union data 拆成 `session`、`session_diff`、`session_status`、`message`、`part`、`model` maps，并要求 `session` 列表中能找到 `share.sessionID` [I]。UI 层把结果放入 `DataProvider`，并渲染 `SessionTurn` 与 `SessionReview`，因此 Enterprise viewer 是读-only share renderer，不执行 agent turn [I]。

## 设计动机与权衡

Enterprise share 选择 snapshot-first 模型：新 sync 直接合并到 `share_snapshot/{id}`，legacy event/compaction 只在 snapshot 不存在时迁移 [E: packages/enterprise/src/core/share.ts:78] [E: packages/enterprise/src/core/share.ts:82] [E: packages/enterprise/src/core/share.ts:165] [E: packages/enterprise/src/core/share.ts:166]。测试验证 duplicate part 会被最新数据覆盖，这与 `merge` 的 Map overwrite 行为一致 [E: packages/enterprise/test/core/share.test.ts:156] [E: packages/enterprise/test/core/share.test.ts:180] [E: packages/enterprise/test/core/share.test.ts:189]。

相比公共 Worker 的 `/share_poll` WebSocket model，Enterprise API 没有在 core share 层维护 WebSocket clients；它更适合自托管 viewer 的 pull/read path [I]。storage adapter 通过 S3-compatible endpoint、AWS signing 和 XML list parsing 复用同一 codepath 访问 AWS S3 与 Cloudflare R2；它不依赖 Cloudflare Worker R2 binding API 是从当前 adapter shape 得出的结论 [E: packages/enterprise/src/core/storage.ts:12] [E: packages/enterprise/src/core/storage.ts:40] [E: packages/enterprise/src/core/storage.ts:48] [E: packages/enterprise/src/core/storage.ts:52] [E: packages/enterprise/src/core/storage.ts:66] [E: packages/enterprise/src/core/storage.ts:74] [E: packages/enterprise/src/core/storage.ts:77] [E: packages/enterprise/src/core/storage.ts:83] [E: packages/enterprise/src/core/storage.ts:88] [E: packages/enterprise/src/core/storage.ts:89] [I]。

## Gotcha

- `packages/enterprise/README.md` 仍是 SolidStart scaffold 文案，不是 opencode Enterprise 运维说明；不要把该 README 当业务设计来源 [E: packages/enterprise/README.md:1] [E: packages/enterprise/README.md:3]。
- `Storage.list` 用 regex 从 S3 ListObjectsV2 XML 中提取 `<Key>`，没有通用 XML parser；特殊 XML entity 或 namespace 行为需要审查 [E: packages/enterprise/src/core/storage.ts:50] [E: packages/enterprise/src/core/storage.ts:52] [E: packages/enterprise/src/core/storage.ts:54] [I]。
- `Share.syncOld` 仍存在，会把每个 item 写入 `share_data/...` 分散 key，但主 `Share.sync` 已写 snapshot；读路径 `Share.data` 优先读 snapshot 并在缺失时走 legacy path，不读取 `share_data` 是从当前 `Share.data` body 得出的结论 [E: packages/enterprise/src/core/share.ts:166] [E: packages/enterprise/src/core/share.ts:170] [E: packages/enterprise/src/core/share.ts:171] [E: packages/enterprise/src/core/share.ts:174] [E: packages/enterprise/src/core/share.ts:189] [E: packages/enterprise/src/core/share.ts:193] [E: packages/enterprise/src/core/share.ts:198] [E: packages/enterprise/src/core/share.ts:202] [E: packages/enterprise/src/core/share.ts:205] [I]。

## Sources

- `packages/enterprise/src/core/share.ts`
- `packages/enterprise/src/core/storage.ts`
- `packages/enterprise/package.json`
- `packages/enterprise/README.md`
- `packages/enterprise/test/core/share.test.ts`
- `packages/enterprise/src/routes/api/` catch-all route file
- `packages/enterprise/src/routes/share/` dynamic share route file
- `infra/enterprise.ts`

## 相关

- `server.sharing`：share client 的自托管后端目标；本节点覆盖 Enterprise backend 和 viewer package。
