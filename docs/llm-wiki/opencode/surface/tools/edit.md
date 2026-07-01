---
id: tool.edit
title: Edit 工具
kind: tool
tier: T1
v: shared
source: [packages/opencode/src/tool/edit.ts, packages/core/src/tool/edit.ts]
symbols: [EditTool, SimpleReplacer, LineTrimmedReplacer, BlockAnchorReplacer, WhitespaceNormalizedReplacer, IndentationFlexibleReplacer, EscapeNormalizedReplacer, TrimmedBoundaryReplacer, ContextAwareReplacer, MultiOccurrenceReplacer]
related: [execution.patch-v1, ref.tool-catalog]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Edit 工具负责在单个文件内把 `oldString` 替换成 `newString`；V1 是当前活跑的 fuzzy edit 工具，V2 是只做 exact edit 的新内核 leaf。

## 能回答的问题

- V1 Edit 的 9 路 fuzzy replacer 是哪些，阈值是多少？
- V2 Edit 为什么只接受 exact match？
- `oldString === ""` 在 V1 和 V2 的行为有什么差异？
- Edit 权限在 V1 `ctx.ask` 与 V2 `permission.assert` 中分别是什么？
- Edit 如何处理 BOM、换行、format、LSP、watcher event？

## V1

### 1 Identity

V1 `EditTool` 通过 `Tool.define("edit", ...)` 注册，wire name 是 `edit`。[E: packages/opencode/src/tool/edit.ts:58][E: packages/opencode/src/tool/edit.ts:59] `Parameters` 包含 `filePath`、`oldString`、`newString` 和 optional `replaceAll`。[E: packages/opencode/src/tool/edit.ts:47][E: packages/opencode/src/tool/edit.ts:48][E: packages/opencode/src/tool/edit.ts:49][E: packages/opencode/src/tool/edit.ts:50][E: packages/opencode/src/tool/edit.ts:53]

### 2 用途定位

V1 Edit 面向模型做“局部替换”，但实现不是纯 exact match：`replace()` 会按 9 个 replacer 依次尝试直接匹配、行 trim、block anchors、空白归一、缩进、escape 归一、边界 trim、上下文相似、multi occurrence。[E: packages/opencode/src/tool/edit.ts:682][E: packages/opencode/src/tool/edit.ts:694][E: packages/opencode/src/tool/edit.ts:703] 其中 `BlockAnchorReplacer` 对单候选和多候选都使用 0.65 similarity threshold。[E: packages/opencode/src/tool/edit.ts:220][E: packages/opencode/src/tool/edit.ts:221][E: packages/opencode/src/tool/edit.ts:358][E: packages/opencode/src/tool/edit.ts:410]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `filePath` | `string` | 是 | 无 | schema 描述 absolute；execute 接受 relative 并 join 到 instance directory | 目标文件路径。[E: packages/opencode/src/tool/edit.ts:48][E: packages/opencode/src/tool/edit.ts:80][E: packages/opencode/src/tool/edit.ts:82] |
| `oldString` | `string` | 是 | 无 | 必须不同于 `newString`；existing file 中不能为空 | 要替换的文本。[E: packages/opencode/src/tool/edit.ts:49][E: packages/opencode/src/tool/edit.ts:75][E: packages/opencode/src/tool/edit.ts:90] |
| `newString` | `string` | 是 | 无 | 必须不同于 `oldString` | 替换文本。[E: packages/opencode/src/tool/edit.ts:50][E: packages/opencode/src/tool/edit.ts:75] |
| `replaceAll` | `boolean` | 否 | `false` | true 时替换所有找到的 search；false 时要求唯一匹配 | 多处替换开关。[E: packages/opencode/src/tool/edit.ts:53][E: packages/opencode/src/tool/edit.ts:714][E: packages/opencode/src/tool/edit.ts:717] |

### 4 输出 & 大小/截断限制

