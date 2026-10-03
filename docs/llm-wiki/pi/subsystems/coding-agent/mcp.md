---
id: subsys.coding-agent.mcp
title: coding-agent MCP 扩展与服务器装配
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/extensions/index.ts
  - packages/coding-agent/src/extensions/mcp/index.ts
  - packages/coding-agent/src/extensions/mcp/config.ts
  - packages/coding-agent/src/extensions/mcp/tools.ts
  - packages/coding-agent/src/extensions/mcp/oauth.ts
  - packages/coding-agent/src/extensions/mcp/runtime.ts
  - packages/coding-agent/src/extensions/mcp/runtime.lazy.ts
  - packages/coding-agent/src/extensions/mcp/resources.ts
  - packages/coding-agent/src/extensions/mcp/cli.ts
  - packages/coding-agent/src/extensions/mcp/cli.lazy.ts
  - packages/coding-agent/src/extensions/mcp/log.ts
  - packages/coding-agent/src/extensions/mcp/ui.ts
  - packages/coding-agent/src/core/mcp-servers.ts
  - packages/coding-agent/src/core/extensions/loader.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/resource-loader.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/package-manager.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/core/source-info.ts
  - packages/coding-agent/src/core/slash-commands.ts
  - packages/coding-agent/test/resource-loader.test.ts
  - packages/coding-agent/test/mcp-extension.test.ts
  - packages/coding-agent/test/mcp-oauth-store.test.ts
  - packages/coding-agent/test/mcp-oauth-refresh.test.ts
  - packages/coding-agent/test/suite/agent-session-mcp.test.ts
symbols:
  - createMcpExtension
  - mcpNamespace
  - McpServerRegistry
  - validateMcpServerConfig
  - getMcpToolExposure
  - McpOAuthCredentialStore
  - createMcpAuthProvider
  - signInMcpServer
  - createMcpToolDefinition
  - createMcpToolName
  - toToolExposure
  - builtInExtensions
  - MCP_SERVERS_SECTION
  - loadMcpConfig
  - McpServerConnection
related:
  - surface.mcp.overview
  - subsys.mcp.client
  - subsys.coding-agent.codemode
  - surface.extensions.events
  - ref.coding-agent.extension-events
  - subsys.coding-agent.extension-runner
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> coding-agent MCP 装配层把 `mcp.json` 与 `pi.registerMcpServer()` 登记项接到内置 replaceable 扩展 `createMcpExtension()`: 后台连接 `@earendil-works/pi-mcp` 的 `McpClient`, 把 server tools wrap 成 `mcp__<server>__<tool>` pi tools, 并按 exposure 决定模型声明、`searchTools()` 还是 `tool_search`。JSON-RPC / transport / `authorizeMcp()` 协议本身属于 [subsys.mcp.client](../mcp/client.md), 本节点不复述。

## 能回答的问题

- `createMcpExtension` 怎样作为 `builtin:mcp` 装入, 另一个扩展注册 `/mcp` 时为什么会整份替换而不是并行连接?
- `mcpNamespace` 如何把 server 名变成 `mcp__…`, `-`/`_` 冲突在 config 与 `registerMcpServer` 各拦一次?
- 第一次 prompt 会不会等非 `direct` 的 MCP server? `startupWaitMs` 卡在哪?
- MCP tools 是 wrap 成普通 pi tool, 还是只给 codemode `searchTools()` 用? `toToolExposure` 把 `codemode` 映到什么?
- OAuth 凭证存在哪, key 为什么是 server name + URL, 同 URL 两个 server 会不会串账号?
- `mcp_servers_change` 谁 emit、谁 handle; 没有 handler 时登记的 server 怎样报错?
- RFC 9207 `iss` 和 `insufficient_scope` step-up 在 coding-agent 这一层做什么, 真正换 code 的校验在哪一包?

## 职责边界

`packages/coding-agent/src/core/mcp-servers.ts` 只校验/存储: `McpServerConfig`、`mcpNamespace()`、`getMcpToolExposure()`、`McpServerRegistry`。它不 connect, 也不 wrap tools; 连接由内置 MCP 扩展(或另一个 handle `mcp_servers_change` 的扩展)完成。[E: packages/coding-agent/src/core/mcp-servers.ts:221] [E: packages/coding-agent/src/core/mcp-servers.ts:289] [E: packages/coding-agent/src/core/mcp-servers.ts:316]

