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
updated: 9767ba275f
---

> `surface.cli.overview` 描述 `pi` 用户可见 CLI surface: argv 如何被 `parseArgs()` 拆成 `Args`,哪些子命令在 agent runtime 前短路,以及 `resolveAppMode()` 如何选择 interactive / print / json / rpc。

## 能回答的问题

- `pi [options] [@files...] [messages...]` 的用户输入如何映射到 `Args`?
- `--mode json`、`--mode rpc`、`--print`、TTY 状态和 piped stdin 谁决定最终模式?
- `install/remove/update/list/config` 这些 package/config commands 是否进入 agent session?
- `--help`、`--list-models`、`--export`、`--version` 这类一次性命令在哪里退出?
- `@file`、普通 messages、unknown extension flags 分别落到 `Args` 的哪个字段?
- `--` end-of-options 如何让以 `-` 开头的 prompt 不再被当成 flag?
- CLI flags 如何影响 model、thinking、tools、resources、project trust 和 session?

## 用户可见入口

用户文档把 CLI 形态写成 `pi [options] [@files...] [messages...]`,并把 package commands、modes、model options、session options、tool options、resource options、other options 和 file arguments 分区说明;Other Options 表含 `--` end-of-options [E: packages/coding-agent/docs/usage.md:146] [E: packages/coding-agent/docs/usage.md:149] [E: packages/coding-agent/docs/usage.md:169] [E: packages/coding-agent/docs/usage.md:185] [E: packages/coding-agent/docs/usage.md:196] [E: packages/coding-agent/docs/usage.md:208] [E: packages/coding-agent/docs/usage.md:219] [E: packages/coding-agent/docs/usage.md:239] [E: packages/coding-agent/docs/usage.md:250] [E: packages/coding-agent/docs/usage.md:258]。

`printHelp()` 使用同一组用户面分区输出 help: usage 写作 `[options] [--] [@files...] [messages...]`;commands 包括 `install`、`remove`、`uninstall`、`update`、`list`、`config`、`auth`,options 包括 provider/model/API key/system prompt/mode/print/session/tools/resources/`--use-theme`/`--tui-mode`/trust/offline/`--`/help/version 等 [E: packages/coding-agent/src/cli/args.ts:251] [E: packages/coding-agent/src/cli/args.ts:265] [E: packages/coding-agent/src/cli/args.ts:267] [E: packages/coding-agent/src/cli/args.ts:274] [E: packages/coding-agent/src/cli/args.ts:277] [E: packages/coding-agent/src/cli/args.ts:309] [E: packages/coding-agent/src/cli/args.ts:315] [E: packages/coding-agent/src/cli/args.ts:319]。

`printHelp()` 还会追加 extension-provided CLI flags: extension flag 的 value marker 由 `flag.type === "string"` 决定,description 优先来自 flag 自身,否则显示 registering extension path [E: packages/coding-agent/src/cli/args.ts:252] [E: packages/coding-agent/src/cli/args.ts:254] [E: packages/coding-agent/src/cli/args.ts:256] [E: packages/coding-agent/src/cli/args.ts:257] [E: packages/coding-agent/src/cli/args.ts:258]。

## Args 数据模型

`Args` 是 CLI surface 的解析结果结构,覆盖 provider/model/apiKey/systemPrompt/thinking/session/model scope/tools/extensions/skills/prompt templates/themes/`useTheme`/context files/list models/offline/`tuiMode`/verbose/project trust 等字段 [E: packages/coding-agent/src/cli/args.ts:13] [E: packages/coding-agent/src/cli/args.ts:44] [E: packages/coding-agent/src/cli/args.ts:45] [E: packages/coding-agent/src/cli/args.ts:50] [E: packages/coding-agent/src/cli/args.ts:51] [E: packages/coding-agent/src/cli/args.ts:52]。

