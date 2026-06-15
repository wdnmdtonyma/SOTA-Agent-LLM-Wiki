# Claude Code 源码 LLM Wiki

一份给 **agent 检索/消费**(其次:可问答 → onboarding)的知识库,覆盖 `Best/claude/` 逆向得到的 **Claude Code** 源码(~1,884 文件 / ~513K LOC),细到每个工具的字段与设计动机。

## 这是 LLM wiki,不是书

按 LLM-wiki 通行建议(DeepWiki / llms.txt / LLM 文档实践)+ 本项目方法论组织。四条支柱:

1. **机读入口** —— `llms.txt`(人机皆读)+ `index.json`(机读清单):列出每个节点 + 一句话 + 源文件。agent 先读它 / grep 定位,而非翻线性目录。
2. **自包含节点** —— 每页一个概念,**单独被检索出来也完整**;用**显式实体名**(写 `BashTool`,不写"见上文那个权限机制");H2/H3 层级可预测。
3. **证据可机器校验** —— 每条非显然论断挂源码路径,分级 `[E]` explicit / `[I]` inferred / `[U]` unknown。
4. **分层 + 图** —— T0 脊柱 / T1 模型面 / T2 子系统 / T3 符号 catalog(目标≈100% 公共符号);架构与数据流用 mermaid。

> 消费模型:**读 md + grep,不建向量**。所以优化的是"一个概念一个文件、路径可预测、可 grep",而非向量 chunk 技巧。优先级:① agent 消费 ② 可问答 ③ onboarding。

## 结构

```
llms.txt          入口索引(agent 从这里定位;人也能读)
index.json        机读节点清单(MCP / 脚本 / lint 用)
README.md         本文件:向导 + 证据图例
conventions.md    节点模板 + frontmatter schema + 证据分级 + L1 lint 规则
spine/            T0 端到端"怎么跑"(mermaid 图先行,自包含)
surface/          T1 模型/用户可见面:tools/  commands/  hooks/  settings/
subsystems/       T2 内部子系统(permissions / compaction / mcp / model-api / swarm / memory / ink-runtime …)
reference/        T3 符号·类型 catalog + 数据模型 + glossary + 不确定项
diagrams/         mermaid 源
```

## 证据图例

- `[E]` explicit —— 源码直证,尽量带路径:`[E: tools/BashTool/BashTool.tsx:120]`
- `[I]` inferred —— 基于代码的合理推断,未完全证实
- `[U]` unknown —— 待查 / 待证实(汇总进 `reference/uncertainty.md`)

每个节点 frontmatter 还带页级 `evidence:` 主导级。校验时独立 subagent 逐条对照源码证伪 `[E]`。

## 约定 / 前提

- **语言**:中文讲解;代码 / 字段 / 类型 / 文件路径 / codename 一律保留英文。
- **逆向前提**:符号是反编译命名,可能与上游有出入;不臆造,拿不准标 `[I]` / `[U]`。
- **codename**(tengu / Kairos / Clawd / Grove / Tungsten / dream / swarm / teleport / CCR)见 `reference/glossary.md`。
- **写作/机读/lint 规范**:见 `conventions.md`。

## 方法 & 状态

逐节点循环:**大纲(✅ 已 realign 成 LLM-wiki 结构)→ 填 → 独立 subagent 对照源码校验 → 修**。全仓测绘(9 个 Explore agent)已完成,结论可复用。

| Tier | 范围 | 节点数(规划) | 状态 |
|---|---|---|---|
| T0 spine | 端到端脊柱 | ~6 | ⬜ 规划 |
| T1 surface | tools(57)+ commands(~77)+ hook 事件(27)+ settings | ~165 | ⬜ 规划 |
| T2 subsystems | 内部子系统 | ~26 | ⬜ 规划 |
| T3 reference | 符号/类型 catalog + 数据模型 + glossary | 增量 | ⬜ 规划 |

下一步:从 T0 脊柱 + T1 `surface/tools/`(用户核心诉求)起填,同时落地 `tools/lint.mjs`(L1 机械校验)。
