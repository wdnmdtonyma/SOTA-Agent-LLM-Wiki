---
id: ref.tool-catalog
title: Tool Catalog Reference
kind: reference
tier: T3
v: shared
source:
  - packages/opencode/src/tool/
  - packages/opencode/src/session/tools.ts
  - packages/codemode/src/
  - packages/core/src/tool/
status: verified
updated: 3fd77ae980
evidence: explicit
symbols:
  - ReadTool
  - EditTool
  - WriteTool
  - ShellTool
  - BashTool
  - CodeModeTool
  - CodeMode
  - ToolRegistry.tools
  - BuiltInTools.locationLayer
related:
  - ref.tool-interface
---

# Tool Catalog Reference

本节点是本批次的工具机读总账。V1 当前活跑工具来自 `packages/opencode/src/tool/registry.ts` 的 `builtin` 列表；V2 当前 core built-ins 来自 `packages/core/src/tool/builtins.ts` 的 built-in tools node。两个 catalog 不是同一套 registry，V1 有 plugin/MCP/Zod/legacy JSON schema glue，V2 是 Effect-native canonical `Tool.make` registry。

## V1

V1 registry 的内置工具顺序是 invalid、可选 question、shell、read、glob、grep、edit、write、task、fetch/webfetch、todo/todowrite、search/websearch、skill、patch/apply_patch、可选 `execute`、可选 lsp、可选 plan。[E: packages/opencode/src/tool/registry.ts:232] [E: packages/opencode/src/tool/registry.ts:246] [E: packages/opencode/src/tool/registry.ts:248] V1 materialization 还会按 provider/model 过滤：websearch 受 provider/Exa/Parallel flags 控制，GPT 非 OSS 且非 GPT-4 model 使用 `apply_patch` 并隐藏 `edit/write`。[E: packages/opencode/src/tool/registry.ts:293] [E: packages/opencode/src/tool/registry.ts:297] [E: packages/opencode/src/tool/registry.ts:299] [E: packages/opencode/src/tool/registry.ts:300]

### V1 Tool Field Table

