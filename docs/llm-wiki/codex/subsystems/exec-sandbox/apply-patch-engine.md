---
id: subsys.exec-sandbox.apply-patch-engine
title: apply_patch engine
kind: subsystem
tier: T2
source: [codex-rs/apply-patch/src/parser.rs, codex-rs/apply-patch/src/lib.rs, codex-rs/apply-patch/src/invocation.rs, codex-rs/apply-patch/src/seek_sequence.rs]
symbols: [parse_patch, parse_patch_text, Hunk, UpdateFileChunk, apply_patch, apply_hunks_to_files, MaybeApplyPatchVerified, maybe_parse_apply_patch_verified]
related: [tool.apply-patch, spine.trace-apply-patch, subsys.exec-sandbox.arg0-dispatch]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> apply_patch engine 把 custom tool 或 shell-heredoc 里的 patch 文本解析成 add/delete/update hunks，再用 filesystem abstraction 计算替换、写文件、移动文件或删除文件。[E: codex-rs/apply-patch/src/parser.rs:126][E: codex-rs/apply-patch/src/lib.rs:182][E: codex-rs/apply-patch/src/lib.rs:266]

## 能回答的问题

- apply_patch patch 文本怎样被解析成 `Hunk` 和 `UpdateFileChunk`？
- add/delete/update/move 各自怎样作用于 filesystem？
- update chunk 怎样定位旧行、处理 EOF 和 final newline？
- shell 命令中的 `apply_patch <<EOF` 怎样被识别为 patch body？
- parser strict/lenient/streaming mode 的边界有什么差异？

## 职责边界

apply_patch engine 节点覆盖 `codex_apply_patch` crate 的 parser、invocation classifier、patch application 和 replacement algorithm。它不覆盖模型可见 tool schema；tool schema 在 `tool.apply-patch`，shell/unified exec 的 interception trace 在 `spine.trace-apply-patch`。[I]

`CODEX_CORE_APPLY_PATCH_ARG1` 是 core 内部 argv1 marker，用来让 arg0 dispatch 直接执行 apply_patch body；它不是用户输入语法的一部分。[E: codex-rs/apply-patch/src/lib.rs:35][E: codex-rs/apply-patch/src/lib.rs:42]

## 关键 crate/文件

- `codex-rs/apply-patch/src/parser.rs`: patch 文本 parser、hunk AST、strict/lenient/streaming mode 和 parse errors。[E: codex-rs/apply-patch/src/parser.rs:52][E: codex-rs/apply-patch/src/parser.rs:61][E: codex-rs/apply-patch/src/parser.rs:126][E: codex-rs/apply-patch/src/parser.rs:143]
- `codex-rs/apply-patch/src/lib.rs`: public API、patch application、filesystem writes/deletes/moves、replacement computation 和 summary printing。[E: codex-rs/apply-patch/src/lib.rs:1][E: codex-rs/apply-patch/src/lib.rs:182][E: codex-rs/apply-patch/src/lib.rs:266][E: codex-rs/apply-patch/src/lib.rs:594]
- `codex-rs/apply-patch/src/invocation.rs`: shell command classifier，把 direct `apply_patch` 或 heredoc shell form 解析为 patch body。[E: codex-rs/apply-patch/src/invocation.rs:27][E: codex-rs/apply-patch/src/invocation.rs:105][E: codex-rs/apply-patch/src/invocation.rs:112]
- `codex-rs/apply-patch/src/seek_sequence.rs`: update chunk 的 fuzzy line seek helper。[E: codex-rs/apply-patch/src/seek_sequence.rs:18][E: codex-rs/apply-patch/src/seek_sequence.rs:34][E: codex-rs/apply-patch/src/seek_sequence.rs:40][E: codex-rs/apply-patch/src/seek_sequence.rs:53]

## 数据模型

