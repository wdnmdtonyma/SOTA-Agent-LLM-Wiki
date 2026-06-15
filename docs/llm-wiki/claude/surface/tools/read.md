---
id: tool.read
title: Read tool
kind: tool
tier: T1
status: verified
source: [tools/FileReadTool/FileReadTool.ts, tools/FileEditTool/FileEditTool.ts]
symbols: [FileReadTool, inputSchema, outputSchema, callInner, readImageWithTokenBudget, checkReadPermissionForTool]
related: []
updated: 2026-06-13
evidence: explicit
---

`Read` 是本地文件读取工具, 覆盖 text、image、PDF 和 notebook, 并将 text/notebook 读取结果写入 `readFileState`; `Edit` 侧使用该 cache 做 stale-write 检查。[E: tools/FileReadTool/prompt.ts:5][E: tools/FileReadTool/FileReadTool.ts:337][E: tools/FileReadTool/FileReadTool.ts:842][E: tools/FileReadTool/FileReadTool.ts:1032][E: tools/FileEditTool/FileEditTool.ts:275][E: tools/FileEditTool/FileEditTool.ts:453]

## 能回答的问题

- `Read` 的 offset/limit/pages 如何进入不同文件类型分支?
- 为什么 `Read` 是 read-only 和 concurrency-safe?
- 读取后如何写入 `readFileState`?

## 1 Identity

- Tool name: `Read`。[E: tools/FileReadTool/prompt.ts:5]
- `searchHint`: `read files, images, PDFs, notebooks`。[E: tools/FileReadTool/FileReadTool.ts:338]
- `description`: `Read a file from the local filesystem.`。[E: tools/FileReadTool/FileReadTool.ts:344][E: tools/FileReadTool/prompt.ts:12]
- `strict`: `true`。[E: tools/FileReadTool/FileReadTool.ts:343]
- `maxResultSizeChars`: `Infinity`, 因为 output 已被 token/size 校验约束, 持久化再读会形成循环。[E: tools/FileReadTool/FileReadTool.ts:340]

## 2 用途定位

`Read` 的 prompt 要求 `file_path` 是 absolute path, 默认从文件开头读, 支持 offset/limit, 支持 images、PDF 和 Jupyter notebooks, 不读取目录。[E: tools/FileReadTool/prompt.ts:32][E: tools/FileReadTool/prompt.ts:36][E: tools/FileReadTool/prompt.ts:40][E: tools/FileReadTool/prompt.ts:45][E: tools/FileReadTool/prompt.ts:46]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `file_path` | `string` | 是 | 无 | 要读取的 absolute path。[E: tools/FileReadTool/FileReadTool.ts:229] |
| `offset` | semantic nonnegative integer | 否 | `1` in `call()` | 起始行号; `callInner()` 会把 1-based offset 转成 0-based lineOffset, offset 0 保持 0。[E: tools/FileReadTool/FileReadTool.ts:230][E: tools/FileReadTool/FileReadTool.ts:497][E: tools/FileReadTool/FileReadTool.ts:1020] |
| `limit` | semantic positive integer | 否 | `undefined` | 要读取的行数; 未传时 `readFileInRange` 使用 max size cap。[E: tools/FileReadTool/FileReadTool.ts:233][E: tools/FileReadTool/FileReadTool.ts:1022] |
| `pages` | `string` | 否 | `undefined` | PDF page range, validateInput 要求格式可解析且最多 `PDF_MAX_PAGES_PER_READ` 页。[E: tools/FileReadTool/FileReadTool.ts:236][E: tools/FileReadTool/FileReadTool.ts:420][E: tools/FileReadTool/FileReadTool.ts:433] |

## 4 输出 & maxResultSizeChars

输出是 discriminated union: `text` 返回 filePath/content/numLines/startLine/totalLines; `image` 返回 base64、MIME、originalSize、dimensions; `notebook` 返回 cells; `pdf` 返回 base64 PDF; `parts` 返回抽取页图片目录信息; `file_unchanged` 返回 filePath。[E: tools/FileReadTool/FileReadTool.ts:248] `mapToolResultToToolResultBlockParam()` 会把 image 映射为 image block, notebook 委托 `mapNotebookCellsToToolResult`, PDF 返回 metadata 并通过 supplemental document message 传内容, `file_unchanged` 返回固定 stub, text 则加行号和可选 malware reminder。[E: tools/FileReadTool/FileReadTool.ts:652][E: tools/FileReadTool/FileReadTool.ts:670][E: tools/FileReadTool/FileReadTool.ts:672][E: tools/FileReadTool/FileReadTool.ts:686][E: tools/FileReadTool/FileReadTool.ts:692]

