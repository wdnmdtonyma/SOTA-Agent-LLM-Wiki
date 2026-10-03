---
id: subsys.mcp.client
title: pi-mcp 独立 MCP client
kind: subsystem
tier: T2
pkg: mcp
source:
  - packages/mcp/package.json
  - packages/mcp/README.md
  - packages/mcp/src/index.ts
  - packages/mcp/src/client.ts
  - packages/mcp/src/auth-provider.ts
  - packages/mcp/src/protocol/jsonrpc.ts
  - packages/mcp/src/protocol/types.ts
  - packages/mcp/src/protocol/content.ts
  - packages/mcp/src/transports/transport.ts
  - packages/mcp/src/transports/stdio.ts
  - packages/mcp/src/transports/streamable-http.ts
  - packages/mcp/src/transports/in-memory.ts
  - packages/mcp/src/oauth/index.ts
  - packages/mcp/src/oauth/flow.ts
  - packages/mcp/src/oauth/discovery.ts
  - packages/mcp/src/oauth/provider.ts
  - packages/mcp/src/oauth/errors.ts
  - packages/mcp/src/oauth/callback.ts
  - packages/mcp/src/oauth/types.ts
  - packages/mcp/src/testing/index.ts
  - packages/mcp/test/client.test.ts
  - packages/mcp/test/content.test.ts
  - packages/mcp/test/stdio.test.ts
  - packages/mcp/test/streamable-http.test.ts
  - packages/mcp/test/oauth.test.ts
  - packages/coding-agent/package.json
  - packages/coding-agent/src/extensions/mcp/runtime.ts
symbols:
  - McpClient
  - McpClientOptions
  - McpRequestOptions
  - AuthProvider
  - toLlmContent
  - LlmContent
  - CallToolResult
  - LATEST_PROTOCOL_VERSION
  - SUPPORTED_PROTOCOL_VERSIONS
  - McpTransport
  - StdioTransport
  - StreamableHttpTransport
  - InMemoryTransport
  - createInMemoryTransportPair
  - McpError
  - McpConnectionClosedError
  - McpTimeoutError
  - McpAbortError
  - McpAuthRequiredError
  - McpHttpError
  - McpSessionExpiredError
  - authorizeMcp
  - adaptOAuthProvider
  - McpOAuthProvider
  - MemoryOAuthStateStore
  - OAuthCallbackServer
  - McpOAuthAuthorizationRequiredError
  - discoverOAuthServerInfo
  - startAuthorization
  - registerClient
  - exchangeAuthorizationCode
  - refreshAuthorization
  - stepUpScope
related:
  - spine.layered-architecture
  - ref.package-index
  - surface.mcp.overview
  - subsys.coding-agent.mcp
  - surface.extensions.api
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `@earendil-works/pi-mcp` 是独立的 Model Context Protocol **client**：`McpClient` 负责 JSON-RPC 相关、初始化、超时与取消；transport 负责成帧与 I/O。包版本 **1.0.1**，runtime 依赖只有 `cross-spawn`，**不**依赖官方 MCP SDK，也 **不**依赖其它 pi workspace 包。

## 能回答的问题

- `McpClient.connect` / `listTools` / `callTool` / `close` 各自做什么，失败后还能不能对同一实例再 `connect`？
- stdio、Streamable HTTP、in-memory 三种 `McpTransport` 差在哪，in-memory 从哪个 export 进？
- `toLlmContent` 如何把 `CallToolResult` 收成 text/image？`isError` 会不会变成 JSON-RPC 异常？
- `LATEST_PROTOCOL_VERSION` 与 `SUPPORTED_PROTOCOL_VERSIONS` 是什么，server 回旧版本怎么办？
- `@earendil-works/pi-mcp/oauth` 的 PKCE / DCR / CIMD / refresh / `insufficient_scope` step-up 怎么接到 HTTP transport？
- 为什么本包能被无关应用单独用，而 coding-agent 只是消费者？

## 职责边界

本包是 **client-only** MCP 实现。公开 npm 名 `@earendil-works/pi-mcp`，版本 `1.0.1`，`engines.node` 为 `>=22.19.0`。[E: packages/mcp/package.json:2] [E: packages/mcp/package.json:3] [E: packages/mcp/package.json:51] `exports` 三个入口：`.`（client / transports / protocol）、`./oauth`、`./testing`。[E: packages/mcp/package.json:8] [E: packages/mcp/package.json:14] [E: packages/mcp/package.json:19]

