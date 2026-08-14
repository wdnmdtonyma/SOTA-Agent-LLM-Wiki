# uncertainty · subsys.core.agent-tool-presentation

- `packages/core/agent-tool-presentation/src/index.ts` 在 `apply` 的 `code`/`both` 分支旁注释写：缺 `codeRuntime` 时 entry pending，`dsh-agent-presets` 激活审计会点名该行。同包测试注释重复这一合同，但测试本身只 `plugin()` 本行，不断言 `mountPreset` 抛错。
- 可执行路径：静态 `inject = ['tools']`。`ctx.inject(['codeRuntime'], …)` 建的是子 fiber。`inactiveRows`（`packages/preset/agent-presets/src/mount.ts`）只读 loader entry 的 `fiber.inject` 键。缺 runtime 时 entry 的 `tools` 已满足，审计**不会**写出 `tool-presentation … waiting for codeRuntime`。
- 单测钉死的可见后果：`row.ctx.get('codeRuntime') === undefined`，`assemble` 仍是部署默认（native `echo`）；runtime 后到再投影。
- 以测试 / `inactiveRows` 实现为准写正文；「mount 一定失败并点名本 id」标 `[U]`。若后续让 `inactiveRows` 下钻动态 `ctx.inject` 子 fiber，或把 `codeRuntime` 写进 yml/`inject` 元数据，删这条。
