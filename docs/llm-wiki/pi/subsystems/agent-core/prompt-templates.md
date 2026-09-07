---
id: subsys.agent-core.prompt-templates
title: 提示模板加载(harness)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/prompt-templates.ts
symbols:
  - loadPromptTemplates
  - substituteArgs
  - parseCommandArgs
related:
  - surface.prompt-templates.system
evidence: explicit
status: verified
updated: 9767ba275f
---

> `subsys.agent-core.prompt-templates` 是 `pi-agent-core` 的 prompt template harness: 它从 markdown 文件或目录加载模板, 解析 frontmatter/body, 将命令行字符串拆成参数数组, 并把 `$1`、`$@`、`$ARGUMENTS`、`${@:N}` 这类占位符替换成调用参数。

## 能回答的问题

- `loadPromptTemplates()` 接受文件还是目录, 目录会不会递归加载?
- `.md` prompt template 的 `name`、`description`、`content` 分别从哪里来?
- 缺失路径、非 markdown 文件、read/list/parse 失败分别怎样处理?
- `parseCommandArgs()` 支持哪些引号和空白分隔规则?
- `substituteArgs()` 支持哪些占位符, 越界参数会变成什么?
- agent harness 与 coding-agent 的 prompt template 产品装配边界在哪里?

## 职责边界

本节点只覆盖 `packages/agent/src/harness/prompt-templates.ts` 中的 reusable harness 行为: 文件发现、frontmatter/body 解析、diagnostic 收集、参数拆分和占位符替换 [E: packages/agent/src/harness/prompt-templates.ts:31] [E: packages/agent/src/harness/prompt-templates.ts:129] [E: packages/agent/src/harness/prompt-templates.ts:209] [E: packages/agent/src/harness/prompt-templates.ts:226] [E: packages/agent/src/harness/prompt-templates.ts:252]。

`PromptTemplateDiagnostic` 只表示 warning, 由稳定 `code`、human-readable `message` 和相关 `path` 组成;当前代码的 diagnostic code 值域是 `file_info_failed`、`list_failed`、`read_failed`、`parse_failed` [E: packages/agent/src/harness/prompt-templates.ts:5] [E: packages/agent/src/harness/prompt-templates.ts:8] [E: packages/agent/src/harness/prompt-templates.ts:10] [E: packages/agent/src/harness/prompt-templates.ts:12] [E: packages/agent/src/harness/prompt-templates.ts:14] [E: packages/agent/src/harness/prompt-templates.ts:16]。

## 关键文件

- `packages/agent/src/harness/prompt-templates.ts`: `loadPromptTemplates()`、`parseCommandArgs()`、`substituteArgs()` 和 `formatPromptTemplateInvocation()` 的实现文件, 也是 `loadSourcedPromptTemplates()`、frontmatter parser、directory loader、file loader、kind resolver 的所在文件 [E: packages/agent/src/harness/prompt-templates.ts:31] [E: packages/agent/src/harness/prompt-templates.ts:72] [E: packages/agent/src/harness/prompt-templates.ts:100] [E: packages/agent/src/harness/prompt-templates.ts:129] [E: packages/agent/src/harness/prompt-templates.ts:175] [E: packages/agent/src/harness/prompt-templates.ts:209] [E: packages/agent/src/harness/prompt-templates.ts:226] [E: packages/agent/src/harness/prompt-templates.ts:252] [E: packages/agent/src/harness/prompt-templates.ts:268]。

## 数据模型

`PromptTemplateFrontmatter` 允许 `description?: string`、`"argument-hint"?: string` 和其它 unknown key, 但 file loader 只读取 `frontmatter.description` 来构造 `PromptTemplate.description` [E: packages/agent/src/harness/prompt-templates.ts:19] [E: packages/agent/src/harness/prompt-templates.ts:20] [E: packages/agent/src/harness/prompt-templates.ts:21] [E: packages/agent/src/harness/prompt-templates.ts:22] [E: packages/agent/src/harness/prompt-templates.ts:160]。

加载出的 `PromptTemplate` 使用 markdown 文件 basename 去掉 `.md` 作为 `name`, 使用解析后的 body 作为 `content`, 并优先使用 string 类型 frontmatter `description` 作为描述 [E: packages/agent/src/harness/prompt-templates.ts:158] [E: packages/agent/src/harness/prompt-templates.ts:160] [E: packages/agent/src/harness/prompt-templates.ts:166] [E: packages/agent/src/harness/prompt-templates.ts:166] [E: packages/agent/src/harness/prompt-templates.ts:168] [E: packages/agent/src/harness/prompt-templates.ts:169]。

