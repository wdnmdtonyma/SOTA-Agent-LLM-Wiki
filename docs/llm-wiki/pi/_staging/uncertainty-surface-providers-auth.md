# uncertainty: surface.providers.auth

本轮核验 `surface.providers.auth` 保留 1 个 `[U]`：

- runtime OAuth registry 已包含 Kimi Coding，且 coding-agent 的登录路径可调用该 provider；但 `packages/coding-agent/docs/providers.md` 的 subscription provider bullet 尚未列 Kimi Coding。Wiki 以运行时代码为 ground truth，并把这项用户文档漂移保留为 `[U]`。

保留为 `[I]` 的主要结论:

- `Models.getAuth()`/`applyAuth()` 是 `pi-ai` runtime request auth path，而 `AuthStorage.getApiKey()`/model-registry 是 coding-agent 产品层 compatibility path：这是由调用边界和 source ownership 推出，不是某个文件里的单句设计声明。
- `builtinProviders()` 是 provider membership ground truth，`env-api-keys.ts` 是 API key 环境变量 ground truth：这是 `conventions.md` 的 pi 专属约定与当前 source 布局共同推出。

L3 lint 修正:

- 旧版把裸 `login` symbol 与 `packages/ai/src/cli.ts` 当作 metadata 歧义；当前 frontmatter 已改为 `ModelRuntime.login` / `Models.login` 等精确 symbols，且不再把该 CLI 文件列为 source，因此这项历史歧义已关闭。
- `surface.providers.auth` 中指向 `models.ts:239` 的纯括号锚点已移除，同一断言改由 `apiKey`/`env` 参数行承载。
- `env-api-keys.ts:115-117` 与 `auth/resolve.ts:34,36-38` 原本只指向注释/JSDoc，已改为函数签名、分支和返回语句等真实承载行；其中 `findEnvKeys` 不返回 ambient credential source 的结论保留为 `[I]` 辅助解释。
