# uncertainty-coding-agent-event-bus

- [I] event-bus 被描述为 inter-extension communication / side channel: `ExtensionAPI.events` 类型注释和 loader 注入路径可证, 但 core event-bus 文件本身没有写产品命名。
- [I] event-bus 被描述为不适合同步 ack、ordered mutation 或 block/transform/cancel 工作流: API 返回 `void` 且没有 result aggregation, 但这是从接口形状和 ExtensionRunner 对比推导出的设计边界。
- [I] publisher 不能等待所有 async listeners 完成: `emit()` 不返回 Promise, wrapper 虽然 `await handler(data)`, 但 Node EventEmitter 的 promise return 没被 event-bus API 暴露。
- [I] channel namespace、payload schema 和 versioning 由 extension 作者约定: channel/payload 类型是 `string`/`unknown`, 但源码没有直接讨论 naming convention。
- [I] package root export 使外部 embedding/test code 可以构造或传入 bus: export 可证, 具体调用场景未在本节点 source 中逐一核验。

No unresolved [U] items found while reading the listed source files and immediate call sites.
