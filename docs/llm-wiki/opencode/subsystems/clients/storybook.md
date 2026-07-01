---
id: clients.storybook
title: Storybook(UI 沙盒)
kind: subsystem
tier: T2
v: na
source:
  - packages/storybook/package.json
  - packages/storybook/.storybook/main.ts
  - packages/storybook/.storybook/preview.tsx
  - packages/storybook/.storybook/theme-tool.ts
  - packages/storybook/.storybook/playground-css-plugin.ts
related:
  - clients.ui
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Storybook 是 `@opencode-ai/storybook` UI sandbox: Storybook 10 + SolidJS/Vite, 读取 `packages/ui`、`packages/session-ui` 和 `packages/app` 的 stories, 提供 theme decorator、a11y/docs addons 和一个本地 CSS playground endpoint。

## 能回答的问题

- Storybook 为什么是单独 workspace package?
- 它从哪里加载 UI stories?
- Storybook 如何 mock app context 和 router?
- Preview 如何注入 ThemeProvider、DialogProvider、MarkedProvider?
- playground CSS endpoint 能修改哪些源码文件?

## 职责边界

`@opencode-ai/storybook` 是 UI sandbox, 不参与 opencode runtime [I]。package scripts 只有 `storybook dev -p 6006` 和 `storybook build` [E: packages/storybook/package.json:6] [E: packages/storybook/package.json:7] [E: packages/storybook/package.json:8]。它依赖 `@opencode-ai/ui`, `@opencode-ai/session-ui`, `storybook`, `storybook-solidjs-vite`, Storybook addons、React manager API 和 SolidJS [E: packages/storybook/package.json:12] [E: packages/storybook/package.json:13] [E: packages/storybook/package.json:15] [E: packages/storybook/package.json:16] [E: packages/storybook/package.json:17] [E: packages/storybook/package.json:18] [E: packages/storybook/package.json:19] [E: packages/storybook/package.json:22] [E: packages/storybook/package.json:23] [E: packages/storybook/package.json:24] [E: packages/storybook/package.json:25] [E: packages/storybook/package.json:26]。

V1/V2 关系: Storybook 节点是 `v: na`。它可以展示 UI v1/v2 components, 但不属于 V1/V2 coding agent runtime [I]。

## 技术栈

