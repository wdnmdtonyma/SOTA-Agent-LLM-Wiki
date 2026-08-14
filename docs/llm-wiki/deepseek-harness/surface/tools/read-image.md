---
id: surface.tools.read-image
title: read_image 读图
kind: tool
tier: T1
pkg: execution
source:
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/read-image.ts
  - packages/fs/tool-fs/src/read-target.ts
  - packages/fs/tool-fs/src/session-cwd.ts
  - packages/fs/tool-fs/package.json
  - packages/fs/tool-fs/tests/read-image.spec.ts
  - packages/attachment/attachment/src/index.ts
  - packages/attachment/attachment/src/types.ts
  - packages/attachment/attachment-local/src/index.ts
  - packages/attachment/attachment-local/src/store.ts
  - packages/fs/fs/src/index.ts
  - packages/fs/fs-local/src/fsio.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/bundle/base/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - read_image
  - applyReadImageTool
  - assertImageCapableRoute
  - imageMediaTypeForPath
  - formatImageReadOutput
  - imageRefFromValue
  - ImageReadValue
related: [spine.tool-call-anatomy, ref.tools-catalog]
evidence: explicit
status: verified
updated: 47f943859b
---

> `read_image` 是 `@deepseek-ai/dsh-tool-fs` 上的 model-visible 工具：把一张 PNG/JPEG/WebP/GIF 读进 durable `ctx.attachments`，再把 image block 送回模型上下文。没有挂上 attachment store 时，这个名字根本不会出现在 catalog。

## 能回答的问题

- `read_image` 的 wire `name`、实现包、以及它和同包 `read` / `write` / `edit` 的注册条件有何不同？
- 模型可见参数只有哪些？`tool-fs` 的 `Config` 或 `ctx.fs.sandboxMode` 会不会改它的 schema？
- 为什么没有 `ctx.attachments` 时 catalog 里看不到 `read_image`？直接调用 `applyReadImageTool` 又怎样？
- 扩展名、部署 `imageLimits.mediaTypes`、以及路由 `inputModalities` 各自在哪一层拒绝？
- 成功结果是什么：canonical `ImageReadValue`、text envelope、image block、`additionalContexts`？
- `minimal` / `standard` / `code` / `cordis` 四个 shipped preset 谁装了 `dsh-tool-fs`，从而有机会露出 `read_image`？

## Identity

模型看见的名字是 `read_image`，在 `applyReadImageTool` 里传给 `defineTool`。[E: packages/fs/tool-fs/src/read-image.ts:132]

实现包是 `@deepseek-ai/dsh-tool-fs`。[E: packages/fs/tool-fs/package.json:2] Cordis 插件名是 `export const name = 'tool-fs'`，和 wire 名不是同一个字符串。[E: packages/fs/tool-fs/src/index.ts:19]

插件静态 `inject` 是 `['tools', 'fs', 'systemPrompt']`：没有这三项，整包（含 `read` / `write` / `edit`）都不会 boot。[E: packages/fs/tool-fs/src/index.ts:22] `read_image` 再加一层 runtime `ctx.inject(['attachments'], …)`：`apply()` 只在 `attachments` 服务已挂载的 fiber 里调用 `applyReadImageTool`。[E: packages/fs/tool-fs/src/index.ts:70][E: packages/fs/tool-fs/src/index.ts:71]

`applyReadImageTool` 通过 `ctx.tools.register(defineTool({ … }))` 登记定义；`defineTool` 来自 `@deepseek-ai/dsh-tools`。[E: packages/fs/tool-fs/src/read-image.ts:131]

测试钉死这层门：不挂 attachment store 时 `ctx.tools.get('read_image')` 是 `undefined`，`schemas()` 也不含这个名字；此时走 `tools.execute` 得到 `unknown tool "read_image"`。[E: packages/fs/tool-fs/tests/read-image.spec.ts:315][E: packages/fs/tool-fs/tests/read-image.spec.ts:316] 若跳过 `inject`、直接 `applyReadImageTool(ctx)`，工具会进 catalog，但 `execute` 仍会因 `ctx.get('attachments') === undefined` 拒绝。[E: packages/fs/tool-fs/tests/read-image.spec.ts:325][E: packages/fs/tool-fs/src/read-image.ts:173]

