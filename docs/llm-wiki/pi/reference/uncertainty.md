---
id: ref.uncertainty
title: 不确定项日志([U] 汇总)
kind: reference
tier: T3
pkg: cross
source: []
symbols: []
related: []
evidence: unknown
status: verified
updated: 8c943640
---

# 不确定项日志([U] 汇总)

> 本文件由 tools/reconcile.mjs 从 _staging/uncertainty-*.md 自动合并生成,请勿手改。

## agent-core-agent-events

# uncertainty: ref.agent.agent-events

L2 verifier 已逐条对照 `packages/agent/src/types.ts` 与 `packages/agent/src/harness/types.ts` 核验 `ref.agent.agent-events` 的 `[E]` 可核性、行号精度和过度推断风险;本轮未登记 `[U]`。

修正点: `AgentEvent` 数量从 9 个改为 10 个;`message_start`、`agent_end`、tool execution payload、`AgentHarnessEventResultMap` 和 session entry 关系边界均收紧为当前 source 可直接支撑的字段/union 事实。已确认 `AgentEvent` 10 个 variant 与 `AgentHarnessOwnEvent` 19 个 harness-owned variant 全覆盖,节点已置为 `status: verified`。

## agent-core-branch-summary

# Uncertainty staging: subsys.agent-core.branch-summary

- 本轮未留下 `[U]`。
- 本节点按指令只使用 `packages/agent/src/harness/compaction/branch-summarization.ts` 作为 `source`。branch navigation 何时调用 `generateBranchSummary()`、summary entry 如何持久化、以及 hook 如何注入 summary 属于 `agent-harness.ts` / `session.ts` 的调度与写入边界,未在本节点正文中写成由本 source 直接证明的事实。
- `GenerateBranchSummaryOptions` 在 `branch-summarization.ts` 内定义的形状以 `models`/`model`/`signal` 为准;其它文件中的同名 interface 不作为本节点证据来源。
- L2 verifier 结论:已逐条核验节点内 `[E]` 的可核性、行号精度和过度推断风险;将摘要、options 边界、empty entries 解释、非 message entry 分类、成功返回对象和跨包边界表述收紧到 `branch-summarization.ts` 可直接支撑的范围后,节点标记为 `status: verified`。

## agent-core-compaction-config

# uncertainty: ref.agent.compaction-config

本轮未新增 `[U]`。

保留为 `[I]` 的边界判断:

- `ref.agent.compaction-config` 与 `subsys.agent-core.compaction` 的分工是 wiki 结构层面的职责边界;源码能证明 `CompactionSettings`、`DEFAULT_COMPACTION_SETTINGS` 和 compaction functions 的字段/签名,但节点归属关系本身来自 wiki index 与写作约定。

## agent-core-compaction

# uncertainty: subsys.agent-core.compaction

- 本轮未新增 `[U]`。
- 保留为 `[I]` 的主要边界判断: `prepareCompaction()` 与 `shouldCompact()` 的调用顺序属于从函数签名和当前 source 内无调用关系推出的职责边界;`compact()` 不持久化 session entry 属于当前两个 source 文件范围内的负向边界;branch summary 的 abandoned-branch collection 和 prompt 交给 `subsys.agent-core.branch-summary` 单独核验。
- L2 verifier: 已逐条核对 221 个 `[E]` 引用,201 个唯一源码行号均存在;未发现行号漂移、不可核证据或需要降级的过度推断。本节点通过,状态更新为 `verified`。

## agent-core-error-codes

# Uncertainty: agent-core error-codes

batch: agent-core
node: ref.agent.error-codes
updated: 5a073885

## 当前状态

- L2 verifier 已逐条证伪 `[E]` 可核性、行号精度与过度推断风险;`FileErrorCode`、`ExecutionErrorCode`、`AgentHarnessErrorCode` union 实例覆盖与 `packages/agent/src/harness/types.ts` 当前定义一致,节点已标记 `status: verified`。
- 本轮未留下需要升级为 uncertainty 条目的不确定点。
- `ref.agent.error-codes` 只覆盖 prompt 指定的 `FileErrorCode`、`ExecutionErrorCode`、`AgentHarnessErrorCode`;同文件中的 `CompactionErrorCode`、`BranchSummaryErrorCode`、`SessionErrorCode` 未纳入本节点逐实例 catalog。

## agent-core-exec-env

# Uncertainty staging: agent-core / exec-env

Node: `subsys.agent-core.exec-env`

L2 verifier 已逐条证伪本节点 `[E]` 的可核性、行号精度与过度推断。结论: 当前节点未留下需要同步到 `reference/uncertainty.md` 的 `[U]` 断言。

本轮修正:

- 移除正文对 `packages/agent/src/harness/types.ts` 与 `packages/agent/src/harness/utils/shell-output.ts` 的 `[E]` 依赖, 因为本 batch source 只包含 `nodejs.ts`、`node.ts`、`truncate.ts`。
- 将接口 contract、timeout contract、shell capture helper、coding-agent bash executor 等超出 source set 的表述收紧为 `nodejs.ts` / `node.ts` / `truncate.ts` 可直接证明的实现事实或边界说明。
- `subsys.agent-core.exec-env` 已置为 `status: verified`。

## agent-core-hooks

# uncertainty: subsys.agent-core.hooks

- L2 verifier 通过: `subsys.agent-core.hooks` 已核到 `packages/agent/src/types.ts` 当前行号,节点状态置为 `verified`。本轮未新增 `[U]`;修正包括将 `transformContext` 失败事件序列从 `[E]` 收紧为 hook-local fallback contract + `[I]`,把所有 `[E]` 从注释行移到实际 interface/property/signature 行,并把 block/merge/batch 语义、负面能力与跨节点职责边界显式标为 `[I]`。
- [I] 本节点 `source` 按任务要求只包含 `packages/agent/src/types.ts`。`beforeToolCall`、`afterToolCall`、`prepareNextTurn`、`transformContext` 的精确 runtime 调用点和事件相对顺序需要 `packages/agent/src/agent-loop.ts` 证明;正文只对 `types.ts` 注释中直写的时机挂 `[E]`, 对需要 loop 代码才能证明的行为标 `[I]`。
- [I] `transformContext` 是否把返回的 `AgentMessage[]` 持久写回 `AgentContext.messages` 不由 `types.ts` 证明;正文只声明它在 `convertToLlm` 前提供 provider request 前的 message transform contract。
- [I] `afterToolCall.terminate` 的 batch 聚合算法不在 `types.ts` 中;正文只记录类型注释中的 “every finalized tool result in the batch” contract, 具体实现应由 agent-loop / tool-invocation 节点核证。
- [I] coding-agent extension events 如何接入 agent-core hooks 不在 `packages/agent/src/types.ts` 中;正文将其列为跨包装配边界, 未展开产品层调用链。

## agent-core-jsonl-storage

# Uncertainty: agent-core jsonl-storage

batch: agent-core
node: subsys.agent-core.jsonl-storage
updated: 5a073885

## 当前状态

- L2 已逐条核对 `[E]` 可核性、行号精度与过度推断;未留下需要升级为 uncertainty 条目的不确定点。
- 已将节点标记为 `status: verified`。
- 收紧项:区分 full open path 的“过滤空白行后首行 header”和 list path 的“物理第一行 header”;把 `getPathToRoot()` 改写为从传入 entry id 回溯;明确 `encodeCwd()` 只移除一个开头 slash/backslash;删除“普通对话消息”这类超出本节点 source 的表述。
- 节点只依据 `packages/agent/src/harness/session/jsonl-storage.ts` 与 `packages/agent/src/harness/session/jsonl-repo.ts` 写入,未把测试文件作为 frontmatter source。

## agent-core-memory-storage

# uncertainty-agent-core-memory-storage

本轮填充 `subsys.agent-core.memory-storage` 未新增 `[U]` 存疑项。

L2 verifier 复核结论: 已逐条证伪 `[E]` 的可核性、行号精度和过度推断风险; 143 个 `[E]` 引用均可落到指定 source 的有效行,未发现需要降级或新增 `[U]` 的结论。

保持为 `[I]` 的主要结论:

- `InMemorySessionRepo` 不读写文件、目录或 JSONL header: 两个指定 source 中只出现 `Map`、`InMemorySessionStorage` 和 `toSession()`,未出现 filesystem API 或 JSONL header 处理;这是从 source absence 和实现边界得出的推断。
- `getMetadata()`、`open()`、`getEntries()` 的 object identity / shallow-copy gotcha: 源码能证明返回保存的对象或浅拷贝 array,但没有注释把 entry object identity 声明成公共契约。
- `setLeafId()` 把导航写入 append-only entry stream: 源码能证明追加 `LeafEntry`,但“append-only navigation log”是对该实现效果的解释。
- 测试建议“reload persistence 用 JSONL storage/repo”: 源码能证明内存 repo 返回 live session object 且 process-local,但选择 JSONL 作为持久化测试替代是测试策略推导。

## agent-core-message-conversion

# uncertainty: subsys.agent-core.message-conversion

本轮填充 `subsys.agent-core.message-conversion` 未新增 `[U]`。节点证据限定在 `packages/agent/src/harness/messages.ts`;关于 compaction / branch summary 的生成与持久化边界只写到本文件可证明的 conversion 层,超出本文件的流程归属用 `[I]` 标注并留给 `subsys.agent-core.compaction` / `subsys.agent-core.branch-summary`。

L2 verifier 已逐条证伪 `[E]` 的可核性、行号精度与过度推断风险;未发现需修正或降级的证据标。

## agent-core-message-model

# uncertainty: subsys.agent-core.message-model

L2 verifier 已逐条对照 `packages/agent/src/types.ts` 与 `packages/agent/src/harness/messages.ts` 核对 `subsys.agent-core.message-model` 的 `[E]`。本轮未新增 `[U]`。

收紧点:移除了落在源码注释行上的 `[E]` 锚点;把 `AgentLoopConfig.convertToLlm` 的 throw/reject contract 改为注释约定 + `[I]`;把 `ToolResultMessage` 的字段级 error 语义收回到外部 `@earendil-works/pi-ai` 边界;把 timestamp 与 system prompt 相关表述改成只依赖本节点 source 可核到的字段和 switch 分支。

保留的范围边界: `UserMessage`、`AssistantMessage`、`ToolResultMessage` 和底层 `Message` 的字段级定义来自 `@earendil-works/pi-ai`,不在本节点指定 source 范围内展开;节点只记录 `packages/agent/src/types.ts` 和 `packages/agent/src/harness/messages.ts` 中可核到的 agent-core 使用语义、custom message augmentation、tool call/result envelope 与 `convertToLlm` 边界。

## agent-core-message-queue

# uncertainty: subsys.agent-core.message-queue

- 本轮未新增 `[U]`。主节点只用 `packages/agent/src/agent.ts` 作为 source; 跨到 `runLoop` 具体 polling 时机、`QueueMode` 完整值域和 `pi-coding-agent` 产品入口的说法均降级为 `[I]`, 并交给 `subsys.agent-core.turn-control`、`ref.agent.queue-modes` 或后续 coding-agent 节点核验。

## agent-core-message-types

# uncertainty: ref.agent.message-types

本轮填充 `ref.agent.message-types` 未新增 `[U]`。

保留的范围边界: `user`、`assistant`、`toolResult` 三个标准 message variant 的字段级定义来自 `@earendil-works/pi-ai` 的 `Message` union,不在本节点指定 source 范围内展开;本节点只记录 `packages/agent/src/types.ts` 和 `packages/agent/src/harness/messages.ts` 中可核到的 `AgentMessage` union、custom message augmentation、harness 默认 variant 与 default `convertToLlm` 行为。

L2 verifier 结论:已逐条核对 `[E]` 的路径/行号和可支撑语义,并将外部 `Message` union 的完整角色/字段集合收窄为本 source 可核到的 pass-through 边界。`AgentMessage` custom variants 覆盖 `bashExecution`、`custom`、`branchSummary`、`compactionSummary`;helper exports 覆盖 4 个 summary boundary constants、`bashExecutionToText`、3 个 `create*Message` constructor、`convertToLlm`。未发现需要保留的新增 `[U]`。

## agent-core-prompt-templates

# uncertainty: subsys.agent-core.prompt-templates

- L2 verifier 已逐条核对 `subsystems/agent-core/prompt-templates.md` 中 `[E]` 的可核性、行号精度和过度推断风险;未发现需要降级为 `[U]` 的断言,节点已置为 `status: verified`。
- 本轮仅收紧两处边界措辞: `loadSourcedPromptTemplates()` 的 source/mapper 行为改成 wrapper 层代码事实,`surface.prompt-templates.system` 的产品层覆盖范围标为边界推断 `[I]`。

## agent-core-queue-modes

# uncertainty: ref.agent.queue-modes

- L2 verifier 已逐条核对 `ref.agent.queue-modes` 的 `[E]` 可核性、行号精度与过度推断风险;节点已标记 `status: verified`。
- `QueueMode` 值域由 `packages/agent/src/types.ts:49` 直接证明,当前仅覆盖 `"all"` 与 `"one-at-a-time"` 两个 literal。
- 本轮未新增 `[U]`。运行时 drain/default/setter 语义来自 `packages/agent/src/agent.ts` 和既有 `subsys.agent-core.message-queue`,均在主节点中按 source 外语义标为 `[I]`。

## agent-core-session-entry-types

# uncertainty: ref.agent.session-entry-types

L2 verification passed for `ref.agent.session-entry-types`; status set to `verified`。

本轮逐条核验 `packages/agent/src/harness/types.ts` 中 session entry exported types 的 `[E]` 可核性、行号精度与过度推断风险;未登记 `[U]`。覆盖范围确认包括 `SessionTreeEntryBase`、11 个 `SessionTreeEntry` union member、`SessionTreeEntry` union 本身与 `PendingSessionWrite`。

L2 修正:

- 将 `CustomMessageEntry.display` 从“控制是否展示”收紧为携带 boolean flag;实际解释归入 UI/转换层边界。
- 将 `LabelEntry.label: string | undefined` 的清空语义收紧为字段允许 `undefined`;索引、覆盖或清空行为留给 storage implementation。
- 为 `LeafEntry` 的 active leaf 持久化描述补充 `SessionStorage.setLeafId()` 注释/签名证据。
- 补齐节点 frontmatter 的 `batch: agent-core`,并将 `SessionTreeEntryBase.type` 的分派语义收紧到 variant literal discriminator 边界。

保留的 `[I]`:

- `SessionTreeEntryBase` 的 `type` 字段在 base interface 中是宽泛 `string`,但每个 union member 把它收窄为 literal discriminator;这是由 `extends SessionTreeEntryBase` 与 union member 字段共同归纳的类型层结论。
- `PendingSessionWrite` 不是一种持久化 entry variant,而是对 `SessionTreeEntry` union 做 distributive `Omit` 的待写入 payload 形态;源码可证明类型表达式,用途边界来自命名与去除字段的结构性推断。
- label 覆盖/清空、leaf pointer 的后续读取/投影行为、context projection、compaction summary 消费和 coding-agent JSONL 文件兼容行为不在本节点 source 内展开;这些行为留给 `subsys.agent-core.session-tree`、`spine.session-state-model` 与 `ref.coding-agent.session-format`。

## agent-core-session-storage

# uncertainty: subsys.agent-core.session-storage

L2 核验后 `subsys.agent-core.session-storage` 未新增 `[U]`;节点已标记 `status: verified`。主节点只把 `SessionStorage`、`SessionRepo`、JSONL-specific 类型 specialization 和 `repo-utils.ts` 的通用 helper 写成可由指定 source 直接核验的事实。

JSONL 文件格式、目录扫描、append 策略、memory backend 的 Map/array/cache 行为、以及具体 implementation 的并发/生命周期语义没有在本节点展开；这些边界留给 `subsys.agent-core.jsonl-storage` 与 `subsys.agent-core.memory-storage`。节点中涉及“接口与 repo 分离”“helper 可被不同 backend 复用”“默认 fork 偏向从 user message 之前分叉”“leaf/repo 边界”“fork validation boundary”的设计意图或结构判断均按 `[I]` 标注,不当作源码可直接证明的设计说明。L2 修正了过度表述: `createTimestamp()` 只保留为 ISO timestamp helper,`getEntriesToFork()` 无 `entryId` 分支只写成返回完整 entries,filesystem error gotcha 不再列未引用的具体 FileErrorCode 示例,跨包边界只说指定 source 覆盖范围,不再把 CLI/TUI/product settings 的依赖关系写成 `[E]` 可证明事实。

## agent-core-session-tree

# Uncertainty staging: subsys.agent-core.session-tree

- 本轮未留下 `[U]`。
- `[I]` child relation: 本节点 source 只暴露 `parentId`、`LeafEntry.targetId` 与 `SessionStorage.getPathToRoot()`, 未包含 storage backend 的 child/path 构建算法, 所以正文把 child relation 写成由 `parentId` 反向索引得到的模型判断。
- `[I]` session-state spine 边界: 本节点 source 未包含 `session.ts`, 因此 `buildSessionContext()`、entry-to-message projection、compaction read-time behavior 都只作为 `spine.session-state-model` 边界说明, 不在本节点内用 `[E]` 证明。
- `[I]` uuidv7 ordering: `uuidv7()` 的 timestamp/sequence 代码支持单进程内大体单调的描述, 但跨进程严格有序性不由这两个 source 证明。

## agent-core-skills-loading

# uncertainty: subsys.agent-core.skills-loading

本轮填充 `subsys.agent-core.skills-loading` 未新增 `[U]`。

L2 核验后节点已置 `status: verified`。本轮逐条对照 `packages/agent/src/harness/skills.ts` 核验 `[E]` 可核性、行号精度和过度推断:将 diagnostic code 描述从 "root or symlink info failure" 收紧为 file-info/canonical-path failure;将 `SKILL.md` 优先级补充为 non-ignored regular file,避免把 ignored/non-file `SKILL.md` 写成必然截断遍历。其余 `[E]` 均能落到当前 source 行号;跨节点职责边界继续保留为 `[I]`。

- [I] `Skill` 的完整接口定义不在本节点 source 内。本节点只用 `packages/agent/src/harness/skills.ts` 证明 `Skill` 被 type-import、作为数组/返回类型使用,以及 `loadSkillFromFile()` 构造的字段集合;完整契约应由类型模型或 skills surface 节点核验。
- [I] `loadSourcedSkills` 的 source schema 由调用方定义这一点来自泛型 `TSource` 和 runtime 原样转发 `input.source` 的组合判断;本文件能直接证明原样附加,不能单独证明所有上层 source taxonomy。
- [I] broader system prompt 装配不在本节点 source 内。本节点只覆盖 `formatSkillInvocation()` 的单 skill invocation payload,并把 always-on skills listing / summary 交给 `subsys.agent-core.system-prompt` 或 `surface.skills.system`。

## agent-core-system-prompt

# uncertainty: subsys.agent-core.system-prompt

本轮填充 `subsys.agent-core.system-prompt` 未新增 `[U]`。

节点 `[E]` 严格限定在 `packages/agent/src/harness/system-prompt.ts`。关于 `formatSkillsForSystemPrompt` 的调用点、coding-agent 产品层完整 prompt 组装、AgentSession 何时重建 system prompt、以及 skill loading 来源,均属于 source 外关系,正文只用 `[I]` 标注边界,不作为本节点显式证据。

L2 已逐条证伪 `subsys.agent-core.system-prompt` 的 `[E]` 可核性、行号精度和过度推断风险;未留下需要上卷到 `reference/uncertainty.md` 的 `[U]`。节点 frontmatter 已置 `status: verified`;摘要 wording 已从 package-wide “唯一可见” 收紧为 “当前 source 中可见”。

## agent-core-thinking-levels

# uncertainty · ref.agent.thinking-levels

batch: agent-core
node: ref.agent.thinking-levels
updated: 5a073885

## 当前状态

