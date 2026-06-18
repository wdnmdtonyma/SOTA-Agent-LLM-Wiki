---
id: session-v1.instructions
title: 指令发现与注入(AGENTS.md/CLAUDE.md)
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/session/instruction.ts, packages/opencode/src/tool/read.ts, packages/opencode/src/session/prompt.ts, packages/opencode/src/effect/runtime-flags.ts, packages/core/src/flag/flag.ts, packages/core/src/v1/config/config.ts, packages/opencode/src/config/config.ts, CONTEXT.md]
symbols: [Instruction, Instruction.systemPaths, Instruction.system, Instruction.resolve, Instruction.find, Instruction.loaded]
related: [prompt.system-prompts]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V1 `Instruction` service 负责把 global/project/config/nearby instruction files 转成 provider-turn system context 或 read-tool 后续 system-reminder;它发现 `AGENTS.md`、可选 `CLAUDE.md` 和 deprecated `CONTEXT.md`。

## 能回答的问题
- V1 哪些 instruction 文件会自动进入 system prompt?
- `OPENCODE_DISABLE_PROJECT_CONFIG` 和 `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT` 各自影响什么?
- `config.instructions` 支持本地 glob 还是远程 URL?
- read tool 为什么可能把附近 `AGENTS.md` 附到输出里?
- V1 instruction 注入与 V2 System Context/Context Epoch 的目标模型有什么区别?

## 职责边界

`Instruction.Interface` 暴露 `clear`、`systemPaths`、`system`、`find`、`resolve` 五个操作。[E: packages/opencode/src/session/instruction.ts:34][E: packages/opencode/src/session/instruction.ts:35][E: packages/opencode/src/session/instruction.ts:36][E: packages/opencode/src/session/instruction.ts:37][E: packages/opencode/src/session/instruction.ts:38][E: packages/opencode/src/session/instruction.ts:39] `system()` 是 provider turn 前的全局/project/config instruction 注入,`resolve(messages, filepath, messageID)` 是读取具体文件后的 nearby instruction 增量注入。[E: packages/opencode/src/session/instruction.ts:110][E: packages/opencode/src/session/instruction.ts:155][E: packages/opencode/src/session/instruction.ts:166][E: packages/opencode/src/session/instruction.ts:167][E: packages/opencode/src/session/instruction.ts:179][E: packages/opencode/src/session/instruction.ts:184][E: packages/opencode/src/session/instruction.ts:195][E: packages/opencode/src/session/instruction.ts:214][E: packages/opencode/src/session/prompt.ts:1327][E: packages/opencode/src/session/prompt.ts:1333][E: packages/opencode/src/tool/read.ts:300]

`SessionPrompt.runLoop` 在组装 provider request 时调用 `instruction.system()` 并把结果拼到 system array 中;`handle.process` 随后接收该 system array。[E: packages/opencode/src/session/prompt.ts:1327][E: packages/opencode/src/session/prompt.ts:1330][E: packages/opencode/src/session/prompt.ts:1333][E: packages/opencode/src/session/prompt.ts:1336][E: packages/opencode/src/session/prompt.ts:1342]

`Instruction` 使用 `InstanceState.context` 决定当前 directory/worktree,使用 `Global.Service` 读取全局 config/home,并读取 `RuntimeFlags.disableClaudeCodePrompt` 决定是否包含 Claude Code prompt 文件。[E: packages/opencode/src/session/instruction.ts:55][E: packages/opencode/src/session/instruction.ts:57][E: packages/opencode/src/session/instruction.ts:58][E: packages/opencode/src/session/instruction.ts:60][E: packages/opencode/src/session/instruction.ts:61][E: packages/opencode/src/session/instruction.ts:62][E: packages/opencode/src/session/instruction.ts:80][E: packages/opencode/src/session/instruction.ts:83][E: packages/opencode/src/session/instruction.ts:112][E: packages/opencode/src/session/instruction.ts:126][E: packages/opencode/src/effect/runtime-flags.ts:23][E: packages/opencode/src/effect/runtime-flags.ts:26]

## 数据模型

