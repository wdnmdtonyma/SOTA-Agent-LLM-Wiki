# uncertainty-ai-model-discovery

L2 核验后 `subsys.ai.model-discovery` 保留 1 条 `[U]`:

- `docs/llm-wiki/pi/index.json` 里 `subsys.ai.model-discovery.source` 只列 `packages/ai/src/models.generated.ts` 与 `packages/ai/src/models.ts`, 但本节点被要求覆盖的 `builtinModels()` / `getBuiltinModel()` 实现在 `packages/ai/src/providers/all.ts`, `Model` 字段定义在 `packages/ai/src/types.ts`, generated gotcha 的可执行入口在 `packages/ai/scripts/generate-models.ts` 与 `packages/ai/package.json`。本节点 frontmatter 暂列实际支撑源, index 元数据留待后续专门 reconcile。

降级或保留为 `[I]` 的主要结论:

- generated catalog 与 provider registry 当前相邻但非单一共享数据结构: 源码分别有 `Object.keys(MODELS)` 与 `builtinProviders()` factory array, 没有声明同步不变量。
- `getBuiltinModel()` runtime 可返回 `undefined`: 源码有 optional access 和 cast, 但 TypeScript 签名不表达 `undefined`。
- `calculateCost()` mutates same `usage.cost` object 的意图来自赋值与返回同一字段的实现形状, 源码没有单独设计说明。

L2 行号/可核性修正:

- 移除了指向 `models.ts` 注释行的 `[E]` 锚点, 改锚到 `api` 类型、`apiFor()`、`hasApi()` 和 `calculateCost()` 的实际代码行。
- 成本计算段删除了仅由注释命名的 "Anthropic-style" 表述, 保留公式可直接证明的 `1h cache writes at 2 * model.cost.input`。
- generated 文件只作为当前事实快照使用; 生成与更新入口由 `generate-models.ts` 写文件逻辑和 `package.json` script 支撑, 相关设计性判断继续标 `[I]`。
