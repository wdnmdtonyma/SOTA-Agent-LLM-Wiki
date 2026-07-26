# UPDATE SCOPE — pi Wiki 增量更新令（3da591ab → cee5ff7520）

> 本文件记录 2026-07-26 完成的影响分析与更新决策。
> **基线（更新前 Wiki verified SHA）**：`3da591ab74ab9ab407e72ed882600b2c851fae21`
> **目标（官方 `earendil-works/pi` `origin/main`）**：`cee5ff7520d8828bed9955ef00419e995d1f91e0`
> **跨度**：124 commits · 390 files changed · +17,263 / -7,353 · 2026-07-17 → 2026-07-26

复现：

```bash
git -C pi diff --shortstat 3da591ab74ab9ab407e72ed882600b2c851fae21..cee5ff7520d8828bed9955ef00419e995d1f91e0
git -C pi rev-list --count 3da591ab74ab9ab407e72ed882600b2c851fae21..cee5ff7520d8828bed9955ef00419e995d1f91e0
```

## 1. 基线节点影响重算

以更新前 `index.json` 的 180 个节点为总体，将每个 `source` 与目标树存在性、`git diff --numstat` churn 交叉：

| 分级 | 节点数 | 判定 |
|---|---:|---|
| A-BROKEN | 12 | 至少一个 source 在目标树消失；均可定位到明确 rename |
| B-HEAVY | 1 | `ref.ai.model-catalog`，模型目录生成/分片体系重写，粗 churn 5,012 |
| C-DRIFT | 121 | source 存在但内容或行号变化 |
| D-CLEAN | 46 | source 内容不变；抽样复核后统一刷新 verified SHA |
| 合计 | 180 | 不含本轮新增的 6 个节点 |

目标最后一个提交 `cee5ff7520` 仅从 `packages/coding-agent/README.md` 删除一个 OpenClaw 外链（1+/1-）。该 README 不在更新前或更新后任何节点的 `source`/`[E:]` 中，因此不会改变上述 180 节点分级，也无需改写节点语义；它只推进本轮 verified SHA 与根仓 submodule gitlink。

12 个 A-BROKEN：

- `subsys.agent-core.session-tree`：UUID helper 从 `packages/agent/src/harness/session/uuid.ts` 迁入 `packages/ai/src/utils/uuid.ts`。
- `subsys.orchestrator.{supervisor,rpc-spawner,ipc-transport,message-protocol,request-handler,storage,radius,config}`：迁移为 `subsys.server.*`。
- `ref.orchestrator.{ipc-messages,instance-status}`：迁移为 `ref.server.*`。
- `ref.package-index`：全部 `packages/orchestrator/**` source 迁为 `packages/server/**`。

结构迁移不是兼容别名：目标树采用 package `@earendil-works/pi-server`、bin `server`、`ServerSupervisor`、`ServerRequest/ServerResponse`、`getServerDir()`、`PI_SERVER_DIR`、`PI_RADIUS_SERVER_URL`、`.pi/server/server.sock`。既有 Wiki 节点、related id、路径与 uncertainty staging 文件随之改名，不新建重复的 server 节点。

## 2. 高价值新增面的判定

| 候选 | 判定 | 落点 |
|---|---|---|
| `packages/storage/sqlite-node/**` | **建节点** | `subsys.storage.sqlite-node`；公开、可发布的 Node `node:sqlite` session backend |
| `packages/ai/src/api/constrained-sampling.ts` | **建节点** | `subsys.ai.constrained-sampling`；统一 grammar/JSON schema 能力与 provider 降级边界 |
| `packages/agent/src/harness/tools/**` | **建节点** | `subsys.agent-core.execution-tools`；可复用 harness 的 bash/read/edit/write factories，与 coding-agent 产品工具分层 |
| provider retry / summarization retry | **建节点** | `subsys.ai.provider-retry`；wire retry 与 harness retry policy/callbacks |
| tool / compaction / branch-summary usage | **建节点** | `subsys.coding-agent.usage-accounting`；usage 从工具和摘要到 session total 的链路 |
| `packages/evals/**` | **建节点** | `subsys.evals.pi-harness`；private behavioral-eval consumer，不误写成发布 API |
| Kimi/OpenRouter OAuth | **并入既有** | `subsys.ai.oauth-flow`、`surface.providers.auth`、provider catalog；不复制 OAuth 总体节点 |
| Qwen provider families | **并入既有** | provider catalog / auth / model discovery |
| `packages/ai/src/model-catalog.ts` 与分片生成器 | **并入既有** | `ref.ai.model-catalog`、`subsys.ai.model-discovery`、`subsys.ai.model-catalog-publication` |
| 外部编辑器 helper / renderer `outputPad` | **并入既有** | interactive、interactive orchestration、components、extension contribution points |
| RPC thinking-level query、bash/session events | **并入既有** | RPC surface/catalog、JSON events、bash 与 env catalog |

更新后节点数为 186，全部 `verified`。

## 3. 模型目录制品限制

目标 Git tree 不保存最终 model-data JSON；`packages/ai/src/model-catalog.ts` 只装配生成分片，逐模型事实不能只靠目标 tree 完整枚举。本轮使用官方 npm 制品 `@earendil-works/pi-ai@0.82.1`：

