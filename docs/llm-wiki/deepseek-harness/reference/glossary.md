---
id: ref.glossary
title: 术语表
kind: reference
tier: T3
pkg: cross
source:
  - packages/core/session/src/types.ts
  - packages/session/session-format-catalog/src/generated.ts
  - packages/util/http-proxy/src/index.ts
  - packages/client/file-upload/src/index.ts
  - packages/core/session/src/surface.ts
  - packages/core/session/src/index.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent/src/index.ts
  - packages/core/scope/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/src/ptc.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/session.ts
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/persona/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/fs/tool-present/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/util/home-paths/src/index.ts
  - packages/fs/fs/src/index.ts
  - packages/shell/shell/src/index.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/shell/tool-pwsh-persistent/src/index.ts
  - packages/skill/skill-filesystem/src/index.ts
  - packages/workflow/tool-ralph/src/index.ts
  - packages/goal/goal/src/types.ts
  - packages/goal/goal/src/domain.ts
  - packages/goal/goal/src/index.ts
  - packages/goal/command-goal/src/index.ts
  - packages/interaction/commands/src/index.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/subagent/subagent-spawn-in-process/src/index.ts
  - packages/subagent/subagent-fork-in-process/src/index.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/experimental/agent-team/src/index.ts
  - packages/webhook/webhook/src/index.ts
  - packages/webhook/webhook-github/src/index.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/service.ts
  - apps/cli/src/args.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-minimal/package.json
symbols:
  - seam
  - Definition
  - Provider
  - Consumer
  - profile
  - bundle
  - preset
  - isolate
  - scope
  - ScopeKey
  - turn
  - step
  - round
  - goal
  - deriveMessages
  - surfaceOp
  - DSH_HOME
  - run_code
  - PTC
  - present
  - desktop
  - deepseek-flash
  - personaPrefix
  - ralph
  - subagent
  - subagent_fork
  - agentTeams
  - webhookRuntime
related:
  - spine.overview
  - spine.capability-seams
  - ref.package-index
  - spine.composition-boot
  - spine.turn-and-step
  - spine.session-log
  - ref.presets
  - ref.tools-catalog
  - ref.capability-seams
  - ref.env-vars
  - subsys.core.scope
  - subsys.util.home-paths
  - surface.presets.code
  - subsys.core.code-mode
evidence: explicit
status: verified
updated: c291e7961a
---

> DSH 词表钉在 **Cordis 组合运行时** 上：`profile → bundle → agent preset`，capability **seam** = Definition / Provider / Consumer，模型下一轮能看见的东西必须能从 session log 重建（**model-visible ⟺ logged**）。本页一行一词，落到源码行为；官方 `docs/glossary.md` 只当查漏，不当证据。

## 能回答的问题

- seam / Definition / Provider / Consumer 各指什么？和 host 面、agent-preset 面怎么切？
- profile、bundle、agent preset、isolate 各自管哪一层？shipped profile / bundle / preset 各有哪些？`tui` / `desktop` 是不是 shipped CLI profile？
- scope / scope key / shadowing / lineage 和 turn / step / round / goal 怎么分？
- human command 与模型可见 tool 差在哪？Ralph loop 是不是 goal？PTC `run_code` 是什么？
- `deriveMessages` / `surfaceOp`、waterfall 的 `next()`、`session/flush` 各约束什么？
- `$DSH_HOME`、`~/.dsh`、`.dsh/skills`、`.agents/skills`、两个 `bash`、两个 `pwsh`、`subagent` / `subagent_fork`、`ctx.agentTeams`、`ctx.webhookRuntime` 分别是什么？

## 范围与 ground truth

本页是跨层 **reference** 词表，不是工具字段表、也不是 preset 全量对照。权威落点是 `deepseek-harness/` 里的 `.ts` / `cordis.patch.yml` / `agent.cordis.yml` / `package.json`。官方 `docs/glossary.md`、`docs/architecture.md`、`AGENTS.md` 只用来查漏：漏了的词按源码补；和源码打架时跟源码。禁止把这三份 md 标成 `[E]`。

组合真树认 `packages/boot/app-boot` 的 `PROFILE_TEMPLATES` + `packages/bundle/{base,web-app,headless,sdk-app,sdk-minimal,acp-app}` 的 `dsh.bundle.patch`。preset 成员资格只认 `packages/preset/agent-presets/presets/{minimal,standard,ptc,cordis}/agent.cordis.yml`。走读组合流看 [spine.composition-boot](../spine/composition-boot.md)；seam 三角看 [spine.capability-seams](../spine/capability-seams.md)；turn/step 看 [spine.turn-and-step](../spine/turn-and-step.md)；日志投影看 [spine.session-log](../spine/session-log.md)。wiki 节点 id `surface.presets.code` 与 `subsys.core.code-mode` 是 PTC 的稳定别名。

官方 glossary 把 scope 写成「两层、flat、scoped 不向下 inherit」。源码里 `bindScopeParent` 把每个 Agent 的 key 挂到 preset 的 standing mount：事件沿链向上，registry view 沿链向下；`composeFrom` 把子 Agent 绑到**同一** standing key，子 Agent 看不见父 Agent 自己的 layer。本页按这条链写。

## 实例表

### 组合与 seam

