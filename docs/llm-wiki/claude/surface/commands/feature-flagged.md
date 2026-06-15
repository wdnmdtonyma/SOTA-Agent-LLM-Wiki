---
id: cmd.feature-flagged
path: surface/commands/feature-flagged.md
title: Feature-gated slash commands
kind: command
tier: T1
source: [commands.ts, commands/brief.ts, commands/bridge/index.ts, commands/bridge/bridge.tsx, commands/remote-setup/index.ts, commands/remote-setup/remote-setup.tsx, commands/voice/index.ts, commands/voice/voice.ts, commands/ultraplan.tsx, commands/branch/index.ts]
symbols: [proactive, briefCommand, assistantCommand, bridge, remoteControlServerCommand, voiceCommand, forceSnip, workflowsCmd, webCmd, subscribePr, ultraplan, torch, peersCmd, forkCmd, buddy]
related: [subsys.command-system]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Feature-gated 命令 catalog 枚举 `commands.ts` 中通过 `feature()` 条件 require 的 slash command entries,并区分当前源码 dump 中实现存在与实现缺失的命令。

## 能回答的问题

- `commands.ts` 里哪些 slash commands 由 `feature()` gate 决定是否 require?
- 哪些 feature-gated command implementation 在当前 `claude/commands/` dump 中缺失?
- `/brief`、`/remote-control`、`/web-setup`、`/voice`、`/ultraplan` 的二级启用条件是什么?
- workflow command gate 与 dynamic workflow commands loader 有什么区别?

## 简介

`commands.ts` 在 top-level conditional imports 中使用 `feature()` 决定是否 require `proactive`、`briefCommand`、`assistantCommand`、`bridge`、`remoteControlServerCommand`、`voiceCommand`、`forceSnip`、`workflowsCmd`、`webCmd`、`subscribePr`、`ultraplan`、`torch`、`peersCmd`、`forkCmd` 和 `buddy`。[E: commands.ts:62][E: commands.ts:66][E: commands.ts:70][E: commands.ts:73][E: commands.ts:76][E: commands.ts:80][E: commands.ts:83][E: commands.ts:86][E: commands.ts:91][E: commands.ts:101][E: commands.ts:104][E: commands.ts:107][E: commands.ts:108][E: commands.ts:113][E: commands.ts:118] 当前源码 dump 中只有 `brief`、`bridge`、`remote-setup`、`voice`、`ultraplan` 对应实现文件存在;其它 conditional require 指向的 command implementation 文件缺失。[E: commands/brief.ts:47][E: commands/bridge/index.ts:12][E: commands/remote-setup/index.ts:5][E: commands/voice/index.ts:7][E: commands/ultraplan.tsx:461][U]

## 命令清单

