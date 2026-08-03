---
id: surface.cli.overview
title: CLI 调用与子命令/模式选择
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/cli/args.ts
  - packages/coding-agent/src/cli/credential-print.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/docs/usage.md
symbols:
  - parseArgs
  - Args
  - printHelp
  - parseCredentialPrintCommand
  - resolveCredentialForPrint
  - resolveAppMode
related:
  - spine.process-lifecycle
  - ref.coding-agent.cli-flags
  - surface.modes.interactive
evidence: explicit
status: verified
updated: 305c014dcc
---

> `surface.cli.overview` 描述 `pi` 用户可见 CLI surface: argv 如何被 `parseArgs()` 拆成 `Args`,哪些子命令在 agent runtime 前短路,以及 `resolveAppMode()` 如何选择 interactive / print / json / rpc。

## 能回答的问题

- `pi [options] [@files...] [messages...]` 的用户输入如何映射到 `Args`?
- `--mode json`、`--mode rpc`、`--print`、TTY 状态和 piped stdin 谁决定最终模式?
- `install/remove/update/list/config` 这些 package/config commands 是否进入 agent session?
- `--help`、`--list-models`、`--export`、`--version` 这类一次性命令在哪里退出?
- `@file`、普通 messages、unknown extension flags 分别落到 `Args` 的哪个字段?
- CLI flags 如何影响 model、thinking、tools、resources、project trust 和 session?

## 用户可见入口

用户文档把 CLI 形态写成 `pi [options] [@files...] [messages...]`,并把 package commands、modes、model options、session options、tool options、resource options、other options 和 file arguments 分区说明 [E: packages/coding-agent/docs/usage.md:143] [E: packages/coding-agent/docs/usage.md:146] [E: packages/coding-agent/docs/usage.md:166] [E: packages/coding-agent/docs/usage.md:182] [E: packages/coding-agent/docs/usage.md:193] [E: packages/coding-agent/docs/usage.md:205] [E: packages/coding-agent/docs/usage.md:216] [E: packages/coding-agent/docs/usage.md:236] [E: packages/coding-agent/docs/usage.md:253]。

`printHelp()` 使用同一组用户面分区输出 help: commands 包括 `install`、`remove`、`uninstall`、`update`、`list`、`config`,options 包括 provider/model/API key/system prompt/mode/print/session/tools/resources/trust/offline/help/version 等 [E: packages/coding-agent/src/cli/args.ts:230] [E: packages/coding-agent/src/cli/args.ts:241] [E: packages/coding-agent/src/cli/args.ts:247] [E: packages/coding-agent/src/cli/args.ts:256] [E: packages/coding-agent/src/cli/args.ts:257] [E: packages/coding-agent/src/cli/args.ts:258] [E: packages/coding-agent/src/cli/args.ts:259] [E: packages/coding-agent/src/cli/args.ts:260] [E: packages/coding-agent/src/cli/args.ts:262] [E: packages/coding-agent/src/cli/args.ts:263] [E: packages/coding-agent/src/cli/args.ts:264] [E: packages/coding-agent/src/cli/args.ts:274] [E: packages/coding-agent/src/cli/args.ts:281] [E: packages/coding-agent/src/cli/args.ts:294] [E: packages/coding-agent/src/cli/args.ts:296] [E: packages/coding-agent/src/cli/args.ts:297] [E: packages/coding-agent/src/cli/args.ts:298]。

`printHelp()` 还会追加 extension-provided CLI flags: extension flag 的 value marker 由 `flag.type === "string"` 决定,description 优先来自 flag 自身,否则显示 registering extension path [E: packages/coding-agent/src/cli/args.ts:231] [E: packages/coding-agent/src/cli/args.ts:233] [E: packages/coding-agent/src/cli/args.ts:235] [E: packages/coding-agent/src/cli/args.ts:236] [E: packages/coding-agent/src/cli/args.ts:237]。

## Args 数据模型

