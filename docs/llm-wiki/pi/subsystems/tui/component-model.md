---
id: subsys.tui.component-model
title: Component 渲染模型
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/tui.ts
  - packages/tui/src/index.ts
symbols:
  - Component
  - Focusable
  - Container
related:
  - subsys.tui.runtime
  - ref.tui.component-types
evidence: explicit
status: verified
updated: cee5ff7520
---

> `Component` 是 pi TUI 的最小渲染单元: 它把当前 viewport width 转成多行 terminal string, 可选接收 keyboard input, 并通过 `invalidate()` 暴露缓存失效入口。

## 能回答的问题

- pi TUI 里的 `Component` 最小接口是什么, `render(width)` 应该返回什么?
- `Focusable` 与普通 `Component` 的区别是什么, 焦点状态由谁写入?
- `Container` 如何组合多个子组件, 它有没有自己的布局算法?
- TUI runtime 如何把 focused component 的 input、key release event、render request 串起来?
- overlay component 与 base component 在同一个 component model 中如何被渲染?
- `packages/tui/src/index.ts` 对外暴露了哪些 component model 符号?

## 职责边界

`packages/tui/src/tui.ts` 定义 component model 的三个核心符号: `Component` interface、`Focusable` interface、`Container` class [E: packages/tui/src/tui.ts:64] [E: packages/tui/src/tui.ts:104] [E: packages/tui/src/tui.ts:256]。这个文件同一处还定义 `TUI extends Container`, 因而 runtime 本身也是一个 container, 可以复用 `Container.render()` 的 child aggregation 语义 [E: packages/tui/src/tui.ts:295] [I]。

`Component` interface 不要求 terminal/stdout/diff-rendering API; component contract 只要求 `render(width)` 返回 `string[]`, TUI runtime 再在 `doRender()` 中调用 `this.render(width)`、组合 overlay、比较前后 lines 并写入 terminal [E: packages/tui/src/tui.ts:70] [E: packages/tui/src/tui.ts:1275] [E: packages/tui/src/tui.ts:1279] [E: packages/tui/src/tui.ts:1376] [E: packages/tui/src/tui.ts:1380] [E: packages/tui/src/tui.ts:1607]。这种边界让 component model 更像 retained tree + immediate render function 的混合: 树保留在 `Container.children`, 每帧调用 `render(width)` 生成当前 terminal snapshot [E: packages/tui/src/tui.ts:257] [E: packages/tui/src/tui.ts:280] [I]。

`packages/tui/src/index.ts` 是 package surface: 它 re-export `Component`、`Container`、`CURSOR_MARKER`、`Focusable`、`isFocusable`、overlay option/handle types 和 `TUI` [E: packages/tui/src/index.ts:99] [E: packages/tui/src/index.ts:100] [E: packages/tui/src/index.ts:101] [E: packages/tui/src/index.ts:102] [E: packages/tui/src/index.ts:103] [E: packages/tui/src/index.ts:104] [E: packages/tui/src/index.ts:105] [E: packages/tui/src/index.ts:106] [E: packages/tui/src/index.ts:107] [E: packages/tui/src/index.ts:108] [E: packages/tui/src/index.ts:109] [E: packages/tui/src/index.ts:110] [E: packages/tui/src/index.ts:111]。

## 关键文件

- `packages/tui/src/tui.ts`: component contract、focus marker、container composition、overlay stack/composition 和 TUI render/input runtime 的权威实现 [E: packages/tui/src/tui.ts:64] [E: packages/tui/src/tui.ts:120] [E: packages/tui/src/tui.ts:256] [E: packages/tui/src/tui.ts:495] [E: packages/tui/src/tui.ts:1036] [E: packages/tui/src/tui.ts:765] [E: packages/tui/src/tui.ts:1258]。
- `packages/tui/src/index.ts`: 对外导出 component model 符号, 使 consumer 可以从 package entrypoint 导入类型和 runtime [E: packages/tui/src/index.ts:99] [E: packages/tui/src/index.ts:100] [E: packages/tui/src/index.ts:101] [E: packages/tui/src/index.ts:103] [E: packages/tui/src/index.ts:111]。

