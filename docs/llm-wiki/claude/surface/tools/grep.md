---
id: tool.grep
title: Grep
kind: tool
tier: T1
path: surface/tools/grep.md
status: verified
source: [tools/GrepTool/GrepTool.ts, tools/GrepTool/prompt.ts, tools/GrepTool/UI.tsx, utils/embeddedTools.ts, tools.ts, Tool.ts]
symbols: [GrepTool]
related: [tool.glob]
updated: 2026-06-14
evidence: explicit
---

`Grep` 是基于 ripgrep 的内容搜索工具, 支持 regex、glob/type 过滤、三种 output mode、分页式 `head_limit`/`offset`, 并且只在 embedded search tools 未替代 dedicated search tools 时进入 base tool list。[E: tools/GrepTool/prompt.ts:4][E: tools/GrepTool/GrepTool.ts:160][E: tools/GrepTool/GrepTool.ts:310][E: tools.ts:201]

## 能回答的问题

- `Grep` 的 `output_mode` 三种模式如何影响 ripgrep 参数和返回结果?
- `head_limit` 默认值是多少, 怎样取消限制?
- `Grep` 和 `Glob` 为什么可能从 registry 中消失?
- `Grep` 的 read permission、ignore pattern 和 plugin cache exclusion 如何参与搜索?

## 1 Identity

- Tool name: `Grep`。[E: tools/GrepTool/prompt.ts:4]
- `tools.ts` import `GrepTool`, 但 `getAllBaseTools()` 在 `hasEmbeddedSearchTools()` 为 true 时省略 `GlobTool` 和 `GrepTool`。[E: tools.ts:59][E: tools.ts:201]
- `hasEmbeddedSearchTools()` 要求 `EMBEDDED_SEARCH_TOOLS` truthy, 且 entrypoint 不属于 SDK/local-agent 排除列表。[E: utils/embeddedTools.ts:16][E: utils/embeddedTools.ts:19]
- `searchHint`: `search file contents with regex (ripgrep)`。[E: tools/GrepTool/GrepTool.ts:162]
- `maxResultSizeChars`: `20_000`。[E: tools/GrepTool/GrepTool.ts:164]
- `strict`: `true`。[E: tools/GrepTool/GrepTool.ts:165]

## 2 用途定位

`Grep` prompt 要求搜索任务使用 `Grep`, 而不是通过 `Bash` 调 `grep` 或 `rg`; prompt 说明它支持 full regex、`glob`/`type` 过滤、`content`/`files_with_matches`/`count` 三种 output modes, 以及 multiline matching。[E: tools/GrepTool/prompt.ts:10][E: tools/GrepTool/prompt.ts:11][E: tools/GrepTool/prompt.ts:12][E: tools/GrepTool/prompt.ts:13][E: tools/GrepTool/prompt.ts:16]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `pattern` | `string` | 是 | 无 | ripgrep regex pattern。[E: tools/GrepTool/GrepTool.ts:35] |
| `path` | `string` | 否 | `getCwd()` | 文件或目录搜索根; 传入时 validation 检查路径存在。[E: tools/GrepTool/GrepTool.ts:40][E: tools/GrepTool/GrepTool.ts:195][E: tools/GrepTool/GrepTool.ts:201] |
| `glob` | `string` | 否 | 无 | 映射到一个或多个 `rg --glob` 参数; 源码会按空白拆分, 对非 brace pattern 再按逗号拆分。[E: tools/GrepTool/GrepTool.ts:46][E: tools/GrepTool/GrepTool.ts:391][E: tools/GrepTool/GrepTool.ts:406] |
| `output_mode` | `content` / `files_with_matches` / `count` | 否 | `files_with_matches` | 控制 `-l`、`-c` 或内容行输出。[E: tools/GrepTool/GrepTool.ts:52][E: tools/GrepTool/GrepTool.ts:316][E: tools/GrepTool/GrepTool.ts:351] |
| `-B` / `-A` / `-C` / `context` | semantic number | 否 | 无 | 仅 content mode 下传给 ripgrep context flags; `context` 优先于 `-C`, `-C` 优先于 `-B`/`-A`。[E: tools/GrepTool/GrepTool.ts:58][E: tools/GrepTool/GrepTool.ts:362][E: tools/GrepTool/GrepTool.ts:364] |
| `-n` | semantic boolean | 否 | `true` | content mode 下默认显示行号。[E: tools/GrepTool/GrepTool.ts:68][E: tools/GrepTool/GrepTool.ts:321][E: tools/GrepTool/GrepTool.ts:358] |
| `-i` | semantic boolean | 否 | `false` | case-insensitive search 时添加 `-i`。[E: tools/GrepTool/GrepTool.ts:71][E: tools/GrepTool/GrepTool.ts:322][E: tools/GrepTool/GrepTool.ts:346] |
| `type` | `string` | 否 | 无 | 映射到 `rg --type`。[E: tools/GrepTool/GrepTool.ts:74][E: tools/GrepTool/GrepTool.ts:387] |
| `head_limit` | semantic number | 否 | `250` | 对三种 output mode 都生效; 显式传 `0` 表示 unlimited。[E: tools/GrepTool/GrepTool.ts:80][E: tools/GrepTool/GrepTool.ts:108][E: tools/GrepTool/GrepTool.ts:115][E: tools/GrepTool/GrepTool.ts:119] |
| `offset` | semantic number | 否 | `0` | 在 `head_limit` 前跳过前 N 个 entries/lines。[E: tools/GrepTool/GrepTool.ts:83][E: tools/GrepTool/GrepTool.ts:324] |
| `multiline` | semantic boolean | 否 | `false` | true 时添加 `-U --multiline-dotall`。[E: tools/GrepTool/GrepTool.ts:86][E: tools/GrepTool/GrepTool.ts:341] |

