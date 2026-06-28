# uncertainty-coding-agent-resource-loader

- [I] resource-loader 被描述为 aggregation/orchestration layer: 代码可证它组合 package manager、extension/skill/prompt/theme loaders 和缓存 getter, 但源码没有直接使用这个命名。
- [I] getter 被描述为不触发新 filesystem scan: 代码可证 getter 只返回字段, 但没有测试文件在本节点 source 列中专门断言该行为。
- [I] order 会影响最终 loader 输入顺序: `mergePaths()` 保留第一次出现路径并按输入顺序 push, 但具体 precedence 的用户可见语义还需要结合 package-manager 和 downstream loaders 验证。
- [I] override hooks 被描述为 injection seam: options 和应用位置可证, 但本节点未读取调用方或测试来确认主要用途。
- [I] `getDefaultSourceInfoForPath()` fallback 对不存在路径可能 throw: 代码中 fallback 直接 `statSync(normalizedPath)`, 但通常是否可达取决于上游 metadata/path validation。

No unresolved [U] items found while reading the listed source files.
