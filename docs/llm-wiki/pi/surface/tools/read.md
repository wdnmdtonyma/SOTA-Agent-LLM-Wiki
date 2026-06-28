---
id: surface.tools.read
title: read 文件读取工具
kind: tool
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/read.ts
  - packages/coding-agent/src/core/tools/path-utils.ts
  - packages/coding-agent/src/core/tools/truncate.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
  - packages/coding-agent/src/core/extensions/wrapper.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/tools/render-utils.ts
  - packages/coding-agent/src/utils/mime.ts
  - packages/coding-agent/src/utils/image-process.ts
  - packages/coding-agent/src/utils/paths.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/agent-loop.ts
  - packages/agent/src/types.ts
symbols:
  - createReadTool
  - ReadToolInput
  - ReadOperations
related:
  - subsys.coding-agent.path-resolution
  - subsys.coding-agent.output-truncation
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 5a073885
---

> `read` 是 pi-coding-agent 暴露给模型的文件读取工具:给定 path,读取文本或图片内容,文本支持 offset/limit 分段读取,图片作为 `ImageContent` attachment 返回。

## 能回答的问题

- `read` 的 wire name、工厂函数和 TypeBox input schema 是什么?
- `offset` 和 `limit` 怎么影响文本读取,越界时发生什么?
- 文本输出的 2000 行 / 50KB 截断在哪里实现,`ReadToolDetails` 有哪些字段?
- 图片文件如何识别、转换、缩放,不支持 vision 的模型会看到什么?
- `read` 是怎样从 `tools/index.ts` 注册到 `AgentSession._buildRuntime` 的?
- `ReadOperations` 如何让读取逻辑替换成本地文件系统以外的后端?

## 1 Identity

`read` 的模型可见工具名和 UI label 都是 `"read"`,由 `createReadToolDefinition(cwd, options)` 生成 `ToolDefinition`,再由 `createReadTool(cwd, options)` 调 `wrapToolDefinition(...)` 变成 agent-core 可执行的 `AgentTool` [E: packages/coding-agent/src/core/tools/read.ts:203] [E: packages/coding-agent/src/core/tools/read.ts:210] [E: packages/coding-agent/src/core/tools/read.ts:211] [E: packages/coding-agent/src/core/tools/read.ts:349] [E: packages/coding-agent/src/core/tools/read.ts:350]. `ReadToolInput` 是 `readSchema` 的 `Static` 类型,权威 schema 在 `packages/coding-agent/src/core/tools/read.ts` 内定义 [E: packages/coding-agent/src/core/tools/read.ts:20] [E: packages/coding-agent/src/core/tools/read.ts:26].

该工具属于 `pi-coding-agent` 的内置工具集合: `ToolName` union 包含 `"read"`, `allToolNames` 也包含 `"read"`,并且 `createAllToolDefinitions` 的 `read` key 调用 `createReadToolDefinition(cwd, options?.read)` [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84] [E: packages/coding-agent/src/core/tools/index.ts:156] [E: packages/coding-agent/src/core/tools/index.ts:158].

## 2 用途定位

`read` 面向“查看已有文件内容”,而不是执行 shell 或搜索文件;它的 `description` 明确说支持 text files 与 jpg/png/gif/webp/bmp images,文本输出会在 2000 lines 或 50KB 先到者处截断,大文件需要用 `offset/limit` 继续读 [E: packages/coding-agent/src/core/tools/read.ts:212]. 系统提示片段是 `"Read file contents"`,提示 guideline 要模型用 `read` 查看文件而不是 `cat` 或 `sed` [E: packages/coding-agent/src/core/tools/read.ts:213] [E: packages/coding-agent/src/core/tools/read.ts:214].

