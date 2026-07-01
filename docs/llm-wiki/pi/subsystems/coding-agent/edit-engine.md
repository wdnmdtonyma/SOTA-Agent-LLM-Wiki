---
id: subsys.coding-agent.edit-engine
title: edit diff 与模糊匹配
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/edit-diff.ts
  - packages/coding-agent/src/core/tools/edit.ts
  - packages/coding-agent/src/core/tools/file-mutation-queue.ts
  - packages/coding-agent/src/core/tools/write.ts
  - packages/coding-agent/docs/extensions.md
  - packages/coding-agent/test/tools.test.ts
  - packages/coding-agent/test/edit-tool-legacy-input.test.ts
  - packages/coding-agent/test/file-mutation-queue.test.ts
symbols:
  - computeEditsDiff
  - generateUnifiedPatch
  - normalizeForFuzzyMatch
  - applyEditsToNormalizedContent
  - fuzzyFindText
related:
  - surface.tools.edit
  - subsys.coding-agent.file-mutation-queue
evidence: explicit
status: verified
updated: 8c943640
---

> `edit-engine` 是 pi-coding-agent 的 targeted replacement 子系统: 它把 `oldText -> newText` 编辑转换成一次性匹配、可预览的 diff/patch, 并在必要时用受限 fuzzy normalization 容忍模型容易写错的 Unicode 和行尾差异。

## 能回答的问题

- `edit` 的 fuzzy match 到底容忍哪些差异, 哪些差异仍会失败?
- 多个 `edits[]` 是基于原文件匹配, 还是前一个 replacement 的结果?
- `old_string/new_string` 或 `oldText/newText` legacy 输入怎样进入当前 `edits[]` 模型?
- 多匹配、空 `oldText`、overlap、not found、no-op 分别在哪里报错?
- `computeEditsDiff()` 的 preview 路径和真正写文件的 `execute()` 共用哪些核心逻辑?
- `edit-engine` 与 `file-mutation-queue` 的边界在哪里?

## 职责边界

`packages/coding-agent/src/core/tools/edit-diff.ts` 是本节点的权威实现: 它定义 LF/CRLF/BOM 相关 helper、`normalizeForFuzzyMatch()`、`fuzzyFindText()`、`applyEditsToNormalizedContent()`、display diff、unified patch 和 `computeEditsDiff()` [E: packages/coding-agent/src/core/tools/edit-diff.ts:10] [E: packages/coding-agent/src/core/tools/edit-diff.ts:33] [E: packages/coding-agent/src/core/tools/edit-diff.ts:206] [E: packages/coding-agent/src/core/tools/edit-diff.ts:304] [E: packages/coding-agent/src/core/tools/edit-diff.ts:369] [E: packages/coding-agent/src/core/tools/edit-diff.ts:518]。

`packages/coding-agent/src/core/tools/edit.ts` 负责模型工具外壳: TypeBox schema、legacy 参数兼容、路径解析、read/write I/O、BOM/line-ending preservation、TUI preview 触发和成功结果封装属于工具层, 不属于 `edit-diff.ts` 的纯文本替换算法 [E: packages/coding-agent/src/core/tools/edit.ts:33] [E: packages/coding-agent/src/core/tools/edit.ts:94] [E: packages/coding-agent/src/core/tools/edit.ts:287] [E: packages/coding-agent/src/core/tools/edit.ts:308] [I]。

`packages/coding-agent/src/core/tools/file-mutation-queue.ts` 只串行化文件 mutation window, 不参与 fuzzy matching、diff 生成或 replacement offset 计算 [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:32] [E: packages/coding-agent/src/core/tools/edit.ts:312] [I]。内置 `write` 也调用同一个 queue helper, 因此 `edit` 和 `write` 针对同一文件会共享 per-file serialization 边界 [E: packages/coding-agent/src/core/tools/write.ts:203]。

## 关键文件