`packages/coding-agent/src/extensions/mcp/index.ts` 的 `createMcpExtension()` 是产品装配: load config、lazy-load runtime、connect、`pi.registerTool()`、`/mcp` command、`mcp_servers` system prompt section、以及 `session_start` / `before_agent_start` / `tool_call` / `mcp_servers_change` handlers。[E: packages/coding-agent/src/extensions/mcp/index.ts:276] [E: packages/coding-agent/src/extensions/mcp/index.ts:997] [E: packages/coding-agent/src/extensions/mcp/index.ts:1062] [E: packages/coding-agent/src/extensions/mcp/index.ts:1073] [E: packages/coding-agent/src/extensions/mcp/index.ts:1097] [E: packages/coding-agent/src/extensions/mcp/index.ts:1141]

`packages/coding-agent/src/extensions/mcp/runtime.ts` 才 `new McpClient()` / `StdioTransport` / `StreamableHttpTransport`; `index.ts` 经 `runtime.lazy.ts` 动态 import, 没有 enabled server 时 `session_start` 直接 `reportProblems` 返回, 不 `loadMcpRuntime()`。[E: packages/coding-agent/src/extensions/mcp/runtime.lazy.ts:2] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:373] [E: packages/coding-agent/src/extensions/mcp/index.ts:1017] [E: packages/coding-agent/src/extensions/mcp/index.ts:1023]

`pi-mcp` 的 JSON-RPC session、stdio / Streamable HTTP、OAuth discovery 与 `authorizeMcp()` 的 issuer 校验见 [subsys.mcp.client](../mcp/client.md)。`/mcp` TUI 与 `pi mcp` CLI 的用户面见 [surface.mcp.overview](../../surface/mcp/overview.md)。

## 关键文件

- `packages/coding-agent/src/extensions/index.ts`: `builtInExtensions` 把 `mcp` 标成 `replaceable: true, builtin: true`; `llama.cpp` 是 builtin 但不可替换。[E: packages/coding-agent/src/extensions/index.ts:8] [E: packages/coding-agent/src/extensions/index.ts:13]
- `packages/coding-agent/src/core/mcp-servers.ts`: exposure 枚举、namespace、config validate、registry。
- `packages/coding-agent/src/extensions/mcp/index.ts`: `createMcpExtension`、connect timing、tool 注册、`mcp_servers_change` handler。
- `packages/coding-agent/src/extensions/mcp/config.ts`: 读/写 `~/.pi/agent/mcp.json` 与 trusted `.pi/mcp.json`。
- `packages/coding-agent/src/extensions/mcp/tools.ts`: `createMcpToolName` / `createMcpToolDefinition` / `toToolExposure`。
- `packages/coding-agent/src/extensions/mcp/oauth.ts`: `mcp-auth.json` store、loopback sign-in、RFC 9207 `iss` 传递、step-up。
- `packages/coding-agent/src/extensions/mcp/runtime.ts`: `McpServerConnection`、`createDefaultTransport`。
- `packages/coding-agent/src/extensions/mcp/resources.ts`: Codex 同名 `list_mcp_resources` / `list_mcp_resource_templates` / `read_mcp_resource`。
- `packages/coding-agent/src/extensions/mcp/cli.ts` / `ui.ts`: session 外 `pi mcp` 与 TUI `/mcp` manager。
- `packages/coding-agent/src/core/extensions/loader.ts`: `pi.registerMcpServer()` 写入 shared `McpServerRegistry`。
- `packages/coding-agent/src/core/extensions/runner.ts`: bind 后 emit `mcp_servers_change`; 无 handler 则 `reportUnhandledMcpServers()`。
- `packages/coding-agent/test/suite/agent-session-mcp.test.ts`: 第一次 prompt 不等 codemode server; 只等 `direct` 且受 `startupWaitMs` 上限。
- `packages/coding-agent/test/mcp-oauth-store.test.ts` / `mcp-oauth-refresh.test.ts`: 凭证按 name+URL 隔离、RFC 9207 拒错 issuer、step-up 保留已授权 scope。

## 数据模型

`McpExposure` 是 `"codemode" | "deferred" | "direct" | "hidden"`; 缺省 server exposure 是 `codemode`。旧名 `"codemode-deferred"` 在 validate 时改写成 `"codemode"`。[E: packages/coding-agent/src/core/mcp-servers.ts:17] [E: packages/coding-agent/src/core/mcp-servers.ts:22] [E: packages/coding-agent/src/core/mcp-servers.ts:214] [E: packages/coding-agent/test/mcp-extension.test.ts:132] [E: packages/coding-agent/test/mcp-extension.test.ts:146]

