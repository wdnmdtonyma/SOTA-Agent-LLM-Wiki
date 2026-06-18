---
id: integrations.formatters
title: Formatter integration
kind: subsystem
tier: T2
v: v1
status: verified
updated: 355a0bcf5
source:
  - packages/opencode/src/format/formatter.ts
  - packages/opencode/src/format/index.ts
  - packages/opencode/src/tool/edit.ts
  - packages/opencode/src/tool/write.ts
  - packages/opencode/src/tool/apply_patch.ts
  - packages/core/src/v1/config/formatter.ts
symbols:
  - Formatter.Info
  - Format.Service
  - ConfigFormatterV1.Info
related:
  - ref.formatters
  - tool.edit
evidence: explicit
---

> Formatter integration 是 V1 live 的文件保存后格式化层；它按扩展名、项目状态和外部工具可用性选择 formatter，在 edit/write/apply_patch 后运行外部命令，然后让 LSP 重新读取 diagnostics。

## 能回答的问题

- V1 formatter 如何从内建 catalog 和 config 合成最终 formatter map。
- formatter 是否按文件扩展名匹配，如何检测 prettier/ruff/biome 等是否可用。
- edit/write/apply_patch 后什么时候触发 formatter。
- 为什么当前源码内建 formatter 数量是 26，而不是外部提示里的 27。

## 职责

`packages/opencode/src/format/formatter.ts` 定义每个内建 formatter 的 `Info`：`name`、可选 `environment`、`extensions`、必填 `enabled(context)`；运行时 command 由 `enabled` 返回 string array 或 false。[E: packages/opencode/src/format/formatter.ts:11] [E: packages/opencode/src/format/formatter.ts:15] `packages/opencode/src/format/index.ts` 定义 `Format.Service`，负责加载配置、选择 formatter、缓存可用命令、执行格式化命令、提供 status/file API。[E: packages/opencode/src/format/index.ts:21]