`dependencies` 只有 `cross-spawn` `7.0.6`。[E: packages/mcp/package.json:53] [E: packages/mcp/package.json:54] README 写明不依赖官方 MCP SDK 或其它 pi 包。[E: packages/mcp/README.md:3] OAuth 源码改编自 MCP TypeScript SDK v1.29.0（MIT，许可证在 `LICENSES/`），运行时并不 import 该 SDK。[E: packages/mcp/README.md:112]

Transport 拥有成帧与 I/O，向 `McpClient` 投递**单条** `JsonRpcMessage`；client 拥有 request 相关、初始化、超时、取消、server→client request 与协议 helper。[E: packages/mcp/README.md:114] README 把 batch JSON-RPC、legacy HTTP+SSE、server 实现、sampling、tasks 标为 initial core 之外。[E: packages/mcp/README.md:132]

产品侧 `.pi/mcp.json`、`/mcp`、exposure、内置 mcp 扩展不在本节点；那些由 [surface.mcp.overview](../../surface/mcp/overview.md) 与 [subsys.coding-agent.mcp](../coding-agent/mcp.md) 覆盖。本节点只写 `packages/mcp` 的 client / transport / OAuth。

## 关键文件

- `packages/mcp/src/index.ts`：根 barrel；`McpClient`、`StdioTransport`、`StreamableHttpTransport`、`toLlmContent`、协议常量。[E: packages/mcp/src/index.ts:2] [E: packages/mcp/src/index.ts:15] [E: packages/mcp/src/index.ts:58]
- `packages/mcp/src/client.ts`：`McpClient`、`connect` / `listTools` / `callTool` / `close`。[E: packages/mcp/src/client.ts:153] [E: packages/mcp/src/client.ts:202] [E: packages/mcp/src/client.ts:294] [E: packages/mcp/src/client.ts:376] [E: packages/mcp/src/client.ts:386]
- `packages/mcp/src/auth-provider.ts`：HTTP 用的 `AuthProvider` / `McpFetch`（OAuth 适配到这一层）。[E: packages/mcp/src/auth-provider.ts:13]
- `packages/mcp/src/protocol/types.ts`：`LATEST_PROTOCOL_VERSION` / `SUPPORTED_PROTOCOL_VERSIONS` / `Tool`。[E: packages/mcp/src/protocol/types.ts:4] [E: packages/mcp/src/protocol/types.ts:9]
- `packages/mcp/src/protocol/content.ts`：`CallToolResult`、`toLlmContent`。[E: packages/mcp/src/protocol/content.ts:65] [E: packages/mcp/src/protocol/content.ts:111]
- `packages/mcp/src/protocol/jsonrpc.ts`：单消息 parse、`McpError` 族。[E: packages/mcp/src/protocol/jsonrpc.ts:110] [E: packages/mcp/src/protocol/jsonrpc.ts:45]
- `packages/mcp/src/transports/transport.ts`：`McpTransport` + `TransportEvents`。[E: packages/mcp/src/transports/transport.ts:9] [E: packages/mcp/src/transports/transport.ts:20]
- `packages/mcp/src/transports/stdio.ts`：`StdioTransport`，newline JSON-RPC + process group shutdown。[E: packages/mcp/src/transports/stdio.ts:69]
- `packages/mcp/src/transports/streamable-http.ts`：`StreamableHttpTransport`、session、GET SSE、`Last-Event-ID`。[E: packages/mcp/src/transports/streamable-http.ts:188]
- `packages/mcp/src/transports/in-memory.ts`：`InMemoryTransport` / `createInMemoryTransportPair`。[E: packages/mcp/src/transports/in-memory.ts:4] [E: packages/mcp/src/transports/in-memory.ts:45]
- `packages/mcp/src/oauth/flow.ts`：`authorizeMcp` / `adaptOAuthProvider` / PKCE / DCR / refresh / `stepUpScope`。[E: packages/mcp/src/oauth/flow.ts:397] [E: packages/mcp/src/oauth/flow.ts:419]
- `packages/mcp/src/oauth/provider.ts`：`McpOAuthProvider` + `MemoryOAuthStateStore`。[E: packages/mcp/src/oauth/provider.ts:53] [E: packages/mcp/src/oauth/provider.ts:40]
- `packages/mcp/src/testing/index.ts`：再导出 in-memory pair（**不**在根 barrel）。[E: packages/mcp/src/testing/index.ts:1]

## 数据模型

### `McpClient` 与 `McpClientOptions`

