---
id: tool.lsp
title: LSP 工具(experimental,V1)
kind: tool
tier: T1
v: v1
source: [packages/opencode/src/tool/lsp.ts, packages/opencode/src/tool/lsp.txt, packages/opencode/src/tool/registry.ts, packages/opencode/src/effect/runtime-flags.ts, packages/opencode/src/tool/external-directory.ts, packages/opencode/src/tool/tool.ts, packages/core/src/tool/builtins.ts]
symbols: [LspTool]
related: [integrations.lsp, ref.tool-catalog]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> LSP 工具是 V1 experimental code-intelligence tool；它把模型请求映射到 Language Server Protocol definition/references/hover/symbol/call-hierarchy 等操作。

## 能回答的问题

- `lsp` 工具由哪个 env flag 开启？
- LSP tool 支持哪些 operation？
- line/character 是 1-based 还是 0-based？
- `workspaceSymbol` 为什么仍要求 filePath？
- V2 是否已经有 LSP tool？

## 1 Identity

V1 `LspTool` 通过 `Tool.define("lsp", ...)` 注册；V1 registry 初始化 `lsptool`，但只有 `flags.experimentalLspTool` 为 true 时才把 `tool.lsp` 加入 builtin 列表。[E: packages/opencode/src/tool/lsp.ts:37][E: packages/opencode/src/tool/lsp.ts:38][E: packages/opencode/src/tool/registry.ts:97][E: packages/opencode/src/tool/registry.ts:213][E: packages/opencode/src/tool/registry.ts:234] `experimentalLspTool` 来自 `enabledByExperimental("OPENCODE_EXPERIMENTAL_LSP_TOOL")`，所以可由专门 flag 或总开关 `OPENCODE_EXPERIMENTAL` 打开。[E: packages/opencode/src/effect/runtime-flags.ts:10][E: packages/opencode/src/effect/runtime-flags.ts:11][E: packages/opencode/src/effect/runtime-flags.ts:12][E: packages/opencode/src/effect/runtime-flags.ts:13][E: packages/opencode/src/effect/runtime-flags.ts:45]

V2 没有 LSP tool。当前 `BuiltInTools.locationLayer` 的注册列表包含 ApplyPatch/Bash/Edit/Glob/Grep/Question/Read/Skill/TodoWrite/WebFetch/WebSearch/Write，没有注册 LSP。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:33][E: packages/core/src/tool/builtins.ts:34][E: packages/core/src/tool/builtins.ts:35][E: packages/core/src/tool/builtins.ts:36][E: packages/core/src/tool/builtins.ts:37][E: packages/core/src/tool/builtins.ts:38][E: packages/core/src/tool/builtins.ts:39][E: packages/core/src/tool/builtins.ts:40][E: packages/core/src/tool/builtins.ts:41][E: packages/core/src/tool/builtins.ts:42][E: packages/core/src/tool/builtins.ts:43][I]

## 2 用途定位

LSP tool prompt 说明它与 LSP server 交互，提供 go-to-definition、references、hover、document/workspace symbol、implementation 与 call hierarchy 等 code intelligence 功能。[E: packages/opencode/src/tool/lsp.txt:1][E: packages/opencode/src/tool/lsp.txt:4][E: packages/opencode/src/tool/lsp.txt:5][E: packages/opencode/src/tool/lsp.txt:6][E: packages/opencode/src/tool/lsp.txt:7][E: packages/opencode/src/tool/lsp.txt:8][E: packages/opencode/src/tool/lsp.txt:9][E: packages/opencode/src/tool/lsp.txt:10][E: packages/opencode/src/tool/lsp.txt:11][E: packages/opencode/src/tool/lsp.txt:12]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `operation` | literal union | 是 | 无 | 只能是 9 个 supported operations | LSP 操作名。[E: packages/opencode/src/tool/lsp.ts:12][E: packages/opencode/src/tool/lsp.ts:13][E: packages/opencode/src/tool/lsp.ts:14][E: packages/opencode/src/tool/lsp.ts:15][E: packages/opencode/src/tool/lsp.ts:16][E: packages/opencode/src/tool/lsp.ts:17][E: packages/opencode/src/tool/lsp.ts:18][E: packages/opencode/src/tool/lsp.ts:19][E: packages/opencode/src/tool/lsp.ts:20][E: packages/opencode/src/tool/lsp.ts:24] |
| `filePath` | `string` | 是 | 无 | absolute 或 relative；relative resolve 到 instance directory | 用于选择文件和 LSP server。[E: packages/opencode/src/tool/lsp.ts:25][E: packages/opencode/src/tool/lsp.ts:48][E: packages/opencode/src/tool/lsp.ts:77][E: packages/opencode/src/tool/lsp.txt:22] |
| `line` | int | 是 | 无 | `>= 1`，editor-style 1-based | 光标行号。[E: packages/opencode/src/tool/lsp.ts:26][E: packages/opencode/src/tool/lsp.ts:27] |
| `character` | int | 是 | 无 | `>= 1`，editor-style 1-based | 光标字符偏移。[E: packages/opencode/src/tool/lsp.ts:29][E: packages/opencode/src/tool/lsp.ts:30] |
| `query` | optional `string` | 否 | `""` for workspaceSymbol | 仅 workspaceSymbol 真正用作 LSP query | workspace symbol 搜索词。[E: packages/opencode/src/tool/lsp.ts:32][E: packages/opencode/src/tool/lsp.ts:33][E: packages/opencode/src/tool/lsp.ts:93] |

