---
id: subsys.exec-sandbox.apply-patch-engine
title: apply_patch engine
kind: subsystem
tier: T2
source: [codex-rs/apply-patch/src/parser.rs, codex-rs/apply-patch/src/lib.rs, codex-rs/apply-patch/src/invocation.rs, codex-rs/apply-patch/src/seek_sequence.rs, codex-rs/apply-patch/src/streaming_parser.rs]
symbols: [parse_patch, parse_patch_text, StreamingPatchParser, Hunk, UpdateFileChunk, ApplyPatchArgs, apply_patch, apply_hunks_to_files, MaybeApplyPatchVerified, maybe_parse_apply_patch_verified]
related: [tool.apply-patch, spine.trace-apply-patch, subsys.exec-sandbox.arg0-dispatch]
evidence: explicit
status: verified
updated: db887d03e1
---

> apply_patch engine 把 custom tool 或 shell-heredoc 里的 patch 文本解析成 add/delete/update hunks，再用 filesystem abstraction 计算替换、写文件、移动文件或删除文件。[E: codex-rs/apply-patch/src/parser.rs:130][E: codex-rs/apply-patch/src/lib.rs:276][E: codex-rs/apply-patch/src/lib.rs:361]

## 能回答的问题

- apply_patch patch 文本怎样被解析成 `Hunk` 和 `UpdateFileChunk`？
- add/delete/update/move 各自怎样作用于 filesystem？
- update chunk 怎样定位旧行、处理 EOF 和 final newline？
- shell 命令中的 `apply_patch <<EOF` 怎样被识别为 patch body？
- parser strict/lenient/streaming mode 的边界有什么差异？

## 职责边界

apply_patch engine 节点覆盖 `codex_apply_patch` crate 的 parser、invocation classifier、patch application 和 replacement algorithm。它不覆盖模型可见 tool schema；tool schema 在 `tool.apply-patch`，shell/unified exec 的 interception trace 在 `spine.trace-apply-patch`。[I]

`CODEX_CORE_APPLY_PATCH_ARG1` 是 core 内部 argv1 marker，用来让 arg0 dispatch 直接执行 apply_patch body；它不是用户输入语法的一部分。[E: codex-rs/apply-patch/src/lib.rs:34][E: codex-rs/apply-patch/src/lib.rs:41]

## 关键 crate/文件

- `codex-rs/apply-patch/src/parser.rs`: patch 文本 parser、hunk AST、strict/lenient boundary handling 和 parse errors；streaming state lives in `streaming_parser.rs`.[E: codex-rs/apply-patch/src/parser.rs:53][E: codex-rs/apply-patch/src/parser.rs:62][E: codex-rs/apply-patch/src/parser.rs:130][E: codex-rs/apply-patch/src/parser.rs:139][E: codex-rs/apply-patch/src/parser.rs:178][E: codex-rs/apply-patch/src/parser.rs:186]
- `codex-rs/apply-patch/src/lib.rs`: public API、patch application、filesystem writes/deletes/moves、replacement computation 和 summary printing。[E: codex-rs/apply-patch/src/lib.rs:1][E: codex-rs/apply-patch/src/lib.rs:276][E: codex-rs/apply-patch/src/lib.rs:361][E: codex-rs/apply-patch/src/lib.rs:871]
- `codex-rs/apply-patch/src/invocation.rs`: shell command classifier，把 direct `apply_patch` 或 heredoc shell form 解析为 patch body。[E: codex-rs/apply-patch/src/invocation.rs:27][E: codex-rs/apply-patch/src/invocation.rs:106][E: codex-rs/apply-patch/src/invocation.rs:118]
- `codex-rs/apply-patch/src/seek_sequence.rs`: update chunk 的 fuzzy line seek helper。[E: codex-rs/apply-patch/src/seek_sequence.rs:18][E: codex-rs/apply-patch/src/seek_sequence.rs:35][E: codex-rs/apply-patch/src/seek_sequence.rs:41][E: codex-rs/apply-patch/src/seek_sequence.rs:54]
- `codex-rs/apply-patch/src/streaming_parser.rs`: incremental parser state, environment-id marker handling, and `StreamingPatchParser` public API.[E: codex-rs/apply-patch/src/streaming_parser.rs:19][E: codex-rs/apply-patch/src/streaming_parser.rs:22][E: codex-rs/apply-patch/src/streaming_parser.rs:48][E: codex-rs/apply-patch/src/streaming_parser.rs:86][E: codex-rs/apply-patch/src/streaming_parser.rs:139][E: codex-rs/apply-patch/src/streaming_parser.rs:154]

