---
id: surface.skills.system
title: skills 系统
kind: surface
tier: T1
pkg: coding-agent
source:
 - packages/coding-agent/src/core/skills.ts
 - packages/coding-agent/src/core/package-manager.ts
 - packages/coding-agent/src/core/resource-loader.ts
 - packages/coding-agent/src/core/system-prompt.ts
 - packages/coding-agent/src/core/settings-manager.ts
 - packages/coding-agent/src/core/agent-session.ts
 - packages/coding-agent/src/modes/interactive/interactive-mode.ts
 - packages/coding-agent/docs/skills.md
 - .pi/skills/add-llm-provider.md
symbols:
 - loadSkills
 - Skill
 - formatSkillsForPrompt
related:
 - subsys.coding-agent.system-prompt
 - surface.slash-commands.overview
 - subsys.coding-agent.resource-loader
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `surface.skills.system` 描述 pi-coding-agent 暴露给用户的 skills 系统:从哪些位置加载 skill、`SKILL.md` 如何变成 `Skill`、怎样把摘要写入 system prompt、以及 `/skill:name` 何时展开完整内容。加载实现只在 `packages/coding-agent/src/core/skills.ts`;agent-core 已无 harness skill loader。

## 能回答的问题

- pi 会从哪些用户、项目、package、settings、CLI 位置发现 skills?
- 一个 `SKILL.md` 的 frontmatter 会生成哪些 `Skill` 字段,缺少 description 会怎样?
- skill 描述如何进入 system prompt,`disable-model-invocation` 会隐藏什么?
- `/skill:name args` 如何展开成完整 skill 内容,它和模型自选 skill 有什么差异?
- `enableSkillCommands` 在 settings 和 interactive autocomplete 中怎样生效?
- 本节点与 `subsys.coding-agent.system-prompt` / `surface.slash-commands.overview` 的边界是什么?

## 可见模型

Pi 的 skills 是自包含 capability packages:用户把 `SKILL.md`、脚本、reference 文档和 assets 放在一个目录里。启动时 pi 把 name、description 和 path 写进 system prompt,不把完整 instructions 预先塞进上下文;任务匹配时由模型用 `read` 加载,或在 `read` 不可用时用 `bash` 加载,也可由 `/skill:name` 强制展开。[E: packages/coding-agent/docs/skills.md:3] [E: packages/coding-agent/docs/skills.md:43] [E: packages/coding-agent/docs/skills.md:45]

产品文档把 skill 位置写成 user/project skills 目录,并额外支持 Agent Skills 位置 `~/.agents/skills/` 与 `.agents/skills/`;项目 `.agents/skills/` 从 cwd 向祖先扫描,遇到仓库根就停。standalone Markdown 也可被接受,但带 `SKILL.md` 的目录才是 portable form。package 与 settings 的额外位置见 Settings / Pi Packages。[E: packages/coding-agent/docs/skills.md:59] [E: packages/coding-agent/docs/skills.md:61] [E: packages/coding-agent/docs/skills.md:63] 项目 skills 只在项目被信任后由 package-manager 扫描 `.pi/skills` 与祖先 `.agents/skills`;未信任时 `projectAgentsSkillDirs` 为空并跳过 project `.pi` skills。[E: packages/coding-agent/src/core/package-manager.ts:2459] [E: packages/coding-agent/src/core/package-manager.ts:2460] [E: packages/coding-agent/src/core/package-manager.ts:2478] [E: packages/coding-agent/src/core/package-manager.ts:2489] [E: packages/coding-agent/src/core/package-manager.ts:2499]

源码侧的 product loader 入口是 `loadSkills(options)`。它接收 `cwd`、`agentDir`、显式 `skillPaths` 和 `includeDefaults`;`includeDefaults` 为真时扫描 global `agentDir/skills` 和 project `cwd/.pi/skills`,再把显式 paths 解析为目录或 `.md` 文件加载。[E: packages/coding-agent/src/core/skills.ts:394] [E: packages/coding-agent/src/core/skills.ts:409] [E: packages/coding-agent/src/core/skills.ts:413] [E: packages/coding-agent/src/core/skills.ts:452] [E: packages/coding-agent/src/core/skills.ts:453] [E: packages/coding-agent/src/core/skills.ts:454] [E: packages/coding-agent/src/core/skills.ts:477] [E: packages/coding-agent/src/core/skills.ts:488] [E: packages/coding-agent/src/core/skills.ts:490]

