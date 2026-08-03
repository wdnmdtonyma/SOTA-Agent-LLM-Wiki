# UPDATE SCOPE — Pi Wiki 增量更新（cee5ff7520 → a8ee03b815）

> 本文件记录 2026-08-03 完成的 Pi-only 增量更新。
> **旧父仓 gitlink / Wiki 基线**：`cee5ff7520d8828bed9955ef00419e995d1f91e0`
> **目标（官方 `origin/main` remote HEAD）**：`a8ee03b8156c2232d67ad2cdb79683b4a5c8fdbe`
> **跨度**：254 commits · 406 files changed · +36,495 / -3,895 · 2026-07-25 → 2026-08-03

复现：

```bash
git -C pi fetch origin main
git -C pi symbolic-ref refs/remotes/origin/HEAD
git -C pi rev-list --count cee5ff7520d8828bed9955ef00419e995d1f91e0..a8ee03b8156c2232d67ad2cdb79683b4a5c8fdbe
git -C pi diff --shortstat cee5ff7520d8828bed9955ef00419e995d1f91e0..a8ee03b8156c2232d67ad2cdb79683b4a5c8fdbe
```

## 1. 既有节点影响分类

以更新前 186 个节点为总体，按 source 删除/移动与 diff churn 分类：

| 分类 | 节点数 | 判定 |
|---|---:|---|
| A-BROKEN | 14 | 至少一个 source 删除或移动；均已重映射到目标树有效路径 |
| B-HEAVY | 0 | 本轮没有仅凭 churn 判为独立重写的节点 |
| C-DRIFT | 117 | source 仍存在但内容/行号变化，需重锚和语义复核 |
| D-CLEAN | 55 | source content 未变；仍重新核验目标 SHA |
| 合计 | 186 | 不含本轮新增节点 |

132 个既有节点通过 `tools/rebase-evidence.mjs --safe-only` 重定位可确定的 exact anchors；自动迁移后仍对新增/删除 API、catalog、events 与所有 weak anchors 做人工源码复核。更新后的 202 个节点统一 `updated: a8ee03b815`。

## 2. 结构新增与退役

新增 16 个节点，退役 0 个：

| 包 | 新增节点 |
|---|---|
| agent | `subsys.agent-core.agent-harness-lifecycle`、`subsys.agent-core.session-search` |
| protocol | `subsys.protocol.cbor-framing`、`subsys.protocol.wire-protocol` |
| client | `subsys.client.remote-session-client`、`subsys.client.session-leases`、`subsys.client.unix-transport` |
| coding-agent | `surface.sdk.remote-session`、`subsys.coding-agent.experimental-cli` |
| tui | `subsys.tui.layout`、`subsys.tui.alternate-screen` |
| server | `subsys.server.session-server`、`subsys.server.live-sessions`、`subsys.server.protocol-adapters`、`subsys.server.unix-transport` |
| evals | `subsys.evals.comparative-harness` |

保留既有八个 `server` 节点：上游把旧实现移动到 `src/legacy/`，根 export 与 `server` bin 继续暴露 legacy API；新 composable server 是 additive surface，不构成旧节点退役。

更新后节点总数 202：T0 12、T1 34、T2 121、T3 35；全部 verified，planned 为 0。

## 3. 真实增量影响

