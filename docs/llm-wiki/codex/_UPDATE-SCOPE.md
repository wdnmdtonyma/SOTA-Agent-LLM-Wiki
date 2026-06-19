# UPDATE SCOPE — codex wiki 大规模更新令(v1 → 新 HEAD)

> 本文件由分析会话生成(2026-06-18),给执行更新的 codex 会话读。
> **基线(v1 verified 时的 codex HEAD)**:`37aadeaa13`
> **目标(当前 codex 子模块 HEAD)**:`5670360009`
> **跨度**:1925 commit · 3384 文件 · +550074 / −191535 行 · 2026-04-22 → 2026-06-18

复现 diff(在 `Best/codex/` 内):
```
git diff --stat 37aadeaa13fc9b8b2f9cd93f56786e236bf9f8d1..56703600091d25542b60597b85d0e027799ad063
```

---

## 0. 结论:近乎全量 re-verify

v1 wiki 的 170 节点全部 verified 于 `37aadeaa13`,卖点是**精确 `[E:path:line]`**。本次更新后:

| 维度 | 数字 |
|---|---|
| 被 wiki 引用的去重源文件 | 489 |
| ├ 已删/移(路径失效) | **73 (15%)** |
| ├ 改动(行漂移) | **330 (67%)** |
| └ 不变 | 86 (18%) |
| 受影响节点(170 中) | |
| ├ **结构性失效**(source 列表引用了已删/移文件) | **85** |
| ├ 重 churn 行漂移(无删除但源大改) | ~79 |
| └ 完全不受影响 | **仅 6** |

→ 几乎每个节点都要重读源、重核行号。**不能机械批量改路径了事**;按 RUN.md §3 的 L1→L2→L3 逐节点重做,重点是 `[E:path:line]` 行号必须重新落到被断言那行。

完全不受影响的 6 节点(可跳过,仅复核):`subsys.exec-sandbox.shell-parsing` · `subsys.tui.status-surfaces` · `subsys.tui.onboarding` · `subsys.tui.rendering-theming` · `subsys.platform.file-search` · `ref.uncertainty`。

全 170 节点的逐节点影响分级见 **附录 A(本文件末尾,自动生成)**。

---

## 1. ⚠️ 工具系统:ground truth 整体迁走(最高优先,先修)

v1 的硬约定(RUN.md §4 / conventions.md 模板 §6 / llms.txt)把工具 ground truth 钉在 `codex-rs/tools/src/tool_registry_plan.rs` 的 `build_tool_registry_plan`。**该文件已删。** `core/src/tools/spec.rs` 也已删。

**新 ground truth**:`codex-rs/core/src/tools/spec_plan.rs`
- 装配入口:`build_tool_router(...)` → `build_tool_specs_and_registry(...)` → `add_tool_sources(...)`
- `add_tool_sources` 扇出:`add_shell_tools` / `add_mcp_resource_tools` / `add_core_utility_tools` / `add_collaboration_tools` / `add_mcp_runtime_tools` / `add_extension_tools` / `add_dynamic_tools`
- **所有 handler 收归 `codex-rs/core/src/tools/handlers/`**(旧 `codex-rs/tools/src/*_tool.rs` 全删)。
- 各 spec 另见 `handlers/*_spec.rs`、hosted(Responses 内建)见 `core/src/tools/hosted_spec.rs`、code-mode 见 `core/src/tools/code_mode/`。

**工具集变更(v1 有 38 个 tool 节点)**:

删除 7 个工具 → **删节点**(并在 uncertainty 记一笔):
`shell`(被 `shell_command` 取代)· `local_shell`(`ToolSpec::LocalShell` 变体已移除)· `js_repl` + `js_repl_reset`(整个 JS REPL 运行时删除,`core/src/tools/js_repl/` 与 `tools/src/js_repl_tool.rs` 没了,`docs/js_repl.md` 也删)· `list_dir`(handler 删)· `tool_suggest`(被 `request_plugin_install` + `list_available_plugins_to_install` 取代)· `close_agent`(V2)(`multi_agents_v2/close_agent.rs` 删)。

新增 6 个工具 → **加节点**:
`sleep`(`handlers/sleep.rs`,`Feature::SleepTool`)· `new_context`(`handlers/new_context_window.rs`,`Feature::TokenBudget`,DirectModelOnly)· `get_context_remaining`(`handlers/get_context_remaining.rs`,`Feature::TokenBudget`)· `interrupt_agent`(`handlers/multi_agents_v2/interrupt_agent.rs`)· `list_available_plugins_to_install`(`handlers/list_available_plugins_to_install.rs`)· `request_plugin_install`(`handlers/request_plugin_install.rs`)。

