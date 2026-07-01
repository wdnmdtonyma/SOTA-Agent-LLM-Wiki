---
id: surface.modes.print
title: print 单次模式
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/modes/print-mode.ts
  - packages/coding-agent/docs/json.md
  - packages/coding-agent/src/cli/args.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/agent-session-runtime.ts
symbols:
  - runPrintMode
related:
  - surface.cli.overview
  - ref.coding-agent.json-events
evidence: explicit
status: verified
updated: 8c943640
---

> `print` 单次模式是 pi-coding-agent 的非交互运行面:CLI 创建一个 `AgentSessionRuntime`,把初始 prompt 与后续消息送进 `AgentSession`,在 text 模式只打印最终 assistant 文本,在 json 模式按 JSON Lines 输出 session header 与事件流。

## 能回答的问题

- `pi -p`、stdin/stdout 非 TTY、`--mode json` 分别怎样进入单次模式?
- `runPrintMode` 如何发送 `initialMessage`、`initialImages` 和 `messages`?
- text 输出与 json 输出分别写什么到 stdout?
- print/json 模式怎样绑定 extensions,以及 session switch/fork/reload 后怎样重绑?
- 发生 assistant error/aborted、异常、SIGTERM/SIGHUP 时退出码和清理路径是什么?
- `surface.modes.print` 与 `ref.coding-agent.json-events` 的边界在哪里?

## 1 Identity

`runPrintMode(runtimeHost, options)` 是 print 单次模式的权威入口,导出自 `packages/coding-agent/src/modes/print-mode.ts`;它接收 `AgentSessionRuntime` 和 `PrintModeOptions`,返回进程应使用的 numeric exit code [E: packages/coding-agent/src/modes/print-mode.ts:32]. `PrintModeOptions.mode` 只能是 `"text"` 或 `"json"`,可带 `messages`、`initialMessage` 和 `initialImages` [E: packages/coding-agent/src/modes/print-mode.ts:17] [E: packages/coding-agent/src/modes/print-mode.ts:19] [E: packages/coding-agent/src/modes/print-mode.ts:21] [E: packages/coding-agent/src/modes/print-mode.ts:23] [E: packages/coding-agent/src/modes/print-mode.ts:25].

CLI 层的 `Mode` union 是 `"text" | "json" | "rpc"`,而 `runPrintMode` 只覆盖非 RPC 的 `"text"` 与 `"json"` 输出面 [E: packages/coding-agent/src/cli/args.ts:10] [E: packages/coding-agent/src/main.ts:113] [E: packages/coding-agent/src/main.ts:114]. `--mode json` 在应用模式解析中直接返回 `"json"`;`--print`、stdin 非 TTY 或 stdout 非 TTY 会返回 `"print"`;其它情况才进入 `"interactive"` [E: packages/coding-agent/src/main.ts:100] [E: packages/coding-agent/src/main.ts:104] [E: packages/coding-agent/src/main.ts:107] [E: packages/coding-agent/src/main.ts:108] [E: packages/coding-agent/src/main.ts:110].

## 2 CLI 入口与消息准备

`parseArgs` 识别 `--mode` 后只接受 `text/json/rpc` 三个值,其中 `json` 最终走 `runPrintMode(..., { mode: "json" })` 而不是交互 TUI [E: packages/coding-agent/src/cli/args.ts:78] [E: packages/coding-agent/src/cli/args.ts:80] [E: packages/coding-agent/src/cli/args.ts:81] [E: packages/coding-agent/src/main.ts:841] [E: packages/coding-agent/src/main.ts:842]. `--print` / `-p` 会把 `parsed.print` 置 true;如果紧跟的下一个参数不是 `@file` 且不是普通 flag,它会被追加到 `messages` [E: packages/coding-agent/src/cli/args.ts:140] [E: packages/coding-agent/src/cli/args.ts:141] [E: packages/coding-agent/src/cli/args.ts:142] [E: packages/coding-agent/src/cli/args.ts:143] [E: packages/coding-agent/src/cli/args.ts:144].