- `packages/coding-agent/src/core/tools/edit-diff.ts`: replacement matching、fuzzy normalization、multi-edit conflict detection、display diff、unified patch、preview-only `computeEditsDiff()` [E: packages/coding-agent/src/core/tools/edit-diff.ts:304] [E: packages/coding-agent/src/core/tools/edit-diff.ts:380] [E: packages/coding-agent/src/core/tools/edit-diff.ts:518]。
- `packages/coding-agent/src/core/tools/edit.ts`: `edit` tool schema 和 execution path, 包括 legacy `oldText/newText` folding、`withFileMutationQueue()` 包裹和 `computeEditsDiff()` TUI preview 调用 [E: packages/coding-agent/src/core/tools/edit.ts:44] [E: packages/coding-agent/src/core/tools/edit.ts:109] [E: packages/coding-agent/src/core/tools/edit.ts:312] [E: packages/coding-agent/src/core/tools/edit.ts:380]。
- `packages/coding-agent/src/core/tools/file-mutation-queue.ts`: 同一路径 key 的 mutation promise chaining, existing path 经 `realpath(resolve(filePath))`, missing path 退回 resolved absolute path [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:17] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:19] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:22] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:41]。
- `packages/coding-agent/test/tools.test.ts`: edit engine 的行为回归测试, 覆盖 multi-edit、not-found、duplicates、overlap、fuzzy normalization、CRLF 和 BOM preservation [E: packages/coding-agent/test/tools.test.ts:323] [E: packages/coding-agent/test/tools.test.ts:286] [E: packages/coding-agent/test/tools.test.ts:310] [E: packages/coding-agent/test/tools.test.ts:391] [E: packages/coding-agent/test/tools.test.ts:906] [E: packages/coding-agent/test/tools.test.ts:1133] [E: packages/coding-agent/test/tools.test.ts:1195]。
- `packages/coding-agent/test/file-mutation-queue.test.ts`: queue 与 built-in `edit`/`write` 的并发语义测试 [E: packages/coding-agent/test/file-mutation-queue.test.ts:38] [E: packages/coding-agent/test/file-mutation-queue.test.ts:122] [E: packages/coding-agent/test/file-mutation-queue.test.ts:170] [E: packages/coding-agent/test/file-mutation-queue.test.ts:173]。

## 数据模型与函数

`Edit` 是 edit engine 的最小替换模型: `oldText` 是要定位的原文本, `newText` 是 replacement 文本 [E: packages/coding-agent/src/core/tools/edit-diff.ts:191] [E: packages/coding-agent/src/core/tools/edit-diff.ts:192]。`EditToolInput` 的 public schema 不暴露顶层 `oldText/newText`; schema 只有 `path` 和 `edits`, `edits[]` element 只有 `oldText` 与 `newText` [E: packages/coding-agent/src/core/tools/edit.ts:33] [E: packages/coding-agent/src/core/tools/edit.ts:47] [E: packages/coding-agent/src/core/tools/edit.ts:55]。legacy 顶层 `oldText/newText` 会在 `prepareEditArguments()` 中折叠或追加到 `edits[]`, 同时字符串形式的 `edits` 会尝试 JSON parse 成 array [E: packages/coding-agent/src/core/tools/edit.ts:102] [E: packages/coding-agent/src/core/tools/edit.ts:115] [E: packages/coding-agent/test/edit-tool-legacy-input.test.ts:21] [E: packages/coding-agent/test/edit-tool-legacy-input.test.ts:40]。

用户口语里的 `old_string/new_string` 在当前源码中对应 `oldText/newText`, 不是 public schema 字段名 [I]。当前 `prepareEditArguments()` 只检查顶层 `oldText/newText`, 测试也只覆盖这两个 legacy 字段的 folding; 因此若外部 harness 仍发送 `old_string/new_string`, 当前 shim 不会把它们折叠进 `edits[]` [E: packages/coding-agent/src/core/tools/edit.ts:109] [E: packages/coding-agent/src/core/tools/edit.ts:115] [E: packages/coding-agent/test/edit-tool-legacy-input.test.ts:27] [I]。