`read` 的路径解析由 `resolveReadPathAsync(path, cwd)` 完成,所以相对路径以当前 session cwd 为基准;`resolveToCwd` 调用 `resolvePath(...)` 时开启去掉 `@` 前缀和 Unicode space normalize,而 `resolvePath(...)` 默认会展开 leading `~` [E: packages/coding-agent/src/core/tools/read.ts:238] [E: packages/coding-agent/src/core/tools/path-utils.ts:48] [E: packages/coding-agent/src/core/tools/path-utils.ts:49] [E: packages/coding-agent/src/utils/paths.ts:66] [E: packages/coding-agent/src/utils/paths.ts:67] [E: packages/coding-agent/src/utils/paths.ts:68] [E: packages/coding-agent/src/utils/paths.ts:69] [E: packages/coding-agent/src/utils/paths.ts:70] [E: packages/coding-agent/src/utils/paths.ts:81] [E: packages/coding-agent/src/utils/paths.ts:82] [E: packages/coding-agent/src/utils/paths.ts:84]. 路径相关的更完整背景属于 [subsys.coding-agent.path-resolution](../../subsystems/coding-agent/path-resolution.md);本节点只覆盖 `read` 直接调用的解析行为。

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `path` | `string` | 是 | 无 | TypeBox 只声明 string | 要读取的文件路径,可相对 cwd 或绝对路径 [E: packages/coding-agent/src/core/tools/read.ts:20] [E: packages/coding-agent/src/core/tools/read.ts:21]. |
| `offset` | `number` | 否 | 读取第 1 行起 | TypeBox 未声明 minimum;执行时按 1-indexed 转 0-indexed,并用 `Math.max(0, offset - 1)` 把负数夹到 0 [E: packages/coding-agent/src/core/tools/read.ts:22] [E: packages/coding-agent/src/core/tools/read.ts:271] [E: packages/coding-agent/src/core/tools/read.ts:272]. | 起始行号;`offset` 超过文件总行数时抛 `Offset ... is beyond end of file` [E: packages/coding-agent/src/core/tools/read.ts:274] [E: packages/coding-agent/src/core/tools/read.ts:275]. |
| `limit` | `number` | 否 | 无 | TypeBox 未声明 minimum;执行时用 `slice(startLine, min(startLine + limit, allLines.length))` [E: packages/coding-agent/src/core/tools/read.ts:23] [E: packages/coding-agent/src/core/tools/read.ts:280] [E: packages/coding-agent/src/core/tools/read.ts:281] [E: packages/coding-agent/src/core/tools/read.ts:282]. | 最大读取行数;当 `limit` 提前停止但文件仍有后续内容,输出会追加剩余行数和下一次 `offset` 提示 [E: packages/coding-agent/src/core/tools/read.ts:306] [E: packages/coding-agent/src/core/tools/read.ts:309] [E: packages/coding-agent/src/core/tools/read.ts:310]. |

## 4 输出 & 截断

文本文件路径:工具先用 `ops.readFile(absolutePath)` 取 Buffer,再用 `buffer.toString("utf-8")` 解码并按 `\n` 拆行 [E: packages/coding-agent/src/core/tools/read.ts:266] [E: packages/coding-agent/src/core/tools/read.ts:267] [E: packages/coding-agent/src/core/tools/read.ts:268]. 未指定 `limit` 时,`selectedContent` 是从 `startLine` 到文件末尾;指定 `limit` 时,先按用户行范围切片,再交给 `truncateHead(selectedContent)` [E: packages/coding-agent/src/core/tools/read.ts:280] [E: packages/coding-agent/src/core/tools/read.ts:285] [E: packages/coding-agent/src/core/tools/read.ts:288].

