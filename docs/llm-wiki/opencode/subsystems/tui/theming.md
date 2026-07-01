---
id: tui.theming
title: TUI 主题系统
kind: subsystem
tier: T2
v: na
source: [packages/tui/src/theme/index.ts, packages/tui/src/context/theme.tsx]
symbols: [ThemeJson, DEFAULT_THEMES, resolveTheme, generateSystem, ThemeProvider, useTheme]
related: [ref.themes, tui.runtime-hosting, tui.feature-plugins]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> TUI theming 是 ThemeJson 解析 + 默认/插件/自定义/system 主题合成 + OpenTUI terminal palette 监听；完整主题字段表归档在 `ref.themes`，本页解释当前源码里的解析与运行时控制流。

## 能回答的问题

- `ThemeJson` schema 支持哪些值类型和 fallback？
- 32 个内建 theme 如何注册，优先级如何覆盖？
- `system` theme 如何从 terminal palette 合成？
- ThemeProvider 如何发现 `.opencode/themes/*.json`、监听 SIGUSR2 与 terminal mode？
- Plugin theme install 和 custom themes 如何与 active theme 交互？

## ThemeJson 与 Theme

`Theme` 是运行时解析后的 RGBA 字段集合，包含 primary/status/text/background/border/diff/markdown/syntax 颜色、`thinkingOpacity` 和 `_hasSelectedListItemText` marker。[E: packages/tui/src/theme/index.ts:36] [E: packages/tui/src/theme/index.ts:89] [E: packages/tui/src/theme/index.ts:90] `ThemeJson` 则是配置文件 shape：可选 `$schema`、`defs`，以及 `theme` 对象；颜色值可以是 hex、引用名、dark/light variant 或 RGBA，`selectedListItemText`、`backgroundMenu`、`thinkingOpacity` 是可选字段。[E: packages/tui/src/theme/index.ts:113] [E: packages/tui/src/theme/index.ts:119] [E: packages/tui/src/theme/index.ts:120] [E: packages/tui/src/theme/index.ts:121] [E: packages/tui/src/theme/index.ts:122] [E: packages/tui/src/theme/index.ts:123] [E: packages/tui/src/theme/index.ts:124] [E: packages/tui/src/theme/index.ts:125] [E: packages/tui/src/theme/index.ts:126]

`resolveTheme(theme, mode)` 会递归解析 `defs` 和 theme field 引用，检测 circular reference，并在 reference 缺失时抛错。[E: packages/tui/src/theme/index.ts:241] [E: packages/tui/src/theme/index.ts:250] [E: packages/tui/src/theme/index.ts:254] [E: packages/tui/src/theme/index.ts:256] [E: packages/tui/src/theme/index.ts:258] [E: packages/tui/src/theme/index.ts:263] optional fallback 规则是：`selectedListItemText` 缺失时使用 background，`backgroundMenu` 缺失时使用 backgroundElement，`thinkingOpacity` 缺省为 0.6。[E: packages/tui/src/theme/index.ts:275] [E: packages/tui/src/theme/index.ts:281] [E: packages/tui/src/theme/index.ts:285] [E: packages/tui/src/theme/index.ts:288] [E: packages/tui/src/theme/index.ts:292]

## 内建主题与优先级

源码 import 了 33 个 JSON asset，并将它们放入 `DEFAULT_THEMES`：aura、ayu、catppuccin、catppuccin-frappe、catppuccin-macchiato、cobalt2、cursor、dracula、everforest、flexoki、github、gruvbox、kanagawa、material、matrix、mercury、monokai、nightowl、nord、one-dark、osaka-jade、opencode、orng、lucent-orng、palenight、rosepine、solarized、synthwave84、tokyonight、vesper、vercel、zenburn、carbonfox。[E: packages/tui/src/theme/index.ts:2] [E: packages/tui/src/theme/index.ts:34] [E: packages/tui/src/theme/index.ts:130] [E: packages/tui/src/theme/index.ts:163]

`listThemes()` 的实现先 spread `DEFAULT_THEMES`、`pluginThemes`、`customThemes`，最后在存在 `systemTheme` 时追加 `system`；由 spread 顺序可推断覆盖优先级是 defaults < plugin installs < custom files < generated system。[E: packages/tui/src/theme/index.ts:173] [E: packages/tui/src/theme/index.ts:174] [E: packages/tui/src/theme/index.ts:175] [E: packages/tui/src/theme/index.ts:176] [E: packages/tui/src/theme/index.ts:181] [I] 因此 custom file 可以覆盖同名 default/plugin theme，`system` 是单独的动态 key。[I]

## Runtime discovery