- `Hunk`: `AddFile { path, contents }`、`DeleteFile { path }`、`UpdateFile { path, move_path, chunks }` 三种 patch action。[E: codex-rs/apply-patch/src/parser.rs:63][E: codex-rs/apply-patch/src/parser.rs:67][E: codex-rs/apply-patch/src/parser.rs:71]
- `Hunk::resolve_path`: add/delete/update 都用 hunk 的原 path 做 filesystem resolution；`Hunk::path` 在 update-with-move 场景会返回 move destination。[E: codex-rs/apply-patch/src/parser.rs:81][E: codex-rs/apply-patch/src/parser.rs:84][E: codex-rs/apply-patch/src/parser.rs:85][E: codex-rs/apply-patch/src/parser.rs:87][E: codex-rs/apply-patch/src/parser.rs:90][E: codex-rs/apply-patch/src/parser.rs:96]
- `UpdateFileChunk`: 每个 update chunk 包含 optional `change_context`、`old_lines`、`new_lines` 和 `is_end_of_file` 标志。[E: codex-rs/apply-patch/src/parser.rs:110][E: codex-rs/apply-patch/src/parser.rs:113][E: codex-rs/apply-patch/src/parser.rs:117][E: codex-rs/apply-patch/src/parser.rs:121]
- `ApplyPatchArgs`: parser 输出 `patch` 原文、`hunks` AST 和 optional `workdir`。[E: codex-rs/apply-patch/src/lib.rs:92][E: codex-rs/apply-patch/src/lib.rs:94][E: codex-rs/apply-patch/src/lib.rs:95][E: codex-rs/apply-patch/src/lib.rs:96]
- `ApplyPatchFileChange`: verified invocation 会把 hunks 转成 Add/Delete/Update changes，Update 可携带 `move_path`。[E: codex-rs/apply-patch/src/lib.rs:101][E: codex-rs/apply-patch/src/lib.rs:103][E: codex-rs/apply-patch/src/lib.rs:106][E: codex-rs/apply-patch/src/lib.rs:109]
- `MaybeApplyPatchVerified`: classifier 的结果可能是 `Body`、`ShellParseError`、`CorrectnessError` 或 `NotApplyPatch`。[E: codex-rs/apply-patch/src/lib.rs:117][E: codex-rs/apply-patch/src/lib.rs:120][E: codex-rs/apply-patch/src/lib.rs:124][E: codex-rs/apply-patch/src/lib.rs:127]

## parser 控制流

1. `parse_patch` 当前调用 `parse_patch_text` 并使用 `ParseMode::Lenient`，因为 `PARSE_IN_STRICT_MODE` 常量是 false。[E: codex-rs/apply-patch/src/parser.rs:44][E: codex-rs/apply-patch/src/parser.rs:126][E: codex-rs/apply-patch/src/parser.rs:130]
2. `parse_patch_text` trim 输入，按 parse mode 校验 begin/end marker，然后循环 `parse_one_hunk`，最终返回 `ApplyPatchArgs { patch, hunks, workdir: None }`。[E: codex-rs/apply-patch/src/parser.rs:188][E: codex-rs/apply-patch/src/parser.rs:195][E: codex-rs/apply-patch/src/parser.rs:205][E: codex-rs/apply-patch/src/parser.rs:209]
3. lenient boundary mode 先尝试 strict marker；strict 失败后，只接受第一行是 `<<EOF`、`<<'EOF'`、`<<"EOF"` 且最后一行以 `EOF` 结尾的 heredoc wrapper，再对 inner lines 重新跑 strict boundary check。[E: codex-rs/apply-patch/src/parser.rs:257][E: codex-rs/apply-patch/src/parser.rs:262][E: codex-rs/apply-patch/src/parser.rs:264][E: codex-rs/apply-patch/src/parser.rs:269]
4. `parse_one_hunk` 遇到 `*** Add File:` 时读取后续以 `+` 开头的正文行，并把去掉 `+` 后的行保存为 file contents；遇到第一条非 `+` 行时结束 Add File hunk。[E: codex-rs/apply-patch/src/parser.rs:300][E: codex-rs/apply-patch/src/parser.rs:309][E: codex-rs/apply-patch/src/parser.rs:312][E: codex-rs/apply-patch/src/parser.rs:317]
5. `parse_one_hunk` 遇到 `*** Delete File:` 直接构造 delete hunk；遇到 `*** Update File:` 时可选读取 `*** Move to:`，再读取一个或多个 update chunks。[E: codex-rs/apply-patch/src/parser.rs:327][E: codex-rs/apply-patch/src/parser.rs:335][E: codex-rs/apply-patch/src/parser.rs:342][E: codex-rs/apply-patch/src/parser.rs:375]
6. update hunk 为空会报错，成功时构造 `Hunk::UpdateFile { path, move_path, chunks }`。[E: codex-rs/apply-patch/src/parser.rs:385][E: codex-rs/apply-patch/src/parser.rs:392][E: codex-rs/apply-patch/src/parser.rs:395]
7. `parse_update_file_chunk` 读取 `@@` 或 `@@ context`，把空格开头行归入 old/new 两侧，把 `+` 行归入 new，把 `-` 行归入 old，并识别 `*** End of File`。[E: codex-rs/apply-patch/src/parser.rs:410][E: codex-rs/apply-patch/src/parser.rs:433][E: codex-rs/apply-patch/src/parser.rs:464][E: codex-rs/apply-patch/src/parser.rs:472][E: codex-rs/apply-patch/src/parser.rs:479][E: codex-rs/apply-patch/src/parser.rs:495]

