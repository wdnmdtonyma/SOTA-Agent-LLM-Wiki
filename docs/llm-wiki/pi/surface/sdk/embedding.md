---
id: surface.sdk.embedding
title: SDK 嵌入(createAgentSession)
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/package.json
  - packages/coding-agent/src/client/index.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/src/index.ts
  - packages/coding-agent/docs/sdk.md
symbols:
  - createAgentSession
  - AgentSession
  - SessionManager
  - CompactionModelOverride
related:
  - surface.sdk.remote-session
  - subsys.coding-agent.agent-session
  - surface.modes.rpc
  - subsys.coding-agent.http-dispatcher
evidence: explicit
status: verified
updated: 71dca871bc
---

> `surface.sdk.embedding` 是 `@earendil-works/pi-coding-agent` 给外部应用嵌入 pi agent 的编程入口:调用方用 `createAgentSession()` 创建一个 `AgentSession`,再通过 `prompt()`、`subscribe()`、模型/工具/会话选项把 pi 接入自定义 UI、自动化流程或测试 harness。

## 能回答的问题

- `createAgentSession()` 默认会创建哪些 cwd、agentDir、auth、model、settings、session 和 resource loader 依赖?
- SDK 嵌入时怎样选择模型、thinking level、工具 allowlist/denylist 和自定义工具?
- `AgentSession` 暴露哪些面向嵌入方的 prompt、event、dispose API?
- `SessionManager.create()` 和 `SessionManager.inMemory()` 对持久化行为有什么区别?
- SDK 嵌入和 RPC mode 的关系是什么,什么时候应选择 `AgentSessionRuntime` 或 RPC?
- `sdk.ts` 注释里的 `continueSession` 示例为什么不能直接当成当前 interface 字段?

## 包入口与导出面

SDK 被主包 `@earendil-works/pi-coding-agent` 直接导出,不是独立 npm 包:开发文档的安装命令安装主包,并说明 SDK 包含在主包中。[E: packages/coding-agent/docs/sdk.md:36][E: packages/coding-agent/docs/sdk.md:39][E: packages/coding-agent/docs/sdk.md:42] `packages/coding-agent/src/index.ts` 把 `createAgentSession`、`CreateAgentSessionOptions`、`CreateAgentSessionResult`、`AgentSessionRuntime`、`createAgentSessionRuntime`、`createAgentSessionServices`、工具 factory 和 `PromptTemplate` 从 `./core/sdk.ts` 重新导出。[E: packages/coding-agent/src/index.ts:204][E: packages/coding-agent/src/index.ts:209][E: packages/coding-agent/src/index.ts:210][E: packages/coding-agent/src/index.ts:215][E: packages/coding-agent/src/index.ts:217][E: packages/coding-agent/src/index.ts:218][E: packages/coding-agent/src/index.ts:219][E: packages/coding-agent/src/index.ts:230] 同一个入口也导出 `AgentSession`、`SessionManager` 和 `CompactionModelOverride`,所以 SDK 用户可以从主包同时拿到 factory、session class、session storage 管理器和 per-model compaction override 类型。[E: packages/coding-agent/src/index.ts:16][E: packages/coding-agent/src/index.ts:252][E: packages/coding-agent/src/index.ts:259]

开发文档把 SDK 用途定位为 programmatic access:嵌入其他应用、构建自定义界面、接入自动化工作流、创建会 spawn sub-agent 的自定义工具,或程序化测试 agent 行为。[E: packages/coding-agent/docs/sdk.md:5][E: packages/coding-agent/docs/sdk.md:8][E: packages/coding-agent/docs/sdk.md:9][E: packages/coding-agent/docs/sdk.md:10][E: packages/coding-agent/docs/sdk.md:11][E: packages/coding-agent/docs/sdk.md:12]

## createAgentSession 的输入选项

