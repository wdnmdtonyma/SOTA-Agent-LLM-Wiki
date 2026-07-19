# Uncertainty batch ah

- `subsystems/coding-agent/settings-manager.md`: `CONFIG_DIR_NAME` 的字面值来自 `packages/coding-agent/src/config.ts`, 本节点只把 `settings-manager.ts` 作为证据范围, 因此不在该断言里展开 `.pi` 字面值。
- `subsystems/coding-agent/settings-manager.md`: 节点与 index symbols 已收敛到当前 exported storage/manager API；private `loadFromStorage()` 与非导出的 `deepMergeSettings()` 仅作为正文实现细节，不再冒充 authoritative symbols。
