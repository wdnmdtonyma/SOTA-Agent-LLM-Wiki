---
id: surface.prompt-templates.system
title: prompt 模板系统
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/prompt-templates.ts
  - packages/agent/src/harness/prompt-templates.ts
  - packages/coding-agent/docs/prompt-templates.md
  - .pi/prompts/wr.md
symbols:
  - loadPromptTemplates
  - formatPromptTemplateInvocation
  - substituteArgs
related:
  - subsys.agent-core.prompt-templates
  - surface.slash-commands.overview
evidence: explicit
status: verified
updated: 5a073885
---

> `surface.prompt-templates.system` 是 pi-coding-agent 的 prompt template 用户入口:用户把 Markdown snippet 放进 prompt template 位置,文件名去掉 `.md` 后成为 `/name`,发送 `/name args` 时模板正文会按参数替换规则展开成完整用户 prompt。

## 能回答的问题

- prompt template 文档承诺哪些位置和 CLI 入口?
- `.md` 模板的 command name、description、argument hint 和 content 从哪里来?
- `/review foo "bar baz"` 这类调用怎样拆参数、替换 `$1`、`$@`、`$ARGUMENTS`、`${1:-default}` 和 `${@:N:L}`?
- coding-agent product 实现和 agent harness primitive 在模板加载、参数解析、替换能力上有哪些可见差异?
- repo 自带 `.pi/prompts/wr.md` 示例实际展示了什么模板形态?

## 用户入口

用户文档把 prompt template 定义为会扩展成完整 prompt 的 Markdown snippet;调用方式是在 editor 输入 `/name`,其中 `name` 是文件名去掉 `.md` [E: packages/coding-agent/docs/prompt-templates.md:5]。文档列出的加载入口包括全局 `~/.pi/agent/prompts/*.md`、项目 `.pi/prompts/*.md`、package 的 `prompts/` 或 `package.json` 里的 `pi.prompts`、settings 的 `prompts` array,以及可重复的 CLI `--prompt-template <path>` [E: packages/coding-agent/docs/prompt-templates.md:9] [E: packages/coding-agent/docs/prompt-templates.md:11] [E: packages/coding-agent/docs/prompt-templates.md:12] [E: packages/coding-agent/docs/prompt-templates.md:13] [E: packages/coding-agent/docs/prompt-templates.md:14] [E: packages/coding-agent/docs/prompt-templates.md:15]。

文档说 `--no-prompt-templates` 用于 disable discovery [E: packages/coding-agent/docs/prompt-templates.md:17]。本节点的 index source 不包含 CLI parser、resource loader 或 package manager,所以这里不展开该 flag 的 runtime 精确边界;当前 staging 保留一条 `[U]` 记录,等待用更宽 source 验证 CLI 显式路径是否仍可加载。

## 模板文件格式

coding-agent product 层的 `PromptTemplate` 包含 `name`、`description`、可选 `argumentHint`、`content`、`sourceInfo` 和绝对 `filePath` [E: packages/coding-agent/src/core/prompt-templates.ts:11] [E: packages/coding-agent/src/core/prompt-templates.ts:12] [E: packages/coding-agent/src/core/prompt-templates.ts:13] [E: packages/coding-agent/src/core/prompt-templates.ts:14] [E: packages/coding-agent/src/core/prompt-templates.ts:15] [E: packages/coding-agent/src/core/prompt-templates.ts:16] [E: packages/coding-agent/src/core/prompt-templates.ts:17]。

