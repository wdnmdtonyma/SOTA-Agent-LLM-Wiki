---
id: surface.cli.overview
title: CLI 调用与子命令/模式选择
kind: surface
tier: T1
pkg: coding-agent
source:
 - packages/coding-agent/src/cli/args.ts
 - packages/coding-agent/src/cli/auth-command.ts
 - packages/coding-agent/src/cli/credential-print.ts
 - packages/coding-agent/src/main.ts
 - packages/coding-agent/docs/usage.md
 - packages/coding-agent/test/suite/regressions/7269-cli-end-of-options.test.ts
symbols:
 - parseArgs
 - Args
 - printHelp
 - parseAuthCommand
 - parseCredentialPrintCommand
 - resolveCredentialForPrint
 - resolveAppMode
related:
 - spine.process-lifecycle
 - ref.coding-agent.cli-flags
 - surface.modes.interactive
evidence: explicit
status: verified
updated: ff72faba28
---

> `surface.cli.overview` 描述 `pi` 用户可见 CLI surface: argv 如何被 `parseArgs()` 拆成 `Args`,哪些子命令在 agent runtime 前短路,以及 `resolveAppMode()` 如何选择 interactive / print / json / rpc。

## 能回答的问题

- `pi [options] [@files...] [messages...]` 的用户输入如何映射到 `Args`?
- `--mode json`、`--mode rpc`、`--print`、TTY 状态和 piped stdin 谁决定最终模式?
- `--mode` 非法值是 warning 还是 error,会不会进入 session?
- `install/remove/update/list/config` 这些 package/config commands 是否进入 agent session?
- `--help`、`--list-models`、`--export`、`--version` 这类一次性命令在哪里退出?
- `@file`、普通 messages、unknown extension flags 分别落到 `Args` 的哪个字段?
- `--` end-of-options 如何让以 `-` 开头的 prompt 不再被当成 flag?
- CLI flags 如何影响 model、thinking、tools、resources、project trust 和 session?

## 用户可见入口

用户文档把 CLI 形态写成 `pi [options] [@files...] [messages...]`,并把 package commands、modes、model options、session options、tool options、resource options、other options 和 file arguments 分区说明;Other Options 表含 `--` end-of-options 。

`printHelp()` 使用同一组用户面分区输出 help: usage 写作 `[options] [--] [@files...] [messages...]`;commands 包括 `install`、`remove`、`uninstall`、`update`、`list`、`config`、`auth`,options 包括 provider/model/API key/system prompt/mode/print/session/tools/resources/`--use-theme`/`--tui-mode`/trust/offline/`--`/help/version 等 [E: packages/coding-agent/src/cli/args.ts:261] [E: packages/coding-agent/src/cli/args.ts:275] [E: packages/coding-agent/src/cli/args.ts:277] [E: packages/coding-agent/src/cli/args.ts:284] [E: packages/coding-agent/src/cli/args.ts:287] [E: packages/coding-agent/src/cli/args.ts:319] [E: packages/coding-agent/src/cli/args.ts:325] [E: packages/coding-agent/src/cli/args.ts:329]。

`printHelp()` 还会追加 extension-provided CLI flags: extension flag 的 value marker 由 `flag.type === "string"` 决定,description 优先来自 flag 自身,否则显示 registering extension path [E: packages/coding-agent/src/cli/args.ts:262] [E: packages/coding-agent/src/cli/args.ts:264] [E: packages/coding-agent/src/cli/args.ts:266] [E: packages/coding-agent/src/cli/args.ts:267] [E: packages/coding-agent/src/cli/args.ts:268]。

## Args 数据模型

`Args` 是 CLI surface 的解析结果结构,覆盖 provider/model/apiKey/systemPrompt/thinking/session/model scope/tools/extensions/skills/prompt templates/themes/`useTheme`/context files/list models/offline/`tuiMode`/verbose/project trust 等字段 [E: packages/coding-agent/src/cli/args.ts:13] [E: packages/coding-agent/src/cli/args.ts:44] [E: packages/coding-agent/src/cli/args.ts:45] [E: packages/coding-agent/src/cli/args.ts:50] [E: packages/coding-agent/src/cli/args.ts:51] [E: packages/coding-agent/src/cli/args.ts:52]。