- L2 verifier 已逐条核对 `ref.agent.thinking-levels` 的 `[E]` 可核性、行号精度和过度推断风险;节点已置 `status: verified`。
- `ThinkingLevel` 当前六个值已按 `packages/agent/src/types.ts:289` 确认为完整 union 覆盖:`"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`。
- 本轮未留下需要并入 `reference/uncertainty.md` 的 `[U]` 项。
- 节点按 `source=[packages/agent/src/types.ts]` 收窄证据:所有 provider/model support、`SimpleStreamOptions.reasoning` 字段细节、`"off"` 到 provider request 的 runtime 转换都标为 `[I]`,没有用 source 外文件作 `[E]`。L2 将 `AgentLoopConfig` 边界收紧为本文件只证明继承 imported `SimpleStreamOptions` shape,不把具体 `reasoning` 字段写成当前 source 可直接证明。

## agent-core-tool-execution-modes

# uncertainty: ref.agent.tool-execution-modes

L2 verifier 已逐条证伪 `[E]` 可核性、行号精度与过度推断风险;节点已标记 `status: verified`。本轮未留下需要并入 `reference/uncertainty.md` 的 `[U]` 项。

- `ToolExecutionMode` 在 `packages/agent/src/types.ts:41` 仅定义 `"sequential" | "parallel"` 两个 literal 值;节点表格已覆盖两个值,未发现第三个值或遗漏值。
- `AgentLoopConfig.toolExecution` 与 `AgentTool.executionMode` 字段均能在 `packages/agent/src/types.ts` 当前代码行直接核到;默认 `"parallel"`、per-tool sequential/parallel 注释和省略时使用默认 execution mode 是 comment-level contract,节点已按行号规则标为 `[I]`。
- 按用户要求,本节点 `source` 只使用 `packages/agent/src/types.ts`;`agent-loop.ts` 中的实际 dispatch、整批升级到 sequential、parallel runtime path 和 tool-result source-order artifact 行为只在正文中标为 `[I]`,不作为本节点 source 的 direct evidence。

## agent-core-tool-invocation

# uncertainty · subsys.agent-core.tool-invocation

- 本轮未留下需要并入 `reference/uncertainty.md` 的 `[U]` 项。
- L2 已逐条证伪 `subsys.agent-core.tool-invocation` 的 `[E]` 可核性、行号精度和过度推断风险;节点 frontmatter 已置 `status: verified`。
- 为满足 `source=[packages/agent/src/agent-loop.ts, packages/agent/src/types.ts]`,正文没有展开 `validateToolArguments` 在 `pi-ai` 中的 schema 细节,只引用 agent loop 对该函数的调用边界。
- 已把产品层工具注册归属、相关节点职责分配等不能由本节点两个 source 直接证明的内容收窄为 `[I]` 边界说明;正文证据行改为实际代码行,不再依赖注释行锚点。

## agent-core-transport-proxy

# uncertainty: subsys.agent-core.transport-proxy

- 本轮未新增 `[U]`。主节点只用 `packages/agent/src/proxy.ts` 与 `packages/agent/src/types.ts` 作为 source; provider registry、wire protocol dispatch、agent loop 消费时序均作为跨节点边界指向 `spine.provider-stream` 或 `subsys.agent-core.turn-control`,未在本节点扩展为未核验事实。
- L2 已逐条证伪 `[E]` 可核性、行号精度和过度推断风险;所有 `[E]` 引用均落在存在的 source 行内。发现并修正一处过度概括: `toolcall_end` 在 content block 类型不匹配时返回 `undefined`,不是 throw;节点已收窄为 text/thinking delta/end 与 toolcall_delta 的错误类型会 throw。另将注释/示例/纯括号行上的 `[E]` 锚点改到类型签名、request 构造、函数签名和 catch path 的代码行,并把 `StreamFn` contract 表述收窄为类型签名 + `streamProxy()` 可核实现。主节点已置 `status: verified`。

## agent-core-tree-navigation

# uncertainty: subsys.agent-core.tree-navigation

L2 verifier 已逐条证伪 `[E]` 的可核性、行号精度与过度推断风险;节点已标记 `status: verified`。正文保留 1 个 source-scope `[U]`: `getPathToRoot` backend 具体实现不在本节点指定 source `packages/agent/src/harness/session/session.ts` 中;这不是失败的 `[E]`,而是本节点的覆盖边界。

本轮收紧的表述:

- `SessionStorage` 能力摘要不再把 metadata 写成“读写”;`session.ts` 只直接读取 metadata,leaf/entry/message/state/branch summary 才涉及读取、移动或追加。
- 薄 wrapper 说明中把 `getStorage()` 改为“直接返回 storage 实例”,不再说它转发到 storage 方法。
- compaction rebuild 范围改为“自 `firstKeptEntryId` 起”,对应源码先命中该 id 再 append 当前 entry。
- `buildSessionContext()` 状态扫描说明补充 assistant message 会覆盖 model,避免把 model 来源全部概括成 state entry。
- 跨包边界改成基于当前 source import 与节点 scope 的结构性 `[I]`,不把未展开 coding-agent product 层写成可由单行 `[E]` 直接证明的事实。

保留为边界/推断的点:

- `getPathToRoot` 的具体 backend 实现不在本节点 source 中;本节点只证明 `Session.getBranch()` 调用 `storage.getPathToRoot(leafId)`。
- `fromId` 被解释为指定 leaf/path anchor,以及多个 compaction 时最后一次扫描到的 compaction 生效,均来自源码控制流推断,正文继续用 `[I]` 标注。

## agent-core-turn-control

# uncertainty: subsys.agent-core.turn-control

- L2 verified: 本轮未发现需要保留为 `[U]` 的事实；节点 status 已升为 `verified`。对 `[E]` 的行号锚点做了局部收紧：`newMessages` 明确为调用方返回并随 `agent_end` 发送，follow-up 续跑补充 `length > 0`/`continue` 行号，非 error/aborted 的 turn hook 路径补充条件行，hard-stop 表述改为“在后续阶段之前返回”。
- [I] follow-up messages 被解释为“等待 tool-call 驱动的自然续轮耗尽后再进入 context”；L2 已核对 `runLoop` 外层停止点检查和代码注释可支撑控制流结论，但产品层 queue 语义仍作为跨节点边界保留为 `[I]`。
- [I] `shouldStopAfterTurn` 被解释为 graceful stop gate；代码位置显示它在 `turn_end`、`prepareNextTurn` 和工具执行之后运行，但命名意图仍属推断。
- [I] `stopReason === "error" | "aborted"` 被解释为 hard-stop path；代码明确直接发 `turn_end`/`agent_end` 返回，hard-stop 是本文术语。

## ai-anthropic-messages

# uncertainty: subsys.ai.anthropic-messages

本轮未登记 `[U]`。

保留的 `[I]`:

- `openai-prompt-cache.ts` 与 `anthropic-messages.ts` 没有直接调用关系:Anthropic adapter 的缓存实现可由 `cache_control` 相关代码证明,OpenAI helper 的行为可由独立文件证明,但“无直接参与”是基于本节点 source/import 边界的归纳。
- `message_delta` 省略 usage 字段时保留已有值:源码直接证明每个字段是 guarded assignment,保留既有值是控制流结果。
- `options.onPayload` / `options.onResponse` 的调试用途:hook 的调用点和可替换 payload / 可观察 response metadata 可由源码证明,但“用于调试或调整”的用途描述是调用方意图层面的归纳。

## ai-auth-resolution

# uncertainty: subsys.ai.auth-resolution

L2 核验后 `subsys.ai.auth-resolution` 未新增 `[U]`。已将 OAuth refresh 的 `modify()` 并发语义收紧为 resolver 对 store read-modify-write 边界的依赖,未把具体锁实现写成源码可直接证明的事实。provider-specific 环境变量名、OAuth provider 细节和 `AuthResult` 完整字段语义仍作为跨节点边界留给 `surface.providers.auth`、`subsys.ai.credential-store` 与 `ref.ai.auth-types`;本节点只记录 `resolve.ts` / `context.ts` 能直接支撑的解析顺序、fallback 边界和 `AuthContext` 行为。

## ai-auth-types

# uncertainty: ref.ai.auth-types

本轮填充 `ref.ai.auth-types` 未新增 U 级存疑项。`OAuthCredential` 只按 `packages/ai/src/auth/types.ts` 记录为 `extends OAuthCredentials` 且追加 `type: "oauth"`; `OAuthCredentials` 的内部字段不在本节点 source 范围内展开。

## ai-azure-openai-responses

# uncertainty-ai-azure-openai-responses

L2 核验后 `subsys.ai.azure-openai-responses` 未留下 `[U]`。已把职责分布、lazy import 首次 stream/streamSimple 调用加载、Azure request `model` 字段代表 deployment 标识、cache/service-tier 缺失分支、GitHub Copilot 特例缺失等对照型结论标为 `[I]`; deployment map parser 的 whitespace/key/value 描述已按源码收窄。其余 `[E]` 均能落到当前源码或测试行号。

## ai-bedrock-converse

# uncertainty-ai-bedrock-converse

本轮填充 `subsys.ai.bedrock-converse` 未新增 `[U]` 存疑项。未展开的部分已作为跨节点边界留给 `subsys.ai.wire-protocol-dispatch` 与 `subsys.ai.env-api-keys`。

## ai-compat-legacy

# uncertainty: subsys.ai.compat-legacy

L2 核验后 `subsys.ai.compat-legacy` 未新增 `[U]`;节点已标记 `status: verified`。修正包括:为摘要中的迁移边界补充 `compat.ts:2` / `compat.ts:8` 证据,将 “compat 不实现新的 provider-specific wire payload” 明确降级为结构性 `[I]`,并把 “启动时记录的 builtin provider instance” 收紧为 `registerBuiltInApiProviders()` 记录的 instance。迁移边界来自 `compat.ts` 的源码注释与 deprecated alias 注释;对“不要继续在 compat 新增 alias”“builtin fast path 复用新 `Models` surface”等范围判断继续使用 `[I]` 标注为结构性推断。

## ai-core-types

# uncertainty: ref.ai.core-types

L2 verification passed for `ref.ai.core-types`; status set to `verified`.

- `packages/ai/src/types.ts` 的 exported 类型/re-export 均已覆盖,包括核心 `Model`、`Context`、`Message`、`AssistantMessage`、`AssistantMessageEvent`、`Usage`。
- 已逐条收紧 `[E]` 行号:补充 `ImagesOutputContent` 的 `TextContent`/`ImageContent` 证据,把 `Usage.reasoning`、`ProviderEnv`、`ProviderHeaders`、`ThinkingLevelMap`、`SimpleStreamOptions`、routing/model cost 等语义指向实际注释或字段行。
- 已将 `Models.*` facade、message transform/provider serializer、event-stream result 行为、provider-specific image option 消费等非本 source 可直接证明的内容降级为 `[I]` 或收窄措辞。
- 未新增 `[U]`。

## ai-credential-store

# uncertainty-ai-credential-store

本轮填充 `subsys.ai.credential-store` 未新增 `[U]` 存疑项。

L3 lint 修正了几处仍指向注释行的 `[E]`: 顶部摘要的 serialized modify/removal 证据改到 `CredentialStore` 方法签名与 `InMemoryCredentialStore.enqueue()` 代码行, `CredentialStore` 不承载 provider-specific auth 解析策略保持 `[I]`, `modify()` 的 undefined/removal 语义改用 `modify` 回调/返回类型、`delete()` 方法签名和内存实现代码行证明, OAuth refresh critical-section 用途保持 `[I]`。修正后节点保持 verified。

降级为 `[I]` 的主要结论:

- `ProviderAuth` handler choice belongs to auth resolution: `types.ts` 只定义 `ProviderAuth`、`ApiKeyAuth`、`OAuthAuth` 与 store contract, 本节点未把 `resolve.ts` 纳入 Sources。
- `CredentialStore` 不承载 provider-specific auth 解析策略: 这是从 interface 暴露面和本节点 Sources 边界得出的职责边界推断, 不是源码中的独立明文声明。
- `modify(fn)` 的 critical-section 用途: 源码能证明 `fn(current)` 在 provider-local queue 内执行, OAuth refresh policy 由 `subsys.ai.auth-resolution` 覆盖。
- `InMemoryCredentialStore` 不做结构复制: 源码显示 map 直接保存/返回 credential object, 但没有注释把 object identity 声明成公共契约。

## ai-env-api-keys

# Uncertainty staging: ai env-api-keys

Node: `subsys.ai.env-api-keys`
Status: L2 verified; no unresolved unknown-evidence claims left in the node.

Notes for later catalog work:

- `getApiKeyEnvVars` is private but requested as the covered symbol for this node; the public consumers are `findEnvKeys` and `getEnvApiKey`.
- `getApiKeyEnvVars` should not be treated as the sole auth mapping for newer provider auth implementations; custom `ApiKeyAuth` definitions may carry their own env var lists.
- L2 downgraded cross-module/wire-protocol statements to `[I]` boundary notes where the supplied source files do not directly evidence them.

## ai-event-stream

# uncertainty: subsys.ai.event-stream

- L2 verifier 已逐条对照 `packages/ai/src/utils/event-stream.ts` 核对本节点 `[E]`:修正了摘要、`done` 字段行为、`.result()` resolve-only path、`end()` 无 result 的 pending gotcha、`extractResult` guard 的行号和措辞精度。
- 本轮未发现需要标 `[U]` 的事项。
- provider dispatch、wire payload 转换和具体 provider event normalization 只作为边界说明处理,详细证据应归入 `spine.provider-stream` 或对应 provider/API 子系统节点。[I]

## ai-google-generative-ai

# uncertainty-ai-google-generative-ai

- none: L2 核验后没有留下需要上卷到 `reference/uncertainty.md` 的 `[U]`。本轮把 `subsys.ai.google-generative-ai` 中几处过度概括收紧为可由源码逐行核验的表述: `streamSimple` 的 thinking-level 分支明确为 Gemini 3 Pro、Gemini 3 Flash/Lite 和 Gemma 4;Vertex client 对比拆成 ADC client 与 API-key client;`transformMessages` 相关描述不再声称未引用源码的跨 provider replay normalization;禁用 thinking 的 fallback 改为“未命中特殊分支的模型回退到 budget 0”。

## ai-google-vertex

# Uncertainty staging: ai/google-vertex

本轮 L2 将以下原 `[E]` 降级为 `[U]`,因为本节点 source 只包含 `packages/ai/src/api/google-vertex.ts` 与 `packages/ai/src/api/google-shared.ts`,未包含对应的 sibling/env 文件:

- `[U]` `google-generative-ai.ts` 的 API-key-only 行为、non-Vertex client construction、`streamSimple` 必需 API key、以及 Gemma 4 thinking-level 特例需要在 `subsys.ai.google-generative-ai` 或该文件 source 中单独核验。
- `[U]` `env-api-keys.ts` 中 `GOOGLE_CLOUD_API_KEY` 的 provider env 映射、ADC readiness 检测、以及 `"<authenticated>"` marker 返回条件需要在 `subsys.ai.env-api-keys` 或该文件 source 中单独核验。

## ai-image-generation

# uncertainty: subsys.ai.image-generation

- [U] 当前节点按任务指定 source 只核了 `packages/ai/src/images-models.ts`、`packages/ai/src/images.ts`、`packages/ai/src/providers/openrouter-images.ts`。从这些文件能确认 `openrouterImagesProvider()` 这个内置 image provider binding,但未在本节点内核完整 builtin registration 是否只包含 OpenRouter;若 L2 需要断言“唯一内置 image provider”,应追加核 `packages/ai/src/providers/images/register-builtins.ts` 与相关 registry 文件。

## ai-image-models

# uncertainty-ai-image-models

- [U] `openrouter/auto` 在 generated catalog 中声明 `cost.input=-1000000` 和 `cost.output=-1000000`,但本轮只从指定 source 核到数值本身,没有核到负数成本的产品语义或上游约定。证据: [E: packages/ai/src/image-models.generated.ts:272] [E: packages/ai/src/image-models.generated.ts:273]

## ai-lazy-loading

# uncertainty-ai-lazy-loading

本轮填充 `subsys.ai.lazy-loading` 未新增 `[U]`。动态 import 的具体 specifier 位于各 `api/<name>.lazy.ts` wrapper,而本节点 frontmatter source 只覆盖 `packages/ai/src/api/lazy.ts`;因此节点把“provider-specific wrapper 通常传入 dynamic import loader”和“wire protocol dispatch 先选中 `ProviderStreams` 再进入 lazy wrapper”标为 `[I]`。

L2 verifier: 已按 `pi/packages/ai/src/api/lazy.ts` 的实际行号逐条核验 `[E]`。修正点:

- 将“本文件不实现 provider-specific payload / event normalization”的负向结论拆为 `[I]`,保留 `lazyStream` / `lazyApi` 签名作为 `[E]`。
- 将 setup error message 的 “没有 content” 修正为源码可核的 `content: []`。
- 将动态导入、auth/setup 边界、host import cache dedupe 等注释-only 说明降级为 `[I]`;可核的 `load()` / 转调 / error event 仍落到实际代码行。

未发现需要降级为 `[U]` 的断言;节点已标记 `status: verified`。

## ai-message-transform

# uncertainty: subsys.ai.message-transform

L2 核验后 `subsys.ai.message-transform` 未保留 `[U]`。已收紧两处表述:thinking 空内容补充同模型 `thinkingSignature` 豁免,`thoughtSignature` 删除逻辑去掉未由本文件直接证明的 provider 归属描述。核心行为均可落到 `packages/ai/src/api/transform-messages.ts`;provider wire 前的边界用调用该函数的 serializer 行作为代表性证据,更完整的 dispatch 表留给 `subsys.ai.wire-protocol-dispatch` / wire catalog 节点。

## ai-mistral-conversations

# uncertainty: subsys.ai.mistral-conversations

L2 核验后,`subsys.ai.mistral-conversations` 未新增需要上卷到 `reference/uncertainty.md` 的 `[U]`。已把少数过强的 `[E]` 表述收紧为源码行可直接支撑的描述;边界和未调用 `onResponse` 等无法由单一显式语句证明的结论仍在节点正文标为 `[I]`。

## ai-model-catalog

# uncertainty-ai-model-catalog

- L2 verified `ref.ai.model-catalog` against current `pi/packages/ai/src/models.generated.ts` import expansion: 35 provider buckets, 1019 expected model instances, 1019 Markdown rows, 0 missing, 0 extra, 0 duplicate, 0 identity/field drift for id/name/provider/api/context/cost/reasoning/input.
- L2 verified `[E]` references: 17161 total refs, 16139 unique refs, 37 source files, 0 missing paths or out-of-range lines; row evidence labels checked against 16046 cited source lines with 0 mismatches.
- L3 lint fix: generated-file header comments in `ref.ai.model-catalog` now use path-level evidence markers instead of line-level evidence anchors.
- [U] `index.json` still lists `group.models.instance_count` as `200`, but current `MODELS` import expansion produced `1019` rows for this node. I did not update `index.json` because this task requested only the catalog node and this staging file.

## ai-model-discovery

# uncertainty-ai-model-discovery

L2 核验后 `subsys.ai.model-discovery` 保留 1 条 `[U]`:

- `docs/llm-wiki/pi/index.json` 里 `subsys.ai.model-discovery.source` 只列 `packages/ai/src/models.generated.ts` 与 `packages/ai/src/models.ts`, 但本节点被要求覆盖的 `builtinModels()` / `getBuiltinModel()` 实现在 `packages/ai/src/providers/all.ts`, `Model` 字段定义在 `packages/ai/src/types.ts`, generated gotcha 的可执行入口在 `packages/ai/scripts/generate-models.ts` 与 `packages/ai/package.json`。本节点 frontmatter 暂列实际支撑源, index 元数据留待后续专门 reconcile。

降级或保留为 `[I]` 的主要结论:

- generated catalog 与 provider registry 当前相邻但非单一共享数据结构: 源码分别有 `Object.keys(MODELS)` 与 `builtinProviders()` factory array, 没有声明同步不变量。
- `getBuiltinModel()` runtime 可返回 `undefined`: 源码有 optional access 和 cast, 但 TypeScript 签名不表达 `undefined`。
- `calculateCost()` mutates same `usage.cost` object 的意图来自赋值与返回同一字段的实现形状, 源码没有单独设计说明。

