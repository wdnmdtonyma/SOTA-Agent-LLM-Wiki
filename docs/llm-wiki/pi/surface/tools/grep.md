---
id: surface.tools.grep
title: grep 文本搜索工具
kind: tool
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/grep.ts
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
updated: 8c943640
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

`grep` 的 LLM-facing tool name 和 UI label 都是字符串 `"grep"`;`createGrepToolDefinition(cwd, options)` 返回 `ToolDefinition<typeof grepSchema, GrepToolDetails | undefined>`,而 `createGrepTool(cwd, options)` 再用 `wrapToolDefinition` 把它适配成 agent-core 的 `AgentTool` [E: packages/coding-agent/src/core/tools/grep.ts:123] [E: packages/coding-agent/src/core/tools/grep.ts:126] [E: packages/coding-agent/src/core/tools/grep.ts:129] [E: packages/coding-agent/src/core/tools/grep.ts:130] [E: packages/coding-agent/src/core/tools/grep.ts:383] [E: packages/coding-agent/src/core/tools/grep.ts:384].

`GrepToolInput` 直接来自 TypeBox `grepSchema` 的 `Static<typeof grepSchema>`,所以 wire schema 与 TypeScript 输入类型由同一个 schema 派生 [E: packages/coding-agent/src/core/tools/grep.ts:24] [E: packages/coding-agent/src/core/tools/grep.ts:38]. `GrepOperations` 是可插拔 I/O 边界,只有 `isDirectory(absolutePath)` 与 `readFile(absolutePath)` 两个方法;默认实现用本地 `fs.stat().isDirectory()` 与 `fs.readFile(..., "utf-8")` [E: packages/coding-agent/src/core/tools/grep.ts:51] [E: packages/coding-agent/src/core/tools/grep.ts:53] [E: packages/coding-agent/src/core/tools/grep.ts:55] [E: packages/coding-agent/src/core/tools/grep.ts:58] [E: packages/coding-agent/src/core/tools/grep.ts:59] [E: packages/coding-agent/src/core/tools/grep.ts:60].

## 2 用途定位

`grep` 用于搜索文件内容,返回匹配行、文件路径和行号;工具描述还承诺它尊重 `.gitignore`,输出会按 100 个 matches 或 50KB 先到者截断,长行会截到 500 chars [E: packages/coding-agent/src/core/tools/grep.ts:131] [E: packages/coding-agent/src/core/tools/grep.ts:132]. 它不是通用 shell:执行时固定调用 `ensureTool("rg", true)` 获取 ripgrep,并用 `spawn(rgPath, args, { stdio: ["ignore", "pipe", "pipe"] })` 运行子进程 [E: packages/coding-agent/src/core/tools/grep.ts:172] [E: packages/coding-agent/src/core/tools/grep.ts:221].

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `pattern` | `string` | 是 | 无 | 作为 ripgrep pattern 传入 | 搜索 pattern,可以是 regex 或 literal string;描述文本来自 schema [E: packages/coding-agent/src/core/tools/grep.ts:25]. |
| `path` | `string` | 否 | `"."` | 先经 `resolveToCwd(searchDir || ".", cwd)` 变为搜索路径 | 要搜索的目录或文件;schema 描述默认是 current directory,实现默认是 `"."` [E: packages/coding-agent/src/core/tools/grep.ts:26] [E: packages/coding-agent/src/core/tools/grep.ts:178]. |
| `glob` | `string` | 否 | 无 | 存在时追加 `--glob <glob>` | 按 glob 过滤文件,例如 `*.ts` 或 `**/*.spec.ts` [E: packages/coding-agent/src/core/tools/grep.ts:27] [E: packages/coding-agent/src/core/tools/grep.ts:218]. |
| `ignoreCase` | `boolean` | 否 | `false` | truthy 时追加 `--ignore-case` | 大小写不敏感搜索 [E: packages/coding-agent/src/core/tools/grep.ts:28] [E: packages/coding-agent/src/core/tools/grep.ts:216]. |
| `literal` | `boolean` | 否 | `false` | truthy 时追加 `--fixed-strings` | 把 pattern 当 literal string,而不是 regex [E: packages/coding-agent/src/core/tools/grep.ts:29] [E: packages/coding-agent/src/core/tools/grep.ts:30] [E: packages/coding-agent/src/core/tools/grep.ts:217]. |
| `context` | `number` | 否 | `0` | `context && context > 0 ? context : 0`;负数、0、缺省都变 0 | 每个 match 前后各展示多少上下文行 [E: packages/coding-agent/src/core/tools/grep.ts:32] [E: packages/coding-agent/src/core/tools/grep.ts:33] [E: packages/coding-agent/src/core/tools/grep.ts:188]. |
| `limit` | `number` | 否 | `100` | `Math.max(1, limit ?? DEFAULT_LIMIT)`;小于 1 会提升到 1 | 最多收集多少个 match;schema 描述默认 100,常量 `DEFAULT_LIMIT` 也是 100 [E: packages/coding-agent/src/core/tools/grep.ts:35] [E: packages/coding-agent/src/core/tools/grep.ts:39] [E: packages/coding-agent/src/core/tools/grep.ts:189]. |

