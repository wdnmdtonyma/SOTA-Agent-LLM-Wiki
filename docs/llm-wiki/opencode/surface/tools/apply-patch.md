---
id: tool.apply-patch
title: Apply-Patch 工具(GPT 模型)
kind: tool
tier: T1
v: shared
status: verified
updated: 92c70c9c3
source:
  - packages/opencode/src/tool/apply_patch.ts
  - packages/core/src/tool/apply-patch.ts
related:
  - execution.patch-v1
  - execution.patch-v2
  - ref.patch-format
---

> `apply_patch` 是 GPT patch 模型优先暴露的文本补丁工具；V1 支持 add/update/delete/move，V2 当前支持 add/update/delete 并显式拒绝 move。

## 能回答的问题

- V1 什么时候把 `apply_patch` 暴露给模型，什么时候隐藏 `edit/write`。
- patch grammar 支持哪些 hunk 类型和 move 语义。
- V2 为什么 parser 能看到 move，但 tool 执行层拒绝 move。
- 权限审批、external directory、顺序应用和 partial failure 如何处理。

## 1 Identity

| 维度 | V1 | V2 |
| --- | --- | --- |
| wire name | `apply_patch`，由 `Tool.define("apply_patch", ...)` 注册。[E: packages/opencode/src/tool/apply_patch.ts:22] | `apply_patch`，由 `export const name = "apply_patch"` 暴露。[E: packages/core/src/tool/apply-patch.ts:13] |
| model gating | V1 registry 在 modelID 包含 `gpt-`、不包含 `oss`、不包含 `gpt-4` 时使用 patch path，并只在该条件下暴露 `ApplyPatchTool`。[E: packages/opencode/src/tool/registry.ts:274][E: packages/opencode/src/tool/registry.ts:275] | V2 `locationLayer` 包含 `ApplyPatchTool.layer`，该 layer 内调用 `tools.register`，当前没有同一段 modelID gating。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/apply-patch.ts:54] |
| 与 edit/write 的关系 | V1 usePatch 时隐藏 `edit` 和 `write`，只给模型 patch 工具。[E: packages/opencode/src/tool/registry.ts:275][E: packages/opencode/src/tool/registry.ts:276] | V2 builtins 同时注册 apply_patch、edit、write。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:34][E: packages/core/src/tool/builtins.ts:43] |
| permission key | V1 申请 permission `"edit"`。[E: packages/opencode/src/tool/apply_patch.ts:207] | V2 用 `Tool.withPermission(..., "edit")` 并显式 assert action `"edit"`。[E: packages/core/src/tool/apply-patch.ts:172][E: packages/core/src/tool/apply-patch.ts:104] |

## 2 用途定位

### V1

V1 `apply_patch` 是当前活跑系统里面向 GPT patch 模型的结构化文件变更工具。它解析 `*** Begin Patch` / `*** End Patch` markers，预计算每个文件的 diff/additions/deletions metadata，申请一次 edit 权限，然后按 `fileChanges` 收集顺序逐个进入 add/update/move/delete switch 分支写文件。[E: packages/opencode/src/patch/index.ts:192][E: packages/opencode/src/patch/index.ts:198][E: packages/opencode/src/tool/apply_patch.ts:194][E: packages/opencode/src/tool/apply_patch.ts:199][E: packages/opencode/src/tool/apply_patch.ts:207][E: packages/opencode/src/tool/apply_patch.ts:220]

### V2

V2 `apply_patch` 是 core 内核的 typed patch tool。description 明确限定 add/update/delete，说明路径会先 resolve/approve，然后 sequential apply；moves 和 atomic rollback unsupported。[E: packages/core/src/tool/apply-patch.ts:59]

## 3 输入 schema 表

