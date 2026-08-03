---
id: subsys.tui.keymap
title: TUI Keymap 与两段式快捷键
kind: subsystem
tier: T2
source: [codex-rs/config/src/tui_keymap.rs, codex-rs/tui/src/keymap.rs, codex-rs/tui/src/keymap/bindings.rs, codex-rs/tui/src/keymap/chords.rs, codex-rs/tui/src/keymap_setup.rs, codex-rs/tui/src/keymap_setup/capture.rs, codex-rs/tui/src/app/input.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/chatwidget/keymap_picker.rs]
symbols: [TuiKeymap, RuntimeKeymap, KeymapContext, KeymapActionId, RuntimeChordKeymap, KeyChordMatcher, KeymapCaptureView, App::route_key_chord_event]
related: [config.ui-tui, command.model-mode, subsys.tui.architecture, subsys.tui.event-system, subsys.tui.bottom-pane, subsys.tui.overlays-dialogs]
evidence: explicit
status: verified
updated: 7750465934
---

> TUI keymap 子系统把 `[tui.keymap]` 的持久化配置解析成 context-aware runtime bindings；目标版本同时支持单键和最多两段的 chord，并让 `/keymap` picker 复用同一套解析、冲突校验与在线更新路径。[E: codex-rs/config/src/tui_keymap.rs:406][E: codex-rs/tui/src/keymap.rs:535][E: codex-rs/tui/src/chatwidget/keymap_picker.rs:31]

## 能回答的问题

- `[tui.keymap]` 的 context、action、fallback 与显式 unbind 如何表达？
- `ctrl-x ctrl-s` 怎样被解析、等待、取消并分发到既有 action handler？
- 两段式快捷键为什么不能遮蔽现有单键或使用某些保留键？
- `/keymap` 怎样 capture、校验、持久化并立即刷新 live bindings？

## 配置模型与 runtime resolution

`KeybindingSpec` 保存规范化后的单键或两段 chord；字符串中的空白分隔 stroke，数组表达多个备选 binding 而不是一个 chord，空数组则显式 unbind。解析最多接受两段，并把每段分别 canonicalize 后再用一个空格连接。[E: codex-rs/config/src/tui_keymap.rs:30][E: codex-rs/config/src/tui_keymap.rs:38][E: codex-rs/config/src/tui_keymap.rs:40][E: codex-rs/config/src/tui_keymap.rs:70][E: codex-rs/config/src/tui_keymap.rs:72][E: codex-rs/config/src/tui_keymap.rs:74][E: codex-rs/config/src/tui_keymap.rs:439][E: codex-rs/config/src/tui_keymap.rs:444][E: codex-rs/config/src/tui_keymap.rs:451]

`TuiKeymap` 有 global、chat、composer、editor、三种 Vim、pager、list 和 approval 十个配置 context；对应的 `KeymapContext` 还定义哪些 surface 会同时活跃和发生冲突，只有 Vim contexts 允许 plain-character chord prefix。[E: codex-rs/config/src/tui_keymap.rs:406][E: codex-rs/config/src/tui_keymap.rs:408][E: codex-rs/config/src/tui_keymap.rs:426][E: codex-rs/tui/src/keymap/bindings.rs:14][E: codex-rs/tui/src/keymap/bindings.rs:24][E: codex-rs/tui/src/keymap/bindings.rs:43][E: codex-rs/tui/src/keymap/bindings.rs:50]

`RuntimeKeymap::from_config` 按 context override、支持的 global fallback、built-in defaults 解析完整 snapshot；完成单键冲突校验后，再校验 chord 并把内部 dispatch binding 安装回已有 action binding set。因此 UI handler 只消费 `RuntimeKeymap`，不直接解释 raw config。[E: codex-rs/tui/src/keymap.rs:61][E: codex-rs/tui/src/keymap.rs:535][E: codex-rs/tui/src/keymap.rs:2045][E: codex-rs/tui/src/keymap.rs:2048][E: codex-rs/tui/src/keymap.rs:2051][E: codex-rs/tui/src/keymap.rs:1059][E: codex-rs/tui/src/keymap.rs:1073][E: codex-rs/tui/src/keymap.rs:1075]