`Args.messages` 保存普通 prompt fragments,`Args.fileArgs` 保存去掉 `@` 前缀后的 file arguments,`Args.unknownFlags` 保存 unknown long flags 以供 extension flags 使用,`Args.diagnostics` 保存 warning/error 级解析诊断 [E: packages/coding-agent/src/cli/args.ts:53] [E: packages/coding-agent/src/cli/args.ts:54] [E: packages/coding-agent/src/cli/args.ts:56] [E: packages/coding-agent/src/cli/args.ts:57]。

`Mode` 类型只允许 `"text" | "json" | "rpc"`,而 app-level mode 还会在 `main.ts` 中派生出 `"print"` 和 `"interactive"` [E: packages/coding-agent/src/cli/args.ts:11] [E: packages/coding-agent/src/main.ts:111] [E: packages/coding-agent/src/main.ts:118] [E: packages/coding-agent/src/main.ts:121]。

## parseArgs 扫描规则

`parseArgs(args)` 初始化 `messages`、`fileArgs`、`unknownFlags`、`diagnostics`,然后线性扫描 argv [E: packages/coding-agent/src/cli/args.ts:71] [E: packages/coding-agent/src/cli/args.ts:72] [E: packages/coding-agent/src/cli/args.ts:73] [E: packages/coding-agent/src/cli/args.ts:74] [E: packages/coding-agent/src/cli/args.ts:75] [E: packages/coding-agent/src/cli/args.ts:76] [E: packages/coding-agent/src/cli/args.ts:79]。

扫描器先识别 `--` end-of-options:命中后把剩余 argv 全部当 positional,以 `@` 开头的进 `fileArgs`(去掉 leading `@`),其余进 `messages`,然后 `break` 结束解析。因此 `--` 之后的 `-c`、`--provider` 不会再当 flag;regression `#7269` 覆盖 dash-prefixed prompt 与 `--` 后保留 `@file` [E: packages/coding-agent/src/cli/args.ts:82] [E: packages/coding-agent/src/cli/args.ts:83] [E: packages/coding-agent/src/cli/args.ts:84] [E: packages/coding-agent/src/cli/args.ts:85] [E: packages/coding-agent/src/cli/args.ts:87] [E: packages/coding-agent/src/cli/args.ts:90] [E: packages/coding-agent/docs/usage.md:250] [E: packages/coding-agent/test/suite/regressions/7269-cli-end-of-options.test.ts:17] [E: packages/coding-agent/test/suite/regressions/7269-cli-end-of-options.test.ts:29]。

常规 flags 大多按固定名字消费后一个 argv: `--provider`、`--model`、`--api-key`、`--system-prompt`、`--session`、`--session-id`、`--fork`、`--session-dir` 都在解析时读取紧随值 [E: packages/coding-agent/src/cli/args.ts:105] [E: packages/coding-agent/src/cli/args.ts:107] [E: packages/coding-agent/src/cli/args.ts:109] [E: packages/coding-agent/src/cli/args.ts:111] [E: packages/coding-agent/src/cli/args.ts:124] [E: packages/coding-agent/src/cli/args.ts:126] [E: packages/coding-agent/src/cli/args.ts:128] [E: packages/coding-agent/src/cli/args.ts:130]。

`--models` 以逗号拆分并 trim,`--tools/-t` 和 `--exclude-tools/-xt` 以逗号拆分、trim 并过滤空项 [E: packages/coding-agent/src/cli/args.ts:131] [E: packages/coding-agent/src/cli/args.ts:132] [E: packages/coding-agent/src/cli/args.ts:137] [E: packages/coding-agent/src/cli/args.ts:138] [E: packages/coding-agent/src/cli/args.ts:139] [E: packages/coding-agent/src/cli/args.ts:140] [E: packages/coding-agent/src/cli/args.ts:141] [E: packages/coding-agent/src/cli/args.ts:142] [E: packages/coding-agent/src/cli/args.ts:143] [E: packages/coding-agent/src/cli/args.ts:144] [E: packages/coding-agent/src/cli/args.ts:145] [E: packages/coding-agent/src/cli/args.ts:146]。

