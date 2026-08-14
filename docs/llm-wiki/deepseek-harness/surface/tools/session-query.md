---
id: surface.tools.session-query
title: session_* 查询五件套
kind: tool
tier: T1
pkg: persistence
source:
  - packages/session-query/tool-session-query/src/index.ts
  - packages/session-query/tool-session-query/src/operations.ts
  - packages/session-query/tool-session-query/src/input.ts
  - packages/session-query/tool-session-query/src/presentation.ts
  - packages/session-query/tool-session-query/src/workspace-access.ts
  - packages/session-query/tool-session-query/src/service-boundary.ts
  - packages/session-query/tool-session-query/package.json
  - packages/session-query/tool-session-query/tests/tool-session-query.spec.ts
  - packages/session-query/tool-session-query/tests/sqlite-integration.spec.ts
  - packages/session-query/session-query/src/index.ts
  - packages/session-query/session-query/src/config.ts
  - packages/session-query/session-query/src/types.ts
  - packages/session-query/session-query/src/tracing.ts
  - packages/session-query/session-query/package.json
  - packages/session-query/session-query-sqlite/src/index.ts
  - packages/session-query/session-query-sqlite/package.json
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/spill/spill-policy/src/index.ts
  - packages/util/timeout/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
  - examples/acp-agent/session-query.cordis.yml
  - examples/acp-agent/fs.cordis.yml
symbols:
  - session_search
  - session_trace
  - session_event_read
  - session_event_search
  - session_event_trace
  - apply
  - name
  - inject
  - Config
  - DEFAULT_MAX_SEARCH_RESULTS
  - DEFAULT_SEARCH_TIMEOUT_MS
  - operations
  - toolInput
  - workspaceAccess
  - SessionQueryEngine
related:
  - spine.tool-call-anatomy
  - spine.trace-code-mode
  - ref.tools-catalog
  - subsys.persistence.session-query
evidence: explicit
status: verified
updated: 47f943859b
---

> `session_search` / `session_trace` / `session_event_search` / `session_event_trace` / `session_event_read` 是 `@deepseek-ai/dsh-tool-session-query` 向模型登记的 **workspace-authorized** 会话历史查询五件套：跨会话全文检索、会话谱系、单会话事件检索、事件替换关系、以及无删节事件读。

## 能回答的问题

- 五个 wire `name`、实现包、`inject`、`defineTool` 注册点分别是什么？模型 schema 里有没有 `cursor` / `limit` / `cwd`？
- `session_search` 与 `session_event_search` 的字段差在哪？`session_trace` / `session_event_trace` / `session_event_read` 各自必填什么？
- 默认 `maxSearchResults = 100`、`searchTimeoutMs = 30000` 挂在哪些名字上？输出会不会自己 spill？
- 消费的 `ctx.sessionQuery` 是谁提供的？换 SQLite provider / `openAt: never` 会带走什么？workspace 授权按什么比？
- 四个 shipped preset（`minimal` / `standard` / `code` / `cordis`）装不装这组工具？要 opt-in 该挂哪一行？
- `execute()` 怎样排除当前 session、怎样用最新 `step/start` 截断本会话搜索、祖先越界如何打码？

## Identity

实现包是 `@deepseek-ai/dsh-tool-session-query`。Cordis 插件名 `export const name = 'tool-session-query'`。`inject = ['tools', 'systemPrompt', 'sessionQuery']`：没有 `ctx.sessionQuery` 时插件保持 pending，catalog 里不会出现下面五个名字。[E: packages/session-query/tool-session-query/package.json:2][E: packages/session-query/tool-session-query/src/index.ts:17][E: packages/session-query/tool-session-query/src/index.ts:20]

`apply(ctx, config)` 先解析 `maxSearchResults` / `searchTimeoutMs`，再挂一条 `systemPrompt` section（名 `tool:session-query`，order `113`），然后连续五次 `ctx.tools.register(defineTool({ … }))`。[E: packages/session-query/tool-session-query/src/index.ts:58][E: packages/session-query/tool-session-query/src/index.ts:61][E: packages/session-query/tool-session-query/src/index.ts:66]

五个 wire 名必须同时出现。注册顺序与 `ctx.tools.schemas()` 默认顺序如下；测试按这个数组做精确相等，而不是子集包含。[E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:241]

| wire `name` | 工厂 / 注册点 | 调度 | `timeoutMs` |
|---|---|---|---|
| `session_search` | `defineTool({ name: 'session_search' })` → `operations.executeSessionSearch` | 未声明 `isConcurrencySafe` → exclusive | `resolved.searchTimeoutMs` [E: packages/session-query/tool-session-query/src/index.ts:67][E: packages/session-query/tool-session-query/src/index.ts:71] |
| `session_event_search` | `defineTool({ name: 'session_event_search' })` → `operations.executeEventSearch` | exclusive | `resolved.searchTimeoutMs` [E: packages/session-query/tool-session-query/src/index.ts:77][E: packages/session-query/tool-session-query/src/index.ts:81] |
| `session_trace` | `defineTool({ name: 'session_trace' })` → `operations.executeSessionTrace` | `isConcurrencySafe: () => true` → parallel | 未声明 [E: packages/session-query/tool-session-query/src/index.ts:87][E: packages/session-query/tool-session-query/src/index.ts:91] |
| `session_event_trace` | `defineTool({ name: 'session_event_trace' })` → `operations.executeEventTrace` | parallel | 未声明 [E: packages/session-query/tool-session-query/src/index.ts:97][E: packages/session-query/tool-session-query/src/index.ts:104] |
| `session_event_read` | `defineTool({ name: 'session_event_read' })` → `operations.executeEventRead` | parallel | 未声明 [E: packages/session-query/tool-session-query/src/index.ts:110][E: packages/session-query/tool-session-query/src/index.ts:119] |

