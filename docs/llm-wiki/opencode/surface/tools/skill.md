---
id: tool.skill
title: Skill 工具
kind: tool
tier: T1
v: shared
source: [packages/opencode/src/tool/skill.ts, packages/opencode/src/tool/skill.txt, packages/opencode/src/tool/registry.ts, packages/opencode/src/skill/index.ts, packages/core/src/tool/skill.ts, packages/core/src/skill.ts, packages/core/src/plugin.ts, packages/core/src/plugin/internal.ts, packages/core/src/plugin/host.ts, packages/core/src/plugin/skill.ts, packages/core/src/config/plugin/skill.ts, packages/core/src/tool/builtins.ts, CONTEXT.md]
symbols: [SkillTool, Skill, SkillV2]
related: [integrations.skills, ref.tool-catalog]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Skill 工具按 skill name 加载 `SKILL.md` 指令正文和同目录资源索引；V1 从 `Skill.Service.require()` 读取，V2 从 `SkillV2.Service.list()` 当前结果中查找。

## 能回答的问题

- `skill` 工具输入字段是什么，输出格式包含哪些 section？
- V1/V2 如何做 skill permission？
- V1 与 V2 的 skill discovery/source model 有什么差异？
- 为什么 skill body 不直接出现在 system context？
- V2 skill sources 现在由哪些 plugin flow 注册？

## V1

### 1 Identity

V1 `SkillTool` 通过 `Tool.define("skill", ...)` 注册，registry 初始化 `skilltool` 并把 `tool.skill` 放入 builtin 列表。[E: packages/opencode/src/tool/skill.ts:12][E: packages/opencode/src/tool/skill.ts:13][E: packages/opencode/src/tool/registry.ts:106][E: packages/opencode/src/tool/registry.ts:209][E: packages/opencode/src/tool/registry.ts:231]

### 2 用途定位

V1 prompt 规定：当任务匹配 system prompt 中列出的 skill 时，用 `skill` 工具把 skill instructions 和同目录资源引用注入当前 conversation；skill name 必须匹配 system prompt 中列出的技能。[E: packages/opencode/src/tool/skill.txt:1][E: packages/opencode/src/tool/skill.txt:3][E: packages/opencode/src/tool/skill.txt:5]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `name` | `string` | 是 | 无 | 必须能被 `Skill.Service.require(name)` 找到 | 要加载的 skill name。[E: packages/opencode/src/tool/skill.ts:8][E: packages/opencode/src/tool/skill.ts:9][E: packages/opencode/src/tool/skill.ts:23][E: packages/opencode/src/tool/skill.ts:24] |

### 4 输出 & 大小/截断限制

V1 输出是 `<skill_content name="...">` 包裹的文本，包含 `# Skill: <name>`、skill content、base directory、relative path 说明、sampled `<skill_files>` 列表。[E: packages/opencode/src/tool/skill.ts:48][E: packages/opencode/src/tool/skill.ts:49][E: packages/opencode/src/tool/skill.ts:51][E: packages/opencode/src/tool/skill.ts:53][E: packages/opencode/src/tool/skill.ts:54][E: packages/opencode/src/tool/skill.ts:55][E: packages/opencode/src/tool/skill.ts:58] metadata 保存 `name` 和计算出的 `dir = path.dirname(info.location)`。[E: packages/opencode/src/tool/skill.ts:34][E: packages/opencode/src/tool/skill.ts:63][E: packages/opencode/src/tool/skill.ts:64]

文件列表来自 ripgrep：cwd 是 `path.dirname(info.location)`，disk skill 时这就是 skill directory；built-in skill 的 `location` 是 `"<built-in>"`，这是一个需要调用方理解的 edge。[E: packages/opencode/src/tool/skill.ts:34][E: packages/opencode/src/skill/index.ts:281] ripgrep pattern 是 `!**/SKILL.md`，hidden true，follow false，limit 10；输出中每个 file 都用 absolute path。[E: packages/opencode/src/tool/skill.ts:37][E: packages/opencode/src/tool/skill.ts:38][E: packages/opencode/src/tool/skill.ts:39][E: packages/opencode/src/tool/skill.ts:40][E: packages/opencode/src/tool/skill.ts:41][E: packages/opencode/src/tool/skill.ts:42][E: packages/opencode/src/tool/skill.ts:58]

