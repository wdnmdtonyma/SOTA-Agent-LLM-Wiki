# UPDATE SCOPE — codex wiki 增量更新令(db887d03e1 → 4d7a5c7c73)

> 本文件由分析会话生成(2026-07-19),给执行更新的 codex 会话读。
> **基线(wiki 当前 verified 的 codex HEAD)**:`db887d03e1f907467e33271572dffb73bceecd6b`
> **目标(已 checkout 的 codex submodule HEAD,上游 `main` 分支)**:`4d7a5c7c7394b687ebcb67e634528b2b8c5578d9`
> **跨度**:411 commit · 1679 files changed, 119799 insertions(+), 35098 deletions(-) · 2026-07-01 → 2026-07-19

复现 diff(在 `codex/` 内):
```
git diff --stat db887d03e1f907467e33271572dffb73bceecd6b..4d7a5c7c7394b687ebcb67e634528b2b8c5578d9
```

> 执行前先读 **`RUN.md`**(填充令,L1→L2→L3 流程不变)+ **`conventions.md`**(节点模板 / 证据分级)。本文件只回答"这次改了哪些、每个节点要动什么",不重复 RUN.md 的方法论。

## 0. 结论:两次 crate 改名 + 高强度 churn,本轮三仓中最重

| 维度 | 数字 |
|---|---|
| 被 wiki 引用的去重源文件 | 615 |
| ├ 已删/移 | **17** |
| ├ 改动(churn) | **289** |
| └ 不变 | 309 |
| 节点(172) | |
| ├ 结构性失效(A-BROKEN) | **7** |
| ├ 重 churn(B-HEAVY≥2000 行) | **4** |
| ├ 轻中 churn(C-DRIFT) | **144** |
| └ 完全不受影响(D-CLEAN,仅复核) | **17** |

churn 集中在 `codex-rs/tui/src`(265 改/77 新)、`codex-rs/core/src`(249 改/37 新)、`codex-rs/app-server-protocol/schema`(128 改/32 新)。**7 个 A-BROKEN 全部已定位**,主因是三件结构性变化:
1. **`codex-rs/codex-client/` crate 改名为 `codex-rs/http-client/`**(影响 `ref.env-vars`、`subsys.providers.retry-errors`、`subsys.providers.http-client`)——机械改路径。
2. **`codex-rs/external-agent-sessions/` 重组为 `codex-rs/external-agent-migration/`**(影响 `surface.cli.external-agent-import`,该节点 churn 5510 行,是全仓最重的一个节点,要按新结构重读)。
3. 零散删除:`core/src/context/collaboration_mode_instructions.rs`(删,`subsys.core.collaboration-modes` 需找新去处)、`realtime-webrtc/src/{lib,native}.rs`(删,`subsys.platform.realtime` 需确认 realtime 子系统现状)、`core/src/review_format.rs` → `protocol/src/review_format.rs`(机械改路径)。

---

## 1. 结构性失效(A-BROKEN,先修:必改 source 列)

- **`surface.cli.external-agent-import`**(churn ~5510 行):
  - `codex-rs/external-agent-sessions/src/lib.rs` → `codex-rs/external-agent-migration/src/sessions/mod.rs`(机械改路径)
  - `codex-rs/external-agent-sessions/src/detect.rs` → `codex-rs/external-agent-migration/src/detect/sessions/cla.rs`(机械改路径)
  - `codex-rs/external-agent-sessions/src/export.rs` → `codex-rs/external-agent-migration/src/sessions/export.rs`(机械改路径)
  - `codex-rs/external-agent-sessions/src/ledger.rs` → `codex-rs/external-agent-migration/src/sessions/ledger.rs`(机械改路径)
  - `codex-rs/external-agent-sessions/src/records.rs` → `codex-rs/external-agent-migration/src/sessions/records.rs`(机械改路径)
  - `codex-rs/app-server/src/config/external_agent_config.rs` → **已删,读新结构重定位**
  - `codex-rs/app-server/src/request_processors/external_agent_config_processor.rs` → **已删,读新结构重定位**
  - `codex-rs/app-server/src/request_processors/external_agent_session_import.rs` → `codex-rs/app-server/src/external_agent_migration/session_importer.rs`(机械改路径)
- **`ref.env-vars`**(churn ~2040 行):
  - `codex-rs/codex-client/src/custom_ca.rs` → `codex-rs/http-client/src/custom_ca.rs`(机械改路径)
