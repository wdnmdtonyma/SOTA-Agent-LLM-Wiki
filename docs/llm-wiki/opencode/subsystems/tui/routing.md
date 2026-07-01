---
id: tui.routing
title: TUI 路由(store 判别联合)
kind: subsystem
tier: T2
v: na
source: [packages/tui/src/context/route.tsx, packages/tui/src/app.tsx]
symbols: [RouteProvider, useRoute, Route, HomeRoute, SessionRoute, PluginRoute]
related: [tui.session-screen, tui.home-screen]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> TUI routing 是一个 Solid store 里的 discriminated union：`home | session | plugin`；它没有 URL、history stack 或 router library，导航就是 `setStore(reconcile(route))`。

## 能回答的问题

- TUI route 有哪些 variant，每个 variant 携带哪些字段？
- 初始 route 如何从 host `initialRoute` 或 `--continue`/`--session` 进入？
- Plugin route 如何注册、选择和缺失 fallback？
- route change 会触发哪些 root-level side effects？

## 职责边界

`Route` 明确定义为 `HomeRoute | SessionRoute | PluginRoute`，`HomeRoute` 和 `SessionRoute` 可带 `PromptInfo`，`SessionRoute` 必须带 `sessionID`，`PluginRoute` 必须带 plugin route `id` 和可选 `data`。[E: packages/tui/src/context/route.tsx:8] [E: packages/tui/src/context/route.tsx:13] [E: packages/tui/src/context/route.tsx:14] [E: packages/tui/src/context/route.tsx:19] [E: packages/tui/src/context/route.tsx:20] [E: packages/tui/src/context/route.tsx:23]

`RouteProvider` 只暴露两个能力：读取 `data` getter，以及 `navigate(route)`。`navigate` 内部直接 `setStore(reconcile(route))`；没有 browser URL、history back stack 或 external router adapter 是基于这个 provider 只维护 Solid store 的判断。[E: packages/tui/src/context/route.tsx:34] [E: packages/tui/src/context/route.tsx:38] [I]

## 数据模型

| Variant | 字段 | 用途 |
|---|---|---|
| `home` | `prompt?: PromptInfo` | Home route 可携带 prompt seed。[E: packages/tui/src/context/route.tsx:8] |
| `session` | `sessionID: string`, `prompt?: PromptInfo` | Session route 以 `sessionID` 标识目标 session，并可携带 prompt seed。[E: packages/tui/src/context/route.tsx:13] [E: packages/tui/src/context/route.tsx:14] |
| `plugin` | `id: string`, `data?: Record<string, unknown>` | Plugin route 由 `pluginRuntime.routes` 查 render function，`data` 作为 params 传给 plugin view。[E: packages/tui/src/context/route.tsx:19] [E: packages/tui/src/context/route.tsx:20] [E: packages/tui/src/app.tsx:1068] [E: packages/tui/src/app.tsx:1070] |

## 控制流

1. `RouteProvider` 初始化时优先使用 `props.initialRoute`，否则解析 `useTuiStartup().initialRoute`，再 fallback 到 `{ type: "home" }`。[E: packages/tui/src/context/route.tsx:27] [E: packages/tui/src/context/route.tsx:30]
2. `initialRoute(value)` 只接受 object 且必须含 `type`；`home` 被归一成 `{ type: "home" }`，`session` 必须含 string `sessionID`，`plugin` 必须含 string `id`。[E: packages/tui/src/context/route.tsx:45] [E: packages/tui/src/context/route.tsx:46] [E: packages/tui/src/context/route.tsx:47] [E: packages/tui/src/context/route.tsx:50]
3. `app.tsx` 把 host env `OPENCODE_ROUTE` JSON parse 成 `TuiStartupProvider.initialRoute`，并把 `OPENCODE_FAST_BOOT` 映射成 `skipInitialLoading`。[E: packages/tui/src/app.tsx:272] [E: packages/tui/src/app.tsx:273]
4. `app.tsx` 在 `RouteProvider` 处为 `args.continue` 注入临时 `{ type: "session", sessionID: "dummy" }` initialRoute；真实继续逻辑随后在 sync session list 加载后导航到最近 session或 fork 后的新 session。[E: packages/tui/src/app.tsx:283] [E: packages/tui/src/app.tsx:286] [E: packages/tui/src/app.tsx:500] [E: packages/tui/src/app.tsx:506] [E: packages/tui/src/app.tsx:514]
5. `onMount` 处理 `args.sessionID`：没有 `fork` 时直接 `route.navigate({ type: "session", sessionID })`。[E: packages/tui/src/app.tsx:474] [E: packages/tui/src/app.tsx:487] [E: packages/tui/src/app.tsx:488]
6. `--session --fork` 必须等 `sync.status === "complete"` 才 fork；等待 complete 的竞争规避动机来自相邻实现语境而非独立 runtime contract。[E: packages/tui/src/app.tsx:524] [E: packages/tui/src/app.tsx:526] [I]
7. Root render 用 `Switch` 分支渲染 `Home` 或 keyed `Session`；plugin route 不在 `Switch` 内，而是额外渲染 `plugin()` 的结果，root slots 仍在同一 root tree 中渲染。[E: packages/tui/src/app.tsx:1098] [E: packages/tui/src/app.tsx:1102] [E: packages/tui/src/app.tsx:1108] [E: packages/tui/src/app.tsx:1110]
8. `tui.session.select` event 会把当前 route 设成对应 session；`session.deleted` 如果删除的是当前 session，则导航回 home 并 toast。[E: packages/tui/src/app.tsx:988] [E: packages/tui/src/app.tsx:990] [E: packages/tui/src/app.tsx:995] [E: packages/tui/src/app.tsx:996] [E: packages/tui/src/app.tsx:999]

