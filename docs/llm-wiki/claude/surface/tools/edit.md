---
id: tool.edit
title: Edit tool
kind: tool
tier: T1
status: verified
source: [tools/FileEditTool/FileEditTool.ts]
symbols: [FileEditTool, FileEditInput, validateInput, call, readFileForEdit]
related: []
updated: 2026-06-13
evidence: explicit
---

`Edit` 是 in-place 文本替换工具; 对已有非空内容的字符串替换, 它要求目标文件先被完整读取并通过 mtime/content staleness guard, 然后以 diff patch 形式返回编辑结果。[E: tools/FileEditTool/constants.ts:2][E: tools/FileEditTool/FileEditTool.ts:86][E: tools/FileEditTool/FileEditTool.ts:275][E: tools/FileEditTool/FileEditTool.ts:481] 新建文件或空/纯空白文件的 `old_string === ""` 路径会在 read-state 检查前通过。[E: tools/FileEditTool/FileEditTool.ts:223][E: tools/FileEditTool/FileEditTool.ts:248]

## 能回答的问题

- `Edit` 的 `old_string`、`new_string`、`replace_all` 如何校验?
- 为什么未读文件或被修改文件会被拒绝?
- `call()` 写文件时如何保留 encoding、line endings 并通知 LSP/VSCode?

## 1 Identity

- Tool name: `Edit`。[E: tools/FileEditTool/constants.ts:2]
- `searchHint`: `modify file contents in place`。[E: tools/FileEditTool/FileEditTool.ts:88]
- `description`: `A tool for editing files`。[E: tools/FileEditTool/FileEditTool.ts:91]
- `strict`: `true`。[E: tools/FileEditTool/FileEditTool.ts:90]
- `maxResultSizeChars`: `100_000`。[E: tools/FileEditTool/FileEditTool.ts:89]

## 2 用途定位

`Edit` 通过 `old_string` 替换为 `new_string`, 可用 `replace_all` 替换所有匹配; 输出包含 original file、structured patch、是否 user modified 和是否 replace all。[E: tools/FileEditTool/types.ts:6][E: tools/FileEditTool/types.ts:62] 它不是 notebook 编辑工具; 到达 notebook 检查分支的 `.ipynb` 内容替换会被要求改用 `NotebookEditTool`, 但新建/空文件路径会更早返回。[E: tools/FileEditTool/FileEditTool.ts:223][E: tools/FileEditTool/FileEditTool.ts:248][E: tools/FileEditTool/FileEditTool.ts:266]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `file_path` | `string` | 是 | 无 | 要修改的 absolute path。[E: tools/FileEditTool/types.ts:8] |
| `old_string` | `string` | 是 | 无 | 要替换的原文本。[E: tools/FileEditTool/types.ts:9] |
| `new_string` | `string` | 是 | 无 | 替换后的文本, 必须与 `old_string` 不同。[E: tools/FileEditTool/types.ts:10][E: tools/FileEditTool/FileEditTool.ts:148] |
| `replace_all` | semantic `boolean` | 否 | `false` | 是否替换所有 occurrences, schema default false optional。[E: tools/FileEditTool/types.ts:15] |

## 4 输出 & maxResultSizeChars

输出 schema 包含 `filePath`、`oldString`、`newString`、`originalFile`、`structuredPatch`、`userModified`、`replaceAll` 和可选 `gitDiff`。[E: tools/FileEditTool/types.ts:63] `mapToolResultToToolResultBlockParam()` 返回简短成功文本; `replaceAll` 为 true 时明确说明 all occurrences were successfully replaced, 用户修改过提案时追加 modified note。[E: tools/FileEditTool/FileEditTool.ts:575][E: tools/FileEditTool/FileEditTool.ts:581][E: tools/FileEditTool/FileEditTool.ts:589]

