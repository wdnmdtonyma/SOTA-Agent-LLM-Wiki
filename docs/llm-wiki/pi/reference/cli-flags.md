---
id: ref.coding-agent.cli-flags
title: CLI 旗标完整目录(62)
kind: catalog
tier: T3
pkg: coding-agent
source:
  - packages/coding-agent/src/cli/args.ts
  - packages/coding-agent/src/cli/auth-command.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/package-manager-cli.ts
  - packages/coding-agent/src/extensions/mcp/cli.ts
  - packages/coding-agent/docs/cli.md
  - packages/coding-agent/test/suite/regressions/7269-cli-end-of-options.test.ts
symbols:
  - Args
  - parseArgs
  - printHelp
  - parseAuthCommand
  - handlePackageCommand
  - handleConfigCommand
  - runMcpCommand
evidence: explicit
status: verified
updated: 4c6fb7cfe8
related:
  - surface.cli.overview
---

> `ref.coding-agent.cli-flags` 是 pi coding-agent CLI 旗标 catalog:以 `parseArgs()` / `printHelp()` 的全局 option 名,加上 `main.ts` 在 `parseArgs` 之前短路的 `pi auth` / package / `config` / `pi mcp` 子命令专用 option 名为 ground truth,当前 **62** 个互不相同的 canonical option 名。

## 能回答的问题

- `pi` 全局 `parseArgs()` 认识哪些 long flag 和 short alias?
- `printHelp()` 列出的 Options 与 `parseArgs()` 是否同一集合?
- `pi auth`、`pi install`/`update`/`config`、`pi mcp` 各自还有哪些专用旗标?
- 每个 option 写入哪个 `Args` 字段,或由哪个子命令 parser 消费?
- unknown long flags、`@file` 和普通 message 是否计入这 62 项?

## Catalog 口径

本页计数 = **互不相同的 canonical option 名**(long form;`--` 算一项;short alias 写在同一行,不另计)。来源是:

1. `parseArgs()` 的已知分支 + `printHelp()` Options 区:**41** 项(40 个 named flags + `--`)。`printHelp()` 把 short alias 写在对应 long 同一行,与本页分组一致 [E: packages/coding-agent/src/cli/args.ts:71] [E: packages/coding-agent/src/cli/args.ts:264] [E: packages/coding-agent/src/cli/args.ts:291] [E: packages/coding-agent/src/cli/args.ts:335]。
2. `main.ts` 在 `parseArgs(args)` 之前短路的子命令 parser 里、且**尚未出现在全局 41 项中**的 option 名:**21** 项 [E: packages/coding-agent/src/main.ts:582] [E: packages/coding-agent/src/main.ts:597] [E: packages/coding-agent/src/main.ts:610] [E: packages/coding-agent/src/main.ts:614] [E: packages/coding-agent/src/main.ts:620]。

41 + 21 = **62**。不计入:unknown long/short catch-all、`@file` positional、普通 message positional、extension 运行时注册的动态 `--${flag.name}`、以及 `install`/`mcp`/`auth` 这类子命令名本身 [I]。

21 个仅子命令 option:`--local`、`--self`、`--extensions`、`--all`、`--force`、`--min-expiry`、`--json`、`--credentials`、`--no-refresh`、`--url`、`--env`、`--cwd`、`--header`、`--bearer-token-env-var`、`--oauth-client-id`、`--oauth-client-secret`、`--oauth-callback-port`、`--oauth-client-name`、`--exposure`、`--description`、`--timeout`。

`--models` 与 `--extension` 已在全局 41 项中,`pi update` 再解析一次但**不另计**;含义差异写在「同名异义」段 [I]。`--help`/`-h`、`--approve`/`-a`、`--no-approve`/`-na` 同样只计一次。

`Args` 在 `parseArgs()` 初始化时总会带 `messages`、`fileArgs`、`unknownFlags`、`diagnostics` 四个容器 [E: packages/coding-agent/src/cli/args.ts:53] [E: packages/coding-agent/src/cli/args.ts:54] [E: packages/coding-agent/src/cli/args.ts:56] [E: packages/coding-agent/src/cli/args.ts:57] [E: packages/coding-agent/src/cli/args.ts:72] [E: packages/coding-agent/src/cli/args.ts:76]。`printHelp(extensionFlags)` 还能展示 extension 注册的动态 flags,那些名字不是固定实例,不计入 62 [E: packages/coding-agent/src/cli/args.ts:265] [E: packages/coding-agent/src/cli/args.ts:269] [E: packages/coding-agent/src/cli/args.ts:271]。