L2 行号/可核性修正:

- 移除了指向 `models.ts` 注释行的 `[E]` 锚点, 改锚到 `api` 类型、`apiFor()`、`hasApi()` 和 `calculateCost()` 的实际代码行。
- 成本计算段删除了仅由注释命名的 "Anthropic-style" 表述, 保留公式可直接证明的 `1h cache writes at 2 * model.cost.input`。
- generated 文件只作为当前事实快照使用; 生成与更新入口由 `generate-models.ts` 写文件逻辑和 `package.json` script 支撑, 相关设计性判断继续标 `[I]`。

## ai-oauth-flow

# uncertainty-ai-oauth-flow

L2 verified with no unresolved `[U]` claims.

Corrections made in the node:

- Removed or downgraded all `[E]` claims that required files outside this node's source list (`auth/types.ts`, `auth/resolve.ts`, `models.ts`, `cli.ts`, `utils/oauth/types.ts`). The node now treats `OAuthAuth` and auth-resolution behavior as related-node boundary material rather than direct evidence in this L2 pass.
- Replaced the broad token/auth-resolution sections with source-scoped registry, device-code, PKCE, and deprecated wrapper facts.
- Kept provider-neutral/helper-boundary statements as `[I]` when they depend on absence of provider-specific endpoint logic or cross-file design interpretation.
- Set node status to `verified`; remaining explicit evidence points only at `packages/ai/src/utils/oauth/index.ts`, `packages/ai/src/utils/oauth/device-code.ts`, and `packages/ai/src/utils/oauth/pkce.ts`.

## ai-openai-codex-responses

# Uncertainty: subsys.ai.openai-codex-responses

L2 verified with no unresolved `[U]` claims. Corrections made in the node:

- Tightened line anchors for `RequestBody`, cached WebSocket continuation, SSE retry/timeout behavior, stream event normalization, WebSocket idle-timeout failure, and the ordinary OpenAI Responses system-prompt comparison.
- Narrowed the WebSocket fallback claim: non-connection-limit Codex API/protocol errors are thrown, while connection-limit-before-start has its own retry/fallback path.
- Narrowed the cached-context gotcha: explicit `transport: "auto"`/`"websocket-cached"` enables `useCachedContext`, but actual delta rewriting requires compatible continuation state; an unset transport only defaults the outer WebSocket-vs-SSE selection.

Remaining `[I]` markers are boundary/rationale statements rather than unverifiable facts: node ownership vs shared normalizer coverage, session-resource ownership semantics beyond the local registration call, absence-style comparisons with ordinary OpenAI Responses, and cross-node scope boundaries.

## ai-openai-completions

# uncertainty: subsys.ai.openai-completions

本轮已按指定 source 核对 Chat Completions 入口、请求字段、stream chunk 解析、tool call/event/usage 转换和 Responses shared 边界,未留下需要 lead 处理的 blocker。

L2 verifier 修正了三处过宽 [E]:assistant 历史 content 增补 `requiresThinkingAsText` 例外,thinkingSignature 增补 `opencode-go` 字段归一化,Responses shared tool call id 边界增补 allowed-provider/pipe-id 条件。节点已置为 verified。

## ai-openai-responses

# uncertainty-ai-openai-responses

- `subsys.ai.openai-responses`: service tier cost multiplier 在 `packages/ai/src/api/openai-responses.ts` 中硬编码为 flex `0.5`、priority `2` / `2.5`,但本轮未核 OpenAI 外部价格表或项目设计文档,因此只能证明代码行为,不能证明价格策略仍与上游计费一致。[U]

## ai-prompt-caching

# uncertainty: subsys.ai.prompt-caching

本轮未登记 `[U]`。

- 本节点没有把 `packages/ai/src/api/openai-responses.ts` 并入 frontmatter `source`,因为 index 中本节点 source 只列出 `openai-prompt-cache.ts` 与 `anthropic-messages.ts`。OpenAI Responses 的具体 payload 调用点在正文中作为相关节点边界处理,不作为本节点的权威源。[I]

## ai-provider-catalog

# uncertainty-ai-provider-catalog

- L2 provider-catalog 核验结论: `reference/provider-catalog.md` 已按 `packages/ai/src/providers/all.ts` 的 `builtinProviders()` return array 覆盖 35 个文本 provider factory call, 表格顺序对应 `all.ts:72-106`, 节点正文不再保留旧 `~38` / `38` 数量口径。
- 外部 index 漂移仍未在本批次修改: `docs/llm-wiki/pi/index.json` 里 `ref.ai.provider-catalog` 标题仍是 `provider 完整目录(~38)`, `group.providers.instance_count` 仍是 `38`; 当前任务限定只改 provider-catalog 节点与本 staging 文件。

## ai-provider-registry

# uncertainty-ai-provider-registry

本轮填充 `subsys.ai.provider-registry` 新增 1 条 `[U]`:

- `docs/llm-wiki/pi/index.json` 里 `group.providers.instance_count` 与 `ref.ai.provider-catalog` 标题仍暗示约 38 个 provider, 但当前源码 ground truth `packages/ai/src/providers/all.ts` 的 `builtinProviders()` 只返回 35 个 factory call；`packages/ai/src/models.generated.ts` 的 generated provider key 数也为 35。按 conventions 第 7 节, 本节点采用 `builtinProviders()` 的 35 作为当前事实, catalog/index 计数留待后续专门 reconcile。

降级为 `[I]` 的主要结论:

- `builtinProviders()` 每次调用构造 fresh provider instances: 源码显示直接调用 factories, 但“fresh”语义跨入各 provider factory 的实现。
- `builtinProviders()` 与 generated `MODELS` 当前数量一致不构成 API 契约: 这是本轮人工对照, 源码没有写同步不变量。
- provider catalog 应以 `builtinProviders()` 做 membership, 以 generated model catalog 做 cross-check: 这是 conventions ground-truth 约定加当前代码结构推出。

## ai-session-resources

# Uncertainty: subsys.ai.session-resources

No unresolved `[U]` claims after L2 verification.

Inferred boundaries checked during L2:

- The registry itself has no per-session keying beyond passing `sessionId` into callbacks; this is inferred from the module-scope `Set<SessionResourceCleanup>` and the absence of any session map in `packages/ai/src/session-resources.ts`.
- `cleanupSessionResources(undefined)` only becomes "close all Codex WebSocket sessions" for Codex because `closeOpenAICodexWebSocketSessions` implements that behavior; the generic registry does not define that policy.
- The lifecycle ownership is cross-package: `pi-ai` owns the registry, while the visible session-lifecycle call site is `AgentSession` in `pi-coding-agent`.

## ai-wire-protocol-catalog

# uncertainty: ref.ai.wire-protocol-catalog

L2 核验后,`ref.ai.wire-protocol-catalog` 未新增需要上卷到 `reference/uncertainty.md` 的 `[U]`。9 个 chat/text wire protocol key 已逐实例对齐 `KnownApi`、对应 `*.lazy.ts` wrapper、`ProviderStreams` 的 `stream` / `streamSimple` contract,以及 `lazyApi()` 对两种调用的委托;`openrouter-images` 已收紧为 image-only contract 后再推断排除。lazy wrapper 到 subsystem 节点的映射属于 wiki 组织映射,仍在节点表格中标为 `[I]`。

## ai-wire-protocol-dispatch

# uncertainty: subsys.ai.wire-protocol-dispatch

L2 核验后未新增 `[U]`。核心 dispatch 结论可落到 `models.ts`、`api/lazy.ts`、`types.ts` 及代表性 `api/<name>.lazy.ts` / `api/<name>.ts` 源码。

本轮将以下过度外推从硬 `[E]` 收紧为 `[I]` 或补充更精确证据:

- dispatch 层“不构造 payload / 不做 event normalization”属于由 `ProviderStreams` contract 推出的职责边界,已拆成 contract `[E]` + 边界判断 `[I]`。
- `lazyStream` 对 caller 失败形态的影响、README/provider 名称不是 ground truth、下游 agent/coding-agent 不绕过 `Models` 的边界判断,均按推断标为 `[I]`。
- `StreamFunction` 函数形状改用 type alias 与事件协议代码行支撑;`ProviderStreams` module 注释不再作为 `[E]` 行号使用;message transform 调用点补充了更精确行号。

## batch-aa

# Batch AA uncertainties

- `ref.ai.image-models`: `openrouter/auto` still uses `-1000000` for both image-model `cost.input` and `cost.output`; the catalog records the source values but does not infer product semantics for negative cost.
- `ref.coding-agent.extension-events`: `index.json` still lists `group.extension-events.instance_count` as 29, while current `ExtensionEvent` / `ExtensionAPI.on(...)` source exposes 31 event names including `session_info_changed`.
- `ref.coding-agent.env-vars`: this catalog remains scoped to coding-agent plus directly consumed `pi-ai` provider env channels; `packages/orchestrator` `PI_ORCHESTRATOR_*` / Radius env and TUI-only debug env are intentionally outside this node's authority.
- `ref.coding-agent.config-keys`: `index.json` still lists `group.config-keys.instance_count` as 50, while current `Settings` + nested leaves + `PackageSource` object keys produce 72 catalog rows after adding `outputPad`.
- `ref.coding-agent.config-keys`: `terminal.showTerminalProgress` is present in `SettingsManager` but still absent from `packages/coding-agent/docs/settings.md`.
- `ref.interactive.components`: the catalog counts directory files, so whether `components/index.ts` should count as an instance or only barrel metadata remains a catalog-definition question.
- `ref.interactive.components`: `ConfigSelectorComponent`, `CountdownTimer`, `EarendilAnnouncementComponent`, and `session-selector-search.ts` have real callers but are not exported by `components/index.ts`; this looks internal-only but needs maintainer/API-policy confirmation.
- `ref.interactive.components`: `ShowImagesSelectorComponent`, `ThemeSelectorComponent`, and `ThinkingSelectorComponent` remain public exports, but current main interactive mode does not directly import them; they may be compatibility surface or residual UI.

## batch-ab

- `ref.ai.model-catalog`: `packages/ai/src/models.generated.ts` at pi HEAD `8c943640` enumerates 1034 text model instances, while `index.json` still records `group.models.instance_count: 1019`. `index.json` is outside this batch's allowed write scope.
- `ref.coding-agent.rpc-methods`: `RpcCommand` and `handleCommand()` at pi HEAD `8c943640` cover 31 ordinary RPC commands, while `index.json` still records `group.rpc-methods.instance_count: 29`. `extension_ui_response` remains excluded from the command catalog.
- `ref.coding-agent.rpc-methods`: `packages/coding-agent/docs/rpc.md` still documents `get_commands` response examples/fields with top-level `location` and `path`, but `RpcSlashCommand` and `rpc-mode.ts` emit `sourceInfo` instead.

## batch-ae

# Uncertainty staging - batch ae

- `subsystems/ai/google-vertex.md`: `subsys.ai.env-api-keys` credential discovery details require that node's own source; the Vertex node only verifies how `google-vertex.ts` consumes already-resolved values, so this remains `[U]`.
- `subsystems/ai/model-discovery.md`: the current index entry mismatch noted in the node remains unresolved in this batch because the requested scope forbids editing `index.json`; the node keeps the reconciliation note as `[U]`.

## batch-ah

# Uncertainty batch ah

- `subsystems/coding-agent/settings-manager.md`: `CONFIG_DIR_NAME` 的字面值来自 `packages/coding-agent/src/config.ts`, 本节点只把 `settings-manager.ts` 作为证据范围, 因此不在该断言里展开 `.pi` 字面值。
- `subsystems/coding-agent/settings-manager.md`: index.json 为本节点列出 `loadSettings`, 但当前 `packages/coding-agent/src/core/settings-manager.ts` 没有 `loadSettings` 函数或 export; 实际读取路径是 private static `loadFromStorage()` 与 `tryLoadFromStorage()`。
- `subsystems/coding-agent/settings-manager.md`: index.json 为本节点列出 `deepMergeSettings`, 当前源码确有 `function deepMergeSettings(...)`, 但它不是 `export function`; 如果 symbols 语义要求 exported symbol, 这里与源码不一致。

## batch-aj

- `surface/misc/images.md`: this node verifies the `ImageContent` input path and image model catalog boundaries, but it does not enumerate which chat/text models support image input; that remains owned by `ref.ai.model-catalog` and is kept as `[U]`.
- `surface/misc/security.md`: this node verifies CLI/RPC HTTP dispatcher setup, but it does not prove every provider/network call path uses that dispatcher; the network-isolation claim is kept narrower and the unresolved provider coverage remains `[U]`.

## coding-agent-agent-session

# uncertainty-coding-agent-agent-session

本轮没有需要降级为 U 级的断言。跨包节点的职责说明只根据 `packages/coding-agent/src/core/agent-session.ts` 的 import、config、调用点和 index.json 的 related id 做了 `[I]` 标注, 未写成 ground-truth 事实。

## coding-agent-auth-storage

# Uncertainty · subsys.coding-agent.auth-storage

- [U] `index.json` lists `saveApiKey` as a symbol for `subsys.coding-agent.auth-storage`, but `packages/coding-agent/src/core/auth-storage.ts` and `packages/coding-agent/src/core/auth-guidance.ts` do not define or export `saveApiKey`. Current source exposes generic `AuthStorage.set(provider, credential)` and callers can store `{ type: "api_key", key }`.
- [I] `getAuthStatus()` reports runtime/environment auth with `configured: false` while `hasAuth()` treats runtime override and environment key as usable auth. This likely separates persisted credentials from transient/fallback sources, but the two source files do not document the intended UI semantics.
- [I] The sync lock retry loop uses a busy wait to keep the backend interface synchronous. That behavior is visible in code, but the design motivation is inferred from the inline comment and method shape rather than a design doc.

## coding-agent-config-resolution

# uncertainty: subsys.coding-agent.config-resolution

本轮未留下需要上卷到 `reference/uncertainty.md` 的 `[U]` 项。节点中关于 resolver 适用场景、缓存意图、空字符串语义和跨节点职责边界的解释已降级为 `[I]`; 可直接核验的解析、执行、缓存、路径和 header 行为均就近标了 `[E]`。

## coding-agent-event-bus

# uncertainty-coding-agent-event-bus

- [I] event-bus 被描述为 inter-extension communication / side channel: `ExtensionAPI.events` 类型注释和 loader 注入路径可证, 但 core event-bus 文件本身没有写产品命名。
- [I] event-bus 被描述为不适合同步 ack、ordered mutation 或 block/transform/cancel 工作流: API 返回 `void` 且没有 result aggregation, 但这是从接口形状和 ExtensionRunner 对比推导出的设计边界。
- [I] publisher 不能等待所有 async listeners 完成: `emit()` 不返回 Promise, wrapper 虽然 `await handler(data)`, 但 Node EventEmitter 的 promise return 没被 event-bus API 暴露。
- [I] channel namespace、payload schema 和 versioning 由 extension 作者约定: channel/payload 类型是 `string`/`unknown`, 但源码没有直接讨论 naming convention。
- [I] package root export 使外部 embedding/test code 可以构造或传入 bus: export 可证, 具体调用场景未在本节点 source 中逐一核验。

No unresolved [U] items found while reading the listed source files and immediate call sites.

## coding-agent-extension-loader

# uncertainty-coding-agent-extension-loader

节点: `subsys.coding-agent.extension-loader`

## [U]

- 无。

## [I]

- `discoverAndLoadExtensions` 更像 low-level discovery API 和测试入口, 当前 product reload 主路径更多依赖 package-manager/resource-loader 产出的 resolved paths。
- loader/runtime split 的设计意图是把 extension declaration phase 与 session-bound action phase 分开。
- cwd-scoped factory cache 的风险控制目标是避免跨 cwd 污染和 reload 后陈旧 import。

## coding-agent-extension-runner

# uncertainty-coding-agent-extension-runner

本轮新增需要上收 `reference/uncertainty.md` 的 `[U]` 项:

- `subsys.coding-agent.extension-runner` 的 index symbol 写作 `emitProjectTrust`, 但当前源码导出名是 `emitProjectTrustEvent`;需要确认 index symbol 是否允许简称, 还是应协调修正为源码导出名。
- `ExtensionRunner.emitToolCall()` 没有 try/catch, 与多数专用 emitter 和通用 `emit()` 的 error-to-`emitError()` 模式不同;当前源码未直接说明这是刻意的 fail-closed 行为还是遗漏。

本轮主要 `[I]` 降级:

- loader/resource loader/session 对 runner 的接入边界, 因本节点 Sources 只保留 index 指定的 `runner.ts`, 跨文件调用点只作结构推断。
- declarative contribution phase 与 bound runtime phase 的设计动机, 由 `bindCore()` 的 runtime copy 和 provider flush 行为推出。
- 不同专用 emitter 存在是为了表达不同 combination policy, 由各 emitter 的控制流差异推出。

## coding-agent-extension-wrapper

# Uncertainty · coding-agent extension-wrapper

本节点未留下 `[U]`。

- `[I]` 降级项主要是设计动机和边界推断: `sourceInfo` 保留在 definition registry、wrapper 每次 execute 创建 context 的动机、extension/custom 对 built-in 的覆盖含义、SDK custom tools 复用 `wrapRegisteredTools()` 的解释。
- 这些 `[I]` 均有相邻代码证据, 但源码没有直接写成产品设计说明, 所以未提升为纯 `[E]`。
- 本轮复核校准了少量 `[E]` 行号: event interception 的文件头注释、`ToolDefinition` 的 UI 字段、`createContext()` getter/assertActive/call-time 注释均已改到实际承载行;未新增 `[U]`。

## coding-agent-footer-data-provider

# uncertainty: coding-agent footer-data-provider

本轮填充 `subsys.coding-agent.footer-data-provider` 时发现 1 个需要保留为 `[U]` 的源码不确定项:

- `.invalid` branch name 的外部来源未在 `packages/coding-agent/src/core/footer-data-provider.ts` 中解释。源码能确认 `.invalid` 会 fallback 到 `git symbolic-ref --quiet --short HEAD`, fallback 失败时返回 `"detached"`, 但不能仅凭本文件确认是谁或哪种 git backend 会把 `HEAD` branch 写成 `.invalid`。

保留为 `[I]` 的内容主要是设计层推断: lazy sync branch cache + debounced async refresh 的 UI 目的、watch directory/WSL polling/reftable watcher 的兼容性取舍、read-only provider 对 extension footer component 的能力边界、live map view 的调用方影响、available provider count 的语义正确性来自调用方, 以及 interactive orchestration planned 节点应覆盖的调用侧 wiring。

## coding-agent-html-export

# uncertainty-coding-agent-html-export

- `exportHtml` 在 index.json 的 symbols 中列出,但当前源码导出的函数名是 `exportSessionToHtml` 和 `exportFromFile`;RPC client/mode 使用 `exportHtml` / `export_html` 作为协议方法名。节点将 `exportHtml` 保留在 frontmatter 以匹配 index.json,正文按实际源码函数名讲解。[U]
- `getExportTemplateDir()`、`template.html`、`template.css` 和 `template.js` 对最终浏览器端渲染很关键,但 node 109 的 index source 只列出 `core/export-html/index.ts`、`ansi-to-html.ts`、`tool-renderer.ts`。节点只把这些作为 Sources,入口/模板行为仅在必要处引用邻近源码。[I]
- `../../../pi` 从当前工作目录 `/Users/makii/Project/Agent_Wiki` 不存在;实际源码仓库位于 `/Users/makii/Project/Agent_Wiki/pi`,本节点 `updated` 使用 `git -C pi rev-parse --short HEAD` 得到的 `5a073885`。[U]

## coding-agent-http-dispatcher

# uncertainty: subsys.coding-agent.http-dispatcher

本轮没有新增 `[U]`。

降级为 `[I]` 的点:

