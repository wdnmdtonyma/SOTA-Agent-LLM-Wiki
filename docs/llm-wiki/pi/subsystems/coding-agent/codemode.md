---
id: subsys.coding-agent.codemode
title: coding-agent Codemode 与 tool_search
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/extensions/index.ts
  - packages/coding-agent/src/extensions/codemode/index.ts
  - packages/coding-agent/src/extensions/codemode/tool.ts
  - packages/coding-agent/src/extensions/codemode/execute.ts
  - packages/coding-agent/src/extensions/codemode/execute.lazy.ts
  - packages/coding-agent/src/extensions/codemode/renderer.ts
  - packages/coding-agent/src/extensions/codemode/worker.ts
  - packages/coding-agent/src/extensions/tool-search/index.ts
  - packages/coding-agent/src/extensions/tool-search/tool.ts
  - packages/coding-agent/src/extensions/mcp/index.ts
  - packages/coding-agent/src/extensions/mcp/tools.ts
  - packages/coding-agent/src/core/mcp-servers.ts
  - packages/coding-agent/src/core/nested-tool-calls.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/extensions/wrapper.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/resource-loader.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/config.ts
  - packages/coding-agent/src/main.ts
  - packages/codemode/src/runtime/host.ts
  - packages/codemode/src/runtime/prelude-source.ts
  - packages/codemode/src/types.ts
  - packages/coding-agent/test/codemode-worker-config.test.ts
  - packages/coding-agent/test/tool-search.test.ts
  - packages/coding-agent/test/suite/agent-session-codemode.test.ts
  - packages/coding-agent/test/suite/agent-session-mcp.test.ts
  - packages/coding-agent/test/suite/agent-session-tool-orchestration.test.ts
symbols:
  - builtInExtensions
  - createCodemodeExtension
  - createCodemodeToolDefinition
  - createCodemodeTool
  - createCodemodeDescription
  - executeCodemode
  - loadCodemodeExecutor
  - readCodemodeStore
  - createToolSearchExtension
  - createToolSearchToolDefinition
  - Bm25Ranker
  - NestedToolCallRunner
  - getCodemodeWorkerSpecifier
  - resolveCodemodeWorkerSpecifier
  - CODEMODE_TOOL_NAME
  - TOOL_SEARCH_TOOL_NAME
related:
  - surface.codemode.overview
  - subsys.codemode.runtime
  - subsys.coding-agent.mcp
  - surface.extensions.api
  - ref.tools-catalog
  - subsys.coding-agent.agent-session
  - subsys.coding-agent.extension-runner
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> coding-agent 的 Codemode / `tool_search` 子系统把独立包 `pi-codemode` 的 `CodemodeSandbox` 接到产品会话: CLI 内置 replaceable 扩展注册 `codemode` 与 `tool_search` 两个 `model-only` 工具; 模型写的 JavaScript 在 worker 内的 QuickJS VM 中执行, 嵌套调用走 `ctx.executeTool()` → `NestedToolCallRunner`; `tool_search` 用 BM25 把尚未声明的 `codemode` / `deferred` 工具(含默认 MCP 工具)加载进下一轮模型声明。

## 能回答的问题

- CLI 怎样把 `codemode` / `tool-search` 装成 replaceable builtin, 第三方扩展怎样顶替它们?
- `CodemodeSandbox` 在哪一层构造, wasm / worker / 内存上限谁传入?
- `prepareLoadout` 怎样收缩模型看到的工具声明 (`inlineBudget`、`deferred`、`codemode.mode`)?
- 脚本失败时模型拿到哪些 recovery hint, 输出有哪些上限?
- Windows / Bun binary 为什么必须用相对 worker 路径?
- `tool_search` 怎样加载 deferred MCP 工具, 和脚本里的 `searchTools()` 有何不同?
- 嵌套调用为什么不出现在模型 transcript 的独立 tool row 里?

## 职责边界

