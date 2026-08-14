---
id: surface.skills.system
title: skills 系统
kind: surface
tier: T1
pkg: context
source:
  - packages/skill/skill/src/index.ts
  - packages/skill/skill/package.json
  - packages/skill/skill/tests/skill.spec.ts
  - packages/skill/skill-filesystem/src/index.ts
  - packages/skill/skill-filesystem/package.json
  - packages/skill/skill-filesystem/tests/skill-filesystem.spec.ts
  - packages/skill/tool-skill/src/index.ts
  - packages/skill/tool-skill/package.json
  - packages/skill/skill-badge/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/util/home-paths/src/index.ts
  - apps/cli/src/args.ts
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - ctx.skills
  - SkillRegistry
  - isSkillName
  - SkillSource
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.skills` 是 **host 面** skill 注册表（`SkillRegistry`，服务名 `skills`）：Provider 按调用方 scope 写入 global 或 preset standing 层；读路径把 global 与 viewing scope 链合并，**近层同名直接覆盖**，`rank` 只在同一层内决胜。默认产品路径 `dsh web` 把本地根发现和模型可见 loader 交给每会话 preset，不把磁盘扫描做成 Claude / Pi 的 `~/.agents` 单表。

## 能回答的问题

- `ctx.skills` 为什么必须留在 host？`dsh-web-app` disable 的是哪两行、留下的是哪一行？
- `skill-filesystem` 扫描哪些根？`<project>/.dsh/skills` 与 `.agents/skills`、`$DSH_HOME` 与 `~/.agents` 各是哪一层 `SkillSource`？
- 同名技能谁赢：层还是 `rank`？`BUNDLED_SKILL_RANK` 的数值是多少？
- `standard` / `code` / `cordis` 为什么能重挂 filesystem 却不必 `isolate`？`minimal` 还能不能 `list` 到全局层？
- `skill-badge` 是不是产品默认开着？模型看见的工具名是不是 `skill`？

## 是什么

DeepSeek Harness 是 Cordis **组合运行时**（`profile → bundle → agent preset`），不是「再扫一遍 Claude / Pi 技能目录」的单进程表。技能能力缝拆成三包：

| 角色 | 包 | Cordis 插件名 | 做什么 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-skill` | yml `id: skill`（default export `SkillRegistry`） | 进程级服务 `ctx.skills`：分层合并、`list` / `snapshot` / `get`、`registerProvider` / `register` [E: packages/skill/skill/package.json:2] [E: packages/skill/skill/src/index.ts:375] [E: packages/skill/skill/src/index.ts:868] |
| Provider | `@deepseek-ai/dsh-skill-filesystem` | `export const name = 'skill-filesystem'` | 扫本地根、解析 `SKILL.md` / 扁平 `.md`，`ctx.skills.registerProvider` [E: packages/skill/skill-filesystem/package.json:2] [E: packages/skill/skill-filesystem/src/index.ts:45] [E: packages/skill/skill-filesystem/src/index.ts:132] |
| Consumer | `@deepseek-ai/dsh-tool-skill` | `export const name = 'tool-skill'` | 向模型注册 wire 名 `'skill'`，并在 `agent/pre-step` 发 catalog [E: packages/skill/tool-skill/package.json:2] [E: packages/skill/tool-skill/src/index.ts:24] [E: packages/skill/tool-skill/src/index.ts:82] [E: packages/skill/tool-skill/src/index.ts:213] |

本页写 **扫描根与注册面**。模型可见 `skill` 工具的 schema、catalog `user/message`、`execute` 拒答形状以 [surface.tools.skill](../tools/skill.md) 为权威。层合并与 watch 的子系统走读在 [subsys.context.skills](../../subsystems/context/skills.md)。

默认安装路径是本地 Web GUI：`dsh web` 是 `--profile web` 的 alias。[E: apps/cli/src/args.ts:156] 本仓没有 shipped TUI。

**产品主目录不是 `~/.agents`。** `$DSH_HOME`（非空、非纯空白）否则 `~/.dsh`。[E: packages/util/home-paths/src/index.ts:88] [E: packages/util/home-paths/src/index.ts:89] `~/.agents` 只是 filesystem Provider 的另一条兼容根，见 [surface.misc.home](../misc/home.md)。

## 入口