截断上限来自 `truncate.ts`:默认最大 2000 行和 50KB;`truncateHead` 循环按行累积,先遇到 byte limit 就标记 `truncatedBy = "bytes"`,达到行数上限且未超 byte limit 时标记 `truncatedBy = "lines"` [E: packages/coding-agent/src/core/tools/truncate.ts:11] [E: packages/coding-agent/src/core/tools/truncate.ts:12] [E: packages/coding-agent/src/core/tools/truncate.ts:78] [E: packages/coding-agent/src/core/tools/truncate.ts:79] [E: packages/coding-agent/src/core/tools/truncate.ts:80] [E: packages/coding-agent/src/core/tools/truncate.ts:126] [E: packages/coding-agent/src/core/tools/truncate.ts:130] [E: packages/coding-agent/src/core/tools/truncate.ts:131] [E: packages/coding-agent/src/core/tools/truncate.ts:135] [E: packages/coding-agent/src/core/tools/truncate.ts:140] [E: packages/coding-agent/src/core/tools/truncate.ts:141]. `truncateHead` 返回完整行 join 后的 `content`;如果第一行单独超过 byte limit,返回空 content 并把 `firstLineExceedsLimit` 置为 true [E: packages/coding-agent/src/core/tools/truncate.ts:104] [E: packages/coding-agent/src/core/tools/truncate.ts:105] [E: packages/coding-agent/src/core/tools/truncate.ts:107] [E: packages/coding-agent/src/core/tools/truncate.ts:115] [E: packages/coding-agent/src/core/tools/truncate.ts:144] [E: packages/coding-agent/src/core/tools/truncate.ts:148]. `ReadToolDetails` 只有一个可选字段 `truncation?: TruncationResult`,所以 `read` 没有 bash 那种 `fullOutputPath` spillover 文件 [E: packages/coding-agent/src/core/tools/read.ts:28] [E: packages/coding-agent/src/core/tools/read.ts:29].

截断后的模型可见文本会带可操作 continuation notice:按行数截断时追加 `[Showing lines A-B of TOTAL. Use offset=N to continue.]`;按 byte limit 截断时追加同样的范围加 `50.0KB limit`;第一行超限时输出建议用 `bash: sed -n 'Xp' ... | head -c 51200` 读取该行前 50KB [E: packages/coding-agent/src/core/tools/read.ts:290] [E: packages/coding-agent/src/core/tools/read.ts:293] [E: packages/coding-agent/src/core/tools/read.ts:300] [E: packages/coding-agent/src/core/tools/read.ts:301] [E: packages/coding-agent/src/core/tools/read.ts:303]. 只有发生 truncation 或第一行超限时才设置 `details = { truncation }`;纯 `limit` 提前停止只改文本提示,不会填 `details` [E: packages/coding-agent/src/core/tools/read.ts:294] [E: packages/coding-agent/src/core/tools/read.ts:305] [E: packages/coding-agent/src/core/tools/read.ts:306] [E: packages/coding-agent/src/core/tools/read.ts:310].

TUI 展示层另有折叠策略:未 expanded 且非 error 时 `renderResult` 返回空字符串;expanded 时展示全部渲染行,非 expanded 的 error 结果最多展示 10 行,并对 `details.truncation` 追加 warning 行 [E: packages/coding-agent/src/core/tools/read.ts:173] [E: packages/coding-agent/src/core/tools/read.ts:182] [E: packages/coding-agent/src/core/tools/read.ts:190] [E: packages/coding-agent/src/core/tools/read.ts:191] [E: packages/coding-agent/src/core/tools/read.ts:195] [E: packages/coding-agent/src/core/tools/read.ts:197].

## 5 执行模式 executionMode

`createReadToolDefinition` 返回的对象没有写 `executionMode` 字段,`wrapToolDefinition` 只是把 `definition.executionMode` 原样转给 `AgentTool` [E: packages/coding-agent/src/core/tools/read.ts:209] [E: packages/coding-agent/src/core/tools/read.ts:216] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:9] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:15]. agent-core 的 `AgentTool.executionMode` 是 optional;省略时使用全局默认执行模式 [E: packages/agent/src/types.ts:393] [E: packages/agent/src/types.ts:259].

