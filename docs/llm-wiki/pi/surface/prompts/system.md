---
id: surface.prompt-templates.system
title: prompt 模板系统
kind: surface
tier: T1
pkg: coding-agent
source:
 - packages/coding-agent/src/core/prompt-templates.ts
 - packages/coding-agent/docs/prompt-templates.md
 - .pi/prompts/wr.md
symbols:
 - loadPromptTemplates
 - expandPromptTemplate
 - substituteArgs
related:
 - surface.slash-commands.overview
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `surface.prompt-templates.system` 是 pi-coding-agent 的 prompt template 用户入口:用户把 Markdown snippet 放进 prompt template 位置,文件名去掉 `.md` 后成为 `/name`,发送 `/name args` 时模板正文会按参数替换规则展开成完整用户 prompt。实现只在 `packages/coding-agent/src/core/prompt-templates.ts`;agent-core 已无 harness prompt-template loader。

## 能回答的问题

- prompt template 文档承诺哪些位置和调用方式?
- `.md` 模板的 command name、description、argument hint 和 content 从哪里来?
- `/review foo "bar baz"` 这类调用怎样拆参数、替换 `$1`、`$@`、`$ARGUMENTS`、`${1:-default}` 和 `${@:N:L}`?
- 默认目录扫描是不是递归的,显式路径失败时会怎样?
- repo 自带 `.pi/prompts/wr.md` 示例实际展示了什么模板形态?

## 用户入口

用户文档把 prompt template 定义为会扩展成完整 prompt 的 Markdown snippet;调用方式是在 editor 输入 `/name`,其中 `name` 是文件名去掉 `.md`。[E: packages/coding-agent/docs/prompt-templates.md:3] [E: packages/coding-agent/docs/prompt-templates.md:19] 文档列出的加载入口包括个人配置、项目配置、显式 path 和 Pi package;项目配置只在项目被信任后加载。[E: packages/coding-agent/docs/prompt-templates.md:5] 常规 prompt 目录只加载 direct `.md` children;settings 和 packages 可以选择 nested Markdown。[E: packages/coding-agent/docs/prompt-templates.md:55] [E: packages/coding-agent/docs/prompt-templates.md:57]

本节点的 source 不包含 CLI parser、resource loader 或 package manager,所以不把 `--prompt-template` / `--no-prompt-templates` 或 trust gate 写成由本文件直接证明的 runtime 边界。[I]

## 模板文件格式

coding-agent 的 `PromptTemplate` 包含 `name`、`description`、可选 `argumentHint`、`content`、`sourceInfo` 和绝对 `filePath`。[E: packages/coding-agent/src/core/prompt-templates.ts:12] [E: packages/coding-agent/src/core/prompt-templates.ts:13] [E: packages/coding-agent/src/core/prompt-templates.ts:14] [E: packages/coding-agent/src/core/prompt-templates.ts:15] [E: packages/coding-agent/src/core/prompt-templates.ts:16] [E: packages/coding-agent/src/core/prompt-templates.ts:17] [E: packages/coding-agent/src/core/prompt-templates.ts:18]

`loadTemplateFromFile()` 读取 Markdown 文件,调用 shared frontmatter parser 得到 `frontmatter` 和 `body`,用 basename 去掉 `.md` 得到 template `name`,并把 `body` 写入 `content`。[E: packages/coding-agent/src/core/prompt-templates.ts:105] [E: packages/coding-agent/src/core/prompt-templates.ts:112] [E: packages/coding-agent/src/core/prompt-templates.ts:122] [E: packages/coding-agent/src/core/prompt-templates.ts:129] [E: packages/coding-agent/src/core/prompt-templates.ts:148] `description` 优先来自 frontmatter `description`;缺失时使用 body 第一条非空行的前 60 个字符,若原首行超过 60 字符则追加 `...`。[E: packages/coding-agent/src/core/prompt-templates.ts:132] [E: packages/coding-agent/src/core/prompt-templates.ts:133] [E: packages/coding-agent/src/core/prompt-templates.ts:134] [E: packages/coding-agent/src/core/prompt-templates.ts:137] [E: packages/coding-agent/src/core/prompt-templates.ts:138] `argument-hint` 只在 frontmatter 中存在时写入 `argumentHint`。[E: packages/coding-agent/src/core/prompt-templates.ts:142]