其余 ~28 个存活工具:**handler 文件全部换了路径**(`tools/src/*` → `core/src/tools/handlers/*`),门控也多有变动,逐节点按新 `spec_plan.rs` 重核。新旧 handler 路径对照见 §1 表(本会话已测绘,要点):
- shell_command → `handlers/shell/shell_command.rs`;exec_command/write_stdin → `handlers/unified_exec/{exec_command,write_stdin}.rs`;apply_patch → `handlers/apply_patch.rs`;update_plan → `handlers/plan.rs`;view_image → `handlers/view_image.rs`;request_user_input → `handlers/request_user_input.rs`;request_permissions → `handlers/request_permissions.rs`。
- MCP 资源三件套 → `handlers/mcp_resource/{list_mcp_resources,list_mcp_resource_templates,read_mcp_resource}.rs`;tool_search → `handlers/tool_search.rs`;mcp namespace → `handlers/mcp.rs`;dynamic → `handlers/dynamic.rs`。
- multi-agent **V1**(namespace `multi_agent_v1`)→ `handlers/multi_agents/{spawn,wait,close_agent,resume_agent,send_input}.rs`;**V2** → `handlers/multi_agents_v2/{spawn,wait,send_message,followup_task,interrupt_agent,list_agents}.rs`。
- agent-jobs → `handlers/agent_jobs/{spawn_agents_on_csv,report_agent_job_result}.rs`;code-mode → `core/src/tools/code_mode/{execute_handler,wait_handler}.rs`(路径未变)。
- web_search / image_generation 现为**扩展**(见 §3 `ext/`):standalone 走 `ext/{web-search,image-generation}/src/tool.rs`,hosted fallback 走 `core/src/tools/hosted_spec.rs`。

---

## 2. crate 结构:84 → 100

**新增 19 条目(实为更多子 crate)**,按 wiki 覆盖归类:

**(a) 需新建节点**
- `app-server-daemon`(app-server 进程生命周期管理)→ subsystems/app-server
- `app-server-transport`(WebSocket/UDS 传输 + JWT/HMAC 鉴权 + remote-control,旧 `app-server/src/transport/` 提升为 crate)→ subsystems/app-server
- `cloud-config`(云端下发配置的传输/缓存/刷新)→ subsystems/cloud
- `code-mode-protocol`(code-mode exec/wait 工具协议类型)→ subsystems/core 或 exec-sandbox
- `core-api`(对外公开 API facade,聚合 core/config/exec-server)→ spine/
- `external-agent-migration`(从 `.claude/`、`.mcp.json` 导入别的 agent 配置,~2185 行单文件)→ surface/cli 或 config-auth
- `file-system`(`ExecutorFileSystem` 抽象,本地+远程执行通用)→ subsystems/exec-sandbox
- `ext/`(**全新扩展插件系统**,8 子 crate)→ 详见 §3

**(b) 是旧代码抽出/改名,更新既有节点即可**
- `memories/read` + `memories/write`(旧 `core/src/memories/` 拆成读写两 crate)→ subsys.core.memory
- `context-fragments`(旧 `core/src/context/`)→ core context 注入
- `prompts`(旧散落 core 的 prompt 串,现集中)→ core instruction-assembly
- `agent-graph-store`(父子 agent 拓扑图)→ core 多 agent
- `codex-home`(从 home dir 读 AGENTS.md / AGENTS.override.md)→ surface/config 或 core
- `bwrap`(调用 vendored bubblewrap 的薄 binary)→ subsys.exec-sandbox(Linux 沙箱)
- `message-history`(`~/.codex/history.jsonl` 持久化)→ core/surface history
- `external-agent-sessions`(导入别家 agent 的 JSONL 会话历史)→ 并入 external-agent-migration 节点

**(c) 内部/stub,不必单独建节点**
- `code-mode-host`(空 main stub)· `file-watcher`(内部 notify 封装)· `thread-manager-sample`(SDK 示例 binary)

**删除 3 crate → 清理引用它们的节点**
- `cloud-requirements`(其 `RemoteControlPolicy::DisabledByRequirements` 并入 `app-server-transport`)→ 影响 `subsys.cloud.cloud-requirements` 节点
- `debug-client`(无后继,测试工具用 `app-server-test-client`)→ 影响引用它的节点
- `device-key`(整套 device key 管理删除,凭据走 `keyring-store`;对应 app-server RPC 的 `device/key/*` 也删)

---

## 3. `ext/` 扩展插件系统(全新,8 子 crate)

这是本次最大的架构新增:正式的 extension 插件机制。
- `ext/extension-api`(`codex-extension-api`,15 文件):核心 trait —— `ExtensionRegistry` + 各 contributor(`ThreadLifecycleContributor` / `TurnInputContributor` / `ToolContributor` / `McpServerContributor` / `PromptFragment` / `UserInstructionsProvider`)→ **spine/ 架构新节点**
- `ext/goal`(`/goal` 特性:目标设定 + token 预算 + turn steering)→ subsystems/core 或 slash-commands
- `ext/web-search`(`web_search` 工具 + 搜索历史)→ surface/tools
- `ext/image-generation`(`imagegen` 工具)→ surface/tools
- `ext/skills`(skills 发现/选择/catalog + MCP provider 编排,暴露 list/read 工具)→ subsystems/core 或 slash-commands 新节点
- `ext/memories`(memories 的工具面:read/list/search/note 工具)→ 并入 memories 覆盖
- `ext/mcp`(MCP hosted-plugin runtime contributor)→ subsystems/mcp
- `ext/guardian`(thread start 时拉起 guardian 子 agent)→ subsystems/core,简述即可

