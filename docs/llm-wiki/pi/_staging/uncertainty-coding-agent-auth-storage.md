# Uncertainty · subsys.coding-agent.auth-storage

- [U] `index.json` lists `saveApiKey` as a symbol for `subsys.coding-agent.auth-storage`, but `packages/coding-agent/src/core/auth-storage.ts` and `packages/coding-agent/src/core/auth-guidance.ts` do not define or export `saveApiKey`. Current source exposes generic `AuthStorage.set(provider, credential)` and callers can store `{ type: "api_key", key }`.
- [I] `getAuthStatus()` reports runtime/environment auth with `configured: false` while `hasAuth()` treats runtime override and environment key as usable auth. This likely separates persisted credentials from transient/fallback sources, but the two source files do not document the intended UI semantics.
- [I] The sync lock retry loop uses a busy wait to keep the backend interface synchronous. That behavior is visible in code, but the design motivation is inferred from the inline comment and method shape rather than a design doc.
