---
id: tui.architecture
title: TUI 架构(OpenTUI + SolidJS)
kind: subsystem
tier: T2
v: na
source: [packages/tui/src/app.tsx, packages/tui/src/index.tsx, packages/tui/package.json, specs/tui-package.md]
symbols: [run, TuiInput, App]
related: [tui.routing, tui.sync-store, tui.feature-plugins]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> TUI 架构是 `@opencode-ai/tui` 里的 OpenTUI `CliRenderer` + SolidJS reactive tree；OpenCode domain 边界主要是 `@opencode-ai/sdk/v2` client/event stream，V1 legacy CLI 只是 host/transport/plugin adapter。

## 能回答的问题

- `@opencode-ai/tui` 的 public entrypoint 是什么，`TuiInput` 要哪些 host 输入？
- 主 TUI 为什么说是 OpenTUI + SolidJS，而不是 React/Ink/Hono？
- `CliRenderer` 如何创建、清理、处理 SIGHUP 和 Windows terminal input？
- TUI root provider stack 包了哪些 context，为什么 route/sync/theme/plugin 都在 root 装配？
- `specs/tui-package.md` 的目标边界和当前源码现实哪里一致、哪里仍有差异？

## 职责边界

`packages/tui` 的 package name 是 `@opencode-ai/tui`，root export 只把 `run` 和 `TuiInput` 从 `src/app.tsx` 暴露出去。[E: packages/tui/package.json:3] [E: packages/tui/src/index.tsx:1] `TuiInput` 是 host 注入合同，当前字段为 `url`、`args`、`config`、`onSnapshot?`、`directory?`、`fetch?`、`headers?`、`events?`、`pluginHost`。[E: packages/tui/src/app.tsx:135] [E: packages/tui/src/app.tsx:143]

设计目标要求 canonical terminal app 从旧 `packages/opencode/src/cli/cmd/tui` 抽到 `packages/tui`，并让 legacy CLI 与新 CLI 共用同一实现。[E: specs/tui-package.md:5] [E: specs/tui-package.md:7] 同一 spec 把 SDK 定为 TUI 的 OpenCode 边界，缺失后端数据应补 server API/generated SDK，而不是从 backend implementation 直接 import。[E: specs/tui-package.md:29] [E: specs/tui-package.md:30]

