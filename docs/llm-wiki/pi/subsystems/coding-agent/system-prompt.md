---
id: subsys.coding-agent.system-prompt
title: 系统提示构建(coding-agent)
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/system-prompt.ts
  - packages/coding-agent/src/core/prompt-templates.ts
symbols:
  - buildSystemPrompt
  - BuildSystemPromptOptions
related:
  - subsys.coding-agent.agent-session
  - subsys.agent-core.system-prompt
evidence: explicit
status: verified
updated: 3da591ab
---

> `subsys.coding-agent.system-prompt` 描述 `pi-coding-agent` 产品层如何把默认 coding assistant 文案、tool snippets、prompt guidelines、project context、skills、日期和 cwd 拼成模型看到的 system prompt。

## 能回答的问题

- `buildSystemPrompt(options)` 默认会把哪些 section 放进 system prompt?
- `--system-prompt` 或自定义 system prompt 是否完全绕过 project context、skills、日期和 cwd?
- tool snippets 与 prompt guidelines 如何根据 active tools 进入 prompt?
- skills block 为什么受 read tool 可用性门控?
- prompt templates 和 system prompt builder 的关系是什么?
- extension 的 `before_agent_start` 如何临时覆盖本 turn 的 system prompt?

## 职责边界

`packages/coding-agent/src/core/system-prompt.ts` 是 `pi-coding-agent` 的完整 system prompt string builder:它定义 `BuildSystemPromptOptions`,并导出 `buildSystemPrompt(options): string`。[E: packages/coding-agent/src/core/system-prompt.ts:8] [E: packages/coding-agent/src/core/system-prompt.ts:28]

`buildSystemPrompt` 接收的输入包含 `customPrompt`、`selectedTools`、`toolSnippets`、`promptGuidelines`、`appendSystemPrompt`、`cwd`、`contextFiles`、`skills`,所以该 builder 只消费已经准备好的资源,不负责从磁盘加载 context files、skills 或 prompts。[E: packages/coding-agent/src/core/system-prompt.ts:8] [E: packages/coding-agent/src/core/system-prompt.ts:10] [E: packages/coding-agent/src/core/system-prompt.ts:12] [E: packages/coding-agent/src/core/system-prompt.ts:14] [E: packages/coding-agent/src/core/system-prompt.ts:16] [E: packages/coding-agent/src/core/system-prompt.ts:18] [E: packages/coding-agent/src/core/system-prompt.ts:20] [E: packages/coding-agent/src/core/system-prompt.ts:22] [E: packages/coding-agent/src/core/system-prompt.ts:24] [I]

`packages/coding-agent/src/core/prompt-templates.ts` 属于同一节点的相邻 prompt subsystem,但它处理的是用户输入里的 `/template args` 展开,不是 system prompt 的主体文案构造;`AgentSession` 在发送用户消息前调用 `expandPromptTemplate`,再把展开后的 text 传给 `before_agent_start` extension hook。[E: packages/coding-agent/src/core/prompt-templates.ts:269] [E: packages/coding-agent/src/core/prompt-templates.ts:278] [E: packages/coding-agent/src/core/prompt-templates.ts:281] [E: packages/coding-agent/src/core/agent-session.ts:1141] [E: packages/coding-agent/src/core/agent-session.ts:1143] [E: packages/coding-agent/src/core/agent-session.ts:1213] [E: packages/coding-agent/src/core/agent-session.ts:1214]

## 输入来源与 BuildSystemPromptOptions

`AgentSession._rebuildSystemPrompt(toolNames)` 是产品层把资源装入 builder 的主要调用点:它先过滤 active tool names,再汇总 tool snippets、tool prompt guidelines、resource loader 中的 custom prompt、append prompt、skills、AGENTS context files,最后把这些字段写入 `_baseSystemPromptOptions` 并调用 `buildSystemPrompt`。[E: packages/coding-agent/src/core/agent-session.ts:1009] [E: packages/coding-agent/src/core/agent-session.ts:1010] [E: packages/coding-agent/src/core/agent-session.ts:1011] [E: packages/coding-agent/src/core/agent-session.ts:1012] [E: packages/coding-agent/src/core/agent-session.ts:1025] [E: packages/coding-agent/src/core/agent-session.ts:1026] [E: packages/coding-agent/src/core/agent-session.ts:1029] [E: packages/coding-agent/src/core/agent-session.ts:1030] [E: packages/coding-agent/src/core/agent-session.ts:1032] [E: packages/coding-agent/src/core/agent-session.ts:1042]

