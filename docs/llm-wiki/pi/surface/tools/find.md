---
id: surface.tools.find
title: find 文件查找工具
kind: tool
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/find.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/tools/path-utils.ts
  - packages/coding-agent/src/core/tools/truncate.ts
  - packages/coding-agent/src/utils/tools-manager.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/types.ts
  - packages/agent/src/agent-loop.ts
  - packages/coding-agent/test/tools.test.ts
  - packages/coding-agent/test/plan-mode-extension.test.ts
  - packages/coding-agent/test/suite/regressions/3302-find-path-glob.test.ts
  - packages/coding-agent/test/suite/regressions/3303-find-nested-gitignore.test.ts
symbols:
  - createFindTool
  - FindToolInput
  - FindToolDetails
related:
  - subsys.coding-agent.output-truncation
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 5a073885
---

> `find` 是 pi-coding-agent 暴露给模型的文件路径搜索工具:模型给 glob pattern 和可选搜索目录,工具返回相对搜索目录的匹配路径列表。

## 能回答的问题

- `find` 的 wire name、TypeBox input schema、默认 limit 是什么?
- `find` 使用 `fd` 时怎样处理 hidden files、`.gitignore`、包含 `/` 的 glob pattern?
- `FindToolDetails` 里有哪些 structured details,有没有 `fullOutputPath`?
- `find` 的 `executionMode` 是 sequential 还是 parallel?
- `find` 怎样注册进内置工具目录,又怎样进入 `AgentSession` runtime?
- custom `FindOperations.glob` 和默认本地 `fd` 路径有什么差异?

## 1 Identity

`createFindToolDefinition(cwd, options?)` 创建 coding-agent 层的 `ToolDefinition`,其 LLM-facing `name` 和 UI `label` 都是 `"find"` [E: packages/coding-agent/src/core/tools/find.ts:112] [E: packages/coding-agent/src/core/tools/find.ts:115] [E: packages/coding-agent/src/core/tools/find.ts:116]. `createFindTool(cwd, options?)` 再用 `wrapToolDefinition` 把这个 definition 适配成 agent-core 的 `AgentTool` [E: packages/coding-agent/src/core/tools/find.ts:372] [E: packages/coding-agent/src/core/tools/find.ts:373].

`find` 属于 `pi-coding-agent` 的内置工具集,但实际 tool-call 执行批次由 `pi-agent-core` 的 agent loop 调度;这个跨包边界是 `ToolDefinition -> AgentTool` adapter [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:5] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:16] [I].

## 2 用途定位

`find` 的 description 明确说它按 glob pattern 搜索文件,返回相对搜索目录的路径,遵守 `.gitignore`,并按结果数量或字节数截断输出 [E: packages/coding-agent/src/core/tools/find.ts:117]. 它适合发现文件名/路径,不读取文件内容;文本内容搜索应使用 `grep` [I].

默认实现依赖 `fd`:执行时调用 `ensureTool("fd", true)`,失败时返回错误 `"fd is not available and could not be downloaded"` [E: packages/coding-agent/src/core/tools/find.ts:214] [E: packages/coding-agent/src/core/tools/find.ts:219] [E: packages/coding-agent/src/core/tools/find.ts:220]. `ensureTool` 会先查本地工具目录和系统 PATH,再在非 offline/非 Android 环境尝试下载 [E: packages/coding-agent/src/utils/tools-manager.ts:327] [E: packages/coding-agent/src/utils/tools-manager.ts:90] [E: packages/coding-agent/src/utils/tools-manager.ts:91] [E: packages/coding-agent/src/utils/tools-manager.ts:96] [E: packages/coding-agent/src/utils/tools-manager.ts:98] [E: packages/coding-agent/src/utils/tools-manager.ts:335] [E: packages/coding-agent/src/utils/tools-manager.ts:344] [E: packages/coding-agent/src/utils/tools-manager.ts:357].

## 3 输入 schema 表

