---
id: surface.tools.grep
title: grep 搜内容
kind: tool
tier: T1
pkg: execution
source:
  - packages/fs/tool-fs-search/src/grep.ts
  - packages/fs/tool-fs-search/src/index.ts
  - packages/fs/tool-fs-search/src/search-core.ts
  - packages/fs/tool-fs-search/src/presentation.ts
  - packages/fs/tool-fs-search/src/direct-call.ts
  - packages/fs/tool-fs-search/package.json
  - packages/fs/tool-fs-search/tests/tools.spec.ts
  - packages/fs/tool-fs-search/tests/integration.spec.ts
  - packages/fs/tool-fs-search/tests/load-path.spec.ts
  - packages/fs/tool-fs-search/tests/rg-path.spec.ts
  - packages/fs/tool-fs-search/tests/presentation.spec.ts
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/subprocess/subprocess/src/types.ts
  - packages/subprocess/subprocess/src/index.ts
symbols:
  - applyGrepTool
  - parseGrepArgs
  - GREP_MAX_MATCHES
  - GREP_MAX_LINE_BYTES
  - buildGrepCommand
  - formatGrepOutput
  - parseGrepMatches
  - presentGrepCall
  - presentGrepResult
  - GrepInput
  - GrepToolCaps
  - apply
  - inject
  - Config
  - runRipgrep
  - SearchError
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 47f943859b
---

> wire 名 `grep` 由包 `@deepseek-ai/dsh-tool-fs-search` 注册：用打包的 `@vscode/ripgrep` 经 `ctx.subprocess.spawn()` 搜文件内容，返回按文件分组的匹配行。不是宿主 `rg`，不是 `ctx.fs`，不是 `ctx.shell`。

## 能回答的问题

- `grep` 的 wire `name`、实现包、`inject` 和注册点是什么？
- 模型可见参数只有哪些？`include` 拒绝什么？`head_limit` 是不是模型字段？
- 打包 ripgrep 怎么 spawn？`--no-config`、session cwd、timeout、`SEARCH_*` 错误码分别挂在哪？
- 超过 `GREP_MAX_MATCHES` 时 inline 文本、formatted spill、`presentationMeta` 各保留什么？
- `minimal` / `standard` / `code` / `cordis` 谁装 `@deepseek-ai/dsh-tool-fs-search`？isolate 域是什么？
- `grep` 进 `tools/pre-execute → tools/execute → tools/post-execute` 时，approval / sandbox / timeout 有没有挂上？

## Identity

模型看见的工具名是字符串 `'grep'`，由 `applyGrepTool` 里 `defineTool({ name: 'grep', ... })` 写出，再 `ctx.tools.register(tool)`。[E: packages/fs/tool-fs-search/src/grep.ts:283][E: packages/fs/tool-fs-search/src/grep.ts:339]

实现包 npm 名是 `@deepseek-ai/dsh-tool-fs-search`。[E: packages/fs/tool-fs-search/package.json:2] Cordis 插件名是 `export const name = 'tool-fs-search'`（loader 诊断用，不是 wire 名）。[E: packages/fs/tool-fs-search/src/index.ts:67]

`inject` 是 `['tools', 'systemPrompt', 'subprocess']`：没有 `fs`，没有 `shell`，没有 `spillStore`。[E: packages/fs/tool-fs-search/src/index.ts:70] 没有 `ctx.subprocess` 时插件保持 pending，catalog 为空。[E: packages/fs/tool-fs-search/tests/tools.spec.ts:255] Loader 真路径要求模块**没有** `export default apply`，否则 `unwrapExports` 会丢掉 `inject`。[E: packages/fs/tool-fs-search/tests/load-path.spec.ts:27][E: packages/fs/tool-fs-search/tests/load-path.spec.ts:33]

工厂是 namespace 插件的 `apply(ctx, config)`：校验正整数 cap 之后调用 `applyGrepTool(ctx, { maxMatches, maxLineBytes, maxMetaBytes, rawOutputMaxBytes, graceMs, stderrMaxBytes, timeoutMs })`。[E: packages/fs/tool-fs-search/src/index.ts:151] 同一次 `apply` 还注册兄弟工具 `glob`；注册不探测二进制，第一次调用才 `import('@vscode/ripgrep')`。[E: packages/fs/tool-fs-search/tests/tools.spec.ts:239][E: packages/fs/tool-fs-search/src/search-core.ts:172]

