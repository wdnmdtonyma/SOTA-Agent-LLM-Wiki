---
id: surface.codemode.overview
title: Codemode 脚本工具
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/extensions/codemode/index.ts
  - packages/coding-agent/src/extensions/codemode/tool.ts
  - packages/coding-agent/src/extensions/codemode/execute.ts
  - packages/coding-agent/src/extensions/codemode/execute.lazy.ts
  - packages/coding-agent/src/extensions/codemode/renderer.ts
  - packages/coding-agent/src/extensions/codemode/worker.ts
  - packages/coding-agent/docs/codemode.md
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/extensions/index.ts
  - packages/coding-agent/src/extensions/tool-search/index.ts
  - packages/coding-agent/src/extensions/tool-search/tool.ts
  - packages/coding-agent/src/extensions/mcp/index.ts
  - packages/coding-agent/src/extensions/mcp/tools.ts
  - packages/coding-agent/src/core/mcp-servers.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/nested-tool-calls.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/tools/bash.ts
  - packages/coding-agent/test/suite/agent-session-tool-orchestration.test.ts
symbols:
  - createCodemodeExtension
  - createCodemodeToolDefinition
  - createCodemodeTool
  - createCodemodeDescription
  - executeCodemode
  - CODEMODE_TOOL_NAME
  - CodemodeSettings
  - CodemodeMode
  - CodemodeToolInput
  - DEFAULT_CODEMODE_INLINE_BUDGET
  - isCodemodeTool
  - createToolSearchExtension
  - TOOL_SEARCH_TOOL_NAME
related:
  - subsys.coding-agent.codemode
  - subsys.codemode.runtime
  - surface.mcp.overview
  - surface.tools.bash
  - ref.coding-agent.config-keys
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `surface.codemode.overview` 是 pi-coding-agent 的 **codemode** 可见面:模型写一段 JavaScript,在 QuickJS sandbox 里调用其它 tools 和 `models.classify()` / `models.generateImages()`,只有脚本输出进入 LLM context,nested calls 不会变成独立的 model-facing tool results. The `codemode` tool is a built-in replaceable extension, inactive until `--tools`, `defaultTools`, `setActiveTools()`, or the MCP extension turns it on.

## 能回答的问题

- `codemode` 的 wire name、TypeBox 输入和 `createCodemodeExtension()` 工厂是什么? How is it registered as a replaceable built-in?
- `settings.codemode.mode` 的 `on` / `only` 和 `inlineBudget` 怎样改模型看到的 tool declarations?
- 脚本怎样调用 tools / `models.*`,nested results 为什么不进 LLM context?
- 默认 MCP `exposure` 为什么是 `codemode`,服务器 tools 为何不出现在 `codemode` description 里?
- `tool_search` 和脚本里的 `searchTools()` 有什么差别?
- `codemode` 与 `subsys.coding-agent.codemode`、`subsys.codemode.runtime`、`surface.mcp.overview` 的边界是什么?

## 1 Identity

模型看到的 tool name 是 `codemode`(`CODEMODE_TOOL_NAME`),UI label 同名,唯一参数是 `code: string`("Raw JavaScript source.")。[E: packages/coding-agent/src/extensions/codemode/tool.ts:50] [E: packages/coding-agent/src/extensions/codemode/tool.ts:87] [E: packages/coding-agent/src/extensions/codemode/tool.ts:88] [E: packages/coding-agent/src/extensions/codemode/tool.ts:369] [E: packages/coding-agent/src/extensions/codemode/tool.ts:370] `CodemodeToolInput` 是该 TypeBox schema 的 static type。[E: packages/coding-agent/src/extensions/codemode/tool.ts:93]

