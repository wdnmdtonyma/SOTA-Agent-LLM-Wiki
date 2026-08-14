---
id: surface.tools.glob
title: glob 找文件
kind: tool
tier: T1
pkg: execution
source:
  - packages/fs/tool-fs-search/src/glob.ts
  - packages/fs/tool-fs-search/src/index.ts
  - packages/fs/tool-fs-search/src/search-core.ts
  - packages/fs/tool-fs-search/src/presentation.ts
  - packages/fs/tool-fs-search/src/direct-call.ts
  - packages/fs/tool-fs-search/package.json
  - packages/fs/tool-fs-search/tests/tools.spec.ts
  - packages/fs/tool-fs-search/tests/integration.spec.ts
  - packages/fs/tool-fs-search/tests/presentation.spec.ts
  - packages/fs/tool-fs-search/tests/load-path.spec.ts
  - packages/fs/tool-fs-search/tests/rg-path.spec.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/tests/tools.spec.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/subprocess/subprocess/src/index.ts
  - packages/subprocess/subprocess/src/types.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - applyGlobTool
  - parseGlobArgs
  - GLOB_MAX_RESULTS
  - GLOB_VCS_EXCLUDES
  - buildGlobCommand
  - sampleAcrossTopLevel
  - formatGlobOutput
  - presentGlobCall
  - presentGlobResult
  - apply
  - inject
  - Config
  - runRipgrep
  - resolveRgPath
  - SearchError
  - trySaveFormattedResult
  - toWorkdirRelative
  - globSearchMeta
  - acceptedDirectCallValue
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 47f943859b
---

> wire 名 `glob` 由 `@deepseek-ai/dsh-tool-fs-search` 注册：用打包的 `@vscode/ripgrep` 经 `ctx.subprocess` 做 `rg --files` 路径发现，**不**走 `ctx.fs`、**不**走 `ctx.shell`、**不**调用宿主 `rg`。

## 能回答的问题

- `glob` 的 wire `name`、实现包、`inject` 依赖和工厂入口是什么？
- 默认 Config 下模型看见哪些字段？`sampleOverCapGlobResults` / `globMaxResults` 改不改 schema？
- 结果如何截断、如何 spill 到 `glob-results.txt`？嵌套 `run_code` 调用会不会 spill？
- 搜索进程挂在哪条 seam？换 `ctx.subprocess` provider 会带走什么？
- `timeoutMs` / approval / sandbox 分别挂在哪？`minimal` 装不装这包？

## Identity

插件包名是 `@deepseek-ai/dsh-tool-fs-search`，Cordis 插件名 `name = 'tool-fs-search'`。 [E: packages/fs/tool-fs-search/package.json:2] [E: packages/fs/tool-fs-search/src/index.ts:67] 它是 **namespace 插件**：`export const inject = ['tools', 'systemPrompt', 'subprocess']`，没有 `export default apply`，避免 Loader `unwrapExports` 丢掉 `inject` 后去读未注入的 `ctx.subprocess`。 [E: packages/fs/tool-fs-search/src/index.ts:70] [E: packages/fs/tool-fs-search/tests/load-path.spec.ts:27] [E: packages/fs/tool-fs-search/tests/load-path.spec.ts:33]

`apply@packages/fs/tool-fs-search/src/index.ts` 校验 Config 后调用 `applyGlobTool`（同文件也调 `applyGrepTool`，本页只覆盖 `glob`）。 [E: packages/fs/tool-fs-search/src/index.ts:128] [E: packages/fs/tool-fs-search/src/index.ts:142] `applyGlobTool` 用 `defineTool({ name: 'glob', ... })` 再 `ctx.tools.register(tool)`；模型看见的 wire 名就是 `glob`。 [E: packages/fs/tool-fs-search/src/glob.ts:312] [E: packages/fs/tool-fs-search/src/glob.ts:359] 注册无条件：打包二进制是 npm 依赖，load 时不探测 `rg`。测试钉死 `ctx.tools.schemas()` 在 `tools` + `systemPrompt` + `subprocess` 齐备时为 `['glob', 'grep']`，缺 `subprocess` 时长度为 0。 [E: packages/fs/tool-fs-search/tests/tools.spec.ts:240] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:255]