`Args` 是 CLI surface 的解析结果结构,覆盖 provider/model/apiKey/systemPrompt/thinking/session/model scope/tools/extensions/skills/prompt templates/themes/context files/list models/offline/verbose/project trust 等字段 [E: packages/coding-agent/src/cli/args.ts:13] [E: packages/coding-agent/src/cli/args.ts:14] [E: packages/coding-agent/src/cli/args.ts:15] [E: packages/coding-agent/src/cli/args.ts:16] [E: packages/coding-agent/src/cli/args.ts:17] [E: packages/coding-agent/src/cli/args.ts:19] [E: packages/coding-agent/src/cli/args.ts:20] [E: packages/coding-agent/src/cli/args.ts:21] [E: packages/coding-agent/src/cli/args.ts:24] [E: packages/coding-agent/src/cli/args.ts:27] [E: packages/coding-agent/src/cli/args.ts:28] [E: packages/coding-agent/src/cli/args.ts:29] [E: packages/coding-agent/src/cli/args.ts:30] [E: packages/coding-agent/src/cli/args.ts:31] [E: packages/coding-agent/src/cli/args.ts:32] [E: packages/coding-agent/src/cli/args.ts:36] [E: packages/coding-agent/src/cli/args.ts:41] [E: packages/coding-agent/src/cli/args.ts:42] [E: packages/coding-agent/src/cli/args.ts:44] [E: packages/coding-agent/src/cli/args.ts:46] [E: packages/coding-agent/src/cli/args.ts:47] [E: packages/coding-agent/src/cli/args.ts:48] [E: packages/coding-agent/src/cli/args.ts:50] [E: packages/coding-agent/src/cli/args.ts:51]。

`Args.messages` 保存普通 prompt fragments,`Args.fileArgs` 保存去掉 `@` 前缀后的 file arguments,`Args.unknownFlags` 保存 unknown long flags 以供 extension flags 使用,`Args.diagnostics` 保存 warning/error 级解析诊断 [E: packages/coding-agent/src/cli/args.ts:52] [E: packages/coding-agent/src/cli/args.ts:53] [E: packages/coding-agent/src/cli/args.ts:55] [E: packages/coding-agent/src/cli/args.ts:56]。

`Mode` 类型只允许 `"text" | "json" | "rpc"`,而 app-level mode 还会在 `main.ts` 中派生出 `"print"` 和 `"interactive"` [E: packages/coding-agent/src/cli/args.ts:11] [E: packages/coding-agent/src/main.ts:109] [E: packages/coding-agent/src/main.ts:116] [E: packages/coding-agent/src/main.ts:119]。

## parseArgs 扫描规则

`parseArgs(args)` 初始化 `messages`、`fileArgs`、`unknownFlags`、`diagnostics`,然后线性扫描 argv [E: packages/coding-agent/src/cli/args.ts:65] [E: packages/coding-agent/src/cli/args.ts:66] [E: packages/coding-agent/src/cli/args.ts:67] [E: packages/coding-agent/src/cli/args.ts:68] [E: packages/coding-agent/src/cli/args.ts:69] [E: packages/coding-agent/src/cli/args.ts:70] [E: packages/coding-agent/src/cli/args.ts:73]。

常规 flags 大多按固定名字消费后一个 argv: `--provider`、`--model`、`--api-key`、`--system-prompt`、`--session`、`--session-id`、`--fork`、`--session-dir` 都在解析时读取紧随值 [E: packages/coding-agent/src/cli/args.ts:90] [E: packages/coding-agent/src/cli/args.ts:92] [E: packages/coding-agent/src/cli/args.ts:94] [E: packages/coding-agent/src/cli/args.ts:96] [E: packages/coding-agent/src/cli/args.ts:109] [E: packages/coding-agent/src/cli/args.ts:111] [E: packages/coding-agent/src/cli/args.ts:113] [E: packages/coding-agent/src/cli/args.ts:115]。

`--models` 以逗号拆分并 trim,`--tools/-t` 和 `--exclude-tools/-xt` 以逗号拆分、trim 并过滤空项 [E: packages/coding-agent/src/cli/args.ts:116] [E: packages/coding-agent/src/cli/args.ts:117] [E: packages/coding-agent/src/cli/args.ts:122] [E: packages/coding-agent/src/cli/args.ts:123] [E: packages/coding-agent/src/cli/args.ts:124] [E: packages/coding-agent/src/cli/args.ts:125] [E: packages/coding-agent/src/cli/args.ts:126] [E: packages/coding-agent/src/cli/args.ts:127] [E: packages/coding-agent/src/cli/args.ts:128] [E: packages/coding-agent/src/cli/args.ts:129] [E: packages/coding-agent/src/cli/args.ts:130] [E: packages/coding-agent/src/cli/args.ts:131]。