`mcpNamespace(server)` 返回 `mcp__${server.replace(/-/g, "_")}`, 与 tool 名同一套 `-`→`_` 规则。[E: packages/coding-agent/src/core/mcp-servers.ts:120] [E: packages/coding-agent/src/core/mcp-servers.ts:121] 仅 `-`/`_` 不同的两个名字会共享 namespace, 所以 `loadMcpConfig` 与 `registerMcpServer` 都拒绝 clash。[E: packages/coding-agent/src/extensions/mcp/config.ts:128] [E: packages/coding-agent/src/core/extensions/loader.ts:484] [E: packages/coding-agent/test/mcp-extension.test.ts:118]

`getMcpToolExposure(config, toolName)`: 精确 `toolExposure[toolName]` 优先; 否则按 object 插入序第一个含 `*` 且匹配的 pattern; 再否则 `config.exposure ?? "codemode"`。[E: packages/coding-agent/src/core/mcp-servers.ts:207] [E: packages/coding-agent/src/core/mcp-servers.ts:210] [E: packages/coding-agent/src/core/mcp-servers.ts:212] [E: packages/coding-agent/src/core/mcp-servers.ts:214]

`McpServerRegistry` 是 runtime 上的登记表: `register` / `unregister`(按 `extensionPath` 所有权) / `list()` 的 structuredClone 副本。`setChangeListener` 由 runner bind 时挂上, 每次变更回调。[E: packages/coding-agent/src/core/mcp-servers.ts:294] [E: packages/coding-agent/src/core/mcp-servers.ts:300] [E: packages/coding-agent/src/core/mcp-servers.ts:312] [E: packages/coding-agent/src/core/mcp-servers.ts:316] loader 创建 runtime 时放一个空 registry。[E: packages/coding-agent/src/core/extensions/loader.ts:189]

`McpServersChangeEvent` 是 `{ type: "mcp_servers_change"; servers: RegisteredMcpServer[] }`。类型注释: load 阶段的登记在 `session_start` 用 `pi.getMcpServers()` 读; handle 该事件等于宣称“我来 connect 登记的 servers”。[E: packages/coding-agent/src/core/extensions/types.ts:721] [E: packages/coding-agent/src/core/extensions/types.ts:722] [E: packages/coding-agent/src/core/extensions/types.ts:724] [E: packages/coding-agent/src/core/extensions/types.ts:1578]

`McpExtensionOptions` 可注入 `loadConfig`、`createTransport`、`credentials`、`startupWaitMs`(默认 `10000`)。[E: packages/coding-agent/src/extensions/mcp/index.ts:69] [E: packages/coding-agent/src/extensions/mcp/index.ts:90] [E: packages/coding-agent/src/extensions/mcp/index.ts:93]

## 控制流

1. CLI `main()` 把 `builtInExtensions` 放进 `DefaultResourceLoader` 的 `extensionFactories`。`builtin: true` 的条目不是 inline factory: loader 把它们收进 `builtinExtensions` Map, 由 package-manager 以 `builtin:<name>` 路径默认启用(`-builtin:mcp` 可关)。[E: packages/coding-agent/src/main.ts:575] [E: packages/coding-agent/src/extensions/index.ts:13] [E: packages/coding-agent/src/core/resource-loader.ts:374] [E: packages/coding-agent/src/core/resource-loader.ts:375] [E: packages/coding-agent/src/core/package-manager.ts:973] [E: packages/coding-agent/src/core/package-manager.ts:974] [E: packages/coding-agent/src/core/source-info.ts:15]

