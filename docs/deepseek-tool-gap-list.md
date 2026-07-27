# DeepSeek 工具能力对齐清单

日期：2026-07-04

对比对象：DeepSeek、Codex、Claude、Pi、opencode。

口径说明：

- DeepSeek 以 `/Users/makii/Project/deepseek` 当前源码为准；`CLAUDE.md` 明确说明代码与测试优先于文档。
- Codex、Claude、Pi、opencode 以本仓库 `docs/llm-wiki` 下对应产品 wiki 为调研入口，并结合 wiki 指向的本地源码/接口说明做归纳。
- “缺少”不等于必须照搬。下面按 coding agent 的基础必要性、产品定位和实现收益排序。

## 1. DeepSeek 已实现工具

### 基础文件与检索

| 工具 | 状态 | 说明 |
| --- | --- | --- |
| `read_file` | 已实现 | 读取 UTF-8 工作区文件，支持行范围与字节上限，返回 sha256 与带行号内容。 |
| `list_dir` | 已实现 | 列目录，支持深度、隐藏文件、数量限制。 |
| `glob` | 已实现 | 工作区内 glob 文件匹配，支持路径与数量限制。 |
| `grep` | 已实现 | ripgrep 风格正则检索，支持输出模式、glob/type 过滤、上下文、分页、大小写与多行选项。 |

### 编辑与命令

| 工具 | 状态 | 说明 |
| --- | --- | --- |
| `write_file` | 已实现 | 创建/覆盖文件；覆盖已有文件时要求 `expected_sha256`，并生成文件变更提案。 |
| `edit_file` | 已实现 | old/new 替换，支持 `replace_all`、`expected_sha256` 和多种模糊匹配策略。 |
| `bash` | 已实现 | 在工作区运行一次性 bash 命令，受审批/沙箱约束。 |
| `request_permissions` | 已实现 | 请求窄范围权限提升，包括命令前缀、可写目录、网络域名。 |

### 协作与会话

| 工具 | 状态 | 说明 |
| --- | --- | --- |
| `update_plan` | 已实现 | 声明/替换当前计划；最多一个 `in_progress`。 |
| `request_user_input` | 已实现 | 向用户提出 1-3 个结构化问题，支持选项、自动超时等。 |
| `spawn_agent` | 可选实现 | `subagent_family` flag 开启后可用。 |
| `wait` | 可选实现 | 等待 subagent；DeepSeek 工具名是 `wait`。 |
| `send_message` | 可选实现 | 向 subagent 发消息。 |
| `close_agent` | 可选实现 | 关闭 subagent。 |
| `list_agents` | 可选实现 | 列出 subagent。 |

### 网络、技能、记忆、动态工具

| 工具 | 状态 | 说明 |
| --- | --- | --- |
| `web_fetch` | 可选实现 | flag 开启后可用；HTTP(S) 获取内容。 |
| `web_search` | 可选实现 | flag 开启后可用；通过配置的搜索端点/Tavily 查询。 |
| `skill_search` | 可选实现 | skills flag 开启后可用；搜索/加载本地 skills。 |
| `memory_search` | 可选实现 | memory 配置开启后可用；检索签名的工作区记忆记录。 |
| `tool_search` | 可选实现 | 存在 deferred dynamic tools 时可用；BM25/选择式加载动态工具。 |
| 动态 MCP 工具 | 已有框架 | MCP server 声明的 tools 可作为动态工具暴露给模型。 |
| MCP resource API | 底层已实现 | `ds-mcp` 有 list/read resource 能力，但没有发现固定的模型可见 `list_mcp_resources` / `read_mcp_resource` 工具。 |

## 2. 竞品工具目录摘要

### Pi

Pi 的工具面很小，内置 wire names 为：

| 类别 | 工具 |
| --- | --- |
| 读取/检索 | `read`, `grep`, `find`, `ls` |
| 编辑/执行 | `edit`, `write`, `bash` |

DeepSeek 已覆盖 Pi 的核心能力；主要是命名和返回结构不同。

### opencode

opencode V1/V2 的核心工具包括：

| 类别 | 工具 |
| --- | --- |
| 读取/检索 | `read`, `glob`, `grep` |
| 编辑/执行 | `edit`, `write`, `bash`, `apply_patch` |
| 计划/问题 | `todowrite`, `question`, `plan_exit` |
| 网络/技能 | `webfetch`, `websearch`, `skill` |
| 任务/扩展 | `task`, plugin/MCP 动态工具 |
| 可选实验 | `lsp` |
| 内部兜底 | `invalid` |

DeepSeek 与 opencode 的主要差距集中在 `apply_patch`、`todowrite`、`task`、`lsp`。

### Claude

