---
id: surface.tools.ls
title: ls 目录列出工具
kind: tool
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/ls.ts
  - packages/coding-agent/src/core/tools/renderers/ls.ts
  - packages/coding-agent/src/core/tools/path-utils.ts
  - packages/coding-agent/src/utils/paths.ts
  - packages/coding-agent/src/core/tools/truncate.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/agent-loop.ts
  - packages/agent/src/types.ts
  - packages/coding-agent/test/tools.test.ts
symbols:
  - createLsTool
  - LsToolInput
  - LsToolDetails
related:
  - subsys.coding-agent.output-truncation
  - ref.tools-catalog
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `ls` 是 pi-coding-agent 暴露给模型的 directory listing tool: 给定目录路径,按字母序返回条目名,目录追加 `/`,包含 dotfiles,并用 entry limit 与 byte truncation 控制输出体积。

## 能回答的问题

- `ls` tool 的 wire name、工厂函数和 TypeBox input schema 是什么?
- `path` 与 `limit` 的默认值分别在哪里实现?
- 目录条目如何排序、如何标记 directory、是否包含 dotfiles?
- `LsToolDetails` 会记录哪些截断信息,`ls` 有没有 `fullOutputPath`?
- `ls` 的 `executionMode` 是显式 sequential 还是继承默认 parallel?
- `ls` 如何通过 `tools/index.ts` 和 `AgentSession._buildRuntime()` 进入 tool registry?

## 1 Identity

模型看到的 tool name 是 `"ls"`,UI label 也是 `"ls"`;这两个字段由 `createLsToolDefinition(cwd, options)` 返回的 `ToolDefinition` 直接设置 [E: packages/coding-agent/src/core/tools/ls.ts:54] [E: packages/coding-agent/src/core/tools/ls.ts:60] [E: packages/coding-agent/src/core/tools/ls.ts:61]。`createLsTool(cwd, options)` 是便捷工厂:它调用 `createLsToolDefinition(cwd, options)`,再交给 `wrapToolDefinition()` 变成 agent-core 的 `AgentTool` [E: packages/coding-agent/src/core/tools/ls.ts:127] [E: packages/coding-agent/src/core/tools/ls.ts:174]。

`LsToolInput` 是 `Static<typeof lsSchema>`,所以 TypeScript 输入类型来自同一个 TypeBox schema [E: packages/coding-agent/src/core/tools/ls.ts:11] [E: packages/coding-agent/src/core/tools/ls.ts:21]。`LsToolDetails` 只有 `truncation?: TruncationResult` 与 `entryLimitReached?: number` 两个可选字段,没有 `fullOutputPath` 字段 [E: packages/coding-agent/src/core/tools/ls.ts:25] [E: packages/coding-agent/src/core/tools/ls.ts:23] [E: packages/coding-agent/src/core/tools/ls.ts:27]。

## 2 用途定位

`ls` 用于列出目录内容,不是读取文件内容或执行 shell;工具 description 明确说它返回 alphabetically sorted entries,目录追加 `/`,包含 dotfiles,并在 500 entries 或 `DEFAULT_MAX_BYTES / 1024` KB 先到者处截断 [E: packages/coding-agent/src/core/tools/ls.ts:62]。默认 entry limit 是 `DEFAULT_LIMIT = 500`,默认 byte limit 来自 shared truncation 常量 `DEFAULT_MAX_BYTES = 50 * 1024` [E: packages/coding-agent/src/core/tools/ls.ts:23] [E: packages/coding-agent/src/core/tools/truncate.ts:12]。