当 frontmatter 没有 string description 时, loader 用 `body.split("\\n").find(line => line.trim())` 找第一条非空行，取其前 60 个字符作为 fallback description, 首行超过 60 个字符时追加 `...` [E: packages/agent/src/harness/prompt-templates.ts:159] [E: packages/agent/src/harness/prompt-templates.ts:160] [E: packages/agent/src/harness/prompt-templates.ts:161] [E: packages/agent/src/harness/prompt-templates.ts:162] [E: packages/agent/src/harness/prompt-templates.ts:163]。

## 控制流

1. `loadPromptTemplates@packages/agent/src/harness/prompt-templates.ts:30` 接受单个 path 或 path array;实现把非数组输入包成单元素数组, 然后逐个调用 `env.fileInfo(path)` [E: packages/agent/src/harness/prompt-templates.ts:31] [E: packages/agent/src/harness/prompt-templates.ts:33] [E: packages/agent/src/harness/prompt-templates.ts:38] [E: packages/agent/src/harness/prompt-templates.ts:39]。
2. `loadPromptTemplates()` 遇到 `fileInfo` 失败时会跳过该 path;只有错误码不是 `not_found` 时才追加 `file_info_failed` warning diagnostic [E: packages/agent/src/harness/prompt-templates.ts:40] [E: packages/agent/src/harness/prompt-templates.ts:41] [E: packages/agent/src/harness/prompt-templates.ts:42] [E: packages/agent/src/harness/prompt-templates.ts:44] [E: packages/agent/src/harness/prompt-templates.ts:49]。
3. `loadPromptTemplates()` 对 `FileInfo` 调用 `resolveKind()`: kind 为 `directory` 时走 `loadTemplatesFromDir(env, info.path)`, kind 为 `file` 且 `info.name.endsWith(".md")` 时走 `loadTemplateFromFile(env, info.path)`, 其它 kind 或非 markdown 文件不会产生模板 [E: packages/agent/src/harness/prompt-templates.ts:52] [E: packages/agent/src/harness/prompt-templates.ts:53] [E: packages/agent/src/harness/prompt-templates.ts:54] [E: packages/agent/src/harness/prompt-templates.ts:57] [E: packages/agent/src/harness/prompt-templates.ts:58]。
4. `loadTemplatesFromDir@packages/agent/src/harness/prompt-templates.ts:95` 调用 `env.listDir(dir)`;list 失败时返回空 `promptTemplates` 并追加 `list_failed` warning diagnostic [E: packages/agent/src/harness/prompt-templates.ts:100] [E: packages/agent/src/harness/prompt-templates.ts:107] [E: packages/agent/src/harness/prompt-templates.ts:108] [E: packages/agent/src/harness/prompt-templates.ts:111] [E: packages/agent/src/harness/prompt-templates.ts:115]。
5. directory loader 对 direct entries 做 `entries.sort((a, b) => a.name.localeCompare(b.name))`, 只加载 kind 为 `file` 且名称以 `.md` 结尾的 direct child;它没有递归调用嵌套目录 loader [E: packages/agent/src/harness/prompt-templates.ts:119] [E: packages/agent/src/harness/prompt-templates.ts:120] [E: packages/agent/src/harness/prompt-templates.ts:121] [E: packages/agent/src/harness/prompt-templates.ts:122]。
6. `loadTemplateFromFile@packages/agent/src/harness/prompt-templates.ts:123` 先 `env.readTextFile(filePath)`, read 失败时返回 `promptTemplate: null` 并追加 `read_failed` warning diagnostic [E: packages/agent/src/harness/prompt-templates.ts:129] [E: packages/agent/src/harness/prompt-templates.ts:136] [E: packages/agent/src/harness/prompt-templates.ts:137] [E: packages/agent/src/harness/prompt-templates.ts:140] [E: packages/agent/src/harness/prompt-templates.ts:144]。
7. file loader 调用 `parseFrontmatter()`;parse 失败时返回 `promptTemplate: null` 并追加 `parse_failed` warning diagnostic [E: packages/agent/src/harness/prompt-templates.ts:147] [E: packages/agent/src/harness/prompt-templates.ts:148] [E: packages/agent/src/harness/prompt-templates.ts:151] [E: packages/agent/src/harness/prompt-templates.ts:155]。
8. `parseFrontmatter@packages/agent/src/harness/prompt-templates.ts:200` 先把 CRLF/CR 统一成 LF;内容不以 `---` 开头或找不到结束分隔符 `\n---` 时, 它把整个 normalized content 当 body 并返回空 frontmatter [E: packages/agent/src/harness/prompt-templates.ts:209] [E: packages/agent/src/harness/prompt-templates.ts:213] [E: packages/agent/src/harness/prompt-templates.ts:214] [E: packages/agent/src/harness/prompt-templates.ts:215] [E: packages/agent/src/harness/prompt-templates.ts:216]。
9. `parseFrontmatter()` 找到 frontmatter 结束分隔符后, 用 `parse(yamlString) ?? {}` 得到 frontmatter, 并把结束分隔符之后的内容 `trim()` 成 body;YAML parse throw 时通过 `toError(error)` 返回 `ok: false` [E: packages/agent/src/harness/prompt-templates.ts:217] [E: packages/agent/src/harness/prompt-templates.ts:218] [E: packages/agent/src/harness/prompt-templates.ts:219] [E: packages/agent/src/harness/prompt-templates.ts:220] [E: packages/agent/src/harness/prompt-templates.ts:221]。
10. `resolveKind@packages/agent/src/harness/prompt-templates.ts:167` 对 `info.kind` 已经是 `file` 或 `directory` 的输入直接返回;否则通过 `env.canonicalPath(info.path)` 再 `env.fileInfo(canonicalPath.value)` 解析目标 kind [E: packages/agent/src/harness/prompt-templates.ts:175] [E: packages/agent/src/harness/prompt-templates.ts:181] [E: packages/agent/src/harness/prompt-templates.ts:182] [E: packages/agent/src/harness/prompt-templates.ts:194] [E: packages/agent/src/harness/prompt-templates.ts:206]。
11. `resolveKind()` 在 canonical path 或 target fileInfo 失败且错误码不是 `not_found` 时追加 `file_info_failed` warning;失败路径最终返回 `undefined`, 调用方因此跳过该 entry 或 input [E: packages/agent/src/harness/prompt-templates.ts:183] [E: packages/agent/src/harness/prompt-templates.ts:184] [E: packages/agent/src/harness/prompt-templates.ts:187] [E: packages/agent/src/harness/prompt-templates.ts:192] [E: packages/agent/src/harness/prompt-templates.ts:195] [E: packages/agent/src/harness/prompt-templates.ts:196] [E: packages/agent/src/harness/prompt-templates.ts:199] [E: packages/agent/src/harness/prompt-templates.ts:204]。

