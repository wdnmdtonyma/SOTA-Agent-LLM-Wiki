---
id: subsys.composition.bundle-base
title: dsh-base bundle
kind: subsystem
tier: T2
pkg: composition
source:
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/src/index.ts
  - packages/bundle/base/README.md
  - packages/bundle/base/package.json
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/base/src/invariant.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/src/index.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - apps/cli/src/profile-boot.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/core/agent-loop/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/tests/invariant.spec.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - vendor/include/src/index.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/fiber.ts
  - vendor/loader/src/config/isolate.ts
symbols:
  - dsh-base
  - cordis.patch.yml
related:
  - spine.composition-boot
  - subsys.composition.bundle-web-app
  - subsys.composition.bundle-headless
  - spine.overview
  - spine.capability-seams
  - subsys.composition.app-boot
  - subsys.composition.agent-presets
  - subsys.llm.pi-ai
  - subsys.core.agent-loop
  - surface.presets.overview
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-base` 是每个 profile 的**第一层** host 组合：一条根 `insert` 把共享核心（`llm` / `session` / `agent` / `agent-loop` `agents: []` / `tools` / sandbox / persistence / subagent **backends** / 模型可见 tool 行）铺进空的 Loader 根。它是 Cordis 组合运行时的 patch 载体，不是又一个 coding-agent 主循环，也没有 runtime API。

## 能回答的问题

- `PROFILE_TEMPLATES` 的 `web` / `headless` 以及无名 profile 的 `DEFAULT_PROFILE_BUNDLES` 为什么都以 `@deepseek-ai/dsh-base` 开头？缺 `dsh.bundle.patch` 会怎样？
- `cordis.patch.yml` 里全部 `id:` 各属哪一层职责？哪些是 host 面注册表 / backends，哪些是模型可见 tool 行？
- `dsh-base` 有没有 `subagent-codex` / `subagent-claude-code`？是「装了但 dormant」还是根本没装？
- shell 双栈怎样用对称 `disabled: !!js process.platform` 互斥？有没有单独的 `windows.cordis.patch.yml`？
- `llm-pi-ai` 为什么始终挂上却零 route？`agent-loop` 为什么是 `agents: []`？
- 后一层 bundle / preset 怎样整键覆盖这些行？waterfall 不 `next()`、preset 行漏 `isolate` 各会卡在哪？

## 职责边界

本包拥有：**一条**可被 `dsh.bundle.patch` 解析的根 `insert` 列表，以及把该文件钉死在 manifest 上的合同。`package.json` 的 `name` 是 `@deepseek-ai/dsh-base`；`dsh.bundle.patch` 必须是 `./cordis.patch.yml`。[E: packages/bundle/base/package.json:2] [E: packages/bundle/base/package.json:38] [E: packages/bundle/base/tests/base.spec.ts:23] `src/index.ts` 只写 `export {}`，不导出 boot / factory / 服务。[E: packages/bundle/base/src/index.ts:9] companion `./invariant` 的 installer 是空函数：YAML 行由各包自己核，base 没有可变关系。[E: packages/bundle/base/src/invariant.ts:20]

本包**不**拥有：

- profile 发现、空根 `cordis.yml`、`boot` / `composeEntries` — [`subsys.composition.app-boot`](app-boot.md) / [`spine.composition-boot`](../../spine/composition-boot.md)。
- 叠在 base 上的 host UI：`webserver` / `agent-presets` `default: standard`，以及把模型可见行 `disabled: true` — [`subsys.composition.bundle-web-app`](bundle-web-app.md)。
- headless 的 `code-runtime` + `headless-startup` + `headless-runner`；headless **不**挂 `agent-presets`，也 **不** disable base 工具行 — [`subsys.composition.bundle-headless`](bundle-headless.md)。
- preset 发现、`mountPreset`、`leakedServices` 实现 — [`subsys.composition.agent-presets`](agent-presets.md)。本页只写：base 行坐在 root realm；同一批 service-publishing 插件若被搬进 preset 且漏 `isolate`，会被拒。
- `Agent` 合同 / 默认 loop / `ctx.tools` 管线 / `deriveMessages()` — [`subsys.core.agent-loop`](../core/agent-loop.md)。base 只决定这些包以哪一行、哪份 config 进树。
- Codex / Claude 子代理后端。`dsh-base` **没有** `id: subagent-codex` / `id: subagent-claude-code`，也不是「装了但 dormant」：`base.spec.ts` 要求这两行长度为 0，且 `dependencies` 不含对应包。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:40] [E: packages/bundle/base/tests/base.spec.ts:41]

**host 面 vs agent-preset 面。** host 面是进程级：persistence / sandbox / approval / subagent **backends** / 注册表 / `ctx.llm` / `ctx.agents` / `ctx.agentLoop`。base 把这些全部插进 **root realm**。模型可见 tool 行也先写在 base（headless 就留在 host 全局层）；`dsh-web-app` 再把它们 `disabled: true`，改由每会话 preset 挂 tools / persona / isolate。默认产品路径是 `dsh web`（本地 Web GUI），本仓没有 shipped TUI。

**没有 `invariants` 行。** 整份 insert 从 `id: timer` 起到 `id: llm-deepseek` 止，没有 `name: '@deepseek-ai/dsh-invariants'`。[E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/base/cordis.patch.yml:450] `@deepseek-ai/dsh-invariants` 只出现在 peer / dev，不是树成员。[E: packages/bundle/base/package.json:121]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/bundle/base/cordis.patch.yml` | 真树：一条根 `insert`，78 个 `id:` |
| `packages/bundle/base/package.json` | `@deepseek-ai/dsh-base`；`dsh.bundle.patch = ./cordis.patch.yml`；依赖闭包 |
| `packages/bundle/base/src/index.ts` | 无 runtime API（`export {}`） |
| `packages/bundle/base/src/invariant.ts` | 空 companion：只占 `@deepseek-ai/dsh-base` 这个名 |
| `packages/bundle/base/tests/base.spec.ts` | 可解析、`>50` 行、无 Codex/Claude、shell 对称门、无 `windows.cordis.patch.yml` |
| `packages/boot/app-boot/src/profile.ts` | `PROFILE_TEMPLATES` / `DEFAULT_PROFILE_BUNDLES` / `loadProfile` fail-loud / `composeEntries` |
| `packages/boot/app-boot/src/index.ts` | `boot`：空根 + patches |
| `apps/cli/src/profile-boot.ts` | launcher `composeProfile`：bundles → profile → home → `--patch` |
| `packages/bundle/web-app/cordis.patch.yml` | 后一层：disable 模型可见行，再 insert `agent-presets` |
| `packages/bundle/headless/cordis.patch.yml` | 后一层：只加 runner，不 disable 工具 |
| `vendor/include/src/index.ts` | `applyEntryPatches`：无 `id` 的 `insert` 追加到根；`config` 整键覆盖 |
| `vendor/cordis/src/events.ts` | waterfall 必须 `next()` 才会 `shift` |
| `packages/preset/agent-presets/src/mount.ts` | `leakedServices`：preset 把 service publish 进 root 就拒 |