工具注册新增的 `add_extension_tools` 路径(§1)就是把这些 extension 的 `ToolContributor` 汇入。

---

## 4. catalog 全量变更(各 grouped catalog 节点重做)

**所有 catalog 的权威源文件都移了位**,先定位再逐实例重核。各 catalog 当前源 + 关键 delta:

### 4.1 config keys —— `codex-rs/config/src/config_toml.rs`(`ConfigToml`,旧 `core/src/config_loader/mod.rs` 删,已独立成 `config` crate)
当前 ~72 顶层字段。**新增**:`auto_review`、`hooks`、`apps`、`feedback`、`windows`、`notice`、`desktop`、`ghost_snapshot`、`debug`(含 `DebugToml` lockfile 重放)、`model_auto_compact_token_limit_scope`、`include_collaboration_mode_instructions`、`experimental_thread_store`、`experimental_thread_config_endpoint`、`experimental_compact_prompt_file`、`oss_provider`、`disable_paste_burst`、`project_root_markers`、`apps_mcp_product_sku`、`experimental_realtime_webrtc_call_base_url` 等。**删除**:`commit_attribution`、`zsh_path`、`windows_wsl_setup_acknowledged`、`experimental_instructions_file`、`experimental_use_freeform_apply_patch`。**改类型**:`forced_chatgpt_workspace_id`(String→`ForcedChatgptWorkspaceIds`)、`service_tier`(enum→String)。

### 4.2 slash 命令 —— `codex-rs/tui/src/slash_command.rs`(`SlashCommand`)
~56 变体。**新增**:`/ide` `/keymap` `/vim` `/approve`(AutoReview) `/import` `/hooks` `/archive` `/delete` `/app` `/goal` `/btw` `/raw` `/usage` `/pet` `/subagents`(MultiAgents)。**删除**:`/fast` `/approvals` `/collab` `/realtime` `/settings`(`/approvals`→`/permissions`,collab 常开)。

### 4.3 协议 Op —— `codex-rs/protocol/src/protocol.rs`(`Op`)
当前 26 变体。**新增**:`RealtimeConversationSpeech`、`ThreadSettings`(从 `UserInput` 拆出)、`ApproveGuardianDeniedAction`、`RunUserShellCommand`。**删除**:`ListMcpTools`、`SetThreadName`(移到 RPC 层)。**破坏性重构**:`UserInput` 的 per-turn 覆盖字段(approvals_reviewer/effort/summary/collaboration_mode)归入 `ThreadSettingsOverrides`,走新 `thread_settings` 字段。

### 4.4 协议 Event —— `codex-rs/protocol/src/protocol.rs`(`EventMsg`)
当前 74 变体。**新增**:`GuardianWarning` `ModelVerification` `TurnModerationMetadata` `ThreadSettingsApplied` `ThreadGoalUpdated` `AgentReasoningSectionBreak` `SubAgentActivity` `PatchApplyUpdated` `HookStarted` `HookCompleted` 及 Collab* 系列。**改名**:`AgentMessageDelta`→`AgentMessageContentDelta`、`AgentReasoningDelta`→`ReasoningContentDelta`、`AgentReasoningRawContentDelta`→`ReasoningRawContentDelta`。(v1 的硬锚 Op=34/EventMsg=81 已失效,新值需机械重数。)

### 4.5 feature flags —— `codex-rs/features/src/lib.rs`(`Feature`)
当前 ~80 变体(分 Stable/Experimental/UnderDevelopment/Removed 四档)。关键:`CodexHooks` key `codex_hooks`→`hooks` 并升 Stable;`UnifiedExec` 升 Stable;`Sqlite`/`JsRepl`/`GhostCommit`(`undo`)等降为 Removed no-op;新增 `SleepTool` `TokenBudget` `RolloutBudget` `Artifact` `FastMode` `StandaloneWebSearch` `NetworkProxy` `EnableMcpApps` `SecretAuthStorage` 等一批。

### 4.6 app-server RPC —— `codex-rs/app-server-protocol/src/protocol/`(旧单文件 `v2.rs` 已拆成 `protocol/v2/` 目录,按域分:`account.rs`/`thread.rs`/`turn.rs`/`fs.rs`/`config.rs`/`mcp.rs`/`plugin.rs`/`realtime.rs`/`remote_control.rs`/`hook.rs`/`process.rs`/`command_exec.rs`/`windows_sandbox.rs`/... ;`ClientRequest`/`ServerNotification` 在 `common.rs`)
当前 `ClientRequest` ~82 方法、`ServerNotification` ~65。**新增**(client):`thread/delete`、`thread/goal/{set,get,clear}`、`thread/settings/update`、`thread/backgroundTerminals/*`、`thread/search`、`thread/turns/*`、`hooks/list`、`plugin/share/*`(6)、`remoteControl/*`(7)、`process/*`(4)、`externalAgentConfig/*`、`attestation/generate`、`memory/reset`、`collaborationMode/list` 等。**删除**:`device/key/{create,public,sign}`。v1 的 RPC=153/groups 计数需整体重做。

---

## 5. 必须同步修的 wiki 控制文档(meta)

