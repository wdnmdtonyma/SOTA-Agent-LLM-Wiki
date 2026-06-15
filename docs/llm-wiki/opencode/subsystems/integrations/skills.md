---
id: integrations.skills
title: Skills integration
kind: subsystem
tier: T2
v: shared
status: verified
updated: 92c70c9c3
source:
  - packages/opencode/src/skill/index.ts
  - packages/opencode/src/skill/discovery.ts
  - packages/opencode/src/tool/skill.ts
  - packages/opencode/src/command/index.ts
  - packages/core/src/skill.ts
  - packages/core/src/skill/discovery.ts
  - packages/core/src/skill/guidance.ts
  - packages/core/src/tool/skill.ts
  - packages/core/src/tool/builtins.ts
  - packages/core/src/v1/config/skills.ts
  - packages/core/src/config.ts
symbols:
  - Skill.Service
  - SkillDiscovery.Service
  - SkillTool
  - SkillV2.Service
  - SkillV2.Source
  - SkillGuidance.Service
related:
  - tool.skill
  - integrations.commands
evidence: explicit
---

> Skills integration 是 V1/V2 共享概念但两套实现：V1 在 `packages/opencode/src/skill` 扫描磁盘和远程 skill，V2 在 `packages/core/src/skill` 建立 Effect-native source/list/guidance 机制；两代都用 `skill` tool 让模型按权限读取完整 skill 内容。

## 能回答的问题

- V1 skill 从哪些目录、配置路径、远程 URL 加载。
- V2 skill source 有哪些类型，为什么 guidance 只列 description 而不直接塞完整 skill body。
- V1/V2 `skill` tool 如何做 permission check 和文件采样。
- skill 与 command 的关系：为什么某些 skill 会变成 slash command。

## V1

### 职责

V1 `Skill.Service` 管理 skill discovery、markdown frontmatter decode、duplicate name handling、agent permission filtering、以及 `skill` tool 的后端读取。[E: packages/opencode/src/skill/index.ts:97] [E: packages/opencode/src/skill/index.ts:105] [E: packages/opencode/src/skill/index.ts:134] [E: packages/opencode/src/skill/index.ts:310] V1 内建 skill 名称是 `customize-opencode`，它在 disk discovery 之前注册，因此用户磁盘上的同名 skill 可以覆盖内建项。[E: packages/opencode/src/skill/index.ts:32] [E: packages/opencode/src/skill/index.ts:278] [E: packages/opencode/src/skill/index.ts:284]

V1 远程 skill discovery 在 `packages/opencode/src/skill/discovery.ts`，它从 URL 拉取 index、下载文件到 cache，并返回含 `SKILL.md` 的本地目录。[E: packages/opencode/src/skill/discovery.ts:48] [E: packages/opencode/src/skill/discovery.ts:88]

### 数据模型

V1 skill frontmatter validator 要求 `name` 是 string，`description` 是 optional string。[E: packages/opencode/src/skill/index.ts:53] `Skill.Info` 包含 `name`、optional `description`、`location`、`content`。[E: packages/opencode/src/skill/index.ts:37]

V1 config `skills` 只有两类入口：`paths` 和 `urls`。[E: packages/core/src/v1/config/skills.ts:5] `paths` 是本地路径列表，`urls` 是远程 skill source 列表。[E: packages/core/src/v1/config/skills.ts:9]

### 加载流程

1. `discoverSkills` 先构造 external dirs：`.claude` 只有在未禁用 Claude Code skills 时加入，`.agents` 在未禁用 external skills 时加入。[E: packages/opencode/src/skill/index.ts:185]
2. 如果 external skills 未禁用，V1 会扫描用户 home 下的 external dirs。[E: packages/opencode/src/skill/index.ts:190]
3. 对 project/worktree，V1 从当前 directory 向 worktree root 向上遍历，每层扫描 external dirs。[E: packages/opencode/src/skill/index.ts:196]
4. config `skills.paths` 会先展开 `~/`、absolute、relative 三种路径；只有目录会被扫描，扫描 pattern 是 `**/SKILL.md`。[E: packages/opencode/src/skill/index.ts:210] [E: packages/opencode/src/skill/index.ts:214] [E: packages/opencode/src/skill/index.ts:219]
5. config `skills.urls` 通过 discovery service 下载或复用远程 skill cache。[E: packages/opencode/src/skill/index.ts:222]
6. discovery scan 使用 glob，开启 absolute、symlink、dot；如果遇到 permission/scope error 会记录 warning 而不是让整个服务失败。[E: packages/opencode/src/skill/index.ts:142] [E: packages/opencode/src/skill/index.ts:168]
7. skill markdown 缺少 frontmatter 或 frontmatter decode 失败时跳过。[E: packages/opencode/src/skill/index.ts:121]
8. 重名 skill 会 warning，并用后加入的 skill 覆盖 map 中同名项。[E: packages/opencode/src/skill/index.ts:134] [E: packages/opencode/src/skill/index.ts:138]
9. service 初始化时先注册 built-in skill，再加载磁盘/远程 skill，因此用户同名 skill 可以覆盖 built-in。[E: packages/opencode/src/skill/index.ts:278] [E: packages/opencode/src/skill/index.ts:284]

