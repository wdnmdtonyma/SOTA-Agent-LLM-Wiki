# RUN — 填充令(codex 源码 LLM Wiki)

你是执行者。把本 wiki(`Best/docs/llm-wiki/codex/`)从"只有骨架"填成完整的、给 agent 检索的 LLM wiki。文档对象是 OpenAI **Codex** 真实源码(`Best/codex/`,相对本目录 `../../../codex/`,~95 crate Rust workspace + TS/Py SDK)。要细到每个工具的字段与设计动机。

## 0. 先读这五个文件(权威规范,必须遵守)
1. `README.md` —— 形态、四支柱、证据图例、优先级、codex 画像。
2. `conventions.md` —— frontmatter schema、自包含规则、证据分级、L1 lint 规则、**各类节点模板**(工具/子系统/脊柱/引用/catalog)。
3. `llms.txt` —— 人机入口索引。
4. `index.json` —— 机读工作清单:`nodes`(具体节点)+ `groups`(分组 catalog)。
5. 本文件 `RUN.md`。

## 1. 工作清单 = index.json
- 把所有 `status:"planned"` 的 `nodes` 填成 `"verified"`。
- 把每个 `groups`(config 键 / slash 命令 / app-server RPC / 协议 Op·Event / feature flags)**展开成具体 catalog node 文件**,并逐个登记进 `index.json.nodes`。**grouped catalog 内每个实例都要在某节点的表格里逐一出现**——分组是为控制文件数,不是为丢实例。
- 进度只看 `status` 字段 → 幂等可续跑:重启后从第一个非 verified 继续。

## 2. 顺序(价值优先)
1. **T0 `spine/`**(~10,mermaid 图先行)—— 先立脊柱(SQ/EQ 架构、一次 turn、工具调用解剖、沙箱执行流 + worked traces),后续节点引用它。
2. **T1 `surface/tools/`**(37)—— 用户核心诉求;`shell_command`/`apply_patch`/`exec_command`/`spawn_agent`/`sleep`/`new_context` 等大件优先。
3. **T2 `subsystems/`**:`core/` → `exec-sandbox/` → `mcp/` → `providers/` → `tui/` → `app-server/` → `config-auth/` → `cloud/` → `platform/`。
4. 展开 **groups**(slash-commands / cli / config / app-server-rpc / features / 协议 catalog)。
5. **T3 `reference/`**(协议 Op/Event catalog、数据模型、crate 索引、glossary、env、uncertainty)。

## 3. 每个节点的循环:L1 → L2 → L3
1. **读源**:打开该 node `source:` 列的真实源文件读,不靠记忆、不靠本 RUN/survey 的转述。
2. **写**:套 `conventions.md` 对应模板。中文讲解 + 英文术语;**自包含**(显式实体名,禁"见上文/见某节/如前所述");每条 load-bearing 且非显然的论断就近标 `[E: path:line]`(相对 `Best/codex/`),推断标 `[I]`,存疑标 `[U]`(并追加到 `reference/uncertainty.md`)。
3. **L1 机械校验**:`node tools/lint.mjs` —— 必须 **0 error** 才算这步过。
4. **L2 独立证伪(关键,绝不可省)**:**另起一个干净的 subagent**,只给它"这个节点 + 它引用的源文件",让它**逐条尝试推翻** `[E]` 论断(它没有你的上下文,只信源码)。被驳倒的改 `[I]/[U]` 或修正。**同时核对每个 `[E: path:line]` 的行号确实落在被断言的那行代码上(不是其上方的注释/doc-comment),漂移就改准——行号精确可核是本 wiki 的卖点。**
5. **L3 修复**:按 L2 反馈修,**≤2 轮**;仍不能证实的降级为 `[I]/[U]`。
6. **收尾**:`status:"verified"`,补 `evidence:` 与 `updated:`(当前 HEAD 的 git 短 SHA);若新增节点,同步写入 `index.json` 和 `llms.txt`。再 `node tools/lint.mjs` 确认 0 error。