`CreateAgentSessionOptions` 是单 session factory 的主要配置面:它允许传入 `cwd`、`agentDir`、`modelRuntime`、`model`、`thinkingLevel`、`scopedModels`、`noTools`、`tools`、`excludeTools`、`customTools`、`resourceLoader`、`sessionManager`、`settingsManager` 和 `sessionStartEvent`。没有 `authStorage` / `modelRegistry` 字段。[E: packages/coding-agent/src/core/sdk.ts:39][E: packages/coding-agent/src/core/sdk.ts:41][E: packages/coding-agent/src/core/sdk.ts:43][E: packages/coding-agent/src/core/sdk.ts:46][E: packages/coding-agent/src/core/sdk.ts:49][E: packages/coding-agent/src/core/sdk.ts:51][E: packages/coding-agent/src/core/sdk.ts:53][E: packages/coding-agent/src/core/sdk.ts:62][E: packages/coding-agent/src/core/sdk.ts:72][E: packages/coding-agent/src/core/sdk.ts:74][E: packages/coding-agent/src/core/sdk.ts:76][E: packages/coding-agent/src/core/sdk.ts:79][E: packages/coding-agent/src/core/sdk.ts:82][E: packages/coding-agent/src/core/sdk.ts:85][E: packages/coding-agent/src/core/sdk.ts:87]

`createAgentSession(options = {})` 先解析 `cwd`:优先使用 `options.cwd`,否则用传入 `sessionManager.getCwd()`,再否则用 `process.cwd()`;`agentDir` 只有调用方显式传入 `options.agentDir` 时才 `resolvePath`,否则用默认 agent dir resolver。[E: packages/coding-agent/src/core/sdk.ts:174][E: packages/coding-agent/src/core/sdk.ts:175] 缺省 `modelRuntime` 时 factory 调 `ModelRuntime.create({ authPath, modelsPath })`;这两个 path 仅在显式传入 `agentDir` 时设为 `agentDir/auth.json` 与 `agentDir/models.json`,否则传 `undefined` 让 runtime 用自己的默认路径。[E: packages/coding-agent/src/core/sdk.ts:178][E: packages/coding-agent/src/core/sdk.ts:179][E: packages/coding-agent/src/core/sdk.ts:180]

settings/session/resource loading 也有默认构造:缺省 `SettingsManager.create(cwd, agentDir)`,缺省 `SessionManager.create(cwd, getDefaultSessionDir(cwd, agentDir))`,缺省 `DefaultResourceLoader({ cwd, agentDir, settingsManager })` 并立即 `reload()`。[E: packages/coding-agent/src/core/sdk.ts:182][E: packages/coding-agent/src/core/sdk.ts:183][E: packages/coding-agent/src/core/sdk.ts:185][E: packages/coding-agent/src/core/sdk.ts:186][E: packages/coding-agent/src/core/sdk.ts:187] 开发文档也把 `createAgentSession()` 描述为通过 `ResourceLoader` 提供 extensions、skills、prompt templates、themes 和 context files,未传入时使用标准 discovery 的 `DefaultResourceLoader`。[E: packages/coding-agent/docs/sdk.md:48][E: packages/coding-agent/docs/sdk.md:50]

## 模型与 thinking 恢复

`createAgentSession()` 会先从 `SessionManager.buildSessionContext()` 判断是否已有消息,再检查当前 branch 是否包含 `thinking_level_change` entry。[E: packages/coding-agent/src/core/sdk.ts:192][E: packages/coding-agent/src/core/sdk.ts:193][E: packages/coding-agent/src/core/sdk.ts:194] 如果调用方未传 `model` 且已有 session model,factory 用 `modelRuntime.getModel(provider, modelId)` 找回模型,并要求 `modelRuntime.hasConfiguredAuth(restoredModel.provider)`;恢复失败时生成 `modelFallbackMessage`。[E: packages/coding-agent/src/core/sdk.ts:200][E: packages/coding-agent/src/core/sdk.ts:201][E: packages/coding-agent/src/core/sdk.ts:202][E: packages/coding-agent/src/core/sdk.ts:206]

