# UPDATE SCOPE — codex wiki 增量更新令(5670360009 → db887d03e1)

> 本文件由分析会话生成(2026-07-01),给执行更新的 codex 会话读。
> **基线(wiki 当前 verified 的 codex HEAD)**:`56703600091d25542b60597b85d0e027799ad063`
> **目标(已 checkout 的 codex submodule HEAD)**:`db887d03e1f907467e33271572dffb73bceecd6b`
> **跨度**:328 commit · 1303 files changed, 89500 insertions(+), 15260 deletions(-) · 2026-06-18 → 2026-06-30

复现 diff(在 `Best/codex/` 内):
```
git diff --stat 56703600091d25542b60597b85d0e027799ad063..db887d03e1f907467e33271572dffb73bceecd6b
```

> 执行前先读 **`RUN.md`**(填充令,L1→L2→L3 流程不变)+ **`conventions.md`**(节点模板 / 证据分级)。本文件只回答"这次改了哪些、每个节点要动什么",不重复 RUN.md 的方法论。

## 0. 结论:近乎纯 churn,路径基本稳(天级增量,非全量重写)

| 维度 | 数字 |
|---|---|
| 被 wiki 引用的去重源文件 | 604 |
| ├ 已删/移 | **1** |
| ├ 改动(churn) | **265** |
| └ 不变 | 338 |
| 节点(171) | |
| ├ 结构性失效(A-BROKEN) | **1** |
| ├ 重 churn(B-HEAVY≥2000 行) | **4** |
| ├ 轻中 churn(C-DRIFT) | **151** |
| └ 完全不受影响(D-CLEAN,仅复核) | **15** |

churn 集中在 `codex-rs/core/src`(207 改)、`codex-rs/tui/src`(132)、`codex-rs/app-server-protocol/schema`(93)。**几乎无路径失效**——重点是逐节点重读 source、把 `[E:path:line]` 行号重新落准,**不用批量改 source 路径**。

---

## 1. 结构性失效(A-BROKEN,先修:必改 source 列)

- `codex-rs/app-server-protocol/src/jsonrpc_lite.rs` → 移至 `codex-rs/app-server-protocol/src/rpc.rs`(改 source 路径即可) — 1 节点:`rpc.overview`

---

## 2. 新增面扫描(198 新文件 → 判断是否需新节点)

对照现有 `index.json`,重点核这些新增区是否已有节点覆盖,缺则按 `conventions.md` 建新节点并登记 `index.json` + `llms.txt`:
- `codex-rs/code-mode/`(+18)、`codex-rs/code-mode-protocol/`(+8,疑似新 crate)
- `codex-rs/connectors/`(+5,疑似新子系统)
- `codex-rs/core/src`(+26)、`codex-rs/tui/src`(+25)—— 多为既有子系统内新增,核对是否有新工具/新 Op/Event。

---

## 3. 批次划分(并发 codex 会话,按 RUN.md §8)

受影响节点(156 个,不含 15 个 D-CLEAN)按 id 分组如下——可据此切批,一个会话认领一组、只写自己那批的 node `.md`(共享文件 `index.json`/`llms.txt`/`reference/uncertainty.md` 收尾统一 reconcile):