当前 HEAD 的 `Formatter` object 我按源码条目计数为 26 个内建 formatter。[I] 起始条目是 `gofmt`，末尾条目是 `dfmt`。[E: packages/opencode/src/format/formatter.ts:18] [E: packages/opencode/src/format/formatter.ts:396] 如果外部引用写 27，应以当前源码为准。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/opencode/src/format/formatter.ts` | 内建 formatter catalog。 |
| `packages/opencode/src/format/index.ts` | formatter service、config merge、command execution。 |
| `packages/opencode/src/tool/edit.ts` | edit tool 修改文件后触发 formatter。 |
| `packages/opencode/src/tool/write.ts` | write tool 写文件后触发 formatter。 |
| `packages/opencode/src/tool/apply_patch.ts` | apply_patch 后对 edited files 触发 formatter。 |
| `packages/core/src/v1/config/formatter.ts` | V1 formatter config schema。 |

## 数据模型

`Formatter.Info` 的 `enabled(ctx)` 可以动态检测项目状态；`Context` 提供 `directory`、`worktree` 和 `experimentalOxfmt`。[E: packages/opencode/src/format/formatter.ts:7] [E: packages/opencode/src/format/formatter.ts:15] V1 formatter config `Entry` 支持 `disabled`、`command`、`environment`、`extensions`，其中 `command` 属于 config entry 而不是内建 `Formatter.Info` 字段。[E: packages/core/src/v1/config/formatter.ts:5] [E: packages/core/src/v1/config/formatter.ts:7]

`Format.Status` 输出 formatter name、extensions、enabled boolean。[E: packages/opencode/src/format/index.ts:14] [E: packages/opencode/src/format/index.ts:17] service state 保存 `commands` cache 和 `formatters` map。[E: packages/opencode/src/format/index.ts:40] [E: packages/opencode/src/format/index.ts:41]

## 内建 formatter 机制

`prettier` 支持多种 web/config 文本扩展，并设置 `BUN_BE_BUN=1` 环境变量；它只有在 package.json deps/devDeps 声明 prettier 且 `Npm.which("prettier")` 能解析到 bin 时启用。[E: packages/opencode/src/format/formatter.ts:38] [E: packages/opencode/src/format/formatter.ts:40] [E: packages/opencode/src/format/formatter.ts:43] [E: packages/opencode/src/format/formatter.ts:78] [E: packages/opencode/src/format/formatter.ts:79]

`oxfmt` 需要 `experimentalOxfmt` 开关，并检查项目依赖里的 `oxfmt`。[E: packages/opencode/src/format/formatter.ts:94] [E: packages/opencode/src/format/formatter.ts:101]

`biome` 会向上找 `biome.json` 或 `biome.jsonc` 配置文件。[E: packages/opencode/src/format/formatter.ts:144]

`clang-format` 只有在项目内能找到 `.clang-format` 且 PATH 上有 `clang-format` 时启用。[E: packages/opencode/src/format/formatter.ts:170] [E: packages/opencode/src/format/formatter.ts:172]

`ruff` 会检测 Python 项目配置或依赖；`uv` formatter 会在 ruff 已启用时跳过，避免两个 Python formatter 同时处理同一文件。[E: packages/opencode/src/format/formatter.ts:193] [E: packages/opencode/src/format/formatter.ts:206] [E: packages/opencode/src/format/formatter.ts:240]

## 控制流

### 初始化与 config merge

1. 如果 `cfg.formatter` 是 `false` 或 undefined，service 不启用任何 formatter。[E: packages/opencode/src/format/index.ts:120]
2. service 先载入所有 built-in formatter 到 map。[E: packages/opencode/src/format/index.ts:130]
3. 如果顶层 `cfg.formatter === true`，service 跳过 object merge，保留刚载入的 built-in map；如果顶层是 object，每个 record 会与同名 built-in 用 `mergeDeep` 合并。[E: packages/opencode/src/format/index.ts:134] [E: packages/opencode/src/format/index.ts:149]
4. Python formatter 有联动禁用：config 中 `ruff` 或 `uv` 任一被 disabled 时，service 删除两者；运行时 `uv` 的 enabled predicate 也会在 `ruff.enabled(context)` 成功时跳过。[E: packages/opencode/src/format/index.ts:139] [E: packages/opencode/src/format/index.ts:141] [E: packages/opencode/src/format/formatter.ts:240]
5. `item.disabled` 为真时删除 formatter。[E: packages/opencode/src/format/index.ts:145]
6. custom formatter 如果没有 command 且没有同名 built-in，就会得到 `info.command ?? false` 的 enabled 函数，运行时等价于不可用；如果有同名 built-in 且未覆盖 command，就复用 built-in enabled。[E: packages/opencode/src/format/index.ts:151] [E: packages/opencode/src/format/index.ts:155]

### 文件格式化

1. `file(file)` 调用内部 `formatFile(file)`。[E: packages/opencode/src/format/index.ts:188]
2. `formatFile` 先按 `path.extname(file)` 查找可用 formatter；没有匹配就返回 false。[E: packages/opencode/src/format/index.ts:73]
3. `getFormatter` 先用 extension 过滤候选 formatter，再并行检查 `getCommand(item)` 是否可用。[E: packages/opencode/src/format/index.ts:57] [E: packages/opencode/src/format/index.ts:61]
4. `getCommand` 对每个 formatter name 缓存 command 或 false，避免反复检测。[E: packages/opencode/src/format/index.ts:43]
5. 执行命令时会把 command parts 里的 `$FILE` 替换成当前文件路径。[E: packages/opencode/src/format/index.ts:82]
6. child process cwd 是 `InstanceState.directory`，环境变量使用 formatter 自己的 environment，开启 `extendEnv: true`，并忽略 stdin/stdout/stderr。[E: packages/opencode/src/format/index.ts:83] [E: packages/opencode/src/format/index.ts:86] [E: packages/opencode/src/format/index.ts:90]
7. service 会遍历所有匹配 formatter；spawn error 或 non-zero exit 都只写 log，循环结束后只要存在匹配 formatter 就返回 true，只有没有 formatter 时返回 false。[E: packages/opencode/src/format/index.ts:78] [E: packages/opencode/src/format/index.ts:80] [E: packages/opencode/src/format/index.ts:95] [E: packages/opencode/src/format/index.ts:106] [E: packages/opencode/src/format/index.ts:114]

### 调用点

1. `edit` tool 创建新文件后调用 `format.file(filePath)`。[E: packages/opencode/src/tool/edit.ts:112]
2. `edit` tool 修改已有文件后也调用 `format.file(filePath)`。[E: packages/opencode/src/tool/edit.ts:156]
3. `write` tool 写文件后调用 `format.file(filePath)`。[E: packages/opencode/src/tool/write.ts:65]
4. `apply_patch` 对每个 edited file 调用 `format.file(file)`。[E: packages/opencode/src/tool/apply_patch.ts:253]
5. formatter 之后，edit/write/apply_patch 会继续触发 LSP diagnostics 或 touch flow。[E: packages/opencode/src/tool/edit.ts:197] [E: packages/opencode/src/tool/write.ts:75] [E: packages/opencode/src/tool/apply_patch.ts:269]

## 设计动机与权衡

Formatter selection 是“先扩展名，再项目能力检测”：扩展名过滤降低不相关 formatter 的检测成本，enabled predicate 让 formatter 只在项目确实使用该工具时出现。[I] 这个策略体现在 `getFormatter` 的 extension filter 和 `getCommand` 的 enabled predicate 调用顺序。[E: packages/opencode/src/format/index.ts:57] [E: packages/opencode/src/format/index.ts:43]

format command 以外部 child process 运行，而不是嵌入 formatter library；这保持语言工具链与项目配置一致，但也意味着 command 必须在 PATH 或 package manager 环境中可用。[I] 源码通过 `appProcess.run(ChildProcess.make(...))` 执行 command，并把 stdin/stdout/stderr 设为 ignore。[E: packages/opencode/src/format/index.ts:84] [E: packages/opencode/src/format/index.ts:86] [E: packages/opencode/src/format/index.ts:90]

## 易踩坑

- 当前源码里内建 formatter 是 26 个，不要把旧说明的 27 当事实。[I]
- `cfg.formatter` 未设置时不是“全部默认启用”，而是直接返回空 formatter map。[E: packages/opencode/src/format/index.ts:120]
- `ruff` 与 `uv` 的互斥分两层：config disabled 任一会删除两者，`uv` enabled 会在 ruff 可用时跳过。[E: packages/opencode/src/format/index.ts:139] [E: packages/opencode/src/format/formatter.ts:240]
- `$FILE` 替换发生在 shell command parts 上；formatter command 不是自动获得 stdin 内容。[E: packages/opencode/src/format/index.ts:82] [E: packages/opencode/src/format/index.ts:90]
- 格式化失败不会让 edit/write/apply_patch 直接失败；service 记录 log，并且在存在匹配 formatter 的路径上最终仍返回 true。[E: packages/opencode/src/format/index.ts:95] [E: packages/opencode/src/format/index.ts:106] [E: packages/opencode/src/format/index.ts:114]

## Sources

- packages/opencode/src/format/formatter.ts
- packages/opencode/src/format/index.ts
- packages/opencode/src/tool/edit.ts
- packages/opencode/src/tool/write.ts
- packages/opencode/src/tool/apply_patch.ts
- packages/core/src/v1/config/formatter.ts

## 相关

- ref.formatters
- tool.edit
