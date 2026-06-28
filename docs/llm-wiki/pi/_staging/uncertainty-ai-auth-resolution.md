# uncertainty: subsys.ai.auth-resolution

L2 核验后 `subsys.ai.auth-resolution` 未新增 `[U]`。已将 OAuth refresh 的 `modify()` 并发语义收紧为 resolver 对 store read-modify-write 边界的依赖,未把具体锁实现写成源码可直接证明的事实。provider-specific 环境变量名、OAuth provider 细节和 `AuthResult` 完整字段语义仍作为跨节点边界留给 `surface.providers.auth`、`subsys.ai.credential-store` 与 `ref.ai.auth-types`;本节点只记录 `resolve.ts` / `context.ts` 能直接支撑的解析顺序、fallback 边界和 `AuthContext` 行为。