2. `builtin:mcp` 的 factory 是 default export `createMcpExtension()`。[E: packages/coding-agent/src/extensions/mcp/index.ts:1225] [E: packages/coding-agent/src/extensions/index.ts:4] loader 跑 factory 后把 `extension.replaceable = true`。[E: packages/coding-agent/src/core/resource-loader.ts:730] `InlineExtension.replaceable` 表示: 另一个扩展在 load 时注册了同名 tool/command/flag, 就整份 omit 这份扩展, 而不是报 conflict。[E: packages/coding-agent/src/core/extensions/types.ts:2024] `omitReplacedExtensions()` 若发现不可替换扩展已经注册了同一 tool/command/flag 名, 就丢掉这份 replaceable 扩展(builtin MCP 典型冲突点是 command `mcp` → `/mcp`), 并 warning。[E: packages/coding-agent/src/core/resource-loader.ts:120] [E: packages/coding-agent/src/core/resource-loader.ts:135] [E: packages/coding-agent/src/core/resource-loader.ts:697] [E: packages/coding-agent/test/resource-loader.test.ts:1041] [E: packages/coding-agent/test/resource-loader.test.ts:1074] `llama.cpp` 没有 `replaceable`, 同名冲突走普通 diagnostics, 不会被 omit。[E: packages/coding-agent/src/extensions/index.ts:8]

3. `pi.registerMcpServer(name, config)` 先 `validateMcpServerConfig`, 再拒绝别的 extension 占用的 name 与 namespace clash, 然后 `runtime.mcpServers.register(...)`。[E: packages/coding-agent/src/core/extensions/loader.ts:471] [E: packages/coding-agent/src/core/extensions/loader.ts:473] [E: packages/coding-agent/src/core/extensions/loader.ts:478] [E: packages/coding-agent/src/core/extensions/loader.ts:484] [E: packages/coding-agent/src/core/extensions/loader.ts:487] bind 之前 listener 为空, load 期登记不 emit; `ExtensionRunner.bindCore()` 才 `setChangeListener`, 之后的 register/unregister emit `{ type: "mcp_servers_change", servers: list() }`。[E: packages/coding-agent/src/core/extensions/runner.ts:458] [E: packages/coding-agent/src/core/extensions/runner.ts:459]

4. `session_start`: 读 `mcp.json`(global + trusted project)与 `pi.getMcpServers()`。同 namespace 的 `mcp.json` 条目覆盖 extension 登记, 被覆盖的名字进 `overridden` 提示。[E: packages/coding-agent/src/extensions/mcp/index.ts:998] [E: packages/coding-agent/src/extensions/mcp/index.ts:1009] [E: packages/coding-agent/src/extensions/mcp/index.ts:330] [E: packages/coding-agent/src/extensions/mcp/index.ts:332] 然后 `ensureDiscoveryActive()`(按 **config** 激活 `codemode` / `tool_search`, 不等 connect), 再 `setImmediate` 后 `loadMcpRuntime()` 并后台 `startConnection`。[E: packages/coding-agent/src/extensions/mcp/index.ts:1015] [E: packages/coding-agent/src/extensions/mcp/index.ts:1023] [E: packages/coding-agent/src/extensions/mcp/index.ts:1025]

5. 第一次 `before_agent_start` 调 `waitForDirectServers()`: 只 await `hasDirectTools(entry)` 的 `server.ready`, 且 `Promise.race` 对 `startupWaitMs`(默认 10s)。超时发 info, 不阻塞 prompt; `waitedForStartup` 保证只等这一次。[E: packages/coding-agent/src/extensions/mcp/index.ts:141] [E: packages/coding-agent/src/extensions/mcp/index.ts:1040] [E: packages/coding-agent/src/extensions/mcp/index.ts:1042] [E: packages/coding-agent/src/extensions/mcp/index.ts:1044] [E: packages/coding-agent/src/extensions/mcp/index.ts:1048] [E: packages/coding-agent/src/extensions/mcp/index.ts:1051] [E: packages/coding-agent/src/extensions/mcp/index.ts:1063] `hasDirectTools` 看 server exposure **以及** `toolExposure` 值里有没有 `"direct"`。[E: packages/coding-agent/src/extensions/mcp/index.ts:136] [E: packages/coding-agent/src/extensions/mcp/index.ts:142] 测试: hanging 的 **codemode** server 不挡住第一次 prompt, 且那时模型只看见 `codemode`; hanging 的 **direct** server 等到 `startupWaitMs` 就放行。[E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:617] [E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:626] [E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:760] [E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:768]

6. 非 direct 的等待发生在 `tool_call`: codemode script 若含 `searchTools`/`describeNamespace`/`describeTool`/`ALL_TOOLS` 或 `mcpNamespace(server)` 字符串, 就等那些还没 connected 的 server; `tool_search` 与三个 resource tools 等全部 pending servers。[E: packages/coding-agent/src/extensions/mcp/index.ts:223] [E: packages/coding-agent/src/extensions/mcp/index.ts:225] [E: packages/coding-agent/src/extensions/mcp/index.ts:1081] [E: packages/coding-agent/src/extensions/mcp/index.ts:1084] [E: packages/coding-agent/src/extensions/mcp/index.ts:1085] 不点名也不搜索的 script 不等 hanging server。[E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:724]

