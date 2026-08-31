---
id: subsys.mcp.client
title: MCP client runtime
kind: subsystem
tier: T2
source: [codex-rs/codex-mcp/src/runtime.rs, codex-rs/codex-mcp/src/binding.rs, codex-rs/codex-mcp/src/binding_clients.rs, codex-rs/codex-mcp/src/pagination.rs, codex-rs/codex-mcp/src/connection_manager.rs, codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs, codex-rs/codex-mcp/src/rmcp_client.rs, codex-rs/codex-mcp/src/resource_client.rs, codex-rs/codex-mcp/src/tools.rs, codex-rs/codex-mcp/src/elicitation.rs, codex-rs/rmcp-client/src/protocol_mode.rs, codex-rs/rmcp-client/src/elicitation_client_service.rs, codex-rs/core/src/session/mcp.rs, codex-rs/core/src/session/mcp_refresh.rs, codex-rs/core/src/session/mcp_prewarm.rs, codex-rs/core/src/tools/handlers/mcp.rs, codex-rs/core/src/mcp_tool_call.rs]
symbols: [McpRuntime, McpRuntimeInput, PublishedMcpRuntime, McpBinding, PreparedMcpCall, McpConnectionSet, McpResourceClient, McpRefresh, ElicitationRequestRouter, record_protocol_discovery_metrics, validate_mcp_server_name]
related: [spine.extension-system, subsys.mcp.transports, subsys.mcp.oauth, subsys.mcp.name-qualification, subsys.mcp.connectors, spine.trace-mcp-call, tool.mcp-namespace-tools, tool.list-mcp-resources, tool.read-mcp-resource]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> MCP client 的线程级 owner 现在是 `McpRuntime`：它原子发布最新 `McpConnectionSet`，每个 model sampling step 捕获不可变 `McpBinding` 来构建广告目录和 resource tools；普通 MCP tool 真正执行前则再次 refresh，并从 call-time current binding 取得 client、metadata 与 approval authority。

## 能回答的问题

- MCP 配置、auth、plugin/capability 变化怎样触发 refresh？
- 新旧 connection set 在什么条件下复用或强制重连？
- 广告目录与最终 MCP call 为什么可能来自不同 binding？
- step-bound resource tools、thread-owned resource client 与 ordinary tool call 为什么读取三种视图？
- Codex Apps 的 hard refresh 怎样建立新的 publication？
- MCP initialize 怎样上报 protocol discovery metrics？
- `ToolInfo.namespace_description` 怎样进入 cache 并被 model-visible namespace 使用？
- package-style MCP server name（含 `/`、`@`）何时被接受？

## 1 三层状态

| 层 | 生命周期 | 一致性语义 |
|---|---|---|
| `McpRuntime` | 每个 Codex thread 一个 | `ArcSwap<PublishedMcpRuntime>` 原子发布最新 connections/config/auth；旧 snapshot 由现存 binding 持有。[E: codex-rs/codex-mcp/src/runtime.rs:68][E: codex-rs/codex-mcp/src/runtime.rs:92] |
| `McpConnectionSet` | 一次 runtime publication | 启动/复用 enabled servers，保存最新可发现的工具、资源与 metadata；replace 可传前一 set 做安全复用。[E: codex-rs/codex-mcp/src/runtime.rs:248][E: codex-rs/codex-mcp/src/runtime.rs:263] |
| `McpBinding` | 一次 captured runtime view | 冻结该 view 的 `tools`、prepared calls、config、plugin availability 与 exact clients；step capture 用它广告 tools，ordinary call 又会从 current runtime capture 一次。[E: codex-rs/codex-mcp/src/binding.rs:32][E: codex-rs/codex-mcp/src/binding.rs:38][E: codex-rs/codex-mcp/src/binding.rs:81][E: codex-rs/codex-mcp/src/binding.rs:97][E: codex-rs/core/src/mcp_tool_call.rs:154][E: codex-rs/core/src/mcp_tool_call.rs:154] |

`McpRuntimeInput` 把 exact config、server projection、auth、environment/runtime context、Apps cache、selected capability roots 和 elicitation plumbing 聚成一次 publication 的输入。[E: codex-rs/codex-mcp/src/runtime.rs:68][E: codex-rs/codex-mcp/src/runtime.rs:78]

