# UPDATE SCOPE — opencode wiki 增量更新（7534d23551 → 89130db6b0）

> 更新日期：2026-08-03
>
> **base（上一轮 verified HEAD / 父仓旧 gitlink）**：`7534d23551f665e65080809975b4ca5c7d63807b`
>
> **target（官方 `anomalyco/opencode` `origin/dev`）**：`89130db6b0060a345548d870c51132ee71d6a828`
>
> **跨度**：120 commits · 276 files changed · 10,169 insertions · 2,683 deletions

目标 checkout 已用 `git -C opencode rev-parse HEAD`、`git -C opencode rev-parse refs/remotes/origin/dev` 和 ancestry check 交叉确认。`opencode` 只更新根仓 gitlink；本轮没有修改上游源码，也没有初始化或更新 `codex`、`pi` 两个其他 submodule。

## 1. 影响重算

重算以更新前 `index.json` 的 188 个 verified nodes 为集合，将每个 frontmatter `source[]` 与真实 numstat 交叉；directory source 按 path prefix 展开，同一 changed file 在单节点内只计一次。

```sh
git -C opencode diff --numstat \
  7534d23551f665e65080809975b4ca5c7d63807b..89130db6b0060a345548d870c51132ee71d6a828
```

| 分类 | 数量 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | 已登记 source 没有删除或移动；所有 source 在 target checkout 仍存在 |
| B-HEAVY | 1 | `ref.package-index` 的 `packages/` umbrella source 命中 12,539 行 churn；36 个 workspace package 集合未变化，逐 package catalog 重新核对 |
| C-DRIFT | 42 | source churn 小于 2,000 行；受影响证据行已按 target checkout 重落 |
| D-CLEAN | 145 | source 未命中；快速复核后统一 bump `updated` |
| 新节点 | 0 | 新能力可由现有 provider/MCP/client/console/stats 节点自包含承载 |
| 退役节点 | 0 | 没有节点因 source 删除或职责消失而退役 |
| 完成后 verified nodes | 188 | 节点总数保持不变 |

42 个 C-DRIFT 节点是：

- provider / config / plugin：`ref.ai-sdk-provider-map`、`ref.auth-combinators`、`ref.config-keys`、`ref.copilot-tool-catalog`、`ref.env-vars`、`ref.reasoning-variant-tables`、`model-layer.copilot`、`model-layer.model-catalog-v2`、`model-layer.provider-registry-v1`、`model-layer.provider-transforms`、`config.v1-providers-mcp-lsp`、`plugin-api.v1-hooks`、`provider.catalog`、`provider.resolution`、`provider.snowflake-cortex`、`server.plugin-system`。
- clients / integrations：`clients.app`、`clients.app-compatibility`、`clients.console`、`clients.desktop`、`clients.ui`、`clients.web`、`integrations.acp`、`integrations.mcp-client`、`sdk.overview`。
- infra / peripheral / manifests：`spine.overview`、`server.embedded-public-api`、`tui.architecture`、`tui.runtime-hosting`、`infra.build-monorepo`、`infra.ci-workflows`、`infra.native-binary-release`、`infra.nix`、`infra.sst`、`peripheral.containers`、`peripheral.effect-sqlite`、`peripheral.enterprise`、`peripheral.function`、`peripheral.http-recorder`、`peripheral.script-identity`、`peripheral.slack`、`peripheral.stats`。

## 2. 真实 diff 的影响判定