### V1 `skill` tool

1. V1 `skill` tool id 是 `skill`。[E: packages/opencode/src/tool/skill.ts:14]
2. 参数只有 `name`，工具会先用 `skill.require(name)` 读取完整 skill；service 层找不到时会产生 `Skill.NotFoundError`。[E: packages/opencode/src/tool/skill.ts:9] [E: packages/opencode/src/tool/skill.ts:24] [E: packages/opencode/src/skill/index.ts:294] [E: packages/opencode/src/skill/index.ts:298]
3. tool 在读取 skill 后请求 permission，permission action 是 `skill`，pattern 和 always 都是 skill name。[E: packages/opencode/src/tool/skill.ts:24] [E: packages/opencode/src/tool/skill.ts:28]
4. tool 输出包含 `skill_content`、`base directory`、相对路径提示，以及最多 10 个非 `SKILL.md` 文件样本。[E: packages/opencode/src/tool/skill.ts:46] [E: packages/opencode/src/tool/skill.ts:54]
5. 文件采样通过 ripgrep `find`，隐藏文件开启，排除 `**/SKILL.md`，limit 是 10。[E: packages/opencode/src/tool/skill.ts:37]

## V2

### 职责

V2 `SkillV2.Service` 把 skill 抽象为 source 列表、transform hook、list cache；source 可以来自 Directory、Url、Embedded。[E: packages/core/src/skill.ts:14] [E: packages/core/src/skill.ts:76] [E: packages/core/src/skill.ts:139] 这是 V2 core 的 Effect-native service，不是 V1 `packages/opencode/src/skill` 的复用实现。[I]

V2 `SkillGuidance.Service` 不把完整 skill body塞进 system prompt；它只为当前 agent 可用且有 description 的 skill 渲染 guidance，并通过 `SystemContext` 做 baseline/update/removed 增量。[E: packages/core/src/skill/guidance.ts:51] [E: packages/core/src/skill/guidance.ts:59]

### 数据模型

V2 `Source` 有三种 tag：Directory 含 `path`，Url 含 `url`，Embedded 含完整 `SkillV2.Info`。[E: packages/core/src/skill.ts:14] source key 是 `directory:<path>`、`url:<url>`、或 `embedded:<name>`。[E: packages/core/src/skill.ts:29]

V2 `Info` 包含 `name`、`description`、可选 `slash`、`location`、`content`。[E: packages/core/src/skill.ts:49] frontmatter 允许 `name`、`description`、`slash`。[E: packages/core/src/skill.ts:60]

V2 config 层暴露 `skills` string array，描述是 "Additional paths or URLs to discover skills from"。[E: packages/core/src/config.ts:89] [E: packages/core/src/config.ts:90]

### 加载流程

1. `SkillV2.Service` 的 state 保存 source list，当前 layer 的初始 sources 是空数组。[E: packages/core/src/skill.ts:90] [E: packages/core/src/skill.ts:91]
2. `load(source)` 对 Embedded 直接返回 embedded skill；Directory/Url source 先经过 discovery，再 glob `{*.md,**/SKILL.md}`。[E: packages/core/src/skill.ts:103] [E: packages/core/src/skill.ts:106]
3. frontmatter name 优先；没有 frontmatter name 时，只有位于 source root 目录下的 markdown file 会用 basename 作为 skill name，nested file 没有 fallback name 会被跳过。[E: packages/core/src/skill.ts:116] [E: packages/core/src/skill.ts:119] [E: packages/core/src/skill.ts:122]
4. list 有 cache map；`list()` 会对每个 source key load/cache，按 skill name 去重后返回 values。[E: packages/core/src/skill.ts:139] [E: packages/core/src/skill.ts:143] [E: packages/core/src/skill.ts:146]
5. V2 `list()` 使用 local cache map，并在 source key 命中时复用 loaded skills；当前可见 list 逻辑里未看到 filesystem watch invalidation。[E: packages/core/src/skill.ts:139] [E: packages/core/src/skill.ts:143] [I]

### V2 remote discovery

1. V2 discovery 对 URL path segment 和 relative path 做安全过滤，防止 unsafe segment 或 path traversal。[E: packages/core/src/skill/discovery.ts:13] [E: packages/core/src/skill/discovery.ts:29]
2. 每个 remote skill 必须存在 `SKILL.md` 或 `${skill.name}.md`，否则跳过。[E: packages/core/src/skill/discovery.ts:113]
3. 下载文件前会校验 skill root 仍在 source root 内，后续 destination containment 校验防止恶意 index 写出 skill root。[E: packages/core/src/skill/discovery.ts:117] [E: packages/core/src/skill/discovery.ts:118]
4. HTTP fetch 使用 `HttpClient.retryTransient({ retryOn: "errors-and-responses", times: 2 })`。[E: packages/core/src/skill/discovery.ts:73] [E: packages/core/src/skill/discovery.ts:76]