Claude 的基础工具面明显更大：

| 类别 | 代表工具 |
| --- | --- |
| 文件/检索 | `Read`, `Edit`, `Write`, `Glob`, `Grep`, `NotebookEdit` |
| 命令 | `Bash`, `PowerShell` |
| 计划/任务 | `TodoWrite`, `ExitPlanMode`, `EnterPlanMode`, Todo v2 的 `TaskCreate` / `TaskGet` / `TaskUpdate` / `TaskList` |
| 子代理/协作 | `Agent`/`Task`, `TaskOutput`, `TaskStop`, `SendMessage` |
| 用户交互 | `AskUserQuestion` |
| 网络/浏览 | `WebFetch`, `WebSearch`, 可选 `WebBrowser` |
| Skills/动态工具 | `Skill`, 可选 `ToolSearch` |
| MCP resource | `ListMcpResourcesTool`, `ReadMcpResourceTool` |
| IDE/高级能力 | 可选 `LSP`, `REPL`, worktree、workflow、cron、monitor、PR subscription 等 |

DeepSeek 已覆盖 Claude 的文件、grep、bash、web、skill/search、subagent 的一部分；缺口主要是 patch 编辑、持久任务、Notebook、MCP resource 显式工具、LSP、浏览器/IDE 类能力。

### Codex

Codex 的工具面更偏“本地执行环境 + 动态扩展 + 多代理”：

| 类别 | 代表工具 |
| --- | --- |
| Shell/进程 | `exec_command`, `write_stdin`, legacy `shell_command` |
| 文件/编辑 | `apply_patch`, `view_image` |
| 计划/上下文 | `update_plan`, `request_user_input`, `new_context`, `get_context_remaining`, `curr_time`, `sleep` |
| 权限/插件 | `request_permissions`, `list_available_plugins_to_install`, `request_plugin_install` |
| MCP resource | `list_mcp_resources`, `list_mcp_resource_templates`, `read_mcp_resource` |
| 动态工具 | MCP namespace tools、deferred tools、`tool_search` |
| 多代理 | `spawn_agent`, `send_message`, `followup_task`, `wait_agent`, `interrupt_agent`, `list_agents`；另有 legacy V1 |
| 托管/扩展 | `web_search`, `image_generation`, `web.run`, `image_gen.imagegen`, goal/memory/skill namespace tools |

DeepSeek 与 Codex 最值得对齐的是 `apply_patch`、持久 shell/PTY、MCP resource 固定工具、`view_image`、上下文/时间辅助工具。

## 3. 横向能力矩阵

