# uncertainty: subsys.agent-core.transport-proxy

- 本轮未新增 `[U]`。主节点只用 `packages/agent/src/proxy.ts` 与 `packages/agent/src/types.ts` 作为 source; provider registry、wire protocol dispatch、agent loop 消费时序均作为跨节点边界指向 `spine.provider-stream` 或 `subsys.agent-core.turn-control`,未在本节点扩展为未核验事实。
- L2 已逐条证伪 `[E]` 可核性、行号精度和过度推断风险;所有 `[E]` 引用均落在存在的 source 行内。发现并修正一处过度概括: `toolcall_end` 在 content block 类型不匹配时返回 `undefined`,不是 throw;节点已收窄为 text/thinking delta/end 与 toolcall_delta 的错误类型会 throw。另将注释/示例/纯括号行上的 `[E]` 锚点改到类型签名、request 构造、函数签名和 catch path 的代码行,并把 `StreamFn` contract 表述收窄为类型签名 + `streamProxy()` 可核实现。主节点已置 `status: verified`。