`Args.messages` 保存普通 prompt fragments,`Args.fileArgs` 保存去掉 `@` 前缀后的 file arguments,`Args.unknownFlags` 保存 unknown long flags 以供 extension flags 使用,`Args.diagnostics` 保存 warning/error 级解析诊断 [E: packages/coding-agent/src/cli/args.ts:53] [E: packages/coding-agent/src/cli/args.ts:54] [E: packages/coding-agent/src/cli/args.ts:56] [E: packages/coding-agent/src/cli/args.ts:57]。

`Mode` 类型只允许 `"text" | "json" | "rpc"`,而 app-level mode 还会在 `main.ts` 中派生出 `"print"` 和 `"interactive"` [E: packages/coding-agent/src/cli/args.ts:11] [E: packages/coding-agent/src/main.ts:111] [E: packages/coding-agent/src/main.ts:118] [E: packages/coding-agent/src/main.ts:121]。`--mode` 缺值或后一项以 `-` 开头时报 error `"--mode requires text, json, or rpc"`;值不是这三者时报 `Invalid mode "<value>". Valid values: text, json, rpc`。error 级 diagnostic 让 `main` `process.exit(1)`,所以非法 `--mode` 不会进入 session。[E: packages/coding-agent/src/cli/args.ts:95] [E: packages/coding-agent/src/cli/args.ts:97] [E: packages/coding-agent/src/cli/args.ts:98] [E: packages/coding-agent/src/cli/args.ts:102] [E: packages/coding-agent/src/cli/args.ts:104] [E: packages/coding-agent/src/cli/args.ts:105] [E: packages/coding-agent/src/main.ts:608] [E: packages/coding-agent/src/main.ts:613] [E: packages/coding-agent/src/main.ts:614]

## parseArgs 扫描规则

`parseArgs(args)` 初始化 `messages`、`fileArgs`、`unknownFlags`、`diagnostics`,然后线性扫描 argv [E: packages/coding-agent/src/cli/args.ts:71] [E: packages/coding-agent/src/cli/args.ts:72] [E: packages/coding-agent/src/cli/args.ts:73] [E: packages/coding-agent/src/cli/args.ts:74] [E: packages/coding-agent/src/cli/args.ts:75] [E: packages/coding-agent/src/cli/args.ts:76] [E: packages/coding-agent/src/cli/args.ts:79]。

扫描器先识别 `--` end-of-options:命中后把剩余 argv 全部当 positional,以 `@` 开头的进 `fileArgs`(去掉 leading `@`),其余进 `messages`,然后 `break` 结束解析。因此 `--` 之后的 `-c`、`--provider` 不会再当 flag;regression `#7269` 覆盖 dash-prefixed prompt 与 `--` 后保留 `@file` [E: packages/coding-agent/src/cli/args.ts:82] [E: packages/coding-agent/src/cli/args.ts:83] [E: packages/coding-agent/src/cli/args.ts:84] [E: packages/coding-agent/src/cli/args.ts:85] [E: packages/coding-agent/src/cli/args.ts:87] [E: packages/coding-agent/src/cli/args.ts:90] [E: packages/coding-agent/test/suite/regressions/7269-cli-end-of-options.test.ts:17] [E: packages/coding-agent/test/suite/regressions/7269-cli-end-of-options.test.ts:29]。

常规 flags 大多按固定名字消费后一个 argv: `--provider`、`--model`、`--api-key`、`--system-prompt`、`--session`、`--session-id`、`--fork`、`--session-dir` 都在解析时读取紧随值 [E: packages/coding-agent/src/cli/args.ts:115] [E: packages/coding-agent/src/cli/args.ts:117] [E: packages/coding-agent/src/cli/args.ts:119] [E: packages/coding-agent/src/cli/args.ts:121] [E: packages/coding-agent/src/cli/args.ts:134] [E: packages/coding-agent/src/cli/args.ts:136] [E: packages/coding-agent/src/cli/args.ts:138] [E: packages/coding-agent/src/cli/args.ts:140]。