`maxResultSizeChars=100_000` 是声明值, 但编辑前还会以 `MAX_EDIT_FILE_SIZE = 1 GiB` 防止对超大文件读写导致 OOM。[E: tools/FileEditTool/FileEditTool.ts:79][E: tools/FileEditTool/FileEditTool.ts:89][E: tools/FileEditTool/FileEditTool.ts:185]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isReadOnly` | 默认 `false` | 工具未声明 `isReadOnly`, `buildTool` 默认 false, 且 `call()` 会写磁盘。[E: tools/FileEditTool/FileEditTool.ts:86][E: Tool.ts:757][E: tools/FileEditTool/FileEditTool.ts:490] |
| `isConcurrencySafe` | 默认 `false` | 工具未声明该函数, 默认 false; staleness guard 也要求串行写语义。[E: tools/FileEditTool/FileEditTool.ts:86][E: Tool.ts:757][E: tools/FileEditTool/FileEditTool.ts:442] |
| `isDestructive` | 默认 `false` | 未声明, 默认 false; 实际写权限由 filesystem permission 与 validation 控制。[E: tools/FileEditTool/FileEditTool.ts:125][E: Tool.ts:757] |
| `shouldDefer` | 未声明 | 工具定义未提供该字段。[E: tools/FileEditTool/FileEditTool.ts:86][E: Tool.ts:442] |
| `inputsEquivalent` | 自定义 | 使用 `areFileEditsInputsEquivalent(...)` 比较单文件单 edit 语义。[E: tools/FileEditTool/FileEditTool.ts:363] |

## 6 权限

`backfillObservableInput()` 会 expand `file_path`, 用于 hooks allowlist 观测路径。[E: tools/FileEditTool/FileEditTool.ts:115] `checkPermissions()` 调用 `checkWritePermissionForTool(FileEditTool, input, appState.toolPermissionContext)`。[E: tools/FileEditTool/FileEditTool.ts:125]

filesystem write 权限先检查 edit deny, 再允许某些内部 editable path, 特判 session-level `.claude/**` allow, 执行 dangerous path safety checks, 再检查 ask、`acceptEdits` working dir allow、edit allow, 最后默认 ask。[E: utils/permissions/filesystem.ts:1205][E: utils/permissions/filesystem.ts:1219][E: utils/permissions/filesystem.ts:1241][E: utils/permissions/filesystem.ts:1252][E: utils/permissions/filesystem.ts:1302][E: utils/permissions/filesystem.ts:1340][E: utils/permissions/filesystem.ts:1360][E: utils/permissions/filesystem.ts:1377][E: utils/permissions/filesystem.ts:1395]

## 7 call() 走读

`validateInput()` 先拒绝 team memory secret、`old_string === new_string`、deny rule、过大文件; 不存在文件且 `old_string === ""` 允许创建, 不存在文件但 `old_string` 非空会报错, 已存在文件且 trimmed content 非空时拒绝创建式编辑, 已存在空/纯空白文件且 `old_string === ""` 会通过。[E: tools/FileEditTool/FileEditTool.ts:137][E: tools/FileEditTool/FileEditTool.ts:143][E: tools/FileEditTool/FileEditTool.ts:148][E: tools/FileEditTool/FileEditTool.ts:158][E: tools/FileEditTool/FileEditTool.ts:185][E: tools/FileEditTool/FileEditTool.ts:223][E: tools/FileEditTool/FileEditTool.ts:248] 随后才检查 `.ipynb`、未读或 partial read 文件、mtime 更新且内容变化的文件、找不到 old string、多重匹配但 `replace_all=false`, 最后对 settings 文件做额外校验。[E: tools/FileEditTool/FileEditTool.ts:266][E: tools/FileEditTool/FileEditTool.ts:275][E: tools/FileEditTool/FileEditTool.ts:289][E: tools/FileEditTool/FileEditTool.ts:315][E: tools/FileEditTool/FileEditTool.ts:329][E: tools/FileEditTool/FileEditTool.ts:345]

`call()` expand path, discover/activate skills, 调用 diagnostic tracker, 确保父目录存在, 可记录 file history, 然后进入同步 read-modify-write 临界区。[E: tools/FileEditTool/FileEditTool.ts:387][E: tools/FileEditTool/FileEditTool.ts:400][E: tools/FileEditTool/FileEditTool.ts:404][E: tools/FileEditTool/FileEditTool.ts:425][E: tools/FileEditTool/FileEditTool.ts:427][E: tools/FileEditTool/FileEditTool.ts:431][E: tools/FileEditTool/FileEditTool.ts:442] 它使用 `readFileForEdit()` 读 content、existence、encoding、line endings, 再次做 staleness check, 生成 patch, 调用 `writeTextContent(...)` 写回。[E: tools/FileEditTool/FileEditTool.ts:444][E: tools/FileEditTool/FileEditTool.ts:451][E: tools/FileEditTool/FileEditTool.ts:481][E: tools/FileEditTool/FileEditTool.ts:490][E: tools/FileEditTool/FileEditTool.ts:599]

写入后, `call()` 通知 LSP `changeFile`/`saveFile`, 通知 VSCode, 更新 `readFileState` 为新内容与 mtime, 记录 CLAUDE.md/write analytics、file operation、string length, 在远端 feature gate 下尝试取单文件 git diff, 最后返回 patch data。[E: tools/FileEditTool/FileEditTool.ts:493][E: tools/FileEditTool/FileEditTool.ts:516][E: tools/FileEditTool/FileEditTool.ts:519][E: tools/FileEditTool/FileEditTool.ts:527][E: tools/FileEditTool/FileEditTool.ts:533][E: tools/FileEditTool/FileEditTool.ts:539][E: tools/FileEditTool/FileEditTool.ts:545][E: tools/FileEditTool/FileEditTool.ts:560]

## 8 渲染

`Edit` 使用 `renderToolUseMessage`、`renderToolResultMessage`、`renderToolUseRejectedMessage` 和 `renderToolUseErrorMessage`, 并使用 `userFacingName` 与 `getToolUseSummary`。[E: tools/FileEditTool/FileEditTool.ts:64][E: tools/FileEditTool/FileEditTool.ts:97][E: tools/FileEditTool/FileEditTool.ts:133]

## 9 设计动机·edge·历史

- 对已有非空内容的替换, Edit 前必须完整 Read: partial view 或未读都会拒绝; 新建文件或空/纯空白文件的 `old_string === ""` 路径是例外。[E: tools/FileEditTool/FileEditTool.ts:223][E: tools/FileEditTool/FileEditTool.ts:248][E: tools/FileEditTool/FileEditTool.ts:275]
- staleness guard 双层存在: `validateInput()` 和 `call()` 都检查 read timestamp/mtime, `call()` 内注释要求在 staleness check 与 write 之间避免 async 操作以减少并发 interleave。[E: tools/FileEditTool/FileEditTool.ts:289][E: tools/FileEditTool/FileEditTool.ts:442]
- Windows UNC path 在 validateInput 中不做 filesystem operation, 避免 SMB authentication 泄漏风险, 交由权限检查处理。[E: tools/FileEditTool/FileEditTool.ts:176]

## Sources

- `tools/FileEditTool/FileEditTool.ts`
- `tools/FileEditTool/types.ts`
- `tools/FileEditTool/constants.ts`

## 相关

- [Read tool](read.md)