- tarball SHA-256：`2f9df9522808b621cd3449876537f03d8a8df8b8d7ec2d5b18c6a910aa85b490`
- manifest schema：3；structure hash：`1a3c7cf59ada71c94abe4540976960524ee933034491c75d6418e2abc1b42535`
- 37 providers、1,109 models
- source map 内 `model-catalog.ts` / `models.generated.ts` 的 `sourcesContent` 与目标 SHA 源码逐字节相同

npm manifest 没有 `gitHead`，所以“该制品必然由目标 commit 构建”不能提升为 explicit；逐模型行统一标 `[I]`，完整限制与计数记录于 `_research/model-catalog-v0.82.1.md` 和 uncertainty。

## 4. 语义更新重点

- agent harness：新增可复用 execution tools、tool context、usage-bearing tool result、summary retry 与 usage。
- AI：constrained sampling、provider retry、Kimi/OpenRouter OAuth、Qwen providers、catalog 分片/校验/发布链。
- coding-agent：RPC `get_available_thinking_levels`、`modelRuntime` state、`agent_settled` / `entry_appended` / bash update / retry events、子进程 session env、共享 external editor、renderer `outputPad`。
- storage/evals：SQLite adapter 与 private eval harness 纳入分层图和 package catalog。
- server：完成 workspace、API、CLI、env、socket、节点 id 和引用的全链路 rename。

## 5. 引用迁移

旧 Wiki 共约 31k 条 `[E:]`。本轮用 `tools/rebase-evidence.mjs` 以基线/目标源码内容和上下文重定位旧锚点：

- 125 个节点文件发生锚点更新；
- 13,384 个引用文本被改写；
- 30,746 次 exact 映射、541 次 contextual 映射、0 unresolved；
- weak-anchor 扫描又筛出 54 个落在空行、注释或纯括号行的候选；这些锚点逐项重锚到对应语义代码，并重新接受 lint/L2 复核，没有保留“就近代码行即语义等价”的自动修复器。

保留的 `rebase-evidence.mjs` 默认只做 dry-run；必须先审阅 `LOW_CONFIDENCE` 候选，再显式传 `--write`。机械迁移只负责候选定位；新增节点、rename、模型目录、SQLite、harness tools、OAuth/RPC/usage 等语义变化另走 L2。

## 6. L2 证伪矩阵

| 面 | 独立反证 |
|---|---|
| server rename | 对目标 tree grep 旧 package/path/symbol/env；检查新 package/bin/class/config/socket；旧名仅允许 changelog 历史或 fixture 文本 |
| harness tools | 从 `harness/tools/index.ts` 与 agent entrypoint 枚举 factory；检查 `AgentHarnessOptions.tools` 与 context binding；确认 coding-agent 工具仍是产品装配 |
| SQLite | 解析 workspace/package metadata、exports、Node engine、migrations 与 repo/storage interface；反查 coding-agent 默认依赖，确认它是可选 backend |
| constrained sampling | 对 provider API 实现逐项核对支持/拒绝策略和 coding-agent wrapper 透传 |
| provider retry | 核对 retryable status/error、budget/backoff/abort、callbacks，以及 compaction/branch summary 的调用边界 |
| model catalog | 对官方 0.82.1 制品重新统计 provider/model 数，校验 structure hash 与 source-map `sourcesContent` |
| OAuth | 枚举 built-in OAuth providers，确认 Kimi/OpenRouter flow、credential shape 和文档列表差异 |
| usage | 从 tool result、extension patch、compaction/branch result、session entry、storage total 做端到端字段追踪 |
| RPC/events | 从 `RpcCommand` union 与 dispatch 独立计数 32 个命令；验证新增 response/state/event payload |
| eval harness | 检查 private package、真实 session 构造、凭据要求，以及不注入 tools/resources 的边界 |

L2 命令与结果落在 `_research/update-3da591ab-cee5ff7520-l2.md`。任何源码无法闭合的断言降级为 `[I]` / `[U]`，不以 lint 通过代替语义证据。

## 7. 保留的不确定项

- `[I]`：官方 0.82.1 npm 制品与目标源码 source map 相同，但缺少 `gitHead`，因此 1,109 个模型实例的 commit 归属是强推断。
- `[U]`：`packages/coding-agent/docs/providers.md` 的 subscription bullet 尚未列 Kimi Coding，而 OAuth registry/source 已包含它；以代码为运行时 ground truth，记录文档漂移。
- server 跨进程锁、异常 JSON CLI 表现、Bun virtual path 未来兼容等既有实现外推继续保留在 uncertainty，不伪装成已验证行为。

## 8. 完成门槛

```bash
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/lint.mjs
git diff --check -- docs/llm-wiki/pi pi
git -C pi rev-parse HEAD
git -C pi status --short
```

此外必须断言：

- 所有 verified node frontmatter `updated`、`index.json.updated` 与每个 index node `updated` 均为 `cee5ff7520`；
- `index.json`、`llms.txt`、文件树是 186 节点一致集；
- 所有 frontmatter/source/`[E:]` 路径存在，行号在范围内且不落空行/注释；
- 旧基线 `3da591ab` 只出现在本更新范围/研究历史中；
- 根仓只 stage `docs/llm-wiki/pi/**` 与 `pi` gitlink。
