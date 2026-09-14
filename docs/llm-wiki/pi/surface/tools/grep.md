---
id: surface.tools.grep
title: grep 文本搜索工具
kind: tool
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/grep.ts
  - packages/coding-agent/src/core/tools/renderers/grep.ts
  - packages/coding-agent/src/core/tools/truncate.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/utils/tools-manager.ts
  - packages/coding-agent/src/config.ts
  - packages/agent/src/types.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/agent-loop.ts
  - packages/coding-agent/test/tools.test.ts
symbols:
  - createGrepTool
  - createGrepToolDefinition
  - GrepToolInput
  - GrepToolDetails
  - GrepOperations
related:
  - subsys.coding-agent.output-truncation
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 71dca871bc
---

> `grep` 是 pi-coding-agent 的内置文本搜索工具:模型用 `pattern/path/glob` 等结构化参数发起搜索,实现层用 ripgrep(`rg --json`)收集 match 事件,再格式化成带文件路径与行号的文本结果。

## 能回答的问题

- `grep` 给模型看的 wire name、schema 和默认值是什么?
- `grep` 的输出为什么会出现 `file:line:`、`file-line-`、`[... limit reached]`?
- `grep` 何时调用 ripgrep,如何避免 flag-like pattern 被当成命令参数?
- `grep` 的 `executionMode` 是 sequential 还是 parallel?
- `grep` 在 `tools/index.ts` 和 `AgentSession._buildRuntime` 里如何注册、但为什么不是默认 active tool?
- `GrepToolDetails` 里有哪些结构化截断字段,有没有 `fullOutputPath`?

## 1 Identity

`grep` 的 LLM-facing tool name 和 UI label 都是字符串 `"grep"`;`createGrepToolDefinition(cwd, options)` 返回 `ToolDefinition<typeof grepSchema, GrepToolDetails | undefined>`,而 `createGrepTool(cwd, options)` 再用 `wrapToolDefinition` 把它适配成 agent-core 的 `AgentTool` [E: packages/coding-agent/src/core/tools/grep.ts:70] [E: packages/coding-agent/src/core/tools/grep.ts:76] [E: packages/coding-agent/src/core/tools/grep.ts:77] [E: packages/coding-agent/src/core/tools/grep.ts:321] [E: packages/coding-agent/src/core/tools/grep.ts:322].

`GrepToolInput` 直接来自 TypeBox `grepSchema` 的 `Static<typeof grepSchema>`,所以 wire schema 与 TypeScript 输入类型由同一个 schema 派生 [E: packages/coding-agent/src/core/tools/grep.ts:21] [E: packages/coding-agent/src/core/tools/grep.ts:40]. `GrepOperations` 是可插拔 I/O 边界,只有 `isDirectory(absolutePath)` 与 `readFile(absolutePath)` 两个方法;默认实现用本地 `fs.stat().isDirectory()` 与 `fs.readFile(..., "utf-8")` [E: packages/coding-agent/src/core/tools/grep.ts:53] [E: packages/coding-agent/src/core/tools/grep.ts:55] [E: packages/coding-agent/src/core/tools/grep.ts:57] [E: packages/coding-agent/src/core/tools/grep.ts:57] [E: packages/coding-agent/src/core/tools/grep.ts:61] [E: packages/coding-agent/src/core/tools/grep.ts:62].

## 2 用途定位

