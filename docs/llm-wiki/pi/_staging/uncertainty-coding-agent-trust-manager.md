# uncertainty-coding-agent-trust-manager

本轮新增需要上收 `reference/uncertainty.md` 的 `[U]` 项:

- 无。当前节点中没有保留无法由源码或明确推断支撑的 `[U]`。

本轮主要 `[I]` 降级:

- `normalizeCwd()` 的具体 symlink/case canonicalization 语义来自 `utils/paths.ts`, 但本节点 Sources 只保留 index 指定的 trust source files, 因而只把它描述为 path normalization 边界。
- parent-folder trust option 的产品意图、拒绝 trust 的较窄粒度、sorted JSON 便于 diff/排查, 都是由 update/write 控制流推出的设计含义。
- `resolveProjectTrusted()` 的 override chain 命名、non-interactive `ask` 的 fail-closed 表述, 以及 extension runner / loader 的职责边界, 都由当前两个 source files 的调用顺序和 imports 推断。
