# uncertainty-ai-model-catalog

- 目标 `a8ee03b815` 的 Git tree 不含最终 model-data JSON，不能仅从 commit-local 文件完整枚举模型实例。
- 本轮用官方 `@earendil-works/pi-ai@0.83.0` 制品重建目录：37 个静态 provider bucket、1,153 个 model id。tarball SHA-256 为 `f983c28a21209305ed9c274977e29130fa4d8848df6cdf37e9094d95cc7bc6d4`，manifest structure hash 为 `5d82f5b1946bdf6d01733aa2a4e4410849c6d44a2ad3038171078c17aed367ce`。
- registry metadata 的 `gitHead=845d6ff1f6643aba440341cce877ce1c43ebbc39` 是目标提交祖先；release→target 的 generator diff 只把两个 Fireworks Kimi K3 rows 调整为 OpenAI Completions wire，不改变 membership。由于目标 tree 仍不保存生成 JSON，逐模型行继续标为强推断 `[I]`。
- `index.json` 的 `group.models.instance_count` 已同步为 1,153；复现细节见 `_research/model-catalog-v0.83.0.md`。