`--thinking` 只接受 `off/minimal/low/medium/high/xhigh/max`;非法值不会退出解析,而是写入 warning 诊断 [E: packages/coding-agent/src/cli/args.ts:59] [E: packages/coding-agent/src/cli/args.ts:61] [E: packages/coding-agent/src/cli/args.ts:132] [E: packages/coding-agent/src/cli/args.ts:134] [E: packages/coding-agent/src/cli/args.ts:135] [E: packages/coding-agent/src/cli/args.ts:137] [E: packages/coding-agent/src/cli/args.ts:139]。

`--print/-p` 设置 `print = true`;如果后一个 argv 不是 `@file` 且不是普通 flag,或者是以 `---` 开头的文本,它会被当作 message 消费 [E: packages/coding-agent/src/cli/args.ts:142] [E: packages/coding-agent/src/cli/args.ts:143] [E: packages/coding-agent/src/cli/args.ts:144] [E: packages/coding-agent/src/cli/args.ts:145] [E: packages/coding-agent/src/cli/args.ts:146] [E: packages/coding-agent/src/cli/args.ts:147]。

以 `@` 开头的 argv 进入 `fileArgs`,普通非 flag argv 进入 `messages`;unknown long flags 支持 `--flag=value`、`--flag value` 和布尔 `--flag`,而 unknown short flag 会产生 error 诊断 [E: packages/coding-agent/src/cli/args.ts:204] [E: packages/coding-agent/src/cli/args.ts:205] [E: packages/coding-agent/src/cli/args.ts:206] [E: packages/coding-agent/src/cli/args.ts:209] [E: packages/coding-agent/src/cli/args.ts:214] [E: packages/coding-agent/src/cli/args.ts:217] [E: packages/coding-agent/src/cli/args.ts:220] [E: packages/coding-agent/src/cli/args.ts:221] [E: packages/coding-agent/src/cli/args.ts:222] [E: packages/coding-agent/src/cli/args.ts:223]。

## 早期一次性命令

`main(args)` 在 `parseArgs` 前先处理 package/config commands: `handlePackageCommand(args, ...)` 命中后按 `process.exitCode` 退出,`handleConfigCommand(args, ...)` 命中后直接返回 [E: packages/coding-agent/src/main.ts:540] [E: packages/coding-agent/src/main.ts:541] [E: packages/coding-agent/src/main.ts:549] [E: packages/coding-agent/src/main.ts:553] [E: packages/coding-agent/src/main.ts:554]。因此 `install/remove/uninstall/update/list/config` 是 CLI bootstrap surface,不是普通 agent turn surface [E: packages/coding-agent/src/cli/args.ts:247] [E: packages/coding-agent/src/cli/args.ts:248] [E: packages/coding-agent/src/cli/args.ts:249] [E: packages/coding-agent/src/cli/args.ts:250] [E: packages/coding-agent/src/cli/args.ts:251] [E: packages/coding-agent/src/cli/args.ts:252] [I]。

`--offline` 是特殊早期环境开关: `main` 在 `parseArgs` 前检查 argv 或 `PI_OFFLINE`,并设置 `PI_OFFLINE=1` 与 `PI_SKIP_VERSION_CHECK=1` [E: packages/coding-agent/src/main.ts:521] [E: packages/coding-agent/src/main.ts:524] [E: packages/coding-agent/src/main.ts:525] [E: packages/coding-agent/src/main.ts:526] [E: packages/coding-agent/src/main.ts:527]。

