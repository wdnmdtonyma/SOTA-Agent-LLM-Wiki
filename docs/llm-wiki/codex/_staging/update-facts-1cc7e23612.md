# Extra architecture facts — 1cc7e23612

Filler 辅助。冲突时以源码为准，不要把本页当 `[E]`。

## 路径重映射

| 旧路径 | 新路径 / 处理 |
|---|---|
| `codex-rs/core/src/guardian/review_session_factory.rs` | **已删除**。Guardian review session 现码在 `review_session.rs` 一带 |
| `codex-rs/tui/src/app/agents_overview_render.rs` | **已删除**。agents overview 渲染改走 `app.rs` / 现有 overview 模块 |
| `codex-rs/app-server-transport/src/transport/auth.rs` | `codex-rs/websocket-auth/src/lib.rs` |
| `codex-rs/plugin/src/plugin_id.rs` | `codex-rs/core-plugin-common/src/plugin_id.rs` |
| `codex-rs/ext/skills/src/provider/orchestrator.rs` | **已删除**。`ext/skills/src/provider/executor.rs`、`provider/host.rs` |
| `codex-rs/core/src/session_startup_prewarm.rs` | `codex-rs/core/src/session/startup_prewarm.rs` |
| `codex-rs/exec-server/src/runtime_paths.rs` | `codex-rs/exec-server/src/runtime_options.rs` |
| `codex-rs/ext/connectors/src/executor_plugin.rs` | `codex-rs/ext/connectors/src/plugin_app.rs` |
| `codex-rs/ext/mcp/src/executor_plugin/*` | `codex-rs/ext/mcp/src/plugin/*` |
| `codex-rs/core/src/context/update_plan_instructions.rs` | `codex-rs/prompts/src/update_plan_instructions.rs` |
| guardian policy markdown | `codex-rs/prompts/templates/guardian/*` |
| TUI token chart | `codex-rs/tui/src/analytics/activity_chart.rs` |

找不到替换文件就从 `source:` 删掉该条。禁止把 `[E:]` 指到已删除路径。

## Catalog 重数（以源码为准，不要抄旧 wiki）

- workspace members **153**
- Feature keys / enum **152**
- Op **29**、EventMsg **83**
- SlashCommand **62**
- ConfigToml pub 字段 **104**
- CLI Subcommand **30**
- client RPC **170**
- notifications **85**（84 `=> "wire"` + `AccountLoginCompleted`）
- server requests **11**（9 v2 wire + 2 legacy `ApplyPatchApproval` / `ExecCommandApproval`）
- RPC 合计 **266** = 170+85+11
- 工具节点 **39**、wiki 节点 **185**
- `ext/` crate **16**

## 新架构事实

1. **`Op::InterruptIfNoPendingInput { turn_id, reply }`**。该 turn 无 queued input 才中断；`reply: oneshot::Sender<bool>` 在 cancellation 完成前 ack。`Op::Interrupt` 仍在。
2. **Slash +3**：`Tui`（下一 launch 选 TUI mode）、`Daemon`（本地 background server）、`Warnings`（retained warnings）。enum 顺序不是字母序。
3. **CLI +`TcpTunnel`**。crate `tcp-tunnel`。
4. **Features +8**：见研究页表。`daemon_auto_start` Stable 默认开；`system_proxy_fallback` Stable 默认开；其余新 key 除 Experimental `analytics_plan_history` 外多为 UnderDevelopment 默认关。
5. **ConfigToml +`cloud`**（cloud-owned feature settings）和 **`model_post_turn_compact_threshold_percent`**（`Option<u8>` 0–100；omit/0 关掉 turn-end compaction）。
6. **Gateway OAuth**：client `account/gatewayOAuth/{cancel,login,read}` + notif `account/gatewayOAuth/changed`。
7. **`rollout/compress`** client RPC。
8. **Agent message board**：`Feature::AgentMessageBoard` 默认关。`message_board_tools` 产出 9 个工具名。不要为这 9 个建 surface/tools 节点。
9. **Mermaid**：`codex-mermaid` crate；TUI markdown 在 preferences `mermaid` 为 true 且 fence 闭合时渲染。写入 `subsys.tui.rendering-theming` / `config.ui-tui`。
10. **WebSocket auth** 在 `codex-rs/websocket-auth`。**PluginId** 在 `codex-rs/core-plugin-common`。

## 不要写

crates 147 / features 144 / Op 28 / slash 59 / RPC 261 / ConfigToml 102 / CLI 29 / ext 15 / notifications 84 / 仍引用 `review_session_factory.rs` / `agents_overview_render.rs` / `provider/orchestrator.rs` / `app-server-transport/.../auth.rs` / `plugin/src/plugin_id.rs`。

## 不变

- 无新/删模型可见 **core** tool wire name；工具节点仍 39。
- `codex mcp-server` 仍退役。
- SQ/EQ 脊柱仍在。
- EventMsg 83、server requests 11。
- 不新建 wiki 节点。
