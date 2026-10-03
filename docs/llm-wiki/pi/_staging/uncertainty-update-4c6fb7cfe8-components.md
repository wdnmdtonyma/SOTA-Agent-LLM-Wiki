# Uncertainty · ref.interactive.components (4c6fb7cfe8)

Source node: `ref.interactive.components` (`docs/llm-wiki/pi/reference/components.md`)

## [U] directory instance count vs public barrel

`index.json` group ground truth is `packages/coding-agent/src/modes/interactive/components/`. This freeze has **48** `.ts` files (daxnuts.ts deleted; added auth-url, easter-egg-3d, easter-egg-3d.lazy, pi-logo, radius-login-selector, themed-text). `index.ts` is a barrel, not a runtime component class; the node still counts it as a directory instance.

Evidence: `packages/coding-agent/src/modes/interactive/components/index.ts:2`, `packages/coding-agent/src/modes/interactive/components/index.ts:37`

## [U] internal-only files not exported by components/index.ts

These files have real call sites but are not in `components/index.ts`: `ConfigSelectorComponent`, `CountdownTimer`, `EarendilAnnouncementComponent`, `AuthUrlComponent`, `easter-egg-3d*.ts`, `pi-logo.ts`, `radius-login-selector.ts`, `themed-text.ts`, `session-selector-search.ts`, `settings-submenu.ts`, `markdown-transform.ts`, `mermaid.ts`, `custom-entry.ts`, `status-indicator.ts`. This looks like an internal-only boundary, but the public/private split is not documented in source.

Evidence: `packages/coding-agent/src/modes/interactive/components/index.ts:2`, `packages/coding-agent/src/cli/config-selector.ts:7`, `packages/coding-agent/src/modes/interactive/interactive-mode.ts:147`

## [U] public exports without current InteractiveMode call sites

`ShowImagesSelectorComponent` and `ThemeSelectorComponent` are still exported from the package root, but `interactive-mode.ts` does not import them. They may be extension compatibility surface or leftover UI. `ThinkingSelectorComponent` is used by `/thinking` and is not in this set.

Evidence: `packages/coding-agent/src/modes/interactive/components/index.ts:28`, `packages/coding-agent/src/modes/interactive/components/index.ts:30`, `packages/coding-agent/src/index.ts:460`, `packages/coding-agent/src/index.ts:462`