`packages/bundle/base/README.md` 是包说明，**不是** `[E]`。它写「Codex and Claude Code providers load dormant」与 `base.spec.ts` 冲突；wiki 跟测试：没有行就是没装。

## 数据模型

| 符号 / 键 | 落点 | 含义 |
|---|---|---|
| `@deepseek-ai/dsh-base` | npm `name` | in-box bundle 包名；installation-first 解析永远拿到这份安装，而不是 profile-local 副本。[E: packages/bundle/base/package.json:2] [E: packages/boot/app-boot/src/profile.ts:347] |
| `dsh.bundle.patch` | manifest | 相对包根的 patch 路径。缺了 `loadProfile` 抛 `declares no dsh.bundle`。[E: packages/bundle/base/package.json:38] [E: packages/boot/app-boot/src/profile.ts:392] [E: packages/boot/app-boot/src/profile.ts:393] |
| 根 `insert`（无父 `id`） | `cordis.patch.yml` 唯一顶层动作 | `applyEntryPatches` 对无 `id` 的 `insert` 做 `data.push(...insert)`，78 行一次进空根。[E: packages/bundle/base/cordis.patch.yml:15] [E: vendor/include/src/index.ts:94] |
| `id` / `name` / `config` / `disabled` | 每行 | `id` 是后层寻址键；`name` 是 Loader 插件说明符；`config` 后写**整键覆盖**（不是 deep-merge）；`disabled` 可被 `!!js` 求值。[E: vendor/include/src/index.ts:123] |
| `PROFILE_TEMPLATES` | `web` / `headless` | `web = [dsh-base, dsh-web-app]`；`headless = [dsh-base, dsh-headless]`。无名 `dsh plugin` init 用 `DEFAULT_PROFILE_BUNDLES = [dsh-base]`。[E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116] [E: packages/boot/app-boot/src/profile.ts:125] |
| `agent-loop` `config.agents` | `[]` | Web 不在进程级造 Agent；会话由 host 在请求时 `ctx.agents.create`。[E: packages/bundle/base/cordis.patch.yml:436] [E: packages/bundle/base/cordis.patch.yml:439] |
| `agent-default-model` | `provider` / `model` | 未来新 Agent 的默认：`deepseek-official` / `deepseek-v4-flash`。[E: packages/bundle/base/cordis.patch.yml:66] [E: packages/bundle/base/cordis.patch.yml:67] |
| `isolate` | Loader `EntryOptions` | `true` → 该 entry 的 `LocalRealm`；字符串 → 共享 `GlobalRealm`。base 行**不**写 `isolate`：它们本就该进 root。[E: vendor/loader/src/config/isolate.ts:81] |

