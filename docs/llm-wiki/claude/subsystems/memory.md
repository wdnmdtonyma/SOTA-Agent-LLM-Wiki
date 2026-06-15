---
id: subsys.memory
path: subsystems/memory.md
title: 记忆与 CLAUDE.md
kind: subsystem
tier: T2
status: verified
source: [utils/memory/, services/SessionMemory/, memdir/]
symbols: [MemoryType, getMemoryFiles, processMemoryFile, isAutoMemoryEnabled, scanMemoryFiles, findRelevantMemories, initSessionMemory, createMemoryFileCanUseTool]
related: [subsys.session-state]
updated: 2026-06-14
evidence: explicit
---

Memory 子系统由三条路径组成: `CLAUDE.md`/instructions 文件负责显式规则注入, AutoMem 的 `memdir` 负责长期记忆目录和相关记忆选择, SessionMemory 负责把当前会话压缩写入 session memory 文件。[E: utils/claudemd.ts:790][E: memdir/paths.ts:223][E: memdir/findRelevantMemories.ts:39][E: services/SessionMemory/sessionMemory.ts:272]

## 能回答的问题

- Claude Code 从哪些位置读取 `CLAUDE.md`、AutoMem、TeamMem 和 managed memory?
- AutoMem 目录如何校验路径、扫描文件并生成 entrypoint?
- SessionMemory 在什么阈值下触发, 如何限制写权限?
- memory 类型和注入顺序如何影响 prompt?

## 职责边界

Memory 不等同于 transcript 持久化。Transcript 属于 session state, 记录消息链和 JSONL; Memory 负责把稳定规则、长期记忆和会话摘要变成可注入 prompt 的文件内容。[E: utils/sessionStorage.ts:1408][E: utils/claudemd.ts:790][I] `MemoryType` 包含 User、Project、Local、Managed、AutoMem, 在特定 feature 下还会包含 TeamMem。[E: utils/memory/types.ts:3] `isInstructionsMemoryType` 把 User/Project/Local/Managed 识别为 instructions memory, AutoMem/TeamMem 则走独立入口。[E: utils/claudemd.ts:1077]

## 关键文件

- `utils/claudemd.ts`: 发现并读取 user/project/local/managed/add-dir/AutoMem/TeamMem memory files, 处理 import/include 和 InstructionsLoaded hooks。[E: utils/claudemd.ts:790][E: utils/claudemd.ts:1060]
- `memdir/paths.ts`: 决定 AutoMem 是否启用、记忆目录位置、路径合法性和 entrypoint 路径。[E: memdir/paths.ts:30][E: memdir/paths.ts:85][E: memdir/paths.ts:109][E: memdir/paths.ts:257]
- `memdir/memdir.ts`: 确保 memory directory、截断 entrypoint、根据相关记忆构建 AutoMem prompt。[E: memdir/memdir.ts:57][E: memdir/memdir.ts:129][E: memdir/memdir.ts:199][E: memdir/memdir.ts:272]
- `memdir/memoryScan.ts`: 扫描 memory files, 解析 frontmatter, 排序并生成 manifest。[E: memdir/memoryScan.ts:35][E: memdir/memoryScan.ts:84]
- `memdir/findRelevantMemories.ts`: 用 selector 模型从 manifest 中选出和当前查询相关的记忆文件。[E: memdir/findRelevantMemories.ts:39][E: memdir/findRelevantMemories.ts:77]
- `services/SessionMemory/sessionMemory.ts`: 初始化 session memory、判定触发阈值、fork agent 更新记忆文件, 并限制写工具只可编辑目标 memory path。[E: services/SessionMemory/sessionMemory.ts:134][E: services/SessionMemory/sessionMemory.ts:272][E: services/SessionMemory/sessionMemory.ts:460]

## 数据模型 / 状态

Memory type 的 runtime 枚举由 `MEMORY_TYPE_VALUES` 生成, 因此 UI/loader 使用的是同一个值集合。[E: utils/memory/types.ts:3] AutoMem 的入口文件名固定为 `MEMORY.md`, 并有 entrypoint 文件数、内容 token、截断字符数等容量常量。[E: memdir/memdir.ts:34][E: memdir/memdir.ts:35] `scanMemoryFiles` 返回 `MemoryHeader` 列表, 每项包含 filename、filePath、mtimeMs、description 和 type 字段。[E: memdir/memoryScan.ts:13]

SessionMemory 的配置只包含初始 token 阈值、两次更新之间 token 阈值和两次更新之间 tool call 阈值; prompt 模板和截断预算在 `prompts.ts` 中维护。[E: services/SessionMemory/sessionMemoryUtils.ts:18][E: services/SessionMemory/sessionMemoryUtils.ts:22][E: services/SessionMemory/sessionMemoryUtils.ts:26][E: services/SessionMemory/sessionMemoryUtils.ts:28][E: services/SessionMemory/prompts.ts:8][E: services/SessionMemory/prompts.ts:9][E: services/SessionMemory/prompts.ts:86][E: services/SessionMemory/prompts.ts:111] 默认值是 initial 10000 tokens、between updates 5000 tokens、between updates 3 tool calls。[E: services/SessionMemory/sessionMemoryUtils.ts:32] SessionMemory 文件初始化时会创建目录和文件, 再通过 FileReadTool 把文件读回上下文。[E: services/SessionMemory/sessionMemory.ts:189][E: services/SessionMemory/sessionMemory.ts:195][E: services/SessionMemory/sessionMemory.ts:217]

## 控制流