`presentCall` 全部走 `presentation` 的 generic 卡片：两个 search 是 `card: 'generic' / kind: 'search'`；三条精确观察是 `kind: 'read'`。`output` 共用 `TEXT_OUTPUT`：规范值是 `string`，`render` 包成单段 `{ type: 'text', text }`。[E: packages/session-query/tool-session-query/src/index.ts:47][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:263][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:267]

插件 dispose 会撤掉五个 schema 和 `tool:session-query` prompt section。[E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:285]

## 用途定位

这组工具让模型在**同一 workspace（caller `session.header.cwd`）**里回看历史，而不是读磁盘上的 JSONL 文件，也不是 CLI slash command。五个名字分工固定：

- `session_search`：跨会话全文检索，每个命中会话只交回**最强一条** event 摘要；永远排除 caller 自己。[E: packages/session-query/tool-session-query/src/index.ts:68][E: packages/session-query/tool-session-query/src/operations.ts:100]
- `session_event_search`：在一个已授权 session 里搜 event；目标是当前 session 时，结果被截到最新 `step/start` **之前**，避免把本步正在写的 log 搜回来。[E: packages/session-query/tool-session-query/src/index.ts:78][E: packages/session-query/tool-session-query/src/operations.ts:135]
- `session_trace`：读一条会话的祖先链与子孙树，越出 workspace 的节点打成 `[outside workspace boundary]` / `[outside workspace subtree]`，不泄漏外站 id。[E: packages/session-query/tool-session-query/src/presentation.ts:126][E: packages/session-query/tool-session-query/src/presentation.ts:141]
- `session_event_trace`：读一条 event 的 positional replacement 链、它替换掉的 seq、它引用的 source seq、以及直接派生它的后续 seq。[E: packages/session-query/session-query/src/tracing.ts:100]
- `session_event_read`：读一条**完整** event 的 JSON，外加可选邻居的语义摘要（不是第二份完整 JSON）。[E: packages/session-query/tool-session-query/src/presentation.ts:175]

授权单位是 **cwd 字符串相等**，不是文件系统 realpath，也不是「同一用户」。caller 没有 cwd 时，跨会话搜索直接失败；精确观察的 `authorizeTarget` 对 self 直接放行，对其它 id 在缺 cwd 时立刻 `unauthorizedTarget`。[E: packages/session-query/tool-session-query/src/operations.ts:63][E: packages/session-query/tool-session-query/src/workspace-access.ts:79][E: packages/session-query/tool-session-query/src/workspace-access.ts:81]

模型 schema **不**广告 `cursor` / `limit` / `cwd`。内部 `collectPages` 自己把 provider 的分页抽干，再按部署 cap 截断。[E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:248][E: packages/session-query/tool-session-query/src/operations.ts:239]

## 输入 schema

以插件**默认 Config** boot 后的模型可见参数为准。`defineTool` 把 `parameters` 编成隐式开放 object；标了 `required: true` 的字段进入 JSON Schema `required`。[E: packages/core/tools/src/schema.ts:451][E: packages/session-query/tool-session-query/src/input.ts:45]

部署 Config 只改搜索 cap 与搜索 deadline，**不改字段名**。四个 shipped preset 都不挂本插件，因此没有 yml 级 Config 覆盖。

| Config 键 | 默认常量 | 作用 |
|---|---|---|
| `maxSearchResults` | `DEFAULT_MAX_SEARCH_RESULTS` = `100` | `session_search` / `session_event_search` 一次调用最多留下的**已授权** hit 数；不是 provider 页大小。[E: packages/session-query/tool-session-query/src/index.ts:23][E: packages/session-query/tool-session-query/src/index.ts:38] |
| `searchTimeoutMs` | `DEFAULT_SEARCH_TIMEOUT_MS` = `30_000` | 只写进两个 search 工具的 `timeoutMs`。上限是 `MAX_TIMER_DELAY_MS`（`2147483647`）。[E: packages/session-query/tool-session-query/src/index.ts:26][E: packages/session-query/tool-session-query/src/index.ts:39][E: packages/util/timeout/src/index.ts:25] |

非正 / 非整数 Config 在 `resolveConfig` 里抛 `TypeError`，五个名字都不会登记。[E: packages/session-query/tool-session-query/src/index.ts:129][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:314]

ISO 时间字段必须带 `Z` 或数字 offset（`2026-07-24T10:00:00` 这种 naive 本地串会被拒）。空数组过滤、空白 query、NUL query、颠倒区间都是 execute 期 `SESSION_QUERY_INVALID_QUERY` / `SESSION_QUERY_INVALID_FILTER`；enum 写错则 registry 先报 `INVALID_ARGS`。[E: packages/session-query/tool-session-query/src/input.ts:179][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:334]

