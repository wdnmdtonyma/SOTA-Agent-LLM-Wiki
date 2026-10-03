---
id: ref.coding-agent.slash-commands
title: 内置 slash 命令目录(24)
kind: catalog
tier: T3
pkg: coding-agent
source:
  - packages/coding-agent/src/core/slash-commands.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/modes/interactive/bug-report.ts
  - packages/coding-agent/src/modes/interactive/session-share.ts
  - packages/coding-agent/src/core/cache-stats.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/prompt-templates.ts
  - packages/coding-agent/src/modes/rpc/rpc-mode.ts
  - packages/coding-agent/src/extensions/index.ts
  - packages/coding-agent/src/extensions/mcp/index.ts
  - packages/coding-agent/src/extensions/llama/index.ts
  - packages/coding-agent/docs/slash-commands.md
symbols:
  - SlashCommandInfo
  - SlashCommandSource
  - BuiltinSlashCommand
  - BUILTIN_SLASH_COMMANDS
evidence: explicit
status: verified
updated: 4c6fb7cfe8
related:
  - surface.slash-commands.overview
  - surface.providers.llama-cpp
---

> `ref.coding-agent.slash-commands` 是 pi coding-agent 的 slash 命令 catalog:以 `BUILTIN_SLASH_COMMANDS` 的 **24** 个 `BuiltinSlashCommand` 为内置 ground truth,并标出交互 dispatch、动态 extension/prompt/skill 来源、以及 `/mcp`、`/llama` 这类扩展贡献的额外命令。

## 能回答的问题

- pi 当前内置 slash command 的完整清单是什么,一共几条?
- 每个内置 slash command 的参数形态、catalog 描述和交互入口在哪里?
- `/model`、`/export`、`/import`、`/compact`、`/bug` 这类带参数命令如何解析?
- `/mcp` 和 `/llama` 算不算内置 24 条?
- RPC `get_commands` 返回哪些来源,是否包含内置 TUI 命令?

## Ground Truth 与边界

`SlashCommandSource` 只覆盖 `"extension" | "prompt" | "skill"` 三类动态命令来源 [E: packages/coding-agent/src/core/slash-commands.ts:4]。`SlashCommandInfo` 含 `name`、optional `description`、`source` 和 `sourceInfo`,描述动态命令而不是内置 catalog 行 [E: packages/coding-agent/src/core/slash-commands.ts:6] [E: packages/coding-agent/src/core/slash-commands.ts:9] [E: packages/coding-agent/src/core/slash-commands.ts:10]。内置命令使用 `BuiltinSlashCommand` 的 `name`、`description` 和 optional `argumentHint` [E: packages/coding-agent/src/core/slash-commands.ts:13] [E: packages/coding-agent/src/core/slash-commands.ts:14] [E: packages/coding-agent/src/core/slash-commands.ts:15] [E: packages/coding-agent/src/core/slash-commands.ts:16]。

`BUILTIN_SLASH_COMMANDS` 当前列出 **24** 个实例,源码顺序从 `settings` 到 `quit`(含 `bug` 与 `tree`)。本页标题、正文表和 `group.slash-commands` 使用同一计数 [E: packages/coding-agent/src/core/slash-commands.ts:19] [E: packages/coding-agent/src/core/slash-commands.ts:20] [E: packages/coding-agent/src/core/slash-commands.ts:22] [E: packages/coding-agent/src/core/slash-commands.ts:28] [E: packages/coding-agent/src/core/slash-commands.ts:43]。

24 个 `name` 值:`settings`、`model`、`tree`、`thinking`、`scoped-models`、`export`、`import`、`share`、`bug`、`copy`、`name`、`session`、`changelog`、`hotkeys`、`fork`、`clone`、`trust`、`login`、`logout`、`new`、`compact`、`resume`、`reload`、`quit` [E: packages/coding-agent/src/core/slash-commands.ts:20] [E: packages/coding-agent/src/core/slash-commands.ts:43]。

交互模式 autocomplete 先把 `BUILTIN_SLASH_COMMANDS` 转成 `SlashCommand[]`,再追加 prompt templates、extension commands 和 skill commands [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:716] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:776] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:784] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:796] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:808]。extension command 若 `name` 落在内置名集合里,autocomplete 会丢掉该条;诊断文案在 `invocationName === name` 时写 Skipping,否则提示 `Available as '/${invocationName}'` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:700] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:703] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:707] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:709] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:786]。

`AgentSession._bindExtensionCore().getCommands()` 返回 extension、prompt、skill 三类动态 `SlashCommandInfo`,不返回 `BUILTIN_SLASH_COMMANDS` [E: packages/coding-agent/src/core/agent-session.ts:3314] [E: packages/coding-agent/src/core/agent-session.ts:3316] [E: packages/coding-agent/src/core/agent-session.ts:3322] [E: packages/coding-agent/src/core/agent-session.ts:3329] [E: packages/coding-agent/src/core/agent-session.ts:3336]。RPC `get_commands` 同样只收集这三类动态命令 [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:680] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:683] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:692] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:701] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:710]。

