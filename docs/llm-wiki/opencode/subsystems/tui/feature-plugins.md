---
id: tui.feature-plugins
title: TUI feature plugins 与 slots
kind: subsystem
tier: T2
v: na
source: [packages/tui/src/feature-plugins/builtins.ts, packages/tui/src/plugin/slots.tsx, packages/tui/src/plugin/adapters.tsx]
symbols: [createBuiltinPlugins, createPluginRuntime, createSlots, createTuiApiAdapters, TuiPluginApi]
related: [ref.tui-slots, ref.tui-api, tui.runtime-hosting]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> TUI feature plugin 层只负责 presentation extensibility：内建 feature plugin 数组、slots、plugin routes、TUI-facing API adapters；插件发现、安装、启停和外部模块执行由 V1 host runtime 注入。

## 能回答的问题

- 12 个内建 TUI feature plugins 是哪些？
- Slot registry 如何接入 OpenTUI Solid plugin system？
- Plugin route 如何注册、last-wins 和 unregister？
- TUI-facing API 暴露哪些能力，哪些方法在 base adapter 只是 placeholder？
- 为什么 host plugin runtime 与 `packages/tui` runtime 不能混为一个模块？

## Builtins

`createBuiltinPlugins(options)` 当前返回 12 个内建 plugin：`HomeFooter`、`HomeTips`、`SidebarContext`、`SidebarMcp`、`SidebarLsp`、`SidebarTodo`、`SidebarFiles`、`SidebarFooter`、`Notifications`、`PluginManager`、`WhichKey`、`DiffViewer`。[E: packages/tui/src/feature-plugins/builtins.ts:21] [E: packages/tui/src/feature-plugins/builtins.ts:23] [E: packages/tui/src/feature-plugins/builtins.ts:24] [E: packages/tui/src/feature-plugins/builtins.ts:25] [E: packages/tui/src/feature-plugins/builtins.ts:26] [E: packages/tui/src/feature-plugins/builtins.ts:27] [E: packages/tui/src/feature-plugins/builtins.ts:28] [E: packages/tui/src/feature-plugins/builtins.ts:29] [E: packages/tui/src/feature-plugins/builtins.ts:30] [E: packages/tui/src/feature-plugins/builtins.ts:31] [E: packages/tui/src/feature-plugins/builtins.ts:32] [E: packages/tui/src/feature-plugins/builtins.ts:33] [E: packages/tui/src/feature-plugins/builtins.ts:34]

`BuiltinTuiPlugin` 是 `Omit<TuiPluginModule, "id"> & { id: string; tui: TuiPlugin; enabled?: boolean }`，即内建项必须有 `id`、`tui` function，可选默认 enabled。[E: packages/tui/src/feature-plugins/builtins.ts:15] [E: packages/tui/src/feature-plugins/builtins.ts:16] [E: packages/tui/src/feature-plugins/builtins.ts:17] [E: packages/tui/src/feature-plugins/builtins.ts:18] `options.experimentalEventSystem` 被函数签名接收但当前未在 body 中读取；这是当前源码事实，不应推断该 option 已生效。[E: packages/tui/src/feature-plugins/builtins.ts:21] [I]

## TUI-side runtime state

`createPluginRuntime()` 持有三类 presentation state：commands signal、status signal、slots registry；它还创建 plugin routes registry。[E: packages/tui/src/plugin/runtime.tsx:13] [E: packages/tui/src/plugin/runtime.tsx:14] [E: packages/tui/src/plugin/runtime.tsx:15] [E: packages/tui/src/plugin/runtime.tsx:19] `update()` 可更新 commands/status，`clear()` 清空 commands/status/slots，`setupSlots(api)` 把 host api 交给 slot setup。[E: packages/tui/src/plugin/runtime.tsx:23] [E: packages/tui/src/plugin/runtime.tsx:24] [E: packages/tui/src/plugin/runtime.tsx:27] [E: packages/tui/src/plugin/runtime.tsx:28] [E: packages/tui/src/plugin/runtime.tsx:29] [E: packages/tui/src/plugin/runtime.tsx:32]

默认 `emptyCommands` 的 activate/deactivate/add 都返回 false，install 返回 `{ ok: false, message: "Plugin runtime is not available." }`；这就是缺失 host plugin runtime 时的 degraded behavior。[E: packages/tui/src/plugin/runtime.tsx:45] [E: packages/tui/src/plugin/runtime.tsx:46] [E: packages/tui/src/plugin/runtime.tsx:48] [E: packages/tui/src/plugin/runtime.tsx:49] [E: packages/tui/src/plugin/runtime.tsx:51] [E: packages/tui/src/plugin/runtime.tsx:52] [E: packages/tui/src/plugin/runtime.tsx:55]

