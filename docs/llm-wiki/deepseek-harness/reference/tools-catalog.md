---
id: ref.tools-catalog
title: 模型可见工具目录
kind: catalog
tier: T3
pkg: core
source:
  - docs/tool-catalog.md
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/src/code-mode.ts
  - packages/core/tools/package.json
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/read.ts
  - packages/fs/tool-fs/src/read-image.ts
  - packages/fs/tool-fs/src/write.ts
  - packages/fs/tool-fs/src/edit.ts
  - packages/fs/tool-fs/package.json
  - packages/fs/tool-fs-search/src/index.ts
  - packages/fs/tool-fs-search/src/glob.ts
  - packages/fs/tool-fs-search/src/grep.ts
  - packages/fs/tool-str-replace-editor/src/index.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/shell/tool-pwsh/src/index.ts
  - packages/terminal/tool-terminal/src/index.ts
  - packages/jobs/tool-jobs/src/index.ts
  - packages/plan/plan-mode/src/index.ts
  - packages/todo/tool-todo/src/index.ts
  - packages/goal/tool-goal/src/index.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/subagent/tool-subagent-control/src/index.ts
  - packages/subagent/tool-subagent-control/src/list-agents.ts
  - packages/subagent/tool-subagent-report/src/index.ts
  - packages/workflow/tool-workflow/src/index.ts
  - packages/workflow/tool-ralph/src/index.ts
  - packages/web/tool-web/src/index.ts
  - packages/web/tool-web/src/search.ts
  - packages/web/tool-web/src/fetch.ts
  - packages/skill/tool-skill/src/index.ts
  - packages/interaction/tool-ask-user/src/index.ts
  - packages/lsp/tool-lsp/src/index.ts
  - packages/session-query/tool-session-query/src/index.ts
  - packages/schedule/schedule/src/index.ts
  - packages/schedule/schedule/src/tools.ts
  - packages/extensions/tool-cordis/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - schemas
  - defineTool
  - RUN_CODE_NAME
  - name
related:
  - spine.tool-call-anatomy
  - subsys.core.tools
  - ref.presets
  - surface.presets.overview
  - surface.presets.minimal
  - surface.presets.standard
  - surface.presets.code
  - surface.presets.cordis
  - subsys.core.code-mode
evidence: explicit
status: verified
updated: 47f943859b
---

> 模型可见工具是登记进 `ctx.tools` 的 **wire 名**（`defineTool({ name })`、load-time `Config.toolName`、或保留名 `run_code`）。这是 **agent-preset 面**（每会话 tools / persona / isolate），不是 host 面（webserver / persistence / sandbox）。DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是固定工具清单的「又一个 coding agent」。默认产品是本地 Web GUI（`dsh web`），web 出厂 preset 是 `standard`；本仓没有 shipped TUI 包。

## 能回答的问题

- 某个模型可见 wire 名由哪个 `@deepseek-ai/dsh-tool-*`（或 `dsh-tools` / `dsh-plan-mode` / `dsh-schedule`）登记？两个 `bash` 是不是同一个包？
- 四个 shipped preset 里谁装了它？`disabled`、平台门、`Config.fetch: false` 分别是什么意思？
- 名字能不能改？`subagent` / `workflow` 的 `toolName` 和保留名 `run_code` 差在哪？
- `code` preset 下模型请求头还看不看得见 `read` / `bash`？`run_code` 怎么进 wire？
- `terminal_*` / `lsp` / `session_*` / `schedule_*` / `report` 在不在四个 `agent.cordis.yml` 里？
- 官方 `docs/tool-catalog.md` 和冻结源码有什么漂移？跟哪一边？

## 范围与 ground truth

本页是 T3 **catalog**：一行 = 一个模型可见 wire 名。同名不同包拆两行（`bash@tool-bash` 与 `bash@tool-bash-persistent`）。分组是为了读，不是为了丢实例。不写 JSON schema 字段表（那是 T1 `surface/tools/*`）。

