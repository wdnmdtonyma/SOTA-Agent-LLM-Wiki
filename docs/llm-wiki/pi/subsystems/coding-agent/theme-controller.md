---
id: subsys.coding-agent.theme-controller
title: 主题引擎与自动检测
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/modes/interactive/theme/theme-controller.ts
  - packages/coding-agent/src/modes/interactive/theme/theme.ts
  - packages/coding-agent/src/modes/interactive/theme/theme-json.ts
  - packages/coding-agent/src/modes/interactive/theme/system-theme.ts
  - packages/tui/src/oklab.ts
  - packages/tui/src/colors.ts
  - packages/coding-agent/test/theme-controller.test.ts
  - packages/coding-agent/docs/themes.md
symbols:
  - InteractiveThemeController
  - requestTerminalColors
  - SYSTEM_THEME_NAME
  - generateSystemThemeColors
  - parseAutoThemeSetting
related:
 - subsys.coding-agent.interactive-orchestration
 - subsys.tui.terminal-colors
evidence: explicit
status: verified
updated: 6f7551516b
---

> `subsys.coding-agent.theme-controller` 描述 pi-coding-agent 的 interactive theme layer: `settings.theme`、内置生成主题 `system`、JSON `dark`/`light`、`light/dark` slash 配对、terminal color query 与 TUI 重绘连成运行时状态机。

## 能回答的问题

- `InteractiveThemeController` 如何从 `settings.theme` 决定 active theme?
- `--use-theme` / `initialThemeSetting` 如何做 per-run theme, 且不把这次选择写入 settings?
- `"lightTheme/darkTheme"` 这种 automatic theme setting 怎样解析, 何时启用 terminal color-scheme notifications?
- 首次没有显式 theme setting 时, pi 如何落到 `system` 而不是只在 `dark`/`light` 间二选一?
- `SYSTEM_THEME_NAME` 的三级生成、灰度启动和 `requestTerminalColors` 超时如何配合?
- theme JSON 支持哪些 token、变量和 color value 格式?
- custom theme 什么时候 hot reload, invalid theme 失败后怎样 fallback?
- `pi-coding-agent` 和 `pi-tui` 在 terminal color detection 上怎样分工?

## 职责边界

`InteractiveThemeController` 是 interactive mode 的 product-level coordinator: 它持有 `ui`、`getSettingsManager` getter、错误展示 callback、change callback、per-run `currentThemeSetting`、已报告的 `terminalColors`、当前 `activeThemeName` 和 auto-sync 开关 [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:58] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:63] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:66]。

`theme.ts` 是 theme engine: validator 安装、color 解析、theme loading、registered themes、global `theme` proxy、watcher 与 TUI helper。`ThemeJsonSchema` 在 `theme-json.ts`。`system-theme.ts` 生成名为 `system` 的内置主题 [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:31] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:53] [E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:18] [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:32] [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:462]。

本节点不逐项枚举全部 color token 的设计含义; `packages/coding-agent/docs/themes.md` 把 token 分组为 Core UI、Backgrounds & Content、Markdown、Tool Diffs、Syntax Highlighting、Thinking Level Borders、Bash Mode 和 optional HTML Export。

## 关键文件

- `packages/coding-agent/src/modes/interactive/theme/theme-controller.ts`: `requestTerminalColors`、`InteractiveThemeController`、per-run setting、`applyFromSettings`、preview、auto-sync、TUI rebind [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:31] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:58] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:103]。
- `packages/coding-agent/src/modes/interactive/theme/theme.ts`: loader、`parseAutoThemeSetting`、`setTerminalColors` / `markTerminalColorsPending`、global singleton [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:200] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:211] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:652]。
- `packages/coding-agent/src/modes/interactive/theme/system-theme.ts`: `SYSTEM_THEME_NAME = "system"` 与 `generateSystemThemeColors` [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:32] [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:462]。
- `packages/coding-agent/src/modes/interactive/theme/theme-json.ts`: `ThemeJsonSchema` 与 `validateThemeJson` [E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:18]。
- `packages/tui/src/oklab.ts`: Oklab / OKHSL ↔ sRGB (`LINEAR_SRGB_TO_LMS`, `okhslToRgb`); `colors.ts` 的 `okhslColor` 建立在其上 [E: packages/tui/src/oklab.ts:29] [E: packages/tui/src/oklab.ts:187] [E: packages/tui/src/colors.ts:107]。

## 数据模型

