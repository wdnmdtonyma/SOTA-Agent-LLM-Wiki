# uncertainty · surface-api

- `plugin-api.v1-hooks`: `permission.ask` is declared in `packages/plugin/src/index.ts`, but this batch did not find a V1 call site matching `plugin.trigger("permission.ask", ...)`. Verify whether the hook is intentionally vestigial, invoked through another mechanism, or awaiting implementation.
