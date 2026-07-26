# UPDATE SCOPE — Codex Wiki 完成记录（4d7a5c7c73 → 61a44880a8）

> 完成日期：2026-07-26
> Wiki verified base：`4d7a5c7c7394b687ebcb67e634528b2b8c5578d9`
> 官方 `openai/codex origin/main` target：`61a44880a85d2fd0d8770908dea5733495e571c8`
> 最终 submodule checkout：detached `61a44880a85d2fd0d8770908dea5733495e571c8`

本文件记录本轮已经执行的影响分析、节点取舍、L2 证伪与验证结果。方法约束仍以 `RUN.md` 和 `conventions.md` 为准。

## 1. 源码跨度

```text
275 commits
1344 files changed
78779 insertions(+)
29945 deletions(-)
159 added / 24 deleted / 1159 modified / 2 renamed
```

复现：

```bash
git -C codex rev-list --count 4d7a5c7c7394b687ebcb67e634528b2b8c5578d9..61a44880a85d2fd0d8770908dea5733495e571c8
git -C codex diff --shortstat 4d7a5c7c7394b687ebcb67e634528b2b8c5578d9..61a44880a85d2fd0d8770908dea5733495e571c8
git -C codex diff --name-status 4d7a5c7c7394b687ebcb67e634528b2b8c5578d9..61a44880a85d2fd0d8770908dea5733495e571c8
```

## 2. 172 个基线节点的影响分级

分级以基线 `index.json` 的 source 集合与目标树的 `git diff --numstat`、删除状态交叉计算，再按源码事实复核：

| 分级 | 数量 | 处理 |
|---|---:|---|
| A-BROKEN | 3 | source 删除或重命名，必须退役或重定位 |
| B-HEAVY | 3 | 直接 source churn ≥ 2,000 行，整页重读 |
| C-DRIFT | 150 | 至少一个直接 source 改动且命中节点语义，逐 claim 修复 |
| D-CLEAN | 16 | source 未变，或共享 catalog source 的 hunk 经复核与该节点无关；快速复核并统一 SHA |

A-BROKEN：

1. `tool.spawn-agents-on-csv`：agent-jobs spec/handler 已删除。
2. `tool.report-agent-job-result`：agent-jobs handler/state runtime 已删除。
3. `subsys.providers.http-client`：旧 `default_client.rs` 重命名/重构到 route-aware client 结构，节点保留并重写 source 与行为。

B-HEAVY：

1. `ref.glossary`
2. `spine.trace-mcp-call`
3. `subsys.core.thread-store`

D-CLEAN 只允许省略逐段语义重写，不允许跳过目标 SHA、source existence、引用和横切架构检查。`subsys.exec-sandbox.process-hardening` 虽直接 source clean，但 Windows PTY Job Object 是相邻新增行为，因此仍扩写并走 L2。SDK、trace-bundle、execpolicy、Seatbelt、file-search、telemetry、terminal detection、realtime 等 clean 节点执行了 source/引用抽样。

原始 source-path 交集会得到 `3 / 3 / 152 / 14`；其中两个命中来自共享 catalog source 的无关 hunk。加入 node-level hunk 复核后的最终分级是本节采用的 `3 / 3 / 150 / 16`，避免把“同文件有改动”机械等同于“节点语义漂移”。

## 3. Inventory 变化

### 退役节点

- `tool.spawn-agents-on-csv`
- `tool.report-agent-job-result`

目标源码同时以 state migration 0042 删除 `agent_jobs` 与 `agent_job_items`；`agents.job_max_runtime_seconds` 只剩兼容 no-op，未被误写为仍可用能力。

### 新增节点

- `tool.current-time` → `surface/tools/current-time.md`
  - `clock.curr_time` 在 base 已存在，是旧 Wiki inventory 漏项，不归因成目标提交新增。
- `subsys.core.code-mode-runtime` → `subsystems/core/code-mode-runtime.md`
  - 自包含覆盖 in-process/local host、app-server remote WebSocket host、handshake、共享连接、fallback 与 transport 边界。

最终仍为 172 个 verified nodes：

| Tier | 数量 |
|---|---:|
| T0 | 11 |
| T1 | 69 |
| T2 | 80 |
| T3 | 12 |