同一次 `apply` 还写 system-prompt 段 `name: 'tool:glob'`、`order: 103`，文案要求用 `glob` 而不是 shell `find`。 [E: packages/fs/tool-fs-search/src/glob.ts:302] [E: packages/fs/tool-fs-search/src/glob.ts:303] [E: packages/fs/tool-fs-search/src/glob.ts:304] fiber dispose 会卸掉工具和该段。 [E: packages/fs/tool-fs-search/tests/tools.spec.ts:262]

## 用途定位

`glob` 按 glob 模式列出**文件路径**（`rg --files`，永不返回目录条目），按修改时间排序，包含 hidden / ignore 文件，但排除 `GLOB_VCS_EXCLUDES`（`.git` / `.svn` / `.hg` / `.bzr` / `.jj` / `.sl`）。 [E: packages/fs/tool-fs-search/src/glob.ts:38] [E: packages/fs/tool-fs-search/src/glob.ts:92] [E: packages/fs/tool-fs-search/src/glob.ts:313] 没有 `/` 的 pattern 匹配任意深度 basename，所以 `*` 与 `*.ts` 会扫整棵树。 [E: packages/fs/tool-fs-search/src/glob.ts:322]

它不做字符串替换、不整文件写、不跑 shell。DSH 没有 first-class `apply_patch`；改文件走 `edit` / `write`（或 `minimal` 的 `str_replace_editor`）。同包兄弟 `grep` 搜文件内容，本页不展开。

## 输入 schema

`defineTool.parameters` 编译成隐式 open object；只有标了 `required: true` 的键进入 JSON Schema `required`。 [E: packages/core/tools/src/schema.ts:97] [E: packages/core/tools/src/schema.ts:449] 默认 plugin Config **不会**改字段名，也**不会**因 `ctx.fs.sandboxMode` 广告 `sandbox_permissions` / `justification`：`inject` 里没有 `fs`，schema 只有 `pattern` 与 `path`。 [E: packages/fs/tool-fs-search/src/index.ts:70] [E: packages/fs/tool-fs-search/src/glob.ts:317]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `pattern` | `string` | 是 | 无 | schema 非空类型；`parseGlobArgs` 再拒 `trim()` 后空串 | 路径 glob。无 `/` 时按任意深度 basename 匹配。 [E: packages/fs/tool-fs-search/src/glob.ts:318] [E: packages/fs/tool-fs-search/src/glob.ts:73] |
| `path` | `string` | 否 | 省略 = session workspace（spawn `cwd`） | 给出时 `trim()` 后不得为空 | 搜索根。相对路径相对 session `cwd`；argv 里放在 `--` 之后，避免 leading-dash 被当成 flag。 [E: packages/fs/tool-fs-search/src/glob.ts:324] [E: packages/fs/tool-fs-search/src/glob.ts:74] [E: packages/fs/tool-fs-search/src/glob.ts:106] |

`timeoutMs` 写在 `ToolDefinition` 上，**不**进 `ctx.tools.schemas()` 投影（`schemaOf` 只拷 `name` / `description` / `parameters`）。 [E: packages/fs/tool-fs-search/src/glob.ts:326] [E: packages/core/tools/src/index.ts:1257] [E: packages/core/tools/tests/tools.spec.ts:83]

Config 会改 **description / system-prompt 措辞** 和 **执行 cap**，不改字段表。`sampleOverCapGlobResults` 没有 schemastery 默认值，boot 必须显式给布尔；其余 cap 有默认。 [E: packages/fs/tool-fs-search/src/index.ts:98] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:294]

