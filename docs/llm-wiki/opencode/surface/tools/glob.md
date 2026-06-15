---
id: tool.glob
title: Glob 工具
kind: tool
tier: T1
v: shared
status: verified
updated: 92c70c9c3
source:
  - packages/opencode/src/tool/glob.ts
  - packages/core/src/tool/glob.ts
related:
  - persistence.filesystem-search
  - ref.tool-catalog
---

> `glob` 按 glob pattern 查找文件；V1 固定最多返回 100 个绝对路径，V2 用 typed `FileSystem.Entry[]` 表达结果并通过可选 `limit` 控制规模。

## 能回答的问题

- `glob` 的 V1/V2 输入字段为什么不是完全相同。
- V1 为什么会固定截断到 100 条，V2 为什么要显式传 `limit` 才限制。
- 权限 action/resource pattern 怎样建模。
- 搜索根目录、相对路径和文件路径 edge case 如何处理。

## 1 Identity

| 维度 | V1 | V2 |
| --- | --- | --- |
| wire name | `glob`，由 `Tool.define("glob", ...)` 注册。[E: packages/opencode/src/tool/glob.ts:18] | `glob`，由 `export const name = "glob"` 暴露。[E: packages/core/src/tool/glob.ts:14] |
| provider 可见性 | V1 builtins 包含 `GlobTool`。[E: packages/opencode/src/tool/registry.ts:224] | V2 builtins 合入 `GlobTool.layer`。[E: packages/core/src/tool/builtins.ts:35] |
| permission key | V1 使用 `ctx.ask({ permission: "glob" })`。[E: packages/opencode/src/tool/glob.ts:28] | V2 使用 `permission.assert({ action: "glob" })`。[E: packages/core/src/tool/glob.ts:60] |
| search backend | V1 调用 `Ripgrep.glob`。[E: packages/opencode/src/tool/glob.ts:50] | V2 注入 `Ripgrep.Service` 并调用 `ripgrep.glob`。[E: packages/core/src/tool/glob.ts:39][E: packages/core/src/tool/glob.ts:74] |

## 2 用途定位

### V1

V1 `glob` 是快速文件发现工具。它只返回路径，不读取内容；如果搜索根是文件会直接报错，搜索根在 project 外时会触发 external directory guard。[E: packages/opencode/src/tool/glob.ts:41][E: packages/opencode/src/tool/glob.ts:44]

### V2

V2 `glob` 是 Location-aware 文件发现工具。它把输入 `path` 解析为 active Location 下的 cwd，并把后端返回的 path 映射为 Location-relative `FileSystem.Entry`。[E: packages/core/src/tool/glob.ts:73][E: packages/core/src/tool/glob.ts:84]

## 3 输入 schema 表

| 字段 | V1 输入 | V2 输入 | 语义与迁移注意 |
| --- | --- | --- | --- |
| pattern | `pattern: string`。[E: packages/opencode/src/tool/glob.ts:11] | `pattern: string`。[E: packages/core/src/tool/glob.ts:17] | 两代权限 resource 都直接使用 pattern。[E: packages/opencode/src/tool/glob.ts:30][E: packages/core/src/tool/glob.ts:62] |
| path | `path?: string`。[E: packages/opencode/src/tool/glob.ts:12] | `path?: RelativePath`。[E: packages/core/src/tool/glob.ts:18][E: packages/core/src/filesystem.ts:41] | V1 允许任意字符串并自行 resolve；V2 schema 使用 filesystem 层的 RelativePath，普通调用以 active Location 为根。 |
| limit | 无模型字段；实现硬编码 `limit = 100`。[E: packages/opencode/src/tool/glob.ts:49] | `limit?: PositiveInt`。[E: packages/core/src/tool/glob.ts:21][E: packages/core/src/filesystem.ts:42] | V2 未传 limit 时传 `Number.MAX_SAFE_INTEGER` 给 ripgrep service。[E: packages/core/src/tool/glob.ts:78] |

## 4 输出 & 大小/截断限制

### V1

- V1 最多向 backend 请求 100 条结果。[E: packages/opencode/src/tool/glob.ts:49]
- `truncated` 判定为 `files.length === limit`，因此正好 100 条时会提示可能还有更多结果。[E: packages/opencode/src/tool/glob.ts:51]
- 输出是纯文本，每行是 absolute path，空结果返回 `No files found`。[E: packages/opencode/src/tool/glob.ts:54][E: packages/opencode/src/tool/glob.ts:56]
- metadata 记录 `count` 和 `truncated`。[E: packages/opencode/src/tool/glob.ts:67]

### V2

- V2 输出是 `Array(FileSystem.Entry)`，`toModelOutput` 会把结果格式化为路径列表文本。[E: packages/core/src/tool/glob.ts:26][E: packages/core/src/tool/glob.ts:30]
- `Tool.make` 的 model projection 会先把 relative entry path 转成 `path.resolve(location.directory, entry.path)`，因此模型看到的是绝对路径列表。[E: packages/core/src/tool/glob.ts:50][E: packages/core/src/tool/glob.ts:54]
- core ripgrep 层会 `take(input.limit + 1)`，用多取一条判断是否 truncated。[E: packages/core/src/ripgrep.ts:127][E: packages/core/src/ripgrep.ts:131]
- V2 tool 本身没有 V1 的 100 条硬编码默认值；如果 `input.limit` 缺省，tool 传 `Number.MAX_SAFE_INTEGER`。[E: packages/core/src/tool/glob.ts:78]

