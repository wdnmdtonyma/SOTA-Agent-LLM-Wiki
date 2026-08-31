# UPDATE SCOPE — opencode wiki 增量更新（3fd77ae980 → 9f69463f1d）

> 更新日期：2026-08-31
>
> **base（上一轮 verified HEAD / 父仓旧 gitlink）**：`3fd77ae980c9e68eccd10f1c396f32c6e3965046`
>
> **target（官方 `anomalyco/opencode` `origin/dev`）**：`9f69463f1d556af2b5b51d2efa1c04f5f544f911`
>
> **跨度**：181 commits · 396 files changed · 19,284 insertions · 5,924 deletions
>
> 插入量主体仍是 web docs / i18n；非 i18n 语义 churn 约 258 files / +14,523 / -2,426。

目标 checkout 已用 `git -C opencode rev-parse HEAD`、`git -C opencode rev-parse refs/remotes/origin/dev` 和 ancestry check 交叉确认。`opencode` 只更新根仓 gitlink；本轮没有修改上游源码。

## 1. 影响重算

重算以更新前 `index.json` 的 188 个 verified nodes 为集合，将每个 frontmatter `source[]` 与真实 numstat 交叉。

```sh
git -C opencode diff --numstat \
  3fd77ae980c9e68eccd10f1c396f32c6e3965046..9f69463f1d556af2b5b51d2efa1c04f5f544f911
```

| 分类 | 数量 | 判定 |
|---|---:|---|
| A-BROKEN | 2 | `infra.ci-workflows` 缺 `.github/workflows/beta.yml`；`peripheral.stats` 缺 `packages/stats/app/src/routes/geo-map.ts`。均已 remap |
| B-HEAVY | 1 | `ref.package-index` 的 `packages/` umbrella 命中全仓 churn；workspace 仍 36 包 |
| C-DRIFT | 81 | source churn < 2,000 行；语义节点重写，轻量节点重落 `[E]` |
| D-CLEAN | 104 | source 未命中；统一 bump `updated` |
| 新节点 | 1 | `config.v2-compat`（V1 loader 的 V2-shaped 投影层） |
| 退役节点 | 0 | 无职责消失到需要退役 |
| 完成后 verified nodes | 189 | 188 + 1 |

## 2. 真实 diff 的影响判定

| 代码变化 | Wiki 承载 | 判定 |
|---|---|---|
| `ConfigV2Compat.lower`：V2-shaped 文件投影成 V1；`permissions` 硬拒绝 | `config.v2-compat`（新）、`persistence.config-loading` | 不是 `config.migration`（那是 V1→V2） |
| `update`/`updateGlobal` merge 原始 JSON/JSONC + 文本 snapshot | `persistence.config-loading` | 保留未 lower 的 V2 字段 |
| Bedrock 只 replay 带 signature/redacted* 的 reasoning | `model-layer.provider-transforms` | 不再因非空 text 保留 |
| Qwen 去掉 0.55 / 1 采样默认 | `model-layer.provider-transforms` | `temperature`/`topP` 返回 undefined |
| `textVerbosity: "low"` 仅 `@ai-sdk/openai` 与 mantle | `model-layer.provider-transforms`、`ref.reasoning-variant-tables` | openai-compatible / Azure / Copilot 不注入 |
| CF AI Gateway 三分路由 + `cloudflareGatewayNpm` | `provider.resolution`、`ref.ai-sdk-provider-map` | Core plugin 只 token-scope Workers AI |
| Vertex `eu`/`us` 走 REP | `provider.resolution` | `googleVertexEndpoint` |
| Azure CLI Entra OAuth 重写 | `model-layer.auth`、`plugin-api.v1-hooks` | 未装 `az` 则隐藏 OAuth |
| CerebrasPlugin 清 `maxOutputTokens` | `plugin-api.v1-hooks` | 不是新 tool |
| Codex compute residency + gpt-5.6 限额 400k | `model-layer.auth` | JWT → `x-openai-internal-codex-residency` |
| `finish: "unknown"` 不再结束 prompt loop | `session-v1.prompt`、`spine.v1-turn-loop` | 改在 `prompt.ts`，processor.ts 无 diff |
| `network_error` finish + capacity retry | `session-v1.processor`、`session-v1.llm-runtime` | retry.ts / ai-sdk.ts / error.ts |
| TaskTool 子 agent 失败带 `task_id` | `tool.task` | 不再静默空串 |
| `opencode run` 应答 child `permission.asked` | `cli.run` | `sessions` Set |
| `x-parent-session-id` 提到公共 header | `session-v1.llm-runtime`、V2 runner 节点 | 所有 provider |
| malformed model cost → `finite()` | `session-v1.store` | NaN/Infinity 不当污染 |
| legacy drizzle seed 无 `name` 列 | `persistence.database` | `created_at` 前缀匹配 |
| Zen streaming requestBody；CST 工作日峰时；首月 50% 停售 | `clients.console` | 不拆新节点 |
| Stats weekly retention；删 geo-map | `peripheral.stats` | 不外推 production migration |
| App archive + rename onBlur | `clients.app` | v1 protocol |
| GitHub OIDC 用 `payload.repository` | `peripheral.function` | 不再 parse `sub` |
| 删 `beta.yml`；加 `unlock.yml` | `infra.ci-workflows` | hourly beta sync 已停 |
| TUI opaque reasoning → Thought header | `tui.session-screen` | 不可展开、不渲染 body |
| `global.upgrade` target 必填 semver | `server-api.v1-routes` | 无 auto-latest |
| 发布 `1.18.25` | `spine.overview`、`ref.package-index` | `bun@1.3.14` 不变 |