- Storybook 10.2.x + `storybook-solidjs-vite` [E: packages/storybook/package.json:25] [E: packages/storybook/package.json:26]。
- Tailwind Vite plugin and custom `playgroundCss` Vite plugin [E: packages/storybook/.storybook/main.ts:4] [E: packages/storybook/.storybook/main.ts:5] [E: packages/storybook/.storybook/main.ts:33]。
- Preview decorators use SolidJS JSX decorator API [E: packages/storybook/.storybook/preview.tsx:11] [E: packages/storybook/.storybook/preview.tsx:47]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/storybook/.storybook/main.ts` | Storybook main config。选择 `storybook-solidjs-vite`, addons, stories glob, viteFinal aliases/mocks/fs allow [E: packages/storybook/.storybook/main.ts:13] [E: packages/storybook/.storybook/main.ts:15] [E: packages/storybook/.storybook/main.ts:18] [E: packages/storybook/.storybook/main.ts:25] [E: packages/storybook/.storybook/main.ts:33] [E: packages/storybook/.storybook/main.ts:36] [E: packages/storybook/.storybook/main.ts:67]。 |
| `packages/storybook/.storybook/preview.tsx` | Preview decorator。注入 UI/session-ui styles、ThemeProvider、DialogProvider、MarkedProvider、Font, 并定义 global theme control [E: packages/storybook/.storybook/preview.tsx:1] [E: packages/storybook/.storybook/preview.tsx:2] [E: packages/storybook/.storybook/preview.tsx:3] [E: packages/storybook/.storybook/preview.tsx:53] [E: packages/storybook/.storybook/preview.tsx:54] [E: packages/storybook/.storybook/preview.tsx:55] [E: packages/storybook/.storybook/preview.tsx:57] [E: packages/storybook/.storybook/preview.tsx:58] [E: packages/storybook/.storybook/preview.tsx:76] [E: packages/storybook/.storybook/preview.tsx:79] [E: packages/storybook/.storybook/preview.tsx:83]。 |
| `packages/storybook/.storybook/theme-tool.ts` | Manager toolbar control。用 Storybook manager API 的 `useGlobals` 更新 `theme` global [E: packages/storybook/.storybook/theme-tool.ts:1] [E: packages/storybook/.storybook/theme-tool.ts:2] [E: packages/storybook/.storybook/theme-tool.ts:6] [E: packages/storybook/.storybook/theme-tool.ts:10]。 |
| `packages/storybook/.storybook/playground-css-plugin.ts` | Local Vite endpoint。`POST /__playground/apply-css` 接收 `{ edits }`, 在 `packages/session-ui/src/components` 或 `packages/ui/src/components` 里按 anchor/prop 改 CSS [E: packages/storybook/.storybook/playground-css-plugin.ts:21] [E: packages/storybook/.storybook/playground-css-plugin.ts:23] [E: packages/storybook/.storybook/playground-css-plugin.ts:19] [E: packages/storybook/.storybook/playground-css-plugin.ts:32] [E: packages/storybook/.storybook/playground-css-plugin.ts:41] [E: packages/storybook/.storybook/playground-css-plugin.ts:100] [E: packages/storybook/.storybook/playground-css-plugin.ts:122]。 |

## 数据模型

`main.ts` 的 story sources 是 `../../ui/src/**/*.stories.@(...)`, `../../session-ui/src/**/*.stories.@(...)`, `../../app/src/**/*.stories.@(...)`, 所以 Storybook 的 catalog 覆盖 UI package、session UI package 和 app package stories [E: packages/storybook/.storybook/main.ts:25] [E: packages/storybook/.storybook/main.ts:26] [E: packages/storybook/.storybook/main.ts:27] [E: packages/storybook/.storybook/main.ts:28]。`viteFinal` 把 `@` alias 指向 `packages/app/src`, 同时对 app contexts、router、model dialogs 等路径设置 mock replacement, 让 UI stories 可以渲染依赖 app context 的组件 [E: packages/storybook/.storybook/main.ts:10] [E: packages/storybook/.storybook/main.ts:37] [E: packages/storybook/.storybook/main.ts:38] [E: packages/storybook/.storybook/main.ts:50] [E: packages/storybook/.storybook/main.ts:52] [E: packages/storybook/.storybook/main.ts:57] [E: packages/storybook/.storybook/main.ts:59]。

Preview 的 `globalTypes.theme` 定义了 Storybook 全局 theme selector, default 是 `light` [E: packages/storybook/.storybook/preview.tsx:79] [E: packages/storybook/.storybook/preview.tsx:80] [E: packages/storybook/.storybook/preview.tsx:83]。

`Edit` payload 是 `{ file, anchor, prop, value }`, 其中 `file` 会在 `session-ui/src/components` 和 `ui/src/components` 两个 root 下 resolve, 并且 path 必须仍以其中一个 root 开头才会被接受 [E: packages/storybook/.storybook/playground-css-plugin.ts:19] [E: packages/storybook/.storybook/playground-css-plugin.ts:23] [E: packages/storybook/.storybook/playground-css-plugin.ts:100] [E: packages/storybook/.storybook/playground-css-plugin.ts:101]。

## 控制流

1. `storybook` script 启动 dev server on port 6006, build script 运行 `storybook build` [E: packages/storybook/package.json:7] [E: packages/storybook/package.json:8]。
2. Storybook main config 读取 UI/session-ui/app/mocks 路径, 然后在 `viteFinal` 合并 Tailwind、playground CSS、dedupe 和 aliases [E: packages/storybook/.storybook/main.ts:8] [E: packages/storybook/.storybook/main.ts:9] [E: packages/storybook/.storybook/main.ts:10] [E: packages/storybook/.storybook/main.ts:11] [E: packages/storybook/.storybook/main.ts:30] [E: packages/storybook/.storybook/main.ts:33] [E: packages/storybook/.storybook/main.ts:35] [E: packages/storybook/.storybook/main.ts:36]。
3. Preview decorator 对每个 story 包一层 MetaProvider、Font、ThemeProvider、DialogProvider、MarkedProvider, 再放入有 background/text color 的 frame div [E: packages/storybook/.storybook/preview.tsx:47] [E: packages/storybook/.storybook/preview.tsx:52] [E: packages/storybook/.storybook/preview.tsx:53] [E: packages/storybook/.storybook/preview.tsx:54] [E: packages/storybook/.storybook/preview.tsx:55] [E: packages/storybook/.storybook/preview.tsx:57] [E: packages/storybook/.storybook/preview.tsx:58] [E: packages/storybook/.storybook/preview.tsx:59]。
4. `Scheme` 监听 Storybook `GLOBALS_UPDATED`, 将 `globals.theme` 映射到 UI theme color scheme, 并给 document root 加 `light` 或 `dark` class [E: packages/storybook/.storybook/preview.tsx:22] [E: packages/storybook/.storybook/preview.tsx:27] [E: packages/storybook/.storybook/preview.tsx:34] [E: packages/storybook/.storybook/preview.tsx:35] [E: packages/storybook/.storybook/preview.tsx:38] [E: packages/storybook/.storybook/preview.tsx:41]。
5. `playgroundCss` 在 Vite dev server 上拦截 `POST /__playground/apply-css`, JSON parse edits, group by file, read CSS, apply string replacement, 成功时 `fs.writeFileSync` 写回源码 [E: packages/storybook/.storybook/playground-css-plugin.ts:64] [E: packages/storybook/.storybook/playground-css-plugin.ts:66] [E: packages/storybook/.storybook/playground-css-plugin.ts:81] [E: packages/storybook/.storybook/playground-css-plugin.ts:97] [E: packages/storybook/.storybook/playground-css-plugin.ts:100] [E: packages/storybook/.storybook/playground-css-plugin.ts:117] [E: packages/storybook/.storybook/playground-css-plugin.ts:118] [E: packages/storybook/.storybook/playground-css-plugin.ts:122]。

## 设计动机与权衡

Storybook 使用 mock aliases 而不是启动完整 opencode server, 这让 UI stories 可以覆盖需要 app context 的组件, 同时把 runtime state 和 network behavior 留在 mocked boundary [E: packages/storybook/.storybook/main.ts:37] [E: packages/storybook/.storybook/main.ts:50] [E: packages/storybook/.storybook/main.ts:52] [I]。Preview 统一注入 ThemeProvider/DialogProvider/MarkedProvider, 让 stories 与 app shell 中的 UI 环境更接近 [E: packages/storybook/.storybook/preview.tsx:55] [E: packages/storybook/.storybook/preview.tsx:57] [E: packages/storybook/.storybook/preview.tsx:58]。

## Gotcha

- `playgroundCss` 会真实写 `packages/session-ui/src/components` 或 `packages/ui/src/components` 下的 CSS 文件, 只应在本地 sandbox 使用 [E: packages/storybook/.storybook/playground-css-plugin.ts:19] [E: packages/storybook/.storybook/playground-css-plugin.ts:100] [E: packages/storybook/.storybook/playground-css-plugin.ts:122] [I]。
- Storybook manager toolbar 的 `theme-tool.ts` 用 React `createElement`; component stories 仍由 `storybook-solidjs-vite` framework 和 stories glob 驱动 [E: packages/storybook/.storybook/theme-tool.ts:1] [E: packages/storybook/.storybook/main.ts:15] [E: packages/storybook/.storybook/main.ts:25] [I]。

## Sources

- `packages/storybook/package.json`
- `packages/storybook/.storybook/main.ts`
- `packages/storybook/.storybook/preview.tsx`
- `packages/storybook/.storybook/theme-tool.ts`
- `packages/storybook/.storybook/playground-css-plugin.ts`

## 相关

- [共享 UI 组件库(SolidJS)](ui.md)
