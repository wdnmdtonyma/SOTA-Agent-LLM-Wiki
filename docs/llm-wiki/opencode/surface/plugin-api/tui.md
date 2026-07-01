---
id: plugin-api.tui
title: TUI plugin API
kind: surface
tier: T1
v: na
source: [packages/plugin/src/tui.ts, packages/tui/src/plugin/adapters.tsx]
symbols: [TuiPluginApi, TuiPlugin, TuiPluginModule, createTuiApiAdapters]
related: [tui.feature-plugins, ref.tui-api]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> TUI plugin API 是 terminal UI 插件拿到的 host facade：`packages/plugin/src/tui.ts` 定义 public type，`packages/tui/src/plugin/adapters.tsx` 把真实 TUI contexts 适配成 `TuiPluginApi`。

## 能回答的问题

- TUI plugin 的 entrypoint、module shape 和 `TuiPluginApi` 字段是什么？
- TUI plugin 可以读取哪些 app/config/state/theme/client/event/renderer 能力？
- `createTuiApiAdapters()` 如何把 route、state、dialog、toast、theme、kv、plugin manager placeholder 适配给插件？
- Host slots 支持哪些 named insertion points？
- 哪些 API 是 legacy/deprecated 或只在 plugin context 可用？

## Plugin entrypoint

`TuiPluginApi` 是 TUI plugin 的主要参数；`TuiPlugin` 签名是 `(api, options, meta) => Promise<void>`。[E: packages/plugin/src/tui.ts:581][E: packages/plugin/src/tui.ts:628] `TuiPluginModule` 可以导出 `{ id?, tui, server?: never }`，所以 TUI-only module 不能同时声明 server plugin entrypoint。[E: packages/plugin/src/tui.ts:630][E: packages/plugin/src/tui.ts:633]

`TuiPluginMeta` 包含 plugin entry metadata 加状态字段；entry metadata 记录 id、source、spec、target、requested/version/modified、first/last load timing、load_count 和 fingerprint。[E: packages/plugin/src/tui.ts:532][E: packages/plugin/src/tui.ts:544][E: packages/plugin/src/tui.ts:547][E: packages/plugin/src/tui.ts:548]

## API field catalog