7. `mcp_servers_change`(session 已 active): 按 `registeredConfig` JSON 比对, 丢掉注销或改 config 的 extension servers(`hideTools` + `close`), 给新增且 enabled 的立刻 `startConnection`, 再 `reportProblems`。[E: packages/coding-agent/src/extensions/mcp/index.ts:1097] [E: packages/coding-agent/src/extensions/mcp/index.ts:1098] [E: packages/coding-agent/src/extensions/mcp/index.ts:1104] [E: packages/coding-agent/src/extensions/mcp/index.ts:1111] [E: packages/coding-agent/src/extensions/mcp/index.ts:1119] `AgentSession` 在 `session_start` emit 之后调 `reportUnhandledMcpServers()`: 若没有任何 extension handle `mcp_servers_change`(典型: 第三方 `/mcp` 替换了 builtin), 每个已登记 server 变成 `register_mcp_server` extension error。[E: packages/coding-agent/src/core/agent-session.ts:3232] [E: packages/coding-agent/src/core/agent-session.ts:3233] [E: packages/coding-agent/src/core/extensions/runner.ts:753] [E: packages/coding-agent/src/core/extensions/runner.ts:760]

8. `session_shutdown` bump `generation`、清空 `servers`、`close` 所有 connection, 迟到的 runtime load 被 `isCurrent()` 丢掉。[E: packages/coding-agent/src/extensions/mcp/index.ts:1132] [E: packages/coding-agent/src/extensions/mcp/index.ts:1134] [E: packages/coding-agent/src/extensions/mcp/index.ts:1138] [E: packages/coding-agent/src/extensions/mcp/index.ts:296]

## 工具装配: wrapping vs searchTools

每个 MCP tool 都走 `createMcpToolDefinition` → `pi.registerTool()`: wire name 是 `createMcpToolName(server, tool)` = 先 `mcp__${server}__${tool}` 再把非 `[A-Za-z0-9_]` 换成 `_`; 超过 64 字符或 `isTaken` 则截断并加 `sha256(server\0tool)` 的 8 hex。[E: packages/coding-agent/src/extensions/mcp/tools.ts:88] [E: packages/coding-agent/src/extensions/mcp/tools.ts:93] [E: packages/coding-agent/src/extensions/mcp/tools.ts:94] [E: packages/coding-agent/src/extensions/mcp/index.ts:408] `execute()` `getClient().callTool(...)` 后 `convertMcpResult`; 模型侧文本超 `MCP_OUTPUT_MAX_BYTES`(20KiB) 中间截断, 全文进 temp file; **codemode 拿到的 `structuredContent` 是完整 `CallToolResult`(去掉 `_meta`), 不截断**。[E: packages/coding-agent/src/extensions/mcp/tools.ts:285] [E: packages/coding-agent/src/extensions/mcp/tools.ts:287] [E: packages/coding-agent/src/extensions/mcp/tools.ts:52] [E: packages/coding-agent/src/extensions/mcp/tools.ts:227] [E: packages/coding-agent/src/extensions/mcp/tools.ts:231] MCP 调用是 `pi.registerTool` 的 `execute()`, 因此仍过 pi 的 `tool_call`/`tool_result` 与权限 pipeline, 不是 sandbox 里直连 MCP。[E: packages/coding-agent/src/extensions/mcp/index.ts:409]

`toToolExposure("codemode")` 返回 `"deferred"`; `"deferred"`/`"direct"`/`"hidden"` 原样进入 `ToolDefinition.exposure`。[E: packages/coding-agent/src/extensions/mcp/tools.ts:45] [E: packages/coding-agent/src/extensions/mcp/tools.ts:46] [E: packages/coding-agent/src/extensions/mcp/tools.ts:281] 两边 MCP exposure 都把 tool 排除在 **模型声明** 和 **codemode 工具清单** 之外, 差别只在 MCP 扩展激活哪把发现工具: `codemode` 激活 `codemode`(除非 `autoEnableCodemode === false`), `deferred` 激活 `tool_search`。[E: packages/coding-agent/src/extensions/mcp/index.ts:473] [E: packages/coding-agent/src/extensions/mcp/index.ts:482] [E: packages/coding-agent/src/extensions/mcp/index.ts:485] 脚本用 `searchTools()` / `describeNamespace()` / `describeTool()` 找到 `mcp__<ns>__<tool>` 再 `tools[name](...)`; session 测试覆盖这条路径。[E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:780] [E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:787] `direct` 则像内置工具一样立刻声明给模型, 第一次 prompt 会等它们连上。[E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:751] [E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:757]

