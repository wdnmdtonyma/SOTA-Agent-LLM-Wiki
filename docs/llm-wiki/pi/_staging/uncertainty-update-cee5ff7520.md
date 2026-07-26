# update-cee5ff7520

- `[U]` 目标源码的 OAuth registry 与 Kimi provider 已提供 Kimi Coding OAuth，但 `packages/coding-agent/docs/providers.md` 的 subscription bullet 尚未列 Kimi Coding。运行时事实以源码为准；用户文档列表存在同步滞后。
- `[I]` 官方 `@earendil-works/pi-ai@0.82.1` 模型制品与目标源码的关键 source-map `sourcesContent` 一致，但 npm metadata 缺少 `gitHead`，所以不能把“该 tarball 必然由 `cee5ff7520` 构建”标为 explicit。
