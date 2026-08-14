---
id: surface.tools.skill
title: skill
kind: tool
tier: T1
pkg: context
source:
  - packages/skill/tool-skill/src/index.ts
  - packages/skill/tool-skill/package.json
  - packages/skill/tool-skill/tests/tool-skill.spec.ts
  - packages/skill/skill/src/index.ts
  - packages/skill/skill/package.json
  - packages/skill/skill-filesystem/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/session/src/surface.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - skill
  - apply
  - inject
  - Config
  - SkillCatalogSource
  - isModelInvocable
  - isSkillName
  - renderSkillContent
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - subsys.context.skills
  - surface.skills.system
  - surface.presets.code
  - surface.presets.cordis
  - spine.trace-code-mode
evidence: explicit
status: verified
updated: 47f943859b
---

> `skill` 是 `@deepseek-ai/dsh-tool-skill` 向模型注册的 skill 正文加载器：wire 名 `'skill'`，参数只有 `name`；catalog 是 durable `user/message`（`source.kind: 'skill-catalog'`），与 schema **同生共死**。

## 能回答的问题

- `skill` 的 wire `name`、实现包、`inject` 和 `ctx.tools.register(defineTool(...))` 注册点在哪？
- 模型可见字段是不是只有 `name`？`catalogDescriptionMaxLength` 会不会进 schema？
- catalog 以什么 `source.kind` 落进 session？谁过滤 `isModelInvocable`？restrict / 同名 shadow 会不会一并拿走 catalog？
- `execute()` 何时拒 `Bad_Name`、未知名、`disable-model-invocation`？会不会在 list 阶段就挡住 provider `get()`？
- 四个 shipped preset 谁装 `tool-skill`？`minimal` 为什么没有 loader？`code` 会话模型能不能直调 `skill`？
- `/name` 手势和 `skill` 工具是不是同一条入口？`disable-model-invocation` 还能不能被用户点名注入？

## Identity

模型看见的工具名是字面量 `'skill'`，由 `apply()` 里的 `defineTool({ name: 'skill', … })` 交给 `ctx.tools.register`。[E: packages/skill/tool-skill/src/index.ts:82][E: packages/skill/tool-skill/src/index.ts:161]

实现包是 `@deepseek-ai/dsh-tool-skill`。Cordis 插件名 `export const name = 'tool-skill'`，`inject = ['agents', 'tools', 'skills']`。缺其中任一服务时这一行不会 `apply`（catalog 与 schema 都不会出现）；`agents` 是因为两条 listener 挂在 `agent/pre-step`。[E: packages/skill/tool-skill/package.json:2][E: packages/skill/tool-skill/src/index.ts:24][E: packages/skill/tool-skill/src/index.ts:25][I]

插件默认 Config 只有一个部署键 `catalogDescriptionMaxLength`（默认 `500`，下限 `3`）。它裁的是 **session catalog 摘要**，不是工具参数。[E: packages/skill/tool-skill/src/index.ts:27][E: packages/skill/tool-skill/src/index.ts:68][E: packages/skill/tool-skill/src/index.ts:79]

单测钉死：挂上插件后 `ctx.tools.schemas()` 只有 `['skill']`；`dispose` 后 schema 与 catalog 一起消失；`presentCall({ name })` 是 `{ card: 'generic', title: 'Load skill …', kind: 'read', rawInput: name }`。[E: packages/skill/tool-skill/tests/tool-skill.spec.ts:171][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:180][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:173]

`defineTool({ name: 'skill', … })` **没有** `timeoutMs`，也 **没有** `isConcurrencySafe`。host `@deepseek-ai/dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`；registry `executionMode` 对未声明的分类器走 `exclusive`。[E: packages/guard/timeout-policy/src/index.ts:59][E: packages/core/tools/src/index.ts:1278]

## 用途定位

`skill` 只做一件事：按 **精确 kebab-case 名** 从 `ctx.skills` 取出一份 `isModelInvocable` 的完整定义，把 `content` 包成规范 `<skill_content>` 块还给模型。它不扫描磁盘、不解析 `SKILL.md` frontmatter、不执行 skill 正文里的步骤。[E: packages/skill/tool-skill/src/index.ts:83][E: packages/skill/skill/src/index.ts:128]

