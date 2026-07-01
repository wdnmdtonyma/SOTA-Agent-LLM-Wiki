---
id: ref.tui-api
title: TUI Plugin API
kind: reference
tier: T3
v: na
source:
  - packages/tui/src/plugin/adapters.tsx
  - packages/plugin/src/tui.ts
  - packages/tui/src/plugin/api.ts
  - packages/tui/src/plugin/runtime.tsx
  - packages/tui/src/plugin/command-shim.ts
symbols:
  - TuiPluginApi
  - createTuiApiAdapters
  - createTuiApi
related:
  - plugin-api.tui
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> `TuiPluginApi` 是 TUI 插件作者看到的 host API surface，覆盖 app metadata、attention、keys/keymap/mode/route、dialogs、toast、KV、state、theme、client、event、renderer、slots、plugins 和 lifecycle。

## 能回答的问题

- 插件能调用哪些 TUI API？
- 哪些 API 是 adapter 真实实现，哪些当前是 host stub？
- Dialog、slot、theme、state、route 的插件边界在哪里？

## API 类型面

`packages/plugin/src/tui.ts` re-export OpenTUI core 和 keymap 类型，并导入 OpenTUI Solid 的 `JSX`/`SolidPlugin` 类型供 slot 和 component props 使用 [E: packages/plugin/src/tui.ts:28] [E: packages/plugin/src/tui.ts:31] [E: packages/plugin/src/tui.ts:35]。`TuiPluginApi` 的顶层字段包括 `app`、`attention`、deprecated `command`、`keys`、`keymap`、`mode`、`route`、`ui`、`tuiConfig`、`kv`、`state`、`theme`、`client`、`event`、`renderer`、`slots`、`plugins` 和 `lifecycle` [E: packages/plugin/src/tui.ts:581] [E: packages/plugin/src/tui.ts:590] [E: packages/plugin/src/tui.ts:599] [E: packages/plugin/src/tui.ts:610] [E: packages/plugin/src/tui.ts:617] [E: packages/plugin/src/tui.ts:618] [E: packages/plugin/src/tui.ts:625]。

`TuiPlugin` 是 `(api, options, meta) => Promise<void>` 的函数类型，`TuiPluginModule` 通过单个 `tui: TuiPlugin` 字段导出 TUI plugin entry [E: packages/plugin/src/tui.ts:628] [E: packages/plugin/src/tui.ts:632]。Legacy `TuiCommandApi` 仍在类型面存在，包含 `register`、`trigger` 和 `show` 三个旧 command 方法 [E: packages/plugin/src/tui.ts:113] [E: packages/plugin/src/tui.ts:115] [E: packages/plugin/src/tui.ts:117] [E: packages/plugin/src/tui.ts:119]；源码注释把这组 API 标记为 deprecated [I]。

## Adapter 行为

`createTuiApiAdapters()` 把 TUI 内部上下文装配成插件 API：route navigation 会把 `home` 和 `session` 映射到内建 routes，其他 route 名走 plugin route registry [E: packages/tui/src/plugin/adapters.tsx:42] [E: packages/tui/src/plugin/adapters.tsx:43] [E: packages/tui/src/plugin/adapters.tsx:47] [E: packages/tui/src/plugin/adapters.tsx:54]。`route.current` getter 会把当前 path 映射成 `home`、`session` 或 plugin route 名 [E: packages/tui/src/plugin/adapters.tsx:57] [E: packages/tui/src/plugin/adapters.tsx:58] [E: packages/tui/src/plugin/adapters.tsx:59] [E: packages/tui/src/plugin/adapters.tsx:69]。

`stateApi()` 从 sync store 暴露 ready、config、providers、path、vcs、sessions、parts、LSP 和 MCP 等只读查询能力 [E: packages/tui/src/plugin/adapters.tsx:98] [E: packages/tui/src/plugin/adapters.tsx:100] [E: packages/tui/src/plugin/adapters.tsx:103] [E: packages/tui/src/plugin/adapters.tsx:119] [E: packages/tui/src/plugin/adapters.tsx:147] [E: packages/tui/src/plugin/adapters.tsx:150] [E: packages/tui/src/plugin/adapters.tsx:153]。`appApi()` 暴露安装版本号，`createTuiApiAdapters()` 再把 renderer、client、event bus、KV、theme、dialog 和 prompt 实现接入最终 API [E: packages/tui/src/plugin/adapters.tsx:167] [E: packages/tui/src/plugin/adapters.tsx:286] [E: packages/tui/src/plugin/adapters.tsx:289] [E: packages/tui/src/plugin/adapters.tsx:301] [E: packages/tui/src/plugin/adapters.tsx:304] [E: packages/tui/src/plugin/adapters.tsx:305] [E: packages/tui/src/plugin/adapters.tsx:331] [E: packages/tui/src/plugin/adapters.tsx:242] [E: packages/tui/src/plugin/adapters.tsx:265]。

