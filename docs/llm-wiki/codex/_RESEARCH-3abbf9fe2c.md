# Codex `02a8f038b8..3abbf9fe2c` 源码差分研究

> 研究日期：2026-09-14
> Wiki verified base：`02a8f038b87ad34d4a1dc5058eda26972ed7aa6c`
> 目标源码：官方 `openai/codex` `origin/main` = `3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8`（短 SHA `3abbf9fe2c`）
> HEAD 提交：Extract Windows sandbox configuration preparation into a helper (#45312)
> 本文不是 Wiki 节点，不进 `index.json` / `llms.txt`。

## 1. 跨度

- 66 commits，669 files，`+24644 / -14981`；87 added / 18 deleted / 555 modified / 9 renamed。
- base 是 target 祖先。
- submodule 已 detached checkout 到 target。

复现：

```bash
git -C codex fetch origin main
git -C codex rev-list --count 02a8f038b87ad34d4a1dc5058eda26972ed7aa6c..3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8
git -C codex diff --shortstat 02a8f038b87ad34d4a1dc5058eda26972ed7aa6c..3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8
```

## 2. 机械分级（185 基线节点）

目录型 `source:` 不算缺失。真正登记 source 文件缺失的 A-BROKEN 是 0：删除的 personality / sparkle / ThreadRollback schema 文件**没有**出现在任何 node `source:` 里，但正文仍在写这些概念。

| 分级 | 数量 | 说明 |
|---|---:|---|
| A-BROKEN | 0 | 已登记 source 路径在 target 仍存在 |
| B-HEAVY | 0 | 无节点直接 source churn ≥ 2000 |
| C-DRIFT | 158 | 至少一个直接 source 改动 |
| D-CLEAN | 27 | 已登记 source 未改；仍 bump SHA |

最高 churn（仍按 C-DRIFT）：`tool.request-permissions` 844、`subsys.tui.architecture` 826、`subsys.tui.overlays-dialogs` 809。

重命名（均未打进 wiki `source:`）：TUI composer sparkle snapshots → `snapshot_tests`；Windows `setup_main/win.rs` → `setup_provisioning.rs`。

语义上必须当 rewrite 的删除（即使不是 A-BROKEN）：

1. `Op::ThreadRollback` 与 client RPC `thread/rollback` 及 schema/tests。
2. TUI `SlashCommand::Personality`；world_state personality 文件删除。
3. TUI Astra sparkle composer 删除。

## 3. Inventory 变化

### Workspace crates：仍 **147**

`Cargo.toml` members 第 3–149 行共 **147** 条。无 member 增删。

### Features：142 → **144**

新增 key，无删除：

| key | enum | stage | default |
|---|---|---|---|
| `use_xaa` | `UseXaa` | UnderDevelopment | false |
| `send_message_to_user_async` | `SendMessageToUserAsync` | UnderDevelopment | false |

另：`worktrees` 现为 **Stable / default true**（旧 wiki 写 Experimental / false）。`personality` feature 仍在（Stable / true），只是 TUI slash 选择器删了。

### 工具集

`spec_plan.rs` 仅小幅 churn。无新增/删除/改名模型可见 core tool 节点。工具节点保持 **39**。

`send_message_to_user_async` 的注册条件**新增** `features.enabled(Feature::SendMessageToUserAsync) || catalog 含该名`。旧 wiki 只写 catalog 名。

### App-Server

- client requests：**167 → 166**。删除 `thread/rollback`。
- server notifications：**84** 不变（83 `=> "wire"` + `AccountLoginCompleted`）。
- server requests：**11** 不变（9 v2 + 2 legacy）。

### Protocol / CLI / config / slash

- `Op` **29 → 28**（删 `ThreadRollback`）。
- `EventMsg` **83** 不变。
- `ConfigToml` 顶层 pub 字段 **101 → 102**（加 `mcp_enterprise_managed_auth`）。
- CLI `Subcommand` **29** 不变。
- `SlashCommand` **60 → 59**：删 `Personality`（`/personality`）。

## 4. 必须按新架构重读的主题

1. **`thread/rollback` 与 `Op::ThreadRollback` 已删**。Paginated 客户端继续走 `thread/revert`。`CodexErrorInfo::ThreadRollbackFailed` 仍在错误枚举里，不要当成活 Op。
2. **TUI personality 选择器删除**：`SlashCommand::Personality` 不存在；`personality_spec_instructions.rs` / `world_state/personality.rs` 已删。Config `personality` 字段与 `Feature::Personality` 仍在。bundled GPT-5.4/5.5 内嵌 friendly instructions（#44930），不是 TUI 选择器。
3. **`send_message_to_user_async` 双门控**：root agent + (`Feature::SendMessageToUserAsync` 或 catalog 名)。
4. **`use_xaa` + `mcp_enterprise_managed_auth`**：企业 MCP IdP 只允许 host/user/managed 层选择；plugin/project 不能改 credential source。`use_xaa` 默认关。
5. **Worktrees 默认开**（Stable）。
6. **Windows MXC**：commit 把 MXC 接到 command execution、managed network policy、setup 经 app-server。仍 fold 进 `subsys.exec-sandbox.sandbox-windows`，不新建节点。
7. **TUI**：sparkle 动画删除；agents overview 加 grouping / usage / 从 command center 开新 session 与 worktree；voice 默认相关改动；folder consent 上一轮已写，本轮未撤。
8. **不要写**：Op 仍 29、slash 仍 60、client RPC 仍 167、features 仍 142、`/personality` 仍 shipped、`thread/rollback` 仍是稳定 wire、worktrees 仍 Experimental 默认关、`send_message_to_user_async` 只看 catalog 名。

## 5. 新增 / 退役节点判定

退役：无独立 Wiki 节点删除。

新增：**0**。新 feature / config / MXC wiring / TUI command center 全部 fold 进现有节点。

最终目标：**185 verified nodes**，全部 `updated: 3abbf9fe2c`。