- `http-dispatcher.ts` 与 `pi-ai` wire protocol dispatch 的运行时关系:source file 只显示 undici/global HTTP bootstrap,没有直接 import `pi-ai`。
- `applyHttpProxySettings()` 与 `EnvHttpProxyAgent` 组合成产品 proxy config 到 dispatcher 的桥接路径:代码可证明 env 写入和 agent 类型,但 `EnvHttpProxyAgent` 读取 env 的行为来自 undici 外部语义。
- `configureHttpDispatcher()` 调用 `undici.install?.()` 的深层动机:源码注释提到 Node 26.0 bundled fetch/compressed response 兼容性,但可执行锚点只能证明 conditional install。
- `parseHttpIdleTimeoutMs()` 与 `configureHttpDispatcher()` 的分层设计意图:代码可证明 parser 返回 `undefined`、bootstrap 抛错,设计意图属于推断。
- timeout `0` 的 disabled 语义:本 source file 把 disabled 解析为 `0` 并传给 undici timeout 字段,但 `0` 的具体 transport 行为依赖 undici。
- SDK embedding caller 会受到 process/global HTTP bootstrap 影响:related 来自 index,影响范围来自 global dispatcher/fetch 语义推断。

## coding-agent-interactive-orchestration

# uncertainty-coding-agent-interactive-orchestration

本节点没有新增 `[U]`。

保留的 `[I]` 主要是边界性归纳, 用于把源码事实压成 wiki 检索语义:

- `startup-ui.ts` 是 pre-session UI, `InteractiveMode` 是 session-bound UI host。
- `init()` 先启动 TUI 再 bind extensions 的动机是让 extension `session_start` handler 能使用 interactive dialogs。
- slash commands 不经过 `getUserInput()` 的普通 prompt queue。
- idle submit callback queue 的作用是解耦 editor submit timing 和 agent prompt loop。
- resources container 与 chat container 分离, 用于让 reload/resources diagnostics 与 restored session messages 分层显示。
- persisted session restore 能重建 inline tool UI, 不只回放 plain messages。
- shutdown 的两个分支体现 terminal restore 与 extension shutdown 的 ordering tradeoff。
- related 节点目前是 planned;跨包边界对其职责范围的描述是按 index title/source/symbols 推断。

## coding-agent-keybindings

# Uncertainty · coding-agent keybindings

- [U] `index.json` node `subsys.coding-agent.keybindings` lists symbols `DEFAULT_APP_KEYBINDINGS` and `DEFAULT_EDITOR_KEYBINDINGS`, and `conventions.md` section 7 also names those as keybinding ground-truth symbols. At pi HEAD `5a073885`, `packages/coding-agent/src/core/keybindings.ts` instead exports `KEYBINDINGS`, `migrateKeybindingsConfig`, `KeybindingsManager`, and type re-exports; neither planned symbol appears in the source. The node frontmatter uses current source symbols and the body calls out the mismatch rather than editing `index.json`.

## coding-agent-migrations

# uncertainty-coding-agent-migrations

本节点没有新增 `[U]`。保留的 `[I]` 都是从 `packages/coding-agent/src/migrations.ts` 行为推导出的设计动机、调用方责任或跨节点边界说明。

## coding-agent-model-registry

# uncertainty-coding-agent-model-registry

本轮填充 `subsys.coding-agent.model-registry` 新增 1 条 `[U]`:

- `AuthStorage.getAuthStatus()` 在命中 `runtimeOverrides` 时返回 `{ configured: false, source: "runtime", label: "--api-key" }`; `ModelRegistry.getProviderAuthStatus()` 会直接返回这个状态。源码能证明该返回值, 但本节点没有继续追 UI/CLI 对 `configured=false + source=runtime` 的解释, 所以“不把 runtime key 视为 configured”是否为有意语义暂存为 `[U]`。

降级为 `[I]` 的主要结论:

- `modelRequestHeaders` 把 `models.json` / dynamic provider 的 headers 留到 request-time resolution, likely 是为了避免把 unresolved secret-bearing header templates 暴露在 `Model<Api>` metadata 里；源码能证明存储与合并路径, 但没有写设计说明。
- `getAvailable()` 是 fast availability filter 而非最终 request-auth proof；源码能证明它只调用 `hasConfiguredAuth()`, 但“proof”这个边界是由后续 `getApiKeyAndHeaders()` 可能失败推出来的。
- 当前 `ModelRegistry` 像是 coding-agent 的 product-level compatibility/assembly layer over compat imports, 而 `packages/ai/src/models.ts` owns newer provider stream/auth contracts；这是由 import/call graph 推断, 不是源码注释中的正式架构声明。
- `authHeader: true` 同时返回 `apiKey` 并写入 `Authorization` header, downstream 是否使用两者取决于调用路径和 wire API, 本节点只记录 registry result shape。

## coding-agent-model-resolver

# uncertainty: coding-agent model resolver

- 当前节点没有新增 [U] 条目。`findInitialModel()` docblock 中的 session restore 描述与当前实现拆分存在轻微漂移, 但源码可证明 restore 已由 `restoreModelFromSession()`/SDK 相邻流程承担, 节点正文按 [I] 处理而非 [U]。

## coding-agent-package-manager

# uncertainty: coding-agent package-manager

## subsys.coding-agent.package-manager

- [I] `PackageSource` 的完整 public settings schema 不在本节点 index source 的两个文件中定义;本节点只从 `package-manager.ts` 的 import、string/object 分流和 `PackageFilter` 使用推断 object filter 语义,完整字段解释应由 `surface.misc.packages` 或 settings/catalog 节点覆盖。
- [I] package-manager 与 resource-loader 的职责边界来自 `PackageManager.resolve()`/`resolveExtensionSources()` 的返回形状和 `DefaultResourceLoader` 已有节点,本节点未重新引用 resource-loader 源文件以保持 source 范围只覆盖 index 指定文件。
- [U] 无。当前节点没有必须写入 central `reference/uncertainty.md` 的未知项。

## coding-agent-resource-loader

# uncertainty-coding-agent-resource-loader

- [I] resource-loader 被描述为 aggregation/orchestration layer: 代码可证它组合 package manager、extension/skill/prompt/theme loaders 和缓存 getter, 但源码没有直接使用这个命名。
- [I] getter 被描述为不触发新 filesystem scan: 代码可证 getter 只返回字段, 但没有测试文件在本节点 source 列中专门断言该行为。
- [I] order 会影响最终 loader 输入顺序: `mergePaths()` 保留第一次出现路径并按输入顺序 push, 但具体 precedence 的用户可见语义还需要结合 package-manager 和 downstream loaders 验证。
- [I] override hooks 被描述为 injection seam: options 和应用位置可证, 但本节点未读取调用方或测试来确认主要用途。
- [I] `getDefaultSourceInfoForPath()` fallback 对不存在路径可能 throw: 代码中 fallback 直接 `statSync(normalizedPath)`, 但通常是否可达取决于上游 metadata/path validation。

No unresolved [U] items found while reading the listed source files.

## coding-agent-session-manager

# uncertainty: subsys.coding-agent.session-manager

本轮填充 `subsys.coding-agent.session-manager` 未新增 `[U]`。

保留为 `[I]` 的主要边界判断:

- `SessionManager` 的 append-only tree 设计解释来自源码注释、`leafId` 推进和 branch 只移动 leaf 的组合;源码能证明实现事实,但“为何这样设计以保留候选路径”属于结构性解释。
- 延迟写入策略的效果“减少只有 header 或首条用户消息的 session 文件”来自 `_persist()` 的 no-assistant guard 和 `createBranchedSession()` 注释;这是对行为影响的归纳,不是单独的产品需求声明。
- resume list 的 `modified` 更贴近会话 activity 而非文件 mtime,来自 `buildSessionInfo()` 对 message timestamp/header timestamp/stats.mtime 的优先级;“更贴近”是解释性语言。
- 与 `surface.sessions.management`、`subsys.agent-core.jsonl-storage`、`ref.coding-agent.session-format` 的分工来自 wiki index 和源码边界,不是单个 source 文件中的 runtime contract。

## coding-agent-session-runtime

# uncertainty: subsys.coding-agent.session-runtime

本轮没有保留 unknown-level uncertainty 条目。所有非显然事实已在节点正文内锚到源码, 或在跨文件意图/权衡处降级为 inference-level 标记。

## coding-agent-session-services

# uncertainty: coding-agent session-services

本轮填充 `subsys.coding-agent.session-services` 时未发现需要升级为 `[U]` 的源码不确定项。

保留为 `[I]` 的内容主要是设计层推断: services/session factory 拆分的意图、diagnostics 由 caller 决定如何展示或中止、`resourceLoaderOptions` omit 字段带来的自定义边界、boolean extension flag 表达 presence、`pendingProviderRegistrations` 清空后的复用注意点、以及 `pi-agent-core` 在本文件中仅作为 `ThinkingLevel` 类型边界出现。

## coding-agent-settings-manager

# uncertainty: coding-agent settings-manager

- `subsys.coding-agent.settings-manager` 的 index symbols 包含 `loadSettings`, 但 `packages/coding-agent/src/core/settings-manager.ts` 当前没有 `loadSettings` 函数或 export; 实际读取 helper 是 private static `loadFromStorage()` 与 `tryLoadFromStorage()`。
- `subsys.coding-agent.settings-manager` 的 index symbols 包含 `deepMergeSettings`; 源码确有 `function deepMergeSettings(...)`, 但它不是 exported symbol。如果 wiki 的 `symbols` 语义必须是导出符号, 这里需要后续 reconcile index 或源码。
- 本节点只按 source 列表读取 `packages/coding-agent/src/core/settings-manager.ts`; `CONFIG_DIR_NAME` 的字面值、config resolution 细节、settings 用户文档默认值需要在对应 related/catalog 节点中核对。

## coding-agent-system-prompt

# uncertainty: subsys.coding-agent.system-prompt

本轮 L2 复核 `subsys.coding-agent.system-prompt` 未新增 `[U]`。

降级为 `[I]` 的点:

- `BuildSystemPromptOptions` 只消费已准备好的资源、不负责磁盘加载:由 options 字段与 `AgentSession._rebuildSystemPrompt`/`DefaultResourceLoader` 调用关系推出。
- bash-only file operation guideline 是能力替代 guideline、不是 tool registry 注册逻辑:由 `buildSystemPrompt` 中 guideline 条件推出。
- CLI prompt 参数“具体内容仍由 resource loader 解析后交给 builder”:由 `parseArgs`、`DefaultResourceLoader` 和 `AgentSession._rebuildSystemPrompt` 串联推出。
- `pi-agent-core` 消费 prompt、`pi-coding-agent` 负责产品 prompt 内容:由 `AgentHarness` systemPrompt 输入与 coding-agent builder 的跨包关系推出。
- prompt templates 展开 user prompt text,不等同于 system prompt append source:由 `expandPromptTemplate` 调用位置推出。

L2 复核中修正了一批落在注释行或承载不足行的 `[E]` 引用,并补强 `DefaultResourceLoader` prompt source / append source 解析的代码行。没有需要上卷到 `reference/uncertainty.md` 的 unknown。节点已置 `status: verified`。

## coding-agent-telemetry

# uncertainty-coding-agent-telemetry

本轮未新增需要上卷到 `reference/uncertainty.md` 的 `[U]` 项。

## Notes

- `telemetry.md` 中涉及调用边界与设计动机的非源码直述内容已降级为 `[I]`。

## coding-agent-theme-controller

# uncertainty: coding-agent theme-controller

- 暂无 `[U]`: `index.json` 中的 source 文件均存在, `InteractiveThemeController` 与 `detectTerminalThemeForAuto` 均能在当前源码中核到。
- 本节点保留若干 `[I]`: cross-package wiring、preview state implication、持久化策略意图、global symbol 设计意图等属于从相邻代码行为归纳的解释, 未升级成源码显式声明。

## coding-agent-trust-manager

# uncertainty-coding-agent-trust-manager

本轮新增需要上收 `reference/uncertainty.md` 的 `[U]` 项:

- 无。当前节点中没有保留无法由源码或明确推断支撑的 `[U]`。

本轮主要 `[I]` 降级:

- `normalizeCwd()` 的具体 symlink/case canonicalization 语义来自 `utils/paths.ts`, 但本节点 Sources 只保留 index 指定的 trust source files, 因而只把它描述为 path normalization 边界。
- parent-folder trust option 的产品意图、拒绝 trust 的较窄粒度、sorted JSON 便于 diff/排查, 都是由 update/write 控制流推出的设计含义。
- `resolveProjectTrusted()` 的 override chain 命名、non-interactive `ask` 的 fail-closed 表述, 以及 extension runner / loader 的职责边界, 都由当前两个 source files 的调用顺序和 imports 推断。

## orchestrator-config

# uncertainty-orchestrator-config

- `subsys.orchestrator.config`: `socket 与 JSON state 文件共享一个 orchestrator dir` 是源码明确事实,但“没有展示跨进程锁或迁移策略”只基于本节点 source 未见相关逻辑;真正的锁/清理语义需要 `subsys.orchestrator.ipc-transport` 和 storage 节点继续核验。[U]
- `subsys.orchestrator.config`: `rpc-stream` stdin loop 对无效 JSON line 的进程级表现未跑集成测试;源码显示 loop 内直接 `JSON.parse(line)`,但具体 unhandled exception/exit 行为需测试确认。[U]
- `subsys.orchestrator.config`: `isBunBinary` 对未来 Bun compiled binary virtual path 的兼容性未知;当前只能证实它匹配 `"$bunfs"`, `"~BUN"`, `"%7EBUN"` 三种字符串片段。[U]

## orchestrator-glossary

# uncertainty-orchestrator-glossary

Batch: orchestrator
Node: ref.glossary
Path: docs/llm-wiki/pi/reference/glossary.md

## [U] 待同步项

- 当前无阻塞 `ref.glossary` verified 状态的 unknown 条目。该节点是术语导览，不负责证明 package-internal、RPC/IPC、provider/model 或 orchestrator 细节；这些内容已在正文标为 `[I]` 并链接到对应权威节点。

## [I] 降级说明

- “Pi monorepo”是 wiki 对 README public package table 的组织性归纳；README 只直接列出 `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui` 四个包。
- “wire API” 是 wiki 术语；本轮限定 source 无法直证它对应 `Api` / `KnownApi` 字符串协议类型。
- “spine.overview 是背景入口”是 wiki 编排判断，不是 pi 源码自身概念。
- `pi-orchestrator`、IPC、Unix socket path、OrchestratorRequest、OrchestratorSupervisor、RPC stream bridge、Radius、serve lifecycle 等术语已作为导览 `[I]` 保留，并链接到 `ref.package-index` / `subsys.orchestrator.*` / `ref.orchestrator.ipc-messages` 等节点；不再因为 glossary 自身 source 只有 README/AGENTS 而登记为 unknown。
- Agent loop、Tool call、ModelRegistry、Provider、Skill、Slash command、RPC JSONL framing 等 package-internal 术语已作为导览 `[I]` 保留，并链接到对应 spine/surface/subsystem/reference 节点；不再作为 glossary 节点的 L2 阻塞项。

## orchestrator-instance-status

# uncertainty: ref.orchestrator.instance-status

L3 后本节点的权威范围已收窄到 `packages/orchestrator/src/types.ts` 与 `packages/orchestrator/src/config.ts`: `InstanceStatus` union、`InstanceRecord` interface 字段、以及 orchestrator 本地路径 helper。L2 中“153 条因不在 source 列而降为 unknown”的逐项噪音已移除;对应 storage/supervisor/README 行为不再在本 reference 节点重复证明。

## 仍保留的不确定项

- `InstanceRecord` 是否构成 `instances.json` 的完整 runtime schema、是否有 migration/locking/validation 语义,不能仅由 `types.ts` 与 `config.ts` 证明;需要在 `subsys.orchestrator.storage` 或 storage 源码范围内复核。[U]
- `starting`、`online`、`stopping`、`stopped`、`error` 的写入点、状态迁移和 restart recovery 行为,不能仅由 `InstanceStatus` union 证明;需要在 supervisor/storage 行为节点复核。[U]

## orchestrator-ipc-messages

# uncertainty-orchestrator-ipc-messages

本轮未留下需要上收 `reference/uncertainty.md` 的 `[U]` 项。

- `[I]` `status` 的具体取值未在 `ref.orchestrator.ipc-messages` 展开:当前节点只引用 `protocol.ts` 中 `InstanceStatus` 的导入与 `InstanceSummary.status` 字段,实例状态生命周期应由 orchestrator 实例/transport/supervisor 相关节点覆盖。
- `[I]` `parseRequestLine()` / `parseResponseLine()` 不做 runtime validation:源码显示仅 `JSON.parse` 后类型断言,但是否有调用方前置校验不属于本节点 source 列表。
- `[I]` `subsys.orchestrator.message-protocol` 的分工说明来自 index related 与本节点 catalog 定位,不是 `protocol.ts` 内部注释。

## orchestrator-ipc-transport

# uncertainty-orchestrator-ipc-transport

本轮独立复核后未留下需要升级到全局 `reference/uncertainty.md` 的 `[U]`。无法作为逐行源码事实承诺的内容均留在节点正文的 `[I]`: 主要是 Unix-style socket path 的平台边界、短连接/长流设计取舍、无 runtime schema validation 的影响、无 timeout/retry/backpressure policy 的调用方风险, 以及长期兼容性边界。

## orchestrator-message-protocol

# uncertainty · orchestrator message protocol

- 本轮未留下需要并入 `reference/uncertainty.md` 的 `[U]`。
- 有四类内容已降级或保留为 `[I]`:协议文件之外的职责边界推断,request `type` 名称对应的业务语义,`parseRequestLine()`/`parseResponseLine()` 缺少运行时 schema validation 的行为影响判断,以及 imported coding-agent payload 未在本协议文件内重定义的归纳。

## orchestrator-package-index

# uncertainty-orchestrator-package-index

本批次填充 `ref.package-index` 没有新增 `[U]`。

## 降级为 `[I]` 的判断

- `pi-coding-agent` 是把 runtime、provider 和 terminal UI 组合成产品 CLI 的 package：依赖关系可由 package metadata 直接核到，但“组合成产品 CLI”是基于 package description、dependencies 与 `spine.layered-architecture` 的归纳。
- `pi-tui` 的 `get-east-asian-width` / `marked` 分别对应 terminal width 与 Markdown rendering：依赖名和 entrypoint exports 可核到，但用途对应关系是语义归纳。
- 根 build 顺序与依赖方向相容：build script 与 package dependencies 可核到，但“相容”是跨文件推断。
- `pi-agent-core` 的 entrypoint 可支撑 `spine.layered-architecture` 中 reusable runtime API 面的归纳：导出项可核到，但与 spine 节点的对应关系不是本节点 source 直接事实。
- `pi-coding-agent` 的 entrypoint 可归纳为产品层 API 面：导出项和 CLI package description 可核到，但“产品层(product assembly)”是跨证据解释。
- `pi-orchestrator` 的 runtime model 可归纳为 experimental instance orchestration：experimental 标记与 serve/supervisor 行为可核到，但 “runtime model” 是对这些行为的概括。
- `spine.layered-architecture` / `spine.overview` 应如何使用本 catalog：这是 wiki 导览判断，不是单一源码事实。

## orchestrator-radius

# uncertainty-orchestrator-radius

- Radius 云端服务端如何展示、路由或 relay 已注册的 machine/Pi instance, 本地 `packages/orchestrator/src/radius.ts` 只能证明注册 payload 和 `relay: false`/`iroh: false`, 不能证明云端行为。[U]
- Radius OAuth credential 的刷新、过期处理和 scope 语义不在 orchestrator 源码中实现；本节点只能证明 `AuthStorage` 读取 provider `radius` 的 access token, 以及 `PI_RADIUS_API_KEY` fallback。[U]
- `isRadiusEnabled()` 只做本地 token/env 存在性判断, 不能证明 token 会被 Radius 云端接受；云端拒绝原因只能在后续 HTTP error 中表现。[U]
- `RadiusRegistration.expiresInMs` 在 type 中存在, 但当前本地 Radius client 没有使用它；是否由云端仅作提示或未来续约字段未在源码中说明。[U]

## orchestrator-request-handler

