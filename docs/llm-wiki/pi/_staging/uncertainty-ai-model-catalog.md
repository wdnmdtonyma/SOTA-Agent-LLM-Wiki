# uncertainty-ai-model-catalog

- 目标 `c1019d9202` 的 Git tree 不含最终 model-data JSON，不能仅从 commit-local 文件完整枚举模型实例。
- 官方 `@earendil-works/pi-ai@0.83.0` 制品提供 Baseten 之前的 37 buckets / 1,153 models baseline；target 新增第 38 个 Baseten structural bucket。
- `2026-08-03T13:10:07Z` 下载的 models.dev snapshot（SHA-256 `b3a52ba98bb4b58714734f8bb98c9bc7ffeff3558f915bcc3211cfe5f276728d`）含 18 个 Baseten rows，按 target generator 排除 2 个 deprecated 后为 16；因此 target catalog 口径为 1,169，仍标强推断 `[I]`。
- `index.json` 的 `group.models.instance_count` 已同步为 1,169；复现细节见 `_research/model-catalog-baseten-c1019d9202.md`。
