---
id: subsys.coding-agent.file-mutation-queue
title: 文件变更串行化
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/file-mutation-queue.ts
  - packages/coding-agent/src/core/tools/edit.ts
  - packages/coding-agent/src/core/tools/write.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/index.ts
  - packages/coding-agent/docs/extensions.md
  - packages/coding-agent/test/file-mutation-queue.test.ts
  - packages/coding-agent/CHANGELOG.md
symbols:
  - withFileMutationQueue
related:
  - surface.tools.edit
  - surface.tools.write
evidence: explicit
status: verified
updated: 5a073885
---

> 文件变更串行化子系统是 `withFileMutationQueue(filePath, fn)`: 它把同一目标文件的 mutation callback 排成 FIFO 链, 让内置 `edit`、`write` 和扩展工具在默认并行 tool call 环境里避免 read-modify-write 互相覆盖。

## 能回答的问题

- `edit` 和 `write` 为什么可以默认并行执行, 但同一文件不会同时写?
- `withFileMutationQueue` 的 queue key 如何处理 absolute path、missing path 和 symlink alias?
- `fn()` 抛错或 abort 后, 后续同文件 mutation 会不会卡死?
- 这个 queue 的并发安全边界是 per path、per process, 还是跨进程文件锁?
- 自定义 mutating tool 怎样加入和内置工具相同的文件变更队列?

## 职责边界

`withFileMutationQueue<T>(filePath, fn)` 只负责把同一个 queue key 上的 async mutation callback 串行化, 并把不同 key 的 callback 留给正常并行调度 [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:32] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:35] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:42]. 它不实现文件读写、diff、目录创建或 abort 监听;这些行为分别留在调用方 `edit.ts` 和 `write.ts` 的 tool execute callback 内 [E: packages/coding-agent/src/core/tools/edit.ts:325] [E: packages/coding-agent/src/core/tools/edit.ts:347] [E: packages/coding-agent/src/core/tools/write.ts:214] [E: packages/coding-agent/src/core/tools/write.ts:218].

该子系统的保护目标是同一文件的 mutation window, 而不是所有 tool call 的全局顺序;单测明确覆盖同一路径顺序执行、不同路径交错执行两种行为 [E: packages/coding-agent/test/file-mutation-queue.test.ts:38] [E: packages/coding-agent/test/file-mutation-queue.test.ts:53] [E: packages/coding-agent/test/file-mutation-queue.test.ts:56] [E: packages/coding-agent/test/file-mutation-queue.test.ts:74]. 这也是它和 agent-core `executionMode: "sequential"` 的区别: queue 保留跨文件并行度, 只把同一目标文件收窄为串行 [I].

## 关键文件

- `packages/coding-agent/src/core/tools/file-mutation-queue.ts`: 权威实现,包含 module-level queue map、registration queue、path canonicalization、release 和 cleanup [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:4] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:5] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:17] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:19] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:22] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:56] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:58].
- `packages/coding-agent/src/core/tools/edit.ts`: `edit` 在 `resolveToCwd()` 后把 access/read/apply/write 整个 read-modify-write window 包进 queue [E: packages/coding-agent/src/core/tools/edit.ts:310] [E: packages/coding-agent/src/core/tools/edit.ts:312] [E: packages/coding-agent/src/core/tools/edit.ts:325] [E: packages/coding-agent/src/core/tools/edit.ts:347].
- `packages/coding-agent/src/core/tools/write.ts`: `write` 在 `resolveToCwd()` 和 `dirname()` 后把 mkdir/write window 包进 queue [E: packages/coding-agent/src/core/tools/write.ts:201] [E: packages/coding-agent/src/core/tools/write.ts:203] [E: packages/coding-agent/src/core/tools/write.ts:214] [E: packages/coding-agent/src/core/tools/write.ts:218].
- `packages/coding-agent/test/file-mutation-queue.test.ts`: 行为回归测试覆盖同文件串行、不同文件并行、symlink alias、并发 edit、edit+write 共用队列、abort 后队列保持锁定 [E: packages/coding-agent/test/file-mutation-queue.test.ts:38] [E: packages/coding-agent/test/file-mutation-queue.test.ts:56] [E: packages/coding-agent/test/file-mutation-queue.test.ts:77] [E: packages/coding-agent/test/file-mutation-queue.test.ts:102] [E: packages/coding-agent/test/file-mutation-queue.test.ts:131] [E: packages/coding-agent/test/file-mutation-queue.test.ts:176] [E: packages/coding-agent/test/file-mutation-queue.test.ts:221].
- `packages/coding-agent/docs/extensions.md`: 扩展作者文档要求 custom mutating tool 使用 `withFileMutationQueue()` 加入内置 `edit`/`write` 同一个 per-file queue [E: packages/coding-agent/docs/extensions.md:1744] [E: packages/coding-agent/docs/extensions.md:1750].

