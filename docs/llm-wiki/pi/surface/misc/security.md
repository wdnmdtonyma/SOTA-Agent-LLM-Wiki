---
id: surface.misc.security
title: 安全模型
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/docs/security.md
  - SECURITY.md
  - packages/coding-agent/src/core/trust-manager.ts
  - packages/coding-agent/src/core/project-trust.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/core/resource-loader.ts
  - packages/coding-agent/src/core/auth-storage.ts
  - packages/coding-agent/src/core/runtime-credentials.ts
  - packages/coding-agent/src/core/model-runtime.ts
  - packages/coding-agent/src/core/model-registry.ts
  - packages/ai/src/auth/resolve.ts
  - packages/ai/src/models.ts
  - packages/coding-agent/src/core/http-dispatcher.ts
  - packages/coding-agent/src/cli.ts
  - packages/coding-agent/src/rpc-entry.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/agent/src/agent-loop.ts
symbols: []
related:
  - surface.trust.model
  - surface.misc.containerization
evidence: explicit
status: verified
updated: cee5ff7520
---

> `surface.misc.security` 描述 pi-coding-agent 的用户可见安全边界:Pi 是本地编码代理,默认与启动它的本地用户处在同一 OS 权限边界内;project trust、auth resolution、HTTP dispatcher 和 tool execution hook 都是运行时门控或配置面,不是内置沙箱。

## 能回答的问题

- Pi 的安全边界是不是内置 sandbox?
- project trust 保护什么资源,不保护什么执行行为?
- `~/.pi/agent/auth.json`、`--api-key`、环境变量和 provider auth 的优先级是什么?
- HTTP proxy/idle timeout 配置是不是网络出站安全策略?
- 扩展能否在工具执行前阻止或改写工具调用?
- 不可信仓库或无人值守任务应该放在哪里运行?

## 安全边界总览

Pi 的安全政策把 Pi 定义为在启动它的本地用户权限内运行的 coding agent;监控它的操作或把它放进 container、VM 或其它 sandbox 是用户职责 [E: SECURITY.md:6] [E: SECURITY.md:7] [E: SECURITY.md:8] [E: SECURITY.md:9]。同一政策还把本地用户账号以及该用户可写文件视为与 Pi 进程相同的 trust boundary;如果攻击者已经能改用户 home、workspace、shell startup、环境或 Pi 配置,通常就能影响 Pi 或其它本地开发工具 [E: SECURITY.md:11] [E: SECURITY.md:12] [E: SECURITY.md:13] [E: SECURITY.md:14]。因此,本节点把“能否跨 OS 权限边界”作为安全边界问题,把“模型输出让本地用户态工具做危险事”视作 local-agent 操作风险 [I]。

`packages/coding-agent/docs/security.md` 对用户面的说法更直接:Pi 没有内置 sandbox;内置工具可以按 Pi 进程权限读文件、写文件、编辑文件、运行 shell command,扩展 TypeScript 模块也以相同权限运行 [E: packages/coding-agent/docs/security.md:31] [E: packages/coding-agent/docs/security.md:33]。安全文档把 project trust 定位成 input-loading guard:它阻止仓库在获批前静默改变 Pi settings 或 extensions,但不让不可信代码、不可信 prompt 或模型输出变安全 [E: packages/coding-agent/docs/security.md:37]。仓库级 prompt injection、注释、文档、context file 或 build output 注入被安全文档列为预期 local-agent 风险 [E: packages/coding-agent/docs/security.md:37] [I]。

## Project Trust 是加载门控

project trust 的 ground truth 有两层:文档列出用户可见语义,代码决定何时算作 trust-requiring project。安全文档说明,project trust 控制 Pi 是否加载 project-local settings、resources、packages 和 extensions,且它不是 sandbox,不会限制模型在目录中开始工作后要求 tools 做什么 [E: packages/coding-agent/docs/security.md:5] [E: packages/coding-agent/docs/security.md:7]。代码侧 `TRUST_REQUIRING_PROJECT_CONFIG_RESOURCES` 包含 `.pi/settings.json` 对应的 `settings.json`、`extensions`、`skills`、`prompts`、`themes`、`SYSTEM.md` 和 `APPEND_SYSTEM.md` [E: packages/coding-agent/src/core/trust-manager.ts:29] [E: packages/coding-agent/src/core/trust-manager.ts:30] [E: packages/coding-agent/src/core/trust-manager.ts:31] [E: packages/coding-agent/src/core/trust-manager.ts:32] [E: packages/coding-agent/src/core/trust-manager.ts:33] [E: packages/coding-agent/src/core/trust-manager.ts:34] [E: packages/coding-agent/src/core/trust-manager.ts:35] [E: packages/coding-agent/src/core/trust-manager.ts:36]。`hasTrustRequiringProjectResources(cwd)` 还会沿 cwd 及祖先查找非用户全局目录的 `.agents/skills` [E: packages/coding-agent/src/core/trust-manager.ts:184] [E: packages/coding-agent/src/core/trust-manager.ts:185] [E: packages/coding-agent/src/core/trust-manager.ts:186] [E: packages/coding-agent/src/core/trust-manager.ts:194] [E: packages/coding-agent/src/core/trust-manager.ts:195] [E: packages/coding-agent/src/core/trust-manager.ts:196] [E: packages/coding-agent/src/core/trust-manager.ts:197]。

