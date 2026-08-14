---
id: spine.overview
title: DSH 源码总览
kind: flow
tier: T0
pkg: cross
source:
  - README.md
  - AGENTS.md
  - docs/architecture.md
  - package.json
  - packages/README.md
  - pnpm-workspace.yaml
  - apps/cli/package.json
  - apps/cli/src/bin.ts
  - apps/cli/src/args.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/preset.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/preset.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/code/preset.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/preset.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/src/index.ts
  - packages/bundle/base/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/package.json
  - packages/bundle/headless/cordis.patch.yml
  - packages/core/agent/src/index.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent/src/inbox.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/invariant.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/surface.ts
  - packages/core/session/src/types.ts
  - packages/core/tools/src/index.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/util/home-paths/src/index.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/fs/fs/src/index.ts
  - packages/sandbox/sandbox/src/index.ts
  - vendor/cordis/package.json
  - vendor/cordis/src/index.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/fiber.ts
  - apps/web/package.json
  - website/package.json
  - python/sdk-runtime/package.json
  - python/README.md
  - native/README.md
symbols:
  - dsh
  - parseDshArgs
  - runProfile
  - loadProfile
  - composeEntries
  - PROFILE_TEMPLATES
  - boot
  - AgentLoop
  - ReactLoopAgent
  - AgentRegistry
  - Inbox
  - deriveMessages
  - resolveDshHome
related:
  - spine.composition-boot
  - spine.turn-and-step
  - ref.package-index
  - ref.glossary
evidence: explicit
status: verified
updated: 47f943859b
---

> DeepSeek Harness (`dsh`) 是 **Cordis 组合运行时**：一次进程由 `profile → bundle → agent preset` 叠成可逆插件树；能力缝是 `Definition / Provider / Consumer`；进入模型请求的内容必须能从 append-only session log 重建（`model-visible ⟺ logged`）。它不是「又一个固定工具清单 + TUI 循环」的 coding agent。

## 能回答的问题

- DSH 的产品单元是组合树还是固定 agent loop？和 Claude / Codex / Pi 那种 coding-agent 产品差在哪一层？
- `dsh web` 如何从 CLI 走到 `profile → bundle → agent preset`，默认安装路径为什么是本地 Web GUI？
- host 面（进程级 webserver / persistence / sandbox / subagent backends）和 agent-preset 面（每会话 tools / persona / isolate）各装什么？
- monorepo workspace 怎么切：`vendor/*`、`packages/*/*`、`apps/*`、`website`、`python/`、`native/`？
- 一次 turn 里 loop、inbox、session log、`deriveMessages()` 如何咬合？
- 默认模型路由、sandbox 失败策略、Home 目录分别落在哪些符号上？

```mermaid
flowchart TD
  User["user"] --> Bin["dsh bin.ts"]
  Bin --> Parse["parseDshArgs"]
  Parse -->|web alias / --profile| ProfileMode["mode=profile"]
  Parse -->|--dump-config| Dump["runDumpConfig"]
  Parse -->|plugin| Plugin["runPlugin pnpm"]
  ProfileMode --> Run["runProfile"]
  Run --> Load["loadProfile + composeEntries"]
  Load --> Templates["PROFILE_TEMPLATES web|headless"]
  Templates --> Base["bundle dsh-base"]
  Templates --> WebApp["bundle dsh-web-app"]
  Templates --> Headless["bundle dsh-headless"]
  Base --> HostPlane["host plane: registries sandbox persistence llm subagent backends"]
  WebApp --> HostUI["host plane: webserver apiproxy agent-presets"]
  Headless --> OneShot["headless-runner no HTTP"]
  HostUI --> PresetRoster["agent-presets default=standard"]
  PresetRoster --> PresetPlane["preset plane: tools persona isolate"]
  Run --> Boot["boot Loader over empty cordis.yml"]
  Boot --> Factory["AgentLoop.setFactory"]
  Factory --> Loop["ReactLoopAgent"]
  Loop --> Inbox["Inbox followup/steer/inject"]
  Loop --> Log["SessionEventMap append-only"]
  Log --> Derive["Session.deriveMessages"]
  Derive --> LLM["ctx.llm deepseek-official"]
  Loop --> Tools["executeToolCalls pre/execute/post"]
```

## 端到端主路径