### `session_search`

参数对象是 `toolInput.sessionSearchParameters`。[E: packages/session-query/tool-session-query/src/index.ts:69][E: packages/session-query/tool-session-query/src/input.ts:45]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `query` | `string` | 是 | 无 | trim 后非空、不含 `\0`；空白折叠成单空格 | 字面全文检索，不是正则。[E: packages/session-query/tool-session-query/src/input.ts:46][E: packages/session-query/tool-session-query/src/input.ts:126] |
| `session_ids` | `string[]` | 否 | 无 | 给出则至少一项 | 编成 `kind: 'id'` filter。[E: packages/session-query/tool-session-query/src/input.ts:47] |
| `created_at_from` / `created_at_to` | `string` | 否 | 无 | timezone-qualified ISO 8601；`from <= to` | 会话 `createdAt` 闭区间。[E: packages/session-query/tool-session-query/src/input.ts:48] |
| `parent_session_ids` | `string[]` | 否 | 无 | 给出则至少一项；未授权 id 在进 FTS 前被丢掉 | 与 `include_root_sessions` 合成一条 `kind: 'parent'`（`null` 表示 root）。[E: packages/session-query/tool-session-query/src/input.ts:50][E: packages/session-query/tool-session-query/src/operations.ts:87] |
| `include_root_sessions` | `boolean` | 否 | 无 | `true` 才把 `null` parent 加进 filter | 单独为 true 时只搜 root。[E: packages/session-query/tool-session-query/src/input.ts:51] |
| `availability` | `string[]` | 否 | 无 | enum `live` / `persisted`；给出则至少一项 | 要求命中记录具备其中一种来源。[E: packages/session-query/tool-session-query/src/input.ts:52] |
| `event_seq_from` / `event_seq_to` | `integer` | 否 | 无 | 非负安全整数；`from <= to` | 限制「用来打分的 event」seq 窗，不是会话 id 窗。[E: packages/session-query/tool-session-query/src/input.ts:57] |
| `event_time_from` / `event_time_to` | `string` | 否 | 无 | 同 ISO 规则 | 限制打分 event 的时间窗。[E: packages/session-query/tool-session-query/src/input.ts:59] |
| `event_types` | `string[]` | 否 | 无 | 给出则至少一项 | 打分 event 的 `type`。[E: packages/session-query/tool-session-query/src/input.ts:61] |
| `event_surfaces` | `string[]` | 否 | 无 | enum `current` / `shadowed` / `log-only` | 打分 event 的 surface。[E: packages/session-query/tool-session-query/src/input.ts:62] |

execute 还会**无条件**追加 `{ kind: 'cwd', values: [caller.header.cwd] }`。模型不能改 cwd，也不能把搜索扩到别的工作区。[E: packages/session-query/tool-session-query/src/operations.ts:89]

### `session_event_search`

参数对象是 `toolInput.eventSearchParameters`。字段名是 `seq_*` / `time_*` / `surfaces`，**不是** `event_seq_*` / `event_surfaces`。[E: packages/session-query/tool-session-query/src/index.ts:79][E: packages/session-query/tool-session-query/src/input.ts:69]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `session_id` | `string` | 否 | caller 自己的 session id | 合法 `SessionId` | 省略 = 当前会话。[E: packages/session-query/tool-session-query/src/input.ts:70][E: packages/session-query/tool-session-query/src/workspace-access.ts:70] |
| `query` | `string` | 是 | 无 | 与 `session_search` 同一套 `normalizeQuery` | 单会话全文检索。[E: packages/session-query/tool-session-query/src/input.ts:71] |
| `seq_from` / `seq_to` | `integer` | 否 | 无 | 非负安全整数 | schema 只声明闭区间。当前会话的截断在 execute：`range.to = min(用户 to, latest step/start.seq - 1)`。[E: packages/session-query/tool-session-query/src/input.ts:72][E: packages/session-query/tool-session-query/src/operations.ts:135] |
| `time_from` / `time_to` | `string` | 否 | 无 | timezone-qualified ISO 8601 | event 时间闭区间。[E: packages/session-query/tool-session-query/src/input.ts:74] |
| `event_types` | `string[]` | 否 | 无 | 给出则至少一项 | 事件类型白名单。[E: packages/session-query/tool-session-query/src/input.ts:76] |
| `surfaces` | `string[]` | 否 | 无 | enum `current` / `shadowed` / `log-only` | 事件 surface 白名单。[E: packages/session-query/tool-session-query/src/input.ts:77] |

### `session_trace`

参数只有 `toolInput.targetSessionParameter`。[E: packages/session-query/tool-session-query/src/index.ts:89][E: packages/session-query/tool-session-query/src/input.ts:84]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `session_id` | `string` | 否 | caller 自己 | 合法 `SessionId` | 省略则 trace 当前会话。[E: packages/session-query/tool-session-query/src/input.ts:85] |

### `session_event_trace`