## 4 输出 & 截断

成功结果是 `content: [{ type: "text", text: output }]`,无匹配时返回文本 `"No matches found"` 且 `details: undefined` [E: packages/coding-agent/src/core/tools/grep.ts:311] [E: packages/coding-agent/src/core/tools/grep.ts:359] [E: packages/coding-agent/src/core/tools/grep.ts:360]. `GrepToolDetails` 只有三个可选字段:`truncation?: TruncationResult`、`matchLimitReached?: number`、`linesTruncated?: boolean`;该工具没有 bash 式 `fullOutputPath` 字段 [E: packages/coding-agent/src/core/tools/grep.ts:41] [E: packages/coding-agent/src/core/tools/grep.ts:42] [E: packages/coding-agent/src/core/tools/grep.ts:43] [E: packages/coding-agent/src/core/tools/grep.ts:44].

输出行格式由后处理生成,不是 ripgrep 原始文本输出。没有 `context` 且 ripgrep JSON event 带 `lines.text` 时,结果行是 `relativePath:lineNumber: truncatedText`;有 `context` 或需要重新读文件时,match 行仍用 `:line:` 分隔,上下文行用 `-line-` 分隔 [E: packages/coding-agent/src/core/tools/grep.ts:318] [E: packages/coding-agent/src/core/tools/grep.ts:326] [E: packages/coding-agent/src/core/tools/grep.ts:255] [E: packages/coding-agent/src/core/tools/grep.ts:256] [E: packages/coding-agent/src/core/tools/grep.ts:264] [E: packages/coding-agent/src/core/tools/grep.ts:265]. 单文件搜索显示 basename,目录搜索尽量显示相对搜索根的 slash-normalized path [E: packages/coding-agent/src/core/tools/grep.ts:190] [E: packages/coding-agent/src/core/tools/grep.ts:192] [E: packages/coding-agent/src/core/tools/grep.ts:194] [E: packages/coding-agent/src/core/tools/grep.ts:197].

匹配数量先由 `effectiveLimit` 控制:每个 JSON `match` event 增加 `matchCount`,到达 limit 后设置 `matchLimitReached = true` 并 kill 子进程;最终 notice 形如 ``${effectiveLimit} matches limit reached. Use limit=${effectiveLimit * 2} for more, or refine pattern`` 并写入 `details.matchLimitReached` [E: packages/coding-agent/src/core/tools/grep.ts:280] [E: packages/coding-agent/src/core/tools/grep.ts:281] [E: packages/coding-agent/src/core/tools/grep.ts:287] [E: packages/coding-agent/src/core/tools/grep.ts:288] [E: packages/coding-agent/src/core/tools/grep.ts:289] [E: packages/coding-agent/src/core/tools/grep.ts:340] [E: packages/coding-agent/src/core/tools/grep.ts:342] [E: packages/coding-agent/src/core/tools/grep.ts:344]. `packages/coding-agent/test/tools.test.ts` 断言 `limit: 1, context: 1` 会包含第一处 match 的前后文、出现 limit notice,并且不包含第二处 match [E: packages/coding-agent/test/tools.test.ts:794] [E: packages/coding-agent/test/tools.test.ts:795] [E: packages/coding-agent/test/tools.test.ts:799] [E: packages/coding-agent/test/tools.test.ts:800] [E: packages/coding-agent/test/tools.test.ts:801] [E: packages/coding-agent/test/tools.test.ts:802] [E: packages/coding-agent/test/tools.test.ts:804].