### V2 guidance 与 tool

1. guidance 加载前等待 plugin boot，且要求当前 agent 存在。[E: packages/core/src/skill/guidance.ts:48] [E: packages/core/src/skill/guidance.ts:49]
2. guidance 先用 `SkillV2.available` 按 agent permission 过滤。[E: packages/core/src/skill/guidance.ts:51]
3. 如果没有可用 skill 且全局 skill permission denied，guidance 返回空，避免鼓励模型调用被禁止的 skill。[E: packages/core/src/skill/guidance.ts:52]
4. V2 `skill` tool name 是 `skill`，同样最多采样 10 个文件。[E: packages/core/src/tool/skill.ts:14] [E: packages/core/src/tool/skill.ts:15]
5. V2 tool layer 注册前等待 plugin boot；tool execute 时在 `skills.list()` 中查找 name，找不到会返回 unable-to-load failure。[E: packages/core/src/tool/skill.ts:64] [E: packages/core/src/tool/skill.ts:72] [E: packages/core/src/tool/skill.ts:74]
6. V2 permission assert 的 action 是 `skill`，resources 包含 skill name、save/session/agent/source。[E: packages/core/src/tool/skill.ts:78]
7. V2 built-in tool layer 包含 `SkillTool.layer`；MCP/plugin transforms 是否属于这个 static built-in layer 不由本节点源码证明，按 V2 tool 注入设计另行处理。[E: packages/core/src/tool/builtins.ts:39] [I]

## V1 / V2 差异表

| 维度 | V1 | V2 |
| --- | --- | --- |
| 主实现 | `packages/opencode/src/skill/index.ts` 的 singleton service。 | `packages/core/src/skill.ts` 的 Effect service。 |
| source 类型 | implicit disk scan + config paths/urls。 | explicit `Directory`/`Url`/`Embedded` sources。 |
| 远程安全 | cache + index 下载；路径安全较少显式建模。[I] | segment/path containment checks 是独立逻辑。 |
| guidance | V1 skill availability 通过 service `available(agent)` 查询。 | V2 用 SystemContext 渲染增量 guidance。 |
| tool body | `tool/skill.ts` 直接输出 skill content + sampled files。 | `core/src/tool/skill.ts` 输出结构化 `Output` 并转 model output。 |

## 设计动机与权衡

两代都避免把所有 skill body 默认塞进 prompt：V1 用 `skill` tool 按 name 加载完整内容，V2 更明确地把 guidance 和 content loading 分离。[I] V1 tool 输出完整 content 的行为在 `packages/opencode/src/tool/skill.ts`，V2 guidance 只渲染 name/description 的行为在 `packages/core/src/skill/guidance.ts`。[E: packages/opencode/src/tool/skill.ts:46] [E: packages/core/src/skill/guidance.ts:54]

V2 source abstraction 是为了让 plugin/config/embedded skill 都能进入同一 list pipeline。[I] `SkillV2.Source` 的 equals/key 实现把不同来源标准化成 identity，state transform 用 equals 去重，list cache 用 key 缓存。[E: packages/core/src/skill.ts:32] [E: packages/core/src/skill.ts:39] [E: packages/core/src/skill.ts:94] [E: packages/core/src/skill.ts:143]

## 易踩坑

- V1 `available(agent)` 会按 `Permission.evaluate("skill", skill.name, agent.permission)` 过滤，不是简单返回所有 skill。[E: packages/opencode/src/skill/index.ts:314]
- V2 `available` 使用 `PermissionV2.evaluate("skill", skill.name, agent.permissions)`，permission object 名称和返回字段都不同于 V1。[E: packages/core/src/skill.ts:57]
- V1 `.claude` skills 会被 `disableClaudeCodeSkills` 控制，`.agents` skills 会被 `disableExternalSkills` 控制。[E: packages/opencode/src/skill/index.ts:185]
- V2 root-level `foo.md` 可以成为 skill；nested file 若没有 frontmatter name 会被跳过，glob pattern 仍只覆盖 root `*.md` 与 nested `SKILL.md`。[E: packages/core/src/skill.ts:106] [E: packages/core/src/skill.ts:116] [E: packages/core/src/skill.ts:122]
- skill 与 command 有交叉：V1 commands service 会把没有同名 command 的 skill 暴露为 slash command；具体 command bridge 在 `integrations.commands` 节点描述。[E: packages/opencode/src/command/index.ts:142]

## Sources

- packages/opencode/src/skill/index.ts
- packages/opencode/src/skill/discovery.ts
- packages/opencode/src/tool/skill.ts
- packages/opencode/src/command/index.ts
- packages/core/src/skill.ts
- packages/core/src/skill/discovery.ts
- packages/core/src/skill/guidance.ts
- packages/core/src/tool/skill.ts
- packages/core/src/tool/builtins.ts
- packages/core/src/v1/config/skills.ts
- packages/core/src/config.ts

## 相关

- tool.skill
- integrations.commands