1. `package.json@package.json` 把仓标成 `@deepseek-ai/dsh-root` `0.1.0-rc.5`，workspace 列出 `vendor/*`、`packages/*/*`、`native/landlock-run`、`apps/*`、`website`；`pnpm-workspace.yaml` 再补 `examples` 与 `python/sdk-runtime`。引擎是 Node `^22.19.0 || >=24.0.0`。[E: package.json:2] [E: package.json:3] [E: package.json:9] [E: package.json:12] [E: pnpm-workspace.yaml:2] [E: pnpm-workspace.yaml:9] [E: pnpm-workspace.yaml:10] [E: pnpm-workspace.yaml:18] [E: pnpm-workspace.yaml:21]

2. `bin@apps/cli/package.json` 发布 `@deepseek-ai/dsh`，`bin.dsh` 指向 `lib/bin.js`。`parseDshArgs@apps/cli/src/args.ts` 只解析 launcher 自己的 `--profile` / `--patch` / dump，其余 argv 原样交给已启动的树。`dsh web` 是硬编码 alias：`resolveBoot(..., 'web', ...)`，与 `dsh --profile web` 同一条 `mode: 'profile'`。[E: apps/cli/package.json:2] [E: apps/cli/package.json:15] [E: apps/cli/src/args.ts:87] [E: apps/cli/src/args.ts:156] [E: apps/cli/src/args.ts:168]

3. `bin.ts` 的 `switch` 只有三个 invocation：`profile` 动态 import `runProfile`，`plugin` 把剩余参数转给 profile 目录里的 pnpm，`dump-config` 走 `runDumpConfig` 且不 boot。[E: apps/cli/src/bin.ts:29] [E: apps/cli/src/bin.ts:31] [E: apps/cli/src/bin.ts:40] [E: apps/cli/src/bin.ts:45] [E: apps/cli/src/args.ts:171]

4. `PROFILE_TEMPLATES@packages/boot/app-boot/src/profile.ts` 只 ship 两个名字：`web = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`，`headless = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-headless']`。无名 profile 用 `DEFAULT_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base']`。help 里的 `dsh --profile tui` 是自定义 profile 示例，不是 shipped 模板；本仓默认产品路径是本地 Web GUI，不是 TUI。[E: packages/boot/app-boot/src/profile.ts:114] [E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116] [E: packages/boot/app-boot/src/profile.ts:125] [E: apps/cli/src/args.ts:68]

5. `loadProfile@packages/boot/app-boot/src/profile.ts` 在 `$DSH_HOME/profiles/<name>` 读 manifest；目录不存在且名字命中模板时 `initProfile`。每层 bundle 必须在自己的 `package.json` 声明 `dsh.bundle.patch`，缺了就 fail-loud。`composeEntries` 从空 `[]` 上按序 `applyEntryPatches`。[E: packages/boot/app-boot/src/profile.ts:371] [E: packages/boot/app-boot/src/profile.ts:376] [E: packages/boot/app-boot/src/profile.ts:392] [E: packages/boot/app-boot/src/profile.ts:413] [E: packages/boot/app-boot/src/profile.ts:416] [E: packages/bundle/base/package.json:36]

6. 本地 `composeProfile@apps/cli/src/profile-boot.ts` 叠层顺序是：各 bundle 的 patch → profile 自己的 `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch` overlays。若组成树里已有 `agent-presets` 行，launcher 再补一条 overlay，把 shipped 根指到 `apps/cli/config/agent-presets/`（`trust: 'system'`）。`runProfile` 把该栈交给 `boot`，并在任何 config 行挂上之前 `provide` 启动环境与 `cmdlineArgs`。[E: apps/cli/src/profile-boot.ts:142] [E: apps/cli/src/profile-boot.ts:151] [E: apps/cli/src/profile-boot.ts:159] [E: apps/cli/src/profile-boot.ts:164] [E: apps/cli/src/profile-boot.ts:248] [E: apps/cli/src/profile-boot.ts:252] [E: apps/cli/src/profile-boot.ts:255]

7. `boot@packages/boot/app-boot/src/index.ts` 新建根 `Context`，`provide('dshHomePath', dshHomePath)`，挂 Loader，再 `mountRootInclude` 空的 profile `cordis.yml`。`runDumpConfig@apps/cli/src/dump-config.ts` 用同一套 layer 标签打印真树并写 stdout，不调用 `boot`。profile 根文件名是 `cordis.yml`，`PROFILE_ROOT_CONFIG` 的 YAML 正文是空数组。[E: packages/boot/app-boot/src/index.ts:758] [E: packages/boot/app-boot/src/index.ts:764] [E: packages/boot/app-boot/src/index.ts:770] [E: apps/cli/src/dump-config.ts:30] [E: apps/cli/src/profile-boot.ts:60] [E: apps/cli/src/profile-boot.ts:67]