`parseArgs()` 是线性扫描器。多数取值型 flag 只有在 `i + 1 < args.length` 时进入专门分支。`--name`/`-n`、`--use-theme`、`--mode` 和 `--tui-mode` 缺值(以及 `--use-theme`/`--mode`/`--tui-mode` 下一 token 以 `-` 开头)写 error diagnostic。`--mode` 的非法值也写 error;`main()` 见到任意 error diagnostic 后 `process.exit(1)` [E: packages/coding-agent/src/cli/args.ts:95] [E: packages/coding-agent/src/cli/args.ts:97] [E: packages/coding-agent/src/cli/args.ts:102] [E: packages/coding-agent/src/cli/args.ts:125] [E: packages/coding-agent/src/cli/args.ts:193] [E: packages/coding-agent/src/cli/args.ts:216] [E: packages/coding-agent/src/main.ts:621] [E: packages/coding-agent/src/main.ts:626] [E: packages/coding-agent/src/main.ts:627]。已知 short alias 必须精确匹配,没有 bundling;未知 `-x` 进入 unknown short diagnostic [E: packages/coding-agent/src/cli/args.ts:254] [E: packages/coding-agent/src/cli/args.ts:255]。

## 全局 parseArgs / printHelp(41)

| option | aliases | 值形态 | Args 字段 / 默认 | 含义与解析细节 | 证据 |
| --- | --- | --- | --- | --- | --- |
| `--` | 无 | end-of-options | 不写独立 Args 字段;后续 argv 只进 `messages[]` 或 `fileArgs[]` | 停止 option 解析:之后每个 token 若以 `@` 开头则 strip `@` 后 push `fileArgs`,否则整段 push `messages`。`printHelp()` usage 写作 `[options] [--] [@files...] [messages...]`。regression `#7269` 覆盖 dash-prefixed prompt 与 `--` 后保留 `@file`。 | [E: packages/coding-agent/src/cli/args.ts:82] [E: packages/coding-agent/src/cli/args.ts:84] [E: packages/coding-agent/src/cli/args.ts:87] [E: packages/coding-agent/src/cli/args.ts:278] [E: packages/coding-agent/src/cli/args.ts:333] [E: packages/coding-agent/test/suite/regressions/7269-cli-end-of-options.test.ts:6] [E: packages/coding-agent/test/suite/regressions/7269-cli-end-of-options.test.ts:17] [E: packages/coding-agent/test/suite/regressions/7269-cli-end-of-options.test.ts:29] |
| `--help` | `-h` | boolean | `help?: boolean`,默认 unset | 设置 help 请求;`printHelp()` 中也作为用户可见 option 展示。 | [E: packages/coding-agent/src/cli/args.ts:22] [E: packages/coding-agent/src/cli/args.ts:91] [E: packages/coding-agent/src/cli/args.ts:334] |
| `--version` | `-v` | boolean | `version?: boolean`,默认 unset | 设置 version 请求;help 文案列为 version number。 | [E: packages/coding-agent/src/cli/args.ts:23] [E: packages/coding-agent/src/cli/args.ts:93] [E: packages/coding-agent/src/cli/args.ts:335] |
| `--mode` | 无 | next argv: `text`/`json`/`rpc` | `mode?: Mode`,默认 unset | 合法值写入 `mode`。缺值或下一 token 以 `-` 开头写 error `"--mode requires text, json, or rpc"`;其它非法值消费该 token 并写 `Invalid mode` error。 | [E: packages/coding-agent/src/cli/args.ts:11] [E: packages/coding-agent/src/cli/args.ts:24] [E: packages/coding-agent/src/cli/args.ts:95] [E: packages/coding-agent/src/cli/args.ts:97] [E: packages/coding-agent/src/cli/args.ts:102] [E: packages/coding-agent/src/cli/args.ts:297] |
| `--continue` | `-c` | boolean | `continue?: boolean`,默认 unset | 请求继续 previous session。 | [E: packages/coding-agent/src/cli/args.ts:20] [E: packages/coding-agent/src/cli/args.ts:110] [E: packages/coding-agent/src/cli/args.ts:299] |
| `--resume` | `-r` | boolean | `resume?: boolean`,默认 unset | 请求选择一个 session resume。 | [E: packages/coding-agent/src/cli/args.ts:21] [E: packages/coding-agent/src/cli/args.ts:112] [E: packages/coding-agent/src/cli/args.ts:300] |
| `--provider` | 无 | next argv string | `provider?: string`,默认 unset | 写入 provider name;help 文案为 Provider to search for `--model` (requires `--model`)。 | [E: packages/coding-agent/src/cli/args.ts:14] [E: packages/coding-agent/src/cli/args.ts:114] [E: packages/coding-agent/src/cli/args.ts:292] |
| `--model` | 无 | next argv string | `model?: string`,默认 unset | 写入 model pattern/ID;help 文案说明支持 `provider/id` 和 optional `:<thinking>`。 | [E: packages/coding-agent/src/cli/args.ts:15] [E: packages/coding-agent/src/cli/args.ts:116] [E: packages/coding-agent/src/cli/args.ts:293] |
| `--api-key` | 无 | next argv string | `apiKey?: string`,默认 unset | 写入 API key;help 文案说明默认来自 env vars。 | [E: packages/coding-agent/src/cli/args.ts:16] [E: packages/coding-agent/src/cli/args.ts:118] [E: packages/coding-agent/src/cli/args.ts:294] |
| `--system-prompt` | 无 | next argv string | `systemPrompt?: string`,默认 unset | 替换 system prompt 文本。 | [E: packages/coding-agent/src/cli/args.ts:17] [E: packages/coding-agent/src/cli/args.ts:120] [E: packages/coding-agent/src/cli/args.ts:295] |
| `--append-system-prompt` | 无 | next argv string,可重复 | `appendSystemPrompt?: string[]`,默认 unset | 初始化数组后 push 每次传入的 text/file contents 参数;可重复。 | [E: packages/coding-agent/src/cli/args.ts:18] [E: packages/coding-agent/src/cli/args.ts:122] [E: packages/coding-agent/src/cli/args.ts:124] [E: packages/coding-agent/src/cli/args.ts:296] |
| `--name` | `-n` | next argv string,缺值报错 | `name?: string`,默认 unset | 设置 session display name;该 flag 缺值时直接加入 error diagnostic。 | [E: packages/coding-agent/src/cli/args.ts:25] [E: packages/coding-agent/src/cli/args.ts:125] [E: packages/coding-agent/src/cli/args.ts:129] [E: packages/coding-agent/src/cli/args.ts:306] |
| `--no-session` | 无 | boolean | `noSession?: boolean`,默认 unset | 设置 ephemeral/no-save session。 | [E: packages/coding-agent/src/cli/args.ts:26] [E: packages/coding-agent/src/cli/args.ts:131] [E: packages/coding-agent/src/cli/args.ts:305] |
| `--session` | 无 | next argv string | `session?: string`,默认 unset | 指定 session file path 或 partial UUID。 | [E: packages/coding-agent/src/cli/args.ts:27] [E: packages/coding-agent/src/cli/args.ts:133] [E: packages/coding-agent/src/cli/args.ts:301] |
| `--session-id` | 无 | next argv string | `sessionId?: string`,默认 unset | 指定 exact project session ID,缺失 session 时可创建。 | [E: packages/coding-agent/src/cli/args.ts:28] [E: packages/coding-agent/src/cli/args.ts:135] [E: packages/coding-agent/src/cli/args.ts:302] |
| `--fork` | 无 | next argv string | `fork?: string`,默认 unset | 指定 session file path 或 partial UUID 并 fork 到新 session。 | [E: packages/coding-agent/src/cli/args.ts:29] [E: packages/coding-agent/src/cli/args.ts:137] [E: packages/coding-agent/src/cli/args.ts:303] |
| `--session-dir` | 无 | next argv string | `sessionDir?: string`,默认 unset | 指定 session storage/lookup 目录。 | [E: packages/coding-agent/src/cli/args.ts:30] [E: packages/coding-agent/src/cli/args.ts:139] [E: packages/coding-agent/src/cli/args.ts:304] |
| `--models` | 无 | next argv comma list | `models?: string[]`,默认 unset | 以逗号 split、trim,并 `filter` 掉空字符串;help 文案用于 Ctrl+P model cycling。`pi update --models` 是另一 parser,见同名异义。 | [E: packages/coding-agent/src/cli/args.ts:31] [E: packages/coding-agent/src/cli/args.ts:141] [E: packages/coding-agent/src/cli/args.ts:145] [E: packages/coding-agent/src/cli/args.ts:307] |
| `--no-tools` | `-nt` | boolean | `noTools?: boolean`,默认 unset | 禁用 built-in 和 extension/custom tools。 | [E: packages/coding-agent/src/cli/args.ts:34] [E: packages/coding-agent/src/cli/args.ts:146] [E: packages/coding-agent/src/cli/args.ts:309] |
| `--no-builtin-tools` | `-nbt` | boolean | `noBuiltinTools?: boolean`,默认 unset | 禁用 built-in tools,保留 extension/custom tools。 | [E: packages/coding-agent/src/cli/args.ts:35] [E: packages/coding-agent/src/cli/args.ts:148] [E: packages/coding-agent/src/cli/args.ts:310] |
| `--tools` | `-t` | next argv comma list | `tools?: string[]`,默认 unset | 以逗号 split、trim 并 filter 空项;作为 tool allowlist。 | [E: packages/coding-agent/src/cli/args.ts:32] [E: packages/coding-agent/src/cli/args.ts:150] [E: packages/coding-agent/src/cli/args.ts:154] [E: packages/coding-agent/src/cli/args.ts:311] |
| `--exclude-tools` | `-xt` | next argv comma list | `excludeTools?: string[]`,默认 unset | 以逗号 split、trim 并 filter 空项;作为 tool denylist。 | [E: packages/coding-agent/src/cli/args.ts:33] [E: packages/coding-agent/src/cli/args.ts:155] [E: packages/coding-agent/src/cli/args.ts:159] [E: packages/coding-agent/src/cli/args.ts:313] |
| `--thinking` | 无 | next argv level | `thinking?: ThinkingLevel`,默认 unset | 只接受 `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`;非法值加入 warning diagnostic。 | [E: packages/coding-agent/src/cli/args.ts:19] [E: packages/coding-agent/src/cli/args.ts:60] [E: packages/coding-agent/src/cli/args.ts:160] [E: packages/coding-agent/src/cli/args.ts:162] [E: packages/coding-agent/src/cli/args.ts:165] [E: packages/coding-agent/src/cli/args.ts:315] |
| `--print` | `-p` | boolean + optional following message | `print?: boolean`,默认 unset;可能 push `messages[]` | 设置 non-interactive print mode;若下一 argv 不是 `@file` 且不是 normal flag,或以 `---` 开头,会被消费进 `messages`。 | [E: packages/coding-agent/src/cli/args.ts:38] [E: packages/coding-agent/src/cli/args.ts:170] [E: packages/coding-agent/src/cli/args.ts:173] [E: packages/coding-agent/src/cli/args.ts:298] |
| `--export` | 无 | next argv string | `export?: string`,默认 unset | 写入 session export source file;help examples 显示 output path 可作为普通 message positional 追加。 | [E: packages/coding-agent/src/cli/args.ts:39] [E: packages/coding-agent/src/cli/args.ts:177] [E: packages/coding-agent/src/cli/args.ts:326] [E: packages/coding-agent/src/cli/args.ts:399] |
| `--extension` | `-e` | next argv string,可重复 | `extensions?: string[]`,默认 unset | 初始化数组后 push extension file path 或 `builtin:<name>`;可重复。`pi update --extension` 是另一 parser,见同名异义。 | [E: packages/coding-agent/src/cli/args.ts:36] [E: packages/coding-agent/src/cli/args.ts:179] [E: packages/coding-agent/src/cli/args.ts:181] [E: packages/coding-agent/src/cli/args.ts:316] |
| `--no-extensions` | `-ne` | boolean | `noExtensions?: boolean`,默认 unset | 禁用 extension discovery;help 文案说明 explicit `-e` paths still work。 | [E: packages/coding-agent/src/cli/args.ts:37] [E: packages/coding-agent/src/cli/args.ts:182] [E: packages/coding-agent/src/cli/args.ts:317] |
| `--skill` | 无 | next argv string,可重复 | `skills?: string[]`,默认 unset | 初始化数组后 push skill file/directory path;可重复。 | [E: packages/coding-agent/src/cli/args.ts:41] [E: packages/coding-agent/src/cli/args.ts:184] [E: packages/coding-agent/src/cli/args.ts:186] [E: packages/coding-agent/src/cli/args.ts:318] |
| `--prompt-template` | 无 | next argv string,可重复 | `promptTemplates?: string[]`,默认 unset | 初始化数组后 push prompt template file/directory path;可重复。 | [E: packages/coding-agent/src/cli/args.ts:42] [E: packages/coding-agent/src/cli/args.ts:187] [E: packages/coding-agent/src/cli/args.ts:189] [E: packages/coding-agent/src/cli/args.ts:320] |
| `--theme` | 无 | next argv string,可重复 | `themes?: string[]`,默认 unset | 初始化数组后 push theme file/directory path;可重复。 | [E: packages/coding-agent/src/cli/args.ts:44] [E: packages/coding-agent/src/cli/args.ts:190] [E: packages/coding-agent/src/cli/args.ts:192] [E: packages/coding-agent/src/cli/args.ts:322] |
| `--use-theme` | 无 | next argv theme name,缺值或下一 token 以 `-` 开头报错 | `useTheme?: string`,默认 unset | 设置本次 interactive 初始 theme(`name` 或 `name/name`);不写回 settings。 | [E: packages/coding-agent/src/cli/args.ts:45] [E: packages/coding-agent/src/cli/args.ts:193] [E: packages/coding-agent/src/cli/args.ts:195] [E: packages/coding-agent/src/cli/args.ts:198] [E: packages/coding-agent/src/cli/args.ts:323] |
| `--no-skills` | `-ns` | boolean | `noSkills?: boolean`,默认 unset | 禁用 skills discovery/loading。 | [E: packages/coding-agent/src/cli/args.ts:40] [E: packages/coding-agent/src/cli/args.ts:201] [E: packages/coding-agent/src/cli/args.ts:319] |
| `--no-prompt-templates` | `-np` | boolean | `noPromptTemplates?: boolean`,默认 unset | 禁用 prompt template discovery/loading。 | [E: packages/coding-agent/src/cli/args.ts:43] [E: packages/coding-agent/src/cli/args.ts:203] [E: packages/coding-agent/src/cli/args.ts:321] |
| `--no-themes` | 无 | boolean | `noThemes?: boolean`,默认 unset | 禁用 theme discovery/loading。 | [E: packages/coding-agent/src/cli/args.ts:46] [E: packages/coding-agent/src/cli/args.ts:205] [E: packages/coding-agent/src/cli/args.ts:324] |
| `--no-context-files` | `-nc` | boolean | `noContextFiles?: boolean`,默认 unset | 禁用 AGENTS.md 和 CLAUDE.md discovery/loading。 | [E: packages/coding-agent/src/cli/args.ts:47] [E: packages/coding-agent/src/cli/args.ts:207] [E: packages/coding-agent/src/cli/args.ts:325] |
| `--list-models` | 无 | optional next argv search string | `listModels?: string \| true`,默认 unset | 下一 argv 存在且不是 flag/`@file` 时作为 search pattern,否则写 `true`。 | [E: packages/coding-agent/src/cli/args.ts:48] [E: packages/coding-agent/src/cli/args.ts:209] [E: packages/coding-agent/src/cli/args.ts:211] [E: packages/coding-agent/src/cli/args.ts:214] [E: packages/coding-agent/src/cli/args.ts:327] |
| `--tui-mode` | 无 | next argv: `regular`/`fullscreen` | `tuiMode?: TuiMode`,默认 unset | 选择本次 interactive TUI mode;help 文案为 fullscreen (default) or regular。缺值或下一 token 以 `-` 开头、以及非法值都写 error diagnostic。 | [E: packages/coding-agent/src/cli/args.ts:50] [E: packages/coding-agent/src/cli/args.ts:216] [E: packages/coding-agent/src/cli/args.ts:218] [E: packages/coding-agent/src/cli/args.ts:222] [E: packages/coding-agent/src/cli/args.ts:329] |
| `--verbose` | 无 | boolean | `verbose?: boolean`,默认 unset | 强制 verbose startup,覆盖 quietStartup setting。 | [E: packages/coding-agent/src/cli/args.ts:51] [E: packages/coding-agent/src/cli/args.ts:230] [E: packages/coding-agent/src/cli/args.ts:328] |
| `--approve` | `-a` | boolean true | `projectTrustOverride?: boolean`,默认 unset | 本次运行信任 project-local files。package/config 子命令复用同一对 token。 | [E: packages/coding-agent/src/cli/args.ts:52] [E: packages/coding-agent/src/cli/args.ts:232] [E: packages/coding-agent/src/cli/args.ts:330] |
| `--no-approve` | `-na` | boolean false | `projectTrustOverride?: boolean`,默认 unset | 本次运行忽略 project-local files。 | [E: packages/coding-agent/src/cli/args.ts:234] [E: packages/coding-agent/src/cli/args.ts:331] |
| `--offline` | 无 | boolean | `offline?: boolean`,默认 unset | 禁用 startup network operations;help 文案等价描述为 `PI_OFFLINE=1`。`main()` 在 `parseArgs` 前也会看 argv 是否包含 `--offline`。 | [E: packages/coding-agent/src/cli/args.ts:49] [E: packages/coding-agent/src/cli/args.ts:236] [E: packages/coding-agent/src/cli/args.ts:332] [E: packages/coding-agent/src/main.ts:576] |

