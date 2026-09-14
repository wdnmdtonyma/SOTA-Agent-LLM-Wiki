---
id: subsys.agent-core.skills-loading
title: 技能加载(harness)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/skills.ts
symbols:
  - loadSkills
  - loadSourcedSkills
  - Skill
related:
  - surface.skills.system
  - subsys.agent-core.system-prompt
evidence: explicit
status: verified
updated: 71dca871bc
---

> `subsys.agent-core.skills-loading` 描述 `pi-agent-core` harness 如何从目录发现 skill 文件、解析 frontmatter/body、生成 `Skill` 对象、保留 source provenance,以及它与系统提示组装的边界。

## 能回答的问题

- `loadSkills(env, dirs)` 如何处理单目录、多目录、缺失目录和非目录输入?
- 哪些文件会被当作 skill: `SKILL.md`、根目录 `.md`、子目录里的 markdown 文件分别有什么规则?
- 根目录 `README.md` 没有 skill frontmatter 时会不会变成 broken-skill warning?
- `.gitignore`、`.ignore`、`.fdignore` 如何影响 skill discovery?
- `Skill` 对象的 `name`、`description`、`content`、`filePath`、`disableModelInvocation` 从哪里来?
- `loadSourcedSkills` 怎样把调用方定义的 source 附到 skill 和 diagnostic 上?
- skills loading 与 system prompt / skill invocation prompt 的职责边界在哪里?

## 职责边界

`loadSkills(env, dirs)` 是 agent harness 的 skill discovery 入口:它接收 `ExecutionEnv` 和一个或多个目录,返回 `Skill[]` 与 `SkillDiagnostic[]`。[E: packages/agent/src/harness/skills.ts:51] [E: packages/agent/src/harness/skills.ts:52] [E: packages/agent/src/harness/skills.ts:53] [E: packages/agent/src/harness/skills.ts:55] 它只在输入路径可解析为 directory 时递归加载;`not_found` 输入被静默跳过,其它 `fileInfo` 错误变成 warning diagnostic。[E: packages/agent/src/harness/skills.ts:59] [E: packages/agent/src/harness/skills.ts:61] [E: packages/agent/src/harness/skills.ts:62] [E: packages/agent/src/harness/skills.ts:69] [E: packages/agent/src/harness/skills.ts:72]

本节点只覆盖 `packages/agent/src/harness/skills.ts` 内的加载、解析、diagnostic 和 source tagging 行为。`Skill` 的完整接口定义来自 `./types.ts` 的 type import,但本节点的 source 只证明本文件如何使用和构造 `Skill` 字段。[E: packages/agent/src/harness/skills.ts:4] [E: packages/agent/src/harness/skills.ts:56] [E: packages/agent/src/harness/skills.ts:299] [I]

## 关键文件

- `packages/agent/src/harness/skills.ts`:定义 skill metadata 限制、diagnostic code、frontmatter shape、`formatSkillInvocation()`、`loadSkills()`、`loadSourcedSkills()`、recursive directory walk、ignore-file handling、frontmatter parser 和 name/description validation。[E: packages/agent/src/harness/skills.ts:6] [E: packages/agent/src/harness/skills.ts:8] [E: packages/agent/src/harness/skills.ts:12] [E: packages/agent/src/harness/skills.ts:31] [E: packages/agent/src/harness/skills.ts:39] [E: packages/agent/src/harness/skills.ts:51] [E: packages/agent/src/harness/skills.ts:86] [E: packages/agent/src/harness/skills.ts:110] [E: packages/agent/src/harness/skills.ts:185] [E: packages/agent/src/harness/skills.ts:332]

## 数据模型

`SkillDiagnosticCode` 覆盖五类 warning: file-info/canonical-path failure、directory listing failure、file read failure、frontmatter parse failure、metadata validation failure。[E: packages/agent/src/harness/skills.ts:12] [E: packages/agent/src/harness/skills.ts:13] [E: packages/agent/src/harness/skills.ts:14] [E: packages/agent/src/harness/skills.ts:15] [E: packages/agent/src/harness/skills.ts:16] [E: packages/agent/src/harness/skills.ts:17] [E: packages/agent/src/harness/skills.ts:355] [E: packages/agent/src/harness/skills.ts:360] `SkillDiagnostic` 固定带 `type: "warning"`、stable `code`、human-readable `message` 和 associated `path`。[E: packages/agent/src/harness/skills.ts:20] [E: packages/agent/src/harness/skills.ts:22] [E: packages/agent/src/harness/skills.ts:24] [E: packages/agent/src/harness/skills.ts:26] [E: packages/agent/src/harness/skills.ts:28]