Supported operations 是：`goToDefinition`、`findReferences`、`hover`、`documentSymbol`、`workspaceSymbol`、`goToImplementation`、`prepareCallHierarchy`、`incomingCalls`、`outgoingCalls`。[E: packages/opencode/src/tool/lsp.ts:12][E: packages/opencode/src/tool/lsp.ts:13][E: packages/opencode/src/tool/lsp.ts:14][E: packages/opencode/src/tool/lsp.ts:15][E: packages/opencode/src/tool/lsp.ts:16][E: packages/opencode/src/tool/lsp.ts:17][E: packages/opencode/src/tool/lsp.ts:18][E: packages/opencode/src/tool/lsp.ts:19][E: packages/opencode/src/tool/lsp.ts:20]

## 4 输出 & 大小/截断限制

LSP execute 返回 title、`metadata: { result }` 和 JSON string output；没有结果时 output 是 `No results found for <operation>`。[E: packages/opencode/src/tool/lsp.ts:106][E: packages/opencode/src/tool/lsp.ts:107][E: packages/opencode/src/tool/lsp.ts:108] 专用输出上限不在 `lsp.ts`[I]，V1 通用 `Tool.define` wrapper 会在没有 `metadata.truncated` 时调用通用截断。[E: packages/opencode/src/tool/tool.ts:131][E: packages/opencode/src/tool/tool.ts:135][E: packages/opencode/src/tool/tool.ts:141]

## 5 权限

LSP tool 先调用 `assertExternalDirectoryEffect(ctx, file)`，越界路径会请求 `external_directory` permission；随后请求 `permission: "lsp"`，`patterns` 与 `always` 都是 `["*"]`。[E: packages/opencode/src/tool/lsp.ts:49][E: packages/opencode/src/tool/external-directory.ts:35][E: packages/opencode/src/tool/external-directory.ts:36][E: packages/opencode/src/tool/lsp.ts:56][E: packages/opencode/src/tool/lsp.ts:57][E: packages/opencode/src/tool/lsp.ts:58][E: packages/opencode/src/tool/lsp.ts:59]

## 6 execute() 走读

1. V1 LSP 把 relative `filePath` resolve 到 instance directory，absolute path 直接使用。[E: packages/opencode/src/tool/lsp.ts:47][E: packages/opencode/src/tool/lsp.ts:48]
2. permission metadata 对 `workspaceSymbol` 只写 operation，对 `documentSymbol` 写 operation/filePath，其它操作写 operation/filePath/line/character。[E: packages/opencode/src/tool/lsp.ts:50][E: packages/opencode/src/tool/lsp.ts:52][E: packages/opencode/src/tool/lsp.ts:54][E: packages/opencode/src/tool/lsp.ts:55]
3. LSP URI 通过 `pathToFileURL(file).href` 生成；传给 LSP service 的 position 把 line/character 转成 0-based。[E: packages/opencode/src/tool/lsp.ts:63][E: packages/opencode/src/tool/lsp.ts:64]
4. title 使用 worktree-relative path；workspaceSymbol 没有 detail，documentSymbol 只有 relative path，其它操作是 `path:line:character`。[E: packages/opencode/src/tool/lsp.ts:65][E: packages/opencode/src/tool/lsp.ts:67][E: packages/opencode/src/tool/lsp.ts:68][E: packages/opencode/src/tool/lsp.ts:70][E: packages/opencode/src/tool/lsp.ts:71][E: packages/opencode/src/tool/lsp.ts:72]
5. execute 先检查文件存在，再检查该 file 是否有 LSP client；没有文件或没有 server 都抛错。[E: packages/opencode/src/tool/lsp.ts:74][E: packages/opencode/src/tool/lsp.ts:75][E: packages/opencode/src/tool/lsp.ts:77][E: packages/opencode/src/tool/lsp.ts:78]
6. 调 LSP 操作前会 `lsp.touchFile(file, "document")`。[E: packages/opencode/src/tool/lsp.ts:80]
7. switch 把每个 operation 映射到对应 `LSP.Service` 方法：definition/references/hover/documentSymbol/workspaceSymbol/implementation/prepareCallHierarchy/incomingCalls/outgoingCalls。[E: packages/opencode/src/tool/lsp.ts:85][E: packages/opencode/src/tool/lsp.ts:87][E: packages/opencode/src/tool/lsp.ts:89][E: packages/opencode/src/tool/lsp.ts:91][E: packages/opencode/src/tool/lsp.ts:93][E: packages/opencode/src/tool/lsp.ts:95][E: packages/opencode/src/tool/lsp.ts:97][E: packages/opencode/src/tool/lsp.ts:99][E: packages/opencode/src/tool/lsp.ts:101]

