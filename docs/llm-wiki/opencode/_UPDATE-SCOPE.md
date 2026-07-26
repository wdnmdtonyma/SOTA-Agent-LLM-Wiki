# UPDATE SCOPE — opencode wiki 增量更新（67caf894e → 7534d23551）

> 更新日期：2026-07-26
>
> **base（上一轮 verified HEAD）**：`67caf894e0843ee370e72839e8265e483233479b`
>
> **target（官方 `anomalyco/opencode` `origin/dev`）**：`7534d23551f665e65080809975b4ca5c7d63807b`
>
> **跨度**：101 commits · 269 files changed · 15,539 insertions · 4,516 deletions

目标 checkout 已用 `git -C opencode rev-parse HEAD` 与 `refs/remotes/origin/dev` 双重确认。`opencode` 只更新根仓 gitlink；本轮没有修改子模块工作树内容，也没有初始化其他子模块。

## 1. 影响重算

重算使用上一轮 `index.json` 的 186 个 verified nodes，与本轮代码 diff 的 path/numstat 交叉：

```sh
git -C opencode diff --numstat \
  67caf894e0843ee370e72839e8265e483233479b..7534d23551f665e65080809975b4ca5c7d63807b
```

| 分类 | 数量 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | 旧 index 的 source path 没有在本区间删除或移动 |
| B-HEAVY | 0 | 没有单一既有节点因自身具体 source 形成结构性重写；`ref.package-index` 的 `packages/` umbrella churn 不按单节点 heavy 处理 |
| C-DRIFT | 27 | 至少一个具体 `source[]` path 直接出现在 numstat |
| D-CLEAN / manifest-only 快速复核 | 159 | source 未直接命中；仍检查 path、引用与 target SHA |
| 新节点 | 2 | App legacy/current compatibility；branch-keyed repository cache |
| 完成后 verified nodes | 188 | 186 + 2 |

27 个直接命中节点是：

- architecture/behavior：`clients.app`、`clients.ui`、`clients.desktop`、`clients.console`、`provider.resolution`、`model-layer.provider-transforms`、`model-layer.copilot`、`ref.reasoning-variant-tables`、`tool.grep`、`spine.overview`。
- evidence/manifest：`sdk.overview`、`integrations.acp`、`tui.architecture`、`tui.runtime-hosting`、`server.embedded-public-api`、`clients.web`、`infra.build-monorepo`、`infra.native-binary-release`、`infra.sst`、`infra.nix`、`peripheral.slack`、`peripheral.function`、`peripheral.enterprise`、`peripheral.containers`、`peripheral.script-identity`、`ref.package-index`、`subsys.tools.codemode`。

目录 source prefix 与新增文件扫描还发现了不能由“27 个具体命中”表达的 cross-cutting 变化：repository cache、App current transport/session projection、`meta.txt` system prompt、LLM provider-error matcher、CLI import error mapping、Node PTY Windows adapter。它们均已人工纳入下述节点判定，而不是机械标成 clean。

## 2. 新增架构与对外行为判定

| 代码变化 | Wiki 承载 | 判定 |
|---|---|---|
| App V1/V2 protocol probe、current-shaped hybrid API、current event transport、session reducer/legacy projection、timeline rows | `clients.app` + 新 `clients.app-compatibility` | 新建专门 T2；原 App 节点只保留 shell/platform 总览并链接兼容层 |
| App Home 从单体页面拆成 controller / view / scroll / search seams | `clients.app` | 属于现有 App shell 内部架构，不再另建节点 |
| PromptInputV2 cursor-aware structured draft、populated command-menu draft preservation、可配置 keybind | `clients.ui` | 属于现有 shared Session UI 节点，不再另建节点 |
| App current PTY CRUD、abnormal-close gone check 与 direct WebSocket transport | `clients.app-compatibility` | 并入兼容层节点；明确 V1/current URL 与 location query 分流，并把 current connect-token checklist/runtime 张力记为 `[U]` |
| sdk-next `OpenCode.create/Service/layer` same-process facade、embedded routes/local client 与 application tools | `server.embedded-public-api` + `spine.v1-v2-relationship` | 修正旧 core-public-facade 遗留；属于既有 V2 embedding 节点，不新增节点 |
| branch-keyed remote repository checkout、lock、refresh、Reference async materialization | 新 `persistence.repository-cache` | 现有 persistence 节点无法自包含 cache identity/readiness，新增 T2 |
| Claude adaptive thinking、Kimi adaptive options、MiniMax provider split | `model-layer.provider-transforms`、`provider.resolution`、`ref.reasoning-variant-tables` | provider transform 既有职责内，不新增节点 |
| Mistral reasoning variants、prompt cache key、native thinking metadata/history round-trip patch | 同上，重点落在 `model-layer.provider-transforms` | patch 与 mock-fetch tests 加入 source/evidence；不单建 provider 节点 |
| V1 grep realpath search + requested symlink-alias output | `tool.grep`、`ref.tool-catalog` | 只改变既有工具的 presentation-path 语义，不新增节点 |
| `muse-spark` 使用 `meta.txt` prompt | `prompt.system-prompts` | 并入既有 prompt catalog |
| native LLM overflow/error pattern expansion | `model-layer.llm-protocol-engine` | 并入既有 protocol engine |
| Desktop dual health endpoint、CLI import error、Console moderation flags、Windows node-pty ConPTY DLL | `clients.desktop`、`cli.opencode-yargs`、`clients.console`、`execution.pty` | 各自并入既有节点 |
| version bumps、Nix hashes、CSS token、translations、generated/vendor/test artifacts | 对应 manifest/client/infra 节点快速复核 | 没有独立架构 contract，不新增节点 |

## 3. 节点改动

### 新增

- `clients.app-compatibility`
- `persistence.repository-cache`

