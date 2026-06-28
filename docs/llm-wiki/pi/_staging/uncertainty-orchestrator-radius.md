# uncertainty-orchestrator-radius

- Radius 云端服务端如何展示、路由或 relay 已注册的 machine/Pi instance, 本地 `packages/orchestrator/src/radius.ts` 只能证明注册 payload 和 `relay: false`/`iroh: false`, 不能证明云端行为。[U]
- Radius OAuth credential 的刷新、过期处理和 scope 语义不在 orchestrator 源码中实现；本节点只能证明 `AuthStorage` 读取 provider `radius` 的 access token, 以及 `PI_RADIUS_API_KEY` fallback。[U]
- `isRadiusEnabled()` 只做本地 token/env 存在性判断, 不能证明 token 会被 Radius 云端接受；云端拒绝原因只能在后续 HTTP error 中表现。[U]
- `RadiusRegistration.expiresInMs` 在 type 中存在, 但当前本地 Radius client 没有使用它；是否由云端仅作提示或未来续约字段未在源码中说明。[U]
