# 写作约定 · 节点模板 · 机读层 · Lint

目标:每个节点**自包含、可 grep、证据可机器校验**。文档对象是 `deepseek-harness/` 真实源码(TypeScript ESM + vendored Cordis)。

## 1. 节点解剖

每个节点 = 一个 `.md`:顶部 YAML frontmatter + 自包含正文。

### 1.1 Frontmatter schema

```yaml
---
id: surface.tools.bash         # 全局唯一;点分命名空间,且与路径对应(surface/tools/bash.md)
title: bash 执行工具(一次性)
kind: tool                     # flow | tool | surface | subsystem | reference | catalog
tier: T1                       # T0 | T1 | T2 | T3
pkg: execution                 # 见 §1.2
source: [packages/shell/tool-bash/src/index.ts, packages/shell/shell/src/index.ts]
symbols: [BashTool]            # 本节点权威覆盖的导出符号
related: [spine.tool-call-anatomy, subsys.execution.shell, ref.tools-catalog]
evidence: explicit             # 页级主导级:explicit | inferred | unknown(未写完可省略)
status: planned                # planned | draft | verified
updated: <dsh HEAD 10 位短 SHA> # fill 时跑 git -C ../../../deepseek-harness rev-parse --short=10 HEAD
---
```

必填:`id`、`title`、`kind`、`tier`、`pkg`、`source`(纯导览可空)、`status`。写完补 `symbols`、`evidence`、`updated`。

### 1.2 `pkg` 字段(组合主线,14 档)

不要把 50 个 package group 写进 `pkg`。用这 14 档,使"这条逻辑属哪一层组合"可 grep:

| `pkg` | 管什么 |
|---|---|
| `composition` | boot / cmdline / bundle / preset / persona |
| `core` | scope / session / system-prompt / tools registry / agent / agent-loop |
| `llm` | `ctx.llm`、DeepSeek 路由、`dsh-llm-pi-ai`、retry、token-meter |
| `execution` | fs / shell / subprocess / terminal / sandbox / code-runtime / lsp |
| `orchestration` | subagent / workflow / jobs / goal / plan / ralph / schedule |
| `context` | compaction、workspace 指令、skills、timeout / repeat guards |
| `persistence` | session 落盘 / projection / title / telemetry / storage / spill / attachment / session-query / workspace / settings / credentials |
| `interaction` | approval / user-questions / commands / permission presets / hooks / feedback |
| `host` | Web 工作台宿主(webserver / apiproxy / static / inventory) |
| `client` | 浏览器半边(runtime / modules / ui-* / HMR) |
| `integration` | MCP / ACP / SDK / Typert / API gateway / web search-fetch |
| `vendor` | vendored Cordis 与 loader |
| `util` | brand / home-paths 等零依赖工具 |
| `cross` | 跨层脊柱、glossary、package-index |

跨层节点(如脊柱总览)标 `pkg: cross`。脊柱页须写清 host 面 vs agent-preset 面。

### 1.3 正文骨架(H2/H3 可预测)

1. 开头一句话定义(blockquote)。
2. `## 能回答的问题` —— 3–6 个该节点应命中的检索问句。
3. 主体 H2/H3:一个概念一段,**显式实体名**,禁止"见上文 / 如前所述 / 见某节"。
4. **跨包关系**:涉及多包时显式点名对方节点 id + 一句自包含摘要。
5. 行内证据标:非显然且 load-bearing 的论断后缀 `[E: path:line]` / `[I]` / `[U]`(相对 `deepseek-harness/`)。
6. `## Sources` —— 本节点引用的源文件路径(lint 据此核对 frontmatter.source)。
7. `## 相关` —— 指向 `related` 节点的显式链接。

## 2. 自包含规则(LLM 检索核心)

- 节点单独被 grep / 读出时必须**自洽**:必要背景宁可简短重复,也不靠跳转。
- 跨节点引用 = **显式实体名 + 链接**;裸"上文 / 前述 / 见某节"一律禁止。
- 一个概念只在一个**权威**节点详写(由 `symbols` 标定),别处引用并给一句自包含摘要。
- 标题层级稳定:H2 主题 / H3 子题。
- **不要复述官方 subsystems 页的类型抄本**。需要类型时点名符号 + 源文件,把篇幅留给控制流、门控和与 peer harness 的差异。

## 3. 证据分级(字段级)

- 页级:`frontmatter.evidence` = 主导级。
- 字段级:每条 load-bearing 且非显然论断就近标 `[E]/[I]/[U]`;`[E]` 尽量带 `path:line`(相对 `deepseek-harness/`)。
- `[E]` 的落点必须是**被断言的那行代码本身**,不能是空行、注释或纯括号。
- `[U]` 同步进 `reference/uncertainty.md`(并发填充时先写 `_staging/uncertainty-<batch>.md`)。
- **官方文档不是 `[E]`**。`docs/**/*.md`、`.agents/notes/**`、生成 catalogs 最多当线索或 `[I]` 的设计意图。代码与官方页冲突时改 wiki 跟代码,并在 uncertainty 记一笔官方漂移。
- DSH 是真源码且有 per-file 100% 覆盖门——**能核到就核到,绝不臆造**;测试文件是强证据。

