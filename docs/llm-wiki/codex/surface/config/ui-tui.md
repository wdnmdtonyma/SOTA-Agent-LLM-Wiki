---
id: config.ui-tui
title: UI / TUI / 实时设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/tui_keymap.rs, codex-rs/config/src/tui_rendering.rs, codex-rs/protocol/src/config_types.rs]
symbols: [config::Tui, TuiNotificationSettings, RealtimeToml, RealtimeAudioToml, SessionPickerViewMode, ResumeCwdMode, KeybindingSpec]
related: [command.model-mode, command.realtime-debug, config.storage-telemetry-misc, subsys.core.realtime-conversation, subsys.tui.keymap]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> UI / TUI / 实时设置 catalog 覆盖 ConfigToml 中 terminal UI, reasoning visibility, realtime audio/session/websocket/WebRTC overrides and paste burst detection 的顶层键。

## 能回答的问题

- tui、hide/show reasoning 和 paste burst detection 的 schema fields 是什么？
- realtime audio、websocket base URL、WebRTC call base URL 和 model override 分别是哪几个 key？
- realtime nested table 和 backend/startup/start instructions 如何声明？
- Tui nested struct 当前有哪些新增字段？

## Catalog 边界

当前 `ConfigToml` 有 **104** 个顶层 `pub` 字段；本节点覆盖其中 **12** 个。8 个 surface/config catalog 节点合计覆盖全部 104 个字段且不重复。[E: codex-rs/config/src/config_toml.rs:165][E: codex-rs/config/src/config_toml.rs:557]

`Tui` fields: `notification_settings`, `animations`, `screen_reader_detection_done`, `effects`, `rendering` (含 mermaid), `show_tooltips`, `show_server_version_notice`, `auto_recap`, nested `disable_paste_burst` (overrides the legacy top-level key; when true, disables burst-paste detection for typed input entirely), `vim_mode_default`, `question_esc_back`, `raw_output_mode`, `fullscreen_transcript`, `copy_on_select`, `right_click_paste`, `alternate_screen`, `status_line`, `status_line_use_colors`, `terminal_title`, `theme`, `pet`, `pet_anchor`, `session_picker_view`, `resume_cwd`, `keymap`, `model_availability_nux`, `terminal_resize_reflow_max_rows`.[E: codex-rs/config/src/types.rs:805][E: codex-rs/config/src/types.rs:810][E: codex-rs/config/src/types.rs:813][E: codex-rs/config/src/types.rs:817][E: codex-rs/config/src/types.rs:821][E: codex-rs/config/src/types.rs:826][E: codex-rs/config/src/types.rs:831][E: codex-rs/config/src/types.rs:836][E: codex-rs/config/src/types.rs:842][E: codex-rs/config/src/types.rs:847][E: codex-rs/config/src/types.rs:851][E: codex-rs/config/src/types.rs:856][E: codex-rs/config/src/types.rs:861][E: codex-rs/config/src/types.rs:868][E: codex-rs/config/src/types.rs:874][E: codex-rs/config/src/types.rs:882][E: codex-rs/config/src/types.rs:889][E: codex-rs/config/src/types.rs:894][E: codex-rs/config/src/types.rs:903][E: codex-rs/config/src/types.rs:910][E: codex-rs/config/src/types.rs:916][E: codex-rs/config/src/types.rs:922][E: codex-rs/config/src/types.rs:926][E: codex-rs/config/src/types.rs:931][E: codex-rs/config/src/types.rs:938][E: codex-rs/config/src/types.rs:942][E: codex-rs/config/src/types.rs:949]

`Tui.rendering` 是 `TuiRendering`：`mermaid` / `math` / `tables` / `lists` 四个 bool，默认全 true。Mermaid 在 TUI markdown 中于 `mermaid` 为 true 且 fence 闭合时渲染；关闭时保留源码 fence。[E: codex-rs/config/src/tui_rendering.rs:11][E: codex-rs/config/src/tui_rendering.rs:13][E: codex-rs/config/src/tui_rendering.rs:25][E: codex-rs/config/src/types.rs:821]

`ResumeCwdMode` serializes as kebab-case `current` or `session`; when `[tui].resume_cwd` is unset, runtime may prompt if launch cwd differs from the selected session cwd。[E: codex-rs/config/src/types.rs:95][E: codex-rs/config/src/types.rs:98][E: codex-rs/config/src/types.rs:100][E: codex-rs/config/src/types.rs:931]

### `[tui.keymap]`

