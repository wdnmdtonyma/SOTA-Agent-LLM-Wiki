---
id: ui.settings
title: UI Settings 组件族
kind: subsystem
tier: T2
source: [components/Settings/, components/InvalidSettingsDialog.tsx, components/InvalidConfigDialog.tsx, components/ThemePicker.tsx, components/OutputStylePicker.tsx, components/LanguagePicker.tsx, components/ModelPicker.tsx, components/ChannelDowngradeDialog.tsx, components/ClaudeMdExternalIncludesDialog.tsx]
symbols: [Settings, Config, Status, Usage, InvalidSettingsDialog, InvalidConfigDialog, ThemePicker, OutputStylePicker, LanguagePicker, ModelPicker, ChannelDowngradeDialog, ClaudeMdExternalIncludesDialog]
related: [subsys.ui-components, subsys.config-settings, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.settings` 是 settings/config/status/usage 入口和设置相关散 dialog 的 Ink UI 组件族。[I]

## 能回答的问题
- `/settings` 主 pane 怎样组织 Status、Config、Usage tabs?
- Config tab 写哪些 setting,哪些同步 AppState?
- invalid config、theme、model、language、output style 等散组件应该归入哪里?

## 族干什么
`Settings` 把 Status、Config 和 Usage 三个 `Tab` 放进 `Pane` + `Tabs` shell,并把 `confirm:no` 绑定到调用 `onClose` 的 close flow。[E: components/Settings/Settings.tsx:46][E: components/Settings/Settings.tsx:69][E: components/Settings/Settings.tsx:72][E: components/Settings/Settings.tsx:81][E: components/Settings/Settings.tsx:91][E: components/Settings/Settings.tsx:119] `Config` 用 terminal rows 计算 `paneCap`,通过 `useSearchInput` 做搜索,维护 `settingsItems`,并提供 save/revert/keybinding flows。[E: components/Settings/Config.tsx:118][E: components/Settings/Config.tsx:182][E: components/Settings/Config.tsx:264][E: components/Settings/Config.tsx:1087][E: components/Settings/Config.tsx:1179][E: components/Settings/Config.tsx:1268][E: components/Settings/Config.tsx:1274]

## 成员清单
| component | 文件 | 渲染什么 |
| --- | --- | --- |
| `Settings` | `components/Settings/Settings.tsx` | settings modal 的三 tab shell。[E: components/Settings/Settings.tsx:72][E: components/Settings/Settings.tsx:81][E: components/Settings/Settings.tsx:91][E: components/Settings/Settings.tsx:119] |
| `Config` | `components/Settings/Config.tsx` | searchable settings editor,包含 default permission mode、IDE auto-connect、remote control、external includes 和 API key settings。[E: components/Settings/Config.tsx:495][E: components/Settings/Config.tsx:837][E: components/Settings/Config.tsx:931][E: components/Settings/Config.tsx:977][E: components/Settings/Config.tsx:992][E: components/Settings/Config.tsx:1048] |
| `Status` | `components/Settings/Status.tsx` | status page 的 secondary section 包含 Model、IDE、MCP、Sandbox 和 setting sources。[E: components/Settings/Status.tsx:48][E: components/Settings/Status.tsx:52][E: components/Settings/Status.tsx:120] |
| `Usage` | `components/Settings/Usage.tsx` | utilization state、loading state 和 current session/week limit bars。[E: components/Settings/Usage.tsx:175][E: components/Settings/Usage.tsx:177][E: components/Settings/Usage.tsx:224][E: components/Settings/Usage.tsx:238][E: components/Settings/Usage.tsx:241][E: components/Settings/Usage.tsx:255] |
| `InvalidSettingsDialog` | `components/InvalidSettingsDialog.tsx` | settings validation error dialog,提示错误文件会被整体跳过。[E: components/InvalidSettingsDialog.tsx:18][E: components/InvalidSettingsDialog.tsx:51][E: components/InvalidSettingsDialog.tsx:79] |
| `InvalidConfigDialog` | `components/InvalidConfigDialog.tsx` | invalid JSON config dialog,使用 safe error theme 并提供 reset option。[E: components/InvalidConfigDialog.tsx:51][E: components/InvalidConfigDialog.tsx:87][E: components/InvalidConfigDialog.tsx:105][E: components/InvalidConfigDialog.tsx:120][E: components/InvalidConfigDialog.tsx:132][E: components/InvalidConfigDialog.tsx:143] |
| `ThemePicker` | `components/ThemePicker.tsx` | theme picker 和 syntax highlighting toggle,写 settings 并同步 AppState。[E: components/ThemePicker.tsx:82][E: components/ThemePicker.tsx:85][E: components/ThemePicker.tsx:109][E: components/ThemePicker.tsx:212] |
| `OutputStylePicker` | `components/OutputStylePicker.tsx` | 加载 output styles 并渲染 selector dialog。[E: components/OutputStylePicker.tsx:49][E: components/OutputStylePicker.tsx:90][E: components/OutputStylePicker.tsx:101] |
| `LanguagePicker` | `components/LanguagePicker.tsx` | language text input layout,submit 时 trim 并把空字符串转成 undefined。[E: components/LanguagePicker.tsx:34][E: components/LanguagePicker.tsx:35][E: components/LanguagePicker.tsx:61][E: components/LanguagePicker.tsx:78] |
| `ModelPicker` | `components/ModelPicker.tsx` | model selector,支持 effort state、settings persistence、AppState update 和 fast-mode notice。[E: components/ModelPicker.tsx:55][E: components/ModelPicker.tsx:57][E: components/ModelPicker.tsx:234][E: components/ModelPicker.tsx:238][E: components/ModelPicker.tsx:297][E: components/ModelPicker.tsx:339] |
| `ChannelDowngradeDialog` | `components/ChannelDowngradeDialog.tsx` | latest-to-stable channel confirmation dialog。[E: components/ChannelDowngradeDialog.tsx:46][E: components/ChannelDowngradeDialog.tsx:63][E: components/ChannelDowngradeDialog.tsx:74][E: components/ChannelDowngradeDialog.tsx:92] |
| `ClaudeMdExternalIncludesDialog` | `components/ClaudeMdExternalIncludesDialog.tsx` | external `CLAUDE.md` imports approval dialog,展示 import path 并写 approval/warning flags。[E: components/ClaudeMdExternalIncludesDialog.tsx:105][E: components/ClaudeMdExternalIncludesDialog.tsx:69][E: components/ClaudeMdExternalIncludesDialog.tsx:118][E: components/ClaudeMdExternalIncludesDialog.tsx:34][E: components/ClaudeMdExternalIncludesDialog.tsx:37][E: components/ClaudeMdExternalIncludesDialog.tsx:123][E: components/ClaudeMdExternalIncludesDialog.tsx:124][E: components/ClaudeMdExternalIncludesDialog.tsx:130][E: components/ClaudeMdExternalIncludesDialog.tsx:131] |

## 巨型组件深挖
`Config` 是 settings 族的巨型组件:它同时持有 search input、submenu state、`settingsItems` registry、filtering、save/revert flows 和 picker submenu dispatch。[E: components/Settings/Config.tsx:177][E: components/Settings/Config.tsx:182][E: components/Settings/Config.tsx:264][E: components/Settings/Config.tsx:1048][E: components/Settings/Config.tsx:1087][E: components/Settings/Config.tsx:1179][E: components/Settings/Config.tsx:1305][E: components/Settings/Config.tsx:1309][E: components/Settings/Config.tsx:1317][E: components/Settings/Config.tsx:1321][E: components/Settings/Config.tsx:1325][E: components/Settings/Config.tsx:1340] 它还处理 model AppState sync、transition plan auto mode、editor mode、diff tool、remote-control startup bridge 和 API-key response config。[E: components/Settings/Config.tsx:211][E: components/Settings/Config.tsx:563][E: components/Settings/Config.tsx:769][E: components/Settings/Config.tsx:817][E: components/Settings/Config.tsx:931][E: components/Settings/Config.tsx:971][E: components/Settings/Config.tsx:1000][E: components/Settings/Config.tsx:1002][E: components/Settings/Config.tsx:1003][E: components/Settings/Config.tsx:1028][E: components/Settings/Config.tsx:1034][I]

## 与 hooks/AppState 接线
`Config` 直接读取 AppState 的 `mainLoopModel`、`verbose`、`thinkingEnabled`、`fastMode` 和 `promptSuggestionEnabled`。[E: components/Settings/Config.tsx:120][E: components/Settings/Config.tsx:121][E: components/Settings/Config.tsx:122][E: components/Settings/Config.tsx:123][E: components/Settings/Config.tsx:124] `Config` 通过 `setAppState` 同步 `mainLoopModel`,把 transition plan auto mode 写回 `toolPermissionContext`,并更新 remote-control bridge 状态。[E: components/Settings/Config.tsx:209][E: components/Settings/Config.tsx:211][E: components/Settings/Config.tsx:563][E: components/Settings/Config.tsx:567][E: components/Settings/Config.tsx:967][E: components/Settings/Config.tsx:971] `Status` 用 `buildSecondarySection` 接收 `mainLoopModel` 和 `mcp`;`ModelPicker` 读取 fast-mode/effort state 并在选择时写 settings/AppState。[E: components/Settings/Status.tsx:120][E: components/Settings/Status.tsx:121][E: components/Settings/Status.tsx:122][E: components/ModelPicker.tsx:55][E: components/ModelPicker.tsx:57][E: components/ModelPicker.tsx:234][E: components/ModelPicker.tsx:238]

## Sources
- components/Settings/Settings.tsx
- components/Settings/Config.tsx
- components/Settings/Status.tsx
- components/Settings/Usage.tsx
- components/InvalidSettingsDialog.tsx
- components/InvalidConfigDialog.tsx
- components/ThemePicker.tsx
- components/OutputStylePicker.tsx
- components/LanguagePicker.tsx
- components/ModelPicker.tsx
- components/ChannelDowngradeDialog.tsx
- components/ClaudeMdExternalIncludesDialog.tsx

## 相关
- `subsys.config-settings` 说明这些 UI 背后的 setting schema 和 persistence。
- `subsys.session-state` 说明 settings UI 使用的 AppState 字段。
