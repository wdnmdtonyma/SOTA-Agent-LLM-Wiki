---
id: surface.tools.workspace-dependencies
title: load_workspace_dependencies
kind: tool
tier: T1
pkg: context
source:
  - packages/skill/tool-workspace-dependencies/src/index.ts
  - packages/skill/tool-workspace-dependencies/package.json
  - packages/skill/tool-workspace-dependencies/tests/tool-workspace-dependencies.spec.ts
  - packages/core/tools/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
symbols:
  - load_workspace_dependencies
  - apply
  - Config
  - name
  - inject
  - parsePrimaryRuntime
  - resolvePrimaryRuntime
  - installPrimaryRuntime
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - subsys.context.skills
  - subsys.composition.bundle-sdk-app
  - surface.presets.standard
  - surface.presets.code
evidence: explicit
status: verified
updated: 477b4f4205
---

> 模型可见名 `load_workspace_dependencies`；实现包 `@deepseek-ai/dsh-tool-workspace-dependencies`（Cordis 插件名 `tool-workspace-dependencies`）。一次无参查询返回捆绑 Python（以及可选 Node/pnpm）的绝对路径与发行版本。`dsh-sdk-app` 在 `DSH_PRIMARY_RUNTIME` / `DSH_BUNDLED_PRIMARY_RUNTIME` 有值时挂上；四个 shipped web preset **默认不挂**。

## 能回答的问题

- 模型目录里的 `load_workspace_dependencies` 是哪个包、哪个 Cordis 插件名、`inject` 要什么？
- 输入有没有字段？`source` / `root` 是 schema 还是 Config？
- 第一次调用会不会拷贝 payload？不设 `root` 时呢？
- 背后走哪条 seam？`ctx.fs` / `ctx.skills` 吃不吃？
- `minimal` / `standard` / `ptc` / `cordis` 谁装本包？sdk-app 怎样用环境变量门控？
- 会不会改 `PATH` 或装用户包？

## Identity

| 面 | 值 |
|---|---|
| wire `name` | `load_workspace_dependencies` [E: packages/skill/tool-workspace-dependencies/src/index.ts:250] |
| 实现包 | `@deepseek-ai/dsh-tool-workspace-dependencies` [E: packages/skill/tool-workspace-dependencies/package.json:2] |
| Cordis 插件名 | `tool-workspace-dependencies` [E: packages/skill/tool-workspace-dependencies/src/index.ts:10] |
| `inject` | `['tools']` [E: packages/skill/tool-workspace-dependencies/src/index.ts:12] |
| 工厂 | `apply(ctx, config: Config)` [E: packages/skill/tool-workspace-dependencies/src/index.ts:240] |
| 注册 | `ctx.tools.register(defineTool({ name: 'load_workspace_dependencies', ... }))` [E: packages/skill/tool-workspace-dependencies/src/index.ts:249] |

本页只有这一条 model-visible 名。没有 `install_workspace_dependencies` 之类第二工具。

`Config` 两个键：必填 `source`（payload 目录，含 `runtime.json` 与 `dependencies/`）；可选 `root`（Harness home 下的安装目录）。schemastery：`source` required min 1，`root` 可选 min 1。[E: packages/skill/tool-workspace-dependencies/src/index.ts:27] `apply` 还要求 `source`（以及给出的 `root`）是绝对路径，否则 throw `workspace dependencies: source and root must be absolute paths`。[E: packages/skill/tool-workspace-dependencies/src/index.ts:241]

`defineTool` **没有** `timeoutMs`，也 **没有** `isConcurrencySafe`。timeout-policy 读到 `undefined` 就原样 `next()`；registry `executionMode` fail-closed 为 exclusive。[E: packages/guard/timeout-policy/src/index.ts:59] [E: packages/core/tools/src/index.ts:1305]

`presentCall` 是 `{ card: 'generic', title: 'Load workspace dependencies', kind: 'read' }`。[E: packages/skill/tool-workspace-dependencies/src/index.ts:275]

## 用途定位

本工具让模型拿到 **已经捆绑** 的 Python 解释器与 site-packages（以及 payload 若带了 Node/pnpm 时的绝对路径）。描述要求：用这些库处理 Office 文件，除非用户或 workspace 指令另选环境；有 Node/pnpm 时用返回的 Node 可执行文件跑 pnpm 脚本。**不**改 `PATH`、**不**改包管理器设置。[E: packages/skill/tool-workspace-dependencies/src/index.ts:251]