`FuzzyMatchResult` 记录匹配是否存在、起始 offset、匹配长度、是否使用 fuzzy matching, 以及替换时应使用的 content space [E: packages/coding-agent/src/core/tools/edit-diff.ts:176] [E: packages/coding-agent/src/core/tools/edit-diff.ts:178] [E: packages/coding-agent/src/core/tools/edit-diff.ts:180] [E: packages/coding-agent/src/core/tools/edit-diff.ts:182] [E: packages/coding-agent/src/core/tools/edit-diff.ts:187]。exact match 时 `contentForReplacement` 是原 content; fuzzy match 时 `fuzzyFindText()` 返回 normalized content 的 offset 和 normalized old text 长度 [E: packages/coding-agent/src/core/tools/edit-diff.ts:208] [E: packages/coding-agent/src/core/tools/edit-diff.ts:215] [E: packages/coding-agent/src/core/tools/edit-diff.ts:237] [E: packages/coding-agent/src/core/tools/edit-diff.ts:242]。

`AppliedEditsResult` 返回 `baseContent` 和 `newContent`, 供 execute path 同时生成 display diff 与 unified patch [E: packages/coding-agent/src/core/tools/edit-diff.ts:196] [E: packages/coding-agent/src/core/tools/edit-diff.ts:197] [E: packages/coding-agent/src/core/tools/edit.ts:343] [E: packages/coding-agent/src/core/tools/edit.ts:350]。`computeEditsDiff()` 返回 `EditDiffResult | EditDiffError`, preview 失败时返回 `{ error }` 而不是 throw 给 renderer [E: packages/coding-agent/src/core/tools/edit-diff.ts:522] [E: packages/coding-agent/src/core/tools/edit-diff.ts:545]。

## 控制流

