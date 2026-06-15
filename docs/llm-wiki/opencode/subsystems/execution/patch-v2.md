---
id: execution.patch-v2
title: V2 apply_patch 引擎+工具
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/patch.ts
  - packages/core/src/tool/apply-patch.ts
  - packages/core/src/file-mutation.ts
  - packages/core/src/location-mutation.ts
  - specs/v2/session.md
symbols:
  - Patch.parse
  - Patch.derive
  - ApplyPatchTool
  - FileMutation.writeIfUnchanged
related:
  - execution.patch-v1
  - ref.patch-format
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V2 apply_patch 是 core built-in mutation tool：parser 仍识别 add/delete/update/move syntax，但 tool 明确拒绝 move；它先 resolve 所有 target、审批 external directory 与 edit batch、预读 update/delete 文件，再按顺序提交，update 通过 `writeIfUnchanged` 做 optimistic concurrency。

## 能回答的问题

- V2 parser 是否仍能识别 `*** Move to:`，tool 为什么拒绝 move？
- V2 apply_patch 的 permission action 是 `apply_patch` 还是 `edit`？
- 顺序提交失败时，模型如何知道 partial application？
- `writeIfUnchanged` 在哪里提供乐观并发保护？
- V2 patch 与 V1 4-pass fuzzy 是否一致？

## 职责边界

`packages/core/src/patch.ts` 是 V2 parser/derive helper，`packages/core/src/tool/apply-patch.ts` 是 registered built-in tool。tool wire name 是 `"apply_patch"`，input 只有 `patchText`，output 是 `{ applied: Applied[] }` [E: packages/core/src/tool/apply-patch.ts:13] [E: packages/core/src/tool/apply-patch.ts:16] [E: packages/core/src/tool/apply-patch.ts:27]。tool 用 `Tool.withPermission(..., "edit")` 装饰，并在 executor 内 assert `action: "edit"`，所以实际 mutation policy action 是 `edit` [E: packages/core/src/tool/apply-patch.ts:172] [E: packages/core/src/tool/apply-patch.ts:104]。

## Parser 与 derive

V2 `Patch.parse` 查 `*** Begin Patch`/`*** End Patch`，缺失 marker 会 throw [E: packages/core/src/patch.ts:27] [E: packages/core/src/patch.ts:28] [E: packages/core/src/patch.ts:29]。它支持 add/delete/update header，并在 update header 后识别 `*** Move to:`，把字段存成 `movePath` [E: packages/core/src/patch.ts:35] [E: packages/core/src/patch.ts:43] [E: packages/core/src/patch.ts:50] [E: packages/core/src/patch.ts:55] [E: packages/core/src/patch.ts:56] [E: packages/core/src/patch.ts:62]。V2 parser 比 V1 更严格：while loop 遇到不合法 patch line 会 throw `Invalid patch line` [E: packages/core/src/patch.ts:66]。

V2 `Patch.derive` 保留 BOM、移除 split 后尾部空行、调用 `computeReplacements`，然后用 `toReversed()` 倒序 splice 并确保末尾换行 [E: packages/core/src/patch.ts:72] [E: packages/core/src/patch.ts:74] [E: packages/core/src/patch.ts:75] [E: packages/core/src/patch.ts:77] [E: packages/core/src/patch.ts:78] [E: packages/core/src/patch.ts:80]。匹配函数 `seek` 仍按 exact、rstrip、trim、normalized 四个 comparator 轮询 [E: packages/core/src/patch.ts:162] [E: packages/core/src/patch.ts:183] [E: packages/core/src/patch.ts:184] [E: packages/core/src/patch.ts:185] [E: packages/core/src/patch.ts:186]。

## 工具控制流