## 参数解析

`parseCommandArgs()` 是简单 tokenizer: 未处在 quote 中时, 空格或 tab 会结束当前非空参数;单引号和双引号都会进入 quote 状态, 结束 quote 字符不会写入参数 [E: packages/agent/src/harness/prompt-templates.ts:226] [E: packages/agent/src/harness/prompt-templates.ts:227] [E: packages/agent/src/harness/prompt-templates.ts:229] [E: packages/agent/src/harness/prompt-templates.ts:234] [E: packages/agent/src/harness/prompt-templates.ts:236] [E: packages/agent/src/harness/prompt-templates.ts:238]。

quote 内部只有匹配的 quote 字符会结束 quote, 其它字符原样追加到 current;循环结束后只有非空 `current` 会被 push, 所以空参数和未闭合 quote 里的空字符串不会成为独立参数 [E: packages/agent/src/harness/prompt-templates.ts:233] [E: packages/agent/src/harness/prompt-templates.ts:234] [E: packages/agent/src/harness/prompt-templates.ts:235] [E: packages/agent/src/harness/prompt-templates.ts:247] [E: packages/agent/src/harness/prompt-templates.ts:248]。

`parseCommandArgs()` 没有 escape 字符分支, 也没有逗号、换行或 shell expansion 处理分支;它只在循环中区分 quote 字符、空格/tab 和其它字符 [E: packages/agent/src/harness/prompt-templates.ts:231] [E: packages/agent/src/harness/prompt-templates.ts:233] [E: packages/agent/src/harness/prompt-templates.ts:236] [E: packages/agent/src/harness/prompt-templates.ts:238] [E: packages/agent/src/harness/prompt-templates.ts:243]。

