# Batch AA uncertainties

- `ref.ai.image-models`: `openrouter/auto` still uses `-1000000` for both image-model `cost.input` and `cost.output`; the catalog records the source values but does not infer product semantics for negative cost.
- `ref.coding-agent.extension-events`: `index.json` still lists `group.extension-events.instance_count` as 29, while current `ExtensionEvent` / `ExtensionAPI.on(...)` source exposes 31 event names including `session_info_changed`.
- `ref.coding-agent.env-vars`: this catalog remains scoped to coding-agent plus directly consumed `pi-ai` provider env channels; `packages/orchestrator` `PI_ORCHESTRATOR_*` / Radius env and TUI-only debug env are intentionally outside this node's authority.
- `ref.coding-agent.config-keys`: `index.json` still lists `group.config-keys.instance_count` as 50, while current `Settings` + nested leaves + `PackageSource` object keys produce 72 catalog rows after adding `outputPad`.
- `ref.coding-agent.config-keys`: `terminal.showTerminalProgress` is present in `SettingsManager` but still absent from `packages/coding-agent/docs/settings.md`.
- `ref.interactive.components`: the catalog counts directory files, so whether `components/index.ts` should count as an instance or only barrel metadata remains a catalog-definition question.
- `ref.interactive.components`: `ConfigSelectorComponent`, `CountdownTimer`, `EarendilAnnouncementComponent`, and `session-selector-search.ts` have real callers but are not exported by `components/index.ts`; this looks internal-only but needs maintainer/API-policy confirmation.
- `ref.interactive.components`: `ShowImagesSelectorComponent`, `ThemeSelectorComponent`, and `ThinkingSelectorComponent` remain public exports, but current main interactive mode does not directly import them; they may be compatibility surface or residual UI.
