# UPDATE SCOPE — opencode wiki 增量更新（9f69463f1d → e207624c48）

> 更新日期：2026-09-07
>
> **base（上一轮 verified HEAD / 父仓旧 gitlink）**：`9f69463f1d556af2b5b51d2efa1c04f5f544f911`
>
> **target（官方 `anomalyco/opencode` `origin/dev`）**：`e207624c48159b03dbe17dbc8e51bbcf23e72df5`
>
> **跨度**：83 commits · 178 files changed · 9,974 insertions · 1,297 deletions
>
> 发布版本：`1.18.25` → **`1.18.29`**。`bun@1.3.14` 与 36 workspace packages 不变。

目标 checkout 已用 `git -C opencode rev-parse HEAD`、`git -C opencode rev-parse refs/remotes/origin/dev` 和 ancestry check 交叉确认。`opencode` 只更新根仓 gitlink；本轮没有修改上游源码。

## 1. 影响重算

重算以更新前 `index.json` 的 189 个 verified nodes 为集合，将每个 frontmatter `source[]` 与真实 numstat 交叉。

```sh
git -C opencode diff --numstat \
  9f69463f1d556af2b5b51d2efa1c04f5f544f911..e207624c48159b03dbe17dbc8e51bbcf23e72df5
```

| 分类 | 数量 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | 无 source 删除 |
| B-HEAVY | 2 | `peripheral.stats`（stats app/core churn）；`ref.package-index`（`packages/` umbrella） |
| C-DRIFT | 67 | source churn < 2,000 行 |
| D-CLEAN | 120 | source 未命中；统一 bump `updated` |
| 新节点 | 0 | Console inference-proxy / quota / trainingConsent 写入既有 `clients.console` |
| 退役节点 | 0 | |
| 完成后 verified nodes | 189 | 不变 |

## 2. 真实 diff 的影响判定

| 代码变化 | Wiki 承载 | 判定 |
|---|---|---|
| `anthropicBlockBinding`：Claude 5.1+ 默认 `prefixMismatchBehavior: drop_block`；Mythos 5.1 除外；`blockBinding: false` 可 opt-out | `model-layer.provider-transforms`、`ref.reasoning-variant-tables` | 不是新 tool |
| GitLab `gitlab-ai-provider` reasoning：gpt→`reasoningEffort`，claude→adaptive thinking | 同上、`provider.catalog` | family 前缀分流 |
| 全局 `headerTimeout`/`chunkTimeout` 默认 300000，均可 `false` | `provider.resolution`、`config.v1-providers-mcp-lsp`、`ref.config-keys`、`ref.env-vars` | schema 与 fetch wrapper 对齐 |
| SSE `reader.cancel().catch(() => {})` | `model-layer.provider-registry-v1` | 取消 rejection 不再冒泡 |
| 删除 Azure `provider.models` / deployment discovery / account select | `model-layer.auth`、`provider.auth-accounts`、`plugin-api.v1-hooks`、`server.plugin-system` | 只留手动 resourceName |
| Codex GPT filter 允许整数版本（`gpt-6`），按 major/minor 比较 | `model-layer.auth` | `gpt-5.6` 仍单独 disallow |
| Copilot `X-Interaction-Id = sessionID` | `model-layer.copilot` | 加在 `chat.headers` |
| processor `inputTransformations` warning | `session-v1.processor` | Anthropic 丢掉 thinking 时可观测 |
| SessionTools 不重置 running `time.start` | `session-v1.processor`、`subsys.tools.v1` | 修 tool-call logging |
| apply_patch 省略空 `movePath` | `tool.apply-patch` | 输出字段变 optional |
| Console `migrated_at` + `ConsoleMigration` + `proxyInference`（handler 前置）+ `/zen/v1/models` 代理 + `Quota.reset` + Muse Spark consent + `cost200K.threshold` + OpenAI usage 归一化 | `clients.console`、`infra.sst` | 不拆新节点 |
| Stats stealth / country 扁平化 / 60s query cache / flash 别名 | `peripheral.stats` | 不外推 production 仓库数据 |
| Desktop OAuth `client_id=opencode-desktop` | `clients.app` | 不是新 auth 协议 |
| TUI `Dynamic` import 源 + unicode ellipsis | `tui.session-screen` | 不是协议变化 |
| 发布 `1.18.29` | `spine.overview`、`ref.package-index` | bun 不变 |
| AI SDK patches（OpenAI service tier、Bedrock none effort） | transforms 测试 / patch 提及 | 不写成 opencode TS 新 API |

## 3. 显式快速核验：本轮未变化的专属重点

- `SessionV2` / `SessionRunner` 仍不是默认执行路径。
- 两个 server 仍是 Effect HttpApi，不是 Hono。
- V1/V2 tool registries 没有新增、删除或改名的模型可见 tool。
- workspace package 集合仍是 36 个；根 `bun@1.3.14`。
- `models.opencode.ai` / zen catalog 仍是外部 JSON，不把 commit 文案里的模型名写成硬编码 live 名单。
- `hook.provider.models` 机制仍在（Codex 继续用）；只是 Azure 不再注册该 hook。

