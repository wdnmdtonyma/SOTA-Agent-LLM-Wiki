---
id: spine.extension-lifecycle
title: 扩展生命周期(自扩展主线)
kind: flow
tier: T0
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/loader.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/resource-loader.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/agent-loop.ts
symbols: [discoverAndLoadExtensions, bindCore, ExtensionRuntime, ResourceLoader, AgentSession]
related: [surface.extensions.api, subsys.coding-agent.extension-loader, subsys.coding-agent.extension-runner, ref.coding-agent.extension-events]
evidence: explicit
status: verified
updated: 853a80d26c
---

> `spine.extension-lifecycle` 说明 extension loader、shared runtime、runner binding、event dispatch, 以及 resource loader / `AgentSession` / SDK stream hooks 如何把 extension runner 接入产品会话和 agent runtime。

## 能回答的问题

- `discoverAndLoadExtensions` 会从哪些位置发现 extension entry points?
- extension factory load 时哪些 API 会先写入 extension collections, 哪些 action 会因为 runtime 未绑定而报错?
- `ExtensionRuntime` 为什么先由 loader 创建, 再由 `ExtensionRunner.bindCore` 填入真实动作?
- provider registration 为什么有 load 阶段 queue 和 bind 后 immediate 两种行为?
- resource loader 和 `AgentSession` 怎样把 `LoadExtensionsResult` 变成产品会话中的 runner?
- SDK provider/context hooks 与 agent tool lifecycle hooks 怎样接到 runner?
- event handler 的 dispatch 顺序、可修改结果和短路规则是什么?

```mermaid
flowchart TD
  A["configured paths<br/>project/global discovery"] --> B["discoverAndLoadExtensions"]
  B --> C["loadExtensions"]
  C --> D["loadExtensionsInternal"]
  D --> E["createEventBus if absent"]
  D --> F["createExtensionRuntime if absent"]
  F --> G["runtime action stubs throw before bind"]
  D --> H["loadExtension for each path"]
  H --> I["jiti import default factory"]
  I --> J["createExtension + createExtensionAPI"]
  J --> K["await ExtensionFactory(pi)"]
  K --> L["registrations stored on Extension"]
  K --> M["providers queued on runtime"]
  L --> N["LoadExtensionsResult"]
  M --> N
  N --> O["ResourceLoader stores LoadExtensionsResult"]
  O --> P["AgentSession._buildRuntime"]
  P --> Q["ExtensionRunner(runtime, extensions)"]
  Q --> R["bindCore actions + context actions"]
  R --> S["flush queued providers"]
  R --> T["post-bind provider APIs become immediate"]
  Q --> U["AgentSession / SDK / agent-loop hooks"]
  Q --> V["emit / specialized emitters"]
```

## 端到端步骤

1. 标准发现入口 `discoverAndLoadExtensions(configuredPaths, cwd, agentDir, eventBus)` 会解析 `cwd` 与 `agentDir`, 建立 `allPaths` 和 `seen` 去重集合。[E: packages/coding-agent/src/core/extensions/loader.ts:764] [E: packages/coding-agent/src/core/extensions/loader.ts:765] [E: packages/coding-agent/src/core/extensions/loader.ts:766] [E: packages/coding-agent/src/core/extensions/loader.ts:767] 它先扫描项目级 `cwd/${CONFIG_DIR_NAME}/extensions`, 再扫描全局 `agentDir/extensions`, 最后处理显式 configured paths。[E: packages/coding-agent/src/core/extensions/loader.ts:780] [E: packages/coding-agent/src/core/extensions/loader.ts:781] [E: packages/coding-agent/src/core/extensions/loader.ts:784] [E: packages/coding-agent/src/core/extensions/loader.ts:785] [E: packages/coding-agent/src/core/extensions/loader.ts:788]

