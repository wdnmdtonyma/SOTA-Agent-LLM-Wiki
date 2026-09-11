---
id: spine.trace-interactive-turn
title: trace:一次交互式 turn 端到端
kind: flow
tier: T0
pkg: cross
source: [packages/coding-agent/src/modes/interactive/interactive-mode.ts, packages/coding-agent/src/core/agent-session.ts, packages/agent/src/agent-loop.ts]
symbols: [InteractiveMode, AgentSession.prompt, runAgentLoop, getDefaultStreamFn]
related: [spine.agent-loop, surface.modes.interactive, subsys.coding-agent.interactive-orchestration]
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `spine.trace-interactive-turn` 走读一次 TUI interactive turn:用户在 `InteractiveMode` 提交文本,`AgentSession.prompt` 做产品层 preflight 与消息装配,再进入 `pi-agent-core` 的 `runAgentLoop` 生成 assistant response、tool results 与 UI events。

## 能回答的问题

- 一次普通交互式 turn 从 editor submit 到 `runAgentLoop` 的主路径是什么?
- `InteractiveMode` 在什么时候直接调用 `AgentSession.prompt`,什么时候只排队 steer/follow-up?
- `AgentSession.prompt` 在真正启动 agent 前做了哪些 product-layer 工作?
- `runAgentLoop` 发出的事件如何回到 TUI 的 chat、status、tool components?
- `coding-agent` 和 `agent` 两个包在一次 interactive turn 上的责任边界在哪里?

```mermaid
flowchart TD
  A["InteractiveMode.run()"] --> B["init(): TUI layout + editor submit handler + session subscription"]
  B --> C["while true: getUserInput()"]
  C --> D["editor.onSubmit(text)"]
  D --> E{"slash/bash/compaction/streaming?"}
  E -- "plain prompt" --> F["flush pending bash UI"]
  F --> G["resolve getUserInput promise or pendingUserInputs"]
  G --> H["InteractiveMode.run awaits session.prompt(userInput)"]
  E -- "streaming" --> S["session.prompt(text, streamingBehavior: steer) -> queue"]
  E -- "compacting" --> Q["queueCompactionMessage or extension command"]
  E -- "bash" --> X["handleBashCommand side path"]
  H --> I["AgentSession.prompt preflight"]
  I --> J["extension command/input hooks"]
  J --> K["skill/template expansion"]
  K --> L["model/auth validation + optional pre-prompt compaction"]
  L --> M["build user AgentMessage + custom messages + system prompt"]
  M --> N["_runAgentPrompt(messages)"]
  N --> O["Agent.prompt(messages)"]
  O -. "stateful Agent wrapper [I]" .-> P["runAgentLoop(prompts, context, config, emit, streamFn)"]
  P --> R["agent_start + turn_start + user message_start/end"]
  R --> T["streamAssistantResponse -> provider stream"]
  T --> U["assistant message_start/update/end"]
  U --> V{"tool calls?"}
  V -- "yes" --> W["executeToolCalls -> tool_execution_* + toolResult messages"]
  V -- "no" --> Y["turn_end; set lastCompletedTurn"]
  W --> Y
  Y --> Z{"error/aborted, shouldStopAfterTurn, or no more tools/queues?"}
  Z -- "yes: emit agent_end, return" --> AA["agent_end"]
  Z -- "no: next inner iteration" --> PN["prepareNextTurn(lastCompletedTurn) then turn_start"]
  PN --> T
  R --> AB["AgentSession._handleAgentEvent"]
  U --> AB
  W --> AB
  AA --> AB
  AB --> AC["InteractiveMode.handleEvent updates chat/status/tool UI"]
```

## 端到端步骤

1. `InteractiveMode` 是 `coding-agent` 的 TUI server:构造函数保存 `AgentSessionRuntime`,创建 `TUI`,并准备 `chatContainer`、`pendingMessagesContainer`、`statusContainer` 等 UI containers。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:521] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:541] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:545] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:550] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:551] 默认 editor 以 `embedWorkingStatus: true` 构造;`showStatusIndicator()` 会先尝试把 compaction / retry / branch-summary / working spinner 嵌进 editor 顶边框,嵌入成功后不再往 `statusContainer` 放 indicator。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:561] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2102] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2108] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2109] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2112]