## 7 V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 注册 | `OPENCODE_EXPERIMENTAL_LSP_TOOL` 或 `OPENCODE_EXPERIMENTAL` 开启时暴露。[E: packages/opencode/src/effect/runtime-flags.ts:10][E: packages/opencode/src/effect/runtime-flags.ts:12][E: packages/opencode/src/effect/runtime-flags.ts:13][E: packages/opencode/src/effect/runtime-flags.ts:45][E: packages/opencode/src/tool/registry.ts:234] | V2 shipped built-ins/locationLayer 当前没有注册 LSP。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:33][E: packages/core/src/tool/builtins.ts:34][E: packages/core/src/tool/builtins.ts:35][E: packages/core/src/tool/builtins.ts:36][E: packages/core/src/tool/builtins.ts:37][E: packages/core/src/tool/builtins.ts:38][E: packages/core/src/tool/builtins.ts:39][E: packages/core/src/tool/builtins.ts:40][E: packages/core/src/tool/builtins.ts:41][E: packages/core/src/tool/builtins.ts:42][E: packages/core/src/tool/builtins.ts:43][I] |
| 权限 | `external_directory` + `lsp` permission。[E: packages/opencode/src/tool/lsp.ts:49][E: packages/opencode/src/tool/lsp.ts:56] | shipped built-ins/locationLayer 无 V2 equivalent。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:33][E: packages/core/src/tool/builtins.ts:34][E: packages/core/src/tool/builtins.ts:35][E: packages/core/src/tool/builtins.ts:36][E: packages/core/src/tool/builtins.ts:37][E: packages/core/src/tool/builtins.ts:38][E: packages/core/src/tool/builtins.ts:39][E: packages/core/src/tool/builtins.ts:40][E: packages/core/src/tool/builtins.ts:41][E: packages/core/src/tool/builtins.ts:42][E: packages/core/src/tool/builtins.ts:43][I] |
| 坐标 | schema 是 1-based，execute 转 0-based 给 service。[E: packages/opencode/src/tool/lsp.ts:27][E: packages/opencode/src/tool/lsp.ts:64] | shipped built-ins/locationLayer 无 V2 equivalent。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:33][E: packages/core/src/tool/builtins.ts:34][E: packages/core/src/tool/builtins.ts:35][E: packages/core/src/tool/builtins.ts:36][E: packages/core/src/tool/builtins.ts:37][E: packages/core/src/tool/builtins.ts:38][E: packages/core/src/tool/builtins.ts:39][E: packages/core/src/tool/builtins.ts:40][E: packages/core/src/tool/builtins.ts:41][E: packages/core/src/tool/builtins.ts:42][E: packages/core/src/tool/builtins.ts:43][I] |

## 8 设计动机·edge·历史

`workspaceSymbol` 的 prompt 说明所有 operation 都要求 `filePath`，但 `filePath` 不会进入 LSP workspace/symbol request；opencode 仍要求它，是为了选择并启动匹配的 LSP server。[E: packages/opencode/src/tool/lsp.txt:14][E: packages/opencode/src/tool/lsp.txt:15][E: packages/opencode/src/tool/lsp.txt:22][E: packages/opencode/src/tool/lsp.ts:25] 源码也符合这一点：workspaceSymbol 分支调用 `lsp.workspaceSymbol(args.query ?? "")`，没有传 filePath，但此前已经用 file 做 exists/hasClients/touchFile。[E: packages/opencode/src/tool/lsp.ts:74][E: packages/opencode/src/tool/lsp.ts:77][E: packages/opencode/src/tool/lsp.ts:80][E: packages/opencode/src/tool/lsp.ts:93]

## Sources

- packages/opencode/src/tool/lsp.ts
- packages/opencode/src/tool/lsp.txt
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/effect/runtime-flags.ts
- packages/opencode/src/tool/external-directory.ts
- packages/opencode/src/tool/tool.ts
- packages/core/src/tool/builtins.ts

## 相关

- [LSP 集成](../../subsystems/integrations/lsp.md)
- [全工具字段 catalog](../../reference/tool-catalog.md)