`interactive-mode.ts` 还直接处理 `/debug`、`/arminsayshi`、`/dementedelves`,这三个名字不在 `BUILTIN_SLASH_COMMANDS` 也不在 `docs/slash-commands.md` 的公开表中 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3273] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3278] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3283] [U]。本节点不把这三个非 catalog runtime 分支计入 24 个内置实例 [I]。

## 内置命令逐实例目录

表序与 `BUILTIN_SLASH_COMMANDS` 数组顺序相同。`docs/slash-commands.md` 是用户可见表,不是计数 ground truth;`/llama` 出现在用户表中但不在这 24 行 [E: packages/coding-agent/docs/slash-commands.md:17] [I]。

| command | 参数形态 | catalog 描述 | 交互执行入口 | 行为摘要 | 证据 |
| --- | --- | --- | --- | --- | --- |
| `/settings` | 无参数 | Open settings menu | `setupEditorSubmitHandler` 命中后 `showSettingsSelector()` | 打开 settings selector,可调整 auto compact、图片、skill command、队列模式、transport、thinking、theme 等。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:20]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3158]; selector [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4834] |
| `/model` | optional `<provider/model>` (`argumentHint`) | Select model (opens selector UI) | `handleModelCommand(searchTerm?)` | 无参数打开模型 selector;带参数时先 exact model reference match,命中则 `session.setModel`,否则用参数作 selector 初始搜索。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:21]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3168]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5128] |
| `/tree` | 无参数 | Navigate session tree (switch branches) | `showTreeSelector()` | 打开 session tree selector;选择非当前 leaf 后可做 branch summary,再 `session.navigateTree` 并重建 chat。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:22]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3236]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5493] |
| `/thinking` | optional `<level>` (`argumentHint`) | Set thinking level | `handleThinkingCommand(searchTerm?)` | 无参数打开 `ThinkingSelectorComponent`;带参数时对 `getAvailableThinkingLevels()` 做大小写不敏感精确匹配,命中则 `setThinkingLevel(level, { persist: false })`。selector 的 persist 回调以 `persist: true` 写启动默认。autocomplete 为 `/thinking` 补全可用 levels。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:23]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3174]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5079] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5093]; persist [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5096] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5121]; completions [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:748] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:750] |
| `/scoped-models` | 无参数 | Enable/disable models for Ctrl+P cycling | `showModelsSelector()` | 打开 scoped models selector;变更先作用于当前 session,保存动作写入 settings 的 enabled models。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:24]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3163]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5312] |
| `/export` | optional first path token; quoted path supported | Export session (HTML default, or specify path: .html/.jsonl) | `handleExportCommand(text)` | `getPathCommandArgument` 取 `/export` 后第一段 unquoted token 或第一段 quoted token。路径以 `.jsonl` 结尾时 `exportToJsonl`,否则 `exportToHtml`。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:25]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3180]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6448] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6452] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6466] |
| `/import` | required first path token; quoted path supported | Import and resume a session from a JSONL file | `handleImportCommand(text)` | 缺 path 报 usage;导入前确认;JSONL 导入后替换当前 runtime session,缺 cwd 时询问 cwd 再重试。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:26]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3185]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6495] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6497] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6502] |
| `/share` | 无参数 | Share session as a secret GitHub gist | `handleShareCommand()` → `shareSession()` | 先 `exportSessionForShare()` 写出带 `customType: "pi.share"` 的 JSONL,再 `tryShareViaRadius()`;仅当 radius provider 或 token 缺失时才检查 `gh auth status`、导出临时 HTML、`gh gist create`。Radius 上传一旦开始(含失败/abort)返回 true,不再回退 gist。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:27]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3190]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6539] [E: packages/coding-agent/src/modes/interactive/session-share.ts:57] [E: packages/coding-agent/src/modes/interactive/session-share.ts:64] [E: packages/coding-agent/src/modes/interactive/session-share.ts:69] [E: packages/coding-agent/src/modes/interactive/session-share.ts:33] |
| `/bug` | optional `<description>` (`argumentHint`) | Report a bug to the Pi developers | `handleBugCommand(hint?)` | dispatch 命中 `/bug` 或 `/bug ` 前缀后 trim hint,交给 `reportBug()`(consent、optional summary、upload 或 export)。计入 24。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:28]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3195] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3198]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6550] [E: packages/coding-agent/src/modes/interactive/bug-report.ts:50] |
| `/copy` | 无参数 | Copy last agent message to clipboard | `handleCopyCommand()` | 读取最后一条 assistant text;空则报错,否则复制到系统剪贴板。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:29]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3201]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6565] |
| `/name` | optional display name after `/name ` | Set session display name | `handleNameCommand(text)` | 带 name 时写 session name;无 name 时显示当前 session name,若也没有则提示 usage。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:30]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3206]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6596] |
| `/session` | 无参数 | Show session info and stats | `handleSessionCommand()` | 展示 session name/file/id、消息与 token 计数、总/分模型 cost,以及 `computeCacheWaste()` 得到的 cache miss 再计费。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:31]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3211]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6621] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6625]; cache [E: packages/coding-agent/src/core/cache-stats.ts:148] |
| `/changelog` | 无参数 | Show changelog entries | `handleChangelogCommand()` | 读取 changelog path,解析 entries,反向排列并渲染为 Markdown;无条目时显示 fallback 文本。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:32]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3216]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6702] |
| `/hotkeys` | 无参数 | Show all keyboard shortcuts | `handleHotkeysCommand()` | 生成 navigation、editing、other keybinding Markdown,并把 extension-registered shortcuts 追加到 Extensions 段。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:33]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3221]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6737] |
| `/fork` | 无参数 | Create a new fork from a previous user message | `showUserMessageSelector()` | 打开 user-message selector;选中历史 user entry 后调用 runtime host fork,并把 selected text 放回 editor。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:34]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3226]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5434] |
| `/clone` | 无参数 | Duplicate the current session at the current position | `handleCloneCommand()` | 用当前 leaf id 调用 runtime host fork,position 为 `at`;没有 leaf 时显示 nothing-to-clone 状态。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:35]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3231]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5472] |
| `/trust` | 无参数 | Save project trust decision for future sessions | `showTrustSelector()` | 打开 trust selector,根据选择写入 `ProjectTrustStore`;状态提示说明重启 pi 后生效。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:36]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3241]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5251] |
| `/login` | optional `<provider>` (`argumentHint`) | Configure provider authentication | `handleLoginCommand(providerRef?)` | 可带 provider 参数;无参数时打开 auth type selector,再选 provider。OAuth provider 进入 login dialog,API-key provider 进入 API key dialog。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:37]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3246]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5785] |
| `/logout` | 无参数 | Remove provider authentication | `showOAuthSelector("logout")` | 列出可移除的 stored credentials;选中后从 auth storage 删除并刷新 model registry。环境变量和 models.json config 不会被移除。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:38]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3252]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5940] |
| `/new` | 无参数 | Start a new session | `handleClearCommand()` | 停止 loading/status UI 后调用 runtime host `newSession`;成功时在 chat 中显示 new session started。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:39]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3257]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6854] |
| `/compact` | optional custom instructions after `/compact ` | Manually compact the session context | `handleCompactCommand(customInstructions?)` | 手动触发 `session.compact(customInstructions)`;dispatch 从 `/compact ` 后截取并 trim 自定义指令。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:40]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3262] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3263]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:7008] |
| `/resume` | 无参数 | Resume a different session | `showSessionSelector()` | 打开 session selector,可列出当前 cwd 或所有 session;选择后调用 runtime host switchSession 并处理 project trust context。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:41]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3288]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5642] |
| `/reload` | 无参数 | Reload keybindings, extensions, skills, prompts, themes, and context files | `handleReloadCommand()` | 若 session 正在 streaming 或 compacting 会拒绝;否则重载 session resources、HTTP dispatcher、keybindings、themes、autocomplete provider 与 extension shortcuts。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:42]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3268]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6358] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6359] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6363] |
| `/quit` | 无参数 | `Quit ${APP_NAME}` | `shutdown()` | 清空 editor 后执行交互式 shutdown:drain terminal input、stop TUI,再 dispose runtime host。 | catalog [E: packages/coding-agent/src/core/slash-commands.ts:43]; dispatch [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3293]; handler [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4223] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4250] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4254] |