卸掉 attachment store 会拆掉那条 `inject` fiber：`read_image` 撤回，`read` / `write` / `edit` 留着；再挂上 store 会重新登记。[E: packages/fs/tool-fs/tests/read-image.spec.ts:457][E: packages/fs/tool-fs/tests/read-image.spec.ts:458]

## 用途定位

`read_image` 只做一件事：把工作区里的一张受支持栅格图经 `attachments.saveImage` 落成 durable `ImageAttachmentRef`，再作为 `type: 'image'` 的 content block 进入后续请求。

它不是 `read` 的图片模式。同包 `read` 走 UTF-8 文本路径；本地 backend 在文本读取里遇到 NUL 样本会抛 `FS_NOT_TEXT` / `binary file`。同一张 PNG，`read` 失败，`read_image` 才是入口。[E: packages/fs/fs-local/src/fsio.ts:380][E: packages/fs/tool-fs/tests/read-image.spec.ts:492]

它也不做 PDF / 音频 / 视频，不写文件，不改 schema 去广告 sandbox 升权。字节落点是 `ctx.attachments.saveImage`，不是把 base64 塞进 tool result 文本。

## 输入 schema

默认 `tool-fs` `Config` boot 之后，模型可见参数只有 `file_path`。`Config` 的四个键（`readLimit` / `readMaxLineLength` / `readMaxBytes` / `readStreamMinSize`）只喂给 `applyReadTool`，不进入 `read_image`。[E: packages/fs/tool-fs/src/index.ts:36][E: packages/fs/tool-fs/src/index.ts:61][E: packages/fs/tool-fs/src/read-image.ts:135]

`ctx.fs.sandboxMode` 不会给 `read_image` 加 `sandbox_permissions` / `justification`。`FsSandboxController` 只传给 `applyWriteTool` / `applyEditTool`。[E: packages/fs/tool-fs/src/index.ts:77][E: packages/fs/tool-fs/src/index.ts:78]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `file_path` | `string` | 是 | 无 | 去空白后非空；扩展名必须是 `.png` / `.jpg` / `.jpeg` / `.webp` / `.gif`（大小写不敏感） | 交由 `ctx.fs.resolve` 解析；相对路径相对 calling agent 的 session cwd。[E: packages/fs/tool-fs/src/read-image.ts:135][E: packages/fs/tool-fs/src/read-image.ts:164][E: packages/fs/tool-fs/src/read-target.ts:24] |

扩展名到 MIME 的映射在 `IMAGE_EXTENSIONS`：`.png` → `image/png`，`.jpg` / `.jpeg` → `image/jpeg`，`.webp` → `image/webp`，`.gif` → `image/gif`。[E: packages/fs/tool-fs/src/read-image.ts:27][E: packages/fs/tool-fs/src/read-image.ts:28][E: packages/fs/tool-fs/src/read-image.ts:30][E: packages/fs/tool-fs/src/read-image.ts:31] `imageMediaTypeForPath` 用 `extname(filePath).toLowerCase()` 查表，对不上返回 `undefined`。[E: packages/fs/tool-fs/src/read-image.ts:52][E: packages/fs/tool-fs/src/read-image.ts:53]

这张表是工具侧的声明路由。真正认不认字节，是 attachment store 全量 decode 之后的事：声明类型和探测类型不一致时抛 `IMAGE_TYPE_MISMATCH`。[E: packages/attachment/attachment-local/src/store.ts:53]

## 输出 & 截断 / spill

`read_image` 没有 spill，也没有 `output.presentationMeta`。成功 body 必须符合 output schema，再由 `output.render` 投影成模型可见 blocks。[E: packages/fs/tool-fs/src/read-image.ts:158][E: packages/core/tools/src/index.ts:1800]

