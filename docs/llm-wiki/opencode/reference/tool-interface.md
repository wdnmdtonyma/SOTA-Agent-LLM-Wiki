---
id: ref.tool-interface
title: Tool Interface Reference
kind: reference
tier: T3
v: shared
source:
  - packages/opencode/src/tool/tool.ts
  - packages/core/src/tool/tool.ts
  - packages/core/src/tool/registry.ts
  - packages/core/src/tool/AGENTS.md
  - specs/v2/tools.md
status: verified
updated: 8b68dc0d7
evidence: explicit
symbols:
  - Tool.Context
  - Tool.Def
  - Tool.ExecuteResult
  - Tool.Definition
  - Tool.make
  - Tool.withPermission
related:
  - subsys.tools.v1
  - subsys.tools.v2
---

# Tool Interface Reference

本节点对照 SST opencode 两代本地工具接口。V1 是 `packages/opencode/src/tool/tool.ts` 的 `Def/Context/ExecuteResult`，服务于当前活跑的 Vercel AI SDK session loop；V2 是 `packages/core/src/tool/tool.ts` 的 `Definition/Tool.make/Context`，服务于 Effect-native durable runner 和 tool settlement。V1 与 V2 的字段名、权限位置、输出截断边界都不同，迁移时不能按同名概念直接套用。

## V1

V1 工具定义是一个带公开字段的对象：`id`、静态 `description`、Effect `parameters` schema、可选 `jsonSchema`、`execute`、可选 `formatValidationError` 全部在 `Def` 类型上暴露。[E: packages/opencode/src/tool/tool.ts:55] [E: packages/opencode/src/tool/tool.ts:59] [E: packages/opencode/src/tool/tool.ts:64]

### V1 字段总表

| 实体 | 字段 | 类型/形状 | 语义 |
| --- | --- | --- | --- |
| `DynamicDescription` | function | `(agent: Agent.Info) => Effect.Effect<string>` | 文件里保留的遗留动态描述类型；当前 `Def.description` 字段本身是 `string`。[E: packages/opencode/src/tool/tool.ts:16] [E: packages/opencode/src/tool/tool.ts:60] |
| `Context` | `sessionID` | `SessionID` | 当前 V1 session ID，由 runner 注入给 tool executor。[E: packages/opencode/src/tool/tool.ts:36] [E: packages/opencode/src/tool/tool.ts:37] |
| `Context` | `messageID` | `MessageID` | 发起 tool call 的 message ID；注意文件名 `message-v2.ts` 是 V1 与 AI SDK 消息转换层，不等于 V2 core。[E: packages/opencode/src/tool/tool.ts:38] |
| `Context` | `agent` | `string` | 当前 agent 名称或 ID，供权限与描述逻辑使用。[E: packages/opencode/src/tool/tool.ts:39] |
| `Context` | `abort` | `AbortSignal` | V1 工具用 AbortSignal 接收取消，而 V2 工具依赖 Effect interruption。[E: packages/opencode/src/tool/tool.ts:40] |
| `Context` | `callID?` | `string` | 可选 tool call ID，V1 不把它放进强制字段。[E: packages/opencode/src/tool/tool.ts:41] |
| `Context` | `extra?` | `Record<string, unknown>` | V1 工具可通过 `extra` 携带 runner 专用能力；`task` 工具用它取 `promptOps`。[E: packages/opencode/src/tool/tool.ts:42] [E: packages/opencode/src/tool/task.ts:183] |
| `Context` | `messages` | `SessionV1.WithParts[]` | 当前消息视图直接传给工具，V2 context 不携带消息数组。[E: packages/opencode/src/tool/tool.ts:43] |
| `Context` | `metadata` | `(val: ExecuteResult["metadata"]) => void` | 工具执行中可上报中间 metadata。[E: packages/opencode/src/tool/tool.ts:44] |
| `Context` | `ask` | permission ask callback | V1 叶子工具直接调用 `ask` 发起权限请求。[E: packages/opencode/src/tool/tool.ts:45] |
| `ExecuteResult` | `title` | `string` | 面向 transcript/UI 的短标题。[E: packages/opencode/src/tool/tool.ts:48] [E: packages/opencode/src/tool/tool.ts:49] |
| `ExecuteResult` | `metadata` | `Record<string, any>` | 工具结构化元数据；V1 截断层会向 metadata 追加 `truncated` 与 `outputPath`。[E: packages/opencode/src/tool/tool.ts:50] [E: packages/opencode/src/tool/tool.ts:139] |
| `ExecuteResult` | `output` | `string` | V1 tool 的模型可见主体输出是字符串。[E: packages/opencode/src/tool/tool.ts:51] |
| `ExecuteResult` | `attachments?` | `Omit<SessionV1.FilePart, "id" \| "sessionID" \| "messageID">[]` | V1 tool 可返回文件 attachments，但不携带 session/message identity 字段。[E: packages/opencode/src/tool/tool.ts:52] |
| `Def` | `parameters` | `Schema.Schema<Parameters>` | Effect schema 是校验和 JSON schema 转换的源 schema。[E: packages/opencode/src/tool/tool.ts:61] |
| `Def` | `jsonSchema?` | `JSONSchema7` | 工具可以提供覆盖 schema；registry 在 plugin tool 或特殊转换后使用它。[E: packages/opencode/src/tool/tool.ts:62] [E: packages/opencode/src/tool/registry.ts:290] |
| `Def` | `execute` | `(parameters, ctx) => Effect<ExecuteResult>` | V1 executor 返回 `ExecuteResult`，不是 V2 的 typed domain output。[E: packages/opencode/src/tool/tool.ts:63] |

