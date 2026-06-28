# uncertainty: subsys.ai.message-transform

L2 核验后 `subsys.ai.message-transform` 未保留 `[U]`。已收紧两处表述:thinking 空内容补充同模型 `thinkingSignature` 豁免,`thoughtSignature` 删除逻辑去掉未由本文件直接证明的 provider 归属描述。核心行为均可落到 `packages/ai/src/api/transform-messages.ts`;provider wire 前的边界用调用该函数的 serializer 行作为代表性证据,更完整的 dispatch 表留给 `subsys.ai.wire-protocol-dispatch` / wire catalog 节点。