- **`subsys.core.collaboration-modes`**(churn ~1287 行):
  - `codex-rs/core/src/context/collaboration_mode_instructions.rs` → **已删,读新结构重定位**
- **`subsys.core.review-mode`**(churn ~831 行):
  - `codex-rs/core/src/review_format.rs` → `codex-rs/protocol/src/review_format.rs`(机械改路径)
- **`subsys.platform.realtime`**(churn ~657 行):
  - `codex-rs/realtime-webrtc/src/lib.rs` → **已删,读新结构重定位**
  - `codex-rs/realtime-webrtc/src/native.rs` → **已删,读新结构重定位**
- **`subsys.providers.retry-errors`**(churn ~244 行):
  - `codex-rs/codex-client/src/error.rs` → `codex-rs/http-client/src/error.rs`(机械改路径)
  - `codex-rs/codex-client/src/transport.rs` → `codex-rs/http-client/src/transport.rs`(机械改路径)
- **`subsys.providers.http-client`**(churn ~69 行):
  - `codex-rs/codex-client/src/default_client.rs` → `codex-rs/http-client/src/default_client.rs`(机械改路径)
  - `codex-rs/codex-client/src/request.rs` → `codex-rs/http-client/src/request.rs`(机械改路径)
  - `codex-rs/codex-client/src/transport.rs` → `codex-rs/http-client/src/transport.rs`(机械改路径)

---

## 2. 新增面扫描(355 新文件 → 判断是否需新节点)

对照现有 `index.json`,重点核这些新增区是否已有节点覆盖,缺则按 `conventions.md` 建新节点并登记 `index.json` + `llms.txt`:
- `codex-rs/external-agent-migration/`(+47,由 `external-agent-sessions` 重组扩建):`surface.cli.external-agent-import` 单节点是否够,还是要拆?
- `codex-rs/tui/src`(+77)、`codex-rs/core/src`(+37):既有子系统内新增,核对是否有新工具/新 Op/Event/新 overlay 需要进对应节点。
- `codex-rs/app-server-protocol/schema`(+32):schema 扩面,`rpc.*` 节点核对新方法/通知。
- `codex-rs/ext/skills`(+10)、`codex-rs/ext/items`(+7):ext 体系扩面,核对 `spine.extension-system` 是否覆盖。
- `codex-rs/connectors/src`(+6)、`codex-rs/codex-mcp/src`(+5)、`codex-rs/thread-store/src`(+8):上轮新建的子系统继续演进,核对既有节点。

---

## 3. 批次划分(并发会话,按 RUN.md §8)

受影响节点(155 个,不含 17 个 D-CLEAN)按 id 分组如下——可据此切批,一个会话认领一组、只写自己那批的 node `.md`(共享文件 `index.json`/`llms.txt`/`reference/uncertainty.md` 收尾统一 reconcile):

| 分组 | A-BROKEN | B-HEAVY | C-DRIFT | D-CLEAN | 受影响小计 |
|---|---|---|---|---|---|
| `tool.*` | 0 | 2 | 35 | 0 | 37 |
| `subsys.core.*` | 2 | 0 | 16 | 1 | 18 |
| `spine.*` | 0 | 0 | 11 | 0 | 11 |
| `ref.*` | 1 | 1 | 9 | 1 | 11 |
| `subsys.providers.*` | 2 | 0 | 8 | 0 | 10 |
| `rpc.*` | 0 | 0 | 9 | 0 | 9 |
| `subsys.tui.*` | 0 | 1 | 8 | 0 | 9 |
| `config.*` | 0 | 0 | 8 | 0 | 8 |
| `subsys.config-auth.*` | 0 | 0 | 8 | 0 | 8 |
| `command.*` | 0 | 0 | 6 | 0 | 6 |
| `subsys.mcp.*` | 0 | 0 | 6 | 0 | 6 |
| `subsys.platform.*` | 1 | 0 | 5 | 2 | 6 |
| `sdk.*` | 0 | 0 | 5 | 1 | 5 |
| `cli.*` | 0 | 0 | 3 | 0 | 3 |
| `subsys.exec-sandbox.*` | 0 | 0 | 3 | 9 | 3 |
| `subsys.app-server.*` | 0 | 0 | 3 | 1 | 3 |
| `subsys.cloud.*` | 0 | 0 | 1 | 2 | 1 |
| `surface.cli.*` | 1 | 0 | 0 | 0 | 1 |

