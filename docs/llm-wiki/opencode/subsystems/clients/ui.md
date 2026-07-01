---
id: clients.ui
title: 共享 UI 组件库(SolidJS)
kind: subsystem
tier: T2
v: na
source:
  - packages/ui/package.json
  - packages/ui/src/components/button.tsx
  - packages/ui/src/v2/components/button-v2.tsx
  - packages/ui/src/theme/index.ts
  - packages/ui/src/theme/context.tsx
  - packages/ui/src/theme/v2/resolve.ts
  - packages/ui/src/context/index.ts
  - packages/ui/src/i18n/en.ts
related:
  - clients.app
  - clients.storybook
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> 共享 UI 组件库是 `@opencode-ai/ui`: 它为 App、Desktop、Console、Storybook 提供 SolidJS components、v2 components、theme engine、i18n dictionaries、icons、fonts、audio 和 shared contexts。

## 能回答的问题

- `@opencode-ai/ui` 暴露哪些 public entrypoints?
- v1 component 与 v2 component 的目录和 API 如何区分?
- 组件库怎样使用 Kobalte primitive?
- theme provider 如何把 theme JSON 转成 CSS variables?
- UI i18n dictionary 覆盖哪些通用文案?

## 职责边界

`@opencode-ai/ui` 是 presentation library, 不是 App shell。package exports 将 `./*` 映射到 `src/components/*.tsx`, 将 `./v2/*` 映射到 `src/v2/components/*.tsx`, 还暴露 i18n、hooks、context、storybook fixtures/scaffold、styles、theme、icons、fonts、audio 等资源 [E: packages/ui/package.json:35] [E: packages/ui/package.json:37] [E: packages/ui/package.json:38] [E: packages/ui/package.json:39] [E: packages/ui/package.json:40] [E: packages/ui/package.json:42] [E: packages/ui/package.json:44] [E: packages/ui/package.json:46] [E: packages/ui/package.json:48] [E: packages/ui/package.json:49] [E: packages/ui/package.json:50] [E: packages/ui/package.json:51] [E: packages/ui/package.json:52] [E: packages/ui/package.json:53] [E: packages/ui/package.json:54] [E: packages/ui/package.json:55] [E: packages/ui/package.json:56]。它的 dependencies 包含 Kobalte、Marked/Shiki、DOMPurify、Motion、Solid primitives 和 render/diff helpers; SolidJS 和 `@solidjs/meta` 是 peer/dev dependency [E: packages/ui/package.json:67] [E: packages/ui/package.json:74] [E: packages/ui/package.json:83] [E: packages/ui/package.json:84] [E: packages/ui/package.json:86] [E: packages/ui/package.json:87] [E: packages/ui/package.json:88] [E: packages/ui/package.json:89] [E: packages/ui/package.json:91] [E: packages/ui/package.json:92] [E: packages/ui/package.json:96] [E: packages/ui/package.json:98] [E: packages/ui/package.json:99] [E: packages/ui/package.json:100] [E: packages/ui/package.json:106] [E: packages/ui/package.json:110] [E: packages/ui/package.json:111]。

V1/V2 关系: UI 包自身是 `v: na`, 但它暴露两个 design-system generation。`./*` 是旧组件入口, `./v2/*` 是 v2 组件入口 [E: packages/ui/package.json:37] [E: packages/ui/package.json:55]。

## 技术栈

