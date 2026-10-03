---
id: surface.mcp.overview
title: MCP 服务器与 /mcp
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/extensions/mcp/index.ts
  - packages/coding-agent/src/extensions/mcp/cli.ts
  - packages/coding-agent/src/extensions/mcp/cli.lazy.ts
  - packages/coding-agent/src/extensions/mcp/config.ts
  - packages/coding-agent/src/extensions/mcp/ui.ts
  - packages/coding-agent/src/extensions/mcp/oauth.ts
  - packages/coding-agent/src/extensions/mcp/runtime.ts
  - packages/coding-agent/src/extensions/mcp/tools.ts
  - packages/coding-agent/src/extensions/mcp/resources.ts
  - packages/coding-agent/src/extensions/mcp/log.ts
  - packages/coding-agent/src/core/mcp-servers.ts
  - packages/coding-agent/src/extensions/index.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/cli/args.ts
  - packages/coding-agent/src/config.ts
  - packages/coding-agent/src/core/slash-commands.ts
  - packages/coding-agent/src/core/resource-loader.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/trust-manager.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/docs/mcp.md
  - packages/coding-agent/test/mcp-extension.test.ts
  - packages/coding-agent/test/mcp-command.test.ts
symbols:
  - createMcpExtension
  - runMcpCommand
  - loadMcpConfig
  - validateMcpServerConfig
  - McpExposure
  - McpOAuthConfig
  - McpServerConfig
  - getMcpToolExposure
  - showMcpManager
  - signInMcpServer
  - McpOAuthCredentialStore
related:
  - subsys.coding-agent.mcp
  - subsys.mcp.client
  - surface.codemode.overview
  - surface.slash-commands.overview
  - ref.coding-agent.slash-commands
  - surface.extensions.api
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `surface.mcp.overview` 是 pi-coding-agent 的 MCP 用户面:内置 replaceable 扩展 `builtin:mcp` 注册 `/mcp` 管理器并在会话里连接服务器;`pi mcp` 在会话外读写 `mcp.json` 并做 OAuth;配置来自 `~/.pi/agent/mcp.json` 与受信任项目的 `.pi/mcp.json`。

## 能回答的问题

- `/mcp` 从哪里注册,为什么它不在 `BUILTIN_SLASH_COMMANDS`?
- `pi mcp` 有哪些子命令,和会话内 `/mcp` 差在哪里?
- user-level `~/.pi/agent/mcp.json` 与 project `.pi/mcp.json` 如何合并,什么条目只覆盖 `enabled` / `exposure` / `toolExposure`?
- `McpExposure` 的 `codemode`(默认)、`deferred`、`direct`、`hidden` 分别把工具交给谁,`codemode-deferred` 是什么?
- OAuth 如何用 `clientRegistration: "cimd"`、`clientName`、`authServerMetadataUrl`,以及 `auth.provider` bearer?
- 第三方扩展怎样用 `registerCommand("mcp")` 替换内置 MCP,怎样用 `pi.registerMcpServer()` 给当前会话加服务器?

## 1 Identity

Pi 把 MCP 做成 coding-agent 内置 replaceable 扩展 `mcp`:factory 是 `createMcpExtension()`,`replaceable: true` 且 `builtin: true`。[E: packages/coding-agent/src/extensions/index.ts:13] [E: packages/coding-agent/src/extensions/mcp/index.ts:276] 它连接 `mcp.json` 与 `pi.registerMcpServer()` 登记的服务器,把工具注册为 `mcp__<server>__<tool>`,默认 `exposure` 为 `codemode`。[E: packages/coding-agent/src/extensions/mcp/index.ts:1141] [E: packages/coding-agent/src/extensions/mcp/tools.ts:93] [E: packages/coding-agent/src/core/mcp-servers.ts:17]

会话外入口是 CLI 子命令 `pi mcp`。`main.ts` 在 package/config 短路之后、`parseArgs()` 之前匹配 `args[0] === "mcp"`,懒加载 `runMcpCommand()` 后退出,因此这条路径不启动 agent session、不加载扩展。[E: packages/coding-agent/src/main.ts:614] [E: packages/coding-agent/src/main.ts:615] [E: packages/coding-agent/src/main.ts:616] [E: packages/coding-agent/src/extensions/mcp/cli.lazy.ts:2] `printHelp()` 把 `pi mcp <command>` 列成与 `install` / `auth` 同级的 Commands。[E: packages/coding-agent/src/cli/args.ts:288]