| 字段 | V1 输入 | V2 输入 | 语义与迁移注意 |
| --- | --- | --- | --- |
| patchText | `patchText: string`。[E: packages/opencode/src/tool/apply_patch.ts:19] | `patchText: string`。[E: packages/core/src/tool/apply-patch.ts:16] | 两代都要求非空 patch text；空字符串失败。[E: packages/opencode/src/tool/apply_patch.ts:34][E: packages/core/src/tool/apply-patch.ts:78] |

## 4 输出 & 大小/截断限制

### V1

- 成功输出以 `Success. Updated the following files:` 开头，摘要行只输出 `A|D|M <relative path>`；additions/deletions 存在于 `metadata.files`，不是摘要文本的一部分。[E: packages/opencode/src/tool/apply_patch.ts:274][E: packages/opencode/src/tool/apply_patch.ts:284][E: packages/opencode/src/tool/apply_patch.ts:194][E: packages/opencode/src/tool/apply_patch.ts:199][E: packages/opencode/src/tool/apply_patch.ts:200]
- metadata 包含 `diff`, `files`, `diagnostics` 等；diff/files 也用于权限请求展示。[E: packages/opencode/src/tool/apply_patch.ts:210][E: packages/opencode/src/tool/apply_patch.ts:213][E: packages/opencode/src/tool/apply_patch.ts:297]
- V1 通用 `Tool.wrap` 会对最终 output 做 truncation，除非工具 metadata 已经标记 truncated。[E: packages/opencode/src/tool/tool.ts:131][E: packages/opencode/src/tool/tool.ts:135][E: packages/opencode/src/tool/tool.ts:141]

### V2

- V2 输出是 `{ applied: Applied[] }`，每项 type 只能是 `add/update/delete`，包含 target/resource。[E: packages/core/src/tool/apply-patch.ts:21][E: packages/core/src/tool/apply-patch.ts:27]
- V2 `toModelOutput` 先输出标题行 `"Applied patch sequentially:"`，再逐行输出 `A|D|M <resource>`。[E: packages/core/src/tool/apply-patch.ts:30][E: packages/core/src/tool/apply-patch.ts:32][E: packages/core/src/tool/apply-patch.ts:34]
- V2 failure helper 会把已应用的 partial list 拼进 `ToolFailure.message`；当前 helper 没有把 partial list 作为 typed data 字段返回。[E: packages/core/src/tool/apply-patch.ts:65][E: packages/core/src/tool/apply-patch.ts:70]

## 5 权限

### V1

V1 对每个 hunk path 先 resolve 并执行 external directory guard。[E: packages/opencode/src/tool/apply_patch.ts:73][E: packages/opencode/src/tool/apply_patch.ts:74] 预计算所有 fileChanges 后，它一次性申请 `edit` 权限，patterns 是变更文件 relative path，metadata 包含总 diff 和 files 列表。[E: packages/opencode/src/tool/apply_patch.ts:194][E: packages/opencode/src/tool/apply_patch.ts:205][E: packages/opencode/src/tool/apply_patch.ts:207][E: packages/opencode/src/tool/apply_patch.ts:210][E: packages/opencode/src/tool/apply_patch.ts:213]

### V2

V2 先解析所有 patch targets，去重 external directories 并申请 `external_directory` 权限。[E: packages/core/src/tool/apply-patch.ts:88][E: packages/core/src/tool/apply-patch.ts:89][E: packages/core/src/tool/apply-patch.ts:90][E: packages/core/src/tool/apply-patch.ts:96][E: packages/core/src/tool/apply-patch.ts:97] 然后它对所有 target resource 一次性申请 action `"edit"`，save 是 `["*"]`。[E: packages/core/src/tool/apply-patch.ts:103][E: packages/core/src/tool/apply-patch.ts:104][E: packages/core/src/tool/apply-patch.ts:105][E: packages/core/src/tool/apply-patch.ts:106]

## 6 execute() 走读

### V1