`applyGrepTool` 另外挂 `ctx.systemPrompt.section({ name: 'tool:grep', order: 104 })`，正文要求模型用 `grep` 工具而不是 shell `grep`/`rg`，并在需要上下文时对命中文件 `read`。[E: packages/fs/tool-fs-search/src/grep.ts:277][E: packages/fs/tool-fs-search/src/grep.ts:279]

## 用途定位

`grep` 是 model-visible 的工作区内容搜索：固定 `rg --json` argv，解析 `match` 记录，得到 `{ path, lineNumber, line }` 平坦列表，再按文件分组渲染。[E: packages/fs/tool-fs-search/src/grep.ts:113][E: packages/fs/tool-fs-search/src/grep.ts:146] 它是 discovery，不是编辑器；完整行仍在文件里，工具只保留 UTF-8 预览。[E: packages/fs/tool-fs-search/src/search-core.ts:313]

搜索根默认是 `exec.agent.session.header.cwd`，没有 session cwd 时退回 `process.cwd()`。[E: packages/fs/tool-fs-search/src/search-core.ts:223][E: packages/fs/tool-fs-search/src/search-core.ts:224] 可选 `path` 是文件或目录；可选 `include` 是**一条**正向 glob。[E: packages/fs/tool-fs-search/src/grep.ts:289][E: packages/fs/tool-fs-search/src/grep.ts:290]

`grep` 与同包 `glob` 共用 `runRipgrep` / `ctx.subprocess` / 打包 ripgrep，但 argv、解析和 retention 不同。`grep` 也不走 `dsh-tool-bash` / `dsh-tool-bash-persistent` 那条 `ctx.shell` / `ctx.terminals` 路径。

## 输入 schema

以插件**默认 Config** boot 后的 `defineTool.parameters` 为准。`ctx.fs.sandboxMode` 不进入本工具：`inject` 不含 `fs`，schema 不会因 confined/open 改名或加 `sandbox_permissions` / `justification`。[E: packages/fs/tool-fs-search/src/index.ts:70][E: packages/fs/tool-fs-search/src/grep.ts:287]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `pattern` | `string` | 是 | 无 | `required: true` 只要字段存在；`parseGrepArgs` 再拒 `length === 0`。纯空白是合法 regex | ripgrep 正则，作为 `--regexp=` 的一个 argv 元素。[E: packages/fs/tool-fs-search/src/grep.ts:288][E: packages/fs/tool-fs-search/src/grep.ts:91] |
| `path` | `string` | 否 | session workspace（spawn `cwd`） | 给出时 `trim()` 后不能为空 | 文件或目录；相对路径相对 session cwd。出现在 `--` 之后，避免 leading-dash 被当成 flag。[E: packages/fs/tool-fs-search/src/grep.ts:289][E: packages/fs/tool-fs-search/src/grep.ts:92][E: packages/fs/tool-fs-search/src/grep.ts:115] |
| `include` | `string` | 否 | 无（搜全部 rg 默认会扫到的文件） | 非空；禁止 `!` 开头；禁止花括号外的逗号列表。`*.{ts,tsx}` 合法 | 一条正向 `--glob=` 过滤器，不是列表。[E: packages/fs/tool-fs-search/src/grep.ts:290][E: packages/fs/tool-fs-search/src/grep.ts:69][E: packages/fs/tool-fs-search/src/grep.ts:70][E: packages/fs/tool-fs-search/src/grep.ts:76] |

模型**看不见**这些插件 Config（它们改 cap / 描述文案 / `ToolDefinition.timeoutMs`，不改参数表）：