`McpClientOptions` 扩展 `Implementation`（必填 `name` / `version`，可选 `title`），另加 `capabilities`、`protocolVersion`、`requestTimeoutMs`、`roots`（数组或 async getter）。[E: packages/mcp/src/client.ts:47] [E: packages/mcp/src/protocol/types.ts:12] 构造时 `Object.freeze` 一份 options；默认注册 `ping` handler 返回 `{}`；若传入 `roots` 再注册 `roots/list`。[E: packages/mcp/src/client.ts:172] [E: packages/mcp/src/client.ts:173] [E: packages/mcp/src/client.ts:176]

内部 `ClientState` 为 `"idle" | "connecting" | "connected" | "closed"`。[E: packages/mcp/src/client.ts:41] 只读 getter：`connectionState`、`serverInfo`、`serverCapabilities`、`instructions`、`protocolVersion`。[E: packages/mcp/src/client.ts:182] [E: packages/mcp/src/client.ts:198]

`McpRequestOptions`：`signal`、`timeoutMs`、`onProgress`。[E: packages/mcp/src/client.ts:54] 缺省超时 `options.timeoutMs ?? this.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS`，`DEFAULT_REQUEST_TIMEOUT_MS` 为 `30_000`。[E: packages/mcp/src/client.ts:38] [E: packages/mcp/src/client.ts:418] `onProgress` 时把 request id 当作 `progressToken` 写入 params `_meta`。[E: packages/mcp/src/client.ts:403] [E: packages/mcp/src/client.ts:407]

### JSON-RPC 与错误类型

`parseJsonRpcMessage` 只接受单条 request / notification / response；否则 `McpError` + `JSON_RPC_ERROR_CODES.invalidRequest`（`-32600`）。[E: packages/mcp/src/protocol/jsonrpc.ts:110] [E: packages/mcp/src/protocol/jsonrpc.ts:112] [E: packages/mcp/src/protocol/jsonrpc.ts:39] `McpError` 带 `code` / `data`；连接断开为 `McpConnectionClosedError`；超时为 `McpTimeoutError`。[E: packages/mcp/src/protocol/jsonrpc.ts:45] [E: packages/mcp/src/protocol/jsonrpc.ts:57] [E: packages/mcp/src/protocol/jsonrpc.ts:64] `McpAbortError` 的 `this.name` 是 `"AbortError"`，不是 `"McpAbortError"`。[E: packages/mcp/src/protocol/jsonrpc.ts:77]

### 协议版本

`LATEST_PROTOCOL_VERSION` 为 `"2025-11-25"`。[E: packages/mcp/src/protocol/types.ts:4] `SUPPORTED_PROTOCOL_VERSIONS` 为该值加上 `"2025-06-18"`、`"2025-03-26"`、`"2024-11-05"`。[E: packages/mcp/src/protocol/types.ts:9] `connect` 的 initialize 默认请求 latest；server 选的 `protocolVersion` 必须落在 supported 集合，否则 throw 后 `close`。[E: packages/mcp/src/client.ts:221] [E: packages/mcp/src/client.ts:233] [E: packages/mcp/src/client.ts:245] 测试：旧版本 `"2024-11-05"` 可连接；`"1999-01-01"` 拒绝且 `connectionState` 为 `"closed"`。[E: packages/mcp/test/client.test.ts:260] [E: packages/mcp/test/client.test.ts:270] [E: packages/mcp/test/client.test.ts:271]

### `Tool` / `CallToolResult` / `toLlmContent`

`Tool` 要求 `name` + `inputSchema`（object）；可选 `title` / `description` / `outputSchema` / `annotations` / `execution` / `_meta`。[E: packages/mcp/src/protocol/types.ts:76] `listTools` 校验 `typeof tool.name === "string" && isObject(tool.inputSchema)`。[E: packages/mcp/src/client.ts:109]

`CallToolResult`：`content: ContentBlock[]`，可选 `structuredContent`、`isError`、`_meta`。[E: packages/mcp/src/protocol/content.ts:65] `callTool` 走 `tools/call`；server 省略 `content` 时 `validateCallToolResult` 补 `content: []`，不把 `isError` 当成协议错误。[E: packages/mcp/src/client.ts:382] [E: packages/mcp/src/client.ts:150] JSON-RPC `error` 才会 `reject` 成 `McpError`。[E: packages/mcp/src/client.ts:483]