`setActiveToolsByName(toolNames)` 修改 `agent.state.tools` 后会重建 base system prompt,因此模型看到的 Available tools 与 active tools 同步到下一次 agent turn。[E: packages/coding-agent/src/core/agent-session.ts:914] [E: packages/coding-agent/src/core/agent-session.ts:924] [E: packages/coding-agent/src/core/agent-session.ts:927] [E: packages/coding-agent/src/core/agent-session.ts:900]

`DefaultResourceLoader` 的 options 允许 CLI/SDK 提供 `systemPrompt` 和 `appendSystemPrompt`;loader 在 reload 时解析 system prompt source 或自动发现的 prompt file,再解析 append prompt sources,供 `AgentSession._rebuildSystemPrompt` 消费。[E: packages/coding-agent/src/core/resource-loader.ts:137] [E: packages/coding-agent/src/core/resource-loader.ts:138] [E: packages/coding-agent/src/core/resource-loader.ts:234] [E: packages/coding-agent/src/core/resource-loader.ts:235] [E: packages/coding-agent/src/core/resource-loader.ts:474] [E: packages/coding-agent/src/core/resource-loader.ts:475] [E: packages/coding-agent/src/core/resource-loader.ts:478] [E: packages/coding-agent/src/core/resource-loader.ts:480] [E: packages/coding-agent/src/core/resource-loader.ts:481] [E: packages/coding-agent/src/core/resource-loader.ts:482] [E: packages/coding-agent/src/core/resource-loader.ts:484] [E: packages/coding-agent/src/core/resource-loader.ts:486]

## 默认 system prompt

没有 `customPrompt` 时,`buildSystemPrompt` 构造一个固定产品身份开头:`You are an expert coding assistant operating inside pi, a coding agent harness`,并说明 agent 可以读文件、执行命令、编辑代码、写新文件。[E: packages/coding-agent/src/core/system-prompt.ts:46] [E: packages/coding-agent/src/core/system-prompt.ts:121]

默认 prompt 的 `Available tools` section 来自 `selectedTools` 与 `toolSnippets`:未传 `selectedTools` 时默认是 `["read", "bash", "edit", "write"]`,但只有存在 one-line snippet 的工具才会出现在 visible list;如果没有 visible tool,section 显示 `(none)`。[E: packages/coding-agent/src/core/system-prompt.ts:81] [E: packages/coding-agent/src/core/system-prompt.ts:82] [E: packages/coding-agent/src/core/system-prompt.ts:83] [E: packages/coding-agent/src/core/system-prompt.ts:84] [E: packages/coding-agent/src/core/system-prompt.ts:123]

默认 prompt 总是包含 `Guidelines` section,其中去重后的默认 guideline 至少有 `Be concise in your responses` 和 `Show file paths clearly when working with files`。[E: packages/coding-agent/src/core/system-prompt.ts:87] [E: packages/coding-agent/src/core/system-prompt.ts:88] [E: packages/coding-agent/src/core/system-prompt.ts:89] [E: packages/coding-agent/src/core/system-prompt.ts:116] [E: packages/coding-agent/src/core/system-prompt.ts:117] [E: packages/coding-agent/src/core/system-prompt.ts:119] [E: packages/coding-agent/src/core/system-prompt.ts:128]

如果 active tools 中有 `bash`,但没有 `grep`、`find`、`ls`,builder 会加入 `Use bash for file operations like ls, rg, find`;这是一条能力替代 guideline,不是 tool registry 的注册逻辑。[E: packages/coding-agent/src/core/system-prompt.ts:97] [E: packages/coding-agent/src/core/system-prompt.ts:98] [E: packages/coding-agent/src/core/system-prompt.ts:99] [E: packages/coding-agent/src/core/system-prompt.ts:100] [E: packages/coding-agent/src/core/system-prompt.ts:104] [E: packages/coding-agent/src/core/system-prompt.ts:105] [I]