1. 校验 `patchText` 非空，调用 `Patch.parsePatch`，parse 失败时返回 tool error。[E: packages/opencode/src/tool/apply_patch.ts:34][E: packages/opencode/src/tool/apply_patch.ts:41]
2. 空 hunk list 失败。[E: packages/opencode/src/tool/apply_patch.ts:47]
3. 遍历 hunks；V1 fileChanges 类型覆盖 `add/update/delete/move`。[E: packages/opencode/src/tool/apply_patch.ts:72][E: packages/opencode/src/tool/apply_patch.ts:62]
4. add hunk 生成新文件 content 和 diff。[E: packages/opencode/src/tool/apply_patch.ts:79][E: packages/opencode/src/tool/apply_patch.ts:82]
5. update hunk 要求文件存在，读取 source，用 patch chunks derive 新内容；若 hunk 有 `move_path`，fileChange type 变为 `move`。[E: packages/opencode/src/tool/apply_patch.ts:108][E: packages/opencode/src/tool/apply_patch.ts:115][E: packages/opencode/src/tool/apply_patch.ts:122][E: packages/opencode/src/tool/apply_patch.ts:127][E: packages/opencode/src/tool/apply_patch.ts:142][E: packages/opencode/src/tool/apply_patch.ts:149]
6. delete hunk 读取旧文件并生成删除 diff。[E: packages/opencode/src/tool/apply_patch.ts:162][E: packages/opencode/src/tool/apply_patch.ts:172]
7. 申请一次 `edit` 权限后，按 `fileChanges` 顺序遍历；每个 change 再进入 add/update/move/delete switch 分支实际写文件。[E: packages/opencode/src/tool/apply_patch.ts:207][E: packages/opencode/src/tool/apply_patch.ts:220][E: packages/opencode/src/tool/apply_patch.ts:222][E: packages/opencode/src/tool/apply_patch.ts:235][E: packages/opencode/src/tool/apply_patch.ts:246]
8. 运行 formatter、发布 events、刷新 LSP diagnostics 并返回摘要。[E: packages/opencode/src/tool/apply_patch.ts:252][E: packages/opencode/src/tool/apply_patch.ts:261][E: packages/opencode/src/tool/apply_patch.ts:266]

### V2

1. 校验 `patchText` 非空，调用 `Patch.parse`。[E: packages/core/src/tool/apply-patch.ts:78][E: packages/core/src/tool/apply-patch.ts:79]
2. 空 patch 失败；任何 update hunk 带 `movePath` 都立即失败。[E: packages/core/src/tool/apply-patch.ts:83][E: packages/core/src/tool/apply-patch.ts:85]
3. 解析所有 target 并做 external directory 权限。[E: packages/core/src/tool/apply-patch.ts:87][E: packages/core/src/tool/apply-patch.ts:95]
4. 对所有 target resources 申请 `edit` 权限。[E: packages/core/src/tool/apply-patch.ts:103]
5. prepare 阶段：add 不读旧文件，delete 只 stat 检查文件存在，update 读取旧内容并通过 `Patch.derive` 计算新内容。[E: packages/core/src/tool/apply-patch.ts:115][E: packages/core/src/tool/apply-patch.ts:119][E: packages/core/src/tool/apply-patch.ts:124][E: packages/core/src/tool/apply-patch.ts:125]
6. apply 阶段顺序执行：add 用 `files.create`，delete 用 `files.remove`，update 用 `writeIfUnchanged`。[E: packages/core/src/tool/apply-patch.ts:143][E: packages/core/src/tool/apply-patch.ts:154][E: packages/core/src/tool/apply-patch.ts:159]
7. 任一步出错时用 `fail(..., applied)` 风格的闭包返回错误消息，消息内列出此前已应用资源。[E: packages/core/src/tool/apply-patch.ts:65][E: packages/core/src/tool/apply-patch.ts:69][E: packages/core/src/tool/apply-patch.ts:169]

## 7 V1 vs V2 差异