## 数据模型

- `Hunk`: `AddFile { path, contents }`、`DeleteFile { path }`、`UpdateFile { path, move_path, chunks }` 三种 patch action。[E: codex-rs/apply-patch/src/parser.rs:66][E: codex-rs/apply-patch/src/parser.rs:68][E: codex-rs/apply-patch/src/parser.rs:72]
- `Hunk::resolve_path`: add/delete/update 都用 hunk 的原 path 做 filesystem resolution；`Hunk::path` 在 update-with-move 场景会返回 move destination。[E: codex-rs/apply-patch/src/parser.rs:82][E: codex-rs/apply-patch/src/parser.rs:84][E: codex-rs/apply-patch/src/parser.rs:86][E: codex-rs/apply-patch/src/parser.rs:88][E: codex-rs/apply-patch/src/parser.rs:91][E: codex-rs/apply-patch/src/parser.rs:97]
- `UpdateFileChunk`: 每个 update chunk 包含 optional `change_context`、`old_lines`、`new_lines` 和 `is_end_of_file` 标志。[E: codex-rs/apply-patch/src/parser.rs:115][E: codex-rs/apply-patch/src/parser.rs:118][E: codex-rs/apply-patch/src/parser.rs:122]
- `ApplyPatchArgs`: parser 输出 `patch` 原文、`hunks` AST、optional `workdir` 和 optional `environment_id`。[E: codex-rs/apply-patch/src/lib.rs:94][E: codex-rs/apply-patch/src/lib.rs:97][E: codex-rs/apply-patch/src/lib.rs:98][E: codex-rs/apply-patch/src/lib.rs:99][E: codex-rs/apply-patch/src/lib.rs:100][E: codex-rs/apply-patch/src/lib.rs:101]
- `ApplyPatchFileChange`: verified invocation 会把 hunks 转成 Add/Delete/Update changes，Update 可携带 `move_path`。[E: codex-rs/apply-patch/src/lib.rs:105][E: codex-rs/apply-patch/src/lib.rs:106][E: codex-rs/apply-patch/src/lib.rs:109][E: codex-rs/apply-patch/src/lib.rs:112][E: codex-rs/apply-patch/src/lib.rs:114]
- `MaybeApplyPatchVerified`: classifier 的结果可能是 `Body`、`ShellParseError`、`CorrectnessError` 或 `NotApplyPatch`。[E: codex-rs/apply-patch/src/lib.rs:121][E: codex-rs/apply-patch/src/lib.rs:124][E: codex-rs/apply-patch/src/lib.rs:127][E: codex-rs/apply-patch/src/lib.rs:130]

## parser 控制流