1. `createEditToolDefinition@packages/coding-agent/src/core/tools/edit.ts:287` 注册 `prepareArguments`, 所以 raw tool-call args 先进 `prepareEditArguments()` 做 legacy folding 和 stringified `edits` 解析 [E: packages/coding-agent/src/core/tools/edit.ts:94] [E: packages/coding-agent/src/core/tools/edit.ts:307]。
2. `execute@packages/coding-agent/src/core/tools/edit.ts:308` 调 `validateEditInput()`, 拒绝空 `edits`, 用 `resolveToCwd(path, cwd)` 得到 `absolutePath`, 再把整个 access/read/compute/write window 包进 `withFileMutationQueue(absolutePath, ...)` [E: packages/coding-agent/src/core/tools/edit.ts:120] [E: packages/coding-agent/src/core/tools/edit.ts:310] [E: packages/coding-agent/src/core/tools/edit.ts:312]。
3. queue 内 `execute()` 先调用 `ops.access()`（默认实现检查 readable+writable）, 再读取 buffer, strip BOM, detect original line ending, normalize content to LF [E: packages/coding-agent/src/core/tools/edit.ts:86] [E: packages/coding-agent/src/core/tools/edit.ts:325] [E: packages/coding-agent/src/core/tools/edit.ts:335] [E: packages/coding-agent/src/core/tools/edit.ts:340] [E: packages/coding-agent/src/core/tools/edit.ts:342]。
4. `applyEditsToNormalizedContent@packages/coding-agent/src/core/tools/edit-diff.ts:304` 先把每个 edit 的 `oldText/newText` normalize to LF, 再拒绝空 `oldText` [E: packages/coding-agent/src/core/tools/edit-diff.ts:309] [E: packages/coding-agent/src/core/tools/edit-diff.ts:315]。
5. 同一个函数先对所有 edits 在原始 normalized content 上做 initial fuzzy/exact match, 然后只要任一 edit 用到 fuzzy match, replacement base 就切换为 `normalizeForFuzzyMatch(normalizedContent)` [E: packages/coding-agent/src/core/tools/edit-diff.ts:320] [E: packages/coding-agent/src/core/tools/edit-diff.ts:322]。
6. 每个 edit 再对 replacement base 调 `fuzzyFindText()`, not found 抛 not-found error, fuzzy-normalized occurrence count 大于 1 抛 duplicate error [E: packages/coding-agent/src/core/tools/edit-diff.ts:327] [E: packages/coding-agent/src/core/tools/edit-diff.ts:334]。
7. 所有 matched edits 按 `matchIndex` 排序; 若前一个 match 的 end offset 大于当前 start offset, 引擎抛 overlap error, 要求合并成一个 edit 或 targeting disjoint regions [E: packages/coding-agent/src/core/tools/edit-diff.ts:345] [E: packages/coding-agent/src/core/tools/edit-diff.ts:351]。
8. 未使用 fuzzy match 时, 引擎直接在 replacement base 上倒序 `applyReplacements()`; 使用 fuzzy match 时, 引擎调用 `applyReplacementsPreservingUnchangedLines()` 把 touched line blocks overlay 回原始 normalized content, 未触碰行从 original content 复制回来 [E: packages/coding-agent/src/core/tools/edit-diff.ts:110] [E: packages/coding-agent/src/core/tools/edit-diff.ts:131] [E: packages/coding-agent/src/core/tools/edit-diff.ts:357] [E: packages/coding-agent/src/core/tools/edit-diff.ts:359]。
9. 若 `baseContent === newContent`, 引擎抛 no-change error; 否则 execute path restore 原 line ending、拼回 BOM、写文件, 再生成 display diff 和 unified patch [E: packages/coding-agent/src/core/tools/edit-diff.ts:361] [E: packages/coding-agent/src/core/tools/edit.ts:346] [E: packages/coding-agent/src/core/tools/edit.ts:351]。
10. `computeEditsDiff@packages/coding-agent/src/core/tools/edit-diff.ts:518` 走 preview-only 路径: resolve path, readable access, read file, strip BOM, normalize to LF, 调同一个 `applyEditsToNormalizedContent()`, 最后返回 `generateDiffString()`; 该函数体内未出现 write 调用 [E: packages/coding-agent/src/core/tools/edit-diff.ts:523] [E: packages/coding-agent/src/core/tools/edit-diff.ts:528] [E: packages/coding-agent/src/core/tools/edit-diff.ts:535] [E: packages/coding-agent/src/core/tools/edit-diff.ts:540] [E: packages/coding-agent/src/core/tools/edit-diff.ts:543] [I]。

## fuzzy match 与 normalize 规则

`fuzzyFindText()` 总是先做 exact `content.indexOf(oldText)`, exact 命中时不会进入 fuzzy normalization [E: packages/coding-agent/src/core/tools/edit-diff.ts:208] [E: packages/coding-agent/src/core/tools/edit-diff.ts:214]。测试覆盖了 exact match 优先, 文件中有 exact target 时只改 exact target [E: packages/coding-agent/test/tools.test.ts:1014] [E: packages/coding-agent/test/tools.test.ts:1026]。

`normalizeForFuzzyMatch()` 做 NFKC normalization、逐行 `trimEnd()`、smart single quotes to ASCII quote、smart double quotes to ASCII quote、Unicode dash/hyphen variants to `-`、special Unicode spaces to regular space [E: packages/coding-agent/src/core/tools/edit-diff.ts:36] [E: packages/coding-agent/src/core/tools/edit-diff.ts:39] [E: packages/coding-agent/src/core/tools/edit-diff.ts:42] [E: packages/coding-agent/src/core/tools/edit-diff.ts:44] [E: packages/coding-agent/src/core/tools/edit-diff.ts:48] [E: packages/coding-agent/src/core/tools/edit-diff.ts:52]。测试分别覆盖 trailing whitespace、中文全角标点/compatibility forms、smart quotes、Unicode dashes、NBSP 和 multi-edit fuzzy replacement [E: packages/coding-agent/test/tools.test.ts:906] [E: packages/coding-agent/test/tools.test.ts:922] [E: packages/coding-agent/test/tools.test.ts:936] [E: packages/coding-agent/test/tools.test.ts:950] [E: packages/coding-agent/test/tools.test.ts:982] [E: packages/coding-agent/test/tools.test.ts:998] [E: packages/coding-agent/test/tools.test.ts:1054]。

