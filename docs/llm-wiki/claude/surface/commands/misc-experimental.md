---
id: cmd.misc-experimental
path: surface/commands/misc-experimental.md
title: Miscellaneous and experimental slash commands
kind: command
tier: T1
source: [commands.ts, commands/exit/index.ts, commands/exit/exit.tsx, commands/feedback/index.ts, commands/feedback/feedback.tsx, commands/stickers/index.ts, commands/stickers/stickers.ts, commands/voice/index.ts, commands/voice/voice.ts, commands/heapdump/index.ts, commands/heapdump/heapdump.ts, commands/fast/index.ts, commands/fast/fast.tsx, commands/passes/index.ts, commands/passes/passes.tsx, commands/terminalSetup/index.ts, commands/terminalSetup/terminalSetup.tsx, commands/bridge/index.ts, commands/bridge/bridge.tsx, commands/remote-setup/index.ts, commands/remote-setup/remote-setup.tsx, commands/brief.ts, commands/sandbox-toggle/index.ts, commands/sandbox-toggle/sandbox-toggle.tsx, commands/upgrade/index.ts, commands/upgrade/upgrade.tsx]
symbols: [exit, feedback, stickers, voiceCommand, heapDump, fast, passes, terminalSetup, bridge, webCmd, briefCommand, sandboxToggle, upgrade]
related: [subsys.command-system]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Miscellaneous and experimental 命令 catalog 覆盖退出、反馈、stickers、voice、heapdump、fast mode、passes、terminal setup、remote control、web setup、brief mode、sandbox 和 upgrade 这些横跨 UX、实验开关与平台集成的 slash commands。

## 能回答的问题

- 哪些 misc 命令是 feature-gated、availability-gated 或 hidden?
- `/remote-control`、`/web-setup`、`/brief` 的实验开关分别在哪里?
- `/fast`、`/voice`、`/sandbox` 改动哪些 settings/runtime state?
- `/exit` 在 background session 和 worktree session 下如何分流?

## 简介

`commands.ts` 直接注册 `exit`、`fast`、`heapDump`、`stickers`、`feedback`、`terminalSetup`、`upgrade`、`sandboxToggle`、`passes`,并通过 feature-gated import 注册 `bridge`、`webCmd`、`voiceCommand`、`briefCommand`。[E: commands.ts:277][E: commands.ts:278][E: commands.ts:280][E: commands.ts:304][E: commands.ts:307][E: commands.ts:312][E: commands.ts:313][E: commands.ts:320][E: commands.ts:324][E: commands.ts:326][E: commands.ts:328][E: commands.ts:336][E: commands.ts:338] `REMOTE_SAFE_COMMANDS` 还把 `exit`、`feedback`、`stickers` 纳入 remote mode TUI 可见命令集合。[E: commands.ts:621][E: commands.ts:631][E: commands.ts:635]

## 命令清单

