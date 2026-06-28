# 写作约定 · 节点模板 · 机读层 · Lint

目标:每个节点**自包含、可 grep、证据可机器校验**。文档对象是 `pi/` 真实源码(TypeScript 为主)。

## 1. 节点解剖

每个节点 = 一个 `.md`:顶部 YAML frontmatter + 自包含正文。

### 1.1 Frontmatter schema

```yaml
---
id: surface.tools.bash         # 全局唯一;点分命名空间,且与路径对应(surface/tools/bash.md)
title: bash 执行工具
kind: tool                     # flow | tool | surface | subsystem | reference | catalog
tier: T1                       # T0 | T1 | T2 | T3
pkg: coding-agent              # ai | agent | coding-agent | tui | orchestrator | cross ——本节点描述的代码属哪个包(pi 专属字段)
source: [packages/coding-agent/src/core/tools/bash.ts, packages/coding-agent/src/core/bash-executor.ts]  # 相对 pi/;纯导览可空
symbols: [createBashTool, BashToolInput, BashOperations]   # 本节点权威覆盖的导出符号(T3 覆盖率据此计)
related: [spine.tool-call-anatomy, subsys.coding-agent.bash-executor, ref.tools-catalog]  # 其它节点 id,构成图
evidence: explicit             # 页级主导级:explicit | inferred | unknown(未写完可省略)
status: planned                # planned | draft | verified
updated: <pi HEAD 短 SHA>      # fill 时跑 git -C ../../../pi rev-parse --short HEAD
---
```

必填:`id`、`title`、`kind`、`tier`、`pkg`、`source`(纯导览可空)、`status`。写完补 `symbols`、`evidence`、`updated`。

### 1.2 `pkg` 字段(pi 分层主线)

pi 是分层栈:`ai`(provider 引擎)→ `agent`(可复用运行时 harness)→ `coding-agent`(产品)+ `tui`(渲染)+ `orchestrator`(实验性)。每节点标 `pkg`,使"这条逻辑属哪一层"可 grep。**跨层节点**(如脊柱总览)标 `pkg: cross`。脊柱页须把 `agent`(可复用)与 `coding-agent`(产品)的复用边界写清:哪些逻辑在 `pi-agent-core`(任何 app 都能用),哪些是 `pi-coding-agent` 的产品装配。

### 1.3 正文骨架(H2/H3 可预测)

1. 开头一句话定义(blockquote)。
2. `## 能回答的问题` —— 3–6 个该节点应命中的检索问句。
3. 主体 H2/H3:一个概念一段,**显式实体名**,禁止"见上文 / 如前所述 / 见某节"。
4. **跨包关系**:涉及多个包时(如工具节点既在 `coding-agent` 又经 `agent` 的 loop 执行),显式点名对方节点 id + 一句自包含摘要,别假设读者已看过。
5. 行内证据标:非显然且 load-bearing 的论断后缀 `[E: path:line]` / `[I]` / `[U]`(相对 `pi/`)。
6. `## Sources` —— 本节点引用的源文件路径(lint 据此核对 frontmatter.source)。
7. `## 相关` —— 指向 `related` 节点的显式链接。

## 2. 自包含规则(LLM 检索核心)

- 节点单独被 grep / 读出时必须**自洽**:必要背景宁可简短重复,也不靠跳转。
- 跨节点引用 = **显式实体名 + 链接**;裸"上文 / 前述 / 见某节"一律禁止。
- 一个概念只在一个**权威**节点详写(由 `symbols` 标定),别处引用并给一句自包含摘要。
- 标题层级稳定:H2 主题 / H3 子题。

## 3. 证据分级(字段级)

- 页级:`frontmatter.evidence` = 主导级。
- 字段级:每条 load-bearing 且非显然论断就近标 `[E]/[I]/[U]`;`[E]` 尽量带 `path:line`(相对 `pi/`)。
- `[U]` 同步进 `reference/uncertainty.md`(并发填充时先写 `_staging/uncertainty-<batch>.md`)。
- 语义:`[E]` 必须能在所给路径核到;L2 由独立 subagent 逐条证伪。pi 是真源码且有测试(`./test.sh`、`packages/*/test/`)——**能核到就核到,绝不臆造**;测试文件是强证据,鼓励引用佐证行为。