`resolveProjectTrusted()` 的顺序是:显式 override 直接返回;没有 trust-requiring resources 时返回 trusted;然后让预加载的 user/global/CLI extensions 处理 `project_trust`;再查 trust store;最后按 `defaultProjectTrust` 的 `always`、`never`、`ask` 处理,没有 UI 时返回 false [E: packages/coding-agent/src/core/project-trust.ts:46] [E: packages/coding-agent/src/core/project-trust.ts:47] [E: packages/coding-agent/src/core/project-trust.ts:50] [E: packages/coding-agent/src/core/project-trust.ts:54] [E: packages/coding-agent/src/core/project-trust.ts:63] [E: packages/coding-agent/src/core/project-trust.ts:72] [E: packages/coding-agent/src/core/project-trust.ts:77] [E: packages/coding-agent/src/core/project-trust.ts:78] [E: packages/coding-agent/src/core/project-trust.ts:80] [E: packages/coding-agent/src/core/project-trust.ts:86] [E: packages/coding-agent/src/core/project-trust.ts:87]。`ProjectTrustStore` 把 decision 写到 agent dir 下的 `trust.json`,并按 cwd 的规范化路径向父目录查找最近 saved decision [E: packages/coding-agent/src/core/trust-manager.ts:43] [E: packages/coding-agent/src/core/trust-manager.ts:46] [E: packages/coding-agent/src/core/trust-manager.ts:48] [E: packages/coding-agent/src/core/trust-manager.ts:51] [E: packages/coding-agent/src/core/trust-manager.ts:52] [E: packages/coding-agent/src/core/trust-manager.ts:211] [E: packages/coding-agent/src/core/trust-manager.ts:212]。

trust 决策会实际影响 settings 和资源加载。`SettingsManager.loadFromStorage()` 在 scope 是 `"project"` 且 `projectTrusted` 为 false 时直接返回 `{}`;`setProjectTrusted(false)` 会清空内存 project settings 并重新合并 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:350] [E: packages/coding-agent/src/core/settings-manager.ts:351] [E: packages/coding-agent/src/core/settings-manager.ts:352] [E: packages/coding-agent/src/core/settings-manager.ts:454] [E: packages/coding-agent/src/core/settings-manager.ts:463] [E: packages/coding-agent/src/core/settings-manager.ts:464] [E: packages/coding-agent/src/core/settings-manager.ts:466]。写 project settings 前还会调用 `assertProjectTrustedForWrite()`,未 trusted 时抛错 [E: packages/coding-agent/src/core/settings-manager.ts:534] [E: packages/coding-agent/src/core/settings-manager.ts:535] [E: packages/coding-agent/src/core/settings-manager.ts:536] [E: packages/coding-agent/src/core/settings-manager.ts:626] [E: packages/coding-agent/src/core/settings-manager.ts:643]。`DefaultResourceLoader.loadProjectTrustExtensions()` 在 bootstrap pass 强制 `settingsManager.setProjectTrusted(false)`,只加载 user/global 与临时 CLI extension 集,随后 `reload()` 才用 resolved project trust 重载完整资源 [E: packages/coding-agent/src/core/resource-loader.ts:333] [E: packages/coding-agent/src/core/resource-loader.ts:336] [E: packages/coding-agent/src/core/resource-loader.ts:337] [E: packages/coding-agent/src/core/resource-loader.ts:338] [E: packages/coding-agent/src/core/resource-loader.ts:348] [E: packages/coding-agent/src/core/resource-loader.ts:350] [E: packages/coding-agent/src/core/resource-loader.ts:351] [E: packages/coding-agent/src/core/resource-loader.ts:352]。