这些文件硬编码了已失效的事实,**先改这些,否则后续填充会被旧约定带偏**:
- `RUN.md` §4:`tool_registry_plan.rs` / `build_tool_registry_plan` → 改为 `core/src/tools/spec_plan.rs` / `build_tool_router` + `add_tool_sources`。
- `conventions.md` 模板 §6:同上;`ToolSpec` 变体清单核对(`LocalShell` 已删,确认现存变体集)。
- `llms.txt`:T1 标题 "38 — 已过 audit-A 对照 tool_registry_plan.rs"、以及 mcp-namespace/dynamic 两条的 `tool_registry_plan.rs` 引用;并随工具增删(38→37:−7+6)更新工具清单。
- `index.json`:增删工具节点、新增 crate 节点后登记;所有节点 `updated:` 应在重核后盖成 `5670360009`。
- 各节点 frontmatter `source:` 列:73 个失效路径要换成新路径(§1/§2/§4 给了大部分映射)。

v1 的 group 硬计数锚(config 91 / features 62 / slash 42 / RPC 153 / crates 97 / Op 34 / EventMsg 81)**全部失效**,重核后更新 README/llms 里的计数。

---

## 6. 建议执行顺序(给 codex)

1. **先改 meta**(§5 的 RUN/conventions/llms 工具 ground-truth 路径)——10 分钟,解锁后续。
2. **工具系统**(§1):删 7 节点、加 6 节点、重核 ~28 节点(按新 `spec_plan.rs` 门控 + `handlers/` 路径)。这是结构性失效最密集处。
3. **catalog 重做**(§4):config / slash / Op / Event / Feature / RPC 六大组,先定位新源文件,再逐实例重数 + 重核行号 + 更新计数锚。
4. **新 crate 节点**(§2a + §3):extension-api(spine)、app-server-{daemon,transport}、cloud-config、core-api、file-system、external-agent-migration、ext 各 tool/skills/goal。
5. **既有节点重核**(§2b 抽出类 + 附录 A 的结构性失效/重 churn 名单):memories(读写拆分 + ext/memories)、context/prompts、其余 ~79 重 churn 节点。
6. **删除清理**(§2 删 crate):cloud-requirements / debug-client / device-key 相关节点。
7. 每节点仍走 RUN.md §3 的 **L1(lint 0 error)→ L2(干净 subagent 逐条证伪 `[E]` + 行号落点)→ L3(≤2 轮修)**;`[U]` 写 `_staging/`,收尾人跑 `reconcile.mjs` + `lint.mjs`。
8. 完成定义:`index.json` 无 planned;工具节点对上 `spec_plan.rs`;所有 catalog 实例全覆盖;计数锚更新;全节点 `updated: 5670360009`;lint 全绿。

> 仍是真 git 仓 + 有测试,**能核到就核到**;拿不准 `[I]/[U]`,别臆造。事实以 `../../../codex/` 当前源码(`5670360009`)为准,不以本文件转述为准——本文件给的是路标和清单,行号一律重新到源码里核。

---
<!-- 附录 A:自动生成的逐节点影响分级,见下方 -->

## 附录 A — 逐节点影响分级(自动生成 @ 37aadeaa13..5670360009)

分级:**A-BROKEN**=source 引用了已删/移文件(结构性失效,必改 source 列)· **B-HEAVY**=无删除但源大改(churn≥2000 行)· **C-DRIFT**=轻中度行漂移 · **D-CLEAN**=源全未变(仅复核)。

计数:A-BROKEN=85 · B-HEAVY=31 · C-DRIFT=48 · D-CLEAN=6(共 170)

