# RUN — 填充令(deepseek-harness 源码 LLM Wiki)

你是执行者。把本 wiki(`docs/llm-wiki/deepseek-harness/`)维护成完整的、给 agent 检索的 LLM wiki。文档对象是 **DeepSeek Harness** 真实源码(`deepseek-harness/`,相对本目录 `../../../deepseek-harness/`,Cordis 插件树 + `packages/<group>/<pkg>` TypeScript monorepo)。要细到每个模型可见工具的字段、所属 seam、以及它进了哪几个 shipped preset。

## 0. 先读这五个文件(权威规范,必须遵守)

1. `README.md` —— 形态、四支柱、与官方 docs 的分工、DSH 画像。
2. `conventions.md` —— frontmatter schema(含 `pkg`)、自包含规则、证据分级、L1 lint 规则、**各类节点模板**、**第 7 节 DSH ground-truth 约定**。
3. `llms.txt` —— 人机入口索引。
4. `index.json` —— 机读工作清单:`nodes`(具体节点)+ `groups`(grouped-catalog)。
5. 本文件 `RUN.md`。

对照笔记(身份与 peer 差异,会过期):`../_research/deepseek-harness-vs-peers-2026-08-13.md`。事实以源码为准。

## 1. 工作清单 = index.json

- 把所有 `status:"planned"` 的 `nodes` 填成 `"verified"`。
- 每个 `groups` 由其 `catalog_node`(或 per-node 集合)**逐实例展开**——组内每个实例都要在某节点的表格里出现。
- 进度只看节点 `.md` frontmatter 的 `status` → 幂等可续跑:重启后从第一个非 verified 继续。

## 2. 顺序(价值优先)

1. **T0 `spine/`**(必须先整批跑完,mermaid 图先行)—— 组合启动、turn/step、工具管线、会话日志、seam、压缩 + worked traces。后续节点引用它。
2. **T1 `surface/tools/`** —— 用户核心诉求;`read`/`edit`/`write`/`bash`/`bash-persistent` 大件优先,再 Code Mode / subagent / cordis。
3. **T2 `subsystems/`**:`core/` 与 `composition/` → `execution/` → `orchestration/` / `llm/` / `persistence/` → `interaction/` / `context/` → `host/` / `client/` / `integration/` / `vendor/`。
4. **T1 其它可见面 + T3 `reference/` catalog**:presets / CLI / Web / ACP / SDK + tools/events/config/env/ctx-keys catalog。
5. **cross 引用**:package-index、glossary、uncertainty(uncertainty 由 reconcile 生成,勿手写)。

## 3. 每个节点的循环:L1 → L2 → L3

1. **读源**:打开该 node `source:` 列的真实源文件读,不靠记忆、不靠本 RUN / 官方 docs / 对照笔记的转述。
2. **写**:套 `conventions.md` 对应模板。中文讲解 + 英文术语;**自包含**;每条 load-bearing 且非显然的论断就近标 `[E: path:line]`(相对 `deepseek-harness/`),推断标 `[I]`,存疑标 `[U]`(并追加到 `_staging/uncertainty-<batch>.md`)。
3. **L1 机械校验**:`node tools/lint.mjs` —— 必须 **0 error** 才算这步过。
4. **L2 独立证伪(关键,绝不可省)**:**另起一个干净的 subagent**,只给它"这个节点 + 它引用的源文件",让它**逐条尝试推翻** `[E]` 论断并核行号。被驳倒的改 `[I]/[U]` 或修正。
5. **L3 修复**:按 L2 反馈修,**≤2 轮**;仍不能证实的降级为 `[I]/[U]`。
6. **收尾**:`status:"verified"`,补 `evidence:` 与 `updated:`(`git -C ../../../deepseek-harness rev-parse --short=10 HEAD`);若新增节点,只写它的 `.md`(reconcile 会登记)。再 `node tools/lint.mjs` 确认 0 error。

> ⚠️ **lint 过 ≠ 完成**。lint 只是结构下限。**不要写能骗过 lint 的模板化空话,也不要把官方 docs 改写成中文交差。**

## 4. 工具 / preset / 组合的硬约定(展开前先核 ground truth)

见 `conventions.md` 第 7 节。摘要:

- 工具集 = `packages/*/tool-*` + 同样注册到 `ctx.tools` 的 plan-mode / Code Mode / schedule / tool-cordis;以 boot 后 `ctx.tools.schemas()` 为准。
- `bash` 拆两页。`subagent` / `subagent_fork` 拆两页。
- Preset 成员资格以 `apps/cli/config/agent-presets/*/agent.cordis.yml` 为准。
- 组合真树以 `packages/boot/app-boot` + 各 `cordis.patch.yml` 为准。
- `[E]` 不得指向 `docs/**` 或 `.agents/notes/**`。