## Auth 与凭证面

当前 auth 主链已经从 `AuthStorage.getApiKey()`/`ModelRegistry` 拆开。`AuthStorage` 只实现持久化 `CredentialStore`:默认文件仍是 agent dir 下的 `auth.json`,写入使用 `0o600`,父目录使用 `0o700`,同步与异步读写都由 lockfile 包裹 [E: packages/coding-agent/src/core/auth-storage.ts:21] [E: packages/coding-agent/src/core/auth-storage.ts:31] [E: packages/coding-agent/src/core/auth-storage.ts:38] [E: packages/coding-agent/src/core/auth-storage.ts:76] [E: packages/coding-agent/src/core/auth-storage.ts:82] [E: packages/coding-agent/src/core/auth-storage.ts:86] [E: packages/coding-agent/src/core/auth-storage.ts:87] [E: packages/coding-agent/src/core/auth-storage.ts:180] [E: packages/coding-agent/src/core/auth-storage.ts:181]。这些是本地文件权限与并发一致性措施,不是跨用户或跨机器的 secret isolation 边界 [I]。

不落盘的 runtime API key 现在属于 `RuntimeCredentials`:它在内存 `overrides` map 中保存 key,读取时优先返回 override,否则委托底层 `CredentialStore` [E: packages/coding-agent/src/core/runtime-credentials.ts:4] [E: packages/coding-agent/src/core/runtime-credentials.ts:6] [E: packages/coding-agent/src/core/runtime-credentials.ts:12] [E: packages/coding-agent/src/core/runtime-credentials.ts:13] [E: packages/coding-agent/src/core/runtime-credentials.ts:24] [E: packages/coding-agent/src/core/runtime-credentials.ts:26]。`ModelRuntime.create()` 把默认 `AuthStorage` 包进这层 overlay,并同时加载 `models.json` 与 models store;`setRuntimeApiKey()` 更新 overlay 和 auth/availability snapshot 后刷新 runtime [E: packages/coding-agent/src/core/model-runtime.ts:133] [E: packages/coding-agent/src/core/model-runtime.ts:134] [E: packages/coding-agent/src/core/model-runtime.ts:135] [E: packages/coding-agent/src/core/model-runtime.ts:141] [E: packages/coding-agent/src/core/model-runtime.ts:417] [E: packages/coding-agent/src/core/model-runtime.ts:403] [E: packages/coding-agent/src/core/model-runtime.ts:407] [E: packages/coding-agent/src/core/model-runtime.ts:419]。旧 `ModelRegistry` 仍存在,但它只保存 `ModelRuntime` 并把 lookup、auth 与 registration 调用转发给 runtime;它不再拥有凭证优先级 [E: packages/coding-agent/src/core/model-registry.ts:20] [E: packages/coding-agent/src/core/model-registry.ts:21] [E: packages/coding-agent/src/core/model-registry.ts:23] [E: packages/coding-agent/src/core/model-registry.ts:24] [E: packages/coding-agent/src/core/model-registry.ts:36] [E: packages/coding-agent/src/core/model-registry.ts:37] [E: packages/coding-agent/src/core/model-registry.ts:91] [E: packages/coding-agent/src/core/model-registry.ts:92] [E: packages/coding-agent/src/core/model-registry.ts:121] [E: packages/coding-agent/src/core/model-registry.ts:124]。

ai 层 `resolveProviderAuth()` 给出请求时的实际优先级:显式 per-request API key override 最先;随后读取 credential store;stored credential 一旦存在就 owns the provider,只有不存在 stored credential 时才调用 provider `apiKey` resolver 读取 ambient env/profile/ADC [E: packages/ai/src/auth/resolve.ts:46] [E: packages/ai/src/auth/resolve.ts:52] [E: packages/ai/src/auth/resolve.ts:54] [E: packages/ai/src/auth/resolve.ts:62] [E: packages/ai/src/auth/resolve.ts:63] [E: packages/ai/src/auth/resolve.ts:64] [E: packages/ai/src/auth/resolve.ts:67] [E: packages/ai/src/auth/resolve.ts:71] [E: packages/ai/src/auth/resolve.ts:75] [E: packages/ai/src/auth/resolve.ts:77]。coding-agent 的 `ModelRuntime.prepareRequest()` 再把 resolved `baseUrl`、API key、headers 和 env 放入请求;显式 request option 对 API key 有优先权,headers/env 按 key 合并 [E: packages/coding-agent/src/core/model-runtime.ts:438] [E: packages/coding-agent/src/core/model-runtime.ts:444] [E: packages/coding-agent/src/core/model-runtime.ts:447] [E: packages/coding-agent/src/core/model-runtime.ts:448] [E: packages/coding-agent/src/core/model-runtime.ts:450] [E: packages/coding-agent/src/core/model-runtime.ts:456] [E: packages/coding-agent/src/core/model-runtime.ts:459] [E: packages/coding-agent/src/core/model-runtime.ts:460] [E: packages/coding-agent/src/core/model-runtime.ts:461]。