## 子命令专用旗标(21)

`main()` 先 `runAuthCommand(args)`,再 `handlePackageCommand`,再 `handleConfigCommand`,再 `args[0] === "mcp"` 时 `runMcpCommand(args.slice(1))`,这些路径都不走全局 session runtime [E: packages/coding-agent/src/main.ts:582] [E: packages/coding-agent/src/main.ts:597] [E: packages/coding-agent/src/main.ts:610] [E: packages/coding-agent/src/main.ts:614] [E: packages/coding-agent/src/main.ts:616]。

| option | aliases | 出现在 | 值形态 | 含义 | 证据 |
| --- | --- | --- | --- | --- | --- |
| `--local` | `-l` | `pi install`/`remove`/`uninstall`/`config`;`pi mcp add`/`remove` | flag | 改项目级 settings 或 `.pi/mcp.json`,而不是 `~/.pi/agent/` 全局文件。package parser 只在 install/remove 接受它;config 与 mcp add/remove 各自再解析。 | [E: packages/coding-agent/src/package-manager-cli.ts:268] [E: packages/coding-agent/src/package-manager-cli.ts:289] [E: packages/coding-agent/src/package-manager-cli.ts:409] [E: packages/coding-agent/src/extensions/mcp/cli.ts:52] [E: packages/coding-agent/src/extensions/mcp/cli.ts:130] [E: packages/coding-agent/src/extensions/mcp/cli.ts:288] |
| `--self` | 无 | `pi update` | flag | 只更新 pi 本身(无 target 时的默认)。 | [E: packages/coding-agent/src/package-manager-cli.ts:272] [E: packages/coding-agent/src/package-manager-cli.ts:343] [E: packages/coding-agent/src/package-manager-cli.ts:418] |
| `--extensions` | 无 | `pi update` | flag | 只更新已安装 packages。 | [E: packages/coding-agent/src/package-manager-cli.ts:344] [E: packages/coding-agent/src/package-manager-cli.ts:427] |
| `--all` | 无 | `pi update` | flag | 同时更新 pi 和已安装 packages;不能与 `--self`/`--extensions`/`--models`/`--extension` 或 positional source 组合。 | [E: packages/coding-agent/src/package-manager-cli.ts:346] [E: packages/coding-agent/src/package-manager-cli.ts:445] [E: packages/coding-agent/src/package-manager-cli.ts:509] |
| `--force` | 无 | `pi update` | flag | 即使当前已是 latest 也 reinstall pi。 | [E: packages/coding-agent/src/package-manager-cli.ts:350] [E: packages/coding-agent/src/package-manager-cli.ts:464] |
| `--min-expiry` | 无 | `pi auth print-bearer-token` | duration `(\d+)(ms\|s\|m\|h)` | 要求 OAuth token 剩余寿命;其它 auth 子命令遇到它会抛错。 | [E: packages/coding-agent/src/cli/auth-command.ts:21] [E: packages/coding-agent/src/cli/auth-command.ts:72] [E: packages/coding-agent/src/cli/auth-command.ts:74] [E: packages/coding-agent/src/cli/auth-command.ts:77] |
| `--json` | 无 | `pi auth check`;`pi mcp list` | flag | auth check 把结果打成 JSON;mcp list 以 JSON 打印 server 状态。 | [E: packages/coding-agent/src/cli/auth-command.ts:19] [E: packages/coding-agent/src/cli/auth-command.ts:83] [E: packages/coding-agent/src/cli/auth-command.ts:85] [E: packages/coding-agent/src/extensions/mcp/cli.ts:36] [E: packages/coding-agent/src/extensions/mcp/cli.ts:210] |
| `--credentials` | 无 | `pi auth check` | flag | ready 时额外 emit credential(或并入 JSON)。只允许 `auth check`。 | [E: packages/coding-agent/src/cli/auth-command.ts:19] [E: packages/coding-agent/src/cli/auth-command.ts:83] [E: packages/coding-agent/src/cli/auth-command.ts:86] |
| `--no-refresh` | 无 | `pi auth check` | flag | 不刷新过期 OAuth;默认会 refresh。 | [E: packages/coding-agent/src/cli/auth-command.ts:19] [E: packages/coding-agent/src/cli/auth-command.ts:83] [E: packages/coding-agent/src/cli/auth-command.ts:87] |
| `--url` | 无 | `pi mcp add` | value | streamable HTTP server URL;与 `-- <command>` stdio 形式互斥。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:35] [E: packages/coding-agent/src/extensions/mcp/cli.ts:55] [E: packages/coding-agent/src/extensions/mcp/cli.ts:289] |
| `--env` | 无 | `pi mcp add` (stdio) | repeatable `KEY=VALUE` list | stdio server 环境变量。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:56] [E: packages/coding-agent/src/extensions/mcp/cli.ts:290] |
| `--cwd` | 无 | `pi mcp add` (stdio) | value | stdio server working directory。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:57] [E: packages/coding-agent/src/extensions/mcp/cli.ts:291] |
| `--header` | 无 | `pi mcp add` (HTTP) | repeatable `KEY=VALUE` list | HTTP header。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:58] [E: packages/coding-agent/src/extensions/mcp/cli.ts:292] |
| `--bearer-token-env-var` | 无 | `pi mcp add` (HTTP) | value | 发送 `Authorization: Bearer ${NAME}`。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:59] [E: packages/coding-agent/src/extensions/mcp/cli.ts:293] |
| `--oauth-client-id` | 无 | `pi mcp add` (HTTP) | value | 预注册 OAuth client id。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:61] [E: packages/coding-agent/src/extensions/mcp/cli.ts:294] |
| `--oauth-client-secret` | 无 | `pi mcp add` (HTTP) | value | OAuth client secret(可为 `${NAME}` 或 `!command`)。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:62] [E: packages/coding-agent/src/extensions/mcp/cli.ts:295] |
| `--oauth-callback-port` | 无 | `pi mcp add` (HTTP) | value | 固定 OAuth callback port。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:64] [E: packages/coding-agent/src/extensions/mcp/cli.ts:296] |
| `--oauth-client-name` | 无 | `pi mcp add` (HTTP) | value | 向 OAuth server 注册时发送的 client name。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:66] [E: packages/coding-agent/src/extensions/mcp/cli.ts:297] |
| `--exposure` | 无 | `pi mcp add` | value | `codemode`(default)、`deferred`、`direct` 或 `hidden`。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:68] [E: packages/coding-agent/src/extensions/mcp/cli.ts:298] |
| `--description` | 无 | `pi mcp add` | value | 写入 mcp.json、出现在 system prompt 的 server 说明。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:69] [E: packages/coding-agent/src/extensions/mcp/cli.ts:299] |
| `--timeout` | 无 | `pi mcp login` | seconds,默认 300 | login 等待浏览器的秒数;必须是正数。 | [E: packages/coding-agent/src/extensions/mcp/cli.ts:38] [E: packages/coding-agent/src/extensions/mcp/cli.ts:73] [E: packages/coding-agent/src/extensions/mcp/cli.ts:77] [E: packages/coding-agent/src/extensions/mcp/cli.ts:220] [E: packages/coding-agent/src/extensions/mcp/cli.ts:245] |