## 数据模型

`Component.render(width: number): string[]` 是唯一必需的渲染方法; `width` 是当前 viewport column width, 返回值是一组已经可写入 terminal 的 lines [E: packages/tui/src/tui.ts:70]。`Component.handleInput?(data: string): void` 是可选 input hook; TUI 只在当前 focused component 存在该 hook 时转发 input [E: packages/tui/src/tui.ts:75] [E: packages/tui/src/tui.ts:831]。

`Component.wantsKeyRelease?: boolean` 控制 Kitty protocol key release event 是否送达组件; TUI 在 input forwarding 前检查 `isKeyRelease(data)` 且默认过滤未 opt-in 的 release events [E: packages/tui/src/tui.ts:81] [E: packages/tui/src/tui.ts:833] [E: packages/tui/src/tui.ts:834]。`Component.invalidate(): void` 是必需的缓存失效入口, `Container.invalidate()` 会向所有 children 传播, `TUI.invalidate()` 还会向 overlay component 传播 [E: packages/tui/src/tui.ts:87] [E: packages/tui/src/tui.ts:274] [E: packages/tui/src/tui.ts:275] [E: packages/tui/src/tui.ts:276] [E: packages/tui/src/tui.ts:632] [E: packages/tui/src/tui.ts:634]。

`Focusable` 是可选附加能力, 只有一个 mutable boolean 字段 `focused` [E: packages/tui/src/tui.ts:104] [E: packages/tui/src/tui.ts:106]。`isFocusable(component)` 的运行时判定只要求对象非 null 且存在 `"focused"` property, 所以它是 structural typing 风格的 focus marker, 不是基于 class inheritance 的能力检查 [E: packages/tui/src/tui.ts:110] [E: packages/tui/src/tui.ts:111] [I]。

`CURSOR_MARKER` 是 escape marker 常量; 当 rendered line 中出现该 marker 时, TUI 后续扫描 marker、计算 visual column、从 output 中删除 marker, 再定位 hardware cursor [E: packages/tui/src/tui.ts:120] [E: packages/tui/src/tui.ts:1238] [E: packages/tui/src/tui.ts:1243] [E: packages/tui/src/tui.ts:1247] [E: packages/tui/src/tui.ts:1250] [E: packages/tui/src/tui.ts:1632] [E: packages/tui/src/tui.ts:1651]。

`Container` 持有 `children: Component[]`, 提供 `addChild()`、`removeChild()`、`clear()`、`invalidate()` 和 `render(width)` [E: packages/tui/src/tui.ts:257] [E: packages/tui/src/tui.ts:259] [E: packages/tui/src/tui.ts:263] [E: packages/tui/src/tui.ts:270] [E: packages/tui/src/tui.ts:274] [E: packages/tui/src/tui.ts:280]。`Container.render(width)` 顺序调用每个 child 的 `render(width)`, 再把 child lines 原样 append 到自己的 lines, 因此基础 container 是 vertical concatenation, 不是 flex/grid/layout engine [E: packages/tui/src/tui.ts:282] [E: packages/tui/src/tui.ts:283] [E: packages/tui/src/tui.ts:285] [E: packages/tui/src/tui.ts:288] [I]。

## 控制流