## HTTP 出站配置面

`configureHttpDispatcher()` 是 process-wide HTTP 配置入口:CLI 和 RPC entry 在调用 `main()` 前都会调用它 [E: packages/coding-agent/src/cli.ts:18] [E: packages/coding-agent/src/cli.ts:20] [E: packages/coding-agent/src/rpc-entry.ts:10]。该函数把 undici global dispatcher 设为 `EnvHttpProxyAgent`,默认 idle timeout 是 300000ms,并设置 `bodyTimeout` 与 `headersTimeout`;它还在可安全替换时安装 npm undici 的 `fetch`,让 fetch 与 dispatcher 使用同一 undici implementation [E: packages/coding-agent/src/core/http-dispatcher.ts:4] [E: packages/coding-agent/src/core/http-dispatcher.ts:79] [E: packages/coding-agent/src/core/http-dispatcher.ts:84] [E: packages/coding-agent/src/core/http-dispatcher.ts:85] [E: packages/coding-agent/src/core/http-dispatcher.ts:86] [E: packages/coding-agent/src/core/http-dispatcher.ts:87] [E: packages/coding-agent/src/core/http-dispatcher.ts:88] [E: packages/coding-agent/src/core/http-dispatcher.ts:93] [E: packages/coding-agent/src/core/http-dispatcher.ts:98] [E: packages/coding-agent/src/core/http-dispatcher.ts:102] [E: packages/coding-agent/src/core/http-dispatcher.ts:103]。`applyHttpProxySettings()` 只在 `HTTP_PROXY`/`HTTPS_PROXY` 未设置时把 `httpProxy` 写入环境变量 [E: packages/coding-agent/src/core/http-dispatcher.ts:43] [E: packages/coding-agent/src/core/http-dispatcher.ts:44] [E: packages/coding-agent/src/core/http-dispatcher.ts:46] [E: packages/coding-agent/src/core/http-dispatcher.ts:47]。

HTTP dispatcher 因而是 proxy/timeout 适配层,不是 allowlist、egress firewall 或 credential redaction layer [I]。本节点只确认 CLI/RPC 入口和 undici/fetch 全局路径;尚未逐 provider SDK 证明所有网络调用都遵循这个 dispatcher,所以不能把它写成完整网络隔离机制 [U]。

## Tool Execution 与扩展拦截

内置工具 ground truth 是 `packages/coding-agent/src/core/tools/index.ts`:当前 `ToolName` union 和 `allToolNames` 包含 `read`、`bash`、`edit`、`write`、`grep`、`find`、`ls` [E: packages/coding-agent/src/core/tools/index.ts:81] [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84]。`createAllToolDefinitions()` 为这七个名字生成 definition [E: packages/coding-agent/src/core/tools/index.ts:156] [E: packages/coding-agent/src/core/tools/index.ts:157] [E: packages/coding-agent/src/core/tools/index.ts:158] [E: packages/coding-agent/src/core/tools/index.ts:159] [E: packages/coding-agent/src/core/tools/index.ts:160] [E: packages/coding-agent/src/core/tools/index.ts:161] [E: packages/coding-agent/src/core/tools/index.ts:162] [E: packages/coding-agent/src/core/tools/index.ts:163] [E: packages/coding-agent/src/core/tools/index.ts:164]。`AgentSession._buildRuntime()` 会用 settings 中的 image resize、shell command prefix 和 shell path 构造 base tool definitions,默认调用 `createAllToolDefinitions(this._cwd, { read, bash })`,再把 built-in tools 和 extension tools 包装后放进 runtime registry [E: packages/coding-agent/src/core/agent-session.ts:2547] [E: packages/coding-agent/src/core/agent-session.ts:2552] [E: packages/coding-agent/src/core/agent-session.ts:2553] [E: packages/coding-agent/src/core/agent-session.ts:2554] [E: packages/coding-agent/src/core/agent-session.ts:2562] [E: packages/coding-agent/src/core/agent-session.ts:2563] [E: packages/coding-agent/src/core/agent-session.ts:2564] [E: packages/coding-agent/src/core/agent-session.ts:2505] [E: packages/coding-agent/src/core/agent-session.ts:2506] [E: packages/coding-agent/src/core/agent-session.ts:2516] [E: packages/coding-agent/src/core/agent-session.ts:2520]。

