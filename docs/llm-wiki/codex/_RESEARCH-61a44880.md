# Codex `4d7a5c7c73..61a44880a8` 源码差分研究

> 研究日期：2026-07-26
> 已验证 Wiki 基线：`4d7a5c7c7394b687ebcb67e634528b2b8c5578d9`
> 目标源码：官方 `openai/codex` `origin/main` = `61a44880a85d2fd0d8770908dea5733495e571c8`
> 本文是更新前的只读源码审计，不是 Wiki 节点，不应加入 `index.json` 或 `llms.txt`。

## 1. 研究边界与源码状态

- 已完整阅读本目录的 `RUN.md`、`conventions.md`、`README.md`、`index.json`、现有 `_UPDATE-SCOPE.md`，以及适用的根级 `AGENTS.md` 和 `codex-rs/tui/src/bottom_pane/AGENTS.md`。
- 本工作树的 `codex/` 未初始化；superproject 当前 gitlink 仍是 `db887d03e1f907467e33271572dffb73bceecd6b`。没有初始化/切换子模块，也没有修改 Codex 源仓。
- 源码事实来自现有对象库 `/Users/makii/Project/SOTA-Agent-LLM-Wiki/.git/modules/codex`。该对象库的 `refs/remotes/origin/main` 精确指向目标 SHA；基线和目标对象都存在，且基线是目标祖先。
- 差分规模：275 commits、1,344 files，约 `+78,779/-29,945`；文件状态为 159 added、24 deleted、1,159 modified、2 renamed。
- 研究没有使用旧 `_UPDATE-SCOPE.md` 的目标 SHA 或旧结论，只把当前 `index.json` 当作待审计节点清单。

可复核命令：

```sh
git --git-dir=/Users/makii/Project/SOTA-Agent-LLM-Wiki/.git/modules/codex \
  merge-base --is-ancestor \
  4d7a5c7c7394b687ebcb67e634528b2b8c5578d9 \
  61a44880a85d2fd0d8770908dea5733495e571c8

git --git-dir=/Users/makii/Project/SOTA-Agent-LLM-Wiki/.git/modules/codex \
  diff --stat \
  4d7a5c7c7394b687ebcb67e634528b2b8c5578d9 \
  61a44880a85d2fd0d8770908dea5733495e571c8
```

## 2. 结论摘要

这不是只需机械更新 SHA/行号的增量。至少有六个必须按新架构重写的区域：

1. `ThreadStore` 从单 rollout 视角演进为 lineage + 多 segment + SQLite projection，并加入引用式分页 fork、进程内生命周期锁与跨进程单写者。
2. MCP 线程状态集中到 `McpRuntime`：sampling step 的 model-advertised catalog 与 tool-facing resource handlers 使用 frozen binding；ordinary MCP tool execution 会先 refresh 再取 call-time current binding，extension-facing resource discovery 则读取 latest runtime。
3. HTTP 出站层形成 route-aware client/factory/pool；system proxy 模式会在请求和每次 redirect hop 重新解析路由。
4. exec-server 新增 server→client `network/policyRequest`，把远端沙箱的网络策略判断闭环到 core approval。
5. Code Mode 新增独立 host、共享 remote WebSocket provider、握手/连接复用/fallback 配置。
6. extension/plugin/skills 层加入 Git attribution、Agent Plugins manifest、trusted script attribution、executor skill resource、catalog budget warning。

另有两项明确删除：

- `spawn_agents_on_csv`
- `report_agent_job_result`

以及一个已有但 Wiki 工具目录漏记的工具：

- `clock.curr_time`

## 3. 节点级影响清单

### 3.1 P0：必须做语义重审

- Thread persistence：`subsys.core.thread-store`、`subsys.core.rollout-persistence`、`subsys.core.state-db`、`rpc.thread-methods`、`rpc.turn-methods`、`rpc.notifications-thread`、`ref.data-model`、`ref.key-types`、`spine.context-and-compaction`。
- MCP：`subsys.mcp.client`、`subsys.mcp.connectors`、`subsys.mcp.name-qualification`、`spine.trace-mcp-call`、`spine.tool-call-anatomy`、三个 MCP resource tool 节点、`tool.mcp-namespace-tools`、`config.mcp-tools`。
- HTTP/network/exec-server：`subsys.providers.http-client`、`subsys.platform.network-proxy`、`subsys.exec-sandbox.exec-server`、`spine.shell-exec-flow`、`subsys.core.approval-policy`、`rpc.server-requests`。
- extensions/plugins/skills：`spine.extension-system`、`subsys.config-auth.plugins`、`subsys.config-auth.skills`、`subsys.config-auth.hooks`、`rpc.mcp-skills-plugin-methods`、`ref.protocol-items`。
- catalogs：`ref.feature-flags`、`ref.crate-index`、`ref.uncertainty`。
- 删除：`tool.spawn-agents-on-csv`、`tool.report-agent-job-result`。

### 3.2 P1：跨切面更新

- Code Mode：`tool.code-mode-exec`、`tool.code-mode-wait`、`subsys.core.tool-system`、`cli.subcommands`、`cli.global-flags`、`subsys.app-server.transport`、`subsys.app-server.session-management`。
- config：全部 8 个 `config.*` catalog 节点，以及 `subsys.config-auth.config-loading`、`subsys.config-auth.features-system`、`rpc.config-account-methods`。
- protocol/RPC：`rpc.overview`、`rpc.turn-methods`、`rpc.notifications-system`、`ref.protocol-op`、`ref.protocol-event-lifecycle`、`ref.protocol-event-streaming`、`ref.protocol-items`、`ref.session-tasks`。
- world state：`subsys.core.context-manager`、`subsys.core.instruction-assembly`、`subsys.core.collaboration-modes`、`spine.context-and-compaction`、`tool.tool-search`。
- sandbox：`subsys.exec-sandbox.file-system`、`subsys.exec-sandbox.sandbox-windows`、`subsys.exec-sandbox.process-hardening`。
- provider/surface：`tool.web-search`、`tool.image-generation`、`config.model-provider`、`subsys.platform.git-utils`、`subsys.platform.agent-identity`、`surface.cli.external-agent-import`。
- TUI：`command.session-thread`、`command.model-mode`、`subsys.tui.bottom-pane`、`subsys.tui.status-surfaces`、`subsys.tui.streaming-pipeline`、`subsys.tui.chatwidget`、`subsys.tui.rendering-theming`。

