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
  - packages/attachment/attachment/src/admission.ts
  - packages/attachment/attachment-local/src/index.ts
  - packages/attachment/attachment-local/src/store.ts
  - packages/attachment/attachment-local/src/image.ts
  - packages/attachment/attachment-local/tests/store.spec.ts
  - packages/attachment/attachment-local/tests/index.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/api/session-controller/src/index.ts
  - packages/api/session-controller/src/commands.ts
  - packages/api/session-controller/src/list.ts
  - packages/session-query/session-log-export/src/index.ts
  - packages/session-query/session-log-export/src/archive.ts
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
  - packages/session/session-persistence/src/storage-contract.ts
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
  - admitEncodedImages
  - saveImages
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
updated: d347e70390
---

> `ctx.attachments` 是 **host 面** 图片对象缝：Definition 是 `AttachmentStore`（`validateImage` / `saveImage` / `saveImages` / `readImage`，以及可选的 `readImageRequest` / `imageHostPath`）；shipped Provider 是 `LocalAttachmentStore`，把**归一化后**的字节写成 `$DSH_HOME/attachments/v1/objects/<aa>/<sha>`。append-only session log 只持 content-addressed `ImageAttachmentRef`（`sha256:<64hex>`），字节不进 `SessionEvent`。这是 Cordis 组合运行时把 raster 从 **model-visible ⟺ logged** 合同里拆出去的一层。

## 能回答的问题

- 图片字节进不进 append-only log？`attachmentId` 长什么样？盘上路径怎么拼？归一化改不改 digest？
- `dsh-base` 挂哪一行？web / headless / sdk / acp 还重挂吗？`sdk-minimal` 有没有 store？
- `saveImages` 的顺序：batch 限额 / 并行 prepare / 串行 commit？`readImage` 何时抛 `ATTACHMENT_CORRUPT`？
- 默认 20 MiB / 20 张 / 200 MiB / 64e6 像素 / 8192 边长各自在哪一层执行？
- 浏览器 prompt 走 `admitEncodedImages` 还是手写批量门？`session.attachment` 与 ZIP 谁读字节？
- `llm/stream` 与 `tools/execute` 上谁必须 `next()`？adapter 用 `readImage` 还是 `readImageRequest`？

## 职责边界

本包拥有：`AttachmentStore` 合同与 `ctx.attachments` 键、content-addressed 本地对象（`prepareImageFile` / `commitPreparedImageFile` / `readImageFile`）、准入全量 decode（`detectImage`）与读路径 header probe（`probeImage`）、单图字节 / 像素 / 边长限额、**批次**张数与合计字节（`validateImageBatch`）、wire base64 准入（`admitEncodedImages`）、归一化策略与请求期投影（`readImageRequest`）、以及 `AttachmentError.code` 的稳定失败词。

本包**不**拥有：`Session.append` / `deriveMessages()` / `SurfaceOp`（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）；`session/event` 入队与 `session/flush` 写窗（[subsys.persistence.session-persistence](session-persistence.md)）；shipped 默认 session 盘 JSONL（base 行 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`；[subsys.persistence.jsonl](jsonl.md)）；在 adapter / top-level tool body **之前**调用 `sessions.flush` 的胶水（[subsys.persistence.checkpoint](checkpoint.md)）；Web Remote prompt / 按 session 授权读图（[subsys.host.apiproxy](../host/apiproxy.md)，现实现为 `dsh-api-session-controller`）；session-log ZIP（`dsh-session-log-export`）；`read_image` 的模型面 schema 与 route 门（[surface.tools.read-image](../../surface/tools/read-image.md)）；FTS / lineage（[subsys.persistence.session-query](session-query.md)）；`$DSH_HOME` 解析（[subsys.util.home-paths](../util/home-paths.md)）；已删除的 session SQLite persistence（退役页 [subsys.persistence.sqlite](sqlite.md)）；settings 分层与 `.credentials.yaml`（[subsys.persistence.settings](settings.md)、[subsys.persistence.credentials](credentials.md)）。compaction 只有 `surfaceOp: { op: 'replace', start, end }`，没有 delete，也**不**回收 attachment 对象。

`dsh-attachment-local` 是 **host 面**进程级 Provider。agent-preset 面只消费 `ctx.attachments`（`read_image` 在 `ctx.inject(['attachments'])` 里登记），不另造一份 store。五个 shipped profile：`web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。Client 半边不持有 `ctx.attachments`。

正交、写错会污染邻页的事实（本页只点名，不展开实现）：

