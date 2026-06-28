# uncertainty: coding-agent package-manager

## subsys.coding-agent.package-manager

- [I] `PackageSource` 的完整 public settings schema 不在本节点 index source 的两个文件中定义;本节点只从 `package-manager.ts` 的 import、string/object 分流和 `PackageFilter` 使用推断 object filter 语义,完整字段解释应由 `surface.misc.packages` 或 settings/catalog 节点覆盖。
- [I] package-manager 与 resource-loader 的职责边界来自 `PackageManager.resolve()`/`resolveExtensionSources()` 的返回形状和 `DefaultResourceLoader` 已有节点,本节点未重新引用 resource-loader 源文件以保持 source 范围只覆盖 index 指定文件。
- [U] 无。当前节点没有必须写入 central `reference/uncertainty.md` 的未知项。
