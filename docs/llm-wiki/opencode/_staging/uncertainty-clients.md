# uncertainty-clients

- `clients.app-compatibility`: current SSE 重连不发送 `Last-Event-ID`，仓内只看到 missed promoted input 的单条 hydrate；一般事件缺口最终能否收敛没有可证的客户端 contract。[U]
- `clients.app-compatibility`: timeline rows 按传入的 current message source 顺序构造，不自行按 timestamp 或 event sequence 排序；该输入顺序是否总等于 durable aggregate sequence 尚未在 App 层证明。[U]
- `clients.app-compatibility`: migration checklist 把 current PTY connect-token 标为完成，但目标 App 中 `api.pty.connectToken` 调用与 no-ticket guard 仍被注释，同时仍尝试创建 current WebSocket；App 源码不能证明 ticketless handshake 能成功，也不能证明这条 path 的预期 authorization contract。[U]
