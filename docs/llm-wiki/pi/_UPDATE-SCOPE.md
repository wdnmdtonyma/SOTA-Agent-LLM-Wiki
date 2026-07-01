# UPDATE SCOPE — pi wiki 增量更新令(5a073885 → 8c943640)

> 本文件由分析会话生成(2026-07-01),给执行更新的 codex 会话读。
> **基线(wiki 当前 verified 的 pi HEAD)**:`5a073885b5f23cd6125cda0927cf50acf2bf22fb`
> **目标(已 checkout 的 pi submodule HEAD)**:`8c9436407cc46f6d0c0ddfe10bcb2027ae1f740b`
> **跨度**:34 commit · 99 files changed, 2619 insertions(+), 866 deletions(-) · 2026-06-27 → 2026-07-01

复现 diff(在 `Best/pi/` 内):
```
git diff --stat 5a073885b5f23cd6125cda0927cf50acf2bf22fb..8c9436407cc46f6d0c0ddfe10bcb2027ae1f740b
```

> 执行前先读 **`RUN.md`**(填充令,L1→L2→L3 流程不变)+ **`conventions.md`**(节点模板 / 证据分级)。本文件只回答"这次改了哪些、每个节点要动什么",不重复 RUN.md 的方法论。

## 0. 结论:最轻——基本是自动生成的模型目录刷新

| 维度 | 数字 |
|---|---|
| 被 wiki 引用的去重源文件 | 200 |
| ├ 已删/移 | **0** |
| ├ 改动(churn) | **26** |
| └ 不变 | 174 |
| 节点(176) | |
| ├ 结构性失效(A-BROKEN) | **0** |
| ├ 重 churn(B-HEAVY≥2000 行) | **0** |
| ├ 轻中 churn(C-DRIFT) | **38** |
| └ 完全不受影响(D-CLEAN,仅复核) | **138** |

改动几乎全是 `packages/ai/src/providers/*.models.ts`(自动生成的模型目录)+ 几个 provider adapter;target HEAD 的 commit 就是 `fix(ai): remove stale model metadata fallbacks`。工作量集中在 `ref.ai.model-catalog` / `ref.ai.provider-catalog` 一类的目录型 reference 节点重生成。

---

## 2. 新增面扫描(8 新文件,多为 test)

实质新增仅 `packages/ai/src/utils/error-body.ts`(错误体透传)与 `packages/coding-agent/.../status-indicator.ts`。核对是否并入现有 ai 错误处理 / interactive 组件节点——通常无需新节点,能并则并。

---

## 3. 批次划分(并发 codex 会话,按 RUN.md §8)

受影响节点(38 个,不含 138 个 D-CLEAN)按 id 分组如下——可据此切批,一个会话认领一组、只写自己那批的 node `.md`(共享文件 `index.json`/`llms.txt`/`reference/uncertainty.md` 收尾统一 reconcile):

| 分组 | A-BROKEN | B-HEAVY | C-DRIFT | D-CLEAN | 受影响小计 |
|---|---|---|---|---|---|
| `subsys.ai.*` | 0 | 0 | 7 | 16 | 7 |
| `subsys.coding-agent.*` | 0 | 0 | 7 | 24 | 7 |
| `ref.*` | 0 | 0 | 6 | 28 | 6 |
| `spine.*` | 0 | 0 | 5 | 7 | 5 |
| `surface.extensions.*` | 0 | 0 | 4 | 0 | 4 |
| `surface.modes.*` | 0 | 0 | 3 | 1 | 3 |
| `subsys.agent-core.*` | 0 | 0 | 2 | 16 | 2 |
| `surface.tools.*` | 0 | 0 | 1 | 6 | 1 |
| `surface.config.*` | 0 | 0 | 1 | 2 | 1 |
| `surface.providers.*` | 0 | 0 | 1 | 2 | 1 |
| `surface.sdk.*` | 0 | 0 | 1 | 0 | 1 |

> D-CLEAN 的 138 个节点单独一批走"快速复核":只确认 path/行号仍成立,bump `updated=8c943640`,省 L2(除非复核发现行号漂了)。