`.pi/prompts/wr.md` 是 repo dogfood 示例:frontmatter 声明 `description` 和 `argument-hint`,body 用 `$ARGUMENTS` 注入调用参数。[E: .pi/prompts/wr.md:1] [E: .pi/prompts/wr.md:2] [E: .pi/prompts/wr.md:3] [E: .pi/prompts/wr.md:7] 它的正文还包含多步操作约束,例如 changelog、GitHub comment、commit、push 和 issue close 规则;这说明模板可以是较长 workflow prompt,不只是短文本片段。[E: .pi/prompts/wr.md:16] [E: .pi/prompts/wr.md:18] [E: .pi/prompts/wr.md:24] [E: .pi/prompts/wr.md:26] [E: .pi/prompts/wr.md:27] [I]

## 加载范围

`loadPromptTemplates()` 接受 `cwd`、`agentDir`、显式 `promptPaths` 和 `includeDefaults` option。[E: packages/coding-agent/src/core/prompt-templates.ts:200] [E: packages/coding-agent/src/core/prompt-templates.ts:202] [E: packages/coding-agent/src/core/prompt-templates.ts:204] [E: packages/coding-agent/src/core/prompt-templates.ts:206] [E: packages/coding-agent/src/core/prompt-templates.ts:208] 实现会解析 cwd/agentDir,构造 global `agentDir/prompts` 和 project `cwd/.pi/prompts`;当 `includeDefaults` 为 true 时加载这两个默认目录,随后再遍历显式 `promptPaths`。[E: packages/coding-agent/src/core/prompt-templates.ts:222] [E: packages/coding-agent/src/core/prompt-templates.ts:223] [E: packages/coding-agent/src/core/prompt-templates.ts:235] [E: packages/coding-agent/src/core/prompt-templates.ts:236] [E: packages/coding-agent/src/core/prompt-templates.ts:268] [E: packages/coding-agent/src/core/prompt-templates.ts:270] [E: packages/coding-agent/src/core/prompt-templates.ts:274]

目录加载是非递归的:`loadTemplatesFromDir()` 读取 direct entries,只加载 file 或 symlink-to-file 且名称以 `.md` 结尾的条目。[E: packages/coding-agent/src/core/prompt-templates.ts:159] [E: packages/coding-agent/src/core/prompt-templates.ts:168] [E: packages/coding-agent/src/core/prompt-templates.ts:174] [E: packages/coding-agent/src/core/prompt-templates.ts:175] [E: packages/coding-agent/src/core/prompt-templates.ts:185] 显式路径不存在时跳过;存在的目录走 directory loader,存在的 `.md` file 走 file loader,读取或 stat 异常被收集为 diagnostic。[E: packages/coding-agent/src/core/prompt-templates.ts:274] [E: packages/coding-agent/src/core/prompt-templates.ts:276] [E: packages/coding-agent/src/core/prompt-templates.ts:281] [E: packages/coding-agent/src/core/prompt-templates.ts:282] [E: packages/coding-agent/src/core/prompt-templates.ts:284] [E: packages/coding-agent/src/core/prompt-templates.ts:291]

具体 package/settings resolution、project trust gate、source precedence 和 collision diagnostics 不在本节点 source 内,不作为 `[E]` 展开。[I]

## 调用与参数替换

`expandPromptTemplate()` 只处理以 `/` 开头的文本,用正则拆出 template name 和余下 args string;文本不匹配或找不到同名 template 时返回原文本。[E: packages/coding-agent/src/core/prompt-templates.ts:304] [E: packages/coding-agent/src/core/prompt-templates.ts:305] [E: packages/coding-agent/src/core/prompt-templates.ts:307] [E: packages/coding-agent/src/core/prompt-templates.ts:308] [E: packages/coding-agent/src/core/prompt-templates.ts:313] [E: packages/coding-agent/src/core/prompt-templates.ts:319] 找到 template 后,它调用 `parseCommandArgs(argsString)` 再把结果交给 `substituteArgs(template.content, args)`。[E: packages/coding-agent/src/core/prompt-templates.ts:314] [E: packages/coding-agent/src/core/prompt-templates.ts:315] [E: packages/coding-agent/src/core/prompt-templates.ts:316]