没有可用 model 时,`findInitialModel({ scopedModels: [], isContinuing, defaultProvider, defaultModelId, defaultThinkingLevel, modelThinkingLevels, modelRuntime })` 选择初始模型;如果仍无模型,`modelFallbackMessage` 会变成无可用模型的引导文本。[E: packages/coding-agent/src/core/sdk.ts:212][E: packages/coding-agent/src/core/sdk.ts:213][E: packages/coding-agent/src/core/sdk.ts:219][E: packages/coding-agent/src/core/sdk.ts:221][E: packages/coding-agent/src/core/sdk.ts:223] `thinkingLevel` 优先用显式 options;已有 session 时,如果 branch 有 thinking entry 就用 session context 中的 level,否则用 settings default 或 `DEFAULT_THINKING_LEVEL`。[E: packages/coding-agent/src/core/sdk.ts:229][E: packages/coding-agent/src/core/sdk.ts:232][E: packages/coding-agent/src/core/sdk.ts:233][E: packages/coding-agent/src/core/sdk.ts:235] 无 options 且无 existing-session 时,会先查 `settingsManager.getModelThinkingLevel(model.provider, model.id)` 的 per-model override,再回落到全局 default。[E: packages/coding-agent/src/core/sdk.ts:239][E: packages/coding-agent/src/core/sdk.ts:240][E: packages/coding-agent/src/core/sdk.ts:245] 最终按模型能力 clamp,无模型时强制 `"off"`。[E: packages/coding-agent/src/core/sdk.ts:250][E: packages/coding-agent/src/core/sdk.ts:251][E: packages/coding-agent/src/core/sdk.ts:253]

## 工具装配与门控

SDK 的初始 active tool names 是 `options.tools ?? (options.noTools ? [] : (settingsManager.getDefaultTools() ?? ["read", "bash", "edit", "write"]))`,再按 `excludeTools` 过滤;不是无条件固定这四个名字。[E: packages/coding-agent/src/core/sdk.ts:256][E: packages/coding-agent/src/core/sdk.ts:257][E: packages/coding-agent/src/core/sdk.ts:261][E: packages/coding-agent/src/core/sdk.ts:262][E: packages/coding-agent/src/core/sdk.ts:263] `options.tools` 是 allowlist:传入时只有 listed names 初始启用;`noTools: "all"` 会让 `allowedToolNames` 为空数组。[E: packages/coding-agent/src/core/sdk.ts:258][E: packages/coding-agent/src/core/sdk.ts:259] `noTools: "builtin"` 是已声明的 suppression mode;在 factory 里它不会设置 allowlist,但会让 initial active built-ins 为空,随后 `AgentSession` 以 `includeAllExtensionTools: true` 刷新工具 registry 时会把 extension/custom tools 加回 active names。[E: packages/coding-agent/src/core/sdk.ts:62][E: packages/coding-agent/src/core/sdk.ts:258][E: packages/coding-agent/src/core/sdk.ts:259][E: packages/coding-agent/src/core/agent-session.ts:402][E: packages/coding-agent/src/core/agent-session.ts:403][E: packages/coding-agent/src/core/agent-session.ts:2772][E: packages/coding-agent/src/core/agent-session.ts:2773][E: packages/coding-agent/src/core/agent-session.ts:2774]

`AgentSession` 构造函数接收 `customTools`、`initialActiveToolNames`、`allowedToolNames`、`excludedToolNames` 等 config,保存后立即调用 `_buildRuntime({ activeToolNames, includeAllExtensionTools: true })`。[E: packages/coding-agent/src/core/agent-session.ts:380][E: packages/coding-agent/src/core/agent-session.ts:386][E: packages/coding-agent/src/core/agent-session.ts:386][E: packages/coding-agent/src/core/agent-session.ts:390][E: packages/coding-agent/src/core/agent-session.ts:391][E: packages/coding-agent/src/core/agent-session.ts:402][E: packages/coding-agent/src/core/agent-session.ts:402][E: packages/coding-agent/src/core/agent-session.ts:404] `_buildRuntime()` 从 settings 读取 image auto resize、shell command prefix 和 shell path,然后用 `createAllToolDefinitions(this._cwd, { read, bash })` 创建 built-in tool definitions。[E: packages/coding-agent/src/core/agent-session.ts:2794][E: packages/coding-agent/src/core/agent-session.ts:2792][E: packages/coding-agent/src/core/agent-session.ts:2793][E: packages/coding-agent/src/core/agent-session.ts:2794][E: packages/coding-agent/src/core/agent-session.ts:2802][E: packages/coding-agent/src/core/agent-session.ts:2803][E: packages/coding-agent/src/core/agent-session.ts:2804]