| 术语 | 类型/所属层 | 默认/别名 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| seam | composition / capability | capability seam | 一条**可换**能力的完整三角：Definition 占 `ctx.<key>`，Provider 实现并 `provide`，Consumer `inject` 后调用。单独一个角色不叫 seam。 | 和「又一个内置工具」不同：换 Provider 带走执行世界，Consumer 写进 `ctx.tools` 的 wire 名可以不变。 | `packages/fs/fs/src/index.ts` · `packages/shell/shell/src/index.ts` |
| Definition | composition / Service | Service Definition | 声明 `interface Context { <key>: … }` 并 `super(ctx, '<key>')` 的抽象（或独占 registry）类，不是 TypeScript `interface`。`FileSystem` 占 `ctx.fs`，`ShellExecutor` 占 `ctx.shell`。 [E: packages/fs/fs/src/index.ts:88] [E: packages/shell/shell/src/index.ts:66] | 和 Provider 分开：定义包只定词汇与 `ctx` 键，不带一种后端。 | `packages/fs/fs/src/index.ts:88` · `vendor/cordis/src/service.ts:11` |
| Provider | composition / Service | Service Provider | 继承 Definition、实现抽象方法、作为插件 load 的那一个实现。同名服务在同一 realm 装两个会按 Cordis 重复注册炸掉。 | 和 Consumer 分开：Provider 换世界（本地盘 / sandbox / E2B），不登记模型可见 tool 名。 | `packages/shell/shell/src/index.ts:64` |
| Consumer | composition / tool-or-policy | — | `inject` 已提供的 `ctx.*` 再做事的包。典型是模型可见工具：`dsh-tool-bash` inject `shell`，`dsh-tool-bash-persistent` inject `terminals`。 [E: packages/shell/tool-bash/src/index.ts:30] [E: packages/shell/tool-bash-persistent/src/index.ts:432] | 和 Provider 分开：Consumer 决定模型看见的名字与 schema。 | `packages/shell/tool-bash/src/index.ts:30` |
| profile | composition / host | `--profile`；shipped 模板 `web` / `headless` / `sdk` / `sdk-minimal` / `acp` | `$DSH_HOME/profiles/<name>/` 下一份目录：`package.json` 的 `dsh.profile.bundles` 排 bundle 层，再叠本目录 `cordis.patch.yml`，再叠 `--patch`。首次用 shipped 名时 `initProfile` 按 `PROFILE_TEMPLATES` 写盘。`web` 的 `patchReload` 是 `'live'`；其余四个 shipped 是 `'startup'`。 [E: packages/boot/app-boot/src/profile.ts:105] [E: packages/boot/app-boot/src/profile.ts:112] | 和 bundle 不同：profile 是用户/部署选的**栈名**；和 preset 不同：profile 是进程级组合，不是每会话 tools。入口不只 `dsh web`：也有 `dsh --profile sdk\|sdk-minimal\|acp\|headless`。`desktop` **不是**该表成员。 | `packages/boot/app-boot/src/profile.ts:105` |
| bundle | composition / host | `dsh.bundle.patch` | npm 包，`package.json` 里 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，被 profile 按名推进空入口表。shipped 六个：`@deepseek-ai/dsh-base`、`dsh-web-app`、`dsh-headless`、`dsh-sdk-app`、`dsh-sdk-minimal`、`dsh-acp-app`。`sdk-minimal` 模板 **不**叠 `dsh-base`。 [E: packages/bundle/base/package.json:33] [E: packages/boot/app-boot/src/profile.ts:123] | 和 preset 不同：bundle 改的是 Loader 入口表（host 面为主）；preset 是 standing scope 上的第二棵树。 | `packages/bundle/base/package.json:33` · `packages/bundle/sdk-minimal/package.json:2` |
| agent preset | composition / per-session | preset；shipped `minimal` / `standard` / `ptc` / `cordis` | 目录名 = id，必有 `COMPOSITION_FILE = 'agent.cordis.yml'`。roster `ctx.agentPresets` 每个 id standing mount 一次，Agent 在 `setup` 里 `mount` / `composeFrom` 把 scope key parent 到该 mount。web 工程默认 `standard`。旧目录名 `code` 就是 `ptc`。 [E: packages/preset/agent-presets/src/discovery.ts:37] [E: packages/preset/agent-presets/src/discovery.ts:60] [E: packages/bundle/web-app/cordis.patch.yml:484] | 和 profile 不同：preset 管这个会话的 tools / persona / isolate；和「仓库里有这个包」不同：成员资格只认那四个 shipped `agent.cordis.yml`。 | `packages/preset/agent-presets/src/discovery.ts:60` · `packages/preset/agent-presets/src/index.ts:413` |
| isolate | composition / preset | `isolate: { <svc>: true }` | preset 里 **publish 服务** 的行必须进带 `isolate` 的 group，否则 `leakedServices` 看见它进了 root realm，`mountPreset` 直接抛。`true` = 这条 standing mount 的 entry-local realm。只 `register` 进 host registry 的 tool 行可以不带。 [E: packages/preset/agent-presets/src/mount.ts:407] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:172] | 和 host 面 singleton 不同：isolate 阻止两个 preset 把同名服务打进进程全局。 | `packages/preset/agent-presets/src/mount.ts:210` |
| host 面 | composition / process | host plane | 进程级、会话出现之前就要 settle 的组合：webserver / persistence / sandbox / `ctx.fs`·`ctx.shell`·`ctx.subprocess` Provider / jobs·skills·tools **registry** / subagent backend。headless overlay 只 insert `code-runtime` + `headless-startup` + `headless-runner`，**不**挂 roster，模型可见行就坐在 base 全局。 [E: packages/bundle/headless/cordis.patch.yml:20] | 和 agent-preset 面不同：host 行 `inject` 时还没有 Agent 可 key。 | `packages/bundle/headless/cordis.patch.yml:20` · `packages/preset/agent-presets/src/index.ts:436` |
| agent-preset 面 | composition / per-session | agent plane | 每会话 join 的那一层：tools / persona / isolate 服务。web 在 factory `setup` 里 `AgentPresets.mount`；子 Agent 用 `composeFrom` 加入父会话那一代 standing mount，不重新读盘。五个 shipped profile 里**只有 web** 挂 `agent-presets` 行。 [E: packages/preset/agent-presets/src/index.ts:436] [E: packages/bundle/web-app/cordis.patch.yml:481] | 和 host 面不同：换 preset 换的是这个 Agent 看见的 Consumer 行，不换盘/壳 Provider。 | `packages/preset/agent-presets/src/index.ts:413` |
| persona | composition / prompt | preset `prefix`/`suffix`；bundle `personaPrefix`/`personaSuffix` | shipped preset 的 `@deepseek-ai/dsh-persona` 用 `prefix`（必填）与可选 `suffix`；host `dsh-system-prompt` 用 `personaPrefix` / `personaSuffix`。不要再写旧键 `text` / 单字段 `persona`。 [E: packages/preset/persona/src/index.ts:50] [E: packages/core/system-prompt/src/index.ts:403] | 两套键分属 preset 行与 host prompt 注册表，不是同一个 schema。 | `packages/preset/persona/src/index.ts:50` |
| deepseek-flash | llm / default model | base `model: deepseek-flash` | base 组合默认 `provider: deepseek-official` / `model: deepseek-flash`。catalog 仍同时有 `deepseek-v4-flash`；**acp-app 仍硬编码** `deepseek-v4-flash`。 [E: packages/bundle/base/cordis.patch.yml:79] | 不是「全产品默认 v4-flash」。 | `packages/bundle/base/cordis.patch.yml:79` |

