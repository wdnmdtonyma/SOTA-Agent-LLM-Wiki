---
id: spine.trace-interactive-turn
title: trace:一次交互式 turn 端到端
kind: flow
tier: T0
pkg: cross
source: [packages/coding-agent/src/modes/interactive/interactive-mode.ts, packages/coding-agent/src/core/agent-session.ts, packages/agent/src/agent-loop.ts]
symbols: [InteractiveMode, AgentSession.prompt, runAgentLoop]
related: [spine.agent-loop, surface.modes.interactive, subsys.coding-agent.interactive-orchestration]
evidence: explicit
status: verified
updated: 3da591ab
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
  V -- "no" --> Y["turn_end"]
  W --> Y
  Y --> Z["prepareNextTurn / shouldStopAfterTurn / queues"]
  Z --> AA["agent_end"]
  R --> AB["AgentSession._handleAgentEvent"]
  U --> AB
  W --> AB
  AA --> AB
  AB --> AC["InteractiveMode.handleEvent updates chat/status/tool UI"]
```

## 端到端步骤

1. `InteractiveMode` 是 `coding-agent` 的 TUI orchestrator:构造函数保存 `AgentSessionRuntime`,创建 `TUI`,并准备 `chatContainer`、`pendingMessagesContainer`、`statusContainer` 等 UI containers。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:442] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:452] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:456] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:457] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:458]

2. `init()` 阶段把 editor submit handler 和 key handlers 挂到默认 editor,启动 TUI,然后 rebind 当前 session,所以 interactive turn 的输入与 session events 都在 UI 已启动后工作。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:715] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:716] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:719] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:787]

3. `InteractiveMode.run()` 是主入口:它先 `await this.init()`,再处理 startup initial messages,最后进入无限循环,每轮 `await this.getUserInput()` 后调用 `this.session.prompt(userInput)`。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:825] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:826] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:876] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:878] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:885] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:888] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:897] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:898] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:900]

4. `getUserInput()` 不是直接读 terminal;它先消费 `pendingUserInputs`,否则创建一个 Promise 并把 resolver 放进 `onInputCallback`。这让 editor submit handler 可以把 UI callback 转成 `run()` loop 里的 awaited text。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3442] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3443] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3448] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3449]

5. editor submit handler 先 trim 空输入,再处理 slash commands、bash、compaction、streaming 这些 side paths;只有普通文本会进入 normal message submission 分支。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2621] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2623] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2627] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2757] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2775] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2788] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2799]

6. 普通文本提交会先把 pending bash components 从 pending area 移到 chat,然后如果 `getUserInput()` 正在等待就调用 `onInputCallback(text)`,否则把 text 放进 `pendingUserInputs`;最后把 text 加入 editor history。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2799] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2801] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2802] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2804] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2806]

7. 如果提交发生在 agent streaming 中,`InteractiveMode` 不等待当前 run 结束再普通 submit,而是调用 `this.session.prompt(text, { streamingBehavior: "steer" })`,随后刷新 pending messages display。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2788] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2791] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2792] `AgentSession.prompt` 对 streaming prompt 要求显式 `streamingBehavior`,并按 `"followUp"` 或 `"steer"` 分别进入 `_queueFollowUp` 或 `_queueSteer`。[E: packages/coding-agent/src/core/agent-session.ts:1147] [E: packages/coding-agent/src/core/agent-session.ts:1148] [E: packages/coding-agent/src/core/agent-session.ts:1153] [E: packages/coding-agent/src/core/agent-session.ts:1154] [E: packages/coding-agent/src/core/agent-session.ts:1156]

8. `AgentSession.prompt` 先处理 extension command:当输入以 `/` 开头且匹配扩展命令时,命令 handler 自己负责后续 LLM interaction,当前 prompt 直接返回。[E: packages/coding-agent/src/core/agent-session.ts:1110] [E: packages/coding-agent/src/core/agent-session.ts:1111] [E: packages/coding-agent/src/core/agent-session.ts:1112] [E: packages/coding-agent/src/core/agent-session.ts:1114] [E: packages/coding-agent/src/core/agent-session.ts:1115]

9. 没被 extension command 吃掉的输入会经过 extension input hooks;hook 可以 `handled` 直接结束,也可以 `transform` text/images,并且 source 默认是 `"interactive"`。[E: packages/coding-agent/src/core/agent-session.ts:1122] [E: packages/coding-agent/src/core/agent-session.ts:1123] [E: packages/coding-agent/src/core/agent-session.ts:1126] [E: packages/coding-agent/src/core/agent-session.ts:1129] [E: packages/coding-agent/src/core/agent-session.ts:1133] [E: packages/coding-agent/src/core/agent-session.ts:1134]

10. 正常 prompt 在非 streaming 路径会 flush pending bash messages,校验当前 model 存在且 auth 已配置,并在必要时先对上一条 assistant message 做 compaction/continue 处理。[E: packages/coding-agent/src/core/agent-session.ts:1163] [E: packages/coding-agent/src/core/agent-session.ts:1166] [E: packages/coding-agent/src/core/agent-session.ts:1090] [E: packages/coding-agent/src/core/agent-session.ts:1187] [E: packages/coding-agent/src/core/agent-session.ts:1188] [E: packages/coding-agent/src/core/agent-session.ts:1189]

11. `AgentSession.prompt` 把 expanded text 变成 `role: "user"` 的 `AgentMessage`,附加 images 和 `_pendingNextTurnMessages`,再触发 `before_agent_start` extension event;extension 可以添加 custom messages 或覆盖本 turn 的 system prompt。[E: packages/coding-agent/src/core/agent-session.ts:1193] [E: packages/coding-agent/src/core/agent-session.ts:1196] [E: packages/coding-agent/src/core/agent-session.ts:1197] [E: packages/coding-agent/src/core/agent-session.ts:1198] [E: packages/coding-agent/src/core/agent-session.ts:1200] [E: packages/coding-agent/src/core/agent-session.ts:1207] [E: packages/coding-agent/src/core/agent-session.ts:1208] [E: packages/coding-agent/src/core/agent-session.ts:1213] [E: packages/coding-agent/src/core/agent-session.ts:1220] [E: packages/coding-agent/src/core/agent-session.ts:1234]

12. preflight 成功后,`AgentSession.prompt` 调用 `_runAgentPrompt(messages)`;`_runAgentPrompt` 调用 `this.agent.prompt(messages)`,并在每次 run 后用 `_handlePostAgentRun()` 决定是否 `agent.continue()` 以处理 retry、compaction 或 agent_end extension handlers 新排入的 queued messages。[E: packages/coding-agent/src/core/agent-session.ts:1251] [E: packages/coding-agent/src/core/agent-session.ts:1252] [E: packages/coding-agent/src/core/agent-session.ts:1049] [E: packages/coding-agent/src/core/agent-session.ts:1052] [E: packages/coding-agent/src/core/agent-session.ts:1053] [E: packages/coding-agent/src/core/agent-session.ts:1054] [E: packages/coding-agent/src/core/agent-session.ts:1070] [E: packages/coding-agent/src/core/agent-session.ts:1084] [E: packages/coding-agent/src/core/agent-session.ts:1090]

13. `AgentSession` 到 `runAgentLoop` 的直接中间 call site 在 stateful `Agent` 包装器内,不在本节点 index 的三份 source 列中;本 trace 只把 `this.agent.prompt(messages)` 到 `runAgentLoop(prompts, context, config, emit, streamFn)` 作为跨文件桥接推断,不把它标成 explicit evidence。[I] `runAgentLoop` 本身接收 prompts、context、config、emit、signal、streamFn,把 prompts 放进 `newMessages` 与 `currentContext.messages`,然后发 `agent_start`、`turn_start`、每条 prompt 的 `message_start`/`message_end`。[E: packages/agent/src/agent-loop.ts:95] [E: packages/agent/src/agent-loop.ts:96] [E: packages/agent/src/agent-loop.ts:97] [E: packages/agent/src/agent-loop.ts:98] [E: packages/agent/src/agent-loop.ts:99] [E: packages/agent/src/agent-loop.ts:100] [E: packages/agent/src/agent-loop.ts:101] [E: packages/agent/src/agent-loop.ts:103] [E: packages/agent/src/agent-loop.ts:106] [E: packages/agent/src/agent-loop.ts:109] [E: packages/agent/src/agent-loop.ts:110] [E: packages/agent/src/agent-loop.ts:112] [E: packages/agent/src/agent-loop.ts:113]

14. `runLoop` 是低层 turn engine:它先读取 steering messages,在内层 loop 注入 pending messages,然后调用 `streamAssistantResponse` 产生 assistant message。[E: packages/agent/src/agent-loop.ts:155] [E: packages/agent/src/agent-loop.ts:167] [E: packages/agent/src/agent-loop.ts:174] [E: packages/agent/src/agent-loop.ts:182] [E: packages/agent/src/agent-loop.ts:193]

15. `streamAssistantResponse` 是 `agent` 包到 provider stream 的边界:它可先 `transformContext`,再 `convertToLlm`,构造 `Context`,解析 API key,并调用 `streamFn || streamSimple`。[E: packages/agent/src/agent-loop.ts:289] [E: packages/agent/src/agent-loop.ts:291] [E: packages/agent/src/agent-loop.ts:295] [E: packages/agent/src/agent-loop.ts:298] [E: packages/agent/src/agent-loop.ts:304] [E: packages/agent/src/agent-loop.ts:307] [E: packages/agent/src/agent-loop.ts:310]

16. assistant stream events 被折叠成 message events:start 会 push partial assistant 并 emit `message_start`,delta 类事件会替换最后一条 context message 并 emit `message_update`,done/error 会取 final message 并 emit `message_end`。[E: packages/agent/src/agent-loop.ts:319] [E: packages/agent/src/agent-loop.ts:322] [E: packages/agent/src/agent-loop.ts:323] [E: packages/agent/src/agent-loop.ts:325] [E: packages/agent/src/agent-loop.ts:337] [E: packages/agent/src/agent-loop.ts:339] [E: packages/agent/src/agent-loop.ts:341] [E: packages/agent/src/agent-loop.ts:350] [E: packages/agent/src/agent-loop.ts:359]

17. assistant message 结束后,`runLoop` 根据 stop reason、tool calls、tool results、`prepareNextTurn`、`shouldStopAfterTurn`、steering queue 和 follow-up queue 决定继续下一次 provider request 还是 emit `agent_end`。[E: packages/agent/src/agent-loop.ts:196] [E: packages/agent/src/agent-loop.ts:203] [E: packages/agent/src/agent-loop.ts:214] [E: packages/agent/src/agent-loop.ts:224] [E: packages/agent/src/agent-loop.ts:232] [E: packages/agent/src/agent-loop.ts:247] [E: packages/agent/src/agent-loop.ts:259] [E: packages/agent/src/agent-loop.ts:263] [E: packages/agent/src/agent-loop.ts:274]

18. `AgentSession` 在构造时订阅底层 `agent` events,内部 `_handleAgentEvent` 会先更新 queue display state,再发 extension events,再把事件通知 `AgentSession.subscribe` 的 listeners;`message_end` 时它把 user/assistant/toolResult message append 到 session manager。[E: packages/coding-agent/src/core/agent-session.ts:374] [E: packages/coding-agent/src/core/agent-session.ts:574] [E: packages/coding-agent/src/core/agent-session.ts:577] [E: packages/coding-agent/src/core/agent-session.ts:585] [E: packages/coding-agent/src/core/agent-session.ts:591] [E: packages/coding-agent/src/core/agent-session.ts:598] [E: packages/coding-agent/src/core/agent-session.ts:601] [E: packages/coding-agent/src/core/agent-session.ts:604] [E: packages/coding-agent/src/core/agent-session.ts:620]

19. `InteractiveMode.subscribeToAgent()` 通过 `this.session.subscribe` 接收 `AgentSessionEvent`,每个事件交给 `handleEvent`。`message_start` 的 user message 进入 chat,assistant message 创建 `AssistantMessageComponent`;`message_update` 更新 streaming component 并为 tool calls 创建或更新 `ToolExecutionComponent`;`tool_execution_*` 更新工具组件;`agent_end` 清理 progress、loader、streaming component 和 pending tools。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2810] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2811] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2816] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2876] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2877] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2881] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2895] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2898] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2900] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2903] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2921] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2970] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2994] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2997] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3003] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3013] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3015] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3017] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3017] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3019] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3023]

## 关键决策点

### 普通 prompt vs streaming steer

普通 prompt 由 `getUserInput()` 返回给 `run()` loop 后调用 `session.prompt(userInput)`;streaming 期间的 submit 不走这个 awaited loop,而是在 submit handler 里直接调用 `session.prompt(..., { streamingBehavior: "steer" })` 并进入 queue display。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:898] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:900] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2788] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2791]

### product-layer preflight

`AgentSession.prompt` 承担 product-layer 工作:extension command/input interception、skill/template expansion、model/auth validation、compaction precheck、custom messages 和 per-turn system prompt modification 都发生在进入底层 agent run 之前。[E: packages/coding-agent/src/core/agent-session.ts:1110] [E: packages/coding-agent/src/core/agent-session.ts:1122] [E: packages/coding-agent/src/core/agent-session.ts:1141] [E: packages/coding-agent/src/core/agent-session.ts:1142] [E: packages/coding-agent/src/core/agent-session.ts:1143] [E: packages/coding-agent/src/core/agent-session.ts:1166] [E: packages/coding-agent/src/core/agent-session.ts:1090] [E: packages/coding-agent/src/core/agent-session.ts:1188] [E: packages/coding-agent/src/core/agent-session.ts:1213] [E: packages/coding-agent/src/core/agent-session.ts:1220] [E: packages/coding-agent/src/core/agent-session.ts:1234]

### event stream vs persistence

一次 turn 的 UI 更新不是 `runAgentLoop` 直接改 TUI,而是 `agent-loop.ts` emit events,`AgentSession._handleAgentEvent` 转发并持久化,`InteractiveMode.handleEvent` 再把事件渲染为 chat/status/tool components。[E: packages/agent/src/agent-loop.ts:109] [E: packages/coding-agent/src/core/agent-session.ts:601] [E: packages/coding-agent/src/core/agent-session.ts:604] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2816] 其中“不是直接改 TUI”是由事件链和 `agent-loop.ts` 本节点证据窗口内不持有 TUI 对象归纳出的边界判断。[I]

## 包边界

`pi-coding-agent` 负责产品装配:interactive UI、slash/bash/compaction/extension handling、auth/model checks、tool registry/system prompt refresh、session persistence 和 extension events 都在 `packages/coding-agent` 的 `InteractiveMode` 与 `AgentSession` 内完成。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2621] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2627] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2757] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2775] [E: packages/coding-agent/src/core/agent-session.ts:1110] [E: packages/coding-agent/src/core/agent-session.ts:1122] [E: packages/coding-agent/src/core/agent-session.ts:1166] [E: packages/coding-agent/src/core/agent-session.ts:1090] [E: packages/coding-agent/src/core/agent-session.ts:1234] [E: packages/coding-agent/src/core/agent-session.ts:2434] [E: packages/coding-agent/src/core/agent-session.ts:598] [E: packages/coding-agent/src/core/agent-session.ts:604] [E: packages/coding-agent/src/core/agent-session.ts:620]

`pi-agent-core` 负责可复用 runtime loop:它接收已经装配好的 context/config/tools/model/streamFn,按 assistant streaming、tool execution、queues 和 stop conditions 推进 turn,但不认识 TUI containers、slash command UI 或 session manager。[E: packages/agent/src/agent-loop.ts:95] [E: packages/agent/src/agent-loop.ts:155] [E: packages/agent/src/agent-loop.ts:281] [I]

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