`grep` 用于搜索文件内容,返回匹配行、文件路径和行号;工具描述还承诺它尊重 `.gitignore`,输出会按 100 个 matches 或 50KB 先到者截断,长行会截到 500 chars [E: packages/coding-agent/src/core/tools/grep.ts:78]. 它不是通用 shell:执行时调用 `ensureTool("rg")` 获取 ripgrep(第二参是 optional `onStatus`,不是 boolean),并用 `spawn(rgPath, args, { stdio: ["ignore", "pipe", "pipe"] })` 运行子进程 [E: packages/coding-agent/src/core/tools/grep.ts:119] [E: packages/coding-agent/src/core/tools/grep.ts:104] [E: packages/coding-agent/src/core/tools/grep.ts:168].

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `pattern` | `string` | 是 | 无 | 作为 ripgrep pattern 传入 | 搜索 pattern,可以是 regex 或 literal string;描述文本来自 schema [E: packages/coding-agent/src/core/tools/grep.ts:22]. |
| `path` | `string` | 否 | `"."` | 先经 `resolveToCwd(searchDir || ".", ctx?.cwd || cwd)` 变为搜索路径 | 要搜索的目录或文件;schema 描述默认是 current directory,实现默认是 `"."`;`ctx.cwd` 优先于工厂 `cwd` [E: packages/coding-agent/src/core/tools/grep.ts:23] [E: packages/coding-agent/src/core/tools/grep.ts:125]. |
| `glob` | `string` | 否 | 无 | 存在时追加 `--glob <glob>` | 按 glob 过滤文件,例如 `*.ts` 或 `**/*.spec.ts` [E: packages/coding-agent/src/core/tools/grep.ts:21] [E: packages/coding-agent/src/core/tools/grep.ts:165]. |
| `ignoreCase` | `boolean` | 否 | `false` | truthy 时追加 `--ignore-case` | 大小写不敏感搜索 [E: packages/coding-agent/src/core/tools/grep.ts:22] [E: packages/coding-agent/src/core/tools/grep.ts:105]. |
| `literal` | `boolean` | 否 | `false` | truthy 时追加 `--fixed-strings` | 把 pattern 当 literal string,而不是 regex [E: packages/coding-agent/src/core/tools/grep.ts:23] [E: packages/coding-agent/src/core/tools/grep.ts:24] [E: packages/coding-agent/src/core/tools/grep.ts:106]. |
| `context` | `number` | 否 | `0` | `context && context > 0 ? context : 0`;负数、0、缺省都变 0 | 每个 match 前后各展示多少上下文行 [E: packages/coding-agent/src/core/tools/grep.ts:26] [E: packages/coding-agent/src/core/tools/grep.ts:27] [E: packages/coding-agent/src/core/tools/grep.ts:77]. |
| `limit` | `number` | 否 | `100` | `Math.max(1, limit ?? DEFAULT_LIMIT)`;小于 1 会提升到 1 | 最多收集多少个 match;schema 描述默认 100,常量 `DEFAULT_LIMIT` 也是 100 [E: packages/coding-agent/src/core/tools/grep.ts:29] [E: packages/coding-agent/src/core/tools/grep.ts:41] [E: packages/coding-agent/src/core/tools/grep.ts:78]. |

## 4 输出 & 截断

成功结果是 `content: [{ type: "text", text: output }]`,无匹配时返回文本 `"No matches found"` 且 `details: undefined` [E: packages/coding-agent/src/core/tools/grep.ts:256] [E: packages/coding-agent/src/core/tools/grep.ts:200] [E: packages/coding-agent/src/core/tools/grep.ts:306]. `GrepToolDetails` 只有三个可选字段:`truncation?: TruncationResult`、`matchLimitReached?: number`、`linesTruncated?: boolean`;该工具没有 bash 式 `fullOutputPath` 字段 [E: packages/coding-agent/src/core/tools/grep.ts:40] [E: packages/coding-agent/src/core/tools/grep.ts:41] [E: packages/coding-agent/src/core/tools/grep.ts:45] [E: packages/coding-agent/src/core/tools/grep.ts:43].

输出行格式由后处理生成,不是 ripgrep 原始文本输出。没有 `context` 且 ripgrep JSON event 带 `lines.text` 时,结果行是 `relativePath:lineNumber: truncatedText`;有 `context` 或需要重新读文件时,match 行仍用 `:line:` 分隔,上下文行用 `-line-` 分隔 [E: packages/coding-agent/src/core/tools/grep.ts:265] [E: packages/coding-agent/src/core/tools/grep.ts:273] [E: packages/coding-agent/src/core/tools/grep.ts:211] [E: packages/coding-agent/src/core/tools/grep.ts:154]. 单文件搜索显示 basename,目录搜索尽量显示相对搜索根的 slash-normalized path [E: packages/coding-agent/src/core/tools/grep.ts:137] [E: packages/coding-agent/src/core/tools/grep.ts:139] [E: packages/coding-agent/src/core/tools/grep.ts:141] [E: packages/coding-agent/src/core/tools/grep.ts:144].