### scope

| 术语 | 类型/所属层 | 默认/别名 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| scope | core / registration | — | 一次 per-agent 注册的归属：全局（每个 Agent 都看见）或挂在某一个 scope key 上。`createScope` 铸出带 tag 的 Cordis context；loop 用 **Agent 自己**当 key。 [E: packages/core/scope/src/index.ts:137] [E: packages/core/agent-loop/src/agent.ts:104] | 和 lineage 不同：scope 管「谁看得见、谁活多久」；parent/child 会话事实另放 header。 | `packages/core/scope/src/index.ts:137` |
| scope key | core / identity | `ScopeKey` | 不透明 `object`，按**对象身份**比，不当字符串。约定：活着的 Agent 就是自己 scope 的 key；preset standing mount 另造 `{ agentPreset: id }`。 [E: packages/core/scope/src/index.ts:15] | 和 session id 不同：key 只做路由，不进 log。 | `packages/core/scope/src/index.ts:15` |
| agent.ctx | core / context | agent context | Agent 的 scoped context。经它做的 register / restrict / listener 既是 scope-visible 也是 scope-lifetime。默认 loop 用 `createScope(loopCtx, this)`，再 `this.ctx = this.scope.ctx`；**没有** `extend({ agent: this })`。 [E: packages/core/agent-loop/src/agent.ts:104] [E: packages/core/agent-loop/src/agent.ts:105] | 和 host `ctx` 不同：host 上的 register 是全局层。 | `packages/core/agent-loop/src/agent.ts:104` |
| scope carrier | core / dispatch | `Scoped<T>` | `scopeTarget(base, key)` 做出的路由-only `thisArg`。filter 放行：无 tag 的 listener，以及 tag 等于 key 或其 **ancestor** 的 listener。无 key 的 carrier 只放行未打 tag 的 listener。 [E: packages/core/scope/src/index.ts:170] | 和把 Agent 当 event payload 不同：carrier 不暴露 subject 字段。 | `packages/core/scope/src/index.ts:170` |
| scoped dispatch | core / events | — | 「关于某个 Agent 的活动」用该 Agent 的 carrier 派发；「关于 registry 本身」（工具被登记）保持 unfiltered。 | 和 lineage 不同：过滤的是 listener，不是子会话能不能看见父历史。 | `packages/core/scope/src/index.ts:159` |
| shadowing | core / resolution | most-specific-wins | 同名时：更近一层盖住更远一层；全局层最远，scope 自己的 register 最后写入且不受 restriction 过滤。tool / command / persona / skill 都走这套。scope-local 写入发生在 restrict 过滤之后。 [E: packages/core/tools/src/index.ts:1170] | 和 `restrict` 不同：shadow 是加一条同名；restrict 是从全局集里抠掉。 | `packages/core/tools/src/index.ts:1170` |
| restriction | core / filter | `tools.restrict` | 对**全局**工具集做 allow/deny 交集；scope-local 登记在过滤之后仍可见。必须在 scoped context 上调用。不能点名保留的 `run_code`。 [E: packages/core/tools/src/index.ts:1062] [E: packages/core/tools/src/index.ts:1064] | 和「没登记」对外不可分：被滤掉的全局名在 prompt 和 execute 里都像不存在。 | `packages/core/tools/src/index.ts:1062` |
| setup window | core / create | `CreateAgentOptions.setup` | Agent 与 session 已铸出、尚未 publish、尚未 `agent/session-start`、尚未组第一轮 prompt 的组合槽。setup 只 register；throw 则整次 create 回滚。 [E: packages/core/agent/src/index.ts:118] | 和 turn 不同：setup 不 `followup`、不开模型。 | `packages/core/agent/src/index.ts:118` |
| lineage | persistence / session | `parentSession` / `delegationDepth` / `isSeeded` | header 上的亲子事实：子会话写下父 id、委托深度、以及是否继承前缀（`isSeeded`）。前缀**长度**是 `inheritedEventCount`（构造 / 恢复选项与 Session 状态），**不是** header 字段；header 若带 `seedLength` 直接拒。**不**改变 scope 可见性。 [E: packages/subagent/subagent/src/child-agent.ts:148] [E: packages/core/session/src/types.ts:106] [E: packages/core/session/src/types.ts:111] [E: packages/core/session/src/index.ts:97] | 和 scope parent 不同：lineage 是 log/header 数据，好让 resume 还认得深度；scope parent 是活对象路由。 | `packages/subagent/subagent/src/child-agent.ts:148` |

