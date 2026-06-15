---
id: tool.lsp
path: surface/tools/lsp.md
title: LSP
kind: tool
tier: T1
status: verified
source: [tools/LSPTool/LSPTool.ts, tools/LSPTool/schemas.ts, tools/LSPTool/prompt.ts, tools/LSPTool/UI.tsx, tools/LSPTool/formatters.ts, services/lsp/manager.ts, tools.ts]
symbols: [LSPTool]
related: [subsys.lsp]
updated: 2026-06-14
evidence: explicit
---

`LSP` 是 Language Server Protocol code intelligence 工具, 提供 definition、references、hover、document/workspace symbol、implementation 和 call hierarchy 查询; 它受 `ENABLE_LSP_TOOL` 注册 gate 与 runtime LSP connection health 双重控制。[E: tools/LSPTool/prompt.ts:3][E: tools/LSPTool/prompt.ts:5][E: tools.ts:224][E: tools/LSPTool/LSPTool.ts:137]

## 能回答的问题

- `LSPTool` 支持哪些 operation, 输入坐标是 1-based 还是 0-based?
- `LSPTool` 为什么可能不出现在工具列表里?
- `LSPTool.call()` 如何打开文件、发送 LSP request、过滤 gitignored results?
- `LSPTool` 如何渲染 result count 和 verbose content?

## 1 Identity

- Tool name: `LSP`, 来自 `LSP_TOOL_NAME`。[E: tools/LSPTool/prompt.ts:1][E: tools/LSPTool/LSPTool.ts:128]
- `LSPTool` 只在 `isEnvTruthy(process.env.ENABLE_LSP_TOOL)` 为真时进入 `getAllBaseTools()`。[E: tools.ts:224]
- `isEnabled()` 还要求 `isLspConnected()` 返回 true。[E: tools/LSPTool/LSPTool.ts:137][E: tools/LSPTool/LSPTool.ts:138]
- `isLspConnected()` 在 initialization failed、manager absent、server set empty 或全部 server `state === 'error'` 时返回 false。[E: services/lsp/manager.ts:100][E: services/lsp/manager.ts:101][E: services/lsp/manager.ts:103][E: services/lsp/manager.ts:105][E: services/lsp/manager.ts:107]
- `searchHint`: `code intelligence (definitions, references, symbols, hover)`。[E: tools/LSPTool/LSPTool.ts:129]
- `maxResultSizeChars`: `100_000`; `isLsp`: `true`; `shouldDefer`: `true`。[E: tools/LSPTool/LSPTool.ts:130][E: tools/LSPTool/LSPTool.ts:131][E: tools/LSPTool/LSPTool.ts:136]

## 2 用途定位

`LSPTool` prompt 明确支持九类 operation: `goToDefinition`、`findReferences`、`hover`、`documentSymbol`、`workspaceSymbol`、`goToImplementation`、`prepareCallHierarchy`、`incomingCalls`、`outgoingCalls`。[E: tools/LSPTool/prompt.ts:5][E: tools/LSPTool/prompt.ts:6][E: tools/LSPTool/prompt.ts:7][E: tools/LSPTool/prompt.ts:8][E: tools/LSPTool/prompt.ts:9][E: tools/LSPTool/prompt.ts:10][E: tools/LSPTool/prompt.ts:11][E: tools/LSPTool/prompt.ts:12][E: tools/LSPTool/prompt.ts:13][E: tools/LSPTool/prompt.ts:14] 所有 operation 都需要 `filePath`、1-based `line` 和 1-based `character`。[E: tools/LSPTool/prompt.ts:16][E: tools/LSPTool/prompt.ts:17][E: tools/LSPTool/prompt.ts:18][E: tools/LSPTool/prompt.ts:19]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| `operation` | enum 9 values | 是 | 无 | LSP operation。[E: tools/LSPTool/LSPTool.ts:61][E: tools/LSPTool/LSPTool.ts:72] | `validateInput()` 先用 discriminated union `lspToolInputSchema()` 复验。[E: tools/LSPTool/LSPTool.ts:155][E: tools/LSPTool/LSPTool.ts:157] |
| `filePath` | `string` | 是 | 无 | Absolute or relative file path。[E: tools/LSPTool/LSPTool.ts:74] | `getPath()` 和 `call()` 都用 `expandPath(filePath)`。[E: tools/LSPTool/LSPTool.ts:152][E: tools/LSPTool/LSPTool.ts:225] |
| `line` | positive integer | 是 | 无 | 1-based line number。[E: tools/LSPTool/LSPTool.ts:75][E: tools/LSPTool/LSPTool.ts:79] | 转给 LSP 前减 1。[E: tools/LSPTool/LSPTool.ts:433][E: tools/LSPTool/LSPTool.ts:434] |
| `character` | positive integer | 是 | 无 | 1-based character offset。[E: tools/LSPTool/LSPTool.ts:80][E: tools/LSPTool/LSPTool.ts:84] | 转给 LSP 前减 1。[E: tools/LSPTool/LSPTool.ts:433][E: tools/LSPTool/LSPTool.ts:435] |