`--models` 以逗号拆分并 trim,`--tools/-t` 和 `--exclude-tools/-xt` 以逗号拆分、trim 并过滤空项 [E: packages/coding-agent/src/cli/args.ts:141] [E: packages/coding-agent/src/cli/args.ts:142] [E: packages/coding-agent/src/cli/args.ts:147] [E: packages/coding-agent/src/cli/args.ts:148] [E: packages/coding-agent/src/cli/args.ts:149] [E: packages/coding-agent/src/cli/args.ts:150] [E: packages/coding-agent/src/cli/args.ts:151] [E: packages/coding-agent/src/cli/args.ts:152] [E: packages/coding-agent/src/cli/args.ts:153] [E: packages/coding-agent/src/cli/args.ts:154] [E: packages/coding-agent/src/cli/args.ts:155] [E: packages/coding-agent/src/cli/args.ts:156]。

`--thinking` 只接受 `off/minimal/low/medium/high/xhigh/max`;非法值不会退出解析,而是写入 warning 诊断 [E: packages/coding-agent/src/cli/args.ts:60] [E: packages/coding-agent/src/cli/args.ts:62] [E: packages/coding-agent/src/cli/args.ts:157] [E: packages/coding-agent/src/cli/args.ts:159] [E: packages/coding-agent/src/cli/args.ts:160] [E: packages/coding-agent/src/cli/args.ts:162] [E: packages/coding-agent/src/cli/args.ts:164]。

`--print/-p` 设置 `print = true`;如果后一个 argv 不是 `@file` 且不是普通 flag,或者是以 `---` 开头的文本,它会被当作 message 消费 [E: packages/coding-agent/src/cli/args.ts:167] [E: packages/coding-agent/src/cli/args.ts:168] [E: packages/coding-agent/src/cli/args.ts:169] [E: packages/coding-agent/src/cli/args.ts:170] [E: packages/coding-agent/src/cli/args.ts:171] [E: packages/coding-agent/src/cli/args.ts:172]。

以 `@` 开头的 argv 进入 `fileArgs`,普通非 flag argv 进入 `messages`;unknown long flags 支持 `--flag=value`、`--flag value` 和布尔 `--flag`,而 unknown short flag 会产生 error 诊断 [E: packages/coding-agent/src/cli/args.ts:235] [E: packages/coding-agent/src/cli/args.ts:236] [E: packages/coding-agent/src/cli/args.ts:237] [E: packages/coding-agent/src/cli/args.ts:240] [E: packages/coding-agent/src/cli/args.ts:245] [E: packages/coding-agent/src/cli/args.ts:248] [E: packages/coding-agent/src/cli/args.ts:251] [E: packages/coding-agent/src/cli/args.ts:252] [E: packages/coding-agent/src/cli/args.ts:253] [E: packages/coding-agent/src/cli/args.ts:254]。

## 早期一次性命令

`main(args)` 在 `parseArgs` 前先处理 package/config commands: `handlePackageCommand(args, ...)` 命中后按 `process.exitCode` 退出,`handleConfigCommand(args, ...)` 命中后直接返回 [E: packages/coding-agent/src/main.ts:590] [E: packages/coding-agent/src/main.ts:591] [E: packages/coding-agent/src/main.ts:599] [E: packages/coding-agent/src/main.ts:603] [E: packages/coding-agent/src/main.ts:604]。因此 `install/remove/uninstall/update/list/config` 是 CLI bootstrap surface,不是普通 agent turn surface [E: packages/coding-agent/src/cli/args.ts:278] [E: packages/coding-agent/src/cli/args.ts:279] [E: packages/coding-agent/src/cli/args.ts:280] [E: packages/coding-agent/src/cli/args.ts:281] [E: packages/coding-agent/src/cli/args.ts:282] [E: packages/coding-agent/src/cli/args.ts:283] [I]。

`--offline` 是特殊早期环境开关: `main` 在 `parseArgs` 前检查 argv 或 `PI_OFFLINE`,并设置 `PI_OFFLINE=1` 与 `PI_SKIP_VERSION_CHECK=1` [E: packages/coding-agent/src/main.ts:566] [E: packages/coding-agent/src/main.ts:569] [E: packages/coding-agent/src/main.ts:570] [E: packages/coding-agent/src/main.ts:571] [E: packages/coding-agent/src/main.ts:572]。