路径解析用 `resolveToCwd(path || ".", ctx?.cwd || cwd)`:缺省或空 `path` 会列当前 cwd,相对路径按 `ctx.cwd` 或工厂 `cwd` 解析,同时复用 `resolvePath(..., { normalizeUnicodeSpaces: true, stripAtPrefix: true })`;`resolvePath()` 会先 `normalizePath()` 再按 absolute/relative 解析,`normalizePath()` 负责 `~` expansion、Unicode space normalize 与 `@` 前缀剥离 [E: packages/coding-agent/src/core/tools/ls.ts:83] [E: packages/coding-agent/src/core/tools/path-utils.ts:49] [E: packages/coding-agent/src/utils/paths.ts:75] [E: packages/coding-agent/src/utils/paths.ts:78] [E: packages/coding-agent/src/utils/paths.ts:80] [E: packages/coding-agent/src/utils/paths.ts:87] [E: packages/coding-agent/src/utils/paths.ts:102] [E: packages/coding-agent/src/utils/paths.ts:105] [E: packages/coding-agent/test/tools.test.ts:992]。`ls` 没有调用 `resolveReadPathAsync`,所以 `read` 专用的 macOS screenshot AM/PM、NFD、curly quote fallback 不属于 `ls` 的解析路径 [E: packages/coding-agent/src/core/tools/ls.ts:6] [E: packages/coding-agent/src/core/tools/ls.ts:83] [E: packages/coding-agent/src/core/tools/path-utils.ts:86] [I]。

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `path` | `string` | 否 | `"."` | TypeBox 只声明 optional string;执行时用 `path || "."` | 要列出的目录;schema description 写的是 `Directory to list (default: current directory)` [E: packages/coding-agent/src/core/tools/ls.ts:12] [E: packages/coding-agent/src/core/tools/ls.ts:83]。 |
| `limit` | `number` | 否 | `500` | TypeBox 只声明 optional number;执行时没有 minimum clamp | 最多返回多少个可 stat 的 entry;schema description 写默认 500,实现用 `limit ?? DEFAULT_LIMIT` [E: packages/coding-agent/src/core/tools/ls.ts:13] [E: packages/coding-agent/src/core/tools/ls.ts:23] [E: packages/coding-agent/src/core/tools/ls.ts:84]。 |

`limit` 小于等于 0 时不会被提升到 1:循环开始时 `results.length >= effectiveLimit` 立即成立,于是返回 empty-directory 文本而不是 limit notice,这是由当前实现推出的 edge case [E: packages/coding-agent/src/core/tools/ls.ts:115] [E: packages/coding-agent/src/core/tools/ls.ts:88] [E: packages/coding-agent/src/core/tools/ls.ts:135] [I]。

## 4 输出 & 截断

执行成功时,非空目录的模型可见输出是 `results.join("\n")`,每行一个 entry name;目录条目在成功 `stat` 后追加 `/`,普通文件不追加 suffix [E: packages/coding-agent/src/core/tools/ls.ts:123] [E: packages/coding-agent/src/core/tools/ls.ts:78] [E: packages/coding-agent/src/core/tools/ls.ts:83] [E: packages/coding-agent/src/core/tools/ls.ts:93]。空结果返回 text content `"(empty directory)"` 且 `details: undefined` [E: packages/coding-agent/src/core/tools/ls.ts:134] [E: packages/coding-agent/src/core/tools/ls.ts:135]。

输出先受 entry limit 控制:循环在 `results.length >= effectiveLimit` 时停止,设置 `entryLimitReached = true`,并在 details 中写入 `entryLimitReached = effectiveLimit` [E: packages/coding-agent/src/core/tools/ls.ts:115] [E: packages/coding-agent/src/core/tools/ls.ts:116] [E: packages/coding-agent/src/core/tools/ls.ts:146] [E: packages/coding-agent/src/core/tools/ls.ts:102]。发生 entry limit 时,文本尾部追加 notice: ``${effectiveLimit} entries limit reached. Use limit=${effectiveLimit * 2} for more`` [E: packages/coding-agent/src/core/tools/ls.ts:147] [E: packages/coding-agent/src/core/tools/ls.ts:154] [E: packages/coding-agent/src/core/tools/ls.ts:109]。