> D-CLEAN 的 17 个节点单独一批走"快速复核":只确认 path/行号仍成立,bump `updated=4d7a5c7c73`,省 L2(除非复核发现行号漂了)。

---

## 4. 每节点收尾 & 完成定义

- 单节点循环照 **RUN.md §3**(L1 读源 → L2 独立证伪 → L3 修复),把 `[E:path:line]` 行号重新落准是本次核心。
- 完成即置 `status: verified` + `updated: 4d7a5c7c73`(权威取 `git -C ../../../codex/ rev-parse --short HEAD`)。
- **整体收尾**:`node tools/reconcile.mjs` 同步 frontmatter → `index.json`,并把 `index.json` 顶层 `updated` 改成 `4d7a5c7c73`;`node tools/lint.mjs` 全绿;有增删节点则同步 `llms.txt`。
- **git 隔离坑**:只往 `docs/llm-wiki/codex/` 写,别碰 `codex/` 源仓。

---

## 附录 A — 逐节点影响分级(自动生成 @ db887d03e1..4d7a5c7c73)

分级:**A-BROKEN**=source 引用了已删/移文件(必改 source 列)· **B-HEAVY**=无删除但 churn≥2000 行 · **C-DRIFT**=轻中度行漂移 · **D-CLEAN**=源全未变(仅复核)。
计数:A-BROKEN=7 · B-HEAVY=4 · C-DRIFT=144 · D-CLEAN=17(共 172)