`pi auth` 也是 normal runtime 前短路的一次性 command surface,由 `parseAuthCommand()` 识别 `check`、`print-api-key` 与 `print-bearer-token` [E: packages/coding-agent/src/cli/auth-command.ts:5] [E: packages/coding-agent/src/cli/auth-command.ts:48] [E: packages/coding-agent/src/cli/auth-command.ts:52] [E: packages/coding-agent/src/main.ts:132] [E: packages/coding-agent/src/main.ts:140]。`auth check` 要求 `--provider` 或 `--model`,可加 `--json`、`--credentials`、`--no-refresh`;默认会 refresh 过期 OAuth,成功 stdout 写 `ready` 或 JSON,exit code `ready=0` / `not_ready=1` / `invalid=2` [E: packages/coding-agent/src/cli/auth-command.ts:19] [E: packages/coding-agent/src/cli/auth-command.ts:83] [E: packages/coding-agent/src/cli/auth-command.ts:108] [E: packages/coding-agent/src/main.ts:172] [E: packages/coding-agent/src/main.ts:197] [E: packages/coding-agent/src/main.ts:201]。`print-api-key` 与 `print-bearer-token` 都要求 `--provider` 或 `--model`;bearer token 额外接受带 `ms/s/m/h` 单位的 `--min-expiry` [E: packages/coding-agent/src/cli/auth-command.ts:20] [E: packages/coding-agent/src/cli/auth-command.ts:72] [E: packages/coding-agent/src/cli/auth-command.ts:114]。auth commands 拒绝 `--api-key`、message、`@file` 和 extension unknown flags [E: packages/coding-agent/src/cli/auth-command.ts:101] [E: packages/coding-agent/src/cli/auth-command.ts:105]。

`runAuthCommand()` 在 `main()` 里最先短路(在 `handlePackageCommand` / `handleConfigCommand` 之前);非 check 路径用禁用 model network 的 `ModelRuntime` 把 credential 单独写到 stdout,check 路径走 `checkProviderAuth()` [E: packages/coding-agent/src/main.ts:132] [E: packages/coding-agent/src/main.ts:575] [E: packages/coding-agent/src/main.ts:590] [E: packages/coding-agent/src/main.ts:603] [E: packages/coding-agent/src/main.ts:161] [E: packages/coding-agent/src/main.ts:171] [E: packages/coding-agent/src/main.ts:181]。

`--version` 在 `parseArgs` 后立即打印 `VERSION` 并退出;`--export <file>` 在 mode/session/runtime 选择前调用 `exportFromFile(parsed.export, outputPath)`,其中 output path 来自第一个 parsed message [E: packages/coding-agent/src/main.ts:607] [E: packages/coding-agent/src/main.ts:619] [E: packages/coding-agent/src/main.ts:620] [E: packages/coding-agent/src/main.ts:621] [E: packages/coding-agent/src/main.ts:624] [E: packages/coding-agent/src/main.ts:627] [E: packages/coding-agent/src/main.ts:628] [E: packages/coding-agent/src/main.ts:634] [E: packages/coding-agent/src/main.ts:635]。

`--help` 与 `--list-models` 不在 runtime 前退出: `main` 创建 runtime 后,help 从 loaded extensions 收集 flags 再调用 `printHelp(extensionFlags)`,listModels 使用 runtime 的 `modelRegistry` [E: packages/coding-agent/src/main.ts:849] [E: packages/coding-agent/src/main.ts:855] [E: packages/coding-agent/src/main.ts:851] [E: packages/coding-agent/src/main.ts:861] [E: packages/coding-agent/src/main.ts:863] [E: packages/coding-agent/src/main.ts:865] [E: packages/coding-agent/src/main.ts:866] [E: packages/coding-agent/src/main.ts:870] [E: packages/coding-agent/src/main.ts:867]。

## 模式选择

用户文档把 default 列为 interactive mode,`-p/--print` 列为 print response and exit,`--mode json` 列为 JSON lines events,`--mode rpc` 列为 stdin/stdout RPC 。

`resolveAppMode(parsed, stdinIsTTY, stdoutIsTTY)` 的真实优先级是: `parsed.mode === "rpc"` 返回 `rpc`;`parsed.mode === "json"` 返回 `json`;`parsed.print || !stdinIsTTY || !stdoutIsTTY` 返回 `print`;否则返回 `interactive` [E: packages/coding-agent/src/main.ts:111] [E: packages/coding-agent/src/main.ts:112] [E: packages/coding-agent/src/main.ts:113] [E: packages/coding-agent/src/main.ts:115] [E: packages/coding-agent/src/main.ts:116] [E: packages/coding-agent/src/main.ts:118] [E: packages/coding-agent/src/main.ts:119] [E: packages/coding-agent/src/main.ts:121]。

