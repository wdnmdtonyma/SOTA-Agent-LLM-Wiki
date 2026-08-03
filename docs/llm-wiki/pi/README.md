# pi 源码 LLM Wiki

一份给 **agent 检索/消费**(其次:可问答 → onboarding)的知识库,覆盖 **pi**(`pi/`)的真实源码——一个含 **9 个源码 package workspace + 5 个 extension-example workspace** 的 TypeScript monorepo,一个**自扩展的编码 agent harness**:多 provider LLM 引擎 + 可复用 agent 运行时 + 交互式编码 agent CLI + 差分渲染 TUI + 远程 session protocol/client/server + 可选 SQLite backend + private eval harness。细到每个工具的字段与设计动机。

## 这是 LLM wiki,不是书

按 LLM-wiki 通行建议(DeepWiki / llms.txt / LLM 文档实践)+ 本项目方法论组织。四条支柱:

1. **机读入口** —— `llms.txt`(人机皆读)+ `index.json`(机读清单):列出每个节点 + 一句话 + 源文件。agent 先读它 / grep 定位,而非翻线性目录。
2. **自包含节点** —— 每页一个概念,**单独被检索出来也完整**;用**显式实体名**(写 `AgentSession`,不写"见上文那个 session");H2/H3 层级可预测。
3. **证据可机器校验** —— 每条非显然论断挂源码路径,分级 `[E]` explicit / `[I]` inferred / `[U]` unknown。
4. **分层 + 图** —— T0 脊柱 / T1 模型·用户·集成可见面 / T2 内部子系统 / T3 符号 catalog;架构与数据流用 mermaid。

> 消费模型:**读 md + grep,不建向量**。优化的是"一个概念一个文件、路径可预测、可 grep",而非向量 chunk 技巧。优先级:① agent 消费 ② 可问答 ③ onboarding。

## pi 的形态(决定本 wiki 的画像)

- **真源码**:pi 是公开真实工程,**git 仓 + 各包测试(`./test.sh`)+ 完整 `packages/coding-agent/docs/`(30 篇)**。证据以 `[E]` 为主;**staleness 用 pi git SHA**,节点 `updated:` 记 fill 时的 pi HEAD 10 位短 SHA。
- **TypeScript monorepo**:Node ≥22 / Bun 双运行时,Biome + TypeScript native(tsgo)。源路径一律相对 `pi/`(如 `packages/coding-agent/src/...`)。
- **★ 分层栈 = 全 wiki 的组织主线**:pi 把"可复用运行时"与"产品"分层:
  - **`pi-ai`** = 多 provider 统一 LLM API(38 built-in runtime provider，其中 37 个有静态模型目录；10 wire 协议；auth/oauth；官方 0.83.0 制品共 1,153 模型)。
  - **`pi-agent-core`** = **可复用** agent 运行时 harness:agent-loop(turn → provider stream → 工具调用 → state)、会话树存储、压缩/分支总结、skills、system-prompt。任何 app 都能拿它建 agent。
  - **`pi-coding-agent`** = **产品**:7 个内置工具(bash/read/edit/write/grep/find/ls)、**扩展系统(自扩展招牌)**、skills、slash 命令、三种模式(interactive TUI / RPC / print)、配置/信任/会话管理。
  - **`pi-tui`** = 独立可复用的差分渲染终端 UI 库(渲染循环、编辑器、键盘协议、autocomplete)。
  - **`pi-protocol`** = 远程 session 的 TypeBox wire schema + CBOR/framing；**`pi-client`** = transport-neutral client 与 Unix transport。
  - **`pi-server`** = **实验性** composable remote-session server；旧多实例 RPC/IPC/Radius 链路保留在 `legacy` export/bin 下。
  - **`pi-storage-sqlite-node`** = 可选的 Node SQLite session backend；**`pi-evals`** = private 行为评测 consumer。
  - 根发布脚本发布 ai/agent/protocol/client/storage/tui/coding-agent 七包；server 与 private evals 是源码 workspace，不在该发布列表。
  - 每个节点 frontmatter 带 `pkg: ai | agent | protocol | client | coding-agent | tui | server | storage | evals | cross`,使分层可 grep。**`agent`(可复用)↔ `coding-agent`(产品)的边界、扩展系统与远程 session 链是 pi 的画像主线**。