`TerminalTheme` 是 `"dark" | "light"` [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:650]。运行时 appearance 由 `detectTerminalTheme()` 决定: 有 reported background 时走 `terminalAppearance()`; 否则用 reported scheme、再 `COLORFGBG`、再 `"dark"` [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:702] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:707] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:708]。

`SYSTEM_THEME_NAME` 常量是 `"system"`。它不是 `dark.json`/`light.json` 文件, 而是生成主题; `getAvailableThemesWithPaths()` 用 `path: undefined` 加入它, 再 `sort` 把 `SYSTEM_THEME_NAME` 排到 JSON built-in 之前 [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:32] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:480] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:495] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:496]。JSON built-in 仍只有 `dark` 与 `light` [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:451] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:452]。

`ThemeJsonSchema` 要求 `name` 和 `colors`; `vars` 与 `appearance` 可选 [E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:18] [E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:20] [E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:23]。`ColorValue` 可以是 string(hex / OKLCH / OKHSL / 变量名 / `""`)或 0-255 integer(xterm index) [E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:13]。

`parseAutoThemeSetting(themeSetting)` 把恰好一个 slash 分隔且两侧 trim 后非空的 string 解析为 `{ lightTheme, darkTheme }`; 没有 slash、多于一个 slash 或任一侧为空都返回 `undefined` [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:652] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:656] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:663]。

## System theme 生成

`generateSystemThemeColors` 在 OKHSL 里上色: hue/saturation 来自 terminal palette 的 family ANSI slot(或 family 自带 hue), lightness 来自对比曲线 [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:462] [E: packages/tui/src/colors.ts:107]。三级:

1. 有 background 且 palette 长度为 16: 把 palette 转成 OKHSL, `paint` 用 palette slot 上色, lightness 相对 background [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:466]。
2. 只有 background: palette 为 `undefined`, `paint` 走 family 自带 hue, lightness 仍相对 background [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:468] [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:480]。
3. 没有 background: 提前 `return indexedColors(...)`, 用 ANSI 索引和 `""` 默认色, 由终端自己渲染 [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:465] [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:623]。

`createSystemTheme()` 在 `terminalColorsPending` 时把 `saturation` 设为 `0`(灰度), `setTerminalColors()` 后 pending 结束、再生成带色主题 [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:611] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:614] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:200]。

## 控制流

1. constructor 写入 `initialThemeSetting`, `resolveThemeName()` 得到初始名(无 setting 时 `SYSTEM_THEME_NAME`), `markTerminalColorsPending()`, `initTheme(activeThemeName, true)`, 再绑 color-scheme listener [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:85] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:86] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:88] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:89]。
2. `applyFromSettings()` 读 `currentThemeSetting ?? getThemeSetting()`, 对 slash 配对或名为 `system` 打开 auto-sync, `applyThemeName`, 再 `queryTerminalColors()` [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:103] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:106] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:108]。
3. `resolveThemeName()` 调 `resolveThemeSetting(..., getTerminalTheme())`, 结果为 `undefined` 时落到 `SYSTEM_THEME_NAME`。无 persisted theme 时默认就是 `system`, 不会再把 high-confidence dark/light 写回 settings [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:174] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:175]。
4. `requestTerminalColors(ui, apply)` 调 `ui.queryTerminalColors({ timeoutMs: 100, onLateReply: apply })`; 查询失败当空对象。Promise 第一次 settle 时 `apply`, timeout 后 late reply 仍走同一 `apply` [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:25] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:34] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:39]。
5. `applyTerminalColors` 合并 foreground/background/palette, 颜色未变则跳过重绘; 否则 `setTerminalColors` 并 `reapplyForTerminal()`(system 或 pair 分支变化时重新 `applyThemeName`) [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:197] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:207] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:220]。
6. `setThemeName` 对 `system` 打开 auto-sync; 成功才把 `currentThemeSetting` 设为该名。`setThemeInstance` 关 auto-sync, `activeThemeName` 为 `"<in-memory>"` [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:124] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:138] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:141]。
7. `applyThemeName` 调 `setTheme(themeName, true)`; 失败时 `activeThemeName` 为 `SYSTEM_THEME_NAME` 并 `showError` 说明 fallback 到 system theme [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:178] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:180] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:183]。
8. `preview` 只临时 `setTheme`, invalidate + requestRender, 不改 `activeThemeName` 或 settings [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:146] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:149]。