`schemas.ts` 中的 discriminated union 对每个 operation 都重复同一组 `filePath`、`line`、`character` 字段, 并在 union 中列出全部九个 operation。[E: tools/LSPTool/schemas.ts:8][E: tools/LSPTool/schemas.ts:13][E: tools/LSPTool/schemas.ts:32][E: tools/LSPTool/schemas.ts:51][E: tools/LSPTool/schemas.ts:70][E: tools/LSPTool/schemas.ts:89][E: tools/LSPTool/schemas.ts:108][E: tools/LSPTool/schemas.ts:127][E: tools/LSPTool/schemas.ts:146][E: tools/LSPTool/schemas.ts:165][E: tools/LSPTool/schemas.ts:180]

## 4 输出 & maxResultSizeChars

输出包含 `operation`、formatted `result`、`filePath`, 以及可选 `resultCount` 和 `fileCount`。[E: tools/LSPTool/LSPTool.ts:89][E: tools/LSPTool/LSPTool.ts:91][E: tools/LSPTool/LSPTool.ts:104][E: tools/LSPTool/LSPTool.ts:105][E: tools/LSPTool/LSPTool.ts:108][E: tools/LSPTool/LSPTool.ts:114] `mapToolResultToToolResultBlockParam()` 只把 `output.result` 写入 `tool_result.content`。[E: tools/LSPTool/LSPTool.ts:415][E: tools/LSPTool/LSPTool.ts:419]

