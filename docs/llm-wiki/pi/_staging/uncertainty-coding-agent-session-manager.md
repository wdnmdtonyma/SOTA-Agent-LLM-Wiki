# uncertainty: subsys.coding-agent.session-manager

本轮填充 `subsys.coding-agent.session-manager` 未新增 `[U]`。

保留为 `[I]` 的主要边界判断:

- `SessionManager` 的 append-only tree 设计解释来自源码注释、`leafId` 推进和 branch 只移动 leaf 的组合;源码能证明实现事实,但“为何这样设计以保留候选路径”属于结构性解释。
- 延迟写入策略的效果“减少只有 header 或首条用户消息的 session 文件”来自 `_persist()` 的 no-assistant guard 和 `createBranchedSession()` 注释;这是对行为影响的归纳,不是单独的产品需求声明。
- resume list 的 `modified` 更贴近会话 activity 而非文件 mtime,来自 `buildSessionInfo()` 对 message timestamp/header timestamp/stats.mtime 的优先级;“更贴近”是解释性语言。
- 与 `surface.sessions.management`、`subsys.agent-core.jsonl-storage`、`ref.coding-agent.session-format` 的分工来自 wiki index 和源码边界,不是单个 source 文件中的 runtime contract。
