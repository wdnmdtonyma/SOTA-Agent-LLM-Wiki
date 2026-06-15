---
id: tool.read
title: Read 工具
kind: tool
tier: T1
v: shared
source: [packages/opencode/src/tool/read.ts, packages/core/src/tool/read.ts, packages/core/src/tool/read-filesystem.ts]
symbols: [ReadTool, ReadToolFileSystem]
related: [subsys.tools.v1, subsys.tools.v2, ref.tool-catalog]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> Read 工具是 opencode 面向模型暴露的文件/目录读取入口；V1 活跑实现位于 `packages/opencode/src/tool/read.ts`，V2 新内核实现位于 `packages/core/src/tool/read.ts` 与 `packages/core/src/tool/read-filesystem.ts`。

## 能回答的问题

- `read` 的 wire name、输入字段和分页限制是什么？
- V1 Read 与 V2 Read 在图片、PDF、二进制文件上的行为有什么差异？
- Read 的 2000 行 / 50KB 上限在哪里实现？
- V1 Read 用 `ctx.ask` 请求哪些 permission？V2 Read 用 `permission.assert` 请求哪些 action/resources？
- Read 如何处理目录列表、文本分页、相对路径和越界路径？

## V1

### 1 Identity

V1 `ReadTool` 通过 `Tool.define("read", ...)` 注册，wire name 是 `read`。[E: packages/opencode/src/tool/read.ts:64][E: packages/opencode/src/tool/read.ts:69] V1 Read 的 `Parameters` 是 `filePath`、`offset`、`limit`：`filePath` 是字符串，注解要求 absolute path；`offset` 与 `limit` 是 optional `NonNegativeInt`。[E: packages/opencode/src/tool/read.ts:28][E: packages/opencode/src/tool/read.ts:29][E: packages/opencode/src/tool/read.ts:30][E: packages/opencode/src/tool/read.ts:33]

### 2 用途定位

V1 Read 可以读取目录页、UTF-8 文本页、受支持图片和 PDF 附件。目录读取走 `fs.readDirectoryEntries` 并排序；文本读取按行流式扫描；图片或 PDF 会返回 `attachments`，正文只写成功提示。[E: packages/opencode/src/tool/read.ts:101][E: packages/opencode/src/tool/read.ts:114][E: packages/opencode/src/tool/read.ts:137][E: packages/opencode/src/tool/read.ts:306][E: packages/opencode/src/tool/read.ts:317]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `filePath` | `string` | 是 | 无 | schema 描述为 absolute path；execute 仍会把 relative path resolve 到 `InstanceState.context.directory` | 目标文件或目录路径。[E: packages/opencode/src/tool/read.ts:29][E: packages/opencode/src/tool/read.ts:234][E: packages/opencode/src/tool/read.ts:236] |
| `offset` | `NonNegativeInt` | 否 | `1` | 1-indexed；目录和文本都使用 | 起始目录项或起始行。[E: packages/opencode/src/tool/read.ts:30][E: packages/opencode/src/tool/read.ts:31][E: packages/opencode/src/tool/read.ts:267][E: packages/opencode/src/tool/read.ts:331] |
| `limit` | `NonNegativeInt` | 否 | `2000` | 文本还受 50KB 总字节上限约束 | 最大目录项数或文本行数。[E: packages/opencode/src/tool/read.ts:13][E: packages/opencode/src/tool/read.ts:33][E: packages/opencode/src/tool/read.ts:34][E: packages/opencode/src/tool/read.ts:266] |

### 4 输出 & 大小/截断限制

V1 文本分页默认 `DEFAULT_READ_LIMIT = 2000`，单行最多 2000 字符，模型输出总字节最多 `50 * 1024`。[E: packages/opencode/src/tool/read.ts:13][E: packages/opencode/src/tool/read.ts:14][E: packages/opencode/src/tool/read.ts:16] `lines()` 在达到 `opts.limit` 时设置 `more`，在达到 `MAX_BYTES` 时设置 `cut/more/done` 并停止读取。[E: packages/opencode/src/tool/read.ts:157][E: packages/opencode/src/tool/read.ts:164][E: packages/opencode/src/tool/read.ts:170][E: packages/opencode/src/tool/read.ts:173] 输出格式是 XML-like `<path>`, `<type>`, `<content>`；每行加 `lineNumber: text`，并在末尾提示继续读取的 `offset`。[E: packages/opencode/src/tool/read.ts:338][E: packages/opencode/src/tool/read.ts:339][E: packages/opencode/src/tool/read.ts:345][E: packages/opencode/src/tool/read.ts:347]