## application 控制流

1. `apply_patch` 先 `parse_patch`，parse error 会打印 `Invalid patch:`，然后调用 `apply_hunks`。[E: codex-rs/apply-patch/src/lib.rs:182][E: codex-rs/apply-patch/src/lib.rs:188][E: codex-rs/apply-patch/src/lib.rs:206]
2. `apply_hunks` 调用 `apply_hunks_to_files`，成功后打印 summary；失败时先把 error 文本写到 stderr，若底层是 `std::io::Error` 则转为 IO error，否则包装为 `ApplyPatchError::IoError`。[E: codex-rs/apply-patch/src/lib.rs:218][E: codex-rs/apply-patch/src/lib.rs:228][E: codex-rs/apply-patch/src/lib.rs:235][E: codex-rs/apply-patch/src/lib.rs:236][E: codex-rs/apply-patch/src/lib.rs:239]
3. `apply_hunks_to_files` 拒绝空 hunk 列表，然后逐个 hunk 处理并记录 added/modified/deleted path sets。[E: codex-rs/apply-patch/src/lib.rs:266][E: codex-rs/apply-patch/src/lib.rs:273][E: codex-rs/apply-patch/src/lib.rs:356]
4. Add file 调用 `write_file_with_missing_parent_retry`；如果 parent directory missing，会尝试创建 parent 后再写一次。[E: codex-rs/apply-patch/src/lib.rs:277][E: codex-rs/apply-patch/src/lib.rs:363][E: codex-rs/apply-patch/src/lib.rs:385]
5. Delete file 先取 metadata，拒绝删除 directory，然后用 `RemoveOptions { recursive: false, force: false }` 删除 file。[E: codex-rs/apply-patch/src/lib.rs:287][E: codex-rs/apply-patch/src/lib.rs:298][E: codex-rs/apply-patch/src/lib.rs:303]
6. Update file 先 `derive_new_contents_from_chunks`，如果存在 `move_path` 则写 destination 并删除原 path，否则写回原 path。[E: codex-rs/apply-patch/src/lib.rs:310][E: codex-rs/apply-patch/src/lib.rs:316][E: codex-rs/apply-patch/src/lib.rs:329][E: codex-rs/apply-patch/src/lib.rs:343]
7. `derive_new_contents_from_chunks` 读取原文件文本，split 成 lines，计算 replacements，反向应用 replacements，并确保最终内容以 newline 结尾。[E: codex-rs/apply-patch/src/lib.rs:410][E: codex-rs/apply-patch/src/lib.rs:417][E: codex-rs/apply-patch/src/lib.rs:425][E: codex-rs/apply-patch/src/lib.rs:427][E: codex-rs/apply-patch/src/lib.rs:430]
8. `compute_replacements` 可用 `change_context` 先 seek；纯添加 chunk 可以插入到文件末尾或 final empty line 前；旧行匹配失败会返回包含 unified diff 的错误。[E: codex-rs/apply-patch/src/lib.rs:449][E: codex-rs/apply-patch/src/lib.rs:469][E: codex-rs/apply-patch/src/lib.rs:492][E: codex-rs/apply-patch/src/lib.rs:514][E: codex-rs/apply-patch/src/lib.rs:518]
9. `apply_replacements` 按 start index 倒序替换，避免前面的替换改变后续 replacement 的 index。[E: codex-rs/apply-patch/src/lib.rs:531][E: codex-rs/apply-patch/src/lib.rs:539]