`json` 是 app mode,但执行器复用 print path: `toPrintOutputMode(appMode)` 把 `json` 映射为 `"json"`,其他非 RPC print path 映射为 `"text"`,最后 `runPrintMode(runtime, { mode: toPrintOutputMode(appMode), ... })` 执行 [E: packages/coding-agent/src/main.ts:124] [E: packages/coding-agent/src/main.ts:125] [E: packages/coding-agent/src/main.ts:972] [E: packages/coding-agent/src/main.ts:973]。

RPC mode 有两个输入约束: 用户文档定义 RPC over stdin/stdout,`main` 不为 RPC 读取 piped stdin;并且 `--mode rpc` 搭配 `@file` 会报错退出 [E: packages/coding-agent/src/main.ts:644] [E: packages/coding-agent/src/main.ts:645] [E: packages/coding-agent/src/main.ts:646] [E: packages/coding-agent/src/main.ts:879]。

非 RPC mode 会读取 piped stdin;如果最初是 interactive 但读到了 stdin 内容,`main` 会把 app mode 改成 print [E: packages/coding-agent/src/main.ts:879] [E: packages/coding-agent/src/main.ts:880] [E: packages/coding-agent/src/main.ts:881] [E: packages/coding-agent/src/main.ts:882]。这意味着 `resolveAppMode()` 的 TTY 判断不是最终模式的唯一输入,piped stdin 的实际内容会在 runtime 创建后再做一次降级 [I]。

## CLI 对 runtime 的影响

`main` 在解析后先打印 diagnostics:error 级诊断会退出,warning 级诊断只打印 [E: packages/coding-agent/src/main.ts:607] [E: packages/coding-agent/src/main.ts:608] [E: packages/coding-agent/src/main.ts:611] [E: packages/coding-agent/src/main.ts:613] [E: packages/coding-agent/src/main.ts:614]。

session 相关 flags 在进入 mode dispatch 前决定 session manager:`--no-session`、help、listModels 使用 in-memory session;`--fork`、`--session`、`--resume`、`--continue`、`--session-id` 分别进入 fork/open/select/continue/open-or-create 分支 [E: packages/coding-agent/src/main.ts:357] [E: packages/coding-agent/src/main.ts:363] [E: packages/coding-agent/src/main.ts:367] [E: packages/coding-agent/src/main.ts:390] [E: packages/coding-agent/src/main.ts:414] [E: packages/coding-agent/src/main.ts:431] [E: packages/coding-agent/src/main.ts:435] [E: packages/coding-agent/src/main.ts:447]。

resource flags 被 resolve 为 cwd-relative paths 后交给 resource loader options:`--extension/-e`、`--skill`、`--prompt-template`、`--theme` 添加显式资源路径,`--no-extensions`、`--no-skills`、`--no-prompt-templates`、`--no-themes`、`--no-context-files` 禁用对应 discovery/loading [E: packages/coding-agent/src/main.ts:713] [E: packages/coding-agent/src/main.ts:714] [E: packages/coding-agent/src/main.ts:715] [E: packages/coding-agent/src/main.ts:716] [E: packages/coding-agent/src/main.ts:766] [E: packages/coding-agent/src/main.ts:767] [E: packages/coding-agent/src/main.ts:768] [E: packages/coding-agent/src/main.ts:769] [E: packages/coding-agent/src/main.ts:770] [E: packages/coding-agent/src/main.ts:771] [E: packages/coding-agent/src/main.ts:772] [E: packages/coding-agent/src/main.ts:773] [E: packages/coding-agent/src/main.ts:774] [E: packages/coding-agent/src/main.ts:775]。

unknown long flags 从 `Args.unknownFlags` 传给 `createAgentSessionServices({ extensionFlagValues })`,因此它们是 extension-visible CLI input,不是 built-in `Args` 字段 [E: packages/coding-agent/src/cli/args.ts:237] [E: packages/coding-agent/src/cli/args.ts:240] [E: packages/coding-agent/src/cli/args.ts:245] [E: packages/coding-agent/src/cli/args.ts:248] [E: packages/coding-agent/src/main.ts:736] [E: packages/coding-agent/src/main.ts:741] [I]。