| Config 键 | 默认 | 对 `grep` 的作用 |
|---|---|---|
| `grepMaxMatches` | `GREP_MAX_MATCHES` = `250` | inline 保留的平坦 match 数；描述字符串会插入这个数字。[E: packages/fs/tool-fs-search/src/grep.ts:30][E: packages/fs/tool-fs-search/src/index.ts:100][E: packages/fs/tool-fs-search/src/grep.ts:285] |
| `grepMaxLineBytes` | `GREP_MAX_LINE_BYTES` = `2000` | 每条匹配行预览的 UTF-8 字节预算。[E: packages/fs/tool-fs-search/src/grep.ts:36][E: packages/fs/tool-fs-search/src/index.ts:101] |
| `timeoutMs` | `SEARCH_TIMEOUT_MS` = `30_000` | 写到 `ToolDefinition.timeoutMs`，**不**进 `schemas()`：`schemaOf` 只投影 `name` / `description` / `parameters`。[E: packages/fs/tool-fs-search/src/search-core.ts:42][E: packages/fs/tool-fs-search/src/grep.ts:292][E: packages/core/tools/src/index.ts:1257] |
| `rawOutputMaxBytes` | `20_000_000` | 完整 raw stdout 解析上限；超出 → `SEARCH_RAW_OUTPUT_OVERFLOW`。[E: packages/fs/tool-fs-search/src/search-core.ts:35] |
| `graceMs` | `3_000` | 交给 subprocess seam 的 terminate 宽限期。[E: packages/fs/tool-fs-search/src/search-core.ts:52] |
| `stderrMaxBytes` | `64 * 1024` | 失败时嵌入错误消息的 stderr tail。[E: packages/fs/tool-fs-search/src/search-core.ts:49] |
| `searchMetaMaxBytes` | `65_536` | `presentationMeta` JSON 字节上限。[E: packages/fs/tool-fs-search/src/search-core.ts:64] |
| `sampleOverCapGlobResults` | **无默认，必填** | 只影响 `glob`。`standard`/`code`/`cordis` 写成 `false` 是为了满足插件 Config，不是 grep 开关。[E: packages/fs/tool-fs-search/src/index.ts:98] |

`defineTool` 没有给 `grep` 挂 `isConcurrencySafe`：registry `executionMode` 在缺该函数时返回 `{ kind: 'exclusive' }`。[E: packages/core/tools/src/index.ts:1278]

`parseGrepArgs` 测试钉死：空 `pattern`、空白 `path`、空白/`!*.ts`/`*.ts,*.js` 的 `include` 都是普通参数错误；空白 `pattern` `'  '` 与 `include: '*.{ts,tsx}'` 可执行。[E: packages/fs/tool-fs-search/tests/tools.spec.ts:1059][E: packages/fs/tool-fs-search/tests/tools.spec.ts:1069]

## 输出 & 截断 / spill

`execute` 的**规范值**是 `{ matches: GrepMatch[] }`：每个元素有 `path`、`lineNumber`、`line`（完整行，未预览）。[E: packages/fs/tool-fs-search/src/grep.ts:298][E: packages/fs/tool-fs-search/src/grep.ts:334] exit 1（ripgrep 的零命中）直接 `{ matches: [] }`，`isError: false`。[E: packages/fs/tool-fs-search/src/grep.ts:323][E: packages/fs/tool-fs-search/tests/tools.spec.ts:554]

模型看到的文本来自 `output.render`：先 `retainGrepMatches`（head `maxMatches` + 每行 `previewLine`），再 `formatRetainedGrep`。[E: packages/fs/tool-fs-search/src/grep.ts:315][E: packages/fs/tool-fs-search/src/search-core.ts:333]

- 零命中：`No matches found`。[E: packages/fs/tool-fs-search/src/grep.ts:230]
- 未截断：`Found N match(es)` + 按 first-seen 文件分组的 `Line N: <text>`。[E: packages/fs/tool-fs-search/src/grep.ts:219][E: packages/fs/tool-fs-search/src/grep.ts:201]
- 截断：`Found kept of seen matches` + 保留页 + 页脚。[E: packages/fs/tool-fs-search/src/grep.ts:218]

超 cap 时 `tools/post-execute` 才尝试 formatted spill。条件由 `acceptedDirectCallValue` 收紧：必须是 `accept`、下游没替换 `content`/`value`、`exec.parent === undefined`（不是 `run_code` 子调用）、非 error、且 registry 里仍是本 `tool`。[E: packages/fs/tool-fs-search/src/direct-call.ts:23][E: packages/fs/tool-fs-search/src/grep.ts:346] 通过后：每行仍 `previewLine`，但**保留全部 match**，`saveText` 建议名 `grep-results.txt`，正文以 `Found N matches` 开头。[E: packages/fs/tool-fs-search/src/grep.ts:353][E: packages/fs/tool-fs-search/src/grep.ts:354] 成功页脚：`Full grep result stored at: ${locator}. ${retrievalHint}`；失败页脚：`The complete result could not be saved; narrow pattern, path, or include to see more.`[E: packages/fs/tool-fs-search/src/grep.ts:223][E: packages/fs/tool-fs-search/src/grep.ts:224]