`_refreshToolRegistry()` 会把 extension registered tools 与 SDK `customTools` 合并,给 SDK custom tool 生成 `<sdk:name>` 的 synthetic source info,并按 allowlist/denylist 过滤;之后 built-in 与 extension/custom tools 都通过 `wrapRegisteredTools()` 进入 agent tool registry。[E: packages/coding-agent/src/core/agent-session.ts:2697][E: packages/coding-agent/src/core/agent-session.ts:2699][E: packages/coding-agent/src/core/agent-session.ts:2709][E: packages/coding-agent/src/core/agent-session.ts:2703][E: packages/coding-agent/src/core/agent-session.ts:2705][E: packages/coding-agent/src/core/agent-session.ts:2707][E: packages/coding-agent/src/core/agent-session.ts:2709][E: packages/coding-agent/src/core/agent-session.ts:2745][E: packages/coding-agent/src/core/agent-session.ts:2746][E: packages/coding-agent/src/core/agent-session.ts:2756][E: packages/coding-agent/src/core/agent-session.ts:2757][E: packages/coding-agent/src/core/agent-session.ts:2760]

## AgentSession 运行边界

`createAgentSession()` 创建 `Agent` 时传入空 system prompt、选出的 model/thinking level、空 tools,并把 `convertToLlm`、`streamFn`、provider request/response extension hooks、session id、context transform、queue modes、transport、thinking budgets 和 retry delay 等运行参数绑定到 agent core。[E: packages/coding-agent/src/core/sdk.ts:306][E: packages/coding-agent/src/core/sdk.ts:307][E: packages/coding-agent/src/core/sdk.ts:308][E: packages/coding-agent/src/core/sdk.ts:309][E: packages/coding-agent/src/core/sdk.ts:310][E: packages/coding-agent/src/core/sdk.ts:311][E: packages/coding-agent/src/core/sdk.ts:313][E: packages/coding-agent/src/core/sdk.ts:314][E: packages/coding-agent/src/core/sdk.ts:343][E: packages/coding-agent/src/core/sdk.ts:350][E: packages/coding-agent/src/core/sdk.ts:361][E: packages/coding-agent/src/core/sdk.ts:362][E: packages/coding-agent/src/core/sdk.ts:367][E: packages/coding-agent/src/core/sdk.ts:368][E: packages/coding-agent/src/core/sdk.ts:369][E: packages/coding-agent/src/core/sdk.ts:370][E: packages/coding-agent/src/core/sdk.ts:371]

`streamFn` 走 `modelRuntime.streamSimple(model, context, ...)`,合并 provider retry、HTTP idle timeout、WebSocket connect timeout,再用 `transformHeaders` 调 `mergeProviderAttributionHeaders(model, settingsManager, options?.sessionId, requestHeaders)`,若 extension runner 注册了 `before_provider_headers` 再 overlay。[E: packages/coding-agent/src/core/sdk.ts:314][E: packages/coding-agent/src/core/sdk.ts:324][E: packages/coding-agent/src/core/sdk.ts:328][E: packages/coding-agent/src/core/sdk.ts:330][E: packages/coding-agent/src/core/sdk.ts:331][E: packages/coding-agent/src/core/sdk.ts:337] 这意味着 SDK 嵌入不是绕过 provider/auth/settings 的裸 `Agent`;它使用 coding-agent 的产品层默认运行策略来包住 `pi-agent-core` 的 `Agent`。[I]

