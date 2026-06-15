---
id: tool.write
title: Write 工具
kind: tool
tier: T1
v: shared
source: [packages/opencode/src/tool/write.ts, packages/core/src/tool/write.ts]
symbols: [WriteTool]
related: [execution.permissions-v1, ref.tool-catalog]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> Write 工具负责整文件写入；V1 活跑实现复用 edit permission、formatter、watcher 与 LSP diagnostics，V2 新内核实现复用 `FileMutation.writeTextPreservingBom` 与 `PermissionV2`。

## 能回答的问题

- `write` 的 V1/V2 输入字段为什么从 `filePath` 变成 `path`？
- Write 覆盖文件时请求的 permission 是 `write` 还是 `edit`？
- V1 Write 写入后会不会 format、发 watcher event、收 LSP diagnostics？
- V2 Write 如何处理 external absolute path 和 BOM？
- Write 的输出如何被通用截断边界处理？

## V1

### 1 Identity

V1 `WriteTool` 通过 `Tool.define("write", ...)` 注册，wire name 是 `write`。[E: packages/opencode/src/tool/write.ts:27][E: packages/opencode/src/tool/write.ts:28] `Parameters` 包含 `content` 与 `filePath`。[E: packages/opencode/src/tool/write.ts:20][E: packages/opencode/src/tool/write.ts:21][E: packages/opencode/src/tool/write.ts:22]

### 2 用途定位

V1 Write 是整文件 replacement/create 工具。它读取 existing file 的 BOM/text，生成 full-file diff，获得 edit approval 后写入，随后 format、发布 file events、触发 LSP diagnostics。[E: packages/opencode/src/tool/write.ts:46][E: packages/opencode/src/tool/write.ts:53][E: packages/opencode/src/tool/write.ts:54][E: packages/opencode/src/tool/write.ts:64][E: packages/opencode/src/tool/write.ts:65][E: packages/opencode/src/tool/write.ts:68][E: packages/opencode/src/tool/write.ts:75]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `content` | `string` | 是 | 无 | 保留/合并 UTF-8 BOM | 要写入的完整文件内容。[E: packages/opencode/src/tool/write.ts:21][E: packages/opencode/src/tool/write.ts:48][E: packages/opencode/src/tool/write.ts:49] |
| `filePath` | `string` | 是 | 无 | schema 描述 absolute；execute 仍接受 relative 并 join 到 instance directory | 目标文件路径。[E: packages/opencode/src/tool/write.ts:22][E: packages/opencode/src/tool/write.ts:23][E: packages/opencode/src/tool/write.ts:41][E: packages/opencode/src/tool/write.ts:43] |

### 4 输出 & 大小/截断限制

V1 Write 成功输出以 `Wrote file successfully.` 开头，metadata 包含 `diagnostics`、`filepath` 和 `exists`。[E: packages/opencode/src/tool/write.ts:74][E: packages/opencode/src/tool/write.ts:92][E: packages/opencode/src/tool/write.ts:94][E: packages/opencode/src/tool/write.ts:97] 它最多把 5 个其它文件的 LSP diagnostics 附加到输出，当前文件 diagnostics 单独提示。[E: packages/opencode/src/tool/write.ts:18][E: packages/opencode/src/tool/write.ts:81][E: packages/opencode/src/tool/write.ts:85][E: packages/opencode/src/tool/write.ts:89] 通用 `Tool.define` wrapper 会在 result 没有 `metadata.truncated` 时调用 `Truncate.output`。[E: packages/opencode/src/tool/tool.ts:131][E: packages/opencode/src/tool/tool.ts:135]

### 5 权限

V1 Write 请求的 permission 是 `edit`，不是 `write`；patterns 是目标相对 worktree 的路径，metadata 带完整 diff。[E: packages/opencode/src/tool/write.ts:54][E: packages/opencode/src/tool/write.ts:55][E: packages/opencode/src/tool/write.ts:56][E: packages/opencode/src/tool/write.ts:58][E: packages/opencode/src/tool/write.ts:60] 在请求 edit approval 前，V1 Write 会调用 `assertExternalDirectoryEffect` 做 external directory guard。[E: packages/opencode/src/tool/write.ts:44]