本节点覆盖 **coding-agent 产品装配**: 内置扩展注册、工具 description/loadout、懒加载 executor、把会话工具桥进 sandbox、`tool_search` 激活、以及 `NestedToolCallRunner` 把 `ctx.executeTool()` 送进同一套 hook / permission pipeline。QuickJS worker、prelude globals、`MAX_OUTPUT_CHARS` 等 VM 合同的权威节点是 [subsys.codemode.runtime](../codemode/runtime.md); MCP 连接与 `/mcp` 的权威节点是 [subsys.coding-agent.mcp](mcp.md); 八个 filesystem 内置工具仍以 [ref.tools-catalog](../../reference/tools-catalog.md) 为准, `codemode` / `tool_search` 不在那 8 个 `ToolName` 里。

`codemode` 与 `tool_search` 都是 `exposure: "model-only"`: 激活后声明给模型, 但脚本不能再调它们(避免脚本再开脚本, 也避免脚本改模型可见工具集)。[E: packages/coding-agent/src/extensions/codemode/tool.ts:377] [E: packages/coding-agent/src/extensions/tool-search/tool.ts:232] 两者 `defaultActive: false`, 默认不进 active set; 要用 `--tools`、`defaultTools` 或 `setActiveTools()` 显式打开, MCP 扩展也可按 exposure 自动激活。[E: packages/coding-agent/src/extensions/codemode/index.ts:41] [E: packages/coding-agent/src/extensions/tool-search/index.ts:14] [E: packages/coding-agent/test/suite/agent-session-tool-orchestration.test.ts:115] [E: packages/coding-agent/test/suite/agent-session-tool-orchestration.test.ts:122]

## 关键文件

- `packages/coding-agent/src/extensions/index.ts`: `builtInExtensions` 清单, `codemode` / `tool-search` / `mcp` 为 `replaceable: true, builtin: true`。[E: packages/coding-agent/src/extensions/index.ts:11] [E: packages/coding-agent/src/extensions/index.ts:12] [E: packages/coding-agent/src/extensions/index.ts:13]
- `packages/coding-agent/src/extensions/codemode/index.ts`: `createCodemodeExtension()`, 读 `codemode.mode` / `codemode.inlineBudget`, 默认 `models: true`。
- `packages/coding-agent/src/extensions/codemode/tool.ts`: `createCodemodeToolDefinition()`, `createCodemodeDescription()`, `prepareCodemodeLoadout()`。
- `packages/coding-agent/src/extensions/codemode/execute.lazy.ts` + `execute.ts`: 首次脚本才 `import("./execute.ts")`, 构造 `CodemodeSandbox` 并跑 `executeCodemode()`。[E: packages/coding-agent/src/extensions/codemode/execute.lazy.ts:2] [E: packages/coding-agent/src/extensions/codemode/tool.ts:383]
- `packages/coding-agent/src/extensions/codemode/worker.ts`: bundled 构建的 worker 入口, 副作用 `import "@earendil-works/pi-codemode/worker"`。[E: packages/coding-agent/src/extensions/codemode/worker.ts:6]
- `packages/coding-agent/src/extensions/codemode/renderer.ts`: TUI 展示脚本与 nested call 状态, nested 调用不是独立 tool row。
- `packages/coding-agent/src/extensions/tool-search/tool.ts`: `Bm25Ranker`、`createToolSearchToolDefinition()`, 与脚本 `searchTools()` 共用 ranker。
- `packages/coding-agent/src/core/nested-tool-calls.ts`: `NestedToolCallRunner` / `NESTED_CALL_LIMITS`。
- `packages/coding-agent/src/config.ts`: `getQuickJSWasmPath()` / `getCodemodeWorkerSpecifier()`。

## 数据模型

