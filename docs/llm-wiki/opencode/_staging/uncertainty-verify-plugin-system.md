# uncertainty-verify-plugin-system

- node: `server.plugin-system`
- SHA: `9f69463f1d`
- claim: 目标源码中没有 `packages/core/src/plugin/boot.ts`；旧 `PluginBoot` 是否有一对一命名 replacement 仍不确定。
- status: still `[U]`
- inspected: `packages/core/src/plugin/` has `internal.ts` (`PluginInternal.boot`) but no `boot.ts`. Current built-in boot is `PluginInternal`, not a named `PluginBoot` successor.
