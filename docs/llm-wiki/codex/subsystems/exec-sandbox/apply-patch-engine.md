---
id: subsys.exec-sandbox.apply-patch-engine
title: apply_patch engine
kind: subsystem
tier: T2
source: [codex-rs/apply-patch/src/parser.rs, codex-rs/apply-patch/src/lib.rs, codex-rs/apply-patch/src/invocation.rs, codex-rs/apply-patch/src/seek_sequence.rs, codex-rs/apply-patch/src/streaming_parser.rs, codex-rs/apply-patch/src/file_update.rs, codex-rs/apply-patch/src/text_file.rs, codex-rs/core/src/tools/handlers/apply_patch.rs, codex-rs/core/src/tools/runtimes/apply_patch.rs, codex-rs/protocol/src/permissions.rs, codex-rs/features/src/lib.rs]
symbols: [parse_patch, parse_patch_text, StreamingPatchParser, Hunk, UpdateFileChunk, ApplyPatchArgs, apply_patch, apply_patch_with_mode, apply_hunks_to_files, MaybeApplyPatchVerified, maybe_parse_apply_patch_verified_with_mode, ApplyPatchRuntime, ApplyPatchFileUpdateMode, SourceFile, PROTECTED_METADATA_PATH_NAMES]
related: [tool.apply-patch, spine.trace-apply-patch, subsys.exec-sandbox.arg0-dispatch]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> apply_patch engine 把 custom tool 或 shell-heredoc 里的 patch 文本解析成 add/delete/update hunks，再用 filesystem abstraction 计算替换、写文件、移动文件或删除文件。[E: codex-rs/apply-patch/src/parser.rs:145][E: codex-rs/apply-patch/src/lib.rs:319][E: codex-rs/apply-patch/src/lib.rs:450]

## 能回答的问题

- apply_patch patch 文本怎样被解析成 `Hunk` 和 `UpdateFileChunk`？
- add/delete/update/move 各自怎样作用于 filesystem？
- update chunk 怎样定位旧行、处理 EOF 和 final newline？
- `ApplyPatchPreserveLineEndings` 如何保留 CRLF / mixed line endings？
- shell 命令中的 `apply_patch <<EOF` 怎样被识别为 patch body？
- parser strict/lenient/streaming mode 的边界有什么差异？
- verified patch 怎样统一进入 runtime，并保留 workspace metadata protection？

## 职责边界

apply_patch engine 节点覆盖 `codex_apply_patch` crate 的 parser、invocation classifier、patch application 和 replacement algorithm，并记录 core runtime 怎样把 verified patch 接到 permission/sandbox boundary。它不覆盖模型可见 tool schema；tool schema 在 `tool.apply-patch`，shell/unified exec 的完整 interception trace 在 `spine.trace-apply-patch`。[I]

`CODEX_CORE_APPLY_PATCH_ARG1` 是 core 内部 argv1 marker，用来让 arg0 dispatch 直接执行 apply_patch body；它不是用户输入语法的一部分。[E: codex-rs/apply-patch/src/lib.rs:52]

## 关键 crate/文件

