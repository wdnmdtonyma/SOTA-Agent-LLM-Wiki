---
id: tool.grep
title: Grep 工具
kind: tool
tier: T1
v: shared
status: verified
updated: 355a0bcf5
source:
  - packages/opencode/src/tool/grep.ts
  - packages/core/src/tool/grep.ts
related:
  - persistence.filesystem-search
  - ref.tool-catalog
---

> `grep` 按正则搜索文件内容；V1 固定最多 100 个 match 并返回 grouped text，V2 返回 typed `FileSystem.Match[]` 并允许调用方提供 `limit`。

## 能回答的问题

- V1/V2 的 `pattern`, `path`, `include`, `limit` 差异。
- 为什么 V1 正好 100 条会提示 truncated，V2 的 limit 由输入控制。
- 权限资源是 pattern 还是 path。
- V2 grep 文案和 schema 对 absolute managed output file 的支持边界。

## 1 Identity

| 维度 | V1 | V2 |
| --- | --- | --- |
| wire name | `grep`，由 `Tool.define("grep", ...)` 注册。[E: packages/opencode/src/tool/grep.ts:21] | `grep`，由 `export const name = "grep"` 暴露。[E: packages/core/src/tool/grep.ts:15] |
| provider 可见性 | V1 builtins 包含 `GrepTool`。[E: packages/opencode/src/tool/registry.ts:225] | V2 builtins 合入 `GrepTool.layer`。[E: packages/core/src/tool/builtins.ts:36] |
| permission key | V1 使用 `ctx.ask({ permission: "grep" })`。[E: packages/opencode/src/tool/grep.ts:39] | V2 使用 `permission.assert({ action: "grep" })`。[E: packages/core/src/tool/grep.ts:79] |
| search backend | V1 直接调用 `Ripgrep.grep`。[E: packages/opencode/src/tool/grep.ts:63] | V2 注入 `Ripgrep.Service` 并调用 `ripgrep.grep`。[E: packages/core/src/tool/grep.ts:55][E: packages/core/src/tool/grep.ts:95] |

## 2 用途定位

### V1

V1 `grep` 是内容搜索工具，输出按文件分组并展示匹配行。它不读取完整文件，只返回 match line 和 text；路径在外部目录时会触发 external directory guard。[E: packages/opencode/src/tool/grep.ts:71][E: packages/opencode/src/tool/grep.ts:84][E: packages/opencode/src/tool/grep.ts:55]

### V2

V2 `grep` 是 Location-aware typed search tool。它返回 `FileSystem.Match[]`，`toModelOutput` 负责把 matches 转成 model-readable grouped text。[E: packages/core/src/tool/grep.ts:32][E: packages/core/src/tool/grep.ts:36]

## 3 输入 schema 表

| 字段 | V1 输入 | V2 输入 | 语义与迁移注意 |
| --- | --- | --- | --- |
| pattern | `pattern: string`。[E: packages/opencode/src/tool/grep.ts:11] | `pattern: string`。[E: packages/core/src/tool/grep.ts:18] | 两代 permission resource 都是 pattern，而不是 path。[E: packages/opencode/src/tool/grep.ts:41][E: packages/core/src/tool/grep.ts:81] |
| path | `path?: string`。[E: packages/opencode/src/tool/grep.ts:12] | `path?: RelativePath`。[E: packages/core/src/tool/grep.ts:21][E: packages/core/src/filesystem.ts:46] | V2 description 提到 absolute managed tool-output file，但 schema 当前是 RelativePath，执行代码也把 path 拼到 Location directory。[E: packages/core/src/tool/grep.ts:63][E: packages/core/src/tool/grep.ts:93] |
| include | `include?: string`。[E: packages/opencode/src/tool/grep.ts:15] | `include?: string`。[E: packages/core/src/tool/grep.ts:24] | 两代都把 include 传给 ripgrep 层作为 file include glob。[E: packages/opencode/src/tool/grep.ts:66][E: packages/core/src/tool/grep.ts:100] |
| limit | 无模型字段；实现硬编码 100。[E: packages/opencode/src/tool/grep.ts:67] | `limit?: PositiveInt`。[E: packages/core/src/tool/grep.ts:27][E: packages/core/src/filesystem.ts:48] | V2 未传 limit 时传 `Number.MAX_SAFE_INTEGER`。[E: packages/core/src/tool/grep.ts:101] |

