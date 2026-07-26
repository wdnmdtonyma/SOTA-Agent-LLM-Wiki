---
id: config.ui-tui
title: UI / TUI / 实时设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/protocol/src/config_types.rs]
symbols: [config::Tui, TuiNotificationSettings, RealtimeToml, RealtimeAudioToml, SessionPickerViewMode, ResumeCwdMode]
related: [command.model-mode, command.realtime-debug, config.storage-telemetry-misc, subsys.core.realtime-conversation]
evidence: explicit
status: verified
updated: 61a44880a8
---

> UI / TUI / 实时设置 catalog 覆盖 ConfigToml 中 terminal UI, reasoning visibility, realtime audio/session/websocket/WebRTC overrides and paste burst detection 的顶层键。

## 能回答的问题

- tui、hide/show reasoning 和 paste burst detection 的 schema fields 是什么？
- realtime audio、websocket base URL、WebRTC call base URL 和 model override 分别是哪几个 key？
- realtime nested table 和 backend/startup/start instructions 如何声明？
- Tui nested struct 当前有哪些新增字段？

## Catalog 边界

当前 `ConfigToml` 有 96 个顶层 `pub` 字段；本节点覆盖其中 12 个。8 个 surface/config catalog 节点合计覆盖全部 96 个字段且不重复。[I]

`Tui` contains notifications, animations, tooltips, vim/raw output mode, alternate screen, status line, status-line colors, terminal title, theme, pet, pet anchor, session picker view, resume cwd policy, keymap, model availability NUX, and terminal resize-reflow cap settings.[E: codex-rs/config/src/types.rs:692][E: codex-rs/config/src/types.rs:694][E: codex-rs/config/src/types.rs:699][E: codex-rs/config/src/types.rs:704][E: codex-rs/config/src/types.rs:709][E: codex-rs/config/src/types.rs:714][E: codex-rs/config/src/types.rs:722][E: codex-rs/config/src/types.rs:729][E: codex-rs/config/src/types.rs:734][E: codex-rs/config/src/types.rs:743][E: codex-rs/config/src/types.rs:750][E: codex-rs/config/src/types.rs:756][E: codex-rs/config/src/types.rs:762][E: codex-rs/config/src/types.rs:766][E: codex-rs/config/src/types.rs:771][E: codex-rs/config/src/types.rs:778][E: codex-rs/config/src/types.rs:782][E: codex-rs/config/src/types.rs:789]

`ResumeCwdMode` serializes as kebab-case `current` or `session`; when `[tui].resume_cwd` is unset, runtime may prompt if launch cwd differs from the selected session cwd。[E: codex-rs/config/src/types.rs:87][E: codex-rs/config/src/types.rs:88][E: codex-rs/config/src/types.rs:90][E: codex-rs/config/src/types.rs:92][E: codex-rs/config/src/types.rs:771]

## 字段 catalog

| key | Rust type | serde/schema attrs | 源码注释摘要 | Evidence |
|---|---|---|---|---|
| `tui` | `Option<Tui>` | none | Collection of settings that are specific to the TUI. | [E: codex-rs/config/src/config_toml.rs:336] |
| `hide_agent_reasoning` | `Option<bool>` | `#[serde(default = "default_hide_agent_reasoning")]` | When set to `true`, `AgentReasoning` events will be hidden from the UI/output. Defaults to `false`. | [E: codex-rs/config/src/config_toml.rs:340][E: codex-rs/config/src/config_toml.rs:341] |
| `show_raw_agent_reasoning` | `Option<bool>` | none | When set to `true`, `AgentReasoningRawContentEvent` events will be shown in the UI/output. Defaults to `false`. | [E: codex-rs/config/src/config_toml.rs:345] |
| `audio` | `Option<RealtimeAudioToml>` | `#[serde(default)]` | Machine-local realtime audio device preferences used by realtime voice. | [E: codex-rs/config/src/config_toml.rs:377][E: codex-rs/config/src/config_toml.rs:378] |
| `experimental_realtime_ws_base_url` | `Option<String>` | none | Experimental / do not use. Overrides only the realtime conversation websocket transport base URL (the `Op::RealtimeConversation` `/v1/realtime` connection) without changing norm... | [E: codex-rs/config/src/config_toml.rs:384] |
| `experimental_realtime_webrtc_call_base_url` | `Option<String>` | none | Experimental / do not use. Overrides only the WebRTC realtime call creation base URL. This is separate from `experimental_realtime_ws_base_url` because WebRTC call creation is H... | [E: codex-rs/config/src/config_toml.rs:388] |
| `experimental_realtime_ws_model` | `Option<String>` | none | Experimental / do not use. Selects the realtime websocket model/snapshot used for the `Op::RealtimeConversation` connection. | [E: codex-rs/config/src/config_toml.rs:391] |
| `realtime` | `Option<RealtimeToml>` | `#[serde(default)]` | Experimental / do not use. Realtime websocket session selection. `version` controls v1/v2 and `type` controls conversational/transcription. | [E: codex-rs/config/src/config_toml.rs:394][E: codex-rs/config/src/config_toml.rs:395] |
| `experimental_realtime_ws_backend_prompt` | `Option<String>` | none | Experimental / do not use. Overrides only the realtime conversation websocket transport instructions (the `Op::RealtimeConversation` `/ws` session.update instructions) without c... | [E: codex-rs/config/src/config_toml.rs:399] |
| `experimental_realtime_ws_startup_context` | `Option<String>` | none | Experimental / do not use. Replaces the synthesized realtime startup context appended to websocket session instructions. An empty string disables startup context injection entir... | [E: codex-rs/config/src/config_toml.rs:403] |
| `experimental_realtime_start_instructions` | `Option<String>` | none | Experimental / do not use. Replaces the built-in realtime start instructions inserted into developer messages when realtime becomes active. | [E: codex-rs/config/src/config_toml.rs:407] |
| `disable_paste_burst` | `Option<bool>` | none | When true, disables burst-paste detection for typed input entirely. All characters are inserted as they are received, and no buffering or placeholder replacement will occur for ... | [E: codex-rs/config/src/config_toml.rs:478] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/protocol/src/config_types.rs`

## 相关

- `command.model-mode`
- `command.realtime-debug`
- `config.storage-telemetry-misc`
- `subsys.core.realtime-conversation`