匹配数量先由 `effectiveLimit` 控制:每个 JSON `match` event 增加 `matchCount`,到达 limit 后设置 `matchLimitReached = true` 并 kill 子进程;最终 notice 形如 ``${effectiveLimit} matches limit reached. Use limit=${effectiveLimit * 2} for more, or refine pattern`` 并写入 `details.matchLimitReached` [E: packages/coding-agent/src/core/tools/grep.ts:228] [E: packages/coding-agent/src/core/tools/grep.ts:234] [E: packages/coding-agent/src/core/tools/grep.ts:235] [E: packages/coding-agent/src/core/tools/grep.ts:236] [E: packages/coding-agent/src/core/tools/grep.ts:229] [E: packages/coding-agent/src/core/tools/grep.ts:291]. `packages/coding-agent/test/tools.test.ts` 断言 `limit: 1, context: 1` 会包含第一处 match 的前后文、出现 limit notice,并且不包含第二处 match [E: packages/coding-agent/test/tools.test.ts:796] [E: packages/coding-agent/test/tools.test.ts:804] [E: packages/coding-agent/test/tools.test.ts:809] [E: packages/coding-agent/test/tools.test.ts:810] [E: packages/coding-agent/test/tools.test.ts:812] [E: packages/coding-agent/test/tools.test.ts:825].

字节截断在所有 `outputLines.join("\n")` 之后用 `truncateHead(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER })` 执行,所以 grep 的总输出没有普通 2000-line head limit,主要受 match limit 与默认 50KB byte limit 控制 [E: packages/coding-agent/src/core/tools/grep.ts:222] [E: packages/coding-agent/src/core/tools/grep.ts:282]. 默认 byte limit 来自 `DEFAULT_MAX_BYTES = 50 * 1024`,而 `truncateHead` 默认按 maxLines/maxBytes 截头部并且只把完整行放入输出,除非第一行本身超过 byte limit 时返回空内容和 `firstLineExceedsLimit=true` [E: packages/coding-agent/src/core/tools/truncate.ts:12] [E: packages/coding-agent/src/core/tools/truncate.ts:79] [E: packages/coding-agent/src/core/tools/truncate.ts:80] [E: packages/coding-agent/src/core/tools/truncate.ts:104] [E: packages/coding-agent/src/core/tools/truncate.ts:105] [E: packages/coding-agent/src/core/tools/truncate.ts:115].

单行截断由 `truncateLine` 的默认 `maxChars = GREP_MAX_LINE_LENGTH` 完成,默认 max chars 是 `GREP_MAX_LINE_LENGTH = 500`,超长时返回前 500 chars 加 `"... [truncated]"` 并把 `linesTruncated` 置 true [E: packages/coding-agent/src/core/tools/truncate.ts:13] [E: packages/coding-agent/src/core/tools/truncate.ts:268] [E: packages/coding-agent/src/core/tools/truncate.ts:270] [E: packages/coding-agent/src/core/tools/truncate.ts:275] [E: packages/coding-agent/src/core/tools/grep.ts:151] [E: packages/coding-agent/src/core/tools/grep.ts:152] [E: packages/coding-agent/src/core/tools/grep.ts:297] [E: packages/coding-agent/src/core/tools/grep.ts:301].

TUI `renderResult` 在独立 renderer 文件里:未 expanded 时最多展示 15 行,更多行用 `... (N more lines, <expand hint>)` 提示;这不改变模型收到的 tool result `content` [E: packages/coding-agent/src/core/tools/renderers/grep.ts:49] [E: packages/coding-agent/src/core/tools/renderers/grep.ts:50] [E: packages/coding-agent/src/core/tools/renderers/grep.ts:53] [E: packages/coding-agent/src/core/tools/renderers/grep.ts:54] [I].

## 5 执行模式

`grep` 的 `ToolDefinition` 没有显式设置 `executionMode`;`ToolDefinition.executionMode` 和 agent-core `AgentTool.executionMode` 都是 optional 字段,省略时使用默认执行模式 [E: packages/coding-agent/src/core/extensions/types.ts:479] [E: packages/agent/src/types.ts:411]. agent-core 的默认 `toolExecution` 是 `"parallel"`,且 batch 只有在全局 sequential 或任一被调用工具 `executionMode === "sequential"` 时才走 sequential 分支 [E: packages/agent/src/agent.ts:237] [E: packages/agent/src/agent-loop.ts:418] [E: packages/agent/src/agent-loop.ts:420] [E: packages/agent/src/agent-loop.ts:421]. 因此,在默认 Agent 配置下,`grep` 本身不会强制串行,可以与同批其它非 sequential 工具并行执行 [I].

## 6 注册与装配