`parseCommandArgs()` 支持单引号和双引号包裹参数;quote 内部只有匹配 quote 字符结束 quote,其它字符原样加入 current。空白由 `/\s/` 判断,且空白分支只会 push 非空 current。[E: packages/coding-agent/src/core/prompt-templates.ts:25] [E: packages/coding-agent/src/core/prompt-templates.ts:33] [E: packages/coding-agent/src/core/prompt-templates.ts:34] [E: packages/coding-agent/src/core/prompt-templates.ts:39] [E: packages/coding-agent/src/core/prompt-templates.ts:41] [E: packages/coding-agent/src/core/prompt-templates.ts:42] [E: packages/coding-agent/src/core/prompt-templates.ts:51] 这不是完整 shell parser:本文件没有 escape、变量展开或空字符串参数保留分支。[E: packages/coding-agent/src/core/prompt-templates.ts:33] [E: packages/coding-agent/src/core/prompt-templates.ts:39] [E: packages/coding-agent/src/core/prompt-templates.ts:41] [E: packages/coding-agent/src/core/prompt-templates.ts:46] [I]

`substituteArgs()` 用单个 regex pass 替换 `${N:-default}`、`${@:-default}`、`${ARGUMENTS:-default}`、`${@:N}`、`${@:N:L}`、`$ARGUMENTS`、`$@` 和 `$1`。[E: packages/coding-agent/src/core/prompt-templates.ts:71] [E: packages/coding-agent/src/core/prompt-templates.ts:74] [E: packages/coding-agent/src/core/prompt-templates.ts:75] `${N:-default}` 在目标 arg 缺失或为空字符串时返回 default;`${@:-default}` 与 `${ARGUMENTS:-default}` 在全部参数 join 后为空时返回 default;`${@:N}` 使用 1-based start 且 start 小于 1 时夹到第一个参数;`${@:N:L}` 返回从 start 开始的 L 个参数;`$ARGUMENTS` 与 `$@` 都是 `args.join(" ")`。[E: packages/coding-agent/src/core/prompt-templates.ts:76] [E: packages/coding-agent/src/core/prompt-templates.ts:78] [E: packages/coding-agent/src/core/prompt-templates.ts:80] [E: packages/coding-agent/src/core/prompt-templates.ts:83] [E: packages/coding-agent/src/core/prompt-templates.ts:86] [E: packages/coding-agent/src/core/prompt-templates.ts:88] [E: packages/coding-agent/src/core/prompt-templates.ts:90] [E: packages/coding-agent/src/core/prompt-templates.ts:95] [E: packages/coding-agent/src/core/prompt-templates.ts:96] 由于代码对 `content` 调用一次 `replace(...)` 并在 callback 中返回替换文本,参数值和 default 值中形如 `$1`、`$@` 或 `$ARGUMENTS` 的文本不会作为模板内容再次递归替换。[E: packages/coding-agent/src/core/prompt-templates.ts:74] [E: packages/coding-agent/src/core/prompt-templates.ts:76] [E: packages/coding-agent/src/core/prompt-templates.ts:80] [I]

用户文档列出的 substitution 表与上述实现一致:`$1` / `$@` / `$ARGUMENTS` / `${1:-default}` / `${@:-default}` / `${@:N}` / `${@:N:L}`。[E: packages/coding-agent/docs/prompt-templates.md:42] [E: packages/coding-agent/docs/prompt-templates.md:43] [E: packages/coding-agent/docs/prompt-templates.md:44] [E: packages/coding-agent/docs/prompt-templates.md:45] [E: packages/coding-agent/docs/prompt-templates.md:46] [E: packages/coding-agent/docs/prompt-templates.md:47]

## Gotcha

- 不存在 `packages/agent/src/harness/prompt-templates.ts`,也没有 `formatPromptTemplateInvocation` 这个 coding-agent 导出。本节点只覆盖 product `loadPromptTemplates` / `expandPromptTemplate` / `substituteArgs`。[I]
- `expandPromptTemplate()` 只看以 `/` 开头的整段 text;它不是 slash-command registry,找不到同名 template 时原样返回,让后续 skill/extension command 处理。[E: packages/coding-agent/src/core/prompt-templates.ts:305] [E: packages/coding-agent/src/core/prompt-templates.ts:319] [I]
- 默认目录扫描非递归。要把 nested `.md` 变成 template,需要 settings 或 package 显式加入路径。[E: packages/coding-agent/src/core/prompt-templates.ts:159] [E: packages/coding-agent/docs/prompt-templates.md:55] [I]

## Sources

- packages/coding-agent/src/core/prompt-templates.ts
- packages/coding-agent/docs/prompt-templates.md
- .pi/prompts/wr.md

## 相关

- [surface.slash-commands.overview](../commands/overview.md): built-in slash commands、extension commands、prompt templates 和 skill commands 共享的用户可见 slash surface;本节点不展开 UI/autocomplete/RPC 的注册细节 [I]。