模型怎么知道有哪些名字？同一插件在 `agent/pre-step` 注入一条 durable `user/message`，`source.kind === 'skill-catalog'`、`form: 'catalog'`，正文是 `<available_skills>` 摘要列表。catalog **不是** `systemPrompt` section：`assemble()` 的 prompt 文本里没有 `<available_skills>`。[E: packages/skill/tool-skill/src/index.ts:35][E: packages/skill/tool-skill/src/index.ts:272][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:302]

catalog 与 schema 用 **定义对象身份** 绑死：`ctx.tools.get(skillTool.name, agent) === skillTool` 为假时（`restrict({ deny: ['skill'] })`，或 scoped 同名 shadow）本步不发 catalog。反过来，一个只是碰巧名叫 `skill` 的外来工具也继承不到这份 guidance。[E: packages/skill/tool-skill/src/index.ts:220][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:719][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:742]

catalog 只列 `isModelInvocable` 的摘要：`name` + 归一化后截断的 `description`。`whenToUse`、`source`、`resourceBase`、正文、以及 `modelInvocable: false` 的 skill（含 frontmatter `disable-model-invocation: true`）都不进列表。[E: packages/skill/tool-skill/src/index.ts:226][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:297][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:301]

`disable-model-invocation` 技能仍可能走 **用户手势** `/<name>`（`isUserInvocable`）：那是同插件的另一条 `agent/pre-step` listener，注入 `source.kind === 'skill-invocation'` 的 instructions，**不是** 模型调 `skill` 工具。[E: packages/skill/tool-skill/src/index.ts:196][E: packages/skill/skill-filesystem/src/index.ts:999]

## 输入 schema

以插件**默认 Config** boot 后的模型可见参数为准。`parameters` 只有一个字段；`defineTool` 把它编进 JSON Schema `required`。[E: packages/skill/tool-skill/src/index.ts:85][E: packages/core/tools/src/schema.ts:295]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `name` | `string` | 是 | 无 | schema 只要 string；`execute` 再跑 `isSkillName`（`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`） | 必须与 session catalog 里的精确 skill 名一致。`Bad_Name`、空串、带下划线的名字在 body 里抛 `invalid skill name "…"`。[E: packages/skill/tool-skill/src/index.ts:85][E: packages/skill/skill/src/index.ts:20][E: packages/skill/tool-skill/src/index.ts:129] |

没有 `sandbox_permissions` / `justification` / timeout / version 一类广告字段。

**Config 不改字段名、不进 schema。** 唯一键：

| Config 键 | 默认 | 作用 |
|---|---|---|
| `catalogDescriptionMaxLength` | `DEFAULT_CATALOG_DESCRIPTION_MAX_LENGTH` = `500` | catalog 行里 description 先把空白压成单空格再截断；短于下限 `3` 的整数让 `apply()` 抛错，插件 load 失败。[E: packages/skill/tool-skill/src/index.ts:68][E: packages/skill/tool-skill/src/index.ts:393][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:757] |

四个 shipped preset 的 `tool-skill` 行都没有 `config:`，产品默认就是这张表。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:87]

## 输出 & 截断 / spill

`execute` 返回的规范值是封闭 object：`name`、`provider` 必填；`content` 必填（provider 给出的 instruction body）；`resourceBase` 仅在定义带了它时展开，三选一 `directory.path` / `url.url` / `opaque.description`。[E: packages/skill/tool-skill/src/index.ts:148][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:777]

registry 用 `output.schema`（`additionalProperties: false`）校验后再调用 `render`。模型看见的不是裸 JSON，而是 `renderSkillContent` 的同一套标记——用户手势注入也走这个函数，两条路径形状一致：[E: packages/skill/tool-skill/src/index.ts:125][E: packages/skill/skill/src/index.ts:171]

```
<skill_content name="…">
<skill_resources>
…provider / directory / url / opaque 提示…
</skill_resources>

<skill_instructions>
{content 原文}
</skill_instructions>
</skill_content>
```

`resourceBase` 缺省时提示 `Resources for this skill are managed by provider "…"`。未知 `kind` 过不了 output schema / `assertNever`，结果是 `isError` + `INVALID_TOOL_OUTPUT`，不会把 rogue 形状泄漏给模型。[E: packages/skill/skill/src/index.ts:190][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:855]

`skill` **没有** spill：不读 `ctx.spillStore`，也不按字符帽切正文。catalog 的 500 字截断只作用于摘要行，不影响 `content`。body-only 编辑（description 不变）不会重发 catalog，下一次 `skill` 调用会读到最新正文。[E: packages/skill/tool-skill/tests/tool-skill.spec.ts:629][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:639]

