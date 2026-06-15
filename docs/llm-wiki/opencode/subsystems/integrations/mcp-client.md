---
id: integrations.mcp-client
title: MCP client integration
kind: subsystem
tier: T2
v: v1
status: verified
updated: 92c70c9c3
source:
  - packages/opencode/src/mcp/index.ts
  - packages/opencode/src/mcp/catalog.ts
  - packages/opencode/src/mcp/oauth-provider.ts
  - packages/opencode/src/mcp/auth.ts
  - packages/opencode/src/mcp/oauth-callback.ts
  - packages/opencode/src/session/tools.ts
  - packages/opencode/src/session/prompt.ts
  - packages/opencode/src/server/routes/instance/httpapi/groups/mcp.ts
  - packages/opencode/src/server/routes/instance/httpapi/handlers/mcp.ts
  - packages/core/src/v1/config/mcp.ts
symbols:
  - MCP.Service
  - MCP.Status
  - MCP.Resource
  - McpCatalog.convertTool
  - McpOAuthProvider.createMcpOAuthProvider
  - McpAuth.Service
  - MCPOAuthCallback.waitForCallback
related:
  - subsys.tools.v1
  - config.v1-providers-mcp-lsp
evidence: explicit
---

> MCP client 是 V1 当前活跑的外部工具、prompt、resource 接入层；它管理 local stdio、remote StreamableHTTP/SSE、OAuth token、工具名归一化、以及把 MCP 工具注入 `SessionTools`。

## 能回答的问题

- V1 opencode 如何连接 local MCP server、remote MCP server，以及 remote OAuth server。
- MCP 工具如何变成 AI SDK tool，工具 key 为什么不是原始 MCP tool name。
- OAuth callback 为什么默认监听 `19876`，动态 client registration、PKCE verifier、state 存在哪里。
- MCP timeout 为什么源码常量是 30 秒，但 V1 config schema 文档字符串仍写 5 秒。
- V1 MCP HTTP 管理接口是不是 Hono。

## 职责

`packages/opencode/src/mcp/index.ts` 定义 `MCP.Service`，接口暴露 status、tools、prompts、resources、prompt/resource lookup、OAuth auth/removeAuth、动态 add/remove 等方法。[E: packages/opencode/src/mcp/index.ts:136] service state 从 `cfg.mcp ?? {}` 初始化并连接 server；tool-list-change notification 会重新拉取 defs 并发布 `mcp.tools.changed`。[E: packages/opencode/src/mcp/index.ts:438] [E: packages/opencode/src/mcp/index.ts:446] [E: packages/opencode/src/mcp/index.ts:407] [E: packages/opencode/src/mcp/index.ts:412] 服务状态枚举区分 `connected`、`disabled`、`failed`、`needs_auth`、`needs_client_registration`，因此调用方可以把连接失败、显式禁用、OAuth 待处理分开呈现。[E: packages/opencode/src/mcp/index.ts:72]

`packages/opencode/src/mcp/catalog.ts` 是 MCP catalog adapter：`defs` 读取 tools，`prompts/resources` 读取对应 capability，`fetch` 会把 server name 和 item name sanitize/qualify。[E: packages/opencode/src/mcp/catalog.ts:38] [E: packages/opencode/src/mcp/catalog.ts:97] [E: packages/opencode/src/mcp/catalog.ts:105] [E: packages/opencode/src/mcp/catalog.ts:85] `packages/opencode/src/mcp/oauth-provider.ts` 是 MCP SDK `OAuthClientProvider` 的本地实现，负责 redirect URI、client metadata、动态注册信息、token、PKCE code verifier、CSRF state。[E: packages/opencode/src/mcp/oauth-provider.ts:35] [E: packages/opencode/src/mcp/oauth-provider.ts:43] [E: packages/opencode/src/mcp/oauth-provider.ts:82] [E: packages/opencode/src/mcp/oauth-provider.ts:113] [E: packages/opencode/src/mcp/oauth-provider.ts:132] [E: packages/opencode/src/mcp/oauth-provider.ts:144]

