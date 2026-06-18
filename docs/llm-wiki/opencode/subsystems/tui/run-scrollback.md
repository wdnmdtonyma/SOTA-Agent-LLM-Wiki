---
id: tui.run-scrollback
title: opencode run split-footer scrollback
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/cli/cmd/run/]
symbols: [runInteractiveRuntime, runInteractiveLocalMode, runInteractiveMode, createRuntimeLifecycle, runPromptQueue, RunFooter, RunScrollbackStream, createSessionTransport]
related: [tui.runtime-hosting, tui.prompt, tui.keybindings]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> `opencode run --interactive` 有一套独立于 full TUI 的第二运行时：OpenTUI split-footer renderer 把 transcript 写入 immutable scrollback，把 prompt/status/permission/question 留在 mutable footer。

## 能回答的问题

- `run --interactive` 为什么不是复用 `packages/tui/src/app.tsx`？
- split-footer lifecycle 如何创建 renderer、splash、footer 和 keymap？
- prompt queue 如何串行化 turn、处理 `/new`、`/exit` 和 queued prompts？
- SDK event stream 如何 reduce 成 scrollback commits 与 footer patches？
- streaming markdown/code/text 如何稳定写入 terminal scrollback？

## Runtime 边界

`runtime.ts` 的 top-level orchestration 角色来自源码调用面：`runInteractiveRuntime()` 负责 boot、lifecycle、stream transport 与 prompt queue；两个入口 `runInteractiveLocalMode()` 与 `runInteractiveMode()` 都委托 `runInteractiveRuntime()`。[E: packages/opencode/src/cli/cmd/run/runtime.ts:181] [E: packages/opencode/src/cli/cmd/run/runtime.ts:184] [E: packages/opencode/src/cli/cmd/run/runtime.ts:185] [E: packages/opencode/src/cli/cmd/run/runtime.ts:228] [E: packages/opencode/src/cli/cmd/run/runtime.ts:456] [E: packages/opencode/src/cli/cmd/run/runtime.ts:543] [E: packages/opencode/src/cli/cmd/run/runtime.ts:735] [E: packages/opencode/src/cli/cmd/run/runtime.ts:743] [E: packages/opencode/src/cli/cmd/run/runtime.ts:787] [E: packages/opencode/src/cli/cmd/run/runtime.ts:791] [I]

这个节点 `v: v1`，因为代码在 `packages/opencode/src/cli/cmd/run/`，并引用 V1 host 的 session schema；但 prompt turn 与 session transport 通过 generated SDK client 与 server 通信。“不是直接调用 session processor”是基于本节点 source imports/调用面的审计结论。[E: packages/opencode/src/cli/cmd/run/runtime.ts:15] [E: packages/opencode/src/cli/cmd/run/runtime.ts:17] [E: packages/opencode/src/cli/cmd/run/types.ts:14] [I]

## 数据模型

`types.ts` 的 direct mode 是两 lane 模型：`FooterView` 只允许 prompt/permission/question 三种 mutable footer view，`StreamCommit` 表示 append-only scrollback commit；数据流“SDK events -> reducer -> commits/footer output -> footer API -> renderer”来自 source file 之间的类型与调用关系。[E: packages/opencode/src/cli/cmd/run/types.ts:173] [E: packages/opencode/src/cli/cmd/run/types.ts:174] [E: packages/opencode/src/cli/cmd/run/types.ts:175] [E: packages/opencode/src/cli/cmd/run/types.ts:176] [E: packages/opencode/src/cli/cmd/run/types.ts:214] [E: packages/opencode/src/cli/cmd/run/types.ts:215] [E: packages/opencode/src/cli/cmd/run/types.ts:216] [E: packages/opencode/src/cli/cmd/run/types.ts:217] [E: packages/opencode/src/cli/cmd/run/types.ts:303] [E: packages/opencode/src/cli/cmd/run/footer.ts:301] [E: packages/opencode/src/cli/cmd/run/footer.ts:306] [E: packages/opencode/src/cli/cmd/run/footer.ts:348] [I]