`CODEMODE_TOOL_NAME` 是 `"codemode"`; 参数只有 `code: string`(raw JavaScript, 不是 JSON 字符串)。[E: packages/coding-agent/src/extensions/codemode/tool.ts:50] [E: packages/coding-agent/src/extensions/codemode/tool.ts:88] `isCodemodeTool()` 用 `parameters === codemodeSchema` 的引用相等, 避免别的扩展抢同名。[E: packages/coding-agent/src/extensions/codemode/tool.ts:100] `TOOL_SEARCH_TOOL_NAME` 是 `"tool_search"`(下划线); 扩展 **name** 是 `"tool-search"`(连字符)。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:20] [E: packages/coding-agent/src/extensions/index.ts:12] `isToolSearchTool()` 同样比 schema 引用。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:170]

`CodemodeSettings.mode` 是 `"on" | "only"`, 默认按 `"on"` 处理; `inlineBudget` 是 description 里工具声明的估计 token 预算, 缺省 `DEFAULT_CODEMODE_INLINE_BUDGET = 3000`。[E: packages/coding-agent/src/core/settings-manager.ts:101] [E: packages/coding-agent/src/core/settings-manager.ts:105] [E: packages/coding-agent/src/core/settings-manager.ts:107] [E: packages/coding-agent/src/extensions/codemode/index.ts:23] [E: packages/coding-agent/src/extensions/codemode/tool.ts:154]

`ToolExposure` 五档: `"direct" | "model-only" | "codemode" | "deferred" | "hidden"`。[E: packages/coding-agent/src/core/extensions/types.ts:509] `_getCallableTools()` 只放行 `codemode` / `deferred` 以及当前 active 的 `direct`, 因此两个 `model-only` 工具自己不会进 nested callable。[E: packages/coding-agent/src/core/agent-session.ts:1518] `createCodemodeDescription()` 跳过 `deferred` 名; `isSearchable()` 同时收 `codemode` 与 `deferred`。[E: packages/coding-agent/src/extensions/codemode/tool.ts:242] [E: packages/coding-agent/src/extensions/tool-search/tool.ts:193] MCP 配置的 `"exposure": "codemode"` **映射成** `ToolExposure` `"deferred"`(两种 MCP 模式都让工具离开 description, 只是激活哪把发现工具不同)。[E: packages/coding-agent/src/extensions/mcp/tools.ts:46] 配置别名 `"codemode-deferred"` 归一成 MCP `"codemode"`。[E: packages/coding-agent/src/core/mcp-servers.ts:22] 单工具缺省回落到服务器 `exposure`, 再缺省 `"codemode"`。[E: packages/coding-agent/src/core/mcp-servers.ts:214]

`CodemodeNestedCallStatus` 是 `"running" | "ok" | "error" | "cancelled"`; `CodemodeToolDetails.calls` 是给 TUI 的 nested 行, `fullOutputPath` 是截断后的 spill 文件。[E: packages/coding-agent/src/extensions/codemode/tool.ts:103] [E: packages/coding-agent/src/extensions/codemode/tool.ts:120] [E: packages/coding-agent/src/extensions/codemode/tool.ts:122] 成功脚本的 `store()` 写成 custom entry `codemode-store`。[E: packages/coding-agent/src/extensions/codemode/tool.ts:53]

`ToolSearchToolDetails.loaded` 是本次激活的工具名。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:180] `Bm25Ranker` 默认 `k1=1.2`, `b=0.75`, 按 score 降序截断。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:123] [E: packages/coding-agent/src/extensions/tool-search/tool.ts:124] [E: packages/coding-agent/src/extensions/tool-search/tool.ts:155]

## 控制流

### 1. 扩展装配与 replaceable 名

