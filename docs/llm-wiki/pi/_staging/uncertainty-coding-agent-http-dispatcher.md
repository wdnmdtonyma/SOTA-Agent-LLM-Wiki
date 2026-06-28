# uncertainty: subsys.coding-agent.http-dispatcher

本轮没有新增 `[U]`。

降级为 `[I]` 的点:

- `http-dispatcher.ts` 与 `pi-ai` wire protocol dispatch 的运行时关系:source file 只显示 undici/global HTTP bootstrap,没有直接 import `pi-ai`。
- `applyHttpProxySettings()` 与 `EnvHttpProxyAgent` 组合成产品 proxy config 到 dispatcher 的桥接路径:代码可证明 env 写入和 agent 类型,但 `EnvHttpProxyAgent` 读取 env 的行为来自 undici 外部语义。
- `configureHttpDispatcher()` 调用 `undici.install?.()` 的深层动机:源码注释提到 Node 26.0 bundled fetch/compressed response 兼容性,但可执行锚点只能证明 conditional install。
- `parseHttpIdleTimeoutMs()` 与 `configureHttpDispatcher()` 的分层设计意图:代码可证明 parser 返回 `undefined`、bootstrap 抛错,设计意图属于推断。
- timeout `0` 的 disabled 语义:本 source file 把 disabled 解析为 `0` 并传给 undici timeout 字段,但 `0` 的具体 transport 行为依赖 undici。
- SDK embedding caller 会受到 process/global HTTP bootstrap 影响:related 来自 index,影响范围来自 global dispatcher/fetch 语义推断。