内置工具全集的 ground truth 是 `packages/coding-agent/src/core/tools/index.ts`: `ToolName` 包含 `"grep"`,`allToolNames` 也包含 `"grep"`,`ToolsOptions` 有 `grep?: GrepToolOptions` [E: packages/coding-agent/src/core/tools/index.ts:95] [E: packages/coding-agent/src/core/tools/index.ts:102] [E: packages/coding-agent/src/core/tools/index.ts:113]. `createToolDefinition("grep", cwd, options)` 返回 `createGrepToolDefinition(cwd, options?.grep)`,运行时形式 `createTool("grep", cwd, options)` 返回 `createGrepTool(cwd, options?.grep)` [E: packages/coding-agent/src/core/tools/index.ts:130] [E: packages/coding-agent/src/core/tools/index.ts:131] [E: packages/coding-agent/src/core/tools/index.ts:153] [E: packages/coding-agent/src/core/tools/index.ts:154].

preset 语义上,`createReadOnlyToolDefinitions` 和 `createReadOnlyTools` 都包含 `grep`,而 `createCodingToolDefinitions` 和 `createCodingTools` 只包含 `read/bash/edit/write` [E: packages/coding-agent/src/core/tools/index.ts:166] [E: packages/coding-agent/src/core/tools/index.ts:167] [E: packages/coding-agent/src/core/tools/index.ts:168] [E: packages/coding-agent/src/core/tools/index.ts:169] [E: packages/coding-agent/src/core/tools/index.ts:175] [E: packages/coding-agent/src/core/tools/index.ts:176] [E: packages/coding-agent/src/core/tools/index.ts:197] [E: packages/coding-agent/src/core/tools/index.ts:198] [E: packages/coding-agent/src/core/tools/index.ts:206] [E: packages/coding-agent/src/core/tools/index.ts:207]. `createAllToolDefinitions` 和 `createAllTools` 都把 `grep` 放入八个 built-in tool 的全集 [E: packages/coding-agent/src/core/tools/index.ts:184] [E: packages/coding-agent/src/core/tools/index.ts:185] [E: packages/coding-agent/src/core/tools/index.ts:186] [E: packages/coding-agent/src/core/tools/index.ts:187] [E: packages/coding-agent/src/core/tools/index.ts:188] [E: packages/coding-agent/src/core/tools/index.ts:189] [E: packages/coding-agent/src/core/tools/index.ts:190] [E: packages/coding-agent/src/core/tools/index.ts:191] [E: packages/coding-agent/src/core/tools/index.ts:215] [E: packages/coding-agent/src/core/tools/index.ts:216] [E: packages/coding-agent/src/core/tools/index.ts:220] [E: packages/coding-agent/src/core/tools/index.ts:221].

`AgentSession._buildRuntime` 在没有 `baseToolsOverride` 时调用 `createAllToolDefinitions(this._cwd, { read: { autoResizeImages }, bash: { commandPrefix, shellPath } })`,所以 `grep` 会进入 `_baseToolDefinitions`,但没有额外 grep-specific option 从 settings 注入 [E: packages/coding-agent/src/core/agent-session.ts:2802] [E: packages/coding-agent/src/core/agent-session.ts:2802] [E: packages/coding-agent/src/core/agent-session.ts:2803] [E: packages/coding-agent/src/core/agent-session.ts:2804]. `_refreshToolRegistry` 会把允许的 built-in definitions 包装成 registered tools,同时合并 extension/custom tools 与 allowed/excluded filters [E: packages/coding-agent/src/core/agent-session.ts:2694] [E: packages/coding-agent/src/core/agent-session.ts:2699] [E: packages/coding-agent/src/core/agent-session.ts:2709] [E: packages/coding-agent/src/core/agent-session.ts:2746] [E: packages/coding-agent/src/core/agent-session.ts:2756] [E: packages/coding-agent/src/core/agent-session.ts:2760].

默认 active tool names 在没有 `baseToolsOverride` 时只有 `["read", "bash", "edit", "write"]`;因此 `grep` 默认注册在 registry 中但不默认激活,需要通过 initial active tools 或运行时 `setActiveToolsByName` 之类路径把 `grep` 放入 active names,而 allowed/excluded filters 只决定 registry/active names 是否被过滤 [E: packages/coding-agent/src/core/agent-session.ts:2831] [E: packages/coding-agent/src/core/agent-session.ts:2833] [E: packages/coding-agent/src/core/agent-session.ts:2835]. `setActiveToolsByName` 会忽略 registry 中不存在的工具名,并用有效 tool names 重建 system prompt [E: packages/coding-agent/src/core/agent-session.ts:966] [E: packages/coding-agent/src/core/agent-session.ts:969] [E: packages/coding-agent/src/core/agent-session.ts:969] [E: packages/coding-agent/src/core/agent-session.ts:973] [E: packages/coding-agent/src/core/agent-session.ts:979].