### V1 执行包装控制流

1. `Tool.define` 在 service 构造时捕获 `Truncate.Service` 与 `Agent.Service`，然后返回 `Info { id, init }`。[E: packages/opencode/src/tool/tool.ts:151] [E: packages/opencode/src/tool/tool.ts:163] [E: packages/opencode/src/tool/tool.ts:164]
2. `Tool.wrap` 初始化 tool info 后，用 `Schema.decodeUnknownEffect` 编译参数 decoder。[E: packages/opencode/src/tool/tool.ts:107] [E: packages/opencode/src/tool/tool.ts:111]
3. wrapper 在真正执行前 decode 原始参数；decode 失败会变成 `InvalidArgumentsError`，并可由 `formatValidationError` 改写错误消息。[E: packages/opencode/src/tool/tool.ts:121] [E: packages/opencode/src/tool/tool.ts:126]
4. 原始 `execute` 返回后，如果 `result.metadata.truncated` 已经存在，V1 wrapper 原样返回，表示 leaf tool 自己已经处理 truncation metadata。[E: packages/opencode/src/tool/tool.ts:130] [E: packages/opencode/src/tool/tool.ts:131]
5. 否则 wrapper 调用 `Truncate.Service.result` 对 `output` 做通用截断，并把 `truncated/outputPath` 写回 metadata。[E: packages/opencode/src/tool/tool.ts:135] [E: packages/opencode/src/tool/tool.ts:139]

### V1 设计含义

V1 的权限、消息访问和输出截断都靠 `Context` 或 wrapper glue 拼装：工具 leaf 拿到 `ask(...)` 自行发权限请求，输出以 string 为中心，wrapper 再统一追加截断 metadata。[E: packages/opencode/src/tool/tool.ts:45] [E: packages/opencode/src/tool/tool.ts:135] 这使 V1 tool registry 能兼容 plugin tool、Zod 参数、legacy JSON schema 和内置工具，但每个 leaf 可以形成局部约定。[E: packages/opencode/src/tool/registry.ts:118] [E: packages/opencode/src/tool/registry.ts:121] [E: packages/opencode/src/tool/registry.ts:354]

## V2

V2 工具定义是 opaque `Definition<Input, Output>`；构造入口是 `Tool.make({ description, input, output, structured?, toStructuredOutput?, execute, toModelOutput? })`，而 codecs、executor 和模型定义派生都藏在 module-private `WeakMap` runtime 里。[E: packages/core/src/tool/tool.ts:20] [E: packages/core/src/tool/tool.ts:40] [E: packages/core/src/tool/tool.ts:69]

### V2 字段总表