## 4 输出 & maxResultSizeChars

输出 schema 包含可选 `mode`、必填 `numFiles` 和 `filenames`、可选 `content`、可选 `numLines`、可选 `numMatches`、可选 `appliedLimit` 和 `appliedOffset`。[E: tools/GrepTool/GrepTool.ts:144][E: tools/GrepTool/GrepTool.ts:146][E: tools/GrepTool/GrepTool.ts:147][E: tools/GrepTool/GrepTool.ts:148][E: tools/GrepTool/GrepTool.ts:149][E: tools/GrepTool/GrepTool.ts:150][E: tools/GrepTool/GrepTool.ts:151][E: tools/GrepTool/GrepTool.ts:152] `mapToolResultToToolResultBlockParam()` 对 content mode 返回匹配内容和 pagination info, 对 count mode 追加 occurrence summary, 对 files mode 返回 `Found N files` 加文件列表。[E: tools/GrepTool/GrepTool.ts:267][E: tools/GrepTool/GrepTool.ts:280][E: tools/GrepTool/GrepTool.ts:293]

`maxResultSizeChars=20_000`; 这比 `Glob` 小, 并且 `Grep` 自身还有 `DEFAULT_HEAD_LIMIT=250` 防止 broad search 过度占用上下文。[E: tools/GrepTool/GrepTool.ts:164][E: tools/GrepTool/GrepTool.ts:108]

## 5 行为标志

| 标志 | 实际值 | 说明 |
| --- | --- | --- |
| `isReadOnly()` | `true` | 源码直接返回 true。[E: tools/GrepTool/GrepTool.ts:187] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true。[E: tools/GrepTool/GrepTool.ts:184] |
| `isDestructive` | 默认 `false` | 未看到自定义 `isDestructive`; `buildTool` 默认 `false`。[I][E: Tool.ts:761] |
| `shouldDefer` | 未声明 | `GrepTool` 未看到 `shouldDefer: true`; registry 可见性主要由 embedded search gate 决定。[I][E: tools.ts:201] |
| `isSearchOrReadCommand()` | `{ isSearch: true, isRead: false }` | 用于 search/read 折叠 UI。[E: tools/GrepTool/GrepTool.ts:193] |
| `extractSearchText()` | content 或 filenames | content mode 返回 content, 其它模式返回 filenames join。[E: tools/GrepTool/GrepTool.ts:250] |

## 6 权限

`preparePermissionMatcher()` 用 search `pattern` 与规则 pattern 做 wildcard match。[E: tools/GrepTool/GrepTool.ts:198] `validateInput()` 仅在提供 `path` 时 stat 路径; UNC 或 `//` 路径跳过 filesystem operations 并直接 validation pass; ENOENT 时返回 cwd note 和 suggestion。[E: tools/GrepTool/GrepTool.ts:201][E: tools/GrepTool/GrepTool.ts:205][E: tools/GrepTool/GrepTool.ts:208][E: tools/GrepTool/GrepTool.ts:213][E: tools/GrepTool/GrepTool.ts:216] `checkPermissions()` 委托 `checkReadPermissionForTool(GrepTool, input, appState.toolPermissionContext)`。[E: tools/GrepTool/GrepTool.ts:233][E: tools/GrepTool/GrepTool.ts:235]