2. `init()` 先 `ui.start()` 启动 TUI,再 `setupKeyHandlers()` / `setupEditorSubmitHandler()` 挂 editor 输入,然后 `rebindCurrentSession()`,所以 interactive turn 的输入与 session events 都在 UI 已启动后工作。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:906] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:983] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:984] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:988]

3. `InteractiveMode.run()` 是主入口:它先 `await this.init()`,再处理 startup initial messages,最后进入无限循环,每轮 `await this.getUserInput()` 后调用 `this.session.prompt(userInput)`。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1034] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1035] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1111] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1113] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1120] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1123] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1132] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1133] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1135]

4. `getUserInput()` 不是直接读 terminal;它先消费 `pendingUserInputs`,否则创建一个 Promise 并把 resolver 放进 `onInputCallback`。这让 editor submit handler 可以把 UI callback 转成 `run()` loop 里的 awaited text。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3908] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3909] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3914] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3915]

5. editor submit handler 先 trim 空输入,再处理 slash commands、bash、compaction、streaming 这些 side paths;只有普通文本会进入 normal message submission 分支。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2964] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2966] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2970] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3106] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3124] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3137] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3148]

6. 普通文本提交会先把 pending bash components 从 pending area 移到 chat,然后如果 `getUserInput()` 正在等待就调用 `onInputCallback(text)`,否则把 text 放进 `pendingUserInputs`;最后把 text 加入 editor history。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3148] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3150] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3151] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3153] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3155]

7. 如果提交发生在 agent streaming 中,`InteractiveMode` 不等待当前 run 结束再普通 submit,而是调用 `this.session.prompt(text, { streamingBehavior: "steer" })`,随后刷新 pending messages display。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3137] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3140] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3141] `AgentSession.prompt` 对 streaming prompt 要求显式 `streamingBehavior`,并按 `"followUp"` 或 `"steer"` 分别进入 `_queueFollowUp` 或 `_queueSteer`。[E: packages/coding-agent/src/core/agent-session.ts:1228] [E: packages/coding-agent/src/core/agent-session.ts:1220] [E: packages/coding-agent/src/core/agent-session.ts:1225] [E: packages/coding-agent/src/core/agent-session.ts:1235] [E: packages/coding-agent/src/core/agent-session.ts:1228]

8. `AgentSession.prompt` 先处理 extension command:当输入以 `/` 开头且匹配扩展命令时,命令 handler 自己负责后续 LLM interaction,当前 prompt 直接返回。[E: packages/coding-agent/src/core/agent-session.ts:1183] [E: packages/coding-agent/src/core/agent-session.ts:1184] [E: packages/coding-agent/src/core/agent-session.ts:1185] [E: packages/coding-agent/src/core/agent-session.ts:1187] [E: packages/coding-agent/src/core/agent-session.ts:1188]

9. 没被 extension command 吃掉的输入会经过 extension input hooks;hook 可以 `handled` 直接结束,也可以 `transform` text/images,并且 source 默认是 `"interactive"`。[E: packages/coding-agent/src/core/agent-session.ts:1201] [E: packages/coding-agent/src/core/agent-session.ts:1202] [E: packages/coding-agent/src/core/agent-session.ts:1214] [E: packages/coding-agent/src/core/agent-session.ts:1207] [E: packages/coding-agent/src/core/agent-session.ts:1207] [E: packages/coding-agent/src/core/agent-session.ts:1207]

10. 正常 prompt 在非 streaming 路径会 flush pending bash messages,校验当前 model 存在且 auth 已配置,并在必要时先对上一条 assistant message 做 compaction/continue 处理。[E: packages/coding-agent/src/core/agent-session.ts:1235] [E: packages/coding-agent/src/core/agent-session.ts:1239] [E: packages/coding-agent/src/core/agent-session.ts:1143] [E: packages/coding-agent/src/core/agent-session.ts:1269] [E: packages/coding-agent/src/core/agent-session.ts:1270] [E: packages/coding-agent/src/core/agent-session.ts:1271]

