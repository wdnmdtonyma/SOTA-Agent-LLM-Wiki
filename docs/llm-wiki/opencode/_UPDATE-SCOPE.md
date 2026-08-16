# UPDATE SCOPE — opencode wiki 增量更新（89130db6b0 → 3fd77ae980）

> 更新日期：2026-08-16
>
> **base（上一轮 verified HEAD / 父仓旧 gitlink）**：`89130db6b0060a345548d870c51132ee71d6a828`
>
> **target（官方 `anomalyco/opencode` `origin/dev`）**：`3fd77ae980c9e68eccd10f1c396f32c6e3965046`
>
> **跨度**：142 commits · 571 files changed · 74,469 insertions · 6,029 deletions
>
> 插入量的主体是 App/UI/Desktop i18n 翻译文件；非 i18n 语义 churn 约 162 files / +2,716 / -1,823。

目标 checkout 已用 `git -C opencode rev-parse HEAD`、`git -C opencode rev-parse refs/remotes/origin/dev` 和 ancestry check 交叉确认。`opencode` 只更新根仓 gitlink；本轮没有修改上游源码。

## 1. 影响重算

重算以更新前 `index.json` 的 188 个 verified nodes 为集合，将每个 frontmatter `source[]` 与真实 numstat 交叉；directory source 按 path prefix 展开，同一 changed file 在单节点内只计一次。

```sh
git -C opencode diff --numstat \
  89130db6b0060a345548d870c51132ee71d6a828..3fd77ae980c9e68eccd10f1c396f32c6e3965046
```

| 分类 | 数量 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | 已登记 source 没有删除或移动到无法解析；两个删除文件（`marked-code-span.ts`、`markdown-preload.test.ts`）不是节点 source |
| B-HEAVY | 1 | `ref.package-index` 的 `packages/` umbrella 命中全仓 churn；36 个 workspace package 集合未变化（slack glob 双计不新增包） |
| C-DRIFT | 91 | source churn 小于 2,000 行；证据行已按 target checkout 重落 |
| D-CLEAN | 96 | source 未命中；快速复核后统一 bump `updated` |
| 新节点 | 0 | 新能力可由现有 provider / session / ACP / clients / console / stats 节点自包含承载 |
| 退役节点 | 0 | 没有节点因 source 删除或职责消失而退役 |
| 完成后 verified nodes | 188 | 节点总数保持不变 |

## 2. 真实 diff 的影响判定