| 代码变化 | Wiki 承载 | 判定 |
|---|---|---|
| models.dev `interleaved` 扩展为 boolean/string/object，string 规范成 `{ field }`；默认 catalog host 改为 `models.opencode.ai` | `provider.resolution`、`provider.catalog`、`model-layer.provider-registry-v1`、`config.v1-providers-mcp-lsp` | 既有 catalog/registry contract，更新 schema、投影和 source host；不新增节点 |
| Gemini sampling defaults 限定到明确 2.5/3/3.1/3.5 patterns，并改按 `model.api.id` 判定 | `model-layer.provider-transforms` | provider transform 既有职责；只把“未命中当前 whitelist pattern”的 API ID 判为省略 controls，不用“future version”泛化 |
| 新增内建 Modal provider hook 与 `/models` best-effort discovery | `model-layer.provider-registry-v1`、`provider.resolution`、`server.plugin-system` | plugin-driven provider discovery；仅看 catalog 首个 model URL，template 只做一次 nullish-key lookup，空 override 可能让 active Modal provider 被过滤 |
| MCP SDK 曾尝试升级后回到 pinned 1.29.0，并扩展 repo patch：callTool typings、分页 metadata、expired session recovery、SSE JSON-RPC error reconnect guard | `integrations.mcp-client` | 这是 compatibility patch，不是 SDK v2 migration；加入 patch/test/package sources |
| App current/V2 bootstrap 不再读 legacy global/directory config；timeline 只显示最后一个 assistant error | `clients.app-compatibility` | 现有 legacy/current compatibility contract；补充 V2 empty config 与 streaming recovery 行为 |
| prompt draft 的 canonical path 改为 content-addressed BlobReference；Web 用 IndexedDB，Desktop 用 SQLite/WAL + IPC | `clients.app`、`clients.ui`、`clients.desktop` | 跨 host persistence seam；显式保留 legacy `{id:dataUrl,url:dataUrl}` 与无 draft-store storage fallback 例外 |
| new-session 页面拆出 draft/workspace/view controllers | `clients.app` | App shell 内部结构面；不创建只描述文件拆分的新节点 |
| `OPENCODE_SIDECAR_V2=1` 选择 bundled CLI background service，默认仍是 embedded V1 utility-process sidecar | `clients.desktop` | Desktop host rollout；同 state-home 仅复用同版本 daemon，main health probe 失败不阻断窗口恢复，但 renderer 仍走共享 health gate |
| Console 添加 lite subscription unique index、referral reward index，Google usage 将 reasoning 加入 output tokens；源码仍隐藏 reward history等待 index 部署 | `clients.console` | schema/migration/runtime 边界并存；不把 migration 文件存在写成远端已应用 |
| Stats model catalog URL 从 models.dev 切到 `models.opencode.ai/{catalog.json,api.json,labs}` | `peripheral.stats` | 现有 stats catalog ingestion 变化 |
| App/desktop/provider/console/infra manifest 与 generated/vendor/test churn | 对应 C-DRIFT/B-HEAVY 节点 | 重落证据、核 manifest；未把版本或生成物 churn伪装成独立架构能力 |

## 3. 显式快速核验：本轮未变化的专属重点

- `SessionV2` / `SessionRunner` / SessionV2 repository 与 persistence core 没有直接源码 diff；保持既有节点语义，只 bump target SHA。
- Effect HttpApi 的 current/V1 route group 核心没有结构性变化；MCP 管理 API 仍是 Effect HttpApi，不是 Hono。
- V1/V2 tool registries 没有直接源码 diff；没有新增、删除或改名的模型可见 tool 节点。
- branch-keyed repository cache 与核心 persistence schema 没有直接源码 diff；本轮 Console migration 属 hosted Console database，不混入 V2 SQLite persistence。
- App/desktop 的 V2 字样分别可能表示 current server protocol、UI generation 或 sidecar rollout；节点正文继续显式区分，不把它们混写成 SessionV2 kernel 已成为默认。

## 4. 节点改动

### 语义更新

- `model-layer.provider-transforms`
- `model-layer.provider-registry-v1`
- `provider.resolution`
- `provider.catalog`
- `config.v1-providers-mcp-lsp`
- `server.plugin-system`
- `integrations.mcp-client`
- `clients.app`
- `clients.app-compatibility`
- `clients.ui`
- `clients.desktop`
- `clients.console`
- `peripheral.stats`

### 证据、manifest 或 target 元数据更新

- 其余 B-HEAVY/C-DRIFT 节点重落受影响 `[E:path:line]`；`ref.package-index` 重新确认 36 个 workspace packages。
- 145 个 D-CLEAN 节点完成 source/path 快速复核。
- 全部 188 个 node frontmatter `updated` 统一为 `89130db6b0`。
- `README.md`、`index.json`、`llms.txt` 与 gitlink target 一致；没有新增/退役节点，因此 llms 目录结构保持 188 nodes。

## 5. L2 独立证伪

四组独立 clean subagent 对本轮 13 个语义节点做源码反证；首轮均主动找到了过宽结论或证据链缺口，修复后再次只读复核，最终全部 PASS：

