# uncertainty-ai-credential-store

本轮填充 `subsys.ai.credential-store` 未新增 `[U]` 存疑项。

L3 lint 修正了几处仍指向注释行的 `[E]`: 顶部摘要的 serialized modify/removal 证据改到 `CredentialStore` 方法签名与 `InMemoryCredentialStore.enqueue()` 代码行, `CredentialStore` 不承载 provider-specific auth 解析策略保持 `[I]`, `modify()` 的 undefined/removal 语义改用 `modify` 回调/返回类型、`delete()` 方法签名和内存实现代码行证明, OAuth refresh critical-section 用途保持 `[I]`。修正后节点保持 verified。

降级为 `[I]` 的主要结论:

- `ProviderAuth` handler choice belongs to auth resolution: `types.ts` 只定义 `ProviderAuth`、`ApiKeyAuth`、`OAuthAuth` 与 store contract, 本节点未把 `resolve.ts` 纳入 Sources。
- `CredentialStore` 不承载 provider-specific auth 解析策略: 这是从 interface 暴露面和本节点 Sources 边界得出的职责边界推断, 不是源码中的独立明文声明。
- `modify(fn)` 的 critical-section 用途: 源码能证明 `fn(current)` 在 provider-local queue 内执行, OAuth refresh policy 由 `subsys.ai.auth-resolution` 覆盖。
- `InMemoryCredentialStore` 不做结构复制: 源码显示 map 直接保存/返回 credential object, 但没有注释把 object identity 声明成公共契约。
