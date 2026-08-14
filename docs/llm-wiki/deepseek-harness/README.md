# DeepSeek Harness 源码 LLM Wiki

一份给 **agent 检索/消费**(其次:可问答 → onboarding)的知识库,覆盖 **DeepSeek Harness**(`deepseek-harness/`,`dsh`)的真实源码——一个 **vendor Cordis + `packages/<group>/<pkg>` TypeScript monorepo**,产品命题是**组装运行时**:profile / bundle / agent preset 叠成一棵可逆插件树,agent loop 本身也是插件。细到每个模型可见工具的字段、所属 seam、以及它进了哪几个 shipped preset。

## 这是 LLM wiki,不是书

按 LLM-wiki 通行建议(DeepWiki / llms.txt / LLM 文档实践)+ 本项目方法论组织。四条支柱:

1. **机读入口** —— `llms.txt`(人机皆读)+ `index.json`(机读清单):列出每个节点 + 一句话 + 源文件。agent 先读它 / grep 定位,而非翻线性目录。
2. **自包含节点** —— 每页一个概念,**单独被检索出来也完整**;用**显式实体名**(写 `deriveMessages`,不写"见上文那个投影");H2/H3 层级可预测。
3. **证据可机器校验** —— 每条非显然论断挂源码路径,分级 `[E]` explicit / `[I]` inferred / `[U]` unknown。
4. **分层 + 图** —— T0 脊柱 / T1 模型·用户·集成可见面 / T2 内部子系统 / T3 符号 catalog;架构与数据流用 mermaid。

> 消费模型:**读 md + grep,不建向量**。优化的是"一个概念一个文件、路径可预测、可 grep",而非向量 chunk 技巧。优先级:① agent 消费 ② 可问答 ③ onboarding。

## 和官方 `deepseek-harness/docs/` 的分工

DSH 上游已经有一套人读 + CI 保鲜的文档(architecture / subsystems / 生成 catalogs / Agent Notes / VitePress)。**本 wiki 不翻译、不镜像那套树。**

| 问题 | 去哪 |
|---|---|
| 类型长什么样、`ctx` 上挂哪些服务 | 官方 `docs/subsystems/`(有 `verify-type-equiv`) |
| 此刻模型看见的 tool schema | 官方生成的 `docs/tool-catalog.md`(boot 后读 `ctx.tools.schemas()`) |
| 一次 turn 在源码里怎么走、行号在哪、和 Claude/Codex/Pi/OpenCode 怎么比 | **本 wiki** |
| 官方页和代码打架时听谁的 | **源码**。官方 md 只当设计意图,不能当 `[E]` |

对照笔记(会过期,以源码为准):[`../_research/deepseek-harness-vs-peers-2026-08-13.md`](../_research/deepseek-harness-vs-peers-2026-08-13.md)。

## DSH 的形态(决定本 wiki 的画像)

- **真源码**:公开 MIT 仓,developer preview(`0.1.0-rc.5` 起)。**staleness 用 deepseek-harness git SHA**,节点 `updated:` 记 fill 时的 10 位短 SHA。`SESSION_FORMAT_VERSION` 现为 `0`,无兼容承诺。
- **TypeScript ESM monorepo**:Node `^22.19` 或 `>=24`,pnpm 11。源路径一律相对 `deepseek-harness/`(如 `packages/core/agent-loop/src/agent.ts`)。本 wiki 目录下源码在 `../../../deepseek-harness/`。
- **★ 组合运行时 = 全 wiki 的组织主线**:没有特权核心可打补丁。
  - **profile**(`web` / `headless` 模板):进程级组成。bundle 列表 + 用户 `cordis.patch.yml` + `--patch`。
  - **bundle**(`dsh-base` / `dsh-web-app` / `dsh-headless`):以 patch 层分发的插件行。
  - **agent preset**(`minimal` / `standard` / `code` / `cordis`):每会话 `agent.cordis.yml`,挂工具与 persona,发布的服务必须 isolate。
  - **capability seam** = Service Definition / Provider / Consumer。换 `ctx.fs` + `ctx.subprocess` 会带走 Bash / PTY / LSP。
  - **model-visible ⟺ logged**:进模型请求的东西必须能从 append-only `SessionEvent` 日志重建;`deriveMessages()` 投影历史。
  - 默认安装路径是本地 Web GUI(`dsh web`),不是 TUI。
