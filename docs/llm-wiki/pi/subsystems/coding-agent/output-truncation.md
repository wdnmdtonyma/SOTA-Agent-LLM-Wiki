---
id: subsys.coding-agent.output-truncation
title: 输出累积与截断
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/output-accumulator.ts
  - packages/coding-agent/src/core/tools/truncate.ts
  - packages/coding-agent/src/core/output-guard.ts
  - packages/coding-agent/src/core/tools/bash.ts
  - packages/coding-agent/src/core/tools/grep.ts
  - packages/coding-agent/src/core/tools/read.ts
  - packages/coding-agent/src/core/tools/find.ts
  - packages/coding-agent/src/core/tools/ls.ts
  - packages/coding-agent/src/core/bash-executor.ts
  - packages/coding-agent/src/core/messages.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/modes/rpc/rpc-mode.ts
  - packages/coding-agent/test/tools.test.ts
  - packages/agent/src/harness/messages.ts
  - packages/agent/src/harness/utils/shell-output.ts
symbols:
  - OutputAccumulator
  - truncateHead
  - truncateTail
  - truncateLine
  - takeOverStdout
related:
  - surface.tools.bash
  - surface.tools.grep
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 8c943640
---

> 输出截断子系统把工具输出限制成模型和 TUI 可消费的 preview: 纯函数决定 head/tail/line 裁剪, `OutputAccumulator` 负责 streaming bash 的 tail snapshot 与 temp-file spillover, `details.truncation/fullOutputPath` 把裁剪元数据交给工具结果和 renderer。

## 能回答的问题

- `truncateHead()`、`truncateTail()`、`truncateLine()` 分别保留输出的哪一部分?
- bash tool 的 `fullOutputPath` 是什么时候产生的, 和 `details.truncation` 怎么配合?
- grep/read/find/ls 的 `details.truncation` 与 bash 的 `fullOutputPath` 有什么不同?
- `OutputAccumulator` 怎样在 streaming 输出里避免无界内存增长?
- `takeOverStdout()` 为什么出现在输出子系统里, 它和工具输出截断是什么关系?
- agent-core 里有没有另一套 shell output 截断, 和 coding-agent tool path 的边界在哪里?

## 职责边界

`packages/coding-agent/src/core/tools/truncate.ts` 是纯截断策略层: 默认限制是 2000 行与 50KB, grep 单行限制是 500 字符, `TruncationResult` 记录 content、是否截断、触发限制、原始行/字节数、输出行/字节数和 partial-line 标志 [E: packages/coding-agent/src/core/tools/truncate.ts:11] [E: packages/coding-agent/src/core/tools/truncate.ts:12] [E: packages/coding-agent/src/core/tools/truncate.ts:13] [E: packages/coding-agent/src/core/tools/truncate.ts:17] [E: packages/coding-agent/src/core/tools/truncate.ts:19] [E: packages/coding-agent/src/core/tools/truncate.ts:21] [E: packages/coding-agent/src/core/tools/truncate.ts:23] [E: packages/coding-agent/src/core/tools/truncate.ts:25] [E: packages/coding-agent/src/core/tools/truncate.ts:27] [E: packages/coding-agent/src/core/tools/truncate.ts:29] [E: packages/coding-agent/src/core/tools/truncate.ts:31]。

`packages/coding-agent/src/core/tools/output-accumulator.ts` 是 streaming bash tool 的状态层: 它接收 `Buffer` chunks, 用 streaming `TextDecoder` 维护 decoded tail, 在超过行数或字节阈值时创建 temp file, 并通过 `OutputSnapshot.fullOutputPath` 暴露完整输出路径 [E: packages/coding-agent/src/core/tools/output-accumulator.ts:64] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:70] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:72] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:207] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:117]。