Canonical 值是 `ImageReadValue`：`path`（backend `displayPath`）加上 `image` 对象。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `path` | `string` | 是 | 解析后的显示路径。[E: packages/fs/tool-fs/src/read-image.ts:202] |
| `image.attachmentId` | `string` | 是 | store 给出的不透明 id；本地实现是 `sha256:<64 hex>`。[E: packages/fs/tool-fs/src/read-image.ts:204][E: packages/attachment/attachment-local/src/store.ts:190] |
| `image.mediaType` | enum | 是 | `image/png` \| `image/jpeg` \| `image/webp` \| `image/gif`。[E: packages/fs/tool-fs/src/read-image.ts:149] |
| `image.bytes` | integer | 是 | 编码后字节数。[E: packages/fs/tool-fs/src/read-image.ts:150] |
| `image.width` / `image.height` | integer | 是 | 内禀像素尺寸。[E: packages/fs/tool-fs/src/read-image.ts:151][E: packages/fs/tool-fs/src/read-image.ts:152] |
| `image.name` | `string` | 否 | 来自 `basename(displayPath)`；store 也可以剥掉名字。[E: packages/fs/tool-fs/src/read-image.ts:153][E: packages/fs/tool-fs/src/read-image.ts:191] |

`render` 调 `imageReadContent`：一块 text envelope，一块 `{ type: 'image', attachment: ImageAttachmentRef }`。[E: packages/fs/tool-fs/src/read-image.ts:116][E: packages/fs/tool-fs/src/read-image.ts:117] envelope 由 `formatImageReadOutput` 写成：

```
<path>…</path>
<type>image</type>
<content>
image/png image, 1x1 px, 69 bytes
</content>
```

[E: packages/fs/tool-fs/src/read-image.ts:102]

Native 顶层调用：registry 把这两块放进 `ToolExecutionResult.content`。Happy-path 测试要求 `content` 长度为 2，第二块是带 `attachmentId` / 尺寸 / 名字的 image。[E: packages/fs/tool-fs/tests/read-image.spec.ts:182][E: packages/fs/tool-fs/tests/read-image.spec.ts:184]

嵌套（Code Mode / `exec.parent` 已设置）：body 仍 return canonical value 给程序；同时 `exec.deferContext(createUserMessage({ content: imageReadContent(value), source: { kind: 'plugin', plugin: 'tool-fs' } }))`，让 image 走 `additionalContexts` 而不是 `run_code` 自己的 text-only content。[E: packages/fs/tool-fs/src/read-image.ts:212][E: packages/fs/tool-fs/src/read-image.ts:213] 测试里外层 `run_code` 的 `content` 全是 text，`additionalContexts[0].content` 才是 envelope + image。[E: packages/fs/tool-fs/tests/read-image.spec.ts:241][E: packages/fs/tool-fs/tests/read-image.spec.ts:242]

截断策略是失败而不是预览。读盘上限是 `Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes)`，交给必填 `maxBytes` 的 `ctx.fs.readBytes`；本地 backend 在 stat size 已超限时抛 `FS_TOO_LARGE`，不截断返回。[E: packages/fs/tool-fs/src/read-image.ts:185][E: packages/fs/fs/src/index.ts:199][E: packages/fs/fs-local/src/fsio.ts:404] shipped `@deepseek-ai/dsh-attachment-local` 默认 `maxImageBytes = 5 * 1024 * 1024`、`maxMessageImageBytes = 100 * 1024 * 1024`，所以默认 cap 是 5 MiB。[E: packages/attachment/attachment-local/src/index.ts:15][E: packages/attachment/attachment-local/src/index.ts:19] 像素上限默认 `40_000_000`，在 `saveImage` → `inspectMetadata` → `detectImage` 里拒绝，不是工具自己截图。[E: packages/attachment/attachment-local/src/index.ts:21]

