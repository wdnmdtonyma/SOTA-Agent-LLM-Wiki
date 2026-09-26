# uncertainty-update-code-mode

- `dsh-agent-tool-presentation` 模块 JSDoc 与 `agent-tool-presentation.spec.ts` 注释写：缺 `ptcRuntime` 时 PTC 行在 **mount 失败**，且 `dsh-agent-preset-registry` 激活审计会点名该 `id`。可执行断言：`row.ctx.get('ptcRuntime') === undefined`，`assemble` 保持 native `echo`，直到之后 `ctx.plugin(StubRuntime)` 才切到 `[run_code]`。静态 `inject = ['tools']`；等 `ptcRuntime` 的是 `apply` 里另开的子 fiber。wiki 跟测试；「mount 一定失败」标 `[U]`。
