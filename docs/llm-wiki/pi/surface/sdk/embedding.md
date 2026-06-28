---
id: surface.sdk.embedding
title: SDK 嵌入(createAgentSession)
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/src/index.ts
  - packages/coding-agent/docs/sdk.md
symbols:
  - createAgentSession
  - AgentSession
  - SessionManager
related:
  - subsys.coding-agent.agent-session
  - surface.modes.rpc
  - subsys.coding-agent.http-dispatcher
evidence: explicit
status: verified
updated: 5a073885
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

SDK 被主包 `@earendil-works/pi-coding-agent` 直接导出,不是独立 npm 包:开发文档的安装命令安装主包,并说明 SDK 包含在主包中。[E: packages/coding-agent/docs/sdk.md:40][E: packages/coding-agent/docs/sdk.md:43][E: packages/coding-agent/docs/sdk.md:46] `packages/coding-agent/src/index.ts` 把 `createAgentSession`、`CreateAgentSessionOptions`、`CreateAgentSessionResult`、`AgentSessionRuntime`、`createAgentSessionRuntime`、`createAgentSessionServices`、工具 factory 和 `PromptTemplate` 从 `./core/sdk.ts` 重新导出。[E: packages/coding-agent/src/index.ts:179][E: packages/coding-agent/src/index.ts:184][E: packages/coding-agent/src/index.ts:185][E: packages/coding-agent/src/index.ts:190][E: packages/coding-agent/src/index.ts:192][E: packages/coding-agent/src/index.ts:193][E: packages/coding-agent/src/index.ts:194][E: packages/coding-agent/src/index.ts:204] 同一个入口也导出 `AgentSession` 和 `SessionManager`,所以 SDK 用户可以从主包同时拿到 factory、session class 和 session storage 管理器。[E: packages/coding-agent/src/index.ts:15][E: packages/coding-agent/src/index.ts:16][E: packages/coding-agent/src/index.ts:220][E: packages/coding-agent/src/index.ts:225]

开发文档把 SDK 用途定位为 programmatic access:嵌入其他应用、构建自定义界面、接入自动化工作流、创建会 spawn sub-agent 的自定义工具,或程序化测试 agent 行为。[E: packages/coding-agent/docs/sdk.md:5][E: packages/coding-agent/docs/sdk.md:8][E: packages/coding-agent/docs/sdk.md:9][E: packages/coding-agent/docs/sdk.md:10][E: packages/coding-agent/docs/sdk.md:11][E: packages/coding-agent/docs/sdk.md:12]

## createAgentSession 的输入选项

`CreateAgentSessionOptions` 是单 session factory 的主要配置面:它允许传入 `cwd`、`agentDir`、`authStorage`、`modelRegistry`、`model`、`thinkingLevel`、`scopedModels`、`noTools`、`tools`、`excludeTools`、`customTools`、`resourceLoader`、`sessionManager`、`settingsManager` 和 `sessionStartEvent`。[E: packages/coding-agent/src/core/sdk.ts:34][E: packages/coding-agent/src/core/sdk.ts:36][E: packages/coding-agent/src/core/sdk.ts:38][E: packages/coding-agent/src/core/sdk.ts:41][E: packages/coding-agent/src/core/sdk.ts:43][E: packages/coding-agent/src/core/sdk.ts:46][E: packages/coding-agent/src/core/sdk.ts:48][E: packages/coding-agent/src/core/sdk.ts:50][E: packages/coding-agent/src/core/sdk.ts:59][E: packages/coding-agent/src/core/sdk.ts:67][E: packages/coding-agent/src/core/sdk.ts:69][E: packages/coding-agent/src/core/sdk.ts:71][E: packages/coding-agent/src/core/sdk.ts:74][E: packages/coding-agent/src/core/sdk.ts:77][E: packages/coding-agent/src/core/sdk.ts:80][E: packages/coding-agent/src/core/sdk.ts:82]