11. `AgentSession.prompt` 把 expanded text 变成 `role: "user"` 的 `AgentMessage`,附加 images 和 `_pendingNextTurnMessages`,再触发 `before_agent_start` extension event;extension 可以添加 custom messages 或覆盖本 turn 的 system prompt。[E: packages/coding-agent/src/core/agent-session.ts:1266] [E: packages/coding-agent/src/core/agent-session.ts:1269] [E: packages/coding-agent/src/core/agent-session.ts:1270] [E: packages/coding-agent/src/core/agent-session.ts:1280] [E: packages/coding-agent/src/core/agent-session.ts:1273] [E: packages/coding-agent/src/core/agent-session.ts:1280] [E: packages/coding-agent/src/core/agent-session.ts:1281] [E: packages/coding-agent/src/core/agent-session.ts:1286] [E: packages/coding-agent/src/core/agent-session.ts:1293] [E: packages/coding-agent/src/core/agent-session.ts:1307]

12. preflight 成功后,`AgentSession.prompt` 调用 `_runAgentPrompt(messages)`;`_runAgentPrompt` 调用 `this.agent.prompt(messages)`,并在每次 run 后用 `_handlePostAgentRun()` 决定是否 `agent.continue()` 以处理 retry、compaction 或 agent_end extension handlers 新排入的 queued messages。[E: packages/coding-agent/src/core/agent-session.ts:1324] [E: packages/coding-agent/src/core/agent-session.ts:1325] [E: packages/coding-agent/src/core/agent-session.ts:1101] [E: packages/coding-agent/src/core/agent-session.ts:1104] [E: packages/coding-agent/src/core/agent-session.ts:1101] [E: packages/coding-agent/src/core/agent-session.ts:1106] [E: packages/coding-agent/src/core/agent-session.ts:1123] [E: packages/coding-agent/src/core/agent-session.ts:1137] [E: packages/coding-agent/src/core/agent-session.ts:1143]

13. `AgentSession` 到 `runAgentLoop` 的直接中间 call site 在 stateful `Agent` 包装器内,不在本节点 index 的三份 source 列中;本 trace 只把 `this.agent.prompt(messages)` 到 `runAgentLoop(prompts, context, config, emit, streamFn)` 作为跨文件桥接推断,不把它标成 explicit evidence。[I] `runAgentLoop` 本身接收 prompts、context、config、emit、signal、streamFn,把 prompts 放进 `newMessages` 与 `currentContext.messages`,然后发 `agent_start`、`turn_start`、每条 prompt 的 `message_start`/`message_end`。[E: packages/agent/src/agent-loop.ts:96] [E: packages/agent/src/agent-loop.ts:97] [E: packages/agent/src/agent-loop.ts:98] [E: packages/agent/src/agent-loop.ts:99] [E: packages/agent/src/agent-loop.ts:100] [E: packages/agent/src/agent-loop.ts:101] [E: packages/agent/src/agent-loop.ts:102] [E: packages/agent/src/agent-loop.ts:104] [E: packages/agent/src/agent-loop.ts:107] [E: packages/agent/src/agent-loop.ts:110] [E: packages/agent/src/agent-loop.ts:111] [E: packages/agent/src/agent-loop.ts:113] [E: packages/agent/src/agent-loop.ts:114]

14. `runLoop` 是低层 turn engine:它先读取 steering messages,在内层 loop 注入 pending messages,然后调用 `streamAssistantResponse` 产生 assistant message。[E: packages/agent/src/agent-loop.ts:156] [E: packages/agent/src/agent-loop.ts:168] [E: packages/agent/src/agent-loop.ts:175] [E: packages/agent/src/agent-loop.ts:201] [E: packages/agent/src/agent-loop.ts:212]

15. `runAgentLoop` 先把显式 `streamFn` 或 `getDefaultStreamFn()` 的结果传入 `runLoop`;`streamAssistantResponse` 是 `agent` 包到 provider stream 的边界:它可先 `transformContext`,再 `convertToLlm`,构造 `Context`,解析 API key,并调用这个已解析的 `streamFunction`。[E: packages/agent/src/agent-loop.ts:117] [E: packages/agent/src/agent-loop.ts:212] [E: packages/agent/src/agent-loop.ts:287] [E: packages/agent/src/agent-loop.ts:289] [E: packages/agent/src/agent-loop.ts:293] [E: packages/agent/src/agent-loop.ts:296] [E: packages/agent/src/agent-loop.ts:303] [E: packages/agent/src/agent-loop.ts:306]

