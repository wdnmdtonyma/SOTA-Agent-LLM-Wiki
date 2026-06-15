# 写作约定 · 节点模板 · 机读层 · Lint

目标:每个节点**自包含、可 grep、证据可机器校验**。

## 1. 节点解剖

每个节点 = 一个 `.md`:顶部 YAML frontmatter + 自包含正文。

### 1.1 Frontmatter schema

```yaml
---
id: tool.bash                 # 全局唯一;点分命名空间,且与路径对应(surface/tools/bash.md)
title: Bash/Shell 工具
kind: tool                    # flow | tool | surface | subsystem | reference | catalog
tier: T1                      # T0 | T1 | T2 | T3
v: shared                     # v1 | v2 | shared | na ——本节点描述的代码属哪一代(opencode 专属字段)
source: [packages/opencode/src/tool/shell.ts, packages/core/src/tool/bash.ts]  # 相对 Best/opencode/;纯导览可空
symbols: [ShellTool, BashTool]   # 本节点权威覆盖的导出符号(T3 覆盖率据此计)
related: [execution.shell-v1, execution.shell-v2, ref.bash-arity]  # 其它节点 id,构成图
evidence: explicit            # 页级主导级:explicit | inferred | unknown(未写完可省略)
status: planned               # planned | draft | verified
updated: <opencode HEAD 短 SHA>   # fill 时跑 git -C ../../../opencode rev-parse --short HEAD
---
```

必填:`id`、`title`、`kind`、`tier`、`v`、`source`(纯导览可空)、`status`。写完补 `symbols`、`evidence`、`updated`。

### 1.2 正文骨架(H2/H3 可预测)

1. 开头一句话定义(blockquote)。
2. `## 能回答的问题` —— 3–6 个该节点应命中的检索问句。
3. 主体 H2/H3:一个概念一段,**显式实体名**,禁止"见上文 / 见某 Part / 如前所述"。
4. **V1/V2 处理**:`v: shared` 的节点用显式 `## V1` / `## V2`(或表格的 V1/V2 两列)区分两代实现,别混成一锅;`v: v1`/`v2` 的节点聚焦那一代,并在开头一句点明它与对应另一代节点的关系(给出对方节点 id)。
5. 行内证据标:非显然且 load-bearing 的论断后缀 `[E: path:line]` / `[I]` / `[U]`。
6. `## Sources` —— 本节点引用的源文件路径(lint 据此核对 frontmatter.source)。
7. `## 相关` —— 指向 `related` 节点的显式链接。

## 2. 自包含规则(LLM 检索核心)

- 节点单独被 grep / 读出时必须**自洽**:必要背景宁可简短重复,也不靠跳转。
- 跨节点引用 = **显式实体名 + 链接**;裸"上文 / 前述 / 见 Part X"一律禁止。
- 一个概念只在一个**权威**节点详写(由 `symbols` 标定),别处引用并给一句自包含摘要。
- 标题层级稳定:H2 主题 / H3 子题。

## 3. 证据分级(字段级)

- 页级:`frontmatter.evidence` = 主导级。
- 字段级:每条 load-bearing 且非显然论断就近标 `[E]/[I]/[U]`;`[E]` 尽量带 `path:line`(相对 `Best/opencode/`)。
- `[U]` 同步进 `reference/uncertainty.md`(并发填充时先写 `_staging/uncertainty-<batch>.md`)。
- 语义:`[E]` 必须能在所给路径核到;L2 由独立 subagent 逐条证伪。opencode 是真源码且有测试——**能核到就核到,绝不臆造**。

## 4. 机读层 schema(index.json)

```json
{
  "wiki": "opencode",
  "consumption": "read-md + grep (no vectors)",
  "source_root": "opencode/",
  "tiers": {"T0":"spine","T1":"surface","T2":"subsystems","T3":"reference"},
  "evidence_levels": ["explicit","inferred","unknown"],
  "variants": {"v1":"…","v2":"…","shared":"…","na":"…"},
  "nodes":  [ {"id":"...","title":"...","kind":"...","tier":"...","v":"...","path":"...",
               "source":["..."],"symbols":["..."],"related":["..."],"status":"planned"} ],
  "groups": [ {"id":"group.config-keys","title":"...","tier":"T1","dir":"surface/config/",
               "covered_by_nodes":6,"instance_count":100,"enumerate":"grouped-catalog",
               "ground_truth":"...","status":"planned"} ]
}
```

