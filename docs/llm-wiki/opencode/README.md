# opencode 源码 LLM Wiki

一份给 **agent 检索/消费**(其次:可问答 → onboarding)的知识库,覆盖 SST **opencode**(`Best/opencode/`)的真实源码——一个 **27-package 的 Bun/TypeScript monorepo**,建立在 **Effect** 框架上,是一个终端 AI 编码 agent。细到每个工具的字段与设计动机。

## 这是 LLM wiki,不是书

按 LLM-wiki 通行建议(DeepWiki / llms.txt / LLM 文档实践)+ 本项目方法论组织。四条支柱:

1. **机读入口** —— `llms.txt`(人机皆读)+ `index.json`(机读清单):列出每个节点 + 一句话 + 源文件。agent 先读它 / grep 定位,而非翻线性目录。
2. **自包含节点** —— 每页一个概念,**单独被检索出来也完整**;用**显式实体名**(写 `SessionRunner`,不写"见上文那个 runner");H2/H3 层级可预测。
3. **证据可机器校验** —— 每条非显然论断挂源码路径,分级 `[E]` explicit / `[I]` inferred / `[U]` unknown。
4. **分层 + 图** —— T0 脊柱 / T1 模型·用户·集成可见面 / T2 内部子系统 / T3 符号 catalog;架构与数据流用 mermaid。

> 消费模型:**读 md + grep,不建向量**。优化的是"一个概念一个文件、路径可预测、可 grep",而非向量 chunk 技巧。优先级:① agent 消费 ② 可问答 ③ onboarding。

## opencode 的形态(决定本 wiki 的画像)

- **真源码**:opencode 是公开真实工程,**git 仓 + 完整 specs/ + 各包测试**。证据以 `[E]` 为主;**staleness 用 opencode git SHA**,节点 `updated:` 记 fill 时的 opencode HEAD 短 SHA。
- **TypeScript / Effect monorepo**:核心是 `packages/`(27 包),全栈基于 Effect(Layer/Service/Context/Schema)。Bun 运行时,Turborepo + catalog 版本管理。
- **★ V1→V2 迁移 = 全 wiki 的组织主线**:opencode **一套进程跑两代代码**。
  - **V1(当前活跑路径)** = `packages/opencode/src`,基于 Vercel **AI SDK**;链路 `SessionPrompt.runLoop → SessionProcessor → LLM.stream`;CLI → 进程内 Effect HttpApi server → SDK → session。
  - **V2(新内核,多数已建但未设为默认)** = `packages/core/src`,命名空间 `@opencode/v2`,Effect-native,durable + 事件溯源(`SessionV2`/`SessionExecution`/`SessionRunner`、System Context 代数、`EventV2`);目前仅经 `core/src/public/opencode.ts` 的嵌入式 API 真正接通执行。
  - **`packages/llm`** = 原生 provider 协议引擎(Route/Protocol/Transport/Auth);V1 里是可选 seam(`OPENCODE_EXPERIMENTAL_NATIVE_LLM`),V2 里是执行引擎。
  - 每个节点 frontmatter 带 `v: v1 | v2 | shared | na`;**hybrid 组织**:一概念一节点、内部分 V1/V2 小节;只有实现真正分叉到值得各自成页时(session 内核、tool 系统、permissions、shell、patch、compaction)才拆 `-v1`/`-v2`。
- **范围**:**全 monorepo 同深度**——含 TUI(OpenTUI+SolidJS)、clients(desktop/web/console)、SST infra、外围包(slack/function/enterprise/stats…),均逐子系统覆盖。

## 结构