`--thinking` 只接受 `off/minimal/low/medium/high/xhigh/max`;非法值不会退出解析,而是写入 warning 诊断 [E: packages/coding-agent/src/cli/args.ts:60] [E: packages/coding-agent/src/cli/args.ts:62] [E: packages/coding-agent/src/cli/args.ts:147] [E: packages/coding-agent/src/cli/args.ts:149] [E: packages/coding-agent/src/cli/args.ts:150] [E: packages/coding-agent/src/cli/args.ts:152] [E: packages/coding-agent/src/cli/args.ts:154]。

`--print/-p` 设置 `print = true`;如果后一个 argv 不是 `@file` 且不是普通 flag,或者是以 `---` 开头的文本,它会被当作 message 消费 [E: packages/coding-agent/src/cli/args.ts:157] [E: packages/coding-agent/src/cli/args.ts:158] [E: packages/coding-agent/src/cli/args.ts:159] [E: packages/coding-agent/src/cli/args.ts:160] [E: packages/coding-agent/src/cli/args.ts:161] [E: packages/coding-agent/src/cli/args.ts:162]。

以 `@` 开头的 argv 进入 `fileArgs`,普通非 flag argv 进入 `messages`;unknown long flags 支持 `--flag=value`、`--flag value` 和布尔 `--flag`,而 unknown short flag 会产生 error 诊断 [E: packages/coding-agent/src/cli/args.ts:225] [E: packages/coding-agent/src/cli/args.ts:226] [E: packages/coding-agent/src/cli/args.ts:227] [E: packages/coding-agent/src/cli/args.ts:230] [E: packages/coding-agent/src/cli/args.ts:235] [E: packages/coding-agent/src/cli/args.ts:238] [E: packages/coding-agent/src/cli/args.ts:241] [E: packages/coding-agent/src/cli/args.ts:242] [E: packages/coding-agent/src/cli/args.ts:243] [E: packages/coding-agent/src/cli/args.ts:244]。

## 早期一次性命令

`main(args)` 在 `parseArgs` 前先处理 package/config commands: `handlePackageCommand(args, ...)` 命中后按 `process.exitCode` 退出,`handleConfigCommand(args, ...)` 命中后直接返回 [E: packages/coding-agent/src/main.ts:586] [E: packages/coding-agent/src/main.ts:587] [E: packages/coding-agent/src/main.ts:595] [E: packages/coding-agent/src/main.ts:599] [E: packages/coding-agent/src/main.ts:600]。因此 `install/remove/uninstall/update/list/config` 是 CLI bootstrap surface,不是普通 agent turn surface [E: packages/coding-agent/src/cli/args.ts:268] [E: packages/coding-agent/src/cli/args.ts:269] [E: packages/coding-agent/src/cli/args.ts:270] [E: packages/coding-agent/src/cli/args.ts:271] [E: packages/coding-agent/src/cli/args.ts:272] [E: packages/coding-agent/src/cli/args.ts:273] [I]。

`--offline` 是特殊早期环境开关: `main` 在 `parseArgs` 前检查 argv 或 `PI_OFFLINE`,并设置 `PI_OFFLINE=1` 与 `PI_SKIP_VERSION_CHECK=1` [E: packages/coding-agent/src/main.ts:562] [E: packages/coding-agent/src/main.ts:565] [E: packages/coding-agent/src/main.ts:566] [E: packages/coding-agent/src/main.ts:567] [E: packages/coding-agent/src/main.ts:568]。