- `nodes` = 已枚举的具体节点;`groups` = 大批量实例(config 键 / 路由 / SDK 方法 / LSP server / 主题 / 键位 / DB 表…),由若干 `grouped-catalog` 节点逐实例覆盖。**grouped catalog 内每个实例都要在某节点的表格里逐一出现**——分组是为控制文件数,不是为丢实例。
- `llms.txt`、`index.json`、文件树三者一致,由 lint 保证。

## 5. L1 机械 lint 规则(`tools/lint.mjs`)

1. 每个节点有 frontmatter,必填键齐全;`kind`/`tier`/`v`/`evidence`/`status` 取值合法。
2. `id` 全局唯一,且与相对路径一致(`tool.bash` ↔ `surface/tools/bash.md`)。
3. `source:` 与正文 `## Sources` 里每个路径都存在于 `Best/opencode/`。
4. `related:` 及正文所有节点链接的目标 id 都存在于 index.json。
5. index.json ↔ 文件树:`status≠planned` 的条目必有文件;每个节点文件必在 index.json。
6. `llms.txt` 每个链接都解析到 index.json 中的节点 / 文件。
7. 自包含:grep 正文,命中 `见上文|如前所述|见 Part|见上节|前面提到|as mentioned|above` 即告警。
8. 证据:`status=verified` 的节点,load-bearing 段须含 `[E]`,且 `[E: path]` 路径存在。
9. 行号:`[E: path:line]` 的 line 不得超出文件实际行数;且须指向**被断言的代码行本身**——落在**空行/注释行**即 **error**,落在**纯括号行**(`}`/`)`/`},` 等)告警(可能是多行构造的合法锚点);更深的语义精度仍由 L2 把关。
10. `updated:` 是合法的 opencode 短 SHA(`git -C ../../../opencode cat-file -e <sha>` 可解析)。

> L1 = 机械可刷的下限;真正把关是 L2(独立 subagent 逐 claim 证伪)→ L3(≤2 轮修复)。别把 L1 当验收门。

## 6. 节点模板

### 工具节点 `surface/tools/<slug>.md`(kind: tool)
frontmatter + 一句话 + `## 能回答的问题` +
`1 Identity`(wire name / aliases / gating——哪个 agent·permission·flag 启用)· `2 用途定位` · `3 输入 schema 表`(字段·类型·必填·默认·约束·说明)· `4 输出 & 大小/截断限制` · `5 权限`(V1 `ctx.ask` / V2 `permission.assert` 的 action/resources)· `6 execute() 走读` · `7 V1 vs V2 差异`(`v:shared` 必写:实现/字段/门控差异)· `8 设计动机·edge·历史` · `## Sources` · `## 相关`

### 子系统节点 `subsystems/<dir>/<slug>.md`(kind: subsystem)
frontmatter + 一句话 + 能回答的问题 + 职责边界 · 关键文件(证据)· 数据模型(Effect Service/Schema/struct)· 控制流(编号步骤带 `符号@文件:行`)· 设计动机与权衡 · gotcha · Sources · 相关

### 脊柱节点 `spine/<slug>.md`(kind: flow)
frontmatter + 一句话 + 能回答的问题 + **mermaid 图先行** · 端到端编号步骤(带 `符号@文件`)· 关键决策点 · 指向 T1/T2 深挖 · Sources。trace-* 节点是一条真实路径从入口到结束的具体走读。

### 引用/catalog 节点 `reference/<slug>.md` 或 grouped-catalog(kind: reference/catalog)
frontmatter + 符号/变体/键 表(每行一个实例:名 · 类型/签名 · 默认 · 含义 · 为什么 · 源 path)· 目标≈全覆盖 · Sources。grouped-catalog 节点:组内每个实例都必须出现在表里。

### 可见面节点 `surface/<dir>/<slug>.md`(kind: surface)
工具模板轻量版:是什么 / 入口 / 关键字段或方法 / 装配与门控 / V1-V2 关系 / Sources / 相关。
