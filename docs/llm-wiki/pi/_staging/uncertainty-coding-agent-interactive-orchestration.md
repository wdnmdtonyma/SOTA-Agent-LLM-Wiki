# uncertainty-coding-agent-interactive-orchestration

本节点没有新增 `[U]`。

保留的 `[I]` 主要是边界性归纳, 用于把源码事实压成 wiki 检索语义:

- `startup-ui.ts` 是 pre-session UI, `InteractiveMode` 是 session-bound UI host。
- `init()` 先启动 TUI 再 bind extensions 的动机是让 extension `session_start` handler 能使用 interactive dialogs。
- slash commands 不经过 `getUserInput()` 的普通 prompt queue。
- idle submit callback queue 的作用是解耦 editor submit timing 和 agent prompt loop。
- resources container 与 chat container 分离, 用于让 reload/resources diagnostics 与 restored session messages 分层显示。
- persisted session restore 能重建 inline tool UI, 不只回放 plain messages。
- shutdown 的两个分支体现 terminal restore 与 extension shutdown 的 ordering tradeoff。
- related 节点目前是 planned;跨包边界对其职责范围的描述是按 index title/source/symbols 推断。
