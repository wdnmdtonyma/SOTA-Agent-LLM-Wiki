# SOTA Agent 源码与 LLM Wiki

本仓库收录五个 SOTA coding agent 的源码及对应 LLM Wiki，用于分析实现、比较架构和参考设计。讨论 Agent 相关问题时，这些本地源码与 Wiki 就是仓库提供的研究材料。

## 目录结构

| 项目 | 源码目录 | 对应 LLM Wiki |
|---|---|---|
| Claude Code | `claude/`（逆向源码快照） | `docs/llm-wiki/claude/` |
| OpenAI Codex | `codex/`（Git 子模块） | `docs/llm-wiki/codex/` |
| DeepSeek Harness | `deepseek-harness/`（Git 子模块） | `docs/llm-wiki/deepseek-harness/` |
| OpenCode | `opencode/`（Git 子模块） | `docs/llm-wiki/opencode/` |
| Pi | `pi/`（Git 子模块） | `docs/llm-wiki/pi/` |

每套 Wiki 的主要结构：

```text
llms.txt       内容入口索引
index.json     机读节点清单
README.md      项目概览与 Wiki 说明
spine/         架构主线与端到端流程
surface/       工具、命令、配置、SDK 等对外能力
subsystems/    内部子系统
reference/     符号、类型、术语等参考资料
```
