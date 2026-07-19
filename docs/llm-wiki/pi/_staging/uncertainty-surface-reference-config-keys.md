# uncertainty: surface reference config keys

- 当前 catalog 与 index 已统一为 74 个实例：45 个 `Settings` top-level 字段、23 个嵌套 leaf、6 个 `PackageSource` object fields。
- [U] `terminal.showTerminalProgress` 在 `TerminalSettings` 与 getter/setter 中存在,默认 `false`,但 `packages/coding-agent/docs/settings.md` 的 Terminal & Images 表没有列出该 key。主节点把它保留为源码支持的配置键。
- [U] `websocketConnectTimeoutMs` 的 docs 默认写 `15000`,但 `SettingsManager.getWebSocketConnectTimeoutMs()` 只解析 setting 本身,未在本 ground-truth 三件套中找到 15000 fallback 的直接代码锚点。主节点保留 docs 默认并标注 getter 口径。
- [U] `retry.provider.maxRetries` 的 docs 默认写 `0`,但 `SettingsManager.getProviderRetrySettings()` 对 unset 值原样返回 `undefined`;默认 0 可能由下游 SDK/provider option 口径承担。主节点保留 docs 默认并标注 getter 口径。
