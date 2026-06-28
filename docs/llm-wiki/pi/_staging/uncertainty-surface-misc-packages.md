# uncertainty-surface-misc-packages

本轮填充 `surface.misc.packages` 新增 2 条 `[U]`:

- [U] `surface.misc.packages` 的 index source 只有 `packages/coding-agent/src/core/package-manager.ts` 和 `packages/coding-agent/docs/packages.md`,但 index symbols 包含 `PackageSource`;当前节点只能从 `package-manager.ts` 核到 package entry 的 runtime 消费形态,不能在 index source 内核到 `PackageSource` 的完整 public settings schema。已把原先指向 `settings-manager.ts` 的 `[E]` 从节点正文降级为 source-set 不确定项,未修改 index 或 frontmatter source。
- [U] 用户文档说明 `pi config` 可启用/禁用 installed packages 和 local directories 中的资源,但本节点 source 未包含 `packages/coding-agent/src/cli/config-selector.ts` 或相关 settings 写入实现;节点只记录用户可见承诺,不展开具体写入行为。
