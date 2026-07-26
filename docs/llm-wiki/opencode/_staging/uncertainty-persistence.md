# persistence batch uncertainty

- `persistence.repository-cache`: branchless refresh 依赖本地 `refs/remotes/origin/HEAD`；upstream 默认分支变化或 symbolic ref 缺失时的长期行为没有测试覆盖。[U]
- `persistence.repository-cache`: branch 名只做 URI encoding 后进入 cache path；大小写不敏感文件系统上的 branch-name case collision 尚未覆盖。[U]