1. `parse_patch` 当前调用 `parse_patch_text` 并使用 `ParseMode::Lenient`，因为 `PARSE_IN_STRICT_MODE` 常量是 false。[E: codex-rs/apply-patch/src/parser.rs:53][E: codex-rs/apply-patch/src/parser.rs:130][E: codex-rs/apply-patch/src/parser.rs:131][E: codex-rs/apply-patch/src/parser.rs:134][E: codex-rs/apply-patch/src/parser.rs:136]
2. `parse_patch_text` trim 输入，按 parse mode 校验 begin/end marker，把 patch delta 推入 `StreamingPatchParser`，finish hunks, carries `environment_id`, and returns `ApplyPatchArgs` with `workdir: None`.[E: codex-rs/apply-patch/src/parser.rs:178][E: codex-rs/apply-patch/src/parser.rs:179][E: codex-rs/apply-patch/src/parser.rs:180][E: codex-rs/apply-patch/src/parser.rs:186][E: codex-rs/apply-patch/src/parser.rs:187][E: codex-rs/apply-patch/src/parser.rs:188][E: codex-rs/apply-patch/src/parser.rs:189][E: codex-rs/apply-patch/src/parser.rs:190][E: codex-rs/apply-patch/src/parser.rs:193][E: codex-rs/apply-patch/src/parser.rs:194]
3. lenient boundary mode 先尝试 strict marker；strict 失败后，只接受第一行是 `<<EOF`、`<<'EOF'`、`<<"EOF"` 且最后一行以 `EOF` 结尾的 heredoc wrapper，再对 inner lines 重新跑 strict boundary check。[E: codex-rs/apply-patch/src/parser.rs:220][E: codex-rs/apply-patch/src/parser.rs:227][E: codex-rs/apply-patch/src/parser.rs:228][E: codex-rs/apply-patch/src/parser.rs:231][E: codex-rs/apply-patch/src/parser.rs:232]
4. `StreamingPatchParser::handle_hunk_headers_and_end_patch` 识别 `*** Add File:`、`*** Delete File:`、`*** Update File:`、`*** End Patch` 和 optional environment id，并把对应 `Hunk` push 进 parser state。[E: codex-rs/apply-patch/src/streaming_parser.rs:84][E: codex-rs/apply-patch/src/streaming_parser.rs:102][E: codex-rs/apply-patch/src/streaming_parser.rs:107][E: codex-rs/apply-patch/src/streaming_parser.rs:116][E: codex-rs/apply-patch/src/streaming_parser.rs:124][E: codex-rs/apply-patch/src/streaming_parser.rs:136]
5. Add File mode 只接受后续以 `+` 开头的正文行并追加到当前 add hunk；Delete File mode 只允许下一个 hunk header 或 end marker。[E: codex-rs/apply-patch/src/streaming_parser.rs:198][E: codex-rs/apply-patch/src/streaming_parser.rs:202][E: codex-rs/apply-patch/src/streaming_parser.rs:205][E: codex-rs/apply-patch/src/streaming_parser.rs:216][E: codex-rs/apply-patch/src/streaming_parser.rs:220][E: codex-rs/apply-patch/src/streaming_parser.rs:226]
6. Update File mode 可在首个 chunk 前读取 `*** Move to:`，通过 `@@`/`@@ context` 新建 chunk，并用 `*** End of File` 标记 EOF chunk。[E: codex-rs/apply-patch/src/streaming_parser.rs:253][E: codex-rs/apply-patch/src/streaming_parser.rs:259][E: codex-rs/apply-patch/src/streaming_parser.rs:276][E: codex-rs/apply-patch/src/streaming_parser.rs:287][E: codex-rs/apply-patch/src/streaming_parser.rs:298][E: codex-rs/apply-patch/src/streaming_parser.rs:311]
7. Update File chunk 中空格开头行同时进入 old/new，`+` 行只进入 new，`-` 行只进入 old；空 update hunk 或空 chunk 会在 streaming parser 中报错。[E: codex-rs/apply-patch/src/streaming_parser.rs:53][E: codex-rs/apply-patch/src/streaming_parser.rs:81][E: codex-rs/apply-patch/src/streaming_parser.rs:102][E: codex-rs/apply-patch/src/streaming_parser.rs:105][E: codex-rs/apply-patch/src/streaming_parser.rs:331][E: codex-rs/apply-patch/src/streaming_parser.rs:348][E: codex-rs/apply-patch/src/streaming_parser.rs:364][E: codex-rs/apply-patch/src/streaming_parser.rs:375]

## application 控制流

