# Pi wiki 增量刷新令（9767ba275f → bbb61e34aa）

给 filler 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径、架构事实和文件纪律。

本轮 **不跑逐节点独立 L2**（lead 填完后再统一证伪）。filler 自己核 `[E:]`（每页至少抽 3 条 `read_file` 对行），写完将 `status: verified`。过宽结论宁可降 `[I]/[U]`。

## 冻结点

- **base**（上一轮 verified）: `9767ba275f`（`v0.85.1` 周期末）
- **target**（必须对照的源码 HEAD）: `bbb61e34aa`（全 SHA `bbb61e34aaf231639fdaaad1adbd757947034eac`；官方 `origin/main`；产品版本仍 **0.85.1**，本轮全在 `[Unreleased]`）
- 源码根: `pi/`（相对本 wiki `../../../pi/`）
- 节点 `updated:` 一律写成 `bbb61e34aa`
- 未安装上游 `node_modules`，不要宣称 runtime tests 通过。
- **不要**把 `packages/agent/docs/pico*/**`、`packages/agent/docs/work-packages/**` 当 shipped 源。那是内部设计手稿，最多 `[I]`，**不要新建 pico 节点**。
- **不要**新建 wiki 节点。JSONL fork / compaction overrides / OpenCode headers / docs evals 全部写进现有页。

## 路径增补（frontmatter `source:` 与 `[E:]`）

本轮 **没有** 删除/改名会让 `source:` 失效的 shipped 文件（`git diff --name-status` 无 `D`）。必须**新增**的 source：

| 节点 | 必须加入 `source:` |
|---|---|
| `subsys.agent-core.jsonl-storage` | `packages/agent/src/harness/session/jsonl/fork.ts`、`jsonl/io.ts`、`packages/agent/src/harness/session/fork-policy.ts`、`packages/agent/src/harness/types.ts` |
| `subsys.agent-core.session-storage` | `fork-policy.ts`、`fork.ts`（`createForkSnapshot` 仍导出但 **repo 生产路径不再用**） |
| `subsys.agent-core.memory-storage` | 现有 `memory.ts` / `in-memory-storage-state.ts` 即可；symbols 换成 `MemoryStorage.fork` / `InMemoryStorageState.createFork` |
| `subsys.agent-core.exec-env` | 现有 `nodejs.ts`；补 `TextLineReader` / `openTextLineReader` |
| `ref.ai.provider-catalog` / OpenCode 相关 | `packages/ai/src/providers/opencode-headers.ts` |
| `subsys.evals.pi-harness` | `packages/evals/src/docs.eval.ts` |

