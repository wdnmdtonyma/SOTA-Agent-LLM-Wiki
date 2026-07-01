# UPDATE SCOPE — opencode wiki 增量更新令(355a0bcf5 → 8b68dc0d7)

> 本文件由分析会话生成(2026-07-01),给执行更新的 codex 会话读。
> **基线(wiki 当前 verified 的 opencode HEAD)**:`355a0bcf5bb5e6c7baa271a4b2439a40f286e55d`
> **目标(已 checkout 的 opencode submodule HEAD)**:`8b68dc0d7fa24d820990461eed13bec2e604c157`
> **跨度**:514 commit · 1470 files changed, 88865 insertions(+), 35012 deletions(-) · 2026-06-18 → 2026-07-01

复现 diff(在 `Best/opencode/` 内):
```
git diff --stat 355a0bcf5bb5e6c7baa271a4b2439a40f286e55d..8b68dc0d7fa24d820990461eed13bec2e604c157
```

> 执行前先读 **`RUN.md`**(填充令,L1→L2→L3 流程不变)+ **`conventions.md`**(节点模板 / 证据分级)。本文件只回答"这次改了哪些、每个节点要动什么",不重复 RUN.md 的方法论。

## 0. 结论:三者里最重——v1/v2 + plugin 系统在活跃重构

| 维度 | 数字 |
|---|---|
| 被 wiki 引用的去重源文件 | 477 |
| ├ 已删/移 | **13** |
| ├ 改动(churn) | **243** |
| └ 不变 | 221 |
| 节点(183) | |
| ├ 结构性失效(A-BROKEN) | **22** |
| ├ 重 churn(B-HEAVY≥2000 行) | **0** |
| ├ 轻中 churn(C-DRIFT) | **137** |
| └ 完全不受影响(D-CLEAN,仅复核) | **24** |

churn 面广:客户端 UI(`session-ui`/`app`)、plugin 系统(`core/src/plugin` 改 44 文件)、`core/session`。22 个结构性节点分两类,见 §1。

---

## 1. 结构性失效(A-BROKEN,先修:必改 source 列)

- `packages/core/src/public/opencode.ts` 已删除,读新结构重定位对应逻辑 — 4 节点:`spine.overview`, `spine.v1-v2-relationship`, `spine.v2-overview`, `session-v2.location-wiring`
- `packages/core/src/plugin/boot.ts` 已删除,读新结构重定位对应逻辑 — 4 节点:`tool.skill`, `plugin-api.v2-hooks`, `model-layer.model-catalog-v2`, `provider.snowflake-cortex`
- `packages/core/src/location-layer.ts` 已删除,读新结构重定位对应逻辑 — 4 节点:`session-v2.system-context-registry`, `session-v2.location-wiring`, `persistence.project-instance-location`, `persistence.project-directories`
- `packages/core/src/integration/schema.ts` 已删除,读新结构重定位对应逻辑 — 3 节点:`provider.auth-accounts`, `model-layer.credential-v2`, `integrations.integration-v2`
- `packages/core/src/permission/schema.ts` 已删除,读新结构重定位对应逻辑 — 2 节点:`execution.permissions-v2`, `ref.permission-actions`
- `packages/core/src/session/message-id.ts` 已删除,读新结构重定位对应逻辑 — 2 节点:`ref.id-prefixes`, `ref.data-model`
- `packages/core/src/model-request.ts` 已删除,读新结构重定位对应逻辑 — 1 节点:`session-v2.model-resolution`
- `packages/server/src/groups/pty.ts` → 移至 `packages/protocol/src/groups/pty.ts`(改 source 路径即可) — 1 节点:`execution.pty`
- `packages/server/src/groups/command.ts` → 移至 `packages/protocol/src/groups/command.ts`(改 source 路径即可) — 1 节点:`integrations.commands`
- `packages/server/src/groups/question.ts` 已删除,读新结构重定位对应逻辑 — 1 节点:`integrations.question`
- `packages/server/src/groups/integration.ts` → 移至 `packages/protocol/src/groups/integration.ts`(改 source 路径即可) — 1 节点:`integrations.integration-v2`
- `packages/server/src/groups/credential.ts` → 移至 `packages/protocol/src/groups/credential.ts`(改 source 路径即可) — 1 节点:`integrations.integration-v2`
- `packages/server/src/groups/project-copy.ts` → 移至 `packages/protocol/src/groups/project-copy.ts`(改 source 路径即可) — 1 节点:`persistence.project-directories`