1. CLI `main()` 把 `builtInExtensions` 放在用户 `extensionFactories` 前面。[E: packages/coding-agent/src/main.ts:575] SDK 需自己 `createCodemodeExtension()` / `createToolSearchExtension()`。[E: packages/coding-agent/src/extensions/codemode/index.ts:31] [E: packages/coding-agent/src/extensions/tool-search/index.ts:12]
2. `llama.cpp` 是 `builtin: true` 但 **不是** replaceable; `codemode`、`tool-search`、`mcp` 三者 `replaceable: true`。[E: packages/coding-agent/src/extensions/index.ts:8] [E: packages/coding-agent/src/extensions/index.ts:11]
3. `omitReplacedExtensions()` 只在 **非 replaceable** 扩展已经注册了同名 tool / command / flag 时丢掉 replaceable 一方(例如第三方注册了 `codemode` 或 `tool_search` 工具)。[E: packages/coding-agent/src/core/resource-loader.ts:120] [E: packages/coding-agent/src/core/resource-loader.ts:131] [E: packages/coding-agent/src/core/resource-loader.ts:135] [E: packages/coding-agent/src/core/resource-loader.ts:149] 匹配的是注册名, 不是扩展 name: 顶替 `tool-search` 扩展要注册工具 `tool_search`。
4. 两个 replaceable 扩展即使同名工具也会都留下, 因为 `taken` 只收集 `!replaceable`。[E: packages/coding-agent/src/core/resource-loader.ts:129]

### 2. 接到 `CodemodeSandbox`

1. `wrapRegisteredTool()` 用 `runner.createToolContext(toolCallId, signal)` 作为 `ctxFactory`, 所以 `execute` 拿到带 `tools` / `executeTool` / `sessionManager` / `modelRegistry` 的 `ExtensionToolContext`。[E: packages/coding-agent/src/core/extensions/wrapper.ts:18] [E: packages/coding-agent/src/core/extensions/wrapper.ts:19] [E: packages/coding-agent/src/core/extensions/runner.ts:961] [E: packages/coding-agent/src/core/extensions/runner.ts:971]
2. `AgentSession` 把 `executeTool` 绑到 `_executeNestedToolCall`。[E: packages/coding-agent/src/core/agent-session.ts:3420] 第一次 nested 调用才 new `NestedToolCallRunner`; nested id 是 `<callerId>/<n>`。[E: packages/coding-agent/src/core/agent-session.ts:708] [E: packages/coding-agent/src/core/nested-tool-calls.ts:188]
3. `_getCallableTools()` = 全部已注册的 `codemode`/`deferred` 工具 + 当前 active 的 `direct` 工具。[E: packages/coding-agent/src/core/agent-session.ts:1518] `getCodemodeCallableTools()` 再滤掉名为 `codemode` 的工具本身。[E: packages/coding-agent/src/extensions/codemode/tool.ts:170]
4. `executeCodemode()` 为每个 callable 工具包一层 sandbox `execute`: 先 push `running` 行, 再 `ctx.executeTool(tool.name, args)`, 把 `structuredContent`(有 `outputSchema` 时, 含 MCP `CallToolResult`)或文本交回脚本; 失败则 `throw`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:363] [E: packages/coding-agent/src/extensions/codemode/execute.ts:310] [E: packages/coding-agent/src/extensions/codemode/execute.ts:312]
5. 然后 `new CodemodeSandbox({ tools, globals, timeoutMs, memoryLimitBytes, wasm, workerUrl })`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:377] `timeoutMs` 来自 `// @options:` 的 `timeout_ms`, 缺省 `Infinity`(覆盖 sandbox 默认 `DEFAULT_TIMEOUT_MS = 300_000`)。[E: packages/coding-agent/src/extensions/codemode/execute.ts:385] [E: packages/codemode/src/runtime/host.ts:22] [E: packages/codemode/src/runtime/host.ts:296] `memoryLimitBytes` 固定 `256 * 1024 * 1024`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:57] [E: packages/coding-agent/src/extensions/codemode/execute.ts:386] wasm 来自 `loadQuickJSWasm(getQuickJSWasmPath())`; worker 来自 `getCodemodeWorkerSpecifier()`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:387] [E: packages/coding-agent/src/extensions/codemode/execute.ts:388]
6. `store` 快照是当前 branch 上所有 `codemode-store` custom entry 从根到叶的 replay。[E: packages/coding-agent/src/extensions/codemode/execute.ts:220] [E: packages/coding-agent/src/extensions/codemode/execute.ts:392] `sandbox.execute(code, { signal, store })` 之后 `sandbox.close()`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:393] [E: packages/coding-agent/src/extensions/codemode/execute.ts:395] VM 语义在 [subsys.codemode.runtime](../codemode/runtime.md) 的 `CodemodeSandbox.execute()`。[E: packages/codemode/src/runtime/host.ts:339]
7. 无 session ctx 时 callable 为空、`load()` 从空 store 起读; `store()` 写入只在提供了 `appendEntry` 时落盘。[E: packages/coding-agent/src/extensions/codemode/execute.ts:345] [E: packages/coding-agent/src/extensions/codemode/execute.ts:392] [E: packages/coding-agent/src/extensions/codemode/execute.ts:409]

