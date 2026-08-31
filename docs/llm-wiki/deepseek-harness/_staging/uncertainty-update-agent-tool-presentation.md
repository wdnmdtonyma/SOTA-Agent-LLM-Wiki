# uncertainty · subsys.core.agent-tool-presentation

- `inactiveRows` 只读 loader entry 的静态 `fiber.inject`。`mode: ptc`/`both` 对 `codeRuntime` 的 wait 发生在 `apply` 内 `ctx.inject` 子 fiber，因此缺 runtime 时 `presentAs` 不跑、装配回落 native，但 `mountPreset` 不一定因本行失败。与源码注释「激活审计点名本行」意图不一致；代码合同只实现一半。