| 能力 | DeepSeek | Codex | Claude | Pi | opencode | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| 读文件 | `read_file` | 有 | `Read` | `read` | `read` | 已覆盖。 |
| 列目录 | `list_dir` | 可通过 shell/资源等 | 常见文件工具组合 | `ls` | 可通过读/检索组合 | 已覆盖。 |
| glob 找文件 | `glob` | 常见动态/本地工具 | `Glob` | `find` | `glob` | 已覆盖。 |
| grep 搜索 | `grep` | 常见动态/本地工具 | `Grep` | `grep` | `grep` | 已覆盖。 |
| 写文件 | `write_file` | `apply_patch`/动态写入 | `Write` | `write` | `write` | 已覆盖基础写入。 |
| 精确编辑 | `edit_file` | `apply_patch` | `Edit` | `edit` | `edit` | 已覆盖基础编辑。 |
| Patch/hunk 编辑 | 缺少固定工具 | `apply_patch` | 可通过编辑工具族实现，Claude Code 常用 Edit/MultiEdit 语义 | 无 | `apply_patch` | 高优先级缺口。 |
| 一次性命令 | `bash` | `exec_command` | `Bash` | `bash` | `bash` | 已覆盖。 |
| 持久进程/PTY | 缺少 | `exec_command` + `write_stdin` | 部分环境能力 | 无 | 无或依实现 | 高优先级缺口，适合 dev server/REPL。 |
| 用户提问 | `request_user_input` | `request_user_input` | `AskUserQuestion` | 无 | `question` | 已覆盖且较完整。 |
| 计划 | `update_plan` | `update_plan` | `EnterPlanMode`/`ExitPlanMode` | 无 | `plan_exit` | 已覆盖基本计划，但缺少退出/模式语义。 |
| 持久 todo/task | 缺少 | 可由 goal/task/计划扩展承载 | `TodoWrite`, Todo v2 | 无 | `todowrite`, `task` | 高优先级缺口。 |
| Web fetch | `web_fetch` | `web.run`/hosted 或动态 | `WebFetch` | 无 | `webfetch` | 可选已覆盖。 |
| Web search | `web_search` | `web_search`/`web.run` | `WebSearch` | 无 | `websearch` | 可选已覆盖。 |
| Skills | `skill_search` | skills namespace/dynamic | `Skill` | 无 | `skill` | 可选已覆盖。 |
| Tool discovery | `tool_search` | `tool_search` | `ToolSearch` | 无 | 动态/插件体系 | 可选已覆盖。 |
| 动态 MCP tool | 已有 | 已有 | 已有 | 无 | 已有 | 已覆盖框架。 |
| MCP resources | 底层有，模型固定工具缺 | `list_mcp_resources`, `read_mcp_resource` | `ListMcpResourcesTool`, `ReadMcpResourceTool` | 无 | 视 MCP 集成而定 | 中高优先级缺口。 |
| Subagent | flag 下有 | 多代理 V2/V1 | `Agent`/`Task` | 无 | `task` | 已有核心，但命名/等待/中断可继续补齐。 |
| 中断 subagent | 未见固定工具 | `interrupt_agent` | `TaskStop` | 无 | 视 task 实现 | 中优先级缺口。 |
| 图片查看 | 缺少 | `view_image` | 多模态/附件能力，视环境 | 无 | 无核心工具 | 高优先级缺口，尤其对桌面/前端验证有用。 |
| Notebook 编辑 | 缺少 | 无核心固定 | `NotebookEdit` | 无 | 无核心固定 | 按用户场景决定。 |
| LSP/符号 | 缺少 | 可由插件/动态工具提供 | 可选 `LSP` | 无 | 可选实验 `lsp` | 中优先级，适合大型代码库。 |
| 浏览器自动化 | 缺少 | 可通过 browser/chrome 插件 | 可选 `WebBrowser` | 无 | 非核心 | 按前端/网页测试定位决定。 |
| 时间/睡眠/上下文预算 | 缺少固定工具 | `curr_time`, `sleep`, `get_context_remaining` | 部分内部/环境能力 | 无 | 无核心 | 中低优先级，但提升长任务稳定性。 |
| 插件安装 | 缺少 | `list_available_plugins_to_install`, `request_plugin_install` | 插件/skills 体系不同 | 无 | plugin 体系 | 中低优先级，取决于生态目标。 |
| 记忆检索 | `memory_search` | memories namespace | memory/brief 等能力 | 无 | 非核心 | DeepSeek 这里已有特色能力。 |

## 4. DeepSeek 建议补齐清单

### P0 / P1：建议优先补齐

| 优先级 | 建议工具 | 为什么必要 | 对齐对象 |
| --- | --- | --- | --- |
| P0 | `apply_patch` | 多文件增删改、移动、hunk 上下文编辑比 old/new 替换更适合代码代理；也更方便审计和复放。 | Codex、opencode |
| P0 | 持久 shell：`exec_command` + `write_stdin` 或等价能力 | 一次性 `bash` 不适合 dev server、交互式 REPL、watch 测试、需要 stdin 的程序。 | Codex |
| P0 | 持久 todo/task：`todo_write` 或增强版 task 工具 | `update_plan` 更像当前回合计划，不足以承载复杂任务、恢复、子任务状态和 UI 待办。 | Claude、opencode、Codex |
| P1 | `view_image` / 媒体查看工具 | 前端、截图、设计稿、报错图片、生成图验证都需要模型可见的图像入口；当前 `read_file` 只覆盖 UTF-8 文本。 | Codex、Claude 多模态环境 |
| P1 | 固定 MCP resource 工具：`list_mcp_resources`、`list_mcp_resource_templates`、`read_mcp_resource` | DeepSeek 底层已有 MCP resource API，但模型缺少稳定入口；这会削弱 MCP connector 的可发现性。 | Codex、Claude |

### P2：按产品定位补齐

| 优先级 | 建议工具 | 适用场景 | 对齐对象 |
| --- | --- | --- | --- |
| P2 | `interrupt_agent` / 更完整 subagent 控制 | 长任务、多代理协作、用户中途改需求。 | Codex、Claude |
| P2 | `lsp` / symbol 工具 | 大型仓库中跳定义、引用、诊断、重命名；比 grep 更语义化。 | Claude、opencode |
| P2 | `notebook_edit` | 如果目标用户会处理 `.ipynb`。 | Claude |
| P2 | `current_time`、`sleep`、`get_context_remaining` | 自动化、等待、长任务预算控制。 | Codex |
| P2 | 浏览器/页面控制工具 | 前端开发、网页验收、截图回归、登录态操作。 | Codex 插件、Claude WebBrowser |
| P2 | worktree/session 工具 | 多分支并行开发、隔离实现、批量实验。 | Claude、Codex |

### P3：生态或高级产品能力