| node id | tier | del/chg/total-src | ~churn 行 | 已删·移的 source(需重定位) |
|---|---|---|---|---|
| `subsys.core.memory` | A-BROKEN | 7/4/11 | 3257 | `core/src/memories/mod.rs`<br>`core/src/memories/start.rs`<br>`core/src/memories/phase1.rs`<br>`core/src/memories/phase2.rs`<br>`core/src/memories/prompts.rs`<br>`core/src/memories/storage.rs`<br>`core/src/memories/usage.rs` |
| `tool.js-repl` | A-BROKEN | 7/3/10 | 2689 | `tools/src/js_repl_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs`<br>`core/src/tools/handlers/js_repl.rs`<br>`core/src/tools/js_repl/mod.rs`<br>`docs/js_repl.md` |
| `tool.js-repl-reset` | A-BROKEN | 7/2/9 | 2393 | `tools/src/js_repl_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs`<br>`core/src/tools/handlers/js_repl.rs`<br>`core/src/tools/js_repl/mod.rs`<br>`docs/js_repl.md` |
| `tool.request-user-input` | A-BROKEN | 5/9/14 | 6331 | `tools/src/request_user_input_tool.rs`<br>`docs/tui-request-user-input.md`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `subsys.core.thread-store` | A-BROKEN | 5/11/16 | 4449 | `thread-store/src/recorder.rs`<br>`thread-store/src/remote/mod.rs`<br>`thread-store/src/remote/list_threads.rs`<br>`thread-store/src/remote/helpers.rs`<br>`thread-store/src/remote/proto/codex.thread_store.v1.proto` |
| `tool.apply-patch` | A-BROKEN | 5/8/13 | 2805 | `tools/src/apply_patch_tool.rs`<br>`tools/src/tool_apply_patch.lark`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `tool.list-dir` | A-BROKEN | 5/3/8 | 1525 | `tools/src/utility_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs`<br>`core/src/tools/handlers/list_dir.rs` |
| `tool.tool-suggest` | A-BROKEN | 5/3/8 | 1159 | `tools/src/tool_suggest.rs`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs`<br>`core/src/tools/handlers/tool_suggest.rs` |
| `tool.send-input-v1` | A-BROKEN | 5/7/12 | 506 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs`<br>`tools/src/tool_registry_plan_tests.rs`<br>`tools/src/agent_tool_tests.rs` |
| `sdk.py-overview` | A-BROKEN | 5/0/5 |  | `sdk/python/src/codex_app_server/api.py`<br>`sdk/python/src/codex_app_server/client.py`<br>`sdk/python/src/codex_app_server/async_client.py`<br>`sdk/python/src/codex_app_server/_run.py`<br>`sdk/python/src/codex_app_server/__init__.py` |
| `ref.glossary` | A-BROKEN | 4/24/28 | 11614 | `core/src/tasks/ghost_snapshot.rs`<br>`core/src/tasks/undo.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/js_repl/mod.rs` |
| `tool.shell` | A-BROKEN | 4/10/14 | 4980 | `tools/src/local_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `tool.code-mode-exec` | A-BROKEN | 4/8/12 | 4396 | `tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`code-mode/src/description.rs`<br>`core/src/tools/spec.rs` |
| `tool.request-permissions` | A-BROKEN | 4/7/11 | 3998 | `tools/src/local_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `tool.exec-command` | A-BROKEN | 4/8/12 | 3978 | `tools/src/local_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `tool.shell-command` | A-BROKEN | 4/8/12 | 3953 | `tools/src/local_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `tool.view-image` | A-BROKEN | 4/5/9 | 3662 | `tools/src/view_image.rs`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `tool.spawn-agent-v1` | A-BROKEN | 4/5/9 | 3135 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs`<br>`tools/src/agent_tool_tests.rs` |
| `tool.dynamic-tools` | A-BROKEN | 4/7/11 | 2825 | `tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs`<br>`core/src/tools/tool_search_entry.rs` |
| `tool.update-plan` | A-BROKEN | 4/3/8 | 2658 | `tools/src/plan_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `tool.wait-agent-v1` | A-BROKEN | 4/5/9 | 2510 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs`<br>`tools/src/agent_tool_tests.rs` |
| `tool.write-stdin` | A-BROKEN | 4/6/10 | 2271 | `tools/src/local_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `tool.wait-agent-v2` | A-BROKEN | 4/3/7 | 2266 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs`<br>`core/src/agent/mailbox.rs` |
| `tool.spawn-agents-on-csv` | A-BROKEN | 4/3/7 | 1368 | `tools/src/agent_job_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs`<br>`tools/src/tool_registry_plan_tests.rs` |
| `tool.report-agent-job-result` | A-BROKEN | 4/2/7 | 867 | `tools/src/agent_job_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs`<br>`tools/src/tool_registry_plan_tests.rs` |
| `tool.resume-agent-v1` | A-BROKEN | 4/2/6 | 357 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs`<br>`tools/src/tool_registry_plan_tests.rs` |
| `tool.close-agent-v1` | A-BROKEN | 4/1/5 | 188 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs`<br>`core/src/tools/handlers/multi_agents_v2/close_agent.rs` |
| `tool.close-agent-v2` | A-BROKEN | 4/1/5 | 4 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs`<br>`core/src/tools/handlers/multi_agents_v2/close_agent.rs` |
| `sdk.py-inputs-errors` | A-BROKEN | 4/0/4 |  | `sdk/python/src/codex_app_server/_inputs.py`<br>`sdk/python/src/codex_app_server/errors.py`<br>`sdk/python/src/codex_app_server/retry.py`<br>`sdk/python/src/codex_app_server/client.py` |
| `spine.trace-subagent` | A-BROKEN | 3/14/17 | 10073 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/agent/mailbox.rs` |
| `subsys.core.ghost-undo` | A-BROKEN | 3/7/10 | 8770 | `core/src/tasks/ghost_snapshot.rs`<br>`core/src/tasks/undo.rs`<br>`git-utils/src/ghost_commits.rs` |
| `subsys.core.instruction-assembly` | A-BROKEN | 3/20/24 | 3952 | `core/src/context/fragment.rs`<br>`core/src/context/skill_instructions.rs`<br>`core/src/context/spawn_agent_instructions.rs` |
| `spine.tool-call-anatomy` | A-BROKEN | 3/5/8 | 3645 | `tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `tool.local-shell` | A-BROKEN | 3/7/10 | 3597 | `tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `tool.read-mcp-resource` | A-BROKEN | 3/4/7 | 3586 | `tools/src/mcp_resource_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs` |
| `tool.tool-search` | A-BROKEN | 3/8/11 | 3570 | `tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs`<br>`core/src/tools/tool_search_entry.rs` |
| `tool.list-mcp-resources` | A-BROKEN | 3/3/6 | 3065 | `tools/src/mcp_resource_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs` |
| `tool.list-mcp-resource-templates` | A-BROKEN | 3/2/5 | 2839 | `tools/src/mcp_resource_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs` |
| `tool.code-mode-wait` | A-BROKEN | 3/7/10 | 2363 | `tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `tool.spawn-agent-v2` | A-BROKEN | 3/4/8 | 901 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs` |
| `tool.test-sync-tool` | A-BROKEN | 3/3/6 | 831 | `tools/src/utility_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs` |
| `tool.list-agents` | A-BROKEN | 3/2/5 | 788 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs` |
| `tool.mcp-namespace-tools` | A-BROKEN | 3/4/8 | 645 | `tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `subsys.config-auth.config-loading` | A-BROKEN | 3/3/7 | 418 | `core/src/config_loader/mod.rs`<br>`core/src/config_loader/layer_io.rs`<br>`app-server-protocol/src/protocol/v2.rs` |
| `tool.send-message` | A-BROKEN | 3/3/6 | 207 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs` |
| `tool.followup-task` | A-BROKEN | 3/3/6 | 207 | `tools/src/agent_tool.rs`<br>`tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs` |
| `sdk.sdk-architecture` | A-BROKEN | 3/3/8 | 108 | `sdk/python/src/codex_app_server/api.py`<br>`sdk/python/src/codex_app_server/client.py`<br>`sdk/python/src/codex_app_server/async_client.py` |
| `subsys.core.tool-system` | A-BROKEN | 3/1/5 | 75 | `tools/src/tool_registry_plan.rs`<br>`tools/src/tool_registry_plan_types.rs`<br>`core/src/tools/spec.rs` |
| `subsys.tui.streaming-pipeline` | A-BROKEN | 3/0/4 |  | `docs/tui-stream-chunking-review.md`<br>`docs/tui-stream-chunking-tuning.md`<br>`docs/tui-stream-chunking-validation.md` |
| `spine.overview` | A-BROKEN | 2/14/16 | 12461 | `core/src/tools/spec.rs`<br>`tools/src/tool_registry_plan.rs` |
| `ref.env-vars` | A-BROKEN | 2/21/27 | 8249 | `app-server/src/codex_message_processor.rs`<br>`core/src/tools/js_repl/mod.rs` |
| `tool.web-search` | A-BROKEN | 2/9/11 | 7625 | `tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs` |
| `tool.image-generation` | A-BROKEN | 2/8/10 | 4849 | `tools/src/tool_registry_plan.rs`<br>`core/src/tools/spec.rs` |
| `spine.trace-apply-patch` | A-BROKEN | 2/7/9 | 4264 | `tools/src/apply_patch_tool.rs`<br>`tools/src/tool_registry_plan.rs` |
| `spine.trace-mcp-call` | A-BROKEN | 2/5/7 | 4178 | `tools/src/tool_registry_plan.rs`<br>`codex-mcp/src/mcp_connection_manager.rs` |
| `ref.session-tasks` | A-BROKEN | 2/6/8 | 913 | `core/src/tasks/undo.rs`<br>`core/src/tasks/ghost_snapshot.rs` |
| `subsys.config-auth.credential-storage` | A-BROKEN | 2/4/7 | 289 | `device-key/src/lib.rs`<br>`device-key/src/platform.rs` |
| `subsys.mcp.name-qualification` | A-BROKEN | 2/0/2 |  | `codex-mcp/src/mcp_tool_names.rs`<br>`codex-mcp/src/mcp_connection_manager.rs` |
| `ref.key-types` | A-BROKEN | 1/15/16 | 12881 | `tools/src/tool_registry_plan_types.rs` |
| `subsys.tui.chatwidget` | A-BROKEN | 1/1/2 | 11098 | `tui/src/history_cell.rs` |
| `subsys.core.unified-exec` | A-BROKEN | 1/9/11 | 4479 | `tools/src/tool_registry_plan.rs` |
| `config.storage-telemetry-misc` | A-BROKEN | 1/5/7 | 3688 | `core/src/config_loader/mod.rs` |
| `spine.shell-exec-flow` | A-BROKEN | 1/11/12 | 3640 | `tools/src/tool_registry_plan.rs` |
| `subsys.config-auth.hooks` | A-BROKEN | 1/7/8 | 2709 | `hooks/src/engine/config.rs` |
| `rpc.overview` | A-BROKEN | 1/2/5 | 1800 | `app-server/src/transport/mod.rs` |
| `rpc.thread-methods` | A-BROKEN | 1/1/2 | 1798 | `app-server-protocol/src/protocol/v2.rs` |
| `rpc.turn-methods` | A-BROKEN | 1/1/2 | 1798 | `app-server-protocol/src/protocol/v2.rs` |
| `rpc.fs-command-methods` | A-BROKEN | 1/1/2 | 1798 | `app-server-protocol/src/protocol/v2.rs` |
| `rpc.config-account-methods` | A-BROKEN | 1/1/2 | 1798 | `app-server-protocol/src/protocol/v2.rs` |
| `rpc.mcp-skills-plugin-methods` | A-BROKEN | 1/1/2 | 1798 | `app-server-protocol/src/protocol/v2.rs` |
| `rpc.notifications-thread` | A-BROKEN | 1/1/2 | 1798 | `app-server-protocol/src/protocol/v2.rs` |
| `rpc.notifications-system` | A-BROKEN | 1/1/2 | 1798 | `app-server-protocol/src/protocol/v2.rs` |
| `rpc.server-requests` | A-BROKEN | 1/1/2 | 1798 | `app-server-protocol/src/protocol/v2.rs` |
| `subsys.core.tool-router` | A-BROKEN | 1/3/4 | 1594 | `core/src/tools/spec.rs` |
| `subsys.mcp.transports` | A-BROKEN | 1/4/6 | 906 | `codex-mcp/src/mcp_connection_manager.rs` |
| `subsys.mcp.connectors` | A-BROKEN | 1/3/5 | 849 | `codex-mcp/src/mcp_connection_manager.rs` |
| `subsys.tui.architecture` | A-BROKEN | 1/1/2 | 781 | `docs/tui-alternate-screen.md` |
| `subsys.platform.git-utils` | A-BROKEN | 1/3/8 | 538 | `git-utils/src/ghost_commits.rs` |
| `subsys.tui.overlays-dialogs` | A-BROKEN | 1/1/3 | 457 | `docs/exit-confirmation-prompt-design.md` |
| `subsys.mcp.client` | A-BROKEN | 1/0/1 |  | `codex-mcp/src/mcp_connection_manager.rs` |
| `subsys.tui.bottom-pane` | A-BROKEN | 1/0/2 |  | `docs/tui-chat-composer.md` |
| `subsys.app-server.message-processor` | A-BROKEN | 1/0/1 |  | `app-server/src/codex_message_processor.rs` |
| `subsys.app-server.transport` | A-BROKEN | 1/0/3 |  | `app-server/src/transport` |
| `subsys.app-server.client-libs` | A-BROKEN | 1/0/3 |  | `debug-client/src` |
| `subsys.cloud.cloud-requirements` | A-BROKEN | 1/0/1 |  | `cloud-requirements/src/lib.rs` |
| `spine.turn-end-to-end` | B-HEAVY | 0/9/9 | 8706 |  |
| `spine.sq-eq-architecture` | B-HEAVY | 0/6/6 | 6840 |  |
| `subsys.core.approval-guardian` | B-HEAVY | 0/13/13 | 6286 |  |
| `subsys.core.collaboration-modes` | B-HEAVY | 0/9/13 | 5738 |  |
| `spine.process-lifecycle` | B-HEAVY | 0/4/4 | 5707 |  |
| `spine.context-and-compaction` | B-HEAVY | 0/8/8 | 5546 |  |
| `subsys.core.session-lifecycle` | B-HEAVY | 0/10/10 | 5399 |  |
| `subsys.core.compaction` | B-HEAVY | 0/6/6 | 5170 |  |
| `config.auth-account` | B-HEAVY | 0/5/5 | 4487 |  |
| `ref.data-model` | B-HEAVY | 0/7/8 | 4299 |  |
| `subsys.core.review-mode` | B-HEAVY | 0/5/6 | 4228 |  |
| `subsys.core.approval-policy` | B-HEAVY | 0/5/6 | 4170 |  |
| `subsys.core.realtime-conversation` | B-HEAVY | 0/6/6 | 4040 |  |
| `config.skills-plugins-features` | B-HEAVY | 0/5/6 | 3999 |  |
| `config.mcp-tools` | B-HEAVY | 0/7/7 | 3978 |  |
| `subsys.core.rollout-persistence` | B-HEAVY | 0/6/6 | 3934 |  |
| `config.approval-sandbox` | B-HEAVY | 0/4/5 | 3869 |  |
| `config.ui-tui` | B-HEAVY | 0/4/4 | 3580 |  |
| `config.agents-memory` | B-HEAVY | 0/4/4 | 3515 |  |
| `subsys.config-auth.profiles` | B-HEAVY | 0/4/4 | 3483 |  |
| `config.model-provider` | B-HEAVY | 0/5/5 | 3327 |  |
| `subsys.platform.analytics` | B-HEAVY | 0/5/5 | 3316 |  |
| `subsys.core.state-db` | B-HEAVY | 0/8/10 | 3197 |  |
| `cli.global-flags` | B-HEAVY | 0/5/7 | 2813 |  |
| `subsys.mcp.oauth` | B-HEAVY | 0/6/6 | 2571 |  |
| `subsys.core.context-manager` | B-HEAVY | 0/6/6 | 2511 |  |
| `ref.protocol-op` | B-HEAVY | 0/1/1 | 2365 |  |
| `ref.protocol-event-lifecycle` | B-HEAVY | 0/1/1 | 2365 |  |
| `ref.protocol-event-streaming` | B-HEAVY | 0/1/1 | 2365 |  |
| `cli.subcommands` | B-HEAVY | 0/1/1 | 2205 |  |
| `subsys.core.turn-engine` | B-HEAVY | 0/3/3 | 2122 |  |
| `subsys.config-auth.skills` | C-DRIFT | 0/4/6 | 1782 |  |
| `subsys.exec-sandbox.apply-patch-engine` | C-DRIFT | 0/3/4 | 1360 |  |
| `subsys.platform.agent-identity` | C-DRIFT | 0/2/2 | 1229 |  |
| `subsys.providers.provider-bedrock` | C-DRIFT | 0/5/8 | 1077 |  |
| `subsys.config-auth.plugins` | C-DRIFT | 0/5/6 | 1001 |  |
| `subsys.exec-sandbox.arg0-dispatch` | C-DRIFT | 0/3/4 | 899 |  |
| `subsys.config-auth.auth-flows` | C-DRIFT | 0/4/5 | 882 |  |
| `subsys.providers.model-catalog` | C-DRIFT | 0/4/6 | 829 |  |
| `subsys.providers.overview` | C-DRIFT | 0/3/4 | 774 |  |
| `subsys.exec-sandbox.overview` | C-DRIFT | 0/3/3 | 691 |  |
| `subsys.app-server.session-management` | C-DRIFT | 0/1/1 | 687 |  |
| `subsys.config-auth.features-system` | C-DRIFT | 0/3/3 | 676 |  |
| `sdk.ts-structured-output` | C-DRIFT | 0/3/8 | 655 |  |
| `subsys.core.trace-bundle` | C-DRIFT | 0/10/14 | 649 |  |
| `subsys.providers.http-client` | C-DRIFT | 0/4/7 | 571 |  |
| `cli.exec-mode` | C-DRIFT | 0/2/3 | 550 |  |
| `subsys.platform.network-proxy` | C-DRIFT | 0/7/7 | 546 |  |
| `subsys.tui.event-system` | C-DRIFT | 0/1/1 | 530 |  |
| `ref.feature-flags` | C-DRIFT | 0/1/1 | 501 |  |
| `subsys.exec-sandbox.exec-server` | C-DRIFT | 0/1/3 | 476 |  |
| `subsys.exec-sandbox.sandbox-linux` | C-DRIFT | 0/1/2 | 449 |  |
| `subsys.exec-sandbox.sandbox-windows` | C-DRIFT | 0/1/2 | 449 |  |
| `subsys.providers.retry-errors` | C-DRIFT | 0/5/8 | 445 |  |
| `subsys.providers.sse-streaming` | C-DRIFT | 0/3/3 | 416 |  |
| `subsys.providers.auth-layer` | C-DRIFT | 0/4/4 | 369 |  |
| `subsys.exec-sandbox.shell-escalation` | C-DRIFT | 0/1/2 | 304 |  |
| `subsys.mcp.server` | C-DRIFT | 0/3/3 | 272 |  |
| `ref.protocol-items` | C-DRIFT | 0/2/2 | 254 |  |
| `command.config-system` | C-DRIFT | 0/2/2 | 215 |  |
| `subsys.cloud.cloud-tasks` | C-DRIFT | 0/3/6 | 209 |  |
| `subsys.platform.realtime` | C-DRIFT | 0/4/7 | 190 |  |
| `subsys.providers.provider-openai` | C-DRIFT | 0/3/3 | 186 |  |
| `subsys.cloud.cloud-task-api` | C-DRIFT | 0/4/4 | 179 |  |
| `subsys.platform.telemetry-otel` | C-DRIFT | 0/3/4 | 149 |  |
| `ref.crate-index` | C-DRIFT | 0/1/1 | 130 |  |
| `command.session-thread` | C-DRIFT | 0/1/1 | 118 |  |
| `command.model-mode` | C-DRIFT | 0/1/1 | 118 |  |
| `command.code-review` | C-DRIFT | 0/1/1 | 118 |  |
| `command.tools-integrations` | C-DRIFT | 0/1/1 | 118 |  |
| `command.realtime-debug` | C-DRIFT | 0/1/1 | 118 |  |
| `subsys.platform.terminal-detection` | C-DRIFT | 0/2/2 | 114 |  |
| `sdk.ts-overview` | C-DRIFT | 0/1/6 | 105 |  |
| `subsys.providers.responses-api` | C-DRIFT | 0/4/7 | 93 |  |
| `subsys.exec-sandbox.sandbox-seatbelt` | C-DRIFT | 0/1/1 | 88 |  |
| `subsys.providers.provider-oss` | C-DRIFT | 0/2/6 | 74 |  |
| `subsys.exec-sandbox.process-hardening` | C-DRIFT | 0/1/1 | 20 |  |
| `subsys.exec-sandbox.execpolicy-dsl` | C-DRIFT | 0/1/6 | 9 |  |
| `sdk.ts-events-items` | C-DRIFT | 0/2/3 | 3 |  |
| `subsys.exec-sandbox.shell-parsing` | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.status-surfaces` | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.onboarding` | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.rendering-theming` | D-CLEAN | 0/0/2 |  |  |
| `subsys.platform.file-search` | D-CLEAN | 0/0/4 |  |  |
| `ref.uncertainty` | D-CLEAN | 0/0/0 |  |  |