失败由 registry 收成 `Error: <message>` 文本。[E: packages/core/tools/src/index.ts:1874]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `@deepseek-ai/dsh-attachment` 的 `AttachmentStore`；`Context.attachments` | 抽象服务名是 `'attachments'`。[E: packages/attachment/attachment/src/index.ts:24][E: packages/attachment/attachment/src/index.ts:31] |
| Provider | shipped `@deepseek-ai/dsh-attachment-local`（host `base` bundle 的 `attachment-local` 行） | 内容寻址写到 `$DSH_HOME/attachments/v1`；默认接受四种 MIME。[E: packages/bundle/base/cordis.patch.yml:106][E: packages/bundle/base/cordis.patch.yml:107][E: packages/attachment/attachment-local/src/index.ts:59] |
| Consumer | `applyReadImageTool` / `read_image.execute` | `ctx.get('attachments')`、`imageLimits`、`saveImage`。[E: packages/fs/tool-fs/src/read-image.ts:172][E: packages/fs/tool-fs/src/read-image.ts:191] |

换掉 attachment provider，会带走：durable 根目录、`imageLimits`（单图字节、单消息聚合字节、像素、`mediaTypes`）、`saveImage` 的 magic-byte 校验和 id 格式。工具自己的扩展名表和 output schema 不变。

其它 seam：

- **`ctx.fs`（Definition `@deepseek-ai/dsh-fs`）**：`resolve` / `stat` / `readBytes`。换 fs provider 会带走路径沙箱、cwd 语义、以及超限时抛什么码。本地实现在 `readWholeBytes` 里若 `info.size > maxBytes` 立即抛 `FS_TOO_LARGE`。[E: packages/fs/tool-fs/src/read-target.ts:24][E: packages/fs/tool-fs/src/read-target.ts:25][E: packages/fs/fs-local/src/fsio.ts:403][E: packages/fs/fs-local/src/fsio.ts:404]
- **`ctx.llm`（可选）**：`assertImageCapableRoute` 用 `ctx.get('llm')` + `resolveModelInfo(provider, model, exec.signal)`。没有 `llm`、或解析不出 provider/model，一律按「路由无法解析」拒绝，不读盘。[E: packages/fs/tool-fs/src/read-image.ts:68][E: packages/fs/tool-fs/src/read-image.ts:72][E: packages/fs/tool-fs/src/read-image.ts:70]
- **`ctx.tools`**：登记、`pre-execute` / `execute` / `post-execute`、把 canonical value render 成 blocks。
- **`ctx.systemPrompt`**：插件 boot 需要它（`read` / `write` / `edit` 往里面挂 section）。`applyReadImageTool` 自己不挂 prompt section。

相对路径的 cwd 来自 `sessionResolveOptions` → `sessionCwd`：`exec.agent?.session.header.cwd`。没有 agent 时该值为 `undefined`，resolve 选项里就不带 `cwd` 字段。[E: packages/fs/tool-fs/src/session-cwd.ts:24][E: packages/fs/tool-fs/src/session-cwd.ts:43]

`fs/observed`：缺失目标在 `resolveRegularReadTarget` 里发 `{ kind: 'absent' }`；成功提交附件之后发 `{ kind: 'present', version }`。本工具只 `emit`，不在 `read-image.ts` 里写观察表。[E: packages/fs/tool-fs/src/read-target.ts:27][E: packages/fs/tool-fs/src/read-image.ts:200]

## 执行管线

入口是 `ToolRuntime.execute`：先 `prepareExecution`（`tools/pre-execute` waterfall，缺省 `allow`），再 `dispatchScheduledExecution`（`tools/execute` around-dispatch，内层跑 `definition.execute`），成功或可恢复失败再 `finalizeScheduledExecution` → `postExecute`（`tools/post-execute`，缺省 `accept`）。[E: packages/core/tools/src/index.ts:1342][E: packages/core/tools/src/index.ts:1476][E: packages/core/tools/src/index.ts:1574][E: packages/core/tools/src/index.ts:1744]