| 入口 | 行为 |
|---|---|
| host 行 `id: skill` | `dsh-base` 插入 `@deepseek-ai/dsh-skill`。`SkillRegistry` 构造 `super(ctx, 'skills')`，键是 `ctx.skills`。这是进程级服务，不是 preset isolate 里的私有实例。[E: packages/bundle/base/cordis.patch.yml:237] [E: packages/bundle/base/cordis.patch.yml:238] [E: packages/skill/skill/src/index.ts:375] |
| `ctx.skills.registerProvider` / `register` | 写入调用方那一层：无 scope 标签进 global，agent-preset standing 进该 scope 层。[I] 本包只把写入交给 `this.layers.effect`。[E: packages/skill/skill/src/index.ts:412] [E: packages/skill/skill/src/index.ts:453] |
| `skill-filesystem.apply` | `inject = ['skills']`，只 `registerProvider`，不 `provide` 新服务。[E: packages/skill/skill-filesystem/src/index.ts:46] [E: packages/skill/skill-filesystem/src/index.ts:132] |
| 磁盘根 | 默认打开 `includeDefaultRoots` 时扫项目 `.dsh/skills` / `.agents/skills`、user `$DSH_HOME/skills` / `agentsHome/skills`，中间夹 `customSkillDirs`，最后可选 bundled。[E: packages/skill/skill-filesystem/src/index.ts:246] [E: packages/skill/skill-filesystem/src/index.ts:250] [E: packages/skill/skill-filesystem/src/index.ts:253] |
| 模型 | wire 名字面量 `'skill'`。字段表不在本页，见 [surface.tools.skill](../tools/skill.md)。[E: packages/skill/tool-skill/src/index.ts:82] |
| 用户 | 在扫描根下放 `<name>/SKILL.md` 或扁平 `<name>.md`（YAML frontmatter 要 `name` + `description`）。[E: packages/skill/skill-filesystem/src/index.ts:724] [E: packages/skill/skill-filesystem/src/index.ts:810] |

读路径：`list` / `snapshot` / `get` 吃 `SkillViewOptions`。`scope` 选层；省略 `scope` 只读 global 层。[E: packages/skill/skill/src/index.ts:119] `list` 是 `snapshot` 的 `skills` 投影，不过滤 invocation。[E: packages/skill/skill/src/index.ts:472] `cwd` 传给 Provider 选项目根，也进 collect cache key。[E: packages/skill/skill/src/index.ts:501] [E: packages/skill/skill/src/index.ts:528]

## 关键字段

### 名字与来源桶

| 符号 | 要点 |
|---|---|
| `isSkillName` | `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`。`Bad_Name`、空串、下划线非法。`get` 对非法名直接 `undefined`，不抛。[E: packages/skill/skill/src/index.ts:20] [E: packages/skill/skill/src/index.ts:34] [E: packages/skill/skill/src/index.ts:502] |
| `SkillSource` | `'project-dsh' \| 'project-agents' \| 'runtime' \| 'user-dsh' \| 'user-agents' \| 'custom' \| 'bundled'`，外加开放 `string`。这是 prompt-visible 来源桶，**本身不是**优先级。[E: packages/skill/skill/src/index.ts:39] |
| `'runtime'` 保留 | `registerProvider` 不得使用这个 provider 名。`register()` 默认 provider 就是 `'runtime'`。[E: packages/skill/skill/src/index.ts:23] [E: packages/skill/skill/src/index.ts:407] [E: packages/skill/skill/src/index.ts:451] |

### 层内 `rank`（越小越赢）

同层先比 `rank`，再 `providerOrder`，再 `localOrder`。[E: packages/skill/skill/src/index.ts:807] [E: packages/skill/skill/src/index.ts:808] [E: packages/skill/skill/src/index.ts:809] [E: packages/skill/skill/src/index.ts:810]

| 来源 | 数值 | 谁写 |
|---|---:|---|
| `project-dsh` | `100` | filesystem [E: packages/skill/skill-filesystem/src/index.ts:36] |
| `project-agents` | `200` | filesystem [E: packages/skill/skill-filesystem/src/index.ts:37] |
| runtime `register()` | `250`（`RUNTIME_RANK`） | registry [E: packages/skill/skill/src/index.ts:24] [E: packages/skill/skill/src/index.ts:701] |
| `custom` | `300` | filesystem `customSkillDirs` [E: packages/skill/skill-filesystem/src/index.ts:38] |
| `user-dsh` | `400` | filesystem [E: packages/skill/skill-filesystem/src/index.ts:39] |
| `user-agents` | `500` | filesystem [E: packages/skill/skill-filesystem/src/index.ts:40] |
| `bundled` | `600`（`BUNDLED_SKILL_RANK`） | filesystem bundled 根与 `skill-badge` 共用 [E: packages/skill/skill/src/index.ts:27] [E: packages/skill/skill-filesystem/src/index.ts:258] |

