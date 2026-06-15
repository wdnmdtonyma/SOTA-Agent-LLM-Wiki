# 写作约定 · 节点模板 · 机读层 · Lint

目标:每个节点**自包含、可 grep、证据可机器校验**。文档对象是 `Best/codex/` 真实源码(Rust 为主)。

## 1. 节点解剖

每个节点 = 一个 `.md`:顶部 YAML frontmatter + 自包含正文。

### 1.1 Frontmatter schema

```yaml
---
id: tool.apply-patch          # 全局唯一;点分命名空间,且与路径对应(surface/tools/apply-patch.md)
title: apply_patch 工具
kind: tool                    # tool | command | cli | config | rpc | sdk | subsystem | flow | reference
tier: T1                      # T0 | T1 | T2 | T3
source: [codex-rs/tools/src/apply_patch_tool.rs, codex-rs/apply-patch/src/lib.rs]  # 相对 Best/codex/;纯导览节点可空
symbols: [create_apply_patch_freeform_tool, ApplyPatchToolType]  # 本节点权威覆盖的 Rust 符号(crate 内导出项/方法)
related: [tool.shell, subsys.exec-sandbox.apply-patch-engine, subsys.core.tool-system]  # 其它节点 id,构成图
evidence: explicit            # 页级主导级:explicit | inferred | unknown(未写完可省略)
status: planned               # planned | draft | verified
updated: 0000000              # 末次核对的 git 短 SHA(codex 是 git 仓,staleness 用 SHA)
---
```

必填:`id`、`title`、`kind`、`tier`、`source`(纯导览可空)、`status`。写完补 `evidence`、`updated`(git 短 SHA)。

### 1.2 正文骨架(H2/H3 可预测)

1. 开头一句话定义(blockquote)。
2. `## 能回答的问题` —— 3–6 个该节点应命中的检索问句(对齐"可问答")。
3. 主体 H2/H3:一个概念一段,**显式实体名**,禁止"见上文 / 见某节 / 如前所述"。
4. 行内证据标:非显然且 load-bearing 的论断后缀 `[E: path:line]` / `[I]` / `[U]`。
5. `## Sources` —— 本节点引用的源文件路径(lint 据此核对 frontmatter.source)。
6. `## 相关` —— 指向 `related` 节点的显式链接。

## 2. 自包含规则(LLM 检索核心)

- 节点单独被 grep / 读出时必须**自洽**:必要背景宁可简短重复,也不靠跳转。
- 跨节点引用 = **显式实体名 + 链接**;裸"上文 / 前述 / 见某节"一律禁止。
- 一个概念只在一个**权威**节点详写(由 `symbols` 标定),别处引用并给一句自包含摘要。
- 标题层级稳定:H2 主题 / H3 子题。

## 3. 证据分级(字段级)

- 页级:`frontmatter.evidence` = 主导级。
- 字段级:每条 load-bearing 且非显然论断就近标 `[E]/[I]/[U]`;`[E]` 尽量带 `path:line`。
- `[U]` 同步进 `reference/uncertainty.md`。
- 语义:`[E]` 必须能在所给路径核到;L2 由独立 subagent 逐条证伪。
- **codex 是真源码**:绝大多数论断应能 `[E]` 落到具体 `.rs`/`.ts`/`.py` 行;测试文件(`*_tests.rs`、`tests/`)是强证据,鼓励引用以佐证行为。

## 4. 机读层 schema(index.json)

```json
{
  "wiki": "codex",
  "consumption": "read-md + grep (no vectors)",
  "tiers": { "T0": "spine", "T1": "surface", "T2": "subsystems", "T3": "reference" },
  "evidence_levels": ["explicit", "inferred", "unknown"],
  "staleness": "git-sha",
  "nodes":  [ { "id": "...", "title": "...", "kind": "...", "tier": "...", "path": "...",
               "source": ["..."], "symbols": ["..."], "related": ["..."], "status": "planned" } ],
  "groups": [ { "id": "group.config", "title": "...", "tier": "T1", "kind": "config",
               "dir": "surface/config/", "count": 85, "enumerate": true, "status": "planned" } ]
}
```