2. 目录发现规则是 shallow discovery: 直接文件只接受 `.ts` 或 `.js`, 子目录则通过 `package.json` 的 `pi.extensions`、`index.ts` 或 `index.js` 变成 entry points。[E: packages/coding-agent/src/core/extensions/loader.ts:666] [E: packages/coding-agent/src/core/extensions/loader.ts:667] [E: packages/coding-agent/src/core/extensions/loader.ts:683] [E: packages/coding-agent/src/core/extensions/loader.ts:684] [E: packages/coding-agent/src/core/extensions/loader.ts:687] [E: packages/coding-agent/src/core/extensions/loader.ts:699] [E: packages/coding-agent/src/core/extensions/loader.ts:700] [E: packages/coding-agent/src/core/extensions/loader.ts:701] [E: packages/coding-agent/src/core/extensions/loader.ts:704] [E: packages/coding-agent/src/core/extensions/loader.ts:735] [E: packages/coding-agent/src/core/extensions/loader.ts:742]

3. `loadExtensionsInternal` 为一批 paths 创建或复用同一个 `EventBus` 和同一个 `ExtensionRuntime`, 然后逐个调用 `loadExtension` 收集 `extensions` 与 `errors`, 最后返回同一个 `resolvedRuntime`。[E: packages/coding-agent/src/core/extensions/loader.ts:615] [E: packages/coding-agent/src/core/extensions/loader.ts:616] [E: packages/coding-agent/src/core/extensions/loader.ts:619] [E: packages/coding-agent/src/core/extensions/loader.ts:620] [E: packages/coding-agent/src/core/extensions/loader.ts:622] [E: packages/coding-agent/src/core/extensions/loader.ts:627] [E: packages/coding-agent/src/core/extensions/loader.ts:641] [E: packages/coding-agent/src/core/extensions/loader.ts:644] 因此同一次 load 中的 extension API 共享一个 runtime 是由 `resolvedRuntime` 传入每次 `loadExtension` 推出的结构性结论。[I]

4. loader 导入 extension module 时使用 `jiti.import(extensionPath, { default: true })`, 把 default export 当作 `ExtensionFactory`, 并在非函数时返回 load error。[E: packages/coding-agent/src/core/extensions/loader.ts:510] [E: packages/coding-agent/src/core/extensions/loader.ts:511] [E: packages/coding-agent/src/core/extensions/loader.ts:512] [E: packages/coding-agent/src/core/extensions/loader.ts:579] 每个 factory 会拿到 `createExtensionAPI(extension, runtime, cwd, eventBus)` 产生的 `pi` 对象并被 `await factory(api)` 执行; 类型层声明 factory 可 sync 或 async。[E: packages/coding-agent/src/core/extensions/loader.ts:553] [E: packages/coding-agent/src/core/extensions/loader.ts:554] [E: packages/coding-agent/src/core/extensions/loader.ts:556] [E: packages/coding-agent/src/core/extensions/types.ts:1582]

5. `createExtensionRuntime` 在 loader 阶段创建未绑定 runtime: action methods 先指向 `notInitialized`, 该 stub 会抛出“loading 阶段不能调用 action methods”的错误。[E: packages/coding-agent/src/core/extensions/loader.ts:179] [E: packages/coding-agent/src/core/extensions/loader.ts:180] [E: packages/coding-agent/src/core/extensions/loader.ts:181] [E: packages/coding-agent/src/core/extensions/loader.ts:191] [E: packages/coding-agent/src/core/extensions/loader.ts:198] [E: packages/coding-agent/src/core/extensions/loader.ts:203] `registerTool()` 是 load 阶段允许的特例, 因为它写入 `extension.tools` 后只调用此时为 no-op 的 `runtime.refreshTools()`。[E: packages/coding-agent/src/core/extensions/loader.ts:202] [E: packages/coding-agent/src/core/extensions/loader.ts:289] [E: packages/coding-agent/src/core/extensions/loader.ts:291] [E: packages/coding-agent/src/core/extensions/loader.ts:295]