`AgentSession` 是嵌入方拿到的主要对象:开发文档列出 `prompt()`、`steer()`、`followUp()`、`subscribe()`、session id/file、model/thinking control、state access、tree navigation、compaction、abort 和 `dispose()`。[E: packages/coding-agent/docs/sdk.md:66][E: packages/coding-agent/docs/sdk.md:68][E: packages/coding-agent/docs/sdk.md:73][E: packages/coding-agent/docs/sdk.md:76][E: packages/coding-agent/docs/sdk.md:77][E: packages/coding-agent/docs/sdk.md:80][E: packages/coding-agent/docs/sdk.md:83][E: packages/coding-agent/docs/sdk.md:84][E: packages/coding-agent/docs/sdk.md:87][E: packages/coding-agent/docs/sdk.md:88][E: packages/coding-agent/docs/sdk.md:93][E: packages/coding-agent/docs/sdk.md:96][E: packages/coding-agent/docs/sdk.md:100][E: packages/coding-agent/docs/sdk.md:103][E: packages/coding-agent/docs/sdk.md:107][E: packages/coding-agent/docs/sdk.md:110] `navigateTree()` 在 agent 正在 response、manual/auto compaction 或另一次 tree navigation 进行中时 **reject**,即使 `summarize: false` 也不会排队或返回 `{ cancelled: true }`。[E: packages/coding-agent/docs/sdk.md:116][E: packages/coding-agent/src/core/agent-session.ts:3140][E: packages/coding-agent/src/core/agent-session.ts:3143] 源码里 `prompt()` 先尝试执行 extension command,再处理 input hook、skill/prompt template expansion、streaming queue behavior 和 model/API key validation,并在 streaming 且未指定 `streamingBehavior` 时抛错。[E: packages/coding-agent/src/core/agent-session.ts:1175][E: packages/coding-agent/src/core/agent-session.ts:1184][E: packages/coding-agent/src/core/agent-session.ts:1201][E: packages/coding-agent/src/core/agent-session.ts:1214][E: packages/coding-agent/src/core/agent-session.ts:1214][E: packages/coding-agent/src/core/agent-session.ts:1220][E: packages/coding-agent/src/core/agent-session.ts:1220][E: packages/coding-agent/src/core/agent-session.ts:1225][E: packages/coding-agent/src/core/agent-session.ts:1228][E: packages/coding-agent/src/core/agent-session.ts:1239][E: packages/coding-agent/src/core/agent-session.ts:1143]

`subscribe(listener)` 把 listener 加入 session event listeners 并返回针对该 listener 的 unsubscribe 函数;`dispose()` 会 abort retry/compaction/branch summary/bash/agent,使 extension runner 失效,断开 agent subscription,清空 listeners,并清理 session resources。[E: packages/coding-agent/src/core/agent-session.ts:853][E: packages/coding-agent/src/core/agent-session.ts:853][E: packages/coding-agent/src/core/agent-session.ts:853][E: packages/coding-agent/src/core/agent-session.ts:877][E: packages/coding-agent/src/core/agent-session.ts:879][E: packages/coding-agent/src/core/agent-session.ts:879][E: packages/coding-agent/src/core/agent-session.ts:880][E: packages/coding-agent/src/core/agent-session.ts:877][E: packages/coding-agent/src/core/agent-session.ts:882][E: packages/coding-agent/src/core/agent-session.ts:888][E: packages/coding-agent/src/core/agent-session.ts:891][E: packages/coding-agent/src/core/agent-session.ts:891][E: packages/coding-agent/src/core/agent-session.ts:888]

## SessionManager 与持久化选择