默认 prompt 还包含 pi 文档路径提示:它通过 `getReadmePath()`、`getDocsPath()`、`getExamplesPath()` 生成 main docs、additional docs、examples 的绝对路径,并列出 extensions、themes、skills、prompt templates、TUI components、keybindings、SDK integrations、custom providers、models、packages 等主题对应的 docs。[E: packages/coding-agent/src/core/system-prompt.ts:75] [E: packages/coding-agent/src/core/system-prompt.ts:76] [E: packages/coding-agent/src/core/system-prompt.ts:77] [E: packages/coding-agent/src/core/system-prompt.ts:131] [E: packages/coding-agent/src/core/system-prompt.ts:132] [E: packages/coding-agent/src/core/system-prompt.ts:133] [E: packages/coding-agent/src/core/system-prompt.ts:134] [E: packages/coding-agent/src/core/system-prompt.ts:136]

## Custom prompt 与 append prompt

传入 `customPrompt` 时,`buildSystemPrompt` 不使用默认产品身份、Available tools、Guidelines 或 pi docs block,而是以 `customPrompt` 作为起始 prompt string。[E: packages/coding-agent/src/core/system-prompt.ts:46] [E: packages/coding-agent/src/core/system-prompt.ts:47] [E: packages/coding-agent/src/core/system-prompt.ts:121]

`appendSystemPrompt` 被转换成 `appendSection`,无论默认 prompt 还是 custom prompt path 都会在主体之后拼接这个 section。[E: packages/coding-agent/src/core/system-prompt.ts:41] [E: packages/coding-agent/src/core/system-prompt.ts:49] [E: packages/coding-agent/src/core/system-prompt.ts:50] [E: packages/coding-agent/src/core/system-prompt.ts:140] [E: packages/coding-agent/src/core/system-prompt.ts:141]

CLI 参数层把 `--system-prompt <text>` 写入 `Args.systemPrompt`,把可重复的 `--append-system-prompt <text>` 追加进 `Args.appendSystemPrompt`;这说明命令行可替换默认 system prompt 或附加额外文本,但具体内容仍由 resource loader 解析后交给 builder。[E: packages/coding-agent/src/cli/args.ts:16] [E: packages/coding-agent/src/cli/args.ts:17] [E: packages/coding-agent/src/cli/args.ts:93] [E: packages/coding-agent/src/cli/args.ts:94] [E: packages/coding-agent/src/cli/args.ts:95] [E: packages/coding-agent/src/cli/args.ts:97] [I]

## Project context、skills、日期与 cwd

context files 在 custom prompt 和默认 prompt 两条路径都会被追加为 `<project_context>` block,每个文件以 `<project_instructions path="...">content</project_instructions>` 包裹。[E: packages/coding-agent/src/core/system-prompt.ts:54] [E: packages/coding-agent/src/core/system-prompt.ts:55] [E: packages/coding-agent/src/core/system-prompt.ts:56] [E: packages/coding-agent/src/core/system-prompt.ts:57] [E: packages/coding-agent/src/core/system-prompt.ts:58] [E: packages/coding-agent/src/core/system-prompt.ts:60] [E: packages/coding-agent/src/core/system-prompt.ts:145] [E: packages/coding-agent/src/core/system-prompt.ts:149] [E: packages/coding-agent/src/core/system-prompt.ts:151]

skills section 由 `formatSkillsForPrompt(skills)` 追加,但 custom prompt path 要求 `selectedTools` 缺省或包含 `read`,默认 prompt path 要求 `hasRead` 为 true;因此禁用 read tool 会让 loaded skills 不进入 system prompt。[E: packages/coding-agent/src/core/system-prompt.ts:64] [E: packages/coding-agent/src/core/system-prompt.ts:65] [E: packages/coding-agent/src/core/system-prompt.ts:66] [E: packages/coding-agent/src/core/system-prompt.ts:155] [E: packages/coding-agent/src/core/system-prompt.ts:156]

system prompt 末尾会追加当前工作目录，`cwd` 在进入 prompt 前把反斜杠替换成 `/`；目标版本已不再由这个 builder 追加当前日期 [E: packages/coding-agent/src/core/system-prompt.ts:35] [E: packages/coding-agent/src/core/system-prompt.ts:39] [E: packages/coding-agent/src/core/system-prompt.ts:69] [E: packages/coding-agent/src/core/system-prompt.ts:159]。

## Prompt templates relationship