全局默认在 `Agent` 构造函数里是 `"parallel"`,并通过 `createLoopConfig` 放入 `AgentLoopConfig.toolExecution` [E: packages/agent/src/agent.ts:218] [E: packages/agent/src/agent.ts:422] [E: packages/agent/src/agent.ts:433]. agent loop 对一个 assistant message 的 tool calls 做批处理:如果全局 `toolExecution === "sequential"` 或任意被请求工具显式 `executionMode === "sequential"`,整批顺序执行;否则并行执行 [E: packages/agent/src/agent-loop.ts:380] [E: packages/agent/src/agent-loop.ts:381] [E: packages/agent/src/agent-loop.ts:382] [E: packages/agent/src/agent-loop.ts:384] [E: packages/agent/src/agent-loop.ts:387]. 因此 `read` 自身没有强制 sequential;在默认 Agent 配置下,多个 `read` 调用可与其它未声明 sequential 的工具并行执行 [I].

## 6 注册与装配

工具集合 ground truth 在 `packages/coding-agent/src/core/tools/index.ts`: `createToolDefinition("read", cwd, options)`、`createTool("read", cwd, options)`、`createCodingToolDefinitions`、`createReadOnlyToolDefinitions`、`createAllToolDefinitions`、`createCodingTools`、`createReadOnlyTools` 和 `createAllTools` 都显式包含 `read` [E: packages/coding-agent/src/core/tools/index.ts:96] [E: packages/coding-agent/src/core/tools/index.ts:99] [E: packages/coding-agent/src/core/tools/index.ts:117] [E: packages/coding-agent/src/core/tools/index.ts:120] [E: packages/coding-agent/src/core/tools/index.ts:138] [E: packages/coding-agent/src/core/tools/index.ts:140] [E: packages/coding-agent/src/core/tools/index.ts:147] [E: packages/coding-agent/src/core/tools/index.ts:149] [E: packages/coding-agent/src/core/tools/index.ts:156] [E: packages/coding-agent/src/core/tools/index.ts:158] [E: packages/coding-agent/src/core/tools/index.ts:168] [E: packages/coding-agent/src/core/tools/index.ts:170] [E: packages/coding-agent/src/core/tools/index.ts:177] [E: packages/coding-agent/src/core/tools/index.ts:179] [E: packages/coding-agent/src/core/tools/index.ts:186] [E: packages/coding-agent/src/core/tools/index.ts:188].

`AgentSession._buildRuntime` 是会话装配点:它从 settings 读取 `autoResizeImages`,再调用 `createAllToolDefinitions(this._cwd, { read: { autoResizeImages }, bash: ... })` 生成内置工具定义 [E: packages/coding-agent/src/core/agent-session.ts:2403] [E: packages/coding-agent/src/core/agent-session.ts:2408] [E: packages/coding-agent/src/core/agent-session.ts:2418] [E: packages/coding-agent/src/core/agent-session.ts:2419]. `getImageAutoResize()` 默认返回 true,所以没有配置时 `read` 会尝试自动缩放图片 [E: packages/coding-agent/src/core/settings-manager.ts:1107] [E: packages/coding-agent/src/core/settings-manager.ts:1108].

会话随后把内置 `ToolDefinition` 放进 `_baseToolDefinitions`,刷新 registry 时将内置定义标记为 `<builtin:name>` source,再用 `wrapRegisteredTools` 包成 `AgentTool` 并写入 `_toolRegistry` [E: packages/coding-agent/src/core/agent-session.ts:2423] [E: packages/coding-agent/src/core/agent-session.ts:2424] [E: packages/coding-agent/src/core/agent-session.ts:2326] [E: packages/coding-agent/src/core/agent-session.ts:2333] [E: packages/coding-agent/src/core/agent-session.ts:2362] [E: packages/coding-agent/src/core/agent-session.ts:2372] [E: packages/coding-agent/src/core/agent-session.ts:2376]. `wrapRegisteredTools` 最终调用 `wrapToolDefinitions(..., () => runner.createContext())`,因此内置 `read` 执行时拿到 extension context,可读取当前模型信息以判断图片提示 [E: packages/coding-agent/src/core/extensions/wrapper.ts:25] [E: packages/coding-agent/src/core/extensions/wrapper.ts:26] [E: packages/coding-agent/src/core/extensions/wrapper.ts:28] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:16] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:17].

