---
id: surface.presets.overview
title: agent preset 总览
kind: surface
tier: T1
pkg: composition
source:
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/preset.ts
  - packages/preset/agent-presets/src/metadata.ts
  - packages/preset/agent-presets/src/session.ts
  - packages/preset/agent-presets/src/authoring.ts
  - packages/preset/agent-presets/src/invariant.ts
  - packages/preset/agent-presets/package.json
  - packages/preset/agent-presets/tests/discovery.spec.ts
  - packages/preset/agent-presets/tests/mount.spec.ts
  - packages/preset/agent-presets/tests/session.spec.ts
  - packages/preset/agent-presets/tests/settings.spec.ts
  - packages/preset/agent-presets/tests/authoring.spec.ts
  - packages/preset/agent-presets/tests/user-root.spec.ts
  - apps/cli/config/agent-presets/standard/preset.yml
  - apps/cli/config/agent-presets/minimal/preset.yml
  - apps/cli/config/agent-presets/code/preset.yml
  - apps/cli/config/agent-presets/cordis/preset.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/src/profile-boot.ts
  - apps/cli/src/dump-config.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/headless/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/core/session/src/index.ts
  - packages/util/home-paths/src/index.ts
symbols:
  - AgentPresets
  - COMPOSITION_FILE
  - METADATA_FILE
  - discoverPresets
  - mountPreset
  - resolveSessionPreset
related:
  - ref.presets
  - spine.composition-boot
evidence: explicit
status: verified
updated: 47f943859b
---

