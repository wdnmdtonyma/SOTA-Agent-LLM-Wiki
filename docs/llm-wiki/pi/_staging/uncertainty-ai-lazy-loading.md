# uncertainty-ai-lazy-loading

本轮填充 `subsys.ai.lazy-loading` 未新增 `[U]`。动态 import 的具体 specifier 位于各 `api/<name>.lazy.ts` wrapper,而本节点 frontmatter source 只覆盖 `packages/ai/src/api/lazy.ts`;因此节点把“provider-specific wrapper 通常传入 dynamic import loader”和“wire protocol dispatch 先选中 `ProviderStreams` 再进入 lazy wrapper”标为 `[I]`。

L2 verifier: 已按 `pi/packages/ai/src/api/lazy.ts` 的实际行号逐条核验 `[E]`。修正点:

- 将“本文件不实现 provider-specific payload / event normalization”的负向结论拆为 `[I]`,保留 `lazyStream` / `lazyApi` 签名作为 `[E]`。
- 将 setup error message 的 “没有 content” 修正为源码可核的 `content: []`。
- 将动态导入、auth/setup 边界、host import cache dedupe 等注释-only 说明降级为 `[I]`;可核的 `load()` / 转调 / error event 仍落到实际代码行。

未发现需要降级为 `[U]` 的断言;节点已标记 `status: verified`。
