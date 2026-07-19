# uncertainty: surface config settings

- `surface.config.settings` 的 frontmatter/index symbols 已收敛到 `SettingsManager`、`Settings` 与 `PackageSource` 三个当前导出；旧 `loadSettings` 与非导出 `deepMergeSettings` metadata 漂移已解决。
- `FileSettingsStorage` 的 project path 使用 `CONFIG_DIR_NAME`,本节点 source 列表没有 `packages/coding-agent/src/config.ts`;`.pi/settings.json` 的用户可见路径由 `packages/coding-agent/docs/settings.md` 佐证。
- `packages/coding-agent/src/core/defaults.ts` 在本 source set 中只导出 `DEFAULT_THINKING_LEVEL = "medium"`,而 `SettingsManager.getDefaultThinkingLevel()` 不使用该常量;默认 thinking level 的最终消费点需要在调用方节点核对。