对本工具的挂点：

| 挂点 | `read_image` |
|---|---|
| `tools/pre-execute` / approval | 定义不返回 `ask`。缺省 gate 是 `allow`。没有模型可见的 approval 字段。[E: packages/core/tools/src/index.ts:1477] |
| sandbox 升权 | 不经过 `FsSandboxController`。schema 永不广告 `sandbox_permissions` / `justification`。[E: packages/fs/tool-fs/src/index.ts:71][E: packages/fs/tool-fs/src/index.ts:77] |
| `timeoutMs` | `defineTool` 未传该字段；registry 只在有值时才写到定义上。取消只跟 `exec.signal`。[E: packages/core/tools/src/schema.ts:584] |
| `isConcurrencySafe` | `() => true`。内容寻址写入可并发；`executionMode` 因此给出 `{ kind: 'parallel' }`。[E: packages/fs/tool-fs/src/read-image.ts:162][E: packages/fs/tool-fs/tests/read-image.spec.ts:474] |
| `tools/post-execute` | 无本工具专用 listener。render 发生在 body 返回之后的 `createSuccessResult`。[E: packages/core/tools/src/index.ts:1800] |

`presentCall` 给 UI 一张 `card: 'generic'`、`kind: 'read'`、title `Read image ${file_path}`、location 指向该路径。这不是模型可见 schema。[E: packages/fs/tool-fs/src/read-image.ts:224][E: packages/fs/tool-fs/src/read-image.ts:226]

## Preset 装配

成员资格只看 `apps/cli/config/agent-presets/*/agent.cordis.yml` 有没有 `@deepseek-ai/dsh-tool-fs`。`read_image` 不是单独一行：它跟着 `tool-fs` 走，再叠加 host 是否挂了 `attachments`。

shipped host `packages/bundle/base/cordis.patch.yml` 有 `attachment-local`，因此标准产品里 `attachments` 在。[E: packages/bundle/base/cordis.patch.yml:107] 自定义 composition 拿掉 store，即使装了 `tool-fs`，catalog 里也不会有 `read_image`。[E: packages/fs/tool-fs/src/index.ts:70]

| Preset | 装 `dsh-tool-fs`？ | `disabled` | isolate | `read_image` 是否可能出现 |
|---|---|---|---|---|
| `minimal` | 否。`filesystem` isolate 只装 `dsh-fs-local` + `dsh-tool-str-replace-editor` | 不适用 | `isolate.fs: true` 罩的是那两行，不是 `tool-fs` | 否。没有登记函数。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:55][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] |
| `standard` | 是，`id: tool-fs` | 无 | 无（该行不在任何 `isolate` 组内） | 是，只要 host `attachments` 在。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:56][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:57] |
| `code` | 是，与 `standard` 同一行；另加 `tool-presentation` `mode: code` | 无 | 无 | 是。嵌套调用走 `exec.parent` + `deferContext`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:63][E: apps/cli/config/agent-presets/code/agent.cordis.yml:64] |
| `cordis` | 是 | 无 | 无 | 是。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:57][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:58] |

四个 yml 都没有单独的 `read_image` 开关，也没有给 `tool-fs` 配 image 相关 Config。

## execute() 走读

`applyReadImageTool@packages/fs/tool-fs/src/read-image.ts` 登记的 `execute`：

