# uncertainty-update — broken-core (c291e7961a)

- **fork 继承父 pending。** 旧合同用 `seedLength` 跳过父队列；现行 `ReactLoopInbox` 投影 fold 继承前缀，`inbox.spec.ts` 钉 `childInbox.nextTurn` 等于父当时未 claim 的消息。不要再写「子 inbox 从空队列开始」。
- **同步读 API 已弃用。** `eventAt()` / `snapshotEvents()` / `ownEvents()` 源码标 deprecated。生产路径应走 projection / 现行读合同。message-feedback live 核对仍调用 `snapshotEvents()`（标 `[I]`），不要写成推荐路径。
- **没有 `ctx.agent` DX accessor。** `ReactLoopAgent` 用 `createScope(loopCtx, this)`，不再 `extend({ agent: this })`。分层读 `scopeOf(ctx)`；`setup` 的第二个参数才是子 handle。
- **message-feedback 不再是 storage-domain 消费者。** `packages/feedback/message-feedback/src/spec.ts` 已删。`inject = ['sessionPersistence', 'sessions']`；事件是 `feedback/message-put` / `feedback/message-delete`。不要在 `$DSH_HOME/storages/` 下找 `message_feedback`。
- **`DetailsPanel.tsx` 已删。** ui-chat 不占 `details`；`openFile` 走 `sidebarRight.openResource`。右侧栏架构不在本批展开。
- **`request/header` 不再带 `system` 字符串。** system prompt 走 `system/message`；invariant 断言 `options.system === undefined`。`SESSION_FORMAT_VERSION = 3`。
