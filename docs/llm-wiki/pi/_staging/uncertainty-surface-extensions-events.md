# uncertainty-surface-extensions-events

- [U] `index.json` 的 `surface.extensions.events.source` 只有 `packages/coding-agent/src/core/extensions/types.ts` 和 `packages/coding-agent/src/core/extensions/runner.ts`,但本批任务指定扩展事件 ground truth 还要核 `packages/coding-agent/docs/extensions.md`;本节点 frontmatter/Sources 已加入 docs 文件,后续如要求 index/file 完全同源需要协调 index。
- [U] `index.json` 为 `surface.extensions.events.symbols` 列了 `emitSessionStart`,但当前 `packages/coding-agent/src/core/extensions/runner.ts` 未看到同名专用 emitter;`session_start` 由通用 `ExtensionRunner.emit()` 处理。后续应把 symbol 改成 `ExtensionAPI.on`、`emitToolResult`、`emitInput` 或明确 `emitSessionStart` 是文档简称。
- [U] `index.json` 的 `group.extension-events.instance_count` 写作 29,但当前 `ExtensionAPI.on` overload 可数到 30 个事件名。需要在 T3 `ref.coding-agent.extension-events` 填充时确认是否某个 overload 不计入 catalog,或更新 group 计数。