### 3. 工具声明收缩 (`prepareLoadout`)

`AgentSession._applyToolLoadout()` 在每次改 active set 时调用各 active 工具的 `prepareLoadout`。[E: packages/coding-agent/src/core/agent-session.ts:1550] `prepareCodemodeLoadout()`:

- `mode === "on"`(默认): 给每个既 declared 又 callable 的工具追加 `Codemode: tools.<id>(args) resolves to …`; codemode 自己的 description 只列出 **非 `direct`** 的 callable 工具。[E: packages/coding-agent/src/extensions/codemode/tool.ts:330] [E: packages/coding-agent/src/extensions/codemode/tool.ts:340]
- `mode === "only"`: description 列出全部 callable; `hiddenDeclarations` 藏起 active `direct` 工具的 request 声明(仍 active / callable, transcript 仍记录)。[E: packages/coding-agent/src/extensions/codemode/tool.ts:359]
- `deferred` 集合永不进入 `createCodemodeDescription()` 的工具段, 所以 MCP 服务器后连不会改写 description。[E: packages/coding-agent/src/extensions/codemode/tool.ts:242] [E: packages/coding-agent/src/extensions/codemode/tool.ts:350] [E: packages/coding-agent/test/tool-search.test.ts:99]
- 非 deferred 段按 namespace 分组, `selectCatalog()` 在 `inlineBudget` 内 round-robin、每组先放最便宜的 section(chars/4); 放不下的组标 `(some tools not listed)` / `(tools not listed)`。[E: packages/coding-agent/src/extensions/codemode/tool.ts:211] [E: packages/coding-agent/src/extensions/codemode/tool.ts:256] [E: packages/coding-agent/test/tool-search.test.ts:86] `listed` 按 exposure 过滤(`on` 时去掉 `direct`), `deferred` 再从 `getExposure()` 收集, 所以 `tool_search` 加载某个工具 **不会** 重写 codemode description。[E: packages/coding-agent/src/extensions/codemode/tool.ts:340] [E: packages/coding-agent/src/extensions/codemode/tool.ts:351]

`constrainedSampling` 用 `CODEMODE_SOURCE_GRAMMAR`, 让能走 grammar 的模型把 `code` 写成 raw 文本而不是 JSON-escaped 字符串。[E: packages/coding-agent/src/extensions/codemode/tool.ts:380]

### 4. `tool_search` 加载 deferred / MCP 工具

`isSearchable()` 接受 `exposure === "codemode" || exposure === "deferred"`。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:193] `searchAndLoad()` 从 `getAllTools()` 里挑 searchable 且尚未 active 的候选, BM25 排序后 `setActiveTools([...active, ...matches])`。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:206] [E: packages/coding-agent/src/extensions/tool-search/tool.ts:209] 默认 `limit` 是 8。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:21] description 是固定的 `TOOL_SEARCH_DESCRIPTION`, **不列举** 可搜索工具, 所以 MCP 连上也不会改这段文本。[E: packages/coding-agent/src/extensions/tool-search/tool.ts:220] [E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:837]