其中 tool nodes 为 36；workspace members 为 126；App-Server catalog 为 213（130 client requests + 72 notifications + 11 server requests）。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 承载节点与结论 |
|---|---|
| Remote Code Mode host | 新建 `subsys.core.code-mode-runtime`，并更新 `subsys.app-server.transport`、`cli.subcommands`、`ref.glossary`；区分 app-server inbound listener 与 outbound code-host connection，记录 `ws`/`wss`、Origin 拒绝、frame limit 和 fallback。 |
| MCP runtime/connection refresh/resource clients | 重写 `subsys.mcp.client`、`spine.trace-mcp-call`、`tool.mcp-namespace-tools` 和三个 resource tool 节点；区分 per-step binding、call-time refresh/current binding、prepared-call revision guard 与 latest resource client。 |
| agent_jobs 整套移除 | 删除两个工具节点；更新 tool system、router、state DB、agents config、index 与 llms。 |
| paginated thread fork/single writer | 重写 `subsys.core.thread-store`，扩写 `rpc.thread-methods`、session/rollout/context；区分 paginated cross-process writer lock、fork 的进程内 prepare lease 和 lineage boundary。 |
| Agent Plugins manifest | 扩写 plugins、skills、extension system 与 plugin RPC；root `plugin.json` 有 parser，但默认 discovery allow-list 尚未接线，保留 `[U]`。 |
| persisted thread pinning | thread metadata/list/response、thread store 与 glossary 均记录 `isPinned`。 |
| PathUri approval key | 更新 shell flow、approval policy 与 key types；cwd cache key 使用 `PathUri`，跨 host identity 的含义仅标 `[I]`。 |
| exec-server network callbacks | 扩写 exec-server/network policy；覆盖 HTTP、CONNECT、SOCKS5 TCP/UDP 的 Allow/Deny/Ask、callback timeout、disconnect/cancel recovery 与 fail-closed 边界。 |

其它重要更新：

- World State 新增 `multi_agent_mode` 与 deferred `tools` sections，分别承载 delegation policy 与 namespace diff。
- HTTP client 改为 route-aware pool，补 system-proxy cache、PAC 单 route、manual redirect/replayability 边界。
- skills extension 增 catalog budget、`skills.list`/`skills.read` pagination 与 executor resource provider。
- Git attribution 进入 extension registry、commit/PR marker 与 auth-generation cache。
- image generation 对 Free plan 隐藏，artifact path/hint 归 extension。
- `tools.update_plan.enabled` 与 `multi_agent_v2.wait_agent_enabled` 可独立关闭对应工具。
- App-Server 新增 `externalAgentConfig/import/recordHistory`、notification envelope timestamp、thread pinning、plugin/app 字段和 successful `turn/completed` summary item。
- TUI 增命名 `/new`/`/clear`、side-conversation persistence、1 MiB live-output head/tail truncation。
- protocol `Op`/`EventMsg` 数量保持 26/80，但 payload/字段与引用已更新。

## 5. L2 独立证伪

结构性与语义改动节点均由独立 agent 对目标源码复核；L2 不复用节点正文作为证据。发现反例后先修 Wiki，再复核：

| 领域 | 重点节点 | L2 结论与已修反例 |
|---|---|---|
| MCP | client、trace、namespace/resource tools | 修正“step binding 贯穿调用”的错误；实际 ordinary call 先 refresh，再取 current binding，revision guard 只覆盖 prepared-call 到 exact send。 |
| Thread | thread-store、thread methods | 修正 legacy thread 也有跨进程 lock 的误写；writer lock 仅 paginated live writer。修正 fork 会抛 cross-process writer conflict 的误写。 |
| HTTP | http-client | 补全 global system-proxy cache TTL/cap、non-replayable redirect 返回原 response、PAC 候选不 fail over。 |
| Exec/network | exec-server | 修正 client recovery 的适用面：能响应的 callback Deny/error；connection cancellation 等场景由 server timeout/fail closed。 |
| Approval/PathUri | shell flow、approval policy | PathUri key 通过；修正 dangerous/Windows legacy unmatched + `Never` 为 Forbidden，不因 disabled/external sandbox 放行。 |
| Code Mode | new runtime、transport、CLI | 修正 protocol source path，补 frame/message size evidence；认证能力保留 `[U]`，不从 Origin filter 推断。 |
| Plugins/skills | plugins、skills、extension system、plugin RPC | 修正 Agent Plugins 默认 discovery 已接线的误写；补 name 首尾规则、local+remote force-refetch、share/icon/hook fields。 |
| App-Server/protocol | overview、thread/config/plugin methods、notifications、server requests | 130/72/11 计数通过；修正 ClientRequest 与 ServerRequest wire-name差异、requirements delta、notification 分组和 `turn/completed` source。 |
| Tool gates/image | tool system、current-time、update-plan、wait-agent-v2、image generation | 修正 hosted image-generation 旧描述、config gates、Free plan 和 extension-owned artifact；current-time 标为 base inventory 漏项。 |
| World State | context manager、collaboration modes、tool search | 修正 settings builder 仍处理 multi-agent 的误写；multi-agent 已是独立 typed section，tools section 仅描述 deferred namespaces。 |
| Process/TUI/Git | process-hardening、TUI nodes、git-utils | Windows Job preserve/terminate race、side conversation/live output、Git attribution 均按目标 source 复核。 |