## 同名异义(仍只计一次)

`pi update --models` 走 `parsePackageCommand`,把 `--models` 当成“只刷新 model catalogs”,不是全局 `--models` 的 Ctrl+P cycling 列表 [E: packages/coding-agent/src/package-manager-cli.ts:345] [E: packages/coding-agent/src/package-manager-cli.ts:436]。`pi update --extension <source>` 是 `pi update <source>` 的 alias,不是全局 `--extension`/`-e` 的“加载扩展文件” [E: packages/coding-agent/src/package-manager-cli.ts:347] [E: packages/coding-agent/src/package-manager-cli.ts:473] [E: packages/coding-agent/docs/cli.md:277]。

`pi auth` 在剥掉 `--json`/`--credentials`/`--no-refresh`/`--min-expiry` 后,把剩余 argv 交给 `parseArgs(command.args)`,因此 `--provider` 与 `--model` 仍是全局那两项 [E: packages/coding-agent/src/cli/auth-command.ts:90] [E: packages/coding-agent/src/main.ts:150] [E: packages/coding-agent/src/cli/auth-command.ts:99]。

## 子命令入口(不是旗标,不计入 62)

`printHelp()` Commands 区列出:`install <source> [-l]`、`remove <source> [-l]`、`uninstall <source> [-l]`、`update [source|self|pi]`、`list`、`config [-l]`、`auth <command>`、`mcp <command>`,以及 `<command> --help` [E: packages/coding-agent/src/cli/args.ts:280] [E: packages/coding-agent/src/cli/args.ts:281] [E: packages/coding-agent/src/cli/args.ts:287] [E: packages/coding-agent/src/cli/args.ts:288]。`uninstall` 是 `remove` 的 alias [E: packages/coding-agent/src/package-manager-cli.ts:378] [E: packages/coding-agent/src/cli/args.ts:283]。