| 来源 | 规则 | 输出形式 |
|---|---|---|
| global files | 先查 `${global.config}/AGENTS.md`,再查 `${global.home}/.claude/CLAUDE.md`;存在第一个就加入 paths 并停止 global scan。[E: packages/opencode/src/session/instruction.ts:60][E: packages/opencode/src/session/instruction.ts:61][E: packages/opencode/src/session/instruction.ts:62][E: packages/opencode/src/session/instruction.ts:115][E: packages/opencode/src/session/instruction.ts:116][E: packages/opencode/src/session/instruction.ts:118] | `Instructions from: <path>\n<content>`。[E: packages/opencode/src/session/instruction.ts:165][E: packages/opencode/src/session/instruction.ts:166] |
| project files | `instructionFiles = ["AGENTS.md", optional "CLAUDE.md", "CONTEXT.md"]`;project config 未禁用时,对每个文件名执行 `findUp`,第一类有 match 的文件名获胜。[E: packages/opencode/src/session/instruction.ts:64][E: packages/opencode/src/session/instruction.ts:65][E: packages/opencode/src/session/instruction.ts:66][E: packages/opencode/src/session/instruction.ts:67][E: packages/opencode/src/session/instruction.ts:123][E: packages/opencode/src/session/instruction.ts:124][E: packages/opencode/src/session/instruction.ts:126][E: packages/opencode/src/session/instruction.ts:128][E: packages/opencode/src/session/instruction.ts:129][E: packages/opencode/src/session/instruction.ts:130] | 同 global files,每个实际 path 一条 system string。[E: packages/opencode/src/session/instruction.ts:162][E: packages/opencode/src/session/instruction.ts:166] |
| `config.instructions` local | V1 config schema 把 `instructions` 定义成 string array;`mergeConfigConcatArrays` 在实际 config merge call site 中被使用,其 array merge 逻辑会去重 concat。[E: packages/core/src/v1/config/config.ts:121][E: packages/core/src/v1/config/config.ts:122][E: packages/opencode/src/config/config.ts:45][E: packages/opencode/src/config/config.ts:47][E: packages/opencode/src/config/config.ts:48][E: packages/opencode/src/config/config.ts:350][E: packages/opencode/src/config/config.ts:351][E: packages/opencode/src/config/config.ts:397][E: packages/opencode/src/config/config.ts:398][E: packages/opencode/src/config/config.ts:405][E: packages/opencode/src/config/config.ts:407][E: packages/opencode/src/config/config.ts:526] | 非 URL instruction 支持 `~/`,absolute glob 和 relative upward glob。[E: packages/opencode/src/session/instruction.ts:135][E: packages/opencode/src/session/instruction.ts:137][E: packages/opencode/src/session/instruction.ts:138][E: packages/opencode/src/session/instruction.ts:141][E: packages/opencode/src/session/instruction.ts:142][E: packages/opencode/src/session/instruction.ts:143][E: packages/opencode/src/session/instruction.ts:146] |
| `config.instructions` remote | `http://` 或 `https://` 不进 `systemPaths`,而由 `system()` 并发 fetch。[E: packages/opencode/src/session/instruction.ts:137][E: packages/opencode/src/session/instruction.ts:158][E: packages/opencode/src/session/instruction.ts:163] | `Instructions from: <url>\n<remote body>`。[E: packages/opencode/src/session/instruction.ts:167] |
| nearby read instructions | `resolve(messages, filepath, messageID)` 从被读取文件所在目录向上找 `instructionFiles`,排除 system paths、已被 read tool loaded 的路径和同一 assistant message 已 claim 的路径。[E: packages/opencode/src/session/instruction.ts:171][E: packages/opencode/src/session/instruction.ts:172][E: packages/opencode/src/session/instruction.ts:174][E: packages/opencode/src/session/instruction.ts:179][E: packages/opencode/src/session/instruction.ts:184][E: packages/opencode/src/session/instruction.ts:185][E: packages/opencode/src/session/instruction.ts:190][E: packages/opencode/src/session/instruction.ts:194][E: packages/opencode/src/session/instruction.ts:195][E: packages/opencode/src/session/instruction.ts:196][E: packages/opencode/src/session/instruction.ts:201][E: packages/opencode/src/session/instruction.ts:206][E: packages/opencode/src/session/instruction.ts:208] | text-file read output 中的 `<system-reminder>`;image/PDF 分支较早返回 attachment,只在 metadata.loaded 记录路径。[E: packages/opencode/src/tool/read.ts:300][E: packages/opencode/src/tool/read.ts:306][E: packages/opencode/src/tool/read.ts:315][E: packages/opencode/src/tool/read.ts:355][E: packages/opencode/src/tool/read.ts:356] |

## 控制流

1. `systemPaths` 初始化空 `Set`,先处理 global files;global scan 命中一个 existing file 后 `break`,因此不会同时叠加 global `AGENTS.md` 与 global `.claude/CLAUDE.md`。[E: packages/opencode/src/session/instruction.ts:110][E: packages/opencode/src/session/instruction.ts:113][E: packages/opencode/src/session/instruction.ts:115][E: packages/opencode/src/session/instruction.ts:116][E: packages/opencode/src/session/instruction.ts:117][E: packages/opencode/src/session/instruction.ts:118]

