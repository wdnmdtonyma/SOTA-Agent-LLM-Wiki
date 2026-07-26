# Uncertainty Batch AR

- `server.plugin-system`: 目标源码树中没有 `packages/core/src/plugin/boot.ts`；当前可证 boot path 是 `packages/core/src/plugin/internal.ts` 的 `PluginInternal`，但旧 `PluginBoot` 名称没有直接 replacement。
- `tool.grep`: V2 `grep` 的 `path` schema 字段使用 `RelativePath`，但 `packages/schema/src/schema.ts` 中 `RelativePath` 当前只是 string brand；`packages/core/src/tool/grep.ts` 使用 `path.resolve(location.directory, input.path ?? ".")`，所以 relative input 可证以 Location 为根，但 absolute input 是否会被上游 codec/schema 拒绝、或是否对应 description 中的 absolute managed tool-output file，本轮未完全确认。
- `tool.grep`: V1 symlink-alias 输出测试在 Windows 明确跳过，平台一致性尚未验证；symlink-to-file 也没有测试，当前“搜索 real file 的父目录、按 requested file dirname 重建结果”的组合可能产生 sibling-style 展示路径。[U]
