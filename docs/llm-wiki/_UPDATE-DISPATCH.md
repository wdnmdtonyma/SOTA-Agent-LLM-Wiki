# UPDATE DISPATCH — LLM Wiki 三仓增量更新总令(2026-07-01)

> 给执行更新的 **codex** 会话读。本文件是三个 wiki(`codex` / `opencode` / `pi`)这一轮增量更新的总调度。
> 每个 wiki 的**逐节点工作清单**在各自的 `docs/llm-wiki/<wiki>/_UPDATE-SCOPE.md`(附录 A 是自动生成的分级表)。
> 方法论(单节点 L1→L2→L3、证据分级、模板、lint)在各自的 `RUN.md` + `conventions.md`,本文件不重复。

## 背景

三个上游 submodule 已 checkout 到最新 HEAD(父仓 commit `c3ebd35`)。各 wiki 的 `index.json` 仍 verified 在**旧** HEAD;本轮任务就是把 wiki 追到新 HEAD。基线/目标 SHA 见下表与各 `_UPDATE-SCOPE.md`。

| wiki | 上游分支 | 基线(wiki)→ 目标(新 HEAD) | commit | 节点总数 | A-BROKEN | B-HEAVY | C-DRIFT | D-CLEAN | **需动手(A+B+C)** |
|---|---|---|---|---|---|---|---|---|---|
| **pi** | `main` | `5a073885` → `8c943640` | 34 | 176 | 0 | 0 | 38 | 138 | **38** |
| **codex** | `main` | `5670360009` → `db887d03e1` | 328 | 171 | 1 | 4 | 151 | 15 | **156** |
| **opencode** | `dev` | `355a0bcf5` → `8b68dc0d7` | 514 | 183 | 22 | 0 | 137 | 24 | **159** |
| **合计** | | | 876 | 530 | 23 | 4 | 326 | 177 | **353** |

分级含义(详见各 `_UPDATE-SCOPE.md` 附录 A):**A-BROKEN**=引用了已删/移文件,必改 source 列;**B-HEAVY**=无删除但 churn≥2000 行;**C-DRIFT**=轻中度行漂移,重核 `[E:path:line]` 行号;**D-CLEAN**=源全未变,仅快速复核 + bump `updated`。

## 推荐执行顺序(由易到难,让流程先热起来)

1. **pi**(最轻,~半天):0 结构性失效,改动几乎全是 `packages/ai/src/providers/*.models.ts`(自动生成的模型目录)。38 个 C-DRIFT 集中在 `ref.ai.*` 目录型 reference 节点 + 少量 ai 子系统;138 个 D-CLEAN 走快速复核。先拿它把「读 RUN.md → 改节点 → lint → reconcile」的流程跑顺。
2. **codex**(量大但机械):唯一 1 个 A-BROKEN 已定位(`jsonrpc_lite.rs` → `rpc.rs`,节点 `rpc.overview`)。其余是 4 个 B-HEAVY + 151 个 C-DRIFT——**路径基本稳,主要是重核行号**,可按 `_UPDATE-SCOPE.md` §3 的分组切多个并发会话。
3. **opencode**(最重,放最后):22 个 A-BROKEN 要先修(其中 ~6 个是 `groups/*` 移到 `packages/protocol/` 的机械路径修,~7 个是 v2 core 真删除、要读新结构重定位)。v1/v2 + plugin 系统在活跃重构,churn 面最广。等前两个把流程磨顺再啃。

## 每个 wiki 的执行闭环

对每个 wiki(在 `docs/llm-wiki/<wiki>/` 内):

1. **读令**:`RUN.md`(方法论)+ `conventions.md`(模板/证据)+ `_UPDATE-SCOPE.md`(本轮工作清单,附录 A 逐节点分级)。
2. **先修 A-BROKEN**:按 `_UPDATE-SCOPE.md` §1 改 source 路径 / 读新结构重定位。
3. **再做 B-HEAVY / C-DRIFT**:按附录 A 从 churn 大的往小的做,逐节点 L1→L2→L3,把 `[E:path:line]` 行号重新落准。
4. **D-CLEAN 快速复核**:只确认 path/行号仍成立,`status` 保持 verified、`updated` bump 到新短 SHA;除非复核发现行号漂了才走完整 L2。
5. **新增面扫描**:按 `_UPDATE-SCOPE.md` §2 判断上游新增文件是否需要**新节点**,缺则按 `conventions.md` 建节点并登记 `index.json` + `llms.txt`。
6. **收尾**:`node tools/reconcile.mjs`(frontmatter → index.json,合并 `_staging`)→ 把 `index.json` 顶层 `updated` 改成新短 SHA → `node tools/lint.mjs` 全绿。

## 并发模型(按各 RUN.md §8)

一个 wiki 内可多会话并发,每个会话认领 `_UPDATE-SCOPE.md` §3 里的一组节点:
- **只写自己那批的 node `.md`**(frontmatter 带 `status: verified` + `updated: <新短 SHA>`)。
- **不碰共享文件** `index.json` / `llms.txt` / `reference/uncertainty.md`——`[U]` 写到 `_staging/uncertainty-<batch>.md`,收尾由一个会话统一 reconcile。
- 跨 wiki 之间天然隔离(不同目录),可并行。

## 完成定义(整轮)

- 三个 `index.json` 均无 `planned`,顶层 `updated` 分别为 `8c943640` / `db887d03e1` / `8b68dc0d7`。
- 每个节点 frontmatter `updated` = 对应新短 SHA;A-BROKEN 的 source 列已修;载重论断有可核到的 `[E:path:line]`。
- 三个 `node tools/lint.mjs` 全绿;`reference/uncertainty.md` 汇总本轮全部 `[U]`。
- 新增子系统/工具(如 codex 的 `code-mode-protocol`/`connectors`、opencode 的 v2 plugin)已判定「建新节点」或「本轮跳过并在此记一笔」。

## git 隔离坑(务必)

输出只往非 git 的 `docs/llm-wiki/<wiki>/` 写;**不要**往 `../../../<wiki>/`(源仓)写任何文件——subagent isolation 会清掉源仓未跟踪文件。