`wrapToolDefinition` 是 `ToolDefinition -> AgentTool` 的装配边界:它复制 `name/label/description/parameters/constrainedSampling/prepareArguments/executionMode`,并把 `ToolDefinition.execute(..., ctxFactory?.())` 适配成 agent-core `AgentTool.execute` [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:5] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:10] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:14] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:16] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:17] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:18]. `grep` 本身没有声明 `constrainedSampling`;strict-prefer json_schema 默认只在 mutation/read/shell 工具上 [I].

## 7 execute() 走读

1. `execute()` 先检查 `AbortSignal`,已 abort 则 reject `"Operation aborted"`;后续也注册 abort listener,被触发时 kill child process [E: packages/coding-agent/src/core/tools/grep.ts:105] [E: packages/coding-agent/src/core/tools/grep.ts:74] [E: packages/coding-agent/src/core/tools/grep.ts:188] [E: packages/coding-agent/src/core/tools/grep.ts:190] [E: packages/coding-agent/src/core/tools/grep.ts:192].
2. 实现调用 `ensureTool("rg")`;若系统和托管目录都没有 `rg` 且无法下载,`grep` reject `"ripgrep (rg) is not available and could not be downloaded"` [E: packages/coding-agent/src/core/tools/grep.ts:119] [E: packages/coding-agent/src/core/tools/grep.ts:121].
3. `ensureTool` 先查 `getToolPath("rg")`;`getToolPath` 优先返回 managed bin 目录里的 `rg` 或 Windows `rg.exe`(默认目录来自 `getBinDir()`,通常是 `~/.pi/agent/bin`),否则尝试 PATH 中的 `rg` [E: packages/coding-agent/src/utils/tools-manager.ts:10] [E: packages/coding-agent/src/utils/tools-manager.ts:83] [E: packages/coding-agent/src/utils/tools-manager.ts:88] [E: packages/coding-agent/src/utils/tools-manager.ts:88] [E: packages/coding-agent/src/utils/tools-manager.ts:94] [E: packages/coding-agent/src/utils/tools-manager.ts:97] [E: packages/coding-agent/src/config.ts:528].
4. 找不到 `rg` 时,`ensureTool` 会尊重 `PI_OFFLINE`、Android/Termux 特例,否则从 GitHub release 下载平台对应 ripgrep asset 到托管 bin 目录;下载失败时返回 `undefined` 而不是抛出到调用方 [E: packages/coding-agent/src/utils/tools-manager.ts:14] [E: packages/coding-agent/src/utils/tools-manager.ts:363] [E: packages/coding-agent/src/utils/tools-manager.ts:361] [E: packages/coding-agent/src/utils/tools-manager.ts:368] [E: packages/coding-agent/src/utils/tools-manager.ts:370].
5. 搜索路径经 `resolveToCwd(searchDir || ".", ctx?.cwd || cwd)` 解析后,`ops.isDirectory(searchPath)` 判断路径类型;异常被转成 `"Path not found: ${searchPath}"`。工厂 `cwd` 只是 fallback;`ExtensionContext.cwd` 存在时必须用它 [E: packages/coding-agent/src/core/tools/grep.ts:125] [E: packages/coding-agent/src/core/tools/grep.ts:129] [E: packages/coding-agent/src/core/tools/grep.ts:73] [E: packages/coding-agent/test/tools.test.ts:963].
6. ripgrep 参数固定以 `["--json", "--line-number", "--color=never", "--hidden"]` 开始,再按输入追加 `--ignore-case`、`--fixed-strings`、`--glob`;最后用 `args.push("--", pattern, searchPath)` 把 pattern 与搜索路径放到 `--` 之后,降低 flag-like pattern 被解释成 ripgrep option 的风险 [E: packages/coding-agent/src/core/tools/grep.ts:162] [E: packages/coding-agent/src/core/tools/grep.ts:163] [E: packages/coding-agent/src/core/tools/grep.ts:164] [E: packages/coding-agent/src/core/tools/grep.ts:165] [E: packages/coding-agent/src/core/tools/grep.ts:166]. 测试用 pattern ``--pre=${payload}`` 断言不会执行 payload,而是返回 `"No matches found"` [E: packages/coding-agent/test/tools.test.ts:817] [E: packages/coding-agent/test/tools.test.ts:826] [E: packages/coding-agent/test/tools.test.ts:830].
7. 子进程 stdout 用 readline 按行读取 JSON;无法 parse 的行会被忽略,只有 `event.type === "match"` 时才提取 `path.text`、`line_number` 和 `lines.text` [E: packages/coding-agent/src/core/tools/grep.ts:168] [E: packages/coding-agent/src/core/tools/grep.ts:219] [E: packages/coding-agent/src/core/tools/grep.ts:165] [E: packages/coding-agent/src/core/tools/grep.ts:169] [E: packages/coding-agent/src/core/tools/grep.ts:229] [E: packages/coding-agent/src/core/tools/grep.ts:230] [E: packages/coding-agent/src/core/tools/grep.ts:231].
8. ripgrep close code `0` 和 `1` 都可接受:code `1` 代表 no matches 时不会被当成运行错误;非 limit kill 且 code 不是 `0/1` 时,stderr 或 exit code 会变成 reject error [E: packages/coding-agent/src/core/tools/grep.ts:251] [E: packages/coding-agent/src/core/tools/grep.ts:252] [E: packages/coding-agent/src/core/tools/grep.ts:253].

