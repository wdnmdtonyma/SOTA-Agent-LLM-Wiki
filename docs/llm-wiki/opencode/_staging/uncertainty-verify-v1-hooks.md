# uncertainty-verify-v1-hooks

- node: `plugin-api.v1-hooks`
- SHA: `9f69463f1d`
- claim: `permission.ask` is declared on V1 `Hooks`, but no `plugin.trigger("permission.ask", ...)` call site exists in V1 source.
- status: still `[U]`
- inspected: `rg 'trigger\(["'\'']permission\.ask' opencode/packages` returned no matches. `packages/plugin/src/index.ts:261` still declares the hook. Nearby `permission.ask({` hits are the permission service, not the plugin hook.
