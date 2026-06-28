# uncertainty: subsys.ai.compat-legacy

L2 核验后 `subsys.ai.compat-legacy` 未新增 `[U]`;节点已标记 `status: verified`。修正包括:为摘要中的迁移边界补充 `compat.ts:2` / `compat.ts:8` 证据,将 “compat 不实现新的 provider-specific wire payload” 明确降级为结构性 `[I]`,并把 “启动时记录的 builtin provider instance” 收紧为 `registerBuiltInApiProviders()` 记录的 instance。迁移边界来自 `compat.ts` 的源码注释与 deprecated alias 注释;对“不要继续在 compat 新增 alias”“builtin fast path 复用新 `Models` surface”等范围判断继续使用 `[I]` 标注为结构性推断。