`pi auth` 也是 normal runtime 前短路的一次性 command surface,由 `parseAuthCommand()` 识别 `check`、`print-api-key` 与 `print-bearer-token` [E: packages/coding-agent/src/cli/auth-command.ts:5] [E: packages/coding-agent/src/cli/auth-command.ts:48] [E: packages/coding-agent/src/cli/auth-command.ts:52] [E: packages/coding-agent/src/main.ts:132] [E: packages/coding-agent/src/main.ts:140]。`auth check` 要求 `--provider` 或 `--model`,可加 `--json`、`--credentials`、`--no-refresh`;默认会 refresh 过期 OAuth,成功 stdout 写 `ready` 或 JSON,exit code `ready=0` / `not_ready=1` / `invalid=2` [E: packages/coding-agent/src/cli/auth-command.ts:19] [E: packages/coding-agent/src/cli/auth-command.ts:83] [E: packages/coding-agent/src/cli/auth-command.ts:108] [E: packages/coding-agent/src/main.ts:172] [E: packages/coding-agent/src/main.ts:197] [E: packages/coding-agent/src/main.ts:201]。`print-api-key` 与 `print-bearer-token` 都要求 `--provider` 或 `--model`;bearer token 额外接受带 `ms/s/m/h` 单位的 `--min-expiry` [E: packages/coding-agent/src/cli/auth-command.ts:20] [E: packages/coding-agent/src/cli/auth-command.ts:72] [E: packages/coding-agent/src/cli/auth-command.ts:114]。auth commands 拒绝 `--api-key`、message、`@file` 和 extension unknown flags [E: packages/coding-agent/src/cli/auth-command.ts:101] [E: packages/coding-agent/src/cli/auth-command.ts:105]。

`runAuthCommand()` 在 `main()` 里最先短路(在 `handlePackageCommand` / `handleConfigCommand` 之前);非 check 路径用禁用 model network 的 `ModelRuntime` 把 credential 单独写到 stdout,check 路径走 `checkProviderAuth()` [E: packages/coding-agent/src/main.ts:132] [E: packages/coding-agent/src/main.ts:571] [E: packages/coding-agent/src/main.ts:586] [E: packages/coding-agent/src/main.ts:599] [E: packages/coding-agent/src/main.ts:161] [E: packages/coding-agent/src/main.ts:171] [E: packages/coding-agent/src/main.ts:181]。

`--version` 在 `parseArgs` 后立即打印 `VERSION` 并退出;`--export <file>` 在 mode/session/runtime 选择前调用 `exportFromFile(parsed.export, outputPath)`,其中 output path 来自第一个 parsed message [E: packages/coding-agent/src/main.ts:603] [E: packages/coding-agent/src/main.ts:615] [E: packages/coding-agent/src/main.ts:616] [E: packages/coding-agent/src/main.ts:617] [E: packages/coding-agent/src/main.ts:620] [E: packages/coding-agent/src/main.ts:623] [E: packages/coding-agent/src/main.ts:624] [E: packages/coding-agent/src/main.ts:630] [E: packages/coding-agent/src/main.ts:631]。

`--help` 与 `--list-models` 不在 runtime 前退出: `main` 创建 runtime 后,help 从 loaded extensions 收集 flags 再调用 `printHelp(extensionFlags)`,listModels 使用 runtime 的 `modelRegistry` [E: packages/coding-agent/src/main.ts:841] [E: packages/coding-agent/src/main.ts:847] [E: packages/coding-agent/src/main.ts:843] [E: packages/coding-agent/src/main.ts:853] [E: packages/coding-agent/src/main.ts:855] [E: packages/coding-agent/src/main.ts:857] [E: packages/coding-agent/src/main.ts:858] [E: packages/coding-agent/src/main.ts:862] [E: packages/coding-agent/src/main.ts:859]。

## 模式选择

用户文档把 default 列为 interactive mode,`-p/--print` 列为 print response and exit,`--mode json` 列为 JSON lines events,`--mode rpc` 列为 stdin/stdout RPC [E: packages/coding-agent/docs/usage.md:169] [E: packages/coding-agent/docs/usage.md:173] [E: packages/coding-agent/docs/usage.md:174] [E: packages/coding-agent/docs/usage.md:175] [E: packages/coding-agent/docs/usage.md:176]。

`resolveAppMode(parsed, stdinIsTTY, stdoutIsTTY)` 的真实优先级是: `parsed.mode === "rpc"` 返回 `rpc`;`parsed.mode === "json"` 返回 `json`;`parsed.print || !stdinIsTTY || !stdoutIsTTY` 返回 `print`;否则返回 `interactive` [E: packages/coding-agent/src/main.ts:111] [E: packages/coding-agent/src/main.ts:112] [E: packages/coding-agent/src/main.ts:113] [E: packages/coding-agent/src/main.ts:115] [E: packages/coding-agent/src/main.ts:116] [E: packages/coding-agent/src/main.ts:118] [E: packages/coding-agent/src/main.ts:119] [E: packages/coding-agent/src/main.ts:121]。