`SkillFrontmatter` 在本文件中只读取 `name`、`description` 和 `disable-model-invocation`;其它 frontmatter key 允许存在但不参与 `Skill` 构造。[E: packages/agent/src/harness/skills.ts:31] [E: packages/agent/src/harness/skills.ts:32] [E: packages/agent/src/harness/skills.ts:33] [E: packages/agent/src/harness/skills.ts:34] [E: packages/agent/src/harness/skills.ts:35] `loadSkillFromFile()` 生成的 `Skill` 字段是 `name`、`description`、`content`、`filePath`、`disableModelInvocation`。[E: packages/agent/src/harness/skills.ts:298] [E: packages/agent/src/harness/skills.ts:299] [E: packages/agent/src/harness/skills.ts:300] [E: packages/agent/src/harness/skills.ts:301] [E: packages/agent/src/harness/skills.ts:302] [E: packages/agent/src/harness/skills.ts:303] [E: packages/agent/src/harness/skills.ts:304]

`name` 来自 frontmatter `name` 或 skill 文件父目录名;`description` 必须是 string 且非空白,否则 `loadSkillFromFile()` 返回 `skill: null`。[E: packages/agent/src/harness/skills.ts:266] [E: packages/agent/src/harness/skills.ts:267] [E: packages/agent/src/harness/skills.ts:279] [E: packages/agent/src/harness/skills.ts:288] [E: packages/agent/src/harness/skills.ts:289] [E: packages/agent/src/harness/skills.ts:294] [E: packages/agent/src/harness/skills.ts:295]

## 文件发现

1. `loadSkills@packages/agent/src/harness/skills.ts:49` normalizes `dirs` into an array, then checks each root with `env.fileInfo()`.[E: packages/agent/src/harness/skills.ts:58] [E: packages/agent/src/harness/skills.ts:59]
2. A root that resolves to directory enters `loadSkillsFromDirInternal(env, rootInfo.path, true, ignore(), rootInfo.path)`; the `includeRootFiles: true` flag is what permits direct root markdown files to be *considered*, but they still need valid skill frontmatter with a non-empty `description`.[E: packages/agent/src/harness/skills.ts:51] [E: packages/agent/src/harness/skills.ts:72] [E: packages/agent/src/harness/skills.ts:73] [E: packages/agent/src/harness/skills.ts:280]
3. Each visited directory first loads ignore rules, then calls `env.listDir(dir)`; listing failures produce `list_failed` diagnostics and stop that directory branch.[E: packages/agent/src/harness/skills.ts:136] [E: packages/agent/src/harness/skills.ts:138] [E: packages/agent/src/harness/skills.ts:139] [E: packages/agent/src/harness/skills.ts:140] [E: packages/agent/src/harness/skills.ts:141]
4. A directory containing a non-ignored regular file named `SKILL.md` loads that file and immediately returns from that directory, so sibling entries under that directory are not traversed by this loader.[E: packages/agent/src/harness/skills.ts:145] [E: packages/agent/src/harness/skills.ts:146] [E: packages/agent/src/harness/skills.ts:148] [E: packages/agent/src/harness/skills.ts:149] [E: packages/agent/src/harness/skills.ts:150] [E: packages/agent/src/harness/skills.ts:151] [E: packages/agent/src/harness/skills.ts:153] [E: packages/agent/src/harness/skills.ts:154] [E: packages/agent/src/harness/skills.ts:156]
5. Without `SKILL.md`, entries are processed in locale-sorted name order; hidden entries and `node_modules` are skipped, directories recurse with `includeRootFiles: false`, and only root-level `.md` files are loaded as direct skills.[E: packages/agent/src/harness/skills.ts:159] [E: packages/agent/src/harness/skills.ts:160] [E: packages/agent/src/harness/skills.ts:169] [E: packages/agent/src/harness/skills.ts:170] [E: packages/agent/src/harness/skills.ts:176] [E: packages/agent/src/harness/skills.ts:177]

## Ignore 规则