`createAgentSession(options = {})` 先解析 `cwd`:优先使用 `options.cwd`,否则用传入 `sessionManager.getCwd()`,再否则用 `process.cwd()`;`agentDir` 优先用 `options.agentDir`,否则调用默认 agent dir resolver。[E: packages/coding-agent/src/core/sdk.ts:166][E: packages/coding-agent/src/core/sdk.ts:167][E: packages/coding-agent/src/core/sdk.ts:168] 如果调用方没有提供 `AuthStorage` 和 `ModelRegistry`,factory 会基于 `agentDir/auth.json`、`agentDir/models.json` 或默认路径创建它们。[E: packages/coding-agent/src/core/sdk.ts:172][E: packages/coding-agent/src/core/sdk.ts:173][E: packages/coding-agent/src/core/sdk.ts:174][E: packages/coding-agent/src/core/sdk.ts:175]

settings/session/resource loading 也有默认构造:缺省 `SettingsManager.create(cwd, agentDir)`,缺省 `SessionManager.create(cwd, getDefaultSessionDir(cwd, agentDir))`,缺省 `DefaultResourceLoader({ cwd, agentDir, settingsManager })` 并立即 `reload()`。[E: packages/coding-agent/src/core/sdk.ts:177][E: packages/coding-agent/src/core/sdk.ts:178][E: packages/coding-agent/src/core/sdk.ts:180][E: packages/coding-agent/src/core/sdk.ts:181][E: packages/coding-agent/src/core/sdk.ts:182] 开发文档也把 `createAgentSession()` 描述为通过 `ResourceLoader` 提供 extensions、skills、prompt templates、themes 和 context files,未传入时使用标准 discovery 的 `DefaultResourceLoader`。[E: packages/coding-agent/docs/sdk.md:52][E: packages/coding-agent/docs/sdk.md:54]

## 模型与 thinking 恢复

`createAgentSession()` 会先从 `SessionManager.buildSessionContext()` 判断是否已有消息,再检查当前 branch 是否包含 `thinking_level_change` entry。[E: packages/coding-agent/src/core/sdk.ts:187][E: packages/coding-agent/src/core/sdk.ts:188][E: packages/coding-agent/src/core/sdk.ts:189] 如果调用方未传 `model` 且已有 session model,factory 会尝试从 `ModelRegistry` 里按 provider/modelId 找回模型,并要求该模型已有可用 auth;恢复失败时会生成 `modelFallbackMessage`。[E: packages/coding-agent/src/core/sdk.ts:191][E: packages/coding-agent/src/core/sdk.ts:195][E: packages/coding-agent/src/core/sdk.ts:196][E: packages/coding-agent/src/core/sdk.ts:197][E: packages/coding-agent/src/core/sdk.ts:198][E: packages/coding-agent/src/core/sdk.ts:200][E: packages/coding-agent/src/core/sdk.ts:201]

没有可用 model 时,`findInitialModel()` 会用空 scoped model list、是否 continuing、settings 中的默认 provider/model/thinking level 和 `ModelRegistry` 选择初始模型;如果仍无模型,`modelFallbackMessage` 会变成无可用模型的引导文本。[E: packages/coding-agent/src/core/sdk.ts:207][E: packages/coding-agent/src/core/sdk.ts:208][E: packages/coding-agent/src/core/sdk.ts:209][E: packages/coding-agent/src/core/sdk.ts:210][E: packages/coding-agent/src/core/sdk.ts:211][E: packages/coding-agent/src/core/sdk.ts:212][E: packages/coding-agent/src/core/sdk.ts:213][E: packages/coding-agent/src/core/sdk.ts:216][E: packages/coding-agent/src/core/sdk.ts:217] `thinkingLevel` 优先用显式 options;已有 session 时,如果 branch 有 thinking entry 就用 session context 中的 level,否则用 settings default 或 `DEFAULT_THINKING_LEVEL`;最终还会按模型能力 clamp,无模型时强制 `"off"`。[E: packages/coding-agent/src/core/sdk.ts:223][E: packages/coding-agent/src/core/sdk.ts:226][E: packages/coding-agent/src/core/sdk.ts:227][E: packages/coding-agent/src/core/sdk.ts:229][E: packages/coding-agent/src/core/sdk.ts:233][E: packages/coding-agent/src/core/sdk.ts:234][E: packages/coding-agent/src/core/sdk.ts:238][E: packages/coding-agent/src/core/sdk.ts:239][E: packages/coding-agent/src/core/sdk.ts:241]

## 工具装配与门控