## 参数替换

`substituteArgs()` 按固定顺序替换: 先处理 `$<number>` positional placeholder, 再处理 `${@:N}` / `${@:N:L}`, 最后把 `$ARGUMENTS` 和 `$@` 替换为所有参数用空格 join 的字符串 [E: packages/agent/src/harness/prompt-templates.ts:252] [E: packages/agent/src/harness/prompt-templates.ts:254] [E: packages/agent/src/harness/prompt-templates.ts:255] [E: packages/agent/src/harness/prompt-templates.ts:261] [E: packages/agent/src/harness/prompt-templates.ts:262] [E: packages/agent/src/harness/prompt-templates.ts:263]。

`$1`、`$2` 这类 positional placeholder 用 1-based index 访问 `args[parseInt(num, 10) - 1]`;目标参数不存在时替换为空字符串 [E: packages/agent/src/harness/prompt-templates.ts:254]。

`${@:N}` 使用 1-based start, 代码会把 start 转成 zero-based 且小于 0 时夹到 0;没有 length 时返回 `args.slice(start).join(" ")`, 有 `${@:N:L}` length 时返回 `args.slice(start, start + L).join(" ")` [E: packages/agent/src/harness/prompt-templates.ts:255] [E: packages/agent/src/harness/prompt-templates.ts:256] [E: packages/agent/src/harness/prompt-templates.ts:257] [E: packages/agent/src/harness/prompt-templates.ts:258] [E: packages/agent/src/harness/prompt-templates.ts:259]。

`$ARGUMENTS` 与 `$@` 都使用同一个 `allArgs = args.join(" ")`;这两个 placeholder 不保留原始 quoting 信息, 也不重新 escape 参数 [E: packages/agent/src/harness/prompt-templates.ts:261] [E: packages/agent/src/harness/prompt-templates.ts:262] [E: packages/agent/src/harness/prompt-templates.ts:263]。

`formatPromptTemplateInvocation()` 是薄包装: 它默认 `args` 为空数组, 并把 `template.content` 与 args 交给 `substituteArgs()` [E: packages/agent/src/harness/prompt-templates.ts:268] [E: packages/agent/src/harness/prompt-templates.ts:269]。

## 错误与 diagnostic

缺失 path 在 top-level `fileInfo`、canonical path 或 target fileInfo 阶段都被静默跳过, 因为这些分支只在 `error.code !== "not_found"` 时追加 warning diagnostic [E: packages/agent/src/harness/prompt-templates.ts:40] [E: packages/agent/src/harness/prompt-templates.ts:41] [E: packages/agent/src/harness/prompt-templates.ts:183] [E: packages/agent/src/harness/prompt-templates.ts:184] [E: packages/agent/src/harness/prompt-templates.ts:195] [E: packages/agent/src/harness/prompt-templates.ts:196]。

read/list/parse 失败不会 throw 给调用者;这些失败路径都通过 `{ promptTemplates: [], diagnostics }` 或 `{ promptTemplate: null, diagnostics }` 返回 warning diagnostic [E: packages/agent/src/harness/prompt-templates.ts:108] [E: packages/agent/src/harness/prompt-templates.ts:115] [E: packages/agent/src/harness/prompt-templates.ts:137] [E: packages/agent/src/harness/prompt-templates.ts:144] [E: packages/agent/src/harness/prompt-templates.ts:148] [E: packages/agent/src/harness/prompt-templates.ts:155]。

成功加载多个 paths 或目录 entries 时, loader 会把每个子结果的 `promptTemplates` 和 `diagnostics` append 到同一个返回对象;单个失败不会清空此前成功加载的模板 [E: packages/agent/src/harness/prompt-templates.ts:36] [E: packages/agent/src/harness/prompt-templates.ts:37] [E: packages/agent/src/harness/prompt-templates.ts:55] [E: packages/agent/src/harness/prompt-templates.ts:56] [E: packages/agent/src/harness/prompt-templates.ts:59] [E: packages/agent/src/harness/prompt-templates.ts:60] [E: packages/agent/src/harness/prompt-templates.ts:123] [E: packages/agent/src/harness/prompt-templates.ts:124]。

## 来源标记与边界

