# Codex wiki 增量刷新令（3abbf9fe2c → 1cc7e23612）

给 filler / L2 verifier 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径重映射、架构事实和文件纪律。

Filler 自己核 `[E:]`（每页至少抽 3 条 `read_file` 对行），写完将 `status: verified`。过宽结论宁可降 `[I]/[U]`。Lead 填完后会另起独立 L2，再 L3。

## 冻结点

- **base**(上一轮 verified): `3abbf9fe2c` (`3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8`)
- **target**(必须对照的源码 HEAD): `1cc7e23612` (`1cc7e2361237ce7244430ee1d581c77f95c57ac8`)
- 源码根: 仓库 `codex/`（相对本 wiki `../../../codex/`）
- 节点 `updated:` 一律写成 `1cc7e23612`
- 源码已 detached checkout 到 target。判断路径是否存在：`test -f` / `test -d` 或看 git 跟踪文件。
- 未跑大型 Rust/runtime 测试，不要宣称 tests 通过。

## 路径重映射

见 `_staging/update-facts-1cc7e23612.md`。`source:` 与 `[E:]` 必须改到右边。找不到替换就删该条。禁止把 `[E:]` 指到已删除路径。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **`Op::InterruptIfNoPendingInput`**。Op **29**。
2. **Slash `Tui` / `Daemon` / `Warnings`**。SlashCommand **62**。
3. **CLI `TcpTunnel`**。Subcommand **30**。
4. **Features 152**：+8 keys，见 update-facts。
5. **ConfigToml 104**：+`cloud`、+`model_post_turn_compact_threshold_percent`。
6. **client RPC 170** / notifications **85** / server requests **11** / 合计 **266**。
7. **crates 153**、`ext/` **16**（+`ext/agent-message-board`）。
8. **Agent message board** 9 工具 + feature 门控，fold 进现有 extension / collaboration 页。
9. **Mermaid TUI 渲染** fold 进 tui rendering / config.ui-tui。
10. **WebSocket auth → `websocket-auth`；PluginId → `core-plugin-common`**。
11. **不要写**：crates 147 / features 144 / Op 28 / slash 59 / RPC 261 / ConfigToml 102 / CLI 29 / 已删路径仍活。
12. **不要新建节点**。工具节点仍 39。

## 本轮新节点（0）

无。

## filler 纪律

只写两类文件：

1. 自己批次里的节点 `docs/llm-wiki/codex/<path>`
2. 可选 `_staging/uncertainty-update-<slug>.md`

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、别人批次的节点、`codex/` 源码。

步骤：

1. 读本文件 + `../_staging/update-facts-1cc7e23612.md` + `conventions.md` 对应模板。
2. 读现有节点 `.md`（remap 批次不要写成空模板；rewrite 批次保留仍成立的问题列表）。
3. 用 `read_file` / `grep` 读 **target** 源码。`source:` 失效路径先按 remap 表改，再核对文件确实存在。
4. 每个 load-bearing 论断的 `[E: path:line]` 必须落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. `status: verified`（自己核过至少 3 条 `[E:]`）或 `draft`（核不完），`updated: 1cc7e23612`，`evidence: explicit`。
6. 跑 lint 时只处理带自己 `node:<path>` 的报错。

### 按批次深度

- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留。catalog 必须逐实例重数。
- **remap**：禁止从零重写。删缺失 source、改 `[E:]`、改过时一句；其余不动。
- **refresh**：对照变更过的 source 修假话、重落行号，不扩写。
- **create**：本轮不用。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 当 `[E]`；冲突时跟代码。