**工具集 ground truth** = `packages/*/tool-*`，加上同样往 `ctx.tools` 登记的 `packages/plan/plan-mode`（`exit_plan_mode`）、`packages/core/tools`（Code Mode `run_code`）、`packages/schedule/schedule`、`packages/extensions/tool-cordis`。工厂是 `defineTool`；登记拒绝阴影保留名；公开投影是 `schemas()`。[E: packages/core/tools/src/schema.ts:545][E: packages/core/tools/src/index.ts:1054][E: packages/core/tools/src/index.ts:1234]

**Preset 成员资格只认** `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。仓库里有包、或 `packages/bundle/base/cordis.patch.yml` 有 host 行，都不算 shipped preset 成员。表内单元格顺序固定为 **min / std / code / cordis**：

- `装` = 该 yml 有实现包这一 `id:` 且未写 `disabled: true`（平台门另标）
- `禁` = 行在但 `disabled: true`
- `非win32装` / `win32装` = `disabled: !!js process.platform === …`
- `包装·fetch关` = 包装了 `@deepseek-ai/dsh-tool-web` 但 `config.fetch: false`，`web_fetch` 不登记
- `仅code` = 不是独立 tool 插件，而是 `tool-presentation` `mode: code` 让保留运输进 wire
- `—` = 该 yml 没有这一实现包

`code` 与 `standard` 装同一套能力插件；差别是 `code` 多一行 `@deepseek-ai/dsh-agent-tool-presentation` `mode: code`。系统提示走 `wireSchemas`：`mode: 'code'` 时模型请求头**只**带 `run_code`，其它已装工具改走 SDK 绑定。[E: packages/core/agent-tool-presentation/src/index.ts:70][E: packages/core/tools/src/index.ts:832][E: packages/core/tools/src/index.ts:996][E: apps/cli/config/agent-presets/code/agent.cordis.yml:262]

`schemas()` 读的是 scope 的 `visible` 表：非 `native` 时会**另外**插入 `run_code`，但**不会**把其它已登记名滤掉。所以 `code` 会话上 `schemas()` 仍含 `read`/`bash` 等，和模型请求头不是同一份清单。[E: packages/core/tools/src/index.ts:1190][E: packages/core/tools/src/index.ts:1234]

官方 `docs/tool-catalog.md` 只当查漏，**不当 [E]**。它按默认 Config boot 各包读 `schemas()`，所以会列出 `web_fetch`（包默认 `fetch: true`），并写 `tool-cordis`「不在任何 shipped 树」。冻结树跟四个 yml：`std`/`code`/`cordis` 关 fetch；`cordis` preset **装** `@deepseek-ai/dsh-tool-cordis`。[I]

不收：`examples/` 演示工具（如 `echo`）；MCP / `cordis_define` 之后动态再登记的名字（运行期追加，不是本表静态行）；人命令（`ctx.commands`，不经模型 turn）。

T1 `surface/tools/*` 写单工具 schema / execute；T2 [`subsys.core.tools`](../subsystems/core/tools.md) 写 registry 管线；[`ref.presets`](presets.md) 写插件 `id:` 对照。本页只回答「wire 名 ↔ 包 ↔ seam ↔ 四个 yml」。

## 实例表

改名规则：绝大多数 `defineTool` 字面量写死 `name`，Config **没有**改名键。例外：`@deepseek-ai/dsh-tool-subagent` 与 `@deepseek-ai/dsh-tool-workflow` 的 `Config.toolName`；`run_code` 是 `RUN_CODE_NAME`，`register` / `restrict` 都禁这个字符串。[E: packages/core/tools/src/code-mode.ts:20][E: packages/subagent/tool-subagent/src/index.ts:83][E: packages/workflow/tool-workflow/src/index.ts:41]

### 文件系统

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `read` | `@deepseek-ai/dsh-tool-fs` | 固定 `read` | `ctx.fs` | — / 装 / 装 / 装 | 读 UTF-8 文本（行号窗口） | `packages/fs/tool-fs/src/read.ts` [E: packages/fs/tool-fs/src/read.ts:77] |
| `read_image` | `@deepseek-ai/dsh-tool-fs` | 固定 `read_image`；无 `ctx.attachments` 则不登记 | `ctx.fs` + `ctx.attachments`（执行再查 `ctx.llm` 图像能力） | — / 装 / 装 / 装 | 读图为附件；host `base` 挂了 `attachment-local` | `packages/fs/tool-fs/src/read-image.ts` [E: packages/fs/tool-fs/src/index.ts:70][E: packages/fs/tool-fs/src/read-image.ts:132][E: packages/bundle/base/cordis.patch.yml:107] |
| `write` | `@deepseek-ai/dsh-tool-fs` | 固定 `write` | `ctx.fs` | — / 装 / 装 / 装 | 整文件创建/覆盖 | `packages/fs/tool-fs/src/write.ts` [E: packages/fs/tool-fs/src/write.ts:70] |
| `edit` | `@deepseek-ai/dsh-tool-fs` | 固定 `edit` | `ctx.fs` | — / 装 / 装 / 装 | 字面量替换 | `packages/fs/tool-fs/src/edit.ts` [E: packages/fs/tool-fs/src/edit.ts:84] |
| `glob` | `@deepseek-ai/dsh-tool-fs-search` | 固定 `glob` | `ctx.subprocess`（打包 ripgrep） | — / 装 / 装 / 装 | 按路径模式找文件 | `packages/fs/tool-fs-search/src/glob.ts` [E: packages/fs/tool-fs-search/src/glob.ts:312] |
| `grep` | `@deepseek-ai/dsh-tool-fs-search` | 固定 `grep` | `ctx.subprocess` | — / 装 / 装 / 装 | 按正则搜文件内容 | `packages/fs/tool-fs-search/src/grep.ts` [E: packages/fs/tool-fs-search/src/grep.ts:283] |
| `str_replace_editor` | `@deepseek-ai/dsh-tool-str-replace-editor` | 固定 `str_replace_editor`（可改 description） | `ctx.fs` | 装 / — / — / — | minimal 的 view/create/唯一替换/插入 | `packages/fs/tool-str-replace-editor/src/index.ts` [E: packages/fs/tool-str-replace-editor/src/index.ts:423][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] |

`tool-fs` / `tool-fs-search` 在 `standard` / `code` / `cordis` 各有一行；`minimal` 只用 isolate 里的 `str-replace-editor`，不装 `tool-fs`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:57][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59]

### shell（两个 `bash`）

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `bash`（one-shot） | `@deepseek-ai/dsh-tool-bash` | 固定 `bash` | `ctx.shell` + `ctx.shellEnv`；后台再碰 `ctx.jobs` | — / 非win32装 / 非win32装 / 非win32装 | 每次 `bash -c` 新进程，无 PTY 状态 | `packages/shell/tool-bash/src/index.ts` [E: packages/shell/tool-bash/src/index.ts:243][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:46] |
| `bash`（persistent） | `@deepseek-ai/dsh-tool-bash-persistent` | 固定 `bash`（可改 description） | `ctx.terminals` | 装 / — / — / — | 同一 owner 的持久 PTY bash | `packages/shell/tool-bash-persistent/src/index.ts` [E: packages/shell/tool-bash-persistent/src/index.ts:375][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33] |
| `pwsh` | `@deepseek-ai/dsh-tool-pwsh` | 固定 `pwsh` | `ctx.shell` + `ctx.shellEnv` | — / win32装 / win32装 / win32装 | one-shot PowerShell，镜像 bash 参数面 | `packages/shell/tool-pwsh/src/index.ts` [E: packages/shell/tool-pwsh/src/index.ts:253][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:50] |

两个 `bash` **不能**同时进同一 scope 的 `visible`：同名后登记覆盖先登记。shipped 树用平台门 + preset 分家避免撞车：`minimal` 只装 persistent；`standard`/`code`/`cordis` 在非 Windows 装 one-shot、Windows 装 `pwsh`。

### `terminal_*`

四个 shipped yml **都没有** `@deepseek-ai/dsh-tool-terminal`。包存在 ≠ 产品装。

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `terminal_open` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals` | — / — / — / — | 开一条 owner 隔离 PTY | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:163] |
| `terminal_send` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals`；`run_in_background` 时 `ctx.jobs` | — / — / — / — | 往已开终端写 stdin | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:198] |
| `terminal_read` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals` | — / — / — / — | 读保留输出，不发送 | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:297] |
| `terminal_signal` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals` | — / — / — / — | 向前台进程组发信号 | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:330] |
| `terminal_close` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals` | — / — / — / — | 关会话并等进程树退出 | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:355] |
| `terminal_list` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals` | — / — / — / — | 列出本 agent 的终端 | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:386] |

### `job_*`

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `job_output` | `@deepseek-ai/dsh-tool-jobs` | 固定 `job_output` | `ctx.jobs` | — / 装 / 装 / 装 | 读后台 job（可 wait） | `packages/jobs/tool-jobs/src/index.ts` [E: packages/jobs/tool-jobs/src/index.ts:303] |
| `job_list` | `@deepseek-ai/dsh-tool-jobs` | 固定 | `ctx.jobs` | — / 装 / 装 / 装 | 列出本 owner 的 job | `packages/jobs/tool-jobs/src/index.ts` [E: packages/jobs/tool-jobs/src/index.ts:343] |
| `job_kill` | `@deepseek-ai/dsh-tool-jobs` | 固定 | `ctx.jobs` | — / 装 / 装 / 装 | 请求取消一个 job | `packages/jobs/tool-jobs/src/index.ts` [E: packages/jobs/tool-jobs/src/index.ts:363] |

job **registry** 在 host 面；preset 只决定模型能不能调用这三件套。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:74]

### plan / todo

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `exit_plan_mode` | `@deepseek-ai/dsh-plan-mode` | 固定 `EXIT_PLAN_MODE` | `ctx.planMode`；执行 `ctx.get('userQuestions')` | — / 装 / 装 / 装 | 提交计划请人审；非 plan 模式仍登记、调用拒绝 | `packages/plan/plan-mode/src/index.ts` [E: packages/plan/plan-mode/src/index.ts:67][E: packages/plan/plan-mode/src/index.ts:306] |
| `todo_write` | `@deepseek-ai/dsh-tool-todo` | 固定 `todo_write` | 调用方 session（可选 `ctx.sessionProjections`） | — / 装 / 装 / 装 | 整表替换当前会话 todo | `packages/todo/tool-todo/src/index.ts` [E: packages/todo/tool-todo/src/index.ts:150] |

`todo` 的 `allowParallelInProgress` **无默认**，三个非 minimal preset 都写成 `true`。[E: packages/todo/tool-todo/src/index.ts:42][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:243]

### goal

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `get_goal` | `@deepseek-ai/dsh-tool-goal` | 固定 | `ctx.goals` | — / 装 / 装 / 装 | 读本会话当前 goal | `packages/goal/tool-goal/src/index.ts` [E: packages/goal/tool-goal/src/index.ts:196] |
| `create_goal` | `@deepseek-ai/dsh-tool-goal` | 固定 | `ctx.goals`（要 direct-human） | — / 装 / 装 / 装 | 为长任务建持久 goal | `packages/goal/tool-goal/src/index.ts` [E: packages/goal/tool-goal/src/index.ts:208] |
| `update_goal` | `@deepseek-ai/dsh-tool-goal` | 固定 | `ctx.goals` | — / 装 / 装 / 装 | edit/pause/resume/complete/blocked | `packages/goal/tool-goal/src/index.ts` [E: packages/goal/tool-goal/src/index.ts:235] |

### subagent

`@deepseek-ai/dsh-tool-subagent` 每装一次登记 **一个** 名 = load-time `toolName`（默认 `subagent`）。shipped `standard`/`code`/`cordis` 装两行活的：`toolName: subagent`（`provider: spawn`）与 `toolName: subagent_fork`（`provider: fork`）；另两行 `subagent_codex` / `subagent_claude_code` 写在 yml 里但 `disabled: true`。[E: packages/subagent/tool-subagent/src/index.ts:298][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:190][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:197][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:205]

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `subagent` | `@deepseek-ai/dsh-tool-subagent` | 默认 `subagent`；`Config.toolName` 可改 | `ctx.subagents` | — / 装 / 装 / 装 | 委派 spawn 子 agent | `packages/subagent/tool-subagent/src/index.ts` |
| `subagent_fork` | `@deepseek-ai/dsh-tool-subagent`（第二行） | shipped `toolName: subagent_fork` | `ctx.subagents` | — / 装 / 装 / 装 | 委派 fork 子 agent | `packages/subagent/tool-subagent/src/index.ts` |
| `subagent_codex` | `@deepseek-ai/dsh-tool-subagent` | shipped `toolName: subagent_codex` | `ctx.subagents` | — / 禁 / 禁 / 禁 | 产品 Codex backend；复制 preset 后去掉 `disabled` 才进 wire | `apps/cli/config/agent-presets/standard/agent.cordis.yml` [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:208] |
| `subagent_claude_code` | `@deepseek-ai/dsh-tool-subagent` | shipped `toolName: subagent_claude_code` | `ctx.subagents` | — / 禁 / 禁 / 禁 | 产品 claude-code backend；复制 preset 后去掉 `disabled` 才进 wire | `apps/cli/config/agent-presets/standard/agent.cordis.yml` [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:217] |
| `send_message` | `@deepseek-ai/dsh-tool-subagent-control` | 固定 | `ctx.subagents` | — / 装 / 装 / 装 | 给 continuable 子会话排队下一 turn | `packages/subagent/tool-subagent-control/src/index.ts` [E: packages/subagent/tool-subagent-control/src/index.ts:27] |
| `interrupt_agent` | `@deepseek-ai/dsh-tool-subagent-control` | 固定 | `ctx.subagents` | — / 装 / 装 / 装 | 取消子 agent 当前 turn | `packages/subagent/tool-subagent-control/src/index.ts` [E: packages/subagent/tool-subagent-control/src/index.ts:80] |
| `list_agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | 固定 | `ctx.subagents` + `ctx.agents` | — / 装 / 装 / 装 | 列出 continuable 子 agent | `packages/subagent/tool-subagent-control/src/list-agents.ts` [E: packages/subagent/tool-subagent-control/src/list-agents.ts:93] |
| `report` | `@deepseek-ai/dsh-tool-subagent-report` | 固定 `report` | `ctx.subagents`（装进 **子** scope） | — / — / — / — | 子 agent 向直接父投递结果；四个 yml 都没有这行 | `packages/subagent/tool-subagent-report/src/index.ts` [E: packages/subagent/tool-subagent-report/src/index.ts:66] |

`report` 的插件在 **host** `base`：`registerContinuableSetup`，只出现在 continuable in-process 子会话，根 / one-shot / 远程 provider 看不见。[E: packages/subagent/tool-subagent-report/src/index.ts:140][E: packages/bundle/base/cordis.patch.yml:333]

### workflow

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `workflow` | `@deepseek-ai/dsh-tool-workflow` | 默认 `workflow`；`Config.toolName` 可改 | `ctx.workflowEngine` | — / 装 / 装 / 装 | 用 JS 脚本编排多 subagent | `packages/workflow/tool-workflow/src/index.ts` [E: packages/workflow/tool-workflow/src/index.ts:218] |
| `ralph` | `@deepseek-ai/dsh-tool-ralph` | 固定 `ralph` | `ctx.workflowEngine` + `ctx.subagents` | — / 装 / 装 / 装 | 每轮全新子 agent 的 Ralph loop | `packages/workflow/tool-ralph/src/index.ts` [E: packages/workflow/tool-ralph/src/index.ts:413] |

### web

包默认 `search`/`fetch` 都是 `true`。三个非 minimal preset 写 `fetch: false`，因此 **shipped 产品登记 `web_search`、不登记 `web_fetch`**。[E: packages/web/tool-web/src/index.ts:53][E: packages/web/tool-web/src/index.ts:54][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250]

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `web_search` | `@deepseek-ai/dsh-tool-web` | 固定；`Config.search` 控制登记（默认 true） | `ctx.web` | — / 装 / 装 / 装 | 网页搜索 | `packages/web/tool-web/src/search.ts` [E: packages/web/tool-web/src/search.ts:225] |
| `web_fetch` | `@deepseek-ai/dsh-tool-web` | 固定；`Config.fetch` 控制登记（默认 true） | `ctx.web` | — / 包装·fetch关 / 包装·fetch关 / 包装·fetch关 | 抓一个 HTTP(S) URL | `packages/web/tool-web/src/fetch.ts` [E: packages/web/tool-web/src/fetch.ts:437] |

### skill / 提问 / Code Mode / LSP

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `skill` | `@deepseek-ai/dsh-tool-skill` | 固定 `skill` | `ctx.skills` + `ctx.agents` | — / 装 / 装 / 装 | 按名加载 skill 全文 | `packages/skill/tool-skill/src/index.ts` [E: packages/skill/tool-skill/src/index.ts:82] |
| `ask_user_question` | `@deepseek-ai/dsh-tool-ask-user` | 固定 | `ctx.userQuestions` | — / 装 / 装 / 装 | 向人提问并阻塞到回答 | `packages/interaction/tool-ask-user/src/index.ts` [E: packages/interaction/tool-ask-user/src/index.ts:21] |
| `run_code` | `@deepseek-ai/dsh-tools` | 保留 `RUN_CODE_NAME`；不可登记/restrict | `ctx.codeRuntime`（执行时）；registry 运输 | — / — / 仅code / — | Code Mode 唯一 native 调用；程序内再调其它工具 | `packages/core/tools/src/code-mode.ts` [E: packages/core/tools/src/code-mode.ts:297] |
| `lsp` | `@deepseek-ai/dsh-tool-lsp` | 固定 `lsp` | `ctx.lsp` | — / — / — / — | 语言服务器导航；四个 yml 都没有 | `packages/lsp/tool-lsp/src/index.ts` [E: packages/lsp/tool-lsp/src/index.ts:107] |

`cordis` preset 同样装 `tool-skill`（另给 `skill-filesystem` 加 preset 自带 skill 目录）；`minimal` 不装。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:262]

### `session_*`

四个 shipped yml **都没有** `@deepseek-ai/dsh-tool-session-query`。

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `session_search` | `@deepseek-ai/dsh-tool-session-query` | 固定 | `ctx.sessionQuery` | — / — / — / — | 在调用方 workspace 搜其它会话 | `packages/session-query/tool-session-query/src/index.ts` [E: packages/session-query/tool-session-query/src/index.ts:67] |
| `session_event_search` | `@deepseek-ai/dsh-tool-session-query` | 固定 | `ctx.sessionQuery` | — / — / — / — | 在一个已授权会话里搜事件 | `packages/session-query/tool-session-query/src/index.ts` [E: packages/session-query/tool-session-query/src/index.ts:77] |
| `session_trace` | `@deepseek-ai/dsh-tool-session-query` | 固定 | `ctx.sessionQuery` | — / — / — / — | 读会话血缘 | `packages/session-query/tool-session-query/src/index.ts` [E: packages/session-query/tool-session-query/src/index.ts:87] |
| `session_event_trace` | `@deepseek-ai/dsh-tool-session-query` | 固定 | `ctx.sessionQuery` | — / — / — / — | 读一个事件的替换/关系 | `packages/session-query/tool-session-query/src/index.ts` [E: packages/session-query/tool-session-query/src/index.ts:97] |
| `session_event_read` | `@deepseek-ai/dsh-tool-session-query` | 固定 | `ctx.sessionQuery` | — / — / — / — | 读一条完整事件 | `packages/session-query/tool-session-query/src/index.ts` [E: packages/session-query/tool-session-query/src/index.ts:110] |

### `schedule_*`

四个 shipped yml **都没有** `@deepseek-ai/dsh-schedule`。插件在 `agent/created` 时只给 **之后** 发布的 root agent 的 scope 登记三件套。[E: packages/schedule/schedule/src/index.ts:49]

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `schedule_create` | `@deepseek-ai/dsh-schedule` | 固定 | `ctx.sessions` + session persistence | — / — / — / — | 建 after/at/every 提醒 | `packages/schedule/schedule/src/tools.ts` [E: packages/schedule/schedule/src/tools.ts:318] |
| `schedule_list` | `@deepseek-ai/dsh-schedule` | 固定 | `ctx.sessions` + session persistence | — / — / — / — | 列出本会话 schedule | `packages/schedule/schedule/src/tools.ts` [E: packages/schedule/schedule/src/tools.ts:400] |
| `schedule_delete` | `@deepseek-ai/dsh-schedule` | 固定 | `ctx.sessions` + session persistence | — / — / — / — | 按 id 删除 | `packages/schedule/schedule/src/tools.ts` [E: packages/schedule/schedule/src/tools.ts:420] |

### `cordis_*`

只出现在 `cordis` preset 的 `tool-cordis` 行。官方生成页写「不在任何 shipped 树」——跟这份 yml 冲突，本表跟 yml。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:246][I]

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/code/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `cordis_inspect_list` | `@deepseek-ai/dsh-tool-cordis` | 固定 | `ctx.cordisInspect` + `ctx.dynamicCordisRunner` | — / — / — / 装 | 列出 inspect provider | `packages/extensions/tool-cordis/src/index.ts` [E: packages/extensions/tool-cordis/src/index.ts:42] |
| `cordis_inspect_query` | `@deepseek-ai/dsh-tool-cordis` | 固定 | `ctx.cordisInspect` + `ctx.dynamicCordisRunner` | — / — / — / 装 | 调一个 inspect 方法 | `packages/extensions/tool-cordis/src/index.ts` [E: packages/extensions/tool-cordis/src/index.ts:61] |
| `cordis_inspect_self` | `@deepseek-ai/dsh-tool-cordis` | 固定 | `ctx.cordisInspect` + `ctx.dynamicCordisRunner` | — / — / — / 装 | 检视当前运行时自身 | `packages/extensions/tool-cordis/src/index.ts` [E: packages/extensions/tool-cordis/src/index.ts:97] |
| `cordis_define` | `@deepseek-ai/dsh-tool-cordis` | 固定 | `ctx.dynamicCordisRunner` | — / — / — / 装 | 定义动态 package（可再登记额外工具） | `packages/extensions/tool-cordis/src/index.ts` [E: packages/extensions/tool-cordis/src/index.ts:149] |
| `cordis_run` | `@deepseek-ai/dsh-tool-cordis` | 固定 | `ctx.dynamicCordisRunner` | — / — / — / 装 | 激活一个 Package | `packages/extensions/tool-cordis/src/index.ts` [E: packages/extensions/tool-cordis/src/index.ts:241] |
| `cordis_stop` | `@deepseek-ai/dsh-tool-cordis` | 固定 | `ctx.dynamicCordisRunner` | — / — / — / 装 | 停当前 Run，保留定义 | `packages/extensions/tool-cordis/src/index.ts` [E: packages/extensions/tool-cordis/src/index.ts:330] |
| `cordis_undefine` | `@deepseek-ai/dsh-tool-cordis` | 固定 | `ctx.dynamicCordisRunner` | — / — / — / 装 | 永久删除动态 Plugin | `packages/extensions/tool-cordis/src/index.ts` [E: packages/extensions/tool-cordis/src/index.ts:352] |

## 对照 / 分家 / 装配

**两个 `bash`。** `dsh-tool-bash` 消费 `ctx.shell`（一次一进程）；`dsh-tool-bash-persistent` 消费 `ctx.terminals`（PTY 状态跨调用）。wire 名都是 `bash`，必须靠 composition 分家。`minimal` 的 persona 写死只组合 persistent `bash` 与 `str_replace_editor`。[E: packages/shell/tool-bash/src/index.ts:31][E: packages/shell/tool-bash-persistent/src/index.ts:402]

**`code` 的 wire 塌缩。** 能力插件与 `standard` 同装；`tool-presentation` `mode: code` 之后，模型 **native 目录**只剩 `run_code`。其它 wire 名仍在 registry，经 SDK 从程序里调用，再走完整 `tools/pre-execute → execute`。`both` 会把 `run_code` **加**进 native 目录而不是替换。[E: packages/core/tools/src/index.ts:996][E: packages/core/tools/src/index.ts:1000]

**`web_fetch` vs 官方 catalog。** 生成器按包默认 Config boot，所以官方表有 `web_fetch`。四个 shipped 里只有 `std`/`code`/`cordis` 装 `tool-web`，且全部 `fetch: false`。跟代码：出厂 Web 产品模型看不到 `web_fetch`，除非改 composition。[I]

**`report` 是 host 面 setup，不是 preset 工具行。** `standard` yml 注释写明不能把 `tool-subagent-report` 放进 preset（continuable setup 不是 scope-aware，装两次会撞）。子会话看得到 `report`，是因为 `base` bundle 装了它。

**官方 `list_agents` 行写了 `ctx.sessionProjections`。** 冻结源的 `inject` 是 `['tools', 'subagents', 'agents']`。跟 `inject`。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:18][I]

**动态加名。** `cordis_define` 跑起来的 package、以及 MCP 客户端，都可以再 `ctx.tools.register` 出本表没有的 wire 名。那些名字是运行期实例，不是 shipped 静态目录。

**headless。** headless bundle **不**挂 `agent-presets` roster；本表四列回答的是 web 产品四个 shipped composition，不是 headless host 树。

## Sources

- `docs/tool-catalog.md`（查漏，禁止 [E]）
- `packages/core/tools/src/index.ts`
- `packages/core/tools/src/schema.ts`
- `packages/core/tools/src/code-mode.ts`
- `packages/core/tools/package.json`
- `packages/core/agent-tool-presentation/src/index.ts`
- `packages/fs/tool-fs/src/index.ts`
- `packages/fs/tool-fs/src/read.ts`
- `packages/fs/tool-fs/src/read-image.ts`
- `packages/fs/tool-fs/src/write.ts`
- `packages/fs/tool-fs/src/edit.ts`
- `packages/fs/tool-fs/package.json`
- `packages/fs/tool-fs-search/src/index.ts`
- `packages/fs/tool-fs-search/src/glob.ts`
- `packages/fs/tool-fs-search/src/grep.ts`
- `packages/fs/tool-str-replace-editor/src/index.ts`
- `packages/shell/tool-bash/src/index.ts`
- `packages/shell/tool-bash-persistent/src/index.ts`
- `packages/shell/tool-pwsh/src/index.ts`
- `packages/terminal/tool-terminal/src/index.ts`
- `packages/jobs/tool-jobs/src/index.ts`
- `packages/plan/plan-mode/src/index.ts`
- `packages/todo/tool-todo/src/index.ts`
- `packages/goal/tool-goal/src/index.ts`
- `packages/subagent/tool-subagent/src/index.ts`
- `packages/subagent/tool-subagent-control/src/index.ts`
- `packages/subagent/tool-subagent-control/src/list-agents.ts`
- `packages/subagent/tool-subagent-report/src/index.ts`
- `packages/workflow/tool-workflow/src/index.ts`
- `packages/workflow/tool-ralph/src/index.ts`
- `packages/web/tool-web/src/index.ts`
- `packages/web/tool-web/src/search.ts`
- `packages/web/tool-web/src/fetch.ts`
- `packages/skill/tool-skill/src/index.ts`
- `packages/interaction/tool-ask-user/src/index.ts`
- `packages/lsp/tool-lsp/src/index.ts`
- `packages/session-query/tool-session-query/src/index.ts`
- `packages/schedule/schedule/src/index.ts`
- `packages/schedule/schedule/src/tools.ts`
- `packages/extensions/tool-cordis/src/index.ts`
- `packages/bundle/base/cordis.patch.yml`
- `apps/cli/config/agent-presets/minimal/agent.cordis.yml`
- `apps/cli/config/agent-presets/standard/agent.cordis.yml`
- `apps/cli/config/agent-presets/code/agent.cordis.yml`
- `apps/cli/config/agent-presets/cordis/agent.cordis.yml`

## 相关

- [spine.tool-call-anatomy](../spine/tool-call-anatomy.md) — 一次 tool call 如何进 `tools/pre-execute → execute`，以及 model-visible ⟺ logged
- [subsys.core.tools](../subsystems/core/tools.md) — `ctx.tools` registry、`defineTool`、`schemas` / `presentAs`
- [ref.presets](presets.md) — 四个 `agent.cordis.yml` 的插件 `id:` 对照（本表 preset 列的权威来源）
- [surface.presets.overview](../surface/presets/overview.md) — roster / default `standard` / headless 不挂 preset
- [surface.presets.minimal](../surface/presets/minimal.md) — 只有 persistent `bash` + `str_replace_editor`
- [surface.presets.standard](../surface/presets/standard.md) — 出厂编码 agent 工具集
- [surface.presets.code](../surface/presets/code.md) — `mode: code` 与 `run_code`
- [surface.presets.cordis](../surface/presets/cordis.md) — `cordis_*` 自修改套件
- [subsys.core.code-mode](../subsystems/core/code-mode.md) — `RUN_CODE_NAME` 运输与 SDK 绑定