| API field | type / capability | adapter behavior |
|---|---|---|
| `app.version` | readonly version string [E: packages/plugin/src/tui.ts:427][E: packages/plugin/src/tui.ts:428] | `appApi()` returns getter backed by input version [E: packages/tui/src/plugin/adapters.tsx:165][E: packages/tui/src/plugin/adapters.tsx:167] |
| `attention` | attention host API [E: packages/plugin/src/tui.ts:583] | passed through from adapter input [E: packages/tui/src/plugin/adapters.tsx:176] |
| `command` | legacy `api.command`; deprecated in favor of keymap APIs [E: packages/plugin/src/tui.ts:590] | adapter keeps shim for V1 plugins with `createCommandShim(...)` [E: packages/tui/src/plugin/adapters.tsx:178] |
| `keys` | key sequence/binding formatting [E: packages/plugin/src/tui.ts:591] | adapter maps to `Keymap.formatKeySequence` and `Keymap.formatKeyBindings` [E: packages/tui/src/plugin/adapters.tsx:181][E: packages/tui/src/plugin/adapters.tsx:184] |
| `keymap` | host keymap object [E: packages/plugin/src/tui.ts:592] | passed through from input keymap [E: packages/tui/src/plugin/adapters.tsx:187] |
| `mode` | current/push mode API [E: packages/plugin/src/tui.ts:593] | adapter wraps `Keymap.getOpencodeModeStack(input.keymap)` [E: packages/tui/src/plugin/adapters.tsx:190][E: packages/tui/src/plugin/adapters.tsx:193] |
| `route.register` | register plugin routes [E: packages/plugin/src/tui.ts:595] | delegates to `input.routes.register(list)` [E: packages/tui/src/plugin/adapters.tsx:197][E: packages/tui/src/plugin/adapters.tsx:198] |
| `route.navigate` | navigate by route name and params [E: packages/plugin/src/tui.ts:596] | `home` and `session` map to host routes; other names map to plugin route [E: packages/tui/src/plugin/adapters.tsx:43][E: packages/tui/src/plugin/adapters.tsx:50][E: packages/tui/src/plugin/adapters.tsx:54][E: packages/tui/src/plugin/adapters.tsx:201] |
| `route.current` | readonly current route [E: packages/plugin/src/tui.ts:597] | adapter maps host home/session/plugin route state into `{ name, params }` [E: packages/tui/src/plugin/adapters.tsx:58][E: packages/tui/src/plugin/adapters.tsx:61][E: packages/tui/src/plugin/adapters.tsx:70][E: packages/tui/src/plugin/adapters.tsx:204] |
| `ui.Dialog*` | dialog components: Dialog, Alert, Confirm, Prompt, Select [E: packages/plugin/src/tui.ts:599][E: packages/plugin/src/tui.ts:604] | adapter renders host dialog components and maps select options/callbacks [E: packages/tui/src/plugin/adapters.tsx:210][E: packages/tui/src/plugin/adapters.tsx:229][E: packages/tui/src/plugin/adapters.tsx:231][E: packages/tui/src/plugin/adapters.tsx:233] |
| `ui.Slot` | host/plugin slot rendering [E: packages/plugin/src/tui.ts:605] | adapter renders `<input.Slot {...props} />` [E: packages/tui/src/plugin/adapters.tsx:239][E: packages/tui/src/plugin/adapters.tsx:240] |
| `ui.Prompt` | prompt component [E: packages/plugin/src/tui.ts:606] | adapter forwards sessionID, visible, disabled, callbacks, hint/right/placeholder props [E: packages/tui/src/plugin/adapters.tsx:242][E: packages/tui/src/plugin/adapters.tsx:245][E: packages/tui/src/plugin/adapters.tsx:253] |
| `ui.toast` | show toast [E: packages/plugin/src/tui.ts:607] | adapter calls `input.toast.show` and defaults variant to `"info"` [E: packages/tui/src/plugin/adapters.tsx:257][E: packages/tui/src/plugin/adapters.tsx:261] |
| `ui.dialog` | dialog stack control [E: packages/plugin/src/tui.ts:608] | adapter exposes replace/clear/setSize and size/depth/open getters [E: packages/tui/src/plugin/adapters.tsx:266][E: packages/tui/src/plugin/adapters.tsx:269][E: packages/tui/src/plugin/adapters.tsx:272][E: packages/tui/src/plugin/adapters.tsx:275][E: packages/tui/src/plugin/adapters.tsx:278][E: packages/tui/src/plugin/adapters.tsx:281] |
| `tuiConfig` | frozen resolved TUI config view [E: packages/plugin/src/tui.ts:610] | getter returns adapter input tuiConfig [E: packages/tui/src/plugin/adapters.tsx:286][E: packages/tui/src/plugin/adapters.tsx:287] |
| `kv` | plugin key/value get/set plus ready [E: packages/plugin/src/tui.ts:369][E: packages/plugin/src/tui.ts:372][E: packages/plugin/src/tui.ts:611] | adapter delegates to `input.kv` [E: packages/tui/src/plugin/adapters.tsx:290][E: packages/tui/src/plugin/adapters.tsx:294][E: packages/tui/src/plugin/adapters.tsx:296] |
| `state` | synced app data facade [E: packages/plugin/src/tui.ts:375][E: packages/plugin/src/tui.ts:398][E: packages/plugin/src/tui.ts:612] | `stateApi()` maps config/provider/path/vcs/session/part/lsp/mcp from sync context [E: packages/tui/src/plugin/adapters.tsx:98][E: packages/tui/src/plugin/adapters.tsx:154] |
| `theme` | theme current/selected/has/set/install/mode/ready [E: packages/plugin/src/tui.ts:360][E: packages/plugin/src/tui.ts:366][E: packages/plugin/src/tui.ts:613] | adapter passes current/selected/has/set/mode/ready and throws for `theme.install` outside plugin context [E: packages/tui/src/plugin/adapters.tsx:331][E: packages/tui/src/plugin/adapters.tsx:345][E: packages/tui/src/plugin/adapters.tsx:347][E: packages/tui/src/plugin/adapters.tsx:350] |
| `client` | SDK client [E: packages/plugin/src/tui.ts:614] | getter returns `input.sdk.client` [E: packages/tui/src/plugin/adapters.tsx:301][E: packages/tui/src/plugin/adapters.tsx:302] |
| `event` | typed TUI event bus [E: packages/plugin/src/tui.ts:519][E: packages/plugin/src/tui.ts:520][E: packages/plugin/src/tui.ts:615] | passed through from input event [E: packages/tui/src/plugin/adapters.tsx:304] |
| `renderer` | CLI renderer [E: packages/plugin/src/tui.ts:616] | passed through from adapter input [E: packages/tui/src/plugin/adapters.tsx:305] |
| `slots.register` | register Solid slot plugin [E: packages/plugin/src/tui.ts:512][E: packages/plugin/src/tui.ts:515][E: packages/plugin/src/tui.ts:617] | base adapter throws; real registration is only available in plugin context [E: packages/tui/src/plugin/adapters.tsx:306][E: packages/tui/src/plugin/adapters.tsx:308] |
| `plugins.*` | list/activate/deactivate/add/install [E: packages/plugin/src/tui.ts:618][E: packages/plugin/src/tui.ts:623] | base adapter returns empty/false and `install` returns `{ ok: false }` because plugin management is only available in plugin context [E: packages/tui/src/plugin/adapters.tsx:311][E: packages/tui/src/plugin/adapters.tsx:313][E: packages/tui/src/plugin/adapters.tsx:316][E: packages/tui/src/plugin/adapters.tsx:322][E: packages/tui/src/plugin/adapters.tsx:326] |
| `lifecycle` | abort signal and disposal registry [E: packages/plugin/src/tui.ts:525][E: packages/plugin/src/tui.ts:527][E: packages/plugin/src/tui.ts:625] | `createTuiApiAdapters()` intentionally returns `Omit<TuiPluginApi, "lifecycle">`; lifecycle is added by higher plugin context [E: packages/tui/src/plugin/adapters.tsx:173] |