### 5 权限

V1 在确认 skill 存在后调用 `ctx.ask`，`permission: "skill"`，`patterns` 与 `always` 都是该 skill name。[E: packages/opencode/src/tool/skill.ts:23][E: packages/opencode/src/tool/skill.ts:27][E: packages/opencode/src/tool/skill.ts:28][E: packages/opencode/src/tool/skill.ts:29][E: packages/opencode/src/tool/skill.ts:30]

### 6 execute() 走读

1. `SkillTool.execute` 调 `skill.require(params.name)`；NotFoundError 会变成 defect error，其 message 包含 available skill 列表。[E: packages/opencode/src/tool/skill.ts:23][E: packages/opencode/src/tool/skill.ts:25][E: packages/opencode/src/skill/index.ts:73][E: packages/opencode/src/skill/index.ts:78]
2. permission 通过后，V1 计算 `path.dirname(info.location)` 并用这个目录做 file sampling 的 cwd。[E: packages/opencode/src/tool/skill.ts:34][E: packages/opencode/src/tool/skill.ts:37]
3. V1 skill service discovery 会扫描外部 `.claude`/`.agents`、config directories、`cfg.skills.paths` 和 `cfg.skills.urls`。[E: packages/opencode/src/skill/index.ts:187][E: packages/opencode/src/skill/index.ts:188][E: packages/opencode/src/skill/index.ts:193][E: packages/opencode/src/skill/index.ts:201][E: packages/opencode/src/skill/index.ts:205][E: packages/opencode/src/skill/index.ts:207][E: packages/opencode/src/skill/index.ts:211][E: packages/opencode/src/skill/index.ts:219][E: packages/opencode/src/skill/index.ts:222][E: packages/opencode/src/skill/index.ts:225]
4. V1 先把内建 `customize-opencode` skill 写入 `s.skills`，再调用 `loadSkills()` 加载 disk discovery；如果 disk discovery 里有同名 skill，后写入的记录会覆盖前者。[E: packages/opencode/src/skill/index.ts:278][E: packages/opencode/src/skill/index.ts:282][E: packages/opencode/src/skill/index.ts:284][E: packages/opencode/src/skill/index.ts:134][I]
5. V1 `Skill.available(agent)` 会按 `Permission.evaluate("skill", skill.name, agent.permission)` 过滤被 deny 的 skill。[E: packages/opencode/src/skill/index.ts:310][E: packages/opencode/src/skill/index.ts:314]

## V2

### 1 Identity

V2 `SkillTool` name 是 `"skill"`，通过 `[name]: Tool.make(...)` 注册；`BuiltInTools.node` 把 `SkillTool.node` 放入 V2 内建工具节点列表。[E: packages/core/src/tool/skill.ts:14][E: packages/core/src/tool/skill.ts:64][E: packages/core/src/tool/skill.ts:65][E: packages/core/src/tool/builtins.ts:42]

### 2 用途定位

V2 description 与 V1 语义一致：当任务匹配 available skills 时加载 specialized skill，把 instructions 和 scripts/files references 注入当前 conversation。[E: packages/core/src/tool/skill.ts:28][E: packages/core/src/tool/skill.ts:30][E: packages/core/src/tool/skill.ts:32] V2 design note 说明 selected-agent available-skill guidance 只列 permitted skill 的 names/descriptions；skill bodies 和 locations 只通过 permission-checked `skill` tool 暴露。[E: CONTEXT.md:122]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `name` | `string` | 是 | 无 | 必须匹配当前 `SkillV2.Service.list()` 中某个 skill name | 要加载的 skill name。[E: packages/core/src/tool/skill.ts:17][E: packages/core/src/tool/skill.ts:18][E: packages/core/src/tool/skill.ts:72][E: packages/core/src/tool/skill.ts:73] |

