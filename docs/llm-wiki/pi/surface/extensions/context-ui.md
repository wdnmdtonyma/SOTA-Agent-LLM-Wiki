---
id: surface.extensions.context-ui
title: 扩展 UI 上下文
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/docs/extensions.md
  - packages/coding-agent/docs/rpc.md
  - .pi/extensions/prompt-url-widget.ts
  - packages/coding-agent/examples/extensions/widget-placement.ts
  - packages/coding-agent/examples/extensions/custom-footer.ts
symbols:
  - ExtensionUIContext
  - ExtensionContext
  - ExtensionCommandContext
  - ExtensionUIDialogOptions
  - ExtensionWidgetOptions
  - WidgetPlacement
  - TerminalInputHandler
  - WorkingIndicatorOptions
  - AutocompleteProviderFactory
  - EditorFactory
related:
  - surface.extensions.api
  - subsys.coding-agent.interactive-orchestration
evidence: explicit
status: verified
updated: 8c943640
---

> `ExtensionUIContext` 是扩展通过 `ctx.ui` 访问用户交互和可见 TUI/RPC 表面的接口:它把选择、确认、输入、通知、footer/status/widget、editor、autocomplete、theme 和 tool-output 展开状态统一暴露给 extension handler、tool 和 command。

## 能回答的问题

- extension handler 里的 `ctx.ui` 从哪里来,为什么 print/json 模式下通常不会弹 UI?
- `ctx.hasUI` 和 `ctx.mode === "tui"` 应该分别保护哪些能力?
- `select`、`confirm`、`input`、`editor` 在 TUI 中怎样临时替换 editor 区域?
- extension 如何设置 widget、footer、header、working loader、custom editor 和 autocomplete provider?
- session reload 或 session replacement 时 extension UI 状态怎样清理?
- `.pi/extensions/prompt-url-widget.ts` 如何在真实项目中使用 `ctx.ui.setWidget()`?

## 职责边界

`ExtensionUIContext` 是类型层契约,定义在 `packages/coding-agent/src/core/extensions/types.ts`;接口声明从 `select()` 到 `setToolsExpanded()` 覆盖 blocking dialog、fire-and-forget UI、TUI component factory、editor mutation、theme 和 tool-output 展开控制 [E: packages/coding-agent/src/core/extensions/types.ts:124] [E: packages/coding-agent/src/core/extensions/types.ts:126] [E: packages/coding-agent/src/core/extensions/types.ts:268] [E: packages/coding-agent/src/core/extensions/types.ts:274]。`ExtensionContext` 把 `ui: ExtensionUIContext`、`mode: "tui" | "rpc" | "json" | "print"` 和 `hasUI` 放进所有 extension event/tool context [E: packages/coding-agent/src/core/extensions/types.ts:300] [E: packages/coding-agent/src/core/extensions/types.ts:302] [E: packages/coding-agent/src/core/extensions/types.ts:304] [E: packages/coding-agent/src/core/extensions/types.ts:306]。`ExtensionCommandContext` 继承 `ExtensionContext`,并额外开放 `waitForIdle()`、`newSession()`、`fork()`、`navigateTree()`、`switchSession()` 和 `reload()` 等用户命令安全入口 [E: packages/coding-agent/src/core/extensions/types.ts:339] [E: packages/coding-agent/src/core/extensions/types.ts:344] [E: packages/coding-agent/src/core/extensions/types.ts:347] [E: packages/coding-agent/src/core/extensions/types.ts:372]。

`surface.extensions.context-ui` 只覆盖 `ctx.ui` 这层可见面。扩展注册 API、事件类型、custom tool 和 renderer 的完整枚举应由 `surface.extensions.api` 覆盖;该 companion 文件已存在但仍是 draft,且 `index.json` 里的 entry 仍是 planned,本节点不复核它的完整 API 边界 [U]。`subsys.coding-agent.interactive-orchestration` 覆盖 `InteractiveMode` 的整体 TUI 状态机;本节点只抽取其中 extension UI context 的注入、组件替换和清理逻辑 [I]。

## 注入链路