| 代码变化 | Wiki 承载 | 判定 |
|---|---|---|
| DeepSeek V4 Flash `topP=0.95` 收窄到 dated ID 或 `deepseek`/`opencode*` provider | `model-layer.provider-transforms`、`provider.resolution` | 既有 transform 职责；不用“凡是 flash 都注入” |
| Azure Completions 5.5+ 用 `gpt-(\d+)\.(\d+)` 跳过 `reasoningEffort` | `model-layer.provider-transforms`、`provider.resolution` | 既有 Azure early-return；要求 `@ai-sdk/azure` + `useCompletionUrls` |
| Merge Gateway catalog effort → `{ reasoningEffort }`，`sdkKey()`=`mergeGateway` | `model-layer.provider-transforms`、`ref.reasoning-variant-tables` | heuristic `variants()` 没有独立 Merge 分支 |
| Copilot `input.pdf` 需 vision **且** `application/pdf` | `model-layer.copilot` | 图像判定更宽（vision 或任一 `image/`） |
| 全部 API ID 含 `muse` 走 `meta.txt`；Kimi 看 provider ID | `prompt.system-prompts` | 覆盖 Spark/Glimmer；provider `kimi-for-coding`/`moonshotai`/`moonshotai-cn` |
| `webSearchEnabled` 增加 `opencode-go` | `tool.websearch` | V1 registry 门控；V2 builtin 仍无此 gate |
| xAI OAuth 只剩 device-code + API key | `plugin-api.v1-hooks` | 删除 loopback/authorization-code |
| V1 compaction 把 head `serialize()` 成孤儿 transcript，再走 V2 `buildPrompt`/`SUMMARY_TEMPLATE` | `session-v1.compaction-overflow`、`spine.trace-compaction-overflow` | 单条 user prompt；`toModelMessagesEffect` 只估 tail |
| 取消 `DEFAULT_TAIL_TURNS=2`；`MAX_PRESERVE_RECENT_TOKENS=15_000` | `session-v1.compaction-overflow`、`config` 描述 | unset `tail_turns` 由 token budget 限制 |
| `RETRY_MAX_RETRIES=5` + 0.25 jitter + 消息/body regex | `session-v1.processor` | 不再无限 backoff |
| `MessageV2.latest` 按 `time.created` 再 `id` | `ref.data-model`、V1 loop | `filterCompacted` 会重排数组 |
| 循环退出 `lastAssistant.parentID === lastUser.id` | `session-v1.prompt`、`spine.v1-turn-loop` | 不是“user id 更早” |
| truncate cleanup 用 `fs.stat` mtime | `subsys.tools.output-bounding` | 不再解析文件名时间 |
| `SessionContextEpoch.reset` 无 production caller | `session-v2.projector`、`spine.v2-context-epoch` | 登记 `[U]` |
| ACP `runUntilIdle` 再 `end_turn`；`cache.write` 计入 usage | `integrations.acp` | `resumeSession` 不再 replay |
| workspace proxy 删除 host `directory`；5xx 打 2000 字符 body | `server.control-plane` | remote 回退自己的 project root |
| config decode `onExcessProperty: "ignore"` | `persistence.config-loading` | 未知字段丢弃而不是失败 |
| Console `GET /zen/go/v1/usage`；referral summary 真查表 | `clients.console` | 不外推 production migration |
| Stats 改 R2 SQL catalog；10k row cap 当错误；zero-usage 国家隐藏 | `peripheral.stats` | Athena 仅 rollback |
| App JSON export、locale/RTL/plural、消息按创建时间排序 | `clients.app`、`clients.app-compatibility`、`clients.ui` | 不新建 i18n 节点 |
| Desktop macOS `window-all-closed` 不退出；sidecar 嵌版本；packaged 关 console log | `clients.desktop` | V2 sidecar 仍 env opt-in |
| TUI `cursor.style`/`blinking`；clipboard OSC 52 + tmux DCS | `config.tui`、`tui.session-screen` | 不宣称自己执行 `set-clipboard on` |
| Grep preview 截断剥 trailing UTF-16 high surrogate | `tool.grep` | 2000 字符预览 |

## 3. 显式快速核验：本轮未变化的专属重点

- `SessionV2` / `SessionRunner` / SessionV2 repository 没有成为默认执行路径；App/UI “V2” 仍是 UI generation / current protocol。
- Effect HttpApi 的 current/V1 route group 核心没有结构性变化；两个 server 仍是 Effect HttpApi，不是 Hono。
- V1/V2 tool registries 没有新增、删除或改名的模型可见 tool 节点；Go websearch 是既有 `websearch` 门控扩展。
- workspace package 集合仍是 36 个；根 `bun@1.3.14`；发布版本同步到 `1.18.18`。
- `models.opencode.ai` / zen catalog 仍是外部 JSON，本轮不把 commit 消息里的模型名写成硬编码 live 名单。

## 4. 节点改动

### 语义更新

- `model-layer.provider-transforms`
- `model-layer.copilot`
- `provider.resolution`
- `provider.catalog`
- `prompt.system-prompts`
- `agent.builtins`
- `ref.reasoning-variant-tables`
- `plugin-api.v1-hooks`
- `tool.websearch`
- `tool.grep`
- `session-v1.compaction-overflow`
- `spine.trace-compaction-overflow`
- `session-v2.compaction`
- `session-v2.history-selection`
- `session-v1.processor`
- `session-v1.prompt`
- `session-v1.store`
- `session-v1.instructions`
- `spine.v1-turn-loop`
- `spine.v1-v2-relationship`
- `subsys.tools.output-bounding`
- `session-v2.projector`
- `spine.v2-context-epoch`
- `ref.data-model`
- `integrations.acp`
- `server.control-plane`
- `persistence.config-loading`
- `clients.console`
- `peripheral.stats`
- `infra.sst`
- `clients.app`
- `clients.app-compatibility`
- `clients.ui`
- `clients.desktop`
- `clients.web`
- `config.tui`
- `tui.session-screen`
- `tui.sync-store`
- `tui.prompt`
- `tui.architecture`
- `persistence.filesystem-search`
- `ref.package-index`
- `subsys.tools.codemode`