`packages/coding-agent/src/core/output-guard.ts` 不裁剪工具内容; 它在非 interactive 或 RPC stdout 上把普通 `process.stdout.write` 改道到 stderr, 并提供 `writeRawStdout()`/`flushRawStdout()` 给协议输出使用 [E: packages/coding-agent/src/core/output-guard.ts:45] [E: packages/coding-agent/src/core/output-guard.ts:54] [E: packages/coding-agent/src/core/output-guard.ts:62] [E: packages/coding-agent/src/core/output-guard.ts:85] [E: packages/coding-agent/src/core/output-guard.ts:105]。它属于同一个“输出安全”边界, 但解决的是 stdout channel 污染, 不是 token/byte 截断 [I]。

## 关键文件

- `packages/coding-agent/src/core/tools/truncate.ts`: `DEFAULT_MAX_LINES`、`DEFAULT_MAX_BYTES`、`GREP_MAX_LINE_LENGTH`、`TruncationResult`、`truncateHead()`、`truncateTail()`、`truncateLine()` [E: packages/coding-agent/src/core/tools/truncate.ts:11] [E: packages/coding-agent/src/core/tools/truncate.ts:78] [E: packages/coding-agent/src/core/tools/truncate.ts:168] [E: packages/coding-agent/src/core/tools/truncate.ts:268]。
- `packages/coding-agent/src/core/tools/output-accumulator.ts`: `OutputAccumulatorOptions`、`OutputSnapshot`、`OutputAccumulator` 和 temp-file spillover 实现 [E: packages/coding-agent/src/core/tools/output-accumulator.ts:7] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:13] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:35] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:211]。
- `packages/coding-agent/src/core/output-guard.ts`: stdout takeover、raw stdout queue、backpressure/flush helper [E: packages/coding-agent/src/core/output-guard.ts:45] [E: packages/coding-agent/src/core/output-guard.ts:89] [E: packages/coding-agent/src/core/output-guard.ts:95] [E: packages/coding-agent/src/core/output-guard.ts:105]。
- `packages/coding-agent/src/core/tools/bash.ts`: bash tool 把 `OutputAccumulator.snapshot()` 转成 partial/final `details.truncation` 和 `details.fullOutputPath` [E: packages/coding-agent/src/core/tools/bash.ts:323] [E: packages/coding-agent/src/core/tools/bash.ts:327] [E: packages/coding-agent/src/core/tools/bash.ts:328] [E: packages/coding-agent/src/core/tools/bash.ts:380]。
- `packages/coding-agent/src/core/tools/grep.ts`: grep tool 同时使用 `truncateLine()` 裁单行、`truncateHead()` 裁总输出, 并把 `linesTruncated`/`matchLimitReached`/`truncation` 放入 details [E: packages/coding-agent/src/core/tools/grep.ts:41] [E: packages/coding-agent/src/core/tools/grep.ts:262] [E: packages/coding-agent/src/core/tools/grep.ts:335] [E: packages/coding-agent/src/core/tools/grep.ts:344] [E: packages/coding-agent/src/core/tools/grep.ts:348] [E: packages/coding-agent/src/core/tools/grep.ts:354]。

## 数据模型与函数

`TruncationResult` 是截断相关 tool details 复用的元数据: `truncatedBy` 只能是 `"lines"`、`"bytes"` 或 `null`, `lastLinePartial` 在 tail 截断的超长末行片段场景被置 true, `firstLineExceedsLimit` 在 head 截断的首行超限场景被置 true [E: packages/coding-agent/src/core/tools/truncate.ts:21] [E: packages/coding-agent/src/core/tools/truncate.ts:211] [E: packages/coding-agent/src/core/tools/truncate.ts:105] [E: packages/coding-agent/src/core/tools/truncate.ts:115]。

`truncateHead(content, options)` 保留输入开头: 未超限时原样返回, 首行本身超过 byte limit 时返回空 content 并标记 `firstLineExceedsLimit`, 否则从前向后收集完整行直到行数或 byte 限制触发 [E: packages/coding-agent/src/core/tools/truncate.ts:78] [E: packages/coding-agent/src/core/tools/truncate.ts:87] [E: packages/coding-agent/src/core/tools/truncate.ts:104] [E: packages/coding-agent/src/core/tools/truncate.ts:105] [E: packages/coding-agent/src/core/tools/truncate.ts:115] [E: packages/coding-agent/src/core/tools/truncate.ts:126] [E: packages/coding-agent/src/core/tools/truncate.ts:130]。