## Skill 文件与字段

`Skill` 包含 `name`、`description`、`filePath`、`baseDir`、`sourceInfo` 和 `disableModelInvocation`;这些字段由 `loadSkillFromFile()` 从 markdown frontmatter、文件路径和 source provenance 组合出来。[E: packages/coding-agent/src/core/skills.ts:74] [E: packages/coding-agent/src/core/skills.ts:75] [E: packages/coding-agent/src/core/skills.ts:76] [E: packages/coding-agent/src/core/skills.ts:77] [E: packages/coding-agent/src/core/skills.ts:78] [E: packages/coding-agent/src/core/skills.ts:79] [E: packages/coding-agent/src/core/skills.ts:80] [E: packages/coding-agent/src/core/skills.ts:334] [E: packages/coding-agent/src/core/skills.ts:335]

`SkillFrontmatter` 读取 `name`、`description` 和 `disable-model-invocation`,同时允许其它 unknown keys。`loadSkillFromFile()` 用 `basename === "SKILL.md"` 区分 declared skill:parse 失败只给 `SKILL.md` 记 warning;其它 `.md` 缺 description 时直接 `{ skill: null }` 且不产生 diagnostic。[E: packages/coding-agent/src/core/skills.ts:67] [E: packages/coding-agent/src/core/skills.ts:282] [E: packages/coding-agent/src/core/skills.ts:297] [E: packages/coding-agent/src/core/skills.ts:306] declared `SKILL.md` 缺 description 仍会 warning 且不加载;name validation error 仍是 warning 但 skill 可以留下。[E: packages/coding-agent/src/core/skills.ts:314] [E: packages/coding-agent/src/core/skills.ts:330]

Name validation 检查 64 字符上限、小写字母数字连字符、首尾非连字符、无连续连字符。产品 loader **不**要求 name 等于父目录名;文档也写 Pi neither requires nor warns when the declared name differs from the parent directory。[E: packages/coding-agent/src/core/skills.ts:92] [E: packages/coding-agent/src/core/skills.ts:95] [E: packages/coding-agent/src/core/skills.ts:99] [E: packages/coding-agent/src/core/skills.ts:103] [E: packages/coding-agent/src/core/skills.ts:107] [E: packages/coding-agent/docs/skills.md:81] [E: packages/coding-agent/docs/skills.md:83]

项目内 `.pi/skills/add-llm-provider.md` 是一个真实 skill 文件:它用 frontmatter 声明 `name: add-llm-provider` 和具体 description,正文把新增 LLM provider 的核心类型、实现、lazy registration、model generation、tests、coding-agent wiring 与 docs 拆成步骤。[E: .pi/skills/add-llm-provider.md:1] [E: .pi/skills/add-llm-provider.md:2] [E: .pi/skills/add-llm-provider.md:3] [E: .pi/skills/add-llm-provider.md:8] [E: .pi/skills/add-llm-provider.md:29] [E: .pi/skills/add-llm-provider.md:36] [E: .pi/skills/add-llm-provider.md:41] [E: .pi/skills/add-llm-provider.md:48] [E: .pi/skills/add-llm-provider.md:56]

## 发现规则与去重

`loadSkillsFromDirInternal()` 先读取 ignore files,再优先查找非 ignored 的 `SKILL.md`;目录内一旦命中 `SKILL.md`,loader 加载该文件并返回,不会继续把同目录 sibling 当作独立 skills。[E: packages/coding-agent/src/core/skills.ts:168] [E: packages/coding-agent/src/core/skills.ts:189] [E: packages/coding-agent/src/core/skills.ts:194] [E: packages/coding-agent/src/core/skills.ts:195] [E: packages/coding-agent/src/core/skills.ts:210] [E: packages/coding-agent/src/core/skills.ts:211] [E: packages/coding-agent/src/core/skills.ts:215] [E: packages/coding-agent/src/core/skills.ts:220]