换行 normalization 分两层: `edit.ts` 先把文件内容 normalize to LF, `applyEditsToNormalizedContent()` 再把每个 edit 的 `oldText/newText` normalize to LF [E: packages/coding-agent/src/core/tools/edit.ts:342] [E: packages/coding-agent/src/core/tools/edit-diff.ts:309]。写回时 `restoreLineEndings()` 根据原文件 first line ending 选择 CRLF 或 LF, 因此 LF `oldText` 可以匹配 CRLF 文件, 但写回仍保留 CRLF [E: packages/coding-agent/src/core/tools/edit.ts:341] [E: packages/coding-agent/src/core/tools/edit.ts:346] [E: packages/coding-agent/test/tools.test.ts:1133] [E: packages/coding-agent/test/tools.test.ts:1156]。

fuzzy duplicate detection 同样在 normalized space 里进行: `countOccurrences()` 先 normalize content 和 `oldText`, 再用 `split(fuzzyOldText).length - 1` 计数 [E: packages/coding-agent/src/core/tools/edit-diff.ts:252] [E: packages/coding-agent/src/core/tools/edit-diff.ts:253] [E: packages/coding-agent/src/core/tools/edit-diff.ts:254]。这意味着两个原文片段只要 normalize 后相同, 即使字节不同也会触发 duplicate error; 测试覆盖 trailing-space duplicate 和 CRLF/LF variant duplicate [E: packages/coding-agent/test/tools.test.ts:1041] [E: packages/coding-agent/test/tools.test.ts:1051] [E: packages/coding-agent/test/tools.test.ts:1172] [E: packages/coding-agent/test/tools.test.ts:1182]。

## 多匹配与错误语义

not found 错误区分单 edit 和 multi-edit: 单 edit 文案说 `Could not find the exact text`, multi-edit 文案定位到 `edits[index]` [E: packages/coding-agent/src/core/tools/edit-diff.ts:260] [E: packages/coding-agent/src/core/tools/edit-diff.ts:264]。测试覆盖找不到文本时抛 not-found, preview missing file 时返回 error object 而不是 throw [E: packages/coding-agent/test/tools.test.ts:286] [E: packages/coding-agent/test/tools.test.ts:296] [E: packages/coding-agent/test/tools.test.ts:456] [E: packages/coding-agent/test/tools.test.ts:460]。

duplicate 错误要求 `oldText` 唯一: 单 edit 文案包含 occurrence count, multi-edit 文案定位到 `edits[index]`, 并提示提供更多 context [E: packages/coding-agent/src/core/tools/edit-diff.ts:271] [E: packages/coding-agent/src/core/tools/edit-diff.ts:275]。测试覆盖同一文件中 `"foo"` 出现 3 次时 edit 失败 [E: packages/coding-agent/test/tools.test.ts:310] [E: packages/coding-agent/test/tools.test.ts:320]。

overlap 错误只在所有 matches 已经找到并排序后判断, 因此一个 multi-edit 调用不会先写入部分成功 edit 再发现后续冲突 [E: packages/coding-agent/src/core/tools/edit-diff.ts:324] [E: packages/coding-agent/src/core/tools/edit-diff.ts:345] [I]。测试同时覆盖 overlap 被拒绝和任一 edit 失败时文件保持 original content [E: packages/coding-agent/test/tools.test.ts:391] [E: packages/coding-agent/test/tools.test.ts:403] [E: packages/coding-agent/test/tools.test.ts:406] [E: packages/coding-agent/test/tools.test.ts:421]。