| Tool ID | Source | 输入字段 type/default/limit | 权限/副作用 | 输出/metadata |
| --- | --- | --- | --- | --- |
| `invalid` | `invalid.ts` | `tool: string`, `error: string`。[E: packages/opencode/src/tool/invalid.ts:4] | 无 permission；用于把 invalid provider tool call 显式回传。 | output 是 error string。[E: packages/opencode/src/tool/invalid.ts:17] |
| `question` | `question.ts` | `questions: Array(Question.Prompt)`。[E: packages/opencode/src/tool/question.ts:6] | 调用 `Question.Service.ask`。[E: packages/opencode/src/tool/question.ts:24] | answers 被格式化成 Markdown-like 文本，metadata 含 answers。[E: packages/opencode/src/tool/question.ts:30] [E: packages/opencode/src/tool/question.ts:37] |
| `bash` | `shell.ts` + `shell/prompt.ts` | `command: string`, `timeout?: number`, `workdir?: string`；timeout 默认 runtime flag 或 `2*60*1000` ms。[E: packages/opencode/src/tool/shell/prompt.ts:17] [E: packages/opencode/src/tool/shell/prompt.ts:18] [E: packages/opencode/src/tool/shell/prompt.ts:19] [E: packages/opencode/src/tool/shell.ts:353] | AST 解析命令；外部目录需 `external_directory` permission，命令需 `bash` permission。[E: packages/opencode/src/tool/shell.ts:257] [E: packages/opencode/src/tool/shell.ts:274] [E: packages/opencode/src/tool/shell.ts:288] | metadata 含 `exit/truncated/outputPath`；raw output 可写入 truncate file。[E: packages/opencode/src/tool/shell.ts:589] [E: packages/opencode/src/tool/shell.ts:591] |
| `read` | `read.ts` | `filePath: string`, `offset?: number`, `limit?: number`; 默认读文件 2000 行，最大行长 2000 chars，输出 byte cap 50 KiB。[E: packages/opencode/src/tool/read.ts:13] [E: packages/opencode/src/tool/read.ts:14] [E: packages/opencode/src/tool/read.ts:16] [E: packages/opencode/src/tool/read.ts:28] | 外部目录 guard，文件读需 `read` permission；目录读取也会分页。[E: packages/opencode/src/tool/read.ts:250] [E: packages/opencode/src/tool/read.ts:255] [E: packages/opencode/src/tool/read.ts:264] | 文件行号输出；image/pdf 作为 attachments；metadata 展示 preview/path 等。[E: packages/opencode/src/tool/read.ts:303] [E: packages/opencode/src/tool/read.ts:338] [E: packages/opencode/src/tool/read.ts:359] |
| `glob` | `glob.ts` | `pattern: string`, `path?: string`; limit hard-coded 100 results。[E: packages/opencode/src/tool/glob.ts:10] [E: packages/opencode/src/tool/glob.ts:49] | `glob` permission，路径必须是目录，外部目录 guard。[E: packages/opencode/src/tool/glob.ts:28] [E: packages/opencode/src/tool/glob.ts:40] [E: packages/opencode/src/tool/glob.ts:44] | output 是匹配路径列表，truncated 时追加提示。[E: packages/opencode/src/tool/glob.ts:51] [E: packages/opencode/src/tool/glob.ts:53] |
| `grep` | `grep.ts` | `pattern: string`, `path?: string`, `include?: string`; ripgrep limit 100。[E: packages/opencode/src/tool/grep.ts:10] [E: packages/opencode/src/tool/grep.ts:63] | pattern 必填，`grep` permission，外部目录 guard。[E: packages/opencode/src/tool/grep.ts:35] [E: packages/opencode/src/tool/grep.ts:39] [E: packages/opencode/src/tool/grep.ts:55] | grouped match 列表；搜索使用 resolved real path，header 以 requested directory 重建，因此保留 directory symlink alias。[E: packages/opencode/src/tool/grep.ts:60] [E: packages/opencode/src/tool/grep.ts:71] [E: packages/opencode/src/tool/grep.ts:73] [E: packages/opencode/src/tool/grep.ts:94] |
| `edit` | `edit.ts` | `filePath: string`, `oldString: string`, `newString: string`, `replaceAll?: boolean`。[E: packages/opencode/src/tool/edit.ts:47] | old/new 相同失败；空 `oldString` 只允许创建不存在文件；replace 要 `edit` permission。[E: packages/opencode/src/tool/edit.ts:75] [E: packages/opencode/src/tool/edit.ts:90] [E: packages/opencode/src/tool/edit.ts:145] | 支持 exact 和 fuzzy replacers，写文件后格式化并发布事件。[E: packages/opencode/src/tool/edit.ts:694] [E: packages/opencode/src/tool/edit.ts:705] [E: packages/opencode/src/tool/edit.ts:155] |
| `write` | `write.ts` | `filePath: string`, `content: string`。[E: packages/opencode/src/tool/write.ts:20] | 外部目录 guard；覆盖/创建走 `edit` permission；保留 BOM。[E: packages/opencode/src/tool/write.ts:44] [E: packages/opencode/src/tool/write.ts:54] [E: packages/opencode/src/tool/write.ts:50] | 写入后发 file edited 事件并可返回 LSP diagnostics。[E: packages/opencode/src/tool/write.ts:68] [E: packages/opencode/src/tool/write.ts:75] |
| `task` | `task.ts` | `description`, `prompt`, `subagent_type`, `task_id?`, `command?`, `background?`; `background` 仅实验 flag true 时暴露。[E: packages/opencode/src/tool/task.ts:43] [E: packages/opencode/src/tool/task.ts:56] [E: packages/opencode/src/tool/task.ts:96] | 子 agent 类型需 permission；会创建 child session 并继承/派生 permission。[E: packages/opencode/src/tool/task.ts:119] [E: packages/opencode/src/tool/task.ts:156] [E: packages/opencode/src/tool/task.ts:104] | foreground 等待 child result；background 返回 task_id 并异步更新。[E: packages/opencode/src/tool/task.ts:256] [E: packages/opencode/src/tool/task.ts:310] |
| `webfetch` | `webfetch.ts` | `url: string`, `format?: text\|markdown\|html` 默认 markdown，`timeout?: number`; 默认 30s、最大 120s，响应上限 5 MiB。[E: packages/opencode/src/tool/webfetch.ts:9] [E: packages/opencode/src/tool/webfetch.ts:10] [E: packages/opencode/src/tool/webfetch.ts:13] | URL 必须 http/https；`webfetch` permission。[E: packages/opencode/src/tool/webfetch.ts:35] [E: packages/opencode/src/tool/webfetch.ts:39] | image 返回 attachment；HTML 可转 markdown/text/html。[E: packages/opencode/src/tool/webfetch.ts:110] [E: packages/opencode/src/tool/webfetch.ts:129] |
| `todowrite` | `todo.ts` | `todos: TodoItem[]`; item 含 `content/status/priority`。[E: packages/opencode/src/tool/todo.ts:6] [E: packages/opencode/src/session/todo.ts:12] | `todowrite` permission 后更新 session todo state。[E: packages/opencode/src/tool/todo.ts:24] [E: packages/opencode/src/tool/todo.ts:31] | output 是 JSON 格式 todo 列表，metadata 含 todos。[E: packages/opencode/src/tool/todo.ts:38] [E: packages/opencode/src/tool/todo.ts:40] |
| `websearch` | `websearch.ts` | `query`, `numResults?` 默认 8，`livecrawl?` 默认 fallback，`type?` 默认 auto，`contextMaxCharacters?` 默认 10000。[E: packages/opencode/src/tool/websearch.ts:10] [E: packages/opencode/src/tool/websearch.ts:12] [E: packages/opencode/src/tool/websearch.ts:22] | provider 由 env/flags/checksum 在 `exa` 与 `parallel` 间选；调用前 asks `websearch` permission。[E: packages/opencode/src/tool/websearch.ts:30] [E: packages/opencode/src/tool/websearch.ts:119] | Parallel 调 MCP `web_search`，Exa 调 MCP `web_search_exa`；output 是 provider content。[E: packages/opencode/src/tool/websearch.ts:66] [E: packages/opencode/src/tool/websearch.ts:83] [E: packages/opencode/src/tool/websearch.ts:133] |
| `skill` | `skill.ts` | `name: string`。[E: packages/opencode/src/tool/skill.ts:9] | `skill.require` 后 asks `skill` permission for skill name。[E: packages/opencode/src/tool/skill.ts:24] [E: packages/opencode/src/tool/skill.ts:28] | 输出 skill instruction 和最多 10 个文件样例。[E: packages/opencode/src/tool/skill.ts:35] [E: packages/opencode/src/tool/skill.ts:46] |
| `apply_patch` | `apply_patch.ts` | `patchText: string`。[E: packages/opencode/src/tool/apply_patch.ts:18] | 解析 patch；add/update/delete/move 均检查外部目录并用 `edit` permission。[E: packages/opencode/src/tool/apply_patch.ts:39] [E: packages/opencode/src/tool/apply_patch.ts:62] [E: packages/opencode/src/tool/apply_patch.ts:206] | 顺序应用文件变更，写后发 file edited 事件和 LSP diagnostics。[E: packages/opencode/src/tool/apply_patch.ts:220] [E: packages/opencode/src/tool/apply_patch.ts:261] |
| `execute` | `code-mode.ts` + `packages/codemode` | `code: string`，内容是 confined interpreter 执行的 orchestration script。[E: packages/opencode/src/tool/code-mode.ts:12] [E: packages/opencode/src/tool/code-mode.ts:16] [E: packages/opencode/src/tool/code-mode.ts:17] | 仅 `experimentalCodeMode` 时 lazy import/注册；没有 permission-visible MCP tool 时 materialization 会隐藏它。脚本内每个 MCP child call 仍以 canonical tool key ask permission。[E: packages/opencode/src/tool/registry.ts:118] [E: packages/opencode/src/tool/registry.ts:119] [E: packages/opencode/src/tool/registry.ts:226] [E: packages/opencode/src/tool/registry.ts:305] [E: packages/opencode/src/tool/registry.ts:308] [E: packages/opencode/src/tool/code-mode.ts:141] [E: packages/opencode/src/tool/code-mode.ts:147] | `CodeMode.make` 只暴露过滤后的 MCP tool tree；输出是 string/JSON 加 logs，metadata 跟踪 child `toolCalls`，MCP media/resource blobs 作为 attachments。[E: packages/opencode/src/tool/code-mode.ts:207] [E: packages/opencode/src/tool/code-mode.ts:210] [E: packages/opencode/src/tool/code-mode.ts:239] [E: packages/opencode/src/tool/code-mode.ts:240] [E: packages/opencode/src/tool/code-mode.ts:274] [E: packages/opencode/src/tool/code-mode.ts:300] [E: packages/opencode/src/tool/code-mode.ts:304] |
| `lsp` | `lsp.ts` | `operation`, `filePath`, `line >= 1`, `character >= 1`, `query?`。[E: packages/opencode/src/tool/lsp.ts:11] [E: packages/opencode/src/tool/lsp.ts:23] | 实验 flag `experimentalLspTool` 才进入 builtin；外部目录和 `read` permission。[E: packages/opencode/src/tool/registry.ts:248] [E: packages/opencode/src/tool/lsp.ts:49] [E: packages/opencode/src/tool/lsp.ts:56] | 调 LSP operations，返回 JSON string。[E: packages/opencode/src/tool/lsp.ts:82] [E: packages/opencode/src/tool/lsp.ts:105] |
| `plan_exit` | `plan.ts` | 空 object。[E: packages/opencode/src/tool/plan.ts:13] | 仅 `experimentalPlanMode && client === "cli"` 暴露；asks 用户是否切到 build agent。[E: packages/opencode/src/tool/registry.ts:248] [E: packages/opencode/src/tool/plan.ts:30] | 拒绝时失败；同意时创建 build agent user message。[E: packages/opencode/src/tool/plan.ts:46] [E: packages/opencode/src/tool/plan.ts:53] |