### 语义更新

- `clients.app`
- `clients.ui`
- `clients.desktop`
- `clients.console`
- `provider.resolution`
- `model-layer.provider-transforms`
- `ref.reasoning-variant-tables`
- `tool.grep`
- `ref.tool-catalog`
- `prompt.system-prompts`
- `model-layer.llm-protocol-engine`
- `cli.opencode-yargs`
- `execution.pty`
- `server.embedded-public-api`

### 证据、行号或入口一致性更新

- `spine.overview`
- `spine.v1-v2-relationship`
- `clients.app` / provider-family nodes 的关联与 source 清单
- `ref.env-vars`、`persistence.project-instance-location` 只补 repository-cache source/related/link 与漂移行号，不宣称新行为
- `reference/glossary`、`model-layer.copilot`、`model-layer.provider-registry-v1`、`provider.catalog`
- D-CLEAN 文本抽查同时清除了 `server.plugin-system`、`session-v1.compaction-overflow` 与 uncertainty staging 中残留的更早快照措辞
- `group.db-schema` 的 manifest 计数同步为 19 tables + 38 migrations（57 instances），与 target `migration.gen.ts` 和 `ref.db-schema` 一致
- README、`llms.txt`、`index.json`、`reference/uncertainty.md`
- 其余 verified nodes 完成 target SHA bump；未把 manifest-only 变化伪装成新的架构事实

## 4. L2 独立证伪

四组只读 L2 分别独立对照 target 源码、diff 与测试定义：

1. **App compatibility / timeline**
   - 确认 App 不实现 server-side `SessionPrompt.runLoop` / `SessionRunner`；证伪“同时双写两套 server API”“完整 endpoint parity”“current SSE durable replay”“timeline 自行保证 durable sequence”。
   - 确认为 per-server probe 后单选、hybrid façade、16ms current-event batching、无 `Last-Event-ID`、current source + legacy render projection，以及只针对 missing promoted input 的 best-effort hydrate。
   - Home/PromptInputV2 补充证伪把 controller/view extraction、current session list + V1-only archive 与 populated command-menu draft-preservation 限定在现有 client 节点；PTY follow-up 则按 target code 确认 current CRUD/direct WS 分流，同时否定“current connect-token 已 live-wired”。
2. **Provider transforms**
   - 证伪 Anthropic 一律手工 cache breakpoints、Meta 默认 xhigh、Kimi 一律 suppress、Opus 4.5 只有 effort 等旧说法。
   - 确认 Claude 4.7+/future-alias adaptive heuristic、Kimi summarized adaptive、SDK-specific cache key、Mistral 3.0.51 pinned patch 的 native thinking round-trip。
3. **Repository cache / grep**
   - 证伪“Reference.list 表示 checkout ready”“lock 保护 readers”“grep 在 alias path 上搜索”“输出完整保留原始字符串”。
   - 确认 branch-keyed cache path、per-checkout lock、newest-wins refresh、异步 materialization，以及 realpath search/requested-alias presentation。
4. **Misc surface / migration boundaries**
   - 确认 Desktop dual health、Console model-specific moderation、Muse Spark `meta.txt` wiring、CLI import error presentation、Windows `useConptyDll`、EventV2 durable manifest、`PluginInternal.boot` 与 compaction bridge publish。
   - 证伪 generic `"request too large"` 一律 overflow，以及“目标没有 current `OpenCode` facade”；据此收紧 matcher 文案，并把 sdk-next facade 标明为 monorepo-private same-process surface。

本机没有 `bun`，以下独立测试运行尝试均以 exit 127 结束，因此 L2 等级是“源码 + 测试定义证伪”，不是运行时通过：

- `bun test packages/opencode/test/provider/transform.test.ts`
- core repository/reference targeted tests
- V1 grep targeted test

## 5. 降级与未决项

已写入节点正文与 `_staging`，并由 reconcile 汇总到 `reference/uncertainty.md`：

- `[U]` current SSE 没有通用 replay/gap-recovery contract；timeline input order 是否恒等于 durable aggregate sequence 未由 App 层证明。
- `[U]` App current PTY connect-token checklist 与 runtime wiring 不一致；目标代码在没有 current client ticket 时仍尝试 WebSocket 连接，App 源码未证明 ticketless handshake 能成功或其预期 authorization contract。
- `[U]` grep symlink-alias 行为在 Windows 被测试跳过；symlink-to-file presentation 未覆盖。
- `[U]` branchless cache 对 `origin/HEAD` 变化/缺失的长期行为、大小写不敏感文件系统的 branch collision 未覆盖。
- `[U]` 旧 `PluginBoot` 是否有一对一命名 replacement 未确认；current `PluginInternal.boot` path 已由源码证实。
- `[I]` repository `reset --hard` 不清理 untracked files；`repo@branch` 字符串形状存在理论 collision。
- `[I]` Anthropic `cacheControl` 只证明 transform 跳过手工 breakpoints，不证明真实服务 cache hit。
- `[I]` Mistral patch/mock-fetch tests 证明序列化与 metadata round-trip，不等于真实 Mistral service 验收。

## 6. 完成门槛

- 所有 188 个 verified node frontmatter `updated` 必须精确为 `7534d23551`。
- `index.json.updated` 与全部 node entries 必须同为 `7534d23551`。
- `llms.txt` 必须登记 188 nodes 与两个新增节点。
- `tools/reconcile.mjs`、`tools/lint.mjs` 必须全绿且 reconcile 再跑幂等。
- 所有 `[E:path:line]` 指向 target checkout 的存在且非空/非注释/非纯括号行。
- submodule HEAD 必须精确为 target，submodule工作树 clean。
- stage 只允许 `docs/llm-wiki/opencode/**` 与根仓 `opencode` gitlink。