| 优先级 | 建议工具 | 适用场景 | 对齐对象 |
| --- | --- | --- | --- |
| P3 | 插件安装/启用工具 | 需要面向用户动态安装工具生态时。 | Codex |
| P3 | 图片生成 | 偏内容创作、设计资源生成，而不是 coding agent 必需能力。 | Codex hosted/image plugin |
| P3 | cron/monitor/remote trigger | 长期自动化、提醒、后台监控。 | Claude |
| P3 | PR subscription / push notification | 代码协作平台深度集成。 | Claude |
| P3 | PowerShell | 如果 Windows 是一等运行平台。 | Claude |

## 5. 最小必要工具集建议

如果目标是先补齐“coding agent 必要工具”，建议 DeepSeek 的下一轮工具集长这样：

| 保留/强化 | 工具 |
| --- | --- |
| 已有核心 | `read_file`, `list_dir`, `glob`, `grep`, `edit_file`, `write_file`, `bash`, `request_permissions`, `update_plan`, `request_user_input` |
| 已有可选 | `web_fetch`, `web_search`, `skill_search`, `tool_search`, `memory_search`, 动态 MCP tools, subagent family |
| 新增优先 | `apply_patch`, `exec_command`, `write_stdin`, `todo_write` 或 task family, `view_image`, `list_mcp_resources`, `list_mcp_resource_templates`, `read_mcp_resource` |
| 后续增强 | `interrupt_agent`, `lsp`, `current_time`, `sleep`, `get_context_remaining`, browser control |

## 6. 一句话结论

DeepSeek 已经覆盖 Pi 的全部基础 coding agent 能力，也覆盖了 opencode/Claude/Codex 的“读、搜、写、bash、web、skill、tool search、subagent、memory”主干；真正影响日常工程体验的缺口是 `apply_patch`、持久 shell/PTY、持久 todo/task、图片/媒体查看、模型可见 MCP resource 工具。这五类优先补齐后，DeepSeek 的基础工具面会更接近 Codex/Claude/opencode 的实战形态。

## 7. 本次调研入口

DeepSeek 源码入口：

- `/Users/makii/Project/deepseek/crates/ds-tools/src/lib.rs`
- `/Users/makii/Project/deepseek/crates/ds-tools/src/registry.rs`
- `/Users/makii/Project/deepseek/crates/ds-tools/src/fs_tools.rs`
- `/Users/makii/Project/deepseek/crates/ds-tools/src/search.rs`
- `/Users/makii/Project/deepseek/crates/ds-tools/src/bash.rs`
- `/Users/makii/Project/deepseek/crates/ds-tools/src/plan_tool.rs`
- `/Users/makii/Project/deepseek/crates/ds-tools/src/request_permissions.rs`
- `/Users/makii/Project/deepseek/crates/ds-tools/src/elicit.rs`
- `/Users/makii/Project/deepseek/crates/ds-tools/src/tool_search.rs`
- `/Users/makii/Project/deepseek/crates/ds-tools/src/web_fetch.rs`
- `/Users/makii/Project/deepseek/crates/ds-tools/src/web_search.rs`
- `/Users/makii/Project/deepseek/crates/ds-agents/src/tools.rs`
- `/Users/makii/Project/deepseek/crates/ds-mcp/src/tool.rs`
- `/Users/makii/Project/deepseek/crates/ds-core/src/kernel.rs`

llm wiki 入口：

- `/Users/makii/Project/Agent_Wiki/docs/llm-wiki/pi/reference/tools-catalog.md`
- `/Users/makii/Project/Agent_Wiki/docs/llm-wiki/opencode/reference/tool-catalog.md`
- `/Users/makii/Project/Agent_Wiki/docs/llm-wiki/opencode/reference/tool-interface.md`
- `/Users/makii/Project/Agent_Wiki/docs/llm-wiki/claude/subsystems/tool-system.md`
- `/Users/makii/Project/Agent_Wiki/docs/llm-wiki/claude/reference/tool-interface.md`
- `/Users/makii/Project/Agent_Wiki/docs/llm-wiki/claude/surface/tools/tool-search.md`
- `/Users/makii/Project/Agent_Wiki/docs/llm-wiki/codex/spine/tool-call-anatomy.md`
- `/Users/makii/Project/Agent_Wiki/docs/llm-wiki/codex/subsystems/core/tool-system.md`
- `/Users/makii/Project/Agent_Wiki/docs/llm-wiki/codex/surface/tools/tool-search.md`
- `/Users/makii/Project/Agent_Wiki/docs/llm-wiki/codex/surface/tools/dynamic-tools.md`
- `/Users/makii/Project/Agent_Wiki/docs/llm-wiki/codex/surface/tools/mcp-namespace-tools.md`