### 循环、goal、人命令

| 术语 | 类型/所属层 | 默认/别名 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| turn | core / loop | `turn/start` · `turn/end` | 一次把已准入输入排干：先 `append('turn/start')`，再在内部循环开 step；模型与工具停、或策略把 turn 标终结时关。可以 0 个 step。 [E: packages/core/agent-loop/src/agent.ts:269] [E: packages/core/agent-loop/src/agent.ts:278] [E: packages/core/session/src/types.ts:276] | 和 step 不同：turn 是一次 drain；和 round 不同：round 是外层策略计数，不统计会话里每一发。 | `packages/core/agent-loop/src/agent.ts:269` |
| step | core / loop | `step/start` · `step/end` | 一次模型请求加上这次响应触发的 tool 执行。turn 内 `phase.step + 1`。 [E: packages/core/agent-loop/src/agent.ts:352] [E: packages/core/session/src/types.ts:287] | 和 turn 不同：step 必有一次模型调用边界；和 tool call 不同：一步可含多次 tool。 | `packages/core/agent-loop/src/agent.ts:352` |
| round | orchestration / policy | — | 包住一次 turn 的外层策略迭代。计数器属于该策略，不是 session 里每个 turn 都 +1。实例：goal round、Ralph round。 [E: packages/goal/goal/src/types.ts:92] [E: packages/workflow/tool-ralph/src/index.ts:151] | 和 turn 不同：人在同一会话里随便再聊一发，不消耗 goal-round cap。 | `packages/goal/goal/src/types.ts:92` |
| goal | orchestration / state | `ctx.goals`；phase `active`/`paused`/`blocked`/`complete` | 挂在**已有会话**上的一份可修订完成目标，不是另一条对话、也不是调度器。真相是 `goal/change` 整值快照。 [E: packages/goal/goal/src/types.ts:45] [E: packages/goal/goal/src/domain.ts:66] | 和 Ralph 不同：goal 同会话续跑；Ralph 每 round 新开 fresh child。 | `packages/goal/goal/src/types.ts:59` |
| goal round | orchestration / policy | `GoalMessageSource.round` | 当前 goal 被准入的一次续跑：驱动器把它落成一条 goal-sourced `user/message`（`source.kind === 'goal'`，`source.round` 为正整数）。`roundsStarted` 是已准入最高号；触顶 `maxGoalRounds` 则 `resume` 拒绝。 [E: packages/goal/goal/src/domain.ts:52] [E: packages/goal/goal/src/types.ts:92] [E: packages/goal/goal/src/index.ts:375] | 和 session turn 不同：只有 goal 驱动的那次 continuation 计 cap。 | `packages/goal/goal/src/domain.ts:47` |
| goal activation | orchestration / process-local | `armed` / `disarmed` | 本进程还许不许自动再开一个 goal round。刻意**不**进 durable 投影；resume / fork 之后要人经 `/goal` 或 `update_goal` 再武装。 [E: packages/goal/goal/src/types.ts:72] | 和 `phase` 不同：`active` 仍可能 `disarmed`。 | `packages/goal/goal/src/types.ts:72` |
| human command | interaction / UI | slash command；`ctx.commands` | `/` 打头、UI adapter 经 `parseCommand` + `ctx.commands` 执行的指令。handler 直接打在接收 Agent 上，**不**变成模型消息。 [E: packages/interaction/commands/src/index.ts:115] [E: packages/interaction/commands/src/index.ts:125] | 和 model-visible tool 不同：不进 `ctx.tools.schemas()`；和 `ctx.shell` 不同：不是 bash。 | `packages/interaction/commands/src/index.ts:125` |
| command plane | interaction / UI | — | 发现、解析、dispatch、取消、把 `CommandResult` 画成 UI。输出默认是 UI 状态；要进 log 得 handler 另写 domain 事件。 [E: packages/interaction/commands/src/index.ts:263] | 和 tool pipeline（`tools/pre-execute`）不是一条路。 | `packages/interaction/commands/src/index.ts:263`
| goal command | interaction / `/goal` | `dsh-command-goal` | 人命令面的 `/goal`：观察或改当前 goal。durable、模型可见的记录仍归 goal 域（`goal/change`）。 [E: packages/goal/command-goal/src/index.ts:191] | 和 `create_goal` 工具不同：`/goal` 不经模型 turn。 | `packages/goal/command-goal/src/index.ts:191` |
| model-visible tool | core / tools | `defineTool` → `ctx.tools.register` | 登记进 `ctx.tools`、出现在 `schemas()` / `wireSchemas`、由模型 `tool/call` 触发的函数。wire 名是 `definition.name`（`subagent` 可被 Config `toolName` 改）。 [E: packages/core/tools/src/schema.ts:546] [E: packages/core/tools/src/index.ts:1028] | 和 human command 不同：它走模型 turn 与 session surface。 | `packages/core/tools/src/index.ts:1028` |