`RunPrompt` 是 prompt queue 的输入，包含 optional messageID/partID、text、parts、`mode?: "shell"`、optional command `{ name, arguments }`。[E: packages/opencode/src/cli/cmd/run/types.ts:33] [E: packages/opencode/src/cli/cmd/run/types.ts:34] [E: packages/opencode/src/cli/cmd/run/types.ts:35] [E: packages/opencode/src/cli/cmd/run/types.ts:36] [E: packages/opencode/src/cli/cmd/run/types.ts:37] [E: packages/opencode/src/cli/cmd/run/types.ts:38] [E: packages/opencode/src/cli/cmd/run/types.ts:39] [E: packages/opencode/src/cli/cmd/run/types.ts:40] [E: packages/opencode/src/cli/cmd/run/types.ts:41] `FooterState` 是 status line snapshot，包含 phase/status/queue/model/duration/usage/first/interrupt/exit。[E: packages/opencode/src/cli/cmd/run/types.ts:83] [E: packages/opencode/src/cli/cmd/run/types.ts:84] [E: packages/opencode/src/cli/cmd/run/types.ts:85] [E: packages/opencode/src/cli/cmd/run/types.ts:86] [E: packages/opencode/src/cli/cmd/run/types.ts:87] [E: packages/opencode/src/cli/cmd/run/types.ts:88] [E: packages/opencode/src/cli/cmd/run/types.ts:89] [E: packages/opencode/src/cli/cmd/run/types.ts:90] [E: packages/opencode/src/cli/cmd/run/types.ts:91] [E: packages/opencode/src/cli/cmd/run/types.ts:92] `StreamCommit` 是 append-only scrollback commit，包含 kind/text/phase/source/messageID/partID/tool/shell 等字段。[E: packages/opencode/src/cli/cmd/run/types.ts:303] [E: packages/opencode/src/cli/cmd/run/types.ts:304] [E: packages/opencode/src/cli/cmd/run/types.ts:305] [E: packages/opencode/src/cli/cmd/run/types.ts:306] [E: packages/opencode/src/cli/cmd/run/types.ts:307] [E: packages/opencode/src/cli/cmd/run/types.ts:309] [E: packages/opencode/src/cli/cmd/run/types.ts:310] [E: packages/opencode/src/cli/cmd/run/types.ts:311] [E: packages/opencode/src/cli/cmd/run/types.ts:316] [E: packages/opencode/src/cli/cmd/run/types.ts:317] [E: packages/opencode/src/cli/cmd/run/types.ts:318]

`FooterApi` 是 queue/transport 到 footer 的边界，提供 `onPrompt`、`onQueuedRemove`、`onClose`、`event`、`append`、`idle`、`close`、`destroy`；queue 与 transport 通过这个 interface 更新 footer 而不是直接触 renderer，是从 `FooterApi` 字段与调用点推出的。[E: packages/opencode/src/cli/cmd/run/types.ts:340] [E: packages/opencode/src/cli/cmd/run/types.ts:341] [E: packages/opencode/src/cli/cmd/run/types.ts:342] [E: packages/opencode/src/cli/cmd/run/types.ts:343] [E: packages/opencode/src/cli/cmd/run/types.ts:344] [E: packages/opencode/src/cli/cmd/run/types.ts:345] [E: packages/opencode/src/cli/cmd/run/types.ts:346] [E: packages/opencode/src/cli/cmd/run/types.ts:347] [E: packages/opencode/src/cli/cmd/run/types.ts:348] [E: packages/opencode/src/cli/cmd/run/types.ts:349] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:190] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:204] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:737] [I]

## Lifecycle

`createRuntimeLifecycle()` 创建 OpenTUI `CliRenderer`，配置 targetFps 30/maxFps 60、useMouse false、exitOnCtrlC false、screenMode `split-footer`、footerHeight 4、externalOutputMode `capture-stdout`、console disabled、clearOnShutdown false。[E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:176] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:181] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:183] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:184] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:185] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:188] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:190] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:191] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:192] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:193] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:194]

Lifecycle 解析 run theme、设置 renderer background、创建 OpenTUI default keymap 并注册 opencode keymap，然后写 entry splash 到 scrollback，再构造 `RunFooter`。[E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:196] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:197] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:198] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:199] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:215] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:232]

SIGINT handler 调 `footer.requestExit()`；打开 external editor 时临时 detach SIGINT，并在 editor 返回后 attach 回来。[E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:282] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:290] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:264] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:275]

关闭顺序是 footer idle、可选 exit splash、`footer.close()`、footer idle、`footer.destroy()`、unregister keymap、shutdown renderer、必要时写 newline、cleanup stdin。[E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:320] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:322] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:338] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:341] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:342] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:343] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:344] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:345] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:347] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:349]