## 扩展贡献的额外命令(不计入 24)

`/mcp` 与 `/llama` 由内置 extension `pi.registerCommand()` 注册,不是 `BUILTIN_SLASH_COMMANDS` 成员,因此不进入本 catalog 的 24。把它们静默加进 24 会与数组 ground truth 冲突 [I]。

`builtInExtensions` 把 `mcp` 标成 `replaceable: true, builtin: true`;第三方扩展若自己注册 `/mcp`,会替换而不是并列运行内置 MCP 扩展 [E: packages/coding-agent/src/extensions/index.ts:13]。内置 MCP 扩展调用 `pi.registerCommand("mcp", { description: "Manage MCP servers: sign in, reconnect, enable or disable, and change exposure", ... })` [E: packages/coding-agent/src/extensions/mcp/index.ts:1141] [E: packages/coding-agent/src/extensions/mcp/index.ts:1142]。无参数时 TUI 打开 MCP manager,否则接受 `login`/`logout`/`reconnect` 加 optional server name;usage 字符串为 `Usage: /mcp, /mcp login [server], /mcp logout [server], /mcp reconnect [server]` [E: packages/coding-agent/src/extensions/mcp/index.ts:274] [E: packages/coding-agent/src/extensions/mcp/index.ts:1167] [E: packages/coding-agent/src/extensions/mcp/index.ts:1168]。