## Chord matcher 与分发

`RuntimeChordKeymap` 从有效配置中提取两段 binding，并保留用户声明顺序给 shortcut hints；`KeyChordMatcher` 只有一个 pending prefix，等待窗口固定为 1 秒，context 改变或超时都会清除 pending state。[E: codex-rs/tui/src/keymap/chords.rs:38][E: codex-rs/tui/src/keymap/chords.rs:88][E: codex-rs/tui/src/keymap/chords.rs:93][E: codex-rs/tui/src/keymap/chords.rs:145][E: codex-rs/tui/src/keymap/chords.rs:178][E: codex-rs/tui/src/keymap/chords.rs:187][E: codex-rs/tui/src/keymap/chords.rs:200]

首键命中 prefix 时 matcher 返回 `Pending`；第二键命中返回内部 function-key event，plain `Esc` 返回 `Cancelled`。第二键不匹配时旧 prefix 不会被重放，当前第二键仍可继续作为新的 prefix 或普通 key；实现刻意不缓存普通输入。[E: codex-rs/tui/src/keymap/chords.rs:170][E: codex-rs/tui/src/keymap/chords.rs:187][E: codex-rs/tui/src/keymap/chords.rs:231][E: codex-rs/tui/src/keymap/chords.rs:247][E: codex-rs/tui/src/keymap/chords.rs:264]

完成的 chord 被编码成 `F128..F255` 内部 token，并追加到目标 action 的既有 binding set，从而继续走原 action handlers，而不是建立第二套 dispatch table。[E: codex-rs/tui/src/keymap/chords.rs:28][E: codex-rs/tui/src/keymap/chords.rs:29][E: codex-rs/tui/src/keymap/chords.rs:268][E: codex-rs/tui/src/keymap/chords.rs:293][E: codex-rs/tui/src/keymap/chords.rs:302][E: codex-rs/tui/src/keymap/chords.rs:307]

`App::route_key_chord_event` 根据当前 overlay/composer context 驱动 matcher；pending 时 footer 显示 prefix、等待第二键和 `esc cancel`，timeout 到期由 scheduled frame 清除提示。alternate-screen overlay 只激活 pager context；主聊天 surface 在无 modal/popup 时叠加 global 与 chat contexts。[E: codex-rs/tui/src/app/input.rs:10][E: codex-rs/tui/src/app/input.rs:29][E: codex-rs/tui/src/app/input.rs:33][E: codex-rs/tui/src/app/input.rs:40][E: codex-rs/tui/src/app/input.rs:56][E: codex-rs/tui/src/app/input.rs:72][E: codex-rs/tui/src/app/input.rs:77]

## 冲突与安全约束

chord prefix 不得遮蔽会在重叠 context 中生效的单键；相同 chord 也不能绑定到重叠 context 的不同 action。[E: codex-rs/tui/src/keymap/chords.rs:360][E: codex-rs/tui/src/keymap/chords.rs:365][E: codex-rs/tui/src/keymap/chords.rs:373][E: codex-rs/tui/src/keymap/chords.rs:382][E: codex-rs/tui/src/keymap/chords.rs:387]

非 Vim context 的 character prefix 必须带 Ctrl/Alt，以免截获普通文本；Windows 上可能代表 AltGr 的 Ctrl-Alt character prefix 也会被拒绝。plain `Esc` 保留给取消，Unix 的 `Ctrl-Z` 保留给 suspend，main/list/approval surface 的固定快捷键也参与 reserved-stroke 校验。[E: codex-rs/tui/src/keymap/chords.rs:401][E: codex-rs/tui/src/keymap/chords.rs:405][E: codex-rs/tui/src/keymap/chords.rs:416][E: codex-rs/tui/src/keymap/chords.rs:430][E: codex-rs/tui/src/keymap/chords.rs:437][E: codex-rs/tui/src/keymap/chords.rs:444][E: codex-rs/tui/src/keymap/chords.rs:453]