1. **空路径。** `args.file_path.trim().length === 0` → `file_path must be a non-empty string`。[E: packages/fs/tool-fs/src/read-image.ts:164]
2. **扩展名门（读盘前）。** `imageMediaTypeForPath` 得不到 MIME → `read_image only accepts PNG/JPEG/WebP/GIF paths`。[E: packages/fs/tool-fs/src/read-image.ts:168][E: packages/fs/tool-fs/src/read-image.ts:170]
3. **attachment 再检查。** `ctx.get('attachments')` 为空 → `no attachment service is mounted`。这是给直接调用 `applyReadImageTool` 的防御；正常 composition 在登记阶段就已经把工具拿掉。[E: packages/fs/tool-fs/src/read-image.ts:172][E: packages/fs/tool-fs/src/read-image.ts:174]
4. **部署 MIME 白名单。** `attachments.imageLimits.mediaTypes` 不含该类型 → `… images are not accepted by this deployment`。本地默认四者都收；测试里 JPEG-only store 会拒 `.png`。[E: packages/fs/tool-fs/src/read-image.ts:176][E: packages/fs/tool-fs/tests/read-image.spec.ts:358]
5. **路由图像能力（仍在 I/O 前）。** `assertImageCapableRoute`：`provider` / `model` 先取 `exec.agent.session.requestHeader()?.config`，否则 `exec.agent.options`；再 `ctx.get('llm')`。[E: packages/fs/tool-fs/src/read-image.ts:65][E: packages/fs/tool-fs/src/read-image.ts:66][E: packages/fs/tool-fs/src/read-image.ts:67] 三者缺一 → `the current model route could not be resolved`。[E: packages/fs/tool-fs/src/read-image.ts:69][E: packages/fs/tool-fs/src/read-image.ts:70] 解析到的 `inputModalities` 为 `undefined` 或不含 `'image'` → `model "…" does not declare image input`。[E: packages/fs/tool-fs/src/read-image.ts:73][E: packages/fs/tool-fs/src/read-image.ts:74] 未知能力按拒绝处理，不把 image block 写进不能承载它的会话历史。
6. **解析普通文件。** `resolveRegularReadTarget`：`ctx.fs.resolve(path, sessionResolveOptions)` + `stat`。没有 stat → emit `absent` 再抛 `FS_NOT_FOUND`；`info.type !== 'file'` → `FS_NOT_REGULAR_FILE`（目录即使名叫 `folder.png` 也一样）。[E: packages/fs/tool-fs/src/read-target.ts:24][E: packages/fs/tool-fs/src/read-target.ts:28][E: packages/fs/tool-fs/src/read-target.ts:31]
7. **有界读字节。** `byteCap = min(maxImageBytes, maxMessageImageBytes)`，然后 `ctx.fs.readBytes(target, exec.signal, byteCap)`。本地 backend 在 stat size 已超限时直接 `FS_TOO_LARGE`。[E: packages/fs/tool-fs/src/read-image.ts:185][E: packages/fs/tool-fs/src/read-image.ts:186][E: packages/fs/fs-local/src/fsio.ts:404]
8. **durable commit。** `attachments.saveImage({ data, mediaType, name: basename(displayPath) })`。只把 `AttachmentError` 且 `code === 'IMAGE_TYPE_MISMATCH'` 改写成「扩展名声明了 A、字节是别的格式」的修复说明；其它错误原样抛出。[E: packages/fs/tool-fs/src/read-image.ts:191][E: packages/fs/tool-fs/src/read-image.ts:193][E: packages/fs/tool-fs/src/read-image.ts:196]
9. **观察 + 返回。** `ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec)`，组装 `ImageReadValue`。有 `exec.parent` 则 `deferContext`；然后 `return value`。[E: packages/fs/tool-fs/src/read-image.ts:200][E: packages/fs/tool-fs/src/read-image.ts:218]
10. **registry 投影。** `createSuccessResult` 用 `tool.output.schema` 校验 canonical value，再 `output.render` → text envelope + image block。[E: packages/core/tools/src/index.ts:1795][E: packages/core/tools/src/index.ts:1800]

## 设计动机·edge

Claude / Codex / Pi 常把图片塞进同一个 Read。DSH 把 UTF-8 文本留在 `read`，把栅格图拆成独立的 `read_image`：`read` 继续走 `FS_NOT_TEXT`，图像必须过 attachment 生命周期和路由 `inputModalities` 门。DSH 没有 first-class `apply_patch`；本工具也不参与字面替换。

独有 edge：

