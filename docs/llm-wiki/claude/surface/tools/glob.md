---
id: tool.glob
title: Glob
kind: tool
tier: T1
path: surface/tools/glob.md
status: verified
source: [tools/GlobTool/GlobTool.ts, tools/GlobTool/prompt.ts, tools/GlobTool/UI.tsx, utils/embeddedTools.ts, tools.ts, Tool.ts]
symbols: [GlobTool, Output]
related: [tool.grep]
updated: 2026-06-14
evidence: explicit
---

`Glob` 是按 glob pattern 查找文件名的 read-only search tool; 它只在 `hasEmbeddedSearchTools()` 为 false 时作为独立 base tool 暴露。[E: tools/GlobTool/prompt.ts:1][E: tools/GlobTool/GlobTool.ts:57][E: tools/GlobTool/GlobTool.ts:80][E: tools.ts:201]

## 能回答的问题

- `Glob` 的 `pattern` 和 `path` 如何进入实际搜索?
- `Glob` 为什么在某些 ant-native build 中不出现在工具列表里?
- `Glob` 的权限检查是 read permission 还是 write permission?
- `Glob` 输出何时会追加 truncated 提示?

## 1 Identity

- Tool name: `Glob`。[E: tools/GlobTool/prompt.ts:1]
- `tools.ts` import `GlobTool`, 但 `getAllBaseTools()` 只在 `hasEmbeddedSearchTools()` 为 false 时把 `GlobTool` 和 `GrepTool` 放进 base tools。[E: tools.ts:9][E: tools.ts:201]
- `hasEmbeddedSearchTools()` 要求 `EMBEDDED_SEARCH_TOOLS` truthy, 且 entrypoint 不是 `sdk-ts`、`sdk-py`、`sdk-cli` 或 `local-agent`。[E: utils/embeddedTools.ts:16][E: utils/embeddedTools.ts:17][E: utils/embeddedTools.ts:19]
- `searchHint`: `find files by name pattern or wildcard`。[E: tools/GlobTool/GlobTool.ts:59]
- `maxResultSizeChars`: `100_000`。[E: tools/GlobTool/GlobTool.ts:60]

## 2 用途定位

`Glob` 的 prompt 定位是 fast file pattern matching, 支持 `**/*.js` 和 `src/**/*.ts` 这类 pattern, 用于按文件名模式找文件。[E: tools/GlobTool/prompt.ts:3][E: tools/GlobTool/prompt.ts:4][E: tools/GlobTool/prompt.ts:6] 如果搜索是 open-ended 且需要多轮 glob/grep, prompt 建议改用 `Agent` 工具。[E: tools/GlobTool/prompt.ts:7]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `pattern` | `string` | 是 | 无 | 要匹配文件名的 glob pattern。[E: tools/GlobTool/GlobTool.ts:28] |
| `path` | `string` | 否 | `getCwd()` | 搜索目录; schema 要求没有值时省略字段, 传入时必须是有效目录。[E: tools/GlobTool/GlobTool.ts:29][E: tools/GlobTool/GlobTool.ts:33][E: tools/GlobTool/GlobTool.ts:88] |

## 4 输出 & maxResultSizeChars

输出包含 `durationMs`、`numFiles`、`filenames` 和 `truncated`。[E: tools/GlobTool/GlobTool.ts:41][E: tools/GlobTool/GlobTool.ts:44][E: tools/GlobTool/GlobTool.ts:45][E: tools/GlobTool/GlobTool.ts:48] `mapToolResultToToolResultBlockParam()` 在没有文件时返回 `No files found`; 有文件时按行输出 filenames, 若 `truncated` 为 true 则追加 "Results are truncated" 提示。[E: tools/GlobTool/GlobTool.ts:178][E: tools/GlobTool/GlobTool.ts:185][E: tools/GlobTool/GlobTool.ts:190]

`maxResultSizeChars=100_000`; 实际搜索数量还受 `globLimits?.maxResults ?? 100` 控制。[E: tools/GlobTool/GlobTool.ts:60][E: tools/GlobTool/GlobTool.ts:157]

## 5 行为标志