默认 active built-in tools 是 `["read", "bash", "edit", "write"]`;`AgentSessionConfig` 也有可覆盖默认 active tool names 的 `initialActiveToolNames` 字段 [E: packages/coding-agent/src/core/agent-session.ts:173] [E: packages/coding-agent/src/core/agent-session.ts:2447] [E: packages/coding-agent/src/core/agent-session.ts:2449]. 如果用户或 SDK 指定 `allowedToolNames` / `excludedToolNames`,`_refreshToolRegistry` 会在 definition 和 active tool registry 两层过滤工具名 [E: packages/coding-agent/src/core/agent-session.ts:175] [E: packages/coding-agent/src/core/agent-session.ts:177] [E: packages/coding-agent/src/core/agent-session.ts:2313] [E: packages/coding-agent/src/core/agent-session.ts:2315] [E: packages/coding-agent/src/core/agent-session.ts:2325] [E: packages/coding-agent/src/core/agent-session.ts:2380].

## 7 execute() 走读

`execute()` 先建立 abort listener;如果调用开始时或读取过程中 `AbortSignal` 已触发,会 reject `Operation aborted`,后续检查到 `aborted` 时提前 return,catch 分支也不会再次 reject [E: packages/coding-agent/src/core/tools/read.ts:223] [E: packages/coding-agent/src/core/tools/read.ts:225] [E: packages/coding-agent/src/core/tools/read.ts:231] [E: packages/coding-agent/src/core/tools/read.ts:232] [E: packages/coding-agent/src/core/tools/read.ts:234] [E: packages/coding-agent/src/core/tools/read.ts:239] [E: packages/coding-agent/src/core/tools/read.ts:242] [E: packages/coding-agent/src/core/tools/read.ts:318] [E: packages/coding-agent/src/core/tools/read.ts:323]. 主流程解析路径后调用 `ops.access(absolutePath)` 检查可读性,再用可插拔 `ops.detectImageMimeType` 决定走图片还是文本分支 [E: packages/coding-agent/src/core/tools/read.ts:238] [E: packages/coding-agent/src/core/tools/read.ts:241] [E: packages/coding-agent/src/core/tools/read.ts:243].

`ReadOperations` 是 `read` 的可替换 IO 边界:它要求 `readFile(absolutePath): Promise<Buffer>` 和 `access(absolutePath): Promise<void>`,可选 `detectImageMimeType(absolutePath)`;`ReadToolOptions.operations` 可传入自定义实现,`createReadToolDefinition` 会优先使用 `options?.operations` [E: packages/coding-agent/src/core/tools/read.ts:43] [E: packages/coding-agent/src/core/tools/read.ts:45] [E: packages/coding-agent/src/core/tools/read.ts:47] [E: packages/coding-agent/src/core/tools/read.ts:49] [E: packages/coding-agent/src/core/tools/read.ts:58] [E: packages/coding-agent/src/core/tools/read.ts:62] [E: packages/coding-agent/src/core/tools/read.ts:208]. 默认实现使用 `fs/promises.readFile`、`fs/promises.access(..., constants.R_OK)` 和 `detectSupportedImageMimeTypeFromFile` [E: packages/coding-agent/src/core/tools/read.ts:52] [E: packages/coding-agent/src/core/tools/read.ts:53] [E: packages/coding-agent/src/core/tools/read.ts:54] [E: packages/coding-agent/src/core/tools/read.ts:55].

图片分支读取二进制 Buffer 后调用 `processImage(buffer, mimeType, { autoResizeImages })`;失败时只返回 text note,成功时返回一个 text note 加一个 `{ type: "image", data, mimeType }` block [E: packages/coding-agent/src/core/tools/read.ts:247] [E: packages/coding-agent/src/core/tools/read.ts:249] [E: packages/coding-agent/src/core/tools/read.ts:250] [E: packages/coding-agent/src/core/tools/read.ts:252] [E: packages/coding-agent/src/core/tools/read.ts:254] [E: packages/coding-agent/src/core/tools/read.ts:256] [E: packages/coding-agent/src/core/tools/read.ts:260] [E: packages/coding-agent/src/core/tools/read.ts:261]. 文本分支最终返回一个 text block,没有额外 image block [E: packages/coding-agent/src/core/tools/read.ts:315].