产品文档在 `packages/coding-agent/docs/mcp.md`。本节点的 load-bearing 行为以源码为准。

## 2 入口:`/mcp` 与 `pi mcp`

### `/mcp` 不是内置 slash 命令

`BUILTIN_SLASH_COMMANDS` 从 `settings` 到 `quit` 共 24 项,没有 `mcp`。[E: packages/coding-agent/src/core/slash-commands.ts:19] [E: packages/coding-agent/src/core/slash-commands.ts:20] [E: packages/coding-agent/src/core/slash-commands.ts:43] `/mcp` 由 MCP 扩展 `pi.registerCommand("mcp", …)` 贡献,description 为 manage MCP servers: sign in、reconnect、enable/disable、change exposure。[E: packages/coding-agent/src/extensions/mcp/index.ts:1141] [E: packages/coding-agent/src/extensions/mcp/index.ts:1142]

无参数时:TUI 调用 `showMcpManager()` 打开 `McpManagerView`;其它 mode 用 `formatStatus()` 打印状态。[E: packages/coding-agent/src/extensions/mcp/index.ts:1167] [E: packages/coding-agent/src/extensions/mcp/index.ts:1168] [E: packages/coding-agent/src/extensions/mcp/index.ts:1169] [E: packages/coding-agent/src/extensions/mcp/ui.ts:237] Usage 字符串允许 `/mcp`、`/mcp login [server]`、`/mcp logout [server]`、`/mcp reconnect [server]`。[E: packages/coding-agent/src/extensions/mcp/index.ts:274] 补全提供 `login` / `logout` / `reconnect` 与匹配的服务器名。[E: packages/coding-agent/src/extensions/mcp/index.ts:1147] [E: packages/coding-agent/src/extensions/mcp/index.ts:1151]

TUI 服务器列表按 attention 排序(needs-auth、failed、disconnected 靠前),每项显示 state、exposure、scope;可进入单服务器菜单做 Sign in、Tools、Reconnect、Sign out、Exposure、Enable/Disable。[E: packages/coding-agent/src/extensions/mcp/index.ts:252] [E: packages/coding-agent/src/extensions/mcp/index.ts:711] [E: packages/coding-agent/src/extensions/mcp/index.ts:754] [E: packages/coding-agent/src/extensions/mcp/index.ts:765] 受信任项目里,尚未带 project override 的 global 服务器额外出现 "Enable in this project" / "Disable in this project",写入 project `mcp.json`。[E: packages/coding-agent/src/extensions/mcp/index.ts:744] [E: packages/coding-agent/src/extensions/mcp/index.ts:749] [E: packages/coding-agent/src/extensions/mcp/index.ts:768] Exposure 选择器只列出 `codemode` / `deferred` / `direct`,不含 `hidden`。[E: packages/coding-agent/src/extensions/mcp/index.ts:113] [E: packages/coding-agent/src/extensions/mcp/index.ts:820]

`/mcp login` 在 `ctx.mode === "tui"` 时走 manager 的 redirect-URL 屏,否则要求 `hasUI` 并用 `ctx.ui.input` 粘贴回调 URL;非交互 mode 会报需要 interactive mode。[E: packages/coding-agent/src/extensions/mcp/index.ts:966] [E: packages/coding-agent/src/extensions/mcp/index.ts:971] [E: packages/coding-agent/src/extensions/mcp/index.ts:982]

`/reload` 会 `emit({ type: "session_start", reason: "reload" })`。MCP 扩展在 `session_start` 重新 `loadMcpConfig()`,因此会话外改过的 `mcp.json` 可经 `/reload` 再读。[E: packages/coding-agent/src/core/agent-session.ts:3646] [E: packages/coding-agent/src/extensions/mcp/index.ts:997] [E: packages/coding-agent/src/extensions/mcp/index.ts:998]

### `pi mcp` CLI

