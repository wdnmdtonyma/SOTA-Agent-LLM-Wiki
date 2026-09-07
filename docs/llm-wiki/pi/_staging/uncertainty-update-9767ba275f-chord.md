# uncertainty-update-9767ba275f-chord

- **invoke 不做递归 JSON 校验**（`subsys.chord.runtime` / `subsys.chord.delta`）：`RemoteServiceProvider.invoke` 把 `call.args` 原样交给 method，返回值只断言成 `JsonValue | undefined`，源码里没有 `isJsonValue()` 调用。PLANNING.md 也写 runtime 把深度校验留给 serializer。页内标 `[I]`。若后续在 invoke 路径加上 runtime 检查，应升为 `[E]` 并改 gotcha。
- **对称 RPC peer 未落地**（`subsys.chord.runtime`）：README 写 “Symmetric RPC peers are planned”。当前公开面是 `RemoteServiceTransport` + `createRemoteServiceEndpoint`，不是双向 RPC 会话。未当 shipped API 写。
- **Context 不过业务 JSON 线**（`subsys.chord.runtime`）：consumer 把 trailing `Context` 从 args 剥掉，provider 在接收端再拼上本地 context。没有看到把 `Context` 编进 `ServiceCall.args` 的代码。标 `[I]`：这是调用约定，不是单独的 wire schema 字段。