## 4. 机读层 schema(index.json)

```json
{
  "wiki": "pi",
  "consumption": "read-md + grep (no vectors)",
  "source_root": "pi/",
  "tiers": {"T0":"spine","T1":"surface","T2":"subsystems","T3":"reference"},
  "evidence_levels": ["explicit","inferred","unknown"],
  "packages": {"ai":"…","agent":"…","coding-agent":"…","tui":"…","orchestrator":"…","cross":"…"},
  "staleness": "git-sha",
  "nodes":  [ {"id":"...","title":"...","kind":"...","tier":"...","pkg":"...","path":"...",
               "source":["..."],"symbols":["..."],"related":["..."],"status":"planned"} ],
  "groups": [ {"id":"group.config-keys","title":"...","tier":"T3","dir":"reference/",
               "covered_by_nodes":1,"instance_count":50,"enumerate":"grouped-catalog",
               "ground_truth":"...","catalog_node":"ref.coding-agent.config-keys","status":"planned"} ]
}
```

- `nodes` = 已枚举的具体节点;`groups` = 大批量实例(config 键 / provider / 模型 / slash 命令 / 键位 / RPC 方法 / 扩展事件 / 环境变量 / 组件…),由若干 `grouped-catalog` 节点逐实例覆盖。**grouped catalog 内每个实例都要在某节点的表格里逐一出现**——分组是为控制文件数,不是为丢实例。
- `llms.txt`、`index.json`、文件树三者一致,由 lint 保证。

## 5. L1 机械 lint 规则(`tools/lint.mjs`)

1. 每个节点有 frontmatter,必填键齐全;`kind`/`tier`/`pkg`/`evidence`/`status` 取值合法。
2. `id` 全局唯一,且与相对路径一致(`surface.tools.bash` ↔ `surface/tools/bash.md`:末段 == 文件名;path 在该 tier 目录下)。
3. `source:` 与正文 `## Sources` 里每个路径都存在于 `pi/`。
4. `related:` 及正文所有节点链接的目标 id 都存在于 index.json。
5. index.json ↔ 文件树:`status≠planned` 的条目必有文件;每个节点文件必在 index.json。
6. `llms.txt` 每个链接都解析到 index.json 中的节点 / 文件。
7. 自包含:grep 正文,命中 `见上文|如前所述|见 Part|见上节|前面提到|as mentioned|above` 即告警。
8. 证据:`status=verified` 的节点,load-bearing 段须含 `[E]`,且 `[E: path]` 路径存在。
9. 行号:`[E: path:line]` 的 line 不得超出文件实际行数;且须指向**被断言的代码行本身**——落在**空行/注释行**即 **error**,落在**纯括号行**(`}`/`)`/`},` 等)告警(可能是多行构造的合法锚点);更深的语义精度仍由 L2 把关。
10. `updated:` 是合法的 pi 短 SHA(`git -C ../../../pi cat-file -e <sha>` 可解析)。

> L1 = 机械可刷的下限;真正把关是 L2(独立 subagent 逐 claim 证伪)→ L3(≤2 轮修复)。别把 L1 当验收门。

## 6. 节点模板

### 工具节点 `surface/tools/<slug>.md`(kind: tool,pi 适配)
frontmatter + 一句话 + `## 能回答的问题` +
`1 Identity`(wire name 给模型看的名 / `createXTool` 工厂 / 所属包)· `2 用途定位` · `3 输入 schema 表`(字段·类型·必填·默认·约束·说明,源自 TypeBox/`createXToolDefinition` 的 parameters)· `4 输出 & 截断`(`XToolDetails`、`truncation`、`fullOutputPath`、默认行/字节上限)· `5 执行模式`(`executionMode` sequential/parallel + 为什么)· `6 注册与装配`(在 `core/tools/index.ts` 的 `createAllToolDefinitions`/preset,经 `tool-definition-wrapper` → `AgentSession._buildRuntime`)· `7 execute() 走读`(`XOperations` 可插拔点 / 远程执行)· `8 设计动机·edge`(模糊匹配 / file-mutation-queue 串行化 / macOS 路径变体 / 输出 spillover 等)· `## Sources` · `## 相关`

