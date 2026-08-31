# uncertainty-update · shell-exec

本批次未改 `reference/uncertainty.md`。下列 `[U]` 只记在本 staging 文件。

## 残留 [U]

1. **`Ask` 是否弹 UI** — `subsys.exec-sandbox.exec-server`
   - `ExecServerNetworkPolicyDecision::Ask` 是协议第三种决定。
   - exec-server 层不能断言 controller decider 一定会弹出 UI；也可能自动批准或拒绝。
   - 证据缺口：需要对照 controller-side `NetworkPolicyDecider` 实现，不在本节点权威范围。