| node id | tier | 分级 | del/chg/total-src | ~churn 行 | 已删·移的 source(需重定位) |
|---|---|---|---|---|---|
| `surface.cli.external-agent-import` | T1 | A-BROKEN | 8/5/13 | 5510 | `codex-rs/external-agent-sessions/src/lib.rs` → `codex-rs/external-agent-migration/src/sessions/mod.rs`; `codex-rs/external-agent-sessions/src/detect.rs` → `codex-rs/external-agent-migration/src/detect/sessions/cla.rs`; `codex-rs/external-agent-sessions/src/export.rs` → `codex-rs/external-agent-migration/src/sessions/export.rs`; `codex-rs/external-agent-sessions/src/ledger.rs` → `codex-rs/external-agent-migration/src/sessions/ledger.rs`; `codex-rs/external-agent-sessions/src/records.rs` → `codex-rs/external-agent-migration/src/sessions/records.rs`; `codex-rs/app-server/src/config/external_agent_config.rs` → **已删,需重定位**; `codex-rs/app-server/src/request_processors/external_agent_config_processor.rs` → **已删,需重定位**; `codex-rs/app-server/src/request_processors/external_agent_session_import.rs` → `codex-rs/app-server/src/external_agent_migration/session_importer.rs` |
| `ref.env-vars` | T3 | A-BROKEN | 1/13/27 | 2040 | `codex-rs/codex-client/src/custom_ca.rs` → `codex-rs/http-client/src/custom_ca.rs` |
| `subsys.core.collaboration-modes` | T2 | A-BROKEN | 1/6/14 | 1287 | `codex-rs/core/src/context/collaboration_mode_instructions.rs` → **已删,需重定位** |
| `subsys.core.review-mode` | T2 | A-BROKEN | 1/5/6 | 831 | `codex-rs/core/src/review_format.rs` → `codex-rs/protocol/src/review_format.rs` |
| `subsys.platform.realtime` | T2 | A-BROKEN | 2/3/7 | 657 | `codex-rs/realtime-webrtc/src/lib.rs` → **已删,需重定位**; `codex-rs/realtime-webrtc/src/native.rs` → **已删,需重定位** |
| `subsys.providers.retry-errors` | T2 | A-BROKEN | 2/4/8 | 244 | `codex-rs/codex-client/src/error.rs` → `codex-rs/http-client/src/error.rs`; `codex-rs/codex-client/src/transport.rs` → `codex-rs/http-client/src/transport.rs` |
| `subsys.providers.http-client` | T2 | A-BROKEN | 3/3/7 | 69 | `codex-rs/codex-client/src/default_client.rs` → `codex-rs/http-client/src/default_client.rs`; `codex-rs/codex-client/src/request.rs` → `codex-rs/http-client/src/request.rs`; `codex-rs/codex-client/src/transport.rs` → `codex-rs/http-client/src/transport.rs` |
| `ref.glossary` | T3 | B-HEAVY | 0/18/26 | 2844 |  |
| `subsys.tui.bottom-pane` | T2 | B-HEAVY | 0/5/12 | 2573 |  |
| `tool.web-search` | T1 | B-HEAVY | 0/12/12 | 2369 |  |
| `tool.image-generation` | T1 | B-HEAVY | 0/11/11 | 2335 |  |
| `spine.overview` | T0 | C-DRIFT | 0/12/13 | 1952 |  |
| `ref.key-types` | T3 | C-DRIFT | 0/13/16 | 1917 |  |
| `spine.trace-subagent` | T0 | C-DRIFT | 0/12/14 | 1726 |  |
| `subsys.core.ghost-undo` | T2 | C-DRIFT | 0/7/8 | 1693 |  |
| `subsys.app-server.message-processor` | T2 | C-DRIFT | 0/4/4 | 1576 |  |
| `tool.request-user-input` | T1 | C-DRIFT | 0/7/12 | 1560 |  |
| `spine.turn-end-to-end` | T0 | C-DRIFT | 0/9/9 | 1535 |  |
| `tool.tool-search` | T1 | C-DRIFT | 0/12/17 | 1512 |  |
| `subsys.app-server.session-management` | T2 | C-DRIFT | 0/8/8 | 1360 |  |
| `subsys.core.realtime-conversation` | T2 | C-DRIFT | 0/3/5 | 1356 |  |
| `subsys.providers.model-catalog` | T2 | C-DRIFT | 0/10/11 | 1326 |  |
| `spine.sq-eq-architecture` | T0 | C-DRIFT | 0/4/4 | 1284 |  |
| `subsys.core.memory` | T2 | C-DRIFT | 0/9/20 | 1278 |  |
| `ref.data-model` | T3 | C-DRIFT | 0/5/8 | 1278 |  |
| `ref.protocol-event-streaming` | T3 | C-DRIFT | 0/3/3 | 1271 |  |
| `subsys.tui.overlays-dialogs` | T2 | C-DRIFT | 0/13/23 | 1270 |  |
| `subsys.core.compaction` | T2 | C-DRIFT | 0/6/7 | 1250 |  |
| `tool.shell-command` | T1 | C-DRIFT | 0/7/12 | 1166 |  |
| `tool.view-image` | T1 | C-DRIFT | 0/6/9 | 1133 |  |
| `spine.context-and-compaction` | T0 | C-DRIFT | 0/6/6 | 1106 |  |
| `subsys.tui.architecture` | T2 | C-DRIFT | 0/7/8 | 1014 |  |
| `subsys.platform.network-proxy` | T2 | C-DRIFT | 0/9/10 | 979 |  |
| `subsys.core.unified-exec` | T2 | C-DRIFT | 0/12/14 | 953 |  |
| `spine.extension-system` | T0 | C-DRIFT | 0/17/27 | 937 |  |
| `subsys.core.session-lifecycle` | T2 | C-DRIFT | 0/8/10 | 934 |  |
| `subsys.core.instruction-assembly` | T2 | C-DRIFT | 0/10/14 | 858 |  |
| `spine.trace-mcp-call` | T0 | C-DRIFT | 0/7/7 | 841 |  |
| `ref.protocol-items` | T3 | C-DRIFT | 0/2/3 | 841 |  |
| `spine.tool-call-anatomy` | T0 | C-DRIFT | 0/7/7 | 809 |  |
| `subsys.tui.event-system` | T2 | C-DRIFT | 0/8/9 | 793 |  |
| `subsys.core.context-manager` | T2 | C-DRIFT | 0/6/7 | 776 |  |
| `tool.request-permissions` | T1 | C-DRIFT | 0/7/9 | 772 |  |
| `config.approval-sandbox` | T1 | C-DRIFT | 0/6/6 | 743 |  |
| `tool.resume-agent-v1` | T1 | C-DRIFT | 0/6/7 | 740 |  |
| `spine.process-lifecycle` | T0 | C-DRIFT | 0/3/4 | 703 |  |
| `rpc.config-account-methods` | T1 | C-DRIFT | 0/7/13 | 700 |  |
| `subsys.core.thread-store` | T2 | C-DRIFT | 0/9/11 | 678 |  |
| `tool.send-input-v1` | T1 | C-DRIFT | 0/6/7 | 656 |  |
| `tool.update-plan` | T1 | C-DRIFT | 0/3/6 | 645 |  |
| `subsys.core.approval-policy` | T2 | C-DRIFT | 0/2/4 | 629 |  |
| `subsys.config-auth.auth-flows` | T2 | C-DRIFT | 0/4/5 | 625 |  |
| `tool.interrupt-agent-v2` | T1 | C-DRIFT | 0/5/6 | 583 |  |
| `rpc.notifications-thread` | T1 | C-DRIFT | 0/6/8 | 572 |  |
| `rpc.server-requests` | T1 | C-DRIFT | 0/4/8 | 572 |  |
| `rpc.notifications-system` | T1 | C-DRIFT | 0/5/13 | 560 |  |
| `subsys.core.turn-engine` | T2 | C-DRIFT | 0/5/5 | 558 |  |
| `subsys.config-auth.plugins` | T2 | C-DRIFT | 0/3/6 | 557 |  |
| `subsys.mcp.client` | T2 | C-DRIFT | 0/4/5 | 553 |  |
| `subsys.config-auth.skills` | T2 | C-DRIFT | 0/2/6 | 501 |  |
| `ref.protocol-op` | T3 | C-DRIFT | 0/1/1 | 497 |  |
| `ref.protocol-event-lifecycle` | T3 | C-DRIFT | 0/1/1 | 497 |  |
| `tool.spawn-agent-v2` | T1 | C-DRIFT | 0/5/7 | 490 |  |
| `tool.request-plugin-install` | T1 | C-DRIFT | 0/4/6 | 479 |  |
| `subsys.mcp.oauth` | T2 | C-DRIFT | 0/3/5 | 477 |  |
| `tool.spawn-agent-v1` | T1 | C-DRIFT | 0/5/6 | 475 |  |
| `tool.list-agents` | T1 | C-DRIFT | 0/4/6 | 469 |  |
| `tool.sleep` | T1 | C-DRIFT | 0/3/4 | 464 |  |
| `subsys.core.tool-router` | T2 | C-DRIFT | 0/5/7 | 458 |  |
| `tool.list-available-plugins-to-install` | T1 | C-DRIFT | 0/2/5 | 457 |  |
| `spine.trace-apply-patch` | T0 | C-DRIFT | 0/6/9 | 454 |  |
| `subsys.core.rollout-persistence` | T2 | C-DRIFT | 0/4/5 | 442 |  |
| `subsys.tui.streaming-pipeline` | T2 | C-DRIFT | 0/4/6 | 438 |  |
| `spine.shell-exec-flow` | T0 | C-DRIFT | 0/6/8 | 437 |  |
| `subsys.config-auth.hooks` | T2 | C-DRIFT | 0/7/8 | 433 |  |
| `rpc.mcp-skills-plugin-methods` | T1 | C-DRIFT | 0/3/4 | 427 |  |
| `subsys.tui.chatwidget` | T2 | C-DRIFT | 0/7/10 | 423 |  |
| `subsys.mcp.transports` | T2 | C-DRIFT | 0/4/5 | 413 |  |
| `subsys.mcp.connectors` | T2 | C-DRIFT | 0/3/7 | 411 |  |
| `tool.exec-command` | T1 | C-DRIFT | 0/8/10 | 398 |  |
| `subsys.core.state-db` | T2 | C-DRIFT | 0/6/8 | 397 |  |
| `rpc.thread-methods` | T1 | C-DRIFT | 0/2/2 | 384 |  |
| `tool.wait-agent-v1` | T1 | C-DRIFT | 0/4/5 | 359 |  |
| `subsys.mcp.name-qualification` | T2 | C-DRIFT | 0/3/3 | 339 |  |
| `config.model-provider` | T1 | C-DRIFT | 0/5/6 | 335 |  |
| `tool.close-agent-v1` | T1 | C-DRIFT | 0/5/6 | 331 |  |
| `tool.test-sync-tool` | T1 | C-DRIFT | 0/2/4 | 326 |  |
| `tool.write-stdin` | T1 | C-DRIFT | 0/8/11 | 324 |  |
| `rpc.turn-methods` | T1 | C-DRIFT | 0/3/4 | 318 |  |
| `subsys.config-auth.profiles` | T2 | C-DRIFT | 0/3/5 | 317 |  |
| `rpc.overview` | T1 | C-DRIFT | 0/4/7 | 293 |  |
| `subsys.core.approval-guardian` | T2 | C-DRIFT | 0/4/6 | 290 |  |
| `tool.wait-agent-v2` | T1 | C-DRIFT | 0/4/5 | 284 |  |
| `tool.send-message` | T1 | C-DRIFT | 0/4/7 | 283 |  |
| `tool.followup-task` | T1 | C-DRIFT | 0/4/7 | 283 |  |
| `subsys.providers.provider-bedrock` | T2 | C-DRIFT | 0/5/8 | 283 |  |
| `subsys.providers.overview` | T2 | C-DRIFT | 0/3/4 | 282 |  |
| `tool.code-mode-exec` | T1 | C-DRIFT | 0/6/9 | 281 |  |
| `rpc.fs-command-methods` | T1 | C-DRIFT | 0/1/4 | 275 |  |
| `subsys.tui.status-surfaces` | T2 | C-DRIFT | 0/4/5 | 259 |  |
| `subsys.config-auth.credential-storage` | T2 | C-DRIFT | 0/2/8 | 250 |  |
| `tool.apply-patch` | T1 | C-DRIFT | 0/7/14 | 248 |  |
| `tool.dynamic-tools` | T1 | C-DRIFT | 0/4/6 | 232 |  |
| `subsys.providers.sse-streaming` | T2 | C-DRIFT | 0/3/3 | 230 |  |
| `subsys.exec-sandbox.file-system` | T2 | C-DRIFT | 0/1/1 | 224 |  |
| `ref.session-tasks` | T3 | C-DRIFT | 0/6/8 | 218 |  |
| `tool.code-mode-wait` | T1 | C-DRIFT | 0/4/8 | 193 |  |
| `subsys.core.tool-system` | T2 | C-DRIFT | 0/4/4 | 190 |  |
| `subsys.exec-sandbox.exec-server` | T2 | C-DRIFT | 0/1/3 | 186 |  |
| `tool.spawn-agents-on-csv` | T1 | C-DRIFT | 0/3/6 | 167 |  |
| `subsys.providers.provider-openai` | T2 | C-DRIFT | 0/2/3 | 164 |  |
| `tool.report-agent-job-result` | T1 | C-DRIFT | 0/2/6 | 159 |  |
| `config.skills-plugins-features` | T1 | C-DRIFT | 0/4/5 | 158 |  |
| `tool.mcp-namespace-tools` | T1 | C-DRIFT | 0/3/4 | 157 |  |
| `tool.list-mcp-resources` | T1 | C-DRIFT | 0/2/4 | 148 |  |
| `tool.list-mcp-resource-templates` | T1 | C-DRIFT | 0/2/4 | 148 |  |
| `tool.read-mcp-resource` | T1 | C-DRIFT | 0/2/4 | 148 |  |
| `tool.get-context-remaining` | T1 | C-DRIFT | 0/2/4 | 148 |  |
| `subsys.platform.analytics` | T2 | C-DRIFT | 0/5/5 | 147 |  |
| `tool.new-context` | T1 | C-DRIFT | 0/1/4 | 146 |  |
| `subsys.providers.auth-layer` | T2 | C-DRIFT | 0/2/4 | 140 |  |
| `config.mcp-tools` | T1 | C-DRIFT | 0/4/4 | 124 |  |
| `config.auth-account` | T1 | C-DRIFT | 0/3/3 | 123 |  |
| `config.ui-tui` | T1 | C-DRIFT | 0/3/3 | 123 |  |
| `config.agents-memory` | T1 | C-DRIFT | 0/2/3 | 89 |  |
| `config.storage-telemetry-misc` | T1 | C-DRIFT | 0/2/3 | 89 |  |
| `subsys.platform.agent-identity` | T2 | C-DRIFT | 0/1/2 | 85 |  |
| `subsys.config-auth.features-system` | T2 | C-DRIFT | 0/3/3 | 78 |  |
| `ref.feature-flags` | T3 | C-DRIFT | 0/1/1 | 60 |  |
| `cli.exec-mode` | T1 | C-DRIFT | 0/3/5 | 50 |  |
| `subsys.platform.git-utils` | T2 | C-DRIFT | 0/1/9 | 46 |  |
| `subsys.config-auth.config-loading` | T2 | C-DRIFT | 0/2/11 | 42 |  |
| `cli.global-flags` | T1 | C-DRIFT | 0/2/8 | 36 |  |
| `subsys.providers.provider-oss` | T2 | C-DRIFT | 0/1/6 | 32 |  |
| `subsys.providers.responses-api` | T2 | C-DRIFT | 0/1/7 | 32 |  |
| `sdk.ts-structured-output` | T1 | C-DRIFT | 0/2/8 | 31 |  |
| `ref.crate-index` | T3 | C-DRIFT | 0/1/1 | 21 |  |
| `subsys.mcp.server` | T2 | C-DRIFT | 0/2/3 | 17 |  |
| `subsys.app-server.transport` | T2 | C-DRIFT | 0/2/7 | 17 |  |
| `command.realtime-debug` | T1 | C-DRIFT | 0/2/4 | 9 |  |
| `sdk.py-overview` | T1 | C-DRIFT | 0/1/9 | 8 |  |
| `cli.subcommands` | T1 | C-DRIFT | 0/1/2 | 7 |  |
| `subsys.tui.rendering-theming` | T2 | C-DRIFT | 0/1/5 | 5 |  |
| `sdk.ts-events-items` | T1 | C-DRIFT | 0/2/3 | 4 |  |
| `sdk.sdk-architecture` | T1 | C-DRIFT | 0/2/11 | 4 |  |
| `subsys.tui.onboarding` | T2 | C-DRIFT | 0/1/3 | 3 |  |
| `command.session-thread` | T1 | C-DRIFT | 0/1/3 | 2 |  |
| `command.model-mode` | T1 | C-DRIFT | 0/1/3 | 2 |  |
| `command.code-review` | T1 | C-DRIFT | 0/1/1 | 2 |  |
| `command.tools-integrations` | T1 | C-DRIFT | 0/1/3 | 2 |  |
| `command.config-system` | T1 | C-DRIFT | 0/1/3 | 2 |  |
| `sdk.ts-overview` | T1 | C-DRIFT | 0/1/6 | 2 |  |
| `subsys.exec-sandbox.shell-escalation` | T2 | C-DRIFT | 0/1/2 | 2 |  |
| `subsys.cloud.cloud-tasks` | T2 | C-DRIFT | 0/1/6 | 2 |  |
| `subsys.platform.telemetry-otel` | T2 | C-DRIFT | 0/1/5 | 1 |  |
| `sdk.py-inputs-errors` | T1 | D-CLEAN | 0/0/5 |  |  |
| `subsys.core.trace-bundle` | T2 | D-CLEAN | 0/0/11 |  |  |
| `subsys.exec-sandbox.overview` | T2 | D-CLEAN | 0/0/3 |  |  |
| `subsys.exec-sandbox.execpolicy-dsl` | T2 | D-CLEAN | 0/0/6 |  |  |
| `subsys.exec-sandbox.apply-patch-engine` | T2 | D-CLEAN | 0/0/5 |  |  |
| `subsys.exec-sandbox.sandbox-seatbelt` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.exec-sandbox.sandbox-linux` | T2 | D-CLEAN | 0/0/4 |  |  |
| `subsys.exec-sandbox.sandbox-windows` | T2 | D-CLEAN | 0/0/2 |  |  |
| `subsys.exec-sandbox.shell-parsing` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.exec-sandbox.process-hardening` | T2 | D-CLEAN | 0/0/1 |  |  |
| `subsys.exec-sandbox.arg0-dispatch` | T2 | D-CLEAN | 0/0/4 |  |  |
| `subsys.app-server.client-libs` | T2 | D-CLEAN | 0/0/2 |  |  |
| `subsys.cloud.cloud-task-api` | T2 | D-CLEAN | 0/0/4 |  |  |
| `subsys.cloud.cloud-config` | T2 | D-CLEAN | 0/0/10 |  |  |
| `subsys.platform.file-search` | T2 | D-CLEAN | 0/0/4 |  |  |
| `subsys.platform.terminal-detection` | T2 | D-CLEAN | 0/0/2 |  |  |
| `ref.uncertainty` | T3 | D-CLEAN | 0/0/0 |  |  |
