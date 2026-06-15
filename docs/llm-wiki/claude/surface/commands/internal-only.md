---
id: cmd.internal-only
path: surface/commands/internal-only.md
title: Internal-only slash commands
kind: command
tier: T1
source: [commands.ts, commands/backfill-sessions/index.js, commands/break-cache/index.js, commands/bughunter/index.js, commands/commit.ts, commands/commit-push-pr.ts, commands/ctx_viz/index.js, commands/good-claude/index.js, commands/issue/index.js, commands/init-verifiers.ts, commands/mock-limits/index.js, commands/bridge-kick.ts, commands/version.ts, commands/reset-limits/index.js, commands/onboarding/index.js, commands/share/index.js, commands/summary/index.js, commands/teleport/index.js, commands/ant-trace/index.js, commands/perf-issue/index.js, commands/env/index.js, commands/oauth-refresh/index.js, commands/debug-tool-call/index.js, commands/autofix-pr/index.js, commands/ultraplan.tsx]
symbols: [INTERNAL_ONLY_COMMANDS, backfillSessions, breakCache, bughunter, commit, commitPushPr, ctx_viz, goodClaude, issue, initVerifiers, forceSnip, mockLimits, bridgeKick, version, ultraplan, subscribePr, resetLimits, resetLimitsNonInteractive, onboarding, share, summary, teleport, antTrace, perfIssue, env, oauthRefresh, debugToolCall, agentsPlatform, autofixPr]
related: [subsys.command-system]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Internal-only 命令 catalog 覆盖 `commands.ts` 的 `INTERNAL_ONLY_COMMANDS` 数组,即 external build 会剔除、但 ant 非 demo 环境会追加到 built-in command surface 的 command entries。

## 能回答的问题

- `INTERNAL_ONLY_COMMANDS` 包含哪些 entry?
- 哪些 internal-only entry 在当前 dump 中只是 disabled hidden stub?
- 哪些 internal-only entry 是真实 prompt/local/local-jsx command?
- internal-only entries 在 `COMMANDS` 数组中何时追加?

## 简介

`INTERNAL_ONLY_COMMANDS` 在 `commands.ts` 中明确标注为 external build 会消除的 commands,并在 `process.env.USER_TYPE === 'ant' && !process.env.IS_DEMO` 时 spread 进 `COMMANDS` 数组。[E: commands.ts:224][E: commands.ts:225][E: commands.ts:343][E: commands.ts:344] 当前 dump 中多项 internal-only implementation 是单行 stub,形态为 `isEnabled: () => false`, `isHidden: true`, `name: 'stub'`;这些 stub 的原始内部行为不可从当前源码核实。[E: commands/backfill-sessions/index.js:1][U]

## 命令清单