`spillStore` 用 `ctx.get('spillStore')` 机会读取：缺 backend、无 session owner、`saveText` 抛错都只 `logger.warn` 并返回 `undefined`，搜索本身仍成功。[E: packages/fs/tool-fs-search/src/search-core.ts:382][E: packages/fs/tool-fs-search/src/search-core.ts:398] 嵌套 Code 调用保留完整 `value.matches`，但不建 top-level spill。[E: packages/fs/tool-fs-search/tests/tools.spec.ts:1045][E: packages/fs/tool-fs-search/tests/tools.spec.ts:1046]

`presentationMeta` 与 render 共用同一次 `retainGrepMatches`，再 `grepSearchMeta` 按文件分组，带 `total` / `truncated`；`capMetaBytes` 可能再丢掉尾部 file group，使 JSON 不超过 `searchMetaMaxBytes`。[E: packages/fs/tool-fs-search/src/grep.ts:318][E: packages/fs/tool-fs-search/src/presentation.ts:130] 仅 top-level 调用投影 meta；`exec.parent` 有值时 registry 不算 `presentationMeta`。[E: packages/core/tools/src/index.ts:1806] UI 卡是 `{ card: 'search', shape: 'matches', files, truncated, total }`。[E: packages/fs/tool-fs-search/src/presentation.ts:197] 单测钉死超 cap 时 `truncated: true` 且 `total` 是预 cap 计数。[E: packages/fs/tool-fs-search/tests/presentation.spec.ts:60]

Pending 卡：`presentGrepCall` → `{ card: 'generic', kind: 'search', title: 'Grep <pattern>[ in <path>][ (<include>)]' }`。[E: packages/fs/tool-fs-search/src/grep.ts:244]

过长行预览在 UTF-8 边界切开并后缀 ` (line truncated)`。[E: packages/fs/tool-fs-search/src/search-core.ts:317] 非 UTF-8 行（rg 的 `lines.bytes`）变成占位 `(line is not valid UTF-8)`，不整次失败。[E: packages/fs/tool-fs-search/src/grep.ts:158]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `@deepseek-ai/dsh-subprocess` 的 `ctx.subprocess` | `SubprocessSpawnSpec`：`argv` / `cwd` / `stdio` / `graceMs` / 可选 `signal` / `env`。没有 sandbox 字段。[E: packages/subprocess/subprocess/src/types.ts:77] |
| Provider | 部署里的 `ctx.subprocess` 实现（本地是 `dsh-subprocess-local`；换 E2B 就换执行世界） | `runRipgrep` 只调 `ctx.subprocess.spawn`，换 provider 会带走可执行文件世界、stdio 收集和进程树终止。[E: packages/fs/tool-fs-search/src/search-core.ts:227] |
| Consumer | `dsh-tool-fs-search` | 拥有 argv 模板、`--json` 解析、retention、`SEARCH_*` 分类、formatted spill。 |

`runRipgrep` 的 spawn 是 unconfined 的 plain `ctx.subprocess` 调用：`argv = [await resolveRgPath(), '--no-config', ...toolArgv]`，stdin `ignore`，stdout/stderr 只要 `maxBytes` 收集、不请求 raw spill 文件。[E: packages/fs/tool-fs-search/src/search-core.ts:228][E: packages/fs/tool-fs-search/tests/tools.spec.ts:408] `--no-config` 挡住宿主 `RIPGREP_CONFIG_PATH` / 旁路 `rg.conf` 注入 `--pre`。

二进制路径惰性解析 `@vscode/ripgrep` 的 `rgPath`，进程内 memoize。缺平台包（`pnpm install --omit=optional`）在**第一次调用**变成 `SEARCH_FAILED`，不让 Loader 组合失败。[E: packages/fs/tool-fs-search/src/search-core.ts:172][E: packages/fs/tool-fs-search/tests/rg-path.spec.ts:30]

