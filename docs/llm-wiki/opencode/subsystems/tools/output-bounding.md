---
id: subsys.tools.output-bounding
title: 工具输出截断与保留(V1 truncate / V2 output-store)
kind: subsystem
tier: T2
v: shared
status: verified
updated: 8b68dc0d7
source:
  - packages/opencode/src/tool/truncate.ts
  - packages/core/src/tool-output-store.ts
  - packages/core/src/config/tool-output.ts
related:
  - subsys.tools.v1
  - subsys.tools.v2
---

> 工具输出 bounding 的 V1 实现是 `Truncate.Service`，V2 实现是 `ToolOutputStore.Service`；两代默认都是 2000 行、50KB、7 天保留，但边界位置和 preview 策略不同。

## 能回答的问题

- V1 和 V2 的默认 max lines/max bytes/retention 在哪里定义。
- V1 为什么 shell output 可以保存完整输出到 truncation file，V2 为什么 settlement 后有 `outputPaths`。
- V1 是 head/tail 单向裁剪，V2 为什么保留 beginning 和 end。
- V2 为什么把 output bounding 放在 registry settle 后，而不是 leaf tool 内部。

## 1 职责与边界

### V1

V1 `Truncate.Service` 是当前 V1 tool output 的通用截断/保留服务：它解析 `tool_output` config limit，判断文本是否超出行数或字节上限，超出时把完整文本写入 truncation directory，再返回带提示的 preview。[E: packages/opencode/src/tool/truncate.ts:40][E: packages/opencode/src/tool/truncate.ts:75][E: packages/opencode/src/tool/truncate.ts:127]

### V2

V2 `ToolOutputStore.Service` 是 core registry settlement 的 model-output bounding 服务：它接收完整 `ToolOutput`，测量 provider-facing textual projection 或 structured JSON preview，超限时写 managed tool-output file，并返回 bounded `ToolOutput` 和 typed `outputPaths`。[E: packages/core/src/tool-output-store.ts:48][E: packages/core/src/tool-output-store.ts:138][E: packages/core/src/tool-output-store.ts:142][E: packages/core/src/tool-output-store.ts:149][E: packages/core/src/tool-output-store.ts:158][E: packages/core/src/tool-output-store.ts:163][E: packages/core/src/tool-output-store.ts:167][E: packages/core/src/tool-output-store.ts:172][E: specs/v2/tools.md:157]

## 2 关键文件

| 文件 | 作用 |
| --- | --- |
| `packages/opencode/src/tool/truncate.ts` | V1 truncation service，负责 limit、head/tail preview、完整输出落盘、清理。 |
| `packages/core/src/tool-output-store.ts` | V2 tool output store，负责 settlement-level bound、managed output paths、retention cleanup。 |
| `packages/core/src/config/tool-output.ts` | V2 config schema：`max_lines`, `max_bytes`。 |
| `packages/core/src/tool/registry.ts` | V2 registry settle 调用 `ToolOutputStore.bound` 的位置。 |
| `CONTEXT.md` | V2 glossary 和 design constraints，定义 Model Tool Output 与 Managed Tool Output File。 |
| `specs/v2/tools.md` | V2 tools spec，规定 output bounding 在 projection 后、generic settlement boundary。 |

## 3 数据模型

| 实体 | V1 | V2 |
| --- | --- | --- |
| 默认行数 | `MAX_LINES = 2000`。[E: packages/opencode/src/tool/truncate.ts:15] | `MAX_LINES = 2_000`。[E: packages/core/src/tool-output-store.ts:13] |
| 默认字节 | `MAX_BYTES = 50 * 1024`。[E: packages/opencode/src/tool/truncate.ts:16] | `MAX_BYTES = 50 * 1024`。[E: packages/core/src/tool-output-store.ts:14] |
| 保留时间 | `RETENTION = Duration.days(7)`。[E: packages/opencode/src/tool/truncate.ts:13] | `RETENTION = Duration.days(7)`。[E: packages/core/src/tool-output-store.ts:15] |
| result | `{ content, truncated }` 或 `{ content, truncated, outputPath }`。[E: packages/opencode/src/tool/truncate.ts:20] | `{ output, outputPaths }`。[E: packages/core/src/tool-output-store.ts:25] |
| config | V1 从 config `tool_output.max_lines/max_bytes` 读，缺省用常量。[E: packages/opencode/src/tool/truncate.ts:79] | V2 config schema `max_lines/max_bytes`，store 从 document entries 合并配置。[E: packages/core/src/config/tool-output.ts:7][E: packages/core/src/config/tool-output.ts:8][E: packages/core/src/tool-output-store.ts:117][E: packages/core/src/tool-output-store.ts:121][E: packages/core/src/tool-output-store.ts:126] |
| storage dir | `TRUNCATION_DIR`。[E: packages/opencode/src/tool/truncate.ts:17] | `MANAGED_DIRECTORY = "tool-output"` under global data。[E: packages/core/src/tool-output-store.ts:17][E: packages/core/src/tool-output-store.ts:118] |

## 4 控制流

### V1