> ⚠️ **lint 过 ≠ 完成**。lint 只是结构下限(防漂移),真正把关是 L2 独立证伪。**不要写能骗过 lint 的模板化空话**。

## 4. 工具节点的硬约定
- **`codex-rs/core/src/tools/spec_plan.rs` 是工具集的 ground truth**。开 `surface/tools/` 前先核对 `build_tool_router` → `build_tool_specs_and_registry` → `add_tool_sources` 的装配段,以及 `add_shell_tools` / `add_mcp_resource_tools` / `add_core_utility_tools` / `add_collaboration_tools` / `add_mcp_runtime_tools` / `add_extension_tools` / `add_dynamic_tools` 的门控、specs、handler 注册,**多退少补**(漏的补节点、错的修、真不存在的删并在 `reference/uncertainty.md` 记一笔)。
- **门控要写准**:每个工具节点必须写清它在哪个 `ToolEnvironmentMode` / `Feature` flag / config 字段 / provider capability / model capability 下启用(如 `Feature::TokenBudget`、`Feature::SleepTool`、`Feature::RequestPermissionsTool`、`MultiAgentVersion::V2`、namespace tools capability)。门控是 codex 工具系统的核心。
- **V1/V2 并存**:multi-agent 工具有 V1/V2 两套(`spawn_agent` 等),各自独立节点或在节点内明确区分;别混。

## 5. 纪律
- **歧义自己定**:记成 `[I]/[U]`,继续;不卡单点(查不动 → 标 `[U]` 跳过,先推进其它)。
- **价值排序**:脊柱+工具优先,平台/外围靠后。
- **诚实**:事实永远以 `../../../codex/` 源码为准,不以本 RUN 或 survey 为准。codex 是真源码且有测试——**能核到就核到,别臆造**;拿不准就 `[I]/[U]`。
- **节流提交**:每填完一个节点就更新 `index.json` 状态,保持可续跑。
- **git 隔离坑**:输出全部落在非 git 的 `Best/docs/llm-wiki/codex/`;**不要**往 `Best/codex/` 写文件(subagent isolation 会清掉源仓未跟踪文件)。

## 6. 完成定义
- **单节点**:status=verified;frontmatter 合法;自包含;load-bearing 处有可核到的 `[E]`;`node tools/lint.mjs` 0 error;过了 L2 独立证伪。
- **整体**:`index.json` 无 `planned`;所有 `groups` 已展开为 catalog 节点且组内实例全覆盖;`reference/uncertainty.md` 汇总全部 `[U]`;`node tools/lint.mjs` 全绿。

## 7. 护栏
`tools/lint.mjs` 已就位(L1 机械校验,落地 `conventions.md` 第 5 节规则 + git-SHA 校验);`tools/reconcile.mjs` 把各 node `.md` frontmatter 同步回 `index.json`、合并 `_staging` 的 `[U]`。每写完一个节点跑一次 lint;整体收尾前 reconcile + lint。当前基线:0 error。

## 8. 并发填充模式(多 codex 会话同时跑)
本 wiki 由**多个 codex 会话并发填充**,每个会话负责一批节点(批次清单见你收到的提示词)。为避免并发写冲突,纪律如下:
- **只写你这批的 node `.md` 文件**:每个文件 frontmatter 带 `status: verified` + `updated: <codex HEAD 短 SHA>`(`git -C ../../../codex rev-parse --short HEAD`)。
- **`[U]` 写到 `_staging/uncertainty-<batch>.md`**(你这批专属文件),不要直接写 `reference/uncertainty.md`。
- **绝不修改** `index.json`、`llms.txt`、`reference/uncertainty.md`、或其它批次的文件——这些是共享文件,并发写会互相覆盖。节点的权威状态写在该节点 `.md` 的 frontmatter 里。
- **登记统一做**:一波填完后,由人跑 `node tools/reconcile.mjs`(把 frontmatter 同步进 `index.json`、合并 `_staging`)再 `node tools/lint.mjs`。
- L2 独立证伪仍按 §3.4 做(你可在自己会话内另起干净 subagent 对自己刚写的节点逐条证伪);它只读你这批的文件 + 源码,不碰共享文件。