1. `apply_patch` 先 `parse_patch`，parse error 会打印 `Invalid patch:`，然后调用 `apply_hunks`。[E: codex-rs/apply-patch/src/lib.rs:276][E: codex-rs/apply-patch/src/lib.rs:284][E: codex-rs/apply-patch/src/lib.rs:289][E: codex-rs/apply-patch/src/lib.rs:311]
2. `apply_hunks` 调用 `apply_hunks_to_files`，成功后打印 summary；失败时先把 error 文本写到 stderr，若底层是 `std::io::Error` 则转为 IO error，否则包装为 `ApplyPatchError::IoError`。[E: codex-rs/apply-patch/src/lib.rs:315][E: codex-rs/apply-patch/src/lib.rs:324][E: codex-rs/apply-patch/src/lib.rs:326][E: codex-rs/apply-patch/src/lib.rs:331][E: codex-rs/apply-patch/src/lib.rs:336][E: codex-rs/apply-patch/src/lib.rs:339][E: codex-rs/apply-patch/src/lib.rs:344]
3. `apply_hunks_to_files` 拒绝空 hunk 列表，然后逐个 hunk 处理并记录 added/modified/deleted path sets。[E: codex-rs/apply-patch/src/lib.rs:361][E: codex-rs/apply-patch/src/lib.rs:368][E: codex-rs/apply-patch/src/lib.rs:391][E: codex-rs/apply-patch/src/lib.rs:562]
4. Add file 调用 `write_file_with_missing_parent_retry`；如果 parent directory missing，会尝试创建 parent 后再写一次。[E: codex-rs/apply-patch/src/lib.rs:395][E: codex-rs/apply-patch/src/lib.rs:400][E: codex-rs/apply-patch/src/lib.rs:630][E: codex-rs/apply-patch/src/lib.rs:638][E: codex-rs/apply-patch/src/lib.rs:640][E: codex-rs/apply-patch/src/lib.rs:649]
5. Delete file 先取 metadata，拒绝删除 directory，然后用 `RemoveOptions { recursive: false, force: false }` 删除 file。[E: codex-rs/apply-patch/src/lib.rs:417][E: codex-rs/apply-patch/src/lib.rs:424][E: codex-rs/apply-patch/src/lib.rs:431][E: codex-rs/apply-patch/src/lib.rs:434][E: codex-rs/apply-patch/src/lib.rs:435][E: codex-rs/apply-patch/src/lib.rs:436]
6. Update file 先 `derive_new_contents_from_chunks`，如果存在 `move_path` 则写 destination 并删除原 path，否则写回原 path。[E: codex-rs/apply-patch/src/lib.rs:465][E: codex-rs/apply-patch/src/lib.rs:469][E: codex-rs/apply-patch/src/lib.rs:473][E: codex-rs/apply-patch/src/lib.rs:479][E: codex-rs/apply-patch/src/lib.rs:503][E: codex-rs/apply-patch/src/lib.rs:540][E: codex-rs/apply-patch/src/lib.rs:548]
7. `derive_new_contents_from_chunks` 读取原文件文本，split 成 lines，计算 replacements，反向应用 replacements，并确保最终内容以 newline 结尾。[E: codex-rs/apply-patch/src/lib.rs:675][E: codex-rs/apply-patch/src/lib.rs:668][E: codex-rs/apply-patch/src/lib.rs:691][E: codex-rs/apply-patch/src/lib.rs:684][E: codex-rs/apply-patch/src/lib.rs:701][E: codex-rs/apply-patch/src/lib.rs:703][E: codex-rs/apply-patch/src/lib.rs:706]
8. `compute_replacements` 可用 `change_context` 先 seek；纯添加 chunk 可以插入到文件末尾或 final empty line 前；旧行匹配失败会返回包含 expected old lines 的 `ComputeReplacements` 错误。[E: codex-rs/apply-patch/src/lib.rs:716][E: codex-rs/apply-patch/src/lib.rs:724][E: codex-rs/apply-patch/src/lib.rs:742][E: codex-rs/apply-patch/src/lib.rs:787][E: codex-rs/apply-patch/src/lib.rs:791][E: codex-rs/apply-patch/src/lib.rs:794]
9. `apply_replacements` 按 start index 倒序替换，避免前面的替换改变后续 replacement 的 index。[E: codex-rs/apply-patch/src/lib.rs:806][E: codex-rs/apply-patch/src/lib.rs:812][E: codex-rs/apply-patch/src/lib.rs:817][E: codex-rs/apply-patch/src/lib.rs:824]

## shell invocation classifier

- `maybe_parse_apply_patch` 识别 direct `[apply_patch, body]`，也识别 shell heredoc 形态并提取 patch body。[E: codex-rs/apply-patch/src/invocation.rs:106][E: codex-rs/apply-patch/src/invocation.rs:118]
- `maybe_parse_apply_patch_verified` 会把 `ApplyPatchAction` 的 cwd 解析为 effective cwd，并把 AST changes 投影成 Add/Delete/Update 变更列表。[E: codex-rs/apply-patch/src/invocation.rs:158][E: codex-rs/apply-patch/src/invocation.rs:169][E: codex-rs/apply-patch/src/invocation.rs:176][E: codex-rs/apply-patch/src/invocation.rs:191]
- 如果模型直接给了 raw patch body 而不是 apply_patch command，classifier 会返回 implicit invocation correctness error。[E: codex-rs/apply-patch/src/invocation.rs:146][E: codex-rs/apply-patch/src/invocation.rs:152]