V1 Edit 返回 `title` 为 worktree-relative path，`output` 默认是 `Edit applied successfully.`，metadata 包含 `diagnostics`、`diff` 和 `filediff`。[E: packages/opencode/src/tool/edit.ts:196][E: packages/opencode/src/tool/edit.ts:203][E: packages/opencode/src/tool/edit.ts:204][E: packages/opencode/src/tool/edit.ts:209] `Tool.define` wrapper 会在 result 没有 `metadata.truncated` 时调用 `Truncate.output` 做通用 2000 行 / 50KB 截断。[E: packages/opencode/src/tool/tool.ts:131][E: packages/opencode/src/tool/tool.ts:135][E: packages/opencode/src/tool/truncate.ts:15][E: packages/opencode/src/tool/truncate.ts:16]

### 5 权限

V1 Edit 在真正写文件前调用 `ctx.ask`，permission 是 `edit`，patterns 是目标相对 worktree 的路径，metadata 带 `filepath` 与 unified diff。[E: packages/opencode/src/tool/edit.ts:145][E: packages/opencode/src/tool/edit.ts:146][E: packages/opencode/src/tool/edit.ts:147][E: packages/opencode/src/tool/edit.ts:149][E: packages/opencode/src/tool/edit.ts:151] 写不存在文件且 `oldString === ""` 的路径同样先生成 diff 并请求 `edit` 权限。[E: packages/opencode/src/tool/edit.ts:90][E: packages/opencode/src/tool/edit.ts:101][E: packages/opencode/src/tool/edit.ts:102]

### 6 execute() 走读

1. V1 Edit 校验 `filePath`、拒绝 `oldString === newString`，resolve path，然后调用 `assertExternalDirectoryEffect`。[E: packages/opencode/src/tool/edit.ts:71][E: packages/opencode/src/tool/edit.ts:75][E: packages/opencode/src/tool/edit.ts:79][E: packages/opencode/src/tool/edit.ts:83]
2. V1 Edit 对每个 `filePath` 使用 process-local `Semaphore`，避免同一文件并发编辑互相覆盖。[E: packages/opencode/src/tool/edit.ts:35][E: packages/opencode/src/tool/edit.ts:37][E: packages/opencode/src/tool/edit.ts:88]
3. 如果 `oldString === ""` 且文件不存在，V1 Edit 会把 `newString` 当新文件内容写入；如果文件已存在则拒绝空 oldString。[E: packages/opencode/src/tool/edit.ts:90][E: packages/opencode/src/tool/edit.ts:91][E: packages/opencode/src/tool/edit.ts:93][E: packages/opencode/src/tool/edit.ts:111]
4. 对 existing file，V1 Edit 读 BOM/text，保持原文件换行风格，把输入的 old/new 转换到该换行风格，再调用 `replace()`。[E: packages/opencode/src/tool/edit.ts:126][E: packages/opencode/src/tool/edit.ts:129][E: packages/opencode/src/tool/edit.ts:130][E: packages/opencode/src/tool/edit.ts:133]
5. 写入后，V1 Edit 调用 formatter；随后发布 `FileSystem.Event.Edited` 和 `Watcher.Event.Updated`。[E: packages/opencode/src/tool/edit.ts:155][E: packages/opencode/src/tool/edit.ts:156][E: packages/opencode/src/tool/edit.ts:159][E: packages/opencode/src/tool/edit.ts:160]
6. 最后触发 LSP touch/diagnostics，如果当前文件有 diagnostic block，则追加到模型输出。[E: packages/opencode/src/tool/edit.ts:197][E: packages/opencode/src/tool/edit.ts:198][E: packages/opencode/src/tool/edit.ts:200][E: packages/opencode/src/tool/edit.ts:201]

### 7 V1 fuzzy replacer 细节