`truncateTail(content, options)` 保留输入末尾: 它从最后一行倒序收集, 如果第一条要保留的末行本身超过 byte limit, 会从该行末尾截出可容纳的片段并标记 `lastLinePartial` [E: packages/coding-agent/src/core/tools/truncate.ts:168] [E: packages/coding-agent/src/core/tools/truncate.ts:199] [E: packages/coding-agent/src/core/tools/truncate.ts:203] [E: packages/coding-agent/src/core/tools/truncate.ts:208] [E: packages/coding-agent/src/core/tools/truncate.ts:211]。

`truncateLine(line, maxChars = GREP_MAX_LINE_LENGTH)` 是字符数裁剪而不是 byte 裁剪; 它只在 `line.length > maxChars` 时追加 `"... [truncated]"`, 当前调用点在 grep match/context 行格式化中 [E: packages/coding-agent/src/core/tools/truncate.ts:268] [E: packages/coding-agent/src/core/tools/truncate.ts:272] [E: packages/coding-agent/src/core/tools/truncate.ts:275] [E: packages/coding-agent/src/core/tools/grep.ts:262] [E: packages/coding-agent/src/core/tools/grep.ts:324]。

`OutputAccumulator.snapshot({ persistIfTruncated })` 先对 rolling tail 调 `truncateTail()`, 再用累计的全量 decoded byte/line counters 修正 `totalLines`、`totalBytes`、`truncated` 和 `truncatedBy`; `persistIfTruncated` 为 true 且确有截断时会强制创建 temp file [E: packages/coding-agent/src/core/tools/output-accumulator.ts:92] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:96] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:102] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:103] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:104] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:105] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:110]。

`OutputAccumulator` 的 spillover 条件是 raw bytes、decoded bytes 或 total lines 任一超过对应限制; `ensureTempFile()` 创建 `pi-output` 或调用方指定 prefix 的 temp log, 把还没 spill 的 raw chunks 先写入文件, 然后清空 `rawChunks` [E: packages/coding-agent/src/core/tools/output-accumulator.ts:205] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:207] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:215] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:217] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:220]。

工具 details 的关系是分层的: bash 的 details 同时允许 `truncation` 与 `fullOutputPath`, grep/read/find/ls 的 details 只声明 `truncation` 加各自的 limit flags, 因此 `fullOutputPath` 不是所有截断工具的通用字段 [E: packages/coding-agent/src/core/tools/bash.ts:47] [E: packages/coding-agent/src/core/tools/bash.ts:49] [E: packages/coding-agent/src/core/tools/grep.ts:41] [E: packages/coding-agent/src/core/tools/read.ts:28] [E: packages/coding-agent/src/core/tools/find.ts:32] [E: packages/coding-agent/src/core/tools/ls.ts:23]。

## 控制流

