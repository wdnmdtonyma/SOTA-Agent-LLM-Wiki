---
id: ref.uncertainty
path: reference/uncertainty.md
title: 不确定项日志
kind: reference
tier: T3
source: []
status: verified
updated: 7750465934
evidence: unknown
---

> 全仓 `[U]`(待查/待证实)汇总,由各填充任务的 _staging/uncertainty-*.md 合并而来;每次 reconcile 重新生成。

## uncertainty-7750465934

- [U] Remote Code Mode 的 process-owned host transport 支持 `ws://`/`wss://`，但目标树不足以证明部署层另有统一认证或 TLS 强制策略；不能从 transport 能力推出生产部署安全保证。
- [U] Paginated thread 的 multi-segment lineage 当前不支持 incremental item replay；跨该边界的未来兼容策略尚未由目标源码定义。
- [U] exec-server network callback 返回 `Ask` 不保证一定出现 UI；最终结果还受 approval policy、permission profile、client callback 和连接存活状态约束。
- [U] `respect_system_proxy` 仍是 under-development/default-off；PAC 只选择一个解析后的 route，当前实现没有候选间 failover，不能视为完整浏览器代理语义。
- [U] Windows TCP process attribution 当前只覆盖 IPv4；IPv6 连接的 attribution 行为不能从现有实现外推。
- [U] dynamic skill selector 仍是 shadow-selection path，不能写成已成为稳定的用户可见选择协议。
- [U] remote plugin disk cache 的源码注释把它描述为迁移期机制；其长期持久化格式不是稳定契约。