`TuiPluginHost` contract 只有 `start({ api, config, runtime, dispose? })` 和 `dispose()`；从该 contract 本身看，它是 host 注入点，不是 plugin loader 本体。[E: packages/tui/src/plugin/runtime.tsx:61] [E: packages/tui/src/plugin/runtime.tsx:62] [E: packages/tui/src/plugin/runtime.tsx:67] [E: packages/tui/src/plugin/runtime.tsx:68] [I]

## Slots

`createSlots()` 初始 `Slot` view 是空函数；`setup(api)` 创建 `createSolidSlotRegistry(api.renderer, { theme: api.theme }, { onPluginError })`，然后用 `createSlot()` 生成真正的 Slot view。[E: packages/tui/src/plugin/slots.tsx:26] [E: packages/tui/src/plugin/slots.tsx:27] [E: packages/tui/src/plugin/slots.tsx:28] [E: packages/tui/src/plugin/slots.tsx:33] [E: packages/tui/src/plugin/slots.tsx:48] [E: packages/tui/src/plugin/slots.tsx:49]

slot plugin 必须是 object、含 string `id`、且含 object `slots`；不满足 shape 时 register 返回 no-op disposer。[E: packages/tui/src/plugin/slots.tsx:20] [E: packages/tui/src/plugin/slots.tsx:21] [E: packages/tui/src/plugin/slots.tsx:22] [E: packages/tui/src/plugin/slots.tsx:52] [E: packages/tui/src/plugin/slots.tsx:53] `dispose()` 和 `clear()` 都把 Slot view 设回 empty，防止 host dispose 后残留 plugin UI。[E: packages/tui/src/plugin/slots.tsx:56] [E: packages/tui/src/plugin/slots.tsx:57] [E: packages/tui/src/plugin/slots.tsx:61] [E: packages/tui/src/plugin/slots.tsx:62]

Public slot contract `TuiHostSlotMap` 包含 `app`、`app_bottom`、`home_logo`、`home_prompt`、`home_prompt_right`、`session_prompt`、`session_prompt_right`、`home_bottom`、`home_footer`、`sidebar_title`、`sidebar_content`、`sidebar_footer`。[E: packages/plugin/src/tui.ts:455] [E: packages/plugin/src/tui.ts:456] [E: packages/plugin/src/tui.ts:457] [E: packages/plugin/src/tui.ts:458] [E: packages/plugin/src/tui.ts:459] [E: packages/plugin/src/tui.ts:462] [E: packages/plugin/src/tui.ts:463] [E: packages/plugin/src/tui.ts:470] [E: packages/plugin/src/tui.ts:473] [E: packages/plugin/src/tui.ts:474] [E: packages/plugin/src/tui.ts:475] [E: packages/plugin/src/tui.ts:480] [E: packages/plugin/src/tui.ts:483] `TuiSlotProps` 将 host slots 与 plugin-defined extra slots 合并，并带 `mode?: SlotMode` 和 `children?: JSX.Element`。[E: packages/plugin/src/tui.ts:488] [E: packages/plugin/src/tui.ts:496] [E: packages/plugin/src/tui.ts:498] [E: packages/plugin/src/tui.ts:499]

## Plugin routes

`createPluginRoutes()` 使用 `Map<string, RouteEntry[]>` 和 `revision` signal。register 时为本次 route list 分配一个 `Symbol()` key，同名 route push 到数组末尾；get 时读取 `routes.get(name)?.at(-1)?.render`，所以同名 route last-wins。[E: packages/tui/src/plugin/api.ts:12] [E: packages/tui/src/plugin/api.ts:13] [E: packages/tui/src/plugin/api.ts:17] [E: packages/tui/src/plugin/api.ts:18] [E: packages/tui/src/plugin/api.ts:35]

unregister 会按 key 过滤本次注册的 routes；若同名 route 还有其他 entry 则保留，否则 delete 该 route name，并 bump revision。[E: packages/tui/src/plugin/api.ts:21] [E: packages/tui/src/plugin/api.ts:23] [E: packages/tui/src/plugin/api.ts:24] [E: packages/tui/src/plugin/api.ts:25] [E: packages/tui/src/plugin/api.ts:28] [E: packages/tui/src/plugin/api.ts:30]

## TUI-facing API adapters

