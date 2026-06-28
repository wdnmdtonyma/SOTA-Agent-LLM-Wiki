# Uncertainty: agent-core jsonl-storage

batch: agent-core
node: subsys.agent-core.jsonl-storage
updated: 5a073885

## 当前状态

- L2 已逐条核对 `[E]` 可核性、行号精度与过度推断;未留下需要升级为 uncertainty 条目的不确定点。
- 已将节点标记为 `status: verified`。
- 收紧项:区分 full open path 的“过滤空白行后首行 header”和 list path 的“物理第一行 header”;把 `getPathToRoot()` 改写为从传入 entry id 回溯;明确 `encodeCwd()` 只移除一个开头 slash/backslash;删除“普通对话消息”这类超出本节点 source 的表述。
- 节点只依据 `packages/agent/src/harness/session/jsonl-storage.ts` 与 `packages/agent/src/harness/session/jsonl-repo.ts` 写入,未把测试文件作为 frontmatter source。