失败走 registry `toolErrorResult`：`content` 为 `Error: <message>`。[E: packages/core/tools/src/index.ts:1874]

| 条件 | 文案要点 |
|---|---|
| 名不过 `isSkillName` | `invalid skill name "…"` [E: packages/skill/tool-skill/src/index.ts:129] |
| list 里没有，或 `get()` 返回 `undefined` | `skill "…" is unknown or no longer available` [E: packages/skill/tool-skill/src/index.ts:136][E: packages/skill/tool-skill/src/index.ts:143] |
| summary 或 loaded definition 的 `modelInvocable === false` | `skill "…" is not available for model invocation`（`get()` 之前就挡，正文不会出现在错误里）[E: packages/skill/tool-skill/src/index.ts:139][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:943] |

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `@deepseek-ai/dsh-skill` 的 `SkillRegistry`（`super(ctx, 'skills')`）：`list` / `snapshot` / `get` / `register` / `registerProvider`，事件 `skills/change`。[E: packages/skill/skill/src/index.ts:376][E: packages/skill/skill/package.json:2] |
| Provider | 默认本地扫描 `@deepseek-ai/dsh-skill-filesystem`（`ctx.skills.registerProvider`，默认 `providerName: 'filesystem'`）。运行时还可以 `ctx.skills.register(...)` 注入 `provider: 'runtime'`。远程 / 包内 registry 只要实现 `SkillProvider` 就能换掉磁盘扫描，工具 schema 不动。[E: packages/skill/skill-filesystem/src/index.ts:132][E: packages/skill/skill-filesystem/src/index.ts:77] |
| Consumer | `@deepseek-ai/dsh-tool-skill` 的 `skill` 工具 + 两条 `agent/pre-step` listener（catalog、`/name` 手势）。[E: packages/skill/tool-skill/src/index.ts:25] |

`execute` / catalog 实际调用：

1. `ctx.skills.list(lookup)` / `ctx.skills.snapshot(lookup)` — `lookup = { cwd: exec.agent?.session.header.cwd, signal: exec.signal, scope: exec.agent }`。`scope` 选 layered registry（host 全局层 + 该 agent 的 preset standing 链）；`cwd` 只传给 provider 选 project 根。[E: packages/skill/tool-skill/src/index.ts:133][E: packages/skill/skill/src/index.ts:471]
2. `ctx.skills.get(name, lookup)` — 把 winning candidate 的 opaque `locator` 交回该 provider 的 `get()`。[E: packages/skill/tool-skill/src/index.ts:141][E: packages/skill/skill/src/index.ts:508]
3. `isModelInvocable` — Consumer 边界，不是 registry 过滤。`list()` 返回 invocation-neutral 摘要；工具和 catalog 自己 `.filter(isModelInvocable)` / 二次检查 loaded definition。[E: packages/skill/skill/src/index.ts:128][E: packages/skill/tool-skill/src/index.ts:226]

换 provider 会带走：skill 从哪来、`resourceBase` 形态、frontmatter 方言（`disable-model-invocation` / `user-invocable` 是 filesystem 解析器的键）、watch / 失效。不会带走：wire 名、单字段 schema、`<skill_content>` 形状、catalog 的 `kind: 'skill-catalog'` 合同。

filesystem 扫描根（点到为止，细节在 skills 子系统）：`includeDefaultRoots` 默认打开时，project `<root>/.dsh/skills`（rank `100`）与 `<root>/.agents/skills`（`200`），然后 `customSkillDirs`（`CUSTOM_RANK = 300`），再 user `$DSH_HOME/skills` / `~/.agents/skills`，最后 bundled。同层按 `rank` 升序取第一个同名；跨层按 global → 远 ancestor → 近 scope 依次 `Map.set`，近层同名覆盖远层。[E: packages/skill/skill-filesystem/src/index.ts:246][E: packages/skill/skill-filesystem/src/index.ts:250][E: packages/skill/skill-filesystem/src/index.ts:38][E: packages/skill/skill/src/index.ts:808][E: packages/skill/skill/src/index.ts:563]

`skill` 不消费 `ctx.fs` / `ctx.shell` / `ctx.approval` / `ctx.sandboxPolicy`。Sandbox 只罩文件副作用；本工具没有 per-call sandbox stamp。