`FindToolInput` 是 `Static<typeof findSchema>`,schema 来自 `Type.Object({ pattern, path, limit })` [E: packages/coding-agent/src/core/tools/find.ts:20] [E: packages/coding-agent/src/core/tools/find.ts:28].

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `pattern` | `string` | yes | 无 | TypeBox 只声明 string,未在 schema 层限制 glob 语法 [E: packages/coding-agent/src/core/tools/find.ts:21] | Glob pattern,示例包括 `*.ts`、`**/*.json`、`src/**/*.spec.ts` [E: packages/coding-agent/src/core/tools/find.ts:22]. |
| `path` | `string` | no | `"."` | 运行时把 `path` 交给 `resolveToCwd(searchDir || ".", cwd)` 解析,`resolveToCwd` 再调用 `resolvePath` 并开启 Unicode space normalization 和 `@` prefix stripping [E: packages/coding-agent/src/core/tools/find.ts:24] [E: packages/coding-agent/src/core/tools/find.ts:150] [E: packages/coding-agent/src/core/tools/path-utils.ts:48] [E: packages/coding-agent/src/core/tools/path-utils.ts:49] | 搜索目录,description 写的是默认当前目录 [E: packages/coding-agent/src/core/tools/find.ts:24]. |
| `limit` | `number` | no | `1000` | TypeBox 只声明 number,未声明 minimum/maximum/integer [E: packages/coding-agent/src/core/tools/find.ts:25] | 最大结果数;运行时用 `limit ?? DEFAULT_LIMIT`,其中 `DEFAULT_LIMIT = 1000` [E: packages/coding-agent/src/core/tools/find.ts:30] [E: packages/coding-agent/src/core/tools/find.ts:151]. |

`path` 会通过 `resolveToCwd(searchDir || ".", cwd)` 变成搜索根;`resolveToCwd` 调用 `resolvePath` 并启用 Unicode space normalization 和 `@` prefix stripping [E: packages/coding-agent/src/core/tools/find.ts:150] [E: packages/coding-agent/src/core/tools/path-utils.ts:48] [E: packages/coding-agent/src/core/tools/path-utils.ts:49].

## 4 输出 & 截断

成功时 `find` 返回 `content: [{ type: "text", text: ... }]`;无匹配时文本固定为 `"No files found matching pattern"` 且 `details` 为 `undefined` [E: packages/coding-agent/src/core/tools/find.ts:297] [E: packages/coding-agent/src/core/tools/find.ts:300] [E: packages/coding-agent/src/core/tools/find.ts:301]. 默认 `fd` 路径会把每行结果修剪、去空行、相对化到 search root,并转换成 POSIX slash 输出 [E: packages/coding-agent/src/core/tools/find.ts:307] [E: packages/coding-agent/src/core/tools/find.ts:309] [E: packages/coding-agent/src/core/tools/find.ts:313] [E: packages/coding-agent/src/core/tools/find.ts:316] [E: packages/coding-agent/src/core/tools/find.ts:319].

`FindToolDetails` 只有两个可选字段:`truncation?: TruncationResult` 和 `resultLimitReached?: number`;源码没有 `fullOutputPath` 字段 [E: packages/coding-agent/src/core/tools/find.ts:32] [E: packages/coding-agent/src/core/tools/find.ts:33] [E: packages/coding-agent/src/core/tools/find.ts:34]. `resultLimitReached` 在结果数 `>= effectiveLimit` 时设置为当前 limit [E: packages/coding-agent/src/core/tools/find.ts:322] [E: packages/coding-agent/src/core/tools/find.ts:328] [E: packages/coding-agent/src/core/tools/find.ts:332].

字节截断使用 `truncateHead(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER })`,所以 `find` 禁用了默认 2000 行上限,但仍受 `truncateHead` 默认 `DEFAULT_MAX_BYTES = 50 * 1024` 限制 [E: packages/coding-agent/src/core/tools/find.ts:324] [E: packages/coding-agent/src/core/tools/truncate.ts:11] [E: packages/coding-agent/src/core/tools/truncate.ts:12] [E: packages/coding-agent/src/core/tools/truncate.ts:78] [E: packages/coding-agent/src/core/tools/truncate.ts:80]. 截断或结果数触顶时,工具把 human-readable notice 追加到文本末尾,并只在 `details` 非空时返回 structured details [E: packages/coding-agent/src/core/tools/find.ts:327] [E: packages/coding-agent/src/core/tools/find.ts:329] [E: packages/coding-agent/src/core/tools/find.ts:335] [E: packages/coding-agent/src/core/tools/find.ts:338] [E: packages/coding-agent/src/core/tools/find.ts:343] [E: packages/coding-agent/src/core/tools/find.ts:344].