no-op 错误在 replacement 计算完成后比较 `baseContent` 与 `newContent`; 这能捕捉 replacement 文本与原文本最终相同的情况, 包括 fuzzy normalization 造成的“看似匹配但写回无变化” [E: packages/coding-agent/src/core/tools/edit-diff.ts:361] [E: packages/coding-agent/src/core/tools/edit-diff.ts:362] [I]。

## 设计动机与权衡

多 edit 选择“全部基于原文件匹配, 最后统一倒序应用”, 避免前一个 replacement 改变后一个 edit 的匹配语义 [E: packages/coding-agent/src/core/tools/edit-diff.ts:320] [E: packages/coding-agent/src/core/tools/edit-diff.ts:345] [E: packages/coding-agent/src/core/tools/edit-diff.ts:112] [E: packages/coding-agent/src/core/tools/edit-diff.ts:359] [I]。测试明确覆盖第一个 edit 把 `foo` 改成 `foo bar` 后, 第二个 edit 仍匹配原文件里的 `bar` [E: packages/coding-agent/test/tools.test.ts:364] [E: packages/coding-agent/test/tools.test.ts:376]。

fuzzy normalization 是有意受限的: 它只处理模型常见的 Unicode compatibility、smart quote、dash、space 和 trailing whitespace 差异, 不做近似编辑距离或 AST-aware patching [E: packages/coding-agent/src/core/tools/edit-diff.ts:36] [E: packages/coding-agent/src/core/tools/edit-diff.ts:52] [I]。这个权衡保持 replacement 仍是 deterministic substring match, 同时缓解复制文本里的不可见/兼容字符问题 [I]。

fuzzy replacement 使用 line-block overlay 而不是把整份 normalized content 写回, 是为了保留未触碰行的原字节形态, 例如 trailing spaces [E: packages/coding-agent/src/core/tools/edit-diff.ts:136] [E: packages/coding-agent/src/core/tools/edit-diff.ts:169] [E: packages/coding-agent/src/core/tools/edit-diff.ts:171]。测试覆盖 fuzzy multi-edit 后未触碰行保留 trailing spaces, 且生成的 unified patch 仍可 apply 到 original content [E: packages/coding-agent/test/tools.test.ts:1084] [E: packages/coding-agent/test/tools.test.ts:1117]。

diff preview 和真实写文件共用 `applyEditsToNormalizedContent()`, 因此 UI 预览的匹配、duplicate、overlap 和 no-op 语义应与 execute path 一致 [E: packages/coding-agent/src/core/tools/edit-diff.ts:540] [E: packages/coding-agent/src/core/tools/edit.ts:343] [I]。两条路径的边界差异是 preview 只要求 readable access 并返回 `{ error }`, execute 要 readable+writable access 并写回文件 [E: packages/coding-agent/src/core/tools/edit-diff.ts:528] [E: packages/coding-agent/src/core/tools/edit-diff.ts:545] [E: packages/coding-agent/src/core/tools/edit.ts:325] [E: packages/coding-agent/src/core/tools/edit.ts:347]。

## gotcha

