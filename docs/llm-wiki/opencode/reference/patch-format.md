---
id: ref.patch-format
title: apply_patch 格式与 fuzzy-match passes
kind: reference
tier: T3
v: shared
source:
  - packages/core/src/patch.ts
  - packages/opencode/src/patch/index.ts
  - packages/opencode/src/tool/apply_patch.ts
  - packages/core/src/tool/apply-patch.ts
status: verified
symbols:
  - Patch.parse
  - Patch.derive
  - parsePatch
  - deriveNewContentsFromChunks
  - ApplyPatch.execute
evidence: explicit
updated: 92c70c9c3
---

> 这份节点描述 opencode apply_patch 的 wire grammar、chunk 语义与四段 fuzzy match 顺序；V1/V2 parser 很像，但工具行为有关键差异。

## 能回答的问题

- `*** Begin Patch` / `*** End Patch` 语法到底接受哪些 hunk？
- `@@` chunk 中空格、`-`、`+`、`*** End of File` 分别如何解释？
- exact、rstrip、trim、normalized 四个匹配 pass 的顺序和含义是什么？
- V1 与 V2 apply_patch 在 move、rollback、permission、写盘语义上哪里不同？

## 格式总览

apply_patch 文本必须包含 `*** Begin Patch` 与 `*** End Patch`，且 begin marker 要出现在 end marker 之前；V2 parser 会先去掉 heredoc wrapper，再用 `findIndex` 查找两个 marker。[E: packages/core/src/patch.ts:25][E: packages/core/src/patch.ts:27][E: packages/core/src/patch.ts:28][E: packages/core/src/patch.ts:29] V1 parser 同样先 strip heredoc，再用 `findIndex` 找 begin/end marker，因此 marker 可以被包在 heredoc 里，而不是必须位于原始字符串首尾。[E: packages/opencode/src/patch/index.ts:185][E: packages/opencode/src/patch/index.ts:186][E: packages/opencode/src/patch/index.ts:195][E: packages/opencode/src/patch/index.ts:196][E: packages/opencode/src/patch/index.ts:198]

一个 patch 由多个 hunk 组成。V2 hunk 类型包括 add、delete、update，字段分别是 `path+contents`、`path`、`path+chunks+movePath?`。[E: packages/core/src/patch.ts:3][E: packages/core/src/patch.ts:4][E: packages/core/src/patch.ts:5][E: packages/core/src/patch.ts:7][E: packages/core/src/patch.ts:9][E: packages/core/src/patch.ts:10] V1 的 hunk schema 也支持 `move_path`，但字段名是 snake_case。[E: packages/opencode/src/patch/index.ts:19][E: packages/opencode/src/patch/index.ts:22]

### Hunk grammar

| Hunk | Header | Body | V1 | V2 |
|---|---|---|---|---|
| Add file | `*** Add File: path` | V2 每一行必须以 `+` 开头，存储时去掉 `+`；V1 只收集 `+` 行并忽略其它非 header 行。 | `parseAddFileContent` 只把 `+` 行加入内容。[E: packages/opencode/src/patch/index.ts:157][E: packages/opencode/src/patch/index.ts:162][E: packages/opencode/src/patch/index.ts:163] | `parseAdd` 要求每行 `+` 前缀。[E: packages/core/src/patch.ts:88][E: packages/core/src/patch.ts:92][E: packages/core/src/patch.ts:93] |
| Delete file | `*** Delete File: path` | 没有 chunk 内容。 | 解析 delete file 并推进到 header 下一行。[E: packages/opencode/src/patch/index.ts:220][E: packages/opencode/src/patch/index.ts:225] | 解析 delete file header。[E: packages/core/src/patch.ts:43][E: packages/core/src/patch.ts:46] |
| Update file | `*** Update File: path` | 可选 `*** Move to: path`；V2 要求至少一个 `@@` chunk，V1 parser 可以返回空 chunk 列表。 | 支持 `Move to` 并设置 `move_path`。[E: packages/opencode/src/patch/index.ts:92][E: packages/opencode/src/patch/index.ts:93][E: packages/opencode/src/patch/index.ts:231] | parser 支持 `movePath` 字段并拒绝空 update hunk。[E: packages/core/src/patch.ts:55][E: packages/core/src/patch.ts:61] |
| Chunk | `@@` 或 `@@ context` | V2 chunk body 以 space、`-`、`+`、`*** End of File` 组成；V1 body 解析 space/`-`/`+`，但 `*** End of File` 会被外层 `startsWith("***")` 停止条件截住。 | chunk parser 使用 header context 和 body 行。[E: packages/opencode/src/patch/index.ts:108][E: packages/opencode/src/patch/index.ts:110][E: packages/opencode/src/patch/index.ts:118][E: packages/opencode/src/patch/index.ts:121] | `parseUpdate` 要求 chunk line 以 `@@` 开头，并显式处理 `*** End of File`。[E: packages/core/src/patch.ts:103][E: packages/core/src/patch.ts:113][E: packages/core/src/patch.ts:127] |