## 数据模型与函数

`fileMutationQueues` 是 `Map<string, Promise<void>>`, key 是 canonicalized target path, value 是该 key 最新的 promise chain tail [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:4] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:35] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:42]. `registrationQueue` 是 module-level `Promise.resolve()` 起步的注册串行器,用来让多个调用按到达顺序注册自己的 queue slot [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:5] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:33] [E: packages/coding-agent/CHANGELOG.md:1491].

`getMutationQueueKey(filePath)` 先 `resolve(filePath)` 得到 absolute-ish resolved path,再尝试 `realpath(resolvedPath)` [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:17] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:19]. 如果 `realpath()` 失败且错误 code 是 `ENOENT` 或 `ENOTDIR`, key 退回 `resolvedPath`;其他错误继续抛出 [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:7] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:12] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:21] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:24]. 这个设计让已有文件的 symlink alias 通过 realpath 归并到同一队列,但新文件只能以 resolved path 排队,因为目标还不存在 [E: packages/coding-agent/docs/extensions.md:1748].

`withFileMutationQueue<T>` 返回 `fn()` 的原始泛型结果,因为执行阶段是 `return await fn()`;如果 `fn()` reject,错误会穿过 `finally` 继续交给调用者 [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:32] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:54] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:55] [I]. `finally` 无条件 `releaseNext()` 并按 identity cleanup map entry,所以失败或 abort 之后同一 key 的后续 callback 仍能继续 [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:56] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:57] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:58].

## 控制流

1. 调用方把 raw tool path 解析为目标绝对路径后调用 `withFileMutationQueue(absolutePath, async () => ...)`;`edit` 和 `write` 都在 queue callback 内执行文件变更逻辑 [E: packages/coding-agent/src/core/tools/edit.ts:310] [E: packages/coding-agent/src/core/tools/edit.ts:312] [E: packages/coding-agent/src/core/tools/write.ts:201] [E: packages/coding-agent/src/core/tools/write.ts:203].
2. `withFileMutationQueue` 先把注册逻辑接到 `registrationQueue.then(async () => ...)` 后面,注册逻辑内部算 key、读取当前 key 的 `currentQueue`,再创建本次 `nextQueue` 的 `releaseNext` [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:33] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:35] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:37] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:39].
3. 本次 tail 是 `chainedQueue = currentQueue.then(() => nextQueue)`,并立即写回 `fileMutationQueues.set(key, chainedQueue)`,所以后来同 key 调用会等待这个 tail [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:41] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:42].
4. 注册串行器随后被更新为 `registration.then(() => undefined, () => undefined)`,即使某次 path canonicalization 出错也不会让后续注册永久接到 rejected registration queue 上 [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:46] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:47] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:48] [I].
5. 调用者等待本次 registration 完成,再 `await currentQueue`;同 key 的前一个 mutation 不 release,本次 `fn()` 就不会开始 [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:51] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:52].
6. `fn()` settle 后进入 `finally`:先 `releaseNext()` 唤醒同 key 下一个 waiter,再只在 map 当前值仍等于本次 `chainedQueue` 时删除 key [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:55] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:56] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:57] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:58]. 这个 identity check 避免较早调用在后来调用已注册新 tail 后误删 map entry [I].

## 设计动机与权衡

tool calls 默认可能并行,如果两个 mutating tools 同时读同一个旧文件、各自计算更新,最后落盘的 write 会覆盖另一个更新;扩展文档把这作为 custom tool 必须加入 queue 的主要原因 [E: packages/coding-agent/docs/extensions.md:1744] [E: packages/coding-agent/docs/extensions.md:1746]. 因此 queue 的关键权衡是 per-file serialization:同一目标文件牺牲并行度换一致性,不同目标文件保留并行度 [E: packages/coding-agent/test/file-mutation-queue.test.ts:56] [E: packages/coding-agent/test/file-mutation-queue.test.ts:74] [I].

`registrationQueue` 的存在是为了保持 request order,避免 concurrent `edit`/`write` 在 queue-key resolution 期间重排;CHANGELOG 明确记录曾修复同文件并发操作在 key resolution 期间被重排的问题 [E: packages/coding-agent/CHANGELOG.md:1491]. 现实现把 key resolution 和 map update 放进同一个 registration chain,因此每次注册按上一轮 registration settle 后才进入 [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:33] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:42] [I].

