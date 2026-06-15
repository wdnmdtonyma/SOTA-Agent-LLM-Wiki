---
id: tool.bash
title: Bash tool
kind: tool
tier: T1
status: verified
source: [tools/BashTool/BashTool.tsx, utils/bash/, utils/shell/, utils/permissions/]
symbols: [BashTool, BashToolInput, bashToolHasPermission, checkReadOnlyConstraints, shouldUseSandbox, runShellCommand]
related: [subsys.permissions]
updated: 2026-06-13
evidence: explicit
---

`Bash` 是本地 shell 命令执行工具, 既支持前台/后台 shell task, 也把 read-only 推断、sandbox、权限分类器、输出持久化和进度 UI 放在同一个工具定义下。[E: tools/BashTool/toolName.ts:2][E: tools/BashTool/BashTool.tsx:420][E: tools/BashTool/BashTool.tsx:624][E: tools/BashTool/BashTool.tsx:826]

## 能回答的问题

- `Bash` 输入字段有哪些, 哪些字段会被隐藏?
- `isReadOnly` 与 `isConcurrencySafe` 的实际判断是什么?
- `call()` 如何处理 shell 输出、后台任务、sandbox、图片和大输出?

## 1 Identity

- Tool name: `Bash`。[E: tools/BashTool/toolName.ts:2]
- `searchHint`: `execute shell commands`。[E: tools/BashTool/BashTool.tsx:422]
- `description(input)`: 若输入有 `description`, 返回该描述; 否则返回 `Run shell command`。[E: tools/BashTool/BashTool.tsx:426]
- `strict`: `true`。[E: tools/BashTool/BashTool.tsx:424]
- `maxResultSizeChars`: `30_000`, 超出还会经过工具结果持久化路径处理。[E: tools/BashTool/BashTool.tsx:423][E: tools/BashTool/BashTool.tsx:728]

## 2 用途定位

`Bash` 用于执行任意 shell 命令, 但模型可见 schema 不暴露内部 `_simulatedSedEdit`, 因为源码注释明确指出暴露该字段会让模型绕过权限检查和 sandbox 写任意文件。[E: tools/BashTool/BashTool.tsx:227][E: tools/BashTool/BashTool.tsx:249] 该工具还把常见 search/read/list 命令标记为可折叠 UI 类型, 要求 compound/pipeline 的所有非 neutral 部分都属于 search/read/list 才算 read/search command。[E: tools/BashTool/BashTool.tsx:95][E: tools/BashTool/BashTool.tsx:140][E: tools/BashTool/BashTool.tsx:147]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 模型可见 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `command` | `string` | 是 | 无 | 是 | 要执行的 shell 命令。[E: tools/BashTool/BashTool.tsx:228] |
| `timeout` | semantic `number` | 否 | `getDefaultTimeoutMs()` 在执行时兜底 | 是 | 毫秒超时, schema 描述包含 `getMaxTimeoutMs()` 上限。[E: tools/BashTool/BashTool.tsx:229][E: tools/BashTool/BashTool.tsx:860] |
| `description` | `string` | 否 | 无 | 是 | 主动语态描述, 用于 UI/activity/后台 task 描述。[E: tools/BashTool/BashTool.tsx:230][E: tools/BashTool/BashTool.tsx:504] |
| `run_in_background` | semantic `boolean` | 否 | `false` 行为 | 条件可见 | 背景任务未禁用时可见; env `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` 为真时从 schema omit。[E: tools/BashTool/BashTool.tsx:241][E: tools/BashTool/BashTool.tsx:254] |
| `dangerouslyDisableSandbox` | semantic `boolean` | 否 | `false` 行为 | 是 | 在 policy 允许 unsandboxed command 时可关闭 sandbox。[E: tools/BashTool/BashTool.tsx:242][E: tools/BashTool/shouldUseSandbox.ts:135] |
| `_simulatedSedEdit` | object `{filePath,newContent}` | 否 | 无 | 否 | 仅内部 sed preview 使用, `inputSchema` 总是 omit。[E: tools/BashTool/BashTool.tsx:243][E: tools/BashTool/BashTool.tsx:249] |

## 4 输出 & maxResultSizeChars