## 4. 机读层 schema(index.json)

```json
{
  "wiki": "deepseek-harness",
  "consumption": "read-md + grep (no vectors)",
  "source_root": "deepseek-harness/",
  "tiers": {"T0":"spine","T1":"surface","T2":"subsystems","T3":"reference"},
  "evidence_levels": ["explicit","inferred","unknown"],
  "packages": {"composition":"…","core":"…","cross":"跨层/全局"},
  "staleness": "git-sha",
  "nodes":  [ {"id":"...","title":"...","kind":"...","tier":"...","pkg":"...","path":"...",
               "source":["..."],"symbols":["..."],"related":["..."],"status":"planned"} ],
  "groups": [ {"id":"group.tools","title":"...","tier":"T1","dir":"surface/tools/",
               "covered_by_nodes":30,"instance_count":50,"enumerate":"per-node-or-family",
               "ground_truth":"packages/*/tool-* + boot ctx.tools.schemas()","catalog_node":"ref.tools-catalog","status":"planned"} ]
}
```

- `nodes` = 已枚举的具体节点;`groups` = 大批量实例,由 `catalog_node` 或一组 per-node 覆盖。**组内每个实例都要在某节点的表格里逐一出现**——分组是为控制文件数,不是为丢实例。
- `llms.txt`、`index.json`、文件树三者一致,由 lint 保证。

## 5. L1 机械 lint 规则(`tools/lint.mjs`)

1. 每个节点有 frontmatter,必填键齐全;`kind`/`tier`/`pkg`/`evidence`/`status` 取值合法。
2. `id` 全局唯一,且与相对路径一致(`surface.tools.bash` ↔ `surface/tools/bash.md`:末段 == 文件名;path 在该 tier 目录下)。
3. `source:` 与正文 `## Sources` 里每个路径都存在于 `deepseek-harness/`。
4. `related:` 及正文所有节点链接的目标 id 都存在于 index.json。
5. index.json ↔ 文件树:`status≠planned` 的条目必有文件;每个节点文件必在 index.json。
6. `llms.txt` 每个链接都解析到 index.json 中的节点 / 文件;**每个 index 节点都必须被 llms.txt 链到**。
7. 自包含:grep 正文,命中 `见上文|如前所述|见 Part|见上节|前面提到|as mentioned|above` 即告警。
8. 证据:`status=verified` 的节点,load-bearing 段须含 `[E]`,且 `[E: path]` 路径存在。
9. 行号:`[E: path:line]` 的 line 不得超出文件实际行数;且须指向**被断言的代码行本身**——落在**空行/注释行**即 **error**,落在**纯括号行**告警。
10. `updated:` 是合法的 deepseek-harness 短 SHA(`git -C ../../../deepseek-harness cat-file -e <sha>` 可解析)。

> L1 = 机械可刷的下限;真正把关是 L2(独立 subagent 逐 claim 证伪)→ L3(≤2 轮修复)。别把 L1 当验收门。

## 6. 节点模板

### 工具节点 `surface/tools/<slug>.md`(kind: tool,DSH 适配)

frontmatter + 一句话 + `## 能回答的问题` +

1. **Identity** — 模型看见的 `name`(注意 `bash` 有两个包)、实现包 `@deepseek-ai/dsh-tool-*`、工厂 / 注册点
2. **用途定位**
3. **输入 schema 表** — 字段·类型·必填·默认·约束;以插件 **默认 Config** boot 后的 schema 为准,并注明 Config 会改名/改参的情况
4. **输出 & 截断 / spill**
5. **背后的 seam** — 消费的 `ctx.*`(如 `ctx.shell` / `ctx.fs`),换 provider 会带走什么
6. **执行管线** — 如何进入 `tools/pre-execute → execute → post-execute`;approval / sandbox / timeout 是否挂上
7. **Preset 装配** — `minimal` / `standard` / `code` / `cordis` 是否装、是否 `disabled`、isolate 域
8. **execute() 走读**
9. **设计动机·edge** — 与 Codex `apply_patch` / Claude Edit / Pi edit 的方言差异写在这里
10. `## Sources` · `## 相关`

同一 package 里一组紧耦合的 model-visible 名(如 `terminal_*`、`cordis_*`、`session_*`、`job_*`、`schedule_*`、`create_goal` 三件套、subagent control 三件套)可以**一页一家**,但组内每个名字都必须在表格里出现,不得省略。