`edit` 和 `write` 的 queue callback 内定义 `throwIfAborted()`,并在 filesystem await 后检查 `signal.aborted` [E: packages/coding-agent/src/core/tools/edit.ts:317] [E: packages/coding-agent/src/core/tools/edit.ts:318] [E: packages/coding-agent/src/core/tools/edit.ts:332] [E: packages/coding-agent/src/core/tools/edit.ts:337] [E: packages/coding-agent/src/core/tools/edit.ts:344] [E: packages/coding-agent/src/core/tools/edit.ts:348] [E: packages/coding-agent/src/core/tools/write.ts:208] [E: packages/coding-agent/src/core/tools/write.ts:209] [E: packages/coding-agent/src/core/tools/write.ts:215] [E: packages/coding-agent/src/core/tools/write.ts:219]. abort 回归测试证明 first write/edit 被 abort 后,second mutation 不会在 first filesystem write settle 前开始 [E: packages/coding-agent/test/file-mutation-queue.test.ts:211] [E: packages/coding-agent/test/file-mutation-queue.test.ts:213] [E: packages/coding-agent/test/file-mutation-queue.test.ts:265] [E: packages/coding-agent/test/file-mutation-queue.test.ts:267].

## gotcha

- Queue key 必须传真实目标文件路径,不要传 raw user argument;扩展文档要求先相对 `ctx.cwd` 或工具工作目录 resolve,再调用 `withFileMutationQueue()` [E: packages/coding-agent/docs/extensions.md:1748]. 内置 `edit` 和 `write` 都先 `resolveToCwd(path, cwd)` 再入队 [E: packages/coding-agent/src/core/tools/edit.ts:310] [E: packages/coding-agent/src/core/tools/write.ts:201].
- 对 read-modify-write 工具,必须把整个 mutation window 放进 callback,不只是最后的 `writeFile`;扩展文档明确说 queue window 包括 read-modify-write logic [E: packages/coding-agent/docs/extensions.md:1750]. `edit` 的 callback 覆盖 access、read、diff apply、write 和 result diff 生成 [E: packages/coding-agent/src/core/tools/edit.ts:325] [E: packages/coding-agent/src/core/tools/edit.ts:335] [E: packages/coding-agent/src/core/tools/edit.ts:343] [E: packages/coding-agent/src/core/tools/edit.ts:347] [E: packages/coding-agent/src/core/tools/edit.ts:350].
- Existing symlink alias 可以归并,因为 key 会 `realpath()`;missing target 退回 resolved path,所以不同 textual paths 指向未来同一新文件时不一定能在创建前归并 [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:19] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:22] [I].
- 这是 in-memory per-process queue,不是 OS file lock 或跨进程协调机制;实现只有 module-level `Map` 和 Promise chain,没有文件锁、IPC 或 lockfile 操作 [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:4] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:5] [I].
- 如果 `getMutationQueueKey()` 遇到非 missing-path 错误,错误会抛出且 `fn()` 不会执行;源码只吞 `ENOENT`/`ENOTDIR`,其他错误 `throw error` [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:21] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:24] [I].

## 跨包边界

`withFileMutationQueue` 属于 `pi-coding-agent` 产品层 built-in tools 子系统,并从 `packages/coding-agent/src/core/tools/index.ts`、`core/sdk.ts` 和包入口 `src/index.ts` re-export,让扩展和 SDK 用户可以导入同一个 helper [E: packages/coding-agent/src/core/tools/index.ts:20] [E: packages/coding-agent/src/core/sdk.ts:31] [E: packages/coding-agent/src/core/sdk.ts:112] [E: packages/coding-agent/src/index.ts:298]. 它不在 `pi-agent-core` 中,因此 agent-core 只负责并行执行 tool calls;文件 mutation 的 per-path coordination 是 coding-agent 层的约定和导出 [I].

[surface.tools.edit](../../surface/tools/edit.md) 是 `edit` 工具节点;它说明 exact replacement、diff details 和 `EditOperations`,本节点只覆盖 `edit` 与 queue 的并发边界 [E: packages/coding-agent/src/core/tools/edit.ts:74] [E: packages/coding-agent/src/core/tools/edit.ts:296] [E: packages/coding-agent/src/core/tools/edit.ts:312]. [surface.tools.write](../../surface/tools/write.md) 是 `write` 工具节点;它说明完整覆盖写入和 `WriteOperations`,本节点只覆盖 `write` 与 queue 的 mkdir/write serialization [E: packages/coding-agent/src/core/tools/write.ts:25] [E: packages/coding-agent/src/core/tools/write.ts:190] [E: packages/coding-agent/src/core/tools/write.ts:203].

## Sources

- packages/coding-agent/src/core/tools/file-mutation-queue.ts
- packages/coding-agent/src/core/tools/edit.ts
- packages/coding-agent/src/core/tools/write.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/index.ts
- packages/coding-agent/docs/extensions.md
- packages/coding-agent/test/file-mutation-queue.test.ts
- packages/coding-agent/CHANGELOG.md

## 相关

- [surface.tools.edit](../../surface/tools/edit.md): `edit` 的 schema、exact replacement、diff 输出和 `EditOperations`。
- [surface.tools.write](../../surface/tools/write.md): `write` 的完整覆盖写入、父目录创建和 `WriteOperations`。