- **`pkg` 字段**(14 档,不是 50 个 package group):`composition` / `core` / `llm` / `execution` / `orchestration` / `context` / `persistence` / `interaction` / `host` / `client` / `integration` / `vendor` / `util` / `cross`。
- **范围**:**全 monorepo 同深度**——含 host/client Web、ACP、TS/Python SDK、vendor Cordis。填写顺序价值优先:脊柱与工具在前,UI 插件与测试基建在后。

## 结构

```
llms.txt          入口索引(agent 从这里定位;人也能读)
index.json        机读节点清单(nodes[] 具体节点 + groups[] grouped-catalog)
README.md         本文件:向导 + 四支柱 + 证据图例 + DSH 画像
conventions.md    节点模板 + frontmatter schema(含 pkg)+ 证据分级 + L1 lint 规则 + DSH ground-truth 约定
RUN.md            填充令:读序 / 填序 / L1→L2→L3 循环 / 工具与组合 ground truth
spine/            T0 端到端"怎么跑"(mermaid 先行)+ worked traces
surface/          T1 可见面:tools/ presets/ profiles/ cli/ config/ providers/ skills/ mcp/ hooks/ acp/ sdk/ web/ misc/
subsystems/       T2 按 seam / 控制流,不按官方 docs/subsystems 一页镜像
reference/        T3 catalog · glossary · 不确定项 · package 索引
tools/            lint.mjs · reconcile.mjs
_staging/         并发填充时 uncertainty-<batch>.md 暂存
```

## 证据图例

- `[E]` explicit —— 源码直证,尽量带路径:`[E: packages/core/agent-loop/src/agent.ts:42]`(相对 `deepseek-harness/`)
- `[I]` inferred —— 基于代码的合理推断,未完全证实
- `[U]` unknown —— 待查 / 待证实(汇总进 `reference/uncertainty.md`)

`[E]` 只能落到 `.ts` / 测试 / `cordis.yml` / `package.json` 等可执行或可加载源。官方 `docs/*.md`、Agent Notes、生成 catalogs 不是 `[E]`。

每个节点 frontmatter 带页级 `evidence:` 主导级。校验时独立 subagent 逐条对照源码证伪 `[E]`。

## 约定 / 前提

- **语言**:中文讲解;代码 / 字段 / 类型 / 包名 / 文件路径 / 协议方法名一律保留英文。
- **源路径基准**:一律相对 `deepseek-harness/`。
- **工具 / preset / 组合 ground truth**:见 `conventions.md` 第 7 节。不以 survey 或官方 catalog 转述为准。
- **写作/机读/lint 规范**:见 `conventions.md`。
- **不要往 `deepseek-harness/` 写文件**(它是 submodule;isolation 会清掉未跟踪文件)。

## 方法 & 状态

逐节点循环:**读源 → 独立 L2 证伪 → 修复 → reconcile/lint**。冻结 SHA = `47f943859b`(`0.1.0-rc.5`)。**首轮填充完成:183/183 verified**。后续更新以 `RUN.md` 的 L1→L2→L3 流程、`index.json` 与节点 `updated` 为 staleness 门槛。

| Tier | 范围 | 节点 | 状态 |
|---|---|---|---|
| T0 spine | 组合启动、turn/step、工具管线、会话日志、seam、压缩 + 5 traces | 12 | ✅ 完成 |
| T1 surface | 工具 30 + preset/CLI/Web/ACP/SDK 等 22 | 52 | ✅ 完成 |
| T2 subsystems | 按 seam / 控制流(composition/core/llm/execution/…) | 106 | ✅ 完成 |
| T3 reference | catalog + glossary + uncertainty | 13 | ✅ 完成 |