`formatResult()` 为不同 operation 计算 formatted string、result count 和 file count; `hover` 有 result 时计 1, `documentSymbol` 会递归计 nested `DocumentSymbol.children`, `workspaceSymbol` 按 valid symbol location 计 unique files。[E: tools/LSPTool/LSPTool.ts:636][E: tools/LSPTool/LSPTool.ts:701][E: tools/LSPTool/LSPTool.ts:703][E: tools/LSPTool/LSPTool.ts:707][E: tools/LSPTool/LSPTool.ts:715][E: tools/LSPTool/LSPTool.ts:727][E: tools/LSPTool/LSPTool.ts:751][E: tools/LSPTool/LSPTool.ts:752]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isReadOnly()` | `true` | LSP query 不修改 source file, 源码直接返回 `true`。[E: tools/LSPTool/LSPTool.ts:149] |
| `isConcurrencySafe()` | `true` | 源码直接返回 `true`。[E: tools/LSPTool/LSPTool.ts:146] |
| `isLsp` | `true` | 工具定义显式设置。[E: tools/LSPTool/LSPTool.ts:131] |
| `shouldDefer` | `true` | 工具定义显式设置。[E: tools/LSPTool/LSPTool.ts:136] |
| `isDestructive` | 默认 `false` | 工具定义未声明; `buildTool` 默认 false。[E: tools/LSPTool/LSPTool.ts:127][E: Tool.ts:761] |

## 6 权限

`validateInput()` 在文件系统层面检查路径: UNC path 直接跳过 stat 以避免 NTLM credential leak, 其它路径必须存在且是 regular file; missing file 返回 errorCode 1, 非文件返回 errorCode 2, schema parse failure 返回 errorCode 3, stat access failure 返回 errorCode 4。[E: tools/LSPTool/LSPTool.ts:171][E: tools/LSPTool/LSPTool.ts:172][E: tools/LSPTool/LSPTool.ts:177][E: tools/LSPTool/LSPTool.ts:180][E: tools/LSPTool/LSPTool.ts:183][E: tools/LSPTool/LSPTool.ts:200][E: tools/LSPTool/LSPTool.ts:204][E: tools/LSPTool/LSPTool.ts:161][E: tools/LSPTool/LSPTool.ts:196]

`checkPermissions()` 调用 `checkReadPermissionForTool(LSPTool, input, appState.toolPermissionContext)`; 因此 LSP operation 走本地 file read permission path。[E: tools/LSPTool/LSPTool.ts:210][E: tools/LSPTool/LSPTool.ts:212][E: tools/LSPTool/LSPTool.ts:213][E: tools/LSPTool/LSPTool.ts:215]

## 7 call() 走读

`call()` expand file path 并取 cwd; 如果 LSP initialization status 是 `pending`, 会先 `waitForInitialization()`。[E: tools/LSPTool/LSPTool.ts:224][E: tools/LSPTool/LSPTool.ts:225][E: tools/LSPTool/LSPTool.ts:226][E: tools/LSPTool/LSPTool.ts:230][E: tools/LSPTool/LSPTool.ts:231][E: tools/LSPTool/LSPTool.ts:232] 没有 manager 时返回 `LSP server manager not initialized...` output, 而不是 throw。[E: tools/LSPTool/LSPTool.ts:236][E: tools/LSPTool/LSPTool.ts:237][E: tools/LSPTool/LSPTool.ts:243][E: tools/LSPTool/LSPTool.ts:246]

`getMethodAndParams()` 把 1-based input position 转成 0-based LSP position, 并把 file path 转为 file URI。[E: tools/LSPTool/LSPTool.ts:431][E: tools/LSPTool/LSPTool.ts:433][E: tools/LSPTool/LSPTool.ts:434][E: tools/LSPTool/LSPTool.ts:435] operation 映射包括 `textDocument/definition`、`textDocument/references`、`textDocument/hover`、`textDocument/documentSymbol`、`workspace/symbol`、`textDocument/implementation` 和 `textDocument/prepareCallHierarchy`。[E: tools/LSPTool/LSPTool.ts:439][E: tools/LSPTool/LSPTool.ts:447][E: tools/LSPTool/LSPTool.ts:456][E: tools/LSPTool/LSPTool.ts:464][E: tools/LSPTool/LSPTool.ts:471][E: tools/LSPTool/LSPTool.ts:478][E: tools/LSPTool/LSPTool.ts:486]

如果 file 还没有被 manager open, `call()` 读取文件; 超过 `10_000_000` bytes 时返回 file too large output, 否则 `manager.openFile(absolutePath, fileContent)`。[E: tools/LSPTool/LSPTool.ts:261][E: tools/LSPTool/LSPTool.ts:262][E: tools/LSPTool/LSPTool.ts:264][E: tools/LSPTool/LSPTool.ts:265][E: tools/LSPTool/LSPTool.ts:268][E: tools/LSPTool/LSPTool.ts:273][E: tools/LSPTool/LSPTool.ts:274] 随后 `manager.sendRequest(absolutePath, method, params)`; result 为 undefined 时返回 `No LSP server available for file type: <ext>`。[E: tools/LSPTool/LSPTool.ts:281][E: tools/LSPTool/LSPTool.ts:283][E: tools/LSPTool/LSPTool.ts:291]

`incomingCalls` 和 `outgoingCalls` 是 two-step: 先用 `prepareCallHierarchy` 取得 item, 没 item 返回 zero counts; 有 item 再发 `callHierarchy/incomingCalls` 或 `callHierarchy/outgoingCalls`。[E: tools/LSPTool/LSPTool.ts:302][E: tools/LSPTool/LSPTool.ts:306][E: tools/LSPTool/LSPTool.ts:307][E: tools/LSPTool/LSPTool.ts:310][E: tools/LSPTool/LSPTool.ts:319][E: tools/LSPTool/LSPTool.ts:321][E: tools/LSPTool/LSPTool.ts:324]

location-based results 会过滤 gitignored files: workspaceSymbol 先取 symbol locations, 其它 location arrays 转成 uniform `Location`, 再用 `filterGitIgnoredLocations(...)` 过滤。[E: tools/LSPTool/LSPTool.ts:337][E: tools/LSPTool/LSPTool.ts:345][E: tools/LSPTool/LSPTool.ts:351][E: tools/LSPTool/LSPTool.ts:356][E: tools/LSPTool/LSPTool.ts:361][E: tools/LSPTool/LSPTool.ts:364][E: tools/LSPTool/LSPTool.ts:369] `filterGitIgnoredLocations()` 批量调用 `git check-ignore` with batch size 50 和 timeout 5000ms。[E: tools/LSPTool/LSPTool.ts:580][E: tools/LSPTool/LSPTool.ts:583][E: tools/LSPTool/LSPTool.ts:585][E: tools/LSPTool/LSPTool.ts:589]

## 8 渲染

`renderToolUseMessage()` 对 position-based operation 会尝试用 `getSymbolAtPosition(filePath, line-1, character-1)` 显示 symbol; 找不到 symbol 时显示 file 和 position。[E: tools/LSPTool/UI.tsx:175][E: tools/LSPTool/UI.tsx:177][E: tools/LSPTool/UI.tsx:180][E: tools/LSPTool/UI.tsx:181][E: tools/LSPTool/UI.tsx:185][E: tools/LSPTool/UI.tsx:186] 其它 operation 显示 operation 和 file。[E: tools/LSPTool/UI.tsx:193][E: tools/LSPTool/UI.tsx:195][E: tools/LSPTool/UI.tsx:196]

`renderToolResultMessage()` 如果 `resultCount` 和 `fileCount` 都存在, 使用 collapsed/expanded `LSPResultSummary`; 否则 fallback 直接显示 `output.result`。[E: tools/LSPTool/UI.tsx:212][E: tools/LSPTool/UI.tsx:218][E: tools/LSPTool/UI.tsx:219][E: tools/LSPTool/UI.tsx:224][E: tools/LSPTool/UI.tsx:225] `LSPResultSummary` 对 non-verbose 有结果时显示 `CtrlOToExpand`, verbose 时显示完整 content。[E: tools/LSPTool/UI.tsx:104][E: tools/LSPTool/UI.tsx:123][E: tools/LSPTool/UI.tsx:141][E: tools/LSPTool/UI.tsx:142]

## 9 设计动机·edge·历史

- LSP manager 在 bare mode 不初始化, 因为代码注释把 LSP 定位为 REPL/editor integration, scripted print calls 没有使用价值。[E: services/lsp/manager.ts:145][E: services/lsp/manager.ts:148][I]
- `call()` 先 open file 再 request LSP server, 因为多数 LSP server 需要 `textDocument/didOpen` 后才能执行 operation。[E: tools/LSPTool/LSPTool.ts:261][E: tools/LSPTool/LSPTool.ts:274][I]
- `workspaceSymbol` 使用 empty query 返回 all symbols, 这来自 method params 中 `query: ''` 的实现。[E: tools/LSPTool/LSPTool.ts:471][E: tools/LSPTool/LSPTool.ts:475][I]

## Sources

- `tools/LSPTool/LSPTool.ts`
- `tools/LSPTool/schemas.ts`
- `tools/LSPTool/prompt.ts`
- `tools/LSPTool/UI.tsx`
- `tools/LSPTool/formatters.ts`
- `services/lsp/manager.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `subsys.lsp`
