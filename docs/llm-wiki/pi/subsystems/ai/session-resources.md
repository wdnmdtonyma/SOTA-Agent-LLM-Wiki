---
id: subsys.ai.session-resources
title: 会话资源清理
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/session-resources.ts
symbols:
  - registerSessionResourceCleanup
  - cleanupSessionResources
related:
  - subsys.ai.openai-codex-responses
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.ai.session-resources` 描述 `pi-ai` 的 session resource cleanup registry: provider 或 wire adapter 注册一个可按 `sessionId` 清理资源的 callback, session 生命周期结束时由调用方触发统一清理。

## 能回答的问题

- `registerSessionResourceCleanup()` 保存 callback 后返回什么, 谁负责取消注册?
- `cleanupSessionResources(sessionId)` 如何把 session id 传给每个 cleanup callback?
- cleanup callback 抛错时, registry 会停止、吞错还是聚合抛错?
- registry 是否自己维护 per-session key, 还是让 callback 自己解释 `sessionId`?
- OpenAI Codex Responses 的 WebSocket session cache 如何挂到这个 registry?

## 职责边界

`session-resources.ts` 是一个极小的进程内 registry: 它只定义 `SessionResourceCleanup` callback 类型、一个 module-scope `Set`、注册函数和触发函数 [E: packages/ai/src/session-resources.ts:1] [E: packages/ai/src/session-resources.ts:3] [E: packages/ai/src/session-resources.ts:5] [E: packages/ai/src/session-resources.ts:12]。这个文件不创建 session、不关闭任何具体资源,也不持有资源句柄;具体资源释放逻辑由注册进来的 callback 实现 [E: packages/ai/src/session-resources.ts:1] [E: packages/ai/src/session-resources.ts:16] [I]。

`pi-ai` 通过主入口和 compat 入口转出 `session-resources.ts`; `pi-coding-agent` 的 `AgentSession` 从 `@earendil-works/pi-ai/compat` 导入 `cleanupSessionResources`,并在会话断开 agent、清空事件监听之后用当前 `this.sessionId` 触发 cleanup [E: packages/ai/src/index.ts:27] [E: packages/ai/src/compat.ts:26] [E: packages/coding-agent/src/core/agent-session.ts:30] [E: packages/coding-agent/src/core/agent-session.ts:37] [E: packages/coding-agent/src/core/agent-session.ts:769] [E: packages/coding-agent/src/core/agent-session.ts:770] [E: packages/coding-agent/src/core/agent-session.ts:771]。因此这个 registry 属于 `ai` 包,但它的生命周期触发点可以来自 `coding-agent` 会话层 [I]。

## 关键文件

- `packages/ai/src/session-resources.ts`: 定义 session resource cleanup callback 类型、module-scope registry、注册/注销 API、执行 cleanup 的错误聚合策略 [E: packages/ai/src/session-resources.ts:1] [E: packages/ai/src/session-resources.ts:3] [E: packages/ai/src/session-resources.ts:5] [E: packages/ai/src/session-resources.ts:12] [E: packages/ai/src/session-resources.ts:22]。
- `packages/ai/src/api/openai-codex-responses.ts`: Codex Responses wire adapter 导入 `registerSessionResourceCleanup`,并把自己的 WebSocket session cache close helper 注册为 session resource cleanup callback [E: packages/ai/src/api/openai-codex-responses.ts:25] [E: packages/ai/src/api/openai-codex-responses.ts:833] [E: packages/ai/src/api/openai-codex-responses.ts:850]。
- `packages/coding-agent/src/core/agent-session.ts`: `AgentSession.dispose()` 在清理 session 时调用 `cleanupSessionResources(this.sessionId)` [E: packages/coding-agent/src/core/agent-session.ts:755] [E: packages/coding-agent/src/core/agent-session.ts:771]。

## 数据模型

`SessionResourceCleanup` 的签名是 `(sessionId?: string) => void`,所以 registry 可以用具体 session id 或缺省参数调用 callback;缺省调用是否代表全局 cleanup 由 callback 自己定义 [E: packages/ai/src/session-resources.ts:1] [E: packages/ai/src/session-resources.ts:16] [I]。registry 本体是 `Set<SessionResourceCleanup>`,这意味着同一个函数对象重复注册时只保留一个 entry,而不同函数对象按 Set 迭代顺序执行 [E: packages/ai/src/session-resources.ts:3] [I]。

`registerSessionResourceCleanup(cleanup)` 只把 callback 加入 `sessionResourceCleanups`,随后返回一个 disposer;调用 disposer 会把同一个 callback 从 Set 中删除 [E: packages/ai/src/session-resources.ts:5] [E: packages/ai/src/session-resources.ts:6] [E: packages/ai/src/session-resources.ts:7] [E: packages/ai/src/session-resources.ts:8]。源码没有为 callback 绑定 owner、provider id 或 session id,所以 keying 不在 registry 层完成 [E: packages/ai/src/session-resources.ts:3] [E: packages/ai/src/session-resources.ts:6] [I]。

## 控制流

1. `registerSessionResourceCleanup@packages/ai/src/session-resources.ts:5` 接收一个 cleanup callback,把它加入 module-scope Set,再返回删除该 callback 的 disposer [E: packages/ai/src/session-resources.ts:5] [E: packages/ai/src/session-resources.ts:6] [E: packages/ai/src/session-resources.ts:7] [E: packages/ai/src/session-resources.ts:8]。
2. `cleanupSessionResources@packages/ai/src/session-resources.ts:12` 初始化 `errors` 数组,然后遍历当前 Set 中的每个 cleanup callback [E: packages/ai/src/session-resources.ts:12] [E: packages/ai/src/session-resources.ts:13] [E: packages/ai/src/session-resources.ts:14]。
3. 每个 callback 都收到同一个 `sessionId` 参数;callback 抛出的异常被捕获并推入 `errors`,不会阻止后续 callback 继续执行 [E: packages/ai/src/session-resources.ts:15] [E: packages/ai/src/session-resources.ts:16] [E: packages/ai/src/session-resources.ts:17] [E: packages/ai/src/session-resources.ts:18]。
4. 所有 callback 尝试完成后,只要 `errors.length > 0`,函数就抛出 `AggregateError(errors, "Failed to cleanup session resources")` [E: packages/ai/src/session-resources.ts:21] [E: packages/ai/src/session-resources.ts:22]。

## Keying 与 edge

registry 的唯一内置 key 是 callback 函数对象本身,不是 session id [E: packages/ai/src/session-resources.ts:3] [E: packages/ai/src/session-resources.ts:6] [I]。`sessionId` 只是 cleanup 执行时传入 callback 的可选参数;是否把它解释成 per-session cache key,由具体 callback 自己决定 [E: packages/ai/src/session-resources.ts:1] [E: packages/ai/src/session-resources.ts:16] [I]。

`cleanupSessionResources(undefined)` 会把 `undefined` 原样传给每个 cleanup callback,registry 本身不会把缺省 session id 转成“全部 session”语义 [E: packages/ai/src/session-resources.ts:12] [E: packages/ai/src/session-resources.ts:16] [I]。Codex 的 `closeOpenAICodexWebSocketSessions` 自己实现了这个约定: 有 `sessionId` 时只关闭并删除该 session 的 cached socket,没有 `sessionId` 时遍历并清空整个 WebSocket session cache [E: packages/ai/src/api/openai-codex-responses.ts:833] [E: packages/ai/src/api/openai-codex-responses.ts:838] [E: packages/ai/src/api/openai-codex-responses.ts:841] [E: packages/ai/src/api/openai-codex-responses.ts:844] [E: packages/ai/src/api/openai-codex-responses.ts:847]。

注册 disposer 只从 Set 里删除 callback,不会主动调用 callback 或清理既有资源 [E: packages/ai/src/session-resources.ts:7] [E: packages/ai/src/session-resources.ts:8] [I]。如果 callback 执行期间修改 registry,后续迭代行为遵循 JavaScript `Set` 迭代语义,源码没有额外快照或排序层 [E: packages/ai/src/session-resources.ts:14] [I]。

## 与 Codex Responses 的关系

[subsys.ai.openai-codex-responses](openai-codex-responses.md) 是当前可见的 session resource cleanup 注册者: 它在模块顶层调用 `registerSessionResourceCleanup(closeOpenAICodexWebSocketSessions)` [E: packages/ai/src/api/openai-codex-responses.ts:850]。`closeOpenAICodexWebSocketSessions` 负责清掉 Codex WebSocket cache entry 的 idle timer,用 close code `1000` 和 reason `"debug_close"` 调用静默 close helper,并从 `websocketSessionCache` 删除对应 entry 或清空全部 entry [E: packages/ai/src/api/openai-codex-responses.ts:833] [E: packages/ai/src/api/openai-codex-responses.ts:834] [E: packages/ai/src/api/openai-codex-responses.ts:835] [E: packages/ai/src/api/openai-codex-responses.ts:836] [E: packages/ai/src/api/openai-codex-responses.ts:841] [E: packages/ai/src/api/openai-codex-responses.ts:847] [E: packages/ai/src/api/openai-codex-responses.ts:937] [E: packages/ai/src/api/openai-codex-responses.ts:939] [E: packages/ai/src/api/openai-codex-responses.ts:940]。

这个关系把 `ai` 包里的长期连接资源与上层 session 生命周期解耦: Codex wire adapter 只声明“如何按 session id 关闭自己的 cache”,而 `AgentSession.dispose()` 负责在 session 清理路径调用通用 cleanup 入口 [E: packages/ai/src/api/openai-codex-responses.ts:850] [E: packages/coding-agent/src/core/agent-session.ts:755] [E: packages/coding-agent/src/core/agent-session.ts:771] [I]。

## 跨包边界

`subsys.ai.session-resources` 只覆盖 `pi-ai` registry 语义; `subsys.coding-agent.agent-session` 应覆盖 `AgentSession.dispose()` 何时被调用,以及为什么在清理 agent/event listener 后调用 `cleanupSessionResources(this.sessionId)` [E: packages/coding-agent/src/core/agent-session.ts:755] [E: packages/coding-agent/src/core/agent-session.ts:769] [E: packages/coding-agent/src/core/agent-session.ts:771] [I]。

[subsys.ai.openai-codex-responses](openai-codex-responses.md) 覆盖 Codex WebSocket streaming、cache、SSE fallback 和 wire event mapping; 本节点只把 Codex 作为 session resource cleanup registry 的注册者和消费者来描述 [E: packages/ai/src/api/openai-codex-responses.ts:833] [E: packages/ai/src/api/openai-codex-responses.ts:850] [I]。

## Sources

- packages/ai/src/session-resources.ts
- packages/ai/src/index.ts
- packages/ai/src/compat.ts
- packages/ai/src/api/openai-codex-responses.ts
- packages/coding-agent/src/core/agent-session.ts

## 相关

- [subsys.ai.openai-codex-responses](openai-codex-responses.md): Codex Responses WebSocket cache 如何实现 per-session close 和全量 close,以及它如何注册到 session resource cleanup registry。