`createTuiApiAdapters(input)` 返回 `Omit<TuiPluginApi, "lifecycle">`，包含 app version、attention、legacy command shim、keys formatting、keymap、mode stack、route、ui components、tuiConfig、kv、state、client、event、renderer、slots、plugins、theme 等。[E: packages/tui/src/plugin/adapters.tsx:173] [E: packages/tui/src/plugin/adapters.tsx:176] [E: packages/tui/src/plugin/adapters.tsx:176] [E: packages/tui/src/plugin/adapters.tsx:179] [E: packages/tui/src/plugin/adapters.tsx:179] [E: packages/tui/src/plugin/adapters.tsx:184] [E: packages/tui/src/plugin/adapters.tsx:188] [E: packages/tui/src/plugin/adapters.tsx:188] [E: packages/tui/src/plugin/adapters.tsx:193] [E: packages/tui/src/plugin/adapters.tsx:196] [E: packages/tui/src/plugin/adapters.tsx:207] [E: packages/tui/src/plugin/adapters.tsx:286] [E: packages/tui/src/plugin/adapters.tsx:289] [E: packages/tui/src/plugin/adapters.tsx:301] [E: packages/tui/src/plugin/adapters.tsx:301] [E: packages/tui/src/plugin/adapters.tsx:306] [E: packages/tui/src/plugin/adapters.tsx:306] [E: packages/tui/src/plugin/adapters.tsx:306] [E: packages/tui/src/plugin/adapters.tsx:313] [E: packages/tui/src/plugin/adapters.tsx:331]

Base adapter 的 `slots.register()` 会抛错 “only available in plugin context”，`plugins.list()` 返回空数组，activate/deactivate/add 返回 false，install 返回失败消息；真正 scoped slots/plugins/theme install 在 host runtime 的 plugin-scoped API 中覆盖。[E: packages/tui/src/plugin/adapters.tsx:306] [E: packages/tui/src/plugin/adapters.tsx:308] [E: packages/tui/src/plugin/adapters.tsx:313] [E: packages/tui/src/plugin/adapters.tsx:315] [E: packages/tui/src/plugin/adapters.tsx:318] [E: packages/tui/src/plugin/adapters.tsx:321] [E: packages/tui/src/plugin/adapters.tsx:324] [E: packages/tui/src/plugin/adapters.tsx:327] [E: packages/opencode/src/plugin/tui/runtime.ts:603] [E: packages/opencode/src/plugin/tui/runtime.ts:632] [E: packages/opencode/src/plugin/tui/runtime.ts:646] [E: packages/opencode/src/plugin/tui/runtime.ts:590] [I]

`createTuiApi()` 当前只补一个 lifecycle stub：new AbortController signal，`onDispose()` 返回 no-op disposer。真正 plugin lifecycle 由 legacy host runtime 为每个 plugin 建 scope。[E: packages/tui/src/plugin/api.ts:42] [E: packages/tui/src/plugin/api.ts:46] [E: packages/tui/src/plugin/api.ts:48] [E: packages/opencode/src/plugin/tui/runtime.ts:421] [E: packages/opencode/src/plugin/tui/runtime.ts:421] [I]

## Host boundary

Root `App` 创建 API adapters 后调用 `props.pluginHost.start({ api, config, runtime, dispose })`；失败只 console.error，finally 设置 TUI ready。[E: packages/tui/src/app.tsx:384] [E: packages/tui/src/app.tsx:404] [E: packages/tui/src/app.tsx:405] [E: packages/tui/src/app.tsx:406] [E: packages/tui/src/app.tsx:407] [E: packages/tui/src/app.tsx:408] [E: packages/tui/src/app.tsx:411] [E: packages/tui/src/app.tsx:414]

`specs/tui-package.md` 明确 Section 7 已完成：slots、route registration、TUI-facing APIs、runtime presentation state、built-in feature plugins 在 `@opencode-ai/tui`；legacy host 保留 discovery、installation、manifest/config mutation、external module execution、pure-mode filtering、cleanup ownership。[E: specs/tui-package.md:395] [E: specs/tui-package.md:396] [E: specs/tui-package.md:397] [E: specs/tui-package.md:398] [E: specs/tui-package.md:399]

## Gotcha

- `packages/tui/src/plugin/runtime.tsx` 是 TUI-side view/runtime state；`packages/opencode/src/plugin/tui/runtime.ts` 才是 V1 legacy host plugin runtime。两者同名但职责不同。[E: packages/tui/src/plugin/runtime.tsx:12] [E: packages/opencode/src/plugin/tui/runtime.ts:988] [I]
- Public `TuiPluginApi.command` 仍保留为 optional API 字段；源码注释标记 deprecated 并推荐 keymap/command palette APIs，但该推荐属于注释层面的迁移说明。[E: packages/plugin/src/tui.ts:590] [I]

## Sources

- `packages/tui/src/feature-plugins/builtins.ts`
- `packages/tui/src/plugin/runtime.tsx`
- `packages/tui/src/plugin/slots.tsx`
- `packages/tui/src/plugin/adapters.tsx`
- `packages/tui/src/plugin/api.ts`
- `packages/tui/src/app.tsx`
- `packages/plugin/src/tui.ts`
- `packages/opencode/src/plugin/tui/runtime.ts`
- `specs/tui-package.md`

## 相关

- `ref.tui-slots`：完整 slot props/modes。
- `ref.tui-api`：完整 public plugin API contract。
- `tui.runtime-hosting`：V1 CLI 如何创建 legacy plugin host 并注入 TUI。