### 3.3 当前 172 节点的原始直接 source-path 映射审计

分类规则：

- A：frontmatter `source` 在目标树中失效。
- B：source 仍存在，但该节点的直接 source 总 churn ≥ 2,000 行。
- C：至少一个直接 source 被修改。
- D：直接 source 未变；仍可能被新路径或上游行为横切影响。

下列逐项清单保留机械 source-path 交集的可复现原始结果 `3 / 3 / 152 / 14`。最终 scope 另加入 node-level hunk 复核：共享 catalog source 中有两个命中与对应节点语义无关，因此规范化分级为 `3 / 3 / 150 / 16`。这里不为这两个 catalog-only 命中冒造 node id；最终验收以规范化数量为准。

| 分级 | 原始 source-path | 最终 node-level |
|---|---:|---:|
| A-BROKEN | 3 | 3 |
| B-HEAVY | 3 | 3 |
| C-DRIFT | 152 | 150 |
| D-CLEAN | 14 | 16 |

#### A — source 已失效（3）

- `tool.spawn-agents-on-csv`：三个 handler/spec source 均删除。
- `tool.report-agent-job-result`：handler/spec/state runtime source 均删除。
- `subsys.providers.http-client`：`codex-rs/http-client/src/default_client.rs` 重命名为 `client.rs`。

#### B — 重写级 churn（3）

- `spine.trace-mcp-call`：2,314 行。
- `subsys.core.thread-store`：2,150 行。
- `ref.glossary`：2,492 行。

#### C — 直接 source 被修改（152）

- spine：`spine.overview`、`spine.sq-eq-architecture`、`spine.process-lifecycle`、`spine.turn-end-to-end`、`spine.tool-call-anatomy`、`spine.context-and-compaction`、`spine.shell-exec-flow`、`spine.trace-apply-patch`、`spine.trace-subagent`、`spine.extension-system`。
- tool：`tool.exec-command`、`tool.write-stdin`、`tool.shell-command`、`tool.apply-patch`、`tool.view-image`、`tool.code-mode-exec`、`tool.code-mode-wait`、`tool.update-plan`、`tool.request-user-input`、`tool.request-permissions`、`tool.spawn-agent-v2`、`tool.send-message`、`tool.followup-task`、`tool.wait-agent-v2`、`tool.list-agents`、`tool.spawn-agent-v1`、`tool.send-input-v1`、`tool.wait-agent-v1`、`tool.close-agent-v1`、`tool.resume-agent-v1`、`tool.list-mcp-resources`、`tool.list-mcp-resource-templates`、`tool.read-mcp-resource`、`tool.tool-search`、`tool.web-search`、`tool.image-generation`、`tool.test-sync-tool`、`tool.mcp-namespace-tools`、`tool.dynamic-tools`、`tool.sleep`、`tool.new-context`、`tool.get-context-remaining`、`tool.interrupt-agent-v2`、`tool.list-available-plugins-to-install`、`tool.request-plugin-install`。
- command：`command.session-thread`、`command.model-mode`、`command.code-review`、`command.tools-integrations`、`command.config-system`、`command.realtime-debug`。
- cli：`cli.subcommands`、`cli.global-flags`、`cli.exec-mode`。
- config：`config.model-provider`、`config.approval-sandbox`、`config.auth-account`、`config.mcp-tools`、`config.agents-memory`、`config.ui-tui`、`config.skills-plugins-features`、`config.storage-telemetry-misc`。
- rpc：`rpc.overview`、`rpc.thread-methods`、`rpc.turn-methods`、`rpc.fs-command-methods`、`rpc.config-account-methods`、`rpc.mcp-skills-plugin-methods`、`rpc.notifications-thread`、`rpc.notifications-system`、`rpc.server-requests`。
- sdk：`sdk.ts-structured-output`。
- core：`subsys.core.tool-system`、`subsys.core.turn-engine`、`subsys.core.session-lifecycle`、`subsys.core.context-manager`、`subsys.core.instruction-assembly`、`subsys.core.compaction`、`subsys.core.memory`、`subsys.core.tool-router`、`subsys.core.unified-exec`、`subsys.core.approval-guardian`、`subsys.core.approval-policy`、`subsys.core.review-mode`、`subsys.core.realtime-conversation`、`subsys.core.collaboration-modes`、`subsys.core.ghost-undo`、`subsys.core.rollout-persistence`、`subsys.core.state-db`。
- exec/sandbox：`subsys.exec-sandbox.overview`、`subsys.exec-sandbox.exec-server`、`subsys.exec-sandbox.file-system`、`subsys.exec-sandbox.apply-patch-engine`、`subsys.exec-sandbox.sandbox-linux`、`subsys.exec-sandbox.sandbox-windows`、`subsys.exec-sandbox.shell-parsing`、`subsys.exec-sandbox.shell-escalation`、`subsys.exec-sandbox.arg0-dispatch`。
- MCP：`subsys.mcp.client`、`subsys.mcp.server`、`subsys.mcp.transports`、`subsys.mcp.oauth`、`subsys.mcp.name-qualification`、`subsys.mcp.connectors`。
- providers：`subsys.providers.overview`、`subsys.providers.provider-openai`、`subsys.providers.provider-bedrock`、`subsys.providers.provider-oss`、`subsys.providers.responses-api`、`subsys.providers.sse-streaming`、`subsys.providers.retry-errors`、`subsys.providers.auth-layer`、`subsys.providers.model-catalog`。
- TUI：`subsys.tui.architecture`、`subsys.tui.event-system`、`subsys.tui.streaming-pipeline`、`subsys.tui.chatwidget`、`subsys.tui.bottom-pane`、`subsys.tui.overlays-dialogs`、`subsys.tui.status-surfaces`、`subsys.tui.onboarding`、`subsys.tui.rendering-theming`。
- app-server：`subsys.app-server.message-processor`、`subsys.app-server.session-management`、`subsys.app-server.transport`、`subsys.app-server.client-libs`。
- config/auth：`subsys.config-auth.config-loading`、`subsys.config-auth.profiles`、`subsys.config-auth.auth-flows`、`subsys.config-auth.credential-storage`、`subsys.config-auth.hooks`、`subsys.config-auth.skills`、`subsys.config-auth.plugins`、`subsys.config-auth.features-system`。
- cloud/platform：`subsys.cloud.cloud-tasks`、`subsys.cloud.cloud-task-api`、`subsys.cloud.cloud-config`、`subsys.platform.git-utils`、`subsys.platform.analytics`、`subsys.platform.network-proxy`、`subsys.platform.agent-identity`。
- reference：`ref.protocol-op`、`ref.protocol-event-lifecycle`、`ref.protocol-event-streaming`、`ref.protocol-items`、`ref.session-tasks`、`ref.data-model`、`ref.key-types`、`ref.crate-index`、`ref.feature-flags`、`ref.env-vars`。
- 其他 surface：`surface.cli.external-agent-import`。