8. `@deepseek-ai/dsh-base` 是每个 profile 的第一层 insert：`llm` / `session` / `agent` / `sandbox` / `sandbox-policy` / `approval` / `tools` / `system-prompt` / `agent-loop` / `llm-deepseek` / `llm-pi-ai` / `subagent` + spawn/fork 后端。`dsh-web-app` 在此之上加 host 面：`webserver`（默认 `127.0.0.1:3080`）、`web-runtime`、`agent-presets`（`default: standard`）。`dsh-headless` 的 `insert` 是 `code-runtime` + `headless-startup` + `headless-runner`，没有 `webserver` 行。[E: packages/bundle/base/cordis.patch.yml:24] [E: packages/bundle/base/cordis.patch.yml:58] [E: packages/bundle/base/cordis.patch.yml:169] [E: packages/bundle/base/cordis.patch.yml:436] [E: packages/bundle/base/cordis.patch.yml:450] [E: packages/bundle/web-app/cordis.patch.yml:115] [E: packages/bundle/web-app/cordis.patch.yml:119] [E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/web-app/cordis.patch.yml:424] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

9. `dsh-web-app` 把 `dsh-base` 里模型可见的 tool 行（`tool-subagent`、`tool-todo`、`tool-web`、`agent-instructions` 等）标 `disabled: true`，把它们从进程根挪到 preset 面。shipped 成员资格以 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml` 为准：`standard` 挂 `dsh-tool-bash` / fs / skill / subagent(`toolName: subagent`) / `subagent_fork`；`code` 另加 `dsh-agent-tool-presentation` 的 `mode: code`；`cordis` 另加 `dsh-tool-cordis`；`minimal` 只有 isolated `dsh-tool-bash-persistent` + `dsh-tool-str-replace-editor`。[E: packages/bundle/web-app/cordis.patch.yml:381] [E: packages/bundle/web-app/cordis.patch.yml:405] [E: packages/bundle/web-app/cordis.patch.yml:408] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:44] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:190] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:197] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:259] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60]

10. `AgentPresets@packages/preset/agent-presets/src/index.ts` 把每个 preset 的 `agent.cordis.yml` 做成 standing mount：`standing` Map 按 preset id 单飞，`mount()` 再 `bindScopeParent` 把 agent scope 接到这份 mount。`leakedServices@packages/preset/agent-presets/src/mount.ts` 若发现 process-global service 就抛错，要求 preset 服务坐在 `isolate` realm 或搬到 host。[E: packages/preset/agent-presets/src/index.ts:71] [E: packages/preset/agent-presets/src/index.ts:252] [E: packages/preset/agent-presets/src/index.ts:281] [E: packages/preset/agent-presets/src/index.ts:286] [E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:365]

11. 运行时内核是 vendored `@deepseek-ai/cordis`。`Fiber.effect@vendor/cordis/src/fiber.ts` 登记可逆 effect；dispose 对 `disposables` 倒序执行。`Events.waterfall@vendor/cordis/src/events.ts` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `shift` 到下一个 callback；不调用就停在本层。注册监听本身走 `fiber.effect`。[E: vendor/cordis/package.json:2] [E: vendor/cordis/src/fiber.ts:418] [E: vendor/cordis/src/fiber.ts:431] [E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:256]

12. `AgentRegistry@packages/core/agent/src/index.ts` 挂 `ctx.agents`，拥有 live 表与 factory 槽。默认工厂是 `AgentLoop@packages/core/agent-loop/src/index.ts`：`ctx.effect(() => ctx.agents.setFactory(this))` 把它自己装进去，所以换掉 `agent-loop` 那一行就换掉驱动。工厂在 session 就绪后 `new ReactLoopAgent(...)`。[E: packages/core/agent/src/index.ts:257] [E: packages/core/agent/src/index.ts:267] [E: packages/core/agent-loop/src/index.ts:296] [E: packages/core/agent-loop/src/index.ts:350] [E: packages/core/agent-loop/src/index.ts:549]

13. `ReactLoopAgent@packages/core/agent-loop/src/agent.ts` 实现 `Agent` 合同。inbox 三入口：`followup` → `next-turn` 且 wakeup；`steer` → `next-step` 且 wakeup；`inject` → `next-step` 且不 wakeup。phase 是 `idle` / `maintenance` / `running`。每步先 `inbox.claim`，再 `systemPrompt.assemble`，再 `agent/pre-step` waterfall。[E: packages/core/agent-loop/src/agent.ts:39] [E: packages/core/agent-loop/src/agent.ts:46] [E: packages/core/agent-loop/src/agent.ts:64] [E: packages/core/agent-loop/src/agent.ts:122] [E: packages/core/agent-loop/src/agent.ts:126] [E: packages/core/agent-loop/src/agent.ts:130] [E: packages/core/agent-loop/src/agent.ts:229] [E: packages/core/agent/src/inbox.ts:26] [E: packages/core/agent/src/runtime-types.ts:124]

14. `SessionEventMap@packages/core/session/src/types.ts` 是 append-only 会话事件的类型地图；`SESSION_FORMAT_VERSION` 现为 `0`。模型可见 surface 只有三类：`user/message` / `assistant/message` / `tool/result`。`Session.deriveMessages()` 按 `surfaceOp` 走 surface；`surfaceOp !== 'append'` 的节点是 replace，被遮蔽的区间不再进入投影，原始事件仍留在 log。loop 在 `llm/stream` 上装 invariant：`options.messages` 必须等于 `session.deriveMessages()`，否则 fail `log-reconstruction desync`。[E: packages/core/session/src/types.ts:56] [E: packages/core/session/src/types.ts:236] [E: packages/core/session/src/surface.ts:16] [E: packages/core/session/src/surface.ts:67] [E: packages/core/session/src/index.ts:726] [E: packages/core/agent-loop/src/invariant.ts:39] [E: packages/core/agent-loop/src/invariant.ts:41]

15. 工具走 `executeToolCalls@packages/core/agent-loop/src/tool-calls.ts`，底层 registry 事件是 `tools/pre-execute` → `tools/execute` → `tools/post-execute`（均为 waterfall，必须 `next()`）。`apply@packages/session/session-checkpoint-policy/src/index.ts` 在 adapter 看到流之前 `sessions.flush`，并在 top-level `tools/execute` 进入 tool body 之前再 flush；取消则返回 `TOOL_ABORTED_BEFORE_DISPATCH`，不跑副作用。[E: packages/core/agent-loop/src/tool-calls.ts:59] [E: packages/core/tools/src/index.ts:152] [E: packages/core/tools/src/index.ts:163] [E: packages/core/tools/src/index.ts:175] [E: packages/session/session-checkpoint-policy/src/index.ts:63] [E: packages/session/session-checkpoint-policy/src/index.ts:70] [E: packages/session/session-checkpoint-policy/src/index.ts:72]

16. LLM：`dsh-llm-deepseek` 把唯一 route `deepseek-official` `registerAdapter` 到 `ctx.llm`；`agent-default-model` 默认 `provider: deepseek-official` / `model: deepseek-v4-flash`。`dsh-llm-pi-ai` 始终挂上，但 `routes.length === 0` 时保持 dormant，直到 Settings 写入 profile。[E: packages/llm/llm-deepseek/src/index.ts:47] [E: packages/llm/llm-deepseek/src/index.ts:256] [E: packages/bundle/base/cordis.patch.yml:66] [E: packages/bundle/base/cordis.patch.yml:67] [E: packages/bundle/base/cordis.patch.yml:95] [E: packages/llm/llm-pi-ai/src/index.ts:266]

17. 能力缝在 `ctx` 上是三角角色。`dsh-fs` 只声明 `ctx.fs: FileSystem`（Definition）；`dsh-fs-sandbox` 是 base 挂上的 Provider。`dsh-tool-fs` 是 Consumer：base 插入 `id: tool-fs`；`dsh-web-app` 把它 `disabled: true`；`standard` / `code` / `cordis` 在 preset 再挂；`minimal` 不挂这一行。`dsh-sandbox` 定义 `SANDBOX_UNAVAILABLE`：请求了受限 mode 但没有可用 backend 时 fail-closed，不静默裸跑。Home 是 `resolveDshHome`：显式路径，否则非空 `$DSH_HOME`，否则 `~/.dsh`。[E: packages/fs/fs/src/index.ts:46] [E: packages/bundle/base/cordis.patch.yml:224] [E: packages/bundle/web-app/cordis.patch.yml:312] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:56] [E: packages/bundle/base/cordis.patch.yml:443] [E: packages/sandbox/sandbox/src/index.ts:124] [E: packages/sandbox/sandbox/src/index.ts:140] [E: packages/util/home-paths/src/index.ts:12] [E: packages/util/home-paths/src/index.ts:87]

18. `dsh-base` 测试钉死当前 **不** 把 Codex / Claude 子代理当 dormant 行装进 base：patch 里没有 `subagent-codex` / `subagent-claude-code`，manifest 也不依赖那两个包。preset 里对应 tool 行是 `disabled: true`，要暴露得复制 preset 再打开。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:40] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:205]

## 仓库地图

pnpm workspace 把仓切成六块运行时相关根：

| 根 | 角色 | 入口证据 |
|---|---|---|
| `vendor/*` | 钉死的 Cordis 源（`@deepseek-ai/cordis` 及 loader / include / hmr / schemastery / cosmokit） | [E: pnpm-workspace.yaml:2] [E: vendor/cordis/package.json:2] |
| `packages/*/*` | `@deepseek-ai/dsh-<pkg>`，按 group 目录分（`core/`、`bundle/`、`host/`、`client/`、`llm/`…） | [E: package.json:13] |
| `apps/*` | 产品装配：`@deepseek-ai/dsh` CLI；`@deepseek-ai/dsh-web-frontend` 是 Vite 前端，dist 由 `dsh web` 提供 | [E: apps/cli/package.json:2] [E: apps/web/package.json:2] |
| `website` | `@deepseek-ai/website` VitePress，投影官方 `docs/`，不是运行时 | [E: website/package.json:2] |
| `python/` | Python SDK + 打包运行时；workspace 成员只有 `python/sdk-runtime` | [E: pnpm-workspace.yaml:21] [E: python/sdk-runtime/package.json:2] |
| `native/` | Landlock launcher 源；workspace 含 `native/landlock-run` 及其 packages | [E: pnpm-workspace.yaml:6] |
| `examples` | 可跑的 `cordis.yml` 叶子，只为解析依赖，不是 tsdown 构建目标 | [E: pnpm-workspace.yaml:18] |

`packages/README.md` 用 group 表描述职责（core 是 product API spine，host/client 是 Web GUI 两半，bundle 是 `--profile` patch 层）。包级索引留给 `ref.package-index`。

## host 面与 agent-preset 面

host 面是**进程级**组合，由 profile 的 bundle 栈装上，对所有会话共享：

- 注册表与驱动：`ctx.agents`、`ctx.agentLoop`、`ctx.sessions`、`ctx.tools`、`ctx.systemPrompt`、`ctx.llm`
- 执行世界：`ctx.fs`、`ctx.sandbox`、`ctx.subprocess`、approval / permission
- 持久化与检查点：JSONL persistence、`session-checkpoint-policy`
- 子代理 **backends**（`subagent-spawn-in-process` / `subagent-fork-in-process`）与 registry
- Web host：`dsh-host-webserver`、`dsh-host-apiproxy`、frontend static、plugin inventory

agent-preset 面是**每会话**对那些注册表的贡献，来源是 `agent.cordis.yml`：

- 模型可见 tools（`dsh-tool-bash`、`dsh-tool-fs`、`subagent` / `subagent_fork`…）
- persona / `dsh-agent-instructions` / plan-mode section
- 必须 `isolate` 的私有服务（`compaction`、`planMode`、`terminals`、`workflowEngine`）

`dsh-web-app` 禁用 base 上的模型可见 tool 行，再由 `agent-presets` 按会话挂回，避免多会话共享一份 tool 注册。`standard` 文件头把这称作 AGENT-PLANE：host 保留 registries / sandbox / approval / persistence / model route。`headless` 没有 webserver，但仍走同一套 base host 能力 + 调用方选定的 preset。

相对 peer：Claude / Pi / Codex 的脊柱是「一个产品 loop + 固定工具表」；DSH 的脊柱是「先叠树，再让可替换的 `AgentLoop` 在树上跑」。默认用户路径是 `npx @deepseek-ai/dsh web` / `pnpm dsh web`，不是 shipped TUI。

## 关键决策点

- **空根 + 整行替换**：profile 的 `cordis.yml` 永远是 `[]`。后一层 patch 按 `id` 整份替换 `config`，不 merge。所以 mode 相关值（persona、tools.mode、webserver host）不进 `dsh-base`，留给 `dsh-web-app` / `dsh-headless`。看真树用 `dsh --profile web --dump-config`。
- **factory 可替换，合同不可丢**：`ctx.agents` 是合同与 inbox / 事件；`ctx.agentLoop` 是默认 `ReactLoopAgent` 工厂。新行为优先挂 `agent/*` 与 `tools/*` waterfall，而不是改 loop 源码。
- **model-visible ⟺ logged**：新的模型可见输入必须扩展 `SessionEventMap` 并从 log 投影。`deriveMessages()` 是唯一历史源；invariant 在 `llm/stream` 上比对。compaction 只有 `surfaceOp: replace`，没有 delete。
- **sandbox 只罩文件副作用**：`SandboxMode` 是 `read-only` / `workspace-write` / `danger-full-access`。不可用则 `SANDBOX_UNAVAILABLE`。Approval 默认 `ask`，`danger-full-access` 才是 `never`。
- **preset 成员资格看 yml 不看 package 存在**：包在 workspace 里不等于产品默认装上。Codex / Claude 子代理包可以存在，但 `dsh-base` 测试要求它们不在 base 依赖与 patch 行里。
- **Home 单根**：`$DSH_HOME` 否则 `~/.dsh`。profile、settings、sessions、用户 preset（`$DSH_HOME/.agent-presets`）都挂在这棵根下。

## 指向后续 T1/T2

- `spine.composition-boot` — 空入口表如何叠 bundle / home / `--patch`；`PROFILE_TEMPLATES`；`dsh --dump-config`。
- `spine.turn-and-step` — turn = 0..n step；inbox `followup` / `steer` / `inject`；phase `idle` / `maintenance` / `running`。
- `spine.tool-call-anatomy` — `executeToolCalls` 与 `tools/pre-execute → execute → post-execute`；approval / sandbox 挂点。
- `spine.session-log` — `SessionEventMap`、`deriveMessages()`、`surfaceOp`、checkpoint 两个落点。
- `spine.capability-seams` — Definition / Provider / Consumer；换一条 seam 带走哪些 consumer。
- `spine.context-and-compaction` — prompt sections、workspace 指令、compaction 触发与 `replace`。
- `spine.trace-web-first-prompt` — `dsh web` 到第一轮 turn 结束。
- `spine.trace-headless-turn` — `dsh --profile headless` 从 argv 到进程退出。
- `surface.presets.overview` — `minimal` / `standard` / `code` / `cordis` 成员表。
- `surface.web.workbench` — 浏览器半边与 host API。
- `surface.profiles.headless` — 无 server 的 one-shot runner。
- `subsys.composition.app-boot` — `loadProfile` / `composeEntries` / `boot` 细节。
- `subsys.core.agent-loop` — `AgentLoop` / `ReactLoopAgent` 内部调度。
- `ref.package-index` — monorepo 包与 group 全表。
- `ref.glossary` — profile / bundle / preset / seam / surface 词条。

## Sources

- README.md
- AGENTS.md
- docs/architecture.md
- package.json
- packages/README.md
- pnpm-workspace.yaml
- apps/cli/package.json
- apps/cli/src/bin.ts
- apps/cli/src/args.ts
- apps/cli/src/profile-boot.ts
- apps/cli/src/dump-config.ts
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/preset.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/standard/preset.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/code/preset.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/preset.yml
- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/src/index.ts
- packages/bundle/base/package.json
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/web-app/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/package.json
- packages/bundle/headless/cordis.patch.yml
- packages/core/agent/src/index.ts
- packages/core/agent/src/runtime-types.ts
- packages/core/agent/src/inbox.ts
- packages/core/agent-loop/src/index.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/invariant.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/core/session/src/index.ts
- packages/core/session/src/surface.ts
- packages/core/session/src/types.ts
- packages/core/tools/src/index.ts
- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/util/home-paths/src/index.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/llm/llm-pi-ai/src/index.ts
- packages/fs/fs/src/index.ts
- packages/sandbox/sandbox/src/index.ts
- vendor/cordis/package.json
- vendor/cordis/src/index.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/fiber.ts
- apps/web/package.json
- website/package.json
- python/sdk-runtime/package.json
- python/README.md
- native/README.md

## 相关

- [spine.composition-boot](composition-boot.md) — 组合启动：空入口表叠 bundle / home / `--patch`。
- [spine.turn-and-step](turn-and-step.md) — turn 与 step：可替换 loop、inbox、phase。
- [ref.package-index](../reference/package-index.md) — monorepo 包与 group 索引。
- [ref.glossary](../reference/glossary.md) — profile / bundle / preset / seam / surface 术语。
