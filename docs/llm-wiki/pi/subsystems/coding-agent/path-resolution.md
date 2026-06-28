---
id: subsys.coding-agent.path-resolution
title: 路径解析与 macOS 变体
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/path-utils.ts
symbols:
  - resolveReadPathAsync
  - expandPath
related:
  - surface.tools.read
evidence: explicit
status: verified
updated: 5a073885
---

> 路径解析子系统把工具输入里的路径字符串做规范化或解析为 cwd 下的绝对路径, 并只在 read/@file 场景额外尝试 macOS 截图与 Unicode 文件名变体。

## 能回答的问题

- `read` 为什么能读到 macOS 截图文件名里的窄不换行空格、NFD accent 或 curly apostrophe?
- `edit`、`write`、`find`、`ls`、`grep` 是否也会尝试 read 的 macOS 路径变体?
- `~`、`~/x`、`~draft.md`、`@file`、`file://`、绝对路径和相对路径分别如何解析?
- 当前源码里有没有 `resolveToolPath` 这个统一入口?
- 路径解析有没有做大小写不敏感的文件名纠正?
- CLI `@file` 附件和模型可见 `read` tool 是否使用同一套 read path fallback?

## 职责边界

`packages/coding-agent/src/core/tools/path-utils.ts` 是 core tools 的轻量路径入口: `expandPath()` 只做字符串级 path input normalization, `resolveToCwd()` 把输入解析成 cwd 下的绝对路径, `resolveReadPath()`/`resolveReadPathAsync()` 在普通 cwd 解析失败后继续尝试 read-only 文件名变体 [E: packages/coding-agent/src/core/tools/path-utils.ts:40] [E: packages/coding-agent/src/core/tools/path-utils.ts:48] [E: packages/coding-agent/src/core/tools/path-utils.ts:52] [E: packages/coding-agent/src/core/tools/path-utils.ts:86]。

本节点不覆盖 edit diff、write mkdir、find/grep 外部命令、ls 排序或输出截断; 那些工具只把本子系统给出的绝对路径当作执行前置输入 [E: packages/coding-agent/src/core/tools/edit.ts:310] [E: packages/coding-agent/src/core/tools/write.ts:201] [E: packages/coding-agent/src/core/tools/find.ts:150] [E: packages/coding-agent/src/core/tools/ls.ts:124] [E: packages/coding-agent/src/core/tools/grep.ts:178]。

当前源码没有名为 `resolveToolPath` 的导出或调用; index symbols 也只把 `resolveReadPathAsync` 与 `expandPath` 标为本节点权威符号, 因此本文把“resolveToolPath”视为旧名/需求侧名称漂移而不是一个可引用 symbol [U]。

## 关键文件

- `packages/coding-agent/src/core/tools/path-utils.ts`: 工具侧路径入口, 定义 macOS screenshot AM/PM variant、NFD variant、curly quote variant、`pathExists()`、`expandPath()`、`resolveToCwd()`、同步/异步 read path fallback [E: packages/coding-agent/src/core/tools/path-utils.ts:7] [E: packages/coding-agent/src/core/tools/path-utils.ts:11] [E: packages/coding-agent/src/core/tools/path-utils.ts:16] [E: packages/coding-agent/src/core/tools/path-utils.ts:31] [E: packages/coding-agent/src/core/tools/path-utils.ts:40] [E: packages/coding-agent/src/core/tools/path-utils.ts:48] [E: packages/coding-agent/src/core/tools/path-utils.ts:52] [E: packages/coding-agent/src/core/tools/path-utils.ts:86]。
- `packages/coding-agent/src/utils/paths.ts`: 底层 path input normalization 与 `resolvePath()`, 负责 Unicode space 替换、可选 `@` 前缀剥离、tilde expansion、`file://` URL 转路径、absolute/relative 分派 [E: packages/coding-agent/src/utils/paths.ts:57] [E: packages/coding-agent/src/utils/paths.ts:59] [E: packages/coding-agent/src/utils/paths.ts:62] [E: packages/coding-agent/src/utils/paths.ts:66] [E: packages/coding-agent/src/utils/paths.ts:74] [E: packages/coding-agent/src/utils/paths.ts:81]。
- `packages/coding-agent/src/core/tools/read.ts`: 模型可见 `read` tool 的执行路径调用 `resolveReadPathAsync(path, cwd)`, 因此 read 享有 macOS/Unicode fallback [E: packages/coding-agent/src/core/tools/read.ts:238]。
- `packages/coding-agent/src/cli/file-processor.ts`: CLI `@file` 参数调用同步 `resolveReadPath(fileArg, process.cwd())`, 因此 `@file` 附件也复用 read fallback [E: packages/coding-agent/src/cli/file-processor.ts:31]。
- `packages/coding-agent/test/path-utils.test.ts`: 行为测试覆盖 tilde、Unicode space、cwd 解析、NFD、curly apostrophe、AM/PM narrow no-break space 与 lowercase am/pm [E: packages/coding-agent/test/path-utils.test.ts:11] [E: packages/coding-agent/test/path-utils.test.ts:20] [E: packages/coding-agent/test/path-utils.test.ts:28] [E: packages/coding-agent/test/path-utils.test.ts:41] [E: packages/coding-agent/test/path-utils.test.ts:101] [E: packages/coding-agent/test/path-utils.test.ts:123] [E: packages/coding-agent/test/path-utils.test.ts:153] [E: packages/coding-agent/test/path-utils.test.ts:168]。

