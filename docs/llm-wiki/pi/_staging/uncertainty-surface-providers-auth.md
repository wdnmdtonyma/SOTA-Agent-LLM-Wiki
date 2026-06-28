# uncertainty: surface.providers.auth

本轮核验 `surface.providers.auth` 保留 1 个 `[U]`:

- index 中 `surface.providers.auth` 的 `symbols` 包含 `login`,且 `source` 包含 `packages/ai/src/cli.ts`;但用户可见的 coding-agent `/login` 实际分流在 `packages/coding-agent/src/modes/interactive/interactive-mode.ts`,持久化在 `packages/coding-agent/src/core/auth-storage.ts`,而 `packages/ai/src/cli.ts` 的 standalone `login(providerId)` 写的是当前目录 `auth.json`。因此 `login` 这个 symbol 在本节点中的权威归属需要后续消歧。

保留为 `[I]` 的主要结论:

- `Models.getAuth()`/`applyAuth()` 是 `pi-ai` runtime request auth path,而 `AuthStorage.getApiKey()`/model-registry 是 coding-agent 产品层 compatibility path:这是由调用边界和 source ownership 推出,不是某个文件里的单句设计声明。
- `builtinProviders()` 是 provider membership ground truth,`env-api-keys.ts` 是 API key 环境变量 ground truth:这是 `conventions.md` 的 pi 专属约定与当前 source 布局共同推出。

L3 lint 修正:

- `surface.providers.auth` 中指向 `models.ts:239` 的纯括号锚点已移除,同一断言改由 `apiKey`/`env` 参数行承载。
- `env-api-keys.ts:115-117` 与 `auth/resolve.ts:34,36-38` 原本只指向注释/JSDoc,已改为函数签名、分支和返回语句等真实承载行;其中 `findEnvKeys` 不返回 ambient credential source 的结论保留为 `[I]` 辅助解释。