字节截断在所有 `outputLines.join("\n")` 之后用 `truncateHead(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER })` 执行,所以 grep 的总输出没有普通 2000-line head limit,主要受 match limit 与默认 50KB byte limit 控制 [E: packages/coding-agent/src/core/tools/grep.ts:333] [E: packages/coding-agent/src/core/tools/grep.ts:335]. 默认 byte limit 来自 `DEFAULT_MAX_BYTES = 50 * 1024`,而 `truncateHead` 默认按 maxLines/maxBytes 截头部并且只把完整行放入输出,除非第一行本身超过 byte limit 时返回空内容和 `firstLineExceedsLimit=true` [E: packages/coding-agent/src/core/tools/truncate.ts:12] [E: packages/coding-agent/src/core/tools/truncate.ts:78] [E: packages/coding-agent/src/core/tools/truncate.ts:79] [E: packages/coding-agent/src/core/tools/truncate.ts:80] [E: packages/coding-agent/src/core/tools/truncate.ts:130] [E: packages/coding-agent/src/core/tools/truncate.ts:135] [E: packages/coding-agent/src/core/tools/truncate.ts:144] [E: packages/coding-agent/src/core/tools/truncate.ts:105] [E: packages/coding-agent/src/core/tools/truncate.ts:107] [E: packages/coding-agent/src/core/tools/truncate.ts:115].

单行截断由 `truncateLine` 的默认 `maxChars = GREP_MAX_LINE_LENGTH` 完成,默认 max chars 是 `GREP_MAX_LINE_LENGTH = 500`,超长时返回前 500 chars 加 `"... [truncated]"` 并把 `linesTruncated` 置 true [E: packages/coding-agent/src/core/tools/truncate.ts:13] [E: packages/coding-agent/src/core/tools/truncate.ts:268] [E: packages/coding-agent/src/core/tools/truncate.ts:270] [E: packages/coding-agent/src/core/tools/truncate.ts:272] [E: packages/coding-agent/src/core/tools/truncate.ts:275] [E: packages/coding-agent/src/core/tools/grep.ts:262] [E: packages/coding-agent/src/core/tools/grep.ts:263] [E: packages/coding-agent/src/core/tools/grep.ts:350] [E: packages/coding-agent/src/core/tools/grep.ts:354].

TUI `renderResult` 还有显示层截断:未 expanded 时最多展示 15 行,更多行用 `... (N more lines, <expand hint>)` 提示;这不改变模型收到的 tool result `content` [E: packages/coding-agent/src/core/tools/grep.ts:97] [E: packages/coding-agent/src/core/tools/grep.ts:101] [E: packages/coding-agent/src/core/tools/grep.ts:102] [E: packages/coding-agent/src/core/tools/grep.ts:106] [I].

## 5 执行模式

`grep` 的 `ToolDefinition` 没有显式设置 `executionMode`;`ToolDefinition.executionMode` 和 agent-core `AgentTool.executionMode` 都是 optional 字段,省略时使用默认执行模式 [E: packages/coding-agent/src/core/extensions/types.ts:461] [E: packages/agent/src/types.ts:393]. agent-core 的默认 `toolExecution` 是 `"parallel"`,且 batch 只有在全局 sequential 或任一被调用工具 `executionMode === "sequential"` 时才走 sequential 分支 [E: packages/agent/src/agent.ts:228] [E: packages/agent/src/agent-loop.ts:381] [E: packages/agent/src/agent-loop.ts:382] [E: packages/agent/src/agent-loop.ts:384] [E: packages/agent/src/agent-loop.ts:387]. 因此,在默认 Agent 配置下,`grep` 本身不会强制串行,可以与同批其它非 sequential 工具并行执行 [I].

## 6 注册与装配

内置工具全集的 ground truth 是 `packages/coding-agent/src/core/tools/index.ts`: `ToolName` 包含 `"grep"`,`allToolNames` 也包含 `"grep"`,`ToolsOptions` 有 `grep?: GrepToolOptions` [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84] [E: packages/coding-agent/src/core/tools/index.ts:91]. `createToolDefinition("grep", cwd, options)` 返回 `createGrepToolDefinition(cwd, options?.grep)`,运行时形式 `createTool("grep", cwd, options)` 返回 `createGrepTool(cwd, options?.grep)` [E: packages/coding-agent/src/core/tools/index.ts:106] [E: packages/coding-agent/src/core/tools/index.ts:107] [E: packages/coding-agent/src/core/tools/index.ts:127] [E: packages/coding-agent/src/core/tools/index.ts:128].

