# Uncertainty · surface.extensions.contribution-points

本节点未留下 `[U]`。

- L2 按 `index.json` source 复核:本节点只保留 `packages/coding-agent/src/core/extensions/types.ts` 与 `packages/coding-agent/src/core/extensions/runner.ts` 作为 explicit source。
- 原草稿中依赖 `loader.ts` 和 `docs/extensions.md` 的注册写入细节/用户文档示例不再作为 `[E]`;已改写为 `Extension` maps、runner 聚合/查找/flush/rebind 可直接支撑的描述。
- `[I]` 主要用于边界判断: extension/custom tool 与内置 tool 的最终覆盖关系属于 session registry / wrapper 深挖节点;provider config 的新增/覆盖细节属于 model registry 节点;message renderer 不是语义拦截点;`registerFlag()` 与 action methods 是相邻能力,但不在本节点 `index.json` 指定的五个 `symbols` 中。