**跨层不比 rank。** `collectFresh` 层序是 `[global, ...chainLayers(scope)]`（远祖在前、本 scope 在后），每一层赢家再 `merged.set(name, entry)`：近层同名**无论 rank 多差**都替换远层。[E: packages/skill/skill/src/index.ts:557] [E: packages/skill/skill/src/index.ts:563] 单测：global rank `10` 负于 preset rank `900`，带 scope 的 `list` 仍拿 preset；无 scope 的 `list()` 看不见 preset 层。[E: packages/skill/skill/tests/skill.spec.ts:1141] [E: packages/skill/skill/tests/skill.spec.ts:1166] [E: packages/skill/skill/tests/skill.spec.ts:1168]

`list()` 返回的摘要按名字码点排序，不按 rank。[E: packages/skill/skill/src/index.ts:487]

### filesystem 扫描根（`SkillSource` 各一层）

`FileSystemSkillProvider.roots(cwd)`，默认 `includeDefaultRoots === true`：

| 顺序 | 路径 | `SkillSource` | rank | 备注 |
|---|---|---|---:|---|
| 1 | `<project>/.dsh/skills` | `project-dsh` | 100 | `cwd` 有值才压入。`project` = 向上找第一个 `.git`，找不到就用 `cwd`。[E: packages/skill/skill-filesystem/src/index.ts:246] [E: packages/skill/skill-filesystem/src/index.ts:940] [E: packages/skill/skill-filesystem/src/index.ts:944] |
| 2 | `<project>/.agents/skills` | `project-agents` | 200 | 与 `.dsh/skills` 并列的项目兼容根，不是产品主目录。[E: packages/skill/skill-filesystem/src/index.ts:247] |
| 3 | `customSkillDirs` 各项 | `custom` | 300 | schema 默认 `[]`。[E: packages/skill/skill-filesystem/src/index.ts:250] [E: packages/skill/skill-filesystem/src/index.ts:81] |
| 4 | `$DSH_HOME/skills`（否则 `~/.dsh/skills`） | `user-dsh` | 400 | `dshHome = resolveDshHome(config.dshHome)`。`skipSystem: true`，跳过名为 `.system` 的条目。[E: packages/skill/skill-filesystem/src/index.ts:163] [E: packages/skill/skill-filesystem/src/index.ts:253] [E: packages/skill/skill-filesystem/src/index.ts:723] |
| 5 | `$DSH_AGENTS_HOME/skills`（否则 `~/.agents/skills`） | `user-agents` | 500 | `agentsHome`，可被 Config `agentsHome` 覆盖。**不是** `~/.dsh` 的别名。[E: packages/skill/skill-filesystem/src/index.ts:164] [E: packages/skill/skill-filesystem/src/index.ts:254] |
| 6 | `bundledSkillDir` 或 `$DSH_BUNDLED_SKILL_DIR` | `bundled` | 600 | `trustedHost: true`。`includeDefaultRoots: false` 时不读环境 bundled 根。[E: packages/skill/skill-filesystem/src/index.ts:172] [E: packages/skill/skill-filesystem/src/index.ts:258] |

同层五个根都放同名 `same` 时，catalog 赢家 `source === 'project-dsh'`；`user-dsh` 的 `.system/` 不进表；无 `.git` 时 project 根回退到 `cwd`。[E: packages/skill/skill-filesystem/tests/skill-filesystem.spec.ts:198] [E: packages/skill/skill-filesystem/tests/skill-filesystem.spec.ts:199] [E: packages/skill/skill-filesystem/tests/skill-filesystem.spec.ts:205]

同一层内：project 压过 runtime，runtime 压过 custom / user（`RUNTIME_RANK = 250` 夹在 `200` 与 `300` 之间）。[E: packages/skill/skill-filesystem/tests/skill-filesystem.spec.ts:232] [E: packages/skill/skill-filesystem/tests/skill-filesystem.spec.ts:233]