`mcp_servers` section(`MCP_SERVERS_SECTION`) 只列出 enabled 且有 codemode/deferred tools 的 server(纯 direct 不进 section), 让模型在工具未声明时仍知道 namespace。[E: packages/coding-agent/src/extensions/mcp/index.ts:152] [E: packages/coding-agent/src/extensions/mcp/index.ts:191] [E: packages/coding-agent/src/extensions/mcp/index.ts:193] [E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:672]

pi 不能 unregister tool: server 撤回的名字会再 `registerTool({ ...definition, exposure: "hidden" })`。[E: packages/coding-agent/src/extensions/mcp/index.ts:414] [E: packages/coding-agent/src/extensions/mcp/index.ts:416] 有 resources 且 server exposure 非 hidden 时, 再注册 Codex 同名 resource tools, exposure 取 `direct` > `codemode` > `deferred` 中最宽的一档。[E: packages/coding-agent/src/extensions/mcp/index.ts:445] [E: packages/coding-agent/src/extensions/mcp/index.ts:447] [E: packages/coding-agent/src/extensions/mcp/resources.ts:34]

## OAuth: 凭证键、RFC 9207 iss、step-up scopes

连接自己 **不会** 开浏览器: `createMcpAuthProvider` 只送/刷新已存 token; 刷新失败或 `WWW-Authenticate` `insufficient_scope` 抛 `McpOAuthAuthorizationRequiredError`, 用户经 `/mcp` 或 `pi mcp login` 跑 PKCE + DCR/CIMD。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:341] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:353] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:356] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:456]

凭证在 `<agent-dir>/mcp-auth.json`, 经 `FileAuthStorageBackend`。现行 key 是 `` `${mcpNamespace(name)}|${String(new URL(serverUrl))}` ``, 所以 **同 URL 不同 server 名是两套账号**; 旧版本只按 URL 存的 `legacyKey` 由第一个 `load()` 的 server 接管并删掉。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:127] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:129] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:144] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:155] [E: packages/coding-agent/test/mcp-oauth-store.test.ts:17] [E: packages/coding-agent/test/mcp-oauth-store.test.ts:22] [E: packages/coding-agent/test/mcp-oauth-store.test.ts:43] `my-work` 与 `my_work` 因 namespace 相同而读同一条。[E: packages/coding-agent/test/mcp-oauth-store.test.ts:41]

RFC 9207 在本层两处落地, 真正 “code 的 `iss` 必须等于 authorization server issuer” 的比较在 `pi-mcp` `authorizeMcp()`(见 [subsys.mcp.client](../mcp/client.md)):

- sign-in 从 callback / 粘贴的 redirect URL 取出 `{ code, iss }`, 交给 `authorizeMcp({ authorizationCode, iss })`。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:383] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:401] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:522] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:528] 测试用攻击者 `iss` 期望 `OAuthIssuerMismatchError`。[E: packages/coding-agent/test/mcp-oauth-refresh.test.ts:113] [E: packages/coding-agent/test/mcp-oauth-refresh.test.ts:114]
- `clientRegistration: "cimd"`: 若 metadata 声明 `authorization_response_iss_parameter_supported`, 用共享 `https://pi.dev/oauth/client.json` + 默认 `/callback`; **否则** 用 MCP server URL 的 9-byte sha256 base64url 做路径, `https://pi.dev/oauth/<id>/client.json` 配 `/callback/<id>`, 避免无 `iss` 时把别的 AS 的响应接到这条 client。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:42] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:253] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:254] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:256] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:259] [E: packages/coding-agent/test/mcp-oauth-refresh.test.ts:193] [E: packages/coding-agent/test/mcp-oauth-refresh.test.ts:197] [E: packages/coding-agent/test/mcp-oauth-refresh.test.ts:212] [E: packages/coding-agent/test/mcp-oauth-refresh.test.ts:218]