```
llms.txt          入口索引(agent 从这里定位;人也能读)
index.json        机读节点清单(nodes[] 具体节点 + groups[] grouped-catalog)
README.md         本文件:向导 + 四支柱 + 证据图例 + opencode 画像
conventions.md    节点模板 + frontmatter schema + 证据分级 + L1 lint 规则
spine/            T0 端到端"怎么跑"(mermaid 先行,自包含)+ worked traces
surface/          T1 可见面:tools/ agents/ prompts/ cli/ config/ providers/ server-api/ sdk/ plugin-api/
subsystems/       T2 内部子系统:session-v2/ session-v1/ model-layer/ execution/ integrations/ persistence/ tui/ server/ clients/ infra/ peripheral/
reference/        T3 符号·类型·catalog · glossary · 不确定项 · package 索引
tools/            lint.mjs(L1 机械校验)· reconcile.mjs(frontmatter→index.json 同步 + 登记 + _staging 合并)— 已就位
_staging/         并发填充时各批次的 uncertainty-<batch>.md 暂存
```

## 证据图例

- `[E]` explicit —— 源码直证,尽量带路径:`[E: packages/core/src/session/runner/llm.ts:373]`(相对 `Best/opencode/`)
- `[I]` inferred —— 基于代码的合理推断,未完全证实
- `[U]` unknown —— 待查 / 待证实(汇总进 `reference/uncertainty.md`)

每个节点 frontmatter 带页级 `evidence:` 主导级。校验时独立 subagent 逐条对照源码证伪 `[E]`。

## 约定 / 前提

- **语言**:中文讲解;代码 / 字段 / 类型 / 包名 / 文件路径 / 协议方法名一律保留英文。
- **源路径基准**:一律相对 `Best/opencode/`(monorepo 根),如 `packages/core/src/...`、`packages/llm/src/...`、`specs/v2/session.md`。本 wiki 目录下源码在 `../../../opencode/`。
- **工具 ground truth**:V1 工具集以 `packages/opencode/src/tool/registry.ts` 的装配为准;V2 以 `packages/core/src/tool/tools.ts` + `builtins.ts` 的注册为准。不以 survey 清单为准。
- **设计动机权威来源**:`specs/v2/*.md`(session/tools/config/provider-model/provider-policy/instructions/api.html/schema-changelog/catalog-config-plugin-lifecycle)、`specs/{project,tui-package}.md`、`specs/storage/*.md`、根 `AGENTS.md`、`CONTEXT.md`。
- **写作/机读/lint 规范**:见 `conventions.md`。

## 方法 & 状态

逐节点循环:**大纲 → 人 review → 逐节点读源码填 → 独立 subagent 对照源码校验 → 修 → 直到整仓覆盖完**。当前处于**大纲已 review 定稿(9 路 source 测绘得到 180 节点 + 14 grouped-catalog 组;hybrid V1/V2 组织、全 monorepo 同深度)、护栏(`tools/lint.mjs`+`reconcile.mjs`)就位、待并发填充**阶段(批次计划见 `_fill-prompts.md`,2 轮)。

| Tier | 范围 | 节点数 | 状态 |
|---|---|---|---|
| T0 spine | 端到端脊柱(11)+ worked traces(4) | 15 | ⬜ 规划 |
| T1 surface | tools(17)+ agents/prompts(3)+ cli(3)+ config(6)+ providers(3)+ server-api(3)+ sdk(2)+ plugin-api(3) | 40 | ⬜ 规划 |
| T2 subsystems | tools(3)+ session-v2(10)+ session-v1(6)+ model-layer(10)+ execution(11)+ integrations(9)+ persistence(7)+ tui(12)+ server(6)+ clients(6)+ infra(5)+ peripheral(8) | 93 | ⬜ 规划 |
| T3 reference | tool/llm/exec/config/db/lsp/formatter/tui catalog + glossary + package 索引 + uncertainty | 33 | ⬜ 规划 |

下一步(review 通过后):从 T0 脊柱(尤其 `v1-v2-relationship`、`v2-overview`)+ T1 `surface/tools/`(用户核心诉求)起填。`tools/lint.mjs` + `tools/reconcile.mjs` 已就位(自测 0 error);并发批次计划见 `_fill-prompts.md`。