`json` 是 app mode,但执行器复用 print path: `toPrintOutputMode(appMode)` 把 `json` 映射为 `"json"`,其他非 RPC print path 映射为 `"text"`,最后 `runPrintMode(runtime, { mode: toPrintOutputMode(appMode), ... })` 执行 [E: packages/coding-agent/src/main.ts:124] [E: packages/coding-agent/src/main.ts:125] [E: packages/coding-agent/src/main.ts:968] [E: packages/coding-agent/src/main.ts:969]。

RPC mode 有两个输入约束: 用户文档定义 RPC over stdin/stdout,`main` 不为 RPC 读取 piped stdin;并且 `--mode rpc` 搭配 `@file` 会报错退出 [E: packages/coding-agent/docs/usage.md:176] [E: packages/coding-agent/src/main.ts:640] [E: packages/coding-agent/src/main.ts:641] [E: packages/coding-agent/src/main.ts:642] [E: packages/coding-agent/src/main.ts:871]。

非 RPC mode 会读取 piped stdin;如果最初是 interactive 但读到了 stdin 内容,`main` 会把 app mode 改成 print [E: packages/coding-agent/src/main.ts:871] [E: packages/coding-agent/src/main.ts:872] [E: packages/coding-agent/src/main.ts:873] [E: packages/coding-agent/src/main.ts:874]。这意味着 `resolveAppMode()` 的 TTY 判断不是最终模式的唯一输入,piped stdin 的实际内容会在 runtime 创建后再做一次降级 [I]。

## CLI 对 runtime 的影响

`main` 在解析后先打印 diagnostics:error 级诊断会退出,warning 级诊断只打印 [E: packages/coding-agent/src/main.ts:603] [E: packages/coding-agent/src/main.ts:604] [E: packages/coding-agent/src/main.ts:607] [E: packages/coding-agent/src/main.ts:609] [E: packages/coding-agent/src/main.ts:610]。

session 相关 flags 在进入 mode dispatch 前决定 session manager:`--no-session`、help、listModels 使用 in-memory session;`--fork`、`--session`、`--resume`、`--continue`、`--session-id` 分别进入 fork/open/select/continue/open-or-create 分支 [E: packages/coding-agent/src/main.ts:353] [E: packages/coding-agent/src/main.ts:359] [E: packages/coding-agent/src/main.ts:363] [E: packages/coding-agent/src/main.ts:386] [E: packages/coding-agent/src/main.ts:410] [E: packages/coding-agent/src/main.ts:427] [E: packages/coding-agent/src/main.ts:431] [E: packages/coding-agent/src/main.ts:443]。

resource flags 被 resolve 为 cwd-relative paths 后交给 resource loader options:`--extension/-e`、`--skill`、`--prompt-template`、`--theme` 添加显式资源路径,`--no-extensions`、`--no-skills`、`--no-prompt-templates`、`--no-themes`、`--no-context-files` 禁用对应 discovery/loading [E: packages/coding-agent/src/main.ts:709] [E: packages/coding-agent/src/main.ts:710] [E: packages/coding-agent/src/main.ts:711] [E: packages/coding-agent/src/main.ts:712] [E: packages/coding-agent/src/main.ts:762] [E: packages/coding-agent/src/main.ts:763] [E: packages/coding-agent/src/main.ts:764] [E: packages/coding-agent/src/main.ts:765] [E: packages/coding-agent/src/main.ts:766] [E: packages/coding-agent/src/main.ts:767] [E: packages/coding-agent/src/main.ts:768] [E: packages/coding-agent/src/main.ts:769] [E: packages/coding-agent/src/main.ts:770] [E: packages/coding-agent/src/main.ts:771]。