#### D — 直接 source 未变（14）

`sdk.ts-overview`、`sdk.ts-events-items`、`sdk.py-overview`、`sdk.py-inputs-errors`、`sdk.sdk-architecture`、`subsys.core.trace-bundle`、`subsys.exec-sandbox.execpolicy-dsl`、`subsys.exec-sandbox.sandbox-seatbelt`、`subsys.exec-sandbox.process-hardening`、`subsys.platform.file-search`、`subsys.platform.telemetry-otel`、`subsys.platform.terminal-detection`、`subsys.platform.realtime`、`ref.uncertainty`。

注意：`subsys.exec-sandbox.process-hardening` 虽是 D，Windows Job Object 的新行为来自它未列入 frontmatter 的 source，因此仍需语义复查。`ref.uncertainty` 也必须更新。

## 4. 删除、漏记与 inventory 调整

### 4.1 删除两个 agent job 工具

目标树已无 `spawn_agents_on_csv` 或 `report_agent_job_result` handler/spec。状态层新增 `codex-rs/state/migrations/0042_drop_agent_jobs.sql:1-2` 删除两张表。

兼容残留不是可用能力：

- `enable_fanout`/`Feature::SpawnCsv` 仍可被旧配置解析，但 stage 已是 `Removed`：`codex-rs/features/src/lib.rs:1094-1099 @ 61a44880a8`。
- `agents.job_max_runtime_seconds` 仍可反序列化，但明确是 no-op，且从 schema 隐藏：`codex-rs/config/src/config_toml.rs:698-700 @ 61a44880a8`。

更新动作：

- 删除两个工具 Markdown、`index.json` 节点、`llms.txt` 条目和相关关系。
- 更新 `subsys.core.tool-system`、`subsys.core.state-db`、`config.agents-memory`、`ref.feature-flags`。
- 不要把 Removed/no-op 写成“仍可启用”。

### 4.2 补齐漏记的 `clock.curr_time`

`CurrentTimeHandler` 在基线已存在，不是本差分新增，但当前 per-tool Wiki 没有对应节点：

- wire names：`clock.curr_time`：`codex-rs/core/src/tools/handlers/current_time.rs:22-24 @ 61a44880a8`。
- spec：同文件 `48-82`。
- handler：同文件 `84-105`。
- `Feature::CurrentTimeReminder` 开启时注册；`clock.sleep` 仍由子配置另行 gate：`codex-rs/core/src/tools/spec_plan.rs:765-779 @ 61a44880a8`。

建议新增 `tool.current-time`。若按“37 个现有节点 - 2 个删除 + 1 个漏记”重建 core tool catalog，目标计数是 36。

## 5. 结构性源码事实

### 5.1 ThreadStore：lineage、segment paging、fork 与 single-writer

核心模型：

- `RolloutLineageSegment`/`RolloutLineage` 跟随 `SessionMeta.history_base`；解析器检测 cycle、missing source、非 paginated source 和非法边界，并反转为逻辑 replay 顺序：`codex-rs/thread-store/src/local/rollout_lineage.rs:14-29,55-141 @ 61a44880a8`。
- turn paging 跨 segment 并由新 segment 去重 turn id；item 增量 paging 是另一条路径：`codex-rs/thread-store/src/local/thread_history/segment_paging.rs:41-174 @ 61a44880a8`。
- 引用式 fork 在 source lifecycle reservation 内持久化 source、解析 lineage、物化 SQLite projection，再按 `Latest`/`ThroughTurn`/`BeforeTurn` 建 child history/model context：`codex-rs/thread-store/src/local/paginated_fork.rs:15-40,47-156 @ 61a44880a8`。
- `history_mode`、`history_base`、fork boundary、prepared fork/model context 在 `codex-rs/thread-store/src/types.rs:97-106,181-229 @ 61a44880a8`。
- lifecycle lock 必须先于 writer lock；损坏/缺 header 时也保守加锁：`codex-rs/thread-store/src/local/mod.rs:72-158,253-286 @ 61a44880a8`。
- 跨进程 writer lock 使用 `.coordination.lock`，处理冲突、stale cleanup 和 Windows-safe release：`codex-rs/thread-store/src/local/writer_lock.rs:17-87,118-190 @ 61a44880a8`。

对外行为：

- app-server fork 改走 boundary/prepared fork；ephemeral paginated fork 要求 `excludeTurns: true`：`codex-rs/app-server/src/request_processors/thread_processor.rs:4013-4051,4163-4175 @ 61a44880a8`。
- `thread/metadata/update` 增 `isPinned`，`thread/list` 增 pinned filter，Thread response 增 `isPinned`：`codex-rs/app-server-protocol/src/protocol/v2/thread.rs:861-870,1120-1126`、`v2/thread_data.rs:170-188 @ 61a44880a8`。
- Paginated create/resume 的跨进程 active-writer conflict 经 session-init error 映射为 app-server Invalid Request `-32600`；`prepare_fork` 本身使用进程内 lifecycle reservation/writer mutex，不获取这把跨进程 writer file lock，不能把该 conflict 归到 fork preparation。

必须保留的不确定性：多 segment fork lineage 当前拒绝 incremental item replay，见 `segment_paging.rs:110-115`；不要写成所有分页模式都支持增量 item 重放。

### 5.2 MCP：step catalog binding 与 call-time authority

