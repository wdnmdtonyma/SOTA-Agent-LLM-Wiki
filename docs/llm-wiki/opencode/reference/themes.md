---
id: ref.themes
title: TUI Themes
kind: reference
tier: T3
v: na
source:
  - packages/tui/src/theme/assets/
  - packages/tui/src/theme/index.ts
symbols:
  - DEFAULT_THEMES
  - listThemes
  - resolveTheme
  - generateSystem
related:
  - tui.theming
evidence: explicit
status: verified
updated: 92c70c9c3
---

> TUI theme catalog 由 `DEFAULT_THEMES`、插件 theme、用户 custom theme 和可选 `system` theme 合成；当前 HEAD 的 `DEFAULT_THEMES` 表包含 33 个 theme key [I]。

## 能回答的问题

- TUI 当前内建哪些 theme？
- `system` theme 为什么不在 `DEFAULT_THEMES` 内？
- theme resolution 如何处理 `$defs`、fallback 和 terminal ANSI 颜色？

## 设计和装配

`Theme` 类型包含 `primary`、`secondary`、`accent`、`error`、`warning`、`success`、`info`、文本色、背景色、边框色、diff 颜色、markdown 样式、syntax token 样式和 `thinkingOpacity` 等字段 [E: packages/tui/src/theme/index.ts:36] [E: packages/tui/src/theme/index.ts:89]。`ThemeJson` 的顶层 shape 是可选 `$schema`、可选 `defs` 和必需 `theme` object；`selectedListItemText`、`backgroundMenu`、`thinkingOpacity` 是 `theme` 内的可选字段 [E: packages/tui/src/theme/index.ts:121] [E: packages/tui/src/theme/index.ts:122] [E: packages/tui/src/theme/index.ts:123] [E: packages/tui/src/theme/index.ts:124] [E: packages/tui/src/theme/index.ts:125] [E: packages/tui/src/theme/index.ts:126]。

`listThemes()` 的合并顺序是内建 `DEFAULT_THEMES`、`pluginThemes`、`customThemes`，之后只有在 `systemTheme` 存在时才追加 `system` 键 [E: packages/tui/src/theme/index.ts:173] [E: packages/tui/src/theme/index.ts:181]。因此 `system` 是运行时 theme，不是内建 JSON asset [I]。`setCustomThemes()` 整体替换 custom theme map，`addTheme()` 在不存在同名 theme 时写入 `pluginThemes`，`upsertTheme()` 会更新已存在的 custom theme，否则写入 `pluginThemes` [E: packages/tui/src/theme/index.ts:205] [E: packages/tui/src/theme/index.ts:237]。

`resolveTheme()` 使用 `theme.defs ?? {}` 作为引用表，并在字符串颜色不是 hex 时从 `defs` 或 `theme.theme` 查找下一层颜色 [E: packages/tui/src/theme/index.ts:241] [E: packages/tui/src/theme/index.ts:258]。循环引用和缺失引用会抛错 [E: packages/tui/src/theme/index.ts:250] [E: packages/tui/src/theme/index.ts:256]。resolver 会把缺省 `selectedListItemText` 设为 `resolved.background`，把缺省 `backgroundMenu` 设为 `resolved.backgroundElement`，并把缺省 `thinkingOpacity` 设为 `0.6` [E: packages/tui/src/theme/index.ts:275] [E: packages/tui/src/theme/index.ts:292]。`generateSystem()` 从 terminal colors 生成 `ThemeJson`，使 `system` 能跟随当前 terminal 配色 [E: packages/tui/src/theme/index.ts:360] [E: packages/tui/src/theme/index.ts:369]。

## Theme Catalog

| Theme key | Source |
| --- | --- |
| `aura` | [E: packages/tui/src/theme/index.ts:131] |
| `ayu` | [E: packages/tui/src/theme/index.ts:132] |
| `catppuccin` | [E: packages/tui/src/theme/index.ts:133] |
| `catppuccin-frappe` | [E: packages/tui/src/theme/index.ts:134] |
| `catppuccin-macchiato` | [E: packages/tui/src/theme/index.ts:135] |
| `cobalt2` | [E: packages/tui/src/theme/index.ts:136] |
| `cursor` | [E: packages/tui/src/theme/index.ts:137] |
| `dracula` | [E: packages/tui/src/theme/index.ts:138] |
| `everforest` | [E: packages/tui/src/theme/index.ts:139] |
| `flexoki` | [E: packages/tui/src/theme/index.ts:140] |
| `github` | [E: packages/tui/src/theme/index.ts:141] |
| `gruvbox` | [E: packages/tui/src/theme/index.ts:142] |
| `kanagawa` | [E: packages/tui/src/theme/index.ts:143] |
| `material` | [E: packages/tui/src/theme/index.ts:144] |
| `matrix` | [E: packages/tui/src/theme/index.ts:145] |
| `mercury` | [E: packages/tui/src/theme/index.ts:146] |
| `monokai` | [E: packages/tui/src/theme/index.ts:147] |
| `nightowl` | [E: packages/tui/src/theme/index.ts:148] |
| `nord` | [E: packages/tui/src/theme/index.ts:149] |
| `one-dark` | [E: packages/tui/src/theme/index.ts:150] |
| `osaka-jade` | [E: packages/tui/src/theme/index.ts:151] |
| `opencode` | [E: packages/tui/src/theme/index.ts:152] |
| `orng` | [E: packages/tui/src/theme/index.ts:153] |
| `lucent-orng` | [E: packages/tui/src/theme/index.ts:154] |
| `palenight` | [E: packages/tui/src/theme/index.ts:155] |
| `rosepine` | [E: packages/tui/src/theme/index.ts:156] |
| `solarized` | [E: packages/tui/src/theme/index.ts:157] |
| `synthwave84` | [E: packages/tui/src/theme/index.ts:158] |
| `tokyonight` | [E: packages/tui/src/theme/index.ts:159] |
| `vesper` | [E: packages/tui/src/theme/index.ts:160] |
| `vercel` | [E: packages/tui/src/theme/index.ts:161] |
| `zenburn` | [E: packages/tui/src/theme/index.ts:162] |
| `carbonfox` | [E: packages/tui/src/theme/index.ts:163] |

## Runtime System Theme

| Theme key | Source |
| --- | --- |
| `system` | Added only when `systemTheme` is set by `setSystemTheme()` [E: packages/tui/src/theme/index.ts:181] [E: packages/tui/src/theme/index.ts:210] |

## Sources

- `packages/tui/src/theme/index.ts`
- `packages/tui/src/theme/assets/`

## 相关

- `tui.theming`