`LlmContent` 是 `{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }`。[E: packages/mcp/src/protocol/content.ts:76] 本包不 import `pi-ai`；形状对齐写在 README。[E: packages/mcp/package.json:54] [E: packages/mcp/README.md:32] `toLlmContent`：text/image 原样；audio → `[audio ${mimeType} omitted]`；`resource_link` → `` `${name}: ${uri}` ``；embedded text → text；`mimeType` 以 `image/` 开头的 blob → image；其它 binary → `[binary resource … omitted]`；`content` 空且有 `structuredContent` 时 `JSON.stringify(..., null, 2)`。[E: packages/mcp/src/protocol/content.ts:80] [E: packages/mcp/src/protocol/content.ts:85] [E: packages/mcp/src/protocol/content.ts:87] [E: packages/mcp/src/protocol/content.ts:90] [E: packages/mcp/src/protocol/content.ts:92] [E: packages/mcp/src/protocol/content.ts:114] 行为由 `content.test.ts` 钉死。[E: packages/mcp/test/content.test.ts:15] [E: packages/mcp/test/content.test.ts:27]

### `McpTransport`

契约：`start` / `send` / `close` / `onMessage` / `onError` / `onClose`，可选 `setProtocolVersion`。[E: packages/mcp/src/transports/transport.ts:9] 默认消息上限 `DEFAULT_MAX_MESSAGE_BYTES = 16 * 1024 * 1024`。[E: packages/mcp/src/transports/transport.ts:3] `TransportEvents.emitClose` 每个 transport 最多一次。[E: packages/mcp/src/transports/transport.ts:51]

## 控制流

### `connect` / `listTools` / `callTool` / `close`

1. `new McpClient(options)` 冻结 options、注册 `ping`（以及可选 `roots/list`）。`McpClient.constructor@packages/mcp/src/client.ts:171`
2. `connect(transport)` 仅允许 `state === "idle"`，否则 throw；随后 `connecting`，挂上 message/error/close listener，`transport.start()`。`McpClient.connect@packages/mcp/src/client.ts:203` [E: packages/mcp/src/client.ts:214]
3. `requestInternal("initialize", …, allowConnecting=true)`：`protocolVersion` 默认 `LATEST_PROTOCOL_VERSION`；若有 `roots` 且 capabilities 未设 `roots`，补 `capabilities.roots = {}`。[E: packages/mcp/src/client.ts:216] [E: packages/mcp/src/client.ts:221] `initialize` 的 `cancellable` 为 `false`，超时/abort **不**发 `notifications/cancelled`。[E: packages/mcp/src/client.ts:429] [E: packages/mcp/test/client.test.ts:283]
4. 校验 `InitializeResult`；`protocolVersion` 必须属于 `SUPPORTED_PROTOCOL_VERSIONS`；写入 `serverInfo` / `capabilities` / `instructions`；`transport.setProtocolVersion?.(result.protocolVersion)`；再 `notifications/initialized`；`state = "connected"`。[E: packages/mcp/src/client.ts:233] [E: packages/mcp/src/client.ts:240] [E: packages/mcp/src/client.ts:241] [E: packages/mcp/src/client.ts:242]
5. 任一步失败：`await this.close().catch(() => {})` 再 throw，实例进入 `closed`，不能再 `connect`。[E: packages/mcp/src/client.ts:245] [E: packages/mcp/src/client.ts:203]
6. `listTools` 调 `listAll("tools/list", "tools", isTool)`：跟随 `nextCursor`，`nextCursor === null` 或 `""` 视为结束，重复 cursor throw，超过 `MAX_LIST_PAGES`（`1_000`）throw。[E: packages/mcp/src/client.ts:295] [E: packages/mcp/src/client.ts:104] [E: packages/mcp/src/client.ts:39] [E: packages/mcp/src/client.ts:373] 同套分页用于 `listResources` / `listResourceTemplates`；缺 `name` 的 resource 用 `uri` 顶上。[E: packages/mcp/src/client.ts:117]
7. `callTool(name, args, options)` 发送 `{ name, arguments }`（无 args 则省略 `arguments`），结果经 `validateCallToolResult`。[E: packages/mcp/src/client.ts:382]
8. 进行中的 request：progress notification 会 `armTimeout` 续期；`signal` abort 或超时对非 initialize 发 `notifications/cancelled`。[E: packages/mcp/src/client.ts:536] [E: packages/mcp/src/client.ts:561] 测试覆盖 progress 续期与 abort。[E: packages/mcp/test/client.test.ts:205] [E: packages/mcp/test/client.test.ts:216]
9. `close()`：摘 listener、`markClosed(McpConnectionClosedError)` reject 所有 pending、abort 正在处理的 server request、`transport.close()`。[E: packages/mcp/src/client.ts:390] [E: packages/mcp/src/client.ts:591] `onClose` 无论 transport drop 还是主动 `close` 都只触发一次。[E: packages/mcp/src/client.ts:597] [E: packages/mcp/test/client.test.ts:305]
10. Transport `onError` 只 `emitError`，**不**失败 pending request；pending 要等 close。[E: packages/mcp/src/client.ts:209] [E: packages/mcp/test/client.test.ts:246]

