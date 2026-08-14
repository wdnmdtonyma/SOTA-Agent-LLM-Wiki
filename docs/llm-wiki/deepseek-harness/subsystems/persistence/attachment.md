---
id: subsys.persistence.attachment
title: attachment 附件
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/attachment/attachment/src/index.ts
  - packages/attachment/attachment/src/types.ts
  - packages/attachment/attachment/src/brand.ts
  - packages/attachment/attachment/src/error.ts
  - packages/attachment/attachment-local/src/index.ts
  - packages/attachment/attachment-local/src/store.ts
  - packages/attachment/attachment-local/src/image.ts
  - packages/attachment/attachment-local/tests/store.spec.ts
  - packages/attachment/attachment-local/tests/image.spec.ts
  - packages/attachment/attachment-local/tests/index.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/host/apiproxy/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/host/apiproxy/src/session-export.ts
  - packages/host/apiproxy/tests/api-proxy-models.spec.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/read-image.ts
  - packages/llm/llm/src/types.ts
  - packages/llm/llm/src/content.ts
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/llm/llm-pi-ai/src/adapter.ts
  - packages/llm/llm-pi-ai/src/context.ts
  - packages/llm/llm-deepseek/src/serialize.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/util/home-paths/src/index.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/surface.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-persistence-jsonl/src/index.ts
  - packages/session/session-persistence-sqlite/src/schema.ts
  - packages/session/session-persistence-sqlite/src/index.ts
  - packages/settings/settings/src/index.ts
  - packages/settings/settings/tests/settings.spec.ts
  - packages/credentials/credentials-local/src/index.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/service.ts
symbols:
  - AttachmentStore
  - LocalAttachmentStore
  - AttachmentId
  - AttachmentError
  - ImageAttachmentRef
related:
  - spine.session-log
  - subsys.persistence.session-query
  - subsys.host.apiproxy
  - subsys.core.session
  - spine.capability-seams
  - spine.overview
  - subsys.util.home-paths
  - surface.tools.read-image
  - subsys.llm.pi-ai
  - subsys.persistence.checkpoint
  - subsys.persistence.jsonl
  - subsys.persistence.sqlite
  - subsys.persistence.settings
  - subsys.persistence.credentials
  - subsys.persistence.storage
  - subsys.persistence.workspace
  - subsys.persistence.projection
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.attachments` 是 **host 面** 图片对象缝：Definition 是 `AttachmentStore`（`validateImage` / `saveImage` / `readImage`）；shipped Provider 是 `LocalAttachmentStore`，把解码后的字节写成 `$DSH_HOME/attachments/v1/objects/<aa>/<sha>`。append-only session log 只持 content-addressed `ImageAttachmentRef`（`sha256:<64hex>`），字节不进 `SessionEvent`。这是 Cordis 组合运行时（`profile → bundle → agent preset`）把 raster 从 **model-visible ⟺ logged** 合同里拆出去的一层，不是又一份可就地改写的 chat 数组。

## 能回答的问题

- 图片字节进不进 append-only log？`attachmentId` 长什么样？盘上路径怎么拼？
- `dsh-base` 挂哪一行？`dsh-web-app` / `dsh-headless` 还重挂吗？`ctx` 键是什么？
- `saveImage` 的顺序：decode / 限额 / stage / fsync / hardlink？`readImage` 何时抛 `ATTACHMENT_CORRUPT`？
- 默认 5 MiB / 20 张 / 100 MiB / 40e6 像素各自在哪一层执行？批量限额是 store 还是 ApiProxy？
- `llm/stream` 与 `tools/execute` 上谁必须 `next()`？adapter / `read_image` 何时才碰 `readImage` / `saveImage`？
- 有没有 GC？session-log ZIP 怎样把 log 里的 ref 还原成 `media/` 条目？

## 职责边界

本包拥有：`AttachmentStore` 合同与 `ctx.attachments` 键、content-addressed 本地对象（`saveImageFile` / `readImageFile`）、准入全量 decode（`detectImage`）与读路径 header probe（`probeImage`）、单图字节 / 像素限额、以及 `AttachmentError.code` 的稳定失败词。

本包**不**拥有：`Session.append` / `deriveMessages()` / `SurfaceOp`（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）；`session/event` 入队与 `session/flush` 写窗（[subsys.persistence.session-persistence](session-persistence.md)）；shipped 默认 session 盘 JSONL（base 行 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`；[subsys.persistence.jsonl](jsonl.md)）；在 adapter / top-level tool body **之前**调用 `sessions.flush` 的胶水（[subsys.persistence.checkpoint](checkpoint.md)）；Web prompt 的批量张数 / 合计字节 / canonical base64 / 按 session 授权读图 / ZIP 装配（[subsys.host.apiproxy](../host/apiproxy.md)）；`read_image` 的模型面 schema 与 route 门（[surface.tools.read-image](../../surface/tools/read-image.md)）；FTS / lineage / export 命令（[subsys.persistence.session-query](session-query.md)）；`$DSH_HOME` 解析（[subsys.util.home-paths](../util/home-paths.md)）；未 bundled 的 SQLite session 盘 `SCHEMA_VERSION = 15`（[subsys.persistence.sqlite](sqlite.md)）；settings 分层与 `.credentials.yaml`（[subsys.persistence.settings](settings.md)、[subsys.persistence.credentials](credentials.md)）；**只 web-app** 的 `storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache`（[subsys.persistence.storage](storage.md)、[subsys.persistence.workspace](workspace.md)、[subsys.persistence.projection](projection.md)）。compaction 只有 `surfaceOp: { op: 'replace', start, end }`，没有 delete，也**不**回收 attachment 对象。