## Orchestrator

`runInteractiveRuntime()` 先启动 TUI config promise，随后等待 `input.boot()`；boot 完成后启动 model/session/saved-variant tasks，并用 config/session/savedVariant 构造 state。files 只在第一轮 prompt include，之后 `includeFiles = false`。[E: packages/opencode/src/cli/cmd/run/runtime.ts:181] [E: packages/opencode/src/cli/cmd/run/runtime.ts:184] [E: packages/opencode/src/cli/cmd/run/runtime.ts:185] [E: packages/opencode/src/cli/cmd/run/runtime.ts:186] [E: packages/opencode/src/cli/cmd/run/runtime.ts:187] [E: packages/opencode/src/cli/cmd/run/runtime.ts:195] [E: packages/opencode/src/cli/cmd/run/runtime.ts:196] [E: packages/opencode/src/cli/cmd/run/runtime.ts:197] [E: packages/opencode/src/cli/cmd/run/runtime.ts:537] [E: packages/opencode/src/cli/cmd/run/runtime.ts:667]

创建 lifecycle 时传入 permission/question reply handlers、model/variant callbacks、interrupt/background/subagent callbacks；interrupt 调 SDK `session.abort`，background 调 `experimental.session.background`。[E: packages/opencode/src/cli/cmd/run/runtime.ts:228] [E: packages/opencode/src/cli/cmd/run/runtime.ts:247] [E: packages/opencode/src/cli/cmd/run/runtime.ts:255] [E: packages/opencode/src/cli/cmd/run/runtime.ts:269] [E: packages/opencode/src/cli/cmd/run/runtime.ts:284] [E: packages/opencode/src/cli/cmd/run/runtime.ts:318] [E: packages/opencode/src/cli/cmd/run/runtime.ts:340] [E: packages/opencode/src/cli/cmd/run/runtime.ts:347] [E: packages/opencode/src/cli/cmd/run/runtime.ts:355] [E: packages/opencode/src/cli/cmd/run/runtime.ts:357] [E: packages/opencode/src/cli/cmd/run/runtime.ts:359]

`loadCatalog()` 在 footer idle 后并发加载 agents、experimental resources、commands，并发 `catalog` event 给 footer。[E: packages/opencode/src/cli/cmd/run/runtime.ts:371] [E: packages/opencode/src/cli/cmd/run/runtime.ts:376] [E: packages/opencode/src/cli/cmd/run/runtime.ts:381] [E: packages/opencode/src/cli/cmd/run/runtime.ts:385] [E: packages/opencode/src/cli/cmd/run/runtime.ts:394] [E: packages/opencode/src/cli/cmd/run/runtime.ts:402] [E: packages/opencode/src/cli/cmd/run/runtime.ts:403] [E: packages/opencode/src/cli/cmd/run/runtime.ts:404]

stream transport handle 懒创建：模块 import promise 在 `streamTask` 处预先创建或由 deps 注入，`ensureStream()` 首次调用时先 ensure session，再 await 该 import promise，调用 `createSessionTransport({ sdk, directory, sessionID, thinking, replay, replayLimit, limits, providers, footer, trace })`，并把 `selectSubagent` 代理到 transport handle。[E: packages/opencode/src/cli/cmd/run/runtime.ts:456] [E: packages/opencode/src/cli/cmd/run/runtime.ts:457] [E: packages/opencode/src/cli/cmd/run/runtime.ts:465] [E: packages/opencode/src/cli/cmd/run/runtime.ts:470] [E: packages/opencode/src/cli/cmd/run/runtime.ts:475] [E: packages/opencode/src/cli/cmd/run/runtime.ts:492]

Resize handler 250ms debounce；如果 replay 开启且 stream 已创建，会 reset split-footer scrollback 并 replay session/local rows。[E: packages/opencode/src/cli/cmd/run/runtime.ts:155] [E: packages/opencode/src/cli/cmd/run/runtime.ts:504] [E: packages/opencode/src/cli/cmd/run/runtime.ts:510] [E: packages/opencode/src/cli/cmd/run/runtime.ts:517] [E: packages/opencode/src/cli/cmd/run/runtime.ts:521] [E: packages/opencode/src/cli/cmd/run/runtime.ts:526]

## Prompt queue