- `codex-rs/apply-patch/src/parser.rs`: patch 文本 parser、hunk AST、strict/lenient boundary handling 和 parse errors；streaming state lives in `streaming_parser.rs`.[E: codex-rs/apply-patch/src/parser.rs:53][E: codex-rs/apply-patch/src/parser.rs:66][E: codex-rs/apply-patch/src/parser.rs:145][E: codex-rs/apply-patch/src/parser.rs:193]
- `codex-rs/apply-patch/src/lib.rs`: public API、patch application、filesystem writes/deletes/moves 和 summary printing。[E: codex-rs/apply-patch/src/lib.rs:1][E: codex-rs/apply-patch/src/lib.rs:319][E: codex-rs/apply-patch/src/lib.rs:450][E: codex-rs/apply-patch/src/lib.rs:766]
- `codex-rs/apply-patch/src/file_update.rs`: update hunk 的 replacement 计算和 `derive_new_contents_from_chunks`。[E: codex-rs/apply-patch/src/file_update.rs:25][E: codex-rs/apply-patch/src/file_update.rs:82]
- `codex-rs/apply-patch/src/text_file.rs`: `SourceFile` 按 LF/CRLF/CR 拆行并保留每行 terminator。[E: codex-rs/apply-patch/src/text_file.rs:3][E: codex-rs/apply-patch/src/text_file.rs:25][E: codex-rs/apply-patch/src/text_file.rs:35]
- `codex-rs/apply-patch/src/invocation.rs`: shell command classifier，把 direct `apply_patch` 或 heredoc shell form 解析为 patch body。[E: codex-rs/apply-patch/src/invocation.rs:28]
- `codex-rs/apply-patch/src/seek_sequence.rs`: update chunk 的 fuzzy line seek helper，并按 update mode 调整 EOF 搜索起点。[E: codex-rs/apply-patch/src/seek_sequence.rs:12][E: codex-rs/apply-patch/src/seek_sequence.rs:32]
- `codex-rs/apply-patch/src/streaming_parser.rs`: incremental parser state, environment-id marker handling, and `StreamingPatchParser` public API.[E: codex-rs/apply-patch/src/streaming_parser.rs:22][E: codex-rs/apply-patch/src/streaming_parser.rs:49][E: codex-rs/apply-patch/src/streaming_parser.rs:84][E: codex-rs/apply-patch/src/streaming_parser.rs:139]

## 数据模型

- `Hunk`: `AddFile { path, contents }`、`DeleteFile { path }`、`UpdateFile { path, move_path, chunks }` 三种 patch action。[E: codex-rs/apply-patch/src/parser.rs:66][E: codex-rs/apply-patch/src/parser.rs:68][E: codex-rs/apply-patch/src/parser.rs:72]
- `Hunk::resolve_path`: add/delete/update 都用 hunk 的原 path 做 filesystem resolution；`Hunk::path` 在 update-with-move 场景会返回 move destination。[E: codex-rs/apply-patch/src/parser.rs:85][E: codex-rs/apply-patch/src/parser.rs:87][E: codex-rs/apply-patch/src/parser.rs:94][E: codex-rs/apply-patch/src/parser.rs:98]
- `UpdateFileChunk`: 每个 update chunk 包含 optional `change_context`、`old_lines`、`new_lines`、`context_line_indices` 和 `is_end_of_file` 标志。[E: codex-rs/apply-patch/src/parser.rs:115][E: codex-rs/apply-patch/src/parser.rs:118][E: codex-rs/apply-patch/src/parser.rs:122][E: codex-rs/apply-patch/src/parser.rs:127][E: codex-rs/apply-patch/src/parser.rs:131]
- `ApplyPatchFileUpdateMode`: 默认 `NormalizeToLf`；`PreserveLineEndings` 保留现有行结尾，并用文件首选 ending 写新行。[E: codex-rs/apply-patch/src/lib.rs:61][E: codex-rs/apply-patch/src/lib.rs:64][E: codex-rs/apply-patch/src/lib.rs:66]
- `ApplyPatchArgs`: parser 输出 `patch` 原文、`hunks` AST、optional `workdir` 和 optional `environment_id`。[E: codex-rs/apply-patch/src/lib.rs:132][E: codex-rs/apply-patch/src/lib.rs:133][E: codex-rs/apply-patch/src/lib.rs:134][E: codex-rs/apply-patch/src/lib.rs:135][E: codex-rs/apply-patch/src/lib.rs:136]
- `MaybeApplyPatchVerified`: classifier 的结果可能是 `Body`、`ShellParseError`、`CorrectnessError` 或 `NotApplyPatch`。[E: codex-rs/apply-patch/src/lib.rs:156]

## parser 控制流