## V2

V2 built-ins 由 `BuiltInTools.node` 依赖列表合并，当前包括 `apply_patch/bash/edit/glob/grep/question/read/skill/todowrite/webfetch/websearch/write`。[E: packages/core/src/tool/builtins.ts:31] [E: packages/core/src/tool/builtins.ts:46] `task`、`LSP`、`repo_clone`、`repo_overview`、`plan_exit`、`execute` CodeMode、MCP/plugin canonical registration 不在当前 static built-in deps 列表内。[I]

### V2 Tool Field Table

| Tool name | Source | 输入字段 type/default/limit | 权限/副作用 | 输出/模型投影 |
| --- | --- | --- | --- | --- |
| `read` | `read.ts`, `read-filesystem.ts` | `path: string`, `offset?: positive int`, `limit?: positive int`; text page 默认最多 2000 行、50 KiB、单行 2000 chars，media ingest 上限 20 MiB。[E: packages/core/src/tool/read.ts:18] [E: packages/core/src/tool/read.ts:23] [E: packages/core/src/tool/read-filesystem.ts:11] [E: packages/core/src/tool/read-filesystem.ts:12] [E: packages/core/src/tool/read-filesystem.ts:13] [E: packages/core/src/tool/read-filesystem.ts:14] | resolve Location path；assert `read` permission；目录 list 或文件 inspect。[E: packages/core/src/tool/read.ts:60] [E: packages/core/src/tool/read.ts:72] [E: packages/core/src/tool/read.ts:80] | output 是 text/list/media union，binary 和 media cap 变成 `ToolFailure`。[E: packages/core/src/tool/read.ts:28] [E: packages/core/src/tool/read.ts:82] |
| `edit` | `edit.ts` | `path`, `oldString`, `newString`, `replaceAll?` 默认 false。[E: packages/core/src/tool/edit.ts:24] [E: packages/core/src/tool/edit.ts:31] | external_directory permission + `edit` permission；V2 当前通过 exact `oldString` occurrence 计数与替换实现。[E: packages/core/src/tool/edit.ts:138] [E: packages/core/src/tool/edit.ts:151] [E: packages/core/src/tool/edit.ts:165] [E: packages/core/src/tool/edit.ts:180] | output 含 `files/replacements`，`toModelOutput` 输出预览 diff。[E: packages/core/src/tool/edit.ts:36] [E: packages/core/src/tool/edit.ts:73] |
| `write` | `write.ts` | `path: string`, `content: string`。[E: packages/core/src/tool/write.ts:23] [E: packages/core/src/tool/write.ts:27] | external_directory permission + `edit` permission；写入保留 BOM。[E: packages/core/src/tool/write.ts:70] [E: packages/core/src/tool/write.ts:79] [E: packages/core/src/tool/write.ts:87] | output 含 `operation/target/resource/existed`，model 输出写入摘要。[E: packages/core/src/tool/write.ts:30] [E: packages/core/src/tool/write.ts:38] |
| `bash` | `bash.ts` | `command`, `workdir?`, `timeout?` 默认 120000 ms 最大 600000 ms；capture output 上限 1 MiB。[E: packages/core/src/tool/bash.ts:23] [E: packages/core/src/tool/bash.ts:28] [E: packages/core/src/tool/bash.ts:19] [E: packages/core/src/tool/bash.ts:20] [E: packages/core/src/tool/bash.ts:21] | external workdir permission；command path warnings advisory；`bash` permission；用 configured shell 或 platform default。[E: packages/core/src/tool/bash.ts:129] [E: packages/core/src/tool/bash.ts:132] [E: packages/core/src/tool/bash.ts:138] [E: packages/core/src/tool/bash.ts:140] [E: packages/core/src/tool/bash.ts:142] [E: packages/core/src/tool/bash.ts:154] | output 含 exit/output/timeout/truncated flags；capture loss 不是 generic model-output truncation。[E: packages/core/src/tool/bash.ts:35] [E: packages/core/src/tool/bash.ts:193] |
| `apply_patch` | `apply-patch.ts` | `patchText: string`。[E: packages/core/src/tool/apply-patch.ts:17] [E: packages/core/src/tool/apply-patch.ts:20] | supports add/update/delete；move 不支持；每个 target 做 external_directory + `edit` permission。[E: packages/core/src/tool/apply-patch.ts:72] [E: packages/core/src/tool/apply-patch.ts:97] [E: packages/core/src/tool/apply-patch.ts:109] | sequential apply；partial failure 把已应用列表和失败原因写进 `ToolFailure` message，而不是返回结构化 partial output。[E: packages/core/src/tool/apply-patch.ts:72] [E: packages/core/src/tool/apply-patch.ts:82] |
| `glob` | `glob.ts` | `pattern`, `path?`, `limit?`; limit 默认 `Number.MAX_SAFE_INTEGER`。[E: packages/core/src/tool/glob.ts:18] [E: packages/core/src/tool/glob.ts:23] [E: packages/core/src/tool/glob.ts:80] | assert `glob` permission，relative path resolve from Location。[E: packages/core/src/tool/glob.ts:62] [E: packages/core/src/tool/glob.ts:75] | output 是 matched entries；toModelOutput 是 line-oriented text。[E: packages/core/src/tool/glob.ts:28] [E: packages/core/src/tool/glob.ts:32] |
| `grep` | `grep.ts` | `pattern`, `path?`, `include?`, `limit?`。[E: packages/core/src/tool/grep.ts:19] [E: packages/core/src/tool/grep.ts:29] | assert `grep` permission，目标可以是文件或目录。[E: packages/core/src/tool/grep.ts:81] [E: packages/core/src/tool/grep.ts:95] | output 是 match records，toModelOutput 格式化为 concise matches。[E: packages/core/src/tool/grep.ts:34] [E: packages/core/src/tool/grep.ts:38] |
| `question` | `question.ts` | `questions: QuestionV2.Prompt[]`。[E: packages/core/src/tool/question.ts:26] | assert `question` permission 后调用 Question service。[E: packages/core/src/tool/question.ts:64] [E: packages/core/src/tool/question.ts:75] | output answers array，toModelOutput 格式化为文本。[E: packages/core/src/tool/question.ts:30] [E: packages/core/src/tool/question.ts:34] |
| `skill` | `skill.ts` | `name: string`。[E: packages/core/src/tool/skill.ts:17] | boot.wait 后查 current skills；assert `read` permission on skill path。[E: packages/core/src/tool/skill.ts:64] [E: packages/core/src/tool/skill.ts:78] | 输出 skill body 和最多 10 个补充文件路径。[E: packages/core/src/tool/skill.ts:15] [E: packages/core/src/tool/skill.ts:87] |
| `todowrite` | `todowrite.ts` | `todos: SessionTodo.Info[]`；item 含 content/status/priority。[E: packages/core/src/tool/todowrite.ts:15] [E: packages/core/src/session/todo.ts:10] | assert `todowrite` permission 后更新 session todo rows。[E: packages/core/src/tool/todowrite.ts:41] [E: packages/core/src/tool/todowrite.ts:49] | output todos，model projection 是 JSON string。[E: packages/core/src/tool/todowrite.ts:18] [E: packages/core/src/tool/todowrite.ts:23] |
| `webfetch` | `webfetch.ts` | `url`, `format?` 默认 markdown，`timeout?` 秒；默认 30 秒，最大 120 秒，响应 5 MiB。[E: packages/core/src/tool/webfetch.ts:27] [E: packages/core/src/tool/webfetch.ts:29] [E: packages/core/src/tool/webfetch.ts:32] [E: packages/core/src/tool/webfetch.ts:17] [E: packages/core/src/tool/webfetch.ts:18] [E: packages/core/src/tool/webfetch.ts:19] | HTTP/HTTPS only；assert `webfetch` permission；Cloudflare challenge retry logic。[E: packages/core/src/tool/webfetch.ts:85] [E: packages/core/src/tool/webfetch.ts:138] [E: packages/core/src/tool/webfetch.ts:150] | image unsupported in V2 webfetch；text/html/markdown content string。[E: packages/core/src/tool/webfetch.ts:154] [E: packages/core/src/tool/webfetch.ts:170] |
| `websearch` | `websearch.ts` | `query`, `numResults?` default 8 max 20，`livecrawl?`, `type?`, `contextMaxCharacters?` default 10000 max 50000。[E: packages/core/src/tool/websearch.ts:40] [E: packages/core/src/tool/websearch.ts:42] [E: packages/core/src/tool/websearch.ts:52] | provider env/flags choose exa or parallel；assert `websearch` permission。[E: packages/core/src/tool/websearch.ts:76] [E: packages/core/src/tool/websearch.ts:93] [E: packages/core/src/tool/websearch.ts:209] | calls MCP endpoint and returns response text or `NO_RESULTS` sentinel。[E: packages/core/src/tool/websearch.ts:221] [E: packages/core/src/tool/websearch.ts:231] [E: packages/core/src/tool/websearch.ts:246] |