`Tui.keymap` 是非 optional 的 `TuiKeymap`，默认为空 override snapshot；其 global/chat/composer/editor/Vim/pager/list/agents/approval 子表中每个 action 都接受单个 binding string 或 alternatives array。空 array 表示显式 unbind，不继续 fallback 到 global 或 built-in default。[E: codex-rs/config/src/types.rs:938][E: codex-rs/config/src/tui_keymap.rs:70][E: codex-rs/config/src/tui_keymap.rs:72][E: codex-rs/config/src/tui_keymap.rs:74][E: codex-rs/config/src/tui_keymap.rs:502][E: codex-rs/config/src/tui_keymap.rs:524][E: codex-rs/config/src/tui_keymap.rs:526]

binding string 现在可包含一个单键或最多两段的 chord，例如 `ctrl-x ctrl-s`；配置反序列化时分别规范化每个 stroke，超过两段直接拒绝。context precedence、runtime conflict、reserved key 与 `/keymap` capture/persistence 属于 `subsys.tui.keymap`。[E: codex-rs/config/src/tui_keymap.rs:30][E: codex-rs/config/src/tui_keymap.rs:40][E: codex-rs/config/src/tui_keymap.rs:539][E: codex-rs/config/src/tui_keymap.rs:544]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `tui` | `Option<Tui>` | none | Collection of settings that are specific to the TUI. | [E: codex-rs/config/src/config_toml.rs:380] |
| `hide_agent_reasoning` | `Option<bool>` | `#[serde(default = "default_hide_agent_reasoning")]` | When set to `true`, `AgentReasoning` events will be hidden from the UI/output. Defaults to `false`. | [E: codex-rs/config/src/config_toml.rs:385] |
| `show_raw_agent_reasoning` | `Option<bool>` | none | When set to `true`, `AgentReasoningRawContentEvent` events will be shown in the UI/output. Defaults to `false`. | [E: codex-rs/config/src/config_toml.rs:389] |
| `audio` | `Option<RealtimeAudioToml>` | `#[serde(default)]` | Machine-local realtime audio device preferences used by realtime voice. | [E: codex-rs/config/src/config_toml.rs:428] |
| `experimental_realtime_ws_base_url` | `Option<String>` | none | Experimental / do not use. Overrides only the realtime conversation websocket transport base URL (the `Op::RealtimeConversation` `/v1/realtime` connection) without changing norm... | [E: codex-rs/config/src/config_toml.rs:434] |
| `experimental_realtime_webrtc_call_base_url` | `Option<String>` | none | Experimental / do not use. Overrides only the WebRTC realtime call creation base URL. This is separate from `experimental_realtime_ws_base_url` because WebRTC call creation is H... | [E: codex-rs/config/src/config_toml.rs:438] |
| `experimental_realtime_ws_model` | `Option<String>` | none | Experimental / do not use. Selects the realtime websocket model/snapshot used for the `Op::RealtimeConversation` connection. | [E: codex-rs/config/src/config_toml.rs:441] |
| `realtime` | `Option<RealtimeToml>` | `#[serde(default)]` | Experimental / do not use. Realtime websocket session selection. `version` controls v1/v2 and `type` controls conversational/transcription. | [E: codex-rs/config/src/config_toml.rs:445] |
| `experimental_realtime_ws_backend_prompt` | `Option<String>` | none | Experimental / do not use. Overrides only the realtime conversation websocket transport instructions (the `Op::RealtimeConversation` `/ws` session.update instructions) without c... | [E: codex-rs/config/src/config_toml.rs:449] |
| `experimental_realtime_ws_startup_context` | `Option<String>` | none | Experimental / do not use. Replaces the synthesized realtime startup context appended to websocket session instructions. An empty string disables startup context injection entir... | [E: codex-rs/config/src/config_toml.rs:453] |
| `experimental_realtime_start_instructions` | `Option<String>` | none | Experimental / do not use. Replaces the built-in realtime start instructions inserted into developer messages when realtime becomes active. | [E: codex-rs/config/src/config_toml.rs:457] |
| `disable_paste_burst` | `Option<bool>` | none | Legacy fallback for `[tui].disable_paste_burst`. Prefer the nested TUI setting; that nested field is what fully disables burst-paste detection for typed input. | [E: codex-rs/config/src/config_toml.rs:525] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/config/src/tui_keymap.rs`
- `codex-rs/config/src/tui_rendering.rs`
- `codex-rs/protocol/src/config_types.rs`

## 相关

- `command.model-mode`
- `command.realtime-debug`
- `config.storage-telemetry-misc`
- `subsys.core.realtime-conversation`
- `subsys.tui.keymap`
