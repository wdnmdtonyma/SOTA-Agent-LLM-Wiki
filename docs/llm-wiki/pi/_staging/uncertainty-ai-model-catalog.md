# uncertainty-ai-model-catalog

- 目标 `cee5ff7520` 的 Git tree 不含最终 model-data JSON，不能仅从 commit-local 文件完整枚举模型实例。
- 本轮用官方 `@earendil-works/pi-ai@0.82.1` 制品重建目录：37 个静态 provider bucket、1,109 个 model id。tarball SHA-256 为 `2f9df9522808b621cd3449876537f03d8a8df8b8d7ec2d5b18c6a910aa85b490`，manifest structure hash 为 `1a3c7cf59ada71c94abe4540976960524ee933034491c75d6418e2abc1b42535`。
- 制品 source map 内 `model-catalog.ts` 与 `models.generated.ts` 的 `sourcesContent` 和目标源码逐字节一致，但 package metadata 没有 `gitHead`；因此制品实例归属仍是强推断 `[I]`，逐模型行不升级为 commit-local `[E]`。
- `index.json` 的 `group.models.instance_count` 已同步为 1,109；复现细节见 `_research/model-catalog-v0.82.1.md`。
