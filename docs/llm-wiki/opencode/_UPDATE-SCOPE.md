# UPDATE SCOPE — opencode wiki 增量更新令(8b68dc0d7 → 67caf894e)

> 本文件由分析会话生成(2026-07-19),给执行更新的 codex 会话读。
> **基线(wiki 当前 verified 的 opencode HEAD)**:`8b68dc0d7fa24d820990461eed13bec2e604c157`
> **目标(已 checkout 的 opencode submodule HEAD,上游 `dev` 分支)**:`67caf894e0843ee370e72839e8265e483233479b`
> **跨度**:377 commit · 744 files changed, 213965 insertions(+), 76213 deletions(-) · 2026-07-01 → 2026-07-19

复现 diff(在 `opencode/` 内):
```
git diff --stat 8b68dc0d7fa24d820990461eed13bec2e604c157..67caf894e0843ee370e72839e8265e483233479b
```

> 执行前先读 **`RUN.md`**(填充令,L1→L2→L3 流程不变)+ **`conventions.md`**(节点模板 / 证据分级)。本文件只回答"这次改了哪些、每个节点要动什么",不重复 RUN.md 的方法论。

## 0. 结论:零结构性失效,本轮三仓中最轻(但要判 codemode 新包)

| 维度 | 数字 |
|---|---|
| 被 wiki 引用的去重源文件 | 546 |
| ├ 已删/移 | **0** |
| ├ 改动(churn) | **73** |
| └ 不变 | 473 |
| 节点(184) | |
| ├ 结构性失效(A-BROKEN) | **0** |
| ├ 重 churn(B-HEAVY≥2000 行) | **0** |
| ├ 轻中 churn(C-DRIFT) | **109** |
| └ 完全不受影响(D-CLEAN,仅复核) | **75** |

**0 A-BROKEN、0 B-HEAVY**——wiki 引用的 source 无一删/移,109 个 C-DRIFT 的 churn 都不大(最重 `clients.app` 也只 367 行)。上游 +213965/-76213 的大数字几乎全落在 wiki 覆盖面外的前端/营销面:`packages/app`(198 改/69 新)、`packages/app/e2e`(+66)、`packages/ui`、`packages/console`、`packages/stats`、`artifacts/glm52-rise-video`(营销视频工程,忽略)。
core 侧(`packages/opencode/src`)只有轻度漂移:session/prompt、provider/transform、mcp(新增 `mcp/browser.ts`)、plugin 等,逐节点重核行号即可。

---

## 1. 结构性失效(A-BROKEN,先修:必改 source 列)

(本轮无 A-BROKEN,直接从 C-DRIFT 开始。)

---

## 2. 新增面扫描(266 新文件 → 判断是否需新节点)

对照现有 `index.json`,重点核这些新增区是否已有节点覆盖,缺则按 `conventions.md` 建新节点并登记 `index.json` + `llms.txt`:
- **`packages/codemode/`(全新包,26 src + 9 test,基线不存在)**:本轮最大的判定点——按 `conventions.md` 评估建新节点(子系统级),并登记 `index.json` + `llms.txt`。
- `packages/opencode/src/mcp/browser.ts`(新):并进 mcp 相关节点还是新节点,核对后定。
- `packages/session-ui/src`(+21)、`packages/desktop/src`(+8):判断 wiki 是否覆盖这些 client 面;若本就不在覆盖面,记一笔跳过即可。
- `artifacts/glm52-rise-video/`:营销产物,明确跳过。

---

## 3. 批次划分(并发会话,按 RUN.md §8)

受影响节点(109 个,不含 75 个 D-CLEAN)按 id 分组如下——可据此切批,一个会话认领一组、只写自己那批的 node `.md`(共享文件 `index.json`/`llms.txt`/`reference/uncertainty.md` 收尾统一 reconcile):