| Config 键 | 默认 | 对 `glob` 的效果 |
|---|---|---|
| `sampleOverCapGlobResults` | 无默认（必填） | `true`：超 cap 按 top-level entry 抽样；`false`：取 mtime 序头部。shipped preset / `dsh-base` 都写 `false`。 [E: packages/fs/tool-fs-search/src/index.ts:98] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:62] |
| `globMaxResults` | `GLOB_MAX_RESULTS` = 100 | inline 路径条数。 [E: packages/fs/tool-fs-search/src/glob.ts:26] [E: packages/fs/tool-fs-search/src/index.ts:99] |
| `searchMetaMaxBytes` | `SEARCH_META_MAX_BYTES` = 65536 | `presentationMeta` JSON 字节上限。 [E: packages/fs/tool-fs-search/src/search-core.ts:64] |
| `rawOutputMaxBytes` | `RAW_OUTPUT_MAX_BYTES` = 20_000_000 | 可解析的完整 `rg` stdout。 [E: packages/fs/tool-fs-search/src/search-core.ts:35] |
| `graceMs` | `SEARCH_GRACE_MS` = 3000 | 交给 subprocess 的 terminate 宽限；不得大于 `MAX_TIMER_DELAY_MS`。 [E: packages/fs/tool-fs-search/src/search-core.ts:52] [E: packages/fs/tool-fs-search/src/index.ts:137] |
| `stderrMaxBytes` | `SEARCH_STDERR_MAX_BYTES` = 65536 | 失败时嵌入错误消息的 stderr 尾。 [E: packages/fs/tool-fs-search/src/search-core.ts:49] |
| `timeoutMs` | `SEARCH_TIMEOUT_MS` = 30000 | 挂到两个 search 工具的 `ToolDefinition.timeoutMs`。 [E: packages/fs/tool-fs-search/src/search-core.ts:42] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:276] |

`grepMaxMatches` / `grepMaxLineBytes` 只喂 `applyGrepTool`，不进 `glob` schema。 [E: packages/fs/tool-fs-search/src/index.ts:151]

## 输出 & 截断 / spill

`execute` 的规范值是 `{ root: string, paths: string[] }`（`additionalProperties: false`）。`root` 在未给 `path` 时为 `'.'`，否则是 `toWorkdirRelative(path, workdir)`；`paths` 是 **完整** 发现列表，截断发生在 render / card / spill，不发生在 canonical value。 [E: packages/fs/tool-fs-search/src/glob.ts:329] [E: packages/fs/tool-fs-search/src/glob.ts:345] [E: packages/fs/tool-fs-search/src/glob.ts:354] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:773]

| 情况 | 模型可见文本 |
|---|---|
| `paths.length === 0`（含 `rg` exit 1） | 字面 `No files found`。 [E: packages/fs/tool-fs-search/src/glob.ts:233] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:551] |
| `paths.length <= maxResults` | 路径按 `\n` 拼接，无 footer、不 spill。 [E: packages/fs/tool-fs-search/src/glob.ts:236] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:864] |
| 超 cap 且 `sampleOverCapGlobResults === false` | `paths.slice(0, maxResults)` + footer `(Showing N of M paths. …)`。shipped preset 走这条。 [E: packages/fs/tool-fs-search/src/glob.ts:237] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:805] |
| 超 cap 且抽样开启 | `sampleAcrossTopLevel` 按搜索根下的 top-level entry 轮转取样；若 `shown < total` 再提示 `Narrow path to inspect a specific subtree.`。 [E: packages/fs/tool-fs-search/src/glob.ts:240] [E: packages/fs/tool-fs-search/src/glob.ts:171] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:793] |

超 cap 的 **top-level** 成功调用在 `tools/post-execute` 里 `trySaveFormattedResult(..., 'glob-results.txt', paths.join('\n'))`：owner 是 `exec.agent.session.header.id`，source 是 `{ toolName, callId, label: 'result' }`。 [E: packages/fs/tool-fs-search/src/glob.ts:367] [E: packages/fs/tool-fs-search/src/search-core.ts:387] 有 `SpillRef` 时 footer 写 `Full sorted result stored at: ${locator}. ${retrievalHint}`；缺 `spillStore`、无 session owner、或 `saveText` 抛错时返回 `undefined`，footer 改口「complete result could not be saved」，**搜索本身仍成功**。 [E: packages/fs/tool-fs-search/src/glob.ts:225] [E: packages/fs/tool-fs-search/src/search-core.ts:399] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:906]

`acceptedDirectCallValue` 只在「仍是本工具、top-level、`accept` 且下游没替换 `content`/`value`、非 `isError`」时交出 canonical value。`exec.parent !== undefined`（Code Mode 嵌套 dispatch）或下游已经换了 `value` 时 **不 spill**。 [E: packages/fs/tool-fs-search/src/direct-call.ts:23] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:894] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:881]