| 分组 | A-BROKEN | B-HEAVY | C-DRIFT | D-CLEAN | 受影响小计 |
|---|---|---|---|---|---|
| `subsys.core.*` | 0 | 0 | 18 | 1 | 18 |
| `spine.*` | 0 | 1 | 10 | 0 | 11 |
| `ref.*` | 0 | 3 | 8 | 0 | 11 |
| `subsys.providers.*` | 0 | 0 | 10 | 0 | 10 |
| `subsys.exec-sandbox.*` | 0 | 0 | 9 | 3 | 9 |
| `config.*` | 0 | 0 | 8 | 0 | 8 |
| `subsys.tui.*` | 0 | 0 | 8 | 1 | 8 |
| `subsys.config-auth.*` | 0 | 0 | 8 | 0 | 8 |
| `command.*` | 0 | 0 | 6 | 0 | 6 |
| `subsys.mcp.*` | 0 | 0 | 6 | 0 | 6 |
| `subsys.platform.*` | 0 | 0 | 5 | 3 | 5 |
| `cli.*` | 0 | 0 | 3 | 0 | 3 |
| `sdk.*` | 0 | 0 | 2 | 4 | 2 |
| `subsys.app-server.*` | 0 | 0 | 2 | 2 | 2 |
| `subsys.cloud.*` | 0 | 0 | 2 | 1 | 2 |
| `tool.exec-command.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.write-stdin.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.shell-command.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.apply-patch.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.view-image.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.code-mode-exec.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.code-mode-wait.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.update-plan.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.request-user-input.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.request-permissions.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.spawn-agent-v2.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.send-message.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.followup-task.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.wait-agent-v2.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.list-agents.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.spawn-agent-v1.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.send-input-v1.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.wait-agent-v1.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.close-agent-v1.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.resume-agent-v1.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.spawn-agents-on-csv.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.report-agent-job-result.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.list-mcp-resources.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.list-mcp-resource-templates.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.read-mcp-resource.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.tool-search.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.web-search.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.image-generation.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.test-sync-tool.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.mcp-namespace-tools.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.dynamic-tools.*` | 0 | 0 | 1 | 0 | 1 |
| `rpc.overview.*` | 1 | 0 | 0 | 0 | 1 |
| `rpc.thread-methods.*` | 0 | 0 | 1 | 0 | 1 |
| `rpc.turn-methods.*` | 0 | 0 | 1 | 0 | 1 |
| `rpc.fs-command-methods.*` | 0 | 0 | 1 | 0 | 1 |
| `rpc.config-account-methods.*` | 0 | 0 | 1 | 0 | 1 |
| `rpc.mcp-skills-plugin-methods.*` | 0 | 0 | 1 | 0 | 1 |
| `rpc.notifications-thread.*` | 0 | 0 | 1 | 0 | 1 |
| `rpc.notifications-system.*` | 0 | 0 | 1 | 0 | 1 |
| `rpc.server-requests.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.sleep.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.new-context.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.get-context-remaining.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.interrupt-agent-v2.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.list-available-plugins-to-install.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.request-plugin-install.*` | 0 | 0 | 1 | 0 | 1 |
| `surface.cli.*` | 0 | 0 | 1 | 0 | 1 |

> D-CLEAN 的 15 个节点单独一批走"快速复核":只确认 path/行号仍成立,bump `updated=db887d03e1`,省 L2(除非复核发现行号漂了)。

---

## 4. 每节点收尾 & 完成定义

- 单节点循环照 **RUN.md §3**(L1 读源 → L2 独立证伪 → L3 修复),把 `[E:path:line]` 行号重新落准是本次核心。
- 完成即置 `status: verified` + `updated: db887d03e1`(权威取 `git -C ../../../codex/ rev-parse --short HEAD`)。
- **整体收尾**:`node tools/reconcile.mjs` 同步 frontmatter → `index.json`,并把 `index.json` 顶层 `updated` 改成 `db887d03e1`;`node tools/lint.mjs` 全绿;有增删节点则同步 `llms.txt`。
- **git 隔离坑**:只往 `docs/llm-wiki/codex/` 写,别碰 `Best/codex/` 源仓。

---

## 附录 A — 逐节点影响分级(自动生成 @ 5670360009..db887d03e1)

分级:**A-BROKEN**=source 引用了已删/移文件(必改 source 列)· **B-HEAVY**=无删除但 churn≥2000 行 · **C-DRIFT**=轻中度行漂移 · **D-CLEAN**=源全未变(仅复核)。
计数:A-BROKEN=1 · B-HEAVY=4 · C-DRIFT=151 · D-CLEAN=15(共 171)