`ExtensionRunner` 构造时先把 `uiContext` 设为 `noOpUIContext`,该 no-op 实现让 dialog 返回 `undefined`/`false`,让 fire-and-forget UI 方法变成空操作,并让 `setTheme()` 返回失败结果 [E: packages/coding-agent/src/core/extensions/runner.ts:229] [E: packages/coding-agent/src/core/extensions/runner.ts:230] [E: packages/coding-agent/src/core/extensions/runner.ts:231] [E: packages/coding-agent/src/core/extensions/runner.ts:232] [E: packages/coding-agent/src/core/extensions/runner.ts:233] [E: packages/coding-agent/src/core/extensions/runner.ts:240] [E: packages/coding-agent/src/core/extensions/runner.ts:248] [E: packages/coding-agent/src/core/extensions/runner.ts:257] [E: packages/coding-agent/src/core/extensions/runner.ts:301]。运行 mode 通过 `setUIContext(uiContext, mode)` 绑定;传入 `undefined` 会回退 no-op,`hasUI()` 只检查当前 context 是否不是 no-op [E: packages/coding-agent/src/core/extensions/runner.ts:400] [E: packages/coding-agent/src/core/extensions/runner.ts:401] [E: packages/coding-agent/src/core/extensions/runner.ts:409] [E: packages/coding-agent/src/core/extensions/runner.ts:410]。

`createContext()` 用 guarded getter 返回 `runner.uiContext`、`runner.mode` 和 `runner.hasUI()`,因此扩展拿到的 `ctx.ui` 会反映当前 runner 绑定状态,同时会在 stale runtime 上触发 `assertActive()` [E: packages/coding-agent/src/core/extensions/runner.ts:617] [E: packages/coding-agent/src/core/extensions/runner.ts:621] [E: packages/coding-agent/src/core/extensions/runner.ts:623] [E: packages/coding-agent/src/core/extensions/runner.ts:625] [E: packages/coding-agent/src/core/extensions/runner.ts:631]。`createCommandContext()` 通过 property descriptors 复用这些 lazy getter,再追加 command-only 方法,避免对象 spread 把旧值提前冻结 [E: packages/coding-agent/src/core/extensions/runner.ts:688] [E: packages/coding-agent/src/core/extensions/runner.ts:692] [E: packages/coding-agent/src/core/extensions/runner.ts:696] [E: packages/coding-agent/src/core/extensions/runner.ts:724]。

在交互式模式中,`InteractiveMode.bindCurrentSessionExtensions()` 先调用 `createExtensionUIContext()`,再以 `{ uiContext, mode: "tui" }` 调 `session.bindExtensions()` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1546] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1547] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1548] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1550]。同一个 bind 调用还把 command context actions 接到 runtime host 的 new session、fork、tree navigation、session switch 和 reload,并把 extension error 回调接到 TUI error rendering [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1554] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1559] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1566] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1577] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1600] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1610]。

## 运行模式边界

官方 docs 要求 extension 用 `ctx.mode === "tui"` 保护 terminal-only 能力,例如 `custom()`、component factory、terminal input 和 direct TUI rendering [E: packages/coding-agent/docs/extensions.md:910]。`ctx.hasUI` 则用于 dialog 和通知类能力:docs 明确 TUI 与 RPC 为 true,print/json 为 false;RPC 模式中部分 TUI-specific 方法会 no-op 或返回默认值 [E: packages/coding-agent/docs/extensions.md:914] [E: packages/coding-agent/docs/extensions.md:2603] [E: packages/coding-agent/docs/extensions.md:2610]。

RPC 模式不是 no UI;`docs/rpc.md` 把 extension UI 描述为基于 JSONL 的 request/response 子协议,dialog 方法会发 `extension_ui_request` 并等待匹配的 `extension_ui_response`,fire-and-forget 方法只发请求不等响应 [E: packages/coding-agent/docs/rpc.md:1047] [E: packages/coding-agent/docs/rpc.md:1053] [E: packages/coding-agent/docs/rpc.md:1054]。因此 `ctx.hasUI` 适合保护 `select`/`confirm`/`input`/`editor`/`notify` 等跨 TUI/RPC 能力,而 `ctx.mode === "tui"` 更适合保护传入 `Component`、`TUI`、`Theme` 或 raw terminal input 的能力 [I]。

## TUI 实现面

`InteractiveMode.createExtensionUIContext()` 是 TUI ground truth:它把 `select`、`confirm`、`input`、`notify`、`onTerminalInput`、`setStatus`、working loader、hidden thinking label、widget、footer、header、terminal title、custom component、editor text、autocomplete provider、custom editor、theme 和 tools-expanded state 都映射到 `InteractiveMode` 实例方法或字段 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2053] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2055] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2070] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2083] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2102]。