- SolidJS component library, Vite dev server 和 typecheck scripts [E: packages/ui/package.json:60] [E: packages/ui/package.json:62] [E: packages/ui/package.json:74] [E: packages/ui/package.json:80] [E: packages/ui/package.json:111]。
- Kobalte primitive wrapper: v1 `Button` 和 v2 `ButtonV2` 都 import `Button as Kobalte` [E: packages/ui/src/components/button.tsx:1] [E: packages/ui/src/v2/components/button-v2.tsx:1]。
- Theme engine: `theme/index.ts` export color conversion、v1 resolver、v2 resolver、loader、context 和 default themes [E: packages/ui/src/theme/index.ts:15] [E: packages/ui/src/theme/index.ts:34] [E: packages/ui/src/theme/index.ts:35] [E: packages/ui/src/theme/index.ts:36] [E: packages/ui/src/theme/index.ts:37] [E: packages/ui/src/theme/index.ts:39]。
- i18n dictionary: English dict 包含 session review、file media、line comments、session turn statuses、dialog text 和 tool labels 等 shared UI strings [E: packages/ui/src/i18n/en.ts:1] [E: packages/ui/src/i18n/en.ts:2] [E: packages/ui/src/i18n/en.ts:22] [E: packages/ui/src/i18n/en.ts:32] [E: packages/ui/src/i18n/en.ts:39] [E: packages/ui/src/i18n/en.ts:56] [E: packages/ui/src/i18n/en.ts:112]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/ui/package.json` | Public API map。组件、context、theme、styles、icons、fonts/audio、v2 components 都从这里暴露 [E: packages/ui/package.json:37] [E: packages/ui/package.json:40] [E: packages/ui/package.json:44] [E: packages/ui/package.json:46] [E: packages/ui/package.json:49] [E: packages/ui/package.json:50] [E: packages/ui/package.json:51] [E: packages/ui/package.json:52] [E: packages/ui/package.json:53] [E: packages/ui/package.json:55]。 |
| `packages/ui/src/components/button.tsx` | v1 component pattern。props 包含 `size`, `variant`, `icon`, render 时写 `data-component="button"` 和 `data-variant` [E: packages/ui/src/components/button.tsx:5] [E: packages/ui/src/components/button.tsx:8] [E: packages/ui/src/components/button.tsx:9] [E: packages/ui/src/components/button.tsx:10] [E: packages/ui/src/components/button.tsx:18] [E: packages/ui/src/components/button.tsx:20]。 |
| `packages/ui/src/v2/components/button-v2.tsx` | v2 component pattern。导入自己的 CSS, variant set 包含 `neutral/danger/outline/contrast/ghost/ghost-muted/loading`, render 时写 `data-component="button-v2"` [E: packages/ui/src/v2/components/button-v2.tsx:4] [E: packages/ui/src/v2/components/button-v2.tsx:6] [E: packages/ui/src/v2/components/button-v2.tsx:10] [E: packages/ui/src/v2/components/button-v2.tsx:20]。 |
| `packages/ui/src/theme/context.tsx` | ThemeProvider。动态 glob `./themes/*.json`, 本地存储 theme/color scheme, 注入 `#oc-theme` style element, 暴露 preview/commit/cancel/register APIs [E: packages/ui/src/theme/context.tsx:28] [E: packages/ui/src/theme/context.tsx:14] [E: packages/ui/src/theme/context.tsx:16] [E: packages/ui/src/theme/context.tsx:119] [E: packages/ui/src/theme/context.tsx:123] [E: packages/ui/src/theme/context.tsx:323] [E: packages/ui/src/theme/context.tsx:324] [E: packages/ui/src/theme/context.tsx:350] [E: packages/ui/src/theme/context.tsx:360]。 |
| `packages/ui/src/theme/v2/resolve.ts` | v2 token resolver。生成 primitive ramps, semantic tokens, foreground tokens, 输出 CSS variables [E: packages/ui/src/theme/v2/resolve.ts:9] [E: packages/ui/src/theme/v2/resolve.ts:109] [E: packages/ui/src/theme/v2/resolve.ts:121] [E: packages/ui/src/theme/v2/resolve.ts:135] [E: packages/ui/src/theme/v2/resolve.ts:137] [E: packages/ui/src/theme/v2/resolve.ts:138] [E: packages/ui/src/theme/v2/resolve.ts:149]。 |

## 数据模型

v1 `ButtonProps` 允许 `size: "small" | "normal" | "large"`, `variant: "primary" | "secondary" | "ghost"`, `icon` 来自 `IconProps["name"]` [E: packages/ui/src/components/button.tsx:5] [E: packages/ui/src/components/button.tsx:8] [E: packages/ui/src/components/button.tsx:9] [E: packages/ui/src/components/button.tsx:10]。v2 `ButtonV2Props` 同样保留 size/icon, 但 variant 集合换成 `neutral`, `danger`, `outline`, `contrast`, `ghost`, `ghost-muted`, `loading` [E: packages/ui/src/v2/components/button-v2.tsx:6] [E: packages/ui/src/v2/components/button-v2.tsx:9] [E: packages/ui/src/v2/components/button-v2.tsx:10]。

Theme context 的 store 包含 `themes`, `themeId`, `colorScheme`, `mode`, `previewThemeId`, `previewScheme` [E: packages/ui/src/theme/context.tsx:180] [E: packages/ui/src/theme/context.tsx:181] [E: packages/ui/src/theme/context.tsx:184] [E: packages/ui/src/theme/context.tsx:185] [E: packages/ui/src/theme/context.tsx:186] [E: packages/ui/src/theme/context.tsx:187] [E: packages/ui/src/theme/context.tsx:188]。默认 theme id 是 `oc-2`, 并且 `oc-1` 会 normalize 到 `oc-2` [E: packages/ui/src/theme/context.tsx:87] [E: packages/ui/src/theme/context.tsx:177]。

v2 theme primitive steps 是 100 到 1200, `generateV2Primitives` 从 neutral/ink/primary/accent/success/warning/error/info/interactive/diff palette inputs 生成 grey/blue/green/yellow/red/purple/pink/orange/cyan ramps [E: packages/ui/src/theme/v2/resolve.ts:9] [E: packages/ui/src/theme/v2/resolve.ts:11] [E: packages/ui/src/theme/v2/resolve.ts:12] [E: packages/ui/src/theme/v2/resolve.ts:13] [E: packages/ui/src/theme/v2/resolve.ts:14] [E: packages/ui/src/theme/v2/resolve.ts:15] [E: packages/ui/src/theme/v2/resolve.ts:16] [E: packages/ui/src/theme/v2/resolve.ts:17] [E: packages/ui/src/theme/v2/resolve.ts:18] [E: packages/ui/src/theme/v2/resolve.ts:19] [E: packages/ui/src/theme/v2/resolve.ts:20] [E: packages/ui/src/theme/v2/resolve.ts:21] [E: packages/ui/src/theme/v2/resolve.ts:22] [E: packages/ui/src/theme/v2/resolve.ts:109] [E: packages/ui/src/theme/v2/resolve.ts:121] [E: packages/ui/src/theme/v2/resolve.ts:131]。

## 控制流

1. `ThemeProvider` 初始化时读取 localStorage 的 theme id 和 color scheme, 根据 system mode 计算当前 mode [E: packages/ui/src/theme/context.tsx:174] [E: packages/ui/src/theme/context.tsx:176] [E: packages/ui/src/theme/context.tsx:177] [E: packages/ui/src/theme/context.tsx:178] [E: packages/ui/src/theme/context.tsx:179]。
2. ThemeProvider 用 `import.meta.glob("./themes/*.json")` lazy-load theme JSON, 并按 sorted ids 暴露 available themes [E: packages/ui/src/theme/context.tsx:26] [E: packages/ui/src/theme/context.tsx:28] [E: packages/ui/src/theme/context.tsx:32] [E: packages/ui/src/theme/context.tsx:36]。
3. `applyThemeCss` 同时调用 v1 `themeToCss` 和 v2 `themeV2ToCss`, 合并写入 `:root` CSS variables [E: packages/ui/src/theme/context.tsx:133] [E: packages/ui/src/theme/context.tsx:136] [E: packages/ui/src/theme/context.tsx:137] [E: packages/ui/src/theme/context.tsx:138] [E: packages/ui/src/theme/context.tsx:144] [E: packages/ui/src/theme/context.tsx:147] [E: packages/ui/src/theme/context.tsx:148]。
4. `createEffect` 监听当前 theme/mode, 有 theme 时调用 `applyTheme(theme, store.themeId, store.mode)` [E: packages/ui/src/theme/context.tsx:278] [E: packages/ui/src/theme/context.tsx:279] [E: packages/ui/src/theme/context.tsx:281]。
5. Components 通过 Kobalte primitive + data attributes 表达状态, 例如 `Button` 和 `ButtonV2` 都把 size/variant/icon 写成 data attributes 给 CSS 消费 [E: packages/ui/src/components/button.tsx:16] [E: packages/ui/src/components/button.tsx:18] [E: packages/ui/src/components/button.tsx:19] [E: packages/ui/src/components/button.tsx:20] [E: packages/ui/src/components/button.tsx:21] [E: packages/ui/src/v2/components/button-v2.tsx:18] [E: packages/ui/src/v2/components/button-v2.tsx:20] [E: packages/ui/src/v2/components/button-v2.tsx:21] [E: packages/ui/src/v2/components/button-v2.tsx:22] [E: packages/ui/src/v2/components/button-v2.tsx:23]。

## 设计动机与权衡

UI 包把 low-level components、theme、i18n、icons 和 render helpers 收进一个 package, 让 `packages/app`, `packages/desktop`, `packages/console`, `packages/storybook` 不需要复制 presentation primitives [I]。package exports 同时保留 v1/v2 两套 component entrypoints [E: packages/ui/package.json:37] [E: packages/ui/package.json:55], 这允许新 design system 迁移逐步发生, 而不强迫所有 consumers 一次性切换 [I]。

## Gotcha

- v2 组件入口映射到 `src/v2/components/*.tsx` [E: packages/ui/package.json:55]; 它不是 `packages/core` V2 session kernel, 而是 UI design-system generation [I]。
- Theme provider 同时生成旧 token 和 `--v2-*` token [E: packages/ui/src/theme/context.tsx:137] [E: packages/ui/src/theme/context.tsx:138] [E: packages/ui/src/theme/context.tsx:148] [E: packages/ui/src/theme/v2/resolve.ts:149], 所以某个页面使用 v2 component 不一定需要另起 theme provider [I]。

## Sources

- `packages/ui/package.json`
- `packages/ui/src/components/button.tsx`
- `packages/ui/src/v2/components/button-v2.tsx`
- `packages/ui/src/theme/index.ts`
- `packages/ui/src/theme/context.tsx`
- `packages/ui/src/theme/v2/resolve.ts`
- `packages/ui/src/context/index.ts`
- `packages/ui/src/i18n/en.ts`

## 相关

- [App UI shell(SolidJS)](app.md)
- [Storybook(UI 沙盒)](storybook.md)