1. 调用方通过 `Container.addChild(component)` 把 component 加入 `children`; 删除和清空分别走 `removeChild()` 与 `clear()` [E: packages/tui/src/tui.ts:259] [E: packages/tui/src/tui.ts:260] [E: packages/tui/src/tui.ts:263] [E: packages/tui/src/tui.ts:266] [E: packages/tui/src/tui.ts:270] [E: packages/tui/src/tui.ts:271]。
2. `TUI.start()` 把 terminal input callback 绑定到 `this.handleInput(data)`, resize/render callback 绑定到 `this.requestRender()`, 然后隐藏 cursor、查询 cell size 并请求首次 render [E: packages/tui/src/tui.ts:639] [E: packages/tui/src/tui.ts:640] [E: packages/tui/src/tui.ts:641] [E: packages/tui/src/tui.ts:643] [E: packages/tui/src/tui.ts:647] [E: packages/tui/src/tui.ts:648]。
3. `TUI.setFocus(component)` 进入 `setFocusInternal()`, 先把旧 focused component 的 `focused` 置 false, 再写入 `focusedComponent = nextFocus`, 最后把新 focusable component 的 `focused` 置 true [E: packages/tui/src/tui.ts:368] [E: packages/tui/src/tui.ts:419] [E: packages/tui/src/tui.ts:420] [E: packages/tui/src/tui.ts:423] [E: packages/tui/src/tui.ts:425] [E: packages/tui/src/tui.ts:426]。
4. `TUI.handleInput(data)` 先处理 terminal/color/cell-size 等 runtime response 和 global debug key, 再把 input 交给当前 focused component 的 `handleInput()` [E: packages/tui/src/tui.ts:765] [E: packages/tui/src/tui.ts:766] [E: packages/tui/src/tui.ts:769] [E: packages/tui/src/tui.ts:791] [E: packages/tui/src/tui.ts:796] [E: packages/tui/src/tui.ts:831] [E: packages/tui/src/tui.ts:836]。
5. input 转发后 TUI 调 `requestRender()`, 所以 component 的 input handler 不需要直接写 terminal; 它只需要更新自身 state, 下一次 render 会重新读取 state [E: packages/tui/src/tui.ts:836] [E: packages/tui/src/tui.ts:837] [I]。
6. `requestRender(force)` 在 force path 清空 previous render state 并通过 `process.nextTick()` 立即排队 `doRender()`, 普通 path 则设置 `renderRequested` 并排队 `scheduleRender()` [E: packages/tui/src/tui.ts:716] [E: packages/tui/src/tui.ts:717] [E: packages/tui/src/tui.ts:718] [E: packages/tui/src/tui.ts:729] [E: packages/tui/src/tui.ts:730] [E: packages/tui/src/tui.ts:736] [E: packages/tui/src/tui.ts:740] [E: packages/tui/src/tui.ts:742]。
7. `scheduleRender()` 用 `MIN_RENDER_INTERVAL_MS = 16` 计算 delay, 到时清掉 timer、复位 `renderRequested` 并调用 `doRender()`; 如果 render 期间又被请求, 它会再次 schedule [E: packages/tui/src/tui.ts:309] [E: packages/tui/src/tui.ts:749] [E: packages/tui/src/tui.ts:750] [E: packages/tui/src/tui.ts:751] [E: packages/tui/src/tui.ts:756] [E: packages/tui/src/tui.ts:758] [E: packages/tui/src/tui.ts:759] [E: packages/tui/src/tui.ts:760]。
8. `doRender()` 读取 terminal `columns`/`rows`, 调 `this.render(width)` 生成 base lines, 如有 overlays 则先调用 `compositeOverlays()` 合成 overlay lines, 再提取 cursor marker、应用 line reset、进入 full/differential render 分支 [E: packages/tui/src/tui.ts:1260] [E: packages/tui/src/tui.ts:1261] [E: packages/tui/src/tui.ts:1275] [E: packages/tui/src/tui.ts:1278] [E: packages/tui/src/tui.ts:1279] [E: packages/tui/src/tui.ts:1283] [E: packages/tui/src/tui.ts:1285] [E: packages/tui/src/tui.ts:1341] [E: packages/tui/src/tui.ts:1376]。
9. `showOverlay(component, options)` 把 overlay entry push 到 `overlayStack`, 保存 `preFocus`, 初始化 `hidden` 和 `focusOrder`; visible 且非 `nonCapturing` 的 overlay 会获得 focus, 然后触发 render [E: packages/tui/src/tui.ts:495] [E: packages/tui/src/tui.ts:496] [E: packages/tui/src/tui.ts:499] [E: packages/tui/src/tui.ts:500] [E: packages/tui/src/tui.ts:501] [E: packages/tui/src/tui.ts:503] [E: packages/tui/src/tui.ts:505] [E: packages/tui/src/tui.ts:506] [E: packages/tui/src/tui.ts:509]。
10. `compositeOverlays()` 过滤 visible overlay, 按 `focusOrder` 排序, 以 resolved overlay width 调用 overlay component 的 `render(width)`, 再按 row/col 把 overlay line 合入 base line [E: packages/tui/src/tui.ts:1044] [E: packages/tui/src/tui.ts:1045] [E: packages/tui/src/tui.ts:1054] [E: packages/tui/src/tui.ts:1062] [E: packages/tui/src/tui.ts:1081] [E: packages/tui/src/tui.ts:1089]。

