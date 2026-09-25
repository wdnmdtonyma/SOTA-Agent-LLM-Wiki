# L2 verification — 71dca871bc → ff72faba28

## Scope facts

- official default branch: `origin/main`
- base: `71dca871bc80b6bc97be37f0ca3189399d651fff`
- target: `ff72faba28d10c86611863d0aaa5d3122f2d8cb0`
- upstream span: 190 commits; 747 files; +89,068 / -24,124
- result: 204 verified nodes; +4 / -0; 0 planned
- upstream tags: v0.86.0 / v0.86.1 / v0.87.0 / v0.87.1（产品 **0.87.1** + Unreleased）
- post-freeze fetch: `origin/main` 仍是 `ff72faba28`（0 个后续 commit）

## Independent verifier matrix

| Area | Result | Notes |
|---|---|---|
| durable runtime/storage + spine overview/layered + package-index | PASS after L2+L3 | L2 改 14 条 citation + 1 条过宽 `[E]→[I]`；L3 `l2_fixes_hold=false` 仅因 compaction mermaid，durable 专项全成立 |
| image / classifier / model-discovery / evals | PASS after L2 | L2 改 8 条 citation；架构（三分 catalog、42 buckets、evals Docker lift）未推翻。L3 catalogs 侧 `l2_fixes_hold=true` |
| agent-loop / finishTurn / session persist / context edit | PASS after L2+L3 | 专项论断全部核到。L2 改 12 条（多在 compaction-flow 行号/符号）。L3 再修 mermaid：`tokensBefore` 走 `buildContextEntries`，compact 走 `generateSummaryWithRequest` |
| extension 40 / cache-warming / catalogs / RPC | PASS after L2+L3 | `on()` 40；providers 42；slash 24 含 `/bug`；RPC 33；env **105**（L2 删 `AWS_ENDPOINT_URL_BEDROCK_RUNTIME`、补 `PI_RADIUS_GATEWAY`；无 `PI_EVAL_*`）。L3 `l2_fixes_hold=true` |
| TranscriptContext / Anthropic defer_loading / chord tracker / read GIF | PASS after L2 | L2 改 17 条 citation；L3 抽查成立 |

## Catalog audit

对照 `ff72faba28` 源码重数：

- runtime providers: **42**（+`meta` +`typesafe`）
- static model buckets: **42**（+`meta` +`typesafe` +`radius` shard）
- KnownApi (chat): 10
- KnownImageApi: 1（`openrouter-images`）
- KnownClassifierApi: 2
- config keys: **88**
- slash: **24**（含 `/bug`）
- RPC: 33
- extension `on()`: **40**
- CLI flags: 63
- keybindings: 90
- env: **105**
- interactive components: 43
- TUI public components: 16（目录 18 文件，2 个未导出）
- built-in tools: 8；coding/read-only 仍不含 powershell

## Confirmed errors that L2 found (L3 re-checked against source)

- `openNodeJsonlStorage` 第二参是 `Context`，第三才是 `options`
- chord `index.ts` 导出行：`defineFacet` / `createFacetHost` 不在 `:8`
- compaction `tokensBefore` 来自 `buildContextEntries`，不是 `buildSessionContext().messages`；harness compact 走 `generateSummaryWithRequest`
- env 表误收 `AWS_ENDPOINT_URL_BEDROCK_RUNTIME`；漏 `PI_RADIUS_GATEWAY`
- `/thinking` `/compact` 曾锚到错误命令行
- OpenAI Responses 先建 `AssistantMessageEventStream` 再 `resolveTranscript`
- 若干 citation 落在注释行、函数签名行或纯括号行

## L3（独立 fixer，与 L2 分开）

- catalogs / evals / image：`l2_fixes_hold=true`，未再改文件。env 最终 105。
- durable / loop / protocol：L2 五项重点四项成立；compaction mermaid 仍写 `buildSessionContext`，L3 改 3 条后 PASS。

## Remaining nits

- 机械 SHA 页未逐页 L2。
- 未安装上游 `node_modules`，未跑 durable/evals runtime tests。
- `packages/durable/docs/pico*` 未进节点。

## Validation

Wiki validation is serial after fillers, L2, and L3: reconcile, lint, reconcile again, lint again. Final: 204 verified / 0 planned.

Upstream runtime tests were not executed: detached Pi checkout has no `node_modules`.
