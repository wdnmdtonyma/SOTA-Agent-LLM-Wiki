---
id: ref.coding-agent.cli-flags
title: CLI 旗标完整目录(60)
kind: catalog
tier: T3
pkg: coding-agent
batch: surface
source:
  - packages/coding-agent/src/cli/args.ts
symbols:
  - Args
  - parseArgs
  - printHelp
evidence: explicit
status: verified
updated: 8c943640
related:
  - surface.cli.overview
---

> `ref.coding-agent.cli-flags` 是 pi coding-agent 全局 CLI 参数 catalog:以 `parseArgs()` 的 argv 分支为解析 ground truth,并把 `printHelp()` 中暴露但不由本函数解释的动态/子命令提示单独标边界。

## 能回答的问题

- `pi` 当前解析哪些全局 long flag 和 short alias?
- 每个 CLI token 写入 `Args` 的哪个字段,值类型和默认状态是什么?
- 哪些 flag 可以重复、哪些 flag 解析逗号列表、哪些 flag 接受可选值?
- unknown long flags、unknown short flags、`@file` 和普通 message 分别如何落入 `Args`?
- `printHelp()` 暴露的 extension flags 和子命令 flags 是否属于 `parseArgs()` 的固定 catalog?

## Catalog 口径

`Args` 的固定字段覆盖 provider/model/apiKey/system prompt/thinking/session/tool/resource/theme/context/list-models/offline/trust 等 CLI surface,并且 `messages`、`fileArgs`、`unknownFlags`、`diagnostics` 是 `parseArgs()` 初始化时总会存在的容器 [E: packages/coding-agent/src/cli/args.ts:12] [E: packages/coding-agent/src/cli/args.ts:50] [E: packages/coding-agent/src/cli/args.ts:53] [E: packages/coding-agent/src/cli/args.ts:54] [E: packages/coding-agent/src/cli/args.ts:63] [E: packages/coding-agent/src/cli/args.ts:64] [E: packages/coding-agent/src/cli/args.ts:68]。

本 catalog 按 `group.cli-flags.instance_count: 60` 的口径覆盖 `parseArgs()` 中 55 个已知 concrete flag token、3 种 unknown long flag 形态、unknown short flag 和 `@file` positional;普通 message positional 是同一扫描器的 fallback,下表为说明 argv 去向单独列出,但不计入 cli-flags group 的 60 个 catalog 项 [E: packages/coding-agent/src/cli/args.ts:74] [E: packages/coding-agent/src/cli/args.ts:184] [E: packages/coding-agent/src/cli/args.ts:186] [E: packages/coding-agent/src/cli/args.ts:188] [E: packages/coding-agent/src/cli/args.ts:202] [E: packages/coding-agent/src/cli/args.ts:204] [I]。`printHelp(extensionFlags)` 还能展示 extension 注册的 `--${flag.name}` 动态 flags,但这些名字不是固定实例,因此不计入 60 个固定 parse catalog 实例 [E: packages/coding-agent/src/cli/args.ts:212] [E: packages/coding-agent/src/cli/args.ts:213] [E: packages/coding-agent/src/cli/args.ts:217] [E: packages/coding-agent/src/cli/args.ts:219] [I]。

`parseArgs()` 是线性扫描器;多数取值型 flag 只有在 `i + 1 < args.length` 时进入专门分支,缺值时会继续落入后面的 unknown long flag 处理,但 `--name` 是例外,缺值会写 error diagnostic [E: packages/coding-agent/src/cli/args.ts:71] [E: packages/coding-agent/src/cli/args.ts:87] [E: packages/coding-agent/src/cli/args.ts:98] [E: packages/coding-agent/src/cli/args.ts:102] [E: packages/coding-agent/src/cli/args.ts:188] [I]。已知 short alias 必须精确匹配;没有 bundling 规则,所以未知 `-x` 或组合短参会进入 unknown short diagnostic [E: packages/coding-agent/src/cli/args.ts:202] [E: packages/coding-agent/src/cli/args.ts:203] [I]。

## 全局解析实例

下表前 60 行是 cli-flags group 的 catalog 口径;最后的 `<message>` 行是 `parseArgs()` 的普通 positional fallback,用于解释 message 如何进入 `Args.messages` [I]。