目录输出使用 `<entries>`，`metadata.display` 保存 `type: "directory"`、`entries`、`offset`、`totalEntries` 和 `truncated`。[E: packages/opencode/src/tool/read.ts:272][E: packages/opencode/src/tool/read.ts:277][E: packages/opencode/src/tool/read.ts:288][E: packages/opencode/src/tool/read.ts:294] 文本输出的 `metadata.display` 保存 `type: "file"`、`text`、`lineStart`、`lineEnd`、`totalLines` 和 `truncated`。[E: packages/opencode/src/tool/read.ts:366][E: packages/opencode/src/tool/read.ts:372]

图片和 PDF 走 attachment output；PDF 返回 `PDF read successfully`，图片返回 `Image read successfully`。[E: packages/opencode/src/tool/read.ts:308][E: packages/opencode/src/tool/read.ts:311][E: packages/opencode/src/tool/read.ts:317]

### 5 权限

V1 Read 先调用 `assertExternalDirectoryEffect` 检查目标是否越出当前 instance/worktree，再通过 `ctx.ask` 请求 `permission: "read"`，`patterns` 是目标相对 worktree 的路径，`always` 是 `["*"]`。[E: packages/opencode/src/tool/read.ts:250][E: packages/opencode/src/tool/read.ts:255][E: packages/opencode/src/tool/read.ts:256][E: packages/opencode/src/tool/read.ts:257][E: packages/opencode/src/tool/read.ts:258] `bypassCwdCheck` 只通过 `ctx.extra` 显式传入时生效。[E: packages/opencode/src/tool/read.ts:251]

### 6 execute() 走读

1. `ReadTool.execute` 取得 `InstanceState.context`，把 relative `filePath` resolve 到 instance directory，并在 Windows 上 normalize path。[E: packages/opencode/src/tool/read.ts:233][E: packages/opencode/src/tool/read.ts:235][E: packages/opencode/src/tool/read.ts:239]
2. `fs.stat` 找不到文件时返回 `undefined`，后续 `miss()` 会查同目录近似候选并抛出 `Did you mean` 提示。[E: packages/opencode/src/tool/read.ts:243][E: packages/opencode/src/tool/read.ts:262][E: packages/opencode/src/tool/read.ts:76][E: packages/opencode/src/tool/read.ts:94]
3. 如果目标是目录，V1 Read 排序目录项、按 `offset/limit` slice，并返回 directory display metadata。[E: packages/opencode/src/tool/read.ts:264][E: packages/opencode/src/tool/read.ts:269][E: packages/opencode/src/tool/read.ts:272][E: packages/opencode/src/tool/read.ts:288]
4. 如果目标是文件，V1 Read 先调用 `Instruction.Service.resolve` 加载与文件相关的 nested/project instruction，然后读取 4096 bytes sample 做 MIME / binary 判断。[E: packages/opencode/src/tool/read.ts:300][E: packages/opencode/src/tool/read.ts:301][E: packages/opencode/src/tool/read.ts:303]
5. 如果 sample 是支持图片或 PDF，V1 Read 读取完整文件并返回 base64 `attachments`；如果 `isBinaryFile` 为真则拒绝读取。[E: packages/opencode/src/tool/read.ts:306][E: packages/opencode/src/tool/read.ts:307][E: packages/opencode/src/tool/read.ts:317][E: packages/opencode/src/tool/read.ts:327]
6. 文本读取完成后，V1 Read fork LSP warm-up，并把 `Instruction.resolve` 读到的内容拼成 `<system-reminder>` 附加给模型。[E: packages/opencode/src/tool/read.ts:353][E: packages/opencode/src/tool/read.ts:355][E: packages/opencode/src/tool/read.ts:356]

## V2

### 1 Identity

V2 `ReadTool` 的 model-facing name 是常量 `name = "read"`，并以 `[name]: Tool.make(...)` 注册进 `Tools.Service`。[E: packages/core/src/tool/read.ts:16][E: packages/core/src/tool/read.ts:39][E: packages/core/src/tool/read.ts:41] 这是 V2 built-in Location-scoped tool 的一员，`BuiltInTools.locationLayer` 把 `ReadTool.layer` 与 `ReadToolFileSystem.layer` 一起合入内建工具层。[E: packages/core/src/tool/builtins.ts:31][E: packages/core/src/tool/builtins.ts:38]

### 2 用途定位