通用 `request` / `notify` / `onNotification` / `setRequestHandler` 覆盖 ping、logging、`notifications/tools/list_changed` 等；未知 server method 回 `methodNotFound`（`-32601`）。[E: packages/mcp/src/client.ts:250] [E: packages/mcp/src/client.ts:496] [E: packages/mcp/src/protocol/jsonrpc.ts:40]

### stdio vs Streamable HTTP vs in-memory

**stdio**（`StdioTransport`）：`crossSpawn(command, args)`，stdin/stdout pipe；`inheritEnv === false` 时只用 `options.env`，否则 `{ ...process.env, ...env }`。[E: packages/mcp/src/transports/stdio.ts:94] [E: packages/mcp/src/transports/stdio.ts:95] 非 Windows `detached: USE_PROCESS_GROUPS`（`process.platform !== "win32"`），把 server 放进独立 process group，host `exit` 时对 live group `SIGTERM`。[E: packages/mcp/src/transports/stdio.ts:11] [E: packages/mcp/src/transports/stdio.ts:101] [E: packages/mcp/src/transports/stdio.ts:49] `send` 写 `JSON.stringify(message) + "\n"`。[E: packages/mcp/src/transports/stdio.ts:146] `close`：`stdin.end()`，`STDIN_CLOSE_GRACE_MS`（500）后 `SIGTERM`，再过 `closeTimeoutMs`（默认 2000）`SIGKILL`；Windows 走 `taskkill /T /F`。[E: packages/mcp/src/transports/stdio.ts:177] [E: packages/mcp/src/transports/stdio.ts:10] [E: packages/mcp/src/transports/stdio.ts:174] [E: packages/mcp/src/transports/stdio.ts:175] [E: packages/mcp/src/transports/stdio.ts:176] [E: packages/mcp/src/transports/stdio.ts:8] [E: packages/mcp/src/transports/stdio.ts:23] stderr 环形缓冲默认 64 KiB。[E: packages/mcp/src/transports/stdio.ts:7] 集成测试用 fixture 跑 `listTools` + `callTool("echo")`。[E: packages/mcp/test/stdio.test.ts:18] [E: packages/mcp/test/stdio.test.ts:19]

**Streamable HTTP**（`StreamableHttpTransport`）：对 `url` POST JSON；`Accept: application/json, text/event-stream`。[E: packages/mcp/src/transports/streamable-http.ts:225] `fetch` 以 `(input, init) => fetch(input, init)` 调用，避免把 transport 当 `this`（Cloudflare Workers 会 `Illegal invocation`）。[E: packages/mcp/src/transports/streamable-http.ts:206] 有 session 时加 `Mcp-Session-Id`；`setProtocolVersion` 后加 `MCP-Protocol-Version`；`AuthProvider.token()` 非空则 `Authorization: Bearer`。[E: packages/mcp/src/transports/streamable-http.ts:306] [E: packages/mcp/src/transports/streamable-http.ts:307] [E: packages/mcp/src/transports/streamable-http.ts:309] 从响应头 `mcp-session-id` 捕获 session。[E: packages/mcp/src/transports/streamable-http.ts:314] 发出 `notifications/initialized` 后开 GET SSE；`openGetStream === false` 才跳过，故缺省为打开。[E: packages/mcp/src/transports/streamable-http.ts:236] [E: packages/mcp/src/transports/streamable-http.ts:402] JSON 体若是 array 则逐项 `parseJsonRpcMessage`（这是收包拆条，client **没有**发送 JSON-RPC batch 的 API）。[E: packages/mcp/src/transports/streamable-http.ts:245] [I] SSE 响应走 `consumeResponseStream`；有 event id 且响应未到时可 GET + `last-event-id` 续传。[E: packages/mcp/src/transports/streamable-http.ts:249] [E: packages/mcp/src/transports/streamable-http.ts:440] 重连默认 initial 1000 ms、max 30_000 ms、maxRetries 5。[E: packages/mcp/src/transports/streamable-http.ts:16] [E: packages/mcp/src/transports/streamable-http.ts:17] [E: packages/mcp/src/transports/streamable-http.ts:18] `close` 在有 session 时 DELETE，1s abort。[E: packages/mcp/src/transports/streamable-http.ts:265] 401 → `McpAuthRequiredError`；带 session 的 404 → `McpSessionExpiredError`。[E: packages/mcp/src/transports/streamable-http.ts:321] [E: packages/mcp/src/transports/streamable-http.ts:322] `needsAuthorization` 把 401 以及 `www-authenticate` 含 `insufficient_scope` 的 403 交给 `authProvider.onUnauthorized`，只重试一次。[E: packages/mcp/src/transports/streamable-http.ts:161] [E: packages/mcp/src/transports/streamable-http.ts:294] HTTP 测试会断言 `mcp-session-id` / `mcp-protocol-version`、GET 与 DELETE。[E: packages/mcp/test/streamable-http.test.ts:137] [E: packages/mcp/test/streamable-http.test.ts:139] [E: packages/mcp/test/streamable-http.test.ts:140]