权威副作用：可选地把 payload 拷到 `config.root`（第一次且 digest/manifest 不同时）。不设 `root` 时 `resolvePrimaryRuntime` 就地校验、零拷贝。[E: packages/skill/tool-workspace-dependencies/src/index.ts:192] [E: packages/skill/tool-workspace-dependencies/src/index.ts:204] [E: packages/skill/tool-workspace-dependencies/src/index.ts:268]

测试钉死：两次并行 `execute` 共享同一份 preparation；成功后 `process.env` 不变；dispose 后 schema 消失。[E: packages/skill/tool-workspace-dependencies/tests/tool-workspace-dependencies.spec.ts:209] [E: packages/skill/tool-workspace-dependencies/tests/tool-workspace-dependencies.spec.ts:214] [E: packages/skill/tool-workspace-dependencies/tests/tool-workspace-dependencies.spec.ts:218]

## 输入 schema

以插件默认 Config boot 后的 `ctx.tools.schemas()` 为准。`parameters` 是空对象：**没有任何模型可见字段**。`source` / `root` **不**进广告 schema。

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| （无） | — | — | — | `parameters: {}` | 调用方传 `{}`。 [E: packages/skill/tool-workspace-dependencies/src/index.ts:252] |

**Config 不改广告字段。** 部署键：

| Config 键 | 默认 | 作用 |
|---|---|---|
| `source` | 无（required） | payload 目录。sdk-app 写成 `path.resolve(DSH_PRIMARY_RUNTIME ?? DSH_BUNDLED_PRIMARY_RUNTIME ?? '')` |
| `root` | 省略 | 省略 = 就地使用；给出 = 首次调用 `installPrimaryRuntime` 拷到该绝对路径 |

## 输出 & 截断 / spill

`output.schema` 是 `additionalProperties: false` 的 object：

| 字段 | 含义 |
|---|---|
| `python` | 必填。捆绑 Python 可执行文件绝对路径。 |
| `node` | 可选。payload 无 Node 时缺席。 |
| `pnpm` | 可选。payload 无 pnpm 时缺席。 |
| `pythonPackages` | 必填。site-packages 目录。 |
| `nodePackages` | 可选。`node_modules` 目录。 |
| `pythonDistributions` | 必填。`runtime.json` 记录的发行名→版本；不含用户后来装的包。 [E: packages/skill/tool-workspace-dependencies/src/index.ts:256] |

`output.render` 把规范值 `JSON.stringify(value, undefined, 2)` 成一段 text。[E: packages/skill/tool-workspace-dependencies/src/index.ts:265]

没有 spill、没有截断标记。失败走 registry `toolErrorResult`。

## 背后的 seam

本工具 **不**声明 `ctx.skills` / `ctx.fs`。读写走 Node `fs/promises`（`readFile` / `cp` / `rename`），路径由 Config 钉死。

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition（工具注册表） | `ctx.tools` / `ToolRuntime` | `inject` 含 `tools`；`register(defineTool(...))`。[E: packages/skill/tool-workspace-dependencies/src/index.ts:12] |
| Consumer | `@deepseek-ai/dsh-tool-workspace-dependencies` | `execute` 懒创建 `preparation` Promise：无 `root` → `resolvePrimaryRuntime`；有 `root` → `installPrimaryRuntime`。[E: packages/skill/tool-workspace-dependencies/src/index.ts:268] |
| Provider（payload） | 部署写入的 `runtime.json` + `dependencies/` | `parsePrimaryRuntime` 校验 desktopVersion / platform / arch / python 版本 / 可选 node·pnpm·payloadDigest。[E: packages/skill/tool-workspace-dependencies/src/index.ts:82] |

换掉 payload 会带走：解释器路径、发行表、是否带 Node。不会带走：wire 名、空参数 schema、JSON pretty-print 输出。