| 命令 | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
| --- | --- | --- | --- | --- | --- |
| `/exit` | `quit` | `local-jsx` | `COMMANDS` 直接包含 `exit`; metadata 标记 `immediate: true`。[E: commands.ts:277][E: commands/exit/index.ts:4][E: commands/exit/index.ts:6][E: commands/exit/index.ts:8] | 无显式参数。[E: commands/exit/exit.tsx:14] | `BG_SESSIONS` 且处于 bg session 时 detach tmux;worktree session 显示 `ExitFlow`;普通退出输出随机 goodbye 并 graceful shutdown。[E: commands/exit/exit.tsx:18][E: commands/exit/exit.tsx:20][E: commands/exit/exit.tsx:25][E: commands/exit/exit.tsx:27][E: commands/exit/exit.tsx:29][E: commands/exit/exit.tsx:30] |
| `/feedback` | `bug` | `local-jsx` | `COMMANDS` 直接包含 `feedback`; command object 有 `bug` alias 和 `[report]` hint。[E: commands.ts:307][E: commands/feedback/index.ts:7][E: commands/feedback/index.ts:8][E: commands/feedback/index.ts:9][E: commands/feedback/index.ts:11] | `[report]`;args 作为 initial description。[E: commands/feedback/feedback.tsx:22] | 渲染 `Feedback` component,`/feedback` 调用传入 abort signal、messages 与 initial description;render helper 支持默认空 background tasks。[E: commands/feedback/feedback.tsx:10][E: commands/feedback/feedback.tsx:18][E: commands/feedback/feedback.tsx:19][E: commands/feedback/feedback.tsx:23] |
| `/stickers` | - | `local` | `COMMANDS` 直接包含 `stickers`;不支持 non-interactive。[E: commands.ts:304][E: commands/stickers/index.ts:4][E: commands/stickers/index.ts:5][E: commands/stickers/index.ts:7] | 无显式参数。[E: commands/stickers/stickers.ts:4] | 打开 Sticker Mule URL,失败时返回可手动访问的 URL。[E: commands/stickers/stickers.ts:5][E: commands/stickers/stickers.ts:6][E: commands/stickers/stickers.ts:9][E: commands/stickers/stickers.ts:13] |
| `/voice` | - | `local` | `commands.ts` 仅在 `VOICE_MODE` feature 打开时 require `voice`; command availability 是 `claude-ai`,GrowthBook gate 决定启用,kill-switch 决定 hidden。[E: commands.ts:80][E: commands.ts:328][E: commands/voice/index.ts:8][E: commands/voice/index.ts:11][E: commands/voice/index.ts:12][E: commands/voice/index.ts:14] | 无显式参数;toggle 当前 voice setting。[E: commands/voice/voice.ts:16][E: commands/voice/voice.ts:35] | 开启前检查 auth、recording availability、API stream、recording dependencies 和 microphone permission;通过后写 `voiceEnabled: true`,关闭时写 `voiceEnabled: false`。[E: commands/voice/voice.ts:18][E: commands/voice/voice.ts:21][E: commands/voice/voice.ts:39][E: commands/voice/voice.ts:61][E: commands/voice/voice.ts:64][E: commands/voice/voice.ts:74][E: commands/voice/voice.ts:86][E: commands/voice/voice.ts:99][E: commands/voice/voice.ts:115] |
| `/heapdump` | - | `local` | `COMMANDS` 直接包含 `heapDump`; command 支持 non-interactive。[E: commands.ts:280][E: commands/heapdump/index.ts:4][E: commands/heapdump/index.ts:5][E: commands/heapdump/index.ts:8] | 无显式参数。[E: commands/heapdump/heapdump.ts:3] | 调用 `performHeapDump()`;失败返回 error,成功返回 heap path 与 diag path。[E: commands/heapdump/heapdump.ts:4][E: commands/heapdump/heapdump.ts:9][E: commands/heapdump/heapdump.ts:15] |
| `/fast` | - | `local-jsx` | `COMMANDS` 直接包含 `fast`; availability 是 `claude-ai` 或 `console`,`isFastModeEnabled()` 控制启用和 hidden,`immediate` 由 inference config helper 决定。[E: commands.ts:278][E: commands/fast/index.ts:9][E: commands/fast/index.ts:14][E: commands/fast/index.ts:15][E: commands/fast/index.ts:17][E: commands/fast/index.ts:21] | `[on/off]`;args 为 `on` 或 `off` 时走 shortcut path,否则打开 picker。[E: commands/fast/index.ts:19][E: commands/fast/fast.tsx:257][E: commands/fast/fast.tsx:258][E: commands/fast/fast.tsx:267] | 切换 user settings `fastMode`,必要时切换 main loop model,并记录 fast mode telemetry。[E: commands/fast/fast.tsx:18][E: commands/fast/fast.tsx:24][E: commands/fast/fast.tsx:28][E: commands/fast/fast.tsx:31][E: commands/fast/fast.tsx:37][E: commands/fast/fast.tsx:235] |
| `/passes` | - | `local-jsx` | `COMMANDS` 直接包含 `passes`;hidden 由 cached referral eligibility 和 cache presence 决定。[E: commands.ts:338][E: commands/passes/index.ts:8][E: commands/passes/index.ts:9][E: commands/passes/index.ts:18][E: commands/passes/index.ts:19] | 无显式参数。[E: commands/passes/passes.tsx:7] | 首次访问时写 `hasVisitedPasses` 和 remaining passes snapshot,记录访问 telemetry,再渲染 `Passes`。[E: commands/passes/passes.tsx:10][E: commands/passes/passes.tsx:13][E: commands/passes/passes.tsx:15][E: commands/passes/passes.tsx:16][E: commands/passes/passes.tsx:19][E: commands/passes/passes.tsx:22] |
| `/terminal-setup` | - | `local-jsx` | `COMMANDS` 直接包含 `terminalSetup`;native CSI-u terminal 会 hidden。[E: commands.ts:312][E: commands/terminalSetup/index.ts:13][E: commands/terminalSetup/index.ts:14][E: commands/terminalSetup/index.ts:19] | 无显式参数。[E: commands/terminalSetup/terminalSetup.tsx:142] | Apple Terminal 启用 Option-as-Meta;VSCode/Cursor/Windsurf、Alacritty、Zed 安装对应 keybinding;native CSI-u terminal 直接提示无需配置。[E: commands/terminalSetup/terminalSetup.tsx:83][E: commands/terminalSetup/terminalSetup.tsx:86][E: commands/terminalSetup/terminalSetup.tsx:89][E: commands/terminalSetup/terminalSetup.tsx:92][E: commands/terminalSetup/terminalSetup.tsx:95][E: commands/terminalSetup/terminalSetup.tsx:98][E: commands/terminalSetup/terminalSetup.tsx:143][E: commands/terminalSetup/terminalSetup.tsx:144][E: commands/terminalSetup/terminalSetup.tsx:146] |
| `/remote-control` | `rc` | `local-jsx` | `commands.ts` 仅在 `BRIDGE_MODE` feature 打开时 require `bridge`; command metadata 声明 alias、`[name]` hint、`immediate: true`。[E: commands.ts:73][E: commands.ts:326][E: commands/bridge/index.ts:13][E: commands/bridge/index.ts:14][E: commands/bridge/index.ts:15][E: commands/bridge/index.ts:17][E: commands/bridge/index.ts:22] | `[name]`;name 进入 bridge initial name state。[E: commands/bridge/bridge.tsx:23][E: commands/bridge/bridge.tsx:79] | 检查 bridge prerequisites,必要时显示 remote callout,否则设置 `replBridgeEnabled/replBridgeExplicit/replBridgeOutboundOnly/replBridgeInitialName` 并提示连接中。[E: commands/bridge/bridge.tsx:58][E: commands/bridge/bridge.tsx:71][E: commands/bridge/bridge.tsx:96][E: commands/bridge/bridge.tsx:97][E: commands/bridge/bridge.tsx:98][E: commands/bridge/bridge.tsx:99][E: commands/bridge/bridge.tsx:102] |
| `/web-setup` | - | `local-jsx` | `commands.ts` 仅在 `CCR_REMOTE_SETUP` feature 打开时 require `webCmd`; command availability 是 `claude-ai`,还要求 `tengu_cobalt_lantern` 和 `allow_remote_sessions` policy。[E: commands.ts:91][E: commands.ts:320][E: commands/remote-setup/index.ts:6][E: commands/remote-setup/index.ts:7][E: commands/remote-setup/index.ts:10][E: commands/remote-setup/index.ts:12][E: commands/remote-setup/index.ts:13] | 无显式参数。[E: commands/remote-setup/remote-setup.tsx:184] | 检查 Claude login 与 GitHub CLI auth,把本地 `gh auth token` import 到 web,创建默认 environment 并打开 Claude Code on the web。[E: commands/remote-setup/remote-setup.tsx:24][E: commands/remote-setup/remote-setup.tsx:45][E: commands/remote-setup/remote-setup.tsx:58][E: commands/remote-setup/remote-setup.tsx:131][E: commands/remote-setup/remote-setup.tsx:144][E: commands/remote-setup/remote-setup.tsx:146][E: commands/remote-setup/remote-setup.tsx:150] |
| `/brief` | - | `local-jsx` | `commands.ts` 仅在 `KAIROS` 或 `KAIROS_BRIEF` feature 打开时 require `briefCommand`; command 自身还要求 GrowthBook config `enable_slash_command`。[E: commands.ts:66][E: commands.ts:324][E: commands/brief.ts:48][E: commands/brief.ts:49][E: commands/brief.ts:52][E: commands/brief.ts:53] | 无显式参数;`immediate: true`。[E: commands/brief.ts:57] | toggle `isBriefOnly`,同步 `setUserMsgOptIn`,注入 meta system reminder 提醒模型使用或停止使用 Brief tool。[E: commands/brief.ts:64][E: commands/brief.ts:65][E: commands/brief.ts:87][E: commands/brief.ts:91][E: commands/brief.ts:111][E: commands/brief.ts:121] |
| `/sandbox` | - | `local-jsx` | `COMMANDS` 直接包含 `sandboxToggle`;metadata 动态 description 展示 sandbox status,hidden 由 platform support 和 enabled list 决定,`immediate: true`。[E: commands.ts:336][E: commands/sandbox-toggle/index.ts:6][E: commands/sandbox-toggle/index.ts:36][E: commands/sandbox-toggle/index.ts:41][E: commands/sandbox-toggle/index.ts:42][E: commands/sandbox-toggle/index.ts:45][E: commands/sandbox-toggle/index.ts:46] | `exclude "command pattern"`;无 args 打开菜单,`exclude` 写入 excluded commands。[E: commands/sandbox-toggle/index.ts:38][E: commands/sandbox-toggle/sandbox-toggle.tsx:43][E: commands/sandbox-toggle/sandbox-toggle.tsx:51][E: commands/sandbox-toggle/sandbox-toggle.tsx:64] | 校验 sandbox platform、enabledPlatforms 和 policy lock;dependency check 结果只传给 settings UI,`exclude` 参数写 local settings exclusion。[E: commands/sandbox-toggle/sandbox-toggle.tsx:14][E: commands/sandbox-toggle/sandbox-toggle.tsx:23][E: commands/sandbox-toggle/sandbox-toggle.tsx:26][E: commands/sandbox-toggle/sandbox-toggle.tsx:33][E: commands/sandbox-toggle/sandbox-toggle.tsx:44][E: commands/sandbox-toggle/sandbox-toggle.tsx:64][E: commands/sandbox-toggle/sandbox-toggle.tsx:67] |
| `/upgrade` | - | `local-jsx` | `COMMANDS` 直接包含 `upgrade`; availability 是 `claude-ai`,`isEnabled` 由 subscription/plan 状态 helper 决定。[E: commands.ts:313][E: commands/upgrade/index.ts:6][E: commands/upgrade/index.ts:7][E: commands/upgrade/index.ts:9][E: commands/upgrade/index.ts:10] | 无显式参数。[E: commands/upgrade/upgrade.tsx:9] | 已是 Max 20x 时提示无法再升级;否则打开 `https://claude.ai/upgrade/max` 并启动 login flow。[E: commands/upgrade/upgrade.tsx:12][E: commands/upgrade/upgrade.tsx:16][E: commands/upgrade/upgrade.tsx:22][E: commands/upgrade/upgrade.tsx:26][E: commands/upgrade/upgrade.tsx:27][E: commands/upgrade/upgrade.tsx:28] |