V1 `replace()` 的顺序是 `SimpleReplacer`、`LineTrimmedReplacer`、`BlockAnchorReplacer`、`WhitespaceNormalizedReplacer`、`IndentationFlexibleReplacer`、`EscapeNormalizedReplacer`、`TrimmedBoundaryReplacer`、`ContextAwareReplacer`、`MultiOccurrenceReplacer`。[E: packages/opencode/src/tool/edit.ts:694][E: packages/opencode/src/tool/edit.ts:703] 这个顺序很重要：`SimpleReplacer` 先做 exact candidate，后续 replacer 才把 whitespace、indentation、escape 或 context fallback 引入。[E: packages/opencode/src/tool/edit.ts:244][E: packages/opencode/src/tool/edit.ts:248][E: packages/opencode/src/tool/edit.ts:288][E: packages/opencode/src/tool/edit.ts:427][E: packages/opencode/src/tool/edit.ts:471][E: packages/opencode/src/tool/edit.ts:499][E: packages/opencode/src/tool/edit.ts:562][E: packages/opencode/src/tool/edit.ts:588][E: packages/opencode/src/tool/edit.ts:548]

V1 Edit 还用 `isDisproportionateMatch` 防止 fuzzy match 命中跨度远大于 `oldString`，触发时要求模型重新 read 并提供完整 exact oldString。[E: packages/opencode/src/tool/edit.ts:709][E: packages/opencode/src/tool/edit.ts:710][E: packages/opencode/src/tool/edit.ts:731][E: packages/opencode/src/tool/edit.ts:734]

## V2

### 1 Identity

V2 `EditTool` 的 name 是 `edit`，注册时使用 `[name]: Tool.withPermission(Tool.make(...), "edit")`。[E: packages/core/src/tool/edit.ts:22][E: packages/core/src/tool/edit.ts:100][E: packages/core/src/tool/edit.ts:101][E: packages/core/src/tool/edit.ts:212] `Tool.withPermission(..., "edit")` 让 registry 在 permission ruleset 过滤时使用 `edit` action，而不是依赖其他别名。[E: packages/core/src/tool/tool.ts:139][E: packages/core/src/tool/tool.ts:144][E: packages/core/src/tool/registry.ts:112][E: packages/core/src/tool/registry.ts:113]

### 2 用途定位

V2 Edit 是 exact-edit leaf：description 字段明确写 “Replace exact text in one file”，运行时 0 次 exact match 会失败；V1 fuzzy correction strategies 仍是 TODO。[E: packages/core/src/tool/edit.ts:102][E: packages/core/src/tool/edit.ts:103][E: packages/core/src/tool/edit.ts:165][E: packages/core/src/tool/edit.ts:169][I]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `path` | `string` | 是 | 无 | relative paths resolve within active `Location`；external absolute path 需要 `external_directory` approval | 目标文件路径。[E: packages/core/src/tool/edit.ts:24][E: packages/core/src/tool/edit.ts:25][E: packages/core/src/tool/edit.ts:27] |
| `oldString` | `string` | 是 | 无 | 必须非空，且必须 exact match | 待替换文本。[E: packages/core/src/tool/edit.ts:29][E: packages/core/src/tool/edit.ts:132][E: packages/core/src/tool/edit.ts:134][E: packages/core/src/tool/edit.ts:165] |
| `newString` | `string` | 是 | 无 | 必须不同于 `oldString` | 替换文本。[E: packages/core/src/tool/edit.ts:30][E: packages/core/src/tool/edit.ts:127][E: packages/core/src/tool/edit.ts:129] |
| `replaceAll` | optional `boolean` | 否 | `false` | 多个 exact match 时必须 true，否则失败 | 是否替换所有 exact occurrences。[E: packages/core/src/tool/edit.ts:31][E: packages/core/src/tool/edit.ts:32][E: packages/core/src/tool/edit.ts:172][E: packages/core/src/tool/edit.ts:175][E: packages/core/src/tool/edit.ts:180][E: packages/core/src/tool/edit.ts:181] |