`dsh-attachment-local` 是 **host 面**进程级 Provider。agent-preset 面只消费 `ctx.attachments`（`read_image` 在 `ctx.inject(['attachments'])` 里登记），不另造一份 store。默认产品路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI 包。Client 半边不持有 `ctx.attachments`。

正交、写错会污染邻页的事实（本页只点名，不展开实现）：

- shipped session 盘是 base 行 `id: session-persistence-jsonl` / `name: '@deepseek-ai/dsh-session-persistence-jsonl'`，`root: dshHomePath('sessions')`。web-app / headless **不**重挂这一行。附件对象树是 `$DSH_HOME/attachments/v1`，与 `sessions/` 分开。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:99] [E: packages/bundle/base/cordis.patch.yml:101]
- settings 分层：schema defaults → composition `base` → user document。`register` 当时 `resolve(schema, options?.base, this.section(ns))`，实现是 `schema(mergeLayers(base, section))`；`SettingsScope.get` 读 `registration.resolved`。 [E: packages/settings/settings/src/index.ts:447] [E: packages/settings/settings/src/index.ts:458] [E: packages/settings/settings/src/index.ts:705] [E: packages/settings/settings/tests/settings.spec.ts:89]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。`$DSH_HOME/.credentials.yaml` 存的是 secret **值**，不是 ref。 [E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/credentials/credentials-local/src/index.ts:52] [E: packages/credentials/credentials-local/src/index.ts:183]
- `storage` + `storage-json`（`root: dshHomePath('storages')`）+ `storage-domain`、`workspace`、`session-projection-cache` **只 web-app**。base / headless **没有**这些行。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:54] [E: packages/bundle/web-app/cordis.patch.yml:57] [E: packages/bundle/web-app/cordis.patch.yml:59] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/attachment/attachment/src/index.ts` | Definition：`AttachmentStore` 占住 `ctx.attachments` |
| `packages/attachment/attachment/src/types.ts` | `ImageAttachmentRef` / `ImageAttachmentLimits` / `SaveImageAttachment` |
| `packages/attachment/attachment/src/brand.ts` | `AttachmentId` brand |
| `packages/attachment/attachment/src/error.ts` | `AttachmentError`（按 `code` 路由，不按原型链） |
| `packages/attachment/attachment-local/src/index.ts` | Provider：`LocalAttachmentStore`、默认限额常量 |
| `packages/attachment/attachment-local/src/store.ts` | `validateImageFile` / `saveImageFile` / `readImageFile` |
| `packages/attachment/attachment-local/src/image.ts` | `detectImage`（准入全 decode）/ `probeImage`（读路径 header） |
| `packages/bundle/base/cordis.patch.yml` | shipped 行 `id: attachment-local`；同层 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')` |
| `packages/bundle/web-app/cordis.patch.yml` | 不重挂 attachment / jsonl；insert `storage*` / `workspace` / `session-projection-cache`（**只 web-app**）与 `id: api-gateway` |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 `code-runtime` / `headless-startup` / `headless-runner` |
| `packages/settings/settings/src/index.ts` | `SettingsScope.get` / `resolve`：schema defaults → composition `base` → user document |
| `packages/credentials/credentials-local/src/index.ts` | `$DSH_HOME/.credentials.yaml` 存 secret 值 |
| `packages/host/apiproxy/src/api-proxy.ts` | prompt 批量准入、`session.attachment` 授权读、`imageLimits` projection |
| `packages/host/apiproxy/src/session-export.ts` | ZIP 里按 log 收集 ref 再 `readImage` |
| `packages/fs/tool-fs/src/read-image.ts` | `read_image` 在返回 `tool/result` **之前** `saveImage` |
| `packages/llm/llm-pi-ai/src/adapter.ts` | `llm/stream` 下游按 ref `readImage` 再组 provider 请求 |
| `packages/llm/llm-deepseek/src/serialize.ts` | official chat-completions 线拒 `ImageBlock` |
| `packages/session/session-checkpoint-policy/src/index.ts` | waterfall 里 `flush` 后再 `next()` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `AttachmentId` | brand 字符串。本地后端写出 `sha256:` + 64 位小写 hex。 [E: packages/attachment/attachment/src/brand.ts:13] [E: packages/attachment/attachment-local/src/store.ts:19] [E: packages/attachment/attachment-local/src/store.ts:190] |
| `ImageAttachmentRef` | log / RPC 里的整值：`attachmentId` + 已校验 `mediaType` + `bytes` + `width` + `height` + 可选 `name`。没有文件系统路径、没有 URL、没有像素缓冲。 [E: packages/attachment/attachment/src/types.ts:11] [E: packages/attachment/attachment/src/types.ts:13] |
| `ImageMediaType` | `'image/png' \| 'image/jpeg' \| 'image/webp' \| 'image/gif'`。 [E: packages/attachment/attachment/src/types.ts:8] |
| `ImageBlock` | `dsh-llm` 的 content 块 `{ type: 'image', attachment }`。`user/message` / `tool/result` 投影原样带着它；字节在 adapter 侧再解析。 [E: packages/llm/llm/src/types.ts:71] [E: packages/llm/llm/src/types.ts:74] |
| `ImageAttachmentLimits` | `maxImageBytes` / `maxImagesPerMessage` / `maxMessageImageBytes` / `maxImagePixels` / `mediaTypes`。store 的 `save` / `validate` 只用单图字节与像素；`readImageFile` 不接收本结构。张数与合计字节是 ApiProxy 批量门。 [E: packages/attachment/attachment/src/types.ts:27] [E: packages/attachment/attachment-local/src/store.ts:64] [E: packages/attachment/attachment-local/src/store.ts:204] [E: packages/host/apiproxy/src/api-proxy.ts:156] |
| 默认限额 | 5 MiB / 20 张 / 100 MiB / 40_000_000 像素。 [E: packages/attachment/attachment-local/src/index.ts:15] [E: packages/attachment/attachment-local/src/index.ts:17] [E: packages/attachment/attachment-local/src/index.ts:19] [E: packages/attachment/attachment-local/src/index.ts:21] |
| 盘布局 | `root = $DSH_HOME/attachments/v1`；对象 `objects/<sha[0:2]>/<sha>`；staging `tmp/<uuid>`。 [E: packages/attachment/attachment-local/src/index.ts:53] [E: packages/attachment/attachment-local/src/store.ts:37] [E: packages/attachment/attachment-local/src/store.ts:141] |
| `AttachmentError.code` | store：`INVALID_IMAGE` / `IMAGE_TOO_LARGE` / `IMAGE_TOO_MANY_PIXELS` / `IMAGE_TYPE_MISMATCH` / `INVALID_ATTACHMENT_REF` / `ATTACHMENT_CORRUPT` / `ATTACHMENT_NOT_FOUND` / `ATTACHMENT_READ_FAILED` / `ATTACHMENT_WRITE_FAILED`。ApiProxy 另加 `TOO_MANY_IMAGES` / `IMAGES_TOO_LARGE` / `INVALID_IMAGE_BASE64`。 |
| `SESSION_FORMAT_VERSION` | session event 盘为 `0`，没有跨 version migration。shipped 默认 backend 是 base 行 `session-persistence-jsonl`，`root: dshHomePath('sessions')`。与 attachment 对象树、也与 SQLite persistence `SCHEMA_VERSION = 15` 正交。 [E: packages/core/session/src/types.ts:56] [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/session/session-persistence-sqlite/src/schema.ts:20] |
| `SurfaceOp` | `'append'` 或 `{ op: 'replace', start, end }`。**没有 delete。** replace 不回收 attachment 对象。 [E: packages/core/session/src/types.ts:372] [E: packages/core/session/src/types.ts:374] |