1. `parse_patch` 当前调用 `parse_patch_text` 并使用 `ParseMode::Lenient`，因为 `PARSE_IN_STRICT_MODE` 常量是 false。[E: codex-rs/apply-patch/src/parser.rs:53][E: codex-rs/apply-patch/src/parser.rs:145][E: codex-rs/apply-patch/src/parser.rs:146][E: codex-rs/apply-patch/src/parser.rs:149][E: codex-rs/apply-patch/src/parser.rs:151]
2. `parse_patch_text` trim 输入，按 parse mode 校验 begin/end marker，把 patch delta 推入 `StreamingPatchParser`，finish hunks, carries `environment_id`, and returns `ApplyPatchArgs` with `workdir: None`.[E: codex-rs/apply-patch/src/parser.rs:193][E: codex-rs/apply-patch/src/parser.rs:194][E: codex-rs/apply-patch/src/parser.rs:201][E: codex-rs/apply-patch/src/parser.rs:203][E: codex-rs/apply-patch/src/parser.rs:204][E: codex-rs/apply-patch/src/parser.rs:209]
3. lenient boundary mode 先尝试 strict marker；strict 失败后，只接受第一行是 `<<EOF`、`<<'EOF'`、`<<"EOF"` 且最后一行以 `EOF` 结尾的 heredoc wrapper，再对 inner lines 重新跑 strict boundary check。[E: codex-rs/apply-patch/src/parser.rs:235][E: codex-rs/apply-patch/src/parser.rs:242][E: codex-rs/apply-patch/src/parser.rs:243]
4. `StreamingPatchParser::handle_hunk_headers_and_end_patch` 识别 `*** Add File:`、`*** Delete File:`、`*** Update File:`、`*** End Patch` 和 optional environment id，并把对应 `Hunk` push 进 parser state。[E: codex-rs/apply-patch/src/streaming_parser.rs:84][E: codex-rs/apply-patch/src/streaming_parser.rs:102][E: codex-rs/apply-patch/src/streaming_parser.rs:107][E: codex-rs/apply-patch/src/streaming_parser.rs:116][E: codex-rs/apply-patch/src/streaming_parser.rs:124]
5. streaming `push_delta` 在换行前剥掉 `\r`，因此 CRLF patch 文本不会把 CR 留进 hunk 内容。[E: codex-rs/apply-patch/src/streaming_parser.rs:139][E: codex-rs/apply-patch/src/streaming_parser.rs:142][E: codex-rs/apply-patch/src/streaming_parser.rs:143]
6. Add File mode 只接受后续以 `+` 开头的正文行并追加到当前 add hunk；Delete File mode 只允许下一个 hunk header 或 end marker。[E: codex-rs/apply-patch/src/streaming_parser.rs:198][E: codex-rs/apply-patch/src/streaming_parser.rs:202][E: codex-rs/apply-patch/src/streaming_parser.rs:205][E: codex-rs/apply-patch/src/streaming_parser.rs:216][E: codex-rs/apply-patch/src/streaming_parser.rs:220]
7. Update File mode 可在首个 chunk 前读取 `*** Move to:`，通过 `@@`/`@@ context` 新建 chunk，并用 `*** End of File` 标记 EOF chunk。context 行走 `push_context_line`，以便后续 PreserveLineEndings 模式保留原行 terminator。[E: codex-rs/apply-patch/src/streaming_parser.rs:253][E: codex-rs/apply-patch/src/streaming_parser.rs:255][E: codex-rs/apply-patch/src/streaming_parser.rs:318][E: codex-rs/apply-patch/src/streaming_parser.rs:323][E: codex-rs/apply-patch/src/parser.rs:137]
8. Update File chunk 中空格开头行同时进入 old/new，`+` 行只进入 new，`-` 行只进入 old；空 update hunk 或空 chunk 会在 streaming parser 中报错。[E: codex-rs/apply-patch/src/streaming_parser.rs:53][E: codex-rs/apply-patch/src/streaming_parser.rs:55][E: codex-rs/apply-patch/src/streaming_parser.rs:318][E: codex-rs/apply-patch/src/streaming_parser.rs:329][E: codex-rs/apply-patch/src/streaming_parser.rs:340]

## application 控制流