### 4 输出 & 大小/截断限制

V2 Edit 的 structured `Output` 是 `{ files: FileDiff.Info[], replacements: number }`；execute 返回的 `files[0]` 包含 `file`、`patch`、`status: "modified"`、additions 和 deletions。[E: packages/core/src/tool/edit.ts:36][E: packages/core/src/tool/edit.ts:37][E: packages/core/src/tool/edit.ts:38][E: packages/core/src/tool/edit.ts:199][E: packages/core/src/tool/edit.ts:201][E: packages/core/src/tool/edit.ts:202][E: packages/core/src/tool/edit.ts:203][E: packages/core/src/tool/edit.ts:204][E: packages/core/src/tool/edit.ts:207] `toModelOutput` 生成简短 diff preview，最多展示 old/new 各 6 行，每行 240 字符后加省略。[E: packages/core/src/tool/edit.ts:66][E: packages/core/src/tool/edit.ts:68][E: packages/core/src/tool/edit.ts:69][E: packages/core/src/tool/edit.ts:73][E: packages/core/src/tool/edit.ts:75][E: packages/core/src/tool/edit.ts:76][E: packages/core/src/tool/edit.ts:78][E: packages/core/src/tool/edit.ts:79][E: packages/core/src/tool/edit.ts:106][E: packages/core/src/tool/edit.ts:107] V2 registry settlement 会再调用 `ToolOutputStore.bound`，统一处理 2000 行 / 50KB model-facing 限制。[E: packages/core/src/tool/registry.ts:75][E: packages/core/src/tool/registry.ts:76][E: packages/core/src/tool-output-store.ts:13][E: packages/core/src/tool-output-store.ts:14][E: packages/core/src/tool-output-store.ts:138][E: packages/core/src/tool-output-store.ts:150][E: packages/core/src/tool-output-store.ts:151][E: packages/core/src/tool-output-store.ts:167]

### 5 权限

V2 Edit 先通过 `LocationMutation.resolve` 得到 target；如果 target 是 external absolute path，就调用 `LocationMutation.externalDirectoryPermission(external)` 生成 `external_directory` approval，再请求 `edit` approval。[E: packages/core/src/tool/edit.ts:138][E: packages/core/src/tool/edit.ts:139][E: packages/core/src/tool/edit.ts:142][E: packages/core/src/tool/edit.ts:143][E: packages/core/src/tool/edit.ts:151] V2 edit permission 的 action 是 `edit`，resources 是 `target.resource`，save 是 `["*"]`，source 带 assistant message 和 tool call ID。[E: packages/core/src/tool/edit.ts:152][E: packages/core/src/tool/edit.ts:153][E: packages/core/src/tool/edit.ts:154][E: packages/core/src/tool/edit.ts:155][E: packages/core/src/tool/edit.ts:156][E: packages/core/src/tool/edit.ts:157][E: packages/core/src/tool/edit.ts:158]

### 6 execute() 走读

