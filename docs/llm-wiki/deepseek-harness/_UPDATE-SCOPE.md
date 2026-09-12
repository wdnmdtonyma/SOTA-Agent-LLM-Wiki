# UPDATE SCOPE — deepseek-harness wiki（d347e70390 → c291e7961a）

> 完成日期：2026-09-12
>
> **base**（上一轮 verified / 父仓旧 gitlink）：`d347e703908d0406b7a7ef80e3a0e594d86b2215`（`0.1.3-alpha.1`）
>
> **target**（官方 `deepseek-ai/deepseek-harness` `origin/master`）：`c291e7961a515f6d7af9304e7fd1d257929aef26`（`0.1.5-rc.2`；describe `dsh-v0.1.5-rc.2-139-gc291e7961a`）
>
> 最终 submodule checkout：detached `c291e7961a`
>
> 方法约束仍以 `RUN.md` 和 `conventions.md` 为准。本轮执行：影响分级 → 并行 filler（rewrite/refresh/remap/create）→ 4 批独立 L2 证伪并就地修 → 机械证据重落 + SHA bump → `llms.txt` 登记新节点 → reconcile ×2 → lint。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/deepseek-ai/deepseek-harness`，默认分支 `master`，base 是 target 的祖先。终验再 fetch，`origin/master` 未再漂移。

```text
1301 commits
6327 files changed
165004 insertions(+)
36468 deletions(-)
```

复现：

```bash
git -C deepseek-harness rev-list --count d347e70390..c291e7961a
git -C deepseek-harness diff --shortstat d347e70390..c291e7961a
```

中间 tag：`dsh-v0.1.3-alpha.2` → `dsh-v0.1.5-alpha.1` → `alpha.2` → `dsh-v0.1.5-rc.1` → `dsh-v0.1.5-rc.2`。

## 2. 204 个基线节点的影响分级

分级把基线 `index.json` 的 `source[]` 与 target diff 交叉（见 `_staging/impact-c291e7961a.json`）：

| 分级 | 数量 | 处理 |
|---|---:|---|
| A-BROKEN | 11 | inbox 迁到 `agent-loop`；`message-feedback/src/spec.ts` 删除；`DetailsPanel.tsx` 删除；`native/landlock-run/package.json` 删除 |
| B-HEAVY | 115 | refresh 行号与假话；语义断裂面 rewrite |
| C-DRIFT | 76 | refresh + 机械 `[E:]` 重落 |
| D-CLEAN | 2 | SHA bump（`ref.uncertainty` 由 reconcile 重建） |

最大语义断裂：

- `SESSION_FORMAT_VERSION` 2 → **3**，新增 `session-format-v2-to-v3`（`system/message`；preset id `code`→`ptc`）
- `packages/core/agent/src/inbox.ts` → `packages/core/agent-loop/src/inbox.ts`（`ReactLoopInbox`）
- base 默认模型 `deepseek-v4-flash` → **`deepseek-flash`**（catalog 两者并存；acp-app 与 SDK **客户端**构造仍默认 v4-flash）
- 新模型可见工具 `present`；`str_replace_editor` 退出出厂路径
- minimal 变为仅 persistent shell
- message-feedback 进 Session log（不再是 storage-domain sidecar）
- `desktop` Electron 壳：不是 `PROFILE_TEMPLATES` 成员；CLI `--profile desktop` 被拒

## 3. Inventory 变化

### 退役节点（保留 id）

| 节点 | 现语义 |
|---|---|
| `surface.tools.report` | 工具包已删除；退役映射 |
| `subsys.persistence.sqlite` | session-persistence-sqlite 已删除；页继续退役 + 指向仍活的 query/storage sqlite |
| `surface.tools.str-replace-editor` | **不退役**：包在、出厂不挂 |

### 新增节点（2）

| 节点 | 判定 |
|---|---|
| `surface.tools.present` | 新 wire 名；standard/ptc/cordis；`deliverables/presented` |
| `surface.profiles.desktop` | Electron 无端口壳；不是 CLI profile |

fold 进既有节点：`session-format-v2-to-v3` → `subsys.persistence.session-format`；workspace-files / open-in-app / resources / 右侧 sidebar → workbench / ui-layout / apiproxy / bundle-web-app；`package-manifest` → app-boot。

最终节点数：**206**（204 − 0 + 2；T0 12 / T1 59 / T2 122 / T3 13）。`packages/**/package.json` = 275（含 7 个 `@fixture/*`）；产品叶 268。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| Session format v3 | `SESSION_FORMAT_VERSION = 3`；v0→v1→v2→v3。`system/message` 进 derived history。`spine.session-log`、`subsys.core.session`、`subsys.persistence.session-format`、`ref.session-events` |
| Handle 缝 | 仍是 `SessionHandle` + JSONL + lease；无 coordinator |
| 默认模型 | base `deepseek-flash`；acp / SDK 客户端默认仍 `deepseek-v4-flash`。`subsys.core.agent-default-model`、`subsys.llm.deepseek` |
| `present` | `surface.tools.present`；catalog / presets 活行 |
| minimal | 仅 persistent shell。`surface.presets.minimal` |
| Feedback | `feedback/message-put|delete` + `feedback/record`。`subsys.interaction.feedback` |
| Desktop | `surface.profiles.desktop`；`rejectElectronProfile` |
| Inbox | `ReactLoopInbox` 在 agent-loop。`subsys.core.agent-inbox` |
| persona | bundle `personaPrefix`/`personaSuffix`；preset `prefix`/`suffix` |

## 5. L2 独立证伪

另起 4 个干净 subagent，对语义批次对照 `c291e7961a` 源码证伪（不信 filler / update-facts）。4/4 `verified=true`。就地修了错绑行号与若干假句。

| 批次 | 结果 | 就地修正要点 |
|---|---|---|
| format / session | pass | 不存在的 `seedSource`；crash-recovery `load()` 含合成 closer；lease 读者/expiry 过宽；composeAgent 不读投影 |
| tools / presets / present | pass | present schema 只有 `files[]`；str_replace 出厂不挂；ptc≠standard 仅差 presentation；`list_subagent_models` 默认不算装 |
| model / composition / desktop | pass | 补 SDK 客户端仍默认 v4-flash；`seedConfig` 属 `prepareRequest` 不是 `buildRequest` |
| inbox / feedback / catalogs | pass | 删 `extend({ agent: this })`；header 无 `seedLength`；包数 275/7 fixture/268 |

残余 `[U]`（既有 staging，reconcile 并入 `reference/uncertainty.md`）：官方 `docs/glossary.md` 仍写 flat scope；UPDATE-INSTRUCTIONS 初稿把 275 写成「无 fixture」（已改正）。

## 6. 不确定项

`reference/uncertainty.md` 由 reconcile 从 `_staging/uncertainty-*.md` 重生（本轮合并 38 个 staging 文件）。

## 7. 元数据与引用收敛

- 全部 verified node frontmatter：`updated: c291e7961a`
- `index.json.updated` 与所有 `index.nodes[].updated`：`c291e7961a`
- `README.md`、`llms.txt`、`index.json` 的节点计数一致（206）
- `conventions.md` §7 已改到 format v3 / inbox 在 agent-loop / `present` / desktop 非 CLI profile
- submodule 源码工作树 clean（detached `c291e7961a`）
- 机械 rebase：`e-retargeted=450`，`e-missing-path=0`

## 8. 最终验证

```bash
git -C deepseek-harness rev-parse --short=10 HEAD   # c291e7961a
git -C deepseek-harness rev-parse --short=10 origin/master  # c291e7961a
git -C deepseek-harness status --short              # empty
node docs/llm-wiki/deepseek-harness/tools/reconcile.mjs
node docs/llm-wiki/deepseek-harness/tools/reconcile.mjs
node docs/llm-wiki/deepseek-harness/tools/lint.mjs   # 0 error(s), 0 warning(s) · 206 nodes
```

完成条件已满足：206 verified / 0 planned；`lint` 0/0；二次 reconcile 幂等；复拉后无 post-freeze drift。父仓 gitlink 仍显示 `d347e70390`（工作树已 checkout `c291e7961a`，待与 wiki 一起提交）。