- shipped session 盘是 base 行 `id: session-persistence-jsonl` / `name: '@deepseek-ai/dsh-session-persistence-jsonl'`，`root: dshHomePath('sessions')`。附件对象树是 `$DSH_HOME/attachments/v1`，与 `sessions/` 分开。 [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:113] [E: packages/bundle/base/cordis.patch.yml:118]
- settings 分层：schema defaults → composition `base` → user document。`register` 当时 `resolve(...)` 写入 `registration.resolved`；`SettingsScope.get` 读该字段。 [E: packages/settings/settings/src/index.ts:436] [E: packages/settings/settings/src/index.ts:447] [E: packages/settings/settings/tests/settings.spec.ts:89]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。`$DSH_HOME/.credentials.yaml` 存的是 secret **值**，不是 ref。 [E: packages/llm/llm-deepseek/src/index.ts:178] [E: packages/credentials/credentials-local/src/index.ts:61] [E: packages/credentials/credentials-local/src/index.ts:90]
- `storage` + `storage-json`（`root: dshHomePath('storages')`）+ `storage-domain` 以及 `session-projection-cache` 在 **base**。`workspace` 仍是 web-app insert。headless overlay 不重挂 attachment。 [E: packages/bundle/base/cordis.patch.yml:145] [E: packages/bundle/base/cordis.patch.yml:148] [E: packages/bundle/base/cordis.patch.yml:162] [E: packages/bundle/web-app/cordis.patch.yml:61] [E: packages/bundle/headless/cordis.patch.yml:19]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/attachment/attachment/src/index.ts` | Definition：`AttachmentStore` 占住 `ctx.attachments`；默认 `saveImages` / `validateImageBatch` |
| `packages/attachment/attachment/src/types.ts` | `ImageAttachmentRef` / `ImageAttachmentLimits` / `ImageRequestPolicy` |
| `packages/attachment/attachment/src/admission.ts` | `admitEncodedImages`：canonical base64 再 `saveImages` |
| `packages/attachment/attachment/src/brand.ts` | `AttachmentId` / `ImageVariantId` |
| `packages/attachment/attachment/src/error.ts` | `AttachmentError`（按 `code` 路由） |
| `packages/attachment/attachment-local/src/index.ts` | Provider：`LocalAttachmentStore`、默认限额与归一化常量 |
| `packages/attachment/attachment-local/src/store.ts` | `prepareImageFile` / `commitPreparedImageFile` / `readImageFile` |
| `packages/attachment/attachment-local/src/image.ts` | `detectImage`（准入全 decode）/ `probeImage`（读路径 header） |
| `packages/bundle/base/cordis.patch.yml` | shipped 行 `id: attachment-local`（无 config） |
| `packages/bundle/web-app/cordis.patch.yml` | 不重挂 attachment；insert `session-controller` / `session-log-download` / `workspace` |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 `code-runtime` / `headless-startup` / `headless-runner` |
| `packages/api/session-controller/src/commands.ts` | prompt 走 `admitEncodedImages`；`attachment` 授权读 |
| `packages/session-query/session-log-export/src/archive.ts` | ZIP 里按 artifact 收集 ref 再 `readImage` |
| `packages/fs/tool-fs/src/read-image.ts` | `read_image` 在返回 **之前** `saveImage` |
| `packages/llm/llm-pi-ai/src/context.ts` | 请求期 `readImageRequest` |
| `packages/llm/llm-deepseek/src/serialize.ts` | official chat-completions 线拒 `ImageBlock` |
| `packages/session/session-checkpoint-policy/src/index.ts` | waterfall 里 `flush` 后再 `next()` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `AttachmentId` | brand 字符串。本地后端写出 `sha256:` + 64 位小写 hex（**归一化后**字节的 digest）。 [E: packages/attachment/attachment/src/brand.ts:13] [E: packages/attachment/attachment-local/src/store.ts:22] [E: packages/attachment/attachment-local/src/store.ts:115] |
| `ImageAttachmentRef` | log / RPC 里的整值：`attachmentId` + 已校验 `mediaType` + `bytes` + `width` + `height` + 可选 `name` + 可选 `originalDimensions`。没有文件系统路径、没有 URL、没有像素缓冲。 [E: packages/attachment/attachment/src/types.ts:11] [E: packages/attachment/attachment/src/types.ts:13] |
| `ImageMediaType` | `'image/png' \| 'image/jpeg' \| 'image/webp' \| 'image/gif'`。 [E: packages/attachment/attachment/src/types.ts:8] |
| `ImageBlock` | `dsh-llm` 的 content 块 `{ type: 'image', attachment }`。`user/message` / `tool/result` 投影原样带着它。 [E: packages/llm/llm/src/types.ts:71] [E: packages/llm/llm/src/types.ts:74] |
| `ImageAttachmentLimits` | `maxImageBytes` / `maxImagesPerMessage` / `maxMessageImageBytes` / `maxImagePixels` / `maxImageDimension` / `mediaTypes`。store 的 `validateImageBatch` 拦张数、合计字节、类型；单图字节 / 像素 / 边长在 `prepareImageFile`。`readImageFile` 不接收本结构。 [E: packages/attachment/attachment/src/types.ts:39] [E: packages/attachment/attachment/src/index.ts:66] [E: packages/attachment/attachment-local/src/store.ts:104] [E: packages/attachment/attachment-local/src/store.ts:281] |
| 默认限额（提交侧） | 20 MiB / 20 张 / 200 MiB / 64_000_000 像素 / 8192 边长。 [E: packages/attachment/attachment-local/src/index.ts:28] [E: packages/attachment/attachment-local/src/index.ts:30] [E: packages/attachment/attachment-local/src/index.ts:31] [E: packages/attachment/attachment-local/src/index.ts:34] [E: packages/attachment/attachment-local/src/index.ts:36] |
| 归一化默认 | 存储图 2048×2048 像素预算、长边 8192、编码目标 4 MiB；压缩并发默认 2、上限 8。 [E: packages/attachment/attachment-local/src/index.ts:42] [E: packages/attachment/attachment-local/src/index.ts:50] [E: packages/attachment/attachment-local/src/index.ts:50] [E: packages/attachment/attachment-local/src/index.ts:50] [E: packages/attachment/attachment-local/src/index.ts:52] |
| 盘布局 | `root = $DSH_HOME/attachments/v1`；对象 `objects/<sha[0:2]>/<sha>`；staging `tmp/<uuid>`。 [E: packages/attachment/attachment-local/src/index.ts:170] [E: packages/attachment/attachment-local/src/store.ts:200] [E: packages/attachment/attachment-local/src/store.ts:201] |
| `AttachmentError.code` | 准入：`TOO_MANY_IMAGES` / `IMAGES_TOO_LARGE` / `UNSUPPORTED_IMAGE_TYPE` / `INVALID_IMAGE_BASE64` / `INVALID_IMAGE` / `IMAGE_TYPE_MISMATCH` / `IMAGE_TOO_LARGE` / `IMAGE_TOO_MANY_PIXELS` / `IMAGE_DIMENSION_TOO_LARGE`。存储：`INVALID_ATTACHMENT_REF` / `ATTACHMENT_CORRUPT` / `ATTACHMENT_NOT_FOUND` / `ATTACHMENT_READ_FAILED` / `ATTACHMENT_WRITE_FAILED` / `ATTACHMENT_PROJECTION_UNSUPPORTED`。 [E: packages/attachment/attachment/src/error.ts:3] [E: packages/attachment/attachment/src/error.ts:19] |
| `SESSION_FORMAT_VERSION` | session event 逻辑盘为 `2`。shipped 默认 backend 是 jsonl。与 attachment `v1` 正交。 [E: packages/core/session/src/types.ts:86] [E: packages/bundle/base/cordis.patch.yml:110] |
| `SurfaceOp` | `'append'` 或 `{ op: 'replace', start, end }`。**没有 delete。** replace 不回收 attachment 对象。 [E: packages/core/session/src/types.ts:416] [E: packages/core/session/src/types.ts:418] |

## 控制流

1. **host 面挂 Provider。** `dsh-base` 用组合行 `id: attachment-local` / `name: '@deepseek-ai/dsh-attachment-local'` 插入每个 **叠 base** 的 profile 的第一层，**无** `config`。同层还挂 `id: session-persistence-jsonl`。`dsh-web-app` 不重挂 attachment：另插 `id: session-controller`、`id: session-log-download`、`id: workspace`。`dsh-headless` 另插 `code-runtime` / `headless-startup` / `headless-runner`。`sdk` / `acp` 同样继承 base。`sdk-minimal` **不**叠 `dsh-base`，其 patch 没有 `attachment-local` 行。这是进程级服务，不是 preset isolate 里的私有实例。 [E: packages/bundle/base/cordis.patch.yml:118] [E: packages/bundle/base/cordis.patch.yml:119] [E: packages/bundle/web-app/cordis.patch.yml:58] [E: packages/bundle/web-app/cordis.patch.yml:86] [E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/headless/cordis.patch.yml:22] [E: packages/bundle/headless/cordis.patch.yml:26]

2. **`LocalAttachmentStore` 占住 `ctx.attachments`。** 构造 `super(ctx)` → `AttachmentStore` 调 `super(ctx, 'attachments')`，Cordis `Service` 随即 `ctx.reflect.provide('attachments', self)`。`root` 钉成 `resolve(join(resolveDshHome(config.dshHome), 'attachments', 'v1'))`：显式 `dshHome` 优先，否则非空 `$DSH_HOME`，再回退 `~/.dsh`。`imageLimits` `Object.freeze`，`mediaTypes` 固定四档。 [E: packages/attachment/attachment/src/index.ts:40] [E: packages/attachment/attachment-local/src/index.ts:170] [E: packages/util/home-paths/src/index.ts:89] [E: vendor/cordis/src/service.ts:57]

3. **Web prompt：`admitEncodedImages` → `saveImages`。** `SessionController.inject` 硬依赖 `attachments`。`prompt` 看到任一块 `type: 'image'` 时，先用当前 selection 的 `resolveModelInfo` 挡 `MODEL_DOES_NOT_SUPPORT_IMAGES`，再 `durablePromptContent`：canonical base64 失败是 `INVALID_IMAGE_BASE64`；张数 / 合计字节 / 类型由 `validateImageBatch` 抛 `TOO_MANY_IMAGES` / `IMAGES_TOO_LARGE` / `UNSUPPORTED_IMAGE_TYPE`。然后对每张 `validateImage`，全部通过后才 `saveImage`（本地后端覆盖为并行 `prepareImageFile` + 串行 `commitPreparedImageFile`）。含图 prompt 走 `serializeImageAdmission` 串行链。 [E: packages/api/session-controller/src/index.ts:87] [E: packages/api/session-controller/src/commands.ts:308] [E: packages/api/session-controller/src/commands.ts:314] [E: packages/api/session-controller/src/commands.ts:322] [E: packages/api/session-controller/src/commands.ts:335] [E: packages/attachment/attachment/src/admission.ts:35] [E: packages/attachment/attachment/src/index.ts:85] [E: packages/attachment/attachment-local/src/index.ts:200]

4. **`validateImage` 不建 root。** `validateImageFile` 委托 `prepareImageFile`：先比 `maxImageBytes`，再 `inspectMetadata`：空字节 / 解不开 / 声明类型与 magic 不符 / `width * height > maxImagePixels` / 边长超 `maxImageDimension` 分别是 `INVALID_IMAGE` / `IMAGE_TYPE_MISMATCH` / `IMAGE_TOO_MANY_PIXELS` / `IMAGE_DIMENSION_TOO_LARGE`。`detectImage` 读完 header 后套限额，再 `image.raw().toBuffer()` 强制全 raster decode。测试：拒图之后 `existsSync(service.root) === false`。 [E: packages/attachment/attachment-local/src/store.ts:81] [E: packages/attachment/attachment-local/src/store.ts:104] [E: packages/attachment/attachment-local/src/image.ts:118] [E: packages/attachment/attachment-local/src/image.ts:124] [E: packages/attachment/attachment-local/tests/index.spec.ts:149]

5. **`commitPreparedImageFile`：stage + fsync + hardlink。** `prepareImageFile` 已 decode + 限额 + `normalizeImage` + `sha256`。目录：对 `dirname(dirname(root))`（即 DSH_HOME）做一次进程级 `ensureDurableHome`，再 durable 出 `objects/<aa>` 与 `tmp`（`0o700`）。staging 文件 `O_CREAT|O_EXCL|O_WRONLY` `0o600`，`writeFile` + `handle.sync()` 后 `link(temporary, target)`。`EEXIST` 时读已有对象再 hash：对不上 → `ATTACHMENT_CORRUPT`；对上就是去重成功。随后 `unlink` staging、`chmod` `0o400`，再 `syncDirectory(bucket)` 与 `syncDirectory(objects)`。Win32 上 `syncDirectory` 直接 return。`name` 经 `displayName` 剥掉 `/` 与 `\` 两侧的路径前缀，控制字符清空，最长 255。返回的 `attachmentId` 是 `AttachmentId('sha256:' + sha)`。 [E: packages/attachment/attachment-local/src/store.ts:201] [E: packages/attachment/attachment-local/src/store.ts:214] [E: packages/attachment/attachment-local/src/store.ts:218] [E: packages/attachment/attachment-local/src/store.ts:223] [E: packages/attachment/attachment-local/src/store.ts:115] [E: packages/attachment/attachment-local/src/store.ts:34]

6. **log 只拿 ref。** `saveImage` / `saveImages` 必须在拥有该图的 session event 被 `append` 之前返回：Web prompt 先 `admitEncodedImages` 再 `followup` / `steer`；`read_image` 先 `saveImage` 再 `return value`。`deriveEventMessage` 对 `user/message` 原样返回 `event.data`，对 `tool/result` 返回 `event.data.message`——投影里仍是 `ImageAttachmentRef`。`session/event` 是 **emit**；`session/flush` 是 **parallel**（没有 `next()`）。 [E: packages/api/session-controller/src/commands.ts:322] [E: packages/fs/tool-fs/src/read-image.ts:220] [E: packages/core/session/src/surface.ts:94] [E: packages/core/session/src/surface.ts:106] [E: packages/core/session/src/index.ts:73] [E: packages/core/session/src/index.ts:82]

7. **checkpoint 在 adapter 与 top-level tool body 之前刷盘。** `dsh-session-checkpoint-policy` 挂三条 **waterfall**：`llm/stream` 能解析到 live session 时 `await sessions.flush` 再 `yield* next()`；`tools/execute` 仅 `exec.agent` 存在且 `exec.parent === undefined` 才 flush，abort 则 `TOOL_ABORTED_BEFORE_DISPATCH` 且**不** `next()`；`agent/pre-step` 也是 flush 再 `return next()`。Cordis `Events.waterfall` 靠传入的 `next()` 才 `shift`。attachment 自己**不是**这三条链上的 listener。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72] [E: packages/session/session-checkpoint-policy/src/index.ts:74] [E: packages/session/session-checkpoint-policy/src/index.ts:81] [E: vendor/cordis/src/events.ts:238]

8. **请求期读的是投影，不是原始提交字节。** `dsh-llm-pi-ai` 构造时 `resolveAttachments: () => ctx.get('attachments')`。`PiAiAdapter` 在 `llm/stream` 的下游跑：`contentHasImage` 为真且模型 `input` 不含 `'image'` → `UNSUPPORTED_CONTENT`；需要图但 store 缺失同样拒。`toPiContext` 对每个 ref `attachments.readImageRequest(ref, policy)`，把 route 像素预算 / 编码目标下的变体编成 provider 输入。基类默认 `readImageRequest` 抛 `ATTACHMENT_PROJECTION_UNSUPPORTED`；本地后端才实现。`dsh-llm-deepseek` 的 `serializeMessages` 在任何扁平化之前 `assertTextOnly`：看见图就抛 `UNSUPPORTED_CONTENT`。 [E: packages/llm/llm-pi-ai/src/index.ts:201] [E: packages/llm/llm-pi-ai/src/adapter.ts:353] [E: packages/llm/llm-pi-ai/src/adapter.ts:355] [E: packages/llm/llm-pi-ai/src/context.ts:112] [E: packages/llm/llm/src/content.ts:126] [E: packages/attachment/attachment/src/index.ts:137] [E: packages/llm/llm-deepseek/src/serialize.ts:111] [E: packages/llm/llm-deepseek/src/serialize.ts:249]

9. **`read_image` 是另一条 save 臂。** `dsh-tool-fs` 在 `ctx.inject(['attachments'], …)` 里才登记该工具。execute 在任何 `fs.readBytes` 之前先过扩展名 / store / `mediaTypes` / 当前 route。读盘 cap 是 `min(maxImageBytes, maxMessageImageBytes)`。`saveImage` 成功后才 `return value`。本页不写 `read_image` 字段表。 [E: packages/fs/tool-fs/src/index.ts:70] [E: packages/fs/tool-fs/src/read-image.ts:214] [E: packages/fs/tool-fs/src/read-image.ts:220]

10. **`readImageFile`：digest 与 ref 元数据必须同时对上；签名没有限额。** 参数是 `root` / `ref` / 可选 `signal`。`LocalAttachmentStore.readImage` 只转发这三项。`attachmentId` 必须匹配 `^sha256:([a-f0-9]{64})$`，否则 `INVALID_ATTACHMENT_REF`。`ENOENT` → `ATTACHMENT_NOT_FOUND`。读出后立刻 `digest(data) === sha`，失败 → `ATTACHMENT_CORRUPT`。digest 通过后只跑 `probeImage`，再比 `mediaType` / `bytes` / `width` / `height`。像素 / 边长门只出现在准入。`it('keeps admitted history readable after deployment limits become stricter')` 仍用同一份 `LIMITS` 做 save+read。[I] 读路径没有限额形参，因此无法套用后来收紧的 `maxImageBytes` / `maxImagePixels`。 [E: packages/attachment/attachment-local/src/store.ts:281] [E: packages/attachment/attachment-local/src/store.ts:287] [E: packages/attachment/attachment-local/src/store.ts:293] [E: packages/attachment/attachment-local/src/store.ts:298] [E: packages/attachment/attachment-local/src/store.ts:300] [E: packages/attachment/attachment-local/src/index.ts:218] [E: packages/attachment/attachment-local/tests/store.spec.ts:175]

11. **按 session 授权读图与 ZIP。** `SessionCommandController.attachment` 先 `readSessionState`，用 `referencedImage` 扫该 session 全部 event，对不上 → Remote `ATTACHMENT_NOT_REFERENCED`，对上才 `ctx.attachments.readImage` 并把字节当 base64 交回。session-log ZIP（web-app 的 `dsh-session-log-export`）若缺 `sessionQuery` / `sessionPersistence` / `attachments` 直接 500；`supportsRawArtifacts` 为假则 501；有服务时 `sessionLogZipEntries` 用 `sessionQuery.traceSession` 拉后代，从 artifact 文本收集去重 ref，最后 `attachments.readImage(ref, signal)` 写成 `media/<attachmentId>.<ext>`。 [E: packages/api/session-controller/src/commands.ts:343] [E: packages/api/session-controller/src/commands.ts:357] [E: packages/api/session-controller/src/commands.ts:367] [E: packages/session-query/session-log-export/src/index.ts:116] [E: packages/session-query/session-log-export/src/index.ts:124] [E: packages/session-query/session-log-export/src/archive.ts:110] [E: packages/session-query/session-log-export/src/archive.ts:219] [E: packages/session-query/session-log-export/src/archive.ts:257] [E: packages/session-query/session-log-export/src/archive.ts:260]

12. **`imageLimits` 是 boot 常量 projection。** Session Controller 在 `ctx.inject(['attachments'], …)` 时登记 `key: 'imageLimits'`：`apply` 原样返回 state，`view` 读 live `attachments.imageLimits`。缺 attachments 缝则客户端看不到这个 key。 [E: packages/api/session-controller/src/list.ts:98] [E: packages/api/session-controller/src/list.ts:98] [E: packages/api/session-controller/src/list.ts:108] [E: packages/api/session-controller/src/list.ts:108]

## 设计动机

DSH 把 raster 从 append-only log 里拆出去，是为了让 **model-visible ⟺ logged** 继续成立，同时避免把数兆字节写进每条 `user/message` JSON。log 里的 `ImageBlock.attachment` 是整值、可深冻、可 fork / resume 共享的；真正的像素只在 adapter 组请求、UI 拉历史、ZIP 导出这三条读臂上按 id 取回。换 persistence backend 只换 event 落盘；换 LLM adapter 只换「如何把同一条 ref 变成 provider 字节」；换 attachment Provider 只换对象根、归一化与发布原语。

准入全 decode、读路径只 probe，是为了把 decompression bomb 挡在写入之前，又避免每次 replay / export 再付一遍 raster 成本。digest 对不上或 header 与 ref 不一致一律 `ATTACHMENT_CORRUPT`。提交图可以大于存储图：归一化按像素预算缩小，digest 钉在归一化后的字节上；`originalDimensions` 只在缩小发生时记录。

批量「先全部 validate / prepare 再 commit」避免半截 prompt 留下孤儿对象。hardlink 去重让同一张归一化图在多次上传、fork、`read_image` 重读时共享 inode。没有 GC：fork 与冷 resume 仍可能引用同一 `sha256:`。

请求期走独立 `ImageRequestPolicy`（route 像素预算 + 编码目标），与存储归一化分开，避免把每个 provider 的尺寸方言写进 log。

## Gotcha

- **没有 GC，没有 delete API。** `AttachmentStore` 公开 validate / save / read（及可选投影）。`unlink` 只清 staging。compaction 的 `replace` 改的是 `surface.nodes`，不回收 `objects/`。 [E: packages/attachment/attachment/src/index.ts:52] [E: packages/attachment/attachment-local/src/store.ts:227]
- **批次限额现在在 Definition 的 `validateImageBatch`。** 张数 / 合计字节 / 类型不再是已删除的 ApiProxy 私有门。单图字节 / 像素 / 边长仍在 `prepareImageFile`。`read_image` 用 `min(maxImageBytes, maxMessageImageBytes)` 当读 cap。 [E: packages/attachment/attachment/src/index.ts:66] [E: packages/attachment/attachment/src/index.ts:66] [E: packages/fs/tool-fs/src/read-image.ts:214]
- **`validateImage` 成功 ≠ 已落盘。** 它保证这张图 *能* 写（含归一化能过字节帽）；真正的耐久边界是 `saveImage` / `saveImages` 返回之后。validate / 失败的 batch 不得留下 `attachments/v1`。 [E: packages/attachment/attachment-local/tests/index.spec.ts:149] [E: packages/attachment/attachment-local/tests/index.spec.ts:156]
- **读路径不重新执行限额。** `readImageFile` 签名没有 `limits`。单图门只在准入。`it('keeps admitted history readable after deployment limits become stricter')` 只对同一份 `LIMITS` 做 save+read。 [E: packages/attachment/attachment-local/src/store.ts:281] [E: packages/attachment/attachment-local/src/index.ts:218] [E: packages/attachment/attachment-local/tests/store.spec.ts:175]
- **digest 钉的是归一化后的字节。** 提交 PNG 过大时存储副本可以更小；log 里的 `bytes` / `width` / `height` 描述存储对象，缩小才写 `originalDimensions`。 [E: packages/attachment/attachment-local/src/store.ts:108] [E: packages/attachment/attachment-local/src/store.ts:111]
- **`name` 不是路径。** POSIX host 上 `path.basename` 不会切开 Windows `\`；`displayName` 两侧都剥。 [E: packages/attachment/attachment-local/src/store.ts:30]
- **hardlink 撞车必须再验 hash。** `EEXIST` 不是「已经是我」；已有文件 hash 不对就 `ATTACHMENT_CORRUPT`，不能覆盖。 [E: packages/attachment/attachment-local/src/store.ts:223]
- **官方 DeepSeek chat-completions 线不收图。** 看见 `ImageBlock` 抛 `UNSUPPORTED_CONTENT`。要走视觉必须是声明了 `image` input 的 pi-ai route，且 host 上挂着 attachments。 [E: packages/llm/llm-deepseek/src/serialize.ts:112]
- **`session/flush` 没有 `next()`。** 耐久否决发生在 `llm/stream` / `tools/execute`：那些 listener 先 `flush` 再决定要不要 `next()`。 [E: packages/core/session/src/index.ts:82] [E: packages/session/session-checkpoint-policy/src/index.ts:36]
- **waterfall 漏 `next()` 等于停整条链。** [E: vendor/cordis/src/events.ts:238]
- **export 缺缝是 500，不是空 ZIP。** 缺 `sessionQuery` / `sessionPersistence` / `attachments` 直接 500。 [E: packages/session-query/session-log-export/src/index.ts:121] [E: packages/session-query/session-log-export/src/index.ts:124]
- **session event `version` ≠ attachment 目录 `v1`。** 逻辑 header 钉在 `SESSION_FORMAT_VERSION === 2`。 [E: packages/core/session/src/types.ts:86]
- **配置里的 `CredentialRef` 与本缝无关。** adapter 的 `apiKeyEnv` 走 credentials 缝；`.credentials.yaml` 存 secret 值。 [E: packages/llm/llm-deepseek/src/index.ts:178] [E: packages/credentials/credentials-local/src/index.ts:61]
- **settings 分层是 schema defaults → composition `base` → user document。** [E: packages/settings/settings/src/index.ts:447] [E: packages/settings/settings/tests/settings.spec.ts:89]
- **storage / projection-cache 在 base；workspace 只 web-app。** 不要再写「storage 只 web-app」。 [E: packages/bundle/base/cordis.patch.yml:145] [E: packages/bundle/base/cordis.patch.yml:162] [E: packages/bundle/web-app/cordis.patch.yml:61]
- **shipped session 盘是 jsonl。** base 挂 `id: session-persistence-jsonl`；web-app / headless 继承，不重挂。 [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:113]

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 / 合同 | base | web-app | headless / sdk / acp | sdk-minimal |
|---|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-attachment` 的 `AttachmentStore` / `ImageAttachmentRef` / `admitEncodedImages` | `ctx.attachments`；方法 `validateImage` / `saveImage` / `saveImages` / `readImage`；默认 `readImageRequest` 抛 `ATTACHMENT_PROJECTION_UNSUPPORTED` | **无**独立 Cordis 行 | 无 | 无 | 无 |
| Provider | `@deepseek-ai/dsh-attachment-local` 的 `LocalAttachmentStore` | 同一 `ctx.attachments`。`root = resolveDshHome(…)/attachments/v1` | `id: attachment-local`，**无** `config` | **继承**，不重挂 | **继承**（叠 base），不重挂 | **没有**该行（不叠 base） |
| Consumer | `dsh-api-session-controller`（prompt `admitEncodedImages`、`session.attachment`、`imageLimits`）；`dsh-session-log-export`（ZIP）；`dsh-llm-pi-ai`（`readImageRequest`）；`dsh-tool-fs` 的 `read_image` | 方法调用，不是 waterfall listener。checkpoint 必须先 `next()` | 无独立 attachment consumer 行 | insert `session-controller` + `session-log-download` | 无 Web Remote / ZIP；仍可通过 preset 里的 `read_image` 与 pi-ai 消费同一 store（若挂了 store） | 无 shipped store 时 `read_image` 不注册 |

