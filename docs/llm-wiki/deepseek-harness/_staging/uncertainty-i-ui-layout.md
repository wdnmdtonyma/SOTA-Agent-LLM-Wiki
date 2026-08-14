# uncertainty · subsys.client.ui-layout

- **官方 README 仍写第四个子槽是 `conversation.empty`。** `packages/client/ui-layout/README.md` / `README.zh.md` 说 `register` 进 `'root'` 后声明 `sidebar` / `conversation` / `details` / `conversation.empty`。源码 `packages/client/ui-layout/src/client/index.ts` 的 `children` 表第四项是 `'shell.overlay': { kind: 'list', scope: 'root' }`，SlotMap 同期合并也是这四个键。`AppFrame` 的测试 stub 仍能接到 `conversation.empty` 这个 key，但生产 `renderSlot` 只点名那四个声明键。wiki 跟代码。

- **`apply.client.spec.ts` 只钉三个子槽 spec。** 「provides ctx.layout and registers AppFrame…」用例断言 `sidebar` / `conversation` / `details`，注释写 “three child declarations”，没有 `slots.spec('shell.overlay')`。ledger 里仍有第四个 list 声明；wiki 跟 `register` 实参。

- **runtime `SlotMap['root']` 注释称动态条目会被赋更低 priority 从而赢。** `packages/client/runtime/src/client/slots.ts` 的 JSDoc 说 second entry shadows、dynamically registered entry 被 assign 更低 priority。`SlotCore.register` 只在相同 `priority`（缺省 0）抛 `already has a registration`；没有检索到自动改 priority 的赋值。阴影要调用方显式传更低 `priority`。wiki 跟可执行合同，不跟那句 JSDoc 的自动赋值。