- 每个 thread 有一个 mutable `McpRuntime`，通过原子发布 immutable snapshot；旧 binding 的连接/config 生命周期不被新 refresh 改写：`codex-rs/codex-mcp/src/runtime.rs:49-86,162-225 @ 61a44880a8`。
- `McpBinding` 冻结 tool catalog、prepared-call map 与 exact clients；sampling step 捕获该 binding 来构建广告目录和 step-bound resource tools：`codex-rs/codex-mcp/src/binding.rs:29-37,78-159`、`codex-rs/core/src/session/mcp.rs:258-280 @ 61a44880a8`。
- 但 `McpHandler` 只保存 `ToolInfo/spec`，不保存 step binding 或 prepared call：`codex-rs/core/src/tools/handlers/mcp.rs:32-40,120-153 @ 61a44880a8`。
- ordinary MCP tool 真正执行时，`handle_mcp_tool_call` 先 refresh，再从 runtime 的 `current_binding()` 重新按 `(server, tool)` 取得 `PreparedMcpCall`；最新目录已删除该 tool 时直接返回 unavailable，approval metadata、config、plugin provenance 与 exact client 都来自这个 call-time binding：`codex-rs/core/src/mcp_tool_call.rs:143-169 @ 61a44880a8`。
- `PreparedMcpCall::call_with_preparation` 在 prepared call 建立后获取 catalog revision read guard：guard 获取前 revision 已变化则拒绝；匹配时在 guard 内完成不可逆参数准备与 exact-client send，使 replacement 等待发送结束。它保护的是 call-time prepare→send 窗口，不把 sampling-step binding 延长到执行时：`codex-rs/codex-mcp/src/binding.rs:246-273 @ 61a44880a8`。
- refresh 用 semaphore + dirty invalidation；取消时 guard 会重新置 dirty：`codex-rs/core/src/session/mcp_refresh.rs:7-53 @ 61a44880a8`。
- prewarm 是 bounded/coalescing best-effort；每个 model step 和 ordinary call 的 refresh path 才是正确性屏障：`codex-rs/core/src/session/mcp_prewarm.rs:1-60`、`codex-rs/core/src/session/mcp.rs:134-280 @ 61a44880a8`。

文档必须区分三种视图：

- model-advertised tools 与 tool-facing resource handlers：sampling-step frozen binding；
- ordinary MCP tool execution：执行前 refresh 后的 call-time current binding；
- extension/non-model discovery（例如 `McpResourceClient`）：每次读取 latest runtime。

建议现有 MCP 节点内统一术语，不再把 `McpConnectionManager` 写成线程状态的最终 authority。可选新增 `subsys.mcp.runtime-binding`；若不新增，`subsys.mcp.client` 必须承担完整模型。

### 5.3 HTTP client：factory、route-aware pool、redirect

失效路径修复：

- `codex-rs/http-client/src/default_client.rs` → `codex-rs/http-client/src/client.rs`。

新结构：

- fixed destination 用 `HttpClientFactory`，动态 URL 用 `RouteAwareClientPool`：`codex-rs/http-client/src/client.rs:20-28 @ 61a44880a8`。
- builder 只把 direct/transport-default 留给明确例外；普通调用应走 factory：`client_builder.rs:21-63,102-188`。
- outbound route 分 Auth/API/WebSocket/Other；system→env→direct：`outbound_proxy.rs:35-62,90-120,136-209,247-282`。
- pool 每个请求和 redirect hop 重新 resolve，按 resolved route 缓存 client，route/origin 变化时去除 proxy auth/敏感头，并共享总 timeout budget：`route_aware_client_pool.rs:33-46,389-566`。
- redirect 最多 10 次，跨 origin 去除 authorization/cookie，并按规则生成 Referer：`route_aware_redirect.rs:1-13,31,98-138`。

`respect_system_proxy` 仍是 under-development 且默认 false；不要写成所有请求默认都读取系统代理。

### 5.4 exec-server：双向网络策略回调

- 协议方法 `network/policyRequest` 支持 HTTP、HTTPS CONNECT、SOCKS5 TCP/UDP，结果为 Allow/Deny/Ask：`codex-rs/exec-server-protocol/src/network_policy.rs:6-47 @ 61a44880a8`。
- server request sender 最多 256 in-flight，带 pending map、timeout、trace 和 close cancellation：`codex-rs/exec-server/src/rpc_server_requests.rs:22-37,67-166`。
- invalid host、缺 controller、transport error、timeout 都 fail closed：`codex-rs/exec-server/src/network_policy_decisions.rs:24-93`。
- process 只有配置非零 callback timeout 时安装 decider，并把 process id/generation 与取消域绑定：`codex-rs/exec-server/src/local_process.rs:261-301`。
- core session 的 managed proxy 可回调 `NetworkApprovalService`：`codex-rs/core/src/session/session.rs:980-1026,1185-1188`、`core/src/tools/network_approval.rs:1042-1057`。

安全表述：

- wire 能表达 `Ask`，不代表所有 runtime/UI 都一定弹窗。
- `approval_policy == Never`、非 Managed permission profile 等条件会压缩为最终 deny/ask 行为。

Windows 同时新增：

- exec-server 直接准备 restricted/elevated Windows sandbox，无法 enforce intent 时拒绝：`codex-rs/exec-server/src/process_sandbox.rs:39-130,175-292`。
- network proxy 通过 restricting SID 路由 loopback ingress；TCP attribution 当前仅 IPv4：`codex-rs/network-proxy/src/windows_proxy_ingress.rs:25-150`、`windows_tcp_attribution.rs:35-150`。
- PTY Job Object 支持 kill-on-close，并能在正常退出保留 descendants：`codex-rs/utils/pty/src/win/job.rs:16-43,62-115`。

### 5.5 Code Mode：独立 host 与 remote WebSocket

- `code-mode-host` 支持 stdio 和 binary framed WebSocket，暴露 `/readyz`，限制 frame/message，并拒绝带 Origin 的升级请求：`codex-rs/code-mode-host/src/transport.rs:42-64,79-129,133-228 @ 61a44880a8`。
- app-server 新增 `--code-mode-host WS_URL`；只接受带 host 的 `ws://`/`wss://` 且拒绝 fragment：`codex-rs/app-server/src/code_mode_host.rs:4-43`。
- Local 模式拥有一个 process-scoped host；remote 模式复用共享 WebSocket：`codex-rs/code-mode/src/remote_session.rs:38-147,158-218`。
- local standalone binary 缺失时默认回退 embedded V8；`features.code_mode_host.disable_in_process_fallback` 可禁回退：`codex-rs/features/src/feature_configs.rs:32-50`。
- `code_mode_buffered_exec` 开启时默认初次 yield 由 10 秒变 30 秒：`codex-rs/core/src/tools/code_mode/mod.rs:54-63,103-110`。