失败走 `SearchError`（`HarnessError` 子类），registry 把 `{ name, code }` 挂到 `isError` 结果上。代码：`SEARCH_INVALID_PATTERN`（stderr 匹配 `regex parse error|error parsing glob`）、`SEARCH_FAILED`（启动失败 / 丢 collect stream / 非 0/1 退出 / signal kill）、`SEARCH_RAW_OUTPUT_OVERFLOW`（stdout 超 cap 或 `lossy`）、`SEARCH_ABORTED`（`exec.signal` 在完成前 abort）。 [E: packages/fs/tool-fs-search/src/search-core.ts:89] [E: packages/fs/tool-fs-search/src/search-core.ts:125] [E: packages/fs/tool-fs-search/src/search-core.ts:150] [E: packages/fs/tool-fs-search/src/search-core.ts:221] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:569]

UI：`presentGlobCall` 给 pending 卡 `card: 'generic', kind: 'search'`，标题 `Glob ${pattern}` 或 `Glob ${pattern} in ${path}`。 [E: packages/fs/tool-fs-search/src/glob.ts:269] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:1109] 成功结果的 `presentationMeta` 是 `globSearchMeta`：`{ shape: 'paths', paths, truncated, total }`，再被 `capMetaBytes` 按 `maxMetaBytes` 丢尾路径。 [E: packages/fs/tool-fs-search/src/glob.ts:339] [E: packages/fs/tool-fs-search/src/presentation.ts:151] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:1150] `presentGlobResult` 只接受 `shape === 'paths'`；error / 畸形 meta / grep 的 `matches` shape 返回 `undefined`，UI 回落到 raw `tool/result` 文本。 [E: packages/fs/tool-fs-search/src/glob.ts:286] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:1170] 嵌套 Code dispatch 不算 `presentationMeta`（`exec.parent` 已定义）。 [E: packages/core/tools/src/index.ts:1806]

`toWorkdirRelative` 只改展示：workdir 内的绝对路径变成相对路径，workdir 外的绝对路径原样留下。后续 `read` 能读这些相对路径，依赖 workdir 与 `ctx.fs` 根是同一 workspace——代码不在运行时校验。 [E: packages/fs/tool-fs-search/src/search-core.ts:289] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:736] [I]

## 背后的 seam

三角：

| 角色 | 在哪 |
|---|---|
| **Definition** | `@deepseek-ai/dsh-subprocess` 的 `ctx.subprocess` / `SubprocessRuntime`。`glob` 把 pattern / path 编成 `string[]` argv，再交给 `spawn`，中间没有 shell 层。 [E: packages/fs/tool-fs-search/src/glob.ts:90] [E: packages/fs/tool-fs-search/src/search-core.ts:228] |
| **Provider** | 默认本地实现 `@deepseek-ai/dsh-subprocess-local`；远程世界可换 E2B 等另一 provider。 |
| **Consumer** | `runRipgrep`：`ctx.subprocess.spawn({ argv: [rgPath, '--no-config', ...buildGlobCommand], cwd, stdio, graceMs, signal })`。 [E: packages/fs/tool-fs-search/src/search-core.ts:227] [E: packages/fs/tool-fs-search/src/search-core.ts:228] |

`resolveRgPath` 惰性 `import('@vscode/ripgrep')` 取 `rgPath`，按进程 memoize。缺平台包时失败落在**第一次** search 调用，分类为 `SEARCH_FAILED`，不会在 Loader 组合期炸掉。 [E: packages/fs/tool-fs-search/src/search-core.ts:171] [E: packages/fs/tool-fs-search/src/search-core.ts:172] [E: packages/fs/tool-fs-search/tests/rg-path.spec.ts:30] 依赖声明在 `@vscode/ripgrep`. [E: packages/fs/tool-fs-search/package.json:35]

