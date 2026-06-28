# Uncertainty staging: tools / bash-executor

Node: `subsys.coding-agent.bash-executor`

本轮没有写入需要同步到 `reference/uncertainty.md` 的 `[U]` 断言。

保留给后续 L2/L3 复核的注意点:

- 本节点 frontmatter `source` 维持 index.json 中的两个权威文件, 但正文为了说明调用点和测试行为引用了 `agent-session.ts`、`rpc-mode.ts`、`extensions/loader.ts` 和两份测试文件。若 wiki 规范要求 frontmatter.source 与所有证据文件完全一致, 需要在 index.json 协调更新 source 列表。
- “本子系统没有分配 PTY” 是对 `bash-executor.ts` 与 `exec.ts` 两个 source 文件的负向归纳, 标为 `[I]`; 若其他调用层为 bash 提供 PTY, 应在 `surface.tools.bash` 或交互模式节点单独说明。
