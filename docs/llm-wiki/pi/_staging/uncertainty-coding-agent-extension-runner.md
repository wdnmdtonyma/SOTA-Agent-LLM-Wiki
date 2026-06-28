# uncertainty-coding-agent-extension-runner

本轮新增需要上收 `reference/uncertainty.md` 的 `[U]` 项:

- `subsys.coding-agent.extension-runner` 的 index symbol 写作 `emitProjectTrust`, 但当前源码导出名是 `emitProjectTrustEvent`;需要确认 index symbol 是否允许简称, 还是应协调修正为源码导出名。
- `ExtensionRunner.emitToolCall()` 没有 try/catch, 与多数专用 emitter 和通用 `emit()` 的 error-to-`emitError()` 模式不同;当前源码未直接说明这是刻意的 fail-closed 行为还是遗漏。

本轮主要 `[I]` 降级:

- loader/resource loader/session 对 runner 的接入边界, 因本节点 Sources 只保留 index 指定的 `runner.ts`, 跨文件调用点只作结构推断。
- declarative contribution phase 与 bound runtime phase 的设计动机, 由 `bindCore()` 的 runtime copy 和 provider flush 行为推出。
- 不同专用 emitter 存在是为了表达不同 combination policy, 由各 emitter 的控制流差异推出。