The loader recognizes `.gitignore`, `.ignore`, and `.fdignore` in each visited directory.[E: packages/agent/src/harness/skills.ts:8] `addIgnoreRules()` tries each filename, reads file content when present, drops blank/comment lines, prefixes patterns by the current relative directory, and adds resulting patterns to the shared `ignore` matcher.[E: packages/agent/src/harness/skills.ts:196] [E: packages/agent/src/harness/skills.ts:208] [E: packages/agent/src/harness/skills.ts:220] [E: packages/agent/src/harness/skills.ts:221] [E: packages/agent/src/harness/skills.ts:226] [E: packages/agent/src/harness/skills.ts:228] [E: packages/agent/src/harness/skills.ts:230]

Ignore checks are applied before loading `SKILL.md`, before recursing into child directories, and before loading root markdown files.[E: packages/agent/src/harness/skills.ts:150] [E: packages/agent/src/harness/skills.ts:151] [E: packages/agent/src/harness/skills.ts:165] [E: packages/agent/src/harness/skills.ts:166] [E: packages/agent/src/harness/skills.ts:167] Negated patterns are preserved with a leading `!`, and leading slash patterns are normalized by removing the slash before prefixing.[E: packages/agent/src/harness/skills.ts:241] [E: packages/agent/src/harness/skills.ts:247] [E: packages/agent/src/harness/skills.ts:248] [E: packages/agent/src/harness/skills.ts:249]

## Parsing 与 validation

`loadSkillFromFile()` treats a file as a declared skill only when its basename is `SKILL.md`. It reads raw text, parses frontmatter, then validates description and name before deciding whether to return a `Skill`.[E: packages/agent/src/harness/skills.ts:259] [E: packages/agent/src/harness/skills.ts:264] [E: packages/agent/src/harness/skills.ts:270] [E: packages/agent/src/harness/skills.ts:284] [E: packages/agent/src/harness/skills.ts:298] Read errors still warn. Parse errors warn only for declared `SKILL.md`; other root markdown with a parse failure returns `skill: null` and no diagnostic.[E: packages/agent/src/harness/skills.ts:265] [E: packages/agent/src/harness/skills.ts:271] [E: packages/agent/src/harness/skills.ts:272] [E: packages/agent/src/harness/skills.ts:275] Non-`SKILL.md` files that lack a non-empty string `description` are skipped silently, so `README.md` / `AGENTS.md` no longer become broken-skill warnings.[E: packages/agent/src/harness/skills.ts:280] [E: packages/agent/src/harness/skills.ts:281]

`parseFrontmatter()` normalizes CRLF/CR line endings to LF, treats content without a complete leading `--- ... ---` block as empty frontmatter plus full body, parses YAML through `parse()`, and trims the body after the closing marker.[E: packages/agent/src/harness/skills.ts:336] [E: packages/agent/src/harness/skills.ts:337] [E: packages/agent/src/harness/skills.ts:338] [E: packages/agent/src/harness/skills.ts:339] [E: packages/agent/src/harness/skills.ts:340] [E: packages/agent/src/harness/skills.ts:341] [E: packages/agent/src/harness/skills.ts:342]

`validateName()` requires the effective name to equal the parent directory name, stay within 64 chars, use only lowercase letters, digits and hyphens, avoid leading/trailing hyphen, and avoid consecutive hyphens.[E: packages/agent/src/harness/skills.ts:6] [E: packages/agent/src/harness/skills.ts:310] [E: packages/agent/src/harness/skills.ts:312] [E: packages/agent/src/harness/skills.ts:313] [E: packages/agent/src/harness/skills.ts:314] [E: packages/agent/src/harness/skills.ts:317] [E: packages/agent/src/harness/skills.ts:318] `validateDescription()` requires a non-empty description and caps it at 1024 characters.[E: packages/agent/src/harness/skills.ts:7] [E: packages/agent/src/harness/skills.ts:322] [E: packages/agent/src/harness/skills.ts:324] [E: packages/agent/src/harness/skills.ts:326]

## Source tracking

`loadSourcedSkills<TSource, TSkill>()` accepts `{ path, source }` inputs and an optional `mapSkill` function; for each input it delegates discovery to `loadSkills(env, input.path)`.[E: packages/agent/src/harness/skills.ts:86] [E: packages/agent/src/harness/skills.ts:88] [E: packages/agent/src/harness/skills.ts:89] [E: packages/agent/src/harness/skills.ts:98] Each successful skill is emitted as `{ skill, source: input.source }`, with `mapSkill` applied before storage when provided.[E: packages/agent/src/harness/skills.ts:99] [E: packages/agent/src/harness/skills.ts:101] Each diagnostic is copied with the same `source` value.[E: packages/agent/src/harness/skills.ts:105]