SDK 的默认 active built-in tool names 是 `read`、`bash`、`edit`、`write`。[E: packages/coding-agent/src/core/sdk.ts:244] `options.tools` 是 allowlist:传入时只有 listed names 初始启用;`noTools: "all"` 会让 allowed tool names 为空数组;`excludeTools` 会在 allowlist 或默认 active list 之后过滤。[E: packages/coding-agent/src/core/sdk.ts:245][E: packages/coding-agent/src/core/sdk.ts:246][E: packages/coding-agent/src/core/sdk.ts:247][E: packages/coding-agent/src/core/sdk.ts:248][E: packages/coding-agent/src/core/sdk.ts:249][E: packages/coding-agent/src/core/sdk.ts:250] `noTools: "builtin"` 是已声明的 suppression mode;在 factory 里它不会设置 allowlist,但会让 initial active built-ins 为空,随后 `AgentSession` 以 `includeAllExtensionTools: true` 刷新工具 registry 时会把 extension/custom tools 加回 active names。[E: packages/coding-agent/src/core/sdk.ts:59][E: packages/coding-agent/src/core/sdk.ts:245][E: packages/coding-agent/src/core/sdk.ts:249][E: packages/coding-agent/src/core/agent-session.ts:356][E: packages/coding-agent/src/core/agent-session.ts:358][E: packages/coding-agent/src/core/agent-session.ts:2388][E: packages/coding-agent/src/core/agent-session.ts:2389][E: packages/coding-agent/src/core/agent-session.ts:2390]

`AgentSession` 构造函数接收 `customTools`、`initialActiveToolNames`、`allowedToolNames`、`excludedToolNames` 等 config,保存后立即调用 `_buildRuntime({ activeToolNames, includeAllExtensionTools: true })`。[E: packages/coding-agent/src/core/agent-session.ts:335][E: packages/coding-agent/src/core/agent-session.ts:341][E: packages/coding-agent/src/core/agent-session.ts:345][E: packages/coding-agent/src/core/agent-session.ts:346][E: packages/coding-agent/src/core/agent-session.ts:347][E: packages/coding-agent/src/core/agent-session.ts:356][E: packages/coding-agent/src/core/agent-session.ts:357][E: packages/coding-agent/src/core/agent-session.ts:358] `_buildRuntime()` 从 settings 读取 image auto resize、shell command prefix 和 shell path,然后用 `createAllToolDefinitions(this._cwd, { read, bash })` 创建 built-in tool definitions。[E: packages/coding-agent/src/core/agent-session.ts:2403][E: packages/coding-agent/src/core/agent-session.ts:2408][E: packages/coding-agent/src/core/agent-session.ts:2409][E: packages/coding-agent/src/core/agent-session.ts:2410][E: packages/coding-agent/src/core/agent-session.ts:2418][E: packages/coding-agent/src/core/agent-session.ts:2419][E: packages/coding-agent/src/core/agent-session.ts:2420]

`_refreshToolRegistry()` 会把 extension registered tools 与 SDK `customTools` 合并,给 SDK custom tool 生成 `<sdk:name>` 的 synthetic source info,并按 allowlist/denylist 过滤;之后 built-in 与 extension/custom tools 都通过 `wrapRegisteredTools()` 进入 agent tool registry。[E: packages/coding-agent/src/core/agent-session.ts:2313][E: packages/coding-agent/src/core/agent-session.ts:2315][E: packages/coding-agent/src/core/agent-session.ts:2318][E: packages/coding-agent/src/core/agent-session.ts:2319][E: packages/coding-agent/src/core/agent-session.ts:2321][E: packages/coding-agent/src/core/agent-session.ts:2323][E: packages/coding-agent/src/core/agent-session.ts:2325][E: packages/coding-agent/src/core/agent-session.ts:2361][E: packages/coding-agent/src/core/agent-session.ts:2362][E: packages/coding-agent/src/core/agent-session.ts:2372][E: packages/coding-agent/src/core/agent-session.ts:2373][E: packages/coding-agent/src/core/agent-session.ts:2376]

## AgentSession 运行边界