测试覆盖: 无 persist 的 initial theme; 启动灰度直到 query 返回; timeout 后 late reply 仍应用 RGB [E: packages/coding-agent/test/theme-controller.test.ts:61] [E: packages/coding-agent/test/theme-controller.test.ts:90] [E: packages/coding-agent/test/theme-controller.test.ts:98]。

## 自动检测与 Auto Sync

`detectColorFgBgTheme` 从 `COLORFGBG` 最后一个 0-15 段分类: 0-6 与 8 为 dark, 7 与 9-15 为 light [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:689] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:694]。

`setAutoSync(true)` 调 `ui.setTerminalColorSchemeNotifications(true)`。scheme 变化时 `applyTerminalColorSchemeChange` 在 auto-sync 下 `setTerminalColorScheme`, appearance 变了就 `reapplyForTerminal`, 并再 query 颜色(背景报告优先于 scheme 字面值) [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:225] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:241] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:246]。

## Per-run `--use-theme`

CLI `--use-theme <name[/name]>` 进入 `Args.useTheme`, 作为 `initialThemeSetting` 传给 controller 的 `currentThemeSetting` [E: packages/coding-agent/src/cli/args.ts:45] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:85]。测试要求 initial `"light"` 不会 `setTheme()` / `flush()` [E: packages/coding-agent/test/theme-controller.test.ts:73]。`getThemeSelection()` 返回 `currentThemeSetting ?? settings.theme ?? activeThemeName` [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:120]。`rebindTui()` 重绑 listener 并恢复 notification 开关 [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:93]。

## Theme Loading 与 Hot Reload

内置面是 **generated `system` + JSON `dark`/`light`**, 不是只有两个 JSON [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:480] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:451]。`loadTheme` 对 `SYSTEM_THEME_NAME` 走 `createSystemTheme`, 该名保留、压过同名 custom [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:633]。`loadThemeJson` 再查 built-in JSON、`registeredThemes.sourcePath`、custom `${name}.json` [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:551]。

`initTheme` / `setTheme` 失败都静默/返回 error 后 fallback 到 `SYSTEM_THEME_NAME` [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:757] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:766] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:785]。`startThemeWatcher` 跳过 `dark`、`light` 和 `SYSTEM_THEME_NAME` [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:812]。

## 设计动机与权衡

Slash 留给 automatic light/dark, 所以 `assertThemeNameIsValid` 禁止 `/` [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:525]。默认 `system` 适配任意终端, 避免把低置信 dark/light 写进用户配置 [I]。`setThemeInstance` 停 watcher, 因为 in-memory theme 没有文件 [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:795]。global theme 用 `Symbol.for("@earendil-works/pi-coding-agent:theme")` 并保留旧 package key [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:722]。

## Gotcha

- `preview()` 会改 global `theme` 但不改 `activeThemeName` [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:146]。
- timeout 后 late reply 仍 `apply`; 查询失败走 `{}` 而不是抛错 [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:34] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:39]。
- `waitForTerminalColors()` 只等当前 query settle; header 等会 bake 颜色的内容应在此之后构建 [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:116]。

## 跨包边界

[subsys.coding-agent.interactive-orchestration](interactive-orchestration.md): 构造 controller、`applyFromSettings()`、`waitForTerminalColors()` 与 settings UI 回调由 interactive host 拥有 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:627] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:958]。

[subsys.tui.terminal-colors](../tui/terminal-colors.md): pi-tui 解析 OSC 10/11/4 与 CSI scheme, 并实现 `queryTerminalColors({ timeoutMs, onLateReply })`; coding-agent 只消费 `TerminalColors` [E: packages/tui/src/tui.ts:478]。

## Sources

- packages/coding-agent/src/modes/interactive/theme/theme-controller.ts
- packages/coding-agent/src/modes/interactive/theme/theme.ts
- packages/coding-agent/src/modes/interactive/theme/theme-json.ts
- packages/coding-agent/src/modes/interactive/theme/system-theme.ts
- packages/tui/src/oklab.ts
- packages/tui/src/colors.ts
- packages/coding-agent/test/theme-controller.test.ts
- packages/coding-agent/docs/themes.md

## 相关

- [subsys.coding-agent.interactive-orchestration](interactive-orchestration.md): interactive mode 的 lifecycle、settings UI callback 和 component orchestration。
- [subsys.tui.terminal-colors](../tui/terminal-colors.md): OSC 颜色查询与 color-scheme report 的 TUI 层解析。