## 8 设计动机与 edge

### 路径解析 edge

`resolveReadPathAsync` 先按 cwd 解析原路径;如果文件不存在,依次尝试 macOS screenshot AM/PM 的 narrow no-break space 变体、NFD Unicode 变体、straight apostrophe 到 curly quote 变体、以及 NFD+curly quote 组合,全部失败才返回原 resolved path 让后续 `ops.access` 抛错 [E: packages/coding-agent/src/core/tools/path-utils.ts:86] [E: packages/coding-agent/src/core/tools/path-utils.ts:87] [E: packages/coding-agent/src/core/tools/path-utils.ts:89] [E: packages/coding-agent/src/core/tools/path-utils.ts:94] [E: packages/coding-agent/src/core/tools/path-utils.ts:95] [E: packages/coding-agent/src/core/tools/path-utils.ts:100] [E: packages/coding-agent/src/core/tools/path-utils.ts:101] [E: packages/coding-agent/src/core/tools/path-utils.ts:106] [E: packages/coding-agent/src/core/tools/path-utils.ts:107] [E: packages/coding-agent/src/core/tools/path-utils.ts:112] [E: packages/coding-agent/src/core/tools/path-utils.ts:113] [E: packages/coding-agent/src/core/tools/path-utils.ts:117].

### 图片识别 edge

默认 MIME detection 从文件头读取 bytes,不是看扩展名:JPEG、非 animated PNG、GIF、WEBP、BMP 会返回对应 MIME,其它返回 null [E: packages/coding-agent/src/utils/mime.ts:6] [E: packages/coding-agent/src/utils/mime.ts:7] [E: packages/coding-agent/src/utils/mime.ts:10] [E: packages/coding-agent/src/utils/mime.ts:13] [E: packages/coding-agent/src/utils/mime.ts:16] [E: packages/coding-agent/src/utils/mime.ts:19] [E: packages/coding-agent/src/utils/mime.ts:22] [E: packages/coding-agent/src/utils/mime.ts:25] [E: packages/coding-agent/src/utils/mime.ts:29] [E: packages/coding-agent/src/utils/mime.ts:30]. `processImage` 原生接受 PNG/JPEG/GIF/WEBP;BMP 等非 inline MIME 会尝试转 PNG,并在成功时加入 `[Image converted from ...]` hint [E: packages/coding-agent/src/utils/image-process.ts:33] [E: packages/coding-agent/src/utils/image-process.ts:35] [E: packages/coding-agent/src/utils/image-process.ts:37] [E: packages/coding-agent/src/utils/image-process.ts:40] [E: packages/coding-agent/src/utils/image-process.ts:42] [E: packages/coding-agent/src/utils/image-process.ts:44] [E: packages/coding-agent/src/utils/image-process.ts:49] [E: packages/coding-agent/src/utils/image-process.ts:55] [E: packages/coding-agent/src/utils/image-process.ts:60] [E: packages/coding-agent/src/utils/image-process.ts:67] [E: packages/coding-agent/src/utils/image-process.ts:69].

当 `autoResizeImages` 为 true 时,`processImage` 会调用 `resizeImage`;如果无法压到 inline image size limit,read 的图片分支会退化为纯文本省略说明 [E: packages/coding-agent/src/utils/image-process.ts:77] [E: packages/coding-agent/src/utils/image-process.ts:86] [E: packages/coding-agent/src/utils/image-process.ts:87] [E: packages/coding-agent/src/utils/image-process.ts:89] [E: packages/coding-agent/src/utils/image-process.ts:91] [E: packages/coding-agent/src/core/tools/read.ts:251] [E: packages/coding-agent/src/core/tools/read.ts:254]. 如果当前 model 不声明 image input,`read` 会在 text note 追加“当前模型不支持图片,图片会从请求中省略”的提示;该判断只看 `ctx?.model.input.includes("image")` [E: packages/coding-agent/src/core/tools/read.ts:87] [E: packages/coding-agent/src/core/tools/read.ts:88] [E: packages/coding-agent/src/core/tools/read.ts:91] [E: packages/coding-agent/src/core/tools/read.ts:246] [E: packages/coding-agent/src/core/tools/read.ts:258].