1. 调用方请求 `Truncate.output(text, options, agent)`。[E: packages/opencode/src/tool/truncate.ts:85]
2. service 读取 config limits，缺省为 2000/50KB。[E: packages/opencode/src/tool/truncate.ts:75][E: packages/opencode/src/tool/truncate.ts:80]
3. 如果行数和 UTF-8 字节都在上限内，原样返回 `truncated: false`。[E: packages/opencode/src/tool/truncate.ts:93]
4. 否则按 `direction` 选择 head 或 tail preview，默认 direction 是 head。[E: packages/opencode/src/tool/truncate.ts:89][E: packages/opencode/src/tool/truncate.ts:102][E: packages/opencode/src/tool/truncate.ts:112]
5. 计算 removed bytes/lines，写完整文本到 truncation directory。[E: packages/opencode/src/tool/truncate.ts:124][E: packages/opencode/src/tool/truncate.ts:127]
6. 根据 agent 是否有 task tool 生成不同 hint，返回带 `outputPath` 的 truncated result。[E: packages/opencode/src/tool/truncate.ts:129][E: packages/opencode/src/tool/truncate.ts:133][E: packages/opencode/src/tool/truncate.ts:139]
7. cleanup fiber 延迟 1 分钟启动，每小时清理超过 7 天的 `tool_` 文件。[E: packages/opencode/src/tool/truncate.ts:54][E: packages/opencode/src/tool/truncate.ts:55][E: packages/opencode/src/tool/truncate.ts:59][E: packages/opencode/src/tool/truncate.ts:63][E: packages/opencode/src/tool/truncate.ts:64][E: packages/opencode/src/tool/truncate.ts:143][E: packages/opencode/src/tool/truncate.ts:145][E: packages/opencode/src/tool/truncate.ts:146]

### V2

1. Registry settle 得到 leaf tool 的完整 `ToolOutput` 后调用 `resources.bound({ sessionID, toolCallID, output })`。[E: packages/core/src/tool/registry.ts:62][E: packages/core/src/tool/registry.ts:75]
2. `ToolOutputStore.bound` 读取 limits。[E: packages/core/src/tool-output-store.ts:138][E: packages/core/src/tool-output-store.ts:139]
3. 如果 output content 为空，V2 把 structured output JSON stringify 为 contextual text；否则只拼接 text content，并把 media/file content 单独保留。[E: packages/core/src/tool-output-store.ts:142][E: packages/core/src/tool-output-store.ts:145][E: packages/core/src/tool-output-store.ts:148][E: packages/core/src/tool-output-store.ts:140]
4. contextual text 如果行数和字节都在 limit 内，返回原 output 和空 `outputPaths`。[E: packages/core/src/tool-output-store.ts:149][E: packages/core/src/tool-output-store.ts:153][E: packages/core/src/tool-output-store.ts:155]
5. 超限时写完整 contextual text 到 shared `tool-output/tool_<id>` 文件。[E: packages/core/src/tool-output-store.ts:129][E: packages/core/src/tool-output-store.ts:158]
6. 构造 marker，把 bounded preview 放进 text content，同时保留 structured output 和 media parts，返回 `outputPaths: [outputPath]`。[E: packages/core/src/tool-output-store.ts:159][E: packages/core/src/tool-output-store.ts:161][E: packages/core/src/tool-output-store.ts:167][E: packages/core/src/tool-output-store.ts:172]
7. V2 cleanup 每小时扫描 managed directory，删除 mtime 超过 retention 的 `tool_` 文件。[E: packages/core/src/tool-output-store.ts:176][E: packages/core/src/tool-output-store.ts:177][E: packages/core/src/tool-output-store.ts:180][E: packages/core/src/tool-output-store.ts:187][E: packages/core/src/tool-output-store.ts:200][E: packages/core/src/tool-output-store.ts:203]

## 5 V1 / V2 对照

| 维度 | V1 | V2 |
| --- | --- | --- |
| bounding 位置 | leaf wrapper 和 MCP bridge 调用 `Truncate.output`；shell 使用 Truncate limits/write 加 shell-local tail bounding。[E: packages/opencode/src/tool/tool.ts:135][E: packages/opencode/src/session/tools.ts:457][E: packages/opencode/src/tool/shell.ts:438][E: packages/opencode/src/tool/shell.ts:569][E: packages/opencode/src/tool/shell.ts:572] | registry settlement 后统一调用 ToolOutputStore。[E: packages/core/src/tool/registry.ts:75] |
| preview 策略 | head 或 tail，默认 head；shell 用 local `tail(...)` 生成结尾 preview。[E: packages/opencode/src/tool/truncate.ts:89][E: packages/opencode/src/tool/shell.ts:569] | beginning + end，行数/字节大致对半分配。[E: packages/core/src/tool-output-store.ts:74][E: packages/core/src/tool-output-store.ts:93] |
| 完整输出文件 | `Truncate.write` 写 `TRUNCATION_DIR/ToolID.ascending()`。[E: packages/opencode/src/tool/truncate.ts:68] | `ToolOutputStore.write` 写 global data 下 `tool-output/tool_<Identifier>`。[E: packages/core/src/tool-output-store.ts:129] |
| path 暴露 | `Truncate.output` result 含 `outputPath`，V1 wrapper/MCP bridge/shell 可把它复制到 metadata；preview 文本也直接提示 full output path。[E: packages/opencode/src/tool/truncate.ts:129][E: packages/opencode/src/tool/truncate.ts:139][E: packages/opencode/src/tool/tool.ts:141][E: packages/opencode/src/tool/tool.ts:142][E: packages/opencode/src/session/tools.ts:461][E: packages/opencode/src/tool/shell.ts:579][E: packages/opencode/src/tool/shell.ts:591] | V2 settlement 有 typed `outputPaths`，bounded preview marker 也包含 path。[E: packages/core/src/tool/registry.ts:80][E: packages/core/src/tool-output-store.ts:159] |
| structured output | V1 主要处理 string output。[E: packages/opencode/src/tool/truncate.ts:40] | V2 保留 structured unchanged，model replay 用 bounded textual JSON preview。[E: packages/core/src/tool-output-store.ts:163][E: packages/core/src/tool-output-store.ts:145][E: specs/v2/tools.md:157] |