1. `apply_patch` 默认调用 `apply_patch_with_mode(..., NormalizeToLf)`；parse error 会打印 `Invalid patch:`，然后调用 `apply_hunks_with_mode`。[E: codex-rs/apply-patch/src/lib.rs:319][E: codex-rs/apply-patch/src/lib.rs:327][E: codex-rs/apply-patch/src/lib.rs:329][E: codex-rs/apply-patch/src/lib.rs:350][E: codex-rs/apply-patch/src/lib.rs:355][E: codex-rs/apply-patch/src/lib.rs:377]
2. `apply_hunks_with_mode` 调用 `apply_hunks_to_files`，成功后打印 summary；失败时先把 error 文本写到 stderr，若底层是 `std::io::Error` 则转为 IO error，否则包装为 `ApplyPatchError::IoError`。[E: codex-rs/apply-patch/src/lib.rs:403][E: codex-rs/apply-patch/src/lib.rs:413][E: codex-rs/apply-patch/src/lib.rs:415][E: codex-rs/apply-patch/src/lib.rs:425][E: codex-rs/apply-patch/src/lib.rs:428]
3. `apply_hunks_to_files` 拒绝空 hunk 列表，然后逐个 hunk 处理并记录 added/modified/deleted path sets。[E: codex-rs/apply-patch/src/lib.rs:450][E: codex-rs/apply-patch/src/lib.rs:458][E: codex-rs/apply-patch/src/lib.rs:480]
4. Add file 调用 `write_file_with_missing_parent_retry`；如果 parent directory missing，会尝试创建 parent 后再写一次。[E: codex-rs/apply-patch/src/lib.rs:484][E: codex-rs/apply-patch/src/lib.rs:489][E: codex-rs/apply-patch/src/lib.rs:726]
5. Delete file 先取 metadata，拒绝删除 directory，然后用 `RemoveOptions { recursive: false, force: false }` 删除 file。[E: codex-rs/apply-patch/src/lib.rs:506][E: codex-rs/apply-patch/src/lib.rs:512][E: codex-rs/apply-patch/src/lib.rs:520][E: codex-rs/apply-patch/src/lib.rs:523][E: codex-rs/apply-patch/src/lib.rs:524]
6. Update file 先 `derive_new_contents_from_chunks`，如果存在 `move_path` 则写 destination 并删除原 path，否则写回原 path。[E: codex-rs/apply-patch/src/lib.rs:561][E: codex-rs/apply-patch/src/lib.rs:569][E: codex-rs/apply-patch/src/lib.rs:575][E: codex-rs/apply-patch/src/lib.rs:636]
7. `derive_new_contents_from_chunks` 现在按 `ApplyPatchFileUpdateMode` 分叉：`NormalizeToLf` 仍按 `\n` split、去掉 trailing empty line、反向 apply replacements，并确保最终内容以 newline 结尾；`PreserveLineEndings` 用 `SourceFile` 保留每行原 terminator，新行使用文件首选 ending。[E: codex-rs/apply-patch/src/file_update.rs:43][E: codex-rs/apply-patch/src/file_update.rs:45][E: codex-rs/apply-patch/src/file_update.rs:59][E: codex-rs/apply-patch/src/file_update.rs:62][E: codex-rs/apply-patch/src/file_update.rs:64][E: codex-rs/apply-patch/src/file_update.rs:70]
8. `SourceFile::parse` 识别 `\r\n`、单独 `\r` 和 `\n`；第一个现有 ending 成为 preferred style，没有 ending 时默认 LF。apply 后每行都会补上 ending，以匹配历史 trailing-newline 行为。[E: codex-rs/apply-patch/src/text_file.rs:42][E: codex-rs/apply-patch/src/text_file.rs:46][E: codex-rs/apply-patch/src/text_file.rs:53][E: codex-rs/apply-patch/src/text_file.rs:71][E: codex-rs/apply-patch/src/text_file.rs:84][E: codex-rs/apply-patch/src/text_file.rs:106]
9. PreserveLineEndings 的 `compute_replacements` 会按 `context_line_indices` 把 context 行留在原位，只替换真正变更的区间，从而保留 mixed line endings。[E: codex-rs/apply-patch/src/file_update.rs:172][E: codex-rs/apply-patch/src/file_update.rs:178][E: codex-rs/apply-patch/src/file_update.rs:185]
10. `seek_sequence` 先 exact match，再 trim-end、trim-both、Unicode normalize fallback。EOF chunk 在 `NormalizeToLf` 下从文件末尾起搜；`PreserveLineEndings` 则取 `eof_start.max(start)`，避免越过已消费的上下文。[E: codex-rs/apply-patch/src/seek_sequence.rs:32][E: codex-rs/apply-patch/src/seek_sequence.rs:33][E: codex-rs/apply-patch/src/seek_sequence.rs:34][E: codex-rs/apply-patch/src/seek_sequence.rs:40][E: codex-rs/apply-patch/src/seek_sequence.rs:46][E: codex-rs/apply-patch/src/seek_sequence.rs:59]

