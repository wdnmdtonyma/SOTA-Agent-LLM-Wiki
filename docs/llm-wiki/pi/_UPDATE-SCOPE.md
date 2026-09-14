# UPDATE SCOPE — Pi Wiki（bbb61e34aa → 71dca871bc）

> 完成日期：2026-09-14
>
> **base**（上一轮 verified / 父仓旧 gitlink）：`bbb61e34aaf231639fdaaad1adbd757947034eac`
>
> **target**（官方 `earendil-works/pi` `origin/main`）：`71dca871bc80b6bc97be37f0ca3189399d651fff`（产品版本仍 **0.85.1**，本轮全在 `[Unreleased]`）
>
> 冻结时 submodule checkout：detached `71dca871bc`
>
> 方法约束仍以 `RUN.md` 和 `conventions.md` 为准。本轮执行：影响分级 → 机械 SHA bump + `--safe-only` 证据 rebase → 3 个并行 filler（rewrite/refresh）→ 高价值节点独立 L2 证伪 → 独立 L3 → `llms.txt` / README / index 登记 → reconcile ×2 → lint。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/earendil-works/pi`，默认分支 `main`，base 是 target 的祖先。

```text
21 commits
29 files changed
3505 insertions(+)
1111 deletions(-)
```

复现：

```bash
git -C pi rev-list --count bbb61e34aaf231639fdaaad1adbd757947034eac..71dca871bc80b6bc97be37f0ca3189399d651fff
git -C pi diff --shortstat bbb61e34aaf231639fdaaad1adbd757947034eac..71dca871bc80b6bc97be37f0ca3189399d651fff
```

无新 release tag。最新 commit：`fix(ci): Fix a broken test`（2026-09-11）。`git diff --name-status` **无删除文件**。插入量大部分是 `packages/agent/docs/pico/**` 手稿，**不进入 wiki 节点**。

## 2. 200 个基线节点的影响分级

分级把基线 `index.json` 的 `source[]` 与 target diff 交叉（见 `_staging/impact-71dca871bc.json`）。`docs/extensions.md` 的 4 行 Fireworks 说明会把一串 extension 页抬成 C-DRIFT；执行时按主题收束：

| 分级 | 机械数量 | 实际处理 |
|---|---:|---|
| A-BROKEN | 0 | 无 source 删除 |
| B-HEAVY | 0 | 无单节点 churn ≥ 2000 |
| C-DRIFT | 23 | 主题 rewrite：evals + catalog；refresh：Mistral/Fireworks/Google stop reason；其余 SHA bump / exact `[E:]` rebase |
| D-CLEAN | 177 | 只 bump SHA |

最大语义变化：

- Fireworks Messages 打开 `supportsToolReferences`
- DeepSeek 硬编码 `deepseek-flash`（V4.1 Flash）替换 `deepseek-v4-flash` / `deepseek-v4-flash-vision-exp`
- Codex catalog 下架 `gpt-5.4` / `gpt-5.4-mini`
- Mistral `zai-glm-5-2` 走 `reasoning_effort`
- Google `TOO_MANY_TOOL_CALLS` 退出 exhaustive map
- Eval：isolated HOME、inline prompt transform、`--repetitions`、`models.eval.ts` / `providers.eval.ts`、`report.txt`/`report.json`

## 3. Inventory 变化

无退役、无新增节点。最终仍 **200**（T0 12 / T1 35 / T2 120 / T3 33）。

**不要**把 `packages/agent/docs/pico*/**` 当 shipped 源或新节点。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| Fireworks deferred tools | `subsys.ai.model-discovery`、`subsys.ai.anthropic-messages` |
| DeepSeek Flash 更名/定价 | `ref.ai.model-catalog`、`subsys.ai.model-discovery`、`subsys.ai.model-catalog-publication` |
| Codex 下架 GPT-5.4 | 同上；不要改 Azure/Copilot 默认 id |
| Mistral GLM-5.2 reasoning | `subsys.ai.mistral-conversations` |
| Google stop reason | `subsys.ai.google-generative-ai`（确认不再列 `TOO_MANY_TOOL_CALLS`） |
| Eval isolation / transform / repetitions | `subsys.evals.pi-harness` |
| models/providers comparative evals + 落盘报告 | `subsys.evals.comparative-harness` |

### Catalog 重数（以源码为准，本轮不变）

tools **8** · providers **40** · model buckets **39** · slash **23** · RPC **33** · extension events **36** · config keys **86** · env **103** · CLI **63** · keybindings **90** · interactive components **43** · TUI components **16**。

`createCodingToolDefinitions` / `createReadOnlyToolDefinitions` **仍不含** powershell。

## 5. 证伪策略

3 个 filler 覆盖主题 rewrite/refresh（filler 自核 ≥3 条 `[E:]`）。随后按 `RUN.md`：

- **L2**：3 个独立 verifier。evals 0 改句；catalog 2 条 citation；protocol 3 条 citation。
- **L3**：catalog / protocol 均 `l2_fixes_hold=true`。lead 另修 2 个 lint error（Vertex 注释行、evals README 空行）和 1 个括号行 warning。
- 报告：`_research/update-bbb61e34aa-71dca871bc-l2.md`。

机械 SHA 页未逐页 L2。

## 6. 不确定项

`reference/uncertainty.md` 由 reconcile 从 `_staging/uncertainty-*.md` 重生。本轮 filler 写下的 `uncertainty-update-71dca871bc-*` 会并进去。

## 7. 元数据与引用收敛

- 全部 verified node frontmatter：`updated: 71dca871bc`
- `index.json.updated` 与所有 `index.nodes[].updated`：`71dca871bc`
- `README.md`、`llms.txt`、`index.json` 的节点计数一致（200）
- 未安装上游 `node_modules`，不宣称 runtime tests 通过

## 8. 最终验证

```bash
git -C pi rev-parse --short=10 HEAD   # 71dca871bc
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/reconcile.mjs   # 第二次：0 节点更新
node docs/llm-wiki/pi/tools/lint.mjs
```

完成条件：200 verified / 0 planned；`lint` 0 error；二次 reconcile 幂等。父仓 `pi` gitlink 工作树指向 `71dca871bc80b6bc97be37f0ca3189399d651fff`（尚未与 wiki 一起提交）。