1. `truncateHead@packages/coding-agent/src/core/tools/truncate.ts:78` 计算 UTF-8 byte 总数并用 `splitLinesForCounting()` 得到不把结尾换行算成额外空行的 line 数 [E: packages/coding-agent/src/core/tools/truncate.ts:82] [E: packages/coding-agent/src/core/tools/truncate.ts:83] [E: packages/coding-agent/src/core/tools/truncate.ts:52]。
2. `truncateHead@packages/coding-agent/src/core/tools/truncate.ts:78` 在未超出行数和 byte 限制时原样返回; 超限时先处理首行 byte 超限, 再逐行累积完整行, 触发 byte limit 时把 `truncatedBy` 设为 `"bytes"` [E: packages/coding-agent/src/core/tools/truncate.ts:87] [E: packages/coding-agent/src/core/tools/truncate.ts:105] [E: packages/coding-agent/src/core/tools/truncate.ts:130] [E: packages/coding-agent/src/core/tools/truncate.ts:131]。
3. `truncateTail@packages/coding-agent/src/core/tools/truncate.ts:168` 同样先计算总 byte/line, 未超限时原样返回; 超限时从末尾倒序塞入 `outputLinesArr`, 因 byte limit 停下时把 `truncatedBy` 设为 `"bytes"` [E: packages/coding-agent/src/core/tools/truncate.ts:172] [E: packages/coding-agent/src/core/tools/truncate.ts:177] [E: packages/coding-agent/src/core/tools/truncate.ts:199] [E: packages/coding-agent/src/core/tools/truncate.ts:204]。
4. `OutputAccumulator.append@packages/coding-agent/src/core/tools/output-accumulator.ts:64` 累计 raw byte 数, streaming decode chunk, 更新 tail text 与 line counters, 然后在已有 temp stream 或超过 spillover 阈值时写 temp file, 否则暂存 raw chunk [E: packages/coding-agent/src/core/tools/output-accumulator.ts:69] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:70] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:72] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:76]。
5. `appendDecodedText@packages/coding-agent/src/core/tools/output-accumulator.ts:148` 用 byte length 更新 `totalDecodedBytes` 和 rolling `tailBytes`, 在 tail 超过 `maxRollingBytes * 2` 时 `trimTail()`, 并通过 newline 扫描维护 completed/open line 计数 [E: packages/coding-agent/src/core/tools/output-accumulator.ts:153] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:157] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:163] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:176]。
6. `trimTail@packages/coding-agent/src/core/tools/output-accumulator.ts:179` 把 tail text 转成 UTF-8 buffer, 从末尾保留 `maxRollingBytes`, 并向前移动到合法 UTF-8 边界, 避免 rolling tail 在多字节字符中间切开 [E: packages/coding-agent/src/core/tools/output-accumulator.ts:180] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:186] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:187] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:192]。
7. `createBashToolDefinition.execute@packages/coding-agent/src/core/tools/bash.ts:287` 创建 `new OutputAccumulator({ tempFilePrefix: "pi-bash" })`, onData 时 append 并调度 100ms 节流的 partial update [E: packages/coding-agent/src/core/tools/bash.ts:175] [E: packages/coding-agent/src/core/tools/bash.ts:313] [E: packages/coding-agent/src/core/tools/bash.ts:359] [E: packages/coding-agent/src/core/tools/bash.ts:361] [E: packages/coding-agent/src/core/tools/bash.ts:343]。
8. bash partial update 通过 `snapshot({ persistIfTruncated: true })` 输出 preview, 且只在 truncation 真的发生时把 `details.truncation` 设为 snapshot truncation, 但无论是否截断都会传 `fullOutputPath: snapshot.fullOutputPath` [E: packages/coding-agent/src/core/tools/bash.ts:323] [E: packages/coding-agent/src/core/tools/bash.ts:327] [E: packages/coding-agent/src/core/tools/bash.ts:328]。
9. bash final path 调 `finishOutput()`: 停止接收输出、finish decoder、flush pending update、再次 snapshot、等待 temp file close; `formatOutput()` 在 `truncation.truncated` 时把 `{ truncation, fullOutputPath }` 放入 final details 并追加模型可见的 full-output notice [E: packages/coding-agent/src/core/tools/bash.ts:366] [E: packages/coding-agent/src/core/tools/bash.ts:367] [E: packages/coding-agent/src/core/tools/bash.ts:351] [E: packages/coding-agent/src/core/tools/bash.ts:370] [E: packages/coding-agent/src/core/tools/bash.ts:371] [E: packages/coding-agent/src/core/tools/bash.ts:379] [E: packages/coding-agent/src/core/tools/bash.ts:380] [E: packages/coding-agent/src/core/tools/bash.ts:385] [E: packages/coding-agent/src/core/tools/bash.ts:387] [E: packages/coding-agent/src/core/tools/bash.ts:389]。
10. grep 零 context path 对 rg JSON match line 调 `truncateLine()`, context path 对读出的上下文行也调 `truncateLine()`, 然后对整体 `rawOutput` 调 `truncateHead(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER })` 来只施加 byte 限制 [E: packages/coding-agent/src/core/tools/grep.ts:324] [E: packages/coding-agent/src/core/tools/grep.ts:262] [E: packages/coding-agent/src/core/tools/grep.ts:333] [E: packages/coding-agent/src/core/tools/grep.ts:335]。
11. read text path 在 offset/limit 选出内容后调用 `truncateHead(selectedContent)`, 首行超限时给 bash/sed fallback, 普通截断时在 output 后追加 continuation offset, 并把 `details = { truncation }` [E: packages/coding-agent/src/core/tools/read.ts:280] [E: packages/coding-agent/src/core/tools/read.ts:282] [E: packages/coding-agent/src/core/tools/read.ts:285] [E: packages/coding-agent/src/core/tools/read.ts:288] [E: packages/coding-agent/src/core/tools/read.ts:290] [E: packages/coding-agent/src/core/tools/read.ts:294] [E: packages/coding-agent/src/core/tools/read.ts:301] [E: packages/coding-agent/src/core/tools/read.ts:305]。
12. find 的 custom/default 两条路径和 ls 都对已被 result/entry limit 控制住的行集合调用 `truncateHead(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER })`, 因而这些路径的 `truncation` 主要是 byte cap 而非行数 cap [E: packages/coding-agent/src/core/tools/find.ts:187] [E: packages/coding-agent/src/core/tools/find.ts:189] [E: packages/coding-agent/src/core/tools/find.ts:241] [E: packages/coding-agent/src/core/tools/find.ts:322] [E: packages/coding-agent/src/core/tools/find.ts:324] [E: packages/coding-agent/src/core/tools/ls.ts:180] [E: packages/coding-agent/src/core/tools/ls.ts:182]。
13. `takeOverStdout@packages/coding-agent/src/core/output-guard.ts:45` 在 main 的非 interactive 非 metadata 命令路径启用, RPC mode 也在入口立即启用; RPC responses 之后通过 `writeRawStdout(serializeJsonLine(obj))` 写回真正 stdout [E: packages/coding-agent/src/main.ts:535] [E: packages/coding-agent/src/main.ts:537] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:53] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:54] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:60]。