SDK quick start 显式传入 `SessionManager.inMemory()` 以便示例不依赖默认 session manager。[E: packages/coding-agent/docs/sdk.md:19][E: packages/coding-agent/docs/sdk.md:22][E: packages/coding-agent/docs/sdk.md:23] `SessionManager` 的 tree/branching 语义来自 class-level 注释,但本节点只把具体 factory 行为作为显式证据: `SessionManager.create(cwd, sessionDir?)` 会使用传入 sessionDir 或默认 session dir 并启用 persist;`SessionManager.inMemory(cwd?, options?, entries?)` 用空 sessionDir 和 `persist=false` 创建内存会话,第三参 `entries` 可灌入外部 `FileEntry[]` 做 restore。[I][E: packages/coding-agent/src/core/session-manager.ts:1551][E: packages/coding-agent/src/core/session-manager.ts:1552][E: packages/coding-agent/src/core/session-manager.ts:1553][E: packages/coding-agent/src/core/session-manager.ts:1600][E: packages/coding-agent/src/core/session-manager.ts:1601]

`createAgentSession()` 根据 session 是否已有数据决定恢复或写入初始 model/thinking state:已有 session 时把 `existingSession.messages` 放回 `agent.state.messages`,缺 thinking entry 时追加当前 thinking level;新 session 则在有 model 时追加 `model_change`,并追加 `thinking_level_change`。[E: packages/coding-agent/src/core/sdk.ts:375][E: packages/coding-agent/src/core/sdk.ts:376][E: packages/coding-agent/src/core/sdk.ts:377][E: packages/coding-agent/src/core/sdk.ts:378][E: packages/coding-agent/src/core/sdk.ts:380][E: packages/coding-agent/src/core/sdk.ts:382][E: packages/coding-agent/src/core/sdk.ts:383][E: packages/coding-agent/src/core/sdk.ts:385] 对嵌入方而言,传入 `SessionManager.inMemory()` 是无持久化运行,传入 `SessionManager.create()` 是使用 coding-agent JSONL session 格式运行。[I]

## 返回值与 extension 结果

`CreateAgentSessionResult` 返回 `session`、`extensionsResult` 和可选 `modelFallbackMessage`。[E: packages/coding-agent/src/core/sdk.ts:93][E: packages/coding-agent/src/core/sdk.ts:95][E: packages/coding-agent/src/core/sdk.ts:97] factory 在构造 `AgentSession` 后从 `resourceLoader.getExtensions()` 取 `extensionsResult`,并把三项作为结果返回。[E: packages/coding-agent/src/core/sdk.ts:388][E: packages/coding-agent/src/core/sdk.ts:403][E: packages/coding-agent/src/core/sdk.ts:405][E: packages/coding-agent/src/core/sdk.ts:406][E: packages/coding-agent/src/core/sdk.ts:407][E: packages/coding-agent/src/core/sdk.ts:408] 开发文档的 quick start 只使用 `session`,但 `extensionsResult` 对需要把 extension UI context 或运行时诊断接到自定义宿主的嵌入方有用。[E: packages/coding-agent/docs/sdk.md:22][I]

## Runtime 与 RPC 的边界

开发文档明确说 new-session、resume、fork、import 等 session replacement API 在 `AgentSessionRuntime` 上,不在 `AgentSession` 上。[E: packages/coding-agent/docs/sdk.md:118] 需要替换 active session 并重建 cwd-bound runtime state 时,应使用 `createAgentSessionRuntime()` / `AgentSessionRuntime`;开发文档说明这是 built-in interactive、print 和 RPC modes 使用的同一层。[E: packages/coding-agent/docs/sdk.md:120][E: packages/coding-agent/docs/sdk.md:120][E: packages/coding-agent/docs/sdk.md:123][E: packages/coding-agent/docs/sdk.md:123]

主包现在另有 `./client` public subpath,但 `packages/coding-agent/src/client/index.ts` 整文件只是 `export * from "@earendil-works/pi-client"`;package.json 的 `./client` 只声明 `"source"` 条件,不再有本地 `RemoteSession` / transcript reducer 实现 [E: packages/coding-agent/package.json:22] [E: packages/coding-agent/package.json:23] [E: packages/coding-agent/src/client/index.ts:1]。它与本节点的 local `createAgentSession()`/`AgentSessionRuntime` 是不同 embedding seam；Chord `Client` 语义见 [surface.sdk.remote-session](remote-session.md) [I]。

