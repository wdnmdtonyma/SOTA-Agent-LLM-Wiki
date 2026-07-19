# uncertainty-ai-model-discovery

L2 核验后，`subsys.ai.model-discovery` 的 supporting sources 与 index 元数据已 reconcile，没有遗留 metadata `[U]`。

降级或保留为 `[I]` 的主要结论:

- generated catalog 与 provider registry 当前相邻但非单一共享数据结构: 源码分别有 `Object.keys(MODELS)` 与 `builtinProviders()` factory array, 没有声明同步不变量。
- `getBuiltinModel()` runtime 可返回 `undefined`: 源码有 optional access 和 cast, 但 TypeScript 签名不表达 `undefined`。
- `calculateCost()` mutates same `usage.cost` object 的意图来自赋值与返回同一字段的实现形状, 源码没有单独设计说明。

L2 行号/可核性修正:

- 移除了指向 `models.ts` 注释行的 `[E]` 锚点, 改锚到 `api` 类型、`apiFor()`、`hasApi()` 和 `calculateCost()` 的实际代码行。
- 成本计算段删除了仅由注释命名的 "Anthropic-style" 表述, 保留公式可直接证明的 `1h cache writes at 2 * model.cost.input`。
- generated 文件只作为当前事实快照使用; 生成与更新入口由 `generate-models.ts` 写文件逻辑和 `package.json` script 支撑, 相关设计性判断继续标 `[I]`。