`createAgentSession()` 创建 `Agent` 时传入空 system prompt、选出的 model/thinking level、空 tools,并把 `convertToLlm`、`streamFn`、provider request/response extension hooks、session id、context transform、queue modes、transport、thinking budgets 和 retry delay 等运行参数绑定到 agent core。[E: packages/coding-agent/src/core/sdk.ts:293][E: packages/coding-agent/src/core/sdk.ts:294][E: packages/coding-agent/src/core/sdk.ts:295][E: packages/coding-agent/src/core/sdk.ts:296][E: packages/coding-agent/src/core/sdk.ts:297][E: packages/coding-agent/src/core/sdk.ts:298][E: packages/coding-agent/src/core/sdk.ts:300][E: packages/coding-agent/src/core/sdk.ts:301][E: packages/coding-agent/src/core/sdk.ts:332][E: packages/coding-agent/src/core/sdk.ts:339][E: packages/coding-agent/src/core/sdk.ts:350][E: packages/coding-agent/src/core/sdk.ts:351][E: packages/coding-agent/src/core/sdk.ts:356][E: packages/coding-agent/src/core/sdk.ts:357][E: packages/coding-agent/src/core/sdk.ts:358][E: packages/coding-agent/src/core/sdk.ts:359][E: packages/coding-agent/src/core/sdk.ts:360]

`streamFn` 从 `ModelRegistry` 取 API key、headers 和 env,合并调用方 options/env,读取 provider retry、HTTP idle timeout 和 WebSocket connect timeout,再调用 `streamSimple()` 发起 provider stream。[E: packages/coding-agent/src/core/sdk.ts:301][E: packages/coding-agent/src/core/sdk.ts:302][E: packages/coding-agent/src/core/sdk.ts:306][E: packages/coding-agent/src/core/sdk.ts:307][E: packages/coding-agent/src/core/sdk.ts:308][E: packages/coding-agent/src/core/sdk.ts:312][E: packages/coding-agent/src/core/sdk.ts:313][E: packages/coding-agent/src/core/sdk.ts:315][E: packages/coding-agent/src/core/sdk.ts:317][E: packages/coding-agent/src/core/sdk.ts:319][E: packages/coding-agent/src/core/sdk.ts:321][E: packages/coding-agent/src/core/sdk.ts:323] 这意味着 SDK 嵌入不是绕过 provider/auth/settings 的裸 `Agent`;它使用 coding-agent 的产品层默认运行策略来包住 `pi-agent-core` 的 `Agent`。[I]

`AgentSession` 是嵌入方拿到的主要对象:开发文档列出 `prompt()`、`steer()`、`followUp()`、`subscribe()`、session id/file、model/thinking control、state access、tree navigation、compaction、abort 和 `dispose()`。[E: packages/coding-agent/docs/sdk.md:70][E: packages/coding-agent/docs/sdk.md:72][E: packages/coding-agent/docs/sdk.md:77][E: packages/coding-agent/docs/sdk.md:80][E: packages/coding-agent/docs/sdk.md:81][E: packages/coding-agent/docs/sdk.md:84][E: packages/coding-agent/docs/sdk.md:87][E: packages/coding-agent/docs/sdk.md:88][E: packages/coding-agent/docs/sdk.md:91][E: packages/coding-agent/docs/sdk.md:92][E: packages/coding-agent/docs/sdk.md:97][E: packages/coding-agent/docs/sdk.md:100][E: packages/coding-agent/docs/sdk.md:104][E: packages/coding-agent/docs/sdk.md:107][E: packages/coding-agent/docs/sdk.md:111][E: packages/coding-agent/docs/sdk.md:114] 源码里 `prompt()` 先尝试执行 extension command,再处理 input hook、skill/prompt template expansion、streaming queue behavior 和 model/API key validation,并在 streaming 且未指定 `streamingBehavior` 时抛错。[E: packages/coding-agent/src/core/agent-session.ts:998][E: packages/coding-agent/src/core/agent-session.ts:1007][E: packages/coding-agent/src/core/agent-session.ts:1018][E: packages/coding-agent/src/core/agent-session.ts:1038][E: packages/coding-agent/src/core/agent-session.ts:1039][E: packages/coding-agent/src/core/agent-session.ts:1044][E: packages/coding-agent/src/core/agent-session.ts:1045][E: packages/coding-agent/src/core/agent-session.ts:1049][E: packages/coding-agent/src/core/agent-session.ts:1052][E: packages/coding-agent/src/core/agent-session.ts:1062][E: packages/coding-agent/src/core/agent-session.ts:1066]