V2 update hunk 没有 chunk 会直接报错；这是因为 derive 只会基于 chunk 计算 replacement，空 update 没有可应用语义。[E: packages/core/src/patch.ts:61][E: packages/core/src/patch.ts:75][I]

### Chunk line 语义

| Prefix | oldLines | newLines | 语义 |
|---|---|---|---|
| ` ` | 加入 oldLines，也加入 newLines。 | 加入 newLines。 | 上下文行，必须在目标文件附近匹配。[E: packages/core/src/patch.ts:119] |
| `-` | 加入 oldLines。 | 不加入。 | 删除行。[E: packages/core/src/patch.ts:122] |
| `+` | 不加入。 | 加入 newLines。 | 新增行。[E: packages/core/src/patch.ts:123] |
| `@@ context` | 不直接改行。 | 不直接改行。 | `slice(2).trim()` 作为 changeContext，用于 seek 附近定位。[E: packages/core/src/patch.ts:106][E: packages/core/src/patch.ts:137] |
| `*** End of File` | 不直接改行。 | 不直接改行。 | V2 标记 chunk 要落在文件末尾，`seek` 会先尝试从文件尾匹配。[E: packages/core/src/patch.ts:113][E: packages/core/src/patch.ts:116][E: packages/core/src/patch.ts:147][E: packages/core/src/patch.ts:163][E: packages/core/src/patch.ts:165] |

## 4-pass fuzzy matching

V2 `seek` 的匹配顺序固定为 exact、rstrip、trim、normalized；只要某一 pass 找到候选位置就返回该位置。[E: packages/core/src/patch.ts:162][E: packages/core/src/patch.ts:168] 四个 comparator 的含义分别是完全相等、去右侧空白相等、两端 trim 相等、Unicode 标点与空格 normalize 后相等。[E: packages/core/src/patch.ts:183][E: packages/core/src/patch.ts:184][E: packages/core/src/patch.ts:185][E: packages/core/src/patch.ts:186]

V1 `seekSequence` 使用同样的 pass 顺序：`exact`、`rstrip`、`trim`、`normalized`，并返回匹配到的行号。[E: packages/opencode/src/patch/index.ts:460][E: packages/opencode/src/patch/index.ts:464][E: packages/opencode/src/patch/index.ts:468][E: packages/opencode/src/patch/index.ts:472][E: packages/opencode/src/patch/index.ts:476][E: packages/opencode/src/patch/index.ts:483] V1 `normalizeUnicode` 会把多种 Unicode quote/dash/space 规整为 ASCII 或普通空格。[E: packages/opencode/src/patch/index.ts:420][E: packages/opencode/src/patch/index.ts:421][E: packages/opencode/src/patch/index.ts:422][E: packages/opencode/src/patch/index.ts:423][E: packages/opencode/src/patch/index.ts:424]

## V1

V1 `apply_patch` 工具的 input 字段名是 `patchText`，描述为 complete patch text。[E: packages/opencode/src/tool/apply_patch.ts:18] 工具执行时先调用 parser；没有 hunk 时，规范空 patch 报 `patch rejected: empty patch`，非规范空结果报 `no hunks found`。[E: packages/opencode/src/tool/apply_patch.ts:41][E: packages/opencode/src/tool/apply_patch.ts:47][E: packages/opencode/src/tool/apply_patch.ts:50][E: packages/opencode/src/tool/apply_patch.ts:52]