`createCodemodeToolDefinition()` 产出产品 `ToolDefinition`:`exposure` 为 `"model-only"`(脚本不能再启动另一个 `codemode`),`prepareLoadout` 在激活时重写 description,`constrainedSampling` 用 `CODEMODE_SOURCE_GRAMMAR` 让模型写 raw JS 而不是 JSON-escaped string,`execute` 经 `loadCodemodeExecutor()` 懒加载 sandbox。[E: packages/coding-agent/src/extensions/codemode/tool.ts:377] [E: packages/coding-agent/src/extensions/codemode/tool.ts:378] [E: packages/coding-agent/src/extensions/codemode/tool.ts:380] [E: packages/coding-agent/src/extensions/codemode/tool.ts:382] [E: packages/coding-agent/src/extensions/codemode/execute.lazy.ts:2] `createCodemodeTool()` 把同一 definition 交给 `wrapToolDefinition()`,给 plain `Agent` 用。[E: packages/coding-agent/src/extensions/codemode/tool.ts:392] [E: packages/coding-agent/src/extensions/codemode/tool.ts:397]

`isCodemodeTool()` 用 `name === "codemode"` **且** `parameters === codemodeSchema` 识别本包工具,避免其它扩展抢同名。[E: packages/coding-agent/src/extensions/codemode/tool.ts:99] [E: packages/coding-agent/src/extensions/codemode/tool.ts:100]

## 2 入口与装配

CLI 把 `codemode` 编进 `builtInExtensions`:name `"codemode"`, `replaceable: true`, `builtin: true`。第三方扩展在 loading 期注册同名 tool 时,内置扩展被换掉而不是并列。[E: packages/coding-agent/src/extensions/index.ts:11] `llama.cpp` 同表但是 **不可替换**;`tool-search` 与 `mcp` 同样 `replaceable: true`。[E: packages/coding-agent/src/extensions/index.ts:8] [E: packages/coding-agent/src/extensions/index.ts:12] [E: packages/coding-agent/src/extensions/index.ts:13]

`createCodemodeExtension(options?)` 是 SDK / CLI 工厂。它 `pi.registerTool({ ...createCodemodeToolDefinition(...), defaultActive: false })`,所以注册后 tool 在 `getAllTools()` 里,但不进入默认 active set(`read` / `bash` / `edit` / `write`)。[E: packages/coding-agent/src/extensions/codemode/index.ts:31] [E: packages/coding-agent/src/extensions/codemode/index.ts:33] [E: packages/coding-agent/src/extensions/codemode/index.ts:41] [E: packages/coding-agent/test/suite/agent-session-tool-orchestration.test.ts:120] [E: packages/coding-agent/test/suite/agent-session-tool-orchestration.test.ts:122] 打开方式:`setActiveTools()`、`allowedToolNames` / `--tools` 一类白名单,或 `defaultTools` 的 `+codemode`。[E: packages/coding-agent/src/core/extensions/types.ts:1737] [E: packages/coding-agent/test/suite/agent-session-tool-orchestration.test.ts:127] 模块 default export 是无 options 的 `createCodemodeExtension()`。[E: packages/coding-agent/src/extensions/codemode/index.ts:46]

`CodemodeExtensionOptions` 可覆盖 `mode`、`inlineBudget`,以及是否把 `models` 命名空间交给脚本(默认 `true`)。[E: packages/coding-agent/src/extensions/codemode/index.ts:13] [E: packages/coding-agent/src/extensions/codemode/index.ts:15] [E: packages/coding-agent/src/extensions/codemode/index.ts:17] [E: packages/coding-agent/src/extensions/codemode/index.ts:19] [E: packages/coding-agent/src/extensions/codemode/index.ts:36]

MCP 扩展在服务器需要脚本可达时会自动激活 `codemode`(见第 7 节)。[E: packages/coding-agent/src/extensions/mcp/index.ts:473] [E: packages/coding-agent/src/extensions/mcp/index.ts:482]

## 3 输入与脚本面