> 分两类:**(a) 机械路径修**——`groups/*` 从 `packages/server/src/` 整体移到 `packages/protocol/src/`(rename score 69–95,内容基本不变),改 source 路径 + 复核行号即可;**(b) 真删除**——`public/opencode.ts`、`plugin/boot.ts`、`location-layer.ts`、`integration/schema.ts`、`permission/schema.ts`、`session/message-id.ts`、`model-request.ts` 是 v2 core 重构产物,得读新结构、重新定位对应逻辑落到哪个文件。

---

## 2. 新增面扫描(355 新文件 → 判断是否需新节点)

- `packages/plugin/src/v2`(+31)——v2 插件系统成形,核对 `tui.dialog-kit`/plugin 相关节点是否要扩或新建。
- `packages/ui/src/v2`(+8)、`packages/protocol/src/groups`(+6,含新 `question.ts`)。
- `packages/stats/app`(+25)、`packages/app/e2e/*`(性能/回归测试)——外围,多半可跳,`log` 一句说明跳过即可。

---

## 3. 批次划分(并发 codex 会话,按 RUN.md §8)

受影响节点(159 个,不含 24 个 D-CLEAN)按 id 分组如下——可据此切批,一个会话认领一组、只写自己那批的 node `.md`(共享文件 `index.json`/`llms.txt`/`reference/uncertainty.md` 收尾统一 reconcile):