## 5 权限

### V1

V1 使用 permission `"glob"`，patterns 是用户传入 pattern，always 是 `["*"]`，metadata 记录 pattern 和 path。[E: packages/opencode/src/tool/glob.ts:28][E: packages/opencode/src/tool/glob.ts:30][E: packages/opencode/src/tool/glob.ts:32] 如果 path 指向外部目录，V1 还会调用 external directory guard。[E: packages/opencode/src/tool/glob.ts:44]

### V2

V2 使用 action `"glob"`，resources 是 `[input.pattern]`，save 是 `["*"]`，metadata 记录 root/path/limit。[E: packages/core/src/tool/glob.ts:60][E: packages/core/src/tool/glob.ts:62][E: packages/core/src/tool/glob.ts:64] V2 `path` schema 是 RelativePath，因此普通模型输入不走 V1 的 arbitrary external path helper。[E: packages/core/src/filesystem.ts:41]

## 6 execute() 走读

### V1

1. 申请 `glob` 权限。[E: packages/opencode/src/tool/glob.ts:28]
2. 计算搜索 path；未传 path 使用 `InstanceState` 的 directory，相对 path 也从 instance directory 解析。[E: packages/opencode/src/tool/glob.ts:38][E: packages/opencode/src/tool/glob.ts:39]
3. 如果 path 是文件，抛出错误，提示 glob 只能搜索目录。[E: packages/opencode/src/tool/glob.ts:41]
4. 对外部目录执行 guard。[E: packages/opencode/src/tool/glob.ts:44]
5. 用固定 limit 100 调用 ripgrep glob。[E: packages/opencode/src/tool/glob.ts:49][E: packages/opencode/src/tool/glob.ts:50]
6. 将结果转成 absolute path 文本并返回 metadata。[E: packages/opencode/src/tool/glob.ts:56][E: packages/opencode/src/tool/glob.ts:65]

### V2

1. 申请 `glob` 权限。[E: packages/core/src/tool/glob.ts:60]
2. 将 active Location directory 与可选 relative `path` 拼成 cwd。[E: packages/core/src/tool/glob.ts:73]
3. 调用 `ripgrep.glob`，limit 缺省时使用 `Number.MAX_SAFE_INTEGER`。[E: packages/core/src/tool/glob.ts:74][E: packages/core/src/tool/glob.ts:78]
4. 把每个 entry path 转回相对 Location 的 POSIX 风格 path，并保留 type/size/mtime 等 entry 字段。[E: packages/core/src/tool/glob.ts:84][E: packages/core/src/tool/glob.ts:86]

## 7 V1 vs V2 差异

| 差异点 | V1 | V2 |
| --- | --- | --- |
| 默认返回规模 | 固定 100。[E: packages/opencode/src/tool/glob.ts:49] | 无 100 默认 cap；limit 可选。[E: packages/core/src/tool/glob.ts:21][E: packages/core/src/tool/glob.ts:78] |
| typed output | 只返回文本 output 和 metadata。[E: packages/opencode/src/tool/glob.ts:65][E: packages/opencode/src/tool/glob.ts:71] | tool output 是 `FileSystem.Entry[]`，model output 是投影文本。[E: packages/core/src/tool/glob.ts:26][E: packages/core/src/tool/glob.ts:50] |
| path 输入 | 任意 string，可解析到外部目录后走 external guard。[E: packages/opencode/src/tool/glob.ts:12][E: packages/opencode/src/tool/glob.ts:44] | RelativePath schema，执行以 active Location 为根。[E: packages/core/src/filesystem.ts:41][E: packages/core/src/tool/glob.ts:73] |
| ripgrep 参数 | V1 直接传 `cwd`, `pattern`, `limit` 给 `Ripgrep.glob`。[E: packages/opencode/src/tool/glob.ts:50] | V2 ripgrep implementation 使用 `--files`, `--glob=<pattern>`, 并排除 `.git`。[E: packages/core/src/ripgrep.ts:161][E: packages/core/src/ripgrep.ts:167] |

## 8 设计动机·edge·历史

- V1 的 100 条默认是 prompt-era 输出保护：避免 glob 把大型 repo 的完整文件列表塞进模型上下文。[I]
- V2 把工具返回值 typed 化，符合 V2 tools spec 的 materialize/settle 分层：工具定义可以返回 domain output，settlement 再统一处理 projection 和 output bounding。[E: specs/v2/tools.md:135][E: specs/v2/tools.md:153]
- 当 `pattern` 本身错误或过宽时，权限系统只知道 action/resource，不会证明 pattern 的语义安全；这是 glob/grep 这类 search tool 的共同边界。[I]

## Sources

- `packages/opencode/src/tool/glob.ts`
- `packages/core/src/tool/glob.ts`
- `packages/core/src/filesystem.ts`
- `packages/core/src/ripgrep.ts`
- `packages/opencode/src/tool/registry.ts`
- `packages/core/src/tool/builtins.ts`
- `specs/v2/tools.md`

## 相关

- [文件系统搜索](../../subsystems/persistence/filesystem-search.md)
- [工具目录](../../reference/tool-catalog.md)