强烈建议新增 `subsys.core.code-mode-runtime`，覆盖 host/provider、embedded fallback、remote handshake、共享连接、proxy/TLS 与安全边界。当前两个 tool 节点只描述 tool contract，不足以承载这一架构。

不确定性：

- host listener 接受 `ws://IP`，client 可连 `ws/wss`。
- 所审 host transport 未提供可据以宣称“应用层已认证”的证据；不要把 Origin rejection 写成完整认证。
- `--code-mode-host` 是 app-server runtime 入口，不是所有 CLI mode 的通用 remote flag。

### 5.6 World state：multi-agent 与 deferred tool namespaces

- 新 `MultiAgentModeState` 用稳定 section id `multi_agent_mode`；custom hint 上限 400 tokens，模式变化才渲染 diff：`codex-rs/core/src/context/world_state/multi_agent_mode.rs:11-75 @ 61a44880a8`。
- 新 `ToolsState` 用 `<tools>` fragment 表示 deferred namespaces；支持 added/removed diff、4 KiB 总上限、描述截断：`codex-rs/core/src/context/world_state/tools.rs:11-103,106-160`。
- `DeferredToolWorldState` flag 开启时才加入 tools section；multi-agent mode section 在 extension contributions 后加入：`codex-rs/core/src/session/world_state.rs:109-145`。
- `Op::Turn` 上的旧 `multi_agent_mode` 只保留 legacy 兼容，不再是新 world-state authority。

建议更新 instruction/context/tool-search/collaboration 节点。若新增节点预算允许，`subsys.core.world-state` 比把这些机制零散写进 instruction assembly 更清晰。

### 5.7 Extensions、Git attribution、Agent Plugins 与 skills

Git attribution 是新的 production crate：

- extension 根据 workspace/user/backend policy 安装：`codex-rs/ext/git-attribution/src/lib.rs:24-108 @ 61a44880a8`。
- policy 调后端 user settings，5 秒 timeout，失败 30 秒后重试，并按 auth generation 失效：`policy.rs:46-101`。
- enabled world state 注入 commit trailer 和 PR “Generated with Codex.” 指令；disabled/transition 也有显式 diff：`world_state.rs:6-64`。
- app-server registry 安装它：`codex-rs/app-server/src/extensions.rs:71-116`。

Agent Plugins：

- root manifest 可声明默认 `./skills`、`./mcp.json`，并叠加 `extensions.com.openai` 或 `.codex-plugin/plugin.json` overlay：`codex-rs/core-plugins/src/agent_plugin_manifest.rs:16-28,63-196`、`core-plugins/src/manifest.rs:144-173`。
- trusted script attribution 只接受可信 remote cache、simple exact command、真实单 root 文件，拒绝 shell complexity 和 symlink escape：`core-plugins/src/script_attribution.rs:28-169`。
- `CommandExecutionItem` 与 begin/end event 增 `plugin_id`、`script_path`：`codex-rs/protocol/src/items.rs:183-209`、`protocol.rs:3508-3553`。

Skills：

- model-visible metadata budget 取 context window 的 2%，上限 4,000 tokens；无 window 时 8,000 chars。先缩描述，再移除描述，最后才 omission，并发 warning：`codex-rs/ext/skills/src/render.rs:18-30,32-150,307-478`。
- `skills.list/read` 新支持 Executor authority；explicit executor skill 可不进入常驻 prompt，但通过 resource access 读取：`ext/skills/src/tools/mod.rs:38-170`、`provider/executor.rs:30-158,210-293`。
- `skills.list` 每页最多 20，response 最多 512 KiB；`skills.read` 也分页且限制 512 KiB：`ext/skills/src/tools/list.rs:30-140`、`read.rs:26-184`。
- extension warning 限 256 bytes，优先进当前 listener FIFO；无 listener 时最多等 subscriber 10 秒：`codex-rs/app-server/src/extensions.rs:129-157,200-253`。

`dynamic_skill_selector` 仍是 shadow-only；不要写成 production 已自动选择 skill。

可选新增 `subsys.platform.git-attribution`。若不新增，至少深改 `spine.extension-system` 与 `subsys.platform.git-utils`，并让相关关系能定位到新 crate。

## 6. 对外协议与行为

### 6.1 app-server RPC

唯一新增 method：

- `externalAgentConfig/import/recordHistory`：`codex-rs/app-server-protocol/src/protocol/common.rs:1158-1161 @ 61a44880a8`。
- 参数/response/history provider：`protocol/v2/config.rs:801-826`。

其他 shape 变化：

- external detect 新增 `maxSessionAgeDays`、`maxSessions`，legacy `source` ignored；import 增 analytics-only `providerId`：`v2/config.rs:722-759`。
- config write 新 error `configRequirementReadonly`，requirements surface 扩展 browser/sqliteHome/logDir/modelCatalog/check-update/login-shell/feedback/private-desktop：`v2/config.rs:339-445`。
- `plugin/list.forceRefetch`：`v2/plugin.rs:129-140`。
- plugin share response/context 增 `canPublishToWorkspace`；skill interface 增 remote icon URLs；hook metadata 增 `additionalContextLimit`：`v2/plugin.rs:251-258,442-457,519-533,652-668`。
- app metadata/tool summary 增 dark icon、distribution/install URL、plugin display names、enabled/disabled reason/read-only；删除 experimental `firstPartyType`。
- realtime start 新 experimental `codexResponseHandoffChannelPrefixes`，只用于 Frameless Bidi；Realtime V1/V2 忽略：`v2/realtime.rs:68-100`。
- successful `turn/completed` 有最终 agent message 时返回单个 summary item；无最终 message 则为空且 `itemsView=notLoaded`。canonical item 流仍由 `item/*` 提供：`codex-rs/app-server/src/bespoke_event_handling.rs:1261-1295,1470-1488`。