MCP 管理 API 是 Effect `HttpApi`，不是 Hono：route group 文件直接 `import { HttpApi }` 并用 `HttpApi.make("mcp")` 构造 group。[E: packages/opencode/src/server/routes/instance/httpapi/groups/mcp.ts:4] [E: packages/opencode/src/server/routes/instance/httpapi/groups/mcp.ts:41]

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/opencode/src/mcp/index.ts` | V1 MCP service、transport lifecycle、status、auth flow、HTTP handler 后端依赖。 |
| `packages/opencode/src/mcp/catalog.ts` | MCP tool/prompt/resource listing 和 AI SDK dynamic tool conversion。 |
| `packages/opencode/src/mcp/oauth-provider.ts` | MCP SDK OAuth provider，本地 token/client info/state/verifier 接口。 |
| `packages/opencode/src/mcp/auth.ts` | `mcp-auth.json` 读写、文件锁、token expiry 判断。 |
| `packages/opencode/src/mcp/oauth-callback.ts` | 本地 OAuth callback server 和 pending auth map。 |
| `packages/opencode/src/session/tools.ts` | 把 MCP tools 合并进 session 可用工具集合，并把 MCP content 转成 opencode output/attachment。 |
| `packages/opencode/src/session/prompt.ts` | 把 MCP resource reference materialize 成 prompt file part。 |
| `packages/core/src/v1/config/mcp.ts` | V1 MCP config schema；schema 注释里的 timeout 默认值已经和实现不一致。 |

## 数据模型

`MCP.Status` 是以 `status` 为 discriminator 的 union：`connected`、`disabled`、`failed`、`needs_auth`、`needs_client_registration`；只有 `failed` 与 `needs_client_registration` 在 schema 上带 `error` 字段。[E: packages/opencode/src/mcp/index.ts:72] [E: packages/opencode/src/mcp/index.ts:78] [E: packages/opencode/src/mcp/index.ts:84] [E: packages/opencode/src/mcp/index.ts:95]

`MCP.Resource` 包含 `client`、`name`、`uri`、`mimeType`、`description`，用于把 MCP resource 暴露给 prompt materialization 和 API 层。[E: packages/opencode/src/mcp/index.ts:38] [E: packages/opencode/src/mcp/index.ts:43]

本地 auth 存储在 `Global.Path.data/mcp-auth.json`，flock key 是 `mcp-auth:${filepath}`。[E: packages/opencode/src/mcp/auth.ts:37] [E: packages/opencode/src/mcp/auth.ts:38] 每个 auth entry 可以存 `tokens`、`clientInfo`、`codeVerifier`、`oauthState`、`serverUrl`。[E: packages/opencode/src/mcp/auth.ts:25] 写入 JSON 文件时 mode 是 `0o600`，这是凭据文件的最小权限约束。[E: packages/opencode/src/mcp/auth.ts:81]

V1 config schema 中 local MCP server 有 `type: "local"`、`command`、`environment`、`enabled`、`timeout` 字段。[E: packages/core/src/v1/config/mcp.ts:6] remote MCP server 有 `type: "remote"`、`url`、`enabled`、`headers`、`oauth`、`timeout` 字段。[E: packages/core/src/v1/config/mcp.ts:41]

## 控制流

### 启动与连接

1. `MCP.Service` 启动时读取 `cfg.mcp ?? {}` 并遍历静态配置项，初始化 `status`、`clients`、`defs`；state 里的 `config` 初始为空，后续动态 `add()` 路径会写入 `s.config[name]`，静态配置通过 `cfg` fallback 读取。[E: packages/opencode/src/mcp/index.ts:436] [E: packages/opencode/src/mcp/index.ts:439] [E: packages/opencode/src/mcp/index.ts:446] [E: packages/opencode/src/mcp/index.ts:462] [E: packages/opencode/src/mcp/index.ts:561] [E: packages/opencode/src/mcp/index.ts:580]
2. disabled server 直接进入 `disabled` 状态，不创建 transport。[E: packages/opencode/src/mcp/index.ts:455]
3. local server 把 config 中的 `command` 数组解构成 `cmd` 和 `args`，再创建 `StdioClientTransport`。[E: packages/opencode/src/mcp/index.ts:306] [E: packages/opencode/src/mcp/index.ts:308]
4. local stdio transport 会继承并扩展环境变量；当命令本体是 `opencode` 时，额外设置 `BUN_BE_BUN=1`。[E: packages/opencode/src/mcp/index.ts:315]
5. remote server 先 parse URL，再构造 `StreamableHTTPClientTransport` 和 `SSEClientTransport` 两个候选 transport，尝试顺序是 StreamableHTTP 再 SSE。[E: packages/opencode/src/mcp/index.ts:204] [E: packages/opencode/src/mcp/index.ts:231] [E: packages/opencode/src/mcp/index.ts:240]
6. 所有 transport 都通过 `connectTransport` 创建 MCP SDK `Client`，client name 是 `opencode`，version 来自 `Installation.VERSION`，并用 `withTimeout(client.connect(...), timeout)` 包住连接。[E: packages/opencode/src/mcp/index.ts:182] [E: packages/opencode/src/mcp/index.ts:188]
7. server 连接成功后，如果 server capability 包含 tools，service 只拉取 `McpCatalog.defs` 作为 cached tool defs；prompts/resources 由 `MCP.prompts()` 和 `MCP.resources()` 后续按 connected clients 懒收集。[E: packages/opencode/src/mcp/index.ts:351] [E: packages/opencode/src/mcp/index.ts:462] [E: packages/opencode/src/mcp/index.ts:630] [E: packages/opencode/src/mcp/index.ts:634]
8. finalizer 关闭所有 MCP clients；如果 transport 是 stdio，还会杀掉 stdio 进程的 descendant processes。[E: packages/opencode/src/mcp/index.ts:471] [E: packages/opencode/src/mcp/index.ts:477] [E: packages/opencode/src/mcp/index.ts:486]

### Tool listing 与执行

1. `McpCatalog.defs` 先调用 `client.listTools`，如果标准 SDK schema 因 `outputSchema` 不兼容而失败，会退回 tolerant request schema。[E: packages/opencode/src/mcp/catalog.ts:38] [E: packages/opencode/src/mcp/catalog.ts:120] [E: packages/opencode/src/mcp/catalog.ts:123]
2. `McpCatalog.convertTool` 复制 MCP `inputSchema`，覆盖 `type: "object"`、`properties` 和 `additionalProperties: false`，然后交给 `ai.dynamicTool`。[E: packages/opencode/src/mcp/catalog.ts:42] [E: packages/opencode/src/mcp/catalog.ts:45] [E: packages/opencode/src/mcp/catalog.ts:47] [E: packages/opencode/src/mcp/catalog.ts:50]
3. dynamic tool 执行时调用 `client.callTool`，开启 `resetTimeoutOnProgress: true`，并传入 abort signal 和 timeout。[E: packages/opencode/src/mcp/catalog.ts:54] [E: packages/opencode/src/mcp/catalog.ts:61]
4. catalog `fetch` helper 对 prompts/resources 这类 named items 使用 `${sanitize(client)}:${sanitize(item.name)}` key，并在返回对象上保留原始 `client` 字段。[E: packages/opencode/src/mcp/catalog.ts:86] [E: packages/opencode/src/mcp/catalog.ts:88]
5. `MCP.Service.tools()` 注入到 session 时使用 `${sanitize(clientName)}_${sanitize(toolName)}` 作为最终 MCP tool key。[E: packages/opencode/src/mcp/index.ts:602]
6. `sanitize` 只保留 `a-zA-Z0-9_-`，其它字符都替换成 `_`。[E: packages/opencode/src/mcp/catalog.ts:95]
7. `SessionTools` 先载入 registry built-in tools，再合并 `mcp.tools()` 返回的 MCP tools。[E: packages/opencode/src/session/tools.ts:117]
8. MCP tool 的 permission key 是最终 tool key，permission pattern 固定是 `*`。[E: packages/opencode/src/session/tools.ts:134]
9. MCP result content 中 text 进入 output，`image` 与带 `blob` 的 `resource` 转成 file attachments；text output 的截断结果写入 metadata 的 `truncated` 和可选 `outputPath`。[E: packages/opencode/src/session/tools.ts:155] [E: packages/opencode/src/session/tools.ts:156] [E: packages/opencode/src/session/tools.ts:162] [E: packages/opencode/src/session/tools.ts:176] [E: packages/opencode/src/session/tools.ts:179]

### OAuth

1. OAuth 默认 callback port 是 `19876`，默认 path 是 `/mcp/oauth/callback`。[E: packages/opencode/src/mcp/oauth-provider.ts:11] [E: packages/opencode/src/mcp/oauth-provider.ts:12]
2. provider 的 redirect URL 优先使用 config 中的 `redirectUri`，否则根据 callback port/path 生成本地 URL。[E: packages/opencode/src/mcp/oauth-provider.ts:35]
3. OAuth client metadata 声明 redirect URIs、client name、grant types、response type、token endpoint auth method 和 scope。[E: packages/opencode/src/mcp/oauth-provider.ts:43]
4. 如果配置里有 static `clientId`，provider 直接返回 static client info；否则会读取本地保存的 dynamic client info；过期 client info 会被忽略，让 MCP SDK 重新注册。[E: packages/opencode/src/mcp/oauth-provider.ts:55] [E: packages/opencode/src/mcp/oauth-provider.ts:66] [E: packages/opencode/src/mcp/oauth-provider.ts:69]
5. `startAuth` 只对 remote MCP server 有效；local server 或显式 `oauth: false` 的 remote server 会报错；未提供 object OAuth config 时，`oauthConfig` 为 undefined 且流程继续构造 auth provider。[E: packages/opencode/src/mcp/index.ts:704] [E: packages/opencode/src/mcp/index.ts:706] [E: packages/opencode/src/mcp/index.ts:707] [E: packages/opencode/src/mcp/index.ts:712] [E: packages/opencode/src/mcp/index.ts:727]
6. `startAuth` 启动 callback server、生成 state，并仅用 `StreamableHTTPClientTransport` 发起 auth discovery。[E: packages/opencode/src/mcp/index.ts:720] [E: packages/opencode/src/mcp/index.ts:722] [E: packages/opencode/src/mcp/index.ts:744]
7. 如果 unauthorized error 携带 captured authorization URL，service 保存 pending transport 并返回 auth URL 给调用端。[E: packages/opencode/src/mcp/index.ts:758]
8. `authenticate` 在无 auth URL 时会直接尝试保存 client；有 auth URL 时会打开浏览器、等待 callback、校验 state、再进入 `finishAuth`。[E: packages/opencode/src/mcp/index.ts:768] [E: packages/opencode/src/mcp/index.ts:791] [E: packages/opencode/src/mcp/index.ts:816]
9. `finishAuth` 从 pending transport 取回 transport，调用 MCP SDK `finishAuth(code)`，随后清理 verifier 和 pending transport，再重建 server client。[E: packages/opencode/src/mcp/index.ts:827] [E: packages/opencode/src/mcp/index.ts:831] [E: packages/opencode/src/mcp/index.ts:841]

## 设计动机与权衡

V1 MCP client 明确偏向“尽量接上”：remote 传输同时支持 StreamableHTTP 和 SSE fallback，这是为了兼容不同 MCP server 的传输实现。[E: packages/opencode/src/mcp/index.ts:231] [I] OAuth client 信息支持 dynamic registration，本地 auth 读写也通过 `flock.withLock(lockKey)` 包裹，这让用户能长期复用 MCP server 登录状态。[E: packages/opencode/src/mcp/oauth-provider.ts:82] [E: packages/opencode/src/mcp/auth.ts:74] [E: packages/opencode/src/mcp/auth.ts:82] [I]

工具 catalog 使用 tolerant schema 是兼容性取舍：一些 MCP server 返回的 `outputSchema` 不满足 SDK validator，opencode 会先走标准 SDK，失败后用更宽松 schema 再列 tools。[E: packages/opencode/src/mcp/catalog.ts:120] [E: packages/opencode/src/mcp/catalog.ts:123] 这让工具可见性优先于严格 schema 校验[I]，但执行阶段仍通过 MCP SDK `callTool`。[E: packages/opencode/src/mcp/catalog.ts:54]

MCP 工具名同时携带 client name 和 tool name，是为了避免多个 server 暴露同名工具时发生冲突。[I] prompts/resources catalog 用冒号，最终 session tool key 用下划线，说明“内部资源标识”和“模型可见工具名”是两个命名层。[E: packages/opencode/src/mcp/catalog.ts:88] [E: packages/opencode/src/mcp/index.ts:602]

## 易踩坑

- timeout 实现默认值是 `30_000` 毫秒。[E: packages/opencode/src/mcp/index.ts:36] V1 config schema 对 local/remote timeout 的描述仍写 default `5000`。[E: packages/core/src/v1/config/mcp.ts:18] [E: packages/core/src/v1/config/mcp.ts:54] 以当前源码运行行为为准，schema 文案是陈旧说明。[I]
- remote 连接顺序是 StreamableHTTP 然后 SSE fallback，不是只支持 SSE。[E: packages/opencode/src/mcp/index.ts:231] [E: packages/opencode/src/mcp/index.ts:240]
- `packages/opencode/src/mcp/index.ts` 的 HTTP 管理接口通过 Effect HttpApi route group 暴露，不是 Hono。[E: packages/opencode/src/server/routes/instance/httpapi/groups/mcp.ts:4]
- MCP server notification `ToolListChanged` 会触发重新 fetch defs 并发布 `mcp.tools.changed`，所以工具集合可能在 session 运行期间变化。[E: packages/opencode/src/mcp/index.ts:398] [E: packages/opencode/src/mcp/index.ts:407] [E: packages/opencode/src/mcp/index.ts:412]
- prompt resource materialization 在 `session/prompt.ts`，它把 `source.type === "resource"` 的 file part 通过 `mcp.readResource(clientName, uri)` 读成 prompt text/binary notes；这不是 MCP tool execution 路径。[E: packages/opencode/src/session/prompt.ts:716] [E: packages/opencode/src/session/prompt.ts:728] [I]

## Sources

- packages/opencode/src/mcp/index.ts
- packages/opencode/src/mcp/catalog.ts
- packages/opencode/src/mcp/oauth-provider.ts
- packages/opencode/src/mcp/auth.ts
- packages/opencode/src/mcp/oauth-callback.ts
- packages/opencode/src/session/tools.ts
- packages/opencode/src/session/prompt.ts
- packages/opencode/src/server/routes/instance/httpapi/groups/mcp.ts
- packages/opencode/src/server/routes/instance/httpapi/handlers/mcp.ts
- packages/core/src/v1/config/mcp.ts

## 相关

- subsys.tools.v1
- config.v1-providers-mcp-lsp