`loadTemplateFromFile()` 读取 Markdown 文件,调用 shared frontmatter parser 得到 `frontmatter` 和 `body`,用 basename 去掉 `.md` 得到 template `name`,并把 `body` 写入 `content` [E: packages/coding-agent/src/core/prompt-templates.ts:103] [E: packages/coding-agent/src/core/prompt-templates.ts:105] [E: packages/coding-agent/src/core/prompt-templates.ts:106] [E: packages/coding-agent/src/core/prompt-templates.ts:108] [E: packages/coding-agent/src/core/prompt-templates.ts:121] [E: packages/coding-agent/src/core/prompt-templates.ts:125]。`description` 优先来自 frontmatter `description`;缺失时使用 body 第一条非空行的前 60 个字符,若原首行超过 60 字符则追加 `...` [E: packages/coding-agent/src/core/prompt-templates.ts:111] [E: packages/coding-agent/src/core/prompt-templates.ts:113] [E: packages/coding-agent/src/core/prompt-templates.ts:116] [E: packages/coding-agent/src/core/prompt-templates.ts:117]。`argument-hint` 只在 frontmatter 中存在时写入 `argumentHint` [E: packages/coding-agent/src/core/prompt-templates.ts:124]。

`.pi/prompts/wr.md` 是 repo dogfood 示例:frontmatter 声明 `description` 和 `argument-hint`,body 用 `$ARGUMENTS` 注入调用参数 [E: .pi/prompts/wr.md:1] [E: .pi/prompts/wr.md:2] [E: .pi/prompts/wr.md:3] [E: .pi/prompts/wr.md:7]。它的正文还包含多步操作约束,例如 changelog、GitHub comment、commit、push 和 issue close 规则;这说明模板可以是较长 workflow prompt,不只是短文本片段 [E: .pi/prompts/wr.md:16] [E: .pi/prompts/wr.md:18] [E: .pi/prompts/wr.md:24] [E: .pi/prompts/wr.md:26] [E: .pi/prompts/wr.md:27] [I]。

## 加载范围

product 层 `loadPromptTemplates()` 接受 `cwd`、`agentDir`、显式 `promptPaths` 和 `includeDefaults` option [E: packages/coding-agent/src/core/prompt-templates.ts:176] [E: packages/coding-agent/src/core/prompt-templates.ts:178] [E: packages/coding-agent/src/core/prompt-templates.ts:180] [E: packages/coding-agent/src/core/prompt-templates.ts:182] [E: packages/coding-agent/src/core/prompt-templates.ts:184]。实现会解析 cwd/agentDir,构造 global `agentDir/prompts` 和 project `cwd/.pi/prompts`;当 `includeDefaults` 为 true 时加载这两个默认目录,随后再遍历显式 `promptPaths` [E: packages/coding-agent/src/core/prompt-templates.ts:193] [E: packages/coding-agent/src/core/prompt-templates.ts:194] [E: packages/coding-agent/src/core/prompt-templates.ts:195] [E: packages/coding-agent/src/core/prompt-templates.ts:201] [E: packages/coding-agent/src/core/prompt-templates.ts:202] [E: packages/coding-agent/src/core/prompt-templates.ts:234] [E: packages/coding-agent/src/core/prompt-templates.ts:235] [E: packages/coding-agent/src/core/prompt-templates.ts:236] [E: packages/coding-agent/src/core/prompt-templates.ts:240]。

目录加载是非递归的:`loadTemplatesFromDir()` 读取 direct entries,只加载 file 或 symlink-to-file 且名称以 `.md` 结尾的条目 [E: packages/coding-agent/src/core/prompt-templates.ts:137] [E: packages/coding-agent/src/core/prompt-templates.ts:145] [E: packages/coding-agent/src/core/prompt-templates.ts:151] [E: packages/coding-agent/src/core/prompt-templates.ts:152] [E: packages/coding-agent/src/core/prompt-templates.ts:154] [E: packages/coding-agent/src/core/prompt-templates.ts:162]。显式路径不存在时跳过;存在的目录走 directory loader,存在的 `.md` file 走 file loader,读取或 stat 异常被忽略 [E: packages/coding-agent/src/core/prompt-templates.ts:240] [E: packages/coding-agent/src/core/prompt-templates.ts:241] [E: packages/coding-agent/src/core/prompt-templates.ts:242] [E: packages/coding-agent/src/core/prompt-templates.ts:247] [E: packages/coding-agent/src/core/prompt-templates.ts:248] [E: packages/coding-agent/src/core/prompt-templates.ts:250] [E: packages/coding-agent/src/core/prompt-templates.ts:256]。