| token | 值形态 | Args 字段 / 默认 | 含义与解析细节 | 源码证据 |
| --- | --- | --- | --- | --- |
| `--help` | boolean | `help?: boolean`,默认 unset | 设置 help 请求;`printHelp()` 中也作为用户可见 option 展示。 | [E: packages/coding-agent/src/cli/args.ts:21] [E: packages/coding-agent/src/cli/args.ts:74] [E: packages/coding-agent/src/cli/args.ts:75] [E: packages/coding-agent/src/cli/args.ts:277] |
| `-h` | boolean | `help?: boolean`,默认 unset | `--help` 的 short alias,同样设置 `help = true`。 | [E: packages/coding-agent/src/cli/args.ts:74] [E: packages/coding-agent/src/cli/args.ts:75] [E: packages/coding-agent/src/cli/args.ts:277] |
| `--version` | boolean | `version?: boolean`,默认 unset | 设置 version 请求;help 文案列为 version number。 | [E: packages/coding-agent/src/cli/args.ts:22] [E: packages/coding-agent/src/cli/args.ts:76] [E: packages/coding-agent/src/cli/args.ts:77] [E: packages/coding-agent/src/cli/args.ts:278] |
| `-v` | boolean | `version?: boolean`,默认 unset | `--version` 的 short alias,同样设置 `version = true`。 | [E: packages/coding-agent/src/cli/args.ts:76] [E: packages/coding-agent/src/cli/args.ts:77] [E: packages/coding-agent/src/cli/args.ts:278] |
| `--mode` | next argv: `text`/`json`/`rpc` | `mode?: Mode`,默认 unset | 只在值为 `text`、`json`、`rpc` 时写入;其他值被消费但不产生 diagnostic [I]。 | [E: packages/coding-agent/src/cli/args.ts:10] [E: packages/coding-agent/src/cli/args.ts:23] [E: packages/coding-agent/src/cli/args.ts:78] [E: packages/coding-agent/src/cli/args.ts:80] [E: packages/coding-agent/src/cli/args.ts:81] [E: packages/coding-agent/src/cli/args.ts:243] |
| `--continue` | boolean | `continue?: boolean`,默认 unset | 请求继续 previous session。 | [E: packages/coding-agent/src/cli/args.ts:19] [E: packages/coding-agent/src/cli/args.ts:83] [E: packages/coding-agent/src/cli/args.ts:84] [E: packages/coding-agent/src/cli/args.ts:245] |
| `-c` | boolean | `continue?: boolean`,默认 unset | `--continue` 的 short alias。 | [E: packages/coding-agent/src/cli/args.ts:83] [E: packages/coding-agent/src/cli/args.ts:84] [E: packages/coding-agent/src/cli/args.ts:245] |
| `--resume` | boolean | `resume?: boolean`,默认 unset | 请求选择一个 session resume。 | [E: packages/coding-agent/src/cli/args.ts:20] [E: packages/coding-agent/src/cli/args.ts:85] [E: packages/coding-agent/src/cli/args.ts:86] [E: packages/coding-agent/src/cli/args.ts:246] |
| `-r` | boolean | `resume?: boolean`,默认 unset | `--resume` 的 short alias。 | [E: packages/coding-agent/src/cli/args.ts:85] [E: packages/coding-agent/src/cli/args.ts:86] [E: packages/coding-agent/src/cli/args.ts:246] |
| `--provider` | next argv string | `provider?: string`,默认 unset | 写入 provider name;help 文案把默认 provider 描述为 google。 | [E: packages/coding-agent/src/cli/args.ts:13] [E: packages/coding-agent/src/cli/args.ts:87] [E: packages/coding-agent/src/cli/args.ts:88] [E: packages/coding-agent/src/cli/args.ts:238] |
| `--model` | next argv string | `model?: string`,默认 unset | 写入 model pattern/ID;help 文案说明支持 `provider/id` 和 optional `:<thinking>`。 | [E: packages/coding-agent/src/cli/args.ts:14] [E: packages/coding-agent/src/cli/args.ts:89] [E: packages/coding-agent/src/cli/args.ts:90] [E: packages/coding-agent/src/cli/args.ts:239] |
| `--api-key` | next argv string | `apiKey?: string`,默认 unset | 写入 API key;help 文案说明默认来自 env vars。 | [E: packages/coding-agent/src/cli/args.ts:15] [E: packages/coding-agent/src/cli/args.ts:91] [E: packages/coding-agent/src/cli/args.ts:92] [E: packages/coding-agent/src/cli/args.ts:240] |
| `--system-prompt` | next argv string | `systemPrompt?: string`,默认 unset | 替换 system prompt 文本。 | [E: packages/coding-agent/src/cli/args.ts:16] [E: packages/coding-agent/src/cli/args.ts:93] [E: packages/coding-agent/src/cli/args.ts:94] [E: packages/coding-agent/src/cli/args.ts:241] |
| `--append-system-prompt` | next argv string,可重复 | `appendSystemPrompt?: string[]`,默认 unset | 初始化数组后 push 每次传入的 text/file contents 参数;可重复。 | [E: packages/coding-agent/src/cli/args.ts:17] [E: packages/coding-agent/src/cli/args.ts:95] [E: packages/coding-agent/src/cli/args.ts:96] [E: packages/coding-agent/src/cli/args.ts:97] [E: packages/coding-agent/src/cli/args.ts:242] |
| `--name` | next argv string,缺值报错 | `name?: string`,默认 unset | 设置 session display name;该 flag 缺值时直接加入 error diagnostic。 | [E: packages/coding-agent/src/cli/args.ts:24] [E: packages/coding-agent/src/cli/args.ts:98] [E: packages/coding-agent/src/cli/args.ts:100] [E: packages/coding-agent/src/cli/args.ts:102] [E: packages/coding-agent/src/cli/args.ts:252] |
| `-n` | next argv string,缺值报错 | `name?: string`,默认 unset | `--name` 的 short alias,共享缺值 error diagnostic。 | [E: packages/coding-agent/src/cli/args.ts:98] [E: packages/coding-agent/src/cli/args.ts:100] [E: packages/coding-agent/src/cli/args.ts:102] [E: packages/coding-agent/src/cli/args.ts:252] |
| `--no-session` | boolean | `noSession?: boolean`,默认 unset | 设置 ephemeral/no-save session。 | [E: packages/coding-agent/src/cli/args.ts:25] [E: packages/coding-agent/src/cli/args.ts:104] [E: packages/coding-agent/src/cli/args.ts:105] [E: packages/coding-agent/src/cli/args.ts:251] |
| `--session` | next argv string | `session?: string`,默认 unset | 指定 session file path 或 partial UUID。 | [E: packages/coding-agent/src/cli/args.ts:26] [E: packages/coding-agent/src/cli/args.ts:106] [E: packages/coding-agent/src/cli/args.ts:107] [E: packages/coding-agent/src/cli/args.ts:247] |
| `--session-id` | next argv string | `sessionId?: string`,默认 unset | 指定 exact project session ID,缺失 session 时可创建。 | [E: packages/coding-agent/src/cli/args.ts:27] [E: packages/coding-agent/src/cli/args.ts:108] [E: packages/coding-agent/src/cli/args.ts:109] [E: packages/coding-agent/src/cli/args.ts:248] |
| `--fork` | next argv string | `fork?: string`,默认 unset | 指定 session file path 或 partial UUID 并 fork 到新 session。 | [E: packages/coding-agent/src/cli/args.ts:28] [E: packages/coding-agent/src/cli/args.ts:110] [E: packages/coding-agent/src/cli/args.ts:111] [E: packages/coding-agent/src/cli/args.ts:249] |
| `--session-dir` | next argv string | `sessionDir?: string`,默认 unset | 指定 session storage/lookup 目录。 | [E: packages/coding-agent/src/cli/args.ts:29] [E: packages/coding-agent/src/cli/args.ts:112] [E: packages/coding-agent/src/cli/args.ts:113] [E: packages/coding-agent/src/cli/args.ts:250] |
| `--models` | next argv comma list | `models?: string[]`,默认 unset | 以逗号 split 并 trim;不 filter 空字符串,help 文案用于 Ctrl+P model cycling。 | [E: packages/coding-agent/src/cli/args.ts:30] [E: packages/coding-agent/src/cli/args.ts:114] [E: packages/coding-agent/src/cli/args.ts:115] [E: packages/coding-agent/src/cli/args.ts:253] [I] |
| `--no-tools` | boolean | `noTools?: boolean`,默认 unset | 禁用 built-in 和 extension/custom tools。 | [E: packages/coding-agent/src/cli/args.ts:33] [E: packages/coding-agent/src/cli/args.ts:116] [E: packages/coding-agent/src/cli/args.ts:117] [E: packages/coding-agent/src/cli/args.ts:255] |
| `-nt` | boolean | `noTools?: boolean`,默认 unset | `--no-tools` 的 exact short alias。 | [E: packages/coding-agent/src/cli/args.ts:116] [E: packages/coding-agent/src/cli/args.ts:117] [E: packages/coding-agent/src/cli/args.ts:255] |
| `--no-builtin-tools` | boolean | `noBuiltinTools?: boolean`,默认 unset | 禁用 built-in tools,保留 extension/custom tools。 | [E: packages/coding-agent/src/cli/args.ts:34] [E: packages/coding-agent/src/cli/args.ts:118] [E: packages/coding-agent/src/cli/args.ts:119] [E: packages/coding-agent/src/cli/args.ts:256] |
| `-nbt` | boolean | `noBuiltinTools?: boolean`,默认 unset | `--no-builtin-tools` 的 exact short alias。 | [E: packages/coding-agent/src/cli/args.ts:118] [E: packages/coding-agent/src/cli/args.ts:119] [E: packages/coding-agent/src/cli/args.ts:256] |
| `--tools` | next argv comma list | `tools?: string[]`,默认 unset | 以逗号 split、trim 并 filter 空项;作为 tool allowlist。 | [E: packages/coding-agent/src/cli/args.ts:31] [E: packages/coding-agent/src/cli/args.ts:120] [E: packages/coding-agent/src/cli/args.ts:121] [E: packages/coding-agent/src/cli/args.ts:124] [E: packages/coding-agent/src/cli/args.ts:257] |
| `-t` | next argv comma list | `tools?: string[]`,默认 unset | `--tools` 的 short alias,共享 split/trim/filter 行为。 | [E: packages/coding-agent/src/cli/args.ts:120] [E: packages/coding-agent/src/cli/args.ts:121] [E: packages/coding-agent/src/cli/args.ts:124] [E: packages/coding-agent/src/cli/args.ts:257] |
| `--exclude-tools` | next argv comma list | `excludeTools?: string[]`,默认 unset | 以逗号 split、trim 并 filter 空项;作为 tool denylist。 | [E: packages/coding-agent/src/cli/args.ts:32] [E: packages/coding-agent/src/cli/args.ts:125] [E: packages/coding-agent/src/cli/args.ts:126] [E: packages/coding-agent/src/cli/args.ts:129] [E: packages/coding-agent/src/cli/args.ts:259] |
| `-xt` | next argv comma list | `excludeTools?: string[]`,默认 unset | `--exclude-tools` 的 exact short alias。 | [E: packages/coding-agent/src/cli/args.ts:125] [E: packages/coding-agent/src/cli/args.ts:126] [E: packages/coding-agent/src/cli/args.ts:129] [E: packages/coding-agent/src/cli/args.ts:259] |
| `--thinking` | next argv level | `thinking?: ThinkingLevel`,默认 unset | 只接受 `off`、`minimal`、`low`、`medium`、`high`、`xhigh`;非法值加入 warning diagnostic。 | [E: packages/coding-agent/src/cli/args.ts:18] [E: packages/coding-agent/src/cli/args.ts:57] [E: packages/coding-agent/src/cli/args.ts:130] [E: packages/coding-agent/src/cli/args.ts:132] [E: packages/coding-agent/src/cli/args.ts:135] [E: packages/coding-agent/src/cli/args.ts:261] |
| `--print` | boolean + optional following message | `print?: boolean`,默认 unset;可能 push `messages[]` | 设置 non-interactive print mode;若下一 argv 不是 `@file` 且不是 normal flag,或以 `---` 开头,会被消费进 `messages`。 | [E: packages/coding-agent/src/cli/args.ts:37] [E: packages/coding-agent/src/cli/args.ts:140] [E: packages/coding-agent/src/cli/args.ts:141] [E: packages/coding-agent/src/cli/args.ts:143] [E: packages/coding-agent/src/cli/args.ts:144] [E: packages/coding-agent/src/cli/args.ts:244] |
| `-p` | boolean + optional following message | `print?: boolean`,默认 unset;可能 push `messages[]` | `--print` 的 short alias,共享 optional following message 规则。 | [E: packages/coding-agent/src/cli/args.ts:140] [E: packages/coding-agent/src/cli/args.ts:141] [E: packages/coding-agent/src/cli/args.ts:143] [E: packages/coding-agent/src/cli/args.ts:144] [E: packages/coding-agent/src/cli/args.ts:244] |
| `--export` | next argv string | `export?: string`,默认 unset | 写入 session export source file;help examples 显示 output path 可作为普通 message positional 追加 [I]。 | [E: packages/coding-agent/src/cli/args.ts:38] [E: packages/coding-agent/src/cli/args.ts:147] [E: packages/coding-agent/src/cli/args.ts:148] [E: packages/coding-agent/src/cli/args.ts:271] [E: packages/coding-agent/src/cli/args.ts:331] [E: packages/coding-agent/src/cli/args.ts:333] |
| `--extension` | next argv string,可重复 | `extensions?: string[]`,默认 unset | 初始化数组后 push extension file path;可重复。 | [E: packages/coding-agent/src/cli/args.ts:35] [E: packages/coding-agent/src/cli/args.ts:149] [E: packages/coding-agent/src/cli/args.ts:150] [E: packages/coding-agent/src/cli/args.ts:151] [E: packages/coding-agent/src/cli/args.ts:262] |
| `-e` | next argv string,可重复 | `extensions?: string[]`,默认 unset | `--extension` 的 short alias,共享 push 行为。 | [E: packages/coding-agent/src/cli/args.ts:149] [E: packages/coding-agent/src/cli/args.ts:150] [E: packages/coding-agent/src/cli/args.ts:151] [E: packages/coding-agent/src/cli/args.ts:262] |
| `--no-extensions` | boolean | `noExtensions?: boolean`,默认 unset | 禁用 extension discovery;help 文案说明 explicit `-e` paths still work。 | [E: packages/coding-agent/src/cli/args.ts:36] [E: packages/coding-agent/src/cli/args.ts:152] [E: packages/coding-agent/src/cli/args.ts:153] [E: packages/coding-agent/src/cli/args.ts:263] |
| `-ne` | boolean | `noExtensions?: boolean`,默认 unset | `--no-extensions` 的 exact short alias。 | [E: packages/coding-agent/src/cli/args.ts:152] [E: packages/coding-agent/src/cli/args.ts:153] [E: packages/coding-agent/src/cli/args.ts:263] |
| `--skill` | next argv string,可重复 | `skills?: string[]`,默认 unset | 初始化数组后 push skill file/directory path;可重复。 | [E: packages/coding-agent/src/cli/args.ts:40] [E: packages/coding-agent/src/cli/args.ts:154] [E: packages/coding-agent/src/cli/args.ts:155] [E: packages/coding-agent/src/cli/args.ts:156] [E: packages/coding-agent/src/cli/args.ts:264] |
| `--prompt-template` | next argv string,可重复 | `promptTemplates?: string[]`,默认 unset | 初始化数组后 push prompt template file/directory path;可重复。 | [E: packages/coding-agent/src/cli/args.ts:41] [E: packages/coding-agent/src/cli/args.ts:157] [E: packages/coding-agent/src/cli/args.ts:158] [E: packages/coding-agent/src/cli/args.ts:159] [E: packages/coding-agent/src/cli/args.ts:266] |
| `--theme` | next argv string,可重复 | `themes?: string[]`,默认 unset | 初始化数组后 push theme file/directory path;可重复。 | [E: packages/coding-agent/src/cli/args.ts:43] [E: packages/coding-agent/src/cli/args.ts:160] [E: packages/coding-agent/src/cli/args.ts:161] [E: packages/coding-agent/src/cli/args.ts:162] [E: packages/coding-agent/src/cli/args.ts:268] |
| `--no-skills` | boolean | `noSkills?: boolean`,默认 unset | 禁用 skills discovery/loading。 | [E: packages/coding-agent/src/cli/args.ts:39] [E: packages/coding-agent/src/cli/args.ts:163] [E: packages/coding-agent/src/cli/args.ts:164] [E: packages/coding-agent/src/cli/args.ts:265] |
| `-ns` | boolean | `noSkills?: boolean`,默认 unset | `--no-skills` 的 exact short alias。 | [E: packages/coding-agent/src/cli/args.ts:163] [E: packages/coding-agent/src/cli/args.ts:164] [E: packages/coding-agent/src/cli/args.ts:265] |
| `--no-prompt-templates` | boolean | `noPromptTemplates?: boolean`,默认 unset | 禁用 prompt template discovery/loading。 | [E: packages/coding-agent/src/cli/args.ts:42] [E: packages/coding-agent/src/cli/args.ts:165] [E: packages/coding-agent/src/cli/args.ts:166] [E: packages/coding-agent/src/cli/args.ts:267] |
| `-np` | boolean | `noPromptTemplates?: boolean`,默认 unset | `--no-prompt-templates` 的 exact short alias。 | [E: packages/coding-agent/src/cli/args.ts:165] [E: packages/coding-agent/src/cli/args.ts:166] [E: packages/coding-agent/src/cli/args.ts:267] |
| `--no-themes` | boolean | `noThemes?: boolean`,默认 unset | 禁用 theme discovery/loading。 | [E: packages/coding-agent/src/cli/args.ts:44] [E: packages/coding-agent/src/cli/args.ts:167] [E: packages/coding-agent/src/cli/args.ts:168] [E: packages/coding-agent/src/cli/args.ts:269] |
| `--no-context-files` | boolean | `noContextFiles?: boolean`,默认 unset | 禁用 AGENTS.md 和 CLAUDE.md discovery/loading。 | [E: packages/coding-agent/src/cli/args.ts:45] [E: packages/coding-agent/src/cli/args.ts:169] [E: packages/coding-agent/src/cli/args.ts:170] [E: packages/coding-agent/src/cli/args.ts:270] |
| `-nc` | boolean | `noContextFiles?: boolean`,默认 unset | `--no-context-files` 的 exact short alias。 | [E: packages/coding-agent/src/cli/args.ts:169] [E: packages/coding-agent/src/cli/args.ts:170] [E: packages/coding-agent/src/cli/args.ts:270] |
| `--list-models` | optional next argv search string | `listModels?: string \| true`,默认 unset | 下一 argv 存在且不是 flag/`@file` 时作为 search pattern,否则写 `true`。 | [E: packages/coding-agent/src/cli/args.ts:46] [E: packages/coding-agent/src/cli/args.ts:171] [E: packages/coding-agent/src/cli/args.ts:173] [E: packages/coding-agent/src/cli/args.ts:174] [E: packages/coding-agent/src/cli/args.ts:176] [E: packages/coding-agent/src/cli/args.ts:272] |
| `--verbose` | boolean | `verbose?: boolean`,默认 unset | 强制 verbose startup,覆盖 quietStartup setting。 | [E: packages/coding-agent/src/cli/args.ts:48] [E: packages/coding-agent/src/cli/args.ts:178] [E: packages/coding-agent/src/cli/args.ts:179] [E: packages/coding-agent/src/cli/args.ts:273] |
| `--approve` | boolean true | `projectTrustOverride?: boolean`,默认 unset | 本次运行信任 project-local files。 | [E: packages/coding-agent/src/cli/args.ts:49] [E: packages/coding-agent/src/cli/args.ts:180] [E: packages/coding-agent/src/cli/args.ts:181] [E: packages/coding-agent/src/cli/args.ts:274] |
| `-a` | boolean true | `projectTrustOverride?: boolean`,默认 unset | `--approve` 的 short alias。 | [E: packages/coding-agent/src/cli/args.ts:180] [E: packages/coding-agent/src/cli/args.ts:181] [E: packages/coding-agent/src/cli/args.ts:274] |
| `--no-approve` | boolean false | `projectTrustOverride?: boolean`,默认 unset | 本次运行忽略 project-local files。 | [E: packages/coding-agent/src/cli/args.ts:49] [E: packages/coding-agent/src/cli/args.ts:182] [E: packages/coding-agent/src/cli/args.ts:183] [E: packages/coding-agent/src/cli/args.ts:275] |
| `-na` | boolean false | `projectTrustOverride?: boolean`,默认 unset | `--no-approve` 的 exact short alias。 | [E: packages/coding-agent/src/cli/args.ts:182] [E: packages/coding-agent/src/cli/args.ts:183] [E: packages/coding-agent/src/cli/args.ts:275] |
| `--offline` | boolean | `offline?: boolean`,默认 unset | 禁用 startup network operations;help 文案等价描述为 `PI_OFFLINE=1`。 | [E: packages/coding-agent/src/cli/args.ts:47] [E: packages/coding-agent/src/cli/args.ts:184] [E: packages/coding-agent/src/cli/args.ts:185] [E: packages/coding-agent/src/cli/args.ts:276] |
| `--<unknown>=<value>` | inline `=` value | `unknownFlags: Map<string, boolean \| string>` | unknown long flag 含 `=` 时保存 `name -> value`;主要给 extension flags 使用 [I]。 | [E: packages/coding-agent/src/cli/args.ts:53] [E: packages/coding-agent/src/cli/args.ts:188] [E: packages/coding-agent/src/cli/args.ts:189] [E: packages/coding-agent/src/cli/args.ts:191] [E: packages/coding-agent/src/cli/args.ts:280] |
| `--<unknown> <value>` | following argv string | `unknownFlags: Map<string, boolean \| string>` | unknown long flag 后一个 argv 存在且不以 `-` 或 `@` 开头时保存 `name -> next`,并消费 next。 | [E: packages/coding-agent/src/cli/args.ts:193] [E: packages/coding-agent/src/cli/args.ts:194] [E: packages/coding-agent/src/cli/args.ts:195] [E: packages/coding-agent/src/cli/args.ts:196] [E: packages/coding-agent/src/cli/args.ts:197] |
| `--<unknown>` | boolean true | `unknownFlags: Map<string, boolean \| string>` | unknown long flag 无 inline value、无可消费 next value 时保存 `name -> true`。 | [E: packages/coding-agent/src/cli/args.ts:193] [E: packages/coding-agent/src/cli/args.ts:198] [E: packages/coding-agent/src/cli/args.ts:199] |
| `-<unknown>` | diagnostic error | `diagnostics[]`,默认 empty array | 任何未被上方 exact alias 捕获的 single-dash token 进入 unknown option error;没有 unknown short extension 机制。 | [E: packages/coding-agent/src/cli/args.ts:54] [E: packages/coding-agent/src/cli/args.ts:202] [E: packages/coding-agent/src/cli/args.ts:203] |
| `@<path>` | positional file arg | `fileArgs: string[]`,默认 empty array | 去掉 leading `@` 后 push 到 file arguments;help usage 写作 `[@files...]`。 | [E: packages/coding-agent/src/cli/args.ts:51] [E: packages/coding-agent/src/cli/args.ts:186] [E: packages/coding-agent/src/cli/args.ts:187] [E: packages/coding-agent/src/cli/args.ts:226] |
| `<message>` | positional non-flag string | `messages: string[]`,默认 empty array | 不以 `-` 开头的普通 argv push 到 initial messages;`--print/-p` 也可能提前消费一个 following message。 | [E: packages/coding-agent/src/cli/args.ts:50] [E: packages/coding-agent/src/cli/args.ts:204] [E: packages/coding-agent/src/cli/args.ts:205] [E: packages/coding-agent/src/cli/args.ts:226] |