输出 schema 包含 `stdout`、`stderr`、`rawOutputPath`、`interrupted`、`isImage`、后台任务标识、sandbox 标识、return code interpretation、structured content 与 persisted output 路径/大小。[E: tools/BashTool/BashTool.tsx:279] `call()` 实际返回的 `data` 会设置 `persistedOutputPath` 与 `persistedOutputSize`, 但不设置 schema 中的 `rawOutputPath`。[E: tools/BashTool/BashTool.tsx:803][E: tools/BashTool/BashTool.tsx:814] `mapToolResultToToolResultBlockParam()` 优先返回 `structuredContent`, 图片输出映射为 image block, 文本输出会 trim stdout, persisted output 会生成 preview 和 path 提示, interrupted 会追加 error marker。[E: tools/BashTool/BashTool.tsx:555][E: tools/BashTool/BashTool.tsx:576][E: tools/BashTool/BashTool.tsx:581][E: tools/BashTool/BashTool.tsx:589][E: tools/BashTool/BashTool.tsx:601]

`maxResultSizeChars=30_000` 是工具声明值; 大输出会写入 tool-results 目录或硬链接/copy 原始输出, 并通过 `persistedOutputPath`/`persistedOutputSize` 暴露, 最大持久化大小为 64 MiB。[E: tools/BashTool/BashTool.tsx:423][E: tools/BashTool/BashTool.tsx:728][E: tools/BashTool/BashTool.tsx:803]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isReadOnly(input)` | 动态 | 先计算 command 是否含 `cd`, 再把该信息传给 `checkReadOnlyConstraints`; 只有返回 `allow` 才算只读, `cd + git` 等组合会被额外硬化。[E: tools/BashTool/BashTool.tsx:437][E: tools/BashTool/readOnlyValidation.ts:1876][E: tools/BashTool/readOnlyValidation.ts:1914][E: tools/BashTool/readOnlyValidation.ts:1978] |
| `isConcurrencySafe(input)` | 等于 `isReadOnly(input)` | 源码直接 `return this.isReadOnly(input)`。[E: tools/BashTool/BashTool.tsx:433] |
| `isDestructive` | 默认 `false` | `BashTool` 未声明该字段, `buildTool` 默认 `isDestructive=false`; 真实风险由权限和 read-only 分类承担。[E: tools/BashTool/BashTool.tsx:420][E: Tool.ts:757] |
| `shouldDefer` | 未声明 | 默认工具定义没有该字段, 因此由调用方按 undefined 处理。[E: tools/BashTool/BashTool.tsx:420][E: Tool.ts:442] |
| `isSearchOrReadCommand(input)` | 动态 | 安全解析成功后调用 `isSearchOrReadBashCommand(command)`。[E: tools/BashTool/BashTool.tsx:469] |
| `interruptBehavior` | 未声明 | `StreamingToolExecutor` 对未声明或抛错的工具采用 block 默认行为。[E: services/tools/StreamingToolExecutor.ts:233] |

## 6 权限

`checkPermissions()` 直接委托给 `bashToolHasPermission(input, context)`。[E: tools/BashTool/BashTool.tsx:539] `bashToolHasPermission()` 先做 AST/tree-sitter 或 legacy shell-quote 解析; too-complex 会保留 explicit deny/ask/allow 与 deny 规则后返回 ask, malformed legacy 也返回 ask。[E: tools/BashTool/bashPermissions.ts:1663][E: tools/BashTool/bashPermissions.ts:1670][E: tools/BashTool/bashPermissions.ts:1741][E: tools/BashTool/bashPermissions.ts:1815]

如果 sandboxing 开启、sandbox auto-allow 开启且 `shouldUseSandbox(input)` 为真, 权限会先走 sandbox auto-allow, 且该路径仍尊重 explicit deny/ask 规则。[E: tools/BashTool/bashPermissions.ts:1829] `shouldUseSandbox()` 在 sandbox 全局关闭、`dangerouslyDisableSandbox` 且 policy 允许、无 command、命中 excludedCommands 时返回 false。[E: tools/BashTool/shouldUseSandbox.ts:130][E: tools/BashTool/shouldUseSandbox.ts:135][E: tools/BashTool/shouldUseSandbox.ts:143][E: tools/BashTool/shouldUseSandbox.ts:147]

随后权限逻辑检查 exact deny、Bash prompt deny/ask classifier、command operators、原始命令安全、subcommands、`cd` 与 git 组合、path constraints、subcommand deny/ask/allow 和 classifier pending check。[E: tools/BashTool/bashPermissions.ts:1845][E: tools/BashTool/bashPermissions.ts:1856][E: tools/BashTool/bashPermissions.ts:1973][E: tools/BashTool/bashPermissions.ts:2078][E: tools/BashTool/bashPermissions.ts:2144][E: tools/BashTool/bashPermissions.ts:2181][E: tools/BashTool/bashPermissions.ts:2202][E: tools/BashTool/bashPermissions.ts:2229]

## 7 call() 走读

`call()` 首先处理内部 `_simulatedSedEdit`, 该路径会读原文件、保留 encoding/line endings、写入新内容、通知 VSCode, 并更新 `readFileState`; file history 只在 `fileHistoryEnabled()` 且存在 `parentMessage` 时记录。[E: tools/BashTool/BashTool.tsx:624][E: tools/BashTool/BashTool.tsx:355][E: tools/BashTool/BashTool.tsx:391][E: tools/BashTool/BashTool.tsx:407]

普通路径创建 stdout accumulator, 生成 `runShellCommand(...)` generator, 并把 progress 转成 `bash_progress` 消息传给 `onProgress`。[E: tools/BashTool/BashTool.tsx:630][E: tools/BashTool/BashTool.tsx:645][E: tools/BashTool/BashTool.tsx:659] shell 完成后, `call()` 追踪 git 操作、处理 interrupt reason、解释 return code、记录 lockfile 事件、重置 cwd、注解 sandbox failure, 并根据解释结果抛出 `ShellError` 或继续。[E: tools/BashTool/BashTool.tsx:681][E: tools/BashTool/BashTool.tsx:690][E: tools/BashTool/BashTool.tsx:696][E: tools/BashTool/BashTool.tsx:704]

输出阶段会持久化过大的输出, 记录 analytics, 提取 Claude Code hints, 检测图片输出并 resize, 最后返回 output schema 中的字段。[E: tools/BashTool/BashTool.tsx:728][E: tools/BashTool/BashTool.tsx:754][E: tools/BashTool/BashTool.tsx:772][E: tools/BashTool/BashTool.tsx:785][E: tools/BashTool/BashTool.tsx:803]

`runShellCommand()` 负责执行 `exec(command, ..., { timeout, onProgress, preventCwdChanges, shouldUseSandbox, shouldAutoBackground })`, 显式 `run_in_background` 会立即 `spawnShellTask` 并返回 background task id; `BackgroundHint` 需要后台任务未禁用、命令尚未后台化、达到进度阈值且存在 `setToolJSX`, assistant auto-background 还需要 `KAIROS`、`getKairosActive()`、主线程、未显式 `run_in_background` 等条件。[E: tools/BashTool/BashTool.tsx:826][E: tools/BashTool/BashTool.tsx:877][E: tools/BashTool/BashTool.tsx:881][E: tools/BashTool/BashTool.tsx:976][E: tools/BashTool/BashTool.tsx:985][E: tools/BashTool/BashTool.tsx:1003][E: tools/BashTool/BashTool.tsx:1108]

## 8 渲染

`BashTool` 使用 `renderToolUseMessage`、`renderToolUseProgressMessage`、`renderToolUseQueuedMessage`、`renderToolResultMessage` 和 `renderToolUseErrorMessage`。[E: tools/BashTool/BashTool.tsx:50][E: tools/BashTool/BashTool.tsx:542] `userFacingName()` 对 sed in-place edit 会返回 FileEdit 的 facing name; sandbox indicator env 开启且 sandbox 生效时返回完整名称 `SandboxedBash`。[E: tools/BashTool/BashTool.tsx:484][E: tools/BashTool/BashTool.tsx:498]

## 9 设计动机·edge·历史

- leading 整数秒 `sleep N` 且 N 大于等于 2 秒的命令会被 `detectBlockedSleepPattern()` 识别; `validateInput()` 只有在 `MONITOR_TOOL` gate 开启、后台任务未禁用且未显式 `run_in_background` 时才拦截并提示使用 `run_in_background=true`。[E: tools/BashTool/BashTool.tsx:317][E: tools/BashTool/BashTool.tsx:328][E: tools/BashTool/BashTool.tsx:524]
- read-only 判断对 git 有额外硬化: compound command 同时含 `cd` 和 git、bare repo cwd、写 git internal path 后运行 git、sandbox 中 cwd 不等于 original cwd 都不会自动只读放行。[E: tools/BashTool/readOnlyValidation.ts:1914][E: tools/BashTool/readOnlyValidation.ts:1925][E: tools/BashTool/readOnlyValidation.ts:1938][E: tools/BashTool/readOnlyValidation.ts:1951]
- 权限 matcher 会解析命令并让 compound command 的 subcommand prefix/wildcard 都能匹配规则; parse 失败时 matcher 退化为总是 true 的保守匹配。[E: tools/BashTool/BashTool.tsx:445]

## Sources

- `tools/BashTool/BashTool.tsx`
- `tools/BashTool/bashPermissions.ts`
- `tools/BashTool/readOnlyValidation.ts`
- `tools/BashTool/shouldUseSandbox.ts`
- `utils/bash/`
- `utils/shell/`
- `utils/permissions/`

## 相关

- `subsys.permissions`
