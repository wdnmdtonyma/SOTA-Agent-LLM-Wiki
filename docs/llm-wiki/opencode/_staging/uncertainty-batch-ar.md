# Uncertainty Batch AR

- `server.embedded-public-api`: `packages/core/src/public/*` 已从 8b68dc0d7 源码树移除；当前可证 same-process embedding surface 是 `SessionV2` / `ApplicationTools` / `SessionExecutionLocal` / `LocationServiceMap` 等 Effect services，但旧 `OpenCode` public facade 是否有命名等价 replacement 未在本轮源码阅读中确认。
- `server.plugin-system`: `packages/core/src/plugin/boot.ts` 已从 8b68dc0d7 源码树移除；当前可证 boot path 是 `packages/core/src/plugin/internal.ts` 的 `PluginInternal`，但旧 `PluginBoot` 名称没有直接 replacement。
- `tool.grep`: V2 `grep` 的 `path` schema 字段使用 `RelativePath`，但 `packages/schema/src/schema.ts` 中 `RelativePath` 当前只是 string brand；`packages/core/src/tool/grep.ts` 使用 `path.resolve(location.directory, input.path ?? ".")`，所以 relative input 可证以 Location 为根，但 absolute input 是否会被上游 codec/schema 拒绝、或是否对应 description 中的 absolute managed tool-output file，本轮未完全确认。