### Ralph

| 术语 | 类型/所属层 | 默认/别名 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| Ralph loop | orchestration / tool | wire `ralph`；内部 meta `ralph-loop` | 一次前台、面向**不可变 objective** 的 fresh-agent 工作流。模型只填数据；脚本、provider、handoff schema 部署锁死。默认 provider `spawn`，且必须 `outputSchema`、必须 **不** `inheritsParentContext`。 [E: packages/workflow/tool-ralph/src/index.ts:411] [E: packages/workflow/tool-ralph/src/index.ts:226] | 和 goal 不同：不是同会话续跑；和通用 `workflow` 不同：Ralph 是固定脚本政策。 | `packages/workflow/tool-ralph/src/index.ts:1` |
| Ralph round | orchestration / policy | `Ralph round N` | loop 里一次 fresh child：`for (round = 1; round <= maxRounds)` 调 `agent(prompt, { schema })`。child 不收父会话、也不收上一 child 的对话；跨 round 靠工作区和一条 handoff。 [E: packages/workflow/tool-ralph/src/index.ts:151] | 和 goal round 不同：这里每次都是新会话。 | `packages/workflow/tool-ralph/src/index.ts:151` |
| Ralph handoff | orchestration / report | `RalphRoundReport` | 规范化、有字符顶的结构化报告：`status` ∈ `continue`/`complete`/`blocked`，外加 `summary` / `evidence` / `nextSteps` / `blocker`。补充工作区，不替代工作区当权威。 [E: packages/workflow/tool-ralph/src/index.ts:49] | 和 session seed 不同：下一 round 仍是 unseeded child，只把 JSON 报告写进 prompt。 | `packages/workflow/tool-ralph/src/index.ts:49` |

### 日志、surface、事件模式

| 术语 | 类型/所属层 | 默认/别名 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| SESSION_FORMAT_VERSION | persistence / header | `3` | 当前逻辑盘格式。adjacent 链 v0→v1→v2→v3 由 `dsh-session-format` + catalog 规划，JSONL load 时执行。比 3 新的盘拒。v2→v3 把旧 preset id `code` 写成 `ptc`，并插入 synthetic `system/message`。 [E: packages/core/session/src/types.ts:88] [E: packages/session/session-format-catalog/src/generated.ts:15] | 不是「现为 2 / 链止于 v2」。 | `packages/core/session/src/types.ts:88` |
| model-visible ⟺ logged | core / contract | — | 模型下一请求能看见的消息，必须能从同一条 append-only `SessionEvent` log 经 surface 折回来。preset 决定 tools/prompt，所以实际 preset 也要落 log（header `agentPreset` 或后来的 `agent-preset/selected`）。system prompt 也是 derived history（`system/message`），不再写在 `EpochHeader.system`。 [E: packages/preset/agent-presets/src/session.ts:28] [E: packages/core/session/src/types.ts:413] | 和「内存里改一份 chat 数组」不同：没有第二条权威历史。 | `packages/preset/agent-presets/src/session.ts:28` · `packages/core/session/src/index.ts:832` |
| deriveMessages | core / projection | `Session.deriveMessages` | 对当前 `surface.nodes` 逐 seq 调 `deriveEventMessage`：非空 `system/message` / `user/message` / 非空 `assistant/message` / `tool/result` 进数组；chunk、turn 边界、空 system/assistant 用法记录进不了。`replace` 会重建缓存。 [E: packages/core/session/src/index.ts:832] [E: packages/core/session/src/surface.ts:92] | 和「把整段 log 当 messages」不同：只有带 `surfaceOp` 的四类事件能投影。 | `packages/core/session/src/index.ts:832` |
| surfaceOp | core / surface | `SurfaceOp` | 只有 `system/message` / `user/message` / `assistant/message` / `tool/result` 能带。取值只有 `'append'` 与 `{ op: 'replace', startSeq, endSeq }`，**没有 delete**。compaction 用 replace 盖住一段 surface。 [E: packages/core/session/src/types.ts:412] [E: packages/core/session/src/types.ts:434] | 和「从数组 splice 掉一条」不同：旧节点仍在 log 里，只是派生历史不再引用。 | `packages/core/session/src/types.ts:434` |
| waterfall | vendor / events | `DispatchMode` | 监听者包在最终 `next` 外面；不调用 `next()` 就否决后半链（含内建行为）。`fs/write-intent` 这类单槽决策走它。 [E: vendor/cordis/src/events.ts:234] | 和 `emit` 不同：必须把链传下去才有默认行为。 | `vendor/cordis/src/events.ts:234` |
| session/flush | persistence / events | `@mode parallel` | 持久化检查点：每个 listener 都跑，调用方 `Promise.allSettled` 等齐，**没有** waterfall 否决。入口是 `SessionStore.flush`，不要自己 `ctx.parallel('session/flush')`。 [E: packages/core/session/src/index.ts:81] [E: packages/core/session/src/index.ts:1144] | 和 waterfall 不同：一个 persistence 插件失败不能靠不调 `next()` 吞掉别人。 | `packages/core/session/src/index.ts:1144` |