| 差异点 | V1 | V2 |
| --- | --- | --- |
| move | 支持 `*** Move to:`，fileChange type 可为 `move`。[E: packages/opencode/src/patch/index.ts:92][E: packages/opencode/src/patch/index.ts:93][E: packages/opencode/src/tool/apply_patch.ts:149] | parser type 可含 movePath，但 tool 显式拒绝 moves。[E: packages/core/src/patch.ts:9][E: packages/core/src/tool/apply-patch.ts:85] |
| gating | 只在 GPT patch 条件下暴露，并隐藏 edit/write。[E: packages/opencode/src/tool/registry.ts:274][E: packages/opencode/src/tool/registry.ts:275][E: packages/opencode/src/tool/registry.ts:276] | builtins 固定注册，无同等 modelID gate。[E: packages/core/src/tool/builtins.ts:32] |
| formatter/events/LSP | 有 formatter、FileSystem/Watcher event、LSP diagnostics。[E: packages/opencode/src/tool/apply_patch.ts:252][E: packages/opencode/src/tool/apply_patch.ts:261][E: packages/opencode/src/tool/apply_patch.ts:266] | V2 add/delete/update 分别委托 `FileMutation` 的 `files.create` / `files.remove` / `writeIfUnchanged`；当前文件未见 V1 那组 formatter/watcher/LSP 调用。[E: packages/core/src/tool/apply-patch.ts:143][E: packages/core/src/tool/apply-patch.ts:154][E: packages/core/src/tool/apply-patch.ts:159][I] |
| patch seek | V1 derive 用多策略 seek sequence：exact/rstrip/trim/normalized。[E: packages/opencode/src/patch/index.ts:464][E: packages/opencode/src/patch/index.ts:468][E: packages/opencode/src/patch/index.ts:472][E: packages/opencode/src/patch/index.ts:476] | V2 patch derive 也有 exact/rstrip/trim/normalized comparators。[E: packages/core/src/patch.ts:162][E: packages/core/src/patch.ts:183][E: packages/core/src/patch.ts:184][E: packages/core/src/patch.ts:185][E: packages/core/src/patch.ts:186] |
| failure model | V1 预计算后顺序应用，实际写入失败没有 typed partial result schema。[I] | V2 failure message 会列 partial applied resources，但 output schema 只覆盖成功 `{ applied }`。[E: packages/core/src/tool/apply-patch.ts:27][E: packages/core/src/tool/apply-patch.ts:69] |

## 8 设计动机·edge·历史

- V1 apply_patch 是模型选择层的一部分：registry 根据 model id 决定是暴露 patch 工具，还是暴露 edit/write。这不是 patch parser 的能力判断，而是模型能力/提示策略判断。[E: packages/opencode/src/tool/registry.ts:274][E: packages/opencode/src/tool/registry.ts:275][E: packages/opencode/src/tool/registry.ts:276][I]
- V2 apply_patch 的 description 把 unsupported moves/rollback 写进工具说明，说明 core 当前优先接通 deterministic add/update/delete 与 partial reporting，而不是完整复刻 V1 patch mutation surface。[E: packages/core/src/tool/apply-patch.ts:59][I]
- 两代 patch parser 都有 fuzzy-ish hunk seek 策略；这和 V2 `edit` 的 exact-only 状态不同，不能把“V2 edit 精确匹配”误推广到 “V2 apply_patch 只做完全逐字符 patch”。[E: packages/core/src/patch.ts:162][E: packages/core/src/patch.ts:183][E: packages/core/src/tool/edit.ts:165]

## Sources

- `packages/opencode/src/tool/apply_patch.ts`
- `packages/opencode/src/patch/index.ts`
- `packages/opencode/src/tool/registry.ts`
- `packages/opencode/src/tool/tool.ts`
- `packages/core/src/tool/apply-patch.ts`
- `packages/core/src/patch.ts`
- `packages/core/src/tool/builtins.ts`

## 相关

- [V1 patch 执行](../../subsystems/execution/patch-v1.md)
- [V2 patch 执行](../../subsystems/execution/patch-v2.md)
- [Patch format](../../reference/patch-format.md)
