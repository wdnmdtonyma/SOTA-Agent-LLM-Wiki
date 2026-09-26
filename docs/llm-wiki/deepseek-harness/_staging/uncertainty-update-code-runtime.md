# uncertainty-update-code-runtime

- 与 `uncertainty-update-code-mode.md` 同一条：`apply` JSDoc 写缺 host `ptcRuntime` 则 preset mount 失败并点名 `tool-presentation`。静态 `inject = ['tools']`。单测钉死 pending + native `echo`。wiki 跟测试。
- 「`sdk-minimal` 无 `ptc-runtime`」来自对 `packages/bundle/sdk-minimal/cordis.patch.yml` 的全文检索（无该字符串），标 `[I]`。若以后 `sdk-minimal` spec 补一行 `rows.filter(id === 'ptc-runtime').toHaveLength(0)`，可升为 `[E]`。
