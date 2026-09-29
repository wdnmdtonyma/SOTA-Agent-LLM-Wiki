# UPDATE INSTRUCTIONS — opencode wiki 03e67171ab → 7945de2089

> 给 filler / L2 verifier 用。事实以 `opencode/` checkout `7945de2089` 为准，不以本文件或 update-facts 转述为准。写前必须打开被引用的源文件。

## 目标

- **base（上一轮 verified）**: `03e67171ab2dc1e7f16e8cebfbc7f778f61b89f0`
- **target（官方 `origin/dev`）**: `7945de208964a49300d7f770d1a71d078db9a4c4`
- **短 SHA**: `7945de2089`
- **跨度**: 20 commits · 78 files · +5956 / -3225
- **发布版本**: 仍是 **`1.18.33`**（`packages/opencode`、`packages/core`、`packages/cli`）
- **节点影响**: 见 `impact-7945de2089.json`。**不新增、不退役节点**（189 保持）
- **workspace**: 仍 **36** 个 package；根仍 `bun@1.3.14`

## 硬规则

1. 中文讲解，英文标识符。节点自包含。套 `docs/llm-wiki/opencode/conventions.md` 对应模板。
2. 每条 load-bearing 论断就近 `[E: relative/path:line]`，相对 `opencode/`。行号必须落在**被断言的代码行本身**，不是上方注释、空行、或 lone `}`。
3. frontmatter: `status: verified`、`updated: 7945de2089`、`evidence: explicit`（除非真是 inferred）。
4. 只写你被分配的 node `.md`，以及可选 `docs/llm-wiki/opencode/_staging/uncertainty-update-<batch>.md`。
5. **不要**改 `index.json`、`llms.txt`、`reference/uncertainty.md`、其它节点、`opencode/` 源码、`README.md`、`conventions.md`、`RUN.md`、`tools/*`。
6. 发布版本仍是 **1.18.33**。不要把 zen/go 营销文档或 `go-models.ts` 里的模型名写成硬编码 live catalog。`deepseek-flash` 只是 stats 归一名 / Console UI allowance id。
7. SessionV2 / SessionRunner **仍不是默认执行路径**。两个 server 仍是 Effect HttpApi，不是 Hono。
8. 本轮**没有**新增/删除/改名模型可见 tool wire name。
9. 写完后抽 3 条 `[E]` 用 Read 对一下行号。
10. `rewrite` = 刷新 load-bearing 论断与 source/symbols，保留有用问句。`refresh` = 修正假话并重落 `[E]` 行号，不扩写。
11. 路径含 `[id]` 的文件 lint 无法核 `[E:]`（例如 `workspace/[id]/billing/black-section.tsx`），只作 `[I]`。

## 拒绝这些过时说法

- 发布版本变成了 `1.18.34` 或仍写 `1.18.30`
- Go 营销页只有 $10 一档、`LimitsGraph`、订阅 URL 是相对路径 `/console/go`
- Go Plus 额度是 Go 的固定倍数
- `go-models.ts` / `go.mdx` 是 live zen catalog
- Black 订阅页仍有 Stripe billing portal `generateSessionUrl` / Manage 按钮，允许续订
- Stripe webhook 不会把仍在续订的 Black subscription 改成 `cancel_at_period_end`
- `?ref=` 仍表示 referral 计划有效并发 credit
- Stats 只靠 `MODEL_AUTHOR_RULES` 归因，不读 `models.opencode.ai/catalog.json`
- `longcat` 归 unknown provider
- home 对已知 lab 行仍一律 `statProvider()` 重写 provider
- catalog identity 失败时 sync 直接 abort

## D-CLEAN / 轻量节点

source 未命中或只碰 i18n / web docs / CSS：保留正文，只把 `updated` 改成 `7945de2089`。若正文写了过时 Go 单档定价或 LimitsGraph，改准。
