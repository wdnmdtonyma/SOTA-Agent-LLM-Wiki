---
id: surface.tools.edit
title: edit 文件编辑工具
kind: tool
tier: T1
pkg: coding-agent
source: [packages/coding-agent/src/core/tools/edit.ts, packages/coding-agent/src/core/tools/edit-diff.ts]
symbols: [createEditTool, EditToolInput, computeEditsDiff, normalizeForFuzzyMatch]
related: [subsys.coding-agent.edit-engine, subsys.coding-agent.file-mutation-queue, ref.tools-catalog]
evidence: explicit
status: verified
updated: 5a073885
---

> `edit` 是 pi-coding-agent 暴露给模型的精确文本替换工具: 一次调用编辑一个文件, 用 `edits[]` 描述一个或多个互不重叠的 `oldText` -> `newText` replacement, 并在成功后返回 display diff 与 unified patch。

## 能回答的问题

- `edit` tool 的 wire name、`createEditToolDefinition` 工厂和 public input schema 是什么?
- `edits[]` 是按原文件一次性匹配, 还是按前一个 replacement 的结果递增匹配?
- `edit` 的 fuzzy match 会容忍哪些 Unicode、空白和换行差异?
- `edit` 为什么没有把整个 tool 标成 `executionMode: "sequential"`, 但仍能避免同一文件并发写丢?
- `computeEditsDiff` 何时运行, 它和真正写文件的 `execute()` 有什么区别?
- SDK 或 extension 想远程编辑文件时, `EditOperations` 可以替换哪些 I/O 操作?

## 1 Identity

`edit` 的模型可见 tool name 是 `"edit"`, label 也是 `"edit"`; 这两个字段由 `createEditToolDefinition(cwd, options)` 返回的 `ToolDefinition` 直接设置 [E: packages/coding-agent/src/core/tools/edit.ts:293] [E: packages/coding-agent/src/core/tools/edit.ts:294]。`createEditTool(cwd, options)` 只是把 `createEditToolDefinition` 交给 `wrapToolDefinition`, 得到 agent runtime 使用的 `AgentTool` [E: packages/coding-agent/src/core/tools/edit.ts:435] [E: packages/coding-agent/src/core/tools/edit.ts:436]。

`packages/coding-agent/src/core/tools/index.ts` 是内置工具集的 ground truth: `ToolName` union 包含 `"edit"`, `allToolNames` 也包含 `"edit"` [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84]。同一个文件把 `createEditToolDefinition` 放进 `createToolDefinition("edit")`、`createCodingToolDefinitions()`、`createAllToolDefinitions()` 和对应的 `create*Tools()` 工厂 [E: packages/coding-agent/src/core/tools/index.ts:102] [E: packages/coding-agent/src/core/tools/index.ts:103] [E: packages/coding-agent/src/core/tools/index.ts:142] [E: packages/coding-agent/src/core/tools/index.ts:160] [E: packages/coding-agent/src/core/tools/index.ts:172] [E: packages/coding-agent/src/core/tools/index.ts:190]。

## 2 用途定位

`edit` 的 description 明确要求 exact text replacement, 每个 `edits[].oldText` 必须在原文件中唯一、非重叠; 若两个改动影响同一块或相邻行, 模型应合并成一个 edit, 而不是发 overlapping edits [E: packages/coding-agent/src/core/tools/edit.ts:295] [E: packages/coding-agent/src/core/tools/edit.ts:296]。系统 prompt snippet 把它定位为 precise file edits, 并强调多处离散变更应在同一次 `edit` 调用中使用多个 `edits[]` entry [E: packages/coding-agent/src/core/tools/edit.ts:298] [E: packages/coding-agent/src/core/tools/edit.ts:300] [E: packages/coding-agent/src/core/tools/edit.ts:301]。

`edit` 不是创建新文件的工具: `execute()` 先对目标路径执行 readable+writable access check, 失败时抛出 `Could not edit file: ... Error code: ...` [E: packages/coding-agent/src/core/tools/edit.ts:325] [E: packages/coding-agent/src/core/tools/edit.ts:330]。测试覆盖了 missing file 的 `ENOENT` 和 read-only file 的 `EACCES` 错误消息 [E: packages/coding-agent/test/tools.test.ts:299] [E: packages/coding-agent/test/tools.test.ts:307] [E: packages/coding-agent/test/tools.test.ts:424] [E: packages/coding-agent/test/tools.test.ts:434]。