`maxResultSizeChars=Infinity` 是声明值; text/notebook 由 `getDefaultFileReadingLimits()`、`readFileInRange(...)` 和 `validateContentTokens(...)` 约束, image 会尝试按 token budget 压缩但 fallback 失败时可能返回原图, PDF 由 size/page 逻辑约束。[E: tools/FileReadTool/FileReadTool.ts:340][E: tools/FileReadTool/FileReadTool.ts:504][E: tools/FileReadTool/FileReadTool.ts:755][E: tools/FileReadTool/FileReadTool.ts:1097][E: tools/FileReadTool/FileReadTool.ts:1136][E: tools/FileReadTool/FileReadTool.ts:1175]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isReadOnly()` | `true` | 不修改目标/用户源文件; text/notebook 会写内部 read cache, PDF page extraction 可能写内部 tool-results page images。[E: tools/FileReadTool/FileReadTool.ts:376][E: tools/FileReadTool/FileReadTool.ts:842][E: tools/FileReadTool/FileReadTool.ts:1032][E: tools/FileReadTool/FileReadTool.ts:895][E: utils/pdf.ts:217] |
| `isConcurrencySafe()` | `true` | 读取可并发执行, 源码直接返回 true。[E: tools/FileReadTool/FileReadTool.ts:373] |
| `isDestructive` | 默认 `false` | 工具未声明, `buildTool` 默认 false。[E: tools/FileReadTool/FileReadTool.ts:337][E: Tool.ts:757] |
| `shouldDefer` | 未声明 | 工具定义未提供该字段。[E: tools/FileReadTool/FileReadTool.ts:337][E: Tool.ts:442] |
| `isSearchOrReadCommand()` | `{ isSearch:false, isRead:true }` | 源码显式返回 Read command 分类。[E: tools/FileReadTool/FileReadTool.ts:382] |
| `maxResultSizeChars` | `Infinity` | 源码说明 output 已有自身限制, 不持久化再读; image token budget 是 best-effort compression, 不是最终硬性重校验。[E: tools/FileReadTool/FileReadTool.ts:340][E: tools/FileReadTool/FileReadTool.ts:1136][E: tools/FileReadTool/FileReadTool.ts:1175] |

## 6 权限

`backfillObservableInput()` 会 expand `file_path`, 防止 hooks allowlist 被 `~` 或 relative path 绕过。[E: tools/FileReadTool/FileReadTool.ts:388] `checkPermissions()` 调用 `checkReadPermissionForTool(FileReadTool, input, appState.toolPermissionContext)`。[E: tools/FileReadTool/FileReadTool.ts:398] 文件系统权限先阻断 UNC 和 suspicious Windows path, 再检查 read deny、read ask、edit implies read、working directory allow、internal readable path、read allow, 最后默认 ask。[E: utils/permissions/filesystem.ts:1030][E: utils/permissions/filesystem.ts:1050][E: utils/permissions/filesystem.ts:1066][E: utils/permissions/filesystem.ts:1081][E: utils/permissions/filesystem.ts:1103][E: utils/permissions/filesystem.ts:1124][E: utils/permissions/filesystem.ts:1136][E: utils/permissions/filesystem.ts:1153][E: utils/permissions/filesystem.ts:1160][E: utils/permissions/filesystem.ts:1178]

`validateInput()` 先校验 PDF pages, 再检查 deny rule、binary extension 和会阻塞/无限输出的 device path; 对 UNC path 只做 path-only 识别并放行, 避免授权前 I/O, 后续 filesystem permission 会把 UNC 降为 ask/manual approval。[E: tools/FileReadTool/FileReadTool.ts:418][E: tools/FileReadTool/FileReadTool.ts:442][E: tools/FileReadTool/FileReadTool.ts:461][E: tools/FileReadTool/FileReadTool.ts:466][E: tools/FileReadTool/FileReadTool.ts:469][E: tools/FileReadTool/FileReadTool.ts:484][E: utils/permissions/filesystem.ts:1050]

## 7 call() 走读

`call()` 读取 context 中的 file limits, expand path, 先用 `readFileState` 做 same offset/limit + unchanged mtime dedup, 命中时返回 `file_unchanged`。[E: tools/FileReadTool/FileReadTool.ts:496][E: tools/FileReadTool/FileReadTool.ts:504][E: tools/FileReadTool/FileReadTool.ts:518][E: tools/FileReadTool/FileReadTool.ts:523][E: tools/FileReadTool/FileReadTool.ts:552] 非 `CLAUDE_CODE_SIMPLE` 时, 它会根据路径 discover nested skill dirs、后台 `addSkillDirectories(...)`, 并同步 activate conditional skills, 然后进入 `callInner(...)`; ENOENT 时还会尝试 macOS screenshot AM/PM thin-space alternate path, 再给 similar file 或 cwd suggestion。[E: tools/FileReadTool/FileReadTool.ts:575][E: tools/FileReadTool/FileReadTool.ts:578][E: tools/FileReadTool/FileReadTool.ts:586][E: tools/FileReadTool/FileReadTool.ts:589][E: tools/FileReadTool/FileReadTool.ts:593][E: tools/FileReadTool/FileReadTool.ts:609]

`callInner()` 分支: `.ipynb` 读取 notebook cells、校验 bytes/tokens、写 `readFileState`; image 读取并 resize/downsample/compress, 可追加 image metadata meta message; PDF 支持 `pages` 抽取 page images, 当能取得 `pageCount` 且超过阈值时要求 `pages`, 不支持 PDF 的模型会报错; text 通过 `readFileInRange(...)` 读取、校验 token、写 `readFileState` 并通知 listeners。[E: tools/FileReadTool/FileReadTool.ts:821][E: tools/FileReadTool/FileReadTool.ts:842][E: tools/FileReadTool/FileReadTool.ts:865][E: tools/FileReadTool/FileReadTool.ts:883][E: tools/FileReadTool/FileReadTool.ts:893][E: tools/FileReadTool/FileReadTool.ts:948][E: utils/pdf.ts:119][E: utils/pdf.ts:126][E: tools/FileReadTool/FileReadTool.ts:979][E: tools/FileReadTool/FileReadTool.ts:1019][E: tools/FileReadTool/FileReadTool.ts:1032][E: tools/FileReadTool/FileReadTool.ts:1040]

## 8 渲染

`Read` 使用 `renderToolUseMessage`、`renderToolUseTag`、`renderToolResultMessage` 和 `renderToolUseErrorMessage`。[E: tools/FileReadTool/FileReadTool.ts:406] `extractSearchText()` 固定返回空字符串, 源码注释说明 UI 渲染 summary chrome, 不把 file content 作为 searchable UI text 暴露。[E: tools/FileReadTool/FileReadTool.ts:409][E: tools/FileReadTool/FileReadTool.ts:414]

## 9 设计动机·edge·历史

- `/dev/zero`、`/dev/random`、`/dev/stdin` 等 device path 被 path-only block, 避免无限输出或阻塞输入。[E: tools/FileReadTool/FileReadTool.ts:96][E: tools/FileReadTool/FileReadTool.ts:117]
- `file_unchanged` dedup 适用于先前由 Read 写入、非 partial view、同 offset/limit 且 mtime 未变的 text/notebook range; Edit/Write 写入的 state 会因为 `offset=undefined` 被排除, 避免把编辑前内容当作当前内容。[E: tools/FileReadTool/FileReadTool.ts:523][E: tools/FileReadTool/FileReadTool.ts:543][E: tools/FileReadTool/FileReadTool.ts:552]
- image token 预算先标准 resize, 超预算再 aggressive compression, 失败时尝试 sharp fallback。[E: tools/FileReadTool/FileReadTool.ts:1116][E: tools/FileReadTool/FileReadTool.ts:1136][E: tools/FileReadTool/FileReadTool.ts:1140][E: tools/FileReadTool/FileReadTool.ts:1157]

## Sources

- `tools/FileReadTool/FileReadTool.ts`
- `tools/FileEditTool/FileEditTool.ts`

## 相关

- [Edit tool](edit.md)