| 命令 | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
| --- | --- | --- | --- | --- | --- |
| `/proactive` | [U] | [U] | `feature('PROACTIVE')` 或 `feature('KAIROS')` 时 require `./commands/proactive.js`;当前 dump 缺少该实现文件。[E: commands.ts:62][E: commands.ts:63][E: commands.ts:64][U] | [U] | `COMMANDS` 仅在 `proactive` 非 null 时追加;具体 command metadata 与行为在当前 dump 不可核。[E: commands.ts:323][U] |
| `/brief` | - | `local-jsx` | `feature('KAIROS')` 或 `feature('KAIROS_BRIEF')` 时 require;command 自身要求 GrowthBook config `enable_slash_command`。[E: commands.ts:66][E: commands.ts:67][E: commands.ts:68][E: commands/brief.ts:48][E: commands/brief.ts:52][E: commands/brief.ts:53] | 无显式参数;`immediate: true`。[E: commands/brief.ts:57] | toggle brief-only mode,同步 user message opt-in,并注入下一轮 meta reminder。[E: commands/brief.ts:64][E: commands/brief.ts:87][E: commands/brief.ts:111][E: commands/brief.ts:121] |
| `/assistant` | [U] | [U] | `feature('KAIROS')` 时 require `./commands/assistant/index.js`;当前 dump 缺少该目录。[E: commands.ts:70][E: commands.ts:71][U] | [U] | `COMMANDS` 仅在 `assistantCommand` 非 null 时追加;具体 command metadata 与行为在当前 dump 不可核。[E: commands.ts:325][U] |
| `/remote-control` | `rc` | `local-jsx` | `feature('BRIDGE_MODE')` 时 require `bridge`;command 自身再调用 `isBridgeEnabled()`。[E: commands.ts:73][E: commands.ts:74][E: commands/bridge/index.ts:6][E: commands/bridge/index.ts:9][E: commands/bridge/index.ts:14][E: commands/bridge/index.ts:15] | `[name]`。[E: commands/bridge/index.ts:17] | 通过 AppState 打开或断开 Remote Control bridge 连接。[E: commands/bridge/bridge.tsx:96][E: commands/bridge/bridge.tsx:102][E: commands/bridge/bridge.tsx:196][E: commands/bridge/bridge.tsx:200] |
| `/remote-control-server` | [U] | [U] | `feature('DAEMON') && feature('BRIDGE_MODE')` 时 require `./commands/remoteControlServer/index.js`;当前 dump 缺少该目录。[E: commands.ts:76][E: commands.ts:77][E: commands.ts:78][U] | [U] | `COMMANDS` 仅在 `remoteControlServerCommand` 非 null 时追加;具体 name 与行为在当前 dump 不可核。[E: commands.ts:327][U] |
| `/voice` | - | `local` | `feature('VOICE_MODE')` 时 require `voice`;command availability 是 `claude-ai`,GrowthBook gate 控制启用。[E: commands.ts:80][E: commands.ts:81][E: commands/voice/index.ts:8][E: commands/voice/index.ts:11][E: commands/voice/index.ts:12] | 无显式参数。[E: commands/voice/voice.ts:16] | toggle voice mode,开启前检查 recording、STT/API 和 microphone permission。[E: commands/voice/voice.ts:18][E: commands/voice/voice.ts:64][E: commands/voice/voice.ts:74][E: commands/voice/voice.ts:86][E: commands/voice/voice.ts:99][E: commands/voice/voice.ts:115] |
| `/force-snip` | [U] | [U] | `feature('HISTORY_SNIP')` 时 require `./commands/force-snip.js`;当前 dump 缺少该文件。[E: commands.ts:83][E: commands.ts:84][U] | [U] | `INTERNAL_ONLY_COMMANDS` 与 `COMMANDS` 都只在 `forceSnip` 非 null 时追加;具体 command metadata 与行为不可核。[E: commands.ts:235][E: commands.ts:344][U] |
| `/workflows` | [U] | [U] | `feature('WORKFLOW_SCRIPTS')` 时 require `./commands/workflows/index.js`;当前 dump 缺少该目录。[E: commands.ts:86][E: commands.ts:88][U] | [U] | `COMMANDS` 仅在 `workflowsCmd` 非 null 时追加;同一 feature 还控制 dynamic workflow commands loader。[E: commands.ts:341][E: commands.ts:401][E: commands.ts:403][U] |
| `/web-setup` | - | `local-jsx` | `feature('CCR_REMOTE_SETUP')` 时 require `remote-setup`;command availability 是 `claude-ai`,还要求 `tengu_cobalt_lantern` 和 `allow_remote_sessions` policy。[E: commands.ts:91][E: commands.ts:93][E: commands/remote-setup/index.ts:6][E: commands/remote-setup/index.ts:7][E: commands/remote-setup/index.ts:10][E: commands/remote-setup/index.ts:12][E: commands/remote-setup/index.ts:13] | 无显式参数。[E: commands/remote-setup/remote-setup.tsx:184] | 把本地 GitHub CLI token import 到 Claude Code on the web,创建默认 environment 并打开 web URL。[E: commands/remote-setup/remote-setup.tsx:45][E: commands/remote-setup/remote-setup.tsx:131][E: commands/remote-setup/remote-setup.tsx:144][E: commands/remote-setup/remote-setup.tsx:146][E: commands/remote-setup/remote-setup.tsx:150] |
| `/subscribe-pr` | [U] | [U] | `feature('KAIROS_GITHUB_WEBHOOKS')` 时 require `./commands/subscribe-pr.js`;当前 dump 缺少该文件。[E: commands.ts:101][E: commands.ts:102][U] | [U] | `INTERNAL_ONLY_COMMANDS` 与 `COMMANDS` 都只在 `subscribePr` 非 null 时追加;具体 command metadata 与行为不可核。[E: commands.ts:240][E: commands.ts:344][U] |
| `/ultraplan` | - | `local-jsx` | `feature('ULTRAPLAN')` 时 require `ultraplan`;command 自身在当前 external dump 中 `isEnabled: () => "external" === 'ant'`。[E: commands.ts:104][E: commands.ts:105][E: commands/ultraplan.tsx:462][E: commands/ultraplan.tsx:463][E: commands/ultraplan.tsx:466] | `<prompt>`。[E: commands/ultraplan.tsx:465] | 启动 Claude Code on the web 远端 planning session,注册 `RemoteAgentTask`,并 detached poll approved plan。[E: commands/ultraplan.tsx:292][E: commands/ultraplan.tsx:330][E: commands/ultraplan.tsx:368][E: commands/ultraplan.tsx:382] |
| `/torch` | [U] | [U] | `feature('TORCH')` 时 require `./commands/torch.js`;当前 dump 缺少该文件。[E: commands.ts:107][U] | [U] | `COMMANDS` 仅在 `torch` 非 null 时追加;具体 command metadata 与行为不可核。[E: commands.ts:342][U] |
| `/peers` | [U] | [U] | `feature('UDS_INBOX')` 时 require `./commands/peers/index.js`;当前 dump 缺少该目录。[E: commands.ts:108][E: commands.ts:110][U] | [U] | `COMMANDS` 仅在 `peersCmd` 非 null 时追加;具体 command metadata 与行为不可核。[E: commands.ts:339][U] |
| `/fork` | [U] | [U] | `feature('FORK_SUBAGENT')` 时 require `./commands/fork/index.js`;当前 dump 缺少该目录。[E: commands.ts:113][E: commands.ts:115][U] | [U] | `COMMANDS` 仅在 `forkCmd` 非 null 时追加;同 feature 还使 `/branch` 不再占用 `fork` alias。[E: commands.ts:321][E: commands/branch/index.ts:8][U] |
| `/buddy` | [U] | [U] | `feature('BUDDY')` 时 require `./commands/buddy/index.js`;当前 dump 缺少该目录。[E: commands.ts:118][E: commands.ts:120][U] | [U] | `COMMANDS` 仅在 `buddy` 非 null 时追加;具体 command metadata 与行为不可核。[E: commands.ts:322][U] |

