---
id: execution.patch-v1
title: V1 apply_patch 引擎+工具
kind: subsystem
tier: T2
v: v1
source:
  - packages/opencode/src/patch/index.ts
  - packages/opencode/src/tool/apply_patch.ts
  - packages/opencode/src/tool/external-directory.ts
  - packages/opencode/src/tool/registry.ts
symbols:
  - Patch.parsePatch
  - Patch.deriveNewContentsFromChunks
  - Patch.applyHunksToFiles
  - Patch.maybeParseApplyPatchVerified
  - ApplyPatchTool
related:
  - execution.patch-v2
  - ref.patch-format
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V1 apply_patch 是活跑路径里的多文件 patch engine + tool：parser 支持 add/delete/update/move，update 匹配使用 exact/rstrip/trim/Unicode-normalized 四轮 fuzzy seek，工具层先生成 diff 和 permission metadata，再写文件、format、publish watcher/LSP 事件并返回 diagnostics。

## 能回答的问题

- V1 patch 格式支持哪些 hunk 类型，move 是在哪里解析和执行的？
- 四轮 fuzzy matching 的顺序是什么？
- `apply_patch` tool 怎样请求 `edit` 权限和 external directory 权限？
- V1 apply_patch 写文件后会触发哪些事件、formatter、LSP 行为？
- `maybeParseApplyPatchVerified` 如何从 shell argv 识别 apply_patch？

## 职责边界

`packages/opencode/src/patch/index.ts` 是纯 patch parsing/derive/apply helper，`packages/opencode/src/tool/apply_patch.ts` 是 V1 model-facing tool。tool id 是 `"apply_patch"`，参数只有 `patchText` [E: packages/opencode/src/tool/apply_patch.ts:19] [E: packages/opencode/src/tool/apply_patch.ts:23]。V1 registry 只在 GPT non-OSS 且非 GPT-4 model 上启用 apply_patch；启用 apply_patch 时禁用 edit/write，未启用时保留 edit/write [E: packages/opencode/src/tool/registry.ts:274] [E: packages/opencode/src/tool/registry.ts:275] [E: packages/opencode/src/tool/registry.ts:276]。

## Patch 数据模型

| 类型 | 字段 | 说明 | 证据 |
|---|---|---|---|
| `Hunk.add` | `path`, `contents` | 新建文件 | [E: packages/opencode/src/patch/index.ts:20] |
| `Hunk.delete` | `path` | 删除文件 | [E: packages/opencode/src/patch/index.ts:21] |
| `Hunk.update` | `path`, `move_path?`, `chunks` | 更新文件，可选 move | [E: packages/opencode/src/patch/index.ts:22] |
| `UpdateFileChunk` | `old_lines`, `new_lines`, `change_context?`, `is_end_of_file?` | update hunk 中的上下文、删除、增加和 EOF anchor | [E: packages/opencode/src/patch/index.ts:25] [E: packages/opencode/src/patch/index.ts:26] [E: packages/opencode/src/patch/index.ts:27] [E: packages/opencode/src/patch/index.ts:28] |
| `ApplyPatchFileChange` | add/delete/update variants | verified parse 生成的 per-file change | [E: packages/opencode/src/patch/index.ts:38] [E: packages/opencode/src/patch/index.ts:39] [E: packages/opencode/src/patch/index.ts:40] [E: packages/opencode/src/patch/index.ts:609] [E: packages/opencode/src/patch/index.ts:624] [E: packages/opencode/src/patch/index.ts:648] |

## Parser 与 fuzzy engine

`parsePatch` 先剥 heredoc，再查 `*** Begin Patch` 与 `*** End Patch` marker，缺失或顺序错误就 throw [E: packages/opencode/src/patch/index.ts:186] [E: packages/opencode/src/patch/index.ts:195] [E: packages/opencode/src/patch/index.ts:196] [E: packages/opencode/src/patch/index.ts:198]。`parsePatchHeader` 支持 `*** Add File:`、`*** Delete File:`、`*** Update File:`，并在 update 后识别 `*** Move to:` [E: packages/opencode/src/patch/index.ts:76] [E: packages/opencode/src/patch/index.ts:81] [E: packages/opencode/src/patch/index.ts:86] [E: packages/opencode/src/patch/index.ts:92] [E: packages/opencode/src/patch/index.ts:93]。