6. 注册 API 在 load 阶段把贡献写进 `Extension` 的 collections: `on` 写 `handlers`, `registerTool` 写 `tools`, `registerCommand` 写 `commands`, `registerShortcut` 写 `shortcuts`, `registerFlag` 写 `flags`, `registerMessageRenderer` 写 `messageRenderers`。[E: packages/coding-agent/src/core/extensions/loader.ts:282] [E: packages/coding-agent/src/core/extensions/loader.ts:286] [E: packages/coding-agent/src/core/extensions/loader.ts:289] [E: packages/coding-agent/src/core/extensions/loader.ts:291] [E: packages/coding-agent/src/core/extensions/loader.ts:298] [E: packages/coding-agent/src/core/extensions/loader.ts:300] [E: packages/coding-agent/src/core/extensions/loader.ts:313] [E: packages/coding-agent/src/core/extensions/loader.ts:315] [E: packages/coding-agent/src/core/extensions/loader.ts:318] [E: packages/coding-agent/src/core/extensions/loader.ts:328] [E: packages/coding-agent/src/core/extensions/loader.ts:338] [E: packages/coding-agent/src/core/extensions/loader.ts:340]

7. Action methods 不在 load 阶段直接实现业务动作, 而是在 `createExtensionAPI` 中先 `assertActive()` 再委托给 shared runtime; 例如 `sendMessage`、`getActiveTools`、`getCommands`、`setModel` 都是这种模式。[E: packages/coding-agent/src/core/extensions/loader.ts:362] [E: packages/coding-agent/src/core/extensions/loader.ts:268] [E: packages/coding-agent/src/core/extensions/loader.ts:364] [E: packages/coding-agent/src/core/extensions/loader.ts:397] [E: packages/coding-agent/src/core/extensions/loader.ts:399] [E: packages/coding-agent/src/core/extensions/loader.ts:412] [E: packages/coding-agent/src/core/extensions/loader.ts:414] [E: packages/coding-agent/src/core/extensions/loader.ts:417] [E: packages/coding-agent/src/core/extensions/loader.ts:419]

8. Provider contribution 是两阶段的: pre-bind 的 `registerProvider` 把 `{ name, config, extensionPath }` 推入 `pendingProviderRegistrations`, `unregisterProvider` 只从 pending queue 移除同名注册。[E: packages/coding-agent/src/core/extensions/loader.ts:232] [E: packages/coding-agent/src/core/extensions/loader.ts:233] [E: packages/coding-agent/src/core/extensions/loader.ts:238] [E: packages/coding-agent/src/core/extensions/loader.ts:239] 类型层在 `ExtensionRuntimeState` 暴露 pending queue 和 register/unregister 函数槽位, bind 前 queue、bind 后直接写 registry 的行为由 loader 与 runner 的实现给出。[E: packages/coding-agent/src/core/extensions/types.ts:1666] [E: packages/coding-agent/src/core/extensions/types.ts:1681] [E: packages/coding-agent/src/core/extensions/types.ts:1683] [I]

9. `ExtensionRunner.bindCore(actions, contextActions, providerActions)` 会把 action implementations 复制到 shared runtime, 例如 `sendMessage`、`sendUserMessage`、tool getters/setters、`getCommands`、`setModel` 和 thinking level accessors。[E: packages/coding-agent/src/core/extensions/runner.ts:317] [E: packages/coding-agent/src/core/extensions/runner.ts:327] [E: packages/coding-agent/src/core/extensions/runner.ts:328] [E: packages/coding-agent/src/core/extensions/runner.ts:333] [E: packages/coding-agent/src/core/extensions/runner.ts:336] [E: packages/coding-agent/src/core/extensions/runner.ts:337] [E: packages/coding-agent/src/core/extensions/runner.ts:338] [E: packages/coding-agent/src/core/extensions/runner.ts:339] [E: packages/coding-agent/src/core/extensions/runner.ts:340] 它同时绑定 context actions, 让 handler context 的 `model`、`isIdle()`、`signal`、`compact()` 等读取当前 runner 状态。[E: packages/coding-agent/src/core/extensions/runner.ts:343] [E: packages/coding-agent/src/core/extensions/runner.ts:345] [E: packages/coding-agent/src/core/extensions/runner.ts:347] [E: packages/coding-agent/src/core/extensions/runner.ts:351] [E: packages/coding-agent/src/core/extensions/runner.ts:352] [E: packages/coding-agent/src/core/extensions/runner.ts:752] [E: packages/coding-agent/src/core/extensions/runner.ts:766] [E: packages/coding-agent/src/core/extensions/runner.ts:772] [E: packages/coding-agent/src/core/extensions/runner.ts:794]