agent-core 的 tool execution path 先从 assistant message 取 `toolCall` blocks;如果全局 `toolExecution` 是 sequential 或某个工具声明 `executionMode === "sequential"`,就走 sequential path,否则 parallel path [E: packages/agent/src/agent-loop.ts:411] [E: packages/agent/src/agent-loop.ts:418] [E: packages/agent/src/agent-loop.ts:419] [E: packages/agent/src/agent-loop.ts:420] [E: packages/agent/src/agent-loop.ts:422] [E: packages/agent/src/agent-loop.ts:423] [E: packages/agent/src/agent-loop.ts:425]。执行前 `prepareToolCall()` 会查工具是否存在、prepare arguments、validate arguments,然后调用 `config.beforeToolCall`;如果 before hook 返回 `{ block: true }`,它会生成 error tool result 而不执行工具 [E: packages/agent/src/agent-loop.ts:607] [E: packages/agent/src/agent-loop.ts:611] [E: packages/agent/src/agent-loop.ts:617] [E: packages/agent/src/agent-loop.ts:618] [E: packages/agent/src/agent-loop.ts:619] [E: packages/agent/src/agent-loop.ts:620] [E: packages/agent/src/agent-loop.ts:636] [E: packages/agent/src/agent-loop.ts:638] [E: packages/agent/src/agent-loop.ts:639]。

coding-agent 把 extension `tool_call` 事件接到 agent-core 的 `beforeToolCall`:`_installAgentToolHooks()` 在有 `tool_call` handler 时调用 `runner.emitToolCall()` 并传入 `toolName`、`toolCallId` 和 `input` [E: packages/coding-agent/src/core/agent-session.ts:468] [E: packages/coding-agent/src/core/agent-session.ts:469] [E: packages/coding-agent/src/core/agent-session.ts:471] [E: packages/coding-agent/src/core/agent-session.ts:476] [E: packages/coding-agent/src/core/agent-session.ts:477] [E: packages/coding-agent/src/core/agent-session.ts:478] [E: packages/coding-agent/src/core/agent-session.ts:479] [E: packages/coding-agent/src/core/agent-session.ts:480]。agent-core 在 validate arguments 后调用 `beforeToolCall`,block result 会转成 error tool result 而不执行工具 [E: packages/agent/src/agent-loop.ts:617] [E: packages/agent/src/agent-loop.ts:618] [E: packages/agent/src/agent-loop.ts:619] [E: packages/agent/src/agent-loop.ts:636] [E: packages/agent/src/agent-loop.ts:637] [E: packages/agent/src/agent-loop.ts:638] [E: packages/agent/src/agent-loop.ts:639] [E: packages/agent/src/agent-loop.ts:640]。扩展类型文档进一步说明 `event.input` 可原地修改、后续 handler 会看到前序修改且 mutation 后不会重新 validation [I]。runner 对 `tool_call` handler 顺序执行;一旦某个 result 带 `block`,立即返回该 result [E: packages/coding-agent/src/core/extensions/runner.ts:919] [E: packages/coding-agent/src/core/extensions/runner.ts:923] [E: packages/coding-agent/src/core/extensions/runner.ts:927] [E: packages/coding-agent/src/core/extensions/runner.ts:928] [E: packages/coding-agent/src/core/extensions/runner.ts:930] [E: packages/coding-agent/src/core/extensions/runner.ts:932] [E: packages/coding-agent/src/core/extensions/runner.ts:933]。

这组 hook 是可扩展的 policy/interception point,不是默认权限沙箱:没有扩展 handler 时 `_installAgentToolHooks()` 返回 undefined,agent-core 会继续执行已验证的工具调用 [E: packages/coding-agent/src/core/agent-session.ts:469] [E: packages/coding-agent/src/core/agent-session.ts:471] [E: packages/coding-agent/src/core/agent-session.ts:472] [I]。工具真正执行发生在 `prepared.tool.execute(toolCall.id, args, signal, updateCallback)`,异常会转成 error tool result [E: packages/agent/src/agent-loop.ts:666] [E: packages/agent/src/agent-loop.ts:675] [E: packages/agent/src/agent-loop.ts:676] [E: packages/agent/src/agent-loop.ts:677] [E: packages/agent/src/agent-loop.ts:678] [E: packages/agent/src/agent-loop.ts:697] [E: packages/agent/src/agent-loop.ts:701] [E: packages/agent/src/agent-loop.ts:702]。

