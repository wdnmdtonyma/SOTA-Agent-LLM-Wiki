# Uncertainty batch ah

- `subsystems/coding-agent/settings-manager.md`: `CONFIG_DIR_NAME` 的字面值来自 `packages/coding-agent/src/config.ts`, 本节点只把 `settings-manager.ts` 作为证据范围, 因此不在该断言里展开 `.pi` 字面值。
- `subsystems/coding-agent/settings-manager.md`: index.json 为本节点列出 `loadSettings`, 但当前 `packages/coding-agent/src/core/settings-manager.ts` 没有 `loadSettings` 函数或 export; 实际读取路径是 private static `loadFromStorage()` 与 `tryLoadFromStorage()`。
- `subsystems/coding-agent/settings-manager.md`: index.json 为本节点列出 `deepMergeSettings`, 当前源码确有 `function deepMergeSettings(...)`, 但它不是 `export function`; 如果 symbols 语义要求 exported symbol, 这里与源码不一致。