当前 adapter 中 `slots.register()` 会抛错，因为 host slot 注册只在 plugin context 内可用；`theme.install()` 也会抛同类错误 [E: packages/tui/src/plugin/adapters.tsx:308] [E: packages/tui/src/plugin/adapters.tsx:345]。`plugins` 管理方法在 adapter 中是 stub：`list()` 返回空数组，`activate()`、`deactivate()`、`add()`、`install()` 都返回 false 或失败状态 [E: packages/tui/src/plugin/adapters.tsx:312] [E: packages/tui/src/plugin/adapters.tsx:315] [E: packages/tui/src/plugin/adapters.tsx:318] [E: packages/tui/src/plugin/adapters.tsx:321] [E: packages/tui/src/plugin/adapters.tsx:324] [E: packages/tui/src/plugin/adapters.tsx:326] [E: packages/tui/src/plugin/adapters.tsx:327]。这些 stub 说明 package boundary 仍把插件发现、安装、激活交给 host/backend 侧，而不是纯 TUI adapter 自行完成 [I]。

## 插件作者 API Catalog

| API | 能力 | 实现/类型证据 |
| --- | --- | --- |
| `app` | 读取 TUI app metadata，例如 version。 | [E: packages/plugin/src/tui.ts:427] [E: packages/tui/src/plugin/adapters.tsx:167] |
| `attention` | 调用 `notify(...)`，并访问 soundboard register/activate/current/list。 | [E: packages/plugin/src/tui.ts:269] [E: packages/plugin/src/tui.ts:298] [E: packages/plugin/src/tui.ts:300] |
| `command` | deprecated command shim，兼容旧插件 command/register/trigger/show。 | [E: packages/plugin/src/tui.ts:113] [E: packages/tui/src/plugin/command-shim.ts:14] |
| `keys` | 格式化 key sequence 和 binding display。 | [E: packages/plugin/src/tui.ts:74] [E: packages/tui/src/plugin/adapters.tsx:179] |
| `keymap` | 访问 OpenTUI keymap object。 | [E: packages/plugin/src/tui.ts:79] [E: packages/tui/src/plugin/adapters.tsx:187] |
| `mode` | 读取当前 mode，并 push 一个 mode；`push` 返回 disposer。 | [E: packages/plugin/src/tui.ts:81] [E: packages/tui/src/plugin/adapters.tsx:188] [E: packages/tui/src/plugin/adapters.tsx:192] |
| `route` | register/navigate/current plugin route。 | [E: packages/plugin/src/tui.ts:53] [E: packages/tui/src/plugin/adapters.tsx:196] |
| `ui.Dialog*` | 打开 alert、confirm、prompt、select 和通用 Dialog。 | [E: packages/plugin/src/tui.ts:122] [E: packages/tui/src/plugin/adapters.tsx:207] |
| `ui.Prompt` | 复用 TUI prompt component 和 prompt ref。 | [E: packages/plugin/src/tui.ts:183] [E: packages/tui/src/plugin/adapters.tsx:242] |
| `ui.Slot` | 在 plugin render 中声明 slot UI。 | [E: packages/plugin/src/tui.ts:496] [E: packages/tui/src/plugin/adapters.tsx:239] |
| `ui.toast` | 显示 toast message。 | [E: packages/plugin/src/tui.ts:226] [E: packages/tui/src/plugin/adapters.tsx:257] |
| `tuiConfig` | 读取 frozen TUI config view。 | [E: packages/plugin/src/tui.ts:419] [E: packages/tui/src/plugin/adapters.tsx:286] |
| `kv` | 用 string key 存取持久 KV。 | [E: packages/plugin/src/tui.ts:369] [E: packages/tui/src/plugin/adapters.tsx:289] |
| `state` | 查询同步后的 config/provider/path/vcs/session/part/LSP/MCP 状态。 | [E: packages/plugin/src/tui.ts:375] [E: packages/tui/src/plugin/adapters.tsx:300] |
| `theme` | 读取 current/selected theme，检查、切换、安装 theme，并读取 mode/ready。 | [E: packages/plugin/src/tui.ts:359] [E: packages/tui/src/plugin/adapters.tsx:331] |
| `client` | 访问 SDK client。 | [E: packages/plugin/src/tui.ts:614] [E: packages/tui/src/plugin/adapters.tsx:301] |
| `event` | 访问 TUI event bus。 | [E: packages/plugin/src/tui.ts:519] [E: packages/tui/src/plugin/adapters.tsx:304] |
| `renderer` | 访问 OpenTUI renderer。 | [E: packages/plugin/src/tui.ts:616] [E: packages/tui/src/plugin/adapters.tsx:305] |
| `slots` | 注册 host slot plugin。 | [E: packages/plugin/src/tui.ts:512] [E: packages/tui/src/plugin/adapters.tsx:306] |
| `plugins` | 查询和控制插件安装/激活状态；当前 adapter 是 stub。 | [E: packages/plugin/src/tui.ts:618] [E: packages/tui/src/plugin/adapters.tsx:311] |
| `lifecycle` | 暴露 abort signal 和 onDispose 类型；当前 `createTuiApi` 的 `onDispose()` 返回 no-op disposer。 | [E: packages/plugin/src/tui.ts:525] [E: packages/tui/src/plugin/api.ts:48] |

## Sources

- `packages/plugin/src/tui.ts`
- `packages/tui/src/plugin/adapters.tsx`
- `packages/tui/src/plugin/api.ts`
- `packages/tui/src/plugin/runtime.tsx`
- `packages/tui/src/plugin/command-shim.ts`

## 相关

- `plugin-api.tui`