## 7 call() 走读

`call()` 先把 `path` expand 为 absolute path, 默认 cwd, 然后从 `['--hidden']` 开始组装 ripgrep args。[E: tools/GrepTool/GrepTool.ts:329][E: tools/GrepTool/GrepTool.ts:330] 它自动排除 `.git`、`.svn`、`.hg`、`.bzr`、`.jj`、`.sl`, 并添加 `--max-columns 500` 防止 base64/minified 内容污染输出。[E: tools/GrepTool/GrepTool.ts:95][E: tools/GrepTool/GrepTool.ts:333][E: tools/GrepTool/GrepTool.ts:338] pattern 以 dash 开头时, `call()` 使用 `-e pattern` 避免被 ripgrep 当作 option。[E: tools/GrepTool/GrepTool.ts:380]

`call()` 会把 read permission context 的 ignore patterns normalize 到 cwd, 再作为 negated `--glob` 加入 ripgrep args; orphaned plugin cache exclusions 也会变成 `--glob` exclusions。[E: tools/GrepTool/GrepTool.ts:413][E: tools/GrepTool/GrepTool.ts:417][E: tools/GrepTool/GrepTool.ts:423][E: tools/GrepTool/GrepTool.ts:433] 最终执行 `ripGrep(args, absolutePath, abortController.signal)`。[E: tools/GrepTool/GrepTool.ts:441]

content mode 对 raw results 先应用 `head_limit`/`offset`, 再把每行 absolute path 前缀相对化, 输出 `content` 和 `numLines`。[E: tools/GrepTool/GrepTool.ts:443][E: tools/GrepTool/GrepTool.ts:450][E: tools/GrepTool/GrepTool.ts:456][E: tools/GrepTool/GrepTool.ts:470] count mode 对 `filename:count` 行应用 limit/offset, 相对化路径, 并汇总 `numMatches` 和 `numFiles`。[E: tools/GrepTool/GrepTool.ts:478][E: tools/GrepTool/GrepTool.ts:481][E: tools/GrepTool/GrepTool.ts:488][E: tools/GrepTool/GrepTool.ts:500] files mode 对结果 stat, 默认按 mtime descending 排序, test 环境按 filename 排序, 再应用 limit/offset 并相对化。[E: tools/GrepTool/GrepTool.ts:529][E: tools/GrepTool/GrepTool.ts:532][E: tools/GrepTool/GrepTool.ts:541][E: tools/GrepTool/GrepTool.ts:556][E: tools/GrepTool/GrepTool.ts:563]

## 8 渲染

`GrepTool` 使用 `renderToolUseMessage`、`renderToolUseErrorMessage` 和 `renderToolResultMessage`。[E: tools/GrepTool/GrepTool.ts:244][E: tools/GrepTool/GrepTool.ts:245][E: tools/GrepTool/GrepTool.ts:246] `userFacingName()` 返回 `Search`。[E: tools/GrepTool/GrepTool.ts:169]

## 9 设计动机·edge·历史

- `head_limit=0` 是有意提供的 unlimited escape hatch; 其它未传情况默认 `250`, 且只有实际 truncation 才设置 `appliedLimit`。[E: tools/GrepTool/GrepTool.ts:115][E: tools/GrepTool/GrepTool.ts:119][E: tools/GrepTool/GrepTool.ts:123]
- `Grep` 与 `Glob` 的独立工具可见性受 embedded search tools 影响; embedded build 使用 shell 层的 bfs/ugrep 替代 dedicated tools。[E: tools.ts:201][E: utils/embeddedTools.ts:16]
- `Grep` 对 plugin cache 的 orphaned version directories 做额外 exclusion, 避免搜索过期 plugin cache 内容。[E: tools/GrepTool/GrepTool.ts:429][E: tools/GrepTool/GrepTool.ts:433]

## Sources

- `tools/GrepTool/GrepTool.ts`
- `tools/GrepTool/prompt.ts`
- `tools/GrepTool/UI.tsx`
- `utils/embeddedTools.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- [Glob](glob.md)