主入口在非 RPC 模式读取 piped stdin;如果 stdin 有内容且原本准备进 interactive,`appMode` 会被改成 `"print"` [E: packages/coding-agent/src/main.ts:763] [E: packages/coding-agent/src/main.ts:764] [E: packages/coding-agent/src/main.ts:765] [E: packages/coding-agent/src/main.ts:766]. 随后 `prepareInitialMessage(parsed, settingsManager.getImageAutoResize(), stdinContent)` 产出 `initialMessage` 与 `initialImages`,再把 `parsed.messages`、`initialMessage`、`initialImages` 传入 `runPrintMode` [E: packages/coding-agent/src/main.ts:771] [E: packages/coding-agent/src/main.ts:773] [E: packages/coding-agent/src/main.ts:774] [E: packages/coding-agent/src/main.ts:841] [E: packages/coding-agent/src/main.ts:843] [E: packages/coding-agent/src/main.ts:844] [E: packages/coding-agent/src/main.ts:845].

## 3 runPrintMode 控制流

`runPrintMode` 启动后保存当前 `runtimeHost.session`,注册 signal handlers,再通过 `runtimeHost.setRebindSession(...)` 让 runtime 在 switch/new/fork 等 session replacement 后重新执行本地 `rebindSession()` [E: packages/coding-agent/src/modes/print-mode.ts:35] [E: packages/coding-agent/src/modes/print-mode.ts:47] [E: packages/coding-agent/src/modes/print-mode.ts:65] [E: packages/coding-agent/src/modes/print-mode.ts:67] [E: packages/coding-agent/src/core/agent-session-runtime.ts:117] [E: packages/coding-agent/src/core/agent-session-runtime.ts:118]. `AgentSessionRuntime.finishSessionReplacement()` 会在替换 session 后调用已设置的 `rebindSession`,所以 print/json 的 extension binding 与 event subscription 会跟随新 session 更新 [E: packages/coding-agent/src/core/agent-session-runtime.ts:184] [E: packages/coding-agent/src/core/agent-session-runtime.ts:185] [E: packages/coding-agent/src/core/agent-session-runtime.ts:186].

每次 `rebindSession()` 会重新读取 `runtimeHost.session`,调用 `session.bindExtensions(...)`,并把 extension mode 设为 `"json"` 或 `"print"` [E: packages/coding-agent/src/modes/print-mode.ts:71] [E: packages/coding-agent/src/modes/print-mode.ts:72] [E: packages/coding-agent/src/modes/print-mode.ts:73] [E: packages/coding-agent/src/modes/print-mode.ts:74]. 绑定还提供 `waitForIdle`、`newSession`、`fork`、`navigateTree`、`switchSession`、`reload` 等 command context actions,使非交互模式中的扩展命令仍能驱动会话操作 [E: packages/coding-agent/src/modes/print-mode.ts:75] [E: packages/coding-agent/src/modes/print-mode.ts:76] [E: packages/coding-agent/src/modes/print-mode.ts:77] [E: packages/coding-agent/src/modes/print-mode.ts:78] [E: packages/coding-agent/src/modes/print-mode.ts:82] [E: packages/coding-agent/src/modes/print-mode.ts:91] [E: packages/coding-agent/src/modes/print-mode.ts:94]. `AgentSession.bindExtensions()` 会把这些 bindings 应用到 extension runner,发出 session start event,再让扩展发现 skills/prompts/themes 等资源 [E: packages/coding-agent/src/core/agent-session.ts:2116] [E: packages/coding-agent/src/core/agent-session.ts:2136] [E: packages/coding-agent/src/core/agent-session.ts:2137] [E: packages/coding-agent/src/core/agent-session.ts:2138].

实际发送消息时,`initialMessage` 若存在会先以 `{ images: initialImages }` 调 `session.prompt(...)`;随后 `messages` 数组按顺序逐条调用 `session.prompt(message)` [E: packages/coding-agent/src/modes/print-mode.ts:121] [E: packages/coding-agent/src/modes/print-mode.ts:122] [E: packages/coding-agent/src/modes/print-mode.ts:125] [E: packages/coding-agent/src/modes/print-mode.ts:126]. `AgentSession.prompt()` 不是裸转发:它会先处理扩展命令、input hook、skill command/prompt template 展开等 session 层行为,最后在构造用户消息后调用 `_runAgentPrompt()`,由其调 `agent.prompt()` 并处理可能的 retry/compaction/queued continuation [E: packages/coding-agent/src/core/agent-session.ts:1025] [E: packages/coding-agent/src/core/agent-session.ts:1033] [E: packages/coding-agent/src/core/agent-session.ts:1045] [E: packages/coding-agent/src/core/agent-session.ts:1065] [E: packages/coding-agent/src/core/agent-session.ts:1066] [E: packages/coding-agent/src/core/agent-session.ts:1170] [E: packages/coding-agent/src/core/agent-session.ts:1171] [E: packages/coding-agent/src/core/agent-session.ts:974] [E: packages/coding-agent/src/core/agent-session.ts:976] [E: packages/coding-agent/src/core/agent-session.ts:977].