## 3 输入 schema 表

`editSchema` 是 TypeBox object, 顶层字段只有 `path` 和 `edits`, 且 `additionalProperties: false` [E: packages/coding-agent/src/core/tools/edit.ts:44] [E: packages/coding-agent/src/core/tools/edit.ts:52]。`edits` 的 element schema 只有 `oldText` 与 `newText`, element 也禁止 extra properties [E: packages/coding-agent/src/core/tools/edit.ts:33] [E: packages/coding-agent/src/core/tools/edit.ts:41]。

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `path` | `string` | 是 [I] | 无 | relative 或 absolute path | 要编辑的单个文件路径; 执行时用 `resolveToCwd(path, cwd)` 解析成 absolute path [E: packages/coding-agent/src/core/tools/edit.ts:46] [E: packages/coding-agent/src/core/tools/edit.ts:310]。 |
| `edits` | `Array<{ oldText: string; newText: string }>` | 是 [I] | 无 | runtime 要求非空 | 一个或多个 targeted replacements; schema 描述要求每个 `oldText` 面向原文件匹配, 不要 overlapping 或 nested, 邻近变更要合并 [E: packages/coding-agent/src/core/tools/edit.ts:47] [E: packages/coding-agent/src/core/tools/edit.ts:49]。`validateEditInput()` 额外拒绝空数组 [E: packages/coding-agent/src/core/tools/edit.ts:120] [E: packages/coding-agent/src/core/tools/edit.ts:122]。 |
| `edits[].oldText` | `string` | 是 [I] | 无 | 非空, 唯一, 不与其他 edit 重叠 | schema 文案要求 exact text for one targeted replacement, unique in original file, non-overlapping [E: packages/coding-agent/src/core/tools/edit.ts:35] [E: packages/coding-agent/src/core/tools/edit.ts:37]。空 `oldText` 在 diff engine 中被拒绝 [E: packages/coding-agent/src/core/tools/edit-diff.ts:314] [E: packages/coding-agent/src/core/tools/edit-diff.ts:316]。 |
| `edits[].newText` | `string` | 是 [I] | 无 | 可为空字符串 [I] | replacement text; schema 只要求 string, 没有非空检查 [E: packages/coding-agent/src/core/tools/edit.ts:39]。 |

Public schema 不含 legacy 顶层 `oldText`/`newText`; regression test 直接断言 `definition.parameters.properties` 没有这两个字段 [E: packages/coding-agent/test/edit-tool-legacy-input.test.ts:21] [E: packages/coding-agent/test/edit-tool-legacy-input.test.ts:24]。兼容层仍在 `prepareArguments`: 如果模型或旧 session 传入 top-level `oldText` 与 `newText`, 它们会被折叠或追加进 `edits[]` [E: packages/coding-agent/src/core/tools/edit.ts:109] [E: packages/coding-agent/src/core/tools/edit.ts:117]。同一个 shim 还会尝试把字符串形式的 `edits` JSON parse 成 array, 这是为部分模型把 `edits` 发成 JSON string 的情况准备的 [E: packages/coding-agent/src/core/tools/edit.ts:102] [E: packages/coding-agent/src/core/tools/edit.ts:105]。

## 4 输出 & diff

成功时 `execute()` 返回一条 text content: `Successfully replaced ${edits.length} block(s) in ${path}.` [E: packages/coding-agent/src/core/tools/edit.ts:352] [E: packages/coding-agent/src/core/tools/edit.ts:356]。structured details 类型是 `EditToolDetails`, 包含 display-oriented `diff`、standard unified `patch` 和可选 `firstChangedLine` [E: packages/coding-agent/src/core/tools/edit.ts:63] [E: packages/coding-agent/src/core/tools/edit.ts:65] [E: packages/coding-agent/src/core/tools/edit.ts:67]。

`diff` 由 `generateDiffString(baseContent, newContent)` 生成, 默认 contextLines 是 4, 并返回第一个新文件 changed line [E: packages/coding-agent/src/core/tools/edit-diff.ts:380] [E: packages/coding-agent/src/core/tools/edit-diff.ts:384] [E: packages/coding-agent/src/core/tools/edit-diff.ts:396]。display diff 会折叠大段未改内容为 `...`; multi-edit 大 gap 的测试断言 diff 包含三个 changed lines、包含 `...`、不包含远处未改行, 且总行数小于 50 [E: packages/coding-agent/test/tools.test.ts:341] [E: packages/coding-agent/test/tools.test.ts:361]。