计数应从 `common.rs` 宏定义重算：

- baseline：129 client requests + 72 notifications + 11 server requests = 212。
- target：130 + 72 + 11 = 213。

不要用生成 JSON schema 的 `oneOf` 长度代替 source macro inventory；实验/legacy export 策略会使其少计。

### 6.2 core protocol

- `Op::RefreshMcpServers` 从携带 config 的 struct variant 变成 unit variant；`McpServerRefreshConfig` 删除。
- `ReviewDecision::Denied` 从 bare `"denied"` 变成带 `rejection` 的 externally tagged object：`codex-rs/protocol/src/protocol.rs:4094-4120`。legacy v1 exec/apply approval response 直接引用它：`app-server-protocol/src/protocol/v1.rs:146-170`。这是 legacy v1 wire breaking change，不要混写成 v2 decision 变化。
- `UserMessageEvent` 保存 remote/local audio 并用 `[Audio]` 生成 preview：`protocol.rs:2325-2376`。
- response item id 现在无条件补齐；旧 `item_ids` flag 已 `Removed` 且 default true。
- `ItemCompletedEvent` 增 core 层 `started_at_ms`。不要误写成 v2 `ItemCompletedNotification.startedAt`；目标通知仍只有 `completedAt`。
- `CommandExecutionItem`/exec begin/end 增 plugin attribution。
- `ReviewDecision::Denied` 默认 helper 会提供 `"denied"` rejection 文本。

`Op` catalog 仍为 26，`EventMsg` 仍为 80；要更新 payload/字段与引用，不要改计数。

### 6.3 config schema

递归 property path 审计：774 → 792。主要新增：

- `features.code_mode_buffered_exec`
- `features.mcp_2026_07_28`
- `features.deferred_tool_world_state`
- `features.guardianv2`
- `features.code_mode_host.{enabled,disable_in_process_fallback}`
- `features.non_prefixed_mcp_tool_names.{enabled,server_names}`
- `features.multi_agent_v2.wait_agent_enabled`
- `tools.update_plan.enabled`
- `shell_environment_policy.filters`
- `hooks.*.additionalContextLimit`
- `model_providers.*.supports_standalone_web_search`
- `tui.keymap.toggle_side_conversation`

移出 schema：

- `agents.job_max_runtime_seconds`，但仍是反序列化兼容 no-op。

关键语义：

- `tools.update_plan.enabled` 默认 true：`codex-rs/config/src/config_toml.rs:630-654`。
- `multi_agent_v2.wait_agent_enabled` 可单独禁用 wait；MultiAgentV2 已 Stable，但 default false。
- MCP 可按 server 选择是否去前缀；feature 仍 under-development/default false。
- shell `filters = {pattern = "include|exclude"}` 按 key 跨 layer case-insensitive merge；与 legacy include/exclude arrays 混用会拒绝：`codex-rs/config/src/shell_environment_policy.rs:12-38,92-168`。
- hook `additionalContextLimit` 默认 2,500 tokens，0 禁止 spill；超限完整内容写 thread/temp 路径，模型只见 head/tail 和恢复路径。
- custom provider 的 `supports_standalone_web_search` 默认 false；web search 仍要求 search enabled 和 OpenAI/actor-auth/显式 opt-in。

### 6.4 TUI/CLI

- `codex app-server --code-mode-host WS_URL` 与 app-server `--listen` 是独立参数。
- `/new <name>`、`/clear <name>` 可给新 thread 命名：`codex-rs/tui/src/chatwidget/slash_dispatch.rs:728-736`。
- side conversation 可持久切换；切换 parent/side 不销毁另一侧：`tui/src/app/input.rs:143-156`、`tui/src/app/side.rs:384-405`。
- live command output 超 1 MiB 后保留首尾各 50 行并插 omission marker：`tui/src/exec_cell/live_output.rs:5-17,141-157`。
- Max/Ultra composer ignition 和 status-line transition 是 one-shot、33ms tick，并在低色彩/禁 motion 时跳过：`tui/src/bottom_pane/effort_ignition.rs:1-11,44-93,214-249`、`effort_status_line.rs:1-12,33-97`。

slash command instance count仍为 55；CLI grouped catalog 仍为 47。只更新行为/flag，不改这两个计数。

### 6.5 image generation

- Free plan 不暴露 image generation tool：`codex-rs/core/src/tools/spec_plan.rs:363-394`。
- artifact path/hint 归 extension 所有，路径为 `generated_images/<session>/<call>.png`；hint 明确告诉模型图已展示、无需 final 重复渲染：`codex-rs/ext/image-generation/src/artifact.rs:5-45`。
- tool 仍发 extension item + legacy begin/end event，并使用 executor filesystem 保存：`ext/image-generation/src/tool.rs:93-225`。

更新 `tool.image-generation`、extension system、history/context 对图像的说明。

## 7. Catalog 计数

| Catalog | baseline | target | 说明 |
|---|---:|---:|---|
| Wiki nodes | 172 | 取决于新增节点 | 删除 2 个 agent jobs；强建议新增 `tool.current-time` 与 `subsys.core.code-mode-runtime`，则仍为 172 |
| core tools | 37 | 36 | 现有 37 - 删除 2 + 补漏 `clock.curr_time` |
| slash commands | 55 | 55 | `/new`/`/clear` 参数行为变，variant 数不变 |
| CLI grouped catalog | 47 | 47 | 新 app-server scoped flag，既有计数口径不变 |
| app-server RPC | 212 | 213 | 130 client requests + 72 notifications + 11 server requests |
| protocol `Op` | 26 | 26 | shape 变化，无 variant 增删 |
| protocol `EventMsg` | 80 | 80 | payload 变化，无 variant 增删 |
| feature flags | 95 | 99 | target：Stable 32 / UnderDevelopment 30 / Experimental 1 / Deprecated 3 / Removed 32 / platform-conditional 1 |
| workspace members | 124 | 126 | 新 `ext/git-attribution` 与 `exec-server/tests/support` |

新增 feature：

- `code_mode_buffered_exec`
- `mcp_2026_07_28`
- `deferred_tool_world_state`
- `guardianv2`

stage 变化：