## 4 text 输出

text 模式不流式输出中间事件;它在所有 prompt 完成后读取 `session.state.messages` 的最后一条消息,只在最后一条是 assistant 时处理输出 [E: packages/coding-agent/src/modes/print-mode.ts:129] [E: packages/coding-agent/src/modes/print-mode.ts:130] [E: packages/coding-agent/src/modes/print-mode.ts:131] [E: packages/coding-agent/src/modes/print-mode.ts:133]. 如果 assistant `stopReason` 是 `"error"` 或 `"aborted"`,print mode 把 `errorMessage` 或 fallback 文案写到 stderr,并把 exit code 设为 1 [E: packages/coding-agent/src/modes/print-mode.ts:135] [E: packages/coding-agent/src/modes/print-mode.ts:136] [E: packages/coding-agent/src/modes/print-mode.ts:137]. 否则它遍历 assistant content,只把 `content.type === "text"` 的文本块各自追加换行写到 raw stdout [E: packages/coding-agent/src/modes/print-mode.ts:139] [E: packages/coding-agent/src/modes/print-mode.ts:140] [E: packages/coding-agent/src/modes/print-mode.ts:141].

text 模式因此是“最终 assistant 文本抽取器”,不是 event stream,也不直接渲染 tool call UI、thinking UI 或 session metadata [I]. 如果最后一条消息不是 assistant,源码没有显式报错或 fallback 输出,函数会保持当前 exit code 返回 [E: packages/coding-agent/src/modes/print-mode.ts:129] [E: packages/coding-agent/src/modes/print-mode.ts:148].

## 5 json 输出

json 模式在 rebind 与 prompt 前先读取 `session.sessionManager.getHeader()`,若 header 存在就把它序列化为一行 JSON 写到 stdout [E: packages/coding-agent/src/modes/print-mode.ts:111] [E: packages/coding-agent/src/modes/print-mode.ts:112] [E: packages/coding-agent/src/modes/print-mode.ts:113] [E: packages/coding-agent/src/modes/print-mode.ts:114] [E: packages/coding-agent/src/modes/print-mode.ts:115]. `packages/coding-agent/docs/json.md` 把 JSON 模式描述为每行一个 JSON object,第一行是 session header,随后是事件对象 [E: packages/coding-agent/docs/json.md:58] [E: packages/coding-agent/docs/json.md:60] [E: packages/coding-agent/docs/json.md:66].

`rebindSession()` 会在 json 模式注册 `session.subscribe(...)` listener,每个 `AgentSessionEvent` 都经 `JSON.stringify(event)` 加换行写到 raw stdout [E: packages/coding-agent/src/modes/print-mode.ts:103] [E: packages/coding-agent/src/modes/print-mode.ts:104] [E: packages/coding-agent/src/modes/print-mode.ts:105] [E: packages/coding-agent/src/modes/print-mode.ts:106]. `AgentSession.subscribe()` 只是把 listener 放入 `_eventListeners`,内部 `_emit(event)` 会调用所有 listener;`_handleAgentEvent` 在发给 extensions 后把 agent event 或带 `willRetry` 的 `agent_end` 发给普通 listener [E: packages/coding-agent/src/core/agent-session.ts:718] [E: packages/coding-agent/src/core/agent-session.ts:719] [E: packages/coding-agent/src/core/agent-session.ts:496] [E: packages/coding-agent/src/core/agent-session.ts:497] [E: packages/coding-agent/src/core/agent-session.ts:538] [E: packages/coding-agent/src/core/agent-session.ts:541].