## State facade

`TuiState` exposes `ready`, config, provider list, path object, optional VCS branch, session helpers, part lookup, LSP list and MCP list。[E: packages/plugin/src/tui.ts:375][E: packages/plugin/src/tui.ts:398] `stateApi()` maps session count/get/diff/todo/messages/status/permission/question to sync data, flattens file diff entries that have a file, and sorts MCP entries by name before returning status/error。[E: packages/tui/src/plugin/adapters.tsx:100][E: packages/tui/src/plugin/adapters.tsx:103][E: packages/tui/src/plugin/adapters.tsx:106][E: packages/tui/src/plugin/adapters.tsx:109][E: packages/tui/src/plugin/adapters.tsx:115][E: packages/tui/src/plugin/adapters.tsx:120][E: packages/tui/src/plugin/adapters.tsx:127][E: packages/tui/src/plugin/adapters.tsx:131][E: packages/tui/src/plugin/adapters.tsx:134][E: packages/tui/src/plugin/adapters.tsx:137][E: packages/tui/src/plugin/adapters.tsx:140][E: packages/tui/src/plugin/adapters.tsx:143][E: packages/tui/src/plugin/adapters.tsx:147][E: packages/tui/src/plugin/adapters.tsx:151][E: packages/tui/src/plugin/adapters.tsx:154][E: packages/tui/src/plugin/adapters.tsx:158]

## Slot names

Host slot names are typed in `TuiHostSlotMap`: `app`, `app_bottom`, `home_logo`, `home_prompt`, `home_prompt_right`, `session_prompt`, `session_prompt_right`, `home_bottom`, `home_footer`, `sidebar_title`, `sidebar_content`, and `sidebar_footer`.[E: packages/plugin/src/tui.ts:455][E: packages/plugin/src/tui.ts:483] `TuiSlotProps` combines `{ name, mode?, children? }` with slot-specific props, so plugin-rendered slot props stay typed by slot name.[E: packages/plugin/src/tui.ts:488][E: packages/plugin/src/tui.ts:496][E: packages/plugin/src/tui.ts:500]

## Sources

- packages/plugin/src/tui.ts
- packages/tui/src/plugin/adapters.tsx

## 相关

- [TUI plugin feature](../../subsystems/tui/feature-plugins.md)
- [TUI API reference](../../reference/tui-api.md)