## 设计动机与权衡

`Component` contract 极小, 因为 layout、diff rendering、cursor positioning、overlay stacking 都集中在 `TUI` runtime; component author 只需要实现 render/state/input/invalidate 的局部逻辑 [E: packages/tui/src/tui.ts:64] [E: packages/tui/src/tui.ts:70] [E: packages/tui/src/tui.ts:75] [E: packages/tui/src/tui.ts:87] [E: packages/tui/src/tui.ts:1258] [I]。

`Container` 的 vertical concatenation 简单但有约束: 子组件必须自己尊重传入 width, 因为 runtime 在 differential render 时会检查非 image line 的 visible width, 超过 terminal width 会 stop 并 throw error [E: packages/tui/src/tui.ts:280] [E: packages/tui/src/tui.ts:1525] [E: packages/tui/src/tui.ts:1541] [E: packages/tui/src/tui.ts:1551]。overlay composition 对 overlay line 另有防御性截断, 但 base component lines 仍依赖 component 自己控制宽度 [E: packages/tui/src/tui.ts:1087] [E: packages/tui/src/tui.ts:1088] [I]。

`Focusable` 通过 structural property 而不是 subclass 进入模型, 让普通 component 可以保持纯 render-only, 只有需要硬件光标或 input focus 的 component 才实现 `focused` 字段 [E: packages/tui/src/tui.ts:104] [E: packages/tui/src/tui.ts:110] [E: packages/tui/src/tui.ts:111] [I]。

## Gotcha

- `handleInput()` 只会收到当前 focused component 的 input; 未被 `setFocus()` 或 overlay focus 选中的 component 即使实现了 `handleInput` 也不会被 TUI 直接调用 [E: packages/tui/src/tui.ts:301] [E: packages/tui/src/tui.ts:423] [E: packages/tui/src/tui.ts:831] [I]。
- key release event 默认被过滤; component 需要设置 `wantsKeyRelease` 才能收到 Kitty release event [E: packages/tui/src/tui.ts:81] [E: packages/tui/src/tui.ts:833]。
- `CURSOR_MARKER` 必须出现在 rendered lines 中才会定位 hardware cursor; 如果没有 marker 或 total lines 为空, TUI 会隐藏 cursor [E: packages/tui/src/tui.ts:1243] [E: packages/tui/src/tui.ts:1632] [E: packages/tui/src/tui.ts:1633] [E: packages/tui/src/tui.ts:1634]。
- `Container.invalidate()` 调用 `child.invalidate?.()`, 但 `Component.invalidate` 在 interface 中是必需方法; optional chaining 表明 runtime 对历史或结构化对象有宽容度, 不是接口声明变成 optional [E: packages/tui/src/tui.ts:87] [E: packages/tui/src/tui.ts:276] [I]。

## 跨包边界

本节点只覆盖 `pkg: tui` 的 component contract。`subsys.tui.runtime` 负责 TUI lifecycle、terminal I/O、differential rendering 与 overlay focus restore 的更完整 runtime 叙述; 本节点只解释 runtime 如何消费 `Component`、`Focusable` 和 `Container` [I]。

`ref.tui.component-types` 应作为 grouped/reference 节点枚举 `packages/tui/src/index.ts` 暴露的具体 components 和 types; 本节点只覆盖 component model 的三个权威符号及其 runtime contract [E: packages/tui/src/index.ts:12] [E: packages/tui/src/index.ts:99] [I]。

## Sources

- `packages/tui/src/tui.ts`
- `packages/tui/src/index.ts`

## 相关

- [subsys.tui.runtime](runtime.md): TUI runtime lifecycle、input/render scheduling、terminal diff output 的子系统节点。
- [ref.tui.component-types](../../reference/component-types.md): TUI package entrypoint 暴露的 component/type catalog。