`pi auth` 也是 normal runtime 前短路的一次性 command surface:`print-api-key` 与 `print-bearer-token` 都要求 `--model`,可用 `--provider` 消除 provider 歧义；bearer token 额外接受带 `ms/s/m/h` 单位的 `--min-expiry`,未指定时要求至少剩余 30 分钟 [E: packages/coding-agent/src/cli/credential-print.ts:8] [E: packages/coding-agent/src/cli/credential-print.ts:24] [E: packages/coding-agent/src/cli/credential-print.ts:26] [E: packages/coding-agent/src/cli/credential-print.ts:27] [E: packages/coding-agent/src/cli/credential-print.ts:54] [E: packages/coding-agent/src/cli/credential-print.ts:60] [E: packages/coding-agent/src/cli/credential-print.ts:67]。该命令拒绝 `--api-key`、message、`@file` 和 extension unknown flags，只从 configured credentials 解析目标 credential [E: packages/coding-agent/src/cli/credential-print.ts:66] [E: packages/coding-agent/src/cli/credential-print.ts:70] [E: packages/coding-agent/src/cli/credential-print.ts:73] [E: packages/coding-agent/src/cli/credential-print.ts:74]。

`main()` 在 package/config command 后、普通 `parseArgs()` 前调用这个 auth handler；成功时使用禁用 model network 的 `ModelRuntime`,并把 credential 单独写到 stdout [E: packages/coding-agent/src/main.ts:553] [E: packages/coding-agent/src/main.ts:557] [E: packages/coding-agent/src/main.ts:561] [E: packages/coding-agent/src/main.ts:158] [E: packages/coding-agent/src/main.ts:159] [E: packages/coding-agent/src/main.ts:160]。provider 未显式指定时只考虑已配置 credential 的 provider，若得到多个可用 credential 就要求 `--provider`，因此该命令不会静默选择歧义匹配 [E: packages/coding-agent/src/cli/credential-print.ts:92] [E: packages/coding-agent/src/cli/credential-print.ts:103] [E: packages/coding-agent/src/cli/credential-print.ts:104] [E: packages/coding-agent/src/cli/credential-print.ts:135] [E: packages/coding-agent/src/cli/credential-print.ts:149] [E: packages/coding-agent/src/cli/credential-print.ts:150]。

`--version` 在 `parseArgs` 后立即打印 `VERSION` 并退出;`--export <file>` 在 mode/session/runtime 选择前调用 `exportFromFile(parsed.export, outputPath)`,其中 output path 来自第一个 parsed message [E: packages/coding-agent/src/main.ts:561] [E: packages/coding-agent/src/main.ts:573] [E: packages/coding-agent/src/main.ts:574] [E: packages/coding-agent/src/main.ts:575] [E: packages/coding-agent/src/main.ts:578] [E: packages/coding-agent/src/main.ts:581] [E: packages/coding-agent/src/main.ts:582] [E: packages/coding-agent/src/main.ts:588] [E: packages/coding-agent/src/main.ts:589]。

`--help` 与 `--list-models` 不在 runtime 前退出: `main` 创建 runtime 后,help 从 loaded extensions 收集 flags 再调用 `printHelp(extensionFlags)`,listModels 使用 runtime 的 `modelRegistry` [E: packages/coding-agent/src/main.ts:793] [E: packages/coding-agent/src/main.ts:799] [E: packages/coding-agent/src/main.ts:795] [E: packages/coding-agent/src/main.ts:804] [E: packages/coding-agent/src/main.ts:805] [E: packages/coding-agent/src/main.ts:807] [E: packages/coding-agent/src/main.ts:808] [E: packages/coding-agent/src/main.ts:812] [E: packages/coding-agent/src/main.ts:809]。

## 模式选择

用户文档把 default 列为 interactive mode,`-p/--print` 列为 print response and exit,`--mode json` 列为 JSON lines events,`--mode rpc` 列为 stdin/stdout RPC [E: packages/coding-agent/docs/usage.md:166] [E: packages/coding-agent/docs/usage.md:170] [E: packages/coding-agent/docs/usage.md:171] [E: packages/coding-agent/docs/usage.md:172] [E: packages/coding-agent/docs/usage.md:173]。