## 数据模型与函数

`PathInputOptions` 属于底层 `utils/paths.ts`, 可配置 `trim`、`expandTilde`、`homeDir`、`stripAtPrefix`、`normalizeUnicodeSpaces`; tools path-utils 调用时固定启用 `normalizeUnicodeSpaces: true` 和 `stripAtPrefix: true` [E: packages/coding-agent/src/utils/paths.ts:11] [E: packages/coding-agent/src/utils/paths.ts:13] [E: packages/coding-agent/src/utils/paths.ts:15] [E: packages/coding-agent/src/utils/paths.ts:17] [E: packages/coding-agent/src/utils/paths.ts:19] [E: packages/coding-agent/src/core/tools/path-utils.ts:41] [E: packages/coding-agent/src/core/tools/path-utils.ts:49]。

`expandPath(filePath)` 调 `normalizePath(filePath, { normalizeUnicodeSpaces: true, stripAtPrefix: true })`, 不接受 cwd, 因此它适合把 `@foo`、Unicode space 和 `~` 处理成展示/后续输入, 但不会把相对路径变成绝对路径 [E: packages/coding-agent/src/core/tools/path-utils.ts:40] [E: packages/coding-agent/src/core/tools/path-utils.ts:41] [E: packages/coding-agent/src/utils/paths.ts:78]。

`resolveToCwd(filePath, cwd)` 调 `resolvePath(filePath, cwd, { normalizeUnicodeSpaces: true, stripAtPrefix: true })`, 并由 `resolvePath()` 在绝对路径与相对路径之间分派: absolute input 直接 `nodeResolvePath(normalized)`, relative input 走 `nodeResolvePath(normalizedBaseDir, normalized)` [E: packages/coding-agent/src/core/tools/path-utils.ts:48] [E: packages/coding-agent/src/core/tools/path-utils.ts:49] [E: packages/coding-agent/src/utils/paths.ts:81] [E: packages/coding-agent/src/utils/paths.ts:84]。

`resolveReadPath(filePath, cwd)` 是同步 read resolver: 先 `resolveToCwd()`, 若存在即返回; 否则按 AM/PM narrow no-break space、NFD、curly quote、NFD+curly quote 顺序探测, 最后返回原始 resolved path 供调用方报错 [E: packages/coding-agent/src/core/tools/path-utils.ts:52] [E: packages/coding-agent/src/core/tools/path-utils.ts:53] [E: packages/coding-agent/src/core/tools/path-utils.ts:55] [E: packages/coding-agent/src/core/tools/path-utils.ts:60] [E: packages/coding-agent/src/core/tools/path-utils.ts:66] [E: packages/coding-agent/src/core/tools/path-utils.ts:72] [E: packages/coding-agent/src/core/tools/path-utils.ts:78] [E: packages/coding-agent/src/core/tools/path-utils.ts:83]。

`resolveReadPathAsync(filePath, cwd)` 与同步版本同构, 但存在性检查用 async `pathExists()`; `read` tool 使用异步版本, CLI `@file` 使用同步版本 [E: packages/coding-agent/src/core/tools/path-utils.ts:86] [E: packages/coding-agent/src/core/tools/path-utils.ts:89] [E: packages/coding-agent/src/core/tools/read.ts:238] [E: packages/coding-agent/src/cli/file-processor.ts:31]。

## 控制流

