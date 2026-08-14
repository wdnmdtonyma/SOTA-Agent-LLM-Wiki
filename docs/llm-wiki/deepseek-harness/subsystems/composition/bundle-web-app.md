---
id: subsys.composition.bundle-web-app
title: dsh-web-app bundle
kind: subsystem
tier: T2
pkg: composition
source:
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/tests/startup.spec.ts
  - packages/bundle/web-app/tests/web-app.spec.ts
  - packages/bundle/web-app/tests/trusted-hosts.spec.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/cmdline/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/session.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/headless/cordis.patch.yml
  - vendor/cordis/src/events.ts
  - vendor/include/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/host/webserver/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
symbols:
  - dsh-web-app
  - webStartup
  - WEB_STARTUP_SERVICE
related:
  - spine.composition-boot
  - surface.profiles.web
  - subsys.composition.agent-presets
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.composition.app-boot
  - subsys.composition.bundle-base
  - subsys.composition.bundle-headless
  - surface.presets.overview
  - subsys.core.tools
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-web-app` 是叠在 `dsh-base` 上的 **host UI 组合层**：插入 `webserver` / `web-runtime` / `api-gateway` / 浏览器 roster / `agent-presets`（`default: standard`），并把 base 上模型可见 tool 行写成 `disabled: true`，让每会话 **agent-preset 面**再挂 tools / persona / isolate。

## 能回答的问题

- `PROFILE_TEMPLATES.web` 相对 `dsh-base` 多了哪一层？谁 `insert` `agent-presets`，`default: standard` 写在哪？
- web overlay 整表 `disabled: true` 了哪些模型可见 / 每会话 `id`？`shell-env`、jobs / goals / skills **registry**、sandbox / approval、subagent **backends**、token-meter 为什么仍留在 host？
- `--host` / `--port` / `--trusted-host` 谁解析？`--host 0.0.0.0` 为何在 `provide('webStartup')` 之前被拒？缺省 bind 是什么？
- Loader `inject` 链（`cmdlineArgs` → `webStartup` → `webServer` / `webRuntime`）和 Cordis `Events.waterfall`（必须 `next()`）差在哪一层？
- `mountPreset` 的 `leakedServices` 如何拒绝 root-realm 泄漏？web 把 tool 行挪到 preset 之后，`tools/pre-execute` 不调用 `next()` 会怎样？
- `dsh-headless` 为什么不挂 `agent-presets`、也不 disable base 工具行？`dsh-base` 有没有 dormant 的 Codex / Claude 子代理后端？

## 职责边界

本包拥有 **web profile 的第二层 bundle patch** 和两颗普通插件：`@deepseek-ai/dsh-web-app/startup`（`name: 'web-startup'`，提供 `webStartup`）与 `@deepseek-ai/dsh-web-app`（`name: 'web-app'`，提供 `webRuntime`、挂 frontend-static、注册 `app:web-surface` / `DSH_WEB_URL`、打印就绪 URL）。manifest 用 `dsh.bundle.patch` 声明 `./cordis.patch.yml`。[E: packages/bundle/web-app/package.json:43] [E: packages/bundle/web-app/src/startup.ts:14] [E: packages/bundle/web-app/src/startup.ts:20] [E: packages/bundle/web-app/src/index.ts:26] [E: packages/bundle/web-app/src/index.ts:32]

本包**不**拥有：profile 发现与 `composeEntries`（[`subsys.composition.app-boot`](app-boot.md)）；`dsh-base` 那条共享 insert（[`subsys.composition.bundle-base`](bundle-base.md)）；preset 发现 / `mountPreset` / `leakedServices` 机制（[`subsys.composition.agent-presets`](agent-presets.md)）；`ctx.tools` 注册表与 `tools/*` 管线（[`subsys.core.tools`](../core/tools.md)）；浏览器壳槽位（`surface.web.workbench`）。旗标语义与 bind 的产品面在 [`surface.profiles.web`](../../surface/profiles/web.md)；本页写组合行、inject 门、isolate 与 waterfall。

`dsh-base` **当前不** dormant 加载 Codex / Claude 子代理：base patch 没有 `subagent-codex` / `subagent-claude-code` 行，manifest 也不依赖那两个包。web overlay 因此也没有「关掉 dormant 后端」这一步。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:40] [E: packages/bundle/base/tests/base.spec.ts:41]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/bundle/web-app/cordis.patch.yml` | 叠在 base 之后的真树：改写、第一段 host insert、整表 disable、第二段 `agent-presets` |
| `packages/bundle/web-app/package.json` | `dsh.bundle.patch = ./cordis.patch.yml`；`exports` 暴露 `.` / `./startup` |
| `packages/bundle/web-app/src/startup.ts` | `web-startup`：解析 inner args，`provide('webStartup')` |
| `packages/bundle/web-app/src/index.ts` | `web-app`：LAN 信任快照、`webRuntime`、dist、prompt / `DSH_WEB_URL`、URL 行 |
| `packages/bundle/web-app/tests/startup.spec.ts` | 无旗标回退 `127.0.0.1:3080`；`--host 0.0.0.0` / 非数字 port / `--help` 不 provide |
| `packages/bundle/web-app/tests/web-app.spec.ts` | `webRuntime` 快照、URL 行等 Loader、缺 dist fail-loud |
| `packages/bundle/web-app/tests/trusted-hosts.spec.ts` | `resolveLanTrust`：loopback 不采 LAN；`0.0.0.0` 采非 internal IPv4 |
| `packages/boot/app-boot/src/profile.ts` | `PROFILE_TEMPLATES.web`；`composeEntries` 从 `[]` 一次 `applyEntryPatches` |
| `packages/boot/cmdline/src/index.ts` | `provideCmdline` / `parseCmdline`；help 与 `program.error` 走 `ctx.appExit` |
| `packages/preset/agent-presets/src/mount.ts` | `leakedServices`；preset 行不得 publish 进 root realm |
| `packages/host/apiproxy/src/api-proxy.ts` | `composeAgent`：`presets.mount` 放进 factory `setup` |
| `apps/cli/src/profile-boot.ts` | 未导出的 `composeProfile`；见到 `agent-presets` 再 overlay shipped `roots` |
| `vendor/cordis/src/events.ts` | `Events.waterfall`：不调用 `next()` 就不会 `shift` |
| `packages/bundle/base/cordis.patch.yml` | host 留下的 registry / sandbox / subagent backends |

## 数据模型

| 符号 | 要点 |
|---|---|
| `WEB_STARTUP_SERVICE` | 字面量 `'webStartup'`。`WebStartupValues`：可选 `host` / `port`，必有 `trustedHosts: string[]`。 |
| `webRuntime` | `WebRuntimeValues`：`lanAddresses` + `trustedHosts`（LAN 字面量后接 `--trusted-host`）。 |
| `web-app` `Config` | `printUrl` 默认 `true`；`surfaceContext` 默认 `true`；`trustedHosts` 默认 `[]`。 |
| patch 三种刀 | 同 `id` 覆盖（`config` **整键**替换、`disabled` 整键替换）；无 `id` 的 `insert` 追加到根。 |
| `AgentPresets.Config.default` | **必填**字符串。web 写出 `standard`；运行时 `defaultId` 优先读 settings 文档。 |

`WebServer.Config.host` 只接受 `'127.0.0.1' \| '0.0.0.0'`。[E: packages/host/webserver/src/index.ts:61] `--host 1.2.3.4` 能过 `web-startup`，会在 `webserver` 行 schema 上失败。旗标路径真正能用的 bind host 是省略（回退 loopback）或显式 `127.0.0.1`。

## 控制流

1. **模板把本 bundle 叠在 base 之后。** `PROFILE_TEMPLATES.web@packages/boot/app-boot/src/profile.ts` 是 `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`。第一次 `dsh web` / `dsh --profile web` 命中模板才 `initProfile`。每个 bundle 必须声明 `dsh.bundle.patch`；本包装的是 `./cordis.patch.yml`。[E: packages/boot/app-boot/src/profile.ts:115] [E: packages/bundle/web-app/package.json:43]

2. **真树从空根一次叠。** `composeEntries@packages/boot/app-boot/src/profile.ts` 从 `[]` 调用 `applyEntryPatches`。带 `id` 的 patch 对 `config` / `disabled` 等键做 **整键覆盖**（不是 deep-merge）；匹配不到的 id 只 warn。[E: packages/boot/app-boot/src/profile.ts:416] [E: vendor/include/src/index.ts:123] launcher 本地 `composeProfile` 的顺序是 bundles → profile `cordis.patch.yml` → home `cordis.patch.yml` → `--patch`。web 必须重述它改的那一行的全部键。

3. **先改 base 已有行的部署值。** web 覆盖：`system-prompt.persona`（部署级英文句，含 `{{model}}` / `{{cwd}}`）；`hmr` `disabled: true`（关掉 base 共享模块热重载，**不是**删行）；`session-query-sqlite` 再陈述 `path: ':memory:'` / `openAt: never`；`tools.mode` 吃 `process.env.DSH_TOOLS_MODE`。unset 时该 `!!js` 是 `undefined`，`ToolRuntime.Config.mode` 回落 `'native'`。[E: packages/bundle/web-app/cordis.patch.yml:16] [E: packages/bundle/web-app/cordis.patch.yml:22] [E: packages/bundle/web-app/cordis.patch.yml:23] [E: packages/bundle/web-app/cordis.patch.yml:41] [E: packages/core/tools/src/index.ts:791]

4. **第一段 `insert` 放下 host UI / 传输 / 浏览器 roster。** 含 `code-runtime`、storage 三件套、`workspace`、`api-gateway`、`web-startup`、`webserver`、`web-runtime`、`client-hmr`、`modules` / `connection` / `client-runtime`，以及一组 `ui-*`（node 半边扫进 `window.__DSH_BOOT__`；本页不把每个 `ui-*` 写成独立子系统）。`webserver` 与 `web-runtime` 都 `inject: [webStartup]`；`connection` 再 `inject: [webRuntime]`。[E: packages/bundle/web-app/cordis.patch.yml:48] [E: packages/bundle/web-app/cordis.patch.yml:107] [E: packages/bundle/web-app/cordis.patch.yml:115] [E: packages/bundle/web-app/cordis.patch.yml:117] [E: packages/bundle/web-app/cordis.patch.yml:130] [E: packages/bundle/web-app/cordis.patch.yml:132] [E: packages/bundle/web-app/cordis.patch.yml:158]

5. **`webStartup` 是普通 Provider，不是 launcher 元数据。** `apply@packages/bundle/web-app/src/startup.ts` 声明 `inject: ['cmdlineArgs']`。launcher 在任何树行挂上之前 `provideCmdline`。`parseCmdline` 跑 commander；成功才进入 action 里 `ctx.provide(WEB_STARTUP_SERVICE, …)`。`host` / `port` 只在旗标出现时展开；`trustedHosts` 缺省 `[]`。help / version / `program.error` 走 `ctx.appExit`，**不** `process.exit`，action 不跑，服务不出现。[E: packages/bundle/web-app/src/startup.ts:17] [E: packages/bundle/web-app/src/startup.ts:65] [E: packages/bundle/web-app/src/startup.ts:75] [E: packages/bundle/web-app/src/startup.ts:76] [E: packages/bundle/web-app/src/startup.ts:77] [E: packages/bundle/web-app/src/startup.ts:78] [E: packages/bundle/web-app/src/startup.ts:81] [E: packages/boot/cmdline/src/index.ts:70] [E: packages/boot/cmdline/src/index.ts:117]

6. **`--host 0.0.0.0` 在 provide 之前 fail-closed。** action 里字面量等于 `'0.0.0.0'` 则 `program.error(…intentionally not supported yet for safety…)`；非 `/^\d+$/` 的 `--port` 同样 error。测试钉死：服务 `undefined`、consumer 的 `readerConfig` 不出现、`appExit(1)`。`--help` 打印 `dsh --profile web` 自己的 help，`appExit(0)`，同样不 provide。[E: packages/bundle/web-app/src/startup.ts:69] [E: packages/bundle/web-app/src/startup.ts:70] [E: packages/bundle/web-app/src/startup.ts:72] [E: packages/bundle/web-app/tests/startup.spec.ts:119] [E: packages/bundle/web-app/tests/startup.spec.ts:132] [E: packages/bundle/web-app/tests/startup.spec.ts:134] [E: packages/bundle/web-app/tests/startup.spec.ts:136]

7. **缺省 bind 是表达式回退，不是服务默认字段。** 无旗标时服务值是 `{ trustedHosts: [] }`。`webserver.config` 写 `host: !!js ctx.webStartup.host ?? '127.0.0.1'`、`port: !!js ctx.webStartup.port ?? 3080`。fixture consumer 读到的就是 `127.0.0.1:3080`。`inject: [webStartup]` 的行在服务缺失时保持 pending：`--help` 不 bind 端口。[E: packages/bundle/web-app/tests/startup.spec.ts:107] [E: packages/bundle/web-app/tests/startup.spec.ts:109] [E: packages/bundle/web-app/tests/startup.spec.ts:110] [E: packages/bundle/web-app/cordis.patch.yml:119] [E: packages/bundle/web-app/cordis.patch.yml:120]

8. **`web-runtime` 在 bind 之后发 `webRuntime`。** 插件自身 `inject: ['webServer']`。`apply@packages/bundle/web-app/src/index.ts` 调 `resolveLanTrust(ctx.webServer.host, config.trustedHosts)`：只有 bind 等于 `'0.0.0.0'` 才采非 internal IPv4；loopback bind 的 `lanAddresses` 是 `[]`。然后 `ctx.provide('webRuntime', runtime)`。`surfaceContext` 为真时注册 `app:web-surface`（`order: -98`）并往 host `shell-env` `register` `DSH_WEB_URL`。`printUrl` 等 `loader.await()` 成功且 `webServer` 仍在，才打印 `dsh web: http://127.0.0.1:<port>`；有 LAN 快照再附 `(LAN: http://…)`。缺 frontend dist 抛 `frontend dist not built`。[E: packages/bundle/web-app/src/index.ts:35] [E: packages/bundle/web-app/src/index.ts:85] [E: packages/bundle/web-app/src/index.ts:86] [E: packages/bundle/web-app/src/index.ts:138] [E: packages/bundle/web-app/src/index.ts:144] [E: packages/bundle/web-app/src/index.ts:150] [E: packages/bundle/web-app/src/index.ts:168] [E: packages/bundle/web-app/tests/web-app.spec.ts:97] [E: packages/bundle/web-app/tests/trusted-hosts.spec.ts:30]

9. **整表 disable 模型可见 / 每会话行（disable，不是删除）。** base 仍先 insert 这些行；web 按 id 把 `disabled` 写成 `true`，无平台条件，因此也覆盖 base 里 `tool-bash` / `tool-pwsh` 的 `process.platform` 表达式。缺行的 overlay 会被 `applyEntryPatches` 跳过，所以不能靠「不写」把共享 base 行拿掉。

   | `id` | web 行 |
   |---|---|
   | `tool-bash` | [E: packages/bundle/web-app/cordis.patch.yml:293] [E: packages/bundle/web-app/cordis.patch.yml:294] |
   | `tool-pwsh` | [E: packages/bundle/web-app/cordis.patch.yml:296] [E: packages/bundle/web-app/cordis.patch.yml:297] |
   | `tool-jobs` | [E: packages/bundle/web-app/cordis.patch.yml:309] [E: packages/bundle/web-app/cordis.patch.yml:310] |
   | `tool-fs` | [E: packages/bundle/web-app/cordis.patch.yml:312] [E: packages/bundle/web-app/cordis.patch.yml:313] |
   | `tool-fs-search` | [E: packages/bundle/web-app/cordis.patch.yml:315] [E: packages/bundle/web-app/cordis.patch.yml:316] |
   | `tool-str-replace-editor` | [E: packages/bundle/web-app/cordis.patch.yml:318] [E: packages/bundle/web-app/cordis.patch.yml:319] |
   | `skill-filesystem` | [E: packages/bundle/web-app/cordis.patch.yml:330] [E: packages/bundle/web-app/cordis.patch.yml:331] |
   | `tool-skill` | [E: packages/bundle/web-app/cordis.patch.yml:333] [E: packages/bundle/web-app/cordis.patch.yml:334] |
   | `tool-goal` | [E: packages/bundle/web-app/cordis.patch.yml:345] [E: packages/bundle/web-app/cordis.patch.yml:346] |
   | `plan-mode` | [E: packages/bundle/web-app/cordis.patch.yml:348] [E: packages/bundle/web-app/cordis.patch.yml:349] |
   | `compaction-basic` | [E: packages/bundle/web-app/cordis.patch.yml:358] [E: packages/bundle/web-app/cordis.patch.yml:359] |
   | `command-compact` | [E: packages/bundle/web-app/cordis.patch.yml:361] [E: packages/bundle/web-app/cordis.patch.yml:362] |
   | `tool-result-pruner` | [E: packages/bundle/web-app/cordis.patch.yml:364] [E: packages/bundle/web-app/cordis.patch.yml:365] |
   | `tool-subagent-control` | [E: packages/bundle/web-app/cordis.patch.yml:374] [E: packages/bundle/web-app/cordis.patch.yml:375] |
   | `tool-subagent-list-agents` | [E: packages/bundle/web-app/cordis.patch.yml:377] [E: packages/bundle/web-app/cordis.patch.yml:378] |
   | `tool-subagent` | [E: packages/bundle/web-app/cordis.patch.yml:380] [E: packages/bundle/web-app/cordis.patch.yml:381] |
   | `tool-subagent-fork` | [E: packages/bundle/web-app/cordis.patch.yml:383] [E: packages/bundle/web-app/cordis.patch.yml:384] |
   | `workflow-worker-thread` | [E: packages/bundle/web-app/cordis.patch.yml:392] [E: packages/bundle/web-app/cordis.patch.yml:393] |
   | `tool-workflow` | [E: packages/bundle/web-app/cordis.patch.yml:395] [E: packages/bundle/web-app/cordis.patch.yml:396] |
   | `tool-ralph` | [E: packages/bundle/web-app/cordis.patch.yml:398] [E: packages/bundle/web-app/cordis.patch.yml:399] |
   | `agent-instructions` | [E: packages/bundle/web-app/cordis.patch.yml:401] [E: packages/bundle/web-app/cordis.patch.yml:402] |
   | `tool-todo` | [E: packages/bundle/web-app/cordis.patch.yml:404] [E: packages/bundle/web-app/cordis.patch.yml:405] |
   | `tool-web` | [E: packages/bundle/web-app/cordis.patch.yml:407] [E: packages/bundle/web-app/cordis.patch.yml:408] |

   `hmr` 也是 `disabled: true`，但它不是模型可见 tool 行。共享模块 HMR、launcher 后来补上的 `root: []` watch-only HMR、以及始终 insert 的 `client-hmr`，是三条不同的线。

10. **host 面留下 registry / 执行缝 / 后端。** web **没有**对这些 base `id` 写 `disabled: true`。Gateway Remote、跨会话查询、以及 preset 行用 `ctx.get` 读到的名字，必须落在两边都能看见的 root realm。

    | 留下的 host `id` | base 行 | web 只搬走的对应行 |
    |---|---|---|
    | `shell-env` | [E: packages/bundle/base/cordis.patch.yml:207] | 无 tool 行。`web-runtime` 在 bind 后 `shellEnv.register` `DSH_WEB_URL` |
    | `jobs` | [E: packages/bundle/base/cordis.patch.yml:69] | `tool-jobs` |
    | `skill` | [E: packages/bundle/base/cordis.patch.yml:237] | `skill-filesystem`、`tool-skill` |
    | `goal`（另有 `goal-round-driver` / `command-goal`） | [E: packages/bundle/base/cordis.patch.yml:256] | `tool-goal` |
    | `token-meter` | [E: packages/bundle/base/cordis.patch.yml:281] | `compaction-basic`、`command-compact`、`tool-result-pruner` |
    | `sandbox` / `sandbox-policy` / `approval` / `permission` | [E: packages/bundle/base/cordis.patch.yml:169] [E: packages/bundle/base/cordis.patch.yml:188] | 无；权限缝留在进程 |
    | `subagent` + `subagent-spawn-in-process` + `subagent-fork-in-process` | [E: packages/bundle/base/cordis.patch.yml:292] [E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/cordis.patch.yml:300] | `tool-subagent*`、`tool-workflow`、`tool-ralph`、`workflow-worker-thread` |
    | `tool-subagent-report` | [E: packages/bundle/base/cordis.patch.yml:332] | **未** disable：它往单例 registry 注册 continuable setup，不是这个 agent 调用的 tool |

11. **第二段 `insert` 只挂 roster。** `id: agent-presets` / `name: '@deepseek-ai/dsh-agent-presets'` / `config.default: standard`。`AgentPresets.Config.default` 是 required；`defaultId` 每次读 settings 文档，没有才回落该 config。web 没写 settings 时，新会话落到 `standard`。[E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/web-app/cordis.patch.yml:422] [E: packages/bundle/web-app/cordis.patch.yml:424] [E: packages/preset/agent-presets/src/index.ts:87] [E: packages/preset/agent-presets/src/index.ts:192]

12. **launcher 再补 shipped root。** `composeProfile@apps/cli/src/profile-boot.ts`（**未导出**）在叠完文件层后若 `rows.has('agent-presets')`，push 一条同 id overlay：展开已有 `config`，写入 `roots: [{ path: SHIPPED_PRESET_ROOT, trust: 'system' }]`。`SHIPPED_PRESET_ROOT` 解析到 `apps/cli/config/agent-presets/`。用户可写根是 `dsh-agent-presets` 自己的 `includeUserRoot` 默认，不靠这一刀。`dsh --dump-config` **看不到**这层 overlay。[E: apps/cli/src/profile-boot.ts:35] [E: apps/cli/src/profile-boot.ts:159] [E: apps/cli/src/profile-boot.ts:164]

13. **会话在 factory `setup` 里 join preset。** Web `composeAgent@packages/host/apiproxy/src/api-proxy.ts`：`ctx.get('agentPresets')` 存在则 `presets.resolve`，把 id 放进返回值 `agentPreset`，真正的 `presets.mount(agentCtx, resolvedId)` 放进 `setup`。随后 `agents.create` 把该 id 写入 header `agentPreset`。`mount` 对每个 preset id single-flight 一份 standing scope，再 `bindScopeParent`。`setup` 失败则整次 create 回滚。`ctx.get('agentPresets') === undefined`（headless 默认）时 `composeAgent` 只装 model selection。[E: packages/host/apiproxy/src/api-proxy.ts:1231] [E: packages/host/apiproxy/src/api-proxy.ts:1245] [E: packages/host/apiproxy/src/api-proxy.ts:1670] [E: packages/host/apiproxy/src/api-proxy.ts:1675] [E: packages/preset/agent-presets/src/index.ts:286]

14. **isolate / `leakedServices`：preset 不得把 service publish 进 root realm。** `leakedServices@packages/preset/agent-presets/src/mount.ts` 遍历 store：实现的 fiber 属于这次 mount，且 store key 等于 **root** `Context.isolate[name]`，该名算泄漏。`mountPreset` 在 `leaked.length > 0` 时抛 `row(s) published process-global service(s) […]; a preset service must sit behind an \`isolate\` realm or move to the host composition`。这就是把 `jobs` / `skill` / `goal` / `subagent` / `token-meter` / `shell-env` 留在 host 的门：Gateway 与跨会话查询从 host 解析这些名字；搬进 per-session realm 会 `service-unavailable` 或第二次会话撞名。需要私有实例的行必须 `isolate: { …: true }`。shipped `standard` 对 `planMode`、`compaction` + `toolResultPruner`、`workflowEngine` 就是这样。[E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:200] [E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:362] [E: packages/preset/agent-presets/src/mount.ts:365] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:107] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:140] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:177]

15. **waterfall 必须 `next()`，这和 Loader `inject` 不是同一条链。** `inject: [webStartup]` 是 **挂载门**：服务未 provide 则该行 pending，不会激活 `webserver`。Cordis `Events.waterfall@vendor/cordis/src/events.ts` 把最后一个参数当 innermost `next`；监听器调用传入的 `next()` 才会 `cbs.shift()` 到下一层，不调用就停在本层，内建默认行为也不跑。web 把 tool 行挪到 preset 之后，同一套 `tools/*` 事件改在 scoped fiber 上派发：`tools/pre-execute` 的 innermost 是 `{ kind: 'allow' }`；listener 不 `next()` 则默认 allow 不到，调用卡在该层。`system-prompt/assemble` 同样是 waterfall；host 注册的 `app:web-surface` 与 preset 的 persona section 都坐在这条链上。注册监听本身是可逆 `fiber.effect`。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:256] [E: packages/core/tools/src/index.ts:152] [E: packages/core/tools/src/index.ts:1475] [E: packages/core/tools/src/index.ts:1477]

16. **model-visible ⟺ logged。** 创建时 header 记下 `agentPreset`。空白会话换 preset 必须 `session.append('agent-preset/selected', …)`。`resolveSessionPreset` 从事件尾往头找最后一次 selection，找不到才回落 header。resume / fork / 冷读一律走这条，禁止只信 header，否则会用创建时的工具集重放已经换过 preset 的历史。[E: packages/preset/agent-presets/src/session.ts:51] [E: packages/preset/agent-presets/src/session.ts:53] [E: packages/host/apiproxy/src/api-proxy.ts:1651]

17. **共享 `hmr` 关掉之后，launcher 补 watch-only。** web 把 `id: hmr` `disabled: true` 后 `ctx.get('hmr')` 为空，`runProfile` 再 `loader.create` 一个 `config: { root: [] }` 的 `@deepseek-ai/cordis-plugin-hmr`，只让用户 `cordis.patch.yml` 热更新。`client-hmr` 是另一条始终 insert 的行，空闲直到 `pnpm run dev:web` 改写 client bundle。[E: packages/bundle/web-app/cordis.patch.yml:23] [E: apps/cli/src/profile-boot.ts:279] [E: apps/cli/src/profile-boot.ts:283]

18. **和 `dsh-headless` 差在哪一层。** headless 的 `insert` 是 `code-runtime` + `headless-startup` + `headless-runner`，**没有** `agent-presets`，**没有** `webserver`，也 **不** disable base 的工具行：模型可见工具留在 host 全局层。两种 shipped 模板都叠 `dsh-base`；本仓没有 shipped TUI 包，默认产品路径是本地 Web GUI。[E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] [E: packages/boot/app-boot/src/profile.ts:116]

## 设计动机

- **多会话 GUI 不能把 agent 面钉在进程根上。** base 为单会话进程把 tool 行直接插在 host；web 同时开多个 Agent，必须把模型可见行 disable，让 factory `setup` 按会话 join 一份 preset。权限 / 执行缝（sandbox / approval / subagent **backends**）仍是进程级 Provider。
- **disable 而不是删除。** `applyEntryPatches` 按 id 打补丁；后层不点名的行会原样留下。共享 base 被 web 与 headless 共用，缺行会在以后重排 composition 时静默回归。
- **inject 链替代 launcher 特例。** `--host` / `--port` 是 inner args。`web-startup` 提供普通服务，下游行 `!!js ctx.webStartup.*`。`--help` 不 provide，依赖行 pending，进程不 bind。
- **`--host 0.0.0.0` 拒在旗标层。** 浏览器工作台暴露的是远程代码执行面；旗标路径只允许 loopback。composition overlay 仍可整行改写 `webserver.config.host`（schema 仍允许 `'0.0.0.0'`），那是部署选择，不是 `--host` 旗标。
- **isolate 门解释「谁必须留 host」。** 跨会话单例、Gateway Remote 解析的名字、host 在会话存在之前就要 `inject` 的服务（`shell-env`），都不能进 preset realm。只往 `ctx.tools.register`、自己不 `provide` 的 tool 行不必 isolate。
- **waterfall 保持可组合。** 换 permission / timeout / prompt 段挂在同一条必须 `next()` 的链上，而不是 fork 一份 web 专用 loop。

## Gotcha

- `hmr` `disabled: true`、`client-hmr` 始终挂着、launcher `root: []` watch-only HMR，是三件事。把「web 关了 HMR」理解成用户 patch 不能热更新，是错的。[E: packages/bundle/web-app/cordis.patch.yml:23] [E: apps/cli/src/profile-boot.ts:283]
- `DSH_TOOLS_MODE` 是**进程级** Code Mode 开关，不是 per-session `presentAs`。unset = schema 默认 `native`。[E: packages/bundle/web-app/cordis.patch.yml:41] [E: packages/core/tools/src/index.ts:791]
- `tool-subagent-report` 留在 host。把它随其它 `tool-subagent*` 一起 disable 再在每个 preset 里挂一份，第二个 live session 会在 continuable setup 上撞名。[E: packages/bundle/base/cordis.patch.yml:332]
- Loader `inject` 失败表现为行 pending（`--help` 不挂服务器）。waterfall 不 `next()` 表现为事件停在该 listener，默认 allow / 默认 assemble 结果都不出现。不要把两种「链断了」画成同一个 bug。
- `dsh --profile web --dump-config` 不 boot、不跑 `web-startup`，看不到 `--host` / `--port` 决议后的值，也看不到 launcher 注入的 shipped `roots`。
- 缺 frontend dist 是 fail-loud，没有静默空页面。[E: packages/bundle/web-app/src/index.ts:122]
- `dsh-base` 没有 `subagent-codex` / `subagent-claude-code`。preset 里对应 tool 行若存在且 `disabled: true`，那是 preset 成员资格，不是「base 装了但 dormant」。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39]
- shipped 成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`，不认「仓库里有这个包」。

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| 组合层 `dsh-web-app` | npm 包 `@deepseek-ai/dsh-web-app` + `dsh.bundle.patch` → `./cordis.patch.yml` | `PROFILE_TEMPLATES.web` 第二项；`composeEntries` 按 bundles 顺序 `applyEntryPatches` | `dsh web` / `--profile web` 的 Loader 入口表；用户 / home / `--patch` 仍可再覆盖同 id |
| `ctx.webStartup` | `WEB_STARTUP_SERVICE = 'webStartup'`；`WebStartupValues` | **host** 行 `id: web-startup` `name: '@deepseek-ai/dsh-web-app/startup'`；`inject: ['cmdlineArgs']` | `webserver` / `web-runtime` 的 `inject: [webStartup]` 与 `!!js ctx.webStartup.host ?? '127.0.0.1'` |
| `ctx.webServer` | `@deepseek-ai/dsh-host-webserver` 的 `WebServer`；服务名 `'webServer'` | **host** 行 `id: webserver`；缺省 `127.0.0.1:3080` | `web-app` `inject: ['webServer']`；`connection` 的 `/api` 路由 |
| `webRuntime` | `WebRuntimeValues`（LAN + trusted hosts） | **host** 行 `id: web-runtime` `name: '@deepseek-ai/dsh-web-app'`；`provide('webRuntime')` | `connection` `inject: [webRuntime]`；URL 行与 trust fence 共用同一份快照 |
| `ctx.agentPresets` | `@deepseek-ai/dsh-agent-presets`：`AgentPresets` / `mountPreset` / `leakedServices` | **host** 行 `id: agent-presets` `default: standard`（仅 web insert；headless **无**此行） | `composeAgent` 在 factory `setup` 里 `mount`；`defaultId` / `ui-agent-preset` |
| `ctx.tools` + `tools/*` waterfall | `@deepseek-ai/dsh-tools`：`ToolRuntime`；事件 `tools/pre-execute` 等，必须 `next()` | **host** 行 `id: tools`（registry 留下）。模型可见 tool **行**被 web disable，改由 preset 再挂 | `ReactLoopAgent` → `executeToolCalls`；preset 的 `dsh-tool-*`。不 `next()` 则默认 `allow` 不到 |
| isolate / 泄漏门 | `leakedServices(ctx, fiber)`：root realm 符号 | 需要私有实例的 **preset** 行写 `isolate: { …: true }`（`standard`：`planMode` / `compaction` / `workflowEngine`） | `mountPreset` 拒绝泄漏。`jobs` / `skill` / `goal` / `subagent` / `token-meter` / `shell-env` 必须是 host Provider |

换一条缝的 Provider（例如把 `jobs` 搬进 preset realm、或删掉 `agent-presets` 行）会带走它的 Consumer：Gateway 变 `service-unavailable`，或会话退回 host 全局工具集。Definition（服务名与 waterfall 合同）保持不变。

## Sources

- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/src/startup.ts
- packages/bundle/web-app/src/index.ts
- packages/bundle/web-app/package.json
- packages/bundle/web-app/tests/startup.spec.ts
- packages/bundle/web-app/tests/web-app.spec.ts
- packages/bundle/web-app/tests/trusted-hosts.spec.ts
- packages/boot/app-boot/src/profile.ts
- packages/boot/cmdline/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/session.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/headless/cordis.patch.yml
- vendor/cordis/src/events.ts
- vendor/include/src/index.ts
- packages/core/tools/src/index.ts
- packages/host/webserver/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- apps/cli/src/profile-boot.ts
- apps/cli/config/agent-presets/standard/agent.cordis.yml

## 相关

- [`spine.composition-boot`](../../spine/composition-boot.md) — `profile → bundle → preset` 端到端叠层；本页是 web 那一层 bundle 的控制流。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 的产品面：入口 alias、旗标表、host 插入 id 全表。
- [`subsys.composition.agent-presets`](agent-presets.md) — 发现、standing mount、`leakedServices`、`resolveSessionPreset`。
- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图，host / preset / client 边界。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从 `dsh web` 到第一轮提问。
- [`subsys.composition.app-boot`](app-boot.md) — `loadProfile` / `composeEntries` / `boot` / 空根重写。
- [`subsys.composition.bundle-base`](bundle-base.md) — 每个 profile 的第一层 insert；web 在它之后 disable / 覆盖。
- [`subsys.composition.bundle-headless`](bundle-headless.md) — 另一份 mode bundle：无 `agent-presets`，工具留在 host。
- [`surface.presets.overview`](../../surface/presets/overview.md) — shipped / 用户 preset 的模型可见成员。
- [`subsys.core.tools`](../core/tools.md) — host 面 `ctx.tools` 与必须 `next()` 的 `tools/*` waterfall。