model/tool flags 在 `buildSessionOptions` 里变成 `CreateAgentSessionOptions`: `--model`/`--provider` 解析目标 model,`--thinking` 覆盖 thinking level,`--no-tools` 设置 `noTools = "all"`,`--no-builtin-tools` 设置 `noTools = "builtin"`,`--tools` 和 `--exclude-tools` 分别复制到 allowlist/denylist [E: packages/coding-agent/src/main.ts:450] [E: packages/coding-agent/src/main.ts:461] [E: packages/coding-agent/src/main.ts:468] [E: packages/coding-agent/src/main.ts:469] [E: packages/coding-agent/src/main.ts:470] [E: packages/coding-agent/src/main.ts:471] [E: packages/coding-agent/src/main.ts:472] [E: packages/coding-agent/src/main.ts:515] [E: packages/coding-agent/src/main.ts:516] [E: packages/coding-agent/src/main.ts:533] [E: packages/coding-agent/src/main.ts:534] [E: packages/coding-agent/src/main.ts:535] [E: packages/coding-agent/src/main.ts:536] [E: packages/coding-agent/src/main.ts:538] [E: packages/coding-agent/src/main.ts:539] [E: packages/coding-agent/src/main.ts:541] [E: packages/coding-agent/src/main.ts:542]。

`--tui-mode regular|fullscreen` 写入 `Args.tuiMode`,并传给 `InteractiveMode`;缺值或非法值产生 error diagnostic。旧名 `--ui-mode` 与隐藏 alias `--alt` 已删除 [E: packages/coding-agent/src/cli/args.ts:50] [E: packages/coding-agent/src/cli/args.ts:213] [E: packages/coding-agent/src/cli/args.ts:215] [E: packages/coding-agent/src/cli/args.ts:325] [E: packages/coding-agent/src/main.ts:947]。

`--use-theme <name[/name]>` 写入 `Args.useTheme`;interactive 启动时用 `applyOverrides({ theme })` 覆盖本次 theme,并作为 `InteractiveMode` 的 `initialThemeSetting`。它不持久化 settings [E: packages/coding-agent/src/cli/args.ts:45] [E: packages/coding-agent/src/cli/args.ts:190] [E: packages/coding-agent/src/cli/args.ts:319] [E: packages/coding-agent/src/main.ts:666] [E: packages/coding-agent/src/main.ts:667] [E: packages/coding-agent/src/main.ts:948]。

`--api-key` 只会在已解析出 session model 时写入 runtime auth storage;没有 model 时产生 error 诊断,提示必须通过 `--model`、`--provider/--model` 或 `--models` 指定模型 [E: packages/coding-agent/src/main.ts:814] [E: packages/coding-agent/src/main.ts:815] [E: packages/coding-agent/src/main.ts:818] [E: packages/coding-agent/src/main.ts:762]。

## 初始输入与 dispatch

`prepareInitialMessage(parsed, autoResizeImages, stdinContent)` 在没有 `@file` 时直接调用 `buildInitialMessage({ parsed, stdinContent })`;有 `@file` 时先 `processFileArguments(parsed.fileArgs, { autoResizeImages })`,再把 file text/images 与 stdinContent 一起交给 initial-message builder [E: packages/coding-agent/src/main.ts:210] [E: packages/coding-agent/src/main.ts:217] [E: packages/coding-agent/src/main.ts:218] [E: packages/coding-agent/src/main.ts:222] [E: packages/coding-agent/src/main.ts:223] [E: packages/coding-agent/src/main.ts:225] [E: packages/coding-agent/src/main.ts:226] [E: packages/coding-agent/src/main.ts:227]。