`buildGrepCommand` 只拼 `--json`、`--regexp=`、可选 `--glob=`、可选 `--` + `path`。不传 `--hidden`、`--no-ignore`、也不传 `glob` 那套 VCS prune；packaged `rg` 走二进制默认 ignore/hidden 规则。[E: packages/fs/tool-fs-search/src/grep.ts:113]

机会性 Consumer：`ctx.spillStore`（`ctx.get`，不是 inject）。换掉或卸掉 spill backend 只会让超 cap 页脚变成 “could not be saved”，不会让搜索变 `isError`。[E: packages/fs/tool-fs-search/src/search-core.ts:383]

父环境经 seam 的 `scrubbedParentEnv` 去掉 credential 形名字和 `DSH_*`；`grep` 自己不传 `env`。[E: packages/subprocess/subprocess/src/index.ts:60][I]

## 执行管线

`grep` 没有自己的 `tools/pre-execute` 监听器。registry 的 waterfall 默认 `allow`，本工具也不广告 escalation 字段，因此 **approval 不由 grep 挂上**。[E: packages/core/tools/src/index.ts:1476][E: packages/core/tools/src/index.ts:1477]

超时挂在定义上：`timeoutMs: caps.timeoutMs`（默认 30s）。[E: packages/fs/tool-fs-search/src/grep.ts:292][E: packages/fs/tool-fs-search/tests/tools.spec.ts:277] 宿主 bundle `dsh-base` 装 `@deepseek-ai/dsh-tool-call-timeout-policy`，它包 `tools/execute`：读 `ctx.tools.get(name).timeoutMs`，用 `deadline(..., TOOL_TIMEOUT)` 换掉 `exec.signal`；自己的 timer 赢了就把结果换成 `TOOL_TIMEOUT`。[E: packages/bundle/base/cordis.patch.yml:344][E: packages/guard/timeout-policy/src/index.ts:56][E: packages/guard/timeout-policy/src/index.ts:61][E: packages/guard/timeout-policy/src/index.ts:74] `timeoutMs` 不进模型 schema。[E: packages/core/tools/src/index.ts:1257]

`runRipgrep` 把 `exec.signal` 交给 spawn；预 abort / 运行中 abort 分类为 `SEARCH_ABORTED`。[E: packages/fs/tool-fs-search/src/search-core.ts:236][E: packages/fs/tool-fs-search/src/search-core.ts:221] 测试套件不装 timeout-policy 时，abort 以 `SEARCH_ABORTED` 出现。[E: packages/fs/tool-fs-search/tests/tools.spec.ts:447] 装了 timeout-policy 且是该插件自己的 deadline 触发时，waterfall 返回值会被换成 `TOOL_TIMEOUT`。[I]

**sandbox 不挂在 grep 上。** spawn spec 没有 confinement 字段；文件副作用沙箱罩的是 `ctx.fs`，本工具不走那条缝。[E: packages/subprocess/subprocess/src/types.ts:75]