- `multi_agent_v2`：UnderDevelopment → Stable。
- `enable_fanout`/SpawnCsv：UnderDevelopment → Removed。
- `item_ids`：UnderDevelopment → Removed，且 default true 作为兼容。

## 8. 引用与行号审计

对 superproject `HEAD` 中 172 个节点做了基线 source-line 到目标源码的 exact-line triage：

- 总 `[E:path:line]` 引用：21,067。
- 至少一条同号行不再匹配的节点：156。
- 同号行仍相同：10,281。
- 基线行文本可在目标文件其他行找到：10,188。
- 基线行文本在目标文件找不到：376。
- 目标 source 文件已删除：159。
- line 超目标 EOF：63。

最高风险：

| 节点 | deleted-path refs | out-of-range | changed text | moved |
|---|---:|---:|---:|---:|
| `tool.spawn-agents-on-csv` | 78 | 0 | 5 | 0 |
| `tool.report-agent-job-result` | 58 | 0 | 6 | 0 |
| `subsys.providers.http-client` | 23 | 0 | 4 | 58 |
| `subsys.core.compaction` | 0 | 0 | 39 | 141 |
| `subsys.mcp.client` | 0 | 18 | 14 | 32 |
| `subsys.config-auth.skills` | 0 | 6 | 20 | 72 |
| `subsys.core.state-db` | 0 | 6 | 16 | 68 |
| `spine.trace-mcp-call` | 0 | 3 | 18 | 45 |
| `subsys.core.context-manager` | 0 | 2 | 13 | 141 |
| `subsys.exec-sandbox.exec-server` | 0 | 0 | 15 | 150 |

“moved”只是高置信机械 re-anchor 候选，不等于引用语义仍成立；重复行也可能使 exact search 选错位置。每个节点仍应按 L2 证伪流程：

1. 先重新验证段落主张。
2. 再选择最窄、最直接的新证据。
3. 最后更新行号与 source frontmatter。

禁止只做全局行号平移。

## 9. 建议新增节点

### 强建议

1. `tool.current-time`
   - 原因：当前 per-tool inventory 漏记真实注册工具；这是基线缺口，非本差分新增。
2. `subsys.core.code-mode-runtime`
   - 原因：独立/embedded/remote host、provider、handshake、fallback、共享连接与安全边界已经是独立深模块，两个 tool contract 页面无法承载。

### 可选

- `subsys.platform.git-attribution`
  - 若不新增，必须由 `spine.extension-system` + `subsys.platform.git-utils` 完整覆盖 policy fetch、auth-generation cache、world-state transition 与 commit/PR 指令。
- `subsys.mcp.runtime-binding`
  - 若不新增，由 `subsys.mcp.client` 统一说明 mutable runtime、immutable binding、prepared call、latest discovery。
- `subsys.core.world-state`
  - 若不新增，由 context manager/instruction assembly 明确维护 typed sections、snapshot/diff/merge-patch、extension sections。

不要为了新文件数量机械拆节点；只有当现有 authority 无法自包含回答模块问题时才新增。

## 10. 必须写入 `ref.uncertainty` 的事项

1. multi-segment lineage 不支持 incremental item replay。
2. `respect_system_proxy` under-development/default false。
3. exec-server wire 的 `Ask` 受 approval policy/permission profile/UI 能力限制。
4. Windows TCP attribution 当前 IPv4-only。
5. remote code-mode host 的 listener/client scheme 不对称；没有足够证据宣称应用层认证。
6. dynamic skill selector 仍 shadow-only。
7. remote plugin disk cache 的源码注释称其是迁移期机制，不能写成长期稳定契约。
8. legacy v1 `ReviewDecision::Denied` wire breaking；与 v2 approval decision 分开。
9. `ItemCompletedEvent.started_at_ms` 不等于 v2 `ItemCompletedNotification.startedAt`。
10. `agents.job_max_runtime_seconds` 和 `enable_fanout` 只是兼容 no-op/Removed，不是活能力。
11. `firstPartyType` 是 experimental app metadata 字段删除。
12. `clock.curr_time` 是基线已存在的 inventory 漏项，不应被描述为 `61a44880` 新功能。

## 11. 推荐更新顺序

1. 先更新 submodule gitlink到目标 SHA，但不修改子模块内容。
2. 删除两个 agent job 节点，新增 `tool.current-time`；决定是否新增 Code Mode runtime 节点。
3. 重写 ThreadStore、MCP、HTTP/exec-server、extension/plugins/skills 四组 P0。
4. 更新 protocol/RPC/config catalog 与精确 instance counts。
5. 更新 TUI/CLI/image/provider 等对外行为。
6. 批量 re-anchor 仅移动引用，再逐项 L2 复核 changed/out-of-range 引用。
7. 更新所有受影响 frontmatter `source`、`symbols`、`related`、`updated`，同步 `index.json`、`llms.txt`、README 计数。
8. 更新 `_UPDATE-SCOPE.md` 和 `ref.uncertainty`。
9. 跑 reconcile、lint、全仓 source/line/SHA 一致性检查；确认没有引用目标树不存在的路径。

## 12. 最终 L2 独立证伪矩阵

本矩阵基于最终工作树与目标源码 `61a44880a85d2fd0d8770908dea5733495e571c8`，不复用 Wiki 正文作为事实来源。`PASS` 表示针对代表性反例复核后未发现未处理的语义冲突；“修正后 PASS”表示 L2 曾找到反例，主任务已按源码修正并再次复核。