Step-up: `insufficient_scope` **禁止** 用 refresh 续命(refresh 保原 scope)。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:356] `signInMcpServer` 把 `challenge.error === "insufficient_scope"` 标成 `stepUp`, `skipRefresh: true`, 请求 scope = 配置 scope ∪ `stepUpScope(granted, challenged)`(challenge 可能只列缺的 scope)。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:465] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:508] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:510] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:514] 测试: 先要 `issues:read`, 再 challenge `issues:write`, 第二次 authorize URL 的 scope 是 `issues:read issues:write`。[E: packages/coding-agent/test/mcp-oauth-refresh.test.ts:145] [E: packages/coding-agent/test/mcp-oauth-refresh.test.ts:148]

`stepUpScope` 的集合实现在 `pi-mcp`; coding-agent 只调用。HTTP 无 `Authorization` header 且无 `auth.provider` 才走 OAuth; `auth.provider` 每请求读 pi provider token, 且 **禁止出现在 project `mcp.json`**。[E: packages/coding-agent/src/extensions/mcp/runtime.ts:82] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:214] [E: packages/coding-agent/src/extensions/mcp/config.ts:133]

## 设计动机与权衡

- replaceable builtin: 第三方注册 `/mcp` 时只留一份连接器, 避免两个扩展对同一批 server 各连一次。factory 仍会跑完再被 omit, 所以 replaceable 扩展应只做 registration。[E: packages/coding-agent/src/core/extensions/types.ts:2024] [E: packages/coding-agent/src/core/resource-loader.ts:135] [I]
- 默认 `codemode` exposure + 第一次 prompt 只等 `direct`: MCP 工具数量不撑爆模型 tool list, 慢/挂的 stdio/HTTP server 不挡住首 round; 脚本/`tool_search` 在真正需要时再等。[E: packages/coding-agent/src/extensions/mcp/index.ts:1044] [E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:617] [I]
- 凭证 key 带 namespace: 共享 URL 的 work/personal server 不能串 token(`#10252`)。[E: packages/coding-agent/test/mcp-oauth-store.test.ts:17]
- 无 RFC 9207 `iss` 时 CIMD 用 server-specific redirect: 混用 AS 的 authorization response 打不到这条 callback(RFC 9700 4.4.2.2 的混 AS 风险)。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:256] [E: packages/coding-agent/test/mcp-oauth-refresh.test.ts:212] [I]
- MCP runtime lazy: 无 enabled server 时 `session_start` 不调用 `loadMcpRuntime()`。[E: packages/coding-agent/src/extensions/mcp/index.ts:1017] [E: packages/coding-agent/src/extensions/mcp/index.ts:1023]

## Gotchas

- `/mcp` **不在** `BUILTIN_SLASH_COMMANDS`(该表 24 个, 无 `mcp`); 由 MCP 扩展 `registerCommand("mcp", …)`。替换 builtin 后若新扩展不注册同名 command, slash 列表里就没有 `/mcp`。[E: packages/coding-agent/src/core/slash-commands.ts:19] [E: packages/coding-agent/src/extensions/mcp/index.ts:1141]
- SDK `DefaultResourceLoader` 默认 **没有** `builtInExtensions`; CLI 才在 `main()` 把它们塞进 `extensionFactories`。SDK 要自己传入 `createMcpExtension()`, 并 `session.bindExtensions()` 才会跑 `session_start` 连接。[E: packages/coding-agent/src/core/resource-loader.ts:373] [E: packages/coding-agent/src/main.ts:575]
- `ensureDiscoveryActive` 用 `isCodemodeTool` / `isToolSearchTool` 认工具, 不会激活别的扩展抢注的同名 `codemode`。[E: packages/coding-agent/src/extensions/mcp/index.ts:478] [E: packages/coding-agent/src/extensions/mcp/index.ts:479] [E: packages/coding-agent/test/suite/agent-session-mcp.test.ts:560]
- 未信任项目不读 `.pi/mcp.json`(stdio 会跑命令); project override 只能改 `enabled` / `exposure` / `toolExposure`, 不能改 command/url, 也不能设 `auth`。[E: packages/coding-agent/src/extensions/mcp/config.ts:148] [E: packages/coding-agent/src/extensions/mcp/config.ts:74] [E: packages/coding-agent/src/extensions/mcp/config.ts:114] [E: packages/coding-agent/src/extensions/mcp/config.ts:133] [E: packages/coding-agent/test/mcp-extension.test.ts:84]
- `McpServerConnection` 对 HTTP 连接失败做 250ms/1s 两次 transient retry; tool call 本身不因 HTTP 5xx 重试(可能已经执行过); read-only resource 请求允许一次 transient retry; `McpSessionExpiredError` 换新 session 再试一次。[E: packages/coding-agent/src/extensions/mcp/runtime.ts:50] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:356] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:297] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:301]
- `close()` 会 `authProvider.settled()`, 避免进程退出时丢掉刚 rotate 的 refresh token。[E: packages/coding-agent/src/extensions/mcp/runtime.ts:472]