平台必须匹配：`manifest.platform !== process.platform || manifest.arch !== process.arch` → throw `incompatible platform or architecture`。[E: packages/skill/tool-workspace-dependencies/src/index.ts:183]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute` → `tools/result`。[E: packages/core/tools/src/index.ts:1369] [E: packages/core/tools/src/index.ts:1506]

对本工具的挂点：

- **approval：** `defineTool` 没有 `ask`。普通调用不经过 `ctx.approval.request`。[I]
- **sandbox：** 不读 `ctx.sandbox` / `ctx.sandboxPolicy`。拷贝发生在 host 文件系统上的 Config 路径。[I]
- **timeout：** 未声明 `timeoutMs`，timeout-policy 原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:59]
- **checkpoint：** host `dsh-session-checkpoint-policy` 在 top-level（有 `exec.agent` 且无 `parent`）`tools/execute` 里先 `flush` 再 `next()`。[E: packages/session/session-checkpoint-policy/src/index.ts:71]
- **并行：** 未声明 `isConcurrencySafe` → exclusive。并行两次 `execute` 仍共享同一个 `preparation` Promise。[E: packages/core/tools/src/index.ts:1305] [E: packages/skill/tool-workspace-dependencies/src/index.ts:268]
- **PTC：** 本包默认不进 shipped `ptc` preset。若某 composition 既挂本工具又 `mode: ptc`，无 `parent` 的模型直调会 `collapses`。

`execute` 失败会把 `preparation` 重置为 `undefined`，下次调用重试。[E: packages/skill/tool-workspace-dependencies/src/index.ts:270]

## Preset 装配

成员资格只认 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml` 与各 bundle overlay。仓库里有包 ≠ 每个会话都装。

| 面 | 装 `@deepseek-ai/dsh-tool-workspace-dependencies`？ | `disabled` | 说明 |
|---|---|---|---|
| `minimal` / `standard` / `ptc` / `cordis` | **否** | — | 四份 shipped preset patch **没有** 本包行。[I] 核过 `packages/bundle/web-app/presets/*.patch.yml` 无 `tool-workspace-dependencies` / `load_workspace_dependencies` |
| `dsh-sdk-app` | 是 | `!(DSH_PRIMARY_RUNTIME ?? DSH_BUNDLED_PRIMARY_RUNTIME)` | `id: workspace-dependencies`。两个 env 都空时整行 disabled；有值时 `config.source` 解析到该目录。[E: packages/bundle/sdk-app/cordis.patch.yml:30] [E: packages/bundle/sdk-app/cordis.patch.yml:32] |

web preset 默认不挂；要给 Web 会话用，必须 user patch / `--patch` / 另写 profile。sdk-app 同时可挂 `skill-office`，同一对 env 门控。[E: packages/bundle/sdk-app/cordis.patch.yml:36]

## execute() 走读

1. `apply` 校验绝对路径，注册工具，并 `ctx.effect` 在 dispose 时 `await preparation?.catch(() => undefined)`（只等文件系统活干完，不把失败抛给 unload）。[E: packages/skill/tool-workspace-dependencies/src/index.ts:245]
2. `execute()` 无参。第一次调用创建 `preparation`：无 `root` → `compatibleManifest(source)` + `validatePayloadEntries`；有 `root` → 若已安装且 manifest JSON 相等则复用，否则 `mkdtemp` 拷贝、校验、原子 rename（失败时把 `.previous` 换回来）。[E: packages/skill/tool-workspace-dependencies/src/index.ts:211] [E: packages/skill/tool-workspace-dependencies/src/index.ts:217]
3. 返回 `WorkspaceDependencies` 对象；registry 用 output schema 校验后 `render` 成 JSON 文本。

## 设计动机·edge

相对 Claude/Codex 的「skill 自己找解释器」：DSH 把捆绑 runtime 收成一次无参查询，避免模型猜 `python3` 是否就是带 numpy/openpyxl 的那份。相对直接改 `PATH`：返回绝对路径，会话环境保持干净。

legacy `runtime.json` 把版本放在 `components` 下；`parsePrimaryRuntime` 归一化，并拒绝 numpy/pandas 冲突。[E: packages/skill/tool-workspace-dependencies/src/index.ts:84] [E: packages/skill/tool-workspace-dependencies/tests/tool-workspace-dependencies.spec.ts:167]

安装路径若是 symlink 直接拒。[E: packages/skill/tool-workspace-dependencies/src/index.ts:173]

## Sources

- packages/skill/tool-workspace-dependencies/src/index.ts
- packages/skill/tool-workspace-dependencies/package.json
- packages/skill/tool-workspace-dependencies/tests/tool-workspace-dependencies.spec.ts
- packages/core/tools/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)：`pre-execute` → `execute` → `post-execute`。
- [ref.tools-catalog](../../reference/tools-catalog.md)：模型可见工具清单。
- [subsys.context.skills](../../subsystems/context/skills.md)：skill 扫描与 `skill` 工具；本页不是 skill loader。
- [subsys.composition.bundle-sdk-app](../../subsystems/composition/bundle-sdk-app.md)：sdk-app overlay 与 `DSH_PRIMARY_RUNTIME` 门。
- [surface.presets.standard](../presets/standard.md) / [surface.presets.code](../presets/code.md)：shipped web preset 默认不挂本工具。