## `/keymap` 编辑闭环

`/keymap` picker 先用当前 config 重建 `RuntimeKeymap`，无效配置直接显示错误；action menu 再选择 replace/add/remove，capture view 捕获单键或恰好两段 chord，只发出 canonical `KeymapCaptured` event，本身不写 config。[E: codex-rs/tui/src/chatwidget/keymap_picker.rs:31][E: codex-rs/tui/src/chatwidget/keymap_picker.rs:32][E: codex-rs/tui/src/keymap_setup.rs:146][E: codex-rs/tui/src/keymap_setup.rs:210][E: codex-rs/tui/src/keymap_setup.rs:225][E: codex-rs/tui/src/keymap_setup.rs:306][E: codex-rs/tui/src/keymap_setup/capture.rs:27][E: codex-rs/tui/src/keymap_setup/capture.rs:77][E: codex-rs/tui/src/keymap_setup/capture.rs:118][E: codex-rs/tui/src/keymap_setup/capture.rs:144]

app dispatcher 用最新 raw config 与 runtime snapshot 应用 edit，重新执行 `RuntimeKeymap::from_config`；冲突时打开 conflict picker，成功时通过 `ConfigEditsBuilder` 持久化，并同步更新 App、ChatWidget、BottomPane 与 side-thread UI 的 runtime bindings。[E: codex-rs/tui/src/app/event_dispatch.rs:2381][E: codex-rs/tui/src/app/event_dispatch.rs:2388][E: codex-rs/tui/src/app/event_dispatch.rs:2414][E: codex-rs/tui/src/app/event_dispatch.rs:2417][E: codex-rs/tui/src/app/event_dispatch.rs:2425][E: codex-rs/tui/src/app/event_dispatch.rs:2432][E: codex-rs/tui/src/app/event_dispatch.rs:2433][E: codex-rs/tui/src/app/event_dispatch.rs:2437][E: codex-rs/tui/src/chatwidget/keymap_picker.rs:167][E: codex-rs/tui/src/chatwidget/keymap_picker.rs:172][E: codex-rs/tui/src/chatwidget/keymap_picker.rs:177]

## Gotchas

- 用户数组是 alternatives，只有单个字符串内部的空格才形成 chord。[E: codex-rs/config/src/tui_keymap.rs:72][E: codex-rs/config/src/tui_keymap.rs:73][E: codex-rs/config/src/tui_keymap.rs:74]
- chord matcher 不重放已经消费的 prefix；把常用文本键放在非 Vim prefix 会被校验拒绝。[E: codex-rs/tui/src/keymap/chords.rs:187][E: codex-rs/tui/src/keymap/chords.rs:416]
- capture 与配置持久化分层；直接改 `ChatWidget.config.tui_keymap` 会让可见 hint 与 active handler 漂移。[E: codex-rs/tui/src/keymap_setup/capture.rs:144][E: codex-rs/tui/src/app/event_dispatch.rs:2425][E: codex-rs/tui/src/chatwidget/keymap_picker.rs:167]

## Sources

- `codex-rs/config/src/tui_keymap.rs`
- `codex-rs/tui/src/keymap.rs`
- `codex-rs/tui/src/keymap/bindings.rs`
- `codex-rs/tui/src/keymap/chords.rs`
- `codex-rs/tui/src/keymap_setup.rs`
- `codex-rs/tui/src/keymap_setup/capture.rs`
- `codex-rs/tui/src/app/input.rs`
- `codex-rs/tui/src/app/event_dispatch.rs`
- `codex-rs/tui/src/chatwidget/keymap_picker.rs`

## 相关

- `config.ui-tui`: `[tui.keymap]` 的配置入口。
- `command.model-mode`: `/keymap` command catalog。
- `subsys.tui.event-system`: physical key 到 internal dispatch event 的上层路由。
- `subsys.tui.bottom-pane`: picker、capture view 和 composer action handlers。