`code` 是 raw JavaScript,不是 JSON,也不是 markdown fence。`executeCodemode()` 先 `parseCodemodeSource(input.code)`,可选第一行 `// @options:` 解析 `max_output_tokens` 与 `timeout_ms`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:329] [E: packages/coding-agent/src/extensions/codemode/tool.ts:135] 未设 timeout 时 sandbox 用 `Number.POSITIVE_INFINITY`;未设输出预算时默认 `DEFAULT_MAX_OUTPUT_TOKENS = 10_000`(按 4 chars/token 估)。[E: packages/coding-agent/src/extensions/codemode/execute.ts:233] [E: packages/coding-agent/src/extensions/codemode/execute.ts:385] [E: packages/coding-agent/src/extensions/codemode/execute.ts:423]

脚本作为 async function body 跑在 `CodemodeSandbox`(QuickJS WASM,无 Node / fs / network / timers)。coding-agent 把 VM heap 限制在 `CODEMODE_MEMORY_LIMIT_BYTES = 256 * 1024 * 1024`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:57] [E: packages/coding-agent/src/extensions/codemode/execute.ts:377] [E: packages/coding-agent/src/extensions/codemode/execute.ts:386] [E: packages/coding-agent/src/extensions/codemode/tool.ts:135] Sandbox 协议、prelude globals 与 `MAX_OUTPUT_*` 由 [subsys.codemode.runtime](../../subsystems/codemode/runtime.md) 权威覆盖;bundled worker 入口是 `extensions/codemode/worker.ts` 再 import `@earendil-works/pi-codemode/worker`。[E: packages/coding-agent/src/extensions/codemode/worker.ts:6]

模型-facing description 声明这些 globals(细节在产品文档 `packages/coding-agent/docs/codemode.md`):`tools.<name>(args)`、`text()` / `image()` / `console.*` / top-level `return` / `exit()`、`store()` / `load()`、`ALL_TOOLS`、`searchTools(query, { limit?, namespace? })`、`describeTool(name)`、`describeNamespace(name)`,以及可选 `models`。[E: packages/coding-agent/src/extensions/codemode/tool.ts:135] [E: packages/coding-agent/src/extensions/codemode/tool.ts:143] [E: packages/coding-agent/src/extensions/codemode/tool.ts:144] [E: packages/coding-agent/src/extensions/codemode/tool.ts:145] [E: packages/coding-agent/src/extensions/codemode/tool.ts:148] `searchTools` / `describeTool` / `describeNamespace` 由 `createDiscoveryGlobals()` 注入,BM25 与 `tool_search` 共用 `Bm25Ranker`,默认 limit 8。[E: packages/coding-agent/src/extensions/codemode/execute.ts:380] [E: packages/coding-agent/src/extensions/codemode/execute.ts:456] [E: packages/coding-agent/src/extensions/codemode/execute.ts:460] [E: packages/coding-agent/src/extensions/tool-search/tool.ts:21]

`getCodemodeCallableTools()` 允许调用传入列表里除 `codemode` 自身以外的每个 tool。[E: packages/coding-agent/src/extensions/codemode/tool.ts:170] 会话层 callable set 是:active 的 `direct` tools,加上每一个已注册的 `codemode` 或 `deferred` tool(无论是否 active)。[E: packages/coding-agent/src/core/agent-session.ts:1518]

## 4 settings.codemode

`Settings.codemode` 类型是 `CodemodeSettings`:`mode?: CodemodeMode`,`inlineBudget?: number`。`CodemodeMode` 只有 `"on" | "only"`。[E: packages/coding-agent/src/core/settings-manager.ts:101] [E: packages/coding-agent/src/core/settings-manager.ts:103] [E: packages/coding-agent/src/core/settings-manager.ts:105] [E: packages/coding-agent/src/core/settings-manager.ts:107] [E: packages/coding-agent/src/core/settings-manager.ts:178] 完整 key catalog 由 [ref.coding-agent.config-keys](../../reference/config-keys.md) 收录。

扩展运行时读取:

