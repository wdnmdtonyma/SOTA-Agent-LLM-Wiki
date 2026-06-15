---
id: tool.write
title: Write
kind: tool
tier: T1
path: surface/tools/write.md
status: verified
source: [tools/FileWriteTool/FileWriteTool.ts, tools/FileWriteTool/prompt.ts, tools/FileWriteTool/UI.tsx, tools.ts, Tool.ts]
symbols: [FileWriteTool, FileWriteToolInput, Output]
related: [tool.read, tool.edit]
updated: 2026-06-14
evidence: explicit
---

`Write` 是整文件写入工具:它创建新文件或用模型给出的完整 `content` 覆盖已有文件, 对已有文件要求先经过 `Read` 建立 `readFileState` 以避免 stale write。[E: tools/FileWriteTool/prompt.ts:3][E: tools/FileWriteTool/FileWriteTool.ts:94][E: tools/FileWriteTool/FileWriteTool.ts:198][E: tools/FileWriteTool/FileWriteTool.ts:305]

## 能回答的问题

- `Write` 和 `Edit` 的边界是什么?
- `Write` 为什么要求已有文件先被 `Read`?
- `Write` 的输入、输出和 `maxResultSizeChars` 是什么?
- `Write.call()` 写文件前后会更新哪些内部状态?

## 1 Identity

- Tool name: `Write`。[E: tools/FileWriteTool/prompt.ts:3]
- `tools.ts` 直接 import `FileWriteTool`, 并在 `getAllBaseTools()` 的基础工具数组中加入 `FileWriteTool`。[E: tools.ts:8][E: tools.ts:205]
- `searchHint`: `create or overwrite files`。[E: tools/FileWriteTool/FileWriteTool.ts:96]
- `description()`: `Write a file to the local filesystem.`。[E: tools/FileWriteTool/FileWriteTool.ts:100]
- `strict`: `true`。[E: tools/FileWriteTool/FileWriteTool.ts:98]
- `maxResultSizeChars`: `100_000`。[E: tools/FileWriteTool/FileWriteTool.ts:97]

## 2 用途定位

`Write` 的 prompt 明确说它会 overwrite existing file, 且已有文件必须先用 `Read` 读取; prompt 还建议修改已有文件时优先使用 `Edit`, 因为 `Edit` 只发送 diff, `Write` 更适合新建文件或 complete rewrites。[E: tools/FileWriteTool/prompt.ts:14][E: tools/FileWriteTool/prompt.ts:15]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `file_path` | `string` | 是 | 无 | 要写入的 absolute path; schema 描述要求 absolute, not relative。[E: tools/FileWriteTool/FileWriteTool.ts:58] |
| `content` | `string` | 是 | 无 | 写入文件的完整内容。[E: tools/FileWriteTool/FileWriteTool.ts:63] |

## 4 输出 & maxResultSizeChars

输出对象包含 `type`、`filePath`、`content`、`structuredPatch`、`originalFile` 和可选 `gitDiff`; `type` 只可能是 `create` 或 `update`。[E: tools/FileWriteTool/FileWriteTool.ts:70][E: tools/FileWriteTool/FileWriteTool.ts:75][E: tools/FileWriteTool/FileWriteTool.ts:77][E: tools/FileWriteTool/FileWriteTool.ts:80][E: tools/FileWriteTool/FileWriteTool.ts:86] `call()` 在旧内容存在时返回 `update` 与 diff patch, 旧内容不存在时返回 `create` 和空 patch。[E: tools/FileWriteTool/FileWriteTool.ts:372][E: tools/FileWriteTool/FileWriteTool.ts:395] `mapToolResultToToolResultBlockParam()` 把 `create` 映射为 "File created successfully..." 文本, 把 `update` 映射为 "updated successfully" 文本。[E: tools/FileWriteTool/FileWriteTool.ts:424][E: tools/FileWriteTool/FileWriteTool.ts:430]

