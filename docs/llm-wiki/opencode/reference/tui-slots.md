---
id: ref.tui-slots
title: TUI Plugin Slots
kind: reference
tier: T3
v: na
source:
  - packages/tui/src/plugin/slots.tsx
symbols:
  - createSlots
  - TuiHostSlotMap
related:
  - tui.feature-plugins
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> TUI slot 是插件把 Solid/OpenTUI UI 挂进 host 界面的 named extension point；host 暴露 slot 名、props 和渲染模式，插件 runtime 负责注册、渲染、清理。

## 能回答的问题

- 插件作者能挂载哪些 TUI slot？
- 哪些 slot 是 `replace` 或 `single_winner` 模式？
- slot registry 如何校验、注册和 reset？

## Slot 类型和运行时

`TuiHostSlotMap` 定义 host 提供的 slot 名和每个 slot 的 props shape，例如 `session_prompt` 需要 `session_id`，并可带 `visible`、`disabled`、`on_submit` 和 `ref` [E: packages/plugin/src/tui.ts:455] [E: packages/plugin/src/tui.ts:468]。`TuiSlotMap` 把 host slots 和插件自定义 `Slots` 泛型合并，因此插件 API 可以同时表达内建 slot 和插件扩展 slot [E: packages/plugin/src/tui.ts:488]。

`createSlots()` 初始化空 `Slot` component 和 signal，`setup()` 创建真正的 Solid slot registry，并把 renderer、theme context 和 plugin error callback 注入 slot renderer [E: packages/tui/src/plugin/slots.tsx:26] [E: packages/tui/src/plugin/slots.tsx:33] [E: packages/tui/src/plugin/slots.tsx:34] [E: packages/tui/src/plugin/slots.tsx:35] [E: packages/tui/src/plugin/slots.tsx:37]。`register()` 只接受 `id` 为 string 且 `slots` 为 object 的 host slot plugin，验证失败会跳过注册 [E: packages/tui/src/plugin/slots.tsx:20] [E: packages/tui/src/plugin/slots.tsx:54]。`dispose()` 和 `clear()` 都会把 `Slot` 恢复成空 component，避免旧插件 UI 残留 [E: packages/tui/src/plugin/slots.tsx:57] [E: packages/tui/src/plugin/slots.tsx:62]。

## Host Slots

| Slot | Props | Host mount | Render mode | 用途 |
| --- | --- | --- | --- | --- |
| `app` | `{}` [E: packages/plugin/src/tui.ts:456] | `packages/tui/src/app.tsx` [E: packages/tui/src/app.tsx:1094] | default | 顶层 app 挂载点或全局 UI 扩展点。 |
| `app_bottom` | `{}` [E: packages/plugin/src/tui.ts:457] | `packages/tui/src/app.tsx` [E: packages/tui/src/app.tsx:1092] | default | app 底部区域扩展点。 |
| `home_logo` | `{}` [E: packages/plugin/src/tui.ts:458] | home route [E: packages/tui/src/routes/home.tsx:76] | `replace` | 替换 home logo 区域。 |
| `home_prompt` | `{ ref?: ... }` [E: packages/plugin/src/tui.ts:460] | home route [E: packages/tui/src/routes/home.tsx:82] | `replace` | 替换 home prompt，并可拿到 prompt ref。 |
| `home_prompt_right` | `{}` [E: packages/plugin/src/tui.ts:462] | home prompt right prop [E: packages/tui/src/routes/home.tsx:83] | default | home prompt 右侧附加 UI。 |
| `home_bottom` | `{}` [E: packages/plugin/src/tui.ts:473] | home route [E: packages/tui/src/routes/home.tsx:86] | default | home 页面主体底部扩展点。 |
| `home_footer` | `{}` [E: packages/plugin/src/tui.ts:474] | home route [E: packages/tui/src/routes/home.tsx:91] | `single_winner` | 替换或竞争 home footer。 |
| `session_prompt` | `{ session_id, visible?, disabled?, on_submit?, ref? }` [E: packages/plugin/src/tui.ts:464] [E: packages/plugin/src/tui.ts:468] | session route [E: packages/tui/src/routes/session/index.tsx:1303] | `replace` [E: packages/tui/src/routes/session/index.tsx:1304] | 替换 session prompt，并继承可见性、禁用态和提交回调。 |
| `session_prompt_right` | `{ session_id }` [E: packages/plugin/src/tui.ts:471] | session prompt right prop [E: packages/tui/src/routes/session/index.tsx:1319] | default | session prompt 右侧附加 UI。 |
| `sidebar_title` | `{ session_id, title, share_url? }` [E: packages/plugin/src/tui.ts:476] [E: packages/plugin/src/tui.ts:478] | sidebar route [E: packages/tui/src/routes/session/sidebar.tsx:50] | `single_winner` [E: packages/tui/src/routes/session/sidebar.tsx:51] | 替换或竞争 session sidebar 标题区。 |
| `sidebar_content` | `{ session_id }` [E: packages/plugin/src/tui.ts:481] | sidebar route [E: packages/tui/src/routes/session/sidebar.tsx:85] | default | sidebar 中段内容扩展点。 |
| `sidebar_footer` | `{ session_id }` [E: packages/plugin/src/tui.ts:484] | sidebar route [E: packages/tui/src/routes/session/sidebar.tsx:90] | `single_winner` | 替换或竞争 sidebar footer。 |

## Sources

- `packages/plugin/src/tui.ts`
- `packages/tui/src/plugin/slots.tsx`
- `packages/tui/src/app.tsx`
- `packages/tui/src/routes/home.tsx`
- `packages/tui/src/routes/session/index.tsx`
- `packages/tui/src/routes/session/sidebar.tsx`

## 相关

- `tui.feature-plugins`
