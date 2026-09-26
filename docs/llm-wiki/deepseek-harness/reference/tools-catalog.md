---
id: ref.tools-catalog
title: 模型可见工具目录
kind: catalog
tier: T3
pkg: core
source:
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/src/ptc.ts
  - packages/core/tools/package.json
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/ptc-runtime/ptc-runtime/src/index.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/read.ts
  - packages/fs/tool-fs/src/read-image.ts
  - packages/fs/tool-fs/src/write.ts
  - packages/fs/tool-fs/src/edit.ts
  - packages/fs/tool-fs-search/src/glob.ts
  - packages/fs/tool-fs-search/src/grep.ts
  - packages/deliverables/tool-present/src/index.ts
  - packages/fs/tool-str-replace-editor/src/index.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/shell/tool-pwsh/src/index.ts
  - packages/shell/tool-pwsh-persistent/src/index.ts
  - packages/terminal/tool-terminal/src/index.ts
  - packages/jobs/tool-jobs/src/index.ts
  - packages/plan/plan-mode/src/index.ts
  - packages/todo/tool-todo/src/index.ts
  - packages/goal/tool-goal/src/index.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/subagent/tool-subagent/src/list-models.ts
  - packages/subagent/tool-subagent-control/src/index.ts
  - packages/subagent/tool-subagent-control/src/list-agents.ts
  - packages/workflow/tool-workflow/src/index.ts
  - packages/workflow/tool-ralph/src/index.ts
  - packages/web/tool-web/src/index.ts
  - packages/web/tool-web/src/search.ts
  - packages/web/tool-web/src/fetch.ts
  - packages/skill/tool-skill/src/index.ts
  - packages/skill/tool-workspace-dependencies/src/index.ts
  - packages/boot/plugin-manager/src/tools.ts
  - packages/interaction/tool-ask-user/src/index.ts
  - packages/lsp/tool-lsp/src/index.ts
  - packages/session-query/tool-session-query/src/index.ts
  - packages/schedule/schedule/src/index.ts
  - packages/schedule/schedule/src/tools.ts
  - packages/extensions/tool-cordis/src/index.ts
  - packages/experimental/tool-agent-team/src/index.ts
  - packages/experimental/agent-team-profile/cordis.patch.yml
  - packages/mcp/mcp-resources/src/tools.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
symbols:
  - schemas
  - wireSchemas
  - defineTool
  - RUN_CODE_NAME
  - presentAs
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
  - surface.tools.present
evidence: explicit
status: verified
updated: 477b4f4205
---

