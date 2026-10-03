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
 - packages/coding-agent/test/theme-controller.test.ts
 - packages/coding-agent/docs/themes.md
 - packages/tui/src/tui.ts
 - packages/coding-agent/src/modes/interactive/interactive-mode.ts
symbols:
 - InteractiveThemeController
 - SYSTEM_THEME_NAME
 - generateSystemThemeColors
 - detectTerminalTheme
 - requestTerminalColors
 - waitForTerminalColors
related:
 - subsys.coding-agent.interactive-orchestration
 - subsys.tui.terminal-colors
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.coding-agent.theme-controller` 描述 pi-coding-agent 的 interactive theme layer: 默认 `system` 主题从终端报告的前景/背景/16 色 ANSI palette 生成,查询完成前灰度渲染,`settings.theme` 的 `light/dark` pair 与 `system` 都会跟随终端外观变化。

## 能回答的问题

- 没有 `theme` setting 时,pi 为什么用 `system` 而不是 `dark` / `light`?
- `system` 主题怎样从终端颜色生成,查询超时或晚到时发生什么?
- `"lightTheme/darkTheme"` 这种 automatic pair 怎样解析,何时启用 color-scheme notifications?
- `--use-theme` / `initialThemeSetting` 如何做 per-run theme,且不写入 settings?
- theme JSON 支持哪些 token、变量和 color value 格式?`system` 为什么不能当自定义名?
- custom theme 什么时候 hot reload,invalid theme 失败后 fallback 到哪?
- `pi-coding-agent` 和 `pi-tui` 在 terminal color detection 上怎样分工?

## 职责边界

`InteractiveThemeController` 是 interactive mode 的 product-level coordinator: 它持有 `ui`、`getSettingsManager` getter、错误展示 callback、change callback、per-run `currentThemeSetting`、已报告的 `terminalColors`、当前 `activeThemeName` 和 auto-sync 开关。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:58] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:63] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:66] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:67] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:68]

`theme.ts` 是 theme engine: validator 安装点、变量解析、`dark`/`light` 文件加载、`system` 生成、terminal appearance 判定、global `theme` proxy、watcher 和 HTML export helper。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:53] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:611] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:702] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:727] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:808] `system-theme.ts` 只负责 `SYSTEM_THEME_NAME` 与 `generateSystemThemeColors()`。[E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:35] [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:465] `ThemeJsonSchema` 在 `theme-json.ts`。[E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:18]

本节点不逐项枚举全部 color token 的设计含义; `packages/coding-agent/docs/themes.md` 按界面角色分组。旧的 OSC 11-only `detectTerminalBackgroundTheme` / `detectTerminalThemeForAuto` 已删除,现行探测是 `TUI.queryTerminalColors()` + `detectTerminalTheme()`。[E: packages/tui/src/tui.ts:478] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:702]

## 关键文件

- `packages/coding-agent/src/modes/interactive/theme/theme-controller.ts`: `InteractiveThemeController` 与 `requestTerminalColors()`。
- `packages/coding-agent/src/modes/interactive/theme/theme.ts`: loading、`system` 生成入口、appearance、global singleton、watcher。
- `packages/coding-agent/src/modes/interactive/theme/system-theme.ts`: 从终端 palette 生成 `system` 颜色。
- `packages/coding-agent/src/modes/interactive/theme/theme-json.ts`: `ThemeJsonSchema` 与 `validateThemeJson`。
- `packages/coding-agent/test/theme-controller.test.ts`: grayscale pending、late reply、pair 跟随实际背景、per-run 不 persist。

## 数据模型

`SYSTEM_THEME_NAME` 是 `"system"`。[E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:35] `TerminalTheme` 是 `"dark" | "light"`。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:650]

`ThemeJsonSchema` 要求 `name` 和 `colors`;可选 `$schema`、`appearance`(`"dark"`/`"light"`)、`vars`、`export`。[E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:18] [E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:20] [E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:22] [E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:23] [E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:90] 颜色值是 string(hex / `oklch()` / `okhsl()` / 变量名 / `""` 表示终端默认)或 0–255 integer。[E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:13] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:140] 五个 optional token 有 fallback:`scrollbarTrack`←`muted`,`scrollbarThumb`←`text`,`thinkingMax`←`thinkingXhigh`,`searchMatchBg`←`selectedBg`,`searchMatchText`←`text`。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:173]

`parseAutoThemeSetting(themeSetting)` 把恰好一个 slash 分隔且两侧非空的 string 解析为 `{ lightTheme, darkTheme }`;没有 slash、多于一个 slash 或任一侧 trim 后为空都返回 `undefined`。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:652] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:657] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:663]

`Theme` 把 foreground / background token 编成 ANSI map;`value === ""` 记入 default-token 列表并先写 `\x1b[39m` / `\x1b[49m`;未知 token 在 `tokenAnsi()` 抛 `"Unknown theme color"`。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:291] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:372] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:374]

## 控制流

1. constructor 保存 `initialThemeSetting`,用 `resolveThemeName()` 得到初始名(无 setting 则 `SYSTEM_THEME_NAME`),`markTerminalColorsPending()` 后 `initTheme(activeThemeName, true)`,再绑 `ui.onTerminalColorSchemeChange`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:85] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:86] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:88] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:89] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:90]
2. `applyFromSettings()` 读 `currentThemeSetting ?? settings.theme`,解析 theme name,对 automatic pair **或** `system` 打开 auto-sync,立刻 `applyThemeName()`,再 `queryTerminalColors()`;颜色到达后才更新,不阻塞这次 apply。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:104] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:106] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:107] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:108]
3. `resolveThemeName()` 是 `resolveThemeSetting(setting, getTerminalTheme()) ?? SYSTEM_THEME_NAME`。没有 setting、无法解析的 slash 字符串都落到 `system`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:174] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:669] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:677]
4. `setThemeName(themeName)` 仅当名为 `system` 时开 auto-sync;成功才把 `currentThemeSetting` 设为该 name。`setThemeSetting()` 只改 `currentThemeSetting` 再 `applyFromSettings()`,不写 settings 文件。`setThemeInstance()` 关 auto-sync,并把 `activeThemeName` 标为 `"<in-memory>"`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:124] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:128] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:134] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:139] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:141] [E: packages/coding-agent/test/theme-controller.test.ts:61]
5. `preview(themeSettingOrName)` 临时 `setTheme(themeName, true)`,成功则 invalidate + requestRender,不改 `activeThemeName` 或 settings。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:146] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:149]
6. `applyThemeName()` 调 `setTheme(themeName, true)`;失败时 `activeThemeName` 设为 `SYSTEM_THEME_NAME`,若 `showError` 则提示 fallback 到 system theme。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:178] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:180] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:183]

## System 主题

`loadTheme("system")` 在查 custom/registered 之前短路到 `createSystemTheme()`:名字保留,同名自定义文件不会覆盖。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:633] `getAvailableThemesWithPaths()` 把 `system` 放在列表第一位,且 `path` 为 `undefined`。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:480] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:495]

`createSystemTheme()` 把模块级 `terminalColors` 交给 `generateSystemThemeColors()`;查询仍在进行时 `saturation` 为 0(灰度),完成后为 1;`appearanceHint` 来自 `getTerminalTheme()`。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:611] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:614] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:615] 生成分三档:有背景+16 色 palette 则 hue/saturation 来自 palette;只有背景则用 family 自己的 hue;没有背景则 `indexedColors()` 写 ANSI 索引与终端默认色。[E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:465] [E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:468] body text 目标 WCAG 对比至少 4.5:1。[E: packages/coding-agent/src/modes/interactive/theme/system-theme.ts:350]

`initTheme` / `setTheme` 在 load 失败时 **静默/返回 error 后 fallback 到 `system`**,不再 fallback 到 `dark`。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:766] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:785]

## 终端颜色查询与 Auto Sync

`requestTerminalColors(ui, apply)` 调 `ui.queryTerminalColors({ timeoutMs: 100, onLateReply: apply })`。查询抛错当成空结果;超时后的 late reply 仍会 `apply`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:25] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:31] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:34] [E: packages/tui/src/tui.ts:478] `applyFromSettings()` 不 await 这次查询;header 等把颜色烤进字符串的内容应 `await waitForTerminalColors()`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:108] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:116]

`applyTerminalColors()` 用新报告值覆盖,缺字段保留上次;`sameTerminalColors` 为真则不 re-render(超时空结果不会抹掉已知颜色)。然后 `setTerminalColors(next)`、`reapplyForTerminal()`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:197] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:205] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:207] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:200] 测试覆盖:pending 时 `error` 是 `\x1b[39m`;超时先落到 `\x1b[38;5;1m` 索引;late reply 变成 rgb。[E: packages/coding-agent/test/theme-controller.test.ts:90] [E: packages/coding-agent/test/theme-controller.test.ts:108] [E: packages/coding-agent/test/theme-controller.test.ts:111]

`detectTerminalTheme()`:有报告背景则 `terminalAppearance(background, foreground)`;否则用 mode-2031 的 light/dark report,再 `COLORFGBG`,最后 `"dark"`。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:702] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:708] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:709] `COLORFGBG` 取最后一个 0–15 段:0–6 与 8 为 dark,7 与 9–15 为 light。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:689] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:694]

`setAutoSync(true)` 调 `ui.setTerminalColorSchemeNotifications(true)`。scheme 事件里 `applyTerminalColorSchemeChange()` 先 `setTerminalColorScheme()`,若 `getTerminalTheme()` 变了再 `reapplyForTerminal()`,然后重新 query 颜色。pair 的最终选择跟 **实际背景**,不是报告的 scheme:测试里 report 说 light、颜色是 dark 时落到 `dark`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:225] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:241] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:245] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:246] [E: packages/coding-agent/test/theme-controller.test.ts:125] `reapplyForTerminal()` 跳过 `"<in-memory>"`;对 `system` 即使名字没变也会重新 `applyThemeName` 以重生 palette。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:218] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:220]

没有显式 setting 时 **不再** 把检测到的 `dark`/`light` 写回 settings;默认就是 generated `system`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:174] [E: packages/coding-agent/test/theme-controller.test.ts:90]

## Per-run `--use-theme`

CLI `--use-theme <name[/name]>` 进入 `Args.useTheme`;interactive 把它当作 `initialThemeSetting`。`applyFromSettings()` 优先 `currentThemeSetting`,覆盖 persisted `settings.theme`,且不调用 `setTheme()` / `flush()`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:85] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:104] [E: packages/coding-agent/test/theme-controller.test.ts:61] [E: packages/coding-agent/test/theme-controller.test.ts:74] `getThemeSelection()` 返回 `currentThemeSetting ?? settings.theme ?? activeThemeName`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:120] `rebindTui()` 在 runtime 换 renderer 后重绑 listener 并恢复 notification 开关。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:93]

## Theme Loading 与 Hot Reload

文件型 built-in 只有 `dark.json` 与 `light.json`;`system` 是生成物。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:450] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:480] `loadThemeJson(name)` 先 built-in,再 registered `sourcePath`,再 custom dir 的 `${name}.json`;找不到抛 `"Theme not found"`。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:551] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:567]

`parseThemeJson()` 有 validator 时走 `validateThemeJson`;缺 required colors 会聚合 missing list,通过后再 `assertThemeNameIsValid()` 禁止 `/`。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:533] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:525] [E: packages/coding-agent/src/modes/interactive/theme/theme-json.ts:105]

`startThemeWatcher()` 跳过 `dark` / `light` / `system`;只 watch `<agent-dir>/themes/<name>.json`,debounce 100ms。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:812] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:824] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:860]

## 设计动机与权衡

Slash 留给 automatic pair,所以 theme name 不能含 `/`;`system` 另外在 `loadTheme()` 保留,避免自定义文件抢走默认生成主题。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:525] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:633] [I]

查询 100ms 超时是为了启动 header 不必空等;DA1 通常紧跟颜色回复。超时先用索引/灰度,late reply 仍应用,适配慢 SSH。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:25] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:34] [I]

`setThemeInstance()` 立刻 `stopThemeWatcher()`,因为 in-memory theme 没有可 watch 的文件。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:795] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:798]

Theme module 用 `Symbol.for("@earendil-works/pi-coding-agent:theme")` 存 global theme,并保留旧 `@mariozechner` key,让 node + jiti 看到同一实例。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:722] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:723] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:736]

## Gotcha

- `preview()` 会改 global `theme` 并 request render,但不改 `activeThemeName`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:149] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:150]
- `applyFromSettings()` 不再把 high-confidence 检测结果 persist 成 `dark`/`light`;无 setting 就是 `system`。[E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:174]
- `getAvailableThemesWithPaths()` 按 `system`、built-in、custom dir、registered 去重;同名先出现的来源获胜。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:471] [E: packages/coding-agent/src/modes/interactive/theme/theme.ts:480]
- `InteractiveMode.init()` 在 `ui.start()` 之后 `applyFromSettings()` 并 `await waitForTerminalColors()`,再画 header,避免把灰度 ANSI 烤进启动文案。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:991] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:994]

## 跨包边界

[subsys.coding-agent.interactive-orchestration](interactive-orchestration.md): orchestration 决定何时构造 controller、何时 `applyFromSettings()` / `waitForTerminalColors()`,以及 settings UI 如何改 theme;本节点只覆盖 controller 与 theme engine。[I]

[subsys.tui.terminal-colors](../tui/terminal-colors.md): pi-tui 解析 OSC 颜色与 color-scheme report;theme controller 只依赖 `queryTerminalColors`、`onTerminalColorSchemeChange`、`setTerminalColorSchemeNotifications`。[E: packages/tui/src/tui.ts:476] [E: packages/tui/src/tui.ts:477] [E: packages/tui/src/tui.ts:478]

HTML export 经 `getResolvedThemeColors()` / `getThemeExportColors()` 复用同一套解析,`/export` 渲染细节在 `subsys.coding-agent.html-export`。[E: packages/coding-agent/src/modes/interactive/theme/theme.ts:903] [I]

## Sources

- packages/coding-agent/src/modes/interactive/theme/theme-controller.ts
- packages/coding-agent/src/modes/interactive/theme/theme.ts
- packages/coding-agent/src/modes/interactive/theme/theme-json.ts
- packages/coding-agent/src/modes/interactive/theme/system-theme.ts
- packages/coding-agent/test/theme-controller.test.ts
- packages/coding-agent/docs/themes.md
- packages/tui/src/tui.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts

## 相关

- [subsys.coding-agent.interactive-orchestration](interactive-orchestration.md): interactive mode 的 lifecycle、`waitForTerminalColors()` 与 settings UI。
- [subsys.tui.terminal-colors](../tui/terminal-colors.md): OSC 颜色查询与 terminal color-scheme report 的 TUI 层解析。