`deriveNewContentsFromChunks` 会保留 UTF-8 BOM 信息、丢弃尾部空 split 元素、调用 `computeReplacements`、倒序应用 replacements，并确保输出以换行结束 [E: packages/opencode/src/patch/index.ts:312] [E: packages/opencode/src/patch/index.ts:317] [E: packages/opencode/src/patch/index.ts:321] [E: packages/opencode/src/patch/index.ts:402] [E: packages/opencode/src/patch/index.ts:325] [E: packages/opencode/src/patch/index.ts:338]。四轮 fuzzy seek 在 `seekSequence` 中按顺序执行：exact match、`trimEnd`、`trim`、Unicode punctuation normalized after trim [E: packages/opencode/src/patch/index.ts:464] [E: packages/opencode/src/patch/index.ts:468] [E: packages/opencode/src/patch/index.ts:472] [E: packages/opencode/src/patch/index.ts:480]。

## 工具控制流

1. `ApplyPatchTool.execute` 先校验 `patchText` 非空，然后 `Patch.parsePatch(params.patchText)` 得到 hunks [E: packages/opencode/src/tool/apply_patch.ts:34] [E: packages/opencode/src/tool/apply_patch.ts:41]。
2. empty patch 被明确拒绝；没有 hunks 也视为 verification failed [E: packages/opencode/src/tool/apply_patch.ts:50] [E: packages/opencode/src/tool/apply_patch.ts:52]。
3. 对每个 hunk，tool 把 path resolve 到 `instance.directory` 下，并调用 `assertExternalDirectoryEffect(ctx, filePath)` [E: packages/opencode/src/tool/apply_patch.ts:73] [E: packages/opencode/src/tool/apply_patch.ts:74]。
4. add hunk 构造 old empty/new content diff，统计 additions/deletions，加入 `fileChanges` [E: packages/opencode/src/tool/apply_patch.ts:78] [E: packages/opencode/src/tool/apply_patch.ts:80] [E: packages/opencode/src/tool/apply_patch.ts:87] [E: packages/opencode/src/tool/apply_patch.ts:88] [E: packages/opencode/src/tool/apply_patch.ts:91]。
5. update hunk 先 stat 目标，目录或缺失时报错；读取 BOM-aware source 后调用 `Patch.deriveNewContentsFromChunks` [E: packages/opencode/src/tool/apply_patch.ts:108] [E: packages/opencode/src/tool/apply_patch.ts:115] [E: packages/opencode/src/tool/apply_patch.ts:122]。
6. update hunk 若有 `move_path`，tool 解析 move target 并对 move target 也做 external directory check [E: packages/opencode/src/tool/apply_patch.ts:142] [E: packages/opencode/src/tool/apply_patch.ts:143]。
7. delete hunk 读取待删文件，生成 delete diff，并把 type 设为 `"delete"` [E: packages/opencode/src/tool/apply_patch.ts:162] [E: packages/opencode/src/tool/apply_patch.ts:172] [E: packages/opencode/src/tool/apply_patch.ts:180]。
8. tool 汇总 `files` metadata 与 `totalDiff`，通过 `ctx.ask({ permission: "edit", patterns: relativePaths, always: ["*"], metadata: { filepath, diff, files } })` 请求一次 edit batch approval [E: packages/opencode/src/tool/apply_patch.ts:194] [E: packages/opencode/src/tool/apply_patch.ts:205] [E: packages/opencode/src/tool/apply_patch.ts:206] [E: packages/opencode/src/tool/apply_patch.ts:207] [E: packages/opencode/src/tool/apply_patch.ts:208] [E: packages/opencode/src/tool/apply_patch.ts:209] [E: packages/opencode/src/tool/apply_patch.ts:211] [E: packages/opencode/src/tool/apply_patch.ts:212] [E: packages/opencode/src/tool/apply_patch.ts:213]。
9. 写入阶段遍历 `fileChanges`：add/update 写文件，move 写 movePath 后 remove 原路径，delete remove 文件 [E: packages/opencode/src/tool/apply_patch.ts:220] [E: packages/opencode/src/tool/apply_patch.ts:226] [E: packages/opencode/src/tool/apply_patch.ts:231] [E: packages/opencode/src/tool/apply_patch.ts:239] [E: packages/opencode/src/tool/apply_patch.ts:240] [E: packages/opencode/src/tool/apply_patch.ts:247]。
10. 对 add/update/move target，tool 调用 formatter，随后 publish `FileSystem.Event.Edited` [E: packages/opencode/src/tool/apply_patch.ts:253] [E: packages/opencode/src/tool/apply_patch.ts:256]。
11. 所有 updates 会 publish `Watcher.Event.Updated`，非 delete 文件会 `lsp.touchFile` 并收集 `lsp.diagnostics()` [E: packages/opencode/src/tool/apply_patch.ts:262] [E: packages/opencode/src/tool/apply_patch.ts:269] [E: packages/opencode/src/tool/apply_patch.ts:271]。

