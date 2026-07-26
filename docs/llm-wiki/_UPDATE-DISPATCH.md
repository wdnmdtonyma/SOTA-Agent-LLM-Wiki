# UPDATE DISPATCH — LLM Wiki 三仓增量更新总令(2026-07-26)

> 给执行更新的 **codex** 会话读。本文件是三个 wiki(`codex` / `opencode` / `pi`)这一轮增量更新的总调度。
> 每个 wiki 的**逐节点工作清单**在各自的 `docs/llm-wiki/<wiki>/_UPDATE-SCOPE.md`(附录 A 是自动生成的分级表)。
> 方法论(单节点 L1→L2→L3、证据分级、模板、lint)在各自的 `RUN.md` + `conventions.md`,本文件不重复。

## 背景

三个上游 submodule 先在父仓 commit `ae45606` 钉到 2026-07-26 首轮观察值;收尾复拉时 Pi 又快进 1 个 README-only commit，因此最终目标抬到 `cee5ff7520`。各 wiki 已完成上一轮 2026-07-19 基线;本轮任务是把 wiki 从该基线追到最终 HEAD。官方身份、release、compare 与结构性断点的独立核验见 `../research/2026-07-26-codex-opencode-pi-upstream.md`;基线/目标 SHA 见下表与各 `_UPDATE-SCOPE.md`。

| wiki | 上游分支 | 基线(wiki)→ 目标(新 HEAD) | commit | 基线节点 | A-BROKEN | B-HEAVY | C-DRIFT | D-CLEAN | **需动手(A+B+C)** |
|---|---|---|---|---|---|---|---|---|---|
| **codex** | `main` | `4d7a5c7c73` → `61a44880a8` | 275 | 172 | 3 | 3 | 150 | 16 | **156** |
| **opencode** | `dev` | `67caf894e` → `7534d23551` | 101 | 186 | 0 | 0 | 27 | 159 | **27** |
| **pi** | `main` | `3da591ab` → `cee5ff7520` | 124 | 180 | 12 | 1 | 121 | 46 | **134** |
| **合计** | | | 500 | 538 | 15 | 4 | 298 | 221 | **317** |

分级含义(详见各 `_UPDATE-SCOPE.md` 附录 A):**A-BROKEN**=引用了已删/移文件,必改 source 列或退役节点;**B-HEAVY**=无删除但 source churn≥2000 行;**C-DRIFT**=轻中度行漂移,重核 `[E:path:line]` 行号;**D-CLEAN**=已登记 source 全未变,仍需快速复核 + bump `updated`。表中是更新前节点集合的精确 source 路径扫描;新增目录/能力另做语义扫描。

更新后 verified 节点为 Codex 172（退役 2、新增 2）、OpenCode 188（新增 2）、Pi 186（新增 6），合计 546。

## 本轮执行分工

三个 wiki 由三个独立 Codex worktree 并行更新,主会话负责钉住 submodule、合入、复核与最终提交:

1. **pi(结构变化最集中)**:`packages/orchestrator`→`packages/server`;新增 `packages/storage/sqlite-node`、private `packages/evals`、AgentHarness execution tools 与 constrained sampling。先修 12 个失效 source,再更新 package topology、模型目录/OAuth/RPC/compaction。
2. **codex(覆盖面最广)**:退役 `spawn_agents_on_csv`/`report_agent_job_result`;重定位 HTTP client;重点重读 paginated thread history、MCP runtime、multi-agent、remote code-mode、plugins、app-server protocol、network policy 与 TUI。
3. **opencode(结构断点最少)**:已登记 source 无删除;重点不是普通行漂移,而是 app 的 legacy/current 双协议迁移、session timeline/event transport、provider reasoning/cache、repository cache 与 grep symlink 语义。

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

- 三个 `index.json` 共 546 个节点且均无 `planned`,顶层 `updated` 分别为 `61a44880a8`(codex)/ `7534d23551`(opencode)/ `cee5ff7520`(pi)。
- 每个节点 frontmatter `updated` = 对应新短 SHA;A-BROKEN 的 source 列已修;载重论断有可核到的 `[E:path:line]`。
- 三个 `node tools/lint.mjs` 全绿;`reference/uncertainty.md` 汇总本轮全部 `[U]`。
- 新增/退役面(Codex agent-jobs/remote code-mode/Agent Plugins;OpenCode app hybrid migration;Pi server/SQLite/evals/harness tools/constrained sampling)均已判定「建新节点」「并入既有」「退役」或「明确跳过」。

## git 隔离坑(务必)

输出只往非 git 的 `docs/llm-wiki/<wiki>/` 写;**不要**往 `../../../<wiki>/`(源仓)写任何文件——subagent isolation 会清掉源仓未跟踪文件。