测试钉死 insert 行数 `> 50` 且含 `agent-loop`。[E: packages/bundle/base/tests/base.spec.ts:33] [E: packages/bundle/base/tests/base.spec.ts:34] 下面按职责列出**全部** 78 个 `id:`（一个不漏）。「模型可见」在这里只表示该行会往 `ctx.tools` 注册或改模型请求形状；字段表留给 `surface.tools.*`。

### Runtime / loader

| `id` | `name` | 角色 |
|---|---|---|
| `timer` | `@deepseek-ai/cordis-plugin-timer` | Cordis 定时器 |
| `hmr` | `@deepseek-ai/cordis-plugin-hmr` | 共享 HMR（`root: ['.']`）；mode bundle 再 `disabled: true` |

### LLM / 默认模型

| `id` | `name` | 角色 |
|---|---|---|
| `llm` | `@deepseek-ai/dsh-llm` | `ctx.llm` Definition |
| `llm-retry` | `@deepseek-ai/dsh-llm-retry` | 重试策略 |
| `llm-pi-ai` | `@deepseek-ai/dsh-llm-pi-ai` | 始终挂上；零 route 直到 Settings 写 `llm-pi-ai:` |
| `llm-deepseek` | `@deepseek-ai/dsh-llm-deepseek` | 原生 DeepSeek adapter（无内联 key） |
| `agent-default-model` | `@deepseek-ai/dsh-agent-default-model` | 新 Agent 默认 `deepseek-official` / `deepseek-v4-flash` |
| `token-meter` | `@deepseek-ai/dsh-token-meter` | 进程级 token 计量（web 留下 host） |

### Session / persistence

| `id` | `name` | 角色 |
|---|---|---|
| `session` | `@deepseek-ai/dsh-session` | `ctx.sessions` / append-only log |
| `session-title` | `@deepseek-ai/dsh-session-title` | 标题 fallback |
| `session-title-llm` | `@deepseek-ai/dsh-session-title-first-prompt-llm` | 首条 prompt 标题 |
| `session-persistence-jsonl` | `@deepseek-ai/dsh-session-persistence-jsonl` | JSONL 根 `$DSH_HOME/sessions` |
| `attachment-local` | `@deepseek-ai/dsh-attachment-local` | 图片字节在 log 外 |
| `session-query-sqlite` | `@deepseek-ai/dsh-session-query-sqlite` | `openAt: never`；全文搜索 opt-in |
| `session-projection` | `@deepseek-ai/dsh-session-projection` | 投影注册表（`list_agents` 依赖） |
| `session-telemetry-otel` | `@deepseek-ai/dsh-session-telemetry-otel` | `mode` 吃 `DSH_TELEMETRY_MODE`，默认 `DISABLED` |
| `session-checkpoint-policy` | `@deepseek-ai/dsh-session-checkpoint-policy` | adapter 前 / top-level tool 前 flush |

### Settings / credentials

| `id` | `name` | 角色 |
|---|---|---|
| `settings` | `@deepseek-ai/dsh-settings-file` | `$DSH_HOME/settings.yaml` 热重载 |
| `credentials` | `@deepseek-ai/dsh-credentials-local` | 环境优先于托管 `.credentials.yaml` |

### Agent 合同 / 默认 loop

| `id` | `name` | 角色 |
|---|---|---|
| `agent` | `@deepseek-ai/dsh-agent` | `ctx.agents` 合同 + 工厂槽 |
| `agent-loop` | `@deepseek-ai/dsh-agent-loop` | 默认 `AgentFactory`；`agents: []` |

### Typert / 远程面

| `id` | `name` | 角色 |
|---|---|---|
| `typert` | `@deepseek-ai/dsh-typert-registry` | 远程类型注册表 |
| `typert-loader` | `@deepseek-ai/dsh-typert-loader` | 远程 loader |
| `typert-gateway` | `@deepseek-ai/dsh-api-gateway` | API gateway |
| `user-questions` | `@deepseek-ai/dsh-user-questions` | 向用户提问的 host 缝 |

### Jobs / goals / 人命令

| `id` | `name` | 角色 |
|---|---|---|
| `jobs` | `@deepseek-ai/dsh-jobs-local` | jobs **registry**（host） |
| `goal` | `@deepseek-ai/dsh-goal` | goal **service**（host） |
| `goal-round-driver` | `@deepseek-ai/dsh-goal-round-driver` | 会话内 goal 驱动 |
| `commands` | `@deepseek-ai/dsh-commands` | `ctx.commands`（不经模型 turn） |
| `command-feedback` | `@deepseek-ai/dsh-command-feedback` | `/feedback` |
| `command-goal` | `@deepseek-ai/dsh-command-goal` | `/goal` |
| `command-compact` | `@deepseek-ai/dsh-command-compact` | `/compact`（web 会 disable） |