`select()` 和 `input()` 都创建对应的 `ExtensionSelectorComponent` 或 `ExtensionInputComponent`,把 `editorContainer` 清空并替换成临时组件,然后把 focus 移过去;完成、取消或 abort 后再恢复原 editor [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2115] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2127] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2143] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2155] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2190] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2218] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2230]。`confirm()` 只是用 `showExtensionSelector()` 展示 `Yes`/`No`,并把 `"Yes"` 转成 `true` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2165] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2170] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2171]。`editor()` 创建 `ExtensionEditorComponent`,同样临时占用 editor container 并在提交/取消后恢复 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2240] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2242] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2259] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2270]。

`setWidget()` 支持 string array 或 component factory;默认 placement 是 `"aboveEditor"`,`"belowEditor"` 会写入另一张 widget map,string array 最多渲染 `MAX_WIDGET_LINES = 10` 行,超出时追加截断提示 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1817] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1822] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1842] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1845] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1854] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1905]。`setFooter()` 会移除当前 footer 或 custom footer,创建 factory 返回的 component 并添加到 TUI root;传 `undefined` 会恢复内建 footer [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1943] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1960] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1966] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1967]。`setHeader()` 用同样思路替换 header container 中的 built-in header,但如果 header 尚未初始化会直接返回 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1976] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1978] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1993] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2010]。

`custom()` 支持两种显示模式:非 overlay 模式会保存当前 editor 文本、替换 editor container 并把 focus 交给自定义 component;overlay 模式用 `ui.showOverlay(component, options)` 显示浮层,并可把 `OverlayHandle` 交回 extension [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2361] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2374] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2377] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2421] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2425]。官方 docs 把 `custom()` 定位为复杂 UI 的入口,callback 会收到 `tui`、`theme`、`keybindings` 和 `done(value)` [E: packages/coding-agent/docs/extensions.md:2415] [E: packages/coding-agent/docs/extensions.md:2417] [E: packages/coding-agent/docs/extensions.md:2439] [E: packages/coding-agent/docs/extensions.md:2443]。

`setEditorComponent()` 会保存当前 editor 文本,用 factory 生成新 editor,转接默认 editor 的 submit/change handlers、文本、外观、autocomplete 和 app-level handlers;传 `undefined` 会把文本写回 default editor 并恢复默认组件 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2281] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2285] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2291] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2294] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2310] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2335] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2339]。docs 明确建议 custom editor 扩展 `CustomEditor` 并对未处理按键调用 `super.handleInput(data)`,否则容易丢失 app keybindings [E: packages/coding-agent/docs/extensions.md:2514] [E: packages/coding-agent/docs/extensions.md:2515]。

## 清理与生命周期

`resetExtensionUI()` 是 reload/session invalidate 的 UI 清理点:constructor 把它接到 `runtimeHost.setBeforeSessionInvalidate()`,reload command 也会先调用它 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:400] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:401] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5031] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5041]。函数体隐藏 extension selector/input/editor、关闭 overlay、清 terminal input listeners、恢复 footer/header/widgets/custom editor/autocomplete、清 extension statuses、恢复 terminal title、working message、working visibility、working indicator 和 hidden thinking label [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1871] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1872] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1875] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1878] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1881] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1882] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1883] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1884] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1885] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1886] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1888] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1889] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1890] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1892] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1893] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1894] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1895] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1901]。这意味着 extension 不应假设 widget/footer/editor 替换能跨 reload 或 session replacement 自动保留;需要在 `session_start` 或 replacement callback 中重建 [I]。

`ExtensionRunner.invalidate()` 会给 runtime 设置 stale message,之后访问 context getter 或 command method 会先触发 `assertActive()` [E: packages/coding-agent/src/core/extensions/runner.ts:510] [E: packages/coding-agent/src/core/extensions/runner.ts:515] [E: packages/coding-agent/src/core/extensions/runner.ts:519] [E: packages/coding-agent/src/core/extensions/runner.ts:521]。docs 对 `withSession` 也给出同一原则:session replacement 后只能使用传给 `withSession()` 的 fresh context,不要继续使用捕获的旧 `pi`、旧 `ctx` 或旧 `sessionManager` [E: packages/coding-agent/docs/extensions.md:1199] [E: packages/coding-agent/docs/extensions.md:1204] [E: packages/coding-agent/docs/extensions.md:1205]。

