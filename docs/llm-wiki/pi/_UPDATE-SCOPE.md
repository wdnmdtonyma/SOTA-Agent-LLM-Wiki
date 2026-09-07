# UPDATE SCOPE — Pi Wiki（853a80d26c → 9767ba275f）

> 完成日期：2026-09-07
>
> **base**（上一轮 verified / 父仓旧 gitlink）：`853a80d26c90a14c1886f0ebb8ffaae133ca2185`（v0.84.3 / v0.84.4 周期末）
>
> **target**（官方 `earendil-works/pi` `origin/main`）：`9767ba275f3e9a5ee0f5c5342249b629ab1b2282`（产品版本 **0.85.1**，含一小段 Unreleased）
>
> 最终 submodule checkout：detached `9767ba275f`
>
> 方法约束仍以 `RUN.md` 和 `conventions.md` 为准。本轮执行：影响分级 → 8 个并行 filler → lead SHA bump + 证据行号重落 → 全量 L2 证伪 → L3 修确认过的 error → `llms.txt` / README / index 登记 → reconcile ×2 → lint。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/earendil-works/pi`，默认分支 `main`，base 是 target 的祖先。

```text
463 commits
757 files changed
98743 insertions(+)
26740 deletions(-)
```

复现：

```bash
git -C pi rev-list --count 853a80d26c90a14c1886f0ebb8ffaae133ca2185..9767ba275f3e9a5ee0f5c5342249b629ab1b2282
git -C pi diff --shortstat 853a80d26c90a14c1886f0ebb8ffaae133ca2185..9767ba275f3e9a5ee0f5c5342249b629ab1b2282
```

中间 release：`v0.85.0` → `v0.85.1`。最新 commit：`fix(coding-agent): select Radius models after catalog discovery`（2026-09-06）。

## 2. 198 个基线节点的影响分级

分级把基线 `index.json` 的 `source[]` 与 target diff 交叉（见 `_staging/impact-9767ba275f.json`）：

| 分级 | 数量 | 处理 |
|---|---:|---|
| A-BROKEN | 20 | source 删除/移动。session / remote / AI binding / harness 面整页改写 |
| B-HEAVY | 38 | source churn 大；surface / agent / TUI 刷新 |
| C-DRIFT | 101 | source 有改动；lead 机械 SHA bump + `[E:]` 重落；已知假话在 rewrite/catalog 批次清掉 |
| D-CLEAN | 39 | 只 bump SHA |

最大机械断裂：

- 新包 `@earendil-works/chord`；根 build 顺序变为 **chord → tui → telemetry → ai → agent → sqlite-node → protocol → client → server → coding-agent**
- `pi-client` 公开面改为 Chord 风格 `Client` + `createClientServiceTransport`；`PiClient` / `PiSessionHandle` / `session-handle.ts` / `state.ts` 已删除
- `packages/coding-agent/src/client` 只 `export * from "@earendil-works/pi-client"`；`RemoteSession` 已删，且 `./client` 是 source-only
- Cloudflare binding：`createGatewayBindingFetch` → `createAiBindingFetch`（文件 `cloudflare-ai-binding.ts`）；节点 id 保留
- 内置 `read`/`bash`/`powershell`/`edit`/`write` 默认 `constrainedSampling: { type: "json_schema", strict: "prefer" }`，不再要 `PI_EXPERIMENTAL`
- `InMemorySessionRepo` → `MemorySessionRepo`；`jsonl.ts` → `jsonl/index.ts`；`state.ts` 已删
- 会话搜索实现抽空：只剩 `SessionSearchService` 接口
- protocol：`schemas.ts` → `protocol.ts`，`PROTOCOL_VERSION=8`
- server：`sessions.ts` / `snapshots.ts` / `protocol.ts` → `session-router.ts` + `server.ts`
- `create-harness.ts` 已删除；同名函数只活在 experimental `session-worker.ts`

## 3. Inventory 变化

### 退役节点（保留 id）

| 节点 | 现语义 |
|---|---|
| `surface.sdk.remote-session` | coding-agent `RemoteSession` 已删除；页改为退役映射，指向 Chord `Client` |
| `subsys.agent-core.session-search` | scanning / FTS 实现已删除；页改为 `SessionSearchService` 接口 + 退役实现 |

### 新增节点（2）

| 节点 | 判定 |
|---|---|
| `subsys.chord.runtime` | facets / services / host；chord 不依赖其它 Pi workspace 包 |
| `subsys.chord.delta` | replicated state、`track`/`apply`、`Op`/`WireOp` |

最终节点数：**200**（198 − 0 + 2；T0 12 / T1 35 / T2 120 / T3 33）。源码包 9 → **10** + 5 extension-example。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| Chord runtime | 独立 application-composition 包。`subsys.chord.runtime` / `subsys.chord.delta`；spine overview / layered-architecture |
| Client 公开面 | `Client` + `createClientServiceTransport`，不是 `PiClient`。`subsys.client.remote-session-client` / `session-leases`；`surface.sdk.remote-session` 退役 |
| Server 路由 | `SessionRouter` + Chord 服务载荷。`subsys.server.live-sessions` / `protocol-adapters` / `session-server` |
| Protocol v8 | `packages/protocol/src/protocol.ts`。`subsys.protocol.wire-protocol` |
| 约束采样默认开 | 五个 mutation/read 内置工具默认 json_schema strict prefer。`subsys.ai.constrained-sampling`、各 tool 页、`ref.tools-catalog` |
| Cloudflare AI binding | passthrough `env.AI.fetch()`。`subsys.ai.cloudflare-gateway-binding` |
| Session 符号 | `MemorySessionRepo` / `JsonlSessionRepo` / `values.ts`。`spine.session-state-model` 与 session 四面 |
| 搜索抽空 | 无 scanning / sqlite FTS。`subsys.agent-core.session-search`、`subsys.session-backends.sqlite-node` |
| Experimental CLI | 只剩 `server` / `client`，source-only，走 `pi-test.sh`。`subsys.coding-agent.experimental-cli` |
| TUI | `PI_TUI_DEBUG_REDRAW`；`native-platform.ts`；fullscreen jump-to-end / Alt-wheel。TUI 节点 + env catalog |

### Catalog 重数（以源码为准）

tools **8** · providers **40** · model buckets **39** · slash **23** · RPC **33** · extension events **36** · config keys **84** · env **103** · CLI **63** · keybindings **90** · interactive components **43** · TUI components **16** · image models **52** · session event types **23**。

`createCodingToolDefinitions` / `createReadOnlyToolDefinitions` **仍不含** powershell。Radius 登录后等 discovery，默认 `balanced`。Grok Build 0.1 已从 xAI 内置 catalog 排除。

## 5. 证伪策略

填充期曾与当天 deepseek-harness wiki 对齐（8 个 filler，无逐节点 L2）。随后按 `RUN.md` 补了独立 L2：

- 11 个 verifier 覆盖全部 200 节点（A/B/C/D + catalog）。
- lead 对照 `9767ba275f` 源码确认 error，再派 4 个 L3 fixer。
- 报告：`_research/update-853a80d26c-9767ba275f-l2.md`。

L3 已修的跨页假话包括：env 101→103、keybindings 89→90、image 50→52、session-events 缺 6 个 type、write 成功文案、skills 门控、Google `off`→`high`、`setupCli` 入口。残余主要是 rebase 把 `[E:]` 落到邻近符号/注释的 nit，句子本身仍对。

## 6. 不确定项

`reference/uncertainty.md` 由 reconcile 从 `_staging/uncertainty-*.md` 重生。本轮 filler 写下的 `uncertainty-update-9767ba275f-*` 已并进去。

## 7. 元数据与引用收敛

- 全部 verified node frontmatter：`updated: 9767ba275f`
- `index.json.updated` 与所有 `index.nodes[].updated`：`9767ba275f`
- `README.md`、`llms.txt`、`index.json` 的节点计数一致（200）
- `index.json.packages` 与 `conventions.md` `pkg` 白名单含 `chord`
- 临时脚本 `_tmp-impact.mjs` / `_tmp-catalogs.mjs` / `_tmp-sha-bump.mjs` 已删除
- 未安装上游 `node_modules`，不宣称 runtime tests 通过

## 8. 最终验证

```bash
git -C pi rev-parse --short=10 HEAD   # 9767ba275f
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/reconcile.mjs   # 第二次：0 节点更新
node docs/llm-wiki/pi/tools/lint.mjs
node docs/llm-wiki/pi/tools/lint.mjs        # 0 error(s), 0 warning(s) · 200 nodes
```

完成条件：200 verified / 0 planned；`lint` 0/0；二次 reconcile 幂等。`index.groups` 已同步 env **103** / keybindings **90** / TUI components **16**。父仓 `pi` gitlink 工作树指向 `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`（尚未与 wiki 一起提交）。