`maxResultSizeChars=100_000` 是 `FileWriteTool` 的声明值; `Tool` interface 也把 `maxResultSizeChars` 定义为可选工具字段。[E: tools/FileWriteTool/FileWriteTool.ts:97][E: Tool.ts:466]

## 5 行为标志

| 标志 | 实际值 | 说明 |
| --- | --- | --- |
| `isReadOnly` | 默认 `false` | `FileWriteTool` 的定义未提供自定义 `isReadOnly`; `buildTool` 默认值是 `false`, 且 `call()` 会写磁盘。[I][E: Tool.ts:760][E: tools/FileWriteTool/FileWriteTool.ts:305] |
| `isConcurrencySafe` | 默认 `false` | `FileWriteTool` 未提供自定义 `isConcurrencySafe`; `buildTool` 默认值是 `false`, 且源码在 staleness check 与 write 之间要求避免 async interleave。[I][E: Tool.ts:759][E: tools/FileWriteTool/FileWriteTool.ts:266] |
| `isDestructive` | 默认 `false` | `buildTool` 对未声明 `isDestructive` 的工具填 `false`; `Write` 的覆盖风险由 validation 与 write permission 控制。[I][E: Tool.ts:761][E: tools/FileWriteTool/FileWriteTool.ts:153] |
| `shouldDefer` | 未声明 | `Tool` 接口把 `shouldDefer` 定义为可选字段; `FileWriteTool` 没有可见的 `shouldDefer: true` 定义。[I][E: Tool.ts:442] |
| `toAutoClassifierInput` | `${file_path}: ${content}` | 权限 classifier 输入把路径和完整内容拼在一起。[E: tools/FileWriteTool/FileWriteTool.ts:119] |
| `isResultTruncated` | 自定义 UI helper | `FileWriteTool` 直接使用 `UI.tsx` 导出的 `isResultTruncated`。[E: tools/FileWriteTool/FileWriteTool.ts:48][E: tools/FileWriteTool/FileWriteTool.ts:112] |

## 6 权限

`backfillObservableInput()` 会 expand `file_path`, 用于 hooks allowlists 观测规范化后的路径。[E: tools/FileWriteTool/FileWriteTool.ts:129] `preparePermissionMatcher()` 用 `matchWildcardPattern(pattern, file_path)` 匹配权限规则。[E: tools/FileWriteTool/FileWriteTool.ts:133] `checkPermissions()` 委托 `checkWritePermissionForTool(FileWriteTool, input, appState.toolPermissionContext)`。[E: tools/FileWriteTool/FileWriteTool.ts:137]

`validateInput()` 先 expand path, 再用 `checkTeamMemSecrets()` 阻止写入含 secret 的 team memory 文件, 然后检查 edit deny rule。[E: tools/FileWriteTool/FileWriteTool.ts:153][E: tools/FileWriteTool/FileWriteTool.ts:157][E: tools/FileWriteTool/FileWriteTool.ts:164] Windows UNC 或 `//` 路径会跳过 filesystem operations 并直接 validation pass, 交给后续 permission 阶段处理网络路径风险。[E: tools/FileWriteTool/FileWriteTool.ts:182] 对已存在文件, validation 要求 `readFileState` 存在且不是 partial view; 若磁盘 mtime 晚于 read timestamp, validation 拒绝写入并要求重新读取。[E: tools/FileWriteTool/FileWriteTool.ts:198][E: tools/FileWriteTool/FileWriteTool.ts:212]

## 7 call() 走读

`call()` 先 expand `file_path`, 计算 parent directory, 根据目标路径 discover skill dirs、后台 add skill dirs, 并 activate conditional skills。[E: tools/FileWriteTool/FileWriteTool.ts:229][E: tools/FileWriteTool/FileWriteTool.ts:230][E: tools/FileWriteTool/FileWriteTool.ts:234][E: tools/FileWriteTool/FileWriteTool.ts:241][E: tools/FileWriteTool/FileWriteTool.ts:245] 写入前, `call()` 通知 diagnostic tracker、创建父目录, 并在 file history feature 开启且 tracker 存在时记录 pre-edit backup。[E: tools/FileWriteTool/FileWriteTool.ts:247][E: tools/FileWriteTool/FileWriteTool.ts:254][E: tools/FileWriteTool/FileWriteTool.ts:255][E: tools/FileWriteTool/FileWriteTool.ts:259]