协议模式也属于 exact config：默认 `Legacy` 以 2025-06-18 initialize；feature `mcp_2026_07_28` 打开后切到 `V20260728`，HTTP 使用自动 discovery/lifecycle 并允许回退 legacy，stdio 还必须由 server env 的 `CODEX_MCP_PROTOCOL_VERSION=2026-07-28` 二次 opt-in，否则仍按 legacy 启动。[E: codex-rs/rmcp-client/src/protocol_mode.rs:9][E: codex-rs/rmcp-client/src/protocol_mode.rs:17][E: codex-rs/rmcp-client/src/protocol_mode.rs:26][E: codex-rs/rmcp-client/src/protocol_mode.rs:36]

## 2 Refresh 与 publication

session 的 `McpRefresh` 使用 atomic pending bit 加单 permit semaphore；多个 invalidation 被合并，但 refresh 执行期间再次变脏会让 loop 再发布一次。取消发生在 publication 前时，guard 会把 dirty bit 放回去。[E: codex-rs/core/src/session/mcp_refresh.rs:8][E: codex-rs/core/src/session/mcp_refresh.rs:36][E: codex-rs/core/src/session/mcp_refresh.rs:45][E: codex-rs/core/src/session/mcp_refresh.rs:53]

`refresh_mcp_if_dirty` 在 gate 内重新检查 auth/plugin mode、解析 selected capability roots 与 executor discovery，再构造并发布 runtime；只有 pending 被耗尽才退出。[E: codex-rs/core/src/session/mcp.rs:176]

普通 `McpRuntime::replace` 可把前一 `McpConnectionSet` 交给新 set 复用兼容连接；`replace_fresh` 则不提供 previous set，强制 fresh connections。[E: codex-rs/codex-mcp/src/runtime.rs:248][E: codex-rs/codex-mcp/src/runtime.rs:263][E: codex-rs/codex-mcp/src/runtime.rs:264]

Codex Apps 的 explicit hard refresh 先等 dirty refresh，再独占 refresh gate，使用 `replace_fresh` 发布新 clients 后读取完整 refreshed catalog；该返回值与 hard-refresh 完成时的 publication 一致，但后续 ordinary call 仍按 call-time current binding 解析。[E: codex-rs/core/src/session/mcp.rs:253][E: codex-rs/core/src/session/mcp.rs:305][E: codex-rs/codex-mcp/src/runtime.rs:242][E: codex-rs/codex-mcp/src/runtime.rs:244][E: codex-rs/core/src/mcp_tool_call.rs:154][E: codex-rs/core/src/mcp_tool_call.rs:158]

## 3 Step binding 与 call authority

每个 step 在 `mcp_runtime_for_step` 比较 selected capability roots，必要时标 dirty、完成 refresh，然后调用 `current_binding`；如果尚无发布 config 才返回空 binding。[E: codex-rs/core/src/session/mcp.rs:326]

`McpBinding::tools` 是冻结目录；step planner 据此创建只保存 `ToolInfo/spec` 的 `McpHandler`，handler 不保存 step binding 或 prepared call。[E: codex-rs/codex-mcp/src/binding.rs:81][E: codex-rs/core/src/tools/handlers/mcp.rs:40][E: codex-rs/core/src/tools/handlers/mcp.rs:46][E: codex-rs/core/src/tools/handlers/mcp.rs:153]

真正调用时，`handle_mcp_tool_call` 先执行 `refresh_mcp_if_dirty()`，再从 runtime 的 `current_binding()` 按 `(server, tool)` 查 `PreparedMcpCall`。若 tool 已从最新 catalog 消失，调用直接返回 “not available to the model”；若仍存在，approval metadata、config、plugin provenance 与 exact client 来自这个 call-time binding，而非广告时 binding。[E: codex-rs/core/src/mcp_tool_call.rs:154][E: codex-rs/core/src/mcp_tool_call.rs:154][E: codex-rs/core/src/mcp_tool_call.rs:154][E: codex-rs/core/src/mcp_tool_call.rs:163][E: codex-rs/core/src/mcp_tool_call.rs:173][E: codex-rs/core/src/mcp_tool_call.rs:173]

真正发送前，call-time `PreparedMcpCall::call_with_preparation` 获取 catalog revision read guard：prepared call 建立后、guard 获取前 revision 已变化则拒绝；匹配时在 guard 持有期间完成不可逆参数准备与 exact-client call，因此 catalog replacement 被阻塞到发送结束。这个 guard 保护 “call-time prepare → send” 窗口，不把 model 广告时 binding 延长到执行时。[E: codex-rs/codex-mcp/src/binding.rs:312][E: codex-rs/codex-mcp/src/binding.rs:328][E: codex-rs/codex-mcp/src/binding.rs:329][E: codex-rs/codex-mcp/src/binding.rs:366][I]