`patch` 由 `generateUnifiedPatch(path, baseContent, newContent)` 生成, 默认 contextLines 也是 4, 底层调用 `Diff.createTwoFilesPatch` [E: packages/coding-agent/src/core/tools/edit-diff.ts:369] [E: packages/coding-agent/src/core/tools/edit-diff.ts:370] [E: packages/coding-agent/src/core/tools/edit-diff.ts:371]。测试确认 result details 的 patch 包含 unified patch headers/hunk, 且 `applyPatch(originalContent, result.details.patch)` 能得到编辑后的内容 [E: packages/coding-agent/test/tools.test.ts:278] [E: packages/coding-agent/test/tools.test.ts:283]。

`edit` 没有 `fullOutputPath` 或 bytes/lines truncation 选项; 它控制输出体积的方式是 display diff 的 context collapse, 而不是把完整输出 spill 到文件 [I]。`EditToolDetails` 的字段列表只有 `diff`、`patch`、`firstChangedLine` 三个字段 [E: packages/coding-agent/src/core/tools/edit.ts:63] [E: packages/coding-agent/src/core/tools/edit.ts:65] [E: packages/coding-agent/src/core/tools/edit.ts:67]。

## 5 执行模式

`createEditToolDefinition` 的 returned object 设置了 `parameters`、`renderShell: "self"` 和 `prepareArguments`, 未出现 `executionMode` 字段 [E: packages/coding-agent/src/core/tools/edit.ts:305] [E: packages/coding-agent/src/core/tools/edit.ts:306] [E: packages/coding-agent/src/core/tools/edit.ts:307] [I]。`ToolDefinition.executionMode` 是可选字段; `edit` 省略它时不会触发 agent-loop 的 per-tool sequential branch [E: packages/coding-agent/src/core/extensions/types.ts:461] [E: packages/agent/src/agent-loop.ts:381] [E: packages/agent/src/agent-loop.ts:382] [E: packages/agent/src/agent-loop.ts:384] [E: packages/agent/src/agent-loop.ts:387]。agent 的全局默认 `toolExecution` 是 `"parallel"` [E: packages/agent/src/agent.ts:218]。

因此, `edit` 不是靠 per-tool `executionMode: "sequential"` 阻止并发 [I]。agent-loop 只有在全局 sequential 或 batch 中存在某个 `executionMode === "sequential"` 的 tool call 时才切到 sequential, 否则走 parallel 执行路径 [E: packages/agent/src/agent-loop.ts:381] [E: packages/agent/src/agent-loop.ts:382] [E: packages/agent/src/agent-loop.ts:384] [E: packages/agent/src/agent-loop.ts:385] [E: packages/agent/src/agent-loop.ts:387]。同文件写入安全由 `withFileMutationQueue(absolutePath, ...)` 提供; 不同文件仍可并行这一点由 queue 单测覆盖 [E: packages/coding-agent/src/core/tools/edit.ts:312] [E: packages/coding-agent/test/file-mutation-queue.test.ts:56] [E: packages/coding-agent/test/file-mutation-queue.test.ts:74]。

## 6 注册与装配

`AgentSessionConfig.initialActiveToolNames` 可覆盖初始 active tool names; 未覆盖时 `_buildRuntime()` 使用 `["read", "bash", "edit", "write"]` 作为默认 active built-ins [E: packages/coding-agent/src/core/agent-session.ts:173] [E: packages/coding-agent/src/core/agent-session.ts:2447] [E: packages/coding-agent/src/core/agent-session.ts:2449]。constructor 保存 allowlist/denylist/initial active names 后立即调用 `_buildRuntime({ activeToolNames, includeAllExtensionTools: true })` [E: packages/coding-agent/src/core/agent-session.ts:345] [E: packages/coding-agent/src/core/agent-session.ts:356] [E: packages/coding-agent/src/core/agent-session.ts:358]。