unknown long flags 从 `Args.unknownFlags` 传给 `createAgentSessionServices({ extensionFlagValues })`,因此它们是 extension-visible CLI input,不是 built-in `Args` 字段 [E: packages/coding-agent/src/cli/args.ts:227] [E: packages/coding-agent/src/cli/args.ts:230] [E: packages/coding-agent/src/cli/args.ts:235] [E: packages/coding-agent/src/cli/args.ts:238] [E: packages/coding-agent/src/main.ts:732] [E: packages/coding-agent/src/main.ts:737] [I]。

model/tool flags 在 `buildSessionOptions` 里变成 `CreateAgentSessionOptions`: `--model`/`--provider` 解析目标 model,`--thinking` 覆盖 thinking level,`--no-tools` 设置 `noTools = "all"`,`--no-builtin-tools` 设置 `noTools = "builtin"`,`--tools` 和 `--exclude-tools` 分别复制到 allowlist/denylist [E: packages/coding-agent/src/main.ts:446] [E: packages/coding-agent/src/main.ts:457] [E: packages/coding-agent/src/main.ts:464] [E: packages/coding-agent/src/main.ts:465] [E: packages/coding-agent/src/main.ts:466] [E: packages/coding-agent/src/main.ts:467] [E: packages/coding-agent/src/main.ts:468] [E: packages/coding-agent/src/main.ts:511] [E: packages/coding-agent/src/main.ts:512] [E: packages/coding-agent/src/main.ts:529] [E: packages/coding-agent/src/main.ts:530] [E: packages/coding-agent/src/main.ts:531] [E: packages/coding-agent/src/main.ts:532] [E: packages/coding-agent/src/main.ts:534] [E: packages/coding-agent/src/main.ts:535] [E: packages/coding-agent/src/main.ts:537] [E: packages/coding-agent/src/main.ts:538]。

`--tui-mode regular|fullscreen` 写入 `Args.tuiMode`,并传给 `InteractiveMode`;缺值或非法值产生 error diagnostic。旧名 `--ui-mode` 与隐藏 alias `--alt` 已删除 [E: packages/coding-agent/src/cli/args.ts:50] [E: packages/coding-agent/src/cli/args.ts:203] [E: packages/coding-agent/src/cli/args.ts:205] [E: packages/coding-agent/src/cli/args.ts:315] [E: packages/coding-agent/src/main.ts:943]。

`--use-theme <name[/name]>` 写入 `Args.useTheme`;interactive 启动时用 `applyOverrides({ theme })` 覆盖本次 theme,并作为 `InteractiveMode` 的 `initialThemeSetting`。它不持久化 settings [E: packages/coding-agent/src/cli/args.ts:45] [E: packages/coding-agent/src/cli/args.ts:180] [E: packages/coding-agent/src/cli/args.ts:309] [E: packages/coding-agent/src/main.ts:662] [E: packages/coding-agent/src/main.ts:663] [E: packages/coding-agent/src/main.ts:944]。

`--api-key` 只会在已解析出 session model 时写入 runtime auth storage;没有 model 时产生 error 诊断,提示必须通过 `--model`、`--provider/--model` 或 `--models` 指定模型 [E: packages/coding-agent/src/main.ts:806] [E: packages/coding-agent/src/main.ts:807] [E: packages/coding-agent/src/main.ts:810] [E: packages/coding-agent/src/main.ts:758]。

## 初始输入与 dispatch

`prepareInitialMessage(parsed, autoResizeImages, stdinContent)` 在没有 `@file` 时直接调用 `buildInitialMessage({ parsed, stdinContent })`;有 `@file` 时先 `processFileArguments(parsed.fileArgs, { autoResizeImages })`,再把 file text/images 与 stdinContent 一起交给 initial-message builder [E: packages/coding-agent/src/main.ts:210] [E: packages/coding-agent/src/main.ts:218] [E: packages/coding-agent/src/main.ts:219] [E: packages/coding-agent/src/main.ts:222] [E: packages/coding-agent/src/main.ts:223] [E: packages/coding-agent/src/main.ts:225] [E: packages/coding-agent/src/main.ts:226] [E: packages/coding-agent/src/main.ts:227]。