| 分组 | A-BROKEN | B-HEAVY | C-DRIFT | D-CLEAN | 受影响小计 |
|---|---|---|---|---|---|
| `spine.*` | 0 | 0 | 12 | 3 | 12 |
| `tool.*` | 0 | 0 | 12 | 5 | 12 |
| `ref.*` | 0 | 0 | 9 | 23 | 9 |
| `session-v2.*` | 0 | 0 | 8 | 2 | 8 |
| `execution.*` | 0 | 0 | 8 | 4 | 8 |
| `tui.*` | 0 | 0 | 7 | 5 | 7 |
| `session-v1.*` | 0 | 0 | 6 | 0 | 6 |
| `integrations.*` | 0 | 0 | 6 | 4 | 6 |
| `clients.*` | 0 | 0 | 6 | 0 | 6 |
| `peripheral.*` | 0 | 0 | 6 | 2 | 6 |
| `model-layer.*` | 0 | 0 | 5 | 5 | 5 |
| `provider.*` | 0 | 0 | 4 | 0 | 4 |
| `persistence.*` | 0 | 0 | 4 | 4 | 4 |
| `infra.*` | 0 | 0 | 4 | 1 | 4 |
| `config.*` | 0 | 0 | 3 | 3 | 3 |
| `server.*` | 0 | 0 | 3 | 3 | 3 |
| `server-api.*` | 0 | 0 | 2 | 1 | 2 |
| `prompt.*` | 0 | 0 | 1 | 0 | 1 |
| `sdk.*` | 0 | 0 | 1 | 1 | 1 |
| `plugin-api.*` | 0 | 0 | 1 | 2 | 1 |
| `subsys.tools.*` | 0 | 0 | 1 | 2 | 1 |
| `agent.*` | 0 | 0 | 0 | 2 | 0 |
| `cli.*` | 0 | 0 | 0 | 3 | 0 |

> D-CLEAN 的 75 个节点单独一批走"快速复核":只确认 path/行号仍成立,bump `updated=67caf894e`,省 L2(除非复核发现行号漂了)。

---

## 4. 每节点收尾 & 完成定义

- 单节点循环照 **RUN.md §3**(L1 读源 → L2 独立证伪 → L3 修复),把 `[E:path:line]` 行号重新落准是本次核心。
- 完成即置 `status: verified` + `updated: 67caf894e`(权威取 `git -C ../../../opencode/ rev-parse --short HEAD`)。
- **整体收尾**:`node tools/reconcile.mjs` 同步 frontmatter → `index.json`,并把 `index.json` 顶层 `updated` 改成 `67caf894e`;`node tools/lint.mjs` 全绿;有增删节点则同步 `llms.txt`。
- **git 隔离坑**:只往 `docs/llm-wiki/opencode/` 写,别碰 `opencode/` 源仓。

---

## 附录 A — 逐节点影响分级(自动生成 @ 8b68dc0d7..67caf894e)

分级:**A-BROKEN**=source 引用了已删/移文件(必改 source 列)· **B-HEAVY**=无删除但 churn≥2000 行 · **C-DRIFT**=轻中度行漂移 · **D-CLEAN**=源全未变(仅复核)。
计数:A-BROKEN=0 · B-HEAVY=0 · C-DRIFT=109 · D-CLEAN=75(共 184)