# uncertainty-orchestrator-request-handler

本轮没有留下需要上升为 `[U]` 的源码不确定项。

## 降级为 [I] 的推断

- request handler 与 IPC transport 的拆分动机来自 `serve()` 只传 handler object、`ipc/server.ts` 负责 JSONL/socket、`handler.ts` 只处理 typed request 的结构;源码没有设计说明,所以主节点标 `[I]`。
- `rpc_stream` 两步握手的动机来自 `handleIpcRequest()` 先回 `rpc_ready`、`ipc/server.ts` 再打开 stream 的控制流;源码没有注释说明,所以主节点标 `[I]`。
- 同一 stream 内 UI response 与 RPC command 分流的设计意图来自 `openRpcStream()` 的 branch 行为;源码没有注释说明,所以主节点标 `[I]`。
- experimental 稳定性可由 `packages/orchestrator/package.json` 的 description 核到;“不要假设 wire/API 已稳定”是文档层风险提示,所以主节点保留 `[I]`。

## orchestrator-rpc-spawner

# uncertainty-orchestrator-rpc-spawner

本轮没有需要上升为 `[U]` 的源码缺口;下列项目是节点正文中保留为 `[I]` 的推断或风险说明。

- `[I]` `surface.modes.rpc` 与 `subsys.orchestrator.rpc-spawner` 的边界:源码证明 orchestrator import coding-agent RPC 类型并通过 JSONL 驱动子进程,但边界归纳来自节点职责划分;protocol 细节不在本节点源码中展开。
- `[I]` experimental 稳定性: `packages/orchestrator/package.json` 明确 description 为 `experimental orchestrator package for pi`,节点把该包级描述降级为 subsystem 稳定性判断。
- `[I]` Bun binary 分支显式启动同目录 `pi` / `pi.exe` 并传 `--mode rpc`:源码给出 command/args,把它解释成“同目录 CLI binary”是路径构造语义。
- `[I]` Node/package 分支通过 `rpc-entry` 而不是 `getSpawnCommand()` 自身传 `--mode rpc`:已用 `rpc-entry.ts` 核到 entry 调用 `main(["--mode", "rpc", ...])`,但这是跨包入口语义归纳;因此节点正文只把“字面 `pi --mode rpc`”用于 Bun 分支。
- `[I]` stderrBuffer 增长、JSON.parse 未捕获、dispose 无 timeout、stray response 静默忽略等 gotcha:源码能核到对应代码路径,影响描述是风险推断。

## orchestrator-storage

# uncertainty: subsys.orchestrator.storage

本轮未新增 `[U]`。`storage.ts`、`config.ts`、`types.ts`、`supervisor.ts` 和 `packages/orchestrator/README.md` 足以核验 instance persistence 的文件格式、读写路径、upsert/remove 行为、路径依赖与 experimental 稳定性。

本轮改正/降级的内容主要是: 把 storage 只做本地 I/O 的概括标成解释性判断并把证据挪到实际读写行; 把 supervisor 调用证据挪到导入和调用行; 把 whole-file JSON array 的表述改成 load/get 读数组、save/upsert/remove 写回数组; 把 `upsertInstance()` 的“唯一键”降为源码可证的“匹配键”, 并明确它不清理既有重复 id; 把 `ensureOrchestratorDir()` 的保存路径证据挪到实际调用行; 把 session metadata “只在特定 RPC command 后刷新”改成 spawn 期间以及特定 RPC command 后刷新。

仍保留为 `[I]` 的内容主要是解释性判断: whole-file JSON array 是一种简化存储取舍; storage.ts 没有 process/subscription/status-transition 逻辑; `upsertInstance()` 不做 field-level merge; `removeInstance()` 对 persisted record 执行硬删除后 stopped record 不保留在 `instances.json`; `loadInstances()` 的 parse error 会传播; `saveInstances()` 未展示 temp-file rename、file lock、schema migration, 因而不宣称 crash consistency、多进程写入一致性或历史格式兼容性; `ref.orchestrator.instance-status` 承担状态语义 catalog, 本节点只覆盖落盘行为。

## orchestrator-supervisor

# uncertainty-orchestrator-supervisor

## 本轮 [U]

- 无。`subsys.orchestrator.supervisor` 中无法完全由 `packages/orchestrator/src/supervisor.ts` 单文件说明的 `--mode rpc`、IPC Unix socket、Radius enabled/registration 事实,已改用相邻源码文件落 `[E]`;对源码控制流含义的解释保留为 `[I]`。

## 本轮 [I]

- `recoverAfterRestart()` 不重建 RPC 子进程或 live map:源码只加载并保存 records、disconnect Radius,未出现 spawn/bind live process 的调用。
- `failSpawn()` 可能留下 `stopped` record:源码路径没有 `removeInstance()`;这是从 `setStatus()` 会 upsert 和 fail path 未删除 storage record 推导。
- `surface.modes.rpc` 是 orchestrator child process 的 headless host surface:该关系由 `rpc-process.ts` 的 spawn/stdin/stdout 与 coding-agent `rpc-mode.ts` 的 stdout event 输出共同推导。

## spine-agent-loop

# uncertainty: spine.agent-loop

- [I] `pi-coding-agent` 产品层如何装配 `Agent` runtime 未在本轮要求的 source 文件 `packages/agent/src/agent-loop.ts`、`packages/agent/src/agent.ts` 中直接出现；主节点只从 agent-core 注入点推断产品层应通过 state/tools/model/hooks/stream options 装配 runtime，未引用 coding-agent 具体文件。

## spine-compaction-flow

# uncertainty-spine-compaction-flow

## [U]

- 本轮未登记 `[U]`。`spine.compaction-flow` 中无法由两个 source 文件直接证明的调度/持久化边界已降级为 `[I]`,未写成确定事实。

## [I]

- `prepareCompaction` 不调用 `shouldCompact`,因此 automatic compaction 的 threshold gate 应由调用者完成。
- previous compaction summary 作为下一轮 update summary 的迭代输入。
- `compact` 返回 `CompactionResult`,但这两个 source 文件不负责把结果持久化为 session entry。
- `pi-coding-agent` 或其他产品层负责触发时机和持久化策略,本节点 source 只覆盖 `pi-agent-core` harness。

## spine-extension-lifecycle

# uncertainty: spine.extension-lifecycle

- resolved: 本轮已把 `packages/coding-agent/src/core/agent-session.ts`、`packages/coding-agent/src/core/resource-loader.ts`、`packages/coding-agent/src/core/sdk.ts`、`packages/agent/src/agent.ts`、`packages/agent/src/agent-loop.ts` 加入 `spine/extension-lifecycle.md` 的 frontmatter source 与 `## Sources`。
- resolved: 原 6 类产品层接入链路已转成正文精确 `[E: path:line]`: `AgentSession._buildRuntime`/`_bindExtensionCore`/`_applyExtensionBindings`, resource loader extension path loading, SDK `onPayload`/`onResponse`/`transformContext`, extension tool registry refresh, slash command merge, tool lifecycle hooks through agent loop。
- remaining: 无。

## spine-layered-architecture

# uncertainty · spine.layered-architecture

本轮未发现必须上报到全局 `reference/uncertainty.md` 的 `[U]`。

## 降级为 `[I]` 的推断

- `pi-agent-core` 的可复用边界不包含 `pi-coding-agent` 的 CLI mode、settings manager、resource loader 或 extension runner: 由 `packages/agent/src/index.ts` 的 public exports 与 `packages/coding-agent/src/core/agent-session.ts` 的 product imports/config 对照推出。
- `AgentSession` 围绕 reusable `Agent` 增加 session persistence、extensions、auto-compaction 和 retry handling: 由构造器订阅 core `Agent` event、安装 tool hooks、事件持久化和 post-run 逻辑推出。
- `pi-coding-agent` 选择和校验模型，但 provider stream 语义来自 `pi-ai`: 由 `AgentSession` 使用 `ModelRegistry` 与 `@earendil-works/pi-ai/compat` helper 推出。
- `spine.overview`、`spine.agent-loop`、`subsys.coding-agent.agent-session`、`ref.package-index` 的职责描述: 由本节点 related id 与源码边界分工推出，等待对应节点填充时交叉校验。

## spine-overview

# uncertainty-spine-overview

## [I] `spine.layered-architecture` 的详细职责

`spine.overview` 只从 README、`main()`、`Agent`、`runAgentLoop`、`Models` 和辅助源码推断 `spine.layered-architecture` 应继续细化 package dependency direction 与 reusable/product boundary。该 related 节点在 index.json 中仍是 planned，本轮未创建该节点。

## [I] TUI 交互渲染细节

`spine.overview` 只核到 README 对 `pi-tui` 的 package 描述，以及 `main()` 在 interactive mode 创建 `InteractiveMode(runtime)`。具体 terminal rendering、differential rendering 和组件层细节没有在本节点展开，应由 TUI surface/subsystem 节点或 `spine.process-lifecycle` 继续覆盖。

## [I] StreamFn contract 与 coding-agent wrapper 的边界张力

`packages/agent/src/types.ts` 声明 `StreamFn` 不应 throw/reject runtime failures；`packages/coding-agent/src/core/sdk.ts` 注入的 stream function 在 auth resolution 失败时会 throw，随后由 `Agent.runWithLifecycle()` 转成 assistant error message。本节点把它标为 reusable contract 与产品 wrapper 的边界张力，但未判断这是技术债、刻意兼容策略还是文档 contract 需要更新。

## spine-process-lifecycle

# uncertainty: spine.process-lifecycle

本轮未登记 `[U]`。

降级为 `[I]` 的推断：

- package/config 子命令因位于 `parseArgs` 之前且命中后 exit/return，被归类为 CLI bootstrap 分支，而不是 agent session 分支。
- Bun 入口最终 import `../cli.ts`，因此把 lifecycle 权威归到 `cli.ts` 与 `main.ts`。

## spine-provider-stream

# uncertainty: spine.provider-stream

本轮已将原 8 个不确定项逐项用源码闭环或收窄到本节点范围内,未留下需要 lead 处理的 blocker。

## spine-session-state-model

# Uncertainty staging: spine.session-state-model

- [U] `pi-agent-core` 的 `Session`/`SessionStorage`/`AgentHarness` 与 `pi-coding-agent` 的 `SessionManager` 当前并存，源码可证明它们不是同一个 class hierarchy；未来是否会收敛到单一 session API，本轮 source 列表与邻近调用点没有权威设计说明。

## spine-tool-call-anatomy

# uncertainty · spine.tool-call-anatomy

- 本轮未留下需要合并进 `reference/uncertainty.md` 的 `[U]` 项。
- 已降级为 `[I]` 的推断: `pi-agent-core` 不包含 coding-agent-specific prompt snippets, renderers, shell settings, or extension metadata。依据是 `AgentTool` 字段与 `ToolDefinition` 字段的结构性对比,但这是边界归纳而不是单行源码声明。
- 已降级为 `[I]` 的推断: Product UI rendering belongs to `ToolDefinition`, not `AgentTool`。`renderCall` / `renderResult` 可由 `ToolDefinition` 单行核到; `AgentTool` 无 renderer 字段属于对接口字段全集的结构性判断。

## spine-trace-extension-tool

# Uncertainty staging: spine.trace-extension-tool

## spine-trace-interactive-turn

# Uncertainty staging: spine.trace-interactive-turn

- [I] `AgentSession._runAgentPrompt()` 明确调用 `this.agent.prompt(messages)`,而 `runAgentLoop` 的行为在 `packages/agent/src/agent-loop.ts` 中明确;但 `Agent.prompt -> runAgentLoop` 的直接中间 call site 位于 stateful `Agent` 包装器,不在本节点 index 给出的 source 列中,所以正文把这一步作为跨文件桥接推断而非 `[E]`。
- [I] `pi-agent-core` 不认识 TUI containers、slash command UI 或 session manager 是由本节点三份 source 的职责分布归纳得出;本页未枚举整个 `agent` 包的所有 imports 来做反证式证明。
- [I] `runAgentLoop` 不直接改 TUI 是由本节点证据窗口中的 event emit chain 与 UI rendering 位于 `InteractiveMode.handleEvent` 归纳得出;正文对应句子保留 `[E]` 给事件链,并用 `[I]` 标出负面边界判断。

## spine-trace-rpc-prompt

# uncertainty: spine.trace-rpc-prompt

本轮没有保留 `[U]`。

## 降级为 `[I]` 的推断

- RPC prompt 的 queue branch 会通过 RPC subscription 暴露 queue state:源码分别证明 `_queueSteer`/`_queueFollowUp` 会 emit `queue_update`,以及 RPC mode 订阅 session events 并输出;二者合并后的端到端结论是推断。
- prompt acknowledgement 和 agent completion 是两条不同信号:源码分别证明 prompt ack 由 `preflightResult(true)` 输出、events 由 `session.subscribe(output)` 输出;“两条不同信号”是归纳性表述。
- prompt path 的 extension UI bridge 由 headless host 实现交互 UI:源码证明 RPC UI context 发 request 并等待 response;host 负责实现 UI 是协议边界推断。

- 未展开 `Agent.prompt` / `Agent.continue` 在 `pi-agent-core` 内部如何消费 provider stream 与执行 tools;该内容超出 `index.json` 给 `spine.trace-rpc-prompt` 的 source 列,本文只在 `AgentSession._runAgentPrompt` 调用边界处停住。
- 未逐字段解释所有 `AgentSessionEvent` 事件 payload;该内容应放到 `surface.modes.rpc-protocol` 或相关事件 catalog。

## surface-cli-overview

# uncertainty: surface.cli.overview

L1 填充后 `surface.cli.overview` 未新增 `[U]`。

已降级为 `[I]` 的内容:

- `install/remove/uninstall/update/list/config` 被归类为 CLI bootstrap surface,不是普通 agent turn surface;源码能证明它们在 `parseArgs` 前由 package/config handlers 处理,但"surface"归类是 wiki 分层判断。
- piped stdin 内容会在 runtime 创建后把 interactive 降级为 print;源码能证明赋值,但"不是最终模式的唯一输入"是对控制流的解释性总结。
- unknown long flags 是 extension-visible CLI input,不是 built-in `Args` 字段;源码能证明 unknownFlags 传入 `extensionFlagValues`,但 extension 消费语义需由 extension 节点继续展开。
- `--mode text` 被解析为合法 `Mode` 但没有专门 app-mode 分支;本节点把其行为解释为继续按 `--print` / TTY 规则选择模式。
- 本节点与 `spine.process-lifecycle`、`ref.coding-agent.cli-flags`、`surface.modes.interactive` 的 ownership 边界是 wiki 结构推断,不是单行源码事实。

## surface-commands-overview

# Uncertainty · surface commands overview

- [U] `docs/llm-wiki/pi/index.json` still says `group.slash-commands.instance_count: 21` and titles `ref.coding-agent.slash-commands` as `内置 slash 命令目录(~21)`, but pi HEAD `5a073885` has 22 entries in `packages/coding-agent/src/core/slash-commands.ts` `BUILTIN_SLASH_COMMANDS`: `settings`, `model`, `scoped-models`, `export`, `import`, `share`, `copy`, `name`, `session`, `changelog`, `hotkeys`, `fork`, `clone`, `tree`, `trust`, `login`, `logout`, `new`, `compact`, `resume`, `reload`, `quit`.
- [U] `/reload` has two visible descriptions: `packages/coding-agent/src/core/slash-commands.ts` says it reloads keybindings, extensions, skills, prompts, and themes; `packages/coding-agent/docs/usage.md` says it reloads keybindings, extensions, skills, prompts, and context files. The implementation-level reload scope should be reconciled when the slash-command catalog or reload subsystem node is filled.
- [U] `packages/coding-agent/src/modes/interactive/interactive-mode.ts` accepts `/debug`, `/arminsayshi`, and `/dementedelves`, but those branches are absent from `BUILTIN_SLASH_COMMANDS` and from the user docs Slash Commands table. This node treats `packages/coding-agent/src/core/slash-commands.ts` as the public built-in command ground truth per `conventions.md`.

## surface-config-keybindings

# Uncertainty · surface config keybindings

- [U] `index.json` node `surface.config.keybindings` still lists only `packages/coding-agent/src/core/keybindings.ts` and `packages/coding-agent/docs/keybindings.md` as source. The verified node needs additional explicit source files for the surface-level claims about default TUI actions, key syntax, agent-dir resolution, `/reload`, and interactive-mode injection: `packages/tui/src/keybindings.ts`, `packages/tui/src/keys.ts`, `packages/coding-agent/src/config.ts`, `packages/coding-agent/src/core/slash-commands.ts`, and `packages/coding-agent/src/modes/interactive/interactive-mode.ts`. I did not change `index.json` in this batch.
- [U] `index.json` node `surface.config.keybindings` still lists planned symbols `DEFAULT_APP_KEYBINDINGS` and `DEFAULT_EDITOR_KEYBINDINGS`. At pi HEAD `5a073885`, `packages/coding-agent/src/core/keybindings.ts` exports `KEYBINDINGS`, `migrateKeybindingsConfig`, `KeybindingsManager`, and type re-exports instead; neither `DEFAULT_APP_KEYBINDINGS` nor `DEFAULT_EDITOR_KEYBINDINGS` appears in the current source.
- [U] `docs/llm-wiki/pi/index.json` group `group.keybindings` says the default-keybinding catalog has `instance_count: 55`, while the current source shape is `KEYBINDINGS = {...TUI_KEYBINDINGS, app defaults}`. The exact catalog count should be reconciled when `ref.coding-agent.default-keybindings` is filled.
- [U] `packages/coding-agent/docs/keybindings.md` documents `ctrl`, `shift`, and `alt` as user-facing modifiers, but `packages/tui/src/keys.ts` also includes `super` in the `KeyId` type and `MODIFIERS` table. This node treats `super` as not-yet-confirmed user-facing surface rather than a documented config promise.

## surface-config-resolution

# uncertainty: surface.config.resolution

本轮未留下需要上卷到 `reference/uncertainty.md` 的 `[U]` 项。`surface.config.resolution` 只按 `packages/coding-agent/src/core/resolve-config-value.ts` 写用户可见语法、默认/strict API、env lookup、command cache 与 headers 解析;settings schema、具体 env var catalog、Windows shell fallback 和 config path boundary 均作为 related 节点边界处理并标为 `[I]`。

## surface-config-settings

# uncertainty: surface config settings

- `surface.config.settings` 的 index symbols 包含 `loadSettings`,但 `packages/coding-agent/src/core/settings-manager.ts` 当前没有 `loadSettings` 函数或 export;实际读取 helper 是 private static `loadFromStorage()` 与 `tryLoadFromStorage()`。
- `surface.config.settings` 的 index symbols 包含 `deepMergeSettings`;源码确有 `function deepMergeSettings(...)`,但它不是 exported symbol。如果 `symbols` 语义必须是导出符号,这里需要后续 reconcile index 或源码。
- `FileSettingsStorage` 的 project path 使用 `CONFIG_DIR_NAME`,本节点 source 列表没有 `packages/coding-agent/src/config.ts`;`.pi/settings.json` 的用户可见路径由 `packages/coding-agent/docs/settings.md` 佐证。
- `packages/coding-agent/src/core/defaults.ts` 在本 source set 中只导出 `DEFAULT_THINKING_LEVEL = "medium"`,而 `SettingsManager.getDefaultThinkingLevel()` 不使用该常量;默认 thinking level 的最终消费点需要在调用方节点核对。

## surface-extensions-api

# uncertainty: surface.extensions.api

- remaining: `ExtensionAPI` 的 semver 稳定性级别、兼容性承诺或 deprecation policy 未在 `packages/coding-agent/src/core/extensions/types.ts`、`packages/coding-agent/docs/extensions.md`、`packages/coding-agent/src/core/extensions/runner.ts`、`packages/coding-agent/src/core/extensions/loader.ts` 中核到；节点正文保留 `[U]`，不推断长期稳定性。

## surface-extensions-context-ui

# Uncertainty: surface.extensions.context-ui