## 复杂命令深挖

### `/remote-control`

`/remote-control` 的 connect branch 是 AppState 开关:通过 prerequisite 后设置 `replBridgeEnabled: true`、`replBridgeExplicit: true`、`replBridgeOutboundOnly: false` 和可选 `replBridgeInitialName`。[E: commands/bridge/bridge.tsx:58][E: commands/bridge/bridge.tsx:96][E: commands/bridge/bridge.tsx:97][E: commands/bridge/bridge.tsx:98][E: commands/bridge/bridge.tsx:99] 如果已经 connected 或 enabled 且不是 outbound-only,命令不重复连接,而是显示 disconnect dialog;disconnect path 会把 `replBridgeEnabled`、`replBridgeExplicit`、`replBridgeOutboundOnly` 重置为 false,并输出 `REMOTE_CONTROL_DISCONNECTED_MSG`。[E: commands/bridge/bridge.tsx:52][E: commands/bridge/bridge.tsx:53][E: commands/bridge/bridge.tsx:195][E: commands/bridge/bridge.tsx:196][E: commands/bridge/bridge.tsx:200][E: commands/bridge/bridge.tsx:447][E: commands/bridge/bridge.tsx:453][E: commands/bridge/bridge.tsx:454][E: commands/bridge/bridge.tsx:455]