preset 语义上,`createReadOnlyToolDefinitions` 和 `createReadOnlyTools` 都包含 `grep`,而 `createCodingToolDefinitions` 和 `createCodingTools` 只包含 `read/bash/edit/write` [E: packages/coding-agent/src/core/tools/index.ts:140] [E: packages/coding-agent/src/core/tools/index.ts:141] [E: packages/coding-agent/src/core/tools/index.ts:142] [E: packages/coding-agent/src/core/tools/index.ts:143] [E: packages/coding-agent/src/core/tools/index.ts:149] [E: packages/coding-agent/src/core/tools/index.ts:150] [E: packages/coding-agent/src/core/tools/index.ts:170] [E: packages/coding-agent/src/core/tools/index.ts:171] [E: packages/coding-agent/src/core/tools/index.ts:172] [E: packages/coding-agent/src/core/tools/index.ts:173] [E: packages/coding-agent/src/core/tools/index.ts:179] [E: packages/coding-agent/src/core/tools/index.ts:180]. `createAllToolDefinitions` 和 `createAllTools` 都把 `grep` 放入七个 built-in tool 的全集 [E: packages/coding-agent/src/core/tools/index.ts:158] [E: packages/coding-agent/src/core/tools/index.ts:159] [E: packages/coding-agent/src/core/tools/index.ts:160] [E: packages/coding-agent/src/core/tools/index.ts:161] [E: packages/coding-agent/src/core/tools/index.ts:162] [E: packages/coding-agent/src/core/tools/index.ts:163] [E: packages/coding-agent/src/core/tools/index.ts:164] [E: packages/coding-agent/src/core/tools/index.ts:188] [E: packages/coding-agent/src/core/tools/index.ts:189] [E: packages/coding-agent/src/core/tools/index.ts:190] [E: packages/coding-agent/src/core/tools/index.ts:191] [E: packages/coding-agent/src/core/tools/index.ts:192] [E: packages/coding-agent/src/core/tools/index.ts:193] [E: packages/coding-agent/src/core/tools/index.ts:194].

`AgentSession._buildRuntime` 在没有 `baseToolsOverride` 时调用 `createAllToolDefinitions(this._cwd, { read: { autoResizeImages }, bash: { commandPrefix, shellPath } })`,所以 `grep` 会进入 `_baseToolDefinitions`,但没有额外 grep-specific option 从 settings 注入 [E: packages/coding-agent/src/core/agent-session.ts:2434] [E: packages/coding-agent/src/core/agent-session.ts:2441] [E: packages/coding-agent/src/core/agent-session.ts:2442] [E: packages/coding-agent/src/core/agent-session.ts:2443] [E: packages/coding-agent/src/core/agent-session.ts:2446]. `_refreshToolRegistry` 会把允许的 built-in definitions 包装成 registered tools,同时合并 extension/custom tools 与 allowed/excluded filters [E: packages/coding-agent/src/core/agent-session.ts:2336] [E: packages/coding-agent/src/core/agent-session.ts:2338] [E: packages/coding-agent/src/core/agent-session.ts:2348] [E: packages/coding-agent/src/core/agent-session.ts:2384] [E: packages/coding-agent/src/core/agent-session.ts:2385] [E: packages/coding-agent/src/core/agent-session.ts:2395] [E: packages/coding-agent/src/core/agent-session.ts:2397].

默认 active tool names 在没有 `baseToolsOverride` 时只有 `["read", "bash", "edit", "write"]`;因此 `grep` 默认注册在 registry 中但不默认激活,需要通过 initial active tools 或运行时 `setActiveToolsByName` 之类路径把 `grep` 放入 active names,而 allowed/excluded filters 只决定 registry/active names 是否被过滤 [E: packages/coding-agent/src/core/agent-session.ts:2470] [E: packages/coding-agent/src/core/agent-session.ts:2472] [E: packages/coding-agent/src/core/agent-session.ts:2473] [E: packages/coding-agent/src/core/agent-session.ts:2474] [E: packages/coding-agent/src/core/agent-session.ts:2475] [E: packages/coding-agent/src/core/agent-session.ts:2336] [E: packages/coding-agent/src/core/agent-session.ts:2338] [E: packages/coding-agent/src/core/agent-session.ts:2401] [E: packages/coding-agent/src/core/agent-session.ts:2403]. `setActiveToolsByName` 会忽略 registry 中不存在的工具名,并用有效 tool names 重建 system prompt [E: packages/coding-agent/src/core/agent-session.ts:839] [E: packages/coding-agent/src/core/agent-session.ts:842] [E: packages/coding-agent/src/core/agent-session.ts:843] [E: packages/coding-agent/src/core/agent-session.ts:844] [E: packages/coding-agent/src/core/agent-session.ts:852] [E: packages/coding-agent/src/core/agent-session.ts:853].