## 3. 显式快速核验：本轮未变化的专属重点

- `SessionV2` / `SessionRunner` 仍不是默认执行路径；App/UI “V2” 仍是 UI generation / current protocol。
- 两个 server 仍是 Effect HttpApi，不是 Hono。
- V1/V2 tool registries 没有新增、删除或改名的模型可见 tool。
- workspace package 集合仍是 36 个；根 `bun@1.3.14`；发布版本同步到 `1.18.25`。
- `models.opencode.ai` / zen catalog 仍是外部 JSON，不把 commit 文案里的模型名写成硬编码 live 名单。
- `packages/core/src/config.ts` 与 `packages/core/src/v1/config/` 本 range 无 diff。

## 4. 节点改动

### 新节点

- `config.v2-compat` → `surface/config/v2-compat.md`

### 语义更新（摘要）

- Provider / auth：`model-layer.provider-transforms`、`ref.reasoning-variant-tables`、`provider.resolution`、`provider.catalog`、`ref.ai-sdk-provider-map`、`model-layer.provider-registry-v1`、`model-layer.model-catalog-v2`、`model-layer.auth`、`provider.auth-accounts`、`plugin-api.v1-hooks`、`server.plugin-system`、`model-layer.copilot`
- Session / CLI / tools：`session-v1.prompt`、`session-v1.processor`、`session-v1.store`、`session-v1.llm-runtime`、`session-v1.compaction-overflow`、`spine.v1-turn-loop`、`spine.cli-to-session`、`tool.task`、`cli.run`、`cli.opencode-yargs`
- Config / DB：`persistence.config-loading`、`persistence.database`
- Console / Stats / App / Infra：`clients.console`、`peripheral.stats`、`clients.app`、`clients.app-compatibility`、`peripheral.function`、`infra.ci-workflows`、`infra.native-binary-release`、`server-api.v1-routes`、`tui.session-screen`、`spine.overview`、`ref.package-index`

### 证据或 target 元数据更新

- 其余 C-DRIFT 重落受影响 `[E:path:line]`；V2 runner 节点补了一句 http headers / parent session id。
- 104 个 D-CLEAN + 若干仅 `package.json` 的 C-DRIFT 完成 SHA bump。
- 全部 189 个 node frontmatter `updated` 统一为 `9f69463f1d`。
- `README.md`、`index.json`、`llms.txt` 与 gitlink target 一致。

## 5. L2 独立证伪

三组独立 clean subagent 对本轮语义节点做源码反证，最终全部 PASS：

1. **Provider/transforms/CF/Vertex — PASS**：Bedrock signature-only replay、Qwen 无默认采样、textVerbosity npm 白名单、CF 三分路由、Vertex REP、Azure accountId→resource。顺手修了 BUNDLED_PROVIDERS 整表偏一行与若干注释锚点。
2. **Auth/plugin/session/retry/task — PASS**：Azure CLI Entra、CerebrasPlugin 注册、unknown finish 不结束 loop、processor.ts 本 range 无 diff、TaskTool `task_id` fail、run 跟踪 child permission。
3. **Config/console/stats/app/CI — PASS**：`ConfigV2Compat.lower` + permissions throw、geo-map/beta.yml 已删、SessionV2 非默认、无硬编码 zen 菜单。残余 `[U]`：Google thoughts 可能二次计入（`_staging/uncertainty-update-console.md`）。

第四组补核剩余 draft（cli-to-session / system-prompts / eventing / V2 traces 等）同样 PASS；纠正了 chdir 目标、假 `ServerAuth.Service`、假 `compaction.ended.2` 等 filler 过宽说法。

## 6. 未决与风险边界

- Google `outputTokens` 已含 thoughts，trial limiter / Stats `buildTokenCost` 仍再加 `reasoningTokens`；`providerUsage.test.ts` 仍期待旧 output=3。
- App timeline current-source 顺序是否总等于 durable aggregate、current PTY ticketless handshake 仍 `[U]`。
- zen/go live 模型表来自外部 catalog。
- Console / Stats schema 与仓内 migration SQL 不同步处只记代码意图。
- `SessionContextEpoch.reset` 仍导出但 production 无 caller（沿用上一轮）。
- Desktop V2 sidecar 仍是 env opt-in。

## 7. 实际验证与环境边界

- 本轮是源码证据与 Wiki 验证，没有跑 `bun install` 或定向测试。
- 所有结论以 target checkout 静态源码与已有测试文件为准。
- 上游源码与 lockfile 均未修改。

## 8. 完成门槛

- 所有 189 个 verified node frontmatter `updated` 精确为 `9f69463f1d`；`index.json.updated` 与每个 node entry 同步。
- `index.json` planned=0，节点数 189；`llms.txt` 登记全部节点（含 `config.v2-compat`）。
- `node tools/reconcile.mjs` 第二次 0 更新；`node tools/lint.mjs` 0 error / 0 warning。
- submodule HEAD 与 `refs/remotes/origin/dev` 都是 target。
- 本会话只改 `docs/llm-wiki/opencode/**` 与根仓 `opencode` gitlink。
