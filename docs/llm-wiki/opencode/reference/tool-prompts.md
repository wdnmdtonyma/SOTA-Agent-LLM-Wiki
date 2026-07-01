---
id: ref.tool-prompts
title: Tool Prompt Assets Reference
kind: reference
tier: T3
v: v1
source:
  - packages/opencode/src/tool/
  - packages/opencode/src/tool/shell/prompt.ts
status: verified
updated: 8b68dc0d7
evidence: explicit
symbols:
  - ShellPrompt.render
  - ShellPrompt.parameterSchema
  - DESCRIPTION
related:
  - tool.bash
---

# Tool Prompt Assets Reference

本节点只描述 V1 tool prompt assets。V1 tool descriptions 大量来自 `packages/opencode/src/tool/*.txt`，各 TypeScript leaf 通过 `import DESCRIPTION from "./*.txt"` 绑定文本；V2 current built-ins 在 `packages/core/src/tool/*.ts` 中以内联 `description` 字符串构造 `Tool.make`，没有同构 `.txt` prompt 目录。[E: packages/opencode/src/tool/read.ts:7] [E: packages/core/src/tool/bash.ts:118] [E: packages/core/src/tool/AGENTS.md:16]

## V1 Prompt 文件总表

| Prompt asset | 绑定工具 | 关键内容 | 证据 |
| --- | --- | --- | --- |
| `apply_patch.txt` | `apply_patch` | 规定 patch envelope 必须包含 `*** Begin Patch` / file sections / `*** End Patch`，file operation headers 是 Add/Delete/Update。[E: packages/opencode/src/tool/apply_patch.txt:1] [E: packages/opencode/src/tool/apply_patch.txt:9] | `apply_patch.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/apply_patch.ts:13] |
| `edit.txt` | `edit` | 要求编辑前至少读过文件；强调 line number prefix 不属于 oldString/newString；`oldString` 找不到或多次命中会失败。[E: packages/opencode/src/tool/edit.txt:3] [E: packages/opencode/src/tool/edit.txt:5] [E: packages/opencode/src/tool/edit.txt:8] | `edit.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/edit.ts:11] |
| `glob.txt` | `glob` | 定位为 fast file pattern matching，支持 `**/*.js`、`src/**/*.ts`，开放搜索建议用 Task tool。[E: packages/opencode/src/tool/glob.txt:1] [E: packages/opencode/src/tool/glob.txt:5] | `glob.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/glob.ts:7] |
| `grep.txt` | `grep` | 定位为 regex content search；需要统计 match 数时要求 Bash 直接用 `rg` 而不是 grep tool。[E: packages/opencode/src/tool/grep.txt:1] [E: packages/opencode/src/tool/grep.txt:7] | `grep.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/grep.ts:7] |
| `lsp.txt` | `lsp` | 列出 goToDefinition、findReferences、hover、documentSymbol、workspaceSymbol、call hierarchy 等操作。[E: packages/opencode/src/tool/lsp.txt:3] [E: packages/opencode/src/tool/lsp.txt:12] | `lsp.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/lsp.ts:5] |
| `plan-enter.txt` | plan-entry recommendation | 用于建议切换到 plan agent，明确用户提到 plan 时 ALWAYS call this tool first。[E: packages/opencode/src/tool/plan-enter.txt:1] [E: packages/opencode/src/tool/plan-enter.txt:3] | 当前 `plan.ts` 导入的是 `plan-exit.txt`，`plan-enter.txt` 是提示资产但不在该文件直接导入。[E: packages/opencode/src/tool/plan.ts:11] [I] |
| `plan-exit.txt` | `plan_exit` | 规划完成后请求切到 build agent；要求已经写完 plan、澄清问题并准备实现。[E: packages/opencode/src/tool/plan-exit.txt:1] [E: packages/opencode/src/tool/plan-exit.txt:5] | `plan.ts` 导入 `EXIT_DESCRIPTION`。[E: packages/opencode/src/tool/plan.ts:11] |
| `question.txt` | `question` | 说明 tool 用于执行期间向用户提问；custom enabled 时自动有 free-form answer，不要包含 Other/catch-all。[E: packages/opencode/src/tool/question.txt:1] [E: packages/opencode/src/tool/question.txt:8] | `question.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/question.ts:4] |
| `read.txt` | `read` | 要求 `filePath` 绝对路径；默认返回开头最多 2000 行；offset 是 1-indexed；目录输出不带 line numbers。[E: packages/opencode/src/tool/read.txt:3] [E: packages/opencode/src/tool/read.txt:5] [E: packages/opencode/src/tool/read.txt:10] | `read.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/read.ts:7] |
| `shell/shell.txt` | `bash` | 模板中包含 `${intro}`、`${os}`、`${shell}`、`${workdirSection}`、`${tmp}`、`${commandSection}`、Git/GitHub 操作规则。[E: packages/opencode/src/tool/shell/shell.txt:1] [E: packages/opencode/src/tool/shell/shell.txt:3] [E: packages/opencode/src/tool/shell/shell.txt:13] | `shell/prompt.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/shell/prompt.ts:2] |
| `skill.txt` | `skill` | 要求按 system prompt skill list 加载专门 skill，并把 skill instructions/resources 注入当前 conversation。[E: packages/opencode/src/tool/skill.txt:1] [E: packages/opencode/src/tool/skill.txt:3] | `skill.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/skill.ts:6] |
| `task.txt` | `task` | 要求指定 `subagent_type`；不适合单文件读取或具体 class/search；建议并发启动多个 agents。[E: packages/opencode/src/tool/task.txt:1] [E: packages/opencode/src/tool/task.txt:5] [E: packages/opencode/src/tool/task.txt:13] | `task.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/task.ts:2] |
| `todowrite.txt` | `todowrite` | 说明用于维护结构化任务列表；列出 `pending/in_progress/completed/cancelled` 状态和实时更新规则。[E: packages/opencode/src/tool/todowrite.txt:1] [E: packages/opencode/src/tool/todowrite.txt:18] [E: packages/opencode/src/tool/todowrite.txt:24] | `todo.ts` 导入 `DESCRIPTION_WRITE`。[E: packages/opencode/src/tool/todo.ts:3] |
| `webfetch.txt` | `webfetch` | 定位为 URL fetch；format 支持 markdown/text/html，默认 markdown；HTTP 自动升级 HTTPS。[E: packages/opencode/src/tool/webfetch.txt:1] [E: packages/opencode/src/tool/webfetch.txt:10] [E: packages/opencode/src/tool/webfetch.txt:11] | `webfetch.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/webfetch.ts:6] |
| `websearch.txt` | `websearch` | 强调实时 web search、当前/近期信息；模板有 `{{year}}`，要求最新搜索使用 current year。[E: packages/opencode/src/tool/websearch.txt:1] [E: packages/opencode/src/tool/websearch.txt:13] | `websearch.ts` 在 description 中替换 `{{year}}`。[E: packages/opencode/src/tool/websearch.ts:105] |
| `write.txt` | `write` | 要求已有文件写入前必须 read；默认覆盖；不要主动创建文档文件，除非用户明确要求。[E: packages/opencode/src/tool/write.txt:3] [E: packages/opencode/src/tool/write.txt:5] [E: packages/opencode/src/tool/write.txt:7] | `write.ts` 导入该 DESCRIPTION。[E: packages/opencode/src/tool/write.ts:7] |

## Shell Prompt Template

`shell/prompt.ts` 是 V1 `bash` prompt 的模板渲染器。`parameterSchema` 定义 `command`、`timeout`、`workdir` 三个参数，其中 `timeout` 和 `workdir` 是 optional；旧版 `description` 参数在当前源码的 `parameterSchema` 中已不存在。[E: packages/opencode/src/tool/shell/prompt.ts:16] [E: packages/opencode/src/tool/shell/prompt.ts:17] [E: packages/opencode/src/tool/shell/prompt.ts:18] [E: packages/opencode/src/tool/shell/prompt.ts:19]

### Shell Template Placeholders

| Placeholder | 填充值来源 | 语义 |
| --- | --- | --- |
| `${intro}` | `profile(...)` 返回的 shell-specific intro。[E: packages/opencode/src/tool/shell/prompt.ts:274] | 为 bash/powershell/cmd 生成不同说明。[E: packages/opencode/src/tool/shell/prompt.ts:221] |
| `${os}` | `render(name, platform, limits, defaultTimeoutMs)` 的 `platform` 参数。[E: packages/opencode/src/tool/shell/prompt.ts:273] | 告知模型 OS。 |
| `${shell}` | `name` 参数。[E: packages/opencode/src/tool/shell/prompt.ts:273] | 告知模型当前 shell。 |
| `${tmp}` | `Global.Path.tmp`。[E: packages/opencode/src/tool/shell/prompt.ts:280] | 临时工作目录，prompt 文本说已预先批准 external directory access。[E: packages/opencode/src/tool/shell/shell.txt:7] |
| `${workdirSection}` | `selected.workdirSection`。[E: packages/opencode/src/tool/shell/prompt.ts:281] | 说明默认 workdir 与 `workdir` 参数使用方式。 |
| `${commandSection}` | `selected.commandSection`。[E: packages/opencode/src/tool/shell/prompt.ts:282] | 注入 shell-specific command usage rules。 |
| `${gitCommands}` | `selected.gitCommands`。[E: packages/opencode/src/tool/shell/prompt.ts:283] | 注入 git command 限制文本。 |
| `${toolName}` | `ShellID.ToolID`，实际是 `bash`。[E: packages/opencode/src/tool/shell/id.ts:16] [E: packages/opencode/src/tool/shell/prompt.ts:284] | 保持工具名兼容。 |
| `${gitCommandRestriction}` | `selected.gitCommandRestriction`。[E: packages/opencode/src/tool/shell/prompt.ts:285] | shell-specific GitHub/commit 限制。 |
| `${createPrInstruction}` | `selected.createPrInstruction`。[E: packages/opencode/src/tool/shell/prompt.ts:286] | PR body 创建方式的 shell-specific 指令。 |
| `${createPrExample}` | `selected.createPrExample`。[E: packages/opencode/src/tool/shell/prompt.ts:287] | PR 创建示例。 |

`renderPrompt` 会对 `${...}` 做统一替换，遇到缺失 key 直接抛 `Missing shell prompt value: ${key}`。[E: packages/opencode/src/tool/shell/prompt.ts:29] [E: packages/opencode/src/tool/shell/prompt.ts:31] 渲染完成后返回 `{ description, parameters }`，其中 parameters 来自 `parameterSchema(...)`。[E: packages/opencode/src/tool/shell/prompt.ts:289]

## Shell Prompt Policy Nuggets

| Shell family | 核心提示 | 证据 |
| --- | --- | --- |
| bash | 默认 timeout 由工具参数控制；默认 2 分钟；文件操作应优先用专用工具；并发可在单个 response 调多个工具。[E: packages/opencode/src/tool/shell/prompt.ts:105] [E: packages/opencode/src/tool/shell/prompt.ts:109] [E: packages/opencode/src/tool/shell/prompt.ts:117] | `profile` 对 POSIX shell 返回 Bash profile。[E: packages/opencode/src/tool/shell/prompt.ts:232] |
| powershell | 说明 PowerShell 语法、路径 quoting 和 here-string 等规则。[E: packages/opencode/src/tool/shell/prompt.ts:130] [E: packages/opencode/src/tool/shell/prompt.ts:146] | `profile` 针对 powershell/pwsh 分支生成。[E: packages/opencode/src/tool/shell/prompt.ts:232] |
| cmd | 说明 cmd.exe 控制流、path quoting、变量和 PR body 示例。[E: packages/opencode/src/tool/shell/prompt.ts:182] [E: packages/opencode/src/tool/shell/prompt.ts:196] [E: packages/opencode/src/tool/shell/prompt.ts:244] | `profile` 针对 `cmd.exe`/`cmd` 分支生成。[E: packages/opencode/src/tool/shell/prompt.ts:232] |

## Sources

- packages/opencode/src/tool/
- packages/opencode/src/tool/shell/prompt.ts

## Related

- tool.bash
