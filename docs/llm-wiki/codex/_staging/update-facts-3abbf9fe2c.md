# Extra architecture facts — 3abbf9fe2c

Filler 辅助。冲突时以源码为准，不要把本页当 `[E]`。

## ThreadRollback 删除

- `Op` 变体 **28**：`Interrupt` … `RunUserShellCommand`。**没有** `ThreadRollback`。
- `client_request_definitions!` **166** 条。**没有** `thread/rollback`。
- 已删 schema：`ThreadRollbackParams/Response` json+ts；测试 `app-server/tests/suite/v2/thread_rollback.rs`。
- `CodexErrorInfo::ThreadRollbackFailed` **仍在** protocol / app-server-protocol 错误枚举。不要写成“错误类型也删了”，也不要写成活 Op。
- Paginated 路径继续是 `thread/revert`。旧 wiki 把 `thread/rollback` 写成“仍是稳定 wire + deprecation notice”——那句话本轮作废。

## Personality TUI 选择器删除

- `SlashCommand` **59**，无 `Personality`。`/personality` 行必须从 `command.model-mode` 去掉。
- 已删：`core/src/context/personality_spec_instructions.rs`、`core/src/context/world_state/personality.rs`、`personality_tests.rs`、personality popup snapshot。
- **仍在**：`Feature::Personality` key `personality` Stable default true；`ConfigToml.personality: Option<Personality>`；bundled model instructions 可内嵌 friendly 文本。
- 不要写“personality 子系统整段删除”。删的是 TUI 选择器与 world_state personality 模块。

## send_message_to_user_async 门控

`spec_plan.rs` `add_core_utility_tools`：

```
root agent
&& (features.enabled(Feature::SendMessageToUserAsync)
    || model_info.experimental_supported_tools 含 "send_message_to_user_async")
```

旧 wiki“只看 catalog 名”是假话。`request_user_input_async` 仍看 catalog `"request_user_input_async" | "send_user_message_async"`，本轮未改成 feature 门控。

`Feature::SendMessageToUserAsync` key `send_message_to_user_async`，UnderDevelopment，默认 false。
旧 key `send_async_message` 仍是 `Stage::Removed`。

## use_xaa + enterprise MCP auth

- `Feature::UseXaa` key `use_xaa`，UnderDevelopment，默认 false。
- `ConfigToml.mcp_enterprise_managed_auth: Option<McpEnterpriseManagedAuthConfig>`，定义在 `config/src/mcp_ema.rs`。
- IdP 只允许 MDM / System / EnterpriseManaged / legacy managed /（非 project 的 user/host）层；plugin 与 project 不能重定向 enterprise credential source。
- `McpEnterpriseManagedAuthConfig::resolve(..., xaa_enabled)` 会校验 xaa opt-in 来源。

## Worktrees / voice

- `Feature::Worktrees` key `worktrees`：**Stable，default_enabled true**。旧 wiki Experimental/false 作废。
- Voice slash 仍由 `voice_command_enabled` 过滤；该 flag 跟 realtime 可用性走。commit “Enable TUI voice conversations by default” 要对照 `slash_commands.rs` / session_flow 现码写，不要把 commit title 当 `[E]`。

## Windows MXC

- 新文件包括 `mxc-sandbox/src/windows.rs`、`core/src/config/windows_sandbox_config.rs`、`windows-sandbox-rs/src/setup_provisioning.rs`（从 `bin/setup_main/win.rs` rename）。
- MXC 接到 command execution 与 managed network policy。TUI Windows sandbox setup 走 app-server。
- 不新建节点；写进 `subsys.exec-sandbox.sandbox-windows` / overview。

## Catalog counts at target（recount from source）

- workspace members: **147**（第 3–149 行）
- Feature keys / enum: **144**
- Op **28** / EventMsg **83**
- SlashCommand **59**
- ConfigToml pub: **102**
- CLI Subcommand **29**
- client RPC **166**
- notifications **84**（83 `=> "wire"` + `AccountLoginCompleted`）
- server requests **11**（9 v2 + 2 legacy）
- tool nodes **39** / wiki nodes **185**

Feature 阶段不要抄旧 142 的 Stable/UD 表；对着 `features/src/lib.rs` 逐条重数。`prevent_idle_sleep` 仍可能按平台切 stage。

## 不变

- 无新/删模型可见 core tool wire name。
- `codex mcp-server` 仍退役。
- SQ/EQ 脊柱仍在。
- crates 无增删。
- EventMsg 83、CLI 29、notifications 84、server requests 11。
