# Codex wiki 增量刷新令（121f91fd5d → 02a8f038b8）

给 filler / L2 verifier 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径重映射、架构事实和文件纪律。

Filler 自己核 `[E:]`（每页至少抽 3 条 `read_file` 对行），写完将 `status: verified`。过宽结论宁可降 `[I]/[U]`。Lead 填完后会另起独立 L2，再 L3。

## 冻结点

- **base**(上一轮 verified): `121f91fd5d` (`121f91fd5d9dc66017866ce9bdc49f1e182721df`)
- **target**(必须对照的源码 HEAD): `02a8f038b8` (`02a8f038b87ad34d4a1dc5058eda26972ed7aa6c`)
- 源码根: 仓库 `codex/`（相对本 wiki `../../../codex/`）
- 节点 `updated:` 一律写成 `02a8f038b8`
- 源码已 detached checkout 到 target。判断路径是否存在：`test -f` / `test -d` 或看 git 跟踪文件。
- 未跑大型 Rust/runtime 测试，不要宣称 tests 通过。

## 路径重映射（frontmatter `source:` 与 `[E:]` 必须改到右边）

| 旧路径 | 新路径 / 处理 |
|---|---|
| `codex-rs/core/src/compact_remote.rs` | **已删除**。改读 `codex-rs/core/src/compact_remote_v2.rs` + `compact_remote_history.rs`（及 `compact_remote_v2_attempt.rs` 如需要） |
| `codex-rs/core/src/compact_remote_request.rs` | **已删除**。同上 |
| `codex-rs/codex-api/src/endpoint/compact.rs` | **已删除**。不要再引用 |
| `codex-rs/thread-store/src/local/writer_lock.rs` | `codex-rs/rollout/src/writer_lock.rs` |
| `codex-rs/ext/guardian-v2/src/sync_reviewer/reviewer_config.rs` | **已删除**。改读 `codex-rs/ext/guardian-reviewer/src/{lib,settings,execution,review}.rs` |
| `codex-rs/ext/guardian-v2/src/sync_reviewer/prompt.rs` | **已删除**。改读 `guardian-reviewer` 的 assessment / completion |

找不到替换文件就从 `source:` 删掉该条。禁止把 `[E:]` 指到已删除路径。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **Remote compact v1 文件已删**。`core/src/lib.rs` 只 `mod compact_remote_history` + `mod compact_remote_v2`。本地 compact 仍是 `compact.rs`。任务入口走 `compact_remote_v2::run_remote_compact_task` / `run_inline_remote_auto_compact_task`。
2. **`writer_lock` 在 `rollout` crate**，不是 thread-store/local。
3. **Guardian 同步 reviewer 下沉 `ext/guardian-reviewer`**：crate 自述 owns synchronous review policy；host 提供 attempt、执行决策。`guardian-v2` 的 `sync_reviewer::install` 只注册 `ThreadLifecycleContributor`，把 `GuardianReviewSessionHost` 放进 thread store。不要再写 `reviewer_config.rs` / `prompt.rs` 仍存在。
4. **`user-verification` 是新 workspace member**：本地凭证与签名，独立于 RPC 路由。RPC 仍是 `userVerification/{status,enroll,delete,verify}`，本轮加 **`userVerification/cancel`**。不要另建节点：写入 `rpc.config-account-methods` / `subsys.config-auth.auth-flows`。
5. **Thread attachments**：client RPC `thread/attachment/{add,list,remove}` + notification `thread/attachment/updated`。写入 `rpc.thread-methods` / `rpc.notifications-thread` / `subsys.core.thread-store`。
6. **`memory/status`** 是 `#[experimental]` client RPC。写入 `rpc.mcp-skills-plugin-methods`（或该页已有 memory 分组）+ `subsys.core.memory`。不要新建节点。
7. **SlashCommand 仍 60**：删 `SandboxReadRoot`（`/sandbox-add-read-dir` 行必须从 `command.config-system` 去掉）；加 `Voice`（`/voice`，`/voice settings` 选音色）到 `command.realtime-debug`。`voice_command_enabled` 为假时 popup 过滤掉 `Voice`。
8. **TUI folder consent**：创建或 resume TUI task 之前跑 `onboarding::check_directory_trust`。HEAD 就是这件事。`subsys.tui.onboarding` / `spine.process-lifecycle` 不要写成“只在首次 onboarding 问一次”。
9. **Features 142**：+`api_key_model_discovery`（OpenAI API key 的 opt-in model discovery）+`codex_apps_mcp_2026_07_28`。都是 UnderDevelopment、默认关。
10. **Catalog 重数（以源码为准，不要抄旧 wiki）**：
    - workspace members **147**（`Cargo.toml` members 第 3–149 行，含 `exec-server/tests/support`）
    - Feature keys / enum **142**
    - Op **29**、EventMsg **83**
    - SlashCommand **60**
    - ConfigToml pub 字段 **101**
    - CLI Subcommand **29**
    - client RPC **167**
    - notifications：从 `server_notification_definitions!` 重数（**84** = 83 个 `=> "wire"` + `AccountLoginCompleted`）
    - server requests：**11** = 宏里 9 个带 `=> "path"` 的 v2 + 2 个 legacy `ApplyPatchApproval` / `ExecCommandApproval`
    - 工具节点 **39**、wiki 节点 **185**
11. **不要写**：145 crates / 148 crates / 140 features / 162 client RPC / notifications 仍 83 / `SandboxReadRoot` 仍 shipped / `compact_remote.rs` 仍存在 / sync reviewer 仍用 `reviewer_config.rs`。
12. **不要新建节点**。不要为 guardian-reviewer / user-verification / attachments / voice 另开文件。

## 本轮新节点（0）

无。

## filler 纪律

只写两类文件：

1. 自己批次里的节点 `docs/llm-wiki/codex/<path>`
2. 可选 `_staging/uncertainty-update-<slug>.md`

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、别人批次的节点、`codex/` 源码。

步骤：

1. 读本文件 + `../_staging/update-facts-02a8f038b8.md` + `conventions.md` 对应模板。
2. 读现有节点 `.md`（remap 批次不要写成空模板；rewrite 批次保留仍成立的问题列表）。
3. 用 `read_file` / `grep` 读 **target** 源码。`source:` 失效路径先按上表重映射，再核对文件确实存在。
4. 每个 load-bearing 论断的 `[E: path:line]` 必须落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. `status: verified`（自己核过至少 3 条 `[E:]`）或 `draft`（核不完），`updated: 02a8f038b8`，`evidence: explicit`。
6. 跑 lint 时只处理带自己 `node:<path>` 的报错。

### 按批次深度

- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留。
- **remap**：禁止从零重写。删缺失 source、改 `[E:]`、改过时一句；其余不动。
- **refresh**：对照变更过的 source 修假话、重落行号，不扩写。
- **create**：本轮不用。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 当 `[E]`；冲突时跟代码。