在 `targetSessionParameter` 上再要求 `seq`。[E: packages/session-query/tool-session-query/src/index.ts:99]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `session_id` | `string` | 否 | caller 自己 | 合法 `SessionId` | 省略 = 当前会话。[E: packages/session-query/tool-session-query/src/input.ts:85] |
| `seq` | `integer` | 是 | 无 | 非负安全整数 | 目标 event 的 raw-log 序号。[E: packages/session-query/tool-session-query/src/index.ts:101][E: packages/session-query/tool-session-query/src/operations.ts:205] |

### `session_event_read`

同样带 `session_id` + 必填 `seq`，外加可选邻居窗。[E: packages/session-query/tool-session-query/src/index.ts:112]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `session_id` | `string` | 否 | caller 自己 | 合法 `SessionId` | 省略 = 当前会话。[E: packages/session-query/tool-session-query/src/input.ts:85] |
| `seq` | `integer` | 是 | 无 | 非负安全整数 | 目标 event。[E: packages/session-query/tool-session-query/src/index.ts:114] |
| `before` | `integer` | 否 | 省略 = 不摘要前邻（service 侧当 `0`） | 非负安全整数；service 再限制 `<= readWindowMax`（默认 `50`） | 前面多少条 raw event 做摘要。[E: packages/session-query/tool-session-query/src/index.ts:115][E: packages/session-query/session-query/src/config.ts:6] |
| `after` | `integer` | 否 | 省略 = 不摘要后邻 | 同 `before` | 后面多少条 raw event 做摘要。[E: packages/session-query/tool-session-query/src/index.ts:116][E: packages/session-query/session-query/src/index.ts:347] |

schema **不**写出 `50` 这个窗帽。`before: 51` 会在 `SessionQueryEngine.readEvent` 里变成 `SESSION_QUERY_INVALID_WINDOW`，再被翻译成「session event window is invalid」。[E: packages/session-query/session-query/src/index.ts:351][E: packages/session-query/tool-session-query/src/service-boundary.ts:66]

## 输出 & 截断 / spill

五个工具的规范值都是 **纯字符串**。registry 用 `output.schema = { type: 'string' }` 校验后调用 `render`，模型看见的就是那段文本；没有 `presentationMeta`，UI 走 generic 卡片。[E: packages/session-query/tool-session-query/src/index.ts:47][E: packages/core/tools/src/index.ts:1800]

`@deepseek-ai/dsh-tool-session-query` **自己不做**字节 / 字符截断，也不读 `ctx.spillStore`。搜索侧的唯一数量帽是 `maxSearchResults`：`collectPages` 在放入第 `maxResults + 1` 个已授权 item 之前返回 `{ capped: true }`，文案追加 `Result cap reached. Narrow the query or add filters to find additional matches.`。[E: packages/session-query/tool-session-query/src/operations.ts:257][E: packages/session-query/tool-session-query/src/presentation.ts:76]

空结果：

- `session_search` → `No prior session matches found.`[E: packages/session-query/tool-session-query/src/presentation.ts:82]
- `session_event_search` → 先打 session 标题行，再 `No prior event matches found.`[E: packages/session-query/tool-session-query/src/presentation.ts:92]

`session_search` 命中行含 session id、title、Created、Parent、Availability（`live` / `persisted` / 二者 / `unavailable`）、以及 best-match 的 seq / type / surface / 时间和 snippet。未授权的 parent id 显示为 `[outside workspace]`，不回显外站 id。[E: packages/session-query/tool-session-query/src/presentation.ts:70][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:1272]