### 路径与家目录

| 术语 | 类型/所属层 | 默认/别名 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| DSH_HOME | util / env | `DSH_HOME_ENV = 'DSH_HOME'` | 覆盖产品主目录的环境变量。`resolveDshHome` 优先级：显式 configured > 非空白 `$DSH_HOME` > `~/.dsh`。空白/纯空白当没设，避免落到 cwd。 [E: packages/util/home-paths/src/index.ts:18] [E: packages/util/home-paths/src/index.ts:88] | 和项目里的 `.dsh/` 不同：这是**用户主根**（profiles、user presets、user skills）。 | `packages/util/home-paths/src/index.ts:18` |
| ~/.dsh | util / default home | `DSH_HOME_DIR_NAME`；展示 `~/.dsh` | 未设 `$DSH_HOME` 时的 `join(homedir(), '.dsh')`。`dshHomeDisplay` 对这个默认路径永远印 `~/.dsh`，其它解析结果印 `$DSH_HOME`。 [E: packages/util/home-paths/src/index.ts:12] [E: packages/util/home-paths/src/index.ts:121] | 和 Claude/Pi 的配置根不同：产品数据只认这一根。 | `packages/util/home-paths/src/index.ts:12` |
| .dsh/skills | context / skills | `project-dsh` rank 100；user 根是 `$DSH_HOME/skills` | 项目根下 `<project>/.dsh/skills`（rank 100，同名最高优先）。用户级是 `join(dshHome, 'skills')`，默认即 `~/.dsh/skills`（rank 400）。 [E: packages/skill/skill-filesystem/src/index.ts:250] [E: packages/skill/skill-filesystem/src/index.ts:257] | 和 `$DSH_HOME/profiles` 不同：这是 skill 扫描根，不是 profile 目录。 | `packages/skill/skill-filesystem/src/index.ts:36` |
| .agents/skills | context / skills | `project-agents` rank 200；user `~/.agents/skills` | 项目根 `<project>/.agents/skills`（rank 200，输给同项目 `.dsh/skills`）。用户级 `join(agentsHome, 'skills')`，`agentsHome` = Config / `$DSH_AGENTS_HOME` / `~/.agents`（rank 500）。 [E: packages/skill/skill-filesystem/src/index.ts:251] [E: packages/skill/skill-filesystem/src/index.ts:168] | 和 `$DSH_HOME` 不同：这是共享 agent 配置根，给兼容 `.agents` 的扫描，不是 DSH 主目录。 | `packages/skill/skill-filesystem/src/index.ts:39` |

### 工具名碰撞与 PTC

