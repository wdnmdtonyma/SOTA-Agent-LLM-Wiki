# Codex `3abbf9fe2c..1cc7e23612` 源码差分研究

> 研究日期：2026-09-28
> Wiki verified base：`3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8`
> 目标源码：官方 `openai/codex` `origin/main` = `1cc7e2361237ce7244430ee1d581c77f95c57ac8`（短 SHA `1cc7e23612`）
> HEAD 提交：Show a short, neutral TUI interruption notice (#48830)
> 本文不是 Wiki 节点，不进 `index.json` / `llms.txt`。

## 1. 跨度

- 816 commits，4321 files，`+296580 / -68913`；1299 added / 418 deleted / 2582 modified / 22 renamed。
- base 是 target 祖先。
- submodule 已 detached checkout 到 target。

复现：

```bash
git -C codex fetch origin main
git -C codex rev-list --count 3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8..1cc7e2361237ce7244430ee1d581c77f95c57ac8
git -C codex diff --shortstat 3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8..1cc7e2361237ce7244430ee1d581c77f95c57ac8
```

## 2. 机械分级（185 基线节点）

目录型 `source:` 不算缺失。分类脚本把已删除文件算进 `modified`，会漏报 A-BROKEN。手工核对 `source:` 在 target 是否仍存在后：

| 分级 | 数量 | 说明 |
|---|---:|---|
| A-BROKEN（语义） | 5 | 已登记 source 在 target 不存在（其中 2 条是 rename） |
| B-HEAVY | 29 | 直接 source churn ≥ 2000 |
| C-DRIFT | 145 | 至少一个直接 source 改动（含上面 5 个若按脚本则落在 B/C） |
| D-CLEAN | 11 | 已登记 source 未改；仍 bump SHA |

脚本输出仍是 A-BROKEN 0 / B-HEAVY 29 / C-DRIFT 145 / D-CLEAN 11。语义缺失 source：

| 节点 | 缺失路径 | 处理 |
|---|---|---|
| `subsys.core.approval-guardian` | `codex-rs/core/src/guardian/review_session_factory.rs` | **已删除**。从 `source:` / `[E:]` 去掉，回 `review_session.rs` 现码 |
| `subsys.tui.overlays-dialogs` | `codex-rs/tui/src/app/agents_overview_render.rs` | **已删除**。command center 渲染改走现有 `app.rs` / agents overview 模块 |
| `subsys.app-server.transport` | `codex-rs/app-server-transport/src/transport/auth.rs` | rename → `codex-rs/websocket-auth/src/lib.rs` |
| `subsys.config-auth.plugins` | `codex-rs/plugin/src/plugin_id.rs` | rename → `codex-rs/core-plugin-common/src/plugin_id.rs` |
| `spine.extension-system` | `codex-rs/ext/skills/src/provider/orchestrator.rs` | **已删除**。skills provider 走 `provider/executor.rs` / `provider/host.rs`；并补 `ext/agent-message-board` |

## 3. Inventory 变化

### Workspace crates：147 → **153**（+6 / -0）

`agent-message-board-client`、`core-plugin-common`、`ext/agent-message-board`、`mermaid`、`tcp-tunnel`、`websocket-auth`。

`ext/` 子 crate **15 → 16**（+`ext/agent-message-board`）。

### Features：144 → **152**（+8 / -0）

| key | enum | stage | default |
|---|---|---|---|
| `analytics_plan_history` | `AnalyticsPlanHistory` | Experimental | false |
| `daemon_auto_start` | `DaemonAutoStart` | Stable | true |
| `instant_interrupt` | `InstantInterrupt` | UnderDevelopment | false |
| `prefer_mxc` | `PreferMxc` | UnderDevelopment | false |
| `system_proxy_fallback` | `SystemProxyFallback` | Stable | true |
| `defer_mailbox_preemption` | `DeferMailboxPreemption` | UnderDevelopment | false |
| `agent_message_board` | `AgentMessageBoard` | UnderDevelopment | false |
| `nonfatal_clock_read_errors` | `NonfatalClockReadErrors` | UnderDevelopment | false |

阶段分布以 `features/src/lib.rs` 的 `FeatureSpec` 为准（平台 `cfg` 可能让 `prevent_idle_sleep` 等切 stage）。enum / key 都是 152。

### 工具集

`spec_plan.rs` 核心 handler 集合无新增/删除模型可见 **core** wire name。工具节点保持 **39**。

新的 model-visible 面是 extension：`ext/agent-message-board` 在 `Feature::AgentMessageBoard` 下暴露 9 个 namespaced 工具（`create_channel` / `get_channels` / `list_threads` / `search_posts` / `read_thread` / `read_post` / `subscribe` / `unsubscribe` / `post`）。**不新建 tool 节点**；写入 `spine.extension-system` 与 `subsys.core.collaboration-modes`。

### App-Server

- client requests：**166 → 170**。+`account/gatewayOAuth/cancel|login|read`、+`rollout/compress`。
- server notifications：**84 → 85**（84 条 `=> "wire"` + `AccountLoginCompleted`）。+`account/gatewayOAuth/changed`。
- server requests：**11** 不变（9 v2 wire + 2 legacy `ApplyPatchApproval` / `ExecCommandApproval`）。
- RPC 合计 **261 → 266** = 170+85+11。

### Protocol / CLI / config / slash

- `Op` **28 → 29**：+`InterruptIfNoPendingInput`。
- `EventMsg` **83** 不变。
- `ConfigToml` 顶层 pub 字段 **102 → 104**：+`cloud`、+`model_post_turn_compact_threshold_percent`。
- CLI `Subcommand` **29 → 30**：+`TcpTunnel`。
- `SlashCommand` **59 → 62**：+`Tui`、+`Daemon`、+`Warnings`。

### TUI / 其它语义

- `codex-mermaid`：TUI markdown 可把 mermaid fence 渲成图；`config` TUI rendering 有 `mermaid: bool`（默认 true）。
- TUI 中断文案缩短、改 secondary 样式（本 freeze HEAD）。
- Windows MXC 继续存在；新 feature `prefer_mxc`。

## 4. 必须按新架构重读的主题

1. **`Op::InterruptIfNoPendingInput`**：只在该 turn 没有 queued input 时中断；ack 在 cancellation 完成前发出。写入 `ref.protocol-op`、`spine.sq-eq-architecture`、`subsys.core.session-lifecycle` / turn-engine。
2. **Slash `/tui` `/daemon` `/warnings`**：`command.config-system` 或 realtime/debug 页按 command 语义落入；不要漏实例。
3. **CLI `tcp-tunnel`**：`cli.subcommands`。
4. **Gateway OAuth RPC + notification**：`rpc.config-account-methods`、`rpc.notifications-system`、auth-flows。
5. **`rollout/compress` client RPC**：rollout 相关 RPC 页。
6. **Agent message board**：feature 默认关；9 个 channel 工具；fold 进 extension + collaboration。
7. **WebSocket auth 抽到 `websocket-auth` crate**。
8. **`PluginId` 抽到 `core-plugin-common`**。
9. **Guardian `review_session_factory.rs` 删除**。
10. **Skills `provider/orchestrator.rs` 删除**。
11. **Mermaid TUI 渲染** + config `cloud` / post-turn compact threshold。
12. **不要写**：crates 仍 147、features 仍 144、Op 仍 28、slash 仍 59、RPC 仍 261、ConfigToml 仍 102、CLI 仍 29、ext 仍 15。

## 5. 新增 / 退役节点判定

退役：无独立 Wiki 节点删除。

新增：**0**。新 crate / feature / slash / RPC / message-board / mermaid / tcp-tunnel 全部 fold 进现有节点。

最终目标：**185 verified nodes**，全部 `updated: 1cc7e23612`。