`runPromptQueue()` 维护 `queue`、`queued`、`active`、abort ctrl、closed；它订阅 footer prompt/close/queued remove，直到 footer close 且 in-flight work 完成。[E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:59] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:62] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:317] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:320] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:323]

drain 是串行 loop：每次 shift 一个 prompt，处理 `/new`，给普通 prompt 分配 MessageID，发 `turn.send`，等待 footer idle，写 user commit，再运行 `input.run(sent, signal)`，完成后发 duration/idle。[E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:113] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:120] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:129] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:165] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:174] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:190] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:195] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:212] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:231] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:251] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:253] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:254] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:257] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:258] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:259]

`submit()` 拒绝空 prompt，`/exit`/`/quit` 关闭 footer；如果普通 prompt 在普通 active turn 后面排队，它会生成 local queued prompt，让 footer 可编辑/移除直到轮到该 turn。[E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:268] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:273] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:278] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:287] [E: packages/opencode/src/cli/cmd/run/runtime.queue.ts:293]

## Stream transport 与 footer

`stream.transport.ts` 建立 long-lived `sdk.global.event({ signal })` subscription；`globalPayloadEvent()` 会丢弃 `payload.type === "sync"`，只处理真正 session events。[E: packages/opencode/src/cli/cmd/run/stream.transport.ts:184] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:190] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:426] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:429]

Transport state 保存 session data、subagent data、wait deferred、tick、footerView、blocker order、selectedSubagent；`pickView()` 通过 `pickBlockerView()` 选择 permission/question/prompt view，`composeFooter()` 把 footer patch、subagent state、view change 合成 `FooterOutput`。[E: packages/opencode/src/cli/cmd/run/stream.transport.ts:114] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:115] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:116] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:117] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:118] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:120] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:121] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:122] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:123] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:304] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:305] [E: packages/opencode/src/cli/cmd/run/session-data.ts:219] [E: packages/opencode/src/cli/cmd/run/session-data.ts:221] [E: packages/opencode/src/cli/cmd/run/session-data.ts:225] [E: packages/opencode/src/cli/cmd/run/session-data.ts:228] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:311] [E: packages/opencode/src/cli/cmd/run/stream.transport.ts:333]

`RunFooter` 构造时创建 Solid signals/stores、`RunScrollbackStream`、renderer DESTROY/PALETTE/THEME_MODE handlers、SIGUSR2 handler，并通过 OpenTUI Solid `render()` 渲染 `RunFooterView`。[E: packages/opencode/src/cli/cmd/run/footer.ts:167] [E: packages/opencode/src/cli/cmd/run/footer.ts:239] [E: packages/opencode/src/cli/cmd/run/footer.ts:280] [E: packages/opencode/src/cli/cmd/run/footer.ts:292] [E: packages/opencode/src/cli/cmd/run/footer.ts:294] [E: packages/opencode/src/cli/cmd/run/footer.ts:295] [E: packages/opencode/src/cli/cmd/run/footer.ts:296] [E: packages/opencode/src/cli/cmd/run/footer.ts:298] [E: packages/opencode/src/cli/cmd/run/footer.ts:301] [E: packages/opencode/src/cli/cmd/run/footer.ts:306]

`RunFooter.event()` 对 catalog/models/variants/queued prompts 更新 signals；对 turn/stream patches 合并 `FooterState`；running -> idle 时 flush 并 complete scrollback；`turn.duration` 会写 turn summary。[E: packages/opencode/src/cli/cmd/run/footer.ts:390] [E: packages/opencode/src/cli/cmd/run/footer.ts:396] [E: packages/opencode/src/cli/cmd/run/footer.ts:408] [E: packages/opencode/src/cli/cmd/run/footer.ts:421] [E: packages/opencode/src/cli/cmd/run/footer.ts:430] [E: packages/opencode/src/cli/cmd/run/footer.ts:440] [E: packages/opencode/src/cli/cmd/run/footer.ts:449] [E: packages/opencode/src/cli/cmd/run/footer.ts:477] [E: packages/opencode/src/cli/cmd/run/footer.ts:486] [E: packages/opencode/src/cli/cmd/run/footer.ts:506] [E: packages/opencode/src/cli/cmd/run/footer.ts:508] [E: packages/opencode/src/cli/cmd/run/footer.ts:509] [E: packages/opencode/src/cli/cmd/run/footer.ts:510]

## Scrollback streaming