## 4 输出 & 大小/截断限制

### V1

- V1 `grep` 固定请求 100 条 match。[E: packages/opencode/src/tool/grep.ts:67]
- `truncated` 判定是 `rows.length === limit`，正好 100 条会提示结果可能被截断。[E: packages/opencode/src/tool/grep.ts:77][E: packages/opencode/src/tool/grep.ts:96]
- 输出文本以 `Found N matches` 开头，按文件 header 分组，再列出 `Line <line>: <text>`。[E: packages/opencode/src/tool/grep.ts:84][E: packages/opencode/src/tool/grep.ts:91][E: packages/opencode/src/tool/grep.ts:93]
- metadata 记录 `matches` 和 `truncated`，不把 pattern/path/include 写回 metadata。[E: packages/opencode/src/tool/grep.ts:101][E: packages/opencode/src/tool/grep.ts:104]

### V2

- V2 输出是 typed `Array(FileSystem.Match)`。[E: packages/core/src/tool/grep.ts:32]
- V2 `toModelOutput` 在无结果时返回 `No files found`，有结果时生成 grouped text。[E: packages/core/src/tool/grep.ts:37][E: packages/core/src/tool/grep.ts:43]
- `Tool.make` 的 model projection 会把每个 match 的 entry path 先转成 `path.resolve(location.directory, match.entry.path)`，所以模型看到绝对路径 header，typed output 内部仍是 Location-relative entry。[E: packages/core/src/tool/grep.ts:66][E: packages/core/src/tool/grep.ts:72][E: packages/core/src/tool/grep.ts:111]
- core ripgrep 层限制单条 JSON record 大小并截断过长 line text，避免单条 match 撑爆模型上下文或内存。[E: packages/core/src/ripgrep.ts:238][E: packages/core/src/ripgrep.ts:274]

## 5 权限

### V1

V1 在校验 pattern 后申请 permission `"grep"`，patterns 是 `[pattern]`，always 是 `["*"]`，metadata 包含 pattern/path/include。[E: packages/opencode/src/tool/grep.ts:35][E: packages/opencode/src/tool/grep.ts:39][E: packages/opencode/src/tool/grep.ts:43] 搜索路径如在外部目录，会先走 external directory guard。[E: packages/opencode/src/tool/grep.ts:55]

### V2

V2 申请 action `"grep"`，resources 是 `[input.pattern]`，save 是 `["*"]`，metadata 包含 root/path/include/limit。[E: packages/core/src/tool/grep.ts:79][E: packages/core/src/tool/grep.ts:81][E: packages/core/src/tool/grep.ts:83] V2 目前没有 V1 external directory guard 分支，因为 schema path 是 RelativePath，执行以 active Location 为根。[E: packages/core/src/filesystem.ts:46][E: packages/core/src/tool/grep.ts:93]

## 6 execute() 走读

### V1

1. 建立空结果返回对象；空 pattern 直接抛错。[E: packages/opencode/src/tool/grep.ts:30][E: packages/opencode/src/tool/grep.ts:35]
2. 申请 `grep` 权限。[E: packages/opencode/src/tool/grep.ts:39]
3. path 未传则使用 instance directory；相对 path 以 instance directory 解析。[E: packages/opencode/src/tool/grep.ts:50][E: packages/opencode/src/tool/grep.ts:53]
4. external path 走 guard。[E: packages/opencode/src/tool/grep.ts:55]
5. 如果 target 是文件，ripgrep cwd 用 dirname；V1 没有把 basename 作为 file 参数传入，因此文件 path 主要影响 cwd，不限定单个文件搜索。[E: packages/opencode/src/tool/grep.ts:61][E: packages/opencode/src/tool/grep.ts:63]
6. 调用 `Ripgrep.grep`，limit 固定 100。[E: packages/opencode/src/tool/grep.ts:63][E: packages/opencode/src/tool/grep.ts:67]
7. 将 rows 转成 absolute path、line、text，再格式化输出。[E: packages/opencode/src/tool/grep.ts:71][E: packages/opencode/src/tool/grep.ts:84]

