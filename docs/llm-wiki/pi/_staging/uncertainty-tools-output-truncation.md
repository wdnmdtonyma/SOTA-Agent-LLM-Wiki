# uncertainty-tools-output-truncation

本轮 rewrite `subsys.coding-agent.output-truncation` 未写入 `[U]`。已删除 harness `messages.ts` / `shell-output.ts` 对照;截断权威源是 coding-agent `truncate.ts`。

已核清的易混点:

- `OutputAccumulator` 的 temp file 写入 raw `Buffer` chunks; direct `executeBashWithOperations()` 的 full-output temp file 写入 sanitized text,两条路径语义不同。
- `fullOutputPath` 是 bash/direct shell capture 路径的字段; grep/read/find/ls 的 tool details 只声明 `truncation` 和各自 limit flag。
- `takeOverStdout()` 解决 stdout 协议污染,不参与 `TruncationResult` 计算。
- `truncateMiddle()` 供 MCP 工具输出使用,不走 bash/grep 的 `TruncationResult`。
