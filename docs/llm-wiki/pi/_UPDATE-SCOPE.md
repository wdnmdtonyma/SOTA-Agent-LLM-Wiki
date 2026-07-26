# UPDATE SCOPE — pi wiki 增量更新令(8c943640 → 3da591ab)

> 本文件由分析会话生成(2026-07-19),给执行更新的 codex 会话读。
> **基线(wiki 当前 verified 的 pi HEAD)**:`8c9436407cc46f6d0c0ddfe10bcb2027ae1f740b`
> **目标(已 checkout 的 pi submodule HEAD,上游 `main` 分支)**:`3da591ab74ab9ab407e72ed882600b2c851fae21`
> **跨度**:175 commit · 386 files changed, 24262 insertions(+), 24241 deletions(-) · 2026-07-01 → 2026-07-17

复现 diff(在 `pi/` 内):
```
git diff --stat 8c9436407cc46f6d0c0ddfe10bcb2027ae1f740b..3da591ab74ab9ab407e72ed882600b2c851fae21
```

> 执行前先读 **`RUN.md`**(填充令,L1→L2→L3 流程不变)+ **`conventions.md`**(节点模板 / 证据分级)。本文件只回答"这次改了哪些、每个节点要动什么",不重复 RUN.md 的方法论。

## 0. 结论:oauth 目录搬家 + provider/model 目录常规刷新,中等量

| 维度 | 数字 |
|---|---|
| 被 wiki 引用的去重源文件 | 293 |
| ├ 已删/移 | **5** |
| ├ 改动(churn) | **110** |
| └ 不变 | 178 |
| 节点(177) | |
| ├ 结构性失效(A-BROKEN) | **2** |
| ├ 重 churn(B-HEAVY≥2000 行) | **2** |
| ├ 轻中 churn(C-DRIFT) | **128** |
| └ 完全不受影响(D-CLEAN,仅复核) | **45** |

churn 集中在 `packages/ai/src`(95 改)、`packages/coding-agent/src`(70 改)与两者的 test 目录。**2 个 A-BROKEN 同源一件事**:oauth 实现从 `packages/ai/src/utils/oauth/` 搬到 `packages/ai/src/auth/oauth/`(`device-code.ts`/`pkce.ts`/`anthropic.ts`/`openai-codex.ts` 为改名,`index.ts` 被删需确认新入口)——影响 `subsys.ai.oauth-flow` 与 `ref.coding-agent.env-vars`,机械改路径 + 确认入口即可。
2 个 B-HEAVY(`surface.providers.auth` 2955 行、`surface.misc.security` 2284 行)与 oauth 搬家同一批改动,顺路一起做。其余 C-DRIFT 里大头仍是 `packages/ai/src/providers/*.models.ts` 自动生成的模型目录刷新(`subsys.coding-agent.model-registry`、`subsys.ai.model-discovery`、`ref.ai.*`)。

---

## 1. 结构性失效(A-BROKEN,先修:必改 source 列)

- **`ref.coding-agent.env-vars`**(churn ~801 行):
  - `packages/ai/src/utils/oauth/anthropic.ts` → `packages/ai/src/auth/oauth/anthropic.ts`(机械改路径)
  - `packages/ai/src/utils/oauth/openai-codex.ts` → `packages/ai/src/auth/oauth/openai-codex.ts`(机械改路径)
- **`subsys.ai.oauth-flow`**(churn ~160 行):
  - `packages/ai/src/utils/oauth/index.ts` → **已删,读新结构重定位**
  - `packages/ai/src/utils/oauth/device-code.ts` → `packages/ai/src/auth/oauth/device-code.ts`(机械改路径)
  - `packages/ai/src/utils/oauth/pkce.ts` → `packages/ai/src/auth/oauth/pkce.ts`(机械改路径)

---

## 2. 新增面扫描(63 新文件 → 判断是否需新节点)

对照现有 `index.json`,重点核这些新增区是否已有节点覆盖,缺则按 `conventions.md` 建新节点并登记 `index.json` + `llms.txt`:
- `packages/ai/src/auth/`(oauth 新家):确认 `subsys.ai.oauth-flow` source 列换新路径后覆盖是否完整。
- `packages/ai/src` 其余 +13、`packages/coding-agent/src` +15:核对是否有新 provider / 新命令 / 新扩展点(如 Hugging Face llama search,HEAD commit 就是它)。
- `scripts/{diff,publish}-model-catalog.mjs` + `.github/workflows/publish-model-catalog.yml`:模型目录发布管线是新面,判断是否值一个小节点或并进 `subsys.coding-agent.model-registry`。

