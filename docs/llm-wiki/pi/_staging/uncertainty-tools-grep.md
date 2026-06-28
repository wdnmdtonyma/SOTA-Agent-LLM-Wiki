# uncertainty-tools-grep

- `surface.tools.grep` 的 `executionMode` 结论是跨 `grep.ts` 未显式声明、`ToolDefinition.executionMode` optional、`Agent.toolExecution` 默认 `"parallel"`、`agent-loop` sequential gate 推出的运行时结论;源码中没有一行直接写 “grep executionMode is parallel”,所以正文标为 `[I]`。
- `--hidden` 与 `.gitignore` 的组合意图来自工具 description 和 ripgrep 参数形态;源码没有专门测试 hidden+ignored 文件矩阵,所以正文只写“意图是搜索 hidden 文件同时仍保留 ignore 规则”并标为 `[I]`。
- 本轮未为 `subsys.coding-agent.output-truncation` 或 `ref.tools-catalog` 创建目标节点;相关链接依据 `index.json` 的 related id 填写。