10. `bindCore` 会 flush load 阶段排队的 provider registrations; 有 `providerActions.registerProvider` 时走注入 action, 否则写 `modelRegistry`, 错误则通过 `emitError` 记录。[E: packages/coding-agent/src/core/extensions/runner.ts:357] [E: packages/coding-agent/src/core/extensions/runner.ts:359] [E: packages/coding-agent/src/core/extensions/runner.ts:360] [E: packages/coding-agent/src/core/extensions/runner.ts:362] [E: packages/coding-agent/src/core/extensions/runner.ts:365] flush 后 runtime 的 `registerProvider`/`unregisterProvider` 被替换成立即生效的函数。[E: packages/coding-agent/src/core/extensions/runner.ts:373] [E: packages/coding-agent/src/core/extensions/runner.ts:394] [E: packages/coding-agent/src/core/extensions/runner.ts:396] [E: packages/coding-agent/src/core/extensions/runner.ts:399] [E: packages/coding-agent/src/core/extensions/runner.ts:408] [E: packages/coding-agent/src/core/extensions/runner.ts:410] [E: packages/coding-agent/src/core/extensions/runner.ts:413]

11. Tool contribution 在 runner 层的可见入口是 `getAllRegisteredTools()`: 它按 extension 顺序遍历 `ext.tools.values()`, 对同名 tool 只保留首个注册, 最后返回去重后的 tool 列表。[E: packages/coding-agent/src/core/extensions/runner.ts:501] [E: packages/coding-agent/src/core/extensions/runner.ts:502] [E: packages/coding-agent/src/core/extensions/runner.ts:503] [E: packages/coding-agent/src/core/extensions/runner.ts:504] [E: packages/coding-agent/src/core/extensions/runner.ts:505] [E: packages/coding-agent/src/core/extensions/runner.ts:510]

12. Command contribution 留在 runner 的 registered command surface: `resolveRegisteredCommands` 收集所有 extension commands, 同名命令获得 `name:occurrence` 形式的 `invocationName`, `getRegisteredCommands()` 与 `getCommand(name)` 都从这个解析结果读取。[E: packages/coding-agent/src/core/extensions/runner.ts:653] [E: packages/coding-agent/src/core/extensions/runner.ts:657] [E: packages/coding-agent/src/core/extensions/runner.ts:658] [E: packages/coding-agent/src/core/extensions/runner.ts:660] [E: packages/coding-agent/src/core/extensions/runner.ts:671] [E: packages/coding-agent/src/core/extensions/runner.ts:682] [E: packages/coding-agent/src/core/extensions/runner.ts:693] [E: packages/coding-agent/src/core/extensions/runner.ts:695] [E: packages/coding-agent/src/core/extensions/runner.ts:702] [E: packages/coding-agent/src/core/extensions/runner.ts:703]

13. `ResourceLoader.reload()` 从 package manager 得到 resolved resources 和 CLI extension sources, 抽取 enabled extension paths, 按 `noExtensions` 决定是否只保留 CLI extensions, 再调用 `loadFinalExtensionSet()` 并把结果保存到 `this.extensionsResult`。[E: packages/coding-agent/src/core/resource-loader.ts:404] [E: packages/coding-agent/src/core/resource-loader.ts:405] [E: packages/coding-agent/src/core/resource-loader.ts:428] [E: packages/coding-agent/src/core/resource-loader.ts:447] [E: packages/coding-agent/src/core/resource-loader.ts:452] [E: packages/coding-agent/src/core/resource-loader.ts:454] [E: packages/coding-agent/src/core/resource-loader.ts:456] [E: packages/coding-agent/src/core/resource-loader.ts:465]