`runMcpCommand()` 实现 `add` / `remove` / `list` / `login` / `logout`(以及 `help` / `--help`)。没有 CLI `reconnect`;重连只在会话内 `/mcp reconnect`。[E: packages/coding-agent/src/extensions/mcp/cli.ts:185] [E: packages/coding-agent/src/extensions/mcp/cli.ts:189] [E: packages/coding-agent/src/extensions/mcp/cli.ts:195] [E: packages/coding-agent/src/extensions/mcp/cli.ts:208] [E: packages/coding-agent/src/extensions/mcp/cli.ts:218] [E: packages/coding-agent/src/extensions/mcp/cli.ts:256]

`add` / `remove` 的 `-l` / `--local` 写当前项目 `${CONFIG_DIR_NAME}/mcp.json`(默认 `.pi/mcp.json`),否则写 `agentDir/mcp.json`。[E: packages/coding-agent/src/extensions/mcp/cli.ts:52] [E: packages/coding-agent/src/extensions/mcp/cli.ts:372] [E: packages/coding-agent/src/extensions/mcp/cli.ts:373] `add` 用 `--url` 建 HTTP 服务器,或 `--` 后的 command/args 建 stdio;HTTP 专用 `--header`、`--bearer-token-env-var`、`--oauth-client-id`、`--oauth-client-secret`、`--oauth-callback-port`、`--oauth-client-name`;stdio 专用 `--env`、`--cwd`;共用 `--exposure`、`--description`。[E: packages/coding-agent/src/extensions/mcp/cli.ts:288] [E: packages/coding-agent/src/extensions/mcp/cli.ts:335] [E: packages/coding-agent/src/extensions/mcp/cli.ts:363] `--oauth-client-name` 写入 `oauth.clientName`。[E: packages/coding-agent/src/extensions/mcp/cli.ts:345] CLI 没有 `clientRegistration` / `authServerMetadataUrl` / `auth.provider` 开关,那些字段只能写进 JSON。[I]

`list` 连接每个 enabled 服务器并打印 state、tools、errors;任一条目无效或 enabled 服务器未 connected 则 exit 1。`--json` 输出 `{ servers, errors }`。[E: packages/coding-agent/src/extensions/mcp/cli.ts:478] [E: packages/coding-agent/src/extensions/mcp/cli.ts:488] 未写 `exposure` 时报告 `"codemode"`。[E: packages/coding-agent/src/extensions/mcp/cli.ts:450] `login` 默认超时 300 秒(`--timeout`)。[E: packages/coding-agent/src/extensions/mcp/cli.ts:77] [E: packages/coding-agent/src/extensions/mcp/cli.ts:245]

未信任项目若存在 `.pi/mcp.json`,`list`/`login` 会提示该文件被忽略。[E: packages/coding-agent/src/extensions/mcp/cli.ts:200] [E: packages/coding-agent/src/extensions/mcp/cli.ts:202] [E: packages/coding-agent/src/extensions/mcp/cli.ts:203] `add -l` 仍会写入 project 文件,但同时警告直到用户在项目里启动并 trust 才会生效。[E: packages/coding-agent/src/extensions/mcp/cli.ts:383] [E: packages/coding-agent/test/mcp-command.test.ts:169] [E: packages/coding-agent/test/mcp-command.test.ts:171]

## 3 配置文件与 project override

默认 agent 目录是 `join(homedir(), CONFIG_DIR_NAME, "agent")`。`APP_NAME` 默认 `"pi"`,`CONFIG_DIR_NAME` 默认 `".pi"`,因此 user-level 文件是 `~/.pi/agent/mcp.json`;可用 `PI_CODING_AGENT_DIR` 覆盖 agent 目录。[E: packages/coding-agent/src/config.ts:540] [E: packages/coding-agent/src/config.ts:542] [E: packages/coding-agent/src/config.ts:546] [E: packages/coding-agent/src/config.ts:566] [E: packages/coding-agent/src/config.ts:571] `loadMcpConfig()` 始终读 `join(agentDir, "mcp.json")`;仅当 `projectTrusted` 为真时再读 `join(cwd, CONFIG_DIR_NAME, "mcp.json")`。[E: packages/coding-agent/src/extensions/mcp/config.ts:147] [E: packages/coding-agent/src/extensions/mcp/config.ts:148] `.pi/mcp.json` 属于 `TRUST_REQUIRING_PROJECT_CONFIG_RESOURCES`。[E: packages/coding-agent/src/core/trust-manager.ts:30] [E: packages/coding-agent/src/core/trust-manager.ts:32]

