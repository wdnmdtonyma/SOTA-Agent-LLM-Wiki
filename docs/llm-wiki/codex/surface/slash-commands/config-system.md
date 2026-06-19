---
id: command.config-system
title: 配置与系统命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::available_in_side_conversation, SlashCommand::is_visible, built_in_slash_commands]
related: [config.approval-sandbox, config.ui-tui, config.storage-telemetry-misc, subsys.platform.telemetry-otel, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 5670360009
---

> 配置与系统 slash commands 是 `SlashCommand` enum 中负责 sandbox setup、memory settings、status/usage/debug views、title/statusline controls、logout、feedback 和 background terminal management 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:7][E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:81]

## 能回答的问题

- `/setup-default-sandbox` 和 `/sandbox-add-read-dir` 的 command string 从哪里来?
- `/status`、`/usage`、`/debug-config`、`/title`、`/statusline` 当前是否可在 task 中使用?
- `/ps` 与 `/stop` 是否仍是 background terminal controls?
- `/sandbox-add-read-dir` 的平台门控是什么?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:146][E: codex-rs/tui/src/slash_command.rs:148][E: codex-rs/tui/src/slash_command.rs:149][E: codex-rs/tui/src/slash_command.rs:257][E: codex-rs/tui/src/slash_command.rs:258][E: codex-rs/tui/src/slash_command.rs:259][E: codex-rs/tui/src/slash_command.rs:260][E: codex-rs/tui/src/slash_command.rs:261][E: codex-rs/tui/src/slash_command.rs:262]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:152][E: codex-rs/tui/src/slash_command.rs:153][E: codex-rs/tui/src/slash_command.rs:154][E: codex-rs/tui/src/slash_command.rs:156][E: codex-rs/tui/src/slash_command.rs:169][E: codex-rs/tui/src/slash_command.rs:173][E: codex-rs/tui/src/slash_command.rs:174][E: codex-rs/tui/src/slash_command.rs:175][E: codex-rs/tui/src/slash_command.rs:177][E: codex-rs/tui/src/slash_command.rs:184]

| 命令名 | enum variant | description | inline args | during task | side conversation | visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/setup-default-sandbox` | `ElevateSandbox` | set up elevated agent sandbox | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:202] | 否 | default visible [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:20][E: codex-rs/tui/src/slash_command.rs:21][E: codex-rs/tui/src/slash_command.rs:130] |
| `/sandbox-add-read-dir` | `SandboxReadRoot` | let sandbox read a directory: /sandbox-add-read-dir <absolute_path> | 是 [E: codex-rs/tui/src/slash_command.rs:169] | 否 [E: codex-rs/tui/src/slash_command.rs:203] | 否 | Windows only [E: codex-rs/tui/src/slash_command.rs:248] | [E: codex-rs/tui/src/slash_command.rs:22][E: codex-rs/tui/src/slash_command.rs:23][E: codex-rs/tui/src/slash_command.rs:131][E: codex-rs/tui/src/slash_command.rs:132] |
| `/memories` | `Memories` | configure memory use and generation | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:205] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:27][E: codex-rs/tui/src/slash_command.rs:136] |
| `/status` | `Status` | show current session configuration and token usage | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:220] | 是 [E: codex-rs/tui/src/slash_command.rs:181] | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:50][E: codex-rs/tui/src/slash_command.rs:105] |
| `/usage` | `Usage` | view account usage or use a rate-limit reset | 是 [E: codex-rs/tui/src/slash_command.rs:164] | 是 [E: codex-rs/tui/src/slash_command.rs:221] | 是 [E: codex-rs/tui/src/slash_command.rs:182] | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:51][E: codex-rs/tui/src/slash_command.rs:106] |
| `/debug-config` | `DebugConfig` | show config layers and requirement sources for debugging | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:222] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:52][E: codex-rs/tui/src/slash_command.rs:107] |
| `/title` | `Title` | configure which items appear in the terminal title | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:230] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:53][E: codex-rs/tui/src/slash_command.rs:108] |
| `/statusline` | `Statusline` | configure which items appear in the status line | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:231] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:54][E: codex-rs/tui/src/slash_command.rs:109] |
| `/logout` | `Logout` | log out of Codex | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:210] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:61][E: codex-rs/tui/src/slash_command.rs:140] |
| `/feedback` | `Feedback` | send logs to maintainers | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:233] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:64][E: codex-rs/tui/src/slash_command.rs:85] |
| `/ps` | `Ps` | list background terminals | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:223] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:66][E: codex-rs/tui/src/slash_command.rs:112] |
| `/stop` | `Stop` | stop all background terminals | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:224] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:67][E: codex-rs/tui/src/slash_command.rs:68][E: codex-rs/tui/src/slash_command.rs:113] |

## Sources

- `codex-rs/tui/src/slash_command.rs`

## 相关

- [config.approval-sandbox](../config/approval-sandbox.md)
- [config.ui-tui](../config/ui-tui.md)
- [config.storage-telemetry-misc](../config/storage-telemetry-misc.md)
- [subsys.platform.telemetry-otel](../../subsystems/platform/telemetry-otel.md)
- [subsys.core.unified-exec](../../subsystems/core/unified-exec.md)
