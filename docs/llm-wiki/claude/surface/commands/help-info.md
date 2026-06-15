---
id: cmd.help-info
title: Help and information command catalog
kind: command
tier: T1
source: [commands.ts, types/command.ts, commands/help/index.ts, commands/status/index.ts, commands/doctor/index.ts, commands/version.ts, commands/release-notes/index.ts]
symbols: [help, status, doctor, version, releaseNotes]
related: [subsys.command-system, group.commands]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Help and information command catalog 覆盖帮助、状态、诊断、版本和 release notes 这类只读信息命令。

## 能回答的问题

- `/help`、`/status`、`/doctor` 各自显示什么？
- `/version` 为什么不是普通外部 command？
- 哪些 help/info commands 支持 non-interactive？
- `/status` 为什么是 immediate？
- `/release-notes` 的 command kind 是什么？

## 清单边界

本节点只覆盖 `cmd.help-info` 分配的 5 个命令。`LocalCommand` command object 通过 `supportsNonInteractive` 表示能否在 non-interactive 环境使用 [E: types/command.ts:76]，并通过 `load()` lazy-load module [E: types/command.ts:77]；`local-jsx` 命令也通过 lazy `load()` 进入 command module [E: types/command.ts:151]。表中 `未声明` 表示当前 command object 没有显式字段，属于局部读源结论 [I]。没有 `availability` 字段的命令在 availability filter 中直接通过 [E: commands.ts:418]。

## Catalog

| 命令 | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
|---|---|---|---|---|---|
| `/help` | 未声明 [I] | `local-jsx` [E: commands/help/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:281] | 未声明 [I] | 显示 help 和 available commands [E: commands/help/index.ts:6]。 |
| `/status` | 未声明 [I] | `local-jsx` [E: commands/status/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:302]; `immediate` [E: commands/status/index.ts:8] | 未声明 [I] | 显示 version、model、account、API connectivity 和 tool statuses [E: commands/status/index.ts:7]。 |
| `/doctor` | 未声明 [I] | `local-jsx` [E: commands/doctor/index.ts:8] | `COMMANDS` builtin entry [E: commands.ts:275]; `DISABLE_DOCTOR_COMMAND` 为真时禁用 [E: commands/doctor/index.ts:7] | 未声明 [I] | 诊断并验证 Claude Code installation and settings [E: commands/doctor/index.ts:6]。 |
| `/version` | 未声明 [I] | `local` [E: commands/version.ts:13] | `INTERNAL_ONLY_COMMANDS` entry [E: commands.ts:238]，仅 `USER_TYPE === 'ant' && !IS_DEMO` 时追加 [E: commands.ts:343] [E: commands.ts:344] [E: commands.ts:345]; command 自身也要求 `USER_TYPE === 'ant'` [E: commands/version.ts:17] | 未声明 [I] | 打印当前 session running version，而不是 autoupdate downloaded version [E: commands/version.ts:16]。 |
| `/release-notes` | 未声明 [I] | `local` [E: commands/release-notes/index.ts:6] | `COMMANDS` builtin entry [E: commands.ts:295]; non-interactive 支持 [E: commands/release-notes/index.ts:7] | 未声明 [I] | 查看 release notes [E: commands/release-notes/index.ts:4]。 |

## 复杂命令深挖

`/status` 是 immediate 的 `local-jsx` 信息面：command object 将 `immediate` 设为 true [E: commands/status/index.ts:8]，并 lazy-load `./status.js` [E: commands/status/index.ts:9]。由于 description 明确包含 version、model、account、API connectivity 和 tool statuses，它是比 `/version` 更宽的状态检查入口 [E: commands/status/index.ts:7]。

`/doctor` 是可禁用的诊断入口：`isEnabled` 直接取反 `DISABLE_DOCTOR_COMMAND` [E: commands/doctor/index.ts:7]，因此环境变量能从 command registry 层隐藏该 command [I]。

`/version` 有双重 ant 限制：它先在 `INTERNAL_ONLY_COMMANDS` 中登记 [E: commands.ts:238]，然后只有 `USER_TYPE === 'ant' && !IS_DEMO` 时 internal list 才会追加到 `COMMANDS` [E: commands.ts:343] [E: commands.ts:344] [E: commands.ts:345]；command 自身还声明 `isEnabled: () => process.env.USER_TYPE === 'ant'` [E: commands/version.ts:17]。实现返回 `MACRO.VERSION`，有 build time 时附带 built timestamp [E: commands/version.ts:6] [E: commands/version.ts:7] [E: commands/version.ts:8]。

## Sources

- commands.ts
- types/command.ts
- commands/help/index.ts
- commands/status/index.ts
- commands/doctor/index.ts
- commands/version.ts
- commands/release-notes/index.ts

## 相关

- [命令系统机制](../../subsystems/command-system.md)
