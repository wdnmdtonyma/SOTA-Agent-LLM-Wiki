# 本轮硬事实（71dca871bc）— filler 读，勿当 [E] 照抄

对照源码写。SHA `71dca871bc`。产品仍 0.85.1 / Unreleased。

- Fireworks Messages：`processFireworksModels` → `supportsToolReferences: true`。prefix deferral 只认 `ToolSearch`/`tool_search`。GLM/Kimi K3 仍 Completions。
- DeepSeek 硬编码：`deepseek-flash`（V4.1 Flash，text+image，thinkingLevelMap，0.3/1.2/0.006）+ `deepseek-v4-pro`（1.32/3.96/0.044）。删除 `deepseek-v4-flash` / `deepseek-v4-flash-vision-exp`。
- Codex 硬编码 catalog 删除 `gpt-5.4`、`gpt-5.4-mini`。`gpt-6-astra` 仍在。
- Mistral `usesReasoningEffort` 含 `zai-glm-5-2`。
- Google `mapStopReason` 不再有 `TOO_MANY_TOOL_CALLS`。
- Eval：`excludePiDocumentation`；inline `eval-system-prompt-transform`；isolated `HOME` + unset 一串 PI_*；output 带 `systemPrompt`/`agentDir`。
- `--repetitions` / `PI_EVAL_REPETITIONS`；`resolveEvalRepetitions`；`report.txt` + `report.json`。
- 新文件：`models.eval.ts`、`providers.eval.ts`。不新建 wiki 节点。
- providers 40 / buckets 39 / tools 8 / config-keys 86 / env 103。
- 不要写 pico。不要新建节点。