## 复杂命令深挖

### 条件 require 与 COMMANDS 追加

feature-gated command 的注册分两类:top-level `feature()` 先决定变量是否为 command object 或 null;多数 feature-gated command 随后直接用 spread 条件追加进 `COMMANDS`,而 `forceSnip`、`ultraplan`、`subscribePr` 先进入 `INTERNAL_ONLY_COMMANDS`,再由 ant/non-demo 条件整体追加。[E: commands.ts:62][E: commands.ts:66][E: commands.ts:70][E: commands.ts:73][E: commands.ts:80][E: commands.ts:83][E: commands.ts:86][E: commands.ts:91][E: commands.ts:101][E: commands.ts:104][E: commands.ts:107][E: commands.ts:108][E: commands.ts:113][E: commands.ts:118][E: commands.ts:235][E: commands.ts:239][E: commands.ts:240][E: commands.ts:320][E: commands.ts:321][E: commands.ts:322][E: commands.ts:323][E: commands.ts:324][E: commands.ts:325][E: commands.ts:326][E: commands.ts:327][E: commands.ts:328][E: commands.ts:339][E: commands.ts:341][E: commands.ts:342][E: commands.ts:343][E: commands.ts:344]

### `WORKFLOW_SCRIPTS`

`WORKFLOW_SCRIPTS` 控制两个不同入口:一个是 `/workflows` command object 的 conditional require,另一个是 `getWorkflowCommands` dynamic loader,后者在 `loadAllCommands()` 中与 skills、plugins 并行加载并插入到 built-ins 之前。[E: commands.ts:86][E: commands.ts:401][E: commands.ts:454][E: commands.ts:457][E: commands.ts:464][E: commands.ts:467] 当前 dump 中 `commands/workflows/index.js` 缺失,所以 `/workflows` command 具体 metadata 是 unknown。[U]

### 实现缺失的处理

当前源码树中不存在 `commands/force-snip.js`、`commands/workflows/index.js`、`commands/subscribe-pr.js`、`commands/torch.js`、`commands/peers/index.js`、`commands/fork/index.js`、`commands/buddy/index.js`、`commands/proactive.js`、`commands/assistant/index.js`、`commands/remoteControlServer/index.js`。[U] 对这些 entries,本节点只记录 `commands.ts` 的注册事实,不推断 command name、aliases、参数或行为。[I]

## Sources

- `commands.ts`
- `commands/brief.ts`
- `commands/bridge/index.ts`
- `commands/bridge/bridge.tsx`
- `commands/branch/index.ts`
- `commands/remote-setup/index.ts`
- `commands/remote-setup/remote-setup.tsx`
- `commands/voice/index.ts`
- `commands/voice/voice.ts`
- `commands/ultraplan.tsx`

## 相关

- [命令系统机制](../../subsystems/command-system.md)
