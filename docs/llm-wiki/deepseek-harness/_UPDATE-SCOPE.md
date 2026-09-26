# UPDATE SCOPE — deepseek-harness wiki（c291e7961a → 477b4f4205）

> 完成日期：2026-09-25
>
> **base**（上一轮 verified / 父仓旧 gitlink）：`c291e7961a515f6d7af9304e7fd1d257929aef26`（`0.1.5-rc.2`）
>
> **target**（官方 `deepseek-ai/deepseek-harness` `origin/master`）：`477b4f420553e8a52c2fbccc464d7561b239c443`（`0.1.7-rc.2`；describe `dsh-v0.1.7-rc.2`）
>
> 最终 submodule checkout：detached `477b4f4205`
>
> 方法约束仍以 `RUN.md` 和 `conventions.md` 为准。本轮执行：影响分级 → 并行 filler（rewrite/refresh/retire/create）→ 独立 L2 证伪并就地修 → L3 复核改句 → 机械证据重落 + SHA bump → `llms.txt` 登记新节点 → reconcile ×2 → lint。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/deepseek-ai/deepseek-harness`，默认分支 `master`，base 是 target 的祖先。

```text
3511 commits
8702 files changed
1334135 insertions(+)
155240 deletions(-)
```

复现：

```bash
git -C deepseek-harness rev-list --count c291e7961a..477b4f4205
git -C deepseek-harness diff --shortstat c291e7961a..477b4f4205
```

中间 tag：`dsh-v0.1.6-alpha.1` → `alpha.2` → `dsh-v0.1.7-alpha.1` → `alpha.2` → `dsh-v0.1.7-rc.1` → `dsh-v0.1.7-rc.2`。

## 2. 206 个基线节点的影响分级

分级把基线 `index.json` 的 `source[]` 与 target diff 交叉（见 `_staging/impact-477b4f4205.json`）。删除源被机械分类记进 churn，所以 A-BROKEN=0；语义上 agent-presets / e2b / code-runtime / tool-present 等死路径按 rewrite/retire 处理。

| 分级 | 数量 | 处理 |
|---|---:|---|
| A-BROKEN | 0 | 机械 0；语义死路径走 remap/retire |
| B-HEAVY | 122 | refresh 行号与假话；语义断裂面 rewrite |
| C-DRIFT | 83 | refresh + 机械 `[E:]` 重落 |
| D-CLEAN | 1 | SHA bump（`ref.uncertainty` 由 reconcile 重建） |

最大语义断裂：

- `SESSION_FORMAT_VERSION` 3 → **4**，新增 `session-format-v3-to-v4`；`tool/result` 抬成 first-class `role: 'tool'`
- 目录 preset `packages/preset/agent-presets` 删除 → 声明式 `@deepseek-ai/dsh-agent-preset` + registry；出厂声明只叠在 `dsh-web-app/presets/*.patch.yml`
- `ctx.codeRuntime` → **`ctx.ptcRuntime`**；`packages/code-runtime/**` 删除
- `packages/e2b/**` 删除；远程缝 `packages/ssh/*`
- `present` 包迁到 `packages/deliverables/tool-present`
- 新模型可见工具：`load_workspace_dependencies`、`plugin_manager`（出厂 disabled）
- `OPTIONAL_BUNDLES`：agent-team-profile / voice-input-bundle / auto-review
- ptc 出厂 `workflow-ptc` / `tool-workflow` / `tool-ralph` 全 disabled；`subagent_fork` 出厂 `backgroundMode: continuable`

## 3. Inventory 变化

### 退役节点（保留 id）

| 节点 | 现语义 |
|---|---|
| `subsys.execution.e2b` | E2B 包已删除；退役映射到 ssh |
| `surface.tools.report` | 继续退役 |
| `subsys.persistence.sqlite` | 继续退役 |

### 新增节点

| 节点 | 判定 |
|---|---|
| `surface.tools.workspace-dependencies` | wire `load_workspace_dependencies`；sdk-app 挂 |
| `surface.tools.plugin-manager` | wire `plugin_manager`；出厂 disabled |
| `subsys.execution.ssh` | SSH 缝 + fs/subprocess/sandbox providers |

fold：session-format-v3-to-v4 → `subsys.persistence.session-format`；optional bundles / plugin-manager 服务 → app-boot / `surface.cli.plugin`；voice / browser-use / computer-use 不单开节点。

最终节点数：**209**（206 − 0 + 3；T0 12 / T1 61 / T2 123 / T3 13）。`packages/**/package.json` = **321**（7 typert fixture + 2 skill template）；产品叶 `packages/*/*` = **312**。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| Session format v4 | `spine.session-log`、`subsys.core.session`、`subsys.persistence.session-format`、`ref.session-events` |
| 声明式 preset | `subsys.composition.agent-presets`、`surface.presets.*`、`spine.composition-boot` |
| PTC runtime | `subsys.execution.code-runtime`、`subsys.core.code-mode`、`surface.tools.run-code`、`spine.trace-code-mode` |
| SSH / E2B | `subsys.execution.ssh`、退役 `subsys.execution.e2b`、`spine.capability-seams` |
| 新工具 | `surface.tools.workspace-dependencies`、`surface.tools.plugin-manager`、`ref.tools-catalog` |
| Optional bundles | `subsys.composition.app-boot`、`spine.overview` |
| 默认模型 | 仍 base `deepseek-flash`；acp/SDK 客户端 `deepseek-v4-flash` |

## 5. L2 独立证伪与 L3

另起干净 subagent，对照 `477b4f4205` 源码证伪（不信 filler / update-facts）。语义批次均 `verified=true`。L3 只复核 L2 改句。

| 批次 | L2 | L3 |
|---|---|---|
| spine overview / boot / loop / session | pass，无再改（retry 轮） | 无改句，不单开 |
| spine traces / compaction | pass；行号与 section 计数就地修 | `l2_fixes_hold=true` |
| presets / composition | pass；recompose/blank、空根 `applyEntryPatches`、若干行号 | `l2_fixes_hold=true` |
| PTC / session v4 / ssh / 新工具 | pass；`:ptc:` call id、Python `resolve()` 拒任何显式 timeout、若干 `[E]` 落点 | `l2_fixes_hold=true` |
| T3 catalogs | pass；补 `pluginManager`/`profileContext`/`schedule`；e2b→ssh；surface 五元 | 核心 hold；对照官方 docs 的过宽句 L3 又收紧 |

残余 `[U]`：`dsh-agent-tool-presentation` JSDoc 写缺 `ptcRuntime` 则 mount 失败，可执行路径是 pending + native `echo`；`ctx-keys` 未穷尽全部 Context merge；官方 docs 与代码的个别漂移。

## 6. 不确定项

`reference/uncertainty.md` 由 reconcile 从 `_staging/uncertainty-*.md` 重生。

## 7. 元数据与引用收敛

- 全部 verified node frontmatter：`updated: 477b4f4205`
- `index.json.updated` 与所有 `index.nodes[].updated`：`477b4f4205`
- `README.md`、`llms.txt`、`index.json` 的节点计数一致（209）
- `conventions.md` §7 已改到 format v4 / 声明式 preset / `ctx.ptcRuntime` / ssh / 新工具
- submodule 源码工作树 detached `477b4f4205`（仅上游未跟踪 `deepseek-ai-collaboration-report.html`）
- 机械 rebase：`e-retargeted=185`，`e-missing-path=0`

## 8. 最终验证

```bash
git -C deepseek-harness rev-parse --short=10 HEAD   # 477b4f4205
git -C deepseek-harness rev-parse --short=10 origin/master  # 477b4f4205
git -C deepseek-harness status --short
node docs/llm-wiki/deepseek-harness/tools/reconcile.mjs
node docs/llm-wiki/deepseek-harness/tools/reconcile.mjs   # 第二次：0 节点更新
node docs/llm-wiki/deepseek-harness/tools/lint.mjs   # 0 error(s), 0 warning(s) · 209 nodes
```

完成条件已满足：209 verified / 0 planned；`lint` 0/0；二次 reconcile 幂等；复拉后无 post-freeze drift。父仓 gitlink 工作树指向 `477b4f4205`（待与 wiki 一起提交）。
