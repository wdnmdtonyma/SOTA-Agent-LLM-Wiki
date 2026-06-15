---
id: tool.notebook-edit
title: NotebookEdit
kind: tool
tier: T1
path: surface/tools/notebook-edit.md
status: verified
source: [tools/NotebookEditTool/NotebookEditTool.ts, tools/NotebookEditTool/constants.ts, tools/NotebookEditTool/prompt.ts, tools/NotebookEditTool/UI.tsx, tools/ToolSearchTool/prompt.ts, tools.ts, Tool.ts]
symbols: [NotebookEditTool, inputSchema, outputSchema, NOTEBOOK_EDIT_TOOL_NAME]
related: [tool.read, tool.write, tool.tool-search]
updated: 2026-06-14
evidence: explicit
---

`NotebookEdit` 是 Jupyter notebook cell 编辑工具, 面向 `.ipynb` 文件的 replace/insert/delete, 并且像 `Write`/`Edit` 一样要求先通过 `Read` 建立当前 notebook 的 read cache。[E: tools/NotebookEditTool/constants.ts:2][E: tools/NotebookEditTool/NotebookEditTool.ts:90][E: tools/NotebookEditTool/NotebookEditTool.ts:189][E: tools/NotebookEditTool/NotebookEditTool.ts:221]

## 能回答的问题

- `NotebookEdit` 当前 schema 是 `cell_id` 还是 `cell_number`?
- `NotebookEdit` 为什么会被 ToolSearch deferral 影响?
- replace、insert、delete 三种 `edit_mode` 怎样改 notebook JSON?
- `NotebookEdit` 怎样处理 read-before-edit 和 stale file?

## 1 Identity

- Tool name: `NotebookEdit`。[E: tools/NotebookEditTool/constants.ts:2]
- `tools.ts` 直接 import `NotebookEditTool`, 并在 `getAllBaseTools()` 中加入 `NotebookEditTool`。[E: tools.ts:10][E: tools.ts:206]
- `searchHint`: `edit Jupyter notebook cells (.ipynb)`。[E: tools/NotebookEditTool/NotebookEditTool.ts:92]
- `maxResultSizeChars`: `100_000`。[E: tools/NotebookEditTool/NotebookEditTool.ts:93]
- `shouldDefer`: `true`; 在 ToolSearch 机制开启时, `isDeferredTool()` 会把 `shouldDefer === true` 的工具放入 deferred tool pool, 除非该工具 `alwaysLoad === true`。[E: tools/NotebookEditTool/NotebookEditTool.ts:94][E: tools/ToolSearchTool/prompt.ts:62][E: tools/ToolSearchTool/prompt.ts:65][E: tools/ToolSearchTool/prompt.ts:107]
- `description()` 返回 `DESCRIPTION`, 即 `Replace the contents of a specific cell in a Jupyter notebook.`。[E: tools/NotebookEditTool/NotebookEditTool.ts:96][E: tools/NotebookEditTool/prompt.ts:1]

## 2 用途定位

`NotebookEdit` 的当前 input schema 暴露 `cell_id`, 不是 `cell_number`; `prompt.ts` 仍包含 `cell_number is 0-indexed` 的文字, 这与源码 schema 不一致, 因此字段事实以 schema 和 `call()` 的 `cell_id` 分支为准。[E: tools/NotebookEditTool/NotebookEditTool.ts:37][E: tools/NotebookEditTool/NotebookEditTool.ts:350][E: tools/NotebookEditTool/prompt.ts:3] `edit_mode=insert` 在指定 `cell_id` 后插入, 无 `cell_id` 时插到开头; `edit_mode=delete` 删除目标 cell; 默认模式是 replace。[E: tools/NotebookEditTool/NotebookEditTool.ts:50][E: tools/NotebookEditTool/NotebookEditTool.ts:351][E: tools/NotebookEditTool/NotebookEditTool.ts:365][E: tools/NotebookEditTool/NotebookEditTool.ts:392]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `notebook_path` | `string` | 是 | 无 | 要编辑的 Jupyter notebook absolute path。[E: tools/NotebookEditTool/NotebookEditTool.ts:32] |
| `cell_id` | `string` | 否 | insert 时可省略 | 要编辑的 cell ID; insert 时省略表示插到开头, 指定则插到该 cell 后。[E: tools/NotebookEditTool/NotebookEditTool.ts:37][E: tools/NotebookEditTool/NotebookEditTool.ts:41] |
| `new_source` | `string` | 是 | 无 | 写入目标 cell 的新 source。[E: tools/NotebookEditTool/NotebookEditTool.ts:43] |
| `cell_type` | `code` 或 `markdown` | 否 | replace 时沿用当前类型; insert 时必须提供 | insert 新 cell 时需要 cell type; replace 时可改变目标 cell type。[E: tools/NotebookEditTool/NotebookEditTool.ts:44][E: tools/NotebookEditTool/NotebookEditTool.ts:210][E: tools/NotebookEditTool/NotebookEditTool.ts:426] |
| `edit_mode` | `replace` / `insert` / `delete` | 否 | `replace` | 编辑模式; validation 默认参数为 `replace`。[E: tools/NotebookEditTool/NotebookEditTool.ts:50][E: tools/NotebookEditTool/NotebookEditTool.ts:177] |