两端都用 `mcpServers` 对象。同名 project 条目默认整份替换 global。[E: packages/coding-agent/src/extensions/mcp/config.ts:137] 若 project 条目没有 `command`、`url`、`type`,则视为 override:只允许 `enabled`、`exposure`、`toolExposure`,合并进已有 global 服务器并设置 `override` 为 project 路径。[E: packages/coding-agent/src/extensions/mcp/config.ts:74] [E: packages/coding-agent/src/extensions/mcp/config.ts:78] [E: packages/coding-agent/src/extensions/mcp/config.ts:108] [E: packages/coding-agent/src/extensions/mcp/config.ts:114] [E: packages/coding-agent/src/extensions/mcp/config.ts:118] 带多余键(例如 `args`)的 override 被拒绝并保留 global 原样;没有对应 global 的 override 报错。[E: packages/coding-agent/test/mcp-extension.test.ts:100] [E: packages/coding-agent/test/mcp-extension.test.ts:101] [E: packages/coding-agent/test/mcp-extension.test.ts:102] 合法 `{ enabled: false }` override 会保留 global 的 `command`/`env`。[E: packages/coding-agent/test/mcp-extension.test.ts:107] [E: packages/coding-agent/test/mcp-extension.test.ts:109]

`auth` 只能出现在 global `mcp.json`;project 文件里带 `auth` 的 HTTP 条目被跳过。[E: packages/coding-agent/src/extensions/mcp/config.ts:133] [E: packages/coding-agent/src/extensions/mcp/config.ts:134] [E: packages/coding-agent/test/mcp-extension.test.ts:262] 顶层 `autoEnableCodemode`(boolean,默认 true)控制 `codemode` exposure 的服务器连上后是否激活 `codemode` 工具;project 值覆盖 global。[E: packages/coding-agent/src/extensions/mcp/config.ts:105] [E: packages/coding-agent/src/extensions/mcp/index.ts:1001] [E: packages/coding-agent/src/extensions/mcp/index.ts:482]

`validateMcpServerConfig()` 要求名字 `^[A-Za-z0-9_-]+$`;`type: "sse"` 被拒绝;有 `url` 则为 streamable HTTP(`type` 可省略或为 `http` / `streamable-http`),有 `command` 则为 stdio。[E: packages/coding-agent/src/core/mcp-servers.ts:117] [E: packages/coding-agent/src/core/mcp-servers.ts:221] [E: packages/coding-agent/src/core/mcp-servers.ts:243] [E: packages/coding-agent/src/core/mcp-servers.ts:245] 仅差 `-`/`_` 的服务器名共享 `mcpNamespace()`(`mcp__` + 把 `-` 换成 `_`),后写入者报 conflict。[E: packages/coding-agent/src/core/mcp-servers.ts:120] [E: packages/coding-agent/src/extensions/mcp/config.ts:128] [E: packages/coding-agent/test/mcp-extension.test.ts:122] 无效条目记入 `errors` 并跳过,不阻止其它服务器。[E: packages/coding-agent/src/extensions/mcp/config.ts:123] `timeout` 为正秒数,默认 60。[E: packages/coding-agent/src/core/mcp-servers.ts:42] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:47] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:224]

扩展可用 `pi.registerMcpServer(name, config)` 给当前会话加服务器,形状与 `mcpServers` 条目相同;`mcp.json` 同名(含 namespace clash)优先,被覆盖的登记出现在 `/mcp` 的 overridden 列表。[E: packages/coding-agent/src/core/extensions/types.ts:1853] [E: packages/coding-agent/src/extensions/mcp/index.ts:330] [E: packages/coding-agent/src/extensions/mcp/index.ts:332] 扩展服务器的 enabled/exposure 改动只作用于当前会话,不写文件。[E: packages/coding-agent/src/extensions/mcp/index.ts:603]

## 4 Exposure