`resolveAppMode(parsed, stdinIsTTY, stdoutIsTTY)` 的真实优先级是: `parsed.mode === "rpc"` 返回 `rpc`;`parsed.mode === "json"` 返回 `json`;`parsed.print || !stdinIsTTY || !stdoutIsTTY` 返回 `print`;否则返回 `interactive` [E: packages/coding-agent/src/main.ts:109] [E: packages/coding-agent/src/main.ts:110] [E: packages/coding-agent/src/main.ts:111] [E: packages/coding-agent/src/main.ts:113] [E: packages/coding-agent/src/main.ts:114] [E: packages/coding-agent/src/main.ts:116] [E: packages/coding-agent/src/main.ts:117] [E: packages/coding-agent/src/main.ts:119]。

`json` 是 app mode,但执行器复用 print path: `toPrintOutputMode(appMode)` 把 `json` 映射为 `"json"`,其他非 RPC print path 映射为 `"text"`,最后 `runPrintMode(runtime, { mode: toPrintOutputMode(appMode), ... })` 执行 [E: packages/coding-agent/src/main.ts:122] [E: packages/coding-agent/src/main.ts:123] [E: packages/coding-agent/src/main.ts:904] [E: packages/coding-agent/src/main.ts:905]。

RPC mode 有两个输入约束: 用户文档定义 RPC over stdin/stdout,`main` 不为 RPC 读取 piped stdin;并且 `--mode rpc` 搭配 `@file` 会报错退出 [E: packages/coding-agent/docs/usage.md:173] [E: packages/coding-agent/src/main.ts:598] [E: packages/coding-agent/src/main.ts:599] [E: packages/coding-agent/src/main.ts:600] [E: packages/coding-agent/src/main.ts:820]。

非 RPC mode 会读取 piped stdin;如果最初是 interactive 但读到了 stdin 内容,`main` 会把 app mode 改成 print [E: packages/coding-agent/src/main.ts:820] [E: packages/coding-agent/src/main.ts:821] [E: packages/coding-agent/src/main.ts:822] [E: packages/coding-agent/src/main.ts:823]。这意味着 `resolveAppMode()` 的 TTY 判断不是最终模式的唯一输入,piped stdin 的实际内容会在 runtime 创建后再做一次降级 [I]。

## CLI 对 runtime 的影响

`main` 在解析后先打印 diagnostics:error 级诊断会退出,warning 级诊断只打印 [E: packages/coding-agent/src/main.ts:561] [E: packages/coding-agent/src/main.ts:562] [E: packages/coding-agent/src/main.ts:565] [E: packages/coding-agent/src/main.ts:567] [E: packages/coding-agent/src/main.ts:568]。

session 相关 flags 在进入 mode dispatch 前决定 session manager:`--no-session`、help、listModels 使用 in-memory session;`--fork`、`--session`、`--resume`、`--continue`、`--session-id` 分别进入 fork/open/select/continue/open-or-create 分支 [E: packages/coding-agent/src/main.ts:312] [E: packages/coding-agent/src/main.ts:318] [E: packages/coding-agent/src/main.ts:322] [E: packages/coding-agent/src/main.ts:345] [E: packages/coding-agent/src/main.ts:369] [E: packages/coding-agent/src/main.ts:386] [E: packages/coding-agent/src/main.ts:390] [E: packages/coding-agent/src/main.ts:402]。

resource flags 被 resolve 为 cwd-relative paths 后交给 resource loader options:`--extension/-e`、`--skill`、`--prompt-template`、`--theme` 添加显式资源路径,`--no-extensions`、`--no-skills`、`--no-prompt-templates`、`--no-themes`、`--no-context-files` 禁用对应 discovery/loading [E: packages/coding-agent/src/main.ts:663] [E: packages/coding-agent/src/main.ts:664] [E: packages/coding-agent/src/main.ts:665] [E: packages/coding-agent/src/main.ts:666] [E: packages/coding-agent/src/main.ts:715] [E: packages/coding-agent/src/main.ts:716] [E: packages/coding-agent/src/main.ts:717] [E: packages/coding-agent/src/main.ts:718] [E: packages/coding-agent/src/main.ts:719] [E: packages/coding-agent/src/main.ts:720] [E: packages/coding-agent/src/main.ts:721] [E: packages/coding-agent/src/main.ts:722] [E: packages/coding-agent/src/main.ts:723] [E: packages/coding-agent/src/main.ts:724]。

