# RUN — Codex 自驱填充令(claude 源码 LLM Wiki)

你是无人值守的执行者。把本 wiki(`Best/docs/llm-wiki/claude/`)从"只有骨架"填成完整的、给 agent 检索的 LLM wiki。文档对象是逆向的 Claude Code 源码(`Best/claude/`,相对本目录 `../../../claude/`,~513K LOC)。要细到每个工具的字段与设计动机。

## 0. 先读这五个文件(权威规范,必须遵守)
1. `README.md` —— 形态、四支柱、证据图例、优先级。
2. `conventions.md` —— frontmatter schema、自包含规则、证据分级、L1 lint 规则、**各类节点模板**(工具/子系统/脊柱/引用/命令)。
3. `llms.txt` —— 人机入口索引。
4. `index.json` —— 机读工作清单:`nodes`(具体节点)+ `groups`(待展开批量)。
5. 本文件 `RUN.md`。

## 1. 工作清单 = index.json
- 把所有 `status:"planned"` 的 `nodes` 填成 `"verified"`。
- 把每个 `groups`(命令 ~77 / hook 事件 27 / settings / React hooks 104 / UI 组件族)**展开成具体 node 文件**,并逐个登记进 `index.json.nodes`。
- 进度只看 `status` 字段 → 幂等可续跑:重启后从第一个非 verified 继续。

## 2. 顺序(价值优先)
1. **T0 `spine/`**(6,mermaid 图先行)—— 先立脊柱,后续节点引用它。
2. **T1 `surface/tools/`**(57)—— 用户核心诉求;`Bash`/`Read`/`Edit`/`Agent`/`Skill` 等大件优先。
3. **T2 `subsystems/`**(26)。
4. 展开 **groups**(commands/hooks/settings/react-hooks/ui-families)。
5. **T3 `reference/`**(数据模型、Tool 接口 catalog、glossary、feature flags、env、uncertainty)。

## 3. 每个节点的循环:L1 → L2 → L3
1. **读源**:打开该 node `source:` 列的真实源文件读,不靠记忆、不靠本 RUN 的转述。
2. **写**:套 `conventions.md` 对应模板。中文讲解 + 英文术语;**自包含**(显式实体名,禁"见上文/见某节/如前所述");每条 load-bearing 且非显然的论断就近标 `[E: path:line]`,推断标 `[I]`,存疑标 `[U]`(并追加到 `reference/uncertainty.md`)。
3. **L1 机械校验**:`node tools/lint.mjs` —— 必须 **0 error** 才算这步过。
4. **L2 独立证伪(关键,绝不可省)**:**另起一个干净的 subagent**,只给它"这个节点 + 它引用的源文件",让它**逐条尝试推翻** `[E]` 论断(它没有你的上下文,只信源码)。被驳倒的改 `[I]/[U]` 或修正。**同时核对每个 `[E: path:line]` 的行号确实落在被断言的那行代码上(不是其上方的注释/JSDoc 行),漂移就改准——行号精确可核是本 wiki 的卖点。**
5. **L3 修复**:按 L2 反馈修,**≤2 轮**;仍不能证实的降级为 `[I]/[U]`。
6. **收尾**:`status:"verified"`,补 `evidence:` 与 `updated:`;若新增节点,同步写入 `index.json` 和 `llms.txt`。再 `node tools/lint.mjs` 确认 0 error。

> ⚠️ **lint 过 ≠ 完成**。lint 只是结构下限(防漂移),真正把关是 L2 独立证伪。**不要写能骗过 lint 的模板化空话**。

## 4. 工具节点的两个硬约定
- **`tools.ts` 是工具集的 ground truth**。survey 给的清单(57)可能有出入:开 `surface/tools/` 前先核对 `tools.ts` 的装配段(`getAllBaseTools` / 各 `feature()? require()` / 最终数组),**多退少补**(漏的补节点、错的修、真不存在的删并在 `reference/uncertainty.md` 记一笔)。
- **`impl_absent:true` 的工具**(14 个 feature-gated,实现文件未含在 dump 里,只有 `tools.ts` 注册):节点做成**注册级薄页**——记其 name、feature flag、在 `tools.ts` 的注册方式、能看到的 schema;实现细节一律 `[U]`,不要编。

## 5. 自驱纪律(长时间无人值守)
- **不问人**:歧义自己定,记成 `[I]/[U]`,继续。
- **不卡单点**:某节点查不动 → 标 `[U]` 跳过,先推进其它,绝不停摆。
- **价值排序**:脊柱+工具优先,边角靠后。
- **诚实**:逆向命名/结构可能不准;拿不准就 `[I]/[U]`,**绝不臆造**。事实永远以 `../../../claude/` 源码为准,不以本 RUN 或 survey 为准。
- **节流提交**:每填完一个节点就更新 `index.json` 状态,保持可续跑。

## 6. 完成定义
- **单节点**:status=verified;frontmatter 合法;自包含;load-bearing 处有可核到的 `[E]`;`node tools/lint.mjs` 0 error;过了 L2 独立证伪。
- **整体**:`index.json` 无 `planned`;所有 `groups` 已展开为节点;`reference/uncertainty.md` 汇总全部 `[U]`;`node tools/lint.mjs` 全绿。

## 7. 护栏
`tools/lint.mjs` 已就位(落地 `conventions.md` 第 5 节 8 条 L1 规则:frontmatter 完整性、id↔path、source 存在性、related 解析、index↔文件树一致、llms.txt 链接解析、自包含禁词、verified 节点证据完整)。每写完一个节点跑一次;整体收尾前再跑一次。当前基线:0 error。