| 实体 | 字段 | 类型/形状 | 语义 |
| --- | --- | --- | --- |
| `Context` | `sessionID` | `Session.ID` | durable session identity，runner 传入，registry 不推断。[E: packages/core/src/tool/tool.ts:9] [E: specs/v2/tools.md:48] |
| `Context` | `agent` | `Agent.ID` | provider turn 的有效 agent；权限 leaf 用它构造 policy 输入。[E: packages/core/src/tool/tool.ts:10] |
| `Context` | `assistantMessageID` | `Session.MessageID` | 包含 tool call 的 assistant message durable ID。[E: packages/core/src/tool/tool.ts:12] [E: specs/v2/tools.md:43] |
| `Context` | `toolCallID` | `ToolCall.ID` | 当前 tool call durable ID。[E: packages/core/src/tool/tool.ts:13] [E: specs/v2/tools.md:44] |
| `Config` | `description` | `string` | 静态模型说明；V2 当前 constructor 不接受 V1 式 dynamic description。[E: packages/core/src/tool/tool.ts:45] |
| `Config` | `input` | `Schema.Codec` | decode provider input 的 codec；invalid input 不调用 executor。[E: packages/core/src/tool/tool.ts:46] [E: specs/v2/tools.md:147] |
| `Config` | `output` | `Schema.Codec` | encode executor 返回值的 codec；invalid output 不产生 success settlement。[E: packages/core/src/tool/tool.ts:47] [E: packages/core/src/tool/tool.ts:97] |
| `Config` | `structured?` / `toStructuredOutput?` | optional structured codec/projection | 可把 encoded domain output 投影成 provider-facing structured output；未提供时 structured 与 encoded output 相同。[E: packages/core/src/tool/tool.ts:48] [E: packages/core/src/tool/tool.ts:99] |
| `Config` | `execute` | `(decodedInput, Context) => Effect<Output, ToolFailure>` | leaf executor 只负责 domain output 和 expected model-visible failure。[E: packages/core/src/tool/tool.ts:53] [E: packages/core/src/tool/tool.ts:56] |
| `Config` | `toModelOutput?` | pure projection callback | 把 encoded output 投影为 text/file content；缺省时 string output 才自动转 text content。[E: packages/core/src/tool/tool.ts:57] [E: packages/core/src/tool/tool.ts:125] |
| `Runtime` | `permission?` | `PermissionV2.Action` | 内部 visibility filtering hint；不是 public `Tool.make` 字段。[E: packages/core/src/tool/tool.ts:64] [E: packages/core/src/tool/AGENTS.md:45] |
| `Runtime` | `definition` | `(name) => ToolDefinition` | 根据 registration name 派生 provider-facing definition。[E: packages/core/src/tool/tool.ts:56] [E: packages/core/src/tool/tool.ts:65] |
| `Runtime` | `settle` | `(input, context) => Effect<ToolOutput>` | registry 调用的统一 settlement 边界。[E: packages/core/src/tool/tool.ts:57] |
| `Content` | union | text/file | V2 projection content 支持 text 与 file 两类本地内容。[E: packages/core/src/tool/tool.ts:36] [E: packages/core/src/tool/tool.ts:38] |

### V2 执行包装控制流

1. `Tool.make` 冻结 opaque value，并把 runtime 放入 `WeakMap`，所以外部不能读取 codecs 或 executor。[E: packages/core/src/tool/tool.ts:76] [E: packages/core/src/tool/tool.ts:78]
2. `runtime.definition(name)` 把 registration name、description、input JSON schema、structured/output JSON schema 生成 `ToolDefinition` 并缓存。[E: packages/core/src/tool/tool.ts:79] [E: packages/core/src/tool/tool.ts:86]
3. `settle` 使用 `Schema.decodeUnknown` 解码 provider input；失败映射为 `ToolFailure("Invalid tool input: ...")`。[E: packages/core/src/tool/tool.ts:80] [E: packages/core/src/tool/tool.ts:82]
4. executor 返回的 domain output 立即用 output codec encode；encode 失败映射为 `ToolFailure("Tool returned an invalid value for its output schema: ...")`。[E: packages/core/src/tool/tool.ts:95] [E: packages/core/src/tool/tool.ts:97] [E: packages/core/src/tool/tool.ts:107]
5. 如果配置了 `toModelOutput`，V2 用 projection 的 content；否则只有 encoded string 自动投影成 text content，structured output 由 structured codec/projection 单独产生。[E: packages/core/src/tool/tool.ts:113] [E: packages/core/src/tool/tool.ts:116] [E: packages/core/src/tool/tool.ts:125]
6. `ToolRegistry.settle` 再做 effective registration lookup、stale check、generic output bounding，并把 `outputPaths` 交给 runner 持久化。[E: packages/core/src/tool/registry.ts:50] [E: packages/core/src/tool/registry.ts:75] [E: packages/core/src/tool/registry.ts:79]

