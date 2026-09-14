# L2 verification — bbb61e34aa → 71dca871bc

## Scope facts

- official default branch: `origin/main`
- base: `bbb61e34aaf231639fdaaad1adbd757947034eac`
- target: `71dca871bc80b6bc97be37f0ca3189399d651fff`
- upstream span: 21 commits; 29 files; +3,505 / -1,111
- result: 200 verified nodes; +0 / -0; 0 planned
- upstream tags: none（产品仍 0.85.1，变更在 Unreleased）
- bulk of the diff is `packages/agent/docs/pico/**`（内部手稿，未进节点）

## Independent verifier matrix

| Area | Result | Notes |
|---|---|---|
| evals isolation / transform / comparative suites | PASS after L2 | L2 0 in-place fixes；抽查 `--repetitions`、`excludePiDocumentation`、inline transform、models/providers evals |
| catalog DeepSeek / Codex / Fireworks | PASS after L2+L3 | L2 改 2 条 citation；L3 `l2_fixes_hold=true`，未再改 |
| Mistral / Anthropic Fireworks / Google stop reason | PASS after L2+L3 | L2 改 3 条 citation；L3 核对通过。lead 另修 lint：Vertex `:102` 注释行、evals README 空行、`providers.eval.ts:404` 括号行 |

## Catalog audit

对照 `71dca871bc` 源码重数（不变）：

- runtime providers: 40
- static model buckets: 39
- config keys 86
- slash 23、RPC 33、extension events 36、CLI 63、keybindings 90、env 103
- interactive components 43、TUI components 16
- built-in tools: 8；coding/read-only 仍不含 powershell

本轮 catalog 语义：

- 官方 DeepSeek 硬编码 = `deepseek-flash` + `deepseek-v4-pro`（不再硬编码 `deepseek-v4-flash` / `deepseek-v4-flash-vision-exp`）
- Codex 硬编码 catalog 删除 `gpt-5.4` / `gpt-5.4-mini`；`gpt-6-astra` 仍在
- Fireworks Messages `supportsToolReferences: true`
- `qwen-token-plan-individual` allowlist 仍含 `deepseek-v4-flash-0731`

## Confirmed errors that L2 found (L3 re-checked against source)

- `ref.ai.model-catalog`：OpenCode `grok-build-0.1` 的 `thinkingLevelMap` 与 `supportsReasoningEffort:false` 不是同一行
- `subsys.ai.model-catalog-publication`：publish workflow 的 `SOURCE_REF` / checkout 不在 generate-job `if` 行
- `subsys.ai.mistral-conversations`：accumulator / SSE abort 行号漂移
- `subsys.ai.anthropic-messages`：`client.beta.messages.create`、`transformMessages` 在 `buildParams`、若干 SSE/cost/image 行号
- `subsys.ai.google-generative-ai`：Vertex `resolveApiKey` 与 key/ADC 分支（L3 记下 `:102` 是注释；lead lint 删掉该 cite）

## L3（独立 fixer，与 L2 分开）

- catalog：2/2 L2 改句对照源码成立，未再改文件。
- protocol：3/3 L2 改句对照源码成立，未再改文件。
- evals：L2 无改句，不单开 L3。

lead lint 补修（非 L2 清单，但 L1 机械门失败）：

- `google-vertex.ts:102` 注释行 → 保留 `:101` / `:103` / `:105`
- `packages/evals/README.md:47` 空行 → `:48` / `:49`
- `providers.eval.ts:404` 纯括号 → 删该 cite，timeout 仍锚 `:393`

## Remaining nits

- 历史 `_staging/uncertainty-*.md` 可能仍提到已删符号（例如旧 DeepSeek `deepseek-v4-flash-vision-exp` 硬编码行）；reconcile 会原样并进 `reference/uncertainty.md`。
- 机械 SHA 页未逐页 L2。

## Validation

Wiki validation is serial after fillers, L2, and L3: reconcile, lint, reconcile again, lint again. Final: 200 verified / 0 planned.

Upstream runtime tests were not executed: detached Pi checkout has no `node_modules`.