## shell invocation classifier

- `maybe_parse_apply_patch` 识别 direct `[apply_patch, body]`，也识别 shell heredoc 形态并提取 patch body。[E: codex-rs/apply-patch/src/invocation.rs:113][E: codex-rs/apply-patch/src/invocation.rs:116][E: codex-rs/apply-patch/src/invocation.rs:121][E: codex-rs/apply-patch/src/invocation.rs:122]
- `maybe_parse_apply_patch_verified` 默认走 `NormalizeToLf`；`maybe_parse_apply_patch_verified_with_mode` 把选中 mode 传给 verification。[E: codex-rs/apply-patch/src/invocation.rs:142][E: codex-rs/apply-patch/src/invocation.rs:148][E: codex-rs/apply-patch/src/invocation.rs:160][E: codex-rs/apply-patch/src/invocation.rs:182]
- 如果模型直接给了 raw patch body 而不是 apply_patch command，classifier 会返回 implicit invocation correctness error。[E: codex-rs/apply-patch/src/invocation.rs:169][E: codex-rs/apply-patch/src/invocation.rs:172]

## Core runtime 与 workspace protection

direct custom-tool handler 和 shell/unified-exec interception 在验证成功后都进入 `execute_verified_patch`；该共用路径计算 effective permissions、运行 safety preparation，再构造 `ApplyPatchRequest` 交给 `ToolOrchestrator` 与 `ApplyPatchRuntime`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:420][E: codex-rs/core/src/tools/handlers/apply_patch.rs:514][E: codex-rs/core/src/tools/handlers/apply_patch.rs:531][E: codex-rs/core/src/tools/handlers/apply_patch.rs:547][E: codex-rs/core/src/tools/handlers/apply_patch.rs:558][E: codex-rs/core/src/tools/handlers/apply_patch.rs:578]

core 通过 `Feature::ApplyPatchPreserveLineEndings` 选择 update mode；feature 当前 under-development 且默认关闭。standalone/arg0 路径则读 `CODEX_APPLY_PATCH_PRESERVE_LINE_ENDINGS` env。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:60][E: codex-rs/core/src/tools/handlers/apply_patch.rs:64][E: codex-rs/features/src/lib.rs:1006][E: codex-rs/features/src/lib.rs:1009][E: codex-rs/apply-patch/src/lib.rs:56][E: codex-rs/apply-patch/src/lib.rs:71][E: codex-rs/apply-patch/src/lib.rs:73]

runtime 实际写入时调用 `apply_patch_with_mode`，把 request 上的 update mode 传进 crate。[E: codex-rs/core/src/tools/runtimes/apply_patch.rs:176][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:178]

Sandboxed patch runtime 从 executor base `PermissionProfile` 加上本次 patch 的 additional permissions 构造 filesystem context，并把 workspace roots 作为独立边界保留；它不会直接复用已经 materialize workspace roots 的 attempt profile。[E: codex-rs/core/src/tools/runtimes/apply_patch.rs:87][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:94][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:98][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:101]

Restricted filesystem policy 默认保护 writable project roots 下的 `.git`、`.agents`、`.codex`；只有对具体 metadata path 的显式 write entry 才能形成更窄的例外。普通 workspace writable 并不等于这些 metadata children 可写。[E: codex-rs/protocol/src/permissions.rs:22][E: codex-rs/protocol/src/permissions.rs:27][E: codex-rs/protocol/src/permissions.rs:42][E: codex-rs/protocol/src/permissions.rs:57][E: codex-rs/protocol/src/permissions.rs:623][E: codex-rs/protocol/src/permissions.rs:624][E: codex-rs/protocol/src/permissions.rs:625]