**同名不同包必须拆页**:`surface.tools.bash`(one-shot `dsh-tool-bash`)与 `surface.tools.bash-persistent`(`dsh-tool-bash-persistent`)。

### 子系统节点 `subsystems/<pkg-dir>/<slug>.md`(kind: subsystem)

frontmatter + 一句话 + 能回答的问题 + 职责边界 · 关键文件 · 数据模型 · 控制流(编号步骤带 `符号@文件:行`)· 设计动机 · gotcha · **seam 三角**(Definition / Provider / Consumer 各在哪)· Sources · 相关。

不要做成官方 `docs/subsystems/<name>.md` 的中文克隆。

### 脊柱节点 `spine/<slug>.md`(kind: flow)

frontmatter + 一句话 + 能回答的问题 + **mermaid 图先行** · 端到端编号步骤(带 `符号@文件`)· 关键决策点 · 指向 T1/T2 深挖 · Sources。`trace-*` 是一条真实路径从入口到结束的走读;`pkg: cross` 的脊柱须写清 host / preset / client 边界。

### 引用/catalog 节点 `reference/<slug>.md`(kind: reference/catalog)

符号/变体/键 表(每行一个实例:名 · 类型/签名 · 默认 · 含义 · 为什么 · 源 path)。grouped-catalog:组内每个实例都必须出现。不要手抄官方生成表然后当 `[E]`。

### 可见面节点 `surface/<dir>/<slug>.md`(kind: surface)

工具模板轻量版:是什么 / 入口 / 关键字段 / 装配与门控 / 跨包关系 / Sources / 相关。

## 7. DSH 专属 ground-truth 约定(写节点前必核)

- **模型可见工具集** ground truth = `packages/*/tool-*` 以及同样往 `ctx.tools` 注册的 `packages/plan/plan-mode`、`packages/core/tools`(Code Mode `run_code`)、`packages/schedule/schedule`、`packages/extensions/tool-cordis`。完整性:官方生成器 glob `packages/*/tool-*` 并 **boot 真实 context** 读 `ctx.tools.schemas()`(`docs/tool-catalog.md` 是这份清单的生成物,只当查漏,不当 `[E]`)。多退少补。
- **同名碰撞**:`bash` 同时是 `dsh-tool-bash`(one-shot,`ctx.shell`)和 `dsh-tool-bash-persistent`(`ctx.terminals`)。`subagent` 的 wire 名是 load-time `toolName`;shipped 另有 `subagent_fork`。
- **Preset 集** = `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml` + `preset.yml`。某工具"在不在默认产品里"以这些文件为准,不以 package 存在为准。
- **组合层** = `packages/boot/app-boot`(profile 发现与 patch 叠层)+ `packages/bundle/{base,web-app,headless}/cordis.patch.yml` + 用户 `$DSH_HOME/profiles/<name>/cordis.patch.yml` + `--patch`。看真树:`dsh --profile web --dump-config`(源码入口 `apps/cli/src/dump-config.ts`)。
- **Loop** = `packages/core/agent-loop`(默认可替换驱动)+ `packages/core/agent`(合同 / inbox / 事件)。新行为优先挂扩展点,改 loop 必须对照 `docs/architecture.md` 的地图——但 wiki 的 `[E]` 仍只认 loop 源码。
- **会话日志** = `packages/core/session` 的 `SessionEventMap` + `deriveMessages()`(`src/surface.ts`)。compaction 只有 `surfaceOp: replace`,没有 delete。
- **Checkpoint** = `packages/session/session-checkpoint-policy`:在 adapter 看到请求之前、以及 top-level tool body 能产生副作用之前落点。
- **LLM** = `packages/llm/llm`(seam)+ `packages/llm/llm-deepseek`(默认路由 `deepseek-official`)+ `packages/llm/llm-pi-ai`(始终加载,零 route 直到 Settings 加 profile)。
- **人命令** = `packages/interaction/commands`(`ctx.commands`),不经模型 turn。
- **配置键** ground truth = 各包 `Config` / schemastery 声明;官方 `docs/config-catalog.md` 是生成物。
- **环境变量** 至少包括 `DSH_HOME`、`DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_SEARCH_BASE_URL`(search 不走 `DEEPSEEK_BASE_URL`)。以源码引用为准枚举。
- **设计意图(非 [E])**:`docs/architecture.md`、`docs/capability-seams.md`、`docs/agent-lifecycle.md`、各包 README、`.agents/notes/implemented/`。
- **Cordis 语义**:waterfall 必须 `next()`;注册是 `ctx.effect()` / `ctx.on()` 的可逆 effect。源在 `vendor/cordis/`。
- **`.dsh` vs `.agents` vs `$DSH_HOME`**:产品主目录是 `$DSH_HOME` 否则 `~/.dsh`;skills 扫描含 `<project>/.dsh/skills` 与 `.agents/skills`。别和 Claude/Pi 的配置目录混。