最终 mode dispatch 是三分支: `rpc` 调用 `runRpcMode(runtime)`;`interactive` 创建 `InteractiveMode(runtime, ...)` 并 `run()`;其余 print/json path 调用 `runPrintMode(runtime, { mode, messages, initialMessage, initialImages })` [E: packages/coding-agent/src/main.ts:934] [E: packages/coding-agent/src/main.ts:936] [E: packages/coding-agent/src/main.ts:937] [E: packages/coding-agent/src/main.ts:938] [E: packages/coding-agent/src/main.ts:943] [E: packages/coding-agent/src/main.ts:944] [E: packages/coding-agent/src/main.ts:945] [E: packages/coding-agent/src/main.ts:946] [E: packages/coding-agent/src/main.ts:969] [E: packages/coding-agent/src/main.ts:972] [E: packages/coding-agent/src/main.ts:973] [E: packages/coding-agent/src/main.ts:974] [E: packages/coding-agent/src/main.ts:975] [E: packages/coding-agent/src/main.ts:976]。

## Gotcha

- `--mode text` 只被 `parseArgs` 作为合法 `Mode` 接收;`resolveAppMode()` 没有 `parsed.mode === "text"` 分支,所以它仍会按 `--print` / TTY 规则落到 print 或 interactive。`--mode html` 这类非法值则是 error diagnostic + `process.exit(1)`,不会 silent fallback。[E: packages/coding-agent/src/cli/args.ts:95] [E: packages/coding-agent/src/cli/args.ts:102] [E: packages/coding-agent/src/cli/args.ts:109] [E: packages/coding-agent/src/main.ts:111] [E: packages/coding-agent/src/main.ts:613] [E: packages/coding-agent/src/main.ts:614] [I]。
- `--list-models` 可带可不带 search pattern: 后一个 argv 只要不是 flag 或 `@file` 就会被消费为 search string,否则 `listModels = true` [E: packages/coding-agent/src/cli/args.ts:206] [E: packages/coding-agent/src/cli/args.ts:208] [E: packages/coding-agent/src/cli/args.ts:209] [E: packages/coding-agent/src/cli/args.ts:211]。
- `--name` 缺值会在 `parseArgs` 阶段产生 error;空白值则在 `main` 阶段 trim 后报 `--name requires a non-empty value` [E: packages/coding-agent/src/cli/args.ts:125] [E: packages/coding-agent/src/cli/args.ts:129] [E: packages/coding-agent/src/main.ts:694] [E: packages/coding-agent/src/main.ts:695] [E: packages/coding-agent/src/main.ts:697]。
- `--fork` 不能与 `--session`、`--continue`、`--resume`、`--no-session` 合用;`--session-id` 不能与 `--session`、`--continue`、`--resume` 合用 [E: packages/coding-agent/src/main.ts:298] [E: packages/coding-agent/src/main.ts:301] [E: packages/coding-agent/src/main.ts:309] [E: packages/coding-agent/src/main.ts:314] [E: packages/coding-agent/src/main.ts:317] [E: packages/coding-agent/src/main.ts:324]。

## 跨包关系

`spine.process-lifecycle` 是端到端 process flow:它从 shell argv 继续展开 session/runtime/mode dispatch;本节点只 owns 用户可见 CLI surface、`Args` 字段和 mode selection 规则 [E: packages/coding-agent/src/main.ts:566] [E: packages/coding-agent/src/cli/args.ts:71] [I]。

`ref.coding-agent.cli-flags` 应是完整 CLI flag catalog;本节点只按功能区解释 flag classes,不逐一枚举所有实例 [I]。

`surface.modes.interactive` 应 owns `InteractiveMode` 内部 UI 和 turn orchestration;本节点只证明 interactive 是 CLI dispatch 的一个目标,实际创建点是 `new InteractiveMode(runtime, ...)` [E: packages/coding-agent/src/main.ts:937] [E: packages/coding-agent/src/main.ts:938] [I]。

## Sources

- packages/coding-agent/src/cli/args.ts
- packages/coding-agent/src/cli/auth-command.ts
- packages/coding-agent/src/cli/credential-print.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/docs/usage.md
- packages/coding-agent/test/suite/regressions/7269-cli-end-of-options.test.ts

## 相关

- [spine.process-lifecycle](../../spine/process-lifecycle.md): 从 shell argv 到 runtime/session/mode dispatch 的端到端生命周期。
- [ref.coding-agent.cli-flags](../../reference/cli-flags.md): CLI flags 完整目录与逐项字段。
- [surface.modes.interactive](../modes/interactive.md): interactive mode 的 TUI 和用户 turn 入口。