entry limit 之后再做 byte truncation:实现把 `rawOutput` 交给 `truncateHead(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER })`,所以 `ls` 没有单独的普通 line limit,主要由 entry count 与默认 50KB byte limit 控制 [E: packages/coding-agent/src/core/tools/ls.ts:93] [E: packages/coding-agent/src/core/tools/ls.ts:95] [E: packages/coding-agent/src/core/tools/truncate.ts:79] [E: packages/coding-agent/src/core/tools/truncate.ts:80]。byte truncation 发生时,details 写入 `truncation`,文本 notice 追加 `50.0KB limit reached` [E: packages/coding-agent/src/core/tools/ls.ts:104] [E: packages/coding-agent/src/core/tools/ls.ts:151] [E: packages/coding-agent/src/core/tools/ls.ts:152] [E: packages/coding-agent/src/core/tools/ls.ts:109] [E: packages/coding-agent/src/core/tools/truncate.ts:61] [E: packages/coding-agent/src/core/tools/truncate.ts:65]。

TUI render 层还有显示折叠:未 expanded 时最多展示 20 行,剩余行数用 `... (N more lines, <expand hint>)` 提示;这只影响 UI display,不改变 tool result 的 `content` [E: packages/coding-agent/src/core/tools/renderers/ls.ts:39] [E: packages/coding-agent/src/core/tools/renderers/ls.ts:40] [E: packages/coding-agent/src/core/tools/renderers/ls.ts:43] [E: packages/coding-agent/src/core/tools/renderers/ls.ts:44]。如果 details 里有 entry limit 或 truncation,render 层再追加 `[Truncated: ...]` warning [E: packages/coding-agent/src/core/tools/renderers/ls.ts:48] [E: packages/coding-agent/src/core/tools/renderers/ls.ts:50] [E: packages/coding-agent/src/core/tools/renderers/ls.ts:51] [E: packages/coding-agent/src/core/tools/renderers/ls.ts:54]。

## 5 执行模式

`createLsToolDefinition()` 返回对象没有显式 `executionMode` 字段:它设置 `name`、`label`、`description`、`promptSnippet`、`parameters`、`execute` 和 spread 进来的 renderers,但没有 per-tool execution override [E: packages/coding-agent/src/core/tools/ls.ts:59] [E: packages/coding-agent/src/core/tools/ls.ts:64] [E: packages/coding-agent/src/core/tools/ls.ts:123] [I]。`ToolDefinition.executionMode` 是 optional,省略时使用 default execution mode [E: packages/coding-agent/src/core/extensions/types.ts:479]。

agent-core 的全局默认 `toolExecution` 是 `"parallel"`,并在 agent loop 中只有当全局配置为 sequential 或某个 tool 显式 `executionMode === "sequential"` 时才整批顺序执行;否则走 parallel 执行路径 [E: packages/agent/src/agent.ts:237] [E: packages/agent/src/agent-loop.ts:418] [E: packages/agent/src/agent-loop.ts:420] [E: packages/agent/src/agent-loop.ts:421]。因此 `ls` 自身没有强制 sequential;在默认 Agent 配置下,多个 `ls` 或其它未声明 sequential 的 tool calls 可并行执行 [I]。

## 6 注册与装配

内置工具集 ground truth 在 `packages/coding-agent/src/core/tools/index.ts`: `ToolName` union 包含 `"ls"`, `allToolNames` 也包含 `"ls"` [E: packages/coding-agent/src/core/tools/index.ts:95] [E: packages/coding-agent/src/core/tools/index.ts:104]。`createToolDefinition("ls", cwd, options)` 分派到 `createLsToolDefinition(cwd, options?.ls)`, `createTool("ls", cwd, options)` 分派到 `createLsTool(cwd, options?.ls)` [E: packages/coding-agent/src/core/tools/index.ts:134] [E: packages/coding-agent/src/core/tools/index.ts:135] [E: packages/coding-agent/src/core/tools/index.ts:157] [E: packages/coding-agent/src/core/tools/index.ts:158]。