**in-memory**：`InMemoryTransport` 成对 `connectPeer`，`structuredClone` 后 `queueMicrotask` 投递。[E: packages/mcp/src/transports/in-memory.ts:23] [E: packages/mcp/src/transports/in-memory.ts:24] `createInMemoryTransportPair()` 从 `@earendil-works/pi-mcp/testing` 导出。[E: packages/mcp/src/testing/index.ts:1] [E: packages/mcp/package.json:19] 根 barrel 列出 `StdioTransport` 与 `StreamableHttpTransport`，没有 `InMemoryTransport`。[E: packages/mcp/src/index.ts:58] [E: packages/mcp/src/index.ts:63] [I]

### OAuth

`AuthProvider`：`token()` + 可选 `onUnauthorized(UnauthorizedContext)`。[E: packages/mcp/src/auth-provider.ts:14] `@earendil-works/pi-mcp/oauth` 提供 MCP OAuth 子集。

- Discovery：`parseWwwAuthenticate` 读 Bearer/DPoP 的 `resource_metadata` / `scope` / `error`；`discoverProtectedResourceMetadata` 试 `/.well-known/oauth-protected-resource`（先带 path 再 origin）；`discoverAuthorizationServerMetadata` 按 oauth 与 oidc well-known 列表取，默认校验 `issuer`。[E: packages/mcp/src/oauth/discovery.ts:39] [E: packages/mcp/src/oauth/discovery.ts:74] [E: packages/mcp/src/oauth/discovery.ts:95] [E: packages/mcp/src/oauth/discovery.ts:119] `discoverOAuthServerInfo` 可注入 `authorizationServerMetadataUrl`：直接 fetch/parse 该文档并返回，不走 `discoverAuthorizationServerMetadata` 的 issuer 比较。[E: packages/mcp/src/oauth/discovery.ts:145] [E: packages/mcp/src/oauth/discovery.ts:152] [E: packages/mcp/src/oauth/discovery.ts:153] `selectResource` 要求 protected resource 与 MCP server 同源且 path 前缀匹配。[E: packages/mcp/src/oauth/discovery.ts:176]
- 端点安全：非 loopback 必须 `https:`，否则 `OAuthInsecureEndpointError`。[E: packages/mcp/src/oauth/flow.ts:108]
- `startAuthorization`：PKCE S256（WebCrypto），`response_type=code`。[E: packages/mcp/src/oauth/flow.ts:174] [E: packages/mcp/src/oauth/flow.ts:177] `registerClient` 动态注册；`exchangeAuthorizationCode` / `refreshAuthorization` 走 token endpoint。[E: packages/mcp/src/oauth/flow.ts:225] [E: packages/mcp/src/oauth/flow.ts:249] [E: packages/mcp/src/oauth/flow.ts:265]
- `OAuthClientProvider.clientMetadataDocument(metadata)`：返回 CIMD 的 `url` + `redirectUrl`，或 `undefined` 以走 DCR。[E: packages/mcp/src/oauth/flow.ts:55] CIMD 路径把 `client_id` 设成 document URL，不调用 `saveClientInformation`。[E: packages/mcp/src/oauth/flow.ts:330] CIMD URL 必须 `https:` 且 pathname 不是 `"/"`。[E: packages/mcp/src/oauth/flow.ts:328]
- `authorizeMcp`：有 `authorizationCode` 则换 token。RFC 9207：存在 `metadata` 且（调用方带了 `iss` 或 metadata 设了 `authorization_response_iss_parameter_supported`）时，`iss` 必须等于 `metadata.issuer`。[E: packages/mcp/src/oauth/flow.ts:351] [E: packages/mcp/src/oauth/flow.ts:354] [E: packages/mcp/src/oauth/flow.ts:355] 否则尝试 refresh；再否则 `redirectToAuthorization` 并返回 `"REDIRECT"`。[E: packages/mcp/src/oauth/flow.ts:369] [E: packages/mcp/src/oauth/flow.ts:394] `invalid_client` / `unauthorized_client` 清全部凭证重跑；`invalid_grant` 只清 tokens。[E: packages/mcp/src/oauth/flow.ts:401] [E: packages/mcp/src/oauth/flow.ts:405]
- `stepUpScope(granted, challenged)`：把已授权 scope 与 challenge 缺的 scope 去重拼接；`challenged` 空则返回 `undefined`。[E: packages/mcp/src/oauth/flow.ts:286] [E: packages/mcp/src/oauth/flow.ts:287] [E: packages/mcp/src/oauth/flow.ts:289]
- `adaptOAuthProvider`：`token` 读 `access_token`；401 时 concurrent 调用共享一个 `inFlight` refresh；若 context 里的 token 已被别的请求换成新 token 则直接 retry；`insufficient_scope` 设 `skipRefresh: true` 并 `stepUpScope`；flow 返回 `"REDIRECT"` 时 throw `McpOAuthAuthorizationRequiredError`。[E: packages/mcp/src/oauth/flow.ts:422] [E: packages/mcp/src/oauth/flow.ts:430] [E: packages/mcp/src/oauth/flow.ts:437] [E: packages/mcp/src/oauth/flow.ts:441] [E: packages/mcp/src/oauth/errors.ts:50]
- `McpOAuthProvider` 默认 `MemoryOAuthStateStore`；`own()` 按**精确** `serverUrl` 隔离，别的 server 的 state 当空。[E: packages/mcp/src/oauth/provider.ts:80] [E: packages/mcp/src/oauth/provider.ts:166] 包不打开浏览器、不决定凭证落盘位置；调用方注入 `McpOAuthStateStore` 与 `onRedirect`。[E: packages/mcp/README.md:110]
- `OAuthCallbackServer.listen()` 默认绑 `127.0.0.1` 随机端口、path `/callback`、超时 5 分钟；`waitForCallback(state, path?)` 可拒绝其它 path 上的 redirect。[E: packages/mcp/src/oauth/callback.ts:65] [E: packages/mcp/src/oauth/callback.ts:67] [E: packages/mcp/src/oauth/callback.ts:83] [E: packages/mcp/src/oauth/callback.ts:138]