发现形状：目录条目 → `<dir>/SKILL.md`；根下 `*.md` 文件 → 扁平技能（`resourceBase.directory` 是该根）。缺 frontmatter、非法 YAML、缺 `name`/`description`、`!isSkillName`、旧键 `disableModelInvocation` / `modelInvocable` / `userInvocable`：该文件 warn 后跳过，不拖垮兄弟。[E: packages/skill/skill-filesystem/src/index.ts:724] [E: packages/skill/skill-filesystem/src/index.ts:816] [E: packages/skill/skill-filesystem/src/index.ts:993]

filesystem `Config` 产品默认：`providerName` 默认 `'filesystem'`（构造回退同一字面量）、`includeDefaultRoots` 默认 `true`、`customSkillDirs` 默认 `[]`、`watch` 默认 `true`。[E: packages/skill/skill-filesystem/src/index.ts:77] [E: packages/skill/skill-filesystem/src/index.ts:161] [E: packages/skill/skill-filesystem/src/index.ts:78] [E: packages/skill/skill-filesystem/src/index.ts:81] [E: packages/skill/skill-filesystem/src/index.ts:82]

`list()` **不过滤** invocation。[E: packages/skill/skill/src/index.ts:472] `disable-model-invocation: true` 的 `user-only-skill` 仍出现在 `ctx.skills.list` 里。[E: packages/skill/skill-filesystem/tests/skill-filesystem.spec.ts:273] [E: packages/skill/skill-filesystem/tests/skill-filesystem.spec.ts:278] 模型 catalog 与人手势各自在 Consumer 边界滤。

## 装配与门控

成员资格只认 composition 行，不以 package 存在为准。默认产品树是 `dsh web`（`--profile web`），叠 `dsh-base` 再叠 `dsh-web-app`。[E: apps/cli/src/args.ts:156]

### host：`dsh-base` 四行

同一份 patch 连续插入：

| `id` | 包 | 默认 |
|---|---|---|
| `skill` | `@deepseek-ai/dsh-skill` | 开 [E: packages/bundle/base/cordis.patch.yml:237] |
| `skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | 开 [E: packages/bundle/base/cordis.patch.yml:240] |
| `skill-badge` | `@deepseek-ai/dsh-skill-badge` | **`disabled: true`** [E: packages/bundle/base/cordis.patch.yml:243] [E: packages/bundle/base/cordis.patch.yml:245] |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | 开 [E: packages/bundle/base/cordis.patch.yml:247] |

`skill-badge` 是 bundled Provider：登记 `dsh-badge`，`source: 'bundled'`、`rank: BUNDLED_SKILL_RANK`。[E: packages/skill/skill-badge/src/index.ts:17] [E: packages/skill/skill-badge/src/index.ts:26] [E: packages/skill/skill-badge/src/index.ts:59] [E: packages/skill/skill-badge/src/index.ts:30] [E: packages/skill/skill-badge/src/index.ts:32] 产品树默认关掉。不要把它写成 Web 必开，也不要和 client `ui-skill` 混成一个包。e2e 为了测全局层才在测试 overlay 里写 `{ id: 'skill-badge', disabled: false }`。[E: apps/cli/tests/web-agent-presets.e2e.ts:84]

### web-app：关掉哪两行、留下哪一行

`dsh-web-app` overlay **只**写：

```yaml
- id: skill-filesystem
  disabled: true

- id: tool-skill
  disabled: true