文档同样说明 `prompts/` discovery 是 non-recursive,如果要放在 subdirectories,需要通过 `prompts` settings 或 package manifest 显式加入 [E: packages/coding-agent/docs/prompt-templates.md:92] [E: packages/coding-agent/docs/prompt-templates.md:94] [E: packages/coding-agent/docs/prompt-templates.md:95]。具体 package/settings resolution、project trust gate、source precedence 和 collision diagnostics 不在本节点 index source 内,本轮不作为 `[E]` 展开 [I]。

## 调用与参数替换

`expandPromptTemplate()` 只处理以 `/` 开头的文本,用正则拆出 template name 和余下 args string;文本不匹配或找不到同名 template 时返回原文本 [E: packages/coding-agent/src/core/prompt-templates.ts:268] [E: packages/coding-agent/src/core/prompt-templates.ts:269] [E: packages/coding-agent/src/core/prompt-templates.ts:271] [E: packages/coding-agent/src/core/prompt-templates.ts:272] [E: packages/coding-agent/src/core/prompt-templates.ts:277] [E: packages/coding-agent/src/core/prompt-templates.ts:283]。找到 template 后,它调用 `parseCommandArgs(argsString)` 再把结果交给 `substituteArgs(template.content, args)` [E: packages/coding-agent/src/core/prompt-templates.ts:278] [E: packages/coding-agent/src/core/prompt-templates.ts:279] [E: packages/coding-agent/src/core/prompt-templates.ts:280]。

product 层 `parseCommandArgs()` 支持单引号和双引号包裹参数;quote 内部只有匹配 quote 字符结束 quote,其它字符原样加入 current。空白由 `/\s/` 判断,且空白分支只会 push 非空 current [E: packages/coding-agent/src/core/prompt-templates.ts:24] [E: packages/coding-agent/src/core/prompt-templates.ts:32] [E: packages/coding-agent/src/core/prompt-templates.ts:33] [E: packages/coding-agent/src/core/prompt-templates.ts:38] [E: packages/coding-agent/src/core/prompt-templates.ts:40] [E: packages/coding-agent/src/core/prompt-templates.ts:41] [E: packages/coding-agent/src/core/prompt-templates.ts:50]。这不是完整 shell parser:本文件没有 escape、变量展开或空字符串参数保留分支 [E: packages/coding-agent/src/core/prompt-templates.ts:32] [E: packages/coding-agent/src/core/prompt-templates.ts:38] [E: packages/coding-agent/src/core/prompt-templates.ts:40] [E: packages/coding-agent/src/core/prompt-templates.ts:45] [I]。

product 层 `substituteArgs()` 用单个 regex pass 替换 `${N:-default}`、`${@:N}`、`${@:N:L}`、`$ARGUMENTS`、`$@` 和 `$1` 这类 positional placeholder [E: packages/coding-agent/src/core/prompt-templates.ts:69] [E: packages/coding-agent/src/core/prompt-templates.ts:72] [E: packages/coding-agent/src/core/prompt-templates.ts:73]。`${N:-default}` 在目标 arg 缺失或为空字符串时返回 default;`${@:N}` 使用 1-based start 且 start 小于 1 时夹到第一个参数;`${@:N:L}` 返回从 start 开始的 L 个参数;`$ARGUMENTS` 与 `$@` 都是 `args.join(" ")` [E: packages/coding-agent/src/core/prompt-templates.ts:75] [E: packages/coding-agent/src/core/prompt-templates.ts:78] [E: packages/coding-agent/src/core/prompt-templates.ts:81] [E: packages/coding-agent/src/core/prompt-templates.ts:84] [E: packages/coding-agent/src/core/prompt-templates.ts:86] [E: packages/coding-agent/src/core/prompt-templates.ts:88] [E: packages/coding-agent/src/core/prompt-templates.ts:93] [E: packages/coding-agent/src/core/prompt-templates.ts:94]。由于代码对 `content` 调用一次 `replace(...)` 并在 callback 中返回替换文本,参数值和 default 值中形如 `$1`、`$@` 或 `$ARGUMENTS` 的文本不会作为模板内容再次递归替换 [E: packages/coding-agent/src/core/prompt-templates.ts:72] [E: packages/coding-agent/src/core/prompt-templates.ts:74] [E: packages/coding-agent/src/core/prompt-templates.ts:78] [I]。