没有 `SKILL.md` 时,loader 跳过 hidden entries 和 `node_modules`,递归进入子目录,并且只在 `includeRootFiles` 为真时把当前 root 的直接 `.md` 文件交给 `loadSkillFromFile()`;这些文件仍需 valid skill frontmatter,否则静默跳过。[E: packages/coding-agent/src/core/skills.ts:223] [E: packages/coding-agent/src/core/skills.ts:224] [E: packages/coding-agent/src/core/skills.ts:229] [E: packages/coding-agent/src/core/skills.ts:255] [E: packages/coding-agent/src/core/skills.ts:256] [E: packages/coding-agent/src/core/skills.ts:262] [E: packages/coding-agent/src/core/skills.ts:306] package-manager 的 `.agents/skills` 扫描用 `mode === "agents"`:root `.md` 不收录,但 grouping folder(`dir !== root`)里的 `.md` 会收录,再由 product loader 按 frontmatter 过滤。[E: packages/coding-agent/src/core/package-manager.ts:369] [E: packages/coding-agent/src/core/package-manager.ts:428] [E: packages/coding-agent/src/core/package-manager.ts:432] [E: packages/coding-agent/src/core/package-manager.ts:2557]

`loadSkills()` 以 skill name 做 first-wins 去重:相同真实文件路径会被静默跳过,相同 name 的不同文件会生成 collision diagnostic,而第一份 skill 留在 `skillMap` 中。[E: packages/coding-agent/src/core/skills.ts:416] [E: packages/coding-agent/src/core/skills.ts:417] [E: packages/coding-agent/src/core/skills.ts:425] [E: packages/coding-agent/src/core/skills.ts:428] [E: packages/coding-agent/src/core/skills.ts:434] [E: packages/coding-agent/src/core/skills.ts:441] [E: packages/coding-agent/src/core/skills.ts:446]

## Resource loader 装配

`DefaultResourceLoader.reload()` 从 package manager 得到 enabled skill resources,把 package-origin 或 auto-source 目录映射到 `SKILL.md` 文件时会保留 metadata,再把 CLI、package/settings 和 additional skill paths 合并后调用 `updateSkillsFromPaths()`。[E: packages/coding-agent/src/core/resource-loader.ts:521] [E: packages/coding-agent/src/core/resource-loader.ts:546] [E: packages/coding-agent/src/core/resource-loader.ts:550] [E: packages/coding-agent/src/core/resource-loader.ts:587] [E: packages/coding-agent/src/core/resource-loader.ts:588] [E: packages/coding-agent/src/core/resource-loader.ts:592] [E: packages/coding-agent/src/core/resource-loader.ts:792] [E: packages/coding-agent/src/core/resource-loader.ts:793] [E: packages/coding-agent/src/core/resource-loader.ts:804] [E: packages/coding-agent/src/core/resource-loader.ts:807] [E: packages/coding-agent/src/core/resource-loader.ts:809]

`updateSkillsFromPaths()` 在 `noSkills` 且传入的 `skillPaths` 为空时返回空列表,否则调用 product `loadSkills({ includeDefaults: false })`;随后它把 extension/package metadata、loader 自带 `sourceInfo` 或默认路径分类补回每个 `Skill.sourceInfo`。[E: packages/coding-agent/src/core/resource-loader.ts:828] [E: packages/coding-agent/src/core/resource-loader.ts:830] [E: packages/coding-agent/src/core/resource-loader.ts:831] [E: packages/coding-agent/src/core/resource-loader.ts:833] [E: packages/coding-agent/src/core/resource-loader.ts:837] [E: packages/coding-agent/src/core/resource-loader.ts:840] [E: packages/coding-agent/src/core/resource-loader.ts:841] [E: packages/coding-agent/src/core/resource-loader.ts:843] [E: packages/coding-agent/src/core/resource-loader.ts:844] [E: packages/coding-agent/src/core/resource-loader.ts:846]