换 subprocess provider 会带走 spawn 的执行世界。环境 scrub（credential 形名字和 `DSH_*`）落在 seam 导出的 `scrubbedParentEnv`。 [E: packages/subprocess/subprocess/src/index.ts:60] cwd / SIGTERM→grace→SIGKILL / collect 由各 provider 兑现 `SubprocessSpawnSpec` 与 `SubprocessRuntime` 合同，不在 `scrubbedParentEnv` 里。 [I] `glob` **不**读 `ctx.fs`、**不**读 `ctx.shell`、**不** `ctx.shell.start()`、**不**建 background job。每调用一个 foreground spawn，返回前 `handle.done` 已 settle。 [E: packages/fs/tool-fs-search/tests/tools.spec.ts:1103]

`ctx.spillStore` 用 `ctx.get('spillStore')` 机会读取，**不**在 `inject` 里。 [E: packages/fs/tool-fs-search/src/search-core.ts:382] spawn 是 unconfined 的 plain `ctx.subprocess` 调用，所以 argv 预置 `--no-config`，防止宿主 `RIPGREP_CONFIG_PATH` / 旁路 `rg.conf` 注入 `--pre`。 [E: packages/fs/tool-fs-search/src/search-core.ts:228]

## 执行管线

入口是 `ToolRuntime.execute`：`prepareExecution` →（可选 dispatch）→ `finalizeScheduledExecution`。 [E: packages/core/tools/src/index.ts:1342]

1. **`tools/pre-execute` waterfall**，默认 `allow`。`applyGlobTool` 只挂 `tools/post-execute`，不发 `ask`，schema 也没有 escalation 字段。若别的插件 `ask`，才走 `ctx.get('approval')`；本工具自己不请求审批。 [E: packages/core/tools/src/index.ts:1476] [E: packages/fs/tool-fs-search/src/glob.ts:361]
2. **`tools/execute` around-dispatch**。host 组合里的 `@deepseek-ai/dsh-tool-call-timeout-policy` 读 `ctx.tools.get(name).timeoutMs`；有预算就 `deadline(exec.signal, timeoutMs, TOOL_TIMEOUT)` 换到 `exec.signal`，到期把结果换成 `TOOL_TIMEOUT`。 [E: packages/guard/timeout-policy/src/index.ts:56] [E: packages/guard/timeout-policy/src/index.ts:59] [E: packages/guard/timeout-policy/src/index.ts:61] `runRipgrep` 把该 signal 传进 spawn，并在多处检查 `exec.signal.aborted` → `SEARCH_ABORTED`。 [E: packages/fs/tool-fs-search/src/search-core.ts:236]
3. **`tool.execute`**（`defineTool` 先 `validateArgs`，再 `parseGlobArgs` + `runRipgrep`）。 [E: packages/core/tools/src/schema.ts:586] [E: packages/fs/tool-fs-search/src/glob.ts:343]
4. **`tools/post-execute` waterfall**。`applyGlobTool` 先 `await next()`，再用 `acceptedDirectCallValue` 决定是否把超 cap 的完整列表写成 spill，并 **只替换 `content`**（不替换 `value`）。 [E: packages/fs/tool-fs-search/src/glob.ts:361] [E: packages/core/tools/src/index.ts:1744]
5. **sandbox**：`glob` 不经 `ctx.fs` / `sandboxPolicy` 包一层；文件副作用沙箱罩不到这条 unconfined spawn。不可用沙箱不会让 `glob` 改走裸 `rg`——它本来就只走 `ctx.subprocess`。

`isConcurrencySafe` 未声明，registry `executionMode` 对这种工具返回 `exclusive`。 [E: packages/core/tools/src/index.ts:1278]

## Preset 装配

shipped 成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。

| preset | 是否装 `@deepseek-ai/dsh-tool-fs-search` | `disabled` | isolate | Config |
|---|---|---|---|---|
| `minimal` | **不装**。isolate 组里只有 `dsh-tool-bash-persistent` 与 `dsh-tool-str-replace-editor` | — | `isolate.terminals` / `isolate.fs` 属于那两包，不是 search | — [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] |
| `standard` | 装。id `tool-fs-search` | 无 | 无（只注册进 host `tools`） | `sampleOverCapGlobResults: false` [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:59] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:62] |
| `code` | 装（与 standard 同形；Code Mode 是呈现层，工具行仍在） | 无 | 无 | `sampleOverCapGlobResults: false` [E: apps/cli/config/agent-presets/code/agent.cordis.yml:66] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:69] |
| `cordis` | 装 | 无 | 无 | `sampleOverCapGlobResults: false` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:60] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:63] |