### 4 输出 & 大小/截断限制

V2 output schema 是 `{ name, directory, output }`，`toModelOutput` 只把 `output.output` 作为 text 发给模型。[E: packages/core/src/tool/skill.ts:21][E: packages/core/src/tool/skill.ts:22][E: packages/core/src/tool/skill.ts:23][E: packages/core/src/tool/skill.ts:24][E: packages/core/src/tool/skill.ts:69] `toModelOutput()` 的文本结构与 V1 同形[I]，也包含 `<skill_content>`、base directory、sampled `<skill_files>`。[E: packages/core/src/tool/skill.ts:35][E: packages/core/src/tool/skill.ts:38][E: packages/core/src/tool/skill.ts:43][E: packages/core/src/tool/skill.ts:45][E: packages/core/src/tool/skill.ts:47][E: packages/core/src/tool/skill.ts:50]

### 5 权限

V2 在找到 skill 后调用 `PermissionV2.assert`，`action: "skill"`，`resources` 和 `save` 都是 `[skill.name]`，source 携带 message/call id。[E: packages/core/src/tool/skill.ts:14][E: packages/core/src/tool/skill.ts:76][E: packages/core/src/tool/skill.ts:77][E: packages/core/src/tool/skill.ts:78][E: packages/core/src/tool/skill.ts:79][E: packages/core/src/tool/skill.ts:82]

### 6 execute() 走读

1. V2 `SkillTool.node` 不再等待旧 `PluginBoot`；它直接声明对 `ToolRegistry.node`、`FSUtil.node`、`SkillV2.node`、`PermissionV2.node` 的依赖，并在 layer 中取得这些服务后注册工具。[E: packages/core/src/tool/skill.ts:59][E: packages/core/src/tool/skill.ts:61][E: packages/core/src/tool/skill.ts:62][E: packages/core/src/tool/skill.ts:64][E: packages/core/src/tool/skill.ts:108]
2. execute 调 `skills.list()`，再按 exact `skill.name === input.name` 查找；找不到时返回 `ToolFailure({ message: "Unable to load skill <name>" })`。[E: packages/core/src/tool/skill.ts:72][E: packages/core/src/tool/skill.ts:73][E: packages/core/src/tool/skill.ts:74][E: packages/core/src/tool/skill.ts:55]
3. 只有 `skill.location` basename 是 `SKILL.md` 时，V2 才 glob 同目录文件；glob pattern 是 `**/*`，absolute true，include file，dot true，然后排除 `SKILL.md`、排序、取前 10 个。[E: packages/core/src/tool/skill.ts:86][E: packages/core/src/tool/skill.ts:87][E: packages/core/src/tool/skill.ts:88][E: packages/core/src/tool/skill.ts:89][E: packages/core/src/tool/skill.ts:90]
4. V2 `SkillV2` source model 支持 directory/url/embedded 三类 source；`list()` 遍历当前 state sources，把每个 source 加载出的 skills 按 name 放进 Map，后者会覆盖前者同名项。[E: packages/core/src/skill.ts:15][E: packages/core/src/skill.ts:18][E: packages/core/src/skill.ts:21][E: packages/core/src/skill.ts:110][E: packages/core/src/skill.ts:112][E: packages/core/src/skill.ts:116][I]
5. V2 builtin/internal plugin flow 注册 skill sources：`PluginInternal` boot 会 add `SkillPlugin` 与 `ConfigSkillPlugin`，前者注册 embedded `customize-opencode`，后者从 config directories 和 `skills` entries 注册 directory/url sources。[E: packages/core/src/plugin/internal.ts:113][E: packages/core/src/plugin/internal.ts:117][E: packages/core/src/plugin/skill.ts:16][E: packages/core/src/plugin/skill.ts:18][E: packages/core/src/config/plugin/skill.ts:24][E: packages/core/src/config/plugin/skill.ts:25][E: packages/core/src/config/plugin/skill.ts:35][E: packages/core/src/config/plugin/skill.ts:36]
6. V2 plugin host 还把 third-party plugin `ctx.skill.transform()` 映射到 `SkillV2.Source` decode 后的 `draft.source(...)`，因此 plugin runtime 可以贡献 skill sources。[E: packages/core/src/plugin/host.ts:208][E: packages/core/src/plugin/host.ts:210][E: packages/core/src/plugin/host.ts:213]
7. V2 `SkillV2.available()` 也按 `PermissionV2.evaluate("skill", skill.name, agent.permissions)` 过滤 deny。[E: packages/core/src/skill.ts:30][E: packages/core/src/skill.ts:31]