| 术语 | 类型/所属层 | 默认/别名 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| PTC | core / presentation | 旧名 Code Mode；Config `mode`：`'native' \| 'ptc' \| 'both'`；默认 `native` | 把模型可见能力收成 SDK + 一条运输工具。非 `native` 时 registry 把保留名 `run_code` 插进该 scope 的可见集。权威文件 `ptc.ts`（不是 `code-mode.ts`）。语言 flavor：`typescript` 与 `python`。ptc preset 用 `dsh-agent-tool-presentation` `mode: ptc`。 [E: packages/core/tools/src/index.ts:784] [E: packages/core/tools/src/ptc.ts:79] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:272] | 和「又登记一个普通 tool」不同：`run_code` 禁止被 register/shadow/restrict。 | `packages/core/tools/src/index.ts:784` |
| run_code | core / transport | `RUN_CODE_NAME = 'run_code'` | PTC 的模型可见运输：程序经 `await tools.name(args)` 调其它工具；子 dispatch 重入 `TOOL_RUNTIME_SCHEDULER`，只有外层 curated 结果进模型历史。 [E: packages/core/tools/src/ptc.ts:20] [E: packages/core/tools/src/ptc.ts:296] [E: packages/core/tools/src/ptc.ts:480] | 和 native `bash`/`read` 不同：它是 presentation 层，不是一条 capability consumer。 | `packages/core/tools/src/ptc.ts:20` |
| bash @ dsh-tool-bash | execution / one-shot | wire `bash`；包 `@deepseek-ai/dsh-tool-bash` | Consumer of `ctx.shell`：一次性命令，可 `run_in_background` 进 `ctx.jobs`。standard 等 shipped preset 在非 win32 装这条。 [E: packages/shell/tool-bash/src/index.ts:241] | 和 persistent `bash` 同名不同包：这条走 shell seam，不保 cwd/env。 | `packages/shell/tool-bash/src/index.ts:30` |
| bash @ dsh-tool-bash-persistent | execution / PTY | wire `bash`；包 `@deepseek-ai/dsh-tool-bash-persistent` | Consumer of `ctx.terminals`：按 owner Agent 串行保 cwd/env。minimal preset 装这条，不装 one-shot，也**不**挂 filesystem / `str_replace_editor`。 [E: packages/shell/tool-bash-persistent/src/index.ts:405] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:36] | 和 one-shot `bash` 互斥同名：同一 scope 不能两套都 register。 | `packages/shell/tool-bash-persistent/src/index.ts:432` |
| present | execution / deliverable | wire `present`；包 `@deepseek-ai/dsh-tool-present` | 把已存在的 Session 文件声明成最终交付物。挂 **standard / ptc / cordis**，**不**挂 minimal。成功后 append `deliverables/presented`。`str_replace_editor` 包仍在、出厂 yml 不挂。 [E: packages/fs/tool-present/src/index.ts:39] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:254] | 和「在回复里写路径」不同：模型必须显式调用。 | `packages/fs/tool-present/src/index.ts:39` |
| pwsh @ dsh-tool-pwsh-persistent | execution / PTY | wire `pwsh`；包 `@deepseek-ai/dsh-tool-pwsh-persistent` | 对标 persistent `bash`：owner-scoped PTY，inject `tools` + `terminals`。模型看见的名字是 `pwsh`，不是 `pwsh-persistent`。 [E: packages/shell/tool-pwsh-persistent/src/index.ts:442] [E: packages/shell/tool-pwsh-persistent/src/index.ts:469] | 和 one-shot `dsh-tool-pwsh` 同名不同包，不得混成一个工具。 | `packages/shell/tool-pwsh-persistent/src/index.ts:442` |
| subagent | orchestration / tool | Config `toolName` 默认 `subagent` | `dsh-tool-subagent` 的 load-time 名。shipped standard/ptc/cordis 绑 `provider: spawn`（`inheritsParentContext = false`，fresh child）。 [E: packages/subagent/tool-subagent/src/index.ts:107] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:50] | 和 fork 不同：spawn 不把父会话已完成 turn 当 seed。 | `packages/subagent/tool-subagent/src/index.ts:107` · `packages/preset/agent-presets/presets/standard/agent.cordis.yml:190` |
| subagent_fork | orchestration / tool | 同一包第二实例；`toolName: subagent_fork` | shipped 再 load 一次 `dsh-tool-subagent`，`provider: fork`。fork provider `inheritsParentContext = true`，seed 为父会话**已完成** turn 前缀。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:197] [E: packages/subagent/subagent-fork-in-process/src/index.ts:72] | 和 `subagent` 不同：名字是配置出来的，不是另一个包；child 看得到父历史。 | `packages/subagent/subagent-fork-in-process/src/index.ts:72` |
| Agent Teams | orchestration / experimental | `ctx.agentTeams` | opt-in 实验服务：roster / mailbox / task board，叠在 continuable subagent 上。工具包 `@deepseek-ai/dsh-experimental-tool-agent-team`。 [E: packages/experimental/agent-team/src/index.ts:40] | 和普通 `subagent` 不同：成员挂 Lead Session 的 durable roster，不是一次性 spawn。 | `packages/experimental/agent-team/src/index.ts:40` |
| webhook | integration / host | `ctx.webhookRuntime` | 提供方无关 runtime：`dispatch` fire-and-forget，规则可 `createWebhookSession`。GitHub adapter 在 `packages/webhook/webhook-github`。 [E: packages/webhook/webhook/src/index.ts:15] [E: packages/webhook/webhook-github/src/index.ts:14] | 和人命令不同：入口是 HTTP 签名投递，不是 `/`。 | `packages/webhook/webhook/src/index.ts:15` |

### 安装面与 TUI

| 术语 | 类型/所属层 | 默认/别名 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| tui | composition / 非 shipped | help 例子里的自定义 profile 名 | `PROFILE_TEMPLATES` 有 `acp` / `web` / `headless` / `sdk` / `sdk-minimal`，**没有** `tui`。launcher help 写 `dsh --profile tui …` 只演示「任意自定义目录名」；本仓没有 shipped TUI 包、没有 `tui` 模板。`dsh web` 是唯一硬编码 alias（`resolveBoot(..., 'web', …)`）。裸 `dsh` 没有 `--profile` 会报 required。其它宿主用 `dsh --profile sdk\|sdk-minimal\|acp\|headless`。 [E: packages/boot/app-boot/src/profile.ts:105] [E: apps/cli/src/args.ts:155] [E: apps/cli/src/args.ts:175] | 和 Codex/Claude 的终端 UI 不同：默认装的是本地 Web GUI，但不是唯一宿主入口。 | `packages/boot/app-boot/src/profile.ts:105` · `apps/cli/src/args.ts:155` |
| desktop | composition / Electron | `$DSH_HOME/profiles/desktop` | **不是**第六个 CLI profile。`rejectElectronProfile` 拒绝 `dsh --profile desktop`；该目录由 Electron 壳独占。另有 `apps/desktop` / `apps/desktop-host`。 [E: apps/cli/src/args.ts:68] | 和 `PROFILE_TEMPLATES` 五个 shipped 名分家。 | `apps/cli/src/args.ts:68` |

## 对照 / 分家

**profile vs bundle vs agent preset。** profile 是 `$DSH_HOME/profiles/<name>` 这份进程栈；bundle 是被推进空入口表的 npm 补丁层；agent preset 是会话 join 的 standing `agent.cordis.yml`。`dsh web` = profile `web` = `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app`，再由 web-app 挂 roster、默认 preset `standard`。headless / sdk / acp 叠 base 但不 `mount` preset roster；`sdk-minimal` 只叠自己（`agent-spine-demo` 已删除）。