默认 `themeSource.discover()` 会扫描 `Global.Path.config`，再从 `process.cwd()` 向父目录逐层加入 `.opencode`，最后调用 `discoverThemes(directories)`。[E: packages/tui/src/context/theme.tsx:37] [E: packages/tui/src/context/theme.tsx:39] [E: packages/tui/src/context/theme.tsx:41] [E: packages/tui/src/context/theme.tsx:44] `discoverThemes` 对每个 directory 扫 `themes/*.json`，以 basename 作为 theme name，JSON.parse 文件内容。[E: packages/tui/src/context/theme.tsx:52] [E: packages/tui/src/context/theme.tsx:55] [E: packages/tui/src/context/theme.tsx:57]

`ThemeProvider` 初始 state 包含 `themes: allThemes()`、`mode: "dark"`、`active: "opencode"`、`ready: false`。[E: packages/tui/src/context/theme.tsx:93] [E: packages/tui/src/context/theme.tsx:94] [E: packages/tui/src/context/theme.tsx:96] [E: packages/tui/src/context/theme.tsx:97] init 时从 KV `theme_mode_lock`、renderer.themeMode 或 props.mode 选择 mode，从 config.theme 或 KV `theme` 选择 active theme。[E: packages/tui/src/context/theme.tsx:116] [E: packages/tui/src/context/theme.tsx:117] [E: packages/tui/src/context/theme.tsx:121] [E: packages/tui/src/context/theme.tsx:122] `onMount` 并行 resolve system theme 与 sync custom themes，完成后设 `ready: true`。[E: packages/tui/src/context/theme.tsx:146] [E: packages/tui/src/context/theme.tsx:147] [E: packages/tui/src/context/theme.tsx:148]

## System theme

`resolveSystemTheme(mode)` 通过 `renderer.getPalette({ size: 16 })` 读取 terminal palette；如果 palette 缺失，且当前 active 是 `system`，会退回 `opencode`。[E: packages/tui/src/context/theme.tsx:155] [E: packages/tui/src/context/theme.tsx:157] [E: packages/tui/src/context/theme.tsx:159] [E: packages/tui/src/context/theme.tsx:162] mode 优先取 lock，其次 `terminalMode(colors)`，最后传入 mode；terminalMode 使用 default background luminance 判定 light/dark。[E: packages/tui/src/context/theme.tsx:165] [E: packages/tui/src/theme/index.ts:354] [E: packages/tui/src/theme/index.ts:357]

`generateSystem(colors, mode)` 用 default background/foreground、ANSI palette、灰阶、muted text、diff alpha 合成完整 `ThemeJson`，并把 background 设为透明以尊重 terminal transparency。[E: packages/tui/src/theme/index.ts:360] [E: packages/tui/src/theme/index.ts:361] [E: packages/tui/src/theme/index.ts:362] [E: packages/tui/src/theme/index.ts:373] [E: packages/tui/src/theme/index.ts:374] [E: packages/tui/src/theme/index.ts:377] [E: packages/tui/src/theme/index.ts:390] [E: packages/tui/src/theme/index.ts:398] [E: packages/tui/src/theme/index.ts:417]

## 控制流

1. `subscribeThemes()` 让全局 theme registry 变化直接写入 ThemeProvider store。[E: packages/tui/src/theme/index.ts:200] [E: packages/tui/src/theme/index.ts:201] [E: packages/tui/src/context/theme.tsx:100] [E: packages/tui/src/theme/index.ts:207] [E: packages/tui/src/theme/index.ts:212] [E: packages/tui/src/theme/index.ts:237]
2. config.theme 变化时，ThemeProvider 直接把 active 设成 config value。[E: packages/tui/src/context/theme.tsx:127] [E: packages/tui/src/context/theme.tsx:129]
3. `refreshSystemTheme()` 有 running/queued guard；如果 palette detection 仍在 detecting，会在当前 resolve 后再次刷新。[E: packages/tui/src/context/theme.tsx:181] [E: packages/tui/src/context/theme.tsx:186] [E: packages/tui/src/context/theme.tsx:192] [E: packages/tui/src/context/theme.tsx:198]
4. `pin(mode)` 持久化 KV `theme_mode_lock`，`free()` 清除 lock 和旧 `theme_mode`，再按 renderer.themeMode 刷新 system theme。[E: packages/tui/src/context/theme.tsx:209] [E: packages/tui/src/context/theme.tsx:211] [E: packages/tui/src/context/theme.tsx:215] [E: packages/tui/src/context/theme.tsx:219]
5. renderer `CliRenderEvents.THEME_MODE`、terminal `\x1b[?997;1n/2n` notification、SIGUSR2 refresh source 都会触发 mode/theme refresh。[E: packages/tui/src/context/theme.tsx:226] [E: packages/tui/src/context/theme.tsx:229] [E: packages/tui/src/context/theme.tsx:230] [E: packages/tui/src/context/theme.tsx:46] [E: packages/tui/src/context/theme.tsx:47] [E: packages/tui/src/context/theme.tsx:246]
6. 当前 theme 值 memo 先用 active，失败则尝试 KV saved theme，最后 fallback 到 `opencode`。[E: packages/tui/src/context/theme.tsx:256] [E: packages/tui/src/context/theme.tsx:258] [E: packages/tui/src/context/theme.tsx:260] [E: packages/tui/src/context/theme.tsx:262] [E: packages/tui/src/context/theme.tsx:263] [E: packages/tui/src/context/theme.tsx:266]
7. 每次 theme 解析后，renderer background 被设为 `values().background`；syntax/subtleSyntax 由 `generateSyntax`、`generateSubtleSyntax` 创建并延迟 destroy 旧 `SyntaxStyle`。[E: packages/tui/src/context/theme.tsx:269] [E: packages/tui/src/context/theme.tsx:271] [E: packages/tui/src/context/theme.tsx:272] [E: packages/tui/src/context/theme.tsx:313] [E: packages/tui/src/context/theme.tsx:318]