### `/fast`

`/fast` 有两条 execution path:带 `on/off` args 时直接 `handleFastModeShortcut()`,否则显示 `FastModePicker`。[E: commands/fast/fast.tsx:258][E: commands/fast/fast.tsx:259][E: commands/fast/fast.tsx:267] `applyFastMode()` 写 user settings,开启时如当前 model 不支持 fast mode 会切到 `getFastModeModel()`,关闭时只把 AppState `fastMode` 置 false。[E: commands/fast/fast.tsx:18][E: commands/fast/fast.tsx:24][E: commands/fast/fast.tsx:28][E: commands/fast/fast.tsx:31][E: commands/fast/fast.tsx:37]

### `/sandbox`

`/sandbox` 在执行前做三类 blocking guard:平台支持、enabledPlatforms enterprise setting、higher-priority policy lock;dependency check 只收集结果并在无参数时传给 `SandboxSettings` UI。[E: commands/sandbox-toggle/sandbox-toggle.tsx:14][E: commands/sandbox-toggle/sandbox-toggle.tsx:23][E: commands/sandbox-toggle/sandbox-toggle.tsx:26][E: commands/sandbox-toggle/sandbox-toggle.tsx:33][E: commands/sandbox-toggle/sandbox-toggle.tsx:44] `exclude` subcommand 只把 clean pattern 写入 excluded commands,并把本地 settings path 相对当前 cwd 展示给用户。[E: commands/sandbox-toggle/sandbox-toggle.tsx:53][E: commands/sandbox-toggle/sandbox-toggle.tsx:61][E: commands/sandbox-toggle/sandbox-toggle.tsx:64][E: commands/sandbox-toggle/sandbox-toggle.tsx:67][E: commands/sandbox-toggle/sandbox-toggle.tsx:69]

## Sources

- `commands.ts`
- `commands/exit/index.ts`
- `commands/exit/exit.tsx`
- `commands/feedback/index.ts`
- `commands/feedback/feedback.tsx`
- `commands/stickers/index.ts`
- `commands/stickers/stickers.ts`
- `commands/voice/index.ts`
- `commands/voice/voice.ts`
- `commands/heapdump/index.ts`
- `commands/heapdump/heapdump.ts`
- `commands/fast/index.ts`
- `commands/fast/fast.tsx`
- `commands/passes/index.ts`
- `commands/passes/passes.tsx`
- `commands/terminalSetup/index.ts`
- `commands/terminalSetup/terminalSetup.tsx`
- `commands/bridge/index.ts`
- `commands/bridge/bridge.tsx`
- `commands/remote-setup/index.ts`
- `commands/remote-setup/remote-setup.tsx`
- `commands/brief.ts`
- `commands/sandbox-toggle/index.ts`
- `commands/sandbox-toggle/sandbox-toggle.tsx`
- `commands/upgrade/index.ts`
- `commands/upgrade/upgrade.tsx`

## 相关

- [命令系统机制](../../subsystems/command-system.md)