## 控制流

1. **host 面挂 Provider。** `dsh-base` 用组合行 `id: attachment-local` / `name: '@deepseek-ai/dsh-attachment-local'` 插入每个 profile 的第一层，**无** `config`。同层还挂 shipped session 盘 `id: session-persistence-jsonl` / `name: '@deepseek-ai/dsh-session-persistence-jsonl'`，`root: dshHomePath('sessions')`——event JSONL 与 attachments 对象树不是同一目录。`dsh-web-app` 与 `dsh-headless` 不重挂 attachment 或 jsonl：web-app 另插 `id: api-gateway`（`@deepseek-ai/dsh-host-apiproxy`），以及 **只 web-app** 的 `storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache`；headless 另插 `code-runtime` / `headless-startup` / `headless-runner`。两边都继承 base 的 `ctx.attachments`。这是进程级服务，不是 preset isolate 里的私有实例。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/base/cordis.patch.yml:106] [E: packages/bundle/base/cordis.patch.yml:107] [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/web-app/cordis.patch.yml:99] [E: packages/bundle/web-app/cordis.patch.yml:100] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

2. **`LocalAttachmentStore` 占住 `ctx.attachments`。** 构造 `super(ctx)` → `AttachmentStore` 调 `super(ctx, 'attachments')`，Cordis `Service` 随即 `ctx.reflect.provide('attachments', self)`。`root` 钉成 `resolve(join(resolveDshHome(config.dshHome), 'attachments', 'v1'))`：显式 `dshHome` 优先，否则非空 `$DSH_HOME`，再回退 `~/.dsh`。`imageLimits` `Object.freeze`，`mediaTypes` 固定四档。 [E: packages/attachment/attachment/src/index.ts:31] [E: packages/attachment/attachment-local/src/index.ts:52] [E: packages/attachment/attachment-local/src/index.ts:53] [E: packages/util/home-paths/src/index.ts:89] [E: vendor/cordis/src/service.ts:57]

