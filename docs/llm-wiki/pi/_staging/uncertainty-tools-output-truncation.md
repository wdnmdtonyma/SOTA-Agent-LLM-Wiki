# uncertainty-tools-output-truncation

本轮未写入 `[U]` 断言。

已核清的易混点:

- `OutputAccumulator` 的 temp file 写入 raw `Buffer` chunks; direct `executeBashWithOperations()` 的 full-output temp file 写入 sanitized text, 两条路径语义不同。
- `fullOutputPath` 是 bash/direct shell capture 路径的字段; grep/read/find/ls 的 tool details 只声明 `truncation` 和各自 limit flag。
- `takeOverStdout()` 解决 stdout 协议污染, 不参与 `TruncationResult` 计算。