| 分组 | A-BROKEN | B-HEAVY | C-DRIFT | D-CLEAN | 受影响小计 |
|---|---|---|---|---|---|
| `ref.*` | 3 | 0 | 21 | 7 | 24 |
| `spine.*` | 3 | 0 | 12 | 0 | 15 |
| `integrations.*` | 3 | 0 | 7 | 0 | 10 |
| `model-layer.*` | 2 | 0 | 3 | 5 | 5 |
| `server.*` | 0 | 0 | 4 | 2 | 4 |
| `config.*` | 0 | 0 | 3 | 3 | 3 |
| `subsys.tools.*` | 0 | 0 | 3 | 0 | 3 |
| `cli.*` | 0 | 0 | 2 | 1 | 2 |
| `sdk.*` | 0 | 0 | 2 | 0 | 2 |
| `tool.read.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.edit.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.write.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.bash.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.glob.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.grep.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.apply-patch.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.task.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.webfetch.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.websearch.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.todowrite.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.skill.*` | 1 | 0 | 0 | 0 | 1 |
| `tool.question.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.lsp.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.plan-exit.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.invalid.*` | 0 | 0 | 1 | 0 | 1 |
| `tool.external-directory.*` | 0 | 0 | 1 | 0 | 1 |
| `agent.builtins.*` | 0 | 0 | 1 | 0 | 1 |
| `agent.config.*` | 0 | 0 | 1 | 0 | 1 |
| `prompt.system-prompts.*` | 0 | 0 | 1 | 0 | 1 |
| `provider.resolution.*` | 0 | 0 | 1 | 0 | 1 |
| `provider.auth-accounts.*` | 1 | 0 | 0 | 0 | 1 |
| `provider.catalog.*` | 0 | 0 | 1 | 0 | 1 |
| `server-api.*` | 0 | 0 | 1 | 2 | 1 |
| `plugin-api.v1-hooks.*` | 0 | 0 | 1 | 0 | 1 |
| `plugin-api.v2-hooks.*` | 1 | 0 | 0 | 0 | 1 |
| `plugin-api.tui.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v2.inbox.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v2.system-context-algebra.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v2.system-context-registry.*` | 1 | 0 | 0 | 0 | 1 |
| `session-v2.history-selection.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v2.projector.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v2.llm-event-publisher.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v2.message-lowering.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v2.model-resolution.*` | 1 | 0 | 0 | 0 | 1 |
| `session-v2.compaction.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v2.location-wiring.*` | 1 | 0 | 0 | 0 | 1 |
| `session-v1.prompt.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v1.processor.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v1.llm-runtime.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v1.compaction-overflow.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v1.instructions.*` | 0 | 0 | 1 | 0 | 1 |
| `session-v1.store.*` | 0 | 0 | 1 | 0 | 1 |
| `execution.permissions-v1.*` | 0 | 0 | 1 | 0 | 1 |
| `execution.permissions-v2.*` | 1 | 0 | 0 | 0 | 1 |
| `execution.shell-v1.*` | 0 | 0 | 1 | 0 | 1 |
| `execution.shell-v2.*` | 0 | 0 | 1 | 0 | 1 |
| `execution.patch-v1.*` | 0 | 0 | 1 | 0 | 1 |
| `execution.patch-v2.*` | 0 | 0 | 1 | 0 | 1 |
| `execution.snapshots.*` | 0 | 0 | 1 | 0 | 1 |
| `execution.git.*` | 0 | 0 | 1 | 0 | 1 |
| `execution.worktree.*` | 0 | 0 | 1 | 0 | 1 |
| `execution.background.*` | 0 | 0 | 1 | 0 | 1 |
| `execution.pty.*` | 1 | 0 | 0 | 0 | 1 |
| `persistence.config-loading.*` | 0 | 0 | 1 | 0 | 1 |
| `persistence.storage-v1.*` | 0 | 0 | 1 | 0 | 1 |
| `persistence.database.*` | 0 | 0 | 1 | 0 | 1 |
| `persistence.project-instance-location.*` | 1 | 0 | 0 | 0 | 1 |
| `persistence.eventing.*` | 0 | 0 | 1 | 0 | 1 |
| `persistence.installation.*` | 0 | 0 | 1 | 0 | 1 |
| `persistence.filesystem-search.*` | 0 | 0 | 1 | 0 | 1 |
| `tui.architecture.*` | 0 | 0 | 1 | 0 | 1 |
| `tui.routing.*` | 0 | 0 | 1 | 0 | 1 |
| `tui.sync-store.*` | 0 | 0 | 1 | 0 | 1 |
| `tui.session-screen.*` | 0 | 0 | 1 | 0 | 1 |
| `tui.keybindings.*` | 0 | 0 | 1 | 0 | 1 |
| `tui.feature-plugins.*` | 0 | 0 | 1 | 0 | 1 |
| `tui.prompt.*` | 0 | 0 | 1 | 0 | 1 |
| `tui.runtime-hosting.*` | 0 | 0 | 1 | 0 | 1 |
| `clients.desktop.*` | 0 | 0 | 1 | 0 | 1 |
| `clients.app.*` | 0 | 0 | 1 | 0 | 1 |
| `clients.web.*` | 0 | 0 | 1 | 0 | 1 |
| `clients.console.*` | 0 | 0 | 1 | 0 | 1 |
| `clients.ui.*` | 0 | 0 | 1 | 0 | 1 |
| `clients.storybook.*` | 0 | 0 | 1 | 0 | 1 |
| `infra.build-monorepo.*` | 0 | 0 | 1 | 0 | 1 |
| `infra.native-binary-release.*` | 0 | 0 | 1 | 0 | 1 |
| `infra.sst.*` | 0 | 0 | 1 | 0 | 1 |
| `infra.ci-workflows.*` | 0 | 0 | 1 | 0 | 1 |
| `infra.nix.*` | 0 | 0 | 1 | 0 | 1 |
| `peripheral.slack.*` | 0 | 0 | 1 | 0 | 1 |
| `peripheral.function.*` | 0 | 0 | 1 | 0 | 1 |
| `peripheral.enterprise.*` | 0 | 0 | 1 | 0 | 1 |
| `peripheral.stats.*` | 0 | 0 | 1 | 0 | 1 |
| `peripheral.containers.*` | 0 | 0 | 1 | 0 | 1 |
| `peripheral.http-recorder.*` | 0 | 0 | 1 | 0 | 1 |
| `peripheral.effect-sqlite.*` | 0 | 0 | 1 | 0 | 1 |
| `peripheral.script-identity.*` | 0 | 0 | 1 | 0 | 1 |
| `provider.snowflake-cortex.*` | 1 | 0 | 0 | 0 | 1 |
| `execution.core-shell-v2.*` | 0 | 0 | 1 | 0 | 1 |
| `persistence.project-directories.*` | 1 | 0 | 0 | 0 | 1 |

> D-CLEAN 的 24 个节点单独一批走"快速复核":只确认 path/行号仍成立,bump `updated=8b68dc0d7`,省 L2(除非复核发现行号漂了)。