```

[E: packages/bundle/web-app/cordis.patch.yml:330] [E: packages/bundle/web-app/cordis.patch.yml:331] [E: packages/bundle/web-app/cordis.patch.yml:333] [E: packages/bundle/web-app/cordis.patch.yml:334]

同一文件**没有** `id: skill` 的 disable。[I] host 仍解析 `ctx.skills`；本地根发现和模型 loader 改由 preset 往 **该 standing scope 层** 投递。

### 四个 shipped preset

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。

| preset | 重挂 `skill-filesystem`？ | 重挂 `tool-skill`？ | `isolate` | 说明 |
|---|---|---|---|---|
| `minimal` | **否** | **否** | — | composition 没有这两行。[I] e2e：`list({ scope: agent })` 仍能看见 host 全局层（测试 overlay 打开的 `dsh-badge`），工具表只有 `bash` / `str_replace_editor`。[E: apps/cli/tests/web-agent-presets.e2e.ts:396] [E: apps/cli/tests/web-agent-presets.e2e.ts:397] |
| `standard` | 是 | 是 | **无** | 顶层 `- id: skill-filesystem` / `- id: tool-skill`，不在 `planning` / `compaction` / `delegation` 组里。无 `customSkillDirs`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:83] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:86] |
| `code` | 是 | 是 | **无** | 与 `standard` 同一对行。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:90] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:93] |
| `cordis` | 是 | 是 | **无** | filesystem 另配 `customSkillDirs`（`!!js` 解析本 preset 的 `skills/`），所以该 standing 层会多出 preset-local 名；无 scope 的 `list()` 看不到它们。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:255] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:258] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:259] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:261] |

不必 `isolate`：`skill-filesystem.apply` 只往已有 `ctx.skills` 登记 Provider，不 `provide` 一份新的 process-global 服务。preset 需要**私有服务实例**时才写 `isolate`。[E: packages/skill/skill-filesystem/src/index.ts:132]

web e2e 钉死分层：临时工程写 `<proj>/.dsh/skills/project-proof/SKILL.md`，mount `standard` 后，无 scope 的 `list({ cwd })` **只有**测试打开的全局 `dsh-badge`；带 `scope: agent` 才同时有 `dsh-badge` 与 `project-proof`。[E: apps/cli/tests/web-agent-presets.e2e.ts:364] [E: apps/cli/tests/web-agent-presets.e2e.ts:369] [E: apps/cli/tests/web-agent-presets.e2e.ts:370]

`minimal` 把「看不看得见全局层」和「能不能调 `skill`」拆开：registry 可读，loader 不装。产品树上 `skill-badge` 默认关，出厂 `minimal` 的全局层经常是空的；「能 list」不等于「开箱就有 `dsh-badge`」。

### headless 不是默认树

`dsh-headless` 只 overlay persona / HMR / tools mode，再 insert `code-runtime` / startup / runner，**没有** disable `skill-filesystem` 或 `tool-skill`，也没有 `agent-presets`。[E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:31] [I] headless 路径上 filesystem 留在 host 全局层。这不是 `dsh web`。

## 跨包关系

| 节点 | 一句摘要 |
|---|---|
| [surface.tools.skill](../tools/skill.md) | 模型可见 loader：wire 名 `skill`、单字段 `name`、catalog `source.kind: 'skill-catalog'`。本页不写 schema。 |
| [subsys.context.skills](../../subsystems/context/skills.md) | `ScopedLayers` 合并、watch / `fs/observed`、`skills/change` emit、seam 三角。 |
| [surface.misc.home](../misc/home.md) | `$DSH_HOME` 否则 `~/.dsh`。`~/.agents` 不是产品主目录。 |
| [surface.presets.standard](../presets/standard.md) | web 默认 preset：顶层重挂 filesystem + `tool-skill`。 |
| [spine.context-and-compaction](../../spine/context-and-compaction.md) | 上下文管道里 skill catalog 以外的装配。 |

换 filesystem 实现只换「根从哪来、正文怎么读」。换 Consumer 不能绕开 `isSkillName` 与层合并。preset 只往已有 `ctx.skills` 登记，不得再 publish 一份 `skills` 服务。

## Sources

- packages/skill/skill/src/index.ts
- packages/skill/skill/package.json
- packages/skill/skill/tests/skill.spec.ts
- packages/skill/skill-filesystem/src/index.ts
- packages/skill/skill-filesystem/package.json
- packages/skill/skill-filesystem/tests/skill-filesystem.spec.ts
- packages/skill/tool-skill/src/index.ts
- packages/skill/tool-skill/package.json
- packages/skill/skill-badge/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/util/home-paths/src/index.ts
- apps/cli/src/args.ts
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [surface.tools.skill](../tools/skill.md)（`surface.tools.skill`）— 模型可见 `skill` 工具与 catalog 消息。
- [surface.misc.home](../misc/home.md)（`surface.misc.home`）— `$DSH_HOME` / `~/.dsh`，以及「那不是 `~/.agents`」。
- [surface.presets.standard](../presets/standard.md)（`surface.presets.standard`）— web 默认 preset 的 skill 两行。
- [subsys.context.skills](../../subsystems/context/skills.md)（`subsys.context.skills`）— 注册表分层与 filesystem 子系统。
- [spine.context-and-compaction](../../spine/context-and-compaction.md)（`spine.context-and-compaction`）— 上下文装配总览。