`mapSkillPath()` 对 package-origin 或 auto-source 的目录做一个 convenience mapping:如果该目录存在 `SKILL.md`,它返回具体 skill file 并把 metadata 记到 `metadataByPath`;非目录、stat 失败或没有 `SKILL.md` 时保留原路径。[E: packages/coding-agent/src/core/resource-loader.ts:792] [E: packages/coding-agent/src/core/resource-loader.ts:793] [E: packages/coding-agent/src/core/resource-loader.ts:797] [E: packages/coding-agent/src/core/resource-loader.ts:798] [E: packages/coding-agent/src/core/resource-loader.ts:804] [E: packages/coding-agent/src/core/resource-loader.ts:805] [E: packages/coding-agent/src/core/resource-loader.ts:807] [E: packages/coding-agent/src/core/resource-loader.ts:809] [E: packages/coding-agent/src/core/resource-loader.ts:811]

## System prompt 暴露

`formatSkillsForPrompt(skills, fileReadTool)` 只把 `disableModelInvocation` 为 false 的 skills 放入 system prompt;它生成 `<available_skills>` XML-like block,每项包含 escaped `name`、`description` 和 `location`。`fileReadTool === "read"` 时文案是用 read 加载 skill 文件,否则改成用 bash 加载;相对路径仍按 skill directory 解析。[E: packages/coding-agent/src/core/skills.ts:355] [E: packages/coding-agent/src/core/skills.ts:356] [E: packages/coding-agent/src/core/skills.ts:365] [E: packages/coding-agent/src/core/skills.ts:366] [E: packages/coding-agent/src/core/skills.ts:367] [E: packages/coding-agent/src/core/skills.ts:369] [E: packages/coding-agent/src/core/skills.ts:374] [E: packages/coding-agent/src/core/skills.ts:375] [E: packages/coding-agent/src/core/skills.ts:376]

`buildSystemPromptSections()` 在 custom prompt 路径和默认 prompt 路径都会写入 skills section,前提是当前 tool 列表里能找到 `read` 或 `bash`:`skillFileReadTool = (["read","bash"] as const).find((tool) => selectedTools.includes(tool))`,并检查 `skillFileReadTool && skills.length > 0`。因此只启用 bash 时 skills 仍会进入 system prompt。[E: packages/coding-agent/src/core/system-prompt.ts:7] [E: packages/coding-agent/src/core/system-prompt.ts:165] [E: packages/coding-agent/src/core/system-prompt.ts:166] [E: packages/coding-agent/src/core/system-prompt.ts:167] [E: packages/coding-agent/src/core/system-prompt.ts:168]

`disable-model-invocation: true` 的 effect 是从 always-on skills list 中隐藏 skill,不是禁用 `/skill:name`:文档写该字段为 true 时 skill 只通过显式命令可用,代码也只在 `formatSkillsForPrompt()` 过滤它。[E: packages/coding-agent/docs/skills.md:53] [E: packages/coding-agent/src/core/skills.ts:356] [I]

## `/skill:name` 命令

产品文档把 skills 注册为 `/skill:name` commands,并说明命令后参数会追加到 loaded instructions 之后;`enableSkillCommands` 控制 interactive command discovery,手动输入的 `/skill:name` 仍然有效。[E: packages/coding-agent/docs/skills.md:47] [E: packages/coding-agent/docs/skills.md:53]

`enableSkillCommands` 是 `Settings` 字段,默认 getter 返回 `true`;旧版 `skills` object format 的 `enableSkillCommands` 会迁移到顶层字段。[E: packages/coding-agent/src/core/settings-manager.ts:164] [E: packages/coding-agent/src/core/settings-manager.ts:524] [E: packages/coding-agent/src/core/settings-manager.ts:525] [E: packages/coding-agent/src/core/settings-manager.ts:528] [E: packages/coding-agent/src/core/settings-manager.ts:529] [E: packages/coding-agent/src/core/settings-manager.ts:1264] [E: packages/coding-agent/src/core/settings-manager.ts:1265]

Interactive mode 的 autocomplete 只在 `settingsManager.getEnableSkillCommands()` 为 true 时把 loaded skills 转成 `skill:<name>` commands;设置选择器也读取同一个 getter 来显示该开关。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:794] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:796] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:797] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:798] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:801] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:802] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4850]

