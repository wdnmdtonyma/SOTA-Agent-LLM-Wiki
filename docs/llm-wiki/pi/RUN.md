# RUN — 填充令(pi 源码 LLM Wiki)

你是执行者(codex)。把本 wiki(`docs/llm-wiki/pi/`)从"只有骨架"填成完整的、给 agent 检索的 LLM wiki。文档对象是 **pi** 真实源码(`pi/`,相对本目录 `../../../pi/`,5-package TypeScript monorepo)。要细到每个工具的字段与设计动机。

## 0. 先读这五个文件(权威规范,必须遵守)
1. `README.md` —— 形态、四支柱、证据图例、优先级、pi 画像(分层栈 + pkg 字段)。
2. `conventions.md` —— frontmatter schema(含 `pkg`)、自包含规则、证据分级、L1 lint 规则、**各类节点模板**、**第 7 节 pi ground-truth 约定**。
3. `llms.txt` —— 人机入口索引。
4. `index.json` —— 机读工作清单:`nodes`(具体节点)+ `groups`(grouped-catalog)。
5. 本文件 `RUN.md`。

## 1. 工作清单 = index.json
- 把所有 `status:"planned"` 的 `nodes` 填成 `"verified"`。
- 每个 `groups`(provider / 模型 / config 键 / slash 命令 / 键位 / RPC 方法 / 扩展事件 / 环境变量 / 组件)由其 `catalog_node` 节点**逐实例展开**——**grouped catalog 内每个实例都要在该节点的表格里逐一出现**(分组是为控制文件数,不是为丢实例)。
- 进度只看节点 `.md` frontmatter 的 `status` → 幂等可续跑:重启后从第一个非 verified 继续。

## 2. 顺序(价值优先)
1. **T0 `spine/`**(12,mermaid 图先行)—— 先立脊柱(分层架构、agent-loop 一次 turn、工具调用解剖、provider stream、会话/压缩、扩展生命周期 + 3 worked traces),后续节点引用它。
2. **T1 `surface/tools/`**(7)—— 用户核心诉求;`bash`/`edit`/`read`/`write` 大件优先。
3. **T2 `subsystems/`**:`coding-agent/` 与 `agent-core/`(脊柱依赖)→ `ai/` → `tui/` → `orchestrator/`。
4. **T1 其它可见面 + T3 `reference/` catalog**:cli/modes/config/extensions/providers/skills/slash/sdk + provider/model/config-keys/slash/keybinding/rpc/extension-event/env catalog。
5. **cross 引用**:package-index、glossary、uncertainty(uncertainty 由 reconcile 生成,勿手写)。

## 3. 每个节点的循环:L1 → L2 → L3
1. **读源**:打开该 node `source:` 列的真实源文件读,不靠记忆、不靠本 RUN/survey 的转述。
2. **写**:套 `conventions.md` 对应模板。中文讲解 + 英文术语;**自包含**(显式实体名,禁"见上文/见某节");每条 load-bearing 且非显然的论断就近标 `[E: path:line]`(相对 `pi/`),推断标 `[I]`,存疑标 `[U]`(并追加到 `_staging/uncertainty-<batch>.md`)。**跨包节点**显式点名对方节点 id。
3. **L1 机械校验**:`node tools/lint.mjs` —— 必须 **0 error** 才算这步过。
4. **L2 独立证伪(关键,绝不可省)**:**另起一个干净的 subagent**,只给它"这个节点 + 它引用的源文件",让它**逐条尝试推翻** `[E]` 论断(它没有你的上下文,只信源码)。被驳倒的改 `[I]/[U]` 或修正。**同时核对每个 `[E: path:line]` 的行号确实落在被断言的那行代码上(不是其上方的注释/import/空行),漂移就改准——行号精确可核是本 wiki 的卖点。**
5. **L3 修复**:按 L2 反馈修,**≤2 轮**;仍不能证实的降级为 `[I]/[U]`。
6. **收尾**:`status:"verified"`,补 `evidence:` 与 `updated:`(`git -C ../../../pi rev-parse --short HEAD`);若新增节点,只写它的 `.md`(reconcile 会登记)。再 `node tools/lint.mjs` 确认 0 error。

> ⚠️ **lint 过 ≠ 完成**。lint 只是结构下限(防漂移),真正把关是 L2 独立证伪。**不要写能骗过 lint 的模板化空话**。

## 4. 工具 / provider 节点的硬约定(展开前先核 ground truth)
- **内置工具集 ground truth = `packages/coding-agent/src/core/tools/index.ts`**:`ToolName` 类型 + `allToolNames` + `createAllToolDefinitions`/`createCodingToolDefinitions`/`createReadOnlyToolDefinitions`。装配进会话在 `packages/coding-agent/src/core/agent-session.ts` 的 `_buildRuntime`(经 `tool-definition-wrapper`)。**多退少补**:漏的补节点、错的修、真不存在的删并在 `_staging/uncertainty-<batch>.md` 记一笔。
- **每个工具节点写清**:输入 schema(源自 `createXToolDefinition` 的 TypeBox parameters)、输出 `XToolDetails` 与截断、`executionMode`(sequential/parallel)、`XOperations` 可插拔点(远程执行)、注册装配路径。
- **provider 集 ground truth = `packages/ai/src/providers/all.ts`(`builtinProviders()`)**;模型来自各 `providers/<name>.models.ts` 汇入 `models.generated.ts`(**generated,勿改源**)。wire 协议在 `packages/ai/src/api/<name>.ts`,按 `Model.api` 经 `<name>.lazy.ts` 派发。
- **可复用边界**:`pi-agent-core` 的逻辑(loop/会话/压缩/skills)是任何 app 可用的;`pi-coding-agent` 是产品装配。脊柱与跨包节点必须把这条边界写清,标 `pkg` 准确。