| 标志 | 实际值 | 说明 |
| --- | --- | --- |
| `isReadOnly()` | `true` | 源码直接返回 true。[E: tools/GlobTool/GlobTool.ts:80] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true。[E: tools/GlobTool/GlobTool.ts:77] |
| `isDestructive` | 默认 `false` | 未看到自定义 `isDestructive`; `buildTool` 默认 `false`。[I][E: Tool.ts:757] |
| `shouldDefer` | 未声明 | `GlobTool` 未看到 `shouldDefer: true`; 是否暴露主要由 embedded search gate 决定。[I][E: tools.ts:201] |
| `isSearchOrReadCommand()` | `{ isSearch: true, isRead: false }` | 用于折叠 search/read UI。[E: tools/GlobTool/GlobTool.ts:86] |
| `getPath()` | `expandPath(path)` 或 cwd | 有 `path` 时 expand, 否则返回 current working directory。[E: tools/GlobTool/GlobTool.ts:88] |

## 6 权限

`preparePermissionMatcher()` 用 `pattern` 与规则 pattern 做 wildcard match。[E: tools/GlobTool/GlobTool.ts:91] `validateInput()` 仅在提供 `path` 时检查: expand path, UNC 或 `//` 路径直接 validation pass, 否则 stat 目标并要求它是 directory。[E: tools/GlobTool/GlobTool.ts:94][E: tools/GlobTool/GlobTool.ts:98][E: tools/GlobTool/GlobTool.ts:101][E: tools/GlobTool/GlobTool.ts:107][E: tools/GlobTool/GlobTool.ts:124] ENOENT 时, validation 会把 cwd 和可能的 cwd-relative suggestion 放进错误信息。[E: tools/GlobTool/GlobTool.ts:109][E: tools/GlobTool/GlobTool.ts:110][E: tools/GlobTool/GlobTool.ts:111]

`checkPermissions()` 委托 `checkReadPermissionForTool(GlobTool, input, appState.toolPermissionContext)`, 所以 Glob 使用 read permission 路径而不是 edit/write permission。[E: tools/GlobTool/GlobTool.ts:135][E: tools/GlobTool/GlobTool.ts:137]

## 7 call() 走读

`call()` 记录 start time, 读取 appState, 取 `globLimits?.maxResults ?? 100` 作为 limit, 再调用 `glob(input.pattern, GlobTool.getPath(input), { limit, offset: 0 }, abortController.signal, appState.toolPermissionContext)`。[E: tools/GlobTool/GlobTool.ts:154][E: tools/GlobTool/GlobTool.ts:155][E: tools/GlobTool/GlobTool.ts:156][E: tools/GlobTool/GlobTool.ts:157][E: tools/GlobTool/GlobTool.ts:158] 返回的 files 会用 `toRelativePath` 相对化以节省 tokens, 输出里的 `numFiles` 是相对化后 filenames 的长度。[E: tools/GlobTool/GlobTool.ts:166][E: tools/GlobTool/GlobTool.ts:167][E: tools/GlobTool/GlobTool.ts:170]

## 8 渲染

`GlobTool` 使用 `renderToolUseMessage`、`renderToolUseErrorMessage` 和 `renderToolResultMessage`。[E: tools/GlobTool/GlobTool.ts:146][E: tools/GlobTool/GlobTool.ts:147][E: tools/GlobTool/GlobTool.ts:148] `extractSearchText()` 返回 `filenames.join('\n')`, 使搜索摘要可索引匹配到的文件列表。[E: tools/GlobTool/GlobTool.ts:151]

## 9 设计动机·edge·历史

- `Glob` 与 `Grep` 在 registry 层被同一个 embedded search gate 控制; build 开启 embedded search tools 时, 独立 Glob/Grep 工具都不会进入 base tool list。[E: tools.ts:201][E: utils/embeddedTools.ts:16]
- `Glob` 的 permission matcher 匹配 `pattern`, 但 actual read permission check 仍由 `checkReadPermissionForTool` 根据工具和 input 处理。[E: tools/GlobTool/GlobTool.ts:91][E: tools/GlobTool/GlobTool.ts:137]
- `Glob` 对 UNC path 不做 stat, 这与其它文件工具的 Windows credential leak 防线一致。[E: tools/GlobTool/GlobTool.ts:101]

## Sources

- `tools/GlobTool/GlobTool.ts`
- `tools/GlobTool/prompt.ts`
- `tools/GlobTool/UI.tsx`
- `utils/embeddedTools.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- [Grep](grep.md)