`_buildRuntime()` 默认调用 `createAllToolDefinitions(this._cwd, { read: { autoResizeImages }, bash: { commandPrefix, shellPath } })`, 其中没有给 `edit` 注入特殊 options, 所以内置 `edit` 使用 local filesystem 的 default operations [E: packages/coding-agent/src/core/agent-session.ts:2418] [E: packages/coding-agent/src/core/agent-session.ts:2419] [E: packages/coding-agent/src/core/agent-session.ts:2420] [E: packages/coding-agent/src/core/tools/edit.ts:291]。随后 `_buildRuntime()` 把 object entries 放入 `_baseToolDefinitions`, 创建 `ExtensionRunner`, 绑定扩展, 再用默认 active names `["read", "bash", "edit", "write"]` 刷新 tool registry [E: packages/coding-agent/src/core/agent-session.ts:2423] [E: packages/coding-agent/src/core/agent-session.ts:2424] [E: packages/coding-agent/src/core/agent-session.ts:2434] [E: packages/coding-agent/src/core/agent-session.ts:2449] [E: packages/coding-agent/src/core/agent-session.ts:2451]。

`_refreshToolRegistry()` 会先按 `allowedToolNames`/`excludedToolNames` 过滤 built-in 与 custom tool definitions, 再把 built-ins 和 extension/custom tools 都交给 `wrapRegisteredTools` 包装成 `AgentTool` [E: packages/coding-agent/src/core/agent-session.ts:2313] [E: packages/coding-agent/src/core/agent-session.ts:2325] [E: packages/coding-agent/src/core/agent-session.ts:2327] [E: packages/coding-agent/src/core/agent-session.ts:2361] [E: packages/coding-agent/src/core/agent-session.ts:2362]。`wrapToolDefinition` 会把 `prepareArguments` 与 `executionMode` 原样转发给 agent runtime [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:14] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:15]。

## 7 execute() 走读

1. `execute()` 先用 `validateEditInput()` 取出 `path` 与 `edits`, 并拒绝空 `edits` [E: packages/coding-agent/src/core/tools/edit.ts:308] [E: packages/coding-agent/src/core/tools/edit.ts:309] [E: packages/coding-agent/src/core/tools/edit.ts:120] [E: packages/coding-agent/src/core/tools/edit.ts:122]。
2. `path` 经 `resolveToCwd(path, cwd)` 变成 `absolutePath`, 然后整个 read-modify-write window 包在 `withFileMutationQueue(absolutePath, async () => ...)` 内 [E: packages/coding-agent/src/core/tools/edit.ts:310] [E: packages/coding-agent/src/core/tools/edit.ts:312]。
3. queue 内部定义 `throwIfAborted()` 并在 access/read/apply/write 的 await 边界后调用它; 未注册 abort event listener 这一点只能从该 callback 中的可执行代码缺省推断 [E: packages/coding-agent/src/core/tools/edit.ts:317] [E: packages/coding-agent/src/core/tools/edit.ts:318] [E: packages/coding-agent/src/core/tools/edit.ts:327] [E: packages/coding-agent/src/core/tools/edit.ts:337] [E: packages/coding-agent/src/core/tools/edit.ts:344] [E: packages/coding-agent/src/core/tools/edit.ts:348] [I]。
4. I/O 先执行 `ops.access(absolutePath)`, 再 `ops.readFile(absolutePath)`, default operations 分别是 `fsAccess(path, constants.R_OK | constants.W_OK)`、`fsReadFile`、`fsWriteFile(..., "utf-8")` [E: packages/coding-agent/src/core/tools/edit.ts:84] [E: packages/coding-agent/src/core/tools/edit.ts:85] [E: packages/coding-agent/src/core/tools/edit.ts:86] [E: packages/coding-agent/src/core/tools/edit.ts:325] [E: packages/coding-agent/src/core/tools/edit.ts:335]。
5. 内容处理会 strip UTF-8 BOM、detect original line ending、normalize to LF, 然后调用 `applyEditsToNormalizedContent(normalizedContent, edits, path)` [E: packages/coding-agent/src/core/tools/edit.ts:340] [E: packages/coding-agent/src/core/tools/edit.ts:341] [E: packages/coding-agent/src/core/tools/edit.ts:342] [E: packages/coding-agent/src/core/tools/edit.ts:343]。
6. 写回前会把 `newContent` restore 到原始 line ending, 再把 BOM 拼回去; CRLF 和 BOM preservation 都有测试覆盖 [E: packages/coding-agent/src/core/tools/edit.ts:346] [E: packages/coding-agent/src/core/tools/edit.ts:347] [E: packages/coding-agent/test/tools.test.ts:1146] [E: packages/coding-agent/test/tools.test.ts:1156] [E: packages/coding-agent/test/tools.test.ts:1185] [E: packages/coding-agent/test/tools.test.ts:1195]。
7. 写入成功后, `execute()` 基于同一组 `baseContent/newContent` 生成 display diff 与 unified patch, 并把它们放到 `details` [E: packages/coding-agent/src/core/tools/edit.ts:350] [E: packages/coding-agent/src/core/tools/edit.ts:351] [E: packages/coding-agent/src/core/tools/edit.ts:359]。