`ls` 不在 coding preset 里: `createCodingToolDefinitions()` 只返回 read/bash/edit/write [E: packages/coding-agent/src/core/tools/index.ts:166] [E: packages/coding-agent/src/core/tools/index.ts:167] [E: packages/coding-agent/src/core/tools/index.ts:168] [E: packages/coding-agent/src/core/tools/index.ts:169]。`ls` 在 read-only preset 里: `createReadOnlyToolDefinitions()` 返回 read/grep/find/ls [E: packages/coding-agent/src/core/tools/index.ts:175] [E: packages/coding-agent/src/core/tools/index.ts:176] [E: packages/coding-agent/src/core/tools/index.ts:177] [E: packages/coding-agent/src/core/tools/index.ts:178]。完整 registry 里也有 `ls`: `createAllToolDefinitions()` 的 `ls` key 绑定到 `createLsToolDefinition(cwd, options?.ls)` [E: packages/coding-agent/src/core/tools/index.ts:182] [E: packages/coding-agent/src/core/tools/index.ts:191]。

`AgentSession._buildRuntime()` 默认调用 `createAllToolDefinitions(this._cwd, { read: { autoResizeImages }, bash: { commandPrefix, shellPath } })`,所以 `ls` 会进入 base tool definitions,但没有专属 options 传入 [E: packages/coding-agent/src/core/agent-session.ts:2802] [E: packages/coding-agent/src/core/agent-session.ts:2802] [E: packages/coding-agent/src/core/agent-session.ts:2803] [E: packages/coding-agent/src/core/agent-session.ts:2804]。随后 `_refreshToolRegistry()` 把 base definitions 标成 builtin source,用 `wrapRegisteredTools()` 包成 `AgentTool`,并写入 `_toolRegistry` [E: packages/coding-agent/src/core/agent-session.ts:2717] [E: packages/coding-agent/src/core/agent-session.ts:2746] [E: packages/coding-agent/src/core/agent-session.ts:2756] [E: packages/coding-agent/src/core/agent-session.ts:2760]。`AgentSession` 默认 active built-ins 是 `["read", "bash", "edit", "write"]`,所以 `ls` 是内置可用 registry tool,但不是默认 active tool,除非 active tool names、allowlist、plan/read-only mode 或 extension/runtime 流程启用它 [E: packages/coding-agent/src/core/agent-session.ts:2831] [E: packages/coding-agent/src/core/agent-session.ts:2833] [I]。

## 7 execute() 走读

`execute()` 先创建 abort-aware Promise:如果传入的 `AbortSignal` 已 aborted 或后续触发 abort,都会 reject `Operation aborted` [E: packages/coding-agent/src/core/tools/ls.ts:73] [E: packages/coding-agent/src/core/tools/ls.ts:74] [E: packages/coding-agent/src/core/tools/ls.ts:78]。随后它把 `path || "."` 按 `ctx?.cwd || cwd` 解析成 `dirPath`,把 `limit ?? DEFAULT_LIMIT` 解析成 `effectiveLimit` [E: packages/coding-agent/src/core/tools/ls.ts:83] [E: packages/coding-agent/src/core/tools/ls.ts:84]。

存在性与目录性是两个独立错误:不存在时 reject `Path not found: ${dirPath}`,存在但不是目录时 reject `Not a directory: ${dirPath}` [E: packages/coding-agent/src/core/tools/ls.ts:87] [E: packages/coding-agent/src/core/tools/ls.ts:88] [E: packages/coding-agent/src/core/tools/ls.ts:67] [E: packages/coding-agent/src/core/tools/ls.ts:49]。`readdir` 异常被改写为 `Cannot read directory: ${e.message}` [E: packages/coding-agent/src/core/tools/ls.ts:102] [E: packages/coding-agent/src/core/tools/ls.ts:104]。

条目读取后先按 `a.toLowerCase().localeCompare(b.toLowerCase())` 做 case-insensitive alphabetical sort [E: packages/coding-agent/src/core/tools/ls.ts:109]。每个 entry 再用 `ops.stat(nodePath.join(dirPath, entry))` 判定是否目录;无法 stat 的 entry 会被跳过,不会出现在输出中 [E: packages/coding-agent/src/core/tools/ls.ts:74] [E: packages/coding-agent/src/core/tools/ls.ts:123] [E: packages/coding-agent/src/core/tools/ls.ts:127]。