**host 面 vs agent-preset 面。** Provider 与 registry 留在 host（`inject` 发生在任何 session 之前）。preset 只挂 Consumer 与必须 isolate 的 per-mount 服务。漏 isolate 会在 `mountPreset` 被 `leakedServices` 拒绝。

**turn / step / round。** loop 只认 turn 与 step。round 是 goal / Ralph 自己的 cap。人在同一会话再发一则普通 `user/message` 会开新 turn，但不计 goal round。

**human command vs model-visible tool vs bash。** `/goal` 走 `ctx.commands`，不经模型。`create_goal` 走 `ctx.tools`，经 `tool/call`。`bash` 是模型可见 tool，背后再调 `ctx.shell` 或 `ctx.terminals`，与 slash command 无关。

**两个 `bash`、两个 `pwsh`。** 同 wire 名、两个包、两条 seam。standard 用 one-shot `dsh-tool-bash` + `ctx.shell`；minimal 用 persistent `dsh-tool-bash-persistent` + `ctx.terminals`，**没有** filesystem / `str_replace_editor`。`pwsh` 同样拆 one-shot 与 `dsh-tool-pwsh-persistent`。

**`subagent` vs `subagent_fork`。** 同一个 `dsh-tool-subagent` 包 load 两次，靠 `toolName` 分 wire 名。spawn 新鲜、fork 继承已完成父 turn。minimal 两行都不装。

**PTC vs native。** `mode: native` 把整张 tool 表发给模型；`ptc` 只发 `run_code`；`both` 两者都发。PTC preset 把 `tool-workflow` `disabled: true`，engine 留给 `ralph`。子调用仍走原生并发调度。wiki 仍用 id `surface.presets.code` / `subsys.core.code-mode` 指 `presets/ptc/` 与 `ptc.ts`。

**waterfall vs `session/flush`。** 意图类事件必须 `next()`，否则内建写入不发生。`session/flush` 是 parallel 耐久点，所有 listener 一起 settle。

**`$DSH_HOME` vs 项目 `.dsh/skills`。** 前者是整棵产品树的根（缺省 `~/.dsh`）。后者是**仓库内** skill 目录；用户 skill 在 `$DSH_HOME/skills`。`.agents/skills` 是另一条兼容扫描根，主目录仍不是 `.agents`。

## Sources

- packages/core/session/src/types.ts
- packages/session/session-format-catalog/src/generated.ts
- packages/util/http-proxy/src/index.ts
- packages/client/file-upload/src/index.ts
- packages/core/session/src/surface.ts
- packages/core/session/src/index.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent/src/index.ts
- packages/core/scope/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/tools/src/ptc.ts
- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/preset/agent-presets/src/discovery.ts
- packages/preset/agent-presets/src/session.ts
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/minimal/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/persona/src/index.ts
- packages/core/system-prompt/src/index.ts
- packages/fs/tool-present/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/util/home-paths/src/index.ts
- packages/fs/fs/src/index.ts
- packages/shell/shell/src/index.ts
- packages/shell/tool-bash/src/index.ts
- packages/shell/tool-bash-persistent/src/index.ts
- packages/shell/tool-pwsh-persistent/src/index.ts
- packages/skill/skill-filesystem/src/index.ts
- packages/workflow/tool-ralph/src/index.ts
- packages/goal/goal/src/types.ts
- packages/goal/goal/src/domain.ts
- packages/goal/goal/src/index.ts
- packages/goal/command-goal/src/index.ts
- packages/interaction/commands/src/index.ts
- packages/subagent/tool-subagent/src/index.ts
- packages/subagent/subagent-spawn-in-process/src/index.ts
- packages/subagent/subagent-fork-in-process/src/index.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/experimental/agent-team/src/index.ts
- packages/webhook/webhook/src/index.ts
- packages/webhook/webhook-github/src/index.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/service.ts
- apps/cli/src/args.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-minimal/package.json

## 相关

- [spine.overview](../spine/overview.md) — 组合运行时总览；host 面 vs agent-preset 面
- [spine.capability-seams](../spine/capability-seams.md) — Definition / Provider / Consumer 走读
- [ref.package-index](package-index.md) — monorepo 每个包一行
- [spine.composition-boot](../spine/composition-boot.md) — `profile → bundle → preset` 启动叠层
- [spine.turn-and-step](../spine/turn-and-step.md) — turn / step 控制流
- [spine.session-log](../spine/session-log.md) — `deriveMessages` 与 `surfaceOp`
- [ref.presets](presets.md) — 四个 shipped `agent.cordis.yml` 对照（含 `ptc`）
- [ref.tools-catalog](tools-catalog.md) — 模型可见 wire 名全表
- [ref.capability-seams](capability-seams.md) — seam 清单
- [ref.env-vars](env-vars.md) — `DSH_HOME` 与其它 env
- [subsys.core.scope](../subsystems/core/scope.md) — scope 原语
- [subsys.util.home-paths](../subsystems/util/home-paths.md) — 家目录解析
- [surface.presets.code](../surface/presets/code.md) — PTC preset 稳定别名（目录 `presets/ptc/`）
- [subsys.core.code-mode](../subsystems/core/code-mode.md) — PTC `run_code` 子系统稳定别名