TUI 渲染层默认只展示前 20 行;展开状态展示全部已返回文本行,若仍有隐藏行则显示 `... (N more lines, to expand)` 提示 [E: packages/coding-agent/src/core/tools/find.ts:88] [E: packages/coding-agent/src/core/tools/find.ts:89] [E: packages/coding-agent/src/core/tools/find.ts:90] [E: packages/coding-agent/src/core/tools/find.ts:93] [E: packages/coding-agent/src/core/tools/find.ts:94]. 这个 UI 折叠不改变 model-visible tool result content [I].

## 5 执行模式

`find` 的 returned `ToolDefinition` 没有显式 `executionMode` 属性,因此 `wrapToolDefinition` 复制到 `AgentTool.executionMode` 时得到的是省略值 [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:15] [E: packages/coding-agent/src/core/extensions/types.ts:461] [I].

agent-core 的 `Agent` 构造器把缺省 `toolExecution` 设为 `"parallel"` [E: packages/agent/src/agent.ts:218],而 `executeToolCalls` 只有在全局配置为 sequential 或批次中任一目标工具 `executionMode === "sequential"` 时才走 sequential 分支 [E: packages/agent/src/agent-loop.ts:381] [E: packages/agent/src/agent-loop.ts:382] [E: packages/agent/src/agent-loop.ts:384] [E: packages/agent/src/agent-loop.ts:387]. 因此,在默认 agent 配置且同批次没有 sequential 工具时,`find` 可以和其他允许并行的工具并发执行 [I].

## 6 注册与装配

`packages/coding-agent/src/core/tools/index.ts` 是内置工具 ground truth:`ToolName` 包含 `"find"`,且 `allToolNames` 的集合也包含 `"find"` [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84]. `find.ts` 的 `createFindTool`、`createFindToolDefinition`、`FindOperations`、`FindToolDetails`、`FindToolInput`、`FindToolOptions` 都从 tools barrel 导出 [E: packages/coding-agent/src/core/tools/index.ts:21] [E: packages/coding-agent/src/core/tools/index.ts:22] [E: packages/coding-agent/src/core/tools/index.ts:23] [E: packages/coding-agent/src/core/tools/index.ts:24] [E: packages/coding-agent/src/core/tools/index.ts:25] [E: packages/coding-agent/src/core/tools/index.ts:26] [E: packages/coding-agent/src/core/tools/index.ts:27] [E: packages/coding-agent/src/core/tools/index.ts:28].

单工具工厂 `createToolDefinition("find", cwd, options)` 委派到 `createFindToolDefinition(cwd, options?.find)`,运行时 `createTool("find", cwd, options)` 委派到 `createFindTool(cwd, options?.find)` [E: packages/coding-agent/src/core/tools/index.ts:96] [E: packages/coding-agent/src/core/tools/index.ts:108] [E: packages/coding-agent/src/core/tools/index.ts:109] [E: packages/coding-agent/src/core/tools/index.ts:117] [E: packages/coding-agent/src/core/tools/index.ts:129] [E: packages/coding-agent/src/core/tools/index.ts:130].

`find` 是 read-only preset 的一员:`createReadOnlyToolDefinitions` 返回 `read`、`grep`、`find`、`ls`,而 `createReadOnlyTools` 返回对应 runtime tools [E: packages/coding-agent/src/core/tools/index.ts:147] [E: packages/coding-agent/src/core/tools/index.ts:149] [E: packages/coding-agent/src/core/tools/index.ts:150] [E: packages/coding-agent/src/core/tools/index.ts:151] [E: packages/coding-agent/src/core/tools/index.ts:152] [E: packages/coding-agent/src/core/tools/index.ts:177] [E: packages/coding-agent/src/core/tools/index.ts:179] [E: packages/coding-agent/src/core/tools/index.ts:180] [E: packages/coding-agent/src/core/tools/index.ts:181] [E: packages/coding-agent/src/core/tools/index.ts:182]. `createAllToolDefinitions` 也把 `find` 放进七个内置 definition 的 record [E: packages/coding-agent/src/core/tools/index.ts:156] [E: packages/coding-agent/src/core/tools/index.ts:163].