## 不可信工作负载的运行建议

安全文档建议:对不可信仓库、不打算密切监控的 generated code 或无人值守 automation,应在 container、VM、micro-VM、remote sandbox 或 policy-controlled sandbox 中运行 Pi,并只给任务所需文件和 credentials [E: packages/coding-agent/docs/security.md:39] [E: packages/coding-agent/docs/security.md:41]。同一文档列出的常见模式包括把整个 Pi 进程放进 container/sandbox、把 built-in tool execution 路由到 Gondolin micro-VM、只挂载需要的 workspace path、避免挂载 host `~/.pi/agent`、传最少 API key 或短期凭证、在不需要网络时限制网络访问、回写 trusted system 前先 review diffs/outputs [E: packages/coding-agent/docs/security.md:43] [E: packages/coding-agent/docs/security.md:45] [E: packages/coding-agent/docs/security.md:46] [E: packages/coding-agent/docs/security.md:47] [E: packages/coding-agent/docs/security.md:48] [E: packages/coding-agent/docs/security.md:49] [E: packages/coding-agent/docs/security.md:50] [E: packages/coding-agent/docs/security.md:51]。如果把 host workspace 以读写 bind mount 进容器或 VM,内部写入仍能改 host 文件;需要更强写保护时应使用 read-only mount 或 copy-in/copy-out [E: packages/coding-agent/docs/security.md:53]。

## 跨包关系

`surface.trust.model` 是本节点的用户面 sibling:它应细化 trust prompt、trust store、project resource discovery 和 saved parent decision。本节点只把 project trust 放在安全边界总览里,并明确它不是 sandbox [I]。

`surface.misc.containerization` 是运行不可信工作负载的 sibling:本节点引用安全文档中的 container/VM/micro-VM 建议,但不展开具体部署步骤 [I]。

`subsys.ai.auth-resolution` 描述 ai 包 provider auth resolver;本节点只使用 `resolveProviderAuth()` 与 `ModelsImpl.applyAuth()` 解释 credential 如何进入 request auth [E: packages/ai/src/auth/resolve.ts:46] [E: packages/ai/src/models.ts:463]。

`subsys.coding-agent.http-dispatcher` 描述 coding-agent 的 undici global dispatcher 与 proxy/timeout配置;本节点只把它归入“网络配置面,非 sandbox” [I]。

`subsys.agent-core.tool-invocation` 描述 agent-core 的 sequential/parallel tool-call 执行细节;本节点只抽取 before hook、block 和 execute call 作为安全相关行为 [E: packages/agent/src/agent-loop.ts:411] [E: packages/agent/src/agent-loop.ts:619] [E: packages/agent/src/agent-loop.ts:675]。

## Sources

- `packages/coding-agent/docs/security.md`
- `SECURITY.md`
- `packages/coding-agent/src/core/trust-manager.ts`
- `packages/coding-agent/src/core/project-trust.ts`
- `packages/coding-agent/src/core/settings-manager.ts`
- `packages/coding-agent/src/core/resource-loader.ts`
- `packages/coding-agent/src/core/auth-storage.ts`
- `packages/coding-agent/src/core/runtime-credentials.ts`
- `packages/coding-agent/src/core/model-runtime.ts`
- `packages/coding-agent/src/core/model-registry.ts`
- `packages/ai/src/auth/resolve.ts`
- `packages/ai/src/models.ts`
- `packages/coding-agent/src/core/http-dispatcher.ts`
- `packages/coding-agent/src/cli.ts`
- `packages/coding-agent/src/rpc-entry.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/coding-agent/src/core/extensions/types.ts`
- `packages/coding-agent/src/core/extensions/runner.ts`
- `packages/coding-agent/src/core/tools/index.ts`
- `packages/agent/src/agent-loop.ts`

## 相关

- [surface.trust.model](../trust/model.md) - project trust 的完整用户面模型:提示、保存、父目录继承和资源加载门控。
- [surface.misc.containerization](containerization.md) - 不可信仓库和无人值守任务的容器、VM、micro-VM 运行策略。