## Plugin 与 theme install

TUI-side adapter 暴露 `theme.current`、`theme.selected`、`theme.has`、`theme.set`、`theme.mode`、`theme.ready`，但 base adapter 的 `theme.install` 会抛错，提示只在 plugin context 可用。[E: packages/tui/src/plugin/adapters.tsx:332] [E: packages/tui/src/plugin/adapters.tsx:335] [E: packages/tui/src/plugin/adapters.tsx:338] [E: packages/tui/src/plugin/adapters.tsx:341] [E: packages/tui/src/plugin/adapters.tsx:344] [E: packages/tui/src/plugin/adapters.tsx:347] [E: packages/tui/src/plugin/adapters.tsx:350] V1 legacy plugin runtime 会在 plugin-scoped API 上覆盖 `theme.install`，实际调用 `createThemeInstaller()` 将 theme 文件复制到 local/global themes 目录并 `upsertTheme(name, data)`。[E: packages/opencode/src/plugin/tui/runtime.ts:589] [E: packages/opencode/src/plugin/tui/runtime.ts:590] [E: packages/opencode/src/plugin/tui/runtime.ts:251] [E: packages/opencode/src/plugin/tui/runtime.ts:259] [E: packages/opencode/src/plugin/tui/runtime.ts:302] [E: packages/opencode/src/plugin/tui/runtime.ts:303] [E: packages/opencode/src/plugin/tui/runtime.ts:306]

## 设计动机与权衡

Theme system 把解析/运行时 registry 放在 `packages/tui`，把插件发现和安装文件写入留给 host plugin runtime。[I] 这与 `specs/tui-package.md` 的 Section 7 边界一致：plugin slots/routes/API/presentation state 在 `@opencode-ai/tui`，discovery/installation/manifest/config mutation 留在 legacy host。[E: specs/tui-package.md:395] [E: specs/tui-package.md:397] [E: specs/tui-package.md:398] [E: specs/tui-package.md:409]

## Gotcha

- `addTheme()` 不允许覆盖已有主题；`upsertTheme()` 若同名 custom theme 存在则写 customThemes，否则写 pluginThemes。[E: packages/tui/src/theme/index.ts:220] [E: packages/tui/src/theme/index.ts:223] [E: packages/tui/src/theme/index.ts:229] [E: packages/tui/src/theme/index.ts:232] [E: packages/tui/src/theme/index.ts:235]
- OpenTUI palette detection 的内部算法不在 opencode 源码内；本 wiki 只能核到 TUI 调用 `renderer.getPalette()`、监听 THEME_MODE/terminal color-scheme notification 并合成 ThemeJson 的行为。[E: packages/tui/src/context/theme.tsx:157] [E: packages/tui/src/context/theme.tsx:226] [E: packages/tui/src/context/theme.tsx:229] [E: packages/tui/src/theme/index.ts:360] [U]

## Sources

- `packages/tui/src/theme/index.ts`
- `packages/tui/src/context/theme.tsx`
- `packages/tui/src/plugin/adapters.tsx`
- `packages/opencode/src/plugin/tui/runtime.ts`
- `specs/tui-package.md`

## 相关

- `ref.themes`：完整内建 theme 名称与字段表。
- `tui.runtime-hosting`：legacy host 如何注入插件 runtime。
- `tui.feature-plugins`：插件如何通过 theme API 和 slots 改变 presentation。
