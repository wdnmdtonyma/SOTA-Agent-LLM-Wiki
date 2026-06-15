---
id: config.ui-tui
title: UI / TUI / 实时设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/core/src/config/mod.rs, docs/config.md]
symbols: [ConfigToml, Tui, TuiNotificationSettings, RealtimeToml, RealtimeConfig, RealtimeAudioToml]
related: [command.model-mode, command.realtime-debug, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> UI / TUI / 实时设置 catalog 覆盖 `ConfigToml` 中控制 terminal UI rendering、reasoning visibility、realtime voice/audio、realtime websocket overrides 和 paste burst detection 的顶层键。

## 能回答的问题

- `[tui]` nested table 有哪些 notification、animation、alternate screen、status line、theme 设置?
- `hide_agent_reasoning` 与 `show_raw_agent_reasoning` 的默认值是什么?
- realtime websocket base URL、model、backend prompt、startup context、start instructions 分别控制什么?
- `audio.microphone` 和 `audio.speaker` 如何进入 effective config?
- `disable_paste_burst` 默认是否开启?

## Catalog

| key | TOML 类型 | TOML 默认 | 有效配置默认 | 含义与为什么 | 源 |
|---|---|---|---|---|---|
| `tui` | `Option<Tui>` | unset | notification settings default、animations true、tooltips true、alternate screen default、status/title/theme unset。[E: codex-rs/core/src/config/mod.rs:2369][E: codex-rs/core/src/config/mod.rs:2370][E: codex-rs/core/src/config/mod.rs:2371][E: codex-rs/core/src/config/mod.rs:2381][E: codex-rs/core/src/config/mod.rs:2382][E: codex-rs/core/src/config/mod.rs:2383][E: codex-rs/core/src/config/mod.rs:2384] | 聚合 terminal UI 专用设置；nested table 覆盖 notifications、animations、tooltips、alternate screen、status line、terminal title、theme、model availability NUX。[E: codex-rs/config/src/types.rs:540][E: codex-rs/config/src/types.rs:545][E: codex-rs/config/src/types.rs:550][E: codex-rs/config/src/types.rs:561][E: codex-rs/config/src/types.rs:568][E: codex-rs/config/src/types.rs:575][E: codex-rs/config/src/types.rs:582][E: codex-rs/config/src/types.rs:586] | `codex-rs/config/src/config_toml.rs:244` |
| `hide_agent_reasoning` | `Option<bool>` | unset | `false`。[E: codex-rs/core/src/config/mod.rs:2290] | 设为 true 时 UI/output 隐藏 `AgentReasoning` events。[E: codex-rs/config/src/config_toml.rs:246][E: codex-rs/config/src/config_toml.rs:247] | `codex-rs/config/src/config_toml.rs:248` |
| `show_raw_agent_reasoning` | `Option<bool>` | unset | config 或 override 后默认 `false`。[E: codex-rs/core/src/config/mod.rs:2291][E: codex-rs/core/src/config/mod.rs:2293][E: codex-rs/core/src/config/mod.rs:2294] | 设为 true 时 UI/output 展示 `AgentReasoningRawContentEvent` events。[E: codex-rs/config/src/config_toml.rs:250] | `codex-rs/config/src/config_toml.rs:252` |
| `audio` | `Option<RealtimeAudioToml>` | unset | absent 时 `RealtimeAudioConfig::default()`；present 时复制 `microphone` 与 `speaker`。[E: codex-rs/core/src/config/mod.rs:2312][E: codex-rs/core/src/config/mod.rs:2314][E: codex-rs/core/src/config/mod.rs:2315][E: codex-rs/core/src/config/mod.rs:2316] | 保存 realtime voice 的 machine-local audio device preferences。[E: codex-rs/config/src/config_toml.rs:279] | `codex-rs/config/src/config_toml.rs:281` |
| `experimental_realtime_ws_base_url` | `Option<String>` | unset | 直接写入 effective config。[E: codex-rs/core/src/config/mod.rs:2318] | 只覆盖 realtime conversation websocket transport base URL，不改变普通 provider HTTP requests。[E: codex-rs/config/src/config_toml.rs:284][E: codex-rs/config/src/config_toml.rs:286][E: codex-rs/config/src/config_toml.rs:287] | `codex-rs/config/src/config_toml.rs:287` |
| `experimental_realtime_ws_model` | `Option<String>` | unset | 直接写入 effective config。[E: codex-rs/core/src/config/mod.rs:2319] | 选择 realtime websocket model/snapshot。[E: codex-rs/config/src/config_toml.rs:288][E: codex-rs/config/src/config_toml.rs:289][E: codex-rs/config/src/config_toml.rs:290] | `codex-rs/config/src/config_toml.rs:290` |
| `realtime` | `Option<RealtimeToml>` | unset | absent 时 `RealtimeConfig::default()`；present 时逐字段 overlay default version/session type/transport，voice 直接采用配置值。[E: codex-rs/core/src/config/mod.rs:2320][E: codex-rs/core/src/config/mod.rs:2322][E: codex-rs/core/src/config/mod.rs:2325][E: codex-rs/core/src/config/mod.rs:2326][E: codex-rs/core/src/config/mod.rs:2327][E: codex-rs/core/src/config/mod.rs:2328] | 配置 realtime websocket session selection；`version` 控制 v1/v2，`type` 控制 conversational/transcription。[E: codex-rs/config/src/config_toml.rs:291][E: codex-rs/config/src/config_toml.rs:292][E: codex-rs/config/src/config_toml.rs:294] | `codex-rs/config/src/config_toml.rs:294` |
| `experimental_realtime_ws_backend_prompt` | `Option<String>` | unset | 直接写入 effective config。[E: codex-rs/core/src/config/mod.rs:2331] | 只覆盖 realtime conversation websocket transport instructions，不改变普通 prompts。[E: codex-rs/config/src/config_toml.rs:295][E: codex-rs/config/src/config_toml.rs:296][E: codex-rs/config/src/config_toml.rs:297][E: codex-rs/config/src/config_toml.rs:298] | `codex-rs/config/src/config_toml.rs:298` |
| `experimental_realtime_ws_startup_context` | `Option<String>` | unset | 直接写入 effective config。[E: codex-rs/core/src/config/mod.rs:2332] | 替换 websocket session instructions 附加的 synthesized realtime startup context；空字符串禁用 startup context injection。[E: codex-rs/config/src/config_toml.rs:299][E: codex-rs/config/src/config_toml.rs:300][E: codex-rs/config/src/config_toml.rs:301][E: codex-rs/config/src/config_toml.rs:302] | `codex-rs/config/src/config_toml.rs:302` |
| `experimental_realtime_start_instructions` | `Option<String>` | unset | 直接写入 effective config。[E: codex-rs/core/src/config/mod.rs:2333] | 替换 realtime active 时插入 developer messages 的 built-in start instructions；docs 说明它不改变 websocket backend prompt 或 realtime end/inactive message。[E: codex-rs/config/src/config_toml.rs:303][E: codex-rs/config/src/config_toml.rs:304][E: codex-rs/config/src/config_toml.rs:305][E: docs/config.md:106][E: docs/config.md:107][E: docs/config.md:108][E: docs/config.md:109] | `codex-rs/config/src/config_toml.rs:306` |
| `disable_paste_burst` | `Option<bool>` | unset | `false`。[E: codex-rs/core/src/config/mod.rs:2353] | true 时完全关闭 typed input 的 burst-paste detection，字符按接收顺序插入，不做 buffering 或 placeholder replacement。[E: codex-rs/config/src/config_toml.rs:362][E: codex-rs/config/src/config_toml.rs:363][E: codex-rs/config/src/config_toml.rs:364] | `codex-rs/config/src/config_toml.rs:365` |

## TUI nested table

`TuiNotificationSettings` flatten 到 `[tui]`，包含 `notifications`、`notification_method`、`notification_condition`；通知默认 enabled，method 默认 `auto`，condition 默认 `unfocused`。[E: codex-rs/config/src/types.rs:539][E: codex-rs/config/src/types.rs:540][E: codex-rs/config/src/types.rs:513][E: codex-rs/config/src/types.rs:518][E: codex-rs/config/src/types.rs:523][E: codex-rs/config/src/types.rs:466][E: codex-rs/config/src/types.rs:473][E: codex-rs/config/src/types.rs:474][E: codex-rs/config/src/types.rs:493][E: codex-rs/config/src/types.rs:494]

`Tui.alternate_screen` 的 docstring 说明 `auto` 在 Zellij 中禁用 alternate screen、其他环境启用；`always` 总是使用 alternate screen；`never` 保留 scrollback。[E: codex-rs/config/src/types.rs:552][E: codex-rs/config/src/types.rs:554][E: codex-rs/config/src/types.rs:555][E: codex-rs/config/src/types.rs:556] `Tui.status_line` 与 `Tui.terminal_title` 都是 ordered item identifiers，unset 时分别使用 default status line 和 default terminal title item set。[E: codex-rs/config/src/types.rs:563][E: codex-rs/config/src/types.rs:566][E: codex-rs/config/src/types.rs:568][E: codex-rs/config/src/types.rs:570][E: codex-rs/config/src/types.rs:573][E: codex-rs/config/src/types.rs:575]

## Realtime nested table

`RealtimeToml` 的 nested fields 是 optional `version`、optional `type`、optional `transport` 和 optional `voice`。[E: codex-rs/config/src/config_toml.rs:484][E: codex-rs/config/src/config_toml.rs:486][E: codex-rs/config/src/config_toml.rs:487][E: codex-rs/config/src/config_toml.rs:488] Effective `RealtimeConfig` stores non-optional version/session type/transport plus optional voice。[E: codex-rs/config/src/config_toml.rs:474][E: codex-rs/config/src/config_toml.rs:476][E: codex-rs/config/src/config_toml.rs:477][E: codex-rs/config/src/config_toml.rs:478]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/core/src/config/mod.rs`
- `docs/config.md`

## 相关

- [模型与模式 slash command](../slash-commands/model-mode.md) — 覆盖 `/theme`、`/statusline` 等 UI-affecting commands。
- [实时与调试 slash command](../slash-commands/realtime-debug.md) — 覆盖 `/realtime` command。
- [存储/遥测/杂项设置](storage-telemetry-misc.md) — 覆盖 notify、notice、analytics、feedback 等 UI-adjacent settings。