16. assistant stream events 被折叠成 message events:start 会 push partial assistant 并 emit `message_start`,delta 类事件会替换最后一条 context message 并 emit `message_update`,done/error 会取 final message 并 emit `message_end`。[E: packages/agent/src/agent-loop.ts:315] [E: packages/agent/src/agent-loop.ts:318] [E: packages/agent/src/agent-loop.ts:319] [E: packages/agent/src/agent-loop.ts:321] [E: packages/agent/src/agent-loop.ts:333] [E: packages/agent/src/agent-loop.ts:335] [E: packages/agent/src/agent-loop.ts:337] [E: packages/agent/src/agent-loop.ts:346] [E: packages/agent/src/agent-loop.ts:355]

17. assistant message 结束后,`runLoop` 先 emit `turn_end` 并写入 `lastCompletedTurn`。`prepareNextTurn` 只在内层 loop 下一轮开始、且 `lastCompletedTurn` 已设置、即将再 stream 一次 assistant 时调用;error/aborted、`shouldStopAfterTurn`、以及无更多 tool/queue 的出口会直接 emit `agent_end` 而不调用 `prepareNextTurn`。[E: packages/agent/src/agent-loop.ts:176] [E: packages/agent/src/agent-loop.ts:177] [E: packages/agent/src/agent-loop.ts:215] [E: packages/agent/src/agent-loop.ts:243] [E: packages/agent/src/agent-loop.ts:252] [E: packages/agent/src/agent-loop.ts:253] [E: packages/agent/src/agent-loop.ts:257] [E: packages/agent/src/agent-loop.ts:269] [E: packages/agent/src/agent-loop.ts:272]

18. `AgentSession` 在构造时订阅底层 `agent` events,内部 `_handleAgentEvent` 会先更新 queue display state,再发 extension events,再把事件通知 `AgentSession.subscribe` 的 listeners;`message_end` 时它把 user/assistant/toolResult message append 到 session manager。[E: packages/coding-agent/src/core/agent-session.ts:398] [E: packages/coding-agent/src/core/agent-session.ts:639] [E: packages/coding-agent/src/core/agent-session.ts:642] [E: packages/coding-agent/src/core/agent-session.ts:650] [E: packages/coding-agent/src/core/agent-session.ts:656] [E: packages/coding-agent/src/core/agent-session.ts:663] [E: packages/coding-agent/src/core/agent-session.ts:666] [E: packages/coding-agent/src/core/agent-session.ts:669] [E: packages/coding-agent/src/core/agent-session.ts:685]

19. `InteractiveMode.subscribeToAgent()` 通过 `this.session.subscribe` 接收 `AgentSessionEvent`,每个事件交给 `handleEvent`。`message_start` 的 user message 进入 chat,assistant message 创建 `AssistantMessageComponent`;`message_update` 更新 streaming component 并为 tool calls 创建或更新 `ToolExecutionComponent`;`tool_execution_*` 更新工具组件;`agent_end` 清理 progress、loader、streaming component 和 pending tools。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3159] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3160] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3165] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3224] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3225] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3229] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3244] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4249] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3249] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3252] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3270] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3324] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3348] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3351] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3357] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3367] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3369] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3371] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3371] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3373] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3377]

## 关键决策点

### 普通 prompt vs streaming steer

普通 prompt 由 `getUserInput()` 返回给 `run()` loop 后调用 `session.prompt(userInput)`;streaming 期间的 submit 不走这个 awaited loop,而是在 submit handler 里直接调用 `session.prompt(..., { streamingBehavior: "steer" })` 并进入 queue display。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1133] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1135] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3137] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3140]

### product-layer preflight