`loadPromptTemplates(options)` 从 global `agentDir/prompts`,project `cwd/.pi/prompts`,以及 explicit prompt paths 加载 markdown templates;它返回 `PromptTemplate[]`,不是 system prompt fragments。[E: packages/coding-agent/src/core/prompt-templates.ts:177] [E: packages/coding-agent/src/core/prompt-templates.ts:194] [E: packages/coding-agent/src/core/prompt-templates.ts:202] [E: packages/coding-agent/src/core/prompt-templates.ts:203] [E: packages/coding-agent/src/core/prompt-templates.ts:235] [E: packages/coding-agent/src/core/prompt-templates.ts:236] [E: packages/coding-agent/src/core/prompt-templates.ts:237] [E: packages/coding-agent/src/core/prompt-templates.ts:241] [E: packages/coding-agent/src/core/prompt-templates.ts:262]

template markdown frontmatter 可提供 `description` 和 `argument-hint`;正文 `body` 成为 template content,文件名去掉 `.md` 成为 template name。[E: packages/coding-agent/src/core/prompt-templates.ts:104] [E: packages/coding-agent/src/core/prompt-templates.ts:106] [E: packages/coding-agent/src/core/prompt-templates.ts:107] [E: packages/coding-agent/src/core/prompt-templates.ts:109] [E: packages/coding-agent/src/core/prompt-templates.ts:112] [E: packages/coding-agent/src/core/prompt-templates.ts:122] [E: packages/coding-agent/src/core/prompt-templates.ts:123] [E: packages/coding-agent/src/core/prompt-templates.ts:125] [E: packages/coding-agent/src/core/prompt-templates.ts:126]

`expandPromptTemplate(text, templates)` 只在 text 以 `/` 开头且匹配 template name 时展开;它用 `parseCommandArgs` 解析参数,再用 `substituteArgs` 替换 `$1`、`$@`、`$ARGUMENTS`、`${N:-default}`、`${@:N}` 等占位符。[E: packages/coding-agent/src/core/prompt-templates.ts:24] [E: packages/coding-agent/src/core/prompt-templates.ts:70] [E: packages/coding-agent/src/core/prompt-templates.ts:269] [E: packages/coding-agent/src/core/prompt-templates.ts:270] [E: packages/coding-agent/src/core/prompt-templates.ts:272] [E: packages/coding-agent/src/core/prompt-templates.ts:278] [E: packages/coding-agent/src/core/prompt-templates.ts:280] [E: packages/coding-agent/src/core/prompt-templates.ts:281]

## Per-turn extension override

`AgentSession.prompt` 在组装 user message 前会先展开 skill command 和 prompt template,然后把 `expandedText`、images、`_baseSystemPrompt`、`_baseSystemPromptOptions` 传给 extension runner 的 `emitBeforeAgentStart`。[E: packages/coding-agent/src/core/agent-session.ts:1140] [E: packages/coding-agent/src/core/agent-session.ts:1142] [E: packages/coding-agent/src/core/agent-session.ts:1143] [E: packages/coding-agent/src/core/agent-session.ts:1196] [E: packages/coding-agent/src/core/agent-session.ts:1213] [E: packages/coding-agent/src/core/agent-session.ts:1216] [E: packages/coding-agent/src/core/agent-session.ts:1217]

`emitBeforeAgentStart` 会把当前 system prompt 放进 event,允许 handler 返回 `systemPrompt`;多个 handler 链式修改 `currentSystemPrompt`,最终只有发生修改时才返回 `systemPrompt` 字段。[E: packages/coding-agent/src/core/extensions/runner.ts:1059] [E: packages/coding-agent/src/core/extensions/runner.ts:1065] [E: packages/coding-agent/src/core/extensions/runner.ts:1083] [E: packages/coding-agent/src/core/extensions/runner.ts:1087] [E: packages/coding-agent/src/core/extensions/runner.ts:1088] [E: packages/coding-agent/src/core/extensions/runner.ts:1090] [E: packages/coding-agent/src/core/extensions/runner.ts:1097] [E: packages/coding-agent/src/core/extensions/runner.ts:1098] [E: packages/coding-agent/src/core/extensions/runner.ts:1115] [E: packages/coding-agent/src/core/extensions/runner.ts:1118]

如果 extension result 带 `systemPrompt`,`AgentSession` 将 `agent.state.systemPrompt` 设成该值;否则它会显式恢复 `_baseSystemPrompt`,避免上一 turn 的临时修改泄漏到下一 turn。[E: packages/coding-agent/src/core/agent-session.ts:1213] [E: packages/coding-agent/src/core/agent-session.ts:1236] [E: packages/coding-agent/src/core/agent-session.ts:1240]

## 跨包边界