`AgentSession.prompt()` 在 extension input handlers 之后、prompt template 展开之前调用 `_expandSkillCommand()`;该 method 只处理以 `/skill:` 开头的 text,按 name 找到 loaded skill 后读取 `skill.filePath`、去掉 frontmatter,生成 `<skill name="..." location="...">` block,并把命令参数作为额外文本追加。[E: packages/coding-agent/src/core/agent-session.ts:1932] [E: packages/coding-agent/src/core/agent-session.ts:1961] [E: packages/coding-agent/src/core/agent-session.ts:1962] [E: packages/coding-agent/src/core/agent-session.ts:2100] [E: packages/coding-agent/src/core/agent-session.ts:2101] [E: packages/coding-agent/src/core/agent-session.ts:2104] [E: packages/coding-agent/src/core/agent-session.ts:2107] [E: packages/coding-agent/src/core/agent-session.ts:2111] [E: packages/coding-agent/src/core/agent-session.ts:2112] [E: packages/coding-agent/src/core/agent-session.ts:2113] [E: packages/coding-agent/src/core/agent-session.ts:2114]

`AgentSession` 也把 loaded skills 暴露成 command metadata:每个 skill 变成一个 `SlashCommandInfo`,其中 name 为 `skill:${skill.name}`、source 为 `"skill"`、description 来自 `skill.description`。[E: packages/coding-agent/src/core/agent-session.ts:3329] [E: packages/coding-agent/src/core/agent-session.ts:3330] [E: packages/coding-agent/src/core/agent-session.ts:3331] [E: packages/coding-agent/src/core/agent-session.ts:3332] [E: packages/coding-agent/src/core/agent-session.ts:3333] [I]

## 跨包关系

`subsys.coding-agent.system-prompt` 覆盖 `buildSystemPromptSections()` 如何把门控后的 skills section 写进 structured system prompt;`formatSkillsForPrompt()` 的 XML 装配在本节点的 `skills.ts`。[E: packages/coding-agent/src/core/system-prompt.ts:165] [E: packages/coding-agent/src/core/skills.ts:355]

`subsys.coding-agent.resource-loader` 覆盖 discovery 路径如何从 package-manager / CLI / extensions 汇入 `loadSkills({ includeDefaults: false })`。[E: packages/coding-agent/src/core/resource-loader.ts:833] [I]

`surface.slash-commands.overview` 是 slash command 总览;本节点只说明 skill commands 这一路如何由 settings、interactive autocomplete 和 `AgentSession._expandSkillCommand()` 连接到 loaded skills。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:796] [E: packages/coding-agent/src/core/agent-session.ts:2100] [I]

## Gotcha

- `enableSkillCommands=false` 只影响 interactive autocomplete 中 skill commands 的注册;`AgentSession._expandSkillCommand()` 本身不检查该 setting。文档也写手动输入的 `/skill:name` 仍然有效。[E: packages/coding-agent/docs/skills.md:53] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:796] [E: packages/coding-agent/src/core/agent-session.ts:2100] [I]
- `disable-model-invocation` 不阻止 skill command 展开;它只从 `formatSkillsForPrompt()` 的 always-on list 中过滤 skill。[E: packages/coding-agent/src/core/skills.ts:356] [E: packages/coding-agent/src/core/agent-session.ts:2107] [I]
- 产品 loader 的 name validation 不检查 parent directory equality。文档建议仍让 name 匹配父目录,以便与其它 Agent Skills 实现互操作。[E: packages/coding-agent/src/core/skills.ts:92] [E: packages/coding-agent/docs/skills.md:83] [I]
- 不存在 `packages/agent/src/harness/skills.ts`。本节点不以 agent-core harness loader 作为对照源。[I]

## Sources

- packages/coding-agent/src/core/skills.ts
- packages/coding-agent/src/core/package-manager.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/core/system-prompt.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/docs/skills.md
- .pi/skills/add-llm-provider.md

## 相关

- [subsys.coding-agent.system-prompt](../../subsystems/coding-agent/system-prompt.md): coding-agent 如何把 `formatSkillsForPrompt()` 装进 structured system prompt。
- [surface.slash-commands.overview](../commands/overview.md): slash commands 总览;skill commands 是其中的 `skill:<name>` 一类。
- [subsys.coding-agent.resource-loader](../../subsystems/coding-agent/resource-loader.md): skills 路径如何从 package-manager / CLI / extensions 汇入 loader。