`loadSourcedPromptTemplates()` 是 source-tagged wrapper: 它对每个 `{ path, source }` 调用 `loadPromptTemplates()`, 对成功模板附加同一个 `source`, 对 diagnostic 也附加同一个 `source` [E: packages/agent/src/harness/prompt-templates.ts:72] [E: packages/agent/src/harness/prompt-templates.ts:74] [E: packages/agent/src/harness/prompt-templates.ts:85] [E: packages/agent/src/harness/prompt-templates.ts:86] [E: packages/agent/src/harness/prompt-templates.ts:92] [E: packages/agent/src/harness/prompt-templates.ts:95]。

`loadSourcedPromptTemplates()` 可以接收 `mapPromptTemplate(promptTemplate, source)` 改写模板类型;没有 mapper 时, 代码把原始 `PromptTemplate` cast 成 `TPromptTemplate` 并保留 source, 因此在本文件中 source 保留和可选模板转换都发生在 wrapper 这层 [E: packages/agent/src/harness/prompt-templates.ts:76] [E: packages/agent/src/harness/prompt-templates.ts:89] [E: packages/agent/src/harness/prompt-templates.ts:90] [E: packages/agent/src/harness/prompt-templates.ts:91] [E: packages/agent/src/harness/prompt-templates.ts:92]。

`loadSourcedPromptTemplates()` 的实现只把 `input.source` 复制进每个成功模板 wrapper 和 diagnostic wrapper;本文件没有对 `source` 的字段做分支判断 [E: packages/agent/src/harness/prompt-templates.ts:74] [E: packages/agent/src/harness/prompt-templates.ts:85] [E: packages/agent/src/harness/prompt-templates.ts:92] [E: packages/agent/src/harness/prompt-templates.ts:95]。

`surface.prompt-templates.system` 是 coding-agent 产品层发现 project/user prompt templates、暴露用户可调用命令、以及组合 slash commands 的边界节点;本节点只证明 agent harness 的 loading/parsing/substitution primitive [E: packages/agent/src/harness/prompt-templates.ts:31] [E: packages/agent/src/harness/prompt-templates.ts:72] [E: packages/agent/src/harness/prompt-templates.ts:226] [E: packages/agent/src/harness/prompt-templates.ts:252] [I]。

## Gotcha

- Directory input 只加载 direct `.md` child, 因为 directory loader 只遍历 `listDir(dir)` 返回的 direct entries 并在 entry kind 不是 `file` 时 continue [E: packages/agent/src/harness/prompt-templates.ts:107] [E: packages/agent/src/harness/prompt-templates.ts:119] [E: packages/agent/src/harness/prompt-templates.ts:121]。
- explicit file input 必须满足 `info.name.endsWith(".md")`;这个判断是大小写敏感的, 而 basename 去除扩展名使用 `/\.md$/i` 是大小写不敏感的 [E: packages/agent/src/harness/prompt-templates.ts:57] [E: packages/agent/src/harness/prompt-templates.ts:166]。
- `parseFrontmatter()` 只在 content 以 `---` 开头且找到结束 `\n---` 时，才把分隔符之后的 body `trim()`。不以 `---` 开头或没有结束分隔符时，body 是完整 normalized 字符串，前后空白会保留。[E: packages/agent/src/harness/prompt-templates.ts:214] [E: packages/agent/src/harness/prompt-templates.ts:215] [E: packages/agent/src/harness/prompt-templates.ts:216] [E: packages/agent/src/harness/prompt-templates.ts:218]。
- `parseCommandArgs()` 不会把两个连续空白之间的空字段变成参数, 因为空白分支只在 `current` 非空时 push [E: packages/agent/src/harness/prompt-templates.ts:238] [E: packages/agent/src/harness/prompt-templates.ts:239] [E: packages/agent/src/harness/prompt-templates.ts:240]。
- `substituteArgs()` 的 replacement 是串行作用在同一个 result 上;如果前一个 replacement 产生了后续正则能匹配的文本, 后续 replacement pass 会继续处理该文本 [E: packages/agent/src/harness/prompt-templates.ts:253] [E: packages/agent/src/harness/prompt-templates.ts:254] [E: packages/agent/src/harness/prompt-templates.ts:255] [E: packages/agent/src/harness/prompt-templates.ts:262] [E: packages/agent/src/harness/prompt-templates.ts:263]。

## Sources

- packages/agent/src/harness/prompt-templates.ts

## 相关

- [surface.prompt-templates.system](../../surface/prompts/system.md): coding-agent 产品层 prompt template 发现、命令暴露和用户可见系统行为。