patch 执行失败且被判断为 sandbox denial 时，runtime 会记录 normalized filesystem violation，再把结果映射成 sandbox-denied error；该记录是 tracing seam，不是新的 protocol event。[E: codex-rs/core/src/tools/runtimes/apply_patch.rs:203][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:209][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:213]

## 设计动机与权衡

- parser 默认 lenient mode，说明 engine 更愿意从裸 patch 或有限 heredoc boundary 中恢复 patch，而不是只接受严格裸 patch 文本。[E: codex-rs/apply-patch/src/parser.rs:53][E: codex-rs/apply-patch/src/parser.rs:145][E: codex-rs/apply-patch/src/parser.rs:149][E: codex-rs/apply-patch/src/parser.rs:235][E: codex-rs/apply-patch/src/parser.rs:242]
- replacement computation 使用 seek/fuzzy matching 而不是直接按行号应用，因为 apply_patch grammar 没有行号字段，chunk 的旧行和 context 是唯一定位信息。[I]
- PreserveLineEndings 把 context 行留在原位，是为了 mixed line endings 文件不会被整段替换成单一 ending。[E: codex-rs/apply-patch/src/file_update.rs:176][E: codex-rs/apply-patch/src/file_update.rs:176]

## gotcha

- Add File hunk 只消费 `+` 行；遇到新的 hunk header/end marker 会结束 Add File，其他非 `+` 行会报 invalid hunk header，因此空 Add File hunk 在 streaming parser 层可以生成空 contents。[E: codex-rs/apply-patch/src/streaming_parser.rs:198][E: codex-rs/apply-patch/src/streaming_parser.rs:202][E: codex-rs/apply-patch/src/streaming_parser.rs:205][E: codex-rs/apply-patch/src/streaming_parser.rs:209]
- Delete File 不会递归删除目录；目录 metadata 会导致错误。[E: codex-rs/apply-patch/src/lib.rs:512]
- Update hunk 没有任何 chunk 时会被拒绝，不会生成 no-op update。[E: codex-rs/apply-patch/src/streaming_parser.rs:53][E: codex-rs/apply-patch/src/streaming_parser.rs:55]
- `StreamingPatchParser` is real incremental state: callers can push deltas, inspect `environment_id`, and finish hunks; the non-streaming parser reuses it by pushing the full patch text once.[E: codex-rs/apply-patch/src/streaming_parser.rs:22][E: codex-rs/apply-patch/src/streaming_parser.rs:49][E: codex-rs/apply-patch/src/streaming_parser.rs:139][E: codex-rs/apply-patch/src/streaming_parser.rs:154][E: codex-rs/apply-patch/src/parser.rs:201][E: codex-rs/apply-patch/src/parser.rs:203]
- 未开 `apply_patch_preserve_line_endings` 时，update 仍会把目标文件归一化成 LF。[E: codex-rs/apply-patch/src/lib.rs:327][E: codex-rs/apply-patch/src/file_update.rs:44][E: codex-rs/apply-patch/src/file_update.rs:62]

## Sources

- `codex-rs/apply-patch/src/parser.rs`
- `codex-rs/apply-patch/src/lib.rs`
- `codex-rs/apply-patch/src/invocation.rs`
- `codex-rs/apply-patch/src/seek_sequence.rs`
- `codex-rs/apply-patch/src/streaming_parser.rs`
- `codex-rs/apply-patch/src/file_update.rs`
- `codex-rs/apply-patch/src/text_file.rs`
- `codex-rs/core/src/tools/handlers/apply_patch.rs`
- `codex-rs/core/src/tools/runtimes/apply_patch.rs`
- `codex-rs/protocol/src/permissions.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- `tool.apply-patch`
- `spine.trace-apply-patch`
- `subsys.exec-sandbox.arg0-dispatch`