进入同步 read-modify-write 区域后, `call()` 读取当前文件 metadata; 若已有文件在上次 Read 后被修改且内容不等于 full read cache, 抛出 `FILE_UNEXPECTEDLY_MODIFIED_ERROR`。[E: tools/FileWriteTool/FileWriteTool.ts:270][E: tools/FileWriteTool/FileWriteTool.ts:279][E: tools/FileWriteTool/FileWriteTool.ts:291][E: tools/FileWriteTool/FileWriteTool.ts:292] 写入使用 `writeTextContent(fullFilePath, content, enc, 'LF')`; 源码注释旁的代码表明 `Write` 使用模型传入的完整内容, 不尝试保留旧文件 line endings。[E: tools/FileWriteTool/FileWriteTool.ts:305] 写入后, `call()` 通知 LSP didChange/didSave、通知 VSCode、更新 `readFileState` 为新内容和新 mtime。[E: tools/FileWriteTool/FileWriteTool.ts:308][E: tools/FileWriteTool/FileWriteTool.ts:313][E: tools/FileWriteTool/FileWriteTool.ts:320][E: tools/FileWriteTool/FileWriteTool.ts:329][E: tools/FileWriteTool/FileWriteTool.ts:332]

如果写入目标以 `CLAUDE.md` 结尾, `call()` 记录 `tengu_write_claudemd` analytics event。[E: tools/FileWriteTool/FileWriteTool.ts:340] 在 `CLAUDE_CODE_REMOTE` 且 GrowthBook `tengu_quartz_lantern` 开启时, `call()` 会尝试计算单文件 git diff 并记录 diff analytics。[E: tools/FileWriteTool/FileWriteTool.ts:346][E: tools/FileWriteTool/FileWriteTool.ts:350][E: tools/FileWriteTool/FileWriteTool.ts:352]

## 8 渲染

`FileWriteTool` 使用 `renderToolUseMessage`、`renderToolUseRejectedMessage`、`renderToolUseErrorMessage` 和 `renderToolResultMessage`。[E: tools/FileWriteTool/FileWriteTool.ts:111][E: tools/FileWriteTool/FileWriteTool.ts:143][E: tools/FileWriteTool/FileWriteTool.ts:144][E: tools/FileWriteTool/FileWriteTool.ts:145] `extractSearchText()` 固定返回空字符串, 以避免 update mode 下没有展示的 raw content 被搜索索引误收录。[E: tools/FileWriteTool/FileWriteTool.ts:151]

## 9 设计动机·edge·历史

- `Write` 对已有文件要求 full read cache, partial read 也会拒绝, 这是整文件覆盖工具的 stale-write guard。[E: tools/FileWriteTool/FileWriteTool.ts:198][E: tools/FileWriteTool/FileWriteTool.ts:199]
- `Write` 在 validation 和 call 两处都做 staleness 检查: validation 用 mtime 快速拒绝, call 在真正写入前重新读文件并允许 Windows mtime-only false positive 通过 content equality 兜底。[E: tools/FileWriteTool/FileWriteTool.ts:212][E: tools/FileWriteTool/FileWriteTool.ts:279][E: tools/FileWriteTool/FileWriteTool.ts:286]
- `Write` 新建文件时不需要 read cache; `fs.stat()` 抛 ENOENT 时 validation 直接通过。[E: tools/FileWriteTool/FileWriteTool.ts:189][E: tools/FileWriteTool/FileWriteTool.ts:192][E: tools/FileWriteTool/FileWriteTool.ts:193]

## Sources

- `tools/FileWriteTool/FileWriteTool.ts`
- `tools/FileWriteTool/prompt.ts`
- `tools/FileWriteTool/UI.tsx`
- `tools.ts`
- `Tool.ts`

## 相关

- [Read](read.md)
- [Edit](edit.md)