`wrapToolDefinition` 是 `ToolDefinition -> AgentTool` 的装配边界:它复制 `name/label/description/parameters/prepareArguments/executionMode`,并把 `ToolDefinition.execute(..., ctxFactory?.())` 适配成 agent-core `AgentTool.execute` [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:5] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:10] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:13] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:14] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:15] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:16] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:17].

## 7 execute() 走读

1. `execute()` 先检查 `AbortSignal`,已 abort 则 reject `"Operation aborted"`;后续也注册 abort listener,被触发时 kill child process [E: packages/coding-agent/src/core/tools/grep.ts:157] [E: packages/coding-agent/src/core/tools/grep.ts:158] [E: packages/coding-agent/src/core/tools/grep.ts:159] [E: packages/coding-agent/src/core/tools/grep.ts:241] [E: packages/coding-agent/src/core/tools/grep.ts:242] [E: packages/coding-agent/src/core/tools/grep.ts:243] [E: packages/coding-agent/src/core/tools/grep.ts:245].
2. 实现调用 `ensureTool("rg", true)`;若系统和托管目录都没有 `rg` 且无法下载,`grep` reject `"ripgrep (rg) is not available and could not be downloaded"` [E: packages/coding-agent/src/core/tools/grep.ts:172] [E: packages/coding-agent/src/core/tools/grep.ts:173] [E: packages/coding-agent/src/core/tools/grep.ts:174].
3. `ensureTool` 先查 `getToolPath("rg")`;`getToolPath` 优先返回 managed bin 目录里的 `rg` 或 Windows `rg.exe`(默认目录来自 `getAgentDir()/bin`,通常是 `~/.pi/agent/bin`),否则尝试 PATH 中的 `rg` [E: packages/coding-agent/src/utils/tools-manager.ts:10] [E: packages/coding-agent/src/utils/tools-manager.ts:85] [E: packages/coding-agent/src/utils/tools-manager.ts:90] [E: packages/coding-agent/src/utils/tools-manager.ts:91] [E: packages/coding-agent/src/utils/tools-manager.ts:96] [E: packages/coding-agent/src/utils/tools-manager.ts:98] [E: packages/coding-agent/src/config.ts:515] [E: packages/coding-agent/src/config.ts:520] [E: packages/coding-agent/src/config.ts:550].
4. 找不到 `rg` 时,`ensureTool` 会尊重 `PI_OFFLINE`、Android/Termux 特例,否则从 GitHub release 下载平台对应 ripgrep asset 到托管 bin 目录;下载失败时返回 `undefined` 而不是抛出到调用方 [E: packages/coding-agent/src/utils/tools-manager.ts:15] [E: packages/coding-agent/src/utils/tools-manager.ts:335] [E: packages/coding-agent/src/utils/tools-manager.ts:339] [E: packages/coding-agent/src/utils/tools-manager.ts:344] [E: packages/coding-agent/src/utils/tools-manager.ts:349] [E: packages/coding-agent/src/utils/tools-manager.ts:52] [E: packages/coding-agent/src/utils/tools-manager.ts:249] [E: packages/coding-agent/src/utils/tools-manager.ts:255] [E: packages/coding-agent/src/utils/tools-manager.ts:263] [E: packages/coding-agent/src/utils/tools-manager.ts:266] [E: packages/coding-agent/src/utils/tools-manager.ts:300] [E: packages/coding-agent/src/utils/tools-manager.ts:315] [E: packages/coding-agent/src/utils/tools-manager.ts:363] [E: packages/coding-agent/src/utils/tools-manager.ts:367].
5. 搜索路径经 `resolveToCwd` 解析后,`ops.isDirectory(searchPath)` 判断路径类型;异常被转成 `"Path not found: ${searchPath}"` [E: packages/coding-agent/src/core/tools/grep.ts:178] [E: packages/coding-agent/src/core/tools/grep.ts:179] [E: packages/coding-agent/src/core/tools/grep.ts:182] [E: packages/coding-agent/src/core/tools/grep.ts:184].
6. ripgrep 参数固定以 `["--json", "--line-number", "--color=never", "--hidden"]` 开始,再按输入追加 `--ignore-case`、`--fixed-strings`、`--glob`;最后用 `args.push("--", pattern, searchPath)` 把 pattern 与搜索路径放到 `--` 之后,降低 flag-like pattern 被解释成 ripgrep option 的风险 [E: packages/coding-agent/src/core/tools/grep.ts:215] [E: packages/coding-agent/src/core/tools/grep.ts:216] [E: packages/coding-agent/src/core/tools/grep.ts:217] [E: packages/coding-agent/src/core/tools/grep.ts:218] [E: packages/coding-agent/src/core/tools/grep.ts:219]. 测试用 pattern ``--pre=${payload}`` 断言不会执行 payload,而是返回 `"No matches found"` [E: packages/coding-agent/test/tools.test.ts:807] [E: packages/coding-agent/test/tools.test.ts:815] [E: packages/coding-agent/test/tools.test.ts:816] [E: packages/coding-agent/test/tools.test.ts:820] [E: packages/coding-agent/test/tools.test.ts:821].
7. 子进程 stdout 用 readline 按行读取 JSON;无法 parse 的行会被忽略,只有 `event.type === "match"` 时才提取 `path.text`、`line_number` 和 `lines.text` [E: packages/coding-agent/src/core/tools/grep.ts:222] [E: packages/coding-agent/src/core/tools/grep.ts:272] [E: packages/coding-agent/src/core/tools/grep.ts:275] [E: packages/coding-agent/src/core/tools/grep.ts:276] [E: packages/coding-agent/src/core/tools/grep.ts:278] [E: packages/coding-agent/src/core/tools/grep.ts:280] [E: packages/coding-agent/src/core/tools/grep.ts:282] [E: packages/coding-agent/src/core/tools/grep.ts:283] [E: packages/coding-agent/src/core/tools/grep.ts:284].
8. ripgrep close code `0` 和 `1` 都可接受:code `1` 代表 no matches 时不会被当成运行错误;非 limit kill 且 code 不是 `0/1` 时,stderr 或 exit code 会变成 reject error [E: packages/coding-agent/src/core/tools/grep.ts:304] [E: packages/coding-agent/src/core/tools/grep.ts:305] [E: packages/coding-agent/src/core/tools/grep.ts:306].

