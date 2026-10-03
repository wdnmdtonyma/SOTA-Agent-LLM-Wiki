---
id: subsys.coding-agent.system-prompt
title: 系统提示构建(coding-agent)
kind: subsystem
tier: T2
pkg: coding-agent
source:
 - packages/coding-agent/src/core/system-prompt.ts
 - packages/coding-agent/src/core/skills.ts
 - packages/coding-agent/src/core/prompt-templates.ts
 - packages/coding-agent/src/core/resource-loader.ts
 - packages/coding-agent/src/core/agent-session.ts
 - packages/coding-agent/src/core/extensions/runner.ts
symbols:
 - buildSystemPrompt
 - buildSystemPromptSections
 - BuildSystemPromptOptions
 - normalizeBuildSystemPromptOptions
 - diffSystemPromptSections
related:
 - subsys.coding-agent.agent-session
 - surface.skills.system
 - surface.prompt-templates.system
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.coding-agent.system-prompt` 描述 `pi-coding-agent` 产品层如何把默认 coding assistant 文案、tool snippets、prompt guidelines、project context、skills 和 cwd 拼成 structured system prompt sections。实现只在 coding-agent;`packages/agent/src/harness/system-prompt.ts` 已删除。

## 能回答的问题

- `buildSystemPromptSections(input)` 默认会把哪些 named section 放进 system prompt?
- `--system-prompt` / `customPrompt` 或 `forceSystemPrompt` 是否完全绕过 project context、skills 和 cwd?
- tool snippets 与 prompt guidelines 如何根据 active tools 进入 prompt?
- skills block 为什么受 read/bash 可用性门控?
- prompt templates 和 system prompt builder 的关系是什么?
- extension 的 `before_agent_start` 如何用 `forceSystemPrompt` 临时覆盖本 turn 的 request prompt?

## 职责边界

`packages/coding-agent/src/core/system-prompt.ts` 是 `pi-coding-agent` 的 system prompt builder:它定义 `BuildSystemPromptOptions`,并导出 `normalizeBuildSystemPromptOptions`、`buildSystemPromptSections`、`buildSystemPromptState`、`buildSystemPrompt` 和 `diffSystemPromptSections`。[E: packages/coding-agent/src/core/system-prompt.ts:9] [E: packages/coding-agent/src/core/system-prompt.ts:54] [E: packages/coding-agent/src/core/system-prompt.ts:121] [E: packages/coding-agent/src/core/system-prompt.ts:186] [E: packages/coding-agent/src/core/system-prompt.ts:195] [E: packages/coding-agent/src/core/system-prompt.ts:204]

`buildSystemPrompt` 接收的输入包含 `customPrompt`、`forceSystemPrompt`、`selectedTools`、`toolSnippets`、`toolGuidelines`、`promptGuidelines`、`appendSystemPrompt`、`sections`、`cwd`、`contextFiles`、`skills`,所以该 builder 只消费已经准备好的资源,不负责从磁盘加载 context files、skills 或 prompts。[E: packages/coding-agent/src/core/system-prompt.ts:9] [E: packages/coding-agent/src/core/system-prompt.ts:11] [E: packages/coding-agent/src/core/system-prompt.ts:13] [E: packages/coding-agent/src/core/system-prompt.ts:15] [E: packages/coding-agent/src/core/system-prompt.ts:17] [E: packages/coding-agent/src/core/system-prompt.ts:21] [E: packages/coding-agent/src/core/system-prompt.ts:23] [E: packages/coding-agent/src/core/system-prompt.ts:27] [E: packages/coding-agent/src/core/system-prompt.ts:29] [E: packages/coding-agent/src/core/system-prompt.ts:31] [I]

默认输出是 named sections:`preamble` 是 untagged 文本,其它 key 会被包成同名 XML tag,随后成为 transcript `SystemMessage.sections`。[E: packages/coding-agent/src/core/system-prompt.ts:50] [E: packages/coding-agent/src/core/system-prompt.ts:175] [E: packages/coding-agent/src/core/system-prompt.ts:177] `buildSystemPrompt()` 把 `buildSystemPromptState()` 交给 `getSystemMessageText()`,因此渲染文本与 transcript replay 一致。[E: packages/coding-agent/src/core/system-prompt.ts:186] [E: packages/coding-agent/src/core/system-prompt.ts:195] [E: packages/coding-agent/src/core/system-prompt.ts:196]

`packages/coding-agent/src/core/prompt-templates.ts` 属于相邻 prompt subsystem,但它处理的是用户输入里的 `/template args` 展开,不是 system prompt 的主体文案构造;`AgentSession` 在发送用户消息前调用 `expandPromptTemplate`,再把展开后的 text 传给 `before_agent_start` extension hook。[E: packages/coding-agent/src/core/prompt-templates.ts:304] [E: packages/coding-agent/src/core/prompt-templates.ts:313] [E: packages/coding-agent/src/core/prompt-templates.ts:316] [E: packages/coding-agent/src/core/agent-session.ts:1960] [E: packages/coding-agent/src/core/agent-session.ts:1962] [E: packages/coding-agent/src/core/agent-session.ts:2015]

## 输入来源与 BuildSystemPromptOptions

`AgentSession._rebuildSystemPrompt(toolNames)` 是产品层把资源装入 builder 的主要调用点:它先过滤 registry 内的 tool names,再汇总 tool snippets(隐藏声明不列出)、tool prompt guidelines、resource loader 中的 custom prompt、append prompt、skills、AGENTS context files,最后写入 `_baseSystemPromptOptions`。[E: packages/coding-agent/src/core/agent-session.ts:1652] [E: packages/coding-agent/src/core/agent-session.ts:1653] [E: packages/coding-agent/src/core/agent-session.ts:1658] [E: packages/coding-agent/src/core/agent-session.ts:1661] [E: packages/coding-agent/src/core/agent-session.ts:1662] [E: packages/coding-agent/src/core/agent-session.ts:1664] [E: packages/coding-agent/src/core/agent-session.ts:1665] [E: packages/coding-agent/src/core/agent-session.ts:1667]

`setActiveToolsByName(toolNames)` 修改 active tools 后会重建 base system prompt,因此模型看到的 tools section 与 active tools 同步到下一次 agent turn。[E: packages/coding-agent/src/core/agent-session.ts:1488] [E: packages/coding-agent/src/core/agent-session.ts:1490] [E: packages/coding-agent/src/core/agent-session.ts:1497] [E: packages/coding-agent/src/core/agent-session.ts:1500]

下一跳 request 并不直接把整段 string 写进 `agent.state.systemPrompt`。`_preparePromptAndToolLoadout()` 用 `diffSystemPromptSections(previous, buildSystemPromptSections(options))` 生成 `SystemMessage.sections` patch;无变化则返回 undefined。[E: packages/coding-agent/src/core/agent-session.ts:1689] [E: packages/coding-agent/src/core/agent-session.ts:1698] [E: packages/coding-agent/src/core/agent-session.ts:1702] [E: packages/coding-agent/src/core/system-prompt.ts:204]

`DefaultResourceLoader` 的 options 允许 CLI/SDK 提供 `systemPrompt` 和 `appendSystemPrompt`;loader 在 reload 时解析 system prompt source 或自动发现的 prompt file,再解析 append prompt sources,供 `AgentSession._rebuildSystemPrompt` 消费。[E: packages/coding-agent/src/core/resource-loader.ts:287] [E: packages/coding-agent/src/core/resource-loader.ts:288] [E: packages/coding-agent/src/core/resource-loader.ts:645] [E: packages/coding-agent/src/core/resource-loader.ts:646] [E: packages/coding-agent/src/core/resource-loader.ts:647] [E: packages/coding-agent/src/core/resource-loader.ts:651] [E: packages/coding-agent/src/core/resource-loader.ts:656] [E: packages/coding-agent/src/core/resource-loader.ts:659]

## 默认 system prompt sections

没有 `customPrompt` 时,`buildSystemPromptSections` 把 `preamble` 设为固定产品身份:`You are an expert coding assistant operating inside pi, a coding agent harness`,并说明 agent 可以读文件、执行命令、编辑代码、写新文件。[E: packages/coding-agent/src/core/system-prompt.ts:143] [E: packages/coding-agent/src/core/system-prompt.ts:146] [E: packages/coding-agent/src/core/system-prompt.ts:147]

默认 prompt 的 `tools` section 来自 `selectedTools` 与 `toolSnippets`:未传 `selectedTools` 时默认是 `["read", "bash", "edit", "write"]`,但只有存在 one-line snippet 的工具才会出现在 visible list;如果没有 visible tool,section 显示 `(none)`。[E: packages/coding-agent/src/core/system-prompt.ts:58] [E: packages/coding-agent/src/core/system-prompt.ts:148] [E: packages/coding-agent/src/core/system-prompt.ts:149] [E: packages/coding-agent/src/core/system-prompt.ts:150] [E: packages/coding-agent/src/core/system-prompt.ts:151]

默认 prompt 总是包含 `rules` section,其中去重后的默认 guideline 至少有 `Be concise in your responses` 和 `Show file paths clearly when working with files`。[E: packages/coding-agent/src/core/system-prompt.ts:81] [E: packages/coding-agent/src/core/system-prompt.ts:115] [E: packages/coding-agent/src/core/system-prompt.ts:116] [E: packages/coding-agent/src/core/system-prompt.ts:152]

如果 active tools 里有 `bash` 或 `powershell`,但没有 `grep`、`find`、`ls`,builder 会加一条文件探索 guideline:两者都在时写 `Use bash or PowerShell for file operations like listing, searching, and finding files`;只有 `powershell` 时写 PowerShell 版;只有 `bash` 时仍写 `Use bash for file operations like ls, rg, find`。[E: packages/coding-agent/src/core/system-prompt.ts:101] [E: packages/coding-agent/src/core/system-prompt.ts:103] [E: packages/coding-agent/src/core/system-prompt.ts:105] [E: packages/coding-agent/src/core/system-prompt.ts:107] 这是能力替代 guideline,不是 tool registry 的注册逻辑。[I]

默认 prompt 还包含 `docs` section:它通过 `getReadmePath()`、`getDocsPath()`、`getExamplesPath()` 生成 main docs、additional docs、examples 的绝对路径,并列出 extensions、themes、skills、prompt templates、TUI、MCP、codemode 等主题对应的 docs。[E: packages/coding-agent/src/core/system-prompt.ts:6] [E: packages/coding-agent/src/core/system-prompt.ts:153] [E: packages/coding-agent/src/core/system-prompt.ts:154] [E: packages/coding-agent/src/core/system-prompt.ts:155] [E: packages/coding-agent/src/core/system-prompt.ts:159]

## Custom prompt、append prompt 与 force prompt

传入 `customPrompt` 时,builder 不写入默认 `tools` / `rules` / `docs`,而是把 `customPrompt` 作为 `preamble`。[E: packages/coding-agent/src/core/system-prompt.ts:143] [E: packages/coding-agent/src/core/system-prompt.ts:144]

`appendSystemPrompt` 被写成 `addendum` section,无论默认 prompt 还是 custom prompt path 都会在 preamble 之后拼接。[E: packages/coding-agent/src/core/system-prompt.ts:163]

`forceSystemPrompt` 走另一条路径:`buildSystemPromptState()` 若看到它,就返回 `{ content: forceSystemPrompt }` 且 **没有** sections。[E: packages/coding-agent/src/core/system-prompt.ts:190] 这是 extension `before_agent_start` 用来把精确文本放到 request 头部的 opaque replacement,不是替换磁盘上的 structured sections。[E: packages/coding-agent/src/core/extensions/runner.ts:1454] [E: packages/coding-agent/src/core/extensions/runner.ts:1455] [I]

## Project context、skills 与 cwd

每个目录只加载一个 context 文件。`loadContextFileFromDir()` 按 `AGENTS.override.md`、`AGENTS.md`、`AGENTS.MD`、`CLAUDE.md`、`CLAUDE.MD` 的顺序取第一个存在的普通文件;因此同目录的 `AGENTS.override.md` 会替换 `AGENTS.md` / `CLAUDE.md`,不会叠加。[E: packages/coding-agent/src/core/resource-loader.ts:184] [E: packages/coding-agent/src/core/resource-loader.ts:185] [E: packages/coding-agent/src/core/resource-loader.ts:188] `loadProjectContextFiles()` 先读 `agentDir` 的 global context,再从 cwd 向上收集 ancestor context,并用 path set 去重;嵌套 worktree 还会跳过被 shadow 的 main-repo 副本。[E: packages/coding-agent/src/core/resource-loader.ts:232] [E: packages/coding-agent/src/core/resource-loader.ts:242] [E: packages/coding-agent/src/core/resource-loader.ts:254] [E: packages/coding-agent/src/core/resource-loader.ts:257]

context files 在 custom prompt 和默认 prompt 两条路径都会被写成 `project_context` section,每个文件以 `<project_instructions path="...">content</project_instructions>` 包裹。[E: packages/coding-agent/src/core/system-prompt.ts:72] [E: packages/coding-agent/src/core/system-prompt.ts:76] [E: packages/coding-agent/src/core/system-prompt.ts:164]

skills section 由 `skillFileReadTool = (["read", "bash"] as const).find((tool) => selectedTools.includes(tool))` 门控;关掉 read 但保留 bash 仍会注入 skills。`formatSkillsForPrompt(skills, skillFileReadTool)` 在 bash 分支会写 `Use bash to load…`。[E: packages/coding-agent/src/core/system-prompt.ts:165] [E: packages/coding-agent/src/core/system-prompt.ts:166] [E: packages/coding-agent/src/core/system-prompt.ts:167] [E: packages/coding-agent/src/core/skills.ts:355] [E: packages/coding-agent/src/core/skills.ts:364] [E: packages/coding-agent/src/core/skills.ts:366]

system prompt 末尾会追加 `cwd` section，进入 prompt 前把反斜杠替换成 `/`；这个 builder 不再追加当前日期。[E: packages/coding-agent/src/core/system-prompt.ts:170]

调用方还可以通过 `sections` 注入额外 XML-wrapped section;name 必须匹配 `^[a-z][a-z0-9_-]*$` 且不能叫 `preamble`,否则 throw。[E: packages/coding-agent/src/core/system-prompt.ts:52] [E: packages/coding-agent/src/core/system-prompt.ts:136] [E: packages/coding-agent/src/core/system-prompt.ts:138] [E: packages/coding-agent/src/core/system-prompt.ts:171]

## Prompt templates relationship

`loadPromptTemplates(options)` 从 global `agentDir/prompts`,project `cwd/.pi/prompts`,以及 explicit prompt paths 加载 markdown templates;它返回 `PromptTemplate[]`,不是 system prompt fragments。[E: packages/coding-agent/src/core/prompt-templates.ts:200] [E: packages/coding-agent/src/core/prompt-templates.ts:222] [E: packages/coding-agent/src/core/prompt-templates.ts:235] [E: packages/coding-agent/src/core/prompt-templates.ts:268] [E: packages/coding-agent/src/core/prompt-templates.ts:274]

`expandPromptTemplate(text, templates)` 只在 text 以 `/` 开头且匹配 template name 时展开;它用 `parseCommandArgs` 解析参数,再用 `substituteArgs` 替换 `$1`、`$@`、`$ARGUMENTS`、`${N:-default}`、`${@:N}` 等占位符。[E: packages/coding-agent/src/core/prompt-templates.ts:25] [E: packages/coding-agent/src/core/prompt-templates.ts:71] [E: packages/coding-agent/src/core/prompt-templates.ts:304] [E: packages/coding-agent/src/core/prompt-templates.ts:305] [E: packages/coding-agent/src/core/prompt-templates.ts:307] [E: packages/coding-agent/src/core/prompt-templates.ts:313] [E: packages/coding-agent/src/core/prompt-templates.ts:315] [E: packages/coding-agent/src/core/prompt-templates.ts:316]

## Per-turn extension override

`AgentSession.prompt` 在组装 user message 前会先展开 skill command 和 prompt template,然后把 `expandedText`、images、`_baseSystemPromptOptions` 传给 extension runner 的 `emitBeforeAgentStart`。[E: packages/coding-agent/src/core/agent-session.ts:1959] [E: packages/coding-agent/src/core/agent-session.ts:1961] [E: packages/coding-agent/src/core/agent-session.ts:1962] [E: packages/coding-agent/src/core/agent-session.ts:2015] [E: packages/coding-agent/src/core/agent-session.ts:2018]

`emitBeforeAgentStart` 会把当前 system prompt 放进 event 的 getter,允许 handler 返回 `systemPrompt`;多个 handler 链式修改 `currentOptions`,若返回 `systemPrompt` 就把 `currentOptions.forceSystemPrompt` 设成该值。[E: packages/coding-agent/src/core/extensions/runner.ts:1420] [E: packages/coding-agent/src/core/extensions/runner.ts:1426] [E: packages/coding-agent/src/core/extensions/runner.ts:1444] [E: packages/coding-agent/src/core/extensions/runner.ts:1454] [E: packages/coding-agent/src/core/extensions/runner.ts:1455] [E: packages/coding-agent/src/core/extensions/runner.ts:1471]

`AgentSession` 把 hook 结果存进 `_runSystemPromptOptions`,并用 `_preparePromptAndToolLoadout(result.systemPromptOptions)` 生成 transcript 的 structured section patch。forced text 不写进 transcript: `_installAgentForcedPromptProjection()` 在 `transformContext` 里把 system messages 收成一条 `content: forced` 的 head,只影响本次 request。[E: packages/coding-agent/src/core/agent-session.ts:2058] [E: packages/coding-agent/src/core/agent-session.ts:2059] [E: packages/coding-agent/src/core/agent-session.ts:1740] [E: packages/coding-agent/src/core/agent-session.ts:1744] [E: packages/coding-agent/src/core/agent-session.ts:1747] [E: packages/coding-agent/src/core/agent-session.ts:1753]

## 跨包边界

`subsys.coding-agent.agent-session` 是 `pi-coding-agent` 产品会话核心:它决定 active tools、资源加载结果和 extension hook 如何进入 `_baseSystemPromptOptions`,并把 section diff 写入 transcript system message。[E: packages/coding-agent/src/core/agent-session.ts:1652] [E: packages/coding-agent/src/core/agent-session.ts:1698] [E: packages/coding-agent/src/core/agent-session.ts:2058]

`surface.skills.system` 覆盖 `formatSkillsForPrompt()` 与 `/skill:name`;本节点只说明 skills section 何时被 `buildSystemPromptSections()` 写入。[E: packages/coding-agent/src/core/system-prompt.ts:7] [E: packages/coding-agent/src/core/system-prompt.ts:167]

`pi-agent-core` 消费 transcript 里的 system messages,不再提供 harness `formatSkillsForSystemPrompt` 或 `AgentHarness.systemPrompt`。[I]

## Gotcha

- `customPrompt` 是替换默认 preamble / tools / rules / docs,不是在默认 prompt 前增加前缀;但 context files、skills 和 cwd 仍会追加。同目录若存在 `AGENTS.override.md`,该目录不会再读 `AGENTS.md` 或 `CLAUDE.md`。[E: packages/coding-agent/src/core/system-prompt.ts:143] [E: packages/coding-agent/src/core/system-prompt.ts:164] [E: packages/coding-agent/src/core/system-prompt.ts:165] [E: packages/coding-agent/src/core/system-prompt.ts:170] [E: packages/coding-agent/src/core/resource-loader.ts:185]
- `forceSystemPrompt` 只影响本次 request 的 leading system prompt 投影,structured sections 仍会 diff 并持久化。[E: packages/coding-agent/src/core/system-prompt.ts:190] [E: packages/coding-agent/src/core/agent-session.ts:1744] [E: packages/coding-agent/src/core/agent-session.ts:2058]
- `selectedTools` 控制默认 tool set 和 skill block 的 read/bash gate,但 `tools` section 只展示有 `toolSnippets` 的工具。[E: packages/coding-agent/src/core/system-prompt.ts:148] [E: packages/coding-agent/src/core/system-prompt.ts:165]
- `promptGuidelines` 会 trim 空白、丢弃空字符串,并通过 Set 去重后追加到默认 guidelines 前部。[E: packages/coding-agent/src/core/system-prompt.ts:88] [E: packages/coding-agent/src/core/system-prompt.ts:114]
- prompt templates 展开的是 user prompt text;不要把 `/template` markdown content 误认为 system prompt append source。[E: packages/coding-agent/src/core/prompt-templates.ts:304] [E: packages/coding-agent/src/core/agent-session.ts:1962] [I]

## Sources

- packages/coding-agent/src/core/system-prompt.ts
- packages/coding-agent/src/core/skills.ts
- packages/coding-agent/src/core/prompt-templates.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/extensions/runner.ts

## 相关

- [subsys.coding-agent.agent-session](./agent-session.md) - coding-agent 产品会话核心;负责把 active tools、loaded resources 和 extension hooks 接到 system prompt state。
- [surface.skills.system](../../surface/skills/system.md) - skill discovery 与 `formatSkillsForPrompt()`;本节点只说明 skills section 的装配时机。
- [surface.prompt-templates.system](../../surface/prompts/system.md) - `/template` 展开的是 user prompt,不是 system prompt append source。
