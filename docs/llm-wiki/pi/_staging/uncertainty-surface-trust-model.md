# uncertainty: surface trust model

- `surface.trust.model` 的 index source 只列 `project-trust.ts`、`trust-manager.ts` 和 `docs/security.md`;本轮已把节点 frontmatter/source 与 `## Sources` 收敛为这三项。此前额外引用的 `settings-manager.ts`、`resource-loader.ts`、`package-manager.ts`、`cli/args.ts`、`main.ts`、interactive components、`docs/settings.md` 未作为本节点 `[E]` 保留。
- `/trust` 命令 UI、保存后是否提示或要求重启、以及是否包含 session-only 选项,需要 `packages/coding-agent/src/modes/interactive/...` 或 `packages/coding-agent/docs/settings.md` 才能显式核验;这些文件不在 index source 内,本节点只保留 `getProjectTrustOptions()` 和 startup prompt 的可验证选项行为。
- settings-manager 对 project settings 的硬 gate、package-manager 对 project package storage/resource collection 的硬 gate、以及 resource-loader 的 pre-trust bootstrap 流程都超出 index source;当前节点只保留 security 文档中“project-local settings/resources/packages/extensions 被 trust 控制”的用户可见结论。
- CLI parser 对 `--approve`/`-a`、`--no-approve`/`-na` 如何写入 `projectTrustOverride` 超出 index source;当前节点只保留 security 文档中“这些 flag 是 one-run override”的用户可见结论。
- runtime 哪些入口把 `projectTrustContext.hasUI` 设为 true/false 超出 index source;当前节点只保留 `resolveProjectTrusted()` 在无 UI ask path 中 fail closed 的源码事实。
- `symbols` 包含 `emitProjectTrustEvent`,但该 symbol 定义在 `packages/coding-agent/src/core/extensions/runner.ts`,不在 index source 三个文件内;本节点只能通过 `project-trust.ts` 的调用点核验 trust resolution 对该事件的使用,完整 extension event API 仍应由 `surface.extensions.api`/extension runner 节点覆盖。
- `AGENTS.md`/`CLAUDE.md` context files 在拒绝 trust 时仍加载这一点来自 security 文档;实际 context file discovery 的所有开关和 fallback 位置不在本节点展开,应由 system prompt/context 相关节点覆盖。
