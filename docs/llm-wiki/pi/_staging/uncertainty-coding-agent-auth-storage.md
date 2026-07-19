# Uncertainty · subsys.coding-agent.auth-storage

- `index.json` 与节点 symbols 已按当前实现统一为 `AuthStorage`、`FileAuthStorageBackend`、`RuntimeCredentials` 和 `readStoredCredential`;旧 `saveApiKey` 漂移已清除。
- [I] `getAuthStatus()` reports runtime/environment auth with `configured: false` while `hasAuth()` treats runtime override and environment key as usable auth. This likely separates persisted credentials from transient/fallback sources, but the two source files do not document the intended UI semantics.
- [I] The sync lock retry loop uses a busy wait to keep the backend interface synchronous. That behavior is visible in code, but the design motivation is inferred from the inline comment and method shape rather than a design doc.