## 4 Discovery 与 resources

非模型 discovery 可以调用 runtime 的 `latest_list_all_tools`、`latest_call_tool`、`latest_read_resource` 等 API；它们明确读取最新 connection set，而不是某个旧 step binding。[E: codex-rs/codex-mcp/src/runtime.rs:490][E: codex-rs/codex-mcp/src/runtime.rs:495]

`McpResourceClient` 同样持有 `Arc<McpRuntime>`，每次 list/read 都从 `latest_connections()` 取当前 set；`cache_key` 用 connection-set weak identity，让上层在 publication 更换时失效资源 cache。[E: codex-rs/codex-mcp/src/resource_client.rs:34][E: codex-rs/codex-mcp/src/resource_client.rs:65][E: codex-rs/codex-mcp/src/resource_client.rs:79][E: codex-rs/codex-mcp/src/resource_client.rs:105]

binding 自己也能 list/read resources：capture 过程会跳过无法取得 exact ready client 的 server，并只把成功取得的 client 插入 `McpBindingClients`。all-server aggregation 只走这组 step-ready clients，并用公共 pagination collector 拉完所有页；指定 server 则优先同一步的 ready client，缺失时回退 binding 持有的 live connection set。因此它不是无条件 frozen resource view。[E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:234][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:234][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:251][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:251][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:251][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:251][E: codex-rs/codex-mcp/src/binding.rs:104][E: codex-rs/codex-mcp/src/binding.rs:109][E: codex-rs/codex-mcp/src/binding.rs:116][E: codex-rs/codex-mcp/src/binding.rs:146][E: codex-rs/codex-mcp/src/pagination.rs:13]

## 5 Elicitation compatibility

RMCP client service 同时接受 typed `ElicitRequest`、legacy/custom `elicitation/create` 和 capability-gated `openai/form`；现代 2026 session 返回 typed `ElicitResult`，legacy session 返回 custom result。它会把 RMCP 从 JSON-RPC 提升到 request context 的 `_meta` 放回请求，但移除 transport-only `progressToken`。[E: codex-rs/rmcp-client/src/elicitation_client_service.rs:32][E: codex-rs/rmcp-client/src/elicitation_client_service.rs:111][E: codex-rs/rmcp-client/src/elicitation_client_service.rs:136][E: codex-rs/rmcp-client/src/elicitation_client_service.rs:156][E: codex-rs/rmcp-client/src/elicitation_client_service.rs:243][E: codex-rs/rmcp-client/src/elicitation_client_service.rs:299]

线程共享 `ElicitationRequestRouter` 用 Codex 自己生成的 public token 路由并发 responder，避免不同 runtime 复用 server request id 冲突；approval policy 可 auto-accept 空 schema confirm、严格 auto-review 或直接 decline，不能审查或没有 event sink 时 fail closed。[E: codex-rs/codex-mcp/src/elicitation.rs:95]

## 6 Protocol discovery metrics 与 namespace cache

`start_server_task` 在 `initialize` 完成后立刻调用 `record_protocol_discovery_metrics`：mode 把 `McpProtocolMode::Legacy` 标为 `legacy`、`V20260728` 标为 `auto`；outcome 按协商到的 `ProtocolVersion::V_2026_07_28` 记 `modern`，其它成功记 `legacy`，错误记 `failure`。指标名是 `codex.mcp.protocol_discovery` 与 `codex.mcp.protocol_discovery.duration_ms`，没有 global metrics client 时静默跳过。[E: codex-rs/codex-mcp/src/rmcp_client.rs:895][E: codex-rs/codex-mcp/src/rmcp_client.rs:899][E: codex-rs/codex-mcp/src/rmcp_client.rs:979][E: codex-rs/codex-mcp/src/rmcp_client.rs:989][E: codex-rs/codex-mcp/src/rmcp_client.rs:993][E: codex-rs/codex-mcp/src/rmcp_client.rs:1002]

`ToolInfo.namespace_description` 是 model-visible namespace 说明。serde 用 `alias = "connector_description"` 读取旧 cache 行，新写入走 `namespace_description`。[E: codex-rs/codex-mcp/src/tools.rs:42][E: codex-rs/codex-mcp/src/tools.rs:43]

Codex Apps 转换在存在 connector metadata 时用 `connector_description`，否则回退 server instructions；regular MCP 转换始终用 server instructions，并清掉不可信 connector 字段。[E: codex-rs/codex-mcp/src/rmcp_client.rs:779][E: codex-rs/codex-mcp/src/rmcp_client.rs:781][E: codex-rs/codex-mcp/src/rmcp_client.rs:816][E: codex-rs/codex-mcp/src/rmcp_client.rs:820]