纯 SHA 与只移动行号的节点采用 L2 抽样；A-BROKEN、B-HEAVY、MCP、thread、HTTP、Code Mode、plugins、protocol、approval、exec-network、skills、World State 等结构性节点不降级为抽样。

## 6. `[I]` / `[U]` 与跳过判定

保留的主要不确定项已写入 `_staging/uncertainty-61a44880.md` 并由 reconcile 生成 `reference/uncertainty.md`：

- `[U]` remote Code Mode listener 的应用层认证/TLS 部署保证。
- `[U]` multi-segment lineage 的 incremental replay。
- `[U]` Agent Plugins root `plugin.json` 默认 discovery 接线。
- `[U]` exec-network `Ask` 是否最终有可用 UI。
- `[U]` system proxy/PAC 的稳定性与候选 failover。
- `[U]` Windows TCP attribution 的 IPv6 行为。
- `[U]` dynamic skills shadow selector、remote plugin cache 长期契约。
- `[U]` legacy v1 denied wire compatibility 与 core/v2 completion timestamp 对应关系。
- `[I]` PathUri cache key 对跨 executor/host identity 的设计意图。

没有因“direct source clean”跳过全局 SHA 或引用检查。未拆出独立 Git-attribution、MCP-binding、World-State 节点：现有 `extension-system` + `git-utils`、`mcp.client`、`context-manager`/`collaboration-modes` 已能自包含承载；Code Mode 则因形成独立 host/runtime/transport 模块而新建节点。

## 7. 元数据与引用收敛

- 所有 172 个 retained verified node frontmatter：`updated: 61a44880a8`。
- `index.json.updated` 与所有 `index.nodes[].updated`：`61a44880a8`。
- `README.md`、`llms.txt`、`index.json` 的节点、tool、crate、RPC 计数一致。
- reconcile 会在文件删除时 prune stale index entry，并同步每节点 `updated`。
- lint 会校验 verified node frontmatter/index/top-level SHA 一致，以及 source/evidence path、行号与弱锚点。
- 全量行号审计后，失效引用已重新定位；最后一轮又把 252 个落在空行、纯注释或闭合符的 evidence refs 锚到相邻直接代码行。

## 8. 最终验证

```bash
git -C codex rev-parse HEAD
git -C codex status --short
node docs/llm-wiki/codex/tools/reconcile.mjs
node docs/llm-wiki/codex/tools/lint.mjs
jq -r '.updated, (.nodes|length), ([.nodes[].updated]|unique|join(\",\"))' docs/llm-wiki/codex/index.json
rg -n '^updated:' docs/llm-wiki/codex/{spine,surface,subsystems,reference} --glob '*.md'
rg -n 'tool\\.spawn-agents-on-csv|tool\\.report-agent-job-result' docs/llm-wiki/codex/index.json docs/llm-wiki/codex/llms.txt
git diff --check
```

验收结果：

- submodule HEAD 精确等于目标 full SHA，子模块源码工作树 clean。
- reconcile：172 verified nodes，0 issue。
- lint：0 error。
- stale node/index SHA：0。
- 已退役工具在 index/llms 的残留：0。
- `opencode`、`pi` 子模块未初始化、未修改。