当前源码已经把 canonical root 放在 `packages/tui/src/app.tsx`，spec 也标记 Section 8/9/10 已完成：`packages/tui` owns application root/provider composition/renderer lifecycle，legacy command/worker/config/plugin-loader/process/editor/audio/event adapters 留在 host 侧。[E: specs/tui-package.md:432] [E: specs/tui-package.md:486] [E: specs/tui-package.md:526] 但当前源码仍直接依赖 `@opencode-ai/core`：`app.tsx` import `Global`、`Flag`、`InstallationVersion`，`package.json` 也列出 `@opencode-ai/core` dependency。[E: packages/tui/src/app.tsx:4] [E: packages/tui/src/app.tsx:5] [E: packages/tui/src/app.tsx:6] [E: packages/tui/package.json:50] 这与 spec 的退出条件“no imports from `@opencode-ai/core`”不完全一致，因此读者应把 spec 当设计动机，把源码当当前事实。[E: specs/tui-package.md:474] [I]

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/tui/src/index.tsx` | package root，只 re-export `run` 和 `TuiInput`。[E: packages/tui/src/index.tsx:1] |
| `packages/tui/src/app.tsx` | `Effect.fn("Tui.run")`、OpenTUI renderer lifecycle、Solid provider stack、global command palette、route switch。[E: packages/tui/src/app.tsx:178] [E: packages/tui/src/app.tsx:235] [E: packages/tui/src/app.tsx:545] [E: packages/tui/src/app.tsx:1080] |
| `packages/tui/src/context/route.tsx` | route discriminated union 存在 Solid store 中，`navigate()` 直接 reconcile 新 route；没有 URL/history router 的判断来自该文件未接 URL/history adapter。[E: packages/tui/src/context/route.tsx:23] [E: packages/tui/src/context/route.tsx:29] [E: packages/tui/src/context/route.tsx:38] [I] |
| `packages/tui/src/context/sdk.tsx` | `@opencode-ai/sdk/v2` client + SSE/host event source + 16ms event batching。[E: packages/tui/src/context/sdk.tsx:24] [E: packages/tui/src/context/sdk.tsx:82] [E: packages/tui/src/context/sdk.tsx:120] [E: packages/tui/src/context/sdk.tsx:69] [E: packages/tui/src/context/sdk.tsx:76] |
| `packages/tui/src/context/sync.tsx` | legacy/current TUI server-state mirror；bootstrap 后进入 `partial`/`complete` 状态。[E: packages/tui/src/context/sync.tsx:62] [E: packages/tui/src/context/sync.tsx:486] [E: packages/tui/src/context/sync.tsx:505] [I] |
| `packages/tui/src/context/data.tsx` | V2 `session.next.*`/location data mirror，和 `SyncProvider` 在 root provider stack 中并存。[E: packages/tui/src/context/data.tsx:47] [E: packages/tui/src/context/data.tsx:126] [E: packages/tui/src/app.tsx:296] [E: packages/tui/src/app.tsx:297] |
| `packages/tui/src/plugin/runtime.tsx` | TUI-side plugin runtime state：commands、status、slots、routes；discovery/install 的 ownership 留给 host runtime 是架构边界。[E: packages/tui/src/plugin/runtime.tsx:13] [E: packages/tui/src/plugin/runtime.tsx:21] [E: specs/tui-package.md:397] [E: specs/tui-package.md:398] [I] |

## 数据模型

`TuiInput` 把 TUI 的 host dependence 显式化：transport (`url`/`fetch`/`headers`/`events`)、launch args (`args`)、resolved TUI config (`config`)、heap snapshot hook (`onSnapshot`) 和 host-owned plugin bridge (`pluginHost`) 都从外部传入。[E: packages/tui/src/app.tsx:135] [E: packages/tui/src/app.tsx:143] `SDKProvider` 接收同一批 transport 字段并传给 `createOpencodeClient({ baseUrl, signal, directory, fetch, headers })`。[E: packages/tui/src/context/sdk.tsx:24] [E: packages/tui/src/context/sdk.tsx:29]

`App` 内部同时消费 `useRoute`、`useSync`、`useProject`、`usePluginRuntime`、`useTheme`、`useKV`、`useSDK`、`useDialog`、`usePromptRef` 等 contexts，说明根组件是 orchestration layer，而不是纯展示组件。[E: packages/tui/src/app.tsx:351] [E: packages/tui/src/app.tsx:370]

## 控制流

1. `run` 进入 `Effect.scoped`，通过 `Effect.acquireRelease` 创建 `CliRenderer`；renderer 使用 `externalOutputMode: "passthrough"`、`targetFps: 60`、`exitOnCtrlC: false`、`useKittyKeyboard: {}`、`autoFocus: false`，mouse 由 `Flag.OPENCODE_DISABLE_MOUSE` 和 `input.config.mouse` 共同决定。[E: packages/tui/src/app.tsx:178] [E: packages/tui/src/app.tsx:181] [E: packages/tui/src/app.tsx:183] [E: packages/tui/src/app.tsx:186] [E: packages/tui/src/app.tsx:193]
2. renderer release path 调 `destroyRenderer(renderer)`；Windows input guard、OpenTUI default keymap、OpenCode keymap 注册、pluginHost dispose、audio dispose、SIGHUP destroy 都在 scoped finalizer 范围内。[E: packages/tui/src/app.tsx:199] [E: packages/tui/src/app.tsx:204] [E: packages/tui/src/app.tsx:205] [E: packages/tui/src/app.tsx:207] [E: packages/tui/src/app.tsx:213] [E: packages/tui/src/app.tsx:219] [E: packages/tui/src/app.tsx:221] [E: packages/tui/src/app.tsx:224]
3. 首次 render 前预热 terminal palette，等待 theme mode，避免 `system` theme 第一帧 fallback flash。[E: packages/tui/src/app.tsx:231] [E: packages/tui/src/app.tsx:232]
4. Solid `render()` 把 provider stack 挂到 renderer：`ExitProvider`、`EpilogueProvider`、`ErrorBoundary`、runtime paths/env/startup providers、clipboard、keymap、args、KV、toast、route、config、plugin runtime、SDK、project、sync、data、theme、local、prompt stash/dialog/frecency/history/ref/editor context 都在 root 组合。[E: packages/tui/src/app.tsx:235] [E: packages/tui/src/app.tsx:246] [E: packages/tui/src/app.tsx:271] [E: packages/tui/src/app.tsx:286] [E: packages/tui/src/app.tsx:287] [E: packages/tui/src/app.tsx:288] [E: packages/tui/src/app.tsx:296] [E: packages/tui/src/app.tsx:298] [E: packages/tui/src/app.tsx:300] [E: packages/tui/src/app.tsx:306]
5. `App` 创建 plugin API adapters，把 version/config/dialog/keymap/route/event/sdk/sync/theme/toast/renderer/attention/Slot 注入 `createTuiApi`，再调用 `pluginHost.start({ api, config, runtime, dispose })`；失败只写 console，不阻断 ready。[E: packages/tui/src/app.tsx:374] [E: packages/tui/src/app.tsx:395] [E: packages/tui/src/app.tsx:401] [E: packages/tui/src/app.tsx:405]
6. `App` 根据 `route.data.type` 切换 `Home` 或 `Session`，plugin route 则通过 `pluginRuntime.routes.get(route.data.id)` 渲染；缺失 plugin route 渲染 `PluginRouteMissing`。[E: packages/tui/src/app.tsx:1049] [E: packages/tui/src/app.tsx:1050] [E: packages/tui/src/app.tsx:1080] [E: packages/tui/src/app.tsx:1083] [E: packages/tui/src/app.tsx:1089]
7. `run` 等待 renderer destroy 对应的 `shutdown` deferred，收尾时 flush Windows input buffer，并把 exit reason/epilogue 写到 stderr/stdout。[E: packages/tui/src/app.tsx:226] [E: packages/tui/src/app.tsx:339] [E: packages/tui/src/app.tsx:344] [E: packages/tui/src/app.tsx:346]

## 设计动机与权衡

`specs/tui-package.md` 把 TUI 拆成 package 的原因是“one canonical implementation”，避免 legacy CLI 与新 CLI 复制两份 full TUI。[E: specs/tui-package.md:35] ownership table 把 OpenTUI renderer lifecycle、Solid composition、components/routes/dialogs/themes/keymaps、SDK sync/event consumption、tool presentation、TUI plugin contracts、local persistence 都划给 `@opencode-ai/tui`。[E: specs/tui-package.md:58] [E: specs/tui-package.md:67] 同时把 command parsing、server/worker startup、auth/transport、config discovery、plugin discovery/install/backend activation 留给 CLI hosts。[E: specs/tui-package.md:74] [E: specs/tui-package.md:79]

因此 TUI root 的架构选择是“host-agnostic UI package + host-injected transport/plugin host”。当前源码还没有完全达到 spec 的 `@opencode-ai/core` 去依赖目标，但它已经把 server startup、config loading、plugin loading 留给 V1 host adapter；主 UI root 通过 `TuiInput` 消费 resolved inputs。[E: packages/tui/src/app.tsx:134] [E: specs/tui-package.md:529] [I]

## Gotcha

- `packages/tui` 是 terminal UI package，不是 V2 core；节点 `v: na` 表示它是 client/presentation layer，但它同时消费 legacy SDK events 和 V2 `session.next.*` events。[E: packages/tui/src/context/sync.tsx:162] [E: packages/tui/src/context/data.tsx:126] [I]
- `@opentui/*` 是 catalog external dependency；OpenTUI renderer/keymap/slot registry 的内部实现不在 opencode 源码内，本 wiki 只写 opencode 如何调用这些 APIs。[E: packages/tui/package.json:54] [E: packages/tui/package.json:55] [E: packages/tui/package.json:56] [U]
- `packages/tui/src/runtime.tsx` 不是 renderer runtime，只包含 `abbreviateHome()` helper；主 renderer lifecycle 在 `packages/tui/src/app.tsx`。[E: packages/tui/src/runtime.tsx:3] [E: packages/tui/src/app.tsx:178]

## Sources

- `packages/tui/src/app.tsx`
- `packages/tui/src/index.tsx`
- `packages/tui/package.json`
- `packages/tui/src/context/route.tsx`
- `packages/tui/src/context/sdk.tsx`
- `packages/tui/src/context/sync.tsx`
- `packages/tui/src/context/data.tsx`
- `packages/tui/src/plugin/runtime.tsx`
- `packages/tui/src/runtime.tsx`
- `specs/tui-package.md`

## 相关

- `tui.routing`：`RouteProvider` 的 in-memory route union。
- `tui.sync-store`：SDK event stream 和 central reactive mirror。
- `tui.feature-plugins`：TUI plugin routes/slots/API。