1. **Provider/Modal/Gemini — PASS**：纠正 Modal “任意 model URL”“template 逐级 fallback”“空覆盖清除静态 catalog”三项错误；明确 first-model URL、single nullish-key lookup、working database copy/active-provider deletion。Gemini 改为 current regex whitelist，不把 future 命名当版本判断；GPT-5 defaults 改成精确 `gpt-5-chat` / `gpt-5-pro` substring 与 Azure `gpt-5.5` reasoning-default early return。
2. **MCP — PASS**：确认 target 当前仍 pinned `@modelcontextprotocol/sdk@1.29.0`，中间曾尝试 v2 后恢复 legacy compatibility；补齐 declaration-only `callTool`、reinitialize、pagination metadata、session recovery/active-request guard、JSON-RPC error reconnect guard、OAuth `offline_access` 五类行为与测试/fixture sources。
3. **App/UI/Desktop — PASS**：纠正 main-process health probe 为 best-effort 而非窗口恢复门槛，同时保留 renderer `ConnectionGate`；daemon 仅同 state-home/同版本复用；区分 `main` selector sentinel 与实际 worktree；保留 legacy `{id:dataUrl,url:dataUrl}`，并把 data URL 限定为 App adapter choice。
4. **Console/Stats — PASS**：纠正 referral placeholder 对 invitee pending 的抑制与 inviter pending 行为；确认 Google inclusive output 进入 cost/metrics/storage，同时把下游重复相加与陈旧测试登记为 `[U]`；schema/migration 只证明代码意图，不外推 production 部署；Stats 三个 URL 与 fetch chain 证据闭环。

最终 L2 同时逐条复查新增 `[E:path:line]`；语义阻断项全部收敛，剩余事项均已降为下面的运行/线上状态风险。

## 6. 未决与风险边界

- Modal discovery 是 3 秒超时的 best-effort network call；现有测试未覆盖首 model 缺 URL、首选 template key lookup miss、空 override 到 active-provider deletion 的完整链路，也不能证明真实 Modal endpoint 当前可用。
- Desktop V2 sidecar 由 env opt-in，且 target builder 只在 dev channel extraResources 中携带 CLI；不能外推 beta/prod 发布状态。
- Console migration 文件与 schema 同步，但本任务没有远端数据库权限；production migration state 未验证，既有重复 non-NULL ID 可能使 unique-index migration 失败，reward history 在 target 源码仍被显式隐藏。
- Google normalizer 的 inclusive output 与 generic trial/Stats 再加 reasoning 之间可能重复计算 thoughts；target test 仍期待旧 output 值，二者已登记进 `reference/uncertainty.md`。
- MCP behavior 依赖 patched third-party SDK dist；targeted test 覆盖 JSON-RPC error reconnect guard，expired-session并发 recovery 的真实 server interoperability 仍以 patch/source contract 为限。
- `models.opencode.ai` / Modal / Stats endpoint 仅做源码 URL 与 payload shape 核验，没有执行线上可达性检查。
- 本轮不改上游源码；package install/test 环境不完整，实际测试结果与 docs 验证分开记录。

## 7. 实际验证与环境边界

- `bun install --frozen-lockfile`：失败，内部 `npm.mihoyo.com` 对 Effect packages 返回 404；改用 public registry 的重试未完成并被终止，lockfile 未修改。
- `packages/opencode` 七个 provider/MCP targeted test files：测试收集阶段因 partial dependency tree 缺 `@babel/types`，0 pass / 7 fail；不是断言失败。
- `packages/app` 三个 targeted test files：测试收集阶段缺 `@solid-primitives/keyed` / `pure-rand`，0 pass / 3 fail。
- `packages/desktop`：`electron-builder.config.test.ts` 7 pass；`draft-store.test.ts` 因 Bun 环境不提供 `node:sqlite` 在收集阶段失败。
- `packages/session-ui/src/v2/components/prompt-input/store.test.ts`：5 pass / 0 fail。
- `packages/console/app/test/providerUsage.test.ts`：测试收集阶段缺 `@smithy/util-buffer-from`，0 pass / 1 fail；此外源码与测试期望的 Google output 已由 L2 静态确认冲突。
- 所有 test 命令均从适用 package 目录运行，没有从 `opencode` 根执行测试；上游源码与 lockfile 均未修改。

## 8. 完成门槛

- 所有 188 个 verified node frontmatter `updated` 精确为 `89130db6b0`；`index.json.updated` 与每个 node entry 同步。
- `index.json` planned=0，节点数保持 188；`llms.txt` 仍登记全部节点。
- `node tools/reconcile.mjs`、`node tools/lint.mjs` 全绿；第二次 reconcile 必须 0 更新且工作树幂等。
- 所有 `[E:path:line]` 指向 target checkout 的存在且非空/非注释/非纯括号行；L2 对语义精度另行证伪。
- submodule HEAD 与 `refs/remotes/origin/dev` 都是 target，submodule工作树 clean。
- 最终 diff/stage 只允许 `docs/llm-wiki/opencode/**` 与根仓 `opencode` gitlink；不包含临时文件，不更新其他 submodule。
