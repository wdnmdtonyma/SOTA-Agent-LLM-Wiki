# uncertainty: surface config settings

- `surface.config.settings` 的 index symbols 包含 `loadSettings`,但 `packages/coding-agent/src/core/settings-manager.ts` 当前没有 `loadSettings` 函数或 export;实际读取 helper 是 private static `loadFromStorage()` 与 `tryLoadFromStorage()`。
- `surface.config.settings` 的 index symbols 包含 `deepMergeSettings`;源码确有 `function deepMergeSettings(...)`,但它不是 exported symbol。如果 `symbols` 语义必须是导出符号,这里需要后续 reconcile index 或源码。
- `FileSettingsStorage` 的 project path 使用 `CONFIG_DIR_NAME`,本节点 source 列表没有 `packages/coding-agent/src/config.ts`;`.pi/settings.json` 的用户可见路径由 `packages/coding-agent/docs/settings.md` 佐证。
- `packages/coding-agent/src/core/defaults.ts` 在本 source set 中只导出 `DEFAULT_THINKING_LEVEL = "medium"`,而 `SettingsManager.getDefaultThinkingLevel()` 不使用该常量;默认 thinking level 的最终消费点需要在调用方节点核对。