### V2

1. 申请 `grep` 权限。[E: packages/core/src/tool/grep.ts:79]
2. 将 optional relative path 解析到 active Location directory 下。[E: packages/core/src/tool/grep.ts:93]
3. 如果 target 是文件，则 cwd 使用 dirname 且 file 使用 basename；否则 cwd 是 target path。[E: packages/core/src/tool/grep.ts:97][E: packages/core/src/tool/grep.ts:99]
4. 调用 `ripgrep.grep`，传入 pattern/include/limit。[E: packages/core/src/tool/grep.ts:95][E: packages/core/src/tool/grep.ts:98][E: packages/core/src/tool/grep.ts:100]
5. 把结果 path 映射成 Location-relative POSIX path，并保留 line/offset/text/submatches。[E: packages/core/src/tool/grep.ts:107][E: packages/core/src/tool/grep.ts:111]

## 7 V1 vs V2 差异

| 差异点 | V1 | V2 |
| --- | --- | --- |
| 默认结果规模 | 固定 100。[E: packages/opencode/src/tool/grep.ts:67] | limit 可选，缺省为 `Number.MAX_SAFE_INTEGER`。[E: packages/core/src/tool/grep.ts:27][E: packages/core/src/tool/grep.ts:101] |
| 文件 path 语义 | 文件 path 只影响 cwd，没有向 ripgrep 传 basename file 参数。[E: packages/opencode/src/tool/grep.ts:62][E: packages/opencode/src/tool/grep.ts:63] | 文件 path 会设置 `file: path.basename(target)`，因此限定该文件。[E: packages/core/src/tool/grep.ts:97][E: packages/core/src/tool/grep.ts:99] |
| typed output | 只返回文本 output 和 metadata。[E: packages/opencode/src/tool/grep.ts:101][E: packages/opencode/src/tool/grep.ts:107] | tool output 是 `FileSystem.Match[]`，model output 是投影文本。[E: packages/core/src/tool/grep.ts:32][E: packages/core/src/tool/grep.ts:66] |
| external path | 任意 path string 可触发 external directory guard。[E: packages/opencode/src/tool/grep.ts:12][E: packages/opencode/src/tool/grep.ts:55] | RelativePath schema，当前执行路径以 Location 为根。[E: packages/core/src/filesystem.ts:46][E: packages/core/src/tool/grep.ts:93] |
| invalid regex | V1 没有专门的 typed invalid-regex 分支；错误来自 ripgrep effect 流。[I] | V2 ripgrep 层有 invalid pattern 检测。[E: packages/core/src/ripgrep.ts:137] |

## 8 设计动机·edge·历史

- V1 的 `grep` 和 `glob` 都固定 100 条结果，这是一种工具级上下文保护，而不是 provider 或 registry 层统一策略。[E: packages/opencode/src/tool/grep.ts:67][E: packages/opencode/src/tool/glob.ts:49]
- V2 把 output typed 化后，模型投影只是其中一个 view；registry settle 还可以统一 bound tool output，符合 V2 tools spec 对 output bounding 的描述。[E: packages/core/src/tool/tool.ts:95][E: specs/v2/tools.md:153]
- V2 grep description 与 schema 对 absolute managed tool-output file 的表达存在张力：description 提到 absolute managed tool-output file，schema 和 execute path 则是 RelativePath + Location root。读者应以 schema/execute 为当前行为。[E: packages/core/src/tool/grep.ts:63][E: packages/core/src/filesystem.ts:46][E: packages/core/src/tool/grep.ts:93]

## Sources

- `packages/opencode/src/tool/grep.ts`
- `packages/opencode/src/tool/glob.ts`
- `packages/core/src/tool/grep.ts`
- `packages/core/src/filesystem.ts`
- `packages/core/src/ripgrep.ts`
- `packages/opencode/src/tool/registry.ts`
- `packages/core/src/tool/builtins.ts`
- `specs/v2/tools.md`

## 相关

- [文件系统搜索](../../subsystems/persistence/filesystem-search.md)
- [工具目录](../../reference/tool-catalog.md)