| 键 | 代码默认 | 行为 |
|---|---|---|
| `codemode.mode` | `"on"`(任何非 `"only"` 的值都落成 `"on"`) | `on`:给已声明且脚本可调用的 tools 追加 "Codemode: `tools.<id>(args)` …" 说明,`codemode` description 只列出 **没有** `direct` exposure 的 callable tools;`only`:description 列出全部 callable,并把 active `direct` tools 放进 `hiddenDeclarations`,请求里不再声明它们。[E: packages/coding-agent/src/extensions/codemode/index.ts:23] [E: packages/coding-agent/src/extensions/codemode/tool.ts:330] [E: packages/coding-agent/src/extensions/codemode/tool.ts:335] [E: packages/coding-agent/src/extensions/codemode/tool.ts:340] [E: packages/coding-agent/src/extensions/codemode/tool.ts:358] |
| `codemode.inlineBudget` | `DEFAULT_CODEMODE_INLINE_BUDGET = 3000`(非法/缺省时 `readInlineBudget` 返回 `undefined`,再落到 3000) | description 里 tool 段落的估计 token 上限(chars/4)。超预算的 tools 不列出,脚本用 `searchTools()` 找。`0` 时各组 heading 仍在,tools 标 `(tools not listed)`。[E: packages/coding-agent/src/extensions/codemode/index.ts:28] [E: packages/coding-agent/src/extensions/codemode/tool.ts:154] [E: packages/coding-agent/src/extensions/codemode/tool.ts:353] [E: packages/coding-agent/src/extensions/codemode/tool.ts:278] |

`prepareLoadout` 按 **exposure** 而不是当前 active set 决定列出哪些 tools,因此 `tool_search` 加载一个 tool 不会重写 `codemode` description。[E: packages/coding-agent/src/extensions/codemode/tool.ts:340] [E: packages/coding-agent/src/extensions/codemode/tool.ts:350]

## 5 Nested tools 与 LLM context

脚本里的 `tools.<name>(args)` 走 `ctx.executeTool(tool.name, args, { signal })`,也就是 agent 的 tool pipeline:校验、`tool_call` / `tool_result` hooks、permission 与 model-issued 调用相同。[E: packages/coding-agent/src/extensions/codemode/execute.ts:363] [E: packages/coding-agent/src/core/extensions/types.ts:394] [E: packages/coding-agent/src/core/agent-session.ts:720] `NestedToolCallRunner.execute()` 给 nested call 分配 id `<callerId>/<n>`,并 emit 带 `parentToolCallId` 的 `tool_execution_*`。[E: packages/coding-agent/src/core/nested-tool-calls.ts:188] [E: packages/coding-agent/src/core/nested-tool-calls.ts:198]

脚本拿到的值由 `toScriptValue()` 决定:tool 声明了 `outputSchema` 且 result 有 `structuredContent` 时返回该对象(含 MCP `isError` 仍带 structuredContent 的情况);否则成功返回 text content,失败/blocked/invalid 则 `throw Error`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:310] [E: packages/coding-agent/src/extensions/codemode/execute.ts:312] 例如 [surface.tools.bash](../tools/bash.md) 声明 `outputSchema: bashOutputSchema`(`output` / `truncated` / `full_output_path?` / `exit_code` / `wall_time_seconds`),脚本解析到该对象,而不是模型看到的截断文本。[E: packages/coding-agent/src/core/tools/bash.ts:259] [E: packages/coding-agent/src/core/tools/bash.ts:56]