1. `execute` 初始化 `applied` 数组，并定义 `fail(path)`：若已有 applied 项，错误 message 会写 `Patch partially applied before failing at ... Applied: ...` [E: packages/core/src/tool/apply-patch.ts:64] [E: packages/core/src/tool/apply-patch.ts:65] [E: packages/core/src/tool/apply-patch.ts:69]。
2. 空白 `patchText` 返回 `ToolFailure("patchText is required")`，parse 失败返回 `apply_patch verification failed` [E: packages/core/src/tool/apply-patch.ts:78] [E: packages/core/src/tool/apply-patch.ts:80] [E: packages/core/src/tool/apply-patch.ts:81]。
3. parse 后若无 hunks，返回 `patch rejected: empty patch` [E: packages/core/src/tool/apply-patch.ts:83]。
4. 任一 update hunk 带 `movePath` 时，tool 直接返回 `ToolFailure("apply_patch moves are not supported yet")` [E: packages/core/src/tool/apply-patch.ts:84] [E: packages/core/src/tool/apply-patch.ts:85]。
5. tool 先把每个 hunk 的 `hunk.path` 通过 `LocationMutation.resolve({ kind: "file" })` 转成 target [E: packages/core/src/tool/apply-patch.ts:88] [E: packages/core/src/tool/apply-patch.ts:89]。
6. 所有 external directories 被 dedupe 到 map 后逐个 assert `external_directory` [E: packages/core/src/tool/apply-patch.ts:93] [E: packages/core/src/tool/apply-patch.ts:95] [E: packages/core/src/tool/apply-patch.ts:96] [E: packages/core/src/tool/apply-patch.ts:97]。
7. tool 对所有 target resources 发一次 batch `permission.assert({ action: "edit", resources: unique resources, save: ["*"] })` [E: packages/core/src/tool/apply-patch.ts:104] [E: packages/core/src/tool/apply-patch.ts:105] [E: packages/core/src/tool/apply-patch.ts:106]。
8. preflight 阶段：add 直接 prepared；delete/update 必须 stat 为 File；update 读取原始 bytes，并通过 `Patch.derive` 计算新内容 [E: packages/core/src/tool/apply-patch.ts:115] [E: packages/core/src/tool/apply-patch.ts:116] [E: packages/core/src/tool/apply-patch.ts:119] [E: packages/core/src/tool/apply-patch.ts:120] [E: packages/core/src/tool/apply-patch.ts:124] [E: packages/core/src/tool/apply-patch.ts:125]。
9. commit 阶段遍历 `prepared`；tool description 也声明 operations sequentially。add 用 `files.create`，delete 用 `files.remove`，update 用 `files.writeIfUnchanged({ expected: source })` [E: packages/core/src/tool/apply-patch.ts:59] [E: packages/core/src/tool/apply-patch.ts:139] [E: packages/core/src/tool/apply-patch.ts:144] [E: packages/core/src/tool/apply-patch.ts:155] [E: packages/core/src/tool/apply-patch.ts:159] [E: packages/core/src/tool/apply-patch.ts:161]。
10. 每个成功操作 push 一条 `{ type, resource, target }` 到 `applied`，最终 output 返回所有 applied 项 [E: packages/core/src/tool/apply-patch.ts:151] [E: packages/core/src/tool/apply-patch.ts:156] [E: packages/core/src/tool/apply-patch.ts:164] [E: packages/core/src/tool/apply-patch.ts:168]。

## 乐观并发与 partial application

`FileMutation.writeIfUnchanged` 在 canonical target lock 下读取当前 bytes，与 `expected` bytes 逐字节比较；不一致时抛 `FileMutation.StaleContentError`，一致才写入 [E: packages/core/src/file-mutation.ts:144] [E: packages/core/src/file-mutation.ts:146] [E: packages/core/src/file-mutation.ts:147] [E: packages/core/src/file-mutation.ts:150] [E: packages/core/src/file-mutation.ts:151] [E: packages/core/src/file-mutation.ts:152]。这个保护只覆盖 update 的单文件 stale content；add 和 delete 仍按顺序提交。canonical target 串行化来自 `KeyedMutex` 的 `locks.withLock(target.canonical)(Effect.uninterruptible(effect))` [E: packages/core/src/file-mutation.ts:77] [E: packages/core/src/file-mutation.ts:81]。

V2 session spec 记录了当前 slice 的行为：V2 apply_patch 支持 add/update/delete，解析每个 hunk，resolve 每个 mutation target，批准 external dirs 和 edit batch，preflight update/delete targets，再顺序提交；后续 commit failure 会留下前面已应用操作并返回 explicit partial-application report，moves 与 atomic rollback 是 follow-up [E: specs/v2/session.md:196]。

## 与 V1 patch 的差异

V2 helper 保留四轮 fuzzy matching，`FileMutation.Service` 当前只暴露 create/write/writeTextPreservingBom/writeIfUnchanged/remove 这组 mutation primitives [E: packages/core/src/patch.ts:162] [E: packages/core/src/file-mutation.ts:170]。工具层不再做 V1 的 rich diff metadata、formatter、watcher event、LSP diagnostics 或 move application [I]。因此 V2 当前更像 minimal durable tool leaf，而不是 V1 那种 UI/IDE-integrated patch workflow [I]。

## Gotcha

- V2 parser 识别 move syntax，但 V2 tool 拒绝 move；不要把 parser 支持误读成可执行支持。
- `Tool.withPermission(..., "edit")` 与 `permission.assert({ action: "edit" })` 一致；wire name `"apply_patch"` 不是 approval action。
- V2 提交不是 atomic transaction；partial application 是设计内显式结果。
- V2 `writeIfUnchanged` 是进程内 cooperating OpenCode mutation 保护，不是跨进程文件锁。

## Sources

- packages/core/src/patch.ts
- packages/core/src/tool/apply-patch.ts
- packages/core/src/file-mutation.ts
- packages/core/src/location-mutation.ts
- specs/v2/session.md

## 相关

- [V1 apply_patch 引擎+工具](patch-v1.md)
- [apply_patch 格式与 fuzzy passes](../../reference/patch-format.md)