14. `loadFinalExtensionSet()` 的主路径调用 `loadExtensionsCached(extensionPaths, cwd, eventBus)`, 再用同一个 runtime 载入 inline factories 并追加 extensions/errors; 有 pre-trust 结果时, remaining paths 也复用 `preTrustExtensions.runtime`, 最后构造新的 `LoadExtensionsResult`。[E: packages/coding-agent/src/core/resource-loader.ts:578] [E: packages/coding-agent/src/core/resource-loader.ts:579] [E: packages/coding-agent/src/core/resource-loader.ts:580] [E: packages/coding-agent/src/core/resource-loader.ts:581] [E: packages/coding-agent/src/core/resource-loader.ts:582] [E: packages/coding-agent/src/core/resource-loader.ts:599] [E: packages/coding-agent/src/core/resource-loader.ts:603] [E: packages/coding-agent/src/core/resource-loader.ts:618] [E: packages/coding-agent/src/core/resource-loader.ts:621]

15. `AgentSession._buildRuntime()` 从 `this._resourceLoader.getExtensions()` 取 `LoadExtensionsResult`, 把 flag values 写回 shared runtime, 用 `extensions` 和 `runtime` 构造 `ExtensionRunner`, 更新 SDK runner ref, 然后调用 `_bindExtensionCore()`、`_applyExtensionBindings()` 和 `_refreshToolRegistry()`。[E: packages/coding-agent/src/core/agent-session.ts:2781] [E: packages/coding-agent/src/core/agent-session.ts:2784] [E: packages/coding-agent/src/core/agent-session.ts:2788] [E: packages/coding-agent/src/core/agent-session.ts:2789] [E: packages/coding-agent/src/core/agent-session.ts:2790] [E: packages/coding-agent/src/core/agent-session.ts:2796] [E: packages/coding-agent/src/core/agent-session.ts:2798] [E: packages/coding-agent/src/core/agent-session.ts:2799] [E: packages/coding-agent/src/core/agent-session.ts:2805]

16. `AgentSession.bindExtensions()` 是产品层绑定入口: 它写入 UI context、mode、command context actions、error listener 等 bindings, 对当前 runner 应用绑定, emit session start, 并触发 extension-discovered resource 扩展路径合入 resource loader。[E: packages/coding-agent/src/core/agent-session.ts:2439] [E: packages/coding-agent/src/core/agent-session.ts:2440] [E: packages/coding-agent/src/core/agent-session.ts:2442] [E: packages/coding-agent/src/core/agent-session.ts:2446] [E: packages/coding-agent/src/core/agent-session.ts:2455] [E: packages/coding-agent/src/core/agent-session.ts:2458] [E: packages/coding-agent/src/core/agent-session.ts:2459] [E: packages/coding-agent/src/core/agent-session.ts:2460] [E: packages/coding-agent/src/core/agent-session.ts:2468] [E: packages/coding-agent/src/core/agent-session.ts:2483]

17. `_bindExtensionCore()` 给 runtime 注入产品动作: `getCommands()` 合并 extension commands、prompt templates 和 skills; core actions 暴露 active/all tools、set active tools、refresh tools; provider actions 写入 `ModelRegistry` 并刷新当前模型。[E: packages/coding-agent/src/core/agent-session.ts:2542] [E: packages/coding-agent/src/core/agent-session.ts:2549] [E: packages/coding-agent/src/core/agent-session.ts:2556] [E: packages/coding-agent/src/core/agent-session.ts:2563] [E: packages/coding-agent/src/core/agent-session.ts:2566] [E: packages/coding-agent/src/core/agent-session.ts:2602] [E: packages/coding-agent/src/core/agent-session.ts:2604] [E: packages/coding-agent/src/core/agent-session.ts:2605] [E: packages/coding-agent/src/core/agent-session.ts:2648] [E: packages/coding-agent/src/core/agent-session.ts:2648] [E: packages/coding-agent/src/core/agent-session.ts:2656] [E: packages/coding-agent/src/core/agent-session.ts:2656]