`pi auth` 子命令是 `print-api-key`、`print-bearer-token`、`check` [E: packages/coding-agent/src/cli/auth-command.ts:51] [E: packages/coding-agent/src/cli/auth-command.ts:54] [E: packages/coding-agent/src/cli/auth-command.ts:56]。`pi mcp` 子命令是 `add`、`remove`、`list`、`login`、`logout` [E: packages/coding-agent/src/extensions/mcp/cli.ts:45] [E: packages/coding-agent/src/extensions/mcp/cli.ts:49] [E: packages/coding-agent/src/extensions/mcp/cli.ts:195]。

## 解析 catch-all 与 positional(不计入 62)

这些是 `parseArgs()` 扫描器的剩余分支,用来解释 argv 去向,不是固定 option 名:

| token | 写入 | 细节 | 证据 |
| --- | --- | --- | --- |
| `--<unknown>=<value>` | `unknownFlags` | unknown long flag 含 `=` 时保存 `name -> value`;主要给 extension flags 使用。 | [E: packages/coding-agent/src/cli/args.ts:240] [E: packages/coding-agent/src/cli/args.ts:243] |
| `--<unknown> <value>` | `unknownFlags` | 后一个 argv 存在且不以 `-` 或 `@` 开头时保存 `name -> next` 并消费 next。 | [E: packages/coding-agent/src/cli/args.ts:245] [E: packages/coding-agent/src/cli/args.ts:247] [E: packages/coding-agent/src/cli/args.ts:248] |
| `--<unknown>` | `unknownFlags` | 无 inline value、无可消费 next 时保存 `name -> true`。 | [E: packages/coding-agent/src/cli/args.ts:250] [E: packages/coding-agent/src/cli/args.ts:251] |
| `-<unknown>` | `diagnostics[]` | 未被 exact alias 捕获的 single-dash token 进入 unknown option error;没有 unknown short extension 机制。 | [E: packages/coding-agent/src/cli/args.ts:254] [E: packages/coding-agent/src/cli/args.ts:255] |
| `@<path>` | `fileArgs[]` | 去掉 leading `@` 后 push;help usage 写作 `[@files...]`。 | [E: packages/coding-agent/src/cli/args.ts:238] [E: packages/coding-agent/src/cli/args.ts:278] |
| `<message>` | `messages[]` | 不以 `-` 开头的普通 argv push 到 initial messages;`--print`/`-p` 也可能提前消费一个 following message。 | [E: packages/coding-agent/src/cli/args.ts:256] [E: packages/coding-agent/src/cli/args.ts:257] |

## Sources

- `packages/coding-agent/src/cli/args.ts`
- `packages/coding-agent/src/cli/auth-command.ts`
- `packages/coding-agent/src/main.ts`
- `packages/coding-agent/src/package-manager-cli.ts`
- `packages/coding-agent/src/extensions/mcp/cli.ts`
- `packages/coding-agent/docs/cli.md`
- `packages/coding-agent/test/suite/regressions/7269-cli-end-of-options.test.ts`

## 相关

- [surface.cli.overview](../surface/cli/overview.md): CLI argv 如何继续影响 package/config commands、runtime 创建、mode dispatch、session 和 initial message。