- `nodes` = 已枚举的具体节点;`groups` = 一个**分组 catalog 节点覆盖一组实例**的批量(config 键 / slash 命令 / RPC 方法 / Op·Event 变体 / feature flags)。每个 group 在对应 tier 开建时展开成若干 catalog node,**但每个实例都要在某个 catalog node 的表格里逐一出现**(grouped catalog ≠ 丢实例)。
- `llms.txt`、`index.json`、文件树三者一致,由 lint 保证。

## 5. L1 机械 lint 规则(`tools/lint.mjs` 实现)

1. 每个节点有 frontmatter,必填键齐全;`kind`/`tier`/`evidence`/`status` 取值合法。
2. `id` 全局唯一,且与相对路径一致(`tool.apply-patch` ↔ `surface/tools/apply-patch.md`)。
3. `source:` 与正文 `## Sources` 里每个路径都存在于 `Best/codex/`。
4. `related:` 及正文所有节点链接的目标 id 都存在于 index.json。
5. index.json ↔ 文件树:`status≠planned` 的条目必有文件;每个节点文件必在 index.json。
6. `llms.txt` 每个链接都解析到 index.json 中的节点 / 文件。
7. 自包含:grep 正文,命中 `见上文|如前所述|见某节|见上节|前面提到|as mentioned|above` 即告警。
8. 证据:`status=verified` 的节点,load-bearing 段须含 `[E]`,且 `[E: path]` 路径存在。
9. 行号:`[E: path:line]` 的 line 不得超出文件实际行数;且应指向**被断言的代码行本身**,而非其上方的注释/doc-comment(语义精度由 L2 把关)。
10. `updated:` 若存在,须是合法 git 短 SHA(7+ hex)。

> L1 = 机械可刷的下限;真正把关是 L2(独立 subagent 逐 claim 证伪)→ L3(≤2 轮修复)。别把 L1 当验收门。

## 6. 节点模板

### 工具节点 `surface/tools/<slug>.md`(codex 适配)
frontmatter + 一句话 + `## 能回答的问题` +
`1 Identity`(wire name 给模型看的名 / aliases / `ToolHandlerKind` / 所属 crate)· `2 用途定位` · `3 输入 schema 表`(字段·类型·必填·默认·说明·校验,源自 `JsonSchema`/struct)· `4 输出 schema & 截断` · `5 ToolSpec 类型`(`Function`/`Freeform`/`Namespace`/`LocalShell`/`WebSearch`/`ImageGeneration`——及为何选它)· `6 注册与门控`(在 `tool_registry_plan.rs` 的装配条件:`ToolsConfig` 字段 / feature flag / 始终开)· `7 parallel-safe`(`supports_parallel_tool_calls` 实际值 + 为什么)· `8 handler 走读`(该 `ToolHandlerKind` 在 core 的 dispatch/执行路径)· `9 设计动机·edge·历史`(V1/V2、freeform vs json 等)· `## Sources` · `## 相关`

### 子系统节点 `subsystems/**/<slug>.md`
frontmatter + 一句话 + 能回答的问题 + 职责边界 · 关键 crate/文件(证据)· 数据模型(关键 struct/enum/trait)· 控制流(编号步骤,带函数名)· 设计动机与权衡 · gotcha · Sources · 相关

### 脊柱节点 `spine/<slug>.md`
frontmatter + 一句话 + 能回答的问题 + **mermaid 图先行** · 端到端编号步骤(带 `crate::fn` + 文件)· 关键决策点 · 指向 T1/T2 深挖 · Sources

### 引用节点 `reference/<slug>.md`
frontmatter + 符号/类型/变体表(symbol · 签名/变体 · 含义 · 定义处)· 目标≈全覆盖该清单 · Sources

### Catalog 节点(slash-commands / cli / config / app-server-rpc / features 等)
工具模板轻量版,**核心是一张逐实例表**:每行一个实例(命令名/键名/方法名/变体名 · 类型/签名 · 含义 · 默认/门控 · 源 path)。一个 catalog node 覆盖一组(按域分),组内**每个实例都要出现在表里**。表后可加该组的共性机制说明。