## Help-only 与动态 flag 边界

`printHelp()` 的 Commands 区展示 `install <source> [-l]`、`remove <source> [-l]`、`uninstall <source> [-l]`、`update [source|self|pi]` 和 "use `--all` for pi and extensions",但 `parseArgs()` 本文件没有为 `-l` 或 `--all` 建立全局 `Args` 字段;这些子命令 flag 的实际行为需要到 package-manager CLI 或命令处理器另核,本节点不把它们计入全局 60 实例 [E: packages/coding-agent/src/cli/args.ts:229] [E: packages/coding-agent/src/cli/args.ts:230] [E: packages/coding-agent/src/cli/args.ts:231] [E: packages/coding-agent/src/cli/args.ts:232] [U]。

Extension flags 是 runtime-loaded 动态 surface:`printHelp(extensionFlags)` 对 `flag.type === "string"` 的 flag 追加 ` <value>`,description 优先使用 `flag.description`,否则显示 registering extension path [E: packages/coding-agent/src/cli/args.ts:213] [E: packages/coding-agent/src/cli/args.ts:217] [E: packages/coding-agent/src/cli/args.ts:218] [E: packages/coding-agent/src/cli/args.ts:219]。这些动态 flags 在 `parseArgs()` 视角只会先进入 `unknownFlags`,具体名字和含义由 extension 注册时决定,不是本固定 catalog 的可枚举实例 [E: packages/coding-agent/src/cli/args.ts:188] [E: packages/coding-agent/src/cli/args.ts:191] [E: packages/coding-agent/src/cli/args.ts:196] [E: packages/coding-agent/src/cli/args.ts:199] [I]。

## Sources

- `packages/coding-agent/src/cli/args.ts`

## 相关

- [surface.cli.overview](../surface/cli/overview.md): CLI argv 如何继续影响 package/config commands、runtime 创建、mode dispatch、session 和 initial message。