MCP 扩展 `ensureDiscoveryActive()`: 配置里有 MCP `"codemode"` 就激活 `codemode`(除非 `autoEnableCodemode === false`); 有 MCP `"deferred"` 就激活 `tool_search`。[E: packages/coding-agent/src/extensions/mcp/index.ts:473] [E: packages/coding-agent/src/extensions/mcp/index.ts:474] [E: packages/coding-agent/src/extensions/mcp/index.ts:482] [E: packages/coding-agent/src/extensions/mcp/index.ts:485] 因为 MCP `"codemode"` 已映射成 `ToolExposure` `"deferred"`, `tool_search` 也能加载默认 MCP 工具; 测试覆盖「deferred MCP → 自动激活 `tool_search` 且 load 写入 transcript, `/tree`/resume/fork 可复原」。[E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:822] [E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:835]

脚本侧 `searchTools()` / `describeTool()` / `describeNamespace()` 是 sandbox **globals**(`spread: true`), 只在当前 callable 集合上 `rank()` 后返回名字, **不** `setActiveTools`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:460] [E: packages/coding-agent/src/extensions/codemode/execute.ts:461] [E: packages/coding-agent/src/extensions/codemode/execute.ts:478]

### 5. Nested 记录与 TUI

`NestedToolCallRunner` 发出带 `parentToolCallId` 的 `tool_execution_*`; 模型签发的 tool result 上挂 `nestedCalls`(上限 256 次, 每调用参数 8KiB, 合计 32KiB, error 500 字)。[E: packages/coding-agent/src/core/nested-tool-calls.ts:27] [E: packages/coding-agent/src/core/nested-tool-calls.ts:28] [E: packages/coding-agent/src/core/nested-tool-calls.ts:29] [E: packages/coding-agent/src/core/nested-tool-calls.ts:30] `AgentSession` 在 `toolResult` `message_start` 时 `takeRecord()` 写进 message。[E: packages/coding-agent/src/core/agent-session.ts:1079] [E: packages/coding-agent/src/core/agent-session.ts:1080] 渲染器把 nested 画在 **同一** `codemode` 行里(代码预览 10 行, 折叠最多 8 条 nested, 输出 5 个 visual line), 因为这些调用从未作为模型 tool call 发出。[E: packages/coding-agent/src/extensions/codemode/renderer.ts:18] [E: packages/coding-agent/src/extensions/codemode/renderer.ts:19] [E: packages/coding-agent/src/extensions/codemode/renderer.ts:20] [E: packages/coding-agent/src/extensions/codemode/renderer.ts:100]

## 输出上限与 error recovery hints

两层 cap, 不要混:

| 层 | 上限 | 作用 |
|---|---|---|
| VM prelude (`pi-codemode`) | `MAX_OUTPUT_CHARS = 16 MiB`, `MAX_OUTPUT_ITEMS = 100_000` | `text()` / `image()` / `console.*` 超过则脚本失败; 权威见 [subsys.codemode.runtime](../codemode/runtime.md) [E: packages/codemode/src/runtime/prelude-source.ts:36] [E: packages/codemode/src/runtime/prelude-source.ts:37] |
| coding-agent `truncateOutput` | 默认 `max_output_tokens = 10_000`(chars/4), 可被 `// @options:` 覆盖 | 合并文本超预算则头尾保留并 spill 到 `pi-codemode-*.txt` [E: packages/coding-agent/src/extensions/codemode/execute.ts:233] [E: packages/coding-agent/src/extensions/codemode/execute.ts:283] [E: packages/coding-agent/src/extensions/codemode/execute.ts:423] |
| VM heap | `CODEMODE_MEMORY_LIMIT_BYTES = 256 MiB` | 超限在脚本内 `InternalError: out of memory` [E: packages/coding-agent/src/extensions/codemode/execute.ts:57] [E: packages/coding-agent/test/suite/agent-session-codemode.test.ts:425] |
| `store()` | `MAX_STORE_VALUE_CHARS` / `MAX_STORE_TOTAL_CHARS`(runtime 节点) | 大 JSON 被拒并附 STORE_HINT |
| TUI / nested record | 见 renderer 与 `NESTED_CALL_LIMITS` | 只影响展示与 transcript 摘要 |