dispatch 之后 registry 跑 `tools/post-execute`。`applyGrepTool` 的监听器 `next()` 之后按 `acceptedDirectCallValue` 决定要不要把超 cap 文本换成带 spill locator 的页脚。[E: packages/fs/tool-fs-search/src/grep.ts:341][E: packages/core/tools/src/index.ts:1744] 每次调用只 await 一个 foreground spawn，不留 background handle，也不进 `ctx.jobs`。[E: packages/fs/tool-fs-search/tests/tools.spec.ts:1102]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/*/agent.cordis.yml`，不以 package 存在为准。

| Preset | 是否装 `@deepseek-ai/dsh-tool-fs-search` | `disabled` | isolate | Config |
|---|---|---|---|---|
| `minimal` | 否。`filesystem` 组只有 `dsh-fs-local` + `dsh-tool-str-replace-editor` | — | `isolate.fs: true` 属于那一组，不是 search | 无 search 行。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:55][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] |
| `standard` | 是，`id: tool-fs-search` | 无 | 无（注释：只往 host `tools` registry 注册、不 provide 服务） | `sampleOverCapGlobResults: false`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:59][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:60][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:62] |
| `code` | 是（standard 同款工具行 + Code Mode 呈现） | 无 | 无 | 同样 `sampleOverCapGlobResults: false`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:66][E: apps/cli/config/agent-presets/code/agent.cordis.yml:69] |
| `cordis` | 是 | 无 | 无 | 同样 `sampleOverCapGlobResults: false`。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:60][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:63] |

四个 shipped preset 都**没有**覆盖 `grepMaxMatches` / `timeoutMs` / `grepMaxLineBytes`，因此装上后走包默认 250 / 30s / 2000。`sampleOverCapGlobResults: false` 只改 `glob` 的超 cap 采样。

## execute() 走读

1. **registry 校验 schema。** `defineTool` 包一层：`pattern` 必须是 string；非法参数抛 `ToolArgsError`，进不了 body。[E: packages/core/tools/src/schema.ts:587]
2. **`parseGrepArgs@grep.ts`。** 拒空 pattern、空白 path、非法 include，返回 `GrepInput`。[E: packages/fs/tool-fs-search/src/grep.ts:321][E: packages/fs/tool-fs-search/src/grep.ts:91]
3. **`buildGrepCommand@grep.ts`。** `['--json', '--regexp='+pattern, optional '--glob='+include, optional '--', path]`。每个模型值是一个未引用 argv 元素。[E: packages/fs/tool-fs-search/src/grep.ts:113][E: packages/fs/tool-fs-search/tests/tools.spec.ts:361]
4. **`runRipgrep@search-core.ts`。** 若 `exec.signal.aborted` → `SEARCH_ABORTED`。`workdir = session.header.cwd ?? process.cwd()`。`spawn({ argv: [rgPath, '--no-config', ...], cwd: workdir, stdio: { stdin:'ignore', stdout:{maxBytes: rawOutputMaxBytes}, stderr:{maxBytes: stderrMaxBytes} }, graceMs, signal })`。[E: packages/fs/tool-fs-search/src/search-core.ts:221][E: packages/fs/tool-fs-search/src/search-core.ts:228]
5. **等待 `handle.done`。** spawn 创建期同步抛 / `done` reject → `SEARCH_FAILED`（若此时已 abort 则 `SEARCH_ABORTED`）。缺 collect reader → `SEARCH_FAILED`。`signal !== null` 或 `exitCode === null` → `SEARCH_FAILED`（killed by signal）。exit 非 0/1：stderr 匹配 `regex parse error|error parsing glob` → `SEARCH_INVALID_PATTERN`，否则 `SEARCH_FAILED`。stdout `lossy` 或 inline 字节超过 cap → `SEARCH_RAW_OUTPUT_OVERFLOW`。[E: packages/fs/tool-fs-search/src/search-core.ts:126][E: packages/fs/tool-fs-search/src/search-core.ts:150][E: packages/fs/tool-fs-search/src/search-core.ts:270]
6. **exit 1。** `noMatches: true`，body 返回 `{ matches: [] }`，模型文本 `No matches found`。[E: packages/fs/tool-fs-search/src/search-core.ts:274][E: packages/fs/tool-fs-search/src/grep.ts:323]
7. **`parseGrepMatches`。** 逐行 JSON；只收 `type === 'match'`；缺 path/line_number/line 内容 → `SEARCH_FAILED`；`lines.bytes` → 占位行。[E: packages/fs/tool-fs-search/src/grep.ts:146][E: packages/fs/tool-fs-search/src/grep.ts:158]
8. **显示路径。** `toWorkdirRelative(raw.path, workdir)`：workdir 内绝对路径变相对，workdir 外绝对路径原样保留。[E: packages/fs/tool-fs-search/src/grep.ts:328][E: packages/fs/tool-fs-search/src/search-core.ts:290]
9. **返回完整 `matches`。** 规范值不过 inline cap。registry `createSuccessResult` 校验 output schema、`render` 出保留页、top-level 写 `presentationMeta`。[E: packages/fs/tool-fs-search/src/grep.ts:334][E: packages/core/tools/src/index.ts:1800]
10. **`tools/post-execute` spill。** `matches.length > maxMatches` 且仍是本工具的 direct top-level accept 时，把完整预览列表存成 `grep-results.txt`，替换模型文本页脚。[E: packages/fs/tool-fs-search/src/grep.ts:346][E: packages/fs/tool-fs-search/src/grep.ts:350]

集成测试用真 `LocalSubprocessRuntime` + 打包 `rg`：目录树分组命中、单文件 target、`include: '*.ts'`、`$(touch pwned)` 不落盘、`--flag` 当 pattern 而不是 flag、坏正则 → `SEARCH_INVALID_PATTERN`、缺目录 → `SEARCH_FAILED`。[E: packages/fs/tool-fs-search/tests/integration.spec.ts:113][E: packages/fs/tool-fs-search/tests/integration.spec.ts:137][E: packages/fs/tool-fs-search/tests/integration.spec.ts:146]

## 设计动机·edge

Claude `GrepTool` 把 `head_limit` 暴露给模型；DSH 把同一默认值 250 放进插件 Config `grepMaxMatches`，模型参数只有 `pattern` / `path` / `include`。[E: packages/fs/tool-fs-search/src/grep.ts:30][E: packages/fs/tool-fs-search/src/grep.ts:287] 没有 first-class `apply_patch`；`grep` 只搜不改。Peer 里用 shell `rg`/`grep` 的路径在 DSH 里被 prompt 明确禁止。[E: packages/fs/tool-fs-search/src/grep.ts:279]

本工具独有 edge：

- **无 shell 层。** 敌对 pattern（`` `touch` ``、`$(rm …)`、引号、换行、leading-dash）仍是一个 `--regexp=` 元素；集成测试证明 `$(touch pwned)` 不创建文件。[E: packages/fs/tool-fs-search/tests/tools.spec.ts:376][E: packages/fs/tool-fs-search/tests/integration.spec.ts:140]
- **打包二进制 + `--no-config`。** 不依赖 PATH 上的宿主 `rg`；挡住 config 注入 `--pre`。[E: packages/fs/tool-fs-search/src/search-core.ts:228]
- **raw overflow 宁失败不半解析。** `lossy` stdout 或超 `rawOutputMaxBytes` → `SEARCH_RAW_OUTPUT_OVERFLOW`，提示收窄 pattern/path/include。[E: packages/fs/tool-fs-search/src/search-core.ts:150]
- **spill 是 formatted 结果，不是 raw rg 流。** 工具从不读 stdout spill path。[E: packages/fs/tool-fs-search/src/grep.ts:354]
- **Code Mode 子调用。** 完整 `value.matches` 回给程序，但不写 top-level spill、不投影 search card meta。[E: packages/fs/tool-fs-search/tests/tools.spec.ts:1046][E: packages/core/tools/src/index.ts:1806]
- **`include` 方言。** 一条正向 glob；否定与逗号列表在 `parseGrepArgs` 就被拒，不会变成多条 `--glob`。[E: packages/fs/tool-fs-search/src/grep.ts:70][E: packages/fs/tool-fs-search/src/grep.ts:76]
- **unconfined spawn。** 可读范围是 ripgrep + session cwd，不是 `ctx.fs` 的 sandbox root。[E: packages/fs/tool-fs-search/src/search-core.ts:227] 返回路径只做显示相对化：workdir 外绝对路径原样保留。[E: packages/fs/tool-fs-search/src/search-core.ts:290] 与 `read` 根是否同一 workspace，本工具不在运行时校验。[I]

## Sources

- packages/fs/tool-fs-search/src/grep.ts
- packages/fs/tool-fs-search/src/index.ts
- packages/fs/tool-fs-search/src/search-core.ts
- packages/fs/tool-fs-search/src/presentation.ts
- packages/fs/tool-fs-search/src/direct-call.ts
- packages/fs/tool-fs-search/package.json
- packages/fs/tool-fs-search/tests/tools.spec.ts
- packages/fs/tool-fs-search/tests/integration.spec.ts
- packages/fs/tool-fs-search/tests/load-path.spec.ts
- packages/fs/tool-fs-search/tests/rg-path.spec.ts
- packages/fs/tool-fs-search/tests/presentation.spec.ts
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/subprocess/subprocess/src/types.ts
- packages/subprocess/subprocess/src/index.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute` 总管线。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 清单。
- 同包兄弟：[glob 找文件](glob.md)（`surface.tools.glob`）共用 `runRipgrep` 与 `inject`，argv 与 retention 不同。
- 执行缝：[subprocess 缝](../../subsystems/execution/subprocess.md)（`subsys.execution.subprocess`）是 `ctx.subprocess` 的 Definition / Provider 页。