| name / entry | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
| --- | --- | --- | --- | --- | --- |
| `backfillSessions` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 1 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:226][E: commands/backfill-sessions/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `breakCache` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 2 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:227][E: commands/break-cache/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `bughunter` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 3 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:228][E: commands/bughunter/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `commit` / `/commit` | - | `prompt` | `INTERNAL_ONLY_COMMANDS` 第 4 项; command name `commit`,source `builtin`。[E: commands.ts:229][E: commands/commit.ts:58][E: commands/commit.ts:59][E: commands/commit.ts:64] | prompt command args 未直接用于 prompt body。[E: commands/commit.ts:65] | 生成 git commit prompt,允许 `git add/status/commit`,并把这些 Bash allow rules 注入 permission context。[E: commands/commit.ts:7][E: commands/commit.ts:8][E: commands/commit.ts:9][E: commands/commit.ts:61][E: commands/commit.ts:67][E: commands/commit.ts:79][E: commands/commit.ts:88] |
| `commitPushPr` / `/commit-push-pr` | - | `prompt` | `INTERNAL_ONLY_COMMANDS` 第 5 项; command name `commit-push-pr`,source `builtin`。[E: commands.ts:230][E: commands/commit-push-pr.ts:109][E: commands/commit-push-pr.ts:110][E: commands/commit-push-pr.ts:118] | args 会追加为 additional instructions。[E: commands/commit-push-pr.ts:128][E: commands/commit-push-pr.ts:130] | 生成 commit、push、PR prompt,允许 git/gh/ToolSearch/Slack tool 相关调用。[E: commands/commit-push-pr.ts:11][E: commands/commit-push-pr.ts:12][E: commands/commit-push-pr.ts:13][E: commands/commit-push-pr.ts:14][E: commands/commit-push-pr.ts:15][E: commands/commit-push-pr.ts:16][E: commands/commit-push-pr.ts:17][E: commands/commit-push-pr.ts:18][E: commands/commit-push-pr.ts:19][E: commands/commit-push-pr.ts:20][E: commands/commit-push-pr.ts:21][E: commands/commit-push-pr.ts:22][E: commands/commit-push-pr.ts:23][E: commands/commit-push-pr.ts:133][E: commands/commit-push-pr.ts:145][E: commands/commit-push-pr.ts:154] |
| `ctx_viz` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 6 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:231][E: commands/ctx_viz/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `goodClaude` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 7 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:232][E: commands/good-claude/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `issue` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 8 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:233][E: commands/issue/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `initVerifiers` / `/init-verifiers` | - | `prompt` | `INTERNAL_ONLY_COMMANDS` 第 9 项; command name `init-verifiers`,source `builtin`。[E: commands.ts:234][E: commands/init-verifiers.ts:4][E: commands/init-verifiers.ts:5][E: commands/init-verifiers.ts:10] | 无 dynamic args in signature; prompt body 是固定 verifier-skill workflow。[E: commands/init-verifiers.ts:11][E: commands/init-verifiers.ts:15] | 返回一段创建 verifier skill 的 multi-phase prompt,要求用 TodoWrite 跟踪进度。[E: commands/init-verifiers.ts:15][E: commands/init-verifiers.ts:19] |
| `forceSnip` / [U] | [U] | [U] | `feature('HISTORY_SNIP')` 命中时才进入 internal list;当前 dump 缺少 `commands/force-snip.js`。[E: commands.ts:83][E: commands.ts:235][U] | [U] | 具体 command metadata 与行为不可核。[U] |
| `mockLimits` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 11 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:236][E: commands/mock-limits/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `bridgeKick` / `/bridge-kick` | - | `local` | `INTERNAL_ONLY_COMMANDS` 第 12 项; command name `bridge-kick`,只在 `USER_TYPE === 'ant'` 启用。[E: commands.ts:237][E: commands/bridge-kick.ts:192][E: commands/bridge-kick.ts:193][E: commands/bridge-kick.ts:195] | `<subcommand>`;usage 字符串列出 close/poll/register/reconnect-session/heartbeat/reconnect/status。[E: commands/bridge-kick.ts:40][E: commands/bridge-kick.ts:61] | 注入 bridge debug faults 或强制 reconnect/status,用于手动测试 Remote Control recovery path。[E: commands/bridge-kick.ts:52][E: commands/bridge-kick.ts:69][E: commands/bridge-kick.ts:102][E: commands/bridge-kick.ts:132][E: commands/bridge-kick.ts:175][E: commands/bridge-kick.ts:183] |
| `version` / `/version` | - | `local` | `INTERNAL_ONLY_COMMANDS` 第 13 项; command name `version`,只在 `USER_TYPE === 'ant'` 启用。[E: commands.ts:238][E: commands/version.ts:13][E: commands/version.ts:14][E: commands/version.ts:17] | 无显式参数。[E: commands/version.ts:3] | 返回 `MACRO.VERSION` 或带 build time 的版本文本。[E: commands/version.ts:6][E: commands/version.ts:8] |
| `ultraplan` / `/ultraplan` | - | `local-jsx` | `feature('ULTRAPLAN')` 命中时才进入 internal list; command name `ultraplan`,当前 external dump 中 `isEnabled` 恒等于 false。[E: commands.ts:104][E: commands.ts:239][E: commands/ultraplan.tsx:462][E: commands/ultraplan.tsx:463][E: commands/ultraplan.tsx:466] | `<prompt>`。[E: commands/ultraplan.tsx:465] | 启动 web remote planning session,注册 remote task 并 detached poll approved plan。[E: commands/ultraplan.tsx:292][E: commands/ultraplan.tsx:330][E: commands/ultraplan.tsx:368][E: commands/ultraplan.tsx:382] |
| `subscribePr` / [U] | [U] | [U] | `feature('KAIROS_GITHUB_WEBHOOKS')` 命中时才进入 internal list;当前 dump 缺少 `commands/subscribe-pr.js`。[E: commands.ts:101][E: commands.ts:240][U] | [U] | 具体 command metadata 与行为不可核。[U] |
| `resetLimits` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 16 项;当前 dump named export `resetLimits` 指向 stub。[E: commands.ts:241][E: commands/reset-limits/index.js:1][E: commands/reset-limits/index.js:3] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `resetLimitsNonInteractive` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 17 项;当前 dump named export `resetLimitsNonInteractive` 指向 stub。[E: commands.ts:242][E: commands/reset-limits/index.js:1][E: commands/reset-limits/index.js:4] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `onboarding` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 18 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:243][E: commands/onboarding/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `share` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 19 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:244][E: commands/share/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `summary` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 20 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:245][E: commands/summary/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `teleport` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 21 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:246][E: commands/teleport/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `antTrace` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 22 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:247][E: commands/ant-trace/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `perfIssue` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 23 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:248][E: commands/perf-issue/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `env` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 24 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:249][E: commands/env/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `oauthRefresh` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 25 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:250][E: commands/oauth-refresh/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `debugToolCall` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 26 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:251][E: commands/debug-tool-call/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |
| `agentsPlatform` / [U] | [U] | [U] | `USER_TYPE === 'ant'` 时 require `./commands/agents-platform/index.js`;当前 dump 缺少该目录。[E: commands.ts:48][E: commands.ts:50][E: commands.ts:252][U] | [U] | 具体 command metadata 与行为不可核。[U] |
| `autofixPr` / runtime `stub` | - | stub object | `INTERNAL_ONLY_COMMANDS` 第 28 项;当前 dump object disabled + hidden + name `stub`。[E: commands.ts:253][E: commands/autofix-pr/index.js:1] | [U] | 原内部行为在当前 dump 不可核;stub 不会启用。[U] |

## 复杂命令深挖

### external build elimination 与 ant-only append

`INTERNAL_ONLY_COMMANDS` 不是普通 hidden list;源码注释直接说明这些 commands 会从 external build 中 eliminated,而 `COMMANDS` 只有在 `USER_TYPE === 'ant'` 且不是 demo 时才把整个 internal list 追加进 built-in surface。[E: commands.ts:224][E: commands.ts:343][E: commands.ts:344] 因此 internal-only table 的 registry entry 不能等同于普通用户可见 slash command。[I]

### stub dump 的含义

当前源码 dump 对许多 internal-only entries 只保留 disabled hidden stub,例如 `backfill-sessions`、`break-cache`、`bughunter`、`ctx_viz`、`good-claude`、`issue`、`mock-limits` 等目录都只有 `name: 'stub'` 的对象。[E: commands/backfill-sessions/index.js:1][E: commands/break-cache/index.js:1][E: commands/bughunter/index.js:1][E: commands/ctx_viz/index.js:1][E: commands/good-claude/index.js:1][E: commands/issue/index.js:1][E: commands/mock-limits/index.js:1] 这些 entry 的真实内部 command name、参数和行为在当前 dump 中不可核,所以本 catalog 不补写推测行为。[U]

### 仍有真实实现的 internal-only commands

`commit`、`commit-push-pr`、`init-verifiers`、`bridge-kick`、`version` 和 `ultraplan` 在当前 dump 中有可读实现。`commit`/`commit-push-pr` 是 prompt commands,通过 `executeShellCommandsInPrompt()` 将 shell-expanded context 注入最终 prompt;`bridge-kick` 与 `version` 是 local commands;`ultraplan` 是 local-jsx command。[E: commands/commit.ts:58][E: commands/commit.ts:67][E: commands/commit-push-pr.ts:109][E: commands/commit-push-pr.ts:133][E: commands/init-verifiers.ts:4][E: commands/bridge-kick.ts:192][E: commands/version.ts:13][E: commands/ultraplan.tsx:462]

## Sources

- `commands.ts`
- `commands/backfill-sessions/index.js`
- `commands/break-cache/index.js`
- `commands/bughunter/index.js`
- `commands/commit.ts`
- `commands/commit-push-pr.ts`
- `commands/ctx_viz/index.js`
- `commands/good-claude/index.js`
- `commands/issue/index.js`
- `commands/init-verifiers.ts`
- `commands/mock-limits/index.js`
- `commands/bridge-kick.ts`
- `commands/version.ts`
- `commands/reset-limits/index.js`
- `commands/onboarding/index.js`
- `commands/share/index.js`
- `commands/summary/index.js`
- `commands/teleport/index.js`
- `commands/ant-trace/index.js`
- `commands/perf-issue/index.js`
- `commands/env/index.js`
- `commands/oauth-refresh/index.js`
- `commands/debug-tool-call/index.js`
- `commands/autofix-pr/index.js`
- `commands/ultraplan.tsx`

## 相关

- [命令系统机制](../../subsystems/command-system.md)