`dsh-base` 也插了同 id 行，同样 `sampleOverCapGlobResults: false`。 [E: packages/bundle/base/cordis.patch.yml:227] [E: packages/bundle/base/cordis.patch.yml:230] `dsh-web-app` 把 host 那一行 `disabled: true`，Web 会话因此只看见 preset 再插的那份。 [E: packages/bundle/web-app/cordis.patch.yml:315] [E: packages/bundle/web-app/cordis.patch.yml:316] headless 无 agent-presets roster 时，走 host 那一行（仍是同一包、同一 Config 键）。

`code` preset 下模型直接点名走 `run_code` collapse；SDK / 嵌套 dispatch 仍执行同一个 `glob` `execute`，只是不写 top-level spill / `presentationMeta`。

## execute() 走读

1. `ToolRuntime.execute@packages/core/tools/src/index.ts` 进入 `prepareExecution`，跑 `tools/pre-execute`。`glob` 无本工具门控，默认 `allow`。 [E: packages/core/tools/src/index.ts:1477]
2. `timeout-policy` 在 `tools/execute` 上把 `SEARCH_TIMEOUT_MS`（或 Config 覆盖）接到 `exec.signal`。 [E: packages/guard/timeout-policy/src/index.ts:57]
3. `defineTool.execute` 校验 schema；失败抛 `ToolArgsError`。 [E: packages/core/tools/src/schema.ts:587]
4. `parseGlobArgs@packages/fs/tool-fs-search/src/glob.ts` 拒空白 `pattern` / 空白 `path`。 [E: packages/fs/tool-fs-search/src/glob.ts:73] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:742]
5. `buildGlobCommand` 固定 argv：`--files`、`--glob=${pattern}`、`--sort=modified`、`--no-ignore`、`--hidden`，再对每个 VCS 名加一对 `--glob=!**/${name}` 与 `--glob=!**/${name}/**`；有 `path` 则 `--` + path。 [E: packages/fs/tool-fs-search/src/glob.ts:92] [E: packages/fs/tool-fs-search/src/glob.ts:102] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:330]
6. `runRipgrep@packages/fs/tool-fs-search/src/search-core.ts`：`cwd = exec.agent?.session.header.cwd ?? process.cwd()`。 [E: packages/fs/tool-fs-search/src/search-core.ts:223] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:386] spawn `[rgPath, '--no-config', ...argv]`，`stdin: 'ignore'`，stdout/stderr 按 `rawOutputMaxBytes` / `stderrMaxBytes` collect（**不**请求 raw spill 文件）。 [E: packages/fs/tool-fs-search/src/search-core.ts:228] [E: packages/fs/tool-fs-search/src/search-core.ts:232]
7. exit 0 → 有结果；exit 1 → `noMatches: true`；其它退出走 `classifyRunFailure`。 [E: packages/fs/tool-fs-search/src/search-core.ts:270] [E: packages/fs/tool-fs-search/src/search-core.ts:274] integration 测试钉死真实打包 `rg`：mtime 序、`.hidden.ts` 入选、`.git/config.ts` 排除、根就是 `.git` 时仍空、非法 `[` → `SEARCH_INVALID_PATTERN`。 [E: packages/fs/tool-fs-search/tests/integration.spec.ts:79] [E: packages/fs/tool-fs-search/tests/integration.spec.ts:80] [E: packages/fs/tool-fs-search/tests/integration.spec.ts:82] [E: packages/fs/tool-fs-search/tests/integration.spec.ts:98] [E: packages/fs/tool-fs-search/tests/integration.spec.ts:104]
8. `noMatches` 直接 `{ root, paths: [] }`；否则按行 `toWorkdirRelative` 填 `paths`。 [E: packages/fs/tool-fs-search/src/glob.ts:346] [E: packages/fs/tool-fs-search/src/glob.ts:351]
9. `createSuccessResult` 调 `renderGlobPaths` 与 `globCardPage` → `globSearchMeta`。超 cap 且 shipped `sampleOverCapGlobResults: false` 时取 mtime head。 [E: packages/core/tools/src/index.ts:1800] [E: packages/fs/tool-fs-search/src/glob.ts:238]
10. `tools/post-execute`：超 cap 的 top-level 成功调用保存 `glob-results.txt` 并重写 footer；下游若已替换 `value`，保留新 value、不 spill 旧列表。 [E: packages/fs/tool-fs-search/src/glob.ts:367] [E: packages/fs/tool-fs-search/tests/tools.spec.ts:774]