V1 会为每个受影响路径检查 external directory 守卫，然后用 `permission: "edit"`、受影响 paths 触发权限审批。[E: packages/opencode/src/tool/apply_patch.ts:74][E: packages/opencode/src/tool/apply_patch.ts:206][E: packages/opencode/src/tool/apply_patch.ts:207] update hunk 会调用 `deriveNewContentsFromChunks` 并可携带 `movePath`，最终 move 的实现是写入目标路径再删除旧路径。[E: packages/opencode/src/tool/apply_patch.ts:122][E: packages/opencode/src/tool/apply_patch.ts:142][E: packages/opencode/src/tool/apply_patch.ts:239][E: packages/opencode/src/tool/apply_patch.ts:240]

V1 工具结束时会发布文件变更事件，并对变更文件尝试拉取 LSP diagnostics。[E: packages/opencode/src/tool/apply_patch.ts:262][E: packages/opencode/src/tool/apply_patch.ts:266][E: packages/opencode/src/tool/apply_patch.ts:271]

## V2

V2 `ApplyPatch` tool wire name 是 `apply_patch`，input 字段是 `patchText`。[E: packages/core/src/tool/apply-patch.ts:13][E: packages/core/src/tool/apply-patch.ts:15] V2 工具描述明确写出“moves unsupported”和“atomic rollback unsupported”，并在执行时如果 hunk 有 `movePath` 就失败。[E: packages/core/src/tool/apply-patch.ts:58][E: packages/core/src/tool/apply-patch.ts:59][E: packages/core/src/tool/apply-patch.ts:84][E: packages/core/src/tool/apply-patch.ts:85]

V2 先解析 patch，收集所有目标路径，解析外部目录 permission，再对 `action: "edit"` 进行 assert。[E: packages/core/src/tool/apply-patch.ts:79][E: packages/core/src/tool/apply-patch.ts:87][E: packages/core/src/tool/apply-patch.ts:96][E: packages/core/src/tool/apply-patch.ts:103][E: packages/core/src/tool/apply-patch.ts:104] add/delete/update 会先准备成 `prepared` 变更列表，update 使用 `Patch.derive` 生成新内容；之后逐项 `create/remove/writeIfUnchanged`，工具描述说明没有 atomic rollback。[E: packages/core/src/tool/apply-patch.ts:112][E: packages/core/src/tool/apply-patch.ts:125][E: packages/core/src/tool/apply-patch.ts:144][E: packages/core/src/tool/apply-patch.ts:155][E: packages/core/src/tool/apply-patch.ts:159][E: packages/core/src/tool/apply-patch.ts:59]

## V1/V2 差异速查

| 维度 | V1 | V2 |
|---|---|---|
| parser 文件 | `packages/opencode/src/patch/index.ts`。 | `packages/core/src/patch.ts`。 |
| move directive | parser 与工具都支持 move；工具写目标再删除旧路径。[E: packages/opencode/src/patch/index.ts:92][E: packages/opencode/src/tool/apply_patch.ts:235][E: packages/opencode/src/tool/apply_patch.ts:239][E: packages/opencode/src/tool/apply_patch.ts:240] | parser 可读 `movePath`，tool 明确拒绝 move。[E: packages/core/src/patch.ts:55][E: packages/core/src/tool/apply-patch.ts:84][E: packages/core/src/tool/apply-patch.ts:85] |
| permission action | `permission: "edit"`。[E: packages/opencode/src/tool/apply_patch.ts:207] | `action: "edit"`。[E: packages/core/src/tool/apply-patch.ts:104] |
| fuzzy pass | exact -> rstrip -> trim -> normalized。[E: packages/opencode/src/patch/index.ts:464][E: packages/opencode/src/patch/index.ts:468][E: packages/opencode/src/patch/index.ts:472][E: packages/opencode/src/patch/index.ts:476] | exact -> rstrip -> trim -> normalized。[E: packages/core/src/patch.ts:162] |
| rollback | move 由写目标再删旧路径完成。[E: packages/opencode/src/tool/apply_patch.ts:239][E: packages/opencode/src/tool/apply_patch.ts:240] | 描述说明没有 atomic rollback，执行按 `prepared` 顺序逐项应用。[E: packages/core/src/tool/apply-patch.ts:59][E: packages/core/src/tool/apply-patch.ts:139] |

## Sources

- `packages/core/src/patch.ts`
- `packages/opencode/src/patch/index.ts`
- `packages/opencode/src/tool/apply_patch.ts`
- `packages/core/src/tool/apply-patch.ts`

## 相关

- `execution.patch-v1`
- `execution.patch-v2`
- `tool.apply-patch`
