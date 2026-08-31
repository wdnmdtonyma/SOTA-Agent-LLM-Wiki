# UPDATE SCOPE — deepseek-harness wiki（47f943859b → 0a53fb55be）

> 完成日期：2026-08-31
>
> **base**（上一轮 verified / 父仓旧 gitlink）：`47f943859bef60e4160492346772ded9b24f765a`（`0.1.0-rc.5`）
>
> **target**（官方 `deepseek-ai/deepseek-harness` `origin/master`）：`0a53fb55bea101816fa226bb964ae2bed71c343b`（`0.1.2-alpha.2`）
>
> 最终 submodule checkout：detached `0a53fb55be`

方法约束仍以 `RUN.md` 和 `conventions.md` 为准。本轮执行：workflow `dsh-wiki-update-2`（fill + 独立 L2）→ lead reconcile ×2 → 证据行号重落 → `llms.txt` 登记新节点 → `lint` 0/0。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/deepseek-ai/deepseek-harness`，默认分支 `master`，base 是 target 的祖先。

```text
2167 commits
7673 files changed
420613 insertions(+)
141776 deletions(-)
```

复现：

```bash
git -C deepseek-harness rev-list --count 47f943859b..0a53fb55be
git -C deepseek-harness diff --shortstat 47f943859b..0a53fb55be
```

## 2. 183 个基线节点的影响分级

分级把基线 `index.json` 的 `source[]` 与 target diff 交叉：

| 分级 | 数量 | 处理 |
|---|---:|---|
| A-BROKEN | 147 | source 删除/移动，必须重定位 |
| B-HEAVY | 13 | 已登记 source churn ≥ 2,000 |
| C-DRIFT | 22 | source 有改动，逐 claim 核对 |
| D-CLEAN | 1 | `ref.uncertainty`（reconcile 重生） |

最大机械断裂：

- preset 根 `apps/cli/config/agent-presets/` → `packages/preset/agent-presets/presets/`，目录名 `code` → `ptc`
- `packages/core/tools/src/code-mode.ts` → `packages/core/tools/src/ptc.ts`
- 删除 `packages/host/apiproxy`、`packages/client/runtime`、`packages/client/web-react`、`packages/client/schema-form`

D-CLEAN 只允许省略语义重写，不允许跳过 target SHA。uncertainty 由 reconcile 从 `_staging/uncertainty-*.md` 重生。

## 3. Inventory 变化

### 退役节点

无。下列 id 保持稳定别名，正文与 source 跟新实现：

| 节点 | 现语义 |
|---|---|
| `surface.presets.code` | PTC preset，`presets/ptc/` |
| `subsys.core.code-mode` | `ptc.ts`；`run_code`；TS/Python flavor |
| `subsys.host.apiproxy` | `packages/api/{session,settings,workspace}-controller` |
| `subsys.client.runtime` | `packages/client/store` + session-controller 客户端 |

### 新增节点（18）

| 节点 | 判定 |
|---|---|
| `surface.tools.pwsh-persistent` | 新持久 `pwsh` 包，对标 bash-persistent |
| `surface.tools.agent-team` | experimental Agent Teams 模型可见工具族 |
| `surface.profiles.sdk` | `PROFILE_TEMPLATES.sdk` = base + sdk-app |
| `surface.profiles.sdk-minimal` | 唯一不叠 `dsh-base` 的 shipped profile |
| `surface.profiles.acp` | `PROFILE_TEMPLATES.acp` = base + acp-app |
| `subsys.composition.bundle-sdk-app` | SDK JSON-RPC 模式 bundle |
| `subsys.composition.bundle-sdk-minimal` | 独立 SDK 树 |
| `subsys.composition.bundle-acp-app` | ACP 自动化 bundle |
| `subsys.orchestration.agent-team` | `ctx.agentTeams` roster/mailbox/task board |
| `subsys.integration.webhook` | `ctx.webhookRuntime` + GitHub adapter |
| `subsys.execution.code-runtime-python` | PTC Python flavor provider |
| `subsys.context.file-reference` | file-reference 缝 + local provider |
| `subsys.persistence.session-log-deepseek` | base 挂载的 DeepSeek 日志方言 |
| `subsys.llm.deepseek-extensions` | LLM API 扩展 + 官方插件 inventory |
| `subsys.client.store` | 浏览器状态家 |
| `subsys.client.ui-renderer` | 原 `web-react` bind/scoped-slots |
| `subsys.client.ui-chat` | ConversationNode 装配 |
| `subsys.client.ui-session` | 会话列表 / 选择 |

最终 **201 个 verified nodes**：

| Tier | 数量 |
|---|---:|
| T0 | 12 |
| T1 | 57 |
| T2 | 119 |
| T3 | 13 |

其中 tool nodes 32；shipped profile 5；shipped bundle 6；shipped preset 4（`minimal` / `standard` / `ptc` / `cordis`）。

叶 package 219 → 251。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| Profiles | `web`(live)、`headless` / `sdk` / `sdk-minimal` / `acp`(startup)。`sdk-minimal` 不叠 base。`spine.composition-boot`、三个新 profile 页、三个新 bundle 页。 |
| PTC | 旧 Code Mode。权威 `packages/core/tools/src/ptc.ts`；`run_code`；TS 与 Python flavor。`surface.presets.code`、`subsys.core.code-mode`、`surface.tools.run-code`。 |
| HTTP API | apiproxy 删除；session/settings/workspace controller。`subsys.host.apiproxy` 就地改写。 |
| Client | runtime/web-react 删除；store + ui-renderer + ui-chat + ui-session。 |
| Agent Teams | experimental opt-in，`ctx.agentTeams`。工具族页须逐名入表。 |
| webhook | `ctx.webhookRuntime`；GitHub 是 shipped provider。 |
| pwsh-persistent | 与 bash-persistent 对称的持久 PTY 工具。 |

## 5. L2 独立证伪

workflow `dsh-wiki-update-2` 对 182 个既有节点 + 18 个新节点各派独立 verifier（`effort: low`），报告 201/201 verified。Survey 事实写在 `_staging/update-facts-0a53fb55be.md`。

Lead 后处理纠正了 lint 能抓到、L2 漏掉的机械问题：179 条 `[E:]` 落在注释/空行，统一挪到最近的非注释代码行；18 条新节点补进 `llms.txt`。括号行警告一并清掉。

## 6. 不确定项

`reference/uncertainty.md` 由 reconcile 从 35 个 `_staging/uncertainty-*.md`（含 7 个本轮 `uncertainty-update-*`）重生。继续保留的 `[U]` 见该页，主要包括 PTC/Code Mode 边界、approval、retry、config-keys 等未在源码钉死的契约。

未为 inspector / webworker preview 另建节点：它们是 experimental 私有预览，不是 Harness 应用入口（`docs/architecture.md` Application launch）。

## 7. 元数据与引用收敛

- 全部 201 个 verified node frontmatter：`updated: 0a53fb55be`
- `index.json.updated` 与所有 `index.nodes[].updated`：`0a53fb55be`
- `README.md`、`llms.txt`、`index.json` 的节点计数一致（T0 12 / T1 57 / T2 119 / T3 13）
- `conventions.md` §7 与 `RUN.md` 的 preset/profile/PTC/退役包约定已改到 target
- 失效 source 均已重定位；submodule 源码工作树 clean（detached `0a53fb55be`）

## 8. 最终验证

```bash
git -C deepseek-harness rev-parse --short=10 HEAD   # 0a53fb55be
git -C deepseek-harness status --short              # empty
node docs/llm-wiki/deepseek-harness/tools/reconcile.mjs
node docs/llm-wiki/deepseek-harness/tools/reconcile.mjs
node docs/llm-wiki/deepseek-harness/tools/lint.mjs   # 0 error(s), 0 warning(s) · 201 nodes
```

完成条件：201 verified / 0 planned；`lint` 0/0；二次 reconcile 幂等。