- **范围**:**全 monorepo 同深度**——含 TUI 渲染细节、实验性 server,均逐子系统覆盖。

## 结构

```
llms.txt          入口索引(agent 从这里定位;人也能读)
index.json        机读节点清单(nodes[] 具体节点 + groups[] grouped-catalog)
README.md         本文件:向导 + 四支柱 + 证据图例 + pi 画像
conventions.md    节点模板 + frontmatter schema(含 pkg)+ 证据分级 + L1 lint 规则 + pi ground-truth 约定
RUN.md            填充令(给 codex 执行者):读序 / 填序 / L1→L2→L3 循环 / 工具与 provider ground truth
spine/            T0 端到端"怎么跑"(mermaid 先行,自包含)+ worked traces
surface/          T1 可见面:tools/ cli/ modes/ config/ providers/ extensions/ skills/ prompts/ commands/ sdk/ sessions/ trust/ misc/
subsystems/       T2 内部子系统:ai/ agent-core/ protocol/ client/ coding-agent/ tui/ server/ storage/ evals/
reference/        T3 符号·类型·catalog(provider/model/wire/config/slash/keybinding/rpc/extension-event/env…)· glossary · 不确定项 · package 索引
tools/            lint/reconcile + 默认 dry-run 的 evidence rebase 工具
_staging/         并发填充时各批次的 uncertainty-<batch>.md 暂存
_fill-prompts.md  并发填充的批次清单(给 codex 的分批令)
```

## 证据图例

- `[E]` explicit —— 源码直证,尽量带路径:`[E: packages/agent/src/agent-loop.ts:304]`(相对 `pi/`)
- `[I]` inferred —— 基于代码的合理推断,未完全证实
- `[U]` unknown —— 待查 / 待证实(汇总进 `reference/uncertainty.md`)

每个节点 frontmatter 带页级 `evidence:` 主导级。校验时独立 subagent 逐条对照源码证伪 `[E]`。

## 约定 / 前提

- **语言**:中文讲解;代码 / 字段 / 类型 / 包名 / 文件路径 / 协议方法名一律保留英文。
- **源路径基准**:一律相对 `pi/`(monorepo 根),如 `packages/coding-agent/src/...`、`packages/ai/src/...`、`packages/coding-agent/docs/rpc.md`。本 wiki 目录下源码在 `../../../pi/`。
- **工具 / provider / 命令 ground truth**:见 `conventions.md` 第 7 节(`core/tools/index.ts` / `providers/all.ts` / `slash-commands.ts` / `rpc-types.ts` …)。不以 survey 清单为准。
- **写作/机读/lint 规范**:见 `conventions.md`。

## 方法 & 状态

逐节点循环:**影响重算 → 读源码更新 → 独立 L2 证伪 → 修复 → reconcile/lint**。当前 **202 个节点全部 verified 于 pi `a8ee03b815`**。本轮从 `cee5ff7520` 更新至目标 HEAD，新增 remote protocol/client/server、AgentHarness lifecycle/search、fullscreen TUI layout、experimental CLI 与 comparative eval 等 16 个结构节点，无退役节点。审计见 `_UPDATE-SCOPE.md` 与 `_research/`。

| Tier | 范围 | 节点数 | 状态 |
|---|---|---|---|
| T0 spine | 端到端脊柱(9)+ worked traces(3) | 12 | ✅ 完成 |
| T1 surface | tools、CLI、modes、config、providers、extensions 与其它用户可见面 | 34 | ✅ 完成 |
| T2 subsystems | ai(27)+ agent-core(21)+ protocol(2)+ client(3)+ coding-agent(33)+ tui(20)+ server(12)+ storage(1)+ evals(2) | 121 | ✅ 完成 |
| T3 reference | ai(6)+ agent-core(8)+ coding-agent(13)+ tui(3)+ server(2)+ cross(3) | 35 | ✅ 完成 |

后续更新以 `RUN.md` 的 L1→L2→L3 流程、`index.json.updated` 与节点 `updated` 为 staleness 门槛。