`session_event_read` 把 target 放进 ` ```json ` 围栏（`JSON.stringify(window.target, null, 2)`），邻居只写 `seq | type | time` 加 `extractSessionEventText`；没有语义文本就标 `(no semantic text)`。测试断言这段输出不含 `truncated`。[E: packages/session-query/tool-session-query/src/presentation.ts:175][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:2033]

`session_event_trace` 是固定七行：Session 标题、Target、Replaced by、Replacement chain、Events replaced by target、Events cited directly as sources、Direct derived events；空列表写成 `none`。[E: packages/session-query/tool-session-query/src/presentation.ts:154]

部署若另外挂了 `@deepseek-ai/dsh-spill-policy` 且给了 `maxInlineBytes`，过长的纯文本 `tool/result` 会在 `tools/post-execute` 被换成 head/tail + locator。ACP 示例 `examples/acp-agent/session-query.cordis.yml` 通过嵌套 `fs.cordis.yml` 插入 `spill-local` + `spill-policy`，专门打 `session_event_read` 的 spill 场景。省略 `maxInlineBytes` 时 spill-policy **不注册** listener。[E: examples/acp-agent/fs.cordis.yml:14][E: packages/spill/spill-policy/src/index.ts:113][E: packages/spill/spill-policy/src/index.ts:190]

失败结果走 registry 的 `Error: <message>`。服务端诊断经 `serviceBoundary.sanitizeError`：大多数 `SessionQueryError` 换成固定短句（例如 `SESSION_QUERY_EVENT_NOT_FOUND` → `session event was not found`）；`SESSION_QUERY_SOURCE_CONFLICT` / `SESSION_QUERY_INVALID_CONFIG` 以及非 taxonomy 错误变成 `SESSION_QUERY_TOOL_FAILED` / `session query operation failed`。完整 stack 只进 `ctx.logger.warn`，不进模型可见 content。[E: packages/session-query/tool-session-query/src/service-boundary.ts:30][E: packages/session-query/tool-session-query/src/service-boundary.ts:88][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:1335]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `@deepseek-ai/dsh-session-query` 把 `ctx.sessionQuery` 钉成 `SessionQueryEngine`：`searchSessions` / `searchEvents` 是 abstract；`filterSessions` / `traceSession` / `traceEvent` / `readEvent` / `readTitleSnapshots` 是基类具体实现。[E: packages/session-query/session-query/src/index.ts:70][E: packages/session-query/session-query/src/index.ts:81][E: packages/session-query/session-query/package.json:2] |
| Provider | 产品默认后端是 `@deepseek-ai/dsh-session-query-sqlite`（`dsh-base` 行 `id: session-query-sqlite`）。`searchSessions` / `searchEvents` 在 SQLite FTS5 上实现；精确读、filter、trace 走基类 corpus。[E: packages/session-query/session-query-sqlite/package.json:2][E: packages/bundle/base/cordis.patch.yml:117][E: packages/session-query/session-query-sqlite/src/index.ts:256] |
| Consumer | `@deepseek-ai/dsh-tool-session-query` 的五个 `defineTool`。另有 session export / sidebar 等 host 面消费者读同一 `ctx.sessionQuery`，但不登记这五个 wire 名。 |

`SessionQueryEngine.static inject = ['sessions']`。换 provider 会带走：FTS 分词与 snippet、页大小（SQLite 默认 `limit` 20、最大 100）、`openAt` 是否真的打开索引。不会带走：cwd 授权、五个 wire 名、模型看不到 cursor、search cap 100、current-step 截断、谱系打码文案。[E: packages/session-query/session-query/src/index.ts:82][E: packages/session-query/session-query-sqlite/src/index.ts:76][E: packages/session-query/session-query-sqlite/src/index.ts:78]

shipped `dsh-base` 把 SQLite 配成 `path: ':memory:'`、`openAt: never`。此时 `searchSessions` / `searchEvents` 在进 FTS 之前就抛 `SESSION_QUERY_SEARCH_DISABLED`；`traceSession` / `readEvent` 仍然可用。`web-app` 再 restatement 同一组值。[E: packages/bundle/base/cordis.patch.yml:121][E: packages/session-query/session-query-sqlite/src/index.ts:328][E: packages/bundle/web-app/cordis.patch.yml:33]

工具还读 `exec.agent.session`（id / header / events）做 caller 身份。没有 agent 的直接 `ctx.tools.execute` 会 `SESSION_QUERY_TOOL_MISSING_AGENT`。[E: packages/session-query/tool-session-query/src/workspace-access.ts:56]

本页工具不消费 `ctx.fs` / `ctx.shell` / `ctx.approval` / `ctx.sandboxPolicy`。sandbox 只罩文件副作用；这五件套没有 per-call sandbox stamp，也不广告 `sandbox_permissions`。

## 执行管线

模型发出五个名字之一后，loop 经 `ctx.tools.execute` 进入 registry：`tools/pre-execute` → monotonic `guard` → `tools/execute`（around-dispatch）→ 工具 body → `output.render` → `tools/post-execute` → `tools/result`。默认路径是 body 先 `createSuccessResult`/`render`，`finalizeScheduledExecution` 之后才 `postExecute`。[E: packages/core/tools/src/index.ts:1549][E: packages/core/tools/src/index.ts:1550][E: packages/core/tools/src/index.ts:1800][E: packages/core/tools/src/index.ts:1611]

对本组工具的挂点：

- **`tools/pre-execute`**：插件自己不注册 listener，也不 `ask`。waterfall 默认 `{ kind: 'allow' }`。没有 escalation 字段，不会走到 `ctx.approval`。[E: packages/core/tools/src/index.ts:1477]
- **调度**：`executionMode` 只有 `isConcurrencySafe === true` 才标 `parallel`。两个 search 未声明分类器，是 `exclusive`（generation-bound FTS 不能和另一次搜索交错抽页）；三条精确观察声明恒 `true`，可并行。[E: packages/core/tools/src/index.ts:1278][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:293]
- **`tools/execute` 包装**：
  - `session-checkpoint-policy` 仅在「有 `exec.agent` 且 `exec.parent === undefined`」时 `flush` session，再 `next()`。[E: packages/session/session-checkpoint-policy/src/index.ts:71]
  - `timeout-policy` 读 `definition.timeoutMs`。两个 search 带 `searchTimeoutMs`（默认 30s），包装器会换 `exec.signal` 并在到期后改写成 `TOOL_TIMEOUT`。三条精确观察未声明该字段，包装器直接 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:59][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:252]
- **body**：`defineTool` 先 `validateArgs`，再进 `operations.execute*`。取消信号经 `exec.signal` 传给 `filterSessions` / `search*` / `trace*` / `readEvent` / `readTitleSnapshots`。[E: packages/core/tools/src/schema.ts:586]
- **`tools/post-execute`**：本插件不注册 listener，默认 `accept`。可选的 `spill-policy` 只整形已 accept 的顶层纯文本，且跳过 wire 名 `read` 与带 `parent` 的嵌套调用。[E: packages/core/tools/src/index.ts:1745][E: packages/spill/spill-policy/src/index.ts:197]
- **sandbox / approval**：不挂。

Code Mode 下，非嵌套且 `mode === 'code'` 时，除保留名 `run_code` 外的名字在 `createExecution` 里 collapse，不进 `tools/pre-execute`。SDK 子分发带 `parent`，不 collapse，仍走完整管线。shipped `code` preset **并不**登记本五件套，所以产品 PTC 会话的 SDK 里默认也没有这些 binding；只有自定义 composition 同时挂了 `tool-session-query` 与 `tool-presentation mode: code` 时才会出现「模型写 `await tools.session_search(...)`」这条路径。[E: packages/core/tools/src/index.ts:1325][E: apps/cli/tests/web-agent-presets.e2e.ts:301]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。仓库里存在 `@deepseek-ai/dsh-tool-session-query`、host 上存在 `ctx.sessionQuery`，都不等于产品默认给模型这五个名字。

四个 shipped 文件都**没有** `id: tool-session-query` / `name: '@deepseek-ai/dsh-tool-session-query'`。web e2e 用精确 catalog 锁死了这件事：

| preset | 装 `@deepseek-ai/dsh-tool-session-query`？ | `disabled` | isolate | 说明 |
|---|---|---|---|---|
| `minimal` | **否** | — | — | 模型可见只有 `bash` 与 `str_replace_editor`。yml 最后一行插件是 `str-replace-editor`。[E: apps/cli/tests/web-agent-presets.e2e.ts:227][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] |
| `standard` | **否** | — | — | 精确 catalog（去掉依赖本机 ripgrep 的 `glob`/`grep`）止于 `web_search` / `workflow` / `write`，没有 `session_*`。yml 最后一行模型工具是 `tool-web`。[E: apps/cli/tests/web-agent-presets.e2e.ts:206][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247] |
| `code` | **否** | — | — | 相对 `standard` 的可加载增量只有末尾 `tool-presentation` `mode: code`。模型 assembly 只剩 `run_code`；native 行里同样没有 `tool-session-query`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:259][E: apps/cli/tests/web-agent-presets.e2e.ts:301] |
| `cordis` | **否** | — | — | 相对 `standard` 的增量是 `tool-cordis` + `customSkillDirs`，yml 没有 `tool-session-query` 行。e2e 只把 `cordis_*` 和 `bash`/`read`/`edit`/`skill` 列入增量断言，五个 `session_*` 不在那份名单里。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245][E: apps/cli/tests/web-agent-presets.e2e.ts:269] |

opt-in 出现在 example / 用户 composition，不是 shipped preset。`examples/acp-agent/session-query.cordis.yml` 往 `fs.cordis.yml` 上 `insert`：

```yaml
- id: tool-session-query
  name: '@deepseek-ai/dsh-tool-session-query'