`AgentSession._buildRuntime` 在没有 `baseToolsOverride` 时调用 `createAllToolDefinitions(this._cwd, { read: ..., bash: ... })`;这会创建包含 `find` 的内置 definition map,但只给 `read` 和 `bash` 传入 session settings [E: packages/coding-agent/src/core/agent-session.ts:2411] [E: packages/coding-agent/src/core/agent-session.ts:2418] [E: packages/coding-agent/src/core/agent-session.ts:2419] [E: packages/coding-agent/src/core/agent-session.ts:2420]. `_refreshToolRegistry` 随后把 base definitions、extension tools、SDK custom tools 合并,应用 allow/deny 过滤,通过 `wrapRegisteredTools` 适配为 `AgentTool`,最后调用 `setActiveToolsByName` [E: packages/coding-agent/src/core/agent-session.ts:2310] [E: packages/coding-agent/src/core/agent-session.ts:2315] [E: packages/coding-agent/src/core/agent-session.ts:2318] [E: packages/coding-agent/src/core/agent-session.ts:2321] [E: packages/coding-agent/src/core/agent-session.ts:2326] [E: packages/coding-agent/src/core/agent-session.ts:2337] [E: packages/coding-agent/src/core/agent-session.ts:2361] [E: packages/coding-agent/src/core/agent-session.ts:2362] [E: packages/coding-agent/src/core/agent-session.ts:2372] [E: packages/coding-agent/src/core/agent-session.ts:2400].

默认 active built-in tools 是 `read`、`bash`、`edit`、`write`,所以普通 startup 不一定主动暴露 `find`;但 `find` 已在 registry 中,可由模式/扩展/配置激活 [E: packages/coding-agent/src/core/agent-session.ts:2447] [E: packages/coding-agent/src/core/agent-session.ts:2449] [E: packages/coding-agent/src/core/agent-session.ts:2450] [I]. plan-mode 示例测试显示进入 plan mode 时 active tools 包含 `grep`、`find`、`ls` 和 `questionnaire` [E: packages/coding-agent/test/plan-mode-extension.test.ts:111] [E: packages/coding-agent/test/plan-mode-extension.test.ts:113] [E: packages/coding-agent/test/plan-mode-extension.test.ts:119].

## 7 execute() 走读

1. `execute` 先处理 `AbortSignal`:已 aborted 立即 reject,运行中 abort 会调用 `stopChild?.()` 并 reject `"Operation aborted"` [E: packages/coding-agent/src/core/tools/find.ts:120] [E: packages/coding-agent/src/core/tools/find.ts:127] [E: packages/coding-agent/src/core/tools/find.ts:128] [E: packages/coding-agent/src/core/tools/find.ts:129] [E: packages/coding-agent/src/core/tools/find.ts:142] [E: packages/coding-agent/src/core/tools/find.ts:143] [E: packages/coding-agent/src/core/tools/find.ts:144].
2. 搜索根由 `resolveToCwd(searchDir || ".", cwd)` 得到,limit 由 `limit ?? DEFAULT_LIMIT` 得到,operations 由 `options?.operations` 或默认本地 operations 得到 [E: packages/coding-agent/src/core/tools/find.ts:150] [E: packages/coding-agent/src/core/tools/find.ts:151] [E: packages/coding-agent/src/core/tools/find.ts:152].
3. 如果传入 custom operations 且有 `glob`,工具先用 `ops.exists(searchPath)` 校验路径,再调用 `ops.glob(pattern, searchPath, { ignore: ["**/node_modules/**", "**/.git/**"], limit })` [E: packages/coding-agent/src/core/tools/find.ts:155] [E: packages/coding-agent/src/core/tools/find.ts:156] [E: packages/coding-agent/src/core/tools/find.ts:164] [E: packages/coding-agent/src/core/tools/find.ts:165] [E: packages/coding-agent/src/core/tools/find.ts:166].
4. custom `glob` 返回值会相对化到 search root 并转换为 POSIX slash;若结果数达到 limit,也会设置 `resultLimitReached` 并附加 notice [E: packages/coding-agent/src/core/tools/find.ts:183] [E: packages/coding-agent/src/core/tools/find.ts:184] [E: packages/coding-agent/src/core/tools/find.ts:185] [E: packages/coding-agent/src/core/tools/find.ts:187] [E: packages/coding-agent/src/core/tools/find.ts:193] [E: packages/coding-agent/src/core/tools/find.ts:195].
5. 默认本地路径调用 `fd` 时,参数起始为 `--glob --color=never --hidden`,随后根据 git repo 检测决定是否追加 `--no-require-git`,再追加 `--max-results <limit>` [E: packages/coding-agent/src/core/tools/find.ts:224] [E: packages/coding-agent/src/core/tools/find.ts:230] [E: packages/coding-agent/src/core/tools/find.ts:232] [E: packages/coding-agent/src/core/tools/find.ts:240] [E: packages/coding-agent/src/core/tools/find.ts:241].
6. 包含 `/` 的 pattern 会启用 `--full-path`;如果不是绝对路径、不是以 `**/` 开头且不等于 `"**"`,实现会把 effective pattern 改写为 `**/${pattern}` [E: packages/coding-agent/src/core/tools/find.ts:247] [E: packages/coding-agent/src/core/tools/find.ts:248] [E: packages/coding-agent/src/core/tools/find.ts:249] [E: packages/coding-agent/src/core/tools/find.ts:250].
7. 最终 spawn 使用 `spawn(fdPath, args, { stdio: ["ignore", "pipe", "pipe"] })`;stdout 按行收集,stderr 累积,非零退出且无 stdout 时 reject stderr 或 `fd exited with code <code>` [E: packages/coding-agent/src/core/tools/find.ts:253] [E: packages/coding-agent/src/core/tools/find.ts:255] [E: packages/coding-agent/src/core/tools/find.ts:256] [E: packages/coding-agent/src/core/tools/find.ts:270] [E: packages/coding-agent/src/core/tools/find.ts:274] [E: packages/coding-agent/src/core/tools/find.ts:290] [E: packages/coding-agent/src/core/tools/find.ts:291] [E: packages/coding-agent/src/core/tools/find.ts:293].

