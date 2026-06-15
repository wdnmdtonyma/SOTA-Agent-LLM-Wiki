---
id: subsys.mcp.client
title: MCP client
kind: subsystem
tier: T2
source: [codex-rs/codex-mcp/src/mcp_connection_manager.rs]
symbols: [McpConnectionManager, AsyncManagedClient, ManagedClient, ToolInfo, ToolFilter, start_server_task, make_rmcp_client, list_tools_for_client_uncached]
related: [subsys.mcp.transports, subsys.mcp.oauth, subsys.mcp.name-qualification, subsys.mcp.connectors, spine.trace-mcp-call, tool.mcp-namespace-tools, tool.list-mcp-resources, tool.read-mcp-resource]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `McpConnectionManager` 是 Codex 作为 MCP client 连接外部 MCP server 的所有权边界：每个 configured server 对应一个 `RmcpClient`，所有远端 tools 被聚合成 model-visible fully-qualified tool map。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:2][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:5][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:7]

## 能回答的问题

- Codex 启动时怎样为每个 MCP server 建立 client？
- MCP tools 怎样从 server-local name 变成模型可见的 namespace/name？
- Codex Apps tools 为什么有缓存、schema masking、connector metadata？
- MCP resources 和 resource templates 怎样跨 server 聚合？
- MCP tool call 如何检查 tool filter、传递 `_meta`、返回 `CallToolResult`？

## 职责边界

`codex-mcp` 的 client 方向负责连接外部 MCP server、缓存 Codex Apps tools、聚合 tools/resources/templates、执行 `tools/call`，不负责把 MCP tools 注册进 OpenAI Responses tool registry；tool registry 的 MCP exposure 由 `codex-rs/tools/src/tool_registry_plan.rs` 处理，实际 tool call trace 由 `spine.trace-mcp-call` 覆盖。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:656][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:925][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:989][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1055][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1124][I]

Codex 作为 MCP server 的反向能力不在 `McpConnectionManager` 中；该能力由 `codex-rs/mcp-server/src/message_processor.rs` 暴露 `codex` 和 `codex-reply` tools。[I]

## 关键 crate/文件

- `codex-rs/codex-mcp/src/mcp_connection_manager.rs`: manager、client lifecycle、Codex Apps cache、tool/resource aggregation、tool call 执行都集中在这个文件。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:656][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:746][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:925][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:987][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1124]
- `make_rmcp_client` 按 config transport dispatch：stdio 分支调用 `RmcpClient::new_stdio_client`，streamable HTTP 分支调用 `RmcpClient::new_streamable_http_client`。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1528][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1582][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1614]

## 数据模型

- `ToolInfo` 保存 server name、callable name、callable namespace、server instructions、raw MCP `Tool`，以及 Codex Apps connector/plugin metadata；`canonical_tool_name` 用 namespace/name 生成 `ToolName`。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:141][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:143][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:144][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:145][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:153][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:160][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:163]
- `ManagedClient` 是 ready 状态的 client snapshot，包含 `RmcpClient`、tool list、tool filter、timeout、server instructions、sandbox-state capability flag 和 Codex Apps cache context；`listed_tools` 在 cache context 命中时返回 cached filtered tools，否则返回内存 tool snapshot。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:440][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:442][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:443][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:447][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:451][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:463][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:473]
- `AsyncManagedClient` 持有 shared startup future、startup cached snapshot 和 startup-complete flag；它允许初始化期间返回 startup snapshot，或在启动失败后回退到 snapshot。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:477][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:479][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:480][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:501][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:505][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:629][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:638]
- `McpConnectionManager` 持有 `clients`、`server_origins` 和 `ElicitationRequestManager`，因此 manager 是 server registry 和 elicitation routing 的共同所有者。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:656][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:658][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:659][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:660]
- `ToolFilter` 从 per-server `enabled_tools`/`disabled_tools` 构建，`allows` 同时执行 allow-list 和 deny-list 逻辑。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1244][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1251][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1254][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1265][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1269][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1272]

## 控制流