## 设计动机与权衡

Head vs tail 是按工具语义拆开的: read/grep/find/ls 偏向保留列表或文件开头, bash 偏向保留命令末尾的失败原因或最终结果 [E: packages/coding-agent/src/core/tools/read.ts:288] [E: packages/coding-agent/src/core/tools/grep.ts:335] [E: packages/coding-agent/src/core/tools/bash.ts:313] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:92] [I]。

`OutputAccumulator` 把 display preview 和完整输出保真分开: memory 中只长期保留 rolling tail, 但一旦输出超过阈值就把 raw chunks spill 到 temp file, bash final details 再把 `fullOutputPath` 交给模型/TUI [E: packages/coding-agent/src/core/tools/output-accumulator.ts:60] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:157] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:205] [E: packages/coding-agent/src/core/tools/bash.ts:380]。测试覆盖 line-count truncation 下 `createBashTool()` 返回存在的 `details.fullOutputPath`, 且完整文件同时包含输出开头和结尾 [E: packages/coding-agent/test/tools.test.ts:730] [E: packages/coding-agent/test/tools.test.ts:736] [E: packages/coding-agent/test/tools.test.ts:747] [E: packages/coding-agent/test/tools.test.ts:749] [E: packages/coding-agent/test/tools.test.ts:750]。