2. 如果 `Flag.OPENCODE_DISABLE_PROJECT_CONFIG` 为 false,`systemPaths` 才执行 project-level `findUp`;该 flag 是 access-time getter,读取环境变量 `OPENCODE_DISABLE_PROJECT_CONFIG`。[E: packages/opencode/src/session/instruction.ts:123][E: packages/core/src/flag/flag.ts:3][E: packages/core/src/flag/flag.ts:4][E: packages/core/src/flag/flag.ts:54][E: packages/core/src/flag/flag.ts:55]

3. project-level scan 对 `instructionFiles` 按顺序查找,一旦某个文件名有 matches,把这些 matches 全加入 paths 并 break;这意味着 `AGENTS.md` 优先于 `CLAUDE.md`, `CLAUDE.md` 优先于 deprecated `CONTEXT.md`。[E: packages/opencode/src/session/instruction.ts:64][E: packages/opencode/src/session/instruction.ts:124][E: packages/opencode/src/session/instruction.ts:125][E: packages/opencode/src/session/instruction.ts:128][E: packages/opencode/src/session/instruction.ts:129][E: packages/opencode/src/session/instruction.ts:130][I]

4. 对 `config.instructions` 中的 local path/glob,absolute path 使用 basename+dirname glob,relative path 调 `relative(instruction)`;`relative` 在 project config 未禁用时从当前 directory 向 worktree root globUp,禁用时只在 global config 内 globUp。[E: packages/opencode/src/session/instruction.ts:79][E: packages/opencode/src/session/instruction.ts:81][E: packages/opencode/src/session/instruction.ts:83][E: packages/opencode/src/session/instruction.ts:87][E: packages/opencode/src/session/instruction.ts:139][E: packages/opencode/src/session/instruction.ts:141][E: packages/opencode/src/session/instruction.ts:142][E: packages/opencode/src/session/instruction.ts:146]

5. `system()` 读取 `systemPaths()` 的本地 paths,再从 config 中筛出 remote URLs;本地文件并发 8 读取,remote URLs 并发 4 fetch,并过滤空内容。[E: packages/opencode/src/session/instruction.ts:155][E: packages/opencode/src/session/instruction.ts:157][E: packages/opencode/src/session/instruction.ts:158][E: packages/opencode/src/session/instruction.ts:162][E: packages/opencode/src/session/instruction.ts:163][E: packages/opencode/src/session/instruction.ts:166][E: packages/opencode/src/session/instruction.ts:167]

6. remote fetch 使用 `HttpClientRequest.get(url)`,timeout 为 5000ms,失败时返回空 string,所以网络失败不会直接 fail provider turn。[E: packages/opencode/src/session/instruction.ts:95][E: packages/opencode/src/session/instruction.ts:96][E: packages/opencode/src/session/instruction.ts:97][E: packages/opencode/src/session/instruction.ts:98][E: packages/opencode/src/session/instruction.ts:100]

7. `resolve(messages, filepath, messageID)` 先计算 system paths 与已经通过 read tool loaded 的 instruction paths;`extract(messages)` 只从 completed read tool part 的 `metadata.loaded` 中收集路径,并跳过已 compacted tool output。[E: packages/opencode/src/session/instruction.ts:17][E: packages/opencode/src/session/instruction.ts:21][E: packages/opencode/src/session/instruction.ts:22][E: packages/opencode/src/session/instruction.ts:23][E: packages/opencode/src/session/instruction.ts:26][E: packages/opencode/src/session/instruction.ts:184][E: packages/opencode/src/session/instruction.ts:185]

8. `resolve` 从被读文件目录向上走,范围在 `InstanceState.directory` 之下且不包含 root 目录本身;找到 nearby instruction file 后把 path 加入 per-message claims,读取内容并返回 `{ filepath, content }`;同一 assistant message 已 claim 的 nearby instruction 不会重复返回。[E: packages/opencode/src/session/instruction.ts:188][E: packages/opencode/src/session/instruction.ts:190][E: packages/opencode/src/session/instruction.ts:194][E: packages/opencode/src/session/instruction.ts:195][E: packages/opencode/src/session/instruction.ts:201][E: packages/opencode/src/session/instruction.ts:204][E: packages/opencode/src/session/instruction.ts:206][E: packages/opencode/src/session/instruction.ts:207][E: packages/opencode/src/session/instruction.ts:208][E: packages/opencode/src/session/instruction.ts:211][E: packages/opencode/src/session/instruction.ts:214][E: packages/opencode/src/session/instruction.ts:217]