**LLM context 只吃脚本输出。** `executeCodemode()` 返回的 `content` 是 `Script completed` / `Script failed` header 加上 sandbox 的 `text()` / `image()` / `return` / error 文本,没有把 nested tool result 拷进去。[E: packages/coding-agent/src/extensions/codemode/execute.ts:403] [E: packages/coding-agent/src/extensions/codemode/execute.ts:425] [E: packages/coding-agent/src/extensions/codemode/execute.ts:429] Session 把 nested 调用记在 parent `toolResult.nestedCalls`;`NestedCallRecorder.start()` 写 `id` / `name` / `status`,以及未超限时的 `arguments`(超限则 `argumentsBytes`),`finish()` 补 `durationMs` 与截断 error text,没有 result payload。[E: packages/coding-agent/src/core/agent-session.ts:1080] [E: packages/coding-agent/src/core/nested-tool-calls.ts:61] [E: packages/coding-agent/src/core/nested-tool-calls.ts:71] [E: packages/coding-agent/src/core/nested-tool-calls.ts:82] [E: packages/coding-agent/src/core/nested-tool-calls.ts:84] UI 在 `codemode` 自己的 renderer 里画 `details.calls`,nested 不是独立 tool rows。[E: packages/coding-agent/src/extensions/codemode/renderer.ts:98]

没有 `ExtensionToolContext` 时(plain `Agent` 或直接调用)`ctx.tools` 为空,nested `execute` 抛 `Tool calls need a session`,`load()` 从空 map 开始;writes 只有 `options.appendEntry` 存在时才会落盘。[E: packages/coding-agent/src/extensions/codemode/execute.ts:345] [E: packages/coding-agent/src/extensions/codemode/execute.ts:362] [E: packages/coding-agent/src/extensions/codemode/execute.ts:393] [E: packages/coding-agent/src/extensions/codemode/execute.ts:407]

## 6 `models.classify` / `models.generateImages`

`options.models !== false` 且存在 session ctx 时,`createModelGlobals()` 把 `models.getModelsOfType` / `getAvailableOfType` / `getModelOfType` / `classify` / `generateImages` 注入 sandbox,背后是 session `ModelRegistry` 的同名方法。[E: packages/coding-agent/src/extensions/codemode/execute.ts:381] [E: packages/coding-agent/src/extensions/codemode/tool.ts:63] [E: packages/coding-agent/src/extensions/codemode/execute.ts:612] [E: packages/coding-agent/src/extensions/codemode/execute.ts:616] Catalog 可列出 `chat` | `image` | `classifier`;可 **run** 的只有 classifier 与 image。没有 `models.stream` / chat-completion 入口,chat 模型不能从脚本跑。[E: packages/coding-agent/src/extensions/codemode/execute.ts:58] [I]

`classify()` / `generateImages()` 只用 model 的 `provider` 与 `id` 解析,先 `checkClassifierContext` / `checkImagesContext`,再经 `createLimiter(MAX_CONCURRENT_MODEL_CALLS)` 限制 **每脚本同时 4 个** 这类调用,多出来的排队,所以 `Promise.all` 大批量是合法的。[E: packages/coding-agent/src/extensions/codemode/execute.ts:51] [E: packages/coding-agent/src/extensions/codemode/execute.ts:532] [E: packages/coding-agent/src/extensions/codemode/execute.ts:581] 它们作为 nested call rows 出现在 renderer 里,`args` 只显示 `provider/id`,不显示 prompt 或 image data;usage 合并进 `codemode` tool result 并计入 session cost。[E: packages/coding-agent/src/extensions/codemode/execute.ts:575] [E: packages/coding-agent/src/extensions/codemode/execute.ts:431] `toModelInfo()` 会 `delete info.headers`,避免把 models.json 里的凭证头交给脚本。[E: packages/coding-agent/src/extensions/codemode/execute.ts:95]

`generateImages()` 返回的 image blocks 必须用 `image(block)` 放进输出;若脚本生成了图却没有任何 image item,结果会追加一条 Note 提醒。[E: packages/coding-agent/src/extensions/codemode/execute.ts:416] [E: packages/coding-agent/src/extensions/codemode/execute.ts:419]

## 7 默认 MCP exposure 是 `codemode`