## Harness 对照

`packages/agent/src/harness/prompt-templates.ts` 也导出 `loadPromptTemplates()`、`parseCommandArgs()`、`substituteArgs()` 和 `formatPromptTemplateInvocation()` primitive [E: packages/agent/src/harness/prompt-templates.ts:30] [E: packages/agent/src/harness/prompt-templates.ts:223] [E: packages/agent/src/harness/prompt-templates.ts:249] [E: packages/agent/src/harness/prompt-templates.ts:265]。harness loader 使用 async `ExecutionEnv`,对缺失 path 静默跳过,对 file info/list/read/parse 失败收集 warning diagnostic [E: packages/agent/src/harness/prompt-templates.ts:30] [E: packages/agent/src/harness/prompt-templates.ts:37] [E: packages/agent/src/harness/prompt-templates.ts:39] [E: packages/agent/src/harness/prompt-templates.ts:40] [E: packages/agent/src/harness/prompt-templates.ts:101] [E: packages/agent/src/harness/prompt-templates.ts:105] [E: packages/agent/src/harness/prompt-templates.ts:128] [E: packages/agent/src/harness/prompt-templates.ts:132] [E: packages/agent/src/harness/prompt-templates.ts:139] [E: packages/agent/src/harness/prompt-templates.ts:143]。

harness 的 `PromptTemplateFrontmatter` 声明了可选 `"argument-hint"`,但当前 harness file loader 返回的 `PromptTemplate` 只写入 `name`、`description` 和 `content` [E: packages/agent/src/harness/prompt-templates.ts:18] [E: packages/agent/src/harness/prompt-templates.ts:20] [E: packages/agent/src/harness/prompt-templates.ts:157] [E: packages/agent/src/harness/prompt-templates.ts:158] [E: packages/agent/src/harness/prompt-templates.ts:159] [E: packages/agent/src/harness/prompt-templates.ts:160] [E: packages/agent/src/harness/prompt-templates.ts:161]。harness `substituteArgs()` 支持 `$1`、`${@:N}` / `${@:N:L}`、`$ARGUMENTS` 和 `$@`,但没有 product 层 `${N:-default}` 的分支 [E: packages/agent/src/harness/prompt-templates.ts:251] [E: packages/agent/src/harness/prompt-templates.ts:252] [E: packages/agent/src/harness/prompt-templates.ts:259] [E: packages/agent/src/harness/prompt-templates.ts:260] [I]。

两套文件的长期边界仍需要维护者确认:本 index source 能证明二者存在同名 primitive 和能力差异,但不能单独证明 product runtime 装配路径是否只使用 coding-agent 版本;该点保留在 staging `[U]`。

## Sources

- packages/coding-agent/src/core/prompt-templates.ts
- packages/agent/src/harness/prompt-templates.ts
- packages/coding-agent/docs/prompt-templates.md
- .pi/prompts/wr.md

## 相关

- [subsys.agent-core.prompt-templates](../../subsystems/agent-core/prompt-templates.md): agent harness 层的 prompt template loading、diagnostic、参数解析和替换 primitive。
- [surface.slash-commands.overview](../commands/overview.md): built-in slash commands、extension commands、prompt templates 和 skill commands 共享的用户可见 slash surface;本节点不在 index source 内展开 UI/autocomplete/RPC 的注册细节 [I]。