18. Extension tools 在 `_refreshToolRegistry()` 中与 SDK custom tools 合并, 过滤后写入 tool definitions, 通过 `wrapRegisteredTools()` 包装为 `AgentTool`, 与 builtin tools 一起写入 `_toolRegistry`, 并按 allowlist、include-all 或新增工具规则更新 active tool names。[E: packages/coding-agent/src/core/agent-session.ts:2672] [E: packages/coding-agent/src/core/agent-session.ts:2673] [E: packages/coding-agent/src/core/agent-session.ts:2679] [E: packages/coding-agent/src/core/agent-session.ts:2691] [E: packages/coding-agent/src/core/agent-session.ts:2694] [E: packages/coding-agent/src/core/agent-session.ts:2714] [E: packages/coding-agent/src/core/agent-session.ts:2715] [E: packages/coding-agent/src/core/agent-session.ts:2726] [E: packages/coding-agent/src/core/agent-session.ts:2728] [E: packages/coding-agent/src/core/agent-session.ts:2730] [E: packages/coding-agent/src/core/agent-session.ts:2742] [E: packages/coding-agent/src/core/agent-session.ts:2748] [E: packages/coding-agent/src/core/agent-session.ts:2754]

19. SDK 创建 `extensionRunnerRef`, 在 provider `onPayload` 中调用 runner 的 `before_provider_request`, 在 `onResponse` 中 emit `after_provider_response`, 在 `transformContext` 中调用 `runner.emitContext(messages)`; 创建 `AgentSession` 时同一个 ref 被传入 session, 让 `_buildRuntime()` 更新后的 runner 能被 stream hooks 读取。[E: packages/coding-agent/src/core/sdk.ts:304] [E: packages/coding-agent/src/core/sdk.ts:343] [E: packages/coding-agent/src/core/sdk.ts:345] [E: packages/coding-agent/src/core/sdk.ts:348] [E: packages/coding-agent/src/core/sdk.ts:350] [E: packages/coding-agent/src/core/sdk.ts:355] [E: packages/coding-agent/src/core/sdk.ts:362] [E: packages/coding-agent/src/core/sdk.ts:363] [E: packages/coding-agent/src/core/sdk.ts:365] [E: packages/coding-agent/src/core/sdk.ts:388] [E: packages/coding-agent/src/core/sdk.ts:400]

20. Agent runtime 会把 SDK/provider hooks 和 context transform 传入 loop config, agent loop 在 LLM conversion 前调用 `transformContext()`; 因此 `emitContext()` 位于 agent loop 的 provider request 前置上下文阶段。[E: packages/agent/src/agent.ts:452] [E: packages/agent/src/agent.ts:453] [E: packages/agent/src/agent.ts:458] [E: packages/agent/src/agent.ts:459] [E: packages/agent/src/agent.ts:473] [E: packages/agent/src/agent-loop.ts:287] [E: packages/agent/src/agent-loop.ts:288] [E: packages/agent/src/agent-loop.ts:289] [I]

21. Tool lifecycle hook 的 runner 侧语义可核到 `emitToolCall` 和 `emitToolResult`: `emitToolCall` 遇到 `block` result 会立即返回并阻止后续 handler; `emitToolResult` 的返回值只包含可覆盖的 `content`、`details`、`isError` 字段。[E: packages/coding-agent/src/core/extensions/runner.ts:982] [E: packages/coding-agent/src/core/extensions/runner.ts:991] [E: packages/coding-agent/src/core/extensions/runner.ts:994] [E: packages/coding-agent/src/core/extensions/runner.ts:995] [E: packages/coding-agent/src/core/extensions/runner.ts:996] [E: packages/coding-agent/src/core/extensions/runner.ts:974] [E: packages/coding-agent/src/core/extensions/runner.ts:975] [E: packages/coding-agent/src/core/extensions/runner.ts:976] [E: packages/coding-agent/src/core/extensions/runner.ts:977]