## 4 输出 & maxResultSizeChars

输出包含 `new_source`、可选 `cell_id`、`cell_type`、`language`、`edit_mode`、可选 `error`、`notebook_path`、`original_file` 和 `updated_file`。[E: tools/NotebookEditTool/NotebookEditTool.ts:60][E: tools/NotebookEditTool/NotebookEditTool.ts:65][E: tools/NotebookEditTool/NotebookEditTool.ts:69][E: tools/NotebookEditTool/NotebookEditTool.ts:70][E: tools/NotebookEditTool/NotebookEditTool.ts:71][E: tools/NotebookEditTool/NotebookEditTool.ts:72][E: tools/NotebookEditTool/NotebookEditTool.ts:77][E: tools/NotebookEditTool/NotebookEditTool.ts:78][E: tools/NotebookEditTool/NotebookEditTool.ts:81] `mapToolResultToToolResultBlockParam()` 对 `error` 设置 `is_error: true`, 成功时按 replace/insert/delete 返回简短文本。[E: tools/NotebookEditTool/NotebookEditTool.ts:137][E: tools/NotebookEditTool/NotebookEditTool.ts:145][E: tools/NotebookEditTool/NotebookEditTool.ts:152][E: tools/NotebookEditTool/NotebookEditTool.ts:158]

`maxResultSizeChars=100_000` 是 `NotebookEditTool` 的声明值。[E: tools/NotebookEditTool/NotebookEditTool.ts:93]

## 5 行为标志

| 标志 | 实际值 | 说明 |
| --- | --- | --- |
| `shouldDefer` | `true` | `NotebookEditTool` 显式声明 deferred, 所以 ToolSearch 模式下它与 MCP/deferred tools 一起按需加载 schema。[E: tools/NotebookEditTool/NotebookEditTool.ts:94][E: tools/ToolSearchTool/prompt.ts:107] |
| `isReadOnly` | 默认 `false` | 工具会调用 `writeTextContent()` 写 notebook 文件; 未看到自定义 `isReadOnly`, `buildTool` 默认 `false`。[I][E: tools/NotebookEditTool/NotebookEditTool.ts:432][E: Tool.ts:760] |
| `isConcurrencySafe` | 默认 `false` | 未看到自定义 `isConcurrencySafe`, `buildTool` 默认 `false`; read-before-edit/staleness guard 表明它按写工具处理。[I][E: Tool.ts:759][E: tools/NotebookEditTool/NotebookEditTool.ts:218] |
| `isDestructive` | 默认 `false` | 未看到自定义 `isDestructive`, `buildTool` 默认 `false`; delete mode 的风险由 write permission 与 validation 控制。[I][E: Tool.ts:761][E: tools/NotebookEditTool/NotebookEditTool.ts:392] |
| `toAutoClassifierInput` | feature-gated | `TRANSCRIPT_CLASSIFIER` 开启时返回 `notebook_path mode: new_source`, 否则返回空字符串。[E: tools/NotebookEditTool/NotebookEditTool.ts:115][E: tools/NotebookEditTool/NotebookEditTool.ts:120] |

## 6 权限

`checkPermissions()` 委托 `checkWritePermissionForTool(NotebookEditTool, input, appState.toolPermissionContext)`。[E: tools/NotebookEditTool/NotebookEditTool.ts:125] `validateInput()` 会把相对路径 resolve 到 cwd, 对 UNC 或 `//` 路径跳过 filesystem operations 并通过 validation。[E: tools/NotebookEditTool/NotebookEditTool.ts:180][E: tools/NotebookEditTool/NotebookEditTool.ts:185] validation 要求扩展名是 `.ipynb`, `edit_mode` 属于 replace/insert/delete, insert 必须提供 `cell_type`。[E: tools/NotebookEditTool/NotebookEditTool.ts:189][E: tools/NotebookEditTool/NotebookEditTool.ts:198][E: tools/NotebookEditTool/NotebookEditTool.ts:210]

read-before-edit guard 使用 `readFileState.get(fullPath)`; 没有 read cache 会拒绝, 磁盘 mtime 晚于 read timestamp 也会拒绝。[E: tools/NotebookEditTool/NotebookEditTool.ts:221][E: tools/NotebookEditTool/NotebookEditTool.ts:230] 随后 validation 读取 notebook, 要求 JSON 可解析, 非 insert 模式必须有 `cell_id`, 且 `cell_id` 必须能按真实 cell ID 或 `cell-N` numeric fallback 找到 cell。[E: tools/NotebookEditTool/NotebookEditTool.ts:241][E: tools/NotebookEditTool/NotebookEditTool.ts:252][E: tools/NotebookEditTool/NotebookEditTool.ts:260][E: tools/NotebookEditTool/NotebookEditTool.ts:270][E: tools/NotebookEditTool/NotebookEditTool.ts:274]