| node id | tier | 分级 | del/chg/total-src | ~churn 行 | 已删·移的 source(需重定位) |
|---|---|---|---|---|---|
| `clients.app` | T2 | C-DRIFT | 0/7/10 | 367 |  |
| `model-layer.copilot` | T2 | C-DRIFT | 0/4/5 | 337 |  |
| `provider.resolution` | T1 | C-DRIFT | 0/3/3 | 310 |  |
| `model-layer.provider-transforms` | T2 | C-DRIFT | 0/1/1 | 225 |  |
| `ref.reasoning-variant-tables` | T3 | C-DRIFT | 0/1/1 | 225 |  |
| `plugin-api.v1-hooks` | T1 | C-DRIFT | 0/5/15 | 115 |  |
| `infra.nix` | T2 | C-DRIFT | 0/2/9 | 107 |  |
| `provider.catalog` | T1 | C-DRIFT | 0/2/3 | 85 |  |
| `spine.overview` | T0 | C-DRIFT | 0/9/23 | 70 |  |
| `ref.env-vars` | T3 | C-DRIFT | 0/2/7 | 70 |  |
| `model-layer.provider-registry-v1` | T2 | C-DRIFT | 0/1/6 | 69 |  |
| `model-layer.model-catalog-v2` | T2 | C-DRIFT | 0/1/16 | 69 |  |
| `ref.ai-sdk-provider-map` | T3 | C-DRIFT | 0/1/1 | 69 |  |
| `ref.auth-combinators` | T3 | C-DRIFT | 0/1/3 | 69 |  |
| `ref.copilot-tool-catalog` | T3 | C-DRIFT | 0/1/5 | 69 |  |
| `provider.snowflake-cortex` | T1 | C-DRIFT | 0/1/7 | 69 |  |
| `tui.session-screen` | T2 | C-DRIFT | 0/1/2 | 66 |  |
| `clients.desktop` | T2 | C-DRIFT | 0/5/7 | 58 |  |
| `tool.task` | T1 | C-DRIFT | 0/4/10 | 52 |  |
| `integrations.mcp-client` | T2 | C-DRIFT | 0/3/10 | 50 |  |
| `spine.trace-compaction-overflow` | T0 | C-DRIFT | 0/4/9 | 49 |  |
| `infra.sst` | T2 | C-DRIFT | 0/4/10 | 48 |  |
| `integrations.question` | T2 | C-DRIFT | 0/2/14 | 47 |  |
| `session-v2.history-selection` | T2 | C-DRIFT | 0/2/13 | 46 |  |
| `session-v2.compaction` | T2 | C-DRIFT | 0/2/9 | 46 |  |
| `tool.webfetch` | T1 | C-DRIFT | 0/2/10 | 43 |  |
| `subsys.tools.v1` | T2 | C-DRIFT | 0/2/3 | 43 |  |
| `clients.ui` | T2 | C-DRIFT | 0/4/8 | 43 |  |
| `session-v2.system-context-registry` | T2 | C-DRIFT | 0/3/7 | 41 |  |
| `session-v2.system-context-algebra` | T2 | C-DRIFT | 0/2/7 | 37 |  |
| `infra.native-binary-release` | T2 | C-DRIFT | 0/2/5 | 36 |  |
| `tool.websearch` | T1 | C-DRIFT | 0/2/7 | 35 |  |
| `tool.question` | T1 | C-DRIFT | 0/2/12 | 35 |  |
| `tool.lsp` | T1 | C-DRIFT | 0/2/7 | 35 |  |
| `tool.plan-exit` | T1 | C-DRIFT | 0/2/7 | 35 |  |
| `tool.grep` | T1 | C-DRIFT | 0/1/10 | 34 |  |
| `tool.todowrite` | T1 | C-DRIFT | 0/1/11 | 34 |  |
| `tool.skill` | T1 | C-DRIFT | 0/1/13 | 34 |  |
| `tool.invalid` | T1 | C-DRIFT | 0/1/7 | 34 |  |
| `execution.shell-v1` | T2 | C-DRIFT | 0/1/6 | 34 |  |
| `execution.patch-v1` | T2 | C-DRIFT | 0/1/4 | 34 |  |
| `integrations.lsp` | T2 | C-DRIFT | 0/1/6 | 34 |  |
| `server.plugin-system` | T2 | C-DRIFT | 0/1/17 | 34 |  |
| `infra.build-monorepo` | T2 | C-DRIFT | 0/2/5 | 34 |  |
| `ref.tool-schema-conversion` | T3 | C-DRIFT | 0/1/3 | 34 |  |
| `execution.shell-v2` | T2 | C-DRIFT | 0/2/6 | 33 |  |
| `spine.v1-v2-relationship` | T0 | C-DRIFT | 0/6/16 | 28 |  |
| `peripheral.script-identity` | T2 | C-DRIFT | 0/2/4 | 27 |  |
| `spine.trace-tool-call` | T0 | C-DRIFT | 0/4/6 | 25 |  |
| `ref.permission-actions` | T3 | C-DRIFT | 0/2/10 | 24 |  |
| `tool.read` | T1 | C-DRIFT | 0/2/11 | 22 |  |
| `peripheral.containers` | T2 | C-DRIFT | 0/1/3 | 21 |  |
| `ref.package-index` | T3 | C-DRIFT | 0/1/2 | 21 |  |
| `execution.permissions-v2` | T2 | C-DRIFT | 0/1/11 | 19 |  |
| `tui.architecture` | T2 | C-DRIFT | 0/2/4 | 19 |  |
| `execution.background` | T2 | C-DRIFT | 0/1/4 | 16 |  |
| `tui.prompt` | T2 | C-DRIFT | 0/1/1 | 16 |  |
| `clients.storybook` | T2 | C-DRIFT | 0/3/5 | 15 |  |
| `tool.bash` | T1 | C-DRIFT | 0/1/3 | 14 |  |
| `provider.auth-accounts` | T1 | C-DRIFT | 0/1/11 | 14 |  |
| `model-layer.auth` | T2 | C-DRIFT | 0/1/9 | 14 |  |
| `tui.routing` | T2 | C-DRIFT | 0/1/2 | 14 |  |
| `server.embedded-public-api` | T2 | C-DRIFT | 0/2/7 | 14 |  |
| `execution.core-shell-v2` | T2 | C-DRIFT | 0/1/4 | 14 |  |
| `spine.v2-overview` | T0 | C-DRIFT | 0/1/9 | 13 |  |
| `spine.v2-admission` | T0 | C-DRIFT | 0/1/10 | 13 |  |
| `spine.v2-provider-turn` | T0 | C-DRIFT | 0/1/6 | 13 |  |
| `spine.v2-context-epoch` | T0 | C-DRIFT | 0/1/8 | 13 |  |
| `spine.trace-first-prompt` | T0 | C-DRIFT | 0/1/10 | 13 |  |
| `spine.trace-steer-mid-turn` | T0 | C-DRIFT | 0/1/4 | 13 |  |
| `session-v2.inbox` | T2 | C-DRIFT | 0/1/10 | 13 |  |
| `session-v2.llm-event-publisher` | T2 | C-DRIFT | 0/1/5 | 13 |  |
| `session-v2.message-lowering` | T2 | C-DRIFT | 0/1/6 | 13 |  |
| `integrations.acp` | T2 | C-DRIFT | 0/1/10 | 13 |  |
| `session-v1.processor` | T2 | C-DRIFT | 0/3/9 | 12 |  |
| `session-v1.prompt` | T2 | C-DRIFT | 0/3/5 | 11 |  |
| `persistence.filesystem-search` | T2 | C-DRIFT | 0/3/11 | 8 |  |
| `tui.runtime-hosting` | T2 | C-DRIFT | 0/2/4 | 8 |  |
| `server-api.overview` | T1 | C-DRIFT | 0/1/8 | 7 |  |
| `server-api.v2-routes` | T1 | C-DRIFT | 0/1/7 | 7 |  |
| `server.http-server` | T2 | C-DRIFT | 0/1/9 | 7 |  |
| `session-v2.location-wiring` | T2 | C-DRIFT | 0/2/11 | 6 |  |
| `session-v1.instructions` | T2 | C-DRIFT | 0/4/8 | 6 |  |
| `clients.console` | T2 | C-DRIFT | 0/3/11 | 6 |  |
| `persistence.project-directories` | T2 | C-DRIFT | 0/2/8 | 6 |  |
| `execution.permissions-v1` | T2 | C-DRIFT | 0/1/6 | 5 |  |
| `execution.pty` | T2 | C-DRIFT | 0/2/15 | 5 |  |
| `spine.v1-turn-loop` | T0 | C-DRIFT | 0/3/5 | 4 |  |
| `persistence.project-instance-location` | T2 | C-DRIFT | 0/1/13 | 4 |  |
| `peripheral.stats` | T2 | C-DRIFT | 0/1/4 | 4 |  |
| `config.v1-core` | T1 | C-DRIFT | 0/1/3 | 3 |  |
| `config.v1-providers-mcp-lsp` | T1 | C-DRIFT | 0/1/5 | 3 |  |
| `config.v1-misc` | T1 | C-DRIFT | 0/1/6 | 3 |  |
| `session-v1.compaction-overflow` | T2 | C-DRIFT | 0/2/7 | 3 |  |
| `session-v1.store` | T2 | C-DRIFT | 0/2/9 | 3 |  |
| `integrations.image` | T2 | C-DRIFT | 0/2/9 | 3 |  |
| `tui.dialog-kit` | T2 | C-DRIFT | 0/1/2 | 3 |  |
| `prompt.system-prompts` | T1 | C-DRIFT | 0/1/5 | 2 |  |
| `sdk.overview` | T1 | C-DRIFT | 0/1/8 | 2 |  |
| `tui.keybindings` | T2 | C-DRIFT | 0/1/2 | 2 |  |
| `clients.web` | T2 | C-DRIFT | 0/1/5 | 2 |  |
| `peripheral.slack` | T2 | C-DRIFT | 0/1/5 | 2 |  |
| `peripheral.function` | T2 | C-DRIFT | 0/1/3 | 2 |  |
| `peripheral.enterprise` | T2 | C-DRIFT | 0/1/6 | 2 |  |
| `ref.keybinds` | T3 | C-DRIFT | 0/1/1 | 2 |  |
| `spine.cli-to-session` | T0 | C-DRIFT | 0/1/3 | 1 |  |
| `session-v1.llm-runtime` | T2 | C-DRIFT | 0/1/7 | 1 |  |
| `integrations.commands` | T2 | C-DRIFT | 0/1/9 | 1 |  |
| `persistence.config-loading` | T2 | C-DRIFT | 0/1/4 | 1 |  |
| `spine.boot` | T0 | D-CLEAN | 0/0/5 |  |  |
| `spine.v2-coordinator` | T0 | D-CLEAN | 0/0/4 |  |  |
| `spine.v2-event-sourcing` | T0 | D-CLEAN | 0/0/6 |  |  |
| `tool.edit` | T1 | D-CLEAN | 0/0/2 |  |  |
| `tool.write` | T1 | D-CLEAN | 0/0/2 |  |  |
| `tool.glob` | T1 | D-CLEAN | 0/0/2 |  |  |
| `tool.apply-patch` | T1 | D-CLEAN | 0/0/2 |  |  |
| `tool.external-directory` | T1 | D-CLEAN | 0/0/2 |  |  |
| `agent.builtins` | T1 | D-CLEAN | 0/0/2 |  |  |
| `agent.config` | T1 | D-CLEAN | 0/0/3 |  |  |
| `cli.opencode-yargs` | T1 | D-CLEAN | 0/0/2 |  |  |
| `cli.lildax-framework` | T1 | D-CLEAN | 0/0/7 |  |  |
| `cli.run` | T1 | D-CLEAN | 0/0/2 |  |  |
| `config.v2-schema` | T1 | D-CLEAN | 0/0/2 |  |  |
| `config.migration` | T1 | D-CLEAN | 0/0/2 |  |  |
| `config.tui` | T1 | D-CLEAN | 0/0/3 |  |  |
| `server-api.v1-routes` | T1 | D-CLEAN | 0/0/2 |  |  |
| `sdk.surface` | T1 | D-CLEAN | 0/0/2 |  |  |
| `plugin-api.v2-hooks` | T1 | D-CLEAN | 0/0/12 |  |  |
| `plugin-api.tui` | T1 | D-CLEAN | 0/0/2 |  |  |
| `subsys.tools.v2` | T2 | D-CLEAN | 0/0/6 |  |  |
| `subsys.tools.output-bounding` | T2 | D-CLEAN | 0/0/3 |  |  |
| `session-v2.projector` | T2 | D-CLEAN | 0/0/7 |  |  |
| `session-v2.model-resolution` | T2 | D-CLEAN | 0/0/9 |  |  |
| `model-layer.llm-protocol-engine` | T2 | D-CLEAN | 0/0/1 |  |  |
| `model-layer.llm-schema` | T2 | D-CLEAN | 0/0/1 |  |  |
| `model-layer.llm-protocols` | T2 | D-CLEAN | 0/0/1 |  |  |
| `model-layer.llm-tools` | T2 | D-CLEAN | 0/0/2 |  |  |
| `model-layer.credential-v2` | T2 | D-CLEAN | 0/0/10 |  |  |
| `execution.patch-v2` | T2 | D-CLEAN | 0/0/5 |  |  |
| `execution.snapshots` | T2 | D-CLEAN | 0/0/3 |  |  |
| `execution.git` | T2 | D-CLEAN | 0/0/1 |  |  |
| `execution.worktree` | T2 | D-CLEAN | 0/0/1 |  |  |
| `integrations.ide` | T2 | D-CLEAN | 0/0/1 |  |  |
| `integrations.skills` | T2 | D-CLEAN | 0/0/12 |  |  |
| `integrations.formatters` | T2 | D-CLEAN | 0/0/6 |  |  |
| `persistence.storage-v1` | T2 | D-CLEAN | 0/0/2 |  |  |
| `persistence.database` | T2 | D-CLEAN | 0/0/5 |  |  |
| `persistence.eventing` | T2 | D-CLEAN | 0/0/9 |  |  |
| `persistence.installation` | T2 | D-CLEAN | 0/0/3 |  |  |
| `tui.sync-store` | T2 | D-CLEAN | 0/0/3 |  |  |
| `tui.home-screen` | T2 | D-CLEAN | 0/0/1 |  |  |
| `tui.theming` | T2 | D-CLEAN | 0/0/2 |  |  |
| `tui.feature-plugins` | T2 | D-CLEAN | 0/0/3 |  |  |
| `tui.run-scrollback` | T2 | D-CLEAN | 0/0/1 |  |  |
| `server.sharing` | T2 | D-CLEAN | 0/0/3 |  |  |
| `server.control-plane` | T2 | D-CLEAN | 0/0/10 |  |  |
| `server.observability` | T2 | D-CLEAN | 0/0/2 |  |  |
| `infra.ci-workflows` | T2 | D-CLEAN | 0/0/10 |  |  |
| `peripheral.http-recorder` | T2 | D-CLEAN | 0/0/4 |  |  |
| `peripheral.effect-sqlite` | T2 | D-CLEAN | 0/0/5 |  |  |
| `ref.tool-interface` | T3 | D-CLEAN | 0/0/5 |  |  |
| `ref.tool-wire-protocol` | T3 | D-CLEAN | 0/0/4 |  |  |
| `ref.tool-catalog` | T3 | D-CLEAN | 0/0/2 |  |  |
| `ref.tool-prompts` | T3 | D-CLEAN | 0/0/2 |  |  |
| `ref.llm-protocol-catalog` | T3 | D-CLEAN | 0/0/2 |  |  |
| `ref.llm-provider-facade-catalog` | T3 | D-CLEAN | 0/0/1 |  |  |
| `ref.llm-event-catalog` | T3 | D-CLEAN | 0/0/3 |  |  |
| `ref.bash-arity` | T3 | D-CLEAN | 0/0/1 |  |  |
| `ref.patch-format` | T3 | D-CLEAN | 0/0/4 |  |  |
| `ref.config-keys` | T3 | D-CLEAN | 0/0/3 |  |  |
| `ref.db-schema` | T3 | D-CLEAN | 0/0/10 |  |  |
| `ref.id-prefixes` | T3 | D-CLEAN | 0/0/9 |  |  |
| `ref.lsp-servers` | T3 | D-CLEAN | 0/0/4 |  |  |
| `ref.formatters` | T3 | D-CLEAN | 0/0/2 |  |  |
| `ref.lsp-language-map` | T3 | D-CLEAN | 0/0/2 |  |  |
| `ref.themes` | T3 | D-CLEAN | 0/0/2 |  |  |
| `ref.tui-slots` | T3 | D-CLEAN | 0/0/1 |  |  |
| `ref.tui-dialogs` | T3 | D-CLEAN | 0/0/2 |  |  |
| `ref.tui-api` | T3 | D-CLEAN | 0/0/5 |  |  |
| `ref.events` | T3 | D-CLEAN | 0/0/11 |  |  |
| `ref.glossary` | T3 | D-CLEAN | 0/0/6 |  |  |
| `ref.uncertainty` | T3 | D-CLEAN | 0/0/0 |  |  |
| `ref.data-model` | T3 | D-CLEAN | 0/0/7 |  |  |
| `integrations.integration-v2` | T2 | D-CLEAN | 0/0/13 |  |  |
