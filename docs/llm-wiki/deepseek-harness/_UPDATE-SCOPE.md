# UPDATE SCOPE — deepseek-harness wiki（0a53fb55be → d347e70390）

> 完成日期：2026-09-07
>
> **base**（上一轮 verified / 父仓旧 gitlink）：`0a53fb55bea101816fa226bb964ae2bed71c343b`（`0.1.2-alpha.2`）
>
> **target**（官方 `deepseek-ai/deepseek-harness` `origin/master`）：`d347e703908d0406b7a7ef80e3a0e594d86b2215`（`0.1.3-alpha.1`）
>
> 最终 submodule checkout：detached `d347e70390`
>
> 方法约束仍以 `RUN.md` 和 `conventions.md` 为准。本轮执行：workflow `dsh-wiki-update`（**9 个批次 filler，无逐节点 L2**；用户明确要求控并发、不过度 verify）→ lead SHA bump + 证据行号重落 → `llms.txt` 登记新节点 → reconcile ×2 → lint。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/deepseek-ai/deepseek-harness`，默认分支 `master`，base 是 target 的祖先。

```text
750 commits
3995 files changed
98213 insertions(+)
55700 deletions(-)
```

复现：

```bash
git -C deepseek-harness rev-list --count 0a53fb55be..d347e70390
git -C deepseek-harness diff --shortstat 0a53fb55be..d347e70390
```

中间 tag：`dsh-v0.1.2-alpha.3` → `alpha.4` → `alpha.5` → `dsh-v0.1.2-rc.1` → `dsh-v0.1.3-alpha.1`。

## 2. 201 个基线节点的影响分级

分级把基线 `index.json` 的 `source[]` 与 target diff 交叉（见 `_staging/impact-d347e70390.json`）：

| 分级 | 数量 | 处理 |
|---|---:|---|
| A-BROKEN | 63 | source 删除/移动。其中大半是本轮删掉的 `invariant.ts` 与 `cordis.yml` fixture，remap 即可；真正语义断裂集中在 persistence / report / python runtime |
| B-HEAVY | 32 | source churn 大，refresh 行号与假话 |
| C-DRIFT | 104 | source 有改动；lead 机械 SHA bump + `[E:]` 重落；已知假话（format v0、sqlite 盘、report 活行）在 rewrite/catalog 批次清掉 |
| D-CLEAN | 2 | 只 bump SHA |

最大机械断裂：

- `SESSION_FORMAT_VERSION` 0 → **2**，新增 adjacent migration 链（不再是「无 migration」）
- `packages/session/session-persistence/src/coordinator.ts` 等编排文件删除，缝改为 `SessionHandle`
- 删除 `packages/session/session-persistence-sqlite`（session 盘只剩 JSONL；`session-query-sqlite` / `storage-sqlite` 仍在）
- 删除 `packages/subagent/tool-subagent-report`
- `packages/code-runtime/code-runtime-python` → `packages/experimental/code-runtime-python`（现为真正的 `CodeRuntime` Provider）
- 绝大多数包级 `src/invariant.ts` 删除（251 → 39）
- 测试 fixture `cordis.yml` → `*.patch.yml`

## 3. Inventory 变化

### 退役节点（保留 id）

| 节点 | 现语义 |
|---|---|
| `surface.tools.report` | 工具包已删除；退役映射 |
| `subsys.persistence.sqlite` | session-persistence-sqlite 已删除；页改为退役 + 指向仍活的 query/storage sqlite |

### 新增节点（3）

| 节点 | 判定 |
|---|---|
| `subsys.persistence.session-format` | v0→v1→v2 adjacent 链 + catalog；jsonl load 走这条 |
| `subsys.client.file-upload` | web-app 挂载的浏览器上传服务 |
| `subsys.util.http-proxy` | 进程级出站代理库，不是 Cordis 插件 |

未为 `session-turn-outline` 另建节点：它是 web-app 上的 projection unit，写入 `subsys.persistence.projection`。

最终节点数：**204**（201 − 0 + 3；T0 12 / T1 57 / T2 122 / T3 13）。叶 package 251 → ~265（package-index 排除 `@fixture/*` 后记 255）。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| Session format v2 | `SESSION_FORMAT_VERSION = 2`；v0→v1→v2 在 JSONL load 时走 catalog。`spine.session-log`、`subsys.core.session`、`subsys.persistence.session-format`、`ref.session-events` |
| Handle 缝 | `create`/`open` → `SessionHandle`。`subsys.persistence.session-persistence` / `jsonl`（含 write lease） |
| SQLite session 盘 | 包删除。`subsys.persistence.sqlite` 退役页 |
| report 工具 | 包删除。`surface.tools.report` 退役；catalog 去活行 |
| PTC `workflow` | preset 里 `tool-workflow` `disabled: true`，engine 留给 `ralph`。`surface.presets.code`、`ref.presets` |
| Python runtime | experimental Provider，spawn `python3`。`subsys.execution.code-runtime-python` |
| http-proxy | `profile-boot.ts` 安装 undici dispatcher。`subsys.util.http-proxy` |
| file-upload | web-app 行。`subsys.client.file-upload` |

## 5. 证伪策略（本轮刻意收窄）

用户要求控并发、不过度 verify。因此：

- **没有**对 200+ 节点各派独立 L2 verifier。
- 9 个批次 filler（每波最多 3 并行）：rewrite 语义断裂面，remap invariant 缺失，refresh 重 churn，create 3 个新节点。
- filler 被要求每页抽检至少 3 条 `[E:]`。
- lead 用 lint 抓机械漂移（缺失路径、空行/注释行号），并跑证据重落脚本。

残余风险：C-DRIFT 页可能仍有未改的过时叙述，但 format v0 / sqlite 盘 / report 活行这类跨页假话已作为批次硬约束。

## 6. 不确定项

`reference/uncertainty.md` 由 reconcile 从 `_staging/uncertainty-*.md` 重生。本轮 filler 若写下 `uncertainty-update-*`，会并进去。

## 7. 元数据与引用收敛

- 全部 verified node frontmatter：`updated: d347e70390`
- `index.json.updated` 与所有 `index.nodes[].updated`：`d347e70390`
- `README.md`、`llms.txt`、`index.json` 的节点计数一致
- `conventions.md` §7 已改到 format v2 / 退役包 / experimental python / PTC workflow disabled
- submodule 源码工作树 clean（detached `d347e70390`）

## 8. 最终验证

```bash
git -C deepseek-harness rev-parse --short=10 HEAD   # d347e70390
git -C deepseek-harness status --short              # empty
node docs/llm-wiki/deepseek-harness/tools/reconcile.mjs
node docs/llm-wiki/deepseek-harness/tools/reconcile.mjs
node docs/llm-wiki/deepseek-harness/tools/lint.mjs   # 0 error(s), 0 warning(s) · 204 nodes
```

完成条件已满足：204 verified / 0 planned；`lint` 0/0；二次 reconcile 幂等。父仓 gitlink 仍显示 `+d347e70390`（工作树已 checkout，待与 wiki 一起提交）。