- [U] `surface.extensions.api` 的文件现在存在,但自身仍是 draft,且 `docs/llm-wiki/pi/index.json` 里的 entry 仍标为 planned。本节点只把它作为 companion 边界链接,未复核其完整 API 内容或同步 index 状态。
- [U] `index.json` 中 `surface.extensions.context-ui` 的 planned source 只列出 `packages/coding-agent/src/core/extensions/types.ts` 和 `.pi/extensions/prompt-url-widget.ts`;本节点正文还需要 `runner.ts`、`interactive-mode.ts`、`extensions.md`、`rpc.md` 以及两个 examples 文件才能说明真实注入链路、mode behavior 和 dogfood 示例。用户限制本轮只写本节点和本 staging 文件,所以没有同步修改 `index.json`。
- L2 核验后节点已置 `status: verified`。本轮修正了 no-op UI constructor/默认返回值锚点、`resetExtensionUI()` 的 reload/session invalidate 调用点和清理项锚点、prompt URL pattern 锚点,并把 `custom-footer.ts` 的示例描述收窄为源码实际调用的 `footerData.getGitBranch()`。

## surface-extensions-contribution-points

# Uncertainty · surface.extensions.contribution-points

本节点未留下 `[U]`。

- L2 按 `index.json` source 复核:本节点只保留 `packages/coding-agent/src/core/extensions/types.ts` 与 `packages/coding-agent/src/core/extensions/runner.ts` 作为 explicit source。
- 原草稿中依赖 `loader.ts` 和 `docs/extensions.md` 的注册写入细节/用户文档示例不再作为 `[E]`;已改写为 `Extension` maps、runner 聚合/查找/flush/rebind 可直接支撑的描述。
- `[I]` 主要用于边界判断: extension/custom tool 与内置 tool 的最终覆盖关系属于 session registry / wrapper 深挖节点;provider config 的新增/覆盖细节属于 model registry 节点;message renderer 不是语义拦截点;`registerFlag()` 与 action methods 是相邻能力,但不在本节点 `index.json` 指定的五个 `symbols` 中。

## surface-extensions-events

# uncertainty-surface-extensions-events

- [U] `index.json` 的 `surface.extensions.events.source` 只有 `packages/coding-agent/src/core/extensions/types.ts` 和 `packages/coding-agent/src/core/extensions/runner.ts`,但本批任务指定扩展事件 ground truth 还要核 `packages/coding-agent/docs/extensions.md`;本节点 frontmatter/Sources 已加入 docs 文件,后续如要求 index/file 完全同源需要协调 index。
- [U] `index.json` 为 `surface.extensions.events.symbols` 列了 `emitSessionStart`,但当前 `packages/coding-agent/src/core/extensions/runner.ts` 未看到同名专用 emitter;`session_start` 由通用 `ExtensionRunner.emit()` 处理。后续应把 symbol 改成 `ExtensionAPI.on`、`emitToolResult`、`emitInput` 或明确 `emitSessionStart` 是文档简称。
- [U] `index.json` 的 `group.extension-events.instance_count` 写作 29,但当前 `ExtensionAPI.on` overload 可数到 30 个事件名。需要在 T3 `ref.coding-agent.extension-events` 填充时确认是否某个 overload 不计入 catalog,或更新 group 计数。

## surface-misc-containerization

# uncertainty: surface.misc.containerization

本轮按 `docs/llm-wiki/pi/index.json` 的 source 集合核验,只把以下文件作为 `[E]` ground truth:

- `packages/coding-agent/docs/containerization.md`
- `.pi/extensions/redraws.ts`

本轮保留或新增的 `[U]` 项:

- `docs/llm-wiki/pi/index.json` 为 `surface.misc.containerization` 列出的 `.pi/extensions/redraws.ts` 与容器化主题不匹配。该文件只注册 `/tui` command 读取 `tui.fullRedraws`,没有 Docker、Gondolin、OpenShell、sandbox、permission boundary 或 containerization 逻辑。
- `packages/coding-agent/docs/containerization.md` 描述 Gondolin、Plain Docker 和 OpenShell 的用户面使用模式,但本轮没有核外部 Gondolin、Docker、OpenShell 源码或运行时策略;节点只把它们作为 pi 文档中的推荐外部边界,不声明其实际隔离强度。
- OpenShell provider routing、gateway credential injection 和 policy enforcement 只按 pi 文档描述记录;本轮没有核 OpenShell gateway 实现。
- 原草稿中引用 `README.md`、`packages/coding-agent/docs/security.md`、`packages/coding-agent/examples/extensions/sandbox/index.ts`、`packages/coding-agent/examples/extensions/sandbox/package.json`、`package.json`、`packages/coding-agent/src/core/tools/bash.ts`、`packages/coding-agent/docs/extensions.md` 的 `[E]` 断言均不在本节点 index source 内;本轮已从主节点显式证据中移除或降级为边界说明。
- sandbox example 调用 `@anthropic-ai/sandbox-runtime` 的接线方式与 OS-level enforcement 不在本节点 index source 内;如需覆盖,应先 reconcile index source 或迁移到 extension/API/tool 节点。

## surface-misc-images

# uncertainty · surface.misc.images

- [U] `surface.misc.images` 没有逐项枚举 text/chat model catalog 中哪些模型可消费 user `ImageContent`;该清单应由 `ref.ai.model-catalog` 或一个专门的 vision-model slice 从 `packages/ai/src/models.generated.ts` 机械派生。
- [U] 当前节点只按 `packages/ai/src/providers/all.ts` 核到 built-in image-generation provider 为 OpenRouter;没有追 `createImagesModels()` 的外部调用方是否会注册第三方 image provider。

## surface-misc-packages

# uncertainty-surface-misc-packages

本轮填充 `surface.misc.packages` 新增 2 条 `[U]`:

- [U] `surface.misc.packages` 的 index source 只有 `packages/coding-agent/src/core/package-manager.ts` 和 `packages/coding-agent/docs/packages.md`,但 index symbols 包含 `PackageSource`;当前节点只能从 `package-manager.ts` 核到 package entry 的 runtime 消费形态,不能在 index source 内核到 `PackageSource` 的完整 public settings schema。已把原先指向 `settings-manager.ts` 的 `[E]` 从节点正文降级为 source-set 不确定项,未修改 index 或 frontmatter source。
- [U] 用户文档说明 `pi config` 可启用/禁用 installed packages 和 local directories 中的资源,但本节点 source 未包含 `packages/coding-agent/src/cli/config-selector.ts` 或相关 settings 写入实现;节点只记录用户可见承诺,不展开具体写入行为。

## surface-misc-security

# uncertainty · surface.misc.security

- `[U]` `surface/misc/security.md` 的 HTTP 出站配置段只核到 CLI/RPC 入口调用 `configureHttpDispatcher()` 以及 `http-dispatcher.ts` 安装 undici `EnvHttpProxyAgent`。本轮没有逐个 provider SDK / wire implementation 验证所有网络请求都使用该 global dispatcher,所以该节点不能把 HTTP dispatcher 表述成完整网络隔离、出站 allowlist 或 egress firewall。
- `[I]` L2 核验时发现原文用 `agent-session-services.ts` 和 `main.ts` 证明默认 service wiring 与 CLI `--api-key` 注入,但这两个文件不在该节点 index source 中。正文已收窄为只用 `auth-storage.ts` / `model-registry.ts` 证明默认构造路径和 runtime API key 的内存覆盖行为;具体会话装配调用点留给包含对应 source 的节点核验。

## surface-modes-interactive

# uncertainty-surface-modes-interactive

本轮核验 `surface.modes.interactive` 后未留下需要登记为 `[U]` 的源码不确定项；节点已通过并标记为 `status: verified`。

保留的 `[I]` 均为边界性或分层性归纳, 用于把源码事实压成 wiki 检索语义:

- `InteractiveMode` 不是直接创建 session 的 factory;它通过 `runtimeHost.session` 访问当前 session。
- built-in slash commands 在 submit handler 内 return, 不进入 `getUserInput()` 的普通 prompt queue。
- `onInputCallback`/`pendingUserInputs` 这个 callback queue 的作用是解耦 editor submit timing 和 `run()` 的 awaited prompt loop。
- related 节点的职责边界按 index title/source/symbols 与现有已填节点归纳;`subsys.tui.runtime` 本身仍是 planned。

## surface-modes-print

# uncertainty-surface-modes-print

- none: 本轮填充 `surface/modes/print.md` 时没有留下需要上卷到 `reference/uncertainty.md` 的 `[U]`。主要事实均来自 `print-mode.ts`、`main.ts`、`args.ts`、`agent-session.ts`、`agent-session-runtime.ts` 和 `docs/json.md`;对“text 模式是最终 assistant 文本抽取器”和跨包下游边界的概括已标为 `[I]`。

## surface-modes-rpc-protocol

# uncertainty-surface-modes-rpc-protocol

本轮复核 `surface.modes.rpc-protocol` 未新增 `[U]`。

本轮修正:

- `get_state.model` 不再复述 RPC docs 中的 `or null`; 当前源码类型是 `model?: Model<any>`, 运行时写入 `session.model`, 所以节点改为可选完整 `Model` object。

已标为 `[I]` 的边界:

- `surface.modes.rpc`、`ref.coding-agent.rpc-methods`、`ref.coding-agent.json-events` 与本节点的职责划分来自 index/source 关系和节点粒度约定, 不是源码中的运行时事实。
- `success()` helper 省略或携带 `data` 对 response shape 的解释, 以及 "stdout 是协议通道, 普通 UI/log output 不应混入 stdout" 属于从 `takeOverStdout()`/raw stdout 写出方式推出的设计含义。
- backpressure 只描述 RPC mode 调用点; `output-guard` 的内部实现未在本节点证实。

## surface-modes-rpc

# uncertainty: surface.modes.rpc

本轮按 `docs/llm-wiki/pi/index.json` 的 `surface.modes.rpc` source 重新核验,未保留 `[U]`。

## L3 lint 锚点修复

- 已按 `rpc-mode.ts` 当前源码修复主节点中指向文件头注释、函数注释、pending request 注释、extension response 注释和 command 分段分隔线的 `[E]` 锚点。
- 保留 `status: verified`;本轮未新增 `[U]`。

## L2 核验结果

- 已将主节点 `source` 和 Sources 列表收回到 index source: `packages/coding-agent/src/modes/rpc/rpc-mode.ts`、`packages/coding-agent/src/rpc-entry.ts`、`packages/coding-agent/docs/rpc.md`。
- 已逐条核对主节点 `[E]` 行号,所有保留的 `[E]` 均落在上述三份 index source 内。
- 已将节点状态置为 `status: verified`。

## 降级为 `[I]` 的推断或边界

- `rpc-entry` 是普通 `main()` 的 thin wrapper:源码证明它调用 `main(["--mode", "rpc", ...])`,但 wrapper 定性是实现形态归纳。
- `main.ts` 的 mode 解析、CLI `--mode` 枚举和 RPC mode 禁用 `@file` 参数都不在本节点 index source 内;主节点不再把这些作为本节点 `[E]` 展开。
- `runRpcMode` 在 `new_session`、`switch_session`、`fork`、`clone` 后 rebind 的原因来自控制流和 `runtimeHost.session` 重新读取方式,源码能证明调用关系,设计原因标为 `[I]`。
- host 用 response `id` 关联 command 接受/失败、用 event stream 观察 agent 生命周期,来自文档中的 response/event 区分和 event 无 `id` 语义归纳。
- `surface.modes.rpc-protocol`、`ref.coding-agent.rpc-methods`、`subsys.orchestrator.rpc-spawner` 的职责分工来自 index related/source/symbols 和节点粒度,不是 RPC runtime 源码内声明。

## 未展开范围

- 未逐项列出全部 `RpcCommand` 字段和每个 `RpcResponse` payload;该内容应由 `ref.coding-agent.rpc-methods` 覆盖。
- 未逐字段解释 `RpcExtensionUIRequest`、`RpcSessionState`、JSONL reader 的边界条件或 typed client;该内容应由 `surface.modes.rpc-protocol` 覆盖。
- 未核验 orchestrator 的 spawn/pending-response 实现;该内容不在本节点 index source 内,应由 `subsys.orchestrator.rpc-spawner` 覆盖。

## surface-prompts-system

# uncertainty: surface.prompt-templates.system

- 本轮按 `docs/llm-wiki/pi/index.json` 的 source 收回主节点范围:只保留 `packages/coding-agent/src/core/prompt-templates.ts`、`packages/agent/src/harness/prompt-templates.ts`、`packages/coding-agent/docs/prompt-templates.md` 和 `.pi/prompts/wr.md` 作为可标 `[E]` 的来源。原节点中来自 `resource-loader.ts`、`package-manager.ts`、`agent-session.ts`、interactive/RPC、CLI parser、settings/usage/system prompt 文件的断言已移出 `[E]` 范围或降级为 `[I]` 边界。
- `packages/coding-agent/docs/prompt-templates.md` 只写 `--no-prompt-templates` disable discovery;本轮 index source 不含 `args.ts` / `resource-loader.ts`,不能核定该 flag 对显式 CLI `--prompt-template <path>` 的 runtime 精确语义。需要后续用更宽 source 判定文档措辞、实现行为或 CLI override 是否一致。
- `packages/coding-agent/src/core/prompt-templates.ts` 与 `packages/agent/src/harness/prompt-templates.ts` 都导出同名 prompt-template primitives,且源码可见能力差异包括 product `PromptTemplate` 的 `argumentHint/sourceInfo/filePath` 与 `${N:-default}` 支持。当前 index source 不能单独证明 product runtime 的最终装配路径是否只使用 coding-agent 版本;该长期边界需要维护者或 wider-source 节点确认。

## surface-providers-auth

# uncertainty: surface.providers.auth

本轮核验 `surface.providers.auth` 保留 1 个 `[U]`:

- index 中 `surface.providers.auth` 的 `symbols` 包含 `login`,且 `source` 包含 `packages/ai/src/cli.ts`;但用户可见的 coding-agent `/login` 实际分流在 `packages/coding-agent/src/modes/interactive/interactive-mode.ts`,持久化在 `packages/coding-agent/src/core/auth-storage.ts`,而 `packages/ai/src/cli.ts` 的 standalone `login(providerId)` 写的是当前目录 `auth.json`。因此 `login` 这个 symbol 在本节点中的权威归属需要后续消歧。

保留为 `[I]` 的主要结论:

- `Models.getAuth()`/`applyAuth()` 是 `pi-ai` runtime request auth path,而 `AuthStorage.getApiKey()`/model-registry 是 coding-agent 产品层 compatibility path:这是由调用边界和 source ownership 推出,不是某个文件里的单句设计声明。
- `builtinProviders()` 是 provider membership ground truth,`env-api-keys.ts` 是 API key 环境变量 ground truth:这是 `conventions.md` 的 pi 专属约定与当前 source 布局共同推出。

L3 lint 修正:

- `surface.providers.auth` 中指向 `models.ts:239` 的纯括号锚点已移除,同一断言改由 `apiKey`/`env` 参数行承载。
- `env-api-keys.ts:115-117` 与 `auth/resolve.ts:34,36-38` 原本只指向注释/JSDoc,已改为函数签名、分支和返回语句等真实承载行;其中 `findEnvKeys` 不返回 ambient credential source 的结论保留为 `[I]` 辅助解释。

## surface-providers-custom-provider

# uncertainty: surface.providers.custom-provider

本轮按 `index.json` 的 source 核验,只承认以下 3 个文件作为本节点 `[E]` 来源:

- `packages/coding-agent/docs/custom-provider.md`
- `packages/coding-agent/docs/models.md`
- `packages/coding-agent/src/core/extensions/types.ts`

新增 `[U]`:

- `ExtensionRuntimeState` 的实际类型行只能证明存在 `pendingProviderRegistrations` 与 runtime-level register/unregister hooks;bind 前 queued、bind 后调用 `ModelRegistry` 的语义来自相邻类型注释,本轮不作为 `[E]` 锚点。index source 不能确认 `AgentSession` 是否在动态 provider 注册/注销后刷新当前已选模型视图。原节点对 `_refreshCurrentModelFromRegistry()` 的逐行断言依赖 `packages/coding-agent/src/core/agent-session.ts`,不属于 index source。

保留为 `[I]` 的主要结论:

- “只是 base URL、headers、模型列表和已支持 API 类型的组合时优先使用 `models.json`;需要 `/login` 集成、动态模型发现或新 streaming implementation 时使用扩展注册”: 这是 `docs/models.md` 与 `docs/custom-provider.md` 的入口边界共同推出,不是源码里单行声明的硬规则。
- `apiKey` 与 header value 复用 `models.json` config value 语法,因此扩展 provider 与 `models.json` provider 在 secret/reference 表达上保持一致: docs 明确说语法相同,但“保持一致”是作者层面的归纳。
- `models.json` custom model 与扩展 `ProviderConfig` 对 auth 的要求有差异: `docs/models.md` 允许通过 `/login`、`auth.json` 或 CLI `--api-key` 使模型可用,而 `ProviderConfig.apiKey` 注释写着定义 models 时需要 API key,除非提供 oauth;“差异”是二者对比得出的结论。
- wire protocol 的源码目录、lazy wrapper、dynamic API registry 重放等实现细节本轮不作为本节点 `[E]` 展开;它们应由 `ref.ai.wire-protocol-catalog` 或 `subsys.coding-agent.model-registry` 覆盖。

## surface-providers-overview

# uncertainty: surface.providers.overview

本轮 L2 核验 `surface.providers.overview` 未新增 `[U]`;节点已置为 `status: verified`。

核验修正:

- 将 generated catalog 与 `builtinProviders()` 的关系从“当前可互相核对”收紧为“可作为交叉检查对象”,避免在未把 generated catalog 纳入本节点 source 时写成当前事实。
- 去掉 mixed-API provider 句子中的具体 provider 点名;本节点 source 只能直接证明 `createProvider()` 支持 API map dispatch,具体 provider 使用情况应由逐 provider factory 或 catalog 节点展开。
- 为 `streamSimple()` 的请求委派补充 `models.ts:278/281/282` 行号锚点。

保留为 `[I]` 的主要结论:

- `builtinProviders()` 应作为 provider membership ground truth,generated `MODELS` 用于模型元数据和 cross-check: 这是 `conventions.md` 的 pi 专属约定与当前 `all.ts`/`models.generated.ts` 分工共同推出,不是源码中声明的不变量。
- `models.json` 适合已有 wire protocol 的 custom provider,扩展适合 custom stream implementation 或 OAuth flow: docs 明确给出这两条路径,具体能力边界由 `createProvider()` 的输入 shape 推出。
- `builtinProviders()` 返回 fresh factory call 结果而非 singleton: 源码显示每次函数调用都会执行 factory call array,但具体 provider 内部是否有共享状态需看各 provider factory 实现;overview 不展开逐 provider 内部状态。

## surface-reference-cli-flags

# uncertainty: ref.coding-agent.cli-flags

- [U] `printHelp()` 在 `packages/coding-agent/src/cli/args.ts` 中展示 command-specific `[-l]` 和 `--all` 提示,但 `parseArgs()` 没有为这些 token 建立全局 `Args` 字段。本节点按用户要求以 `cli/args.ts` 为 catalog ground truth,只把它们标为 help-only 边界;实际 command handler 行为需要另到 package-manager CLI / command dispatcher 节点核对。

本轮按用户约束只写 `docs/llm-wiki/pi/reference/cli-flags.md` 和本 staging 文件,没有修改 `docs/llm-wiki/pi/index.json`。

## surface-reference-components

# Uncertainty · surface/reference/components

Source node: `ref.interactive.components` (`docs/llm-wiki/pi/reference/components.md`)

## [U] directory instance count vs public barrel

`index.json` 的 group ground truth 是 `packages/coding-agent/src/modes/interactive/components/`, instance_count 是 38;该目录正好有 38 个 `.ts` 文件, 但其中 `index.ts` 是 barrel, 不是 runtime component class。当前节点按“目录文件”计入 `index.ts`;如果后续把 instance 定义改成“public component/helper symbol”, 需要重算。