---

## 4. 每节点收尾 & 完成定义

- 单节点循环照 **RUN.md §3**(L1 读源 → L2 独立证伪 → L3 修复),把 `[E:path:line]` 行号重新落准是本次核心。
- 完成即置 `status: verified` + `updated: 8c943640`(权威取 `git -C ../../../pi/ rev-parse --short HEAD`)。
- **整体收尾**:`node tools/reconcile.mjs` 同步 frontmatter → `index.json`,并把 `index.json` 顶层 `updated` 改成 `8c943640`;`node tools/lint.mjs` 全绿;有增删节点则同步 `llms.txt`。
- **git 隔离坑**:只往 `docs/llm-wiki/pi/` 写,别碰 `Best/pi/` 源仓。

---

## 附录 A — 逐节点影响分级(自动生成 @ 5a073885..8c943640)

分级:**A-BROKEN**=source 引用了已删/移文件(必改 source 列)· **B-HEAVY**=无删除但 churn≥2000 行 · **C-DRIFT**=轻中度行漂移 · **D-CLEAN**=源全未变(仅复核)。
计数:A-BROKEN=0 · B-HEAVY=0 · C-DRIFT=38 · D-CLEAN=138(共 176)

| node id | tier | del/chg/total-src | ~churn 行 | 已删·移的 source(需重定位) |
|---|---|---|---|---|
| `spine.trace-interactive-turn` | T0 | 0/2/3 | 310 |  |
| `surface.modes.interactive` | T1 | 0/1/1 | 259 |  |
| `subsys.coding-agent.interactive-orchestration` | T2 | 0/1/2 | 259 |  |
| `subsys.ai.openai-codex-responses` | T2 | 0/1/1 | 102 |  |
| `ref.coding-agent.rpc-methods` | T3 | 0/3/3 | 93 |  |
| `spine.trace-rpc-prompt` | T0 | 0/3/3 | 86 |  |
| `surface.modes.rpc` | T1 | 0/2/3 | 76 |  |
| `ref.ai.image-models` | T3 | 0/1/2 | 60 |  |
| `spine.layered-architecture` | T0 | 0/1/4 | 51 |  |
| `subsys.coding-agent.agent-session` | T2 | 0/1/1 | 51 |  |
| `ref.coding-agent.session-events` | T3 | 0/1/1 | 51 |  |
| `surface.sdk.embedding` | T1 | 0/2/3 | 38 |  |
| `subsys.coding-agent.http-dispatcher` | T2 | 0/1/1 | 35 |  |
| `surface.modes.rpc-protocol` | T1 | 0/2/3 | 34 |  |
| `subsys.coding-agent.model-resolver` | T2 | 0/1/2 | 31 |  |
| `surface.tools.bash` | T1 | 0/1/2 | 27 |  |
| `surface.extensions.api` | T1 | 0/2/2 | 23 |  |
| `subsys.agent-core.exec-env` | T2 | 0/1/3 | 23 |  |
| `ref.coding-agent.extension-events` | T3 | 0/2/2 | 23 |  |
| `spine.agent-loop` | T0 | 0/1/2 | 20 |  |
| `subsys.agent-core.message-queue` | T2 | 0/1/1 | 20 |  |
| `subsys.ai.bedrock-converse` | T2 | 0/1/2 | 17 |  |
| `subsys.ai.openai-responses` | T2 | 0/1/2 | 15 |  |
| `subsys.ai.azure-openai-responses` | T2 | 0/1/1 | 15 |  |
| `subsys.ai.openai-completions` | T2 | 0/1/2 | 14 |  |
| `surface.config.settings` | T1 | 0/2/3 | 12 |  |
| `ref.coding-agent.config-keys` | T3 | 0/2/3 | 12 |  |
| `subsys.coding-agent.settings-manager` | T2 | 0/1/1 | 11 |  |
| `spine.extension-lifecycle` | T0 | 0/1/3 | 9 |  |
| `surface.providers.custom-provider` | T1 | 0/1/3 | 9 |  |
| `surface.extensions.contribution-points` | T1 | 0/1/2 | 9 |  |
| `surface.extensions.context-ui` | T1 | 0/1/2 | 9 |  |
| `surface.extensions.events` | T1 | 0/1/2 | 9 |  |
| `subsys.coding-agent.extension-wrapper` | T2 | 0/1/2 | 9 |  |
| `ref.coding-agent.contribution-points` | T3 | 0/1/1 | 9 |  |
| `subsys.ai.google-generative-ai` | T2 | 0/1/2 | 3 |  |
| `subsys.ai.google-vertex` | T2 | 0/1/2 | 3 |  |
| `subsys.coding-agent.extension-loader` | T2 | 0/1/2 | 1 |  |
| `spine.overview` | T0 | 0/0/4 |  |  |
| `spine.process-lifecycle` | T0 | 0/0/4 |  |  |
| `spine.tool-call-anatomy` | T0 | 0/0/3 |  |  |
| `spine.provider-stream` | T0 | 0/0/4 |  |  |
| `spine.session-state-model` | T0 | 0/0/3 |  |  |
| `spine.compaction-flow` | T0 | 0/0/2 |  |  |
| `spine.trace-extension-tool` | T0 | 0/0/3 |  |  |
| `surface.tools.read` | T1 | 0/0/2 |  |  |
| `surface.tools.edit` | T1 | 0/0/2 |  |  |
| `surface.tools.write` | T1 | 0/0/2 |  |  |
| `surface.tools.grep` | T1 | 0/0/2 |  |  |
| `surface.tools.find` | T1 | 0/0/1 |  |  |
| `surface.tools.ls` | T1 | 0/0/1 |  |  |
| `surface.cli.overview` | T1 | 0/0/3 |  |  |
| `surface.modes.print` | T1 | 0/0/2 |  |  |
| `surface.config.resolution` | T1 | 0/0/1 |  |  |
| `surface.config.keybindings` | T1 | 0/0/2 |  |  |
| `surface.providers.overview` | T1 | 0/0/3 |  |  |
| `surface.providers.auth` | T1 | 0/0/4 |  |  |
| `surface.skills.system` | T1 | 0/0/4 |  |  |
| `surface.prompt-templates.system` | T1 | 0/0/4 |  |  |
| `surface.slash-commands.overview` | T1 | 0/0/2 |  |  |
| `surface.sessions.management` | T1 | 0/0/3 |  |  |
| `surface.trust.model` | T1 | 0/0/3 |  |  |
| `surface.misc.images` | T1 | 0/0/3 |  |  |
| `surface.misc.containerization` | T1 | 0/0/2 |  |  |
| `surface.misc.security` | T1 | 0/0/3 |  |  |
| `surface.misc.packages` | T1 | 0/0/2 |  |  |
| `subsys.ai.provider-registry` | T2 | 0/0/2 |  |  |
| `subsys.ai.wire-protocol-dispatch` | T2 | 0/0/3 |  |  |
| `subsys.ai.anthropic-messages` | T2 | 0/0/2 |  |  |
| `subsys.ai.mistral-conversations` | T2 | 0/0/1 |  |  |
| `subsys.ai.message-transform` | T2 | 0/0/1 |  |  |
| `subsys.ai.event-stream` | T2 | 0/0/1 |  |  |
| `subsys.ai.auth-resolution` | T2 | 0/0/2 |  |  |
| `subsys.ai.credential-store` | T2 | 0/0/2 |  |  |
| `subsys.ai.oauth-flow` | T2 | 0/0/3 |  |  |
| `subsys.ai.env-api-keys` | T2 | 0/0/2 |  |  |
| `subsys.ai.model-discovery` | T2 | 0/0/2 |  |  |
| `subsys.ai.prompt-caching` | T2 | 0/0/2 |  |  |
| `subsys.ai.lazy-loading` | T2 | 0/0/1 |  |  |
| `subsys.ai.image-generation` | T2 | 0/0/3 |  |  |
| `subsys.ai.session-resources` | T2 | 0/0/1 |  |  |
| `subsys.ai.compat-legacy` | T2 | 0/0/2 |  |  |
| `subsys.agent-core.turn-control` | T2 | 0/0/1 |  |  |
| `subsys.agent-core.tool-invocation` | T2 | 0/0/2 |  |  |
| `subsys.agent-core.hooks` | T2 | 0/0/1 |  |  |
| `subsys.agent-core.message-model` | T2 | 0/0/2 |  |  |
| `subsys.agent-core.message-conversion` | T2 | 0/0/1 |  |  |
| `subsys.agent-core.session-storage` | T2 | 0/0/2 |  |  |
| `subsys.agent-core.jsonl-storage` | T2 | 0/0/2 |  |  |
| `subsys.agent-core.memory-storage` | T2 | 0/0/2 |  |  |
| `subsys.agent-core.session-tree` | T2 | 0/0/2 |  |  |
| `subsys.agent-core.tree-navigation` | T2 | 0/0/1 |  |  |
| `subsys.agent-core.compaction` | T2 | 0/0/2 |  |  |
| `subsys.agent-core.branch-summary` | T2 | 0/0/1 |  |  |
| `subsys.agent-core.system-prompt` | T2 | 0/0/1 |  |  |
| `subsys.agent-core.skills-loading` | T2 | 0/0/1 |  |  |
| `subsys.agent-core.prompt-templates` | T2 | 0/0/1 |  |  |
| `subsys.agent-core.transport-proxy` | T2 | 0/0/2 |  |  |
| `subsys.coding-agent.session-runtime` | T2 | 0/0/1 |  |  |
| `subsys.coding-agent.session-services` | T2 | 0/0/1 |  |  |
| `subsys.coding-agent.system-prompt` | T2 | 0/0/2 |  |  |
| `subsys.coding-agent.model-registry` | T2 | 0/0/1 |  |  |
| `subsys.coding-agent.bash-executor` | T2 | 0/0/2 |  |  |
| `subsys.coding-agent.output-truncation` | T2 | 0/0/3 |  |  |
| `subsys.coding-agent.file-mutation-queue` | T2 | 0/0/1 |  |  |
| `subsys.coding-agent.edit-engine` | T2 | 0/0/1 |  |  |
| `subsys.coding-agent.path-resolution` | T2 | 0/0/1 |  |  |
| `subsys.coding-agent.tool-wrapper` | T2 | 0/0/3 |  |  |
| `subsys.coding-agent.extension-runner` | T2 | 0/0/1 |  |  |
| `subsys.coding-agent.config-resolution` | T2 | 0/0/2 |  |  |
| `subsys.coding-agent.resource-loader` | T2 | 0/0/3 |  |  |
| `subsys.coding-agent.session-manager` | T2 | 0/0/2 |  |  |
| `subsys.coding-agent.auth-storage` | T2 | 0/0/2 |  |  |
| `subsys.coding-agent.trust-manager` | T2 | 0/0/2 |  |  |
| `subsys.coding-agent.keybindings` | T2 | 0/0/1 |  |  |
| `subsys.coding-agent.event-bus` | T2 | 0/0/1 |  |  |
| `subsys.coding-agent.footer-data-provider` | T2 | 0/0/1 |  |  |
| `subsys.coding-agent.html-export` | T2 | 0/0/3 |  |  |
| `subsys.coding-agent.migrations` | T2 | 0/0/1 |  |  |
| `subsys.coding-agent.package-manager` | T2 | 0/0/2 |  |  |
| `subsys.coding-agent.telemetry` | T2 | 0/0/4 |  |  |
| `subsys.coding-agent.theme-controller` | T2 | 0/0/3 |  |  |
| `subsys.tui.runtime` | T2 | 0/0/2 |  |  |
| `subsys.tui.diff-engine` | T2 | 0/0/2 |  |  |
| `subsys.tui.component-model` | T2 | 0/0/2 |  |  |
| `subsys.tui.overlay` | T2 | 0/0/1 |  |  |
| `subsys.tui.cursor-positioning` | T2 | 0/0/1 |  |  |
| `subsys.tui.key-pipeline` | T2 | 0/0/3 |  |  |
| `subsys.tui.key-parsing` | T2 | 0/0/1 |  |  |
| `subsys.tui.keybinding-matching` | T2 | 0/0/2 |  |  |
| `subsys.tui.editor-component` | T2 | 0/0/2 |  |  |
| `subsys.tui.editor-mechanics` | T2 | 0/0/3 |  |  |
| `subsys.tui.stdin-buffer` | T2 | 0/0/1 |  |  |
| `subsys.tui.terminal-capabilities` | T2 | 0/0/1 |  |  |
| `subsys.tui.native-modifiers` | T2 | 0/0/1 |  |  |
| `subsys.tui.autocomplete` | T2 | 0/0/1 |  |  |
| `subsys.tui.fuzzy-match` | T2 | 0/0/1 |  |  |
| `subsys.tui.text-utilities` | T2 | 0/0/1 |  |  |
| `subsys.tui.terminal-colors` | T2 | 0/0/1 |  |  |
| `subsys.tui.terminal-image` | T2 | 0/0/1 |  |  |
| `subsys.orchestrator.supervisor` | T2 | 0/0/1 |  |  |
| `subsys.orchestrator.rpc-spawner` | T2 | 0/0/1 |  |  |
| `subsys.orchestrator.ipc-transport` | T2 | 0/0/2 |  |  |
| `subsys.orchestrator.message-protocol` | T2 | 0/0/1 |  |  |
| `subsys.orchestrator.request-handler` | T2 | 0/0/2 |  |  |
| `subsys.orchestrator.storage` | T2 | 0/0/1 |  |  |
| `subsys.orchestrator.radius` | T2 | 0/0/1 |  |  |
| `subsys.orchestrator.config` | T2 | 0/0/3 |  |  |
| `ref.ai.provider-catalog` | T3 | 0/0/1 |  |  |
| `ref.ai.model-catalog` | T3 | 0/0/1 |  |  |
| `ref.ai.wire-protocol-catalog` | T3 | 0/0/2 |  |  |
| `ref.ai.auth-types` | T3 | 0/0/1 |  |  |
| `ref.ai.core-types` | T3 | 0/0/1 |  |  |
| `ref.agent.message-types` | T3 | 0/0/2 |  |  |
| `ref.agent.session-entry-types` | T3 | 0/0/1 |  |  |
| `ref.agent.agent-events` | T3 | 0/0/2 |  |  |
| `ref.agent.error-codes` | T3 | 0/0/1 |  |  |
| `ref.agent.thinking-levels` | T3 | 0/0/1 |  |  |
| `ref.agent.queue-modes` | T3 | 0/0/1 |  |  |
| `ref.agent.tool-execution-modes` | T3 | 0/0/1 |  |  |
| `ref.agent.compaction-config` | T3 | 0/0/1 |  |  |
| `ref.coding-agent.slash-commands` | T3 | 0/0/2 |  |  |
| `ref.coding-agent.default-keybindings` | T3 | 0/0/2 |  |  |
| `ref.coding-agent.env-vars` | T3 | 0/0/4 |  |  |
| `ref.coding-agent.session-format` | T3 | 0/0/2 |  |  |
| `ref.coding-agent.cli-flags` | T3 | 0/0/1 |  |  |
| `ref.coding-agent.json-events` | T3 | 0/0/2 |  |  |
| `ref.tui.key-codes` | T3 | 0/0/1 |  |  |
| `ref.tui.keybinding-actions` | T3 | 0/0/1 |  |  |
| `ref.tui.component-types` | T3 | 0/0/3 |  |  |
| `ref.orchestrator.ipc-messages` | T3 | 0/0/1 |  |  |
| `ref.orchestrator.instance-status` | T3 | 0/0/2 |  |  |
| `ref.package-index` | T3 | 0/0/4 |  |  |
| `ref.glossary` | T3 | 0/0/2 |  |  |
| `ref.tools-catalog` | T3 | 0/0/1 |  |  |
| `ref.interactive.components` | T3 | 0/0/1 |  |  |