## 执行管线

模型发出 `skill` 后，loop 经 `ctx.tools.execute` 进入 registry：`tools/pre-execute` → monotonic `guard` → `tools/execute`（around-dispatch）→ 工具 body → `tools/post-execute` → `output.render`。[E: packages/core/tools/src/index.ts:1342][E: packages/core/tools/src/index.ts:1476][E: packages/core/tools/src/index.ts:1574]

对本工具的挂点：

- **`tools/pre-execute`**：`skill` 自己不注册 listener，也不 `ask`。waterfall 默认 `{ kind: 'allow' }`，不会走到 `ctx.approval`。[E: packages/core/tools/src/index.ts:1477]
- **调度**：未声明 `isConcurrencySafe` → `exclusive`，不会与另一条 exclusive 调用重叠。[E: packages/core/tools/src/index.ts:1278]
- **`tools/execute` 包装**：
  - `session-checkpoint-policy` 仅在「有 `exec.agent` 且 `exec.parent === undefined`」时 `flush` session，再 `next()`。[E: packages/session/session-checkpoint-policy/src/index.ts:71][E: packages/session/session-checkpoint-policy/src/index.ts:72]
  - `timeout-policy` 读 `definition.timeoutMs`；`skill` 未声明，直接 `next()`。[E: packages/guard/timeout-policy/src/index.ts:59]
- **body**：`defineTool` 先 `validateArgs`（缺 `name` → `INVALID_ARGS`），再进 `apply` 里的 `execute`。取消信号经 `exec.signal` 传给 `list` / `get`。[E: packages/core/tools/src/schema.ts:586][E: packages/skill/tool-skill/src/index.ts:127]
- **`tools/post-execute`**：本工具不注册 listener，默认 `accept`。规范值由 `createSuccessResult` 冻结后 `render`。[E: packages/core/tools/src/index.ts:1745][E: packages/core/tools/src/index.ts:1800]
- **sandbox / approval**：不挂。

**catalog 不走工具管线。** 它是 `agent/pre-step` waterfall 往 `decision.messages` 追加的 `UserMessage`。`ReactLoopAgent` 在 `step/start` 之后对每条 `decision.messages` 做 `session.append('user/message', …, { surfaceOp: 'append' })`，于是它进入 `SURFACE_EVENT_TYPES`，随后 `deriveMessages()` 看得到。[E: packages/skill/tool-skill/src/index.ts:246][E: packages/core/agent-loop/src/agent.ts:283][E: packages/core/session/src/surface.ts:16]