The agent package preserves source as caller-defined provenance rather than interpreting its schema: the generic `TSource` appears only in the input and output types, and runtime code forwards `input.source` unchanged into skill and diagnostic records.[E: packages/agent/src/harness/skills.ts:86] [E: packages/agent/src/harness/skills.ts:88] [E: packages/agent/src/harness/skills.ts:92] [E: packages/agent/src/harness/skills.ts:93] [E: packages/agent/src/harness/skills.ts:101] [E: packages/agent/src/harness/skills.ts:105] [I]

## System Prompt 边界

This file does not own the full always-on system prompt listing for all loaded skills; its local prompt-formatting helper is `formatSkillInvocation(skill, additionalInstructions?)`, which wraps a selected skill in `<skill name="..." location="...">`, tells the model that references are relative to the skill file's directory, inserts raw `skill.content`, and appends additional instructions when provided.[E: packages/agent/src/harness/skills.ts:39] [E: packages/agent/src/harness/skills.ts:40] [E: packages/agent/src/harness/skills.ts:41]

The boundary is therefore split: `loadSkills()` and `loadSourcedSkills()` produce `Skill` data and diagnostics, `formatSkillInvocation()` formats one skill invocation payload, and [subsys.agent-core.system-prompt](system-prompt.md) should cover how skills are summarized or exposed in the broader harness system prompt.[E: packages/agent/src/harness/skills.ts:51] [E: packages/agent/src/harness/skills.ts:86] [E: packages/agent/src/harness/skills.ts:39] [I]

## Gotcha

- Invalid metadata diagnostics do not automatically suppress a skill if the description is present: `validateDescription()` and `validateName()` push warnings, but the only metadata gate that returns `skill: null` is missing or blank description.[E: packages/agent/src/harness/skills.ts:284] [E: packages/agent/src/harness/skills.ts:294] [E: packages/agent/src/harness/skills.ts:295] [E: packages/agent/src/harness/skills.ts:298]
- Root markdown that is not `SKILL.md` must carry valid skill frontmatter (`description` 非空)才会成为 skill; 没有 frontmatter 或 description 的 `README.md` 被静默忽略, 不进 `diagnostics`。[E: packages/agent/src/harness/skills.ts:259] [E: packages/agent/src/harness/skills.ts:280] [E: packages/agent/src/harness/skills.ts:281]
- A non-ignored regular `SKILL.md` file wins over all sibling discovery inside the same directory because `loadSkillsFromDirInternal()` returns immediately after processing it.[E: packages/agent/src/harness/skills.ts:145] [E: packages/agent/src/harness/skills.ts:148] [E: packages/agent/src/harness/skills.ts:149] [E: packages/agent/src/harness/skills.ts:151] [E: packages/agent/src/harness/skills.ts:153] [E: packages/agent/src/harness/skills.ts:156]
- Nested standalone `.md` files are not loaded unless they are found in an input root directory with `includeRootFiles: true`; recursive descent passes `includeRootFiles: false`.[E: packages/agent/src/harness/skills.ts:73] [E: packages/agent/src/harness/skills.ts:170] [E: packages/agent/src/harness/skills.ts:176]
- `disable-model-invocation` is parsed only when it is exactly boolean `true`; any other value yields `disableModelInvocation: false` through the strict comparison.[E: packages/agent/src/harness/skills.ts:34] [E: packages/agent/src/harness/skills.ts:304]

## 跨包边界

`surface.skills.system` should describe product-facing skill UX, command enablement, docs and coding-agent integration. This node only proves the reusable agent harness loader and source tagging contract in `packages/agent/src/harness/skills.ts`.[E: packages/agent/src/harness/skills.ts:51] [E: packages/agent/src/harness/skills.ts:86] [I]

`subsys.agent-core.system-prompt` should describe broader harness system prompt assembly. This node only proves the selected-skill invocation formatter and the fields available on loaded `Skill` objects.[E: packages/agent/src/harness/skills.ts:39] [E: packages/agent/src/harness/skills.ts:299] [I]

## Sources

- packages/agent/src/harness/skills.ts

## 相关

- [surface.skills.system](../../surface/skills/system.md): product-facing skills system, command exposure and coding-agent docs.
- [subsys.agent-core.system-prompt](system-prompt.md): harness-level system prompt assembly boundary for loaded skills.