## V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 发现入口 | V1 服务自己扫描 `.claude`/`.agents`、config dirs、paths、urls。[E: packages/opencode/src/skill/index.ts:187][E: packages/opencode/src/skill/index.ts:188][E: packages/opencode/src/skill/index.ts:205][E: packages/opencode/src/skill/index.ts:211][E: packages/opencode/src/skill/index.ts:222][E: packages/opencode/src/skill/index.ts:225] | V2 通过 `SkillV2.Source` 管理 directory/url/embedded sources，builtin/config/third-party plugin flow 向 `SkillV2` 写入 sources。[E: packages/core/src/skill.ts:15][E: packages/core/src/skill.ts:18][E: packages/core/src/skill.ts:21][E: packages/core/src/plugin/internal.ts:113][E: packages/core/src/plugin/internal.ts:117][E: packages/core/src/plugin/host.ts:213] |
| 工具注册前置 | V1 直接使用 `Skill.Service` 当前状态。[E: packages/opencode/src/tool/skill.ts:15][E: packages/opencode/src/tool/skill.ts:23] | V2 直接注册为 Location-scoped tool node，运行时从当前 `SkillV2.Service.list()` 读取 sources 的加载结果。[E: packages/core/src/tool/skill.ts:61][E: packages/core/src/tool/skill.ts:64][E: packages/core/src/tool/skill.ts:72][E: packages/core/src/tool/skill.ts:108] |
| 文件列表 | V1 用 Ripgrep `find` sample 10 个 non-SKILL 文件。[E: packages/opencode/src/tool/skill.ts:36][E: packages/opencode/src/tool/skill.ts:38][E: packages/opencode/src/tool/skill.ts:42] | V2 用 FSUtil glob、排序、slice 前 10 个。[E: packages/core/src/tool/skill.ts:87][E: packages/core/src/tool/skill.ts:89][E: packages/core/src/tool/skill.ts:90] |
| 错误 | V1 NotFound 被转成 defect error。[E: packages/opencode/src/tool/skill.ts:25] | V2 NotFound/permission/glob 等 expected path 映射为 `ToolFailure`。[E: packages/core/src/tool/skill.ts:55][E: packages/core/src/tool/skill.ts:74][E: packages/core/src/tool/skill.ts:97] |

## 设计动机·edge·历史

V2 的 system-context 设计有意只在 baseline 中暴露 skill name/description，而不暴露 body/location；实际 body 必须经 permission-checked `skill` tool 才可见，这把“知道有某 skill”与“读取 skill 内容和资源路径”分成两层权限边界。[E: CONTEXT.md:122][I]

## Sources

- packages/opencode/src/tool/skill.ts
- packages/opencode/src/tool/skill.txt
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/skill/index.ts
- packages/core/src/tool/skill.ts
- packages/core/src/skill.ts
- packages/core/src/plugin.ts
- packages/core/src/plugin/internal.ts
- packages/core/src/plugin/host.ts
- packages/core/src/plugin/skill.ts
- packages/core/src/config/plugin/skill.ts
- packages/core/src/tool/builtins.ts
- CONTEXT.md

## 相关

- [Skills 集成](../../subsystems/integrations/skills.md)
- [全工具字段 catalog](../../reference/tool-catalog.md)