Code Mode 下模型不能直呼 `skill`：非嵌套且 `mode === 'code'` 时，`collapses()` 为真，`createExecution` 在 `if (collapsed)` 处直接 `final-result`，**不进** `tools/pre-execute`。SDK 子分发带 `parent`（`nested === true`）不 collapse，仍走完整守卫；checkpoint 在 `exec.parent !== undefined` 时直接 `next()`。[E: packages/core/tools/src/index.ts:1325][E: packages/core/tools/src/index.ts:1381][E: packages/core/tools/src/index.ts:1423][E: packages/session/session-checkpoint-policy/src/index.ts:71][E: apps/cli/tests/web-agent-presets.e2e.ts:301]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`，不以 package 存在为准。仓库里有 `@deepseek-ai/dsh-tool-skill` ≠ 每个会话都装 loader。

| preset | 装 `@deepseek-ai/dsh-tool-skill`？ | `disabled` | isolate | shipped Config | 说明 |
|---|---|---|---|---|---|
| `minimal` | **否** | — | — | — | yml 没有 `tool-skill` / `skill-filesystem` 行。e2e 装配工具表是 `['bash', 'str_replace_editor']`。全局 `ctx.skills` 层仍可读，只是没有模型可见 loader。[E: apps/cli/tests/web-agent-presets.e2e.ts:227][E: apps/cli/tests/web-agent-presets.e2e.ts:397] |
| `standard` | **是** | 无 | 无 | 无 `config:` | `- id: tool-skill` / `name: '@deepseek-ai/dsh-tool-skill'`，紧跟无 `customSkillDirs` 的 `skill-filesystem`。e2e catalog 含 `'skill'`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:86][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:87][E: apps/cli/tests/web-agent-presets.e2e.ts:208] |
| `code` | **是** | 无 | 无 | 无 `config:` | 与 `standard` 同一对行。`tool-presentation` `mode: code` 只改呈现：模型直调的 **唯一** wire 工具是 `run_code`；`skill` 仍注册，供 SDK `await tools.skill({ name })` 重入。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:93][E: apps/cli/config/agent-presets/code/agent.cordis.yml:94][E: apps/cli/tests/web-agent-presets.e2e.ts:301] |
| `cordis` | **是** | 无 | 无 | 无 `config:` | `tool-skill` 在文件末尾。配对的 `skill-filesystem` 多了 `customSkillDirs`（`!!js` 解析本 preset 的 `skills/`），所以本会话 catalog 会多出 `editing-cordis-compositions` 这类 preset-local 名；全局 `ctx.skills.list()` 看不到它们。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:261][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:259][E: apps/cli/tests/web-agent-presets.e2e.ts:274] |

`customSkillDirs` 默认 `[]`；只有 `cordis` 这份 shipped yml 覆盖它。那是 filesystem provider 的 Config，不是 `skill` 工具的 schema。[E: packages/skill/skill-filesystem/src/index.ts:81]

host `dsh-base` 也写了 `id: skill`（registry）和 `id: tool-skill`。web-app 把 host 面 `skill-filesystem` / `tool-skill` 设成 `disabled: true`，改由每会话 preset 再挂；registry 留在 host。因此 web 上的 `minimal` 会话没有 `skill` 工具。[E: packages/bundle/base/cordis.patch.yml:247][E: packages/bundle/web-app/cordis.patch.yml:333][E: packages/bundle/web-app/cordis.patch.yml:334]

## execute() 走读

符号：`apply` @ `packages/skill/tool-skill/src/index.ts`；`isSkillName` / `isModelInvocable` / `renderSkillContent` @ `packages/skill/skill/src/index.ts`。

1. **校验名字。** `defineTool.execute` 先按 schema 要 `name: string`。body 再 `isSkillName(args.name)`；失败立刻 throw，不碰 registry。[E: packages/core/tools/src/schema.ts:586][E: packages/skill/tool-skill/src/index.ts:128]

2. **按调用 agent 的视野查表。** `lookup = { cwd: exec.agent?.session.header.cwd, signal: exec.signal, scope: exec.agent }`。agent 自己就是 scope key，layered registry 看到的集合与该 agent 的 catalog 一致。preset 层 `register()` 的 skill，外层 agent 加载会 `unknown`。[E: packages/skill/tool-skill/src/index.ts:133][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:676]

3. **list 找 summary，先做模型门。** `(await ctx.skills.list(lookup)).find(skill => skill.name === args.name)`。没有 → `unknown or no longer available`。有但 `!isModelInvocable(summary)` → `not available for model invocation`，此时 **还没** 调 provider `get()`，正文不会进错误通道。[E: packages/skill/tool-skill/src/index.ts:134][E: packages/skill/tool-skill/src/index.ts:138][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:943]

4. **get 再取正文，再查一次门。** `ctx.skills.get(args.name, lookup)` 返回 `undefined`（文件消失、校验失败、name 漂移）→ 同一句 `unknown`。loaded definition 若 `modelInvocable` 已翻成 `false`（list/get 竞态），同样拒，且错误里不含 `content`。[E: packages/skill/tool-skill/src/index.ts:141][E: packages/skill/tool-skill/src/index.ts:145][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:948]

5. **投影规范值。** `{ name, provider, content }`，有 `resourceBase` 才展开浅拷贝。filesystem 成功路径的 `provider` 默认 `'filesystem'`，`resourceBase.kind === 'directory'`，`path` 是 skill 目录。[E: packages/skill/tool-skill/src/index.ts:148][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:779]

6. **registry 渲染。** `output.render` 调 `renderSkillContent`：名字走 `escapeAttr`，资源提示走 `escapeText`，`<skill_instructions>` 内嵌原文（本地 skill 按受信任内容处理）。[E: packages/skill/tool-skill/src/index.ts:125][E: packages/skill/skill/src/index.ts:174]

**catalog 侧（同插件，非 `execute`）：**

7. listener 先 `await next()`。`reject` 原样返回。然后用定义身份判断工具是否对本 agent 可见；不可见则当作空且 `complete` 的 snapshot，避免影子工具带着 shipped catalog。[E: packages/skill/tool-skill/src/index.ts:218][E: packages/skill/tool-skill/src/index.ts:220]

8. `snapshot.complete === false`（某 provider `list()` 抛错或声明 incomplete）时 **不改** 当前 messages：保留 last-good，等下一次 step 边界再试。[E: packages/skill/tool-skill/src/index.ts:225][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:706]

9. 过滤 `isModelInvocable`，用 `entries`（不是渲染散文）做 sha256 digest。surface 上已有相同 digest：本步不再追加。从未发布且当前列表为空：不发空 catalog。已发布后列表变空：发 `update: true` 的 tombstone（「No skills are currently available through the `skill` tool」）。[E: packages/skill/tool-skill/src/index.ts:228][E: packages/skill/tool-skill/src/index.ts:237][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:488]

10. 新 catalog / 替换 catalog 都是 `createUserMessage`，`source.kind: 'skill-catalog'`。digest 只看 `entries`；损坏的 durable `entries` 被当成「不是本插件的 catalog」，避免一步 listener 把整段会话打挂。[E: packages/skill/tool-skill/src/index.ts:272][E: packages/skill/tool-skill/src/index.ts:350]

## 设计动机·edge

- **摘要进 context，正文按需加载。** catalog 禁止模型「凭 description 自行脑补 instructions」；必须先 `skill` 再行动。这和把整份 `SKILL.md` 塞进 system prompt 的做法相反。
- **model-visible ⟺ logged。** catalog 是 `user/message`，不是 prompt section。compaction 若把旧 catalog 的 seq 移出 `session.surface.nodes`，`catalogHistory` 就找不到 `visibleDigest`，listener 会按 durable `entries` 再发一份当前列表。[E: packages/core/session/src/surface.ts:16][E: packages/skill/tool-skill/src/index.ts:374]
- **调用面分流。** 模型只能加载 `isModelInvocable`。`disable-model-invocation: true` 的 skill 对 `skill` 工具与 catalog 隐形，只留给用户 `/name` 手势（`source.kind === 'user'` 的文本才会被扫；外部 plugin 消息伪造不了）。[E: packages/skill/skill-filesystem/src/index.ts:996][E: packages/skill/tool-skill/src/index.ts:421]
- **同名 shadow 不能白嫖 catalog。** 比较的是 `=== skillTool`，不是字符串 `'skill'`。[E: packages/skill/tool-skill/src/index.ts:220]
- **分层视野。** `scope: exec.agent` 让 preset-local runtime skill / `customSkillDirs` 只对 join 了该 standing mount 的 agent 可见；另一个 cwd 的 agent 看不到这份 catalog。[E: packages/skill/tool-skill/tests/tool-skill.spec.ts:656][E: packages/skill/tool-skill/tests/tool-skill.spec.ts:657]
- **和 Claude / Codex「自动展开 skill」不同。** DSH 的模型路径是显式 tool-call；用户路径是手势注入，不是 slash command registry（命令是另一套 `ctx.commands`，在客户端先解析）。
- **Code Mode。** `code` preset 仍然装 `tool-skill`，但模型请求里只剩 `run_code`。要从程序里加载 skill，写 `await tools.skill({ name: '…' })`，带着 `parent` token 重入同一套 pre-execute / execute / post-execute。

## Sources

- packages/skill/tool-skill/src/index.ts
- packages/skill/tool-skill/package.json
- packages/skill/tool-skill/tests/tool-skill.spec.ts
- packages/skill/skill/src/index.ts
- packages/skill/skill/package.json
- packages/skill/skill-filesystem/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/session/src/surface.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) — `tools/pre-execute → execute → post-execute` 解剖；本页只写 `skill` 怎么进这条管线。
- [ref.tools-catalog](../../reference/tools-catalog.md) — 模型可见工具总表。
- [subsys.context.skills](../../subsystems/context/skills.md) — `ctx.skills` 分层合并、provider 合同、扫描根与 watch。
- [surface.skills.system](../skills/system.md) — skill 作为产品面（根、frontmatter、手势）的入口。
- [surface.presets.code](../presets/code.md) — `code` / PTC：`tool-skill` 行仍在，wire 只剩 `run_code`。
- [surface.presets.cordis](../presets/cordis.md) — `customSkillDirs` 把 preset `skills/` 铺进该 standing 层。
- [spine.trace-code-mode](../../spine/trace-code-mode.md) — Code Mode 一轮里 SDK 子调用如何带 `parent` 重入守卫。