换 Provider 只换对象根、归一化与发布原语，不能改 `ImageAttachmentRef` 形状，也不能把像素写回 `SessionEvent`。preset 若再 `provide` 一份 `attachments` 且不 `isolate`，会撞上 host 面 `leakedServices`。[I] `dsh-llm-deepseek` 不是图 Consumer：它在 serialize 入口拒 `ImageBlock`。

## Sources

- packages/attachment/attachment/src/index.ts
- packages/attachment/attachment/src/types.ts
- packages/attachment/attachment/src/brand.ts
- packages/attachment/attachment/src/error.ts
- packages/attachment/attachment/src/admission.ts
- packages/attachment/attachment-local/src/index.ts
- packages/attachment/attachment-local/src/store.ts
- packages/attachment/attachment-local/src/image.ts
- packages/attachment/attachment-local/tests/store.spec.ts
- packages/attachment/attachment-local/tests/index.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/api/session-controller/src/index.ts
- packages/api/session-controller/src/commands.ts
- packages/api/session-controller/src/list.ts
- packages/session-query/session-log-export/src/index.ts
- packages/session-query/session-log-export/src/archive.ts
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
- packages/session/session-persistence/src/storage-contract.ts
- packages/settings/settings/src/index.ts
- packages/settings/settings/tests/settings.spec.ts
- packages/credentials/credentials-local/src/index.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/service.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：`user/message` / `tool/result` 如何进 `deriveMessages()`；checkpoint 两个副作用落点；log 不持像素。
- [subsys.persistence.session-query](session-query.md)：`traceSession` 给 ZIP 后代；shipped `openAt: never` 关的是 FTS，不是 attachment 读。
- [subsys.host.apiproxy](../host/apiproxy.md)：Host HTTP API（`session-controller` 的 prompt / `attachment` / `imageLimits`）。节点 id 稳定别名，包已不是 apiproxy。
- [subsys.core.session](../core/session.md)：`Session.append`、`session/flush` parallel、`SESSION_FORMAT_VERSION = 2`。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer；host 面 vs agent-preset 面。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；入口含 `dsh web` 与 `dsh --profile sdk|sdk-minimal|acp|headless`。
- [subsys.util.home-paths](../util/home-paths.md)：`resolveDshHome` / `$DSH_HOME` / `~/.dsh`。
- [surface.tools.read-image](../../surface/tools/read-image.md)：`read_image` 模型面字段与 route 门；本页不写那张表。
- [subsys.llm.pi-ai](../llm/pi-ai.md)：请求期 `readImageRequest` 与 `inputModalities` 含 `image` 的 route。
- [subsys.persistence.checkpoint](checkpoint.md)：`llm/stream` / `tools/execute` 上 `flush` 后再 `next()`。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 session 盘；base 行 `root: dshHomePath('sessions')`。
- [subsys.persistence.sqlite](sqlite.md)：session-persistence-sqlite 已删除；query/storage sqlite 仍在。
- [subsys.persistence.settings](settings.md)：schema defaults → composition `base` → user document。
- [subsys.persistence.credentials](credentials.md)：配置里 `CredentialRef`；`.credentials.yaml` 存 secret 值。
- [subsys.persistence.storage](storage.md)：非会话 KV 在 **base**（`storage` + `storage-json` + `storage-domain`）。
- [subsys.persistence.workspace](workspace.md)：**web-app** 的 workspace 实体。
- [subsys.persistence.projection](projection.md)：registry 与 `session-projection-cache` 在 base。