`McpHandler` 把该字段写进 tool-search source description 和 namespace 广告文本；agent-plugin path 会按更严字节上限截断。approval metadata 只在 Codex Apps server 上把 `namespace_description` 回填为 `connector_description`。[E: codex-rs/core/src/tools/handlers/mcp.rs:71][E: codex-rs/core/src/tools/handlers/mcp.rs:153][E: codex-rs/core/src/tools/handlers/mcp.rs:532][E: codex-rs/core/src/mcp_tool_call.rs:1648]

`start_server_task` 在构造 RMCP client 之前调用 `validate_mcp_server_name`：合法字符集是 `^[a-zA-Z0-9_:@/.-]+$`，因此 npm/pypi 式名字（如 `@scope/pkg`、`org/name`）可通过；旧规则 `^[a-zA-Z0-9_-]+$` 已放宽。校验失败会阻止该 server 启动，而不是等到 tool 名 sanitize 阶段。[E: codex-rs/codex-mcp/src/rmcp_client.rs:334][E: codex-rs/codex-mcp/src/rmcp_client.rs:862][E: codex-rs/codex-mcp/src/rmcp_client.rs:863]

本地 HTTP MCP client 由 `McpRuntimeContext::new` 构造 `RouteAwareHttpClient` 并打开 `with_tls_backend_fallback()`，因此 delegated/local HTTP MCP 与 product HTTP 共用 rustls 协议协商回退。[E: codex-rs/codex-mcp/src/runtime.rs:650][E: codex-rs/codex-mcp/src/runtime.rs:652]

MCP hook handler 的注册与 plugin 变更后 refresh hook runtime 由 skills/hooks 批次覆盖；本节点只负责 MCP tool catalog 与 call-time binding。[I]

## 7 边界与 gotcha

- “refresh 成功”表示新 publication 对未来读取可见，不会修改已经捕获的 binding；旧连接会由引用生命周期自然保留。[E: codex-rs/codex-mcp/src/runtime.rs:92][E: codex-rs/codex-mcp/src/runtime.rs:94][I]
- model-advertised schema 来自 step binding，但 ordinary MCP execution follow call-time current binding；因此 refresh 后同名 tool 的 execution authority 可以变化，删除则得到 unavailable。不要把 revision guard描述成整步冻结。[E: codex-rs/core/src/mcp_tool_call.rs:154][E: codex-rs/core/src/mcp_tool_call.rs:163][I]
- tool-facing list/read resource handlers 从 step binding 进入；capture 只把 exact ready clients 插入 client map。指定 server 不在这组 step-ready clients 中时会 live fallback；extension-facing `McpResourceClient` 每次 follow latest runtime；ordinary MCP call 则在执行前主动 refresh 后取 current binding。[E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:234][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:251][E: codex-rs/codex-mcp/src/binding.rs:109][E: codex-rs/core/src/mcp_tool_call.rs:154][E: codex-rs/codex-mcp/src/resource_client.rs:65][I]
- prewarm 是 bounded best-effort 启动优化；step path 的 refresh/capture 才是正确性屏障，不能把 prewarm 完成当成 binding 已冻结。[U]

## Sources

- `codex-rs/codex-mcp/src/runtime.rs`
- `codex-rs/codex-mcp/src/binding.rs`
- `codex-rs/codex-mcp/src/binding_clients.rs`
- `codex-rs/codex-mcp/src/pagination.rs`
- `codex-rs/codex-mcp/src/connection_manager.rs`
- `codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs`
- `codex-rs/codex-mcp/src/rmcp_client.rs`
- `codex-rs/codex-mcp/src/resource_client.rs`
- `codex-rs/codex-mcp/src/tools.rs`
- `codex-rs/codex-mcp/src/elicitation.rs`
- `codex-rs/rmcp-client/src/protocol_mode.rs`
- `codex-rs/rmcp-client/src/elicitation_client_service.rs`
- `codex-rs/core/src/session/mcp.rs`
- `codex-rs/core/src/session/mcp_refresh.rs`
- `codex-rs/core/src/session/mcp_prewarm.rs`
- `codex-rs/core/src/tools/handlers/mcp.rs`
- `codex-rs/core/src/mcp_tool_call.rs`

## 相关

- [trace:MCP 工具调用](../../spine/trace-mcp-call.md)
- [MCP transports](transports.md)
- [MCP resource tools](../../surface/tools/list-mcp-resources.md)