MCP 配置层 `McpExposure = "codemode" | "deferred" | "direct" | "hidden"`。省略时 `exposureOf()` / `getMcpToolExposure()` 都落成 `"codemode"`;`codemode-deferred` 是别名,校验时改写为 `codemode`。[E: packages/coding-agent/src/core/mcp-servers.ts:17] [E: packages/coding-agent/src/core/mcp-servers.ts:22] [E: packages/coding-agent/src/core/mcp-servers.ts:214] [E: packages/coding-agent/src/extensions/mcp/index.ts:132]

注册 MCP tool 时 `toToolExposure("codemode")` 返回 tool-level `"deferred"`(MCP `"deferred"` 原样保持 `"deferred"`)。[E: packages/coding-agent/src/extensions/mcp/tools.ts:46] [E: packages/coding-agent/src/extensions/mcp/tools.ts:281] `createCodemodeDescription()` **从不列出** `deferred` tools,它们也不计入 inlineBudget;若 listed 集合在过滤后为空,description 只剩 intro + globals,没有 `Nested tools:` 段。[E: packages/coding-agent/src/extensions/codemode/tool.ts:242] [E: packages/coding-agent/src/extensions/codemode/tool.ts:267] 因此默认 MCP 服务器的 tools **不出现在 `codemode` description 里**;脚本用 `searchTools()` / `describeTool()` / `describeNamespace()` / `ALL_TOOLS` 发现它们。MCP 用户面( `/mcp`、`mcp.json`、`mcp_servers` prompt section)由 [surface.mcp.overview](../mcp/overview.md) 覆盖。

MCP 扩展 `ensureDiscoveryActive()`:配置里只要有 `codemode` exposure 就激活 `codemode` tool(`autoEnableCodemode` 默认 true,项目 `mcp.json` 可关掉);有 `deferred` exposure 则激活 `tool_search`。[E: packages/coding-agent/src/extensions/mcp/index.ts:473] [E: packages/coding-agent/src/extensions/mcp/index.ts:474] [E: packages/coding-agent/src/extensions/mcp/index.ts:482] [E: packages/coding-agent/src/extensions/mcp/index.ts:485] [E: packages/coding-agent/src/extensions/mcp/index.ts:1001]

## 8 `tool_search` 兄弟扩展

`tool_search` 是另一个 replaceable builtin,工厂 `createToolSearchExtension()`,同样 `defaultActive: false`。[E: packages/coding-agent/src/extensions/index.ts:12] [E: packages/coding-agent/src/extensions/tool-search/index.ts:12] [E: packages/coding-agent/src/extensions/tool-search/index.ts:14] Wire name `TOOL_SEARCH_TOOL_NAME = "tool_search"`,`exposure: "model-only"`(脚本不需要它;它改变的是模型下一轮能看见的 declarations)。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:20] [E: packages/coding-agent/src/extensions/tool-search/tool.ts:232]

它搜索 **尚未 active** 且 tool exposure 为 `"codemode"` 或 `"deferred"` 的 tools,BM25 排名后 `setActiveTools([...active, ...matches])`,让下一轮模型请求声明这些 tools。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:193] [E: packages/coding-agent/src/extensions/tool-search/tool.ts:206] [E: packages/coding-agent/src/extensions/tool-search/tool.ts:209] 因为 MCP 默认 `codemode` 被映射成 tool `"deferred"`,这些 MCP tools 也可以被 `tool_search` 加载。加载会写入 transcript 的 active-tool 变更,所以 `/tree`、resume、fork 在该 branch 上仍然看得到。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:209]

脚本内 `searchTools()` **不**激活 tools,只返回 `{ name, description }[]` 给当前脚本用。[E: packages/coding-agent/src/extensions/codemode/execute.ts:478] `tool_search` 的 description 也不列举 searchable tools / namespaces,MCP 连上时它自己的 description 保持不变。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:220]

## 9 输出、renderer、store

