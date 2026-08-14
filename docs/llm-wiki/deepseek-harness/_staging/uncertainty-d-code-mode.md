# uncertainty · subsys.core.code-mode

- `dsh-agent-tool-presentation` 模块 JSDoc 与 `agent-tool-presentation.spec.ts` 注释写：缺 `codeRuntime` 时 Code Mode 行在 **mount 失败**，且 `dsh-agent-presets` 激活审计会点名该 `id`。可执行断言与 `inactiveRows` 只读静态 `entry.fiber.inject`（该行是 `inject: ['tools']`）：`row.await()` 成功，`assemble` 保持 native `echo`，直到之后 `ctx.plugin(StubRuntime)` 才切到 `[run_code]`。以测试断言 / `packages/preset/agent-presets/src/mount.ts:295` 为准。注释、JSDoc、以及 `code/agent.cordis.yml` 里「fails this preset at mount」是否会再对齐待查。