- Public schema 是 `edits[]`, 不是顶层 `oldText/newText`; legacy 顶层 `oldText/newText` 只靠 `prepareArguments` shim 兼容, 测试明确要求它们不在 schema properties 中 [E: packages/coding-agent/test/edit-tool-legacy-input.test.ts:23] [E: packages/coding-agent/test/edit-tool-legacy-input.test.ts:24]。
- `oldText` 必须非空且唯一; fuzzy normalization 后的重复也算重复, 所以视觉上不同但 normalize 后相同的片段会报 duplicate [E: packages/coding-agent/src/core/tools/edit-diff.ts:315] [E: packages/coding-agent/src/core/tools/edit-diff.ts:332]。
- 多 edit 不支持 overlap 或 nested edits; 两个变更 touching 同一块时应合并成一个 edit, 这既是 schema description 也是运行时 overlap check 的要求 [E: packages/coding-agent/src/core/tools/edit.ts:49] [E: packages/coding-agent/src/core/tools/edit-diff.ts:351]。
- fuzzy matching 一旦被任一 edit 触发, 所有 replacement matching 都在 fuzzy-normalized base content 上重新执行, 这会让 duplicate 检测和 offset 都基于 normalized space [E: packages/coding-agent/src/core/tools/edit-diff.ts:321] [E: packages/coding-agent/src/core/tools/edit-diff.ts:322] [E: packages/coding-agent/src/core/tools/edit-diff.ts:327] [I]。
- `computeEditsDiff()` 不进入 `withFileMutationQueue()`, 因为它只读文件并生成 preview; 真正的 write path 才在 `edit.ts` 中包 queue [E: packages/coding-agent/src/core/tools/edit-diff.ts:518] [E: packages/coding-agent/src/core/tools/edit.ts:312] [I]。
- `ToolDefinition` 支持可选 per-tool `executionMode`; agent-core 默认 tool execution 是 parallel, agent loop 仅在全局 sequential 或任一 tool 标记 sequential 时顺序执行。`createEditToolDefinition()` 返回对象中未看到 `executionMode` override, 所以同文件安全依赖 per-file queue 而不是全局顺序执行 [E: packages/coding-agent/src/core/extensions/types.ts:461] [E: packages/agent/src/agent.ts:218] [E: packages/agent/src/agent-loop.ts:384] [E: packages/agent/src/agent-loop.ts:387] [I]。

## 跨包边界

`edit-engine` 属于 `pi-coding-agent`, 但工具调用批次由 `pi-agent-core` 的 agent loop 调度; agent loop 只有在全局 sequential 或 tool `executionMode === "sequential"` 时才顺序执行, 否则走 parallel execution [E: packages/agent/src/agent-loop.ts:381] [E: packages/agent/src/agent-loop.ts:387]。这解释了为什么 `edit` 需要 per-file queue: 它不能假设同一 assistant turn 内只有一个 mutating tool 在运行 [I]。

[surface.tools.edit](../../surface/tools/edit.md) 是模型可见工具面的权威节点: 它覆盖 wire name、schema 表、注册装配、renderer 和 execute path。本文只详写 `edit-diff.ts` 的 matching/diff 算法, 并在必要处引用 `edit.ts` 说明入口边界 [I]。

[subsys.coding-agent.file-mutation-queue](file-mutation-queue.md) 是 per-file mutation serialization 的权威节点: `edit` 与 `write` 都把真实 mutation window 包进 `withFileMutationQueue()`, extension 文档也要求自定义 mutating tool 参与同一个 queue, 因为默认并行 tool calls 可能同时读取旧内容并导致 last-write-wins [E: packages/coding-agent/src/core/tools/edit.ts:312] [E: packages/coding-agent/src/core/tools/write.ts:203] [E: packages/coding-agent/docs/extensions.md:1744] [E: packages/coding-agent/docs/extensions.md:1750]。

## Sources

- packages/coding-agent/src/core/tools/edit-diff.ts
- packages/coding-agent/src/core/tools/edit.ts
- packages/coding-agent/src/core/tools/file-mutation-queue.ts
- packages/coding-agent/src/core/tools/write.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts
- packages/coding-agent/docs/extensions.md
- packages/coding-agent/test/tools.test.ts
- packages/coding-agent/test/edit-tool-legacy-input.test.ts
- packages/coding-agent/test/file-mutation-queue.test.ts

## 相关

- [surface.tools.edit](../../surface/tools/edit.md): 模型可见 `edit` tool 的 schema、注册装配、renderer 和 execute path。
- [subsys.coding-agent.file-mutation-queue](file-mutation-queue.md): `edit` 与 `write` 共用的 per-file mutation serialization helper。