## 8 设计动机与 edge

- Hidden files:默认 `fd` args 包含 `--hidden`,所以未被 ignore 的 dotfile/dotdir 可以出现在结果中 [E: packages/coding-agent/src/core/tools/find.ts:224]. 测试覆盖 `.secret/hidden.txt` 会被 `**/*.txt` 找到 [E: packages/coding-agent/test/tools.test.ts:826] [E: packages/coding-agent/test/tools.test.ts:832] [E: packages/coding-agent/test/tools.test.ts:843].
- `.gitignore`:默认路径依赖 `fd` 的 ignore 语义;测试覆盖 root `.gitignore` 会排除 `ignored.txt` 且保留 `kept.txt` [E: packages/coding-agent/test/tools.test.ts:846] [E: packages/coding-agent/test/tools.test.ts:851] [E: packages/coding-agent/test/tools.test.ts:857] [E: packages/coding-agent/test/tools.test.ts:858].
- 非 git repo 的 ignore:实现只在 search root 的父链上找不到 `.git` 时追加 `--no-require-git`,让 `fd` 在非 repo 目录也读取 `.gitignore` [E: packages/coding-agent/src/core/tools/find.ts:230] [E: packages/coding-agent/src/core/tools/find.ts:232] [E: packages/coding-agent/src/core/tools/find.ts:240] [I].
- Nested ignore scope:默认路径显式做的是父链 `.git` 检测,并据此决定是否加 `--no-require-git`;回归测试要求 `a/.gitignore` 只影响 `a/` 而不影响 `b/` [E: packages/coding-agent/src/core/tools/find.ts:230] [E: packages/coding-agent/src/core/tools/find.ts:232] [E: packages/coding-agent/src/core/tools/find.ts:240] [E: packages/coding-agent/test/suite/regressions/3303-find-nested-gitignore.test.ts:52] [E: packages/coding-agent/test/suite/regressions/3303-find-nested-gitignore.test.ts:54].
- Path-containing glob:包含 `/` 的 pattern 会触发 `--full-path` 和可能的 `**/` 前缀改写;回归测试覆盖 `src/**/*.spec.ts` 匹配 nested spec 文件 [E: packages/coding-agent/src/core/tools/find.ts:247] [E: packages/coding-agent/src/core/tools/find.ts:248] [E: packages/coding-agent/src/core/tools/find.ts:249] [E: packages/coding-agent/src/core/tools/find.ts:250] [E: packages/coding-agent/test/suite/regressions/3302-find-path-glob.test.ts:68] [E: packages/coding-agent/test/suite/regressions/3302-find-path-glob.test.ts:70].
- Flag-like pattern:默认实现用 `args.push("--", effectivePattern, searchPath)`,所以像 `"--help"` 这样的 pattern 作为搜索 pattern 而不是 fd flag;测试覆盖 `"--help"` 返回无匹配文本 [E: packages/coding-agent/src/core/tools/find.ts:253] [E: packages/coding-agent/test/tools.test.ts:870] [E: packages/coding-agent/test/tools.test.ts:872] [E: packages/coding-agent/test/tools.test.ts:876].
- glob parse error:如果 fd 对 pattern 报错且没有 stdout,工具 reject fd 的错误消息;测试覆盖非法 pattern `"["` 会 surface fd glob parse error [E: packages/coding-agent/src/core/tools/find.ts:290] [E: packages/coding-agent/src/core/tools/find.ts:291] [E: packages/coding-agent/src/core/tools/find.ts:293] [E: packages/coding-agent/test/tools.test.ts:861] [E: packages/coding-agent/test/tools.test.ts:864] [E: packages/coding-agent/test/tools.test.ts:867].
- Directory trailing slash:默认路径记录 raw line 是否以 `/` 或 `\` 结尾,相对化后若原本有 trailing slash 会补回 `/`,再统一转换为 POSIX path [E: packages/coding-agent/src/core/tools/find.ts:311] [E: packages/coding-agent/src/core/tools/find.ts:318] [E: packages/coding-agent/src/core/tools/find.ts:319].
- Custom operations:custom `FindOperations` 提供 `exists` 和 `glob` 两个可插拔函数,因此可接入本地 `fd` 以外的文件查找后端 [E: packages/coding-agent/src/core/tools/find.ts:41] [E: packages/coding-agent/src/core/tools/find.ts:43] [E: packages/coding-agent/src/core/tools/find.ts:45] [I]. custom path 不调用 `fd`,也不会自动使用 `--hidden`/`.gitignore`;它只收到 ignore hint 和 limit,具体语义由实现者负责 [E: packages/coding-agent/src/core/tools/find.ts:155] [E: packages/coding-agent/src/core/tools/find.ts:164] [E: packages/coding-agent/src/core/tools/find.ts:165] [I].

## 跨包关系

- [subsys.coding-agent.output-truncation](../../subsystems/coding-agent/output-truncation.md):`find` 复用 `truncateHead` 和 `TruncationResult`,但本节点只说明 `find` 怎样设置 `maxLines: Number.MAX_SAFE_INTEGER` 和何时填 `FindToolDetails.truncation` [E: packages/coding-agent/src/core/tools/truncate.ts:15] [E: packages/coding-agent/src/core/tools/find.ts:33] [E: packages/coding-agent/src/core/tools/find.ts:189] [E: packages/coding-agent/src/core/tools/find.ts:324].
- [ref.tools-catalog](../../reference/tools-catalog.md):`find` 的内置工具身份以 tools catalog 的 `ToolName`、`allToolNames`、`createAllToolDefinitions` 为 ground truth;本节点只展开单个 `find` 的 schema 和执行行为 [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84] [E: packages/coding-agent/src/core/tools/index.ts:156].

## Sources

- packages/coding-agent/src/core/tools/find.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/tools/path-utils.ts
- packages/coding-agent/src/core/tools/truncate.ts
- packages/coding-agent/src/utils/tools-manager.ts
- packages/agent/src/agent.ts
- packages/agent/src/types.ts
- packages/agent/src/agent-loop.ts
- packages/coding-agent/test/tools.test.ts
- packages/coding-agent/test/plan-mode-extension.test.ts
- packages/coding-agent/test/suite/regressions/3302-find-path-glob.test.ts
- packages/coding-agent/test/suite/regressions/3303-find-nested-gitignore.test.ts

## 相关

- [subsys.coding-agent.output-truncation](../../subsystems/coding-agent/output-truncation.md)
- [ref.tools-catalog](../../reference/tools-catalog.md)
