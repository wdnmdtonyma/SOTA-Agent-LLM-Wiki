# UPDATE SCOPE — opencode wiki 增量更新（df23b7f948 → 03e67171ab）

> 更新日期：2026-09-28
>
> **base（上一轮 verified HEAD / 父仓旧 gitlink）**：`df23b7f9488a38e6f8064a0739d4f8cde86d7cfb`
>
> **target（官方 `anomalyco/opencode` `origin/dev`）**：`03e67171ab2dc1e7f16e8cebfbc7f778f61b89f0`
>
> **跨度**：86 commits · 214 files changed · 5,956 insertions · 2,576 deletions
>
> 发布版本：**`1.18.33`**。根仍 `bun@1.3.14`，workspace 仍 36 个 package。

目标 checkout 已用 `git -C opencode rev-parse HEAD`、`git -C opencode rev-parse refs/remotes/origin/dev` 和 ancestry check 交叉确认。`opencode` 只更新根仓 gitlink；本轮没有修改上游源码。

## 1. 影响重算

重算以更新前 `index.json` 的 189 个 verified nodes 为集合，将每个 frontmatter `source[]` 与真实 numstat 交叉。删除的 source 计为 A-BROKEN，不把 diff 里的 `D` 路径算成 C-DRIFT hit。

```sh
git -C opencode diff --numstat \
  df23b7f9488a38e6f8064a0739d4f8cde86d7cfb..03e67171ab2dc1e7f16e8cebfbc7f778f61b89f0
```

| 分类 | 数量 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | 无 source 删除（唯一删除是 `packages/app/e2e/regression/legacy-new-session.spec.ts`，不在任何 node source[]） |
| B-HEAVY | 1 | `ref.package-index`（`packages/` umbrella，含全仓 `package.json` version bump 与 console/stats/web 新文件） |
| C-DRIFT | 58 | source churn < 2,000 行 |
| D-CLEAN | 130 | source 未命中；统一 bump `updated` |
| 新节点 | 0 | systemone / `openUrl` / `redactConfig` / R2 分页写入既有节点 |
| 退役节点 | 0 | |
| 完成后 verified nodes | 189 | 不变 |

机械 B-HEAVY：`ref.package-index`。

语义批次：`clients.console`、`peripheral.stats`、provider/Gemini/Cloudflare/Codex、`openUrl`+MCP/TUI/debug redact、catalogs/version、Bedrock+npm+filesystem search。大量 C-DRIFT 只碰 workspace `package.json` version，正文不扩写。

## 2. 真实 diff 的影响判定

| 代码变化 | Wiki 承载 | 判定 |
|---|---|---|
| 发布 `1.18.30` → `1.18.33` | `spine.overview`、`ref.package-index` | bun / 36 packages 不变 |
| `@ai-sdk/togetherai` 2.0.68；`gitlab-ai-provider` 6.18.0 | `ref.package-index` | pin only |
| `packages/core/src/open.ts` `openUrl` 仅 http(s) | MCP / TUI / CLI / OAuth 节点 | 替换直接 `open` |
| MCP browser `onExit(subprocess.exitCode)`；OAuth 拒非 http(s) | `integrations.mcp-client` | Windows/WSL launcher 已退出 |
| `debug config` → `redactConfig` | `cli.opencode-yargs` | 脱敏 stdout，config 本体仍给 provider |
| `timeoutFetch` 抽出；CF AI Gateway loader 走 binding.run | `provider.resolution` | gateway 自建 client 也吃 timeout |
| Gemini `isGemini25` / `isLegacyGemini`；Gemma 4 `minimal`/`high` | `model-layer.provider-transforms`、`ref.reasoning-variant-tables` | 不再 `includes("gemini-3")` |
| Codex `ALLOWED_MODELS` + `gpt-6-sol` / `gpt-6-luna` | `provider.resolution` | |
| Bedrock image hoist 仅 anthropic/nova/llama4 | `spine.v1-turn-loop` 等 message-v2 节点 | |
| TUI `ConfigRemoteAuthError` + `exitCode=1`；HttpApi 400 | `tui.architecture`、`ref.events` | |
| Node `createRequire` 解析 npm entry | `ref.lsp-servers` | |
| filesystem search 从 schema 取 `Entry`/`Match` | `persistence.filesystem-search` | 破循环 |
| Console `systemone` format + 路由；`oc_sk_` 不查 legacy 表；`x-zen-ip`；Black-only；Go subscription 搬家 | `clients.console` | |
| download 走 `opencode.ai/update/api`；安装链到 v2 | `clients.console` | 营销/分发面 |
| R2 SQL cursor 分页 + 40005/429/5xx retry | `peripheral.stats` | 15 分钟 timeout 仍在 |
| Stats `1D` ranking；10× change 隐藏；radar fallback；`hy4`→Tencent | `peripheral.stats` | |
| `models-snapshot.yml` 每日 v2 snapshot | `infra.ci-workflows` | |
| Web `V2Banner` | `clients.web` | 营销面 |

## 3. 显式快速核验：本轮未变化的专属重点

- `SessionV2` / `SessionRunner` 仍不是默认执行路径。
- 两个 server 仍是 Effect HttpApi，不是 Hono。
- V1/V2 tool registries 没有新增、删除或改名的模型可见 tool。
- workspace package 集合仍是 36 个；根 `bun@1.3.14`。
- `models.opencode.ai` / zen catalog 仍是外部 JSON。
- `hook.provider.models` 机制仍在。