OAuth 集成测试：第一次 connect 因需交互 throw `McpOAuthAuthorizationRequiredError`，`authorizeMcp` 换码后再 connect 能 `listTools`，随后 stale access token 只 refresh 一次。[E: packages/mcp/test/oauth.test.ts:230] [E: packages/mcp/test/oauth.test.ts:255] [E: packages/mcp/test/oauth.test.ts:275]

## 设计动机与权衡

独立包、零 pi 依赖，让非 coding-agent 应用也能直接 `McpClient` + transport；`toLlmContent` 只约定 text/image 形状，避免 `pi-mcp` → `pi-ai` 边。[E: packages/mcp/README.md:3] [E: packages/mcp/README.md:32]

OAuth 从官方 SDK 改编但去掉 Zod/SDK 依赖，PKCE 走 WebCrypto。[E: packages/mcp/README.md:112] [E: packages/mcp/src/oauth/flow.ts:150] HTTP `fetch` 无 receiver，是为了 Workers 平台 fetch。[E: packages/mcp/src/transports/streamable-http.ts:206]

stdio 在非 Windows 上 `process.kill(-pid, signal)` 杀整个 process group；Windows 用 `taskkill /T /F`。[E: packages/mcp/src/transports/stdio.ts:32] [E: packages/mcp/src/transports/stdio.ts:23]

分页把 `null` / `""` cursor 当结束，是为了不兼容 server；`content` 缺省 `[]` 是为了只返回 `structuredContent` 的 server。[E: packages/mcp/src/client.ts:104] [E: packages/mcp/src/client.ts:150]

## gotcha