1. `expandPath@packages/coding-agent/src/core/tools/path-utils.ts:40` 进入 `normalizePath()`: 如果启用 `normalizeUnicodeSpaces`, U+00A0、U+2000 到 U+200A、U+202F、U+205F、U+3000 都替换成普通空格 [E: packages/coding-agent/src/utils/paths.ts:7] [E: packages/coding-agent/src/utils/paths.ts:59] [E: packages/coding-agent/src/utils/paths.ts:60]。
2. `normalizePath@packages/coding-agent/src/utils/paths.ts:57` 在 `stripAtPrefix` 为 true 且字符串以 `@` 开头时剥掉一个 leading `@`, 用于 CLI/file-reference 风格路径输入 [E: packages/coding-agent/src/utils/paths.ts:17] [E: packages/coding-agent/src/utils/paths.ts:62] [E: packages/coding-agent/src/utils/paths.ts:63]。
3. `normalizePath@packages/coding-agent/src/utils/paths.ts:57` 只把 `"~"` 和 `"~/"` 扩展到 home directory; `~draft.md` 保持字面文件名, 测试同时验证 `@~draft.md` 先剥 `@` 后仍作为 cwd 下的 `~draft.md` [E: packages/coding-agent/src/utils/paths.ts:66] [E: packages/coding-agent/src/utils/paths.ts:68] [E: packages/coding-agent/src/utils/paths.ts:69] [E: packages/coding-agent/test/path-utils.test.ts:20] [E: packages/coding-agent/test/path-utils.test.ts:21] [E: packages/coding-agent/test/path-utils.test.ts:46] [E: packages/coding-agent/test/path-utils.test.ts:47]。
4. `normalizePath@packages/coding-agent/src/utils/paths.ts:57` 若输入匹配 `file://`, 用 `fileURLToPath()` 转成本地路径; `resolvePath()` 再对该结果做 absolute/relative resolution [E: packages/coding-agent/src/utils/paths.ts:74] [E: packages/coding-agent/src/utils/paths.ts:75] [E: packages/coding-agent/src/utils/paths.ts:81]。
5. `resolveToCwd@packages/coding-agent/src/core/tools/path-utils.ts:48` 经 `resolvePath()` 把 absolute path 保持为 absolute resolution, 把 relative path 拼到 cwd 下; 测试分别断言 absolute path as-is 与 `relative/file.txt` 解析到 `/some/cwd/relative/file.txt` [E: packages/coding-agent/src/utils/paths.ts:84] [E: packages/coding-agent/test/path-utils.test.ts:35] [E: packages/coding-agent/test/path-utils.test.ts:36] [E: packages/coding-agent/test/path-utils.test.ts:40] [E: packages/coding-agent/test/path-utils.test.ts:41]。
6. `resolveReadPathAsync@packages/coding-agent/src/core/tools/path-utils.ts:86` 先检查普通 resolved path 是否存在; 命中就直接返回, 所以后续 macOS variant 只在原路径不存在时触发 [E: packages/coding-agent/src/core/tools/path-utils.ts:87] [E: packages/coding-agent/src/core/tools/path-utils.ts:89] [E: packages/coding-agent/src/core/tools/path-utils.ts:90]。
7. `tryMacOSScreenshotPath@packages/coding-agent/src/core/tools/path-utils.ts:7` 把 `" AM."`/`" PM."` 或 lowercase 变体替换成 `U+202F + AM/PM + "."`; 测试覆盖 regular space 输入命中 U+202F 文件名, 以及 lowercase `am` locale case [E: packages/coding-agent/src/core/tools/path-utils.ts:5] [E: packages/coding-agent/src/core/tools/path-utils.ts:8] [E: packages/coding-agent/test/path-utils.test.ts:146] [E: packages/coding-agent/test/path-utils.test.ts:153] [E: packages/coding-agent/test/path-utils.test.ts:156] [E: packages/coding-agent/test/path-utils.test.ts:161] [E: packages/coding-agent/test/path-utils.test.ts:168] [E: packages/coding-agent/test/path-utils.test.ts:171]。
8. `tryNFDVariant@packages/coding-agent/src/core/tools/path-utils.ts:11` 对整个 resolved path 调 `.normalize("NFD")`; 测试用 NFC 输入和 NFD 文件名验证 fallback 可找到 accented filename variant [E: packages/coding-agent/src/core/tools/path-utils.ts:11] [E: packages/coding-agent/src/core/tools/path-utils.ts:13] [E: packages/coding-agent/test/path-utils.test.ts:89] [E: packages/coding-agent/test/path-utils.test.ts:91] [E: packages/coding-agent/test/path-utils.test.ts:98] [E: packages/coding-agent/test/path-utils.test.ts:101]。
9. `tryCurlyQuoteVariant@packages/coding-agent/src/core/tools/path-utils.ts:16` 把 straight apostrophe U+0027 替换为 U+2019 right single quotation mark; 测试覆盖 `Capture d'cran.txt` 输入命中 `Capture d\u2019cran.txt` [E: packages/coding-agent/src/core/tools/path-utils.ts:16] [E: packages/coding-agent/src/core/tools/path-utils.ts:19] [E: packages/coding-agent/test/path-utils.test.ts:113] [E: packages/coding-agent/test/path-utils.test.ts:114] [E: packages/coding-agent/test/path-utils.test.ts:120] [E: packages/coding-agent/test/path-utils.test.ts:123] [E: packages/coding-agent/test/path-utils.test.ts:124]。
10. `resolveReadPathAsync@packages/coding-agent/src/core/tools/path-utils.ts:86` 最后尝试 `tryCurlyQuoteVariant(nfdVariant)`, 因此会尝试 NFD 与 curly apostrophe 的组合候选; 测试另覆盖 French screenshot 风格 straight apostrophe 输入命中 curly apostrophe 文件名 [E: packages/coding-agent/src/core/tools/path-utils.ts:112] [E: packages/coding-agent/src/core/tools/path-utils.ts:113] [E: packages/coding-agent/test/path-utils.test.ts:130] [E: packages/coding-agent/test/path-utils.test.ts:131] [E: packages/coding-agent/test/path-utils.test.ts:137] [E: packages/coding-agent/test/path-utils.test.ts:140] [E: packages/coding-agent/test/path-utils.test.ts:141]。