```

并同时插入 `timeout-policy`，让两个 search 的 `timeoutMs` 真的被 armed。[E: examples/acp-agent/session-query.cordis.yml:9][E: examples/acp-agent/session-query.cordis.yml:11]

即便插入了工具行，shipped host 的 `session-query-sqlite` 仍是 `openAt: never`。要让 `session_search` / `session_event_search` 真正跑 FTS，还得在更后的 patch 层把 `openAt` 改成 `first-search` 或 `startup`（通常再给一个耐久 `path`）。只挂工具、不改 host 索引时，搜索会结构化失败 `SESSION_QUERY_SEARCH_DISABLED`；`session_trace` / `session_event_trace` / `session_event_read` 不受这道门影响。[E: packages/bundle/base/cordis.patch.yml:121][E: packages/session-query/session-query-sqlite/src/index.ts:328]

## execute() 走读

符号：`apply` @ `packages/session-query/tool-session-query/src/index.ts`，`operations.*` @ `operations.ts`，`toolInput.*` @ `input.ts`，`workspaceAccess.*` @ `workspace-access.ts`，`serviceBoundary.call` @ `service-boundary.ts`，`presentation.*` @ `presentation.ts`。

1. **取 caller。** `executeSessionSearch` / `executeEventSearch` / `executeSessionTrace` 第一件事是 `workspaceAccess.callerOf(exec)`。`executeEventTrace` / `executeEventRead` 先 `assertNonNegativeSafeInteger('seq')`，再 `callerOf`。没有 `exec.agent` 就抛 `SESSION_QUERY_TOOL_MISSING_AGENT`。身份三件套是 `agent.session.id` / `header` / `events`。[E: packages/session-query/tool-session-query/src/workspace-access.ts:54][E: packages/session-query/tool-session-query/src/workspace-access.ts:58][E: packages/session-query/tool-session-query/src/operations.ts:60][E: packages/session-query/tool-session-query/src/operations.ts:205][E: packages/session-query/tool-session-query/src/operations.ts:221][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:585]

2. **`session_search`：workspace 门 + 强制 cwd。** `caller.header.cwd === undefined` 立刻 `SESSION_QUERY_TOOL_UNAUTHORIZED`（文案 `cross-session search is unavailable because the caller session has no workspace`）。然后 `normalizeQuery`、`buildSessionFilters`、`buildEventFilters`。若给了 `parent_session_ids` 或 `include_root_sessions === true`，先 `authorizeSessionIds`；一个授权 parent 都没有且没开 root 时，直接返回空搜索，**不**调用 `searchSessions`（隐藏 parent 与不存在 parent 对模型不可区分）。最后无条件 `sessionFilters.push({ kind: 'cwd', values: [cwd] })`。[E: packages/session-query/tool-session-query/src/operations.ts:63][E: packages/session-query/tool-session-query/src/operations.ts:86][E: packages/session-query/tool-session-query/src/operations.ts:89][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:626]

3. **抽干 provider 分页，按授权 cap 截。** `collectPages` 循环 `ctx.sessionQuery.searchSessions`，**不**把 `limit` 传给 provider。`accept` 谓词是 `hit.header.id !== caller.id && workspaceAccess.recordAuthorized(hit, caller)`：丢掉自己、丢掉 cwd 不符的泄露行。同一 `nextCursor` 再出现就 `SESSION_QUERY_INVALID_CURSOR`。满 cap 后若下一页还有已授权 hit，才标 `capped`；尾页只剩被拒 hit 则不报 cap。[E: packages/session-query/tool-session-query/src/operations.ts:100][E: packages/session-query/tool-session-query/src/operations.ts:264][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:1268][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:1295]

4. **补 title，打码 parent。** 命中的 `parentSession` 再走一遍 `authorizeSessionIds`；未授权的在 `formatSessionSearch` 里写成 `[outside workspace]`。title 走 `readTitleSnapshots`：单条 rejected 变成 `untitled (title unavailable: CODE)`，整批抛错才让这次 search 失败。[E: packages/session-query/tool-session-query/src/operations.ts:106][E: packages/session-query/tool-session-query/src/workspace-access.ts:168][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:1646]

5. **`session_event_search`：先授权目标，再截当前 step。** `targetId` 省略则用 caller。非 self 目标用 `filterSessions([{ kind: 'id' }, { kind: 'cwd' }])`，结果不是恰好 1 条就 `SESSION_QUERY_TOOL_UNAUTHORIZED`。self 搜索要求 log 里已有 `step/start`，否则 `SESSION_QUERY_TOOL_NO_CURRENT_STEP`；有则 `range.to = min(用户 to, stepStart.seq - 1)`。若截完后 `from > to`，返回空列表且**不**打 FTS（用户从「当前 step 内部」起搜的情况）。其它 session 的 `seq_to` 原样保留。[E: packages/session-query/tool-session-query/src/workspace-access.ts:87][E: packages/session-query/tool-session-query/src/operations.ts:132][E: packages/session-query/tool-session-query/src/operations.ts:135][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:1584][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:1603]

6. **`session_trace`：谱系投影。** `authorizeTarget` 之后 `ctx.sessionQuery.traceSession`。返回的 `trace.target.header` 必须仍对 caller 授权（防 TOCTOU 把 session 挪出 workspace）。祖先按近到远扫，碰到第一个未授权 record 就停并设 `ancestorBoundary`；`!trace.complete` 且祖先全可见时也设 boundary（未解析的 parent id 不回传）。子孙树用 `authorizeDescendants`：未授权节点变成 `null`，其子树不再展开。[E: packages/session-query/tool-session-query/src/operations.ts:177][E: packages/session-query/tool-session-query/src/operations.ts:183][E: packages/session-query/tool-session-query/src/operations.ts:189][E: packages/session-query/tool-session-query/src/workspace-access.ts:185][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:802]

7. **`session_event_trace` / `session_event_read`。** 先 `assertNonNegativeSafeInteger('seq', …)`（以及 read 的 `before`/`after`）。授权后分别 `traceEvent({ sessionId, seq })` 与 `readEvent({ sessionId, seq, before?, after? })`，再 `assertObservedTargetAuthorized`。`readEvent` 用 raw-log 下标取 event：缺 seq 或 `events[seq].seq !== seq` → `SESSION_QUERY_EVENT_NOT_FOUND`。窗两侧默认 0，超过 `readWindowMax`（默认 50）→ `SESSION_QUERY_INVALID_WINDOW`。[E: packages/session-query/tool-session-query/src/operations.ts:209][E: packages/session-query/tool-session-query/src/operations.ts:228][E: packages/session-query/session-query/src/index.ts:325][E: packages/session-query/session-query/src/index.ts:347]

8. **所有 `ctx.sessionQuery.*` 都包在 `serviceBoundary.call`。** 取消优先于业务错误：`signal` 已 abort 时原样再抛，不写 warn。否则把 provider 诊断记进 logger，再换成模型安全的 `SessionQueryError` / `HarnessError`。`SESSION_QUERY_STALE_CURSOR` 保留「retry the complete search call」——工具**不会**自动从头再搜。[E: packages/session-query/tool-session-query/src/service-boundary.ts:105][E: packages/session-query/tool-session-query/src/service-boundary.ts:82][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:1538]

9. **真实 SQLite 路径。** integration 测试同时挂 `JsonlSessionPersistence` 与 `SqliteSessionQueryEngine`，证明 `session_search` 能命中同 cwd 的 persisted log，`session_event_search` 能搜 live 当前 step 之前的 user 文本。那是 Provider 合同，不是另一套 schema。[E: packages/session-query/tool-session-query/tests/sqlite-integration.spec.ts:86][E: packages/session-query/tool-session-query/tests/sqlite-integration.spec.ts:100]

## 设计动机·edge

- **一页五名，不是一个 `session_query` 多 operation。** 搜索与精确观察的并发、超时、失败面不同：FTS 必须 exclusive 且带 deadline；trace/read 是纯观察，可并行、无 `timeoutMs`。[E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:293]
- **cursor 对模型不可见。** provider 合同有 `cursor` / `limit`（SQLite 默认页 20），工具层自己 drain。模型既不能续页，也不会拿到内部 cursor 去探测 generation。[E: packages/session-query/session-query/src/types.ts:252][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:248]
- **workspace = cwd 字符串，fail-closed。** 猜一个外站 parent id 与猜一个不存在 id，对模型都是同一句 `No prior session matches found.`。payload 观察在 pre-authorization 之后若 header.cwd 变了，整次调用改 `UNAUTHORIZED`，snippet / title 不外泄。[E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:626][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:1154]
- **当前 step 对 self-search 不可见。** 这是为了 `model-visible ⟺ logged`：正在执行的 tool call 还没 settle，不能让模型用 `session_event_search` 读到半截自己。其它 session 没有这道夹具。[E: packages/session-query/tool-session-query/src/operations.ts:128]
- **host 有 query 服务 ≠ 模型有这五个工具。** `dsh-base` 挂 SQLite 是给 export / 派生会话 / 标题折叠用的，并且默认 `openAt: never` 关掉 FTS。四个 shipped preset 都不装 `tool-session-query`。要产品面出现 `session_*`，必须同时：用户 composition 插入工具行，以及（若需要搜索）改 host `openAt`。[E: packages/bundle/base/cordis.patch.yml:117][E: apps/cli/tests/web-agent-presets.e2e.ts:206]
- **没有 `session_mount` 之类写接口。** 这组工具只读。落盘、compaction、`surfaceOp: replace` 仍由 session 子系统自己做。
- **和 `run_code` 正交。** shipped `code` preset 的唯一 wire 工具仍是 `run_code`；本五件套既不替代它，也不出现在 PTC assembly 里。[E: apps/cli/tests/web-agent-presets.e2e.ts:301]
- **诊断消毒是硬合同。** 测试用 hostile Proxy / 循环 `cause` / 抛 stack getter 证明模型侧永远看不到 provider 原文。模型可见失败是 `Error: session query operation failed` / `SESSION_QUERY_TOOL_FAILED`。[E: packages/session-query/tool-session-query/src/service-boundary.ts:145][E: packages/session-query/tool-session-query/src/service-boundary.ts:146] `UNPRINTABLE_SERVICE_ERROR` 只进 `fullError` 的 catch，再写入 `ctx.logger.warn`，不是模型正文。[E: packages/session-query/tool-session-query/src/service-boundary.ts:19][E: packages/session-query/tool-session-query/src/service-boundary.ts:124] 循环 `cause` 在 logger 诊断里标 `[circular error cause]`。[E: packages/session-query/tool-session-query/src/service-boundary.ts:169][E: packages/session-query/tool-session-query/tests/tool-session-query.spec.ts:1506]

## Sources

- packages/session-query/tool-session-query/src/index.ts
- packages/session-query/tool-session-query/src/operations.ts
- packages/session-query/tool-session-query/src/input.ts
- packages/session-query/tool-session-query/src/presentation.ts
- packages/session-query/tool-session-query/src/workspace-access.ts
- packages/session-query/tool-session-query/src/service-boundary.ts
- packages/session-query/tool-session-query/package.json
- packages/session-query/tool-session-query/tests/tool-session-query.spec.ts
- packages/session-query/tool-session-query/tests/sqlite-integration.spec.ts
- packages/session-query/session-query/src/index.ts
- packages/session-query/session-query/src/config.ts
- packages/session-query/session-query/src/types.ts
- packages/session-query/session-query/src/tracing.ts
- packages/session-query/session-query/package.json
- packages/session-query/session-query-sqlite/src/index.ts
- packages/session-query/session-query-sqlite/package.json
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/spill/spill-policy/src/index.ts
- packages/util/timeout/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts
- examples/acp-agent/session-query.cordis.yml
- examples/acp-agent/fs.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `tools/post-execute` 脊柱；本页只写五件套在这条链上的挂点
- [trace: Code Mode 一轮](../../spine/trace-code-mode.md) — shipped `code` preset 如何把模型可见工具收成唯一 wire `run_code`；本五件套不在那条 shipped 路径里
- [工具 catalog](../../reference/tools-catalog.md) — boot 后 `ctx.tools.schemas()` 的全量模型可见名录
- [session-query 检索子系统](../../subsystems/persistence/session-query.md) — `ctx.sessionQuery` Service Definition、SQLite FTS provider 与 corpus 观察（本页只写五个 model-visible 名字怎么消费它）