grep 的 `truncateLine()` 是为了避免单个 match/context 行吞掉大量输出预算; 总输出仍要再经过 `truncateHead()`, 所以 grep 可能同时出现 `details.linesTruncated` 和 `details.truncation` [E: packages/coding-agent/src/core/tools/grep.ts:263] [E: packages/coding-agent/src/core/tools/grep.ts:335] [E: packages/coding-agent/src/core/tools/grep.ts:348] [E: packages/coding-agent/src/core/tools/grep.ts:354]。

`takeOverStdout()` 的设计动机是保护 stdout 协议通道: main 在非 interactive path 启用 takeover, RPC mode 入口也启用 takeover 并通过 `writeRawStdout(serializeJsonLine(obj))` 写协议 stdout, 因而普通 stdout write 被改到 stderr [E: packages/coding-agent/src/main.ts:535] [E: packages/coding-agent/src/core/output-guard.ts:54] [E: packages/coding-agent/src/core/output-guard.ts:62] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:54] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:60] [I]。

## Gotcha

- `truncateLine()` 按 JavaScript string length 裁字符, 不是按 UTF-8 bytes 或 display width 裁; 多字节字符 byte 预算只由 `truncateHead()`/`truncateTail()` 处理 [E: packages/coding-agent/src/core/tools/truncate.ts:270] [E: packages/coding-agent/src/core/tools/truncate.ts:272] [E: packages/coding-agent/src/core/tools/truncate.ts:275]。
- `OutputAccumulator` 的 temp file 写 raw `Buffer` chunks, 而 `packages/coding-agent/src/core/bash-executor.ts` 的 direct helper 会在写 full-output temp file 前 strip ANSI、sanitize binary output 并去掉 `\r`; 这两条 bash 路径不能混为同一个 full-output byte 语义 [E: packages/coding-agent/src/core/tools/output-accumulator.ts:74] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:217] [E: packages/coding-agent/src/core/bash-executor.ts:82] [E: packages/coding-agent/src/core/bash-executor.ts:90]。
- `fullOutputPath` 只有在 temp file 已创建时才有值; bash renderer 会在 truncated/final output 里展示 path, 但 grep/read/find/ls 的 details 接口没有这个字段 [E: packages/coding-agent/src/core/tools/output-accumulator.ts:117] [E: packages/coding-agent/src/core/tools/bash.ts:267] [E: packages/coding-agent/src/core/tools/bash.ts:270] [E: packages/coding-agent/src/core/tools/grep.ts:41]。
- `splitLinesForCounting()` 不把内容末尾的换行算作额外输出行; bash tests 覆盖了 4000 行且每行带 trailing newline 时 totalLines 仍为 4000、outputLines 为 2000 [E: packages/coding-agent/src/core/tools/truncate.ts:52] [E: packages/coding-agent/src/core/tools/truncate.ts:53] [E: packages/coding-agent/test/tools.test.ts:668] [E: packages/coding-agent/test/tools.test.ts:682] [E: packages/coding-agent/test/tools.test.ts:683]。
- `OutputAccumulator.finish()` 会 flush decoder 的剩余字节; split UTF-8 chunk 的 bash test 证明 `"€\n"` 分两段到达仍输出正确字符 [E: packages/coding-agent/src/core/tools/output-accumulator.ts:85] [E: packages/coding-agent/test/tools.test.ts:690] [E: packages/coding-agent/test/tools.test.ts:694] [E: packages/coding-agent/test/tools.test.ts:703]。
- `details.truncation` 是 structured metadata, output 文本里的 bracket notice 是另一层 human/model-facing说明; bash renderer 还会在 final render 时移除 output 内重复的 full-output footer, 再单独渲染 warning 行 [E: packages/coding-agent/src/core/tools/bash.ts:226] [E: packages/coding-agent/src/core/tools/bash.ts:229] [E: packages/coding-agent/src/core/tools/bash.ts:267] [E: packages/coding-agent/src/core/tools/bash.ts:281]。

## 跨包边界