`llama.cpp` 扩展是 `builtin: true` 且非 replaceable,注册 `pi.registerCommand("llama", { description: "Manage llama.cpp router models", ... })`,仅在 TUI 中管理 llama.cpp router 模型 [E: packages/coding-agent/src/extensions/index.ts:8] [E: packages/coding-agent/src/extensions/llama/index.ts:183] [E: packages/coding-agent/src/extensions/llama/index.ts:184] [E: packages/coding-agent/src/extensions/llama/index.ts:186]。用户文档 Slash Commands 表把 `/llama` 列在 Models and settings 下,仍不是 24 条内置之一 [E: packages/coding-agent/docs/slash-commands.md:17]。完整行为见 [surface.providers.llama-cpp](../surface/providers/llama-cpp.md)。

## 动态 slash 命令来源

Prompt templates 的 command name 来自 markdown 文件名去掉 `.md`;`PromptTemplate` 还携带 description、argument hint、content、sourceInfo 和 filePath [E: packages/coding-agent/src/core/prompt-templates.ts:12] [E: packages/coding-agent/src/core/prompt-templates.ts:13] [E: packages/coding-agent/src/core/prompt-templates.ts:14] [E: packages/coding-agent/src/core/prompt-templates.ts:15] [E: packages/coding-agent/src/core/prompt-templates.ts:16] [E: packages/coding-agent/src/core/prompt-templates.ts:17] [E: packages/coding-agent/src/core/prompt-templates.ts:18]。`expandPromptTemplate()` 用 `/templateName args` 匹配同名 template,再用 `substituteArgs` 生成 prompt text [E: packages/coding-agent/src/core/prompt-templates.ts:304] [E: packages/coding-agent/src/core/prompt-templates.ts:307] [E: packages/coding-agent/src/core/prompt-templates.ts:310] [E: packages/coding-agent/src/core/prompt-templates.ts:313] [E: packages/coding-agent/src/core/prompt-templates.ts:316]。

Skill commands 在 autocomplete 中以 `skill:${skill.name}` 命名,只有 `settingsManager.getEnableSkillCommands()` 为真时加入 editor autocomplete provider [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:796] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:798] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:799]。`AgentSession.prompt()` 在发送模型前会先尝试执行 extension command,再展开 skill command 和 prompt template [E: packages/coding-agent/src/core/agent-session.ts:1930] [E: packages/coding-agent/src/core/agent-session.ts:1931] [E: packages/coding-agent/src/core/agent-session.ts:1960] [E: packages/coding-agent/src/core/agent-session.ts:1961] [E: packages/coding-agent/src/core/agent-session.ts:1962]。

Extension runner 会为同名 extension commands 生成 `name:occurrence` 形式的 invocation name,并避免 invocation name 冲突 [E: packages/coding-agent/src/core/extensions/runner.ts:807] [E: packages/coding-agent/src/core/extensions/runner.ts:825] [E: packages/coding-agent/src/core/extensions/runner.ts:827] [E: packages/coding-agent/src/core/extensions/runner.ts:835]。交互模式判断“compaction 期间可以立即执行的 command”时,只检查 extension runner 是否有对应 command;prompt template 和 skill command 不走这个 `isExtensionCommand` 快路径 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3319] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4696]。

## Sources

- `packages/coding-agent/src/core/slash-commands.ts`
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`
- `packages/coding-agent/src/modes/interactive/bug-report.ts`
- `packages/coding-agent/src/modes/interactive/session-share.ts`
- `packages/coding-agent/src/core/cache-stats.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/coding-agent/src/core/extensions/runner.ts`
- `packages/coding-agent/src/core/prompt-templates.ts`
- `packages/coding-agent/src/modes/rpc/rpc-mode.ts`
- `packages/coding-agent/src/extensions/index.ts`
- `packages/coding-agent/src/extensions/mcp/index.ts`
- `packages/coding-agent/src/extensions/llama/index.ts`
- `packages/coding-agent/docs/slash-commands.md`

## 相关

- [surface.slash-commands.overview](../surface/commands/overview.md): slash command 在交互 editor、autocomplete、prompt expansion 和动态命令中的用户路径。
- [surface.providers.llama-cpp](../surface/providers/llama-cpp.md): hidden built-in `llama.cpp` 扩展提供的 `/llama` 动态命令。