## 设计动机与权衡

read-specific fallback 是保守设计: `read` 和 CLI `@file` 面向用户手打或粘贴的已有文件名, 所以当原路径不存在时额外尝试 macOS screenshot/Unicode 变体; mutation/search tools 使用 `resolveToCwd()` 后由各自 access/stat/external command 报错, 避免把写入或搜索悄悄重定向到另一个相似路径 [E: packages/coding-agent/src/core/tools/read.ts:238] [E: packages/coding-agent/src/cli/file-processor.ts:31] [E: packages/coding-agent/src/core/tools/edit.ts:310] [E: packages/coding-agent/src/core/tools/write.ts:201] [E: packages/coding-agent/src/core/tools/find.ts:150] [E: packages/coding-agent/src/core/tools/ls.ts:124] [E: packages/coding-agent/src/core/tools/grep.ts:178] [I]。

`resolveReadPath()` 和 `resolveReadPathAsync()` 返回 unresolved absolute path 而不是抛错, 把“是否存在/可读”的错误格式留给调用方: `read` 随后调用 `ops.access(absolutePath)`, CLI `@file` 随后 `access(absolutePath)` 并打印 `File not found` [E: packages/coding-agent/src/core/tools/path-utils.ts:83] [E: packages/coding-agent/src/core/tools/path-utils.ts:117] [E: packages/coding-agent/src/core/tools/read.ts:241] [E: packages/coding-agent/src/cli/file-processor.ts:35] [E: packages/coding-agent/src/cli/file-processor.ts:37]。

大小写处理不是通用 path variant 机制: 源码里唯一的 case-insensitive regex 是 AM/PM token 的 `/ (AM|PM)\./gi`, `ls` 的 case-insensitive 行为只用于排序目录项而不是解析输入路径 [E: packages/coding-agent/src/core/tools/path-utils.ts:8] [E: packages/coding-agent/src/core/tools/ls.ts:150]。

`file://` 支持放在底层 `normalizePath()`, 因此所有经 `resolveToCwd()` 的工具理论上都能接受 file URL 输入; 但 read 的 macOS fallback 是在 file URL 已转成本地路径之后才发生 [E: packages/coding-agent/src/utils/paths.ts:74] [E: packages/coding-agent/src/core/tools/path-utils.ts:87] [I]。

## Gotcha

