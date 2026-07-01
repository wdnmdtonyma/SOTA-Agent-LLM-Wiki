---
id: server.sharing
title: Sharing
kind: subsystem
tier: T2
v: shared
source:
  - packages/opencode/src/share/share-next.ts
  - packages/opencode/src/share/session.ts
  - packages/core/src/share/sql.ts
symbols:
  - ShareNext
  - SessionShare
  - SessionShareTable
related:
  - peripheral.function
  - peripheral.enterprise
evidence: explicit
status: verified
updated: 8b68dc0d7
---

`server.sharing` 描述 session share 的配置、`packages/opencode` runtime services、ShareNext 后端协议和 shared SQL 表。当前源码里实际发起 share HTTP create/sync/remove 的服务在 `packages/opencode/src/share/share-next.ts`: create POST 在 `ShareNext.create`，sync POST 在 `ShareNext.flush`，remove DELETE 在 `ShareNext.remove`；service tag 是 `@opencode/ShareNext`。[E: packages/opencode/src/share/share-next.ts:314][E: packages/opencode/src/share/share-next.ts:259][E: packages/opencode/src/share/share-next.ts:350][E: packages/opencode/src/share/share-next.ts:81]

## V1 / current runtime

### Config and SessionShare

V1 config schema 的 `share` 支持 `"manual" | "auto" | "disabled"`，描述为 manual 允许命令手动分享、auto 自动分享、disabled 禁用全部分享。[E: packages/core/src/v1/config/config.ts:57][E: packages/core/src/v1/config/config.ts:59] `autoshare` 仍在 V1 schema 中，但 description 标为 deprecated，并要求用 `share` 字段替代。[E: packages/core/src/v1/config/config.ts:61][E: packages/core/src/v1/config/config.ts:62]

`SessionShare.share(sessionID)` 读取 config；如果 `conf.share === "disabled"`，它抛出普通 `Error("Sharing is disabled in configuration")`。[E: packages/opencode/src/share/session.ts:26][E: packages/opencode/src/share/session.ts:28] 未禁用时，它调用 `shareNext.create(sessionID)`，再用 `session.setShare({ sessionID, share: { url: result.url } })` 写回 session share URL。[E: packages/opencode/src/share/session.ts:29][E: packages/opencode/src/share/session.ts:30]

`SessionShare.unshare(sessionID)` 调 `shareNext.remove(sessionID)`，再把 session share 字段设为 `undefined`。[E: packages/opencode/src/share/session.ts:34][E: packages/opencode/src/share/session.ts:36]

`SessionShare.create(input)` 先创建 session；如果 `result.parentID` 存在就直接返回；只有 `flags.autoShare` 或 `conf.share === "auto"` 为真时，才 fork `share(result.id)`。[E: packages/opencode/src/share/session.ts:40][E: packages/opencode/src/share/session.ts:41][E: packages/opencode/src/share/session.ts:42][E: packages/opencode/src/share/session.ts:43][E: packages/opencode/src/share/session.ts:44] 因此自动分享只发生在 root session create path，且由 runtime flag 或 `share: "auto"` 触发。[I]

### ShareNext state and API paths

`OPENCODE_DISABLE_SHARE` 为 `"true"` 或 `"1"` 时，ShareNext 的 module-level `disabled` 为真。[E: packages/opencode/src/share/share-next.ts:23] ShareNext state 包含 `queue: Map<SessionID, Map<string, Data>>`、`scope`、`shared: Map<SessionID, Share | null>`。[E: packages/opencode/src/share/share-next.ts:45][E: packages/opencode/src/share/share-next.ts:46][E: packages/opencode/src/share/share-next.ts:47][E: packages/opencode/src/share/share-next.ts:48]

Share data union 包含五种类型: `session`、`message`、`part`、`session_diff`、`model`。[E: packages/opencode/src/share/share-next.ts:51][E: packages/opencode/src/share/share-next.ts:70] API helper 映射 create、sync、remove、data，其中 sync path 是 `/api/${resource}/${shareID}/sync`。[E: packages/opencode/src/share/share-next.ts:85][E: packages/opencode/src/share/share-next.ts:87][E: packages/opencode/src/share/share-next.ts:88][E: packages/opencode/src/share/share-next.ts:89][E: packages/opencode/src/share/share-next.ts:90] `legacyApi = api("share")`，`consoleApi = api("shares")`。[E: packages/opencode/src/share/share-next.ts:94][E: packages/opencode/src/share/share-next.ts:95]