- **Agent/session/compaction**：`SessionStorage` 改为 `readHead/readEntry/readEntries/appendEntry/findEntriesOnBranch/readPathToRootOrCompaction`；新增 repository search、harness phase/retry lifecycle、retained tail 与 usage-bearing compaction/tool result。
- **AI/provider**：stream partial 从 `pending` 开始并保留 `rawStopReason`；新增 request-scoped fetch 的 provider-specific支持边界、Google initial-request retry、OAuth 五分钟/min-validity refresh window、nullable union validation 与 OpenAI compat fields。
- **Catalog**：38 runtime providers、37 static model buckets、10 chat/text wire keys；官方 0.83.0 artifact 复核为 1,153 models，较 0.82.1 `+51/-7`。
- **Coding-agent**：active CLI 62、config keys 76、env vars 93、ExtensionAPI contribution/action entries 26、extension events 33、RPC methods 32；新增 public `RemoteSession` 与尚未接入发布入口的 experimental client/server CLI。
- **TUI**：`TUI` 从 concrete class 拆为 interface + main/alternate screen；新增 HStack/VStack/ScrollView、viewport layout、37 TUI actions、79 total default keybindings、Kitty placement/crop/cache 与 fullscreen image boundary。
- **Remote stack**：新增 TypeBox DTO + CBOR/framing protocol、transport-neutral client、Unix transport、composable server、live-session ownership 与 protocol adapters；旧 legacy server 同时保留。
- **Storage/evals**：SQLite branch cache、bounded canonical traversal、FTS/repository lifecycle得到更新；evals 新增 baseline/candidate pairing、artifact persistence 与 paired comparison report。

## 4. 模型目录制品边界

目标 tree 不保存最终生成 model JSON，因此逐实例目录保持 `[I]`。本轮独立核验官方 `@earendil-works/pi-ai@0.83.0` artifact：

- registry `gitHead=845d6ff1f6643aba440341cce877ce1c43ebbc39`，且为目标 commit 祖先；
- tarball SHA-256：`f983c28a21209305ed9c274977e29130fa4d8848df6cdf37e9094d95cc7bc6d4`；
- manifest schema 3、structure hash `5d82f5b1946bdf6d01733aa2a4e4410849c6d44a2ad3038171078c17aed367ce`、37 files、0 hash mismatch；
- flatten 后 1,153 models；0.82.1 → 0.83.0 为 +51 / -7；
- release → target generator 只把两个 Fireworks Kimi K3 rows 调整为 `openai-completions` wire，因此 membership 总数不变。

复核记录见 `_research/model-catalog-v0.83.0.md`。

## 5. 独立 L2 证伪

按 `RUN.md` 分面使用独立 verifier，初次均以反例为目标而非确认结论。发现并修复的主要问题：

- agent：旧 `getLeafId/getPathToRootOrCompaction` contract、19→22 harness events、retry/usage/retainedTail 漏项；
- AI：Responses provisional/terminal event 混淆、OAuth refresh 旧语义、Azure `pending`、auth resolver 虚构 model 参数；
- coding-agent：遗漏 `registerEntryRenderer`、Kimi OAuth env、provider overload/refreshModels 与 tool-result usage；
- TUI：错误实例化 interface `TUI`、31→37 actions、renderImage columns、fallback/path link、placement/crop/fullscreen image 边界；
- remote server：revision 单调性过度承诺、request-id 唯一性、malformed decoder close、strict-object 与 enumerable-symbol 限定；
- storage/evals：bounded query 不修 cache 的例外、metadata provenance、文件 mode 只在新建时请求。

完整矩阵与精确验证记录见 `_research/update-cee5ff7520-a8ee03b815-l2.md`。

## 6. 验证与残余风险

收尾要求：

```bash
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/lint.mjs
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/lint.mjs
git diff --check -- docs/llm-wiki/pi pi
```

并断言：

- `index.json.updated`、202 个 index node 与所有 node frontmatter 都是 `a8ee03b815`；
- index/file tree/`llms.txt` 为同一 202-node 集，0 planned；
- 所有 `[E:path:line]` 路径、范围和代码行有效，lint 0 error / 0 warning；
- root gitlink、submodule HEAD 都是目标 full SHA，Pi submodule clean；
- root 只 stage `docs/llm-wiki/pi/**` 与 `pi`，不改其他产品 Wiki/submodule。

残余风险：Pi submodule 未安装 `node_modules`，独立 verifier 尝试运行定向 upstream tests 时因依赖缺失（如 Vitest / `get-east-asian-width`）未进入用例；本轮验证因此是源码、测试实现与文档证据的静态交叉核验，加 Wiki 自身的 reconcile/lint/idempotence，而不是 Pi runtime test pass。