9. read tool 调 `instruction.resolve(ctx.messages, filepath, ctx.messageID)`;如果 loaded instructions 非空,文本文件 output 末尾追加 `<system-reminder>` 包裹的 instruction content,同时 metadata.loaded 记录这些 filepath。[E: packages/opencode/src/tool/read.ts:300][E: packages/opencode/src/tool/read.ts:355][E: packages/opencode/src/tool/read.ts:356][E: packages/opencode/src/tool/read.ts:362][E: packages/opencode/src/tool/read.ts:365]

10. `Instruction.clear(messageID)` 删除 per-message claims;`SessionPrompt.createUserMessage` 和 processor outcome 都注册/执行 clear,避免跨 message 泄漏 nearby instruction claims。[E: packages/opencode/src/session/instruction.ts:105][E: packages/opencode/src/session/instruction.ts:107][E: packages/opencode/src/session/prompt.ts:704][E: packages/opencode/src/session/prompt.ts:1392]

## V1 与 V2 迁移边界

V1 instruction 注入是 immediate string assembly:`Instruction.system()` 返回 string array,`SessionPrompt.runLoop` 每次 provider turn 都把它拼进 system prompt。[E: packages/opencode/src/session/instruction.ts:155][E: packages/opencode/src/session/instruction.ts:165][E: packages/opencode/src/session/prompt.ts:1327][E: packages/opencode/src/session/prompt.ts:1333]

V2 的 System Context 目标模型把 instruction discovery、source identity、persistence 和 file loading 归 instruction service,而 System Context 只组合 producers 并渲染 loaded values;CONTEXT.md 还说明 first instruction-service slice 在每个 Safe Provider-Turn Boundary 观察 global 和 upward project `AGENTS.md` 作为一个 ordered aggregate Context Source。[E: CONTEXT.md:86][E: CONTEXT.md:87] 这不是 V1 `Instruction.system()` 的存储模型,V1 不持久化 Context Epoch 或 Mid-Conversation System Message。[I]

## gotcha

- `CONTEXT.md` 在 V1 `instructionFiles` 中仍被扫描,但源码注释标为 deprecated;如果 upward project scan scope 内任意 `AGENTS.md` match 已经存在,后续 `CONTEXT.md` file-name class 不会继续扫描。[E: packages/opencode/src/session/instruction.ts:64][E: packages/opencode/src/session/instruction.ts:67][E: packages/opencode/src/session/instruction.ts:123][E: packages/opencode/src/session/instruction.ts:124][E: packages/opencode/src/session/instruction.ts:128][E: packages/opencode/src/session/instruction.ts:129][E: packages/opencode/src/session/instruction.ts:130]
- `disableClaudeCodePrompt` 同时受 `OPENCODE_DISABLE_CLAUDE_CODE` 和 `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT` 影响;该 flag 会移除 global `.claude/CLAUDE.md` 和 project `CLAUDE.md` scan entry。[E: packages/opencode/src/effect/runtime-flags.ts:23][E: packages/opencode/src/effect/runtime-flags.ts:24][E: packages/opencode/src/effect/runtime-flags.ts:25][E: packages/opencode/src/effect/runtime-flags.ts:26][E: packages/opencode/src/session/instruction.ts:62][E: packages/opencode/src/session/instruction.ts:66]
- `find(dir)` 只检查当前 dir 下的 `AGENTS.md`/optional `CLAUDE.md`/`CONTEXT.md`,不向上查找;向上 walk 是 `resolve` 的职责。[E: packages/opencode/src/session/instruction.ts:171][E: packages/opencode/src/session/instruction.ts:172][E: packages/opencode/src/session/instruction.ts:173][E: packages/opencode/src/session/instruction.ts:174][E: packages/opencode/src/session/instruction.ts:190][E: packages/opencode/src/session/instruction.ts:191][E: packages/opencode/src/session/instruction.ts:194][E: packages/opencode/src/session/instruction.ts:195]

## Sources
- packages/opencode/src/session/instruction.ts
- packages/opencode/src/tool/read.ts
- packages/opencode/src/session/prompt.ts
- packages/opencode/src/effect/runtime-flags.ts
- packages/core/src/flag/flag.ts
- packages/core/src/v1/config/config.ts
- packages/opencode/src/config/config.ts
- CONTEXT.md

## 相关
- [prompt.system-prompts](../../surface/prompts/system-prompts.md)
