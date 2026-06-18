# RUN — 填充令(opencode 源码 LLM Wiki)

你是执行者。把本 wiki(`Best/docs/llm-wiki/opencode/`)从"只有骨架"填成完整的、给 agent 检索的 LLM wiki。文档对象是 SST **opencode** 真实源码(`Best/opencode/`,相对本目录 `../../../opencode/`,27-package Bun/TS Effect monorepo)。要细到每个工具的字段与设计动机。

## 0. 先读这五个文件(权威规范,必须遵守)
1. `README.md` —— 形态、四支柱、证据图例、优先级、opencode 画像(尤其 V1/V2 主线)。
2. `conventions.md` —— frontmatter schema(含 `v` 字段)、自包含规则、证据分级、L1 lint 规则、**各类节点模板**。
3. `llms.txt` —— 人机入口索引。
4. `index.json` —— 机读工作清单:`nodes`(具体节点)+ `groups`(grouped-catalog)。
5. 本文件 `RUN.md`。

## 1. 工作清单 = index.json
- 把所有 `status:"planned"` 的 `nodes` 填成 `"verified"`。
- 每个 `groups`(config 键 / CLI 命令 / HTTP 路由 / SDK 方法 / plugin hooks / LSP server / formatter / 主题 / 键位 / DB 表+迁移 / env / 事件 / package)由其 `covered_by_nodes` 个 grouped-catalog 节点**逐实例覆盖**——组内每个实例都要在某节点表格里逐一出现。
- 进度只看 `status` 字段 → 幂等可续跑:重启后从第一个非 verified 继续。

## 2. 顺序(价值优先)
1. **T0 `spine/`**(15,mermaid 先行)—— 先立脊柱(尤其 `v1-v2-relationship`、`v1-turn-loop`、`v2-overview`/`v2-provider-turn`),后续节点引用它;再补 4 个 worked trace。
2. **T1 `surface/tools/`**(17)—— 用户核心诉求;`read`/`edit`/`bash`/`apply-patch`/`task` 等大件优先。`v:shared` 工具一节点内分 V1/V2。
3. **T2 `subsystems/`**:`session-v2/` → `session-v1/` → `model-layer/` → `execution/` → `integrations/` → `persistence/` → `tui/` → `server/`,最后 `clients/`+`infra/`+`peripheral/`。
4. 展开 **groups**(config / cli / server-routes / sdk / plugin-hooks / lsp / formatters / themes / keybinds / db / env / events / packages)。
5. **T3 `reference/`**(catalog、glossary、package 索引、uncertainty)。

## 3. 每个节点的循环:L1 → L2 → L3
1. **读源**:打开该 node `source:` 列的真实源文件读,不靠记忆、不靠本 RUN/survey 的转述。工具节点的 ground truth 是 `packages/opencode/src/tool/registry.ts`(V1)与 `packages/core/src/tool/tools.ts`+`builtins.ts`(V2)。
2. **写**:套 `conventions.md` 对应模板。中文讲解 + 英文术语;**自包含**(显式实体名,禁"见上文/见某节/如前所述");每条 load-bearing 且非显然的论断就近标 `[E: path:line]`(相对 `Best/opencode/`,行号落在被断言那行本身,不是上方注释),推断标 `[I]`,存疑标 `[U]`。**`v:shared` 节点必须把 V1 与 V2 实现显式分开讲**(用 `## V1`/`## V2` 或 V1/V2 列)。
3. **L1 机械校验**:`node tools/lint.mjs` —— 必须 **0 error** 才算这步过。
4. **L2 独立证伪(关键,绝不可省)**:**另起一个干净的 subagent**,只给它"这个节点 + 它引用的源文件",让它**逐条尝试推翻** `[E]` 论断(它没有你的上下文,只信源码)。被驳倒的改 `[I]/[U]` 或修正。**同时核对每个 `[E: path:line]` 行号确实落在被断言那行代码上(不是上方注释/JSDoc),漂移就改准——行号精确可核是本 wiki 的卖点。**
5. **L3 修复**:按 L2 反馈修,**≤2 轮**;仍不能证实的降级为 `[I]/[U]`。
6. **收尾**:`status:"verified"`,补 `evidence:` 与 `updated:`(`git -C ../../../opencode rev-parse --short HEAD`);若新增节点,同步写入 `index.json` 和 `llms.txt`。再 `node tools/lint.mjs` 确认 0 error。