成功/失败 header 是 `Script completed` 或 `Script failed`,加上 wall time 与 `Output:`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:425] 失败时仍保留 partial output,再追加 `Script error:` 与 stack/timeout/abort 文本,以及失败前的 nested call 摘要;那些 nested 调用不会回滚。[E: packages/coding-agent/src/extensions/codemode/execute.ts:414] [E: packages/coding-agent/src/extensions/codemode/execute.ts:245] 超 token 预算时 `truncateOutput()` 保留头尾,完整文本写到 temp file,`details.fullOutputPath` 指向它。[E: packages/coding-agent/src/extensions/codemode/execute.ts:427]

`codemodeRenderers.renderCall` 把脚本当 JavaScript 高亮,折叠时最多 `CODE_PREVIEW_LINES = 10` 行;`renderResult` 折叠时只列最近 `CALL_PREVIEW_COUNT = 8` 条 nested calls,并用 `SCRIPT_HEADER` 丢掉 "Script completed…" 头再显示输出。[E: packages/coding-agent/src/extensions/codemode/renderer.ts:18] [E: packages/coding-agent/src/extensions/codemode/renderer.ts:19] [E: packages/coding-agent/src/extensions/codemode/renderer.ts:69] [E: packages/coding-agent/src/extensions/codemode/renderer.ts:87] [E: packages/coding-agent/src/extensions/codemode/renderer.ts:95] [E: packages/coding-agent/src/extensions/codemode/renderer.ts:100] [E: packages/coding-agent/src/extensions/codemode/renderer.ts:120]

`store(key, value)` / `load(key)` 跨多次 `codemode` 调用保存 JSON。`load()` 读取当前 branch 上的 `codemode-store` custom entries;`store()` 只在脚本 **成功** 时经 `appendEntry("codemode-store", { set, delete })` 追加,因此 resume 与 fork 各走各的写入路径。[E: packages/coding-agent/src/extensions/codemode/tool.ts:53] [E: packages/coding-agent/src/extensions/codemode/execute.ts:220] [E: packages/coding-agent/src/extensions/codemode/execute.ts:407] [E: packages/coding-agent/src/extensions/codemode/index.ts:35]

## 跨包关系

[subsys.coding-agent.codemode](../../subsystems/coding-agent/codemode.md) 是 T2:扩展生命周期、`prepareLoadout` 与 `tool_search` 协作、nested-call runner 装配。本节点只写用户/模型可见的 tool、settings 和 MCP 默认 exposure。[I]

[subsys.codemode.runtime](../../subsystems/codemode/runtime.md) 是独立包 `@earendil-works/pi-codemode`:`CodemodeSandbox.execute()`,QuickJS WASM、worker、`ALL_TOOLS` prelude、`MAX_OUTPUT_CHARS` / `MAX_OUTPUT_ITEMS`。coding-agent 在 `execute.ts` 里 new sandbox 并传入 tools/globals/timeout/memory。[E: packages/coding-agent/src/extensions/codemode/execute.ts:377]

[surface.mcp.overview](../mcp/overview.md) 是 MCP 产品面(`.pi/mcp.json`、`/mcp`、OAuth)。本节点只说明默认 `exposure: "codemode"` 如何把服务器 tools 从 `codemode` description 里拿掉、改由脚本搜索。[E: packages/coding-agent/src/extensions/mcp/index.ts:132]

[surface.tools.bash](../tools/bash.md) 是模型 `bash` tool。脚本通过 nested `ctx.executeTool("bash", …)` 调用它,拿到 `bashOutputSchema` 结构化结果。[E: packages/coding-agent/src/core/tools/bash.ts:259]

[ref.coding-agent.config-keys](../../reference/config-keys.md) 应列出 `codemode.mode` 与 `codemode.inlineBudget`;schema 在 `CodemodeSettings`。[E: packages/coding-agent/src/core/settings-manager.ts:103]

## Gotcha