### UI compact edge

折叠态下,读取 `SKILL.md` 会显示 `[skill] <目录名>`,读取 pi 自身 `README.md` / `docs/*` / `examples/*` 会显示 `read docs <label>`,读取 `AGENTS.md` / `CLAUDE.md` 会显示 `read resource <path>`;这是 `renderCall` / `renderResult` 的 UI render 逻辑,模型可见 tool result 仍来自 `execute()` 返回的 `content` [E: packages/coding-agent/src/core/tools/read.ts:117] [E: packages/coding-agent/src/core/tools/read.ts:121] [E: packages/coding-agent/src/core/tools/read.ts:126] [E: packages/coding-agent/src/core/tools/read.ts:130] [E: packages/coding-agent/src/core/tools/read.ts:133] [E: packages/coding-agent/src/core/tools/read.ts:260] [E: packages/coding-agent/src/core/tools/read.ts:261] [E: packages/coding-agent/src/core/tools/read.ts:315] [E: packages/coding-agent/src/core/tools/read.ts:331] [E: packages/coding-agent/src/core/tools/read.ts:334] [E: packages/coding-agent/src/core/tools/read.ts:342]. 如果 TUI 无法或不允许显示 inline image,`getTextOutput` 会把 image blocks 渲染成 image fallback indicator 加到文本输出里 [E: packages/coding-agent/src/core/tools/render-utils.ts:45] [E: packages/coding-agent/src/core/tools/render-utils.ts:46] [E: packages/coding-agent/src/core/tools/render-utils.ts:51] [E: packages/coding-agent/src/core/tools/render-utils.ts:57] [E: packages/coding-agent/src/core/tools/render-utils.ts:60].

### 与全局 blockImages 的边界

`read` 工具本身仍会产生 image block;全局 `images.blockImages` 的防线在 SDK 的 `convertToLlm` wrapper,它在 provider 请求转换阶段检查 `settings.images?.blockImages` 并把 user/toolResult 中的 image content 替换为文本 `"Image reading is disabled."` [E: packages/coding-agent/src/core/tools/read.ts:260] [E: packages/coding-agent/src/core/tools/read.ts:261] [E: packages/coding-agent/src/core/settings-manager.ts:1120] [E: packages/coding-agent/src/core/settings-manager.ts:1121] [E: packages/coding-agent/src/core/sdk.ts:255] [E: packages/coding-agent/src/core/sdk.ts:258] [E: packages/coding-agent/src/core/sdk.ts:263] [E: packages/coding-agent/src/core/sdk.ts:266] [E: packages/coding-agent/src/core/sdk.ts:270]. 这意味着 UI/tool result 层和 provider payload 层对图片的处理不是同一个开关 [I].

## Sources

- packages/coding-agent/src/core/tools/read.ts
- packages/coding-agent/src/core/tools/path-utils.ts
- packages/coding-agent/src/core/tools/truncate.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
- packages/coding-agent/src/core/extensions/wrapper.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/tools/render-utils.ts
- packages/coding-agent/src/utils/mime.ts
- packages/coding-agent/src/utils/image-process.ts
- packages/coding-agent/src/utils/paths.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts
- packages/agent/src/types.ts

## 相关

- [subsys.coding-agent.path-resolution](../../subsystems/coding-agent/path-resolution.md)
- [subsys.coding-agent.output-truncation](../../subsystems/coding-agent/output-truncation.md)
- [ref.tools-catalog](../../reference/tools-catalog.md)