本节点只说明 json 输出如何被 print mode 启动和写出;事件类型全集属于 [ref.coding-agent.json-events](../../reference/json-events.md). 当前源码中的 `AgentSessionEvent` 扩展了 core `AgentEvent`,并额外包含 `queue_update`、`compaction_start`、`session_info_changed`、`thinking_level_changed`、`compaction_end`、`auto_retry_start`、`auto_retry_end`,且 `agent_end` 带 `willRetry` [E: packages/coding-agent/src/core/agent-session.ts:127] [E: packages/coding-agent/src/core/agent-session.ts:128] [E: packages/coding-agent/src/core/agent-session.ts:130] [E: packages/coding-agent/src/core/agent-session.ts:132] [E: packages/coding-agent/src/core/agent-session.ts:135] [E: packages/coding-agent/src/core/agent-session.ts:139] [E: packages/coding-agent/src/core/agent-session.ts:140] [E: packages/coding-agent/src/core/agent-session.ts:141] [E: packages/coding-agent/src/core/agent-session.ts:143] [E: packages/coding-agent/src/core/agent-session.ts:150] [E: packages/coding-agent/src/core/agent-session.ts:151].

## 6 退出、signal 与清理

`runPrintMode` 对 `SIGTERM` 注册 handler,非 Windows 还注册 `SIGHUP`;handler 会先 `killTrackedDetachedChildren()`,再 dispose runtime,最后按 signal 退出为 143 或 129 [E: packages/coding-agent/src/modes/print-mode.ts:48] [E: packages/coding-agent/src/modes/print-mode.ts:49] [E: packages/coding-agent/src/modes/print-mode.ts:50] [E: packages/coding-agent/src/modes/print-mode.ts:55] [E: packages/coding-agent/src/modes/print-mode.ts:56] [E: packages/coding-agent/src/modes/print-mode.ts:57]. 普通异常会被 catch,错误消息写 stderr,函数返回 1 [E: packages/coding-agent/src/modes/print-mode.ts:149] [E: packages/coding-agent/src/modes/print-mode.ts:150] [E: packages/coding-agent/src/modes/print-mode.ts:151].

finally 分支总会移除 signal handlers、dispose runtime、flush raw stdout [E: packages/coding-agent/src/modes/print-mode.ts:152] [E: packages/coding-agent/src/modes/print-mode.ts:153] [E: packages/coding-agent/src/modes/print-mode.ts:154] [E: packages/coding-agent/src/modes/print-mode.ts:156] [E: packages/coding-agent/src/modes/print-mode.ts:157]. `disposeRuntime()` 自身是幂等的:它检查 `disposed`,取消 event subscription,再调用 `runtimeHost.dispose()` [E: packages/coding-agent/src/modes/print-mode.ts:40] [E: packages/coding-agent/src/modes/print-mode.ts:41] [E: packages/coding-agent/src/modes/print-mode.ts:42] [E: packages/coding-agent/src/modes/print-mode.ts:43] [E: packages/coding-agent/src/modes/print-mode.ts:44].

## 7 跨包关系

[surface.cli.overview](../cli/overview.md) 覆盖 `parseArgs`、help 文案、`resolveAppMode`、session/runtime 创建等 CLI 总入口;本节点只覆盖该入口落到 `runPrintMode` 后的非交互 I/O 行为。`runPrintMode` 所用的 `AgentSessionRuntime` 和 `AgentSession` 属于 `pi-coding-agent` 产品层,而真正的 agent loop、tool execution 与 provider streaming 在更底层的 agent/ai 包执行;本节点只把它们作为 `session.prompt()` 的下游效果引用 [I].

[ref.coding-agent.json-events](../../reference/json-events.md) 应逐项枚举 JSON Lines 中可能出现的 event shape;本节点只说明 json 模式在哪里订阅事件、怎样序列化事件,以及为什么第一行可能是 session header。

## Sources

- packages/coding-agent/src/modes/print-mode.ts
- packages/coding-agent/docs/json.md
- packages/coding-agent/src/cli/args.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/agent-session-runtime.ts

## 相关

- [surface.cli.overview](../cli/overview.md)
- [ref.coding-agent.json-events](../../reference/json-events.md)