- **登记是 composition-conditional，执行再防一层。** 没 store 就不进 catalog；强行登记也会在 `ctx.get('attachments')` 处失败。[E: packages/fs/tool-fs/src/index.ts:70][E: packages/fs/tool-fs/src/read-image.ts:173]
- **路由门比「先写进去再让 adapter 拒」更严。** `inputModalities` 缺失视为不能读图，避免 text-only 历史里留下 image block。[E: packages/fs/tool-fs/src/read-image.ts:73]
- **扩展名是声明，magic byte 是权威。** `.jpg` 里放 PNG 字节会在 `saveImage` 变成可操作的 mismatch 消息，而不是含糊的 invalid image。[E: packages/fs/tool-fs/src/read-image.ts:193][E: packages/attachment/attachment-local/src/store.ts:53]
- **并发安全是因为 content-addressed，不是因为只读。** 两次 `read_image` 同一文件会幂等落到同一个 digest 对象。[E: packages/fs/tool-fs/src/read-image.ts:162][E: packages/attachment/attachment-local/src/store.ts:139]
- **门全在 I/O 前。** 扩展名 / store / MIME 白名单 / 路由失败都不会留下半截 `readBytes` 或 attachment 写。[E: packages/fs/tool-fs/src/read-image.ts:168]
- **检查发生在 execute 当下的路由。** 检查通过之后、下一轮请求之前如果切到 text-only 模型，历史里可能已经有 image block。工具本身不锁模型。

## Sources

- `packages/fs/tool-fs/src/index.ts` — 插件 `name` / `inject` / `Config`；`ctx.inject(['attachments'])` 才调用 `applyReadImageTool`
- `packages/fs/tool-fs/src/read-image.ts` — wire `read_image`、`imageMediaTypeForPath`、`assertImageCapableRoute`、`execute`、render
- `packages/fs/tool-fs/src/read-target.ts` — `resolveRegularReadTarget`（cwd、absent、regular file）
- `packages/fs/tool-fs/src/session-cwd.ts` — session cwd / `sessionResolveOptions`
- `packages/fs/tool-fs/package.json` — `@deepseek-ai/dsh-tool-fs`
- `packages/fs/tool-fs/tests/read-image.spec.ts` — 登记、路由门、admission、Code Mode、HMR
- `packages/attachment/attachment/src/index.ts` — `ctx.attachments` / `AttachmentStore`
- `packages/attachment/attachment/src/types.ts` — `ImageMediaType` / `ImageAttachmentRef` / `ImageAttachmentLimits`
- `packages/attachment/attachment-local/src/index.ts` — 默认 byte / pixel / MIME 限额
- `packages/attachment/attachment-local/src/store.ts` — `IMAGE_TYPE_MISMATCH`、`sha256:` id
- `packages/fs/fs/src/index.ts` — `FileSystem.readBytes` 合同（超限失败，不截断）
- `packages/fs/fs-local/src/fsio.ts` — 文本 `binary file`；`readWholeBytes` 的 `FS_TOO_LARGE`
- `packages/core/tools/src/index.ts` — `execute` 管线、`createSuccessResult`、错误包装
- `packages/core/tools/src/schema.ts` — `timeoutMs` 仅在传入时写入定义
- `packages/bundle/base/cordis.patch.yml` — host 挂 `attachment-local`
- `apps/cli/config/agent-presets/minimal/agent.cordis.yml` — 无 `tool-fs`
- `apps/cli/config/agent-presets/standard/agent.cordis.yml` — 装 `tool-fs`
- `apps/cli/config/agent-presets/code/agent.cordis.yml` — 装 `tool-fs` + Code Mode
- `apps/cli/config/agent-presets/cordis/agent.cordis.yml` — 装 `tool-fs`

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → body → `tools/post-execute` 的通用骨架；本页只写 `read_image` 在这条链上的挂点。
- [ref.tools-catalog](../../reference/tools-catalog.md) — 全量 model-visible 工具名册；`read_image` 是其中一条 composition-conditional 项。
