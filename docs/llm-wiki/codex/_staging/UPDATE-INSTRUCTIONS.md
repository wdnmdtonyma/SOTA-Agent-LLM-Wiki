# Codex wiki 增量刷新令（02a8f038b8 → 3abbf9fe2c）

给 filler / L2 verifier 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径重映射、架构事实和文件纪律。

Filler 自己核 `[E:]`（每页至少抽 3 条 `read_file` 对行），写完将 `status: verified`。过宽结论宁可降 `[I]/[U]`。Lead 填完后会另起独立 L2，再 L3。

## 冻结点

- **base**(上一轮 verified): `02a8f038b8` (`02a8f038b87ad34d4a1dc5058eda26972ed7aa6c`)
- **target**(必须对照的源码 HEAD): `3abbf9fe2c` (`3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8`)
- 源码根: 仓库 `codex/`（相对本 wiki `../../../codex/`）
- 节点 `updated:` 一律写成 `3abbf9fe2c`
- 源码已 detached checkout 到 target。判断路径是否存在：`test -f` / `test -d` 或看 git 跟踪文件。
- 未跑大型 Rust/runtime 测试，不要宣称 tests 通过。

## 路径重映射（frontmatter `source:` 与 `[E:]` 必须改到右边）

| 旧路径 | 新路径 / 处理 |
|---|---|
| `codex-rs/core/src/context/personality_spec_instructions.rs` | **已删除**。不要再引用。personality 选择器从 TUI 去掉；feature/config 字段仍在。 |
| `codex-rs/core/src/context/world_state/personality.rs` | **已删除**。同上 |
| `codex-rs/core/src/context/world_state/personality_tests.rs` | **已删除**。同上 |
| `codex-rs/tui/src/bottom_pane/chat_composer/sparkle.rs` | **已删除**。Astra sparkle 动画退出 composer |
| `codex-rs/tui/src/app/agents_overview_composer.rs` | **已删除**。command center 改走 `agents_overview_new.rs` / grouping / usage |
| `codex-rs/windows-sandbox-rs/src/bin/setup_main/win.rs` | `codex-rs/windows-sandbox-rs/src/setup_provisioning.rs` |
| app-server `ThreadRollback*` schema | **已删除**。`thread/rollback` RPC 不存在 |

找不到替换文件就从 `source:` 删掉该条。禁止把 `[E:]` 指到已删除路径。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **`Op::ThreadRollback` 已删**。Op **28**。不要在 spine / session-lifecycle / ghost-undo / thread-store 再写活路径。错误枚举 `ThreadRollbackFailed` 仍在。
2. **`thread/rollback` client RPC 已删**。client RPC **166**。`rpc.thread-methods` 去掉该方法行；不要写 deprecation notice 还在 ship。磁盘撤销继续是 `thread/revert`。
3. **Slash `Personality` 已删**。SlashCommand **59**。`command.model-mode` 去掉 `/personality` 行与 symbols。`Feature::Personality` 与 `ConfigToml.personality` 仍在。
4. **`send_message_to_user_async` 双门控**：`Feature::SendMessageToUserAsync` **或** catalog 名。只写 catalog 就是假话。
5. **Features 144**：+`use_xaa`、+`send_message_to_user_async`，都是 UnderDevelopment、默认关。`worktrees` 现 Stable 默认开。
6. **ConfigToml 102**：+`mcp_enterprise_managed_auth`（`config/src/mcp_ema.rs`）。写入 `config.mcp-tools`，不要新建节点。
7. **Windows MXC** 接到 exec / managed network / app-server setup。写入 `subsys.exec-sandbox.sandbox-windows`。setup 从 `bin/setup_main/win.rs` 迁到 `setup_provisioning.rs`。
8. **TUI command center**：可从 overview 开新 session / worktree；sparkle 已删。写入现有 tui / slash 页。
9. **Catalog 重数（以源码为准，不要抄旧 wiki）**：
    - workspace members **147**
    - Feature keys / enum **144**
    - Op **28**、EventMsg **83**
    - SlashCommand **59**
    - ConfigToml pub 字段 **102**
    - CLI Subcommand **29**
    - client RPC **166**
    - notifications **84**
    - server requests **11**
    - 工具节点 **39**、wiki 节点 **185**
10. **不要写**：Op 29 / slash 60 / RPC 167 / features 142 / ConfigToml 101 / `/personality` 仍 shipped / `thread/rollback` 仍稳定 / worktrees Experimental 默认关 / async user message 只看 catalog。
11. **不要新建节点**。

## 本轮新节点（0）

无。

## filler 纪律

只写两类文件：

1. 自己批次里的节点 `docs/llm-wiki/codex/<path>`
2. 可选 `_staging/uncertainty-update-<slug>.md`

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、别人批次的节点、`codex/` 源码。

步骤：

1. 读本文件 + `../_staging/update-facts-3abbf9fe2c.md` + `conventions.md` 对应模板。
2. 读现有节点 `.md`（remap 批次不要写成空模板；rewrite 批次保留仍成立的问题列表）。
3. 用 `read_file` / `grep` 读 **target** 源码。`source:` 失效路径先按上表重映射，再核对文件确实存在。
4. 每个 load-bearing 论断的 `[E: path:line]` 必须落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. `status: verified`（自己核过至少 3 条 `[E:]`）或 `draft`（核不完），`updated: 3abbf9fe2c`，`evidence: explicit`。
6. 跑 lint 时只处理带自己 `node:<path>` 的报错。

### 按批次深度

- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留。
- **remap**：禁止从零重写。删缺失 source、改 `[E:]`、改过时一句；其余不动。
- **refresh**：对照变更过的 source 修假话、重落行号，不扩写。
- **create**：本轮不用。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 当 `[E]`；冲突时跟代码。