Evidence: `packages/coding-agent/src/modes/interactive/components/index.ts:2`, `packages/coding-agent/src/modes/interactive/components/index.ts:38`

## [U] internal-only files not exported by components/index.ts

`ConfigSelectorComponent`, `CountdownTimer`, `EarendilAnnouncementComponent`, and `session-selector-search.ts` have real internal call sites, but they are not exported by `components/index.ts`. This may be intentional internal-only API, but the public/private boundary is not explicitly documented in source.

Evidence: `packages/coding-agent/src/cli/config-selector.ts:8`, `packages/coding-agent/src/modes/interactive/components/extension-selector.ts:8`, `packages/coding-agent/src/modes/interactive/interactive-mode.ts:111`, `packages/coding-agent/src/modes/interactive/components/session-selector.ts:22`

## [U] public exports without current interactive-mode call sites

`ShowImagesSelectorComponent`, `ThemeSelectorComponent`, and `ThinkingSelectorComponent` are exported through the public component barrel/package root, but the current `interactive-mode.ts` does not directly import them. They may exist for extension compatibility or be older UI paths now subsumed by `SettingsSelectorComponent`.

Evidence: `packages/coding-agent/src/modes/interactive/components/index.ts:29`, `packages/coding-agent/src/modes/interactive/components/index.ts:31`, `packages/coding-agent/src/modes/interactive/components/index.ts:32`, `packages/coding-agent/src/index.ts:353`, `packages/coding-agent/src/index.ts:355`, `packages/coding-agent/src/index.ts:356`

## surface-reference-config-keys

# uncertainty: surface reference config keys

- [U] `index.json` 的 `group.config-keys.instance_count` 仍写作 50,但当前 `packages/coding-agent/src/core/settings-manager.ts` 按主节点口径逐 key 展开为 71 个实例:43 个 `Settings` top-level 字段、23 个嵌套 settings leaf 字段、5 个 `PackageSource` object fields。主节点采用源码优先口径逐实例覆盖,没有改 `index.json`。
- [U] `terminal.showTerminalProgress` 在 `TerminalSettings` 与 getter/setter 中存在,默认 `false`,但 `packages/coding-agent/docs/settings.md` 的 Terminal & Images 表没有列出该 key。主节点把它保留为源码支持的配置键。
- [U] `websocketConnectTimeoutMs` 的 docs 默认写 `15000`,但 `SettingsManager.getWebSocketConnectTimeoutMs()` 只解析 setting 本身,未在本 ground-truth 三件套中找到 15000 fallback 的直接代码锚点。主节点保留 docs 默认并标注 getter 口径。
- [U] `retry.provider.maxRetries` 的 docs 默认写 `0`,但 `SettingsManager.getProviderRetrySettings()` 对 unset 值原样返回 `undefined`;默认 0 可能由下游 SDK/provider option 口径承担。主节点保留 docs 默认并标注 getter 口径。

## surface-reference-contribution-points

# uncertainty: surface reference contribution points

本节点未留下 `[U]`。

- `[I]` 主要用于 catalog 边界判断: `on(event, handler)` 的事件名实例不在 `ref.coding-agent.contribution-points` 展开,而应由 extension events catalog 覆盖;本页只列 `ExtensionAPI` 上的 `pi.on` 入口。
- `[I]` 也用于“注册型贡献点”和“动作入口”的分类。源码以 `ExtensionAPI` 方法分段和签名暴露入口,但没有提供一个正式 union 来声明这些类别。
- `../../../pi` 在当前工作目录不可达;实际源码根是 `/Users/makii/Project/Agent_Wiki/pi`。主节点的 evidence path 仍按 wiki 约定写为相对 `pi/` 的路径。
- L3 lint fix: 将 `ref.coding-agent.contribution-points` 中落在 JSDoc、分隔线、Markdown heading-only 或示例注释行的 `[E]` 锚点移动到真实承载的方法签名、字段、正文说明或示例调用行;少量分类性语义继续保留为 `[I]`。主节点保持 `status: verified`,未新增 `[U]`。

## surface-reference-default-keybindings

# Uncertainty: surface/reference/default-keybindings

- `group.keybindings.instance_count` in `docs/llm-wiki/pi/index.json` is `55`, while current source expands to 72 default keybinding instances: 31 from `packages/tui/src/keybindings.ts` `TUI_KEYBINDINGS` plus 41 `app.*` actions declared in `packages/coding-agent/src/core/keybindings.ts` `AppKeybindings` / `KEYBINDINGS`. [U]
- The planned node symbols in `index.json` are `DEFAULT_APP_KEYBINDINGS` and `DEFAULT_EDITOR_KEYBINDINGS`, but current source exports `KEYBINDINGS`, imports/spreads `TUI_KEYBINDINGS`, and declares `AppKeybindings`; no `DEFAULT_APP_KEYBINDINGS` or `DEFAULT_EDITOR_KEYBINDINGS` symbol exists in the current keybindings source. [U]
- The planned node source list omits `packages/tui/src/keybindings.ts`, but `KEYBINDINGS` includes TUI defaults by spreading `TUI_KEYBINDINGS`; the catalog node therefore cites the TUI file directly to keep every `tui.*` row evidence-backed. [U]

## surface-reference-env-vars

# Uncertainty staging: surface reference env vars

Node: `ref.coding-agent.env-vars`

Batch: `surface`

## Items

- [U] 本节点刻意限定为 coding-agent 产品层和它直接调用的 `pi-ai` provider/env 通道;`packages/orchestrator` 的 Radius / orchestrator env 和纯 `packages/tui` 内部 debug env 没有并入 `ref.coding-agent.env-vars`。如果后续要做全仓库 env catalog,需要新增 cross/package-specific catalog 或扩大本节点范围。
- [U] `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` 在用户文档中作为 Bedrock proxy env 出现,但当前核查到的 source set 没有显式 `getProviderEnvValue()` / `process.env` 读取;行为可能由 AWS SDK 默认 env 机制承接。
- [U] `OPENROUTER_API_KEY` 在 `env-api-keys.ts` 覆盖 text provider `openrouter`;OpenRouter image provider 也使用同名 env,但本节点没有把 image provider catalog 作为逐实例权威来源展开。

## surface-reference-extension-events

# uncertainty-surface-reference-extension-events

- [U] `index.json` 的 `group.extension-events.instance_count` 是 29,但当前 `packages/coding-agent/src/core/extensions/types.ts` 中 `ExtensionAPI.on(...)` overload 与 `ExtensionEvent` union 对齐后可数到 30 个事件名: `project_trust`, `resources_discover`, 8 个 session events, 9 个 agent/message/context events, 4 个 provider/model events, 5 个 tool events, `user_bash`, `input`。本节点按源码写 30 个;后续应单独更新 index group 计数或明确 catalog 计数口径。

## surface-reference-json-events

# uncertainty-surface-reference-json-events

本轮核验后 `ref.coding-agent.json-events` 无遗留不确定项。

已移除的不确定项:

- `extension_error` 的 RPC-only record 可由 `packages/coding-agent/docs/rpc.md:767` 与 `packages/coding-agent/src/modes/rpc/rpc-mode.ts:347`/`:348` 直接支撑;它不属于 `AgentSessionEvent` union 这一点也由 `AgentSessionEvent` 类型定义和 `session.subscribe()` 转发边界支撑,因此无需保留不确定标记。
- L3 lint 修复把 `rpc-types.ts`、`agent-session.ts`、`agent-loop.ts`、`session-manager.ts` 中落到注释行或纯括号行的 `[E]` 锚点移到真实承载行;节点内容与 `status: verified` 不变。

已标为 `[I]` 的边界:

- `RpcResponse`、extension UI request/response 不归入本节点,而归入 `surface.modes.rpc-protocol`;这是从 index related、节点粒度和 `rpc-types.ts` 的 protocol 分层推断出的文档边界。
- `AssistantMessageEvent` nested variants 不作为顶层 JSONL record 单独写出,而是包含在 `message_update.assistantMessageEvent` 中;该结论来自 agent loop 包装逻辑和类型结构组合判断。
- `surface.modes.print`、`surface.modes.rpc-protocol`、`reference/agent-events.md` 与本节点的职责分割属于 wiki 架构解释,不是源码里的运行时事实。

## surface-reference-rpc-methods

# uncertainty: surface reference rpc methods

本轮核验后 `docs/llm-wiki/pi/reference/rpc-methods.md` 已置 `status: verified`。`RpcCommand` union、`handleCommand()` switch case、节点 catalog 表格均为 29 个实例且逐项一致;节点内 `[E]` 引用均落在当前 source 的非空、非注释、非纯括号行号范围内。

- [U] `index.json` 的 `group.rpc-methods.instance_count` 写作 30,但当前 `packages/coding-agent/src/modes/rpc/rpc-types.ts` 的 `RpcCommand` union 与 `rpc-mode.ts` 的普通 command dispatch 覆盖 29 个 command。主节点按源码 union 计数为 29,没有把 `extension_ui_response` 或 extension UI request methods 计入 `RpcCommand` catalog。
- [U] `packages/coding-agent/docs/rpc.md` 的 `get_commands` response 示例和字段说明使用 top-level `location`/`path`,但当前 `RpcSlashCommand` 类型与 `rpc-mode.ts` dispatch 输出的是 `sourceInfo` 字段。主节点采用类型和 dispatch 口径,并把 docs/type 差异保留为不确定项。

## surface-reference-session-events

# uncertainty: surface/reference/session-events

本轮按 `index.json` 核验 `ref.coding-agent.session-events`,只承认以下 source 作为本节点 `[E]` ground truth:

- `packages/coding-agent/src/core/agent-session.ts`

保留为 `[U]` 的 source-scope 边界:

- `AgentSessionEvent` 通过 `Exclude<AgentEvent, { type: "agent_end" }>` 继承 9 个非 `agent_end` core events。`agent-session.ts` 能证明继承关系、pass-through 转发和 `_emitExtensionEvent()` 中处理的 discriminator,但不能单独证明 `AgentEvent` union 的完整字段 shape 或未来是否新增未在 `_emitExtensionEvent()` 特化的 inherited variant。精确 core payload catalog 由 `ref.agent.agent-events` 覆盖。
- JSON mode、RPC stdout、session header、RPC-only records、`packages/coding-agent/docs/json.md` freshness 和 `rpc-client.ts` stdout cast 都不属于本节点 index source。原草稿中这些跨文件 `[E]` 已从本节点显式证据中移除;需要核它们时应转到 `ref.coding-agent.json-events`、`surface.modes.print` 或 `surface.modes.rpc-protocol`。

本轮修正:

- frontmatter `source` 与 `## Sources` 已收敛到 `index.json` 的唯一 source。
- 事件实例目录按 17 个顶层 session event 覆盖:9 个 inherited non-`agent_end` core events、1 个 replacement `agent_end`、7 个 coding-agent own events。
- 所有 retained `[E]` 均落在 `packages/coding-agent/src/core/agent-session.ts` 当前行号;跨包字段 shape 和输出面 contract 均降级为 `[I]` 或 `[U]`。
- 主节点已置 `status: verified`。

## surface-reference-session-format

# Uncertainty: ref.coding-agent.session-format

L2 surface 核验按 `docs/llm-wiki/pi/index.json` 的 source 执行;该 index source 只包含:

- `packages/coding-agent/src/core/session-manager.ts`
- `packages/coding-agent/docs/session-format.md`

新增 `[U]`:

- agent-core `SessionTreeEntry` 是否额外包含 `ActiveToolsChangeEntry` / `LeafEntry`,以及 agent-core `JsonlSessionStorage` 的 header / leaf 解析 contract,本轮不能在 `ref.coding-agent.session-format` 中作为 `[E]` 保留;原 draft 依赖的 `packages/agent/src/harness/types.ts` 与 `packages/agent/src/harness/session/jsonl-storage.ts` 不在该节点 index source 内。
- `subsys.agent-core.session-tree` 和 `ref.agent.session-entry-types` 的具体字段/存储契约应由对应 agent-core 节点或扩展后的 index source 复核,本节点只保留 coding-agent 产品层可核边界。

仍按 `[I]` 保留:

- coding-agent 产品层 `SessionEntry` union 只包含当前 `session-manager.ts` 中列出的九类 non-header entry;`leaf` 在 coding-agent 产品层是 `SessionManager.leafId` 内存字段,不是 `SessionEntry` 成员。
- `getSessionFile()` 返回路径不等同于文件已经存在,是从 `_persist()` 的延迟 flush 行为推导出的使用 gotcha,正文按 `[I]` 标注。

## surface-reference-slash-commands

# Uncertainty · surface/reference/slash-commands

batch: surface
node: `ref.coding-agent.slash-commands`
path: `reference/slash-commands.md`
updated: `5a073885`

## [U] group count drift

- `index.json` 当前 `group.slash-commands.instance_count` 写作 `21`,但 `packages/coding-agent/src/core/slash-commands.ts` 的 `BUILTIN_SLASH_COMMANDS` 枚举为 22 个实例: `settings`, `model`, `scoped-models`, `export`, `import`, `share`, `copy`, `name`, `session`, `changelog`, `hotkeys`, `fork`, `clone`, `tree`, `trust`, `login`, `logout`, `new`, `compact`, `resume`, `reload`, `quit`.
- 本轮按用户约束不改 `docs/llm-wiki/pi/index.json`;主节点按源码 catalog 写 22 个实例并已标记 `status: verified`,但 index group 计数仍需后续单独 reconcile。

## [U] index source scope drift

- `docs/llm-wiki/pi/index.json` 中 `ref.coding-agent.slash-commands.source` 仍只有 `packages/coding-agent/src/core/slash-commands.ts` 和 `packages/coding-agent/docs/usage.md`,但本节点为了核验交互 dispatch、handler 行为、动态命令来源和 RPC `get_commands` 边界,实际引用了 `interactive-mode.ts`、`agent-session.ts`、`extensions/runner.ts`、`prompt-templates.ts`、`rpc-mode.ts`。本轮不改 index;后续应补 index source 或把节点范围收窄为纯 catalog+usage。

## [U] runtime-only slash branches

- `packages/coding-agent/src/modes/interactive/interactive-mode.ts` 直接 dispatch `/debug`, `/arminsayshi`, `/dementedelves`,但这三个名字不在 `BUILTIN_SLASH_COMMANDS` catalog,也不在 `packages/coding-agent/docs/usage.md` 的 slash command 表中。
- 本轮按 `packages/coding-agent/src/core/slash-commands.ts` 作为 catalog ground truth,没有把这些 runtime-only 分支计入 22 个内置 slash command 实例。是否应另建“debug/internal commands”节点或把它们暴露到 catalog,需要后续产品口径确认。

## surface-sdk-embedding

# uncertainty: surface.sdk.embedding

## 保留为 `[U]`

- `createAgentSession()` 是否仍支持或曾经计划支持 `continueSession: true`: `packages/coding-agent/src/core/sdk.ts` 的 JSDoc 示例写了 `continueSession: true`,但当前 `CreateAgentSessionOptions` interface 没有该字段;`SessionManager.open()`、`SessionManager.continueRecent()` 和 `AgentSessionRuntime` 提供 continuation/replacement 相关能力。需要维护者确认这是过期示例、遗漏的 option,还是文档意图迁移到显式 `SessionManager` / runtime API。

## 降级为 `[I]` 的推断

- SDK 嵌入使用 coding-agent 产品层默认运行策略包住 `pi-agent-core` 的 `Agent`:源码证明 `new Agent()` 使用 coding-agent 的 auth/settings/provider/tool/session wiring,该句是架构归纳。
- `extensionsResult` 对自定义宿主有用:源码证明返回该对象,用途是基于其命名和 SDK 文档中 extension/runtime 语境的使用推断。
- `SessionManager.inMemory()` 是无持久化运行、`SessionManager.create()` 是 JSONL session 持久化运行:源码证明构造参数 `persist=false/true` 与 session manager 注释,此处是 SDK 调用层面的归纳。
- `SessionManager` 的 tree/branching 语义来自 class-level 注释;节点只把 `create()` / `inMemory()` 的具体持久化构造行作为 `[E]`。
- `surface.modes.rpc`、`subsys.coding-agent.agent-session`、`subsys.coding-agent.http-dispatcher` 的职责分工来自 `index.json` related/source/symbols 和已存在节点内容,不是 `sdk.ts` 内部声明。

## 未展开范围

- 未展开 `createAgentSessionRuntime()`、`createAgentSessionServices()`、`createAgentSessionFromServices()` 的完整 service graph;本节点按 `surface.sdk.embedding` 范围只说明它们与 session replacement/RPC 的边界。
- 未逐项说明 `AgentSession.prompt()` 的 extension command、prompt template、input hook、retry、compaction 和 queue 内部流程;该内容应由 `subsys.coding-agent.agent-session` 覆盖。
- 未列出所有 SDK re-export type 和 tool factory 的字段级目录;本节点只覆盖 embedding 入口所需的主路径。

## surface-sessions-management

---
id: uncertainty.surface.sessions.management
title: surface.sessions.management 不确定项
kind: reference
tier: T3
pkg: coding-agent
source:
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/docs/sessions.md
  - packages/coding-agent/src/cli/session-picker.ts
evidence: unknown
status: draft
updated: 5a073885
---

> 本 staging 记录本轮按 `docs/llm-wiki/pi/index.json` 的 source 核验 `surface.sessions.management` 后,仍不能用三源直接证明的事项。

## 未收敛项

- `[U]` CLI 参数互斥、`--session <path|id>` 的 path-vs-id 解析、全局匹配后是否 fork 到当前 cwd、以及 `--session-id` 形状校验都需要 `packages/coding-agent/src/main.ts` 与 `packages/coding-agent/src/cli/args.ts` 复核;这些文件不在本节点 index source 中。
- `[U]` slash command 到 handler 的完整 dispatch 表未在本节点三源中出现。`/resume`、`/tree`、`/fork`、`/clone` 的用户语义可由 `docs/sessions.md` 证明,但 handler 如何调用 runtime/source storage 需要 `interactive-mode.ts`、`agent-session.ts` 或 runtime 节点复核。
- `[U]` `SessionSelectorComponent` 内部的 threaded/recent/fuzzy 排序、active session 删除拦截、rename UI 和 `parentSessionPath` tree rendering 不在三源中;本节点只保留用户文档层 picker 能力与 `selectSession()` wrapper 行为。
- `[U]` RPC 模式里的 `clone()` / `fork()` wire 命令映射没有在本节点 index source 中出现,应由 `surface.modes.rpc` 或 `surface.modes.rpc-protocol` 覆盖。
- `[U]` `ref.coding-agent.session-format` 的完整 JSONL v3 schema、legacy migration 和所有 entry 类型仍应由 reference 节点补齐;本节点只核会话管理面直接触达的 header、`parentSession`、`session_info`、`branch_summary` 和 root-to-leaf context 投影。

## 本轮处理

- 将主节点 frontmatter `source` 与 `## Sources` 收敛为 index source: `session-manager.ts`、`docs/sessions.md`、`session-picker.ts`。
- 移除或降级所有指向 `args.ts`、`main.ts`、`interactive-mode.ts`、`agent-session-runtime.ts`、`agent-session.ts`、`session-selector.ts`、`docs/session-format.md` 的 `[E]`。
- `surface.sessions.management` 已置为 `status: verified`,表示剩余 `[E]` 均可在本节点 index source 内逐行核到。

## Sources

- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/docs/sessions.md
- packages/coding-agent/src/cli/session-picker.ts

## surface-skills-system

# uncertainty: surface.skills.system

## [U]

- [U] `subsys.agent-core.system-prompt` 的 harness-level prompt formatter 不在 `surface.skills.system` 当前 source 清单内;本节点只能用 `packages/coding-agent/src/core/system-prompt.ts` 明确证明 coding-agent 的 `formatSkillsForPrompt()` 装配路径。是否要把 `packages/agent/src/harness/system-prompt.ts` 加入该 related 节点或本节点 source,留给后续 reconcile。
- [U] `/skill:name` 参数追加语义存在文档/实现不一致:`packages/coding-agent/docs/skills.md` 说 arguments are appended as `User: <args>`,但 `packages/coding-agent/src/core/agent-session.ts` 的 `_expandSkillCommand()` 当前直接追加 trim 后的 `args`,没有加 `User:` 前缀。