`McpExposure` 是 `"codemode" | "deferred" | "direct" | "hidden"`。配置里的 `"codemode-deferred"` 是别名,校验时替换成 `"codemode"`(含 `toolExposure` 值)。[E: packages/coding-agent/src/core/mcp-servers.ts:17] [E: packages/coding-agent/src/core/mcp-servers.ts:19] [E: packages/coding-agent/src/core/mcp-servers.ts:22] [E: packages/coding-agent/src/core/mcp-servers.ts:189] 测试确认 `exposure: "codemode-deferred"` 与 `toolExposure: { a: "codemode-deferred" }` 读出后都是 `"codemode"`。[E: packages/coding-agent/test/mcp-extension.test.ts:132] [E: packages/coding-agent/test/mcp-extension.test.ts:146] [E: packages/coding-agent/test/mcp-extension.test.ts:150] 省略 `exposure` 时按 `"codemode"`。[E: packages/coding-agent/src/core/mcp-servers.ts:214] [E: packages/coding-agent/src/extensions/mcp/index.ts:132]

| `McpExposure` | 模型如何够到工具 |
|---|---|
| `codemode`(默认) | 不声明给模型,也不进 codemode description;脚本用 `searchTools()` / `describeTool()` / `ALL_TOOLS` 调用。MCP 扩展会激活 `codemode` 工具(除非 `autoEnableCodemode` 为 false)。 |
| `deferred` | 不声明,直到 `tool_search` 加载匹配项;然后模型直接调用。扩展激活 `tool_search`,不依赖 codemode。 |
| `direct` | 像内置工具一样声明,也可从 codemode 调用。首个 prompt 最多等这些服务器 `startupWaitMs`(默认 10000 ms)。 |
| `hidden` | 已注册但不可达。 |

[E: packages/coding-agent/src/extensions/mcp/index.ts:466] [E: packages/coding-agent/src/extensions/mcp/index.ts:473] [E: packages/coding-agent/src/extensions/mcp/index.ts:474] [E: packages/coding-agent/src/extensions/mcp/index.ts:93] [E: packages/coding-agent/src/extensions/mcp/index.ts:1040]

`toToolExposure()` 把 MCP 的 `codemode` 映射成工具层 `ToolExposure` `"deferred"`(不进声明、不进 codemode description);`deferred` / `direct` / `hidden` 原样传递。两种 MCP 值在工具层都叫 deferred,差别只在扩展激活 `codemode` 还是 `tool_search`。[E: packages/coding-agent/src/extensions/mcp/tools.ts:45] [E: packages/coding-agent/src/extensions/mcp/tools.ts:46]

`toolExposure` 按精确工具名覆盖,再按对象里第一个匹配的 `*` 模式;否则用服务器 `exposure`。[E: packages/coding-agent/src/core/mcp-servers.ts:207] [E: packages/coding-agent/src/core/mcp-servers.ts:209] [E: packages/coding-agent/src/core/mcp-servers.ts:212] `pi mcp list` 与 `/mcp` Tools 视图会标出与服务器 exposure 不同的工具。[E: packages/coding-agent/src/extensions/mcp/cli.ts:465] [E: packages/coding-agent/src/extensions/mcp/index.ts:803]

工具名 `mcp__<server>__<tool>` 把非 `[A-Za-z0-9_]` 换成 `_`,超 64 字符或 sanitizing 碰撞时加 8 位 hash 后缀。[E: packages/coding-agent/src/extensions/mcp/tools.ts:50] [E: packages/coding-agent/src/extensions/mcp/tools.ts:93] [E: packages/coding-agent/src/extensions/mcp/tools.ts:96] 提供 resources 的非 hidden 服务器会注册 `list_mcp_resources`、`list_mcp_resource_templates`、`read_mcp_resource`;它们的 exposure 取这些服务器中最宽的(`direct` > `codemode` > `deferred`)。[E: packages/coding-agent/src/extensions/mcp/resources.ts:34] [E: packages/coding-agent/src/extensions/mcp/resources.ts:35] [E: packages/coding-agent/src/extensions/mcp/index.ts:447]

