# uncertainty — spine.trace-subagent-spawn (r3t5)

- [U] async agent 完成后 `enqueuePendingNotification({mode:'task-notification'})` (tasks/LocalAgentTask/LocalAgentTask.tsx:258) 产出的 `<task-notification>` 消息，究竟在父 `queryLoop` 的哪一行被取出并作为新一轮用户输入注入，未逐行核到端到端连线。trace 中按 `spine.agent-loop` 已述的 "queued commands" 处理标为 [I]，未编造具体行号。
- [I] in-process teammate 的执行循环由 `startInProcessTeammate` (tools/shared/spawnMultiAgent.ts:912, fire-and-forget) 启动，最终在 inProcessRunner.ts:1175 进入 `runAgent()`；该 runner 在 prompt 不变的 `allMessages` 缓冲上反复调用 runAgent（inProcessRunner.ts:1036 注释），与 AgentTool 单次 runAgent 调用语义不同，trace 仅在 teammate 分支末端给出指针，不展开 runner 内部多轮逻辑。