`EditOperations` 是 remote execution 的可替换边界: `readFile(absolutePath)`, `writeFile(absolutePath, content)`, `access(absolutePath)` 都可由 `EditToolOptions.operations` 覆盖 [E: packages/coding-agent/src/core/tools/edit.ts:74] [E: packages/coding-agent/src/core/tools/edit.ts:80] [E: packages/coding-agent/src/core/tools/edit.ts:89] [E: packages/coding-agent/src/core/tools/edit.ts:91]。测试用 custom `operations.access` 抛出 `"disk offline"` 并确认错误被透传, 说明替换 operations 会参与正常 execute path [E: packages/coding-agent/test/tools.test.ts:437] [E: packages/coding-agent/test/tools.test.ts:453]。

## 8 EditOperations 与 fuzzy match edge

`applyEditsToNormalizedContent()` 先把每个 edit 的 `oldText/newText` normalize to LF, 再对同一份 original normalized content 计算所有 initial matches [E: packages/coding-agent/src/core/tools/edit-diff.ts:309] [E: packages/coding-agent/src/core/tools/edit-diff.ts:310] [E: packages/coding-agent/src/core/tools/edit-diff.ts:311] [E: packages/coding-agent/src/core/tools/edit-diff.ts:320]。测试明确覆盖了 multi-edit 是 against original file, not incrementally: 第一个 edit 把 `foo\n` 改成 `foo bar\n`, 第二个仍能匹配原文件中的 `bar\n` [E: packages/coding-agent/test/tools.test.ts:364] [E: packages/coding-agent/test/tools.test.ts:371] [E: packages/coding-agent/test/tools.test.ts:372] [E: packages/coding-agent/test/tools.test.ts:376]。

matching 先 exact `content.indexOf(oldText)`, 找不到才把 content 与 oldText 都交给 `normalizeForFuzzyMatch` 再查找 [E: packages/coding-agent/src/core/tools/edit-diff.ts:206] [E: packages/coding-agent/src/core/tools/edit-diff.ts:208] [E: packages/coding-agent/src/core/tools/edit-diff.ts:220] [E: packages/coding-agent/src/core/tools/edit-diff.ts:221] [E: packages/coding-agent/src/core/tools/edit-diff.ts:222]。`normalizeForFuzzyMatch()` 做 NFKC normalization、逐行 `trimEnd()`、smart quotes to ASCII、Unicode dashes/hyphens to `-`、special spaces to regular space [E: packages/coding-agent/src/core/tools/edit-diff.ts:33] [E: packages/coding-agent/src/core/tools/edit-diff.ts:36] [E: packages/coding-agent/src/core/tools/edit-diff.ts:39] [E: packages/coding-agent/src/core/tools/edit-diff.ts:42] [E: packages/coding-agent/src/core/tools/edit-diff.ts:44] [E: packages/coding-agent/src/core/tools/edit-diff.ts:48] [E: packages/coding-agent/src/core/tools/edit-diff.ts:52]。fuzzy 行为由测试覆盖 trailing whitespace、中文全角标点、compatibility Unicode、smart quotes、Unicode dashes、NBSP、多 edit fuzzy replacement [E: packages/coding-agent/test/tools.test.ts:906] [E: packages/coding-agent/test/tools.test.ts:922] [E: packages/coding-agent/test/tools.test.ts:936] [E: packages/coding-agent/test/tools.test.ts:950] [E: packages/coding-agent/test/tools.test.ts:966] [E: packages/coding-agent/test/tools.test.ts:982] [E: packages/coding-agent/test/tools.test.ts:998] [E: packages/coding-agent/test/tools.test.ts:1054]。