## 6 设计动机与 tradeoff

- V2 glossary 将 Model Tool Output 定义为 bounded projection，Tool Registry enforce final size limit；Managed Tool Output File 是共享目录下临时文件。[E: CONTEXT.md:55][E: CONTEXT.md:58]
- V2 spec 要求 tools 返回完整 validated domain output，generic settlement boundary 再 bounding provider-facing channel；managed paths 不出现在 `Tool.make` schema 或 projection callback 里。[E: specs/v2/tools.md:155][E: specs/v2/tools.md:157]
- V2 spec/source 规定一个 tool settlement 用一个 aggregate textual limit，超过 lines 或 UTF-8 bytes 任一上限即 bound；generic truncation 保留 beginning and end。[E: specs/v2/tools.md:157][E: packages/core/src/tool-output-store.ts:74][E: packages/core/src/tool-output-store.ts:93][E: packages/core/src/tool-output-store.ts:149][E: packages/core/src/tool-output-store.ts:151]
- V1 的 truncation 更靠近调用方，因此 shell 可以用 tail preview 并先做进程输出 capture/spooling 限制；这类 producer boundary limit 在 V2 spec 中被明确区分为 producer memory management，而不是 model-output truncation。[E: packages/opencode/src/tool/shell.ts:438][E: packages/opencode/src/tool/shell.ts:498][E: packages/opencode/src/tool/shell.ts:505][E: packages/opencode/src/tool/shell.ts:579][E: specs/v2/tools.md:159]
- V2 的一个潜在代价是 retained file 写入失败会让 settlement 产生 storage error；spec 明确 complete retention fails 时 settlement fails operationally，而不是发布 lossy success。[E: specs/v2/tools.md:157][I] 当前 store `write` failure 会走 `StorageError`，所以本节点以当前源码和 spec 为准。[E: packages/core/src/tool-output-store.ts:129][E: packages/core/src/tool-output-store.ts:158][I]

## 7 Gotchas

- `read` 工具的 2000 行/50KB 文本分页不是本节点的 generic tool output bounding；`read` 自己在文件读取层分页。[E: packages/opencode/src/tool/read.ts:13][E: packages/opencode/src/tool/read.ts:16][E: packages/opencode/src/tool/read.ts:164][E: packages/core/src/tool/read-filesystem.ts:11][E: packages/core/src/tool/read-filesystem.ts:12][E: packages/core/src/tool/read-filesystem.ts:201][E: packages/core/src/tool/read-filesystem.ts:214]
- V1 shell 大输出完整文件是 shell/truncate 合作产生的，不能推断所有 V1 工具都一定有 `outputPath` metadata。[E: packages/opencode/src/tool/shell.ts:505][E: packages/opencode/src/tool/shell.ts:515][E: packages/opencode/src/tool/shell.ts:579][E: packages/opencode/src/tool/shell.ts:591][E: packages/opencode/src/tool/tool.ts:131][E: packages/opencode/src/tool/tool.ts:141][E: packages/opencode/src/tool/tool.ts:142]
- V2 managed output file 是 temporary，bounded Model Tool Output 才是 durable replayable record。[E: CONTEXT.md:55][E: CONTEXT.md:58]
- Provider-executed tool results 不走 generic Tool Registry bounding；runner 在 `providerExecuted` tool-call 上直接返回,所以 provider-native transcript facts 保持在 provider stream 路径中。[E: packages/core/src/session/runner/llm.ts:238][I]

## Sources

- `packages/opencode/src/tool/truncate.ts`
- `packages/opencode/src/tool/tool.ts`
- `packages/opencode/src/session/tools.ts`
- `packages/opencode/src/tool/shell.ts`
- `packages/opencode/src/tool/read.ts`
- `packages/core/src/tool-output-store.ts`
- `packages/core/src/config/tool-output.ts`
- `packages/core/src/tool/registry.ts`
- `packages/core/src/tool/read-filesystem.ts`
- `CONTEXT.md`
- `specs/v2/tools.md`

## 相关

- [V1 工具系统](v1.md)
- [V2 工具系统](v2.md)