## V1 / V2 Coverage Matrix

| Capability | V1 status | V2 status |
| --- | --- | --- |
| file read/list/media | `read` built-in active。[E: packages/opencode/src/tool/registry.ts:236] | `read` built-in active via built-in tools node。[E: packages/core/src/tool/builtins.ts:41] |
| exact edit | `edit` active, plus fuzzy match fallbacks。[E: packages/opencode/src/tool/edit.ts:694] | `edit` active, exact `oldString` replacement path。[E: packages/core/src/tool/edit.ts:165] |
| write | `write` active but hidden when patch is selected for certain GPT models。[E: packages/opencode/src/tool/registry.ts:300] | `write` active via built-in tools node。[E: packages/core/src/tool/builtins.ts:46] |
| shell | V1 tool ID is `bash` for compatibility.[E: packages/opencode/src/tool/shell/id.ts:16] | V2 tool name is `bash`.[E: packages/core/src/tool/bash.ts:18] |
| task/subagent | Active in V1 built-ins。[E: packages/opencode/src/tool/registry.ts:241] | Not in current V2 built-in deps list。[I] |
| CodeMode/MCP orchestration | `execute` 在实验 CodeMode flag 下注册；启用时 session tool assembly 不再把每个 MCP tool 作为独立 wire tool 追加，MCP catalog 改由 `execute` description 与 confined runtime 暴露。[E: packages/opencode/src/tool/registry.ts:118] [E: packages/opencode/src/tool/registry.ts:246] [E: packages/opencode/src/session/tools.ts:388] [E: packages/opencode/src/session/tools.ts:390] | Not in current V2 built-in deps list。[I] |
| LSP | Experimental V1 built-in.[E: packages/opencode/src/tool/registry.ts:248] | Not in current V2 built-in deps list。[I] |
| plan exit | Experimental CLI-only V1 built-in.[E: packages/opencode/src/tool/registry.ts:248] | Not in current V2 built-in deps list。[I] |
| plugin/MCP dynamic tools | V1 registry imports plugin tools from `.opencode/{tool,tools}` and service hooks。[E: packages/opencode/src/tool/registry.ts:184] [E: packages/opencode/src/tool/registry.ts:200] | V2 MCP/plugin canonical registration is outside the current static built-in deps list。[I] |

## Sources

- packages/opencode/src/tool/
- packages/opencode/src/session/tools.ts
- packages/codemode/src/
- packages/core/src/tool/

## Related

- ref.tool-interface