`subscribe(listener)` 把 listener 加入 session event listeners 并返回针对该 listener 的 unsubscribe 函数;`dispose()` 会 abort retry/compaction/branch summary/bash/agent,使 extension runner 失效,断开 agent subscription,清空 listeners,并清理 session resources。[E: packages/coding-agent/src/core/agent-session.ts:692][E: packages/coding-agent/src/core/agent-session.ts:693][E: packages/coding-agent/src/core/agent-session.ts:696][E: packages/coding-agent/src/core/agent-session.ts:729][E: packages/coding-agent/src/core/agent-session.ts:731][E: packages/coding-agent/src/core/agent-session.ts:732][E: packages/coding-agent/src/core/agent-session.ts:733][E: packages/coding-agent/src/core/agent-session.ts:734][E: packages/coding-agent/src/core/agent-session.ts:735][E: packages/coding-agent/src/core/agent-session.ts:740][E: packages/coding-agent/src/core/agent-session.ts:743][E: packages/coding-agent/src/core/agent-session.ts:744][E: packages/coding-agent/src/core/agent-session.ts:745]

## SessionManager 与持久化选择

SDK quick start 显式传入 `SessionManager.inMemory()` 以便示例不依赖默认 session manager。[E: packages/coding-agent/docs/sdk.md:19][E: packages/coding-agent/docs/sdk.md:25][E: packages/coding-agent/docs/sdk.md:26] `SessionManager` 的 tree/branching 语义来自 class-level 注释,但本节点只把具体 factory 行为作为显式证据: `SessionManager.create(cwd, sessionDir?)` 会使用传入 sessionDir 或默认 session dir 并启用 persist;`SessionManager.inMemory(cwd?)` 用空 sessionDir 和 `persist=false` 创建内存会话。[I][E: packages/coding-agent/src/core/session-manager.ts:1399][E: packages/coding-agent/src/core/session-manager.ts:1400][E: packages/coding-agent/src/core/session-manager.ts:1401][E: packages/coding-agent/src/core/session-manager.ts:1437][E: packages/coding-agent/src/core/session-manager.ts:1438]

`createAgentSession()` 根据 session 是否已有数据决定恢复或写入初始 model/thinking state:已有 session 时把 `existingSession.messages` 放回 `agent.state.messages`,缺 thinking entry 时追加当前 thinking level;新 session 则在有 model 时追加 `model_change`,并追加 `thinking_level_change`。[E: packages/coding-agent/src/core/sdk.ts:364][E: packages/coding-agent/src/core/sdk.ts:365][E: packages/coding-agent/src/core/sdk.ts:366][E: packages/coding-agent/src/core/sdk.ts:367][E: packages/coding-agent/src/core/sdk.ts:369][E: packages/coding-agent/src/core/sdk.ts:371][E: packages/coding-agent/src/core/sdk.ts:372][E: packages/coding-agent/src/core/sdk.ts:374] 对嵌入方而言,传入 `SessionManager.inMemory()` 是无持久化运行,传入 `SessionManager.create()` 是使用 coding-agent JSONL session 格式运行。[I]

## 返回值与 extension 结果

`CreateAgentSessionResult` 返回 `session`、`extensionsResult` 和可选 `modelFallbackMessage`。[E: packages/coding-agent/src/core/sdk.ts:88][E: packages/coding-agent/src/core/sdk.ts:90][E: packages/coding-agent/src/core/sdk.ts:92] factory 在构造 `AgentSession` 后从 `resourceLoader.getExtensions()` 取 `extensionsResult`,并把三项作为结果返回。[E: packages/coding-agent/src/core/sdk.ts:377][E: packages/coding-agent/src/core/sdk.ts:392][E: packages/coding-agent/src/core/sdk.ts:394][E: packages/coding-agent/src/core/sdk.ts:395][E: packages/coding-agent/src/core/sdk.ts:396][E: packages/coding-agent/src/core/sdk.ts:397] 开发文档的 quick start 只使用 `session`,但 `extensionsResult` 对需要把 extension UI context 或运行时诊断接到自定义宿主的嵌入方有用。[E: packages/coding-agent/docs/sdk.md:25][I]

## Runtime 与 RPC 的边界

