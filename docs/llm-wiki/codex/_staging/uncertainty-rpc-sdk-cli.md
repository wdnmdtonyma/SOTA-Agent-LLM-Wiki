# uncertainty — rpc-sdk-cli (`9ded177ce7`)

本批 assigned 节点正文没有留下 `[U]`。

已核清但不写入节点的边界：

- 研究笔记写 `client_request_definitions` wire 名 153；目标 `common.rs` 宏实例实数是 **144**。以源码宏实例为准，不把 153 标成不确定。
- `account/usage/read` 只有这一条 usage client request。`GetAccountTokenUsageParams.thread_id` 让同一方法覆盖 account-wide 与 thread estimated usage，不是第二条 wire。
- `client-libs.md` 里 test-client / remote handshake 后半控制流部分行号只做了局部重核；未再逐条重走 `app-server-test-client` 全部 login/approval 路径。当前节点未对那些旧细节标 `[U]`。