`codemode` / `deferred` 服务器写入 system prompt 的 `mcp_servers` section(`MCP_SERVERS_SECTION`),在 `before_agent_start` 里生成;首个 prompt 只等待带 `direct` 工具的服务器。[E: packages/coding-agent/src/extensions/mcp/index.ts:152] [E: packages/coding-agent/src/extensions/mcp/index.ts:1062] [E: packages/coding-agent/src/extensions/mcp/index.ts:1065] [E: packages/coding-agent/src/extensions/mcp/index.ts:1040]

## 5 OAuth 与 `auth.provider`

HTTP 服务器在没有 `Authorization` header、也没有 `auth` 时使用 OAuth。`oauthUrl` 就是该 `url`。[E: packages/coding-agent/src/extensions/mcp/runtime.ts:83] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:85] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:228] stdio 或已带 Authorization 的 HTTP 在 `pi mcp login` 会报 does not use OAuth。[E: packages/coding-agent/src/extensions/mcp/cli.ts:237] 连接自己不会开浏览器:401 后尝试 refresh,仍失败则 `needs-auth`,用户经 `/mcp` 或 `pi mcp login` 跑 PKCE 授权码流。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:377] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:456] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:338]

凭据存在 `~/.pi/agent/mcp-auth.json`,键为 `mcpNamespace(name)|url`(兼兼容旧的 URL-only key)。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:128] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:129] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:144] 会话在 `turn_start` 检测其它进程(例如 agent 跑的 `pi mcp login`)写入的新 token 并 `reconnect`。[E: packages/coding-agent/src/extensions/mcp/index.ts:1092] [E: packages/coding-agent/src/extensions/mcp/index.ts:1093]

`McpOAuthConfig` 用户字段:

- `clientId` / `clientSecret` / `callbackPort` / `callbackUrl` / `scope`:预注册客户端与 loopback 回调。`callbackUrl` 必须是 `localhost` / `127.0.0.1` / `[::1]` 上的 `http` URI。[E: packages/coding-agent/src/core/mcp-servers.ts:58] [E: packages/coding-agent/src/core/mcp-servers.ts:144]
- `clientName`:动态注册时发送的 `client_name`;OAuth provider 默认 `APP_NAME`(`"pi"`)。[E: packages/coding-agent/src/core/mcp-servers.ts:78] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:272] 空字符串被拒绝。[E: packages/coding-agent/src/core/mcp-servers.ts:153]
- `clientRegistration`: `"dcr"`(默认,动态注册)或 `"cimd"`。`cimd` 不能与 `clientId` / `clientName` 组合;若设 `callbackUrl`,host 必须是 localhost 或 127.0.0.1 且 path 为 `/callback`。[E: packages/coding-agent/src/core/mcp-servers.ts:84] [E: packages/coding-agent/src/core/mcp-servers.ts:157] [E: packages/coding-agent/src/core/mcp-servers.ts:159] [E: packages/coding-agent/src/core/mcp-servers.ts:163] CIMD 文档基址是 `https://pi.dev/oauth`。授权服务器若声明 `authorization_response_iss_parameter_supported`,client id 为 `https://pi.dev/oauth/client.json`;否则用服务器 URL 的 12 字符 id,文档为 `https://pi.dev/oauth/<id>/client.json`,redirect path 为 `/callback/<id>`。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:42] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:254] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:259] 服务器必须 advertise CIMD 且支持 public clients(`token_endpoint_auth_methods_supported` 含 `"none"`)。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:246] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:247]
- `authServerMetadataUrl`:跳过发现,直接使用该 RFC 8414 / OIDC metadata。必须是 https,或 loopback 上的 http。[E: packages/coding-agent/src/core/mcp-servers.ts:90] [E: packages/coding-agent/src/core/mcp-servers.ts:170] refresh 与 `signInMcpServer()` 把它传给 `authorizeMcp()`。[E: packages/coding-agent/src/extensions/mcp/oauth.ts:328] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:505]

`auth?: { provider: string }` 改走 `/login` provider 的 token,而不是 OAuth:每次请求调用 `modelRegistry.getApiKeyForProvider(provider)`,MCP 不存副本。[E: packages/coding-agent/src/core/mcp-servers.ts:112] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:213] [E: packages/coding-agent/src/extensions/mcp/index.ts:532] `url` 必须是 https,或 loopback 上的 http。[E: packages/coding-agent/src/core/mcp-servers.ts:259] [E: packages/coding-agent/src/core/mcp-servers.ts:260]