V2 Read 面向 active `Location` 读取文本、目录页或支持图片；`ReadToolFileSystem` 负责 inspect/read/list，`ReadTool` 负责路径约束、permission、图片 normalize 和 ToolFailure 映射。[E: packages/core/src/tool/read.ts:33][E: packages/core/src/tool/read.ts:34][E: packages/core/src/tool/read.ts:35][E: packages/core/src/tool/read.ts:36][E: packages/core/src/tool/read.ts:37]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `path` | `string` | 是 | 无 | relative path 从 active `Location.directory` resolve；absolute path 直接读但会用 realpath containment 检查 | 目标文件或目录。[E: packages/core/src/tool/read.ts:18][E: packages/core/src/tool/read.ts:19][E: packages/core/src/tool/read.ts:56][E: packages/core/src/tool/read.ts:60] |
| `offset` | optional `PositiveInt` | 否 | `1` | 1-based；来自 `ReadToolFileSystem.PageInput` | 文本行或目录项起点。[E: packages/core/src/tool/read.ts:20][E: packages/core/src/tool/read.ts:21][E: packages/core/src/tool/read-filesystem.ts:34] |
| `limit` | optional `PositiveInt` | 否 | `2000` | `<= MAX_READ_LINES` | 最大文本行或目录项数。[E: packages/core/src/tool/read.ts:23][E: packages/core/src/tool/read.ts:24][E: packages/core/src/tool/read-filesystem.ts:35] |

### 4 输出 & 大小/截断限制

V2 Read 的 output schema 是 `FileSystem.Content | TextPage | ListPage`。[E: packages/core/src/tool/read.ts:28] `ReadToolFileSystem` 定义 `MAX_READ_LINES = 2_000`、`MAX_READ_BYTES = 50 * 1024`、`MAX_MEDIA_INGEST_BYTES = 20 * 1024 * 1024`，文本分页使用这两个读限制；图片摄入使用 20MB 上限。[E: packages/core/src/tool/read-filesystem.ts:10][E: packages/core/src/tool/read-filesystem.ts:11][E: packages/core/src/tool/read-filesystem.ts:12][E: packages/core/src/tool/read-filesystem.ts:140]

文本小于 50KB 且未指定分页时，V2 返回完整 `FileSystem.Content` UTF-8 内容；超过 50KB 或指定 `offset/limit` 时返回 `TextPage`，其字段是 `type`, `content`, `mime`, `offset`, `truncated`, `next`。[E: packages/core/src/tool/read-filesystem.ts:167][E: packages/core/src/tool/read-filesystem.ts:178][E: packages/core/src/tool/read-filesystem.ts:251][E: packages/core/src/tool/read-filesystem.ts:256][E: packages/core/src/tool/read-filesystem.ts:257] 目录返回 `ListPage`，entries 由 `FileSystem.Entry` 组成，每项保留 `path`, `type`, `mime`。[E: packages/core/src/tool/read-filesystem.ts:48][E: packages/core/src/tool/read-filesystem.ts:278][E: packages/core/src/tool/read-filesystem.ts:281][E: packages/core/src/tool/read-filesystem.ts:291]

V2 Read 的 `toModelOutput` 只把支持图片转成 text + file content；普通文本/目录没有 custom content，保留为 structured output 并交给 Tool runtime/registry settlement 处理。[E: packages/core/src/tool/read.ts:46][E: packages/core/src/tool/read.ts:47][E: packages/core/src/tool/read.ts:50][E: packages/core/src/tool/tool.ts:95][E: packages/core/src/tool/tool.ts:107]

### 5 权限

V2 Read 使用 `PermissionV2.Service.assert`，action 是 `read`，resources 是 realpath root 下的 relative resource，save 是 `["*"]`，source 带 `assistantMessageID` 与 `toolCallID`。[E: packages/core/src/tool/read.ts:64][E: packages/core/src/tool/read.ts:67][E: packages/core/src/tool/read.ts:68][E: packages/core/src/tool/read.ts:69][E: packages/core/src/tool/read.ts:70][E: packages/core/src/tool/read.ts:73] V2 Read 对 relative path 先检查不能逃出 `Location.directory`，再要求 `real` 落在 `root` 内；违反时 die 为 allowed read root 错误。[E: packages/core/src/tool/read.ts:56][E: packages/core/src/tool/read.ts:58][E: packages/core/src/tool/read.ts:60][E: packages/core/src/tool/read.ts:62]

### 6 execute() 走读