### Sandbox / permission / fs provider

| `id` | `name` | 角色 |
|---|---|---|
| `subprocess` | `@deepseek-ai/dsh-subprocess-local` | 本地子进程 |
| `sandbox` | `@deepseek-ai/dsh-sandbox-local` | 文件效果边界 |
| `sandbox-policy` | `@deepseek-ai/dsh-sandbox-policy` | `DSH_PERMISSION_MODE` 默认 `workspace-write` |
| `bash-sandbox` | `@deepseek-ai/dsh-bash-sandbox` | POSIX shell 执行器；win32 `disabled` |
| `pwsh-sandbox` | `@deepseek-ai/dsh-pwsh-sandbox` | win32 shell 执行器；非 win32 `disabled` |
| `approval` | `@deepseek-ai/dsh-user-approval` | `danger-full-access` → `never`，否则 `ask` |
| `permission` | `@deepseek-ai/dsh-permission-presets` | 三档 preset 表 |
| `shell-env` | `@deepseek-ai/dsh-shell-env` | 注入进子进程的环境（web **留下** host） |
| `fs-observation-policy` | `@deepseek-ai/dsh-fs-observation-policy` | 读路径观察策略 |
| `fs-sandbox` | `@deepseek-ai/dsh-fs-sandbox` | `ctx.fs` Provider（不要并列再挂一份 `dsh-fs-local`） |

### 工具注册表 + 模型可见行

| `id` | `name` | 角色 |
|---|---|---|
| `tools` | `@deepseek-ai/dsh-tools` | `ctx.tools` 注册表；base **省略** `mode`，保持 schema 默认 `native` |
| `tool-bash` | `@deepseek-ai/dsh-tool-bash` | 模型可见 bash；win32 `disabled` |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | 模型可见 pwsh；非 win32 `disabled` |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | 模型可见 `job_*`（registry 留下） |
| `tool-fs` | `@deepseek-ai/dsh-tool-fs` | 模型可见 fs |
| `tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | 模型可见 glob/grep |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | 模型可见 skill 调用 |
| `tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control` | `send_message` / `interrupt_agent` |
| `tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | `list_agents` |
| `tool-subagent` | `@deepseek-ai/dsh-tool-subagent` | `toolName: subagent`，`provider: spawn`，`backgroundMode: continuable` |
| `tool-subagent-fork` | `@deepseek-ai/dsh-tool-subagent` | `toolName: subagent_fork`，`provider: fork`，`backgroundMode: one-shot` |
| `tool-subagent-report` | `@deepseek-ai/dsh-tool-subagent-report` | 子代理 `report` setup（host 单例） |
| `tool-workflow` | `@deepseek-ai/dsh-tool-workflow` | 模型可见 workflow |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | `todo_write` |
| `tool-goal` | `@deepseek-ai/dsh-tool-goal` | 模型可见 goal 工具（service 留下） |
| `tool-ralph` | `@deepseek-ai/dsh-tool-ralph` | Ralph 迭代；`subagentProvider: spawn` |
| `tool-str-replace-editor` | `@deepseek-ai/dsh-tool-str-replace-editor` | 字符串替换编辑器 |
| `tool-web` | `@deepseek-ai/dsh-tool-web` | `web_search`；`fetch: false` |
| `agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | workspace 指令进 prompt |
| `plan-mode` | `@deepseek-ai/dsh-plan-mode` | plan 段 + `exit_plan_mode` |
| `skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | 部署级 skill 发现 |
| `skill-badge` | `@deepseek-ai/dsh-skill-badge` | **base 自己** `disabled: true` |
| `compaction-basic` | `@deepseek-ai/dsh-compaction-basic` | 会话压缩 backend |
| `tool-result-pruner` | `@deepseek-ai/dsh-compaction-tool-result-pruner` | 过大 tool result 先剪 |
| `repeat-tool-reminder` | `@deepseek-ai/dsh-repeat-tool-reminder` | 连续重复调用提醒 |
| `timeout-policy` | `@deepseek-ai/dsh-tool-call-timeout-policy` | 工具超时 |
| `spill-local` | `@deepseek-ai/dsh-spill-local` | 溢出字节本地存 |
| `spill-policy` | `@deepseek-ai/dsh-spill-policy` | `maxInlineBytes: 50000` |

### Skills registry / 部署 persona

| `id` | `name` | 角色 |
|---|---|---|
| `skill` | `@deepseek-ai/dsh-skill` | skills **registry**（host；web 留下） |
| `system-prompt` | `@deepseek-ai/dsh-system-prompt` | `ctx.systemPrompt`；`persona: ''`（mode bundle 再写部署人格） |

