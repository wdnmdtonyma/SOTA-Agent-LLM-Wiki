# Uncertainty Batch AW

- `tui.theming`: OpenTUI palette detection 的内部算法不在 opencode 源码内；当前只能核到 TUI 调用 `renderer.getPalette()`、监听 `THEME_MODE`/terminal color-scheme notification 并合成 `ThemeJson` 的行为。[U]
