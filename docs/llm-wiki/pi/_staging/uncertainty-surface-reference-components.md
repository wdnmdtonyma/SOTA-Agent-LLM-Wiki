# Uncertainty · surface/reference/components

Source node: `ref.interactive.components` (`docs/llm-wiki/pi/reference/components.md`)

## [U] directory instance count vs public barrel

`index.json` 的 group ground truth 是 `packages/coding-agent/src/modes/interactive/components/`, instance_count 是 38;该目录正好有 38 个 `.ts` 文件, 但其中 `index.ts` 是 barrel, 不是 runtime component class。当前节点按“目录文件”计入 `index.ts`;如果后续把 instance 定义改成“public component/helper symbol”, 需要重算。

Evidence: `packages/coding-agent/src/modes/interactive/components/index.ts:2`, `packages/coding-agent/src/modes/interactive/components/index.ts:38`

## [U] internal-only files not exported by components/index.ts

`ConfigSelectorComponent`, `CountdownTimer`, `EarendilAnnouncementComponent`, and `session-selector-search.ts` have real internal call sites, but they are not exported by `components/index.ts`. This may be intentional internal-only API, but the public/private boundary is not explicitly documented in source.

Evidence: `packages/coding-agent/src/cli/config-selector.ts:8`, `packages/coding-agent/src/modes/interactive/components/extension-selector.ts:8`, `packages/coding-agent/src/modes/interactive/interactive-mode.ts:111`, `packages/coding-agent/src/modes/interactive/components/session-selector.ts:22`

## [U] public exports without current interactive-mode call sites

`ShowImagesSelectorComponent`, `ThemeSelectorComponent`, and `ThinkingSelectorComponent` are exported through the public component barrel/package root, but the current `interactive-mode.ts` does not directly import them. They may exist for extension compatibility or be older UI paths now subsumed by `SettingsSelectorComponent`.

Evidence: `packages/coding-agent/src/modes/interactive/components/index.ts:29`, `packages/coding-agent/src/modes/interactive/components/index.ts:31`, `packages/coding-agent/src/modes/interactive/components/index.ts:32`, `packages/coding-agent/src/index.ts:353`, `packages/coding-agent/src/index.ts:355`, `packages/coding-agent/src/index.ts:356`
