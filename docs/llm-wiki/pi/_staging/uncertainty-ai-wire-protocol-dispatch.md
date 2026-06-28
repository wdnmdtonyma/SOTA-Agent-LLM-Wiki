# uncertainty: subsys.ai.wire-protocol-dispatch

L2 核验后未新增 `[U]`。核心 dispatch 结论可落到 `models.ts`、`api/lazy.ts`、`types.ts` 及代表性 `api/<name>.lazy.ts` / `api/<name>.ts` 源码。

本轮将以下过度外推从硬 `[E]` 收紧为 `[I]` 或补充更精确证据:

- dispatch 层“不构造 payload / 不做 event normalization”属于由 `ProviderStreams` contract 推出的职责边界,已拆成 contract `[E]` + 边界判断 `[I]`。
- `lazyStream` 对 caller 失败形态的影响、README/provider 名称不是 ground truth、下游 agent/coding-agent 不绕过 `Models` 的边界判断,均按推断标为 `[I]`。
- `StreamFunction` 函数形状改用 type alias 与事件协议代码行支撑;`ProviderStreams` module 注释不再作为 `[E]` 行号使用;message transform 调用点补充了更精确行号。