duplicate detection 也在 fuzzy-normalized space 中进行: `countOccurrences()` normalize content 和 oldText 后用 `split` 计数, 若 occurrences > 1 就抛 duplicate error [E: packages/coding-agent/src/core/tools/edit-diff.ts:251] [E: packages/coding-agent/src/core/tools/edit-diff.ts:252] [E: packages/coding-agent/src/core/tools/edit-diff.ts:254] [E: packages/coding-agent/src/core/tools/edit-diff.ts:332] [E: packages/coding-agent/src/core/tools/edit-diff.ts:334]。测试覆盖了普通 duplicate、fuzzy-normalized duplicate、CRLF/LF variant duplicate [E: packages/coding-agent/test/tools.test.ts:310] [E: packages/coding-agent/test/tools.test.ts:320] [E: packages/coding-agent/test/tools.test.ts:1041] [E: packages/coding-agent/test/tools.test.ts:1051] [E: packages/coding-agent/test/tools.test.ts:1172] [E: packages/coding-agent/test/tools.test.ts:1182]。

overlap detection 在所有 matches 按 `matchIndex` 排序后进行: 当前一个 replacement 的 end offset 大于当前 replacement start offset 时抛错, 要求 merge them into one edit or target disjoint regions [E: packages/coding-agent/src/core/tools/edit-diff.ts:345] [E: packages/coding-agent/src/core/tools/edit-diff.ts:349] [E: packages/coding-agent/src/core/tools/edit-diff.ts:351]。测试覆盖 overlapping multi-edit 被拒绝, 以及任一 edit 失败时不会 partial apply 已匹配的其他 edit [E: packages/coding-agent/test/tools.test.ts:391] [E: packages/coding-agent/test/tools.test.ts:403] [E: packages/coding-agent/test/tools.test.ts:406] [E: packages/coding-agent/test/tools.test.ts:421]。

当任一 edit 使用 fuzzy match 时, replacement 在 fuzzy-normalized content space 中计算, 然后用 `applyReplacementsPreservingUnchangedLines()` 把 touched line blocks overlay 回 original normalized content, 未触碰行保留原字节形态 [E: packages/coding-agent/src/core/tools/edit-diff.ts:321] [E: packages/coding-agent/src/core/tools/edit-diff.ts:322] [E: packages/coding-agent/src/core/tools/edit-diff.ts:357] [E: packages/coding-agent/src/core/tools/edit-diff.ts:358] [E: packages/coding-agent/src/core/tools/edit-diff.ts:131] [E: packages/coding-agent/src/core/tools/edit-diff.ts:158] [E: packages/coding-agent/src/core/tools/edit-diff.ts:162] [E: packages/coding-agent/src/core/tools/edit-diff.ts:169]。测试覆盖 fuzzy multi-edit 保留 untouched trailing spaces, 并确认 generated patch 仍可 apply 到 original content [E: packages/coding-agent/test/tools.test.ts:1084] [E: packages/coding-agent/test/tools.test.ts:1106] [E: packages/coding-agent/test/tools.test.ts:1110] [E: packages/coding-agent/test/tools.test.ts:1117]。

## 9 computeEditsDiff 与 TUI preview

`computeEditsDiff(path, edits, cwd)` 是 preview helper: 它 resolve path、检查 readable access、读取文件、strip BOM、normalize to LF、调用同一个 `applyEditsToNormalizedContent()`, 最后返回 `generateDiffString(baseContent, newContent)`; 该函数体没有写文件调用 [E: packages/coding-agent/src/core/tools/edit-diff.ts:518] [E: packages/coding-agent/src/core/tools/edit-diff.ts:523] [E: packages/coding-agent/src/core/tools/edit-diff.ts:528] [E: packages/coding-agent/src/core/tools/edit-diff.ts:535] [E: packages/coding-agent/src/core/tools/edit-diff.ts:538] [E: packages/coding-agent/src/core/tools/edit-diff.ts:539] [E: packages/coding-agent/src/core/tools/edit-diff.ts:540] [E: packages/coding-agent/src/core/tools/edit-diff.ts:543] [I]。preview access error 不 throw, 而是返回 `{ error: ... }`; 其它 preview 计算错误也被 catch 成 `{ error }` [E: packages/coding-agent/src/core/tools/edit-diff.ts:528] [E: packages/coding-agent/src/core/tools/edit-diff.ts:531] [E: packages/coding-agent/src/core/tools/edit-diff.ts:545]。

