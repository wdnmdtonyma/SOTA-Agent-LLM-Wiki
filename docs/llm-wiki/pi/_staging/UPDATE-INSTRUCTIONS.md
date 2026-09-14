# Pi wiki 增量刷新令（bbb61e34aa → 71dca871bc）

给 filler 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径、架构事实和文件纪律。

本轮 **不跑逐节点独立 L2**（lead 填完后再统一证伪）。filler 自己核 `[E:]`（每页至少抽 3 条 `read_file` 对行），写完将 `status: verified`。过宽结论宁可降 `[I]/[U]`。

## 冻结点

- **base**（上一轮 verified）: `bbb61e34aa`（`v0.85.1` Unreleased 周期，`bbb61e34aaf231639fdaaad1adbd757947034eac`）
- **target**（必须对照的源码 HEAD）: `71dca871bc`（全 SHA `71dca871bc80b6bc97be37f0ca3189399d651fff`；官方 `origin/main`；产品版本仍 **0.85.1**，本轮全在 `[Unreleased]`）
- 源码根: `pi/`（相对本 wiki `../../../pi/`）
- 节点 `updated:` 一律写成 `71dca871bc`
- 未安装上游 `node_modules`，不要宣称 runtime tests 通过。
- **不要**把 `packages/agent/docs/pico*/**`、`packages/agent/docs/work-packages/**` 当 shipped 源。那是内部设计手稿，最多 `[I]`，**不要新建 pico 节点**。
- **不要**新建 wiki 节点。Fireworks deferred tools、DeepSeek Flash 更名、Codex 下架 GPT-5.4、Mistral GLM-5.2、evals `--repetitions` / models.eval / providers.eval 全部写进现有页。

## 路径增补（frontmatter `source:` 与 `[E:]`）

本轮 **没有** 删除/改名会让 `source:` 失效的 shipped 文件（`git diff --name-status` 无 `D`）。必须**新增**的 source：

| 节点 | 必须加入 `source:` |
|---|---|
| `subsys.evals.pi-harness` | 现有即可；symbols 补 `excludePiDocumentation` |
| `subsys.evals.comparative-harness` | `packages/evals/src/models.eval.ts`、`packages/evals/src/providers.eval.ts` |
| `subsys.ai.model-discovery` / `ref.ai.model-catalog` | 现有 `generate-models.ts`；DeepSeek / Codex 硬编码行号必须重落 |
| `subsys.ai.anthropic-messages` | 可选补 `packages/ai/scripts/generate-models.ts`（Fireworks `supportsToolReferences`）或只在 model-discovery 写 catalog 事实、本页只写 adapter 机制 |
| `subsys.ai.mistral-conversations` | 现有即可；`usesReasoningEffort` 必须含 `zai-glm-5-2` |