| node id | tier | del/chg/total-src | ~churn 行 | 已删·移的 source(需重定位) |
|---|---|---|---|---|
| `rpc.overview` | T1 | 1/3/7 | 200 | `codex-rs/app-server-protocol/src/jsonrpc_lite.rs` → `codex-rs/app-server-protocol/src/rpc.rs` |
| `ref.key-types` | T3 | 0/12/16 | 2524 |  |
| `ref.glossary` | T3 | 0/18/26 | 2312 |  |
| `spine.overview` | T0 | 0/13/13 | 2189 |  |
| `ref.env-vars` | T3 | 0/11/26 | 2148 |  |
| `tool.request-user-input` | T1 | 0/7/12 | 1800 |  |
| `spine.turn-end-to-end` | T0 | 0/8/9 | 1782 |  |
| `subsys.core.ghost-undo` | T2 | 0/7/8 | 1520 |  |
| `tool.web-search` | T1 | 0/12/12 | 1505 |  |
| `spine.trace-mcp-call` | T0 | 0/7/7 | 1486 |  |
| `tool.image-generation` | T1 | 0/11/11 | 1483 |  |
| `spine.context-and-compaction` | T0 | 0/6/6 | 1437 |  |
| `subsys.core.compaction` | T2 | 0/7/7 | 1436 |  |
| `subsys.core.collaboration-modes` | T2 | 0/6/14 | 1342 |  |
| `subsys.core.instruction-assembly` | T2 | 0/8/12 | 1327 |  |
| `spine.sq-eq-architecture` | T0 | 0/4/4 | 1301 |  |
| `subsys.core.session-lifecycle` | T2 | 0/9/10 | 1192 |  |
| `subsys.core.memory` | T2 | 0/9/20 | 1119 |  |
| `subsys.platform.network-proxy` | T2 | 0/7/10 | 1095 |  |
| `subsys.mcp.connectors` | T2 | 0/7/7 | 1085 |  |
| `spine.process-lifecycle` | T0 | 0/4/4 | 1079 |  |
| `spine.trace-subagent` | T0 | 0/9/14 | 1075 |  |
| `subsys.mcp.client` | T2 | 0/4/5 | 1053 |  |
| `subsys.core.context-manager` | T2 | 0/5/6 | 960 |  |
| `ref.data-model` | T3 | 0/3/8 | 951 |  |
| `ref.protocol-event-streaming` | T3 | 0/2/3 | 948 |  |
| `subsys.mcp.name-qualification` | T2 | 0/3/3 | 931 |  |
| `tool.request-permissions` | T1 | 0/6/9 | 884 |  |
| `spine.extension-system` | T0 | 0/16/26 | 882 |  |
| `subsys.mcp.transports` | T2 | 0/3/5 | 878 |  |
| `subsys.config-auth.plugins` | T2 | 0/4/6 | 773 |  |
| `subsys.config-auth.auth-flows` | T2 | 0/4/5 | 720 |  |
| `subsys.core.thread-store` | T2 | 0/11/11 | 700 |  |
| `tool.tool-search` | T1 | 0/9/17 | 694 |  |
| `tool.view-image` | T1 | 0/6/9 | 684 |  |
| `ref.protocol-items` | T3 | 0/3/3 | 674 |  |
| `tool.shell-command` | T1 | 0/7/10 | 672 |  |
| `subsys.mcp.oauth` | T2 | 0/4/5 | 609 |  |
| `spine.trace-apply-patch` | T0 | 0/9/9 | 605 |  |
| `subsys.core.unified-exec` | T2 | 0/7/14 | 584 |  |
| `subsys.core.review-mode` | T2 | 0/5/6 | 581 |  |
| `tool.update-plan` | T1 | 0/2/6 | 580 |  |
| `tool.code-mode-exec` | T1 | 0/4/9 | 576 |  |
| `tool.code-mode-wait` | T1 | 0/4/8 | 576 |  |
| `subsys.core.realtime-conversation` | T2 | 0/4/5 | 573 |  |
| `spine.tool-call-anatomy` | T0 | 0/6/7 | 570 |  |
| `tool.apply-patch` | T1 | 0/10/14 | 561 |  |
| `subsys.app-server.message-processor` | T2 | 0/4/4 | 544 |  |
| `config.approval-sandbox` | T1 | 0/4/6 | 540 |  |
| `subsys.providers.overview` | T2 | 0/3/4 | 529 |  |
| `subsys.core.turn-engine` | T2 | 0/5/5 | 526 |  |
| `subsys.providers.model-catalog` | T2 | 0/8/11 | 511 |  |
| `rpc.notifications-thread` | T1 | 0/7/8 | 507 |  |
| `subsys.core.approval-policy` | T2 | 0/3/4 | 504 |  |
| `subsys.core.rollout-persistence` | T2 | 0/5/5 | 486 |  |
| `subsys.config-auth.skills` | T2 | 0/3/6 | 485 |  |
| `subsys.exec-sandbox.apply-patch-engine` | T2 | 0/3/5 | 484 |  |
| `ref.protocol-op` | T3 | 0/1/1 | 483 |  |
| `ref.protocol-event-lifecycle` | T3 | 0/1/1 | 483 |  |
| `tool.request-plugin-install` | T1 | 0/5/6 | 473 |  |
| `rpc.config-account-methods` | T1 | 0/8/13 | 437 |  |
| `subsys.providers.provider-openai` | T2 | 0/2/3 | 437 |  |
| `subsys.providers.auth-layer` | T2 | 0/2/4 | 427 |  |
| `rpc.server-requests` | T1 | 0/6/7 | 424 |  |
| `subsys.config-auth.credential-storage` | T2 | 0/3/8 | 407 |  |
| `subsys.app-server.session-management` | T2 | 0/7/8 | 406 |  |
| `subsys.tui.overlays-dialogs` | T2 | 0/9/22 | 399 |  |
| `subsys.config-auth.profiles` | T2 | 0/4/5 | 383 |  |
| `spine.shell-exec-flow` | T0 | 0/8/8 | 382 |  |
| `tool.sleep` | T1 | 0/3/4 | 380 |  |
| `surface.cli.external-agent-import` | T1 | 0/9/13 | 376 |  |
| `subsys.core.state-db` | T2 | 0/5/8 | 362 |  |
| `subsys.exec-sandbox.exec-server` | T2 | 0/1/3 | 346 |  |
| `tool.interrupt-agent-v2` | T1 | 0/3/6 | 335 |  |
| `rpc.notifications-system` | T1 | 0/7/13 | 322 |  |
| `tool.list-available-plugins-to-install` | T1 | 0/3/5 | 317 |  |
| `rpc.thread-methods` | T1 | 0/2/2 | 305 |  |
| `subsys.platform.analytics` | T2 | 0/5/5 | 304 |  |
| `subsys.tui.architecture` | T2 | 0/7/8 | 286 |  |
| `subsys.tui.event-system` | T2 | 0/7/9 | 278 |  |
| `subsys.exec-sandbox.file-system` | T2 | 0/1/1 | 264 |  |
| `subsys.exec-sandbox.arg0-dispatch` | T2 | 0/2/4 | 254 |  |
| `rpc.mcp-skills-plugin-methods` | T1 | 0/4/4 | 236 |  |
| `tool.write-stdin` | T1 | 0/5/11 | 230 |  |
| `tool.exec-command` | T1 | 0/6/10 | 212 |  |
| `rpc.turn-methods` | T1 | 0/3/4 | 203 |  |
| `tool.resume-agent-v1` | T1 | 0/3/7 | 193 |  |
| `rpc.fs-command-methods` | T1 | 0/1/4 | 193 |  |
| `subsys.config-auth.features-system` | T2 | 0/2/3 | 190 |  |
| `subsys.core.approval-guardian` | T2 | 0/4/6 | 188 |  |
| `subsys.tui.bottom-pane` | T2 | 0/5/12 | 168 |  |
| `subsys.providers.retry-errors` | T2 | 0/3/8 | 160 |  |
| `subsys.tui.status-surfaces` | T2 | 0/3/5 | 155 |  |
| `tool.list-agents` | T1 | 0/3/6 | 151 |  |
| `tool.send-input-v1` | T1 | 0/3/7 | 151 |  |
| `cli.subcommands` | T1 | 0/2/2 | 151 |  |
| `subsys.core.tool-router` | T2 | 0/5/7 | 148 |  |
| `config.skills-plugins-features` | T1 | 0/4/5 | 147 |  |
| `ref.session-tasks` | T3 | 0/6/8 | 146 |  |
| `tool.list-mcp-resources` | T1 | 0/3/4 | 143 |  |
| `tool.list-mcp-resource-templates` | T1 | 0/3/4 | 143 |  |
| `subsys.providers.sse-streaming` | T2 | 0/2/3 | 142 |  |
| `tool.read-mcp-resource` | T1 | 0/3/4 | 133 |  |
| `tool.close-agent-v1` | T1 | 0/3/6 | 130 |  |
| `subsys.core.tool-system` | T2 | 0/3/4 | 125 |  |
| `tool.spawn-agent-v2` | T1 | 0/3/7 | 124 |  |
| `tool.send-message` | T1 | 0/3/7 | 124 |  |
| `tool.followup-task` | T1 | 0/3/7 | 124 |  |
| `tool.test-sync-tool` | T1 | 0/2/4 | 123 |  |
| `config.mcp-tools` | T1 | 0/4/4 | 123 |  |
| `subsys.providers.http-client` | T2 | 0/2/7 | 121 |  |
| `tool.mcp-namespace-tools` | T1 | 0/2/4 | 120 |  |
| `subsys.providers.provider-bedrock` | T2 | 0/3/8 | 119 |  |
| `tool.wait-agent-v2` | T1 | 0/2/5 | 117 |  |
| `tool.spawn-agent-v1` | T1 | 0/2/6 | 117 |  |
| `tool.wait-agent-v1` | T1 | 0/2/5 | 117 |  |
| `tool.get-context-remaining` | T1 | 0/2/4 | 117 |  |
| `ref.feature-flags` | T3 | 0/1/1 | 110 |  |
| `cli.global-flags` | T1 | 0/3/8 | 108 |  |
| `config.model-provider` | T1 | 0/5/6 | 99 |  |
| `tool.new-context` | T1 | 0/2/4 | 99 |  |
| `subsys.exec-sandbox.sandbox-seatbelt` | T2 | 0/1/1 | 98 |  |
| `tool.spawn-agents-on-csv` | T1 | 0/1/6 | 97 |  |
| `tool.report-agent-job-result` | T1 | 0/1/6 | 97 |  |
| `tool.dynamic-tools` | T1 | 0/1/6 | 97 |  |
| `subsys.providers.responses-api` | T2 | 0/3/7 | 78 |  |
| `subsys.exec-sandbox.overview` | T2 | 0/2/3 | 71 |  |
| `subsys.exec-sandbox.sandbox-linux` | T2 | 0/1/4 | 65 |  |
| `subsys.exec-sandbox.sandbox-windows` | T2 | 0/1/2 | 65 |  |
| `subsys.tui.chatwidget` | T2 | 0/5/9 | 61 |  |
| `config.auth-account` | T1 | 0/3/3 | 57 |  |
| `config.ui-tui` | T1 | 0/3/3 | 57 |  |
| `subsys.platform.telemetry-otel` | T2 | 0/2/5 | 51 |  |
| `subsys.config-auth.config-loading` | T2 | 0/6/11 | 42 |  |
| `config.agents-memory` | T1 | 0/2/3 | 35 |  |
| `config.storage-telemetry-misc` | T1 | 0/2/3 | 35 |  |
| `subsys.platform.git-utils` | T2 | 0/1/9 | 32 |  |
| `subsys.exec-sandbox.shell-escalation` | T2 | 0/1/2 | 31 |  |
| `subsys.platform.agent-identity` | T2 | 0/1/2 | 28 |  |
| `cli.exec-mode` | T1 | 0/1/5 | 26 |  |
| `sdk.ts-structured-output` | T1 | 0/1/8 | 26 |  |
| `subsys.tui.onboarding` | T2 | 0/1/3 | 22 |  |
| `ref.crate-index` | T3 | 0/1/1 | 17 |  |
| `subsys.providers.provider-oss` | T2 | 0/1/6 | 16 |  |
| `subsys.mcp.server` | T2 | 0/3/3 | 11 |  |
| `command.session-thread` | T1 | 0/1/1 | 10 |  |
| `command.model-mode` | T1 | 0/1/1 | 10 |  |
| `command.code-review` | T1 | 0/1/1 | 10 |  |
| `command.tools-integrations` | T1 | 0/1/1 | 10 |  |
| `command.config-system` | T1 | 0/1/1 | 10 |  |
| `command.realtime-debug` | T1 | 0/1/1 | 10 |  |
| `subsys.config-auth.hooks` | T2 | 0/2/8 | 10 |  |
| `subsys.tui.streaming-pipeline` | T2 | 0/1/6 | 6 |  |
| `subsys.cloud.cloud-config` | T2 | 0/2/10 | 6 |  |
| `sdk.py-inputs-errors` | T1 | 0/1/5 | 2 |  |
| `subsys.cloud.cloud-tasks` | T2 | 0/1/6 | 2 |  |
| `sdk.ts-overview` | T1 | 0/0/6 |  |  |
| `sdk.ts-events-items` | T1 | 0/0/3 |  |  |
| `sdk.py-overview` | T1 | 0/0/9 |  |  |
| `sdk.sdk-architecture` | T1 | 0/0/11 |  |  |
| `subsys.core.trace-bundle` | T2 | 0/0/11 |  |  |
| `subsys.exec-sandbox.execpolicy-dsl` | T2 | 0/0/6 |  |  |
| `subsys.exec-sandbox.shell-parsing` | T2 | 0/0/1 |  |  |
| `subsys.exec-sandbox.process-hardening` | T2 | 0/0/1 |  |  |
| `subsys.tui.rendering-theming` | T2 | 0/0/5 |  |  |
| `subsys.app-server.transport` | T2 | 0/0/7 |  |  |
| `subsys.app-server.client-libs` | T2 | 0/0/2 |  |  |
| `subsys.cloud.cloud-task-api` | T2 | 0/0/4 |  |  |
| `subsys.platform.file-search` | T2 | 0/0/4 |  |  |
| `subsys.platform.terminal-detection` | T2 | 0/0/2 |  |  |
| `subsys.platform.realtime` | T2 | 0/0/7 |  |  |