> ⚠️ **lint 过 ≠ 完成**。lint 只是结构下限(防漂移),真正把关是 L2 独立证伪。**不要写能骗过 lint 的模板化空话**。

## 4. opencode 专属硬约定
- **V1/V2 标对**:每个节点 `v:` 必须填准。`shared` 节点不许把 V1/V2 混讲——读者要能一眼看出某行为属哪一代、哪个是当前活跑路径。拿不准某代码是否 live-wired 就 `[I]` 并说明。
- **工具 ground truth + gating**:每个工具节点写清它的 wire name、在哪个 registry 装配、被哪个 agent permission / runtime flag / 模型族门控(如 `apply_patch` 仅 GPT-patch 模型、`lsp`/`plan_exit` 仅对应 experimental flag、`task` 背景模式需 `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS`)。
- **两个 server 都是 Effect HttpApi**(不是 Hono):别把 "V1 server" 写成 Hono。V1 = `packages/opencode/src/server`(挂全部,含 `/api/*`),V2 = `@opencode-ai/server`(`/api/*`)。
- **命名陷阱**(写时点明,避免读者混淆):`session/message-v2.ts` 其实是 V1↔AI-SDK 消息转换层;`core/src/integration.ts` + `core/src/credential.ts` 是本地 provider authentication/credential registry(不是云连接器);`storage/schema.ts` re-export 的是 V2 Drizzle 表。

## 5. 纪律
- **歧义自己定**:记成 `[I]/[U]`,继续;不卡单点(查不动 → 标 `[U]` 跳过,先推进其它)。
- **价值排序**:脊柱+工具优先,clients/infra/peripheral 靠后(但本 wiki 要求全 monorepo 同深度,别省,只是顺序靠后)。
- **诚实**:事实永远以 `../../../opencode/` 源码为准,不以本 RUN 或 survey 为准。能核到就核到,绝不臆造;拿不准就 `[I]/[U]`。
- **节流提交**:每填完一个节点就更新 `index.json` 状态,保持可续跑。
- **git 隔离坑**:输出全部落在非 git 的 `Best/docs/llm-wiki/opencode/`;**不要**往 `Best/opencode/` 写文件(它是 git 仓 + subagent isolation 会清掉源仓未跟踪文件)。

## 6. 完成定义
- **单节点**:status=verified;frontmatter 合法(含 `v`、`updated` 短 SHA);自包含;load-bearing 处有可核到的 `[E]`;`v:shared` 已显式分 V1/V2;`node tools/lint.mjs` 0 error;过了 L2 独立证伪。
- **整体**:`index.json` 无 `planned`;所有 `groups` 已被 grouped-catalog 节点逐实例覆盖;`reference/uncertainty.md` 汇总全部 `[U]`;`node tools/lint.mjs` 全绿。

## 7. 护栏(已就位)
`tools/lint.mjs`(L1 机械校验,落地 `conventions.md` 第 5 节 10 条规则 + opencode 短 SHA 校验)与 `tools/reconcile.mjs`(把各 node `.md` frontmatter 的 status/evidence/updated/symbols 同步回 `index.json`、登记新节点、合并 `_staging/uncertainty-*.md` → `reference/uncertainty.md`)**已实现并自测通过(当前 0 error)**,无外部依赖,`node` 直接跑。每写完一个节点跑一次 `node tools/lint.mjs`;整体收尾前 `node tools/reconcile.mjs` + `node tools/lint.mjs`。

## 8. 并发填充模式(多会话同时跑)
本 wiki 可由**多个会话并发填充**,每个会话负责一批节点。为避免并发写冲突:
- **只写你这批的 node `.md` 文件**:frontmatter 带 `status: verified` + `updated: <opencode HEAD 短 SHA>`。
- **`[U]` 写到 `_staging/uncertainty-<batch>.md`**(你这批专属文件),不要直接写 `reference/uncertainty.md`。
- **绝不修改** `index.json`、`llms.txt`、`reference/uncertainty.md`、或其它批次的文件——这些是共享文件,并发写会互相覆盖。节点权威状态写在该节点 `.md` 的 frontmatter 里。
- **登记统一做**:一轮填完后,由人跑 `node tools/reconcile.mjs` 再 `node tools/lint.mjs`。
- **抽验**:每轮随机抽 2–3 个节点,另起干净 subagent 只给它"节点 + 引用源码",逐条证伪 `[E]`;发现糊弄/行号漂移就把该批打回。这是真正防"模板化空壳"的关卡。
