# uncertainty-surface-misc-packages

本轮增量复核已收敛先前的 2 条 source-scope `[U]`:

- `PackageSource` 的完整 schema 已由 `settings-manager.ts` 纳入 source set，并与 `package-manager.ts` 的消费形状交叉核对。
- `pi config` 的 package 启停与 project/global 写入入口已由 `cli/config-selector.ts` 和 `package-manager-cli.ts` 纳入 source set。