## 6 装配与门控

`omitReplacedExtensions()`:若非 replaceable 扩展在加载期登记了同名 command/tool/flag,replaceable 的内置扩展被丢掉。因此第三方扩展 `registerCommand("mcp")` 会替换 `builtin:mcp`,会话不再读内置 `mcp.json` 连接。[E: packages/coding-agent/src/core/resource-loader.ts:120] [E: packages/coding-agent/src/core/resource-loader.ts:137] [E: packages/coding-agent/src/core/resource-loader.ts:149] [E: packages/coding-agent/src/core/extensions/types.ts:2024] `pi mcp` 仍走 `main.ts` 的内置 `runMcpCommand()`,不受该替换影响。[E: packages/coding-agent/src/main.ts:614] 也可用 settings `"extensions": ["-builtin:mcp"]` 或 `pi config` 的 Built-in 关掉内置 MCP。[I]

`session_start` 加载配置、合并 `getMcpServers()`、后台 `startConnection()`。无 enabled 服务器则不加载 MCP runtime。[E: packages/coding-agent/src/extensions/mcp/index.ts:1016] [E: packages/coding-agent/src/extensions/mcp/index.ts:1023] `mcp_servers_change` 让会话中途登记/注销立即连上或断开。[E: packages/coding-agent/src/extensions/mcp/index.ts:1097] HTTP 连接对网络错误与 408/429/5xx(除 501)重试两次(delay 250 ms、1000 ms);stdio 不按 HTTP 重试。[E: packages/coding-agent/src/extensions/mcp/runtime.ts:50] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:71] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:356] 服务器 `notifications/message` 追加到 `~/.pi/agent/mcp.log`,超过 5 MB 转到 `mcp.log.1`。[E: packages/coding-agent/src/extensions/mcp/log.ts:10] [E: packages/coding-agent/src/extensions/mcp/index.ts:351]

Transport 由 `createDefaultTransport()` 建造:`url` → `StreamableHttpTransport`,`command` → `StdioTransport`(`~/` 展开为 home,相对 `cwd` 相对 session 目录)。[E: packages/coding-agent/src/extensions/mcp/runtime.ts:97] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:104] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:114] 客户端来自独立包 `@earendil-works/pi-mcp` 的 `McpClient`。[E: packages/coding-agent/src/extensions/mcp/runtime.ts:16] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:373]

面向模型的 MCP 文本结果超过 `MCP_OUTPUT_MAX_BYTES`(20 KiB)会中间截断并把全文写到 temp 文件;codemode 脚本拿到完整 `CallToolResult`。[E: packages/coding-agent/src/extensions/mcp/tools.ts:52] [E: packages/coding-agent/src/extensions/mcp/tools.ts:128]

## 7 跨包关系

`subsys.mcp.client` 覆盖 `@earendil-works/pi-mcp` 的 `McpClient`、stdio / Streamable HTTP / in-memory transport 与 OAuth primitives。本节点只写 coding-agent 如何把这些装配成 `/mcp`、`pi mcp` 和 `mcp.json`。[E: packages/coding-agent/src/extensions/mcp/runtime.ts:16] [E: packages/coding-agent/src/extensions/mcp/oauth.ts:20]

`subsys.coding-agent.mcp` 覆盖连接状态机、`registerTool`、resource tools、`mcp_servers` section 的内部走读。本节点只保留用户能操作的入口与配置字段。

`surface.codemode.overview` 是 `codemode` 工具与 settings。MCP 默认 `exposure: "codemode"` 并把 MCP `codemode` 映射成工具层 `deferred`,由 `autoEnableCodemode` 决定是否激活该工具。[E: packages/coding-agent/src/extensions/mcp/tools.ts:46] [E: packages/coding-agent/src/extensions/mcp/index.ts:482]

`surface.slash-commands.overview` 与 `ref.coding-agent.slash-commands` 以 `BUILTIN_SLASH_COMMANDS`(24)为内置命令 ground truth。`/mcp` 是 extension command,不是该 catalog 的成员。[E: packages/coding-agent/src/core/slash-commands.ts:19] [E: packages/coding-agent/src/extensions/mcp/index.ts:1141]