`LsOperations` 是远程/替代 filesystem 的插拔点:接口提供 `exists(absolutePath)`、`stat(absolutePath)` 与 `readdir(absolutePath)`,这三个方法构成替换本地 directory listing 后端的边界 [E: packages/coding-agent/src/core/tools/ls.ts:34] [E: packages/coding-agent/src/core/tools/ls.ts:36] [E: packages/coding-agent/src/core/tools/ls.ts:38] [E: packages/coding-agent/src/core/tools/ls.ts:40]。默认实现绑定本地 filesystem: `exists` 用 `pathExists`, `stat` 用 `fsStat`, `readdir` 用 `fsReaddir` [E: packages/coding-agent/src/core/tools/ls.ts:40] [E: packages/coding-agent/src/core/tools/ls.ts:44] [E: packages/coding-agent/src/core/tools/ls.ts:45] [E: packages/coding-agent/src/core/tools/ls.ts:43]。

## 8 设计动机与 edge

`ls` 包含 dotfiles 是明确的工具契约,不是测试偶然:description 写着 `Includes dotfiles`,测试也创建 `.hidden-file` 与 `.hidden-dir` 并断言输出包含 `.hidden-file` 和 `.hidden-dir/` [E: packages/coding-agent/src/core/tools/ls.ts:62] [E: packages/coding-agent/test/tools.test.ts:891] [E: packages/coding-agent/test/tools.test.ts:892] [E: packages/coding-agent/test/tools.test.ts:893] [E: packages/coding-agent/test/tools.test.ts:898] [E: packages/coding-agent/test/tools.test.ts:899]。

目录 suffix 是逐 entry `stat` 得出的,因此 dangling symlink、权限变化或 race condition 导致 `stat` 失败时,该 entry 会被静默跳过而不是以 unknown type 输出 [E: packages/coding-agent/src/core/tools/ls.ts:122] [E: packages/coding-agent/src/core/tools/ls.ts:127] [I]。排序发生在 suffix 判定之前,所以目录不会被优先分组到文件前面;输出顺序仍跟原始 entry name 的 case-insensitive sort 一致 [E: packages/coding-agent/src/core/tools/ls.ts:109] [E: packages/coding-agent/src/core/tools/ls.ts:83] [I]。

`ls` 没有 file-mutation queue,也没有 edit/write 的写入串行化需求;它只调用 exists/stat/readdir/stat 并返回 text result [E: packages/coding-agent/src/core/tools/ls.ts:87] [E: packages/coding-agent/src/core/tools/ls.ts:93] [E: packages/coding-agent/src/core/tools/ls.ts:102] [E: packages/coding-agent/src/core/tools/ls.ts:123] [E: packages/coding-agent/src/core/tools/ls.ts:158] [I]。`ls` 也没有 bash 的 `fullOutputPath` spillover:过大 listing 只保留 head-truncated text 和 `TruncationResult` details,不会把完整目录列表写入临时文件 [E: packages/coding-agent/src/core/tools/ls.ts:25] [E: packages/coding-agent/src/core/tools/ls.ts:23] [E: packages/coding-agent/src/core/tools/ls.ts:27] [E: packages/coding-agent/src/core/tools/ls.ts:141] [I]。

## Sources

- packages/coding-agent/src/core/tools/ls.ts
- packages/coding-agent/src/core/tools/renderers/ls.ts
- packages/coding-agent/src/core/tools/path-utils.ts
- packages/coding-agent/src/utils/paths.ts
- packages/coding-agent/src/core/tools/truncate.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts
- packages/agent/src/types.ts
- packages/coding-agent/test/tools.test.ts

## 相关

- [subsys.coding-agent.output-truncation](../../subsystems/coding-agent/output-truncation.md): 解释 `truncateHead`、`DEFAULT_MAX_BYTES` 和共享 truncation details 的语义。
- [ref.tools-catalog](../../reference/tools-catalog.md): 汇总内置工具 `ToolName`、presets 与 catalog ground truth。
