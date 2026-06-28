# uncertainty: surface.misc.containerization

本轮按 `docs/llm-wiki/pi/index.json` 的 source 集合核验,只把以下文件作为 `[E]` ground truth:

- `packages/coding-agent/docs/containerization.md`
- `.pi/extensions/redraws.ts`

本轮保留或新增的 `[U]` 项:

- `docs/llm-wiki/pi/index.json` 为 `surface.misc.containerization` 列出的 `.pi/extensions/redraws.ts` 与容器化主题不匹配。该文件只注册 `/tui` command 读取 `tui.fullRedraws`,没有 Docker、Gondolin、OpenShell、sandbox、permission boundary 或 containerization 逻辑。
- `packages/coding-agent/docs/containerization.md` 描述 Gondolin、Plain Docker 和 OpenShell 的用户面使用模式,但本轮没有核外部 Gondolin、Docker、OpenShell 源码或运行时策略;节点只把它们作为 pi 文档中的推荐外部边界,不声明其实际隔离强度。
- OpenShell provider routing、gateway credential injection 和 policy enforcement 只按 pi 文档描述记录;本轮没有核 OpenShell gateway 实现。
- 原草稿中引用 `README.md`、`packages/coding-agent/docs/security.md`、`packages/coding-agent/examples/extensions/sandbox/index.ts`、`packages/coding-agent/examples/extensions/sandbox/package.json`、`package.json`、`packages/coding-agent/src/core/tools/bash.ts`、`packages/coding-agent/docs/extensions.md` 的 `[E]` 断言均不在本节点 index source 内;本轮已从主节点显式证据中移除或降级为边界说明。
- sandbox example 调用 `@anthropic-ai/sandbox-runtime` 的接线方式与 OS-level enforcement 不在本节点 index source 内;如需覆盖,应先 reconcile index source 或迁移到 extension/API/tool 节点。
