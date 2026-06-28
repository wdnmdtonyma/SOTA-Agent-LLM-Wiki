# uncertainty: subsys.agent-core.turn-control

- L2 verified: 本轮未发现需要保留为 `[U]` 的事实；节点 status 已升为 `verified`。对 `[E]` 的行号锚点做了局部收紧：`newMessages` 明确为调用方返回并随 `agent_end` 发送，follow-up 续跑补充 `length > 0`/`continue` 行号，非 error/aborted 的 turn hook 路径补充条件行，hard-stop 表述改为“在后续阶段之前返回”。
- [I] follow-up messages 被解释为“等待 tool-call 驱动的自然续轮耗尽后再进入 context”；L2 已核对 `runLoop` 外层停止点检查和代码注释可支撑控制流结论，但产品层 queue 语义仍作为跨节点边界保留为 `[I]`。
- [I] `shouldStopAfterTurn` 被解释为 graceful stop gate；代码位置显示它在 `turn_end`、`prepareNextTurn` 和工具执行之后运行，但命名意图仍属推断。
- [I] `stopReason === "error" | "aborted"` 被解释为 hard-stop path；代码明确直接发 `turn_end`/`agent_end` 返回，hard-stop 是本文术语。
