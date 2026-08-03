# UPDATE SCOPE — Codex Wiki 完成记录（61a44880a8 → 7750465934）

> 完成日期：2026-08-03
> Wiki verified base / 父仓旧 gitlink：`61a44880a85d2fd0d8770908dea5733495e571c8`
> 官方 `openai/codex origin/main` target：`7750465934d97dd3cbcb3b1655d2f622744010d3`
> 最终 submodule checkout：detached `7750465934d97dd3cbcb3b1655d2f622744010d3`

本文件记录本轮已执行的 base→target 影响分析、新增/退役判定、L2 独立证伪与最终验证。方法约束仍以 `RUN.md` 和 `conventions.md` 为准。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/openai/codex`，官方默认分支为 `main`，且 base 是 target 的祖先。

提交前再次执行 `git fetch origin main`；`refs/remotes/origin/main` 仍为 `7750465934d97dd3cbcb3b1655d2f622744010d3`，相对冻结 target 的尾差为 0 commit。

```text
217 commits
1123 files changed
65644 insertions(+)
14195 deletions(-)
174 added / 7 deleted / 905 modified / 37 renamed
```

复现：

```bash
git -C codex rev-list --count 61a44880a85d2fd0d8770908dea5733495e571c8..7750465934d97dd3cbcb3b1655d2f622744010d3
git -C codex diff --shortstat 61a44880a85d2fd0d8770908dea5733495e571c8..7750465934d97dd3cbcb3b1655d2f622744010d3
git -C codex diff --name-status 61a44880a85d2fd0d8770908dea5733495e571c8..7750465934d97dd3cbcb3b1655d2f622744010d3
```

## 2. 172 个基线节点的影响分级

分级把基线 `index.json` 的 source 文件/目录与 target diff 交叉，再人工复核共享 source 的 hunk 是否命中节点语义：

| 分级 | 数量 | 处理 |
|---|---:|---|
| A-BROKEN | 5 | source 删除/移动，必须重定位 |
| B-HEAVY | 0 | 无独立的 non-broken source churn ≥ 2,000 节点 |
| C-DRIFT | 138 | 直接 source 或 source 目录有改动，逐 claim 核对 |
| D-CLEAN | 29 | 已登记 source 未改；仍核对路径/证据并 bump SHA |

5 个 A-BROKEN 都是 source 退役，不是 Wiki 概念退役：

1. `tool.code-mode-exec` / `tool.code-mode-wait`：`codex-rs/code-mode/src/service.rs` 移到 `codex-rs/code-mode-runtime/src/service.rs`。
2. `subsys.core.instruction-assembly`：删除 `core/src/context/available_skills_instructions.rs`，catalog fragment 下沉到 `ext/skills/src/fragments.rs` / `catalog_prompt.rs`。
3. `subsys.config-auth.skills`：删除 `core-skills/src/render.rs`，渲染 ownership 转到 `ext/skills/src/render.rs`及配套 extension files。
4. `surface.cli.external-agent-import`：删除 `sessions/records.rs`，拆成 `records_common.rs` / `records_cla.rs` / `records_cur.rs`，并新增 `append.rs`。

D-CLEAN 只允许省略语义重写，不允许跳过 target SHA、source existence、证据行与横切架构复核。

## 3. Inventory 变化

### 退役节点

无。

本轮有概念/字段退役，但它们不是独立 Wiki 节点：

- thread `isPinned` / `is_pinned` 与 metadata/list filter：被持久化 `ThreadSection` + 内建 Pinned section 取代。
- `SessionTaskContext`：`SessionTask::run` / `abort` 改为直接接收 `Arc<Session>`。
- hidden `codex exec --full-auto` compatibility flag：完全删除；新增 `--approve-for-me`。
- Code Mode 在 core/app-server 内嵌 V8 fallback：退役，现在由 standalone process-owned host 执行。
- 旧 tool assembly 函数 `build_tool_specs_and_registry` / `add_tool_sources` / `prepend_code_mode_executors`：被 registry-first finalization 流程取代。

### 新增节点

| 节点 | 判定 |
|---|---|
| `tool.wait-for-environment` | `wait_for_environment` 在 base 已存在，是旧 Wiki 工具 inventory 漏项；本轮补齐 schema、`DeferredExecutor` 门控与 host config fallback。 |
| `subsys.core.turn-metadata` | `TurnMetadataState`、parent-turn lineage 与 attempted/executed tool metadata 已形成独立 Responses/MCP/analytics seam。 |
| `subsys.core.rollout-budget` | root/subagent tree 共享 rollout units、provider-reported units、fallback accounting 与 exhaustion 语义是独立 runtime。 |
| `subsys.core.token-budget` | model default、用户显式配置优先级、world-state guidance 与 reminder/compaction 语义不同于 rollout accounting。 |
| `subsys.tui.keymap` | 新 `keymap/bindings.rs`、`keymap/chords.rs`、setup capture 已形成独立数据模型和 two-stroke 状态机。 |

最终为 **177 个 verified nodes**：

| Tier | 数量 |
|---|---:|
| T0 | 11 |
| T1 | 70 |
| T2 | 84 |
| T3 | 12 |

其中 tool nodes 37；workspace members 128；App-Server catalog 219（136 client requests + 72 notifications + 11 server requests）；`ConfigToml` 顶层键 96；`Op`/`EventMsg` 仍为 26/80；feature registry 102。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| Tool registry | `build_tool_router` 先写入 core/MCP/extension/dynamic runtime，再 `finalize_tool_router`；`StepContext` 持有 finalized router。更新 tool system/router/anatomy 与各 tool gate。 |
| Apply patch | direct custom tool 与 shell interception 统一进入 `execute_verified_patch`，共用 permission/safety/orchestrator/runtime。 |
| Code Mode | V8/cell/session runtime 移到新 `code-mode-runtime` crate；core 只选 process-owned 或 disabled provider，没有内嵌 fallback。 |
| Multi-agent | 新 plaintext/encrypted message 分流、developer instruction override、ready environment 继承、parent-turn correlation、registry 双索引与 remote-compaction retention。 |
| Thread sections | `isPinned` 退役；新 section CRUD/move/list filter/manual ordering，依赖 SQLite，内建 Pinned section 不可改名/删除。 |
| MCP 2026 | `mcp_2026_07_28` 仍 default-off/under-development；stdio 还要求 `CODEX_MCP_PROTOCOL_VERSION`。新 discovery/pagination、step binding、environment OAuth/file path 隔离与 strict elicitation review。 |
| Plugins / skills | portable Agent Plugins v1、remote `plugin/search`、bundle limits/eligibility metadata；skills rendering 下沉 `ext/skills`，host/executor 共享 context-window budget。 |
| App-Server | +6 client methods：thread section 5 个 + experimental `plugin/search`；notification/server-request 数不变，多个 payload 增字段。 |
| TUI | two-stroke key chord、`/fork <name>`、state-DB-first picker、non-blocking RUI countdown、side cleanup、Unicode/hyperlink width 与 screen-size cache。TUI 尚未提供 section 管理 UI。 |
| Exec/network | canonical `PermissionProfile`、remote Guardian network callback、allow-amendment fail-closed、normalized violation tracing、exec-server dispatcher/lifetime/version-skew，以及 Windows interrupt/PathUri 边界。 |
| HTTP/realtime/budgets | shared route-aware HTTP 扩展到 Ollama/file upload/MCP OAuth；Realtime 增 request-level transition instructions/ack；rollout/token budgets 拆成独立模型。 |

## 5. L2 独立证伪

源码影响先由多个独立 agent 按 core/tools、thread/state、App-Server/protocol、MCP/plugins、TUI、exec/network、providers/SDK 与 inventory 分面重读；节点落盘后再交叉分配给没有撰写该批次的 agent 逐 claim 证伪。下列反例已先修 Wiki：

- 纠正“tool router 仍用 `add_tool_sources`”：目标是 registry-first + single finalize。
- 纠正“Code Mode 可回退 core 内嵌 V8”：目标只有 process-owned 或 disabled provider。
- 纠正“`request_user_input.autoResolutionMs` 是模型参数”：tool schema 已只剩 `questions`，blocking 由 mode 决定。
- 纠正“writer lock 只用于 Paginated history”：target 对所有 history mode 强制单写者。
- 纠正“`isPinned` 仍在 wire/list/metadata”：target 是 section 模型。
- 纠正“MCP call 始终使用 sampling 时同一 client”：call-time readiness 后会 capture latest binding，resource 还可 fallback live connection。
- 纠正“MCP 2026 打开 feature 即全面现代化”：默认关闭，stdio 还有 env marker。
- 纠正“TUI 已支持 section 管理”：TUI 只消费部分 ordering 信息，没有 CRUD/move UI。
- 纠正“external-agent detect 已返回 connector candidates”：detector 与 protocol 存在，但 app-server `detect_response` 当前固定返回空 connectors。
- 纠正“`plugin/search.cwds` 已过滤 workspace”：target processor 当前显式忽略该参数。
- 纠正“`justification` 可不配 sandbox permission”：shell/exec 现在要求显式 `sandbox_permissions`。
- 纠正“network allow amendment 写入失败仍放行”：target 是 fail closed。

纯 SHA/行号移动的 D-CLEAN 节点采用 base/target blob diff 映射后抽样；A-BROKEN、tool router、Code Mode、apply patch、thread sections、MCP、plugins/skills、App-Server、TUI keymap、exec-network、budgets 不降级为抽样。

## 6. 不确定项与跳过判定

本轮不把明确代码边界误记成 `[U]`：MCP 2026 门控、TUI section UI 缺失、connector detect 未接线、`plugin/search.cwds` 忽略都有 target 直证。

继续保留的主要 `[U]` 包括：remote Code Mode 的部署层认证/TLS 保证、multi-segment history lineage 的未来 incremental replay、exec-network `Ask` 最终 UI、system proxy/PAC 长期契约、Windows IPv6 process attribution、dynamic skill selector 的稳定用户协议、remote plugin disk cache 长期格式。

未为 MCP 2026、plugin search、thread sections、remote filesystem 另建节点：它们分别由既有 MCP catalog/client、plugin RPC/plugins、thread-store/thread RPC、exec-server/file-system 节点自包含承载。

## 7. 元数据与引用收敛

- 所有 177 个 retained/new verified node frontmatter：`updated: 7750465934`。
- `index.json.updated` 与所有 `index.nodes[].updated`：`7750465934`。
- `README.md`、`llms.txt`、`index.json` 的节点/tool/crate/RPC/feature 计数一致。
- base 中 20,977 个证据引用先通过 blob diff 对“代码未变、只移行”的引用保守重定位；落入变更 hunk 的 claim 重读 target source，不用“最近非空行”规避 lint。
- 5 个失效 source 均已重定位；submodule 源码工作树 clean。

## 8. 最终验证

```bash
git -C codex rev-parse HEAD
git -C codex status --short
node docs/llm-wiki/codex/tools/reconcile.mjs
node docs/llm-wiki/codex/tools/reconcile.mjs
node docs/llm-wiki/codex/tools/lint.mjs
jq -r '.updated, (.nodes|length), ([.nodes[].updated]|unique|join(",")), ([.nodes[]|select(.status=="planned")]|length)' docs/llm-wiki/codex/index.json
rg -n '^updated:' docs/llm-wiki/codex/{spine,surface,subsystems,reference} --glob '*.md'
git diff --check
git submodule status -- codex opencode pi
```

验收结果：

- submodule HEAD 精确等于 target full SHA，子模块源码工作树 clean。
- reconcile 首轮登记 5 个新节点，第二轮为幂等无额外 diff。
- lint：0 error。
- 177 verified / 0 planned，节点、index 顶层与子模块 SHA 一致。
- `opencode` / `pi` 子模块未初始化、未修改。