## 8 设计动机·edge

- `grep` 的 path 输出不是绝对路径:目录搜索优先返回相对搜索根路径,单文件搜索返回 basename;这让模型看到的结果更短,但同名文件在不同搜索根下需要结合调用参数理解 [E: packages/coding-agent/src/core/tools/grep.ts:190] [E: packages/coding-agent/src/core/tools/grep.ts:194] [E: packages/coding-agent/src/core/tools/grep.ts:197] [I].
- `--hidden` 被固定加入 ripgrep 参数,但源码没有加入 `--no-ignore`;结合工具描述的 “Respects .gitignore”,它的意图是搜索 hidden 文件同时仍保留 ignore 规则 [E: packages/coding-agent/src/core/tools/grep.ts:131] [E: packages/coding-agent/src/core/tools/grep.ts:215] [I].
- `context > 0` 时实现会通过 `ops.readFile` 重新读取文件并缓存行数组,所以自定义 `GrepOperations` 可以改变上下文读取来源;无上下文时优先用 ripgrep JSON event 自带的 `lines.text` [E: packages/coding-agent/src/core/tools/grep.ts:200] [E: packages/coding-agent/src/core/tools/grep.ts:205] [E: packages/coding-agent/src/core/tools/grep.ts:210] [E: packages/coding-agent/src/core/tools/grep.ts:318] [E: packages/coding-agent/src/core/tools/grep.ts:328].
- `ops.readFile` 失败不会让整个 grep 失败;上下文块会退化成 `relativePath:lineNumber: (unable to read file)` [E: packages/coding-agent/src/core/tools/grep.ts:204] [E: packages/coding-agent/src/core/tools/grep.ts:207] [E: packages/coding-agent/src/core/tools/grep.ts:208] [E: packages/coding-agent/src/core/tools/grep.ts:253].
- `grep` 不走 `file-mutation-queue`,因为它没有写文件操作,也没有在工具定义里声明 sequential execution;写入串行化是 edit/write 这类 mutation tool 的边界,不是 grep 的边界 [I].
- `subsys.coding-agent.output-truncation` 是本节点相关的截断子系统节点:本页只覆盖 grep 如何调用 `truncateHead` 与 `truncateLine`,更通用的工具输出累计、head/tail 截断语义应在该子系统节点集中维护 [I].
- `ref.tools-catalog` 是内置工具全集的目录节点:本页只权威覆盖 `grep` 的 schema、执行和装配事实,其它工具的 wire name 与 preset 关系应在 catalog 节点统一枚举 [I].

## Sources

- packages/coding-agent/src/core/tools/grep.ts
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