`RunScrollbackStream` 用 retained `ScrollbackSurface` 处理可 streaming 的 text/code/markdown entry；非 streaming 或 structured body 走 `renderer.writeToScrollback(entryWriter(...))`，因此 static entries 不使用 retained active entry。[E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:85] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:149] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:150] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:154] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:164] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:175] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:372] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:376] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:392] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:393]

`flushActive()` 对 text/code 只提交稳定 rows，对 markdown 使用 `_stableBlockCount` 提交稳定 block；done 时提交全部并可带 trailingNewline。[E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:231] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:240] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:254] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:264] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:282] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:287] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:298]

`append(commit)` 会按 sameEntryGroup 决定是否结束 active entry；summary 写 turn summary writer；可 streaming 的 text/code/markdown 走 retained active entry，非 streaming 或 structured body 直接 `renderer.writeToScrollback(entryWriter(...))`。[E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:348] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:354] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:372] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:376] [E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:392]

## Entry points

`runInteractiveLocalMode()` 创建 `createOpencodeClient({ baseUrl: "http://opencode.internal", fetch, directory })`，用于 local in-process server fetch，无需 external HTTP server。[E: packages/opencode/src/cli/cmd/run/runtime.ts:735] [E: packages/opencode/src/cli/cmd/run/runtime.ts:736] [E: packages/opencode/src/cli/cmd/run/runtime.ts:737] [E: packages/opencode/src/cli/cmd/run/runtime.ts:738] [E: packages/opencode/src/cli/cmd/run/runtime.ts:739] `runInteractiveMode()` 则使用 caller-provided SDK client，适用于 attach mode。[E: packages/opencode/src/cli/cmd/run/runtime.ts:787] [E: packages/opencode/src/cli/cmd/run/runtime.ts:800] [E: packages/opencode/src/cli/cmd/run/runtime.ts:801]

## 设计动机与权衡

这套 runtime 与 full TUI 分离，是因为 `opencode run --interactive` 要保留 shell-style stdout scrollback：renderer 使用 `screenMode: "split-footer"` 与 `externalOutputMode: "capture-stdout"`，`RunFooter` 单独拥有 footer signals 与 append queue；“full-screen route tree 不能直接替代 split-footer scrollback”是架构推断。[E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:190] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:192] [E: packages/opencode/src/cli/cmd/run/footer.ts:167] [E: packages/opencode/src/cli/cmd/run/footer.ts:174] [E: packages/opencode/src/cli/cmd/run/footer.ts:175] [E: packages/opencode/src/cli/cmd/run/footer.ts:176] [E: packages/opencode/src/cli/cmd/run/footer.ts:197] [E: packages/opencode/src/cli/cmd/run/footer.ts:199] [E: packages/opencode/src/cli/cmd/run/footer.ts:292] [I]

## Gotcha

- `run --interactive` 会复用 `@opencode-ai/tui` 的 keymap、editor、config types 等组件；它不是 `packages/tui/src/app.tsx` 的 full-screen app 这一点来自本节点 source 的独立 runtime/lifecycle/footer 实现。[E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:15] [E: packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts:16] [E: packages/opencode/src/cli/cmd/run/types.ts:15] [E: packages/opencode/src/cli/cmd/run/footer.ts:32] [I]
- OpenTUI retained scrollback/MarkdownRenderable internal fields such as `_stableBlockCount` 来自 external dependency；opencode 源码只能证明它们被读取并作为稳定 block 提交依据。[E: packages/opencode/src/cli/cmd/run/scrollback.surface.ts:287] [U]

## Sources

- `packages/opencode/src/cli/cmd/run/runtime.ts`
- `packages/opencode/src/cli/cmd/run/runtime.lifecycle.ts`
- `packages/opencode/src/cli/cmd/run/runtime.queue.ts`
- `packages/opencode/src/cli/cmd/run/stream.transport.ts`
- `packages/opencode/src/cli/cmd/run/session-data.ts`
- `packages/opencode/src/cli/cmd/run/footer.ts`
- `packages/opencode/src/cli/cmd/run/scrollback.surface.ts`
- `packages/opencode/src/cli/cmd/run/types.ts`

## 相关

- `tui.runtime-hosting`：full TUI `$0` host/worker runtime。
- `tui.prompt`：full-screen Prompt 的 session create/prompt submit 路径。
- `tui.keybindings`：run footer 复用 opencode keymap layer。