1. V2 Read 把 `input.path` resolve 到 active `Location.directory`，并根据 input 是否 absolute 选择 permission/resource root。[E: packages/core/src/tool/read.ts:56][E: packages/core/src/tool/read.ts:57]
2. V2 Read 用 `reader.inspect` 判断 file/directory，然后先 assert permission。[E: packages/core/src/tool/read.ts:66][E: packages/core/src/tool/read.ts:67]
3. 目录走 `reader.list(target, { offset, limit })`，文件走 `reader.read(target, resource, { offset, limit })`。[E: packages/core/src/tool/read.ts:75][E: packages/core/src/tool/read.ts:76]
4. `reader.read` 先读 64KB sample；图片返回 base64 content，PDF 魔数 `%PDF` 或其他 binary 会变成 `BinaryFileError`。[E: packages/core/src/tool/read-filesystem.ts:134][E: packages/core/src/tool/read-filesystem.ts:138][E: packages/core/src/tool/read-filesystem.ts:154][E: packages/core/src/tool/read-filesystem.ts:165]
5. 对支持图片，V2 Read 尝试 `Image.Service.normalize`，如果 image resizer 不可用则保留原 content。[E: packages/core/src/tool/read.ts:80][E: packages/core/src/tool/read.ts:81][E: packages/core/src/tool/read.ts:83]
6. V2 媒体 ingest 超过 20MB 时使用 `MediaIngestLimitError`，不是 `ImageTooLargeError`。[E: packages/core/src/tool/read-filesystem.ts:23][E: packages/core/src/tool/read-filesystem.ts:28][E: packages/core/src/tool/read-filesystem.ts:140]

## V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 活跑状态 | 当前活跑路径，经 `SessionTools.resolve` 转成 AI SDK tool。[E: packages/opencode/src/session/tools.ts:74][E: packages/opencode/src/session/tools.ts:80] | 新内核 built-in，经 `ToolRegistry.materialize` 广告给 `@opencode-ai/llm`。[E: packages/core/src/session/runner/llm.ts:217][E: packages/core/src/session/runner/llm.ts:226] |
| 输入路径字段 | `filePath`；schema 描述 absolute，但 execute 接受 relative 并 resolve。[E: packages/opencode/src/tool/read.ts:29][E: packages/opencode/src/tool/read.ts:235] | `path`；相对 active `Location`，absolute 以 realpath root 检查。[E: packages/core/src/tool/read.ts:18][E: packages/core/src/tool/read.ts:56] |
| 文本限制 | 2000 行、50KB、单行 2000 字符。[E: packages/opencode/src/tool/read.ts:13][E: packages/opencode/src/tool/read.ts:14][E: packages/opencode/src/tool/read.ts:16] | 2000 行、50KB、单行 2000 字符。[E: packages/core/src/tool/read-filesystem.ts:10][E: packages/core/src/tool/read-filesystem.ts:11][E: packages/core/src/tool/read-filesystem.ts:13] |
| PDF | V1 把 PDF 当 attachment 返回成功。[E: packages/opencode/src/tool/read.ts:306][E: packages/opencode/src/tool/read.ts:308] | V2 对 `%PDF` 返回 binary error，当前不是 supported media。[E: packages/core/src/tool/read-filesystem.ts:165][E: packages/core/src/tool/read-filesystem.ts:166] |
| instruction/LSP | V1 read 后触发 LSP warm-up，并可注入 nested instruction reminder。[E: packages/opencode/src/tool/read.ts:117][E: packages/opencode/src/tool/read.ts:300][E: packages/opencode/src/tool/read.ts:353] | V2 Read 文件里没有 instruction/LSP wiring；V2 instructions 属 System Context 体系。[I] |

## 设计动机·edge·历史

V2 工具设计要求 tool 返回完整 validated domain output，统一在 registry settlement 后做 model-facing bounding，而不是让每个 tool 自己管理通用截断。[E: specs/v2/tools.md:155][E: specs/v2/tools.md:157] 这解释了 V2 Read 为什么把文本页/目录页做成 structured output，并让 `ToolRegistry` 在 settlement 阶段调用 `ToolOutputStore.bound`。[E: packages/core/src/tool/registry.ts:73][E: packages/core/src/tool/registry.ts:74]

一个容易踩坑的差异是 PDF：V1 Read 明确把 PDF 走 attachment 成功路径，V2 Read 的 media 检测只列 jpeg/png/gif/webp，PDF 魔数直接触发 binary rejection。[E: packages/opencode/src/tool/read.ts:19][E: packages/opencode/src/tool/read.ts:306][E: packages/core/src/tool/read.ts:17][E: packages/core/src/tool/read-filesystem.ts:165]

## Sources

- packages/opencode/src/tool/read.ts
- packages/opencode/src/session/tools.ts
- packages/core/src/tool/read.ts
- packages/core/src/tool/read-filesystem.ts
- packages/core/src/tool/tool.ts
- packages/core/src/tool/registry.ts
- packages/core/src/tool/builtins.ts
- packages/core/src/session/runner/llm.ts
- specs/v2/tools.md

## 相关

- [V1 工具系统](../../subsystems/tools/v1.md)
- [V2 工具系统](../../subsystems/tools/v2.md)
- [全工具字段 catalog](../../reference/tool-catalog.md)