## 跨包关系

- [surface.mcp.overview](../../surface/mcp/overview.md): `/mcp`、`pi mcp`、`.pi/mcp.json` 字段、exposure 对用户的含义; 本节点写装配与 connect/wrap/OAuth store。
- [subsys.mcp.client](../mcp/client.md): `@earendil-works/pi-mcp` 的 `McpClient`、stdio / Streamable HTTP / in-memory transport、`authorizeMcp()` 的 RFC 9207 issuer 比较与 `stepUpScope()` 实现。coding-agent 只构造 transport、传 `iss`、调 `stepUpScope`。
- [subsys.coding-agent.codemode](codemode.md): `searchTools` / `describeNamespace` / `tool_search`; MCP 默认把 tools 藏进这套发现面, 并在有 `codemode`/`deferred` server 时 `setActiveTools`。
- [surface.extensions.events](../../surface/extensions/events.md) / [ref.coding-agent.extension-events](../../reference/extension-events.md): `mcp_servers_change` 的 `on()` 合同; 本节点写谁 emit、builtin 如何消费。
- [subsys.coding-agent.extension-runner](extension-runner.md): `bindCore` 挂 registry listener、`emit({ type: "mcp_servers_change" })`、`reportUnhandledMcpServers()`。

## 推断与存疑

- [I] replaceable 的产品意图是“一份 `/mcp` 连接器”, 从 `omitReplacedExtensions` 注释与 types 的 `/mcp` 例子推出。
- [I] 默认不等非 direct server, 是为了首 round 不被 MCP 连接拖住; 代码路径明确, 产品动机来自 `waitForDirectServers` 旁注释。
- [I] 无 `iss` 时改 CIMD redirect path, 是为了隔离 authorization server; 可执行分支在 `clientMetadataDocument`, 安全叙述来自该函数上方注释。
- [U] 无。RFC 9207 换 code 时的 issuer 字符串比较不在本包实现, 权威在 [subsys.mcp.client](../mcp/client.md), 不是未知。

## Sources

- packages/coding-agent/src/extensions/index.ts
- packages/coding-agent/src/extensions/mcp/index.ts
- packages/coding-agent/src/extensions/mcp/config.ts
- packages/coding-agent/src/extensions/mcp/tools.ts
- packages/coding-agent/src/extensions/mcp/oauth.ts
- packages/coding-agent/src/extensions/mcp/runtime.ts
- packages/coding-agent/src/extensions/mcp/runtime.lazy.ts
- packages/coding-agent/src/extensions/mcp/resources.ts
- packages/coding-agent/src/extensions/mcp/cli.ts
- packages/coding-agent/src/extensions/mcp/cli.lazy.ts
- packages/coding-agent/src/extensions/mcp/log.ts
- packages/coding-agent/src/extensions/mcp/ui.ts
- packages/coding-agent/src/core/mcp-servers.ts
- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/package-manager.ts
- packages/coding-agent/src/core/slash-commands.ts
- packages/coding-agent/src/core/source-info.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/test/resource-loader.test.ts
- packages/coding-agent/test/mcp-extension.test.ts
- packages/coding-agent/test/mcp-oauth-store.test.ts
- packages/coding-agent/test/mcp-oauth-refresh.test.ts
- packages/coding-agent/test/suite/agent-session-mcp.test.ts

## 相关

- [surface.mcp.overview](../../surface/mcp/overview.md)
- [subsys.mcp.client](../mcp/client.md)
- [subsys.coding-agent.codemode](codemode.md)
- [surface.extensions.events](../../surface/extensions/events.md)
- [ref.coding-agent.extension-events](../../reference/extension-events.md)
- [subsys.coding-agent.extension-runner](extension-runner.md)
