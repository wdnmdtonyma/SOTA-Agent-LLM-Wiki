---
id: tui.home-screen
title: Home(起始)屏
kind: subsystem
tier: T2
v: na
source: [packages/tui/src/routes/home.tsx]
symbols: [Home, HomeSessionDestinationProvider]
related: [tui.prompt, tui.routing, tui.feature-plugins]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Home screen 是 TUI 的起始 route：它只负责 logo、首页 prompt、toast 和 home slots；真正创建 session、发送 prompt、切 session 的行为在 `Prompt` 与 route/sync contexts 中完成。

## 能回答的问题

- Home route 如何把 `--prompt` 或 route prompt seed 到 prompt ref？
- `--prompt` 什么时候自动 submit，为什么要等 sync/model ready？
- Home prompt 最大宽度如何由 `tui.prompt.max_width` 决定？
- Home screen 暴露哪些 plugin slots？

## 职责边界

`Home()` 消费 `useRouteData("home")`、`usePromptRef()`、`useArgs()`、`useLocal()`、`useSync()`、`useEditorContext()` 和 `usePluginRuntime()`；这说明它是 home surface 的装配层，而不是 session/domain mutation 层。[E: packages/tui/src/routes/home.tsx:23] [E: packages/tui/src/routes/home.tsx:24] [E: packages/tui/src/routes/home.tsx:25] [E: packages/tui/src/routes/home.tsx:26] [E: packages/tui/src/routes/home.tsx:28] [E: packages/tui/src/routes/home.tsx:29] [E: packages/tui/src/routes/home.tsx:30] [I]

首页 placeholders 是静态两组：normal 示例包含修 TODO、询问项目技术栈、修测试；shell 示例包含 `ls -la`、`git status`、`pwd`。[E: packages/tui/src/routes/home.tsx:17] [E: packages/tui/src/routes/home.tsx:18] [E: packages/tui/src/routes/home.tsx:19]

## 数据模型

| 数据 | 来源 | 行为 |
|---|---|---|
| `route.prompt` | `HomeRoute.prompt?: PromptInfo` | route 携带 prompt 时，首次 bind prompt ref 后调用 `r.set(route.prompt)`。[E: packages/tui/src/context/route.tsx:8] [E: packages/tui/src/routes/home.tsx:48] [E: packages/tui/src/routes/home.tsx:49] |
| `args.prompt` | CLI host 传入的 launch arg | 没有 route prompt 且 `args.prompt` 存在时，首次 bind 设置 `{ input: args.prompt, parts: [] }`。[E: packages/tui/src/routes/home.tsx:53] [E: packages/tui/src/routes/home.tsx:54] |
| `once` | module-level boolean | 避免 prompt ref remount 时重复 seed route/CLI prompt。[E: packages/tui/src/routes/home.tsx:16] [E: packages/tui/src/routes/home.tsx:47] [E: packages/tui/src/routes/home.tsx:50] [E: packages/tui/src/routes/home.tsx:55] |
| `sent` | component-local boolean | 避免 `--prompt` 自动提交 effect 重复触发。[E: packages/tui/src/routes/home.tsx:38] [E: packages/tui/src/routes/home.tsx:61] |

`promptMaxWidth()` 读取 `tuiConfig.prompt?.max_width`；值为 `"auto"` 时取 `max(75, floor(terminalWidth * 0.7))`，否则使用配置值或默认 75。[E: packages/tui/src/routes/home.tsx:34] [E: packages/tui/src/routes/home.tsx:35] [E: packages/tui/src/routes/home.tsx:36]

## 控制流