### V2 设计含义

V2 设计要求一个 opaque tool type、一个 executor、codec boundary、scoped registration 和 stale rejection；spec 明确说 `Tool.Definition` 的 schemas/executor 不是 public fields，registry 私下派生模型 definition 与解释 invocations。[E: specs/v2/tools.md:31] V2 leaf 不接收 `ask` helper；trusted built-ins 捕获 `PermissionV2.Service`，自己按 canonical invocation context 构造 permission source。[E: packages/core/src/tool/AGENTS.md:18] [E: packages/core/src/tool/AGENTS.md:28] Registry 不拥有 execution authorization，它只用 internal permission action 做 whole-tool definition filtering。[E: packages/core/src/tool/AGENTS.md:43] [E: packages/core/src/tool/AGENTS.md:45]

## V1 / V2 迁移对照

| 维度 | V1 `packages/opencode/src/tool/tool.ts` | V2 `packages/core/src/tool/tool.ts` |
| --- | --- | --- |
| 公开定义 | `Def` 公开 `id/description/parameters/jsonSchema/execute`。[E: packages/opencode/src/tool/tool.ts:55] | `Definition` opaque，runtime 藏在 WeakMap。[E: packages/core/src/tool/tool.ts:20] [E: packages/core/src/tool/tool.ts:69] |
| 命名 | `Def.id` 是 tool 自身字段。[E: packages/opencode/src/tool/tool.ts:59] | registration record key 是 effective model-facing name；tool value 本身没有 intrinsic name。[E: specs/v2/tools.md:56] [E: specs/v2/tools.md:67] |
| 输入 schema | Effect schema plus optional JSON schema override。[E: packages/opencode/src/tool/tool.ts:61] [E: packages/opencode/src/tool/tool.ts:62] | input codec 是 constructor 字段，JSON schema 从 codec 私下派生。[E: packages/core/src/tool/tool.ts:46] [E: packages/core/src/tool/tool.ts:158] |
| 输出 | `ExecuteResult.output` 是 string，attachments 可选。[E: packages/opencode/src/tool/tool.ts:51] [E: packages/opencode/src/tool/tool.ts:52] | executor 返回 typed output；model-facing structured/content 由 settlement 投影。[E: packages/core/src/tool/tool.ts:95] [E: packages/core/src/tool/tool.ts:113] |
| 权限 | leaf 经 `ctx.ask(...)` 请求 V1 permission。[E: packages/opencode/src/tool/tool.ts:45] | leaf 捕获 `PermissionV2.Service`，registry 不注入 permission helper。[E: specs/v2/tools.md:131] |
| 截断 | `Tool.wrap` 调用 `Truncate.Service.result`，把 `truncated/outputPath` 写进 metadata。[E: packages/opencode/src/tool/tool.ts:135] [E: packages/opencode/src/tool/tool.ts:139] | Registry settlement 是唯一 generic model-output bounding 边界，domain output 不携带 retention bookkeeping。[E: packages/core/src/tool/AGENTS.md:49] [E: specs/v2/tools.md:155] |
| 取消 | `Context.abort` 是 AbortSignal。[E: packages/opencode/src/tool/tool.ts:40] | spec 要求 Effect interruption 是取消机制。[E: specs/v2/tools.md:52] |
| stale call | V1 Def 没有 advertised registration identity 检查字段。[I] | materialization captures effective registration identity；stale call rejects before handler invocation。[E: specs/v2/tools.md:151] |

## Sources

- packages/opencode/src/tool/tool.ts
- packages/core/src/tool/tool.ts
- packages/core/src/tool/registry.ts
- packages/core/src/tool/AGENTS.md
- specs/v2/tools.md

## Related

- subsys.tools.v1
- subsys.tools.v2