## `maybeParseApplyPatchVerified`

V1 patch helper 还能从 shell argv 识别 apply_patch：直接形式要求 `argv.length === 2` 且命令是 `apply_patch` 或 `applypatch`；bash heredoc 形式要求 `argv` 是 `["bash", "-lc", script]` 并匹配带引号 delimiter 的 `apply_patch <<"EOF"` 或 `apply_patch <<'EOF'` 形式 [E: packages/opencode/src/patch/index.ts:250] [E: packages/opencode/src/patch/index.ts:253] [E: packages/opencode/src/patch/index.ts:272] [E: packages/opencode/src/patch/index.ts:275]。verified 版本会读取现有文件，预先 derive update 内容，并把 add/delete/update 变成 `ApplyPatchAction.changes` [E: packages/opencode/src/patch/index.ts:609] [E: packages/opencode/src/patch/index.ts:617] [E: packages/opencode/src/patch/index.ts:624] [E: packages/opencode/src/patch/index.ts:647] [E: packages/opencode/src/patch/index.ts:648]。

## 设计动机与权衡

V1 tool 层把 patch 应用和开发者 UX 紧耦合：permission metadata 带 diff、formatter 自动运行、LSP diagnostics 直接追加到 output。这让一次 apply_patch 后 UI 和模型能立即看到更新摘要和诊断，但也意味着 engine 不是纯事务层；写入阶段没有跨文件 rollback 逻辑 [I]。V2 对应节点 `execution.patch-v2` 明确把 moves 和 atomic rollback 留作 follow-up。

## Gotcha

- V1 支持 move：`*** Move to:` 进入 `hunk.move_path`，tool 层 type 会变成 `"move"`。
- V1 parser 对 update line 的未知行较宽松；`parseUpdateFileChunks` 不认识的行会被跳过到下一行 [E: packages/opencode/src/patch/index.ts:150]。
- `applyHunksToFiles` 是直接 filesystem helper，不会跑 formatter/LSP；formatter/LSP 只在 tool 层发生。
- `assertExternalDirectoryEffect` 对外部 target 请求 `external_directory`，但主要 mutation approval 仍是 `edit`。

## Sources

- packages/opencode/src/patch/index.ts
- packages/opencode/src/tool/apply_patch.ts
- packages/opencode/src/tool/external-directory.ts
- packages/opencode/src/tool/registry.ts

## 相关

- [V2 apply_patch 引擎+工具](patch-v2.md)
- [apply_patch 格式与 fuzzy passes](../../reference/patch-format.md)