## 5. 纪律
- **歧义自己定**:记成 `[I]/[U]`,继续;不卡单点(查不动 → 标 `[U]` 跳过,先推进其它)。
- **价值排序**:脊柱+工具优先,tui/orchestrator/平台靠后。
- **诚实**:事实永远以 `../../../pi/` 源码为准,不以本 RUN 或 survey 为准。pi 是真源码且有测试——**能核到就核到,别臆造**;拿不准就 `[I]/[U]`。
- **节流提交**:每填完一个节点就更新该 `.md` 的 `status`,保持可续跑。
- **git 隔离坑**:输出全部落在非 git 的 `docs/llm-wiki/pi/`;**不要**往 `pi/` 写文件(subagent isolation 会清掉源仓未跟踪文件)。
- **generated 文件**:`packages/ai/src/models.generated.ts`、`image-models.generated.ts` 是生成物,可引用但别当手写源理解(改在 `scripts/generate-*.ts`)。

## 6. 完成定义
- **单节点**:status=verified;frontmatter 合法(含 `pkg`);自包含;load-bearing 处有可核到的 `[E]`;`node tools/lint.mjs` 0 error;过了 L2 独立证伪。
- **整体**:`index.json` 无 `planned`;所有 `groups` 已由 `catalog_node` 展开且组内实例全覆盖;`reference/uncertainty.md` 汇总全部 `[U]`;`node tools/lint.mjs` 全绿。

## 7. 护栏
`tools/lint.mjs`(L1 机械校验,落地 `conventions.md` 第 5 节规则 + git-SHA 校验)与 `tools/reconcile.mjs`(把各 node `.md` frontmatter 同步回 `index.json`、登记新节点、合并 `_staging/uncertainty-*.md` → `reference/uncertainty.md`)已就位,自测 0 error。每波填完由 lead 跑 reconcile + lint(见 §8);整体收尾前再 reconcile + lint 全绿。

## 8. 编排:单会话 + 多 subagent 并行填充
本 wiki 由**一个 lead codex 会话**编排,用 **subagent 并行**填节点。节点级并行是安全的:每个节点是独立 `.md` 文件、源码只读、填充期不动 `index.json`/`llms.txt`,跨节点 `related`/正文链接靠 `index.json` 解析(177 个 planned 已全登记)→ 节点之间**无写依赖、无先后约束**。批次=fan-out 清单,见 `_fill-prompts.md`(含 lead/filler/verifier 三段提示词)。

**lead 会话(串行,唯一改共享文件者):**
- 按批次推进:**批 A(脊柱)必须先整批跑完**(后续节点要读完成的脊柱 prose 才写得准);之后 B–H 逐波,可合并,只要把单波并发量框住。
- 每批跑两波 fan-out:
  1. **填充波**:每个节点派一个 filler subagent(并行,建议单波 ≤8–10 个),各自读源 → 套模板写自己的 `<node>.md`(标 `[E: path:line]`)→ frontmatter 暂置 `status: draft`。
  2. **L2 证伪波**:每个刚填的节点派一个**全新** verifier subagent(并行),只给它"该节点 `.md` + 它 `source:` 列的源文件",逐条尝试推翻 `[E:]` 并核行号;通过 → 把该 `.md` 置 `status: verified` + `updated: <pi HEAD 短 SHA>`,被驳 → 留 `draft` 记原因,交 L3。
- 每波之后(串行)由 **lead** 跑 `node tools/reconcile.mjs`(同步 frontmatter→`index.json`、合并 `_staging`)再 `node tools/lint.mjs`(须 0 error);对报错节点派 L3 修复 subagent(≤2 轮)。
- 因为 lead 是**唯一且串行**地碰 `index.json`/`llms.txt`/reconcile,**不存在跨会话写竞争**。lead 自己上下文保持精简:只读 subagent 的返回摘要 + lint 输出,不把每个节点正文拉进自己上下文。

**subagent(并行,纪律):**
- **只写两类文件**:自己负责的 `<node>.md`,和自己的 `_staging/uncertainty-<batch>-<slug>.md`(`[U]` 暂存,`<slug>` = 节点 id 末段)。**每节点独立暂存文件**——这是批内唯一会被多 subagent 同时写的点,拆开就不打架(`reconcile` glob `uncertainty-*.md` 全量合并,无需改)。
- **绝不**碰 `index.json`、`llms.txt`、`reference/uncertainty.md`、`tools/*`、或别的节点 `.md`——这些由 lead 串行管理。
- 源码(`../../../pi/`)只读;不要自己跑 reconcile。L1 自检可跑 `tools/lint.mjs`,但并行时只看含自己 `node:<path>` 的报错(兄弟节点在写会有瞬时噪音,planned 未落盘者不报错)。

> 备选:也可退化成"一批一会话"并行多个 lead——那回到多会话模型,此时**任何会话都不得跑 reconcile / 改 `index.json`**,由人最后统一 reconcile + lint。**默认推荐单 lead 会话编排全程**。