`ShareNext.request()` 在没有 active account 或没有 active org 时，base URL 使用 `enterprise.url` 或 `https://opncd.ai`，API 使用 legacy `/api/share/*`。[E: packages/opencode/src/share/share-next.ts:209][E: packages/opencode/src/share/share-next.ts:211][E: packages/opencode/src/share/share-next.ts:94] 有 active account 和 org 时，它要求 token，设置 Bearer authorization 和 `x-org-id`，并返回 console `/api/shares/*` 与 account URL。[E: packages/opencode/src/share/share-next.ts:214][E: packages/opencode/src/share/share-next.ts:219][E: packages/opencode/src/share/share-next.ts:220][E: packages/opencode/src/share/share-next.ts:221][E: packages/opencode/src/share/share-next.ts:95]

### Create, sync, remove

`ShareNext.create(sessionID)` 在 disabled 时返回空 id/url/secret；enabled 时 POST create endpoint，body 是 `{ sessionID }`，再把返回的 id/secret/url upsert 到 `SessionShareTable`。[E: packages/opencode/src/share/share-next.ts:311][E: packages/opencode/src/share/share-next.ts:314][E: packages/opencode/src/share/share-next.ts:316][E: packages/opencode/src/share/share-next.ts:321][E: packages/opencode/src/share/share-next.ts:322][E: packages/opencode/src/share/share-next.ts:327] 写入 cache 后，它 fork `full(sessionID)` 进行全量同步。[E: packages/opencode/src/share/share-next.ts:330][E: packages/opencode/src/share/share-next.ts:331][E: packages/opencode/src/share/share-next.ts:333]

`full(sessionID)` 读取 session info、diff、messages，并从 user messages 聚合 provider/model pair 后取 models，最终调用 `sync(sessionID, [...])` 发送 session、message、part、session_diff、model 数据。[E: packages/opencode/src/share/share-next.ts:276][E: packages/opencode/src/share/share-next.ts:278][E: packages/opencode/src/share/share-next.ts:283][E: packages/opencode/src/share/share-next.ts:284][E: packages/opencode/src/share/share-next.ts:288][E: packages/opencode/src/share/share-next.ts:292][E: packages/opencode/src/share/share-next.ts:297]

增量 `sync(sessionID, data)` 的 queue key 是 sessionID。已有 queue 时，它按 data item 的 `key(item)` 覆盖 map entry；没有 queue 时，它创建 `new Map(data.map(...))` 并 `s.queue.set(sessionID, next)`，然后延迟 1000ms fork `flush(sessionID)`。[E: packages/opencode/src/share/share-next.ts:131][E: packages/opencode/src/share/share-next.ts:134][E: packages/opencode/src/share/share-next.ts:139][E: packages/opencode/src/share/share-next.ts:142]

`flush(sessionID)` 从 `s.queue.get(sessionID)` 取 pending data，删除该 session 的 queue entry，取 cached share，然后 POST `${req.baseUrl}${req.api.sync(share.id)}`，body 是 `{ secret: share.secret, data: Array.from(queued.values()) }`。[E: packages/opencode/src/share/share-next.ts:250][E: packages/opencode/src/share/share-next.ts:253][E: packages/opencode/src/share/share-next.ts:255][E: packages/opencode/src/share/share-next.ts:259][E: packages/opencode/src/share/share-next.ts:261] 远端 status `>=400` 时只 log warning。[E: packages/opencode/src/share/share-next.ts:265][E: packages/opencode/src/share/share-next.ts:266]

`ShareNext.remove(sessionID)` 在 disabled 时返回；没有 cached share 时删除 cache/queue；有 share 时 DELETE remove endpoint，body 是 `{ secret: share.secret }`，再删除本地 `SessionShareTable` row 和 cache/queue。[E: packages/opencode/src/share/share-next.ts:339][E: packages/opencode/src/share/share-next.ts:343][E: packages/opencode/src/share/share-next.ts:345][E: packages/opencode/src/share/share-next.ts:350][E: packages/opencode/src/share/share-next.ts:352][E: packages/opencode/src/share/share-next.ts:356][E: packages/opencode/src/share/share-next.ts:358]

### Event watcher