### Subagent **backends**（in-process）

| `id` | `name` | 角色 |
|---|---|---|
| `subagent` | `@deepseek-ai/dsh-subagent` | `subagents` 注册表（进程单例） |
| `subagent-spawn-in-process` | `@deepseek-ai/dsh-subagent-spawn-in-process` | `providerName: spawn` |
| `subagent-fork-in-process` | `@deepseek-ai/dsh-subagent-fork-in-process` | `providerName: fork` |
| `workflow-worker-thread` | `@deepseek-ai/dsh-workflow-worker-thread` | workflow 子执行；`provider: spawn` |

**没有** `subagent-codex` / `subagent-claude-code`。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39]

### Web search 服务（不是 HTTP 宿主）

| `id` | `name` | 角色 |
|---|---|---|
| `web` | `@deepseek-ai/dsh-web` | 搜索服务缝；`searchProvider: deepseek-official`。**不是** `webserver`。[E: packages/bundle/base/cordis.patch.yml:404] [E: packages/bundle/base/cordis.patch.yml:405] |
| `web-search-deepseek` | `@deepseek-ai/dsh-web-search-deepseek` | DeepSeek search；`apiKeyEnv: DEEPSEEK_API_KEY` |

## 控制流

1. **模板把 base 放第一层。** `PROFILE_TEMPLATES@packages/boot/app-boot/src/profile.ts` 只 ship 两个名字：`web` 的 bundles 是 `@deepseek-ai/dsh-base` 然后 `@deepseek-ai/dsh-web-app`；`headless` 是 `@deepseek-ai/dsh-base` 然后 `@deepseek-ai/dsh-headless`。[E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116] 无名 profile 的 `dsh plugin` init 用 `DEFAULT_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base']`。[E: packages/boot/app-boot/src/profile.ts:125] 测试钉死 `PROFILE_TEMPLATES.web` 含 base，且旧三元组 headless 会被归一成「base + headless」。[E: packages/boot/app-boot/tests/profile.spec.ts:154] [E: packages/boot/app-boot/tests/profile.spec.ts:178]

2. **installation-first 解析 + fail-loud。** `resolveBundleDir@packages/boot/app-boot/src/profile.ts` 先从安装锚点找 `@deepseek-ai/dsh-base`，再才看 profile 目录，保证 in-box bundle 永远来自正在跑的这份 dsh。[E: packages/boot/app-boot/src/profile.ts:347] `loadProfile` 读到的 `package.json` 若没有 `dsh.bundle.patch`，抛 `declares no dsh.bundle`，不会当「无补丁」。[E: packages/boot/app-boot/src/profile.ts:392] [E: packages/boot/app-boot/src/profile.ts:393] base 把该字段写成 `./cordis.patch.yml`。[E: packages/bundle/base/package.json:38]

3. **空根上一次 `applyEntryPatches`。** `composeEntries@packages/boot/app-boot/src/profile.ts` 从 `[]` 出发，把各层 flatten 成一次 `applyEntryPatches`。[E: packages/boot/app-boot/src/profile.ts:416] base 文件的唯一顶层动作是无父 `id` 的 `- insert:`：`applyEntryPatches` 走 `data.push(...insert)`，78 行进入根表，并立刻 `buildMap`，好让**同一 flattened 列表里后写的 patch** 能按 `id` 改刚插的行。[E: packages/bundle/base/cordis.patch.yml:15] [E: vendor/include/src/index.ts:94] [E: vendor/include/src/index.ts:101] launcher 本地 `composeProfile@apps/cli/src/profile-boot.ts` 的层序是 `bundlePatches → profile.patches → homePatches → overlays`。[E: apps/cli/src/profile-boot.ts:151]

4. **`config` 整键覆盖，所以跨 mode 会变的值不准放进 base。** `applyEntryPatches` 对命中的行做 `target[key] = value`，不是 deep-merge。[E: vendor/include/src/index.ts:123] 因此 `system-prompt.persona` 在 base 是空串，由 web / headless 整段重写；`tools.mode` 在 base 省略，由后层用 `DSH_TOOLS_MODE` 整键盖上。跨 mode 会变的值若写进 base，后层必须复述该行全部键，否则丢掉。

5. **`boot` 挂空 `cordis.yml` + 整叠 patches。** `boot@packages/boot/app-boot/src/index.ts`：`new Context` → `provide('dshHomePath')` → `ctx.plugin(Loader)` → `mountRootInclude`。[E: packages/boot/app-boot/src/index.ts:764] [E: packages/boot/app-boot/src/index.ts:770] [E: packages/boot/app-boot/src/index.ts:774] 行激活按 inject / 服务可用性，不是 YAML 书写顺序。[I]