| 领域 / 节点 | L2 结果 | 证伪结论、修正与推断边界 |
|---|---|---|
| World State：`subsys.core.context-manager` | 修正后 PASS | 证伪了“`build_settings_update_items` 仍处理 multi-agent mode”：目标实现只合并 model switch 与 personality；multi-agent 已由独立 typed section 在每 step 构造。history normalization 的动机性解释保留为 `[I]`。 |
| World State：`subsys.core.collaboration-modes` | PASS | collaboration mode 与 multi-agent mode 的 snapshot、diff、fallback 及 tool gate 边界与源码一致。Plan template 不是全局 filesystem write lock 的结论是 `[I]`。 |
| World State：`tool.tool-search` | PASS | `DeferredToolWorldState` 只提示 deferred namespace 及 added/removed diff，不代表具体 tool spec 已被加载；BM25 search、provider/namespace gates 与 parallel 标记通过。该提示面与加载面的边界解释属于 `[I]`。 |
| Skills：`subsys.config-auth.skills` | PASS | roots、并发扫描、catalog budget、`skills.list/read` 分页与 executor provider 通过。root `plugin.json` 有 parser 但默认 discovery allow-list 未接线，保留 `[U]`。 |
| Plugins / extensions：`subsys.config-auth.plugins`、`spine.extension-system` | 修正后 PASS | 证伪了“Agent Plugins root manifest 已默认自动发现”；当前默认只枚举 `.codex-plugin`、`.claude-plugin`、`.cursor-plugin`。Rust contributor registry 与安装型 manifest 是不同层次；其它上游是否显式传入 root path 保留 `[U]`。 |
| Process：`subsys.exec-sandbox.process-hardening` | PASS | pre-main hardening 与 Windows PTY `JobObject` 的职责、kill-on-close、preserve/terminate mutex 及 non-retroactive assignment 通过。loader-env 风险动机标为 `[I]`，未把 Windows pre-main no-op 推广成 child cleanup 无保护。 |
| Image：`tool.image-generation` | 修正后 PASS | 证伪旧 hosted `ToolSpec::ImageGeneration` 描述；当前是 `image_gen.imagegen` extension namespace tool，并受 feature、auth/account plan、provider、image modality 与 namespace gates 共同控制。与 baseline 的删除比较标为 `[I]`。 |
| Plan：`tool.update-plan` | 修正后 PASS | 补正 `tools.update_plan.enabled` 默认 true、可独立关闭的 config gate；Plan mode runtime 拒绝通过。默认 exposure/parallel 及“最多一个 in-progress 仅为描述、无额外 handler 校验”均明确标为 `[I]`。 |
| Multi-agent：`tool.wait-agent-v2` | 修正后 PASS | 补正 `multi_agent_v2.wait_agent_enabled` 独立 sub-gate；timeout、pending activity、mailbox/steer/timeout summaries 与空 agent-content 输出通过。 |
| Code Mode：`subsys.core.code-mode-runtime` | 修正后 PASS | 修正失效 host source 路径并补 frame/message limit 证据；in-process/local/remote provider、handshake、共享连接与 fallback 通过。listener 未声明应用层 bearer/token auth、`ws` listener 与 `wss` client 的 TLS 部署边界保留 `[U]`。 |
| MCP：`subsys.mcp.client`、`spine.trace-mcp-call`、`tool.mcp-namespace-tools` | 修正后 PASS | 证伪并修正“sampling-step binding 贯穿 ordinary call”：广告目录与 tool-facing resources 使用 step binding；ordinary call 先 refresh，再取 call-time current binding；revision guard 只保护 prepare→exact send；extension discovery follow latest。prewarm 只是 bounded best-effort，保留 `[U]`。 |
| Thread：`subsys.core.thread-store`、`rpc.thread-methods` | 修正后 PASS | 证伪 fork preparation 会触发跨进程 active-writer conflict；该冲突出现在 paginated create/resume，fork prepare 使用进程内 lifecycle reservation/writer mutex。lineage boundary、pinning 与 projection 通过；multi-segment incremental item replay 保留 `[U]`。 |
| HTTP：`subsys.providers.http-client` | 修正后 PASS | route-aware pool、system URL-decision cache、manual redirect、non-replayable response、PAC 单 route/no failover 均通过。`RespectSystemProxy` 的 feature/platform rollout 与默认启用面保留 `[U]`。 |
| Exec/network：`subsys.exec-sandbox.exec-server`、`rpc.server-requests` | 修正后 PASS | 证伪“所有 callback failure 都由 client 主动 Deny”：可响应路径会 Deny/error，connection/session/client drop 与 server timeout 负责其它 fail-closed 场景。`Ask` 是否最终有可用 UI、Windows TCP attribution 的 IPv6 行为保留 `[U]`。 |
| Tool inventory：`subsys.core.tool-system`、`tool.current-time` | 修正后 PASS | 证伪把 image generation 当 hosted tool；agent-job 两工具退役通过。`clock.curr_time` 是 baseline 已存在的 Wiki inventory 漏项，不是目标差分新增；该归因是基于 base/target 比较的 `[I]`。 |
| Approval / shell：`subsys.core.approval-policy`、`spine.shell-exec-flow` | 修正后 PASS | 证伪 dangerous/Windows legacy unmatched 在 unrestricted filesystem 下会放行：`Never` 为 Forbidden，其它 policy 进入 Prompt。`ApprovalKey.cwd` 的 `PathUri` 事实通过，跨 executor/host identity 的设计含义保留 `[I]`。 |
| App-Server overview：`rpc.overview` | 修正后 PASS | 130/72/11 catalog 计数通过；修正“所有 request variant 都显式声明 wire string”为仅 `ClientRequest`，两个 legacy v1 `ServerRequest` 仍依赖 camelCase 默认名。 |
| App-Server config/plugin/notifications：`rpc.config-account-methods`、`rpc.mcp-skills-plugin-methods`、`rpc.notifications-thread` | 修正后 PASS | 补正 `ConfigRequirements` baseline-vs-new 字段；`plugin/list.forceRefetch` 同时影响匹配的 local cache 与实际发起的 remote catalog fetch；successful `turn/completed` summary item 与 canonical item stream 的边界通过。 |

本轮明确证伪并完成修正的错误模式包括：MCP 全步冻结、hosted image generation、fork active-writer conflict、dangerous unmatched 的 unrestricted 放行、Agent Plugins root 自动 discovery、network callback 一律由 client Deny、`forceRefetch` 仅 remote、所有 ServerRequest 显式 wire name、以及 settings builder 仍处理 multi-agent mode。

### 12.1 定向一致性检查

- 复核 27 个高风险/新增/重写节点。
- 校验 274 个 frontmatter source：全部在目标 submodule 中存在。
- 校验 3,076 个 `[E: path:line]`：source 全部存在，line 均在目标文件 EOF 内。
- 27 个节点 `updated` 均为 `61a44880a8`。
- 本研究记录只保留原始 source-path 清单 `3 / 3 / 152 / 14` 作为可复现机械结果；最终 node-level 规范化分级明确为 `3 / 3 / 150 / 16`。
