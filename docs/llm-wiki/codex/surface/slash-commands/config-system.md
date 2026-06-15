---
id: command.config-system
title: 配置与系统命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/feedback/src/lib.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::available_in_side_conversation, SlashCommand::is_visible, CodexFeedback]
related: [config.approval-sandbox, config.ui-tui, config.storage-telemetry-misc, subsys.platform.telemetry-otel, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 配置与系统 slash commands 是 `SlashCommand` enum 中打开状态、debug config、settings、memory、title/statusline/theme-adjacent controls、sandbox setup、logout、feedback 和后台终端控制的 TUI built-in command 子集。

## 能回答的问题

- `/status`、`/debug-config`、`/settings`、`/memories` 等系统命令分别是什么?
- `/setup-default-sandbox` 和 `/sandbox-add-read-dir` 的真实 command string 来自哪里?
- `/ps` 与 `/stop` 是否能在任务运行中使用?
- `/feedback` 的日志 ring buffer 支撑代码在哪里?

## Catalog

| 命令名 | enum variant | 类型 | inline args | during task | side conversation | 默认/门控 | 含义与为什么 | 源 |
|---|---|---|---:|---:|---:|---|---|---|
| `/setup-default-sandbox` | `ElevateSandbox` | built-in slash command | 否 | 否 | 否 | 默认可见 | 设置 elevated agent sandbox；variant 使用 `strum(serialize = "setup-default-sandbox")` 覆盖默认 kebab-case 名称。[E: codex-rs/tui/src/slash_command.rs:19][E: codex-rs/tui/src/slash_command.rs:112][E: codex-rs/tui/src/slash_command.rs:170] | `codex-rs/tui/src/slash_command.rs:20` |
| `/sandbox-add-read-dir` | `SandboxReadRoot` | built-in slash command | 是 | 否 | 否 | 只在 Windows 可见 | 让 sandbox 读取指定 absolute path；`is_visible()` 把它限制为 `cfg!(target_os = "windows")`，`available_during_task()` 对它返回 false，并且 `supports_inline_args()` 允许路径参数。[E: codex-rs/tui/src/slash_command.rs:21][E: codex-rs/tui/src/slash_command.rs:114][E: codex-rs/tui/src/slash_command.rs:171][E: codex-rs/tui/src/slash_command.rs:144][E: codex-rs/tui/src/slash_command.rs:210] | `codex-rs/tui/src/slash_command.rs:22` |
| `/memories` | `Memories` | built-in slash command | 否 | 否 | 否 | 默认可见 | 配置 memory use and generation；memory config 影响上下文/记忆生成，所以任务运行中不可触发。[E: codex-rs/tui/src/slash_command.rs:117][E: codex-rs/tui/src/slash_command.rs:173] | `codex-rs/tui/src/slash_command.rs:24` |
| `/status` | `Status` | built-in slash command | 否 | 是 | 是 | 默认可见 | 显示当前 session configuration 和 token usage；它是只读状态面，所以任务运行中和 side conversation 中可用。[E: codex-rs/tui/src/slash_command.rs:90][E: codex-rs/tui/src/slash_command.rs:185][E: codex-rs/tui/src/slash_command.rs:152] | `codex-rs/tui/src/slash_command.rs:41` |
| `/debug-config` | `DebugConfig` | built-in slash command | 否 | 是 | 否 | 默认可见 | 显示 config layers 和 requirement sources；它是 debug inspection surface，任务运行中可用。[E: codex-rs/tui/src/slash_command.rs:91][E: codex-rs/tui/src/slash_command.rs:186] | `codex-rs/tui/src/slash_command.rs:42` |
| `/title` | `Title` | built-in slash command | 否 | 否 | 否 | 默认可见 | 配置 terminal title 中显示的 items；它打开配置 UI，任务运行中不可触发。[E: codex-rs/tui/src/slash_command.rs:92][E: codex-rs/tui/src/slash_command.rs:204] | `codex-rs/tui/src/slash_command.rs:43` |
| `/statusline` | `Statusline` | built-in slash command | 否 | 否 | 否 | 默认可见 | 配置 status line 中显示的 items；它打开配置 UI，任务运行中不可触发。[E: codex-rs/tui/src/slash_command.rs:93][E: codex-rs/tui/src/slash_command.rs:202] | `codex-rs/tui/src/slash_command.rs:44` |
| `/logout` | `Logout` | built-in slash command | 否 | 否 | 否 | 默认可见 | 登出 Codex；auth 状态切换会影响后续请求，所以任务运行中不可触发。[E: codex-rs/tui/src/slash_command.rs:121][E: codex-rs/tui/src/slash_command.rs:177] | `codex-rs/tui/src/slash_command.rs:49` |
| `/feedback` | `Feedback` | built-in slash command | 否 | 是 | 否 | 默认可见 | 发送 logs to maintainers；feedback writer 把 bytes 推入 ring buffer，snapshot 复制 ring buffer bytes，upload 时可把 logs 作为 Sentry attachment 加入 envelope。[E: codex-rs/tui/src/slash_command.rs:75][E: codex-rs/tui/src/slash_command.rs:192][E: codex-rs/feedback/src/lib.rs:278][E: codex-rs/feedback/src/lib.rs:330][E: codex-rs/feedback/src/lib.rs:444][E: codex-rs/feedback/src/lib.rs:512][E: codex-rs/feedback/src/lib.rs:514] | `codex-rs/tui/src/slash_command.rs:52` |
| `/ps` | `Ps` | built-in slash command | 否 | 是 | 否 | 默认可见 | 列出 background terminals；它是后台终端状态查询，任务运行中可用。[E: codex-rs/tui/src/slash_command.rs:95][E: codex-rs/tui/src/slash_command.rs:187] | `codex-rs/tui/src/slash_command.rs:54` |
| `/stop` | `Stop` | built-in slash command | 否 | 是 | 否 | 默认可见；`/clean` 是 parse alias | 停止所有 background terminals；`strum(to_string = "stop", serialize = "clean")` 让 canonical command 是 `stop`，同时 `clean` 可解析为 `Stop`。[E: codex-rs/tui/src/slash_command.rs:55][E: codex-rs/tui/src/slash_command.rs:96][E: codex-rs/tui/src/slash_command.rs:188][E: codex-rs/tui/src/slash_command.rs:235][E: codex-rs/tui/src/slash_command.rs:240] | `codex-rs/tui/src/slash_command.rs:56` |
| `/settings` | `Settings` | built-in slash command | 否 | 是 | 否 | 默认可见 | 配置 realtime microphone/speaker；源码 description 把它定义为 audio settings 入口，任务运行中可用。[E: codex-rs/tui/src/slash_command.rs:105][E: codex-rs/tui/src/slash_command.rs:199] | `codex-rs/tui/src/slash_command.rs:60` |

## 共性机制

`Status` 是本节点唯一 side-conversation-safe command，因为 side conversation 白名单只列 `Copy`、`Diff`、`Mention` 和 `Status`。[E: codex-rs/tui/src/slash_command.rs:152] `supports_inline_args()` 的白名单列出 `Review`、`Rename`、`Plan`、`Fast`、`Mcp`、`Side`、`Resume` 和 `SandboxReadRoot`；本节点只有 `SandboxReadRoot` 出现在该白名单中。[E: codex-rs/tui/src/slash_command.rs:137][E: codex-rs/tui/src/slash_command.rs:138][E: codex-rs/tui/src/slash_command.rs:139][E: codex-rs/tui/src/slash_command.rs:140][E: codex-rs/tui/src/slash_command.rs:141][E: codex-rs/tui/src/slash_command.rs:142][E: codex-rs/tui/src/slash_command.rs:143][E: codex-rs/tui/src/slash_command.rs:144]

## Sources

- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/feedback/src/lib.rs`

## 相关

- [审批与沙箱设置](../config/approval-sandbox.md) — 覆盖 `/setup-default-sandbox` 和 `/sandbox-add-read-dir` 的配置域。
- [UI / TUI / 实时设置](../config/ui-tui.md) — 覆盖 `/title`、`/statusline`、`/settings` 的配置键。
- [存储/遥测/杂项设置](../config/storage-telemetry-misc.md) — 覆盖 feedback、history、log、telemetry 相关配置。
