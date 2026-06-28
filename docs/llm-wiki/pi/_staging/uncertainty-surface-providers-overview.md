# uncertainty: surface.providers.overview

本轮 L2 核验 `surface.providers.overview` 未新增 `[U]`;节点已置为 `status: verified`。

核验修正:

- 将 generated catalog 与 `builtinProviders()` 的关系从“当前可互相核对”收紧为“可作为交叉检查对象”,避免在未把 generated catalog 纳入本节点 source 时写成当前事实。
- 去掉 mixed-API provider 句子中的具体 provider 点名;本节点 source 只能直接证明 `createProvider()` 支持 API map dispatch,具体 provider 使用情况应由逐 provider factory 或 catalog 节点展开。
- 为 `streamSimple()` 的请求委派补充 `models.ts:278/281/282` 行号锚点。

保留为 `[I]` 的主要结论:

- `builtinProviders()` 应作为 provider membership ground truth,generated `MODELS` 用于模型元数据和 cross-check: 这是 `conventions.md` 的 pi 专属约定与当前 `all.ts`/`models.generated.ts` 分工共同推出,不是源码中声明的不变量。
- `models.json` 适合已有 wire protocol 的 custom provider,扩展适合 custom stream implementation 或 OAuth flow: docs 明确给出这两条路径,具体能力边界由 `createProvider()` 的输入 shape 推出。
- `builtinProviders()` 返回 fresh factory call 结果而非 singleton: 源码显示每次函数调用都会执行 factory call array,但具体 provider 内部是否有共享状态需看各 provider factory 实现;overview 不展开逐 provider 内部状态。
