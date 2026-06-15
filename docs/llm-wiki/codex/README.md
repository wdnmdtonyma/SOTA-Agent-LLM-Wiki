# Codex 源码 LLM Wiki

一份给 **agent 检索/消费**(其次:可问答 → onboarding)的知识库,覆盖 OpenAI **Codex**(`Best/codex/`)的真实源码——一个 **~95 crate 的 Rust workspace**(`codex-rs/`)+ TypeScript/Python SDK + TUI/CLI/app-server 前端,细到每个工具的字段与设计动机。

## 这是 LLM wiki,不是书

按 LLM-wiki 通行建议(DeepWiki / llms.txt / LLM 文档实践)+ 本项目方法论组织。四条支柱:

1. **机读入口** —— `llms.txt`(人机皆读)+ `index.json`(机读清单):列出每个节点 + 一句话 + 源文件。agent 先读它 / grep 定位,而非翻线性目录。
2. **自包含节点** —— 每页一个概念,**单独被检索出来也完整**;用**显式实体名**(写 `apply_patch` 工具,不写"见上文那个补丁机制");H2/H3 层级可预测。
3. **证据可机器校验** —— 每条非显然论断挂源码路径,分级 `[E]` explicit / `[I]` inferred / `[U]` unknown。
4. **分层 + 图** —— T0 脊柱 / T1 模型·用户·集成可见面 / T2 内部子系统 / T3 符号 catalog;架构与数据流用 mermaid。

> 消费模型:**读 md + grep,不建向量**。优化的是"一个概念一个文件、路径可预测、可 grep",而非向量 chunk 技巧。优先级:① agent 消费 ② 可问答 ③ onboarding。

## codex 的形态(决定本 wiki 的画像)

- **真源码**:codex 是公开的真实工程,**git 仓 + 701 测试 + 完整 `docs/`**。所以证据以 `[E]` 为主、inferred 少;**staleness 用 git SHA**(不是 claude 那种内容 hash),节点 `updated:` 记 commit SHA。
- **Rust 为主**:核心在 `codex-rs/`(~95 crate),前端含 TUI(`tui/`)、CLI(`cli/`)、app-server(`app-server/`,供 IDE/SDK 接入)。外围 SDK 在 `sdk/typescript`、`sdk/python`。
- **SQ/EQ 架构**:core 是 **Submission Queue → Event Queue** 的异步消息循环(`Op` 进、`EventMsg` 出),是全 wiki 的脊柱。
- **范围**:**全 monorepo 同深度**——含 SDK、cloud-tasks、遥测、TUI 渲染细节、平台 crate,均逐子系统覆盖。

## 结构

```
llms.txt          入口索引(agent 从这里定位;人也能读)
index.json        机读节点清单(MCP / 脚本 / lint 用)
README.md         本文件:向导 + 证据图例
conventions.md    节点模板 + frontmatter schema + 证据分级 + L1 lint 规则
spine/            T0 端到端"怎么跑"(mermaid 图先行,自包含)
surface/          T1 可见面:tools/ slash-commands/ cli/ config/ app-server/ sdk/
subsystems/       T2 内部子系统:core/ exec-sandbox/ mcp/ providers/ tui/ app-server/ config-auth/ cloud/ platform/
reference/        T3 协议 Op/Event catalog · 数据模型 · crate 索引 · feature-flags · env · glossary · 不确定项
tools/            lint.mjs(L1 机械校验)· reconcile.mjs(登记新节点)
```

## 证据图例

- `[E]` explicit —— 源码直证,尽量带路径:`[E: codex-rs/tools/src/apply_patch_tool.rs:89]`(相对 `Best/codex/`)
- `[I]` inferred —— 基于代码的合理推断,未完全证实
- `[U]` unknown —— 待查 / 待证实(汇总进 `reference/uncertainty.md`)

每个节点 frontmatter 带页级 `evidence:` 主导级。校验时独立 subagent 逐条对照源码证伪 `[E]`。

## 约定 / 前提

- **语言**:中文讲解;代码 / 字段 / 类型 / crate 名 / 文件路径 / 协议方法名一律保留英文。
- **源路径基准**:一律相对 `Best/codex/`(如 `codex-rs/core/src/...`、`sdk/typescript/src/...`、`docs/config.md`)。
- **工具 ground truth**:工具集以 `codex-rs/tools/src/tool_registry_plan.rs`(`build_tool_registry_plan`)的装配为准,不以 survey 清单为准。
- **写作/机读/lint 规范**:见 `conventions.md`。

## 方法 & 状态

逐节点循环:**大纲 → 人 review → 逐节点读源码填 → 独立 subagent 对照源码校验 → 修 → 直到整仓覆盖完**。当前处于**大纲已出、过 4 路独立 subagent 源码校验(170 节点)、待人 review**阶段。

| Tier | 范围 | 节点数 | 状态 |
|---|---|---|---|
| T0 spine | 端到端脊柱(7)+ worked traces(3) | 10 | ⬜ 规划 |
| T1 surface | tools(38)+ slash(6)+ cli(3)+ config(8)+ app-server(9)+ sdk(6) | 70 | ⬜ 规划 |
| T2 subsystems | core(19)/exec-sandbox(11)/mcp(6)/providers(10)/tui(9)/app-server(4)/config-auth(8)/cloud(3)/platform(8) | 78 | ⬜ 规划 |
| T3 reference | 协议 Op/Event catalog + session-tasks + 数据模型 + crate 索引(97)+ glossary 等 | 12 | ⬜ 规划 |

下一步(review 通过后):从 T0 脊柱 + T1 `surface/tools/`(用户核心诉求)起填,同时落地 `tools/lint.mjs`(L1 机械校验)。