1. V2 Edit 创建 permission source，拒绝 `oldString === newString`，并拒绝空 `oldString`。[E: packages/core/src/tool/edit.ts:122][E: packages/core/src/tool/edit.ts:127][E: packages/core/src/tool/edit.ts:132]
2. V2 Edit resolve target 与 external approval 后，读取 canonical 文件 bytes 并 decode UTF-8/BOM。[E: packages/core/src/tool/edit.ts:138][E: packages/core/src/tool/edit.ts:161][E: packages/core/src/tool/edit.ts:50][E: packages/core/src/tool/edit.ts:51][E: packages/core/src/tool/edit.ts:52]
3. V2 Edit 保持源文件换行风格，把输入 old/new 转为 `\n` 或 `\r\n`，再计算 exact occurrences。[E: packages/core/src/tool/edit.ts:162][E: packages/core/src/tool/edit.ts:163][E: packages/core/src/tool/edit.ts:164][E: packages/core/src/tool/edit.ts:165]
4. V2 Edit 对 0 次 exact match 返回 ToolFailure；对多次 exact match 且 `replaceAll !== true` 返回 ToolFailure。[E: packages/core/src/tool/edit.ts:166][E: packages/core/src/tool/edit.ts:167][E: packages/core/src/tool/edit.ts:172][E: packages/core/src/tool/edit.ts:173]
5. V2 Edit 使用 `FileMutation.writeIfUnchanged` 写入，expected 是之前读到的 source bytes；如果文件在 approval 后变化，映射成 “Read it again before editing.” 的 ToolFailure。[E: packages/core/src/tool/edit.ts:191][E: packages/core/src/tool/edit.ts:192][E: packages/core/src/tool/edit.ts:194][E: packages/core/src/tool/edit.ts:195][E: packages/core/src/tool/edit.ts:113][E: packages/core/src/tool/edit.ts:115]

## V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 匹配策略 | 9 路 replacer，含 block-anchor similarity 0.65。[E: packages/opencode/src/tool/edit.ts:694][E: packages/opencode/src/tool/edit.ts:704][E: packages/opencode/src/tool/edit.ts:220] | exact match；fuzzy parity 是 TODO。[E: packages/core/src/tool/edit.ts:165][E: packages/core/src/tool/edit.ts:169][I] |
| 空 `oldString` | 文件不存在时可创建文件；文件存在时拒绝。[E: packages/opencode/src/tool/edit.ts:90][E: packages/opencode/src/tool/edit.ts:91][E: packages/opencode/src/tool/edit.ts:111] | 一律拒绝，提示用 `write` 创建或覆盖。[E: packages/core/src/tool/edit.ts:132][E: packages/core/src/tool/edit.ts:134] |
| mutation safety | process-local semaphore 锁住同一 file path。[E: packages/opencode/src/tool/edit.ts:35][E: packages/opencode/src/tool/edit.ts:88] | `FileMutation.writeIfUnchanged` 在 per-target lock 下比较 expected bytes 再写。[E: packages/core/src/file-mutation.ts:78][E: packages/core/src/file-mutation.ts:82][E: packages/core/src/file-mutation.ts:144][E: packages/core/src/file-mutation.ts:148] |
| 后置集成 | formatter、watcher/file edit events、LSP diagnostics 都已接入。[E: packages/opencode/src/tool/edit.ts:156][E: packages/opencode/src/tool/edit.ts:159][E: packages/opencode/src/tool/edit.ts:197] | formatter、watcher、snapshot、LSP 仍是 TODO；execute 在 `writeIfUnchanged` 后返回 Output，无 formatter/LSP 调用。[E: packages/core/src/tool/edit.ts:191][E: packages/core/src/tool/edit.ts:198][I] |

## 设计动机·edge·历史

V1 fuzzy edit 结合 9 路 replacer，可推断 V1 目标是尽量把模型略有偏差的 `oldString` 修正到可执行替换。[E: packages/opencode/src/tool/edit.ts:682][E: packages/opencode/src/tool/edit.ts:694][I] V2 则先收敛到 exact-edit boundary，把 fuzzy、formatter、watcher、snapshot、LSP 都显式列为 deferred work，避免新内核初期把历史复杂度一次搬入 core。[I]

## Sources

- packages/opencode/src/tool/edit.ts
- packages/opencode/src/tool/tool.ts
- packages/opencode/src/tool/truncate.ts
- packages/core/src/tool/edit.ts
- packages/core/src/tool/tool.ts
- packages/core/src/tool/registry.ts
- packages/core/src/tool-output-store.ts
- packages/core/src/file-mutation.ts

## 相关

- [V1 apply_patch 引擎+工具](../../subsystems/execution/patch-v1.md)
- [全工具字段 catalog](../../reference/tool-catalog.md)