## 8 设计动机·edge

- `grep` 的 path 输出不是绝对路径:目录搜索优先返回相对搜索根路径,单文件搜索返回 basename;这让模型看到的结果更短,但同名文件在不同搜索根下需要结合调用参数理解 [E: packages/coding-agent/src/core/tools/grep.ts:137] [E: packages/coding-agent/src/core/tools/grep.ts:141] [E: packages/coding-agent/src/core/tools/grep.ts:144] [I].
- `--hidden` 被固定加入 ripgrep 参数,但源码没有加入 `--no-ignore`;结合工具描述的 “Respects .gitignore”,它的意图是搜索 hidden 文件同时仍保留 ignore 规则 [E: packages/coding-agent/src/core/tools/grep.ts:78] [E: packages/coding-agent/src/core/tools/grep.ts:162] [I].
- `context > 0` 时实现会通过 `ops.readFile` 重新读取文件并缓存行数组,所以自定义 `GrepOperations` 可以改变上下文读取来源;无上下文时优先用 ripgrep JSON event 自带的 `lines.text` [E: packages/coding-agent/src/core/tools/grep.ts:148] [E: packages/coding-agent/src/core/tools/grep.ts:152] [E: packages/coding-agent/src/core/tools/grep.ts:265] [E: packages/coding-agent/src/core/tools/grep.ts:275].
- `ops.readFile` 失败不会让整个 grep 失败;上下文块会退化成 `relativePath:lineNumber: (unable to read file)` [E: packages/coding-agent/src/core/tools/grep.ts:154] [E: packages/coding-agent/src/core/tools/grep.ts:200].
- `grep` 不走 `file-mutation-queue`,因为它没有写文件操作,也没有在工具定义里声明 sequential execution;写入串行化是 edit/write 这类 mutation tool 的边界,不是 grep 的边界 [I].
- `subsys.coding-agent.output-truncation` 是本节点相关的截断子系统节点:本页只覆盖 grep 如何调用 `truncateHead` 与 `truncateLine`,更通用的工具输出累计、head/tail 截断语义应在该子系统节点集中维护 [I].
- `ref.tools-catalog` 是内置工具全集的目录节点:本页只权威覆盖 `grep` 的 schema、执行和装配事实,其它工具的 wire name 与 preset 关系应在 catalog 节点统一枚举 [I].

## Sources

- packages/coding-agent/src/core/tools/grep.ts
- packages/coding-agent/src/core/tools/renderers/grep.ts
- packages/coding-agent/src/core/tools/truncate.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/utils/tools-manager.ts
- packages/coding-agent/src/config.ts
- packages/agent/src/types.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts
- packages/coding-agent/test/tools.test.ts

## 相关

- [subsys.coding-agent.output-truncation](../../subsystems/coding-agent/output-truncation.md): 解释 `TruncationResult`、默认 byte/line limit、head/tail 截断与工具输出保护的共用语义。
- [ref.tools-catalog](../../reference/tools-catalog.md): 汇总 pi-coding-agent 内置工具全集、preset 和各工具节点入口。