1. `onMount` 调 `editor.clearSelection()`，确保回到 Home 时不会把上一屏编辑器 selection 继续带入首页 prompt。[E: packages/tui/src/routes/home.tsx:40] [E: packages/tui/src/routes/home.tsx:41]
2. `bind(ref)` 同时更新 local `ref` signal 和 `PromptRefProvider` 中保存的 ref；其它调用方如何读取该 provider 由 `context/prompt` 和具体 command 实现决定。[E: packages/tui/src/routes/home.tsx:44] [E: packages/tui/src/routes/home.tsx:45] [E: packages/tui/src/routes/home.tsx:46] [I]
3. `bind(ref)` 首次成功时优先应用 `route.prompt`，否则应用 `args.prompt`；二者都会把 `once` 置 true，避免重复写入 prompt。[E: packages/tui/src/routes/home.tsx:47] [E: packages/tui/src/routes/home.tsx:49] [E: packages/tui/src/routes/home.tsx:50] [E: packages/tui/src/routes/home.tsx:54] [E: packages/tui/src/routes/home.tsx:55]
4. 自动提交 effect 等待 prompt ref、`sync.ready`、`local.model.ready`、`args.prompt` 全部满足，并确认 prompt 当前文本仍等于 `args.prompt` 后才调用 `r.submit()`。[E: packages/tui/src/routes/home.tsx:60] [E: packages/tui/src/routes/home.tsx:63] [E: packages/tui/src/routes/home.tsx:64] [E: packages/tui/src/routes/home.tsx:65] [E: packages/tui/src/routes/home.tsx:67]
5. Render tree 用 `HomeSessionDestinationProvider` 包裹全屏内容；它之后的 session destination 逻辑由该 provider 的实现承担，本节点只标 home.tsx 的装配点。[E: packages/tui/src/routes/home.tsx:71] [I]
6. Logo 被 `home_logo` slot 以 `mode="replace"` 包裹；Prompt 被 `home_prompt` slot 以 `mode="replace"` 包裹，右侧区域是 `home_prompt_right` slot。[E: packages/tui/src/routes/home.tsx:76] [E: packages/tui/src/routes/home.tsx:82] [E: packages/tui/src/routes/home.tsx:83]
7. 主体底部渲染 `home_bottom` slot 和 `Toast`；窗口最底部渲染 `home_footer` slot，slot mode 是 `single_winner`。[E: packages/tui/src/routes/home.tsx:86] [E: packages/tui/src/routes/home.tsx:88] [E: packages/tui/src/routes/home.tsx:91]

## Plugin Slots

Home 暴露 5 个 host slots：`home_logo`、`home_prompt`、`home_prompt_right`、`home_bottom`、`home_footer`。这些 slot 名称也在 public plugin contract `TuiHostSlotMap` 中声明，其中 `home_prompt` 可接收 `ref?: (ref) => void`。[E: packages/tui/src/routes/home.tsx:76] [E: packages/tui/src/routes/home.tsx:82] [E: packages/tui/src/routes/home.tsx:83] [E: packages/tui/src/routes/home.tsx:86] [E: packages/tui/src/routes/home.tsx:91] [E: packages/plugin/src/tui.ts:459] [E: packages/plugin/src/tui.ts:460] [E: packages/plugin/src/tui.ts:473] [E: packages/plugin/src/tui.ts:474]

内建 plugin `HomeFooter` 和 `HomeTips` 位于 builtins 数组前两项，说明默认首页 footer/tips 也是 plugin presentation model 的一部分，而不是 Home component 的硬编码内容。[E: packages/tui/src/feature-plugins/builtins.ts:2] [E: packages/tui/src/feature-plugins/builtins.ts:3] [E: packages/tui/src/feature-plugins/builtins.ts:23] [E: packages/tui/src/feature-plugins/builtins.ts:24] [I]

## 设计动机与权衡

`specs/tui-package.md` 要求 TUI routes、prompt/session views 和 local UI state 移入 `packages/tui`，而 command parsing/server startup 留在 host。[E: specs/tui-package.md:352] [E: specs/tui-package.md:353] [E: specs/tui-package.md:361] [E: specs/tui-package.md:363] Home 的源码遵循这个边界：它接收 host args，但实际 session create/prompt send 留给 `Prompt` 调 SDK；它暴露 slots，让首页 logo/footer/prompt 周边 UI 可被 feature plugins 替换或追加。[E: packages/tui/src/routes/home.tsx:28] [E: packages/tui/src/routes/home.tsx:82] [E: packages/tui/src/component/prompt/index.tsx:994] [E: packages/tui/src/component/prompt/index.tsx:1089] [I]

## Gotcha

- `once` 是 module-level 变量，不是 component-local signal；一个 TUI process 内它会跨 Home remount 记住是否已 seed prompt。[E: packages/tui/src/routes/home.tsx:16] [E: packages/tui/src/routes/home.tsx:47]
- `--prompt` 自动 submit 不会在 sync/model 尚未 ready 时执行；这防止 prompt 在 provider/model store 未就绪时触发缺 model warning 或创建错误 session。[E: packages/tui/src/routes/home.tsx:63] [I]

## Sources

- `packages/tui/src/routes/home.tsx`
- `packages/tui/src/context/route.tsx`
- `packages/tui/src/component/prompt/index.tsx`
- `packages/tui/src/feature-plugins/builtins.ts`
- `packages/plugin/src/tui.ts`
- `specs/tui-package.md`

## 相关

- `tui.prompt`：默认 `Prompt` 的 submit、history、stash、autocomplete。
- `tui.routing`：`home` route shape 和 navigate。
- `tui.feature-plugins`：slots/feature plugins 如何替换 Home surface。