## 设计动机·edge

- **发现 ≠ 编辑。** DSH 没有 Codex `apply_patch`；`glob` 只返回路径。改内容用 `edit` / `write` 的字面替换 / 整文件写。
- **打包 `rg`，不是宿主 PATH。** 与 Claude `GlobTool` / OpenCode `glob` 一样面向模型，但执行面是 `@vscode/ripgrep` + `ctx.subprocess` 的纯 argv，没有 `find`、没有 `ctx.shell` 引号层。`$(rm -rf /)` 这类 pattern 是**一个** `--glob=` 元素。 [E: packages/fs/tool-fs-search/tests/tools.spec.ts:377]
- **`*` 不是顶层。** 无 `/` 的 pattern 匹配任意深度；`sampleOverCapGlobResults` 就是为了避免 mtime 序把刚解开的巨型 subtree 顶到 inline 页。shipped 产品选择关抽样、保留 mtime head，并依赖 spill 拿全量。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:62]
- **VCS 双排除。** 搜索根落在 `.git` 内部时，光 prune glob 匹配不到，必须再加 `/**` 内容 glob；integration 覆盖 `path: '.git'` → `No files found`。 [E: packages/fs/tool-fs-search/src/glob.ts:103] [E: packages/fs/tool-fs-search/tests/integration.spec.ts:98]
- **overflow 宁失败。** raw stdout 超 cap 或 `lossy` 一律 `SEARCH_RAW_OUTPUT_OVERFLOW`，不解析半截流。 [E: packages/fs/tool-fs-search/src/search-core.ts:150]
- **spill 是 recovery，不是成功条件。** 存储失败只改 footer。 [E: packages/fs/tool-fs-search/tests/tools.spec.ts:906]
- **无后台。** 一次调用一个 awaited spawn。 [E: packages/fs/tool-fs-search/tests/tools.spec.ts:1103]

## Sources

- packages/fs/tool-fs-search/src/glob.ts
- packages/fs/tool-fs-search/src/index.ts
- packages/fs/tool-fs-search/src/search-core.ts
- packages/fs/tool-fs-search/src/presentation.ts
- packages/fs/tool-fs-search/src/direct-call.ts
- packages/fs/tool-fs-search/package.json
- packages/fs/tool-fs-search/tests/tools.spec.ts
- packages/fs/tool-fs-search/tests/integration.spec.ts
- packages/fs/tool-fs-search/tests/presentation.spec.ts
- packages/fs/tool-fs-search/tests/load-path.spec.ts
- packages/fs/tool-fs-search/tests/rg-path.spec.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/tools/tests/tools.spec.ts
- packages/guard/timeout-policy/src/index.ts
- packages/subprocess/subprocess/src/index.ts
- packages/subprocess/subprocess/src/types.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) — `tools/pre-execute → execute → post-execute` 整条调度与 `ask` / guard。
- [ref.tools-catalog](../../reference/tools-catalog.md) — 模型可见工具清单（boot 后 `ctx.tools.schemas()`）。
- [surface.tools.grep](grep.md) — 同一 `dsh-tool-fs-search` 包的内容搜索，同样走打包 ripgrep。
- [surface.tools.read](read.md) — 用 `glob` 拿到的路径做后续读取（`ctx.fs`，不是本工具）。
- [surface.tools.edit](edit.md) / [surface.tools.write](write.md) — 字面替换 / 整文件写；DSH 无 `apply_patch`。
- [surface.tools.bash](bash.md) — one-shot `ctx.shell`；`glob` 不走这条缝。
- [subsys.execution.subprocess](../../subsystems/execution/subprocess.md) — `ctx.subprocess` Definition / Provider。