22. `AgentSession._installAgentToolHooks()` 把 `agent.beforeToolCall` 接到 `runner.emitToolCall()`、把 `agent.afterToolCall` 接到 `runner.emitToolResult()`; agent loop config 再传递这两个 hooks, 并在工具执行前后调用它们。[E: packages/coding-agent/src/core/agent-session.ts:488] [E: packages/coding-agent/src/core/agent-session.ts:489] [E: packages/coding-agent/src/core/agent-session.ts:495] [E: packages/coding-agent/src/core/agent-session.ts:509] [E: packages/coding-agent/src/core/agent-session.ts:510] [E: packages/coding-agent/src/core/agent-session.ts:514] [E: packages/coding-agent/src/core/agent-session.ts:534] [E: packages/coding-agent/src/core/agent-session.ts:530] [E: packages/agent/src/agent.ts:458] [E: packages/agent/src/agent.ts:459] [E: packages/agent/src/agent-loop.ts:617] [E: packages/agent/src/agent-loop.ts:618] [E: packages/agent/src/agent-loop.ts:724] [E: packages/agent/src/agent-loop.ts:735]

23. 通用 event dispatch 由 `ExtensionRunner.emit` 顺序遍历 extensions 和同 event type 的 handlers, 每次调用共享 `createContext()` 生成的 context; handler 抛错会转成 `ExtensionError` listener 事件而不直接抛给 caller。[E: packages/coding-agent/src/core/extensions/runner.ts:851] [E: packages/coding-agent/src/core/extensions/runner.ts:852] [E: packages/coding-agent/src/core/extensions/runner.ts:855] [E: packages/coding-agent/src/core/extensions/runner.ts:856] [E: packages/coding-agent/src/core/extensions/runner.ts:859] [E: packages/coding-agent/src/core/extensions/runner.ts:861] [E: packages/coding-agent/src/core/extensions/runner.ts:869] [E: packages/coding-agent/src/core/extensions/runner.ts:872] session-before 类 event 可返回 cancel result, 且 cancel 为 true 时立即短路返回。[E: packages/coding-agent/src/core/extensions/runner.ts:842] [E: packages/coding-agent/src/core/extensions/runner.ts:863] [E: packages/coding-agent/src/core/extensions/runner.ts:865] [E: packages/coding-agent/src/core/extensions/runner.ts:866]

24. 专用 event emitter 负责可变或可聚合事件: `emitMessageEnd` 允许 handler 替换同 role message, `emitToolResult` 允许改 `content`、`details`、`isError`, `emitContext` 把 messages clone 后链式替换, `emitBeforeProviderRequest` 链式替换 provider payload, `emitInput` 可 transform 输入或用 `handled` 短路。[E: packages/coding-agent/src/core/extensions/runner.ts:885] [E: packages/coding-agent/src/core/extensions/runner.ts:896] [E: packages/coding-agent/src/core/extensions/runner.ts:900] [E: packages/coding-agent/src/core/extensions/runner.ts:909] [E: packages/coding-agent/src/core/extensions/runner.ts:927] [E: packages/coding-agent/src/core/extensions/runner.ts:941] [E: packages/coding-agent/src/core/extensions/runner.ts:945] [E: packages/coding-agent/src/core/extensions/runner.ts:949] [E: packages/coding-agent/src/core/extensions/runner.ts:974] [E: packages/coding-agent/src/core/extensions/runner.ts:1034] [E: packages/coding-agent/src/core/extensions/runner.ts:1036] [E: packages/coding-agent/src/core/extensions/runner.ts:1047] [E: packages/coding-agent/src/core/extensions/runner.ts:1066] [E: packages/coding-agent/src/core/extensions/runner.ts:1080] [E: packages/coding-agent/src/core/extensions/runner.ts:1081] [E: packages/coding-agent/src/core/extensions/runner.ts:1246] [E: packages/coding-agent/src/core/extensions/runner.ts:1267] [E: packages/coding-agent/src/core/extensions/runner.ts:1269]

