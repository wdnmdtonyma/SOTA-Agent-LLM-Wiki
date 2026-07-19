# uncertainty-ai-model-catalog

- 本轮按目标 commit 的 35 个已提交 `*.models.ts` structural shards 重建 `ref.ai.model-catalog`：1069 个 model id、1069 个目录行，未发现 key/id/provider 结构不一致或跨 shard 混用 provider。
- 完整 name/cost/context 等 values 已移到 gitignored `src/providers/data/*.json`，当前 checkout 无法把这些字段作为 commit-local `[E]`；引用页因此只枚举可静态核证的 id/provider/api，并把完整 JSON bundle 的生成、验证和发布交给 `subsys.ai.model-catalog-publication`。
- `index.json` 的 `group.models.instance_count` 已同步为 1069；本轮没有遗留 `[U]`。