禁止把 `[E:]` 指到已删除符号：`captureForkSource`、`createFromForkSnapshot`、`fromSnapshot`、`snapshotEntriesAndValues`、`classifyForkAddress`、`ForkDisposition`、`normalizeLegacyV3Records`、`parseTransaction`（现名 `parseJsonlTransaction`，在 `io.ts`）。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **产品版本仍 `0.85.1`**，wiki target SHA `bbb61e34aa`。changelog 全在 Unreleased。
2. **JSONL fork 重写为两趟流式**：`JsonlSessionRepo.resolveForkInput` → `runJsonlFork`（index + stream）→ `JsonlStorage.open`。三种 `JsonlForkInput`：`open` / `closed` / `legacy-v3`。原子发布走 `publishJsonl`（`jsonl/io.ts`）。
3. **Legacy v3 fork 规则**：**已打开**的 v3 **拒绝** fork（须先 commit 升级到 format 4）；**未打开**的 v3 文件 **可以** fork（`LegacyV3Source.read` + 流式 `writes()`）。
4. **Memory fork** 是 `MemoryStorage.fork` → `InMemoryStorageState.createFork`（直接迭代 maps），不再走 snapshot 数组。与 JSONL **共享** `selectBranchFork` / `projectForkCurrentStateWrite`，**不共享** IO。
5. **`createForkSnapshot` 仍从 `session/index.ts` 导出**，供测试/其它 backend；`JsonlSessionRepo` / `MemorySessionRepo` 生产 fork **不再调用它**。
6. **Fork 复制/排除**：始终复制 `pi.session.name`；排除 `pi.result`、`pi.op.*`、`pi.pending.*`、全部 `usage` writes；lane state 复制但重置 operation/inbox。
7. **`compaction.modelOverrides`**：键是精确 `"provider/modelId"`（区分大小写，不是 glob）。每字段独立回退：override → ordinary `compaction.*` → `reserveTokens=16384` / `keepRecentTokens=20000`。`enabled` **不能** per-model。`getCompactionSettings(model)`。
8. **`retry.maxAgentDelayMs`**：默认 **60000**。`retryDelayMs` 把 agent-level 指数退避 `min(base*2^(attempt-1), cap)`。与 `retry.provider.maxRetryDelayMs` **分开**。
9. **配置键 catalog 84 → 86**：只新增 `compaction.modelOverrides` 与 `retry.maxAgentDelayMs` 两条 leaf。top-level Settings 仍 51，PackageSource 仍 6。
10. **Compaction 期间 `navigateTree()` throw**（不是 cancelled/排队）：`"Wait for the current compaction or tree navigation to finish before navigating the session tree."` `isCompacting` 含 manual/auto compaction **与** branch summarization。
11. **RPC `steer` / `follow_up` 经 `_queueUserInput` → `_runInputHandlers` → `emitInput`**（`source: "rpc"`），不再绕过 extension `input` handlers。
12. **`registerTool` 必须有 object parameter schema**（非 null、非 array），load 时 throw。`ctx.modelRegistry.stream` / `streamSimple` 带 request-time auth，可走 `pi.registerProvider()` 的自定义 provider。
13. **TUI status**：compaction / retry / branchSummary / working spinner 都能嵌进 editor 顶边框（`embedWorkingStatus`）。嵌入成功后 status dock 清空；**fullscreen 不加 IdleStatus**。
14. **OpenCode / OpenCode Go**：`withOpenCodeSessionHeader` 在有 `sessionId` 时发 `x-opencode-session`（**不**看 cacheRetention）。Zen 四个 API；Go 三个（无 google-generative-ai）。
15. **OpenRouter session affinity**：provider 或 `baseUrl` 含 `openrouter.ai` 时默认发 `x-session-id`；`cacheRetention === "none"` 则不把 `sessionId` 传给 client。非 OpenRouter 默认 `x-session-affinity`。compat 可 opt-out。
16. **Codex Off reasoning**：thinking=`off` 时仍发 `thinkingLevelMap.off`（缺省 `"none"`）；`off === null` 才省略 `body.reasoning`。
17. **Mistral Medium**：`mistral-medium-*` 与 `mistral-small-2603` / `mistral-small-latest` 用 `reasoning_effort`；其余 reasoning 模型仍 `prompt_mode: "reasoning"`。
18. **Fireworks**：DeepSeek V4 / Qwen3.8 fallback 进 `forceAdaptiveThinking`；GLM 5.2 去掉冗余 low/medium alias；Kimi K3 去掉 medium alias。规则在 `generate-models.ts`。
19. **GitHub Copilot**：`generate-models.ts` 把 **全部** `gpt-*`（不再只是 `gpt-5*`）路由到 `openai-responses`。
20. **EventStream**：`Array.shift` 改为双栈 `FifoQueue`，避免 drain 的 O(n²)。
21. **nodejs exec-env**：新增 `TextLineReader` / `openTextLineReader`（严格 LF，报告 `terminated`）。`readTextLines` 改走它。shell `exec()` 无功能变更。
22. **docs evals**：`packages/evals/src/docs.eval.ts` 对 `packages/coding-agent/docs/**/*.md` 做实现对照审计。写进 `subsys.evals.pi-harness`，不新建节点。
23. **Catalog 未变**：runtime providers **40**；`.models.ts` buckets **39**；slash 23；RPC 33；extension events 36；CLI 63；keybindings 90；env 103；tools 8（coding/read-only 仍不含 powershell）。
24. **不要**把 `packages/agent/docs/pico-v3.md` / `pico2.md` / `pico/**` 写成 shipped 运行时。

## 本轮新节点

无。

## 不要退役的节点

全部保留。`surface.sdk.remote-session`、`subsys.agent-core.session-search`、`subsys.ai.cloudflare-gateway-binding` 语义相对上一轮不变。

## filler 纪律

只写两类文件：

1. 自己批次里的节点 `docs/llm-wiki/pi/<path>`
2. 可选 `_staging/uncertainty-update-bbb61e34aa-<slug>.md`

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、别人批次的节点、`pi/` 源码。

步骤：

1. 读本文件 + `conventions.md` 对应模板。
2. 读现有节点 `.md`（remap 不要写成空模板；rewrite 保留仍成立的问题列表）。
3. 用 `read_file` / `grep` 读 **target** 源码。`source:` 先按上表增补，再 `test -f`。
4. 每个 load-bearing 论断的 `[E: path:line]` 必须落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. `status: verified`（自己核过至少 3 条 `[E:]`）或 `draft`（核不完），`updated: bbb61e34aa`，`evidence: explicit`。
6. 跑 lint 时只处理带自己 `node:<path>` 的报错。

### 按批次深度

- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留。
- **remap**：禁止从零重写。删缺失 source、改 `[E:]`、改过时一句；其余不动。
- **refresh**：对照变更过的 source 修假话、重落行号，不扩写。
- **create**：本轮不用。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 或 pico/work-package 手稿当 `[E]`；冲突时跟代码。