6. **host 服务进 root realm；注册是可逆 `ctx.effect`。** 各行 `name` 指向的插件在 Loader fiber 上 `provide`。例如 `AgentLoop` 构造里 `ctx.effect(() => ctx.agents.setFactory(this), 'agentLoop.setFactory()')`：卸掉 `id: agent-loop` 就清空工厂槽。[E: packages/core/agent-loop/src/index.ts:350] [E: packages/bundle/base/cordis.patch.yml:436] `Fiber.effect@vendor/cordis/src/fiber.ts` 把 disposer 推进列表；dispose 时**倒序**执行。[E: vendor/cordis/src/fiber.ts:418] [E: vendor/cordis/src/fiber.ts:431] `Events.register` 本身也是 `this.ctx.fiber.effect(...)`。[E: vendor/cordis/src/events.ts:256]

7. **Waterfall 必须 `next()`，否则链停在本层。** `Events.waterfall@vendor/cordis/src/events.ts` 把最后一个参数当 innermost `next`：`args.pop()` 取出内建行为，每次调用 `next()` 才 `cbs.shift()` 到下一 listener；不调用就否决剩余链。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:236] [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] base 挂上的三处负载：

   - `ToolRuntime` 调度：`this.ctx.waterfall(carrier, 'tools/pre-execute', exec, () => Promise.resolve({ kind: 'allow' }))`。listener 不 `next()`，默认 `allow` 到不了，工具进不了 body。[E: packages/core/tools/src/index.ts:1475] [E: packages/core/tools/src/index.ts:1477]
   - `systemPrompt.assemble`：`this.ctx.waterfall(..., 'system-prompt/assemble', assembly, context, () => Promise.resolve(assembly))`。不 `next()` 则返回值停在本层，后续 section 装配看不到完整 assembly。[E: packages/core/system-prompt/src/index.ts:532]
   - Loader isolate 钩子：`ctx.on('loader/patch-context', async (entry, next) => { ... await next() })`。不 `await next()`，fiber 不会按新 isolate map reload，realm 换了但插件没重挂。[E: vendor/loader/src/config/isolate.ts:96] [E: vendor/loader/src/config/isolate.ts:129]

8. **`llm-pi-ai` 始终挂、零 route。** base 无条件 insert `id: llm-pi-ai`，**没有** `providers` 块。[E: packages/bundle/base/cordis.patch.yml:95] 插件 `ensureRegistrationFacts`：`routes.length === 0` 时直接 `return`，不 `registerAdapter`。[E: packages/llm/llm-pi-ai/src/index.ts:266] Settings 写出 `llm-pi-ai:` profiles 之后才注册；清空则 drop。这是 settings 驱动的休眠，**不是**「包没进依赖」。对照：Codex / Claude 后端连行都没有。细节在 [`subsys.llm.pi-ai`](../llm/pi-ai.md)。

9. **shell 双栈：同一文件、对称 `disabled`。** `bash-sandbox` / `tool-bash` 写 `disabled: !!js process.platform === 'win32'`；`pwsh-sandbox` / `tool-pwsh` 写倒置的 `!== 'win32'`。[E: packages/bundle/base/cordis.patch.yml:180] [E: packages/bundle/base/cordis.patch.yml:186] [E: packages/bundle/base/cordis.patch.yml:212] [E: packages/bundle/base/cordis.patch.yml:216] `base.spec.ts` 用 `evaluate({ process: { platform } }, expr)` 钉死四行在 win32 / linux 上恰好互斥，并断言仓库里**不存在** `windows.cordis.patch.yml`。[E: packages/bundle/base/tests/base.spec.ts:71] [E: packages/bundle/base/tests/base.spec.ts:72] [E: packages/bundle/base/tests/base.spec.ts:75]