### 6 execute() 走读

1. V1 Write 取得 instance context，resolve `filePath`，并检查 external directory。[E: packages/opencode/src/tool/write.ts:40][E: packages/opencode/src/tool/write.ts:41][E: packages/opencode/src/tool/write.ts:44]
2. V1 Write 判断目标是否存在；存在则 `Bom.readFile`，不存在则 old content 为空。[E: packages/opencode/src/tool/write.ts:46][E: packages/opencode/src/tool/write.ts:47]
3. V1 Write 对 new content 做 `Bom.split`，用 existing BOM 或 new BOM 作为 desired BOM。[E: packages/opencode/src/tool/write.ts:48][E: packages/opencode/src/tool/write.ts:49]
4. V1 Write 创建 diff 并请求 edit permission，然后 `writeWithDirs` 写文件。[E: packages/opencode/src/tool/write.ts:53][E: packages/opencode/src/tool/write.ts:54][E: packages/opencode/src/tool/write.ts:64]
5. 写入后 V1 Write 调 formatter，发布 `FileSystem.Event.Edited` 和 `Watcher.Event.Updated`，event 是 existing file 的 `change` 或 new file 的 `add`。[E: packages/opencode/src/tool/write.ts:65][E: packages/opencode/src/tool/write.ts:68][E: packages/opencode/src/tool/write.ts:69][E: packages/opencode/src/tool/write.ts:71]

## V2

### 1 Identity

V2 `WriteTool` 的 name 是 `write`，以 `[name]: Tool.withPermission(Tool.make(...), "edit")` 注册。[E: packages/core/src/tool/write.ts:17][E: packages/core/src/tool/write.ts:52][E: packages/core/src/tool/write.ts:54][E: packages/core/src/tool/write.ts:88] 这意味着工具 wire name 是 `write`，但 permission filtering/action 使用 edit 语义。[E: packages/core/src/tool/tool.ts:121][E: packages/core/src/tool/tool.ts:130]

### 2 用途定位

V2 Write 是 Location-scoped file-write leaf。description 字段明确：relative path resolve within active Location，absolute internal path 接受，external absolute path 需要单独 `external_directory` approval。[E: packages/core/src/tool/write.ts:56][E: packages/core/src/tool/write.ts:57]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `path` | `string` | 是 | 无 | relative path 在 active Location 内 resolve；external absolute path 需要 `external_directory` approval | 目标文件路径；文件内 TODO 说明未来可能评估是否为了模型兼容改回 `filePath` 命名。[E: packages/core/src/tool/write.ts:20][E: packages/core/src/tool/write.ts:21][E: packages/core/src/tool/write.ts:23] |
| `content` | `string` | 是 | 无 | `FileMutation.writeTextPreservingBom` 保留 existing UTF-8 BOM 且最多写一个 BOM | 完整文件内容。[E: packages/core/src/tool/write.ts:25][E: packages/core/src/tool/write.ts:85][E: packages/core/src/file-mutation.ts:58] |

### 4 输出 & 大小/截断限制

V2 Write structured output 是 `{ operation: "write", target, resource, existed }`。[E: packages/core/src/tool/write.ts:28][E: packages/core/src/tool/write.ts:32] `toModelOutput` 输出 `Wrote file successfully` 或 `Created file successfully`，取决于 `existed`。[E: packages/core/src/tool/write.ts:36][E: packages/core/src/tool/write.ts:37] V2 registry settlement 对模型可见输出再走 `ToolOutputStore.bound`。[E: packages/core/src/tool/registry.ts:73][E: packages/core/src/tool/registry.ts:74]

### 5 权限

V2 Write 先 `LocationMutation.resolve({ path, kind: "file" })`；如果有 `externalDirectory`，先 assert `external_directory`；随后 assert `action: "edit"`、`resources: [target.resource]`、`save: ["*"]`。[E: packages/core/src/tool/write.ts:68][E: packages/core/src/tool/write.ts:69][E: packages/core/src/tool/write.ts:71][E: packages/core/src/tool/write.ts:77][E: packages/core/src/tool/write.ts:78][E: packages/core/src/tool/write.ts:79][E: packages/core/src/tool/write.ts:80] `source` 使用当前 assistant message 和 tool call ID。[E: packages/core/src/tool/write.ts:63][E: packages/core/src/tool/write.ts:65][E: packages/core/src/tool/write.ts:66]