- MCP 配置值 `"codemode"` 与 tool-level `ToolExposure` 的 `"codemode"` 不是同一层:MCP 默认值被 `toToolExposure()` 映射成 tool `"deferred"`,所以 **不** 进入 `codemode` description(tool-level `"codemode"` 才会被列出)。[E: packages/coding-agent/src/extensions/mcp/tools.ts:46] [E: packages/coding-agent/src/extensions/codemode/tool.ts:242] [E: packages/coding-agent/src/core/extensions/types.ts:509]
- `codemode.mode === "only"` 把 active `direct` tools 放进 `hiddenDeclarations`。`AgentSession` 仍把它们留在 `agent.state.tools`,但 `_installHiddenDeclarationsProjection()` 从请求里的 `toolsAdded` / `toolsRemoved` 滤掉它们,system prompt snippets 也不再列出。[E: packages/coding-agent/src/extensions/codemode/tool.ts:358] [E: packages/coding-agent/src/core/agent-session.ts:1554] [E: packages/coding-agent/src/core/agent-session.ts:1570] [E: packages/coding-agent/src/core/agent-session.ts:1658] [E: packages/coding-agent/src/core/agent-session.ts:1729]
- `exposure: "model-only"` 阻止脚本再调 `codemode`;`getCodemodeCallableTools()` 也会按 name 滤掉它。[E: packages/coding-agent/src/extensions/codemode/tool.ts:377] [E: packages/coding-agent/src/extensions/codemode/tool.ts:170]
- `autoEnableCodemode: false` 时,仅有默认 MCP servers 不会打开 `codemode`;若 `tool_search` 也未 active,MCP 扩展 warning 一次:tools cannot be called。[E: packages/coding-agent/src/extensions/mcp/index.ts:482] [E: packages/coding-agent/src/extensions/mcp/index.ts:496]
- 脚本结束、timeout 或 abort 时,仍标 `running` 的 nested calls 被改成 `cancelled`。未 await 的 sandbox promise 如何丢弃由 [subsys.codemode.runtime](../../subsystems/codemode/runtime.md) 覆盖。[E: packages/coding-agent/src/extensions/codemode/execute.ts:400]
- 没有 session ctx 时 `appendEntry` 仍可能由 extension factory 传入;此时 `load()` 看不到 branch 上的旧值,但成功脚本的 `store()` 仍可能写出一条 `codemode-store` entry。[E: packages/coding-agent/src/extensions/codemode/execute.ts:393] [E: packages/coding-agent/src/extensions/codemode/index.ts:35] [I]

## Sources

- packages/coding-agent/src/extensions/codemode/index.ts
- packages/coding-agent/src/extensions/codemode/tool.ts
- packages/coding-agent/src/extensions/codemode/execute.ts
- packages/coding-agent/src/extensions/codemode/execute.lazy.ts
- packages/coding-agent/src/extensions/codemode/renderer.ts
- packages/coding-agent/src/extensions/codemode/worker.ts
- packages/coding-agent/docs/codemode.md
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/extensions/index.ts
- packages/coding-agent/src/extensions/tool-search/index.ts
- packages/coding-agent/src/extensions/tool-search/tool.ts
- packages/coding-agent/src/extensions/mcp/index.ts
- packages/coding-agent/src/extensions/mcp/tools.ts
- packages/coding-agent/src/core/mcp-servers.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/nested-tool-calls.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/tools/bash.ts
- packages/coding-agent/test/suite/agent-session-tool-orchestration.test.ts

## 相关

- [subsys.coding-agent.codemode](../../subsystems/coding-agent/codemode.md): coding-agent 内置 `codemode` 扩展与 `tool_search` 协作的 T2 走读。
- [subsys.codemode.runtime](../../subsystems/codemode/runtime.md): `@earendil-works/pi-codemode` QuickJS WASM sandbox。
- [surface.mcp.overview](../mcp/overview.md): MCP 用户面;`exposure` 默认 `codemode`。
- [surface.tools.bash](../tools/bash.md): 可被脚本 nested 调用的 `bash` tool 与 `outputSchema`。
- [ref.coding-agent.config-keys](../../reference/config-keys.md): `codemode.mode` / `codemode.inlineBudget` 的配置键目录。