---

## 3. 批次划分(并发会话,按 RUN.md §8)

受影响节点(132 个,不含 45 个 D-CLEAN)按 id 分组如下——可据此切批,一个会话认领一组、只写自己那批的 node `.md`(共享文件 `index.json`/`llms.txt`/`reference/uncertainty.md` 收尾统一 reconcile):

| 分组 | A-BROKEN | B-HEAVY | C-DRIFT | D-CLEAN | 受影响小计 |
|---|---|---|---|---|---|
| `subsys.coding-agent.*` | 0 | 0 | 22 | 9 | 22 |
| `subsys.ai.*` | 1 | 0 | 19 | 3 | 20 |
| `spine.*` | 0 | 0 | 12 | 0 | 12 |
| `subsys.agent-core.*` | 0 | 0 | 11 | 7 | 11 |
| `ref.coding-agent.*` | 1 | 0 | 10 | 0 | 11 |
| `ref.agent.*` | 0 | 0 | 8 | 0 | 8 |
| `surface.tools.*` | 0 | 0 | 7 | 0 | 7 |
| `subsys.tui.*` | 0 | 0 | 5 | 13 | 5 |
| `subsys.orchestrator.*` | 0 | 0 | 5 | 3 | 5 |
| `surface.modes.*` | 0 | 0 | 4 | 0 | 4 |
| `surface.extensions.*` | 0 | 0 | 4 | 0 | 4 |
| `ref.ai.*` | 0 | 0 | 4 | 2 | 4 |
| `surface.providers.*` | 0 | 1 | 2 | 0 | 3 |
| `surface.misc.*` | 0 | 1 | 2 | 1 | 3 |
| `surface.config.*` | 0 | 0 | 2 | 1 | 2 |
| `ref.tui.*` | 0 | 0 | 2 | 1 | 2 |
| `ref.*` | 0 | 0 | 2 | 2 | 2 |
| `surface.cli.*` | 0 | 0 | 1 | 0 | 1 |
| `surface.skills.*` | 0 | 0 | 1 | 0 | 1 |
| `surface.prompt-templates.*` | 0 | 0 | 1 | 0 | 1 |
| `surface.slash-commands.*` | 0 | 0 | 1 | 0 | 1 |
| `surface.sdk.*` | 0 | 0 | 1 | 0 | 1 |
| `surface.sessions.*` | 0 | 0 | 1 | 0 | 1 |
| `ref.interactive.*` | 0 | 0 | 1 | 0 | 1 |
| `surface.trust.*` | 0 | 0 | 0 | 1 | 0 |
| `ref.orchestrator.*` | 0 | 0 | 0 | 2 | 0 |

> D-CLEAN 的 45 个节点单独一批走"快速复核":只确认 path/行号仍成立,bump `updated=3da591ab`,省 L2(除非复核发现行号漂了)。

---

## 4. 每节点收尾 & 完成定义

- 单节点循环照 **RUN.md §3**(L1 读源 → L2 独立证伪 → L3 修复),把 `[E:path:line]` 行号重新落准是本次核心。
- 完成即置 `status: verified` + `updated: 3da591ab`(权威取 `git -C ../../../pi/ rev-parse --short HEAD`)。
- **整体收尾**:`node tools/reconcile.mjs` 同步 frontmatter → `index.json`,并把 `index.json` 顶层 `updated` 改成 `3da591ab`;`node tools/lint.mjs` 全绿;有增删节点则同步 `llms.txt`。
- **git 隔离坑**:只往 `docs/llm-wiki/pi/` 写,别碰 `pi/` 源仓。

---

## 附录 A — 逐节点影响分级(自动生成 @ 8c943640..3da591ab)

分级:**A-BROKEN**=source 引用了已删/移文件(必改 source 列)· **B-HEAVY**=无删除但 churn≥2000 行 · **C-DRIFT**=轻中度行漂移 · **D-CLEAN**=源全未变(仅复核)。
计数:A-BROKEN=2 · B-HEAVY=2 · C-DRIFT=128 · D-CLEAN=45(共 177)