### 6 execute() 走读

1. V2 Write 构造 permission source，resolve target，并处理 external directory approval。[E: packages/core/src/tool/write.ts:63][E: packages/core/src/tool/write.ts:68][E: packages/core/src/tool/write.ts:70]
2. V2 Write 请求 edit permission 后调用 `files.writeTextPreservingBom({ target, content })`。[E: packages/core/src/tool/write.ts:77][E: packages/core/src/tool/write.ts:85]
3. `FileMutation.writeTextPreservingBom` 在 target lock 内读取当前 bytes，合并 existing BOM/new BOM，再 `writeWithDirs`。[E: packages/core/src/file-mutation.ts:107][E: packages/core/src/file-mutation.ts:108][E: packages/core/src/file-mutation.ts:111][E: packages/core/src/file-mutation.ts:114][E: packages/core/src/file-mutation.ts:116]
4. V2 Write 将 execute error channel failure 映射为 `ToolFailure({ message: "Unable to write ..." })`；这里不声称 defects/interruption 会变成 model-visible failure。[E: packages/core/src/tool/write.ts:86]

## V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 输入路径字段 | `filePath`；execute 接受 relative。[E: packages/opencode/src/tool/write.ts:22][E: packages/opencode/src/tool/write.ts:41] | `path`；文件内 TODO 记录兼容命名待评估。[E: packages/core/src/tool/write.ts:20][E: packages/core/src/tool/write.ts:21] |
| permission | wire name `write`，permission `edit`。[E: packages/opencode/src/tool/write.ts:27][E: packages/opencode/src/tool/write.ts:55] | wire name `write`，`Tool.withPermission(..., "edit")` 且 assert `action: "edit"`。[E: packages/core/src/tool/write.ts:17][E: packages/core/src/tool/write.ts:88][E: packages/core/src/tool/write.ts:78] |
| 后置集成 | formatter、watcher/file edit events、LSP diagnostics 已接入。[E: packages/opencode/src/tool/write.ts:65][E: packages/opencode/src/tool/write.ts:68][E: packages/opencode/src/tool/write.ts:75] | formatter、watcher、snapshot、LSP 都是 TODO（write.ts 行 39–43 TODO 块）；execute 在 `writeTextPreservingBom` 后直接结束。[E: packages/core/src/tool/write.ts:45][E: packages/core/src/tool/write.ts:85] |
| mutation primitive | 直接 `FSUtil.writeWithDirs`。[E: packages/opencode/src/tool/write.ts:64] | `FileMutation.writeTextPreservingBom`，在 target lock 内写。[E: packages/core/src/tool/write.ts:85][E: packages/core/src/file-mutation.ts:107][E: packages/core/src/file-mutation.ts:108] |

## 设计动机·edge·历史

V2 把文件变更集中到 `FileMutation`，该服务注释说明它按 canonical target serialize file changes，并让 conditional writes 在同一 process-local lock 下比较和写入，避免 cooperating OpenCode mutations 从 stale content 覆盖彼此。[E: packages/core/src/file-mutation.ts:73][E: packages/core/src/file-mutation.ts:77][E: packages/core/src/file-mutation.ts:81] Write 自身没有 conditional expected bytes，因为整文件写入语义是覆盖；需要 stale protection 的 exact edit 使用 `writeIfUnchanged`。[E: packages/core/src/tool/edit.ts:183][E: packages/core/src/tool/edit.ts:186]

## Sources

- packages/opencode/src/tool/write.ts
- packages/opencode/src/tool/tool.ts
- packages/core/src/tool/write.ts
- packages/core/src/tool/tool.ts
- packages/core/src/tool/registry.ts
- packages/core/src/file-mutation.ts

## 相关

- [V1 权限模型](../../subsystems/execution/permissions-v1.md)
- [全工具字段 catalog](../../reference/tool-catalog.md)