## 设计动机与权衡

- parser 默认 lenient mode，说明 engine 更愿意从裸 patch 或有限 heredoc boundary 中恢复 patch，而不是只接受严格裸 patch 文本。[E: codex-rs/apply-patch/src/parser.rs:53][E: codex-rs/apply-patch/src/parser.rs:130][E: codex-rs/apply-patch/src/parser.rs:134][E: codex-rs/apply-patch/src/parser.rs:217][E: codex-rs/apply-patch/src/parser.rs:220][E: codex-rs/apply-patch/src/parser.rs:227][E: codex-rs/apply-patch/src/parser.rs:231][E: codex-rs/apply-patch/src/parser.rs:232]
- replacement computation 使用 seek/fuzzy matching 而不是直接按行号应用，因为 apply_patch grammar 没有行号字段，chunk 的旧行和 context 是唯一定位信息。[I]
- `seek_sequence` 先 exact match，再 trim-end、trim-both、Unicode normalize fallback，体现了对格式细微差异的容错。[E: codex-rs/apply-patch/src/seek_sequence.rs:35][E: codex-rs/apply-patch/src/seek_sequence.rs:41][E: codex-rs/apply-patch/src/seek_sequence.rs:54][E: codex-rs/apply-patch/src/seek_sequence.rs:76]

## gotcha

- Add File hunk 只消费 `+` 行；遇到新的 hunk header/end marker 会结束 Add File，其他非 `+` 行会报 invalid hunk header，因此空 Add File hunk 在 streaming parser 层可以生成空 contents。[E: codex-rs/apply-patch/src/streaming_parser.rs:198][E: codex-rs/apply-patch/src/streaming_parser.rs:202][E: codex-rs/apply-patch/src/streaming_parser.rs:205][E: codex-rs/apply-patch/src/streaming_parser.rs:209][E: codex-rs/apply-patch/src/streaming_parser.rs:214]
- Delete File 不会递归删除目录；目录 metadata 会导致错误。[E: codex-rs/apply-patch/src/lib.rs:424][E: codex-rs/apply-patch/src/lib.rs:434][E: codex-rs/apply-patch/src/lib.rs:435][E: codex-rs/apply-patch/src/lib.rs:436]
- Update hunk 没有任何 chunk 时会被拒绝，不会生成 no-op update。[E: codex-rs/apply-patch/src/streaming_parser.rs:53][E: codex-rs/apply-patch/src/streaming_parser.rs:58][E: codex-rs/apply-patch/src/streaming_parser.rs:61][E: codex-rs/apply-patch/src/streaming_parser.rs:102][E: codex-rs/apply-patch/src/streaming_parser.rs:105]
- `StreamingPatchParser` is real incremental state: callers can push deltas, inspect `environment_id`, and finish hunks; the non-streaming parser reuses it by pushing the full patch text once.[E: codex-rs/apply-patch/src/streaming_parser.rs:22][E: codex-rs/apply-patch/src/streaming_parser.rs:49][E: codex-rs/apply-patch/src/streaming_parser.rs:139][E: codex-rs/apply-patch/src/streaming_parser.rs:154][E: codex-rs/apply-patch/src/parser.rs:186][E: codex-rs/apply-patch/src/parser.rs:187][E: codex-rs/apply-patch/src/parser.rs:188]

## Sources

- `codex-rs/apply-patch/src/parser.rs`
- `codex-rs/apply-patch/src/lib.rs`
- `codex-rs/apply-patch/src/invocation.rs`
- `codex-rs/apply-patch/src/seek_sequence.rs`
- `codex-rs/apply-patch/src/streaming_parser.rs`

## 相关

- `tool.apply-patch`
- `spine.trace-apply-patch`
- `subsys.exec-sandbox.arg0-dispatch`