- `McpClient` 只能从 `idle` `connect` 一次。失败路径会 `close()`，之后必须 `new McpClient`。[E: packages/mcp/src/client.ts:203] [E: packages/mcp/src/client.ts:245]
- `CallToolResult.isError === true` 仍是成功的 JSON-RPC result；模型侧要自己看这个字段（README 的 AgentTool 包装把 `isError: result.isError === true`）。[E: packages/mcp/src/protocol/content.ts:68] [E: packages/mcp/README.md:51]
- `McpAbortError.name === "AbortError"`，用 `error.name === "McpAbortError"` 会漏。[E: packages/mcp/src/protocol/jsonrpc.ts:77]
- `InMemoryTransport` / `createInMemoryTransportPair` 只从 `@earendil-works/pi-mcp/testing` 进，不要从根包 import。[E: packages/mcp/package.json:19] [E: packages/mcp/src/testing/index.ts:1]
- client `send` 始终是单条 `JsonRpcMessage`；HTTP JSON array 只在收包时拆开。不要把这写成完整 JSON-RPC batch 支持。[E: packages/mcp/src/client.ts:408] [E: packages/mcp/src/transports/streamable-http.ts:245] [E: packages/mcp/README.md:132]
- `listAll` 上限 1000 页；循环 cursor 会 throw duplicate cursor。[E: packages/mcp/src/client.ts:373] [E: packages/mcp/src/client.ts:369]
- OAuth 默认内存 store；进程退出即丢 token。跨 server URL 不会串凭证。[E: packages/mcp/src/oauth/provider.ts:80] [E: packages/mcp/src/oauth/provider.ts:166]
- 未安装上游 `node_modules`，本页未跑 `packages/mcp` 的 vitest。[U]

## 跨包边界

- **本包不依赖** `pi-ai` / `pi-agent-core` / `pi-coding-agent` / `chord` / `pi-durable`。runtime 只有 `cross-spawn`。[E: packages/mcp/package.json:54]
- coding-agent 是消费者：`dependencies` 含 `"@earendil-works/pi-mcp": "^1.0.1"`，`extensions/mcp/runtime.ts` 从根包与 `./oauth` import，`connectOnce` 里 `new McpClient({ name: "pi", version: VERSION, … })`。[E: packages/coding-agent/package.json:54] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:29] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:373] 产品配置、slash、exposure、reconnect 策略见 [subsys.coding-agent.mcp](../coding-agent/mcp.md)；用户可见 `/mcp` 与 `.pi/mcp.json` 见 [surface.mcp.overview](../../surface/mcp/overview.md)。mcp 扩展经 [surface.extensions.api](../../surface/extensions/api.md) 的 `registerTool` / `registerCommand` 接到会话。
- 分层位置：build 链在 telemetry 之后插入 `codemode` 与 `mcp`，与其它 pi 包无编译期边。见 [spine.layered-architecture](../../spine/layered-architecture.md) 与 [ref.package-index](../../reference/package-index.md)。

## Sources

- packages/mcp/package.json
- packages/mcp/README.md
- packages/mcp/src/index.ts
- packages/mcp/src/client.ts
- packages/mcp/src/auth-provider.ts
- packages/mcp/src/protocol/jsonrpc.ts
- packages/mcp/src/protocol/types.ts
- packages/mcp/src/protocol/content.ts
- packages/mcp/src/transports/transport.ts
- packages/mcp/src/transports/stdio.ts
- packages/mcp/src/transports/streamable-http.ts
- packages/mcp/src/transports/in-memory.ts
- packages/mcp/src/oauth/index.ts
- packages/mcp/src/oauth/flow.ts
- packages/mcp/src/oauth/discovery.ts
- packages/mcp/src/oauth/provider.ts
- packages/mcp/src/oauth/errors.ts
- packages/mcp/src/oauth/callback.ts
- packages/mcp/src/oauth/types.ts
- packages/mcp/src/testing/index.ts
- packages/mcp/test/client.test.ts
- packages/mcp/test/content.test.ts
- packages/mcp/test/stdio.test.ts
- packages/mcp/test/streamable-http.test.ts
- packages/mcp/test/oauth.test.ts
- packages/coding-agent/package.json
- packages/coding-agent/src/extensions/mcp/runtime.ts

## 相关

- [spine.layered-architecture](../../spine/layered-architecture.md) - 13 包分层；`mcp` 与 `codemode` 插在 telemetry 之后，不依赖其它 pi 包。
- [ref.package-index](../../reference/package-index.md) - workspace / exports / `@earendil-works/pi-mcp`。
- [surface.mcp.overview](../../surface/mcp/overview.md) - 用户可见 `/mcp`、`pi mcp`、`.pi/mcp.json`、exposure。
- [subsys.coding-agent.mcp](../coding-agent/mcp.md) - 内置 replaceable `mcp` 扩展与 `McpServerConnection`。
- [surface.extensions.api](../../surface/extensions/api.md) - mcp 扩展用来 `registerTool` / `registerCommand` 的 `ExtensionAPI`。