[surface.tools.bash](../../surface/tools/bash.md) 是模型可见 bash tool 节点: 它应覆盖 `bash` schema、`BashOperations`、local shell backend、timeout 和 renderer; 本节点只解释该 tool 为什么用 `OutputAccumulator`、`truncateTail()` 语义和 `details.fullOutputPath` [E: packages/coding-agent/src/core/tools/bash.ts:40] [E: packages/coding-agent/src/core/tools/bash.ts:47] [E: packages/coding-agent/src/core/tools/bash.ts:291] [I]。

[surface.tools.grep](../../surface/tools/grep.md) 是模型可见 grep tool 节点: 它应覆盖 rg 参数、match/context formatting 和 limit policy; 本节点只权威解释 grep 调用 `truncateLine()` 与 `truncateHead()` 后怎样设置 `GrepToolDetails` [E: packages/coding-agent/src/core/tools/grep.ts:123] [E: packages/coding-agent/src/core/tools/grep.ts:215] [E: packages/coding-agent/src/core/tools/grep.ts:337]。

[ref.tools-catalog](../../reference/tools-catalog.md) 是内置工具注册目录: `truncateHead`、`truncateLine`、`truncateTail` 通过 coding-agent public index re-export, 但内置工具全集和 active/default 注册关系应由 catalog/tool-wrapper 相关节点覆盖 [E: packages/coding-agent/src/core/tools/index.ts:59] [E: packages/coding-agent/src/core/tools/index.ts:60] [E: packages/coding-agent/src/core/tools/index.ts:61]。

`packages/agent` harness 也有 message/full-output 字段和 shell-output helper: `BashExecutionMessage.fullOutputPath` 在 agent-core message converter 中会被追加到 LLM text, `executeShellWithCapture()` 也有自己的 `fullOutputPath` 和 `truncateTail()` 流程 [E: packages/agent/src/harness/messages.ts:26] [E: packages/agent/src/harness/messages.ts:75] [E: packages/agent/src/harness/utils/shell-output.ts:13] [E: packages/agent/src/harness/utils/shell-output.ts:35] [E: packages/agent/src/harness/utils/shell-output.ts:60] [E: packages/agent/src/harness/utils/shell-output.ts:70] [E: packages/agent/src/harness/utils/shell-output.ts:104]。这说明 full-output 语义跨包复用, 但 coding-agent tool `details` 的 shape 和 TUI renderer 仍在 `packages/coding-agent` 内 [I]。

`AgentSession.recordBashResult()` 把 direct bash helper 的 `BashResult.fullOutputPath` 写入 coding-agent history message, `bashExecutionToText()` 只在 `truncated && fullOutputPath` 时把完整输出路径加入 LLM context [E: packages/coding-agent/src/core/agent-session.ts:2645] [E: packages/coding-agent/src/core/agent-session.ts:2653] [E: packages/coding-agent/src/core/messages.ts:82] [E: packages/coding-agent/src/core/messages.ts:94]。

## Sources

- packages/coding-agent/src/core/tools/output-accumulator.ts
- packages/coding-agent/src/core/tools/truncate.ts
- packages/coding-agent/src/core/output-guard.ts
- packages/coding-agent/src/core/tools/bash.ts
- packages/coding-agent/src/core/tools/grep.ts
- packages/coding-agent/src/core/tools/read.ts
- packages/coding-agent/src/core/tools/find.ts
- packages/coding-agent/src/core/tools/ls.ts
- packages/coding-agent/src/core/bash-executor.ts
- packages/coding-agent/src/core/messages.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/modes/rpc/rpc-mode.ts
- packages/coding-agent/test/tools.test.ts
- packages/agent/src/harness/messages.ts
- packages/agent/src/harness/utils/shell-output.ts

## 相关

- [surface.tools.bash](../../surface/tools/bash.md): bash tool 的 schema、execution backend、streaming updates、timeout 和 renderer。
- [surface.tools.grep](../../surface/tools/grep.md): grep tool 的 rg 调用、match/context formatting、match limit 和 line truncation 告警。
- [ref.tools-catalog](../../reference/tools-catalog.md): 内置工具全集、注册与 public tool helper exports。
