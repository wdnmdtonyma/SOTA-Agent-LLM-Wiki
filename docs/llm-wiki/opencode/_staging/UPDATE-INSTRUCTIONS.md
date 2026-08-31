# UPDATE INSTRUCTIONS — opencode wiki 3fd77ae980 → 9f69463f1d

> 给 filler / L2 verifier 用。事实以 `opencode/` checkout `9f69463f1d` 为准，不以本文件或 update-facts 转述为准。写前必须打开被引用的源文件。

## 目标

- **base（上一轮 verified）**: `3fd77ae980c9e68eccd10f1c396f32c6e3965046`
- **target（官方 `origin/dev`）**: `9f69463f1d556af2b5b51d2efa1c04f5f544f911`
- **短 SHA**: `9f69463f1d`
- **跨度**: 181 commits · 396 files · +19284 / -5924（非 i18n/docs 语义约 258 files / +14523 / -2426）

## 硬规则

1. 中文讲解，英文标识符。节点自包含。套 `docs/llm-wiki/opencode/conventions.md` 对应模板。
2. 每条 load-bearing 论断就近 `[E: relative/path:line]`，相对 `opencode/`（即 `Best/opencode/`）。行号必须落在**被断言的代码行本身**，不是上方注释、空行、或 lone `}`。
3. frontmatter: `status: verified`（L2 前可先 `draft`，本轮 filler 写完用 `draft`，verifier 改 `verified`）、`updated: 9f69463f1d`、`evidence: explicit`（除非真是 inferred）。
4. 只写你被分配的 node `.md`，以及可选 `docs/llm-wiki/opencode/_staging/uncertainty-update-<id-last-segment>.md`。
5. **不要**改 `index.json`、`llms.txt`、`reference/uncertainty.md`、其它节点、`opencode/` 源码。
6. `source:` 里已删除的路径必须删掉：`.github/workflows/beta.yml`、`packages/stats/app/src/routes/geo-map.ts`、`packages/console/app/src/routes/black/subscribe/[plan].tsx`。
7. 发布版本现为 **1.18.25**；`bun@1.3.14`；workspace 仍 **36** 个 package。不要把 zen/go 营销文档里的模型名写成硬编码 live catalog。
8. SessionV2 / SessionRunner **仍不是默认执行路径**。两个 server 仍是 Effect HttpApi，不是 Hono。
9. 本轮**没有**新增/删除模型可见 tool wire name。Cerebras 是 V1 plugin，不是新 tool。
10. 写完后抽 3 条 `[E]` 用 Read 对一下行号。

## 新节点（仅 1 个）

| id | path | 为什么独立 |
|---|---|---|
| `config.v2-compat` | `surface/config/v2-compat.md` | V1 loader 的 V2-shaped 文件投影层；不是 `config.migration`（那是 V1→V2 in-memory migrate），也不该把整张映射表塞进 `persistence.config-loading`。 |

Console/Stats 的 requestBody / pricing / lite-usage / auth-redirect / retention **不要**拆新节点，写进既有 `clients.console` / `peripheral.stats`。

## 语义必须改的既有节点

见 `update-facts-9f69463f1d.md`。拒绝这些过时说法：

- Qwen 仍固定 `temperature=0.55` / `topP=1`
- `textVerbosity: "low"` 只要 gpt-5.x 且非 azure 就注入（现仅 `@ai-sdk/openai` 或 `@ai-sdk/amazon-bedrock/mantle`）
- Bedrock 因非空 reasoning text 就保留 reasoning（现必须有 signature / redactedContent / redactedData）
- Cloudflare AI Gateway 一律 `createUnified({ apiKey })`
- Azure 只有 API key stub（现有完整 Azure CLI Entra OAuth）
- `finish: "unknown"` 会结束 V1 prompt loop
- `opencode run` 只应答 root session 的 `permission.asked`
- TaskTool 子 agent 失败时静默返回空串
- V1 config load 直接 `ConfigParse.schema`，没有 `ConfigV2Compat.lower`
- Stats 仍有 `geo-map.ts` / d3 世界地图
- CI 仍有 hourly `beta.yml`；没有 `unlock.yml`
- 版本仍是 1.18.18

## D-CLEAN / 轻量节点

source 未命中或只碰 `package.json` / nix hashes：保留正文，只把 `updated` 改成 `9f69463f1d`；若正文写死了 `1.18.18` 则改为 `1.18.25`。