最终 mode dispatch 是三分支: `rpc` 调用 `runRpcMode(runtime)`;`interactive` 创建 `InteractiveMode(runtime, ...)` 并 `run()`;其余 print/json path 调用 `runPrintMode(runtime, { mode, messages, initialMessage, initialImages })` [E: packages/coding-agent/src/main.ts:930] [E: packages/coding-agent/src/main.ts:932] [E: packages/coding-agent/src/main.ts:933] [E: packages/coding-agent/src/main.ts:934] [E: packages/coding-agent/src/main.ts:939] [E: packages/coding-agent/src/main.ts:940] [E: packages/coding-agent/src/main.ts:941] [E: packages/coding-agent/src/main.ts:942] [E: packages/coding-agent/src/main.ts:965] [E: packages/coding-agent/src/main.ts:968] [E: packages/coding-agent/src/main.ts:969] [E: packages/coding-agent/src/main.ts:970] [E: packages/coding-agent/src/main.ts:971] [E: packages/coding-agent/src/main.ts:972]。

## Gotcha

- `--mode text` 只被 `parseArgs` 作为合法 `Mode` 接收;`resolveAppMode()` 没有 `parsed.mode === "text"` 分支,所以它仍会按 `--print` / TTY 规则落到 print 或 interactive [E: packages/coding-agent/src/cli/args.ts:95] [E: packages/coding-agent/src/cli/args.ts:97] [E: packages/coding-agent/src/cli/args.ts:98] [E: packages/coding-agent/src/main.ts:111] [E: packages/coding-agent/src/main.ts:118] [E: packages/coding-agent/src/main.ts:121] [I]。
- `--list-models` 可带可不带 search pattern: 后一个 argv 只要不是 flag 或 `@file` 就会被消费为 search string,否则 `listModels = true` [E: packages/coding-agent/src/cli/args.ts:196] [E: packages/coding-agent/src/cli/args.ts:198] [E: packages/coding-agent/src/cli/args.ts:199] [E: packages/coding-agent/src/cli/args.ts:201]。
- `--name` 缺值会在 `parseArgs` 阶段产生 error;空白值则在 `main` 阶段 trim 后报 `--name requires a non-empty value` [E: packages/coding-agent/src/cli/args.ts:115] [E: packages/coding-agent/src/cli/args.ts:119] [E: packages/coding-agent/src/main.ts:690] [E: packages/coding-agent/src/main.ts:691] [E: packages/coding-agent/src/main.ts:693]。
- `--fork` 不能与 `--session`、`--continue`、`--resume`、`--no-session` 合用;`--session-id` 不能与 `--session`、`--continue`、`--resume` 合用 [E: packages/coding-agent/src/main.ts:294] [E: packages/coding-agent/src/main.ts:297] [E: packages/coding-agent/src/main.ts:305] [E: packages/coding-agent/src/main.ts:310] [E: packages/coding-agent/src/main.ts:313] [E: packages/coding-agent/src/main.ts:320]。

## 跨包关系

`spine.process-lifecycle` 是端到端 process flow:它从 shell argv 继续展开 session/runtime/mode dispatch;本节点只 owns 用户可见 CLI surface、`Args` 字段和 mode selection 规则 [E: packages/coding-agent/src/main.ts:562] [E: packages/coding-agent/src/cli/args.ts:71] [I]。

`ref.coding-agent.cli-flags` 应是完整 CLI flag catalog;本节点只按功能区解释 flag classes,不逐一枚举所有实例 [I]。

`surface.modes.interactive` 应 owns `InteractiveMode` 内部 UI 和 turn orchestration;本节点只证明 interactive 是 CLI dispatch 的一个目标,实际创建点是 `new InteractiveMode(runtime, ...)` [E: packages/coding-agent/src/main.ts:933] [E: packages/coding-agent/src/main.ts:934] [I]。

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
