# UPDATE SCOPE — opencode wiki 增量更新（e207624c48 → b3f1a96c6d）

> 更新日期：2026-09-10
>
> **base（上一轮 verified HEAD / 父仓旧 gitlink）**：`e207624c48159b03dbe17dbc8e51bbcf23e72df5`
>
> **target（官方 `anomalyco/opencode` `origin/dev`）**：`b3f1a96c6dd7adeb28b36dd11add1998fc84d67b`
>
> **跨度**：23 commits · 88 files changed · 2,802 insertions · 1,653 deletions
>
> 发布版本：`1.18.29` → **`1.18.30`**。`bun@1.3.14` 与 36 workspace packages 不变。

目标 checkout 已用 `git -C opencode rev-parse HEAD`、`git -C opencode rev-parse refs/remotes/origin/dev` 和 ancestry check 交叉确认。`opencode` 只更新根仓 gitlink；本轮没有修改上游源码。

## 1. 影响重算

重算以更新前 `index.json` 的 189 个 verified nodes 为集合，将每个 frontmatter `source[]` 与真实 numstat 交叉。

```sh
git -C opencode diff --numstat \
  e207624c48159b03dbe17dbc8e51bbcf23e72df5..b3f1a96c6dd7adeb28b36dd11add1998fc84d67b
```

| 分类 | 数量 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | 无 source 删除 |
| B-HEAVY | 1 | `ref.package-index`（`packages/` umbrella，含 web/i18n 与版本 bump） |
| C-DRIFT | 40 | source churn < 2,000 行 |
| D-CLEAN | 148 | source 未命中；统一 bump `updated` |
| 新节点 | 0 | Go proxy / Astra / OAuth client.json 写入既有节点 |
| 退役节点 | 0 | |
| 完成后 verified nodes | 189 | 不变 |

## 2. 真实 diff 的影响判定

| 代码变化 | Wiki 承载 | 判定 |
|---|---|---|
| V1 `gpt-6` → `PROMPT_ASTRA` / `gpt-astra.txt`（`gpt` 分支内、beast 之后、codex 之前） | `prompt.system-prompts` | 不是新 tool；`packages/core` 无 Astra selector |
| Bedrock `arn:` 原样返回；US 前缀子串 `"deepseek"` → `"deepseek.r1"` | `ref.ai-sdk-provider-map`、`provider.resolution`、`model-layer.provider-registry-v1`、`model-layer.model-catalog-v2` | V1 `getModel` 与 V2 `resolveModelID` 对齐 |
| Copilot adaptive thinking variants 一律 `display: "summarized"` | `model-layer.copilot` | 只改 `CopilotModels.build()`，不是 `transform.ts` Claude heuristic |
| `proxyInference`：Go POST/GET paths；`generation` optional；Go 不 join BYOK；抽出 `inferenceUnavailable` | `clients.console` | handler 在 truthy `model` 时即调用；BYOK 仍只 `modelList==="full"` |
| `GET /zen/v1/models` 删除 `proxyModels()`；Go models/usage 先 proxy | `clients.console` | 共享 helper |
| `GET /oauth/opencode/client.json` Client ID Metadata Document | `clients.console` | 不是新 auth 协议 |
| SST `ZEN_LITE_PRICE`：dev 复用已有 Stripe product/price | `infra.sst` | 解开 dev checkout |
| `go-models.ts` 营销表加入 DeepSeek V4.1 Flash 4×；FAQ/lite 去掉 Omen Alpha | `clients.console` | **不是** live zen catalog |
| `gitlab-ai-provider` 6.14.0 → 6.15.0 | package.json only | family 分流未改 |
| 发布 `1.18.30` | `spine.overview`、`ref.package-index` | bun / 36 packages 不变 |

## 3. 显式快速核验：本轮未变化的专属重点

- `SessionV2` / `SessionRunner` 仍不是默认执行路径。
- 两个 server 仍是 Effect HttpApi，不是 Hono。
- V1/V2 tool registries 没有新增、删除或改名的模型可见 tool。
- workspace package 集合仍是 36 个；根 `bun@1.3.14`。
- `models.opencode.ai` / zen catalog 仍是外部 JSON；`go-models.ts` 只是 Console 营销/UI allowance 表。
- `hook.provider.models` 机制仍在（Azure 仍不注册）。
- `transform.ts` 里 Copilot 把 max/xhigh 过滤、opus-4.7 收到 medium 的规则仍在，与 `display: summarized` 不是同一处。

## 4. 节点改动

### 语义更新