禁止把 `[E:]` 指到已删除符号/id：`deepseek-v4-flash`（官方 bucket 硬编码行）、`deepseek-v4-flash-vision-exp`、Codex catalog 的 `gpt-5.4` / `gpt-5.4-mini`、Google `FinishReason.TOO_MANY_TOOL_CALLS`。`qwen-token-plan-individual` allowlist 里的 `deepseek-v4-flash-0731` **仍在**，不要一起删。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **产品版本仍 `0.85.1`**，wiki target SHA `71dca871bc`。changelog 全在 Unreleased。
2. **Fireworks Messages deferred tools**：`processFireworksModels` 的 Anthropic compat 设 `supportsToolReferences: true`。任意 loader 名都能工作，但 Fireworks **只对** `ToolSearch` / `tool_search` 做 prefix deferral；其它 loader 名仍会把 loaded schema 放进初始 tool prefix，失去 cache 收益。这不改变 API 路由：Fireworks GLM / Kimi K3 仍走 Chat Completions，不是 Messages。
3. **DeepSeek 官方 bucket 硬编码行**：现为 `deepseek-flash`（显示名 DeepSeek V4.1 Flash，`input: ["text","image"]`，`thinkingLevelMap: DEEPSEEK_V4_FLASH_THINKING_LEVEL_MAP`，cost 0.3/1.2/0.006）与 `deepseek-v4-pro`（text-only，cost 1.32/3.96/0.044）。**不再**硬编码 `deepseek-v4-flash` 或 `deepseek-v4-flash-vision-exp`。
4. **OpenAI Codex 硬编码 catalog** 删除 `gpt-5.4` 与 `gpt-5.4-mini`（ChatGPT 账号已不可用）。`gpt-6-astra` / `gpt-5.3-codex-spark` / `gpt-5.5` / `gpt-5.6-luna` 仍在。Azure / Copilot **默认模型 id** 仍可以是 `gpt-5.4`（那是 `model-resolver` 默认，不是 Codex catalog 行）。
5. **Mistral `usesReasoningEffort`**：在 medium/small-2603/small-latest 之外新增精确 id `zai-glm-5-2`。该模型发 `reasoning_effort`，不发被忽略的 `prompt_mode`。
6. **Google `mapStopReason`**：`FinishReason.TOO_MANY_TOOL_CALLS` 已从 exhaustive switch 删除。不要再把它列进 error 映射。
7. **Eval harness 隔离**：临时 `isolatedHome` + `agentDir = ~/.pi/agent`（相对该 home）；`SettingsManager.inMemory({ shellCommandPrefix })` 导出 `HOME` 并 unset `PI_CODING_AGENT_DIR` / `PI_EVAL_ARTIFACT_DIR` / `PI_MODEL` / `PI_PROVIDER` / `PI_REASONING_LEVEL` / `PI_SESSION_FILE` / `PI_SESSION_ID`。
8. **`transformSystemPrompt` 不再 reload**：改为 hidden inline extension `eval-system-prompt-transform`，钩 `before_agent_start`。空 transform 在**第一次 prompt 之后**才抛。extension path 断言允许 `<inline:eval-system-prompt-transform>`。
9. **`excludePiDocumentation`**：按 `"\nPi documentation (read only"` 与 `"\nCurrent working directory: "` 两个稳定标记切片，不改生产 prompt builder。缺任一标记即 throw。
10. **output 投影**现在还能看到 `systemPrompt` 与 `agentDir`（不只 `response`/`session`）。
11. **`--repetitions` / `PI_EVAL_REPETITIONS`**：默认 1，必须是正整数。`evalHarnessTable` 用 `resolveEvalRepetitions(explicit, env)`；suite 显式 `repetitions` 覆盖 CLI/env。不要把 `PI_EVAL_REPETITIONS` 加进产品 `ref.coding-agent.env-vars`（仍 103）。
12. **比较报告落盘**：reporter 在非 interrupted 结束时写 `.eval/` 下 `report.txt`（去色）与 `report.json`。多 comparative 文件同一次 invocation 合成一份 `Eval Comparisons` 报告。
13. **新 comparative evals**（不新建节点，写进 `subsys.evals.comparative-harness`）：`models.eval.ts`（Add model to existing provider，`openai/fixture-chat`）与 `providers.eval.ts`（Add OpenAI-compatible provider `acme` + Add custom streaming provider `acme-stream`）。三者与 `extensions.eval.ts` 一样：baseline = `excludePiDocumentation`，candidate = default system prompt。
14. **extension eval 标题**现为 “creates and uses the extension”；judge 仍要求 `hello({name:"Bob"})` → `Hello, Bob!`，并拒绝 `@mariozechner/` 与 `@sinclair/typebox`。
15. **Catalog 未变**：runtime providers **40**；`.models.ts` buckets **39**；slash 23；RPC 33；extension events 36；CLI 63；keybindings 90；env 103；config keys 86；tools 8。
16. **不要**把 pico 手稿写成 shipped 运行时。

## 本轮新节点

无。

## 不要退役的节点

全部保留。extension 相关页只因 `docs/extensions.md` 加了 4 行 Fireworks 说明而机械命中——**不要**为这 4 行重写 extension API 页；Fireworks 事实写进 AI/catalog 节点即可。

## filler 纪律

只写两类文件：

1. 自己批次里的节点 `docs/llm-wiki/pi/<path>`
2. 可选 `_staging/uncertainty-update-71dca871bc-<slug>.md`

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、别人批次的节点、`pi/` 源码。

步骤：

1. 读本文件 + `conventions.md` 对应模板 + `_staging/update-facts-71dca871bc.md`。
2. 读现有节点 `.md`（remap 不要写成空模板；rewrite 保留仍成立的问题列表）。
3. 用 `read_file` / `grep` 读 **target** 源码。`source:` 先按上表增补。
4. 每个 load-bearing 论断的 `[E: path:line]` 必须落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. `status: verified`（自己核过至少 3 条 `[E:]`）或 `draft`（核不完），`updated: 71dca871bc`，`evidence: explicit`。
6. 跑 lint 时只处理带自己 `node:<path>` 的报错。

### 按批次深度

- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留。
- **refresh**：对照变更过的 source 修假话、重落行号，不扩写。
- **create**：本轮不用。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 或 pico/work-package 手稿当 `[E]`；冲突时跟代码。