## Dogfood 示例

项目级 `.pi/extensions/prompt-url-widget.ts` 是 `ctx.ui.setWidget()` 的真实 dogfood:它定义 PR/issue/advisory prompt pattern,在 `before_agent_start` 中先检查 `ctx.hasUI`,从 prompt 中提取匹配,再用 component factory 生成带 `DynamicBorder` 和 `Text` 的 widget [E: .pi/extensions/prompt-url-widget.ts:7] [E: .pi/extensions/prompt-url-widget.ts:8] [E: .pi/extensions/prompt-url-widget.ts:9] [E: .pi/extensions/prompt-url-widget.ts:42] [E: .pi/extensions/prompt-url-widget.ts:173] [E: .pi/extensions/prompt-url-widget.ts:174] [E: .pi/extensions/prompt-url-widget.ts:187] [E: .pi/extensions/prompt-url-widget.ts:220] [E: .pi/extensions/prompt-url-widget.ts:221] [E: .pi/extensions/prompt-url-widget.ts:222]。该扩展还在 `session_start` / `session_switch` 后从 session history 重建 widget,没有匹配内容时用 `ctx.ui.setWidget("prompt-url", undefined)` 清除它 [E: .pi/extensions/prompt-url-widget.ts:230] [E: .pi/extensions/prompt-url-widget.ts:245] [E: .pi/extensions/prompt-url-widget.ts:260] [E: .pi/extensions/prompt-url-widget.ts:267]。

`widget-placement.ts` 展示最小 placement 用法:同一个 session_start handler 同时设置默认编辑器上方 widget 和 `{ placement: "belowEditor" }` widget [E: packages/coding-agent/examples/extensions/widget-placement.ts:4] [E: packages/coding-agent/examples/extensions/widget-placement.ts:6] [E: packages/coding-agent/examples/extensions/widget-placement.ts:7]。`custom-footer.ts` 展示 `setFooter()` factory 可以读取 `footerData.getGitBranch()`,同时仍可从 `ctx.sessionManager` 和 `ctx.model` 读取 token/model 信息 [E: packages/coding-agent/examples/extensions/custom-footer.ts:24] [E: packages/coding-agent/examples/extensions/custom-footer.ts:35] [E: packages/coding-agent/examples/extensions/custom-footer.ts:45] [E: packages/coding-agent/examples/extensions/custom-footer.ts:50] [E: packages/coding-agent/examples/extensions/custom-footer.ts:59]。

## Gotcha

- `ctx.hasUI` 不等于 TUI:RPC 也为 true,但 component factory、raw terminal input、direct TUI rendering 应以 `ctx.mode === "tui"` 保护 [E: packages/coding-agent/docs/extensions.md:2603] [E: packages/coding-agent/docs/extensions.md:2610]。
- `ctx.ui.theme` 是当前主题对象,custom working indicator 的 frames 会按原样渲染;如果需要颜色,extension 要自己调用 `ctx.ui.theme.fg(...)` 包装 frame 字符串 [E: packages/coding-agent/docs/extensions.md:2368]。
- `setWidget()` 的 string-array widget 有 10 行上限,component factory widget 没有在 `setExtensionWidget()` 中应用同一个行数上限;长 component 需要 extension 自己控制布局 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1842] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1851] [I]。
- `setHeader()` 在 built-in header 尚未初始化时直接返回,因此过早调用可能不会产生可见 header 替换 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1978] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1979] [I]。

## Sources

- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/docs/extensions.md
- packages/coding-agent/docs/rpc.md
- .pi/extensions/prompt-url-widget.ts
- packages/coding-agent/examples/extensions/widget-placement.ts
- packages/coding-agent/examples/extensions/custom-footer.ts

## 相关

- [surface.extensions.api](api.md): extension 注册 API、事件、工具、命令和 renderer 的 companion 节点;当前文件为 draft,且 `index.json` entry 仍是 planned,本节点只把它作为边界引用 [U]。
- [subsys.coding-agent.interactive-orchestration](../../subsystems/coding-agent/interactive-orchestration.md): `InteractiveMode` 的整体 TUI state、input dispatch、agent event rendering 和 extension UI 绑定位置。