`subsys.coding-agent.agent-session` 是 `pi-coding-agent` 产品会话核心:它决定 active tools、资源加载结果和 extension hook 如何进入 `_baseSystemPromptOptions`,并把 builder 输出写入 `agent.state.systemPrompt`。[E: packages/coding-agent/src/core/agent-session.ts:1009] [E: packages/coding-agent/src/core/agent-session.ts:1032] [E: packages/coding-agent/src/core/agent-session.ts:1042]

`subsys.agent-core.system-prompt` 只覆盖 `pi-agent-core` harness 的 `formatSkillsForSystemPrompt(skills)` helper;当前 `buildSystemPrompt` 使用的是 coding-agent 自己的 `formatSkillsForPrompt`,不是 agent-core 的 formatter。[E: packages/agent/src/harness/system-prompt.ts:3] [E: packages/coding-agent/src/core/system-prompt.ts:6] [E: packages/coding-agent/src/core/system-prompt.ts:66] [E: packages/coding-agent/src/core/system-prompt.ts:156]

`pi-agent-core` 的 reusable `AgentHarness` 接受 string 或函数形式的 `systemPrompt`,并在 turn context 中把 system prompt 传给 `runAgentLoop`;这说明 agent-core 消费 prompt,而 coding-agent 产品层负责本节点描述的产品 prompt 内容。[E: packages/agent/src/harness/agent-harness.ts:171] [E: packages/agent/src/harness/agent-harness.ts:322] [E: packages/agent/src/harness/agent-harness.ts:323] [E: packages/agent/src/harness/agent-harness.ts:326] [E: packages/agent/src/harness/agent-harness.ts:340] [E: packages/agent/src/harness/agent-harness.ts:351] [E: packages/agent/src/harness/agent-harness.ts:353] [E: packages/agent/src/harness/agent-harness.ts:565] [E: packages/agent/src/harness/agent-harness.ts:567] [I]

## Gotcha

- `customPrompt` 是替换默认 prompt,不是在默认 prompt 前增加前缀;但 context files、skills、date、cwd 仍会追加。[E: packages/coding-agent/src/core/system-prompt.ts:46] [E: packages/coding-agent/src/core/system-prompt.ts:47] [E: packages/coding-agent/src/core/system-prompt.ts:54] [E: packages/coding-agent/src/core/system-prompt.ts:58] [E: packages/coding-agent/src/core/system-prompt.ts:64] [E: packages/coding-agent/src/core/system-prompt.ts:66] [E: packages/coding-agent/src/core/system-prompt.ts:77] [E: packages/coding-agent/src/core/system-prompt.ts:69]
- `selectedTools` 控制默认 tool set 和 skill block 的 read gate,但 Available tools section 只展示有 `toolSnippets` 的工具。[E: packages/coding-agent/src/core/system-prompt.ts:64] [E: packages/coding-agent/src/core/system-prompt.ts:81] [E: packages/coding-agent/src/core/system-prompt.ts:82] [E: packages/coding-agent/src/core/system-prompt.ts:84]
- `promptGuidelines` 会 trim 空白、丢弃空字符串,并通过 Set 去重后追加到默认 guidelines 前部。[E: packages/coding-agent/src/core/system-prompt.ts:88] [E: packages/coding-agent/src/core/system-prompt.ts:108] [E: packages/coding-agent/src/core/system-prompt.ts:109] [E: packages/coding-agent/src/core/system-prompt.ts:110] [E: packages/coding-agent/src/core/system-prompt.ts:111] [E: packages/coding-agent/src/core/system-prompt.ts:116]
- prompt templates 展开的是 user prompt text;不要把 `/template` markdown content 误认为 system prompt append source。[E: packages/coding-agent/src/core/prompt-templates.ts:269] [E: packages/coding-agent/src/core/agent-session.ts:1143] [I]

## Sources

- packages/coding-agent/src/core/system-prompt.ts
- packages/coding-agent/src/core/prompt-templates.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/cli/args.ts
- packages/agent/src/harness/system-prompt.ts
- packages/agent/src/harness/agent-harness.ts

## 相关

- [subsys.coding-agent.agent-session](./agent-session.md) - coding-agent 产品会话核心;负责把 active tools、loaded resources 和 extension hooks 接到 system prompt state。
- [subsys.agent-core.system-prompt](../agent-core/system-prompt.md) - agent-core harness 的 skill prompt formatter;它不是本节点的完整 coding-agent prompt builder。
