# UPDATE DISPATCH — LLM Wiki 三仓增量更新完成记录（2026-08-03）

> 本文件记录本轮 `pi` / `codex` / `opencode` 三仓并行更新的最终目标、影响范围与验收结论。
> 单仓的逐项源码证据、L2 反证与残余风险，见各自的 `docs/llm-wiki/<wiki>/_UPDATE-SCOPE.md`。

## 1. 最终上游目标

三个会话分别在独立 worktree 中读取官方默认分支、审计真实 base→target diff、更新所属 Wiki 与 gitlink；主会话负责路径审计、cherry-pick、尾部漂移检查和总体验收。

| wiki | 官方分支 | verified base → 最终 target | commits | diff | 节点结果 |
|---|---|---|---:|---|---:|
| **pi** | `main` | `cee5ff7520` → `305c014dcc` | 258 | 419 files，+36,949 / -3,934 | 186 → **202**（+16 / -0） |
| **codex** | `main` | `61a44880a8` → `7750465934` | 217 | 1,123 files，+65,644 / -14,195 | 172 → **177**（+5 / -0） |
| **opencode** | `dev` | `7534d23551` → `89130db6b0` | 120 | 276 files，+10,169 / -2,683 | 188 → **188**（+0 / -0） |
| **合计** | | | **595** | +112,762 / -20,812 | 546 → **567 verified / 0 planned** |

Pi 在首次冻结 `a8ee03b815` 后连续发生尾部漂移；主会话多次派回原 Pi 会话，先后纳入 `a24fb9e96`（auth header deletion marker）、`c1019d920`（Baseten provider）、`0e633790c5`（batched terminal color reports）和 `305c014dcc`（transport-specific session authentication）。由于官方主线持续变化，本轮在 **2026-08-03 21:44:27 +0800** 将当时最新的 `305c014dcc` 定为点时快照；提交前 21:53:40 再 fetch 未发现 post-freeze drift。Codex 在提交前两次复拉，target 均保持 `7750465934`；OpenCode 终验时仍与 `origin/dev` 一致。

## 2. 节点影响与结构变化

| wiki | 基线影响分类 | 新增面与关键变化 |
|---|---|---|
| **pi** | 14 A-BROKEN / 0 B-HEAVY / 117 C-DRIFT / 55 D-CLEAN；后续尾差分批复核 provider/auth、TUI 与 protocol/client/server 节点 | 新增 protocol/client/composable server/remote session/TUI layout/agent harness/search/evals 等 16 节点；最终 39 runtime providers、38 model buckets，模型目录为带制品与时间快照边界的 1,169 `[I]`；补齐 batched color report 的 adapter 边界与 transport-specific session auth。 |
| **codex** | 5 A-BROKEN / 0 B-HEAVY / 138 C-DRIFT / 29 D-CLEAN | 新增 `wait-for-environment`、turn metadata、rollout budget、token budget、TUI keymap；覆盖 registry-first tools、standalone Code Mode runtime、thread sections、MCP 2026 双门控、plugins、App-Server 与 exec/network 变化。 |
| **opencode** | 0 A-BROKEN / 1 B-HEAVY / 42 C-DRIFT / 145 D-CLEAN | 无新增/退役节点；更新 Modal/provider catalog、MCP compatibility patch、App draft persistence、Desktop V2 sidecar、Console migration/usage、Stats catalog host。 |

各仓详细记录：

- Pi：[`pi/_UPDATE-SCOPE.md`](pi/_UPDATE-SCOPE.md)
- Codex：[`codex/_UPDATE-SCOPE.md`](codex/_UPDATE-SCOPE.md)
- OpenCode：[`opencode/_UPDATE-SCOPE.md`](opencode/_UPDATE-SCOPE.md)

## 3. 并行执行与独立证伪

- 三个产品在隔离 worktree 中分别提交，只允许修改自己的 `docs/llm-wiki/<wiki>/**` 与对应 gitlink。
- 每个会话按产品分面执行独立 L2 证伪；共享 `index.json` / `llms.txt` / uncertainty 仅由该产品主会话串行 reconcile。
- 主会话在 cherry-pick 前独立检查每个提交的路径清单与 staged gitlink，没有发现越界文件。
- L2 找到并修复了仅靠 lint 不能发现的过宽结论，包括 Codex 的 Code Mode fallback、MCP 2026/section UI 边界，OpenCode 的 Modal lookup/Console migration 边界，以及 Pi 的 ambient auth、null header marker 传递时序与 resolver insertion-order 限定。

## 4. 最终验收门槛

在父仓最终 checkout 中执行：

```bash
git -C pi fetch origin main
git -C codex fetch origin main
git -C opencode fetch origin dev

for wiki in pi codex opencode; do
  (cd docs/llm-wiki/$wiki && node tools/reconcile.mjs && node tools/reconcile.mjs && node tools/lint.mjs)
done

git submodule status
git diff --check
git status --short
```

完成条件：

- 三个 gitlink、submodule HEAD 与各自官方 remote target 一致，submodule 源码工作树 clean；
- 三个 index 合计 567 个节点，各仓内 ID 唯一，全部 `verified`、0 `planned`；顶层/index 节点/frontmatter `updated` 均为对应 10 位 target SHA；
- `index.json`、磁盘节点与 `llms.txt` 的节点集合一致；
- 每仓第二次 reconcile 幂等，lint 0 error / 0 warning；父仓 `git diff --check` 通过且最终工作树 clean。

## 5. 产品测试与残余风险边界

- **Pi**：未安装上游 `node_modules`，因此没有宣称 runtime tests 通过；1,169 models 包含官方 npm 制品与带时间、SHA-256 的 models.dev Baseten 快照，保持 `[I]`。
- **Codex**：本轮是源码证据与 Wiki 验证，没有运行大型 Rust/runtime 测试；7 个部署/长期契约问题保留为 `[U]`。
- **OpenCode**：Session UI 5 tests 与 Desktop builder 7 tests 通过；其余定向测试因内部 registry 404、缺包或 Bun `node:sqlite` 环境在收集阶段失败，不能算断言通过。Modal endpoint、Console production migration、Google reasoning 重复计数等风险已保留在 scope/uncertainty 中。

这些环境或线上状态边界与 Wiki 的 reconcile/lint 通过分开报告，不把“文档证据闭环”外推成“全部产品运行时已验证”。