- Prompt：`prompt.system-prompts`
- Bedrock / provider：`ref.ai-sdk-provider-map`、`provider.resolution`、`model-layer.provider-registry-v1`、`model-layer.model-catalog-v2`、`ref.env-vars`
- Copilot：`model-layer.copilot`
- Console / SST / 版本：`clients.console`、`infra.sst`、`spine.overview`、`ref.package-index`

### 证据或 target 元数据更新

- 受 `provider.ts` / `amazon-bedrock.ts` / `system.ts` / `inference-proxy.ts` 行号漂移影响的 C-DRIFT 已机械重落 `[E]`。
- 148 个 D-CLEAN 完成 SHA bump。
- 全部 189 个 node frontmatter `updated` 统一为 `b3f1a96c6d`。

## 5. L2 独立证伪

另起 4 个干净 subagent，对语义批次回源证伪 `b3f1a96c6d`（不信 filler / update-facts）。4/4 `verified=true`。就地修了错绑行号与若干假句。

### L3（独立复核 L2 改句，1 轮，无需第 2 轮）

L2 当时就地改完。按 `RUN.md` 另起 3 个 L3 subagent，**只复核 L2 改句**，不信 L2 / filler。3/3 `l2_fixes_hold=true`，未再改文件。

| 批次 | 结果 | 复核要点 |
|---|---|---|
| prompts | hold | `system.ts:29` 仍是 muse `api.id`；`:47` 是 Kimi `providerID` 三值；只有 Kimi 看 providerID。hook 名在 `request.ts:70` |
| console | hold | 无 generation 时确为 `new Request(destination, request)`；Google BYOK 含 `/models/${encodeURIComponent(model)}`；503 文案在 `:114`；go models `:11` / usage `:12` |
| copilot-index | hold | 五个 package.json runtime/peer 行与「导出」引用分开成立；`GithubCopilotNativeProvider` 无残留 |

bedrock L2 无改句，不单开 L3。第 2 轮无需再改。

| 批次 | 结果 | 就地修正要点 |
|---|---|---|
| prompts | pass | 开头句改为「主要根据 api.id（Kimi 也可看 providerID）」；system.transform hook 锚到 `request.ts:70` |
| console-sst | pass | GET 转发是 `new Request(destination, request)`；Google BYOK 路径含 `/models/${encodeURIComponent(model)}`；`inferenceUnavailable` 报文锚到 `:114` |
| bedrock | pass | 无再改。`arn:` / `deepseek.r1` / 已有 prefix 跳过，V1+V2 一致 |
| copilot-version | pass | 删不存在的 `GithubCopilotNativeProvider`；package-index 若干 runtime 依赖写过头（client/protocol/schema/sdk-next/httpapi-codegen） |

lead 未把「L2 就地改 + 抽核」当成 L3；L3 是上面独立批次。

必核语义全部成立：`gpt-6`→Astra 且 beast 挡 `gpt-4*` / V1+V2 Bedrock `arn:`+`deepseek.r1` / Copilot adaptive 一律 `summarized` / handler truthy `model` 即 proxy 且 BYOK 只 full / Go 不 join ProviderTable / `proxyModels` 已删 / `client.json` native+loopback 无端口 / `ZEN_LITE_PRICE` dev 复用 Stripe ids / `1.18.30`+36+`bun@1.3.14` / SessionV2 非默认。

仍开着：Google thoughts 可能被 trial limiter / `buildTokenCost` 二次计入（`home.ts:743`）。

## 6. 未决与风险边界

- zen/go live 模型表来自外部 catalog。`go-models.ts` 与 web `docs/go.mdx` 是营销面。
- Console / Stats schema 与仓内 migration SQL 不同步处只记代码意图。
- workspace 路径含 `[id]` 的文件 lint 无法核 `[E:]`，lite-section 只作 `[I]`。
- 未安装上游 `node_modules`，不宣称 runtime tests 通过。

## 7. 实际验证与环境边界

- 本轮是源码证据与 Wiki 验证，没有跑 `bun install` 或定向测试。
- 所有结论以 target checkout 静态源码与已有测试文件为准。
- 上游源码与 lockfile 均未修改。

## 8. 完成门槛

- 所有 189 个 verified node frontmatter `updated` 精确为 `b3f1a96c6d`；`index.json.updated` 与每个 node entry 同步。
- `index.json` planned=0，节点数 189。
- `node tools/reconcile.mjs` 第二次 0 更新；`node tools/lint.mjs` 0 error / 0 warning。
- submodule HEAD 与 `refs/remotes/origin/dev` 都是 target。
- 本会话只改 `docs/llm-wiki/opencode/**` 与根仓 `opencode` gitlink。