### 子系统节点 `subsystems/<pkg-dir>/<slug>.md`(kind: subsystem)
frontmatter + 一句话 + 能回答的问题 + 职责边界 · 关键文件(证据)· 数据模型(关键 interface/type/class)· 控制流(编号步骤带 `符号@文件:行`)· 设计动机与权衡 · gotcha · **跨包边界**(依赖/被依赖哪些包的节点)· Sources · 相关

### 脊柱节点 `spine/<slug>.md`(kind: flow)
frontmatter + 一句话 + 能回答的问题 + **mermaid 图先行** · 端到端编号步骤(带 `符号@文件`)· 关键决策点 · 指向 T1/T2 深挖 · Sources。`trace-*` 节点是一条真实路径从入口到结束的具体走读;`pkg: cross` 的脊柱须写清包边界。

### 引用/catalog 节点 `reference/<slug>.md`(kind: reference/catalog)
frontmatter + 符号/变体/键 表(每行一个实例:名 · 类型/签名 · 默认 · 含义 · 为什么 · 源 path)· 目标≈全覆盖该清单 · Sources。grouped-catalog 节点:组内每个实例都必须出现在表里。

### 可见面节点 `surface/<dir>/<slug>.md`(kind: surface)
工具模板轻量版:是什么 / 入口 / 关键字段或方法 / 装配与门控 / 跨包关系 / Sources / 相关。

## 7. pi 专属 ground-truth 约定(写工具/provider/命令节点前必核)

- **内置工具集** ground truth = `packages/coding-agent/src/core/tools/index.ts`(`ToolName` 类型 + `allToolNames` + `createAllToolDefinitions`/`createCodingToolDefinitions`/`createReadOnlyToolDefinitions`),装配进会话在 `packages/coding-agent/src/core/agent-session.ts` 的 `_buildRuntime`。多退少补:漏的补、错的修、不存在的删并记 `[U]`。
- **provider 集** ground truth = `packages/ai/src/providers/all.ts`(`builtinProviders()`),模型来自各 `providers/<name>.models.ts` 汇入 `models.generated.ts`(**generated,勿改源,改 `scripts/generate-models.ts`**)。
- **wire 协议** = `packages/ai/src/api/<name>.ts`(经 `<name>.lazy.ts` 懒加载,`models.ts` 按 `Model.api` 派发)。
- **slash 命令** = `packages/coding-agent/src/core/slash-commands.ts`;**键位** = `packages/coding-agent/src/core/keybindings.ts`(导出 `KEYBINDINGS` = `{ ...TUI_KEYBINDINGS, app.* }`,加 `migrateKeybindingsConfig`/`KeybindingsManager`;**注意:不存在 `DEFAULT_APP_KEYBINDINGS`/`DEFAULT_EDITOR_KEYBINDINGS`,index.json 旧 planned symbols 已过时**)+ `packages/tui/src/keybindings.ts`(`TUI_KEYBINDINGS`)。
- **RPC 方法** = `packages/coding-agent/src/modes/rpc/rpc-types.ts`(`RpcCommand`)+ `rpc-mode.ts` 的 dispatch。
- **配置键** = `packages/coding-agent/src/core/settings-manager.ts` + `core/defaults.ts`(对照 `docs/settings.md`)。
- **会话格式** = `packages/coding-agent/src/core/session-manager.ts` 与 `packages/agent/src/harness/types.ts`(`SessionTreeEntry`),对照 `docs/session-format.md`。
- **设计动机权威来源**:`packages/coding-agent/docs/*.md`(29 篇,见 `index.md`)、根 `AGENTS.md`、`README.md`;dogfood 实例在 `.pi/`(extensions/prompts/skills)。
- **`.pi/` vs `.claude/`**:pi 自身配置目录是 `.pi/`(项目级)与 `~/.pi/agent/`(全局);`.claude/` 仅作跨 harness 共享 context 文件的 fallback,别混。