---

## 4. 每节点收尾 & 完成定义

- 单节点循环照 **RUN.md §3**(L1 读源 → L2 独立证伪 → L3 修复),把 `[E:path:line]` 行号重新落准是本次核心。
- 完成即置 `status: verified` + `updated: 8b68dc0d7`(权威取 `git -C ../../../opencode/ rev-parse --short HEAD`)。
- **整体收尾**:`node tools/reconcile.mjs` 同步 frontmatter → `index.json`,并把 `index.json` 顶层 `updated` 改成 `8b68dc0d7`;`node tools/lint.mjs` 全绿;有增删节点则同步 `llms.txt`。
- **git 隔离坑**:只往 `docs/llm-wiki/opencode/` 写,别碰 `Best/opencode/` 源仓。

---

## 附录 A — 逐节点影响分级(自动生成 @ 355a0bcf5..8b68dc0d7)

分级:**A-BROKEN**=source 引用了已删/移文件(必改 source 列)· **B-HEAVY**=无删除但 churn≥2000 行 · **C-DRIFT**=轻中度行漂移 · **D-CLEAN**=源全未变(仅复核)。
计数:A-BROKEN=22 · B-HEAVY=0 · C-DRIFT=137 · D-CLEAN=24(共 183)

| node id | tier | del/chg/total-src | ~churn 行 | 已删·移的 source(需重定位) |
|---|---|---|---|---|
| `spine.overview` | T0 | 1/17/21 | 1924 | `packages/core/src/public/opencode.ts` (DELETED) |
| `spine.v1-v2-relationship` | T0 | 1/11/13 | 1433 | `packages/core/src/public/opencode.ts` (DELETED) |
| `model-layer.model-catalog-v2` | T2 | 1/10/13 | 1238 | `packages/core/src/plugin/boot.ts` (DELETED) |
| `session-v2.model-resolution` | T2 | 1/9/11 | 1056 | `packages/core/src/model-request.ts` (DELETED) |
| `model-layer.credential-v2` | T2 | 1/6/7 | 816 | `packages/core/src/integration/schema.ts` (DELETED) |
| `spine.v2-overview` | T0 | 1/7/8 | 798 | `packages/core/src/public/opencode.ts` (DELETED) |
| `session-v2.location-wiring` | T2 | 2/7/9 | 708 | `packages/core/src/location-layer.ts` (DELETED) ; `packages/core/src/public/opencode.ts` (DELETED) |
| `integrations.integration-v2` | T2 | 3/5/9 | 683 | `packages/core/src/integration/schema.ts` (DELETED) ; `packages/server/src/groups/integration.ts` → `packages/protocol/src/groups/integration.ts` ; `packages/server/src/groups/credential.ts` → `packages/protocol/src/groups/credential.ts` |
| `plugin-api.v2-hooks` | T1 | 1/3/4 | 571 | `packages/core/src/plugin/boot.ts` (DELETED) |
| `integrations.question` | T2 | 1/8/12 | 507 | `packages/server/src/groups/question.ts` (DELETED) |
| `provider.auth-accounts` | T1 | 1/7/9 | 478 | `packages/core/src/integration/schema.ts` (DELETED) |
| `integrations.commands` | T2 | 1/6/9 | 477 | `packages/server/src/groups/command.ts` → `packages/protocol/src/groups/command.ts` |
| `ref.id-prefixes` | T3 | 1/4/6 | 463 | `packages/core/src/session/message-id.ts` (DELETED) |
| `tool.skill` | T1 | 1/7/9 | 364 | `packages/core/src/plugin/boot.ts` (DELETED) |
| `session-v2.system-context-registry` | T2 | 1/5/6 | 336 | `packages/core/src/location-layer.ts` (DELETED) |
| `execution.permissions-v2` | T2 | 1/7/9 | 315 | `packages/core/src/permission/schema.ts` (DELETED) |
| `provider.snowflake-cortex` | T1 | 1/6/7 | 276 | `packages/core/src/plugin/boot.ts` (DELETED) |
| `ref.data-model` | T3 | 1/3/4 | 259 | `packages/core/src/session/message-id.ts` (DELETED) |
| `ref.permission-actions` | T3 | 1/5/7 | 183 | `packages/core/src/permission/schema.ts` (DELETED) |
| `persistence.project-directories` | T2 | 2/5/8 | 113 | `packages/core/src/location-layer.ts` (DELETED) ; `packages/server/src/groups/project-copy.ts` → `packages/protocol/src/groups/project-copy.ts` |
| `persistence.project-instance-location` | T2 | 1/3/4 | 79 | `packages/core/src/location-layer.ts` (DELETED) |
| `execution.pty` | T2 | 1/4/11 | 73 | `packages/server/src/groups/pty.ts` → `packages/protocol/src/groups/pty.ts` |
| `spine.trace-compaction-overflow` | T0 | 0/6/7 | 1705 |  |
| `session-v1.processor` | T2 | 0/8/10 | 1487 |  |
| `plugin-api.v1-hooks` | T1 | 0/11/14 | 1480 |  |
| `spine.trace-first-prompt` | T0 | 0/10/10 | 1399 |  |
| `spine.trace-tool-call` | T0 | 0/6/6 | 1399 |  |
| `spine.v2-admission` | T0 | 0/7/7 | 1323 |  |
| `session-v2.history-selection` | T2 | 0/12/13 | 1271 |  |
| `session-v2.projector` | T2 | 0/7/7 | 1214 |  |
| `session-v2.compaction` | T2 | 0/8/9 | 1197 |  |
| `spine.v2-event-sourcing` | T0 | 0/3/4 | 1128 |  |
| `session-v1.store` | T2 | 0/8/9 | 1063 |  |
| `integrations.mcp-client` | T2 | 0/7/10 | 1043 |  |
| `ref.events` | T3 | 0/4/6 | 1009 |  |
| `session-v1.compaction-overflow` | T2 | 0/6/7 | 939 |  |
| `spine.trace-steer-mid-turn` | T0 | 0/4/4 | 832 |  |
| `spine.v1-turn-loop` | T0 | 0/5/5 | 815 |  |
| `integrations.image` | T2 | 0/5/9 | 815 |  |
| `spine.v2-context-epoch` | T0 | 0/6/6 | 803 |  |
| `session-v2.inbox` | T2 | 0/6/6 | 771 |  |
| `spine.v2-provider-turn` | T0 | 0/6/6 | 763 |  |
| `session-v1.prompt` | T2 | 0/5/5 | 733 |  |
| `session-v2.llm-event-publisher` | T2 | 0/4/4 | 663 |  |
| `session-v2.system-context-algebra` | T2 | 0/7/7 | 660 |  |
| `persistence.eventing` | T2 | 0/5/8 | 625 |  |
| `clients.app` | T2 | 0/7/10 | 612 |  |
| `session-v2.message-lowering` | T2 | 0/6/6 | 604 |  |
| `tool.webfetch` | T1 | 0/6/8 | 587 |  |
| `server.control-plane` | T2 | 0/4/5 | 568 |  |
| `ref.glossary` | T3 | 0/4/4 | 538 |  |
| `spine.cli-to-session` | T0 | 0/3/3 | 488 |  |
| `session-v1.instructions` | T2 | 0/5/8 | 478 |  |
| `model-layer.auth` | T2 | 0/7/7 | 478 |  |
| `persistence.database` | T2 | 0/2/5 | 470 |  |
| `subsys.tools.v1` | T2 | 0/2/3 | 456 |  |
| `tool.task` | T1 | 0/6/10 | 447 |  |
| `sdk.surface` | T1 | 0/1/2 | 443 |  |
| `tui.session-screen` | T2 | 0/2/2 | 419 |  |
| `integrations.skills` | T2 | 0/10/11 | 383 |  |
| `spine.v2-coordinator` | T0 | 0/4/4 | 357 |  |
| `tool.plan-exit` | T1 | 0/4/7 | 353 |  |
| `tool.question` | T1 | 0/7/10 | 329 |  |
| `tui.sync-store` | T2 | 0/2/3 | 311 |  |
| `server.plugin-system` | T2 | 0/2/3 | 309 |  |
| `integrations.acp` | T2 | 0/7/10 | 286 |  |
| `execution.shell-v2` | T2 | 0/5/6 | 264 |  |
| `ref.llm-event-catalog` | T3 | 0/2/2 | 252 |  |
| `tool.todowrite` | T1 | 0/8/10 | 246 |  |
| `tool.read` | T1 | 0/2/3 | 240 |  |
| `tool.invalid` | T1 | 0/5/7 | 205 |  |
| `server-api.overview` | T1 | 0/6/7 | 204 |  |
| `provider.resolution` | T1 | 0/3/3 | 193 |  |
| `ref.env-vars` | T3 | 0/4/8 | 180 |  |
| `cli.run` | T1 | 0/1/2 | 165 |  |
| `peripheral.http-recorder` | T2 | 0/2/4 | 165 |  |
| `ref.copilot-tool-catalog` | T3 | 0/3/5 | 164 |  |
| `execution.patch-v2` | T2 | 0/4/5 | 144 |  |
| `execution.core-shell-v2` | T2 | 0/3/4 | 141 |  |
| `tool.websearch` | T1 | 0/4/7 | 140 |  |
| `provider.catalog` | T1 | 0/2/3 | 135 |  |
| `clients.desktop` | T2 | 0/4/7 | 119 |  |
| `tool.lsp` | T1 | 0/3/7 | 116 |  |
| `model-layer.provider-registry-v1` | T2 | 0/1/1 | 114 |  |
| `ref.ai-sdk-provider-map` | T3 | 0/1/1 | 114 |  |
| `tool.bash` | T1 | 0/3/3 | 113 |  |
| `spine.boot` | T0 | 0/2/4 | 112 |  |
| `execution.shell-v1` | T2 | 0/3/6 | 112 |  |
| `tui.runtime-hosting` | T2 | 0/4/4 | 111 |  |
| `tui.architecture` | T2 | 0/2/4 | 105 |  |
| `tui.routing` | T2 | 0/1/2 | 103 |  |
| `integrations.lsp` | T2 | 0/3/6 | 98 |  |
| `execution.permissions-v1` | T2 | 0/2/4 | 91 |  |
| `ref.lsp-servers` | T3 | 0/2/4 | 91 |  |
| `subsys.tools.v2` | T2 | 0/3/4 | 86 |  |
| `execution.snapshots` | T2 | 0/2/2 | 81 |  |
| `server.http-server` | T2 | 0/3/3 | 77 |  |
| `execution.patch-v1` | T2 | 0/1/4 | 76 |  |
| `ref.tool-schema-conversion` | T3 | 0/1/2 | 76 |  |
| `tool.apply-patch` | T1 | 0/1/2 | 66 |  |
| `ref.patch-format` | T3 | 0/1/4 | 66 |  |
| `sdk.overview` | T1 | 0/2/8 | 60 |  |
| `session-v1.llm-runtime` | T2 | 0/3/7 | 59 |  |
| `model-layer.provider-transforms` | T2 | 0/1/1 | 58 |  |
| `ref.reasoning-variant-tables` | T3 | 0/1/1 | 58 |  |
| `clients.ui` | T2 | 0/4/8 | 55 |  |
| `prompt.system-prompts` | T1 | 0/2/4 | 54 |  |
| `persistence.config-loading` | T2 | 0/3/4 | 53 |  |
| `ref.tool-interface` | T3 | 0/2/5 | 52 |  |
| `agent.config` | T1 | 0/2/3 | 50 |  |
| `execution.worktree` | T2 | 0/1/1 | 49 |  |
| `agent.builtins` | T1 | 0/1/2 | 46 |  |
| `execution.background` | T2 | 0/3/4 | 45 |  |
| `server.sharing` | T2 | 0/2/3 | 43 |  |
| `persistence.installation` | T2 | 0/2/3 | 42 |  |
| `tool.edit` | T1 | 0/1/2 | 38 |  |
| `peripheral.enterprise` | T2 | 0/5/6 | 38 |  |
| `tool.grep` | T1 | 0/1/2 | 37 |  |
| `infra.build-monorepo` | T2 | 0/4/5 | 36 |  |
| `config.migration` | T1 | 0/2/2 | 35 |  |
| `subsys.tools.output-bounding` | T2 | 0/2/3 | 28 |  |
| `cli.lildax-framework` | T1 | 0/4/7 | 24 |  |
| `tool.glob` | T1 | 0/1/2 | 21 |  |
| `infra.sst` | T2 | 0/5/10 | 20 |  |
| `ref.tool-prompts` | T3 | 0/1/2 | 20 |  |
| `ref.config-keys` | T3 | 0/1/3 | 20 |  |
| `clients.storybook` | T2 | 0/4/5 | 19 |  |
| `ref.tool-wire-protocol` | T3 | 0/1/2 | 19 |  |
| `persistence.filesystem-search` | T2 | 0/1/2 | 18 |  |
| `ref.db-schema` | T3 | 0/3/10 | 16 |  |
| `config.v2-schema` | T1 | 0/1/2 | 15 |  |
| `infra.nix` | T2 | 0/2/9 | 15 |  |
| `integrations.formatters` | T2 | 0/1/6 | 14 |  |
| `ref.formatters` | T3 | 0/1/2 | 14 |  |
| `infra.ci-workflows` | T2 | 0/3/10 | 13 |  |
| `peripheral.effect-sqlite` | T2 | 0/1/5 | 12 |  |
| `integrations.ide` | T2 | 0/1/1 | 11 |  |
| `peripheral.containers` | T2 | 0/1/3 | 11 |  |
| `peripheral.script-identity` | T2 | 0/1/4 | 11 |  |
| `ref.package-index` | T3 | 0/1/2 | 11 |  |
| `tool.write` | T1 | 0/1/2 | 10 |  |
| `tool.external-directory` | T1 | 0/1/2 | 9 |  |
| `clients.console` | T2 | 0/4/11 | 9 |  |
| `config.tui` | T1 | 0/1/3 | 8 |  |
| `ref.auth-combinators` | T3 | 0/1/2 | 8 |  |
| `infra.native-binary-release` | T2 | 0/2/5 | 7 |  |
| `execution.git` | T2 | 0/1/1 | 6 |  |
| `persistence.storage-v1` | T2 | 0/1/2 | 6 |  |
| `peripheral.stats` | T2 | 0/1/4 | 6 |  |
| `tui.keybindings` | T2 | 0/1/2 | 4 |  |
| `tui.prompt` | T2 | 0/1/1 | 4 |  |
| `ref.keybinds` | T3 | 0/1/1 | 4 |  |
| `plugin-api.tui` | T1 | 0/2/2 | 3 |  |
| `ref.tui-api` | T3 | 0/2/5 | 3 |  |
| `clients.web` | T2 | 0/1/4 | 2 |  |
| `peripheral.slack` | T2 | 0/1/5 | 2 |  |
| `peripheral.function` | T2 | 0/1/3 | 2 |  |
| `ref.lsp-language-map` | T3 | 0/1/2 | 2 |  |
| `tui.feature-plugins` | T2 | 0/1/3 | 1 |  |
| `cli.opencode-yargs` | T1 | 0/0/2 |  |  |
| `config.v1-core` | T1 | 0/0/3 |  |  |
| `config.v1-providers-mcp-lsp` | T1 | 0/0/5 |  |  |
| `config.v1-misc` | T1 | 0/0/6 |  |  |
| `server-api.v1-routes` | T1 | 0/0/2 |  |  |
| `server-api.v2-routes` | T1 | 0/0/2 |  |  |
| `model-layer.llm-protocol-engine` | T2 | 0/0/1 |  |  |
| `model-layer.llm-schema` | T2 | 0/0/1 |  |  |
| `model-layer.llm-protocols` | T2 | 0/0/1 |  |  |
| `model-layer.llm-tools` | T2 | 0/0/2 |  |  |
| `model-layer.copilot` | T2 | 0/0/2 |  |  |
| `tui.home-screen` | T2 | 0/0/1 |  |  |
| `tui.theming` | T2 | 0/0/2 |  |  |
| `tui.dialog-kit` | T2 | 0/0/2 |  |  |
| `tui.run-scrollback` | T2 | 0/0/1 |  |  |
| `server.embedded-public-api` | T2 | 0/0/1 |  |  |
| `server.observability` | T2 | 0/0/2 |  |  |
| `ref.tool-catalog` | T3 | 0/0/2 |  |  |
| `ref.llm-protocol-catalog` | T3 | 0/0/2 |  |  |
| `ref.llm-provider-facade-catalog` | T3 | 0/0/1 |  |  |
| `ref.bash-arity` | T3 | 0/0/1 |  |  |
| `ref.themes` | T3 | 0/0/2 |  |  |
| `ref.tui-slots` | T3 | 0/0/1 |  |  |
| `ref.tui-dialogs` | T3 | 0/0/2 |  |  |
