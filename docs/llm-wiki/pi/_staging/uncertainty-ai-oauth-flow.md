# uncertainty-ai-oauth-flow

- 目标 commit 已删除旧 `packages/ai/src/utils/oauth/index.ts`，且没有新建同形 index；内部 flow loader 的新入口是 `packages/ai/src/auth/oauth/load.ts`。
- device-code 与 PKCE helpers 已迁到 `packages/ai/src/auth/oauth/`；公共 `packages/ai/src/oauth.ts` 仅保留 extension compatibility types，standalone Bun 由 `packages/ai/src/bun-oauth.ts` 静态注册 bundled loaders。
- 节点中的 explicit evidence 已全部重定位到当前存在的 source；本轮没有遗留 `[U]`。