## 7 call() 走读

`call()` resolve `notebook_path`, 在 file history 开启时记录 edit, 然后用 `readFileSyncWithMetadata()` 读取 content、encoding 和 line endings。[E: tools/NotebookEditTool/NotebookEditTool.ts:307][E: tools/NotebookEditTool/NotebookEditTool.ts:311][E: tools/NotebookEditTool/NotebookEditTool.ts:324] `call()` 使用非 memoized `jsonParse()` 解析 notebook, 因为后续会原地 mutate `notebook.cells`。[E: tools/NotebookEditTool/NotebookEditTool.ts:331][E: tools/NotebookEditTool/NotebookEditTool.ts:333]

cell 选择逻辑:无 `cell_id` 时 index 为 0; 有 `cell_id` 时先按真实 id 查找, 找不到再尝试 `parseCellId(cell_id)`; insert 模式会把 index 后移一位以插到目标 cell 后。[E: tools/NotebookEditTool/NotebookEditTool.ts:350][E: tools/NotebookEditTool/NotebookEditTool.ts:355][E: tools/NotebookEditTool/NotebookEditTool.ts:359][E: tools/NotebookEditTool/NotebookEditTool.ts:365] 当 replace 目标刚好是 one-past-end 时, `call()` 会把 replace 转成 insert, 并在未给 `cell_type` 时默认 code。[E: tools/NotebookEditTool/NotebookEditTool.ts:372][E: tools/NotebookEditTool/NotebookEditTool.ts:375]

写入逻辑: delete 使用 `cells.splice(cellIndex, 1)`; insert 构造 markdown 或 code cell 后 splice; replace 修改 `targetCell.source`, code cell 会清空 `execution_count` 和 `outputs`, 并可按 `cell_type` 改变 cell type。[E: tools/NotebookEditTool/NotebookEditTool.ts:392][E: tools/NotebookEditTool/NotebookEditTool.ts:397][E: tools/NotebookEditTool/NotebookEditTool.ts:405][E: tools/NotebookEditTool/NotebookEditTool.ts:415][E: tools/NotebookEditTool/NotebookEditTool.ts:418][E: tools/NotebookEditTool/NotebookEditTool.ts:421][E: tools/NotebookEditTool/NotebookEditTool.ts:426] 写回使用 `jsonStringify(notebook, null, 1)` 和原文件 encoding/line endings; 写后把 `readFileState` 更新为 `updatedContent` 和新 mtime。[E: tools/NotebookEditTool/NotebookEditTool.ts:431][E: tools/NotebookEditTool/NotebookEditTool.ts:432][E: tools/NotebookEditTool/NotebookEditTool.ts:437]

## 8 渲染

`NotebookEditTool` 使用 `renderToolUseMessage`、`renderToolUseRejectedMessage`、`renderToolUseErrorMessage` 和 `renderToolResultMessage`。[E: tools/NotebookEditTool/NotebookEditTool.ts:172][E: tools/NotebookEditTool/NotebookEditTool.ts:173][E: tools/NotebookEditTool/NotebookEditTool.ts:174][E: tools/NotebookEditTool/NotebookEditTool.ts:175] `userFacingName()` 固定返回 `Edit Notebook`。[E: tools/NotebookEditTool/NotebookEditTool.ts:102]

## 9 设计动机·edge·历史

- `NotebookEdit` 的 prompt 文字仍说 `cell_number is 0-indexed`, 但当前 schema 和 implementation 使用 `cell_id`; 文档消费者应按 `cell_id` 使用工具。[E: tools/NotebookEditTool/prompt.ts:3][E: tools/NotebookEditTool/NotebookEditTool.ts:37]
- read-before-edit guard 的代码注释明确把原因写成避免模型编辑未看过的 notebook 或对 stale view 编辑造成 silent data loss; 代码行本身体现为 `readFileState.get(fullPath)` 和 mtime check。[E: tools/NotebookEditTool/NotebookEditTool.ts:221][E: tools/NotebookEditTool/NotebookEditTool.ts:230]
- 对 notebook format 4.5+ 或 nbformat > 4, insert 会生成随机新 cell id; replace/delete 会沿用传入 `cell_id`。[E: tools/NotebookEditTool/NotebookEditTool.ts:381][E: tools/NotebookEditTool/NotebookEditTool.ts:385][E: tools/NotebookEditTool/NotebookEditTool.ts:386][E: tools/NotebookEditTool/NotebookEditTool.ts:387]

## Sources

- `tools/NotebookEditTool/NotebookEditTool.ts`
- `tools/NotebookEditTool/constants.ts`
- `tools/NotebookEditTool/prompt.ts`
- `tools/NotebookEditTool/UI.tsx`
- `tools/ToolSearchTool/prompt.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- [Read](read.md)
- [Write](write.md)
- [ToolSearch](tool-search.md)