失败脚本保留 partial output, 再追加 `Script error:` + `formatError()`。`formatError()` 按 `error.kind` 分成 script stack / `Script timed out` / `Script aborted` / `Script sandbox failed`, 并接上 `Tool calls made before the failure (they are not undone): …`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:245] [E: packages/coding-agent/src/extensions/codemode/execute.ts:251] [E: packages/coding-agent/src/extensions/codemode/execute.ts:254] [E: packages/coding-agent/src/extensions/codemode/execute.ts:257] [E: packages/coding-agent/src/extensions/codemode/execute.ts:414] [E: packages/coding-agent/test/suite/agent-session-codemode.test.ts:357] 非法 `@options` 在进 sandbox 前抛错, 结果 **没有** `Script failed` 头。[E: packages/coding-agent/test/suite/agent-session-codemode.test.ts:409]

VM prelude 在读到不存在的 `tools.<name>` / `models.<member>` 时抛带 Did you mean / Available 的 `TypeError`, `tools` 上还附 `ALL_TOOLS lists every tool; searchTools(query) finds tools by topic.`。[E: packages/codemode/src/runtime/prelude-source.ts:138] [E: packages/codemode/src/runtime/prelude-source.ts:150] coding-agent 的 `models.classify()` / `models.generateImages()` 在进 provider 前检查 context 形状, 错误信息指向 `CODEMODE_DOCS_PATH`。[E: packages/coding-agent/src/extensions/codemode/execute.ts:126] [E: packages/coding-agent/src/extensions/codemode/execute.ts:163] `models.*` 并发上限 4。[E: packages/coding-agent/src/extensions/codemode/execute.ts:51]

## Windows worker load

`getCodemodeWorkerSpecifier()` 按 runtime 三分支:[E: packages/coding-agent/src/config.ts:513]

- `bun-binary` → 相对字符串 `"./src/extensions/codemode/worker.ts"`。[E: packages/coding-agent/src/config.ts:503] 回归 `#10204` 用 Windows 风格 `file:///B:/~BUN/root/config.js` 断言不能走绝对 URL。[E: packages/coding-agent/test/codemode-worker-config.test.ts:7] [E: packages/coding-agent/test/codemode-worker-config.test.ts:8]
- `bundled-node` → `new URL("./codemode-worker.js", moduleUrl)`。[E: packages/coding-agent/src/config.ts:504]
- `unbundled` → `undefined`, `CodemodeSandbox` 回落到包内 `defaultWorkerUrl()`。[E: packages/coding-agent/src/config.ts:505] [E: packages/codemode/src/runtime/host.ts:299]

`worker.ts` 本身只 `import "@earendil-works/pi-codemode/worker"`。[E: packages/coding-agent/src/extensions/codemode/worker.ts:6] Bun 嵌入 wasm 时走 `setEmbeddedQuickJSWasmPath()`; 否则 `createRequire(...).resolve("quickjs-wasi/quickjs.wasm")`。[E: packages/coding-agent/src/config.ts:492]

bundled-node / unbundled 在 Windows 上是否也需要相对 specifier, 本树只有 bun-binary 回归, 标 [U]。

## 设计动机与权衡

把 sandbox 拆到 `execute.lazy.ts` 是为了启动期不加载 QuickJS wasm / worker。[E: packages/coding-agent/src/extensions/codemode/execute.lazy.ts:2] [E: packages/coding-agent/src/extensions/codemode/tool.ts:383] 嵌套调用走完整 tool pipeline, 使 permission / `tool_call` hook / sequential 队列对脚本内 `bash` 与模型直接调用一致。[E: packages/coding-agent/src/core/agent-session.ts:720] description 按 exposure 收缩、deferred 完全不出现, 是为了 MCP 工具数量大时不撑爆 prompt, 同时让 `tool_search` 加载不抖动 `codemode` 的缓存前缀。[E: packages/coding-agent/src/extensions/codemode/tool.ts:340] [E: packages/coding-agent/src/extensions/codemode/tool.ts:351] BM25 无同义词: 查询 `tickets` 排不到带 `issues` 的工具。[E: packages/coding-agent/test/tool-search.test.ts:53]