25. `before_agent_start` 在 runner 侧接收 prompt、images、system prompt 和 system prompt options; `AgentSession.prompt()` 在构造 user/custom messages 后调用它, 将返回的 custom messages 追加进 messages, 并把返回的 system prompt 写到 agent state。[E: packages/coding-agent/src/core/extensions/runner.ts:1131] [E: packages/coding-agent/src/core/extensions/runner.ts:1155] [E: packages/coding-agent/src/core/extensions/runner.ts:1166] [E: packages/coding-agent/src/core/extensions/runner.ts:1169] [E: packages/coding-agent/src/core/extensions/runner.ts:1170] [E: packages/coding-agent/src/core/extensions/runner.ts:1187] [E: packages/coding-agent/src/core/agent-session.ts:1278] [E: packages/coding-agent/src/core/agent-session.ts:1281] [E: packages/coding-agent/src/core/agent-session.ts:1282] [E: packages/coding-agent/src/core/agent-session.ts:1285] [E: packages/coding-agent/src/core/agent-session.ts:1287] [E: packages/coding-agent/src/core/agent-session.ts:1299] [E: packages/coding-agent/src/core/agent-session.ts:1301]

## 关键决策点

- Extension loading 分成 registration phase 和 bound runtime phase: factory load 期间适合声明 handlers/tools/commands/flags/shortcuts/renderers; action methods 在 `bindCore` 前只是 runtime stub 或 runtime delegation。[E: packages/coding-agent/src/core/extensions/loader.ts:180] [E: packages/coding-agent/src/core/extensions/loader.ts:181] [E: packages/coding-agent/src/core/extensions/loader.ts:280] [E: packages/coding-agent/src/core/extensions/loader.ts:282] [E: packages/coding-agent/src/core/extensions/loader.ts:362] [E: packages/coding-agent/src/core/extensions/runner.ts:317]
- Provider registration 被实现成 pre-bind queue、post-bind immediate; “为什么这样设计”属于从 queue flush 和 bind 后替换函数推导出的结构性解释。[E: packages/coding-agent/src/core/extensions/loader.ts:233] [E: packages/coding-agent/src/core/extensions/runner.ts:357] [E: packages/coding-agent/src/core/extensions/runner.ts:394] [I]
- Extension context 的 getters 和 methods 每次访问都会 `assertActive`, reload 或 session replacement 可让旧 runtime/ctx 变 stale 并阻止继续使用 captured context。[E: packages/coding-agent/src/core/extensions/runner.ts:593] [E: packages/coding-agent/src/core/extensions/runner.ts:598] [E: packages/coding-agent/src/core/extensions/runner.ts:602] [E: packages/coding-agent/src/core/extensions/runner.ts:728] [E: packages/coding-agent/src/core/extensions/runner.ts:772] [E: packages/coding-agent/src/core/extensions/runner.ts:816] [E: packages/coding-agent/src/core/extensions/runner.ts:836]
- 产品层接入点集中在 `ResourceLoader` 持有 `LoadExtensionsResult`, `AgentSession` 构造并绑定 `ExtensionRunner`, SDK/agent loop 转发 provider/context/tool hooks; 本节点把这些额外源码纳入 source 后可闭环到 verified。[E: packages/coding-agent/src/core/resource-loader.ts:465] [E: packages/coding-agent/src/core/agent-session.ts:2788] [E: packages/coding-agent/src/core/sdk.ts:348] [E: packages/agent/src/agent-loop.ts:289] [E: packages/agent/src/agent-loop.ts:618]

## 未证实项

- 无。

## 指向 T1/T2 深挖

- [surface.extensions.api](../surface/extensions/api.md): `ExtensionAPI`, `ExtensionFactory`, `ExtensionContext` 的 public surface 和类型约束。
- [subsys.coding-agent.extension-loader](../subsystems/coding-agent/extension-loader.md): jiti import, cache, manifest discovery, inline factory load 的 loader 细节。
- [subsys.coding-agent.extension-runner](../subsystems/coding-agent/extension-runner.md): `ExtensionRunner` 的 handler dispatch、context construction、error reporting 和 mode/UI binding。
- [ref.coding-agent.extension-events](../reference/extension-events.md): `ExtensionEvent` union 中每个 event type 的 catalog。

## Sources

- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/sdk.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts

## 相关

- [surface.extensions.api](../surface/extensions/api.md)
- [subsys.coding-agent.extension-loader](../subsystems/coding-agent/extension-loader.md)
- [subsys.coding-agent.extension-runner](../subsystems/coding-agent/extension-runner.md)
- [ref.coding-agent.extension-events](../reference/extension-events.md)