开发文档明确说 new-session、resume、fork、import 等 session replacement API 在 `AgentSessionRuntime` 上,不在 `AgentSession` 上。[E: packages/coding-agent/docs/sdk.md:118] 需要替换 active session 并重建 cwd-bound runtime state 时,应使用 `createAgentSessionRuntime()` / `AgentSessionRuntime`;开发文档说明这是 built-in interactive、print 和 RPC modes 使用的同一层。[E: packages/coding-agent/docs/sdk.md:120][E: packages/coding-agent/docs/sdk.md:122][E: packages/coding-agent/docs/sdk.md:123][E: packages/coding-agent/docs/sdk.md:125]

`surface.modes.rpc` 是这个 SDK/runtime 能力的无头 JSONL 控制面:RPC mode 使用 `AgentSessionRuntime` 管理当前 session,再把 prompt、state、session 操作、extension UI request/response 映射到 stdin/stdout 协议。[I] 如果宿主与 pi 在同一 Node 进程并想直接拿 TypeScript object,`createAgentSession()` 是最短路径;如果宿主要跨进程或跨语言驱动 pi,`surface.modes.rpc` 的 JSONL 协议更合适。[I]

`subsys.coding-agent.agent-session` 是 `AgentSession` 的权威子系统节点:它应覆盖 session event persistence、prompt expansion、compaction、retry、extension binding、tool registry 等内部机制。[I] `subsys.coding-agent.http-dispatcher` 与 SDK embedding 的关系是 provider HTTP 层的运行支撑:SDK factory 最终通过 `streamSimple()` 进入 provider stream,而 HTTP dispatcher 节点应覆盖 coding-agent 如何配置或替换底层 HTTP 发送策略。[I]

## Gotcha 与不确定性

`sdk.ts` 的 JSDoc 示例包含 `continueSession: true`,但这个事实来自注释示例,不作为 verified `[E]` 锚点;当前 `CreateAgentSessionOptions` interface 的可见字段列表里没有声明 `continueSession`,源码中可确认的 continuation 相关入口在 `SessionManager.open()`、`SessionManager.continueRecent()` 和 runtime replacement API 一侧,当前 SDK 文档没有把 `continueSession` 作为 `createAgentSession()` option 说明。[E: packages/coding-agent/src/core/sdk.ts:34][E: packages/coding-agent/src/core/sdk.ts:36][E: packages/coding-agent/src/core/sdk.ts:38][E: packages/coding-agent/src/core/sdk.ts:41][E: packages/coding-agent/src/core/sdk.ts:43][E: packages/coding-agent/src/core/sdk.ts:46][E: packages/coding-agent/src/core/sdk.ts:48][E: packages/coding-agent/src/core/sdk.ts:50][E: packages/coding-agent/src/core/sdk.ts:59][E: packages/coding-agent/src/core/sdk.ts:67][E: packages/coding-agent/src/core/sdk.ts:69][E: packages/coding-agent/src/core/sdk.ts:71][E: packages/coding-agent/src/core/sdk.ts:74][E: packages/coding-agent/src/core/sdk.ts:77][E: packages/coding-agent/src/core/sdk.ts:80][E: packages/coding-agent/src/core/sdk.ts:82][E: packages/coding-agent/src/core/session-manager.ts:1410][E: packages/coding-agent/src/core/session-manager.ts:1426][U] 因此写 SDK 嵌入代码时不要把 `continueSession` 当作已确认的 public option;更稳妥的做法是显式传入已打开或已 continue 的 `SessionManager`,或使用 `AgentSessionRuntime` 的 session replacement API。[I]

## Sources

- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/index.ts
- packages/coding-agent/docs/sdk.md

## 相关

- [subsys.coding-agent.agent-session](../../subsystems/coding-agent/agent-session.md) - `AgentSession` 内部如何处理 prompt、事件、工具 registry、compaction、extension binding 和持久化。
- [surface.modes.rpc](../modes/rpc.md) - 通过 JSONL stdin/stdout 把 `AgentSessionRuntime` 暴露给跨进程 host 的无头控制面。
- [subsys.coding-agent.http-dispatcher](../../subsystems/coding-agent/http-dispatcher.md) - coding-agent provider 请求的 HTTP dispatch 支撑层。