## [I]

- [I] `loadSkills()` 被描述为 product-facing loader: 源码能证明它使用 Node fs、`SourceInfo`、默认 global/project 路径和显式 paths;“product-facing”是基于它位于 `packages/coding-agent` 且被 `DefaultResourceLoader` 调用的职责归纳。
- [I] `disable-model-invocation` 被描述为不禁用 `/skill:name`: 源码能证明 system prompt formatter 会过滤该字段,而 `_expandSkillCommand()` 按 loaded skill name 展开时没有检查该字段;没有单独测试直接断言这个 UX 语义。
- [I] `enableSkillCommands=false` 被描述为只影响 interactive autocomplete 注册: 源码能证明 interactive autocomplete 检查该 setting,而 `_expandSkillCommand()` 没有检查;其它入口是否应额外门控属于产品语义推断。
- [I] `AgentSession` command metadata 解释 RPC/外部 UI command list 来源: 源码能证明 loaded skills 被映射成 `SlashCommandInfo`,但不同外部 surface 的消费路径应由对应 surface 节点继续细化。

## surface-trust-model

# uncertainty: surface trust model

- `surface.trust.model` 的 index source 只列 `project-trust.ts`、`trust-manager.ts` 和 `docs/security.md`;本轮已把节点 frontmatter/source 与 `## Sources` 收敛为这三项。此前额外引用的 `settings-manager.ts`、`resource-loader.ts`、`package-manager.ts`、`cli/args.ts`、`main.ts`、interactive components、`docs/settings.md` 未作为本节点 `[E]` 保留。
- `/trust` 命令 UI、保存后是否提示或要求重启、以及是否包含 session-only 选项,需要 `packages/coding-agent/src/modes/interactive/...` 或 `packages/coding-agent/docs/settings.md` 才能显式核验;这些文件不在 index source 内,本节点只保留 `getProjectTrustOptions()` 和 startup prompt 的可验证选项行为。
- settings-manager 对 project settings 的硬 gate、package-manager 对 project package storage/resource collection 的硬 gate、以及 resource-loader 的 pre-trust bootstrap 流程都超出 index source;当前节点只保留 security 文档中“project-local settings/resources/packages/extensions 被 trust 控制”的用户可见结论。
- CLI parser 对 `--approve`/`-a`、`--no-approve`/`-na` 如何写入 `projectTrustOverride` 超出 index source;当前节点只保留 security 文档中“这些 flag 是 one-run override”的用户可见结论。
- runtime 哪些入口把 `projectTrustContext.hasUI` 设为 true/false 超出 index source;当前节点只保留 `resolveProjectTrusted()` 在无 UI ask path 中 fail closed 的源码事实。
- `symbols` 包含 `emitProjectTrustEvent`,但该 symbol 定义在 `packages/coding-agent/src/core/extensions/runner.ts`,不在 index source 三个文件内;本节点只能通过 `project-trust.ts` 的调用点核验 trust resolution 对该事件的使用,完整 extension event API 仍应由 `surface.extensions.api`/extension runner 节点覆盖。
- `AGENTS.md`/`CLAUDE.md` context files 在拒绝 trust 时仍加载这一点来自 security 文档;实际 context file discovery 的所有开关和 fallback 位置不在本节点展开,应由 system prompt/context 相关节点覆盖。

## tools-bash-executor

# Uncertainty staging: tools / bash-executor

Node: `subsys.coding-agent.bash-executor`

本轮没有写入需要同步到 `reference/uncertainty.md` 的 `[U]` 断言。

保留给后续 L2/L3 复核的注意点:

- 本节点 frontmatter `source` 维持 index.json 中的两个权威文件, 但正文为了说明调用点和测试行为引用了 `agent-session.ts`、`rpc-mode.ts`、`extensions/loader.ts` 和两份测试文件。若 wiki 规范要求 frontmatter.source 与所有证据文件完全一致, 需要在 index.json 协调更新 source 列表。
- “本子系统没有分配 PTY” 是对 `bash-executor.ts` 与 `exec.ts` 两个 source 文件的负向归纳, 标为 `[I]`; 若其他调用层为 bash 提供 PTY, 应在 `surface.tools.bash` 或交互模式节点单独说明。

## tools-bash

# uncertainty-tools-bash

本轮填充 `surface.tools.bash` 未新增 `[U]`。关键结论均能落到源码或测试; `executionMode=parallel` 是由 `bash` tool definition 未声明 per-tool override 且 agent-core 默认值为 `parallel` 推出, 已在节点中标 `[I]`。

## tools-edit-engine

# uncertainty-tools-edit-engine

本轮未新增需要上收 `reference/uncertainty.md` 的 `[U]` 项。

说明: `old_string/new_string` 在当前源码中未作为字段名出现; 本节点将其作为用户口语对应到当前 `oldText/newText` 语义, 并用 `[I]` 标注兼容性推断。

## tools-edit

# uncertainty-tools-edit

节点: `surface.tools.edit` (`surface/tools/edit.md`)

本轮已核:

- index entry 的 source/symbols/related 已对照 `docs/llm-wiki/pi/index.json`。
- 内置工具集 ground truth 已核 `packages/coding-agent/src/core/tools/index.ts`。
- 会话装配已核 `packages/coding-agent/src/core/agent-session.ts` 的 `_buildRuntime()` 与 `_refreshToolRegistry()`。
- `executionMode` 未在 `createEditToolDefinition()` 中显式设置; 本节点按 agent 默认 parallel + `withFileMutationQueue()` per-file serialization 解释。

新增 `[U]`: 无。

## tools-file-mutation-queue

# uncertainty: tools file-mutation-queue

- [I] `withFileMutationQueue` appears to be process-local rather than cross-process, because implementation state is a module-level `Map<string, Promise<void>>` plus a module-level registration promise, with no file lock, lockfile, IPC, or shared storage in `packages/coding-agent/src/core/tools/file-mutation-queue.ts`.
- [I] Missing-path aliasing is only resolved by textual `resolve(filePath)` fallback before the file exists; once `realpath()` cannot run, the code cannot prove that two different future paths will land on the same inode.

## tools-find

# uncertainty-tools-find

本轮填充 `surface.tools.find` 未留下需要登记为 `[U]` 的源码不确定项。

- `find` 的 input schema、details shape、默认 `fd` 行为、注册 ground truth、`AgentSession._buildRuntime` 装配、以及省略 `executionMode` 后落入 agent-core 默认执行策略,均已用源码或测试行号标注。
- 未运行 reconcile；按任务要求只做节点级填充。

## tools-grep

# uncertainty-tools-grep

- `surface.tools.grep` 的 `executionMode` 结论是跨 `grep.ts` 未显式声明、`ToolDefinition.executionMode` optional、`Agent.toolExecution` 默认 `"parallel"`、`agent-loop` sequential gate 推出的运行时结论;源码中没有一行直接写 “grep executionMode is parallel”,所以正文标为 `[I]`。
- `--hidden` 与 `.gitignore` 的组合意图来自工具 description 和 ripgrep 参数形态;源码没有专门测试 hidden+ignored 文件矩阵,所以正文只写“意图是搜索 hidden 文件同时仍保留 ignore 规则”并标为 `[I]`。
- 本轮未为 `subsys.coding-agent.output-truncation` 或 `ref.tools-catalog` 创建目标节点;相关链接依据 `index.json` 的 related id 填写。

## tools-ls

# uncertainty-tools-ls

- `surface.tools.ls` 的 `executionMode=parallel` 不是 `ls.ts` 中的显式字段,而是由 `ls` tool definition 未声明 per-tool override、`ToolDefinition.executionMode` optional、`Agent.toolExecution` 默认 `"parallel"`、`agent-loop` 只在全局 sequential 或任一 tool 显式 sequential 时切到顺序执行共同推出;正文已标 `[I]`。
- `ls` 默认不 active 但进入 base tool registry 的结论来自 `AgentSession._buildRuntime()` 同时调用 `createAllToolDefinitions()` 与默认 active names `["read", "bash", "edit", "write"]`;具体哪些 mode/extension 会在运行时启用 `ls` 超出本节点源码范围,正文只概括为 active tool names、allowlist、plan/read-only mode 或 extension/runtime 流程并标 `[I]`。
- `limit <= 0` 返回 `"(empty directory)"` 是按当前循环条件和空结果分支推导的 edge case;未找到专门测试覆盖,正文标 `[I]`。

## tools-output-truncation

# uncertainty-tools-output-truncation

本轮未写入 `[U]` 断言。

已核清的易混点:

- `OutputAccumulator` 的 temp file 写入 raw `Buffer` chunks; direct `executeBashWithOperations()` 的 full-output temp file 写入 sanitized text, 两条路径语义不同。
- `fullOutputPath` 是 bash/direct shell capture 路径的字段; grep/read/find/ls 的 tool details 只声明 `truncation` 和各自 limit flag。
- `takeOverStdout()` 解决 stdout 协议污染, 不参与 `TruncationResult` 计算。

## tools-path-resolution

# uncertainty: tools path resolution

- `resolveToolPath` naming drift: 当前 `5a073885` 源码和 `index.json` symbols 未找到 `resolveToolPath`; 实际工具侧入口是 `resolveToCwd()`、`resolveReadPath()`、`resolveReadPathAsync()` 和 `expandPath()`。节点正文已按源码写为 [U], 后续若有历史文档或未枚举 source 证明 `resolveToolPath` 是旧名/外部 API, 再补充来源。

## tools-read

# uncertainty-tools-read

- none: 本轮填充 `surface/tools/read.md` 时没有留下需要上卷到 `reference/uncertainty.md` 的 `[U]`。主要事实均来自 `read.ts`、`path-utils.ts`、`tools/index.ts` 与 `agent-session.ts`;关于默认并行行为和 blockImages 边界的解释已标为 `[I]`。

## tools-tool-wrapper

# uncertainty-tools-tool-wrapper

本轮未留下需要并入 `reference/uncertainty.md` 的 unknown-evidence 项。`subsystems/coding-agent/tool-wrapper.md` 中关于 wrapper、extension wrapping、events/details/truncation/UI metadata 的论断均已从当前 `pi` 源码行号核到;涉及职责边界或设计动机的解释已在正文标为 `[I]`。

## tools-tools-catalog

# uncertainty: tools-catalog

本轮未发现需要登记到全局 `reference/uncertainty.md` 的 `[U]` 项。`executionMode` 的每工具结论基于七个 built-in `createXToolDefinition` 返回对象未设置该字段,并结合 wrapper 与 agent 默认 `parallel` 得出,正文已标 `[I]`。

## tools-write

# uncertainty · surface.tools.write

- 本轮未留下需要合并进 `reference/uncertainty.md` 的 `[U]` 项。
- 已降级为 `[I]` 的推断: `path` 和 `content` 在 TypeBox object 中是必填字段。源码给出 `Type.Object({ path: Type.String(...), content: Type.String(...) })`,但本页没有额外引用 TypeBox 默认 required 语义的库文档。
- 已降级为 `[I]` 的推断: `write` 没有 tool-result-level `truncation` 或 `fullOutputPath`。源码可核到 `ToolDefinition<typeof writeSchema, undefined>` 与返回 `details: undefined`,但“不存在这些字段”是对该工具返回路径的结构性归纳。
- 已降级为 `[I]` 的推断: `write` 的执行路径没有 patch、search/replace 或局部编辑分支。源码可核到执行路径创建父目录并调用 `ops.writeFile(absolutePath, content)`,但“未出现某类分支”是对函数体的整体审读。
- 已降级为 `[I]` 的推断: `write` 默认可进入 parallel batch execution。源码可核到 `write` 未显式设置 `executionMode`,agent-core 省略时使用默认模式,且 `Agent` 默认 `toolExecution` 为 `"parallel"`;这是跨文件装配归纳,不是单行声明。
- 已降级为 `[I]` 的推断: file mutation queue 的 `finally` 删除保护避免旧调用清掉后来注册的 queue entry。源码可核到只在当前 map entry 仍等于本次 `chainedQueue` 时删除 key,但“避免旧调用清掉后来注册项”是对该保护条件的设计解释。

## tui-autocomplete

# uncertainty-tui-autocomplete

本轮没有写入 `[U]` claim。

## tui-component-model

# uncertainty-tui-component-model

本轮未记录 U 级不确定项。

## 降级为 [I] 的判断

- `TUI extends Container` 说明 runtime 复用 `Container.render()` 的 child aggregation 语义; 代码可见继承与调用链, 但“复用语义”是设计解释。
- component model 像 retained tree + immediate render function 的混合; `children` 与每帧 `render(width)` 可核, 分类术语是解释。
- `isFocusable()` 体现 structural typing 风格的 focus marker; 属性检查可核, 类型风格归纳是解释。
- `Container.render(width)` 是 vertical concatenation, 不是 flex/grid/layout engine; 顺序 append 可核, 排除其它 layout 语义是解释。
- input handler 只更新 state、由 TUI 触发后续 render; 转发后 `requestRender()` 可核, 对 component author 的职责描述是解释。
- component contract 极小、layout/diff/cursor/overlay 集中在 runtime; 各代码位置可核, 设计动机是解释。
- base component 需要自己控制 line width; crash guard 可核, 对作者责任的表达是解释。
- 普通 component 可以保持 render-only, 需要 focus 的 component 才实现 `focused`; interface 可核, 使用建议是解释。
- 未 focus 的 component 不会被 TUI 直接调用 `handleInput`; 当前实现只转发到 `focusedComponent`, 但“不会”限于这条 runtime path。
- `Container.invalidate()` 的 optional chaining 表明 runtime 对结构化对象有宽容度; 代码可核, 兼容性意图是解释。
- `subsys.tui.runtime` 与 `ref.tui.component-types` 的职责边界来自 index related 与节点命名, 相关节点文件本轮尚未存在。

## tui-component-types

# uncertainty-tui-component-types

- `ref.tui.component-types` 本轮 L2 只允许采信 `packages/tui/src/components/` 和 `packages/tui/src/index.ts`;原文关于 `Component` / `Focusable` runtime protocol 的证据来自 `packages/tui/src/tui.ts`,已从本节点硬 `[E]` 结论降级。该 protocol 语义应在允许引用 `tui.ts` 的节点(如 `subsys.tui.component-model`)中核验后再收敛。

## tui-cursor-positioning

# uncertainty-tui-cursor-positioning

本轮填充未留下需要同步到 `reference/uncertainty.md` 的 `[U]` 断言。

## tui-diff-engine

# uncertainty: tui diff-engine

- `subsys.tui.diff-engine` 的 `symbols` 包含 `normalizeTerminalOutput`，但该函数定义在 `packages/tui/src/utils.ts`，而本节点 index/source 只列 `packages/tui/src/tui.ts` 和 `packages/tui/src/terminal.ts`。本轮主文只覆盖 `tui.ts` 中的 import/call site，把定义归属标为 [U]；后续可选择把 `packages/tui/src/utils.ts` 加入该节点 source，或把 `normalizeTerminalOutput` 移到覆盖 utils 的节点。

## tui-editor-component

# uncertainty: subsys.tui.editor-component

本轮未发现需要登记为 `[U]` 的存疑项。

## tui-editor-mechanics

# uncertainty: subsys.tui.editor-mechanics

node: subsys.tui.editor-mechanics

- [U] `PUNCTUATION_REGEX.exec()` in `findWordForward()` may be affected by regex `lastIndex` if the imported regex has a global/sticky flag; this node did not expand `packages/tui/src/utils.ts`, because the assigned source set is limited to `kill-ring.ts`, `undo-stack.ts`, and `word-navigation.ts`.

## tui-fuzzy-match

# uncertainty: subsys.tui.fuzzy-match

本轮填充 `subsys.tui.fuzzy-match` 未留下需要同步到 `reference/uncertainty.md` 的 `[U]` 项。

仅有的非源码直接声明是局部边界或设计取舍推断，已在 `docs/llm-wiki/pi/subsystems/tui/fuzzy-match.md` 用 `[I]` 标注。

## tui-key-codes

# uncertainty: ref.tui.key-codes

batch: tui
node: ref.tui.key-codes
updated: 5a073885

本轮未登记需要同步到 `reference/uncertainty.md` 的 `[U]` 项。

保留为 `[I]` 的边界判断:

- `kpEnter` 是 `CODEPOINTS` 的内部 Kitty keypad Enter codepoint,但不是 `SpecialKey` 暴露的 key identifier;源码可证明 `CODEPOINTS.kpEnter` 存在并格式化为 `enter`,“不暴露单独 kpEnter identifier”是由 `SpecialKey` union 与 `formatParsedKey()` 共同推出的边界判断。
- `ARROW_CODEPOINTS` 与 `FUNCTIONAL_CODEPOINTS` 邻近 `CODEPOINTS`,但不在本任务指定 symbols 中;本节点只简要说明它们不是 `CODEPOINTS` 覆盖范围,未做逐实例 catalog。

## tui-key-parsing

# uncertainty · tui key parsing

本节点暂未登记需要合并到 `reference/uncertainty.md` 的 `[U]` 项。

## tui-key-pipeline

# uncertainty-tui-key-pipeline

本轮未新增 `[U]` 条目。

## tui-keybinding-actions

# uncertainty-tui-keybinding-actions

本轮填充 `ref.tui.keybinding-actions` 未产生 `[U]` 条目。

## tui-keybinding-matching

# uncertainty-tui-keybinding-matching

本轮 L2 核验 `subsys.tui.keybinding-matching` 后保留 1 条 source-scope `[U]`:

- [U] `subsys.coding-agent.keybindings` 的 product-level 展开、`app.*` actions、`keybindings.json` 读取/迁移不在本节点指定 source `packages/tui/src/keys.ts` / `packages/tui/src/keybindings.ts` 内;本节点只能从 TUI source 核到 `KeybindingsManager` 可作为复用边界,具体 coding-agent 行为应在对应节点/source 中复核。

## tui-native-modifiers

# uncertainty-tui-native-modifiers

- `packages/tui/src/native-modifiers.ts` 只暴露 native addon 的加载路径、runtime shape guard 和 failure fallback; `darwin-modifiers.node` 内部如何读取 macOS modifier state 未在该 TypeScript source 中呈现, 因此节点只把 native implementation detail 标为 [U]。

## tui-overlay

# uncertainty: subsys.tui.overlay

本轮未留下需要上升到全局 `reference/uncertainty.md` 的 `[U]` 项。

仅有的非源码直接声明是局部设计意图推断，已在 `docs/llm-wiki/pi/subsystems/tui/overlay.md` 用 `[I]` 标注。

## tui-runtime

# uncertainty-tui-runtime

本轮填充 `subsys.tui.runtime` 未新增不确定项。保留的 inferred 标记仅用于跨节点职责边界和设计意图归纳, 未升级为不确定项。

## tui-stdin-buffer

# uncertainty: subsys.tui.stdin-buffer

本节点未新增 `[U]`。当前存疑只保留为正文中的 `[I]` 推断，等待 L2 review 证伪或确认。

## tui-terminal-capabilities

# Uncertainty: subsys.tui.terminal-capabilities

- [U] `setKittyProtocolActive` is listed in the node symbols, but the requested source list only includes `packages/tui/src/terminal.ts`; in that file it is imported and called, while its definition lives outside the node source. The node documents the terminal-side calls and links the parsing-side semantics to `subsys.tui.key-parsing` rather than expanding the definition file.

## tui-terminal-colors

# uncertainty-tui-terminal-colors

本轮没有新增 `[U]` 存疑项。

## tui-terminal-image

# Uncertainty: subsys.tui.terminal-image

- No unresolved `[U]` claims were added for this node. All load-bearing claims are either anchored to `packages/tui/src/terminal-image.ts` or marked as local inference `[I]` from that file.

## tui-text-utilities

# uncertainty-tui-text-utilities

本轮填充 `subsys.tui.text-utilities` 未新增需要汇总到 `reference/uncertainty.md` 的 `[U]` 项。

