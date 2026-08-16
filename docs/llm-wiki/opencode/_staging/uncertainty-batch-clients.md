# uncertainty-batch-clients

- `clients.app-compatibility`: timeline turns 仍按传入的 current `session_message` source 顺序构造；optimistic user 才按 `compareMessages`（`time.created + id`）插入。该 source 顺序是否总等于 durable aggregate sequence 尚未在 App 层证明。[U]
- `clients.app-compatibility`: current SSE 重连不发送 `Last-Event-ID`，仓内只看到 missed promoted input 的单条 hydrate；一般事件缺口最终能否收敛没有可证的客户端 contract。[U]
- `clients.app-compatibility`: migration checklist 把 current PTY connect-token 标为完成，但 App 源码不能证明 ticketless current handshake 能成功，也不能证明这条 path 的预期 authorization contract。[U]