1. `McpConnectionManager::new` 遍历 `mcp_servers`，跳过 `enabled == false` 的 server，并为每个启用 server 记录 `transport_origin`、发出 `McpStartupStatus::Starting`、创建 `AsyncManagedClient`。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:746][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:768][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:769][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:773][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:790]
2. `AsyncManagedClient::new` 先尝试载入 startup cached Codex Apps snapshot，再 validate server name、构造 `RmcpClient`、调用 `start_server_task`；如果有 snapshot，会把真实启动放入后台 task。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:501][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:511][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:515][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:524][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:551][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:553]
3. `start_server_task` 发送 initialize，ClientCapabilities 包含 elicitation support，client info 使用 `codex-mcp-client`/`Codex`，protocol version 是 `2025-06-18`。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1429][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1442][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1450][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1454][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1456][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1461]
4. 初始化返回的 server capabilities 会被检查是否包含 `sandbox-state` experimental meta capability；这个布尔值进入 `ManagedClient`，调用方可通过 `server_supports_sandbox_state_meta_capability` 查询。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1471][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1476][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1512][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1161][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1168]
5. `list_tools_for_client_uncached` 调用 `list_tools_with_connector_ids`，把每个 MCP tool 包装成 `ToolInfo`，其中 callable namespace 对 Codex Apps connector 与普通 server 使用不同规则。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1745][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1751][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1774][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1775][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1354][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1368]
6. Codex Apps server 的 tool cache key 由 auth token data 中的 account id、user id、workspace flag 派生，cache path 位于 `codex_apps_tools` 目录，并使用 SHA1 文件名。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:110][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:122][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:128][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:134][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:135][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:136][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:137][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:268][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:270][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:271]
7. `list_all_tools` 遍历 manager 内所有 clients，合并每个 client 的 `listed_tools()` 返回值；`listed_tools()` 可能返回 startup snapshot、ready snapshot 或失败回退 snapshot，`None` 会被跳过，最终调用 `qualify_tools(tools)`。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:577][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:630][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:634][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:635][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:638][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:925][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:927][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:933]
8. `list_all_resources` 与 `list_all_resource_templates` 会先取得 ready client，失败则跳过该 server；成功的 client 会启动 task 并分页拉取，duplicate cursor 返回 error，失败 result 只写 warning 且不进入聚合结果。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:989][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:996][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:997][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1002][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1020][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1023][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1042][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1055][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1062][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1063][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1068][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1086][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1090][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1110]
9. `call_tool` 按 server name 取 client，先用 `tool_filter.allows(tool_name)` 检查工具是否可调用，再调用底层 `RmcpClient::call_tool(tool_name, arguments, meta, timeout)`。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1124][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1131][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1132][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1138]
10. `call_tool` 把 MCP result content 序列化为 JSON value 列表，保留 `structured_content`、`is_error` 和可序列化 `_meta`，再返回 core `CallToolResult`。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1144][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1148][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1153][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1155][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1156][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1157]

## 设计动机与权衡

- 启动缓存只给 Codex Apps 使用，因为 cache context 和 cache path 只在 server name 等于 `CODEX_APPS_MCP_SERVER_NAME` 时构造；普通 MCP server 启动时实时 list tools，之后使用 `ManagedClient` 内存 snapshot。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:782][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:789][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1479][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1504][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:473]
- Codex Apps tool schema 会把 `openai/fileParams` 指定的参数改写成 model-visible string/array string schema，这使模型输出 absolute local file path 字符串或字符串数组。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:169][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:191][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:223][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:245][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:246][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:248]
- Elicitation 默认经过 policy；`Never` 会拒绝，granular policy 调用 `allows_mcp_elicitations()` 判断，permission/sandbox 已预批准且 form schema 为空时可以 auto-accept。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:289][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:291][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:295][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:299][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:305][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:361][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:362]
- HTTP MCP bearer token 可以来自环境变量，但 unset、empty、non-Unicode 都是显式错误路径；这避免把空 bearer 当作匿名请求发出。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1373][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1381][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1385][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1391][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1395]

## gotcha

- MCP server name 必须匹配 `^[a-zA-Z0-9_-]+$`，否则 `validate_mcp_server_name` 返回错误，并会让 `AsyncManagedClient::new` 的 startup path 失败。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:511][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:512][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1791][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1795]
- `required_startup_failures` 对 required server 中缺失 client 或启动失败的条目返回 failure；这个 helper 不检查 startup timeout 配置。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:897][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:905][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:914]
- GitHub MCP PAT 缺失和 OAuth 未登录有专门错误文案；`mcp_init_error_display` 会把 `AuthRequired` 引导到 `codex mcp login <server>`。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1807][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1817][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1820][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1822]

## Sources

- codex-rs/codex-mcp/src/mcp_connection_manager.rs

## 相关

- `subsys.mcp.transports`
- `subsys.mcp.oauth`
- `subsys.mcp.name-qualification`
- `subsys.mcp.connectors`
- `spine.trace-mcp-call`
- `tool.mcp-namespace-tools`
- `tool.list-mcp-resources`
- `tool.read-mcp-resource`
