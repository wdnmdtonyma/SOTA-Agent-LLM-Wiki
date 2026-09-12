# uncertainty-update-package-index

- `UPDATE-INSTRUCTIONS.md` 写「叶 `packages/**/package.json` = 275（无 `@fixture/*`）」。源码 `find packages -name package.json` 在 `c291e7961a` 确实是 **275**，但其中 **7** 个是 `packages/typert/generator/tests/fixtures/**` 的 `@fixture/*`。产品叶 `packages/<group>/<pkg>/package.json` 是 **268**。本页按源码写清两层计数，不以指令转述为准。
- `pnpm-workspace.yaml` 另含 `benchmarks`（不是根 `package.json` `workspaces` 成员）。未把 benchmarks 收进实例表。