## Gotcha

- 扩展 name `tool-search` ≠ 工具 name `tool_search`; replaceable 匹配的是后者。
- MCP 默认 `"codemode"` 对模型来说是 `ToolExposure` `"deferred"`: 脚本用 `searchTools()`, 模型用 `tool_search` 都能碰到这批工具。
- `codemode` / `tool_search` 不是 [ref.tools-catalog](../../reference/tools-catalog.md) 的 8 个 `ToolName`; 它们是扩展工具, 默认 inactive。
- 脚本 `return` 的值会当成额外 text 块; `models.generateImages()` 若没 `image(block)` 会追加提示。[E: packages/coding-agent/src/extensions/codemode/execute.ts:412] [E: packages/coding-agent/src/extensions/codemode/execute.ts:419]
- `mode: "only"` 藏声明不卸工具; 看 request 会以为 `read` 没了, 脚本仍能 `tools.read`。

## 跨包边界

- **pi-codemode** (`pkg: codemode`): `CodemodeSandbox`、prelude hints、`MAX_OUTPUT_*`、`parseCodemodeSource`、`CODEMODE_SOURCE_GRAMMAR`。coding-agent 只传入 tools/globals/wasm/worker/timeout/memory/store。详见 [subsys.codemode.runtime](../codemode/runtime.md)、产品面 [surface.codemode.overview](../../surface/codemode/overview.md)。
- **pi-coding-agent MCP**: 连接、exposure、自动激活发现工具。详见 [subsys.coding-agent.mcp](mcp.md)。
- **agent-core**: 不认识 nested call; 会话层 `NestedToolCallRunner` 把它们 recode 到 parent 的 tool result。
- **Extension API**: `registerTool` / `getAllTools` / `setActiveTools` / `appendEntry` 见 [surface.extensions.api](../../surface/extensions/api.md)。`createToolContext()` 见 [subsys.coding-agent.extension-runner](extension-runner.md); 会话绑点见 [subsys.coding-agent.agent-session](agent-session.md)。

## Sources

- packages/coding-agent/src/extensions/index.ts
- packages/coding-agent/src/extensions/codemode/index.ts
- packages/coding-agent/src/extensions/codemode/tool.ts
- packages/coding-agent/src/extensions/codemode/execute.ts
- packages/coding-agent/src/extensions/codemode/execute.lazy.ts
- packages/coding-agent/src/extensions/codemode/renderer.ts
- packages/coding-agent/src/extensions/codemode/worker.ts
- packages/coding-agent/src/extensions/tool-search/index.ts
- packages/coding-agent/src/extensions/tool-search/tool.ts
- packages/coding-agent/src/extensions/mcp/index.ts
- packages/coding-agent/src/extensions/mcp/tools.ts
- packages/coding-agent/src/core/mcp-servers.ts
- packages/coding-agent/src/core/nested-tool-calls.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/extensions/wrapper.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/config.ts
- packages/coding-agent/src/main.ts
- packages/codemode/src/runtime/host.ts
- packages/codemode/src/runtime/prelude-source.ts
- packages/codemode/src/types.ts
- packages/coding-agent/test/codemode-worker-config.test.ts
- packages/coding-agent/test/tool-search.test.ts
- packages/coding-agent/test/suite/agent-session-codemode.test.ts
- packages/coding-agent/test/suite/agent-session-mcp.test.ts
- packages/coding-agent/test/suite/agent-session-tool-orchestration.test.ts

## 相关

- [surface.codemode.overview](../../surface/codemode/overview.md)
- [subsys.codemode.runtime](../codemode/runtime.md)
- [subsys.coding-agent.mcp](mcp.md)
- [surface.extensions.api](../../surface/extensions/api.md)
- [ref.tools-catalog](../../reference/tools-catalog.md)
- [subsys.coding-agent.agent-session](agent-session.md)
- [subsys.coding-agent.extension-runner](extension-runner.md)