### 证据或 target 元数据更新

- 其余 C-DRIFT/B-HEAVY 节点重落受影响 `[E:path:line]`。
- 96 个 D-CLEAN 节点完成 source/path 快速复核。
- 全部 188 个 node frontmatter `updated` 统一为 `3fd77ae980`。
- `README.md`、`index.json`、`llms.txt` 与 gitlink target 一致；没有新增/退役节点。

## 5. L2 独立证伪

三组独立 clean subagent 对本轮语义节点做源码反证，最终全部 PASS：

1. **Provider/Muse/Kimi/Copilot/xAI/websearch — PASS**：DeepSeek whitelist、Azure 5.5+ Completions skip、Merge Gateway effort、Copilot PDF vs image、Muse→`meta.txt`、Kimi provider IDs、`opencode-go` websearch、xAI device-only OAuth 全部与源码一致。顺手把 `store=false` / system-transform hook 的行号钉到断言行。
2. **Session compaction/retry/ordering — PASS**：V1 serialize→V2 `buildPrompt`、tail/token budget、`RETRY_MAX_RETRIES=5`+jitter+regex、`MessageV2.latest` 时序、loop `parentID` 退出、mtime truncate、`reset` 无 caller、revert cleanup 均成立。残余措辞：V2 `compactAfterOverflow` 在 `!selected` 时直接 false；V1 prune “最近两个 user turns” 是近似说法。
3. **ACP/Console/Stats/App/Desktop/TUI/Grep — PASS**：`runUntilIdle`、cache.write、workspace directory strip、5xx log、`onExcessProperty`、Go usage 形状、referral 真查询、R2 10k cap、zero-usage geo、JSON export、RTL 集合、macOS 不退出、`cursor.style`、grep surrogate strip 均成立。没有生产部署或 SessionV2-default 过宽结论。

## 6. 未决与风险边界

- `SessionContextEpoch.reset` 仍导出，但 production 无 caller；move/revert 是否应复用旧 baseline 未从源码判定（`_staging/uncertainty-batch-session.md`）。
- Google `outputTokens` 已含 thoughts，trial limiter / Stats `buildTokenCost` 仍再加 `reasoningTokens`；`providerUsage.test.ts` 仍期待旧 output=3（`_staging/uncertainty-batch-hosted.md`）。
- App timeline current-source 顺序是否总等于 durable aggregate、SSE 无 `Last-Event-ID`、current PTY ticketless handshake 仍 `[U]`（`_staging/uncertainty-batch-clients.md`）。
- zen/go live 模型表来自外部 `models.opencode.ai`，本轮不把 GLM 5.3 / Grok 4.6 等 commit 文案写成硬编码 catalog。
- Console schema 与仓内 migration SQL 不同步处只记代码意图，不外推 production 已 apply。
- Stats R2 SQL 与 Athena rollback 是仓内 infra；没有远端查询权限。
- Desktop V2 sidecar 仍是 env opt-in。

## 7. 实际验证与环境边界

- 本轮是源码证据与 Wiki 验证，没有跑 `bun install` 或定向测试；内部 registry / 缺包环境与上一轮相同。
- 所有结论以 target checkout 静态源码与已有测试文件为准。
- 上游源码与 lockfile 均未修改。

## 8. 完成门槛

- 所有 188 个 verified node frontmatter `updated` 精确为 `3fd77ae980`；`index.json.updated` 与每个 node entry 同步。
- `index.json` planned=0，节点数保持 188；`llms.txt` 仍登记全部节点。
- `node tools/reconcile.mjs` 第二次 0 更新；`node tools/lint.mjs` 0 error / 0 warning。
- submodule HEAD 与 `refs/remotes/origin/dev` 都是 target。
- 本会话只改 `docs/llm-wiki/opencode/**` 与根仓 `opencode` gitlink。