`ShareNext.state()` 的 watcher 比较 `event.type !== def.type` 和 `event.location?.directory !== _ctx.directory`，不满足就跳过。[E: packages/opencode/src/share/share-next.ts:170][E: packages/opencode/src/share/share-next.ts:171] 它监听 `Session.Event.Updated`、`MessageV2.Event.Updated`、`MessageV2.Event.PartUpdated`、`Session.Event.Diff`、`Session.Event.Deleted`。[E: packages/opencode/src/share/share-next.ts:179][E: packages/opencode/src/share/share-next.ts:185][E: packages/opencode/src/share/share-next.ts:194][E: packages/opencode/src/share/share-next.ts:197][E: packages/opencode/src/share/share-next.ts:200]

已列 watcher 中没有独立 model event watcher；这是从 watcher 列表得出的范围判断。[I] `model` data 是在 user message update 时，通过 `provider.getModel(info.model.providerID, info.model.modelID)` 后调用 `sync(... { type: "model" })` 产生。[E: packages/opencode/src/share/share-next.ts:185][E: packages/opencode/src/share/share-next.ts:190][E: packages/opencode/src/share/share-next.ts:191]

## V2

V2 config schema 也保留 `share` 的 `"manual" | "auto" | "disabled"` union，description 是控制 session 是否可手动、自动或完全不可分享。[E: packages/core/src/config.ts:47][E: packages/core/src/config.ts:48] V2 config schema 还保留 `enterprise.url`，description 是 enterprise sharing service configuration。[E: packages/core/src/config.ts:50][E: packages/core/src/config.ts:55]

V2 config spec 要求保留 `share`，移除 `autoshare` alias，并说明 `enterprise` 在没有 organization account active 时选择 legacy sharing service endpoint。[E: specs/v2/config.md:150][E: specs/v2/config.md:152][E: specs/v2/config.md:155]

Shared storage 是 `SessionShareTable`。表名是 `session_share`；`session_id` 是 primary key，并 references `SessionTable.id` with cascade delete；`id`、`secret`、`url` 都是 not-null text 字段。[E: packages/core/src/share/sql.ts:5][E: packages/core/src/share/sql.ts:7][E: packages/core/src/share/sql.ts:8][E: packages/core/src/share/sql.ts:9][E: packages/core/src/share/sql.ts:11]

## V1 / V2 对照

| 维度 | V1 runtime | V2 / shared core |
| --- | --- | --- |
| Service | `packages/opencode` runtime 中，`SessionShare` 包装 session create/share/unshare，`ShareNext` 执行 remote create/sync/remove。[E: packages/opencode/src/share/session.ts:48][E: packages/opencode/src/share/share-next.ts:77] | 已读 source 中 V2 明确部分是 config schema 与 SQL table。[E: packages/core/src/config.ts:47][E: packages/core/src/share/sql.ts:5][I] |
| Config | V1 `share` 三态，`autoshare` deprecated。[E: packages/core/src/v1/config/config.ts:57][E: packages/core/src/v1/config/config.ts:61] | V2 spec 保留 `share`，不 port `autoshare`。[E: specs/v2/config.md:150][E: specs/v2/config.md:151] |
| Backend | `api("share")` 生成 legacy `/api/share/*`，`api("shares")` 生成 console `/api/shares/*`；request 分支在无 org/有 org 时选择对应 API。[E: packages/opencode/src/share/share-next.ts:85][E: packages/opencode/src/share/share-next.ts:94][E: packages/opencode/src/share/share-next.ts:95][E: packages/opencode/src/share/share-next.ts:209][E: packages/opencode/src/share/share-next.ts:221] | `enterprise.url` 作为 legacy sharing service selection 保留。[E: specs/v2/config.md:152] |

## Design notes

`manual/auto/disabled` 把“允许显式分享”和“自动分享新 session”分开，降低默认公开会话的风险。[I] ShareNext 的 1000ms delayed flush 和 per-session map overwrite 说明它会在短时间内按 `key(item)` 覆盖同 key share updates；`message` 和 `part` 的 key 包含 message/part id，所以不同 message/part 不会仅因同类型而互相覆盖。[E: packages/opencode/src/share/share-next.ts:97][E: packages/opencode/src/share/share-next.ts:104][E: packages/opencode/src/share/share-next.ts:134][E: packages/opencode/src/share/share-next.ts:142][I]

## Sources

- `packages/opencode/src/share/session.ts`
- `packages/opencode/src/share/share-next.ts`
- `packages/core/src/share/sql.ts`
- `packages/core/src/v1/config/config.ts`
- `packages/core/src/config.ts`
- `specs/v2/config.md`

## Related

- [peripheral.function](../peripheral/function.md)
- [peripheral.enterprise](../peripheral/enterprise.md)