> 模型可见工具是登记进 `ctx.tools` 的 **wire 名**（`defineTool({ name })`、load-time `Config.toolName`、或保留名 `run_code`）。这是 **agent-preset 面**（每会话 tools / persona / isolate），不是 host 面（webserver / persistence / sandbox）。DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）。五个 shipped CLI profile 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`；`desktop` 不是第六个 CLI profile。四个 shipped preset 只叠在 `dsh-web-app`：`dsh.bundle.patch` = `cordis.patch.yml` + `presets/{standard,ptc,minimal,cordis}.patch.yml`。web 出厂 default 是 `standard`。[E: packages/bundle/web-app/package.json:43][E: packages/bundle/web-app/cordis.patch.yml:559][E: packages/bundle/web-app/cordis.patch.yml:562][E: packages/boot/app-boot/src/profile.ts:179]

## 能回答的问题

- 某个模型可见 wire 名由哪个 `@deepseek-ai/dsh-tool-*`（或 `dsh-tools` / `dsh-plan-mode` / `dsh-schedule` / `dsh-plugin-manager/tools` / `dsh-experimental-tool-agent-team`）登记？两个 `bash`、两个 `pwsh` 是不是同一个包？
- 四个 shipped web preset（`minimal` / `standard` / `ptc` / `cordis`）里谁装了它？`disabled`、平台门、`Config.fetch` 分别是什么意思？
- 名字能不能改？`subagent` / `workflow` 的 `toolName` 和保留名 `run_code` 差在哪？
- `ptc` preset 下模型请求头还看不看得见 `read` / `bash`？`run_code` 怎么进 wire？
- `present`、`load_workspace_dependencies`、`plugin_manager` 分别挂在哪？`str_replace_editor` 出厂还挂不挂？已删的 `report` 还算不算活工具？
- `cordis_*` 现在还剩几条？旧 `cordis_define` / `cordis_run` 去哪了？

## 范围与 ground truth

本页是 T3 **catalog**：一行 = 一个模型可见 wire 名。同名不同包拆两行（`bash@tool-bash` 与 `bash@tool-bash-persistent`；`pwsh` 同理）。分组是为了读，不是为了丢实例。不写 JSON schema 字段表（那是 T1 `surface/tools/*`）。

**工具集 ground truth** = `packages/*/tool-*`（含 `packages/deliverables/tool-present` 的 `present`、`packages/skill/tool-workspace-dependencies` 的 `load_workspace_dependencies`），加上同样往 `ctx.tools` 登记的 `packages/plan/plan-mode`（`exit_plan_mode`）、`packages/core/tools`（PTC `run_code`，文件 `ptc.ts`）、`packages/schedule/schedule`、`packages/extensions/tool-cordis`、`packages/experimental/tool-agent-team`（opt-in）、`packages/boot/plugin-manager/src/tools.ts`（`plugin_manager`）。工厂是 `defineTool`；登记拒绝阴影保留名 `run_code`；公开投影是 `schemas()`；模型请求头走 `wireSchemas`。[E: packages/core/tools/src/index.ts:854][E: packages/core/tools/src/index.ts:1080][E: packages/core/tools/src/index.ts:1260][E: packages/core/tools/src/ptc.ts:30]

**Preset 成员资格只认** `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml` 里 `@deepseek-ai/dsh-agent-preset` 的 `config.plugins[]`。旧包 `packages/preset/agent-presets` 与目录 `presets/{id}/agent.cordis.yml` 已删除。仓库里有包、或 `packages/bundle/base/cordis.patch.yml` 有 host 行，都不算 shipped web preset 成员。`PROFILE_TEMPLATES` 的 headless / sdk / acp / sdk-minimal **不含**这四份 preset 文件。[E: packages/boot/app-boot/src/profile.ts:179][E: packages/boot/app-boot/src/profile.ts:186]

表内单元格顺序固定为 **min / std / ptc / cordis**：

- `装` = 该 patch 有实现包这一 `id:` 且未写 `disabled: true`（平台门另标）
- `禁` = 行在但 `disabled: true`（含 `!!js` 恒真的条件禁）
- `非win32装` / `win32装` = `disabled: !!js process.platform === …`
- `仅ptc` = 不是独立 tool 插件，而是 `tool-presentation` `mode: ptc` 让保留运输进 wire
- `settings门` = 实现包行在且未 `disabled`，但默认 settings 关，unix exact catalog **没有** 这个 wire 名
- `sdk` = 不在四个 web preset；`dsh-sdk-app` 挂（仍可能被 env 关掉）
- `—` = 该 patch 没有这一实现包

`ptc` 与 `standard` 装同一套能力插件（含 `present`），另有两处可加载差别：`ptc` 多一行 `@deepseek-ai/dsh-agent-tool-presentation` `mode: ptc`，且 `workflow-ptc` / `tool-workflow` / `tool-ralph` **全** `disabled: true`。系统提示走 `wireSchemas`：`mode: 'ptc'` 时模型请求头**只**带 `run_code`，其它已装工具改走 SDK 绑定。[E: packages/core/agent-tool-presentation/src/index.ts:50][E: packages/core/tools/src/index.ts:1008][E: packages/core/tools/src/index.ts:1022][E: packages/bundle/web-app/presets/ptc.patch.yml:119][E: packages/bundle/web-app/presets/ptc.patch.yml:144]

`schemas()` 读的是 scope 的 `visible` 表：非 `native` 时会**另外**插入 `run_code`，但**不会**把其它已登记名滤掉。所以 `ptc` 会话上 `schemas()` 仍含 `read`/`bash` 等，和模型请求头不是同一份清单。[E: packages/core/tools/src/index.ts:1215][E: packages/core/tools/src/index.ts:1260]

官方 `docs/tool-catalog.md` 只当查漏，**不当 [E]**。

不收：测试夹具 `packages/core/tools/src/testing.ts`；MCP / `cordis_inspect_query` 之后动态再登记的名字（运行期追加，不是本表静态行）；人命令（`ctx.commands`，不经模型 turn）。`plan-mode` 另登记人命令 `plan`，本表不占模型可见行。

T1 `surface/tools/*` 写单工具 schema / execute；T2 [`subsys.core.tools`](../subsystems/core/tools.md) 写 registry 管线；[`ref.presets`](presets.md) 写插件 `id:` 对照。本页只回答「wire 名 ↔ 包 ↔ seam ↔ 四个 web preset patch」。

## 实例表

改名规则：绝大多数 `defineTool` 字面量写死 `name`，Config **没有**改名键。例外：`@deepseek-ai/dsh-tool-subagent` 与 `@deepseek-ai/dsh-tool-workflow` 的 `Config.toolName`；`run_code` 是 `RUN_CODE_NAME`，`register` / `restrict` 都禁这个字符串。[E: packages/core/tools/src/ptc.ts:30][E: packages/core/tools/src/index.ts:1080][E: packages/core/tools/src/index.ts:1111][E: packages/subagent/tool-subagent/src/index.ts:109][E: packages/workflow/tool-workflow/src/index.ts:60]

### 文件系统

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `read` | `@deepseek-ai/dsh-tool-fs` | 固定 `read` | `ctx.fs` | — / 装 / 装 / 装 | 读 UTF-8 文本（行号窗口） | `packages/fs/tool-fs/src/read.ts` [E: packages/fs/tool-fs/src/read.ts:78] |
| `read_image` | `@deepseek-ai/dsh-tool-fs` | 固定 `read_image`；无 `ctx.attachments` 则不登记 | `ctx.fs` + `ctx.attachments` | — / 装 / 装 / 装 | 读图为附件；host `base` 挂了 `attachment-local` | `packages/fs/tool-fs/src/read-image.ts` [E: packages/fs/tool-fs/src/index.ts:70][E: packages/fs/tool-fs/src/read-image.ts:210] |
| `write` | `@deepseek-ai/dsh-tool-fs` | 固定 `write` | `ctx.fs` | — / 装 / 装 / 装 | 整文件创建/覆盖 | `packages/fs/tool-fs/src/write.ts` [E: packages/fs/tool-fs/src/write.ts:73] |
| `edit` | `@deepseek-ai/dsh-tool-fs` | 固定 `edit` | `ctx.fs` | — / 装 / 装 / 装 | 字面量替换 | `packages/fs/tool-fs/src/edit.ts` [E: packages/fs/tool-fs/src/edit.ts:85] |
| `glob` | `@deepseek-ai/dsh-tool-fs-search` | 固定 `glob` | `ctx.subprocess`（打包 ripgrep） | — / 装 / 装 / 装 | 按路径模式找文件 | `packages/fs/tool-fs-search/src/glob.ts` [E: packages/fs/tool-fs-search/src/glob.ts:307] |
| `grep` | `@deepseek-ai/dsh-tool-fs-search` | 固定 `grep` | `ctx.subprocess` | — / 装 / 装 / 装 | 按正则搜文件内容 | `packages/fs/tool-fs-search/src/grep.ts` [E: packages/fs/tool-fs-search/src/grep.ts:285] |
| `present` | `@deepseek-ai/dsh-tool-present` | 固定 `present`；`Config.maxFiles` 默认 8 | `ctx.fs` + `ctx.sessionProjections` | — / 装 / 装 / 装 | 把已存在的工作区文件声明为交付物；成功后 append `deliverables/presented` | `packages/deliverables/tool-present/src/index.ts` [E: packages/deliverables/tool-present/src/index.ts:21][E: packages/deliverables/tool-present/src/index.ts:39][E: packages/bundle/web-app/presets/standard.patch.yml:142] |
| `str_replace_editor` | `@deepseek-ai/dsh-tool-str-replace-editor` | 固定 `str_replace_editor`（可改 description） | `ctx.fs` | — / — / — / — | 包在仓库；四个 shipped patch **都不挂**；base / sdk-minimal 也不挂 | `packages/fs/tool-str-replace-editor/src/index.ts` [E: packages/fs/tool-str-replace-editor/src/index.ts:430] |

`tool-fs` / `tool-fs-search` / `present` 在 `standard` / `ptc` / `cordis` 各有一行；`minimal` 不装文件系统工具，也不装 `str-replace-editor`。[E: packages/bundle/web-app/presets/standard.patch.yml:26][E: packages/bundle/web-app/presets/minimal.patch.yml:17]

`present` 的实现包已从 `packages/fs/tool-present` 迁到 `packages/deliverables/tool-present`；wire 名仍是 `present`。

### shell（两个 `bash`、两个 `pwsh`）

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `bash`（one-shot） | `@deepseek-ai/dsh-tool-bash` | 固定 `bash` | `ctx.shell` + `ctx.shellEnv`；后台再碰 `ctx.jobs` | — / 非win32装 / 非win32装 / 非win32装 | 每次 `bash -c` 新进程，无 PTY 状态 | `packages/shell/tool-bash/src/index.ts` [E: packages/shell/tool-bash/src/index.ts:372][E: packages/bundle/web-app/presets/standard.patch.yml:20] |
| `bash`（persistent） | `@deepseek-ai/dsh-tool-bash-persistent` | 固定 `bash`（可改 description） | `ctx.terminals` | 非win32装 / — / — / — | 同一 owner 的持久 PTY bash | `packages/shell/tool-bash-persistent/src/index.ts` [E: packages/shell/tool-bash-persistent/src/index.ts:414][E: packages/bundle/web-app/presets/minimal.patch.yml:30] |
| `pwsh`（one-shot） | `@deepseek-ai/dsh-tool-pwsh` | 固定 `pwsh` | `ctx.shell` + `ctx.shellEnv` | — / win32装 / win32装 / win32装 | one-shot PowerShell，镜像 bash 参数面 | `packages/shell/tool-pwsh/src/index.ts` [E: packages/shell/tool-pwsh/src/index.ts:382][E: packages/bundle/web-app/presets/standard.patch.yml:23] |
| `pwsh`（persistent） | `@deepseek-ai/dsh-tool-pwsh-persistent` | 固定 `pwsh`（可改 description） | `ctx.terminals` | win32装 / — / — / — | 同一 owner 的持久 PTY pwsh；对标 bash-persistent | `packages/shell/tool-pwsh-persistent/src/index.ts` [E: packages/shell/tool-pwsh-persistent/src/index.ts:426][E: packages/bundle/web-app/presets/minimal.patch.yml:49] |

同名后登记覆盖先登记。shipped 树用平台门 + preset 分家避免撞车：`minimal` 只装 persistent（POSIX `bash`、win32 `pwsh`）；`standard`/`ptc`/`cordis` 在非 Windows 装 one-shot `bash`、Windows 装 one-shot `pwsh`。one-shot 消费 `ctx.shell`；persistent 消费 `ctx.terminals`。[E: packages/shell/tool-bash/src/index.ts:34][E: packages/shell/tool-bash-persistent/src/index.ts:414]

### `terminal_*`

四个 shipped patch **都没有** `@deepseek-ai/dsh-tool-terminal`。包存在 ≠ 产品装。`minimal` 装的是 `dsh-terminal` + `dsh-terminal-bash` 后端，再挂 persistent bash/pwsh，不是这套 `terminal_*` 六件套。

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `terminal_open` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals` | — / — / — / — | 开一条 owner 隔离 PTY | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:164] |
| `terminal_send` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals`；`run_in_background` 时 `ctx.jobs` | — / — / — / — | 往已开终端写 stdin | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:199] |
| `terminal_read` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals` | — / — / — / — | 读保留输出，不发送 | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:302] |
| `terminal_signal` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals` | — / — / — / — | 向前台进程组发信号 | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:335] |
| `terminal_close` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals` | — / — / — / — | 关会话并等进程树退出 | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:360] |
| `terminal_list` | `@deepseek-ai/dsh-tool-terminal` | 固定 | `ctx.terminals` | — / — / — / — | 列出本 agent 的终端 | `packages/terminal/tool-terminal/src/index.ts` [E: packages/terminal/tool-terminal/src/index.ts:391] |

### `job_*`

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `job_output` | `@deepseek-ai/dsh-tool-jobs` | 固定 `job_output` | `ctx.jobs` | — / 装 / 装 / 装 | 读后台 job（可 wait） | `packages/jobs/tool-jobs/src/index.ts` [E: packages/jobs/tool-jobs/src/index.ts:311] |
| `job_list` | `@deepseek-ai/dsh-tool-jobs` | 固定 | `ctx.jobs` | — / 装 / 装 / 装 | 列出本 owner 的 job | `packages/jobs/tool-jobs/src/index.ts` [E: packages/jobs/tool-jobs/src/index.ts:352] |
| `job_kill` | `@deepseek-ai/dsh-tool-jobs` | 固定 | `ctx.jobs` | — / 装 / 装 / 装 | 请求取消一个 job | `packages/jobs/tool-jobs/src/index.ts` [E: packages/jobs/tool-jobs/src/index.ts:372] |

job **registry** 在 host 面；preset 只决定模型能不能调用这三件套。[E: packages/bundle/web-app/presets/standard.patch.yml:32]

### plan / todo

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `exit_plan_mode` | `@deepseek-ai/dsh-plan-mode` | 固定 `EXIT_PLAN_MODE` | `ctx.planMode`；执行 `ctx.get('userQuestions')` | — / 装 / 装 / 装 | 提交计划请人审；非 plan 模式仍登记、调用拒绝 | `packages/plan/plan-mode/src/index.ts` [E: packages/plan/plan-mode/src/index.ts:67][E: packages/plan/plan-mode/src/index.ts:279] |
| `todo_write` | `@deepseek-ai/dsh-tool-todo` | 固定 `todo_write` | 调用方 session（可选 `ctx.sessionProjections`） | — / 装 / 装 / 装 | 整表替换当前会话 todo | `packages/todo/tool-todo/src/index.ts` [E: packages/todo/tool-todo/src/index.ts:136] |

`todo` 的 `allowParallelInProgress` **无默认**（schema `required`），三个非 minimal preset 都写成 `true`。[E: packages/todo/tool-todo/src/index.ts:42][E: packages/bundle/web-app/presets/standard.patch.yml:136]

### goal

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `get_goal` | `@deepseek-ai/dsh-tool-goal` | 固定 | `ctx.goals` | — / 装 / 装 / 装 | 读本会话当前 goal | `packages/goal/tool-goal/src/index.ts` [E: packages/goal/tool-goal/src/index.ts:196] |
| `create_goal` | `@deepseek-ai/dsh-tool-goal` | 固定 | `ctx.goals`（要 direct-human） | — / 装 / 装 / 装 | 为长任务建持久 goal | `packages/goal/tool-goal/src/index.ts` [E: packages/goal/tool-goal/src/index.ts:208] |
| `update_goal` | `@deepseek-ai/dsh-tool-goal` | 固定 | `ctx.goals` | — / 装 / 装 / 装 | edit/pause/resume/complete/blocked | `packages/goal/tool-goal/src/index.ts` [E: packages/goal/tool-goal/src/index.ts:235] |

### subagent

`@deepseek-ai/dsh-tool-subagent` 每装一次登记 **一个** 名 = load-time `toolName`（默认 `subagent`）。shipped `standard`/`ptc`/`cordis` 装两行活的：`toolName: subagent`（`provider: spawn`）与 `toolName: subagent_fork`（`provider: fork`，`backgroundMode: continuable`）；另两行 `subagent_codex` / `subagent_claude_code` 写在 patch 里但 `disabled: true`。spawn 行 `modelSelectionSettings: true` 时，**仅当** settings policy 打开才额外登记固定名 `list_subagent_models`。[E: packages/subagent/tool-subagent/src/index.ts:109][E: packages/subagent/tool-subagent/src/index.ts:380][E: packages/bundle/web-app/presets/standard.patch.yml:90][E: packages/bundle/web-app/presets/standard.patch.yml:97][E: packages/bundle/web-app/presets/standard.patch.yml:101]

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `subagent` | `@deepseek-ai/dsh-tool-subagent` | 默认 `subagent`；`Config.toolName` 可改 | `ctx.subagents` | — / 装 / 装 / 装 | 委派 spawn 子 agent | `packages/subagent/tool-subagent/src/index.ts` [E: packages/subagent/tool-subagent/src/index.ts:380] |
| `subagent_fork` | `@deepseek-ai/dsh-tool-subagent`（第二行） | shipped `toolName: subagent_fork`；出厂 `backgroundMode: continuable` | `ctx.subagents` | — / 装 / 装 / 装 | 委派 fork 子 agent | `packages/subagent/tool-subagent/src/index.ts` [E: packages/bundle/web-app/presets/standard.patch.yml:97][E: packages/bundle/web-app/presets/standard.patch.yml:101] |
| `list_subagent_models` | `@deepseek-ai/dsh-tool-subagent` | 固定；仅 `modelSelectionSettings: true` 且 settings policy 打开时登记 | `ctx.llm` 目录 | — / settings门 / settings门 / settings门 | 发现子 agent 可用 provider/model | `packages/subagent/tool-subagent/src/list-models.ts` [E: packages/subagent/tool-subagent/src/list-models.ts:88] |
| `subagent_codex` | `@deepseek-ai/dsh-tool-subagent` | shipped `toolName: subagent_codex` | `ctx.subagents` | — / 禁 / 禁 / 禁 | 产品 Codex backend；复制 preset 后去掉 `disabled` 才进 wire | `packages/bundle/web-app/presets/standard.patch.yml` [E: packages/bundle/web-app/presets/standard.patch.yml:103] |
| `subagent_claude_code` | `@deepseek-ai/dsh-tool-subagent` | shipped `toolName: subagent_claude_code` | `ctx.subagents` | — / 禁 / 禁 / 禁 | 产品 claude-code backend；复制 preset 后去掉 `disabled` 才进 wire | `packages/bundle/web-app/presets/standard.patch.yml` [E: packages/bundle/web-app/presets/standard.patch.yml:110] |
| `send_message` | `@deepseek-ai/dsh-tool-subagent-control` | 固定 | `ctx.subagents` | — / 装 / 装 / 装 | 给 continuable 子会话排队下一 turn | `packages/subagent/tool-subagent-control/src/index.ts` [E: packages/subagent/tool-subagent-control/src/index.ts:29] |
| `interrupt_agent` | `@deepseek-ai/dsh-tool-subagent-control` | 固定 | `ctx.subagents` | — / 装 / 装 / 装 | 取消子 agent 当前 turn | `packages/subagent/tool-subagent-control/src/index.ts` [E: packages/subagent/tool-subagent-control/src/index.ts:75] |
| `list_agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | 固定 | `ctx.subagents` + `ctx.agents` | — / 装 / 装 / 装 | 列出 continuable 子 agent | `packages/subagent/tool-subagent-control/src/list-agents.ts` [E: packages/subagent/tool-subagent-control/src/list-agents.ts:87] |

`report` **不是活的模型可见工具**。包 `packages/subagent/tool-subagent-report` 已删除。wiki id [`surface.tools.report`](../surface/tools/report.md) 仍是退役页，本表不占活行。

`list_agents` 的 `inject` 是 `['tools', 'subagents', 'agents']`，文件内无 `sessionProjections`。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:20]

### workflow

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `workflow` | `@deepseek-ai/dsh-tool-workflow` | 默认 `workflow`；`Config.toolName` 可改 | `ctx.workflowEngine` | — / 装 / 禁 / 装 | 用 JS 脚本编排多 subagent。PTC 行在但 `disabled: true` | `packages/workflow/tool-workflow/src/index.ts` [E: packages/workflow/tool-workflow/src/index.ts:60][E: packages/workflow/tool-workflow/src/index.ts:329][E: packages/bundle/web-app/presets/ptc.patch.yml:124] |
| `ralph` | `@deepseek-ai/dsh-tool-ralph` | 固定 `ralph` | `ctx.workflowEngine` + `ctx.subagents` | — / 禁 / 禁 / 禁 | 每轮全新子 agent 的 Ralph loop；三个非 minimal shipped patch **都** `disabled: true` | `packages/workflow/tool-ralph/src/index.ts` [E: packages/workflow/tool-ralph/src/index.ts:411][E: packages/bundle/web-app/presets/standard.patch.yml:125] |

PTC preset **不**把 workflow engine 留给 ralph：`workflow-ptc` / `tool-workflow` / `tool-ralph` 三者全禁。standard / cordis 挂启用的 `workflow-ptc` + `tool-workflow`，ralph 仍禁。[E: packages/bundle/web-app/presets/standard.patch.yml:119][E: packages/bundle/web-app/presets/ptc.patch.yml:119]

### web

包默认 `search`/`fetch` 都是 `true`。三个非 minimal preset 显式写 `fetch: true`，因此 **shipped web 产品同时登记 `web_search` 与 `web_fetch`**。[E: packages/web/tool-web/src/index.ts:55][E: packages/web/tool-web/src/index.ts:56][E: packages/bundle/web-app/presets/standard.patch.yml:139]

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `web_search` | `@deepseek-ai/dsh-tool-web` | 固定；`Config.search` 控制登记（默认 true） | `ctx.web` | — / 装 / 装 / 装 | 网页搜索 | `packages/web/tool-web/src/search.ts` [E: packages/web/tool-web/src/search.ts:326] |
| `web_fetch` | `@deepseek-ai/dsh-tool-web` | 固定；`Config.fetch` 控制登记（默认 true） | `ctx.web` | — / 装 / 装 / 装 | 抓一个 HTTP(S) URL | `packages/web/tool-web/src/fetch.ts` [E: packages/web/tool-web/src/fetch.ts:457] |

### skill / 提问 / PTC / LSP / 新产品

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `skill` | `@deepseek-ai/dsh-tool-skill` | 固定 `skill` | `ctx.skills` + `ctx.agents` | — / 装 / 装 / 装 | 按名加载 skill 全文 | `packages/skill/tool-skill/src/index.ts` [E: packages/skill/tool-skill/src/index.ts:82] |
| `ask_user_question` | `@deepseek-ai/dsh-tool-ask-user` | 固定 | `ctx.userQuestions` | — / 装 / 装 / 装 | 向人提问并阻塞到回答 | `packages/interaction/tool-ask-user/src/index.ts` [E: packages/interaction/tool-ask-user/src/index.ts:20] |
| `run_code` | `@deepseek-ai/dsh-tools` | 保留 `RUN_CODE_NAME`；不可登记/restrict | `ctx.ptcRuntime`（执行时）；registry 运输 | — / — / 仅ptc / — | PTC 唯一 model-direct 调用；程序内再调其它工具；flavor `typescript` \| `python` | `packages/core/tools/src/ptc.ts` [E: packages/core/tools/src/ptc.ts:30][E: packages/core/tools/src/ptc.ts:336][E: packages/ptc-runtime/ptc-runtime/src/index.ts:93] |
| `lsp` | `@deepseek-ai/dsh-tool-lsp` | 固定 `lsp` | `ctx.lsp` | — / — / — / — | 语言服务器导航；四个 patch 都没有 | `packages/lsp/tool-lsp/src/index.ts` [E: packages/lsp/tool-lsp/src/index.ts:110] |
| `load_workspace_dependencies` | `@deepseek-ai/dsh-tool-workspace-dependencies` | 固定 | 读 bundled runtime 清单 | — / — / — / —（sdk 挂） | 返回 bundled Python / Node / pnpm 绝对路径 | `packages/skill/tool-workspace-dependencies/src/index.ts` [E: packages/skill/tool-workspace-dependencies/src/index.ts:250][E: packages/bundle/sdk-app/cordis.patch.yml:30] |
| `plugin_manager` | `@deepseek-ai/dsh-plugin-manager/tools` | 固定 `plugin_manager` | `ctx.pluginManager` + `ctx.sandboxPolicy`；要 danger-full-access / approval | — / 禁 / 禁 / 条件禁 | 列 / 开 / 关 / 装 / 卸当前 profile 的插件与 bundle | `packages/boot/plugin-manager/src/tools.ts` [E: packages/boot/plugin-manager/src/tools.ts:20][E: packages/bundle/web-app/presets/standard.patch.yml:144][E: packages/bundle/web-app/presets/cordis.patch.yml:152] |

`load_workspace_dependencies` 由 `dsh-sdk-app` 挂；`disabled` 当 `DSH_PRIMARY_RUNTIME` 与 `DSH_BUNDLED_PRIMARY_RUNTIME` 都缺。[E: packages/bundle/sdk-app/cordis.patch.yml:32] 四个 web preset **不**挂它。

`plugin_manager`：`standard` / `ptc` 行在但 `disabled: true`；`cordis` 行在且 `disabled: !!js "!ctx.get('profileContext')"`（无 profileContext 时禁）。`dsh-base` 也有一条 host 面 `tool-plugin-manager`，默认 `disabled: true`。[E: packages/bundle/base/cordis.patch.yml:16][E: packages/bundle/web-app/presets/ptc.patch.yml:150][E: packages/bundle/web-app/presets/cordis.patch.yml:154]

`run_code` 的执行缝是 `ctx.ptcRuntime`（类 `PtcRuntime`），**不是**已删除的 `ctx.codeRuntime`。[E: packages/ptc-runtime/ptc-runtime/src/index.ts:93][E: packages/core/tools/src/ptc.ts:19]

### `session_*`

四个 shipped patch **都没有** `@deepseek-ai/dsh-tool-session-query`。

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `session_search` | `@deepseek-ai/dsh-tool-session-query` | 固定 | `ctx.sessionQuery` | — / — / — / — | 在调用方 workspace 搜其它会话 | `packages/session-query/tool-session-query/src/index.ts` [E: packages/session-query/tool-session-query/src/index.ts:66] |
| `session_event_search` | `@deepseek-ai/dsh-tool-session-query` | 固定 | `ctx.sessionQuery` | — / — / — / — | 在一个已授权会话里搜事件 | `packages/session-query/tool-session-query/src/index.ts` [E: packages/session-query/tool-session-query/src/index.ts:76] |
| `session_trace` | `@deepseek-ai/dsh-tool-session-query` | 固定 | `ctx.sessionQuery` | — / — / — / — | 读会话血缘 | `packages/session-query/tool-session-query/src/index.ts` [E: packages/session-query/tool-session-query/src/index.ts:86] |
| `session_event_trace` | `@deepseek-ai/dsh-tool-session-query` | 固定 | `ctx.sessionQuery` | — / — / — / — | 读一个事件的替换/关系 | `packages/session-query/tool-session-query/src/index.ts` [E: packages/session-query/tool-session-query/src/index.ts:96] |
| `session_event_read` | `@deepseek-ai/dsh-tool-session-query` | 固定 | `ctx.sessionQuery` | — / — / — / — | 读一条完整事件 | `packages/session-query/tool-session-query/src/index.ts` [E: packages/session-query/tool-session-query/src/index.ts:109] |

### `schedule_*`

四个 shipped patch **都没有** `@deepseek-ai/dsh-schedule`。插件在 `agent/created` 时只给 **之后** 发布的 root agent 的 scope 登记四件套（含新增的 `schedule_update`）。[E: packages/schedule/schedule/src/index.ts:175][E: packages/schedule/schedule/src/index.ts:178]

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `schedule_create` | `@deepseek-ai/dsh-schedule` | 固定 | `ctx.sessions` + session persistence | — / — / — / — | 建 after/at/every 提醒 | `packages/schedule/schedule/src/tools.ts` [E: packages/schedule/schedule/src/tools.ts:417] |
| `schedule_list` | `@deepseek-ai/dsh-schedule` | 固定 | `ctx.sessions` + session persistence | — / — / — / — | 列出本会话 schedule | `packages/schedule/schedule/src/tools.ts` [E: packages/schedule/schedule/src/tools.ts:452] |
| `schedule_delete` | `@deepseek-ai/dsh-schedule` | 固定 | `ctx.sessions` + session persistence | — / — / — / — | 按 id 删除 | `packages/schedule/schedule/src/tools.ts` [E: packages/schedule/schedule/src/tools.ts:470] |
| `schedule_update` | `@deepseek-ai/dsh-schedule` | 固定 | `ctx.sessions` + session persistence | — / — / — / — | 改 title / prompt / 选择器 | `packages/schedule/schedule/src/tools.ts` [E: packages/schedule/schedule/src/tools.ts:493] |

### `cordis_*`

只出现在 `cordis` preset 的 `tool-cordis` 行。冻结树实现只登记 **两条** 只读 inspect 工具；旧 `cordis_inspect_self` / `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine` **不再**是活的 `defineTool` 名。装插件改走 `plugin_manager`。[E: packages/extensions/tool-cordis/src/index.ts:23][E: packages/extensions/tool-cordis/src/index.ts:42][E: packages/bundle/web-app/presets/cordis.patch.yml:141]

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `cordis_inspect_list` | `@deepseek-ai/dsh-tool-cordis` | 固定 | `ctx.cordisInspect` | — / — / — / 装 | 列出 inspect provider | `packages/extensions/tool-cordis/src/index.ts` [E: packages/extensions/tool-cordis/src/index.ts:23] |
| `cordis_inspect_query` | `@deepseek-ai/dsh-tool-cordis` | 固定 | `ctx.cordisInspect` | — / — / — / 装 | 调一个 inspect 方法 | `packages/extensions/tool-cordis/src/index.ts` [E: packages/extensions/tool-cordis/src/index.ts:42] |

### Agent Teams（experimental，opt-in）

包 `@deepseek-ai/dsh-experimental-tool-agent-team` **不在**四个 shipped preset patch。实验 profile `@deepseek-ai/dsh-experimental-agent-team-profile` 会 `disabled` 全局 `tool-subagent-control` / `list-agents` / `tool-subagent` / `tool-subagent-fork`（与 Team 工具名重叠），并插入 `agent-team` + `tool-agent-team`。没有 `followup_task`。插件只在有 Team membership 的 Agent scope 上安装。[E: packages/experimental/agent-team-profile/cordis.patch.yml:4][E: packages/experimental/tool-agent-team/src/index.ts:402]

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `spawn_teammate` | `@deepseek-ai/dsh-experimental-tool-agent-team` | 固定 | `ctx.agentTeams` | — / — / — / — | Lead 生成 teammate | `packages/experimental/tool-agent-team/src/index.ts` [E: packages/experimental/tool-agent-team/src/index.ts:176] |
| `send_message` | 同上（与 subagent-control **同名**） | 固定 | `ctx.agentTeams` | — / — / — / — | 投递；会启动 idle / 冷恢复 inactive teammate | `packages/experimental/tool-agent-team/src/index.ts` [E: packages/experimental/tool-agent-team/src/index.ts:216] |
| `list_agents` | 同上（与 list-agents **同名**） | 固定 | `ctx.agentTeams` | — / — / — / — | 列出 Lead + teammates | `packages/experimental/tool-agent-team/src/index.ts` [E: packages/experimental/tool-agent-team/src/index.ts:233] |
| `wait_agent` | 同上 | 固定 | `ctx.agentTeams` | — / — / — / — | 等变化；可 `noProgress`；不唤醒 | `packages/experimental/tool-agent-team/src/index.ts` [E: packages/experimental/tool-agent-team/src/index.ts:243] |
| `interrupt_agent` | 同上（与 subagent-control **同名**） | 固定 | `ctx.agentTeams` | — / — / — / — | Lead 打断 teammate | `packages/experimental/tool-agent-team/src/index.ts` [E: packages/experimental/tool-agent-team/src/index.ts:278] |
| `team_task_create` | 同上 | 固定 | `ctx.agentTeams` | — / — / — / — | 建未认领任务 | `packages/experimental/tool-agent-team/src/index.ts` [E: packages/experimental/tool-agent-team/src/index.ts:290] |
| `team_task_list` | 同上 | 固定 | `ctx.agentTeams` | — / — / — / — | 列任务板 | `packages/experimental/tool-agent-team/src/index.ts` [E: packages/experimental/tool-agent-team/src/index.ts:314] |
| `team_task_get` | 同上 | 固定 | `ctx.agentTeams` | — / — / — / — | 读一条任务 | `packages/experimental/tool-agent-team/src/index.ts` [E: packages/experimental/tool-agent-team/src/index.ts:346] |
| `team_task_update` | 同上 | 固定 | `ctx.agentTeams` | — / — / — / — | CAS 更新 | `packages/experimental/tool-agent-team/src/index.ts` [E: packages/experimental/tool-agent-team/src/index.ts:361] |

### MCP resources（运行期，非 shipped 静态行）

`@deepseek-ai/dsh-mcp-resources` 在 MCP server 暴露 resources 时登记三件套。四个 shipped patch 都不把它们写成 preset 行；本表占行是为了不丢实例，四列全是 `—`。[E: packages/mcp/mcp-resources/src/tools.ts:34][E: packages/mcp/mcp-resources/src/tools.ts:43][E: packages/mcp/mcp-resources/src/tools.ts:52]

| wire 名 | 实现包 | 默认名/可改名 | 背后 seam | min/std/ptc/cordis | 用途 | 源 path |
|---|---|---|---|---|---|---|
| `list_mcp_resources` | `@deepseek-ai/dsh-mcp-resources` | 固定 | MCP server resources | — / — / — / — | 列一个 MCP server 的 resources | `packages/mcp/mcp-resources/src/tools.ts` [E: packages/mcp/mcp-resources/src/tools.ts:34] |
| `list_mcp_resource_templates` | `@deepseek-ai/dsh-mcp-resources` | 固定 | MCP server templates | — / — / — / — | 列 URI 模板 | `packages/mcp/mcp-resources/src/tools.ts` [E: packages/mcp/mcp-resources/src/tools.ts:43] |
| `read_mcp_resource` | `@deepseek-ai/dsh-mcp-resources` | 固定 | MCP server read | — / — / — / — | 按 URI 读一条 resource | `packages/mcp/mcp-resources/src/tools.ts` [E: packages/mcp/mcp-resources/src/tools.ts:52] |

## 对照 / 分家 / 装配

**两个 `bash`、两个 `pwsh`。** one-shot 消费 `ctx.shell`；persistent 消费 `ctx.terminals`。wire 名都是 `bash` / `pwsh`，必须靠 composition 分家。`minimal` 的 persona 是 complete prompt，模型只看见 persistent shell。[E: packages/shell/tool-bash/src/index.ts:34][E: packages/shell/tool-bash-persistent/src/index.ts:414][E: packages/bundle/web-app/presets/minimal.patch.yml:11]

**`ptc` 的 wire 塌缩。** 能力插件与 `standard` 大体同装（含 `present`），但 `workflow-ptc` / `tool-workflow` / `tool-ralph` 在 PTC 上全 `disabled: true`；`tool-presentation` `mode: ptc` 之后，模型 **native 目录**只剩 `run_code`。其它仍登记的 wire 名经 SDK 从程序里调用，再走完整 `tools/pre-execute → execute`。executor 对 **model-direct** 调用在 `modeFor(scope) === 'ptc'` 时只允许 `run_code`。`both` 会把 `run_code` **加**进 native 目录而不是替换。[E: packages/core/tools/src/index.ts:1022][E: packages/core/tools/src/index.ts:1028][E: packages/core/tools/src/index.ts:1351][E: packages/bundle/web-app/presets/ptc.patch.yml:144]

**`present`。** 三个非 minimal shipped preset 各有 `id: present`。实现包在 `packages/deliverables/tool-present`。minimal **没有**。[E: packages/deliverables/tool-present/src/index.ts:39][E: packages/bundle/web-app/presets/standard.patch.yml:142]

**`web_fetch`。** 三个非 minimal shipped preset 写 `fetch: true`，出厂 Web 产品模型看得到 `web_fetch`。[E: packages/bundle/web-app/presets/standard.patch.yml:139]

**`str_replace_editor` 出厂不挂。** 包仍在；四个 shipped patch、`dsh-base`、`sdk-minimal` 都没有该行。本 catalog 仍占一行，四列全是 `—`。

**`report` 已退役。** 不是 preset 行，也不是 `dsh-base` 行；本 catalog 不列活 wire 名。

**动态加名。** MCP 客户端、以及运行期再 `ctx.tools.register` 出的名字，是运行期实例，不是 shipped 静态目录。`cordis_define` 已不是活工具。

**preset roster 挂载。** `@deepseek-ai/dsh-agent-preset-registry` 出现在 `dsh-web-app` 的 `cordis.patch.yml`（`default: standard`）；四份 `presets/*.patch.yml` 在同一 `dsh.bundle.patch` 数组里叠在它后面。`headless` / `sdk` / `sdk-minimal` / `acp` 不自动等于这四列 Web shipped composition。本表四列回答的是 shipped **web agent preset patch**，不是每一个 profile 的 host 树。[E: packages/bundle/web-app/cordis.patch.yml:559][E: packages/bundle/web-app/package.json:43]

## Sources

- `packages/core/tools/src/index.ts`
- `packages/core/tools/src/schema.ts`
- `packages/core/tools/src/ptc.ts`
- `packages/core/tools/package.json`
- `packages/core/agent-tool-presentation/src/index.ts`
- `packages/ptc-runtime/ptc-runtime/src/index.ts`
- `packages/fs/tool-fs/src/index.ts`
- `packages/fs/tool-fs/src/read.ts`
- `packages/fs/tool-fs/src/read-image.ts`
- `packages/fs/tool-fs/src/write.ts`
- `packages/fs/tool-fs/src/edit.ts`
- `packages/fs/tool-fs-search/src/glob.ts`
- `packages/fs/tool-fs-search/src/grep.ts`
- `packages/deliverables/tool-present/src/index.ts`
- `packages/fs/tool-str-replace-editor/src/index.ts`
- `packages/shell/tool-bash/src/index.ts`
- `packages/shell/tool-bash-persistent/src/index.ts`
- `packages/shell/tool-pwsh/src/index.ts`
- `packages/shell/tool-pwsh-persistent/src/index.ts`
- `packages/terminal/tool-terminal/src/index.ts`
- `packages/jobs/tool-jobs/src/index.ts`
- `packages/plan/plan-mode/src/index.ts`
- `packages/todo/tool-todo/src/index.ts`
- `packages/goal/tool-goal/src/index.ts`
- `packages/subagent/tool-subagent/src/index.ts`
- `packages/subagent/tool-subagent/src/list-models.ts`
- `packages/subagent/tool-subagent-control/src/index.ts`
- `packages/subagent/tool-subagent-control/src/list-agents.ts`
- `packages/workflow/tool-workflow/src/index.ts`
- `packages/workflow/tool-ralph/src/index.ts`
- `packages/web/tool-web/src/index.ts`
- `packages/web/tool-web/src/search.ts`
- `packages/web/tool-web/src/fetch.ts`
- `packages/skill/tool-skill/src/index.ts`
- `packages/skill/tool-workspace-dependencies/src/index.ts`
- `packages/boot/plugin-manager/src/tools.ts`
- `packages/interaction/tool-ask-user/src/index.ts`
- `packages/lsp/tool-lsp/src/index.ts`
- `packages/session-query/tool-session-query/src/index.ts`
- `packages/schedule/schedule/src/index.ts`
- `packages/schedule/schedule/src/tools.ts`
- `packages/extensions/tool-cordis/src/index.ts`
- `packages/experimental/tool-agent-team/src/index.ts`
- `packages/experimental/agent-team-profile/cordis.patch.yml`
- `packages/mcp/mcp-resources/src/tools.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/web-app/package.json`
- `packages/bundle/web-app/presets/standard.patch.yml`
- `packages/bundle/web-app/presets/ptc.patch.yml`
- `packages/bundle/web-app/presets/minimal.patch.yml`
- `packages/bundle/web-app/presets/cordis.patch.yml`
- `packages/bundle/sdk-app/cordis.patch.yml`
- `packages/boot/app-boot/src/profile.ts`

## 相关

- [spine.tool-call-anatomy](../spine/tool-call-anatomy.md) — 一次 tool call 如何进 `tools/pre-execute → execute`，以及 model-visible ⟺ logged
- [subsys.core.tools](../subsystems/core/tools.md) — `ctx.tools` registry、`defineTool`、`schemas` / `presentAs`
- [ref.presets](presets.md) — 四个 web preset patch 的插件 `id:` 对照（本表 preset 列的权威来源）
- [surface.presets.overview](../surface/presets/overview.md) — roster / default `standard` / 各 profile 是否挂 preset
- [surface.presets.minimal](../surface/presets/minimal.md) — 只有 persistent `bash`/`pwsh`
- [surface.presets.standard](../surface/presets/standard.md) — 出厂编码 agent 工具集（含 `present`）
- [surface.presets.code](../surface/presets/code.md) — PTC preset `mode: ptc` 与 `run_code`（稳定别名）
- [surface.presets.cordis](../surface/presets/cordis.md) — `cordis_*` 只读 inspect 套件
- [subsys.core.code-mode](../subsystems/core/code-mode.md) — PTC `RUN_CODE_NAME` 运输与 SDK 绑定（稳定别名）
- [surface.tools.present](../surface/tools/present.md) — `present` 交付物工具
