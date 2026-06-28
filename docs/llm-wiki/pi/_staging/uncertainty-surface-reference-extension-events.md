# uncertainty-surface-reference-extension-events

- [U] `index.json` 的 `group.extension-events.instance_count` 是 29,但当前 `packages/coding-agent/src/core/extensions/types.ts` 中 `ExtensionAPI.on(...)` overload 与 `ExtensionEvent` union 对齐后可数到 30 个事件名: `project_trust`, `resources_discover`, 8 个 session events, 9 个 agent/message/context events, 4 个 provider/model events, 5 个 tool events, `user_bash`, `input`。本节点按源码写 30 个;后续应单独更新 index group 计数或明确 catalog 计数口径。