unknown long flags 从 `Args.unknownFlags` 传给 `createAgentSessionServices({ extensionFlagValues })`,因此它们是 extension-visible CLI input,不是 built-in `Args` 字段 [E: packages/coding-agent/src/cli/args.ts:206] [E: packages/coding-agent/src/cli/args.ts:209] [E: packages/coding-agent/src/cli/args.ts:214] [E: packages/coding-agent/src/cli/args.ts:217] [E: packages/coding-agent/src/main.ts:686] [E: packages/coding-agent/src/main.ts:690] [I]。

model/tool flags 在 `buildSessionOptions` 里变成 `CreateAgentSessionOptions`: `--model`/`--provider` 解析目标 model,`--thinking` 覆盖 thinking level,`--no-tools` 设置 `noTools = "all"`,`--no-builtin-tools` 设置 `noTools = "builtin"`,`--tools` 和 `--exclude-tools` 分别复制到 allowlist/denylist [E: packages/coding-agent/src/main.ts:405] [E: packages/coding-agent/src/main.ts:416] [E: packages/coding-agent/src/main.ts:423] [E: packages/coding-agent/src/main.ts:424] [E: packages/coding-agent/src/main.ts:425] [E: packages/coding-agent/src/main.ts:426] [E: packages/coding-agent/src/main.ts:427] [E: packages/coding-agent/src/main.ts:470] [E: packages/coding-agent/src/main.ts:471] [E: packages/coding-agent/src/main.ts:488] [E: packages/coding-agent/src/main.ts:489] [E: packages/coding-agent/src/main.ts:490] [E: packages/coding-agent/src/main.ts:491] [E: packages/coding-agent/src/main.ts:493] [E: packages/coding-agent/src/main.ts:494] [E: packages/coding-agent/src/main.ts:496] [E: packages/coding-agent/src/main.ts:497]。

`--ui-mode regular|fullscreen` 写入 `Args.uiMode`;缺值或非法值产生 error diagnostic。隐藏的 `--alt` alias 直接选择 fullscreen,但不出现在 `printHelp()` 文案中 [E: packages/coding-agent/src/cli/args.ts:49] [E: packages/coding-agent/src/cli/args.ts:180] [E: packages/coding-agent/src/cli/args.ts:182] [E: packages/coding-agent/src/cli/args.ts:185] [E: packages/coding-agent/src/cli/args.ts:191] [E: packages/coding-agent/src/cli/args.ts:194] [E: packages/coding-agent/src/cli/args.ts:195] [E: packages/coding-agent/src/cli/args.ts:293]。

`--api-key` 只会在已解析出 session model 时写入 runtime auth storage;没有 model 时产生 error 诊断,提示必须通过 `--model`、`--provider/--model` 或 `--models` 指定模型 [E: packages/coding-agent/src/main.ts:757] [E: packages/coding-agent/src/main.ts:758] [E: packages/coding-agent/src/main.ts:761] [E: packages/coding-agent/src/main.ts:764]。

## 初始输入与 dispatch

`prepareInitialMessage(parsed, autoResizeImages, stdinContent)` 在没有 `@file` 时直接调用 `buildInitialMessage({ parsed, stdinContent })`;有 `@file` 时先 `processFileArguments(parsed.fileArgs, { autoResizeImages })`,再把 file text/images 与 stdinContent 一起交给 initial-message builder [E: packages/coding-agent/src/main.ts:169] [E: packages/coding-agent/src/main.ts:177] [E: packages/coding-agent/src/main.ts:178] [E: packages/coding-agent/src/main.ts:181] [E: packages/coding-agent/src/main.ts:182] [E: packages/coding-agent/src/main.ts:184] [E: packages/coding-agent/src/main.ts:185] [E: packages/coding-agent/src/main.ts:186]。