10. **后一层切开 host / preset。** `dsh-web-app` 对 base 的模型可见 `id` 写 `disabled: true`（例如 `tool-bash`），再 `insert` `agent-presets`（`default: standard`）。[E: packages/bundle/web-app/cordis.patch.yml:293] [E: packages/bundle/web-app/cordis.patch.yml:294] [E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/web-app/cordis.patch.yml:424] 权限与执行缝留下：`sandbox` / `approval` / `fs-sandbox` / `subagent` + spawn/fork / `shell-env` / jobs·goals·skills **registry** / `token-meter`。`dsh-headless` 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`，**没有** `agent-presets`，也 **不** disable 那些 tool 行。[E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] 完整 disable 名单在 [`subsys.composition.bundle-web-app`](bundle-web-app.md)。

11. **isolate / `leakedServices`：base 行进 root 是对的；搬进 preset 必须隔离。** base 的 `plan-mode` / `compaction-basic` / `workflow-worker-thread` 在进程根 `provide`，第二个 session 不会再挂一份。Web 关掉这些行之后，`standard` preset 用 `cordis:group` + `isolate: { planMode: true }` / `{ compaction: true, toolResultPruner: true }` / `{ workflowEngine: true }` 给每份 standing mount 私有实例。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:107] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:140] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:177] Loader 读 `isolate?.[name] === true` 时建 `LocalRealm`。[E: vendor/loader/src/config/isolate.ts:81] `mountPreset` settle 后扫 `leakedServices`：子树 fiber 提供的实现，其 store symbol 若等于 `ctx.root[Context.isolate][name]`，就算泄漏进 root。[E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:200] 非空则抛，要求「sit behind an `isolate` realm or move to the host composition」。[E: packages/preset/agent-presets/src/mount.ts:365] 测试用事后 `publish` 钉死这句诊断。[E: packages/preset/agent-presets/tests/invariant.spec.ts:76] 只往 `ctx.tools` 注册、自己不 `provide` 的工具行不必 isolate。

12. **`agents: []`：Web 不在进程级造 Agent。** base 的 `id: agent-loop` 把启动列表留空。[E: packages/bundle/base/cordis.patch.yml:439] 换 loop = 另写一个 `AgentFactory` 占同一 `setFactory` 槽，并在后层 patch 掉这一行，而不是改 `dsh-agent`。[E: packages/core/agent-loop/src/index.ts:350]

## 设计动机

DSH 的产品单元是 `profile → bundle → agent preset`，不是写死工具清单的 coding agent。每个 shipped profile 都要同一套 host 缝（`ctx.llm` / `ctx.sessions` / `ctx.agents` / sandbox / subagent backends），差别只在「谁来 `create` Agent」和「模型看见哪些 tool」。把共享行收成**一层** `dsh-base` insert，后层按 `id` 覆盖，比复制两份 78 行树更不容易漂。

`config` 整键替换逼着「会随 mode 变的值」离开 base：否则 web 改 `persona` 会把其它键冲掉，或 headless 漏复述。`!!js` 把平台门和 env 门写在行上，省掉第二份 Windows patch，也让 `dsh --dump-config` 仍能看见未求值的表达式。

模型可见行先写在 base，是为了 headless（无 roster）仍有全局工具；web 再 disable + preset remount，把同一批 Consumer 从进程根挪到 standing scope。`leakedServices` 卡住「把 host 单例复制进每会话」这条捷径。

`llm-pi-ai` 进树但零 route：组合决定「adapter 存在」，Settings 决定「哪些 provider 在跑」。Codex / Claude 后端连组合都不进默认树——preset 里对应 tool 行 `disabled: true` 并不等于 base 已经 dormant 加载了后端。

## Gotcha

- **README 不是 ground truth。** `packages/bundle/base/README.md` 写 Codex / Claude「load dormant」。`base.spec.ts` 要求 patch 里这两行长度为 0，且 manifest 不依赖那两个包。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:41] 没有行 = 没装。standard preset 里 `tool-subagent-codex` 等行 `disabled: true` 是 preset 面的事，后端仍不在 base。
- **`id: web` 不是 Web GUI。** 它是 `@deepseek-ai/dsh-web` 搜索服务。[E: packages/bundle/base/cordis.patch.yml:404] HTTP 宿主是 `dsh-web-app` 的 `id: webserver`。
- **base 没有 `invariants` 行。** 各包 `./invariant` companion 在默认 `dsh web` 树上不会跑，除非后层自己挂 `InvariantRegistry`。
- **`skill-badge` 在 base 就 `disabled: true`。** 不是 web overlay 才关。[E: packages/bundle/base/cordis.patch.yml:243] [E: packages/bundle/base/cordis.patch.yml:245]
- **不要并列挂 `dsh-fs-local`。** `fs-sandbox` 已经 `provide` `ctx.fs`；再挂一份本地 fs 会撞名 fail-loud。
- **恢复 POSIX bash 到 Windows 必须四行一起改。** 关 `pwsh-sandbox` / `tool-pwsh` **并且** 打开 `bash-sandbox` / `tool-bash`。两套执行器注册同一 `bash` 服务，改一半会在 load 期炸。
- **waterfall 忘了 `next()` = 否决下游。** `tools/pre-execute` 默认 `allow` 到不了；`system-prompt/assemble` 停在本层；`loader/patch-context` 不 reload fiber。这不是「安静跳过」。
- **preset 里再 `provide` 一份 host 单例必炸。** `planMode` / `compaction` / `workflowEngine` 需要 `isolate: { …: true }`；`subagents` / `tokenMeter` / `jobs` / `goals` / `skills` registry 应留在 host。漏 isolate → `leakedServices` 拒整次 `mountPreset`。[E: packages/preset/agent-presets/src/mount.ts:365]
- **`session-query-sqlite` 的 `openAt: never` 不是没挂服务。** `ctx.sessionQuery` 仍在；搜索调用失败，SQLite 不打开。要开全文搜索得后层改 `openAt`。
- **dump 不求值 `!!js`。** `dsh --dump-config` 看到的是表达式对象，不是「这台机器上到底挂了 bash 还是 pwsh」。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | 各能力的合同包：`dsh-llm` / `dsh-session` / `dsh-agent` / `dsh-tools` / `dsh-system-prompt` / `dsh-sandbox-*` / `dsh-subagent`。它们声明 `ctx.*` 与事件词表，**不**出现为独立 bundle | `ctx.llm`、`ctx.sessions`、`ctx.agents`、`ctx.tools`、`ctx.systemPrompt`、`ctx.sandbox`、`subagents`。base 用 `id: llm` / `session` / `agent` / `tools` / `system-prompt` / `sandbox` / `subagent` 把 Definition 插进 root。[E: packages/bundle/base/cordis.patch.yml:24] [E: packages/bundle/base/cordis.patch.yml:27] [E: packages/bundle/base/cordis.patch.yml:58] [E: packages/bundle/base/cordis.patch.yml:424] |
| **Provider** | 同一份 insert 里的实现行：`llm-deepseek` + 零 route 的 `llm-pi-ai`；`session-persistence-jsonl`；`agent-loop`（`setFactory`）；`sandbox-local` + 平台互斥的 `bash-sandbox` / `pwsh-sandbox`；`fs-sandbox`；`subagent-spawn-in-process` / `subagent-fork-in-process` | 全部是 **host 面** `dsh-base` 行，无 `isolate`。换 DeepSeek 路由 = patch `id: llm-deepseek`；换 loop = patch 掉 `id: agent-loop` 并另占工厂槽。[E: packages/bundle/base/cordis.patch.yml:95] [E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/cordis.patch.yml:300] [E: packages/bundle/base/cordis.patch.yml:450] [E: packages/core/agent-loop/src/index.ts:350] |
| **Consumer** | 模型可见 tool 行（`tool-*` / `plan-mode` / `compaction-basic` …）以及 loop 的 `assemble` / `execute` / `llm.stream`。headless：Consumer 留在 host 全局层。web：同一批 `id` 被 `disabled: true`，改由 preset 行消费 host Provider | web 的 `id: tool-bash` `disabled: true` + `id: agent-presets` `default: standard`。[E: packages/bundle/web-app/cordis.patch.yml:294] [E: packages/bundle/web-app/cordis.patch.yml:424] preset 里需要私有实例的 Consumer（`planMode` / `compaction` / `workflowEngine`）必须 `isolate: { …: true }`，否则 `leakedServices` 拒。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108] [E: packages/preset/agent-presets/src/mount.ts:365] |

换 Provider（例如 spawn → 另一个 `providerName`）会带走其 Consumer 的委派目标，但 Definition 仍在。把 Provider 从 host 挪到 preset 而不写 `isolate`，第二个 session 会在 `mountPreset` 失败，而不是静默共用。

## Sources

- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/src/index.ts
- packages/bundle/base/README.md
- packages/bundle/base/package.json
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/base/src/invariant.ts
- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/src/index.ts
- packages/boot/app-boot/tests/profile.spec.ts
- apps/cli/src/profile-boot.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/core/agent-loop/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/system-prompt/src/index.ts
- packages/llm/llm-pi-ai/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/preset/agent-presets/tests/invariant.spec.ts
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- vendor/include/src/index.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/fiber.ts
- vendor/loader/src/config/isolate.ts

## 相关

- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → preset` 启动层序；本页是第一层 bundle 的行表。
- [subsys.composition.bundle-web-app](bundle-web-app.md) — 叠在 base 上的 host UI；disable 模型可见行并 insert `agent-presets`。
- [subsys.composition.bundle-headless](bundle-headless.md) — 叠在 base 上的 one-shot runner；工具留在 host 全局层。
- [spine.overview](../../spine/overview.md) — host 面 vs agent-preset 面总览。
- [spine.capability-seams](../../spine/capability-seams.md) — Definition / Provider / Consumer 词表。
- [subsys.composition.app-boot](app-boot.md) — `loadProfile` / `composeEntries` / `boot`。
- [subsys.composition.agent-presets](agent-presets.md) — `mountPreset` / `leakedServices` / standing scope。
- [subsys.llm.pi-ai](../llm/pi-ai.md) — `llm-pi-ai` 零 route 直到 Settings。
- [subsys.core.agent-loop](../core/agent-loop.md) — 默认工厂与 `agents: []`。
- [surface.presets.overview](../../surface/presets/overview.md) — shipped preset 成员资格（不以 workspace 里有没有包为准）。