`surface.extensions.api` 提供 `registerCommand` / `registerMcpServer` / `on("mcp_servers_change")`。内置 MCP 是该 API 上的 replaceable builtin。[E: packages/coding-agent/src/core/extensions/types.ts:1853] [E: packages/coding-agent/src/extensions/index.ts:13]

## Gotcha

- `/mcp` 不在 `BUILTIN_SLASH_COMMANDS`。关掉 `builtin:mcp`、或被另一个登记 `/mcp` 的扩展替换后,会话内没有内置管理器,但 `pi mcp` 仍可用。[E: packages/coding-agent/src/core/slash-commands.ts:19] [E: packages/coding-agent/src/main.ts:614] [E: packages/coding-agent/src/core/resource-loader.ts:149]
- Project override 不能改 `command` / `url` / `headers` / `env` / `auth`;改这些必须写完整 project 条目(会整份替换)或改 user-level 文件。[E: packages/coding-agent/src/extensions/mcp/config.ts:74] [E: packages/coding-agent/src/extensions/mcp/config.ts:78]
- TUI Exposure 菜单不能选 `hidden`;`hidden` 与 per-tool `toolExposure` 只能写 JSON。`pi mcp add --exposure hidden` 可以,因为校验接受该值。[E: packages/coding-agent/src/extensions/mcp/index.ts:113] [E: packages/coding-agent/src/core/mcp-servers.ts:19]
- MCP 层 `codemode` 与 `deferred` 在 `ToolDefinition.exposure` 上都变成 `"deferred"`。用户配置与 `/mcp` 显示仍用 `McpExposure` 名字。[E: packages/coding-agent/src/extensions/mcp/tools.ts:46]
- `pi mcp` 没有 `reconnect`;掉线后的重连是会话内 `/mcp reconnect`,或下次 tool call 时 `McpServerConnection` 懒重连。[E: packages/coding-agent/src/extensions/mcp/cli.ts:256] [E: packages/coding-agent/src/extensions/mcp/index.ts:274] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:56] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:250] [E: packages/coding-agent/src/extensions/mcp/runtime.ts:436]
- CIMD 与 `authServerMetadataUrl` 没有对应的 `pi mcp add` flag,必须编辑 `mcp.json`。[I]

## Sources

- packages/coding-agent/src/extensions/mcp/index.ts
- packages/coding-agent/src/extensions/mcp/cli.ts
- packages/coding-agent/src/extensions/mcp/cli.lazy.ts
- packages/coding-agent/src/extensions/mcp/config.ts
- packages/coding-agent/src/extensions/mcp/ui.ts
- packages/coding-agent/src/extensions/mcp/oauth.ts
- packages/coding-agent/src/extensions/mcp/runtime.ts
- packages/coding-agent/src/extensions/mcp/tools.ts
- packages/coding-agent/src/extensions/mcp/resources.ts
- packages/coding-agent/src/extensions/mcp/log.ts
- packages/coding-agent/src/core/mcp-servers.ts
- packages/coding-agent/src/extensions/index.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/cli/args.ts
- packages/coding-agent/src/config.ts
- packages/coding-agent/src/core/slash-commands.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/trust-manager.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/docs/mcp.md
- packages/coding-agent/test/mcp-extension.test.ts
- packages/coding-agent/test/mcp-command.test.ts

## 相关

- [subsys.coding-agent.mcp](../../subsystems/coding-agent/mcp.md): 内置 MCP 扩展的连接、工具注册、resource tools 与 `mcp_servers` section。
- [subsys.mcp.client](../../subsystems/mcp/client.md): `@earendil-works/pi-mcp` 的 `McpClient`、transport 与 OAuth。
- [surface.codemode.overview](../codemode/overview.md): `codemode` 工具;MCP 默认 exposure 与 `autoEnableCodemode` 的协作面。
- [surface.slash-commands.overview](../commands/overview.md): slash 命令总览;`/mcp` 是 extension command,不是 24 个内置命令之一。
- [ref.coding-agent.slash-commands](../../reference/slash-commands.md): `BUILTIN_SLASH_COMMANDS` 逐项 catalog。
- [surface.extensions.api](../extensions/api.md): `registerCommand` / `registerMcpServer` / replaceable builtin 的 API。