最终 mode dispatch 是三分支: `rpc` 调用 `runRpcMode(runtime)`;`interactive` 创建 `InteractiveMode(runtime, ...)` 并 `run()`;其余 print/json path 调用 `runPrintMode(runtime, { mode, messages, initialMessage, initialImages })` [E: packages/coding-agent/src/main.ts:868] [E: packages/coding-agent/src/main.ts:870] [E: packages/coding-agent/src/main.ts:871] [E: packages/coding-agent/src/main.ts:872] [E: packages/coding-agent/src/main.ts:876] [E: packages/coding-agent/src/main.ts:877] [E: packages/coding-agent/src/main.ts:878] [E: packages/coding-agent/src/main.ts:879] [E: packages/coding-agent/src/main.ts:901] [E: packages/coding-agent/src/main.ts:904] [E: packages/coding-agent/src/main.ts:905] [E: packages/coding-agent/src/main.ts:906] [E: packages/coding-agent/src/main.ts:907] [E: packages/coding-agent/src/main.ts:908]。

## Gotcha

- `--mode text` 只被 `parseArgs` 作为合法 `Mode` 接收;`resolveAppMode()` 没有 `parsed.mode === "text"` 分支,所以它仍会按 `--print` / TTY 规则落到 print 或 interactive [E: packages/coding-agent/src/cli/args.ts:80] [E: packages/coding-agent/src/cli/args.ts:82] [E: packages/coding-agent/src/cli/args.ts:83] [E: packages/coding-agent/src/main.ts:109] [E: packages/coding-agent/src/main.ts:116] [E: packages/coding-agent/src/main.ts:119] [I]。
- `--list-models` 可带可不带 search pattern: 后一个 argv 只要不是 flag 或 `@file` 就会被消费为 search string,否则 `listModels = true` [E: packages/coding-agent/src/cli/args.ts:173] [E: packages/coding-agent/src/cli/args.ts:175] [E: packages/coding-agent/src/cli/args.ts:176] [E: packages/coding-agent/src/cli/args.ts:178]。
- `--name` 缺值会在 `parseArgs` 阶段产生 error;空白值则在 `main` 阶段 trim 后报 `--name requires a non-empty value` [E: packages/coding-agent/src/cli/args.ts:100] [E: packages/coding-agent/src/cli/args.ts:104] [E: packages/coding-agent/src/main.ts:644] [E: packages/coding-agent/src/main.ts:645] [E: packages/coding-agent/src/main.ts:647]。
- `--fork` 不能与 `--session`、`--continue`、`--resume`、`--no-session` 合用;`--session-id` 不能与 `--session`、`--continue`、`--resume` 合用 [E: packages/coding-agent/src/main.ts:253] [E: packages/coding-agent/src/main.ts:256] [E: packages/coding-agent/src/main.ts:264] [E: packages/coding-agent/src/main.ts:269] [E: packages/coding-agent/src/main.ts:272] [E: packages/coding-agent/src/main.ts:279]。

## 跨包关系

`spine.process-lifecycle` 是端到端 process flow:它从 shell argv 继续展开 session/runtime/mode dispatch;本节点只 owns 用户可见 CLI surface、`Args` 字段和 mode selection 规则 [E: packages/coding-agent/src/main.ts:521] [E: packages/coding-agent/src/cli/args.ts:65] [I]。

`ref.coding-agent.cli-flags` 应是完整 CLI flag catalog;本节点只按功能区解释 flag classes,不逐一枚举所有实例 [I]。

`surface.modes.interactive` 应 owns `InteractiveMode` 内部 UI 和 turn orchestration;本节点只证明 interactive 是 CLI dispatch 的一个目标,实际创建点是 `new InteractiveMode(runtime, ...)` [E: packages/coding-agent/src/main.ts:871] [E: packages/coding-agent/src/main.ts:872] [I]。

## Sources

- packages/coding-agent/src/cli/args.ts
- packages/coding-agent/src/cli/credential-print.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/docs/usage.md

## 相关

- [spine.process-lifecycle](../../spine/process-lifecycle.md): 从 shell argv 到 runtime/session/mode dispatch 的端到端生命周期。
- [ref.coding-agent.cli-flags](../../reference/cli-flags.md): CLI flags 完整目录与逐项字段。
- [surface.modes.interactive](../modes/interactive.md): interactive mode 的 TUI 和用户 turn 入口。