## 5. 纪律

- **歧义自己定**:记成 `[I]/[U]`,继续;不卡单点。
- **价值排序**:脊柱+工具优先,client UI / Typert / 测试基建靠后。
- **诚实**:事实永远以 `../../../deepseek-harness/` 源码为准。官方文档会过期(已发生过:base bundle 不再 dormant 加载 Codex/Claude 子代理,旧 Note 仍这么写)。
- **节流提交**:每填完一个节点就更新该 `.md` 的 `status`,保持可续跑。
- **git 隔离坑**:输出全部落在 `docs/llm-wiki/deepseek-harness/`;**不要**往 `deepseek-harness/` 写文件。
- **生成物**:`docs/tool-catalog.md`、`docs/config-catalog.md`、`docs/module-graph.md`、各页 Cordis API 区是生成物,可对照但别当手写源理解。

## 6. 完成定义

- **单节点**:status=verified;frontmatter 合法(含 `pkg`);自包含;load-bearing 处有可核到的 `[E]`;`node tools/lint.mjs` 0 error;过了 L2 独立证伪。
- **整体**:`index.json` 无 `planned`;所有 `groups` 已展开且组内实例全覆盖;`reference/uncertainty.md` 汇总全部 `[U]`;`node tools/lint.mjs` 全绿。

## 7. 护栏

`tools/lint.mjs` 与 `tools/reconcile.mjs` 已就位。每波填完由 lead 跑 reconcile + lint;整体收尾前再 reconcile + lint 全绿。

## 8. 编排:单会话 + 多 subagent 并行填充

本 wiki 由**一个 lead 会话**编排,用 **subagent 并行**填节点。节点级并行是安全的:每个节点是独立 `.md`、源码只读,填充期不动 `index.json`/`llms.txt`。

**lead 会话(串行,唯一改共享文件者):**

- **批 A(脊柱)必须先整批跑完**;之后按 §2 逐波,单波并发量框住。
- 每批跑两波 fan-out:
  1. **填充波**:每个节点一个 filler(并行,建议单波 ≤8–10),读源 → 套模板写自己的 `<node>.md` → frontmatter 暂置 `status: draft`。
  2. **L2 证伪波**:每个刚填的节点一个**全新** verifier,只给"该节点 `.md` + `source:` 列",逐条推翻 `[E:]` 并核行号;通过 → `status: verified` + `updated: <dsh HEAD 短 SHA>`,被驳 → 留 `draft` 记原因,交 L3。
- 每波之后由 **lead** 跑 `node tools/reconcile.mjs` 再 `node tools/lint.mjs`(须 0 error);对报错节点派 L3(≤2 轮)。

**subagent(并行,纪律):**

- **只写两类文件**:自己负责的 `<node>.md`,和自己的 `_staging/uncertainty-<batch>-<slug>.md`(`<slug>` = 节点 id 末段)。
- **绝不**碰 `index.json`、`llms.txt`、`reference/uncertainty.md`、`tools/*`、或别的节点 `.md`。
- 源码(`../../../deepseek-harness/`)只读;不要自己跑 reconcile。L1 自检可跑 `tools/lint.mjs`,并行时只看含自己 `node:<path>` 的报错。

## 9. 建议批次(seed 后)

| 批 | 内容 | 约束 |
|---|---|---|
| A | 全部 `spine/*` | 串行整批完成后再开后面 |
| B | `surface/tools/{read,read-image,write,edit,glob,grep,str-replace-editor,bash,bash-persistent,pwsh}` | 并行 ≤10 |
| C | 其余 `surface/tools/*` | 并行 |
| D | `subsystems/core/*` + `subsystems/composition/*` | 并行 |
| E | `subsystems/execution/*` + `subsystems/llm/*` | 并行 |
| F | `subsystems/orchestration/*` + `subsystems/persistence/*` + `subsystems/context/*` | 并行 |
| G | `subsystems/interaction/*` + T1 presets/cli/providers/skills/mcp/hooks | 并行 |
| H | host/client/integration/vendor + 其余 T1 + T3 catalog | 并行;client UI 保持 seam 粒度,不要 30 个 `ui-*` 各一页 |

新增节点可以,但必须能说清它不与现有权威节点抢 `symbols`,并在该波结束后由 lead reconcile。