- `resolveToolPath` 不是当前源码 symbol; 如果别的文档或需求提到它, 应映射到 `resolveToCwd()` 或 read-only 的 `resolveReadPathAsync()` 语义后再继续 [U]。
- `expandPath()` 不等于 `resolveToCwd()`: 前者不会把 `foo.ts` 变成 absolute path, 后者会 [E: packages/coding-agent/src/core/tools/path-utils.ts:40] [E: packages/coding-agent/src/core/tools/path-utils.ts:48]。
- Leading `@` 会被 `expandPath()`/`resolveToCwd()` 剥掉, 但 CLI parser 已经把 `@file` 的 `@` 去掉后再传给 `processFileArguments()`; 因此剥 `@` 是兼容多入口输入, 不是 CLI `@file` 唯一去前缀步骤 [E: packages/coding-agent/src/utils/paths.ts:62] [E: packages/coding-agent/src/cli/args.ts:186] [E: packages/coding-agent/src/cli/args.ts:187] [E: packages/coding-agent/src/cli/file-processor.ts:29]。
- `~draft.md` 是 cwd 下的普通文件名, 不是 home-relative path; 测试对 `expandPath("~draft.md")` 和 `resolveToCwd("~draft.md", cwd)` 都有覆盖 [E: packages/coding-agent/test/path-utils.test.ts:20] [E: packages/coding-agent/test/path-utils.test.ts:46]。
- read fallback 的 AM-PM/NFD/curly/NFD+curly variant 是按顺序短路返回第一个存在的 path; 如果多个变体同时存在, 源码不会做歧义检测 [E: packages/coding-agent/src/core/tools/path-utils.ts:89] [E: packages/coding-agent/src/core/tools/path-utils.ts:95] [E: packages/coding-agent/src/core/tools/path-utils.ts:101] [E: packages/coding-agent/src/core/tools/path-utils.ts:107] [E: packages/coding-agent/src/core/tools/path-utils.ts:113] [I]。
- `edit` 和 `write` 在 resolved absolute path 上进入 `withFileMutationQueue()`, 但该队列的 realpath/symlink 行为属于文件变更串行化节点, 不是本节点的 path variant 解析 [E: packages/coding-agent/src/core/tools/edit.ts:310] [E: packages/coding-agent/src/core/tools/edit.ts:312] [E: packages/coding-agent/src/core/tools/write.ts:201] [E: packages/coding-agent/src/core/tools/write.ts:203] [I]。

## 跨包边界

[surface.tools.read](../../surface/tools/read.md) 是模型可见 read tool 的入口节点: 它覆盖 `createReadToolDefinition()` 的 schema、image/text 输出和 truncation; 本节点只解释该 tool 在执行前如何把 `path` 变成 `absolutePath` [E: packages/coding-agent/src/core/tools/read.ts:203] [E: packages/coding-agent/src/core/tools/read.ts:238]。

`packages/coding-agent/src/utils/paths.ts` 在 pi-coding-agent 包内提供更通用的 path helpers, 也被 settings、resource loader、main/export 等非 tool 代码使用; 本节点只覆盖 tools 调用时启用的 `normalizeUnicodeSpaces` 与 `stripAtPrefix` 组合 [E: packages/coding-agent/src/core/settings-manager.ts:188] [E: packages/coding-agent/src/core/resource-loader.ts:89] [E: packages/coding-agent/src/main.ts:166] [E: packages/coding-agent/src/core/export-html/index.ts:290] [E: packages/coding-agent/src/core/tools/path-utils.ts:41] [E: packages/coding-agent/src/core/tools/path-utils.ts:49]。

`pi-agent-core` 不参与本文件的 path resolution: `read` 的 cwd/path normalization 在 pi-coding-agent tool implementation 内完成, 然后才进入后续文件访问 [E: packages/coding-agent/src/core/tools/read.ts:238] [E: packages/coding-agent/src/core/tools/read.ts:241] [I]。

## Sources

- packages/coding-agent/src/core/tools/path-utils.ts
- packages/coding-agent/src/utils/paths.ts
- packages/coding-agent/src/core/tools/read.ts
- packages/coding-agent/src/core/tools/edit.ts
- packages/coding-agent/src/core/tools/write.ts
- packages/coding-agent/src/core/tools/find.ts
- packages/coding-agent/src/core/tools/ls.ts
- packages/coding-agent/src/core/tools/grep.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/core/export-html/index.ts
- packages/coding-agent/src/cli/file-processor.ts
- packages/coding-agent/src/cli/args.ts
- packages/coding-agent/test/path-utils.test.ts

## 相关

- [surface.tools.read](../../surface/tools/read.md): 模型可见 `read` tool 的 schema、执行、image/text 输出和截断; 它是唯一直接调用 `resolveReadPathAsync()` 的内置 tool。