3. **Web prompt：先批量门，再逐张 `validateImage`，最后才 `saveImage`。** `ApiProxyService.inject` 硬依赖 `attachments`。`sessions.prompt` 看到任一块 `type: 'image'` 时，`admit` 先用当前 selection 的 `resolveModelInfo` 挡 `MODEL_DOES_NOT_SUPPORT_IMAGES`，再进 `durablePromptContent`：张数 > `maxImagesPerMessage` → `TOO_MANY_IMAGES`；合计字节 > `maxMessageImageBytes` → `IMAGES_TOO_LARGE`；非 canonical base64 → `INVALID_IMAGE_BASE64`。然后对每张 `await validateImage`（全 decode，不碰盘），全部通过后才 `saveImage`，把 `{ type: 'image', attachment }` 推进 inbox（`followup` / `steer`）。`it('validates an ordered image batch before persisting any member')` 先让两张图走通 `validateImage`→`saveImage`，再用三张图打张数门：`TOO_MANY_IMAGES` 之后 `expect(saveImage).toHaveBeenCalledTimes(2)`，被拒的那一批不再 `saveImage`。含图 prompt 与 `selectModel` 共用每-agent 的 `serializeImageAdmission` 串行链，避免换模型与写入对象交错。 [E: packages/host/apiproxy/src/index.ts:71] [E: packages/host/apiproxy/src/api-proxy.ts:156] [E: packages/host/apiproxy/src/api-proxy.ts:157] [E: packages/host/apiproxy/src/api-proxy.ts:164] [E: packages/host/apiproxy/src/api-proxy.ts:168] [E: packages/host/apiproxy/src/api-proxy.ts:180] [E: packages/host/apiproxy/src/api-proxy.ts:185] [E: packages/host/apiproxy/src/api-proxy.ts:2286] [E: packages/host/apiproxy/src/api-proxy.ts:2488] [E: packages/host/apiproxy/src/api-proxy.ts:2516] [E: packages/host/apiproxy/tests/api-proxy-models.spec.ts:187] [E: packages/host/apiproxy/tests/api-proxy-models.spec.ts:193] [E: packages/host/apiproxy/tests/api-proxy-models.spec.ts:195]

4. **`validateImage` 不建 root。** `validateImageFile` 先比 `maxImageBytes`，再 `inspectMetadata`：空字节 / 解不开 / 声明类型与 magic 不符 / `width * height > maxImagePixels` 分别是 `INVALID_IMAGE` / `IMAGE_TYPE_MISMATCH` / `IMAGE_TOO_MANY_PIXELS`。`detectImage` 用 sharp 读完 header 后，像素积超限则抛，再 `image.raw().toBuffer()` 强制全 raster decode。测试：拒图之后 `existsSync(service.root) === false`。 [E: packages/attachment/attachment-local/src/store.ts:51] [E: packages/attachment/attachment-local/src/store.ts:64] [E: packages/attachment/attachment-local/src/store.ts:67] [E: packages/attachment/attachment-local/src/image.ts:56] [E: packages/attachment/attachment-local/src/image.ts:57] [E: packages/attachment/attachment-local/src/image.ts:60] [E: packages/attachment/attachment-local/tests/index.spec.ts:56]