| node id | tier | 分级 | del/chg/total-src | ~churn 行 | 已删·移的 source(需重定位) |
|---|---|---|---|---|---|
| `ref.coding-agent.env-vars` | T3 | A-BROKEN | 2/20/35 | 801 | `packages/ai/src/utils/oauth/anthropic.ts` → `packages/ai/src/auth/oauth/anthropic.ts`; `packages/ai/src/utils/oauth/openai-codex.ts` → `packages/ai/src/auth/oauth/openai-codex.ts` |
| `subsys.ai.oauth-flow` | T2 | A-BROKEN | 3/0/3 | 160 | `packages/ai/src/utils/oauth/index.ts` → **已删,需重定位**; `packages/ai/src/utils/oauth/device-code.ts` → `packages/ai/src/auth/oauth/device-code.ts`; `packages/ai/src/utils/oauth/pkce.ts` → `packages/ai/src/auth/oauth/pkce.ts` |
| `surface.providers.auth` | T1 | B-HEAVY | 0/13/13 | 2955 |  |
| `surface.misc.security` | T1 | B-HEAVY | 0/10/18 | 2284 |  |
| `spine.overview` | T0 | C-DRIFT | 0/12/16 | 1895 |  |
| `subsys.coding-agent.model-registry` | T2 | C-DRIFT | 0/6/7 | 1887 |  |
| `surface.extensions.context-ui` | T1 | C-DRIFT | 0/5/8 | 1295 |  |
| `surface.misc.images` | T1 | C-DRIFT | 0/9/19 | 1233 |  |
| `subsys.ai.model-discovery` | T2 | C-DRIFT | 0/5/6 | 1229 |  |
| `ref.coding-agent.slash-commands` | T3 | C-DRIFT | 0/7/7 | 1183 |  |
| `surface.skills.system` | T1 | C-DRIFT | 0/5/9 | 1126 |  |
| `spine.trace-interactive-turn` | T0 | C-DRIFT | 0/3/3 | 1116 |  |
| `surface.slash-commands.overview` | T1 | C-DRIFT | 0/5/5 | 1107 |  |
| `spine.provider-stream` | T0 | C-DRIFT | 0/11/16 | 947 |  |
| `surface.config.keybindings` | T1 | C-DRIFT | 0/5/7 | 868 |  |
| `surface.modes.interactive` | T1 | C-DRIFT | 0/1/1 | 827 |  |
| `subsys.coding-agent.interactive-orchestration` | T2 | C-DRIFT | 0/1/2 | 827 |  |
| `subsys.coding-agent.extension-loader` | T2 | C-DRIFT | 0/8/9 | 796 |  |
| `ref.interactive.components` | T3 | C-DRIFT | 0/10/39 | 705 |  |
| `surface.sdk.embedding` | T1 | C-DRIFT | 0/5/5 | 615 |  |
| `subsys.coding-agent.file-mutation-queue` | T2 | C-DRIFT | 0/5/9 | 585 |  |
| `ref.coding-agent.json-events` | T3 | C-DRIFT | 0/8/10 | 571 |  |
| `spine.extension-lifecycle` | T0 | C-DRIFT | 0/7/8 | 551 |  |
| `subsys.ai.wire-protocol-dispatch` | T2 | C-DRIFT | 0/3/3 | 512 |  |
| `surface.extensions.api` | T1 | C-DRIFT | 0/4/4 | 486 |  |
| `surface.providers.overview` | T1 | C-DRIFT | 0/3/3 | 473 |  |
| `subsys.ai.provider-registry` | T2 | C-DRIFT | 0/2/2 | 449 |  |
| `surface.extensions.events` | T1 | C-DRIFT | 0/3/3 | 448 |  |
| `surface.tools.read` | T1 | C-DRIFT | 0/7/16 | 403 |  |
| `spine.tool-call-anatomy` | T0 | C-DRIFT | 0/4/6 | 368 |  |
| `surface.tools.find` | T1 | C-DRIFT | 0/4/15 | 368 |  |
| `surface.tools.ls` | T1 | C-DRIFT | 0/4/12 | 368 |  |
| `ref.coding-agent.extension-events` | T3 | C-DRIFT | 0/2/2 | 367 |  |
| `ref.coding-agent.contribution-points` | T3 | C-DRIFT | 0/2/2 | 367 |  |
| `subsys.coding-agent.auth-storage` | T2 | C-DRIFT | 0/1/2 | 355 |  |
| `spine.session-state-model` | T0 | C-DRIFT | 0/3/3 | 341 |  |
| `ref.tools-catalog` | T3 | C-DRIFT | 0/5/13 | 326 |  |
| `surface.modes.print` | T1 | C-DRIFT | 0/5/6 | 301 |  |
| `subsys.coding-agent.edit-engine` | T2 | C-DRIFT | 0/2/8 | 300 |  |
| `subsys.coding-agent.package-manager` | T2 | C-DRIFT | 0/2/2 | 298 |  |
| `surface.tools.write` | T1 | C-DRIFT | 0/3/10 | 297 |  |
| `surface.tools.grep` | T1 | C-DRIFT | 0/3/11 | 297 |  |
| `subsys.coding-agent.output-truncation` | T2 | C-DRIFT | 0/4/16 | 295 |  |
| `spine.layered-architecture` | T0 | C-DRIFT | 0/6/7 | 287 |  |
| `spine.trace-rpc-prompt` | T0 | C-DRIFT | 0/2/3 | 250 |  |
| `surface.tools.bash` | T1 | C-DRIFT | 0/1/4 | 241 |  |
| `subsys.coding-agent.agent-session` | T2 | C-DRIFT | 0/1/1 | 241 |  |
| `ref.coding-agent.session-events` | T3 | C-DRIFT | 0/1/1 | 241 |  |
| `ref.coding-agent.session-format` | T3 | C-DRIFT | 0/2/2 | 210 |  |
| `subsys.ai.anthropic-messages` | T2 | C-DRIFT | 0/1/2 | 190 |  |
| `subsys.ai.prompt-caching` | T2 | C-DRIFT | 0/1/2 | 190 |  |
| `surface.providers.custom-provider` | T1 | C-DRIFT | 0/3/3 | 186 |  |
| `surface.sessions.management` | T1 | C-DRIFT | 0/1/3 | 184 |  |
| `subsys.coding-agent.session-manager` | T2 | C-DRIFT | 0/1/2 | 184 |  |
| `subsys.ai.openai-completions` | T2 | C-DRIFT | 0/2/2 | 165 |  |
| `subsys.agent-core.tree-navigation` | T2 | C-DRIFT | 0/1/1 | 155 |  |
| `subsys.coding-agent.event-bus` | T2 | C-DRIFT | 0/4/5 | 153 |  |
| `surface.extensions.contribution-points` | T1 | C-DRIFT | 0/2/2 | 152 |  |
| `surface.misc.packages` | T1 | C-DRIFT | 0/2/2 | 135 |  |
| `subsys.ai.openai-responses` | T2 | C-DRIFT | 0/2/2 | 128 |  |
| `subsys.coding-agent.extension-wrapper` | T2 | C-DRIFT | 0/2/2 | 98 |  |
| `ref.ai.wire-protocol-catalog` | T3 | C-DRIFT | 0/2/2 | 84 |  |
| `ref.package-index` | T3 | C-DRIFT | 0/10/21 | 84 |  |
| `spine.trace-extension-tool` | T0 | C-DRIFT | 0/1/3 | 81 |  |
| `subsys.coding-agent.extension-runner` | T2 | C-DRIFT | 0/1/1 | 81 |  |
| `subsys.ai.credential-store` | T2 | C-DRIFT | 0/2/2 | 72 |  |
| `subsys.agent-core.jsonl-storage` | T2 | C-DRIFT | 0/2/2 | 69 |  |
| `subsys.tui.runtime` | T2 | C-DRIFT | 0/1/2 | 69 |  |
| `ref.ai.auth-types` | T3 | C-DRIFT | 0/1/1 | 66 |  |
| `surface.modes.rpc-protocol` | T1 | C-DRIFT | 0/4/8 | 63 |  |
| `surface.cli.overview` | T1 | C-DRIFT | 0/3/3 | 60 |  |
| `ref.ai.core-types` | T3 | C-DRIFT | 0/1/1 | 59 |  |
| `spine.process-lifecycle` | T0 | C-DRIFT | 0/3/4 | 56 |  |
| `subsys.agent-core.tool-invocation` | T2 | C-DRIFT | 0/2/2 | 56 |  |
| `spine.agent-loop` | T0 | C-DRIFT | 0/1/2 | 48 |  |
| `subsys.agent-core.turn-control` | T2 | C-DRIFT | 0/1/1 | 48 |  |
| `subsys.coding-agent.model-resolver` | T2 | C-DRIFT | 0/1/2 | 45 |  |
| `subsys.ai.bedrock-converse` | T2 | C-DRIFT | 0/1/2 | 38 |  |
| `subsys.coding-agent.session-services` | T2 | C-DRIFT | 0/1/1 | 38 |  |
| `subsys.ai.compat-legacy` | T2 | C-DRIFT | 0/1/2 | 37 |  |
| `subsys.ai.openai-codex-responses` | T2 | C-DRIFT | 0/1/1 | 32 |  |
| `surface.config.settings` | T1 | C-DRIFT | 0/2/3 | 30 |  |
| `ref.coding-agent.config-keys` | T3 | C-DRIFT | 0/2/3 | 30 |  |
| `surface.modes.rpc` | T1 | C-DRIFT | 0/2/3 | 29 |  |
| `subsys.tui.text-utilities` | T2 | C-DRIFT | 0/1/1 | 29 |  |
| `ref.coding-agent.rpc-methods` | T3 | C-DRIFT | 0/2/3 | 29 |  |
| `subsys.tui.editor-component` | T2 | C-DRIFT | 0/1/2 | 28 |  |
| `ref.tui.component-types` | T3 | C-DRIFT | 0/1/13 | 28 |  |
| `subsys.coding-agent.theme-controller` | T2 | C-DRIFT | 0/2/3 | 26 |  |
| `subsys.ai.lazy-loading` | T2 | C-DRIFT | 0/1/1 | 25 |  |
| `subsys.coding-agent.settings-manager` | T2 | C-DRIFT | 0/1/1 | 25 |  |
| `subsys.orchestrator.radius` | T2 | C-DRIFT | 0/3/5 | 25 |  |
| `subsys.coding-agent.system-prompt` | T2 | C-DRIFT | 0/2/2 | 24 |  |
| `ref.coding-agent.default-keybindings` | T3 | C-DRIFT | 0/2/3 | 23 |  |
| `subsys.coding-agent.keybindings` | T2 | C-DRIFT | 0/1/1 | 22 |  |
| `subsys.ai.image-generation` | T2 | C-DRIFT | 0/1/3 | 21 |  |
| `ref.ai.provider-catalog` | T3 | C-DRIFT | 0/1/1 | 21 |  |
| `subsys.ai.auth-resolution` | T2 | C-DRIFT | 0/1/2 | 20 |  |
| `subsys.coding-agent.resource-loader` | T2 | C-DRIFT | 0/1/3 | 20 |  |
| `spine.compaction-flow` | T0 | C-DRIFT | 0/1/2 | 16 |  |
| `subsys.agent-core.compaction` | T2 | C-DRIFT | 0/1/2 | 16 |  |
| `ref.agent.compaction-config` | T3 | C-DRIFT | 0/1/1 | 16 |  |
| `surface.prompt-templates.system` | T1 | C-DRIFT | 0/2/4 | 12 |  |
| `subsys.coding-agent.telemetry` | T2 | C-DRIFT | 0/1/4 | 12 |  |
| `subsys.tui.key-parsing` | T2 | C-DRIFT | 0/1/1 | 11 |  |
| `subsys.tui.keybinding-matching` | T2 | C-DRIFT | 0/1/2 | 11 |  |
| `ref.tui.key-codes` | T3 | C-DRIFT | 0/1/1 | 11 |  |
| `ref.agent.agent-events` | T3 | C-DRIFT | 0/2/2 | 10 |  |
| `ref.coding-agent.cli-flags` | T3 | C-DRIFT | 0/1/1 | 10 |  |
| `subsys.agent-core.hooks` | T2 | C-DRIFT | 0/1/1 | 8 |  |
| `subsys.agent-core.message-model` | T2 | C-DRIFT | 0/1/2 | 8 |  |
| `subsys.agent-core.transport-proxy` | T2 | C-DRIFT | 0/1/2 | 8 |  |
| `ref.agent.message-types` | T3 | C-DRIFT | 0/1/2 | 8 |  |
| `ref.agent.thinking-levels` | T3 | C-DRIFT | 0/1/1 | 8 |  |
| `ref.agent.queue-modes` | T3 | C-DRIFT | 0/1/1 | 8 |  |
| `ref.agent.tool-execution-modes` | T3 | C-DRIFT | 0/1/1 | 8 |  |
| `subsys.ai.azure-openai-responses` | T2 | C-DRIFT | 0/1/1 | 6 |  |
| `subsys.orchestrator.request-handler` | T2 | C-DRIFT | 0/2/5 | 6 |  |
| `subsys.ai.message-transform` | T2 | C-DRIFT | 0/1/1 | 5 |  |
| `subsys.coding-agent.session-runtime` | T2 | C-DRIFT | 0/1/1 | 5 |  |
| `surface.tools.edit` | T1 | C-DRIFT | 0/1/2 | 4 |  |
| `subsys.ai.google-generative-ai` | T2 | C-DRIFT | 0/2/5 | 4 |  |
| `subsys.agent-core.memory-storage` | T2 | C-DRIFT | 0/1/2 | 4 |  |
| `subsys.orchestrator.rpc-spawner` | T2 | C-DRIFT | 0/1/5 | 4 |  |
| `subsys.orchestrator.ipc-transport` | T2 | C-DRIFT | 0/1/6 | 4 |  |
| `subsys.orchestrator.config` | T2 | C-DRIFT | 0/1/4 | 4 |  |
| `subsys.ai.google-vertex` | T2 | C-DRIFT | 0/1/2 | 2 |  |
| `subsys.agent-core.session-storage` | T2 | C-DRIFT | 0/1/2 | 2 |  |
| `subsys.agent-core.session-tree` | T2 | C-DRIFT | 0/1/2 | 2 |  |
| `ref.agent.session-entry-types` | T3 | C-DRIFT | 0/1/1 | 2 |  |
| `ref.agent.error-codes` | T3 | C-DRIFT | 0/1/1 | 2 |  |
| `subsys.ai.env-api-keys` | T2 | C-DRIFT | 0/1/2 | 1 |  |
| `surface.config.resolution` | T1 | D-CLEAN | 0/0/1 |  |  |
| `surface.trust.model` | T1 | D-CLEAN | 0/0/3 |  |  |
| `surface.misc.containerization` | T1 | D-CLEAN | 0/0/2 |  |  |
| `subsys.ai.mistral-conversations` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.ai.event-stream` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.ai.session-resources` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.agent-core.message-queue` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.agent-core.message-conversion` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.agent-core.branch-summary` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.agent-core.system-prompt` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.agent-core.skills-loading` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.agent-core.prompt-templates` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.agent-core.exec-env` | T2 | D-CLEAN | 0/0/3 |  |  |
| `subsys.coding-agent.bash-executor` | T2 | D-CLEAN | 0/0/2 |  |  |
| `subsys.coding-agent.path-resolution` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.coding-agent.tool-wrapper` | T2 | D-CLEAN | 0/0/3 |  |  |
| `subsys.coding-agent.config-resolution` | T2 | D-CLEAN | 0/0/2 |  |  |
| `subsys.coding-agent.trust-manager` | T2 | D-CLEAN | 0/0/2 |  |  |
| `subsys.coding-agent.footer-data-provider` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.coding-agent.html-export` | T2 | D-CLEAN | 0/0/3 |  |  |
| `subsys.coding-agent.migrations` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.coding-agent.http-dispatcher` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.diff-engine` | T2 | D-CLEAN | 0/0/2 |  |  |
| `subsys.tui.component-model` | T2 | D-CLEAN | 0/0/2 |  |  |
| `subsys.tui.overlay` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.cursor-positioning` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.key-pipeline` | T2 | D-CLEAN | 0/0/4 |  |  |
| `subsys.tui.editor-mechanics` | T2 | D-CLEAN | 0/0/3 |  |  |
| `subsys.tui.stdin-buffer` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.terminal-capabilities` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.native-modifiers` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.autocomplete` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.fuzzy-match` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.terminal-colors` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.tui.terminal-image` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.orchestrator.supervisor` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.orchestrator.message-protocol` | T2 | D-CLEAN | 0/0/2 |  |  |
| `subsys.orchestrator.storage` | T2 | D-CLEAN | 0/0/5 |  |  |
| `ref.ai.model-catalog` | T3 | D-CLEAN | 0/0/1 |  |  |
| `ref.ai.image-models` | T3 | D-CLEAN | 0/0/2 |  |  |
| `ref.tui.keybinding-actions` | T3 | D-CLEAN | 0/0/1 |  |  |
| `ref.orchestrator.ipc-messages` | T3 | D-CLEAN | 0/0/2 |  |  |
| `ref.orchestrator.instance-status` | T3 | D-CLEAN | 0/0/2 |  |  |
| `ref.glossary` | T3 | D-CLEAN | 0/0/2 |  |  |
| `ref.uncertainty` | T3 | D-CLEAN | 0/0/0 |  |  |