## shell invocation classifier

- `maybe_parse_apply_patch` 识别 direct `[apply_patch, body]`，也识别 shell heredoc 形态并提取 patch body。[E: codex-rs/apply-patch/src/invocation.rs:105][E: codex-rs/apply-patch/src/invocation.rs:112]
- `maybe_parse_apply_patch_verified` 会把 `ApplyPatchAction` 的 cwd 解析为 effective cwd，并把 AST changes 投影成 Add/Delete/Update 变更列表。[E: codex-rs/apply-patch/src/invocation.rs:159][E: codex-rs/apply-patch/src/invocation.rs:163][E: codex-rs/apply-patch/src/invocation.rs:176][E: codex-rs/apply-patch/src/invocation.rs:191]
- 如果模型直接给了 raw patch body 而不是 apply_patch command，classifier 会返回 implicit invocation correctness error。[E: codex-rs/apply-patch/src/invocation.rs:140][E: codex-rs/apply-patch/src/invocation.rs:151]

## 设计动机与权衡

- parser 默认 lenient mode，说明 engine 更愿意从裸 patch 或有限 heredoc boundary 中恢复 patch，而不是只接受严格裸 patch 文本。[E: codex-rs/apply-patch/src/parser.rs:44][E: codex-rs/apply-patch/src/parser.rs:126][E: codex-rs/apply-patch/src/parser.rs:254]
- replacement computation 使用 seek/fuzzy matching 而不是直接按行号应用，因为 apply_patch grammar 没有行号字段，chunk 的旧行和 context 是唯一定位信息。[I]
- `seek_sequence` 先 exact match，再 trim-end、trim-both、Unicode normalize fallback，体现了对格式细微差异的容错。[E: codex-rs/apply-patch/src/seek_sequence.rs:34][E: codex-rs/apply-patch/src/seek_sequence.rs:40][E: codex-rs/apply-patch/src/seek_sequence.rs:53][E: codex-rs/apply-patch/src/seek_sequence.rs:76]

## gotcha

- Add File hunk 只消费连续的 `+` 行；第一条非 `+` 行会结束该 hunk，因此空 Add File hunk 在 parser 层可以生成空 contents。[E: codex-rs/apply-patch/src/parser.rs:309][E: codex-rs/apply-patch/src/parser.rs:312][E: codex-rs/apply-patch/src/parser.rs:317][E: codex-rs/apply-patch/src/parser.rs:320]
- Delete File 不会递归删除目录；目录 metadata 会导致错误。[E: codex-rs/apply-patch/src/lib.rs:298][E: codex-rs/apply-patch/src/lib.rs:303]
- Update hunk 没有任何 chunk 时会被拒绝，不会生成 no-op update。[E: codex-rs/apply-patch/src/parser.rs:385][E: codex-rs/apply-patch/src/parser.rs:389]
- `parse_patch_streaming` 目前直接调用 `parse_patch_text` 的 streaming mode；代码注释外没有额外 incremental parser state。[E: codex-rs/apply-patch/src/parser.rs:135][E: codex-rs/apply-patch/src/parser.rs:141]

## Sources

- `codex-rs/apply-patch/src/parser.rs`
- `codex-rs/apply-patch/src/lib.rs`
- `codex-rs/apply-patch/src/invocation.rs`
- `codex-rs/apply-patch/src/seek_sequence.rs`

## 相关

- `tool.apply-patch`
- `spine.trace-apply-patch`
- `subsys.exec-sandbox.arg0-dispatch`