## 4. 节点改动

### 语义更新

- Provider / transforms：`model-layer.provider-transforms`、`ref.reasoning-variant-tables`、`provider.resolution`、`model-layer.provider-registry-v1`、`ref.ai-sdk-provider-map`、`provider.catalog`、`ref.env-vars`、`config.v1-providers-mcp-lsp`、`ref.config-keys`
- Auth / plugin：`model-layer.auth`、`provider.auth-accounts`、`plugin-api.v1-hooks`、`server.plugin-system`、`model-layer.copilot`
- Session / tools：`session-v1.processor`、`subsys.tools.v1`、`tool.apply-patch` 及引用 processor/tools 的 spine
- Console / Stats / TUI / 版本：`clients.console`、`peripheral.stats`、`infra.sst`、`tui.session-screen`、`spine.overview`、`ref.package-index`

### 证据或 target 元数据更新

- 其余 C-DRIFT 重落受影响 `[E:path:line]`。
- 120 个 D-CLEAN 完成 SHA bump。
- 全部 189 个 node frontmatter `updated` 统一为 `e207624c48`（filler + lead 收尾后验收）。

## 5. L2 独立证伪

另起 7 个干净 subagent，对 2 B-HEAVY + 67 C-DRIFT 逐条证伪 `e207624c48` 源码（不信 filler / update-facts）。7/7 `verified=true`。就地修了错绑行号与若干假句；lead 抽核峰时周末是 CST、Mythos 测试表、`session-ui` 依赖、Quota 报错原文。

| 批次 | 结果 | 就地修正要点 |
|---|---|---|
| transforms | pass | Mythos 测试行；config 路径不走 `reasoningVariants`（L3：仍可能 `cloudflareGatewayNpm`）；`GPT5_FAMILY_RE` 的 `/` 是前缀 |
| resolution | pass | ModelsDev 字段 optional 误写；plugin.list 与 models hook 因果；`ConfigV2Compat.lower` 锚点 |
| auth | pass | V2 OAuth 在 connection 上；loader/trigger/`PluginV2.add` 行号 |
| session-tools | pass | `resolvePromptParts` / V1 `MessageTable` / patch-part 行号 |
| console-stats | pass + 1 [U] | 峰时周末是 CST 不是 UTC；Quota 报错原文；503/geo/webhook 键 |
| tui-app | pass | `session-ui` 不依赖 schema/tui；desktop 依赖栏；Tui.run 行号 |
| light | pass | Read/execute/AISDK cache key/MCP blob/`TEAM_MEMBERS` 措辞 |

必核语义全部成立：`blockBinding` / GitLab family / V1 300s 且 core aisdk 无默认 / Azure 无 discovery / Codex major.minor / Copilot `X-Interaction-Id` / thinking-dropped / running `time.start` / truthy `movePath` / SessionV2 非默认 / `migrated_at`+proxy+`Quota.reset` / stealth+`CountryEntry[]`+5min cache / `1.18.29`+36+`client_id=opencode-desktop`。

仍开着：Google thoughts 可能被 trial limiter / `buildTokenCost` 二次计入（`home.ts:743`）。`permission.ask` 无 V1 trigger、无 `plugin/boot.ts` 沿用既有 [U]。

### L3（本轮补做，1 轮修复 + lead 复核）

L2 当时就地改完，没有单独 L3。补开 3 个 L3 subagent 只复核 L2 改句。

- auth-session / console-tui-light：L2 修复全部成立，未再改。
- transforms：L2 有一处假话——把 config 路径写成「不走 Cloudflare remap」。`provider.ts:1498` 仍会 `cloudflareGatewayNpm()`。已改正；`forceReasoning` 锚到 `transform.ts:1416`。lead 已对 1498/1416 回源。
- 第 2 轮无需再改。

## 6. 未决与风险边界

- zen/go live 模型表来自外部 catalog。
- Console / Stats schema 与仓内 migration SQL 不同步处只记代码意图。
- OpenAI service tier / Bedrock `none` effort 的真实 wire 行为在 AI SDK patch，不在 opencode TS。
- Desktop V2 sidecar 仍是 env opt-in（沿用上一轮）。

## 7. 实际验证与环境边界

- 本轮是源码证据与 Wiki 验证，没有跑 `bun install` 或定向测试。
- 所有结论以 target checkout 静态源码与已有测试文件为准。
- 上游源码与 lockfile 均未修改。

## 8. 完成门槛

- 所有 189 个 verified node frontmatter `updated` 精确为 `e207624c48`；`index.json.updated` 与每个 node entry 同步。
- `index.json` planned=0，节点数 189。
- `node tools/reconcile.mjs` 第二次 0 更新；`node tools/lint.mjs` 0 error / 0 warning。
- submodule HEAD 与 `refs/remotes/origin/dev` 都是 target。
- 本会话只改 `docs/llm-wiki/opencode/**` 与根仓 `opencode` gitlink。