5. **`saveImageFile`：先 decode + 限额，再 stage + fsync + hardlink。** 再次执行与 validate 相同的字节 / 类型 / 像素检查，再 `sha256`。目录：对 `dirname(dirname(root))`（即 DSH_HOME）做一次进程级 `ensureDurableHome`，再 durable 出 `objects/<aa>` 与 `tmp`（`0o700`）。staging 文件 `O_CREAT|O_EXCL|O_WRONLY` `0o600`，`writeFile` + `handle.sync()` 后 `link(temporary, target)`。`EEXIST` 时读已有对象再 hash：对不上 → `ATTACHMENT_CORRUPT`；对上就是去重成功。随后 `syncDirectory(bucket)` 与 `syncDirectory(objects)`，再 `unlink` staging。Win32 上 `syncDirectory` 直接 return（靠 NTFS journaling）。`name` 经 `displayName` 剥掉 `/` 与 `\` 两侧的路径前缀，控制字符清空，最长 255；剥完为空则省略字段。返回的 `attachmentId` 是 `AttachmentId('sha256:' + sha)`。 [E: packages/attachment/attachment-local/src/store.ts:137] [E: packages/attachment/attachment-local/src/store.ts:138] [E: packages/attachment/attachment-local/src/store.ts:152] [E: packages/attachment/attachment-local/src/store.ts:154] [E: packages/attachment/attachment-local/src/store.ts:158] [E: packages/attachment/attachment-local/src/store.ts:163] [E: packages/attachment/attachment-local/src/store.ts:190] [E: packages/attachment/attachment-local/tests/store.spec.ts:111]

6. **log 只拿 ref。** `saveImage` 必须在拥有该图的 session event 被 `append` 之前返回：Web prompt 先 `saveImage` 再 `followup` / `steer`；`read_image` 先 `saveImage` 再 `return value`。loop 随后 `append('user/message' | 'tool/result', …, { surfaceOp: 'append' })`。`deriveEventMessage` 对 `user/message` 原样返回 `event.data`，对 `tool/result` 返回 `event.data.message`——投影里仍是 `ImageAttachmentRef`，没有 base64。`session/event` 是 **emit**（签名没有 `next`，observer 失败不能回滚已提交事件）；`session/flush` 是 **parallel**（没有 `next()`）。JSONL 写出的是带 ref 的 event JSON，不是像素缓冲。attachment store 不监听这两条事件。 [E: packages/host/apiproxy/src/api-proxy.ts:180] [E: packages/fs/tool-fs/src/read-image.ts:191] [E: packages/core/session/src/surface.ts:97] [E: packages/core/session/src/surface.ts:107] [E: packages/core/session/src/index.ts:76] [E: packages/core/session/src/index.ts:85]

7. **checkpoint 在 adapter 与 top-level tool body 之前刷盘。** `dsh-session-checkpoint-policy` 挂三条 **waterfall**：`llm/stream` 能解析到 live session 时 `await sessions.flush` 再 `yield* next()`，flush 失败则 adapter 根本不构造；`tools/execute` 仅 `exec.agent` 存在且 `exec.parent === undefined` 才 flush，abort 则 `TOOL_ABORTED_BEFORE_DISPATCH` 且**不** `next()`，嵌套子调用 0 次额外 flush；`agent/pre-step` 也是 flush 再 `return next()`。Cordis `Events.waterfall` 靠传入的 `next()` 才 `shift`。省略 `next()` = adapter / tool body / 下一步决策都不跑。attachment 自己**不是**这三条链上的 listener。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:65] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72] [E: packages/session/session-checkpoint-policy/src/index.ts:74] [E: packages/session/session-checkpoint-policy/src/index.ts:81] [E: vendor/cordis/src/events.ts:238]

8. **请求期才读字节。** `dsh-llm-pi-ai` 构造时 `resolveAttachments: () => ctx.get('attachments')`。`PiAiAdapter` 在 `llm/stream` 的 `next()` 之后跑：`contentHasImage` 为真且模型 `input` 不含 `'image'` → `UNSUPPORTED_CONTENT`；需要图但 `attachments === undefined` 同样拒。`toPiContext` 对每个 `ImageBlock` `await attachments.readImage(block.attachment)`，把 verified 字节编成 pi-ai 的 base64 `ImageContent`。`dsh-llm-deepseek` 的 `serializeMessages` 在任何扁平化之前 `assertTextOnly`：看见图就抛 `UNSUPPORTED_CONTENT`，避免把 `ImageBlock` 静默抹成空文本。 [E: packages/llm/llm-pi-ai/src/index.ts:203] [E: packages/llm/llm-pi-ai/src/adapter.ts:306] [E: packages/llm/llm-pi-ai/src/adapter.ts:308] [E: packages/llm/llm-pi-ai/src/context.ts:40] [E: packages/llm/llm/src/content.ts:13] [E: packages/llm/llm-deepseek/src/serialize.ts:64] [E: packages/llm/llm-deepseek/src/serialize.ts:66]

9. **`read_image` 是另一条 save 臂。** `dsh-tool-fs` 在 `ctx.inject(['attachments'], …)` 里才登记该工具；没有 store 则模型面看不到这个名字。execute 在任何 `fs.readBytes` 之前先过扩展名 / store / `mediaTypes` / 当前 route `inputModalities`。读盘 cap 是 `min(maxImageBytes, maxMessageImageBytes)`。`saveImage` 成功后才 `return value`；`output.render` 把 value 收成 text envelope + `ImageBlock`，于是 `tool/result` 进 log 时对象已经耐久。本页不写 `read_image` 字段表。 [E: packages/fs/tool-fs/src/index.ts:70] [E: packages/fs/tool-fs/src/read-image.ts:185] [E: packages/fs/tool-fs/src/read-image.ts:191]

10. **`readImageFile`：digest 与 ref 元数据必须同时对上；签名没有限额。** 参数是 `root` / `ref` / 可选 `signal`，没有 `ImageAttachmentLimits`。`LocalAttachmentStore.readImage` 只转发这三项；`saveImage` 才会传入 `this.imageLimits`。`attachmentId` 必须匹配 `^sha256:([a-f0-9]{64})$`，否则 `INVALID_ATTACHMENT_REF`。`ENOENT` → `ATTACHMENT_NOT_FOUND`。读出后立刻 `digest(data) === sha`，失败 → `ATTACHMENT_CORRUPT`。digest 通过后只跑 `probeImage`（header，不再全 raster），再比 `mediaType` / `bytes` / `width` / `height`；任一项与 log 里的 ref 不符仍是 `ATTACHMENT_CORRUPT`。像素门只出现在 `validateImageFile` / `saveImageFile` 的 `inspectMetadata(..., limits.maxImagePixels)`。[I] 读路径没有限额形参，因此无法套用后来收紧的 `maxImageBytes` / `maxImagePixels`。`it('keeps admitted history readable after deployment limits become stricter')` 仍用同一份 `LIMITS` 做 `saveImageFile`，再用两参数 `readImageFile(root, ref)` 读回，不能当作「收紧 `maxImagePixels` 之后旧 ref 仍可读」的回归。`AbortSignal` 转给 `readFile`，取消原因原样抛出。 [E: packages/attachment/attachment-local/src/store.ts:204] [E: packages/attachment/attachment-local/src/store.ts:205] [E: packages/attachment/attachment-local/src/store.ts:206] [E: packages/attachment/attachment-local/src/store.ts:207] [E: packages/attachment/attachment-local/src/index.ts:68] [E: packages/attachment/attachment-local/src/index.ts:72] [E: packages/attachment/attachment-local/src/store.ts:67] [E: packages/attachment/attachment-local/src/store.ts:138] [E: packages/attachment/attachment-local/src/store.ts:210] [E: packages/attachment/attachment-local/src/store.ts:216] [E: packages/attachment/attachment-local/src/store.ts:220] [E: packages/attachment/attachment-local/src/store.ts:224] [E: packages/attachment/attachment-local/src/store.ts:228] [E: packages/attachment/attachment-local/src/image.ts:38] [E: packages/attachment/attachment-local/tests/store.spec.ts:139] [E: packages/attachment/attachment-local/tests/store.spec.ts:141] [E: packages/attachment/attachment-local/tests/store.spec.ts:193]

11. **按 session 授权读图与 ZIP。** `sessions.attachment` 先 `readSessionState`，用 `referencedImage` 扫该 session 全部 event（`content` / `message.content` / inbox `inserted` / `assistant/chunk` 的 `block-end`），对不上 → `ATTACHMENT_NOT_REFERENCED`，对上才 `ctx.attachments.readImage` 并把字节当 base64 交回。session-log ZIP（web-app 下载面）若缺 `sessionQuery` / `sessionPersistence` / `attachments` 直接 500；有服务时 `sessionLogZipEntries` 用 `sessionQuery.traceSession` 拉后代，从 artifact 文本收集去重 ref，最后 `attachments.readImage(ref, signal)` 写成 `media/<attachmentId>.<ext>`。这是 session-query 与 attachment 的交接，不是 FTS。 [E: packages/host/apiproxy/src/api-proxy.ts:2538] [E: packages/host/apiproxy/src/api-proxy.ts:2547] [E: packages/host/apiproxy/src/api-proxy.ts:3645] [E: packages/host/apiproxy/src/session-export.ts:256] [E: packages/host/apiproxy/src/session-export.ts:262]

12. **`imageLimits` 是 boot 常量 projection，不是 attachment 包自己的 unit。** ApiProxy 在 `sessionProjections` 与 `attachments` 同时存在时登记 `key: 'imageLimits'`：`apply` 原样返回 state，`view` 读 live `attachments.imageLimits`。缺任一缝则客户端看不到这个 key。单位本身不监听 `session/event` 做折叠。 [E: packages/host/apiproxy/src/api-proxy.ts:1315] [E: packages/host/apiproxy/src/api-proxy.ts:1317] [E: packages/host/apiproxy/src/api-proxy.ts:1321]

## 设计动机

DSH 把 raster 从 append-only log 里拆出去，是为了让 **model-visible ⟺ logged** 继续成立，同时避免把数兆字节写进每条 `user/message` JSON。log 里的 `ImageBlock.attachment` 是整值、可深冻、可 fork / resume 共享的；真正的像素只在 adapter 组请求、UI 拉历史、ZIP 导出这三条读臂上按 id 取回。换 persistence backend 只换 event 落盘；换 LLM adapter 只换「如何把同一条 ref 变成 provider 字节」；换 attachment Provider 只换对象根与发布原语。

准入全 decode、读路径只 probe，是为了把 decompression bomb 挡在写入之前，又避免每次 replay / export 再付一遍 raster 成本。digest 对不上或 header 与 ref 不一致一律 `ATTACHMENT_CORRUPT`，避免「文件还在、但已不是当初那张图」被静默喂给模型。

批量「先全部 validate 再 save」避免半截 prompt 留下孤儿对象。hardlink 去重让同一张图在多次上传、fork、`read_image` 重读时共享 inode。没有 GC：fork 与冷 resume 仍可能引用同一 `sha256:`，引用计数会跟 session 血统缠在一起。

这跟「内存 messages + 事后把 base64 塞进 transcript」的 peer harness 差在一层：DSH 的 surface 投影永远只有 ref；字节属于 host 面 store，checkpoint 刷的是带 ref 的 event，不是像素。

## Gotcha

- **没有 GC，没有 delete API。** `AttachmentStore` 只有 validate / save / read。`unlink` 只清 staging。compaction 的 `replace` 改的是 `surface.nodes`，不回收 `objects/`。 [E: packages/attachment/attachment/src/index.ts:43] [E: packages/attachment/attachment-local/src/store.ts:171]
- **批量限额不在 `saveImageFile` 里。** store 看见一张就收一张（只拦单图字节 / 像素）。20 张 / 100 MiB 是 `durablePromptContent` 的事；`read_image` 用 `min(maxImageBytes, maxMessageImageBytes)` 当读 cap。 [E: packages/host/apiproxy/src/api-proxy.ts:156] [E: packages/fs/tool-fs/src/read-image.ts:185]
- **`validateImage` 成功 ≠ 已落盘。** 它保证这张图 *能* 写；真正的耐久边界是 `saveImage` 返回之后。validate 失败不得留下 `attachments/v1`。 [E: packages/attachment/attachment-local/tests/index.spec.ts:56]
- **读路径不重新执行限额。** `readImageFile` 签名没有 `limits`；`LocalAttachmentStore.readImage` 也不传入 `imageLimits`。单图字节 / 像素门只在 `validateImageFile` / `saveImageFile` → `inspectMetadata(..., limits.maxImagePixels)` → `detectImage`。[I] 部署后收紧 `maxImagePixels` 拦的是新准入；读路径没有限额参数可用来拒绝旧对象。`it('keeps admitted history readable after deployment limits become stricter')` 只对同一份 `LIMITS` 做 save+read，不是收紧后的证明。 [E: packages/attachment/attachment-local/src/store.ts:204] [E: packages/attachment/attachment-local/src/store.ts:205] [E: packages/attachment/attachment-local/src/store.ts:206] [E: packages/attachment/attachment-local/src/store.ts:207] [E: packages/attachment/attachment-local/src/index.ts:72] [E: packages/attachment/attachment-local/src/store.ts:67] [E: packages/attachment/attachment-local/src/image.ts:57] [E: packages/attachment/attachment-local/tests/store.spec.ts:139] [E: packages/attachment/attachment-local/tests/store.spec.ts:141]
- **`name` 不是路径。** POSIX host 上 `path.basename` 不会切开 Windows `\`；`displayName` 两侧都剥，避免把客户端本地路径写进 log。 [E: packages/attachment/attachment-local/src/store.ts:31]
- **hardlink 撞车必须再验 hash。** `EEXIST` 不是「已经是我」；已有文件 hash 不对就 `ATTACHMENT_CORRUPT`，不能覆盖。 [E: packages/attachment/attachment-local/src/store.ts:163]
- **官方 DeepSeek chat-completions 线不收图。** 看见 `ImageBlock` 抛 `UNSUPPORTED_CONTENT`，不是跳过该块。要走视觉必须是声明了 `image` input 的 pi-ai route，且 host 上挂着 attachments。 [E: packages/llm/llm-deepseek/src/serialize.ts:66]
- **`session/flush` 没有 `next()`。** 把它当成 waterfall、指望「不调用 next 就挡住别人」是错的。耐久否决发生在 `llm/stream` / `tools/execute`：那些 listener 先 `flush` 再决定要不要 `next()`。 [E: packages/core/session/src/index.ts:85] [E: packages/session/session-checkpoint-policy/src/index.ts:36]
- **waterfall 漏 `next()` 等于停整条链。** checkpoint 或 invariant 检查完不 `return next()`，adapter / `read_image` body 不会跑。 [E: vendor/cordis/src/events.ts:238]
- **export 缺缝是 500，不是空 ZIP。** `sessionQuery` / `sessionPersistence` / `attachments` 少一个就不开流。后端 `supportsRawArtifacts` 为假则 501：shipped JSONL 为 `true`，仓库里未 bundled 的 SQLite persistence 为 `false`。 [E: packages/host/apiproxy/src/api-proxy.ts:3645] [E: packages/host/apiproxy/src/api-proxy.ts:3651] [E: packages/session/session-persistence-jsonl/src/index.ts:122] [E: packages/session/session-persistence-sqlite/src/index.ts:100]
- **session event `version` ≠ SQLite `SCHEMA_VERSION` ≠ attachment 目录 `v1`。** 前者钉在 `0` 且无跨 version migration；后者是表布局 15、非 0 且 ≠ 15 就拒盘；`attachments/v1` 只是对象树前缀。 [E: packages/core/session/src/types.ts:56] [E: packages/session/session-persistence-sqlite/src/schema.ts:20] [E: packages/session/session-persistence-sqlite/src/schema.ts:108]
- **配置里的 `CredentialRef` 与本缝无关。** adapter 的 `apiKeyEnv` 走 credentials 缝（`role('credential-ref')`）；`.credentials.yaml` 存 secret 值。attachment 对象树不放密钥。 [E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/credentials/credentials-local/src/index.ts:52] [E: packages/credentials/credentials-local/src/index.ts:183]
- **settings 分层是 schema defaults → composition `base` → user document。** `SettingsScope.get` 读 `resolve` 的结果。漏一层或颠倒顺序会污染 [subsys.persistence.settings](settings.md)。 [E: packages/settings/settings/src/index.ts:447] [E: packages/settings/settings/src/index.ts:705] [E: packages/settings/settings/tests/settings.spec.ts:89]
- **storage / workspace / projection-cache 只 web-app。** `dsh-web-app` 才 insert `storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache`。base / headless 没有这些行。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76]
- **shipped session 盘是 jsonl。** base 挂 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`；web-app / headless 继承，不重挂。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101]

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 / 合同 | base | web-app | headless |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-attachment` 的 `AttachmentStore` / `ImageAttachmentRef` / `AttachmentId` | `ctx.attachments`；方法 `validateImage` / `saveImage` / `readImage`。同 realm 第二份实现抛错 | **无**独立 Cordis 行（类型包，由 Provider 继承时 provide） | 无 | 无 |
| Provider | `@deepseek-ai/dsh-attachment-local` 的 `LocalAttachmentStore` | 同一 `ctx.attachments`。`root = resolveDshHome(…)/attachments/v1`；默认 5 MiB / 20 / 100 MiB / 40e6 | `id: attachment-local`，**无** `config`。同层 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')` | **继承** attachment-local 与 jsonl，不重挂；另 insert `storage*` / `workspace` / `session-projection-cache`（**只 web-app**） | **继承** attachment-local 与 jsonl，不重挂；insert 无 storage / workspace / projection-cache |
| Consumer | `@deepseek-ai/dsh-host-apiproxy`（prompt 批量准入、`session.attachment`、ZIP、`imageLimits` unit）；`@deepseek-ai/dsh-llm-pi-ai`（请求期 `readImage`）；`@deepseek-ai/dsh-tool-fs` 的 `read_image`（`inject(['attachments'])` 后 `saveImage`） | 方法调用，不是 waterfall listener。checkpoint 的 `llm/stream` / `tools/execute` 必须先 `next()`，这些 Consumer 才跑得到 | 无独立 attachment consumer 行 | `id: api-gateway` 吃 `inject: […, 'attachments', …]`；ZIP / 授权读只在这条 host 面 | 无 ApiProxy；仍可通过 preset 里的 `read_image` 与 pi-ai 消费同一 store |

