# UPDATE INSTRUCTIONS — opencode wiki 9f69463f1d → e207624c48

> 给 filler / L2 verifier 用。事实以 `opencode/` checkout `e207624c48` 为准，不以本文件或 update-facts 转述为准。写前必须打开被引用的源文件。

## 目标

- **base（上一轮 verified）**: `9f69463f1d556af2b5b51d2efa1c04f5f544f911`
- **target（官方 `origin/dev`）**: `e207624c48159b03dbe17dbc8e51bbcf23e72df5`
- **短 SHA**: `e207624c48`
- **跨度**: 83 commits · 178 files · +9974 / -1297
- **发布版本**: `1.18.25` → **`1.18.29`**
- **节点影响**: 0 A-BROKEN / 2 B-HEAVY / 67 C-DRIFT / 120 D-CLEAN；**不新增、不退役节点**（189 保持）

## 硬规则

1. 中文讲解，英文标识符。节点自包含。套 `docs/llm-wiki/opencode/conventions.md` 对应模板。
2. 每条 load-bearing 论断就近 `[E: relative/path:line]`，相对 `opencode/`。行号必须落在**被断言的代码行本身**，不是上方注释、空行、或 lone `}`。
3. frontmatter: `status: verified`、`updated: e207624c48`、`evidence: explicit`（除非真是 inferred）。
4. 只写你被分配的 node `.md`，以及可选 `docs/llm-wiki/opencode/_staging/uncertainty-update-<id-last-segment>.md`。
5. **不要**改 `index.json`、`llms.txt`、`reference/uncertainty.md`、其它节点、`opencode/` 源码。
6. 发布版本现为 **1.18.29**；`bun@1.3.14`；workspace 仍 **36** 个 package。不要把 zen/go 营销文档里的模型名写成硬编码 live catalog。
7. SessionV2 / SessionRunner **仍不是默认执行路径**。两个 server 仍是 Effect HttpApi，不是 Hono。
8. 本轮**没有**新增/删除/改名模型可见 tool wire name。Azure discovery 删除不是新 tool。
9. 写完后抽 3 条 `[E]` 用 Read 对一下行号。
10. `rewrite` = 刷新 load-bearing 论断与 source/symbols，保留有用问句。`refresh` = 修正假话并重落 `[E]` 行号，不扩写。`remap` = 只删失效 source / 改假句。

## 拒绝这些过时说法

- Azure OAuth 仍有 `provider.models` hook / `az cognitiveservices account deployment list` 自动发现（**已删除**）
- Azure OAuth 会列出已有 Cognitive Services account 供 select
- `headerTimeout` / `chunkTimeout` 仍是“各 provider 自己设默认、无全局默认”；`chunkTimeout` 不能是 `false`
- GitLab (`gitlab-ai-provider`) 没有 reasoning variants
- Codex GPT 过滤器用 `parseFloat(gpt-X.Y)` 且要求必须有小数点
- Copilot chat.params 只有 `X-GitHub-Api-Version`，没有 session 级 `X-Interaction-Id`
- `ApplyPatchTool` 输出永远带 `movePath` 字段（即使空）
- SessionTools 每次把 running tool 的 `time.start` 重置为 `Date.now()`
- 发布版本仍是 `1.18.25`
- Console 没有 workspace `migrated_at` / inference proxy / quota reset
- Stats 会把 stealth 模型（`omen-alpha`）的真实 route provider 暴露出去

## D-CLEAN / 轻量节点

source 未命中或只碰 `package.json` / nix hashes：保留正文，只把 `updated` 改成 `e207624c48`；若正文写死了 `1.18.25` 则改为 `1.18.29`。