> **agent preset** 是 DSH 这条 Cordis 组合链 `profile → bundle → preset` 的**每会话**一层：一个目录（目录名 = id）带着必有的 `agent.cordis.yml`，可选 `preset.yml` 只当 picker 显示元数据。roster 包 `@deepseek-ai/dsh-agent-presets` 发现、standing mount、并把 Agent 用 `bindScopeParent` join 上去。preset 决定这个 Agent 看见的 tools / persona / isolate；webserver、persistence、sandbox、subagent backends 留在 **host 面**。成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml` 的行，不认仓库里有没有对应 package。模型看见的 preset 必须写进 session log（`model-visible ⟺ logged`）。

## 能回答的问题

- 一个目录怎样才算 preset？id 规则是什么？`preset.yml` 能不能让一个包进入默认产品？
- `dsh web` 的 roster 从哪几个 root 扫？谁把 shipped `apps/cli/config/agent-presets/` 补成 `trust: 'system'`？headless 为什么没有 shipped preset？
- `AgentPresets.defaultId` 读 settings 还是 Config？web 的工程默认为什么是 `standard`？
- `mount` / `composeFrom` / `recompose` 各在什么窗口调用？服务行漏到 root realm 会怎样？
- 会话 header 的 `agentPreset` 和 `agent-preset/selected` 谁赢？resume / fork / 列表标签该读哪条？
- 用户能从缝里塞 composition 文本吗？shipped（`system`）根能删吗？

## 是什么

DSH 不是「又一个 coding agent」。进程先把 **host 面** settle（`dsh web` 默认装本地 Web GUI：webserver / persistence / sandbox / subagent backends / jobs·goals·skills **registry** / token-meter），再在 Agent factory 的 `setup` 里把 **agent-preset 面**（tools / persona / isolate）join 到这个会话。capability seam 仍是 Definition / Provider / Consumer：preset 换走的是模型可见的 Consumer 行；host 上的 Provider 与 registry 不被 preset 复制一份。本仓没有 shipped TUI 包；help 例子里的 `tui` 只是自定义 profile 名。

一个 preset = 一个目录：

- 目录名是 id，必须匹配 `PRESET_ID = /^[a-z0-9][a-z0-9-]*$/`。这是路径 containment，不是风格：`..`、分隔符或绝对名会把 composition 写到部署授权的 root 外面。 [E: packages/preset/agent-presets/src/preset.ts:18]
- 必有 `COMPOSITION_FILE = 'agent.cordis.yml'`，否则目录仍占住这个 id，但 roster 标 `broken`，所有 mount 路径拒绝。 [E: packages/preset/agent-presets/src/discovery.ts:26] [E: packages/preset/agent-presets/src/discovery.ts:155]
- 可选 `METADATA_FILE = 'preset.yml'`，只读 `name` / `description` / `order`。读失败降级为空元数据，composition 照样可 mount。`id` 与 `trust` 不写在这个文件里：`id` 是目录名，`trust` 继承发现它的 root。 [E: packages/preset/agent-presets/src/metadata.ts:25] [E: packages/preset/agent-presets/src/discovery.ts:160]

`preset.yml` **不是**成员资格。某工具在不在默认产品里，只看那四个 shipped `agent.cordis.yml` 的行（含 `disabled:`）。仓库 / `apps/cli/package.json` dependencies 里有这个包，不构成「产品装着它」。

`@deepseek-ai/dsh-agent-presets` 导出 `AgentPresets` 服务（`ctx.agentPresets`）。发现不缓存：每次 `list()` / `resolve()` 都重扫 roots，进程运行中新 copy 的 preset 立刻可见。 [E: packages/preset/agent-presets/src/index.ts:200] [E: packages/preset/agent-presets/package.json:2]

## 入口

用户或进程碰到 roster 的路径：

1. **web profile（默认产品）**。`packages/bundle/web-app/cordis.patch.yml` 把 base 上的模型可见工具行 `disabled: true`（例如 `tool-bash`），再 `insert` `id: agent-presets`、`name: '@deepseek-ai/dsh-agent-presets'`、`config.default: standard`。 [E: packages/bundle/web-app/cordis.patch.yml:293] [E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/web-app/cordis.patch.yml:424]
2. **CLI 补 shipped root**。`apps/cli/src/profile-boot.ts` 的文件内函数 `composeProfile`（未 export）叠完 bundle → profile `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch` 之后，若行表里已有 `agent-presets`，再推一条 overlay：`roots: [{ path: SHIPPED_PRESET_ROOT, trust: 'system' }]`。`SHIPPED_PRESET_ROOT` 解析为这份安装里的 `apps/cli/config/agent-presets/`（源码与 `lib/` 布局都在 `src/` 的上一级 `config/`）。 [E: apps/cli/src/profile-boot.ts:35] [E: apps/cli/src/profile-boot.ts:159] [E: apps/cli/src/profile-boot.ts:164]
3. **用户 root**。`AgentPresets.Config.includeUserRoot` 默认 `true`，构造时把 `dshHomePath('.agent-presets')`（`USER_PRESET_DIR`）追加为 `trust: 'user'`。未设 `DSH_HOME` 时 home 是 `~/.dsh`（`DSH_HOME_DIR_NAME`），用户 preset 目录就是 `~/.dsh/.agent-presets`。 [E: packages/preset/agent-presets/src/index.ts:92] [E: packages/preset/agent-presets/src/index.ts:134] [E: packages/preset/agent-presets/src/discovery.ts:41] [E: packages/util/home-paths/src/index.ts:12] [E: packages/util/home-paths/src/index.ts:62]
4. **headless 不挂 roster**。`packages/bundle/headless/cordis.patch.yml` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，没有 `agent-presets`。`headless-runner` 的 `agents.create` `setup` 只装 `installModelSelection`，不调用 `mount`；模型可见工具留在 host 全局层（`dsh-base` 的工具行）。 [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/src/index.ts:111] [E: packages/bundle/headless/src/index.ts:117]
5. **Web 会话**。`composeAgent@packages/host/apiproxy/src/api-proxy.ts` 在 `ctx.agents.create` 之前 `presets.resolve`，把 id 写入 session header 的 `agentPreset`；真正的 `presets.mount(agentCtx, resolvedId)` 发生在 factory `setup`。 [E: packages/host/apiproxy/src/api-proxy.ts:1240] [E: packages/host/apiproxy/src/api-proxy.ts:1245] [E: packages/host/apiproxy/src/api-proxy.ts:1675]
6. **子代理**。`applyChildComposition` 调 `agentPresets.composeFrom(childCtx, parent.ctx)`，join 父进程已经 standing 的那一代，不按 id 重 resolve。 [E: packages/subagent/subagent/src/child-agent.ts:168]
7. **dump 看不到 launcher 补丁**。`runDumpConfig` 的 layers 只来自 `loaded.layers`（bundle 文件）以及非 `--dump-default-config` 时的 profile / home / `--patch` 文件；函数里没有 `SHIPPED_PRESET_ROOT` 那一刀。要对齐 boot 真树，必须读 `profile-boot.ts` 的 `rows.has('agent-presets')` overlay，不能只信 dump。 [E: apps/cli/src/dump-config.ts:32] [E: apps/cli/src/dump-config.ts:36] [I]

## 关键字段

### `AgentPresets.Config` 与发现

| 字段 | 类型 / 默认 | 含义 |
|---|---|---|
| `default` | `string`，required | 调用方不指名时 mount 的 id。缺省在 mount 时 fail loud（`UnknownPresetError`）。 [E: packages/preset/agent-presets/src/index.ts:87] |
| `roots[]` | `{ path, trust }[]`，默认 `[]` | 扫描顺序；更早的 root 赢重复 id。`scanRoot` 对 `path` 做 `expandHomePath`（`~`）。 [E: packages/preset/agent-presets/src/index.ts:88] [E: packages/preset/agent-presets/src/discovery.ts:140] [E: packages/preset/agent-presets/src/discovery.ts:181] |
| `roots[].trust` | `'system' \| 'user'`，默认 `'user'` | 写到每个被发现 preset 上。`system` 不可 `remove`。 [E: packages/preset/agent-presets/src/index.ts:90] |
| `includeUserRoot` | `boolean`，默认 `true` | 在所有配置 root **之后**追加 `$DSH_HOME/.agent-presets`（`trust: 'user'`）。`false` 则只扫 `roots`，且若没有 user root 则 `authorable === false`。 [E: packages/preset/agent-presets/src/index.ts:92] [E: packages/preset/agent-presets/tests/user-root.spec.ts:73] |
| settings `agent-presets.default` | 可选 string | 热更新覆盖 `config.default`。`defaultId` = `settings?.get().default ?? config.default`。改默认只影响**之后**创建的会话。 [E: packages/preset/agent-presets/src/index.ts:40] [E: packages/preset/agent-presets/src/index.ts:192] [E: packages/preset/agent-presets/tests/settings.spec.ts:71] |

`discoverPresets(roots)` 按 root 顺序 `scanRoot`：非目录或 id 不匹配 `PRESET_ID` 的孩子直接跳过；缺 `agent.cordis.yml` 或 YAML 不是 plugin 行列表则记 `broken` 仍占 id。排序：声明了 `order` 的在前，其余按 id。 [E: packages/preset/agent-presets/src/discovery.ts:150] [E: packages/preset/agent-presets/src/discovery.ts:177] [E: packages/preset/agent-presets/tests/discovery.spec.ts:118]

### 四个 shipped preset

成员资格 = 下列目录里的 `agent.cordis.yml`。`preset.yml` 只提供 picker 文案与排序。细节（逐 `id:`）在四张分页。

| id（目录名） | `preset.yml` `name` | `order` | 组合差异（一句话） |
|---|---|---|---|
| `standard` | 标准模式 [E: apps/cli/config/agent-presets/standard/preset.yml:1] | 1 [E: apps/cli/config/agent-presets/standard/preset.yml:3] | web 工程默认。完整编码面：`persona` / `agent-instructions` / 平台互斥 `tool-bash`·`tool-pwsh` / `tool-fs` / skills / goals / `planning`+`compaction`+`delegation` isolate / `tool-ask-user` / `tool-todo` / `tool-web`（`fetch: false`）。`tool-subagent-codex` / `tool-subagent-claude-code` 行在但 `disabled: true`。无 `tool-str-replace-editor`、无 `tool-bash-persistent`、无 `tool-cordis`、无 `tool-presentation`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:24] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:104] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:205] |
| `code` | PTC 模式 [E: apps/cli/config/agent-presets/code/preset.yml:1] | 2 [E: apps/cli/config/agent-presets/code/preset.yml:3] | 相对 `standard` 的 shipped 增量是末尾 `tool-presentation` / `@deepseek-ai/dsh-agent-tool-presentation` / `mode: code`。模型面对 `run_code` + SDK，standard 的工具行仍在 composition 里。 [E: apps/cli/config/agent-presets/code/agent.cordis.yml:259] |
| `minimal` | 极简模式 [E: apps/cli/config/agent-presets/minimal/preset.yml:1] | 3 [E: apps/cli/config/agent-presets/minimal/preset.yml:3] | `persona` `complete: true`、`includeRuntimeContext: false`；`persistent-shell` isolate `terminals`（`pty` / `terminal-bash` / `persistent-bash`）；`filesystem` isolate `fs`（`fs-local` 吃 `DSH_CWD`、`str-replace-editor`）。没有 compaction / skill / subagent / web / plan / todo / jobs。 [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:8] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:18] |
| `cordis` | 创造模式 [E: apps/cli/config/agent-presets/cordis/preset.yml:1] | 4 [E: apps/cli/config/agent-presets/cordis/preset.yml:3] | 不同 `persona` 行 [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:17]：HOST / AGENT PRESET 两平面 [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:25]、禁止改 shipped 目录 [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:27]、先 load `editing-cordis-compositions` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:29]。增量 `tool-cordis` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245]。`skill-filesystem` 的 `customSkillDirs` 指向本 preset 的 `skills/` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:258]。yml 头注释把 TRUST 写成 `cordis_mount` 求值模型 JS，该名只在注释里 [I]。当前可执行登记名是 `cordis_inspect_*` / `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine`，不是 `cordis_mount` [U]。 |

### 会话记录

| 位置 | 写什么 | 读法 |
|---|---|---|
| `SessionHeader.agentPreset` | 创建时 snapshot。`SessionStore.prepare` 从 `meta.agentPreset` 拷进 header；Web `composeAgent` 在 async `setup` 开始前就 resolve，所以 header 能拿到这个 id。 [E: packages/core/session/src/index.ts:886] | 没有后续 selection 时的答案 |
| `agent-preset/selected` 事件 | `{ agentPreset: string }`。空白窗口 `agentPresets.select` 在 `recompose` 成功后 `session.append`。 [E: packages/preset/agent-presets/src/session.ts:26] [E: packages/host/apiproxy/src/api-proxy.ts:3113] | 从事件尾往头扫，最后一次赢 |
| `resolveSessionPreset` | 最新 selection，否则 header，否则 `undefined`（无 roster 的部署）。resume / fork / 列表投影必须走它，禁止只信 header。 [E: packages/preset/agent-presets/src/session.ts:51] [E: packages/preset/agent-presets/tests/session.spec.ts:39] | 冷读 / 重建的唯一入口 |

## 装配与门控

**何时 init。** host 组合里必须先有 `agent-presets` 行（web 的 insert）。没有这行（headless 默认）时 `ctx.get('agentPresets') === undefined`，`composeAgent` 只装 model selection，每个会话共享 host 全局工具层。 [E: packages/host/apiproxy/src/api-proxy.ts:1232]

**standing mount，不是每会话一棵树。** `AgentPresets.mount(agentCtx, id?)` 要求 `agentCtx` 带 scope key，否则抛 unscoped。它 `resolveMountable`（unknown → `UnknownPresetError`；`broken` → `PresetMountError`），`ensureStanding` 对每个 preset id single-flight 一份 `{ agentPreset: id }` 的 `createScope`，再 `mountPreset(scope.ctx, preset)`，最后 `bindScopeParent(agentKey, standing.key)`。同一 preset 的多个 Agent 共享一份插件实例；session 状态仍由插件按 Session/Agent 自己 key。失败时删掉 pending、`scope.dispose()`，再把错误抛出。 [E: packages/preset/agent-presets/src/index.ts:236] [E: packages/preset/agent-presets/src/index.ts:286] [E: packages/preset/agent-presets/src/index.ts:514] [E: packages/preset/agent-presets/src/index.ts:528]

**必须在 factory `setup` 里 mount。** `setup` 在 Agent / Session 发布之前 await；拒绝则整次 `create` 回滚，不会留下半装好的会话。测试按这个窗口写：`setup: async (agentCtx) => void await ctx.agentPresets.mount(agentCtx, presetId)`。 [E: packages/preset/agent-presets/tests/mount.spec.ts:60] [E: packages/preset/agent-presets/tests/mount.spec.ts:237]

**isolate 门。** `mountPreset` 在树 settle 后跑两道审计：`inactiveRows`（enabled 行还在等一个永远不会来的 service）与 `leakedServices`（子树把实现写进 **root realm**）。泄漏抛 `PresetMountError`，文案要求服务坐进 `isolate` realm 或挪到 host composition；子树 `dispose` 后再抛。发布服务的 preset 行必须在 `isolate` 组里。只往 host `ctx.tools` 注册、自己不 `provide` 的 tool 行不必 realm。测试钉死 leaky fixture 被拒、isolated fixture 被接受。 [E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:379] [E: packages/preset/agent-presets/tests/mount.spec.ts:257]

**`composeFrom`。** 同步、不读 roster、不 mount。父没有 standing mount 时返回 `undefined`（rosterless 部署：孩子已经从 host 全局层看见工具）。子代理必须走这条，避免父启动后有人改了 `agent.cordis.yml` 导致孩子拿到另一代。 [E: packages/preset/agent-presets/src/index.ts:321] [E: packages/preset/agent-presets/src/index.ts:322] [E: packages/preset/agent-presets/tests/mount.spec.ts:185]

**`recompose`。** 先 ensure 新 standing，再通过 `mount` 时存下的 `ScopeParentBinding.rebind`。方法自己不读 session 历史；调用方（api-proxy `agentPresets.select`）必须先确认 `sessionBlank`，否则回 `agent-preset-locked`。换 preset 只允许空白会话：已开始的对话历史是在旧工具集下产生的。 [E: packages/preset/agent-presets/src/index.ts:458] [E: packages/host/apiproxy/src/api-proxy.ts:3102]

**无 roster 的 Agent。** `agent/created` 上的检查只 `logger.warn`，不否决发布——在 roster 外组 Agent 是合法的（headless、ACP、SDK、以及 `recompose` 绑到光 Agent 的瞬间）。带 roster 的部署若 Agent 在 `system-prompt/assemble` 时仍未 join，`agent-presets-invariant` 才会 `fail`。 [E: packages/preset/agent-presets/src/index.ts:166] [E: packages/preset/agent-presets/src/invariant.ts:65]

**generation / 文件戳。** standing 成功后按 composition 文件的 `mtimeMs`+`size` 判断是否过期；戳相同或 statting 失败则继续用当前代。文件改了就把 stale pending 从 map 删掉再 `ensureStanding`，**之后**的 session 开下一代；已经 join 的会话继续跑旧代。这条刷新路径只 `delete` 指针，没有 `scope.dispose()`。 [E: packages/preset/agent-presets/src/index.ts:501] [E: packages/preset/agent-presets/src/index.ts:510] [E: packages/preset/agent-presets/src/index.ts:559]

**authoring 门。** 唯一写入是 `copy(from, id, name?)`：按 id 整目录 `cp`（composition + metadata + skills + assets，dereference symlink），不能从缝里塞 composition 文本。拷贝改写 `preset.yml`：可带新 `name`，保留 source `description`，**丢掉** source 的 `name` / `order`。`PRESET_ID` 不匹配 → `InvalidPresetIdError`；roster 或磁盘已占 id → `PresetExistsError`；没有 `trust: 'user'` root → `PresetNotWritableError`。`remove` 拒绝 `trust !== 'user'`（「it ships with the deployment」）；刚删掉的 id 若正是 settings 默认，会 `unset` 那个 default，露出 `config.default`。 [E: packages/preset/agent-presets/src/index.ts:380] [E: packages/preset/agent-presets/src/authoring.ts:186] [E: packages/preset/agent-presets/tests/authoring.spec.ts:183]

**preset 文件只进不出。** `PresetTree.write()` 是空实现。继承 Include 的 `write` 会在行自处置 / 会话结束时把 shipped `agent.cordis.yml` 截成 `[]`。 [E: packages/preset/agent-presets/src/mount.ts:110]

## 跨包关系

- [spine.composition-boot](../../spine/composition-boot.md) — 空 `cordis.yml` 上 `profile → bundle → launcher overlay` 的叠层；本页只展开 overlay 里那条 shipped preset root，以及 host 面 / agent-preset 面切开之后的 join。
- [ref.presets](../../reference/presets.md) — preset 元数据与 shipped 对照的 catalog 面；本页是发现 / mount / 会话记录的控制流。
- [surface.profiles.web](../profiles/web.md) — web bundle 插入 `agent-presets` 并把 base 模型可见工具行 disable；host 仍留 sandbox / approval / registry。
- [surface.profiles.headless](../profiles/headless.md) — 不插 roster；一次任务一个进程，工具走 `dsh-base` 全局层。
- [surface.presets.standard](standard.md) / [surface.presets.code](code.md) / [surface.presets.minimal](minimal.md) / [surface.presets.cordis](cordis.md) — 四个 shipped `agent.cordis.yml` 的逐 `id:` 成员表。
- `@deepseek-ai/dsh-host-apiproxy` — Web 的 `composeAgent` / `agentPresets.select` / list / copy / remove RPC；header 写入与 `agent-preset/selected` 的产品调用方。
- `@deepseek-ai/dsh-subagent` — `childSessionMeta` 把父的 `composedPreset` 写进孩子 header；`applyChildComposition` 调 `composeFrom`。
- `@deepseek-ai/dsh-session` — `SessionHeader.agentPreset` 与 `SessionEventMap['agent-preset/selected']`；`resolveSessionPreset` 是重建入口。
- `@deepseek-ai/dsh-agent` — factory `setup` 是唯一受支持的 mount 调用点：未发布前失败则整次 create 回滚。
- `@deepseek-ai/dsh-scope` — `createScope({ agentPreset })` + `bindScopeParent` 是 standing mount 与 Agent 之间的唯一 join / re-link。

## Sources

- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/discovery.ts
- packages/preset/agent-presets/src/mount.ts
- packages/preset/agent-presets/src/preset.ts
- packages/preset/agent-presets/src/metadata.ts
- packages/preset/agent-presets/src/session.ts
- packages/preset/agent-presets/src/authoring.ts
- packages/preset/agent-presets/src/invariant.ts
- packages/preset/agent-presets/package.json
- packages/preset/agent-presets/tests/discovery.spec.ts
- packages/preset/agent-presets/tests/mount.spec.ts
- packages/preset/agent-presets/tests/session.spec.ts
- packages/preset/agent-presets/tests/settings.spec.ts
- packages/preset/agent-presets/tests/authoring.spec.ts
- packages/preset/agent-presets/tests/user-root.spec.ts
- apps/cli/config/agent-presets/standard/preset.yml
- apps/cli/config/agent-presets/minimal/preset.yml
- apps/cli/config/agent-presets/code/preset.yml
- apps/cli/config/agent-presets/cordis/preset.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/src/profile-boot.ts
- apps/cli/src/dump-config.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/headless/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/core/session/src/index.ts
- packages/util/home-paths/src/index.ts

## 相关

- [ref.presets](../../reference/presets.md) — shipped / 用户 preset 的 catalog 键与对照。
- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → preset` 启动叠层与 host / agent-preset 切开。

邻居（不在本节点 `related` 里，但检索会一起问）：

- [surface.presets.standard](standard.md)
- [surface.presets.code](code.md)
- [surface.presets.minimal](minimal.md)
- [surface.presets.cordis](cordis.md)
- [surface.profiles.web](../profiles/web.md)
- [surface.profiles.headless](../profiles/headless.md)