`surface.modes.rpc` 是这个 SDK/runtime 能力的无头 JSONL 控制面:RPC mode 使用 `AgentSessionRuntime` 管理当前 session,再把 prompt、state、session 操作、extension UI request/response 映射到 stdin/stdout 协议。[I] 如果宿主与 pi 在同一 Node 进程并想直接拿 TypeScript object,`createAgentSession()` 是最短路径;如果宿主要跨进程或跨语言驱动 pi,`surface.modes.rpc` 的 JSONL 协议更合适。[I]

`subsys.coding-agent.agent-session` 是 `AgentSession` 的权威子系统节点:它应覆盖 session event persistence、prompt expansion、compaction、retry、extension binding、tool registry 等内部机制。[I] `subsys.coding-agent.http-dispatcher` 与 SDK embedding 的关系是 provider HTTP 层的运行支撑:SDK factory 最终通过 `streamSimple()` 进入 provider stream,而 HTTP dispatcher 节点应覆盖 coding-agent 如何配置或替换底层 HTTP 发送策略。[I]

## Gotcha 与不确定性

`sdk.ts` 的 JSDoc 示例包含 `continueSession: true`,但这个事实来自注释示例,不作为 verified `[E]` 锚点;当前 `CreateAgentSessionOptions` interface 的可见字段列表里没有声明 `continueSession`,源码中可确认的 continuation 相关入口在 `SessionManager.open()`、`SessionManager.continueRecent()` 和 runtime replacement API 一侧,当前 SDK 文档没有把 `continueSession` 作为 `createAgentSession()` option 说明。[E: packages/coding-agent/src/core/sdk.ts:39][E: packages/coding-agent/src/core/sdk.ts:41][E: packages/coding-agent/src/core/sdk.ts:43][E: packages/coding-agent/src/core/sdk.ts:46][E: packages/coding-agent/src/core/sdk.ts:49][E: packages/coding-agent/src/core/sdk.ts:49][E: packages/coding-agent/src/core/sdk.ts:51][E: packages/coding-agent/src/core/sdk.ts:53][E: packages/coding-agent/src/core/sdk.ts:62][E: packages/coding-agent/src/core/sdk.ts:72][E: packages/coding-agent/src/core/sdk.ts:74][E: packages/coding-agent/src/core/sdk.ts:76][E: packages/coding-agent/src/core/sdk.ts:79][E: packages/coding-agent/src/core/sdk.ts:82][E: packages/coding-agent/src/core/sdk.ts:85][E: packages/coding-agent/src/core/sdk.ts:87][E: packages/coding-agent/src/core/session-manager.ts:1562][E: packages/coding-agent/src/core/session-manager.ts:1589][U] 因此写 SDK 嵌入代码时不要把 `continueSession` 当作已确认的 public option;更稳妥的做法是显式传入已打开或已 continue 的 `SessionManager`,或使用 `AgentSessionRuntime` 的 session replacement API。[I]

## Sources

- packages/coding-agent/package.json
- packages/coding-agent/src/client/index.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/index.ts
- packages/coding-agent/docs/sdk.md

## 相关

- [surface.sdk.remote-session](remote-session.md) - `./client` 只 re-export `@earendil-works/pi-client`;旧 `RemoteSession` 已退役。
- [subsys.coding-agent.agent-session](../../subsystems/coding-agent/agent-session.md) - `AgentSession` 内部如何处理 prompt、事件、工具 registry、compaction、extension binding 和持久化。
- [surface.modes.rpc](../modes/rpc.md) - 通过 JSONL stdin/stdout 把 `AgentSessionRuntime` 暴露给跨进程 host 的无头控制面。
- [subsys.coding-agent.http-dispatcher](../../subsystems/coding-agent/http-dispatcher.md) - coding-agent provider 请求的 HTTP dispatch 支撑层。
