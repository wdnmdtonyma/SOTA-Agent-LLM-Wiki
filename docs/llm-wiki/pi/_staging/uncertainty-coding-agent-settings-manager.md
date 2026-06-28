# uncertainty: coding-agent settings-manager

- `subsys.coding-agent.settings-manager` 的 index symbols 包含 `loadSettings`, 但 `packages/coding-agent/src/core/settings-manager.ts` 当前没有 `loadSettings` 函数或 export; 实际读取 helper 是 private static `loadFromStorage()` 与 `tryLoadFromStorage()`。
- `subsys.coding-agent.settings-manager` 的 index symbols 包含 `deepMergeSettings`; 源码确有 `function deepMergeSettings(...)`, 但它不是 exported symbol。如果 wiki 的 `symbols` 语义必须是导出符号, 这里需要后续 reconcile index 或源码。
- 本节点只按 source 列表读取 `packages/coding-agent/src/core/settings-manager.ts`; `CONFIG_DIR_NAME` 的字面值、config resolution 细节、settings 用户文档默认值需要在对应 related/catalog 节点中核对。