`AgentSession.prompt` 承担 product-layer 工作:extension command/input interception、skill/template expansion、model/auth validation、compaction precheck、custom messages 和 per-turn system prompt modification 都发生在进入底层 agent run 之前。[E: packages/coding-agent/src/core/agent-session.ts:1183] [E: packages/coding-agent/src/core/agent-session.ts:1201] [E: packages/coding-agent/src/core/agent-session.ts:1213] [E: packages/coding-agent/src/core/agent-session.ts:1214] [E: packages/coding-agent/src/core/agent-session.ts:1215] [E: packages/coding-agent/src/core/agent-session.ts:1239] [E: packages/coding-agent/src/core/agent-session.ts:1143] [E: packages/coding-agent/src/core/agent-session.ts:1261] [E: packages/coding-agent/src/core/agent-session.ts:1286] [E: packages/coding-agent/src/core/agent-session.ts:1293] [E: packages/coding-agent/src/core/agent-session.ts:1307]

### compaction 挡住 tree navigation

`AgentSession.navigateTree()` 在 `isStreaming` 或 `isCompacting` 时 throw,不会排队,也不会返回 `{ cancelled: true }`。`isCompacting` 覆盖 manual/auto compaction 与 branch summarization。[E: packages/coding-agent/src/core/agent-session.ts:984] [E: packages/coding-agent/src/core/agent-session.ts:3140] [E: packages/coding-agent/src/core/agent-session.ts:3143] TUI `/tree` 在 abort 当前 response 后仍会再检查 `isCompacting`,避免替换正在进行的 compaction UI。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5272] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5276]

### event stream vs persistence

一次 turn 的 UI 更新不是 `runAgentLoop` 直接改 TUI,而是 `agent-loop.ts` emit events,`AgentSession._handleAgentEvent` 转发并持久化,`InteractiveMode.handleEvent` 再把事件渲染为 chat/status/tool components。[E: packages/agent/src/agent-loop.ts:110] [E: packages/coding-agent/src/core/agent-session.ts:666] [E: packages/coding-agent/src/core/agent-session.ts:669] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3165] 其中“不是直接改 TUI”是由事件链和 `agent-loop.ts` 本节点证据窗口内不持有 TUI 对象归纳出的边界判断。[I]

## 包边界

`pi-coding-agent` 负责产品装配:interactive UI、slash/bash/compaction/extension handling、auth/model checks、tool registry/system prompt refresh、session persistence 和 extension events 都在 `packages/coding-agent` 的 `InteractiveMode` 与 `AgentSession` 内完成。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2964] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2970] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3106] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3124] [E: packages/coding-agent/src/core/agent-session.ts:1183] [E: packages/coding-agent/src/core/agent-session.ts:1201] [E: packages/coding-agent/src/core/agent-session.ts:1239] [E: packages/coding-agent/src/core/agent-session.ts:1143] [E: packages/coding-agent/src/core/agent-session.ts:1307] [E: packages/coding-agent/src/core/agent-session.ts:2694] [E: packages/coding-agent/src/core/agent-session.ts:663] [E: packages/coding-agent/src/core/agent-session.ts:669] [E: packages/coding-agent/src/core/agent-session.ts:685]

`pi-agent-core` 负责可复用 runtime loop:它接收已经装配好的 context/config/tools/model/streamFn,按 assistant streaming、tool execution、queues 和 stop conditions 推进 turn,但不认识 TUI containers、slash command UI 或 session manager。[E: packages/agent/src/agent-loop.ts:96] [E: packages/agent/src/agent-loop.ts:156] [E: packages/agent/src/agent-loop.ts:279] [I]

## 指向 T1/T2 深挖

- `spine.agent-loop`:低层 `runLoop`、assistant streaming、tool calls、queue drain 和 stop conditions 的权威 T0 说明。
- `surface.modes.interactive`:TUI interactive mode 的 commands、selectors、keybindings、startup UI 和非普通 turn 输入面。
- `subsys.coding-agent.interactive-orchestration`:交互式 TUI 状态、pending containers、extension UI、compaction queue 和事件循环的 T2 细化。

## Sources

- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/agent/src/agent-loop.ts

## 相关

- spine.agent-loop
- surface.modes.interactive
- subsys.coding-agent.interactive-orchestration