TUI render path 中, `renderCall()` 在 `context.argsComplete` 且可解析 preview input 时异步调用 `computeEditsDiff(previewInput.path, previewInput.edits, context.cwd)`, 然后把 preview 存回 call component 并 invalidate render [E: packages/coding-agent/src/core/tools/edit.ts:377] [E: packages/coding-agent/src/core/tools/edit.ts:380] [E: packages/coding-agent/src/core/tools/edit.ts:382] [E: packages/coding-agent/src/core/tools/edit.ts:383]。`renderResult()` 若执行结果里有 `details.diff`, 会把 settled result diff 写回 call component; `formatEditResult()` 只在 result diff 不同于 preview diff 时渲染 result body diff, 从而避免重复渲染同一 diff [E: packages/coding-agent/src/core/tools/edit.ts:397] [E: packages/coding-agent/src/core/tools/edit.ts:400] [E: packages/coding-agent/src/core/tools/edit.ts:404] [E: packages/coding-agent/src/core/tools/edit.ts:221] [E: packages/coding-agent/src/core/tools/edit.ts:222] [E: packages/coding-agent/src/core/tools/edit.ts:223] [E: packages/coding-agent/src/core/tools/edit.ts:422]。TUI regression test 覆盖了大 diff 在 call preview 中展示, result settle 后不 full-redraw, 且 settled render 不显示成功文本 [E: packages/coding-agent/test/edit-tool-no-full-redraw.test.ts:79] [E: packages/coding-agent/test/edit-tool-no-full-redraw.test.ts:122] [E: packages/coding-agent/test/edit-tool-no-full-redraw.test.ts:143] [E: packages/coding-agent/test/edit-tool-no-full-redraw.test.ts:149]。

## 10 file mutation queue 关系

`withFileMutationQueue()` 用 `realpath(resolve(filePath))` 作为 existing file 的 queue key; 若路径不存在且错误是 `ENOENT` 或 `ENOTDIR`, 它退回 resolved absolute path [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:16] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:22]。同一 key 的 mutation 会等待 previous `currentQueue`, `finally` 中 release next, 并在当前 chained queue 仍是 map 最新值时删除 key [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:51] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:52] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:56] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:58]。

queue 的语义是 same file serialize, different files parallel; 单元测试分别断言同一路径顺序为 first start/end 后 second start/end, 不同路径可以交错运行, symlink alias 会共用 realpath queue [E: packages/coding-agent/test/file-mutation-queue.test.ts:38] [E: packages/coding-agent/test/file-mutation-queue.test.ts:53] [E: packages/coding-agent/test/file-mutation-queue.test.ts:56] [E: packages/coding-agent/test/file-mutation-queue.test.ts:74] [E: packages/coding-agent/test/file-mutation-queue.test.ts:77] [E: packages/coding-agent/test/file-mutation-queue.test.ts:97]。

built-in `edit` 与 `write` 共用同一个 queue helper; 扩展文档要求 custom mutating tool 也使用 `withFileMutationQueue()` 加入同一 per-file queue, 因为 tool calls 默认并行, 否则两个工具可能读到同一份旧内容并出现 last write wins [E: packages/coding-agent/docs/extensions.md:1744] [E: packages/coding-agent/docs/extensions.md:1750]。file-mutation-queue test 覆盖了并发两个 `edit` 保留两处修改, 以及 `edit` 与 `write` 共享 queue [E: packages/coding-agent/test/file-mutation-queue.test.ts:101] [E: packages/coding-agent/test/file-mutation-queue.test.ts:128] [E: packages/coding-agent/test/file-mutation-queue.test.ts:131] [E: packages/coding-agent/test/file-mutation-queue.test.ts:173]。

## Sources

- packages/coding-agent/src/core/tools/edit.ts
- packages/coding-agent/src/core/tools/edit-diff.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/tools/file-mutation-queue.ts
- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts
- packages/coding-agent/docs/extensions.md
- packages/coding-agent/test/tools.test.ts
- packages/coding-agent/test/edit-tool-legacy-input.test.ts
- packages/coding-agent/test/file-mutation-queue.test.ts
- packages/coding-agent/test/edit-tool-no-full-redraw.test.ts

## 相关

- [subsys.coding-agent.edit-engine](../../subsystems/coding-agent/edit-engine.md): `edit-diff.ts` 的 diff computation、fuzzy matching 和 patch generation 子系统。
- [subsys.coding-agent.file-mutation-queue](../../subsystems/coding-agent/file-mutation-queue.md): `edit` 与 `write` 共用的 per-file mutation serialization helper。
- [ref.tools-catalog](../../reference/tools-catalog.md): 内置工具 catalog, 用来横向核对 `read/bash/edit/write/grep/find/ls` 的注册面。