换 Provider 只换对象根与发布原语（另一套 CAS / 远端 blob），不能改 `ImageAttachmentRef` 形状，也不能把像素写回 `SessionEvent`。preset 若再 `provide` 一份 `attachments` 且不 `isolate`，会撞上 host 面 `leakedServices`。[I] `dsh-llm-deepseek` 不是图 Consumer：它在 serialize 入口拒 `ImageBlock`。

## Sources

- packages/attachment/attachment/src/index.ts
- packages/attachment/attachment/src/types.ts
- packages/attachment/attachment/src/brand.ts
- packages/attachment/attachment/src/error.ts
- packages/attachment/attachment-local/src/index.ts
- packages/attachment/attachment-local/src/store.ts
- packages/attachment/attachment-local/src/image.ts
- packages/attachment/attachment-local/tests/store.spec.ts
- packages/attachment/attachment-local/tests/image.spec.ts
- packages/attachment/attachment-local/tests/index.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/host/apiproxy/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/host/apiproxy/src/session-export.ts
- packages/host/apiproxy/tests/api-proxy-models.spec.ts
- packages/fs/tool-fs/src/index.ts
- packages/fs/tool-fs/src/read-image.ts
- packages/llm/llm/src/types.ts
- packages/llm/llm/src/content.ts
- packages/llm/llm-pi-ai/src/index.ts
- packages/llm/llm-pi-ai/src/adapter.ts
- packages/llm/llm-pi-ai/src/context.ts
- packages/llm/llm-deepseek/src/serialize.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/util/home-paths/src/index.ts
- packages/core/session/src/index.ts
- packages/core/session/src/types.ts
- packages/core/session/src/surface.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-persistence-jsonl/src/index.ts
- packages/session/session-persistence-sqlite/src/schema.ts
- packages/session/session-persistence-sqlite/src/index.ts
- packages/settings/settings/src/index.ts
- packages/settings/settings/tests/settings.spec.ts
- packages/credentials/credentials-local/src/index.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/service.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：`user/message` / `tool/result` 如何进 `deriveMessages()`；checkpoint 两个副作用落点；log 不持像素。
- [subsys.persistence.session-query](session-query.md)：`traceSession` 给 ZIP 后代；shipped `openAt: never` 关的是 FTS，不是 attachment 读。
- [subsys.host.apiproxy](../host/apiproxy.md)：`durablePromptContent`、`session.attachment` 授权、session-log ZIP 字节、`imageLimits` projection。
- [subsys.core.session](../core/session.md)：`Session.append`、`session/flush` parallel、`SESSION_FORMAT_VERSION = 0`。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer；host 面 vs agent-preset 面。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；默认产品是 `dsh web`。
- [subsys.util.home-paths](../util/home-paths.md)：`resolveDshHome` / `$DSH_HOME` / `~/.dsh`。
- [surface.tools.read-image](../../surface/tools/read-image.md)：`read_image` 模型面字段与 route 门；本页不写那张表。
- [subsys.llm.pi-ai](../llm/pi-ai.md)：请求期 `readImage` 与 `inputModalities` 含 `image` 的 route。
- [subsys.persistence.checkpoint](checkpoint.md)：`llm/stream` / `tools/execute` 上 `flush` 后再 `next()`。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 session 盘；base 行 `root: dshHomePath('sessions')`。
- [subsys.persistence.sqlite](sqlite.md)：仓库有、bundle 没有；`SCHEMA_VERSION = 15` 非 0 且 ≠ 15 拒盘。
- [subsys.persistence.settings](settings.md)：schema defaults → composition `base` → user document。
- [subsys.persistence.credentials](credentials.md)：配置里 `CredentialRef`；`.credentials.yaml` 存 secret 值。
- [subsys.persistence.storage](storage.md)：非会话 KV **只 web-app**（`storage` + `storage-json` + `storage-domain`）。
- [subsys.persistence.workspace](workspace.md)：**只 web-app** 的 workspace 实体。
- [subsys.persistence.projection](projection.md)：registry 在 base；`session-projection-cache` **只 web-app**。