## 4. 节点改动

### 语义更新

- Console：`clients.console`（并补 systemone / download / auth 路由进 source）
- Stats：`peripheral.stats`
- Provider：`provider.resolution`、`model-layer.provider-transforms`、`ref.reasoning-variant-tables`、`model-layer.provider-registry-v1`、`provider.catalog`
- `openUrl` / MCP / TUI / debug：`integrations.mcp-client`、TUI 节点、`cli.opencode-yargs`、auth 节点
- 版本与 package：`ref.package-index`、`spine.overview`、`infra.build-monorepo`、`infra.ci-workflows`、`clients.web`
- Bedrock / npm / search：session-v1 与 `persistence.filesystem-search`、`ref.lsp-servers`、`ref.events`

### 证据或 target 元数据更新

- 受行号漂移影响的 C-DRIFT 已机械重落 `[E]`（bump-sha 547 处）。
- 130 个 D-CLEAN 完成 SHA bump。
- 全部 189 个 node frontmatter `updated` 统一为 `03e67171ab`。

## 5. L2 独立证伪

另起 workflow（effort `low`）对 6 个语义批次回源证伪 `03e67171ab`（不信 filler / update-facts）。Fill 6/6。L2 第一轮 24 条（console 3 / stats 1 / provider 20）；L3 后 L2b 剩 provider 9 条，全部是 `provider.ts` 行号错绑。L3 第二轮落地后，主会话又把 pipeline 表（env/auth/plugin auth/custom loader/`Npm.add`）和 lint 拦下的注释行/`[channel]` 路径改准。

| 批次 | L2 | L3 / 复核要点 |
|---|---|---|
| console | 3 条，已修 | last-seen `migrated_at` vs picker 只滤 `timeDeleted`；`Billing.reload` invoice 在 91/102/116/117；Go checkout throw 在 `Actor.assert` 之后。`[channel]/[platform]` 下载路径 lint 不能核 `[E:]`，改 `[I]` |
| stats | 1 条，已修 | `RetentionSection` 组合在 `index.tsx:159`，标题在 `:673`；R2 `MAX_ROWS` 在 `r2-sql.ts:4` |
| provider | 20 + L2b 9，已修 | `timeoutFetch` 878；Gemini 正则；Codex Sol/Luna；`resolveSDK` 1785–1851；config variants 1619–1623 与最终 merge 1756；env 1634 / auth 1647 / plugin auth 1660 / custom 1680；`Npm.add` 1868 |
| mcp-tui | L2 空 | `openUrl` 仅 http(s)；MCP `onExit(exitCode)`；debug `redactConfig`；`ConfigRemoteAuthError` |
| catalogs | L2 空 | `1.18.33`、36 packages、`bun@1.3.14`、togetherai 2.0.68、gitlab-ai-provider 6.18.0 |
| session-npm | L2 空 | Bedrock image hoist 仅 anthropic/nova/llama4；Node `createRequire`；search 从 schema 取 `Entry`/`Match` |

必核语义：`openUrl` 只开 http(s) / CF Gateway loader 自己 `timeoutFetch` / Gemini 用 2.5 与 legacy 正则 / Codex `gpt-6-sol`+`gpt-6-luna` / Bedrock 非全量 image hoist / debug config 脱敏 / Console `systemone` 与 `oc_sk_` 不查 legacy 表 / Black-only 旧 Console / Stats R2 分页+retry 与 1D ranking 10× 隐藏 / `1.18.33`+36+`bun@1.3.14` / SessionV2 非默认。

## 6. 未决与风险边界

- zen/go live 模型表来自外部 catalog。`go-models.ts` 与 web `docs/go.mdx` / `docs/zen.mdx` 是营销面。
- Console / Stats schema 与仓内 migration SQL 不同步处只记代码意图。
- workspace 路径含 `[id]` 的文件 lint 无法核 `[E:]`，lite-section 只作 `[I]`。
- 未安装上游 `node_modules`，不宣称 runtime tests 通过。
- Google thoughts 可能被 trial limiter / `buildTokenCost` 二次计入（上一轮遗留 `[U]`）。
- 机械 `[E]` 重落只保证行不是空行/注释/纯括号；语义精度由 L2 对语义批次把关。

## 7. 实际验证与环境边界

- 本轮是源码证据与 Wiki 验证，没有跑 `bun install` 或定向测试。
- 所有结论以 target checkout 静态源码与已有测试文件为准。
- 上游源码与 lockfile 均未修改。

## 8. 完成门槛

- 所有 189 个 verified node frontmatter `updated` 精确为 `03e67171ab`；`index.json.updated` 与每个 node entry 同步。
- `index.json` planned=0，节点数 189。
- `node tools/reconcile.mjs` 第二次 0 更新；`node tools/lint.mjs` 0 error / 0 warning。
- submodule HEAD 与 `refs/remotes/origin/dev` 都是 target（若 origin/dev 在冻结后漂移，以冻结 SHA 为准并在此注明）。
- 本会话只改 `docs/llm-wiki/opencode/**`、根仓 `opencode` gitlink，以及本轮 L2/L3 workflow 定义。