## Plugin Route

Plugin API adapter 的 `route.navigate(name, params)` 把 `"home"` 映射到 `{ type: "home" }`，把 `"session"` + string `sessionID` 映射到 session route，其它 route name 都映射成 `{ type: "plugin", id: name, data: params }`。[E: packages/tui/src/plugin/adapters.tsx:42] [E: packages/tui/src/plugin/adapters.tsx:50] [E: packages/tui/src/plugin/adapters.tsx:54] `route.current` 也把 internal route union 转回 plugin-facing `{ name, params }` shape。[E: packages/tui/src/plugin/adapters.tsx:58] [E: packages/tui/src/plugin/adapters.tsx:61] [E: packages/tui/src/plugin/adapters.tsx:63] [E: packages/tui/src/plugin/adapters.tsx:69]

Plugin route registry 使用 `Map<string, RouteEntry[]>`，每次 register 为 route list 分配一个 `Symbol()` key，同名 route 取数组最后一个 render function，因此后注册者覆盖读取但 unregister 后可以恢复前一个 entry。[E: packages/tui/src/plugin/api.ts:9] [E: packages/tui/src/plugin/api.ts:17] [E: packages/tui/src/plugin/api.ts:18] [E: packages/tui/src/plugin/api.ts:21] [E: packages/tui/src/plugin/api.ts:28] [E: packages/tui/src/plugin/api.ts:35] Root route 若找不到 plugin render function，则渲染 `PluginRouteMissing`。[E: packages/tui/src/app.tsx:1068] [E: packages/tui/src/app.tsx:1069]

## 设计动机与权衡

这个 routing model 与终端 app 的交互需求匹配：当前界面只需要 home/session/plugin 三类 surface，route mutation 由 command palette、slash command、SDK events 和 plugin API 共同触发；没有需要 browser URL/history 的证据。[I] plugin route registry 是 TUI-local `Map` + Solid revision signal，`RouteProvider` 用 Solid `createStore` 保存当前 route。[E: packages/tui/src/plugin/api.ts:12] [E: packages/tui/src/plugin/api.ts:13] [E: packages/tui/src/context/route.tsx:29] [I]

## Gotcha

- `sessionID: "dummy"` 只是 `--continue` 初始 UI route sentinel，真实 session ID 由 `sync.data.session` 查最近 root session 后替换。[E: packages/tui/src/app.tsx:286] [E: packages/tui/src/app.tsx:500] [E: packages/tui/src/app.tsx:514]
- Plugin route `data` 没有 Schema validation；plugin-facing adapter 只把 `params` 作为 plugin route data 传入。[E: packages/tui/src/context/route.tsx:20] [E: packages/tui/src/plugin/adapters.tsx:41] [E: packages/tui/src/plugin/adapters.tsx:54] [I]

## Sources

- `packages/tui/src/context/route.tsx`
- `packages/tui/src/app.tsx`
- `packages/tui/src/plugin/adapters.tsx`
- `packages/tui/src/plugin/api.ts`

## 相关

- `tui.session-screen`：`session` route 的屏幕实现。
- `tui.home-screen`：`home` route 的屏幕实现。