`getMemoryFiles` 先加载 managed memory, 再按设置加载 user memory, 然后沿项目路径向上收集 project/local memory, 再处理 `CLAUDE_MEMORY_ADDITIONAL_DIRS`、AutoMem 和 TeamMem。[E: utils/claudemd.ts:804][E: utils/claudemd.ts:826][E: utils/claudemd.ts:850][E: utils/claudemd.ts:940][E: utils/claudemd.ts:980][E: utils/claudemd.ts:995] `processMemoryFile` 会用 processed set 和 max depth 防止递归失控, 用 safeResolve 解析 import, 并按 include 外部文件开关决定是否允许 external include。[E: utils/claudemd.ts:629][E: utils/claudemd.ts:640][E: utils/claudemd.ts:666]

AutoMem 是否启用由 `isAutoMemoryEnabled` 决定: disable env、SIMPLE 模式、CCR 无 memory dir、settings 禁用都会返回 false, 否则走默认启用路径。[E: memdir/paths.ts:30][E: memdir/paths.ts:36][E: memdir/paths.ts:42][E: memdir/paths.ts:46][E: memdir/paths.ts:52] AutoMem 路径会通过 `validateMemoryPath` 拦截相对路径、根路径、Windows drive root、UNC path 和 null byte。[E: memdir/paths.ts:109][E: memdir/paths.ts:122][E: memdir/paths.ts:126][E: memdir/paths.ts:130][E: memdir/paths.ts:138]

`scanMemoryFiles` 只扫描 `.md` 文件并排除 `MEMORY.md`, 解析 frontmatter 后按 `mtimeMs` 降序排序, 最后裁剪到最大文件数。[E: memdir/memoryScan.ts:42][E: memdir/memoryScan.ts:55][E: memdir/memoryScan.ts:72][E: memdir/memoryScan.ts:73] `findRelevantMemories` 会先排除已经 surfaced 的文件, 再调用 `selectRelevantMemories`, selector 通过 Sonnet side query 和 JSON schema 返回 `selected_memories`。[E: memdir/findRelevantMemories.ts:46][E: memdir/findRelevantMemories.ts:53][E: memdir/findRelevantMemories.ts:98][E: memdir/findRelevantMemories.ts:109]

SessionMemory 初始化在 remote 模式直接返回; 非 remote 时读取 auto-compact 开关, 未启用则不注册, 启用时才注册 post-sampling hook。[E: services/SessionMemory/sessionMemory.ts:357][E: services/SessionMemory/sessionMemory.ts:358][E: services/SessionMemory/sessionMemory.ts:360][E: services/SessionMemory/sessionMemory.ts:369][E: services/SessionMemory/sessionMemory.ts:374] `shouldExtractMemory` 在初始 token 阈值、两次更新之间 token 阈值、工具调用总数和最近一轮工具调用数之间做判定, 并记录最后处理过的 uuid。[E: services/SessionMemory/sessionMemory.ts:134][E: services/SessionMemory/sessionMemory.ts:147][E: services/SessionMemory/sessionMemory.ts:150][E: services/SessionMemory/sessionMemory.ts:158][E: services/SessionMemory/sessionMemory.ts:172] 真正提取时 `extractSessionMemory` 只允许在 `repl_main_thread` 上运行, 达到阈值后用 `runForkedAgent` 执行 memory update prompt。[E: services/SessionMemory/sessionMemory.ts:278][E: services/SessionMemory/sessionMemory.ts:296][E: services/SessionMemory/sessionMemory.ts:318]

## 设计动机与权衡

- `CLAUDE.md` loader 把 managed/user/project/local/add-dir/AutoMem/TeamMem 放在一个发现函数里, 使 prompt 注入顺序集中可审计; 代价是 memory loader 需要了解多个配置源和 feature gate。[E: utils/claudemd.ts:804][E: utils/claudemd.ts:826][E: utils/claudemd.ts:850][E: utils/claudemd.ts:940][E: utils/claudemd.ts:980][E: utils/claudemd.ts:995][I]
- AutoMem 不把全部记忆文件直接塞进上下文, 而是先构建 manifest 再选 relevant memories, 这是用一次 side query 换取 prompt 体积控制。[E: memdir/memoryScan.ts:84][E: memdir/findRelevantMemories.ts:53][E: memdir/findRelevantMemories.ts:98][I]
- SessionMemory 的写工具权限被限制成只能对目标 memory 文件使用 Edit, 这是把 forked agent 的能力面缩到单文件更新。[E: services/SessionMemory/sessionMemory.ts:460][E: services/SessionMemory/sessionMemory.ts:470][I]

## Gotchas

- AutoMem settings override 只读取 policy、flag、local、user 四类 source, 没有读取 project settings; 因而项目级设置不会悄悄改全局 memory dir。[E: memdir/paths.ts:181][E: memdir/paths.ts:182][E: memdir/paths.ts:183][E: memdir/paths.ts:184][I]
- SessionMemory update prompt 要求使用 Edit tool, 且提示不要重复已有 CLAUDE.md 内容; 如果看到 session memory 写入大量项目规则, 先检查 prompt 模板是否被自定义覆盖。[E: services/SessionMemory/prompts.ts:53][E: services/SessionMemory/prompts.ts:66][E: services/SessionMemory/prompts.ts:111]
- `processMemoryFile` 对空文件直接跳过, 所以存在但为空的 `CLAUDE.md` 不会贡献 prompt 内容。[E: utils/claudemd.ts:650]

## Sources

- `utils/memory/`
- `services/SessionMemory/`
- `memdir/`

## 相关

- `subsys.session-state`
